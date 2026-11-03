"""Fixture: an object whose class grants no __weakref__ slot refuses a weak reference.

A class with __slots__ that do not name '__weakref__', over bases that grant
none either, has instances CPython will not weakly reference: "cannot create
weak reference to 'NoWeak' object" (Objects/weakrefobject.c,
get_or_create_weakref).  A class without __slots__, or one whose slots or
whose base's slots name it, grants one.

Grail took the reference (test_descr test_weakrefs, test_dataclasses
test_slots_no_weakref).

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import weakref
from collections.abc import Callable
from dataclasses import dataclass

r = {}


class NoWeak:
    __slots__ = ['foo']


class Weak:
    __slots__ = ['foo', '__weakref__']


class Plain:
    pass


class Unslotted(NoWeak):
    pass


class SlottedOverNoWeak(NoWeak):
    __slots__ = ('bar',)


class SlottedOverWeak(Weak):
    __slots__ = ('bar',)


@dataclass(slots=True)
class DataNoWeak:
    a: int = 0


@dataclass(slots=True, weakref_slot=True)
class DataWeak:
    a: int = 0


def referenced(cls):
    obj = cls()
    try:
        return weakref.ref(obj)() is obj
    except TypeError as e:
        return str(e)


r['refused'] = [referenced(cls) for cls in (NoWeak, SlottedOverNoWeak, DataNoWeak)]
r['granted'] = [referenced(cls) for cls in (Weak, Plain, Unslotted, SlottedOverWeak, DataWeak)]
alias = Callable[[int], str]
r['a_slotted_class_over_a_referenceable_builtin'] = weakref.ref(alias)() == alias
try:
    weakref.ref(NoWeak(), lambda ref: None)
    r['refused_with_a_callback'] = 'referenced'
except TypeError as e:
    r['refused_with_a_callback'] = str(e)
try:
    weakref.WeakSet().add(NoWeak())
    r['a_weak_set_refuses_it'] = 'added'
except TypeError as e:
    r['a_weak_set_refuses_it'] = str(e)
try:
    weakref.WeakValueDictionary()['k'] = NoWeak()
    r['a_weak_value_dict_refuses_it'] = 'stored'
except TypeError as e:
    r['a_weak_value_dict_refuses_it'] = str(e)

EXPECTED = {
    'refused': ["cannot create weak reference to '%s' object" % name
                for name in ('NoWeak', 'SlottedOverNoWeak', 'DataNoWeak')],
    'granted': [True] * 5,
    'a_slotted_class_over_a_referenceable_builtin': True,
    'refused_with_a_callback': "cannot create weak reference to 'NoWeak' object",
    'a_weak_set_refuses_it': "cannot create weak reference to 'NoWeak' object",
    'a_weak_value_dict_refuses_it': "cannot create weak reference to 'NoWeak' object",
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-30s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
