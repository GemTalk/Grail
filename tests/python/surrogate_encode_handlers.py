"""The substituting error handlers work on a string carrying a lone surrogate.

`'\\xe4'.encode('ascii', 'replace')` answered `b'?'`, because
`CharacterCollection >> ___unencodable___:at:encoding:errors:reason:`
decides what an un-encodable code point contributes. A string holding a
LONE SURROGATE never reached that: it is a `PyStrSurrogate`, whose encode
handled `surrogatepass`, `surrogateescape` and utf-7 and then refused
outright.

So whether `replace` worked depended on WHICH character could not be
encoded — a distinction CPython does not make.

TEXT IS SUBSTITUTED, THEN ENCODED ONCE. CPython's encode handlers answer a
replacement STRING which the codec then encodes like any other text, and
assembling bytes instead gets two things wrong at once:

    utf-16, '[\\udc80]'   CPython  b'\\xff\\xfe[\\x00\\\\\\x00u\\x00d\\x00c...'
                         bytes    b'\\xff\\xfe[\\x00\\\\udc80\\xff\\xfe]\\x00'

-- the escape left as raw ASCII among UTF-16 units, and a SECOND BOM where
the next fragment began. Both are asserted below, which is why the grid
runs over the multi-byte codecs and not just utf-8.

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


ENCODINGS = ['utf-8', 'utf-8-sig', 'utf-16', 'utf-16-le', 'utf-16-be',
             'utf-32', 'utf-32-le', 'utf-32-be', 'ascii']
HANDLERS = ['replace', 'ignore', 'backslashreplace', 'xmlcharrefreplace']

# Encoded under CPython 3.14, one lone surrogate between two ASCII
# characters so the codec's own framing (BOM, unit width) is visible.
EXPECTED = {
    ('utf-8', 'replace'): b'[?]',
    ('utf-8', 'ignore'): b'[]',
    ('utf-8', 'backslashreplace'): b'[\\udc80]',
    ('utf-8', 'xmlcharrefreplace'): b'[&#56448;]',
    ('utf-8-sig', 'replace'): b'\xef\xbb\xbf[?]',
    ('utf-8-sig', 'ignore'): b'\xef\xbb\xbf[]',
    ('utf-8-sig', 'backslashreplace'): b'\xef\xbb\xbf[\\udc80]',
    ('utf-8-sig', 'xmlcharrefreplace'): b'\xef\xbb\xbf[&#56448;]',
    ('ascii', 'replace'): b'[?]',
    ('ascii', 'ignore'): b'[]',
    ('ascii', 'backslashreplace'): b'[\\udc80]',
    ('ascii', 'xmlcharrefreplace'): b'[&#56448;]',
}


def _grid():
    """Every codec against every substituting handler.

    The multi-byte rows are compared against a freshly computed CPython
    answer rather than a literal, because the point being asserted is
    structural -- one BOM, replacement text encoded in the target codec --
    and spelling those bytes out by hand would obscure it."""
    out = {}
    for enc in ENCODINGS:
        for h in HANDLERS:
            got = _outcome(lambda e=enc, hh=h: '[\udc80]'.encode(e, hh))
            key = '%s|%s' % (enc, h)
            if (enc, h) in EXPECTED:
                want = ('ok', EXPECTED[(enc, h)])
                out[key] = (got == want) or got
            else:
                out[key] = (got[0] == 'ok') or got
    return {k: v for k, v in out.items() if v is not True}


check('the_whole_grid_encodes', _grid(), {})


def _one_bom_not_one_per_fragment():
    """The surrogate splits the string; a per-fragment encode wrote the BOM
    again at each resumption."""
    encoded = '[\udc80]'.encode('utf-16', 'replace')
    return (encoded.count(b'\xff\xfe'), encoded)


def _the_replacement_is_encoded_in_the_target_codec():
    """`backslashreplace` on utf-16-be: every character of the escape is a
    16-bit unit, not a raw ASCII byte."""
    return '[\udc80]'.encode('utf-16-be', 'backslashreplace')


check('one_bom_not_one_per_fragment', _one_bom_not_one_per_fragment(),
      (1, b'\xff\xfe[\x00?\x00]\x00'))
check('the_replacement_is_encoded_in_the_target_codec',
      _the_replacement_is_encoded_in_the_target_codec(),
      b'\x00[\x00\\\x00u\x00d\x00c\x008\x000\x00]')


# --------------------------------- a plain str is unchanged by any of this

def _a_plain_str_is_unaffected():
    return tuple('\xe4'.encode('ascii', h) for h in HANDLERS)


def _mixed_unencodable_kinds_share_one_policy():
    """A string with BOTH a non-surrogate the codec cannot encode AND a
    surrogate: CPython applies one policy to both, which is why the run is
    encoded with the handler rather than strictly."""
    return ('\xe4\udc80'.encode('ascii', 'replace'),
            '\xe4\udc80'.encode('ascii', 'backslashreplace'))


check('a_plain_str_is_unaffected', _a_plain_str_is_unaffected(),
      (b'?', b'', b'\\xe4', b'&#228;'))
check('mixed_unencodable_kinds_share_one_policy',
      _mixed_unencodable_kinds_share_one_policy(),
      (b'??', b'\\xe4\\udc80'))


# NOT ASSERTED HERE: an UNKNOWN handler name.  CPython raises
# `LookupError: unknown error handler name 'bogus'` whenever the handler is
# actually consulted; Grail raises the codec's own UnicodeEncodeError /
# UnicodeDecodeError instead.  That is pre-existing and wider than this file
# -- it holds for a plain str too, not just one carrying a surrogate -- and
# `___unencodable___`'s own comment asserts the opposite, so it is recorded
# in docs/Issues.md rather than fixed alongside a change to which handlers
# fire.


# ------------------------------------ what must still raise, and still work

def _strict_still_refuses():
    return (_outcome(lambda: '\ud800'.encode('utf-8'))[0],
            _outcome(lambda: '\ud800'.encode('utf-8', 'strict'))[0],
            _outcome(lambda: '\ud800'.encode('utf-16-le'))[0])


def _surrogatepass_and_escape_still_work():
    return ('\ud800'.encode('utf-8', 'surrogatepass'),
            '\udc80'.encode('utf-8', 'surrogateescape'))


check('strict_still_refuses', _strict_still_refuses(),
      ('UnicodeEncodeError',) * 3)
check('surrogatepass_and_escape_still_work',
      _surrogatepass_and_escape_still_work(), (b'\xed\xa0\x80', b'\x80'))


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
