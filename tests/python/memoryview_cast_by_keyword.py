"""Fixture: memoryview.cast(format, shape) takes either argument by name.

Both of cast()'s parameters are nameable in CPython
(Objects/memoryobject.c memoryview_cast_impl), and Argument Clinic refuses a
bad call in a fixed order: too many in all, one given both ways, the format
missing, and last a name that is not a parameter.  Grail's cast took
positional arguments only, so ``m.cast('B', shape=[8, 8, 4])`` -- test_gzip's
test_write_memoryview -- was refused as taking no keyword arguments.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

r = {}


def outcome(thunk):
    try:
        return thunk()
    except Exception as e:
        return '%s: %s' % (type(e).__name__, e)


view = memoryview(bytes(range(256)))

r['shape_by_name'] = view.cast('B', shape=[8, 8, 4]).shape
r['both_by_name'] = view.cast(shape=[16, 16], format='B').shape
r['format_by_name'] = view.cast(format='H').format
r['by_position_still'] = view.cast('B', [4, 64]).shape
r['the_bytes_are_the_same'] = view.cast('B', shape=[8, 8, 4]).tobytes() == view.tobytes()
r['refused'] = [outcome(lambda: view.cast()),
                outcome(lambda: view.cast('B', [256], shape=[256])),
                outcome(lambda: view.cast('B', format='B')),
                outcome(lambda: view.cast('B', size=1)),
                outcome(lambda: view.cast(size=1))]

EXPECTED = {
    'shape_by_name': (8, 8, 4),
    'both_by_name': (16, 16),
    'format_by_name': 'H',
    'by_position_still': (4, 64),
    'the_bytes_are_the_same': True,
    'refused': ["TypeError: cast() missing required argument 'format' (pos 1)",
                'TypeError: cast() takes at most 2 arguments (3 given)',
                "TypeError: argument for cast() given by name ('format') and position (1)",
                "TypeError: cast() got an unexpected keyword argument 'size'",
                "TypeError: cast() missing required argument 'format' (pos 1)"],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-24s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
