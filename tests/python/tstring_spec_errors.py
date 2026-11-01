"""Fixture: an error in a t-string field's format spec names the t-string.

A field's format spec may hold replacement fields of its own
(``t'{x:{width}}'``).  CPython reports an error in one of those as it reports
any field error, with the literal named at the head: ``t-string: expecting a
valid expression after '{'``.

Grail parses a spec as an f-string of its own -- right, since an
Interpolation's format_spec is a str -- and so a spec's errors said
``f-string:`` inside a t-string too (test_tstring test_syntax_errors).

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

r = {}


def error_of(source):
    try:
        compile(source, '<fixture>', 'eval')
        return '<compiled>'
    except SyntaxError as e:
        return e.msg


SOURCES = {
    'no_expression': "t'{x:{;}}'",
    'empty_field': "t'{x:{}}'",
    'missing_conversion': "t'{x:{y!}}'",
    'after_debug_equals': "t'{x:{y=z}}'",
    'stray_token': "t'{x:{y;z}}'",
    'nothing_before_equals': "t'{x:{=y}}'",
    'nothing_before_bang': "t'{x:{!r}}'",
    'after_conversion': "t'{x:{y!s!}}'",
    'nested_twice': "t'{x:{y:{;}}}'",
    'unterminated_field': "t'{x:{'",
    'single_close_brace': "t'{x:}}'",
    'f_string_unchanged': "f'{x:{;}}'",
}

for key, source in SOURCES.items():
    r[key] = error_of(source)

x, y, width = 3, 4, 5
r['valid_spec_still_builds'] = (lambda t: (t.interpolations[0].format_spec, t.values))(t'{x:{width}}')


EXPECTED = {
    'no_expression': "t-string: expecting a valid expression after '{'",
    'empty_field': "t-string: valid expression required before '}'",
    'missing_conversion': 't-string: missing conversion character',
    'after_debug_equals': "t-string: expecting '!', or ':', or '}'",
    'stray_token': "t-string: expecting '=', or '!', or ':', or '}'",
    'nothing_before_equals': "t-string: valid expression required before '='",
    'nothing_before_bang': "t-string: valid expression required before '!'",
    'after_conversion': "t-string: expecting ':' or '}'",
    'nested_twice': "t-string: expecting a valid expression after '{'",
    'unterminated_field': "t-string: expecting '}'",
    'single_close_brace': "t-string: single '}' is not allowed",
    'f_string_unchanged': "f-string: expecting a valid expression after '{'",
    'valid_spec_still_builds': ('5', (3,)),
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-24s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
