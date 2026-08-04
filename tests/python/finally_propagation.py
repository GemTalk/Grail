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
    reaches the outer except.  (Ordering-independent: ``caught'' is read after
    the whole try/except has unwound, so it does not depend on whether GemStone
    runs the finally before or after the outer handler body.)"""
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
