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
