"""``locals`` reached as a VALUE rather than called where it is written.

pytest's assertion rewriting emits ``@py_builtins.locals()`` when it explains
a failed assert, to tell a local name from a global one.  Grail compiles a
direct ``locals()`` to the scope's own namespace, and builtins had no
``locals`` of its own, so every failing assert under pytest reported
``AttributeError: module 'builtins' has no attribute 'locals'`` instead of
the comparison that failed (issue #2298).  CPython's locals() answers the
CALLING frame's locals: a fresh dict in a function, the globals mapping at
module scope.

Driven by PythonTests>>LocalsAsAValueTestCase.  Every EXPECTED value was
produced by running this file under CPython 3.14.
"""

import builtins

marker = 'this module'
_l = locals
at_module_scope_it_is_globals = builtins.locals() is globals()


def through_builtins(a=1):
    b = 2
    d = builtins.locals()
    return type(d).__name__, sorted(d.items())


def through_getattr_on_builtins(a=1):
    return sorted(getattr(builtins, 'locals')())


def through_an_alias():
    x = 5
    return sorted(_l().items())


def each_call_is_a_fresh_snapshot():
    x = 1
    d = builtins.locals()
    d['x'] = 99
    return x, d is builtins.locals()


def as_pytest_uses_it():
    a = 1
    return 'a' in builtins.locals(), 'marker' in builtins.locals()


def at_module_scope():
    return at_module_scope_it_is_globals


def it_is_a_builtin_function():
    return (hasattr(builtins, 'locals'), callable(builtins.locals),
            builtins.locals.__name__)


RESULTS = {}
EXPECTED = {
    'through_builtins': ('dict', [('a', 1), ('b', 2)]),
    'through_getattr_on_builtins': ['a'],
    'through_an_alias': [('x', 5)],
    'each_call_is_a_fresh_snapshot': (1, False),
    'as_pytest_uses_it': (True, False),
    'at_module_scope': True,
    'it_is_a_builtin_function': (True, True, 'locals'),
}

for _fn in (through_builtins, through_getattr_on_builtins, through_an_alias,
            each_call_is_a_fresh_snapshot, as_pytest_uses_it, at_module_scope,
            it_is_a_builtin_function):
    try:
        _v = _fn()
    except BaseException as _exc:
        _v = ('raised', type(_exc).__name__, str(_exc))
    RESULTS[_fn.__name__] = (_v == EXPECTED[_fn.__name__]) or 'got: %r' % (_v,)


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
