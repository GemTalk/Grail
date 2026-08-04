"""Fixture for NestedDefIdentityTestCase.

Every execution of a ``def`` must produce a DISTINCT function object.  GemStone
reuses a CLEAN block -- one referencing no self, instance variable, enclosing
temp or thisContext -- as a compile-time literal, so a nested def whose body
captures nothing used to answer the same ExecBlock on every execution, sharing
all per-function state across invocations.

Each function here returns plain values so the Smalltalk test case can assert
on them directly.  The functions that matter run their inner def TWICE: the bug
was invisible on a first execution and only showed on the second.
"""

import functools
import inspect


# --- the bug itself -------------------------------------------------------


def attrs_not_shared():
    """A user attribute set on a nested def must not be visible next time."""
    def run_once(tag):
        def inner(x):
            pass
        seen = getattr(inner, 'stamp', 'ABSENT')
        inner.stamp = tag
        return seen
    return [run_once('first'), run_once('second')]


def distinct_objects():
    """Two executions of one def are different objects; one object is itself."""
    def make():
        def inner(x):
            pass
        return inner
    a, b = make(), make()
    return [a is not b, a is a]


def doc_override_does_not_leak():
    """__doc__ is a def-site slot; a per-object write must not outlive it."""
    def run_once(replace):
        def inner():
            """original"""
        before = inner.__doc__
        inner.__doc__ = replace
        return before
    return [run_once('changed'), run_once('changed again')]


def annotations_memo_does_not_leak():
    """The __annotations__ dict is memoized per object, so a mutation of one
    execution's dict must not be handed to the next.  This is the shape that
    test_functools TestWraps.test_update_wrapper_annotations trips on."""
    def run_once():
        def inner(a: int):
            pass
        ann = inner.__annotations__
        seen = dict(ann)
        ann['injected'] = str
        return seen
    return [run_once(), run_once()]


# --- what the fix must not break -----------------------------------------


def closures_still_capture():
    """A def that DOES capture was always correct; keep it that way."""
    def counter(start):
        def inc(n):
            return start + n
        return inc
    c1, c2 = counter(10), counter(100)
    return [c1(1), c2(1), c1 is not c2]


def shared_enclosing_cell_stays_shared():
    """Two nested defs over one enclosing binding must still see each other's
    writes -- a copy that snapshotted the home context would break this."""
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


def def_site_metadata_survives():
    """__name__ / __doc__ / __annotations__ / __code__ / signature are stamped
    at the def SITE, keyed by the block's method, which a copy preserves."""
    def outer():
        def annotated(x: int, y: int = 3) -> bool:
            """doc here"""
            return True
        return annotated
    f = outer()
    return [f.__name__,
            f.__doc__,
            f.__annotations__ == {'x': int, 'y': int, 'return': bool},
            isinstance(f.__code__.co_firstlineno, int),
            str(inspect.signature(f))]


def update_wrapper_applies_per_execution():
    """functools.wraps writes __name__/__annotate__ onto the wrapper; with a
    shared wrapper object the second execution saw the first's values."""
    def wrap_once():
        def inner(a: int) -> str:
            ...

        @functools.wraps(inner)
        def wrapper(*args, **kw):
            ...
        return [wrapper.__name__,
                wrapper.__annotations__ == {'a': int, 'return': str}]
    return [wrap_once(), wrap_once()]


def recursion_by_name_resolves():
    """A nested def calling itself reads the enclosing binding, which holds the
    copy -- so recursion must still terminate."""
    def outer():
        def fact(n):
            return 1 if n <= 1 else n * fact(n - 1)
        return fact(5)
    return outer()


def generator_nested_def_works():
    def outer():
        def g(n):
            for i in range(n):
                yield i
        return list(g(3))
    return outer()


def decorated_nested_def_is_fresh():
    """The decorator pipeline binds the COPY (shallowCopy is the value of the
    whole def expression), so decoration and the fresh identity compose."""
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


def default_capture_still_per_execution():
    """A def with defaults compiles to an outer block evaluated immediately;
    the copy is taken on the inner block it returns."""
    def make(base):
        def inner(n=base):
            return n
        return inner
    f1, f2 = make(1), make(2)
    return [f1(), f2(), f1 is not f2]
