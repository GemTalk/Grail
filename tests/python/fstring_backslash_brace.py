"""Fixture: a backslash before a brace in an f-string does not escape it.

In an f-string a brace is either a replacement field or, doubled, a literal
brace -- and a backslash never changes that, raw or not.  The backslash is a
literal character (in a non-raw f-string ``\\{`` is an invalid escape, kept
with a SyntaxWarning), and the brace that follows keeps its job:

    rf'(\\{{[{_dash}])'  ->  '(\\{[-])'      backslash, escaped {, field
    rf'\\{x}'            ->  '\\6'           backslash, field

Grail's tokenizer took the brace into the backslash, as it does for a quote,
so the NEXT brace opened a field that never closed: ``SyntaxError:
unterminated string literal'' for code that builds regexes (#1427).  It
blocked two pygments lexers (int_fiction.py, templates.py).

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import warnings

r = {}

_dash = '-'
x = 6

r['raw'] = [
    rf'(\{{[{_dash}])',
    rf'(\}}?)',
    rf'x\{{y',
    rf'\{x}',
    fr'a\}}b',
    rf'''\{{
''',
    Rf'\{x}\}}',
]

# pygments 2.21's own lines (int_fiction.py:685 and :120, templates.py:2193).
_squote = "'"
_ident_inner = 'ID'
r['pygments'] = [
    rf'(\{{[{_dash}])(![^}}]*)(\}}?)',
    rf'([{_squote}])(@\{{[0-9a-fA-F]*\}})([{_squote}])',
    rf'(\{{%)(-?\s*)(filter)(\s+)({_ident_inner})',
]


def _compiled(src):
    """(value, [warning messages]) for an expression compiled fresh.  The
    warnings are taken from compile() alone: Grail warns AGAIN when the code
    object runs, for any invalid escape, which is a separate defect."""
    with warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter('always')
        code = compile(src, '<f>', 'eval')
    messages = [str(w.message) for w in caught if w.category is SyntaxWarning]
    with warnings.catch_warnings():
        warnings.simplefilter('ignore')
        value = eval(code, {'x': 6})
    return value, messages


# A non-raw f-string: the same value, plus CPython's invalid-escape warning.
r['non_raw'] = [_compiled("f'\\{{'"), _compiled("f'\\{x}'"), _compiled("f'\\}}'")]

# Controls: a raw f-string with no backslash-brace, a raw backslash before a
# quote, and a plain (non-f) string, all unchanged.
r['controls'] = [rf'{x}\d', rf'\'{x}', r'\{', '\\{']


EXPECTED = {
    'raw': ['(\\{[-])', '(\\}?)', 'x\\{y', '\\6', 'a\\}b', '\\{\n', '\\6\\}'],
    'pygments': ['(\\{[-])(![^}]*)(\\}?)',
                 "([\'])(@\\{[0-9a-fA-F]*\\})([\'])",
                 '(\\{%)(-?\\s*)(filter)(\\s+)(ID)'],
    'non_raw': [
        ('\\{', ['"\\{" is an invalid escape sequence. Such sequences will not '
                 'work in the future. Did you mean "\\\\{"? A raw string is also '
                 'an option.']),
        ('\\6', ['"\\{" is an invalid escape sequence. Such sequences will not '
                 'work in the future. Did you mean "\\\\{"? A raw string is also '
                 'an option.']),
        ('\\}', ['"\\}" is an invalid escape sequence. Such sequences will not '
                 'work in the future. Did you mean "\\\\}"? A raw string is also '
                 'an option.']),
    ],
    'controls': ['6\\d', "\\'6", '\\{', '\\{'],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        print('%-5s %-10s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL',
                                    key, actual))
    print(SUMMARY)
