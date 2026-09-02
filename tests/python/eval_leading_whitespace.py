"""What ``eval`` does with a string before it parses it, and what the
tokenizer does with the escapes inside one.

TWO UNRELATED THINGS, in one place because one fixture found the other:
six of test_string_literals' failures were a leading space, and once
those stopped failing, two more turned out to be crashes.


LEADING WHITESPACE
------------------
``eval`` strips it from its source; ``exec`` does not.

    eval(" 1+1")     ->  2
    exec(" x = 1")   ->  IndentationError: unexpected indent

An expression cannot be indented -- ``compile(" 1+1", "<s>", "eval")``
raises IndentationError, the same as exec -- so this is not a property of
expressions.  It is the ``eval`` BUILTIN, which lstrips spaces and tabs
off the source before compiling it, and CPython documents it: the source
"may also be a string, which will be parsed as if it were an expression,
with leading whitespace stripped".

That makes the triple-quoted idiom work, which is how CPython's own test
suite writes literal tests:

    self.assertEqual(eval(\"\"\" 'x' \"\"\"), 'x')

Grail parsed the space and answered IndentationError, which took six
tests in test_string_literals and one in test_builtin.

The rule is exactly ``lstrip(' \\t')`` -- a NEWLINE is not stripped, so
``eval("\\n 1+1")`` still raises, and it raises about line 2.

Every expectation was checked against CPython 3.14 first.
"""

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or 'got: %r' % (got,)


def _outcome(fn):
    try:
        return fn()
    except Exception as exc:
        return type(exc).__name__


# -- eval strips it ------------------------------------------------------

def _eval_strips():
    return (_outcome(lambda: eval(' 1+1')),
            _outcome(lambda: eval('\t1+1')),
            _outcome(lambda: eval('  \t 1+1')),
            _outcome(lambda: eval(' 1+1 ')),
            _outcome(lambda: eval(' 1+1\n')))


def _the_triple_quoted_idiom():
    return (eval(""" 'x' """), eval(r""" '\x01' """), eval(""" b'x' """))


check('eval_strips', _eval_strips(), (2, 2, 2, 2, 2))
check('the_triple_quoted_idiom', _the_triple_quoted_idiom(),
      ('x', chr(1), b'x'))


# -- but only spaces and tabs, and only at the front ---------------------
#
# A leading NEWLINE is not whitespace for this purpose: it is not
# stripped, so what follows it is a second line, and an indented second
# line is an indented line.

def _a_newline_is_not_stripped():
    return (_outcome(lambda: eval('\n1+1')),
            _outcome(lambda: eval('\n 1+1')),
            _outcome(lambda: eval(' \n1+1')),
            _outcome(lambda: eval('\t\n 1+1')))


check('a_newline_is_not_stripped', _a_newline_is_not_stripped(),
      (2, 'IndentationError', 2, 'IndentationError'))


# -- exec does not strip, and neither does compile -----------------------
#
# The same source, the same indent, three different answers -- which is
# why this belongs in eval() and not in the parser.

def _exec_does_not_strip():
    return (_outcome(lambda: exec(' x = 1')),
            _outcome(lambda: exec('\tx = 1')),
            _outcome(lambda: exec('x = 1')))


def _compile_does_not_strip():
    return (_outcome(lambda: compile(' 1+1', '<s>', 'eval') and 'compiled'),
            _outcome(lambda: compile('1+1', '<s>', 'eval') and 'compiled'))


check('exec_does_not_strip', _exec_does_not_strip(),
      ('IndentationError', 'IndentationError', None))
check('compile_does_not_strip', _compile_does_not_strip(),
      ('IndentationError', 'compiled'))


# -- and the value still lands where it should ---------------------------
#
# Stripping must not disturb what eval does with globals and locals: a
# walrus inside the expression binds in the mapping eval was given.

def _bindings_still_land():
    ns = {}
    value = eval(' (x := 5) + 1 ', ns)
    return (value, ns.get('x'))


check('bindings_still_land', _bindings_still_land(), (6, 5))


