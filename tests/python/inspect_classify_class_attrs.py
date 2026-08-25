# ``inspect.classify_class_attrs`` -- where did this attribute come from, and
# what kind is it?  Grail had neither it nor ``inspect.Attribute``, so
# ``from inspect import Attribute`` was an ImportError and test_enum's
# TestStdLib.test_inspect_classify_class_attrs never ran a line of its body.
#
# Ported from CPython rather than approximated, because every part of it is
# load-bearing: the search covers the METACLASS mro as well as the class mro, so
# an attribute stored on the metaclass reports that metaclass as its home rather
# than None; ``kind'' is read off the __dict__ entry rather than the getattr
# result, because the two differ exactly where the answer is interesting (a
# staticmethod reached through getattr is a plain function); and
# DynamicClassAttributes are appended to the candidate names because they hide
# from dir().
#
# Two adaptations, both forced and both narrowing:
#
#   * CPython builds the metaclass mro as ``getmro(type(cls))'' less type and
#     object.  Taken literally that walks into GemStone's own metaclass chain
#     (Class, Metaclass3, Module, Behavior), which is not made of Python objects
#     and blows up on contact.  The metaclasses OF THE CLASSES IN THE MRO are
#     the same set for anything Grail models, and stay inside Python.
#   * CPython asks the metaclass's ``__getattr__'' slot UNBOUND, as
#     ``srch_cls.__getattr__(cls, name)''.  A Grail metaclass is an ordinary
#     class object, so that comes back BOUND and the two arguments arrive one
#     too many -- the mismatch dies as a MessageNotUnderstood Python cannot
#     catch.  A plain getattr on the metaclass asks the same question.
#
# test_enum TestStdLib.test_inspect_classify_class_attrs.

import inspect
from inspect import Attribute
from enum import Enum, EnumType

r = {}


class Base:
    def inherited(self):
        pass


class C(Base):
    data = 42

    def meth(self):
        pass

    @staticmethod
    def stat():
        pass

    @classmethod
    def cls_m(cls):
        pass

    @property
    def prop(self):
        return 1


class Color(Enum):
    CYAN = 1
    MAGENTA = 2
    YELLOW = 3


def _by_name(cls):
    return {a.name: a for a in inspect.classify_class_attrs(cls)}


# --- Attribute is a real namedtuple ------------------------------------------------

_a = Attribute(name='x', kind='data', defining_class=C, object=1)
r['attribute_fields'] = repr((_a.name, _a.kind, _a.defining_class is C, _a.object))
r['attribute_equality'] = repr(
    _a == Attribute(name='x', kind='data', defining_class=C, object=1))

# --- an enum classifies exactly as upstream, name for name ---------------------------
# This is the set test_enum asserts on.  Every one of them is reached, which is
# what the metaclass-mro half of the algorithm is for.

_color = _by_name(Color)
r['enum_names'] = repr(sorted(_color))
r['enum_members'] = repr(
    [(_color[n].kind, _color[n].defining_class is Color)
     for n in ('CYAN', 'MAGENTA', 'YELLOW')])
# Enum.name and Enum.value are DynamicClassAttributes, and upstream that is NOT
# a property -- enum.property derives from DynamicClassAttribute, which does not
# derive from property -- so both classify as data, defined by Enum.
r['enum_name_value'] = repr(
    [(_color[n].kind, _color[n].defining_class is Enum) for n in ('name', 'value')])

# --- a plain class: what does reach the answer -----------------------------------------

_c = _by_name(C)
r['plain_data'] = repr((_c['data'].kind, _c['data'].defining_class is C))

# dir() on a CLASS reaches the class's own methods, so they are candidates.
# It did not: object>>__dir__ scanned only the METACLASS chain, which is where
# a class body's data attributes live, and so answered ``data'' but no ``meth''
# -- while dir(C()) answered both.  classify_class_attrs starts from dir(), so
# every method and property of a plain class was simply never a candidate.
# See tests/python/dir_of_a_class.py.
r['dir_of_a_class_lists_its_methods'] = repr(
    ['meth' in dir(C), 'meth' in dir(C())])
r['plain_methods_are_found'] = repr(
    [n in _c for n in ('meth', 'prop', 'inherited')])

