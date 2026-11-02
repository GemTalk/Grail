"""Fixture: zlib._ZlibDecompressor's max_length=0, needs_input, and pickling.

_ZlibDecompressor has the bz2/lzma interface: decompress(data, max_length)
answers at most max_length bytes and keeps the input it did not get to, so
max_length=0 inflates nothing and keeps all of it -- it is how
test_decompressor_inputbuf_1 and _2 fill the input buffer.  Grail's class is
written over decompressobj, whose own max_length=0 means NO limit, so the
first call answered the whole text.  needs_input is True only once every
byte has been consumed (Modules/zlibmodule.c, decompress()), and the C type
cannot be pickled at all, where Grail's pickled as an ordinary instance.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import pickle
import zlib

r = {}

text = bytes(range(256)) * 20
data = zlib.compress(text)

decompressor = zlib._ZlibDecompressor()
r['max_length_zero_answers_nothing'] = [decompressor.decompress(data[:100], max_length=0),
                                        decompressor.needs_input]
r['then_two_bytes'] = [len(decompressor.decompress(b'', 2)), decompressor.needs_input]
rest = decompressor.decompress(data[100:])
r['then_the_rest'] = [decompressor.eof, decompressor.needs_input, len(rest) + 2 == len(text)]

fresh = zlib._ZlibDecompressor()
r['nothing_given_nothing_kept'] = [fresh.decompress(b'', max_length=0), fresh.needs_input]

limited = zlib._ZlibDecompressor()
first = limited.decompress(data, max_length=100)
r['a_limit_reached_keeps_input'] = [len(first), limited.needs_input]


def refusals():
    found = set()
    for proto in range(pickle.HIGHEST_PROTOCOL + 1):
        try:
            pickle.dumps(zlib._ZlibDecompressor(), proto)
            found.add('pickled')
        except TypeError as e:
            found.add('TypeError: %s' % e)
    return sorted(found)


r['pickling_is_refused'] = refusals()

EXPECTED = {
    'max_length_zero_answers_nothing': [b'', False],
    'then_two_bytes': [2, False],
    'then_the_rest': [True, False, True],
    'nothing_given_nothing_kept': [b'', True],
    'a_limit_reached_keeps_input': [100, False],
    'pickling_is_refused': ["TypeError: cannot pickle '_ZlibDecompressor' object",
                            "TypeError: cannot pickle 'zlib._ZlibDecompressor' object"],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-34s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
