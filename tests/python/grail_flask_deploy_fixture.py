# Fixture for tests/scripts/runFlaskDeployTest.gs — the real-application
# exercise of docs/Persistent_Modules_and_Classes.md par.10: a Flask app
# built at MODULE level (definition-time state: the app object, its route
# map, the whole flask/werkzeug/jinja2 closure) is deployed by one
# session's commit and must SERVE REQUESTS in a later session that
# warm-binds it — no module body re-run anywhere in the closure.
from flask import Flask, jsonify
from werkzeug.test import EnvironBuilder

app = Flask(__name__)
# Propagate view exceptions to the caller instead of logging a 500 —
# the .gs acceptance script reports the real error text.
app.testing = True


@app.route("/")
def hello():
    return "Hello, deployed Grail!"


@app.route("/add/<int:a>/<int:b>")
def add(a, b):
    return jsonify(total=a + b)


def serve(path):
    """Drive the app through the full WSGI entry point, exactly as
    werkzeug.test.Client would, and return [status, body-text]."""
    environ = EnvironBuilder(path=path, method="GET").get_environ()
    captured = []

    def start_response(status, headers, exc_info=None):
        captured.append(status)

    body = app(environ, start_response)
    text = b"".join(list(body)).decode("utf-8")
    return [captured[0], text]


# Cold-import sanity: the app serves before anything is committed.
boot_status, boot_body = serve("/")


def serve_debug(path):
    """serve() with the exception surfaced as data, for diagnosis."""
    try:
        return serve(path)
    except Exception as e:
        return ['EXC', type(e).__name__ + ': ' + str(e)]
