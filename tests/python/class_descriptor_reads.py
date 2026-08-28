"""A descriptor ASSIGNED to a class at runtime binds on a class read.

``Cls.m = classmethod(f)`` then ``Cls.m(5)`` answered ``'classmethod'
object is not callable``.  The class-attribute read consults the
descriptor protocol only for ONE of the two homes a runtime store can
land in: a value in the per-class ``___dynInstVars___`` holder was asked
for ``__get__``, while the identical store landing in the canonical-class
OVERLAY was returned raw -- and a bare classmethod wrapper is not
callable, in Grail or in CPython.  The INSTANCE read was always right,
which is what kept this to the class-side spelling.

The subscript path had the matching bug one layer up.  A runtime
``Cls.__class_getitem__ = classmethod(f)`` was called as ``f(cls, cls,
item)``: the read had already bound the class, and the dispatch supplied
it a second time.  CPython reads __class_getitem__ off the class through
the descriptor protocol -- classmethod arrives BOUND, staticmethod
UNWRAPPED -- and then calls it with the INDEX ALONE, which is what all
four shapes below pin.

Every expectation was checked against CPython 3.14 first.
"""

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or 'got: %r' % (got,)


def call(fn, *a):
    try:
        return fn(*a)
    except TypeError as exc:
        return 'TypeError: %s' % exc


# -- a descriptor assigned to a class ----------------------------------

class A:
    pass


def _f(cls, item):
    return (cls.__name__, item)


A.m = classmethod(_f)

check('classmethod_call_via_class', A.m(5), ('A', 5))
check('classmethod_call_via_instance', A().m(6), ('A', 6))


def _g(item):
    return ('static', item)


A.s = staticmethod(_g)

check('staticmethod_call_via_class', A.s(7), ('static', 7))
check('staticmethod_call_via_instance', A().s(8), ('static', 8))


def _h(self, x):
    return ('plain', x)


A.p = _h

check('plain_function_via_instance', A().p(9), ('plain', 9))
check('plain_function_via_class', A.p(A(), 10), ('plain', 10))

A.prop = property(lambda self: 'propval')

check('property_reads_through_instance', A().prop, 'propval')
check('property_off_the_class_is_the_descriptor',
      isinstance(A.prop, property), True)


# -- __class_getitem__ assigned at runtime ------------------------------
#
# CPython calls it with the index ALONE, after the descriptor read.

class ClsMethodSub:
    pass


ClsMethodSub.__class_getitem__ = classmethod(
    lambda cls, item: ('cm', cls.__name__, item))

check('subscript_classmethod', ClsMethodSub[int], ('cm', 'ClsMethodSub', int))


class StaticSub:
    pass


StaticSub.__class_getitem__ = staticmethod(lambda item: ('sm', item))

check('subscript_staticmethod', StaticSub[int], ('sm', int))


class OneArgSub:
    pass


OneArgSub.__class_getitem__ = lambda item: ('one-arg', item)

check('subscript_one_arg_function', OneArgSub[int], ('one-arg', int))


# The corpus shape: installed from __init_subclass__, so the store lands
# on the SUBCLASS and the hook must see that subclass.

class Base:
    def __init_subclass__(cls):
        def __class_getitem__(cls, item):
            return '%s[%s]' % (cls.__name__, item.__name__)
        cls.__class_getitem__ = classmethod(__class_getitem__)


class Derived(Base):
    pass


check('subscript_installed_by_init_subclass', Derived[int], 'Derived[int]')
check('subscript_installed_sees_its_own_class', Derived[Derived],
      'Derived[Derived]')


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
