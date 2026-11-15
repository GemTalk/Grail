"""Naive datetimes are HOST-LOCAL; the utc* family is UTC -- in EVERY zone.

Grail used to answer UTC for everything except ``date.today()``, which read
GemStone's session TimeZone -- and that defaults to PST no matter which
host the gem runs on.  So ``date.today()`` and
``date.fromtimestamp(time.time())`` disagreed by a day whenever the
session-zone date and the UTC date differed: for the PST default, exactly
when the UTC hour is 00:00-06:59.  test_datetime's TestDate.test_today
failed inside that 7-hour window and passed outside it, which made it look
intermittent when it was in fact deterministic.

# Every check runs in many zones, not just the host's

The invariants here are relationships, not clock values, and each one is
checked in the host's own zone (whatever TZ the run inherited -- the default
path, which in Grail is different code from a pinned one) AND under every
zone in ZONES, pinned with TZ + tzset, at the instants in INSTANTS.

That is what makes the result independent of where the suite runs.  Checking
only the host's zone meant a CI runner on UTC exercised none of the
offset-bearing cases, and a developer's machine exercised just one offset in
one season -- and the fixture still managed to encode that season:
utcnow_is_not_local_when_offset_nonzero compared the offset at a fixed July
instant with the offset NOW, so it failed in every DST zone for half the year
(America/Los_Angeles from November, Australia/Sydney from April), under
CPython exactly as under Grail.  It now takes both from the same instant.

The zones cover both hemispheres, DST and no DST, offsets west and east of
UTC up to the date line (-11, +14), half- and quarter-hour offsets
(St John's -3:30, Kolkata +5:30, Kathmandu +5:45, Chatham +12:45), Lord
Howe's thirty-minute DST step, a zone whose winter offset is zero
(London), and a zone that gave DST up (Sao Paulo, 2019).  The instants are
TS (below), mid-January and mid-July 2026, so every DST zone is checked on
both sides of its change.

Run as __main__, the fixture prints one OK/FAIL line per check, so
scripts/check_python_fixtures.sh confirms every invariant under real CPython
too -- which would have caught the July/November bug.
"""

import os
import time
import warnings
import datetime
from datetime import date, datetime as dt, timedelta

# The utc* constructors are deprecated in CPython 3.12+ but are exactly what
# this fixture pins; keep their warnings out of the gate's output.
warnings.filterwarnings('ignore', category=DeprecationWarning,
                        message=r'datetime\.datetime\.utc')

# 2026-07-29 01:51:00 UTC.  Chosen because it is inside the old failure
# window, so on a negative-offset host it lands on the previous local day.
TS = 1785289860.0
WINTER_TS = 1768478400.0   # 2026-01-15 12:00 UTC
SUMMER_TS = 1784030400.0   # 2026-07-14 12:00 UTC
INSTANTS = (TS, WINTER_TS, SUMMER_TS)

ZONES = (
    'UTC',
    'America/Los_Angeles',    # northern DST, west
    'America/St_Johns',       # -3:30, northern DST
    'America/Phoenix',        # no DST, nonzero offset
    'America/Sao_Paulo',      # gave DST up in 2019, -03 all year
    'Europe/London',          # offset zero in winter, +1 in summer
    'Asia/Kolkata',           # +5:30, no DST
    'Asia/Kathmandu',         # +5:45, no DST
    'Australia/Sydney',       # southern DST: summer is January
    'Australia/Lord_Howe',    # +10:30, thirty-minute DST step
    'Pacific/Chatham',        # +12:45 / +13:45, southern DST
    'Pacific/Kiritimati',     # +14, east of the date line
    'Pacific/Pago_Pago',      # -11, west of the date line
)

HOST = '(host)'


def _with_tz(spec, fn):
    """Set TZ, run fn, restore the zone the session had."""
    had = 'TZ' in os.environ
    orig = os.environ.get('TZ')
    os.environ['TZ'] = spec
    try:
        time.tzset()
        return fn()
    finally:
        # Unset, not '': CPython reads an empty TZ as UTC, not the host zone.
        if had:
            os.environ['TZ'] = orig
        else:
            del os.environ['TZ']
        time.tzset()


def _offset_west(ts):
    """The zone's offset at ts, seconds WEST of UTC (time.timezone's sign)."""
    return (dt.utcfromtimestamp(ts) - dt.fromtimestamp(ts)).total_seconds()


# --- the checks: each answers True or False in the CURRENT zone --------------
#
# Those taking ts run at every instant in INSTANTS; the rest once per zone.

def _today_matches_fromtimestamp():
    """THE original bug: date.today() vs date.fromtimestamp(time.time()).

    Retries like CPython's test_today does, so a genuine midnight rollover
    between the two calls does not read as a failure.
    """
    for _ in range(3):
        a = date.today()
        b = date.fromtimestamp(time.time())
        if a == b:
            return True
        time.sleep(0.1)
    return date.today() == date.fromtimestamp(time.time())


