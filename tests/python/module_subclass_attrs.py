"""Attribute lookup on a SUBCLASS of types.ModuleType, driven by
PythonTests>>ModuleSubclassAttrTestCase.

An ordinary Python class resolves class attributes and descriptors through
its instances.  A module subclass did not: Grail's module attribute path
read the instance's SymbolDictionary storage and then raised
AttributeError, never consulting the class at all.  So every attribute a
module subclass declared -- or had installed on it with setattr -- was
invisible from an instance, while the identical declaration on a normal
class worked.

That is six's whole API surface.  ``six.moves.X`` is a _LazyDescr
installed on the _MovedItems CLASS in a loop over _moved_attributes, so
``import six`` died with "module '?' has no attribute 'builtins'".

Two storage homes had to be consulted, which is why the first fix looked
right and found nothing: a class-BODY declaration compiles to an accessor
pair on the metaclass, while a runtime ``setattr(cls, ...)`` lands in the
per-class holder -- or, for a canonically-registered class, in the
session-local overlay that shadows it.

Run under CPython (``python3 tests/python/module_subclass_attrs.py'') to
see what it produces -- that is where the expectations come from.
"""

import types


class _Desc:
    def __init__(self, val):
        self.val = val

    def __get__(self, obj, tp):
        return 'resolved-%s' % self.val


def a_class_body_attribute_is_visible_from_an_instance():
    class M(types.ModuleType):
        attr = 'from-class-body'
    return M('probe').attr == 'from-class-body'


def a_class_body_descriptor_is_resolved():
    class M(types.ModuleType):
        d = _Desc(1)
    return M('probe').d == 'resolved-1'


def a_runtime_class_attribute_is_visible_from_an_instance():
    """setattr on the CLASS after it is built -- six's shape."""
    class M(types.ModuleType):
        pass
    setattr(M, 'attr', 'from-setattr')
    return M('probe').attr == 'from-setattr'


def a_runtime_class_descriptor_is_resolved():
    class M(types.ModuleType):
        pass
    setattr(M, 'd', _Desc(2))
    return M('probe').d == 'resolved-2'


def an_instance_attribute_shadows_the_class_attribute():
    class M(types.ModuleType):
        attr = 'from-class'
    m = M('probe')
    m.attr = 'from-instance'
    return m.attr == 'from-instance'


def a_subclass_attribute_shadows_the_base():
    class A(types.ModuleType):
        attr = 'from-A'

    class B(A):
        attr = 'from-B'
    return B('probe').attr == 'from-B' and A('probe').attr == 'from-A'


def a_missing_attribute_still_raises_attributeerror():
    class M(types.ModuleType):
        pass
    try:
        M('probe').nope
    except AttributeError:
        return True
    return False


def a_plain_class_is_unaffected():
    """Regression guard: the ordinary path must not change."""
    class Plain:
        attr = 'from-class-body'
        d = _Desc(3)
    p = Plain()
    setattr(Plain, 'later', 'from-setattr')
    return (p.attr == 'from-class-body' and p.d == 'resolved-3'
            and p.later == 'from-setattr')


def a_real_module_is_unaffected():
    """Regression guard: ordinary imported modules keep working."""
    import sys as real_sys
    return isinstance(real_sys.path, list) and real_sys.__name__ == 'sys'


CHECKS = [
    a_class_body_attribute_is_visible_from_an_instance,
    a_class_body_descriptor_is_resolved,
    a_runtime_class_attribute_is_visible_from_an_instance,
    a_runtime_class_descriptor_is_resolved,
    an_instance_attribute_shadows_the_class_attribute,
    a_subclass_attribute_shadows_the_base,
    a_missing_attribute_still_raises_attributeerror,
    a_plain_class_is_unaffected,
    a_real_module_is_unaffected,
]


def all_checks():
    return [(fn.__name__, fn() is True) for fn in CHECKS]


if __name__ == '__main__':
    for fn in CHECKS:
        print('%-4s %s' % ('OK' if fn() is True else 'FAIL', fn.__name__))
