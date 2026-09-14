"""An odd trailing byte under utf-16 is an ERROR, not something to drop.

utf-16 reads two bytes at a time, so a stream whose length is odd has one
byte that begins a unit nothing finishes. CPython refuses it -- position
and all -- exactly as it refuses any other ill-formed input:

    b'a\\x00b'.decode('utf-16-le')   UnicodeDecodeError: truncated data

Grail's decoder walked `[i + 1 <= n]`, so the trailing byte simply ended
the loop and was DROPPED. Silently, and under every handler: `strict`
returned 'a' instead of raising, and `replace` returned 'a' instead of
'a\\ufffd'. Losing a byte without saying so is worse than either answer.

utf-32 already length-checked and raised, so this was utf-16 alone; the
last group below pins that down so the fix does not drift into it.

WHAT THE HANDLERS DO differs, and is the part worth asserting rather than
assuming -- `surrogatepass` and `surrogateescape` do NOT rescue a
truncated tail, because a half unit is not a surrogate:

    replace           -> one U+FFFD
    ignore            -> nothing
    backslashreplace  -> the raw byte, lowercase hex
    surrogatepass     -> still raises
    surrogateescape   -> still raises

Every expectation was read off CPython 3.14 before being asserted here.
"""

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or 'got: %r' % (got,)


def _outcome(fn):
    try:
        return ('ok', fn())
    except BaseException as exc:
        return (type(exc).__name__, str(exc)[:60])


# label -> (bytes, encoding as spelled, reported encoding, start, end)
TRUNCATED = [
    ('le_one_odd',           b'a\x00b',            'utf-16-le', 'utf-16-le', 2, 3),
    ('be_one_odd',           b'\x00a\x00',         'utf-16-be', 'utf-16-be', 2, 3),
    ('single_byte',          b'a',                 'utf-16-le', 'utf-16-le', 0, 1),
    ('after_two_units',      b'a\x00b\x00c',       'utf-16-le', 'utf-16-le', 4, 5),
    ('bom_then_odd',         b'\xff\xfea\x00b',    'utf-16',    'utf-16-le', 4, 5),
    ('after_surrogate_pair', b'\x00\xd8\x00\xdcZ', 'utf-16-le', 'utf-16-le', 4, 5),
]


# ------------------------------------------ strict raises, and says where

def _strict_positions():
    out = {}
    for label, data, enc, reported, start, end in TRUNCATED:
        def probe(d=data, e=enc):
            try:
                d.decode(e)
            except UnicodeDecodeError as exc:
                return (exc.encoding, exc.start, exc.end, exc.reason)
            return 'NO ERROR RAISED'
        got = probe()
        want = (reported, start, end, 'truncated data')
        out[label] = (got == want) or got
    return {k: v for k, v in out.items() if v is not True}


check('strict_raises_and_says_where', _strict_positions(), {})


# ------------------------------------------- the substituting handlers

SUBSTITUTED = {
    'le_one_odd':           ('a�',  'a',  'a\\x62'),
    'be_one_odd':           ('a�',  'a',  'a\\x00'),
    'single_byte':          ('�',   '',   '\\x61'),
    'after_two_units':      ('ab�', 'ab', 'ab\\x63'),
    'bom_then_odd':         ('a�',  'a',  'a\\x62'),
    'after_surrogate_pair': ('\U00010000�', '\U00010000', '\U00010000\\x5a'),
}


def _substituting():
    out = {}
    for label, data, enc, _r, _s, _e in TRUNCATED:
        got = _outcome(lambda d=data, e=enc: (
            d.decode(e, 'replace'),
            d.decode(e, 'ignore'),
            d.decode(e, 'backslashreplace')))
        want = ('ok', SUBSTITUTED[label])
        out[label] = (got == want) or got
    return {k: v for k, v in out.items() if v is not True}


check('handlers_substitute_one_byte', _substituting(), {})


# --------------------------- a half unit is not a surrogate, so these raise

def _surrogate_handlers():
    out = {}
    for label, data, enc, _r, _s, _e in TRUNCATED:
        for handler in ('surrogatepass', 'surrogateescape'):
            got = _outcome(lambda d=data, e=enc, h=handler: d.decode(e, h))
            out[label + '/' + handler] = (got[0] == 'UnicodeDecodeError') or got
    return {k: v for k, v in out.items() if v is not True}


check('surrogate_handlers_still_raise', _surrogate_handlers(), {})


# ------------------------------- what must NOT change: well-formed input

def _well_formed():
    cases = [
        ('empty',          b'',                   'utf-16-le', ''),
        ('bom_only',       b'\xff\xfe',           'utf-16',    ''),
        ('two_units',      b'a\x00b\x00',         'utf-16-le', 'ab'),
        ('be_two_units',   b'\x00a\x00b',         'utf-16-be', 'ab'),
        ('bom_then_even',  b'\xff\xfea\x00',      'utf-16',    'a'),
        ('surrogate_pair', b'\x00\xd8\x00\xdc',   'utf-16-le', '\U00010000'),
    ]
    out = {}
    for label, data, enc, want in cases:
        got = _outcome(lambda d=data, e=enc: d.decode(e))
        out[label] = (got == ('ok', want)) or got
    return {k: v for k, v in out.items() if v is not True}


