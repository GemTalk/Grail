"""Fixture: a class NESTED in the body of a method-local class (plan P3.4).

On the IR arm a ``class`` statement inside a def is built by a helper method of
its own -- CPython's class-body frame.  Since P3.4 a class nested in such a
body is built through IR too, by a helper of its own: its header (decorators,
bases, keywords) is evaluated in the OUTER class body, and its body is a frame
named for it.  Every expectation is CPython 3.14's, verified by running this
file directly; the IR helper, the text helper (``GRAIL_IR_CLASS_HELPER=0``)
and the text arm (``GRAIL_IR_CODEGEN=0``) all agree with it.

* ``simple``: a nested class is an attribute of the outer one, with the
  dotted ``__qualname__``.
* ``doubly``: a class nested two deep.
* ``enclosing``: a nested body and its methods read the enclosing function's
  locals, not the outer class's attributes.
* ``base``: a base the outer body bound, and one from the enclosing function.
* ``decorated``: a class decorator and a keyword read the outer body.
* ``methods``: the nested class's methods, a property, a classmethod.
* ``attr_store``: ``Inner.x = v`` after the nested class (test_property's
  ``cls.foo = property()``).
* ``order``: the nested class is built at its own position: a statement after
  it sees it, one before it does not.
* ``enum``: a nested Enum (test_enum's ``Outer``).
* ``statements``: a nested class whose body has control flow.
* ``raises``: an error in the nested body propagates out of the outer class
  statement, and the outer class is not bound.
"""

import enum

r = {}

label = 'module-label'


def record(key, fn):
    try:
        r[key] = fn()
    except Exception as exc:
        r[key] = '%s: %s' % (type(exc).__name__, exc)


def simple():
    class Outer:
        class Inner:
            v = 1
    return Outer.Inner.v, Outer.Inner.__qualname__, Outer.Inner.__name__


def doubly():
    class A:
        class B:
            class C:
                w = 'deep'
    return A.B.C.w, A.B.C.__qualname__


def enclosing():
    label = 'local-label'
    k = 3

    class Outer:
        label = 'outer-label'

        class Inner:
            seen = label
            twice = k * 2

            def m(self):
                return label, k
    return Outer.Inner.seen, Outer.Inner.twice, Outer.Inner().m()


def base():
    class Mixin:
        def hello(self):
            return 'mixin'

    class Outer:
        Base = dict

        class Inner(Base, Mixin):
            pass
    return issubclass(Outer.Inner, dict), Outer.Inner().hello()


def decorated():
    seen = []

    def deco(cls):
        seen.append(cls.__name__)
        cls.decorated = True
        return cls

    class Meta(type):
        def __new__(mcls, name, bases, ns, **kw):
            ns['kw'] = kw
            return super().__new__(mcls, name, bases, ns)

    class Outer:
        tag = 'T'

        @deco
        class Inner(metaclass=Meta, flavor=tag):
            pass
    return seen, Outer.Inner.decorated, Outer.Inner.kw, type(Outer.Inner).__name__


def methods():
    class Outer:
        class Inner:
            def __init__(self, v):
                self.v = v

            @property
            def double(self):
                return self.v * 2

            @classmethod
            def make(cls):
                return cls(5)
    return Outer.Inner(3).double, Outer.Inner.make().v


def attr_store():
    class Outer:
        class Inner:
            pass
        Inner.x = 'stored'
        Inner.prop = property(lambda self: 'p')
    return Outer.Inner.x, Outer.Inner().prop


def order():
    class Outer:
        try:
            Inner
            before = True
        except NameError:
            before = False

        class Inner:
            pass
        after = Inner.__name__
    return Outer.before, Outer.after


def enum_nested():
    class Outer:
        a = 1
        b = 2

        class Inner(enum.Enum):
            foo = 10
            bar = 11
    return [m.name for m in Outer.Inner], Outer.Inner.foo.value, Outer.a


def statements():
    class Outer:
        class Inner:
            total = 0
            for i in range(3):
                total += i
            if total > 2:
                big = True
    return Outer.Inner.total, Outer.Inner.big


def raises():
    Outer = 'unbound'
    try:
        class Outer:
            class Inner:
                w = 1 // 0
    except ZeroDivisionError as e:
        return Outer, type(e).__name__


record('simple', simple)
record('doubly', doubly)
record('enclosing', enclosing)
record('base', base)
record('decorated', decorated)
record('methods', methods)
record('attr_store', attr_store)
record('order', order)
record('enum', enum_nested)
record('statements', statements)
record('raises', raises)


EXPECTED = {
    'simple': (1, 'simple.<locals>.Outer.Inner', 'Inner'),
    'doubly': ('deep', 'doubly.<locals>.A.B.C'),
    'enclosing': ('local-label', 6, ('local-label', 3)),
    'base': (True, 'mixin'),
    'decorated': (['Inner'], True, {'flavor': 'T'}, 'Meta'),
    'methods': (6, 5),
    'attr_store': ('stored', 'p'),
    'order': (False, 'Inner'),
    'enum': (['foo', 'bar'], 10, 1),
    'statements': (3, True),
    'raises': ('unbound', 'ZeroDivisionError'),
}


KEYS = sorted(EXPECTED)


if __name__ == '__main__':
    for key in KEYS:
        print('%-5s %-24s -> %r' % ('OK' if r[key] == EXPECTED[key] else 'FAIL', key, r[key]))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-5s %-24s is not in EXPECTED' % ('FAIL', extra))
