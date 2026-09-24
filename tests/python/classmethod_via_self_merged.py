"""A @classmethod called through self, from a class used as a SECONDARY base.

``self.parse(x)'' written inside the class that declares @parse worked when
that class stood alone, was inherited singly, or was the PRIMARY base of a
multiple-inheritance class -- and raised AttributeError when it was a
SECONDARY base.  The identical call written in a SUBCLASS worked, because a
name the body does not declare takes the attribute path instead of the fused
self-send.

Two mechanisms meet here.  Codegen emits ``self parse: x'' for the call (a
@classmethod is a STRUCTURAL decorator, so the name is in classFunctionNames),
and no instance-side method answers it; the doesNotUnderstand hook recovers by
forwarding to the class.  That hook admitted only methods filed under
'Grail-Class Methods', and importlib >> ___mergeSecondaryBases___: copies a
secondary base's class-side methods onto the class under
'Grail-MI-Inherited' -- the same method, a different category.

CPython's own ipaddress reaches _BaseV6's _ip_int_from_string exactly that
way: IPv6Address(_BaseV6, _BaseAddress) makes _BaseV6 the secondary base.

Every expectation here was measured against CPython 3.14.
"""

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:160])


class Standalone:
    @classmethod
    def parse(cls, s):
        return ('parsed', cls.__name__, s)

    @classmethod
    def varargs(cls, *args, **kwargs):
        return ('varargs', cls.__name__, args, kwargs)

    @staticmethod
    def sm(s):
        return ('static', s)

    def use(self):
        return self.parse('own')

    def use_varargs(self):
        return self.varargs(1, k=2)

    def use_static(self):
        return self.sm('s')


class Other:
    __slots__ = ()


class First(Standalone, Other):
    pass


class Second(Other, Standalone):
    pass


class Third(Other, Standalone):
    def use_here(self):
        return self.parse('sub')


# ----------------------------------------------------------- the defect

check('a_classmethod_through_self_from_a_secondary_base',
      Second().use(), ('parsed', 'Second', 'own'))
check('the_class_it_binds_is_the_instances_own',
      (Second().use()[1], First().use()[1]), ('Second', 'First'))
check('a_varargs_classmethod_the_same_way',
      Second().use_varargs(), ('varargs', 'Second', (1,), {'k': 2}))
check('a_staticmethod_the_same_way',
      Second().use_static(), ('static', 's'))

# ----------------------------------------------------------- what already worked

check('the_declaring_class_used_directly',
      Standalone().use(), ('parsed', 'Standalone', 'own'))
check('the_declaring_class_as_the_primary_base',
      First().use(), ('parsed', 'First', 'own'))
check('the_call_written_in_a_subclass',
      Third().use_here(), ('parsed', 'Third', 'sub'))
# The READ is asserted by what calling it does, not by the type's name: Grail
# answers its own BoundMethod where CPython says 'method', which is a separate
# and long-standing difference.
check('the_class_side_call_and_the_read_from_outside',
      (Second.parse('cls'), (Second().parse)('read')),
      (('parsed', 'Second', 'cls'), ('parsed', 'Second', 'read')))


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
