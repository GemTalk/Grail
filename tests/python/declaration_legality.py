"""Fixture: ``global``, ``nonlocal`` and annotations conflict as CPython's symtable says.

CPython refuses ``global x`` and ``nonlocal x`` in a function where x is
already a parameter, read, annotated or assigned, testing in that order
(Python/symtable.c, Global_kind and Nonlocal_kind), and refuses a simple
annotation of a name already declared either way (AnnAssign_kind).  A
parenthesised annotation ``(x): int`` is not simple: it sets nothing, so with
no value it binds nothing and ``x`` stays the enclosing scope's.  Grail checked
``global`` only, never an annotation after a declaration, and bound ``x`` for
``(x): int``.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

r = {}


def outcome(source):
    try:
        compile(source, '<test string>', 'exec')
        return 'ok'
    except SyntaxError as e:
        return e.msg


NESTED = "def g():\n    x = 1\n    def f(%s):\n%s\n"


def nested(*lines, parameters=''):
    return NESTED % (parameters, '\n'.join('        ' + line for line in lines))


r['nonlocal_conflicts'] = [outcome(s) for s in (
    nested('nonlocal x', parameters='x'),
    nested('x = 2', 'nonlocal x'),
    nested('print(x)', 'nonlocal x'),
    nested('x: int', 'nonlocal x'))]
r['annotation_after_declaration'] = [outcome(s) for s in (
    nested('nonlocal x', 'x: int'),
    nested('nonlocal x', 'x: int = 3'),
    "def f():\n    global x\n    x: int\n",
    "def f():\n    global x\n    x: int = 3\n")]
r['global_conflicts'] = [outcome(s) for s in (
    "def f():\n    x: int\n    global x\n",
    "def f():\n    x = 1\n    print(x)\n    global x\n",
    "def f():\n    x += 1\n    global x\n")]
r['parenthesised_is_not_annotated'] = [outcome(s) for s in (
    "def f():\n    global x\n    (x): int = 3\n",
    "def f():\n    (x): int\n    global x\n",
    nested('(x): int', 'nonlocal x'),
    nested('nonlocal x', 'x = 3'))]


def raised(function):
    try:
        function()
    except Exception as e:
        return type(e).__name__
    return 'nothing'


def parenthesised_annotation():
    (no_such_global): int
    print(no_such_global)


def simple_annotation():
    x: int
    print(x)


r['what_a_bare_annotation_binds'] = [raised(parenthesised_annotation),
                                     raised(simple_annotation)]

EXPECTED = {
    'nonlocal_conflicts': [
        "name 'x' is parameter and nonlocal",
        "name 'x' is assigned to before nonlocal declaration",
        "name 'x' is used prior to nonlocal declaration",
        "annotated name 'x' can't be nonlocal"],
    'annotation_after_declaration': [
        "annotated name 'x' can't be nonlocal"] * 2 + [
        "annotated name 'x' can't be global"] * 2,
    'global_conflicts': [
        "annotated name 'x' can't be global",
        "name 'x' is used prior to global declaration",
        "name 'x' is assigned to before global declaration"],
    'parenthesised_is_not_annotated': ['ok'] * 4,
    'what_a_bare_annotation_binds': ['NameError', 'UnboundLocalError'],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        print('%-5s %-32s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL',
                                    key, actual))
    print(SUMMARY)
