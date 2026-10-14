"""inspect.signature() of a callable INSTANCE reads its class's __call__.

CPython's rule: an object that is not a function or a class is called
through ``type(obj).__call__``, so its signature is that method's with the
bound ``self`` dropped.  Grail answered ``()`` for every such object, so
``getfullargspec`` reported no ``**kwargs`` -- and botocore, which checks
every event handler with ``inspect.getfullargspec(func)[2]``, refused its own
``ClientMethodAlias`` handler, so ``boto3.client('s3')`` raised ValueError.

The rows cover botocore's handler shape, defaults and keyword-only
parameters, an inherited ``__call__``, getfullargspec's view of it, and as
guards: a plain function, a class, a bound method, and a builtin, whose
signatures must not change.

EXPECTED is CPython 3.14's output; mismatches() is what the Smalltalk test case
asserts is empty.
"""

import inspect

r = {}


def t(label, thunk):
    try:
        r[label] = repr(thunk())
    except Exception as e:
        r[label] = '%s: %s' % (type(e).__name__, e)


class ClientMethodAlias:
    """botocore.handlers.ClientMethodAlias, verbatim in shape."""

    def __init__(self, actual_name):
        self._actual = actual_name

    def __call__(self, client, **kwargs):
        return getattr(client, self._actual)


class Defaults:
    def __call__(self, a, b=2, *rest, k, j=4, **kw):
        return a


class Inherits(Defaults):
    pass


class NoArgs:
    def __call__(self):
        return 0


def accepts_kwargs(func):
    """botocore.compat.accepts_kwargs."""
    return inspect.getfullargspec(func)[2]


def plain(x, y=1):
    return x


class Factory:
    def __init__(self, a, b=3):
        pass

    def method(self, m, *, n=0):
        return m


t('botocore handler: signature', lambda: str(inspect.signature(ClientMethodAlias('x'))))
t('botocore handler: accepts_kwargs', lambda: accepts_kwargs(ClientMethodAlias('x')))
t('defaults and keyword-only', lambda: str(inspect.signature(Defaults())))
t('inherited __call__', lambda: str(inspect.signature(Inherits())))
t('no parameters', lambda: str(inspect.signature(NoArgs())))
t('getfullargspec: varargs and varkw', lambda: inspect.getfullargspec(Defaults())[1:3])
t('getfullargspec: kwonlyargs', lambda: inspect.getfullargspec(Defaults()).kwonlyargs)
t('parameter kinds', lambda: [p.kind.name for p in inspect.signature(Defaults()).parameters.values()])
t('guard: a function', lambda: str(inspect.signature(plain)))
t('guard: a class', lambda: str(inspect.signature(Factory)))
t('guard: a bound method', lambda: str(inspect.signature(Factory(1).method)))


EXPECTED = {
    'botocore handler: signature': "'(client, **kwargs)'",
    'botocore handler: accepts_kwargs': "'kwargs'",
    'defaults and keyword-only': "'(a, b=2, *rest, k, j=4, **kw)'",
    'inherited __call__': "'(a, b=2, *rest, k, j=4, **kw)'",
    'no parameters': "'()'",
    'getfullargspec: varargs and varkw': "('rest', 'kw')",
    'getfullargspec: kwonlyargs': "['k', 'j']",
    'parameter kinds': "['POSITIONAL_OR_KEYWORD', 'POSITIONAL_OR_KEYWORD', 'VAR_POSITIONAL', 'KEYWORD_ONLY', 'KEYWORD_ONLY', 'VAR_KEYWORD']",
    'guard: a function': "'(x, y=1)'",
    'guard: a class': "'(a, b=3)'",
    'guard: a bound method': "'(m, *, n=0)'",
}


def mismatches():
    """The rows that differ from CPython's, as 'label: got X, CPython Y'."""
    return ['%s: got %s, CPython %s' % (k, r.get(k), v)
            for k, v in EXPECTED.items() if r.get(k) != v]


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-4s %s: %r' % ('OK' if actual == EXPECTED[k] else 'DIFF', k, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-4s %s is not in EXPECTED' % ('DIFF', extra))
