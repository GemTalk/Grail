"""Fixture: two expressions side by side inside brackets are a missing comma.

CPython's invalid_expression (Grammar/python.gram:1248-1250): where an
expression starts, a disjunction followed directly by another expression is
``invalid syntax. Perhaps you forgot a comma?``, drawn from the disjunction to
the end of the other expression -- inside brackets only, and not when the
disjunction opens with a soft keyword or with a NAME followed by a string, nor
when it is the legacy print or exec.  A comprehension's iterable and conditions
are disjunctions, not expressions, so they never qualify, and neither does a
dict's ``**`` operand, which is a bitwise_or -- Grail parsed it as an expression
and so also accepted ``{**a or b}``.  And in an expression that opens with a
string and ``+`` or ``-``, CPython's first alternative of the same rule parses
the operands with its error rules off and memoizes the failure, so ``'a' + (1
2)`` stays plain invalid syntax.  Grail said so for a
call's arguments alone, from the start of the argument (test_exceptions
testSyntaxErrorMessage and testSyntaxErrorOffset).  Every check here holds
under CPython 3.14, which is what makes it evidence.
"""

r = {}

COMMA = 'invalid syntax. Perhaps you forgot a comma?'


def outcome(source):
    try:
        compile(source, '<fragment>', 'exec')
        return 'ok'
    except SyntaxError as exc:
        return (exc.msg, exc.lineno, exc.offset, exc.end_lineno, exc.end_offset)


GROUPS = {
    'in_each_bracket': [
        ('[a b c d e f]', (1, 2, 1, 5)), ('(a b)', (1, 2, 1, 5)), ('f(a b)', (1, 3, 1, 6)),
        ('f(x, a b)', (1, 6, 1, 9)), ('{a b}', (1, 2, 1, 5)), ('{1: a b}', (1, 5, 1, 8)),
        ('x[a b]', (1, 3, 1, 6)), ('(a\n b)', (1, 2, 2, 3)), ('x = [a\nb]', (1, 6, 2, 2)),
        ('a[1:2 3]', (1, 5, 1, 8)), ('a[b c:d]', (1, 3, 1, 6)), ('(1 2 3)', (1, 2, 1, 5)),
        ('[a  b]', (1, 2, 1, 6)), ('[1 2]', (1, 2, 1, 5)), ('[a, b c]', (1, 5, 1, 8)),
        ('[a b for x in y]', (1, 2, 1, 5))],
    'head_is_the_whole_disjunction': [
        ('[a.b c]', (1, 2, 1, 7)), ('[a+1 b]', (1, 2, 1, 7)), ('[not a b]', (1, 2, 1, 9)),
        ('["a" "b" c]', (1, 2, 1, 11)), ('[a is b c]', (1, 2, 1, 10)), ('[f"x" y]', (1, 2, 1, 8)),
        ('[a.b "x"]', (1, 2, 1, 9)), ('[matchx y]', (1, 2, 1, 10))],
    'other_is_the_whole_expression': [('[a b + 1]', (1, 2, 1, 9)), ('[a not b]', (1, 2, 1, 9))],
    'a_string_not_followed_by_plus_or_minus': [
        ("x + 'a' + (1 2)", (1, 12, 1, 15)), ("'a'.join(b c)", (1, 10, 1, 13)),
        ("'a' 'b' + (1 2)", (1, 12, 1, 15)), ("'a' % (b c)", (1, 8, 1, 11))],
    'head_inside_an_expression': [
        ('[x if y else z w]', (1, 14, 1, 17)), ('[lambda: a b]', (1, 10, 1, 13)),
        ('f(a=1 b)', (1, 5, 1, 8)), ('[a := 1 b]', (1, 7, 1, 10)), ('f(*a b)', (1, 4, 1, 7)),
        ('f(**a b)', (1, 5, 1, 8)), ('{a: b c}', (1, 5, 1, 8)), ('print(a b)', (1, 7, 1, 10)),
        ('lambda: (a b)', (1, 10, 1, 13)), ('(yield a b)', (1, 8, 1, 11))],
}
PLAIN = {
    'excluded_heads': [
        ('[f "x"]', (1, 4, 1, 7)), ('[u "x"]', (1, 4, 1, 7)), ('[match x]', (1, 8, 1, 9)),
        ('[_ x]', (1, 4, 1, 5)), ('[type x]', (1, 7, 1, 8)), ('[case x]', (1, 7, 1, 8)),
        ('[a "x"]', (1, 4, 1, 7))],
    'not_an_expression_position': [
        ('[a for x in y z]', (1, 15, 1, 16)), ('[a for x in y if c d]', (1, 20, 1, 21)),
        ('{**a b}', (1, 6, 1, 7)), ('[a, *b c]', (1, 8, 1, 9)), ('f(a for a in b c)', (1, 16, 1, 17))],
    'outside_brackets': [('a b', (1, 3, 1, 4)), ('x = a b', (1, 7, 1, 8))],
    'operands_after_a_string_and_plus_or_minus': [
        ("'a' + (1 2)", (1, 10, 1, 11)), ("'a' - [b c]", (1, 10, 1, 11)),
        ("x = 'a' + (1 2)", (1, 14, 1, 15)), ("'a' + f(b c)", (1, 11, 1, 12))],
    'dict_unpacking_takes_a_bitwise_or': [
        ('{**a if b else c}', (1, 6, 1, 8)), ('{**a or b}', (1, 6, 1, 8)),
        ('{1: 2, **a and b}', (1, 12, 1, 15)), ('{**not a}', (1, 4, 1, 7))],
}

EXPECTED = {}
for key, cases in GROUPS.items():
    r[key] = [outcome(source) for source, _ in cases]
    EXPECTED[key] = [(COMMA,) + location for _, location in cases]
for key, cases in PLAIN.items():
    r[key] = [outcome(source) for source, _ in cases]
    EXPECTED[key] = [('invalid syntax',) + location for _, location in cases]
r['legal'] = [outcome(each) for each in ('[(a) (b)]', '[a [b]]', '[a (b)]', '[a -1]', '{**a | b}', '{**(a or b)}')]
EXPECTED['legal'] = ['ok'] * 6

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        ok = r[key] == EXPECTED[key]
        print('%-30s %s' % (key, 'OK' if ok else 'FAIL'))
        if not ok:
            for got, want in zip(r[key], EXPECTED[key]):
                if got != want:
                    print('    got %r, want %r' % (got, want))
    print(SUMMARY)
