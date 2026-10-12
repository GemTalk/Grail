"""A lambda checks how it was called, as a def does (#1493).

A lambda used to bind only what it declared: extra positional arguments and
unknown keywords were dropped silently, so ``(lambda a: a)(1, 2)`` answered 1
where CPython raises.  It now runs a def's two arity guards -- too many
positional arguments, unexpected keyword -- ahead of its binding, and every
message names it by its qualified name, as CPython's do.

The rows cover plain, defaulted, keyword-only and positional-only parameters,
a lambda nested in a function and one in a class body (whose qualnames differ),
the order CPython reports in when a call is wrong twice, and the calls that must
still succeed: *args and **kwargs absorb the extras, and a positional-only
parameter's name passed as a keyword lands in **kwargs rather than binding it.

EXPECTED is CPython 3.14's output; mismatches() is what the Smalltalk test case
asserts is empty.
"""

r = {}


def t(label, thunk):
    try:
        r[label] = repr(thunk())
    except TypeError as e:
        r[label] = 'TypeError: ' + str(e)


l0 = lambda: 0
l1 = lambda a: a
l2 = lambda a, b=2: (a, b)
lk = lambda a, *, k=1: (a, k)
lkr = lambda a, *, k: (a, k)
lpo = lambda a, /, b: (a, b)
lpod = lambda a=1, /, **kw: (a, kw)
lpokw = lambda a, /, **kw: (a, kw)
lva = lambda a, *rest: (a, rest)
lkw = lambda a, **kw: (a, kw)
neg = lambda x: -x
add = lambda x, y: x + y


def outer():
    return lambda a: a


nested = outer()


class K:
    m = lambda a: a


t('l0(1)', lambda: l0(1))
t('l0(1, 2)', lambda: l0(1, 2))
t('l0(z=1)', lambda: l0(z=1))
t('l1(1, 2)', lambda: l1(1, 2))
t('l1(1, z=2)', lambda: l1(1, z=2))
t('l1(z=2)', lambda: l1(z=2))
t('l1()', lambda: l1())
t('l1(a=5)', lambda: l1(a=5))
t('l2(1, 2, 3)', lambda: l2(1, 2, 3))
t('l2(1, b=3)', lambda: l2(1, b=3))
t('lk(1, 2)', lambda: lk(1, 2))
t('lk(1, 2, k=3)', lambda: lk(1, 2, k=3))
t('lk(1, j=3)', lambda: lk(1, j=3))
t('lkr(1)', lambda: lkr(1))
t('lpo(1, 2, 3)', lambda: lpo(1, 2, 3))
t('lpo(a=1, b=2)', lambda: lpo(a=1, b=2))
t('lpo(1, b=2, z=3)', lambda: lpo(1, b=2, z=3))
t('lpo(1, 2, a=1, z=9)', lambda: lpo(1, 2, a=1, z=9))
t('lpod(a=2)', lambda: lpod(a=2))
t('lpod(5, a=2)', lambda: lpod(5, a=2))
t('lpokw(1, a=2)', lambda: lpokw(1, a=2))
t('lpokw(a=2)', lambda: lpokw(a=2))
t('lva(1, 2, 3)', lambda: lva(1, 2, 3))
t('lva(1, z=2)', lambda: lva(1, z=2))
t('lkw(1, z=2)', lambda: lkw(1, z=2))
t('lkw(1, 2)', lambda: lkw(1, 2))
t('nested(1, 2)', lambda: nested(1, 2))
t('nested()', lambda: nested())
t('K.m(1, 2)', lambda: K.m(1, 2))
t('sorted with a one-argument key', lambda: sorted([3, 1, 2], key=neg))
t('map with a two-argument lambda', lambda: list(map(add, [1, 2], [3, 4])))
t('map with too few parameters', lambda: list(map(neg, [1], [2])))


EXPECTED = {
    'l0(1)': 'TypeError: <lambda>() takes 0 positional arguments but 1 was given',
    'l0(1, 2)': 'TypeError: <lambda>() takes 0 positional arguments but 2 were given',
    'l0(z=1)': "TypeError: <lambda>() got an unexpected keyword argument 'z'",
    'l1(1, 2)': 'TypeError: <lambda>() takes 1 positional argument but 2 were given',
    'l1(1, z=2)': "TypeError: <lambda>() got an unexpected keyword argument 'z'",
    'l1(z=2)': "TypeError: <lambda>() got an unexpected keyword argument 'z'",
    'l1()': "TypeError: <lambda>() missing 1 required positional argument: 'a'",
    'l1(a=5)': '5',
    'l2(1, 2, 3)': 'TypeError: <lambda>() takes from 1 to 2 positional arguments but 3 were given',
    'l2(1, b=3)': '(1, 3)',
    'lk(1, 2)': 'TypeError: <lambda>() takes 1 positional argument but 2 were given',
    'lk(1, 2, k=3)': 'TypeError: <lambda>() takes 1 positional argument but 2 positional arguments (and 1 keyword-only argument) were given',
    'lk(1, j=3)': "TypeError: <lambda>() got an unexpected keyword argument 'j'",
    'lkr(1)': "TypeError: <lambda>() missing 1 required keyword-only argument: 'k'",
    'lpo(1, 2, 3)': 'TypeError: <lambda>() takes 2 positional arguments but 3 were given',
    'lpo(a=1, b=2)': "TypeError: <lambda>() got some positional-only arguments passed as keyword arguments: 'a'",
    'lpo(1, b=2, z=3)': "TypeError: <lambda>() got an unexpected keyword argument 'z'",
    'lpo(1, 2, a=1, z=9)': "TypeError: <lambda>() got some positional-only arguments passed as keyword arguments: 'a'",
    'lpod(a=2)': "(1, {'a': 2})",
    'lpod(5, a=2)': "(5, {'a': 2})",
    'lpokw(1, a=2)': "(1, {'a': 2})",
    'lpokw(a=2)': "TypeError: <lambda>() missing 1 required positional argument: 'a'",
    'lva(1, 2, 3)': '(1, (2, 3))',
    'lva(1, z=2)': "TypeError: <lambda>() got an unexpected keyword argument 'z'",
    'lkw(1, z=2)': "(1, {'z': 2})",
    'lkw(1, 2)': 'TypeError: <lambda>() takes 1 positional argument but 2 were given',
    'nested(1, 2)': 'TypeError: outer.<locals>.<lambda>() takes 1 positional argument but 2 were given',
    'nested()': "TypeError: outer.<locals>.<lambda>() missing 1 required positional argument: 'a'",
    'K.m(1, 2)': 'TypeError: K.<lambda>() takes 1 positional argument but 2 were given',
    'sorted with a one-argument key': '[3, 2, 1]',
    'map with a two-argument lambda': '[4, 6]',
    'map with too few parameters': 'TypeError: <lambda>() takes 1 positional argument but 2 were given',
}


def mismatches():
    """The rows that differ from CPython's, as 'label: got X, CPython Y'."""
    return ['%s: got %s, CPython %s' % (k, r.get(k), v)
            for k, v in EXPECTED.items() if r.get(k) != v]
