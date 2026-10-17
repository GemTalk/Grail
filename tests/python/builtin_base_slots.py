"""Non-empty ``__slots__`` over a built-in base works as in CPython (#1693).

CPython refuses a non-empty ``__slots__`` only over the variable-sized
``int``, ``bytes``, ``tuple`` and ``type``.  Grail's ``type()`` refused it
over every base with built-in storage; some bases accepted the declaration
and then could not hold the value (``k.a = 5`` raised); a slotted subclass
of an exception lost the ``__dict__`` every exception has; and a slotted
``defaultdict`` subclass kept one CPython's lacks.

EXPECTED is CPython 3.14's output; mismatches() is what the Smalltalk test case
asserts is empty.
"""

import collections
import copy
import pickle

r = {}


def t(label, thunk):
    try:
        r[label] = repr(thunk())
    except Exception as e:
        r[label] = '%s: %s' % (type(e).__name__, e)


BASES = (float, complex, str, bytearray, list, dict, set, frozenset,
         collections.OrderedDict, collections.deque, collections.defaultdict,
         Exception)


def make(base, how):
    if how == 'type':
        return type('K', (base,), {'__slots__': ('a',)})
    ns = {'base': base}
    exec('class K(base):\n    __slots__ = ("a",)', ns)
    return ns['K']


def use(base, how):
    K = make(base, how)
    k = K()
    k.a = 5
    try:
        k.zz = 1
        extra = 'stored'
    except AttributeError:
        extra = 'refused'
    return (k.a, extra)


for base in BASES:
    for how in ('type', 'class'):
        t('%s_%s' % (base.__name__, how), lambda base=base, how=how: use(base, how))


class StrK(str):
    __slots__ = ('a',)


def str_slot_lifecycle():
    # A literal str base: one built by type() or over a variable base
    # constructs empty strings (#1706), which is not what this file is about.
    k1, k2 = StrK('x'), StrK('y')
    k1.a = 1
    k2.a = 2
    unset = StrK('z')
    try:
        unset.a
        read = 'read'
    except AttributeError:
        read = 'AttributeError'
    del k1.a
    return (k2.a, hasattr(k1, 'a'), read, k1 + k2, str(k2))


def str_slot_type_built():
    K = make(str, 'type')
    k = K()
    k.a = [1]
    k.a.append(2)
    return (k.a, isinstance(k, str), hasattr(k, '__dict__'))


t('str_slot_lifecycle', str_slot_lifecycle)
t('str_slot_type_built', str_slot_type_built)


def defaultdict_itself():
    d = collections.defaultdict(list)
    d['k'].append(1)
    try:
        d.x = 1
        stored = 'stored'
    except AttributeError:
        stored = 'refused'
    c = copy.copy(d)
    p = pickle.loads(pickle.dumps(d))
    return (dict(d), stored, d.default_factory is list, dict(c), c.default_factory is list,
            dict(p), p.default_factory is list, hasattr(d, '__dict__'))


t('defaultdict_itself', defaultdict_itself)


def exception_slots_keep_dict():
    E = make(Exception, 'class')
    e = E('msg')
    e.a = 1
    e.note = 2
    return (e.a, e.note, e.args, '__dict__' in dir(e))


t('exception_slots_keep_dict', exception_slots_keep_dict)

for base in (int, bytes, tuple):
    for how in ('type', 'class'):
        t('refused_%s_%s' % (base.__name__, how), lambda base=base, how=how: make(base, how))

t('empty_slots_over_tuple', lambda: type('T', (tuple,), {'__slots__': ()})((1, 2)))


EXPECTED = {
    'Exception_class': "(5, 'stored')",
    'Exception_type': "(5, 'stored')",
    'OrderedDict_class': "(5, 'stored')",
    'OrderedDict_type': "(5, 'stored')",
    'bytearray_class': "(5, 'refused')",
    'bytearray_type': "(5, 'refused')",
    'complex_class': "(5, 'refused')",
    'complex_type': "(5, 'refused')",
    'defaultdict_class': "(5, 'refused')",
    'defaultdict_itself': "({'k': [1]}, 'refused', True, {'k': [1]}, True, {'k': [1]}, True, False)",
    'defaultdict_type': "(5, 'refused')",
    'deque_class': "(5, 'refused')",
    'deque_type': "(5, 'refused')",
    'dict_class': "(5, 'refused')",
    'dict_type': "(5, 'refused')",
    'empty_slots_over_tuple': '(1, 2)',
    'exception_slots_keep_dict': "(1, 2, ('msg',), True)",
    'float_class': "(5, 'refused')",
    'float_type': "(5, 'refused')",
    'frozenset_class': "(5, 'refused')",
    'frozenset_type': "(5, 'refused')",
    'list_class': "(5, 'refused')",
    'list_type': "(5, 'refused')",
    'refused_bytes_class': "TypeError: nonempty __slots__ not supported for subtype of 'bytes'",
    'refused_bytes_type': "TypeError: nonempty __slots__ not supported for subtype of 'bytes'",
    'refused_int_class': "TypeError: nonempty __slots__ not supported for subtype of 'int'",
    'refused_int_type': "TypeError: nonempty __slots__ not supported for subtype of 'int'",
    'refused_tuple_class': "TypeError: nonempty __slots__ not supported for subtype of 'tuple'",
    'refused_tuple_type': "TypeError: nonempty __slots__ not supported for subtype of 'tuple'",
    'set_class': "(5, 'refused')",
    'set_type': "(5, 'refused')",
    'str_class': "(5, 'refused')",
    'str_slot_lifecycle': "(2, False, 'AttributeError', 'xy', 'y')",
    'str_slot_type_built': '([1, 2], True, False)',
    'str_type': "(5, 'refused')",
}


def mismatches():
    return sorted(k for k in EXPECTED if r.get(k) != EXPECTED[k])


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-4s %s: %r' % ('OK' if actual == EXPECTED[k] else 'DIFF', k, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-4s %s is not in EXPECTED' % ('DIFF', extra))
