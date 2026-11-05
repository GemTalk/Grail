"""Fixture: a keyword whose value runs into a comprehension suggests '=='.

CPython's invalid_kwarg rule refuses ``f(a = i for i in x)'' with ``invalid
syntax. Maybe you meant '==' or ':=' instead of '='?'', underlined from the
keyword's name through the ``='' (Grammar/python.gram:1213-1214) -- the
message test_genexps expects of ``dict(a = i for i in range(10))''.  Grail
said only ``invalid syntax'', at the ``for''.  A parenthesised generator
or a comprehension display as the value stays legal.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

r = {}

SUGGESTION = "invalid syntax. Maybe you meant '==' or ':=' instead of '='?"


def outcome(source):
    try:
        compile(source, '<fixture>', 'eval')
    except SyntaxError as error:
        return (error.msg, error.lineno, error.offset, error.end_lineno, error.end_offset)
    return 'compiles'


r['a_keyword_then_for'] = [outcome('dict(a = i for i in range(10))'), outcome('f(a, b=1 for x in y)')]
r['with_a_condition_or_async'] = [outcome('f(a=1 for x in y if x)'), outcome('f(a=1 async for x in y)')]
r['a_comprehension_value_is_legal'] = [outcome('f(a=(i for i in x))'), outcome('f(a=[i for i in x], b=2)'),
                                       outcome('f(x for x in y)'), outcome('f(a=1 if b else 2)')]

EXPECTED = {
    'a_keyword_then_for': [(SUGGESTION, 1, 6, 1, 9), (SUGGESTION, 1, 6, 1, 8)],
    'with_a_condition_or_async': [(SUGGESTION, 1, 3, 1, 5), (SUGGESTION, 1, 3, 1, 5)],
    'a_comprehension_value_is_legal': ['compiles'] * 4,
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-32s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
