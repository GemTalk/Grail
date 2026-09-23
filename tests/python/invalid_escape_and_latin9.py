r"""Fixture: escape sequences Python does not define, and the latin-9 codec.

Two things are checked here, both measured against CPython.

INVALID ESCAPES.  Python keeps the backslash for an escape it has no meaning
for -- '\z' is the two characters backslash and z -- and warns, so a literal
that was meant to carry a tab or a newline is noticed rather than shipped.  The
warning names the literal's own file and line, not the compiler's, and when a
filter makes it an error it becomes a SyntaxError carrying the same text
without the "Such sequences will not work in the future." sentence, plus the
escape's line and column.

The set is LARGER for a bytes literal: \u, \U and \N are str-only, so
b"\u0041" is nine characters and not b"A".  Grail used to decode all three,
which made b"\N{BULLET}" reach ByteArray at:put: with code point 8226 and die
with an uncatchable rtErrExpectedByteValue out of the parser -- a literal CPython
merely grumbles about.

An octal escape above \377 does not fit a byte.  CPython masks it in a bytes
literal, keeps the full code point in a str one, and warns in both.

LATIN-9 (iso-8859-15) is latin-1 with eight code points substituted -- the euro
and seven letters.  The str and bytes codecs have implemented it for a while;
open() did not know the name, so a file could not be written in it.

Everything here is verified against real CPython by running the file directly.
"""

import os
import tempfile
import warnings

B = chr(92)
Q3 = chr(39) * 3
NL = chr(10)

r = {}


def record(key, fn):
    try:
        r[key] = fn()
    except Exception as exc:
        r[key] = '%s: %s' % (type(exc).__name__, exc)


def evaluated(src):
    """(value, warning count, message, filename, lineno)."""
    with warnings.catch_warnings(record=True) as w:
        warnings.simplefilter('always', category=SyntaxWarning)
        value = eval(src)
    if not w:
        return (value, 0)
    return (value, len(w), str(w[0].message), w[0].filename, w[0].lineno)


record('str_unknown_escape', lambda: evaluated(chr(39) + B + 'z' + chr(39)))
record('str_escaped_space', lambda: evaluated(chr(39) + B + ' ' + chr(39)))
record('bytes_unknown_escape', lambda: evaluated('b' + chr(39) + B + 'z' + chr(39)))
record('bytes_backslash_u_is_not_an_escape',
       lambda: evaluated('b' + chr(39) + B + 'u0041' + chr(39)))
record('bytes_backslash_N_is_not_an_escape',
       lambda: evaluated('b' + chr(39) + B + 'N{BULLET}' + chr(39)))
record('str_octal_above_377', lambda: evaluated(chr(39) + B + '400' + chr(39)))
record('bytes_octal_above_377_is_masked',
       lambda: evaluated('b' + chr(39) + B + '400' + chr(39)))
record('octal_within_range_is_silent', lambda: evaluated(chr(39) + B + '101' + chr(39)))
record('defined_escapes_are_silent',
       lambda: evaluated(chr(39) + B + 'n' + B + 't' + B + 'x41' + chr(39)))
record('the_warning_names_the_line_the_escape_is_on',
       lambda: evaluated(Q3 + NL + B + 'z' + Q3))


def _as_error():
    with warnings.catch_warnings(record=True) as w:
        warnings.simplefilter('error', category=SyntaxWarning)
        try:
            eval(Q3 + NL + B + 'z' + Q3)
        except SyntaxError as exc:
            return (exc.msg, exc.filename, exc.lineno, exc.offset, len(w))
    return 'no raise'


record('a_filter_of_error_makes_it_a_SyntaxError', _as_error)


def _latin9_round_trip():
    d = tempfile.mkdtemp()
    fn = os.path.join(d, 'l9.txt')
    text = ('ascii ' + chr(0x20AC) + chr(0x160) + chr(0x161) + chr(0x17D)
            + chr(0x17E) + chr(0x152) + chr(0x153) + chr(0x178))
    with open(fn, 'w', encoding='latin9') as f:
        f.write(text)
    with open(fn, 'rb') as f:
        raw = f.read()
    with open(fn, 'r', encoding='latin9') as f:
        back = f.read()
    return (raw, back == text)


def _latin1_still_refuses_the_euro():
    d = tempfile.mkdtemp()
    fn = os.path.join(d, 'l1.txt')
    try:
        with open(fn, 'w', encoding='latin-1') as f:
            f.write(chr(0x20AC))
        return 'no error'
    except UnicodeEncodeError:
        return 'UnicodeEncodeError'


record('latin9_round_trips_its_own_eight_code_points', _latin9_round_trip)
record('latin1_still_refuses_the_euro', _latin1_still_refuses_the_euro)


_SUCH = 'Such sequences will not work in the future. '


def _invalid(text, octal=False):
    kind = ' is an invalid octal escape sequence. ' if octal else \
           ' is an invalid escape sequence. '
    return (chr(34) + B + text + chr(34) + kind + _SUCH
            + 'Did you mean ' + chr(34) + B + B + text + chr(34)
            + '? A raw string is also an option.')


def _short(text):
    return (chr(34) + B + text + chr(34) + ' is an invalid escape sequence. '
            + 'Did you mean ' + chr(34) + B + B + text + chr(34)
            + '? A raw string is also an option.')


EXPECTED = {
    'str_unknown_escape': (B + 'z', 1, _invalid('z'), '<string>', 1),
    'str_escaped_space': (B + ' ', 1, _invalid(' '), '<string>', 1),
    'bytes_unknown_escape': ((B + 'z').encode(), 1, _invalid('z'), '<string>', 1),
    'bytes_backslash_u_is_not_an_escape':
        ((B + 'u0041').encode(), 1, _invalid('u'), '<string>', 1),
    'bytes_backslash_N_is_not_an_escape':
        ((B + 'N{BULLET}').encode(), 1, _invalid('N'), '<string>', 1),
    'str_octal_above_377': (chr(256), 1, _invalid('400', True), '<string>', 1),
    'bytes_octal_above_377_is_masked':
        (bytes([0]), 1, _invalid('400', True), '<string>', 1),
    'octal_within_range_is_silent': ('A', 0),
    'defined_escapes_are_silent': (NL + chr(9) + 'A', 0),
    'the_warning_names_the_line_the_escape_is_on':
        (NL + B + 'z', 1, _invalid('z'), '<string>', 2),
    'a_filter_of_error_makes_it_a_SyntaxError':
        (_short('z'), '<string>', 2, 1, 0),
    'latin9_round_trips_its_own_eight_code_points':
        (bytes([0x61, 0x73, 0x63, 0x69, 0x69, 0x20, 0xA4, 0xA6, 0xA8, 0xB4,
                0xB8, 0xBC, 0xBD, 0xBE]), True),
    'latin1_still_refuses_the_euro': 'UnicodeEncodeError',
}


KEYS = sorted(EXPECTED)


if __name__ == '__main__':
    for key in KEYS:
        actual = r[key]
        print('%-5s %-46s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL',
                                    key, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-5s %-46s is not in EXPECTED' % ('FAIL', extra))
