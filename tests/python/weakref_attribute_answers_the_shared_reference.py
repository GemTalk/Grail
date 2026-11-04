"""Fixture: ``x.__weakref__'' answers the weak reference ``weakref.ref(x)'' shares.

CPython keeps one callback-less ``weakref.ref'' per object, the "basic ref",
at the head of the object's list of weak references; ``weakref.ref(x)'' with
no callback answers it again while it lives (Objects/weakrefobject.c:330-354,
try_reuse_basic_ref) and inserts a new one at the head (:376-399,
insert_weakref).  ``x.__weakref__'' reads that head, None when the list is
empty (Objects/typeobject.c:3818-3840, subtype_getweakref).  Grail answered
None for every instance, through the attribute and the slot's descriptor
alike, and a fresh reference for every call, so test_dataclasses' four
weakref-slot tests failed ``assertIs(a.__weakref__, a_ref)''.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import dataclasses
import gc
import weakref

r = {}


class Plain:
    pass


class Slotted:
    __slots__ = ('value', '__weakref__')


class Reference(weakref.ref):
    pass


def callback(reference):
    pass


@dataclasses.dataclass(slots=True, weakref_slot=True)
class Point:
    x: int


plain = Plain()
r['an_object_no_reference_points_at_answers_none'] = plain.__weakref__ is None
shared = weakref.ref(plain)
r['the_reference_is_shared'] = weakref.ref(plain) is shared
r['a_none_callback_is_no_callback'] = weakref.ref(plain, None) is shared
r['the_attribute_answers_it'] = plain.__weakref__ is shared

slotted = Slotted()
slotted_reference = weakref.ref(slotted)
r['so_does_a_slot'] = slotted.__weakref__ is slotted_reference
r['so_does_the_slot_descriptor'] = Slotted.__dict__['__weakref__'].__get__(slotted) is slotted_reference

point = Point(1)
point_reference = weakref.ref(point)
r['so_does_a_dataclass_weakref_slot'] = point.__weakref__ is point_reference

watched = Plain()
with_callback = weakref.ref(watched, callback)
r['a_callback_makes_its_own'] = [weakref.ref(watched, callback) is with_callback,
                                 weakref.ref(watched) is with_callback]
later = weakref.ref(watched)
r['one_made_after_a_callback_one_still_comes_first'] = watched.__weakref__ is later

subclassed = Plain()
r['a_subclass_is_never_shared'] = [Reference(subclassed) is Reference(subclassed),
                                   isinstance(weakref.ref(subclassed), Reference)]

referents = [Plain() for _ in range(200)]
references = [weakref.ref(each) for each in referents]
del referents
gc.collect()
r['sharing_keeps_no_referent_alive'] = sum(1 for each in references if each() is not None)

EXPECTED = {
    'an_object_no_reference_points_at_answers_none': True,
    'the_reference_is_shared': True,
    'a_none_callback_is_no_callback': True,
    'the_attribute_answers_it': True,
    'so_does_a_slot': True,
    'so_does_the_slot_descriptor': True,
    'so_does_a_dataclass_weakref_slot': True,
    'a_callback_makes_its_own': [False, False],
    'one_made_after_a_callback_one_still_comes_first': True,
    'a_subclass_is_never_shared': [False, False],
    'sharing_keeps_no_referent_alive': 0,
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-48s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
