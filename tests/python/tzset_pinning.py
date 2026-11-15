"""Fixture for time.tzset() and the TZ pinning test.support.run_with_tz needs.

Every assertion here is machine-independent ON PURPOSE: each case sets TZ
explicitly, so the expected values hold wherever the suite runs.  That is the
whole point of the change -- before it, a pinned test measured the host's
timezone instead of the one it named.
"""

import os
import time

from test import support


def _with_tz(spec, fn):
    """Set TZ, run fn, restore -- the shape run_with_tz uses."""
    had = 'TZ' in os.environ
    orig = os.environ.get('TZ')
    os.environ['TZ'] = spec
    try:
        time.tzset()
        return fn()
    finally:
        # Unset, not '': CPython reads an empty TZ as UTC, so restoring an
        # unset TZ as '' silently re-timed everything after the first pin.
        if had:
            os.environ['TZ'] = orig
        else:
            del os.environ['TZ']
        time.tzset()


def globals_for(spec):
    """(timezone, altzone, daylight, tzname) under the named zone."""
    return _with_tz(spec, lambda: (time.timezone, time.altzone,
                                   time.daylight, list(time.tzname)))


def posix_spec_with_dst():
    """``EST+05EDT,M3.2.0,M11.1.0'' -- a POSIX spec naming a DST rule.  The
    concatenation EST5EDT is itself a zone the database knows, and it carries
    the real rule, which matters because the tests using this spelling are the
    ones about fold and the DST transitions."""
    return globals_for('EST+05EDT,M3.2.0,M11.1.0')


def posix_spec_fixed_west():
    """``EDT4'' -- a fixed offset, no DST."""
    return globals_for('EDT4')


def posix_spec_fixed_east():
    """``MSK-03'' -- POSIX counts WEST as positive, so this is UTC+3."""
    return globals_for('MSK-03')


def olson_name():
    return globals_for('UTC')


def olson_name_with_half_hour_dst():
    """Lord Howe: +10:30 standard, and a THIRTY-minute DST step."""
    return globals_for('Australia/Lord_Howe')


def unresolvable_spec_raises():
    """Grail diverges from CPython here on purpose: an unresolvable TZ raises
    rather than silently leaving the old zone in place.  Silently keeping it is
    how the whole problem stayed invisible."""
    try:
        return _with_tz('Nowhere/Bogus', lambda: 'no error')
    except ValueError:
        return 'ValueError'


def tzset_reads_as_a_callable():
    """A UNARY method on a module is treated as a value attribute, so the
    attribute load used to INVOKE tzset and answer its return: ``time.tzset''
    was None and ``time.tzset()'' failed with ``'NoneType' object is not
    callable''.  hasattr said True throughout, because the probing call
    succeeded."""
    return [callable(time.tzset), callable(getattr(time, 'tzset', None))]


def restores_the_previous_zone():
    """The zone is SESSION state in the gem, so a pin that leaked would
    silently re-time every later test in the run."""
    before = (time.timezone, list(time.tzname))
    globals_for('UTC')
    return before == (time.timezone, list(time.tzname))


def run_with_tz_pins_the_zone():
    """The decorator itself, which is what the vendored CPython tests use."""
    @support.run_with_tz('EST+05EDT,M3.2.0,M11.1.0')
    def inner():
        return (time.timezone, list(time.tzname))
    return inner()


def run_with_tz_restores_after_the_call():
    before = (time.timezone, list(time.tzname))
    run_with_tz_pins_the_zone()
    return before == (time.timezone, list(time.tzname))


def empty_tz_is_utc():
    """An EMPTY TZ is UTC, as CPython and the C library read it -- not
    "unset", which would mean the host's zone.  Grail read it as unset, which
    is what let restoring an unset TZ as '' look correct here while it
    re-timed everything to UTC under CPython."""
    return globals_for('')


def _tz_after_run_with_tz(start):
    """TZ as run_with_tz leaves it, starting from start (None = unset)."""
    had = 'TZ' in os.environ
    orig = os.environ.get('TZ')
    try:
        if start is None:
            os.environ.pop('TZ', None)
        else:
            os.environ['TZ'] = start
        time.tzset()
        support.run_with_tz('UTC')(lambda: None)()
        return os.environ.get('TZ', '<unset>')
    finally:
        if had:
            os.environ['TZ'] = orig
        else:
            os.environ.pop('TZ', None)
        time.tzset()


def run_with_tz_leaves_tz_as_it_found_it():
    """An unset TZ stays UNSET after the decorator, not '' (which CPython,
    and now Grail, read as UTC), and a set one gets its value back."""
    return [_tz_after_run_with_tz(None), _tz_after_run_with_tz('Asia/Tokyo')]


# What CPython 3.14 answers.  Every key holds under CPython wherever it runs:
# each case pins its own zone, so the host's is never measured.
EXPECTED = {
    'posix_spec_with_dst': (18000, 14400, 1, ['EST', 'EDT']),
    'olson_name': (0, 0, 0, ['UTC', 'UTC']),
    'olson_name_with_half_hour_dst': (-37800, -39600, 1, ['+1030', '+11']),
    'empty_tz_is_utc': (0, 0, 0, ['UTC', 'UTC']),
    'tzset_reads_as_a_callable': [True, True],
    'restores_the_previous_zone': True,
    'run_with_tz_pins_the_zone': (18000, ['EST', 'EDT']),
    'run_with_tz_restores_after_the_call': True,
    'run_with_tz_leaves_tz_as_it_found_it': ['<unset>', 'Asia/Tokyo'],
}

# Where Grail differs from CPython, with CPython's answer.  Pinned to Grail's
# own answers by TzsetPinningTestCase:
#   * a POSIX spec without a DST rule keeps the abbreviation it spells in
#     CPython ('EDT4' -> EDT); Grail names it by its offset (-04);
#   * an unresolvable TZ raises ValueError in Grail, on purpose, where CPython
#     silently uses UTC.
KNOWN_DIVERGENCES = {
    'posix_spec_fixed_west': (14400, 14400, 0, ['EDT', 'EDT']),
    'posix_spec_fixed_east': (-10800, -10800, 0, ['MSK', 'MSK']),
    'unresolvable_spec_raises': 'no error',
}


if __name__ == '__main__':
    for key, expected in EXPECTED.items():
        actual = globals()[key]()
        ok = actual == expected
        print('%-5s %-40s -> %s' % ('OK' if ok else 'FAIL', key,
                                    'as expected' if ok else repr(actual)))
    for key, expected in KNOWN_DIVERGENCES.items():
        actual = globals()[key]()
        print('%-5s %-40s -> %r' % ('OK' if actual == expected else 'XFAIL',
                                    key, actual))
