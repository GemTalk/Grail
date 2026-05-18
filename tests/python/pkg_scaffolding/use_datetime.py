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
