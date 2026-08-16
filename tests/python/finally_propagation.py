# Fixture for TracebackTestCase>>testFinallyDuringPropagation.
#
# sys.exc_info() inside a ``finally'' that runs BECAUSE an exception is
# propagating must report that in-flight exception (CPython semantics), via
# BaseException>>___ensureFinally___:finally: (TryAst, non-generator scopes).
# Phase 3a already covered except-handler bodies; this covers finally bodies.

import sys


def bare_finally_sees_exc():
    """A bare try/finally: during the finally, exc_info() is the propagating
    exception, and it still propagates out afterwards."""
    seen = []
    try:
        try:
            raise ValueError("boom")
        finally:
            seen.append(sys.exc_info()[0])
    except ValueError:
        pass
    return seen[0]


def normal_finally_no_exc():
    """No exception: the finally sees no current exception (None)."""
    got = []
    try:
        pass
    finally:
        got.append(sys.exc_info()[0])
    return got[0]


def finally_doesnt_swallow():
    """The finally must NOT swallow the propagating exception -- it still
    reaches the outer except.  (This was deliberately written to be
    ordering-independent, back when the finally ran from an ensure: and so
    could fire AFTER the outer handler body.  The order is now defined: the
    finally runs before anything outside the try sees the exception, which
    outer_handler_runs_once pins directly.)"""
    caught = False
    try:
        try:
            raise KeyError("k")
        finally:
            pass
    except KeyError:
        caught = True
    return caught


def except_finally_uncaught_propagates():
    """try/except/finally where the except clause does NOT match: the finally
    still sees the propagating (uncaught-by-this-except) exception."""
    seen = []
    try:
        try:
            raise ValueError("v")
        except KeyError:
            pass
        finally:
            seen.append(sys.exc_info()[0])
    except ValueError:
        pass
    return seen[0]


def nested_restore():
    """exc_info save/restore across a handler (Phase 3a) wrapping an inner
    try/finally (this change): ValueError, then KeyError in the finally, then
    back to ValueError after the inner try/except."""
    order = []
    try:
        raise ValueError("outer")
    except ValueError:
        order.append(sys.exc_info()[0])          # ValueError (handled)
        try:
            try:
                raise KeyError("inner")
            finally:
                order.append(sys.exc_info()[0])  # KeyError (propagating)
        except KeyError:
            pass
        order.append(sys.exc_info()[0])          # ValueError again (restored)
    return order


RESULTS = {
    'bare_sees_valueerror': bare_finally_sees_exc() is ValueError,
    'normal_finally_none': normal_finally_no_exc() is None,
    'finally_doesnt_swallow': finally_doesnt_swallow(),
    'except_finally_uncaught': except_finally_uncaught_propagates() is ValueError,
    'nested_restore': nested_restore() == [ValueError, KeyError, ValueError],
}


# ---------------------------------------------------------------------------
# A ``raise'' inside a finally REPLACES the in-flight exception (and chains to
# it).  Grail used to run the finally from an ensure:, i.e. while the stack was
# already unwinding -- by which point ``ex pass'' had handed the original
# exception to the enclosing handler.  So the outer except ran TWICE, once per
# exception, instead of once for the finally's.
# ---------------------------------------------------------------------------


def raise_in_finally_replaces():
    """The finally's exception is the one that leaves the try, and the
    original becomes its __context__."""
    try:
        try:
            raise ValueError("inflight")
        finally:
            raise KeyError("from finally")
    except BaseException as e:
        return (type(e).__name__, type(e.__context__).__name__)


def outer_handler_runs_once():
    """The enclosing handler sees exactly ONE exception."""
    runs = []
    try:
        try:
            raise ValueError("inflight")
        finally:
            raise KeyError("from finally")
    except BaseException as e:
        runs.append(type(e).__name__)
    return runs


def raise_in_finally_on_return_has_no_context():
    """A finally that raises on the RETURN path chains to nothing: a pending
    ``return'' is not an exception being handled."""
    def f():
        try:
            return "normal"
        finally:
            raise KeyError("from finally")
    try:
        f()
    except KeyError as e:
        return e.__context__
    return "no error"


def exc_info_in_finally_on_return_is_none():
    """...and sys.exc_info() agrees, inside that same finally."""
    seen = []
    def f():
        try:
            return "normal"
        finally:
            seen.append(sys.exc_info()[1])
    f()
    return seen[0]


def return_in_finally_wins():
    """A ``return'' in a finally discards the propagating exception."""
    def f():
        try:
            raise ValueError("swallowed")
        finally:
            return "finally won"
    return f()


def generator_raise_in_finally_replaces():
    """The same rule inside a GENERATOR, where Grail used to fall back to a
    plain ensure: and so kept the old ordering."""
    def g():
        try:
            yield 1
        finally:
            raise KeyError("from finally")
    gi = g()
    next(gi)
    try:
        gi.throw(ValueError("inflight"))
    except BaseException as e:
        return (type(e).__name__, type(e.__context__).__name__)
    return "no error"


def generator_finally_yield_keeps_exception_identity():
    """A generator whose finally YIELDS suspends mid-propagation; the
    exception resumed out of the next advance is the SAME object."""
    def inner():
        try:
            yield 'first'
        finally:
            yield 'second'
    gi = inner()
    next(gi)
    thrown = BaseException()
    resumed = gi.throw(thrown)
    try:
        next(gi)
    except BaseException as e:
        return (resumed, e is thrown)
    return "no error"
