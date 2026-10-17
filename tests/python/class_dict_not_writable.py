"""A class's ``__dict__`` cannot be assigned or deleted (#1699).

CPython's ``type.__dict__['__dict__']`` is a getset_descriptor with no
setter, so ``C.__dict__ = {}`` and ``del C.__dict__`` are both
``AttributeError: attribute '__dict__' of 'type' objects is not writable``.
Grail stored the value in the class's attribute holder, which the class-side
read never consults, so the assignment vanished without a word.  An
INSTANCE's ``__dict__`` stays assignable.

A built-in class refuses first, with the immutable-type TypeError, and a
DELETE on one did not: Grail answered an AttributeError naming the GemStone
class (``type object 'Integer' has no attribute 'foo'``).

EXPECTED is CPython 3.14's output; mismatches() is what the Smalltalk test case
asserts is empty.
"""

r = {}


def t(label, thunk):
    try:
        r[label] = repr(thunk())
    except Exception as e:
        r[label] = '%s: %s' % (type(e).__name__, e)


class C:
    x = 1


class M(type):
    pass


class K(metaclass=M):
    y = 2


def assign(cls):
    cls.__dict__ = {}


def delete(cls):
    del cls.__dict__


def survives(cls, name):
    return (type(cls.__dict__).__name__, cls.__dict__[name])


t('assign', lambda: assign(C))
t('assign_leaves_dict', lambda: survives(C, 'x'))
t('setattr', lambda: setattr(C, '__dict__', {'z': 0}))
t('type_setattr', lambda: type.__setattr__(C, '__dict__', {}))
t('delete', lambda: delete(C))
t('delattr', lambda: delattr(C, '__dict__'))
t('after_all_of_it', lambda: (survives(C, 'x'), 'z' in C.__dict__))
t('metaclass_instance', lambda: assign(K))
t('metaclass_instance_leaves_dict', lambda: survives(K, 'y'))
t('builtin_class', lambda: assign(int))
t('builtin_class_delete', lambda: delete(int))
t('builtin_delete_missing', lambda: delattr(int, 'foo'))
t('builtin_delete_method', lambda: delattr(str, 'upper'))
t('builtin_method_survives', lambda: 'ab'.upper())


def instance_dict():
    o = C()
    o.a = 1
    o.__dict__ = {'b': 2}
    return (sorted(vars(o)), hasattr(o, 'a'), o.b)


t('instance_dict_still_assignable', instance_dict)


EXPECTED = {
    'after_all_of_it': "(('mappingproxy', 1), False)",
    'assign': "AttributeError: attribute '__dict__' of 'type' objects is not writable",
    'assign_leaves_dict': "('mappingproxy', 1)",
    'builtin_class': "TypeError: cannot set '__dict__' attribute of immutable type 'int'",
    'builtin_class_delete': "TypeError: cannot set '__dict__' attribute of immutable type 'int'",
    'builtin_delete_method': "TypeError: cannot set 'upper' attribute of immutable type 'str'",
    'builtin_delete_missing': "TypeError: cannot set 'foo' attribute of immutable type 'int'",
    'builtin_method_survives': "'AB'",
    'delattr': "AttributeError: attribute '__dict__' of 'type' objects is not writable",
    'delete': "AttributeError: attribute '__dict__' of 'type' objects is not writable",
    'instance_dict_still_assignable': "(['b'], False, 2)",
    'metaclass_instance': "AttributeError: attribute '__dict__' of 'type' objects is not writable",
    'metaclass_instance_leaves_dict': "('mappingproxy', 2)",
    'setattr': "AttributeError: attribute '__dict__' of 'type' objects is not writable",
    'type_setattr': "AttributeError: attribute '__dict__' of 'type' objects is not writable",
}


def mismatches():
    return sorted(k for k in EXPECTED if r.get(k) != EXPECTED[k])


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-4s %s: %r' % ('OK' if actual == EXPECTED[k] else 'DIFF', k, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-4s %s is not in EXPECTED' % ('DIFF', extra))
