"""ast: walking a parse, the node categories, and the location helpers.

Grail's ast.parse answered a real tree, but nothing could walk it: walk and
iter_child_nodes were stubs answering nothing, NodeVisitor visited nothing,
and the abstract categories (ast.stmt, ast.expr, ast.excepthandler, ...) did
not exist.  pytest finds where a failing statement ends by walking the module
and collecting every stmt and excepthandler line; with nothing found it showed
the whole rest of the file as the statement.  It also read ``d.lineno'' off
each decorator, and Grail's decorator_list held a bare ``@property'' as the
string 'property' rather than a Name.

Every expectation here was measured against CPython 3.14.
"""

import ast

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:160])


SOURCE = (
    "def f(x):\n"
    "    a = 1\n"
    "    if x:\n"
    "        return a\n"
    "    else:\n"
    "        pass\n"
    "\n"
    "def g():\n"
    "    try:\n"
    "        pass\n"
    "    except E:\n"
    "        pass\n"
    "    finally:\n"
    "        pass\n"
    "\n"
    "class K:\n"
    "    @property\n"
    "    def p(self):\n"
    "        return 1\n"
    "\n"
    "    @staticmethod\n"
    "    @functools.cache\n"
    "    def s():\n"
    "        pass\n"
)
tree = ast.parse(SOURCE)


def _statements(node):
    out = []
    for x in ast.walk(node):
        if isinstance(x, (ast.stmt, ast.ExceptHandler)):
            out.append((type(x).__name__, x.lineno, x.end_lineno))
    return sorted(out, key=lambda t: (t[1], t[0]))


check('walk_finds_every_statement', _statements(tree), [
    ('FunctionDef', 1, 6), ('Assign', 2, 2), ('If', 3, 6), ('Return', 4, 4),
    ('Pass', 6, 6), ('FunctionDef', 8, 14), ('Try', 9, 14), ('Pass', 10, 10),
    ('ExceptHandler', 11, 12), ('Pass', 12, 12), ('Pass', 14, 14),
    ('ClassDef', 16, 24), ('FunctionDef', 18, 19), ('Return', 19, 19),
    ('FunctionDef', 23, 24), ('Pass', 24, 24)])

check('categories', [
    isinstance(tree, ast.mod), isinstance(tree.body[0], ast.stmt),
    isinstance(tree.body[0].body[0].value, ast.expr),
    isinstance(tree.body[1].body[0].handlers[0], ast.excepthandler),
    issubclass(ast.Add, ast.operator), issubclass(ast.Load, ast.expr_context),
    issubclass(ast.Eq, ast.cmpop), issubclass(ast.Not, ast.unaryop),
    issubclass(ast.And, ast.boolop), issubclass(ast.MatchAs, ast.pattern),
    issubclass(ast.stmt, ast.AST), isinstance(tree.body[0], ast.expr)],
    [True] * 11 + [False])
check('location_attributes', (ast.stmt._attributes, ast.expr._attributes,
                              ast.operator._attributes),
      (('lineno', 'col_offset', 'end_lineno', 'end_col_offset'),
       ('lineno', 'col_offset', 'end_lineno', 'end_col_offset'), ()))


def _decorators(node):
    return [(type(d).__name__, getattr(d, 'id', None) or getattr(d, 'attr', None), d.lineno)
            for d in node.decorator_list]


klass = tree.body[2]
check('bare_decorators_are_names', _decorators(klass.body[0]), [('Name', 'property', 17)])
check('stacked_decorators', _decorators(klass.body[1]),
      [('Name', 'staticmethod', 21), ('Attribute', 'cache', 22)])
check('a_decorator_name_reads_as_load', type(klass.body[0].decorator_list[0].ctx).__name__,
      'Load')

check('iter_fields', [name for name, _ in ast.iter_fields(tree.body[0].body[0])],
      ['targets', 'value', 'type_comment'])
check('iter_child_nodes',
      [type(n).__name__ for n in ast.iter_child_nodes(tree.body[0].body[1])],
      ['Name', 'Return', 'Pass'])


class Names(ast.NodeVisitor):
    def __init__(self):
        self.seen = []

    def visit_Name(self, node):
        self.seen.append(node.id)
        self.generic_visit(node)


v = Names()
v.visit(tree)
check('node_visitor', v.seen, ['a', 'x', 'a', 'E', 'property', 'staticmethod', 'functools'])


class Renamer(ast.NodeTransformer):
    def visit_Name(self, node):
        return ast.copy_location(ast.Name(id=node.id.upper(), ctx=node.ctx), node)


renamed = Renamer().visit(ast.parse('a + b'))
check('node_transformer',
      [n.id for n in ast.walk(renamed) if isinstance(n, ast.Name)], ['A', 'B'])
check('copy_location_keeps_the_line',
      renamed.body[0].value.left.lineno, 1)

built = ast.Expression(ast.BoolOp(ast.And(), [ast.Name('a', ast.Load()),
                                              ast.Constant(True)]))
ast.fix_missing_locations(built)
check('fix_missing_locations',
      (built.body.lineno, built.body.values[1].lineno, built.body.values[1].col_offset),
      (1, 1, 0))
moved = ast.increment_lineno(ast.parse('x = 1'), 4)
check('increment_lineno', (moved.body[0].lineno, moved.body[0].value.lineno), (5, 5))

check('parse_eval_answers_an_expression',
      [type(ast.parse('x + 1', mode='eval')).__name__,
       type(ast.parse('x + 1', mode='eval').body).__name__], ['Expression', 'BinOp'])


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
