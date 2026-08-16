# ``_ignore_`` names the class-body scaffolding an enum builds its real members
# WITH, and CPython leaves no trace of it:
#
#     class Period(timedelta, Enum):
#         _ignore_ = 'Period i'
#         Period = vars()
#         for i in range(32):
#             Period['day_%d' % i] = i, 'day'
#
# Two halves, and Grail had neither working.
#
#   1. _EnumDict.__setitem__ records the list so those names are skipped rather
#      than becoming members.  Grail parsed the list into a LOCAL and never
#      stored it, so ``_ignore`` kept the empty collection its lazy default had
#      installed -- every ignored name went on being treated as an ordinary
#      binding, and a loop reusing one raised ``'i' already defined as 0`` on
#      its second iteration.
#   2. EnumType.__new__ then POPS each ignored key (and ``_ignore_`` itself) out
#      of the class dict.  Grail had no equivalent at all, so the names survived
#      as class attributes.
#
# The list is read back off the CLASS rather than out of the EnumDict, because a
# MIXIN enum never gets an EnumDict: __prepare__ reaches a class through its
# metaclass, resolved along the Smalltalk superclass chain, and ``class I(int,
# Enum)`` is rooted at Grail's int -- that chain never passes Enum.  Taking the
# list from the namespace made _ignore_ work on a plain Enum and silently do
# nothing on every mixin.
#
# test_enum TestSpecial.test_ignore.

from datetime import timedelta
from enum import Enum, IntEnum

r = {}


# --- the names are gone from the finished class -------------------------------------


class Plain(Enum):
    _ignore_ = 'helper counter'
    helper = 'scaffolding'
    counter = 0
    RED = 1
    GREEN = 2


r['ignored_names_absent'] = repr(
    [hasattr(Plain, n) for n in ('helper', 'counter', '_ignore_')])
r['real_members_survive'] = repr([m.name for m in Plain])

# --- COMMAS separate, as CPython's value.replace(',',' ').split() -------------------
# Splitting first and stripping commas afterwards turned ``'a,b'`` into the one
# name ``ab``, so neither was ignored.


class Commas(Enum):
    _ignore_ = 'a,b, c'
    a = 1
    b = 2
    c = 3
    KEPT = 4


r['comma_separated'] = repr([hasattr(Commas, n) for n in ('a', 'b', 'c')])
r['comma_kept'] = repr([m.name for m in Commas])

# A LIST is accepted as well as a string -- CPython's ``list(value)`` branch.


class Listed(Enum):
    _ignore_ = ['x', 'y']
    x = 1
    y = 2
    KEPT = 3


r['list_form'] = repr([hasattr(Listed, n) for n in ('x', 'y')])
r['list_kept'] = repr([m.name for m in Listed])

# --- MIXIN enums get the same treatment ---------------------------------------------
# These are the ones that silently did nothing while the list lived in the
# EnumDict: neither an int- nor a str-mixin enum has one.


class IntMixin(int, Enum):
    _ignore_ = 'junk'
    junk = 99
    ONE = 1


class StrMixin(str, Enum):
    _ignore_ = 'junk'
    junk = 'nope'
    A = 'a'


class IntEnumSub(IntEnum):
    _ignore_ = 'junk'
    junk = 99
    ONE = 1


r['mixin_int'] = repr(hasattr(IntMixin, 'junk'))
r['mixin_str'] = repr(hasattr(StrMixin, 'junk'))
r['mixin_intenum'] = repr(hasattr(IntEnumSub, 'junk'))

# --- a name that is ALREADY a member cannot be un-made into one ----------------------

try:
    class TooLate(Enum):
        RED = 1
        _ignore_ = 'RED'
    r['already_set'] = 'NOT RAISED'
except ValueError as e:
    r['already_set'] = 'ValueError'

