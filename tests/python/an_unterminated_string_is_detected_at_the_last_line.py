"""Fixture: an unterminated triple-quoted string is detected at the last line.

CPython's lexer names, in ``unterminated triple-quoted string literal
(detected at line N)'', the line it reached at the end of the input: the
last line, whose newline ends the source (Parser/lexer/lexer.c).  Grail
counted one more, a line after that final newline which is not there, so a
source ending in a newline was reported a line late -- test_fstring's
test_not_closing_quotes source, seven lines, at line 8.  A single-quoted
string is refused at its own line, as before.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

r = {}

TRIPLE = '"' * 3


def message(source, mode='exec'):
    try:
        compile(source, '<fixture>', mode)
    except SyntaxError as error:
        return error.msg
    return 'compiles'


seven = 'x = 1 + 1\ny = 2 + 2\nz = f' + TRIPLE + '\nsdfjnsdfjsdf\nsdfsdfs{1+\n2} dfigdf {3+\n4}sdufsd""\n'
r['ending_in_a_newline'] = [message('z = ' + TRIPLE + '\n'), message('x = 1\nz = ' + TRIPLE + 'abc\n'),
                            message(seven), message(TRIPLE + 'abc\n', 'eval')]
r['ending_without_one'] = [message('z = ' + TRIPLE), message('x = 1\nz = f' + TRIPLE + '\nab')]
r['a_single_quoted_one_at_its_own_line'] = message('x = "abc\ny = 1\n')

EXPECTED = {
    'ending_in_a_newline': ['unterminated triple-quoted string literal (detected at line 1)',
                            'unterminated triple-quoted string literal (detected at line 2)',
                            'unterminated triple-quoted f-string literal (detected at line 7)',
                            'unterminated triple-quoted string literal (detected at line 1)'],
    'ending_without_one': ['unterminated triple-quoted string literal (detected at line 1)',
                           'unterminated triple-quoted f-string literal (detected at line 3)'],
    'a_single_quoted_one_at_its_own_line': 'unterminated string literal (detected at line 1)',
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-36s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
