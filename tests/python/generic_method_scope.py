"""Fixture: a generic METHOD (``def m[T](self, ...)`` in a class body) has a scope.

CPython compiles a generic method as it does a generic function: an annotation
scope binds its type parameters, evaluates nothing until asked, and defines the
method inside it, so T is visible to the method's annotations, its bounds and
its body (Python/codegen.c, codegen_function).  In a class body that scope
sees the class namespace, so a bound may name a class attribute, and it closes
over an enclosing function's locals like any other scope.

Grail kept a generic method's parameter NAMES only, its bounds evaluated in
the module's globals: T was a NameError in the annotations and the body, a
bound naming a class attribute was None, one naming an enclosing local was a
string.  Everything a method does must survive the change -- a zero-argument
super(), decorators, dunders, private names, the signature.  The method is now
emitted inline in the class build, as a def in a class-body ``if`` always was,
and zero-argument super() there saw None in a class defined in a function.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import inspect

r = {}


def outcome(thunk):
    try:
        return thunk()
    except Exception as e:
        return '%s: %s' % (type(e).__name__, e)


class Base:
    def greet(self): return 'base'


class Generic(Base):
    Alias = int

    def greet[T](self, x: T = 3) -> T:
        """greet doc"""
        return 'generic+' + super().greet()

    def bounded[U: Alias, V: (str, bytes)](self): ...

    @classmethod
    def make[T](cls, value: T): return cls.__name__, value

    @staticmethod
    def double[T](value: T): return value * 2

    def __getitem__[K](self, key: K): return ('item', key)

    def __hidden[T](self): return 'hidden'

    def reveal(self): return self.__hidden()

    def own[T](self) -> T: return T


greet = Generic.greet
T, = greet.__type_params__
r['annotations_name_T'] = greet.__annotations__ == {'x': T, 'return': T}
r['body_reads_T'] = Generic().own() is Generic.own.__type_params__[0]
U, V = Generic.bounded.__type_params__
r['bounds_see_class'] = [U.__bound__ is int, V.__constraints__ == (str, bytes)]
r['method_protocol'] = [Generic().greet(), greet.__defaults__, greet.__qualname__, greet.__doc__,
                        str(inspect.signature(greet)), type(Generic.__dict__['greet']).__name__]
r['decorated'] = [Generic.make(5), Generic.double(4), Generic()[7], Generic().reveal()]
r['no_scope_leak'] = [k for k in Generic.__dict__ if 'generic_parameters' in k]


def enclosing():
    local = 'enclosing'

    class Inner(Base):
        def greet[T](self) -> T:
            return 'inner+' + super().greet()

        def bound[W: local](self): ...

        def cls[T](self): return __class__
    return Inner


Inner = enclosing()
r['local_class'] = [Inner().greet(), Inner.bound.__type_params__[0].__bound__, Inner().cls() is Inner]


def conditional():
    class Child(Base):
        if True:
            def greet(self): return 'conditional+' + super().greet()
    return Child


# Not generic, the same path: a def in a class-body ``if`` is emitted inline.
r['conditional_def_super'] = conditional()().greet()


class Host[A]:
    def method[B](self):
        class Nested[C]:
            def deepest[D](self):
                return lambda: (A, B, C, D)
        return Nested


Nested = Host().method()
r['nested_scopes'] = Nested().deepest()() == (Host.__type_params__[0], Host.method.__type_params__[0],
                                              Nested.__type_params__[0], Nested.deepest.__type_params__[0])

EXPECTED = {
    'annotations_name_T': True,
    'body_reads_T': True,
    'bounds_see_class': [True, True],
    'method_protocol': ['generic+base', (3,), 'Generic.greet', 'greet doc', '(self, x: T = 3) -> T', 'function'],
    'decorated': [('Generic', 5), 8, ('item', 7), 'hidden'],
    'no_scope_leak': [],
    'local_class': ['inner+base', 'enclosing', True],
    'conditional_def_super': 'conditional+base',
    'nested_scopes': True,
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-20s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
