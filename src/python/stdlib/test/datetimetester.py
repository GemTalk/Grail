"""Test the datetime module — GRAIL-TRIMMED subset of CPython 3.14's
datetimetester.  Only the self-contained core classes (TestModule,
TestTZInfo, TestTimeZone, TestTimeDelta) are kept so the module compiles
within Grail's per-import budget; the very large TestDate/TestDateTime/
TZ classes are omitted for now.  Runs against Grail's native datetime.

Grail adaptations: trimmed imports; local LARGEST/SMALLEST sentinels
(absent from Grail's test.support); lone-surrogate string literals
neutralized (Grail cannot compile them)."""
import copy
import pickle
import random
import sys
import unittest
import warnings

from operator import lt, le, gt, ge, eq, ne, truediv, floordiv, mod

from test import support
from test.support import is_resource_enabled, ALWAYS_EQ

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
        for tz in [self.ACDT, self.EST, timezone.utc,
                   timezone.min, timezone.max]:
            # test round-trip
            tzrep = repr(tz)
            self.assertEqual(tz, eval(tzrep))

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
            td2 = eval(s)
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



if __name__ == "__main__":
    unittest.main()
