"""`namereplace`, codec-aware `surrogatepass`, and a UTF-16 decode that raises.

Three findings from one thread, each uncovered by fixing the one before it.

1. `namereplace` was unimplemented. `___unencodable___`'s comment said it
   "needs the Unicode character-name database" -- and Grail has one:
   `unicode_names >> ___nameForCodePoint:` is what `unicodedata.name()`
   already answers from. A code point WITHOUT a name falls back to the
   backslash escape, which is CPython's rule and is why a lone surrogate
   comes out identically under `namereplace` and `backslashreplace`.

2. `surrogatepass` ignored the target codec. It always answered the WTF-8
   form, so `'\\udc80'.encode('utf-16-le', 'surrogatepass')` gave three
   UTF-8 bytes instead of two little-endian ones -- right for utf-8 by
   coincidence, wrong for every other UTF.

3. A UTF-16 decode of a lone surrogate died with an UNCATCHABLE Smalltalk
   error. `Character codePoint:` refuses a surrogate, and the one-argument
   decode has no error handler to consult, so
   `b'[\\x00\\x80\\xdc]\\x00'.decode('utf-16-le')` took the session's error
   path rather than the program's -- under `strict`, `replace` and
   `ignore` alike. utf-32 already raised properly.

Finding 3 was uncovered by finding 1: with `namereplace` in place the
UTF-16 tests got as far as `surrogatepass` and started dying uncatchably,
which is worse than the assertion failure they had before.

Every expectation was checked against CPython 3.14 first.
"""

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or 'got: %r' % (got,)


def _outcome(fn):
    try:
        return ('ok', fn())
    except BaseException as exc:
        return (type(exc).__name__, str(exc)[:70])


# ------------------------------------------------------------ namereplace

def _namereplace_uses_the_character_name():
    return ('\xe4'.encode('ascii', 'namereplace'),
            '€'.encode('ascii', 'namereplace'))


def _namereplace_falls_back_when_there_is_no_name():
    """A lone surrogate and a private-use code point have no name, so both
    take the backslash escape."""
    return ('[\udc80]'.encode('utf-8', 'namereplace'),
            ''.encode('ascii', 'namereplace'))


def _namereplace_matches_backslashreplace_for_a_surrogate():
    """What `ReadTest.test_lone_surrogates` asserts, for every UTF."""
    return tuple(
        '[\udc80]'.encode(e, 'namereplace') == '[\\udc80]'.encode(e)
        for e in ('utf-8', 'utf-16', 'utf-16-le', 'utf-16-be',
                  'utf-32', 'utf-32-le', 'utf-32-be'))


check('namereplace_uses_the_character_name',
      _namereplace_uses_the_character_name(),
      (b'\\N{LATIN SMALL LETTER A WITH DIAERESIS}', b'\\N{EURO SIGN}'))
check('namereplace_falls_back_when_there_is_no_name',
      _namereplace_falls_back_when_there_is_no_name(),
      (b'[\\udc80]', b'\\ue000'))
check('namereplace_matches_backslashreplace_for_a_surrogate',
      _namereplace_matches_backslashreplace_for_a_surrogate(), (True,) * 7)


# -------------------------------------------------------- surrogatepass

def _surrogatepass_uses_the_target_codecs_own_form():
    return tuple('[\udc80]'.encode(e, 'surrogatepass') for e in
                 ('utf-8', 'utf-8-sig', 'utf-16', 'utf-16-le', 'utf-16-be',
                  'utf-32', 'utf-32-le', 'utf-32-be'))


def _surrogatepass_still_pairs_supplementary_characters():
    """It changes what is allowed through, not how the codec works: a
    supplementary character is still a surrogate PAIR in utf-16."""
    return '\U00010fff\udc80A'.encode('utf-16-le', 'surrogatepass')


def _surrogatepass_refuses_a_codec_with_no_surrogate_form():
    return (_outcome(lambda: '\udc80'.encode('ascii', 'surrogatepass'))[0],
            _outcome(lambda: '\udc80'.encode('latin-1', 'surrogatepass'))[0])


def _utf7_still_carries_a_surrogate():
    """RFC 2152 encodes UTF-16 code units, so a surrogate is ordinary
    there -- utf-7 must keep claiming it rather than be refused."""
    return '\udc80'.encode('utf-7', 'surrogatepass')


