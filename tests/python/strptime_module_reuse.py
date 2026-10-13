"""Fixture: every strptime reuses the one imported _strptime module.

datetime.strptime, date.strptime, time.strptime (the class) and
time.strptime (the module function) all delegate to _strptime, as CPython's C
code does.  CPython imports it once; every later call finds it in sys.modules,
along with what it caches -- the TimeRE built for the locale and a compiled
regex per format.

Grail called the LOADER instead of importing, and the loader never consults
sys.modules: each call rebuilt _strptime from source and ran its body again
(#1222).  So the module in sys.modules changed on every call, its caches were
always empty, a call cost ~310 ms, and a loop of a few hundred calls ran the
session out of temporary object memory.

The checks are identities and cache contents, not timings, so they hold the
same under CPython 3.14 -- which is what makes them evidence.
"""

import datetime
import sys
import time

r = {}


def _same_module_across(call):
    """Call twice; is sys.modules['_strptime'] the same object both times?"""
    call()
    first = sys.modules['_strptime']
    call()
    return first is sys.modules['_strptime']


r['datetime_strptime'] = _same_module_across(
    lambda: datetime.datetime.strptime('10:00AM', '%I:%M%p'))
r['date_strptime'] = _same_module_across(
    lambda: datetime.date.strptime('Sep 28, 2026', '%b %d, %Y'))
r['time_class_strptime'] = _same_module_across(
    lambda: datetime.time.strptime('10:30', '%H:%M'))
r['time_module_strptime'] = _same_module_across(
    lambda: time.strptime('Sep 28 2026', '%b %d %Y'))

# An explicit import and the strptime methods share ONE module.
import _strptime
datetime.datetime.strptime('2026', '%Y')
time.strptime('2026', '%Y')
r['import_and_methods_share_it'] = sys.modules['_strptime'] is _strptime

# ...so what the module caches survives from one call to the next.
time_re = _strptime._TimeRE_cache
datetime.date.strptime('Oct 11, 2026', '%b %d, %Y')
r['time_re_cache_kept'] = _strptime._TimeRE_cache is time_re
r['regex_cache_kept'] = '%b %d, %Y' in _strptime._regex_cache

# Controls: the answers themselves are unchanged.
r['values'] = [
    datetime.datetime.strptime('10:00AM', '%I:%M%p').time().isoformat(),
    datetime.date.strptime('Sep 28, 2026', '%b %d, %Y').isoformat(),
    datetime.time.strptime('10:30', '%H:%M').isoformat(),
    tuple(time.strptime('Sep 28 2026', '%b %d %Y'))[:3],
]
r['error_is_unchanged'] = None
try:
    datetime.date.strptime('nope', '%Y')
except ValueError as e:
    r['error_is_unchanged'] = str(e)


EXPECTED = {
    'datetime_strptime': True,
    'date_strptime': True,
    'time_class_strptime': True,
    'time_module_strptime': True,
    'import_and_methods_share_it': True,
    'time_re_cache_kept': True,
    'regex_cache_kept': True,
    'values': ['10:00:00', '2026-09-28', '10:30:00', (2026, 9, 28)],
    'error_is_unchanged': "time data 'nope' does not match format '%Y'",
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        print('%-5s %-28s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL',
                                    key, actual))
    print(SUMMARY)
