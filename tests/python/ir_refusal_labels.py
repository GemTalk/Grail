"""Fixture: shapes beside the IR refusal rows that P1.3 relabelled or retired.

Plan item P1.3 turned the refusal reasons that only a broken parser or
compile-context invariant can produce into ``invariant:...'' rows, deleted the
ones nothing can reach, and renamed rows whose label named the wrong cause.
IRRefusalLabelsTestCase imports this file with the IR seam forced on and
asserts that the EXPECTED values agree with CPython 3.14 (run this file
directly), that each XFAIL key still gives Grail's recorded answer, and that
the census names the relabelled rows under their new names and no
``invariant:'' row at all.

Every shape is reached through a top-level function or a method, because a
module body is still text and would prove nothing.
"""

r = {}


def record(key, fn):
    try:
        r[key] = repr(fn())
    except Exception as exc:
        r[key] = '%s: %s' % (type(exc).__name__, exc)


# --- LambdaAst:awaitInGenexp (was LambdaAst:yield) -----------------------------
# The row's condition is "an await and no yield".  A bare await in a lambda is
# a SyntaxError, so what reaches it is an ASYNC generator expression in the
# body -- valid Python, and still refused, because IR has no async generator
# expression.  The await makes the GENEXP asynchronous, not the lambda: the
# text built a plain generator around the body until #2231.

class Ready:
    def __init__(self, v):
        self.v = v

    def __await__(self):
        return self.v
        yield


def drain(agen):
    out = []
    while True:
        try:
            agen.__anext__().send(None)
        except StopIteration as e:
            out.append(e.value)
        except StopAsyncIteration:
            return out


def lambda_async_genexp():
    f = lambda ys: (await y for y in ys)
    return type(f([])).__name__


def lambda_async_genexp_runs():
    f = lambda ys: (await y for y in ys)
    return drain(f([Ready(1), Ready(2)]))


def lambda_generator_still_a_generator():
    f = lambda: (yield 1)
    g = lambda ys: (y for y in ys)
    return type(f()).__name__, list(f()), type(g([])).__name__


# --- nestedDef:decorator, split by cause -----------------------------------------
# A bare-name decorator of a nested def, read past a method-local class: the
# text reads it through the class cell (nestedDef:decorator-classCell).

def decorator_through_class_cell():
    tag = lambda fn: (lambda: 'tagged ' + fn())

    class K:
        def m(self):
            @tag
            def g():
                return 'g'
            return g()
    return K().m()


# A class attribute named from inside a method is not in scope there, so
# CPython raises NameError at the decoration.  Grail read the name as the
# class attribute it is in the class body, emitted a bare identifier nothing
# declares, and the whole method failed to compile (#2232; the census row was
# nestedDef:decorator-unresolvedName).  It is now the module's late lookup:
# globals, then builtins, then NameError.

class Holder:
    deco = staticmethod(lambda fn: fn)
    shared_deco = staticmethod(lambda fn: (lambda: 'class ' + fn()))

    def decorate_with_class_attribute(self):
        try:
            @deco
            def g():
                return 'g'
        except NameError as e:
            return type(e).__name__, str(e)
        return g()

    # The same name bound at module level too: the method reads the GLOBAL.
    def decorate_with_shadowed_global(self):
        @shared_deco
        def g():
            return 'g'
        return g()

    # Two defs down: the decorator still runs in a function scope.
    def decorate_two_defs_down(self):
        def inner():
            try:
                @deco
                def g():
                    return 'g'
            except NameError as e:
                return type(e).__name__, str(e)
            return g()
        return inner()


def shared_deco(fn):
    return lambda: 'global ' + fn()


# The same shape in a method of a method-local class.

def decorator_class_attribute_in_local_class():
    class K:
        deco = staticmethod(lambda fn: fn)
        shared_deco = staticmethod(lambda fn: (lambda: 'class ' + fn()))

        def m(self):
            try:
                @deco
                def g():
                    return 'g'
            except NameError as e:
                return type(e).__name__, str(e)
            return g()

        def n(self):
            @shared_deco
            def g():
                return 'g'
            return g()
    return K().m(), K().n()


