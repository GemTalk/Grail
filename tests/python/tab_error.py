"""Fixture: indentation that mixes tabs and spaces inconsistently is a TabError.

CPython's lexer measures each line's indentation twice -- with a tab as eight
columns, which decides the level, and with a tab as one -- and the two have to
agree: the same level, a deeper one, or the level a dedent returns to
(Parser/lexer/lexer.c).  A line where they disagree reads differently at
different tab widths, and is ``TabError: inconsistent use of tabs and spaces
in indentation``.  Grail measured once, so ``\\t1/0`` followed by
``    \\t1/0`` was the same level (test_exceptions testRaising and
testSyntaxErrorMissingParens).

Consistent indentation, by tabs, by spaces, or by the same mix on every line,
still compiles.  Every check here holds under CPython 3.14, which is what makes
it evidence.
"""

r = {}


def outcome(source):
    try:
        compile(source, '<fragment>', 'exec')
        return 'ok'
    except SyntaxError as exc:
        return (type(exc).__name__, exc.msg, exc.lineno, exc.offset, exc.end_offset)


TAB = ('TabError', 'inconsistent use of tabs and spaces in indentation', 3, 1, 0)
r['inconsistent'] = [outcome(each) for each in (
    'if 1:\n        x\n\ty\n',
    'try:\n\t1/0\n    \t1/0\nfinally:\n pass\n',
    'if 1:\n\tx\n        y\n',
    'if 1:\n  \tx\n\ty\n',
    'if True:\n        print()\n\texec "mixed tabs and spaces"\n')]
r['consistent'] = [outcome(each) for each in (
    'if 1:\n\tx\n\ty\n', 'if 1:\n        x\n        y\n',
    'if 1:\n\tif 2:\n\t\tx\n\ty\n', 'if 1:\n \tx\n \ty\n', 'if 1:\n\x0c  x\n  y\n')]
r['still_an_indentation_error'] = outcome('if 1:\n    x\n  y\n')[:2]
r['is_an_indentation_error'] = issubclass(TabError, IndentationError)

EXPECTED = {
    'inconsistent': [TAB] * 5,
    'consistent': ['ok'] * 5,
    'still_an_indentation_error': ('IndentationError', 'unindent does not match any outer indentation level'),
    'is_an_indentation_error': True,
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        print('%-26s %-5s -> %r' % (key, 'OK' if actual == EXPECTED[key] else 'FAIL', actual))
    print(SUMMARY)
