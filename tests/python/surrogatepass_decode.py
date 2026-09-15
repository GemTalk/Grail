"""`surrogatepass` on a DECODE, for the UTF codecs that can carry one.

The strict decoders reject a lone surrogate -- correctly -- and there was
no path that did anything else, so every `surrogatepass` decode raised.
Twenty-one `test_codecs` cases were waiting on it: ten
`test_incremental_surrogatepass`, nine `test_lone_surrogates` and two
`test_surrogatepass_handler`, spread across every UTF class.

Each UTF spells a surrogate the way it spells any other code point --
utf-8 the three-byte WTF-8 form, utf-16 a bare 16-bit unit, utf-32 a bare
32-bit one -- so the decoder reads them exactly as the strict one does and
simply declines to reject the result.

WHAT MADE IT POSSIBLE was `bytes class >> ___stringFromCodePoints___:`,
added for the escape codecs: an ordinary Grail string cannot hold a lone
surrogate, so the result has to be a `PyStrSurrogate`, and that is the
piece that decides. The same building block serves both.

The handler changes what is ALLOWED THROUGH, not how the codec works --
a supplementary character is still a surrogate PAIR in utf-16 -- which is
why the pairing and the round-trip are asserted alongside.

Every expectation was checked against CPython 3.14 first.
"""

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or 'got: %r' % (got,)


def _outcome(fn):
    try:
        return ('ok', fn())
    except BaseException as exc:
        return (type(exc).__name__, str(exc)[:60])


# One lone surrogate between two ASCII characters, spelled by each codec.
SAMPLES = {
    'utf-8': b'[\xed\xb2\x80]',
    'utf-8-sig': b'\xef\xbb\xbf[\xed\xb2\x80]',
    'utf-16': b'\xff\xfe[\x00\x80\xdc]\x00',
    'utf-16-le': b'[\x00\x80\xdc]\x00',
    'utf-16-be': b'\x00[\xdc\x80\x00]',
    'utf-32': b'\xff\xfe\x00\x00[\x00\x00\x00\x80\xdc\x00\x00]\x00\x00\x00',
    'utf-32-le': b'[\x00\x00\x00\x80\xdc\x00\x00]\x00\x00\x00',
    'utf-32-be': b'\x00\x00\x00[\x00\x00\xdc\x80\x00\x00\x00]',
}


def _every_utf_carries_a_surrogate():
    out = {}
    for enc, data in SAMPLES.items():
        got = _outcome(lambda d=data, e=enc: d.decode(e, 'surrogatepass'))
        out[enc] = (got == ('ok', '[\udc80]')) or got
    return {k: v for k, v in out.items() if v is not True}


check('every_utf_carries_a_surrogate', _every_utf_carries_a_surrogate(), {})


# ------------------------------------------------ the round trip

def _encode_then_decode_is_the_identity():
    """The pair this completes: #917 made the ENCODE codec-aware, and
    without the decode half it could not be read back."""
    return tuple('[\udc80]'.encode(e, 'surrogatepass').decode(e, 'surrogatepass')
                 for e in SAMPLES)


check('encode_then_decode_is_the_identity',
      _encode_then_decode_is_the_identity(), ('[\udc80]',) * 8)


# ------------------------- the handler changes what is allowed, not how

def _a_supplementary_character_is_still_a_pair():
    return (b'\x03\xd8\xff\xdf'.decode('utf-16-le', 'surrogatepass'),
            b'\xd8\x03\xdf\xff'.decode('utf-16-be', 'surrogatepass'),
            b'\x00\x01\x00\x00'.decode('utf-32-be', 'surrogatepass'))


def _a_high_surrogate_alone_stays_alone():
    """A high surrogate NOT followed by a low one is itself, not the start
    of a pair that swallows the next unit."""
    return (b'\x00\xd8a\x00'.decode('utf-16-le', 'surrogatepass'),
            b'\x00\xd8\x00\xd8'.decode('utf-16-le', 'surrogatepass'))


def _ordinary_text_is_unchanged():
    return (b'abc'.decode('utf-8', 'surrogatepass'),
            b'a\x00b\x00'.decode('utf-16-le', 'surrogatepass'),
            b'\xc3\xa4'.decode('utf-8', 'surrogatepass'),
            b''.decode('utf-16-le', 'surrogatepass'))


check('a_supplementary_character_is_still_a_pair',
      _a_supplementary_character_is_still_a_pair(),
      ('\U00010fff', '\U00010fff', '\U00010000'))
check('a_high_surrogate_alone_stays_alone',
      _a_high_surrogate_alone_stays_alone(), ('\ud800a', '\ud800\ud800'))
check('ordinary_text_is_unchanged', _ordinary_text_is_unchanged(),
      ('abc', 'ab', '\xe4', ''))


# ------------------------------------------- strict must still refuse

def _strict_still_refuses_the_same_bytes():
    return tuple(_outcome(lambda d=d, e=e: d.decode(e))[0]
                 for e, d in SAMPLES.items()
                 if e not in ('utf-8-sig',))


check('strict_still_refuses_the_same_bytes',
      _strict_still_refuses_the_same_bytes(), ('UnicodeDecodeError',) * 7)


# NOT ASSERTED: an ODD byte count under utf-16.  CPython raises
# `truncated data`; Grail's utf-16 decoder silently drops the trailing byte
# and answers the characters before it, under every handler.  Measured
# identical with and without this change -- utf-32 already raises -- so it
# is pre-existing and recorded in docs/Issues.md rather than fixed here.


# ----------------------------------- the other handlers are untouched

def _the_other_handlers_still_behave():
    data = SAMPLES['utf-16-le']
    return (_outcome(lambda: data.decode('utf-16-le', 'replace'))[1],
            _outcome(lambda: data.decode('utf-16-le', 'ignore'))[1],
            b'a\x80b'.decode('utf-8', 'surrogateescape'))


check('the_other_handlers_still_behave', _the_other_handlers_still_behave(),
      ('[�]', '[]', 'a\udc80b'))


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
