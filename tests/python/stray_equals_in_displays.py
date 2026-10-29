"""Fixture: an ``=`` after a list or set display's element is CPython's invalid_named_expression.

CPython's grammar tries invalid_named_expression for every named_expression,
so ``[x=1]`` is ``invalid syntax. Maybe you meant '==' or ':=' instead of
'='?`` drawn over ``x=1``, and ``{'Alice'=22}`` is ``cannot assign to literal
here. Maybe you meant '==' instead of '='?`` (Grammar/python.gram:1261-1268).
Grail made that check in a parenthesized group and after ``if``/``while``,
not in a display, where the ``=`` was plain invalid syntax
(test_exceptions testSyntaxErrorOffset).  Every check here holds under
CPython 3.14, which is what makes it evidence.
"""

r = {}


def outcome(source):
    try:
        compile(source, '<fragment>', 'exec')
        return 'ok'
    except SyntaxError as exc:
        return (exc.msg, exc.lineno, exc.offset, exc.end_lineno, exc.end_offset)


CASES = {
    'in_a_set_or_dict': [
        ("ages = {'Alice'=22, 'Bob'=23}", ("cannot assign to literal here. Maybe you meant '==' instead of '='?", 1, 9, 1, 16)),
        ('{x=1}', ("invalid syntax. Maybe you meant '==' or ':=' instead of '='?", 1, 2, 1, 5)),
        ("{'a'=1}", ("cannot assign to literal here. Maybe you meant '==' instead of '='?", 1, 2, 1, 5)),
        ('{1, x=2}', ("invalid syntax. Maybe you meant '==' or ':=' instead of '='?", 1, 5, 1, 8)),
        ('{x=1: 2}', ("invalid syntax. Maybe you meant '==' or ':=' instead of '='?", 1, 2, 1, 5)),
    ],
    'in_a_list': [
        ('[x=1]', ("invalid syntax. Maybe you meant '==' or ':=' instead of '='?", 1, 2, 1, 5)),
        ('[1=2]', ("cannot assign to literal here. Maybe you meant '==' instead of '='?", 1, 2, 1, 3)),
        ('[a.b=1]', ("cannot assign to attribute here. Maybe you meant '==' instead of '='?", 1, 2, 1, 5)),
        ('[a[0]=1]', ("cannot assign to subscript here. Maybe you meant '==' instead of '='?", 1, 2, 1, 6)),
        ('[f()=1]', ("cannot assign to function call here. Maybe you meant '==' instead of '='?", 1, 2, 1, 5)),
        ('[x+1=2]', ("cannot assign to expression here. Maybe you meant '==' instead of '='?", 1, 2, 1, 5)),
        ('x = [y=2]', ("invalid syntax. Maybe you meant '==' or ':=' instead of '='?", 1, 6, 1, 9)),
        ('[x = y == z]', ("invalid syntax. Maybe you meant '==' or ':=' instead of '='?", 1, 2, 1, 7)),
        ('[1, x=2]', ("invalid syntax. Maybe you meant '==' or ':=' instead of '='?", 1, 5, 1, 8)),
        ('[x=1 for x in y]', ("invalid syntax. Maybe you meant '==' or ':=' instead of '='?", 1, 2, 1, 5)),
        ('[*a, b=1]', ("invalid syntax. Maybe you meant '==' or ':=' instead of '='?", 1, 6, 1, 9)),
    ],
    'still_plain_invalid_syntax': [
        ('[True=1]', ('invalid syntax', 1, 6, 1, 7)),
        ('[None=1]', ('invalid syntax', 1, 6, 1, 7)),
        ('[(a, b)=1]', ('invalid syntax', 1, 8, 1, 9)),
        ('[x=1=2]', ('invalid syntax', 1, 3, 1, 4)),
        ('[x := 1 = 2]', ('invalid syntax', 1, 9, 1, 10)),
        ('{x: y=1}', ('invalid syntax', 1, 6, 1, 7)),
        ('[[a]=1]', ('invalid syntax', 1, 5, 1, 6)),
    ],
}
LEGAL = ['[x == 1]', '[lambda x=1: x]', '{x: 1}', '[f(a=1)]', '[x := 1]', '{x := 1}']

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
        print('%-28s %s' % (key, 'OK' if ok else 'FAIL'))
        if not ok:
            for (source, want), got in zip(CASES.get(key, [(s, 'ok') for s in LEGAL]), r[key]):
                if got != want:
                    print('    %r: got %r, want %r' % (source, got, want))
    print(SUMMARY)
