"""Fixture: str() of a SyntaxError is CPython's ``msg (file, line N)``.

CPython's SyntaxError_str (Objects/exceptions.c) renders the message, then the
file's BASENAME and the line in parentheses, or whichever of the two is a str
and an int respectively, and the message alone when neither is.
IndentationError and TabError inherit it.  Grail's SyntaxError inherited
BaseException's, the str of the whole args tuple:
``('invalid syntax', ('<string>', 1, 4, '1 +', 1, 5))``.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

r = {}


def raised(source):
    try:
        exec(source)
    except SyntaxError as e:
        return type(e).__name__, str(e)


r['constructed'] = [str(e) for e in (
    SyntaxError('msg', ('f.py', 3, 2, 'text\n', 3, 4)),
    SyntaxError('msg', ('/some/dir/f.py', 3, 2, 'text\n')),
    SyntaxError('msg', ('f.py', None, 2, 'text\n')),
    SyntaxError('msg', (None, 7, 2, 'text\n')),
    SyntaxError('msg', (None, None, None, None)),
    SyntaxError('msg'),
    SyntaxError(),
    SyntaxError('msg', ('f.py', True, 2, 'text\n')),
    SyntaxError('msg', ('dir/', 1, 1, 'x')))]
e = SyntaxError('msg', ('f.py', 3, 2, 'text\n'))
e.filename = 'other/g.py'
e.lineno = 9
r['after_attribute_stores'] = str(e)
r['raised_by_the_parser'] = [raised(s) for s in (
    '1 +', ')', 'if True:\nx = 1', '\n\nx = = 1')]
r['subclasses'] = [str(IndentationError('m', ('f.py', 2, 1, 'x'))),
                   str(TabError('m', ('f.py', 2, 1, 'x')))]

EXPECTED = {
    'constructed': ['msg (f.py, line 3)', 'msg (f.py, line 3)', 'msg (f.py)',
                    'msg (line 7)', 'msg', 'msg', 'None', 'msg (f.py)', 'msg (, line 1)'],
    'after_attribute_stores': 'msg (g.py, line 9)',
    'raised_by_the_parser': [
        ('SyntaxError', 'invalid syntax (<string>, line 1)'),
        ('SyntaxError', "unmatched ')' (<string>, line 1)"),
        ('IndentationError', "expected an indented block after 'if' statement on line 1 (<string>, line 2)"),
        ('SyntaxError', 'invalid syntax (<string>, line 3)')],
    'subclasses': ['m (f.py, line 2)', 'm (f.py, line 2)'],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        print('%-5s %-24s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL',
                                    key, actual))
    print(SUMMARY)
