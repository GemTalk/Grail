"""Fixture: a type that does not allow subclassing is refused as a base.

CPython's best_base refuses any base whose type lacks Py_TPFLAGS_BASETYPE --
"type 'NoneType' is not an acceptable base type" (Objects/typeobject.c,
best_base) -- wherever it stands among the bases, for a class statement,
type() and an assignment to __bases__ alike.

Grail built a class over NoneType, range, a function's type, a dict view
and every other such type except bool and Union (test_descr
test_unsubclassable_types, test_errors).

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import types

r = {}


def refusal(source):
    try:
        exec(source, {'types': types, 'O': O, 'NoneType': type(None)})
        return 'allowed'
    except TypeError as e:
        return str(e)


class O:
    pass


r['in_every_position'] = [
    refusal('class X(NoneType): pass'),
    refusal('class X(object, NoneType): pass'),
    refusal('class X(NoneType, object): pass'),
    refusal('class X(O, NoneType): pass'),
    refusal('class X(NoneType, O): pass'),
]
r['the_final_types'] = [
    refusal('class X(%s): pass' % spelling) for spelling in (
        'types.FunctionType', 'types.BuiltinFunctionType', 'types.MethodType', 'range',
        'slice', 'memoryview', 'types.GeneratorType', 'types.MappingProxyType',
        'types.CodeType', 'types.CellType', 'types.TracebackType',
        'type(Ellipsis)', 'bool')]
r['through_type'] = refusal("type('X', (O, range), {})")
r['through_bases_assignment'] = [
    refusal('X = type("X", (O,), {}); X.__bases__ = (NoneType,)'),
    refusal('X = type("X", (O,), {}); X.__bases__ = (O, range)'),
]
r['still_subclassable'] = [
    refusal('class X(int): pass'),
    refusal('class X(list, O): pass'),
    refusal('class X(dict): pass'),
    refusal('class X(Exception): pass'),
    refusal('class range: pass\nclass X(range): pass'),
]


def message(name):
    return "type '%s' is not an acceptable base type" % name


EXPECTED = {
    'in_every_position': [message('NoneType')] * 5,
    'the_final_types': [message(name) for name in (
        'function', 'builtin_function_or_method', 'method', 'range', 'slice',
        'memoryview', 'generator', 'mappingproxy', 'code', 'cell', 'traceback',
        'ellipsis', 'bool')],
    'through_type': message('range'),
    'through_bases_assignment': [message('NoneType'), message('range')],
    'still_subclassable': ['allowed'] * 5,
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-26s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
