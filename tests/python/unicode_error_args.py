"""A UnicodeError names where it went wrong.

CPython's `UnicodeEncodeError` / `UnicodeDecodeError` are constructed as
``cls(encoding, object, start, end, reason)`` and expose all five as
read-write attributes.  Its own stdlib reads them -- an error handler
registered through ``codecs.register_error`` is handed the exception and
nothing else, so ``exc.start`` is the only way to know which character
failed -- and its ``str()`` is assembled from them:

    'ascii' codec can't decode byte 0xff in position 1: ordinal not in range(128)
    'ascii' codec can't encode character '\\xe9' in position 1: ordinal not in range(128)

Grail kept the five in ``args`` and named none, so ``exc.start`` answered
a BoundMethod; naming them fixed the read, and left the raise sites still
passing a bare message, so the values were None.  This pins both halves:
the attributes, and the sentence built from them.

Every expectation was checked against CPython 3.14 first.
"""

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or 'got: %r' % (got,)


def _caught(fn):
    try:
        fn()
        return 'no raise'
    except UnicodeError as exc:
        return (type(exc).__name__, str(exc),
                exc.encoding, exc.object, exc.start, exc.end, exc.reason)


# -- constructed by hand, which is what a re-raise does -----------------

def _constructed_decode():
    return _caught(lambda: (_ for _ in ()).throw(
        UnicodeDecodeError('enc', b'ab\xffc', 2, 3, 'why')))


def _constructed_encode():
    return _caught(lambda: (_ for _ in ()).throw(
        UnicodeEncodeError('enc', 'ab\xe9c', 2, 3, 'why')))


def _a_span_of_more_than_one():
    return (str(UnicodeDecodeError('enc', b'ab\xff\xfec', 2, 4, 'why')),
            str(UnicodeEncodeError('enc', 'ab\xe9\xeac', 2, 4, 'why')))


def _the_escape_widens_with_the_character():
    return (str(UnicodeEncodeError('e', '\xe9', 0, 1, 'w')),
            str(UnicodeEncodeError('e', 'Ā', 0, 1, 'w')),
            str(UnicodeEncodeError('e', '\U00012fff', 0, 1, 'w')))


check('constructed_decode', _constructed_decode(),
      ('UnicodeDecodeError',
       "'enc' codec can't decode byte 0xff in position 2: why",
       'enc', b'ab\xffc', 2, 3, 'why'))
check('constructed_encode', _constructed_encode(),
      ('UnicodeEncodeError',
       "'enc' codec can't encode character '\\xe9' in position 2: why",
       'enc', 'ab\xe9c', 2, 3, 'why'))
check('a_span_of_more_than_one', _a_span_of_more_than_one(),
      ("'enc' codec can't decode bytes in position 2-3: why",
       "'enc' codec can't encode characters in position 2-3: why"))
check('the_escape_widens_with_the_character',
      _the_escape_widens_with_the_character(),
      ("'e' codec can't encode character '\\xe9' in position 0: w",
       "'e' codec can't encode character '\\u0100' in position 0: w",
       "'e' codec can't encode character '\\U00012fff' in position 0: w"))


# -- raised by the codecs themselves ------------------------------------

check('ascii_decode', _caught(lambda: b'a\xffb'.decode('ascii')),
      ('UnicodeDecodeError',
       "'ascii' codec can't decode byte 0xff in position 1: "
       "ordinal not in range(128)",
       'ascii', b'a\xffb', 1, 2, 'ordinal not in range(128)'))
check('ascii_encode', _caught(lambda: 'a\xe9b'.encode('ascii')),
      ('UnicodeEncodeError',
       "'ascii' codec can't encode character '\\xe9' in position 1: "
       "ordinal not in range(128)",
       'ascii', 'a\xe9b', 1, 2, 'ordinal not in range(128)'))
check('latin1_encode', _caught(lambda: 'aĀb'.encode('latin-1')),
      ('UnicodeEncodeError',
       "'latin-1' codec can't encode character '\\u0100' in position 1: "
       "ordinal not in range(256)",
       'latin-1', 'aĀb', 1, 2, 'ordinal not in range(256)'))


# -- the utf-8 decoder's three reasons, and their spans -----------------
#
# GemStone's decodeFromUTF8 is all-or-nothing: it refuses the whole input
# and says nothing about where, so the strict path used to answer one
# wording -- "invalid continuation byte" -- for every kind of malformation.
# The input is now re-scanned on failure, which costs nothing on a path
# that has already lost, and CPython's taxonomy falls out of the scan:
#
#   * a byte that cannot LEAD (0x80..0xC1, 0xF5..0xFF)  -> invalid start byte
#   * a byte that is not a legal CONTINUATION of it     -> invalid continuation byte
#   * running off the end mid-sequence                  -> unexpected end of data
#
# The SPAN is the valid prefix consumed so far, which is why \xf0\x9f(
# blames two bytes and \xf0( blames one.  The narrowed ranges 0xE0, 0xED,
# 0xF0 and 0xF4 impose are what make an overlong or an encoded surrogate
# a continuation error rather than a decode.

UTF8_CASES = [
    b'a\xffb', b'a\x80b', b'a\xc3', b'a\xc3\x28b', b'a\xe2\x82',
    b'a\xe2\x28\xacb', b'a\xf0\x9f', b'a\xc0\x80b', b'a\xf5\x80\x80\x80b',
    b'a\xed\xa0\x80b', b'\xf0\x9f\x28', b'\xf0\x9f\x92\x28', b'\xe2\x82\x28',
    b'\xf0\x28', b'\xe0\x80', b'\xe0\xa0', b'\xf0\x80', b'\xf4\x90',
    b'\xc1\xbf', b'ok', b'\xc3\xa9', b'\xf0\x9f\x92\xa9',
]


def _utf8_taxonomy():
    out = []
    for case in UTF8_CASES:
        try:
            case.decode('utf-8')
            out.append('ok')
        except UnicodeDecodeError as exc:
            out.append((exc.start, exc.end, exc.reason))
    return out


check('utf8_taxonomy', _utf8_taxonomy(), [
    (1, 2, 'invalid start byte'),
    (1, 2, 'invalid start byte'),
    (1, 2, 'unexpected end of data'),
    (1, 2, 'invalid continuation byte'),
    (1, 3, 'unexpected end of data'),
    (1, 2, 'invalid continuation byte'),
    (1, 3, 'unexpected end of data'),
    (1, 2, 'invalid start byte'),
    (1, 2, 'invalid start byte'),
    (1, 2, 'invalid continuation byte'),
    (0, 2, 'invalid continuation byte'),
    (0, 3, 'invalid continuation byte'),
    (0, 2, 'invalid continuation byte'),
    (0, 1, 'invalid continuation byte'),
    (0, 1, 'invalid continuation byte'),
    (0, 2, 'unexpected end of data'),
    (0, 1, 'invalid continuation byte'),
    (0, 1, 'invalid continuation byte'),
    (0, 1, 'invalid start byte'),
    'ok', 'ok', 'ok',
])


# -- WHY the attributes matter, and what still cannot read them --------
#
# The reason CPython names the five is that an error handler registered
# through ``codecs.register_error`` receives the exception and nothing
# else: ``exc.start`` is its only way to know which character failed.
#
# Grail's Smalltalk-side encoders do not dispatch to a registered handler
# at all -- ``str.encode(enc, 'my_policy')`` raises rather than calling it
# -- so that half is NOT pinned here.  It was blocked on the attributes
# and now is not; see docs/Issues.md.  What is pinned is that the
# exception a handler would be handed now carries what it needs.


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
