# compile() answers a CODE OBJECT, not the source string.
#
# Grail answered the source itself and kept the mode and filename in two
# identity-keyed side tables. That ran correctly -- exec()/eval() on a string
# already go through the AST loader -- and it meant a compile() result had no
# co_filename, no co_name and no co_flags: anything that introspected it saw a
# str. jinja2 still carries a ``hasattr(code, 'co_filename')'' fallback
# written for exactly that.
#
# The code object carries its source, so exec()/eval() read it back out and run
# the text as before. What is new is that it can be ASKED things.
#
# CO_COROUTINE IS THE ONE THAT MATTERS.  CPython sets it on a module compiled
# with PyCF_ALLOW_TOP_LEVEL_AWAIT whose body awaits AT MODULE SCOPE, and that
# bit is how a caller knows to run the result with ``await'' rather than
# exec(). Setting it where CPython would not is a wrong instruction, not a
# cosmetic difference -- so the careful half is what it must NOT match: an
# ``async def'' whose awaits are all inside it is an ordinary module, and so
# is a comprehension with no async in it. An AST walk that stops at a def, a
# lambda and a class body is what tells those apart; a comprehension is
# searched, because ``[x async for x in a]'' at module level does await.
#
# ONE LIMIT IS RECORDED RATHER THAN FIXED: Grail's parser still refuses a
# genuine top-level ``await'' with ``SyntaxError: 'await' outside function'',
# whatever flags compile() was given, so PyCF_ALLOW_TOP_LEVEL_AWAIT is
# honoured for co_flags and not yet for parsing. That is what still blocks
# test_compile_top_level_await, and the row below states it -- it no longer is.
#
# test_builtin's test_compile_async_generator,
# test_compile_top_level_await_no_coro and
# test_compile_top_level_await_invalid_cases.

import ast
from textwrap import dedent
from types import AsyncGeneratorType

CO_COROUTINE = 0x80

r = {}


def outcome(fn):
    try:
        return 'ok -> %r' % (fn(),)
    except Exception as e:
        return '%s: %s' % (type(e).__name__, e)


# --- a code object, with fields -------------------------------------------------

r['co_filename'] = outcome(lambda: compile('a = 1', 'sums.py', 'exec').co_filename)
r['co_name'] = outcome(lambda: compile('a = 1', 'sums.py', 'exec').co_name)
r['co_firstlineno'] = outcome(lambda: compile('a = 1', 'sums.py', 'exec').co_firstlineno)
r['co_flags_plain'] = outcome(lambda: compile('a = 1', '?', 'exec').co_flags)

# --- and it still runs ----------------------------------------------------------

r['exec_a_code_object'] = outcome(
    lambda: (lambda d: (exec(compile('z = 5', '<t>', 'exec'), d), d['z'])[1])({}))
r['eval_a_code_object'] = outcome(lambda: eval(compile('2 + 3', '<t>', 'eval')))
r['exec_mode_under_eval'] = outcome(lambda: eval(compile('q = 1', '<t>', 'exec')))

# --- the compiler flags exist, with CPython's values -----------------------------

r['only_ast_value'] = ast.PyCF_ONLY_AST
r['top_level_await_value'] = ast.PyCF_ALLOW_TOP_LEVEL_AWAIT
r['type_comments_value'] = ast.PyCF_TYPE_COMMENTS
r['optimized_ast_value'] = ast.PyCF_OPTIMIZED_AST

# --- CO_COROUTINE is NOT set by anything that merely looks async ------------------
#
# The five shapes test_compile_top_level_await_no_coro walks, in both modes.

_SAMPLES = [
    'def f():pass\n',
    '[x for x in l]',
    '{x for x in l}',
    '(x for x in l)',
    '{x:x for x in l}',
]


def _no_coro_offenders():
    bad = []
    for mode in ('single', 'exec'):
        for src in _SAMPLES:
            co = compile(dedent(src), '?', mode,
                         flags=ast.PyCF_ALLOW_TOP_LEVEL_AWAIT)
            if co.co_flags & CO_COROUTINE == CO_COROUTINE:
                bad.append((mode, src))
    return bad


r['no_coro_offenders'] = outcome(_no_coro_offenders)

