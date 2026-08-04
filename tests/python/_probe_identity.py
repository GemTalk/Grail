import functools
import inspect


def attrs_not_shared():
    def run_once(tag):
        def inner(x):
            pass
        seen = getattr(inner, 'stamp', 'ABSENT')
        inner.stamp = tag
        return seen
    return [run_once('first'), run_once('second')]


def distinct_objects():
    def make():
        def inner(x):
            pass
        return inner
    a, b = make(), make()
    return [a is not b, a is a]


def closures_still_work():
    def counter(start):
        def inc(n):
            return start + n
        return inc
    c1, c2 = counter(10), counter(100)
    return [c1(1), c2(1), c1 is not c2]


def shared_cell_still_shared():
    def acc():
        total = [0]

        def add(n):
            total[0] += n
            return total[0]

        def get():
            return total[0]
        return add, get
    add, get = acc()
    add(5)
    add(7)
    return get()


def def_site_metadata_survives_the_copy():
    def outer():
        def annotated(x: int, y: str = 'z') -> bool:
            """doc here"""
            return True
        return annotated
    f = outer()
    return [f.__name__, f.__doc__,
            f.__annotations__ == {'x': int, 'y': str, 'return': bool},
            isinstance(f.__code__.co_firstlineno, int),
            str(inspect.signature(f))]


def wraps_is_per_invocation():
    def wrap_once():
        def inner(a: int) -> str:
            ...

        @functools.wraps(inner)
        def wrapper(*args, **kw):
            ...
        return [wrapper.__name__,
                wrapper.__annotations__ == {'a': int, 'return': str}]
    return [wrap_once(), wrap_once()]


def recursion_by_name():
    def outer():
        def fact(n):
            return 1 if n <= 1 else n * fact(n - 1)
        return fact(5)
    return outer()


def generators_still_work():
    def outer():
        def g(n):
            for i in range(n):
                yield i
        return list(g(3))
    return outer()


def decorated_nested_def():
    calls = []

    def trace(fn):
        @functools.wraps(fn)
        def wrapper(*a, **k):
            calls.append(fn.__name__)
            return fn(*a, **k)
        return wrapper

    def build():
        @trace
        def work(n):
            return n * 2
        return work
    w1, w2 = build(), build()
    return [w1(3), w2(4), w1 is not w2, calls]


def report():
    out = []
    for name in ('attrs_not_shared', 'distinct_objects', 'closures_still_work',
                 'shared_cell_still_shared', 'def_site_metadata_survives_the_copy',
                 'wraps_is_per_invocation', 'recursion_by_name',
                 'generators_still_work', 'decorated_nested_def'):
        try:
            out.append(name + ': ' + repr(globals()[name]()))
        except Exception as exc:
            out.append(name + ': RAISED ' + type(exc).__name__ + ' ' + str(exc))
    return out
