"""Fixture: a replacement field holding a no-break space names it.

Python's tokenizer skips only spaces, tabs, form feeds and newlines between
tokens; any other Unicode space is ``invalid non-printable character'',
inside an f-string's replacement field as anywhere (Parser/lexer/lexer.c).
Grail trimmed a field's text with GemStone's separators, which include
U+00A0, so ``f'''{<U+00A0>}''''' was an empty field -- ``expecting a valid
expression after '{''' -- where test_fstring's test_missing_expression
expects the character named.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

r = {}

NO_BREAK_SPACE = chr(0xA0)
IDEOGRAPHIC_SPACE = chr(0x3000)


def message(source):
    try:
        compile(source, '<fixture>', 'eval')
    except SyntaxError as error:
        return error.msg
    return 'compiles'


r['a_field_of_one_no_break_space'] = message("f'''{" + NO_BREAK_SPACE + "}'''")
r['beside_an_expression'] = [message("f'{x" + NO_BREAK_SPACE + "}'"), message("f'{" + IDEOGRAPHIC_SPACE + "x}'")]
r['python_layout_still_trims'] = [message("f'{ x }'"), message("f'''{\tx\n}'''"), message("f'{\fx}'")]
r['an_empty_field_is_still_refused'] = message("f'{ }'")

EXPECTED = {
    'a_field_of_one_no_break_space': 'invalid non-printable character U+00A0',
    'beside_an_expression': ['invalid non-printable character U+00A0', 'invalid non-printable character U+3000'],
    'python_layout_still_trims': ['compiles', 'compiles', 'compiles'],
    'an_empty_field_is_still_refused': "f-string: valid expression required before '}'",
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-34s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
