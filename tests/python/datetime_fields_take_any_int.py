"""Fixture: date, datetime and time take any int for their fields.

CPython's constructors read each field with the ``i'' argument format
(Modules/_datetimemodule.c), which takes anything with __index__ -- a bool,
an IntEnum member, an int subclass's instance -- and refuses anything else
with "'float' object cannot be interpreted as an integer".

Grail took only an int, so ``date(2004, Month.JANUARY, 1)'' raised
TypeError, and so did every formatting method of CPython's calendar, whose
months and weekdays are IntEnums.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import datetime
import enum

r = {}


class Month(enum.IntEnum):
    JANUARY = 1


class Small(int):
    pass


def outcome(thunk):
    try:
        return thunk()
    except TypeError as e:
        return 'TypeError: %s' % e


r['date'] = [datetime.date(2004, Month.JANUARY, 1), datetime.date(2004, True, Small(2)),
             type(datetime.date(2004, Month.JANUARY, 1).month) is int]
r['datetime'] = datetime.datetime(2004, Month.JANUARY, True, Small(3), Month.JANUARY, True, Small(5))
r['time'] = [datetime.time(Month.JANUARY, True, Small(3), Small(4)),
             type(datetime.time(Month.JANUARY).hour) is int]
r['a_date_subclass'] = (lambda D: D(2004, Month.JANUARY, True))(type('D', (datetime.date,), {}))
r['refused'] = [outcome(lambda: datetime.date(2004, 1.5, 1)), outcome(lambda: datetime.date(2004, '1', 1)),
                outcome(lambda: datetime.time(1.5)),
                outcome(lambda: datetime.datetime(2004, 1, 1, 0, 0, 0, 0.5))]

EXPECTED = {
    'date': [datetime.date(2004, 1, 1), datetime.date(2004, 1, 2), True],
    'datetime': datetime.datetime(2004, 1, 1, 3, 1, 1, 5),
    'time': [datetime.time(1, 1, 3, 4), True],
    'a_date_subclass': datetime.date(2004, 1, 1),
    'refused': ["TypeError: 'float' object cannot be interpreted as an integer",
                "TypeError: 'str' object cannot be interpreted as an integer",
                "TypeError: 'float' object cannot be interpreted as an integer",
                "TypeError: 'float' object cannot be interpreted as an integer"],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-15s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
