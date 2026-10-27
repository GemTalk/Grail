"""Fixture: at most 200 brackets can be open at once, as in CPython's lexer.

CPython's tokenizer holds a stack of 200 open brackets (MAXLEVEL,
Parser/lexer/state.h) and refuses the 201st where it opens, with "too many
nested parentheses" (Parser/lexer/lexer.c) -- test_grammar's test_max_level.
Grail had no limit.  The 200-deep cases need the deep Smalltalk stack the test
runners configure (GEM_MAX_SMALLTALK_STACK_DEPTH); the refusals do not, since
they stop in the tokenizer.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

r = {}


def outcome(source):
    try:
        compile(source, '<test string>', 'exec')
        return 'ok'
    except SyntaxError as e:
        return e.msg, e.lineno, e.offset


r['two_hundred_parse'] = [outcome(open_ * 200 + close * 200)
                          for open_, close in ('()', '[]', '{}')]
r['the_201st_is_refused'] = [outcome(open_ * 201 + close * 201)
                             for open_, close in ('()', '[]', '{}')]
r['mixed_kinds_count_together'] = outcome('([{' * 67 + '}])' * 67)
r['refused_where_it_opens'] = outcome('x = ' + '(' * 201 + ')' * 201)
r['closed_brackets_do_not_count'] = outcome('(),' * 300 + '\n' + '[' * 200 + ']' * 200)
r['eval_answers_the_empty_tuple'] = eval('(' * 200 + ')' * 200)

TOO_MANY = 'too many nested parentheses'
EXPECTED = {
    'two_hundred_parse': ['ok'] * 3,
    'the_201st_is_refused': [(TOO_MANY, 1, 201)] * 3,
    'mixed_kinds_count_together': (TOO_MANY, 1, 201),
    'refused_where_it_opens': (TOO_MANY, 1, 205),
    'closed_brackets_do_not_count': 'ok',
    'eval_answers_the_empty_tuple': (),
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