check('well_formed_input_is_untouched', _well_formed(), {})


# --------------------------------------- utf-32 already raised; still does

def _utf32_unchanged():
    out = {}
    for label, data, enc in [('one_short', b'a\x00\x00\x00\x00', 'utf-32-le'),
                             ('single',    b'a',                 'utf-32-le')]:
        got = _outcome(lambda d=data, e=enc: d.decode(e))
        out[label] = (got[0] == 'UnicodeDecodeError') or got
    out['round_trip'] = (_outcome(lambda: b'a\x00\x00\x00'.decode('utf-32-le'))
                         == ('ok', 'a')) or 'utf-32 round trip broke'
    return {k: v for k, v in out.items() if v is not True}


check('utf32_is_unchanged', _utf32_unchanged(), {})


# ------------------ a high surrogate pairs ONLY with a low one

# A second defect in the same decoder, found while fixing the first and
# strictly worse: the combining branch checked that a HIGH surrogate had two
# more bytes after it, but never that those bytes were a LOW surrogate. It
# combined them anyway --
#
#     b'\x00\xd8a\x00'.decode('utf-16-le')   ->   '②'
#
# 0x10000 + ((0xD800-0xD800) << 10) + (0x0061-0xDC00) is 0x2461, a circled
# digit two. So an ill-formed pair produced a WRONG character and SWALLOWED
# the one after it, where CPython raises. Silent corruption, not just loss.
#
# CPython separates three cases, and names each differently:
#
#     high + low                 -> one supplementary character
#     high + anything else       -> 'illegal UTF-16 surrogate', 2 bytes wide,
#                                   and the next unit is NOT consumed
#     high + fewer than 2 bytes  -> 'unexpected end of data', spanning the
#                                   high surrogate through end of data
#     low, unpaired              -> 'illegal encoding', 2 bytes wide

PAIRS = [
    ('high_then_plain',    b'\x00\xd8a\x00',            (0, 2, 'illegal UTF-16 surrogate')),
    ('high_then_high',     b'\x00\xd8\x00\xd8',         (0, 2, 'illegal UTF-16 surrogate')),
    ('high_then_high_low', b'\x00\xd8\x00\xd8\x00\xdc', (0, 2, 'illegal UTF-16 surrogate')),
    ('mid_stream_high',    b'a\x00\x00\xd8b\x00',       (2, 4, 'illegal UTF-16 surrogate')),
    ('high_at_end',        b'\x00\xd8',                 (0, 2, 'unexpected end of data')),
    ('high_then_odd',      b'\x00\xd8Z',                (0, 3, 'unexpected end of data')),
    ('plain_then_high',    b'a\x00\x00\xd8',            (2, 4, 'unexpected end of data')),
    ('high_low_then_high', b'\x00\xd8\x00\xdc\x00\xd8', (4, 6, 'unexpected end of data')),
    ('low_alone',          b'\x00\xdc',                 (0, 2, 'illegal encoding')),
    ('low_then_high',      b'\x00\xdc\x00\xd8',         (0, 2, 'illegal encoding')),
    ('low_then_odd',       b'\x00\xdcZ',                (0, 2, 'illegal encoding')),
]


def _pair_positions():
    out = {}
    for label, data, want in PAIRS:
        def probe(d=data):
            try:
                d.decode('utf-16-le')
            except UnicodeDecodeError as exc:
                return (exc.start, exc.end, exc.reason)
            return 'NO ERROR RAISED'
        got = probe()
        out[label] = (got == want) or got
    return {k: v for k, v in out.items() if v is not True}


check('a_high_surrogate_pairs_only_with_a_low_one', _pair_positions(), {})


# ------------- a real pair still combines, and nothing else is eaten

def _pairs_and_survivors():
    cases = [
        # a valid pair is untouched
        ('valid_pair',      b'\x00\xd8\x00\xdc',   'strict',  '\U00010000'),
        ('pair_then_plain', b'\x00\xd8\x00\xdca\x00', 'strict', '\U00010000a'),
        # THE CHARACTER AFTER A BROKEN PAIR SURVIVES -- it used to be eaten
        ('broken_keeps_next',  b'\x00\xd8a\x00',      'replace', '�a'),
        ('broken_mid_stream',  b'a\x00\x00\xd8b\x00', 'replace', 'a�b'),
        ('broken_ignored',     b'a\x00\x00\xd8b\x00', 'ignore',  'ab'),
        ('two_highs_then_pair', b'\x00\xd8\x00\xd8\x00\xdc', 'replace', '�\U00010000'),
        ('backslash_broken',   b'a\x00\x00\xd8b\x00', 'backslashreplace', 'a\\x00\\xd8b'),
    ]
    out = {}
    for label, data, handler, want in cases:
        got = _outcome(lambda d=data, h=handler: (
            d.decode('utf-16-le') if h == 'strict' else d.decode('utf-16-le', h)))
        out[label] = (got == ('ok', want)) or got
    return {k: v for k, v in out.items() if v is not True}


check('a_real_pair_combines_and_survivors_survive', _pairs_and_survivors(), {})