# An ``async def'' is the sharpest case: it contains an await, and the module
# that defines it is not a coroutine.

_ASYNC_DEF = dedent("""async def ticker():
        for i in range(10):
            yield i
            await sleep(0)""")

r['async_def_is_not_a_coroutine'] = outcome(
    lambda: compile(_ASYNC_DEF, '?', 'exec',
                    flags=ast.PyCF_ALLOW_TOP_LEVEL_AWAIT).co_flags & CO_COROUTINE)


def _async_generator_still_works():
    glob = {}
    exec(compile(_ASYNC_DEF, '?', 'exec', flags=ast.PyCF_ALLOW_TOP_LEVEL_AWAIT), glob)
    return type(glob['ticker']()) == AsyncGeneratorType


r['async_generator_runs'] = outcome(_async_generator_still_works)

# --- a genuine top-level await ------------------------------------------------
#
# This was an XFAIL: Grail's parser refused a real top-level ``await'' whatever
# flags compile() was given, so the flag was honoured for co_flags and not for
# parsing.  CompileTopLevelAwaitTestCase closed that, and the row is now an
# ordinary check -- kept here as the CHEAPEST statement of the whole feature,
# beside the no_coro rows it has to stay consistent with.

XFAIL = set()

r['top_level_await_parses'] = outcome(
    lambda: compile('a = await f()', '?', 'exec',
                    flags=ast.PyCF_ALLOW_TOP_LEVEL_AWAIT).co_flags & CO_COROUTINE)

# --- controls -----------------------------------------------------------------------

r['compile_then_exec_roundtrip'] = outcome(
    lambda: (lambda d: (exec(compile('def g():\n    return 6 * 7', '<t>', 'exec'), d),
                        d['g']())[1])({}))
def kind(fn):
    """The exception TYPE only: Grail's SyntaxError __str__ prints the args
    tuple where CPython formats ``msg (<file>, line N)'', a divergence
    CompileAndEvalArgumentsTestCase records."""
    try:
        fn()
        return 'no raise'
    except Exception as e:
        return type(e).__name__


r['syntax_error_still_raised'] = kind(lambda: compile('x, b += 3', '<t>', 'exec'))
r['bad_mode_still_refused'] = outcome(lambda: compile('a = 1', '<t>', 'nope'))
r['string_eval_unaffected'] = outcome(lambda: eval('1 + 1'))
r['string_exec_unaffected'] = outcome(
    lambda: (lambda d: (exec('w = 8', d), d['w'])[1])({}))

EXPECTED = {
    'async_def_is_not_a_coroutine': 'ok -> 0',
    'async_generator_runs': 'ok -> True',
    'bad_mode_still_refused': "ValueError: compile() mode must be 'exec', 'eval' or 'single'",
    'co_filename': "ok -> 'sums.py'",
    'co_firstlineno': 'ok -> 1',
    'co_flags_plain': 'ok -> 0',
    'co_name': "ok -> '<module>'",
    'compile_then_exec_roundtrip': 'ok -> 42',
    'eval_a_code_object': 'ok -> 5',
    'exec_a_code_object': 'ok -> 5',
    'exec_mode_under_eval': 'ok -> None',
    'no_coro_offenders': 'ok -> []',
    'only_ast_value': 1024,
    'optimized_ast_value': 33792,
    'string_eval_unaffected': 'ok -> 2',
    'string_exec_unaffected': 'ok -> 8',
    'syntax_error_still_raised': 'SyntaxError',
    'top_level_await_parses': 'ok -> 128',
    'top_level_await_value': 8192,
    'type_comments_value': 4096,
}

DISAGREEMENTS = sorted(
    k for k in EXPECTED
    if k not in XFAIL and r.get(k, "<missing>") != EXPECTED[k])
SUMMARY = "%d checks, %d xfail, %d disagreeing %r, keys match: %s" % (
    len(EXPECTED), len(XFAIL), len(DISAGREEMENTS), DISAGREEMENTS,
    sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        if k in XFAIL:
            status = 'XFAIL' if actual == EXPECTED[k] else 'FAIL'
        else:
            status = 'OK ' if actual == EXPECTED[k] else 'DIFF'
        print('%-32s %-5s %r' % (k, status, actual))
