"""Fixture: types.FunctionType binds and checks its arguments as CPython does.

function.__new__ is an Argument Clinic signature -- (code, globals,
name=None, argdefs=None, closure=None, kwdefaults=None) -- whose parser
refuses a bad call with _PyArg_UnpackKeywords's messages (Python/
getargs.c), and func_new_impl then refuses an optional argument of the
wrong type: "arg 4 (defaults) must be None or tuple" and its siblings
(Objects/funcobject.c:1120-1155).  The name and the defaults are the
function's.

Grail accepted and ignored everything past globals, named every function
'<lambda>', and refused code and globals in words of its own
(test_types FunctionTests.test_function_type_wrong_defaults).

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import types

r = {}
code = compile('a + 1', '<fixture>', 'eval')


def made(*args, **kwargs):
    try:
        types.FunctionType(*args, **kwargs)
        return 'built'
    except TypeError as e:
        return 'TypeError: %s' % e


r['defaults_not_a_tuple'] = made(code, {}, 'func', 1, None, {'c': 3})
r['kwdefaults_not_a_dict'] = made(code, {}, 'func', None, None, 3)
r['name_not_a_string'] = made(code, {}, 5)
r['closure_not_a_tuple'] = made(code, {}, 'f', (1,), 7)
r['code_not_code'] = made(5, {})
r['globals_not_a_dict'] = made(code, 5)
r['too_many_arguments'] = made(code, {}, None, None, None, None, 7)
r['globals_missing'] = made(code)
r['code_given_both_ways'] = made(code, {}, code=code)
r['an_unknown_keyword'] = made(code, {}, bogus=1)
r['by_keyword'] = made(code=code, globals={}, name='f', argdefs=(1,))

function = types.FunctionType(code, {'a': 41}, 'func', (2,), None, {'c': 3})
r['name_and_defaults_kept'] = (
    function.__name__, function.__defaults__, function.__kwdefaults__)
unnamed = types.FunctionType(code, {'a': 41})
r['the_code_names_an_unnamed_one'] = (
    unnamed.__name__, unnamed.__defaults__, unnamed.__kwdefaults__)
r['calling_it_runs_the_code'] = unnamed()

EXPECTED = {
    'defaults_not_a_tuple': 'TypeError: arg 4 (defaults) must be None or tuple',
    'kwdefaults_not_a_dict': 'TypeError: arg 6 (kwdefaults) must be None or dict',
    'name_not_a_string': 'TypeError: arg 3 (name) must be None or string',
    'closure_not_a_tuple': 'TypeError: arg 5 (closure) must be None or tuple',
    'code_not_code': "TypeError: function() argument 'code' must be code, not int",
    'globals_not_a_dict': "TypeError: function() argument 'globals' must be dict, not int",
    'too_many_arguments': 'TypeError: function() takes at most 6 arguments (7 given)',
    'globals_missing': "TypeError: function() missing required argument 'globals' (pos 2)",
    'code_given_both_ways':
        "TypeError: argument for function() given by name ('code') and position (1)",
    'an_unknown_keyword': "TypeError: function() got an unexpected keyword argument 'bogus'",
    'by_keyword': 'built',
    'name_and_defaults_kept': ('func', (2,), {'c': 3}),
    'the_code_names_an_unnamed_one': ('<module>', None, None),
    'calling_it_runs_the_code': 42,
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-30s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
