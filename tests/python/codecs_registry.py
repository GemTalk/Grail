"""Fixture: the codec registry -- ``codecs`` and the ``encodings`` package.

Grail's ``codecs`` used to be a stub: ``lookup`` raised LookupError for every
name, ``CodecInfo`` carried only a ``.name``, and there was no ``encodings``
package at all.  That was enough for werkzeug, which catches the LookupError,
and it was a wall for everything else --

  * charset_normalizer  -> cannot import name 'BOM_UTF8' from 'codecs'
  * webencodings, bleach -> module '?' has no attribute 'Codec'
  * pure-Python protobuf -> No module named 'encodings.raw_unicode_escape'
  * io.TextIOWrapper over a buffer, and so socket.makefile('r'), because
    _pyio's wrapper asks codecs.lookup(enc).incrementaldecoder

-- so this fixture checks the registry itself rather than any one package.

Every check is written to hold on CPython too.  That is the point: the codec
protocol is not a Grail invention, and a Grail-flavoured expectation here would
pin whatever Grail happens to do rather than what a codec has to do.  The one
thing NOT checked is the set of codecs available: CPython ships about 100 and
Grail ships nine, so ``lookup('cp500')`` disagrees by design.  What is checked
is that the nine behave like codecs.
"""

import codecs
import encodings


class ByteSink:
    """A minimal byte stream -- write/getvalue and nothing else, so what the
    StreamWriter gets is only what it is entitled to."""

    def __init__(self, data=b''):
        self.buf = bytearray(data)
        self.pos = 0

    def write(self, data):
        self.buf.extend(data)
        return len(data)

    def read(self, size=-1):
        if size is None or size < 0:
            size = len(self.buf) - self.pos
        chunk = bytes(self.buf[self.pos:self.pos + size])
        self.pos += len(chunk)
        return chunk

    def getvalue(self):
        return bytes(self.buf)


def bom_constants():
    # charset_normalizer/constant.py imports exactly these five names at module
    # level, so their absence was an ImportError before anything ran.
    return [codecs.BOM_UTF8, codecs.BOM_UTF16_LE, codecs.BOM_UTF16_BE,
            codecs.BOM_UTF32_LE, codecs.BOM_UTF32_BE]


def lookup_answers_a_full_codecinfo():
    # A CodecInfo is a 4-tuple with six named attributes on it.  The stub had
    # only ``.name'', which is why ``lookup(enc).incrementaldecoder'' -- what
    # _pyio.TextIOWrapper does -- had nothing to reach for.
    info = codecs.lookup('utf-8')
    return [info.name,
            callable(info.encode), callable(info.decode),
            callable(info.incrementalencoder),
            callable(info.incrementaldecoder),
            callable(info.streamreader), callable(info.streamwriter),
            len(tuple(info))]


def lookup_normalizes_the_name():
    # Case, hyphen/underscore and the alias table all collapse onto one codec.
    # webencodings depends on this: its label table hands over python names
    # like 'iso-8859-1' that no module file is called.
    return [codecs.lookup('UTF-8').name, codecs.lookup('utf8').name,
            codecs.lookup('UTF_8').name, codecs.lookup('latin1').name,
            codecs.lookup('ISO-8859-1').name, codecs.lookup('US-ASCII').name]


def an_unknown_encoding_is_a_lookuperror():
    # werkzeug's CharsetAccept catches exactly this, so the stub's behaviour
    # for every name has to remain the behaviour for an unknown one.
    try:
        codecs.lookup('no-such-codec-at-all')
    except LookupError:
        return 'LookupError'
    return 'no error'


def codecs_round_trip():
    text = 'café €'
    out = []
    for name in ('utf-8', 'utf-16', 'utf-16-le', 'utf-16-be'):
        info = codecs.lookup(name)
        data, consumed = info.encode(text)
        back, used = info.decode(data)
        out.append([back == text, consumed == len(text), used == len(data)])
    return out


def single_byte_codecs_round_trip():
    # latin-1 and ascii are separate because they cannot carry the euro.
    latin = codecs.lookup('latin-1')
    plain = codecs.lookup('ascii')
    return [latin.decode(latin.encode('café')[0])[0] == 'café',
            plain.decode(plain.encode('cafe')[0])[0] == 'cafe']


def encoding_a_character_the_codec_lacks():
    try:
        codecs.lookup('ascii').encode('café')
    except UnicodeEncodeError:
        return 'UnicodeEncodeError'
    return 'no error'


