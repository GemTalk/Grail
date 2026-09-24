"""A class attribute shadows an inherited method or property, as CPython's lookup does.

CPython's attribute lookup scans the MRO once and stops at the FIRST class
holding the name, so a class attribute in a subclass shadows an inherited
method or @property entirely:

    class Base:
        @property
        def kind(self): raise NotImplementedError
    class Sub(Base):
        kind = 'concrete'          # Sub().kind is 'concrete'

Grail compiles a class attribute to a CLASS-side accessor pair and a @property
to an INSTANCE-side method, so the two lived in different places: the instance
read found the inherited property and raised, while ``Sub.kind'' answered the
attribute.  The two disagreed about the same name.

CPython's own ipaddress is built this way -- IPv4Network declares
``_address_class = IPv4Address'' where _BaseNetwork exposes ``_address_class''
as a property -- which is how this was found.

The checks below pin the whole precedence, not only the shadowing: the base
class is unaffected, a subclass of the shadowing class inherits it, a later
rebinding is seen, and an INSTANCE attribute still wins over the class one
(with the property shadowed there is no data descriptor left to outrank it).

Every expectation here was measured against CPython 3.14.
"""

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:160])


def _raised(fn):
    try:
        return fn()
    except NotImplementedError as exc:
        return ('NotImplementedError', str(exc))


class Base:
    @property
    def kind(self):
        raise NotImplementedError('abstract')

    def method(self):
        return 'inherited method'


class Mixin:
    def from_the_mixin(self):
        return 'mixin'


class Sub(Base):
    kind = 'concrete'
    method = 'not a method'


class SubMulti(Mixin, Base):
    kind = 'multi'


class SubSub(Sub):
    pass


class Rebound(Base):
    kind = 'first'


# ----------------------------------------------------------- the shadowing

check('a_class_attribute_shadows_an_inherited_property',
      Sub().kind, 'concrete')
check('a_class_attribute_shadows_an_inherited_method',
      Sub().method, 'not a method')
check('it_shadows_through_a_secondary_base_too',
      (SubMulti().kind, SubMulti().from_the_mixin()), ('multi', 'mixin'))
check('a_subclass_of_the_shadowing_class_inherits_it',
      SubSub().kind, 'concrete')

# ----------------------------------------------------------- what is unchanged

check('the_base_class_still_answers_its_property',
      _raised(lambda: Base().kind), ('NotImplementedError', 'abstract'))
check('the_inherited_method_still_works_where_not_shadowed',
      Base().method(), 'inherited method')
check('the_class_level_read_is_unchanged', (Sub.kind, Sub.method),
      ('concrete', 'not a method'))

# ----------------------------------------------------------- precedence

check('rebinding_the_class_attribute_is_seen_by_instances',
      (lambda: [setattr(Rebound, 'kind', 'rebound'), Rebound().kind][1])(),
      'rebound')
check('an_instance_attribute_still_wins_over_the_class_one',
      (lambda obj: [setattr(obj, 'kind', 'per-instance'), obj.kind][1])(Sub()),
      'per-instance')
check('one_instance_attribute_does_not_leak_to_another',
      Sub().kind, 'concrete')


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
