"""Binding a callable with __get__ keeps the implementation it was read from (#1418).

``object.__setattr__.__get__(obj)`` answered a handle that re-sent
``__setattr__`` to obj, so it ran obj's own override.  attrs initialises a
frozen class exactly that way -- Attribute.__init__ does
``bound_setattr = _OBJ_SETATTR.__get__(self)`` -- so every class that freezes
itself raised on its own __init__, and everything importing attrs failed
(jsonschema, referencing, aiohttp).

The same re-send was wrong for every other callable Grail represents the same
way: a module-level function bound with __get__ looked for a method of that
name on the instance, and an already-bound method or classmethod re-bound
itself to the new object instead of answering itself unchanged.

Not covered: a nested def or a lambda (an ExecBlock) has no __get__ at all,
so binding one fails outright; the module-level def here is a different
object.  A module function bound to its OWN module answers itself rather than
binding the module as an argument: Grail's functions report that module as
__self__, and Django's signal dispatch round-trips them through
weakref.WeakMethod on exactly that assumption.  And the type names: CPython calls ``object.__setattr__`` a
wrapper_descriptor and its binding a method-wrapper; Grail reports function and
method.

EXPECTED is CPython 3.14's output; mismatches() is what the Smalltalk test case
asserts is empty.
"""

r = {}


def t(label, thunk):
    try:
        r[label] = repr(thunk())
    except Exception as e:
        r[label] = '%s: %s' % (type(e).__name__, e)


_OBJ_SETATTR = object.__setattr__


class FrozenSlots:
    __slots__ = ('a',)

    def __init__(self, a):
        bound = _OBJ_SETATTR.__get__(self)
        bound('a', a)

    def __setattr__(self, name, value):
        raise AttributeError('frozen')


class FrozenDict:
    def __init__(self, a):
        _OBJ_SETATTR.__get__(self)('a', a)

    def __setattr__(self, name, value):
        raise AttributeError('frozen')

    def __delattr__(self, name):
        raise AttributeError('nodel')

    def __getattribute__(self, name):
        if name == 'a':
            return 'override'
        return object.__getattribute__(self, name)


class Plain:
    pass


class B:
    def f(self):
        return 'B.f'

    @classmethod
    def cm(cls, *a):
        return (cls.__name__,) + a

    @staticmethod
    def sm(*a):
        return a


class S(B):
    def f(self):
        return 'S.f'


def g(self, x=1):
    return ('g', type(self).__name__, x)


def frozen_dict_raw():
    o = FrozenDict(5)
    return o.a, object.__getattribute__.__get__(o)('a')


def delattr_bound():
    o = FrozenDict(5)
    object.__delattr__.__get__(o)('a')
    return 'a' in object.__getattribute__(o, '__dict__')


def inherited_setattr_bound():
    o = FrozenDict(1)
    Plain.__setattr__.__get__(o)('z', 2)
    return object.__getattribute__(o, '__dict__')


def frozen_still_refuses():
    o = FrozenSlots(1)
    o.a = 2
    return o.a


def bound_attrs():
    o = Plain()
    b = object.__setattr__.__get__(o)
    return b.__self__ is o, b.__name__, callable(b)


def bound_method_is_unchanged():
    s, p = S(), Plain()
    m = s.f
    return m.__get__(p) is m, m.__get__(p)()


t('frozen_slots', lambda: FrozenSlots(1).a)
t('frozen_slots_store_refused', frozen_still_refuses)
t('frozen_dict', frozen_dict_raw)
t('delattr_bound', delattr_bound)
t('inherited_setattr_bound', inherited_setattr_bound)
t('bound_attrs', bound_attrs)
t('class_access_is_self', lambda: object.__setattr__.__get__(None, Plain) is object.__setattr__)
t('function_bound', lambda: g.__get__(Plain())())
t('function_bound_with_arg', lambda: g.__get__(Plain())(5))
t('function_class_access', lambda: g.__get__(None, Plain) is g)
t('function_bound_self', lambda: (lambda p: g.__get__(p).__self__ is p)(Plain()))
t('function_bound_type', lambda: type(g.__get__(Plain())).__name__)
t('python_method_nonvirtual', lambda: B.f.__get__(S())())
t('python_method_type', lambda: type(B.f.__get__(S())).__name__)
t('bound_method_unchanged', bound_method_is_unchanged)
t('classmethod_unchanged', lambda: B.cm.__get__(7)(1))
t('classmethod_via_instance', lambda: B().cm.__get__(7)(1))
t('staticmethod_function_binds', lambda: B.sm.__get__(7)(1))


EXPECTED = {
    'bound_attrs': "(True, '__setattr__', True)",
    'bound_method_unchanged': "(True, 'S.f')",
    'class_access_is_self': 'True',
    'classmethod_unchanged': "('B', 1)",
    'classmethod_via_instance': "('B', 1)",
    'delattr_bound': 'False',
    'frozen_dict': "('override', 5)",
    'frozen_slots': '1',
    'frozen_slots_store_refused': 'AttributeError: frozen',
    'function_bound': "('g', 'Plain', 1)",
    'function_bound_self': 'True',
    'function_bound_type': "'method'",
    'function_bound_with_arg': "('g', 'Plain', 5)",
    'function_class_access': 'True',
    'inherited_setattr_bound': "{'a': 1, 'z': 2}",
    'python_method_nonvirtual': "'B.f'",
    'python_method_type': "'method'",
    'staticmethod_function_binds': '(7, 1)',
}


def mismatches():
    return sorted(k for k in EXPECTED if r.get(k) != EXPECTED[k])


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-4s %s: %r' % ('OK' if actual == EXPECTED[k] else 'DIFF', k, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-4s %s is not in EXPECTED' % ('DIFF', extra))
