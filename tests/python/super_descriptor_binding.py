"""Fixture: an unbound super object binds to the instance it is read through.

A super object is a descriptor (Objects/typeobject.c:12033-12064
super_descr_get).  ``C._C__super = super(C)`` stores an UNBOUND super on the
class, and a method's ``self.__super`` reads it through an instance, which
binds it: it becomes super(C, self), and continues along self's own MRO.  An
already bound super, or one read with no instance, answers itself, and an
instance of a super subclass is rebuilt by calling its type.  Grail's super had
no __get__, so the unbound proxy came back unbound and searched from C's own
parents (test_descr test_supers).  Every check here holds under CPython 3.14,
which is what makes it evidence.
"""

r = {}


class A:
    def meth(self, a):
        return 'A(%r)' % a


class B(A):
    def meth(self, a):
        return 'B(%r)' % a + super().meth(a)


class C(A):
    def meth(self, a):
        return 'C(%r)' % a + self.__super.meth(a)


C._C__super = super(C)


class D(C, B):
    def meth(self, a):
        return 'D(%r)' % a + super(D, self).meth(a)


class mysuper(super):
    def __init__(self, *args):
        return super(mysuper, self).__init__(*args)


class E(D):
    def meth(self, a):
        return 'E(%r)' % a + mysuper(E, self).meth(a)


class F(E):
    def meth(self, a):
        s = self.__super
        return 'F(%r)[%s]' % (a, s.__class__.__name__) + s.meth(a)


F._F__super = mysuper(F)

unbound = super(C)
d = D()
bound = unbound.__get__(d, D)

r['through_the_class_attribute'] = [C().meth(3), D().meth(4)]
r['super_subclass'] = [E().meth(5), F().meth(6)]
r['explicit_get'] = [bound.__self__ is d, bound.__self_class__ is D, bound.__thisclass__ is C,
                     bound.meth(7)]
r['get_with_owner_only'] = unbound.__get__(d).meth(8)
r['answers_itself'] = [unbound.__get__(None, D) is unbound, bound.__get__(C(), C) is bound]
r['unbound_state'] = [unbound.__thisclass__ is C, unbound.__self__, unbound.__self_class__]

EXPECTED = {
    'through_the_class_attribute': ['C(3)A(3)', 'D(4)C(4)B(4)A(4)'],
    'super_subclass': ['E(5)D(5)C(5)B(5)A(5)', 'F(6)[mysuper]E(6)D(6)C(6)B(6)A(6)'],
    'explicit_get': [True, True, True, 'B(7)A(7)'],
    'get_with_owner_only': 'B(8)A(8)',
    'answers_itself': [True, True],
    'unbound_state': [True, None, None],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        ok = r[key] == EXPECTED[key]
        print('%-28s %s' % (key, 'OK' if ok else 'FAIL'))
        if not ok:
            print('    got  %r' % (r[key],))
            print('    want %r' % (EXPECTED[key],))
    print(SUMMARY)
