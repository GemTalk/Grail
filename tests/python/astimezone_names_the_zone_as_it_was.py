"""Fixture: astimezone() names the local zone as it was named at that instant.

CPython's datetime._local_timezone builds the local zone from
time.localtime(ts): its tm_gmtoff and its tm_zone.  So a zone whose names
changed over the years names each instant as it was then -- Kyiv was MSK in
January 1984, MSD that summer, and is EET and EEST now (test_email test_utils
test_variable_tzname).  Grail took the name from time.tzname, picking the
standard or the DST entry by comparing the offset with today's standard one,
so 1984 read as EEST.

The zone is set through TZ and put back afterwards.  The Kyiv checks need
the host's tz database; where it is missing they answer 'no tzdata' on
either side.  Every check holds under CPython 3.14, which is what makes it
evidence.
"""

import datetime
import os
import time
from email import utils

r = {}

HAS_KYIV = os.path.exists('/usr/share/zoneinfo/Europe/Kyiv')


def in_zone(zone, call):
    saved = os.environ.get('TZ')
    os.environ['TZ'] = zone
    time.tzset()
    try:
        return call()
    except Exception as e:
        return '%s: %s' % (type(e).__name__, e)
    finally:
        if saved is None:
            del os.environ['TZ']
        else:
            os.environ['TZ'] = saved
        time.tzset()


def at(year, month):
    return datetime.datetime(year, month, 1, tzinfo=datetime.timezone.utc)


def names_and_offsets():
    return [[at(y, m).astimezone().tzname(), str(at(y, m).astimezone().utcoffset())]
            for y, m in ((1984, 1), (1984, 7), (1994, 1), (2026, 7))]


def kyiv(call):
    return in_zone('Europe/Kyiv', call) if HAS_KYIV else 'no tzdata'


r['each_instant_is_named_as_it_was'] = kyiv(names_and_offsets)
r['email_utils_localtime_names_it_too'] = kyiv(lambda: utils.localtime(at(1984, 1)).tzname())
r['a_naive_value_is_named_for_its_own_date'] = kyiv(
    lambda: [datetime.datetime(1984, 1, 1, 12).astimezone().tzname(),
             datetime.datetime(2026, 1, 1, 12).astimezone().tzname()])
r['a_posix_rule_names_standard_and_summer_time'] = in_zone(
    'EST+05EDT,M3.2.0,M11.1.0',
    lambda: [datetime.datetime(2026, 1, 1, 12).astimezone().tzname(),
             datetime.datetime(2026, 7, 1, 12).astimezone().tzname()])

EXPECTED = {
    'each_instant_is_named_as_it_was': [
        ['MSK', '3:00:00'], ['MSD', '4:00:00'], ['EET', '2:00:00'], ['EEST', '3:00:00']]
        if HAS_KYIV else 'no tzdata',
    'email_utils_localtime_names_it_too': 'MSK' if HAS_KYIV else 'no tzdata',
    'a_naive_value_is_named_for_its_own_date': ['MSK', 'EET'] if HAS_KYIV else 'no tzdata',
    'a_posix_rule_names_standard_and_summer_time': ['EST', 'EDT'],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-46s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
