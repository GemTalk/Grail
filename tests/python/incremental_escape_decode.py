"""An incremental decoder must BUFFER an escape split across chunks.

`BufferedIncrementalDecoder` already did its half correctly: it keeps
whatever the codec did not consume and prepends it next time. What it
needs from the codec is the `final` flag honoured -- when `final` is false,
stop before a trailing sequence that might still be completed, and report
`consumed` short so the buffer picks it up.

utf-8 and utf-16 already did that (`_utf8_incomplete_tail`). The two
escape codecs ignored `final` entirely and decoded the whole input, so a
chunk ending mid-escape raised instead of waiting:

    b'a\\' fed without `final` is not "a backslash at end of string",
    it is a caller who has not sent the rest yet.

WHICH escapes can be incomplete differs between the two codecs, which is
the part worth testing rather than assuming:

    b'a\\x'   unicode-escape holds it, raw-unicode-escape does NOT
    b'a\\u'   both hold it

because raw-unicode-escape knows only `\\uXXXX` and `\\UXXXXXXXX`, so its
`\\x` is an ordinary backslash followed by an ordinary x -- already
complete. Octal and the one-letter escapes are never held: they are done
as soon as the backslash has one byte after it.

Every expectation was checked against CPython 3.14 first.
"""

import codecs

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or 'got: %r' % (got,)


def _outcome(fn):
    try:
        return ('ok', fn())
    except BaseException as exc:
        return (type(exc).__name__, str(exc)[:60])


# ------------------------------------- what the codec reports for a tail

TAILS = [
    ('a + BS', b'a\\'),
    ('a + BSBS', b'a\\\\'),
    ('a + BSBSBS', b'a\\\\\\'),
    ('a + x', b'a\\x'),
    ('a + x4', b'a\\x4'),
    ('a + x41', b'a\\x41'),
    ('a + u', b'a\\u'),
    ('a + u004', b'a\\u004'),
    ('a + u0041', b'a\\u0041'),
    ('a + U0000004', b'a\\U0000004'),
    ('a + octal', b'a\\1'),
    ('a + t', b'a\\t'),
    ('a + q', b'a\\q'),
    ('plain', b'abc'),
]

# (unicode-escape consumed, raw-unicode-escape consumed), from CPython.
EXPECTED = {
    'a + BS': (1, 1), 'a + BSBS': (3, 3), 'a + BSBSBS': (3, 3),
    'a + x': (1, 3), 'a + x4': (1, 4), 'a + x41': (5, 5),
    'a + u': (1, 1), 'a + u004': (1, 1), 'a + u0041': (7, 7),
    'a + U0000004': (1, 1), 'a + octal': (3, 3), 'a + t': (3, 3),
    'a + q': (3, 3), 'plain': (3, 3),
}


def _consumed_counts():
    out = {}
    for label, data in TAILS:
        got = _outcome(lambda d=data: (
            codecs.unicode_escape_decode(d, 'strict', False)[1],
            codecs.raw_unicode_escape_decode(d, 'strict', False)[1]))
        out[label] = (got == ('ok', EXPECTED[label])) or got
    return {k: v for k, v in out.items() if v is not True}


check('consumed_counts', _consumed_counts(), {})


# --------------------------------------- the decoder reassembles a split

def _incremental(enc, chunks):
    dec = codecs.getincrementaldecoder(enc)()
    return ''.join(dec.decode(c, i == len(chunks) - 1)
                   for i, c in enumerate(chunks))


def _an_escape_split_across_chunks():
    return (_incremental('unicode-escape', [b'a\\', b'u0041']),
            _incremental('unicode-escape', [b'a\\u', b'0041']),
            _incremental('unicode-escape', [b'a\\u00', b'41b']),
            _incremental('unicode-escape', [b'a\\', b'tb']),
            _incremental('raw-unicode-escape', [b'a\\', b'u0041']))


def _split_one_byte_at_a_time():
    """The hardest shape: every boundary lands inside the escape."""
    data = b'[\\u0041\\x42]'
    return _incremental('unicode-escape', [data[i:i + 1]
                                           for i in range(len(data))])


def _the_other_codecs_still_reassemble():
    return (_incremental('utf-8', [b'a\xe2', b'\x82\xac']),
            _incremental('utf-16-le', [b'a', b'\x00']),
            _incremental('utf-8', [b'\xf0\x9f', b'\x92', b'\xa9']))


check('an_escape_split_across_chunks', _an_escape_split_across_chunks(),
      ('aA', 'aA', 'aAb', 'a\tb', 'aA'))
check('split_one_byte_at_a_time', _split_one_byte_at_a_time(), '[AB]')
check('the_other_codecs_still_reassemble',
      _the_other_codecs_still_reassemble(), ('a€', 'a', '\U0001f4a9'))


# ------------------------------------------- final=True still refuses

def _a_truly_truncated_escape_still_raises():
    """`final` is the whole distinction: the same bytes that wait when more
    may come must fail when the caller says there is no more."""
    return (_outcome(lambda: codecs.unicode_escape_decode(b'a\\', 'strict',
                                                          True))[0],
            _outcome(lambda: codecs.unicode_escape_decode(b'a\\uD', 'strict',
                                                          True))[0],
            _outcome(lambda: _incremental('unicode-escape', [b'a\\']))[0])


def _a_dangling_escape_at_the_end_of_a_stream():
    dec = codecs.getincrementaldecoder('unicode-escape')()
    dec.decode(b'a\\u00', False)
    return _outcome(lambda: dec.decode(b'', True))[0]


check('a_truly_truncated_escape_still_raises',
      _a_truly_truncated_escape_still_raises(),
      ('UnicodeDecodeError',) * 3)
check('a_dangling_escape_at_the_end_of_a_stream',
      _a_dangling_escape_at_the_end_of_a_stream(), 'UnicodeDecodeError')


# ------------------------------------------------ batch use is unchanged

def _the_batch_codec_is_untouched():
    return (b'a\\tb'.decode('unicode-escape'),
            b'\\u0041'.decode('unicode-escape'),
            b'a\\'.decode('raw-unicode-escape'),
            _outcome(lambda: b'a\\'.decode('unicode-escape'))[0])


def _reset_clears_the_buffer():
    dec = codecs.getincrementaldecoder('unicode-escape')()
    dec.decode(b'a\\u00', False)
    dec.reset()
    return dec.decode(b'b', True)


check('the_batch_codec_is_untouched', _the_batch_codec_is_untouched(),
      ('a\tb', 'A', 'a\\', 'UnicodeDecodeError'))
check('reset_clears_the_buffer', _reset_clears_the_buffer(), 'b')


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
