"""An unbound built-in method on a subclass instance runs the BASE's method (#1613).

``Base.meth(instance)`` asks for Base's implementation, whatever the instance's
class overrides.  Two ways Grail missed it:

* ``time.isoformat`` and ``datetime.isoformat`` ran a subclass's override.  The
  fixed form re-sent ``_isoformat:kw:``, a selector a subclass's own ``def
  isoformat`` compiles too, so the re-send landed on the override.  ``str()``
  is different and stays VIRTUAL, as CPython's ``__str__`` calls
  ``self.isoformat()``.
* ``int.bit_length(MyInt(5))``, ``int.__add__(MyInt(3), 1)`` and
  ``float.is_integer(MyFloat(2.0))`` raised AttributeError: a Python int or
  float subclass is rooted at a boxed base that publishes only part of the
  kernel class's protocol.

Self-running: ``python3 unbound_builtin_method.py`` prints one line per check
against what CPython 3.14 answers.
"""

import datetime
import enum


class OwnTime(datetime.time):
    def isoformat(self):
        return "override"


class OwnDateTime(datetime.datetime):
    def isoformat(self):
        return "override"


class SepDateTime(datetime.datetime):
    def isoformat(self, sep="T", timespec="auto"):
        return "override, sep=%r" % sep


class OwnDate(datetime.date):
    def isoformat(self):
        return "override"


class OwnStr(str):
    def upper(self):
        return "override"


class MyInt(int):
    pass


class MyFloat(float):
    pass


class Level(enum.IntEnum):
    HIGH = 5


def _outcome(action):
    try:
        return "ok -> %r" % (action(),)
    except Exception as e:
        return "%s: %s" % (type(e).__name__, e)


r = {
    "time_isoformat": _outcome(lambda: datetime.time.isoformat(OwnTime(1, 2))),
    "datetime_isoformat": _outcome(lambda: datetime.datetime.isoformat(OwnDateTime(2020, 1, 2))),
    "datetime_isoformat_sep": _outcome(lambda: datetime.datetime.isoformat(SepDateTime(2020, 1, 2), " ")),
    "date_isoformat": _outcome(lambda: datetime.date.isoformat(OwnDate(2020, 1, 2))),
    "str_upper": _outcome(lambda: str.upper(OwnStr("ab"))),
    "str_of_time_is_virtual": _outcome(lambda: str(OwnTime(1, 2))),
    "str_of_datetime_is_virtual": _outcome(lambda: str(OwnDateTime(2020, 1, 2))),
    "str_of_datetime_passes_sep": _outcome(lambda: str(SepDateTime(2020, 1, 2))),
    "plain_isoformat_unchanged": _outcome(lambda: (datetime.time(1, 2, 3).isoformat("minutes"),
                                                   datetime.datetime(2020, 1, 2, 3).isoformat(" ", "hours"),
                                                   str(datetime.datetime(2020, 1, 2)))),
    "int_bit_length": _outcome(lambda: int.bit_length(MyInt(5))),
    "int_add": _outcome(lambda: int.__add__(MyInt(3), 1)),
    "int_add_answers_an_int": _outcome(lambda: type(int.__add__(MyInt(3), 1)).__name__),
    "int_to_bytes": _outcome(lambda: int.to_bytes(MyInt(258), 2, "big")),
    "int_on_an_intenum": _outcome(lambda: (int.bit_length(Level.HIGH), int.__repr__(Level.HIGH))),
    "float_is_integer": _outcome(lambda: (float.is_integer(MyFloat(2.0)), float.is_integer(MyFloat(2.5)))),
}

EXPECTED = {
    'date_isoformat':
        "ok -> '2020-01-02'",
    'datetime_isoformat':
        "ok -> '2020-01-02T00:00:00'",
    'datetime_isoformat_sep':
        "ok -> '2020-01-02 00:00:00'",
    'float_is_integer':
        'ok -> (True, False)',
    'int_add':
        'ok -> 4',
    'int_add_answers_an_int':
        "ok -> 'int'",
    'int_bit_length':
        'ok -> 3',
    'int_on_an_intenum':
        "ok -> (3, '5')",
    'int_to_bytes':
        "ok -> b'\\x01\\x02'",
    'plain_isoformat_unchanged':
        "ok -> ('01:02', '2020-01-02 03', '2020-01-02 00:00:00')",
    'str_of_datetime_is_virtual':
        'TypeError: OwnDateTime.isoformat() takes 1 positional argument but 2 were given',
    'str_of_datetime_passes_sep':
        'ok -> "override, sep=\' \'"',
    'str_of_time_is_virtual':
        "ok -> 'override'",
    'str_upper':
        "ok -> 'AB'",
    'time_isoformat':
        "ok -> '01:02:00'",
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, "<missing>") != EXPECTED[k])
SUMMARY = "%d checks, %d disagreeing %r, keys match: %s" % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-28s %s %r' % (k, 'OK ' if actual == EXPECTED[k] else 'DIFF', actual))
    print(SUMMARY)
