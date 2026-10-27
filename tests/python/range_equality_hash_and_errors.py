"""Fixture: range compares, hashes and refuses as CPython's does.

CPython's range_equals (Objects/rangeobject.c:515) makes two ranges equal when
they hold the same elements: equal lengths, then the same start unless both
are empty, then the same step unless they hold one element.  Grail compared
the steps of a one-element range, so range(5, 6) != range(5, 6, 2) although
both are [5].

range_hash (Objects/rangeobject.c:579) hashes (len, start, step) with None for
the start of an empty range and for the step of a one-element one, so equal
ranges hash alike.  Grail used the kernel Interval's hash, which sees the
inclusive end, so range(0, 5, 2) and range(0, 6, 2) -- both [0, 2, 4] --
hashed apart.

start, stop and step are Py_READONLY members (Objects/rangeobject.c:775), so
a store and a delete are both ``readonly attribute''; Grail accepted both
silently.  And range() / range(1, 2, 3, 4, 5, 6) named the kernel class
Interval where range_from_array (Objects/rangeobject.c:118, 122) names range.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

r = {}


def outcome(fn):
    try:
        return fn()
    except Exception as e:
        return '%s: %s' % (type(e).__name__, e)


def refused(fn):
    try:
        fn()
    except AttributeError as e:
        return str(e)
    return 'accepted'


RANGES = [range(0), range(0, -1), range(1, 1, 3), range(1), range(5, 6),
          range(5, 6, 2), range(5, 7, 2), range(2), range(0, 4, 2),
          range(0, 5, 2), range(0, 6, 2)]

r['eq_matches_tuples'] = [a == b for a in RANGES for b in RANGES] == \
    [tuple(a) == tuple(b) for a in RANGES for b in RANGES]
r['ne_negates_eq'] = all((a != b) is not (a == b) for a in RANGES for b in RANGES)
r['equal_hash_alike'] = all(hash(a) == hash(b)
                            for a in RANGES for b in RANGES if a == b)
r['one_element_ignores_step'] = (range(5, 6) == range(5, 6, 2),
                                 range(5, 6, 2) == range(5, 7, 2))
r['empty_ignores_start'] = (range(0) == range(3, 1), hash(range(0)) == hash(range(3, 1)))
r['huge_equal'] = (range(0, 2**100 - 1, 2) == range(0, 2**100, 2),
                   hash(range(2**200, 2**201 - 2**99, 2**100))
                   == hash(range(2**200, 2**201, 2**100)),
                   range(0, 2**100, 2) == range(0, 2**100 + 1, 2))
r['other_types_unequal'] = (range(0) == (), () == range(0), range(2) == [0, 1])

rng = range(10)
r['set_readonly'] = [refused(lambda n=n: setattr(rng, n, 0))
                     for n in ('start', 'stop', 'step')]
r['del_readonly'] = [refused(lambda n=n: delattr(rng, n))
                     for n in ('start', 'stop', 'step')]
r['attrs_unchanged'] = (rng.start, rng.stop, rng.step)

r['no_arguments'] = outcome(lambda: range())
r['six_arguments'] = outcome(lambda: range(1, 2, 3, 4, 5, 6))
r['keyword'] = outcome(lambda: range(stop=3))
r['three_still_work'] = list(range(1, 10, 4))

EXPECTED = {
    'eq_matches_tuples': True,
    'ne_negates_eq': True,
    'equal_hash_alike': True,
    'one_element_ignores_step': (True, True),
    'empty_ignores_start': (True, True),
    'huge_equal': (True, True, False),
    'other_types_unequal': (False, False, False),
    'set_readonly': ['readonly attribute'] * 3,
    'del_readonly': ['readonly attribute'] * 3,
    'attrs_unchanged': (0, 10, 1),
    'no_arguments': 'TypeError: range expected at least 1 argument, got 0',
    'six_arguments': 'TypeError: range expected at most 3 arguments, got 6',
    'keyword': 'TypeError: range() takes no keyword arguments',
    'three_still_work': [1, 5, 9],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        print('%-5s %-24s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL',
                                    key, actual))
    print(SUMMARY)
