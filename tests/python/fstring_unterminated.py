"""Fixture: an unterminated f-string or t-string is named as one.

CPython's lexer words the error by the literal's kind -- ``unterminated
f-string literal``, ``unterminated triple-quoted t-string literal`` -- and
keeps ``string literal`` for every other prefix, bytes included
(Parser/lexer/lexer.c:1499-1513).  Grail called them all string literals
(test_fstring test_not_closing_quotes).  The location is the literal's start,
prefix included, as before.  Every check here holds under CPython 3.14, which
is what makes it evidence.
"""

r = {}


def outcome(source):
    try:
        compile(source, '<fragment>', 'exec')
        return 'ok'
    except SyntaxError as exc:
        return (exc.msg, exc.lineno, exc.offset)


r['f_single'] = [outcome(each) for each in ("f'", 'f"', "f'abc", "F'x", "rf'x", "f'{x}abc")]
r['f_triple'] = [outcome(each) for each in ("f'''", 'f"""', "fr'''x")]
r['t_single'] = outcome("t'x")
r['detected_on_a_later_line'] = outcome("f'''\nabc")
r['located_at_the_prefix'] = outcome("x = f'abc")
r['still_a_string_literal'] = [outcome(each) for each in ("'x", "b'x", "Rb'x")]
r['still_a_triple_quoted_string_literal'] = outcome("'''x")

F = ('unterminated f-string literal (detected at line 1)', 1, 1)
EXPECTED = {
    'f_single': [F] * 6,
    'f_triple': [('unterminated triple-quoted f-string literal (detected at line 1)', 1, 1)] * 3,
    't_single': ('unterminated t-string literal (detected at line 1)', 1, 1),
    'detected_on_a_later_line': ('unterminated triple-quoted f-string literal (detected at line 2)', 1, 1),
    'located_at_the_prefix': ('unterminated f-string literal (detected at line 1)', 1, 5),
    'still_a_string_literal': [('unterminated string literal (detected at line 1)', 1, 1)] * 3,
    'still_a_triple_quoted_string_literal': ('unterminated triple-quoted string literal (detected at line 1)', 1, 1),
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        print('%-38s %-5s -> %r' % (key, 'OK' if actual == EXPECTED[key] else 'FAIL', actual))
    print(SUMMARY)
