"""The UTF-7 codec (RFC 2152).

Grail shipped utf-8, utf-16 and utf-32 but not utf-7, so every spelling
raised ``unknown encoding``: thirteen tests in test_codecs, most of them
the incremental and stream cases the shared ReadTest base drives.

UTF-7 is the odd one of the family.  It has no byte order and no BOM, and
it is SEVEN-BIT: a character outside a small direct set is written in a
shifted run -- ``+``, the UTF-16 code units in modified base64, then
``-``.  A literal ``+`` is ``+-``.  Because base64 takes six bits and a
UTF-16 unit gives sixteen, the two realign only every three units, so the
run is a bit accumulator rather than a per-character encoding.

It also CARRIES a lone surrogate, which the other codecs refuse: a
surrogate is a UTF-16 code unit like any other, so ``'\\ud800'.encode(
'utf-7')`` is ``b'+2AA-'`` rather than an error.

Every expectation was checked against CPython 3.14 first.
"""

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or 'got: %r' % (got,)


# -- direct characters --------------------------------------------------

check('ascii_is_direct', 'hi there!'.encode('utf-7'), b'hi there!')
check('whitespace_is_direct', 'a\tb\nc\rd'.encode('utf-7'), b'a\tb\nc\rd')
check('empty', ''.encode('utf-7'), b'')

# Backslash and tilde are NOT in the direct set, though they are printable.
check('backslash_is_shifted', '\\'.encode('utf-7'), b'+AFw-')
check('tilde_is_shifted', '~'.encode('utf-7'), b'+AH4-')
check('plus_is_escaped', '+'.encode('utf-7'), b'+-')
check('plus_between_letters', 'a+b'.encode('utf-7'), b'a+-b')


# -- shifted runs -------------------------------------------------------

check('latin1_char', 'héllo'.encode('utf-7'), b'h+AOk-llo')
check('two_shifted_chars', 'éé'.encode('utf-7'), b'+AOkA6Q-')
check('cjk', '中文'.encode('utf-7'), b'+Ti1lhw-')
check('run_between_letters', 'a中b'.encode('utf-7'), b'a+Ti0-b')
check('controls', '\x00\x01'.encode('utf-7'), b'+AAAAAQ-')
check('escape_char', '\x1b'.encode('utf-7'), b'+ABs-')

# A supplementary character is a surrogate PAIR inside the run.
check('non_bmp', '\U0001F600'.encode('utf-7'), b'+2D3eAA-')

# The closing '-' is written even when the run ends the string, and a
# following '-' is kept as itself.
check('run_then_dash', 'Hi Mom -☺-!'.encode('utf-7'),
      b'Hi Mom -+Jjo--!')


# -- lone surrogates, which UTF-7 carries -------------------------------

check('lone_surrogate_encodes', '\ud800'.encode('utf-7'), b'+2AA-')
check('lone_surrogate_in_context', 'a\ud800b'.encode('utf-7'), b'a+2AA-b')


# -- decoding -----------------------------------------------------------

check('decode_ascii', b'abc'.decode('utf-7'), 'abc')
check('decode_plus', b'+-'.decode('utf-7'), '+')
check('decode_run', b'+AOk-'.decode('utf-7'), 'é')
check('decode_cjk', b'+ZeVnLA-'.decode('utf-7'), '日本')
check('decode_non_bmp', b'+2D3esA-'.decode('utf-7'), '\U0001F6B0')
check('decode_unterminated_run_at_end', b'+AOk'.decode('utf-7'), 'é')
check('decode_bare_plus_at_end', b'+'.decode('utf-7'), '')
check('decode_run_ended_by_other', b'a+ImIDkQ.'.decode('utf-7'), 'a≢Α.')
check('decode_two_runs', b'+AGE-+AGI-'.decode('utf-7'), 'ab')
check('decode_run_then_direct', b'+AGEAYg-c'.decode('utf-7'), 'abc')

# Two lone surrogates in one run stay two lone surrogates -- they are not
# a pair, and UTF-7 does not object.
check('decode_two_lone_surrogates', b'+3ADYAA-'.decode('utf-7'),
      '\udc00\ud800')

check('round_trip', 'héllo 中文 \U0001F600 ~\\+'.encode('utf-7')
      .decode('utf-7'), 'héllo 中文 \U0001F600 ~\\+')


# -- malformed runs -----------------------------------------------------

def raises(data):
    try:
        data.decode('utf-7')
        return 'no raise'
    except UnicodeDecodeError:
        return 'UnicodeDecodeError'


# A run with no base64 at all, stopped by something that cannot be in one.
check('ill_formed_sequence', raises(b'+@'), 'UnicodeDecodeError')
# Twelve bits at end of input: not enough for a unit, and nothing follows.
check('unterminated_shift_sequence', raises(b'+AO'), 'UnicodeDecodeError')
# Six bits, then a terminator: a character was started and not finished.
check('partial_character', raises(b'+A-'), 'UnicodeDecodeError')
# '+' is itself a base64 character, so this is a six-bit run at end.
check('double_plus', raises(b'++'), 'UnicodeDecodeError')
# UTF-7 is seven-bit: a high byte cannot appear at all.  Decoding it as
# U+00FF would be a plausible-looking wrong answer.
check('high_byte_refused', raises(b'\xffb'), 'UnicodeDecodeError')


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
