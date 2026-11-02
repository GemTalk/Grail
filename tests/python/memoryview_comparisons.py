"""Fixture: a memoryview compares with any buffer by its items, and with
anything else not at all.

CPython's memory_richcompare (Objects/memoryobject.c) unpacks both buffers, each
in its own format, and compares the values: a view of b'abc' equals
array('h', [97, 98, 99]).  An operand with no buffer is NotImplemented, so the
comparison falls back to identity.  bytes answers NotImplemented to a
memoryview, so ``b'abc' == memoryview(b'abc')'' reaches the view's rule too.

Grail compared a view with bytes alone.  Anything else -- a str, an int, an
array -- sent a selector that does not exist, and the session ended on an
uncatchable MessageNotUnderstood; and ``b'abc' == memoryview(b'abc')'' was
False.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import array

r = {}

view = memoryview(b'abc')
released = memoryview(b'abc')
released.release()

r['with_bytes'] = [view == b'abc', b'abc' == view, b'abc' != view, view == bytearray(b'abc'),
                   bytearray(b'abc') == view, b'abd' == view]
r['with_buffers'] = [view == memoryview(b'abc'), view == array.array('b', b'abc'),
                     view == array.array('h', [97, 98, 99])]
r['with_no_buffer'] = [view == 'abc', view != 'abc', view == 1, view == None, view.__eq__('x')]
r['in_containers'] = [[b'abc'] == [view], view in ['x', b'abc']]
r['released'] = [released == released, released == memoryview(b'abc'), memoryview(b'abc') == released]

EXPECTED = {
    'with_bytes': [True, True, False, True, True, False],
    'with_buffers': [True, True, True],
    'with_no_buffer': [False, True, False, False, NotImplemented],
    'in_containers': [True, True],
    'released': [True, False, False],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-32s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
