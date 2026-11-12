"""Fixture: an f-string's replacement fields nest at most three deep.

A field's format spec may hold fields of its own, and theirs may too, but
CPython's lexer refuses a field opened at the fourth level with
``SyntaxError: f-string: expressions nested too deeply`` (MAX_EXPR_NESTING,
Parser/lexer/state.h:46).  Grail accepted any depth, so test_fstring's
test_fstring_nested_too_deeply saw no exception.  A t-string names itself in
the message, and an f-string written inside a field counts from the start.
Every check holds under CPython 3.14, which is what makes it evidence.
"""

r = {}


def compiled(source):
    try:
        compile(source, '<fixture>', 'eval')
        return 'compiled'
    except SyntaxError as error:
        return 'SyntaxError: %s' % error.msg


r['three_levels_compile'] = [compiled("f'{1}'"), compiled("f'{1:{2}}'"), compiled("f'{1:{2:{3}}}'")]
r['a_fourth_level_is_refused'] = [compiled("f'{1:{2:{3:{4}}}}'"), compiled('f"{1+2:{1+2:{1+1:{1}}}}"')]
r['sibling_fields_do_not_add_up'] = compiled("f'{1:{2}{3}{4:{5}}}'")
r['a_t_string_names_itself'] = compiled("t'{1:{2:{3:{4}}}}'")
r['an_inner_f_string_counts_from_the_start'] = compiled("f'{1:{2:{f\"{3:{4}}\"}}}'")
r['three_levels_evaluate'] = eval("f'{7:{0:{1}}}'")

EXPECTED = {
    'three_levels_compile': ['compiled', 'compiled', 'compiled'],
    'a_fourth_level_is_refused': ['SyntaxError: f-string: expressions nested too deeply',
                                  'SyntaxError: f-string: expressions nested too deeply'],
    'sibling_fields_do_not_add_up': 'compiled',
    'a_t_string_names_itself': 'SyntaxError: t-string: expressions nested too deeply',
    'an_inner_f_string_counts_from_the_start': 'compiled',
    'three_levels_evaluate': '7',
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-42s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
