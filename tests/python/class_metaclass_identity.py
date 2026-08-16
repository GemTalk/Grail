# What is a class an INSTANCE of?
#
# CPython holds one invariant here: ``x.__class__ is type(x)``, for every x.
# Grail broke it for every class receiver, because the two spellings took
# different routes and neither was right:
#
#     Color.__class__     the per-class Smalltalk metaclass (``Color class'')
#     type(Color)         the single canonical ``type'' object
#
# so they were never the same object, and neither was EnumType.  The first leaks
# a GemStone artefact -- Grail gives every class its own metaclass, an anonymous
# thing with no Python name that no Python program should ever see.  The second
# is right for an ordinary class and wrong for one that really does have a
# metaclass.
#
# Both now go through one resolver, in CPython's order of authority: an explicit
# ``metaclass='' if the class statement wrote one, else a metaclass DECLARED by a
# Smalltalk-written ancestor (only Enum does, answering EnumType), else ``type''.
# The ancestor search runs along the Python MRO, not the Smalltalk superclass
# chain, so an enum that reaches Enum through a SECONDARY base is covered too.
#
# test_enum TestStdLib.test_inspect_getmembers, which asserts
# inspect.getmembers(Color)['__class__'] is EnumType.

from abc import ABC, ABCMeta
from enum import Enum, EnumType, IntEnum, StrEnum

r = {}


class Color(Enum):
    CYAN = 1
    MAGENTA = 2


class Mixed(int, Enum):
    ONE = 1


class Plain:
    pass


class Derived(Plain):
    pass


# --- the invariant -------------------------------------------------------------------
# ``x.__class__ is type(x)'' for a class, for an instance, and for a scalar.

r['invariant_classes'] = repr(
    [Color.__class__ is type(Color),
     Plain.__class__ is type(Plain),
     Mixed.__class__ is type(Mixed)])
r['invariant_instances'] = repr(
    [Color.CYAN.__class__ is type(Color.CYAN),
     Plain().__class__ is type(Plain()),
     (1).__class__ is type(1)])

# --- an enum's metaclass is EnumType ---------------------------------------------------

r['enum_metaclass'] = repr(
    [type(Color) is EnumType, Color.__class__ is EnumType])

# Reached through a SECONDARY base: ``class Mixed(int, Enum)'' is rooted at
# Grail's int, so its Smalltalk chain never passes Enum and only the MRO walk
# finds it.  CPython gets here by picking the most derived metaclass among the
# bases -- type(int) is type, type(Enum) is EnumType, EnumType wins.
r['secondary_base_metaclass'] = repr(type(Mixed) is EnumType)

# The Smalltalk-written enum roots are the same shape as Mixed and cannot use
# the same answer: they have no registered bases for a walk to find, so each
# declares EnumType itself.
r['enum_roots_metaclass'] = repr(
    [type(IntEnum) is EnumType, type(StrEnum) is EnumType])

# --- an ordinary class's metaclass is type ---------------------------------------------

r['plain_metaclass'] = repr(
    [type(Plain) is type, type(Derived) is type])
# ...and that stays consistent with isinstance, which is the other half of the
# same question and keys off a different test entirely.
r['isinstance_agrees'] = repr(
    [isinstance(Plain, type), isinstance(Color, type),
     isinstance(Color, EnumType), isinstance(Plain, EnumType)])

# --- subclassing a metaclass still succeeds --------------------------------------------
# ``class auto_enum(type(Enum))'' is how a Python program writes a metaclass, and
# it must not raise even though Grail does not model metaclasses.  It used to
# reach the class machinery as the canonical ``type'' -- a BoundMethod, which had
# a graceful path -- ONLY because type(Enum) answered ``type''.  Once type() told
# the truth, the same line arrived as a metaclass and needed the same path.

class auto_enum(type(Enum)):
    def __new__(metacls, cls, bases, classdict):
        return super().__new__(metacls, cls, bases, classdict)


r['metaclass_subclass_builds'] = repr(auto_enum.__name__)

# --- scalars are unaffected -------------------------------------------------------------
# type() has always asked __class__, and several Python types are backed by more
# than one GemStone class -- an int is a SmallInteger, and __class__ is what
# normalises it.  Answering ``self class'' instead broke eleven test_enum tests.

r['scalar_types'] = repr(
    [type(1) is int, type(1.5) is float, type(True) is bool, type([]) is list])


# What CPython 3.14 answers, measured rather than assumed.
EXPECTED = {
    'enum_metaclass': '[True, True]',
    'enum_roots_metaclass': '[True, True]',
    'invariant_classes': '[True, True, True]',
    'invariant_instances': '[True, True, True]',
    'isinstance_agrees': '[True, True, True, False]',
    'metaclass_subclass_builds': "'auto_enum'",
    'plain_metaclass': '[True, True]',
    'scalar_types': '[True, True, True, True]',
    'secondary_base_metaclass': 'True',
}

# KNOWN GAP, recorded rather than endorsed: an explicit ``metaclass='' is not
# what type() answers.  Grail RECORDS a metaclass rather than routing class
# creation through one, and reporting the record was tried and reverted -- copy()
# decides a class is atomic with ``issubclass(type(x), type)'', and Grail roots
# ``class Meta(type)'' at object (the documented degradation for a base it cannot
# model), so nothing links Meta back to ``type''.  The line below is why: with
# type(C) still ``type'' the atomic branch is reached directly, and claiming Meta
# instead broke two test_copy tests.  Closing this means making a class that
# subclasses ``type'' remember that it did, not changing the rule here.
#
# CPython is expected to DISAGREE with both values -- if it ever agrees, the gap
# has closed and these checks are stale.


class Meta(type):
    pass


class WithMeta(metaclass=Meta):
    pass


r['explicit_metaclass_is_a_known_gap'] = repr(
    [type(ABC) is ABCMeta, type(WithMeta) is Meta])
r['subclass_of_type_is_a_known_gap'] = repr(issubclass(Meta, type))

GRAIL_ONLY = {
    'explicit_metaclass_is_a_known_gap': '[False, False]',
    'subclass_of_type_is_a_known_gap': 'False',
}


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-30s %s %s' % (k, 'OK ' if actual == EXPECTED[k] else 'DIFF', actual))
    for k in sorted(GRAIL_ONLY):
        actual = r[k]
        print('%-30s %s %s' % (k, 'XPASS' if actual == GRAIL_ONLY[k] else 'XFAIL', actual))
