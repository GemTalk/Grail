"""Four more codecs the encodings package was missing.

``punycode`` (RFC 3492), ``undefined``, and the two 8-bit charmaps
``iso8859-3`` and ``iso8859-15``/``latin9``.  Each answered
``LookupError: unknown encoding``; each is pure Python or a generated
table upstream, so shipping them is mostly a matter of shipping them.

They are grouped because of what they are NOT: ``idna`` is the other
name in this family and is deliberately absent.  It needs the whole
``stringprep`` module -- tables B.1, B.2, C.1.2, C.2.2, C.3 through C.9,
D.1 and D.2 -- and ``unicodedata.ucd_3_2_0``, a VERSIONED Unicode
database pinned at 3.2.  Grail's unicodedata is a five-function shim
over GemStone's, so ucd_3_2_0 could only be a fake wearing the name of a
specific Unicode version, which is a worse answer than LookupError.

punycode is the interesting one to get right: it is an algorithm, not a
table, and the RFC's own test vectors are what this pins.

Every expectation was checked against CPython 3.14 first.
"""

import codecs

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or 'got: %r' % (got,)


# -- punycode: RFC 3492's own vectors -----------------------------------

VECTORS = [
    # Arabic (Egyptian)
    ("ليهمابتكل"
     "موشعربي؟",
     b"egbpdaj6bu4bxfgehfvwxn"),
    # Chinese (simplified)
    ("他们为什么不说中文",
     b"ihqwcrb4cv8a8dqg056pqjye"),
    # Russian (Cyrillic) -- the RFC prints the code with a capital D to
    # carry a case flag; the codec round-trips the lowercase form, and
    # this pins what the CODEC does, not what the RFC prints.
    ("почемужеони"
     "неговорятпо"
     "русски",
     b"b1abfaaepdrnnbgefbadotcwatmq2g4l"),
    # Japanese, with ASCII mixed in -- the delimiter splits the two
    ("3年B組金八先生",
     b"3B-ww4c5e180e575a65lsy2b"),
    # Maltese (Malti)
    ("bonġusaġhe"
     "lsen",
     b"bonusahelsen-5ybd"),
    # ASCII only -- nothing to encode, and the delimiter still appears
    ("abc", b"abc-"),
    ("", b""),
]


def _punycode_encode():
    return [codecs.encode(text, 'punycode') for text, _ in VECTORS]


def _punycode_decode():
    return [codecs.decode(code, 'punycode') for _, code in VECTORS]


def _punycode_is_a_text_encoding():
    return ('bücher'.encode('punycode'),
            b'bcher-kva'.decode('punycode'),
            codecs.lookup('punycode')._is_text_encoding)


def _punycode_rejects_bad_input():
    out = []
    # A lone ``-`` is NOT bad input: the delimiter with an empty ASCII part
    # decodes to the empty string.
    for bad in (b'\xff', b'a-!', b'99999999999'):
        try:
            codecs.decode(bad, 'punycode')
            out.append('no raise')
        except UnicodeError:
            out.append('UnicodeError')
        except Exception as exc:
            out.append(type(exc).__name__)
    return out


def _punycode_incremental():
    enc = codecs.getincrementalencoder('punycode')()
    dec = codecs.getincrementaldecoder('punycode')()
    return (enc.encode('bücher', final=True),
            dec.decode(b'bcher-kva', final=True))


check('punycode_encode', _punycode_encode(), [c for _, c in VECTORS])
check('punycode_decode', _punycode_decode(), [t for t, _ in VECTORS])
check('punycode_is_a_text_encoding', _punycode_is_a_text_encoding(),
      (b'bcher-kva', 'bücher', True))
check('punycode_rejects_bad_input', _punycode_rejects_bad_input(),
      ['UnicodeError', 'UnicodeError', 'UnicodeError'])
check('punycode_incremental', _punycode_incremental(),
      (b'bcher-kva', 'bücher'))


# -- undefined: the codec whose whole job is to refuse ------------------

def _undefined_refuses():
    out = []
    for call in (lambda: 'abc'.encode('undefined'),
                 lambda: b'abc'.decode('undefined'),
                 lambda: codecs.encode('abc', 'undefined'),
                 lambda: codecs.decode(b'abc', 'undefined')):
        try:
            call()
            out.append('no raise')
        except UnicodeError as exc:
            out.append(str(exc))
        except Exception as exc:
            out.append(type(exc).__name__)
    return out


