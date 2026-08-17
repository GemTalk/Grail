"""Fixture: ``class A(metaclass=M)`` runs M.__new__ and M.__init__.

CPython evaluates a class statement as ``M(name, bases, namespace)``, so the
metaclass BUILDS the class.  Grail cannot invert that -- a class body is
compiled onto a real Smalltalk class before any hook can run -- so the class is
built first and the metaclass is run OVER it, with ``type.__new__`` answering
the class under construction rather than making a second one.

For the shape every metaclass in the corpus is actually written in, the two
orders are indistinguishable:

    def __new__(cls, name, bases, ns):
        self = super().__new__(cls, name, bases, ns)   # the class being defined
        ...observe or mutate self...
        return self                                    # re-binds the name

Of the 40-odd metaclasses across the vendored CPython tests, __new__ is by far
the most overridden (test_super has six, test_subclassinit five); __init__ is
next.  So this is the protocol worth having, and it is what test_super's
``__classcell__`` cluster needs underneath it.
"""

r = {}


# --- __new__ observes and mutates the class it is handed --------------------

class MSelf(type):
    def __new__(mcls, name, bases, ns):
        self = super().__new__(mcls, name, bases, ns)
        self.added_by_new = 'new'
        return self

    def __init__(cls, name, bases, ns):
        cls.added_by_init = 'init'


class WithSelf(metaclass=MSelf):
    y = 2

    def m(self):
        return 'm'


r['new_ran'] = WithSelf.added_by_new
r['init_ran'] = WithSelf.added_by_init
r['body_survives'] = [WithSelf.y, WithSelf().m()]
r['type_is_meta'] = type(WithSelf).__name__
r['isinstance_of_meta'] = isinstance(WithSelf, MSelf)


# --- the namespace is real, and carries the whole body ----------------------
# Assignments AND defs reach it, which is what the class-body namespace work
# (stage 6) put there.  A metaclass that ADDS to the namespace has the addition
# land on the class, because that is what type.__new__ means.

class MNamespace(type):
    def __new__(mcls, name, bases, ns):
        r['ns_keys'] = sorted(k for k in ns if not k.startswith('__'))
        ns['injected'] = 'from_namespace'
        return super().__new__(mcls, name, bases, ns)


class WithNamespace(metaclass=MNamespace):
    a = 1

    def f(self):
        return 'f'


r['ns_injection_lands'] = WithNamespace.injected


# --- __new__ may return something that is not a class -----------------------
# CPython binds whatever __new__ answers, so the class name need not hold a
# class at all.  test_super and test_subclassinit both rely on this.

class MNone(type):
    def __new__(mcls, name, bases, ns):
        return None


class IsNone(metaclass=MNone):
    pass


class MZero(type):
    def __new__(mcls, name, bases, ns):
        return 0


class IsZero(metaclass=MZero):
    pass


r['new_returning_none'] = IsNone is None
r['new_returning_zero'] = IsZero == 0


# --- a metaclass that constructs nothing is left alone ----------------------
# ABCMeta overrides neither __new__ nor __init__.  It must NOT be handed the
# construction protocol: doing so cost the class its own methods and turned a
# comparison that should end in TypeError into an AttributeError (test_binop).

from abc import ABCMeta


class Plain(metaclass=ABCMeta):
    def __ge__(self, other):
        return NotImplemented

    def __le__(self, other):
        return NotImplemented


class Other:
    def __ge__(self, other):
        return NotImplemented

    def __le__(self, other):
        return NotImplemented


def _cmp():
    try:
        Plain() <= Other()
    except TypeError:
        return 'TypeError'
    except Exception as e:
        return type(e).__name__
    return 'no error'


r['nonconstructing_metaclass_untouched'] = _cmp()
r['nonconstructing_keeps_its_type'] = type(Plain).__name__


EXPECTED = {
    'new_ran': 'new',
    'init_ran': 'init',
    'body_survives': [2, 'm'],
    'type_is_meta': 'MSelf',
    'isinstance_of_meta': True,
    'ns_keys': ['a', 'f'],
    'ns_injection_lands': 'from_namespace',
    'new_returning_none': True,
    'new_returning_zero': True,
    'nonconstructing_metaclass_untouched': 'TypeError',
    'nonconstructing_keeps_its_type': 'ABCMeta',
}


if __name__ == '__main__':
    for key, expected in EXPECTED.items():
        actual = r[key]
        print('%-4s %s -> %r' % ('OK' if actual == expected else 'FAIL',
                                 key, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-4s %s is not in EXPECTED' % ('FAIL', extra))
