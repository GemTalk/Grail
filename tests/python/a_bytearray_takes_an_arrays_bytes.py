"""Fixture: a bytearray takes an array.array's bytes, as it takes any buffer.

bytearray.extend(), ``+='' and slice assignment read a buffer by its bytes
(Objects/bytearrayobject.c: bytearray_extend and bytearray_setslice take the
buffer path before iterating; bytearray_iconcat takes any buffer), so an
array('I', [300, 70000]) adds its 8 bytes.  Grail iterated the array by item,
so extend() raised "byte must be in range(0, 256)" or added one byte per
item, ``+='' refused it as "can't concat array to bytearray", and slice
assignment raised ValueError.  gzip writes through a bytearray, so
GzipFile.write(array) lost the data (test_gzip test_write_array,
test_issue44439).

The expected bytes are the array's own tobytes(), so the checks hold on any
byte order.  Every check here holds under CPython 3.14, which is what makes
it evidence.
"""

import gzip
import io
from array import array

r = {}

WIDE = array('I', [300, 70000])
SHORT = array('H', [258])


def outcome(call):
    try:
        return call()
    except (TypeError, ValueError) as e:
        return '%s: %s' % (type(e).__name__, e)


def extended(value):
    b = bytearray(b'x')
    b.extend(value)
    return bytes(b)


def concatenated(value):
    b = bytearray(b'x')
    b += value
    return bytes(b)


def slice_assigned(value):
    b = bytearray(b'abcdef')
    b[1:3] = value
    return bytes(b)


def gzip_round_trip(value):
    sink = io.BytesIO()
    with gzip.GzipFile(fileobj=sink, mode='wb') as f:
        written = f.write(value)
    return written, gzip.decompress(sink.getvalue())


r['extend_takes_the_bytes'] = extended(WIDE)
r['concatenation_takes_the_bytes'] = [concatenated(array('B', [1, 2, 3])), concatenated(WIDE)]
r['slice_assignment_takes_the_bytes'] = slice_assigned(SHORT)
r['a_view_over_an_array_extends_by_its_bytes'] = extended(memoryview(array('h', [-1])))
r['gzip_writes_an_array'] = gzip_round_trip(WIDE)
r['a_list_still_extends_by_its_items'] = [extended([1, 2]), slice_assigned([7])]
r['concatenation_still_refuses_a_non_buffer'] = [outcome(lambda: concatenated([1, 2])),
                                                  outcome(lambda: concatenated('ab'))]

EXPECTED = {
    'extend_takes_the_bytes': b'x' + WIDE.tobytes(),
    'concatenation_takes_the_bytes': [b'x\x01\x02\x03', b'x' + WIDE.tobytes()],
    'slice_assignment_takes_the_bytes': b'a' + SHORT.tobytes() + b'def',
    'a_view_over_an_array_extends_by_its_bytes': b'x\xff\xff',
    'gzip_writes_an_array': (len(WIDE.tobytes()), WIDE.tobytes()),
    'a_list_still_extends_by_its_items': [b'x\x01\x02', b'a\x07def'],
    'concatenation_still_refuses_a_non_buffer': ["TypeError: can't concat list to bytearray",
                                                 "TypeError: can't concat str to bytearray"],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-42s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
