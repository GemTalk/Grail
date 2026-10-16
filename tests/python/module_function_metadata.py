"""Module-level functions and lambdas carry CPython's function metadata (#1228).

#1228 listed fourteen ways a module-level def and a lambda fell short of a
CPython function.  Most were fixed by other changes; this fixture pins them
all, and covers the three this change fixes:

* ``f.__defaults__ = t`` and ``f.__kwdefaults__ = d`` on a MODULE-LEVEL def or
  a METHOD read back but did not change what a call binds.  A nested def
  already wrote the new values through; now all three do.
* ``f.__defaults__ = [1]`` was accepted for a nested def, where CPython
  refuses anything but a tuple or None.
* A lambda's code object had no ``co_varnames``, a ``co_flags`` of 0, and a
  nested lambda's ``co_qualname`` was the bare ``<lambda>``.

What is NOT covered, because Grail and CPython still differ there: an
assignment that changes the SHAPE of the defaults (None, a tuple of another
length, a dict that adds or drops a keyword-only name).  Whether a parameter
has a default is compiled into Grail's call path, so such a write reads back
but does not bind.  FunctionDefaultsTestCase documents that limit.

Every expectation was measured against CPython 3.14.
"""

import doctest
import functools
import inspect
import sys
import types

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:200])


def _try(fn):
    try:
        return fn()
    except Exception as exc:
        return '%s: %s' % (type(exc).__name__, exc)


# --------------------------------------------------- what #1228 reported

def f(a, b=2, *, c=3, d):
    "doc"
    return (a, b, c, d)


lam = lambda x, y=5: x


check('a_module_def_has_its_metadata',
      [f.__doc__, f.__defaults__, f.__kwdefaults__, f.__code__.co_varnames,
       (f.__code__.co_argcount, f.__code__.co_kwonlyargcount)],
      ['doc', (2,), {'c': 3}, ('a', 'b', 'c', 'd'), (2, 2)])
check('inspect_classes_a_module_def_as_a_function',
      [inspect.isfunction(f), inspect.ismethod(f), isinstance(f, types.FunctionType)],
      [True, False, True])
check('getfullargspec_of_a_module_def',
      tuple(inspect.getfullargspec(f)),
      (['a', 'b'], None, None, (2,), ['c', 'd'], {'c': 3}, {}))
check('a_lambda_has_its_signature',
      [lam.__defaults__, str(inspect.signature(lam)), tuple(inspect.getfullargspec(lam))],
      [(5,), '(x, y=5)', (['x', 'y'], None, None, (5,), [], None, {})])


def _target():
    "target doc"


def _wrapper():
    pass


functools.update_wrapper(_wrapper, _target)


@functools.wraps(_target)
def _wrapped():
    pass


check('update_wrapper_and_wraps_on_module_defs',
      [_wrapper.__doc__, _wrapper.__wrapped__ is _target,
       _wrapped.__name__, _wrapped.__doc__, _wrapped.__wrapped__ is _target],
      ['target doc', True, '_target', 'target doc', True])


def _failing_doctest():
    """
    >>> 1 + 1
    3
    """


def _run_doctest():
    tests = doctest.DocTestFinder().find(_failing_doctest)
    runner = doctest.DocTestRunner(verbose=False)
    for t in tests:
        runner.run(t, out=lambda s: None)
    return (runner.failures, runner.tries)


check('doctest_finds_a_module_defs_docstring', _run_doctest(), (1, 1))


# ------------------------------------- assigned defaults change the call

def g(a, b=2, *, c=3, d):
    return (a, b, c, d)


def _assign_module():
    g.__defaults__ = (20,)
    g.__kwdefaults__ = {'c': 30}
    return [g.__defaults__, g.__kwdefaults__, g(1, d=0)]


check('a_module_defs_assigned_defaults_bind', _assign_module(),
      [(20,), {'c': 30}, (1, 20, 30, 0)])


def h(a, b=2, *, c=3, d):
    return (a, b, c, d)


def _a_later_write_replaces_an_uncarried_one():
    h.__defaults__ = (5, 6)      # another length: reads back, does not bind
    h.__defaults__ = (50,)       # the def's own shape: binds
    return [h.__defaults__, h(1, d=0)]


check('a_later_write_replaces_an_uncarried_one',
      _a_later_write_replaces_an_uncarried_one(), [(50,), (1, 50, 3, 0)])


class C:
    def m(self, a, b=2, *, c=3, d):
        return (a, b, c, d)


class D(C):
    pass


def _assign_method():
    C.m.__defaults__ = (7,)
    C.m.__kwdefaults__ = {'c': 8}
    return [C.m.__defaults__, C.m.__kwdefaults__, C().m(1, d=0),
            D().m(1, d=0), D.m.__defaults__]


check('a_methods_assigned_defaults_bind', _assign_method(),
      [(7,), {'c': 8}, (1, 7, 8, 0), (1, 7, 8, 0), (7,)])


def _nested():
    def n(a, b=2):
        return (a, b)
    return n


def _refusals():
    out = []
    for fn in (_nested(), g, C.m):
        out.append(_try(lambda: setattr(fn, '__defaults__', [1])))
        out.append(_try(lambda: setattr(fn, '__kwdefaults__', 5)))
    return out


check('a_non_tuple_or_non_dict_is_refused', _refusals(),
      ['TypeError: __defaults__ must be set to a tuple object',
       'TypeError: __kwdefaults__ must be set to a dict object'] * 3)


# ------------------------------------------------ a lambda's code object

lam2 = lambda x, y=5, *a, k, **kw: x


def _outer():
    return lambda p, q=1: p


def _code_fields(fn):
    c = fn.__code__
    return [c.co_varnames, c.co_flags, c.co_qualname,
            c.co_argcount, c.co_kwonlyargcount]


check('a_lambdas_code_object',
      [_try(lambda: _code_fields(lam2)), _try(lambda: _code_fields(_outer())),
       _try(lambda: (lambda: 0).__code__.co_varnames)],
      [[('x', 'y', 'k', 'a', 'kw'), 15, '<lambda>', 2, 1],
       [('p', 'q'), 19, '_outer.<locals>.<lambda>', 2, 0],
       ()])

SUMMARY = '%d checks, %d disagreeing' % (len(RESULTS), sum(1 for v in RESULTS.values() if v is not True))

if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
