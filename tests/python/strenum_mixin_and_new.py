# StrEnum: a mixin in front of it, and the constructor it never had.
#
# Two defects, both reached by test_enum's test_strenum, and the first is the
# kind that looks like working code.
#
#     class DumbMixin:
#         def __str__(self): return "don't do this"
#     class DumbStrEnum(DumbMixin, StrEnum):
#         seven = '7'
#
# ``DumbStrEnum.seven'' answered the bare string '7'.  Not an error -- no member
# was built at all, because the mixin became the Smalltalk superclass and the
# enum metaclass protocol is copied down the SUPERCLASS chain.  Grail picks the
# superclass of a multi-base class by asking which base carries built-in
# storage, falling back to the deepest chain as a proxy for "the substantial
# base"; StrEnum's root (AbstractPyStr) sits directly under Object, so its chain
# is three long -- exactly tying a plain mixin -- and left-to-right preference
# handed it to the mixin.  ``class C(M, IntEnum)'' was right only by luck:
# AbstractPyInt sits under Number, so it beat the mixin on depth.
#
# Second, StrEnum had no __new__.  A member value is the argument list to str(),
# so ``three = b'3', 'ascii'`` means str(b'3', 'ascii') == '3' and each argument
# has its own complaint.  The value was stored as written instead, so ``three''
# became the literal string 'atuple' and every rejected spelling defined
# quietly.
#
# Every expectation here was checked against real CPython 3.14 -- this file is
# plain Python and needs no Grail.

import sys
from enum import Enum, StrEnum, IntEnum

r = {}

# --- a mixin in front of StrEnum -------------------------------------------------


class M:
    def hi(self):
        return 'hi'


class WithStr(M, StrEnum):
    seven = '7'


class WithInt(M, IntEnum):
    seven = 7


class WithEnum(M, Enum):
    seven = '7'


r['mixin_str'] = '%s/%r/%s' % (type(WithStr.seven).__name__,
                               WithStr.seven, isinstance(WithStr.seven, WithStr))
r['mixin_int'] = '%s/%r' % (type(WithInt.seven).__name__, WithInt.seven)
r['mixin_enum'] = '%s/%r' % (type(WithEnum.seven).__name__, WithEnum.seven)
r['mixin_members'] = repr(list(WithStr.__members__))
r['mixin_method'] = WithStr.seven.hi()

# The members are still strings, which is the whole point of StrEnum.
r['mixin_is_str'] = repr(isinstance(WithStr.seven, str))
r['mixin_eq'] = repr(WithStr.seven == '7')

# --- __str__ from the mixin wins -------------------------------------------------
# A StrEnum is a ReprEnum: it takes str's __str__ (the bare value) UNLESS the
# class body defines one.  This body does, so the mixin's wins -- and __format__
# follows __str__.


class DumbMixin:
    def __str__(self):
        return "don't do this"


class DumbStrEnum(DumbMixin, StrEnum):
    five = '5'
    seven = '7'
    __str__ = DumbMixin.__str__


r['dumb_eq'] = repr(DumbStrEnum.seven == '7')
r['dumb_str'] = str(DumbStrEnum.seven)
r['dumb_format'] = '{}'.format(DumbStrEnum.seven)

# An Enum-derived mixin does NOT define __str__, so the value spelling stays.


class EnumMixin(Enum):
    def hello(self):
        return 'hello'


class HelloEnum(EnumMixin, StrEnum):
    eight = '8'


class GoodbyeMixin:
    def goodbye(self):
        return 'bye'


class GoodbyeEnum(GoodbyeMixin, EnumMixin, StrEnum):
    nine = '9'


r['hello'] = '%r/%s' % (HelloEnum.eight == '8', str(HelloEnum.eight))
r['goodbye'] = '%r/%s' % (GoodbyeEnum.nine == '9', str(GoodbyeEnum.nine))

# --- StrEnum.__new__: a member value is str()'s argument list ---------------------


class GoodStrEnum(StrEnum):
    one = '1'
    two = '2'
    three = b'3', 'ascii'
    four = b'4', 'latin1', 'strict'


r['good'] = '%s,%s,%s,%s' % (GoodStrEnum.one.value, GoodStrEnum.two.value,
                             GoodStrEnum.three.value, GoodStrEnum.four.value)
r['good_repr'] = repr(GoodStrEnum.three)


def refusal(fn):
    try:
        fn()
    except TypeError as e:
        return str(e)
    return 'NOT RAISED'


def _not_a_string():
    class Bad(StrEnum):
        one = 1
        two = '2'


def _tuple_not_a_string():
    class Bad(StrEnum):
        one = '1'
        two = 2,
        three = '3'


def _plain_not_a_string():
    class Bad(StrEnum):
        one = '1'
        two = 2


def _bad_encoding():
    class Bad(StrEnum):
        one = '1'
        two = b'2', sys.getdefaultencoding


def _bad_errors():
    class Bad(StrEnum):
        one = '1'
        two = b'2', 'ascii', 9


r['not_a_string'] = refusal(_not_a_string)
r['tuple_not_a_string'] = refusal(_tuple_not_a_string)
r['plain_not_a_string'] = refusal(_plain_not_a_string)
r['bad_errors'] = refusal(_bad_errors)
# The encoding complaint quotes repr() of what it was handed, so the expected
# text is built the same way CPython's own test builds it.
r['bad_encoding'] = repr(refusal(_bad_encoding)
                         == 'encoding must be a string, not %r' % (sys.getdefaultencoding,))

# --- a class with its own __new__ decides its own values --------------------------
# CPython's StrEnum.__new__ is only the default; a subclass that defines one is
# not second-guessed.


class OwnNew(StrEnum):
    def __new__(cls, value, extra):
        obj = str.__new__(cls, value)
        obj._value_ = value
        obj.extra = extra
        return obj

    a = 'x', 'first'
    b = 'y', 'second'


r['own_new'] = '%s/%s/%s' % (OwnNew.a.value, OwnNew.a.extra, OwnNew.b.extra)

# --- (str, Enum) is NOT a StrEnum -------------------------------------------------
# It gets str's own constructor complaints, not StrEnum's -- which is the
# distinction test_strenum and test_custom_strenum draw between two otherwise
# identical class bodies.  A plain int value is simply coerced here.


class CustomStrEnum(str, Enum):
    pass


class Coerced(CustomStrEnum):
    one = 1
    two = '2'


r['custom_coerces'] = '%r/%s' % (Coerced.one.value, str(Coerced.one))
