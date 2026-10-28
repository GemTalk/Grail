"""Fixture: type.mro is the unbound descriptor CPython's is.

``type.mro`` read off the type class is a method descriptor, so
``type.mro(C)`` is C's order -- the spelling a metaclass overriding mro()
uses to get the default (test_descr test_altmro), and test_descr
test_pytype_long_ready's ``type.mro(tuple)``.  Grail bound Behavior's mro to
``type`` itself, so the class arrived as a surplus argument and
``type.mro()`` answered type's own order.  A metaclass inherits the
descriptor, a class's own ``C.mro()`` stays bound, and a metaclass's own mro
def is still the function it defines.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

r = {}


class A:
    pass


class B(A):
    pass


class Meta(type):
    pass


class Reversing(type):
    def mro(cls):
        order = type.mro(cls)
        order.reverse()
        return order


def refusal(call):
    try:
        call()
    except TypeError:
        return 'TypeError'
    return 'no TypeError'


r['unbound'] = [type.mro(tuple) == [tuple, object], type.mro(B) == [B, A, object],
                type.mro(type) == [type, object]]
r['bound_on_a_class'] = [B.mro() == [B, A, object], A.mro() == [A, object]]
r['inherited_by_a_metaclass'] = [Meta.mro(B) == [B, A, object]]
r['metaclass_def_calls_it'] = [Reversing.mro(B) == [object, A, B]]
r['needs_a_class'] = [refusal(lambda: type.mro()), refusal(lambda: type.mro(1))]

EXPECTED = {
    'unbound': [True, True, True],
    'bound_on_a_class': [True, True],
    'inherited_by_a_metaclass': [True],
    'metaclass_def_calls_it': [True],
    'needs_a_class': ['TypeError', 'TypeError'],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        print('%-26s %-5s -> %r' % (key, 'OK' if actual == EXPECTED[key] else 'FAIL', actual))
    print(SUMMARY)
