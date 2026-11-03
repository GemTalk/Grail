"""Fixture: time.gmtime and time.localtime fill tm_isdst, tm_zone and tm_gmtoff.

CPython fills a struct_time's two named-only fields from the C library's
struct tm (Modules/timemodule.c:457-491, tmtotuple): gmtime is not daylight
time and is 0 seconds from UTC, and localtime is tzname[tm_isdst], at the
matching offset -- -timezone, or -altzone in daylight time.

Grail's gmtime said tm_isdst -1 and neither left tm_zone nor tm_gmtoff set,
which test_structseq's test_repr compares.

Every check here holds under CPython 3.14 in any time zone, which is what
makes it evidence; the name gmtime reports is the C library's, so only its
type is checked.
"""

import time

r = {}

g = time.gmtime(0)
r['gmtime'] = [g.tm_isdst, g.tm_gmtoff, type(g.tm_zone) is str]
r['gmtime_repr'] = repr(g)

local = time.localtime()
r['localtime_zone'] = local.tm_zone == time.tzname[local.tm_isdst > 0]
r['localtime_offset'] = local.tm_gmtoff == -(time.altzone if local.tm_isdst > 0 else time.timezone)

EXPECTED = {
    'gmtime': [0, 0, True],
    'gmtime_repr': 'time.struct_time(tm_year=1970, tm_mon=1, tm_mday=1, tm_hour=0, tm_min=0, '
                   'tm_sec=0, tm_wday=3, tm_yday=1, tm_isdst=0)',
    'localtime_zone': True,
    'localtime_offset': True,
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-17s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
