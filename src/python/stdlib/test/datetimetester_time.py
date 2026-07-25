"""GRAIL split-out: CPython 3.14 datetimetester's *time* tests.

Separate module for the same reason as datetimetester_datetime: the
combined tester exceeds Grail's whole-module compile budget.  TestTime
is self-contained (mixes in HarmlessMixedComparison only) and imports
the shared helpers from test.datetimetester.  Runs against Grail's
native datetime.

Lone-surrogate string literals are neutralized (as in the base tester;
Grail cannot compile them)."""
import copy
import pickle
import unittest

import time as _time

from operator import lt, le, gt, ge, eq, ne, truediv, floordiv, mod

import datetime as datetime_module
from datetime import timedelta
from datetime import tzinfo
from datetime import time
from datetime import timezone
from datetime import datetime
try:
    from datetime import UTC
except ImportError:
    UTC = timezone.utc

from test.datetimetester import (
    HOUR,
    MINUTE,
    OTHERSTUFF,
    HarmlessMixedComparison,
    pickle_choices,
    pickle_loads,
)


class SubclassTime(time):
    sub_var = 1

class TestTime(HarmlessMixedComparison, unittest.TestCase):

    theclass = time

    def test_basic_attributes(self):
        t = self.theclass(12, 0)
        self.assertEqual(t.hour, 12)
        self.assertEqual(t.minute, 0)
        self.assertEqual(t.second, 0)
        self.assertEqual(t.microsecond, 0)

    def test_basic_attributes_nonzero(self):
        # Make sure all attributes are non-zero so bugs in
        # bit-shifting access show up.
        t = self.theclass(12, 59, 59, 8000)
        self.assertEqual(t.hour, 12)
        self.assertEqual(t.minute, 59)
        self.assertEqual(t.second, 59)
        self.assertEqual(t.microsecond, 8000)

    def test_roundtrip(self):
        t = self.theclass(1, 2, 3, 4)

        # Verify t -> string -> time identity.
        s = repr(t)
        self.assertStartsWith(s, 'datetime.')
        s = s[9:]
        t2 = eval(s)
        self.assertEqual(t, t2)

        # Verify identity via reconstructing from pieces.
        t2 = self.theclass(t.hour, t.minute, t.second,
                           t.microsecond)
        self.assertEqual(t, t2)

    def test_comparing(self):
        args = [1, 2, 3, 4]
        t1 = self.theclass(*args)
        t2 = self.theclass(*args)
        self.assertEqual(t1, t2)
        self.assertTrue(t1 <= t2)
        self.assertTrue(t1 >= t2)
        self.assertFalse(t1 != t2)
        self.assertFalse(t1 < t2)
        self.assertFalse(t1 > t2)

        for i in range(len(args)):
            newargs = args[:]
            newargs[i] = args[i] + 1
            t2 = self.theclass(*newargs)   # this is larger than t1
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

    def test_bad_constructor_arguments(self):
        # bad hours
        self.theclass(0, 0)    # no exception
        self.theclass(23, 0)   # no exception
        self.assertRaises(ValueError, self.theclass, -1, 0)
        self.assertRaises(ValueError, self.theclass, 24, 0)
        # bad minutes
        self.theclass(23, 0)    # no exception
        self.theclass(23, 59)   # no exception
        self.assertRaises(ValueError, self.theclass, 23, -1)
        self.assertRaises(ValueError, self.theclass, 23, 60)
        # bad seconds
        self.theclass(23, 59, 0)    # no exception
        self.theclass(23, 59, 59)   # no exception
        self.assertRaises(ValueError, self.theclass, 23, 59, -1)
        self.assertRaises(ValueError, self.theclass, 23, 59, 60)
        # bad microseconds
        self.theclass(23, 59, 59, 0)        # no exception
        self.theclass(23, 59, 59, 999999)   # no exception
        self.assertRaises(ValueError, self.theclass, 23, 59, 59, -1)
        self.assertRaises(ValueError, self.theclass, 23, 59, 59, 1000000)

    def test_hash_equality(self):
        d = self.theclass(23, 30, 17)
        e = self.theclass(23, 30, 17)
        self.assertEqual(d, e)
        self.assertEqual(hash(d), hash(e))

        dic = {d: 1}
        dic[e] = 2
        self.assertEqual(len(dic), 1)
        self.assertEqual(dic[d], 2)
        self.assertEqual(dic[e], 2)

        d = self.theclass(0,  5, 17)
        e = self.theclass(0,  5, 17)
        self.assertEqual(d, e)
        self.assertEqual(hash(d), hash(e))

        dic = {d: 1}
        dic[e] = 2
        self.assertEqual(len(dic), 1)
        self.assertEqual(dic[d], 2)
        self.assertEqual(dic[e], 2)

    def test_isoformat(self):
        t = self.theclass(4, 5, 1, 123)
        self.assertEqual(t.isoformat(), "04:05:01.000123")
        self.assertEqual(t.isoformat(), str(t))

        t = self.theclass()
        self.assertEqual(t.isoformat(), "00:00:00")
        self.assertEqual(t.isoformat(), str(t))

        t = self.theclass(microsecond=1)
        self.assertEqual(t.isoformat(), "00:00:00.000001")
        self.assertEqual(t.isoformat(), str(t))

        t = self.theclass(microsecond=10)
        self.assertEqual(t.isoformat(), "00:00:00.000010")
        self.assertEqual(t.isoformat(), str(t))

        t = self.theclass(microsecond=100)
        self.assertEqual(t.isoformat(), "00:00:00.000100")
        self.assertEqual(t.isoformat(), str(t))

        t = self.theclass(microsecond=1000)
        self.assertEqual(t.isoformat(), "00:00:00.001000")
        self.assertEqual(t.isoformat(), str(t))

        t = self.theclass(microsecond=10000)
        self.assertEqual(t.isoformat(), "00:00:00.010000")
        self.assertEqual(t.isoformat(), str(t))

        t = self.theclass(microsecond=100000)
        self.assertEqual(t.isoformat(), "00:00:00.100000")
        self.assertEqual(t.isoformat(), str(t))

        t = self.theclass(hour=12, minute=34, second=56, microsecond=123456)
        self.assertEqual(t.isoformat(timespec='hours'), "12")
        self.assertEqual(t.isoformat(timespec='minutes'), "12:34")
        self.assertEqual(t.isoformat(timespec='seconds'), "12:34:56")
        self.assertEqual(t.isoformat(timespec='milliseconds'), "12:34:56.123")
        self.assertEqual(t.isoformat(timespec='microseconds'), "12:34:56.123456")
        self.assertEqual(t.isoformat(timespec='auto'), "12:34:56.123456")
        self.assertRaises(ValueError, t.isoformat, timespec='monkey')
        # bpo-34482: Check that surrogates are handled properly.
        self.assertRaises(ValueError, t.isoformat, timespec='\u0800')

        t = self.theclass(hour=12, minute=34, second=56, microsecond=999500)
        self.assertEqual(t.isoformat(timespec='milliseconds'), "12:34:56.999")

        t = self.theclass(hour=12, minute=34, second=56, microsecond=0)
        self.assertEqual(t.isoformat(timespec='milliseconds'), "12:34:56.000")
        self.assertEqual(t.isoformat(timespec='microseconds'), "12:34:56.000000")
        self.assertEqual(t.isoformat(timespec='auto'), "12:34:56")

    def test_isoformat_timezone(self):
        tzoffsets = [
            ('05:00', timedelta(hours=5)),
            ('02:00', timedelta(hours=2)),
            ('06:27', timedelta(hours=6, minutes=27)),
            ('12:32:30', timedelta(hours=12, minutes=32, seconds=30)),
            ('02:04:09.123456', timedelta(hours=2, minutes=4, seconds=9, microseconds=123456))
        ]

        tzinfos = [
            ('', None),
            ('+00:00', timezone.utc),
            ('+00:00', timezone(timedelta(0))),
        ]

        tzinfos += [
            (prefix + expected, timezone(sign * td))
            for expected, td in tzoffsets
            for prefix, sign in [('-', -1), ('+', 1)]
        ]

        t_base = self.theclass(12, 37, 9)
        exp_base = '12:37:09'

        for exp_tz, tzi in tzinfos:
            t = t_base.replace(tzinfo=tzi)
            exp = exp_base + exp_tz
            with self.subTest(tzi=tzi):
                assert t.isoformat() == exp

    def test_1653736(self):
        # verify it doesn't accept extra keyword arguments
        t = self.theclass(second=1)
        self.assertRaises(TypeError, t.isoformat, foo=3)

    def test_strftime(self):
        t = self.theclass(1, 2, 3, 4)
        self.assertEqual(t.strftime('%H %M %S %f'), "01 02 03 000004")
        # A naive object replaces %z, %:z and %Z with empty strings.
        self.assertEqual(t.strftime("'%z' '%:z' '%Z'"), "'' '' ''")

        # bpo-34482: Check that surrogates don't cause a crash.
        try:
            t.strftime('%H\u0800%M')
        except UnicodeEncodeError:
            pass

        # gh-85432: The parameter was named "fmt" in the pure-Python impl.
        t.strftime(format="%f")

    def test_strftime_special(self):
        t = self.theclass(1, 2, 3, 4)
        s1 = t.strftime('%I%p%Z')
        s2 = t.strftime('%X')
        # gh-52551, gh-78662: Unicode strings should pass through strftime,
        # independently from locale.
        self.assertEqual(t.strftime('\U0001f40d'), '\U0001f40d')
        self.assertEqual(t.strftime('\U0001f4bb%I%p%Z\U0001f40d%X'), f'\U0001f4bb{s1}\U0001f40d{s2}')
        self.assertEqual(t.strftime('%I%p%Z\U0001f4bb%X\U0001f40d'), f'{s1}\U0001f4bb{s2}\U0001f40d')
        # Lone surrogates should pass through.
        self.assertEqual(t.strftime('\u0800'), '\u0800')
        self.assertEqual(t.strftime('\u0800'), '\u0800')
        self.assertEqual(t.strftime('\u0800%I%p%Z\u0800%X'), f'\u0800{s1}\u0800{s2}')
        self.assertEqual(t.strftime('%I%p%Z\u0800%X\u0800'), f'{s1}\u0800{s2}\u0800')
        self.assertEqual(t.strftime('%I%p%Z\u0800%X\u0800'), f'{s1}\u0800{s2}\u0800')
        # Surrogate pairs should not recombine.
        self.assertEqual(t.strftime('\u0800\u0800'), '\u0800\u0800')
        self.assertEqual(t.strftime('%I%p%Z\u0800\u0800%X'), f'{s1}\u0800\u0800{s2}')
        # Surrogate-escaped bytes should not recombine.
        self.assertEqual(t.strftime('\u0800\u0800\u0800\u0800'), '\u0800\u0800\u0800\u0800')
        self.assertEqual(t.strftime('%I%p%Z\u0800\u0800\u0800\u0800%X'), f'{s1}\u0800\u0800\u0800\u0800{s2}')
        # gh-124531: The null character should not terminate the format string.
        self.assertEqual(t.strftime('\0'), '\0')
        self.assertEqual(t.strftime('\0'*1000), '\0'*1000)
        self.assertEqual(t.strftime('\0%I%p%Z\0%X'), f'\0{s1}\0{s2}')
        self.assertEqual(t.strftime('%I%p%Z\0%X\0'), f'{s1}\0{s2}\0')

    def test_format(self):
        t = self.theclass(1, 2, 3, 4)
        self.assertEqual(t.__format__(''), str(t))

        with self.assertRaisesRegex(TypeError, 'must be str, not int'):
            t.__format__(123)

        # check that a derived class's __str__() gets called
        class A(self.theclass):
            def __str__(self):
                return 'A'
        a = A(1, 2, 3, 4)
        self.assertEqual(a.__format__(''), 'A')

        # check that a derived class's strftime gets called
        class B(self.theclass):
            def strftime(self, format_spec):
                return 'B'
        b = B(1, 2, 3, 4)
        self.assertEqual(b.__format__(''), str(t))

        for fmt in ['%H %M %S',
                    ]:
            self.assertEqual(t.__format__(fmt), t.strftime(fmt))
            self.assertEqual(a.__format__(fmt), t.strftime(fmt))
            self.assertEqual(b.__format__(fmt), 'B')

    def test_str(self):
        self.assertEqual(str(self.theclass(1, 2, 3, 4)), "01:02:03.000004")
        self.assertEqual(str(self.theclass(10, 2, 3, 4000)), "10:02:03.004000")
        self.assertEqual(str(self.theclass(0, 2, 3, 400000)), "00:02:03.400000")
        self.assertEqual(str(self.theclass(12, 2, 3, 0)), "12:02:03")
        self.assertEqual(str(self.theclass(23, 15, 0, 0)), "23:15:00")

    def test_repr(self):
        name = 'datetime.' + self.theclass.__name__
        self.assertEqual(repr(self.theclass(1, 2, 3, 4)),
                         "%s(1, 2, 3, 4)" % name)
        self.assertEqual(repr(self.theclass(10, 2, 3, 4000)),
                         "%s(10, 2, 3, 4000)" % name)
        self.assertEqual(repr(self.theclass(0, 2, 3, 400000)),
                         "%s(0, 2, 3, 400000)" % name)
        self.assertEqual(repr(self.theclass(12, 2, 3, 0)),
                         "%s(12, 2, 3)" % name)
        self.assertEqual(repr(self.theclass(23, 15, 0, 0)),
                         "%s(23, 15)" % name)

    def test_repr_subclass(self):
        """Subclasses should have bare names in the repr (gh-107773)."""
        td = SubclassTime(hour=1)
        self.assertEqual(repr(td), "SubclassTime(1, 0)")
        td = SubclassTime(hour=2, minute=30)
        self.assertEqual(repr(td), "SubclassTime(2, 30)")
        td = SubclassTime(hour=2, minute=30, second=11)
        self.assertEqual(repr(td), "SubclassTime(2, 30, 11)")
        td = SubclassTime(minute=30, second=11, fold=0)
        self.assertEqual(repr(td), "SubclassTime(0, 30, 11)")
        td = SubclassTime(minute=30, second=11, fold=1)
        self.assertEqual(repr(td), "SubclassTime(0, 30, 11, fold=1)")

    def test_resolution_info(self):
        self.assertIsInstance(self.theclass.min, self.theclass)
        self.assertIsInstance(self.theclass.max, self.theclass)
        self.assertIsInstance(self.theclass.resolution, timedelta)
        self.assertTrue(self.theclass.max > self.theclass.min)

    def test_pickling(self):
        args = 20, 59, 16, 64**2
        orig = self.theclass(*args)
        for pickler, unpickler, proto in pickle_choices:
            green = pickler.dumps(orig, proto)
            derived = unpickler.loads(green)
            self.assertEqual(orig, derived)
        self.assertEqual(orig.__reduce__(), orig.__reduce_ex__(2))

    def test_pickling_subclass_time(self):
        args = 20, 59, 16, 64**2
        orig = SubclassTime(*args)
        for pickler, unpickler, proto in pickle_choices:
            green = pickler.dumps(orig, proto)
            derived = unpickler.loads(green)
            self.assertEqual(orig, derived)
            self.assertTrue(isinstance(derived, SubclassTime))

    def test_compat_unpickle(self):
        tests = [
            (b"cdatetime\ntime\n(S'\\x14;\\x10\\x00\\x10\\x00'\ntR.",
             (20, 59, 16, 64**2)),
            (b'cdatetime\ntime\n(U\x06\x14;\x10\x00\x10\x00tR.',
             (20, 59, 16, 64**2)),
            (b'\x80\x02cdatetime\ntime\nU\x06\x14;\x10\x00\x10\x00\x85R.',
             (20, 59, 16, 64**2)),
            (b"cdatetime\ntime\n(S'\\x14;\\x19\\x00\\x10\\x00'\ntR.",
             (20, 59, 25, 64**2)),
            (b'cdatetime\ntime\n(U\x06\x14;\x19\x00\x10\x00tR.',
             (20, 59, 25, 64**2)),
            (b'\x80\x02cdatetime\ntime\nU\x06\x14;\x19\x00\x10\x00\x85R.',
             (20, 59, 25, 64**2)),
        ]
        for i, (data, args) in enumerate(tests):
            with self.subTest(i=i):
                expected = self.theclass(*args)
                for loads in pickle_loads:
                    derived = loads(data, encoding='latin1')
                    self.assertEqual(derived, expected)

    def test_strptime(self):
        # bpo-34482: Check that surrogates are handled properly.
        inputs = [
            (self.theclass(13, 2, 47, 197000), '13:02:47.197', '%H:%M:%S.%f'),
            (self.theclass(13, 2, 47, 197000), '13:02\u080047.197', '%H:%M\u0800%S.%f'),
            (self.theclass(13, 2, 47, 197000), '13\u080002:47.197', '%H\u0800%M:%S.%f'),
        ]
        for expected, string, format in inputs:
            with self.subTest(string=string, format=format):
                got = self.theclass.strptime(string, format)
                self.assertEqual(expected, got)
                self.assertIs(type(got), self.theclass)

    def test_strptime_tz(self):
        strptime = self.theclass.strptime
        self.assertEqual(strptime("+0002", "%z").utcoffset(), 2 * MINUTE)
        self.assertEqual(strptime("-0002", "%z").utcoffset(), -2 * MINUTE)
        self.assertEqual(
            strptime("-00:02:01.000003", "%z").utcoffset(),
            -timedelta(minutes=2, seconds=1, microseconds=3)
        )
        # Only local timezone and UTC are supported
        for tzseconds, tzname in ((0, 'UTC'), (0, 'GMT'),
                                 (-_time.timezone, _time.tzname[0])):
            if tzseconds < 0:
                sign = '-'
                seconds = -tzseconds
            else:
                sign ='+'
                seconds = tzseconds
            hours, minutes = divmod(seconds//60, 60)
            tstr = "{}{:02d}{:02d} {}".format(sign, hours, minutes, tzname)
            with self.subTest(tstr=tstr):
                t = strptime(tstr, "%z %Z")
                self.assertEqual(t.utcoffset(), timedelta(seconds=tzseconds))
                self.assertEqual(t.tzname(), tzname)
                self.assertIs(type(t), self.theclass)

        # Can produce inconsistent time
        tstr, fmt = "+1234 UTC", "%z %Z"
        t = strptime(tstr, fmt)
        self.assertEqual(t.utcoffset(), 12 * HOUR + 34 * MINUTE)
        self.assertEqual(t.tzname(), 'UTC')
        # yet will roundtrip
        self.assertEqual(t.strftime(fmt), tstr)

        # Produce naive time if no %z is provided
        self.assertEqual(strptime("UTC", "%Z").tzinfo, None)

    def test_strptime_errors(self):
        for tzstr in ("-2400", "-000", "z"):
            with self.assertRaises(ValueError):
                self.theclass.strptime(tzstr, "%z")

    def test_strptime_single_digit(self):
        # bpo-34903: Check that single digit times are allowed.
        t = self.theclass(4, 5, 6)
        inputs = [
            ('%H', '4:05:06',   '%H:%M:%S',   t),
            ('%M', '04:5:06',   '%H:%M:%S',   t),
            ('%S', '04:05:6',   '%H:%M:%S',   t),
            ('%I', '4am:05:06', '%I%p:%M:%S', t),
        ]
        for reason, string, format, target in inputs:
            reason = 'test single digit ' + reason
            with self.subTest(reason=reason,
                              string=string,
                              format=format,
                              target=target):
                newdate = self.theclass.strptime(string, format)
                self.assertEqual(newdate, target, msg=reason)

    def test_bool(self):
        # time is always True.
        cls = self.theclass
        self.assertTrue(cls(1))
        self.assertTrue(cls(0, 1))
        self.assertTrue(cls(0, 0, 1))
        self.assertTrue(cls(0, 0, 0, 1))
        self.assertTrue(cls(0))
        self.assertTrue(cls())

    def test_replace(self):
        cls = self.theclass
        args = [1, 2, 3, 4]
        base = cls(*args)
        self.assertEqual(base.replace(), base)
        self.assertEqual(copy.replace(base), base)

        changes = (("hour", 5),
                   ("minute", 6),
                   ("second", 7),
                   ("microsecond", 8))
        for i, (name, newval) in enumerate(changes):
            newargs = args[:]
            newargs[i] = newval
            expected = cls(*newargs)
            self.assertEqual(base.replace(**{name: newval}), expected)
            self.assertEqual(copy.replace(base, **{name: newval}), expected)

        # Out of bounds.
        base = cls(1)
        self.assertRaises(ValueError, base.replace, hour=24)
        self.assertRaises(ValueError, base.replace, minute=-1)
        self.assertRaises(ValueError, base.replace, second=100)
        self.assertRaises(ValueError, base.replace, microsecond=1000000)
        self.assertRaises(ValueError, copy.replace, base, hour=24)
        self.assertRaises(ValueError, copy.replace, base, minute=-1)
        self.assertRaises(ValueError, copy.replace, base, second=100)
        self.assertRaises(ValueError, copy.replace, base, microsecond=1000000)

    def test_subclass_replace(self):
        class TimeSubclass(self.theclass):
            def __new__(cls, *args, **kwargs):
                result = self.theclass.__new__(cls, *args, **kwargs)
                result.extra = 7
                return result

        ctime = TimeSubclass(12, 30)
        ctime2 = TimeSubclass(12, 30, fold=1)

        test_cases = [
            ('self.replace', ctime.replace(hour=10), 0),
            ('self.replace', ctime2.replace(hour=10), 1),
            ('copy.replace', copy.replace(ctime, hour=10), 0),
            ('copy.replace', copy.replace(ctime2, hour=10), 1),
        ]

        for name, res, fold in test_cases:
            with self.subTest(name, fold=fold):
                self.assertIs(type(res), TimeSubclass)
                self.assertEqual(res.hour, 10)
                self.assertEqual(res.minute, 30)
                self.assertEqual(res.extra, 7)
                self.assertEqual(res.fold, fold)

    def test_subclass_time(self):

        class C(self.theclass):
            theAnswer = 42

            def __new__(cls, *args, **kws):
                temp = kws.copy()
                extra = temp.pop('extra')
                result = self.theclass.__new__(cls, *args, **temp)
                result.extra = extra
                return result

            def newmeth(self, start):
                return start + self.hour + self.second

        args = 4, 5, 6

        dt1 = self.theclass(*args)
        dt2 = C(*args, **{'extra': 7})

        self.assertEqual(dt2.__class__, C)
        self.assertEqual(dt2.theAnswer, 42)
        self.assertEqual(dt2.extra, 7)
        self.assertEqual(dt1.isoformat(), dt2.isoformat())
        self.assertEqual(dt2.newmeth(-7), dt1.hour + dt1.second - 7)

    def test_backdoor_resistance(self):
        # see TestDate.test_backdoor_resistance().
        base = '2:59.0'
        for hour_byte in ' ', '9', chr(24), '\xff':
            self.assertRaises(TypeError, self.theclass,
                                         hour_byte + base[1:])
        # Good bytes, but bad tzinfo:
        with self.assertRaisesRegex(TypeError, '^bad tzinfo state arg$'):
            self.theclass(bytes([1] * len(base)), 'EST')

# A mixin for classes with a tzinfo= argument.  Subclasses must define
# theclass as a class attribute, and theclass(1, 1, 1, tzinfo=whatever)
# must be legit (which is true for time and datetime).


if __name__ == "__main__":
    unittest.main()
