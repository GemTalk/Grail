"""Test the datetime module — GRAIL-TRIMMED subset of CPython 3.14's
datetimetester.  Kept: TestModule, TestTZInfo, TestTimeZone,
TestTimeDelta, TestDateOnly, TestDate.  Still omitted (per-import compile
budget): the very large TestDateTime/TestTime/TZ-conversion classes.
Runs against Grail's native datetime.

Grail adaptations: trimmed imports; local LARGEST/SMALLEST sentinels
(absent from Grail's test.support); lone-surrogate string literals
neutralized (Grail cannot compile them)."""
import copy
import pickle
import random
import re
import sys
import unittest
import warnings

import time as _time

from operator import lt, le, gt, ge, eq, ne, truediv, floordiv, mod

from test import support
from test.support import is_resource_enabled, ALWAYS_EQ
from test.support import warnings_helper

import _pydatetime
import datetime as datetime_module
from datetime import MINYEAR, MAXYEAR
from datetime import timedelta
from datetime import tzinfo
from datetime import time
from datetime import timezone
from datetime import date, datetime
try:
    from datetime import UTC
except ImportError:
    UTC = timezone.utc


# GRAIL: test.support lacks these ordering sentinels; define them locally
# (verbatim behavior from CPython's test.support).
class _Largest:
    def __eq__(self, other): return self is other
    def __lt__(self, other): return False
    def __le__(self, other): return self is other
    def __gt__(self, other): return self is not other
    def __ge__(self, other): return True
LARGEST = _Largest()

class _Smallest:
    def __eq__(self, other): return self is other
    def __lt__(self, other): return self is not other
    def __le__(self, other): return True
    def __gt__(self, other): return False
    def __ge__(self, other): return self is other
SMALLEST = _Smallest()


pickle_choices = [(pickle, pickle, proto)
                  for proto in range(pickle.HIGHEST_PROTOCOL + 1)]

# GRAIL: CPython uses {pickle.loads, pickle._loads} to test both the C and
# pure-Python unpicklers; Grail has one pickle, so just the one loads.
pickle_loads = {pickle.loads}

EPOCH_NAIVE = datetime(1970, 1, 1, 0, 0)
OTHERSTUFF = (10, 34.5, "abc", {}, [], ())
INF = float("inf")
NAN = float("nan")

# GRAIL: these module constants live near the (omitted) TZ-conversion tests
# in CPython's file; the retained TestTZInfo/TestTimeZone methods use them.
ZERO = timedelta(0)
MINUTE = timedelta(minutes=1)
HOUR = timedelta(hours=1)
DAY = timedelta(days=1)

# GRAIL: USTimeZone/Eastern (a DST-aware tzinfo fixture) also lives near the
# omitted TZ-conversion tests but is referenced by TestTimeZone.test_fromutc,
# which IS retained -- ported verbatim from CPython's datetimetester.py.
DSTSTART = datetime(1, 4, 1, 2)
DSTEND = datetime(1, 10, 25, 1)


def first_sunday_on_or_after(dt):
    days_to_go = 6 - dt.weekday()
    if days_to_go:
        dt += timedelta(days_to_go)
    return dt


class USTimeZone(tzinfo):

    def __init__(self, hours, reprname, stdname, dstname):
        self.stdoffset = timedelta(hours=hours)
        self.reprname = reprname
        self.stdname = stdname
        self.dstname = dstname

    def __repr__(self):
        return self.reprname

    def tzname(self, dt):
        if self.dst(dt):
            return self.dstname
        else:
            return self.stdname

    def utcoffset(self, dt):
        return self.stdoffset + self.dst(dt)

    def dst(self, dt):
        if dt is None or dt.tzinfo is None:
            return ZERO
        assert dt.tzinfo is self

        start = first_sunday_on_or_after(DSTSTART.replace(year=dt.year))
        end = first_sunday_on_or_after(DSTEND.replace(year=dt.year))

        if start <= dt.replace(tzinfo=None) < end:
            return HOUR
        else:
            return ZERO


Eastern = USTimeZone(-5, "Eastern", "EST", "EDT")


class TestModule(unittest.TestCase):

    def test_constants(self):
        datetime = datetime_module
        self.assertEqual(datetime.MINYEAR, 1)
        self.assertEqual(datetime.MAXYEAR, 9999)

    def test_utc_alias(self):
        self.assertIs(UTC, timezone.utc)

    def test_all(self):
        """Test that __all__ only points to valid attributes."""
        all_attrs = dir(datetime_module)
        for attr in datetime_module.__all__:
            self.assertIn(attr, all_attrs)

    def test_name_cleanup(self):
        if '_Pure' in self.__class__.__name__:
            self.skipTest('Only run for Fast C implementation')

        datetime = datetime_module
        names = set(name for name in dir(datetime)
                    if not name.startswith('__') and not name.endswith('__'))
        allowed = set(['MAXYEAR', 'MINYEAR', 'date', 'datetime',
                       'datetime_CAPI', 'time', 'timedelta', 'timezone',
                       'tzinfo', 'UTC', 'sys'])
        self.assertEqual(names - allowed, set([]))

    def test_divide_and_round(self):
        if '_Fast' in self.__class__.__name__:
            self.skipTest('Only run for Pure Python implementation')

        dar = _pydatetime._divide_and_round

        self.assertEqual(dar(-10, -3), 3)
        self.assertEqual(dar(5, -2), -2)

        # four cases: (2 signs of a) x (2 signs of b)
        self.assertEqual(dar(7, 3), 2)
        self.assertEqual(dar(-7, 3), -2)
        self.assertEqual(dar(7, -3), -2)
        self.assertEqual(dar(-7, -3), 2)

        # ties to even - eight cases:
        # (2 signs of a) x (2 signs of b) x (even / odd quotient)
        self.assertEqual(dar(10, 4), 2)
        self.assertEqual(dar(-10, 4), -2)
        self.assertEqual(dar(10, -4), -2)
        self.assertEqual(dar(-10, -4), 2)

        self.assertEqual(dar(6, 4), 2)
        self.assertEqual(dar(-6, 4), -2)
        self.assertEqual(dar(6, -4), -2)
        self.assertEqual(dar(-6, -4), 2)


#############################################################################
# tzinfo tests

class FixedOffset(tzinfo):

    def __init__(self, offset, name, dstoffset=42):
        if isinstance(offset, int):
            offset = timedelta(minutes=offset)
        if isinstance(dstoffset, int):
            dstoffset = timedelta(minutes=dstoffset)
        self.__offset = offset
        self.__name = name
        self.__dstoffset = dstoffset
    def __repr__(self):
        return self.__name.lower()
    def utcoffset(self, dt):
        return self.__offset
    def tzname(self, dt):
        return self.__name
    def dst(self, dt):
        return self.__dstoffset

class PicklableFixedOffset(FixedOffset):

    def __init__(self, offset=None, name=None, dstoffset=None):
        FixedOffset.__init__(self, offset, name, dstoffset)

class PicklableFixedOffsetWithSlots(PicklableFixedOffset):
    __slots__ = '_FixedOffset__offset', '_FixedOffset__name', 'spam'

class _TZInfo(tzinfo):
    def utcoffset(self, datetime_module):
        return random.random()

class TestTZInfo(unittest.TestCase):

    def test_refcnt_crash_bug_22044(self):
        tz1 = _TZInfo()
        dt1 = datetime(2014, 7, 21, 11, 32, 3, 0, tz1)
        with self.assertRaises(TypeError):
            dt1.utcoffset()

    def test_non_abstractness(self):
        # In order to allow subclasses to get pickled, the C implementation
        # wasn't able to get away with having __init__ raise
        # NotImplementedError.
        useless = tzinfo()
        dt = datetime.max
        self.assertRaises(NotImplementedError, useless.tzname, dt)
        self.assertRaises(NotImplementedError, useless.utcoffset, dt)
        self.assertRaises(NotImplementedError, useless.dst, dt)

    def test_subclass_must_override(self):
        class NotEnough(tzinfo):
            def __init__(self, offset, name):
                self.__offset = offset
                self.__name = name
        self.assertIsSubclass(NotEnough, tzinfo)
        ne = NotEnough(3, "NotByALongShot")
        self.assertIsInstance(ne, tzinfo)

        dt = datetime.now()
        self.assertRaises(NotImplementedError, ne.tzname, dt)
        self.assertRaises(NotImplementedError, ne.utcoffset, dt)
        self.assertRaises(NotImplementedError, ne.dst, dt)

    def test_normal(self):
        fo = FixedOffset(3, "Three")
        self.assertIsInstance(fo, tzinfo)
        for dt in datetime.now(), None:
            self.assertEqual(fo.utcoffset(dt), timedelta(minutes=3))
            self.assertEqual(fo.tzname(dt), "Three")
            self.assertEqual(fo.dst(dt), timedelta(minutes=42))

    def test_pickling_base(self):
        # There's no point to pickling tzinfo objects on their own (they
        # carry no data), but they need to be picklable anyway else
        # concrete subclasses can't be pickled.
        orig = tzinfo.__new__(tzinfo)
        self.assertIs(type(orig), tzinfo)
        for pickler, unpickler, proto in pickle_choices:
            green = pickler.dumps(orig, proto)
            derived = unpickler.loads(green)
            self.assertIs(type(derived), tzinfo)

    def test_pickling_subclass(self):
        # Make sure we can pickle/unpickle an instance of a subclass.
        offset = timedelta(minutes=-300)
        for otype, args in [
            (PicklableFixedOffset, (offset, 'cookie')),
            (PicklableFixedOffsetWithSlots, (offset, 'cookie')),
            (timezone, (offset,)),
            (timezone, (offset, "EST"))]:
            orig = otype(*args)
            oname = orig.tzname(None)
            self.assertIsInstance(orig, tzinfo)
            self.assertIs(type(orig), otype)
            self.assertEqual(orig.utcoffset(None), offset)
            self.assertEqual(orig.tzname(None), oname)
            for pickler, unpickler, proto in pickle_choices:
                green = pickler.dumps(orig, proto)
                derived = unpickler.loads(green)
                self.assertIsInstance(derived, tzinfo)
                self.assertIs(type(derived), otype)
                self.assertEqual(derived.utcoffset(None), offset)
                self.assertEqual(derived.tzname(None), oname)
                self.assertNotHasAttr(derived, 'spam')

    def test_issue23600(self):
        DSTDIFF = DSTOFFSET = timedelta(hours=1)

        class UKSummerTime(tzinfo):
            """Simple time zone which pretends to always be in summer time, since
                that's what shows the failure.
            """

            def utcoffset(self, dt):
                return DSTOFFSET

            def dst(self, dt):
                return DSTDIFF

            def tzname(self, dt):
                return 'UKSummerTime'

        tz = UKSummerTime()
        u = datetime(2014, 4, 26, 12, 1, tzinfo=tz)
        t = tz.fromutc(u)
        self.assertEqual(t - t.utcoffset(), u)


