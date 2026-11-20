"""Fixture: METHOD DECORATORS in method-local classes (plan P3.3c).

On the IR arm a ``class`` statement inside a def is built by a helper method of
its own -- CPython's class-body frame.  Since P3.3c that helper is built
through IR for a body with decorated methods too.  The decorators are applied
by the same walk either way, and a name in a decorator expression is read by
the description the text helper shares: a name the class body binds off the
class, anything else as the enclosing scopes read it.  Every expectation is
CPython 3.14's, verified by running this file directly; the IR helper, the
text helper (``GRAIL_IR_CLASS_HELPER=0``) and the text arm
(``GRAIL_IR_CODEGEN=0``) all agree with it.

* ``module_deco``: a bare decorator that is a module global, and one reached
  through a module attribute.
* ``enclosing_local``: decorators that are locals of the enclosing def, bare
  and called, read when the class statement runs.
* ``class_body_names``: a decorator expression reads a flag the class body
  computed, a class attribute that shadows a module global, and a sibling
  def used bare as the decorator.
* ``own_name``: a decorator named like the def it decorates reads the
  enclosing binding, not the def (CPython evaluates it first).
* ``register``: ``@f.register(int)`` on a sibling ``singledispatchmethod``.
* ``order``: decorator expressions are evaluated top-down, applied bottom-up,
  between the class-body statements around the def.
* ``alias_after``: a later statement reads the DECORATED def.
* ``declarative``: decorators around ``@classmethod`` / ``@staticmethod``,
  inside and outside them.
* ``properties``: a decorated property getter, a setter, and an abstract
  property marked by ``@abstractmethod``.
* ``wraps``: a ``functools.wraps`` wrapper keeps the method's name and binds
  as a method.
* ``cells``: a decorator closing over an enclosing local reads its value when
  the class is built; the method reads it at call time.
* ``skip``: ``unittest.skipIf`` over a class-body condition.
* ``raises``: a decorator that raises propagates out of the class statement.
* ``lines``: the frame ``sys._getframe(1)`` is inside a decorator -- bare,
  called, and the outer and inner of two: the class body's, at the
  decorator's own line.  Only the IR helper agrees here: the text helper and
  the text arm have no class-body frame (pre-existing).
"""

import abc
import functools
import sys
import unittest

r = {}

calls = []


def note(v):
    calls.append(v)
    return v


def tag(value):
    def deco(fn):
        fn.tagged = value
        return fn
    return deco


def twice(fn):
    @functools.wraps(fn)
    def wrapper(*args, **kwargs):
        return 2 * fn(*args, **kwargs)
    return wrapper


MODULE_FLAG = 'from-module'


def module_deco():
    class C:
        @twice
        def m(self):
            return 3

        @functools.lru_cache(maxsize=None)
        def n(self, x):
            return x + 1

        @functools.cached_property
        def p(self):
            return 'pee'
    c = C()
    return c.m(), c.n(1), c.p, type(C.__dict__['p']).__name__


def enclosing_local():
    def deco(fn):
        fn.marked = 'bare'
        return fn

    def make(v):
        return tag(v)
    v = 'called'

    class C:
        @deco
        def a(self):
            pass

        @make(v)
        def b(self):
            pass
    return C.a.marked, C.b.tagged


def class_body_names():
    class C:
        FLAG = 'from-class-body'
        MODULE_FLAG = 'the-class-body-one'

        def _deco(fn):
            fn.tagged = 'from-sibling-def'
            return fn

        @tag(FLAG)
        def a(self):
            pass

        @tag(MODULE_FLAG)
        def b(self):
            pass

        @_deco
        def c(self):
            pass
    return C.a.tagged, C.b.tagged, C.c.tagged


def computed(fn):
    fn.computed = True
    return fn


def own_name():
    class C:
        @computed
        def computed(self):
            return 1
    return C.computed.computed, C().computed()


def register():
    class C:
        @functools.singledispatchmethod
        def f(self, arg):
            return 'object'

        @f.register(int)
        def _(self, arg):
            return 'int'

        @f.register
        def _(self, arg: str):
            return 'str'
    c = C()
    return c.f(1.5), c.f(1), c.f('s')


def order():
    del calls[:]

    def d(name):
        note('eval ' + name)

        def apply(fn):
            note('apply ' + name)
            return fn
        return apply

    class C:
        x = note('x')

        @d('outer')
        @d('inner')
        def m(self):
            pass
        y = note('y')
    return list(calls)


