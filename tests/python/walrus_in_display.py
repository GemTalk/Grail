"""PEP 572: a walrus inside a display, which is an EXPRESSION position.

``[y := spam(x), x / y]`` is ordinary Python -- the very shape PEP 572's
own examples use -- and Grail parsed it, gated it correctly, and then
emitted Smalltalk that would not compile.

Grail builds every list, tuple, set and subscript display as a BRACE
ARRAY, ``{a. b. c}``, and a brace array holds expressions.  Smalltalk's
assignment is a statement, so the emitted

    {y := spam(x). ...}

was rejected by the Smalltalk compiler with ``unexpected token'' --
a CompileError, not a SyntaxError, which took down the whole enclosing
method and could not be caught by Python code at all.  Parenthesising
the emitted assignment is all it needs: ``{(y := spam(x)). ...}'' is
accepted, and an assignment's value in Smalltalk is what it assigned,
so the walrus keeps its value in whatever expression surrounds it.

Which is why this fixture EXECUTES rather than compiles.  Its sibling
tests/python/walrus_placement.py asks only ``does this compile?'', using
the ``compile'' builtin, and Grail's ``compile'' stops after parsing --
so ``list_display'' passed there throughout, while the same source
failed the moment anything ran it.  Every check below therefore looks at
the resulting VALUE and at what the target was bound to.

Every expectation was checked against CPython 3.14 first.
"""

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or 'got: %r' % (got,)


# -- the four display kinds, each a brace array in the emitted code -----

def _list_display():
    r = [y := 2, y ** 2]
    return (r, y)


def _tuple_display():
    t = (x := 1, 2)
    return (t, x)


def _set_display():
    s = {n := 3, n + 1}
    return (sorted(s), n)


def _dict_display():
    d = {(k := 'a'): (v := 1)}
    return (d, k, v)


check('list_display', _list_display(), ([2, 4], 2))
check('tuple_display', _tuple_display(), ((1, 2), 1))
check('set_display', _set_display(), ([3, 4], 3))
check('dict_display', _dict_display(), ({'a': 1}, 'a', 1))


# -- a subscript with more than one index is a tuple display too --------

class TwoDimensional:
    def __init__(self, rows):
        self.rows = rows

    def __getitem__(self, index):
        return self.rows[index[0]][index[1]]


def _subscript_tuple():
    a = TwoDimensional([[1, 2], [3, 4]])
    element = a[b := 1, c := 0]
    return (element, b, c)


def _slice_bounds():
    a = [0, 1, 2, 3, 4]
    return (a[(i := 1):(j := 3)], i, j)


check('subscript_tuple', _subscript_tuple(), (3, 1, 0))
check('slice_bounds', _slice_bounds(), ([1, 2], 1, 3))


# -- nested, starred, and inside a comprehension ------------------------

def _nested_displays():
    r = [[a := 1], [a + 1]]
    return (r, a)


def _starred_display():
    r = [*(t := [1, 2]), 3]
    return (r, t)


def _comprehension_element():
    def spam(a):
        return a
    res = [[y := spam(x), x / y] for x in range(1, 5)]
    return (res, y)


def _display_of_displays():
    r = ([p := 1], {q := 2}, (r0 := 3,))
    return (r[0], sorted(r[1]), r[2], p, q, r0)


check('nested_displays', _nested_displays(), ([[1], [2]], 1))
check('starred_display', _starred_display(), ([1, 2, 3], [1, 2]))
check('comprehension_element',
      _comprehension_element(),
      ([[1, 1.0], [2, 1.0], [3, 1.0], [4, 1.0]], 4))
check('display_of_displays', _display_of_displays(),
      ([1], [2], (3,), 1, 2, 3))


# -- the display in other scopes ----------------------------------------

MODULE_LEVEL = [m := 7, m + 1]

check('module_scope', (MODULE_LEVEL, m), ([7, 8], 7))


class InAClassBody:
    values = [cv := 3, cv * 2]


check('class_body_scope',
      (InAClassBody.values, InAClassBody.cv),
      ([3, 6], 3))


# Deliberately NOT a lambda body: ``lambda: [n := 1, n + 1]'' is a
# SEPARATE, pre-existing Grail gap that has nothing to do with displays.
# A walrus anywhere in a lambda body -- ``lambda: (n := 1) + n'' with no
# display in sight -- binds a temp the lambda's block never declares,
# while the matching READ resolves to module scope, so the block emits
# ``(n := 1) ___binOpAdd___: (self ___moduleAttrLoad___: #n)'' and the
# Smalltalk compiler rejects the undefined symbol.  PEP 572 puts that
# binding in the lambda's own scope.  See docs/Issues.md.


_GLOBAL_SEEN = None


def _global_target():
    global _GLOBAL_SEEN
    r = [_GLOBAL_SEEN := 11, _GLOBAL_SEEN + 1]
    return r


check('global_target', (_global_target(), _GLOBAL_SEEN), ([11, 12], 11))


def _nonlocal_target():
    seen = None

    def inner():
        nonlocal seen
        return [seen := 21, seen + 1]

    return (inner(), seen)


check('nonlocal_target', _nonlocal_target(), ([21, 22], 21))


# -- the value of a walrus is what it assigned --------------------------

def _walrus_has_a_value():
    return [(z := 5) + 1, z]


def _display_as_an_argument():
    def took(seq):
        return len(seq)
    return (took([p := 1, p + 1]), p)


check('walrus_has_a_value', _walrus_has_a_value(), [6, 5])
check('display_as_an_argument', _display_as_an_argument(), (2, 1))


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
