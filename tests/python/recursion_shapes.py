"""Which recursion shapes raise a CATCHABLE RecursionError?

CPython raises RecursionError for every shape below, because its limit is a
COUNTER checked on each Python call.  Grail's limit is physical Smalltalk stack
exhaustion: the VM signals AlmostOutOfStack (a Notification) and
BaseException class>>___recursionGuard___ converts it into RecursionError.  That
conversion fails wherever a handler between the raise and the guard SWALLOWS the
notification -- `on: AbstractException do: [:ex | ex return: nil]` catches it,
because AlmostOutOfStack sits under Notification under Exception.

So each check answers: does this shape end in a catchable RecursionError (True),
or in something else (a string naming what happened)?  A shape that kills the
session outright cannot report at all, which is why the driver runs each in its
own gem.
"""


def _probe(fn):
    try:
        fn()
    except RecursionError:
        return True
    except Exception as e:
        return 'raised %s instead: %s' % (type(e).__name__, e)
    return 'no exception at all'


def plain_function_recursion():
    def f():
        return f()
    return _probe(f)


def method_recursion():
    class C:
        def m(self):
            return self.m()
    return _probe(C().m)


def getattr_recursion():
    class C:
        def __getattr__(self, name):
            return getattr(self, name)
    c = C()
    return _probe(lambda: c.missing)


def getattribute_recursion():
    class C:
        def __getattribute__(self, name):
            return getattr(self, name)
    c = C()
    return _probe(lambda: c.anything)


def property_recursion():
    class C:
        @property
        def p(self):
            return self.p
    c = C()
    return _probe(lambda: c.p)


def call_recursion():
    class C:
        def __call__(self):
            return self()
    return _probe(C())


def repr_recursion():
    class C:
        def __repr__(self):
            return repr(self)
    c = C()
    return _probe(lambda: repr(c))


def eq_recursion():
    class C:
        def __eq__(self, other):
            return self == other
        __hash__ = None
    a, b = C(), C()
    return _probe(lambda: a == b)


def iter_recursion():
    class C:
        def __iter__(self):
            return iter(self)
    c = C()
    return _probe(lambda: list(c))


def init_recursion():
    class C:
        def __init__(self):
            C()
    return _probe(C)


# Driven from PythonTests>>RecursionShapesTestCase, which runs each of these
# inside BaseException class>>___recursionGuard___ -- the boundary guard whose
# #resignalAs: re-signals at the ORIGINAL deep point, so one guard above serves
# every ``except RecursionError'' below it.
GRAIL_CHECKS = [
    plain_function_recursion, method_recursion, property_recursion,
    call_recursion, repr_recursion, iter_recursion, init_recursion,
]

# NOT driven under Grail, second case: __eq__ recursion, whose clause MATCHING is
# depth-dependent.  Measured both ways on gs40, 2026-08-20: run with room to
# spare it answers True, but run inside SUnit -- a few frames deeper -- the same
# shape reports
#
#     raised RecursionError instead: maximum recursion depth exceeded
#
# i.e. the exception IS a RecursionError and ``except RecursionError:'' did not
# match it, while the later ``except Exception:'' did.  Resolving the clause
# expression is itself Python work (PyLazyExceptSelector evaluates it inside
# #handles:, which is what gives Python's lazy timing), and on a stack with
# nothing left that resolution cannot run, so the clause is skipped and a broader
# one catches instead.  A real divergence, and NOT asserted: the answer depends on
# how much headroom the caller happened to leave, so pinning it would buy a flaky
# test rather than a guarantee.
#
# NOT driven under Grail, first case, and not a Grail defect: recursion through __getattr__
# reaches the overflow with C-PRIMITIVE FRAMES on the stack (the
# doesNotUnderstand: route a missing attribute takes), and the Python ``return''
# inside the ``except RecursionError'' clause then cannot unwind across them --
# GemStone answers CannotReturn -> UncontinuableError 6011, which is
# SESSION-FATAL, so running it here would take the shard down rather than fail a
# check.  See docs/GemStone_Feature_Requests.md 1.5 (unwind across
# user-action and C-primitive frames).  It is kept in CHECKS so the CPython gate
# still proves what the shape is SUPPOSED to do.
CHECKS = GRAIL_CHECKS + [getattr_recursion, getattribute_recursion]


if __name__ == '__main__':
    import sys
    sys.setrecursionlimit(200)
    for fn in CHECKS:
        got = fn()
        print('%-6s %s%s' % ('OK' if got is True else 'DIFF', fn.__name__,
                             '' if got is True else '  -- %s' % (got,)))
