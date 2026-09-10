"""`replace`, `ignore` and `backslashreplace` work on a decode.

Every builtin decoder is written to RAISE on ill-formed input, and the
one-argument `bytes >> decode:` they fall through to has no `errors` to
consult -- so the substituting policies all behaved as `strict` for ascii,
utf-16 and utf-32, and for utf-8 everything but `ignore`. Nine of thirty
codec/handler pairs agreed with CPython; twenty-five do now.

IMPLEMENTED BY RE-ENTERING THE STRICT DECODER, not by teaching each
decoder a policy. A strict decoder already reports an accurate
`[start, end)` for the bytes it choked on, which is the only thing a
policy needs -- and re-entry reproduces CPython's granularity for free:

    b'a\\x80\\x81b'.decode('utf-8', 'replace')   'a\\ufffd\\ufffdb'   two ranges
    b'a\\xe2\\x82'.decode('utf-8', 'replace')    'a\\ufffd'           one range

one U+FFFD per ERROR RANGE, so two stray bytes give two and a truncated
multi-byte sequence gives one. `backslashreplace` is the asymmetric one:
an escape per BYTE of the range.

THE DECODERS HAD TO LEARN TO SAY WHERE. utf-32's raises carried a message
and nothing else, so `exc.start` was None and the loop had nothing to work
from; giving them positions also brought their strict wording into line
with CPython's, which had drifted unnoticed because nothing read it.

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


BAD = {
    'utf-8': b'a\x80b',
    'utf-16-le': b'a\x00\x80\xdcb\x00',
    'utf-16-be': b'\x00a\xdc\x80\x00b',
    'utf-32-le': b'a\x00\x00\x00\x80\xdc\x00\x00b\x00\x00\x00',
    'ascii': b'a\x80b',
}

EXPECTED = {
    ('utf-8', 'replace'): 'a�b',
    ('utf-8', 'ignore'): 'ab',
    ('utf-8', 'backslashreplace'): 'a\\x80b',
    ('utf-16-le', 'replace'): 'a�b',
    ('utf-16-le', 'ignore'): 'ab',
    ('utf-16-le', 'backslashreplace'): 'a\\x80\\xdcb',
    ('utf-16-be', 'replace'): 'a�b',
    ('utf-16-be', 'ignore'): 'ab',
    ('utf-16-be', 'backslashreplace'): 'a\\xdc\\x80b',
    ('utf-32-le', 'replace'): 'a�b',
    ('utf-32-le', 'ignore'): 'ab',
    ('utf-32-le', 'backslashreplace'): 'a\\x80\\xdc\\x00\\x00b',
    ('ascii', 'replace'): 'a�b',
    ('ascii', 'ignore'): 'ab',
    ('ascii', 'backslashreplace'): 'a\\x80b',
}


def _the_whole_grid():
    out = {}
    for enc, data in BAD.items():
        for h in ('replace', 'ignore', 'backslashreplace'):
            got = _outcome(lambda d=data, e=enc, hh=h: d.decode(e, hh))
            out['%s|%s' % (enc, h)] = (('ok', EXPECTED[(enc, h)]) == got) or got
    return {k: v for k, v in out.items() if v is not True}


check('the_whole_grid', _the_whole_grid(), {})


# ------------------------------------------- one replacement per RANGE

def _granularity_follows_the_error_ranges():
    return (b'a\x80\x81b'.decode('utf-8', 'replace'),
            b'a\xe2\x82'.decode('utf-8', 'replace'),
            b'a\x80\x81\x82b'.decode('ascii', 'replace'),
            b'a\x00\x80\xdc\x81\xdcb\x00'.decode('utf-16-le', 'replace'))


def _backslashreplace_is_per_byte():
    return (b'a\x80\x81b'.decode('utf-8', 'backslashreplace'),
            b'a\xe2\x82'.decode('utf-8', 'backslashreplace'))


def _ignore_drops_the_whole_range():
    return (b'a\x80\x81b'.decode('utf-8', 'ignore'),
            b'a\xe2\x82'.decode('utf-8', 'ignore'))


check('granularity_follows_the_error_ranges',
      _granularity_follows_the_error_ranges(),
      ('a��b', 'a�', 'a���b', 'a��b'))
check('backslashreplace_is_per_byte', _backslashreplace_is_per_byte(),
      ('a\\x80\\x81b', 'a\\xe2\\x82'))
check('ignore_drops_the_whole_range', _ignore_drops_the_whole_range(),
      ('ab', 'a'))


# ------------------------------- a BOM is resolved once, not per re-entry

def _a_bom_is_not_re_read_after_an_error():
    """`utf-16` detects its byte order from a BOM.  Decoding the remainder
    after an error would read one again -- and there is none -- so the
    order is resolved and the mark dropped before the loop starts."""
    return (b'\xff\xfea\x00\x80\xdcb\x00'.decode('utf-16', 'replace'),
            b'\xfe\xff\x00a\xdc\x80\x00b'.decode('utf-16', 'replace'),
            b'\xff\xfe\x00\x00a\x00\x00\x00\x80\xdc\x00\x00'.decode(
                'utf-32', 'replace'))


check('a_bom_is_not_re_read_after_an_error',
      _a_bom_is_not_re_read_after_an_error(),
      ('a�b', 'a�b', 'a�'))


# ------------------------- the decoders now say WHERE, which strict shows

def _utf32_reports_positions():
    out = []
    for data, enc in ((b'a\x00\x00\x00\x80\xdc\x00\x00b\x00\x00\x00', 'utf-32-le'),
                      (b'a\x00\x00\x00\x00\x00\x11\x00', 'utf-32-le'),
                      (b'a\x00\x00\x00\x00', 'utf-32-le'),
                      (b'\x00\x00\x00a\x00\x00\xdc\x80', 'utf-32-be')):
        try:
            data.decode(enc)
            out.append('no-error')
        except UnicodeDecodeError as exc:
            out.append('%s|%d|%d|%s' % (exc.encoding, exc.start, exc.end,
                                        exc.reason))
    return out


check('utf32_reports_positions', _utf32_reports_positions(),
      ['utf-32-le|4|8|code point in surrogate code point range(0xd800, 0xe000)',
       'utf-32-le|4|8|code point not in range(0x110000)',
       'utf-32-le|4|5|truncated data',
       'utf-32-be|4|8|code point in surrogate code point range(0xd800, 0xe000)'])


# NOT ASSERTED: `surrogatepass` and `surrogateescape` on a UTF-16 or
# UTF-32 decode.  Both must answer a str CARRYING lone surrogates, which is
# a PyStrSurrogate rather than an ordinary Grail string, so they need the
# decoders to build a different kind of result -- not just a policy applied
# to a byte range.  Recorded in docs/Issues.md.


# ------------------------------------------------- nothing else moved

def _valid_input_still_decodes():
    return (b'abc'.decode('utf-8'), b'a\x00b\x00'.decode('utf-16-le'),
            b'\xff\xfea\x00'.decode('utf-16'),
            b'a\x00\x00\x00'.decode('utf-32-le'),
            b'abc'.decode('ascii'), ''.encode('utf-8').decode('utf-8'))


def _strict_still_raises():
    return tuple(_outcome(lambda d=d, e=e: d.decode(e))[0]
                 for e, d in BAD.items())


def _surrogateescape_on_utf8_is_unchanged():
    return b'a\x80b'.decode('utf-8', 'surrogateescape')


def _an_empty_input_is_empty():
    return tuple(b''.decode(e, 'replace') for e in BAD)


check('valid_input_still_decodes', _valid_input_still_decodes(),
      ('abc', 'ab', 'a', 'a', 'abc', ''))
check('strict_still_raises', _strict_still_raises(),
      ('UnicodeDecodeError',) * 5)
check('surrogateescape_on_utf8_is_unchanged',
      _surrogateescape_on_utf8_is_unchanged(), 'a\udc80b')
check('an_empty_input_is_empty', _an_empty_input_is_empty(), ('',) * 5)


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