def alias_after():
    class C:
        @property
        def t(self):
            return 'tee'
        get_t = t.fget

        @tag('b')
        def b(self):
            pass
        btag = b.tagged
    return C.get_t(C()), C.btag


def declarative():
    def deco(fn):
        fn.deco = True
        return fn

    class C:
        @classmethod
        @twice
        def a(cls):
            return len(cls.__name__)

        @staticmethod
        @twice
        def b():
            return 5

        @twice
        @staticmethod
        def c():
            return 7

        @deco
        @classmethod
        def d(cls):
            return cls.__name__
    return (C.a(), C().a(), C.b(), C.c(), C.d(), type(C.__dict__['d']).__name__,
            C.__dict__['d'].deco)


def properties():
    class Base(abc.ABC):
        @property
        @abc.abstractmethod
        def x(self):
            pass

    class C:
        def __init__(self):
            self._v = 1

        @property
        @twice
        def v(self):
            return self._v

        @v.setter
        def v(self, value):
            self._v = value
    c = C()
    before = c.v
    c.v = 10
    return before, c.v, Base.__abstractmethods__, type(C.__dict__['v']).__name__


def wraps():
    class C:
        @twice
        def m(self, x):
            return x
    return C.m.__name__, C().m(4), C.m.__wrapped__.__name__


def cells():
    seen = []
    k = 'first'

    def deco(fn):
        seen.append(k)
        return fn

    class C:
        @deco
        def m(self):
            return k
    k = 'second'
    return seen, C().m()


def skip():
    class T(unittest.TestCase):
        always = True

        @unittest.skipIf(always, 'skipped')
        def test_a(self):
            pass
    res = unittest.TestResult()
    T('test_a').run(res)
    return len(res.skipped), res.skipped[0][1]


def raises():
    def bad(fn):
        raise ValueError('bad decorator')
    try:
        class C:
            @bad
            def m(self):
                pass
    except ValueError as e:
        return str(e)
    return None


def where(fn):
    f = sys._getframe(1)
    fn.where = (f.f_lineno, f.f_code.co_name)
    return fn


def where_at(label):
    def deco(fn):
        f = sys._getframe(1)
        setattr(fn, label, (f.f_lineno, f.f_code.co_name))
        return fn
    return deco


def lines():
    class C:
        @where
        def a(self):
            pass

        @where_at('called')
        def b(self):
            pass

        @where_at('outer')
        @where_at('inner')
        def c(self):
            pass
    base = C.a.where[0]
    return ((0, C.a.where[1]), (C.b.called[0] - base, C.b.called[1]),
            (C.c.outer[0] - base, C.c.outer[1]), (C.c.inner[0] - base, C.c.inner[1]))


r['module_deco'] = module_deco()
r['enclosing_local'] = enclosing_local()
r['class_body_names'] = class_body_names()
r['own_name'] = own_name()
r['register'] = register()
r['order'] = order()
r['alias_after'] = alias_after()
r['declarative'] = declarative()
r['properties'] = properties()
r['wraps'] = wraps()
r['cells'] = cells()
r['skip'] = skip()
r['raises'] = raises()
r['lines'] = lines()


EXPECTED = {
    'module_deco': (6, 2, 'pee', 'cached_property'),
    'enclosing_local': ('bare', 'called'),
    'class_body_names': ('from-class-body', 'the-class-body-one',
                         'from-sibling-def'),
    'own_name': (True, 1),
    'register': ('object', 'int', 'str'),
    'order': ['x', 'eval outer', 'eval inner', 'apply inner', 'apply outer',
              'y'],
    'alias_after': ('tee', 'b'),
    'declarative': (2, 2, 10, 14, 'C', 'classmethod', True),
    'properties': (2, 20, frozenset({'x'}), 'property'),
    'wraps': ('m', 8, 'm'),
    'cells': (['first'], 'second'),
    'skip': (1, 'skipped'),
    'raises': 'bad decorator',
    'lines': ((0, 'C'), (4, 'C'), (8, 'C'), (9, 'C')),
}


KEYS = sorted(EXPECTED)


if __name__ == '__main__':
    for key in KEYS:
        print('%-5s %-24s -> %r' % ('OK' if r[key] == EXPECTED[key] else 'FAIL', key, r[key]))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-5s %-24s is not in EXPECTED' % ('FAIL', extra))
