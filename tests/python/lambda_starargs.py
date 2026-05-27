# Regression for LambdaAst *args/**kwargs codegen.
#
# Before the fix, ``lambda self, *args, **kwargs: ...'' compiled
# without declaring ``args'' / ``kwargs'' as temps, producing
# ``undefined symbol args; undefined symbol kwargs'' at module
# compile time.  Originally surfaced in werkzeug.local's
# ``_ProxyLookup(lambda self, *args, **kwargs: self(*args, **kwargs))''
# class-body line.


def make_forwarder():
    """The exact werkzeug.local pattern."""
    return lambda self, *args, **kwargs: self(*args, **kwargs)


def make_vararg_only():
    return lambda *args: len(args)


def make_kwarg_only():
    return lambda **kw: list(kw.keys())


class Sink:
    """Records (positional, kwargs-key-tuple) on each call."""

    def __init__(self):
        self.calls = []

    def __call__(self, *a, **kw):
        self.calls.append((tuple(a), tuple(sorted(kw.keys()))))
        return 'ok'


def call_forwarder():
    f = make_forwarder()
    s = Sink()
    result = f(s, 1, 2, 3, alpha='A', beta='B')
    return result == 'ok' and s.calls[0] == ((1, 2, 3), ('alpha', 'beta'))


def call_vararg_only():
    f = make_vararg_only()
    return f(1, 2, 3, 4) == 4


def call_kwarg_only():
    f = make_kwarg_only()
    keys = f(a=1, b=2, c=3)
    return set(keys) == set(['a', 'b', 'c'])
