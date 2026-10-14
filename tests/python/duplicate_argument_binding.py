"""A parameter given both positionally and by keyword raises TypeError.

CPython binds the positional arguments first, then each keyword, and a
keyword naming a parameter the positional ones already filled is ``got
multiple values for argument 'x'``.  Grail's binding took the positional
value and silently dropped the keyword for every def with a default,
*args or **kwargs, and for every lambda (#1477) -- ``f(5, ps=1)`` answered 5.

The rows cover module functions, a classmethod, a staticmethod, instance
methods called bound and unbound, *args, **kwargs (a parameter name never
lands in **kwargs), a lambda, a def with 600 parameters, and the error's precedence over too many
positional arguments.  The guards: a positional-only name given by keyword
lands in **kwargs, keywords for parameters the positional arguments did not
reach bind normally, and a def with no defaults (already right) is unchanged.

EXPECTED is CPython 3.14's output; mismatches() is what the Smalltalk test case
asserts is empty.
"""

r = {}


def t(label, thunk):
    try:
        r[label] = repr(thunk())
    except Exception as e:
        r[label] = '%s: %s' % (type(e).__name__, e)


class C:
    @classmethod
    def cm(cls, ps, force=False):
        return ps

    @staticmethod
    def sm(ps, force=False):
        return ps

    def im(self, ps, force=False):
        return ps

    def many(self, a, b=1, *rest, k=0, **kw):
        return (a, b, rest, k, kw)


def f(ps, force=False):
    return ps


def g(a, b, c=3):
    return (a, b, c)


def h(a, b=2, *args):
    return (a, b, args)


def j(a, b=2, **kw):
    return (a, b, kw)


def po(a, /, b=2, **kw):
    return (a, b, kw)


def plain(a, b):
    return (a, b)


lam = lambda a, b=1: (a, b)

# A def with hundreds of parameters, as test_call's TestFunctionWithManyArgs
# builds: the guard is a loop, not a check per parameter.
_ns = {}
exec('def many(%s, last=0): return a300' % ', '.join('a%d' % i for i in range(600)), _ns)
many = _ns['many']

t('module def with a default', lambda: f(5, ps=1))
t('classmethod', lambda: C.cm(5, ps=1))
t('classmethod through an instance', lambda: C().cm(5, ps=1))
t('staticmethod', lambda: C.sm(5, ps=1))
t('bound method', lambda: C().im(5, ps=1))
t('unbound method', lambda: C.im(C(), 5, ps=1))
t('second parameter', lambda: g(1, 2, b=3))
t('defaulted parameter', lambda: g(1, 2, 3, c=4))
t('with *args', lambda: h(1, 2, 3, b=4))
t('with **kwargs', lambda: j(1, a=2))
t('method with everything', lambda: C().many(1, 2, b=3))
t('lambda', lambda: lam(1, a=2))
t('before too many positional', lambda: g(1, 2, 3, 4, b=5))
t('no defaults', lambda: plain(1, a=2))
t('600 parameters', lambda: many(*range(600), a599=1))
t('guard: 600 parameters, keyword past the positional ones', lambda: many(*range(300), **{'a%d' % i: -i for i in range(300, 600)}))
t('guard: positional-only name goes to **kwargs', lambda: po(1, a=2))
t('guard: keywords past the positional ones', lambda: g(1, c=4, b=2))
t('guard: all by keyword', lambda: f(ps=1, force=True))
t('guard: *args and a keyword-only', lambda: C().many(1, 2, 3, k=4, z=5))
t('guard: lambda by keyword', lambda: lam(1, b=2))


EXPECTED = {
    'module def with a default': "TypeError: f() got multiple values for argument 'ps'",
    'classmethod': "TypeError: C.cm() got multiple values for argument 'ps'",
    'classmethod through an instance': "TypeError: C.cm() got multiple values for argument 'ps'",
    'staticmethod': "TypeError: C.sm() got multiple values for argument 'ps'",
    'bound method': "TypeError: C.im() got multiple values for argument 'ps'",
    'unbound method': "TypeError: C.im() got multiple values for argument 'ps'",
    'second parameter': "TypeError: g() got multiple values for argument 'b'",
    'defaulted parameter': "TypeError: g() got multiple values for argument 'c'",
    'with *args': "TypeError: h() got multiple values for argument 'b'",
    'with **kwargs': "TypeError: j() got multiple values for argument 'a'",
    'method with everything': "TypeError: C.many() got multiple values for argument 'b'",
    'lambda': "TypeError: <lambda>() got multiple values for argument 'a'",
    'before too many positional': "TypeError: g() got multiple values for argument 'b'",
    'no defaults': "TypeError: plain() got multiple values for argument 'a'",
    '600 parameters': "TypeError: many() got multiple values for argument 'a599'",
    'guard: 600 parameters, keyword past the positional ones': '-300',
    'guard: positional-only name goes to **kwargs': "(1, 2, {'a': 2})",
    'guard: keywords past the positional ones': '(1, 2, 4)',
    'guard: all by keyword': '1',
    'guard: *args and a keyword-only': "(1, 2, (3,), 4, {'z': 5})",
    'guard: lambda by keyword': '(1, 2)',
}


def mismatches():
    """The rows that differ from CPython's, as 'label: got X, CPython Y'."""
    return ['%s: got %s, CPython %s' % (k, r.get(k), v)
            for k, v in EXPECTED.items() if r.get(k) != v]
