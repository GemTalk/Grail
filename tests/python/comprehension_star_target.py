"""Fixture: a comprehension whose for-target holds a STARRED element.

``[rest for first, *rest in rows]'' binds ``rest'' to the leftover list, and
the star may sit anywhere in the target, wrap a nested tuple (``*(b, c)''), or
store through a subscript or an attribute.  A bare ``for *a in x'' is a
SyntaxError and is not here.

The text path has always emitted these (ComprehensionAst class >>
___emitUnpack___:from:on:'s star slice).  The IR path refused them
(`Comprehension:starTarget') as a send it did not make.  It makes it now, with
the for-loop's code: the comprehension and the loop spell the star the same
way -- an explicit slice object and an arithmetic length -- so the two share
one emitter.

ONE DIVERGENCE IS PINNED, and it is the text's, shared by both paths: with too
few values CPython raises ``ValueError: not enough values to unpack''; the
comprehension's slice shape indexes past the end and raises IndexError.  The
for-loop closed the same gap by running the assignment's value-count check
first (ForAst >> ___unpackCheckArgs___); the comprehension has no such check.
"""

r = {}


def record(key, fn):
    try:
        r[key] = 'NO RAISE: ' + repr(fn())
    except BaseException as exc:          # noqa: BLE001 - the message IS the fixture
        r[key] = type(exc).__name__ + ': ' + str(exc)


def star_last(rows):
    return [rest for first, *rest in rows]


def star_first(rows):
    return [(init, last) for *init, last in rows]


def star_middle(rows):
    return [(a, mid, z) for a, *mid, z in rows]


def star_in_nested_tuple(rows):
    return [(a, b, c) for a, (b, *c) in rows]


def star_wraps_tuple(rows):
    return [(a, b, c) for a, *(b, c) in rows]


def list_target(rows):
    return [rest for [first, *rest] in rows]


def star_over_string(words):
    return [rest for first, *rest in words]


def star_over_iterator(rows):
    return [rest for first, *rest in rows]


def star_into_subscript(rows):
    d = {}
    return [(a, d['rest']) for a, *d['rest'] in rows]


def star_into_attribute(rows):
    class Box:
        pass
    box = Box()
    return [(a, box.rest) for a, *box.rest in rows]


def two_clauses(rows):
    return [(rest, inner) for first, *rest in rows for *inner, last in [rest]]


def with_filter(rows):
    return [rest for first, *rest in rows if rest]


def set_dict_generator(rows):
    return (sorted({len(rest) for first, *rest in rows}),
            {first: rest for first, *rest in rows},
            list(rest for first, *rest in rows))


class Holder:
    def method(self, rows):
        return [rest for first, *rest in rows]


def too_few(rows):
    return [rest for first, *rest in rows]


record('star_last', lambda: star_last([(1, 2, 3), (4,)]))
record('star_first', lambda: star_first([(1, 2, 3)]))
record('star_middle', lambda: star_middle([(1, 2, 3, 4), (5, 6)]))
record('star_in_nested_tuple', lambda: star_in_nested_tuple([(1, (2, 3, 4))]))
record('star_wraps_tuple', lambda: star_wraps_tuple([(1, 2, 3)]))
record('list_target', lambda: list_target([[1, 2]]))
record('star_over_string', lambda: star_over_string(['abc', 'x']))
record('star_over_iterator', lambda: star_over_iterator([iter([1, 2, 3])]))
record('star_into_subscript', lambda: star_into_subscript([(1, 2, 3)]))
record('star_into_attribute', lambda: star_into_attribute([(1, 2, 3)]))
record('two_clauses', lambda: two_clauses([(1, 2, 3)]))
record('with_filter', lambda: with_filter([(1,), (1, 2)]))
record('set_dict_generator', lambda: set_dict_generator([(1, 2), (3,)]))
record('method', lambda: Holder().method([(1, 2, 3)]))
record('too_few', lambda: too_few([()]))


EXPECTED = {
    'star_last': 'NO RAISE: [[2, 3], []]',
    'star_first': 'NO RAISE: [([1, 2], 3)]',
    'star_middle': 'NO RAISE: [(1, [2, 3], 4), (5, [], 6)]',
    'star_in_nested_tuple': 'NO RAISE: [(1, 2, [3, 4])]',
    'star_wraps_tuple': 'NO RAISE: [(1, 2, 3)]',
    'list_target': 'NO RAISE: [[2]]',
    'star_over_string': "NO RAISE: [['b', 'c'], []]",
    'star_over_iterator': 'NO RAISE: [[2, 3]]',
    'star_into_subscript': 'NO RAISE: [(1, [2, 3])]',
    'star_into_attribute': 'NO RAISE: [(1, [2, 3])]',
    'two_clauses': 'NO RAISE: [([2, 3], [2])]',
    'with_filter': 'NO RAISE: [[2]]',
    'set_dict_generator': 'NO RAISE: ([0, 1], {1: [2], 3: []}, [[2], []])',
    'method': 'NO RAISE: [[2, 3]]',
}

# Grail's answer (both paths), so a fix shows up as an XPASS.
XFAIL = {
    'too_few': 'IndexError: tuple index out of range',
}


if __name__ == '__main__':
    for key, expected in EXPECTED.items():
        actual = r[key]
        print('%-5s %-22s -> %r' % ('OK' if actual == expected else 'FAIL',
                                    key, actual))
    for key, grail in XFAIL.items():
        actual = r[key]
        print('%-5s %-22s -> %r' % ('XFAIL' if actual != grail else 'XPASS',
                                    key, actual))
    for extra in sorted(set(r) - set(EXPECTED) - set(XFAIL)):
        print('%-5s %-22s is in neither table' % ('FAIL', extra))
