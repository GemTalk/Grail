# Grail email.utils stub.
#
# Werkzeug.http uses email.utils for two HTTP-date helpers:
#   * ``parsedate_to_datetime(s)'' — RFC 5322 ``Sun, 06 Nov 1994
#     08:49:37 GMT'' → datetime.
#   * ``format_datetime(dt, usegmt=True)'' — datetime → same shape.
#
# Real CPython email.utils also exposes RFC 2822 address parsing,
# quoted-printable / base64 helpers, message-ID generation, etc.
# Add as Werkzeug surfaces require — for now the two HTTP-date
# helpers cover http.py's call sites.


from datetime import datetime, timezone


_MONTHS = ('Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
           'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec')
_MONTH_IDX = {name: i + 1 for i, name in enumerate(_MONTHS)}
_DAYS = ('Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun')


def parsedate_to_datetime(date_str):
    """Parse an RFC 5322 / RFC 7231 HTTP date string into a datetime.
    Returns a timezone-aware datetime in UTC.

    Accepted formats:
      * ``Sun, 06 Nov 1994 08:49:37 GMT''   (preferred, RFC 7231)
      * ``Sunday, 06-Nov-94 08:49:37 GMT''  (RFC 850, obsolete)
      * ``Sun Nov  6 08:49:37 1994''        (ANSI C asctime)

    Raises ValueError on unparseable input — Werkzeug catches that
    and falls back to None / current time."""
    s = date_str.strip()
    # Drop the weekday prefix (everything before the first comma or space).
    if ',' in s:
        s = s.split(',', 1)[1].strip()
    parts = s.split()
    if len(parts) < 4:
        raise ValueError('cannot parse date string: ' + repr(date_str))
    # Day, month, year, time, [zone]
    day_str = parts[0]
    if '-' in day_str:
        # RFC 850 form: 06-Nov-94
        d_parts = day_str.split('-')
        day = int(d_parts[0])
        month = _MONTH_IDX[d_parts[1]]
        year = int(d_parts[2])
        if year < 100:
            year += 1900 if year >= 70 else 2000
        time_str = parts[1]
    else:
        day = int(day_str)
        month = _MONTH_IDX[parts[1]]
        year = int(parts[2])
        time_str = parts[3]
    h_str, m_str, s_str = time_str.split(':')
    hour, minute, second = int(h_str), int(m_str), int(s_str)
    return datetime(year, month, day, hour, minute, second,
                    tzinfo=timezone.utc)


def format_datetime(dt, usegmt=False):
    """Format a datetime as an RFC 7231 HTTP date string.

    With ``usegmt=True'' (Werkzeug's standard call site) the trailing
    zone is ``GMT'' rather than ``+0000''.  Naive datetimes (no
    tzinfo) are treated as UTC; aware datetimes are converted to
    UTC before formatting."""
    if dt.tzinfo is not None:
        dt = dt.astimezone(timezone.utc)
    weekday = _DAYS[dt.weekday()]
    month = _MONTHS[dt.month - 1]
    base = ('%s, %02d %s %04d %02d:%02d:%02d'
            % (weekday, dt.day, month, dt.year,
               dt.hour, dt.minute, dt.second))
    zone = 'GMT' if usegmt else '+0000'
    return base + ' ' + zone


def formatdate(timeval=None, localtime=False, usegmt=False):
    """RFC 2822 / RFC 7231 date formatter.  Werkzeug only uses this
    indirectly through format_datetime; provided for completeness."""
    if timeval is None:
        dt = datetime.now(timezone.utc)
    else:
        dt = datetime.fromtimestamp(timeval, tz=timezone.utc)
    return format_datetime(dt, usegmt=usegmt)
