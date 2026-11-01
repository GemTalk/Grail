"""Fixture: ctypes' generic types subscript to a types.GenericAlias.

CPython makes three ctypes types generic: Array (Modules/_ctypes/_ctypes.c,
``__class_getitem__`` is Py_GenericAlias -- "Arrays are generic over the type
of their elements"), and LibraryLoader and py_object
(Lib/ctypes/__init__.py, ``classmethod(_types.GenericAlias)``).  An array
type such as ``c_int * 3`` inherits Array's.

Grail's ctypes is its own Python module and gave none of them a
``__class_getitem__``, so ``ctypes.Array[int]`` and
``ctypes.LibraryLoader[int]`` raised ``type 'Array' is not subscriptable``
(test_genericalias test_subscriptable, test_weakref), and ``py_object[int]``
answered the class itself.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import ctypes
import types
import weakref

r = {}


def outcome(thunk):
    try:
        return thunk()
    except Exception as e:
        return '%s: %s' % (type(e).__name__, e)


def alias_parts(origin):
    alias = origin[int]
    return [isinstance(alias, types.GenericAlias), alias.__origin__ is origin,
            alias.__args__, alias.__parameters__]


IntArray3 = ctypes.c_int * 3

r['array'] = outcome(lambda: alias_parts(ctypes.Array))
r['library_loader'] = outcome(lambda: alias_parts(ctypes.LibraryLoader))
r['py_object'] = outcome(lambda: alias_parts(ctypes.py_object))
r['array_type_inherits_it'] = outcome(lambda: alias_parts(IntArray3))
r['weak_reference_to_alias'] = outcome(lambda: (lambda alias: weakref.ref(alias)() == alias)(ctypes.Array[int]))
r['two_arguments'] = outcome(lambda: ctypes.Array[int, str].__args__)
r['structure_is_not_generic'] = outcome(lambda: outcome(lambda: ctypes.Structure[int]).startswith('TypeError: '))

# --- unchanged: the types still work as data ---------------------------------
r['array_values'] = outcome(lambda: list(IntArray3(1, 2, 3)))
r['py_object_value'] = outcome(lambda: ctypes.py_object([1]).value)
r['loader_attribute'] = outcome(lambda: type(ctypes.cdll).__name__)


EXPECTED = {
    'array': [True, True, (int,), ()],
    'library_loader': [True, True, (int,), ()],
    'py_object': [True, True, (int,), ()],
    'array_type_inherits_it': [True, True, (int,), ()],
    'weak_reference_to_alias': True,
    'two_arguments': (int, str),
    'structure_is_not_generic': True,
    'array_values': [1, 2, 3],
    'py_object_value': [1],
    'loader_attribute': 'LibraryLoader',
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-28s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
