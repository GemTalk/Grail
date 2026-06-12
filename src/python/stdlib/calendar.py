# GRAIL calendar - the computational core of CPython's calendar module:
# leap-year math, weekday/monthrange/monthcalendar, day/month name
# tables, and timegm.  Deviations: the Calendar/TextCalendar/
# HTMLCalendar formatting classes are not provided; firstweekday is
# fixed at Monday (0) for monthcalendar.

__all__ = ["isleap", "leapdays", "weekday", "monthrange", "monthcalendar",
           "timegm", "day_name", "day_abbr", "month_name", "month_abbr",
           "mdays", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY",
           "SATURDAY", "SUNDAY", "IllegalMonthError"]

MONDAY = 0
TUESDAY = 1
WEDNESDAY = 2
THURSDAY = 3
FRIDAY = 4
SATURDAY = 5
SUNDAY = 6

day_name = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday",
            "Saturday", "Sunday"]
day_abbr = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
month_name = ["", "January", "February", "March", "April", "May", "June",
              "July", "August", "September", "October", "November",
              "December"]
month_abbr = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
              "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

mdays = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]


class IllegalMonthError(ValueError):
    pass


def isleap(year):
    """Return True for leap years, False for non-leap years."""
    return year % 4 == 0 and (year % 100 != 0 or year % 400 == 0)


def leapdays(y1, y2):
    """Return number of leap years in range [y1, y2)."""
    y1 = y1 - 1
    y2 = y2 - 1
    return (y2 // 4 - y1 // 4) - (y2 // 100 - y1 // 100) + (y2 // 400 - y1 // 400)


def _days_from_civil(y, m, d):
    """Days since 1970-01-01 (proleptic Gregorian; Howard Hinnant's
    civil_from_days inverse)."""
    if m <= 2:
        y = y - 1
    if y >= 0:
        era = y // 400
    else:
        era = (y - 399) // 400
    yoe = y - era * 400
    if m > 2:
        mp = m - 3
    else:
        mp = m + 9
    doy = (153 * mp + 2) // 5 + d - 1
    doe = yoe * 365 + yoe // 4 - yoe // 100 + doy
    return era * 146097 + doe - 719468


def weekday(year, month, day):
    """Return weekday (0-6 ~ Mon-Sun) for year, month (1-12), day (1-31)."""
    days = _days_from_civil(year, month, day)
    # 1970-01-01 was a Thursday (weekday 3).
    return (days + 3) % 7


def monthrange(year, month):
    """Return weekday of the first day of the month and number of days
    in the month, for the specified year and month."""
    if month < 1 or month > 12:
        raise IllegalMonthError("bad month number " + str(month) + "; must be 1-12")
    day1 = weekday(year, month, 1)
    ndays = mdays[month]
    if month == 2 and isleap(year):
        ndays = 29
    return (day1, ndays)


def monthcalendar(year, month):
    """Return a matrix representing a month's calendar.  Each row
    represents a week (Monday first); days outside the month are 0."""
    first, ndays = monthrange(year, month)
    weeks = []
    week = []
    i = 0
    while i < first:
        week.append(0)
        i = i + 1
    day = 1
    while day <= ndays:
        week.append(day)
        if len(week) == 7:
            weeks.append(week)
            week = []
        day = day + 1
    if week:
        while len(week) < 7:
            week.append(0)
        weeks.append(week)
    return weeks


def timegm(tuple_time):
    """Inverse of time.gmtime: turn a UTC struct_time-like sequence
    (year, month, day, hour, minute, second, ...) into epoch seconds."""
    year = tuple_time[0]
    month = tuple_time[1]
    day = tuple_time[2]
    hour = tuple_time[3]
    minute = tuple_time[4]
    second = tuple_time[5]
    days = _days_from_civil(year, month, day)
    return ((days * 24 + hour) * 60 + minute) * 60 + second
