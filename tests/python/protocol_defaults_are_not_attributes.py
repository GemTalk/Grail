"""Fixture: what Grail adds only to answer or refuse a protocol is no attribute.

Grail gives the universal roots and some built-ins methods CPython's types do
not have.  ``Object class >> __class_getitem__:`` answers the class itself, so
``MultiDict[K, V]`` and dataclass field annotations subscript; ``int``'s
``__iter__`` and ``__getitem__`` exist only to raise CPython's TypeError for
``iter(1)`` and ``1[0]``.  Read as attributes they made
``hasattr(T, '__class_getitem__')`` True for every class and
``hasattr(int, '__iter__')`` True for int -- though not for ``1`` -- and
duck-typed code branches on exactly those questions.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import dataclasses
import functools
import os
import types

r = {}


def outcome(thunk):
    try:
        return thunk()
    except Exception as e:
        return '%s: %s' % (type(e).__name__, e)


class T:
    pass


class Own:
    def __class_getitem__(cls, item):
        return ('own', item)


class Assigned:
    __class_getitem__ = classmethod(types.GenericAlias)


class Heir(Own):
    pass


class Fallback:
    def __getattr__(self, name):
        return 'from __getattr__: ' + name


class D(dict):
    pass


@dataclasses.dataclass
class Fields:
    items: list[int]


NAME = '__class_getitem__'

# --- the root default is not an attribute ------------------------------------
r['absent'] = [hasattr(owner, NAME) for owner in (T, T(), int, 1, object, object(), str, 'a', type, Fallback)]
r['absent_message'] = [outcome(lambda: T.__class_getitem__), outcome(lambda: T().__class_getitem__)]
r['not_in_dir'] = NAME in dir(T)
r['getattr_fallback'] = outcome(lambda: Fallback().__class_getitem__)

# --- a real one still is -----------------------------------------------------
r['present'] = [hasattr(owner, NAME) for owner in (list, [], dict, tuple, Own, Own(), Assigned, Heir, D)]
r['own_called'] = outcome(lambda: Own.__class_getitem__(int))
r['subscripts'] = [repr(list[int]), repr(D[int]), Own[int], Heir[str], repr(Assigned[int])]
# --- read off the class, a type's own hook is the one the subscript runs ----
r['read_hooks'] = [repr(t.__class_getitem__(int)) for t in (list, dict, tuple, set, frozenset, enumerate,
                                                            memoryview, os.PathLike, functools.partial)]
r['instance_read'] = [repr([].__class_getitem__(str)), outcome(lambda: Own().__class_getitem__(int))]
r['dataclass_field'] = outcome(lambda: repr(Fields([1]).items))
r['refused'] = [outcome(lambda: T[int]), outcome(lambda: int[0])]

# --- int's refusals are not attributes either --------------------------------
r['int_protocol'] = [hasattr(int, '__iter__'), hasattr(int, '__getitem__'), hasattr(1, '__iter__'),
                     hasattr(object, '__iter__')]
r['int_iter_message'] = outcome(lambda: int.__iter__)
one = 1
r['still_refused'] = [outcome(lambda: iter(one)), outcome(lambda: one[0])]
r['real_ones_stay'] = [hasattr(int, '__add__'), hasattr(list, '__iter__'), hasattr(str, '__getitem__'),
                       outcome(lambda: list(list.__iter__([1, 2])))]

EXPECTED = {
    'absent': 10 * [False],
    'absent_message': ["AttributeError: type object 'T' has no attribute '__class_getitem__'",
                       "AttributeError: 'T' object has no attribute '__class_getitem__'"],
    'not_in_dir': False,
    'getattr_fallback': 'from __getattr__: __class_getitem__',
    'present': 9 * [True],
    'own_called': ('own', int),
    'subscripts': ['list[int]', __name__ + '.D[int]', ('own', int), ('own', str), __name__ + '.Assigned[int]'],
    'read_hooks': ['list[int]', 'dict[int]', 'tuple[int]', 'set[int]', 'frozenset[int]', 'enumerate[int]',
                   'memoryview[int]', 'os.PathLike[int]', 'functools.partial[int]'],
    'instance_read': ['list[str]', ('own', int)],
    'dataclass_field': '[1]',
    'refused': ["TypeError: type 'T' is not subscriptable", "TypeError: type 'int' is not subscriptable"],
    'int_protocol': [False, False, False, False],
    'int_iter_message': "AttributeError: type object 'int' has no attribute '__iter__'",
    'still_refused': ["TypeError: 'int' object is not iterable", "TypeError: 'int' object is not subscriptable"],
    'real_ones_stay': [True, True, True, [1, 2]],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-32s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
