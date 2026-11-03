"""Fixture: a \\U escape past the last code point is a SyntaxError.

A ``\\UXXXXXXXX'' escape in a str literal names a code point with eight hex
digits, and CPython refuses one above U+10FFFF as the unicode_escape codec
does, "illegal Unicode character" (Objects/unicodeobject.c:6789-6792),
reported as a SyntaxError at the literal.

Grail built the character from the digits unchecked, and GemStone's
Character refused the number with an OutOfRange no Python code can catch:
test_str's test_literals ended the session.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

r = {}


def outcome(source):
    try:
        return ascii(eval(compile(source, '<fixture>', 'eval')))
    except SyntaxError as e:
        return 'SyntaxError: %s' % e.msg


r['last_code_point'] = outcome("'\\U0010ffff'")
r['one_past_it'] = outcome("'\\U00110000'")
r['all_digits_set'] = [outcome("'\\Uffffffff'"), outcome("'\\Ufffffffe'")]
r['inside_a_longer_literal'] = outcome("'ab\\U00110000cd'")
r['the_codec_agrees'] = []
for escape in (b'\\U00110000', b'\\Uffffffff'):
    try:
        escape.decode('unicode_escape')
        r['the_codec_agrees'].append('decoded')
    except UnicodeDecodeError as e:
        r['the_codec_agrees'].append(e.reason)

ILLEGAL = ("SyntaxError: (unicode error) 'unicodeescape' codec can't decode bytes "
           "in position %s: illegal Unicode character")

EXPECTED = {
    'last_code_point': "'\\U0010ffff'",
    'one_past_it': ILLEGAL % '0-9',
    'all_digits_set': [ILLEGAL % '0-9'] * 2,
    'inside_a_longer_literal': ILLEGAL % '2-11',
    'the_codec_agrees': ['illegal Unicode character'] * 2,
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-24s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
