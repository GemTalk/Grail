"""Fixture: subscripting a built-in generic type answers a types.GenericAlias.

CPython gives enumerate, memoryview, re.Pattern and re.Match, functools'
partialmethod and cached_property, the generator, coroutine and async
generator types, os.DirEntry, weakref.ref, staticmethod, classmethod and
unittest's _AssertRaisesContext a __class_getitem__ that builds a
GenericAlias, and subscripts ``type`` itself without one
(Objects/abstract.c:185) -- which is why a metaclass is not subscriptable.
Grail answered the class unchanged for every one of them, metaclasses
included, and ``enumerate.__module__`` did not exist, so even a real alias
printed as ``<class 'enumerate'>[str]``.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import functools
import os
import re
import types
import unittest.case
import weakref
from types import GenericAlias

r = {}

TYPES = [type, enumerate, memoryview, re.Pattern, re.Match, functools.partialmethod,
         functools.cached_property, types.GeneratorType, types.CoroutineType,
         types.AsyncGeneratorType, os.DirEntry, weakref.ref, staticmethod, classmethod,
         unittest.case._AssertRaisesContext]


def alias_of(t):
    a = t[int]
    return [isinstance(a, GenericAlias), a.__origin__ is t, a.__args__, a.__parameters__]


r['aliases'] = [alias_of(t) for t in TYPES]
r['reprs'] = [repr(type[int]), repr(enumerate[str]), repr(re.Pattern[bytes]),
              repr(type[int | None])]
r['hooks'] = [hasattr(enumerate, '__class_getitem__'), hasattr(enumerate(()), '__class_getitem__'),
              'type' in repr(type.__dict__.get('__class_getitem__'))]


class Meta(type):
    pass


class Hooked(type):
    def __class_getitem__(cls, item):
        return ('hooked', item)


def subscript(t):
    try:
        return t[int]
    except TypeError as e:
        return str(e)


r['metaclasses'] = [subscript(Meta), subscript(Hooked)]

EXPECTED = {
    'aliases': [[True, True, (int,), ()]] * len(TYPES),
    'reprs': ['type[int]', 'enumerate[str]', 're.Pattern[bytes]', 'type[int | None]'],
    'hooks': [True, True, False],
    'metaclasses': ["type 'Meta' is not subscriptable", ('hooked', int)],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        print('%-5s %-12s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
