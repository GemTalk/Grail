"""Fixture: a decorator that recurses without end raises RecursionError.

Grail applies a decorator inside a handler that catches everything, so that a
decorator it cannot apply leaves the def undecorated (issue #1369 asks whether
it should).  That handler also caught the stack running out, so a decorator
that recursed was silently DROPPED: the def stayed undecorated and nothing was
raised.  This was measured at the module-level, class-body method and
property-setter decorator sites, on both codegen paths.  The class decorator
and a decorated nested def were already right and are kept here as controls.

Every expected value below is CPython 3.14's.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


def recursing(f):
    return recursing(f)


def deep(n):
    return deep(n + 1)


def outcome(thunk):
    try:
        thunk()
        return 'no error'
    except RecursionError:
        return 'RecursionError'


def module_level():
    sys.modules.pop('decorator_recursion_helper', None)
    try:
        import decorator_recursion_helper  # noqa: F401
    finally:
        sys.modules.pop('decorator_recursion_helper', None)


def method_decorator():
    class C:
        @recursing
        def m(self):
            return 1


def property_setter_decorator():
    class P:
        @property
        def x(self):
            return 1

        @x.setter
        @recursing
        def x(self, v):
            pass


def class_decorator():
    @recursing
    class K:
        pass


def nested_def_decorator():
    @recursing
    def g():
        return 1


r = {
    'module_level': outcome(module_level),
    'method_decorator': outcome(method_decorator),
    'property_setter_decorator': outcome(property_setter_decorator),
    'class_decorator': outcome(class_decorator),
    'nested_def_decorator': outcome(nested_def_decorator),
    # The stack warning still works after all of the above.
    'plain_recursion_after': outcome(lambda: deep(0)),
}

EXPECTED = {
    'module_level': 'RecursionError',
    'method_decorator': 'RecursionError',
    'property_setter_decorator': 'RecursionError',
    'class_decorator': 'RecursionError',
    'nested_def_decorator': 'RecursionError',
    'plain_recursion_after': 'RecursionError',
}


if __name__ == '__main__':
    for k in EXPECTED:
        print('%-4s %s' % ('OK' if r[k] == EXPECTED[k] else 'FAIL', k))
