"""A class attribute set on a SECONDARY base, read through a subclass.

A multiple-inheritance class inherits only its primary base through
Smalltalk; the other bases' methods and declared attributes are copied onto it
when it is made.  An attribute set later with setattr -- or set before the
subclass existed, by a decorator such as test_email's @parameterize -- was
neither copied nor found.  CPython reads every class on the MRO.

Every EXPECTED value was produced by running this file under CPython 3.14.
"""


def _add_generated(cls):
    setattr(cls, 'test_generated', lambda self: ('generated', type(self).__name__))
    return cls


@_add_generated
class Mixin:
    def helper(self):
        return 'helper'


class Primary:
    def primary_method(self):
        return 'primary'

    def shadowed(self):
        return 'primary method'


class Deep(Primary):
    pass


class Sub(Mixin, Deep):
    pass


Mixin.added_later = 'later'
Mixin.shadowed = lambda self: 'mixin attribute'


class Own(Mixin, Deep):
    def test_generated(self):
        return 'own method'


# A CLASS-BODY attribute on a base written left of the primary chain beats the
# chain's own: test_email's ``class TestGenerator(TestGeneratorBase,
# TestEmailBase)'' read ``policy'' from TestEmailBase (compat32) instead of
# TestGeneratorBase (policy.default).  A nearer class on the MRO still wins.
class LeftMixin:
    policy = 'left'
    left_only = 'left only'


class PrimaryWithPolicy(Primary):
    policy = 'primary'


class LeftFirst(LeftMixin, PrimaryWithPolicy):
    pass


class OwnPolicy(LeftMixin, PrimaryWithPolicy):
    policy = 'own'


class InheritsLeftFirst(LeftFirst):
    pass


RESULTS = {}
EXPECTED = {
    'set_before_the_subclass_is_seen_on_the_class': True,
    'set_before_the_subclass_binds_the_instance': ('generated', 'Sub'),
    'set_after_the_subclass_is_seen': 'later',
    'an_earlier_base_attribute_beats_a_later_method': 'mixin attribute',
    'the_subclass_own_method_still_wins': 'own method',
    'the_primary_chain_still_works': 'primary',
    'the_mixin_method_still_works': 'helper',
    'a_left_base_class_attribute_beats_the_primary_chain': 'left',
    'a_left_base_class_attribute_beats_it_through_an_instance': 'left',
    'a_left_base_class_attribute_reaches_a_further_subclass': 'left',
    'the_class_own_attribute_still_wins': 'own',
    'a_left_base_only_attribute_is_still_found': 'left only',
}
_GOT = {
    'set_before_the_subclass_is_seen_on_the_class': lambda: hasattr(Sub, 'test_generated'),
    'set_before_the_subclass_binds_the_instance': lambda: Sub().test_generated(),
    'set_after_the_subclass_is_seen': lambda: Sub().added_later,
    'an_earlier_base_attribute_beats_a_later_method': lambda: Sub().shadowed(),
    'the_subclass_own_method_still_wins': lambda: Own().test_generated(),
    'the_primary_chain_still_works': lambda: Sub().primary_method(),
    'the_mixin_method_still_works': lambda: Sub().helper(),
    'a_left_base_class_attribute_beats_the_primary_chain': lambda: LeftFirst.policy,
    'a_left_base_class_attribute_beats_it_through_an_instance': lambda: LeftFirst().policy,
    'a_left_base_class_attribute_reaches_a_further_subclass': lambda: InheritsLeftFirst.policy,
    'the_class_own_attribute_still_wins': lambda: OwnPolicy.policy,
    'a_left_base_only_attribute_is_still_found': lambda: LeftFirst.left_only,
}
for _name, _fn in _GOT.items():
    try:
        _v = _fn()
    except BaseException as _exc:
        _v = ('raised', type(_exc).__name__, str(_exc))
    RESULTS[_name] = (_v == EXPECTED[_name]) or 'got: %r' % (_v,)


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
