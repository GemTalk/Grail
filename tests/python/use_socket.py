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
