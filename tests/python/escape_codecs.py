"""The `unicode-escape` / `raw-unicode-escape` codecs, five roots deep.

Each was found by fixing the one before it, and the last two were found
because the earlier fixes let the decoder get FURTHER and die worse.

1. `\\<newline>` is a LINE CONTINUATION -- both characters go. It reached
   the unknown-escape arm, which keeps the backslash and rescans, so
   `b'[\\\\\\n]'` decoded to `'[\\\\\\n]'` where CPython gives `'[]'`. LF only:
   CPython does not continue on CR or CRLF.

2. A lone TRAILING backslash is an error in `unicode-escape` -- though not
   in `raw-unicode-escape`, where a backslash beginning no escape is an
   ordinary byte.

3. A SUPPLEMENTARY code point encodes as `\\UXXXXXXXX`. The encoder emitted
   `\\u` for everything above 255, so U+1D120 came out as `\\u1d120` -- a
   five-digit `\\u`, which is not an escape any reader accepts: decoding it
   back gives U+1D12 followed by `'0'`.

4. The decode errors carried no POSITIONS, so `exc.start` was None. That
   is why `bytes >> ___decodeSubstituting___` had to leave these codecs
   alone, and why `replace` on a bad escape still raised. One rule now
   covers both ways an escape can fail -- scan the hex digits that ARE
   there and report `i+1+avail` -- because CPython does not distinguish a
   short escape from one with a non-hex digit.

5. These codecs PRODUCE and CONSUME lone surrogates, which is the point of
   them: `b'\\\\ud800'.decode('unicode-escape')` is U+D800, and encoding it
   back gives the escape again under every handler including `strict`.
   Building into a Unicode32 stream could not express that, so the decoder
   died with an uncatchable error the moment it reached such an escape.
   The same applies above U+10FFFF, which is not a character at all.

Every expectation was checked against CPython 3.14 first.
"""

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or 'got: %r' % (got,)


def _fields(data, enc, errors='strict'):
    try:
        return data.decode(enc, errors)
    except UnicodeDecodeError as exc:
        return '%s|%d|%d|%s' % (exc.encoding, exc.start, exc.end, exc.reason)


def _outcome(fn):
    try:
        return ('ok', fn())
    except BaseException as exc:
        return (type(exc).__name__, str(exc)[:60])


# ------------------------------------------------- 1. line continuation

def _a_backslash_newline_is_a_continuation():
    return (b'[\\\n]'.decode('unicode-escape'),
            b'a\\\nb'.decode('unicode-escape'))


def _only_LF_continues():
    """CR and CRLF are NOT continuations -- the backslash stays."""
    return (b'[\\\r\n]'.decode('unicode-escape'),
            b'[\\\r]'.decode('unicode-escape'),
            b'[\\\n]'.decode('raw-unicode-escape'))


check('a_backslash_newline_is_a_continuation',
      _a_backslash_newline_is_a_continuation(), ('[]', 'ab'))
check('only_LF_continues', _only_LF_continues(),
      ('[\\\r\n]', '[\\\r]', '[\\\n]'))


# --------------------------------------------- 2. trailing lone backslash

def _a_trailing_backslash_differs_by_codec():
    return (_fields(b'a\\', 'unicode-escape'),
            b'a\\'.decode('raw-unicode-escape'))


check('a_trailing_backslash_differs_by_codec',
      _a_trailing_backslash_differs_by_codec(),
      ('unicodeescape|1|2|\\ at end of string', 'a\\'))


# ------------------------------------------------ 3. supplementary escape

def _supplementary_uses_capital_U():
    return ('\U0001d120'.encode('unicode-escape'),
            '\U0001d120'.encode('raw-unicode-escape'),
            '\U00010000'.encode('unicode-escape'),
            'ሴ'.encode('unicode-escape'))


def _the_escape_round_trips():
    """The point of the width rule: a five-digit \\u does not read back."""
    return '\U0001d120'.encode('unicode-escape').decode('unicode-escape')


check('supplementary_uses_capital_U', _supplementary_uses_capital_U(),
      (b'\\U0001d120', b'\\U0001d120', b'\\U00010000', b'\\u1234'))
