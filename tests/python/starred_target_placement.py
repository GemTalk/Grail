"""Fixture: a starred target outside a list or tuple is refused wherever it binds.

CPython's code generator refuses a Starred in Store context that no list or
tuple has absorbed, ``starred assignment target must be in a list or tuple``
(Python/codegen.c) -- in an assignment, a for statement, a comprehension's
``for`` and a with statement's ``as`` alike.  Grail refused the first two only,
and compiled ``[x for *a in y]`` and ``with x as *a:``.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

r = {}


def outcome(source):
    try:
        compile(source, '<test string>', 'exec')
        return 'ok'
    except SyntaxError as e:
        return e.msg, e.offset


STARRED = 'starred assignment target must be in a list or tuple'
r['refused'] = [outcome(s) for s in (
    "*a = [1]", "for *a in [[1]]: pass", "[x for *a in [[1]]]", "{7 for *() in 0}",
    "(x for *a in y)", "{k: v for *k in y}", "with x as *a: pass",
    "with x as y, z as *a: pass")]
r['still_compile'] = [outcome(s) for s in (
    "*a, = [1]", "for *a, b in [[1, 2]]: pass", "[x for *a, b in y]",
    "[x for [*a] in y]", "with x as (*a, b): pass", "with x as [y, *z]: pass")]

EXPECTED = {
    'refused': [(STARRED, 1), (STARRED, 5), (STARRED, 8), (STARRED, 8),
                (STARRED, 8), (STARRED, 11), (STARRED, 11), (STARRED, 19)],
    'still_compile': ['ok'] * 6,
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        print('%-5s %-14s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL',
                                    key, actual))
    print(SUMMARY)
