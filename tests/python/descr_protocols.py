"""Fixture: class-construction and descriptor rules test_descr pins.

Each check is one rule CPython applies and Grail did not:

* isinstance() and super() read an object's ``__class__`` when its real type
  does not qualify, so a proxy whose ``__getattribute__`` forwards every read
  to the object it wraps passes as that object's class;
* a descriptor stored as a class's ``__doc__`` is bound, through the class
  and through an instance;
* ``@staticmethod`` on ``__new__`` is the wrap type.__new__ makes anyway, and
  the class dict holds ``__new__`` as a staticmethod and ``__init_subclass__``
  / ``__class_getitem__`` as classmethods even when no decorator says so;
* type() warns about a non-string key in the namespace;
* print() reads ``file.write`` as an attribute, so a ``__getattr__`` supplies
  it and whatever that lookup raises is what print raises;
* two bases with unrelated built-in storage are refused by the class
  statement as by type();
* ``types.ModuleType.__mro__`` names no implementation class;
* a ``__slots__`` class keeps a ``__dict__`` from a plain SECONDARY base, or
  from a base whose ``__slots__`` names ``__dict__``;
* a slot descriptor, and a built-in slot wrapper, refuse an object of the
  wrong type;
* a built-in method assigned to a dunder (``__neg__ = dict.copy``) is what
  the operator calls;
* ``super().__new__(cls)`` in a list or dict subclass allocates;
* ``True == x`` asks ``x.__eq__`` when bool's own comparison does not apply.

The guards at the end are behaviour that must NOT move with these rules.

Every EXPECTED check holds under CPython 3.14, which is what makes it
evidence.
"""

import io
import sys
import types
import warnings

r = {}


def _try(thunk):
    try:
        return ('ok', thunk())
    except BaseException as e:
        return (type(e).__name__, str(e))


class Proxy:
    def __init__(self, obj):
        self.__obj = obj

    def __getattribute__(self, name):
        if name.startswith('_Proxy__'):
            return object.__getattribute__(self, name)
        return getattr(self.__obj, name)


class Plain:
    pass


class PlainSub(Plain):
    pass


r['isinstance through a forwarding proxy'] = _try(
    lambda: (isinstance(Proxy(Plain()), Plain),
             isinstance(Proxy(PlainSub()), Plain),
             isinstance(Proxy(Plain()), PlainSub)))


class B:
    def f(self):
        return 'B.f'


class C(B):
    def f(self):
        return super(C, self).f() + '->C.f'


r['super(C, proxy)'] = _try(lambda: C.__dict__['f'](Proxy(C())))
r['super(C, unrelated) still refused'] = _try(
    lambda: C.__dict__['f'](Plain())[:0])


class DocDescr:
    def __get__(self, obj, owner):
        return 'obj=%s owner=%s' % (type(obj).__name__, owner.__name__)


class Documented:
    __doc__ = DocDescr()


r['__doc__ descriptor through the class'] = _try(lambda: Documented.__doc__)
r['__doc__ descriptor through an instance'] = _try(lambda: Documented().__doc__)


class StaticNew:
    @staticmethod
    def __new__(*args):
        return args


class StaticNewSub(StaticNew):
    pass


r['@staticmethod __new__ receives the class'] = _try(
    lambda: (StaticNew(1, 2) == (StaticNew, 1, 2),
             StaticNewSub(3) == (StaticNewSub, 3)))


class Hooks:
    def __new__(cls, x, y):
        return super().__new__(cls)

    def __init_subclass__(cls):
        pass

    def __class_getitem__(cls, item):
        return item


r['implicit wrappers in the class dict'] = _try(
    lambda: [type(Hooks.__dict__[n]).__name__
             for n in ('__new__', '__init_subclass__', '__class_getitem__')])


def _non_string_key():
    with warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter('always')
        type('WithIntKey', (), {1: 2})
    return [(w.category.__name__, str(w.message)) for w in caught]


r['type() warns about a non-string key'] = _try(_non_string_key)


def _print_through_getattr():
    out = io.StringIO()

    class Writer:
        def __getattr__(self, name):
            if name == 'write':
                return out.write
            raise AttributeError(name)

    print('hi', file=Writer())
    return out.getvalue()


