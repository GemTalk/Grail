"""Fixture: a codec search function may answer a plain 4-tuple, checked as CPython checks it.

A search function registered with codecs.register answers a 4-tuple, a
CodecInfo being only a tuple with names, and CPython takes the encoder and
the decoder BY POSITION (Python/codecs.c).  The call must answer an
(output, consumed) pair, else "encoder must return a tuple (object,
integer)" or "decoder must return a tuple (object,integer)" -- the
decoder's without the space (:426-431, :470-475); and str.encode /
bytes.decode then require bytes / str of the output, where codecs.encode /
codecs.decode take anything.

Grail read ``.encode''/``.decode'' off the tuple, an AttributeError, and
took the first element of whatever the codec answered (test_str
test_codecs_errors).

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import codecs

r = {}


def search_function(encoding):
    def answers_an_int(input, errors='strict'):
        return 42

    def answers_a_pair(input, errors='strict'):
        return (42, 42)

    def text_pair(input, errors='strict'):
        return ('text', len(input))

    def bytes_pair(input, errors='strict'):
        return (b'bytes', len(input))

    if encoding == 'grail_fixture.answers_an_int':
        return (answers_an_int, answers_an_int, None, None)
    if encoding == 'grail_fixture.answers_a_pair':
        return (answers_a_pair, answers_a_pair, None, None)
    if encoding == 'grail_fixture.plain_tuple':
        return (bytes_pair, text_pair, None, None)
    return None


codecs.register(search_function)


def outcome(thunk):
    try:
        return repr(thunk())
    except TypeError as e:
        return 'TypeError: %s' % e


r['a_plain_tuple_works'] = [outcome(lambda: 'x'.encode('grail_fixture.plain_tuple')),
                            outcome(lambda: b'x'.decode('grail_fixture.plain_tuple')),
                            outcome(lambda: codecs.decode(b'x', 'grail_fixture.plain_tuple'))]
r['not_a_pair'] = [outcome(lambda: 'x'.encode('grail_fixture.answers_an_int')),
                   outcome(lambda: b'x'.decode('grail_fixture.answers_an_int')),
                   outcome(lambda: codecs.encode('x', 'grail_fixture.answers_an_int')),
                   outcome(lambda: codecs.decode(b'x', 'grail_fixture.answers_an_int'))]
r['a_pair_of_the_wrong_type'] = [outcome(lambda: 'x'.encode('grail_fixture.answers_a_pair')),
                                 outcome(lambda: str(b'x', 'grail_fixture.answers_a_pair'))]
r['the_registry_functions_take_any_type'] = [outcome(lambda: codecs.encode('x', 'grail_fixture.answers_a_pair')),
                                             outcome(lambda: codecs.decode(b'x', 'grail_fixture.answers_a_pair'))]
try:
    b'x'.decode('grail_fixture.answers_an_int')
except TypeError as e:
    r['no_codec_note_on_the_shape_error'] = getattr(e, '__notes__', None)

codecs.unregister(search_function)

ENCODER = 'TypeError: encoder must return a tuple (object, integer)'
DECODER = 'TypeError: decoder must return a tuple (object,integer)'

EXPECTED = {
    'a_plain_tuple_works': ["b'bytes'", "'text'", "'text'"],
    'not_a_pair': [ENCODER, DECODER, ENCODER, DECODER],
    'a_pair_of_the_wrong_type': [
        "TypeError: 'grail_fixture.answers_a_pair' encoder returned 'int' instead of 'bytes'; "
        "use codecs.encode() to encode to arbitrary types",
        "TypeError: 'grail_fixture.answers_a_pair' decoder returned 'int' instead of 'str'; "
        "use codecs.decode() to decode to arbitrary types"],
    'the_registry_functions_take_any_type': ['42', '42'],
    'no_codec_note_on_the_shape_error': None,
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-38s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
