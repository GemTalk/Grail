"""Fixture: a replacement field that is not an expression is CPython's field error.

CPython parses a field's expression as an annotated_rhs and then reads the
token after it (Grammar/python.gram:1510-1527, invalid_fstring_replacement_field):
no expression at all is ``expecting a valid expression after '{'``, a stray
token ``expecting '=', or '!', or ':', or '}'``, and something after the debug
``=`` ``expecting '!', or ':', or '}'``, each at the token it names.  A field
whose expression is only whitespace or a comment names what follows it.  An
error the expression has of its own -- a missing comma, a conditional with no
``else``, a bad literal -- is that error, at its place in the source.

Grail parses a field wrapped in parentheses, and reported ``invalid syntax``
at the child parse's own coordinates; the wrapping also accepted a bare
generator (``f'{x for x in y}'``) and made ``f'{*a}'`` a group's error
(test_fstring test_invalid_syntax_error_message, test_missing_expression,
test_syntax_error_for_starred_expressions).  Every check here holds under
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
    'no_expression': [
        ("f'{*}'", ("f-string: expecting a valid expression after '{'", 1, 4, 1, 5)),
        ("f'{,}'", ("f-string: expecting a valid expression after '{'", 1, 4, 1, 5)),
        ("f'{.}'", ("f-string: expecting a valid expression after '{'", 1, 4, 1, 5)),
        ("f'{not}'", ("f-string: expecting a valid expression after '{'", 1, 4, 1, 7)),
        ("f'{lambda}'", ("f-string: expecting a valid expression after '{'", 1, 4, 1, 10)),
        ("f'{await}'", ("f-string: expecting a valid expression after '{'", 1, 4, 1, 9)),
        ("f'{del x}'", ("f-string: expecting a valid expression after '{'", 1, 4, 1, 7)),
        ("\n\nf'{.}'", ("f-string: expecting a valid expression after '{'", 3, 4, 3, 5)),
    ],
    'stray_token': [
        ("f'{a +}'", ("f-string: expecting '=', or '!', or ':', or '}'", 1, 6, 1, 7)),
        ("f'{1;}'", ("f-string: expecting '=', or '!', or ':', or '}'", 1, 5, 1, 6)),
        ("f'{a for}'", ("f-string: expecting '=', or '!', or ':', or '}'", 1, 6, 1, 9)),
        ("f'{a==}'", ("f-string: expecting '=', or '!', or ':', or '}'", 1, 5, 1, 7)),
        ("f'{x;y}'", ("f-string: expecting '=', or '!', or ':', or '}'", 1, 5, 1, 6)),
        ("f'{a +* 2}'", ("f-string: expecting '=', or '!', or ':', or '}'", 1, 6, 1, 7)),
        ("f'{a.}'", ("f-string: expecting '=', or '!', or ':', or '}'", 1, 5, 1, 6)),
        ("f'{1 if}'", ("f-string: expecting '=', or '!', or ':', or '}'", 1, 6, 1, 8)),
        ("f'{x for x in}'", ("f-string: expecting '=', or '!', or ':', or '}'", 1, 6, 1, 9)),
        ("f'{x for x in y}'", ("f-string: expecting '=', or '!', or ':', or '}'", 1, 6, 1, 9)),
        ("f'{a == = b}'", ("f-string: expecting '=', or '!', or ':', or '}'", 1, 6, 1, 8)),
        ("f'{1=}{1;}'", ("f-string: expecting '=', or '!', or ':', or '}'", 1, 9, 1, 10)),
    ],
    'after_debug_equals': [
        ("f'{a=b}'", ("f-string: expecting '!', or ':', or '}'", 1, 6, 1, 7)),
        ("f'{a = 1}'", ("f-string: expecting '!', or ':', or '}'", 1, 8, 1, 9)),
        ("f'{a = b = c}'", ("f-string: expecting '!', or ':', or '}'", 1, 8, 1, 9)),
    ],
    'whitespace_or_comment_before': [
        ("f'{\n}'", ("f-string: valid expression required before '}'", 2, 1, 2, 2)),
        ("f'''{\n# only a comment\n}'''", ("f-string: valid expression required before '}'", 3, 1, 3, 2)),
        ("f'''{ # c\n}'''", ("f-string: valid expression required before '}'", 2, 1, 2, 2)),
        ("f'''{\n#c\n=}'''", ("f-string: valid expression required before '='", 3, 1, 3, 2)),
        ("f'''{\t\x0c\r\n!a}'''", ("f-string: valid expression required before '!'", 2, 1, 2, 2)),
        ("f'''{\t\x0c\r\n:a}'''", ("f-string: valid expression required before ':'", 2, 1, 2, 2)),
        ("f'''{\t\x0c\r\n=}'''", ("f-string: valid expression required before '='", 2, 1, 2, 2)),
        ("f'''{\t\x0c\r\n}'''", ("f-string: valid expression required before '}'", 2, 1, 2, 2)),
    ],
    'the_expressions_own_error': [
        ("f'{a b}'", ('invalid syntax. Perhaps you forgot a comma?', 1, 4, 1, 7)),
        ("f'{1 1}'", ('invalid syntax. Perhaps you forgot a comma?', 1, 4, 1, 7)),
        ("f'{a b c}'", ('invalid syntax. Perhaps you forgot a comma?', 1, 4, 1, 7)),
        ("f'{(a b)}'", ('invalid syntax. Perhaps you forgot a comma?', 1, 5, 1, 8)),
        ("f'{a, b c}'", ('invalid syntax. Perhaps you forgot a comma?', 1, 7, 1, 10)),
        ("f'{a.1}'", ('invalid syntax. Perhaps you forgot a comma?', 1, 4, 1, 7)),
        ("f'{a if b}'", ("expected 'else' after 'if' expression", 1, 4, 1, 10)),
        ("f'{a if b else}'", ("expected expression after 'else', but statement is given", 1, 15, 1, 16)),
        ("f'{1_}'", ('invalid decimal literal', 1, 5, 1, 5)),
        ("f'{0x}'", ('invalid hexadecimal literal', 1, 5, 1, 5)),
    ],
    'starred': [
        ("f'{*a}'", ("can't use starred expression here", 1, 4, 1, 6)),
    ],
    'in_a_later_field': [
        ("x = f'{a} and {b +}'", ("f-string: expecting '=', or '!', or ':', or '}'", 1, 18, 1, 19)),
        ("f'''{a}\n{b +}'''", ("f-string: expecting '=', or '!', or ':', or '}'", 2, 4, 2, 5)),
        ("y = f'{1} {2 3}'", ('invalid syntax. Perhaps you forgot a comma?', 1, 12, 1, 15)),
    ],
}
LEGAL = ["f'{x:}'", "f'{(x for x in y)}'", "f'{a:=1}'", "f'{x!r}'", "f'{*a,}'", "f'{x # c\n}'", "f'{ x }'", "f'{a if b else c}'"]

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
        print('%-30s %s' % (key, 'OK' if ok else 'FAIL'))
        if not ok:
            for (source, want), got in zip(CASES.get(key, [(s, 'ok') for s in LEGAL]), r[key]):
                if got != want:
                    print('    %r: got %r, want %r' % (source, got, want))
    print(SUMMARY)
