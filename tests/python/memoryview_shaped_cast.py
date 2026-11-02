"""Fixture: memoryview.cast(format, shape) gives the view a shape.

``memoryview(b'123456').cast('B', (2, 3))'' is two rows of three: the bytes do
not move, len() is the first dimension, tolist() nests, and a tuple of indices
names one item.  CPython refuses what memory_cast refuses
(Objects/memoryobject.c), in its words, and a single index or a slice of an
N-D view is a sub-view it has not implemented -- the same NotImplementedError.
Grail took one argument only, so base64's functions, which accept any
C-contiguous buffer, could not be handed one (15 test_base64 errors).

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import base64

r = {}


def outcome(thunk):
    try:
        return thunk()
    except Exception as e:
        return '%s: %s' % (type(e).__name__, e)


flat = memoryview(b'123456')
rows = flat.cast('B', (2, 3))

r['shape'] = [rows.shape, rows.ndim, rows.strides, rows.nbytes, rows.itemsize, len(rows)]
r['contiguity'] = [rows.c_contiguous, rows.f_contiguous, rows.contiguous]
r['contents'] = [rows.tolist(), rows.tobytes(), bytes(rows), rows == b'123456']
r['items'] = [rows[0, 1], rows[1, -1], outcome(lambda: rows[2, 0])]
r['sub_views_not_implemented'] = [outcome(lambda: rows[0]), outcome(lambda: rows[0:1, 0:1])]
r['other_formats'] = [memoryview(b'12345678').cast('H', (2, 2)).tolist(), flat.cast('B', [3, 2]).shape,
                      flat.cast('B', (6,)).shape, rows.cast('B').shape]
r['refused'] = [outcome(lambda: flat.cast('B', (4,))), outcome(lambda: flat.cast('B', (2, 2))),
                outcome(lambda: rows.cast('B', (3, 2))), outcome(lambda: flat.cast('B', (0, 6))),
                outcome(lambda: flat.cast('B', 6))]
r['zero_dim'] = [memoryview(b'1').cast('B', ()).tolist(), outcome(lambda: len(memoryview(b'1').cast('B', ())))]
r['reexported'] = [memoryview(rows).shape, memoryview(rows).ndim]
r['buffers_accepted'] = [bytes.maketrans(b'+/', memoryview(b'*$'))[43:44], b'a+b'.translate(bytes.maketrans(memoryview(b'+'), bytearray(b'-'))),
                         b'abc'.translate(None, memoryview(b'b'))]
r['base64'] = [base64.b64encode(rows), base64.b16encode(rows), base64.b64encode(memoryview(b'1234').cast('I', (1, 1)))]

EXPECTED = {
    'shape': [(2, 3), 2, (3, 1), 6, 1, 2],
    'contiguity': [True, False, True],
    'contents': [[[49, 50, 51], [52, 53, 54]], b'123456', b'123456', False],
    'items': [50, 54, 'IndexError: index out of bounds on dimension 1'],
    'sub_views_not_implemented': ['NotImplementedError: multi-dimensional sub-views are not implemented',
                                  'NotImplementedError: multi-dimensional slicing is not implemented'],
    'other_formats': [[[12849, 13363], [13877, 14391]], (3, 2), (6,), (6,)],
    'refused': ['TypeError: memoryview: product(shape) * itemsize != buffer size',
                'TypeError: memoryview: product(shape) * itemsize != buffer size',
                'TypeError: memoryview: cast must be 1D -> ND or ND -> 1D',
                'ValueError: memoryview.cast(): elements of shape must be integers > 0',
                'TypeError: shape must be a list or a tuple'],
    'zero_dim': [49, 'TypeError: 0-dim memory has no length'],
    'reexported': [(2, 3), 2],
    'buffers_accepted': [b'*', b'a-b', b'ac'],
    'base64': [b'MTIzNDU2', b'313233343536', b'MTIzNA=='],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-32s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
