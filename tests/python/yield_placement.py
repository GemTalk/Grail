"""Fixture: a yield expression is accepted only where CPython's grammar puts it.

CPython admits a yield expression as a statement, as an assignment's
right-hand side (``=``, augmented, annotated) and as a whole parenthesised
group -- so an f-string field too -- and refuses it anywhere else in an
expression: ``1, yield 1`` and ``f(yield 1)`` are invalid syntax.  Its symbol
table also refuses one inside a comprehension, whose outermost iterable alone
runs in the enclosing scope: ``'yield' inside list comprehension``.  Grail
parsed a yield as an atom anywhere, and compiled one in a comprehension.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

r = {}


def outcome(source):
    try:
        compile(source, '<test string>', 'exec')
        return 'ok'
    except SyntaxError as e:
        return e.msg


r['in_comprehensions'] = [outcome(s) for s in (
    "def g(): [(yield x) for x in ()]",
    "def g(): [x for x in () if not (yield x)]",
    "def g(): [y for x in () for y in [(yield x)]]",
    "def g(): {(yield x) for x in ()}",
    "def g(): {(yield x): x for x in ()}",
    "def g(): {x: (yield x) for x in ()}",
    "def g(): ((yield x) for x in ())",
    "def g(): [(yield from x) for x in ()]",
    "class C: [(yield x) for x in ()]",
    "[(yield x) for x in ()]")]
r['outermost_iterable'] = outcome("def g(): [x for x in [(yield 1)]]")
r['in_a_lambda_in_a_comprehension'] = outcome("def g(): [lambda: (yield x) for x in ()]")
r['unparenthesised'] = [outcome(s) for s in (
    "def g(): x = yield from (), 1",
    "def g(): 1, yield 1",
    "def g(): f(yield 1)",
    "def g(): f(yield 1, 1)",
    "def g(): x = 1 + yield 2",
    "def g(): yield yield 1",
    "def g(): return yield 1")]
r['legal'] = [outcome(s) for s in (
    "def g(): yield",
    "def g(): yield 1, 2",
    "def g(): x = yield",
    "def g(): x = yield from y",
    "def g(): a = b = yield 1",
    "def g(): x += yield 1",
    "def g(): x: int = yield 1",
    "def g(): f((yield))",
    "def g(): return (yield 1)",
    "def g(): x = (yield) + 1",
    "def g(): f'{yield}'",
    "def g(): (lambda: (yield))")]
r['outside_function'] = [outcome("yield"), outcome("class foo: yield 1"), outcome("x = yield")]

EXPECTED = {
    'in_comprehensions': [
        "'yield' inside list comprehension", "'yield' inside list comprehension",
        "'yield' inside list comprehension", "'yield' inside set comprehension",
        "'yield' inside dict comprehension", "'yield' inside dict comprehension",
        "'yield' inside generator expression", "'yield' inside list comprehension",
        "'yield' inside list comprehension", "'yield' inside list comprehension"],
    'outermost_iterable': 'ok',
    'in_a_lambda_in_a_comprehension': 'ok',
    'unparenthesised': ['invalid syntax'] * 7,
    'legal': ['ok'] * 12,
    'outside_function': ["'yield' outside function"] * 3,
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        print('%-5s %-32s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL',
                                    key, actual))
    print(SUMMARY)
