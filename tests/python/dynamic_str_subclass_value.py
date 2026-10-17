"""A str subclass built by ``type()`` or over a variable base keeps its value (#1706).

Grail chose the str constructor at compile time, only for a class statement
naming ``str`` literally.  ``type('K', (str,), {})('xy')`` and ``class
K(base)`` with ``base = str`` took the generic allocator instead and every
instance was the EMPTY string.  The literal path, meanwhile, ignored
keywords: ``K(b'xy', encoding='ascii')`` answered the bytes' repr.  And
``str`` itself read a fourth positional as nothing and the second and third
as an encoding, so its arity error was a decode error.

EXPECTED is CPython 3.14's output; mismatches() is what the Smalltalk test case
asserts is empty.
"""

r = {}


def t(label, thunk):
    try:
        r[label] = repr(thunk())
    except Exception as e:
        r[label] = '%s: %s' % (type(e).__name__, e)


def show(C, *args, **kw):
    k = C(*args, **kw)
    return (str(k), len(k), type(k).__name__)


TypeK = type('TypeK', (str,), {})
base = str


class VarK(base):
    pass


class LitK(str):
    pass


for name, C in (('type', TypeK), ('variable_base', VarK), ('literal', LitK)):
    t(name + '_value', lambda C=C: show(C, 'xy'))
    t(name + '_empty', lambda C=C: show(C))
    t(name + '_non_ascii', lambda C=C: show(C, 'é€😀'))
    t(name + '_decode', lambda C=C: show(C, b'xy', 'ascii'))
    t(name + '_decode_keywords', lambda C=C: show(C, b'x\xffy', encoding='ascii', errors='replace'))
    t(name + '_object_keyword', lambda C=C: show(C, object='kw'))
    t(name + '_bad_keyword', lambda C=C: show(C, 'x', bogus=1))
    t(name + '_too_many', lambda C=C: show(C, 'a', 'b', 'c', 'd'))
    t(name + '_from_int', lambda C=C: show(C, 42))
    t(name + '_methods', lambda C=C: (C('ab') == 'ab', hash(C('ab')) == hash('ab'),
                                      type(C('ab').upper()).__name__, C('ab') + 'c'))

t('own_init_sees_args', lambda: (lambda C: (str(C('xy')), C('xy').tag))(
    type('W', (str,), {'__init__': lambda self, v: setattr(self, 'tag', v.upper())})))
t('own_new_wins', lambda: str(type('N', (str,), {'__new__': lambda cls, v: str.__new__(cls, v * 2)})('ab')))
t('subclass_of_dynamic', lambda: show(type('S2', (TypeK,), {}), 'qq'))
t('isinstance', lambda: (isinstance(TypeK('a'), str), isinstance(VarK('a'), str)))

# str itself: more than three positionals is CPython's arity error, in its two
# wordings, rather than a decode attempt on the second and third
t('str_too_many', lambda: str('a', 'b', 'c', 'd'))
t('str_too_many_with_keyword', lambda: str('a', 'b', 'c', 'd', errors='x'))
t('str_too_many_starred', lambda: str(*['a', 'b', 'c', 'd']))


EXPECTED = {
    'isinstance': '(True, True)',
    'literal_bad_keyword': "TypeError: str() got an unexpected keyword argument 'bogus'",
    'literal_decode': "('xy', 2, 'LitK')",
    'literal_decode_keywords': "('x�y', 3, 'LitK')",
    'literal_empty': "('', 0, 'LitK')",
    'literal_from_int': "('42', 2, 'LitK')",
    'literal_methods': "(True, True, 'str', 'abc')",
    'literal_non_ascii': "('é€😀', 3, 'LitK')",
    'literal_object_keyword': "('kw', 2, 'LitK')",
    'literal_too_many': 'TypeError: str() takes at most 3 arguments (4 given)',
    'literal_value': "('xy', 2, 'LitK')",
    'own_init_sees_args': "('xy', 'XY')",
    'own_new_wins': "'abab'",
    'str_too_many': 'TypeError: str expected at most 3 arguments, got 4',
    'str_too_many_starred': 'TypeError: str expected at most 3 arguments, got 4',
    'str_too_many_with_keyword': 'TypeError: str() takes at most 3 arguments (5 given)',
    'subclass_of_dynamic': "('qq', 2, 'S2')",
    'type_bad_keyword': "TypeError: str() got an unexpected keyword argument 'bogus'",
    'type_decode': "('xy', 2, 'TypeK')",
    'type_decode_keywords': "('x�y', 3, 'TypeK')",
    'type_empty': "('', 0, 'TypeK')",
    'type_from_int': "('42', 2, 'TypeK')",
    'type_methods': "(True, True, 'str', 'abc')",
    'type_non_ascii': "('é€😀', 3, 'TypeK')",
    'type_object_keyword': "('kw', 2, 'TypeK')",
    'type_too_many': 'TypeError: str() takes at most 3 arguments (4 given)',
    'type_value': "('xy', 2, 'TypeK')",
    'variable_base_bad_keyword': "TypeError: str() got an unexpected keyword argument 'bogus'",
    'variable_base_decode': "('xy', 2, 'VarK')",
    'variable_base_decode_keywords': "('x�y', 3, 'VarK')",
    'variable_base_empty': "('', 0, 'VarK')",
    'variable_base_from_int': "('42', 2, 'VarK')",
    'variable_base_methods': "(True, True, 'str', 'abc')",
    'variable_base_non_ascii': "('é€😀', 3, 'VarK')",
    'variable_base_object_keyword': "('kw', 2, 'VarK')",
    'variable_base_too_many': 'TypeError: str() takes at most 3 arguments (4 given)',
    'variable_base_value': "('xy', 2, 'VarK')",
}


def mismatches():
    return sorted(k for k in EXPECTED if r.get(k) != EXPECTED[k])


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-4s %s: %r' % ('OK' if actual == EXPECTED[k] else 'DIFF', k, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-4s %s is not in EXPECTED' % ('DIFF', extra))
