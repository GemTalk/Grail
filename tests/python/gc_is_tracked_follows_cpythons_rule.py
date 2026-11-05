"""Fixture: gc.is_tracked follows CPython's rule -- atoms no, containers yes.

CPython's gc.is_tracked answers whether its cycle collector tracks an object;
as a rule instances of atomic types are not tracked and containers and
user-defined objects are (Doc/library/gc.rst:189-207).  Grail's answered
False for everything, so test_structseq's test_replace_gc_tracked -- a
struct_time holding a list must be tracked -- failed.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import gc
import time

r = {}


class Plain:
    pass


class Number(int):
    pass


atoms = (0, True, 1.5, 1j, 'a', b'a', bytearray(b'a'), range(2), None, Ellipsis, NotImplemented, ())
containers = (([],), [], {}, {'a': []}, set(), frozenset(), Plain(), Plain, lambda: 0, Number(3))
r['atoms_are_not_tracked'] = [gc.is_tracked(each) for each in atoms]
r['containers_are'] = [gc.is_tracked(each) for each in containers]
holder = []
replaced = time.gmtime(0).__replace__(tm_year=holder)
holder.append(replaced)
r['a_struct_time_holding_a_list_is'] = gc.is_tracked(replaced)

EXPECTED = {
    'atoms_are_not_tracked': [False] * 12,
    'containers_are': [True] * 10,
    'a_struct_time_holding_a_list_is': True,
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-34s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
