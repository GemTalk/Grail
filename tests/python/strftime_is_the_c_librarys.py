"""Fixture: time.strftime formats through the C library's strftime(3).

CPython's time.strftime (Modules/timemodule.c, time_strftime) makes a
struct tm of the time tuple as gettmarg does, checks it as checktm does, and
hands each run of ASCII in the format to the C library, so that every
directive the platform knows -- %c, %x, %U, %V, %e, %r -- is the platform's.
Grail had its own formatter for fifteen directives and answered the empty
string for every other one: %c was ''.

datetime's strftime pads a year before 1000 to four digits even where the C
library does not (glibc), as _datetimemodule.c's wrap_strftime does.

The directives checked are the ones Darwin's and glibc's strftime answer
alike in the C locale; %k, %l, %s, %P and %z of a plain tuple are left out,
because they are the platform's own.  Every check holds under CPython 3.14,
which is what makes it evidence.
"""

import datetime
import time

r = {}

T = (2026, 11, 6, 9, 3, 14, 4, 310, 0)
DIRECTIVES = 'aAbBcdHIjmMpSUwWxXyY%GgVuCDeFhnrRtT'


def outcome(call):
    try:
        return call()
    except Exception as e:
        return '%s: %s' % (type(e).__name__, e)


def strftime_of(fields):
    return outcome(lambda: time.strftime('%Y-%m-%d %j %w', fields))


r['every_directive_is_the_c_librarys'] = outcome(
    lambda: {d: time.strftime('%' + d, T) for d in DIRECTIVES})
r['a_zero_month_day_or_day_of_year_is_the_first'] = strftime_of((2026, 0, 0, 0, 0, 0, 0, 0, 0))
r['a_field_out_of_range_is_refused'] = [strftime_of(fields) for fields in (
    (2026, 13, 1, 0, 0, 0, 0, 1, 0), (2026, 1, 32, 0, 0, 0, 0, 1, 0), (2026, 1, 1, 24, 0, 0, 0, 1, 0),
    (2026, 1, 1, 0, 60, 0, 0, 1, 0), (2026, 1, 1, 0, 0, 62, 0, 1, 0), (2026, 1, 1, 0, 0, 0, -2, 1, 0),
    (2026, 1, 1, 0, 0, 0, 0, 367, 0))]
r['a_tuple_of_nine_ints_is_required'] = [strftime_of(fields) for fields in (
    (2026, 1, 1), [2026, 1, 1, 0, 0, 0, 0, 1, 0], (2026.0, 1, 1, 0, 0, 0, 0, 1, 0),
    (2 ** 31, 1, 1, 0, 0, 0, 0, 1, 0), (-2 ** 31, 1, 1, 0, 0, 0, 0, 1, 0))]
r['the_format_is_a_str'] = [outcome(lambda: time.strftime(f, T)) for f in (1, None, b'%Y')]
r['what_is_not_ascii_is_kept'] = [
    outcome(lambda: time.strftime('', T)),
    outcome(lambda: time.strftime('%Y' + chr(0xe9) + '%m' + chr(0x20ac) + '%%', T)),
    outcome(lambda: time.strftime('a' + chr(0) + 'b%Y', T)),
    outcome(lambda: time.strftime(chr(0xd83d) + '%Y', T) == chr(0xd83d) + '2026')]
r['a_struct_times_zone_is_its_own'] = outcome(
    lambda: time.strftime('%Z', time.localtime()) == time.localtime().tm_zone)
r['datetime_pads_a_year_before_1000'] = outcome(lambda: [
    datetime.date(1, 1, 1).strftime(d) for d in ('%Y', '%G', '%C', '%F', '%%Y')] + [
    datetime.datetime(99, 12, 31, 23, 59).strftime('%Y-%m-%d %H:%M'), datetime.date(1000, 1, 1).strftime('%Y')])
r['datetime_formats_every_directive_too'] = outcome(
    lambda: datetime.datetime(2026, 11, 6, 9, 3, 14).strftime('%c|%x|%X|%U|%e|%r'))

EXPECTED = {
    'every_directive_is_the_c_librarys': {
        'a': 'Fri', 'A': 'Friday', 'b': 'Nov', 'B': 'November', 'c': 'Fri Nov  6 09:03:14 2026', 'd': '06',
        'H': '09', 'I': '09', 'j': '310', 'm': '11', 'M': '03', 'p': 'AM', 'S': '14', 'U': '44', 'w': '5',
        'W': '44', 'x': '11/06/26', 'X': '09:03:14', 'y': '26', 'Y': '2026', '%': '%', 'G': '2026', 'g': '26',
        'V': '45', 'u': '5', 'C': '20', 'D': '11/06/26', 'e': ' 6', 'F': '2026-11-06', 'h': 'Nov', 'n': '\n',
        'r': '09:03:14 AM', 'R': '09:03', 't': '\t', 'T': '09:03:14'},
    'a_zero_month_day_or_day_of_year_is_the_first': '2026-01-01 001 1',
    'a_field_out_of_range_is_refused': [
        'ValueError: month out of range', 'ValueError: day of month out of range',
        'ValueError: hour out of range', 'ValueError: minute out of range',
        'ValueError: seconds out of range', 'ValueError: day of week out of range',
        'ValueError: day of year out of range'],
    'a_tuple_of_nine_ints_is_required': [
        'TypeError: strftime(): illegal time tuple argument', 'TypeError: Tuple or struct_time argument required',
        "TypeError: 'float' object cannot be interpreted as an integer",
        'OverflowError: signed integer is greater than maximum', 'OverflowError: year out of range'],
    'the_format_is_a_str': [
        'TypeError: strftime() argument 1 must be str, not int',
        'TypeError: strftime() argument 1 must be str, not None',
        'TypeError: strftime() argument 1 must be str, not bytes'],
    'what_is_not_ascii_is_kept': ['', '2026' + chr(0xe9) + '11' + chr(0x20ac) + '%', 'a' + chr(0) + 'b2026', True],
    'a_struct_times_zone_is_its_own': True,
    'datetime_pads_a_year_before_1000': ['0001', '0001', '00', '0001-01-01', '%Y', '0099-12-31 23:59', '1000'],
    'datetime_formats_every_directive_too': 'Fri Nov  6 09:03:14 2026|11/06/26|09:03:14|44| 6|09:03:14 AM',
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-46s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
