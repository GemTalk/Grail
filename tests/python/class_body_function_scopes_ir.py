"""Fixture: LAMBDAS, COMPREHENSIONS and ``__class__`` in the body of a
method-local class (plan P3.3c).

On the IR arm a ``class`` statement inside a def is built by a helper method of
its own -- CPython's class-body frame.  Since P3.3c that helper is built
through IR when a class-body value, an annotated value, a method default or a
method decorator holds a lambda, a comprehension or a generator expression.
Each is a scope of its own, and CPython skips the class namespace when one
resolves a free name: it reads the enclosing function, the module and the
builtins -- except a comprehension's FIRST iterable, which is evaluated in the
class body itself.  Every expectation is CPython 3.14's, verified by running
this file directly; the IR helper, the text helper
(``GRAIL_IR_CLASS_HELPER=0``) and the text arm (``GRAIL_IR_CODEGEN=0``) all
agree with it.

* ``lambda_value``: a lambda as a class attribute and inside a property.
* ``lambda_scope``: a lambda's free names skip the class -- a class attribute
  named like a module global -- and reach the enclosing function's locals.
* ``lambda_names``: a class-body lambda's ``__name__`` and ``__qualname__``.
* ``annotate``: a hand-written ``__annotate__`` lambda.
* ``annotated``: an annotated lambda value, and a dataclass field's
  ``default_factory``.
* ``listcomp``: the first iterable reads the class body, the element skips
  it; the iteration variable does not leak into the class.
* ``comps``: set and dict comprehensions, a generator expression consumed in
  the body, a nested comprehension.
* ``closures``: lambdas made in a comprehension share its variable.
* ``default``: a method default that is a lambda.
* ``decorator``: a lambda as a method decorator, and a decorator expression
  holding a comprehension.
* ``class_cell``: ``__class__`` read in the class body, and in a
  comprehension there, is the ENCLOSING class's cell -- the class whose
  method holds the class statement -- and a NameError with none.
"""

import dataclasses
import typing

r = {}

y = 'module-y'
label = 'module-label'


def lambda_value():
    class C:
        double = staticmethod(lambda v: 2 * v)
        a_prop = property(lambda self: 'foo')
        boom = property(lambda self: 1 / 0)
    try:
        C().boom
        raised = None
    except ZeroDivisionError as e:
        raised = type(e).__name__
    return C.double(4), C().a_prop, raised


def lambda_scope():
    k = 'local'

    class C:
        label = 'class-label'
        reads_module = staticmethod(lambda: label)
        reads_local = staticmethod(lambda: k)
    return C.reads_module(), C.reads_local()


def lambda_names():
    class C:
        f = lambda self: 1
    return C.f.__name__, C.f.__qualname__


def annotate():
    class C:
        __annotate__ = lambda format: {'what': int}
    return C.__annotations__, type(C.__annotate__).__name__


def annotated():
    @dataclasses.dataclass
    class D:
        tags: list = dataclasses.field(default_factory=lambda: ['t'])
        n: int = 0

    class A:
        bar: typing.Callable[[int], int] = lambda arg: arg + 1
    return D().tags, D().tags is not D().tags, A.bar(1)


def listcomp():
    class C:
        y = 'class-y'
        items = [1, 2, 3]
        doubled = [i * 2 for i in items]
        pairs = [(x, y) for x in range(2)]
    return C.doubled, C.pairs, 'i' in C.__dict__, 'x' in C.__dict__


def comps():
    class C:
        items = (3, 1, 2)
        s = {i % 2 for i in items}
        d = {i: str(i) for i in items}
        total = sum(i for i in items)
        grid = [[a * b for b in range(3)] for a in range(2)]
    return sorted(C.s), C.d, C.total, C.grid


def closures():
    class C:
        items = [(lambda: i) for i in range(5)]
        y = [x() for x in items]
    return C.y


def default():
    class C:
        def m(self, k=lambda: 'kay'):
            return k()
    return C().m(), C().m(lambda: 'other')


def tag(value):
    def deco(fn):
        fn.tagged = value
        return fn
    return deco


def decorator():
    class C:
        @(lambda fn: fn)
        def a(self):
            return 'a'

        @tag([n * n for n in range(3)])
        def b(self):
            pass
    return C().a(), C.b.tagged


class Outer:
    def method(self):
        class X:
            x = __class__
            in_comp = [__class__ for _ in range(1)]
        return X.x is Outer, X.in_comp[0] is Outer


def class_cell():
    try:
        class X:
            x = __class__
        missing = None
    except NameError as e:
        missing = str(e)
    return Outer().method(), missing


r['lambda_value'] = lambda_value()
r['lambda_scope'] = lambda_scope()
r['lambda_names'] = lambda_names()
r['annotate'] = annotate()
r['annotated'] = annotated()
r['listcomp'] = listcomp()
r['comps'] = comps()
r['closures'] = closures()
r['default'] = default()
r['decorator'] = decorator()
r['class_cell'] = class_cell()


EXPECTED = {
    'lambda_value': (8, 'foo', 'ZeroDivisionError'),
    'lambda_scope': ('module-label', 'local'),
    'lambda_names': ('<lambda>', 'lambda_names.<locals>.C.<lambda>'),
    'annotate': ({'what': int}, 'function'),
    'annotated': (['t'], True, 2),
    'listcomp': ([2, 4, 6], [(0, 'module-y'), (1, 'module-y')], False, False),
    'comps': ([0, 1], {3: '3', 1: '1', 2: '2'}, 6, [[0, 0, 0], [0, 1, 2]]),
    'closures': [4, 4, 4, 4, 4],
    'default': ('kay', 'other'),
    'decorator': ('a', [0, 1, 4]),
    'class_cell': ((True, True), "name '__class__' is not defined"),
}


KEYS = sorted(EXPECTED)


if __name__ == '__main__':
    for key in KEYS:
        print('%-5s %-24s -> %r' % ('OK' if r[key] == EXPECTED[key] else 'FAIL', key, r[key]))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-5s %-24s is not in EXPECTED' % ('FAIL', extra))
