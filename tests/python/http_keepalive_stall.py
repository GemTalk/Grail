"""Fixture: a single-threaded HTTP server holds a connection open only when BOTH
sides speak HTTP/1.1 (#1227).

A single-threaded server serves one connection at a time, so a connection it
keeps open stalls every other client until that client closes it -- and
browsers and most HTTP libraries keep connections open by default.  CPython's
http.server therefore keeps a connection only when the request is HTTP/1.1 AND
the handler's protocol_version is HTTP/1.1; the default is HTTP/1.0.  Werkzeug
leaves its handler at HTTP/1.0 and raises it to 1.1 only for a threaded or
forking server.

Grail had both halves wrong.  Its http.server kept any HTTP/1.1 connection,
whatever protocol_version said -- so it answered ``HTTP/1.0 200 OK'', which
tells the client the connection will close, and then sat waiting for a second
request.  Its Werkzeug set protocol_version = "HTTP/1.1" on the handler class,
so make_server's single-threaded default stalled the same way.  And Grail's
parse_request accepted request lines CPython refuses: ``GET / FOO/1.0'' and
``GET / HTTP/2.0'' were answered 200.

The http.server checks need only the stdlib and hold under CPython 3.14.  The
Werkzeug checks run only where werkzeug imports: always under Grail, which
vendors it, and under CPython with Werkzeug 3.1.5 installed, where they hold
too.  The fixture gate's CPython has no werkzeug, so there it checks the
http.server half alone.
"""

import socket
import threading
import time
from http.server import BaseHTTPRequestHandler, HTTPServer

try:
    import werkzeug.serving as wz
except ImportError:
    wz = None

r = {}

WAIT = 3.0   # seconds a check waits before calling a socket "open" / a client "stalled"


# --- plumbing -------------------------------------------------------------------

def _serve(server):
    t = threading.Thread(target=server.serve_forever, kwargs={'poll_interval': 0.05})
    t.daemon = True
    t.start()
    return t


def _stop(server, t):
    server.shutdown()
    t.join(WAIT)
    server.server_close()


def _connect(port):
    s = socket.create_connection(('127.0.0.1', port))
    s.settimeout(WAIT)
    return s


def _read_head(sock):
    """Read one response's status line and headers, plus a Content-Length body.
    Answers (status_line, headers_dict, body), or ('<stalled>', {}, b'') when
    nothing arrives within WAIT seconds."""
    buf = b''
    try:
        while b'\r\n\r\n' not in buf:
            chunk = sock.recv(4096)
            if not chunk:
                break
            buf += chunk
    except socket.timeout:
        return '<stalled>', {}, b''
    head, _, body = buf.partition(b'\r\n\r\n')
    lines = head.decode('latin-1').split('\r\n')
    headers = {}
    for line in lines[1:]:
        k, _, v = line.partition(':')
        headers[k.strip().lower()] = v.strip()
    n = int(headers.get('content-length', '0') or 0)
    try:
        while len(body) < n:
            chunk = sock.recv(4096)
            if not chunk:
                break
            body += chunk
    except socket.timeout:
        pass
    return lines[0], headers, body


def _state_after_response(sock):
    """'closed' if the server closes the connection after its response, 'open'
    if it holds it (nothing arrives within WAIT seconds)."""
    try:
        return 'closed' if sock.recv(1) == b'' else 'more data'
    except socket.timeout:
        return 'open'


def _status_of(port, raw):
    """The status line the server answers ``raw'' with."""
    s = _connect(port)
    try:
        s.sendall(raw)
        return _read_head(s)[0]
    finally:
        s.close()


class Hello(BaseHTTPRequestHandler):
    """Answers every GET with its path, framed by Content-Length."""

    def do_GET(self):
        body = self.path.encode('latin-1')
        self.send_response(200)
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args):
        pass


class Hello11(Hello):
    protocol_version = 'HTTP/1.1'


# --- http.server at its default protocol_version, HTTP/1.0 -----------------------

server = HTTPServer(('127.0.0.1', 0), Hello)
t = _serve(server)
port = server.server_address[1]

a = _connect(port)
a.sendall(b'GET / HTTP/1.1\r\nHost: x\r\n\r\n')
r['http10_handler_status_line'] = _read_head(a)[0]
r['http10_handler_closes_an_11_request'] = _state_after_response(a)
a.close()

a = _connect(port)
a.sendall(b'GET / HTTP/1.0\r\nConnection: keep-alive\r\n\r\n')
_read_head(a)
r['http10_handler_closes_despite_keepalive'] = _state_after_response(a)
a.close()

