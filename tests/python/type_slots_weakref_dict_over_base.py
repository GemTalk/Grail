"""type() accepts '__weakref__' / '__dict__' in __slots__ when no base supplies it (#1428).

type(name, bases, {'__slots__': (...)}) refused '__weakref__' and '__dict__'
over every base without built-in storage, object included:
``__weakref__ slot disallowed: we already got one``.  attrs builds every
``slots=True`` class that way, adding '__weakref__' when no base has it, so
``import attr`` failed; protobuf builds every message class the same way over
a base with empty __slots__.  The refusal is now CPython's: a base supplies
the slot when it is dict-ful or its __slots__ name it, and object and a class
with empty __slots__ do not.

Not covered: a class STATEMENT does none of this checking (nor any other
__slots__ validation), so it accepts a duplicate directive CPython refuses.
With several bases CPython consults only the one that decides the layout, so
``type('N', (Empty, HasWR), ...)`` is accepted there and still refused here.
And two gaps in the classes built, by either route: '__dict__' over a base
with empty __slots__ gives instances no __dict__, and dir() of a type()-built
class omits '__weakref__'.  The rows below read the class's own __dict__,
which is right in both.

EXPECTED is CPython 3.14's output; mismatches() is what the Smalltalk test case
asserts is empty.
"""

import weakref

r = {}


def t(label, thunk):
    try:
        r[label] = repr(thunk())
    except Exception as e:
        r[label] = '%s: %s' % (type(e).__name__, e)


class Dictful:
    pass


class Empty:
    __slots__ = ()


class HasWR:
    __slots__ = ('__weakref__',)


class HasD:
    __slots__ = ('__dict__',)


class Deep(Empty):
    __slots__ = ('x',)


class DeepDictful(Dictful):
    __slots__ = ()


BASES = {'object': object, 'Dictful': Dictful, 'Empty': Empty, 'HasWR': HasWR,
         'HasD': HasD, 'Deep': Deep, 'DeepDictful': DeepDictful}
SLOTS = {'wr': ('__weakref__',), 'd': ('__dict__',), 'd_wr': ('__dict__', '__weakref__')}


def build(base, slots):
    # Whether the class builds, and which storage descriptors it introduces.
    cls = type('N', (base,), {'__slots__': slots})
    return ('__dict__' in cls.__dict__, '__weakref__' in cls.__dict__)


for bn in BASES:
    for sn in SLOTS:
        t('%s_%s' % (bn, sn), lambda b=BASES[bn], s=SLOTS[sn]: build(b, s))


def weakref_works():
    N = type('N', (object,), {'__slots__': ('__weakref__', 'a')})
    n = N()
    n.a = 1
    ref = weakref.ref(n)
    return ref() is n, n.a, hasattr(n, '__dict__')


def attrs_shape():
    # attrs' _ClassBuilder._create_slots_class: rebuild a plain class as a
    # slotted one, adding '__weakref__' because nothing in its MRO has it.
    class Plain:
        def __init__(self, v):
            self.v = v
    cd = {'__slots__': ('v', '__weakref__'), '__qualname__': Plain.__qualname__,
          '__init__': Plain.__dict__['__init__']}
    cls = type(Plain)(Plain.__name__, Plain.__bases__, cd)
    o = cls(3)
    return o.v, weakref.ref(o)() is o, hasattr(o, '__dict__')


t('duplicate_weakref', lambda: type('N', (object,), {'__slots__': ('__weakref__', '__weakref__')}))
t('int_base', lambda: type('N', (int,), {'__slots__': ('__weakref__',)}))
t('weakref_works', weakref_works)
t('attrs_shape', attrs_shape)



EXPECTED = {
    'DeepDictful_d': 'TypeError: __dict__ slot disallowed: we already got one',
    'DeepDictful_d_wr': 'TypeError: __dict__ slot disallowed: we already got one',
    'DeepDictful_wr': 'TypeError: __weakref__ slot disallowed: we already got one',
    'Deep_d': '(True, False)',
    'Deep_d_wr': '(True, True)',
    'Deep_wr': '(False, True)',
    'Dictful_d': 'TypeError: __dict__ slot disallowed: we already got one',
    'Dictful_d_wr': 'TypeError: __dict__ slot disallowed: we already got one',
    'Dictful_wr': 'TypeError: __weakref__ slot disallowed: we already got one',
    'Empty_d': '(True, False)',
    'Empty_d_wr': '(True, True)',
    'Empty_wr': '(False, True)',
    'HasD_d': 'TypeError: __dict__ slot disallowed: we already got one',
    'HasD_d_wr': 'TypeError: __dict__ slot disallowed: we already got one',
    'HasD_wr': '(False, True)',
    'HasWR_d': '(True, False)',
    'HasWR_d_wr': 'TypeError: __weakref__ slot disallowed: we already got one',
    'HasWR_wr': 'TypeError: __weakref__ slot disallowed: we already got one',
    'attrs_shape': '(3, True, False)',
    'duplicate_weakref': 'TypeError: __weakref__ slot disallowed: we already got one',
    'int_base': "TypeError: nonempty __slots__ not supported for subtype of 'int'",
    'object_d': '(True, False)',
    'object_d_wr': '(True, True)',
    'object_wr': '(False, True)',
    'weakref_works': '(True, 1, False)',
}


def mismatches():
    return sorted(k for k in EXPECTED if r.get(k) != EXPECTED[k])


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-4s %s: %r' % ('OK' if actual == EXPECTED[k] else 'DIFF', k, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-4s %s is not in EXPECTED' % ('DIFF', extra))
