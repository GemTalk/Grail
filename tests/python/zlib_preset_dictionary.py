"""Fixture: zlib's zdict, the preset dictionary.

compressobj(zdict=d) presets the dictionary with deflateSetDictionary, and
decompressobj(zdict=d) gives it to inflate when the stream asks for it --
or at once for a raw stream, which has no header to ask with
(Modules/zlibmodule.c:593, 687, 938).  A stream that asks with no dictionary
to give is zlib.error, ``Error 2 while decompressing data''.  Grail raised
NotImplementedError for compressobj(zdict=...), and decompressobj took no
zdict at all.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import zlib

r = {}


def outcome(thunk):
    try:
        return thunk()
    except zlib.error as e:
        return 'zlib.error: %s' % e
    except Exception as e:
        return '%s: %s' % (type(e).__name__, e)


dictionary = b'the quick brown fox jumps over the lazy dog'
text = b'the lazy dog and the quick brown fox' * 3


def compressed(wbits=15, zdict=dictionary):
    compressor = zlib.compressobj(wbits=wbits, zdict=zdict)
    return compressor.compress(text) + compressor.flush()


with_dictionary = compressed()
r['smaller_with_the_dictionary'] = len(with_dictionary) < len(zlib.compress(text))
r['by_keyword'] = zlib.decompressobj(zdict=dictionary).decompress(with_dictionary) == text
r['by_position'] = zlib.decompressobj(15, dictionary).decompress(with_dictionary) == text
r['from_a_bytearray_and_a_memoryview'] = [
    zlib.decompressobj(zdict=bytearray(dictionary)).decompress(with_dictionary) == text,
    zlib.decompressobj(zdict=memoryview(dictionary)).decompress(with_dictionary) == text]
r['in_pieces'] = b''.join(
    [zlib.decompressobj(zdict=dictionary).decompress(with_dictionary[:4])]) == b''
streamed = zlib.decompressobj(zdict=dictionary)
r['streamed_a_byte_at_a_time'] = b''.join(
    streamed.decompress(with_dictionary[i:i + 1]) for i in range(len(with_dictionary))) + streamed.flush() == text
r['without_it'] = [outcome(lambda: zlib.decompressobj().decompress(with_dictionary))]
r['the_wrong_one'] = outcome(lambda: zlib.decompressobj(zdict=b'something else').decompress(with_dictionary))
raw = compressed(wbits=-15)
r['raw_stream'] = zlib.decompressobj(-15, zdict=dictionary).decompress(raw) == text
r['refused_dictionaries'] = [outcome(lambda: zlib.compressobj(zdict='text')),
                             outcome(lambda: zlib.decompressobj(zdict='text')),
                             outcome(lambda: zlib.decompressobj(zdict=None))]
r['an_empty_one'] = [zlib.decompress(compressed(zdict=b'')) == text]

EXPECTED = {
    'smaller_with_the_dictionary': True,
    'by_keyword': True,
    'by_position': True,
    'from_a_bytearray_and_a_memoryview': [True, True],
    'in_pieces': True,
    'streamed_a_byte_at_a_time': True,
    'without_it': ['zlib.error: Error 2 while decompressing data'],
    'the_wrong_one': 'zlib.error: Error -3 while setting zdict: invalid input data',
    'raw_stream': True,
    'refused_dictionaries': ["TypeError: a bytes-like object is required, not 'str'",
                             'TypeError: zdict argument must support the buffer protocol',
                             'TypeError: zdict argument must support the buffer protocol'],
    'an_empty_one': [True],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-36s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
