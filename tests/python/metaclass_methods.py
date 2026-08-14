"""A ``metaclass=`` keyword makes the metaclass's methods reachable on the class.

Grail records a metaclass rather than building the class through one, so the
methods it contributes have to be found by the attribute path (and, for a
self-send inside the metaclass itself, by the DNU handler) instead of by
ordinary Smalltalk inheritance.  ``abc.ABCMeta`` is the case that matters:
``register`` / ``__subclasscheck__`` / ``__instancecheck__`` live there and
nowhere else, so before this a class using it could not register anything.

Every expectation below was checked against CPython 3.13.
"""

from abc import ABCMeta

RESULTS = {}


def check(name, fn, expected):
    try:
        RESULTS[name] = (fn() == expected)
    except Exception as exc:  # a raised error is a failure, not a crash
        RESULTS[name] = 'raised %s: %s' % (type(exc).__name__, exc)


# --------------------------------------------------------------- ABCMeta

class Base:
    pass


class B(Base, metaclass=ABCMeta):
    pass


class V(Base):
    pass


class NotV(Base):
    pass


check('register_returns_argument', lambda: B.register(V), V)
check('register_is_reachable', lambda: hasattr(B, 'register'), True)
check('virtual_issubclass', lambda: issubclass(V, B), True)
check('virtual_isinstance', lambda: isinstance(V(), B), True)
# Registration is not contagious: an unregistered sibling stays outside.
check('unregistered_is_not_subclass', lambda: issubclass(NotV, B), False)
check('unregistered_is_not_instance', lambda: isinstance(NotV(), B), False)
# A real subclass of a registered class is a subclass of the ABC too.
class SubV(V):
    pass
check('subclass_of_registered', lambda: issubclass(SubV, B), True)
# ...and a real subclass of the ABC needs no registration at all.
class RealSub(B):
    pass
check('real_subclass_without_register', lambda: issubclass(RealSub, B), True)


# The metaclass is INHERITED, so a subclass of an ABC can register too --
# this is what makes ``class Foo(SomeABC)`` usable.
class Derived(B):
    pass


class W(Base):
    pass


check('inherited_metaclass_register', lambda: Derived.register(W), W)
check('inherited_metaclass_issubclass', lambda: issubclass(W, Derived), True)
# Registering on the DERIVED class reaches the base as well: W is a virtual
# subclass of Derived, and Derived is a real subclass of B.
check('derived_registration_reaches_base', lambda: issubclass(W, B), True)


# --------------------------------------------- a metaclass that is not an ABC

class Meta(type):
    """Plain metaclass: its methods must be reachable on the using class, and a
    self-send from one of its methods must find its siblings."""

    def tag(cls):
        return 'tag:' + cls.__name__

    def describe(cls, prefix):
        # A SELF-SEND to a sibling metaclass method.  Codegen takes the
        # fast path here (``cls`` is the receiver), so this only resolves
        # through the DNU handler's metaclass consult.
        return prefix + '/' + cls.tag()

    def with_defaults(cls, a, b=2, *rest):
        return (cls.__name__, a, b, rest)


class Uses(metaclass=Meta):
    pass


check('metaclass_method_reachable', lambda: Uses.tag(), 'tag:Uses')
check('metaclass_self_send', lambda: Uses.describe('p'), 'p/tag:Uses')
check('metaclass_varargs', lambda: Uses.with_defaults(1),
      ('Uses', 1, 2, ()))
check('metaclass_varargs_full', lambda: Uses.with_defaults(1, 5, 9),
      ('Uses', 1, 5, (9,)))


# A metaclass method is NOT part of the instance protocol: only the class
# object gets it, exactly as in CPython.
def _instance_has_no_tag():
    try:
        Uses().tag()
    except AttributeError:
        return 'AttributeError'
    return 'no error'


check('metaclass_method_not_on_instance', _instance_has_no_tag,
      'AttributeError')


# --------------------------------------------------- object.__subclasshook__

# The default hook DECLINES rather than answering False -- that is what lets
# ABCMeta fall through to the registry.  It used to raise outright, which is
# why nothing could consult it.
check('default_subclasshook_declines',
      lambda: Base().__subclasshook__(int) is NotImplemented, True)


# ---------------------------------------------------------------- cls.mro()

# A metaclass that decides __subclasscheck__ by hand needs the hierarchy as a
# LIST, which is the form ``mro()`` answers and ``__mro__`` does not.  Only
# properties that hold in both CPython and Grail are asserted: Grail's chain
# has an extra internal root, so the two linearizations are not equal.
class MroBase:
    pass


class MroDerived(MroBase):
    pass


check('mro_is_a_list', lambda: isinstance(MroDerived.mro(), list), True)
check('mro_starts_at_self', lambda: MroDerived.mro()[0] is MroDerived, True)
check('mro_includes_base', lambda: MroBase in MroDerived.mro(), True)
check('mro_ends_at_object', lambda: MroDerived.mro()[-1] is object, True)
check('mro_matches_dunder',
      lambda: MroDerived.mro() == list(MroDerived.__mro__), True)
# Fresh list each call, so a caller mutating it cannot disturb the class.
def _mro_is_fresh():
    first = MroDerived.mro()
    first.append('scribble')
    return len(MroDerived.mro()) == len(first) - 1


check('mro_is_a_fresh_list', _mro_is_fresh, True)
