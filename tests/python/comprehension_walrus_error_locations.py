"""Fixture: a comprehension's assignment-expression errors are located where CPython places them.

PEP 572's three comprehension refusals come from CPython's symbol table
(Python/symtable.c), each over a node of its own: a walrus in an iterable
over that assignment expression, one rebinding an iteration variable over
its target, and an inner loop rebinding a walrus target over that loop's
target.  Grail raised the right messages with no location, so each was
placed at the end of the comprehension (test_exceptions
testSyntaxErrorOffset).  Every check here holds under CPython 3.14, which
is what makes it evidence.
"""

r = {}


def outcome(source):
    try:
        compile(source, '<fragment>', 'exec')
        return 'ok'
    except SyntaxError as exc:
        return (exc.msg, exc.lineno, exc.offset, exc.end_lineno, exc.end_offset)


CASES = {
    'in_an_iterable': [
        ('[x for x in (y := [1]) for y in range(5)]',
         ('assignment expression cannot be used in a comprehension iterable expression', 1, 14, 1, 22)),
        ('[x for x in (y := [1])]',
         ('assignment expression cannot be used in a comprehension iterable expression', 1, 14, 1, 22)),
        ('[x for x in range(3) for z in (w := [2])]',
         ('assignment expression cannot be used in a comprehension iterable expression', 1, 32, 1, 40)),
        ('{x: 1 for x in (y := [1])}',
         ('assignment expression cannot be used in a comprehension iterable expression', 1, 17, 1, 25)),
    ],
    'rebinding_an_iteration_variable': [
        ('[(i := 0) for i in range(5)]',
         ("assignment expression cannot rebind comprehension iteration variable 'i'", 1, 3, 1, 4)),
        ('[i for i in range(5) if (i := 0)]',
         ("assignment expression cannot rebind comprehension iteration variable 'i'", 1, 26, 1, 27)),
        ('[[(j := 0) for i in range(5)] for j in range(5)]',
         ("assignment expression cannot rebind comprehension iteration variable 'j'", 1, 4, 1, 5)),
        ('[i for i, j in x if (j := 0)]',
         ("assignment expression cannot rebind comprehension iteration variable 'j'", 1, 22, 1, 23)),
        ('{i: (j := 1) for i in range(5) for j in x}',
         ("assignment expression cannot rebind comprehension iteration variable 'j'", 1, 6, 1, 7)),
        ('{(j := 0) for i in range(5) for j in range(5)}',
         ("assignment expression cannot rebind comprehension iteration variable 'j'", 1, 3, 1, 4)),
    ],
    'an_inner_loop_rebinding_a_target': [
        ('{i for i in range(5) if (j := 0) for j in range(5)}',
         ("comprehension inner loop cannot rebind assignment expression target 'j'", 1, 38, 1, 39)),
        ('[i for i in range(5) if (j := 0) for j in range(5)]',
         ("comprehension inner loop cannot rebind assignment expression target 'j'", 1, 38, 1, 39)),
        ('[i for i in x if (j := 0) for k, j in y]',
         ("comprehension inner loop cannot rebind assignment expression target 'j'", 1, 34, 1, 35)),
        ('[i for i in x if (j := 0) for k in y for j in z]',
         ("comprehension inner loop cannot rebind assignment expression target 'j'", 1, 42, 1, 43)),
    ],
}
LEGAL = [
    '[(y := x) for x in range(3)]',
    '[x for x in range(3) if (y := x)]',
    '[x for x in (y for y in z)]',
]

EXPECTED = {}
for key, cases in CASES.items():
    r[key] = [outcome(source) for source, _ in cases]
    EXPECTED[key] = [expected for _, expected in cases]
r['legal'] = [outcome(each) for each in LEGAL]
EXPECTED['legal'] = ['ok'] * len(LEGAL)

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        ok = r[key] == EXPECTED[key]
        print('%-34s %s' % (key, 'OK' if ok else 'FAIL'))
        if not ok:
            for (source, want), got in zip(CASES.get(key, [(s, 'ok') for s in LEGAL]), r[key]):
                if got != want:
                    print('    %r: got %r, want %r' % (source, got, want))
    print(SUMMARY)
