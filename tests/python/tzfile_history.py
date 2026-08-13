# Regression fixture: the session zone comes from the tz DATABASE, so
# historical offsets are exact.
#
# Grail used GemStone's TimeZone, which models a single std/dst rule pair.
# That is right for a zone as it stands today but cannot reproduce its
# history: it was out by 2h across a 1918 DST boundary, and could not
# represent a pre-1946 offset that is not a whole number of minutes at all.
#
# localtime, mktime and datetime's local conversions now all read the same
# transition table, so they agree with each other and with CPython.

import os
import time
from datetime import datetime, timedelta, timezone

RESULTS = {}


def _epoch(*args):
    return (datetime(*args) - datetime(1970, 1, 1)).total_seconds()


_saved = os.environ.get('TZ')
try:
    # --- a sub-minute historical offset (Asia/Tehran, +3:25:44 before 1946)
    os.environ['TZ'] = 'Asia/Tehran'
    time.tzset()
    st = time.localtime(_epoch(1935, 6, 11, 8, 0))
    RESULTS['tehran_lmt_wall_clock'] = ((st[0], st[1], st[2], st[3], st[4], st[5])
                                        == (1935, 6, 11, 11, 25, 44))
    RESULTS['tehran_lmt_isdst'] = (st[8] == 0)
    # localtime/mktime must be inverses across it
    RESULTS['tehran_roundtrip'] = (time.mktime(st) == _epoch(1935, 6, 11, 8, 0))
    # and datetime must agree with time
    _dt = datetime.fromtimestamp(_epoch(1935, 6, 11, 8, 0))
    RESULTS['tehran_datetime_agrees'] = (_dt == datetime(1935, 6, 11, 11, 25, 44))
    RESULTS['tehran_datetime_roundtrip'] = (_dt.timestamp() == _epoch(1935, 6, 11, 8, 0))
    RESULTS['tehran_no_spurious_fold'] = (_dt.fold == 0)

    # --- a historical DST boundary the modern rule does not describe
    os.environ['TZ'] = 'America/New_York'
    time.tzset()
    st = time.localtime(_epoch(1918, 3, 31, 8, 30))
    RESULTS['ny_1918_wall_clock'] = ((st[0], st[1], st[2], st[3], st[4])
                                     == (1918, 3, 31, 4, 30))

    # --- a modern spring-forward GAP: the two folds straddle the shift
    _s0 = _epoch(2020, 3, 8, 7, 0)          # 02:00 -> 03:00 local
    _gap = datetime.fromtimestamp(_s0) - timedelta(seconds=1800)
    RESULTS['gap_fold0_timestamp'] = (_gap.timestamp() == _s0 + 1800)
    RESULTS['gap_fold1_timestamp'] = (_gap.replace(fold=1).timestamp() == _s0 - 1800)
    _u0 = _gap.astimezone(timezone.utc)
    _u1 = _gap.replace(fold=1).astimezone(timezone.utc)
    RESULTS['gap_astimezone_matches_timestamp'] = (_u0 == _u1 + timedelta(seconds=3600))

    # --- a modern fall-back FOLD is still detected
    _f0 = _epoch(2020, 11, 1, 6, 0)         # 02:00 EDT -> 01:00 EST
    RESULTS['fold_detected'] = (datetime.fromtimestamp(_f0 + 1800).fold == 1)
    RESULTS['pre_fold_not_flagged'] = (datetime.fromtimestamp(_f0 - 1800).fold == 0)

    # --- the module globals describe the zone as it stands NOW
    RESULTS['ny_has_daylight'] = (time.daylight == 1)
    RESULTS['ny_tznames_differ'] = (time.tzname[0] != time.tzname[1])

    # --- a DST-LESS zone must report daylight 0 and one name twice
    os.environ['TZ'] = 'UTC'
    time.tzset()
    RESULTS['utc_no_daylight'] = (time.daylight == 0)
    RESULTS['utc_isdst_flags'] = (time.localtime(_epoch(2026, 1, 15)).tm_isdst == 0
                                  and time.localtime(_epoch(2026, 7, 14)).tm_isdst == 0)

    # --- a POSIX rule spec (no zone file) must still work
    os.environ['TZ'] = 'EST+05EDT,M3.2.0,M11.1.0'
    time.tzset()
    RESULTS['posix_spec_still_works'] = (time.tzname[0] == 'EST')

    # --- gmtime must be untouched by any of this
    RESULTS['gmtime_still_utc'] = (time.gmtime(0)[:6] == (1970, 1, 1, 0, 0, 0))
finally:
    if _saved is None:
        os.environ.pop('TZ', None)
    else:
        os.environ['TZ'] = _saved
    time.tzset()
