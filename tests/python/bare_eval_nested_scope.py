"""Fixture: a BARE ``eval(expr)`` / ``exec(src)`` inside a NESTED def.

``eval(expr)`` with no namespace argument is not dispatched to the builtin at
all.  printSmalltalkOn:'s step 0c rewrites it, injecting the enclosing scope's
locals as the evaluation namespace:

    (builtins) _eval: { src.
        (builtins) ___evalScopeFor___: self
            locals: ((builtins) ___buildLocals___: { { 'x'. x } }) } kw: nil

The IR path had that rewrite for a top-level def and a method, and refused
every other scope under one symbol -- which swept up a nested def along with
the two shapes that really cannot be spelled.

THE TEXT EMITS THE SAME REWRITE IN A NESTED DEF, character for character: step
0c's first arm tests ``functionBeingCompiled notNil'', which a nested def
satisfies, and the IR's own locals snapshot reads that same
``functionBeingCompiled'' -- inside a nested block emit it IS the nested def.
So the snapshot gathers that def's own names with no change at all.

WHAT STAYS REFUSED is a scope whose locals the snapshot cannot build: a
COMPREHENSION, whose targets step 0c prints through a different helper, and a
CLASS BODY, which is not a namespace the snapshot models.  A class further OUT
is just the class a method belongs to and was always fine.

The shapes below walk that boundary: a top-level def, a nested def, a nested
def reading its own parameter, ``exec`` rather than ``eval``, a module name
seen from a nested def, the free-variable shape test_scope pins, and a nested
def inside a METHOD -- which has a class in its chain but not as its innermost
scope.

Everything here is verified against real CPython by running the file directly.
"""

r = {}

MODULE_NAME = 'module-level'


def record(key, fn):
    try:
        r[key] = fn()
    except Exception as exc:
        r[key] = '%s: %s' % (type(exc).__name__, exc)


def top_level_def_bare_eval():
    x = 10
    return eval('x + 1')


def nested_def_bare_eval():
    def inner():
        x = 20
        return eval('x + 1')
    return inner()


def nested_def_sees_its_parameter():
    def inner(p):
        return eval('p * 2')
    return inner(21)


def nested_def_bare_exec():
    def inner():
        d = {}
        exec('d["k"] = 7')
        return d['k']
    return inner()


def nested_def_reads_a_module_name():
    def inner():
        return eval('MODULE_NAME')
    return inner()


def nested_def_free_var():
    """test_scope.testEvalFreeVars' shape: the enclosing local is referenced
    in the body, so CPython makes a cell for it."""
    x = 4

    def g():
        x
        return eval('x + 1')
    return g()


class H:
    def a_method_nested_bare_eval(self):
        def inner():
            y = 5
            return eval('y * 3')
        return inner()


record('top_level_def_bare_eval', top_level_def_bare_eval)
record('nested_def_bare_eval', nested_def_bare_eval)
record('nested_def_sees_its_parameter', nested_def_sees_its_parameter)
record('nested_def_bare_exec', nested_def_bare_exec)
record('nested_def_reads_a_module_name', nested_def_reads_a_module_name)
record('nested_def_free_var', nested_def_free_var)
record('a_method_nested_bare_eval', H().a_method_nested_bare_eval)

EXPECTED = {
    'top_level_def_bare_eval': 11,
    'nested_def_bare_eval': 21,
    'nested_def_sees_its_parameter': 42,
    'nested_def_bare_exec': 7,
    'nested_def_reads_a_module_name': 'module-level',
    'nested_def_free_var': 5,
    'a_method_nested_bare_eval': 15,
}


KEYS = sorted(EXPECTED)


if __name__ == '__main__':
    for key in KEYS:
        actual = r[key]
        print('%-5s %-32s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL',
                                    key, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-5s %-32s is not in EXPECTED' % ('FAIL', extra))
