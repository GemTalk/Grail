"""Fixture: a lambda's or nested def's attribute errors name 'function'.

A function without an attribute raises CPython's AttributeError on a read and
on a delete alike: ``'function' object has no attribute 'x''', with the name
and the function as the error's ``name'' and ``obj''.  In Grail a lambda and a
nested def are a different Smalltalk class from a module-level def, and their
misses named that class on a read (``ExecBlock object has no attribute 'x''')
and said only ``x'' on a delete, with neither attribute set.  Every check holds
under CPython 3.14, which is what makes it evidence.
"""

r = {}


def outer():
    def inner():
        pass
    return inner


def top():
    pass


anonymous = lambda: 0
nested = outer()


def read(function, name):
    try:
        getattr(function, name)
    except AttributeError as error:
        return [str(error), error.name, error.obj is function]
    return 'no error'


def delete(function, name):
    try:
        delattr(function, name)
    except AttributeError as error:
        return [str(error), error.name, error.obj is function]
    return 'no error'


def deleted_twice(function):
    function.marker = 1
    del function.marker
    return delete(function, 'marker')


MISSING = "'function' object has no attribute 'nope'"
r['a_lambda_read'] = read(anonymous, 'nope')
r['a_nested_def_read'] = read(nested, 'nope')
r['a_lambda_delete'] = delete(anonymous, 'nope')
r['a_nested_def_delete'] = delete(nested, 'nope')
r['a_dunder_read'] = read(anonymous, '__nope__')
r['a_second_delete'] = deleted_twice(nested)
r['a_module_level_def_is_unchanged'] = [read(top, 'nope'), delete(top, 'nope')]
r['defaults_still_apply'] = [hasattr(anonymous, 'nope'), getattr(nested, 'nope', 5)]

EXPECTED = {
    'a_lambda_read': [MISSING, 'nope', True],
    'a_nested_def_read': [MISSING, 'nope', True],
    'a_lambda_delete': [MISSING, 'nope', True],
    'a_nested_def_delete': [MISSING, 'nope', True],
    'a_dunder_read': ["'function' object has no attribute '__nope__'", '__nope__', True],
    'a_second_delete': ["'function' object has no attribute 'marker'", 'marker', True],
    'a_module_level_def_is_unchanged': [[MISSING, 'nope', True], [MISSING, 'nope', True]],
    'defaults_still_apply': [False, 5],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-34s -> %s' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, ascii(actual)))
    print(SUMMARY)
