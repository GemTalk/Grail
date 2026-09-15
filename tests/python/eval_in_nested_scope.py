"""Fixture: ``eval'' / ``exec'' inside a NESTED def, a lambda or a comprehension.

``eval(src)'' with no namespace arguments means "use the caller's globals and
locals", and so does ``eval(src, None)'' -- CPython treats a None namespace as
"not supplied".  Grail finds that caller at run time by walking out to the
innermost frame carrying a codegen marker temp.

A NESTED DEF COMPILES TO A BLOCK of the enclosing method, which is what made
this family hard.  The text puts its ``___curPos___'' marker in each nested
def's and each lambda's block, so the walk stops there; the IR path's closure
blocks carried no marker at all, so the walk ran PAST them to the enclosing
method and evaluated the expression against the WRONG frame's temps -- reported
a value where CPython raises, and raised where CPython reports one.

The shapes below separate the three things that are easy to confuse:

  * calls that name their namespaces OUTRIGHT (``eval(src, g)'',
    ``eval(src, g, l)'') consult no frame at any nesting depth, and are the
    majority of the corpus occurrences -- test_builtin, test_traceback and
    test_decorators all pass explicit globals;
  * calls whose namespace argument is None, which DO walk, and whose answer is
    therefore a statement about which frame was found;
  * what a nested scope can and cannot see: its OWN locals and parameters yes,
    the ENCLOSING function's locals no -- CPython's compiler makes no cell for
    a name that appears only inside an eval string, so such a name is genuinely
    out of scope.

TWO SHAPES ARE XFAILS, and neither is this cut's.  Grail's caller-namespace
walk is blind to a COMPREHENSION's own target and to a name ``exec'' binds into
the caller's namespace; both paths answer the same wrong thing, so they are
pinned here rather than hidden.

Everything here is verified against real CPython by running the file directly.
"""

r = {}

MODULE_LEVEL = 'module'


def record(key, fn):
    try:
        r[key] = fn()
    except Exception as exc:
        r[key] = '%s: %s' % (type(exc).__name__, exc)


# --------------------------------------------------------------------------
# Explicit namespaces: no frame is consulted, at any depth.
# --------------------------------------------------------------------------

def explicit_globals_in_a_nested_def():
    def inner():
        return eval('a + b', {'a': 10, 'b': 32})

    return inner()


record('explicit_globals_in_a_nested_def', explicit_globals_in_a_nested_def)


def explicit_globals_and_locals():
    def inner():
        return eval('a + b', {'a': 1}, {'b': 2})

    return inner()


record('explicit_globals_and_locals', explicit_globals_and_locals)


def explicit_globals_in_a_lambda():
    return (lambda: eval('c * 2', {'c': 21}))()


record('explicit_globals_in_a_lambda', explicit_globals_in_a_lambda)


def explicit_globals_in_a_comprehension():
    return [eval('n + 1', {'n': i}) for i in (1, 2, 3)]


record('explicit_globals_in_a_comprehension', explicit_globals_in_a_comprehension)


def exec_with_explicit_globals():
    def inner():
        g = {'out': None}
        exec('out = 7 * 6', g)
        return g['out']

    return inner()


record('exec_with_explicit_globals', exec_with_explicit_globals)


def explicit_globals_hide_the_enclosing_local():
    hidden = 'should not be visible'

    def inner():
        return eval('hidden', {'ok': 1})

    return inner()


record('explicit_globals_hide_the_enclosing_local',
       explicit_globals_hide_the_enclosing_local)


def explicit_globals_under_varargs(*args):
    def inner():
        return eval('len(x)', {'x': args, 'len': len})

    return inner()


record('explicit_globals_under_varargs',
       lambda: explicit_globals_under_varargs(1, 2, 3))


def a_call_inside_the_evaluated_source():
    def inner():
        return eval('sorted(vals)', {'sorted': sorted, 'vals': [3, 1, 2]})

    return inner()


record('a_call_inside_the_evaluated_source', a_call_inside_the_evaluated_source)


class Holder:
    def a_method_with_a_nested_explicit_eval(self):
        def inner():
            return eval('p + q', {'p': 4, 'q': 5})

        return inner()


record('a_method_with_a_nested_explicit_eval',
       Holder().a_method_with_a_nested_explicit_eval)


# --------------------------------------------------------------------------
# A None namespace: the walk runs, and these say which frame it found.
# --------------------------------------------------------------------------

def none_sees_the_nested_defs_own_local():
    def inner():
        z = 5
        return eval('z + 1', None)

    return inner()


