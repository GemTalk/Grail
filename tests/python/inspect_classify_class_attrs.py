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
from enum import Enum

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

# --- KNOWN GAPS, recorded rather than endorsed ------------------------------------------
# Both are inherited from the substrate, not from the port, and each is its own
# piece of work.  CPython is expected to DISAGREE with every value below.
#
# 1. A class __dict__ holds an UnboundMethod where CPython holds a staticmethod
#    or classmethod OBJECT, and ``kind'' is read off the __dict__ entry
#    precisely because that object is what distinguishes them.  So both come
#    back as plain methods when they are reached at all.
r['staticmethod_kind_is_a_known_gap'] = repr(
    [type(C.__dict__['stat']).__name__, type(C.__dict__['cls_m']).__name__])

# 2. Enum.__dict__ reports methods that live on the METACLASS upstream, and the
#    class mro is searched before the metaclass mro, so those dunders name Enum
#    as their home where CPython names EnumType.
r['metaclass_dunder_home_is_a_known_gap'] = repr(
    [_color[n].defining_class is Enum for n in ('__iter__', '__len__', '__members__')])


EXPECTED = {
    'attribute_equality': 'True',
    'attribute_fields': "('x', 'data', True, 1)",
    'dir_of_a_class_lists_its_methods': '[True, True]',
    'enum_members': "[('data', True), ('data', True), ('data', True)]",
    'enum_name_value': "[('data', True), ('data', True)]",
    'enum_names': ("['CYAN', 'MAGENTA', 'YELLOW', '__class__', '__contains__', "
                   "'__doc__', '__getitem__', '__init_subclass__', '__iter__', "
                   "'__len__', '__members__', '__module__', '__name__', "
                   "'__qualname__', 'name', 'value']"),
    'plain_data': "('data', True)",
    'plain_methods_are_found': '[True, True, True]',
}

GRAIL_ONLY = {
    'metaclass_dunder_home_is_a_known_gap': '[True, True, True]',
    'staticmethod_kind_is_a_known_gap': "['UnboundMethod', 'UnboundMethod']",
}


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-44s %s %s' % (k, 'OK ' if actual == EXPECTED[k] else 'DIFF', actual))
    for k in sorted(GRAIL_ONLY):
        actual = r[k]
        print('%-44s %s %s' % (k, 'XPASS' if actual == GRAIL_ONLY[k] else 'XFAIL', actual))