class TestTimeZone(unittest.TestCase):

    def setUp(self):
        self.ACDT = timezone(timedelta(hours=9.5), 'ACDT')
        self.EST = timezone(-timedelta(hours=5), 'EST')
        self.DT = datetime(2010, 1, 1)

    def test_str(self):
        for tz in [self.ACDT, self.EST, timezone.utc,
                   timezone.min, timezone.max]:
            self.assertEqual(str(tz), tz.tzname(None))

    def test_repr(self):
        datetime = datetime_module
        # Grail: bare eval() does not capture the caller's globals/locals
        # (see test_roundtrip); build an explicit scope carrying the local
        # `datetime` rebind above (real CPython's eval() sees locals too).
        evalScope = dict(globals())
        evalScope['datetime'] = datetime
        for tz in [self.ACDT, self.EST, timezone.utc,
                   timezone.min, timezone.max]:
            # test round-trip
            tzrep = repr(tz)
            self.assertEqual(tz, eval(tzrep, evalScope))

    def test_class_members(self):
        limit = timedelta(hours=23, minutes=59)
        self.assertEqual(timezone.utc.utcoffset(None), ZERO)
        self.assertEqual(timezone.min.utcoffset(None), -limit)
        self.assertEqual(timezone.max.utcoffset(None), limit)

    def test_constructor(self):
        self.assertIs(timezone.utc, timezone(timedelta(0)))
        self.assertIsNot(timezone.utc, timezone(timedelta(0), 'UTC'))
        self.assertEqual(timezone.utc, timezone(timedelta(0), 'UTC'))
        for subminute in [timedelta(microseconds=1), timedelta(seconds=1)]:
            tz = timezone(subminute)
            self.assertNotEqual(tz.utcoffset(None) % timedelta(minutes=1), 0)
        # invalid offsets
        for invalid in [timedelta(1, 1), timedelta(1)]:
            self.assertRaises(ValueError, timezone, invalid)
            self.assertRaises(ValueError, timezone, -invalid)

        with self.assertRaises(TypeError): timezone(None)
        with self.assertRaises(TypeError): timezone(42)
        with self.assertRaises(TypeError): timezone(ZERO, None)
        with self.assertRaises(TypeError): timezone(ZERO, 42)
        with self.assertRaises(TypeError): timezone(ZERO, 'ABC', 'extra')

    def test_inheritance(self):
        self.assertIsInstance(timezone.utc, tzinfo)
        self.assertIsInstance(self.EST, tzinfo)

    def test_cannot_subclass(self):
        with self.assertRaises(TypeError):
            class MyTimezone(timezone): pass

    def test_utcoffset(self):
        dummy = self.DT
        for h in [0, 1.5, 12]:
            offset = h * HOUR
            self.assertEqual(offset, timezone(offset).utcoffset(dummy))
            self.assertEqual(-offset, timezone(-offset).utcoffset(dummy))

        with self.assertRaises(TypeError): self.EST.utcoffset('')
        with self.assertRaises(TypeError): self.EST.utcoffset(5)


    def test_dst(self):
        self.assertIsNone(timezone.utc.dst(self.DT))

        with self.assertRaises(TypeError): self.EST.dst('')
        with self.assertRaises(TypeError): self.EST.dst(5)

    def test_tzname(self):
        self.assertEqual('UTC', timezone.utc.tzname(None))
        self.assertEqual('UTC', UTC.tzname(None))
        self.assertEqual('UTC', timezone(ZERO).tzname(None))
        self.assertEqual('UTC-05:00', timezone(-5 * HOUR).tzname(None))
        self.assertEqual('UTC+09:30', timezone(9.5 * HOUR).tzname(None))
        self.assertEqual('UTC-00:01', timezone(timedelta(minutes=-1)).tzname(None))
        self.assertEqual('XYZ', timezone(-5 * HOUR, 'XYZ').tzname(None))
        # bpo-34482: Check that surrogates are handled properly.
        self.assertEqual('\u0800', timezone(ZERO, '\u0800').tzname(None))

        # Sub-minute offsets:
        self.assertEqual('UTC+01:06:40', timezone(timedelta(0, 4000)).tzname(None))
        self.assertEqual('UTC-01:06:40',
                         timezone(-timedelta(0, 4000)).tzname(None))
        self.assertEqual('UTC+01:06:40.000001',
                         timezone(timedelta(0, 4000, 1)).tzname(None))
        self.assertEqual('UTC-01:06:40.000001',
                         timezone(-timedelta(0, 4000, 1)).tzname(None))

        with self.assertRaises(TypeError): self.EST.tzname('')
        with self.assertRaises(TypeError): self.EST.tzname(5)

    def test_fromutc(self):
        with self.assertRaises(ValueError):
            timezone.utc.fromutc(self.DT)
        with self.assertRaises(TypeError):
            timezone.utc.fromutc('not datetime')
        for tz in [self.EST, self.ACDT, Eastern]:
            utctime = self.DT.replace(tzinfo=tz)
            local = tz.fromutc(utctime)
            self.assertEqual(local - utctime, tz.utcoffset(local))
            self.assertEqual(local,
                             self.DT.replace(tzinfo=timezone.utc))

    def test_comparison(self):
        self.assertNotEqual(timezone(ZERO), timezone(HOUR))
        self.assertEqual(timezone(HOUR), timezone(HOUR))
        self.assertEqual(timezone(-5 * HOUR), timezone(-5 * HOUR, 'EST'))
        with self.assertRaises(TypeError): timezone(ZERO) < timezone(ZERO)
        self.assertIn(timezone(ZERO), {timezone(ZERO)})
        self.assertTrue(timezone(ZERO) != None)
        self.assertFalse(timezone(ZERO) == None)

        tz = timezone(ZERO)
        self.assertTrue(tz == ALWAYS_EQ)
        self.assertFalse(tz != ALWAYS_EQ)
        self.assertTrue(tz < LARGEST)
        self.assertFalse(tz > LARGEST)
        self.assertTrue(tz <= LARGEST)
        self.assertFalse(tz >= LARGEST)
        self.assertFalse(tz < SMALLEST)
        self.assertTrue(tz > SMALLEST)
        self.assertFalse(tz <= SMALLEST)
        self.assertTrue(tz >= SMALLEST)

    def test_aware_datetime(self):
        # test that timezone instances can be used by datetime
        t = datetime(1, 1, 1)
        for tz in [timezone.min, timezone.max, timezone.utc]:
            self.assertEqual(tz.tzname(t),
                             t.replace(tzinfo=tz).tzname())
            self.assertEqual(tz.utcoffset(t),
                             t.replace(tzinfo=tz).utcoffset())
            self.assertEqual(tz.dst(t),
                             t.replace(tzinfo=tz).dst())

    def test_pickle(self):
        for tz in self.ACDT, self.EST, timezone.min, timezone.max:
            for pickler, unpickler, proto in pickle_choices:
                tz_copy = unpickler.loads(pickler.dumps(tz, proto))
                self.assertEqual(tz_copy, tz)
        tz = timezone.utc
        for pickler, unpickler, proto in pickle_choices:
            tz_copy = unpickler.loads(pickler.dumps(tz, proto))
            self.assertIs(tz_copy, tz)

    def test_copy(self):
        for tz in self.ACDT, self.EST, timezone.min, timezone.max:
            tz_copy = copy.copy(tz)
            self.assertEqual(tz_copy, tz)
        tz = timezone.utc
        tz_copy = copy.copy(tz)
        self.assertIs(tz_copy, tz)

    def test_deepcopy(self):
        for tz in self.ACDT, self.EST, timezone.min, timezone.max:
            tz_copy = copy.deepcopy(tz)
            self.assertEqual(tz_copy, tz)
        tz = timezone.utc
        tz_copy = copy.deepcopy(tz)
        self.assertIs(tz_copy, tz)

    def test_offset_boundaries(self):
        # Test timedeltas close to the boundaries
        time_deltas = [
            timedelta(hours=23, minutes=59),
            timedelta(hours=23, minutes=59, seconds=59),
            timedelta(hours=23, minutes=59, seconds=59, microseconds=999999),
        ]
        time_deltas.extend([-delta for delta in time_deltas])

        for delta in time_deltas:
            with self.subTest(test_type='good', delta=delta):
                timezone(delta)

        # Test timedeltas on and outside the boundaries
        bad_time_deltas = [
            timedelta(hours=24),
            timedelta(hours=24, microseconds=1),
        ]
        bad_time_deltas.extend([-delta for delta in bad_time_deltas])

        for delta in bad_time_deltas:
            with self.subTest(test_type='bad', delta=delta):
                with self.assertRaises(ValueError):
                    timezone(delta)

    def test_comparison_with_tzinfo(self):
        # Constructing tzinfo objects directly should not be done by users
        # and serves only to check the bug described in bpo-37915
        self.assertNotEqual(timezone.utc, tzinfo())
        self.assertNotEqual(timezone(timedelta(hours=1)), tzinfo())

#############################################################################
# Base class for testing a particular aspect of timedelta, time, date and
# datetime comparisons.

class HarmlessMixedComparison:
    # Test that __eq__ and __ne__ don't complain for mixed-type comparisons.

    # Subclasses must define 'theclass', and theclass(1, 1, 1) must be a
    # legit constructor.

    def test_harmless_mixed_comparison(self):
        me = self.theclass(1, 1, 1)

        self.assertFalse(me == ())
        self.assertTrue(me != ())
        self.assertFalse(() == me)
        self.assertTrue(() != me)

        self.assertIn(me, [1, 20, [], me])
        self.assertIn([], [me, 1, 20, []])

        # Comparison to objects of unsupported types should return
        # NotImplemented which falls back to the right hand side's __eq__
        # method. In this case, ALWAYS_EQ.__eq__ always returns True.
        # ALWAYS_EQ.__ne__ always returns False.
        self.assertTrue(me == ALWAYS_EQ)
        self.assertFalse(me != ALWAYS_EQ)

        # If the other class explicitly defines ordering
        # relative to our class, it is allowed to do so
        self.assertTrue(me < LARGEST)
        self.assertFalse(me > LARGEST)
        self.assertTrue(me <= LARGEST)
        self.assertFalse(me >= LARGEST)
        self.assertFalse(me < SMALLEST)
        self.assertTrue(me > SMALLEST)
        self.assertFalse(me <= SMALLEST)
        self.assertTrue(me >= SMALLEST)

    def test_harmful_mixed_comparison(self):
        me = self.theclass(1, 1, 1)

        self.assertRaises(TypeError, lambda: me < ())
        self.assertRaises(TypeError, lambda: me <= ())
        self.assertRaises(TypeError, lambda: me > ())
        self.assertRaises(TypeError, lambda: me >= ())

        self.assertRaises(TypeError, lambda: () < me)
        self.assertRaises(TypeError, lambda: () <= me)
        self.assertRaises(TypeError, lambda: () > me)
        self.assertRaises(TypeError, lambda: () >= me)

#############################################################################
# timedelta tests

class SubclassTimeDelta(timedelta):
    sub_var = 1