# The class body itself DOES see its attributes: a class-body def decorated
# by one is unaffected.

class ClassBodyDecorated:
    deco = staticmethod(lambda fn: (lambda self: 'class-body ' + fn(self)))

    @deco
    def m(self):
        return 'm'


# --- CallAst:super-shadowed (deleted) ------------------------------------------
# A shadowed ``super'' is an ordinary call on both paths, and compiles.

def shadowed_super_call():
    class C:
        def m(self):
            super = lambda: 'mine'
            return super()
    return C().m()


# --- DeleteAst:name (now an invariant) -----------------------------------------
# Every ``del name'' spelling has an admitted branch, including a ``nonlocal''
# reached from a def nested in a method of a method-local class.

def del_nonlocal_past_a_class():
    x = 1

    class C:
        def m(self):
            def g():
                nonlocal x
                del x
            g()
    C().m()
    try:
        x
    except NameError as e:
        return type(e).__name__
    return 'bound'


# --- AugAssignAst:target-SubscriptAst-slice (deleted) -----------------------------
# A slice target has been admitted since cut 62.

def aug_assign_slice():
    xs = [1, 2, 3, 4]
    xs[1:3] += [9]
    return xs


record('lambda_async_genexp', lambda_async_genexp)
record('lambda_async_genexp_runs', lambda_async_genexp_runs)
record('lambda_generator_still_a_generator', lambda_generator_still_a_generator)
record('decorator_through_class_cell', decorator_through_class_cell)
record('decorator_class_attribute',
       lambda: Holder().decorate_with_class_attribute())
record('decorator_class_attribute_shadowed_global',
       lambda: Holder().decorate_with_shadowed_global())
record('decorator_class_attribute_two_defs_down',
       lambda: Holder().decorate_two_defs_down())
record('decorator_class_attribute_in_local_class',
       decorator_class_attribute_in_local_class)
record('decorator_class_attribute_in_class_body',
       lambda: ClassBodyDecorated().m())
record('shadowed_super_call', shadowed_super_call)
record('del_nonlocal_past_a_class', del_nonlocal_past_a_class)
record('aug_assign_slice', aug_assign_slice)


EXPECTED = {
    'lambda_async_genexp': "'async_generator'",
    'lambda_async_genexp_runs': '[1, 2]',
    'lambda_generator_still_a_generator': "('generator', [1], 'generator')",
    'decorator_through_class_cell': "'tagged g'",
    'decorator_class_attribute': '(\'NameError\', "name \'deco\' is not defined")',
    'decorator_class_attribute_shadowed_global': "'global g'",
    'decorator_class_attribute_two_defs_down':
        '(\'NameError\', "name \'deco\' is not defined")',
    'decorator_class_attribute_in_local_class':
        '((\'NameError\', "name \'deco\' is not defined"), \'global g\')',
    'decorator_class_attribute_in_class_body': "'class-body m'",
    'shadowed_super_call': "'mine'",
    'del_nonlocal_past_a_class': "'UnboundLocalError'",
    'aug_assign_slice': '[1, 2, 3, 9, 4]',
}

# Grail's answers, recorded so a fix shows up as an XPASS here.  None is left:
# #2231 and #2232 moved the last two shapes to EXPECTED.
XFAIL = {
}


if __name__ == '__main__':
    for key, expected in EXPECTED.items():
        actual = r[key]
        print('%-5s %-30s -> %r' % ('OK' if actual == expected else 'FAIL',
                                    key, actual))
    for key, grail in XFAIL.items():
        actual = r[key]
        print('%-5s %-30s -> %r' % ('XFAIL' if actual != grail else 'XPASS',
                                    key, actual))
    for extra in sorted(set(r) - set(EXPECTED) - set(XFAIL)):
        print('%-5s %-30s is in neither table' % ('FAIL', extra))
