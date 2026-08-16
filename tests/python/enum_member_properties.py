# ``Enum.name`` and ``Enum.value`` are enum.property -- a DynamicClassAttribute
# -- in CPython, and were plain Smalltalk methods here.  The difference shows up
# in three places at once:
#
#     Enum.__dict__['name']      <enum.property object>   (Grail: an UnboundMethod)
#     Color.name                 AttributeError           (Grail: an UnboundMethod)
#     Color.CYAN.name            'CYAN'                   (the same either way)
#
# It is not a spelling difference.  inspect.getmembers DISCOVERS these two names
# by sweeping the bases for ``isinstance(v, DynamicClassAttribute)`` -- such a
# descriptor hides from dir(), so nothing else offers it -- and
# classify_class_attrs then reports kind 'data' for it, where an UnboundMethod is
# isroutine() and comes out 'method'.  So getmembers(Color) was missing 'name'
# and 'value' entirely.
#
# What made this possible at all: Enum had nowhere to PUT a class attribute.
# Every class ClassDefAst generates carries a per-class holder (``dynInstVars'')
# and the accessor pair for it; Enum is written in Smalltalk and had neither, so
# ___classHolderAttrStore___ -- and through it every class-level store -- died
# with ``a Enum class does not understand #'dynInstVars'''.
#
# test_enum TestStdLib.test_inspect_getmembers,
# TestStdLib.test_inspect_classify_class_attrs.

import inspect
import types
from enum import Enum, EnumType

r = {}


class Color(Enum):
    CYAN = 1
    MAGENTA = 2
    YELLOW = 3


# --- the descriptor itself ----------------------------------------------------------

r['dict_holds_descriptor'] = repr(
    [isinstance(Enum.__dict__[n], types.DynamicClassAttribute)
     for n in ('name', 'value')])

# Read twice: the descriptor is a stored object, not one built per access, so
# both tests can compare their result against ``Enum.__dict__['name']``.
r['descriptor_is_stable'] = repr(Enum.__dict__['name'] is Enum.__dict__['name'])

# --- class access is REFUSED --------------------------------------------------------
# The whole point of a DynamicClassAttribute: the enum CLASS keeps its own
# meaning for the name, so the class read must not answer the descriptor (which
# is what an ordinary property does) nor the getter.

_class_access = []
for _n in ('name', 'value'):
    try:
        getattr(Color, _n)
        _class_access.append('answered')
    except AttributeError:
        _class_access.append('AttributeError')
r['class_access_refused'] = repr(_class_access)

# --- instance access is UNCHANGED ---------------------------------------------------
# The hot path: a member's name and value are stored as instance state and read
# directly, so this never reaches the descriptor at all.

r['member_reads'] = repr([Color.CYAN.name, Color.CYAN.value])
r['sunder_reads'] = repr([Color.CYAN._name_, Color.CYAN._value_])

# --- which is what inspect needs ----------------------------------------------------

_members = dict(inspect.getmembers(Color))
r['getmembers_has_both'] = repr(
    [n in _members for n in ('name', 'value')])
r['getmembers_values_are_the_descriptors'] = repr(
    [_members['name'] is Enum.__dict__['name'],
     _members['value'] is Enum.__dict__['value']])
# dir() must NOT offer them -- that is what makes the bases sweep necessary.
r['dir_hides_them'] = repr(
    [n in dir(Color) for n in ('name', 'value')])

# --- Enum can now hold a class attribute at all -------------------------------------
# The store that used to raise.  Not an enum member: set after the class is
# built, so it is an ordinary class attribute.

Color.extra = 'set-later'
r['class_attribute_store'] = repr(Color.extra)
r['store_is_not_a_member'] = repr('extra' not in Color.__members__)

# --- the flag masks still refuse on a non-flag enum ---------------------------------
# _all_bits_ / _flag_mask_ / _singles_mask_ raise AttributeError for a plain
# Enum, deliberately -- answering 0 would make every enum look like an empty
# flag.  Pinned here because giving Enum a holder briefly made the secondary-base
# merge walk INTO Enum and evaluate these, which stopped test_enum importing.

_masks = []
for _n in ('_all_bits_', '_flag_mask_', '_singles_mask_'):
    try:
        getattr(Enum, _n)
        _masks.append('answered')
    except AttributeError:
        _masks.append('AttributeError')
r['plain_enum_has_no_masks'] = repr(_masks)


class Mixed(int, Enum):
    ONE = 1
    TWO = 2


r['int_mixin_still_builds'] = repr([Mixed.ONE.name, Mixed.ONE.value, int(Mixed.TWO)])
try:
    getattr(Mixed, 'name')
    r['int_mixin_class_access'] = 'answered'
except AttributeError:
    r['int_mixin_class_access'] = 'AttributeError'


# What CPython 3.14 answers, measured rather than assumed.
EXPECTED = {
    'class_access_refused': "['AttributeError', 'AttributeError']",
    'class_attribute_store': "'set-later'",
    'descriptor_is_stable': 'True',
    'dict_holds_descriptor': '[True, True]',
    'dir_hides_them': '[False, False]',
    'getmembers_has_both': '[True, True]',
    'getmembers_values_are_the_descriptors': '[True, True]',
    'int_mixin_class_access': 'AttributeError',
    'int_mixin_still_builds': "['ONE', 1, 2]",
    'member_reads': "['CYAN', 1]",
    'plain_enum_has_no_masks': "['AttributeError', 'AttributeError', 'AttributeError']",
    'store_is_not_a_member': 'True',
    'sunder_reads': "['CYAN', 1]",
}


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-40s %s %s' % (k, 'OK ' if actual == EXPECTED[k] else 'DIFF', actual))