class TestTimeDelta(HarmlessMixedComparison, unittest.TestCase):

    theclass = timedelta

    def test_constructor(self):
        eq = self.assertEqual
        ra = self.assertRaises
        td = timedelta

        # Check keyword args to constructor
        eq(td(), td(weeks=0, days=0, hours=0, minutes=0, seconds=0,
                    milliseconds=0, microseconds=0))
        eq(td(1), td(days=1))
        eq(td(0, 1), td(seconds=1))
        eq(td(0, 0, 1), td(microseconds=1))
        eq(td(weeks=1), td(days=7))
        eq(td(days=1), td(hours=24))
        eq(td(hours=1), td(minutes=60))
        eq(td(minutes=1), td(seconds=60))
        eq(td(seconds=1), td(milliseconds=1000))
        eq(td(milliseconds=1), td(microseconds=1000))

        # Check float args to constructor
        eq(td(weeks=1.0/7), td(days=1))
        eq(td(days=1.0/24), td(hours=1))
        eq(td(hours=1.0/60), td(minutes=1))
        eq(td(minutes=1.0/60), td(seconds=1))
        eq(td(seconds=0.001), td(milliseconds=1))
        eq(td(milliseconds=0.001), td(microseconds=1))

        # Check type of args to constructor
        ra(TypeError, lambda: td(weeks='1'))
        ra(TypeError, lambda: td(days='1'))
        ra(TypeError, lambda: td(hours='1'))
        ra(TypeError, lambda: td(minutes='1'))
        ra(TypeError, lambda: td(seconds='1'))
        ra(TypeError, lambda: td(milliseconds='1'))
        ra(TypeError, lambda: td(microseconds='1'))

    def test_computations(self):
        eq = self.assertEqual
        td = timedelta

        a = td(7) # One week
        b = td(0, 60) # One minute
        c = td(0, 0, 1000) # One millisecond
        eq(a+b+c, td(7, 60, 1000))
        eq(a-b, td(6, 24*3600 - 60))
        eq(b.__rsub__(a), td(6, 24*3600 - 60))
        eq(-a, td(-7))
        eq(+a, td(7))
        eq(-b, td(-1, 24*3600 - 60))
        eq(-c, td(-1, 24*3600 - 1, 999000))
        eq(abs(a), a)
        eq(abs(-a), a)
        eq(td(6, 24*3600), a)
        eq(td(0, 0, 60*1000000), b)
        eq(a*10, td(70))
        eq(a*10, 10*a)
        eq(a*10, 10*a)
        eq(b*10, td(0, 600))
        eq(10*b, td(0, 600))
        eq(b*10, td(0, 600))
        eq(c*10, td(0, 0, 10000))
        eq(10*c, td(0, 0, 10000))
        eq(c*10, td(0, 0, 10000))
        eq(a*-1, -a)
        eq(b*-2, -b-b)
        eq(c*-2, -c+-c)
        eq(b*(60*24), (b*60)*24)
        eq(b*(60*24), (60*b)*24)
        eq(c*1000, td(0, 1))
        eq(1000*c, td(0, 1))
        eq(a//7, td(1))
        eq(b//10, td(0, 6))
        eq(c//1000, td(0, 0, 1))
        eq(a//10, td(0, 7*24*360))
        eq(a//3600000, td(0, 0, 7*24*1000))
        eq(a/0.5, td(14))
        eq(b/0.5, td(0, 120))
        eq(a/7, td(1))
        eq(b/10, td(0, 6))
        eq(c/1000, td(0, 0, 1))
        eq(a/10, td(0, 7*24*360))
        eq(a/3600000, td(0, 0, 7*24*1000))

        # Multiplication by float
        us = td(microseconds=1)
        eq((3*us) * 0.5, 2*us)
        eq((5*us) * 0.5, 2*us)
        eq(0.5 * (3*us), 2*us)
        eq(0.5 * (5*us), 2*us)
        eq((-3*us) * 0.5, -2*us)
        eq((-5*us) * 0.5, -2*us)

        # Issue #23521
        eq(td(seconds=1) * 0.123456, td(microseconds=123456))
        eq(td(seconds=1) * 0.6112295, td(microseconds=611229))

        # Division by int and float
        eq((3*us) / 2, 2*us)
        eq((5*us) / 2, 2*us)
        eq((-3*us) / 2.0, -2*us)
        eq((-5*us) / 2.0, -2*us)
        eq((3*us) / -2, -2*us)
        eq((5*us) / -2, -2*us)
        eq((3*us) / -2.0, -2*us)
        eq((5*us) / -2.0, -2*us)
        for i in range(-10, 10):
            eq((i*us/3)//us, round(i/3))
        for i in range(-10, 10):
            eq((i*us/-3)//us, round(i/-3))

        # Issue #23521
        eq(td(seconds=1) / (1 / 0.6112295), td(microseconds=611229))

        # Issue #11576
        eq(td(999999999, 86399, 999999) - td(999999999, 86399, 999998),
           td(0, 0, 1))
        eq(td(999999999, 1, 1) - td(999999999, 1, 0),
           td(0, 0, 1))

    def test_disallowed_computations(self):
        a = timedelta(42)

        # Add/sub ints or floats should be illegal
        for i in 1, 1.0:
            self.assertRaises(TypeError, lambda: a+i)
            self.assertRaises(TypeError, lambda: a-i)
            self.assertRaises(TypeError, lambda: i+a)
            self.assertRaises(TypeError, lambda: i-a)

        # Division of int by timedelta doesn't make sense.
        # Division by zero doesn't make sense.
        zero = 0
        self.assertRaises(TypeError, lambda: zero // a)
        self.assertRaises(ZeroDivisionError, lambda: a // zero)
        self.assertRaises(ZeroDivisionError, lambda: a / zero)
        self.assertRaises(ZeroDivisionError, lambda: a / 0.0)
        self.assertRaises(TypeError, lambda: a / '')

    @support.requires_IEEE_754
    def test_disallowed_special(self):
        a = timedelta(42)
        self.assertRaises(ValueError, a.__mul__, NAN)
        self.assertRaises(ValueError, a.__truediv__, NAN)

    def test_basic_attributes(self):
        days, seconds, us = 1, 7, 31
        td = timedelta(days, seconds, us)
        self.assertEqual(td.days, days)
        self.assertEqual(td.seconds, seconds)
        self.assertEqual(td.microseconds, us)

    def test_total_seconds(self):
        td = timedelta(days=365)
        self.assertEqual(td.total_seconds(), 31536000.0)
        for total_seconds in [123456.789012, -123456.789012, 0.123456, 0, 1e6]:
            td = timedelta(seconds=total_seconds)
            self.assertEqual(td.total_seconds(), total_seconds)
        # Issue8644: Test that td.total_seconds() has the same
        # accuracy as td / timedelta(seconds=1).
        for ms in [-1, -2, -123]:
            td = timedelta(microseconds=ms)
            self.assertEqual(td.total_seconds(), td / timedelta(seconds=1))

    def test_carries(self):
        t1 = timedelta(days=100,
                       weeks=-7,
                       hours=-24*(100-49),
                       minutes=-3,
                       seconds=12,
                       microseconds=(3*60 - 12) * 1e6 + 1)
        t2 = timedelta(microseconds=1)
        self.assertEqual(t1, t2)

    def test_hash_equality(self):
        t1 = timedelta(days=100,
                       weeks=-7,
                       hours=-24*(100-49),
                       minutes=-3,
                       seconds=12,
                       microseconds=(3*60 - 12) * 1000000)
        t2 = timedelta()
        self.assertEqual(hash(t1), hash(t2))

        t1 += timedelta(weeks=7)
        t2 += timedelta(days=7*7)
        self.assertEqual(t1, t2)
        self.assertEqual(hash(t1), hash(t2))

        d = {t1: 1}
        d[t2] = 2
        self.assertEqual(len(d), 1)
        self.assertEqual(d[t1], 2)

    def test_pickling(self):
        args = 12, 34, 56
        orig = timedelta(*args)
        for pickler, unpickler, proto in pickle_choices:
            green = pickler.dumps(orig, proto)
            derived = unpickler.loads(green)
            self.assertEqual(orig, derived)

    def test_compare(self):
        t1 = timedelta(2, 3, 4)
        t2 = timedelta(2, 3, 4)
        self.assertEqual(t1, t2)
        self.assertTrue(t1 <= t2)
        self.assertTrue(t1 >= t2)
        self.assertFalse(t1 != t2)
        self.assertFalse(t1 < t2)
        self.assertFalse(t1 > t2)

        for args in (3, 3, 3), (2, 4, 4), (2, 3, 5):
            t2 = timedelta(*args)   # this is larger than t1
            self.assertTrue(t1 < t2)
            self.assertTrue(t2 > t1)
            self.assertTrue(t1 <= t2)
            self.assertTrue(t2 >= t1)
            self.assertTrue(t1 != t2)
            self.assertTrue(t2 != t1)
            self.assertFalse(t1 == t2)
            self.assertFalse(t2 == t1)
            self.assertFalse(t1 > t2)
            self.assertFalse(t2 < t1)
            self.assertFalse(t1 >= t2)
            self.assertFalse(t2 <= t1)

        for badarg in OTHERSTUFF:
            self.assertEqual(t1 == badarg, False)
            self.assertEqual(t1 != badarg, True)
            self.assertEqual(badarg == t1, False)
            self.assertEqual(badarg != t1, True)

            self.assertRaises(TypeError, lambda: t1 <= badarg)
            self.assertRaises(TypeError, lambda: t1 < badarg)
            self.assertRaises(TypeError, lambda: t1 > badarg)
            self.assertRaises(TypeError, lambda: t1 >= badarg)
            self.assertRaises(TypeError, lambda: badarg <= t1)
            self.assertRaises(TypeError, lambda: badarg < t1)
            self.assertRaises(TypeError, lambda: badarg > t1)
            self.assertRaises(TypeError, lambda: badarg >= t1)

    def test_str(self):
        td = timedelta
        eq = self.assertEqual

        eq(str(td(1)), "1 day, 0:00:00")
        eq(str(td(-1)), "-1 day, 0:00:00")
        eq(str(td(2)), "2 days, 0:00:00")
        eq(str(td(-2)), "-2 days, 0:00:00")

        eq(str(td(hours=12, minutes=58, seconds=59)), "12:58:59")
        eq(str(td(hours=2, minutes=3, seconds=4)), "2:03:04")
        eq(str(td(weeks=-30, hours=23, minutes=12, seconds=34)),
           "-210 days, 23:12:34")

        eq(str(td(milliseconds=1)), "0:00:00.001000")
        eq(str(td(microseconds=3)), "0:00:00.000003")

        eq(str(td(days=999999999, hours=23, minutes=59, seconds=59,
                   microseconds=999999)),
           "999999999 days, 23:59:59.999999")

        # test the Doc/library/datetime.rst recipe
        eq(f'-({-td(hours=-1)!s})', "-(1:00:00)")

    def test_repr(self):
        name = 'datetime.' + self.theclass.__name__
        self.assertEqual(repr(self.theclass(1)),
                         "%s(days=1)" % name)
        self.assertEqual(repr(self.theclass(10, 2)),
                         "%s(days=10, seconds=2)" % name)
        self.assertEqual(repr(self.theclass(-10, 2, 400000)),
                         "%s(days=-10, seconds=2, microseconds=400000)" % name)
        self.assertEqual(repr(self.theclass(seconds=60)),
                         "%s(seconds=60)" % name)
        self.assertEqual(repr(self.theclass()),
                         "%s(0)" % name)
        self.assertEqual(repr(self.theclass(microseconds=100)),
                         "%s(microseconds=100)" % name)
        self.assertEqual(repr(self.theclass(days=1, microseconds=100)),
                         "%s(days=1, microseconds=100)" % name)
        self.assertEqual(repr(self.theclass(seconds=1, microseconds=100)),
                         "%s(seconds=1, microseconds=100)" % name)

    def test_repr_subclass(self):
        """Subclasses should have bare names in the repr (gh-107773)."""
        td = SubclassTimeDelta(days=1)
        self.assertEqual(repr(td), "SubclassTimeDelta(days=1)")
        td = SubclassTimeDelta(seconds=30)
        self.assertEqual(repr(td), "SubclassTimeDelta(seconds=30)")
        td = SubclassTimeDelta(weeks=2)
        self.assertEqual(repr(td), "SubclassTimeDelta(days=14)")

    def test_roundtrip(self):
        for td in (timedelta(days=999999999, hours=23, minutes=59,
                             seconds=59, microseconds=999999),
                   timedelta(days=-999999999),
                   timedelta(days=-999999999, seconds=1),
                   timedelta(days=1, seconds=2, microseconds=3)):

            # Verify td -> string -> td identity.
            s = repr(td)
            self.assertStartsWith(s, 'datetime.')
            s = s[9:]
            td2 = eval(s, globals())  # Grail: bare eval() does not capture caller globals; pass explicitly
            self.assertEqual(td, td2)

            # Verify identity via reconstructing from pieces.
            td2 = timedelta(td.days, td.seconds, td.microseconds)
            self.assertEqual(td, td2)

    def test_resolution_info(self):
        self.assertIsInstance(timedelta.min, timedelta)
        self.assertIsInstance(timedelta.max, timedelta)
        self.assertIsInstance(timedelta.resolution, timedelta)
        self.assertTrue(timedelta.max > timedelta.min)
        self.assertEqual(timedelta.min, timedelta(-999999999))
        self.assertEqual(timedelta.max, timedelta(999999999, 24*3600-1, 1e6-1))
        self.assertEqual(timedelta.resolution, timedelta(0, 0, 1))

    def test_overflow(self):
        tiny = timedelta.resolution

        td = timedelta.min + tiny
        td -= tiny  # no problem
        self.assertRaises(OverflowError, td.__sub__, tiny)
        self.assertRaises(OverflowError, td.__add__, -tiny)

        td = timedelta.max - tiny
        td += tiny  # no problem
        self.assertRaises(OverflowError, td.__add__, tiny)
        self.assertRaises(OverflowError, td.__sub__, -tiny)

        self.assertRaises(OverflowError, lambda: -timedelta.max)

        day = timedelta(1)
        self.assertRaises(OverflowError, day.__mul__, 10**9)
        self.assertRaises(OverflowError, day.__mul__, 1e9)
        self.assertRaises(OverflowError, day.__truediv__, 1e-20)
        self.assertRaises(OverflowError, day.__truediv__, 1e-10)
        self.assertRaises(OverflowError, day.__truediv__, 9e-10)

    @support.requires_IEEE_754
    def _test_overflow_special(self):
        day = timedelta(1)
        self.assertRaises(OverflowError, day.__mul__, INF)
        self.assertRaises(OverflowError, day.__mul__, -INF)

    def test_microsecond_rounding(self):
        td = timedelta
        eq = self.assertEqual

        # Single-field rounding.
        eq(td(milliseconds=0.4/1000), td(0))    # rounds to 0
        eq(td(milliseconds=-0.4/1000), td(0))    # rounds to 0
        eq(td(milliseconds=0.5/1000), td(microseconds=0))
        eq(td(milliseconds=-0.5/1000), td(microseconds=-0))
        eq(td(milliseconds=0.6/1000), td(microseconds=1))
        eq(td(milliseconds=-0.6/1000), td(microseconds=-1))
        eq(td(milliseconds=1.5/1000), td(microseconds=2))
        eq(td(milliseconds=-1.5/1000), td(microseconds=-2))
        eq(td(seconds=0.5/10**6), td(microseconds=0))
        eq(td(seconds=-0.5/10**6), td(microseconds=-0))
        eq(td(seconds=1/2**7), td(microseconds=7812))
        eq(td(seconds=-1/2**7), td(microseconds=-7812))

        # Rounding due to contributions from more than one field.
        us_per_hour = 3600e6
        us_per_day = us_per_hour * 24
        eq(td(days=.4/us_per_day), td(0))
        eq(td(hours=.2/us_per_hour), td(0))
        eq(td(days=.4/us_per_day, hours=.2/us_per_hour), td(microseconds=1))

        eq(td(days=-.4/us_per_day), td(0))
        eq(td(hours=-.2/us_per_hour), td(0))
        eq(td(days=-.4/us_per_day, hours=-.2/us_per_hour), td(microseconds=-1))

        # Test for a patch in Issue 8860
        eq(td(microseconds=0.5), 0.5*td(microseconds=1.0))
        eq(td(microseconds=0.5)//td.resolution, 0.5*td.resolution//td.resolution)

    def test_massive_normalization(self):
        td = timedelta(microseconds=-1)
        self.assertEqual((td.days, td.seconds, td.microseconds),
                         (-1, 24*3600-1, 999999))

    def test_bool(self):
        self.assertTrue(timedelta(1))
        self.assertTrue(timedelta(0, 1))
        self.assertTrue(timedelta(0, 0, 1))
        self.assertTrue(timedelta(microseconds=1))
        self.assertFalse(timedelta(0))

    def test_subclass_timedelta(self):

        class T(timedelta):
            @staticmethod
            def from_td(td):
                return T(td.days, td.seconds, td.microseconds)

            def as_hours(self):
                sum = (self.days * 24 +
                       self.seconds / 3600.0 +
                       self.microseconds / 3600e6)
                return round(sum)

        t1 = T(days=1)
        self.assertIs(type(t1), T)
        self.assertEqual(t1.as_hours(), 24)

        t2 = T(days=-1, seconds=-3600)
        self.assertIs(type(t2), T)
        self.assertEqual(t2.as_hours(), -25)

        t3 = t1 + t2
        self.assertIs(type(t3), timedelta)
        t4 = T.from_td(t3)
        self.assertIs(type(t4), T)
        self.assertEqual(t3.days, t4.days)
        self.assertEqual(t3.seconds, t4.seconds)
        self.assertEqual(t3.microseconds, t4.microseconds)
        self.assertEqual(str(t3), str(t4))
        self.assertEqual(t4.as_hours(), -1)

    def test_subclass_date(self):
        class DateSubclass(date):
            pass

        d1 = DateSubclass(2018, 1, 5)
        td = timedelta(days=1)

        tests = [
            ('add', lambda d, t: d + t, DateSubclass(2018, 1, 6)),
            ('radd', lambda d, t: t + d, DateSubclass(2018, 1, 6)),
            ('sub', lambda d, t: d - t, DateSubclass(2018, 1, 4)),
        ]

        for name, func, expected in tests:
            with self.subTest(name):
                act = func(d1, td)
                self.assertEqual(act, expected)
                self.assertIsInstance(act, DateSubclass)

    def test_subclass_datetime(self):
        class DateTimeSubclass(datetime):
            pass

        d1 = DateTimeSubclass(2018, 1, 5, 12, 30)
        td = timedelta(days=1, minutes=30)

        tests = [
            ('add', lambda d, t: d + t, DateTimeSubclass(2018, 1, 6, 13)),
            ('radd', lambda d, t: t + d, DateTimeSubclass(2018, 1, 6, 13)),
            ('sub', lambda d, t: d - t, DateTimeSubclass(2018, 1, 4, 12)),
        ]

        for name, func, expected in tests:
            with self.subTest(name):
                act = func(d1, td)
                self.assertEqual(act, expected)
                self.assertIsInstance(act, DateTimeSubclass)

    def test_division(self):
        t = timedelta(hours=1, minutes=24, seconds=19)
        second = timedelta(seconds=1)
        self.assertEqual(t / second, 5059.0)
        self.assertEqual(t // second, 5059)

        t = timedelta(minutes=2, seconds=30)
        minute = timedelta(minutes=1)
        self.assertEqual(t / minute, 2.5)
        self.assertEqual(t // minute, 2)

        zerotd = timedelta(0)
        self.assertRaises(ZeroDivisionError, truediv, t, zerotd)
        self.assertRaises(ZeroDivisionError, floordiv, t, zerotd)

        # self.assertRaises(TypeError, truediv, t, 2)
        # note: floor division of a timedelta by an integer *is*
        # currently permitted.

    def test_remainder(self):
        t = timedelta(minutes=2, seconds=30)
        minute = timedelta(minutes=1)
        r = t % minute
        self.assertEqual(r, timedelta(seconds=30))

        t = timedelta(minutes=-2, seconds=30)
        r = t %  minute
        self.assertEqual(r, timedelta(seconds=30))

        zerotd = timedelta(0)
        self.assertRaises(ZeroDivisionError, mod, t, zerotd)

        self.assertRaises(TypeError, mod, t, 10)

    def test_divmod(self):
        t = timedelta(minutes=2, seconds=30)
        minute = timedelta(minutes=1)
        q, r = divmod(t, minute)
        self.assertEqual(q, 2)
        self.assertEqual(r, timedelta(seconds=30))

        t = timedelta(minutes=-2, seconds=30)
        q, r = divmod(t, minute)
        self.assertEqual(q, -2)
        self.assertEqual(r, timedelta(seconds=30))

        zerotd = timedelta(0)
        self.assertRaises(ZeroDivisionError, divmod, t, zerotd)

        self.assertRaises(TypeError, divmod, t, 10)

    def test_issue31293(self):
        # The interpreter shouldn't crash in case a timedelta is divided or
        # multiplied by a float with a bad as_integer_ratio() method.
        def get_bad_float(bad_ratio):
            class BadFloat(float):
                def as_integer_ratio(self):
                    return bad_ratio
            return BadFloat()

        with self.assertRaises(TypeError):
            timedelta() / get_bad_float(1 << 1000)
        with self.assertRaises(TypeError):
            timedelta() * get_bad_float(1 << 1000)

        for bad_ratio in [(), (42, ), (1, 2, 3)]:
            with self.assertRaises(ValueError):
                timedelta() / get_bad_float(bad_ratio)
            with self.assertRaises(ValueError):
                timedelta() * get_bad_float(bad_ratio)

    def test_issue31752(self):
        # The interpreter shouldn't crash because divmod() returns negative
        # remainder.
        class BadInt(int):
            def __mul__(self, other):
                return Prod()
            def __rmul__(self, other):
                return Prod()
            def __floordiv__(self, other):
                return Prod()
            def __rfloordiv__(self, other):
                return Prod()

        class Prod:
            def __add__(self, other):
                return Sum()
            def __radd__(self, other):
                return Sum()

        class Sum(int):
            def __divmod__(self, other):
                return divmodresult

        for divmodresult in [None, (), (0, 1, 2), (0, -1)]:
            with self.subTest(divmodresult=divmodresult):
                # The following examples should not crash.
                try:
                    timedelta(microseconds=BadInt(1))
                except TypeError:
                    pass
                try:
                    timedelta(hours=BadInt(1))
                except TypeError:
                    pass
                try:
                    timedelta(weeks=BadInt(1))
                except (TypeError, ValueError):
                    pass
                try:
                    timedelta(1) * BadInt(1)
                except (TypeError, ValueError):
                    pass
                try:
                    BadInt(1) * timedelta(1)
                except TypeError:
                    pass
                try:
                    timedelta(1) // BadInt(1)
                except TypeError:
                    pass


#############################################################################
# date tests

class TestDateOnly(unittest.TestCase):
    # Tests here won't pass if also run on datetime objects, so don't
    # subclass this to test datetimes too.

    def test_delta_non_days_ignored(self):
        dt = date(2000, 1, 2)
        delta = timedelta(days=1, hours=2, minutes=3, seconds=4,
                          microseconds=5)
        days = timedelta(delta.days)
        self.assertEqual(days, timedelta(1))

        dt2 = dt + delta
        self.assertEqual(dt2, dt + days)

        dt2 = delta + dt
        self.assertEqual(dt2, dt + days)

        dt2 = dt - delta
        self.assertEqual(dt2, dt - days)

        delta = -delta
        days = timedelta(delta.days)
        self.assertEqual(days, timedelta(-2))

        dt2 = dt + delta
        self.assertEqual(dt2, dt + days)

        dt2 = delta + dt
        self.assertEqual(dt2, dt + days)

        dt2 = dt - delta
        self.assertEqual(dt2, dt - days)

    def test_strptime(self):
        inputs = [
            # Basic valid cases
            (date(1998, 2, 3), '1998-02-03', '%Y-%m-%d'),
            (date(2004, 12, 2), '2004-12-02', '%Y-%m-%d'),

            # Edge cases: Leap year
            (date(2020, 2, 29), '2020-02-29', '%Y-%m-%d'),  # Valid leap year date

            # bpo-34482: Handle surrogate pairs
            (date(2004, 12, 2), '2004-12\u080002', '%Y-%m\u0800%d'),
            (date(2004, 12, 2), '2004\u080012-02', '%Y\u0800%m-%d'),

            # Month/day variations
            (date(2004, 2, 1), '2004-02', '%Y-%m'),  # No day provided
            (date(2004, 2, 1), '02-2004', '%m-%Y'),  # Month and year swapped

            # Different day-month-year formats
            (date(2004, 12, 2), '02/12/2004', '%d/%m/%Y'),  # Day/Month/Year
            (date(2004, 12, 2), '12/02/2004', '%m/%d/%Y'),  # Month/Day/Year

            # Different separators
            (date(2023, 9, 24), '24.09.2023', '%d.%m.%Y'),  # Dots as separators
            (date(2023, 9, 24), '24-09-2023', '%d-%m-%Y'),  # Dashes
            (date(2023, 9, 24), '2023/09/24', '%Y/%m/%d'),  # Slashes

            # Handling years with fewer digits
            (date(127, 2, 3), '0127-02-03', '%Y-%m-%d'),
            (date(99, 2, 3), '0099-02-03', '%Y-%m-%d'),
            (date(5, 2, 3), '0005-02-03', '%Y-%m-%d'),

            # Variations on ISO 8601 format
            (date(2023, 9, 25), '2023-W39-1', '%G-W%V-%u'),  # ISO week date (Week 39, Monday)
            (date(2023, 9, 25), '2023-268', '%Y-%j'),  # Year and day of the year (Julian)
        ]
        for expected, string, format in inputs:
            with self.subTest(string=string, format=format):
                got = date.strptime(string, format)
                self.assertEqual(expected, got)
                self.assertIs(type(got), date)

    def test_strptime_single_digit(self):
        # bpo-34903: Check that single digit dates are allowed.
        strptime = date.strptime
        with self.assertRaises(ValueError):
            # %y does require two digits.
            newdate = strptime('01/02/3', '%d/%m/%y')

        d1 = date(2003, 2, 1)
        d2 = date(2003, 1, 2)
        d3 = date(2003, 1, 25)
        inputs = [
            ('%d', '1/02/03',  '%d/%m/%y', d1),
            ('%m', '01/2/03',  '%d/%m/%y', d1),
            ('%j', '2/03',     '%j/%y',    d2),
            ('%w', '6/04/03',  '%w/%U/%y', d1),
            # %u requires a single digit.
            ('%W', '6/4/2003', '%u/%W/%Y', d1),
            ('%V', '6/4/2003', '%u/%V/%G', d3),
        ]
        for reason, string, format, target in inputs:
            reason = 'test single digit ' + reason
            with self.subTest(reason=reason,
                              string=string,
                              format=format,
                              target=target):
                newdate = strptime(string, format)
                self.assertEqual(newdate, target, msg=reason)

    @warnings_helper.ignore_warnings(category=DeprecationWarning)
    def test_strptime_leap_year(self):
        # GH-70647: warns if parsing a format with a day and no year.
        with self.assertRaises(ValueError):
            # The existing behavior that GH-70647 seeks to change.
            date.strptime('02-29', '%m-%d')
        with self._assertNotWarns(DeprecationWarning):
            date.strptime('20-03-14', '%y-%m-%d')
            date.strptime('02-29,2024', '%m-%d,%Y')

class SubclassDate(date):
    sub_var = 1

class TestDate(HarmlessMixedComparison, unittest.TestCase):
    # Tests here should pass for both dates and datetimes, except for a
    # few tests that TestDateTime overrides.

    theclass = date

    def test_basic_attributes(self):
        dt = self.theclass(2002, 3, 1)
        self.assertEqual(dt.year, 2002)
        self.assertEqual(dt.month, 3)
        self.assertEqual(dt.day, 1)

    def test_roundtrip(self):
        for dt in (self.theclass(1, 2, 3),
                   self.theclass.today()):
            # Verify dt -> string -> date identity.
            s = repr(dt)
            self.assertStartsWith(s, 'datetime.')
            s = s[9:]
            dt2 = eval(s, globals())  # Grail: bare eval() does not capture caller globals; pass explicitly
            self.assertEqual(dt, dt2)

            # Verify identity via reconstructing from pieces.
            dt2 = self.theclass(dt.year, dt.month, dt.day)
            self.assertEqual(dt, dt2)

    def test_repr_subclass(self):
        """Subclasses should have bare names in the repr (gh-107773)."""
        td = SubclassDate(1, 2, 3)
        self.assertEqual(repr(td), "SubclassDate(1, 2, 3)")
        td = SubclassDate(2014, 1, 1)
        self.assertEqual(repr(td), "SubclassDate(2014, 1, 1)")
        td = SubclassDate(2010, 10, day=10)
        self.assertEqual(repr(td), "SubclassDate(2010, 10, 10)")

    def test_ordinal_conversions(self):
        # Check some fixed values.
        for y, m, d, n in [(1, 1, 1, 1),      # calendar origin
                           (1, 12, 31, 365),
                           (2, 1, 1, 366),
                           # first example from "Calendrical Calculations"
                           (1945, 11, 12, 710347)]:
            d = self.theclass(y, m, d)
            self.assertEqual(n, d.toordinal())
            fromord = self.theclass.fromordinal(n)
            self.assertEqual(d, fromord)
            if hasattr(fromord, "hour"):
            # if we're checking something fancier than a date, verify
            # the extra fields have been zeroed out
                self.assertEqual(fromord.hour, 0)
                self.assertEqual(fromord.minute, 0)
                self.assertEqual(fromord.second, 0)
                self.assertEqual(fromord.microsecond, 0)

        # Check first and last days of year spottily across the whole
        # range of years supported.
        for year in range(MINYEAR, MAXYEAR+1, 7):
            # Verify (year, 1, 1) -> ordinal -> y, m, d is identity.
            d = self.theclass(year, 1, 1)
            n = d.toordinal()
            d2 = self.theclass.fromordinal(n)
            self.assertEqual(d, d2)
            # Verify that moving back a day gets to the end of year-1.
            if year > 1:
                d = self.theclass.fromordinal(n-1)
                d2 = self.theclass(year-1, 12, 31)
                self.assertEqual(d, d2)
                self.assertEqual(d2.toordinal(), n-1)

        # Test every day in a leap-year and a non-leap year.
        dim = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
        for year, isleap in (2000, True), (2002, False):
            n = self.theclass(year, 1, 1).toordinal()
            for month, maxday in zip(range(1, 13), dim):
                if month == 2 and isleap:
                    maxday += 1
                for day in range(1, maxday+1):
                    d = self.theclass(year, month, day)
                    self.assertEqual(d.toordinal(), n)
                    self.assertEqual(d, self.theclass.fromordinal(n))
                    n += 1

    def test_extreme_ordinals(self):
        a = self.theclass.min
        a = self.theclass(a.year, a.month, a.day)  # get rid of time parts
        aord = a.toordinal()
        b = a.fromordinal(aord)
        self.assertEqual(a, b)

        self.assertRaises(ValueError, lambda: a.fromordinal(aord - 1))

        b = a + timedelta(days=1)
        self.assertEqual(b.toordinal(), aord + 1)
        self.assertEqual(b, self.theclass.fromordinal(aord + 1))

        a = self.theclass.max
        a = self.theclass(a.year, a.month, a.day)  # get rid of time parts
        aord = a.toordinal()
        b = a.fromordinal(aord)
        self.assertEqual(a, b)

        self.assertRaises(ValueError, lambda: a.fromordinal(aord + 1))

        b = a - timedelta(days=1)
        self.assertEqual(b.toordinal(), aord - 1)
        self.assertEqual(b, self.theclass.fromordinal(aord - 1))

    def test_bad_constructor_arguments(self):
        # bad years
        self.theclass(MINYEAR, 1, 1)  # no exception
        self.theclass(MAXYEAR, 1, 1)  # no exception
        self.assertRaises(ValueError, self.theclass, MINYEAR-1, 1, 1)
        self.assertRaises(ValueError, self.theclass, MAXYEAR+1, 1, 1)
        # bad months
        self.theclass(2000, 1, 1)    # no exception
        self.theclass(2000, 12, 1)   # no exception
        self.assertRaises(ValueError, self.theclass, 2000, 0, 1)
        self.assertRaises(ValueError, self.theclass, 2000, 13, 1)
        # bad days
        self.theclass(2000, 2, 29)   # no exception
        self.theclass(2004, 2, 29)   # no exception
        self.theclass(2400, 2, 29)   # no exception
        self.assertRaises(ValueError, self.theclass, 2000, 2, 30)
        self.assertRaises(ValueError, self.theclass, 2001, 2, 29)
        self.assertRaises(ValueError, self.theclass, 2100, 2, 29)
        self.assertRaises(ValueError, self.theclass, 1900, 2, 29)
        self.assertRaises(ValueError, self.theclass, 2000, 1, 0)
        self.assertRaises(ValueError, self.theclass, 2000, 1, 32)

    def test_hash_equality(self):
        d = self.theclass(2000, 12, 31)
        # same thing
        e = self.theclass(2000, 12, 31)
        self.assertEqual(d, e)
        self.assertEqual(hash(d), hash(e))

        dic = {d: 1}
        dic[e] = 2
        self.assertEqual(len(dic), 1)
        self.assertEqual(dic[d], 2)
        self.assertEqual(dic[e], 2)

        d = self.theclass(2001,  1,  1)
        # same thing
        e = self.theclass(2001,  1,  1)
        self.assertEqual(d, e)
        self.assertEqual(hash(d), hash(e))

        dic = {d: 1}
        dic[e] = 2
        self.assertEqual(len(dic), 1)
        self.assertEqual(dic[d], 2)
        self.assertEqual(dic[e], 2)

    def test_computations(self):
        a = self.theclass(2002, 1, 31)
        b = self.theclass(1956, 1, 31)
        c = self.theclass(2001,2,1)

        diff = a-b
        self.assertEqual(diff.days, 46*365 + len(range(1956, 2002, 4)))
        self.assertEqual(diff.seconds, 0)
        self.assertEqual(diff.microseconds, 0)

        day = timedelta(1)
        week = timedelta(7)
        a = self.theclass(2002, 3, 2)
        self.assertEqual(a + day, self.theclass(2002, 3, 3))
        self.assertEqual(day + a, self.theclass(2002, 3, 3))
        self.assertEqual(a - day, self.theclass(2002, 3, 1))
        self.assertEqual(-day + a, self.theclass(2002, 3, 1))
        self.assertEqual(a + week, self.theclass(2002, 3, 9))
        self.assertEqual(a - week, self.theclass(2002, 2, 23))
        self.assertEqual(a + 52*week, self.theclass(2003, 3, 1))
        self.assertEqual(a - 52*week, self.theclass(2001, 3, 3))
        self.assertEqual((a + week) - a, week)
        self.assertEqual((a + day) - a, day)
        self.assertEqual((a - week) - a, -week)
        self.assertEqual((a - day) - a, -day)
        self.assertEqual(a - (a + week), -week)
        self.assertEqual(a - (a + day), -day)
        self.assertEqual(a - (a - week), week)
        self.assertEqual(a - (a - day), day)
        self.assertEqual(c - (c - day), day)

        # Add/sub ints or floats should be illegal
        for i in 1, 1.0:
            self.assertRaises(TypeError, lambda: a+i)
            self.assertRaises(TypeError, lambda: a-i)
            self.assertRaises(TypeError, lambda: i+a)
            self.assertRaises(TypeError, lambda: i-a)

        # delta - date is senseless.
        self.assertRaises(TypeError, lambda: day - a)
        # mixing date and (delta or date) via * or // is senseless
        self.assertRaises(TypeError, lambda: day * a)
        self.assertRaises(TypeError, lambda: a * day)
        self.assertRaises(TypeError, lambda: day // a)
        self.assertRaises(TypeError, lambda: a // day)
        self.assertRaises(TypeError, lambda: a * a)
        self.assertRaises(TypeError, lambda: a // a)
        # date + date is senseless
        self.assertRaises(TypeError, lambda: a + a)

    def test_overflow(self):
        tiny = self.theclass.resolution

        for delta in [tiny, timedelta(1), timedelta(2)]:
            dt = self.theclass.min + delta
            dt -= delta  # no problem
            self.assertRaises(OverflowError, dt.__sub__, delta)
            self.assertRaises(OverflowError, dt.__add__, -delta)

            dt = self.theclass.max - delta
            dt += delta  # no problem
            self.assertRaises(OverflowError, dt.__add__, delta)
            self.assertRaises(OverflowError, dt.__sub__, -delta)

    def test_fromtimestamp(self):
        import time

        # Try an arbitrary fixed value.
        year, month, day = 1999, 9, 19
        ts = time.mktime((year, month, day, 0, 0, 0, 0, 0, -1))
        d = self.theclass.fromtimestamp(ts)
        self.assertEqual(d.year, year)
        self.assertEqual(d.month, month)
        self.assertEqual(d.day, day)

    def test_insane_fromtimestamp(self):
        # It's possible that some platform maps time_t to double,
        # and that this test will fail there.  This test should
        # exempt such platforms (provided they return reasonable
        # results!).
        for insane in -1e200, 1e200:
            self.assertRaises(OverflowError, self.theclass.fromtimestamp,
                              insane)

    def test_fromtimestamp_with_none_arg(self):
        # See gh-120268 for more details
        with self.assertRaises(TypeError):
            self.theclass.fromtimestamp(None)

    def test_today(self):
        import time

        # We claim that today() is like fromtimestamp(time.time()), so
        # prove it.
        for dummy in range(3):
            today = self.theclass.today()
            ts = time.time()
            todayagain = self.theclass.fromtimestamp(ts)
            if today == todayagain:
                break
            # There are several legit reasons that could fail:
            # 1. It recently became midnight, between the today() and the
            #    time() calls.
            # 2. The platform time() has such fine resolution that we'll
            #    never get the same value twice.
            # 3. The platform time() has poor resolution, and we just
            #    happened to call today() right before a resolution quantum
            #    boundary.
            # 4. The system clock got fiddled between calls.
            # In any case, wait a little while and try again.
            time.sleep(0.1)

        # It worked or it didn't.  If it didn't, assume it's reason #2, and
        # let the test pass if they're within half a second of each other.
        if today != todayagain:
            self.assertAlmostEqual(todayagain, today,
                                   delta=timedelta(seconds=0.5))

    def test_weekday(self):
        for i in range(7):
            # March 4, 2002 is a Monday
            self.assertEqual(self.theclass(2002, 3, 4+i).weekday(), i)
            self.assertEqual(self.theclass(2002, 3, 4+i).isoweekday(), i+1)
            # January 2, 1956 is a Monday
            self.assertEqual(self.theclass(1956, 1, 2+i).weekday(), i)
            self.assertEqual(self.theclass(1956, 1, 2+i).isoweekday(), i+1)

    def test_isocalendar(self):
        # Check examples from
        # http://www.phys.uu.nl/~vgent/calendar/isocalendar.htm
        week_mondays = [
                ((2003, 12, 22), (2003, 52, 1)),
                ((2003, 12, 29), (2004, 1, 1)),
                ((2004, 1, 5), (2004, 2, 1)),
                ((2009, 12, 21), (2009, 52, 1)),
                ((2009, 12, 28), (2009, 53, 1)),
                ((2010, 1, 4), (2010, 1, 1)),
        ]

        test_cases = []
        for cal_date, iso_date in week_mondays:
            base_date = self.theclass(*cal_date)
            # Adds one test case for every day of the specified weeks
            for i in range(7):
                new_date = base_date + timedelta(i)
                new_iso = iso_date[0:2] + (iso_date[2] + i,)
                test_cases.append((new_date, new_iso))

        for d, exp_iso in test_cases:
            with self.subTest(d=d, comparison="tuple"):
                self.assertEqual(d.isocalendar(), exp_iso)

            # Check that the tuple contents are accessible by field name
            with self.subTest(d=d, comparison="fields"):
                t = d.isocalendar()
                self.assertEqual((t.year, t.week, t.weekday), exp_iso)

    def test_isocalendar_pickling(self):
        """Test that the result of datetime.isocalendar() can be pickled.

        The result of a round trip should be a plain tuple.
        """
        d = self.theclass(2019, 1, 1)
        p = pickle.dumps(d.isocalendar())
        res = pickle.loads(p)
        self.assertEqual(type(res), tuple)
        self.assertEqual(res, (2019, 1, 2))

    def test_iso_long_years(self):
        # Calculate long ISO years and compare to table from
        # http://www.phys.uu.nl/~vgent/calendar/isocalendar.htm
        ISO_LONG_YEARS_TABLE = """
              4   32   60   88
              9   37   65   93
             15   43   71   99
             20   48   76
             26   54   82

            105  133  161  189
            111  139  167  195
            116  144  172
            122  150  178
            128  156  184

            201  229  257  285
            207  235  263  291
            212  240  268  296
            218  246  274
            224  252  280

            303  331  359  387
            308  336  364  392
            314  342  370  398
            320  348  376
            325  353  381
        """
        iso_long_years = sorted(map(int, ISO_LONG_YEARS_TABLE.split()))
        L = []
        for i in range(400):
            d = self.theclass(2000+i, 12, 31)
            d1 = self.theclass(1600+i, 12, 31)
            self.assertEqual(d.isocalendar()[1:], d1.isocalendar()[1:])
            if d.isocalendar()[1] == 53:
                L.append(i)
        self.assertEqual(L, iso_long_years)

    def test_isoformat(self):
        t = self.theclass(2, 3, 2)
        self.assertEqual(t.isoformat(), "0002-03-02")

    def test_ctime(self):
        t = self.theclass(2002, 3, 2)
        self.assertEqual(t.ctime(), "Sat Mar  2 00:00:00 2002")

    def test_strftime(self):
        t = self.theclass(2005, 3, 2)
        self.assertEqual(t.strftime("m:%m d:%d y:%y"), "m:03 d:02 y:05")
        self.assertEqual(t.strftime(""), "") # SF bug #761337
        self.assertEqual(t.strftime('x'*1000), 'x'*1000) # SF bug #1556784

        self.assertRaises(TypeError, t.strftime) # needs an arg
        self.assertRaises(TypeError, t.strftime, "one", "two") # too many args
        self.assertRaises(TypeError, t.strftime, 42) # arg wrong type

        # test that unicode input is allowed (issue 2782)
        self.assertEqual(t.strftime("%m"), "03")

        # A naive object replaces %z, %:z and %Z w/ empty strings.
        self.assertEqual(t.strftime("'%z' '%:z' '%Z'"), "'' '' ''")

        #make sure that invalid format specifiers are handled correctly
        #self.assertRaises(ValueError, t.strftime, "%e")
        #self.assertRaises(ValueError, t.strftime, "%")
        #self.assertRaises(ValueError, t.strftime, "%#")

        #oh well, some systems just ignore those invalid ones.
        #at least, exercise them to make sure that no crashes
        #are generated
        for f in ["%e", "%", "%#"]:
            try:
                t.strftime(f)
            except ValueError:
                pass

        # bpo-34482: Check that surrogates don't cause a crash.
        try:
            t.strftime('%y\u0800%m')
        except UnicodeEncodeError:
            pass

        #check that this standard extension works
        t.strftime("%f")

        # bpo-41260: The parameter was named "fmt" in the pure python impl.
        t.strftime(format="%f")

    def test_strftime_trailing_percent(self):
        # bpo-35066: Make sure trailing '%' doesn't cause datetime's strftime to
        # complain. Different libcs have different handling of trailing
        # percents, so we simply check datetime's strftime acts the same as
        # time.strftime.
        t = self.theclass(2005, 3, 2)
        try:
            _time.strftime('%')
        except ValueError:
            self.skipTest('time module does not support trailing %')
        self.assertEqual(t.strftime('%'), _time.strftime('%', t.timetuple()))
        self.assertEqual(
            t.strftime("m:%m d:%d y:%y %"),
            _time.strftime("m:03 d:02 y:05 %", t.timetuple()),
        )

    def test_format(self):
        dt = self.theclass(2007, 9, 10)
        self.assertEqual(dt.__format__(''), str(dt))

        with self.assertRaisesRegex(TypeError, 'must be str, not int'):
            dt.__format__(123)

        # check that a derived class's __str__() gets called
        class A(self.theclass):
            def __str__(self):
                return 'A'
        a = A(2007, 9, 10)
        self.assertEqual(a.__format__(''), 'A')

        # check that a derived class's strftime gets called
        class B(self.theclass):
            def strftime(self, format_spec):
                return 'B'
        b = B(2007, 9, 10)
        self.assertEqual(b.__format__(''), str(dt))

        for fmt in ["m:%m d:%d y:%y",
                    "m:%m d:%d y:%y H:%H M:%M S:%S",
                    "%z %:z %Z",
                    ]:
            self.assertEqual(dt.__format__(fmt), dt.strftime(fmt))
            self.assertEqual(a.__format__(fmt), dt.strftime(fmt))
            self.assertEqual(b.__format__(fmt), 'B')

    def test_resolution_info(self):
        # XXX: Should min and max respect subclassing?
        if issubclass(self.theclass, datetime):
            expected_class = datetime
        else:
            expected_class = date
        self.assertIsInstance(self.theclass.min, expected_class)
        self.assertIsInstance(self.theclass.max, expected_class)
        self.assertIsInstance(self.theclass.resolution, timedelta)
        self.assertTrue(self.theclass.max > self.theclass.min)

    def test_extreme_timedelta(self):
        big = self.theclass.max - self.theclass.min
        # 3652058 days, 23 hours, 59 minutes, 59 seconds, 999999 microseconds
        n = (big.days*24*3600 + big.seconds)*1000000 + big.microseconds
        # n == 315537897599999999 ~= 2**58.13
        justasbig = timedelta(0, 0, n)
        self.assertEqual(big, justasbig)
        self.assertEqual(self.theclass.min + big, self.theclass.max)
        self.assertEqual(self.theclass.max - big, self.theclass.min)

    def test_timetuple(self):
        for i in range(7):
            # January 2, 1956 is a Monday (0)
            d = self.theclass(1956, 1, 2+i)
            t = d.timetuple()
            self.assertEqual(t, (1956, 1, 2+i, 0, 0, 0, i, 2+i, -1))
            # February 1, 1956 is a Wednesday (2)
            d = self.theclass(1956, 2, 1+i)
            t = d.timetuple()
            self.assertEqual(t, (1956, 2, 1+i, 0, 0, 0, (2+i)%7, 32+i, -1))
            # March 1, 1956 is a Thursday (3), and is the 31+29+1 = 61st day
            # of the year.
            d = self.theclass(1956, 3, 1+i)
            t = d.timetuple()
            self.assertEqual(t, (1956, 3, 1+i, 0, 0, 0, (3+i)%7, 61+i, -1))
            self.assertEqual(t.tm_year, 1956)
            self.assertEqual(t.tm_mon, 3)
            self.assertEqual(t.tm_mday, 1+i)
            self.assertEqual(t.tm_hour, 0)
            self.assertEqual(t.tm_min, 0)
            self.assertEqual(t.tm_sec, 0)
            self.assertEqual(t.tm_wday, (3+i)%7)
            self.assertEqual(t.tm_yday, 61+i)
            self.assertEqual(t.tm_isdst, -1)

    def test_pickling(self):
        args = 6, 7, 23
        orig = self.theclass(*args)
        for pickler, unpickler, proto in pickle_choices:
            green = pickler.dumps(orig, proto)
            derived = unpickler.loads(green)
            self.assertEqual(orig, derived)
        self.assertEqual(orig.__reduce__(), orig.__reduce_ex__(2))

    def test_compat_unpickle(self):
        tests = [
            b"cdatetime\ndate\n(S'\\x07\\xdf\\x0b\\x1b'\ntR.",
            b'cdatetime\ndate\n(U\x04\x07\xdf\x0b\x1btR.',
            b'\x80\x02cdatetime\ndate\nU\x04\x07\xdf\x0b\x1b\x85R.',
        ]
        args = 2015, 11, 27
        expected = self.theclass(*args)
        for data in tests:
            for loads in pickle_loads:
                derived = loads(data, encoding='latin1')
                self.assertEqual(derived, expected)

    def test_compare(self):
        t1 = self.theclass(2, 3, 4)
        t2 = self.theclass(2, 3, 4)
        self.assertEqual(t1, t2)
        self.assertTrue(t1 <= t2)
        self.assertTrue(t1 >= t2)
        self.assertFalse(t1 != t2)
        self.assertFalse(t1 < t2)
        self.assertFalse(t1 > t2)

        for args in (3, 3, 3), (2, 4, 4), (2, 3, 5):
            t2 = self.theclass(*args)   # this is larger than t1
            self.assertTrue(t1 < t2)
            self.assertTrue(t2 > t1)
            self.assertTrue(t1 <= t2)
            self.assertTrue(t2 >= t1)
            self.assertTrue(t1 != t2)
            self.assertTrue(t2 != t1)
            self.assertFalse(t1 == t2)
            self.assertFalse(t2 == t1)
            self.assertFalse(t1 > t2)
            self.assertFalse(t2 < t1)
            self.assertFalse(t1 >= t2)
            self.assertFalse(t2 <= t1)

        for badarg in OTHERSTUFF:
            self.assertEqual(t1 == badarg, False)
            self.assertEqual(t1 != badarg, True)
            self.assertEqual(badarg == t1, False)
            self.assertEqual(badarg != t1, True)

            self.assertRaises(TypeError, lambda: t1 < badarg)
            self.assertRaises(TypeError, lambda: t1 > badarg)
            self.assertRaises(TypeError, lambda: t1 >= badarg)
            self.assertRaises(TypeError, lambda: badarg <= t1)
            self.assertRaises(TypeError, lambda: badarg < t1)
            self.assertRaises(TypeError, lambda: badarg > t1)
            self.assertRaises(TypeError, lambda: badarg >= t1)

    def test_mixed_compare(self):
        our = self.theclass(2000, 4, 5)

        # Our class can be compared for equality to other classes
        self.assertEqual(our == 1, False)
        self.assertEqual(1 == our, False)
        self.assertEqual(our != 1, True)
        self.assertEqual(1 != our, True)

        # But the ordering is undefined
        self.assertRaises(TypeError, lambda: our < 1)
        self.assertRaises(TypeError, lambda: 1 < our)

        # Repeat those tests with a different class

        class SomeClass:
            pass

        their = SomeClass()
        self.assertEqual(our == their, False)
        self.assertEqual(their == our, False)
        self.assertEqual(our != their, True)
        self.assertEqual(their != our, True)
        self.assertRaises(TypeError, lambda: our < their)
        self.assertRaises(TypeError, lambda: their < our)

    def test_bool(self):
        # All dates are considered true.
        self.assertTrue(self.theclass.min)
        self.assertTrue(self.theclass.max)

    def check_strftime_y2k(self, specifier):
        # Test that years less than 1000 are 0-padded; note that the beginning
        # of an ISO 8601 year may fall in an ISO week of the year before, and
        # therefore needs an offset of -1 when formatting with '%G'.
        dataset = (
            (1, 0),
            (49, -1),
            (70, 0),
            (99, 0),
            (100, -1),
            (999, 0),
            (1000, 0),
            (1970, 0),
        )
        for year, g_offset in dataset:
            with self.subTest(year=year, specifier=specifier):
                d = self.theclass(year, 1, 1)
                if specifier == 'G':
                    year += g_offset
                if specifier == 'C':
                    expected = f"{year // 100:02d}"
                else:
                    expected = f"{year:04d}"
                    if specifier == 'F':
                        expected += f"-01-01"
                self.assertEqual(d.strftime(f"%{specifier}"), expected)

    def test_strftime_y2k(self):
        self.check_strftime_y2k('Y')
        self.check_strftime_y2k('G')

    def test_strftime_y2k_c99(self):
        # CPython requires C11; specifiers new in C99 must work.
        # (Other implementations may want to disable this test.)
        self.check_strftime_y2k('F')
        self.check_strftime_y2k('C')

    def test_replace(self):
        cls = self.theclass
        args = [1, 2, 3]
        base = cls(*args)
        self.assertEqual(base.replace(), base)
        self.assertEqual(copy.replace(base), base)

        changes = (("year", 2),
                   ("month", 3),
                   ("day", 4))
        for i, (name, newval) in enumerate(changes):
            newargs = args[:]
            newargs[i] = newval
            expected = cls(*newargs)
            self.assertEqual(base.replace(**{name: newval}), expected)
            self.assertEqual(copy.replace(base, **{name: newval}), expected)

        # Out of bounds.
        base = cls(2000, 2, 29)
        self.assertRaises(ValueError, base.replace, year=2001)
        self.assertRaises(ValueError, copy.replace, base, year=2001)

    def test_subclass_replace(self):
        class DateSubclass(self.theclass):
            def __new__(cls, *args, **kwargs):
                result = self.theclass.__new__(cls, *args, **kwargs)
                result.extra = 7
                return result

        dt = DateSubclass(2012, 1, 1)

        test_cases = [
            ('self.replace', dt.replace(year=2013)),
            ('copy.replace', copy.replace(dt, year=2013)),
        ]

        for name, res in test_cases:
            with self.subTest(name):
                self.assertIs(type(res), DateSubclass)
                self.assertEqual(res.year, 2013)
                self.assertEqual(res.month, 1)
                self.assertEqual(res.extra, 7)

    def test_subclass_date(self):

        class C(self.theclass):
            theAnswer = 42

            def __new__(cls, *args, **kws):
                temp = kws.copy()
                extra = temp.pop('extra')
                result = self.theclass.__new__(cls, *args, **temp)
                result.extra = extra
                return result

            def newmeth(self, start):
                return start + self.year + self.month

        args = 2003, 4, 14

        dt1 = self.theclass(*args)
        dt2 = C(*args, **{'extra': 7})

        self.assertEqual(dt2.__class__, C)
        self.assertEqual(dt2.theAnswer, 42)
        self.assertEqual(dt2.extra, 7)
        self.assertEqual(dt1.toordinal(), dt2.toordinal())
        self.assertEqual(dt2.newmeth(-7), dt1.year + dt1.month - 7)

    def test_subclass_alternate_constructors(self):
        # Test that alternate constructors call the constructor
        class DateSubclass(self.theclass):
            def __new__(cls, *args, **kwargs):
                result = self.theclass.__new__(cls, *args, **kwargs)
                result.extra = 7

                return result

        args = (2003, 4, 14)
        d_ord = 731319              # Equivalent ordinal date
        d_isoformat = '2003-04-14'  # Equivalent isoformat()

        base_d = DateSubclass(*args)
        self.assertIsInstance(base_d, DateSubclass)
        self.assertEqual(base_d.extra, 7)

        # Timestamp depends on time zone, so we'll calculate the equivalent here
        ts = datetime.combine(base_d, time(0)).timestamp()

        test_cases = [
            ('fromordinal', (d_ord,)),
            ('fromtimestamp', (ts,)),
            ('fromisoformat', (d_isoformat,)),
        ]

        for constr_name, constr_args in test_cases:
            for base_obj in (DateSubclass, base_d):
                # Test both the classmethod and method
                with self.subTest(base_obj_type=type(base_obj),
                                  constr_name=constr_name):
                    constr = getattr(base_obj, constr_name)

                    dt = constr(*constr_args)

                    # Test that it creates the right subclass
                    self.assertIsInstance(dt, DateSubclass)

                    # Test that it's equal to the base object
                    self.assertEqual(dt, base_d)

                    # Test that it called the constructor
                    self.assertEqual(dt.extra, 7)

    def test_pickling_subclass_date(self):

        args = 6, 7, 23
        orig = SubclassDate(*args)
        for pickler, unpickler, proto in pickle_choices:
            green = pickler.dumps(orig, proto)
            derived = unpickler.loads(green)
            self.assertEqual(orig, derived)
            self.assertTrue(isinstance(derived, SubclassDate))

    def test_backdoor_resistance(self):
        # For fast unpickling, the constructor accepts a pickle byte string.
        # This is a low-overhead backdoor.  A user can (by intent or
        # mistake) pass a string directly, which (if it's the right length)
        # will get treated like a pickle, and bypass the normal sanity
        # checks in the constructor.  This can create insane objects.
        # The constructor doesn't want to burn the time to validate all
        # fields, but does check the month field.  This stops, e.g.,
        # datetime.datetime('1995-03-25') from yielding an insane object.
        base = b'1995-03-25'
        if not issubclass(self.theclass, datetime):
            base = base[:4]
        for month_byte in b'9', b'\0', b'\r', b'\xff':
            self.assertRaises(TypeError, self.theclass,
                                         base[:2] + month_byte + base[3:])
        if issubclass(self.theclass, datetime):
            # Good bytes, but bad tzinfo:
            with self.assertRaisesRegex(TypeError, '^bad tzinfo state arg$'):
                self.theclass(bytes([1] * len(base)), 'EST')

        for ord_byte in range(1, 13):
            # This shouldn't blow up because of the month byte alone.  If
            # the implementation changes to do more-careful checking, it may
            # blow up because other fields are insane.
            self.theclass(base[:2] + bytes([ord_byte]) + base[3:])

    def test_valuerror_messages(self):
        pattern = re.compile(
            r"(year|month|day) must be in \d+\.\.\d+, not \d+"
        )
        test_cases = [
            (2009, 13, 1),      # Month out of range
            (2009, 0, 1),       # Month out of range
            (10000, 12, 31),    # Year out of range
            (0, 12, 31),        # Year out of range
        ]
        for case in test_cases:
            with self.subTest(case):
                with self.assertRaisesRegex(ValueError, pattern):
                    self.theclass(*case)

        # days out of range have their own error message, see issue 70647
        with self.assertRaises(ValueError) as msg:
            self.theclass(2009, 1, 32)
        self.assertIn(f"day 32 must be in range 1..31 for month 1 in year 2009", str(msg.exception))

    def test_fromisoformat(self):
        # Test that isoformat() is reversible
        base_dates = [
            (1, 1, 1),
            (1000, 2, 14),
            (1900, 1, 1),
            (2000, 2, 29),
            (2004, 11, 12),
            (2004, 4, 3),
            (2017, 5, 30)
        ]

        for dt_tuple in base_dates:
            dt = self.theclass(*dt_tuple)
            dt_str = dt.isoformat()
            with self.subTest(dt_str=dt_str):
                dt_rt = self.theclass.fromisoformat(dt.isoformat())

                self.assertEqual(dt, dt_rt)

    def test_fromisoformat_date_examples(self):
        examples = [
            ('00010101', self.theclass(1, 1, 1)),
            ('20000101', self.theclass(2000, 1, 1)),
            ('20250102', self.theclass(2025, 1, 2)),
            ('99991231', self.theclass(9999, 12, 31)),
            ('0001-01-01', self.theclass(1, 1, 1)),
            ('2000-01-01', self.theclass(2000, 1, 1)),
            ('2025-01-02', self.theclass(2025, 1, 2)),
            ('9999-12-31', self.theclass(9999, 12, 31)),
            ('2025W01', self.theclass(2024, 12, 30)),
            ('2025-W01', self.theclass(2024, 12, 30)),
            ('2025W014', self.theclass(2025, 1, 2)),
            ('2025-W01-4', self.theclass(2025, 1, 2)),
            ('2026W01', self.theclass(2025, 12, 29)),
            ('2026-W01', self.theclass(2025, 12, 29)),
            ('2026W013', self.theclass(2025, 12, 31)),
            ('2026-W01-3', self.theclass(2025, 12, 31)),
            ('2022W52', self.theclass(2022, 12, 26)),
            ('2022-W52', self.theclass(2022, 12, 26)),
            ('2022W527', self.theclass(2023, 1, 1)),
            ('2022-W52-7', self.theclass(2023, 1, 1)),
            ('2015W534', self.theclass(2015, 12, 31)),      # Has week 53
            ('2015-W53-4', self.theclass(2015, 12, 31)),    # Has week 53
            ('2015-W53-5', self.theclass(2016, 1, 1)),
            ('2020W531', self.theclass(2020, 12, 28)),      # Leap year
            ('2020-W53-1', self.theclass(2020, 12, 28)),    # Leap year
            ('2020-W53-6', self.theclass(2021, 1, 2)),
        ]

        for input_str, expected in examples:
            with self.subTest(input_str=input_str):
                actual = self.theclass.fromisoformat(input_str)
                self.assertEqual(actual, expected)

    def test_fromisoformat_subclass(self):
        class DateSubclass(self.theclass):
            pass

        dt = DateSubclass(2014, 12, 14)

        dt_rt = DateSubclass.fromisoformat(dt.isoformat())

        self.assertIsInstance(dt_rt, DateSubclass)

    def test_fromisoformat_fails(self):
        # Test that fromisoformat() fails on invalid values
        bad_strs = [
            '',                 # Empty string
            '\u0800',           # bpo-34454: Surrogate code point
            '009-03-04',        # Not 10 characters
            '123456789',        # Not a date
            '200a-12-04',       # Invalid character in year
            '2009-1a-04',       # Invalid character in month
            '2009-12-0a',       # Invalid character in day
            '2009-01-32',       # Invalid day
            '2009-02-29',       # Invalid leap day
            '2019-W53-1',       # No week 53 in 2019
            '2020-W54-1',       # No week 54
            '0000-W25-1',       # Invalid year
            '10000-W25-1',      # Invalid year
            '2020-W25-0',       # Invalid day-of-week
            '2020-W25-8',       # Invalid day-of-week
            '٢025-03-09'        # Unicode characters
            '2009\u080002\u080028',     # Separators are surrogate codepoints
        ]

        for bad_str in bad_strs:
            with self.assertRaises(ValueError):
                self.theclass.fromisoformat(bad_str)

    def test_fromisoformat_fails_typeerror(self):
        # Test that fromisoformat fails when passed the wrong type
        bad_types = [b'2009-03-01', None, io.StringIO('2009-03-01')]
        for bad_type in bad_types:
            with self.assertRaises(TypeError):
                self.theclass.fromisoformat(bad_type)

    def test_fromisocalendar(self):
        # For each test case, assert that fromisocalendar is the
        # inverse of the isocalendar function
        dates = [
            (2016, 4, 3),
            (2005, 1, 2),       # (2004, 53, 7)
            (2008, 12, 30),     # (2009, 1, 2)
            (2010, 1, 2),       # (2009, 53, 6)
            (2009, 12, 31),     # (2009, 53, 4)
            (1900, 1, 1),       # Unusual non-leap year (year % 100 == 0)
            (1900, 12, 31),
            (2000, 1, 1),       # Unusual leap year (year % 400 == 0)
            (2000, 12, 31),
            (2004, 1, 1),       # Leap year
            (2004, 12, 31),
            (1, 1, 1),
            (9999, 12, 31),
            (MINYEAR, 1, 1),
            (MAXYEAR, 12, 31),
        ]

        for datecomps in dates:
            with self.subTest(datecomps=datecomps):
                dobj = self.theclass(*datecomps)
                isocal = dobj.isocalendar()

                d_roundtrip = self.theclass.fromisocalendar(*isocal)

                self.assertEqual(dobj, d_roundtrip)

    def test_fromisocalendar_value_errors(self):
        isocals = [
            (2019, 0, 1),
            (2019, -1, 1),
            (2019, 54, 1),
            (2019, 1, 0),
            (2019, 1, -1),
            (2019, 1, 8),
            (2019, 53, 1),
            (10000, 1, 1),
            (0, 1, 1),
            (9999999, 1, 1),
            (2<<32, 1, 1),
            (2019, 2<<32, 1),
            (2019, 1, 2<<32),
        ]

        for isocal in isocals:
            with self.subTest(isocal=isocal):
                with self.assertRaises(ValueError):
                    self.theclass.fromisocalendar(*isocal)

    def test_fromisocalendar_type_errors(self):
        err_txformers = [
            str,
            float,
            lambda x: None,
        ]

        # Take a valid base tuple and transform it to contain one argument
        # with the wrong type. Repeat this for each argument, e.g.
        # [("2019", 1, 1), (2019, "1", 1), (2019, 1, "1"), ...]
        isocals = []
        base = (2019, 1, 1)
        for i in range(3):
            for txformer in err_txformers:
                err_val = list(base)
                err_val[i] = txformer(err_val[i])
                isocals.append(tuple(err_val))

        for isocal in isocals:
            with self.subTest(isocal=isocal):
                with self.assertRaises(TypeError):
                    self.theclass.fromisocalendar(*isocal)


class TZInfoBase:
    """Shared tzinfo-argument-passing tests, mixed into both TestTimeTZ (not
    yet ported) and TestDateTimeTZ (test.datetimetester_tz) -- lives here,
    not in either split module, so a future TestTimeTZ port can import it
    too without duplicating it."""

    def test_argument_passing(self):
        cls = self.theclass
        # A datetime passes itself on, a time passes None.
        class introspective(tzinfo):
            def tzname(self, dt):    return dt and "real" or "none"
            def utcoffset(self, dt):
                return timedelta(minutes = dt and 42 or -42)
            dst = utcoffset

        obj = cls(1, 2, 3, tzinfo=introspective())

        expected = cls is time and "none" or "real"
        self.assertEqual(obj.tzname(), expected)

        expected = timedelta(minutes=(cls is time and -42 or 42))
        self.assertEqual(obj.utcoffset(), expected)
        self.assertEqual(obj.dst(), expected)

    def test_bad_tzinfo_classes(self):
        cls = self.theclass
        self.assertRaises(TypeError, cls, 1, 1, 1, tzinfo=12)

        class NiceTry(object):
            def __init__(self): pass
            def utcoffset(self, dt): pass
        self.assertRaises(TypeError, cls, 1, 1, 1, tzinfo=NiceTry)

        class BetterTry(tzinfo):
            def __init__(self): pass
            def utcoffset(self, dt): pass
        b = BetterTry()
        t = cls(1, 1, 1, tzinfo=b)
        self.assertIs(t.tzinfo, b)

    def test_utc_offset_out_of_bounds(self):
        class Edgy(tzinfo):
            def __init__(self, offset):
                self.offset = timedelta(minutes=offset)
            def utcoffset(self, dt):
                return self.offset

        cls = self.theclass
        for offset, legit in ((-1440, False),
                              (-1439, True),
                              (1439, True),
                              (1440, False)):
            if cls is time:
                t = cls(1, 2, 3, tzinfo=Edgy(offset))
            elif cls is datetime:
                t = cls(6, 6, 6, 1, 2, 3, tzinfo=Edgy(offset))
            else:
                assert 0, "impossible"
            if legit:
                aofs = abs(offset)
                h, m = divmod(aofs, 60)
                tag = "%c%02d:%02d" % (offset < 0 and '-' or '+', h, m)
                if isinstance(t, datetime):
                    t = t.timetz()
                self.assertEqual(str(t), "01:02:03" + tag)
            else:
                self.assertRaises(ValueError, str, t)

    def test_tzinfo_classes(self):
        cls = self.theclass
        class C1(tzinfo):
            def utcoffset(self, dt): return None
            def dst(self, dt): return None
            def tzname(self, dt): return None
        for t in (cls(1, 1, 1),
                  cls(1, 1, 1, tzinfo=None),
                  cls(1, 1, 1, tzinfo=C1())):
            self.assertIsNone(t.utcoffset())
            self.assertIsNone(t.dst())
            self.assertIsNone(t.tzname())

        class C3(tzinfo):
            def utcoffset(self, dt): return timedelta(minutes=-1439)
            def dst(self, dt): return timedelta(minutes=1439)
            def tzname(self, dt): return "aname"
        t = cls(1, 1, 1, tzinfo=C3())
        self.assertEqual(t.utcoffset(), timedelta(minutes=-1439))
        self.assertEqual(t.dst(), timedelta(minutes=1439))
        self.assertEqual(t.tzname(), "aname")

        # Wrong types.
        class C4(tzinfo):
            def utcoffset(self, dt): return "aname"
            def dst(self, dt): return 7
            def tzname(self, dt): return 0
        t = cls(1, 1, 1, tzinfo=C4())
        self.assertRaises(TypeError, t.utcoffset)
        self.assertRaises(TypeError, t.dst)
        self.assertRaises(TypeError, t.tzname)

        # Offset out of range.
        class C6(tzinfo):
            def utcoffset(self, dt): return timedelta(hours=-24)
            def dst(self, dt): return timedelta(hours=24)
        t = cls(1, 1, 1, tzinfo=C6())
        self.assertRaises(ValueError, t.utcoffset)
        self.assertRaises(ValueError, t.dst)

        # Not a whole number of seconds.
        class C7(tzinfo):
            def utcoffset(self, dt): return timedelta(microseconds=61)
            def dst(self, dt): return timedelta(microseconds=-81)
        t = cls(1, 1, 1, tzinfo=C7())
        self.assertEqual(t.utcoffset(), timedelta(microseconds=61))
        self.assertEqual(t.dst(), timedelta(microseconds=-81))

    def test_aware_compare(self):
        cls = self.theclass

        # Ensure that utcoffset() gets ignored if the comparands have
        # the same tzinfo member.
        class OperandDependentOffset(tzinfo):
            def utcoffset(self, t):
                if t.minute < 10:
                    # d0 and d1 equal after adjustment
                    return timedelta(minutes=t.minute)
                else:
                    # d2 off in the weeds
                    return timedelta(minutes=59)

        base = cls(8, 9, 10, tzinfo=OperandDependentOffset())
        d0 = base.replace(minute=3)
        d1 = base.replace(minute=9)
        d2 = base.replace(minute=11)
        for x in d0, d1, d2:
            for y in d0, d1, d2:
                for op in lt, le, gt, ge, eq, ne:
                    got = op(x, y)
                    expected = op(x.minute, y.minute)
                    self.assertEqual(got, expected)

        # However, if they're different members, uctoffset is not ignored.
        # Note that a time can't actually have an operand-dependent offset,
        # though (and time.utcoffset() passes None to tzinfo.utcoffset()),
        # so skip this test for time.
        if cls is not time:
            d0 = base.replace(minute=3, tzinfo=OperandDependentOffset())
            d1 = base.replace(minute=9, tzinfo=OperandDependentOffset())
            d2 = base.replace(minute=11, tzinfo=OperandDependentOffset())
            for x in d0, d1, d2:
                for y in d0, d1, d2:
                    got = (x > y) - (x < y)
                    if (x is d0 or x is d1) and (y is d0 or y is d1):
                        expected = 0
                    elif x is y is d2:
                        expected = 0
                    elif x is d2:
                        expected = -1
                    else:
                        assert y is d2
                        expected = 1
                    self.assertEqual(got, expected)


if __name__ == "__main__":
    unittest.main()
