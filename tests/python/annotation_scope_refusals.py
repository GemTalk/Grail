"""Fixture: an annotation refuses a yield, an await and a named expression.

CPython 3.14 evaluates every annotation -- a parameter's, a return's, a
module's, a class's, a local variable's -- in an annotation scope of its own
(PEP 649), and its symbol table refuses a yield, an await or a named
expression there (Python/symtable.c, symtable_raise_if_annotation_block).  A
lambda inside one is a function of its own, and a comprehension past its
outermost iterable a scope of its own, so both stay legal.  Grail compiled
every named expression, and reported a yield as "'yield' outside function".

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

r = {}


def outcome(source):
    try:
        compile(source, '<test string>', 'exec')
        return 'ok'
    except SyntaxError as e:
        return e.msg, e.lineno, e.offset


NAMED = 'named expression cannot be used within an annotation'
YIELD = 'yield expression cannot be used within an annotation'
AWAIT = 'await expression cannot be used within an annotation'
r['named_expression'] = [outcome(s) for s in (
    "def f(y: (x := 1)): pass", "def f() -> (x := 1): pass", "x: (y := 1) = 2",
    "def g():\n    x: (y := 1) = 2", "class C:\n    x: (y := 1) = 2",
    "def f(*args: (x := 1)): pass", "def f(**kw: (x := 1)): pass",
    "def f(y: (x := 1), z: (yield)): pass")]
r['yield_and_await'] = [outcome(s) for s in (
    "def f(y: (yield)): pass", "def g():\n    def f(y: (yield)): pass",
    "class C:\n    x: (yield) = 1", "async def g():\n    def f(y: (await x)): pass")]
r['still_compile'] = [outcome(s) for s in (
    "def f(y: lambda: (x := 1)): pass", "def f(y: lambda: (yield)): pass",
    "def f(y: [(x := 1) for _ in z]): pass", "x: [(y := 1) for _ in z]",
    "def f(y: (x == 1)): pass", "lambda: (x := 1)")]
r['comprehension_rules_still_apply'] = outcome("def f(y: [(yield) for _ in z]): pass")

EXPECTED = {
    'named_expression': [(NAMED, 1, 11), (NAMED, 1, 13), (NAMED, 1, 5), (NAMED, 2, 9),
                         (NAMED, 2, 9), (NAMED, 1, 15), (NAMED, 1, 14), (NAMED, 1, 11)],
    'yield_and_await': [(YIELD, 1, 11), (YIELD, 2, 15), (YIELD, 2, 9), (AWAIT, 2, 15)],
    'still_compile': ['ok'] * 6,
    'comprehension_rules_still_apply': ("'yield' inside list comprehension", 1, 12),
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        print('%-5s %-31s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL',
                                    key, actual))
    print(SUMMARY)
