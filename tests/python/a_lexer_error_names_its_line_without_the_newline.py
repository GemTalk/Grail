"""Fixture: a lexer error's text is its line without the newline.

CPython's lexer reports its own errors with the line they are on WITHOUT
its newline as the SyntaxError's text (Parser/lexer/lexer.c,
_syntaxerror_range): an unterminated string, an invalid literal or
character, a bracket closed by the wrong one or by none, incompatible
prefixes, an f-string's lexer errors.  The parser's errors -- and the
lexer's line continuation and unindent, which it hands the parser to report
-- keep the newline.  Grail kept it for all of them; test_fstring's
test_not_closing_quotes compares the text of an unterminated triple-quoted
f-string.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

r = {}

TRIPLE = '"' * 3


def text(source):
    try:
        compile(source, '<fixture>', 'exec')
    except SyntaxError as error:
        return error.text
    return 'compiles'


r['unterminated_strings'] = [text('x = "abc\ny = 1\n'),
                             text('x = 1\nz = f' + TRIPLE + '\nab\n'),
                             text('x = 1\nz = ' + TRIPLE + 'abc\n')]
r['brackets'] = [text('x = ) + 1\n'), text('x = (1]\n'), text('x = ' + '(' * 201 + '\n')[-3:]]
r['literals_and_characters'] = [text('x = 0x\n'), text('x = 1e\n'), text('x = 012\n'),
                                text('x = 1 ' + chr(0x20AC) + ' 2\n'), text('x = bu"a"\n')]
r['f_string_lexer_errors'] = [text("x = f'{a)}'\nz = 3\n"), text("x = f'{a'\nz = 3\n"),
                              text("x = f'{a:\n}'\nz = 3\n")]
r['parser_errors_keep_the_newline'] = [text('x = (\n'), text('x = 1 +\n'), text('if x:\n    y = 1\n  z = 2\n'),
                                       text('x = ' + chr(92) + ' y\n')]

EXPECTED = {
    'unterminated_strings': ['x = "abc', 'z = f' + TRIPLE, 'z = ' + TRIPLE + 'abc'],
    'brackets': ['x = ) + 1', 'x = (1]', '((('],
    'literals_and_characters': ['x = 0x', 'x = 1e', 'x = 012', 'x = 1 ' + chr(0x20AC) + ' 2', 'x = bu"a"'],
    'f_string_lexer_errors': ["x = f'{a)}'", "x = f'{a'", "x = f'{a:"],
    'parser_errors_keep_the_newline': ['x = (\n', 'x = 1 +\n', '  z = 2\n', 'x = ' + chr(92) + ' y\n'],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-32s -> %s' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, ascii(actual)))
    print(SUMMARY)
