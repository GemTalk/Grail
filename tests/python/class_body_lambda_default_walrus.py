"""Fixture: a walrus in a lambda's DEFAULT in a class body binds a class
attribute (#2345).

A lambda's defaults are evaluated where the lambda is written, so in a class
body a walrus there binds in the class namespace, exactly as one in a plain
class-body expression does.  Only the lambda's BODY is a scope of its own,
which skips the class.  Grail treated the whole lambda as the walrus's scope
and emitted a bare store into the class build, where no temp exists: the whole
module failed to compile (``undefined symbol w''), uncatchably.  Every
expectation is CPython 3.14's, verified by running this file directly; the IR
arm and the text arm (``GRAIL_IR_CODEGEN=0``) both agree with it.

* ``module_class``: positional and keyword-only defaults, a walrus in an
  inner lambda's default inside an outer lambda's default, a later class-body
  read of the name, and a walrus that never runs (``False and ...``).
* ``method_local``: the same in a class inside a def; the def's own ``w`` is
  untouched.
* ``statements``: a class-body ``if``, ``for`` and ``try``.
* ``def_default``: a lambda in a def's default, a walrus directly in a def's
  default, and one in a def's decorator.
* ``method_local_def``: a lambda in a def's default, in a class inside a def.
* ``lambda_body``: a walrus in the lambda's BODY binds in the lambda, not the
  class -- in the class body itself and in a class-body ``for`` and ``with``.
* ``inner_body``: a walrus in the default of a lambda inside another lambda's
  BODY binds in that outer lambda.
* ``body_reads``: the lambda's body cannot read the name back: it skips the
  class, so it is a NameError, or the module's binding when there is one.
* ``declared``: under ``global w`` or ``nonlocal w`` in the class body the
  walrus rebinds that binding and the class gets no attribute.
* ``nested_class``: a nested class's lambda binds in the nested class.
* ``syntax_errors``: a walrus in a comprehension in a lambda's or def's
  default, or in a lambda's default in a comprehension, is the class-body
  comprehension SyntaxError, as CPython raises it at compile time.
"""

import contextlib

r = {}


def record(key, fn):
    try:
        r[key] = fn()
    except Exception as exc:
        r[key] = '%s: %s' % (type(exc).__name__, exc)


label = 'module'


class Module:
    label = 'class'
    g = staticmethod(lambda v=(w := label): v)
    kw = staticmethod(lambda *, v=(k := label + '-kw'): v)
    nested = staticmethod(lambda f=(lambda v=(n := label + '-nested'): v): f())
    later = w + '!'
    never = staticmethod(lambda v=(False and (unbound := label)): v)


def module_class():
    return (Module.g(), Module.w, Module.kw(), Module.k, Module.nested(),
            Module.n, Module.later, Module.never(), hasattr(Module, 'unbound'))


def method_local():
    w = 'fn'

    class C:
        label = 'class'
        g = staticmethod(lambda v=(w := label): v)
        kw = staticmethod(lambda *, v=(k := label + '-kw'): v)
        nested = staticmethod(lambda f=(lambda v=(n := label + '-nested'): v): f())
        later = w + '!'
    return C.g(), C.w, C.kw(), C.k, C.nested(), C.n, C.later, w


class Statements:
    label = 'class'
    if True:
        g = staticmethod(lambda v=(i := label + '-if'): v)
    for step in range(2):
        h = staticmethod(lambda v=(f := label + str(step)): v)
    try:
        t = staticmethod(lambda v=(tw := label + '-try'): v)
    finally:
        pass


def method_local_statements():
    class C:
        label = 'class'
        if True:
            g = staticmethod(lambda v=(i := label + '-if'): v)
        for step in range(2):
            h = staticmethod(lambda v=(f := label + str(step)): v)
    return C.g(), C.i, C.h(), C.f


class DefDefault:
    label = 'class'

    def m(self, f=lambda v=(w := label): v):
        return f()

    def d(self, v=(dw := label + '-def')):
        return v

    @(deco := staticmethod)
    def s():
        return 's'


def method_local_def():
    class C:
        label = 'class'

        def m(self, f=lambda v=(w := label): v):
            return f()

        def d(self, v=(dw := label + '-def')):
            return v
    return C().m(), C.w, C().d(), C.dw


class LambdaBody:
    label = 'class'
    g = staticmethod(lambda: (b := 'body'))
    for step in range(1):
        h = staticmethod(lambda: (fb := 'for-body'))
    with contextlib.nullcontext():
        k = staticmethod(lambda: (wb := 'with-body'))


