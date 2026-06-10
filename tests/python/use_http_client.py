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


r_get = get_content_length()
r_post = post_body()
r_chunked = chunked_response()
r_head = head_no_body()
r_error = error_status()
