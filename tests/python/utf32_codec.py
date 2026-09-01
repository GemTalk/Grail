"""The UTF-32 codec family: utf-32, utf-32-le, utf-32-be.

Grail shipped utf-8 and utf-16 but not utf-32, so every spelling raised
``unknown encoding`` -- 33 tests in test_codecs, most of them the
incremental and stream cases the shared ReadTest base drives.

UTF-32 is the simpler of the two multi-byte families: every code point is
exactly one four-byte unit, so there are no surrogate PAIRS to straddle a
chunk boundary and an incremental decoder's held-back tail is just
``len % 4``.  What it does share with UTF-16 is a byte ORDER, so the
BOM-sniffing dance is the same.

The byte maths lives in ``_codecs`` in pure Python rather than in Grail's
built-in encoding table; ``str.encode`` reaches it through the codec
registry, which is what makes the encodings package the single door.

Every expectation was checked against CPython 3.14 first.
"""

import codecs

# ``import codecs'' is load-bearing on Grail, not decoration.  The codec
# registry is reachable from str.encode/bytes.decode only once the codecs
# module is in sys.modules -- see docs/Issues.md.  CPython has no such
# requirement, and the import is harmless there, so the fixture holds on
# both.

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or 'got: %r' % (got,)


# -- the three spellings ------------------------------------------------

check('lookup_utf_32', codecs.lookup('utf-32').name, 'utf-32')
check('lookup_utf_32_le', codecs.lookup('utf-32-le').name, 'utf-32-le')
check('lookup_utf_32_be', codecs.lookup('utf-32-be').name, 'utf-32-be')

check('encode_le', 'ab'.encode('utf-32-le'), b'a\x00\x00\x00b\x00\x00\x00')
check('encode_be', 'ab'.encode('utf-32-be'), b'\x00\x00\x00a\x00\x00\x00b')

# The BOM form is native order with a byte-order mark in front.
_bom = 'ab'.encode('utf-32')
check('encode_bom_has_a_bom', _bom[:4] in (b'\xff\xfe\x00\x00',
                                           b'\x00\x00\xfe\xff'), True)
check('encode_bom_length', len(_bom), 12)

check('decode_le', b'a\x00\x00\x00'.decode('utf-32-le'), 'a')
check('decode_be', b'\x00\x00\x00a'.decode('utf-32-be'), 'a')
check('decode_bom_le', b'\xff\xfe\x00\x00a\x00\x00\x00'.decode('utf-32'), 'a')
check('decode_bom_be',
      b'\x00\x00\xfe\xff\x00\x00\x00a'.decode('utf-32'), 'a')


# -- round trips, including beyond the BMP ------------------------------

_text = 'héllo \U0001F600 world'
check('round_trip_bom', _text.encode('utf-32').decode('utf-32'), _text)
check('round_trip_le', _text.encode('utf-32-le').decode('utf-32-le'), _text)
check('round_trip_be', _text.encode('utf-32-be').decode('utf-32-be'), _text)

# A non-BMP point is ONE unit here, unlike UTF-16's surrogate pair.
check('non_bmp_is_one_unit', len('\U0001F600'.encode('utf-32-le')), 4)
check('utf_16_needs_two_units', len('\U0001F600'.encode('utf-16-le')), 4)


# -- aliases ------------------------------------------------------------

check('alias_utf32', 'a'.encode('utf32'), 'a'.encode('utf-32'))
check('alias_u32', 'a'.encode('u32'), 'a'.encode('utf-32'))
check('alias_underscore', 'a'.encode('utf_32_le'), 'a'.encode('utf-32-le'))


# -- incremental decoding -----------------------------------------------
#
# The held-back tail is what an incremental decoder is FOR: a chunk that
# ends mid-unit must yield nothing for those bytes and pick them up next
# time.

def _incremental(chunks, encoding):
    dec = codecs.getincrementaldecoder(encoding)()
    out = []
    for i, chunk in enumerate(chunks):
        out.append(dec.decode(chunk, i == len(chunks) - 1))
    return ''.join(out)


check('incremental_split_mid_unit',
      _incremental([b'a\x00', b'\x00\x00b\x00\x00\x00'], 'utf-32-le'), 'ab')
check('incremental_bom_then_body',
      _incremental([b'\xff\xfe\x00\x00', b'a\x00\x00\x00'], 'utf-32'), 'a')
check('incremental_bom_split',
      _incremental([b'\xff\xfe', b'\x00\x00a\x00\x00\x00'], 'utf-32'), 'a')


# -- errors -------------------------------------------------------------

def _raises(fn, kind):
    try:
        fn()
        return 'no raise'
    except kind as exc:
        return type(exc).__name__


check('lone_surrogate_encode_raises',
      _raises(lambda: '\ud800'.encode('utf-32-le'), UnicodeEncodeError),
      'UnicodeEncodeError')
# NOT checked here: the ``replace'' policy over a lone surrogate.  Grail
# raises UnicodeEncodeError regardless of the errors argument for EVERY
# codec -- utf-8 and ascii included -- so pinning it would be testing a
# pre-existing gap that has nothing to do with utf-32.  See docs/Issues.md.
check('out_of_range_decode_raises',
      _raises(lambda: b'\x00\x00\x11\x00'.decode('utf-32-le'),
              UnicodeDecodeError),
      'UnicodeDecodeError')
check('truncated_final_raises',
      _raises(lambda: b'a\x00\x00'.decode('utf-32-le'), UnicodeDecodeError),
      'UnicodeDecodeError')
# NOT checked: the ``ignore'' policy on decode.  Grail's bytes.decode drops
# the errors argument when it falls through to its built-in table, so no
# table-backed codec honours a policy -- utf-8 and utf-16 included.  Same
# family as the encode-side gap; both are in docs/Issues.md.


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
