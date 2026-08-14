"""A comprehension in a class body does not see the class scope.

Python's rule: a comprehension (like a lambda) is its own function scope, and a
CLASS scope is NOT part of the enclosing-scope chain of a nested function.  So a
free name read inside a comprehension in a class body skips the class namespace
entirely and resolves in the module/global scope:

    y = 1
    class C:
        y = 2
        vals = [(x, y) for x in range(2)]      # CPython: [(0, 1), (1, 1)]

Grail read the class attribute and answered ``[(0, 2), (1, 2)]``.

The ONE exception is the OUTERMOST ITERABLE of the outermost comprehension:
CPython evaluates that in the ENCLOSING scope, which is exactly why
``[x for x in items]`` *can* see a sibling class attribute ``items``.  A second
``for`` clause's iterable is already inside the comprehension and does not.

Both halves are asserted here, because a fix that got only the first half right
would silently break every ``[x for x in <class attr>]`` in a class body.
"""

MOD = 'module'
SHADOWED = 'module-value'
SRC = [7, 8]
OFFSET = 1000

RESULTS = {}


def _catch(fn, *args, **kw):
    try:
        return fn(*args, **kw)
    except BaseException as exc:                     # noqa: BLE001
        return '%s: %s' % (type(exc).__name__, exc)


# ------------------- 1. the element expression skips the class namespace

class ElementExpr:
    SHADOWED = 'class-value'
    vals = [SHADOWED for _ in range(2)]


def element_expression_reads_the_module_not_the_class():
    """The canonical case.  ``SHADOWED`` exists at module scope AND as a class
    attribute; the comprehension must read the module's."""
    return ElementExpr.vals == ['module-value', 'module-value']


class ConditionExpr:
    SHADOWED = 'class-value'
    vals = [n for n in ['module-value', 'other'] if n == SHADOWED]


def condition_expression_reads_the_module_not_the_class():
    """An ``if`` clause is inside the comprehension scope too."""
    return ConditionExpr.vals == ['module-value']


class SecondIterable:
    SRC = ['class-a', 'class-b']
    vals = [(a, b) for a in [1] for b in SRC]


def second_for_clause_iterable_reads_the_module_not_the_class():
    """Only the FIRST clause's iterable is evaluated in the enclosing scope; a
    later ``for``'s iterable already runs inside the comprehension."""
    return SecondIterable.vals == [(1, 7), (1, 8)]


class NestedComp:
    SHADOWED = 'class-value'
    vals = [[SHADOWED for _ in range(1)] for _ in range(1)]


def nested_comprehension_reads_the_module_not_the_class():
    return NestedComp.vals == [['module-value']]


# --------------- 2. the outermost iterable DOES see the class namespace

class OutermostIterable:
    items = [1, 2, 3]
    vals = [x * 10 for x in items]


def outermost_iterable_reads_the_class_attribute():
    """The exception to the rule, and the reason it must be preserved: this is
    the ordinary way a class body derives one attribute from another."""
    return OutermostIterable.vals == [10, 20, 30]


class OutermostIterableExpr:
    items = [1, 2, 3]
    vals = [x for x in list(reversed(items))]


def outermost_iterable_may_be_an_expression():
    """The whole iterable EXPRESSION is in the enclosing scope, not just a bare
    name — the walk has to recognise being anywhere inside it."""
    return OutermostIterableExpr.vals == [3, 2, 1]


class OutermostThenElement:
    items = [1, 2]
    OFFSET = 100
    both = [x + OFFSET for x in items]


def outermost_sees_class_while_element_does_not():
    """Both rules in ONE comprehension, distinguished by value rather than by
    an error: ``items`` (the outermost iterable) resolves on the CLASS, giving
    [1, 2]; ``OFFSET`` (the element expression) skips the class and reads the
    MODULE's 1000, not the class's 100.  So [1001, 1002] — where Grail
    previously answered [101, 102]."""
    return OutermostThenElement.both == [1001, 1002]


# ------------------------- 3. a lambda in a class body behaves the same way

class LambdaBody:
    SHADOWED = 'class-value'
    f = lambda: SHADOWED


def lambda_body_reads_the_module_not_the_class():
    return LambdaBody.f() == 'module-value'


# ------------------------------ 4. what must NOT change

class PlainSibling:
    a = 5
    b = a + 1
    c = [a, b]


def plain_class_body_reads_are_unaffected():
    """A class-body expression that is NOT inside a comprehension or lambda
    still reads sibling attributes — that is the class scope doing its job."""
    return [PlainSibling.b, PlainSibling.c] == [6, [5, 6]]


class MethodBody:
    LIMIT = 3

    def scaled(self):
        return [i for i in range(MethodBody.LIMIT)]


def method_bodies_are_unaffected():
    """A comprehension inside a METHOD reaches class attributes the normal
    Python way (through the class object), which this change must not touch."""
    return MethodBody().scaled() == [0, 1, 2]


def exec_agrees_with_module_compilation():
    """The same source, compiled into a module class and into an exec doit,
    answers the same thing."""
    ns = {'SHADOWED': 'module-value'}
    exec('class _C:\n'
         '    SHADOWED = "class-value"\n'
         '    vals = [SHADOWED for _ in range(2)]\n', ns)
    ns2 = {}
    exec('class _C:\n'
         '    items = [1, 2, 3]\n'
         '    vals = [x * 10 for x in items]\n', ns2)
    return [ns['_C'].vals, ns2['_C'].vals] == \
        [ElementExpr.vals, OutermostIterable.vals]


RESULTS = {
    'element_expr': element_expression_reads_the_module_not_the_class(),
    'condition_expr': condition_expression_reads_the_module_not_the_class(),
    'second_iterable': second_for_clause_iterable_reads_the_module_not_the_class(),
    'nested_comp': nested_comprehension_reads_the_module_not_the_class(),
    'outermost_iterable': outermost_iterable_reads_the_class_attribute(),
    'outermost_expression': outermost_iterable_may_be_an_expression(),
    'outermost_vs_element': outermost_sees_class_while_element_does_not(),
    'lambda_body': lambda_body_reads_the_module_not_the_class(),
    'plain_sibling_unaffected': plain_class_body_reads_are_unaffected(),
    'method_body_unaffected': method_bodies_are_unaffected(),
    'exec_matches_module': exec_agrees_with_module_compilation(),
}


# scripts/check_python_fixtures.sh runs this under CPython in CI.
if __name__ == '__main__':
    checks = [
        element_expression_reads_the_module_not_the_class,
        condition_expression_reads_the_module_not_the_class,
        second_for_clause_iterable_reads_the_module_not_the_class,
        nested_comprehension_reads_the_module_not_the_class,
        outermost_iterable_reads_the_class_attribute,
        outermost_iterable_may_be_an_expression,
        outermost_sees_class_while_element_does_not,
        lambda_body_reads_the_module_not_the_class,
        plain_class_body_reads_are_unaffected,
        method_bodies_are_unaffected,
        exec_agrees_with_module_compilation,
    ]
    for fn in checks:
        print('%-4s %s' % ('OK' if fn() is True else 'FAIL', fn.__name__))
