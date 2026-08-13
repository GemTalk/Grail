# PEP 3115's ``__prepare__``: the mapping a class body is executed in.
#
#     class Meta(type):
#         @classmethod
#         def __prepare__(metacls, cls, bases, **kwds):
#             return EnumDict(cls)
#
# CPython asks the metaclass for a namespace BEFORE running the body, runs the
# body against it, and hands it to the metaclass afterwards.  A namespace that
# watches the writes can then refuse one -- which is the whole point of
# enum.EnumDict.
#
# Grail had no class-body namespace at all: a body compiles to accessor stores
# on the class.  This is the FIRST STAGE of giving it one.  What it covers and
# what it does not is pinned below, because the difference is the whole shape of
# the remaining work -- see docs/Class_Body_Namespace.md.
#
# test_enum TestEnumDict.test_enum_dict_in_metaclass.

from enum import EnumDict

r = {}

# --- a namespace that records what it is offered ----------------------------------

seen = []


class Watch(dict):
    def __setitem__(self, k, v):
        seen.append(k)
        dict.__setitem__(self, k, v)


class WatchMeta(type):
    @classmethod
    def __prepare__(metacls, cls, bases, **kwds):
        return Watch()


class Covered(metaclass=WatchMeta):
    """A docstring, which CPython also puts in the namespace."""

    plain = 1

    with open('/dev/null') as handle:
        in_with = 2

    if True:
        in_if = 3

    def method(self):
        pass

    class Nested:
        pass


r['seen'] = repr(seen)

# The values still land on the class, unchanged.
r['plain'] = repr(Covered.plain)
r['in_with'] = repr(Covered.in_with)
r['in_if'] = repr(Covered.in_if)

# --- what the namespace is FOR: refusing a write ----------------------------------


class EnumDictMeta(type):
    @classmethod
    def __prepare__(metacls, cls, bases, **kwds):
        return EnumDict(cls)


try:
    class Duplicate(metaclass=EnumDictMeta):
        a = 1
        a = 2
    r['duplicate'] = 'NOT RAISED'
except TypeError as e:
    r['duplicate'] = str(e)

# The same refusal reaches a binding inside a COMPOUND statement, which is where
# test_enum puts it -- inside a ``with`` block, not at body level.


class _Ctx:
    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False


try:
    class DuplicateInWith(metaclass=EnumDictMeta):
        a = 1
        with _Ctx():
            a = 2
    r['duplicate_in_with'] = 'NOT RAISED'
except TypeError as e:
    r['duplicate_in_with'] = str(e)

# A reserved sunder is the namespace's other complaint, and a ValueError.
try:
    class Sunder(metaclass=EnumDictMeta):
        _a_sunder_ = 3
    r['sunder'] = 'NOT RAISED'
except ValueError as e:
    r['sunder'] = str(e)

# --- EnumDict(cls_name) -----------------------------------------------------------
# CPython's EnumDict records the class name so a MANGLED PRIVATE name can be told
# from a reserved sunder.  The inherited dict constructor reads a positional
# argument as the mapping to build FROM, so ``EnumDict('Color')`` used to raise
# -- which is what a __prepare__ returning EnumDict(cls) hit, silently.

d = EnumDict('Colour')
d['x'] = 1
r['enumdict_named'] = '%s:%r' % (type(d).__name__, d['x'])
r['enumdict_bare'] = type(EnumDict()).__name__

# --- a class with no metaclass is untouched ---------------------------------------

calls = []


def _f(tag):
    calls.append(tag)
    return tag


class Ordinary:
    a = _f('first')
    a = _f('second')


r['ordinary_calls'] = repr(calls)
r['ordinary_value'] = repr(Ordinary.a)

# --- an ENUM gets one without naming a metaclass -----------------------------------
# Grail's enum metaclass is Smalltalk (``Enum class''), so there is no
# ``metaclass='' keyword to carry it.  The namespace comes from the metaclass
# chain instead, which is why the gate on an explicit keyword had to go.

import enum


class Ordinal(enum.Enum):
    RED = 1
    GREEN = 2


r['enum_members'] = repr([m.name for m in Ordinal])

# A reused member name is refused WHERE IT IS WRITTEN, so the value reported is
# the one the mapping already holds -- CPython's reading, and a deviation Grail
# used to record: the metaclass hook noticed the clash only after the earlier
# store was gone, and named the surviving value instead.
try:
    class Dup(enum.Enum):
        red = 1
        green = 2
        red = 4
    r['enum_duplicate'] = 'NOT RAISED'
except TypeError as e:
    r['enum_duplicate'] = str(e)

# Autos, aliases and ordinary members are all unaffected.


class Flags(enum.Flag):
    A = enum.auto()
    B = enum.auto()


r['enum_autos'] = '%d,%d' % (Flags.A.value, Flags.B.value)


class Aliased(enum.Enum):
    CANON = 1
    OTHER = 2
    ALIAS = 1


r['enum_alias'] = repr(Aliased.ALIAS is Aliased.CANON)

# --- KNOWN GAPS, recorded rather than endorsed ------------------------------------
# Stage 1 routes ASSIGNMENTS -- at body level and inside compound statements.
# A ``def`` and a nested ``class`` bind a name too, and CPython's namespace sees
# both; here they have their own emission paths and still bypass it.  ``seen``
# above shows exactly that: 'method' and 'Nested' are absent.

r['def_seen_a_known_gap'] = repr('method' in seen)
r['nested_class_seen_a_known_gap'] = repr('Nested' in seen)

# ``vars()`` inside a class body answers a plain dict rather than the live
# namespace, so the write-into-vars() idiom (test_enum's test_ignore) is not
# reached by this stage.


class VarsProbe(metaclass=WatchMeta):
    v = vars()
    kind = type(v).__name__


r['vars_in_body_a_known_gap'] = VarsProbe.kind

# ``auto()`` is still resolved in a later pass rather than at assignment, so a
# body that USES a member it just defined sees the unresolved marker.  The
# read-back needed for it is in place -- the namespace's value is what lands on
# the class -- but EnumDict does not yet call _generate_next_value_ on the way
# in.  This is what test_enum's test_using_members_as_nonmember needs.
try:
    class Combining(enum.Flag):
        A = enum.auto()
        B = enum.auto()
        ALL = enum.nonmember(A | B)
    r['auto_at_assignment_a_known_gap'] = repr(Combining.ALL)
except TypeError as e:
    r['auto_at_assignment_a_known_gap'] = type(e).__name__

# An INHERITED metaclass is not asked, because Grail does not install a Python
# metaclass as the Smalltalk metaclass -- a subclass has nothing here to ask.
# That is a pre-existing modelling gap rather than one this stage introduces,
# and it is what confines the change to class statements naming a metaclass.

del seen[:]


class Inherits(Covered):
    y = 1


r['inherited_metaclass_a_known_gap'] = repr(seen)
