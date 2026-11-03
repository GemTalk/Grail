"""Fixture: a union keeps which members did not hash, and == errors propagate.

CPython builds a union as Objects/unionobject.c's unionbuilder does: a
member that hashes is kept once by hash and ==, one that does not is kept
once by == alone, and the union remembers the second kind.  So hashing it
raises that member's error -- or, once the member has become hashable,
"union contains 2 unhashable elements" -- and == compares the hashable
members as sets and the unhashable ones each way, with every error from
== propagating (test_types test_unhashable_becomes_hashable,
test_or_type_operator_with_genericalias).

Grail compared every member by == and swallowed its errors, so
``bt | bt2'' and ``(int | bt) == (int | bt2)'' over a metaclass whose
__eq__ raises answered quietly, and the hash was computed afresh.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import typing

r = {}

hashable_now = [False]


class SometimesHashable(type):
    def __hash__(cls):
        if hashable_now[0]:
            return 1
        raise TypeError('not hashable')


class A(metaclass=SometimesHashable):
    pass


class B(metaclass=SometimesHashable):
    pass


class RaisingEquality(type):
    def __eq__(cls, other):
        return 1 / 0


bt = RaisingEquality('bt', (), {})
bt2 = RaisingEquality('bt2', (), {})


def outcome(call):
    try:
        return call()
    except (TypeError, ZeroDivisionError) as e:
        return '%s: %s' % (type(e).__name__, e)


unhashable_union = A | B
r['an_unhashable_member_makes_the_union_unhashable'] = [
    unhashable_union.__args__ == (A, B), outcome(lambda: hash(unhashable_union))]
hashable_now[0] = True
r['it_stays_unhashable_once_the_member_hashes'] = outcome(lambda: hash(unhashable_union))
r['an_unhashable_member_is_kept_without_comparing_it_to_hashable_ones'] = [
    repr(int | bt), (int | bt).__args__ == (int, bt)]
r['equality_errors_propagate'] = [
    outcome(lambda: (int | bt) == (int | bt2)), outcome(lambda: bt | bt2)]
r['the_same_unhashable_member_is_equal_by_identity'] = (int | bt) == (int | bt)
r['hashable_members_compare_as_sets'] = [
    (int | str) == (str | int), hash(int | str) == hash(str | int), (int | str) == (int | bytes),
    typing.Union[int, str] == (int | str)]
r['repeats_are_dropped'] = [int | int is int, (int | str | int).__args__ == (int, str)]

EXPECTED = {
    'an_unhashable_member_makes_the_union_unhashable': [True, 'TypeError: not hashable'],
    'it_stays_unhashable_once_the_member_hashes': 'TypeError: union contains 2 unhashable elements',
    'an_unhashable_member_is_kept_without_comparing_it_to_hashable_ones': ['int | __main__.bt', True],
    'equality_errors_propagate': ['ZeroDivisionError: division by zero', 'ZeroDivisionError: division by zero'],
    'the_same_unhashable_member_is_equal_by_identity': True,
    'hashable_members_compare_as_sets': [True, True, False, True],
    'repeats_are_dropped': [True, True],
}
if __name__ != '__main__':
    EXPECTED['an_unhashable_member_is_kept_without_comparing_it_to_hashable_ones'] = [
        'int | %s.bt' % __name__, True]

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-68s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
