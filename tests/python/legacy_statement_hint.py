"""Fixture: the Python-2 ``print``/``exec`` hint is given only when what follows parses.

CPython's invalid_legacy_expression is ``NAME !'(' star_expressions``
(Grammar/python.gram), and a PEG rule accepts the longest prefix that parses:
``print f(**)`` gets "Missing parentheses in call to 'print'" over ``print f``,
while ``print {1:(foo.)}`` -- whose first atom fails whole, so no prefix
parses -- is plain "invalid syntax" at the brace.  Grail gave the hint
whenever anything at all followed the name.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

r = {}


def outcome(source):
    try:
        compile(source, '<test string>', 'exec')
        return 'ok'
    except SyntaxError as e:
        return e.msg, e.offset, e.end_offset


PRINT_HINT = "Missing parentheses in call to 'print'. Did you mean print(...)?"
EXEC_HINT = "Missing parentheses in call to 'exec'. Did you mean exec(...)?"

r['hinted'] = [outcome(s) for s in (
    "print foo", "print {1:foo}", "print a, b", "exec code in ns")]
r['hinted_over_the_prefix_that_parses'] = [outcome(s) for s in (
    "print f(**)", "print 1 +", "print x y")]
r['nothing_parses'] = [outcome(s) for s in (
    "print {1:(foo.)}", "if 1: print {1:(foo.)}", "exec {1:(foo.)}")]
r['parenthesised_is_a_call'] = outcome("print (foo.)")

EXPECTED = {
    'hinted': [(PRINT_HINT, 1, 10), (PRINT_HINT, 1, 14), (PRINT_HINT, 1, 11),
               (EXEC_HINT, 1, 16)],
    'hinted_over_the_prefix_that_parses': [(PRINT_HINT, 1, 8)] * 3,
    'nothing_parses': [('invalid syntax', 7, 8), ('invalid syntax', 13, 14),
                       ('invalid syntax', 6, 7)],
    'parenthesised_is_a_call': ('invalid syntax', 12, 13),
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        print('%-5s %-36s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL',
                                    key, actual))
    print(SUMMARY)