def an_incremental_decoder_holds_a_partial_sequence():
    # The whole reason the registry has to hand out an incremental decoder:
    # the two bytes of 'e-acute' arrive in different chunks.  A per-chunk
    # decode raises on the truncated sequence; this one holds it back.
    dec = codecs.getincrementaldecoder('utf-8')()
    first = dec.decode(b'h\xc3')
    second = dec.decode(b'\xa9!', True)
    return [first, second == 'é!']


def an_incremental_decoder_resets():
    dec = codecs.getincrementaldecoder('utf-8')()
    dec.decode(b'h\xc3')
    dec.reset()
    return dec.decode(b'ok', True)


def an_incremental_encoder_spans_chunks():
    enc = codecs.getincrementalencoder('utf-8')()
    return [enc.encode('caf'), enc.encode('é', True)]


def a_stream_writer_and_reader():
    sink = ByteSink()
    writer = codecs.getwriter('utf-8')(sink)
    writer.write('café\n')
    written = sink.getvalue()
    reader = codecs.getreader('utf-8')(ByteSink(written))
    return [written, reader.read() == 'café\n']


def iterdecode_and_iterencode():
    chunks = [b'h\xc3', b'\xa9llo']
    decoded = ''.join(codecs.iterdecode(chunks, 'utf-8'))
    encoded = b''.join(codecs.iterencode(['caf', 'é'], 'utf-8'))
    return [decoded == 'héllo', encoded]


def encode_and_decode_helpers():
    return [codecs.encode('café', 'utf-8'),
            codecs.decode(b'caf\xc3\xa9', 'utf-8') == 'café']


def the_escape_codecs():
    # protobuf's pure-Python path imports encodings.raw_unicode_escape by name;
    # pickle protocol 0 leans on unicode-escape.
    raw = codecs.lookup('raw-unicode-escape')
    esc = codecs.lookup('unicode-escape')
    return [raw.encode('aé€')[0], esc.encode('aé')[0],
            raw.decode(b'a\\u20ac')[0] == 'a€']


def a_custom_codec_can_be_registered():
    # webencodings registers its own "replacement" and "x-user-defined" codecs
    # this way, so register() has to be more than a no-op.
    def upper_encode(text, errors='strict'):
        return (text.upper().encode('ascii', errors), len(text))

    def upper_decode(data, errors='strict'):
        return (bytes(data).decode('ascii', errors).lower(), len(data))

    info = codecs.CodecInfo(name='grail-test-upper',
                            encode=upper_encode, decode=upper_decode)

    def search(name):
        return info if name == 'grail_test_upper' else None

    codecs.register(search)
    found = codecs.lookup('grail-test-upper')
    return [found.name, found.encode('abc')[0], found.decode(b'ABC')[0]]


def the_builtin_error_handlers_are_registered():
    names = ['strict', 'ignore', 'replace', 'xmlcharrefreplace',
             'backslashreplace', 'namereplace']
    return [all(callable(codecs.lookup_error(n)) for n in names),
            callable(codecs.strict_errors), callable(codecs.replace_errors)]


def a_custom_error_handler_round_trips():
    def handler(exc):
        return ('!', exc.end)

    codecs.register_error('grail_test_bang', handler)
    return codecs.lookup_error('grail_test_bang') is handler


def an_unknown_error_handler_is_a_lookuperror():
    try:
        codecs.lookup_error('no-such-handler-at-all')
    except LookupError:
        return 'LookupError'
    return 'no error'


def charmap_primitives():
    # What webencodings' custom.py builds its codecs out of, and the reason
    # ``import webencodings'' needed more than CodecInfo.
    table = ''.join(chr(c if c < 128 else c + 0xF700) for c in range(256))
    emap = codecs.charmap_build(table)
    decoded = codecs.charmap_decode(b'ab\x80', 'strict', table)
    encoded = codecs.charmap_encode('ab', 'strict', emap)
    return [decoded[0] == 'ab', decoded[1], encoded[0], encoded[1]]


def charmap_undefined_is_an_error():
    table = 'ab' + '\ufffe' * 254
    try:
        codecs.charmap_decode(b'\x05', 'strict', table)
    except UnicodeDecodeError:
        strict = 'UnicodeDecodeError'
    else:
        strict = 'no error'
    # The replacement is compared rather than returned so the expectation
    # stays ASCII -- U+FFFD in a Smalltalk assertion string is a liability.
    return [strict,
            codecs.charmap_decode(b'\x05', 'replace', table)[0] == '\ufffd']


