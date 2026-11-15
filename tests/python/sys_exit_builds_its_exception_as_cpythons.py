"""Fixture: sys.exit builds its SystemExit as CPython's does.

CPython's sys.exit(status=None, /) is PyErr_SetObject(PyExc_SystemExit,
status), and _PyErr_CreateException builds the exception from the argument
by its rules: None is no argument at all, a tuple is the argument LIST, an
instance of SystemExit is raised itself, and anything else is the one
argument.  It takes one positional argument at most and no keyword.

Grail passed a tuple through whole (``exit((42,))'' had code (42,)), and
its varargs form dropped every argument past the first, so ``exit(42, 42)''
exited where CPython raises TypeError -- test_sys's test_exit, whose
SystemExit then escaped the test runner.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import sys

r = {}


def exit_with(*args, **kwargs):
    """What sys.exit raised: the exception's class, args and code, and
    whether it is the very object passed in."""
    try:
        sys.exit(*args, **kwargs)
    except SystemExit as e:
        return [type(e).__name__, e.args, e.code, bool(args) and e is args[0]]
    except TypeError as e:
        return ['TypeError', str(e)]
    return 'returned'


r['no_argument_is_code_none'] = exit_with()
r['none_is_no_argument'] = exit_with(None)
r['an_int_is_the_code'] = exit_with(42)
r['a_string_is_the_code'] = exit_with('exit')
r['a_list_is_one_argument'] = exit_with([1])
r['a_one_element_tuple_is_unpacked'] = exit_with((42,))
r['a_two_element_tuple_is_the_argument_list'] = exit_with((17, 23))
r['an_empty_tuple_is_no_argument'] = exit_with(())
r['a_systemexit_is_raised_itself'] = exit_with(SystemExit(5))
def another_exception():
    """Exceptions compare by identity, so this one is checked by identity."""
    value = ValueError('v')
    try:
        sys.exit(value)
    except SystemExit as e:
        return [type(e).__name__, e.args == (value,), e.code is value]


r['another_exception_is_one_argument'] = another_exception()
r['two_arguments_are_refused'] = exit_with(42, 42)
r['a_keyword_is_refused'] = exit_with(status=1)

EXPECTED = {
    'no_argument_is_code_none': ['SystemExit', (), None, False],
    'none_is_no_argument': ['SystemExit', (), None, False],
    'an_int_is_the_code': ['SystemExit', (42,), 42, False],
    'a_string_is_the_code': ['SystemExit', ('exit',), 'exit', False],
    'a_list_is_one_argument': ['SystemExit', ([1],), [1], False],
    'a_one_element_tuple_is_unpacked': ['SystemExit', (42,), 42, False],
    'a_two_element_tuple_is_the_argument_list': ['SystemExit', (17, 23), (17, 23), False],
    'an_empty_tuple_is_no_argument': ['SystemExit', (), None, False],
    'a_systemexit_is_raised_itself': ['SystemExit', (5,), 5, True],
    'another_exception_is_one_argument': ['SystemExit', True, True],
    'two_arguments_are_refused': ['TypeError', 'exit expected at most 1 argument, got 2'],
    'a_keyword_is_refused': ['TypeError', 'sys.exit() takes no keyword arguments'],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    if sys.argv[1:] == ['--emit']:
        for key in r:
            print('    %r: %r,' % (key, r[key]))
        sys.exit()
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-44s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