# --- the whole upstream shape -------------------------------------------------------
# The scaffolding builds 97 members through a namespace the loop writes into,
# and the last three read back names no statement in the body ever mentions.
# Every layer of this file meets here: the class body has to run in source order
# for ``OneDay = day_1`` to see the loop's work (see
# tests/python/class_body_source_order.py), ``_ignore_`` has to keep ``Period``
# and ``i`` out of the members, ``timedelta.__new__(cls, value)`` -- the form
# CPython REQUIRES a mixed enum's __new__ to use -- has to answer an instance of
# cls, and month_1/day_30 have to alias because __new__ gave both _value_ == 30.


class Period(timedelta, Enum):
    "different lengths of time"

    def __new__(cls, value, period):
        obj = timedelta.__new__(cls, value)
        obj._value_ = value
        obj.period = period
        return obj

    _ignore_ = 'Period i'
    Period = vars()
    for i in range(13):
        Period['month_%d' % i] = i * 30, 'month'
    for i in range(53):
        Period['week_%d' % i] = i * 7, 'week'
    for i in range(32):
        Period['day_%d' % i] = i, 'day'
    OneDay = day_1
    OneWeek = week_1
    OneMonth = month_1


r['period_scaffolding_gone'] = repr(
    [hasattr(Period, n) for n in ('_ignore_', 'Period', 'i')])
r['period_is_timedelta'] = repr(isinstance(Period.day_1, timedelta))
r['period_read_back'] = repr(
    [Period.OneDay is Period.day_1,
     Period.OneWeek is Period.week_1,
     Period.OneMonth is Period.month_1])
# Equal _value_ means one member under two names, which is what makes the
# alias test have to run on the value __new__ actually produced.
r['period_aliases'] = repr(
    [Period.month_1 is Period.day_30, Period.week_4 is Period.day_28])
r['period_user_slot'] = repr(Period.day_1.period)

# KNOWN GAP, recorded rather than endorsed.  The member IS a timedelta and
# carries a timedelta's state, but timedelta's own ACCESSORS do not reach it:
# ``class Period(timedelta, Enum)`` is rooted at Enum on the Smalltalk chain
# with timedelta merged as a secondary base, and that merge does not bring the
# accessors down.  CPython answers 1 / 0 / 86400.0 for these.  Not what
# test_ignore checks, and not made worse by anything here -- before this the
# member was not a timedelta at all -- but it is the next thing a mixed-in
# timedelta enum will want.
_accessors = []
for _probe in ('days', 'seconds', 'total_seconds'):
    try:
        getattr(Period.day_1, _probe)
        _accessors.append(True)
    except AttributeError:
        _accessors.append(False)
r['mixin_accessors_reach_the_member'] = repr(_accessors)


# What CPython 3.14 answers, measured rather than assumed.
EXPECTED = {
    'already_set': 'ValueError',
    'comma_kept': "['KEPT']",
    'comma_separated': '[False, False, False]',
    'ignored_names_absent': '[False, False, False]',
    'list_form': '[False, False]',
    'list_kept': "['KEPT']",
    'mixin_int': 'False',
    'mixin_intenum': 'False',
    'mixin_str': 'False',
    'period_aliases': '[True, True]',
    'period_is_timedelta': 'True',
    'period_read_back': '[True, True, True]',
    'period_scaffolding_gone': '[False, False, False]',
    'period_user_slot': "'day'",
    'real_members_survive': "['RED', 'GREEN']",
}

# The one check that documents a GRAIL limitation: CPython reaches all three
# accessors, so it must DISAGREE with what Grail answers here.  If it ever
# agrees, the gap has closed and this check is stale (the gate calls that XPASS
# and fails).
GRAIL_ONLY = {'mixin_accessors_reach_the_member': '[False, False, False]'}


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-34s %s %s' % (k, 'OK ' if actual == EXPECTED[k] else 'DIFF', actual))
    for k in sorted(GRAIL_ONLY):
        actual = r[k]
        print('%-34s %s %s' % (k, 'XPASS' if actual == GRAIL_ONLY[k] else 'XFAIL', actual))
