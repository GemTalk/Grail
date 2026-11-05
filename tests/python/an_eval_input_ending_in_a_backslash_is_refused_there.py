"""Fixture: eval input ending in a backslash is refused at the backslash.

CPython appends a newline to exec input only (Parser/pegen.c,
_PyPegen_run_parser_from_string: exec_input is ``start_rule ==
Py_file_input'').  So a backslash that ends EXEC input continues into the
end of the source, ``unexpected EOF while parsing'' (or the open bracket),
while one that ends EVAL input is followed by nothing at all, ``unexpected
character after line continuation character'', located at the backslash --
what test_fstring's test_invalid_backslashes_inside_fstring_context expects
of a lone backslash.  Grail read eval input as exec input.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

r = {}

BACKSLASH = chr(92)
CONTINUATION = 'unexpected character after line continuation character'


def outcome(source, mode):
    try:
        compile(source, '<fixture>', mode)
    except SyntaxError as error:
        return (error.msg, error.lineno, error.offset, error.end_lineno, error.end_offset)
    return 'compiles'


def evaluated(source):
    try:
        eval(source)
    except SyntaxError as error:
        return error.msg
    return 'evaluates'


r['eval_input_ending_in_one'] = [outcome(BACKSLASH, 'eval'), outcome('1 +' + BACKSLASH, 'eval'),
                                 outcome('x' + BACKSLASH, 'eval')]
r['with_a_bracket_open'] = [outcome('(1 +' + BACKSLASH, 'eval'), outcome('f(' + BACKSLASH, 'eval')]
r['eval_reads_it_so_too'] = evaluated(BACKSLASH)
r['followed_by_a_newline_it_continues'] = outcome('1 + ' + BACKSLASH + '\n', 'eval')
r['exec_input_is_unchanged'] = [outcome(BACKSLASH, 'exec'), outcome('(1 +' + BACKSLASH, 'exec')]

EXPECTED = {
    'eval_input_ending_in_one': [(CONTINUATION, 1, 1, 1, 0), (CONTINUATION, 1, 4, 1, 0), (CONTINUATION, 1, 2, 1, 0)],
    'with_a_bracket_open': [(CONTINUATION, 1, 5, 1, 0), (CONTINUATION, 1, 3, 1, 0)],
    'eval_reads_it_so_too': CONTINUATION,
    'followed_by_a_newline_it_continues': ('unexpected EOF while parsing', 1, 6, 1, -1),
    'exec_input_is_unchanged': [('unexpected EOF while parsing', 1, 2, 1, -1), ("'(' was never closed", 1, 1, 1, 0)],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-36s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
