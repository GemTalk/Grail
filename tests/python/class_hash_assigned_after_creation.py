"""Fixture: a __hash__ assigned on a class after it was created is its hash.

CPython keeps a class's hash in its tp_hash slot, and assigning __hash__ on
the class re-derives the slot (Objects/typeobject.c:6231, type_setattro's
update_slot): a function makes the class hash by calling it, and None makes
it unhashable, the slot set to PyObject_HashNotImplemented
(Objects/typeobject.c:11392-11398).  Assigning undoes whatever the class body
decided, including the unhashability CPython gives a class that defines
__eq__ without __hash__.

Grail gave such a class a raising __hash__ method when its body was compiled,
and an assignment never reached it: the class stayed unhashable.  An assigned
None was CALLED.  dataclasses assigns __hash__ after creating the class, so
@dataclass(unsafe_hash=True) on a class with its own __eq__ stayed
unhashable (test_dataclasses TestHash.test_eq_only).

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import dataclasses

r = {}


def hash_or_error(obj):
    try:
        return hash(obj)
    except TypeError as e:
        return 'TypeError: %s' % e


class AssignedNone:
    pass


AssignedNone.__hash__ = None
r['assigned_none_is_unhashable'] = hash_or_error(AssignedNone())


class BodyNone:
    __hash__ = None


BodyNone.__hash__ = lambda self: 7
r['assigned_over_a_body_none'] = hash_or_error(BodyNone())


class EqOnly:
    def __eq__(self, other):
        return isinstance(other, EqOnly)


EqOnly.__hash__ = lambda self: 8
r['assigned_over_an_implicit_none'] = hash_or_error(EqOnly())
try:
    r['as_a_dict_key'] = {EqOnly(): 'found'}[EqOnly()]
except TypeError as e:
    r['as_a_dict_key'] = 'TypeError: %s' % e


class InheritsTheAssignedHash(EqOnly):
    pass


r['a_subclass_inherits_it'] = hash_or_error(InheritsTheAssignedHash())


class RedefinesEq(EqOnly):
    def __eq__(self, other):
        return False


r['a_subclass_with_its_own_eq_is_unhashable'] = hash_or_error(RedefinesEq())


class Defined:
    def __hash__(self):
        return 1


Defined.__hash__ = None
r['assigned_none_over_a_def'] = hash_or_error(Defined())


class HashedBase:
    def __hash__(self):
        return 301


class InheritsADef(HashedBase):
    pass


InheritsADef.__hash__ = None
r['assigned_none_over_an_inherited_def'] = hash_or_error(InheritsADef())


class Patched:
    def __hash__(self):
        return 1


Patched.__hash__ = lambda self: 2
r['assigned_function_over_a_def'] = hash_or_error(Patched())
Patched.__hash__ = None
r['then_assigned_none'] = hash_or_error(Patched())


class TupleSubclass(tuple):
    pass


TupleSubclass.__hash__ = None
r['assigned_none_on_a_tuple_subclass'] = hash_or_error(TupleSubclass())


class EqOnlyGivenObjectsHash:
    def __eq__(self, other):
        return self is other


EqOnlyGivenObjectsHash.__hash__ = object.__hash__
r['assigned_objects_hash'] = isinstance(hash_or_error(EqOnlyGivenObjectsHash()), int)


@dataclasses.dataclass(unsafe_hash=True)
class UnsafeHashWithItsOwnEq:
    i: int

    def __eq__(self, other):
        return self.i == other.i


r['dataclass_unsafe_hash_over_its_own_eq'] = (
    hash_or_error(UnsafeHashWithItsOwnEq(1)) == hash_or_error(UnsafeHashWithItsOwnEq(1.0)),
    isinstance(hash_or_error(UnsafeHashWithItsOwnEq(1)), int))

EXPECTED = {
    'assigned_none_is_unhashable': "TypeError: unhashable type: 'AssignedNone'",
    'assigned_over_a_body_none': 7,
    'assigned_over_an_implicit_none': 8,
    'as_a_dict_key': 'found',
    'a_subclass_inherits_it': 8,
    'a_subclass_with_its_own_eq_is_unhashable': "TypeError: unhashable type: 'RedefinesEq'",
    'assigned_none_over_a_def': "TypeError: unhashable type: 'Defined'",
    'assigned_none_over_an_inherited_def': "TypeError: unhashable type: 'InheritsADef'",
    'assigned_function_over_a_def': 2,
    'then_assigned_none': "TypeError: unhashable type: 'Patched'",
    'assigned_none_on_a_tuple_subclass': "TypeError: unhashable type: 'TupleSubclass'",
    'assigned_objects_hash': True,
    'dataclass_unsafe_hash_over_its_own_eq': (True, True),
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-42s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