# --- KNOWN GAP, recorded rather than endorsed -------------------------------------------
# Inherited from the substrate, not from the port, and its own piece of work.
# CPython is expected to DISAGREE with the value below.
#
# A user class's __dict__ holds a plain function where CPython holds a
# staticmethod or classmethod OBJECT, and ``kind'' is read off the __dict__
# entry precisely because that object is what distinguishes them.  So both come
# back as plain methods.  (The entry used to leak the Smalltalk spelling
# 'UnboundMethod'; the type-name correction makes it read 'function', which
# changes what the leak looks like without closing it -- CPython answers
# ['staticmethod', 'classmethod'].)  object's own three hooks ARE wrapped (see
# init_subclass_kind below) because their kinds are fixed and known; doing the
# same for a class body's defs means telling a @classmethod from a metaclass
# method at compile time, which the category marker only settles for enums.
r['staticmethod_kind_is_a_known_gap'] = repr(
    [type(C.__dict__['stat']).__name__, type(C.__dict__['cls_m']).__name__])


# --- the metaclass half of the answer ------------------------------------------------
# These five live on EnumType upstream, and naming their home is the whole point
# of searching the metaclass mro.  Grail reported Enum, PythonInstance or object
# instead -- not because the search was wrong but because the DICTIONARIES were:
# Enum.__dict__ carried EnumType's methods (Grail writes them class-side, the
# same Smalltalk shape a @classmethod compiles to), and object.__dict__ carried
# Grail's own plumbing.  The mro is searched before the metaclass mro, so the
# first of those to answer won.
_METACLASS_DUNDERS = ('__contains__', '__getitem__', '__iter__', '__len__', '__members__')
r['metaclass_dunder_home'] = repr(
    [_color[n].defining_class is EnumType for n in _METACLASS_DUNDERS])
# __members__ is a property on EnumType, not a method; ``kind'' is read off the
# __dict__ entry, so the entry has to BE a property for this to come out right.
r['metaclass_dunder_kinds'] = repr([_color[n].kind for n in _METACLASS_DUNDERS])

# --- attributes no __dict__ along either mro carries ----------------------------------
# CPython keeps __name__ and __qualname__ on ``type'', which classify drops from
# the metaclass mro, so neither is found by the dictionary scan: the home comes
# from the IDENTITY search, ``getattr(base, name) is get_obj'' down the class
# mro.  That needs the attribute to answer the same object twice.  Grail derived
# a fresh string per read, so the comparison never matched and both names were
# dropped from the result entirely.
r['class_name_home'] = repr(
    [(_color[n].kind, _color[n].defining_class is Color)
     for n in ('__name__', '__qualname__')])
r['class_name_is_stable'] = repr(
    [C.__name__ is C.__name__, Color.__qualname__ is Color.__qualname__])

# --- object's own dictionary ------------------------------------------------------------
# object.__dict__ is a fixed, known set upstream.  Grail's held twelve entries
# more -- context-manager and async hooks, the catchable-TypeError __iter__ /
# __getitem__ fallbacks, __getattr__, __name__ / __qualname__, and bare Smalltalk
# selectors -- and each one was a false home for anything defined further along.
r['object_dict_has_no_internals'] = repr(
    [n in object.__dict__
     for n in ('__iter__', '__contains__', '__getitem__', '__name__', '__qualname__')])
# object's three implicit hooks are descriptors upstream, and ``kind'' is read
# off the __dict__ entry, so a plain function there reported __init_subclass__ as
# a ``method'' for every class in the corpus.
r['init_subclass_kind'] = repr(_color['__init_subclass__'].kind)


EXPECTED = {
    'attribute_equality': 'True',
    'attribute_fields': "('x', 'data', True, 1)",
    'dir_of_a_class_lists_its_methods': '[True, True]',
    'enum_members': "[('data', True), ('data', True), ('data', True)]",
    'enum_name_value': "[('data', True), ('data', True)]",
    'class_name_home': "[('data', True), ('data', True)]",
    'class_name_is_stable': '[True, True]',
    'enum_names': ("['CYAN', 'MAGENTA', 'YELLOW', '__class__', '__contains__', "
                   "'__doc__', '__getitem__', '__init_subclass__', '__iter__', "
                   "'__len__', '__members__', '__module__', '__name__', "
                   "'__qualname__', 'name', 'value']"),
    'init_subclass_kind': "'class method'",
    'metaclass_dunder_home': '[True, True, True, True, True]',
    'metaclass_dunder_kinds': "['method', 'method', 'method', 'method', 'property']",
    'object_dict_has_no_internals': '[False, False, False, False, False]',
    'plain_data': "('data', True)",
    'plain_methods_are_found': '[True, True, True]',
}

GRAIL_ONLY = {
    'staticmethod_kind_is_a_known_gap': "['function', 'function']",
}


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-44s %s %s' % (k, 'OK ' if actual == EXPECTED[k] else 'DIFF', actual))
    for k in sorted(GRAIL_ONLY):
        actual = r[k]
        print('%-44s %s %s' % (k, 'XPASS' if actual == GRAIL_ONLY[k] else 'XFAIL', actual))
