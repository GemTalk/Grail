"""Fixture: the __hash__ of list, dict, set and the other unhashable built-ins is None.

CPython's unhashable built-in types hold ``__hash__ = None`` in their own
class dicts, which type_ready_set_hash puts there for a type with no tp_hash
(Objects/typeobject.c:8774-8800), so reading
__hash__ off the type, off an instance or off a subclass that defines none
answers None.  dataclasses reads exactly that to refuse a mutable field
default (Lib/dataclasses.py:916).

Grail's class dicts held the None, but a read of the attribute found the
raising method behind it and answered a slot wrapper, so
``x: list = []`` in a dataclass was not refused.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import dataclasses

r = {}

d = {}
UNHASHABLE = [list, dict, set, bytearray, type(d.keys()), type(d.items())]
INSTANCES = [[], {}, set(), bytearray(), d.keys(), d.items()]

r['off_the_type'] = [t.__hash__ is None for t in UNHASHABLE]
r['off_an_instance'] = [x.__hash__ is None for x in INSTANCES]
r['by_getattr'] = getattr(list, '__hash__') is None
r['hashable_ones_keep_theirs'] = [t.__hash__ is None for t in (tuple, frozenset, str, int)]


class Inherits(list):
    pass


class DefinesItsOwn(list):
    def __hash__(self):
        return 5


class AssignedOne(dict):
    pass


AssignedOne.__hash__ = lambda self: 6

r['a_subclass_inherits_it'] = [Inherits.__hash__ is None, Inherits().__hash__ is None]
r['a_subclass_def_wins'] = [DefinesItsOwn.__hash__ is None, hash(DefinesItsOwn())]
r['an_assigned_one_wins'] = [AssignedOne.__hash__ is None, AssignedOne.__hash__(AssignedOne())]

instance = Inherits()
instance.__hash__ = 'an instance attribute'
r['an_instance_attribute_wins'] = instance.__hash__


def mutable_default_refusal(default):
    try:
        @dataclasses.dataclass
        class WithADefault:
            field: object = default
    except ValueError as e:
        return str(e)
    return 'accepted'


r['dataclass_refuses_a_list_default'] = mutable_default_refusal([])
r['dataclass_takes_a_dict_whose_class_has_a_hash'] = mutable_default_refusal(AssignedOne())
r['dataclass_takes_a_tuple_default'] = mutable_default_refusal(())

EXPECTED = {
    'off_the_type': [True] * 6,
    'off_an_instance': [True] * 6,
    'by_getattr': True,
    'hashable_ones_keep_theirs': [False] * 4,
    'a_subclass_inherits_it': [True, True],
    'a_subclass_def_wins': [False, 5],
    'an_assigned_one_wins': [False, 6],
    'an_instance_attribute_wins': 'an instance attribute',
    'dataclass_refuses_a_list_default':
        "mutable default <class 'list'> for field field is not allowed: use default_factory",
    'dataclass_takes_a_dict_whose_class_has_a_hash': 'accepted',
    'dataclass_takes_a_tuple_default': 'accepted',
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-42s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
