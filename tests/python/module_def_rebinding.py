# Regression fixture: a top-level `def` rebinds its name, and an outer
# decorator over @classmethod / @staticmethod / @property sees the descriptor.
#
# A top-level def compiles to a METHOD on the module class and used to emit
# nothing at module-body time, while a decorator, an assignment or a def nested
# in an `if` / `try` stores the module SLOT -- and the slot out-ranks the
# method.  So the earlier binding survived the def:
#
#     @deco
#     def g(): ...
#     def g(): return "real"
#     g()        # CPython: "real".  Grail: deco's result.
#
# That is the @typing.overload shape, and why typing.py had to replace
# `overload` with one that answered the function unchanged.  The def now clears
# the slot when an earlier statement stored it; typing.py is CPython's again.
#
# The second half is test_typing's OverrideDecoratorTests: CPython hands the
# outer decorator in `@override @classmethod` the classmethod OBJECT, so the
# `__override__` mark lands on it and not on the function.  A property has no
# __dict__, so over @property the store fails and override swallows it.

import sys
import typing

RESULTS = {}


def _deco(f):
    return lambda *a: 'DECORATED'


# --- a later def displaces an earlier binding --------------------------------

@_deco
def decorated():
    pass


def decorated():
    return 'real'


RESULTS['decorated_then_def'] = (decorated() == 'real')

assigned = None


def assigned():
    return 'real'


RESULTS['assigned_then_def'] = (assigned() == 'real')

if sys:
    def nested():
        return 'nested'


def nested():
    return 'real'


RESULTS['nested_if_then_def'] = (nested() == 'real')

try:
    def in_try():
        return 'try'
except Exception:
    pass


def in_try():
    return 'real'


RESULTS['try_then_def'] = (in_try() == 'real')


def plain():
    return 'first'


def plain():
    return 'second'


RESULTS['def_then_def_keeps_last'] = (plain() == 'second')


def later():
    return 'def'


later = lambda: 'assigned'
RESULTS['assignment_after_def_wins'] = (later() == 'assigned')

# A STAR import may bind any name, so a later def of one of them has to win.
# CPython's signal.py is this shape -- `from _signal import *`, then a
# `def signal(...)` wrapper -- and `signal.signal` stayed _signal's raw function.
from colorsys import *                                        # noqa: E402,F403


def rgb_to_hsv(r, g, b):
    return 'redefined'


def _wrap_keep(f):
    return f


@_wrap_keep
def hsv_to_rgb(h, s, v):
    return 'redefined'


def _calls_rgb_to_hsv():
    return rgb_to_hsv(0, 0, 0)


RESULTS['star_import_then_def'] = (rgb_to_hsv(0, 0, 0) == 'redefined')
RESULTS['star_import_then_decorated_def'] = (hsv_to_rgb(0, 0, 0) == 'redefined')
RESULTS['star_import_then_def_bare_call'] = (_calls_rgb_to_hsv() == 'redefined')
RESULTS['star_import_other_names_kept'] = (rgb_to_yiq(0, 0, 0) == (0.0, 0.0, 0.0))


@typing.overload
def ov(x: int) -> int: ...
@typing.overload
def ov(x: str) -> str: ...


def ov(x):
    return x


RESULTS['overload_then_implementation'] = (ov(3) == 3 and ov('a') == 'a')


@typing.overload
def stub_only(x: int) -> int: ...


try:
    stub_only(1)
    RESULTS['overload_stub_raises'] = False
except NotImplementedError:
    RESULTS['overload_stub_raises'] = True


# --- an outer decorator over a declarative one sees the descriptor -----------

_seen = {}


def _spy(key):
    def record(f):
        _seen[key] = type(f).__name__
        return f
    return record


class Base:
    @classmethod
    def cm(cls):
        return 'base'

    @staticmethod
    def sm():
        return 'base'

    @property
    def prop(self):
        return 'base'


class Derived(Base):
    @typing.override
    @classmethod
    def cm(cls):
        return cls

    @typing.override
    @staticmethod
    def sm():
        return 'derived'

    @typing.override
    @property
    def prop(self):
        return 'derived'

    @_spy('classmethod')
    @classmethod
    def spied_cm(cls):
        return cls

    @_spy('staticmethod')
    @staticmethod
    def spied_sm():
        return 'sm'

    @_spy('property')
    @property
    def spied_prop(self):
        return 'prop'


class SubDerived(Derived):
    pass


_d = Derived()
RESULTS['outer_sees_classmethod'] = (_seen.get('classmethod') == 'classmethod')
RESULTS['outer_sees_staticmethod'] = (_seen.get('staticmethod') == 'staticmethod')
RESULTS['outer_sees_property'] = (_seen.get('property') == 'property')
RESULTS['override_classmethod_marks_the_descriptor'] = (
    not hasattr(Derived.cm, '__override__')
    and Derived.__dict__['cm'].__override__ is True)
RESULTS['override_staticmethod_marks_the_descriptor'] = (
    not hasattr(Derived.sm, '__override__')
    and Derived.__dict__['sm'].__override__ is True)
RESULTS['override_property_marks_nothing'] = (
    not hasattr(Derived.prop, '__override__')
    and not hasattr(Derived.prop.fget, '__override__'))
RESULTS['classmethod_still_binds_cls'] = (
    Derived.cm() is Derived and SubDerived.cm() is SubDerived
    and _d.cm() is Derived and SubDerived.spied_cm() is SubDerived)
RESULTS['staticmethod_still_calls'] = (
    Derived.sm() == 'derived' and _d.sm() == 'derived'
    and Derived.spied_sm() == 'sm')
RESULTS['property_still_reads'] = (_d.prop == 'derived' and _d.spied_prop == 'prop')

_p = property(lambda self: 1)
try:
    _p.mark = True
    RESULTS['property_refuses_new_attribute'] = False
except AttributeError:
    RESULTS['property_refuses_new_attribute'] = True
_p.__doc__ = 'doc'
RESULTS['property_accepts_doc'] = (_p.__doc__ == 'doc')


class _PropSub(property):
    pass


_ps = _PropSub(lambda self: 1)
_ps.mark = True
RESULTS['property_subclass_has_a_dict'] = (_ps.mark is True)


if __name__ == '__main__':
    for _name, _ok in RESULTS.items():
        print('%-4s %s' % ('OK' if _ok is True else 'FAIL', _name))
