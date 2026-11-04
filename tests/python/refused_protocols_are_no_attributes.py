"""Fixture: a protocol a type refuses is no attribute of it, as in CPython.

CPython's tuple and bytes have no item assignment (Objects/tupleobject.c:806,
Objects/bytesobject.c:1715, sq_ass_item 0), and since 3.0 complex has no
floor division, modulo or divmod (Objects/complexobject.c:1348-1384,
nb_floor_divide / nb_remainder / nb_divmod 0).  The operation raises
TypeError and the attribute does not exist.  Grail implements each as a method
that raises CPython's TypeError, and without the <grailProtocolRefusal> mark
an attribute read found it: hasattr((), '__setitem__') was True, so
duck-typed code that asks before it assigns took the mutable branch, and
dir() and __dict__ listed the names.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

r = {}


def outcome(call):
    try:
        call()
        return 'no error'
    except TypeError as error:
        return str(error)


def assign_into(target):
    target[0] = 1


def delete_from(target):
    del target[0]


refused = [((), '__setitem__'), ((), '__delitem__'), (b'a', '__setitem__'),
           (1j, '__floordiv__'), (1j, '__rfloordiv__'), (1j, '__mod__'), (1j, '__rmod__'),
           (1j, '__divmod__'), (1j, '__rdivmod__')]
r['no_attribute'] = [hasattr(each, name) for each, name in refused]
r['not_in_dir'] = [name in dir(each) for each, name in refused]
r['not_in_the_type_dict'] = [name in type(each).__dict__ for each, name in refused]
r['the_operations_still_refuse'] = [
    outcome(lambda: assign_into((1,))), outcome(lambda: delete_from((1,))),
    outcome(lambda: assign_into(b'a')),
    outcome(lambda: 1j // 1), outcome(lambda: 1 // 1j), outcome(lambda: 1j % 1),
    outcome(lambda: divmod(1j, 1)), outcome(lambda: divmod(1, 1j))]
r['the_real_ones_stay'] = [hasattr(bytearray(), '__setitem__'), hasattr([], '__delitem__'),
                           hasattr(1j, '__truediv__'), hasattr(1, '__floordiv__')]

EXPECTED = {
    'no_attribute': [False] * 9,
    'not_in_dir': [False] * 9,
    'not_in_the_type_dict': [False] * 9,
    'the_operations_still_refuse': [
        "'tuple' object does not support item assignment",
        "'tuple' object doesn't support item deletion",
        "'bytes' object does not support item assignment",
        "unsupported operand type(s) for //: 'complex' and 'int'",
        "unsupported operand type(s) for //: 'int' and 'complex'",
        "unsupported operand type(s) for %: 'complex' and 'int'",
        "unsupported operand type(s) for divmod(): 'complex' and 'int'",
        "unsupported operand type(s) for divmod(): 'int' and 'complex'"],
    'the_real_ones_stay': [True, True, True, True],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-28s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
