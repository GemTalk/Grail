"""``datetime.datetime`` is a subclass of ``datetime.date``.

It was a separate class, so ``isinstance(dt, date)`` was False (#1446).
Werkzeug's ``http_date`` asks exactly that to choose between formatting a
date and formatting a number of seconds, so a permanent Flask session's
cookie expiry raised TypeError and the request answered 500; Flask's JSON
default and Django ask it too.  An unbound date method called on a datetime,
``date.toordinal(dt)``, ended the program with an uncatchable error.

Being a subclass must not make the two compare as equal: CPython's date
methods answer NotImplemented for a datetime, so ``date == datetime`` is
False and ordering or subtracting the two raises TypeError.  Those rows are
here as well as the subclass ones.

EXPECTED is CPython 3.14's output; mismatches() is what the Smalltalk test case
asserts is empty.
"""

import copy
import email.utils
import pickle
from datetime import date, datetime, time, timedelta, timezone

r = {}


def t(label, thunk):
    try:
        r[label] = repr(thunk())
    except Exception as e:
        r[label] = type(e).__name__


class MyDT(datetime):
    pass


class MyDate(date):
    pass


def http_date(timestamp):
    """werkzeug.http.http_date's dispatch, which #1446 broke."""
    if isinstance(timestamp, date):
        if not isinstance(timestamp, datetime):
            timestamp = datetime.combine(timestamp, time(), tzinfo=timezone.utc)
        return email.utils.format_datetime(timestamp, usegmt=True)
    return email.utils.formatdate(timestamp, usegmt=True)


d = date(2026, 10, 5)
dt = datetime(2026, 10, 5)
aware = datetime(2026, 10, 5, 12, tzinfo=timezone.utc)

t('isinstance(datetime, date)', lambda: isinstance(dt, date))
t('issubclass(datetime, date)', lambda: issubclass(datetime, date))
t('datetime.__mro__', lambda: [c.__name__ for c in datetime.__mro__])
t('datetime.__bases__', lambda: [c.__name__ for c in datetime.__bases__])
t('isinstance(date, datetime)', lambda: isinstance(d, datetime))
t('subclass of datetime is a date', lambda: (isinstance(MyDT(2026, 1, 1), date), issubclass(MyDT, date)))
t('date.toordinal(datetime)', lambda: date.toordinal(dt))
t('date.weekday(datetime)', lambda: date.weekday(aware))
t('date.isoformat(datetime)', lambda: date.isoformat(aware))
t('date.timetuple(datetime)', lambda: tuple(date.timetuple(aware)))
t('date.ctime(datetime)', lambda: date.ctime(aware))
t('http_date(aware datetime)', lambda: http_date(aware))
t('http_date(date)', lambda: http_date(d))
t('http_date(seconds)', lambda: http_date(0))
t('date == datetime', lambda: d == dt)
t('datetime == date', lambda: dt == d)
t('date != datetime', lambda: d != dt)
t('date.__eq__(datetime)', lambda: d.__eq__(dt))
t('date.__lt__(datetime)', lambda: d.__lt__(dt))
t('datetime.__eq__(date)', lambda: dt.__eq__(d))
t('MyDate == datetime', lambda: MyDate(2026, 10, 5) == dt)
t('MyDate == date', lambda: MyDate(2026, 10, 5) == d)
t('date < datetime', lambda: d < dt)
t('datetime < date', lambda: dt < d)
t('date >= datetime', lambda: d >= dt)
t('date - datetime', lambda: d - dt)
t('datetime - date', lambda: dt - d)
t('date in [datetime]', lambda: d in [dt])
t('dict keyed by date, looked up by datetime', lambda: {d: 1}.get(dt))
t('set of a date and a datetime', lambda: len({d, dt}))
t('sorted mixed', lambda: sorted([dt, d]))
t('date - date', lambda: date(2026, 10, 5) - date(2026, 10, 1))
t('date < date', lambda: date(2026, 10, 1) < d)
t('date + timedelta', lambda: d + timedelta(days=1))
t('datetime + timedelta', lambda: dt + timedelta(hours=1))
t('datetime - datetime', lambda: aware - datetime(2026, 10, 5, tzinfo=timezone.utc))
t('datetime.date()', lambda: (type(dt.date()).__name__, dt.date() == d))
t('date.today() type', lambda: type(date.today()).__name__)
t('datetime.today() type', lambda: type(datetime.today()).__name__)
t('datetime.fromordinal', lambda: datetime.fromordinal(d.toordinal()))
t('combine(datetime, time)', lambda: datetime.combine(aware, time(1)))
t('repr/str', lambda: (repr(aware), str(aware), str(d)))
t('datetime.min/max', lambda: (datetime.min, datetime.max, date.min, date.max))
t('pickle round trip', lambda: (pickle.loads(pickle.dumps(aware)) == aware, pickle.loads(pickle.dumps(d)) == d))
t('copy', lambda: (copy.copy(aware), copy.deepcopy(d)))
t('replace', lambda: (aware.replace(day=6), d.replace(day=6)))
t('isocalendar', lambda: (tuple(aware.isocalendar()), tuple(d.isocalendar())))


