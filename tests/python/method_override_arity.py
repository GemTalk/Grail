"""Fixture: an override that CHANGES the parameter count of the method it
overrides.

Grail spells a Python method's arity into its Smalltalk selector, so

    class Base:    def f(self):        ...   ->   f
    class Derived: def f(self, extra): ...   ->   f:

leaves BOTH selectors reachable through the class chain.  That is the same
pair of spellings a synthesized property getter/setter has, so the attribute
load treated it as a property, PERFORMED the unary, and answered the parent
method's RETURN VALUE where Python answers a bound method -- ``Derived().f('x')``
died with ``'Unicode7' object is not callable`` because it got Base.f's string
back and tried to call it.

The discriminator is OWNERSHIP: a property pair is declared together on ONE
class, while an override's two halves never are.  The property cases below are
the guard on that -- they must keep reading as VALUES, including when the pair
is inherited intact from an ancestor.

Only the WIDENING direction is covered.  The mirror shape -- a subclass
narrowing an inherited ``name:`` to a unary ``name`` -- is still broken, and
deliberately so: it is shape-identical to a property whose getter alone is
overridden (test_property's ``PropertySubNewGetter``), so ownership cannot
separate the two.  See ``object >> ___unaryGetterShadowedBySetter___:setter:``.
"""


class Base:
    def f(self):
        return 'base'

    def g(self, x):
        return 'base-g:' + x


class Derived(Base):
    """Widens ``f`` (0 -> 1 params); ``g`` is inherited unchanged."""

    def f(self, extra):
        return super().f() + '+' + extra


class Deeper(Derived):
    """A third level, widening ``f`` again (1 -> 2 params)."""

    def f(self, a, b):
        return super().f(a) + '+' + b


class PropHolder:
    """A genuine getter/setter pair -- both halves on ONE class."""

    def __init__(self):
        self._v = 'initial'

    @property
    def prop(self):
        return self._v

    @prop.setter
    def prop(self, value):
        self._v = value


class PropHeir(PropHolder):
    """Inherits the pair intact; it must still read as a value."""


def report():
    d = Derived()
    deep = Deeper()
    held = PropHolder()
    heir = PropHeir()

    # A bound-method handle taken off the instance, then called.
    handle = d.f
    got_handle = handle('h')

    # The same read through getattr, which takes the identical path.
    got_getattr = getattr(d, 'f')('ga')

    held.prop = 'assigned'

    return {
        # Widening: child keyword form over an inherited unary.
        'widen': d.f('x'),
        # An inherited method the subclass does NOT override still works.
        'inherited': d.g('i'),
        # The parent's own instance is untouched by the override.
        'base_f': Base().f(),
        'base_g': Base().g('y'),
        # Two levels of widening, each delegating up.
        'deep': deep.f('a', 'b'),
        # The override is reachable as a first-class object, not just as a call.
        'handle': got_handle,
        'getattr': got_getattr,
        'callable': callable(d.f),
        # Guards: a real property pair still reads as a VALUE, not a method.
        'prop_read': held.prop,
        'prop_inherited': heir.prop,
        'prop_not_callable': callable(held.prop),
    }


if __name__ == '__main__':
    for key, value in report().items():
        print(key, '=', repr(value))
