"""A class attribute read that misses falls back to the metaclass's ``__getattr__`` (#1702).

``Cls.x`` is ``type(Cls).__getattribute__(Cls, 'x')``, so when nothing on
the class or its bases binds ``x``, the METACLASS's ``__getattr__`` is asked.
Grail looked only at the class's own class side, which a Python metaclass's
methods are not on, and raised ``type object 'K' has no attribute 'zz'``.
A name the class does bind never reaches the hook, and a miss on an
INSTANCE asks the class's ``__getattr__``, not the metaclass's.

EXPECTED is CPython 3.14's output; mismatches() is what the Smalltalk test case
asserts is empty.
"""

import enum

r = {}
calls = []


def t(label, thunk):
    try:
        r[label] = repr(thunk())
    except Exception as e:
        r[label] = '%s: %s' % (type(e).__name__, e)


class G(type):
    def __getattr__(cls, name):
        calls.append(name)
        if name.startswith('no_'):
            raise AttributeError(name)
        return 'getattr:' + name


class SubG(G):
    pass


class K(metaclass=G):
    x = 1

    def m(self):
        return 'm'


class K2(K):
    pass


class L(metaclass=SubG):
    pass


class Plain:
    pass


def instance_miss():
    try:
        K().zz
    except AttributeError:
        return 'AttributeError'
    return 'read'


t('miss', lambda: K.zz)
t('bound_attribute_skips_hook', lambda: (K.x, list(calls)))
t('method_skips_hook', lambda: K.m(K()))
t('subclass_of_the_class', lambda: K2.yy)
t('subclass_of_the_metaclass', lambda: L.ww)
t('hasattr_through_hook', lambda: hasattr(K, 'q'))
t('hook_raises_attributeerror', lambda: K.no_such)
t('hasattr_when_hook_raises', lambda: hasattr(K, 'no_x'))
t('getattr_default_when_hook_raises', lambda: getattr(K, 'no_y', 'dflt'))
t('instance_miss_does_not_ask_metaclass', instance_miss)
t('plain_class_miss', lambda: Plain.zz)
t('enum_class_miss', lambda: enum.Enum.zz)
t('dunder_miss', lambda: K.__zz__)
t('hook_calls_in_order', lambda: calls)


EXPECTED = {
    'bound_attribute_skips_hook': "(1, ['zz'])",
    'dunder_miss': "'getattr:__zz__'",
    'enum_class_miss': "AttributeError: type object 'Enum' has no attribute 'zz'",
    'getattr_default_when_hook_raises': "'dflt'",
    'hasattr_through_hook': 'True',
    'hasattr_when_hook_raises': 'False',
    'hook_calls_in_order': "['zz', 'yy', 'ww', 'q', 'no_such', 'no_x', 'no_y', '__zz__']",
    'hook_raises_attributeerror': 'AttributeError: no_such',
    'instance_miss_does_not_ask_metaclass': "'AttributeError'",
    'method_skips_hook': "'m'",
    'miss': "'getattr:zz'",
    'plain_class_miss': "AttributeError: type object 'Plain' has no attribute 'zz'",
    'subclass_of_the_class': "'getattr:yy'",
    'subclass_of_the_metaclass': "'getattr:ww'",
}


def mismatches():
    return sorted(k for k in EXPECTED if r.get(k) != EXPECTED[k])


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-4s %s: %r' % ('OK' if actual == EXPECTED[k] else 'DIFF', k, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-4s %s is not in EXPECTED' % ('DIFF', extra))
