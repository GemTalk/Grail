"""compile() of an ast tree, ast.dump / ast.unparse, and the parse they read.

Grail compiled a tree only when it was a parse left untouched: the Module
carried its source and compile() ran that.  A tree that was BUILT had no
source and compile() answered the tree itself, and one that was CHANGED
compiled the text it had been parsed from, changes and all ignored.  pytest
does both -- -k/-m build an Expression, assertion rewriting changes every test
module -- so it ran only with --assert=plain and could not select tests.

Grail compiles from text, so a built or changed tree is unparsed (CPython's
own unparser) and the code remembers which line of the tree each line of the
unparse came from: tracebacks, co_firstlineno and inspect name the tree's
lines.  The unparse is only as good as the tree ast.parse gives it, so the
parse's shape is checked here too.  Every expectation was measured against
CPython 3.14.
"""

import ast
import sys
import traceback

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:200])


# -- compile() of a tree ------------------------------------------------------

class Matcher:
    """What pytest's -k evaluates against: every name arrives with its ``$''."""

    def __init__(self, names):
        self.names = names

    def __getitem__(self, key):
        return key[1:] in self.names


def k_expression(*idents):
    """pytest's MatcherAdapter shape: Name ids that no source can spell."""
    tree = ast.Expression(ast.BoolOp(ast.Or(), [
        ast.Name('$' + idents[0], ast.Load()),
        ast.UnaryOp(ast.Not(), ast.Name('$' + idents[1], ast.Load()))]))
    return compile(ast.fix_missing_locations(tree), '<pytest match expression>', 'eval')


code = k_expression('pass', 'slow')
check('a_built_expression_compiles_and_evaluates',
      [eval(code, {'__builtins__': {}}, Matcher(names))
       for names in ({'pass'}, {'slow'}, set())],
      [True, False, True])


SOURCE = '''x = 1

def f(y):
    z = y + 1

    assert z == 3, 'z was %r' % z
    return z
'''


class Announce(ast.NodeTransformer):
    """Puts a statement in front of every assert, on the assert's own line."""

    def visit_Assert(self, node):
        call = ast.Expr(ast.Call(ast.Name('note', ast.Load()), [ast.Constant('checking')], []))
        return [ast.fix_missing_locations(ast.copy_location(call, node)), node]


def run_tree(tree, filename, call_arg):
    seen = []
    ns = {'note': seen.append}
    exec(compile(tree, filename, 'exec'), ns)
    try:
        ns['f'](call_arg)
    except AssertionError as exc:
        frames = [(fs.name, fs.lineno) for fs in traceback.extract_tb(exc.__traceback__)]
        return seen, frames[-1], str(exc), ns['f'].__code__.co_firstlineno
    return seen, None, None, ns['f'].__code__.co_firstlineno


check('a_changed_tree_runs_its_changes_on_its_own_lines',
      run_tree(Announce().visit(ast.parse(SOURCE)), 'changed.py', 5),
      (['checking'], ('f', 6), 'z was 6', 3))

renumbered = ast.parse(SOURCE)
for node in ast.walk(renumbered):
    if hasattr(node, 'lineno'):
        node.lineno = node.lineno * 10
        node.end_lineno = node.lineno
check('a_renumbered_tree_reports_its_own_lines',
      run_tree(renumbered, 'renumbered.py', 5)[1:], (('f', 60), 'z was 6', 30))

untouched = ast.parse('a = 1  # a comment\n\n\nb = a + 1\n')
ns = {}
exec(compile(untouched, 'untouched.py', 'exec'), ns)
check('an_untouched_parse_compiles', ns['b'], 2)


def wrong_root():
    try:
        compile(untouched, 'x', 'eval')
    except TypeError as exc:
        return str(exc)
    return 'no error'


check('the_root_must_match_the_mode', wrong_root(), 'expected Expression node, got Module')

# pytest's assertion rewriting names its temporaries so they cannot collide.
temps = ast.parse('def g(v):\n    t = v * 2\n    return t\n')
for node in ast.walk(temps):
    if isinstance(node, ast.Name) and node.id == 't':
        node.id = '@py_assert1'
ns = {}
exec(compile(temps, 'temps.py', 'exec'), ns)
check('names_no_source_can_spell_still_bind', ns['g'](21), 42)


# -- the frame of a def that compile()d code made ----------------------------

def frame_code(src):
    ns = {'sys': sys}
    exec(compile(src, 'made.py', 'exec'), ns)
    frame = ns['f']()
    return (frame.f_code is ns['f'].__code__, frame.f_code.co_firstlineno)


check('an_execd_def_frame_reports_its_own_code',
      frame_code('import os\n\n\ndef f():\n    return sys._getframe()\n'), (True, 4))
