"""Fixture: a namedtuple subclass that declares more _fields is built from the base's.

CPython generates a namedtuple's __new__, _make, _replace and __repr__ from
the field names the factory was called with (Lib/collections/__init__.py,
namedtuple), so a subclass that sets _fields to a longer tuple is still
constructed, made, replaced and shown with the base's fields.  _asdict alone
reads self._fields, zipping it with the values as iterating gives them.
platform's uname_result is built that way: it adds 'processor' to _fields
and an __iter__ that yields it.

Grail's methods read cls._fields, so uname_result_base() asked for a
'processor' argument nobody passes and CPython's platform.uname() raised.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import itertools
from collections import namedtuple

r = {}

Base = namedtuple('Base', 'a b', defaults=[9])


class MoreFields(Base):
    _fields = ('a', 'b', 'c')


class OtherDefaults(Base):
    _field_defaults = {}


class YieldsAThird(Base):
    _fields = ('a', 'b', 'c')

    def __iter__(self):
        return itertools.chain(super().__iter__(), (7,))


def outcome(call):
    try:
        return call()
    except (TypeError, IndexError) as e:
        return type(e).__name__


r['it_is_constructed_from_the_bases_fields'] = outcome(lambda: [
    repr(MoreFields(1, 2)), repr(MoreFields(1)), repr(MoreFields(a=1, b=2)),
    outcome(lambda: MoreFields(1, 2, 3)), outcome(lambda: MoreFields(1, c=3))])
r['its_defaults_are_the_factorys'] = outcome(lambda: repr(OtherDefaults(1)))
r['make_and_replace_use_the_bases_fields'] = outcome(lambda: [
    repr(MoreFields._make([1, 2])), outcome(lambda: MoreFields._make([1, 2, 3])),
    repr(MoreFields(1, 2)._replace(b=5)), outcome(lambda: MoreFields(1, 2)._replace(c=5))])
r['its_own_fields_are_still_its_own'] = outcome(lambda: [MoreFields._fields, len(MoreFields(1, 2))])
r['asdict_zips_the_class_fields_with_the_values'] = outcome(lambda: [
    MoreFields(1, 2)._asdict(), YieldsAThird(1, 2)._asdict()])
r['a_plain_namedtuple_is_unchanged'] = outcome(lambda: [
    repr(Base(1, 2)), Base(1)._asdict(), repr(Base._make([3, 4])), repr(Base(1, 2)._replace(a=0))])

EXPECTED = {
    'it_is_constructed_from_the_bases_fields': [
        'MoreFields(a=1, b=2)', 'MoreFields(a=1, b=9)', 'MoreFields(a=1, b=2)', 'TypeError', 'TypeError'],
    'its_defaults_are_the_factorys': 'OtherDefaults(a=1, b=9)',
    'make_and_replace_use_the_bases_fields': [
        'MoreFields(a=1, b=2)', 'TypeError', 'MoreFields(a=1, b=5)', 'TypeError'],
    'its_own_fields_are_still_its_own': [('a', 'b', 'c'), 2],
    'asdict_zips_the_class_fields_with_the_values': [{'a': 1, 'b': 2}, {'a': 1, 'b': 2, 'c': 7}],
    'a_plain_namedtuple_is_unchanged': ['Base(a=1, b=2)', {'a': 1, 'b': 9}, 'Base(a=3, b=4)', 'Base(a=0, b=2)'],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-46s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
