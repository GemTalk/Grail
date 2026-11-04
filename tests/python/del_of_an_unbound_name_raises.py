"""Fixture: ``del name'' raises when nothing binds the name, as CPython's does.

CPython's DELETE_NAME and DELETE_GLOBAL raise NameError, ``name 'x' is not
defined'', when the namespace holds no such name -- builtins do not count
(Python/bytecodes.c:1536-1553, 1683-1695).  DELETE_FAST raises
UnboundLocalError for an empty local, and DELETE_DEREF a read's error for an
empty cell: UnboundLocalError for the function's own, NameError ``cannot
access free variable'' for an enclosing function's (:1856-1867, 1883-1893;
Python/ceval.c:3485-3499).  Grail's delete nilled the temp or removed the
module slot without looking, so every one of these succeeded silently.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

r = {}


def outcome(thunk):
    try:
        thunk()
        return 'no error'
    except (NameError, UnboundLocalError) as error:
        return '%s: %s' % (type(error).__name__, error)


def executing(source, namespace=None):
    return lambda: exec(source, {} if namespace is None else namespace)


def a_local_deleted_before_it_is_bound():
    del the_local
    the_local = 1


def a_local_deleted_twice():
    the_local = 1
    del the_local
    del the_local


def a_local_only_ever_deleted():
    del only_deleted


def a_cell_deleted_before_it_is_bound():
    def reader():
        return the_cell
    del the_cell
    the_cell = 1


def a_free_variable_deleted_before_it_is_bound():
    def deleter():
        nonlocal the_free
        del the_free
    deleter()
    the_free = 1


def a_global_never_bound():
    global never_bound_anywhere
    del never_bound_anywhere


r['a_module_name_never_bound'] = outcome(executing('del never_bound'))
r['a_module_name_deleted_twice'] = outcome(executing('x = 1\ndel x\ndel x'))
r['a_builtin_is_no_module_name'] = outcome(executing('del len'))
partial = {}
r['a_tuple_stops_at_the_first_unbound'] = [
    outcome(executing('x = 1\ndel x, y', partial)), 'x' in partial]
r['a_global_of_an_exec'] = outcome(executing('def f():\n    global g\n    del g\nf()'))
r['a_local'] = outcome(a_local_deleted_before_it_is_bound)
r['a_local_deleted_twice'] = outcome(a_local_deleted_twice)
r['a_local_only_ever_deleted'] = outcome(a_local_only_ever_deleted)
r['a_cell'] = outcome(a_cell_deleted_before_it_is_bound)
r['a_free_variable'] = outcome(a_free_variable_deleted_before_it_is_bound)
r['a_global'] = outcome(a_global_never_bound)

try:
    del this_module_never_bound
    r['this_module'] = 'no error'
except NameError as error:
    r['this_module'] = 'NameError: %s' % error


def a_def_this_module_deletes():
    pass


del a_def_this_module_deletes
try:
    del a_def_this_module_deletes
    r['a_def_deleted_twice'] = 'no error'
except NameError as error:
    r['a_def_deleted_twice'] = 'NameError: %s' % error

bound = {'kept': 1, 'gone': 2}
exec('del gone', bound)
r['a_bound_exec_name_still_goes'] = sorted(name for name in bound if name != '__builtins__')


def bound_names_still_go():
    global module_value
    local_value = 1
    del local_value, module_value
    return 'module_value' in globals()


module_value = 1
r['bound_names_still_go'] = bound_names_still_go()

EXPECTED = {
    'a_module_name_never_bound': "NameError: name 'never_bound' is not defined",
    'a_module_name_deleted_twice': "NameError: name 'x' is not defined",
    'a_builtin_is_no_module_name': "NameError: name 'len' is not defined",
    'a_tuple_stops_at_the_first_unbound': ["NameError: name 'y' is not defined", False],
    'a_global_of_an_exec': "NameError: name 'g' is not defined",
    'a_local': "UnboundLocalError: cannot access local variable 'the_local' where it is not associated with a value",
    'a_local_deleted_twice': "UnboundLocalError: cannot access local variable 'the_local' where it is not associated with a value",
    'a_local_only_ever_deleted': "UnboundLocalError: cannot access local variable 'only_deleted' where it is not associated with a value",
    'a_cell': "UnboundLocalError: cannot access local variable 'the_cell' where it is not associated with a value",
    'a_free_variable': "NameError: cannot access free variable 'the_free' where it is not associated with a value in enclosing scope",
    'a_global': "NameError: name 'never_bound_anywhere' is not defined",
    'this_module': "NameError: name 'this_module_never_bound' is not defined",
    'a_def_deleted_twice': "NameError: name 'a_def_this_module_deletes' is not defined",
    'a_bound_exec_name_still_goes': ['kept'],
    'bound_names_still_go': False,
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-36s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