def _undefined_is_registered():
    info = codecs.lookup('undefined')
    return (info.name, info._is_text_encoding)


check('undefined_refuses', _undefined_refuses(),
      ['undefined encoding'] * 4)
check('undefined_is_registered', _undefined_is_registered(),
      ('undefined', True))


# -- the two 8-bit charmaps ---------------------------------------------

def _iso8859_3_round_trip():
    # 0xA1 is U+0126 LATIN CAPITAL LETTER H WITH STROKE in iso-8859-3,
    # where iso-8859-1 has an inverted exclamation mark.
    return (b'\xa1'.decode('iso-8859-3'),
            'Ħ'.encode('iso-8859-3'),
            b'abc'.decode('iso-8859-3'))


def _iso8859_3_has_holes():
    # \xa5 is unmapped -- the hole test_codecs' SurrogateEscapeTest uses.
    out = []
    try:
        b'foo\xa5bar'.decode('iso-8859-3')
        out.append('no raise')
    except UnicodeDecodeError:
        out.append('UnicodeDecodeError')
    out.append(b'foo\xa5bar'.decode('iso-8859-3', 'surrogateescape'))
    out.append('foo\udca5bar'.encode('iso-8859-3', 'surrogateescape'))
    return out


def _latin9_round_trip():
    # iso-8859-15 replaces the currency sign at 0xA4 with the euro,
    # which is the whole reason it exists.
    return (b'\xa4'.decode('latin9'),
            '€'.encode('iso-8859-15'),
            b'\xa4'.decode('latin-1'))


def _charmap_aliases():
    canonical = codecs.lookup('iso8859-15').name
    # ``latin-9`` is NOT among them: aliases.py normalises a hyphen to an
    # underscore before it looks up, and the table has no latin_9 entry.
    return (all(codecs.lookup(n).name == canonical
                for n in ('latin9', 'iso-8859-15', 'iso8859_15', 'L9')),
            _unknown('latin-9'))


def _unknown(name):
    try:
        codecs.lookup(name)
        return 'present'
    except LookupError:
        return 'LookupError'


check('iso8859_3_round_trip', _iso8859_3_round_trip(),
      ('Ħ', b'\xa1', 'abc'))
check('iso8859_3_has_holes', _iso8859_3_has_holes(),
      ['UnicodeDecodeError', 'foo\udca5bar', b'foo\xa5bar'])
check('latin9_round_trip', _latin9_round_trip(),
      ('€', b'\xa4', '¤'))
check('charmap_aliases', _charmap_aliases(), (True, 'LookupError'))


# -- a UnicodeError names its five arguments ----------------------------
#
# Not a codec, but what made punycode's own error path work: CPython
# exposes encoding / object / start / end / reason as read-write
# attributes, and stdlib codecs read them.  punycode's decoder catches
# the error its inner ascii decode raises and re-raises with the offsets
# adjusted -- ``offset + exc.start`` -- which needs a NUMBER.

def _unicode_error_attributes():
    try:
        raise UnicodeDecodeError('enc', b'ab', 0, 1, 'why')
    except UnicodeDecodeError as exc:
        return (exc.encoding, exc.object, exc.start, exc.end, exc.reason)


def _unicode_encode_error_attributes():
    try:
        raise UnicodeEncodeError('enc', 'ab', 0, 1, 'why')
    except UnicodeEncodeError as exc:
        return (exc.encoding, exc.object, exc.start, exc.end, exc.reason)


def _they_are_writable():
    try:
        raise UnicodeDecodeError('enc', b'ab', 0, 1, 'why')
    except UnicodeDecodeError as exc:
        exc.start = 7
        return exc.start


check('unicode_decode_error_attributes', _unicode_error_attributes(),
      ('enc', b'ab', 0, 1, 'why'))
check('unicode_encode_error_attributes',
      _unicode_encode_error_attributes(), ('enc', 'ab', 0, 1, 'why'))
check('unicode_error_attributes_are_writable', _they_are_writable(), 7)

# NOT checked here: whether an error GRAIL ITSELF raises carries them.
# ``b'a\xffb'.decode('ascii')`` answers None for all five, because the
# twenty-odd Smalltalk-side raise sites each build their own message and
# pass no arguments at all.  That is a real gap and a wider one than this
# change -- every codec, both directions -- so it is recorded in
# docs/Issues.md rather than half-fixed here.  What punycode needed, and
# what these three pin, is that an error constructed WITH the five
# arguments reports them.


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
