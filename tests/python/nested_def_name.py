# Fixture for NestedDefNameTestCase.
#
# A nested ``def`` compiles to a bare GemStone block (an ExecBlock), which
# has no lexical name of its own.  FunctionDefAst now stamps the def's name
# onto the block via ``___pyNamed___:`` and ExecBlock exposes ``__name__`` /
# ``__qualname__`` as *value* attributes (___pythonValueAttrs___), so
# ``func.__name__`` returns the real name rather than a ``<closure>``
# placeholder or a BoundMethod.  flask's ``@app.route`` reads
# ``view_func.__name__`` to key ``view_functions`` (the endpoint), so the
# hello-world view must report ``'hello'``.


def make_nested():
    def hello():
        return 1

    return hello


def nested_name():
    return make_nested().__name__


def nested_qualname():
    return make_nested().__qualname__


def name_survives_assignment():
    fn = make_nested()
    other = fn
    return other.__name__
