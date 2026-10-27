"""Fixture: a set's repr names its type as CPython's set_repr does.

CPython's set_repr (Objects/setobject.c:566) writes ``{1, 2}`` for an exact
set and puts any other type's name around the braces -- a subclass reads
``S({7})``, and a frozenset always reads ``frozenset({7})`` -- while an empty
one is the name and ``()``.  Grail wrote ``{7}`` for every set and
``frozenset(...)`` for every frozenset, so test_pprint's test_set_reprs and
test_same_as_repr read differently.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import pprint

r = {}


class S(set):
    pass


class F(frozenset):
    pass


r['exact'] = (repr(set()), repr({7}), repr(frozenset()), repr(frozenset({7})))
r['subclass'] = (repr(S()), repr(S({7})), repr(F()), repr(F({7})))
r['two_elements'] = repr(S([1, 2])) in ('S({1, 2})', 'S({2, 1})')
r['pformat_small'] = (pprint.pformat(S(range(3))), pprint.pformat(F(range(3))))
r['str_matches_repr'] = str(S({7})) == repr(S({7}))

EXPECTED = {
    'exact': ('set()', '{7}', 'frozenset()', 'frozenset({7})'),
    'subclass': ('S()', 'S({7})', 'F()', 'F({7})'),
    'two_elements': True,
    'pformat_small': ('S({0, 1, 2})', 'F({0, 1, 2})'),
    'str_matches_repr': True,
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        print('%-5s %-18s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL',
                                    key, actual))
    print(SUMMARY)
