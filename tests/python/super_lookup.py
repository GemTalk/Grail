"""Fixture: two things ``super()`` could not do.

BOTH ARE ABOUT WHAT super() CAN SEE, not about how it dispatches.

1. A parent's @classmethod was invisible when super() was called from an
   INSTANCE method.  Grail compiles a Python @classmethod onto its metaclass,
   and the lookup only consulted the class side when the bound receiver was
   itself a class -- so ``def cm(cls): return super().cm()'' whose MRO
   successors are all @classmethods raised ``super(): no parent method 'cm'''.
   CPython draws no such distinction: super() looks the name up on the MRO
   classes, and a classmethod is found from either side.

2. A name the parent chain does NOT define still produced a truthy proxy, and
   the AttributeError only fired when it was CALLED.  That breaks the standard
   probe-with-a-default idiom -- copy.deepcopy does
   ``getattr(x, '__deepcopy__', None)'', got a proxy instead of None, called
   it, and the error escaped outside the guard meant to catch it.  hasattr()
   was True for every name for the same reason.
"""


class A:
    def f(self):
        return 'A'

    @classmethod
    def cm(cls):
        return (cls.__name__, 'A')


class B(A):
    def f(self):
        return super().f() + 'B'

    @classmethod
    def cm(cls):
        return (cls.__name__, super().cm(), 'B')


class C(B):
    # A PLAIN method whose MRO successors are @classmethods -- the shape that
    # made the class side matter.  `cls` here is really an instance.
    def cm(cls):
        return ('instance', super().cm(), 'C')

    def f(self):
        return super().f() + 'C'


r = {
    # 1. the classmethod chain, and the ordinary instance chain beside it
    'classmethod_chain': str(C().cm()),
    'instance_chain': C().f(),
    # A @classmethod reached through super() gets the CLASS, not the instance.
    'classmethod_receiver_is_a_class': str(B.cm()),
}

s = super(B, C())

# 2. a missing name is missing at LOOKUP time
r['getattr_with_default'] = repr(getattr(s, '__deepcopy__', None))
r['hasattr_is_false'] = hasattr(s, '__deepcopy__')
try:
    s.__deepcopy__
    r['bare_access'] = 'NOT RAISED'
except AttributeError:
    r['bare_access'] = 'AttributeError'
except Exception as exc:
    r['bare_access'] = type(exc).__name__

# A name the parent DOES define is unaffected.
r['present_name_still_works'] = s.f()


EXPECTED = {
    'classmethod_chain': "('instance', ('C', ('C', 'A'), 'B'), 'C')",
    'instance_chain': 'ABC',
    'classmethod_receiver_is_a_class': "('B', ('B', 'A'), 'B')",
    'getattr_with_default': 'None',
    'hasattr_is_false': False,
    'bare_access': 'AttributeError',
    'present_name_still_works': 'A',
}


if __name__ == '__main__':
    for key, expected in EXPECTED.items():
        actual = r[key]
        print('%-4s %s -> %r' % ('OK' if actual == expected else 'FAIL',
                                 key, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-4s %s is not in EXPECTED' % ('FAIL', extra))
