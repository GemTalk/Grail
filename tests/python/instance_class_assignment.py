"""``obj.__class__ = Other`` refuses and keeps attributes as CPython does (#1574).

Grail changed an instance's class with GemStone's changeClassTo:, which
accepts any class whose SMALLTALK format is compatible.  So it accepted
``o.__class__ = dict`` and ``= list``, and a ``__slots__`` class whose layout
differs, all of which CPython refuses.  CPython's two rules:

* both types must be mutable -- classes a class statement or type() built --
  unless both are module types: ``__class__ assignment only supported for
  mutable types or ModuleType subclasses``;
* the layouts must match: the same base and the same ``__slots__`` /
  ``__dict__`` / ``__weakref__``, or ``'D' object layout differs from 'C'``.

An accepted change also lost the instance's attributes when the two classes
assign different names: they live at per-class positions, so after
``a.__class__ = B`` the position A kept ``x`` at was B's ``y``, and ``a.x``
raised AttributeError.

A real module's ``__class__`` is #1691 and not covered here.

EXPECTED is CPython 3.14's output; mismatches() is what the Smalltalk test case
asserts is empty.
"""

import types

r = {}


def t(label, thunk):
    try:
        r[label] = repr(thunk())
    except Exception as e:
        r[label] = '%s: %s' % (type(e).__name__, e)


def assign(obj, new, read=lambda o: None):
    obj.__class__ = new
    return (type(obj).__name__, read(obj))


class C:
    pass


class C2:
    pass


class CC(C):
    pass


class D:
    __slots__ = ('a', 'b')


class D2:
    __slots__ = ('a', 'b')


class D3:
    __slots__ = ('a',)


class Ds(C):
    __slots__ = ('q',)


class L(list):
    pass


class L2(list):
    pass


class Dd(dict):
    pass


class E(Exception):
    pass


class E2(Exception):
    pass


class A:
    def __init__(self):
        self.x = 1
        self.shared = 'a'

    def who(self):
        return 'A'


class B:
    def __init__(self):
        self.y = 2
        self.shared = 'b'

    def who(self):
        return 'B'


class M(types.ModuleType):
    def hello(self):
        return 'hi ' + self.__name__


Built = type('Built', (), {})
BuiltSub = type('BuiltSub', (C,), {})
BuiltSub2 = type('BuiltSub2', (C,), {'q': 1})


class SlotShadow:
    __slots__ = ('__class__', '__dict__')


class PropShadow:
    @property
    def __class__(self):
        return self.__dict__.get('_k', PropShadow)

    @__class__.setter
    def __class__(self, value):
        self.__dict__['_k'] = value


def filled_d():
    d = D()
    d.a, d.b = 1, 2
    return d


def a_with_extra():
    a = A()
    a.extra = 'e'
    return a


# refusals: builtin and immutable types
for name, typ in [('dict', dict), ('list', list), ('int', int), ('str', str),
                  ('object', object), ('type', type)]:
    t('to_' + name, lambda typ=typ: assign(C(), typ))
t('from_object', lambda: assign(object(), C))
t('from_int', lambda: assign(5, C))
t('from_list', lambda: assign([1], L))
t('not_a_class', lambda: assign(C(), 3))

# layouts
t('plain_to_plain', lambda: assign(C(), C2))
t('subclass_to_plain', lambda: assign(CC(), C2))
t('plain_to_type_built', lambda: assign(C(), Built))
t('type_built_subclass_to_sibling', lambda: assign(BuiltSub(), BuiltSub2, lambda o: o.q))
t('type_built_subclass_to_plain', lambda: assign(BuiltSub(), C2))
t('plain_to_slots', lambda: assign(C(), D))
t('slots_to_same_slots', lambda: assign(filled_d(), D2, lambda o: (o.a, o.b)))
t('slots_to_other_slots', lambda: assign(D(), D3))
t('slots_subclass_to_plain', lambda: assign(Ds(), C2))
t('plain_to_list_subclass', lambda: assign(C(), L))
t('list_subclass_to_list_subclass', lambda: assign(L([1, 2]), L2, list))
t('list_subclass_to_plain', lambda: assign(L([1]), C))
t('dict_subclass_to_plain', lambda: assign(Dd(), C))
t('exception_to_exception', lambda: assign(E('m'), E2, lambda o: o.args))
t('module_to_module_subclass', lambda: assign(types.ModuleType('mm'), M, lambda o: o.hello()))

