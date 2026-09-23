# ``ast.parse(source)'' answers a real tree, and so does
# ``compile(source, f, mode, flags=PyCF_ONLY_AST)''.
#
# Grail's parser builds its own Smalltalk-side node hierarchy, which this
# module did not export: parse() answered a placeholder and compile() answered
# the source string. So anything that INSPECTED a parse -- which is what the
# module is for -- got neither, and the stub's own docstring said as much
# ("anything that walks the tree will hit AttributeError").
#
# THE TRANSLATION IS GENERIC rather than 120 hand-written conversions.  Grail's
# node class names line up with CPython's almost one for one -- ``BinOpAst'' ->
# ``BinOp'', ``MultAst'' -> ``Mult'' -- so AbstractNode>>___asPythonAst___ maps
# the name, instantiates that class from this module, and copies the children
# across.  Two adjustments are all the mismatch amounts to: Grail's three
# FunctionDef variants (class, instance, static) are one CPython node, and its
# BLOCK -- which carries a scope's variable sets and which CPython has no node
# for -- flattens to the statement list it holds.  Without that flattening
# ``Module.body'' was a Block object and every reader failed at the first
# subscript.
#
# ``ast.parse'' IS ``compile(..., PyCF_ONLY_AST)'' here, as it is in CPython, so
# one place builds the tree and the two cannot drift.
#
# PyCF_OPTIMIZED_AST additionally folds ``__debug__'' to a Constant -- CPython
# resolves it at compile time, since it cannot change while a program runs, and
# the flag is how a caller asks to see the tree after that.  compile() folds an
# AST it is GIVEN as well as one it parses, because a caller may hand it a tree
# from ast.parse and expects the same answer either way.
#
# test_builtin's test_compile_ast.

import ast

r = {}


def outcome(fn):
    try:
        return 'ok -> %r' % (fn(),)
    except Exception as e:
        return '%s: %s' % (type(e).__name__, e)


def names(node):
    return type(node).__name__


_ARGS = ("a*__debug__", "f.py", "exec")

# --- compile() with PyCF_ONLY_AST ------------------------------------------------

_raw = compile(*_ARGS, flags=ast.PyCF_ONLY_AST)

r['module'] = outcome(lambda: names(_raw))
r['body_is_a_list'] = outcome(lambda: names(_raw.body))
r['statement'] = outcome(lambda: names(_raw.body[0]))
r['expression'] = outcome(lambda: names(_raw.body[0].value))
r['operator'] = outcome(lambda: names(_raw.body[0].value.op))
r['left'] = outcome(lambda: (names(_raw.body[0].value.left), _raw.body[0].value.left.id))
r['right_unfolded'] = outcome(
    lambda: (names(_raw.body[0].value.right), _raw.body[0].value.right.id))

# --- and the optimised form --------------------------------------------------------

_opt = compile(*_ARGS, flags=ast.PyCF_OPTIMIZED_AST)
_opt_from_tree = compile(ast.parse(_ARGS[0]), *_ARGS[1:], flags=ast.PyCF_OPTIMIZED_AST)

r['right_folded'] = outcome(
    lambda: (names(_opt.body[0].value.right), _opt.body[0].value.right.value))
r['folded_from_a_tree'] = outcome(
    lambda: (names(_opt_from_tree.body[0].value.right),
             _opt_from_tree.body[0].value.right.value))
r['left_unchanged_by_folding'] = outcome(lambda: _opt.body[0].value.left.id)

# --- ast.parse answers the same kind of tree -----------------------------------------

