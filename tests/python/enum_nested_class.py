# A class DEFINED IN an enum body is not a member (CPython 3.13 -- through 3.12
# it was one, with a DeprecationWarning saying it would stop being one):
#
#     class Outer(Enum):
#         a = 1
#         class Inner(Enum):
#             foo = 10
#
#     Outer.Inner            # the class itself, not <Outer.Inner: <enum 'Inner'>>
#     list(Outer)            # [Outer.a], not [Outer.a, Outer.Inner]
#
# Grail made it a member, so ``Outer.Inner.foo`` raised AttributeError and
# ``isinstance(Outer.Inner, type)`` was False -- test_enum
# test_nested_classes_in_enum_are_not_members.
#
# Merely NAMING a class defined elsewhere still makes an ordinary member
# (``class MyTypes(Enum): i = int``), and nothing about the class object itself
# separates the two cases -- so CPython's _is_internal_class reads __qualname__,
# which only a nested DEFINITION gets prefixed with its enclosing class.

from enum import Enum, IntEnum, Flag, member, nonmember

r = {}


class Outer(Enum):
    a = 1
    b = 2

    class Inner(Enum):
        foo = 10
        bar = 11


r['is_type'] = isinstance(Outer.Inner, type)
r['inner_repr'] = repr(Outer.Inner)
r['inner_usable'] = Outer.Inner.foo.value
r['inner_list'] = repr(list(Outer.Inner))
r['outer_list'] = repr(list(Outer))
r['outer_names'] = repr(sorted(Outer.__members__))

# It is a plain class attribute, so it is NOT a value lookup either.
try:
    Outer(Outer.Inner)
    r['not_by_value'] = 'NOT RAISED'
except ValueError:
    r['not_by_value'] = 'ValueError'

# --- naming a class defined elsewhere is still a member -------------------------


class Free:
    pass


class MyTypes(Enum):
    i = int
    s = str
    f = Free


# By NAME, not by repr: Grail's ``str`` is not a class object, so the member
# reprs carry an internal spelling that has nothing to do with this rule.
r['named_is_member'] = repr([m.name for m in MyTypes])
r['named_value'] = MyTypes.f.value is Free
r['int_value'] = MyTypes.i.value is int
r['str_value'] = MyTypes.s.value is str

# --- the two decorators still override, in both directions ---------------------


class Forced(Enum):
    a = 1

    @member
    class Inner(Enum):
        foo = 10


r['forced_is_member'] = isinstance(Forced.Inner, Forced)
r['forced_list'] = repr(list(Forced))
r['forced_reaches_class'] = Forced.Inner.value.foo.value


class Excluded(Enum):
    a = 1

    @nonmember
    class Inner(Enum):
        foo = 10


r['nonmember_is_type'] = isinstance(Excluded.Inner, type)
r['nonmember_list'] = repr(list(Excluded))

# --- other enum flavours, and a plain nested class -----------------------------


class Ints(IntEnum):
    one = 1

    class Helper:
        WIDTH = 3


r['int_enum_list'] = repr(list(Ints))
r['int_enum_helper'] = Ints.Helper.WIDTH


class Flags(Flag):
    RED = 1

    class Helper:
        pass


r['flag_list'] = repr(list(Flags))
r['flag_helper_is_type'] = isinstance(Flags.Helper, type)

# --- an enum that is itself nested ----------------------------------------------
#
# CPython's test is endswith rather than equality because the qualname carries
# the whole chain: ``Wrapper.Deep.Inner`` against a pattern of ``Deep.Inner``.
# Grail's __qualname__ stops at the immediately-enclosing class, so it answers
# ``Deep.Inner`` and the EQUALITY branch takes it -- a separate gap that does
# not change the answer here.  The endswith branch is kept because it is
# CPython's, and because it is what makes this case work once qualname is fixed.


class Wrapper:
    class Deep(Enum):
        a = 1

        class Inner(Enum):
            foo = 10


r['deep_is_type'] = isinstance(Wrapper.Deep.Inner, type)
r['deep_list'] = repr(list(Wrapper.Deep))
