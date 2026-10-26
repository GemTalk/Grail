# array.array's sequence operators: + and += with another array of the same
# typecode, * and *= with an integer (from either side), and a slice that is
# itself an array.  Grail's array is a list-backed stand-in, and it had none
# of them: hypothesis builds a table with ``array("H", [0]) * n'' at module
# scope, so it could not be imported at all.

from array import array


def t(fn):
    try:
        return fn()
    except Exception as e:
        return (type(e).__name__, str(e))


def ints(a):
    return (type(a).__name__, a.typecode, a.tolist())


EXPECTED = {
    'repeat': ('array', 'H', [0, 0, 0]),
    'repeat_from_the_left': ('array', 'H', [1, 2, 1, 2]),
    'repeat_zero': ('array', 'H', []),
    'concat': ('array', 'i', [1, 2, 3]),
    'concat_in_place_keeps_identity': (True, [1, 2, 3]),
    'repeat_in_place_keeps_identity': (True, [5, 5, 5]),
    'slice_is_an_array': ('array', 'i', [2, 3]),
    'concat_with_a_list': ('TypeError', 'can only append array (not "list") to array'),
    'concat_mixed_typecodes': ('TypeError', 'bad argument type for built-in operation'),
    'repeat_by_a_str_raises': 'TypeError',
}


def actual():
    def in_place_concat():
        a = array('i', [1])
        b = a
        a += array('i', [2, 3])
        return (a is b, a.tolist())

    def in_place_repeat():
        a = array('i', [5])
        b = a
        a *= 3
        return (a is b, a.tolist())

    return {
        'repeat': ints(array('H', [0]) * 3),
        'repeat_from_the_left': ints(2 * array('H', [1, 2])),
        'repeat_zero': ints(array('H', [7]) * 0),
        'concat': ints(array('i', [1]) + array('i', [2, 3])),
        'concat_in_place_keeps_identity': in_place_concat(),
        'repeat_in_place_keeps_identity': in_place_repeat(),
        'slice_is_an_array': ints(array('i', [1, 2, 3])[1:]),
        'concat_with_a_list': t(lambda: array('i', [1]) + [2]),
        'concat_mixed_typecodes': t(lambda: array('i', [1]) + array('h', [2])),
        'repeat_by_a_str_raises': t(lambda: array('i', [1]) * 'x')[0],
    }


# scripts/check_python_fixtures.sh runs this under CPython in CI.
if __name__ == '__main__':
    got = actual()
    for name, expected in EXPECTED.items():
        print('%-4s %s' % ('OK' if got[name] == expected else 'FAIL', name))
