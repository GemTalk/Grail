"""A method decorator must survive inheritance through a SECONDARY base.

Driven by PythonTests>>DecoratorSecondaryBaseTestCase.

``class C(Primary, Mixin)`` puts Mixin second.  Grail gives a Python class ONE
Smalltalk superclass -- the primary base -- and reproduces the others by copying
their compiled methods down onto C (importlib>>___mergeSecondaryBases___).  A
class-body decorator is not part of the compiled method, though: the method
stays put and the DECORATED object is stored under the bare Python name in the
base's class-attribute holder, which is what ``C.m`` actually reads.  So the
copy has to bring the holder entry along or the subclass silently gets the RAW,
undecorated function.

It did bring it along -- but only for a def compiling to a UNARY selector, which
in Grail means exactly ``def m(self)``.  Every other signature (a default, a
required argument, ``*args``) compiles to a keyword selector, and those were
skipped outright.  The checks below therefore sweep SIGNATURE SHAPE, which is
the axis the bug lived on; ``a_default_argument`` is the shape that first
exposed it (test_traceback's ``@cpython_only check_traceback_format(self,
cleanup_func=None)``, whose lost skip turned two skips into errors).

Nothing here is Grail-specific: CPython applies decorators at the def statement,
so every check below is simply true there.  Run it directly to confirm --
``python3 tests/python/decorator_secondary_base.py``.
"""


def tagged(fn):
    """A decorator whose effect is visible without calling the wrapped code."""

    def wrapper(*args, **kwargs):
        return 'decorated'

    wrapper.__name__ = getattr(fn, '__name__', 'wrapper')
    return wrapper


class Mixin:
    @tagged
    def no_args(self):
        return 'raw'

    @tagged
    def one_required(self, a):
        return 'raw'

    @tagged
    def a_default(self, cleanup=None):
        return 'raw'

    @tagged
    def star_args(self, *args, **kwargs):
        return 'raw'

    @tagged
    def _underscored(self, a):
        return 'raw'

    def calls_a_default(self):
        """The real shape: an INHERITED test method calling the decorated
        helper, rather than the caller reaching for it from outside."""
        return self.a_default()


class Primary:
    pass


class MixinSecond(Primary, Mixin):
    pass


class MixinFirst(Mixin, Primary):
    pass


class Overrides(Primary, Mixin):
    def a_default(self, cleanup=None):
        """A class's OWN def outranks the base's decorated one -- the merge
        must not copy a rebinding over a method the subclass defines."""
        return 'own'


def a_no_argument_method_keeps_its_decorator():
    return MixinSecond().no_args() == 'decorated'


def a_required_argument_keeps_its_decorator():
    return MixinSecond().one_required(1) == 'decorated'


def a_default_argument_keeps_its_decorator():
    """The shape the bug lived on: no unary selector exists to carry it."""
    return MixinSecond().a_default() == 'decorated'


def star_args_keeps_its_decorator():
    return MixinSecond().star_args(1, x=2) == 'decorated'


def an_underscored_name_keeps_its_own_decorator():
    """``_underscored`` must not be confused with the underscore codegen adds
    to a varargs selector; stripping it would target ``underscored``."""
    return MixinSecond()._underscored(1) == 'decorated'


def an_inherited_caller_sees_the_decorated_helper():
    return MixinSecond().calls_a_default() == 'decorated'


def a_leading_mixin_still_works():
    """Mixin FIRST is the case that always worked -- it is the Smalltalk
    superclass, so the holder is inherited rather than copied.  Kept as the
    control: if this ever breaks, the copy is not the thing at fault."""
    return MixinFirst().a_default() == 'decorated'


def an_own_definition_still_wins():
    return Overrides().a_default() == 'own'


# scripts/check_python_fixtures.sh runs this under CPython in CI.
if __name__ == '__main__':
    checks = [
        a_no_argument_method_keeps_its_decorator,
        a_required_argument_keeps_its_decorator,
        a_default_argument_keeps_its_decorator,
        star_args_keeps_its_decorator,
        an_underscored_name_keeps_its_own_decorator,
        an_inherited_caller_sees_the_decorated_helper,
        a_leading_mixin_still_works,
        an_own_definition_still_wins,
    ]
    for fn in checks:
        print('%-4s %s' % ('OK' if fn() is True else 'FAIL', fn.__name__))
