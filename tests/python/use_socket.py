# Fixture for SocketModuleTestCase.
#
# The native ``socket`` module (src/smalltalk/Python/socket_module.gs) wraps
# GemStone ``GsSocket``.  These round-trips run entirely in one GemStone
# session/process: the client ``connect`` + ``sendall`` complete via the OS
# listen backlog + send buffer before the server ``accept``, so no second
# thread/process is needed and the test is deterministic.


def echo_roundtrip():
    import socket
    srv = socket.socket()
    srv.bind(("127.0.0.1", 0))
    srv.listen(1)
    port = srv.getsockname()[1]

    cli = socket.socket()
    cli.connect(("127.0.0.1", port))
    cli.sendall(b"ping")

    conn, addr = srv.accept()
    data = conn.recv(1024)
    conn.sendall(b"pong:" + data)
    conn.close()

    resp = cli.recv(1024)
    cli.close()
    srv.close()
    return resp.decode("latin-1")


def ephemeral_port_assigned():
    import socket
    srv = socket.socket()
    srv.bind(("127.0.0.1", 0))
    srv.listen(1)
    port = srv.getsockname()[1]
    srv.close()
    return port


def large_payload_roundtrip():
    # 50000 bytes exceeds a single OS buffer, exercising sendall's
    # partial-write loop and recv reassembly.
    import socket
    payload = b"x" * 50000

    srv = socket.socket()
    srv.bind(("127.0.0.1", 0))
    srv.listen(1)
    port = srv.getsockname()[1]

    cli = socket.socket()
    cli.connect(("127.0.0.1", port))

    conn, addr = srv.accept()
    cli.sendall(payload)
    cli.shutdown(1)

    received = b""
    while len(received) < len(payload):
        chunk = conn.recv(8192)
        if not chunk:
            break
        received = received + chunk

    conn.close()
    cli.close()
    srv.close()
    return [len(received), received == payload]


def context_manager_closes():
    import socket
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        s.listen(1)
        port = s.getsockname()[1]
    # After the with-block the socket is closed; fileno() should be -1.
    return [port > 0, s.fileno() == -1]


def gethostname_nonempty():
    import socket
    return len(socket.gethostname()) > 0


def makefile_roundtrip():
    # socket.makefile('rb'/'wb') returns a buffered file object: readline()
    # for request line + headers, read(n) for the body, write()/flush() for
    # the response.  This is what http.server's BaseHTTPRequestHandler uses.
    import socket
    srv = socket.socket()
    srv.bind(("127.0.0.1", 0))
    srv.listen(1)
    port = srv.getsockname()[1]

    cli = socket.socket()
    cli.connect(("127.0.0.1", port))
    cli.sendall(b"GET /x HTTP/1.1\r\nHost: y\r\n\r\nBODY")

    conn, addr = srv.accept()
    rf = conn.makefile("rb")
    line1 = rf.readline()
    line2 = rf.readline()
    blank = rf.readline()
    body = rf.read(4)
    wf = conn.makefile("wb")
    wf.write(b"OK:" + line1.strip())
    wf.flush()
    conn.close()

    resp = cli.recv(1024)
    cli.close()
    srv.close()
    return [
        line1.strip().decode("latin-1"),
        line2.strip().decode("latin-1"),
        blank == b"\r\n",
        body.decode("latin-1"),
        "OK:GET /x HTTP/1.1" in resp.decode("latin-1"),
    ]


def select_detects_connection():
    # select.select reports the listening socket readable once a client
    # connects (and not before).
    import socket
    import select
    srv = socket.socket()
    srv.bind(("127.0.0.1", 0))
    srv.listen(1)
    port = srv.getsockname()[1]
    r0, _w0, _x0 = select.select([srv], [], [], 0)
    cli = socket.socket()
    cli.connect(("127.0.0.1", port))
    r1, _w1, _x1 = select.select([srv], [], [], 1.0)
    conn, _addr = srv.accept()
    cli.close()
    conn.close()
    srv.close()
    return [len(r0), len(r1), srv in r1]


def selectors_detects_connection():
    import socket
    import selectors
    srv = socket.socket()
    srv.bind(("127.0.0.1", 0))
    srv.listen(1)
    port = srv.getsockname()[1]
    sel = selectors.DefaultSelector()
    sel.register(srv, selectors.EVENT_READ)
    cli = socket.socket()
    cli.connect(("127.0.0.1", port))
    events = sel.select(1.0)
    ready = [key.fileobj for key, _ev in events]
    conn, _addr = srv.accept()
    sel.close()
    cli.close()
    conn.close()
    srv.close()
    return [len(events), srv in ready]


def socketserver_echo():
    # A socketserver.TCPServer with a StreamRequestHandler: handle_request()
    # accepts one connection, the handler reads a line and writes a response.
    import socketserver
    import socket

    class Handler(socketserver.StreamRequestHandler):
        def handle(self):
            line = self.rfile.readline()
            self.wfile.write(b"echo:" + line.strip() + b"\n")

    server = socketserver.TCPServer(("127.0.0.1", 0), Handler)
    port = server.server_address[1]
    cli = socket.socket()
    cli.connect(("127.0.0.1", port))
    cli.sendall(b"hello\n")
    server.handle_request()
    resp = cli.recv(1024)
    cli.close()
    server.server_close()
    return resp.decode("latin-1").strip()


def http_server_get():
    # http.server.BaseHTTPRequestHandler parses the request line + headers,
    # dispatches to do_GET, and send_response/send_header/end_headers + wfile
    # write the HTTP response.
    import http.server
    import socket

    class Handler(http.server.BaseHTTPRequestHandler):
        def do_GET(self):
            body = b"hello from http.server"
            self.send_response(200)
            self.send_header("Content-Type", "text/plain")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

    server = http.server.HTTPServer(("127.0.0.1", 0), Handler)
    port = server.server_port
    cli = socket.socket()
    cli.connect(("127.0.0.1", port))
    cli.sendall(b"GET /hi HTTP/1.1\r\nHost: x\r\nConnection: close\r\n\r\n")
    server.handle_request()
    chunks = []
    while True:
        d = cli.recv(4096)
        if not d:
            break
        chunks.append(d)
    cli.close()
    server.server_close()
    raw = b"".join(chunks).decode("latin-1")
    status = raw.split("\r\n", 1)[0]
    rbody = raw.split("\r\n\r\n", 1)[1] if "\r\n\r\n" in raw else ""
    return [status, rbody]
