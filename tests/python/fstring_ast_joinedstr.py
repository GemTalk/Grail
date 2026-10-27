"""Fixture: ast.parse answers an f-string as CPython's JoinedStr of Constants and FormattedValues.

CPython's parser keeps an f-string's structure in the tree: JoinedStr(values=
[...]) with the literal text -- adjacent pieces merged -- as Constants and a
FormattedValue per field, its conversion as a code point (-1 for none) and
its format spec as a JoinedStr of its own.  Grail lowered the f-string before
building the tree, so ast.parse answered the Call or BinOp it compiles to,
and every tool that walks f-strings in a tree (ast.unparse, linters, test
assertion rewriting) saw something else.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import ast

r = {}
SOURCES = [
    "f''",
    "f'plain'",
    "f'{a}'",
    "f'x{a}y{b!r}z'",
    "f'{a!s:>10}'",
    "f'{a:}'",
    "f'{a:{width}.{precision}}'",
    "f'{a=}'",
    "f'{a = !r:5}'",
    "'lead ' f'{a}' ' tail'",
    "f'{{{a}}}'",
    "f'{a}' f'{b}'",
]


def shape(source):
    node = ast.parse(source, mode='eval').body
    return ast.dump(node)


r['dumps'] = [shape(s) for s in SOURCES]
tree = ast.parse("a = 10\nf'{a * x()}'")
binop = tree.body[1].value.values[0].value
r['locations'] = [type(tree.body[1].value).__name__, tree.body[1].value.lineno,
                  tree.body[1].value.values[0].lineno, binop.lineno, binop.right.lineno]
r['unparse'] = [ast.unparse(ast.parse(s)) for s in ("f'x{a!r:>{w}}y'", "f'{a=}'")]
r['compiles'] = eval(compile(ast.parse("f'{a:>4}|{b!r}'", mode='eval'), '<ast>', 'eval'),
                     {'a': 7, 'b': 'q'})

EXPECTED = {
    'dumps': [
    'JoinedStr()',
    "JoinedStr(values=[Constant(value='plain')])",
    "JoinedStr(values=[FormattedValue(value=Name(id='a', ctx=Load()), conversion=-1)])",
    "JoinedStr(values=[Constant(value='x'), FormattedValue(value=Name(id='a', ctx=Load()), conversion=-1), Constant(value='y'), FormattedValue(value=Name(id='b', ctx=Load()), conversion=114), Constant(value='z')])",
    "JoinedStr(values=[FormattedValue(value=Name(id='a', ctx=Load()), conversion=115, format_spec=JoinedStr(values=[Constant(value='>10')]))])",
    "JoinedStr(values=[FormattedValue(value=Name(id='a', ctx=Load()), conversion=-1, format_spec=JoinedStr())])",
    "JoinedStr(values=[FormattedValue(value=Name(id='a', ctx=Load()), conversion=-1, format_spec=JoinedStr(values=[FormattedValue(value=Name(id='width', ctx=Load()), conversion=-1), Constant(value='.'), FormattedValue(value=Name(id='precision', ctx=Load()), conversion=-1)]))])",
    "JoinedStr(values=[Constant(value='a='), FormattedValue(value=Name(id='a', ctx=Load()), conversion=114)])",
    "JoinedStr(values=[Constant(value='a = '), FormattedValue(value=Name(id='a', ctx=Load()), conversion=114, format_spec=JoinedStr(values=[Constant(value='5')]))])",
    "JoinedStr(values=[Constant(value='lead '), FormattedValue(value=Name(id='a', ctx=Load()), conversion=-1), Constant(value=' tail')])",
    "JoinedStr(values=[Constant(value='{'), FormattedValue(value=Name(id='a', ctx=Load()), conversion=-1), Constant(value='}')])",
    "JoinedStr(values=[FormattedValue(value=Name(id='a', ctx=Load()), conversion=-1), FormattedValue(value=Name(id='b', ctx=Load()), conversion=-1)])",
    ],
    'locations': ['JoinedStr', 2, 2, 2, 2],
    'unparse': ["f'x{a!r:>{w}}y'", "f'a={a!r}'"],
    'compiles': "   7|'q'",
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        ok = actual == EXPECTED[key]
        print('%-10s %-5s -> %r' % (key, 'OK' if ok else 'FAIL', actual))
        if not ok:
            print('           expected %r' % (EXPECTED[key],))
    print(SUMMARY)
