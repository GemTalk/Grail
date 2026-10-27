"""Fixture: eval input is CPython's eval rule -- one expression list -- and anything else is invalid syntax there.

CPython parses eval() input and compile(..., 'eval') source with ``eval:
expressions NEWLINE* ENDMARKER``: an expression, or several separated by
commas, and nothing after.  The first token outside that is ``invalid
syntax`` at that token.  Grail parsed them as a module, so ``x = 1 = 2``
raised the assignment's own ``cannot assign to literal``, ``f'' = 3`` an
f-string refusal, and ``x = 1`` or ``del x`` an ``invalid syntax`` with no
location -- or, from eval(), ``eval() arg 1 must be a single expression``.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

r = {}
CASES = ['x = 1', "f'' = 3", "f'{x}' = x", 'del x', "del '' f''", '1; 2', 'import os', '1 2', 'if x: pass', '(yield)', 'a, b', '1,', '*a', '1, *a', '(*a,)', 'a := 1', '(a := 1)', '1\n\n', '\n\n1', '# c\n1', '1\n2', 'lambda: (yield)', 'x if y else z', 'yield', 'x = 1 = 2', 'a + b = 1']


def outcome(source, how):
    try:
        if how == 'compile':
            compile(source, '<string>', 'eval')
        else:
            eval(source, {'x': 1, 'y': 0, 'z': 2, 'a': 3, 'b': 4})
        return 'ok'
    except SyntaxError as e:
        return (e.msg, e.lineno, e.offset)
    except Exception as e:
        return type(e).__name__


r['compile'] = [outcome(s, 'compile') for s in CASES]
r['eval'] = [outcome(s, 'eval') for s in ('x = 1', 'del x', '1; 2', 'a, b', '(a := 9) + 1')]

EXPECTED = {
    'compile': [('invalid syntax', 1, 3), ('invalid syntax', 1, 5), ('invalid syntax', 1, 8), ('invalid syntax', 1, 1), ('invalid syntax', 1, 1), ('invalid syntax', 1, 2), ('invalid syntax', 1, 1), ('invalid syntax', 1, 3), ('invalid syntax', 1, 1), ("'yield' outside function", 1, 2), 'ok', 'ok', ('invalid syntax', 1, 1), ('invalid syntax', 1, 4), 'ok', ('invalid syntax', 1, 3), 'ok', 'ok', 'ok', 'ok', ('invalid syntax', 2, 1), 'ok', 'ok', ('invalid syntax', 1, 1), ('invalid syntax', 1, 3), ('invalid syntax', 1, 7)],
    'eval': [('invalid syntax', 1, 3), ('invalid syntax', 1, 1), ('invalid syntax', 1, 2), 'ok', 'ok'],
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
            for source, got, want in zip(CASES if key == 'compile' else range(9), actual, EXPECTED[key]):
                if got != want:
                    print('   %r: got %r, want %r' % (source, got, want))
    print(SUMMARY)