# The issue's own two-client case: A gets its answer and keeps its socket,
# as a keep-alive client does; B must not wait for A to close.
a = _connect(port)
a.sendall(b'GET / HTTP/1.1\r\nHost: x\r\n\r\n')
_read_head(a)
b = _connect(port)
b.sendall(b'GET / HTTP/1.0\r\n\r\n')
r['second_client_is_served_while_first_holds'] = _read_head(b)[0]
b.close()
a.close()

# --- request lines CPython refuses ------------------------------------------------

r['request_lines'] = [
    _status_of(port, b'GET / FOO/1.0\r\n\r\n'),
    _status_of(port, b'GET / HTTP/2.0\r\n\r\n'),
    _status_of(port, b'GET / x HTTP/1.0\r\n\r\n'),
    _status_of(port, b'GET / HTTP/1.1.1\r\n\r\n'),
    _status_of(port, b'GET / HTTP/a.b\r\n\r\n'),
    _status_of(port, b'POST /\r\n\r\n'),
]
r['http09_get_has_no_status_line'] = _status_of(port, b'GET /nine\r\n')
s = _connect(port)
s.sendall(b'GET //evil.example/x HTTP/1.0\r\n\r\n')
r['leading_slashes_are_reduced'] = _read_head(s)[2].decode('latin-1')
s.close()

# CPython counts the blank line that ends the headers against the limit of 100.
r['header_limit'] = [
    _status_of(port, b'GET / HTTP/1.0\r\n' + b'X: y\r\n' * 99 + b'\r\n'),
    _status_of(port, b'GET / HTTP/1.0\r\n' + b'X: y\r\n' * 100 + b'\r\n'),
    _status_of(port, b'GET / HTTP/1.0\r\nX: ' + b'y' * 70000 + b'\r\n\r\n'),
]
r['request_line_too_long'] = _status_of(port, b'GET /' + b'a' * 70000 + b' HTTP/1.0\r\n\r\n')
_stop(server, t)

# --- control: a handler that does speak HTTP/1.1 keeps the connection ---------------

server = HTTPServer(('127.0.0.1', 0), Hello11)
t = _serve(server)
port = server.server_address[1]
a = _connect(port)
a.sendall(b'GET /one HTTP/1.1\r\nHost: x\r\n\r\n')
first = _read_head(a)
a.sendall(b'GET /two HTTP/1.1\r\nHost: x\r\n\r\n')
second = _read_head(a)
r['http11_handler_keeps_the_connection'] = [first[0], first[2].decode(), second[0], second[2].decode()]
a.sendall(b'GET /three HTTP/1.1\r\nHost: x\r\nConnection: close\r\n\r\n')
_read_head(a)
r['http11_handler_honours_connection_close'] = _state_after_response(a)
a.close()
a = _connect(port)
a.sendall(b'GET / HTTP/1.0\r\n\r\n')
_read_head(a)
r['http11_handler_closes_an_10_request'] = _state_after_response(a)
a.close()
a = _connect(port)
a.sendall(b'GET / HTTP/1.1\r\nHost: x\r\nExpect: 100-continue\r\nConnection: close\r\n\r\n')
r['expect_100_continue'] = _read_head(a)[0]
a.close()
a = _connect(port)
a.sendall(b'GET / HTTP/2.0\r\n\r\n')
status = _read_head(a)[0]
r['a_505_closes_even_on_an_11_handler'] = [status, _state_after_response(a)]
a.close()
_stop(server, t)


# --- Werkzeug ------------------------------------------------------------------------

def _app(environ, start_response):
    body = ('%s %s' % (environ['wsgi.multithread'], environ['SERVER_PROTOCOL'])).encode()
    start_response('200 OK', [('Content-Type', 'text/plain'),
                              ('Content-Length', str(len(body)))])
    return [body]


