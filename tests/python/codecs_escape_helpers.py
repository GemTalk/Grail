"""``codecs.escape_decode`` / ``escape_encode`` / ``readbuffer_encode``.

CPython exposes these three from _codecs and the stdlib reaches for them
directly: escape_decode is what ast.literal_eval and the unicode_escape
codec are built on, escape_encode its inverse, and readbuffer_encode the
passthrough a codec uses to get bytes out of anything with a buffer.
Grail had none of them.

Each answers CPython's ``(result, consumed)`` pair, and ``consumed`` is
the length of the INPUT rather than of the result -- four for ``\\x41``.

Every expectation was checked against CPython 3.14 first.
"""

import codecs
import warnings

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or 'got: %r' % (got,)


def quiet(fn, *a, **k):
    """Run without the DeprecationWarning an invalid escape emits."""
    with warnings.catch_warnings():
        warnings.simplefilter('ignore')
        return fn(*a, **k)


# -- escape_decode ------------------------------------------------------

check('decode_plain', codecs.escape_decode(b'abc'), (b'abc', 3))
check('decode_newline', codecs.escape_decode(br'a\nb'), (b'a\nb', 4))
check('decode_hex', codecs.escape_decode(br'\x41'), (b'A', 4))
check('decode_octal', codecs.escape_decode(br'\101'), (b'A', 4))
check('decode_short_octal', codecs.escape_decode(br'\7'), (b'\x07', 2))
check('decode_octal_stops_at_three', codecs.escape_decode(br'\1010'),
      (b'A0', 5))
check('decode_quote', codecs.escape_decode(br"\'"), (b"'", 2))
check('decode_backslash', codecs.escape_decode(br'\\'), (b'\\', 2))

# A backslash-newline is a line continuation: it contributes nothing.
check('decode_line_continuation', codecs.escape_decode(b'[\\\n]'), (b'[]', 4))

# str input is accepted and treated as latin-1.
check('decode_accepts_str', codecs.escape_decode('a\\nb'), (b'a\nb', 4))

# An unrecognised escape survives verbatim, backslash and all.
check('decode_unknown_kept', quiet(codecs.escape_decode, br'\q'),
      (b'\\q', 2))


# -- escape_decode errors -----------------------------------------------

def raises(fn, *a):
    try:
        fn(*a)
        return 'no raise'
    except Exception as exc:
        return type(exc).__name__


check('decode_trailing_backslash', raises(codecs.escape_decode, b'ab\\'),
      'ValueError')
check('decode_bad_hex_strict', raises(codecs.escape_decode, br'\x'),
      'ValueError')
check('decode_bad_hex_ignore',
      codecs.escape_decode(br'[\x]\x', 'ignore'), (b'[]', 6))
check('decode_bad_hex_replace',
      codecs.escape_decode(br'[\x]\x', 'replace'), (b'[?]?', 6))
check('decode_short_hex_ignore',
      codecs.escape_decode(br'[\x0]\x0', 'ignore'), (b'[]', 8))
check('decode_short_hex_replace',
      codecs.escape_decode(br'[\x0]\x0', 'replace'), (b'[?]?', 8))


# -- the deprecation warnings -------------------------------------------

def warning_for(data):
    with warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter('always')
        codecs.escape_decode(data)
        return str(caught[0].message) if caught else None


check('unknown_escape_warns',
      '"\\q" is an invalid escape sequence' in (warning_for(br'\q') or ''),
      True)
check('non_octal_digit_warns',
      '"\\8" is an invalid escape sequence' in (warning_for(br'\8') or ''),
      True)
# Three octal digits can name a value no byte holds; the low eight bits are
# kept and the spelling is deprecated.
check('octal_overflow_warns',
      '"\\501" is an invalid octal escape sequence'
      in (warning_for(br'\501') or ''), True)
check('octal_overflow_value', quiet(codecs.escape_decode, br'\501'),
      (b'A', 4))
check('octal_in_range_is_silent', warning_for(br'\377'), None)


# -- escape_encode ------------------------------------------------------

check('encode_plain', codecs.escape_encode(b'foobar'), (b'foobar', 6))
check('encode_nul', codecs.escape_encode(b'spam\0eggs'),
      (b'spam\\x00eggs', 9))
check('encode_quote', codecs.escape_encode(b"a'b"), (b"a\\'b", 3))
check('encode_backslash', codecs.escape_encode(b'b\\c'), (b'b\\\\c', 3))
check('encode_newline', codecs.escape_encode(b'c\nd'), (b'c\\nd', 3))
check('encode_return', codecs.escape_encode(b'd\re'), (b'd\\re', 3))
check('encode_del', codecs.escape_encode(b'f\x7fg'), (b'f\\x7fg', 3))
# The DOUBLE quote is left alone, which is what repr() of bytes does.
check('encode_leaves_double_quote', codecs.escape_encode(b'a"b'),
      (b'a"b', 3))

# bytes ONLY -- stricter than the buffer protocol its neighbours accept.
check('encode_refuses_str', raises(codecs.escape_encode, 'spam'), 'TypeError')
check('encode_refuses_bytearray',
      raises(codecs.escape_encode, bytearray(b'spam')), 'TypeError')


# -- readbuffer_encode --------------------------------------------------

check('readbuffer_bytes', codecs.readbuffer_encode(b'abc'), (b'abc', 3))
check('readbuffer_empty_str', codecs.readbuffer_encode(''), (b'', 0))
check('readbuffer_bytearray',
      codecs.readbuffer_encode(bytearray(b'spam')), (b'spam', 4))
# An int is not a buffer, and bytes(42) would answer forty-two zero bytes
# rather than raise -- so the type check is what keeps CPython's TypeError.
check('readbuffer_refuses_int', raises(codecs.readbuffer_encode, 42),
      'TypeError')


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
