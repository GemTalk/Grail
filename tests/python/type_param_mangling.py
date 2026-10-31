"""Fixture: a generic class's private type parameters are mangled by the class.

CPython's type-parameter scope for ``class Foo[__T]`` mangles its parameter
names with the class's own name, and nothing else in that scope
(Python/symtable.c:1926-1936, 3209-3222): the scope binds ``_Foo__T``, which
is what ``__T`` reads in the class body, in a bound, in a base and in a lambda
there, while the TypeVar keeps its written name.  Grail bound ``__T`` itself,
so the body's mangled ``_Foo__T`` was a NameError and the class could not be
built.  A generic method's or alias's parameters inside the class are mangled
like every other name there.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

r = {}


def make_base(arg):
    class Base:
        __arg__ = arg
    return Base


class Foo[__T, __U: __T](make_base(__T), make_base(lambda: __T)):
    param = __T

    def meth[__V](self, arg: __T, arg2: __V):
        return (__T, __V)

    type Alias[__W] = (__T, __W)


T, U = Foo.__type_params__
V, = Foo.meth.__type_params__
W, = Foo.Alias.__type_params__
r['written_names'] = [T.__name__, U.__name__, V.__name__, W.__name__]
r['bound_and_body'] = [U.__bound__ is T, Foo.param is T]
r['bases'] = [Foo.__bases__[0].__arg__ is T, Foo.__bases__[1].__arg__() is T]
r['method'] = [Foo.meth.__annotations__ == {'arg': T, 'arg2': V}, Foo().meth(1, 2) == (T, V)]
r['alias'] = Foo.Alias.__value__ == (T, W)


class Outer:
    class Inner[__X](make_base(__X)):
        value = __X


X, = Outer.Inner.__type_params__
r['nested_class'] = [X.__name__, Outer.Inner.value is X, Outer.Inner.__bases__[0].__arg__ is X]

EXPECTED = {
    'written_names': ['__T', '__U', '__V', '__W'],
    'bound_and_body': [True, True],
    'bases': [True, True],
    'method': [True, True],
    'alias': True,
    'nested_class': ['__X', True, True],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-16s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