# a class that shadows __class__: the assignment is an ordinary store
t('slot_shadow_store', lambda: assign(SlotShadow(), C, lambda o: o.__class__ is C))
t('slot_shadow_any_value', lambda: (lambda o: (setattr(o, '__class__', 3), o.__class__)[1])(SlotShadow()))
t('property_shadow_setter', lambda: (lambda o: (setattr(o, '__class__', C), o.__class__ is C, o.__dict__['_k'] is C))(PropShadow()))

# attributes survive
t('attributes_move', lambda: assign(A(), B, lambda o: (o.x, o.shared, o.who(), sorted(vars(o).items()))))
t('extra_attribute_moves', lambda: assign(a_with_extra(), B, lambda o: (o.extra, sorted(vars(o)))))
t('missing_name_stays_missing', lambda: assign(A(), B, lambda o: hasattr(o, 'y')))


def round_trip():
    a = A()
    a.__class__ = B
    a.__class__ = A
    a.x += 10
    return (a.who(), a.x, sorted(vars(a).items()))


t('round_trip', round_trip)


def store_after_change():
    a = A()
    a.__class__ = B
    a.y = 5
    return (a.x, a.y, sorted(vars(a).items()))


t('store_after_change', store_after_change)


EXPECTED = {
    'attributes_move': "('B', (1, 'a', 'B', [('shared', 'a'), ('x', 1)]))",
    'dict_subclass_to_plain': "TypeError: __class__ assignment: 'C' object layout differs from 'Dd'",
    'exception_to_exception': "('E2', ('m',))",
    'extra_attribute_moves': "('B', ('e', ['extra', 'shared', 'x']))",
    'from_int': 'TypeError: __class__ assignment only supported for mutable types or ModuleType subclasses',
    'from_list': 'TypeError: __class__ assignment only supported for mutable types or ModuleType subclasses',
    'from_object': 'TypeError: __class__ assignment only supported for mutable types or ModuleType subclasses',
    'list_subclass_to_list_subclass': "('L2', [1, 2])",
    'list_subclass_to_plain': "TypeError: __class__ assignment: 'C' object layout differs from 'L'",
    'missing_name_stays_missing': "('B', False)",
    'module_to_module_subclass': "('M', 'hi mm')",
    'not_a_class': "TypeError: __class__ must be set to a class, not 'int' object",
    'plain_to_list_subclass': "TypeError: __class__ assignment: 'L' object layout differs from 'C'",
    'plain_to_plain': "('C2', None)",
    'plain_to_slots': "TypeError: __class__ assignment: 'D' object layout differs from 'C'",
    'plain_to_type_built': "('Built', None)",
    'property_shadow_setter': '(None, True, True)',
    'round_trip': "('A', 11, [('shared', 'a'), ('x', 11)])",
    'slot_shadow_any_value': '3',
    'slot_shadow_store': "('SlotShadow', True)",
    'slots_subclass_to_plain': "TypeError: __class__ assignment: 'C2' object layout differs from 'Ds'",
    'slots_to_other_slots': "TypeError: __class__ assignment: 'D3' object layout differs from 'D'",
    'slots_to_same_slots': "('D2', (1, 2))",
    'store_after_change': "(1, 5, [('shared', 'a'), ('x', 1), ('y', 5)])",
    'subclass_to_plain': "('C2', None)",
    'to_dict': 'TypeError: __class__ assignment only supported for mutable types or ModuleType subclasses',
    'to_int': 'TypeError: __class__ assignment only supported for mutable types or ModuleType subclasses',
    'to_list': 'TypeError: __class__ assignment only supported for mutable types or ModuleType subclasses',
    'to_object': 'TypeError: __class__ assignment only supported for mutable types or ModuleType subclasses',
    'to_str': 'TypeError: __class__ assignment only supported for mutable types or ModuleType subclasses',
    'to_type': 'TypeError: __class__ assignment only supported for mutable types or ModuleType subclasses',
    'type_built_subclass_to_plain': "('C2', None)",
    'type_built_subclass_to_sibling': "('BuiltSub2', 1)",
}


def mismatches():
    return sorted(k for k in EXPECTED if r.get(k) != EXPECTED[k])


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-4s %s: %r' % ('OK' if actual == EXPECTED[k] else 'DIFF', k, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-4s %s is not in EXPECTED' % ('DIFF', extra))
