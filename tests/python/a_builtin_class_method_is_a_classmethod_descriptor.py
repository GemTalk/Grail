"""Fixture: a built-in type's class method is a classmethod_descriptor.

``dict.__dict__['fromkeys']'' and ``int.__dict__['from_bytes']'' are
CPython's classmethod_descriptor (Objects/descrobject.c): types names it
ClassMethodDescriptorType, it reprs as ``<method 'fromkeys' of 'dict'
objects>'', it binds only to its type or a subtype (classmethod_get) and
it is callable with the class first (classmethoddescr_call); it cannot be pickled
or copied.

Grail answered a classmethod wrapping the Smalltalk method: it bound to
anything -- ``descr.__get__(42)'' answered a method of 42 -- was not
callable, and printed its Smalltalk class (test_descr test_meth_class_get,
test_types test_method_descriptor_types).

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import copy
import pickle
import types

r = {}


class Sub(dict):
    pass


def outcome(call):
    try:
        return call()
    except TypeError as e:
        return 'TypeError: %s' % e


fromkeys = dict.__dict__['fromkeys']
from_bytes = int.__dict__['from_bytes']

r['its_type_is_classmethod_descriptor'] = [
    type(fromkeys).__name__, isinstance(fromkeys, types.ClassMethodDescriptorType),
    isinstance(from_bytes, types.ClassMethodDescriptorType),
    isinstance(bytes.__dict__['fromhex'], types.ClassMethodDescriptorType),
    isinstance(float.__dict__['fromhex'], types.ClassMethodDescriptorType), callable(fromkeys)]
r['its_repr_and_names'] = [
    repr(fromkeys), repr(from_bytes), fromkeys.__name__, fromkeys.__qualname__,
    fromkeys.__objclass__ is dict, from_bytes.__qualname__]
r['it_binds_to_its_type_or_a_subtype'] = [
    fromkeys.__get__(None, dict)([1]), fromkeys.__get__({})([2]),
    type(fromkeys.__get__(None, Sub)([3])).__name__, type(fromkeys.__get__(Sub())([4])).__name__]
r['it_refuses_to_bind_anything_else'] = [
    outcome(lambda: fromkeys.__get__(None, None)), outcome(lambda: fromkeys.__get__(42)),
    outcome(lambda: fromkeys.__get__(None, 42)), outcome(lambda: fromkeys.__get__(None, int))]
r['it_is_called_with_the_class_first'] = [
    fromkeys(dict, [5]), type(fromkeys(Sub, [6])).__name__, fromkeys(dict, [7], 0),
    from_bytes(int, b'\x01\x00', 'big'), from_bytes(int, b'\x01\x00', byteorder='little')]
r['its_call_refuses_as_cpythons'] = [
    outcome(lambda: fromkeys()), outcome(lambda: fromkeys(int, [1])), outcome(lambda: fromkeys(42, [1]))]
r['it_is_neither_pickled_nor_copied'] = [
    outcome(lambda: pickle.dumps(fromkeys)), outcome(lambda: copy.copy(fromkeys))]
r['the_class_attribute_still_binds'] = [dict.fromkeys([8]), {}.fromkeys([9]), Sub.fromkeys([0]).__class__.__name__]

EXPECTED = {
    'its_type_is_classmethod_descriptor': ['classmethod_descriptor', True, True, True, True, True],
    'its_repr_and_names': [
        "<method 'fromkeys' of 'dict' objects>", "<method 'from_bytes' of 'int' objects>",
        'fromkeys', 'dict.fromkeys', True, 'int.from_bytes'],
    'it_binds_to_its_type_or_a_subtype': [{1: None}, {2: None}, 'Sub', 'Sub'],
    'it_refuses_to_bind_anything_else': [
        'TypeError: __get__(None, None) is invalid',
        "TypeError: descriptor 'fromkeys' requires a subtype of 'dict' but received 'int'",
        "TypeError: descriptor 'fromkeys' for type 'dict' needs a type, not a 'int' as arg 2",
        "TypeError: descriptor 'fromkeys' requires a subtype of 'dict' but received 'int'"],
    'it_is_called_with_the_class_first': [{5: None}, 'Sub', {7: 0}, 256, 1],
    'its_call_refuses_as_cpythons': [
        "TypeError: descriptor 'fromkeys' of 'dict' object needs an argument",
        "TypeError: descriptor 'fromkeys' requires a subtype of 'dict' but received 'int'",
        "TypeError: descriptor 'fromkeys' for type 'dict' needs a type, not a 'int' as arg 2"],
    'it_is_neither_pickled_nor_copied': ["TypeError: cannot pickle 'classmethod_descriptor' object"] * 2,
    'the_class_attribute_still_binds': [{8: None}, {9: None}, 'Sub'],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-38s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
