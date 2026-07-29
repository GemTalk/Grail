"""Naive datetimes are HOST-LOCAL; the utc* family is UTC.

Grail used to answer UTC for everything except ``date.today()``, which read
GemStone's session TimeZone -- and that defaults to PST no matter which
host the gem runs on.  So ``date.today()`` and
``date.fromtimestamp(time.time())`` disagreed by a day whenever the
session-zone date and the UTC date differed: for the PST default, exactly
when the UTC hour is 00:00-06:59.  test_datetime's TestDate.test_today
failed inside that 7-hour window and passed outside it, which made it look
intermittent when it was in fact deterministic.

EVERY assertion here is written to hold at ANY host UTC offset, including
zero.  A CI runner on UTC makes the local and utc* families coincide, so
tests that hardcoded an offset would pass locally and fail there (or the
reverse).  The invariants are relationships, not fixed clock values.
"""

import time
import datetime
from datetime import date, datetime as dt, timedelta

# 2026-07-29 01:51:00 UTC.  Chosen because it is inside the old failure
# window, so on a negative-offset host it lands on the previous local day.
TS = 1785289860.0


def today_matches_fromtimestamp():
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


def now_timestamp_roundtrips():
    """now().timestamp() must agree with time.time().

    This is what broke when now() became local while timestamp() still read
    naive fields as UTC -- they disagreed by the whole local offset.
    """
    n = dt.now()
    return abs(n.timestamp() - time.time()) < 5


def fromtimestamp_roundtrips():
    """fromtimestamp(ts).timestamp() == ts, for a fixed instant."""
    return abs(dt.fromtimestamp(TS).timestamp() - TS) < 0.001


def utcfromtimestamp_matches_gmtime():
    """The utc* family must be REAL UTC, pinned against time.gmtime.

    Grail's time module documents its wall clocks as UTC, so gmtime is an
    independent witness that does not depend on the host offset.
    """
    g = time.gmtime(TS)
    u = dt.utcfromtimestamp(TS)
    return (
        u.year == g.tm_year
        and u.month == g.tm_mon
        and u.day == g.tm_mday
        and u.hour == g.tm_hour
        and u.minute == g.tm_min
    )


def utc_and_local_are_the_same_instant():
    """utcfromtimestamp and fromtimestamp describe ONE instant, offset apart.

    Their difference is the host's UTC offset at TS -- zero on a UTC host,
    non-zero elsewhere -- so assert the relationship rather than a value:
    re-reading the local one as an epoch must return TS either way.
    """
    local = dt.fromtimestamp(TS)
    utc = dt.utcfromtimestamp(TS)
    offset = (utc - local).total_seconds()
    return (
        abs(local.timestamp() - TS) < 0.001
        and abs(offset) < 24 * 3600
        and float(offset) == float(int(offset))
    )


def utcnow_is_not_local_when_offset_nonzero():
    """utcnow() and now() must stop being the same method.

    They were literally the same implementation.  On a UTC host they
    legitimately agree, so only the offset-bearing case is asserted.
    """
    offset = (dt.utcfromtimestamp(TS) - dt.fromtimestamp(TS)).total_seconds()
    if offset == 0:
        return "utc-host"
    delta = abs((dt.utcnow() - dt.now()).total_seconds())
    return "differ" if abs(delta - abs(offset)) < 5 else "same"


# --- naive arithmetic stays purely civil ------------------------------------

def naive_addition_is_civil():
    """datetime + timedelta is calendar arithmetic, no zone involved."""
    base = dt(2024, 1, 1, 0, 0, 0)
    return base + timedelta(days=10, hours=5) == dt(2024, 1, 11, 5, 0, 0)


def naive_addition_across_dst():
    """Spanning a northern-hemisphere DST change must not gain/lose an hour."""
    return dt(2024, 3, 1) + timedelta(days=30) == dt(2024, 3, 31)


def naive_subtraction_across_dst():
    """Likewise for subtraction: exactly 30 days, not 30 days less an hour."""
    return (dt(2024, 3, 31) - dt(2024, 3, 1)).total_seconds() == 30 * 86400


def naive_timestamp_roundtrips_through_local():
    """A CONSTRUCTED naive datetime round-trips through the local epoch.

    Exercises the ordering trap: this path reaches local time without ever
    constructing from the clock, so the session zone has to be aligned by the
    epoch helper itself rather than by a previous now()/today() call.
    """
    d = dt(2024, 1, 1, 0, 0, 0)
    return dt.fromtimestamp(d.timestamp()) == d


