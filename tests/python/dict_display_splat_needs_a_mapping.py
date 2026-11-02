"""Fixture: ``{**m}'' in a dict display takes a mapping and nothing else.

CPython's DICT_UPDATE merges with PyDict_Update, which reads a non-dict
through keys() and __getitem__, and turns the AttributeError of an object
with no keys() into ``'list' object is not a mapping'' (Python/ceval.c).
Grail merged through dict.update, which also takes an iterable of pairs, so
``{**[]}'' was {} and ``{**1}'' said the int was not iterable -- test_unpack_ex's
doctests check both.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import collections

r = {}


def outcome(thunk):
    try:
        return thunk()
    except Exception as e:
        return '%s: %s' % (type(e).__name__, e)


class KeysOnly:
    def keys(self):
        return ['a', 'b']

    def __getitem__(self, key):
        return key * 2


r['refused'] = [outcome(lambda: {**1}), outcome(lambda: {**[]}), outcome(lambda: {**[('a', 1)]}),
                outcome(lambda: {**'ab'}), outcome(lambda: {'x': 1, **None})]
r['a_dict'] = {'a': 1, **{'b': 2}, 'c': 3, **{'a': 4}}
r['a_mapping_by_keys'] = {**KeysOnly()}
r['other_mappings'] = [{**collections.OrderedDict(x=1)}, {**collections.ChainMap({'y': 2})},
                       {**type('M', (), {})().__dict__}]

EXPECTED = {
    'refused': ["TypeError: 'int' object is not a mapping", "TypeError: 'list' object is not a mapping",
                "TypeError: 'list' object is not a mapping", "TypeError: 'str' object is not a mapping",
                "TypeError: 'NoneType' object is not a mapping"],
    'a_dict': {'a': 4, 'b': 2, 'c': 3},
    'a_mapping_by_keys': {'a': 'aa', 'b': 'bb'},
    'other_mappings': [{'x': 1}, {'y': 2}, {}],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-20s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
