# ``@verify(NAMED_FLAGS)`` -- raise when an ALIAS carries a bit that no NAMED
# member covers (CPython enum.verify NAMED_FLAGS).  Grail accepted every such
# class: the check was stubbed advisory, returning the class unchanged.
#
#     @verify(NAMED_FLAGS)
#     class Bizarre(Flag):
#         b = 3
#         c = 4
#         d = 6
#
# Only c is named -- b and d are multi-bit, so they are aliases -- and between
# them they need bits 1 and 2, which nothing names:
#
#     invalid Flag 'Bizarre': aliases b and d are missing combined values of
#     0x3 [use enum.show_flag_values(value) for details]
#
# The bits accumulate across all offending aliases into one number, reported as
# ``value 0x%x`` when it is a single bit and ``combined values of 0x%x`` when it
# is several.  enum.show_flag_values -- the function the message points at --
# arrives with it.
#
# test_enum TestVerify.test_composite.

import enum
from enum import Enum, Flag, IntFlag, verify, NAMED_FLAGS, UNIQUE

r = {}

# --- show_flag_values ------------------------------------------------------------

r['show_3'] = repr(enum.show_flag_values(3))
r['show_2'] = repr(enum.show_flag_values(2))
r['show_0'] = repr(enum.show_flag_values(0))
r['show_13'] = repr(enum.show_flag_values(13))


class Bits(Flag):
    one = 1
    two = 2


# A member decomposes by its value.
r['show_member'] = repr(enum.show_flag_values(Bits.one | Bits.two))

try:
    enum.show_flag_values(-1)
    r['show_negative'] = 'NOT RAISED'
except ValueError as e:
    r['show_negative'] = str(e)

# --- the two shapes test_composite pins -----------------------------------------

try:
    @verify(NAMED_FLAGS)
    class Bizarre(Flag):
        b = 3
        c = 4
        d = 6
    r['combined'] = 'NOT RAISED'
except ValueError as e:
    r['combined'] = str(e)

try:
    @verify(NAMED_FLAGS)
    class Bizarre(IntFlag):
        c = 4
        d = 6
    r['single'] = 'NOT RAISED'
except ValueError as e:
    r['single'] = str(e)

# Unverified, the same classes are legal -- the members and their values are
# unchanged, which is what the check is checking, not repairing.


class Unverified(Flag):
    b = 3
    c = 4
    d = 6


r['unverified'] = '%s;%s;%s;%s' % (list(Unverified), Unverified.b.value,
                                   Unverified.c.value, Unverified.d.value)

# --- classes that pass ----------------------------------------------------------


@verify(NAMED_FLAGS)
class Fine(Flag):
    a = 1
    b = 2
    ab = 3


r['fine'] = '%s;%s' % (list(Fine), Fine.ab.value)


@verify(NAMED_FLAGS)
class NoAliases(Flag):
    a = 1
    b = 2


r['no_aliases'] = repr(list(NoAliases))

# A plain Enum has no bits to check, so NAMED_FLAGS says nothing about it.


@verify(NAMED_FLAGS)
class Plain(Enum):
    one = 1
    three = 3


r['plain_enum'] = repr(list(Plain))

# --- alongside the other checks --------------------------------------------------
#
# verify() takes several, and each is applied.


@verify(UNIQUE, NAMED_FLAGS)
class Both(Flag):
    a = 1
    b = 2
    ab = 3


r['both_ok'] = repr(list(Both))

try:
    @verify(UNIQUE, NAMED_FLAGS)
    class BothBad(Flag):
        a = 1
        dupe = 1
    r['both_unique'] = 'NOT RAISED'
except ValueError as e:
    r['both_unique'] = str(e)
