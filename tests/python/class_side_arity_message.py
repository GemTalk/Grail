"""Fixture: a fixed-arity classmethod or staticmethod reports a wrong call the
way CPython does (#1484).

A def with defaults, *args, keyword-only parameters or **kwargs compiles a
keyword forwarder whose generated check raises CPython's message.  One whose
parameters are all plain and required compiles to a single fixed-arity method,
and for an instance method or a module function a forwarder is compiled
anyway -- but not for a @classmethod or @staticmethod.  So a call with the
wrong number of arguments fell through to BoundMethod's last resort, which
said ``cm() takes a different number of arguments (2 given)'': no qualified
name, no accepted count, and nothing like CPython's wording, for too few
arguments as well as too many.

A classmethod counts ``cls'' on both sides, as an instance method counts
``self''; a staticmethod has no receiver to count.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

r = {}


def message(fn):
    try:
        fn()
    except TypeError as e:
        return str(e)
    return 'no error'


class C:
    @classmethod
    def cm(cls, a):
        return 'cm'

    @classmethod
    def cm0(cls):
        return 'cm0'

    @classmethod
    def cm3(cls, a, b, c):
        return 'cm3'

    @staticmethod
    def sm(a):
        return 'sm'

    @staticmethod
    def sm0():
        return 'sm0'

    @staticmethod
    def sm2(a, b):
        return 'sm2'

    class Inner:
        @classmethod
        def icm(cls, a):
            return 'icm'


class Sub(C):
    pass


c = C()

r['classmethod_too_many'] = message(lambda: C.cm(1, 2))
r['classmethod_no_parameters'] = message(lambda: C.cm0(1))
r['classmethod_too_few'] = message(lambda: C.cm())
r['classmethod_several_missing'] = message(lambda: C.cm3(1))
r['classmethod_through_an_instance'] = message(lambda: c.cm(1, 2))
r['classmethod_inherited_keeps_its_qualname'] = message(lambda: Sub.cm(1, 2))
r['classmethod_of_a_nested_class'] = message(lambda: C.Inner.icm(1, 2))

r['staticmethod_too_many'] = message(lambda: C.sm(1, 2))
r['staticmethod_no_parameters'] = message(lambda: C.sm0(1))
r['staticmethod_too_few'] = message(lambda: C.sm())
r['staticmethod_both_missing'] = message(lambda: C.sm2())
r['staticmethod_through_an_instance'] = message(lambda: c.sm(1, 2))

# Controls: the right count still calls through.
r['right_counts_still_work'] = [C.cm(1), C.cm0(), C.cm3(1, 2, 3), C.sm(1),
                                C.sm0(), C.sm2(1, 2), c.cm(1), Sub.sm(1),
                                C.Inner.icm(1)]


EXPECTED = {
    'classmethod_too_many': 'C.cm() takes 2 positional arguments but 3 were given',
    'classmethod_no_parameters': 'C.cm0() takes 1 positional argument but 2 were given',
    'classmethod_too_few': "C.cm() missing 1 required positional argument: 'a'",
    'classmethod_several_missing':
        "C.cm3() missing 2 required positional arguments: 'b' and 'c'",
    'classmethod_through_an_instance': 'C.cm() takes 2 positional arguments but 3 were given',
    'classmethod_inherited_keeps_its_qualname':
        'C.cm() takes 2 positional arguments but 3 were given',
    'classmethod_of_a_nested_class':
        'C.Inner.icm() takes 2 positional arguments but 3 were given',
    'staticmethod_too_many': 'C.sm() takes 1 positional argument but 2 were given',
    'staticmethod_no_parameters': 'C.sm0() takes 0 positional arguments but 1 was given',
    'staticmethod_too_few': "C.sm() missing 1 required positional argument: 'a'",
    'staticmethod_both_missing':
        "C.sm2() missing 2 required positional arguments: 'a' and 'b'",
    'staticmethod_through_an_instance': 'C.sm() takes 1 positional argument but 2 were given',
    'right_counts_still_work': ['cm', 'cm0', 'cm3', 'sm', 'sm0', 'sm2', 'cm', 'sm', 'icm'],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        print('%-5s %-42s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL',
                                    key, actual))
    print(SUMMARY)
