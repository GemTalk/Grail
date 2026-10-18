"""A class's ``__slots__`` name reads as its member descriptor (#1694).

``K.a`` for ``__slots__ = ('a',)`` is CPython's ``<member 'a' of 'K'
objects>``, the same object ``K.__dict__['a']`` holds, inherited by a
subclass, and found before a metaclass ``__getattr__``.  Grail listed the
descriptor in ``K.__dict__`` but the class read missed it -- AttributeError,
and ``hasattr(K, 'a')`` False -- and its type was named
``MemberDescriptorType`` rather than ``member_descriptor``.  Reads through
an instance are unchanged: an unset slot is still an AttributeError.

EXPECTED is CPython 3.14's output; mismatches() is what the Smalltalk test case
asserts is empty.
"""

import inspect
import types

r = {}


def t(label, thunk):
    try:
        r[label] = repr(thunk())
    except Exception as e:
        r[label] = '%s: %s' % (type(e).__name__, e)


class K:
    __slots__ = ('a', 'b')


class S(K):
    __slots__ = ('c',)


class Str:
    __slots__ = 'a'


class P:
    __slots__ = ('__x',)


class G(type):
    def __getattr__(cls, name):
        return 'getattr:' + name


class KG(metaclass=G):
    __slots__ = ('q',)


def through_descriptor():
    k = K()
    K.a.__set__(k, 5)
    return (K.a.__get__(k, K), k.a)


t('class_read', lambda: K.a)
t('hasattr', lambda: hasattr(K, 'a'))
t('type_name', lambda: type(K.__dict__['a']).__name__)
t('types_name', lambda: (types.MemberDescriptorType.__name__, types.MemberDescriptorType.__qualname__))
t('same_object_as_dict_entry', lambda: K.a is K.__dict__['a'])
t('inherited', lambda: S.a)
t('inherited_is_the_base_one', lambda: S.a is K.a)
t('subclass_own', lambda: S.c)
t('string_declaration', lambda: Str.a)
t('private_name_mangled', lambda: P._P__x)
t('missing_name', lambda: K.zz)


def unset_slot_raises():
    # The message names the class with its module (3.14), which depends on
    # how this file was loaded; whether the read raises is what matters.
    try:
        K().a
    except AttributeError:
        return 'AttributeError'
    return 'read'


t('instance_unset_slot', unset_slot_raises)
t('instance_hasattr_unset', lambda: hasattr(K(), 'a'))
t('get_and_set_through_it', through_descriptor)
t('before_metaclass_getattr', lambda: KG.q)
t('isinstance', lambda: isinstance(K.a, types.MemberDescriptorType))
t('inspect_ismemberdescriptor', lambda: inspect.ismemberdescriptor(K.a))
t('inspect_getattr_static', lambda: inspect.getattr_static(K, 'a') is K.a)
t('getattr_over_slots', lambda: [getattr(K, n).__name__ for n in K.__slots__])


EXPECTED = {
    'before_metaclass_getattr': "<member 'q' of 'KG' objects>",
    'class_read': "<member 'a' of 'K' objects>",
    'get_and_set_through_it': '(5, 5)',
    'getattr_over_slots': "['a', 'b']",
    'hasattr': 'True',
    'inherited': "<member 'a' of 'K' objects>",
    'inherited_is_the_base_one': 'True',
    'inspect_getattr_static': 'True',
    'inspect_ismemberdescriptor': 'True',
    'instance_hasattr_unset': 'False',
    'instance_unset_slot': "'AttributeError'",
    'isinstance': 'True',
    'missing_name': "AttributeError: type object 'K' has no attribute 'zz'",
    'private_name_mangled': "<member '_P__x' of 'P' objects>",
    'same_object_as_dict_entry': 'True',
    'string_declaration': "<member 'a' of 'Str' objects>",
    'subclass_own': "<member 'c' of 'S' objects>",
    'type_name': "'member_descriptor'",
    'types_name': "('member_descriptor', 'member_descriptor')",
}


def mismatches():
    return sorted(k for k in EXPECTED if r.get(k) != EXPECTED[k])


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-4s %s: %r' % ('OK' if actual == EXPECTED[k] else 'DIFF', k, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-4s %s is not in EXPECTED' % ('DIFF', extra))