check('a_nested_def_frame_reports_its_own_code',
      frame_code('def outer():\n    def f():\n        return sys._getframe()\n    return f\nf = outer()\n'),
      (True, 2))


# -- dump and unparse, and the parse they read --------------------------------

check('dump', ast.dump(ast.parse('x = f(1, *a, k=None)')),
      "Module(body=[Assign(targets=[Name(id='x', ctx=Store())], value=Call("
      "func=Name(id='f', ctx=Load()), args=[Constant(value=1), Starred("
      "value=Name(id='a', ctx=Load()), ctx=Load())], keywords=[keyword("
      "arg='k', value=Constant(value=None))]))])")

# Written as unparse lays it out, so the round trip is a fixed point.
ROUND_TRIP = '''import a.b as c
from d import e as f

async def g(x, *, y=None, **kw):
    async with h() as i:
        return ...

def j[T: int, *Ts, **P](t: T) -> T:
    _ = t
    return _
try:
    pass
except* ValueError:
    pass
match k:
    case None | True:
        pass
    case [first, *rest]:
        pass
    case {'key': value, **others}:
        pass
    case Point(x=0) as origin:
        pass'''
check('unparse_round_trips_the_parse', ast.unparse(ast.parse(ROUND_TRIP)), ROUND_TRIP)

shapes = ast.parse(ROUND_TRIP)
g, j = shapes.body[2], shapes.body[3]
cases = shapes.body[5].cases
check('the_parse_has_cpythons_shape', (
    type(g).__name__, [d.value for d in g.args.kw_defaults], type(shapes.body[4]).__name__,
    (shapes.body[0].names[0].name, shapes.body[0].names[0].asname),
    [type(p).__name__ for p in j.type_params], j.type_params[0].bound.id,
    j.body[0].targets[0].id, g.body[0].body[0].value.value is Ellipsis,
    [type(p).__name__ for p in cases[0].pattern.patterns],
    cases[0].pattern.patterns[0].value, cases[1].pattern.patterns[1].name,
    cases[2].pattern.rest, cases[3].pattern.name),
    ('AsyncFunctionDef', [None], 'TryStar', ('a.b', 'c'),
     ['TypeVar', 'TypeVarTuple', 'ParamSpec'], 'int', '_', True,
     ['MatchSingleton', 'MatchSingleton'], None, 'rest', 'others', 'origin'))

built = ast.Call(func=ast.Name('f'))
check('a_built_node_gets_cpythons_defaults',
      (built.args, built.keywords, type(built.func.ctx).__name__, ast.Return().value,
       ast.FunctionDef._field_types['body'].__origin__ is list),
      ([], [], 'Load', None, True))


# -- a tree no source can spell ------------------------------------------------
# werkzeug's URL builder (routing/rules.py _compile_builder) names its function
# ``<builder:'/x/<a>'>'' and its parameters ``.self'' / ``.kwargs'', puts each
# converter's call straight into a JoinedStr, and takes the function back out
# of exec()'s locals by that name.  Every Flask url_for() compiles one.

def odd_names_tree():
    def s(e):
        return ast.Call(ast.Name('str'), [e], [])
    fn = ast.parse('def _(): pass').body[0]
    fn.name = "<builder:'/x'>"
    fn.args.args.append(ast.arg('.a'))
    fn.args.vararg = ast.arg('.rest')
    fn.args.kwarg = ast.arg('.kw')
    fn.body = [ast.Return(ast.JoinedStr([
        ast.Constant('a='), s(ast.Name('.a')),
        ast.Constant(' n='), s(ast.Call(ast.Name('len'), [ast.Name('.rest')], [])),
        ast.Constant(' kw='), s(ast.Call(ast.Name('sorted'), [ast.Name('.kw')], []))]))]
    return ast.fix_missing_locations(ast.Module([fn], []))


_g, _l = {}, {}
exec(compile(odd_names_tree(), '<odd>', 'exec'), _g, _l)
_built = _l.get("<builder:'/x'>")
check('odd_names_bind_under_their_own_name',
      (_built.__name__, _built.__qualname__, _built(1, 2, 3, z=1, y=2)) if _built else sorted(_l),
      ("<builder:'/x'>", "<builder:'/x'>", "a=1 n=2 kw=['y', 'z']"))

_call = ast.fix_missing_locations(ast.Expression(
    ast.Call(ast.Name('f'), [ast.Constant(7)], [ast.keyword('.kw', ast.Constant(1))])))
check('odd_keyword_reaches_the_callee_as_spelled',
      eval(compile(_call, '<kw>', 'eval'), {'f': lambda *a, **k: (a, k)}),
      ((7,), {'.kw': 1}))


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