def _now_timestamp_roundtrips():
    """now().timestamp() must agree with time.time().

    This is what broke when now() became local while timestamp() still read
    naive fields as UTC -- they disagreed by the whole local offset.
    """
    return abs(dt.now().timestamp() - time.time()) < 5


def _fromtimestamp_roundtrips(ts):
    """fromtimestamp(ts).timestamp() == ts."""
    return abs(dt.fromtimestamp(ts).timestamp() - ts) < 0.001


def _utcfromtimestamp_matches_gmtime(ts):
    """The utc* family must be REAL UTC whatever the zone, pinned against
    time.gmtime as an independent witness."""
    g = time.gmtime(ts)
    u = dt.utcfromtimestamp(ts)
    return (u.year, u.month, u.day, u.hour, u.minute) == (
        g.tm_year, g.tm_mon, g.tm_mday, g.tm_hour, g.tm_min)


def _utc_and_local_are_the_same_instant(ts):
    """utcfromtimestamp and fromtimestamp describe ONE instant, offset apart:
    re-reading the local one as an epoch returns ts, and the offset is a
    whole number of seconds within a day."""
    offset = _offset_west(ts)
    return (abs(dt.fromtimestamp(ts).timestamp() - ts) < 0.001
            and abs(offset) < 24 * 3600
            and offset == int(offset))


def _utcnow_and_now_are_the_offset_apart():
    """utcnow() and now() must stop being the same method: they are the
    zone's CURRENT offset apart, taken at the current instant -- not at a
    fixed one, which is a different offset in a DST zone for half the year.
    Signed, so a zone east of UTC is not mistaken for one west of it."""
    offset = _offset_west(time.time())
    delta = (dt.utcnow() - dt.now()).total_seconds()
    return abs(delta - offset) < 5


def _naive_addition_is_civil():
    """datetime + timedelta is calendar arithmetic, no zone involved."""
    base = dt(2024, 1, 1, 0, 0, 0)
    return base + timedelta(days=10, hours=5) == dt(2024, 1, 11, 5, 0, 0)


def _naive_addition_across_dst():
    """Spanning a DST change (northern in March, southern in April) must not
    gain or lose an hour."""
    return (dt(2024, 3, 1) + timedelta(days=30) == dt(2024, 3, 31)
            and dt(2024, 3, 25) + timedelta(days=14) == dt(2024, 4, 8))


def _naive_subtraction_across_dst():
    """Likewise for subtraction: exactly 30 days, not 30 days less an hour."""
    return ((dt(2024, 3, 31) - dt(2024, 3, 1)).total_seconds() == 30 * 86400
            and (dt(2024, 4, 8) - dt(2024, 3, 25)).total_seconds() == 14 * 86400)


def _naive_timestamp_roundtrips_through_local():
    """A CONSTRUCTED naive datetime round-trips through the local epoch.

    Exercises the ordering trap: this path reaches local time without ever
    constructing from the clock, so the session zone has to be aligned by the
    epoch helper itself rather than by a previous now()/today() call.  Noon
    on both dates, so no zone's DST change makes the civil time ambiguous or
    missing.
    """
    return all(dt.fromtimestamp(d.timestamp()) == d
               for d in (dt(2024, 1, 1, 12, 0, 0), dt(2024, 7, 1, 12, 0, 0)))


def _aware_timestamp_unchanged():
    """An aware datetime's epoch still subtracts its own utcoffset."""
    aware = dt(2024, 1, 1, 0, 0, 0, tzinfo=datetime.timezone.utc)
    return aware.timestamp() == 1704067200.0


# time.localtime WAS gmtime and time.mktime was its UTC inverse.  That was
# self-consistent while datetime also answered UTC, but a UTC mktime feeding a
# local datetime.fromtimestamp broke CPython's TestDate.test_fromtimestamp by a
# whole day at the wrong hour ("18 != 19").

def _mktime_localtime_roundtrips(ts):
    """mktime is localtime's inverse."""
    return abs(time.mktime(time.localtime(ts)) - ts) < 1.5


def _fromtimestamp_of_mktime_is_that_date():
    """CPython's TestDate.test_fromtimestamp, in miniature: an epoch built
    from a LOCAL civil date via mktime reads back as that date.  Both must
    use the same basis or the day slips."""
    y, m, d = 1999, 9, 19
    got = date.fromtimestamp(time.mktime((y, m, d, 0, 0, 0, 0, 0, -1)))
    return (got.year, got.month, got.day) == (y, m, d)


def _time_offset_matches_datetime_offset(ts):
    """time.timezone/altzone describe the SAME offset datetime uses: the one
    tm_isdst selects at ts.  2026 instants only -- the two globals describe
    the zone's current rules, not its history."""
    expected = time.altzone if time.localtime(ts).tm_isdst == 1 else time.timezone
    return _offset_west(ts) == expected


