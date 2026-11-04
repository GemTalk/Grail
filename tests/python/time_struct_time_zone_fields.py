"""Fixture: time.gmtime and time.localtime fill tm_isdst, tm_zone and tm_gmtoff.

CPython fills a struct_time's two named-only fields from the C library's
struct tm (Modules/timemodule.c:457-491, tmtotuple): gmtime is not daylight
time and is 0 seconds from UTC, and localtime is tzname[tm_isdst], at the
matching offset -- -timezone, or -altzone in daylight time.

Grail's gmtime said tm_isdst -1 and neither left tm_zone nor tm_gmtoff set,
which test_structseq's test_repr compares.

Every check here holds under CPython 3.14 on any host, which is what makes
it evidence; the name gmtime reports is the C library's, so only its type is
checked.  The localtime checks pin their zones with TZ rather than reading
the host's: "localtime is at -timezone or -altzone" is not true of every
host zone.  On America/Vancouver after November 2026, when PDT (-7) became
year-round MST (-7), CPython on macOS reports timezone as PST's 28800 while
localtime is MST at -25200, so both checks failed under CPython itself.
"""

import os
import time

r = {}

g = time.gmtime(0)
r['gmtime'] = [g.tm_isdst, g.tm_gmtoff, type(g.tm_zone) is str]
r['gmtime_repr'] = repr(g)


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


# A DST zone in each hemisphere and one with no DST, each at an instant in
# January and one in July, so both halves of the year are covered: the
# wrong-half name or offset cannot pass.
ZONES = ('America/Denver', 'Australia/Sydney', 'UTC')
INSTANTS = (('jan', 1768435200.0), ('jul', 1784073600.0))   # 2026-01-15, 2026-07-14


def _wrong_fields():
    zone, offset = [], []
    for spec in ZONES:
        for label, ts in INSTANTS:
            def check():
                local = time.localtime(ts)
                return (local.tm_zone == time.tzname[local.tm_isdst > 0],
                        local.tm_gmtoff == -(time.altzone if local.tm_isdst > 0
                                             else time.timezone))
            zone_ok, offset_ok = _with_tz(spec, check)
            if not zone_ok:
                zone.append('%s/%s' % (spec, label))
            if not offset_ok:
                offset.append('%s/%s' % (spec, label))
    return zone, offset


r['localtime_zone'], r['localtime_offset'] = _wrong_fields()

EXPECTED = {
    'gmtime': [0, 0, True],
    'gmtime_repr': 'time.struct_time(tm_year=1970, tm_mon=1, tm_mday=1, tm_hour=0, tm_min=0, '
                   'tm_sec=0, tm_wday=3, tm_yday=1, tm_isdst=0)',
    'localtime_zone': [],
    'localtime_offset': [],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-17s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
