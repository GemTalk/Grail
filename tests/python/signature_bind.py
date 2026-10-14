"""inspect.Signature.bind() and bind_partial() map a call onto the parameters.

Both were stubs that returned an EMPTY BoundArguments whatever they were given
and never raised, so a call validated with bind passed however wrong it was,
and anything reading ``ba.arguments`` saw nothing (#1548).

The rows cover each parameter kind, every TypeError bind can raise, the
partial form, BoundArguments' args/kwargs/apply_defaults/repr/eq, a decorator
that validates its calls with bind, and Django's BaseExpression.identity
shape, which reads bind_partial's arguments.

EXPECTED is CPython 3.14's output; mismatches() is what the Smalltalk test case
asserts is empty.
"""

import functools
import inspect

r = {}


def t(label, thunk):
    try:
        r[label] = repr(thunk())
    except Exception as e:
        r[label] = '%s: %s' % (type(e).__name__, e)


def f(a, b=2, *rest, k, j=4, **kw):
    pass


def po(x, y=1, /, z=0):
    pass


def po_kw(x=0, /, **kw):
    pass


def simple(a, b):
    pass


sig = inspect.signature(f)


def bound(*args, **kwargs):
    ba = sig.bind(*args, **kwargs)
    return dict(ba.arguments), ba.args, ba.kwargs


def checked(func):
    """The validate-before-calling decorator shape (pydantic's validate_call,
    click, attrs)."""
    s = inspect.signature(func)

    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        s.bind(*args, **kwargs)
        return func(*args, **kwargs)
    return wrapper


@checked
def add(x, y):
    return x + y


class Expression:
    """django.db.models.expressions.BaseExpression's identity, reduced."""

    def __init__(self, value, output_field=None):
        self._sig = inspect.signature(type(self).__init__)
        self._constructor_args = ((value,), {'output_field': output_field})

    @property
    def identity(self):
        args, kwargs = self._constructor_args
        ba = self._sig.bind_partial(self, *args, **kwargs)
        ba.apply_defaults()
        items = iter(ba.arguments.items())
        next(items)
        return (type(self),) + tuple(items)


def _applied(ba):
    ba.apply_defaults()
    return dict(ba.arguments)


def _mutated(ba):
    ba.arguments['a'] = 10
    return ba.args, ba.kwargs


t('required and keyword-only', lambda: bound(1, k=3))
t('every kind', lambda: bound(1, 2, 3, 4, k=5, j=6, extra=7))
t('keyword for a positional-or-keyword', lambda: bound(a=1, b=5, k=3))
t('missing required', lambda: sig.bind())
t('missing keyword-only', lambda: sig.bind(1))
t('too many positional', lambda: inspect.signature(simple).bind(1, 2, 3))
t('multiple values', lambda: inspect.signature(simple).bind(1, a=2))
t('unexpected keyword', lambda: inspect.signature(simple).bind(1, 2, c=3))
t('positional-only given by keyword', lambda: inspect.signature(po).bind(x=1))
t('optional positional-only given by keyword',
  lambda: inspect.signature(po).bind(1, y=2))
t('positional-only name goes to **kw',
  lambda: dict(inspect.signature(po_kw).bind(x=1).arguments))
t('positional-only bound', lambda: dict(inspect.signature(po).bind(1, 2, 3).arguments))
t('bind_partial leaves required unbound', lambda: dict(sig.bind_partial(k=9).arguments))
t('bind_partial still refuses extras',
  lambda: inspect.signature(simple).bind_partial(1, 2, 3))
t('apply_defaults', lambda: _applied(sig.bind(1, k=3)))
t('apply_defaults after bind_partial', lambda: _applied(sig.bind_partial(b=7)))
t('repr', lambda: repr(sig.bind(1, k=3)))
t('equal BoundArguments', lambda: sig.bind(1, k=3) == sig.bind(1, k=3))
t('unequal BoundArguments', lambda: sig.bind(1, k=3) == sig.bind(2, k=3))
t('signature attribute', lambda: sig.bind(1, k=3).signature is sig)
t('public class', lambda: type(sig.bind(1, k=3)) is inspect.BoundArguments)
t('arguments is mutable', lambda: _mutated(sig.bind(1, k=3)))
t('bind takes a parameter named self',
  lambda: dict(inspect.signature(lambda self: 0).bind(self=1).arguments))
t('validated call', lambda: add(1, 2))
t('validated call refused', lambda: add(1, 2, 3))
t('identity differs by value',
  lambda: Expression(1).identity == Expression(2).identity)
t('identity', lambda: Expression(1).identity[1:])


EXPECTED = {
    'required and keyword-only': "({'a': 1, 'k': 3}, (1,), {'k': 3})",
    'every kind': "({'a': 1, 'b': 2, 'rest': (3, 4), 'k': 5, 'j': 6, 'kw': {'extra': 7}}, (1, 2, 3, 4), {'k': 5, 'j': 6, 'extra': 7})",
    'keyword for a positional-or-keyword': "({'a': 1, 'b': 5, 'k': 3}, (1, 5), {'k': 3})",
    'missing required': "TypeError: missing a required argument: 'a'",
    'missing keyword-only': "TypeError: missing a required argument: 'k'",
    'too many positional': 'TypeError: too many positional arguments',
    'multiple values': "TypeError: multiple values for argument 'a'",
    'unexpected keyword': "TypeError: got an unexpected keyword argument 'c'",
    'positional-only given by keyword': "TypeError: missing a required positional-only argument: 'x'",
    'optional positional-only given by keyword': "TypeError: got some positional-only arguments passed as keyword arguments: 'y'",
    'positional-only name goes to **kw': "{'kw': {'x': 1}}",
    'positional-only bound': "{'x': 1, 'y': 2, 'z': 3}",
    'bind_partial leaves required unbound': "{'k': 9}",
    'bind_partial still refuses extras': 'TypeError: too many positional arguments',
    'apply_defaults': "{'a': 1, 'b': 2, 'rest': (), 'k': 3, 'j': 4, 'kw': {}}",
    'apply_defaults after bind_partial': "{'b': 7, 'rest': (), 'j': 4, 'kw': {}}",
    'repr': "'<BoundArguments (a=1, k=3)>'",
    'equal BoundArguments': 'True',
    'unequal BoundArguments': 'False',
    'signature attribute': 'True',
    'public class': 'True',
    'arguments is mutable': "((10,), {'k': 3})",
    'bind takes a parameter named self': "{'self': 1}",
    'validated call': '3',
    'validated call refused': 'TypeError: too many positional arguments',
    'identity differs by value': 'False',
    'identity': "(('value', 1), ('output_field', None))",
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
