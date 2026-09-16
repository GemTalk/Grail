"""Fixture: a ``for'' loop whose target holds a STARRED element.

``for a, b, *rest in pairs'' binds ``rest'' to whatever is left over, and the
star may sit anywhere in the target -- first, last, in the middle, or inside a
nested tuple.

The IR path refused the whole family because, as its own note put it, ``the
text's star shape needs a Smalltalk arithmetic send the IR emit does not yet
make''.  That is accurate and it is the whole gap: the text indexes the
elements after the star from the END, which takes a subtraction on the
sequence's length.

THE SHAPE REPRODUCED IS THE FOR-LOOP'S, not the assignment's.  Grail already
had a starred unpack for ``a, *b = xs'' -- it goes through
``___unpackSequence___ ___unpackCheck___:star:after:'' -- but printSmalltalkOn:
does NOT spell a for-loop target that way.  It uses an explicit slice object
and an arithmetic length, and this fixture holds the two paths to that.

WHICH MATTERS BECAUSE THE TWO DISAGREE ABOUT AN ERROR.  With too few values to
unpack, CPython raises ``ValueError: not enough values to unpack''; the
assignment shape does too, and the for-loop's slice shape runs off the end with
an IndexError.  That is a gap in the TEXT, shared by both paths because both
now spell the loop the same way -- so it is pinned here as an XFAIL rather than
quietly fixed on one side, which would make the two codegen paths disagree
about which exception a loop raises.

Everything here is verified against real CPython by running the file directly.
"""

r = {}


def record(key, fn):
    try:
        r[key] = fn()
    except Exception as exc:
        r[key] = '%s: %s' % (type(exc).__name__, exc)


class H:
    def star_at_the_end(self):
        out = []
        for a, b, *rest in [(1, 2, 3, 4), (5, 6)]:
            out.append((a, b, rest))
        return out

    def star_in_the_middle(self):
        out = []
        for a, *mid, z in [(1, 2, 3, 4), (5, 6)]:
            out.append((a, mid, z))
        return out

    def star_first(self):
        out = []
        for *head, z in [(1, 2, 3), (9,)]:
            out.append((head, z))
        return out

    def star_only(self):
        out = []
        for *all_, in [(1, 2), ()]:
            out.append(all_)
        return out

    def star_nested(self):
        out = []
        for a, (b, *c) in [(1, (2, 3, 4))]:
            out.append((a, b, c))
        return out

    def star_over_a_string(self):
        out = []
        for first, *tail in ['abc', 'z']:
            out.append((first, tail))
        return out

    def plain_tuple_still_works(self):
        out = []
        for a, b in [(1, 2), (3, 4)]:
            out.append((a, b))
        return out

    def nested_plain_still_works(self):
        out = []
        for a, (b, c) in [(1, (2, 3))]:
            out.append((a, b, c))
        return out

    def star_too_few(self):
        for a, b, *rest in [(1,)]:
            pass
        return 'no raise'


h = H()
record('star_at_the_end', h.star_at_the_end)
record('star_in_the_middle', h.star_in_the_middle)
record('star_first', h.star_first)
record('star_only', h.star_only)
record('star_nested', h.star_nested)
record('star_over_a_string', h.star_over_a_string)
record('plain_tuple_still_works', h.plain_tuple_still_works)
record('nested_plain_still_works', h.nested_plain_still_works)
record('star_too_few', h.star_too_few)


XFAIL = {'star_too_few'}


EXPECTED = {
    'star_at_the_end': [(1, 2, [3, 4]), (5, 6, [])],
    'star_in_the_middle': [(1, [2, 3], 4), (5, [], 6)],
    'star_first': [([1, 2], 3), ([], 9)],
    'star_only': [[1, 2], []],
    'star_nested': [(1, 2, [3, 4])],
    'star_over_a_string': [('a', ['b', 'c']), ('z', [])],
    'plain_tuple_still_works': [(1, 2), (3, 4)],
    'nested_plain_still_works': [(1, 2, 3)],
    # CPython's message; Grail answers IndexError on BOTH paths -- the
    # for-loop's slice shape runs off the end instead of checking the length.
    'star_too_few': 'ValueError: not enough values to unpack (expected at least 2, got 1)',
}


KEYS = sorted(EXPECTED)


if __name__ == '__main__':
    for key in KEYS:
        actual = r[key]
        if key in XFAIL:
            # EXPECTED holds CPython's answer, so this agrees HERE and differs
            # under Grail -- XFAIL either way, never XPASS.
            status = 'XFAIL' if actual == EXPECTED[key] else 'FAIL'
        else:
            status = 'OK' if actual == EXPECTED[key] else 'FAIL'
        print('%-5s %-28s -> %r' % (status, key, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-5s %-28s is not in EXPECTED' % ('FAIL', extra))