class InnerBody:
    g = staticmethod(lambda: ((lambda v=(ib := 'inner'): v)(), ib))


class BodyReads:
    label = 'class'
    g = staticmethod(lambda v=(nothing_else := label): (v, nothing_else))
    h = staticmethod(lambda v=(label := 'rebound'): (v, label))


class Declared:
    global gw
    label = 'class'
    g = staticmethod(lambda v=(gw := label): v)


def declared_nonlocal():
    nw = 'fn'

    class C:
        nonlocal nw
        label = 'class'
        g = staticmethod(lambda v=(nw := label): v)
    return C.g(), nw, hasattr(C, 'nw')


class Outer:
    label = 'outer'

    class Inner:
        label = 'inner'
        g = staticmethod(lambda v=(w := label): v)


def syntax_error(src):
    # exec, not compile(): Grail raises this SyntaxError when it generates
    # code, and its compile() does not (a separate gap).
    try:
        exec(src, {})
    except SyntaxError as exc:
        return exc.msg
    return 'compiled'


def syntax_errors():
    return (
        syntax_error('class C:\n    g = lambda v=[(w := x) for x in "ab"]: v\n'),
        syntax_error('class C:\n    gs = [lambda v=(w := x): v for x in "ab"]\n'),
        syntax_error('class C:\n    def m(self, v=[(w := x) for x in "ab"]): pass\n'),
        syntax_error('def f():\n    class C:\n        g = lambda v=[(w := x) for x in "ab"]: v\n'),
        # The lambda's BODY is a function scope, so this one is legal.
        syntax_error('class C:\n    g = lambda: [(w := x) for x in "ab"]\n'),
    )


record('module_class', module_class)
record('method_local', method_local)
record('statements', lambda: ((Statements.g(), Statements.i, Statements.h(),
                               Statements.f, Statements.t(), Statements.tw),
                              method_local_statements()))
record('def_default', lambda: (DefDefault().m(), DefDefault.w, DefDefault().d(),
                               DefDefault.dw, DefDefault.s(),
                               DefDefault.deco is staticmethod))
record('method_local_def', method_local_def)
record('lambda_body', lambda: (LambdaBody.g(), hasattr(LambdaBody, 'b'),
                               LambdaBody.h(), hasattr(LambdaBody, 'fb'),
                               LambdaBody.k(), hasattr(LambdaBody, 'wb')))
record('inner_body', lambda: (InnerBody.g(), hasattr(InnerBody, 'ib')))
record('body_reads', lambda: (BodyReads.nothing_else, BodyReads.label))
record('body_reads_error', lambda: BodyReads.g())
record('body_reads_module', lambda: BodyReads.h())
record('declared', lambda: ((Declared.g(), gw, hasattr(Declared, 'gw')),
                            declared_nonlocal()))
record('nested_class', lambda: (Outer.Inner.g(), Outer.Inner.w, hasattr(Outer, 'w')))
record('syntax_errors', syntax_errors)


COMP = 'assignment expression within a comprehension cannot be used in a class body'

EXPECTED = {
    'module_class': ('class', 'class', 'class-kw', 'class-kw', 'class-nested',
                     'class-nested', 'class!', False, False),
    'method_local': ('class', 'class', 'class-kw', 'class-kw', 'class-nested',
                     'class-nested', 'class!', 'fn'),
    'statements': (('class-if', 'class-if', 'class1', 'class1', 'class-try', 'class-try'),
                   ('class-if', 'class-if', 'class1', 'class1')),
    'def_default': ('class', 'class', 'class-def', 'class-def', 's', True),
    'method_local_def': ('class', 'class', 'class-def', 'class-def'),
    'lambda_body': ('body', False, 'for-body', False, 'with-body', False),
    'inner_body': (('inner', 'inner'), False),
    'body_reads': ('class', 'rebound'),
    'body_reads_error': "NameError: name 'nothing_else' is not defined",
    'body_reads_module': ('rebound', 'module'),
    'declared': (('class', 'class', False), ('class', 'class', False)),
    'nested_class': ('inner', 'inner', False),
    'syntax_errors': (COMP, COMP, COMP, COMP, 'compiled'),
}


KEYS = sorted(EXPECTED)


if __name__ == '__main__':
    for key in KEYS:
        print('%-5s %-18s -> %r' % ('OK' if r[key] == EXPECTED[key] else 'FAIL', key, r[key]))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-5s %-18s is not in EXPECTED' % ('FAIL', extra))