record('none_sees_the_nested_defs_own_local', none_sees_the_nested_defs_own_local)


def none_sees_the_nested_defs_own_parameter():
    def inner(p):
        return eval('p * 3', None)

    return inner(7)


record('none_sees_the_nested_defs_own_parameter',
       none_sees_the_nested_defs_own_parameter)


def none_sees_the_nested_defs_own_varargs():
    def inner(*a):
        return eval('len(a)', None)

    return inner(1, 2, 3)


record('none_sees_the_nested_defs_own_varargs',
       none_sees_the_nested_defs_own_varargs)


def none_cannot_see_the_enclosing_local():
    x = 8

    def inner():
        return eval('x', None)

    return inner()


record('none_cannot_see_the_enclosing_local', none_cannot_see_the_enclosing_local)


def a_none_valued_variable_is_the_same_as_none():
    y = 8
    g = None

    def inner():
        return eval('y', g)

    return inner()


record('a_none_valued_variable_is_the_same_as_none',
       a_none_valued_variable_is_the_same_as_none)


def none_sees_a_module_global():
    def inner():
        return eval('MODULE_LEVEL', None)

    return inner()


record('none_sees_a_module_global', none_sees_a_module_global)


def none_in_a_lambda_sees_its_parameter():
    return (lambda q: eval('q * 2', None))(21)


record('none_in_a_lambda_sees_its_parameter', none_in_a_lambda_sees_its_parameter)


class MethodHolder:
    def go(self):
        w = 3

        def inner():
            return eval('w', None)

        return inner()


record('none_in_a_methods_nested_def_cannot_see_the_methods_local',
       MethodHolder().go)


def three_arguments_with_none_for_locals():
    def inner():
        return eval('p + 1', {'p': 41}, None)

    return inner()


record('three_arguments_with_none_for_locals', three_arguments_with_none_for_locals)


# --------------------------------------------------------------------------
# The two XFAILs.
# --------------------------------------------------------------------------

def none_in_a_comprehension():
    return [eval('n + 1', None) for n in (1, 2, 3)]


record('none_in_a_comprehension', none_in_a_comprehension)


def exec_with_none_binds_into_the_caller():
    def inner():
        d = {}
        exec('d["out"] = 6 * 7', None)
        return d['out']

    return inner()


record('exec_with_none_binds_into_the_caller', exec_with_none_binds_into_the_caller)


XFAIL = {'none_in_a_comprehension', 'exec_with_none_binds_into_the_caller'}


EXPECTED = {
    'explicit_globals_in_a_nested_def': 42,
    'explicit_globals_and_locals': 3,
    'explicit_globals_in_a_lambda': 42,
    'explicit_globals_in_a_comprehension': [2, 3, 4],
    'exec_with_explicit_globals': 42,
    'explicit_globals_hide_the_enclosing_local':
        "NameError: name 'hidden' is not defined",
    'explicit_globals_under_varargs': 3,
    'a_call_inside_the_evaluated_source': [1, 2, 3],
    'a_method_with_a_nested_explicit_eval': 9,
    'none_sees_the_nested_defs_own_local': 6,
    'none_sees_the_nested_defs_own_parameter': 21,
    'none_sees_the_nested_defs_own_varargs': 3,
    'none_cannot_see_the_enclosing_local': "NameError: name 'x' is not defined",
    'a_none_valued_variable_is_the_same_as_none':
        "NameError: name 'y' is not defined",
    'none_sees_a_module_global': 'module',
    'none_in_a_lambda_sees_its_parameter': 42,
    'none_in_a_methods_nested_def_cannot_see_the_methods_local':
        "NameError: name 'w' is not defined",
    'three_arguments_with_none_for_locals': 42,
    # The XFAILs hold CPython's answer; Grail answers a NameError on both
    # paths, which EvalInNestedScopeTestCase pins.
    'none_in_a_comprehension': [2, 3, 4],
    'exec_with_none_binds_into_the_caller': 42,
}


KEYS = sorted(EXPECTED)


if __name__ == '__main__':
    for key in KEYS:
        actual = r[key]
        expected = EXPECTED[key]
        if key in XFAIL:
            # EXPECTED holds CPython's answer, so this agrees HERE and differs
            # under Grail -- the line is XFAIL either way and never XPASS.
            status = 'XFAIL' if actual == expected else 'FAIL'
        else:
            status = 'OK' if actual == expected else 'FAIL'
        print('%-5s %-58s -> %r' % (status, key, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-5s %-58s is not in EXPECTED' % ('FAIL', extra))
