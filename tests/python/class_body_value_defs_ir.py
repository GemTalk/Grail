"""Fixture: defs a method-local class body builds as VALUES, and PEP 695 in a
method-local class body (plan P3.5).

On the IR arm a ``class`` statement inside a def is built by a helper method of
its own -- CPython's class-body frame.  A def inside a class-body ``if`` is not
compiled as a method: whether it exists is a run-time fact, so the build makes
it as a function value and stores it on the class.  The parser puts a PEP 695
generic method's, class's or alias's type-parameter scope in such an ``if``
too, and that scope sees the class namespace.  Since P3.5 the helper builds all
of these through IR.  Every expectation is CPython 3.14's, verified by running
this file directly; the IR helper, the text helper (``GRAIL_IR_CLASS_HELPER=0``)
and the text arm (``GRAIL_IR_CODEGEN=0``) all agree with it.

* ``if_def``: a def in either branch, bound as a method, with CPython's
  ``__qualname__`` (test_urllib's ``FakeHTTPConnection``).
* ``if_def_decorated``: a decorated def in a branch.
* ``if_def_super``: zero-argument ``super()`` and ``__class__`` in a def in a
  branch.
* ``if_def_late``: a def in a branch reading an enclosing variable rebound
  after the class statement.
* ``type_alias``: ``type U = T`` reads the class's ``T``; a later class
  attribute store is seen when the alias is evaluated (test_type_params
  ``test_alias`` / ``test_modified_later``).
* ``generic_bound``: ``def foo[U: T]``, the bound read from the class
  namespace, lazily (``test_bound``, ``test_modified_later``).
* ``generic_super``: a generic method calling zero-argument ``super()``
  (``test_super``).
* ``generic_decorated``: a decorated generic method with a default
  (test_reprlib's ``test__type_params__``).
* ``generic_class``: a generic class nested in the body reads its own and the
  enclosing function's names (``test_typeparams_dunder_class_01``).
* ``generic_alias``: ``type TA1[B] = dict[A, B]`` in the body of a generic
  class (test_type_aliases ``test_alias_value_02``).
* ``class_in_value_def``: a class built inside a def built as a value -- a
  def in a branch, and a generic method -- reads its own class namespace
  (generic_method_scope.py's ``Host.method`` / ``Nested.deepest``).
* ``mangled``: private type parameters of a generic class (``test_mangling``).
"""

import functools

r = {}


def record(key, fn):
    try:
        r[key] = fn()
    except Exception as exc:
        r[key] = '%s: %s' % (type(exc).__name__, exc)


def if_def(flag):
    class C:
        if flag:
            def close(self):
                return 'closed'
        else:
            def close(self):
                return 'open'
    return C().close(), C.close.__qualname__, C.close.__name__


def if_def_decorated():
    class C:
        if True:
            @tag
            def name(self):
                return 'n'
    return C().name(), C.name.__name__


def if_def_super():
    class Base:
        def hi(self):
            return 'base'

    class C(Base):
        if True:
            def hi(self):
                return super().hi() + '+c'

            def who(self):
                return __class__.__name__
    return C().hi(), C().who()


def if_def_late():
    k = 'before'

    class C:
        if True:
            def get(self):
                return k
    k = 'after'
    return C().get()


def type_alias():
    class X:
        T = int
        type U = T
        type Alias = T
    first = X.U.__value__
    X.T = float
    return first, X.U.__name__, X.Alias.__value__


def generic_bound():
    class X:
        T = int

        def foo[U: T](self):
            return 'foo'
    (u,) = X.foo.__type_params__
    X.T = float
    return u.__name__, u.__bound__, X().foo()


def generic_super():
    class Base:
        def meth(self):
            return 'base'

    class Child(Base):
        def meth[T](self, arg: int) -> T:
            return super().meth() + 'child'
    return Child().meth(1), Child.meth.__type_params__[0].__name__


def tag(fn):
    @functools.wraps(fn)
    def wrapper(*a, **kw):
        return 'tagged:' + fn(*a, **kw)
    return wrapper


def generic_decorated():
    class My:
        @tag
        def show[T: str](self, default: T = '') -> str:
            return default
    (t,) = My.show.__type_params__
    return My().show(), My().show('x'), t.__name__, t.__bound__


def generic_class():
    outer = 'enclosing'

    class Outer:
        class Inner[C, D]:
            @staticmethod
            def get():
                return C, D, outer
    c, d, o = Outer.Inner.get()
    return (c.__name__, d.__name__, o, Outer.Inner.__qualname__,
            Outer.Inner.__type_params__ == (c, d))


def generic_alias():
    class Parent[A]:
        type TA1[B] = dict[A, B]
    (a,) = Parent.__type_params__
    (b,) = Parent.TA1.__type_params__
    return Parent.TA1.__name__, a.__name__, b.__name__, Parent.TA1.__value__ == dict[a, b]


def class_in_value_def():
    class Host:
        if True:
            def make(self):
                class Nested:
                    if True:
                        def f(self):
                            return 'nested'
                    g = f
                return Nested

        def generic[B](self):
            class Inner:
                def deepest[D](self):
                    return 'deepest'
            return Inner
    return Host().make()().g(), Host().generic()().deepest()


def mangled():
    class Foo[__T]:
        param = __T

        def meth[__U](self, arg: __T, arg2: __U):
            return (__T, __U)
    t = Foo.__type_params__[0]
    u = Foo.meth.__type_params__[0]
    return t.__name__, u.__name__, Foo().meth(1, 2) == (t, u), Foo.param is t


record('if_def_true', lambda: if_def(True))
record('if_def_false', lambda: if_def(False))
record('if_def_decorated', if_def_decorated)
record('if_def_super', if_def_super)
record('if_def_late', if_def_late)
record('type_alias', type_alias)
record('generic_bound', generic_bound)
record('generic_super', generic_super)
record('generic_decorated', generic_decorated)
record('generic_class', generic_class)
record('generic_alias', generic_alias)
record('class_in_value_def', class_in_value_def)
record('mangled', mangled)


EXPECTED = {
    'if_def_true': ('closed', 'if_def.<locals>.C.close', 'close'),
    'if_def_false': ('open', 'if_def.<locals>.C.close', 'close'),
    'if_def_decorated': ('tagged:n', 'name'),
    'if_def_super': ('base+c', 'C'),
    'if_def_late': 'after',
    'type_alias': (int, 'U', float),
    'generic_bound': ('U', float, 'foo'),
    'generic_super': ('basechild', 'T'),
    'generic_decorated': ('tagged:', 'tagged:x', 'T', str),
    'generic_class': ('C', 'D', 'enclosing', 'generic_class.<locals>.Outer.Inner', True),
    'generic_alias': ('TA1', 'A', 'B', True),
    'class_in_value_def': ('nested', 'deepest'),
    'mangled': ('__T', '__U', True, True),
}


KEYS = sorted(EXPECTED)


if __name__ == '__main__':
    for key in KEYS:
        print('%-5s %-24s -> %r' % ('OK' if r[key] == EXPECTED[key] else 'FAIL', key, r[key]))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-5s %-24s is not in EXPECTED' % ('FAIL', extra))
