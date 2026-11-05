"""Fixture: int, float, bytes and bool answer __getnewargs__, as CPython's do.

CPython's int, float and bytes define __getnewargs__, the argument tuple that
rebuilds a value through __new__ -- (int(self),), (float(self),) and the bytes
themselves (Objects/longobject.c:5962-5966, Objects/floatobject.c:1673-1677,
Objects/bytesobject.c:2664-2668) -- and bool inherits int's.  Grail had it on
str, tuple and complex, and on Python subclasses of int and float, but not on
a plain int, float, bytes or bool, nor on a subclass of bytes.  bytearray has
none, in CPython and still in Grail.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import copy
import pickle

r = {}


class Bytes(bytes):
    pass


class Int(int):
    pass


def described(value):
    arguments = value.__getnewargs__()
    return arguments, [type(each).__name__ for each in arguments]


r['the_plain_ones'] = [described(each) for each in (5, 2.5, b'ab', True, False)]
r['a_bytes_subclass_answers_plain_bytes'] = described(Bytes(b'q'))
r['bytearray_has_none'] = [hasattr(bytearray(b'a'), '__getnewargs__'),
                           '__getnewargs__' in dir(bytearray), '__getnewargs__' in vars(bytearray)]
r['the_types_list_it'] = ['__getnewargs__' in vars(each) for each in (int, float, bytes)]
r['subclasses_still_round_trip'] = [
    (type(each).__name__, each) for each in
    (pickle.loads(pickle.dumps(Bytes(b'z'), 2)), pickle.loads(pickle.dumps(Int(9), 2)),
     copy.copy(Bytes(b'c')), copy.deepcopy(Int(4)))]
r['and_so_do_the_plain_ones'] = [pickle.loads(pickle.dumps(each, protocol)) for each in (5, 2.5, b'ab', True)
                                 for protocol in (0, 2, 5)]

EXPECTED = {
    'the_plain_ones': [((5,), ['int']), ((2.5,), ['float']), ((b'ab',), ['bytes']), ((1,), ['int']),
                       ((0,), ['int'])],
    'a_bytes_subclass_answers_plain_bytes': ((b'q',), ['bytes']),
    'bytearray_has_none': [False, False, False],
    'the_types_list_it': [True, True, True],
    'subclasses_still_round_trip': [('Bytes', b'z'), ('Int', 9), ('Bytes', b'c'), ('Int', 4)],
    'and_so_do_the_plain_ones': [5, 5, 5, 2.5, 2.5, 2.5, b'ab', b'ab', b'ab', True, True, True],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-38s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
