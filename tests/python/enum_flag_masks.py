# CPython keeps three masks on every Flag CLASS, built up member by member in
# _proto_member.__set_name__:
#
#     enum_class._flag_mask_ |= value
#     if _is_single_bit(value):
#         enum_class._singles_mask_ |= value
#     enum_class._all_bits_ = 2 ** ((enum_class._flag_mask_).bit_length()) - 1
#
# Grail had none of them exposed, so ``FlagFromChar._all_bits_`` was an
# AttributeError (test_enum test_flag_with_custom_new).
#
# _all_bits_ is emphatically NOT the mask: a flag whose only member is 1 << 97
# has a _flag_mask_ of 1 << 97 and an _all_bits_ of 2**98 - 1 -- every bit
# position up to the highest one used, filled in.
#
# A non-flag enum has none of the three, because CPython only sets them under
# ``if issubclass(enum_class, Flag)``.  Answering 0 instead would quietly make
# every enum look like an empty flag.

from enum import Enum, Flag, IntFlag, KEEP

r = {}

BIG_MASK = 158456325028528675187087900672      # 1 << 97
BIG_ALL = 316912650057057350374175801343       # 2**98 - 1

# --- a custom __new__ that shifts, on each of the three flag shapes --------------


class FromCharInt(IntFlag):
    def __new__(cls, c):
        value = 1 << c
        self = int.__new__(cls, value)
        self._value_ = value
        return self

    a = ord('a')


r['int_flag'] = '%s;%s;%s;%s' % (
    FromCharInt._all_bits_ == BIG_ALL,
    FromCharInt._flag_mask_ == BIG_MASK,
    FromCharInt.a == BIG_MASK,
    (FromCharInt.a | 1) == BIG_MASK + 1)


class FromCharFlag(Flag):
    def __new__(cls, c):
        value = 1 << c
        self = object.__new__(cls)
        self._value_ = value
        return self

    a = ord('a')
    z = 1


r['plain_flag'] = '%s;%s;%s' % (
    FromCharFlag._all_bits_ == BIG_ALL,
    FromCharFlag._flag_mask_ == BIG_MASK + 2,
    (FromCharFlag.a | FromCharFlag.z).value == BIG_MASK + 2)

# ``class X(int, Flag, boundary=KEEP)`` -- an MI flag rooted on int, whose
# metaclass is neither Enum's nor IntEnum's.  It could not even record the
# boundary keyword: the emitted ___grailSetClassBoundary___: was a
# MessageNotUnderstood on its metaclass.


class FromCharMI(int, Flag, boundary=KEEP):
    def __new__(cls, c):
        value = 1 << c
        self = int.__new__(cls, value)
        self._value_ = value
        return self

    a = ord('a')


r['mi_flag'] = '%s;%s;%s;%s' % (
    FromCharMI._all_bits_ == BIG_ALL,
    FromCharMI._flag_mask_ == BIG_MASK,
    FromCharMI.a == BIG_MASK,
    (FromCharMI.a | 1) == BIG_MASK + 1)

# --- what each mask counts -------------------------------------------------------
#
# A multi-bit member belongs to _flag_mask_ but not to _singles_mask_, which is
# the space a STRICT/CONFORM flag inverts within.


class Masked(Flag):
    A = 1
    B = 2
    MASK = 255


r['masked'] = '%s/%s/%s' % (Masked._flag_mask_, Masked._singles_mask_,
                            Masked._all_bits_)


class Plain2(Flag):
    A = 1
    B = 2
    D = 8


r['gappy'] = '%s/%s/%s' % (Plain2._flag_mask_, Plain2._singles_mask_,
                           Plain2._all_bits_)

# --- a non-flag enum has none of them ---------------------------------------------

missing = []


class NotAFlag(Enum):
    a = 1
    b = 2


for attr in ('_all_bits_', '_flag_mask_', '_singles_mask_'):
    try:
        getattr(NotAFlag, attr)
        missing.append(attr + ':NOT RAISED')
    except AttributeError as e:
        missing.append(attr + ':' + str(e))

r['not_a_flag'] = ';'.join(missing)
