"""Fixture: a brace in a format spec always opens a field, as in CPython.

CPython's lexer reads every ``{'' of a format spec as the start of a nested
replacement field, doubled or not (Parser/lexer/lexer.c:1478, ``peek != '{'
|| in_format_spec''): ``f'{v:{{x}}}''' formats v with the set {x}, and
``f'{3:{{>10}''' is a nested field whose expression starts ``{>'' --
``expecting a valid expression after '{''', which test_fstring's
test_mismatched_braces expects.  Grail read ``{{'' in a spec as an escaped
brace.  Its parser also met a field the f-string ended inside of before
that field's spec, and took the parentheses it parses a field in for the
user's, so ``f'{a[''' named a mismatched ``)''.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

r = {}


class Spec:
    def __format__(self, spec):
        return spec


def located(source):
    try:
        compile(source, '<fixture>', 'eval')
    except SyntaxError as error:
        return (error.msg, error.lineno, error.offset, error.end_lineno, error.end_offset)
    return 'compiles'


x = 1
EXPECTING = "f-string: expecting a valid expression after '{'"
OPEN = "f-string: expecting '}'"
r['a_doubled_brace_in_a_spec_is_a_field'] = [f'{Spec():{{}}}', f'{Spec():{{4}}}', f'{Spec():a{{x}}b}']
r['outside_a_spec_it_is_an_escape'] = [f'{{3}}', f'{{x}}']
r['a_nested_field_with_no_expression'] = [located("f'{3:{{>10}'"), located("f'{3:{>}'"), located("f'{3:{{>10}}'")]
r['an_open_bracket_in_an_open_field'] = [located("f'{a['"), located("f'{a{'"), located("f'{3:a{{'"),
                                         located("f'{3:{a['")]
r['an_open_field_is_still_reported'] = [located("f'{3:{x}'"), located("f'{3:{x'"), located("f'{a('")]

EXPECTED = {
    'a_doubled_brace_in_a_spec_is_a_field': ['{}', '{4}', 'a{1}b'],
    'outside_a_spec_it_is_an_escape': ['{3}', '{x}'],
    'a_nested_field_with_no_expression': [(EXPECTING, 1, 7, 1, 8)] * 3,
    'an_open_bracket_in_an_open_field': [(OPEN, 1, 6, 1, 6), (OPEN, 1, 6, 1, 6), (OPEN, 1, 9, 1, 9), (OPEN, 1, 9, 1, 9)],
    'an_open_field_is_still_reported': [("f-string: expecting '}', or format specs", 1, 9, 1, 10), (OPEN, 1, 8, 1, 8),
                                        (OPEN, 1, 6, 1, 6)],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-38s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
