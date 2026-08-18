# An IntFlag combined with a member of a DIFFERENT IntFlag class, and how the
# bits that neither class names come out.
#
#     class Simple(IntFlag, boundary=KEEP):
#         SINGLE = 1
#     class Iron(IntFlag, boundary=STRICT):
#         ONE = 1; TWO = 2; EIGHT = 8
#
#     Simple.SINGLE | Iron.TWO   ->   <Simple.SINGLE|<Iron.TWO: 2>: 3>
#
# The leftover is spelled out as an IRON member, not as the bare int 2, and the
# reason is CPython's _value_.  Flag.__or__ computes ``self.__class__(value |
# other)`` WITHOUT reducing other to an int -- IntFlag reaches it through its
# int member type -- so ``1 | Iron.TWO`` is an ordinary Python operation whose
# right operand is an int SUBCLASS, its __ror__ wins, and the answer is
# <Iron.ONE|TWO: 3>.  That Iron composite becomes the new member's _value_, so
# the leftover ``value ^ combined`` is computed THROUGH Iron and comes back as
# <Iron.TWO: 2>.
#
# Only IntFlag can get here: plain Flag.__or__ answers NotImplemented for an
# operand that is not an instance of its own class, so ``S.A | I.TWO`` on plain
# Flags is a TypeError in CPython and in Grail alike (checked below).
#
# Grail cannot store that _value_: an int-rooted member's value slot doubles as
# its int payload, so it must hold a plain Integer.  It records the foreign
# CLASS instead, which is the only thing the naming path needs, and rebuilds a
# member of it to render the leftover.  The remaining difference -- what
# ``_value_'' itself answers -- is the GRAIL_ONLY entry at the bottom.
#
# test_enum OldTestIntFlag.test_boundary is the upstream case.

from enum import Flag, IntFlag, KEEP, STRICT

r = {}


class Simple(IntFlag, boundary=KEEP):
    SINGLE = 1


class Iron(IntFlag, boundary=STRICT):
    ONE = 1
    TWO = 2
    EIGHT = 8


simple = Simple.SINGLE | Iron.TWO

r['repr'] = repr(simple)
r['name'] = simple._name_
r['str'] = str(simple)
r['equals_three'] = simple == 3
r['is_a_simple'] = isinstance(simple, Simple)
r['value_int'] = int(simple)
# The one thing Grail cannot reproduce: CPython's _value_ IS an Iron composite.
r['value_type'] = type(simple._value_).__name__


# The rendering CLASS is still the receiver's own -- CPython calls
# cls._numeric_repr_(unknown), so a class that chooses a spelling keeps it and
# only the ARGUMENT comes from the other enum.  hex() of an Iron member is the
# hex of its int value.
class Hexy(IntFlag, boundary=KEEP):
    _numeric_repr_ = hex
    A = 1


r['hexy_cross_class'] = repr(Hexy.A | Iron.TWO)


# A leftover the foreign class cannot represent falls back to the bare int.
# Iron is STRICT and names no bit 16, so there is no Iron member to show.
r['unnameable_leftover'] = repr(Simple.SINGLE | 16)


# Same-class combination is untouched: no foreign class, so no change at all.
r['same_class'] = repr(Iron.ONE | Iron.TWO)
r['same_class_keep_leftover'] = repr(Simple.SINGLE | 4)


# Plain Flag refuses BOTH a cross-class member and a bare int: its
# _member_type_ is object, so CPython's Flag.__or__ takes neither of its two
# admissible branches and answers NotImplemented.  The MEMBER TYPE is the whole
# rule, and it is what separates this from the IntFlag case above -- an IntFlag
# reaches an operand through its int member type, which is exactly why the
# cross-class combination at the top of this file is legal at all.
#
# ``in'' goes through the same rule, and names the types in the order it
# evaluates them: the contained object first.
class PlainA(Flag, boundary=KEEP):
    A = 1


class PlainB(Flag, boundary=STRICT):
    ONE = 1
    TWO = 2


def _err(fn):
    try:
        return repr(fn())
    except TypeError as e:
        return 'TypeError: %s' % e


r['plain_flag_cross_class'] = _err(lambda: PlainA.A | PlainB.TWO)
r['plain_flag_with_int'] = _err(lambda: PlainA.A | 2)
r['plain_flag_and'] = _err(lambda: PlainA.A & PlainB.TWO)
r['plain_flag_xor'] = _err(lambda: PlainA.A ^ PlainB.TWO)
r['plain_flag_contains_foreign'] = _err(lambda: PlainB.ONE in PlainA.A)
r['plain_flag_contains_int'] = _err(lambda: 1 in PlainA.A)
r['plain_flag_contains_own'] = _err(lambda: PlainA.A in PlainA.A)


# A flag WITH a data mixin keeps every one of those: its member type is int.
class MixedIn(int, Flag):
    X = 1
    Y = 2


r['mixed_in_with_int'] = _err(lambda: MixedIn.X | 2)
r['mixed_in_same_class'] = _err(lambda: MixedIn.X | MixedIn.Y)


EXPECTED = {
    'equals_three': 'True',
    'hexy_cross_class': "'<Hexy.A|0x2: 3>'",
    'is_a_simple': 'True',
    'name': "'SINGLE|<Iron.TWO: 2>'",
    'repr': "'<Simple.SINGLE|<Iron.TWO: 2>: 3>'",
    'same_class': "'<Iron.ONE|TWO: 3>'",
    'mixed_in_same_class': '\'<MixedIn.X|Y: 3>\'',
    'mixed_in_with_int': '\'<MixedIn.X|Y: 3>\'',
    'plain_flag_and': '"TypeError: unsupported operand type(s) for &: \'PlainA\' and \'PlainB\'"',
    'plain_flag_contains_foreign': '"TypeError: unsupported operand type(s) for \'in\': \'PlainB\' and \'PlainA\'"',
    'plain_flag_contains_int': '"TypeError: unsupported operand type(s) for \'in\': \'int\' and \'PlainA\'"',
    'plain_flag_contains_own': "'True'",
    'plain_flag_cross_class': '"TypeError: unsupported operand type(s) for |: \'PlainA\' and \'PlainB\'"',
    'plain_flag_with_int': '"TypeError: unsupported operand type(s) for |: \'PlainA\' and \'int\'"',
    'plain_flag_xor': '"TypeError: unsupported operand type(s) for ^: \'PlainA\' and \'PlainB\'"',
    'same_class_keep_leftover': "'<Simple.SINGLE|4: 5>'",
    'str': "'3'",
    'unnameable_leftover': "'<Simple.SINGLE|16: 17>'",
    'value_int': '3',
}

GRAIL_ONLY = {
    # CPython: 'Iron' -- _value_ holds the foreign composite itself.  Grail's
    # int-rooted member keeps a plain Integer there (its int payload lives in
    # the same slot) and records the foreign CLASS separately, which is all the
    # naming path above needs.
    'value_type': "'int'",
}


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = repr(r[k])
        print('%-28s %s %s' % (k, 'OK ' if actual == EXPECTED[k] else 'DIFF', actual))
    for k in sorted(GRAIL_ONLY):
        actual = repr(r[k])
        print('%-28s %s %s' % (k, 'XPASS' if actual == GRAIL_ONLY[k] else 'XFAIL', actual))
