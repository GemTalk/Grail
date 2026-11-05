"""Fixture: a single ``}'' in an f-string is refused where it stands.

CPython's lexer refuses a lone ``}'' in an f-string's literal text --
``f-string: single '}' is not allowed'', or ``t-string: ...'' -- at the
brace itself, on its own line, while a doubled one is the literal ``}''
(Parser/lexer/lexer.c).  Grail's parser found it and located it at the start
of the whole literal, so every one read (1, 1).

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

r = {}

F_SINGLE = "f-string: single '}' is not allowed"


def located(source):
    try:
        compile(source, '<fixture>', 'exec')
    except SyntaxError as error:
        return (error.msg, error.lineno, error.offset, error.end_lineno, error.end_offset)
    return 'compiles'


r['at_the_brace'] = [located("f'}'"), located("f'a}b'"), located("f'{{}'"), located("rf'}'")]
r['after_a_field'] = [located("f'{x}}'"), located("f'{x:}}>3}'")]
r['on_its_own_line'] = located("f'''a\n}'''")
r['a_t_string_names_itself'] = located("t'}'")
r['doubled_braces_compile'] = [located("f'}}'"), located("f'{x}}}'")]

EXPECTED = {
    'at_the_brace': [(F_SINGLE, 1, 3, 1, 3), (F_SINGLE, 1, 4, 1, 4), (F_SINGLE, 1, 5, 1, 5), (F_SINGLE, 1, 4, 1, 4)],
    'after_a_field': [(F_SINGLE, 1, 6, 1, 6), (F_SINGLE, 1, 7, 1, 7)],
    'on_its_own_line': (F_SINGLE, 2, 1, 2, 1),
    'a_t_string_names_itself': ("t-string: single '}' is not allowed", 1, 3, 1, 3),
    'doubled_braces_compile': ['compiles', 'compiles'],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-26s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