def _werkzeug_checks():
    import logging
    logging.getLogger('werkzeug').setLevel(logging.ERROR)
    H = wz.WSGIRequestHandler

    # make_server's own default handler, as shipped.  Under CPython a threaded
    # server earlier in the process will have raised it to HTTP/1.1, because
    # upstream sets that on the class; Grail no longer does, but a database
    # can still hold one committed by an older Grail.  Either way, start from
    # the class as shipped and put it back after.
    had = 'protocol_version' in vars(H)
    saved = vars(H).get('protocol_version')
    if had:
        del H.protocol_version
    try:
        server = wz.make_server('127.0.0.1', 0, _app)
        t = _serve(server)
        port = server.server_port
        a = _connect(port)
        a.sendall(b'GET / HTTP/1.1\r\nHost: x\r\n\r\n')
        status, _, body = _read_head(a)
        r['wz_single_threaded'] = [status, body.decode(), _state_after_response(a)]
        a.close()
        a = _connect(port)
        a.sendall(b'GET / HTTP/1.1\r\nHost: x\r\n\r\n')
        _read_head(a)
        b = _connect(port)
        b.sendall(b'GET / HTTP/1.0\r\n\r\n')
        r['wz_second_client_is_served'] = _read_head(b)[0]
        b.close()
        a.close()
        _stop(server, t)
        r['wz_single_threaded_leaves_the_class_alone'] = 'protocol_version' in vars(H)
    finally:
        if had:
            H.protocol_version = saved

    # A threaded server raises a handler that does not set its own version...
    class Threaded(H):
        pass

    server = wz.make_server('127.0.0.1', 0, _app, threaded=True, request_handler=Threaded)
    t = _serve(server)
    a = _connect(server.server_port)
    a.sendall(b'GET / HTTP/1.1\r\nHost: x\r\nConnection: close\r\n\r\n')
    status, _, body = _read_head(a)
    # What the server serves through.  Upstream raises the handler class
    # itself; Grail serves through a subclass so the change cannot be
    # committed (see BaseWSGIServer.__init__).  Both answer this the same.
    r['wz_threaded'] = [status, body.decode(),
                        server.RequestHandlerClass.protocol_version]
    a.close()
    _stop(server, t)

    # ...but not one that does.
    class Pinned(H):
        protocol_version = 'HTTP/1.0'

    server = wz.make_server('127.0.0.1', 0, _app, threaded=True, request_handler=Pinned)
    t = _serve(server)
    a = _connect(server.server_port)
    a.sendall(b'GET / HTTP/1.1\r\nHost: x\r\n\r\n')
    r['wz_threaded_respects_a_pinned_version'] = _read_head(a)[0]
    a.close()
    _stop(server, t)


if wz is not None:
    _werkzeug_checks()


def threaded_server_leaves_the_handler_class_alone():
    """GRAIL ONLY -- a deliberate divergence, so not one of the CPython
    checks.  Upstream raises a threaded server's handler to HTTP/1.1 by
    assigning to the handler CLASS; in Grail a class is database state, and a
    commit would make that permanent.  Grail serves through a subclass
    instead.  Answers [class had it before, has it after, version served,
    served class is a distinct subclass]."""
    H = wz.WSGIRequestHandler
    before = 'protocol_version' in vars(H)
    server = wz.make_server('127.0.0.1', 0, _app, threaded=True)
    server.server_close()
    served = server.RequestHandlerClass
    return [before, 'protocol_version' in vars(H), served.protocol_version,
            served is not H and issubclass(served, H)]


EXPECTED = {
    'http10_handler_status_line': 'HTTP/1.0 200 OK',
    'http10_handler_closes_an_11_request': 'closed',
    'http10_handler_closes_despite_keepalive': 'closed',
    'second_client_is_served_while_first_holds': 'HTTP/1.0 200 OK',
    'request_lines': [
        "HTTP/1.0 400 Bad request version ('FOO/1.0')",
        'HTTP/1.0 505 Invalid HTTP version (2.0)',
        "HTTP/1.0 400 Bad request syntax ('GET / x HTTP/1.0')",
        "HTTP/1.0 400 Bad request version ('HTTP/1.1.1')",
        "HTTP/1.0 400 Bad request version ('HTTP/a.b')",
        "HTTP/1.0 400 Bad HTTP/0.9 request type ('POST')",
    ],
    'http09_get_has_no_status_line': '/nine',
    'leading_slashes_are_reduced': '/evil.example/x',
    'header_limit': [
        'HTTP/1.0 200 OK',
        'HTTP/1.0 431 Too many headers',
        'HTTP/1.0 431 Line too long',
    ],
    'request_line_too_long': 'HTTP/1.0 414 URI Too Long',
    'http11_handler_keeps_the_connection': [
        'HTTP/1.1 200 OK', '/one', 'HTTP/1.1 200 OK', '/two'],
    'http11_handler_honours_connection_close': 'closed',
    'http11_handler_closes_an_10_request': 'closed',
    'expect_100_continue': 'HTTP/1.1 100 Continue',
    'a_505_closes_even_on_an_11_handler': [
        'HTTP/1.1 505 Invalid HTTP version (2.0)', 'closed'],
}
if wz is not None:
    EXPECTED.update({
        'wz_single_threaded': ['HTTP/1.0 200 OK', 'False HTTP/1.1', 'closed'],
        'wz_second_client_is_served': 'HTTP/1.0 200 OK',
        'wz_single_threaded_leaves_the_class_alone': False,
        'wz_threaded': ['HTTP/1.1 200 OK', 'True HTTP/1.1', 'HTTP/1.1'],
        'wz_threaded_respects_a_pinned_version': 'HTTP/1.0 200 OK',
    })

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        print('%-5s %-42s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL',
                                    key, actual))
    print(SUMMARY)
