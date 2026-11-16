"""Fixture: the secondary bases ir_mi_merge_regenerates.py merges from.

A module of its own so that a test can import it, empty the IR builder cache,
and only then build the classes that merge from it: the merge then has to
rebuild each base method's builder from this file's source.
"""


class Root:
    def __init__(self, v):
        self.v = v

    def root(self):
        return 'root'


class Mixin:
    def plain(self, x):
        return self.v + x

    def kw(self, a, b=2, *args, **kw):
        return (self.v, a, b, args, sorted(kw.items()))

    def calls_self(self):
        return self.plain(100)

    @classmethod
    def cm(cls, x):
        return (cls.__name__, x)

    @staticmethod
    def sm(x, y):
        return x * y

    def gen(self, n):
        for i in range(n):
            yield self.v + i

    def closure(self, k):
        def inner(z):
            return self.v + k + z
        return inner(1)

    def raises(self):
        return 1 // 0

    def with_class(self):
        class Local:
            def f(self):
                return 'local'
        return Local().f()

    @property
    def prop(self):
        return ('get', self.v)

    @prop.setter
    def prop(self, value):
        self.v = value

    def who(self):
        return type(self).__name__
