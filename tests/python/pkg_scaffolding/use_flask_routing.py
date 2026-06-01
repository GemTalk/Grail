# Fixture for FlaskScaffoldingTestCase — dynamic routing + the HTTP error
# path (Tier 1 + Tier 2 of post-hello-world Flask support).
#
# Tier 1 (dynamic responses): a view that returns a *computed* string went
# through the test client's WrapperTestResponse, a class built via the
# 3-argument ``type()``.  That dynamic class didn't inherit
# ``Response.implicit_sequence_conversion`` (a class-body attribute), so
# ``resp.get_data()`` raised "the response object required the iterable to
# be a sequence".  builtins.type now copies inherited class attributes.
#
# Tier 2 (error path): ``abort(404)`` and an unmatched URL both raise
# werkzeug HTTPExceptions.  ``code``/``name``/``description`` are now class
# attributes on the exception shim (read both as ``cls.code`` and
# ``e.code``), ``make_response`` renders an HTTPException via
# ``get_response()``, and routing constructs ``NoMatch`` before raising so
# its ``__init__`` runs.


def make_app():
    from flask import Flask, request, abort, jsonify, render_template_string

    app = Flask(__name__)

    @app.route("/u/<name>")
    def greet(name):
        return "Hi " + name

    @app.route("/json")
    def json_view():
        return jsonify(ok=True, n=3)

    @app.route("/tmpl/<who>")
    def tmpl_view(who):
        return render_template_string("Hello {{ who }}!", who=who)

    @app.route("/sum/<int:a>/<int:b>")
    def addup(a, b):
        return str(a + b)

    @app.route("/q")
    def query():
        return request.args.get("x", "none")

    @app.route("/boom")
    def boom():
        abort(404)

    return app


def _status_body(method, path):
    app = make_app()
    resp = app.test_client().get(path)
    return [resp.status_code, resp.get_data(as_text=True)]


def variable_route():
    return _status_body("GET", "/u/alice")


def int_converter():
    return _status_body("GET", "/sum/3/4")


def query_args():
    return _status_body("GET", "/q?x=hi")


def json_response():
    return _status_body("GET", "/json")


def template_response():
    return _status_body("GET", "/tmpl/Grail")


def abort_404():
    return _status_body("GET", "/boom")


def unknown_route_404():
    return _status_body("GET", "/does-not-exist")
