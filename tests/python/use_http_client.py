# Fixture for HttpClientTestCase.
#
# Exercises Grail's hand-rolled http.client (HTTPConnection /
# HTTPResponse) against an in-process loopback server, using the same
# deterministic single-session pattern as use_socket.py: the client's
# connect + request bytes complete via the OS listen backlog + send
# buffer before the server accept()s, so no second thread is needed.
#
# Each helper opens a fresh listening socket, issues a real
# HTTPConnection request against it, then plays the server side by
# hand with a canned HTTP response.

import io
import socket
import http.client


def _accept_and_read_request(srv):
    """accept(), read one full request (headers + Content-Length body),
    and return (conn, raw_request_text)."""
    conn, addr = srv.accept()
    data = b''
    while b'\r\n\r\n' not in data:
        chunk = conn.recv(8192)
        if not chunk:
            break
        data = data + chunk
    head, _, rest = data.partition(b'\r\n\r\n')
    text = head.decode('utf-8')
    lower = text.lower()
    if 'content-length:' in lower:
        marker = lower.find('content-length:')
        line_end = text.find('\r\n', marker)
        if line_end == -1:
            line_end = len(text)
        length = int(text[marker + len('content-length:'):line_end].strip())
        while len(rest) < length:
            chunk = conn.recv(8192)
            if not chunk:
                break
            rest = rest + chunk
    return conn, text + '\r\n\r\n' + rest.decode('utf-8')


def _listen():
    srv = socket.socket()
    srv.bind(('127.0.0.1', 0))
    srv.listen(1)
    return srv, srv.getsockname()[1]


def get_content_length():
    """GET with a Content-Length response body over keep-alive."""
    srv, port = _listen()
    client = http.client.HTTPConnection('127.0.0.1', port)
    client.request('GET', '/hello?x=1')

    conn, request_text = _accept_and_read_request(srv)
    conn.sendall(b'HTTP/1.1 200 OK\r\n'
                 b'Content-Type: text/plain\r\n'
                 b'Content-Length: 11\r\n'
                 b'\r\n'
                 b'hello world')

    resp = client.getresponse()
    body = resp.read()
    result = {
        'status': resp.status,
        'reason': resp.reason,
        'body': body.decode('utf-8'),
        'ctype': resp.getheader('content-type'),
        'ctype_titled': resp.getheader('Content-Type'),
        'request_line': request_text.split('\r\n')[0],
        'has_host': 'Host: 127.0.0.1:' + str(port) in request_text,
    }
    conn.close()
    client.close()
    srv.close()
    return result


def post_body():
    """POST with a request body; server echoes what it saw."""
    srv, port = _listen()
    client = http.client.HTTPConnection('127.0.0.1', port)
    payload = 'To=%2B15551234567&Body=Hi+there'
    client.request('POST', '/v1/Messages', body=payload,
                   headers={'Content-Type':
                            'application/x-www-form-urlencoded'})

    conn, request_text = _accept_and_read_request(srv)
    conn.sendall(b'HTTP/1.1 201 Created\r\n'
                 b'Content-Length: 2\r\n'
                 b'\r\n'
                 b'{}')

    resp = client.getresponse()
    resp.read()
    result = {
        'status': resp.status,
        'request_has_clen': 'Content-Length: 31' in request_text,
        'request_has_ctype':
            'Content-Type: application/x-www-form-urlencoded'
            in request_text,
        'request_body': request_text.split('\r\n\r\n')[1],
    }
    conn.close()
    client.close()
    srv.close()
    return result


def chunked_response():
    """Chunked transfer-encoding decode, including a chunk extension."""
    srv, port = _listen()
    client = http.client.HTTPConnection('127.0.0.1', port)
    client.request('GET', '/stream')

    conn, request_text = _accept_and_read_request(srv)
    conn.sendall(b'HTTP/1.1 200 OK\r\n'
                 b'Transfer-Encoding: chunked\r\n'
                 b'\r\n'
                 b'5\r\nhello\r\n'
                 b'1;ext=1\r\n \r\n'
                 b'6\r\nworld!\r\n'
                 b'0\r\n\r\n')

    resp = client.getresponse()
    body = resp.read()
    result = {
        'status': resp.status,
        'body': body.decode('utf-8'),
        'chunked': resp.chunked,
    }
    conn.close()
    client.close()
    srv.close()
    return result