# -- and stripping must not disturb a COMPILED source ------------------
#
# eval() of a code object compiled in "exec" mode runs the statements and
# answers None -- the single-expression rule is for a STRING argument.
# Grail tells the two apart with a registry keyed by the source OBJECT,
# so stripping the source before that probe handed it a copy, the probe
# missed, and the statements were run as one expression.  That took
# test_decorators' test_errors, whose whole point is that the decorator's
# own exception propagates; the strip now happens after the probe.

def _a_compiled_exec_source_still_runs_as_statements():
    ns = {}
    result = eval(compile('a = 1\nb = a + 1', '<s>', 'exec'), ns)
    return (result, ns.get('a'), ns.get('b'))


def _a_decorator_raises_its_own_exception():
    def unimp(f):
        raise NotImplementedError
    context = dict(unimp=unimp)
    code = compile('@unimp\ndef f(): pass', '<s>', 'exec')
    try:
        eval(code, context)
        return 'no raise'
    except NotImplementedError:
        return 'NotImplementedError'


check('a_compiled_exec_source_still_runs_as_statements',
      _a_compiled_exec_source_still_runs_as_statements(), (None, 1, 2))
check('a_decorator_raises_its_own_exception',
      _a_decorator_raises_its_own_exception(), 'NotImplementedError')


# -- and the escapes inside the literal it then parses -------------------
#
# TRUNCATED HEX ESCAPES were an UNCATCHABLE crash.  Each of \x, \u and \U
# read its digits with a fixed run of ``advance`` and no check: at the end
# of the source that answers nil, and appending nil raised a
# MessageNotUnderstood out of the TOKENIZER -- fatal to whatever was
# compiling, and not something ``except SyntaxError`` could see.  A
# non-hex digit was no better: it was consumed and handed to the integer
# parser, so ``'\xzz'`` produced whatever that made of it.
#
# AN OCTAL ESCAPE OVER \377 was the same class of crash in a bytes
# literal.  CPython wraps it -- b'\400' is b'\x00' -- and Grail carried
# 256 through to ByteArray at:put:, which raised ArgumentError 2099 out of
# the PARSER.  A str literal is not wrapped: '\400' is chr(256).

ESCAPES = [
    r"'\x'", r"'\x0'", r"'\u'", r"'\u0'", r"'\u00'", r"'\u000'",
    r"'\U'", r"'\U0'", r"'\U0000'", r"'\U00000'", r"'\N'", r"'\N{'",
    r"b'\x'", r"b'\x0'", r"'\xzz'", r"'\uzzzz'",
]


def _truncated_escapes_are_syntax_errors():
    out = []
    for source in ESCAPES:
        try:
            eval(source)
            out.append('no raise')
        except SyntaxError:
            out.append('SyntaxError')
        except Exception as exc:
            out.append(type(exc).__name__)
    return out


def _octal_escapes():
    # Silenced because CPython WARNS about every one of these -- an octal
    # escape over \377 is a SyntaxWarning there ("Did you mean \\400?").
    # Grail does not warn at all; that is the rest of test_string_literals
    # and it is a separate change, so the noise is suppressed here rather
    # than pretended away.
    import warnings
    with warnings.catch_warnings():
        warnings.simplefilter('ignore')
        return (eval(r"b'\400'"), eval(r"b'\777'"), eval(r"b'\407'"),
                eval(r"'\400'"), eval(r"b'\377'"), eval(r"b'\0'"))


def _the_complete_escapes_still_work():
    return (eval(r"'\x41'"), eval(r"'\u0041'"), eval(r"'\U00000041'"),
            eval(r"b'\x41'"), eval(r"'\101'"))


check('truncated_escapes_are_syntax_errors',
      _truncated_escapes_are_syntax_errors(), ['SyntaxError'] * len(ESCAPES))
check('octal_escapes', _octal_escapes(),
      (b'\x00', b'\xff', b'\x07', chr(256), b'\xff', b'\x00'))
check('the_complete_escapes_still_work',
      _the_complete_escapes_still_work(),
      ('A', 'A', 'A', b'A', 'A'))


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
