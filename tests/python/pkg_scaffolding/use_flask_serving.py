# Fixture for FlaskScaffoldingTestCase — the M8 milestone: a Flask
# hello-world served over a REAL TCP socket via ``werkzeug.serving``.
#
# Unlike the M7 ``use_flask_wsgi`` fixture (which calls the WSGI callable
# directly), this drives the full dev-server path: bind a listening socket,
# accept a connection, parse the raw HTTP/1.1 request off the wire, build the
# WSGI environ, run the app, and write the HTTP response back.  It runs in a
# single GemStone session — the client's connect + send buffer in the OS
# backlog before ``handle_request`` accepts, so no second thread is needed.


def serve_one_request():
    from flask import Flask
    from werkzeug.serving import make_server
    import socket

    app = Flask(__name__)

    @app.route("/")
    def hello():
        return "Hello, Grail!"

    server = make_server("127.0.0.1", 0, app)
    port = server.server_port

    cli = socket.socket()
    cli.connect(("127.0.0.1", port))
    cli.sendall(
        b"GET / HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n"
    )

    server.handle_request()

    chunks = []
    while True:
        data = cli.recv(8192)
        if not data:
            break
        chunks.append(data)
    cli.close()
    server.server_close()

    raw = b"".join(chunks).decode("latin-1")
    status_line = raw.split("\r\n", 1)[0]
    body = raw.split("\r\n\r\n", 1)[1] if "\r\n\r\n" in raw else ""
    return [status_line, body]


def serve_get_query_post():
    # Exercise the faithful serving stack across multiple sequential requests:
    # a plain GET, a GET with a query string, and a POST whose body is read
    # back through werkzeug's LimitedStream over wsgi.input (the makefile).
    from flask import Flask, request
    from werkzeug.serving import make_server
    import socket

    app = Flask(__name__)

    @app.route("/")
    def home():
        return "home"

    @app.route("/q")
    def q():
        return "q=" + request.args.get("x", "none")

    @app.route("/echo", methods=["POST"])
    def echo():
        return "echo:" + request.get_data(as_text=True)

    server = make_server("127.0.0.1", 0, app)
    port = server.server_port

    def one(req):
        c = socket.socket()
        c.connect(("127.0.0.1", port))
        c.sendall(req)
        server.handle_request()
        chunks = []
        while True:
            d = c.recv(8192)
            if not d:
                break
            chunks.append(d)
        c.close()
        raw = b"".join(chunks).decode("latin-1")
        return raw.split("\r\n\r\n", 1)[1] if "\r\n\r\n" in raw else ""

    r1 = one(b"GET / HTTP/1.1\r\nHost: x\r\nConnection: close\r\n\r\n")
    r2 = one(b"GET /q?x=hi HTTP/1.1\r\nHost: x\r\nConnection: close\r\n\r\n")
    r3 = one(b"POST /echo HTTP/1.1\r\nHost: x\r\nContent-Length: 7\r\n"
             b"Connection: close\r\n\r\npayload")
    server.server_close()
    return [r1, r2, r3]


def _recv_all(sock):
    chunks = []
    while True:
        d = sock.recv(8192)
        if not d:
            break
        chunks.append(d)
    return b"".join(chunks)


def serve_keep_alive_two_requests():
    # Persistent HTTP/1.1 connection: two requests pipelined onto ONE socket,
    # served by a SINGLE handle_request() (one accept).  The first request asks
    # to keep the connection alive; the second closes it, which ends the
    # handler's read loop.  If keep-alive were broken the server would close
    # after request one and the second response would never come back -- so
    # getting BOTH bodies back proves the connection was reused.
    from flask import Flask
    from werkzeug.serving import make_server
    import socket

    app = Flask(__name__)

    @app.route("/a")
    def a():
        return "AAA"

    @app.route("/b")
    def b():
        return "BBB"

    server = make_server("127.0.0.1", 0, app)
    port = server.server_port

    c = socket.socket()
    c.connect(("127.0.0.1", port))
    c.sendall(
        b"GET /a HTTP/1.1\r\nHost: x\r\nConnection: keep-alive\r\n\r\n"
        b"GET /b HTTP/1.1\r\nHost: x\r\nConnection: close\r\n\r\n"
    )
    server.handle_request()  # ONE accept -> handles both via keep-alive loop
    raw = _recv_all(c).decode("latin-1")
    c.close()
    server.server_close()

    # Split the two HTTP responses apart on their status lines.
    parts = raw.split("HTTP/1.1 ")
    bodies = []
    for p in parts:
        if not p:
            continue
        if "\r\n\r\n" in p:
            bodies.append(p.split("\r\n\r\n", 1)[1])
    return [len(bodies), bodies[0] if bodies else "", bodies[1] if len(bodies) > 1 else ""]


