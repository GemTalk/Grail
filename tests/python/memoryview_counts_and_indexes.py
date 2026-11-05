"""Fixture: memoryview.count and memoryview.index, new in Python 3.14.

memoryview gained the sequence methods count(value) and index(value, start=0,
stop=sys.maxsize): items are compared identity first and then with ==, the
bounds clamp as a slice's do, a missing value is ``memoryview.index(x): x not
found'', and only a one-dimensional view can be searched
(Objects/memoryobject.c:2787-2818 and 2840-2903).  Grail's memoryview had
neither method.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

r = {}


def outcome(call):
    try:
        return call()
    except Exception as error:
        return '%s: %s' % (type(error).__name__, error)


view = memoryview(b'abcabc')
r['counts'] = [view.count(97), view.count(122), view.count('a'), memoryview(bytearray(b'xx')).count(120)]
r['indexes'] = [view.index(99), view.index(97, 1), view.index(98, -3), view.index(97, 0, 1),
                view.index(99, -100, 100)]
r['a_missing_value'] = [outcome(lambda: view.index(122)), outcome(lambda: view.index(97, 1, 3)),
                        outcome(lambda: view.index(97, 4, 2))]
r['a_two_dimensional_view'] = [outcome(lambda: view.cast('B', (2, 3)).index(97))]
released = memoryview(b'ab')
released.release()
r['a_released_view'] = [outcome(lambda: released.count(97)), outcome(lambda: released.index(97))]
r['listed'] = ['count' in dir(memoryview), 'index' in dir(memoryview)]

EXPECTED = {
    'counts': [2, 0, 0, 2],
    'indexes': [2, 3, 4, 0, 2],
    'a_missing_value': ['ValueError: memoryview.index(x): x not found'] * 3,
    'a_two_dimensional_view': ['NotImplementedError: multi-dimensional lookup is not implemented'],
    'a_released_view': ['ValueError: operation forbidden on released memoryview object'] * 2,
    'listed': [True, True],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-24s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
