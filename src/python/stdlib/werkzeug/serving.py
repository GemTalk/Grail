# Thin real ``werkzeug.serving'' for Grail (M8).
#
# Upstream werkzeug.serving wraps the stdlib ``http.server'' /
# ``socketserver'' / ``ssl'' modules into a development WSGI server.  Grail
# has neither, but it does have a native ``socket'' module backed by
# GemStone ``GsSocket'' (see src/smalltalk/Python/socket_module.gs).  This
# module implements just enough of ``run_simple'' / ``make_server'' on top of
# that socket to serve real HTTP/1.1 requests to a WSGI ``application``:
# accept a connection, read the request line + headers (+ body), build a
# WSGI ``environ``, call the app, and write the response back.
#
# Not implemented (out of scope for the dev-server demo): the auto-reloader,
# HTTPS/``ssl_context``, keep-alive (every response sends ``Connection:
# close``), chunked transfer-encoding, threading/multiprocessing.

import socket
from io import BytesIO

#: Default chunk size for socket reads.
_RECV = 8192


def is_running_from_reloader():
    """Whether the current process is the reloader child.  Grail has no
    auto-reloader, so always False."""
    return False


def _read_request(conn):
    """Read one HTTP request off ``conn``.  Returns
    ``(method, target, http_version, headers, body)`` where ``headers`` is a
    list of ``(name, value)`` string pairs and ``body`` is ``bytes``.
    Returns ``None`` if the peer closed before sending a full header block."""
    buf = b""
    while b"\r\n\r\n" not in buf:
        chunk = conn.recv(_RECV)
        if not chunk:
            if not buf:
                return None
            break
        buf = buf + chunk

    head, _, rest = buf.partition(b"\r\n\r\n")
    lines = head.split(b"\r\n")
    request_line = lines[0].decode("latin-1")
    parts = request_line.split(" ")
    method = parts[0]
    target = parts[1] if len(parts) > 1 else "/"
    http_version = parts[2] if len(parts) > 2 else "HTTP/1.0"

    headers = []
    content_length = 0
    for raw in lines[1:]:
        if not raw:
            continue
        name, _, value = raw.decode("latin-1").partition(":")
        name = name.strip()
        value = value.strip()
        headers.append((name, value))
        if name.lower() == "content-length":
            content_length = int(value or "0")

    body = rest
    while len(body) < content_length:
        chunk = conn.recv(_RECV)
        if not chunk:
            break
        body = body + chunk

    return method, target, http_version, headers, body


def _build_environ(method, target, http_version, headers, body, server_name,
                   server_port):
    """Construct a minimal-but-complete WSGI ``environ`` dict."""
    if "?" in target:
        path, _, query = target.partition("?")
    else:
        path, query = target, ""

    environ = {
        "REQUEST_METHOD": method,
        "SCRIPT_NAME": "",
        "PATH_INFO": path,
        "QUERY_STRING": query,
        "SERVER_NAME": server_name,
        "SERVER_PORT": str(server_port),
        "SERVER_PROTOCOL": http_version,
        "REMOTE_ADDR": "127.0.0.1",
        "wsgi.version": (1, 0),
        "wsgi.url_scheme": "http",
        "wsgi.input": BytesIO(body),
        "wsgi.errors": BytesIO(),
        "wsgi.multithread": False,
        "wsgi.multiprocess": False,
        "wsgi.run_once": False,
    }
    for name, value in headers:
        if name.lower() == "content-type":
            environ["CONTENT_TYPE"] = value
        elif name.lower() == "content-length":
            environ["CONTENT_LENGTH"] = value
        else:
            key = "HTTP_" + name.upper().replace("-", "_")
            if key in environ:
                environ[key] = environ[key] + "," + value
            else:
                environ[key] = value
    return environ


def _handle_connection(conn, app, server_name, server_port):
    """Read one request from ``conn``, run ``app``, write the response."""
    parsed = _read_request(conn)
    if parsed is None:
        return
    method, target, http_version, headers, body = parsed
    environ = _build_environ(method, target, http_version, headers, body,
                             server_name, server_port)

    captured = {}

    def start_response(status, response_headers, exc_info=None):
        captured["status"] = status
        captured["headers"] = response_headers
        return lambda data: None

    app_iter = app(environ, start_response)
    chunks = []
    for chunk in app_iter:
        if isinstance(chunk, str):
            chunk = chunk.encode("utf-8")
        chunks.append(chunk)
    payload = b"".join(chunks)
    if hasattr(app_iter, "close"):
        app_iter.close()

    status = captured.get("status", "200 OK")
    out_headers = list(captured.get("headers", []))
    have_cl = any(n.lower() == "content-length" for n, _ in out_headers)
    if not have_cl:
        out_headers.append(("Content-Length", str(len(payload))))
    out_headers.append(("Connection", "close"))

    head = "HTTP/1.1 " + status + "\r\n"
    for name, value in out_headers:
        head = head + name + ": " + value + "\r\n"
    head = head + "\r\n"

    conn.sendall(head.encode("latin-1") + payload)


class WSGIServer:
    """A blocking single-threaded WSGI server over a ``socket``.  ``port=0``
    asks the OS for an ephemeral port (read back from ``server_port``)."""

    def __init__(self, host, port, app):
        self.host = host
        self.app = app
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        sock.bind((host, port))
        sock.listen(128)
        self.socket = sock
        self.server_port = sock.getsockname()[1]
        self.server_name = host

    def handle_request(self):
        """Accept and serve exactly one connection."""
        conn, _addr = self.socket.accept()
        try:
            _handle_connection(conn, self.app, self.server_name,
                               self.server_port)
        finally:
            conn.close()

    def serve_forever(self):
        while True:
            self.handle_request()

    def server_close(self):
        self.socket.close()


def make_server(host, port, app, threaded=False, processes=1,
                request_handler=None, passthrough_errors=False,
                ssl_context=None, fd=None):
    return WSGIServer(host, port, app)


def run_simple(hostname, port, application, use_reloader=False,
               use_debugger=False, use_evalex=True,
               extra_files=None, exclude_patterns=None,
               reloader_interval=1, reloader_type='auto',
               threaded=False, processes=1, request_handler=None,
               static_files=None, passthrough_errors=False,
               ssl_context=None):
    """Serve ``application`` on ``hostname:port`` until interrupted.  This
    blocks the calling GemStone session (the gem becomes the server)."""
    server = make_server(hostname, port, application)
    try:
        server.serve_forever()
    finally:
        server.server_close()


# Kept for isinstance / subclass resolution by code that imports them.
BaseWSGIServer = WSGIServer


class WSGIRequestHandler:
    """Stub — Grail's server doesn't use a per-request handler class."""
    pass
