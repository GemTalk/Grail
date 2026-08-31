"""``str.encode`` / ``bytes.decode`` consult the codec REGISTRY.

Grail resolves encodings in two unrelated places: ``codecs.lookup`` walks
the registry (and so honours ``codecs.register`` and the ``encodings``
package), while ``str.encode`` and ``bytes.decode`` each carried their own
table of built-in names and raised ``unknown encoding`` the moment it
missed.  So a codec was reachable through ``codecs.encode(s, name)`` and
unreachable through ``s.encode(name)`` -- the same codec, the same
process, two answers.

Both now fall back to the registry before raising, which reaches
user-registered codecs AND everything the encodings package ships.  The
fallback is deliberately only consulted when ``codecs`` is ALREADY
imported: nothing can have been registered otherwise, and importing from
inside encode would recurse, since loading a module reads a file and
reading one decodes.

Every expectation was checked against CPython 3.14 first.
"""

import codecs

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or 'got: %r' % (got,)


# -- a codec the program registers -------------------------------------

def _encode(input, errors='strict'):
    return (b'ENC:' + input.encode('ascii'), len(input))


def _decode(input, errors='strict'):
    return ('DEC:' + bytes(input).decode('ascii'), len(input))


def _search(name):
    if name == 'grail_probe_codec':
        return codecs.CodecInfo(_encode, _decode, name='grail_probe_codec')
    return None


codecs.register(_search)

check('lookup_finds_it', codecs.lookup('grail_probe_codec').name,
      'grail_probe_codec')
check('codecs_encode_helper', codecs.encode('ab', 'grail_probe_codec'),
      b'ENC:ab')
check('codecs_decode_helper', codecs.decode(b'xy', 'grail_probe_codec'),
      'DEC:xy')

# The two that used to disagree with the three above.
check('str_encode_reaches_the_registry', 'ab'.encode('grail_probe_codec'),
      b'ENC:ab')
check('bytes_decode_reaches_the_registry', b'xy'.decode('grail_probe_codec'),
      'DEC:xy')


# -- a codec the encodings package ships --------------------------------
#
# utf-8-sig is the BOM-prefixed spelling; it reaches str.encode by the same
# fallback, which is what took nine UTF8SigTest errors out of test_codecs.

check('utf_8_sig_encode', 'abc'.encode('utf-8-sig'),
      b'\xef\xbb\xbfabc')
check('utf_8_sig_round_trip',
      b'\xef\xbb\xbfabc'.decode('utf-8-sig'), 'abc')
check('utf_8_sig_underscore_spelling', 'a'.encode('utf_8_sig'),
      b'\xef\xbb\xbfa')


# -- and a name nobody provides still raises ----------------------------

def _unknown(fn):
    try:
        fn()
        return 'no raise'
    except LookupError as exc:
        return type(exc).__name__


check('an_unknown_encode_name_still_raises',
      _unknown(lambda: 'a'.encode('grail_no_such_codec')), 'LookupError')
check('an_unknown_decode_name_still_raises',
      _unknown(lambda: b'a'.decode('grail_no_such_codec')), 'LookupError')

# The built-in table is still consulted first and unchanged.
check('utf_8_unchanged', 'héllo'.encode('utf-8'), b'h\xc3\xa9llo')
check('ascii_unchanged', 'abc'.encode('ascii'), b'abc')
check('latin_1_unchanged', 'é'.encode('latin-1'), b'\xe9')


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