def aware_timestamp_unchanged():
    """An aware datetime's epoch still subtracts its own utcoffset."""
    aware = dt(2024, 1, 1, 0, 0, 0, tzinfo=datetime.timezone.utc)
    return aware.timestamp() == 1704067200.0


# --- the time module has to agree with datetime ------------------------------
#
# time.localtime WAS gmtime and time.mktime was its UTC inverse.  That was
# self-consistent while datetime also answered UTC, but a UTC mktime feeding a
# local datetime.fromtimestamp broke CPython's TestDate.test_fromtimestamp by a
# whole day at the wrong hour ("18 != 19").

def mktime_localtime_roundtrips():
    """mktime is localtime's inverse, whatever the host offset."""
    return abs(time.mktime(time.localtime(TS)) - TS) < 1.5


def fromtimestamp_of_mktime_is_that_date():
    """CPython's TestDate.test_fromtimestamp, in miniature.

    Builds an epoch from a LOCAL civil date via mktime, then reads it back
    with date.fromtimestamp.  Both must use the same basis or the day slips.
    """
    y, m, d = 1999, 9, 19
    ts = time.mktime((y, m, d, 0, 0, 0, 0, 0, -1))
    got = date.fromtimestamp(ts)
    return (got.year, got.month, got.day) == (y, m, d)


def time_offset_matches_datetime_offset():
    """time.timezone/altzone must describe the SAME offset datetime uses.

    The offset is derived from datetime (utc minus local) and then checked
    against whichever of timezone/altzone applies at that instant, per
    tm_isdst.  Holds at any offset including zero, and ties the two modules
    together rather than asserting a fixed number.
    """
    offset_west = (dt.utcfromtimestamp(TS) - dt.fromtimestamp(TS)).total_seconds()
    expected = time.altzone if time.localtime(TS).tm_isdst == 1 else time.timezone
    return offset_west == expected


def tzname_is_a_pair_of_names():
    names = tuple(time.tzname)
    return (
        len(names) == 2
        and all(isinstance(n, str) and len(n) > 0 for n in names)
    )


def daylight_flag_is_consistent():
    """daylight is 1 exactly when the zone has a DST rule, i.e. when the
    standard and DST offsets differ."""
    if time.timezone == time.altzone:
        return time.daylight == 0
    return time.daylight == 1


def localtime_and_gmtime_differ_by_the_offset():
    """Same instant, two field sets, one offset apart (zero on a UTC host)."""
    lt = time.localtime(TS)
    gt = time.gmtime(TS)
    local = dt(lt.tm_year, lt.tm_mon, lt.tm_mday, lt.tm_hour, lt.tm_min, lt.tm_sec)
    utc = dt(gt.tm_year, gt.tm_mon, gt.tm_mday, gt.tm_hour, gt.tm_min, gt.tm_sec)
    offset_west = (utc - local).total_seconds()
    expected = time.altzone if lt.tm_isdst == 1 else time.timezone
    return offset_west == expected


def isdst_tracks_the_zone():
    """tm_isdst must reflect the zone, on a DST-less zone as well as a DST one.

    Two instants six months apart, so this has real coverage either way:

      * no DST rule (daylight == 0, e.g. a UTC host) -- tm_isdst must be 0 at
        BOTH.  The first implementation reported 1 for every instant here,
        because with equal standard and DST offsets the comparison deciding
        the flag was trivially true.  Nothing caught it: on such a zone
        timezone == altzone, so tests that pick between them by tm_isdst
        agree whichever branch they take.
      * a DST rule (daylight == 1) -- the two must DIFFER, whichever
        hemisphere the zone is in.

    Values are also required to be exactly 0 or 1: localtime never reports
    the -1 "unknown" that the UTC path uses.
    """
    winter = time.localtime(1768435200.0)   # 2026-01-15 00:00 UTC
    summer = time.localtime(1784073600.0)   # 2026-07-14 00:00 UTC
    flags = (winter.tm_isdst, summer.tm_isdst)
    if not all(f in (0, 1) for f in flags):
        return "not-a-flag:%r" % (flags,)
    if time.daylight == 0:
        return "ok" if flags == (0, 0) else "dstless-but-flagged:%r" % (flags,)
    return "ok" if flags[0] != flags[1] else "dst-zone-but-constant:%r" % (flags,)


def gmtime_is_still_utc():
    """Guard: converting the module to local must not have moved gmtime."""
    g = time.gmtime(TS)
    u = dt.utcfromtimestamp(TS)
    return (g.tm_year, g.tm_mon, g.tm_mday, g.tm_hour, g.tm_min) == (
        u.year, u.month, u.day, u.hour, u.minute)
