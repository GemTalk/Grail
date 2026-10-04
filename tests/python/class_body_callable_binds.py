"""A callable ASSIGNED in a class body binds self on an instance read.

A class-body assignment compiles to an accessor pair, and the instance read of
that pair bound only an UnboundMethod -- ``m = Other.method``.  A lambda or a
module-level def assigned there came back unbound:

    class C:
        f = lambda self: 1
    C().f()       # TypeError: <lambda>() missing 1 required positional argument

and one with a defaulted parameter took the first ARGUMENT as self.  The same
value stored AFTER the class existed (``C.f = ...``) bound correctly, through
the holder path.  What CPython leaves unbound -- a builtin function, a bound
method, a staticmethod -- must stay unbound, and so must a function of Grail's
own stdlib, which may be Grail's Python version of a CPython builtin
(operator.add).

Every expectation was measured against CPython 3.14.6.
"""

import functools
import operator

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:200])


def attempt(fn):
    try:
        return ('ok', fn())
    except Exception as e:
        return (type(e).__name__, str(e))


def _outer(self, x=1):
    return (type(self).__name__, x)


class _Other:
    def method(self):
        return ('method', type(self).__name__)


def _gen():
    yield 1
    yield 2


class C:
    lam = lambda self: ('lam', type(self).__name__)
    lam_default = lambda self, x=2: x * 3
    lam_star = lambda *a: len(a)
    module_def = _outer
    wrapped = functools.wraps(_outer)(lambda self: 'wrapped')
    cached = functools.lru_cache(_outer)
    other_method = _Other.method
    static = staticmethod(_outer)
    builtin = len
    stdlib_builtin = operator.add
    bound = _Other().method
    data = 5


c = C()
check('lambda_binds', attempt(lambda: c.lam()), ('ok', ('lam', 'C')))
check('lambda_default_binds', attempt(lambda: c.lam_default()), ('ok', 6))
check('lambda_default_takes_the_argument', attempt(lambda: c.lam_default(4)), ('ok', 12))
check('lambda_star_receives_self', attempt(lambda: c.lam_star()), ('ok', 1))
check('module_def_binds', attempt(lambda: c.module_def()), ('ok', ('C', 1)))
check('module_def_takes_the_argument', attempt(lambda: c.module_def(7)), ('ok', ('C', 7)))
check('wraps_result_binds', attempt(lambda: c.wrapped()), ('ok', 'wrapped'))
check('lru_cache_wrapper_binds', attempt(lambda: c.cached()), ('ok', ('C', 1)))
check('other_class_method_binds', attempt(lambda: c.other_method()), ('ok', ('method', 'C')))
check('bound_self_is_the_instance', attempt(lambda: c.lam.__self__ is c), ('ok', True))
check('class_read_stays_a_function', attempt(lambda: C.lam(c)), ('ok', ('lam', 'C')))
check('staticmethod_does_not_bind', attempt(lambda: c.static(c, 3)), ('ok', ('C', 3)))
check('builtin_does_not_bind', attempt(lambda: c.builtin([1, 2])), ('ok', 2))
# glob's ``concat_path = operator.add'': a C builtin in CPython, a Python
# function in Grail's stdlib -- either way it must not bind.
check('stdlib_builtin_does_not_bind', attempt(lambda: c.stdlib_builtin('a', 'b')), ('ok', 'ab'))
check('bound_method_does_not_rebind', attempt(lambda: c.bound()), ('ok', ('method', '_Other')))
check('data_is_data', c.data, 5)


class Iter:
    """ElementTree's iterparse shape: a bound __next__ stored in the body."""
    _g = _gen()
    __next__ = _g.__next__

    def __iter__(self):
        return self


check('bound_dunder_next_does_not_rebind', attempt(lambda: list(Iter())), ('ok', [1, 2]))


class Late:
    pass


Late.lam = lambda self: 'late'
check('assigned_after_the_class_binds_too', attempt(lambda: Late().lam()), ('ok', 'late'))

if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
