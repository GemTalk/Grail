"""Fixture: a class attribute is found in C3 order through a mixin.

``class Both(Mixin, Base)`` puts Mixin ahead of Base in its __mro__, so a
class attribute both bind reads as Mixin's.  Grail stores a class on ONE
Smalltalk chain -- here Base's, the deeper -- and copied a secondary base's
class attributes only where that chain bound none, so it answered Base's.
That is how every test_email test built on
``class TestGenerator(TestGeneratorBase, TestEmailBase)'' ran under the
compat32 policy instead of the mixin's policy.default.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""


class Root:
    pass


class Base(Root):
    policy = 'base'
    shared = 'base'


class Deeper(Base):
    pass


class Mixin:
    policy = 'mixin'


class Both(Mixin, Deeper):
    pass


class Sub(Both):
    pass


class Own(Mixin, Deeper):
    policy = 'own'


class Ancestor:
    value = 'ancestor'


class SideMixin(Ancestor):
    pass


class Overrider(Ancestor):
    value = 'overrider'


class Middle(Overrider):
    pass


class Shared(SideMixin, Middle):
    pass


r = {
    'mixin_first': [Both.policy, Both().policy, Both.shared],
    'inherited_by_a_subclass': [Sub.policy, Sub().policy],
    'own_binding_wins': [Own.policy, Own().policy],
    'shared_ancestor_after_the_primary_chain': [Shared.value, [c.__name__ for c in Shared.__mro__]],
    'not_listed_as_own': ['policy' in Both.__dict__, 'policy' in Own.__dict__],
}

EXPECTED = {
    'mixin_first': ['mixin', 'mixin', 'base'],
    'inherited_by_a_subclass': ['mixin', 'mixin'],
    'own_binding_wins': ['own', 'own'],
    'shared_ancestor_after_the_primary_chain': [
        'overrider', ['Shared', 'SideMixin', 'Middle', 'Overrider', 'Ancestor', 'object']],
    'not_listed_as_own': [False, True],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-32s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
