# GRAIL minimal zoneinfo stub.
#
# Grail ships no IANA tz database.  django.utils.timezone imports
# zoneinfo at module level, but with USE_TZ=False and no explicit tz
# arithmetic none of it is exercised.  ZoneInfo("UTC") works (Django's
# utils.timezone.utc and pytz-compat paths ask for it); anything else
# raises ZoneInfoNotFoundError at construction time.

from datetime import timezone as _timezone


class ZoneInfoNotFoundError(KeyError):
    pass


class InvalidTZPathWarning(RuntimeWarning):
    pass


TZPATH = ()


def available_timezones():
    return {"UTC"}


def reset_tzpath(to=None):
    pass


class ZoneInfo:
    """UTC-only tzinfo. Grail has no tz database; everything else raises."""

    def __new__(cls, key):
        if key not in ("UTC", "Etc/UTC", "GMT", "Etc/GMT"):
            raise ZoneInfoNotFoundError(
                "No time zone found with key %s (Grail ships no tz database)" % key)
        obj = object.__new__(cls)
        obj._key = key
        return obj

    @classmethod
    def no_cache(cls, key):
        return cls(key)

    @classmethod
    def from_file(cls, fobj, key=None):
        raise NotImplementedError("zoneinfo.ZoneInfo.from_file is not supported in Grail")

    @classmethod
    def clear_cache(cls, only_keys=None):
        pass

    @property
    def key(self):
        return self._key

    def utcoffset(self, dt):
        return _timezone.utc.utcoffset(dt)

    def dst(self, dt):
        return _timezone.utc.dst(dt)

    def tzname(self, dt):
        return "UTC"

    def fromutc(self, dt):
        return dt.replace(tzinfo=self)

    def __repr__(self):
        return "zoneinfo.ZoneInfo(key=%r)" % (self._key,)

    def __str__(self):
        return self._key
