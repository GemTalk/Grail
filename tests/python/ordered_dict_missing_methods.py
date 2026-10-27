"""Fixture: OrderedDict copies, reverses, compares and merges as CPython's does.

Grail's OrderedDict keeps its key order in a parallel list, and stood without
CPython's copy, fromkeys, __reversed__, __eq__, __reduce__ and the | operators
(Lib/collections/__init__.py).  So od.copy() answered a plain dict -- pprint
formats a mappingproxy through its mapping's copy() (test_pprint
test_mapping_proxy) -- reversed(od) ignored move_to_end, two OrderedDicts in
different orders compared equal, and copy.copy() shared the order list with
the original, so both came back holding every key twice.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import copy
import pickle
import pprint
import types
from collections import OrderedDict

r = {}


class Sub(OrderedDict):
    pass


od = OrderedDict([('b', 2), ('a', 1), ('c', 3)])
od.move_to_end('b')
r['order'] = list(od)
r['reversed'] = list(reversed(od))
r['copy'] = (type(od.copy()).__name__, list(od.copy().items()))
r['copy_module'] = [list(f(od).items()) for f in (copy.copy, copy.deepcopy)]
r['original_untouched'] = list(od.items())
r['pickle'] = list(pickle.loads(pickle.dumps(od)).items())
r['subclass_keeps_class'] = (type(Sub(a=1).copy()).__name__,
                             type(copy.copy(Sub(a=1))).__name__)
r['fromkeys'] = (list(OrderedDict.fromkeys('xyz', 0).items()),
                 type(Sub.fromkeys('ab')).__name__)
r['eq'] = (OrderedDict(a=1, b=2) == OrderedDict(b=2, a=1),
           OrderedDict(a=1, b=2) != OrderedDict(b=2, a=1),
           OrderedDict(a=1, b=2) == {'b': 2, 'a': 1},
           OrderedDict(a=1, b=2) != {'b': 2, 'a': 1})
merged = OrderedDict(a=1) | {'b': 2}
r['or'] = (type(merged).__name__, list(merged.items()),
           type({'z': 0} | OrderedDict(a=1)).__name__)
inplace = OrderedDict(a=1)
inplace |= [('b', 2)]
r['ior'] = list(inplace.items())
r['unhashable'] = type(OrderedDict.__hash__).__name__
r['pprint_mappingproxy'] = pprint.pformat(
    types.MappingProxyType(OrderedDict(zip('abc', range(3)))), width=20)

EXPECTED = {
    'order': ['a', 'c', 'b'],
    'reversed': ['b', 'c', 'a'],
    'copy': ('OrderedDict', [('a', 1), ('c', 3), ('b', 2)]),
    'copy_module': [[('a', 1), ('c', 3), ('b', 2)], [('a', 1), ('c', 3), ('b', 2)]],
    'original_untouched': [('a', 1), ('c', 3), ('b', 2)],
    'pickle': [('a', 1), ('c', 3), ('b', 2)],
    'subclass_keeps_class': ('Sub', 'Sub'),
    'fromkeys': ([('x', 0), ('y', 0), ('z', 0)], 'Sub'),
    'eq': (False, True, True, False),
    'or': ('OrderedDict', [('a', 1), ('b', 2)], 'OrderedDict'),
    'ior': [('a', 1), ('b', 2)],
    'unhashable': 'NoneType',
    'pprint_mappingproxy': "mappingproxy(OrderedDict([('a',\n"
                           "                           0),\n"
                           "                          ('b',\n"
                           "                           1),\n"
                           "                          ('c',\n"
                           "                           2)]))",
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        print('%-5s %-22s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL',
                                    key, actual))
    print(SUMMARY)
