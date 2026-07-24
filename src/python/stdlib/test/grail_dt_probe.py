# Grail-authored targeted probe of the native datetime module's API surface.
# NOT a vendored CPython file.  Each test exercises ONE feature that the gap
# analysis flagged as possibly-missing.  A PASS means the feature exists and
# matches CPython for a basic case; FAIL/ERROR marks a gap to implement.
import unittest
import pickle

import datetime as dtm
from datetime import date, time, datetime, timedelta, timezone


class TimedeltaProbe(unittest.TestCase):
    def test_repr(self):
        self.assertEqual(repr(timedelta(days=1)), 'datetime.timedelta(days=1)')

    def test_total_ordering(self):
        self.assertTrue(timedelta(0) < timedelta(seconds=1))
        self.assertTrue(timedelta(seconds=1) >= timedelta(0))
        self.assertTrue(timedelta(0) <= timedelta(0))
        self.assertTrue(timedelta(seconds=1) > timedelta(0))

    def test_true_division_by_int(self):
        self.assertEqual(timedelta(hours=1) / 2, timedelta(minutes=30))

    def test_floordiv_and_mod(self):
        self.assertEqual(timedelta(minutes=10) // timedelta(minutes=3), 3)
        self.assertEqual(timedelta(minutes=10) % timedelta(minutes=3), timedelta(minutes=1))

    def test_divmod(self):
        q, r = divmod(timedelta(minutes=10), timedelta(minutes=3))
        self.assertEqual((q, r), (3, timedelta(minutes=1)))

    def test_mul_by_float(self):
        self.assertEqual(timedelta(hours=1) * 2.5, timedelta(hours=2, minutes=30))

    def test_bool(self):
        self.assertFalse(bool(timedelta(0)))
        self.assertTrue(bool(timedelta(microseconds=1)))

    def test_min_max_resolution(self):
        self.assertEqual(timedelta.resolution, timedelta(microseconds=1))
        self.assertTrue(timedelta.min < timedelta.max)


class DateProbe(unittest.TestCase):
    def test_isocalendar(self):
        self.assertEqual(tuple(date(2004, 1, 1).isocalendar()), (2004, 1, 4))

    def test_fromisocalendar(self):
        self.assertEqual(date.fromisocalendar(2004, 1, 4), date(2004, 1, 1))

    def test_timetuple(self):
        self.assertEqual(date(2004, 1, 1).timetuple()[:3], (2004, 1, 1))

    def test_ctime(self):
        self.assertEqual(date(2004, 1, 1).ctime(), 'Thu Jan  1 00:00:00 2004')

    def test_strftime(self):
        self.assertEqual(date(2004, 1, 1).strftime('%Y-%m-%d'), '2004-01-01')

    def test_format(self):
        self.assertEqual('{:%Y}'.format(date(2004, 1, 1)), '2004')

    def test_min_max_resolution(self):
        self.assertEqual(date.min, date(1, 1, 1))
        self.assertEqual(date.max, date(9999, 12, 31))
        self.assertEqual(date.resolution, timedelta(days=1))

    def test_replace(self):
        self.assertEqual(date(2004, 1, 1).replace(year=2005), date(2005, 1, 1))

    def test_pickle(self):
        d = date(2004, 1, 1)
        self.assertEqual(pickle.loads(pickle.dumps(d)), d)


class TimeProbe(unittest.TestCase):
    def test_ordering(self):
        self.assertTrue(time(1, 0) < time(2, 0))

    def test_replace(self):
        self.assertEqual(time(1, 2, 3).replace(hour=5), time(5, 2, 3))

    def test_fold(self):
        self.assertEqual(time(1, 2, 3).fold, 0)

    def test_isoformat_timespec(self):
        self.assertEqual(time(1, 2, 3).isoformat(timespec='minutes'), '01:02')

    def test_strftime(self):
        self.assertEqual(time(1, 2, 3).strftime('%H:%M:%S'), '01:02:03')

    def test_min_max_resolution(self):
        self.assertEqual(time.min, time(0, 0))
        self.assertEqual(time.max, time(23, 59, 59, 999999))

    def test_aware_utcoffset(self):
        t = time(1, 2, 3, tzinfo=timezone.utc)
        self.assertEqual(t.utcoffset(), timedelta(0))
        self.assertEqual(t.tzname(), 'UTC')


class DatetimeProbe(unittest.TestCase):
    def test_combine(self):
        self.assertEqual(datetime.combine(date(2004, 1, 1), time(1, 2, 3)),
                         datetime(2004, 1, 1, 1, 2, 3))

    def test_strptime(self):
        self.assertEqual(datetime.strptime('2004-01-01', '%Y-%m-%d'),
                         datetime(2004, 1, 1))

    def test_fromordinal(self):
        self.assertEqual(datetime.fromordinal(1), datetime(1, 1, 1))

    def test_date_and_time_accessors(self):
        d = datetime(2004, 1, 1, 1, 2, 3)
        self.assertEqual(d.date(), date(2004, 1, 1))
        self.assertEqual(d.time(), time(1, 2, 3))

    def test_fold(self):
        self.assertEqual(datetime(2004, 1, 1).fold, 0)

    def test_timetuple(self):
        self.assertEqual(datetime(2004, 1, 1, 1, 2, 3).timetuple()[:6],
                         (2004, 1, 1, 1, 2, 3))

    def test_astimezone(self):
        d = datetime(2004, 1, 1, tzinfo=timezone.utc)
        self.assertEqual(d.astimezone(timezone.utc), d)

    def test_isocalendar(self):
        self.assertEqual(tuple(datetime(2004, 1, 1).isocalendar()), (2004, 1, 4))

    def test_min_max_resolution(self):
        self.assertEqual(datetime.resolution, timedelta(microseconds=1))
        self.assertTrue(datetime.min < datetime.max)

    def test_pickle(self):
        d = datetime(2004, 1, 1, 1, 2, 3)
        self.assertEqual(pickle.loads(pickle.dumps(d)), d)


class TimezoneProbe(unittest.TestCase):
    def test_repr(self):
        self.assertEqual(repr(timezone.utc), 'datetime.timezone.utc')

    def test_eq(self):
        self.assertEqual(timezone(timedelta(hours=1)), timezone(timedelta(hours=1)))

    def test_fromutc(self):
        tz = timezone(timedelta(hours=1))
        d = datetime(2004, 1, 1, tzinfo=tz)
        self.assertEqual(tz.fromutc(d), datetime(2004, 1, 1, 1, tzinfo=tz))

    def test_named(self):
        self.assertEqual(timezone(timedelta(hours=1), 'MYZONE').tzname(None), 'MYZONE')


class ModuleProbe(unittest.TestCase):
    def test_UTC_alias(self):
        self.assertIs(dtm.UTC, timezone.utc)

    def test_minyear_maxyear(self):
        self.assertEqual((dtm.MINYEAR, dtm.MAXYEAR), (1, 9999))


if __name__ == '__main__':
    unittest.main()
