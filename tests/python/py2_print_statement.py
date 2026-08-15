"""Fixtures for Py2PrintStatementTestCase -- the Python-2 ``print'' statement.

    print "Hello World"

used to parse as TWO expression statements: the name ``print'' and the string,
each discarded.  So a Python-2 print ran silently and reported nothing, and
``print p'' reported a NameError naming p -- a confusing way to be told the
syntax is Python 2.

A run of simple statements ends at a NEWLINE or the end of input; anything else
is two expressions juxtaposed with no separator, which is a SyntaxError.
CPython names the common case rather than answering ``invalid syntax'', and the
wording below is CPython's exactly (test_print's TestPy2MigrationHint).

Every expectation was checked against CPython 3.14.
"""

HINT = "Missing parentheses in call to 'print'. Did you mean print(...)"


def _syntax_error_for(src):
    try:
        compile(src, '<test>', 'exec')
    except SyntaxError as e:
        return str(e)
    return 'NO ERROR'


def normal_string():
    return HINT in _syntax_error_for('print "Hello World"')


def with_soft_space():
    return HINT in _syntax_error_for('print "Hello World",')


def with_excessive_whitespace():
    return HINT in _syntax_error_for('print  "Hello World", ')


def with_leading_whitespace():
    return HINT in _syntax_error_for('if 1:\n    print "Hello World"\n')


def with_semicolon():
    return HINT in _syntax_error_for('print p;')


def in_a_loop_on_the_same_line():
    return HINT in _syntax_error_for('for i in s: print s')


def exec_gets_its_own_hint():
    msg = _syntax_error_for('exec "code"')
    return "Missing parentheses in call to 'exec'. Did you mean exec(...)" in msg


def an_unnamed_juxtaposition_is_plain_invalid_syntax():
    """Only ``print'' and ``exec'' get the hint; any other two juxtaposed
    expressions are the generic error."""
    msg = _syntax_error_for('x "y"')
    return ('invalid syntax' in msg, 'Missing parentheses' in msg)


def a_real_print_call_still_parses():
    """The check must not reject the Python-3 spelling, nor a semicolon-
    separated run, nor a trailing semicolon."""
    out = []
    print('a', file=None) if False else out.append('ok')
    a = 1; b = 2;
    return (out, a, b)