def the_encodings_package_is_importable_by_module_name():
    # The literal shape of protobuf's failure: ``No module named
    # 'encodings.raw_unicode_escape'''.  A codec module answers a CodecInfo
    # from getregentry(), which is the whole contract the package asks of it.
    import encodings.raw_unicode_escape
    import encodings.utf_8
    return [encodings.raw_unicode_escape.getregentry().name,
            encodings.utf_8.getregentry().name,
            encodings.normalize_encoding('UTF~8'),
            encodings.aliases.aliases['utf8']]


r = {
    'bom_constants': bom_constants(),
    'lookup_answers_a_full_codecinfo': lookup_answers_a_full_codecinfo(),
    'lookup_normalizes_the_name': lookup_normalizes_the_name(),
    'an_unknown_encoding_is_a_lookuperror': an_unknown_encoding_is_a_lookuperror(),
    'codecs_round_trip': codecs_round_trip(),
    'single_byte_codecs_round_trip': single_byte_codecs_round_trip(),
    'encoding_a_character_the_codec_lacks': encoding_a_character_the_codec_lacks(),
    'an_incremental_decoder_holds_a_partial_sequence':
        an_incremental_decoder_holds_a_partial_sequence(),
    'an_incremental_decoder_resets': an_incremental_decoder_resets(),
    'an_incremental_encoder_spans_chunks': an_incremental_encoder_spans_chunks(),
    'a_stream_writer_and_reader': a_stream_writer_and_reader(),
    'iterdecode_and_iterencode': iterdecode_and_iterencode(),
    'encode_and_decode_helpers': encode_and_decode_helpers(),
    'the_escape_codecs': the_escape_codecs(),
    'a_custom_codec_can_be_registered': a_custom_codec_can_be_registered(),
    'the_builtin_error_handlers_are_registered':
        the_builtin_error_handlers_are_registered(),
    'a_custom_error_handler_round_trips': a_custom_error_handler_round_trips(),
    'an_unknown_error_handler_is_a_lookuperror':
        an_unknown_error_handler_is_a_lookuperror(),
    'charmap_primitives': charmap_primitives(),
    'charmap_undefined_is_an_error': charmap_undefined_is_an_error(),
    'the_encodings_package_is_importable_by_module_name':
        the_encodings_package_is_importable_by_module_name(),
}


EXPECTED = {
    'bom_constants': [b'\xef\xbb\xbf', b'\xff\xfe', b'\xfe\xff',
                      b'\xff\xfe\x00\x00', b'\x00\x00\xfe\xff'],
    'lookup_answers_a_full_codecinfo':
        ['utf-8', True, True, True, True, True, True, 4],
    'lookup_normalizes_the_name':
        ['utf-8', 'utf-8', 'utf-8', 'iso8859-1', 'iso8859-1', 'ascii'],
    'an_unknown_encoding_is_a_lookuperror': 'LookupError',
    'codecs_round_trip': [[True, True, True], [True, True, True],
                          [True, True, True], [True, True, True]],
    'single_byte_codecs_round_trip': [True, True],
    'encoding_a_character_the_codec_lacks': 'UnicodeEncodeError',
    'an_incremental_decoder_holds_a_partial_sequence': ['h', True],
    'an_incremental_decoder_resets': 'ok',
    'an_incremental_encoder_spans_chunks': [b'caf', b'\xc3\xa9'],
    'a_stream_writer_and_reader': [b'caf\xc3\xa9\n', True],
    'iterdecode_and_iterencode': [True, b'caf\xc3\xa9'],
    'encode_and_decode_helpers': [b'caf\xc3\xa9', True],
    'the_escape_codecs': [b'a\xe9\\u20ac', b'a\\xe9', True],
    'a_custom_codec_can_be_registered': ['grail-test-upper', b'ABC', 'abc'],
    'the_builtin_error_handlers_are_registered': [True, True, True],
    'a_custom_error_handler_round_trips': True,
    'an_unknown_error_handler_is_a_lookuperror': 'LookupError',
    'charmap_primitives': [True, 3, b'ab\x80', 3],
    'charmap_undefined_is_an_error': ['UnicodeDecodeError', True],
    'the_encodings_package_is_importable_by_module_name':
        ['raw-unicode-escape', 'utf-8', 'UTF_8', 'utf_8'],
}


if __name__ == '__main__':
    for key, expected in EXPECTED.items():
        actual = r[key]
        print('%-5s %-52s -> %r' % ('OK' if actual == expected else 'FAIL',
                                    key, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-5s %-52s is not in EXPECTED' % ('FAIL', extra))
