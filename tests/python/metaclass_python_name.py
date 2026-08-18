# What is an enum's METACLASS called?
#
# CPython names a metaclass in its own right: ``type(Color)`` is ``EnumType``,
# and ``repr(type(Color))`` is ``<class 'enum.EnumType'>``.  Grail names one
# after the Smalltalk class it belongs to -- ``Enum class'' -- and, worse,
# could not answer at all: __name__ and __qualname__ are written on
# ``object class'', and a metaclass's own class chain runs to Metaclass3 rather
# than through it, so both fell through to the generic method wrap and
# ``type(Color).__name__'' answered an UnboundMethod.  repr() asks for
# __qualname__ and printed the Smalltalk name whenever the answer came back as
# anything but a string, which is how ``<class 'enum.Enum class'>'' reached the
# outside world.
#
# Not cosmetic once pydoc is in the picture: test_enum's TestStdLib.test_pydoc
# expects the sections ``Static methods inherited from enum.EnumType:'' and
# ``Readonly properties inherited from enum.EnumType:'', and pydoc builds those
# headings from the defining class's name.
#
# Grail has THREE separate metaclass roots -- a data-rooted enum's chain reaches
# IntEnum class or StrEnum class and never Enum class -- so each has to declare
# the name, and every one of them is EnumType upstream.
#
# test_enum TestStdLib.test_pydoc.

from enum import Enum, IntEnum, StrEnum, Flag, IntFlag, EnumType

r = {}


class Color(Enum):
    CYAN = 1


class Number(IntEnum):
    ONE = 1


class Word(StrEnum):
    A = 'a'


class Bits(Flag):
    X = 1


class IntBits(IntFlag):
    X = 1


class Meta(type):
    pass


class WithMeta(metaclass=Meta):
    pass


# --- every enum root's metaclass is EnumType --------------------------------------

r['enum_metaclass_names'] = repr(
    [type(c).__name__ for c in (Color, Number, Word, Bits, IntBits)])
r['enum_metaclass_qualnames'] = repr(
    [type(c).__qualname__ for c in (Color, Number, Word, Bits, IntBits)])
r['enum_metaclass_is_enumtype'] = repr(
    [type(c) is EnumType for c in (Color, Number, Word, Bits, IntBits)])

# --- and it reprs as one ------------------------------------------------------------
# repr() asks the class for __qualname__ and __module__; the module half already
# worked, which is what made the name half easy to miss.

r['enum_metaclass_repr'] = repr(repr(type(Color)))
r['enum_metaclass_module'] = repr(type(Color).__module__)

# --- classes that were never affected -------------------------------------------------
# A metaclass written in PYTHON is an ordinary class object and always answered;
# so did ``type`` itself.  Both are here so a regression says which half broke.

r['python_metaclass_name'] = repr(type(WithMeta).__name__)
r['type_name'] = repr(type(object).__name__)
r['class_name'] = repr(Color.__name__)

# --- the name is one object, not a fresh copy -----------------------------------------
# The same interning ``cls.__name__'' needs; see
# tests/python/inspect_classify_class_attrs.py for why identity is load-bearing.

r['metaclass_name_is_stable'] = repr(
    [type(Color).__name__ is type(Color).__name__,
     type(Color).__qualname__ is type(Color).__qualname__])


EXPECTED = {
    'class_name': "'Color'",
    'enum_metaclass_is_enumtype': '[True, True, True, True, True]',
    'enum_metaclass_module': "'enum'",
    'enum_metaclass_names': "['EnumType', 'EnumType', 'EnumType', 'EnumType', 'EnumType']",
    'enum_metaclass_qualnames': "['EnumType', 'EnumType', 'EnumType', 'EnumType', 'EnumType']",
    'enum_metaclass_repr': '"<class \'enum.EnumType\'>"',
    'metaclass_name_is_stable': '[True, True]',
    'python_metaclass_name': "'Meta'",
    'type_name': "'type'",
}

GRAIL_ONLY = {}


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-32s %s %s' % (k, 'OK ' if actual == EXPECTED[k] else 'DIFF', actual))
    for k in sorted(GRAIL_ONLY):
        actual = r[k]
        print('%-32s %s %s' % (k, 'XFAIL' if actual != GRAIL_ONLY[k] else 'XPASS', actual))
