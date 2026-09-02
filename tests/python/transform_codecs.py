"""The bytes-to-bytes transform codecs, and the binascii they stand on.

``codecs.encode(data, 'base64_codec')`` is not a text encoding: it takes
bytes and answers bytes.  CPython ships six of them -- base64, uu, quopri,
hex, zlib and (where the library is present) bz2 -- plus ``rot_13``, which
is the mirror case, str to str.  Grail shipped none, so every one of them
answered ``LookupError: unknown encoding``.

They are pure Python in CPython too; what was missing underneath was
binascii.  Grail's had base64 and hexlify only, and the uu codec is a
thin wrapper over ``b2a_uu``/``a2b_uu``.

NOT ``b2a_qp``/``a2b_qp``, deliberately.  They are absent too, but
``quopri`` already works without them -- it has a pure-Python fallback
and takes it when the import fails -- so the quopri codec needs nothing,
and ADDING them would silently move quopri off a working path onto a new
one.  A separate change, with quopri's own tests in front of it.

The other half is the DENYLIST.  A transform codec must not be reachable
through ``str.encode`` / ``bytes.decode`` at all, even once it is
registered, and CPython's refusal names the way out:

    'base64_codec' is not a text encoding; use codecs.encode() to handle
    arbitrary codecs

Without that, adding the codecs would have made ``'x'.encode('base64')``
start answering bytes-of-bytes instead of raising.

Every expectation was checked against CPython 3.14 first.
"""

import binascii
import codecs

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or 'got: %r' % (got,)


BYTES_TRANSFORMS = ['base64_codec', 'uu_codec', 'quopri_codec', 'hex_codec',
                    'zlib_codec']

ALIASES = {
    'base64_codec': ['base64', 'base_64'],
    'uu_codec': ['uu'],
    'quopri_codec': ['quopri', 'quoted_printable', 'quotedprintable'],
    'hex_codec': ['hex'],
    'zlib_codec': ['zip', 'zlib'],
    'rot_13': ['rot13'],
}


# -- the binascii primitives the codecs stand on ------------------------

def _hex_primitives():
    return (binascii.b2a_hex(b'abc'),
            binascii.a2b_hex(b'616263'),
            binascii.hexlify(b'abc'),
            binascii.unhexlify('616263'))


def _hexlify_with_a_separator():
    return (binascii.hexlify(b'abcd', '-'),
            binascii.hexlify(b'abcdef', b'_', 2),
            binascii.hexlify(b'abcdef', ':', -2))


def _uu_primitives():
    return (binascii.b2a_uu(b'abc'),
            binascii.a2b_uu(b'#86)C\n'),
            binascii.b2a_uu(b''))


def _hex_rejects_bad_input():
    out = []
    for call in (lambda: binascii.a2b_hex(b'61626'),
                 lambda: binascii.a2b_hex(b'zz')):
        try:
            call()
            out.append('no raise')
        except binascii.Error as exc:
            out.append(str(exc))
    return out


check('hex_primitives', _hex_primitives(),
      (b'616263', b'abc', b'616263', b'abc'))
check('hexlify_with_a_separator', _hexlify_with_a_separator(),
      (b'61-62-63-64', b'6162_6364_6566', b'6162:6364:6566'))
check('uu_primitives', _uu_primitives(),
      (b'#86)C\n', b'abc', b' \n'))
check('hex_rejects_bad_input', _hex_rejects_bad_input(),
      ['Odd-length string', 'Non-hexadecimal digit found'])


# -- every transform codec round-trips all 256 byte values --------------

def _round_trips():
    binput = bytes(range(256))
    out = []
    for encoding in BYTES_TRANSFORMS:
        (o, size) = codecs.getencoder(encoding)(binput)
        (i, dsize) = codecs.getdecoder(encoding)(o)
        out.append((encoding, size == len(binput), dsize == len(o),
                    i == binput))
    return out


def _encode_decode_helpers():
    return [(e, codecs.decode(codecs.encode(b'12345\x80', e), e))
            for e in BYTES_TRANSFORMS]


