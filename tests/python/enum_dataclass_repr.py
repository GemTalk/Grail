# A member whose data type is a dataclass does NOT get the dataclass's
# generated __repr__ (CPython _find_data_repr_ / _dataclass_repr):
#
#     @dataclass
#     class CreatureDataMixin:
#         size: str
#         legs: int
#         tail: bool = field(repr=False, default=True)
#
#     class Creature(CreatureDataMixin, Enum):
#         DOG = ('medium', 4)
#
#     repr(Creature.DOG)      # "<Creature.DOG: size='medium', legs=4>"
#
# Grail rendered the value with plain repr, giving
# "<Creature.DOG: CreatureDataMixin(size='medium', legs=4, tail=True)>" -- the
# member IS the composite, so naming the mixin says it twice, and a field
# declared field(repr=False) is meant to stay out of the repr.
#
# CPython stores the answer on the class as _value_repr_ and applies it in
# Enum.__repr__ (``v_repr = cls._value_repr_ or repr''), computing it by walking
# the bases for the first __repr__.  Only the GENERATED-dataclass outcome
# differs from plain repr, so that is the only one Grail names; the other three
# outcomes below already fell out of ordinary repr dispatch and are pinned here
# because the new branch must not disturb them.
#
# test_enum test_repr_with_dataclass.

from dataclasses import dataclass, field
from enum import Enum

r = {}

# --- the generated dataclass __repr__ is replaced --------------------------------


@dataclass
class CreatureDataMixin:
    size: str
    legs: int
    tail: bool = field(repr=False, default=True)


class Creature(CreatureDataMixin, Enum):
    BEETLE = ('small', 6)
    DOG = ('medium', 4)


r['generated'] = repr(Creature.DOG)
r['every_member'] = ';'.join(repr(m) for m in Creature)

# The value itself is untouched -- it is only the MEMBER repr that changes -- and
# the field left out of the repr is still there to read on it.  The value is the
# object _dataclass_repr runs on (CPython calls v_repr(self._value_)).
r['value_repr'] = repr(Creature.DOG.value)
r['hidden_on_value'] = Creature.DOG.value.tail
r['field_on_value'] = Creature.DOG.value.size
r['str'] = str(Creature.DOG)

# KNOWN GAP, unrelated to the repr and pinned so it is not mistaken for part of
# it: in CPython the member is itself an instance of the dataclass, so
# ``Creature.DOG.size`` is 'medium'.  Grail leaves the fields on the value only,
# and the member falls through to the class attribute -- which is still the
# Field object, because Grail's @dataclass does not replace a field(...)
# declaration with its default either.
r['member_field_is_a_known_gap'] = repr(Creature.DOG.tail)

# --- a hand-written __repr__ on the data type still wins -------------------------


@dataclass(repr=False)
class Foo:
    a: int

    def __repr__(self):
        return 'ha hah!'


class Entries(Foo, Enum):
    ENTRY1 = 1


r['written'] = repr(Entries.ENTRY1)
r['written_member_type'] = Entries._member_type_ is Foo

# --- an inherited __repr__ still wins --------------------------------------------
#
# @dataclass(repr=False) generates none, so the walk carries on to the base that
# has one.


class Huh:
    def __repr__(self):
        return 'inherited'


@dataclass(repr=False)
class InheritMixin(Huh):
    size: str
    legs: int
    tail: bool = field(repr=False, default=True)


class Inherited(InheritMixin, Enum):
    DOG = ('medium', 4)


r['inherited'] = repr(Inherited.DOG)

# --- no __repr__ anywhere leaves the default -------------------------------------


@dataclass(repr=False)
class BareMixin:
    size: str
    legs: int


class Bare(BareMixin, Enum):
    DOG = ('medium', 4)


r['bare_has_class_name'] = 'BareMixin object' in repr(Bare.DOG)
r['bare_starts'] = repr(Bare.DOG).startswith('<Bare.DOG: <')

# --- a dataclass INSTANCE as an ordinary member value is not affected -------------
#
# The rule is about the enum's data TYPE.  Here the bases are just (Enum,), so
# CPython's walk hits Enum, takes its _value_repr_ (None) and reprs the value --
# which for a dataclass instance is its own full repr, mixin name and all.


@dataclass
class Free:
    x: int
    hidden: int = field(repr=False, default=9)


class Plain(Enum):
    A = Free(1)


r['plain_value'] = repr(Plain.A)
