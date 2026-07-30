"""Class-body METHOD decorators, and the attribute-lookup rule they need.

``@deco def m'' inside a class body rebinds m to deco(m).  CPython does that
while the class body executes, so the class dict only ever holds the wrapper.
Grail compiles the def to a real Smalltalk method first, so the decorator can
only run once the class exists and stores OVER the compiled method -- which
works only because a class-attribute store now SHADOWS a compiled method of the
same name on both the class and the instance path.

That shadowing rule is independently a monkey-patching fix: ``A.m = f'' used to
be visible as ``A.m`` yet ``a.m()`` still ran the original.
"""
import functools


def deco(fn):
    def wrapper(self, x):
        return ('wrapped', fn(self, x))
    return wrapper


def tag(label):
    def outer(fn):
        def inner(self, *args):
            return label + '(' + str(fn(self, *args)) + ')'
        return inner
    return outer


def wrapsdeco(fn):
    @functools.wraps(fn)
    def wrapper(self, *args):
        return ('W', fn(self, *args))
    return wrapper


def boom(fn):
    raise RuntimeError('this decorator always fails')


class Simple:
    @deco
    def m(self, x):
        return ('orig', x)


class Stacked:
    @tag('OUT')
    @tag('IN')
    def m(self):
        return 'base'


class Wrapped:
    @wrapsdeco
    def m(self, x):
        return x * 2


class Failing:
    @boom
    def m(self):
        return 'survived'


class Declarative:
    cls_attr = 7

    @staticmethod
    def s(x):
        return ('static', x)

    @classmethod
    def c(cls, x):
        return ('classm', cls.cls_attr, x)

    @property
    def p(self):
        return 'prop'

    @property
    def rw(self):
        return getattr(self, '_rw', 'unset')

    @rw.setter
    def rw(self, v):
        self._rw = v


class Base:
    @tag('B')
    def m(self):
        return 'base-impl'


class Derived(Base):
    pass


class OverrideSuper(Base):
    @tag('D')
    def m(self):
        return 'derived+' + super().m()


class Dunder:
    @tag('INIT')
    def __init__(self):
        self.made = True

    @wrapsdeco
    def __repr__(self):
        return 'dunder-repr'


class Patchable:
    def m(self, x):
        return ('orig', x)


def decorator_is_applied():
    return Simple().m(1) == ('wrapped', ('orig', 1))


def decorator_applied_to_fresh_and_existing_instances():
    """The store is on the CLASS, so instances made before and after see it."""
    before = Simple()
    return before.m(1) == ('wrapped', ('orig', 1)) \
        and Simple().m(1) == ('wrapped', ('orig', 1))


def stacked_decorators_apply_bottom_up():
    """``@tag('OUT') @tag('IN') def m'' is OUT(IN(m)) -- nearest the def runs
    first."""
    return Stacked().m() == 'OUT(IN(base))'


def wraps_copies_name_off_the_unbound_method():
    """functools.wraps reads __name__/__qualname__ off what it is handed, which
    for a class-body decorator is the UnboundMethod for ``Cls.m''.  Those reads
    used to raise AttributeError, and update_wrapper SILENTLY skips a name it
    cannot read -- so the wrapper kept its own name and @wraps looked like a
    no-op."""
    return Wrapped().m(3) == ('W', 6) and Wrapped.m.__name__ == 'm'


def unbound_method_reports_its_own_metadata():
    return Plain.m.__name__ == 'm' and Plain.m.__qualname__ == 'Plain.m'


class Plain:
    def m(self, x):
        return x


def failing_decorator_leaves_the_method_intact():
    """Strictly additive: a decorator that raises must leave the compiled
    method in place -- exactly the old behaviour of dropping the decorator --
    rather than breaking the class."""
    return Failing().m() == 'survived'


def declarative_decorators_are_untouched():
    """@staticmethod / @classmethod / @property are handled at parse time by
    re-classing the def; applying them again would double-handle them."""
    d = Declarative()
    return Declarative.s(1) == ('static', 1) \
        and d.s(1) == ('static', 1) \
        and Declarative.c(2) == ('classm', 7, 2) \
        and d.c(2) == ('classm', 7, 2) \
        and d.p == 'prop'


def property_setter_still_works():
    d = Declarative()
    before = d.rw
    d.rw = 'written'
    return before == 'unset' and d.rw == 'written'


def decorated_method_is_inherited():
    return Derived().m() == 'B(base-impl)'


def super_sees_the_parents_decorated_method():
    """super() has its own lookup, which walked compiled methods only -- so it
    ran the parent's UNDECORATED method and gave 'D(derived+base-impl)'."""
    return OverrideSuper().m() == 'D(derived+B(base-impl))'


def dunders_can_be_decorated():
    return Dunder().made is True and repr(Dunder()) == 'dunder-repr'


def monkey_patching_a_method_is_visible_through_instances():
    """The independent bug: the store landed on the class and ``A.m'' saw it,
    but the instance read hit the compiled-method wrap first, so ``a.m()'' kept
    running the original."""
    existing = Patchable()
    Patchable.m = deco(Patchable.m)
    return existing.m(1) == ('wrapped', ('orig', 1)) \
        and Patchable().m(1) == ('wrapped', ('orig', 1)) \
        and Patchable.m(existing, 1) == ('wrapped', ('orig', 1))


def non_callable_class_attribute_shadows_a_method():
    """Assigning a non-callable over a method makes reads answer the value, not
    a bound method -- CPython replaces the class-dict entry outright."""
    class Shadowed:
        def m(self):
            return 'method'

    Shadowed.m = 'NOT-CALLABLE'
    return Shadowed().m == 'NOT-CALLABLE'


def class_accessed_method_is_callable():
    """callable(Cls.m) -- an UnboundMethod implements the call protocol as
    value:value: rather than __call__, so callable() answered False.  unittest's
    own discovery depends on this: getTestCaseNames keeps a name only when
    ``callable(getattr(cls, name))'', so a test method a decorator had rebound
    silently vanished from discovery."""
    return callable(Plain.m) and callable(Simple.m) and callable(Plain().m)


def unbound_method_is_callable_through_a_binding():
    """A decorator returning its argument unchanged (@unittest.skip and friends)
    leaves an UnboundMethod as the class attribute; reading it through an
    instance must bind self."""

    def identity(fn):
        return fn

    class Ident:
        @identity
        def m(self, x):
            return ('ident', x)

    return Ident().m(5) == ('ident', 5)