def _dechunk(body):
    # Decode an HTTP/1.1 chunked message body to the underlying bytes.
    out = []
    rest = body
    while rest:
        line, _, rest = rest.partition("\r\n")
        size = int(line.strip(), 16)
        if size == 0:
            break
        out.append(rest[:size])
        rest = rest[size + 2:]  # skip the chunk data and its trailing CRLF
    return "".join(out)


def serve_chunked_response():
    # A raw WSGI app whose response has NO Content-Length, served over a
    # persistent connection -> the server must frame it with
    # Transfer-Encoding: chunked.  We send a keep-alive request (so chunking is
    # required to delimit the body) followed by a close request to end the
    # loop, then assert the first response advertises chunked and dechunks back
    # to the concatenated parts.
    from werkzeug.serving import make_server
    import socket

    def app(environ, start_response):
        start_response("200 OK", [("Content-Type", "text/plain")])
        # Three separate byte strings, no Content-Length -> three chunks.
        return [b"one;", b"two;", b"three"]

    server = make_server("127.0.0.1", 0, app)
    port = server.server_port

    c = socket.socket()
    c.connect(("127.0.0.1", port))
    c.sendall(
        b"GET / HTTP/1.1\r\nHost: x\r\nConnection: keep-alive\r\n\r\n"
        b"GET / HTTP/1.1\r\nHost: x\r\nConnection: close\r\n\r\n"
    )
    server.handle_request()
    raw = _recv_all(c).decode("latin-1")
    c.close()
    server.server_close()

    first = raw.split("HTTP/1.1 ", 2)[1]  # the first response (after split[0]="")
    head, _, body = first.partition("\r\n\r\n")
    is_chunked = "transfer-encoding: chunked" in head.lower()
    return [is_chunked, _dechunk(body)]


# --- HTTPS: Flask served over TLS via werkzeug.serving ssl_context -----------
# The TLS handshake is bidirectional, so (unlike the plain-HTTP fixtures) the
# Smalltalk test forks the client into its own GsProcess while the server runs
# handle_request() on the main thread.  Split into setup / serve / client so the
# test can drive both halves.

def make_https_flask_server(certfile, keyfile, password):
    from flask import Flask
    from werkzeug.serving import make_server
    import ssl

    app = Flask(__name__)

    @app.route("/")
    def hello():
        return "Hello, TLS!"

    @app.route("/scheme")
    def scheme():
        from flask import request
        return request.scheme

    ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    ctx.load_cert_chain(certfile, keyfile, password)
    server = make_server("127.0.0.1", 0, app, ssl_context=ctx)
    return [server, server.server_port]


def serve_one(server):
    server.handle_request()
    server.server_close()
    return True


def https_get(port, path):
    import ssl
    import socket

    ctx = ssl._create_unverified_context()
    raw = socket.socket()
    raw.connect(("127.0.0.1", port))
    c = ctx.wrap_socket(raw, server_hostname="localhost")
    req = "GET " + path + " HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n"
    c.sendall(req.encode("latin-1"))
    chunks = []
    while True:
        d = c.recv(8192)
        if not d:
            break
        chunks.append(d)
    c.close()
    raw_resp = b"".join(chunks).decode("latin-1")
    status = raw_resp.split("\r\n", 1)[0]
    body = raw_resp.split("\r\n\r\n", 1)[1] if "\r\n\r\n" in raw_resp else ""
    return [status, body]