def _incremental():
    out = []
    for encoding in BYTES_TRANSFORMS:
        enc = codecs.getincrementalencoder(encoding)()
        dec = codecs.getincrementaldecoder(encoding)()
        blob = enc.encode(b'\x80', final=True)
        out.append((encoding, dec.decode(blob, final=True)))
    return out


check('round_trips', _round_trips(),
      [(e, True, True, True) for e in BYTES_TRANSFORMS])
check('encode_decode_helpers', _encode_decode_helpers(),
      [(e, b'12345\x80') for e in BYTES_TRANSFORMS])
check('incremental', _incremental(),
      [(e, b'\x80') for e in BYTES_TRANSFORMS])


# -- and every alias reaches the same codec -----------------------------

def _aliases_resolve():
    out = []
    for encoding, names in sorted(ALIASES.items()):
        canonical = codecs.lookup(encoding).name
        out.append((encoding,
                    all(codecs.lookup(n).name == canonical for n in names)))
    return out


check('aliases_resolve', _aliases_resolve(),
      [(e, True) for e in sorted(ALIASES)])


# -- rot_13 is the mirror case: str to str ------------------------------

def _rot13():
    return (codecs.encode('Hello world', 'rot-13'),
            codecs.decode('Uryyb jbeyq', 'rot-13'),
            codecs.encode('123 abc XYZ', 'rot13'))


def _rot13_incremental():
    enc = codecs.getincrementalencoder('rot-13')()
    dec = codecs.getincrementaldecoder('rot-13')()
    return (enc.encode('abc'), enc.encode('xyz', final=True),
            dec.decode('nop', final=True))


check('rot13', _rot13(),
      ('Uryyb jbeyq', 'Hello world', '123 nop KLM'))
check('rot13_incremental', _rot13_incremental(),
      ('nop', 'klm', 'abc'))


# -- none of them is reachable through str.encode / bytes.decode --------
#
# The refusal is a LookupError naming the way out, and it must have NO
# __cause__ -- CPython raises it fresh rather than chaining the lookup.

def _denylisted(names, encode):
    out = []
    for name in names:
        fmt = ("%r is not a text encoding; use codecs.%s() to handle "
               "arbitrary codecs" % (name, 'encode' if encode else 'decode'))
        try:
            if encode:
                'bad input type'.encode(name)
            else:
                b'bad input type'.decode(name)
            out.append((name, 'no raise'))
        except LookupError as exc:
            out.append((name, str(exc) == fmt and exc.__cause__ is None))
    return out


check('str_encode_denylists_binary_transforms',
      _denylisted(BYTES_TRANSFORMS, True),
      [(e, True) for e in BYTES_TRANSFORMS])
check('bytes_decode_denylists_binary_transforms',
      _denylisted(BYTES_TRANSFORMS, False),
      [(e, True) for e in BYTES_TRANSFORMS])
check('str_encode_denylists_rot13', _denylisted(['rot_13'], True),
      [('rot_13', True)])
check('bytes_decode_denylists_rot13', _denylisted(['rot_13'], False),
      [('rot_13', True)])


# -- a text codec is still reachable, and still says so -----------------

def _text_codecs_unaffected():
    return ('abc'.encode('utf-8'), b'abc'.decode('latin-1'),
            codecs.lookup('utf-8')._is_text_encoding,
            codecs.lookup('base64_codec')._is_text_encoding)


check('text_codecs_unaffected', _text_codecs_unaffected(),
      (b'abc', 'abc', True, False))


# -- the errors the codecs themselves raise -----------------------------

def _uu_rejects_truncated():
    try:
        codecs.decode(b'', 'uu_codec')
        return 'no raise'
    except ValueError as exc:
        return str(exc)


def _hex_error_propagates():
    try:
        codecs.decode(b'zz', 'hex_codec')
        return 'no raise'
    except binascii.Error as exc:
        return str(exc)


check('uu_rejects_truncated', _uu_rejects_truncated(),
      'Missing "begin" line in input data')
check('hex_error_propagates', _hex_error_propagates(),
      'Non-hexadecimal digit found')


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
