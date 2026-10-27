"""Fixture: sequence and mapping patterns match the subjects CPython's type flags admit.

A sequence pattern matches a subject whose type carries Py_TPFLAGS_SEQUENCE,
a mapping pattern one that carries Py_TPFLAGS_MAPPING (MATCH_SEQUENCE /
MATCH_MAPPING).  list, tuple, range, memoryview, collections.deque and
array.array carry the first natively; dict and types.MappingProxyType the
second; a class has the flag of the first class in its MRO that has one, and
registering a class with collections.abc.Sequence or Mapping sets it
(Modules/_abc.c).  str, bytes and bytearray are registered but carry none, and
a class that merely offers __len__ and __getitem__ is no sequence.  A lone
``[*_]`` asks no length; a mapping with keys asks len() before any key.

Grail excluded range, missed memoryview, and duck-typed both patterns; its
collections.deque, UserList, UserDict and array.array were not registered
with the ABCs at all, so isinstance said no to all four.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import array
import collections
import collections.abc
import types

r = {}


def kind(subject):
    match subject:
        case [*_]:
            return 'seq'
        case {}:
            return 'map'
    return 'none'


def kind_mapping_first(subject):
    match subject:
        case {}:
            return 'map'
        case [*_]:
            return 'seq'
    return 'none'


class SeqABC(collections.abc.Sequence):
    def __getitem__(self, i):
        return [1, 2][i]

    def __len__(self):
        return 2


class MapABC(collections.abc.Mapping):
    def __getitem__(self, k):
        return {'a': 1}[k]

    def __len__(self):
        return 1

    def __iter__(self):
        return iter(['a'])


class DuckSeq:
    def __getitem__(self, i):
        return [1, 2][i]

    def __len__(self):
        return 2


class DuckMap:
    def keys(self):
        return ['a']

    def __getitem__(self, k):
        return 1


class ListChild(list):
    pass


r['sequences'] = [kind(s) for s in (
    [1], (1,), range(2), memoryview(b'ab'), collections.deque([1]),
    array.array('i', [1]), collections.UserList([1]), SeqABC(), ListChild([1]))]
r['mappings'] = [kind(s) for s in (
    {'a': 1}, collections.OrderedDict(a=1), collections.defaultdict(int),
    types.MappingProxyType({}), collections.UserDict(), collections.ChainMap(),
    MapABC())]
r['neither'] = [kind(s) for s in (
    'ab', b'ab', bytearray(b'ab'), DuckSeq(), DuckMap(), 1, None, {1, 2}, iter([1]))]


class C:
    pass


class M1(collections.UserDict, collections.abc.Sequence):
    pass


class M3(collections.UserDict, C, list):
    pass


class S1(collections.UserList, collections.abc.Mapping):
    pass


class S3(list, C, collections.abc.Mapping):
    pass


r['first_flag_in_the_mro'] = [(kind(s), kind_mapping_first(s)) for s in (M1(), M3(), S1(), S3())]


class Parent:
    pass


class ChildBefore(Parent):
    pass


collections.abc.Sequence.register(Parent)


class ChildAfter(Parent):
    pass


r['registration'] = [kind(s) for s in (Parent(), ChildBefore(), ChildAfter())]


class LengthlessMapping:
    pass


collections.abc.Mapping.register(LengthlessMapping)


def keyed(subject):
    try:
        match subject:
            case {'a': _}:
                return 'map'
        return 'none'
    except TypeError as e:
        return str(e)


r['length_first'] = [keyed(LengthlessMapping()), kind_mapping_first(LengthlessMapping())]
r['isinstance'] = [
    (isinstance(s, collections.abc.Sequence), isinstance(s, collections.abc.Mapping))
    for s in (collections.deque(), array.array('i'), collections.UserList(),
              collections.UserDict(), collections.UserString(''))]

EXPECTED = {
    'sequences': ['seq'] * 9,
    'mappings': ['map'] * 7,
    'neither': ['none'] * 9,
    'first_flag_in_the_mro': [('map', 'map'), ('map', 'map'), ('seq', 'seq'), ('seq', 'seq')],
    'registration': ['seq'] * 3,
    'length_first': ["object of type 'LengthlessMapping' has no len()", 'map'],
    'isinstance': [(True, False), (True, False), (True, False), (False, True), (True, False)],
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
