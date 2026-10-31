"""Fixture: the PEP 695 scopes refuse a yield, an await and a named expression.

A type alias's value, a TypeVar's bound, constraints or default, and a generic
class's bases and keywords are each evaluated in an annotation scope of their
own, and CPython's symbol table refuses a yield, an await or a named
expression there, naming the scope (Python/symtable.c:3128-3153).  A named
expression inside a comprehension there would bind in that scope, and has a
message of its own (Python/symtable.c:2368-2392).  A lambda inside one is a
function of its own, so it stays legal.

Grail rewrites a bound into a lambda, which may hold a yield, so a refused
bound compiled; an alias's value reported a yield as "'yield' outside
function" and compiled a named expression.  A ``type`` statement as a one-line
suite (``def f(): type X = int``) was invalid syntax.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

r = {}


def outcome(source):
    try:
        compile(source, '<test string>', 'exec')
        return 'ok'
    except SyntaxError as e:
        return e.msg, e.lineno, e.offset


r['type_alias'] = [outcome(s) for s in (
    "type X = (yield)", "type X = (yield from x)", "type X = (await 42)", "type X = (y := 3)",
    "type X[T] = (y := T)", "def f(): type X = (yield)")]
r['type_variable'] = [outcome(s) for s in (
    "class X[T: (yield)]: pass", "class X[T: (await 42)]: pass", "class X[T: (y := 3)]: pass",
    "class X[T: (int, (y := 3))]: pass", "def f[T = (y := 3)](): pass",
    "def f[*Ts = (yield)](): pass", "def f[**P = (y := 3)](): pass")]
r['generic_definition'] = [outcome(s) for s in (
    "class X[T](y := Sequence[T]): pass", "class X[T](metaclass=(y := M)): pass")]
r['comprehension'] = [outcome(s) for s in (
    "class X[T]([(x := 3) for _ in range(2)] and B): pass",
    "def f[T: [(x := 3) for _ in range(2)]](): pass",
    "type T = [(x := 3) for _ in range(2)]")]
r['still_legal'] = [outcome(s) for s in (
    "type X = lambda: (y := 3)", "class X[T: (lambda: (yield))]: pass",
    "def f(): type X = int", "x = 1; type Y = int; z = 2", "type = 5", "type(x)")]

ALIAS = '%s cannot be used within a type alias'
EXPECTED = {
    'type_alias': [(ALIAS % 'yield expression', 1, 11), (ALIAS % 'yield expression', 1, 11),
                   (ALIAS % 'await expression', 1, 11), (ALIAS % 'named expression', 1, 11),
                   (ALIAS % 'named expression', 1, 14), (ALIAS % 'yield expression', 1, 20)],
    'type_variable': [('yield expression cannot be used within a TypeVar bound', 1, 13),
                      ('await expression cannot be used within a TypeVar bound', 1, 13),
                      ('named expression cannot be used within a TypeVar bound', 1, 13),
                      ('named expression cannot be used within a TypeVar constraint', 1, 19),
                      ('named expression cannot be used within a TypeVar default', 1, 12),
                      ('yield expression cannot be used within a TypeVarTuple default', 1, 14),
                      ('named expression cannot be used within a ParamSpec default', 1, 14)],
    'generic_definition': [('named expression cannot be used within the definition of a generic', 1, 12),
                           ('named expression cannot be used within the definition of a generic', 1, 23)],
    'comprehension': [
        ('assignment expression within a comprehension cannot be used within the definition of a generic', 1, 14),
        ('assignment expression within a comprehension cannot be used in a TypeVar bound', 1, 12),
        ('assignment expression within a comprehension cannot be used in a type alias', 1, 12)],
    'still_legal': ['ok', 'ok', 'ok', 'ok', 'ok', 'ok'],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-20s' % ('OK' if actual == EXPECTED[key] else 'FAIL', key))
        if actual != EXPECTED[key]:
            print('    got  %r' % (actual,))
            print('    want %r' % (EXPECTED[key],))
    print(SUMMARY)