check('surrogatepass_uses_the_target_codecs_own_form',
      _surrogatepass_uses_the_target_codecs_own_form(),
      (b'[\xed\xb2\x80]',
       b'\xef\xbb\xbf[\xed\xb2\x80]',
       b'\xff\xfe[\x00\x80\xdc]\x00',
       b'[\x00\x80\xdc]\x00',
       b'\x00[\xdc\x80\x00]',
       b'\xff\xfe\x00\x00[\x00\x00\x00\x80\xdc\x00\x00]\x00\x00\x00',
       b'[\x00\x00\x00\x80\xdc\x00\x00]\x00\x00\x00',
       b'\x00\x00\x00[\x00\x00\xdc\x80\x00\x00\x00]'))
check('surrogatepass_still_pairs_supplementary_characters',
      _surrogatepass_still_pairs_supplementary_characters(),
      b'\x03\xd8\xff\xdf\x80\xdcA\x00')
check('surrogatepass_refuses_a_codec_with_no_surrogate_form',
      _surrogatepass_refuses_a_codec_with_no_surrogate_form(),
      ('UnicodeEncodeError', 'UnicodeEncodeError'))
check('utf7_still_carries_a_surrogate', _utf7_still_carries_a_surrogate(),
      b'+3IA-')


# --------------------------- a UTF-16 decode error is a PYTHON error

def _a_lone_surrogate_decode_raises_catchably():
    """The whole point: `except UnicodeDecodeError` must handle it.  An
    uncatchable Smalltalk error would abort this module instead."""
    out = []
    for data, enc in ((b'[\x00\x80\xdc]\x00', 'utf-16-le'),
                      (b'\x00[\xdc\x80\x00]', 'utf-16-be'),
                      (b'\xff\xfe[\x00\x80\xdc]\x00', 'utf-16')):
        try:
            data.decode(enc)
            out.append('no-error')
        except UnicodeDecodeError as exc:
            out.append('%s|%d|%d|%s' % (exc.encoding, exc.start, exc.end,
                                        exc.reason))
    return out


def _a_trailing_high_surrogate_also_raises():
    return _outcome(lambda: b'A\x00\x00\xd8'.decode('utf-16-le'))[0]


def _valid_utf16_still_decodes():
    return (b'[\x00]\x00'.decode('utf-16-le'),
            b'\x00[\x00]'.decode('utf-16-be'),
            b'\xff\xfe[\x00]\x00'.decode('utf-16'),
            b'\x03\xd8\xff\xdf'.decode('utf-16-le'))


check('a_lone_surrogate_decode_raises_catchably',
      _a_lone_surrogate_decode_raises_catchably(),
      ['utf-16-le|2|4|illegal encoding',
       'utf-16-be|2|4|illegal encoding',
       'utf-16-le|4|6|illegal encoding'])
check('a_trailing_high_surrogate_also_raises',
      _a_trailing_high_surrogate_also_raises(), 'UnicodeDecodeError')
check('valid_utf16_still_decodes', _valid_utf16_still_decodes(),
      ('[]', '[]', '[]', '\U00010fff'))


# NOT ASSERTED: `replace` and `ignore` on a UTF-16 decode.  CPython answers
# '[�]' and '[]'; Grail raises the UnicodeDecodeError above, because
# the one-argument decode this runs under never receives the handler.
# Threading `errors` through it is its own change -- recorded in
# docs/Issues.md.  What could not wait was the error being CATCHABLE.


# ------------------------------------------- nothing else moved

def _strict_still_refuses():
    return (_outcome(lambda: '\ud800'.encode('utf-8'))[0],
            _outcome(lambda: '\ud800'.encode('utf-16-le'))[0],
            _outcome(lambda: '\ud800'.encode('ascii'))[0])


def _the_other_handlers_are_unchanged():
    return ('[\udc80]'.encode('utf-8', 'replace'),
            '[\udc80]'.encode('utf-8', 'ignore'),
            '[\udc80]'.encode('utf-8', 'backslashreplace'),
            '[\udc80]'.encode('utf-8', 'xmlcharrefreplace'))


def _surrogateescape_round_trips():
    return (b'[\x80]'.decode('utf-8', 'surrogateescape'),
            '[\udc80]'.encode('utf-8', 'surrogateescape'))


check('strict_still_refuses', _strict_still_refuses(),
      ('UnicodeEncodeError',) * 3)
check('the_other_handlers_are_unchanged', _the_other_handlers_are_unchanged(),
      (b'[?]', b'[]', b'[\\udc80]', b'[&#56448;]'))
check('surrogateescape_round_trips', _surrogateescape_round_trips(),
      ('[\udc80]', b'[\x80]'))


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
