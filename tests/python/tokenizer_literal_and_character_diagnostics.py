"""Fixture: the tokenizer's literal warnings and invalid-character errors.

CPython's lexer (Parser/lexer.c, verify_end_of_number) warns about a number
written against a keyword that may follow one -- ``1if x else y'',
``0x1for x in ()'' -- with SyntaxWarning "invalid decimal literal" (or
hexadecimal, octal, binary, imaginary), which a filter can make the
SyntaxError it will become.  It refuses a non-ASCII character that can start
no token by name: "invalid character '⁄' (U+2044)", or "invalid non-printable
character U+00A0".  Grail warned about neither and called both "invalid
syntax"; its escape-sequence warning also named '<string>' rather than the
compiled file.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import warnings

r = {}


def warned(source, mode='eval'):
    with warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter('always')
        try:
            compile(source, '<testcase>', mode)
        except SyntaxError as e:
            return ('SyntaxError', e.msg)
    return [(str(w.message), w.filename, w.lineno) for w in caught]


def refused(source):
    try:
        compile(source, '<testcase>', 'exec')
        return 'ok'
    except SyntaxError as e:
        return (e.msg, e.offset)


r['decimal_if'] = warned('1if x else y')
r['hexadecimal_for'] = warned('[0x1for x in ()]')
r['imaginary_and'] = warned('1jand x')
r['binary_is'] = warned('0b1is x')[0]
r['octal_in'] = warned('0o7in x')
r['spaced_is_silent'] = warned('1 if x else y')
r['identifier_is_an_error'] = warned('1spam')
r['hex_then_identifier'] = warned('0xfand x')
with warnings.catch_warnings():
    warnings.simplefilter('error', SyntaxWarning)
    r['warning_as_error'] = refused('1if x else y')

r['invalid_character'] = refused('x = 1 − 2')
r['after_a_number'] = refused('1⁄7')
r['non_printable'] = refused('x   y')
r['identifiers_still_fine'] = (refused('café = 1'), refused('π = 3'))
r['inside_strings_and_comments'] = (refused('x = "⁄"'), refused('# ⁄\nx = 1'))
r['escape_names_the_file'] = warned('"\\z"', 'exec')

EXPECTED = {
    'decimal_if': [('invalid decimal literal', '<testcase>', 1)],
    'hexadecimal_for': [('invalid hexadecimal literal', '<testcase>', 1)],
    'imaginary_and': [('invalid imaginary literal', '<testcase>', 1)],
    'binary_is': ('invalid binary literal', '<testcase>', 1),
    'octal_in': [('invalid octal literal', '<testcase>', 1)],
    'spaced_is_silent': [],
    'identifier_is_an_error': ('SyntaxError', 'invalid decimal literal'),
    'hex_then_identifier': ('SyntaxError', 'invalid hexadecimal literal'),
    'warning_as_error': ('invalid decimal literal', 1),
    'invalid_character': ("invalid character '−' (U+2212)", 7),
    'after_a_number': ("invalid character '⁄' (U+2044)", 2),
    'non_printable': ('invalid non-printable character U+00A0', 3),
    'identifiers_still_fine': ('ok', 'ok'),
    'inside_strings_and_comments': ('ok', 'ok'),
    'escape_names_the_file': [('"\\z" is an invalid escape sequence. Such sequences will not work in the future. Did you mean "\\\\z"? A raw string is also an option.', '<testcase>', 1)],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        print('%-5s %-28s -> %a' % ('OK' if actual == EXPECTED[key] else 'FAIL',
                                    key, actual))
    print(SUMMARY)
