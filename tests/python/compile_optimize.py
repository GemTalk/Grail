# compile()'s ``optimize'' argument, and compiling an AST back to something
# runnable.
#
# THE LEVEL TRAVELS ON THE CODE OBJECT.  Grail compiles from TEXT at exec()
# time, so the level chosen when compile() ran and the codegen that has to obey
# it can be far apart, with ordinary parse and emit in between and no argument
# to thread it through.  It is recorded on the PyCode and installed around the
# evaluation, which is the only arrangement where a compile() in one place and
# an exec() in another give the answer CPython gives.
#
# Three things change, and each is a decision a code GENERATOR makes:
#
#   * ``__debug__'' becomes a compile-time False at 1 and above.  Emitted as
#     the literal rather than read from builtins, because the builtins value is
#     shared by every module and this level belongs to ONE compile.
#   * an ``assert'' statement is DROPPED at 1 and above -- nothing emitted, not
#     a guarded no-op, because its expression must not be evaluated either.
#   * a DOCSTRING is dropped at 2.
#
# -1 means ``whatever the interpreter is'', which is the default and is what
# every compile in the corpus has always got.
#
# AND AN AST COMPILES BACK.  ``compile(ast.parse(src), f, mode)'' has to answer
# something executable, and Grail has no AST-to-code path and no bytecode to
# build -- so the tree ast.parse returns carries the source it was parsed from,
# and compiling it compiles that text.  Exact rather than an approximation: it
# is the same text, not an unparse.  A tree the caller BUILT by hand still
# cannot be compiled, which is a narrower gap than the whole round trip being
# impossible.
#
# test_builtin's test_compile.

import ast
from textwrap import dedent

r = {}


def outcome(fn):
    try:
        return 'ok -> %r' % (fn(),)
    except Exception as e:
        return '%s: %s' % (type(e).__name__, e)


CODESTR = dedent('''def f():
    """doc"""
    debug_enabled = False
    if __debug__:
        debug_enabled = True
    try:
        assert False
    except AssertionError:
        return (True, f.__doc__, debug_enabled, __debug__)
    else:
        return (False, f.__doc__, debug_enabled, __debug__)
''')


def _at(level, from_tree=False):
    ns = {}
    if from_tree:
        code = compile(ast.parse(CODESTR, optimize=level), "<test>", "exec",
                       optimize=level)
    else:
        code = compile(CODESTR, "<test>", "exec", optimize=level)
    exec(code, ns)
    return ns['f']()


# --- the four levels, from source ---------------------------------------------

r['level_default'] = outcome(lambda: _at(-1))
r['level_0'] = outcome(lambda: _at(0))
r['level_1'] = outcome(lambda: _at(1))
r['level_2'] = outcome(lambda: _at(2))

# --- and the same four through an AST -------------------------------------------

r['tree_default'] = outcome(lambda: _at(-1, from_tree=True))
r['tree_0'] = outcome(lambda: _at(0, from_tree=True))
r['tree_1'] = outcome(lambda: _at(1, from_tree=True))
r['tree_2'] = outcome(lambda: _at(2, from_tree=True))

# --- each effect on its own -------------------------------------------------------


def _assert_fires(level):
    src = dedent('''def g():
        try:
            assert False
        except AssertionError:
            return 'fired'
        return 'skipped'
    ''')
    ns = {}
    exec(compile(src, '<t>', 'exec', optimize=level), ns)
    return ns['g']()


def _debug_value(level):
    ns = {}
    exec(compile('v = __debug__', '<t>', 'exec', optimize=level), ns)
    return ns['v']


def _docstring(level):
    ns = {}
    exec(compile('def h():\n    "d"\n', '<t>', 'exec', optimize=level), ns)
    return ns['h'].__doc__


r['assert_by_level'] = outcome(lambda: [_assert_fires(n) for n in (-1, 0, 1, 2)])
r['debug_by_level'] = outcome(lambda: [_debug_value(n) for n in (-1, 0, 1, 2)])
r['docstring_by_level'] = outcome(lambda: [_docstring(n) for n in (-1, 0, 1, 2)])

# --- an AST compiles back to something runnable -------------------------------------

r['tree_compiles'] = outcome(
    lambda: (lambda d: (exec(compile(ast.parse("q = 6 * 7"), "<t>", "exec"), d),
                        d['q'])[1])({}))
r['tree_eval'] = outcome(lambda: eval(compile(ast.parse("2 + 3"), "<t>", "eval")))

# --- controls ---------------------------------------------------------------------------
#
# The default is what every compile in the corpus has always got, and nothing
# about it may move: asserts fire, __debug__ is True, docstrings survive.

r['plain_assert_fires'] = outcome(lambda: _assert_fires(-1))
r['plain_debug'] = outcome(lambda: __debug__)
r['plain_docstring'] = outcome(lambda: _docstring(-1))
r['module_level_assert'] = outcome(
    lambda: (lambda d: (exec("try:\n    assert 0\nexcept AssertionError:\n    x='fired'\n", d), d['x'])[1])({}))
r['exec_without_compile'] = outcome(
    lambda: (lambda d: (exec("w = __debug__", d), d['w'])[1])({}))


EXPECTED = {
    'assert_by_level': "ok -> ['fired', 'fired', 'skipped', 'skipped']",
    'debug_by_level': 'ok -> [True, True, False, False]',
    'docstring_by_level': "ok -> ['d', 'd', 'd', None]",
    'exec_without_compile': 'ok -> True',
    'level_0': "ok -> (True, 'doc', True, True)",
    'level_1': "ok -> (False, 'doc', False, False)",
    'level_2': 'ok -> (False, None, False, False)',
    'level_default': "ok -> (True, 'doc', True, True)",
    'module_level_assert': "ok -> 'fired'",
    'plain_assert_fires': "ok -> 'fired'",
    'plain_debug': 'ok -> True',
    'plain_docstring': "ok -> 'd'",
    'tree_0': "ok -> (True, 'doc', True, True)",
    'tree_1': "ok -> (False, 'doc', False, False)",
    'tree_2': 'ok -> (False, None, False, False)',
    'tree_compiles': 'ok -> 42',
    'tree_default': "ok -> (True, 'doc', True, True)",
    'tree_eval': 'TypeError: expected Expression node, got Module',
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, "<missing>") != EXPECTED[k])
SUMMARY = "%d checks, %d disagreeing %r, keys match: %s" % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-22s %s %r' % (k, 'OK ' if actual == EXPECTED[k] else 'DIFF', actual))