check('the_escape_round_trips', _the_escape_round_trips(), '\U0001d120')


# ---------------------------------------------------- 4. error positions

def _errors_report_positions():
    return (_fields(b'a\\uD', 'unicode-escape'),
            _fields(b'a\\uXYZW', 'unicode-escape'),
            _fields(b'a\\x4', 'unicode-escape'),
            _fields(b'a\\uD', 'raw-unicode-escape'),
            _fields(b'a\\U0001', 'unicode-escape'))


def _positions_let_the_handlers_work():
    """What the positions are FOR: the substituting loop can now consume a
    range from these codecs like any other."""
    return (_fields(b'a\\uD', 'unicode-escape', 'replace'),
            _fields(b'a\\uD', 'unicode-escape', 'ignore'))


check('errors_report_positions', _errors_report_positions(),
      ('unicodeescape|1|4|truncated \\uXXXX escape',
       'unicodeescape|1|3|truncated \\uXXXX escape',
       'unicodeescape|1|4|truncated \\xXX escape',
       'rawunicodeescape|1|4|truncated \\uXXXX escape',
       'unicodeescape|1|7|truncated \\UXXXXXXXX escape'))
check('positions_let_the_handlers_work',
      _positions_let_the_handlers_work(), ('a�', 'a'))


# -------------------------------- 5. surrogates, and beyond U+10FFFF

def _the_codecs_carry_a_lone_surrogate():
    return (b'\\ud800'.decode('unicode-escape'),
            b'\\ud800'.decode('raw-unicode-escape'),
            b'a\\udc80b'.decode('unicode-escape'))


def _and_encode_one_back_under_every_handler():
    return tuple('\ud800'.encode(e, h)
                 for e in ('unicode-escape', 'raw-unicode-escape')
                 for h in ('strict', 'surrogatepass', 'backslashreplace'))


def _a_surrogate_round_trips():
    return '\ud800'.encode('unicode-escape').decode('unicode-escape')


def _above_10FFFF_is_not_a_character():
    return (_fields(br'\U00110000', 'unicode-escape'),
            _fields(br'[\U00110000]', 'unicode-escape'),
            _fields(br'\U00110000', 'raw-unicode-escape'),
            _fields(br'\U00110000', 'unicode-escape', 'ignore'),
            _fields(br'\U00110000', 'unicode-escape', 'replace'))


check('the_codecs_carry_a_lone_surrogate',
      _the_codecs_carry_a_lone_surrogate(),
      ('\ud800', '\ud800', 'a\udc80b'))
check('and_encode_one_back_under_every_handler',
      _and_encode_one_back_under_every_handler(), (b'\\ud800',) * 6)
check('a_surrogate_round_trips', _a_surrogate_round_trips(), '\ud800')
check('above_10FFFF_is_not_a_character', _above_10FFFF_is_not_a_character(),
      ('unicodeescape|0|10|illegal Unicode character',
       'unicodeescape|1|11|illegal Unicode character',
       'rawunicodeescape|0|10|\\Uxxxxxxxx out of range',
       '', '�'))


# -------------------------------------------------- ordinary work is intact

def _the_ordinary_escapes_still_decode():
    return (b'a\\tb\\nc'.decode('unicode-escape'),
            b'\\x41\\u0042\\U00000043'.decode('unicode-escape'),
            b'\\101'.decode('unicode-escape'),
            b'\\q'.decode('unicode-escape'),
            b'\x00\t\n\r\\'.decode('raw-unicode-escape'))


def _the_ordinary_escapes_still_encode():
    return ('ab\n\t'.encode('unicode-escape'),
            'ሴ'.encode('raw-unicode-escape'),
            'a\\b'.encode('unicode-escape'))


check('the_ordinary_escapes_still_decode',
      _the_ordinary_escapes_still_decode(),
      ('a\tb\nc', 'ABC', 'A', '\\q', '\x00\t\n\r\\'))
check('the_ordinary_escapes_still_encode',
      _the_ordinary_escapes_still_encode(),
      (b'ab\\n\\t', b'\\u1234', b'a\\\\b'))


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
