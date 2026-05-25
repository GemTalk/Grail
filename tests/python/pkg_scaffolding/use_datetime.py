import datetime


def make_datetime():
    return datetime.datetime(2024, 5, 18, 13, 45, 30)


def datetime_fields(dt):
    return (dt.year, dt.month, dt.day, dt.hour, dt.minute, dt.second)


def isoformat_of(dt):
    return dt.isoformat()


def from_iso(s):
    return datetime.datetime.fromisoformat(s)


def round_trip_iso():
    s = "2024-05-18T13:45:30"
    return datetime.datetime.fromisoformat(s).isoformat()


def now_is_recent():
    now = datetime.datetime.now()
    return now.year > 2020 and now.year < 2100


def fromtimestamp(ts):
    return datetime.datetime.fromtimestamp(ts)


def timestamp_roundtrip(ts):
    return datetime.datetime.fromtimestamp(ts).timestamp()


def make_timedelta():
    return datetime.timedelta(days=2, hours=3, minutes=15)


def timedelta_total_seconds(td):
    return td.total_seconds()


def add_timedelta():
    base = datetime.datetime(2024, 1, 1, 0, 0, 0)
    delta = datetime.timedelta(days=10, hours=5)
    return base + delta


def subtract_datetimes():
    a = datetime.datetime(2024, 1, 11, 5, 0, 0)
    b = datetime.datetime(2024, 1, 1, 0, 0, 0)
    return (a - b).total_seconds()


def utc_timezone():
    # In CPython, `timezone.utc` is a class attribute (the singleton).
    # Grail's metaclass attribute lookup doesn't yet promote
    # `___pythonValueAttrs___` to class-side reads, so we call the
    # singleton accessor explicitly.  Werkzeug / itsdangerous calls
    # the parens form via from-import too, so this still mirrors a
    # realistic shape.
    return datetime.timezone.utc()


def datetime_with_tz():
    return datetime.datetime(2024, 5, 18, 12, 0, 0, 0, datetime.timezone.utc())


def datetime_now_utc():
    return datetime.datetime.now(datetime.timezone.utc()).tzinfo


def iso_with_tz(s):
    return datetime.datetime.fromisoformat(s).tzinfo


def timedelta_arithmetic():
    a = datetime.timedelta(seconds=30)
    b = datetime.timedelta(seconds=15)
    return (a + b).total_seconds(), (a - b).total_seconds()


# ---------------------------------------------------------------------------
# date class

def make_date():
    return datetime.date(2024, 5, 18)


def date_fields(d):
    return (d.year, d.month, d.day)


def date_isoformat(d):
    return d.isoformat()


def date_today_is_recent():
    today = datetime.date.today()
    return today.year > 2020 and today.year < 2100


def date_from_iso(s):
    return datetime.date.fromisoformat(s)


def date_iso_roundtrip():
    s = "2024-05-18"
    return datetime.date.fromisoformat(s).isoformat()


def date_weekday(d):
    # Python convention: Monday=0..Sunday=6.  2024-05-18 was Saturday.
    return d.weekday()


def date_isoweekday(d):
    # ISO 8601: Monday=1..Sunday=7.
    return d.isoweekday()


def date_toordinal(d):
    # Proleptic Gregorian ordinal; 0001-01-01 is day 1.
    return d.toordinal()


def date_fromordinal_roundtrip(d):
    return datetime.date.fromordinal(d.toordinal()).isoformat()


def date_plus_timedelta():
    d = datetime.date(2024, 1, 1)
    return (d + datetime.timedelta(days=10)).isoformat()


def date_minus_date():
    a = datetime.date(2024, 1, 11)
    b = datetime.date(2024, 1, 1)
    return (a - b).days


def date_equality():
    a = datetime.date(2024, 5, 18)
    b = datetime.date(2024, 5, 18)
    c = datetime.date(2024, 5, 19)
    return (a == b, a == c, a < c, c > a)


def date_replace():
    d = datetime.date(2024, 5, 18)
    return d.replace(year=2025).isoformat()


# ---------------------------------------------------------------------------
# time class

def make_time():
    return datetime.time(12, 30, 45)


def time_fields(t):
    return (t.hour, t.minute, t.second, t.microsecond)


def time_isoformat(t):
    return t.isoformat()


def time_with_micros():
    return datetime.time(12, 30, 45, 123456).isoformat()


def time_from_iso(s):
    return datetime.time.fromisoformat(s).isoformat()


def time_equality():
    a = datetime.time(12, 30)
    b = datetime.time(12, 30, 0, 0)
    c = datetime.time(13, 0)
    return (a == b, a == c, a == 'string')
