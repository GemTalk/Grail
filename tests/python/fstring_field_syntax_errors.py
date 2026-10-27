"""Fixture: an f-string field raises the SyntaxError CPython's parser raises for it.

A single ``}`` outside a field is CPython's ``f-string: single '}' is not
allowed`` -- Grail forgave it and compiled ``f'x}'``.  A field that opens a
lambda (or one of its comma-separated items) has its ``:`` taken as the start
of a format spec, and CPython asks for parentheses; a field opening with
``**`` expects a valid expression; a ``)`` or ``]`` with nothing open in a
field is ``f-string: unmatched ')'``.  Grail answered ``invalid syntax``, the
parenthesis's own message, or ``unmatched '}'``.  The same holds for
t-strings, named ``t-string:``.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

r = {}
CASES = ["f'}'", "f'x}'", "f'x}x'", "f'{{}'", "f'{{}}}'", "f'\\u007b}'", "f'{3:}>10}'", "t'x}'", "f'{lambda x:x}'", "f'{lambda :x}'", "f'{lambda *arg, :x}'", "f'{1, lambda:x}'", "f'{lambda x:}'", "f'{lambda :}'", "f'{ lambda x:x}'", "t'{lambda x:x}'", "f'{**a}'", "f'{x)}'", "f'{x]}'", "t'{x)}'"]
VALID = ["f'{(lambda x:x)}'", "f'{lambdax}'", "f'{[lambda: 1][0]()}'", "f'{x[1:2]}'", "f'{(x)}'", "f'{{}}'", "f'a}}b'", 'f\'{"}"}\'', 'f\'{3:{"}"}>10}\'', "f'\\x7d\\x7d'"]


def message(source):
    try:
        compile(source, '<string>', 'exec')
        return 'compiled'
    except SyntaxError as e:
        return e.msg


x = [10, 20, 30]
lambdax = 'L'
r['errors'] = [message(s) for s in CASES]
r['valid'] = [message(s) for s in VALID]
r['values'] = [eval(s) for s in VALID[1:]]

EXPECTED = {
    'errors': ["f-string: single '}' is not allowed", "f-string: single '}' is not allowed", "f-string: single '}' is not allowed", "f-string: single '}' is not allowed", "f-string: single '}' is not allowed", "f-string: single '}' is not allowed", "f-string: single '}' is not allowed", "t-string: single '}' is not allowed", 'f-string: lambda expressions are not allowed without parentheses', 'f-string: lambda expressions are not allowed without parentheses', 'f-string: lambda expressions are not allowed without parentheses', 'f-string: lambda expressions are not allowed without parentheses', 'f-string: lambda expressions are not allowed without parentheses', 'f-string: lambda expressions are not allowed without parentheses', 'f-string: lambda expressions are not allowed without parentheses', 't-string: lambda expressions are not allowed without parentheses', "f-string: expecting a valid expression after '{'", "f-string: unmatched ')'", "f-string: unmatched ']'", "t-string: unmatched ')'"],
    'valid': ['compiled'] * len(VALID),
    'values': ['L', '1', '[20]', '[10, 20, 30]', '{}', 'a}b', '}', '}}}}}}}}}3', '}}'],
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
            names = CASES if key == 'errors' else VALID if key == 'valid' else VALID[1:]
            for source, got, want in zip(names, actual, EXPECTED[key]):
                if got != want:
                    print('   %r: got %r, want %r' % (source, got, want))
    print(SUMMARY)
