"""Fixture: a class-side method that SHADOWS an inherited class-body attribute.

Grail splits what CPython keeps in one ``__dict__``.  A class-body ``x = v``
compiles to a getter/setter accessor PAIR on the metaclass; a ``@staticmethod``
or ``@classmethod`` compiles to a class-side method, also on the metaclass.  The
attribute readers told those apart by asking whether BOTH a getter and a setter
existed anywhere in the metaclass chain -- a data attribute has the pair, a
class-side method does not.

That test is wrong when the two halves come from DIFFERENT classes.  A base
class's ``mk = None`` contributes the pair; a subclass then defines ``mk`` as a
staticmethod, so the getter resolves to the subclass's method while the setter
is still the base's.  Both halves are found, the reader concludes "class-body
data attribute", and it PERFORMS the getter -- calling the staticmethod instead
of answering it.  ``Shadow().mk`` was the body's return value, and the caller's
``()`` then failed on whatever that was:

    'SmallInteger' object is not callable

Both readers had it, so both access paths were wrong; the fix gates each on the
getter's OWN category, which is what the sibling built-in-subclass reader
already did.

Found through test.test_asyncio.test_taskgroups, whose TestEagerTaskTaskGroup
spells its loop factory as ``@staticmethod def loop_factory()`` over the
``loop_factory = None`` it inherits from IsolatedAsyncioTestCase -- 48 tests,
all failing on an attribute access with nothing to do with asyncio.

NOT COVERED, because it is a different and still-open bug: the same shadowing
with a MULTI-ARGUMENT class-side method.  Those compile to a keyword selector
(``mk:_:``), so no unary getter exists at all, these readers never fire, and
lookup falls through to the inherited data value -- ``Shadow.mk(1, 2)`` raises
``'NoneType' object is not callable``.  Verified pre-existing: it fails
identically with this fix reverted.
"""


class Base:
    mk = None
    cm = None


class ShadowStatic(Base):
    @staticmethod
    def mk():
        return 'static wins'


class ShadowClass(Base):
    @classmethod
    def cm(cls):
        return 'class wins'


class NoShadow:
    @staticmethod
    def mk():
        return 'static wins'

    @staticmethod
    def two(a, b):
        return (a, b)


def a_shadowing_staticmethod_is_answered_not_called():
    """Access must not invoke.  This is the bug, read off the class."""
    return not isinstance(ShadowStatic.mk, str)


def a_shadowing_staticmethod_is_answered_via_an_instance_too():
    """Both readers had the defect, so both paths are checked."""
    return not isinstance(ShadowStatic().mk, str)


def a_shadowing_staticmethod_still_calls_correctly():
    return ShadowStatic.mk() == 'static wins'


def a_shadowing_staticmethod_calls_via_an_instance():
    return ShadowStatic().mk() == 'static wins'


def the_subclass_outranks_the_inherited_attribute():
    """The MRO rule: nearer class wins, whichever kind it supplies."""
    return ShadowStatic.mk() == 'static wins' and Base.mk is None


def a_shadowing_classmethod_works_too():
    """The same code path names @classmethod; check it rather than assume."""
    return ShadowClass.cm() == 'class wins' and ShadowClass().cm() == 'class wins'


def the_base_attribute_is_undisturbed():
    """The fix must not break the ordinary class-body data attribute it guards."""
    return Base.mk is None and Base.cm is None


def an_unshadowed_staticmethod_is_unaffected():
    return NoShadow.mk() == 'static wins' and NoShadow().mk() == 'static wins'


def a_multi_argument_staticmethod_is_unaffected():
    """Not the shadowing case -- that one is still broken and documented."""
    return NoShadow.two(1, 2) == (1, 2) and NoShadow().two(3, 4) == (3, 4)


CHECKS = (
    a_shadowing_staticmethod_is_answered_not_called,
    a_shadowing_staticmethod_is_answered_via_an_instance_too,
    a_shadowing_staticmethod_still_calls_correctly,
    a_shadowing_staticmethod_calls_via_an_instance,
    the_subclass_outranks_the_inherited_attribute,
    a_shadowing_classmethod_works_too,
    the_base_attribute_is_undisturbed,
    an_unshadowed_staticmethod_is_unaffected,
    a_multi_argument_staticmethod_is_unaffected,
)

r = {fn.__name__: fn() for fn in CHECKS}


if __name__ == '__main__':
    for fn in CHECKS:
        print('%-4s %s' % ('OK' if r[fn.__name__] is True else 'FAIL',
                           fn.__name__))
