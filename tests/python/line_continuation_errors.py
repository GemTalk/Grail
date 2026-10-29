"""Fixture: a backslash outside a string has to end its line, and a single-quoted f-string's spec ends at its line.

CPython's lexer reads a backslash outside a string as a line continuation,
which has to be followed by the newline: anything else is ``unexpected
character after line continuation character`` at that character, and a
continuation into the end of the source is ``unexpected EOF while parsing``,
or the open bracket's error when there is one, a backslash that ends the
source included (Parser/lexer/lexer.c:433-452, Parser/pegen_errors.c:85-124,
Parser/tokenizer/helpers.c:244-246) -- in an
f-string's replacement field as anywhere else.  A newline in the format spec
of a single-quoted f-string is refused too (lexer.c:1467-1480).  Grail let a
stray backslash fall through to whatever came next and accepted both
newlines (test_fstring test_invalid_backslashes_inside_fstring_context,
test_newlines_in_format_specifiers).  Every check here holds under CPython
3.14, which is what makes it evidence.
"""

r = {}


def outcome(source):
    try:
        compile(source, '<fragment>', 'exec')
        return 'ok'
    except SyntaxError as exc:
        return (exc.msg, exc.lineno, exc.offset, exc.end_lineno, exc.end_offset)


CASES = {
    'character_after_a_continuation': [
        ("\\'a\\'", ('unexpected character after line continuation character', 1, 2, 1, 0)),
        ('\\t3', ('unexpected character after line continuation character', 1, 2, 1, 0)),
        ('x = 1 \\ \n', ('unexpected character after line continuation character', 1, 8, 1, 0)),
        ('x = (1 \\x)', ('unexpected character after line continuation character', 1, 9, 1, 0)),
        ('x = 1\n  \\a', ('unexpected character after line continuation character', 2, 4, 2, 0)),
        ('if 1:\n    \\a', ('unexpected character after line continuation character', 2, 6, 2, 0)),
        ('x = \\\\', ('unexpected character after line continuation character', 1, 6, 1, 0)),
    ],
    'continuation_into_the_end': [
        ('\\', ('unexpected EOF while parsing', 1, 2, 1, -1)),
        ('x = 1 \\', ('unexpected EOF while parsing', 1, 8, 1, -1)),
        ('x = 1 \\\n', ('unexpected EOF while parsing', 1, 8, 1, -1)),
        ('x = 1\n\\', ('unexpected EOF while parsing', 2, 2, 2, -1)),
    ],
    'continuation_with_a_bracket_open': [
        ('x = (1 \\\n', ("'(' was never closed", 1, 5, 1, 0)),
        ('x = (1 \\', ("'(' was never closed", 1, 5, 1, 0)),
        ('(\\', ("'(' was never closed", 1, 1, 1, 0)),
        ('"\\\n"(1 for c in I,\\\n\\', ("'(' was never closed", 2, 2, 2, 0)),
    ],
    'in_an_fstring_field': [
        ("f'{\\'a\\'}'", ('unexpected character after line continuation character', 1, 5, 1, 0)),
        ("f'{\\t3}'", ('unexpected character after line continuation character', 1, 5, 1, 0)),
        ("f'{\\}'", ('unexpected character after line continuation character', 1, 5, 1, 0)),
        ("rf'{\\'a\\'}'", ('unexpected character after line continuation character', 1, 6, 1, 0)),
        ("rf'{\\}'", ('unexpected character after line continuation character', 1, 6, 1, 0)),
    ],
    'newline_in_a_single_quoted_spec': [
        ("f'{1:d\n}'", ('f-string: newlines are not allowed in format specifiers for single quoted f-strings', 1, 7, 1, 7)),
        ("f'__{\n    1:d\n}__'", ('f-string: newlines are not allowed in format specifiers for single quoted f-strings', 2, 8, 2, 8)),
        ('f"{value:.\n   {\'2f\'}}"', ('f-string: newlines are not allowed in format specifiers for single quoted f-strings', 1, 11, 1, 11)),
        ('f"{value:\n    #{\'x\'}}"', ('f-string: newlines are not allowed in format specifiers for single quoted f-strings', 1, 10, 1, 10)),
        ("f'{x:\n}'", ('f-string: newlines are not allowed in format specifiers for single quoted f-strings', 1, 6, 1, 6)),
        ("t'{1:d\n}'", ('t-string: newlines are not allowed in format specifiers for single quoted t-strings', 1, 7, 1, 7)),
    ],
}
LEGAL = ['\\\ny = 2', 'x = 1 \\\n\n', 'x = (1 +\n2)', "f'''__{\n    1:d\n}__'''", "f'''{1:d\n}'''", "f'{x:{\n1}}'", "rf'{x:\\d}'", "f'{1 + \\\n2}'"]

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
