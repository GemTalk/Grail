"""Fixture: a lambda's DEFAULT values in a class body read the class namespace
(#2293).

A lambda's defaults are evaluated where the lambda is written, so in a class
body they are class-body reads and see the class's attributes; only the
lambda's BODY is a scope of its own, which skips the class.  Grail read every
name in a lambda, defaults included, as a body read.  Every expectation is
CPython 3.14's, verified by running this file directly; the IR arm and the text
arm (``GRAIL_IR_CODEGEN=0``) both agree with it.

* ``module_class``: positional and keyword-only defaults, a default handed to
  an inner lambda's default, and the body read as the control.
* ``method_local``: the same in a class inside a def.
* ``shadow_local``: a class inside a def that binds the same name itself: the
  default is the class's, the body the def's.
* ``method_local_more``: in a class inside a def, a default reading the def's
  own variable, the comprehension pair, a class-body ``if`` and a nested
  class.
* ``comprehension``: a lambda in a class-body comprehension's element is
  inside the comprehension's scope and skips the class; one in its first
  iterable is a class-body read.
* ``statements``: a lambda in a class-body ``if`` and ``for``.
* ``nested_class``: a nested class's lambda default sees the nested class's
  namespace, not the outer class's.
* ``sibling_method``: a default naming a def the body binds.
* ``param_shadow``: a parameter named like the class attribute: its default
  is the class's, its body the parameter.
* ``class_only``: a default naming something only the class binds (no module
  global) -- not a NameError; in a method-local class too.
* ``bound_later``: a default naming a class attribute bound only after the
  lambda reads the module's.
* ``inner_body``: a lambda inside another lambda's BODY is in that scope, so
  its default skips the class.
* ``def_default``: a lambda in a def's default, and in a decorator, is
  evaluated in the class body.
* ``dynamic``: a default naming a name bound through ``locals()``.
"""

r = {}


def record(key, fn):
    try:
        r[key] = fn()
    except Exception as exc:
        r[key] = '%s: %s' % (type(exc).__name__, exc)


label = 'module'
late = 'module'


def module_class():
    class M:
        label = 'class'
        g = staticmethod(lambda v=label: v)
        kw = staticmethod(lambda *, v=label: v)
        body = staticmethod(lambda: label)
        nested = staticmethod(lambda v=label: (lambda w=v: w)())
    return M.g(), M.kw(), M.body(), M.nested()


class Module:
    label = 'class'
    g = staticmethod(lambda v=label: v)
    kw = staticmethod(lambda *, v=label: v)
    body = staticmethod(lambda: label)
    nested = staticmethod(lambda v=label: (lambda w=v: w)())


def method_local():
    class C:
        label = 'class'
        g = staticmethod(lambda v=label: v)
        kw = staticmethod(lambda *, v=label: v)
        body = staticmethod(lambda: label)
    return C.g(), C.kw(), C.body()


def shadow_local():
    label = 'local'

    class C:
        label = 'class'
        g = staticmethod(lambda v=label: v)
        body = staticmethod(lambda: label)
    return C.g(), C.body()


def method_local_more():
    enclosing = 'enclosing'

    class C:
        label = 'class'
        captured = staticmethod(lambda v=enclosing: v)
        element = [(lambda v=label: v)() for _ in range(1)]
        first_iter = [f() for f in [lambda v=label: v]]
        if label:
            g = staticmethod(lambda v=label, w=enclosing: (v, w))

        class Inner:
            label = 'inner'
            h = staticmethod(lambda v=label: v)
    return C.captured(), C.element, C.first_iter, C.g(), C.Inner.h()


class Comprehension:
    label = 'class'
    element = [(lambda v=label: v)() for _ in range(1)]
    first_iter = [f() for f in [lambda v=label: v]]
    gen_first_iter = list(f() for f in [lambda v=label: v])


class Statements:
    label = 'class'
    if label:
        g = staticmethod(lambda v=label: v)
    for i in range(2):
        label = 'class%d' % i
    h = staticmethod(lambda v=label, i=i: (v, i))
    for j in range(1):
        k = staticmethod(lambda v=label, j=j: (v, j))
    del i, j


class Outer:
    label = 'outer'
    other = 'outer-only'

    class Inner:
        label = 'inner'
        g = staticmethod(lambda v=label: v)
        missing = staticmethod(lambda: other)


def nested_class():
    try:
        missing = Outer.Inner.missing()
    except NameError:
        missing = 'NameError'
    return Outer.Inner.g(), missing


class Sibling:
    def m(self):
        return 'm'
    g = staticmethod(lambda fn=m: fn(None))


class ParamShadow:
    label = 'class'
    g = staticmethod(lambda label=label: label)
    h = staticmethod(lambda label='param': label)


class ClassOnly:
    only = 'only'
    g = staticmethod(lambda v=only: v)


def class_only_local():
    class C:
        only = 'only-local'
        g = staticmethod(lambda v=only: v)
    return C.g()


class BoundLater:
    g = staticmethod(lambda v=late: v)
    late = 'class'
    h = staticmethod(lambda v=late: v)


class InnerBody:
    label = 'class'
    g = staticmethod(lambda: (lambda v=label: v)())


def decorate(v):
    def wrap(fn):
        fn.tag = v
        return fn
    return wrap


class DefDefault:
    label = 'class'

    def m(self, f=lambda v=label: v):
        return f()

    @(lambda fn, v=label: decorate(v)(fn))
    def d(self):
        return 'd'


class Dynamic:
    locals()['dyn'] = 'dynamic'
    g = staticmethod(lambda v=dyn: v)


record('module_class', lambda: (module_class(), (Module.g(), Module.kw(),
                                                  Module.body(), Module.nested())))
record('method_local', method_local)
record('shadow_local', shadow_local)
record('method_local_more', method_local_more)
record('comprehension', lambda: (Comprehension.element, Comprehension.first_iter,
                                  Comprehension.gen_first_iter))
record('statements', lambda: (Statements.g(), Statements.h(), Statements.k()))
record('nested_class', nested_class)
record('sibling_method', lambda: Sibling.g())
record('param_shadow', lambda: (ParamShadow.g(), ParamShadow.h()))
record('class_only', lambda: (ClassOnly.g(), class_only_local()))
record('bound_later', lambda: (BoundLater.g(), BoundLater.h()))
record('inner_body', lambda: InnerBody.g())
record('def_default', lambda: (DefDefault().m(), DefDefault.d.tag))
record('dynamic', lambda: Dynamic.g())


EXPECTED = {
    'module_class': (('class', 'class', 'module', 'class'),
                     ('class', 'class', 'module', 'class')),
    'method_local': ('class', 'class', 'module'),
    'shadow_local': ('class', 'local'),
    'method_local_more': ('enclosing', ['module'], ['class'], ('class', 'enclosing'), 'inner'),
    'comprehension': (['module'], ['class'], ['class']),
    'statements': ('class', ('class1', 1), ('class1', 0)),
    'nested_class': ('inner', 'NameError'),
    'sibling_method': 'm',
    'param_shadow': ('class', 'param'),
    'class_only': ('only', 'only-local'),
    'bound_later': ('module', 'class'),
    'inner_body': 'module',
    'def_default': ('class', 'class'),
    'dynamic': 'dynamic',
}


KEYS = sorted(EXPECTED)


if __name__ == '__main__':
    for key in KEYS:
        print('%-5s %-16s -> %r' % ('OK' if r[key] == EXPECTED[key] else 'FAIL', key, r[key]))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-5s %-16s is not in EXPECTED' % ('FAIL', extra))
