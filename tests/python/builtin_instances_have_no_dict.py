"""Fixture: an instance of object or of a built-in container has no __dict__.

CPython's generic setattr refuses a name nothing on the type claims when the
object has no instance dictionary (Objects/object.c:1991-2004): ``'list'
object has no attribute 'foo' and no __dict__ for setting new attributes``.
object(), list, dict, set, frozenset, range, slice and bytearray instances
have none; a Python subclass of any of them does.  GemStone hangs an attribute
on any object that is not special or invariant, so Grail stored
``object().foo = 12`` and ``[].foo = 1`` where CPython refuses (test_descr
test_object_class).  Every check here holds under CPython 3.14, which is what
makes it evidence.
"""

import types

r = {}


def outcome(thunk):
    try:
        return thunk()
    except (AttributeError, TypeError) as exc:
        return '%s: %s' % (type(exc).__name__, exc)


def stored(obj):
    obj.foo = 1
    return obj.foo


BUILTINS = [object(), [], {}, set(), frozenset(), range(3), slice(1), bytearray()]

r['store_refused'] = [outcome(lambda o=o: setattr(o, 'foo', 12)) for o in BUILTINS]
r['delete_refused'] = [outcome(lambda o=o: delattr(o, 'foo')) for o in BUILTINS[:3]]
r['class_assignment_refused'] = outcome(lambda: setattr(object(), '__class__', int))
r['no_dict'] = [hasattr(o, '__dict__') for o in BUILTINS]


class O(object):
    pass


class L(list):
    pass


class D(dict):
    pass


class S(set):
    pass


class B(bytearray):
    pass


def function():
    pass


r['subclasses_store'] = [stored(O()), stored(L()), stored(D()), stored(S()), stored(B())]
r['others_store'] = [stored(function), stored(ValueError()), stored(types.ModuleType('m')), stored(O)]
r['generic_alias_call'] = type(list[int]()).__name__

NO_DICT = " and no __dict__ for setting new attributes"
EXPECTED = {
    'store_refused': ["AttributeError: '%s' object has no attribute 'foo'%s" % (name, NO_DICT)
                      for name in ('object', 'list', 'dict', 'set', 'frozenset', 'range', 'slice',
                                   'bytearray')],
    'delete_refused': ["AttributeError: '%s' object has no attribute 'foo'%s" % (name, NO_DICT)
                       for name in ('object', 'list', 'dict')],
    'class_assignment_refused':
        'TypeError: __class__ assignment only supported for mutable types or ModuleType subclasses',
    'no_dict': [False] * 8,
    'subclasses_store': [1, 1, 1, 1, 1],
    'others_store': [1, 1, 1, 1],
    'generic_alias_call': 'list',
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        ok = r[key] == EXPECTED[key]
        print('%-25s %s' % (key, 'OK' if ok else 'FAIL'))
        if not ok:
            print('    got  %r' % (r[key],))
            print('    want %r' % (EXPECTED[key],))
    print(SUMMARY)
