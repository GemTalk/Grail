# CPython EnumType.__new__ sets ``new_member._value_ = member_type(*args)''
# whenever the enum mixes in a data type.  So ``class E(str, Enum): june = 1''
# has _value_ == '1', not 1.
#
# Grail applied that only to a FOREIGN mixin (``class E(date, Enum)'') and left
# int/str/float STORAGE enums holding the raw class-body value, on the grounds
# that the member already IS the data type -- true of the member, false of its
# _value_.
#
# It is coupled to an identity: CPython's contract is ``E._member_type_ is
# str''.  int and float already satisfied it (Integer IS int), but the string
# walk answered a concrete Unicode class.  test_enum's shared fixture gates on
# exactly that identity to decide a mixed enum's expected values, so fixing
# either half alone regresses the other.

import datetime
from enum import Enum, EnumMeta, StrEnum

r = {}

# --- _member_type_ identity ---------------------------------------------------

class StrMix(str, Enum):
    june = 1
    july = 2


class IntMix(int, Enum):
    a = 1


class FloatMix(float, Enum):
    a = 1


r['strmix_is_str'] = StrMix._member_type_ is str
r['intmix_is_int'] = IntMix._member_type_ is int
r['floatmix_is_float'] = FloatMix._member_type_ is float
r['strenum_is_str'] = StrEnum._member_type_ is str
r['plain_is_object'] = Enum._member_type_ is object
r['issubclass_still_works'] = issubclass(StrMix, StrMix._member_type_)

# --- _value_ is member_type(*args) -------------------------------------------

r['strmix_values'] = ','.join(repr(m.value) for m in StrMix)
r['intmix_value'] = repr(IntMix.a.value)
r['floatmix_value'] = repr(FloatMix.a.value)

# A str-mixin member compares equal to its coerced string.
r['strmix_eq'] = StrMix.june == '1'

# --- the functional API agrees with the class syntax --------------------------



class StrBase(str, Enum):
    pass


M = StrBase('MinorEnum', 'june july august')
r['functional_values'] = ','.join(repr(m.value) for m in M)
r['functional_eq'] = M.june == '1'
r['functional_name'] = M.june.name

# --- a PLAIN mixin is not a data type and must NOT be coerced -----------------

class _EnumSuperClass(metaclass=EnumMeta):
    pass


class E(_EnumSuperClass, Enum):
    A = 1


r['plain_mixin_repr'] = repr(E.A)

# --- a foreign data mixin keeps working --------------------------------------

class DateEnum(datetime.date, Enum):
    d = 2023, 12, 1


r['foreign_mixin_value'] = str(DateEnum.d.value)

# --- str.__new__ is the allocator, not a construction through cls ------------

class PlainStr(str):
    pass


r['str_new_plain'] = repr(str.__new__(PlainStr, 'hello'))


class EmptyStrEnum(StrEnum):
    pass


r['str_new_enum_class'] = str(str.__new__(EmptyStrEnum, 'hello'))
