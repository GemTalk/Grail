# Focused regressions for the Flask-demo round of fixes.  Each function
# exercises ONE gap that was closed, so the Smalltalk test can assert the
# repaired behaviour in isolation.  Flask is imported lazily inside the
# functions that need it, so importing this module stays cheap.


def errorhandler_invoked():
    # @app.errorhandler(404) must replace the default 404 page.  The prior
    # failure was masked: handler lookup does ``for cls in
    # exc_class.__mro__``, and __mro__ was unimplemented on class objects,
    # so an AttributeError was raised and then re-signalled (6011).
    from flask import Flask

    app = Flask(__name__)

    @app.errorhandler(404)
    def not_found(err):
        return "custom-404", 404

    client = app.test_client()
    r = client.get("/no-such-route")
    return [r.status_code, r.get_data(as_text=True)]


def url_for_builds():
    # url_for() / Rule.build() now work via an interpreted builder;
    # werkzeug's stock builder needs ast.parse()+exec().
    from flask import Flask, url_for

    app = Flask(__name__)

    @app.route("/u/<name>")
    def greet(name):
        return name

    @app.route("/items/<int:item_id>")
    def item(item_id):
        return str(item_id)

    @app.route("/")
    def home():
        return "home"

    with app.test_request_context("/"):
        return [
            url_for("greet", name="bob"),
            url_for("item", item_id=42),
            url_for("home"),
            url_for("greet", name="bob", page=2),
        ]


def mro_chain():
    # cls.__mro__ returns the linearization beginning with the class.
    class A:
        pass

    class B(A):
        pass

    return [c.__name__ for c in B.__mro__][:2]


def raise_runs_init():
    # ``raise Cls(args)`` must construct via __init__ (it used to skip
    # __init__ and drop every arg past the first).
    class MyErr(Exception):
        def __init__(self, code, label):
            self.code = code
            self.label = label

    try:
        raise MyErr(42, "boom")
    except MyErr as e:
        return [e.code, e.label]


def abc_isinstance():
    # collections.abc ABCs recognise the builtin concrete types as virtual
    # subclasses (was always False before).
    import collections.abc as cabc

    return [
        isinstance({}, cabc.Mapping),
        isinstance([], cabc.Sequence),
        isinstance((), cabc.Sequence),
        isinstance({}, cabc.Iterable),
        isinstance(5, cabc.Mapping),
    ]


def repr_escapes_control_chars():
    # repr() escapes newline/tab/carriage-return (and other control chars) --
    # CPython behaviour.  jinja2's compiler embeds template literals via
    # repr(), so a multi-line template only compiles to valid Python if the
    # embedded newlines are escaped; otherwise `yield 'line1<NL>line2'` is an
    # unterminated string literal.
    return [
        repr("a\nb") == "'a\\nb'",
        repr("x\ty") == "'x\\ty'",
        repr("p\rq") == "'p\\rq'",
        "\n" not in repr("multi\nline\ntemplate"),
    ]


def namedtuple_ordering():
    # typing.NamedTuple compares as the tuple of its values (werkzeug's
    # routing matcher sorts rules by a Weighting NamedTuple).
    import typing

    class Point(typing.NamedTuple):
        x: int
        y: int

    a = Point(1, 2)
    b = Point(1, 3)
    c = Point(1, 2)
    return [a < b, b < a, a <= c, a == c]
