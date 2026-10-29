"""Fixture: an f-string that ends inside a replacement field is CPython's error for it.

CPython's lexer reads a field's expression as tokens, so a string inside it
that opens with the f-string's own quote and runs out is where the f-string
really ended: once the parser has had the field's tokens before it, that is
``f-string: expecting '}'``, at the string (Parser/lexer/lexer.c:1180-1192).
In a format spec the f-string's quote ends the f-string outright, and the
parser asks for ``'}', or format specs`` there.  A comment that takes the
closing brace leaves the brace never closed, and a ``}`` closing a ``(`` or
``[`` is a mismatched bracket, as anywhere else.  Grail called every one of
them an unterminated string literal (test_fstring test_mismatched_braces,
test_conversions, test_comments, test_mismatched_parens).  Every check here
holds under CPython 3.14, which is what makes it evidence.
"""

r = {}


def outcome(source):
    try:
        compile(source, '<fragment>', 'exec')
        return 'ok'
    except SyntaxError as exc:
        return (exc.msg, exc.lineno, exc.offset, exc.end_lineno, exc.end_offset)


CASES = {
    'expecting_a_brace': [
        ("f'{'", ("f-string: expecting '}'", 1, 4, 1, 4)),
        ("f'{x'", ("f-string: expecting '}'", 1, 5, 1, 5)),
        ("f'x{'", ("f-string: expecting '}'", 1, 5, 1, 5)),
        ("f'x{x'", ("f-string: expecting '}'", 1, 6, 1, 6)),
        ("f'{3'", ("f-string: expecting '}'", 1, 5, 1, 5)),
        ("f'{3!'", ("f-string: expecting '}'", 1, 6, 1, 6)),
        ("f'{3!s'", ("f-string: expecting '}'", 1, 7, 1, 7)),
        ("f'{i='", ("f-string: expecting '}'", 1, 6, 1, 6)),
        ("f'{{{'", ("f-string: expecting '}'", 1, 6, 1, 6)),
        ("f'{{}}{'", ("f-string: expecting '}'", 1, 8, 1, 8)),
        ("f'{x!r'", ("f-string: expecting '}'", 1, 6, 1, 6)),
        ("f'{a('", ("f-string: expecting '}'", 1, 6, 1, 6)),
        ("f'{a(1'", ("f-string: expecting '}'", 1, 7, 1, 7)),
        ("f'{(1'", ("f-string: expecting '}'", 1, 6, 1, 6)),
        ("f'{x' + 'y'", ("f-string: expecting '}'", 1, 11, 1, 11)),
        ("f'{x}' f'{y'", ("f-string: expecting '}'", 1, 12, 1, 12)),
        ("(f'{x'\n)", ("f-string: expecting '}'", 1, 6, 1, 6)),
        ("f'''{x'''", ("f-string: expecting '}'", 1, 7, 1, 7)),
        ("f'''{x\n'''", ("f-string: expecting '}'", 2, 1, 2, 1)),
        ('f\'{3\' f"}"', ("f-string: expecting '}'", 1, 5, 1, 5)),
        ("t'{x'", ("t-string: expecting '}'", 1, 5, 1, 5)),
    ],
    'expecting_a_brace_or_format_specs': [
        ("f'{3:'", ("f-string: expecting '}', or format specs", 1, 6, 1, 7)),
        ("f'{3:x'", ("f-string: expecting '}', or format specs", 1, 7, 1, 8)),
        ("f'{3!s:'", ("f-string: expecting '}', or format specs", 1, 8, 1, 9)),
        ("f'{3:s'", ("f-string: expecting '}', or format specs", 1, 7, 1, 8)),
        ("f'{3!s:3'", ("f-string: expecting '}', or format specs", 1, 9, 1, 10)),
        ("f'{x:{y}'", ("f-string: expecting '}', or format specs", 1, 9, 1, 10)),
        ("f'{3:{4:'", ("f-string: expecting '}', or format specs", 1, 9, 1, 10)),
        ("f'{s:''^7}'", ("f-string: expecting '}', or format specs", 1, 6, 1, 7)),
    ],
    'the_fields_own_error_first': [
        ("f'{!'", ("f-string: valid expression required before '!'", 1, 4, 1, 5)),
        ("f'{:'", ("f-string: valid expression required before ':'", 1, 4, 1, 5)),
        ("f'{='", ("f-string: valid expression required before '='", 1, 4, 1, 5)),
        ("f'{1=}{;'", ("f-string: expecting a valid expression after '{'", 1, 8, 1, 9)),
        ("f'{1=}{1;'", ("f-string: expecting '=', or '!', or ':', or '}'", 1, 9, 1, 10)),
        ("f'{3!:'", ('f-string: missing conversion character', 1, 6, 1, 7)),
        ("f'{!s:'", ("f-string: valid expression required before '!'", 1, 4, 1, 5)),
    ],
    'a_comment_took_the_brace': [
        ("f'{1#}'", ("'{' was never closed", 1, 3, 1, 0)),
        ("f'{#}'", ("'{' was never closed", 1, 3, 1, 0)),
        ("f'one: {1#}'", ("'{' was never closed", 1, 8, 1, 0)),
        ("f'''{1#}'''", ("'{' was never closed", 1, 5, 1, 0)),
    ],
    'a_bracket_of_the_wrong_kind': [
        ("f'{a(4}'", ("closing parenthesis '}' does not match opening parenthesis '('", 1, 7, 1, 7)),
        ("f'{((}'", ("closing parenthesis '}' does not match opening parenthesis '('", 1, 6, 1, 6)),
        ("f'{a[4}'", ("closing parenthesis '}' does not match opening parenthesis '['", 1, 7, 1, 7)),
    ],
    'another_string_ran_out': [
        ('f\'{"a\'', ('unterminated string literal (detected at line 1)', 1, 4, 1, 4)),
        ('f"{\'a"', ('unterminated string literal (detected at line 1)', 1, 4, 1, 4)),
    ],
}
LEGAL = ['f\'{x:"^7}\'', 'f"{x:\'^7}"', "f'{1#\n}'", 'f\'{"a" + "b"}\'', "f'{(1,\n2)}'", "f'''{x\n}'''"]

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
