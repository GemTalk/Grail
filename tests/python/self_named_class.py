"""Fixture: a module that defines a top-level class WITH ITS OWN NAME.

``socket.py'' does this -- module ``socket'', ``class socket'' at line 218 --
and so do netrc, decimal's Decimal-era shims, and a good deal of the stdlib.
Inside such a module the bare name refers to the CLASS; the module is reached
as ``sys.modules[__name__]'' or not at all.

Grail compiles a module's globals against a backing Smalltalk class, and
generated code refers to the module singleton by that class's BARE NAME
(``socket @env0:___instance___'', AbstractNode >> ___moduleStoreReceiverExpr___
emits it whenever a global is stored from inside a class body).  When the
module also defines that name, the reference has two plausible referents and
the module loses: importing CPython's socket.py died with

    a socket class does not understand #'___instance___'

-- the module self-reference had resolved to the class.  The module could not
be imported at all, so the failure was total rather than subtle.

``global_store_from_a_class_body'' is the check that matters: that is the
exact emission site, and a module that merely DEFINES a same-named class
without ever storing a global from a class body would import fine and prove
nothing.
"""

import sys


class self_named_class:
    """Same name as this module, on purpose."""

    def __init__(self, v):
        self.v = v

    def doubled(self):
        return self.v * 2


_counter = 0


def make(v):
    """Calls the class by BARE NAME from module level."""
    return self_named_class(v)


class Holder:
    def bump(self):
        # A global STORE from inside a class body's method -- the emission
        # site for the module self-reference.
        global _counter
        _counter += 1
        return _counter


RESULTS = {}


def check(name, fn, expected):
    try:
        RESULTS[name] = (fn() == expected)
    except BaseException as exc:
        RESULTS[name] = 'raised %s: %s' % (type(exc).__name__, exc)


check('bare_name_is_the_class', lambda: make(21).doubled(), 42)
check('isinstance_against_bare_name',
      lambda: isinstance(make(1), self_named_class), True)
check('class_name_is_not_the_module', lambda: self_named_class.__name__,
      'self_named_class')
check('module_attributes_still_reachable',
      lambda: callable(getattr(sys.modules[__name__], 'make')), True)
check('module_is_reachable_via_sys_modules',
      lambda: sys.modules[__name__] is not self_named_class, True)
check('global_store_from_a_class_body', lambda: Holder().bump(), 1)
check('global_store_accumulates', lambda: (Holder().bump(), _counter)[1], 2)


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