def _tzname_is_a_pair_of_names():
    names = tuple(time.tzname)
    return len(names) == 2 and all(isinstance(n, str) and n for n in names)


def _daylight_flag_is_consistent():
    """daylight is 1 exactly when the standard and DST offsets differ."""
    return time.daylight == (0 if time.timezone == time.altzone else 1)


def _localtime_and_gmtime_differ_by_the_offset(ts):
    """Same instant, two field sets, the tm_isdst-selected offset apart."""
    lt = time.localtime(ts)
    gt = time.gmtime(ts)
    local = dt(lt.tm_year, lt.tm_mon, lt.tm_mday, lt.tm_hour, lt.tm_min, lt.tm_sec)
    utc = dt(gt.tm_year, gt.tm_mon, gt.tm_mday, gt.tm_hour, gt.tm_min, gt.tm_sec)
    expected = time.altzone if lt.tm_isdst == 1 else time.timezone
    return (utc - local).total_seconds() == expected


def _gmtime_is_still_utc(ts):
    """Guard: converting the module to local must not have moved gmtime."""
    g = time.gmtime(ts)
    u = dt.utcfromtimestamp(ts)
    return (g.tm_year, g.tm_mon, g.tm_mday, g.tm_hour, g.tm_min) == (
        u.year, u.month, u.day, u.hour, u.minute)


CHECKS = {
    'today_matches_fromtimestamp': _today_matches_fromtimestamp,
    'now_timestamp_roundtrips': _now_timestamp_roundtrips,
    'fromtimestamp_roundtrips': _fromtimestamp_roundtrips,
    'utcfromtimestamp_matches_gmtime': _utcfromtimestamp_matches_gmtime,
    'utc_and_local_are_the_same_instant': _utc_and_local_are_the_same_instant,
    'utcnow_and_now_are_the_offset_apart': _utcnow_and_now_are_the_offset_apart,
    'naive_addition_is_civil': _naive_addition_is_civil,
    'naive_addition_across_dst': _naive_addition_across_dst,
    'naive_subtraction_across_dst': _naive_subtraction_across_dst,
    'naive_timestamp_roundtrips_through_local':
        _naive_timestamp_roundtrips_through_local,
    'aware_timestamp_unchanged': _aware_timestamp_unchanged,
    'mktime_localtime_roundtrips': _mktime_localtime_roundtrips,
    'fromtimestamp_of_mktime_is_that_date': _fromtimestamp_of_mktime_is_that_date,
    'time_offset_matches_datetime_offset': _time_offset_matches_datetime_offset,
    'tzname_is_a_pair_of_names': _tzname_is_a_pair_of_names,
    'daylight_flag_is_consistent': _daylight_flag_is_consistent,
    'localtime_and_gmtime_differ_by_the_offset':
        _localtime_and_gmtime_differ_by_the_offset,
    'gmtime_is_still_utc': _gmtime_is_still_utc,
}


def _run_in_current_zone(zone, failures):
    for name, check in CHECKS.items():
        cases = INSTANTS if check.__code__.co_argcount else (None,)
        for ts in cases:
            try:
                ok = check(ts) if ts is not None else check()
            except Exception as e:
                ok = '%s: %s' % (type(e).__name__, e)
            if ok is not True:
                where = zone if ts is None else '%s@%d' % (zone, ts)
                failures.setdefault(name, []).append(
                    where if ok is False else '%s (%s)' % (where, ok))


def _run_everywhere():
    """{check name: [zone@instant, ...]} for every case that did not hold."""
    failures = {}
    _run_in_current_zone(HOST, failures)
    for zone in ZONES:
        try:
            _with_tz(zone, lambda: _run_in_current_zone(zone, failures))
        except Exception as e:
            failures.setdefault('(tzset)', []).append(
                '%s (%s: %s)' % (zone, type(e).__name__, e))
    return failures


_FAILURES = None


def _failures():
    global _FAILURES
    if _FAILURES is None:
        _FAILURES = _run_everywhere()
    return _FAILURES


def _verdict(name):
    """True, or the zones (and instants) where the check did not hold."""
    bad = _failures().get(name, []) + _failures().get('(tzset)', [])
    return True if not bad else 'failed in ' + ', '.join(bad)


