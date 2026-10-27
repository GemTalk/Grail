"""Fixture: ast.parse gives every located node CPython's col_offset and end_col_offset.

CPython's nodes carry lineno, col_offset, end_lineno and end_col_offset, the
columns counted in UTF-8 BYTES from the start of the line -- ``é = 1`` puts
the ``=`` at col_offset 3.  Grail's export asked each node for a column
accessor no node implements and swallowed the error, so no node ast.parse
answered had a column at all: ast.get_source_segment, error reporters and
test_fstring's position tests all came up empty.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import ast

r = {}
CASES = ['a * x()', "z = 'q'", "é = 1\nprint(é,  'ü')", 'def f(a, *, b=2):\n    return a + b\n', 'x = [i for i in range(3) if i]', 'class C(B):\n    y: int = 3\n', '(\n  a +\n  b\n)']

r['dumps'] = [ast.dump(ast.parse(c), include_attributes=True) for c in CASES]
source = "total = price * (1 + rate)"
node = ast.parse(source).body[0].value
r['segment'] = [ast.get_source_segment(source, node),
                ast.get_source_segment(source, node.right)]

EXPECTED = {
    'dumps': [
        "Module(body=[Expr(value=BinOp(left=Name(id='a', ctx=Load(), lineno=1, col_offset=0, end_lineno=1, end_col_offset=1), op=Mult(), right=Call(func=Name(id='x', ctx=Load(), lineno=1, col_offset=4, end_lineno=1, end_col_offset=5), lineno=1, col_offset=4, end_lineno=1, end_col_offset=7), lineno=1, col_offset=0, end_lineno=1, end_col_offset=7), lineno=1, col_offset=0, end_lineno=1, end_col_offset=7)])",
        "Module(body=[Assign(targets=[Name(id='z', ctx=Store(), lineno=1, col_offset=0, end_lineno=1, end_col_offset=1)], value=Constant(value='q', lineno=1, col_offset=4, end_lineno=1, end_col_offset=7), lineno=1, col_offset=0, end_lineno=1, end_col_offset=7)])",
        "Module(body=[Assign(targets=[Name(id='é', ctx=Store(), lineno=1, col_offset=0, end_lineno=1, end_col_offset=2)], value=Constant(value=1, lineno=1, col_offset=5, end_lineno=1, end_col_offset=6), lineno=1, col_offset=0, end_lineno=1, end_col_offset=6), Expr(value=Call(func=Name(id='print', ctx=Load(), lineno=2, col_offset=0, end_lineno=2, end_col_offset=5), args=[Name(id='é', ctx=Load(), lineno=2, col_offset=6, end_lineno=2, end_col_offset=8), Constant(value='ü', lineno=2, col_offset=11, end_lineno=2, end_col_offset=15)], lineno=2, col_offset=0, end_lineno=2, end_col_offset=16), lineno=2, col_offset=0, end_lineno=2, end_col_offset=16)])",
        "Module(body=[FunctionDef(name='f', args=arguments(args=[arg(arg='a', lineno=1, col_offset=6, end_lineno=1, end_col_offset=7)], kwonlyargs=[arg(arg='b', lineno=1, col_offset=12, end_lineno=1, end_col_offset=13)], kw_defaults=[Constant(value=2, lineno=1, col_offset=14, end_lineno=1, end_col_offset=15)]), body=[Return(value=BinOp(left=Name(id='a', ctx=Load(), lineno=2, col_offset=11, end_lineno=2, end_col_offset=12), op=Add(), right=Name(id='b', ctx=Load(), lineno=2, col_offset=15, end_lineno=2, end_col_offset=16), lineno=2, col_offset=11, end_lineno=2, end_col_offset=16), lineno=2, col_offset=4, end_lineno=2, end_col_offset=16)], lineno=1, col_offset=0, end_lineno=2, end_col_offset=16)])",
        "Module(body=[Assign(targets=[Name(id='x', ctx=Store(), lineno=1, col_offset=0, end_lineno=1, end_col_offset=1)], value=ListComp(elt=Name(id='i', ctx=Load(), lineno=1, col_offset=5, end_lineno=1, end_col_offset=6), generators=[comprehension(target=Name(id='i', ctx=Store(), lineno=1, col_offset=11, end_lineno=1, end_col_offset=12), iter=Call(func=Name(id='range', ctx=Load(), lineno=1, col_offset=16, end_lineno=1, end_col_offset=21), args=[Constant(value=3, lineno=1, col_offset=22, end_lineno=1, end_col_offset=23)], lineno=1, col_offset=16, end_lineno=1, end_col_offset=24), ifs=[Name(id='i', ctx=Load(), lineno=1, col_offset=28, end_lineno=1, end_col_offset=29)], is_async=0)], lineno=1, col_offset=4, end_lineno=1, end_col_offset=30), lineno=1, col_offset=0, end_lineno=1, end_col_offset=30)])",
        "Module(body=[ClassDef(name='C', bases=[Name(id='B', ctx=Load(), lineno=1, col_offset=8, end_lineno=1, end_col_offset=9)], body=[AnnAssign(target=Name(id='y', ctx=Store(), lineno=2, col_offset=4, end_lineno=2, end_col_offset=5), annotation=Name(id='int', ctx=Load(), lineno=2, col_offset=7, end_lineno=2, end_col_offset=10), value=Constant(value=3, lineno=2, col_offset=13, end_lineno=2, end_col_offset=14), simple=1, lineno=2, col_offset=4, end_lineno=2, end_col_offset=14)], lineno=1, col_offset=0, end_lineno=2, end_col_offset=14)])",
        "Module(body=[Expr(value=BinOp(left=Name(id='a', ctx=Load(), lineno=2, col_offset=2, end_lineno=2, end_col_offset=3), op=Add(), right=Name(id='b', ctx=Load(), lineno=3, col_offset=2, end_lineno=3, end_col_offset=3), lineno=2, col_offset=2, end_lineno=3, end_col_offset=3), lineno=1, col_offset=0, end_lineno=4, end_col_offset=1)])",
    ],
    'segment': ['price * (1 + rate)', '1 + rate'],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        if actual == EXPECTED[key]:
            print('OK   ', key)
        else:
            print('FAIL ', key)
            for got, want in zip(actual, EXPECTED[key]):
                if got != want:
                    print('   got ', got)
                    print('   want', want)
    print(SUMMARY)
