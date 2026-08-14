"""Class-body sibling name reads when the class body is compiled in a DOIT.

`exec("class C: ...")` compiles the class body into a doit, not into a module
class.  NameAst's whole class-body branch was gated on
``CallAst moduleClassBeingCompiled notNil``, because every fallback in it reads
the enclosing scope through ``<ModuleClass> @env0:___instance___``.  With no
module class the gate failed, the read fell through to the generic emits, and a
class-body reference to a name bound earlier in the SAME class body came out as
a bare Smalltalk identifier.

The attribute lives on the class, not as a doit temp, so the doit did not
compile:  ``CompileError 1001, undefined symbol items``.  That was 10 of
test_listcomps' 42 remaining failures — its `_check_in_scopes` harness runs every
snippet in a class body, so any snippet of the shape "bind a name, then use it in
a comprehension or lambda" hit it.

A NOTE ON WHAT IS **NOT** ASSERTED HERE.  Python evaluates a comprehension's
OUTERMOST ITERABLE in the enclosing scope — the class body — which is why it can
see a class attribute at all.  Everything else (the element expression, inner
iterables, conditions) runs in the comprehension's own scope, which SKIPS class
scope.  Grail does not implement that skip: a module-compiled

    y = 1
    class C:
        y = 2
        vals = [(x, y) for x in range(2)]

answers ``[(0, 2), (1, 2)]`` where CPython answers ``[(0, 1), (1, 1)]``.  That
deviation is PRE-EXISTING and identical in the module path, so these tests pin
exec/module *equivalence* and deliberately do not assert the CPython value for
element-expression reads.  It is now the top remaining cause in test_listcomps
(test_in_class_scope_with_global / _with_nonlocal).
"""

RESULTS = {}


def _catch(fn, *args, **kw):
    try:
        return fn(*args, **kw)
    except BaseException as exc:                     # noqa: BLE001
        return '%s: %s' % (type(exc).__name__, exc)


def _exec_class(body, attr, ns=None):
    """exec a class body, return one attribute of the resulting class."""
    ns = dict(ns or {})
    exec('class _C:\n' + body, ns)
    return getattr(ns['_C'], attr)


# ------------------------------- 1. the reads that produced a CompileError

def plain_sibling_attribute_read():
    return _exec_class('    a = 5\n    b = a + 1\n', 'b') == 6


def comprehension_outermost_iterable_reads_a_sibling():
    """``items = [...]`` then ``y = [x for x in items]`` — the exact shape
    behind ``undefined symbol items``.  The outermost iterable is the one
    position Python DOES evaluate in the class scope."""
    return _exec_class('    items = [1, 2]\n    y = [x for x in items]\n',
                       'y') == [1, 2]


def lambda_in_a_comprehension_reads_a_sibling():
    """test_listcomps' test_lambdas_with_free_var shape: build lambdas in one
    class attribute, call them from the next."""
    return _exec_class(
        '    items = [(lambda: i) for i in range(5)]\n'
        '    y = [x() for x in items]\n', 'y') == [4, 4, 4, 4, 4]


def nested_comprehension_over_a_sibling():
    """test_nested_4's shape — a comprehension whose iterable is a sibling
    holding tuples of lambdas."""
    return _exec_class(
        '    items = [([lambda: x for x in range(2)], lambda: x)'
        ' for x in range(3)]\n'
        '    out = [([fn() for fn in fns], fn()) for fns, fn in items]\n',
        'out') == [([1, 1], 2), ([1, 1], 2), ([1, 1], 2)]


def sibling_method_reference():
    """A class-body reference to a sibling ``def`` — a receiver-less
    BoundMethod, which needs no module instance."""
    ns = {}
    exec('class _C:\n'
         '    def f(self):\n'
         '        return 7\n'
         '    g = f\n', ns)
    return ns['_C']().g() == 7


def nested_class_sibling_reference():
    """A nested class lives in the outer class's per-class dynamic store."""
    return _exec_class('    class Inner:\n        v = 3\n'
                       '    got = Inner.v\n', 'got') == 3


# --------------------------- 2. what must keep working / must not regress

def class_body_still_reads_an_exec_global():
    """A name that is NOT a class attribute still resolves in the exec
    namespace — that path was never broken and must stay that way."""
    return _exec_class('    y = G\n', 'y', ns={'G': 7}) == 7


def class_attribute_shadows_an_exec_global():
    """When both exist, Python reads the class-local."""
    return _exec_class('    G = 1\n    y = G\n', 'y', ns={'G': 99}) == 1


# ------------------- 3. exec and module compilation now agree, shape by shape

class MPlain:
    a = 5
    b = a + 1


class MIter:
    items = [1, 2]
    y = [x for x in items]


def exec_agrees_with_module_compilation():
    """The point of the fix: the same source answers the same thing whether the
    class body is compiled into a module class or into a doit.  The module-side
    values come from the real module-compiled classes above (this file IS a
    module), so the comparison stays honest even where Grail deviates from
    CPython.  They are at module level deliberately — a method-local class has
    its own separate constraints in Grail and would confuse the comparison.

    Only the two shapes a MODULE-compiled class actually handles are compared.
    The lambda-in-comprehension shape is deliberately absent: written as a
    module-level class,

        class MLambda:
            items = [(lambda: i) for i in range(5)]
            y = [x() for x in items]

    raises ``NameError: name 'i' is not defined`` at import — the comprehension
    target is not kept alive as a cell for the lambda in a class body.  The
    exec'd form now answers [4, 4, 4, 4, 4] correctly (see
    lambda_in_a_comprehension_reads_a_sibling), so exec is currently AHEAD of
    module compilation on that shape.  A separate pre-existing gap; asserting
    equivalence on it would mean asserting the module path's bug.
    """

    pairs = [
        (MPlain.b, _exec_class('    a = 5\n    b = a + 1\n', 'b')),
        (MIter.y, _exec_class('    items = [1, 2]\n'
                              '    y = [x for x in items]\n', 'y')),
    ]
    bad = ['module %r != exec %r' % (m, e) for m, e in pairs if m != e]
    return bad or True


RESULTS = {
    'plain_sibling': plain_sibling_attribute_read(),
    'outermost_iterable': comprehension_outermost_iterable_reads_a_sibling(),
    'lambda_in_comprehension': lambda_in_a_comprehension_reads_a_sibling(),
    'nested_comprehension': nested_comprehension_over_a_sibling(),
    'sibling_method': sibling_method_reference(),
    'nested_class': nested_class_sibling_reference(),
    'reads_exec_global': class_body_still_reads_an_exec_global(),
    'attr_shadows_global': class_attribute_shadows_an_exec_global(),
    'exec_matches_module': exec_agrees_with_module_compilation(),
}


# scripts/check_python_fixtures.sh runs this under CPython in CI.
if __name__ == '__main__':
    checks = [
        plain_sibling_attribute_read,
        comprehension_outermost_iterable_reads_a_sibling,
        lambda_in_a_comprehension_reads_a_sibling,
        nested_comprehension_over_a_sibling,
        sibling_method_reference,
        nested_class_sibling_reference,
        class_body_still_reads_an_exec_global,
        class_attribute_shadows_an_exec_global,
        exec_agrees_with_module_compilation,
    ]
    for fn in checks:
        print('%-4s %s' % ('OK' if fn() is True else 'FAIL', fn.__name__))
