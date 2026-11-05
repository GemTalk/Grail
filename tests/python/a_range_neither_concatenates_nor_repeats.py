"""Fixture: a range neither concatenates nor repeats, and has no such methods.

CPython's range fills neither sq_concat nor sq_repeat, and of the number
methods only nb_bool (Objects/rangeobject.c:672-681, 749-751).  So
``range(2) * 2'' and ``2 * range(2)'' are TypeErrors, as ``range(2) +
range(1)'' is, an operand's reflected method still gets its turn, and range
has no __add__, __mul__ or __rmul__ for hasattr(), dir() or vars() to find.
Grail's range inherited list's three: it repeated into a list, and the names
were listed.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

r = {}


def attempt(thunk):
    try:
        return thunk()
    except Exception as exception:
        return '%s: %s' % (type(exception).__name__, exception)


def add_in_place():
    numbers = range(2)
    numbers += range(1)
    return numbers


def multiply_in_place():
    numbers = range(2)
    numbers *= 2
    return numbers


class Reflected:
    def __radd__(self, other):
        return 'radd'

    def __rmul__(self, other):
        return 'rmul'


names = ('__add__', '__mul__', '__rmul__')
r['no_concatenation_or_repetition'] = [attempt(lambda: range(2) + range(1)), attempt(lambda: range(2) * 2),
                                       attempt(lambda: 2 * range(2)), attempt(lambda: range(2) * True)]
r['nor_in_place'] = [attempt(add_in_place), attempt(multiply_in_place)]
r['an_operands_reflected_method_answers'] = [range(2) + Reflected(), range(2) * Reflected()]
r['a_list_names_the_range'] = [attempt(lambda: [1] * range(2)), attempt(lambda: [1] + range(2))]
r['no_such_attributes'] = [[hasattr(range, name) for name in names], [name in dir(range) for name in names],
                           [name in vars(range) for name in names]]

EXPECTED = {
    'no_concatenation_or_repetition': [
        "TypeError: unsupported operand type(s) for +: 'range' and 'range'",
        "TypeError: unsupported operand type(s) for *: 'range' and 'int'",
        "TypeError: unsupported operand type(s) for *: 'int' and 'range'",
        "TypeError: unsupported operand type(s) for *: 'range' and 'bool'"],
    'nor_in_place': ["TypeError: unsupported operand type(s) for +=: 'range' and 'range'",
                     "TypeError: unsupported operand type(s) for *=: 'range' and 'int'"],
    'an_operands_reflected_method_answers': ['radd', 'rmul'],
    'a_list_names_the_range': ["TypeError: can't multiply sequence by non-int of type 'range'",
                               'TypeError: can only concatenate list (not "range") to list'],
    'no_such_attributes': [[False] * 3, [False] * 3, [False] * 3],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-38s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
