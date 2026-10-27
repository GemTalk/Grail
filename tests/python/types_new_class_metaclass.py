"""Fixture: types.new_class builds the class by calling its metaclass.

CPython's types.new_class (Lib/types.py) resolves the bases, lets
prepare_class choose the most derived metaclass and its namespace, runs
exec_body, and then CALLS that metaclass with the class keywords, as a class
statement does.  Grail built the class with type() instead, so an explicit or
derived metaclass was lost, its __new__ and __init__ never ran, and a class
built that way could not make a later prepare_class find it.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import types

r = {}
log = []


class Meta(type):
    def __new__(mcls, name, bases, ns, **kwds):
        log.append(('new', name, sorted(kwds)))
        return super().__new__(mcls, name, bases, ns)

    def __init__(cls, name, bases, ns, **kwds):
        log.append(('init', name))
        super().__init__(name, bases, ns)


class Sub(Meta):
    pass


C = types.new_class('C', (), {'metaclass': Meta, 'flag': 1}, lambda ns: ns.update(x=3))
r['explicit_metaclass'] = (type(C).__name__, C.x, log[:])
log.clear()
D = types.new_class('D', (C,))
r['derived_from_the_bases'] = (type(D).__name__, log[:])
log.clear()
E = types.new_class('E', (C,), {'metaclass': Sub})
r['more_derived_wins'] = type(E).__name__
r['prepare_class_sees_it'] = types.prepare_class('F', (object, C), {'metaclass': type})[0].__name__


class Base:
    def __init_subclass__(cls, **kwds):
        cls.seen = kwds


G = types.new_class('G', (Base,), {'tag': 'x'})
r['keywords_reach_init_subclass'] = G.seen


class Alias:
    def __mro_entries__(self, bases):
        return (Base,)


H = types.new_class('H', (Alias(),))
r['orig_bases'] = (H.__bases__ == (Base,), type(H.__orig_bases__[0]).__name__)

EXPECTED = {
    'explicit_metaclass': ('Meta', 3, [('new', 'C', ['flag']), ('init', 'C')]),
    'derived_from_the_bases': ('Meta', [('new', 'D', []), ('init', 'D')]),
    'more_derived_wins': 'Sub',
    'prepare_class_sees_it': 'Meta',
    'keywords_reach_init_subclass': {'tag': 'x'},
    'orig_bases': (True, 'Alias'),
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        print('%-5s %-28s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL',
                                    key, actual))
    print(SUMMARY)
