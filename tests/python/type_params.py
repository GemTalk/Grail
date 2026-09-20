"""Fixture: PEP 695 type parameters -- ``def identity[T](obj: T) -> T``.

At RUN TIME a type parameter list is almost nothing: the function still takes
and returns ordinary objects, and the names survive only as
``__type_params__``.  Grail leans on that -- it ERASES them, keeping the names
on the one def shape that can hold them.

WHICH SHAPE THAT IS, is the whole of why the IR path refused three separate
census rows for this.  ``___pyTypeParams___:'' is a method on ExecBlock, so
only the CLOSURE form -- a nested def -- can carry the cascade that records the
names.  A def compiling to a real method, whether at module scope or in a class
body, emits nothing at all for its type parameters, on either path.  So two of
the three rows had nothing to reproduce and were refusing out of caution, while
the third needed one cascade entry.

THE XFAIL IS THE PRICE OF THAT ERASURE, and it is older than this cut and
shared by both paths: ``__type_params__`` is unreadable on a module-level def,
because such a def is reached as a BoundMethod, which has no such attribute.
CPython answers the tuple of parameter objects.  Pinning it here means a later
fix has to come through this file.

The shapes vary where the parameters SIT -- a plain def, a bounded parameter,
two of them, a positional-only signature, a method, a nested def -- because the
def shape is what decides whether anything is emitted for them at all.

Everything here is verified against real CPython by running the file directly.
"""

r = {}


def record(key, fn):
    try:
        r[key] = fn()
    except Exception as exc:
        r[key] = '%s: %s' % (type(exc).__name__, exc)


def identity[T](obj: T) -> T:
    return obj


def bounded[F: int](x: F) -> F:
    return x


def two_params[A, B](a: A, b: B):
    return (a, b)


def positional_only[T](obj: T, /) -> T:
    return obj


def default_beside_params[T](obj: T, flag=True) -> T:
    return (obj, flag)


class H:
    def a_method[T](self, obj: T) -> T:
        return obj

    def a_nested_def_with_params(self):
        def inner[T](obj: T) -> T:
            return obj
        return inner(7)

    def a_nested_def_closing_over_a_local[T](self, obj: T):
        tag = 'outer'

        def inner[U](x: U):
            return (x, tag)
        return inner(obj)


h = H()
record('identity_runs', lambda: identity(3))
record('bounded_runs', lambda: bounded(4))
record('two_params_runs', lambda: two_params(1, 2))
record('positional_only_runs', lambda: positional_only('x'))
record('default_beside_params_runs', lambda: default_beside_params('a'))
record('a_method_runs', lambda: h.a_method(5))
record('a_nested_def_runs', h.a_nested_def_with_params)
record('a_nested_def_closing_over_a_local',
       lambda: h.a_nested_def_closing_over_a_local('z'))
record('type_params_names',
       lambda: tuple(t.__name__ for t in identity.__type_params__))


XFAIL = {'type_params_names'}


EXPECTED = {
    'identity_runs': 3,
    'bounded_runs': 4,
    'two_params_runs': (1, 2),
    'positional_only_runs': 'x',
    'default_beside_params_runs': ('a', True),
    'a_method_runs': 5,
    'a_nested_def_runs': 7,
    'a_nested_def_closing_over_a_local': ('z', 'outer'),
    # CPython answers the parameter names.  Grail erases them on a def that
    # compiles to a method, and reaches such a def as a BoundMethod, which has
    # no __type_params__ at all -- the same on both codegen paths.
    'type_params_names': ('T',),
}


KEYS = sorted(EXPECTED)


if __name__ == '__main__':
    for key in KEYS:
        actual = r[key]
        if key in XFAIL:
            # EXPECTED holds CPython's answer, so this agrees HERE and differs
            # under Grail -- XFAIL either way, never XPASS.
            status = 'XFAIL' if actual == EXPECTED[key] else 'FAIL'
        else:
            status = 'OK' if actual == EXPECTED[key] else 'FAIL'
        print('%-5s %-36s -> %r' % (status, key, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-5s %-36s is not in EXPECTED' % ('FAIL', extra))
