"""Fixture: ``{*a, 1}`` -- a starred unpack inside a SET DISPLAY.

The display adds every item of the iterable, which is exactly what
``set.update`` does -- "adding elements from any iterable" -- and the direct
analogue of the ``{**m}`` merge a dict display already emitted.

Grail supported neither path: the element was printed as itself, and
StarredAst's own emit is a ``*-unpack in call sites is not yet supported''
TypeError signal, so the display raised at RUN time.  The upstream test that
uses it (test_collections' test_Set_hash_matches_frozenset, which builds
``{*range(1000)}``) is skipped with a Grail note for that reason, and the IR
census carried it as `shape:SetAst'.

WHAT THE SHAPES PIN, beyond "it compiles":

  * POSITION IS KEPT.  ``{*a, 9}'' and ``{0, *a}'' put the star at either end,
    and ``{*a, *b}'' uses two, so an emit that hoisted the merges ahead of the
    plain elements or ran them afterwards would still answer the right MEMBERS
    -- a set has no order to betray -- but would evaluate the parts in the
    wrong order, which a user __hash__ or a generator with a side effect can
    see.
  * The iterable need not be a set: a list, a string and a GENERATOR are all
    iterated (``star_a_string'', ``star_a_genexp'').
  * Duplicates collapse, because it is a set and not a list.
  * A NON-ITERABLE raises TypeError, and the message is part of the contract.
  * An iterable that raises DURING iteration propagates that exception rather
    than a codegen one (``star_raises'').

Every value was produced by RUNNING CPython 3.14.6, not predicted.
"""

r = {}

a = {1, 2}
b = [3, 2]

r['only_star'] = sorted({*a})
r['star_then_plain'] = sorted({*a, 9})
r['plain_then_star'] = sorted({0, *a})
r['two_stars'] = sorted({*a, *b})
r['star_a_string'] = sorted({*"ab"})
r['star_a_genexp'] = sorted({*(i * 2 for i in range(3))})
r['duplicates_collapse'] = sorted({1, *[1, 1, 2]})

try:
    r['star_a_non_iterable'] = {*5}
except TypeError as e:
    r['star_a_non_iterable'] = 'TypeError: ' + str(e)[:40]


class Boom:
    def __iter__(self):
        raise ValueError('boom')


try:
    r['star_raises'] = {*Boom()}
except ValueError as e:
    r['star_raises'] = 'ValueError: ' + str(e)


class Holder:
    """The display inside a METHOD, which is where the census row is."""

    def build(self):
        return sorted({0, *a, 9})


r['method_display'] = Holder().build()


EXPECTED = {
    'duplicates_collapse': [1, 2],
    'method_display': [0, 1, 2, 9],
    'only_star': [1, 2],
    'plain_then_star': [0, 1, 2],
    'star_a_genexp': [0, 2, 4],
    'star_a_non_iterable': "TypeError: 'int' object is not iterable",
    'star_a_string': ['a', 'b'],
    'star_raises': 'ValueError: boom',
    'star_then_plain': [1, 2, 9],
    'two_stars': [1, 2, 3],
}


KEYS = sorted(EXPECTED)


if __name__ == '__main__':
    for key in KEYS:
        actual = r[key]
        print('%-5s %-24s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL',
                                    key, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-5s %-24s is not in EXPECTED' % ('FAIL', extra))
