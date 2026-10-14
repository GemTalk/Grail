"""``m.C()`` with no arguments builds an instance of a native module's class.

A zero-argument ``m.f()`` and the read ``m.f`` compile to the same unary send
to the module, so for an accessor answering a CLASS the call was dropped and
the class came back: ``datetime.time()``, ``datetime.timedelta()``,
``datetime.tzinfo()``, ``fractions.Fraction()`` and ``numbers.Number()``
answered the class (#1448, #1492).  ``sum([], datetime.timedelta())`` was the
class, and Django's feed generator's ``datetime.combine(d, datetime.time())``
raised.  The rows spell each call literally -- that spelling is the bug; an
alias or getattr never had it.

The other value accessors of the same modules are covered too: calling
``datetime.date()`` without its arguments, or ``datetime.MINYEAR()``, raises
TypeError as in CPython instead of answering the class or 1.  Classes of the
other Smalltalk-implemented modules, already right, are the guards.

EXPECTED is CPython 3.14's output; mismatches() is what the Smalltalk test case
asserts is empty.
"""

import datetime
import fractions
import io
import json
import numbers
import random
import threading
import warnings

r = {}


def t(label, thunk):
    try:
        r[label] = repr(thunk())
    except Exception as e:
        r[label] = type(e).__name__


tz_alias = datetime.timezone


def kind(obj):
    return type(obj).__name__


t('datetime.time()', lambda: kind(datetime.time()))
t('datetime.timedelta()', lambda: kind(datetime.timedelta()))
t('datetime.tzinfo()', lambda: kind(datetime.tzinfo()))
t('fractions.Fraction()', lambda: (kind(fractions.Fraction()), fractions.Fraction() == 0))
t('numbers.Number()', lambda: kind(numbers.Number()))
t('sum of no timedeltas', lambda: sum([], datetime.timedelta()))
t('timedelta() + timedelta(1)', lambda: datetime.timedelta() + datetime.timedelta(1))
t('combine(date, time())', lambda: datetime.datetime.combine(datetime.date(2026, 10, 5), datetime.time()))
t('datetime.date() without arguments', lambda: datetime.date())
t('datetime.datetime() without arguments', lambda: datetime.datetime())
t('datetime.timezone() without arguments', lambda: datetime.timezone())
t('timezone alias without arguments', lambda: tz_alias())
t('datetime.MINYEAR()', lambda: datetime.MINYEAR())
t('datetime.MAXYEAR()', lambda: datetime.MAXYEAR())
t('datetime.UTC()', lambda: datetime.UTC())
t('reads still answer the class', lambda: (datetime.time is type(datetime.time(0)), fractions.Fraction.__name__, datetime.MINYEAR, datetime.UTC is datetime.timezone.utc))
t('guard: with arguments', lambda: (kind(datetime.time(1)), kind(fractions.Fraction(1, 2))))
t('guard: io.BytesIO()', lambda: kind(io.BytesIO()))
t('guard: io.StringIO()', lambda: kind(io.StringIO()))
t('guard: json.JSONEncoder()', lambda: kind(json.JSONEncoder()))
t('guard: random.Random()', lambda: kind(random.Random()))
t('guard: threading.Event()', lambda: kind(threading.Event()))
t('guard: warnings.catch_warnings()', lambda: kind(warnings.catch_warnings()))


EXPECTED = {
    'datetime.time()': "'time'",
    'datetime.timedelta()': "'timedelta'",
    'datetime.tzinfo()': "'tzinfo'",
    'fractions.Fraction()': "('Fraction', True)",
    'numbers.Number()': "'Number'",
    'sum of no timedeltas': 'datetime.timedelta(0)',
    'timedelta() + timedelta(1)': 'datetime.timedelta(days=1)',
    'combine(date, time())': 'datetime.datetime(2026, 10, 5, 0, 0)',
    'datetime.date() without arguments': 'TypeError',
    'datetime.datetime() without arguments': 'TypeError',
    'datetime.timezone() without arguments': 'TypeError',
    'timezone alias without arguments': 'TypeError',
    'datetime.MINYEAR()': 'TypeError',
    'datetime.MAXYEAR()': 'TypeError',
    'datetime.UTC()': 'TypeError',
    'reads still answer the class': "(True, 'Fraction', 1, True)",
    'guard: with arguments': "('time', 'Fraction')",
    'guard: io.BytesIO()': "'BytesIO'",
    'guard: io.StringIO()': "'StringIO'",
    'guard: json.JSONEncoder()': "'JSONEncoder'",
    'guard: random.Random()': "'Random'",
    'guard: threading.Event()': "'Event'",
    'guard: warnings.catch_warnings()': "'catch_warnings'",
}


def mismatches():
    """The rows that differ from CPython's, as 'label: got X, CPython Y'."""
    return ['%s: got %s, CPython %s' % (k, r.get(k), v)
            for k, v in EXPECTED.items() if r.get(k) != v]


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-4s %s: %r' % ('OK' if actual == EXPECTED[k] else 'DIFF', k, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-4s %s is not in EXPECTED' % ('DIFF', extra))
