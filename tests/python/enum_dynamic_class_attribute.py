# ``enum.property`` / ``types.DynamicClassAttribute`` -- a property that is
# deliberately INVISIBLE ON THE CLASS.
#
# It exists so an enum member can have a ``name`` while the enum CLASS keeps its
# own meaning for that name, and CPython spells the difference in __get__:
#
#     C.A.foo    'foo-A'          -- instance access runs the getter
#     C.foo      AttributeError   -- class access is refused
#
# An ordinary property answers the DESCRIPTOR ITSELF for class access, which is
# what makes ``C.prop.fget`` work.  Grail exported enum.property AS the same
# PropertyDescriptor that backs the builtin, so the two were one object with one
# behaviour and the enum case took the property answer.
#
# NOT covered, and unchanged rather than regressed: the DECORATOR spelling
# ``@enum.property def foo`` still compiles to a plain getter method and builds
# no descriptor, so class access there hands back a function.  Only the call
# form is fixed here.
#
# Prerequisite for test_enum's test_inspect_getmembers and
# test_inspect_classify_class_attrs, which find Enum.name/.value only by
# sweeping for isinstance(v, DynamicClassAttribute) -- a test that could not be
# written while one class served both spellings.

import enum
from enum import Enum


def _foo(self):
    return 'foo-' + self.name


def instance_access_runs_the_getter():
    class C(Enum):
        A = 1
        foo = enum.property(_foo)

    return C.A.foo == 'foo-A'


def class_access_is_refused():
    class C(Enum):
        A = 1
        foo = enum.property(_foo)

    try:
        C.foo
    except AttributeError:
        return True
    return False


def it_works_on_a_plain_class_too():
    """Nothing about the descriptor is enum-specific; enum is just its
    motivating user."""

    class Plain:
        foo = enum.property(lambda self: 'plain')

    if Plain().foo != 'plain':
        return False
    try:
        Plain.foo
    except AttributeError:
        return True
    return False


def an_ordinary_property_still_answers_itself():
    """Guard rail.  The builtin property must keep CPython's class-access
    behaviour -- answering the descriptor is what makes C.prop.fget work."""

    class Plain:
        val = property(lambda self: 'v')

    return Plain().val == 'v' and Plain.val.fget is not None


def the_two_are_different_classes():
    """Which is what lets inspect sweep for one and not the other."""
    return enum.property is not property


def it_reports_the_name_it_is_exported_under():
    """__module__/__qualname__ are how a class is pickled BY REFERENCE.  Without
    them pickle scans sys.modules, which makes the answer depend on what an
    earlier import happened to bring in."""
    return (enum.property.__module__ == 'enum'
            and enum.property.__qualname__ == 'property')


# scripts/check_python_fixtures.sh runs this under CPython in CI.
if __name__ == '__main__':
    checks = [
        instance_access_runs_the_getter,
        class_access_is_refused,
        it_works_on_a_plain_class_too,
        an_ordinary_property_still_answers_itself,
        the_two_are_different_classes,
        it_reports_the_name_it_is_exported_under,
    ]
    for fn in checks:
        print('%-4s %s' % ('OK' if fn() is True else 'FAIL', fn.__name__))
