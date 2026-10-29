"""Fixture: a built-in type's methods are the descriptor types CPython's are.

A method of a built-in type read off the type is a METHOD DESCRIPTOR
(``type(str.join)`` is ``method_descriptor``), or for a slot a SLOT WRAPPER
(``type(object.__init__)`` is ``wrapper_descriptor``); bound to an instance a
slot is a METHOD-WRAPPER (``type((42).__lt__)``), and any other native method
is a ``builtin_function_or_method``.  Grail called the unbound ones
``function``, the bound slots ``builtin_function_or_method``, and a method of
its own set type -- which no kernel class backs -- a bound Python ``method``,
so every ``isinstance`` against types.MethodDescriptorType,
WrapperDescriptorType and MethodWrapperType was False (test_types
test_method_descriptor_types, test_slot_wrapper_types,
test_method_wrapper_types).  Reprs follow the same split.

A def in a Python class body is still a function, unbound and bound.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import types


class C:
    def m(self):
        pass


class MySet(set):
    pass


def names(*objects):
    return [type(each).__name__ for each in objects]


r = {}
r['unbound'] = names(str.join, list.append, set.add, object.__init__, object.__str__,
                     int.__lt__, dict.__getitem__, C.m)
r['bound'] = names(''.join, [].append, set().add, MySet().add, (42).__lt__,
                   object().__init__, {}.__getitem__, C().m)
r['isinstance'] = [
    isinstance(str.join, types.MethodDescriptorType),
    isinstance(list.append, types.MethodDescriptorType),
    isinstance(object.__init__, types.WrapperDescriptorType),
    isinstance(int.__lt__, types.WrapperDescriptorType),
    isinstance(object().__init__, types.MethodWrapperType),
    isinstance((42).__lt__, types.MethodWrapperType),
    isinstance(''.join, types.BuiltinMethodType),
    isinstance(int.__new__, types.BuiltinMethodType),
    isinstance(C.m, types.MethodDescriptorType),
    isinstance(str.join, types.FunctionType),
]
r['type_names'] = [types.MethodDescriptorType.__name__, types.WrapperDescriptorType.__name__,
                   types.MethodWrapperType.__name__, types.ClassMethodDescriptorType.__name__,
                   types.MethodWrapperType.__module__]
r['reprs'] = [repr(set.add), repr(object.__repr__), repr(list.__init__), repr(str.upper),
              repr((1).__lt__).split(' at ')[0], repr(set().add).split(' at ')[0],
              repr([].append).split(' at ')[0]]
try:
    str.upper.nope
except AttributeError as exc:
    r['attribute_error'] = str(exc)

EXPECTED = {
    'unbound': ['method_descriptor', 'method_descriptor', 'method_descriptor',
                'wrapper_descriptor', 'wrapper_descriptor', 'wrapper_descriptor',
                'method_descriptor', 'function'],
    'bound': ['builtin_function_or_method', 'builtin_function_or_method',
              'builtin_function_or_method', 'builtin_function_or_method',
              'method-wrapper', 'method-wrapper', 'builtin_function_or_method', 'method'],
    'isinstance': [True, True, True, True, True, True, True, True, False, False],
    'type_names': ['method_descriptor', 'wrapper_descriptor', 'method-wrapper',
                   'classmethod_descriptor', 'builtins'],
    'reprs': ["<method 'add' of 'set' objects>", "<slot wrapper '__repr__' of 'object' objects>",
              "<slot wrapper '__init__' of 'list' objects>", "<method 'upper' of 'str' objects>",
              "<method-wrapper '__lt__' of int object", '<built-in method add of set object',
              '<built-in method append of list object'],
    'attribute_error': "'method_descriptor' object has no attribute 'nope'",
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        print('%-16s %-5s -> %r' % (key, 'OK' if actual == EXPECTED[key] else 'FAIL', actual))
    print(SUMMARY)
