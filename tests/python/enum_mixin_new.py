# CPython _find_new_ clause 2: when an enum's class body defines no __new__ of
# its own but the mixed-in DATA TYPE supplies one, members are built as
# ``member_type.__new__(cls, *args)''.  That call is what sets both _value_ and
# the mixin's own instance slots.
#
# Grail only ever honoured a __new__ defined ON the enum class (plus, narrowly,
# an inherited enum one), so a NamedInt-style mixin never ran: members were bare
# allocations holding the raw class-body tuple.
#
# Three further defects surfaced underneath it, each of which had to be fixed
# before the next became visible:
#
#   * ``int.__repr__(x)'' on an int SUBCLASS instance ran Integer's method
#     non-virtually against an AbstractPyInt-rooted object and fell through to
#     Smalltalk's printString -- ``aNamedInt''.  Nothing to do with enums.
#   * the super().__new__ guard fired for ANY super().__new__ during member
#     construction, including a data mixin's, where CPython's error cannot
#     arise because the walk never reaches Enum.__new__.
#   * AbstractPyInt>>value read one level, so once _value_ legitimately held
#     another wrapper (CPython's member_type(*args)), __index__/__int__ handed
#     back a wrapper and broke their own "always an integer" contract.

from enum import Enum
import enum

r = {}

# --- the unbound builtin on a subclass instance -------------------------------

class PlainInt(int):
    pass


_p = PlainInt(5)
r['unbound_repr'] = int.__repr__(_p)
r['unbound_str'] = int.__str__(_p)
r['objclass_is_int'] = int.__str__.__objclass__ is not object

# --- _find_new_ clause 2: the data mixin's __new__ builds the member ----------

class NamedInt(int):
    def __new__(cls, *args):
        _args = args
        name, *args = args
        if len(args) == 0:
            raise TypeError("name and value must be specified")
        self = int.__new__(cls, *args)
        self._intname = name
        self._args = _args
        return self

    @property
    def __name__(self):
        return self._intname

    def __repr__(self):
        return "{}({!r}, {})".format(
            type(self).__name__, self.__name__, int.__repr__(self))


class NEI(NamedInt, Enum):
    x = ('the-x', 1)
    y = ('the-y', 2)


r['plain_named'] = repr(NamedInt('test', 5))
r['member_intname'] = NEI.x.__name__
r['member_value_eq'] = NEI.y.value == 2
r['member_is_named'] = isinstance(NEI.x, NamedInt)
r['new_is_enum_new'] = NEI.__new__ is Enum.__new__

# --- a data mixin MAY delegate to super().__new__ -----------------------------
# The guard exists for an __new__ in the ENUM's own body, whose super() walk
# reaches Enum.__new__.  MyInt is a plain int subclass, so its super() reaches
# int.__new__ and must be left alone.

class MyInt(int):
    def __new__(cls, value):
        return super().__new__(cls, value)


class HexMixin:
    def __repr__(self):
        return hex(self)


class MyIntEnum(HexMixin, MyInt, enum.Enum):
    __repr__ = HexMixin.__repr__


class Foo(MyIntEnum):
    TEST = 1


r['foo_isinstance'] = isinstance(Foo.TEST, MyInt)
r['foo_member_type'] = Foo._member_type_ is MyInt
r['foo_repr'] = repr(Foo.TEST)

# An __new__ in the enum's OWN body calling the data type directly is fine.

class Fee(MyIntEnum):
    TEST = 1

    def __new__(cls, value):
        value += 1
        member = int.__new__(cls, value)
        member._value_ = value
        return member


r['fee_value'] = Fee.TEST == 2

# ...while one that delegates to super() is still the rejected shape.
# Defined inside a function, as test_bad_new_super does: a class body directly
# inside a module-level ``try'' does not get its ___cell_<name>___ closure cell
# stored in time, so super() sees nil and raises a DIFFERENT TypeError -- an
# unrelated codegen gap that would mask what this case is checking.


def _bad_super():
    try:
        class BadSuper(Enum):
            def __new__(cls, value):
                return super().__new__(cls, value)
            failed = 1
        return 'no error'
    except TypeError as e:
        return 'TypeError' if 'do not use' in str(e) else str(e)


r['bad_super'] = _bad_super()

# --- the integer-conversion contract survives a wrapped _value_ ---------------

r['index_is_plain'] = type(Foo.TEST.__index__()) is int
r['int_is_plain'] = type(Foo.TEST.__int__()) is int
r['hex_works'] = hex(Foo.TEST)

# --- a plain int/str enum is untouched by any of this -------------------------

class Ordinary(int, Enum):
    a = 1
    b = 2


r['ordinary'] = ','.join('%s=%r' % (m.name, m.value) for m in Ordinary)