def _print_getattr_raises():
    class Guard:
        def __getattr__(self, name):
            raise RuntimeError('premature ' + name)

    print('hi', file=Guard())


r['print writes through __getattr__'] = _try(_print_through_getattr)
r['print propagates what __getattr__ raises'] = _try(_print_getattr_raises)
r['print to a str'] = _try(lambda: print('hi', file=''))


def _class_over(*bases):
    def build():
        class X(*bases):
            pass
        return 'built'
    return build


r['class over list and dict'] = _try(_class_over(list, dict))
r['class over ModuleType and str'] = _try(_class_over(types.ModuleType, str))
r['type() over int and str'] = _try(lambda: type('X', (int, str), {}))
r['class over an int subclass and int'] = _try(
    _class_over(type('I', (int,), {}), int))


class M1(type):
    pass


class M2(type):
    pass


class WithM1(metaclass=M1):
    pass


class WithM2(metaclass=M2):
    pass


class M1Sub(M1):
    pass


class WithM1Sub(metaclass=M1Sub):
    pass


def _related_metaclasses():
    class Y(WithM1, WithM1Sub):
        pass
    return type(Y).__name__


r['related metaclasses agree'] = _try(_related_metaclasses)

r['ModuleType.__mro__ and __bases__'] = _try(
    lambda: (types.ModuleType.__mro__ == (types.ModuleType, object),
             types.ModuleType.__bases__ == (object,)))


class Slotted:
    __slots__ = ()


class Unslotted:
    pass


class SlottedOverPlain(Slotted, Unslotted):
    __slots__ = ()


def _set_x(cls):
    obj = cls()
    obj.x = 2
    return (obj.x, hasattr(cls, '__dict__'))


r['slots over a plain secondary base'] = _try(lambda: _set_x(SlottedOverPlain))


class WeakOnly:
    __slots__ = ['__weakref__']


class DictOnly:
    __slots__ = ['__dict__']


class BothSlots(WeakOnly, DictOnly):
    __slots__ = []


def _both():
    obj = BothSlots()
    obj.foo = 42
    return (hasattr(obj, '__dict__'), hasattr(obj, '__weakref__'), obj.__dict__)


r['slots over a base whose __slots__ names __dict__'] = _try(_both)


class OneSlot:
    __slots__ = 'a'


r['slot descriptor refuses another type'] = _try(
    lambda: OneSlot.a.__set__(Plain(), 3))

r['str.__eq__ on an int'] = _try(lambda: str.__eq__(1, 1))


class IntAddingStr(int):
    __add__ = str.__add__


r['str.__add__ assigned on an int subclass'] = _try(
    lambda: IntAddingStr() + IntAddingStr())


class NegCopies(dict):
    __neg__ = dict.copy


r['__neg__ = dict.copy'] = _try(
    lambda: (-NegCopies(a=1), NegCopies(b=2).__neg__()))


class ListNew(list):
    def __new__(cls, *args):
        self = super().__new__(cls)
        self.extra = args
        return self

    def __init__(self, *args):
        super().__init__()


class DictNew(dict):
    def __new__(cls, *args):
        return super().__new__(cls)

    def __init__(self, *args):
        super().__init__()


r['super().__new__(cls) in a list subclass'] = _try(
    lambda: (type(ListNew(1, 2)).__name__, ListNew(1, 2).extra, list(ListNew(1))))
r['super().__new__(cls) in a dict subclass'] = _try(
    lambda: (type(DictNew(1)).__name__, dict(DictNew(1))))


class EqProxy:
    def __init__(self, x):
        self.x = x

    def __eq__(self, other):
        return self.x == other

    def __ne__(self, other):
        return self.x != other


r['bool == asks the other operand'] = _try(
    lambda: (True == EqProxy(1), False == EqProxy(1), True != EqProxy(1)))

# Guards: unchanged by the rules above.


class StrictBase:
    __slots__ = ('a',)


class StrictSub(StrictBase):
    __slots__ = ('b',)


class LooseSub(StrictBase):
    pass


def _strict_store():
    StrictSub().z = 1


def _loose_store():
    obj = LooseSub()
    obj.z = 1
    return obj.z


