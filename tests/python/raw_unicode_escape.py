"""The raw-unicode-escape codec, in both directions.

Latin-1 with ONE addition: ``\\uXXXX`` and ``\\UXXXXXXXX`` name a code point.
Everything else -- including every other backslash sequence -- is left exactly
as it stands, which is what separates this codec from ``unicode-escape``:

    b'\\n'.decode('unicode-escape')      == '\\n'     (one newline)
    b'\\n'.decode('raw-unicode-escape')  == '\\\\n'    (backslash, then n)

The subtle case, and the one worth a fixture: a DOUBLED backslash is inert.
CPython's decoder consumes the byte after a backslash unconditionally, so in
``\\\\u00e9`` the second backslash is eaten as a literal and the ``u`` that
follows can no longer open an escape -- the six characters survive untouched.
An implementation that merely scans for the two-byte sequence ``\\u`` gets this
backwards and decodes it to e-acute.

Grail needed the codec because test.test_builtin writes its Arabic-Indic digit
cases as ``str(br'\\u0663\\u0661\\u0664 ', 'raw-unicode-escape')`` at MODULE
level, so the whole module failed to import without it.

Encoding is the inverse and is deliberately lossy: backslashes are NOT doubled
on the way out, so ``'\\\\u0041'`` and ``'A'``... do not collide (the former
encodes to the six bytes, the latter to one), but a decode of the former does
NOT round-trip.  Hex is lowercase and zero-padded to the escape's width.

Every expectation below was checked against CPython 3.14.
"""

RESULTS = {}

# Written with explicit escapes rather than a b'...' literal holding the real
# characters: a bytes literal may only contain ASCII.
ARABIC_314 = b'\\u0663\\u0661\\u0664 '


def check(name, fn, expected):
    try:
        RESULTS[name] = (fn() == expected)
    except BaseException as exc:
        RESULTS[name] = 'raised %s: %s' % (type(exc).__name__, exc)


def check_raises(name, fn, exc_type):
    try:
        fn()
        RESULTS[name] = 'did not raise'
    except BaseException as exc:
        RESULTS[name] = isinstance(exc, exc_type)


def dec(b, encoding='raw-unicode-escape'):
    return lambda: b.decode(encoding)


def enc(s, encoding='raw-unicode-escape'):
    return lambda: s.encode(encoding)


# ------------------------------------------------------------ decoding

# The case test_builtin actually writes, and the int() it feeds.
check('decode_arabic_indic', dec(ARABIC_314), '٣١٤ ')
check('int_of_decoded_arabic', lambda: int(ARABIC_314.decode('raw-unicode-escape')),
      314)
# str(bytes, encoding) is the spelling test_builtin uses.
check('str_two_arg_form', lambda: str(ARABIC_314, 'raw-unicode-escape'),
      '٣١٤ ')

check('decode_u_escape', dec(b'\\u00e9'), '\xe9')
check('decode_big_u_escape', dec(b'\\U0001D11E'), '\U0001D11E')
check('decode_uppercase_hex_digits', dec(b'\\u00E9'), '\xe9')
check('decode_escape_amid_text', dec(b'A\\U00000042C'), 'ABC')

# A high byte is its own Latin-1 code point -- no escape needed.
check('decode_high_byte_is_latin1', dec(b'\xe9'), '\xe9')
check('decode_plain_ascii', dec(b'plain'), 'plain')
check('decode_empty', dec(b''), '')

# ...and everything that is NOT \u or \U survives verbatim.
check('decode_leaves_newline_escape', dec(b'\\n\\t'), '\\n\\t')
check('decode_leaves_hex_escape', dec(b'\\x41'), '\\x41')
check('decode_leaves_named_escape', dec(b'\\N{BULLET}'), '\\N{BULLET}')
check('decode_leaves_lone_backslash', dec(b'\\'), '\\')
check('decode_leaves_trailing_backslash', dec(b'ab\\'), 'ab\\')
# \U is an escape but \u... is too, and case matters: only these two.
check('decode_leaves_v_escape', dec(b'\\v'), '\\v')

# The doubled-backslash rule, which is the whole point of the fixture.
check('doubled_backslash_blocks_escape', dec(b'\\\\u00e9'), '\\\\u00e9')
check('quadrupled_backslash_blocks_escape', dec(b'\\\\\\\\u0041'),
      '\\\\\\\\u0041')
check('doubled_backslash_alone', dec(b'\\\\'), '\\\\')
check('doubled_backslash_then_letter', dec(b'\\\\A'), '\\\\A')
# Three backslashes: the first two pair off, the third opens a real escape.
check('tripled_backslash_escape_fires', dec(b'\\\\\\u0041'), '\\\\A')

# Truncated or non-hex escapes are errors, not silent passthrough.
check_raises('truncated_u_escape', dec(b'\\u00'), UnicodeDecodeError)
check_raises('non_hex_u_escape', dec(b'\\uZZZZ'), UnicodeDecodeError)
check_raises('truncated_big_u_escape', dec(b'\\U0001'), UnicodeDecodeError)
check_raises('bare_u_at_end', dec(b'\\u'), UnicodeDecodeError)

# Codec-name normalisation replaces '-' with '_' and nothing else, so the
# hyphenated and underscored spellings are the SAME codec -- but squashing the
# separators out entirely names a codec that does not exist.  (Grail accepted
# the squashed form until this check said otherwise.)
check('alias_underscore', dec(b'\\u00e9', 'raw_unicode_escape'), '\xe9')
check_raises('squashed_name_is_not_an_alias',
             dec(b'\\u00e9', 'rawunicodeescape'), LookupError)


# ------------------------------------------------------------ encoding

check('encode_ascii', enc('abc'), b'abc')
check('encode_empty', enc(''), b'')
# Below 256 -> one raw byte; at or above -> an escape.
check('encode_latin1_stays_one_byte', enc('\xe9'), b'\xe9')
check('encode_ff_stays_one_byte', enc('\xff'), b'\xff')
check('encode_100_becomes_escape', enc('Ā'), b'\\u0100')
check('encode_bmp_char', enc('٣'), b'\\u0663')
check('encode_astral_char', enc('\U0001D11E'), b'\\U0001d11e')
# Lowercase hex, zero-padded to the escape's fixed width.
check('encode_hex_is_lowercase', enc('ꯍ'), b'\\uabcd')
check('encode_pads_to_four', enc('Ā'), b'\\u0100')
check('encode_pads_to_eight', enc('\U00010000'), b'\\U00010000')

# Backslashes are NOT doubled on the way out -- this is what makes the codec
# lossy, and why encode/decode is not a round trip for text holding escapes.
check('encode_leaves_backslash', enc('a\\b'), b'a\\b')
check('encode_leaves_escape_text', enc('\\u0041'), b'\\u0041')
check('round_trip_of_escape_text_is_lossy',
      lambda: '\\u0041'.encode('raw-unicode-escape').decode('raw-unicode-escape'),
      'A')

# ...but text with no backslash in it does round-trip.
check('round_trip_astral',
      lambda: '\U0001D11E'.encode('raw-unicode-escape').decode('raw-unicode-escape'),
      '\U0001D11E')
check('round_trip_mixed',
      lambda: 'a\xe9٣'.encode('raw-unicode-escape').decode('raw-unicode-escape'),
      'a\xe9٣')

check('encode_alias_underscore', enc('٣', 'raw_unicode_escape'),
      b'\\u0663')


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
