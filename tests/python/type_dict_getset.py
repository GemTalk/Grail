"""``type.__dict__['__dict__']`` is a getset_descriptor whose owner is optional (#1428).

Grail listed the wrap of the kernel method behind ``cls.__dict__`` there, a
``function``; ``__get__(C)`` raised for want of an owner and ``__get__(C,
type)`` answered a bound method instead of C's mappingproxy.  wrapt's
pure-Python fallback reads exactly ``type.__dict__['__dict__'].__get__(cls)``.

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


class D(C):
    y = 2


d = type.__dict__['__dict__']

t('type_name', lambda: type(d).__name__)
t('repr', lambda: repr(d))
t('name', lambda: (d.__name__, d.__qualname__, d.__objclass__ is type))
t('same_object', lambda: type.__dict__['__dict__'] is type.__dict__['__dict__'])
t('one_arg_get', lambda: type(d.__get__(C)).__name__)
t('one_arg_get_reads', lambda: d.__get__(C)['x'])
t('two_arg_get', lambda: d.__get__(D, type)['y'])
t('own_entries_only', lambda: 'x' in d.__get__(D))
t('none_instance_is_descriptor', lambda: d.__get__(None, type) is d)
t('get_on_a_non_class', lambda: d.__get__(42))
t('set_is_refused', lambda: d.__set__(C, {}))
t('class_entry_wrong_instance', lambda: C.__dict__['__dict__'].__get__(5))
t('class_entry_reads_instance', lambda: (lambda o: (setattr(o, 'z', 3), C.__dict__['__dict__'].__get__(o))[1])(C()))
t('vars_of_type_agrees', lambda: vars(type)['__dict__'] is d)


EXPECTED = {
    'class_entry_reads_instance': "{'z': 3}",
    'class_entry_wrong_instance': "TypeError: descriptor '__dict__' for 'C' objects doesn't apply to a 'int' object",
    'get_on_a_non_class': "TypeError: descriptor '__dict__' for 'type' objects doesn't apply to a 'int' object",
    'name': "('__dict__', 'type.__dict__', True)",
    'none_instance_is_descriptor': 'True',
    'one_arg_get': "'mappingproxy'",
    'one_arg_get_reads': '1',
    'own_entries_only': 'False',
    'repr': '"<attribute \'__dict__\' of \'type\' objects>"',
    'same_object': 'True',
    'set_is_refused': "AttributeError: attribute '__dict__' of 'type' objects is not writable",
    'two_arg_get': '2',
    'type_name': "'getset_descriptor'",
    'vars_of_type_agrees': 'True',
}


def mismatches():
    return sorted(k for k in EXPECTED if r.get(k) != EXPECTED[k])


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-4s %s: %r' % ('OK' if actual == EXPECTED[k] else 'DIFF', k, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-4s %s is not in EXPECTED' % ('DIFF', extra))
