"""Fixture: an encoding or errors argument may be any str.

str.encode, bytes.decode and str() convert their encoding and errors to C
strings through Argument Clinic: a str subclass or a StrEnum member is a
str and is used as its value, and a str holding lone surrogates raises the
UnicodeEncodeError its UTF-8 encoding raises (PyUnicode_AsUTF8AndSize) --
which email's _encoded_words.decode catches to record a CharsetError.

Grail refused both as no str, "decode() argument 'encoding' must be str,
not str" (test_email test__encoded_words test_invalid_character_in_charset).

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

from email import _encoded_words
from enum import StrEnum

r = {}


class Name(str):
    pass


class Encoding(StrEnum):
    UTF8 = 'utf-8'


def outcome(thunk):
    try:
        return thunk()
    except Exception as e:
        return '%s: %s' % (type(e).__name__, e)


r['decode_by_a_str_subclass'] = outcome(lambda: b'caf\xc3\xa9'.decode(Name('UTF-8')))
r['decode_errors_by_a_str_subclass'] = outcome(lambda: b'\xff'.decode('ascii', Name('replace')))
r['encode_by_a_str_subclass'] = outcome(lambda: 'caf\xe9'.encode(Name('latin-1')))
r['encode_errors_by_a_str_subclass'] = outcome(lambda: 'caf\xe9'.encode('ascii', Name('ignore')))
r['decode_by_a_str_enum'] = outcome(lambda: b'x'.decode(Encoding.UTF8))
r['str_by_a_str_subclass'] = outcome(lambda: str(b'x', Name('ascii')))
r['decode_by_a_surrogate_str'] = outcome(lambda: b'x'.decode('utf-8\udce2'))
r['encode_by_a_surrogate_str'] = outcome(lambda: 'x'.encode('utf-8\udce2'))
r['encode_errors_by_a_surrogate_str'] = outcome(lambda: 'x'.encode('utf-8', 'strict\udce2'))
r['str_by_a_surrogate_str'] = outcome(lambda: str(b'x', 'utf-8\udce2'))
r['still_not_an_int'] = outcome(lambda: b'x'.decode(5))
text, charset, language, defects = _encoded_words.decode('=?utf-8\udce2\udc80\udc9d?q?foo=ACbar?=')
r['an_email_word_in_a_bad_charset'] = (text, [type(d).__name__ for d in defects])

SURROGATE = "UnicodeEncodeError: 'utf-8' codec can't encode character '\\udce2' in position %d: surrogates not allowed"
EXPECTED = {
    'decode_by_a_str_subclass': 'caf\xe9',
    'decode_errors_by_a_str_subclass': '�',
    'encode_by_a_str_subclass': b'caf\xe9',
    'encode_errors_by_a_str_subclass': b'caf',
    'decode_by_a_str_enum': 'x',
    'str_by_a_str_subclass': 'x',
    'decode_by_a_surrogate_str': SURROGATE % 5,
    'encode_by_a_surrogate_str': SURROGATE % 5,
    'encode_errors_by_a_surrogate_str': SURROGATE % 6,
    'str_by_a_surrogate_str': SURROGATE % 5,
    'still_not_an_int': "TypeError: decode() argument 'encoding' must be str, not int",
    'an_email_word_in_a_bad_charset': ('foo\udcacbar', ['CharsetError']),
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-34s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