r['parse_module'] = outcome(lambda: names(ast.parse("x = 1")))
r['parse_assign'] = outcome(lambda: names(ast.parse("x = 1").body[0]))
r['parse_target'] = outcome(lambda: ast.parse("x = 1").body[0].targets[0].id)
r['parse_value'] = outcome(lambda: ast.parse("x = 1").body[0].value.value)
r['parse_call'] = outcome(lambda: names(ast.parse("f(1)").body[0].value))
r['parse_func_name'] = outcome(lambda: ast.parse("f(1)").body[0].value.func.id)
r['parse_attribute'] = outcome(lambda: ast.parse("a.b").body[0].value.attr)
r['parse_compare_op'] = outcome(lambda: names(ast.parse("a < b").body[0].value.ops[0]))
r['parse_unary'] = outcome(lambda: names(ast.parse("-a").body[0].value.op))
r['parse_def'] = outcome(lambda: (names(ast.parse("def f(): pass").body[0]),
                                  ast.parse("def f(): pass").body[0].name))
r['parse_if'] = outcome(lambda: names(ast.parse("if a: pass").body[0]))
r['parse_nested_body'] = outcome(
    lambda: names(ast.parse("if a:\n    b = 1").body[0].body[0]))
r['parse_isinstance'] = outcome(lambda: isinstance(ast.parse("x = 1"), ast.AST))

# --- positions come across --------------------------------------------------------------

r['lineno'] = outcome(lambda: ast.parse("x = 1\ny = 2").body[1].lineno)

# --- controls ------------------------------------------------------------------------------
#
# A bad parse must still raise, which is the one thing the old stub's callers
# relied on; and a tree handed to parse() comes back as itself.

def kind(fn):
    """The exception TYPE only: Grail's SyntaxError __str__ prints the args
    tuple where CPython formats ``msg (<file>, line N)'', a divergence
    CompileAndEvalArgumentsTestCase records and which is not about ASTs."""
    try:
        fn()
        return 'no raise'
    except Exception as e:
        return type(e).__name__


r['syntax_error_still_raised'] = kind(lambda: ast.parse("x ="))
r['parse_of_a_tree'] = outcome(
    lambda: names(ast.parse(ast.parse("x = 1"))))
r['literal_eval_unaffected'] = outcome(lambda: ast.literal_eval("[1, 2]"))
r['compile_without_the_flag'] = outcome(
    lambda: (lambda d: (exec(compile("q = 4", "<t>", "exec"), d), d['q'])[1])({}))

EXPECTED = {
    'body_is_a_list': "ok -> 'list'",
    'compile_without_the_flag': 'ok -> 4',
    'expression': "ok -> 'BinOp'",
    'folded_from_a_tree': "ok -> ('Constant', True)",
    'left': "ok -> ('Name', 'a')",
    'left_unchanged_by_folding': "ok -> 'a'",
    'lineno': 'ok -> 2',
    'literal_eval_unaffected': 'ok -> [1, 2]',
    'module': "ok -> 'Module'",
    'operator': "ok -> 'Mult'",
    'parse_assign': "ok -> 'Assign'",
    'parse_attribute': "ok -> 'b'",
    'parse_call': "ok -> 'Call'",
    'parse_compare_op': "ok -> 'Lt'",
    'parse_def': "ok -> ('FunctionDef', 'f')",
    'parse_func_name': "ok -> 'f'",
    'parse_if': "ok -> 'If'",
    'parse_isinstance': 'ok -> True',
    'parse_module': "ok -> 'Module'",
    'parse_nested_body': "ok -> 'Assign'",
    'parse_of_a_tree': "ok -> 'Module'",
    'parse_target': "ok -> 'x'",
    'parse_unary': "ok -> 'USub'",
    'parse_value': 'ok -> 1',
    'right_folded': "ok -> ('Constant', True)",
    'right_unfolded': "ok -> ('Name', '__debug__')",
    'statement': "ok -> 'Expr'",
    'syntax_error_still_raised': 'SyntaxError',
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, "<missing>") != EXPECTED[k])
SUMMARY = "%d checks, %d disagreeing %r, keys match: %s" % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-28s %s %r' % (k, 'OK ' if actual == EXPECTED[k] else 'DIFF', actual))
