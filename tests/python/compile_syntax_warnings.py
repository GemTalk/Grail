"""Fixture: compile() emits the SyntaxWarnings CPython's code generator does.

CPython warns, while compiling, about code that is valid but almost certainly
wrong (Python/codegen.c): an assert of a parenthesised tuple, which always
passes; ``is'' with a literal; and a literal called or subscripted where a
comma was probably meant.  A filter that makes SyntaxWarning an error turns
each into a SyntaxError at the same place.  Grail emitted none, so test_grammar's
test_assert_syntax_warnings, test_comparison_is_literal, test_warn_missed_comma
and test_assert_warning_promotes_to_syntax_error failed.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import warnings

r = {}


def warned(source):
    with warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter('always')
        compile(source, '<testcase>', 'exec')
    return [(str(w.message), w.lineno, w.filename, w.category.__name__) for w in caught]


r['assert_tuple'] = warned('assert(x, "msg")')
r['assert_plain'] = warned('assert x, "msg"')
r['is_int'] = warned('x is 1')
r['is_not_tuple'] = warned('x is not (1, 2)')
r['is_singletons'] = warned('x is None; x is ...; True is x')
r['is_nested_tuple'] = warned('x is (1, (2, 3))')
r['is_first_pair_only'] = warned('x is 1 is 2')
r['called_tuple'] = warned('[(1, 2) (3, 4)]')
r['called_fstring'] = warned('[f"x={x}" (3, 4)]')
r['called_template'] = warned('[t"{x}" (3, 4)]')
r['written_concatenation'] = warned('("x=" + f"{x}")(3)')
r['subscripted_set'] = warned('[{1, 2} [3, 4]]')
r['indexed_list'] = warned('[[1, 2] [3, 4]]')
r['index_slice_or_int'] = warned('[1, 2][i:j]; [1, 2][0]; [1, 2][True]')
r['store_and_delete'] = warned('[1, 2][3, 4] = 5\ndel [1, 2][3, 4]')
r['line_inside_function'] = warned('def f():\n    return x is 1\n')

with warnings.catch_warnings():
    warnings.simplefilter('error', SyntaxWarning)
    try:
        compile('\n\nx is 1', '<t>', 'exec')
        r['as_error'] = 'no error'
    except SyntaxError as e:
        r['as_error'] = (e.msg, e.filename, e.lineno, e.offset, e.text)

IS_INT = ('"is" with \'int\' literal. Did you mean "=="?', 1, '<testcase>', 'SyntaxWarning')
EXPECTED = {
    'assert_tuple': [('assertion is always true, perhaps remove parentheses?', 1, '<testcase>', 'SyntaxWarning')],
    'assert_plain': [],
    'is_int': [IS_INT],
    'is_not_tuple': [('"is not" with \'tuple\' literal. Did you mean "!="?', 1, '<testcase>', 'SyntaxWarning')],
    'is_singletons': [],
    'is_nested_tuple': [],
    'is_first_pair_only': [IS_INT],
    'called_tuple': [("'tuple' object is not callable; perhaps you missed a comma?", 1, '<testcase>', 'SyntaxWarning')],
    'called_fstring': [("'str' object is not callable; perhaps you missed a comma?", 1, '<testcase>', 'SyntaxWarning')],
    'called_template': [("'string.templatelib.Template' object is not callable; perhaps you missed a comma?", 1, '<testcase>', 'SyntaxWarning')],
    'written_concatenation': [],
    'subscripted_set': [("'set' object is not subscriptable; perhaps you missed a comma?", 1, '<testcase>', 'SyntaxWarning')],
    'indexed_list': [('list indices must be integers or slices, not tuple; perhaps you missed a comma?', 1, '<testcase>', 'SyntaxWarning')],
    'index_slice_or_int': [],
    'store_and_delete': [],
    'line_inside_function': [('"is" with \'int\' literal. Did you mean "=="?', 2, '<testcase>', 'SyntaxWarning')],
    'as_error': ('"is" with \'int\' literal. Did you mean "=="?', '<t>', 3, 1, None),
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        print('%-5s %-22s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL',
                                    key, actual))
    print(SUMMARY)
