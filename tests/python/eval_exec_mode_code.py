"""Fixture: eval() of a code object compiled in ``exec'' mode.

CPython's eval() treats its first argument two different ways.  A STRING must be
a single expression -- ``eval('x = 1')'' is a SyntaxError.  A CODE OBJECT runs
whatever it holds, so a source compiled in ``exec'' mode executes as STATEMENTS
and eval() answers None:

    code = compile("@undef\ndef f(): pass\nassert f() is None", "test", "exec")
    eval(code, context)          # runs the statements; raises the DECORATOR's error

Grail has no bytecode and compile() answers the source TEXT, which collapsed the
two cases: eval() could not tell a compile() result from a string a caller wrote
and applied the single-expression rule to both, so the call above raised
SyntaxError about the source shape instead of the error the test was after.
compile() now records the mode it was given, keyed by the object it answers, and
eval() runs statements for an ``exec''-mode result.

THE SINGLE-EXPRESSION RULE STILL APPLIES TO STRINGS, which is the other half of
being right -- ``rejects_a_plain_statement_string'' is that half.  A fix that
simply made eval() permissive would pass the interesting checks here and break
that.

The second gap is separate and lives in codegen.  A BARE-NAME decorator is
emitted as a bare Smalltalk identifier, and in exec'd source a name that is
bound nowhere is then a COMPILE error -- ``undefined symbol'' -- which aborts
the whole exec() and cannot be caught from Python.  CPython raises NameError.
``undefined_decorator_raises_name_error'' pins that, and
``context_supplied_decorator_is_found'' pins the boundary the first attempt at
it got wrong: names the CALLER passes in as globals are seeded into the doit's
scope and resolve fine, so only a name bound truly nowhere may become a
NameError.  Reporting those as undefined turned ``@nullval'' into a NameError
where CPython gives TypeError.

Exception TYPES are compared rather than messages: Grail's SyntaxError text for
a rejected eval string differs from CPython's, and that is not what these
checks are about.
"""


def kind(fn):
    """The exception type name, or ('ok', value)."""
    try:
        return ['ok', fn()]
    except BaseException as e:
        return type(e).__name__


def unimp(func):
    raise NotImplementedError


CONTEXT = dict(nullval=None, unimp=unimp)


def exec_mode_code_runs_statements():
    ns = {}
    result = eval(compile('def g():\n    return 7\nvalue = g()', 'test', 'exec'), ns)
    return [result, ns['value']]


def exec_mode_code_answers_none():
    return eval(compile('q = 5', 'test', 'exec'), {})


def eval_mode_code_answers_its_value():
    return eval(compile('2 + 3', 'test', 'eval'))


def rejects_a_plain_statement_string():
    # The half that must NOT change: a string is still single-expression only.
    return [kind(lambda: eval('x = 1')), kind(lambda: eval('a = 1\nb = 2'))]


def accepts_a_plain_expression_string():
    return eval('1 + 1')


def eval_mode_code_through_exec():
    return exec(compile('1 + 1', 'test', 'eval'))


def undefined_decorator_raises_name_error():
    # Bound nowhere: CPython's NameError, not an uncatchable compile failure.
    codestr = "@undef\ndef f(): pass\nassert f() is None"
    return [kind(lambda: eval(compile(codestr, 'test', 'exec'), dict(CONTEXT))),
            kind(lambda: exec(codestr, dict(CONTEXT)))]


def context_supplied_decorator_is_found():
    # Supplied by the CALLER's globals, so it resolves -- and then fails on its
    # own terms.  These three are test_errors' remaining rows.
    out = []
    for expr in ('nullval', 'nullval.attr', 'unimp'):
        codestr = "@%s\ndef f(): pass\nassert f() is None" % expr
        out.append(kind(lambda c=codestr: eval(compile(c, 'test', 'exec'),
                                               dict(CONTEXT))))
    return out


def decorator_defined_inside_the_exec_source():
    # Declared by the source being compiled, so a bare identifier is correct.
    ns = {}
    exec("def d(f):\n    return f\n@d\ndef k(): return 'k'\nout = k()", ns)
    return ns['out']


def a_non_callable_decorator_is_a_type_error():
    return [kind(lambda: exec("@None\ndef f(): pass")),
            kind(lambda: exec("@True\ndef f(): pass"))]


def decorator_syntax_errors_still_raise():
    return [kind(lambda: compile("@pass\ndef f(): pass", 'test', 'exec')),
            kind(lambda: compile("@x = y\ndef f(): pass", 'test', 'exec'))]


def a_local_decorator_still_works():
    # The emit is gated on doit context; this is the ordinary path, unchanged.
    def deco(f):
        return f

    @deco
    def h():
        return 'h'

    return h()


def compile_still_raises_on_bad_source():
    return kind(lambda: compile('x, b += 3', 'test', 'exec'))


r = {
    'exec_mode_code_runs_statements': exec_mode_code_runs_statements(),
    'exec_mode_code_answers_none': exec_mode_code_answers_none(),
    'eval_mode_code_answers_its_value': eval_mode_code_answers_its_value(),
    'rejects_a_plain_statement_string': rejects_a_plain_statement_string(),
    'accepts_a_plain_expression_string': accepts_a_plain_expression_string(),
    'eval_mode_code_through_exec': eval_mode_code_through_exec(),
    'undefined_decorator_raises_name_error': undefined_decorator_raises_name_error(),
    'context_supplied_decorator_is_found': context_supplied_decorator_is_found(),
    'decorator_defined_inside_the_exec_source': decorator_defined_inside_the_exec_source(),
    'a_non_callable_decorator_is_a_type_error': a_non_callable_decorator_is_a_type_error(),
    'decorator_syntax_errors_still_raise': decorator_syntax_errors_still_raise(),
    'a_local_decorator_still_works': a_local_decorator_still_works(),
    'compile_still_raises_on_bad_source': compile_still_raises_on_bad_source(),
}


EXPECTED = {
    'exec_mode_code_runs_statements': [None, 7],
    'exec_mode_code_answers_none': None,
    'eval_mode_code_answers_its_value': 5,
    'rejects_a_plain_statement_string': ['SyntaxError', 'SyntaxError'],
    'accepts_a_plain_expression_string': 2,
    'eval_mode_code_through_exec': None,
    'undefined_decorator_raises_name_error': ['NameError', 'NameError'],
    'context_supplied_decorator_is_found': ['TypeError', 'AttributeError',
                                            'NotImplementedError'],
    'decorator_defined_inside_the_exec_source': 'k',
    'a_non_callable_decorator_is_a_type_error': ['TypeError', 'TypeError'],
    'decorator_syntax_errors_still_raise': ['SyntaxError', 'SyntaxError'],
    'a_local_decorator_still_works': 'h',
    'compile_still_raises_on_bad_source': 'SyntaxError',
}


if __name__ == '__main__':
    for key, expected in EXPECTED.items():
        actual = r[key]
        print('%-5s %-42s -> %r' % ('OK' if actual == expected else 'FAIL',
                                    key, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-5s %-42s is not in EXPECTED' % ('FAIL', extra))