EXPECTED = {
    'isinstance(datetime, date)': 'True',
    'issubclass(datetime, date)': 'True',
    'datetime.__mro__': "['datetime', 'date', 'object']",
    'datetime.__bases__': "['date']",
    'isinstance(date, datetime)': 'False',
    'subclass of datetime is a date': '(True, True)',
    'date.toordinal(datetime)': '739894',
    'date.weekday(datetime)': '0',
    'date.isoformat(datetime)': "'2026-10-05'",
    'date.timetuple(datetime)': '(2026, 10, 5, 0, 0, 0, 0, 278, -1)',
    'date.ctime(datetime)': "'Mon Oct  5 00:00:00 2026'",
    'http_date(aware datetime)': "'Mon, 05 Oct 2026 12:00:00 GMT'",
    'http_date(date)': "'Mon, 05 Oct 2026 00:00:00 GMT'",
    'http_date(seconds)': "'Thu, 01 Jan 1970 00:00:00 GMT'",
    'date == datetime': 'False',
    'datetime == date': 'False',
    'date != datetime': 'True',
    'date.__eq__(datetime)': 'NotImplemented',
    'date.__lt__(datetime)': 'NotImplemented',
    'datetime.__eq__(date)': 'NotImplemented',
    'MyDate == datetime': 'False',
    'MyDate == date': 'True',
    'date < datetime': 'TypeError',
    'datetime < date': 'TypeError',
    'date >= datetime': 'TypeError',
    'date - datetime': 'TypeError',
    'datetime - date': 'TypeError',
    'date in [datetime]': 'False',
    'dict keyed by date, looked up by datetime': 'None',
    'set of a date and a datetime': '2',
    'sorted mixed': 'TypeError',
    'date - date': 'datetime.timedelta(days=4)',
    'date < date': 'True',
    'date + timedelta': 'datetime.date(2026, 10, 6)',
    'datetime + timedelta': 'datetime.datetime(2026, 10, 5, 1, 0)',
    'datetime - datetime': 'datetime.timedelta(seconds=43200)',
    'datetime.date()': "('date', True)",
    'date.today() type': "'date'",
    'datetime.today() type': "'datetime'",
    'datetime.fromordinal': 'datetime.datetime(2026, 10, 5, 0, 0)',
    'combine(datetime, time)': 'datetime.datetime(2026, 10, 5, 1, 0)',
    'repr/str': "('datetime.datetime(2026, 10, 5, 12, 0, tzinfo=datetime.timezone.utc)', '2026-10-05 12:00:00+00:00', '2026-10-05')",
    'datetime.min/max': '(datetime.datetime(1, 1, 1, 0, 0), datetime.datetime(9999, 12, 31, 23, 59, 59, 999999), datetime.date(1, 1, 1), datetime.date(9999, 12, 31))',
    'pickle round trip': '(True, True)',
    'copy': '(datetime.datetime(2026, 10, 5, 12, 0, tzinfo=datetime.timezone.utc), datetime.date(2026, 10, 5))',
    'replace': '(datetime.datetime(2026, 10, 6, 12, 0, tzinfo=datetime.timezone.utc), datetime.date(2026, 10, 6))',
    'isocalendar': '((2026, 41, 1), (2026, 41, 1))',
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
