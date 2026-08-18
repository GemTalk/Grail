"""A method reached off a class names the class that DEFINES it.

Two halves of one question -- who owns ``Color.__contains__''? -- that Grail
answered differently from CPython in two different places.

WHICH CLASS.  An UnboundMethod records the RECEIVER of the attribute read, so
``Color.__contains__'' on an enum recorded ``Color class'' although the method
lives on ``Enum class'' several steps up.  __qualname__ therefore named the
subclass rather than the definer.  That is not cosmetic: pydoc's docroutine
prints a `` from X'' provenance note whenever ``imfunc.__qualname__'' disagrees
with ``homecls.__qualname__ + '.' + realname'', and inspect.classify_class_attrs
independently gets the home class RIGHT -- so the two disagreed and every
inherited method came out annotated `` from <module>.Color'', which CPython does
not print because there they agree.

BOUND OR UNBOUND.  Grail's ``object'' IS the kernel Object and every Python
class descends from PythonInstance, so those two carry protocol FALLBACKS that
CPython's object does not have: __getitem__ and __iter__ live on PythonInstance
purely so an unsubscriptable object raises a catchable TypeError instead of a
MessageNotUnderstood, and __contains__ is the same shape on object.  Grail's
search of the class chain found one of those and stopped, answering an unbound
method; CPython's search of cls.__mro__ finds NOTHING and falls through to the
metatype, answering a bound method of it.  pydoc keys on exactly that
distinction (``kind == 'method' and _is_bound_method(value)'' -> 'static
method'), so three of an enum's four metaclass methods were filed as instance
``Methods'' and split from __len__ -- the one selector no root happens to
define, which had been reaching the metaclass all along and sat alone under
``Static methods''.

The last section is the guard that matters most.  Yielding to the class side is
correct only when a REAL class there defines the name; a Smalltalk metaclass
chain also bottoms out at Object, so asking the unrestricted question answers
yes for anything object defines.  Unguarded, that turned
``object.__getattribute__'' -- which object itself defines, and which is called
in CPython's two-argument unbound form -- into a bound method of the class.
"""

import inspect
from enum import Enum
from pydoc import classify_class_attrs, _is_bound_method


class Color(Enum):
    CYAN = 1
    MAGENTA = 2


class Plain:
    def own(self):
        return 'own'


class Sub(Plain):
    pass


_ENUM_META_METHODS = ('__contains__', '__getitem__', '__iter__', '__len__')


def _kinds(cls, names):
    by_name = {a[0]: a for a in classify_class_attrs(cls)}
    return [by_name[n][1] for n in names if n in by_name]


def _homes(cls, names):
    by_name = {a[0]: a for a in classify_class_attrs(cls)}
    return [by_name[n][2].__name__ for n in names if n in by_name]


r = {}

# --- who owns an inherited metaclass method ---------------------------------------------
_c = getattr(Color, '__contains__')
_f = getattr(_c, '__func__', _c)
r['qualname'] = repr(_f.__qualname__)
r['module'] = repr(_f.__module__)
# The agreement docroutine tests.  Asserted as the COMPARISON rather than as two
# strings, because that is the thing that has to hold -- pydoc prints the
# provenance note precisely when it fails.
_home = {a[0]: a[2] for a in classify_class_attrs(Color)}['__contains__']
r['agrees_with_homecls'] = repr(
    _f.__qualname__ == _home.__qualname__ + '.' + '__contains__')
r['homecls'] = repr(_home.__name__)

# --- bound, and classified as CPython classifies them -----------------------------------
r['all_bound'] = repr([_is_bound_method(getattr(Color, n)) for n in _ENUM_META_METHODS])
r['kinds'] = repr(_kinds(Color, _ENUM_META_METHODS))
r['homes'] = repr(_homes(Color, _ENUM_META_METHODS))

# --- an ordinary method is untouched ----------------------------------------------------
# A real def on a real class still reads as the plain function CPython gives,
# NOT as something bound: the yield only fires for a root fallback.
r['own_method_unbound'] = repr(_is_bound_method(getattr(Plain, 'own')))
r['own_method_qualname'] = repr(Plain.own.__qualname__)
r['inherited_method_qualname'] = repr(Sub.own.__qualname__)
r['own_method_kind'] = repr(_kinds(Plain, ('own',)))

# --- the unbound two-argument form still works ------------------------------------------
# object.__getattribute__ is defined ON object, so an unrestricted "does the
# class side define this" check answers yes for it and would rebind it.
r['getattribute_unbound_call'] = repr(object.__getattribute__(Color, '__name__'))
r['getattr_still_works'] = repr(getattr(Color, '__name__'))
r['len_of_enum'] = repr(len(Color))
r['contains'] = repr(Color.CYAN in Color)
r['getitem'] = repr(Color['CYAN'].value)
r['iter'] = repr([m.name for m in Color])


EXPECTED = {
    'agrees_with_homecls': 'True',
    'all_bound': '[True, True, True, True]',
    'contains': 'True',
    'getattr_still_works': "'Color'",
    'getattribute_unbound_call': "'Color'",
    'getitem': '1',
    'homecls': "'EnumType'",
    'homes': "['EnumType', 'EnumType', 'EnumType', 'EnumType']",
    'inherited_method_qualname': "'Plain.own'",
    'iter': "['CYAN', 'MAGENTA']",
    'kinds': "['static method', 'static method', 'static method', 'static method']",
    'len_of_enum': '2',
    'module': "'enum'",
    'own_method_kind': "['method']",
    'own_method_qualname': "'Plain.own'",
    'own_method_unbound': 'False',
    'qualname': "'EnumType.__contains__'",
}

GRAIL_ONLY = {}


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-28s %s %s' % (k, 'OK ' if actual == EXPECTED[k] else 'DIFF', actual))
    for k in sorted(GRAIL_ONLY):
        actual = r[k]
        print('%-28s %s %s' % (k, 'XPASS' if actual == GRAIL_ONLY[k] else 'XFAIL', actual))
