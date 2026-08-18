# A Flag class chooses how its UNNAMED bits read, via ``_numeric_repr_``.
#
# A KEEP-boundary flag keeps bits no member covers, and CPython renders that
# leftover through ``cls._numeric_repr_(unknown)`` -- NOT with str().  Flag
# declares ``_numeric_repr_ = repr`` and a class may override it; the stdlib
# itself does, in re:
#
#     class RegexFlag(boundary=KEEP): _numeric_repr_ = hex
#
# which is why CPython prints ``re.IGNORECASE|0x1000000`` and not
# ``re.IGNORECASE|16777216``.
#
# The name was already exempt from enum's reserved-_sunder_ check and from the
# class-body member scan, so a class could always SET it.  Nothing READ it:
# every leftover rendered through printString, i.e. always decimal.
#
# test_enum OldTestIntFlag.test_boundary is the neighbouring case; see the
# recorded gap at the bottom for the half of it this does not reach.

import enum
from enum import Flag, IntFlag, KEEP

r = {}


class Hexy(IntFlag, boundary=KEEP):
    _numeric_repr_ = hex
    A = 1
    B = 2


class Plain(IntFlag, boundary=KEEP):
    A = 1
    B = 2


class HexyFlag(Flag, boundary=KEEP):
    _numeric_repr_ = hex
    A = 1


# --- the override is honoured -------------------------------------------------
# 0x100 is a bit no member covers, so KEEP keeps it and it renders through
# _numeric_repr_.  The named part is unaffected either way.
r['hexy_repr'] = repr(Hexy(1 | 256))
r['hexy_name'] = repr(Hexy(1 | 256)._name_)
r['hexy_two_named_plus_leftover'] = repr(Hexy(1 | 2 | 256))

# A non-int Flag takes the same path -- the leftover is still an int, and the
# class still decides how it reads.
r['flag_hexy_repr'] = repr(HexyFlag(1 | 256))


# --- and the default is unchanged ---------------------------------------------
# CPython's default IS repr, which for an int is what Grail already printed, so
# a class that sets nothing must render exactly as before.
r['plain_repr'] = repr(Plain(1 | 256))
r['plain_two_named_plus_leftover'] = repr(Plain(1 | 2 | 256))

# No leftover at all -> no numeric piece, so _numeric_repr_ never runs.
r['hexy_fully_named'] = repr(Hexy(1 | 2))

# str() of an IntFlag member is the int, not the name -- unrelated to this, and
# asserted so a change to the name cannot quietly move it.
r['hexy_str'] = str(Hexy(1 | 256))


# --- KNOWN GAPS, recorded rather than endorsed --------------------------------
# 1. Flag does not EXPOSE the default. CPython answers <built-in function repr>
#    for a class that sets nothing; Grail has no such class attribute, so only
#    an explicit override is visible. The rendering is right either way -- this
#    is introspection of the default, not the default itself.
r['default_is_exposed'] = repr(getattr(Plain, '_numeric_repr_', '<missing>'))


# 2. A composite built from ANOTHER Flag class's member: the NAME half of this
#    is CLOSED (test_enum OldTestIntFlag.test_boundary now passes) and lives in
#    flag_cross_class_repr.py.  CPython's Flag arithmetic keeps whatever object
#    it was handed as _value_, so ``Simple.SINGLE | Iron.TWO`` has _value_
#    <Iron.ONE|TWO: 3> and the leftover -- ``value ^ combined`` through Iron's
#    own __xor__ -- is <Iron.TWO: 2>, which repr spells out in full.  Grail now
#    records the foreign CLASS and rebuilds a member of it to render the
#    leftover, so the name and repr agree with CPython.
#
#    What remains is _value_ ITSELF: Grail normalises it to a plain Smalltalk
#    integer, because that slot doubles as the int payload of an int-rooted
#    member.  Only the type is observable, and only through _value_.
class Simple(IntFlag, boundary=KEEP):
    SINGLE = 1


class Iron(IntFlag, boundary=enum.STRICT):
    ONE = 1
    TWO = 2
    EIGHT = 8


_cross = Simple.SINGLE | Iron.TWO
r['cross_class_value_type'] = type(_cross._value_).__name__
r['cross_class_name'] = repr(_cross._name_)


EXPECTED = {
    'cross_class_name': "'SINGLE|<Iron.TWO: 2>'",
    'flag_hexy_repr': "<HexyFlag.A|0x100: 257>",
    'hexy_fully_named': "<Hexy.A|B: 3>",
    'hexy_name': "'A|0x100'",
    'hexy_repr': "<Hexy.A|0x100: 257>",
    'hexy_str': '257',
    'hexy_two_named_plus_leftover': "<Hexy.A|B|0x100: 259>",
    'plain_repr': "<Plain.A|256: 257>",
    'plain_two_named_plus_leftover': "<Plain.A|B|256: 259>",
}

GRAIL_ONLY = {
    'cross_class_value_type': 'int',
    'default_is_exposed': "'<missing>'",
}


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-32s %s %s' % (k, 'OK ' if actual == EXPECTED[k] else 'DIFF', actual))
    for k in sorted(GRAIL_ONLY):
        actual = r[k]
        print('%-32s %s %s' % (k, 'XPASS' if actual == GRAIL_ONLY[k] else 'XFAIL', actual))
