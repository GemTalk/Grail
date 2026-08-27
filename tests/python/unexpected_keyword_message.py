"""The TypeError text for a keyword the callee cannot bind.

Two emissions in FunctionDefAst's call-validation guard (three counting the
positional-only variant), and both used to read ``got an unexpected keyword
argument: z`` with the BARE function name.  CPython prefixes the QUALNAME
and quotes the argument -- test_locks' test_lock_doesnt_accept_loop_parameter
regex-matches ``Lock\\.__init__\\(\\) got an unexpected keyword argument
'loop'`` and was the failure that surfaced the gap.  The posonly message
gains the qualname prefix too; its wording was already CPython's.

The qualname cases matter more than the format: a method reports
``Cls.__init__()``, a nested class chains (``Outer.Inner.m()``), and a def
inside a function carries ``<locals>`` (``outer.<locals>.inner()``) -- all
from the same ___qualifiedNameFor___: the arity messages already used, so
the two agree by construction.

Every expectation was checked against CPython 3.14 first.
"""

RESULTS = {}


def _msg(fn, *args, **kw):
    try:
        fn(*args, **kw)
        return 'NO RAISE'
    except TypeError as exc:
        return str(exc)


def check(name, got, expected):
    RESULTS[name] = (got == expected) or 'got: %s' % got


class Lock:
    def __init__(self):
        pass


def f(a, b=1):
    pass


def g(a, /, b=2):
    pass


class Outer:
    class Inner:
        def m(self):
            pass


def outer():
    def inner(a):
        pass
    return inner


check('method_qualname',
      _msg(Lock, loop=1),
      "Lock.__init__() got an unexpected keyword argument 'loop'")

check('plain_function',
      _msg(f, 1, z=9),
      "f() got an unexpected keyword argument 'z'")

check('nested_class_qualname',
      _msg(Outer.Inner().m, x=1),
      "Outer.Inner.m() got an unexpected keyword argument 'x'")

check('locals_qualname',
      _msg(outer(), z=1),
      "outer.<locals>.inner() got an unexpected keyword argument 'z'")

check('posonly_by_keyword',
      _msg(g, a=9),
      "g() got some positional-only arguments passed as keyword arguments: 'a'")

check('posonly_outranks_unknown',
      _msg(g, 1, 2, a=1, z=9),
      "g() got some positional-only arguments passed as keyword arguments: 'a'")

check('unknown_on_posonly_def',
      _msg(g, 1, 2, z=9),
      "g() got an unexpected keyword argument 'z'")


def kw_collector(a, **kw):
    return kw


check('kwargs_still_collects',
      _msg(kw_collector, 1, z=9),
      'NO RAISE')


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
