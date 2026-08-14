# __instancecheck__ / __subclasscheck__: the protocol isinstance() and
# issubclass() consult before doing their own work.
#
#     class ABC(type):
#         def __instancecheck__(cls, inst): ...
#         def __subclasscheck__(cls, sub): ...
#     class Integer(metaclass=ABC):
#         __subclass__ = {int}
#
#     isinstance(42, Integer)      -> ABC.__instancecheck__(Integer, 42)
#     issubclass(int, Integer)     -> ABC.__subclasscheck__(Integer, int)
#
# This is the whole ABC mechanism -- it is how a registered virtual subclass and
# __subclasshook__ become visible to isinstance.  Grail never looked, so a
# metaclass defining either was simply ignored and both builtins fell through to
# their own type walk.
#
# Three separate things had to work, and only the first is the obvious one:
#
#   * isinstance/issubclass must delegate to the metaclass hook.
#   * ``Integer.__subclasscheck__`` must RESOLVE -- a metaclass method reached
#     through the class, bound with the class as its cls parameter.  Grail
#     records a ``metaclass='' rather than building the class through it, so the
#     class is not a Smalltalk instance of the metaclass and ordinary lookup
#     found nothing.
#   * the same call from INSIDE a metaclass method must work.  There
#     ``cls.__subclasscheck__(c)'' compiles to a direct send rather than an
#     attribute load, so it bypasses the attribute path entirely and has to be
#     picked up where the send fails.
#
# ``cls.mro()`` is here for the same reason: a metaclass computing subclass
# relationships reaches for it, and Grail had only ``__mro__''.
#
# test_typechecks (the whole module).


class ABC(type):
    def __instancecheck__(cls, inst):
        return any(cls.__subclasscheck__(c) for c in {type(inst), inst.__class__})

    def __subclasscheck__(cls, sub):
        candidates = cls.__dict__.get("__subclass__", set()) | {cls}
        return any(c in candidates for c in sub.mro())


class Integer(metaclass=ABC):
    __subclass__ = {int}


class SubInt(Integer):
    pass


def isinstance_consults_the_metaclass():
    """42 is not an Integer by type; the metaclass says it is."""
    return isinstance(42, Integer) is True and isinstance(3.14, Integer) is False


def issubclass_consults_the_metaclass():
    return issubclass(int, Integer) is True and issubclass(float, Integer) is False


def the_tuple_form_consults_it_too():
    """A classinfo tuple recurses per element, so each element gets the hook."""
    return (isinstance(42, (Integer,)) is True
            and issubclass(int, (Integer,)) is True
            and isinstance(3.14, (Integer,)) is False)


def the_hook_resolves_as_an_attribute():
    """``Integer.__subclasscheck__`` is a metaclass method bound with the class
    as its cls parameter -- callable directly, not only through issubclass."""
    return (Integer.__subclasscheck__(int) is True
            and Integer.__subclasscheck__(float) is False)


def a_metaclass_method_may_call_its_sibling():
    """__instancecheck__ above calls cls.__subclasscheck__, which inside a
    compiled body is a direct send rather than an attribute load."""
    return isinstance(42, Integer) is True


def mro_is_callable_and_lists_the_class_first():
    m = SubInt.mro()
    return isinstance(m, list) and m[0] is SubInt and m[-1] is object


def inheritance_still_works_normally():
    """A subclass of a metaclass-using class behaves, and ordinary type checks
    are untouched."""
    return (issubclass(SubInt, Integer) is True
            and issubclass(Integer, SubInt) is False
            and isinstance(SubInt(), SubInt) is True
            and isinstance(42, SubInt) is False)


def ordinary_classes_are_unaffected():
    """No recorded metaclass, so no hook: the built-in walk decides."""
    class Plain:
        pass

    class PlainSub(Plain):
        pass

    return (isinstance(PlainSub(), Plain) is True
            and issubclass(PlainSub, Plain) is True
            and isinstance(42, int) is True
            and isinstance(42, str) is False)


# scripts/check_python_fixtures.sh runs this under CPython in CI.
if __name__ == '__main__':
    checks = [
        isinstance_consults_the_metaclass,
        issubclass_consults_the_metaclass,
        the_tuple_form_consults_it_too,
        the_hook_resolves_as_an_attribute,
        a_metaclass_method_may_call_its_sibling,
        mro_is_callable_and_lists_the_class_first,
        inheritance_still_works_normally,
        ordinary_classes_are_unaffected,
    ]
    for fn in checks:
        print('%-4s %s' % ('OK' if fn() is True else 'FAIL', fn.__name__))
