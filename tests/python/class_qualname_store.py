# ``cls.__qualname__ = 'Outer.Inner'`` is a WRITABLE slot in CPython, and pickle
# depends on it.  A class defined in a function body is pickled by walking its
# dotted qualname from the module, so the idiom is to attach the class somewhere
# reachable and then say where it now lives:
#
#     self.__class__.NestedEnum = NestedEnum
#     NestedEnum.__qualname__ = 'TestSpecial.NestedEnum'
#
# Grail dropped the store SILENTLY -- the assignment appeared to work and the
# read still answered the old name, so pickle looked for a top-level
# ``NestedEnum`` that was not there.
#
# The class-side read of __qualname__ always performs the getter (it must, so
# ``type(x).__qualname__`` is a string rather than a bound method), and that
# getter reads a different slot: ___qualname___, which ClassDefAst fills for a
# nested class at build time.  The store now goes to that slot.
#
# test_enum TestSpecial.test_pickle_nested_class.

import pickle
from enum import Enum

r = {}


class Holder:
    pass


# Every class this file MUTATES is built inside a function.  A module-level
# class is canonical -- the registry hands the same object back on the next
# import -- so a __qualname__ assignment would leak into the following test and
# ``before`` would already read the mutated name.


def _plain():
    class Plain:
        pass
    return Plain


Plain = _plain()
r['before'] = Plain.__qualname__
Plain.__qualname__ = 'Holder.Plain'
r['after'] = Plain.__qualname__

# __name__ is untouched -- only the QUALified name moved.
r['name_unchanged'] = Plain.__name__

# A build-time nested qualname is still there, and can still be overridden.


def _outer():
    class Outer:
        class Inner:
            pass
    return Outer


Outer = _outer()
r['nested_default'] = Outer.Inner.__qualname__
Outer.Inner.__qualname__ = 'Somewhere.Else'
r['nested_override'] = Outer.Inner.__qualname__

# --- what the store is FOR: pickling a class defined in a function ---------------


def make():
    class NestedEnum(Enum):
        twigs = 'common'
        shiny = 'rare'
    return NestedEnum


NestedEnum = make()
Holder.NestedEnum = NestedEnum
NestedEnum.__qualname__ = 'Holder.NestedEnum'

r['qualname'] = NestedEnum.__qualname__
r['roundtrip'] = pickle.loads(pickle.dumps(NestedEnum.twigs)) is NestedEnum.twigs
r['roundtrip_class'] = pickle.loads(pickle.dumps(NestedEnum)) is NestedEnum

# KNOWN GAP, recorded rather than endorsed: a class that was never attached
# anywhere still pickles here, where CPython raises PicklingError because the
# qualname resolves to nothing.  Unrelated to the store above -- Grail's pickle
# is simply more permissive about an unreachable class -- and pinned so it is
# not mistaken for part of it.


def make2():
    class Unreachable(Enum):
        a = 1
    return Unreachable


Unreachable = make2()
try:
    pickle.dumps(Unreachable.a)
    r['unattached_is_a_known_gap'] = 'NO ERROR'
except Exception as e:
    r['unattached_is_a_known_gap'] = type(e).__name__