def today_matches_fromtimestamp(): return _verdict('today_matches_fromtimestamp')
def now_timestamp_roundtrips(): return _verdict('now_timestamp_roundtrips')
def fromtimestamp_roundtrips(): return _verdict('fromtimestamp_roundtrips')
def utcfromtimestamp_matches_gmtime(): return _verdict('utcfromtimestamp_matches_gmtime')
def utc_and_local_are_the_same_instant(): return _verdict('utc_and_local_are_the_same_instant')
def utcnow_and_now_are_the_offset_apart(): return _verdict('utcnow_and_now_are_the_offset_apart')
def naive_addition_is_civil(): return _verdict('naive_addition_is_civil')
def naive_addition_across_dst(): return _verdict('naive_addition_across_dst')
def naive_subtraction_across_dst(): return _verdict('naive_subtraction_across_dst')
def naive_timestamp_roundtrips_through_local(): return _verdict('naive_timestamp_roundtrips_through_local')
def aware_timestamp_unchanged(): return _verdict('aware_timestamp_unchanged')
def mktime_localtime_roundtrips(): return _verdict('mktime_localtime_roundtrips')
def fromtimestamp_of_mktime_is_that_date(): return _verdict('fromtimestamp_of_mktime_is_that_date')
def time_offset_matches_datetime_offset(): return _verdict('time_offset_matches_datetime_offset')
def tzname_is_a_pair_of_names(): return _verdict('tzname_is_a_pair_of_names')
def daylight_flag_is_consistent(): return _verdict('daylight_flag_is_consistent')
def localtime_and_gmtime_differ_by_the_offset(): return _verdict('localtime_and_gmtime_differ_by_the_offset')
def gmtime_is_still_utc(): return _verdict('gmtime_is_still_utc')


# Zones isdst_tracks_the_zone pins, with what CPython 3.14 answers under each:
# (time.daylight, tm_isdst on 2026-01-15, tm_isdst on 2026-07-14).
ISDST_ZONES = (
    ('America/Denver', 1, (0, 1)),       # northern DST
    ('America/St_Johns', 1, (0, 1)),     # northern DST, half-hour offset
    ('Europe/London', 1, (0, 1)),        # northern DST from a zero offset
    ('Australia/Sydney', 1, (1, 0)),     # southern DST: the flags swap
    ('Australia/Lord_Howe', 1, (1, 0)),  # southern, thirty-minute DST step
    ('Pacific/Chatham', 1, (1, 0)),      # southern, +12:45
    ('UTC', 0, (0, 0)),                  # no DST rule at all
    ('America/Phoenix', 0, (0, 0)),      # no DST, nonzero offset
    ('Asia/Kathmandu', 0, (0, 0)),       # no DST, quarter-hour offset
    ('America/Sao_Paulo', 0, (0, 0)),    # gave DST up in 2019, -03 all year
)


def isdst_tracks_the_zone():
    """tm_isdst must reflect the zone, on a DST-less zone as well as a DST one.

    Two instants six months apart, under zones PINNED with TZ: the host's own
    zone is no witness.  This used to branch on the host's time.daylight --
    daylight 0 meant both flags must be 0 -- and that is not an invariant:
    what daylight says about a zone whose rules changed is the C library's
    call.  On a host in America/Vancouver after it stopped changing its
    clocks in November 2026 (PDT -7 became MST -7), Grail says daylight 0
    while July 2026 was still PDT, so the check failed with no bug present;
    CPython on macOS there says daylight 1, from a standard offset (PST -8)
    the zone no longer uses.

    Each zone checks both:

      * DST-less zones (UTC, Phoenix, Kathmandu, Sao Paulo) -- tm_isdst 0 at
        BOTH instants.  The first implementation reported 1 for every instant
        on such a zone, because with equal standard and DST offsets the
        comparison deciding the flag was trivially true.  Nothing caught it:
        there timezone == altzone, so tests that pick between them by
        tm_isdst agree whichever branch they take.  Sao Paulo is the zone
        that gave DST up, which GemStone's rule-based zone still carried a
        rule for (daylight 1, see time>>___refreshTimezoneGlobals___).
      * DST zones -- the two DIFFER, in both hemispheres.

    Values are also required to be exactly 0 or 1: localtime never reports
    the -1 "unknown" that the UTC path uses.
    """
    winter_ts = 1768435200.0   # 2026-01-15 00:00 UTC
    summer_ts = 1784073600.0   # 2026-07-14 00:00 UTC
    wrong = []
    for zone, daylight, flags in ISDST_ZONES:
        got = _with_tz(zone, lambda: (time.daylight,
                                      (time.localtime(winter_ts).tm_isdst,
                                       time.localtime(summer_ts).tm_isdst)))
        if got != (daylight, flags):
            wrong.append('%s:%r' % (zone, got))
    return 'ok' if not wrong else 'wrong:' + ' '.join(wrong)


EXPECTED = dict({name: True for name in CHECKS},
                isdst_tracks_the_zone='ok')


if __name__ == '__main__':
    for key, expected in EXPECTED.items():
        actual = globals()[key]()
        ok = actual == expected
        print('%-5s %-44s -> %s' % ('OK' if ok else 'FAIL', key,
                                    'as expected' if ok else actual))
