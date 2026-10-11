"""Fixture: an exception raised by a decorator propagates (issue #1369).

Grail used to apply decorators inside a handler that caught everything, so
that one it could not apply left the def undecorated.  That hid real defects:
a stub inspect.getfullargspec left every Django template tag unregistered,
and missing test.support decorators ran tests that should have been skipped.
Each site now lets the exception through, as CPython does.

Every expected value below is CPython 3.14's.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


def raising(f):
    raise ValueError('decorator raised')


def outcome(thunk):
    try:
        thunk()
        return 'no error'
    except ValueError as e:
        return 'ValueError: %s' % e


def module_level():
    sys.modules.pop('decorator_raising_helper', None)
    try:
        import decorator_raising_helper  # noqa: F401
    finally:
        sys.modules.pop('decorator_raising_helper', None)


def method_decorator():
    class C:
        @raising
        def m(self):
            return 1


def property_setter_decorator():
    class P:
        @property
        def x(self):
            return 1

        @x.setter
        @raising
        def x(self, v):
            pass


def class_decorator():
    @raising
    class K:
        pass


def nested_def_decorator():
    @raising
    def g():
        return 1


r = {
    'module_level': outcome(module_level),
    'method_decorator': outcome(method_decorator),
    'property_setter_decorator': outcome(property_setter_decorator),
    'class_decorator': outcome(class_decorator),
    'nested_def_decorator': outcome(nested_def_decorator),
}

EXPECTED = {
    'module_level': 'ValueError: decorator raised',
    'method_decorator': 'ValueError: decorator raised',
    'property_setter_decorator': 'ValueError: decorator raised',
    'class_decorator': 'ValueError: decorator raised',
    'nested_def_decorator': 'ValueError: decorator raised',
}


if __name__ == '__main__':
    for k in EXPECTED:
        print('%-4s %s' % ('OK' if r[k] == EXPECTED[k] else 'FAIL', k))