def head_no_body():
    """HEAD: headers present, zero-length body even with Content-Length."""
    srv, port = _listen()
    client = http.client.HTTPConnection('127.0.0.1', port)
    client.request('HEAD', '/doc')

    conn, request_text = _accept_and_read_request(srv)
    conn.sendall(b'HTTP/1.1 200 OK\r\n'
                 b'Content-Length: 5000\r\n'
                 b'Connection: close\r\n'
                 b'\r\n')

    resp = client.getresponse()
    body = resp.read()
    result = {
        'status': resp.status,
        'body_len': len(body),
        'clen_header': resp.getheader('Content-Length'),
    }
    conn.close()
    client.close()
    srv.close()
    return result


def error_status():
    """4xx flows through as a normal response (no raise at this layer)."""
    srv, port = _listen()
    client = http.client.HTTPConnection('127.0.0.1', port)
    client.request('GET', '/missing')

    conn, request_text = _accept_and_read_request(srv)
    conn.sendall(b'HTTP/1.1 404 Not Found\r\n'
                 b'Content-Length: 26\r\n'
                 b'\r\n'
                 b'{"error": "no such thing"}')

    resp = client.getresponse()
    body = resp.read()
    result = {
        'status': resp.status,
        'reason': resp.reason,
        'body': body.decode('utf-8'),
    }
    conn.close()
    client.close()
    srv.close()
    return result


def connection_close_body():
    """``Connection: close`` — the body must still be readable.

    getresponse() closes the connection as soon as the headers say the
    server will close, so the response is reading through a file object
    over an already-closed socket.  CPython keeps the socket alive until
    the last makefile() handle closes (socket._io_refs); without that the
    read below fails with a nil GsSocket."""
    srv, port = _listen()
    client = http.client.HTTPConnection('127.0.0.1', port)
    client.request('GET', '/bye', headers={'Connection': 'close',
                                           'Host': '127.0.0.1'})

    # The body must be bigger than one recv() (8192) or the reader
    # buffers the whole response while the socket is still open and the
    # bug never fires -- the body has to be fetched AFTER the close.
    payload = b'goodbye' * 3000          # 21000 bytes
    conn, request_text = _accept_and_read_request(srv)
    conn.sendall(b'HTTP/1.1 200 OK\r\n'
                 b'Content-Type: text/plain\r\n'
                 b'Content-Length: ' + str(len(payload)).encode('ascii') +
                 b'\r\n'
                 b'Connection: close\r\n'
                 b'\r\n' + payload)

    resp = client.getresponse()
    will_close = resp.will_close
    sock_dropped = client.sock is None
    body = resp.read()
    result = {
        'status': resp.status,
        'will_close': will_close,
        'sock_dropped': sock_dropped,
        'body_len': len(body),
        'body_intact': body == payload,
    }
    resp.close()
    conn.close()
    client.close()
    srv.close()
    return result


def response_context_manager():
    """The response is an io.BufferedIOBase, so ``with resp:`` works."""
    srv, port = _listen()
    client = http.client.HTTPConnection('127.0.0.1', port)
    client.request('GET', '/ctx')

    conn, request_text = _accept_and_read_request(srv)
    conn.sendall(b'HTTP/1.1 200 OK\r\n'
                 b'Content-Length: 5\r\n'
                 b'\r\n'
                 b'inctx')

    resp = client.getresponse()
    with resp as r:
        body = r.read()
    result = {
        'body': body.decode('utf-8'),
        'closed_after': resp.closed,
        'is_bufferedio': isinstance(resp, io.BufferedIOBase),
        'readable': True,
    }
    conn.close()
    client.close()
    srv.close()
    return result


def socket_io_refs():
    """socket.close() defers the real close while makefile() handles live."""
    srv, port = _listen()
    client = socket.socket()
    client.connect(('127.0.0.1', port))
    conn, addr = srv.accept()
    conn.sendall(b'payload')

    fp = client.makefile('rb')
    client.close()                  # marked closed, but fp still holds it
    alive_after_close = client.fileno() != -1
    data = fp.read(7)               # must still work
    fp.close()                      # last handle -> real close
    released = client.fileno() == -1

    conn.close()
    srv.close()
    return {
        'alive_after_close': alive_after_close,
        'data': data.decode('utf-8'),
        'released_after_fp_close': released,
    }


r_get = get_content_length()
r_post = post_body()
r_chunked = chunked_response()
r_head = head_no_body()
r_error = error_status()
r_conn_close = connection_close_body()
r_ctx = response_context_manager()
r_io_refs = socket_io_refs()
