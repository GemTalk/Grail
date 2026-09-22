# What compile(), exec() and eval() ACCEPT, and what they refuse.
#
# Grail took a str and nothing else.  Every other spelling CPython allows came
# back as ``arg 1 must be a string; a code object is metadata only in Grail'' --
# a message about the wrong thing entirely, since a bytes source is not a code
# object and CPython compiles it happily.
#
# A byte source needs three separate things, each its own CPython error:
#
#   * a UTF-8 BOM is STRIPPED; Python source may carry one and it is not part
#     of the program;
#   * bytes that are not UTF-8 are a SyntaxError about the ENCODING, naming the
#     first offending byte -- a TRUNCATED BOM is the case that pins it;
#   * a NUL anywhere is a SyntaxError, in a str source as much as a bytes one.
#     Grail passed it to the tokenizer, which reported an ``Unexpected token''
#     about a character its message could not print.
#
# compile() had three more gaps, all of which let a wrong call succeed:
#
#   * its six parameters are keyword-able and only positionals were read, so
#     ``compile(source='pass', filename='?', mode='exec')'' raised about a
#     missing argument that was right there;
#   * the MODE was not validated, so ``compile(src, f, 'badmode')'' answered
#     the source and whatever ran next ran under a mode nothing agreed to;
#   * the FLAGS were not validated, so 0xff -- which is made of CO_ bits
#     describing a code object, not compiler directives -- was accepted.
#
# ONE DIVERGENCE IS RECORDED RATHER THAN FIXED.  Grail's SyntaxError inherits
# BaseException's __str__, which prints the args tuple where CPython formats
# ``msg (<file>, line N)''.  The location data is now carried correctly; the
# formatting is a separate, corpus-wide change.  The rows below therefore
# compare the exception TYPE for those cases, which is also what the CPython
# tests assert.
#
# test_builtin's test_eval, and most of test_compile.

r = {}
BOM = b'\xef\xbb\xbf'


def outcome(fn):
    try:
        return 'ok -> %r' % (fn(),)
    except Exception as e:
        return '%s: %s' % (type(e).__name__, e)


def kind(fn):
    """The exception TYPE only -- see the note about SyntaxError.__str__."""
    try:
        fn()
        return 'no raise'
    except Exception as e:
        return type(e).__name__


# --- a byte source ------------------------------------------------------------

_g = {'a': 1, 'b': 2}
_l = {'b': 200, 'c': 300}

r['bytes_source'] = outcome(lambda: eval(b'a', _g, _l))
r['bom_bytes_source'] = outcome(lambda: eval(BOM + b'a', _g, _l))
r['bytearray_source'] = outcome(lambda: eval(bytearray(b'a'), _g, _l))
r['bytes_exec'] = outcome(
    lambda: (lambda d: (exec(b'z = 6 * 7', d), d['z'])[1])({}))
r['bom_compiles'] = outcome(lambda: bool(compile(BOM + b'print(1)\n', '', 'exec')))
r['memoryview_compiles'] = outcome(lambda: bool(compile(memoryview(b"text"), "name", "exec")))

# --- and what a byte source refuses -------------------------------------------

r['truncated_bom'] = kind(lambda: eval(BOM[:2] + b'a'))
r['nul_in_str'] = kind(lambda: compile(chr(0), 'f', 'exec'))
r['nul_in_bytes'] = kind(lambda: compile(b'a\x00b', 'f', 'exec'))

# --- a source that is neither ---------------------------------------------------

r['tuple_source'] = outcome(lambda: eval(()))
r['int_source'] = outcome(lambda: eval(1))

# --- compile()'s own arguments ---------------------------------------------------

r['kwargs_form'] = outcome(lambda: bool(compile(source='pass', filename='?', mode='exec')))
r['kwargs_reordered'] = outcome(
    lambda: bool(compile(dont_inherit=False, filename='tmp', source='0', mode='eval')))
r['kwarg_and_positional'] = outcome(
    lambda: bool(compile('pass', '?', dont_inherit=True, mode='exec')))
r['duplicate_argument'] = outcome(
    lambda: compile('pass', '?', 'exec', mode='eval', source='0', filename='tmp'))
r['bad_mode'] = outcome(lambda: compile('print(42)\n', '<string>', 'badmode'))
r['bad_mode_short'] = outcome(lambda: compile('a = 1', 'f', 'bad'))
r['bad_flags'] = outcome(lambda: compile('print(42)\n', '<string>', 'single', 0xff))
r['bad_flags_low_bit'] = outcome(lambda: compile('a', '<s>', 'eval', 1))

# --- controls: the flags that ARE compiler directives, and the ordinary shapes ---

r['only_ast_flag_accepted'] = outcome(lambda: bool(compile('a', '<s>', 'eval', 0x400)))
r['top_level_await_flag_accepted'] = outcome(lambda: bool(compile('a', '<s>', 'eval', 0x2000)))
r['zero_flags'] = outcome(lambda: bool(compile('a', '<s>', 'eval', 0)))
r['plain_eval'] = outcome(lambda: eval('1+1'))
r['leading_whitespace'] = outcome(lambda: eval(' 1+1\n'))
r['non_ascii_str'] = outcome(lambda: eval('"\xe5"', _g))
r['compile_then_exec'] = outcome(
    lambda: (lambda d: (exec(compile('q = 3 * 4', '<t>', 'exec'), d), d['q'])[1])({}))
r['compile_then_eval'] = outcome(lambda: eval(compile('2 + 3', '<t>', 'eval')))
r['syntax_error_still_raised'] = kind(lambda: compile('x, b += 3', '<t>', 'exec'))

EXPECTED = {
    'bad_flags': 'ValueError: compile(): unrecognised flags',
    'bad_flags_low_bit': 'ValueError: compile(): unrecognised flags',
    'bad_mode': "ValueError: compile() mode must be 'exec', 'eval' or 'single'",
    'bad_mode_short': "ValueError: compile() mode must be 'exec', 'eval' or 'single'",
    'bom_bytes_source': 'ok -> 1',
    'bom_compiles': 'ok -> True',
    'bytearray_source': 'ok -> 1',
    'bytes_exec': 'ok -> 42',
    'bytes_source': 'ok -> 1',
    'compile_then_eval': 'ok -> 5',
    'compile_then_exec': 'ok -> 12',
    'duplicate_argument': "TypeError: argument for compile() given by name ('source') and position (1)",
    'int_source': 'TypeError: eval() arg 1 must be a string, bytes or code object',
    'kwarg_and_positional': 'ok -> True',
    'kwargs_form': 'ok -> True',
    'kwargs_reordered': 'ok -> True',
    'leading_whitespace': 'ok -> 2',
    'memoryview_compiles': 'ok -> True',
    'non_ascii_str': "ok -> 'å'",
    'nul_in_bytes': 'SyntaxError',
    'nul_in_str': 'SyntaxError',
    'only_ast_flag_accepted': 'ok -> True',
    'plain_eval': 'ok -> 2',
    'syntax_error_still_raised': 'SyntaxError',
    'top_level_await_flag_accepted': 'ok -> True',
    'truncated_bom': 'SyntaxError',
    'tuple_source': 'TypeError: eval() arg 1 must be a string, bytes or code object',
    'zero_flags': 'ok -> True',
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, "<missing>") != EXPECTED[k])
SUMMARY = "%d checks, %d disagreeing %r, keys match: %s" % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-30s %s %r' % (k, 'OK ' if actual == EXPECTED[k] else 'DIFF', actual))
