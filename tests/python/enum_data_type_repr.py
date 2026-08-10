# CPython's EnumType.__new__ replaces a member's __repr__/__str__/__format__
# with Enum's when the one the MRO gives is the DATA TYPE's (or object's):
#
#     for name in ('__repr__', '__str__', '__format__', '__reduce_ex__'):
#         if name not in classdict:
#             if found_method in (data_type_method, object_method):
#                 setattr(enum_class, name, enum_method)
#
# Grail asked which CATEGORY defined the method instead, and a mixin's def and
# the enum's own def are both Grail-Class Methods -- so a data type's __repr__
# was kept and ``repr(MyEnum.A)'' answered '0x1' rather than '<MyEnum.A: 0x1>'.
#
# Getting that right needs CPython's _find_data_type_, which is NOT the same
# question as "first non-enum ancestor".  It carries a CANDIDATE and commits it
# at the first class that actually constructs:
#
#   * class HexInt(int)   -- defines no __new__ itself, so it is the remembered
#                            candidate and int's __new__ commits it: the data
#                            type is HexInt, not int.
#   * @dataclass Foo      -- __dataclass_fields__, no __new__.
#   * class DumbMixin     -- defines neither anywhere in its chain, so it is not
#                            a data type at all and its __str__ is KEPT.
#   * a plain __init__    -- likewise not a data type (the probe is __new__ /
#     mixin                 __dataclass_fields__, never __init__).
#
# And the value has to BE the data type for its repr to show through:
# _value_ = member_type(*args), so MyEnum.A._value_ is HexInt(1) and renders
# 0x1.  Grail rendered values with Smalltalk's printString, which agrees for
# ints and strings and diverges for everything else.

import enum
from enum import Enum, StrEnum
from collections import namedtuple
from dataclasses import dataclass

r = {}

# --- data type's __repr__ is replaced by Enum's, and shows through the value --

class HexInt(int):
    def __repr__(self):
        return hex(self)


class MyEnum(HexInt, enum.Enum):
    A = 1
    B = 2


r['hexint_repr'] = repr(MyEnum.A)
r['hexint_value_type'] = type(MyEnum.A.value).__name__
r['hexint_member_type'] = MyEnum._member_type_ is HexInt


@dataclass(repr=False)
class Foo:
    a: int

    def __repr__(self):
        return 'ha hah!'


class Entries(Foo, Enum):
    ENTRY1 = 1


r['dataclass_repr'] = repr(Entries.ENTRY1)
r['dataclass_member_type'] = Entries._member_type_ is Foo

TTuple = namedtuple('TTuple', 'id a blist')


class NTCEnum(TTuple, Enum):
    NONE = 0, 0, []


r['namedtuple_repr'] = repr(NTCEnum.NONE)

# --- a mixin that is NOT a data type keeps its own methods --------------------
# DumbMixin defines only __str__; nothing in its chain constructs.


class DumbMixin:
    def __str__(self):
        return "don't do this"


class CustomStrEnum(str, Enum):
    pass


class DumbStrEnum(DumbMixin, CustomStrEnum):
    seven = '7'


# KNOWN GAP, recorded rather than endorsed: CPython keeps DumbMixin's __str__
# here, because it is neither the data type's nor object's, and answers
# "don't do this".  Grail answers 'DumbStrEnum.seven'.  Verified PRE-EXISTING --
# identical with this change stashed -- and test_strenum, which pins the same
# shape, is unchanged by it.  Asserted so that whoever fixes it sees this test
# fail rather than the gap going unnoticed.
r['plain_mixin_str'] = str(DumbStrEnum.seven)


# A mixin supplying only __init__ is not a data type either -- the probe is
# __new__/__dataclass_fields__, so this repr is KEPT.
class InitOnly:
    def __init__(self, a):
        self.a = a

    def __repr__(self):
        return f'InitOnly(a={self.a!r})'


class InitEntries(InitOnly, Enum):
    ENTRY1 = 1


r['init_mixin_repr'] = repr(InitEntries.ENTRY1)

# --- the enum's OWN definition always wins ------------------------------------


class Own(int, Enum):
    A = 1

    def __repr__(self):
        return 'mine'


r['own_repr'] = repr(Own.A)

# --- ordinary enums are untouched ---------------------------------------------


class Plain(int, Enum):
    A = 1


class Text(StrEnum):
    A = 'a'


r['plain'] = '%s/%s' % (repr(Plain.A), str(Plain.A))
r['strenum'] = '%s/%s' % (repr(Text.A), str(Text.A))

# A StrEnum member must still shadow correctly: str's method wins over a
# same-named member, which boxing the value through Grail's storage root broke.


class Book(StrEnum):
    author = 'author'
    title = 'title'


r['shadowed'] = '%s/%s' % (Book.author.title(), Book.title.author.name)