r['guard: an all-slots chain stays strict'] = _try(_strict_store)
r['guard: a class without __slots__ gets a __dict__'] = _try(_loose_store)
r['guard: list(list)'] = _try(lambda: list(list))
r['guard: bool against numbers'] = _try(
    lambda: (True == 1, True == 1.0, False == 0, True != 2, True == None))
r['guard: str.__eq__ on strs'] = _try(lambda: str.__eq__('a', 'a'))

EXPECTED = {
    'isinstance through a forwarding proxy': ('ok', (True, True, False)),
    'super(C, proxy)': ('ok', 'B.f->C.f'),
    'super(C, unrelated) still refused': (
        'TypeError', 'super(type, obj): obj (instance of Plain) is not an '
        'instance or subtype of type (C).'),
    '__doc__ descriptor through the class': ('ok', 'obj=NoneType owner=Documented'),
    '__doc__ descriptor through an instance': ('ok', 'obj=Documented owner=Documented'),
    '@staticmethod __new__ receives the class': ('ok', (True, True)),
    'implicit wrappers in the class dict': (
        'ok', ['staticmethod', 'classmethod', 'classmethod']),
    'type() warns about a non-string key': (
        'ok', [('RuntimeWarning', 'non-string key in the __dict__ of class WithIntKey')]),
    'print writes through __getattr__': ('ok', 'hi\n'),
    'print propagates what __getattr__ raises': ('RuntimeError', 'premature write'),
    'print to a str': ('AttributeError', "'str' object has no attribute 'write'"),
    'class over list and dict': (
        'TypeError', 'multiple bases have instance lay-out conflict'),
    'class over ModuleType and str': (
        'TypeError', 'multiple bases have instance lay-out conflict'),
    'type() over int and str': (
        'TypeError', 'multiple bases have instance lay-out conflict'),
    'class over an int subclass and int': ('ok', 'built'),
    'related metaclasses agree': ('ok', 'M1Sub'),
    'ModuleType.__mro__ and __bases__': ('ok', (True, True)),
    'slots over a plain secondary base': ('ok', (2, True)),
    'slots over a base whose __slots__ names __dict__': ('ok', (True, True, {'foo': 42})),
    'slot descriptor refuses another type': (
        'TypeError', "descriptor 'a' for 'OneSlot' objects doesn't apply to a "
        "'Plain' object"),
    'str.__eq__ on an int': (
        'TypeError', "descriptor '__eq__' requires a 'str' object but received a 'int'"),
    'str.__add__ assigned on an int subclass': (
        'TypeError', "descriptor '__add__' requires a 'str' object but received a "
        "'IntAddingStr'"),
    '__neg__ = dict.copy': ('ok', ({'a': 1}, {'b': 2})),
    'super().__new__(cls) in a list subclass': ('ok', ('ListNew', (1, 2), [])),
    'super().__new__(cls) in a dict subclass': ('ok', ('DictNew', {})),
    'bool == asks the other operand': ('ok', (True, False, False)),
    'guard: an all-slots chain stays strict': (
        'AttributeError', "'StrictSub' object has no attribute 'z' and no __dict__ "
        "for setting new attributes"),
    'guard: a class without __slots__ gets a __dict__': ('ok', 1),
    'guard: list(list)': ('TypeError', "'type' object is not iterable"),
    'guard: bool against numbers': ('ok', (True, True, True, True, False)),
    'guard: str.__eq__ on strs': ('ok', True),
}

KNOWN_DIVERGENCES = {
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS,
    sorted(r) == sorted(list(EXPECTED) + list(KNOWN_DIVERGENCES)))


if __name__ == '__main__':
    if sys.argv[1:] == ['--emit']:
        for key, value in r.items():
            print('    %r: %r,' % (key, value))
        raise SystemExit
    for key in EXPECTED:
        actual = r[key]
        ok = actual == EXPECTED[key]
        print('%-5s %-48s -> %s' % ('OK' if ok else 'FAIL', key,
                                    'as expected' if ok else repr(actual)))
    for key, expected in KNOWN_DIVERGENCES.items():
        actual = r[key]
        print('%-5s %-48s -> %r' % ('OK' if actual == expected else 'XFAIL',
                                    key, actual))
    print(SUMMARY)
