"""Fixture: zlib's compress and decompress objects bind and drain as CPython's do.

Compress.compress(data, /), Decompress.decompress(data, /, max_length=0)
and both flush()es take their first argument positionally only, and refuse
otherwise in Argument Clinic's words.  Decompress.flush(length) is the size
of the first output buffer, not a limit: it answers all the remaining
output (Modules/zlibmodule.c, zlib_Decompress_flush_impl, which goes round
while avail_out is 0).

Grail read past the end of the positionals for ``compress(data=...)'' -- an
OffsetError no Python code could catch -- and its flush answered one
buffer's worth (test_zlib test_keywords, test_flush_custom_length,
test_flush_large_length).

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import zlib

r = {}
INPUT = b'hello world, ' * 2000
DATA = zlib.compress(INPUT, 1)


class CustomInt:
    def __index__(self):
        return 100


def refusal(call):
    try:
        call()
        return 'accepted'
    except (TypeError, ValueError) as e:
        return '%s: %s' % (type(e).__name__, e)


def drained(length):
    dco = zlib.decompressobj()
    first = dco.decompress(DATA, 1)
    return first + dco.flush(length) == INPUT


co = zlib.compressobj()
do = zlib.decompressobj()
r['by_keyword'] = [
    refusal(lambda: co.compress(data=INPUT)),
    refusal(lambda: do.decompress(data=DATA)),
    refusal(lambda: co.flush(mode=zlib.Z_FINISH)),
    refusal(lambda: zlib.decompressobj().flush(length=5)),
]
r['max_length_by_keyword'] = (
    zlib.decompressobj().decompress(DATA, max_length=10) == INPUT[:10])
r['flush_drains_everything'] = [drained(CustomInt()), drained(10), drained(2 ** 33)]
r['flush_refuses_no_length'] = [refusal(lambda: zlib.decompressobj().flush(0)),
                                refusal(lambda: zlib.decompressobj().flush(-1))]
co = zlib.compressobj(level=2, method=zlib.DEFLATED, wbits=-12, memLevel=9,
                      strategy=zlib.Z_FILTERED, zdict=b'')
do = zlib.decompressobj(wbits=-12, zdict=b'')
x = co.compress(INPUT) + co.flush()
r['a_round_trip_by_keyword'] = do.decompress(x, max_length=len(INPUT)) + do.flush() == INPUT

EXPECTED = {
    'by_keyword': [
        'TypeError: compress() takes exactly 1 positional argument (0 given)',
        'TypeError: decompress() takes at least 1 positional argument (0 given)',
        "TypeError: flush() got an unexpected keyword argument 'mode'",
        "TypeError: flush() got an unexpected keyword argument 'length'",
    ],
    'max_length_by_keyword': True,
    'flush_drains_everything': [True, True, True],
    'flush_refuses_no_length': ['ValueError: length must be greater than zero'] * 2,
    'a_round_trip_by_keyword': True,
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-26s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
