"""``globals`` reached as a VALUE rather than called where it is written.

timeit does ``_globals = globals`` at module level and calls ``_globals()``
inside Timer.__init__, to default the timed code's namespace to the module
that runs it.  Grail compiles a direct ``globals()`` to the module's own
namespace, so there was no ``globals`` to read as a value, and the assignment
was a NameError.  CPython's globals() answers the CALLING frame's globals.

Every EXPECTED value was produced by running this file under CPython 3.14.
"""

import builtins

marker = 'this module'
_g = globals


def through_an_alias():
    return _g()['marker'], _g() is globals()


def through_getattr_on_builtins():
    return getattr(builtins, 'globals')() is globals()


def it_is_a_builtin_function():
    return (hasattr(builtins, 'globals'), callable(globals), globals.__name__)


RESULTS = {}
EXPECTED = {
    'through_an_alias': ('this module', True),
    'through_getattr_on_builtins': True,
    'it_is_a_builtin_function': (True, True, 'globals'),
}

for _fn in (through_an_alias, through_getattr_on_builtins, it_is_a_builtin_function):
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
