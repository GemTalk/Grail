# ``auto()`` resolved AS IT IS ASSIGNED, which is where CPython resolves it.
#
# CPython's _EnumDict.__setitem__ fills in the marker's ``value`` slot the moment
# the member is written, so the rest of the class body sees a number:
#
#     class Example(Flag):
#         A = auto()
#         B = auto()
#         ALL = nonmember(A | B)          # 3
#
# Grail resolved every marker in a LATER pass over the finished class, so ``A |
# B'' here saw two unresolved markers and the operator failed.  An enum body now
# runs against an EnumDict namespace (see class_body_namespace.py), which is what
# makes assignment-time resolution possible at all.
#
# test_enum TestSpecial.test_using_members_as_nonmember.

import enum
from enum import Enum, Flag, StrEnum, auto, nonmember

r = {}

# --- the body sees the number ------------------------------------------------------


class Example(Flag):
    A = auto()
    B = auto()
    ALL = nonmember(A | B)


r['flag_values'] = '%d,%d' % (Example.A.value, Example.B.value)
r['flag_all'] = '%r/%s' % (Example.ALL, type(Example.ALL).__name__)

# Not only Flag, and not only in a nonmember: an ordinary member computed from
# one already written is just as much a read of the resolved value.


class Counting(Enum):
    FIRST = auto()
    SECOND = auto()
    DOUBLE = SECOND * 2


r['counting'] = '%d,%d,%d' % (Counting.FIRST.value, Counting.SECOND.value,
                              Counting.DOUBLE.value)

# --- resolution does not change any VALUE ------------------------------------------
# The numbers are chosen by the same rule as before -- a user _generate_next_value_
# first, else the lowercased name for a StrEnum, else the next power of two for a
# Flag and the next integer for a plain enum.  Only WHEN they are chosen moved.


class Plain(Enum):
    A = auto()
    B = 10
    C = auto()


r['plain'] = '%d,%d,%d' % (Plain.A.value, Plain.B.value, Plain.C.value)


class Bits(Flag):
    A = auto()
    B = auto()
    C = auto()


r['bits'] = '%d,%d,%d' % (Bits.A.value, Bits.B.value, Bits.C.value)


class Named(StrEnum):
    RED = auto()
    GREEN = auto()


r['strenum'] = '%s,%s' % (Named.RED.value, Named.GREEN.value)


class Generated(Enum):
    def _generate_next_value_(name, start, count, last_values):
        return name.lower() + '!'

    A = auto()
    B = auto()


r['gnv'] = '%s,%s' % (Generated.A.value, Generated.B.value)

# A tuple of markers advances the generator element by element, and the tuple
# itself never counts as a last value.


class Tupled(Enum):
    ONE = auto(), 'first'
    TWO = auto(), 'second'


r['tupled'] = '%r,%r' % (Tupled.ONE.value, Tupled.TWO.value)

# --- the marker is MUTATED, which is what makes an alias an alias ------------------
# CPython writes the generated number back into the marker (``v.value = ...''),
# so the SAME marker object bound to a second name answers a value and nothing is
# generated for it.  Without that, the second binding would call the generator
# again and the two names would end up distinct members.

third = auto()


class Aliased(Enum):
    a = 1
    b = 2
    c = third
    dupe = third


r['alias_is_alias'] = repr(Aliased.dupe is Aliased.c)
r['alias_value'] = repr(Aliased.dupe.value)

# --- an auto() whose value was set OUTSIDE the body is used verbatim ---------------
# CPython's ``if v.value == _auto_null'' -- a preset marker skips the generator
# entirely, and so does not count as having called it.

weird = auto()
weird.value = 'pathological case'


class Weird(Enum):
    red = weird

    def _generate_next_value_(name, start, count, last_values):
        return 'generated'

    blue = auto()


r['preset'] = '%r,%r' % (Weird.red.value, Weird.blue.value)

# --- and that is the distinction the ordering rule turns on ------------------------
# A class-body ``def _generate_next_value_'' must come BEFORE any member that
# needs generating, because CPython would already have numbered that member by
# the default rule.  Weird above is legal for exactly the reason this is not:
# red's value was supplied outside the body, red's was not.

try:
    class TooLate(Enum):
        red = auto()
        green = auto()

        def _generate_next_value_(name, start, count, last_values):
            return 'generated'
    r['too_late'] = 'NOT RAISED'
except TypeError as e:
    r['too_late'] = str(e)

# --- paths with no namespace still resolve in the later pass -----------------------
# The functional API builds no class body, so nothing routes through EnumDict and
# the builder's own resolution is what numbers these.  Both spellings must agree.

Functional = Enum('Functional', {'A': auto(), 'B': auto()})
r['functional'] = '%d,%d' % (Functional.A.value, Functional.B.value)

# --- a NAMEDTUPLE carrying markers is left to the builder --------------------------
# Recorded, not endorsed: the namespace resolves a bare marker and a plain tuple
# of markers, but a namedtuple value is unwrapped and rebuilt by
# ___grailBuildMembers:, and duplicating that here would put one rule in two
# places.  Such a member is numbered correctly, just not at assignment.

from collections import namedtuple

T = namedtuple('T', 'index desc')


class Songs(Enum):
    first = T(auto(), 'for the money')
    second = T(auto(), 'for the show')


r['namedtuple'] = '%d,%d' % (Songs.first.value.index, Songs.second.value.index)
