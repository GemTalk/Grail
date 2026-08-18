"""Fixtures for the order ``Cls.name'' searches when a metaclass is involved.

Driven by PythonTests>>MetaclassLookupOrderTestCase.  Each check answers True
when Grail agrees with CPython.

THE RULE.  ``type.__getattribute__(cls, name)'' searches in three steps:

  1. ``type(cls).__mro__'' -- but a hit wins here only if it is a DATA
     descriptor;
  2. ``cls.__mro__'' -- and a plain function found here is returned UNBOUND;
  3. ``type(cls).__mro__'' again, now accepting anything.

So a class's own method outranks a plain method of the same name on its
metaclass, and only the metaclass's descriptors outrank the class.

WHAT WAS WRONG.  Grail ran step 3 before step 2, so a metaclass method SHADOWED
a method the class itself defines.  The symptom is quiet, which is why it
survived: ``Sub.both'' answered a bound method on the metaclass where CPython
answers the class's own function, so ``Sub.both()'' RAN the metaclass method and
returned a value instead of raising TypeError for the missing ``self''.  Nothing
crashed; the wrong method simply ran.

HOW IT SURFACED.  Through ``__dir__''.  CPython's traceback.py reaches a
metaclass ``__dir__'' by calling ``obj.__dir__()'' and catching the TypeError a
class receiver produces -- and that TypeError is precisely what step 2 has to
return an unbound function for.  With the steps reversed there was no TypeError,
so the metaclass ``__dir__'' was never consulted (test_traceback's
test_getattr_suggestions_with_custom___dir__).

Run this file under CPython (``python3 tests/python/metaclass_lookup_order.py'')
to see what it produces.
"""


class Meta(type):
    def both(cls):
        return 'from metaclass'

    def only_meta(cls):
        return 'from metaclass'

    def __dir__(cls):
        return ['from_metaclass_dir']


class Base:
    def both(self):
        return 'from class'

    def __dir__(self):
        return ['from_class_dir']

    both_attr = 'class attr'


class Sub(Base, metaclass=Meta):
    pass


class NoMeta(Base):
    """The control: same methods, no metaclass, so the question cannot arise."""
    pass


def _raises_typeerror(fn):
    try:
        fn()
    except TypeError:
        return True
    return False


# --- step 2 outranks step 3 ---------------------------------------------

def the_classes_own_method_wins_over_the_metaclasss():
    """Was 'from metaclass'.  Reached off the class it is UNBOUND, so calling it
    with no receiver is a TypeError rather than a value."""
    return _raises_typeerror(lambda: Sub.both())


def the_instance_still_gets_the_classes_method():
    return Sub().both() == 'from class'


def a_dunder_follows_the_same_rule():
    """``__dir__'' is the case that surfaced this; nothing about it is special."""
    return _raises_typeerror(lambda: Sub.__dir__())


def the_control_class_is_unaffected():
    return _raises_typeerror(lambda: NoMeta.both())


# --- step 3 still happens ----------------------------------------------

def a_metaclass_only_method_is_still_reachable():
    """The fix is a REORDER, not a removal: with no competing method on the
    class, the metaclass method is still found and still bound to the class."""
    return Sub.only_meta() == 'from metaclass'


def the_metaclass_dir_is_reachable_through_the_type():
    """Which is how CPython's traceback.py gets at it once step 2 has raised."""
    return type(Sub).__dir__(Sub) == ['from_metaclass_dir']


# --- data attributes were already right --------------------------------

def a_class_attribute_still_outranks_the_metaclass():
    return Sub.both_attr == 'class attr'


# --- the abc case the first attempt broke ------------------------------

def an_abcmeta_class_can_still_register():
    """``B.register(V)'' is a metaclass method, and the first version of this fix
    broke it: counting everything the Smalltalk chain owns as "the class's own"
    let Grail's instance-side ``__subclasshook__'' -- a CLASSMETHOD in CPython --
    outrank ABCMeta.  Step 2 asks only for methods compiled from a class body."""
    from abc import ABCMeta

    class B(metaclass=ABCMeta):
        pass

    class V:
        pass

    return B.register(V) is V


if __name__ == '__main__':
    checks = [
        the_classes_own_method_wins_over_the_metaclasss,
        the_instance_still_gets_the_classes_method,
        a_dunder_follows_the_same_rule,
        the_control_class_is_unaffected,
        a_metaclass_only_method_is_still_reachable,
        the_metaclass_dir_is_reachable_through_the_type,
        a_class_attribute_still_outranks_the_metaclass,
        an_abcmeta_class_can_still_register,
    ]
    for fn in checks:
        print('%-4s %s' % ('OK' if fn() is True else 'FAIL', fn.__name__))
