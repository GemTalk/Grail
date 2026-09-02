"""A class-body method decorator reads the CLASS BODY's namespace.

In CPython the class body is one namespace, and a decorator expression above a
def reads names bound earlier in it.  Grail has no class-body namespace: it
compiles the defs to real methods and applies their decorators once the class
EXISTS, resolving a sibling name off the class instead.  That compensation
listed only the names bound as DEFS, so the commoner shape -- a flag computed
in the class body and read by the decorator above the def -- fell through to
the module and raised NameError.

The raise was invisible.  A class-body decorator whose expression raises is
silently dropped and the undecorated method installed, so the guard simply
never applied.  test_builtin and test_warnings each skip a test this way.

The bare-name case failed harder: the parser records ``@_deco'' as a Symbol
rather than a NameAst, so it never reached the class-body lookup at all and
emitted a bare Smalltalk identifier -- a COMPILE error that takes the whole
module down, not one decorator.
"""

import unittest


def tag(value):
    def deco(fn):
        fn.tagged = value
        return fn
    return deco


MODULE_FLAG = 'from-module'


class ReadsAClassBodyLocal:
    FLAG = 'from-class-body'

    @tag(FLAG)
    def m(self):
        pass


class ReadsAModuleGlobal:
    @tag(MODULE_FLAG)
    def m(self):
        pass


class ShadowsAModuleGlobal:
    MODULE_FLAG = 'the-class-body-one'

    @tag(MODULE_FLAG)
    def m(self):
        pass


class UsesASiblingDefBare:
    def _deco(fn):
        fn.tagged = 'from-class-body-def'
        return fn

    @_deco
    def m(self):
        pass


class UsesASiblingDefCalled:
    def _factory(value):
        return tag(value)

    @_factory('from-called-sibling')
    def m(self):
        pass


class SkipsOnAClassBodyFlag(unittest.TestCase):
    SKIP = True

    @unittest.skipIf(SKIP, 'because')
    def test_m(self):
        pass


def a_decorator_argument_reads_a_class_body_local():
    """The shape test_builtin uses: ``@unittest.skipIf(linux_alpha, ...)``
    where linux_alpha is computed two lines above, in the class body."""
    return getattr(ReadsAClassBodyLocal.m, 'tagged', None) == 'from-class-body'


def a_decorator_argument_still_reads_a_module_global():
    """The CONTROL.  Widening the class-body scope must not capture a name the
    class body does not bind -- ``@functools.singledispatchmethod`` resolves
    ``functools`` as the module global it is."""
    return getattr(ReadsAModuleGlobal.m, 'tagged', None) == 'from-module'


def a_class_body_binding_shadows_a_module_global():
    """The other side of that control: when the class body DOES bind the name,
    CPython reads the class body's, not the module's."""
    return getattr(ShadowsAModuleGlobal.m, 'tagged', None) == 'the-class-body-one'


def a_bare_sibling_def_can_be_the_decorator():
    """``@_deco`` naming a sibling def.  Recorded by the parser as a Symbol, so
    it took a different emit path and produced a compile error rather than a
    dropped decorator."""
    return getattr(UsesASiblingDefBare.m, 'tagged', None) == 'from-class-body-def'


def a_called_sibling_def_can_be_the_decorator():
    """``@_factory(...)`` -- the shape that already worked, kept as a control
    on the path this change reorders."""
    return getattr(UsesASiblingDefCalled.m, 'tagged', None) == 'from-called-sibling'


def a_skip_reading_a_class_body_flag_applies():
    """The end-to-end shape, and the one the CPython suite actually depends on:
    the mark has to reach the method for the test to be skipped."""
    return getattr(SkipsOnAClassBodyFlag.test_m, '__unittest_skip__', False) is True


CHECKS = [
    a_decorator_argument_reads_a_class_body_local,
    a_decorator_argument_still_reads_a_module_global,
    a_class_body_binding_shadows_a_module_global,
    a_bare_sibling_def_can_be_the_decorator,
    a_called_sibling_def_can_be_the_decorator,
    a_skip_reading_a_class_body_flag_applies,
]

RESULTS = {}
for _fn in CHECKS:
    try:
        RESULTS[_fn.__name__] = _fn() is True
    except Exception as _exc:
        RESULTS[_fn.__name__] = type(_exc).__name__ + ': ' + str(_exc)


if __name__ == '__main__':
    for _fn in CHECKS:
        _got = RESULTS[_fn.__name__]
        print('%-4s %s' % ('OK' if _got is True else 'FAIL', _fn.__name__))
