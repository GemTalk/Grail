# A mixin used as a SECONDARY base -- ``class Color(StrMixin, MaxMixin, Enum)''
# rather than ``class Color(MaxMixin, StrMixin, Enum)''.
#
# Grail gives a class ONE Smalltalk superclass, so only the primary base is
# inherited; the others are merged by copying their compiled methods down
# (importlib ___mergeSecondaryBases___).  Two things went wrong with that.
#
# (1) A class-body DECORATOR rebinds the name it decorates: the compiled method
#     stays put and the decorated object lands in the base's class-attribute
#     store, which is what ``Cls.name'' actually reads.  Copying the method
#     alone handed the subclass the RAW, undecorated function, so
#     ``@classproperty def MAX(cls)'' answered an UnboundMethod instead of
#     running the descriptor -- but only from the secondary position, since as
#     the primary base the store is inherited through the chain.
#
# (2) CPython's member_type is ``_find_data_type_(bases) or object'', and when
#     it is object the value is stored RAW.  Grail reached its member-type walk
#     through "the enum is the storage root", which is exactly the shape
#     ``class CoolColor(StrMixin, SomeEnum, Enum)'' takes -- a plain mixin is no
#     storage base -- and the walk answered the first non-enum ancestor,
#     StrMixin.  Constructing through it made CoolColor.RED.value a
#     <StrMixin object> rather than 1.
#
# Both are test_enum's test_multiple_mixin (TestSpecial and OldTestFlag).

from enum import Enum, Flag, auto

r = {}


class classproperty:

    def __init__(self, fget=None):
        self.fget = fget

    def __get__(self, instance, ownerclass):
        return self.fget(ownerclass)


class MaxMixin:
    @classproperty
    def MAX(cls):
        m = len(cls)
        cls.MAX = m
        return m


class StrMixin:
    def __str__(self):
        return self._name_.lower()


# --- (1) the decorator survives from either base position --------------------


class Primary(MaxMixin, Enum):
    RED = auto()
    GREEN = auto()
    BLUE = auto()


class Secondary(StrMixin, MaxMixin, Enum):
    RED = auto()
    GREEN = auto()
    BLUE = auto()
    __str__ = StrMixin.__str__


r['primary_max'] = Primary.MAX
r['secondary_max'] = Secondary.MAX
# ``cls.MAX = m'' inside the property replaces it with a plain int: the second
# read must see the store, not re-run the descriptor.
r['secondary_max_again'] = Secondary.MAX
r['secondary_str'] = str(Secondary.BLUE)

# Nothing about this is enum-specific -- the merge is importlib's.


class TagMixin:
    @classproperty
    def TAG(cls):
        return 'tag:' + cls.__name__


class Plain:
    pass


class PlainSecondary(Plain, TagMixin):
    pass


r['plain_secondary_tag'] = PlainSecondary.TAG

# A subclass's OWN definition still wins over the base's rebinding.


class OwnWins(StrMixin, MaxMixin, Enum):
    RED = auto()

    @classproperty
    def MAX(cls):
        return 'mine'


r['own_wins'] = OwnWins.MAX

# --- (2) a non-data-type mixin leaves the value raw ---------------------------


class SomeEnum(Enum):
    def behavior(self):
        return 'booyah'


class CoolColor(StrMixin, SomeEnum, Enum):
    RED = auto()
    GREEN = auto()
    BLUE = auto()
    __str__ = StrMixin.__str__


r['cool_value'] = CoolColor.RED.value
r['cool_member_type'] = CoolColor._member_type_ is object
r['cool_str'] = str(CoolColor.BLUE)
r['cool_behavior'] = CoolColor.RED.behavior()


class AllMixin:
    @classproperty
    def ALL(cls):
        return sum(m.value for m in cls)


class ColorFlag(AllMixin, StrMixin, Flag):
    RED = auto()
    GREEN = auto()
    BLUE = auto()
    __str__ = StrMixin.__str__


r['flag_all'] = ColorFlag.ALL
r['flag_value'] = ColorFlag.RED.value

# --- the data types that DO construct are untouched ---------------------------


class HexInt(int):
    def __repr__(self):
        return hex(self)


class Hexed(HexInt, Enum):
    A = 1


class Ints(int, Enum):
    A = 1


class Texts(str, Enum):
    A = 'a'


r['hex_repr'] = repr(Hexed.A)
r['hex_value_type'] = type(Hexed.A.value).__name__
r['int_enum'] = '%r/%d' % (Ints.A, Ints.A.value)
r['str_enum'] = '%r/%s' % (Texts.A, Texts.A.value)
