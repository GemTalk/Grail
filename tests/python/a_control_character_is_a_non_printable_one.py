"""Fixture: an ASCII control character is an invalid non-printable one.

CPython's lexer refuses a character that starts no token by name: a
non-printable one -- DEL, a vertical tab, any C0 control but the whitespace
it skips -- is ``invalid non-printable character U+XXXX'', while a printable
one like ``$'' falls through to the parser's ``invalid syntax''
(Parser/lexer/lexer.c, tok_get_normal_mode).  Grail named non-ASCII ones
only, and said ``invalid syntax'' for every ASCII control character.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

r = {}


def refusal(code_point):
    try:
        compile('x = 1 ' + chr(code_point) + '\n', '<fixture>', 'exec')
    except SyntaxError as error:
        return (error.msg, error.lineno, error.offset)
    return 'compiles'


r['control_characters_are_named'] = [refusal(each) for each in (0x7F, 0x01, 0x1B, 0x0B, 0x1F)]
r['printable_ones_stay_invalid_syntax'] = [refusal(each)[0] for each in (0x24, 0x3F, 0x60, 0x21)]
r['whitespace_is_still_skipped'] = [refusal(0x09), refusal(0x0C)]

EXPECTED = {
    'control_characters_are_named': [('invalid non-printable character U+%04X' % each, 1, 7)
                                     for each in (0x7F, 0x01, 0x1B, 0x0B, 0x1F)],
    'printable_ones_stay_invalid_syntax': ['invalid syntax'] * 4,
    'whitespace_is_still_skipped': ['compiles', 'compiles'],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-36s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
