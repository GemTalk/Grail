# Fixture for FlaskScaffoldingTestCase — the M7 milestone: a Flask
# hello-world that responds through the full WSGI application entry point
# (``app(environ, start_response)``), exactly as ``werkzeug.test.Client``
# invokes it.  Exercises the whole request path: routing, the request
# context, ``full_dispatch_request``, the view, and Response materialisation
# (including ``session.accessed`` on the SecureCookieSession dict subclass).


def hello_wsgi():
    from flask import Flask
    from werkzeug.test import EnvironBuilder

    app = Flask(__name__)

    @app.route("/")
    def hello():
        return "Hello, Grail!"

    environ = EnvironBuilder(path="/", method="GET").get_environ()
    captured = []

    def start_response(status, headers, exc_info=None):
        captured.append(status)

    body = app(environ, start_response)
    chunks = list(body)
    text = b"".join(chunks).decode("utf-8")
    return [captured[0], text]
