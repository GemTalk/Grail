"""Fixture: a namedtuple names the module it is made in, as CPython's does.

CPython's namedtuple sets __module__ to its caller's module --
sys._getframemodulename(1), else the caller frame's f_globals['__name__'] --
unless ``module='' says otherwise (Lib/collections/__init__.py:518-531), and
test_collections's test_factory checks it.  Grail's left it None for every
namedtuple, its comment holding that Grail could not read a caller's frame,
which it can.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import collections
import pickle
import typing

r = {}

Point = collections.namedtuple('Point', 'x y')


def made_in_a_function():
    return collections.namedtuple('Local', 'a').__module__


class Employee(typing.NamedTuple):
    name: str


r['made_at_module_level'] = Point.__module__ == __name__
r['made_in_a_function'] = made_in_a_function() == __name__
r['an_explicit_module_wins'] = collections.namedtuple('Elsewhere', 'a', module='somewhere').__module__
r['typing_named_tuple_too'] = Employee.__module__ == __name__
copy = pickle.loads(pickle.dumps(Point(1, 2)))
r['it_pickles_by_its_module'] = [copy, type(copy) is Point]

EXPECTED = {
    'made_at_module_level': True,
    'made_in_a_function': True,
    'an_explicit_module_wins': 'somewhere',
    'typing_named_tuple_too': True,
    'it_pickles_by_its_module': [Point(1, 2), True],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-28s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
