"""Fixture: a name declared both global and nonlocal in one scope is refused.

CPython's symbol table refuses it with ``name 'x' is nonlocal and global``,
over the first statement declaring the name, and before it looks for the
nonlocal's binding (Python/symtable.c:671-677, error_at_directive).  Grail
reported the missing binding instead, at the nonlocal, or compiled the
nonlocal when an enclosing function bound the name (test_exceptions
testSyntaxErrorOffset).  Every check here holds under CPython 3.14, which
is what makes it evidence.
"""

r = {}


def outcome(source):
    try:
        compile(source, '<fragment>', 'exec')
        return 'ok'
    except SyntaxError as exc:
        return (exc.msg, exc.lineno, exc.offset, exc.end_lineno, exc.end_offset)


CASES = {
    'in_a_function': [
        ('def f():\n  global x\n  nonlocal x',
         ("name 'x' is nonlocal and global", 2, 3, 2, 11)),
        ('def f():\n  nonlocal x\n  global x',
         ("name 'x' is nonlocal and global", 2, 3, 2, 13)),
        ('def g():\n  x = 1\n  def f():\n    global x\n    nonlocal x',
         ("name 'x' is nonlocal and global", 4, 5, 4, 13)),
        ('def f():\n  global x, y\n  nonlocal y',
         ("name 'y' is nonlocal and global", 2, 3, 2, 14)),
        ('def g():\n  x = 1\n  def f():\n    if 1:\n      global x\n    nonlocal x',
         ("name 'x' is nonlocal and global", 5, 7, 5, 15)),
    ],
    'in_a_class_body': [
        ('class C:\n  global x\n  nonlocal x',
         ("name 'x' is nonlocal and global", 2, 3, 2, 11)),
        ('def g():\n  x = 1\n  class C:\n    nonlocal x\n    global x',
         ("name 'x' is nonlocal and global", 4, 5, 4, 15)),
    ],
    'the_other_declaration_errors_unchanged': [
        ('def f(x):\n  global x',
         ("name 'x' is parameter and global", 2, 3, 2, 11)),
        ('def f(x):\n  nonlocal x',
         ("name 'x' is parameter and nonlocal", 2, 3, 2, 13)),
        ('def f():\n  x = 1\n  global x',
         ("name 'x' is assigned to before global declaration", 3, 3, 3, 11)),
        ('def f():\n  nonlocal x',
         ("no binding for nonlocal 'x' found", 2, 3, 2, 13)),
    ],
}
LEGAL = [
    'def g():\n  x = 1\n  def f():\n    nonlocal x',
    'def g():\n  x = 1\n  def f():\n    global y\n    nonlocal x',
    'def g():\n  y = 1\n  def f():\n    global x\n    nonlocal y',
    'def f():\n  global x\n  def h():\n    global x',
]

EXPECTED = {}
for key, cases in CASES.items():
    r[key] = [outcome(source) for source, _ in cases]
    EXPECTED[key] = [expected for _, expected in cases]
r['legal'] = [outcome(each) for each in LEGAL]
EXPECTED['legal'] = ['ok'] * len(LEGAL)

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        ok = r[key] == EXPECTED[key]
        print('%-34s %s' % (key, 'OK' if ok else 'FAIL'))
        if not ok:
            for (source, want), got in zip(CASES.get(key, [(s, 'ok') for s in LEGAL]), r[key]):
                if got != want:
                    print('    %r: got %r, want %r' % (source, got, want))
    print(SUMMARY)
