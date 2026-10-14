"""A datetime class listed AFTER a plain mixin is still the class's base.

tomlkit defines ``class Time(Item, time)'' -- its own Item first -- and
builds instances with ``time.__new__(cls, ...)''.  Grail chose a
multi-base class's Smalltalk superclass by chain depth, and every datetime
class sits directly under Object, two deep, where a plain Python class is
three.  So Item won, time was merged in as a mixin without the class-side
constructor its instances come from, and the call died with an uncatchable
``Time class does not understand ___fromFields___:...''.  The same for
Date(Item, date) and DateTime(Item, datetime): every tomlkit test that
parsed a date or time ended the session.

replace() on such a subclass then passed ``fold=0'' to a __new__ that does
not take it.  CPython passes fold only when it is 1.

Every expectation was measured against CPython 3.14.
"""

from datetime import date, datetime, time, timedelta, timezone, tzinfo

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:200])


class Item:
    def __init__(self, trivia):
        self.trivia = trivia

    def describe(self):
        return '%s:%s' % (type(self).__name__, self.trivia)

    def isoformat(self):
        return 'mixin wins'


class Time(Item, time):
    def __new__(cls, hour, minute, second=0, microsecond=0, tzinfo=None, trivia=None):
        return time.__new__(cls, hour, minute, second, microsecond, tzinfo)

    def __init__(self, hour, minute, second=0, microsecond=0, tzinfo=None, trivia=None):
        super().__init__(trivia or 't')


class Date(Item, date):
    def __new__(cls, year, month, day, trivia=None):
        return date.__new__(cls, year, month, day)

    def __init__(self, year, month, day, trivia=None):
        super().__init__(trivia or 'd')


class DateTime(Item, datetime):
    def __new__(cls, year, month, day, hour=0, minute=0, second=0, microsecond=0,
                tzinfo=None, trivia=None):
        return datetime.__new__(cls, year, month, day, hour, minute, second,
                                microsecond, tzinfo)

    def __init__(self, *args, trivia=None, **fields):
        super().__init__(trivia or 'dt')


class Labelled:
    def label(self):
        return 'span of %s' % self.days


class Span(Labelled, timedelta):
    pass


class Offset(Item, tzinfo):
    def __init__(self):
        super().__init__('z')

    def utcoffset(self, dt):
        return timedelta(hours=2)


t = Time(7, 32, 5)
check('time_second_base',
      (t.hour, t.minute, t.second, t.describe(), isinstance(t, time),
       isinstance(t, Item), t == time(7, 32, 5), t.strftime('%H:%M')),
      (7, 32, 5, 'Time:t', True, True, True, '07:32'))
check('a_mixin_method_precedes_the_base', t.isoformat(), 'mixin wins')
check('the_mro', [c.__name__ for c in Time.__mro__], ['Time', 'Item', 'time', 'object'])

d = Date(1979, 5, 27)
check('date_second_base',
      (d.year, d.month, d.day, d.describe(), isinstance(d, date), d.toordinal(),
       d == date(1979, 5, 27)),
      (1979, 5, 27, 'Date:d', True, 722596, True))

w = DateTime(1979, 5, 27, 7, 32, tzinfo=timezone.utc)
check('datetime_second_base',
      (w.year, w.hour, w.describe(), isinstance(w, datetime), isinstance(w, date),
       w.timestamp(), w.tzinfo is timezone.utc),
      (1979, 7, 'DateTime:dt', True, True, 296638320.0, True))

check('timedelta_second_base',
      (Span(days=1, hours=2).total_seconds(), Span(3).label(), isinstance(Span(1), timedelta)),
      (93600.0, 'span of 3', True))

o = Offset()
check('tzinfo_second_base',
      (o.describe(), datetime(2000, 1, 1, tzinfo=o).utcoffset(), isinstance(o, tzinfo)),
      ('Offset:z', timedelta(hours=2), True))

check('replace_keeps_the_subclass_without_passing_fold',
      [(type(v).__name__, v.strftime('%Y-%m-%d %H:%M:%S %Z'))
       for v in (t.replace(hour=8), w.replace(day=28))],
      [('Time', '1900-01-01 08:32:05 '), ('DateTime', '1979-05-28 07:32:00 UTC')])


class Recorder(time):
    seen = []

    def __new__(cls, *args, **kwargs):
        Recorder.seen.append((args, kwargs))
        return super().__new__(cls, *args, **kwargs)


Recorder(1, 2).replace(minute=3)
Recorder(1, 2).replace(fold=1)
check('replace_passes_fold_only_when_it_is_one',
      Recorder.seen[1:2] + Recorder.seen[3:4],
      [((1, 3, 0, 0, None), {}), ((1, 2, 0, 0, None), {'fold': 1})])

SUMMARY = '%d checks, %d disagreeing' % (len(RESULTS), sum(1 for v in RESULTS.values() if v is not True))

if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
