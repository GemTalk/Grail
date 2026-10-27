"""Fixture: a generic function binds its type parameters, as CPython's annotation scope does.

CPython compiles ``def f[T](...)`` inside an annotation scope that creates T
(Python/codegen.c, codegen_function): the body and the annotations see T, the
defaults are evaluated outside it, and the function is bound in the enclosing
scope, so a recursive call reaches the decorated function.  A nonlocal may not
resolve to a type parameter (Python/symtable.c).  Grail kept only the names,
so ``return T`` was a NameError.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import asyncio

r = {}


def first[T](x: T) -> T:
    return T


def bounded[B: int, *Ts, **P]():
    return B, Ts, P


def deco(function):
    return lambda *a: ('decorated', function(*a))


@deco
def countdown[T](n):
    return n if n == 0 else countdown(n - 1)


def keywords[A](a: A, *args: A, b: int = 3, **kw: A) -> A:
    return A


def outer():
    def inner[T]():
        return T
    return inner


async def coroutine[T]():
    return T


def generator[T]():
    yield T


r['body_sees_parameter'] = first(1).__name__
r['type_params'] = [t.__name__ for t in first.__type_params__]
r['annotations_see_it'] = first.__annotations__['x'] is first.__type_params__[0]
r['kinds_and_bound'] = [type(t).__name__ for t in bounded()] + [bounded()[0].__bound__.__name__]
r['decorated_recursion'] = countdown(2)
r['defaults_and_names'] = (keywords.__defaults__, keywords.__kwdefaults__,
                           keywords.__name__, keywords.__qualname__)
r['nested'] = (outer()().__name__, outer().__qualname__)
r['coroutine_and_generator'] = (asyncio.run(coroutine()).__name__, next(generator()).__name__)
try:
    exec('def h[A](a=list[A]()): pass', {})
    r['defaults_outside'] = 'no error'
except NameError as e:
    r['defaults_outside'] = str(e)


def outcome(source):
    try:
        compile(source, '<test string>', 'exec')
        return 'ok'
    except SyntaxError as e:
        return e.msg, e.lineno, e.offset


r['nonlocal'] = [outcome(s) for s in (
    "def f[T]():\n    nonlocal T",
    "def outer2[T]():\n    def inner1():\n        nonlocal T",
    "class Cls[T]:\n    nonlocal T",
    "def outer():\n    X = 1\n    def inner[X]():\n        nonlocal X\n    return X",
    "def func[T]():\n    T = 'func'\n    def inner():\n        nonlocal T\n        T = 'inner'")]

NONLOCAL = "nonlocal binding not allowed for type parameter '%s'"
EXPECTED = {
    'body_sees_parameter': 'T',
    'type_params': ['T'],
    'annotations_see_it': True,
    'kinds_and_bound': ['TypeVar', 'TypeVarTuple', 'ParamSpec', 'int'],
    'decorated_recursion': ('decorated', ('decorated', ('decorated', 0))),
    'defaults_and_names': (None, {'b': 3}, 'keywords', 'keywords'),
    'nested': ('T', 'outer.<locals>.inner'),
    'coroutine_and_generator': ('T', 'T'),
    'defaults_outside': "name 'A' is not defined",
    'nonlocal': [(NONLOCAL % 'T', 2, 5), (NONLOCAL % 'T', 3, 9), (NONLOCAL % 'T', 2, 5),
                 (NONLOCAL % 'X', 4, 9), 'ok'],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        print('%-5s %-24s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL',
                                    key, actual))
    print(SUMMARY)
