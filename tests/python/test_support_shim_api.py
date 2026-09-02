"""The API SHAPE of Grail's trimmed ``test.support`` shims.

Deliberately WITHOUT a ``__main__`` guard, so check_python_fixtures.sh does not
adopt it as a self-running fixture: it is driven from
PythonTests>>TestSupportShimTestCase instead.  The comparison it wants is not
"Grail agrees with CPython at this moment" but "Grail's trimmed shim still
offers the shape the vendored CPython test modules call it with", and the
scoreboard that would otherwise catch a drift is not in the pre-merge pipeline.

Every name here was missing or mis-shaped, and NONE of the absences announced
itself.  Each is used only in a class-body decorator position, where Grail
silently drops a decorator whose expression raises -- so the guarded tests ran
unguarded rather than reporting a missing symbol.  test_netrc's test_security
is the one that showed: it asserts a NetrcParseError that only fires when the
security check is reachable, and it should have been skipped outright.
"""

import unittest

from test import support
from test.support import os_helper
from test.support import threading_helper


def a_called_threading_decorator_takes_its_keyword():
    """Upstream is CALLED -- ``@requires_working_threading()``.

    Grail aliased it to a one-argument passthrough, so the call raised
    TypeError.  Four modules' worth of decorators (functools, itertools, enum,
    super) were dropped by it, and a dropped passthrough is indistinguishable
    from an applied one, which is why it survived.
    """
    deco = threading_helper.requires_working_threading()
    def f():
        return 'ran'
    return deco(f)() == 'ran'


def the_threading_decorator_handles_module_scope():
    """``requires_working_threading(module=True)`` is a statement, not a
    decorator factory: upstream returns None when threading works."""
    return threading_helper.requires_working_threading(module=True) is None


def reap_threads_is_still_used_bare():
    """The sibling name is NOT called -- ``@threading_helper.reap_threads`` --
    so it has to remain the decorator itself, not a factory."""
    def f():
        return 'ran'
    return threading_helper.reap_threads(f)() == 'ran'


def chmod_skip_is_a_decorator_and_chmod_works():
    """os_helper.skip_unless_working_chmod, the symbol whose absence took
    test_netrc's whole decorator stack down with it."""
    if not os_helper.can_chmod():
        return False
    def f():
        return 'ran'
    return os_helper.skip_unless_working_chmod(f) is f


def a_stacked_skip_survives_the_chmod_decorator():
    """The netrc shape in miniature, and the actual regression guard.

    ``skipUnless(False)`` marks the method; the chmod decorator above it must
    return the SAME object so the mark survives.  With the symbol missing, the
    expression raised and BOTH decorators were dropped -- which is how a test
    that should have been skipped came to run and fail.
    """
    def f():
        return 'ran'
    marked = unittest.skipUnless(False, 'nope')(f)
    outer = os_helper.skip_unless_working_chmod(marked)
    return getattr(outer, '__unittest_skip__', False) is True


def no_tracing_wraps_and_still_calls():
    """support.no_tracing, read by test_richcmp."""
    def f(a, b):
        return a + b
    return support.no_tracing(f)(2, 3) == 5


def the_gil_flag_is_a_bool():
    """support.Py_GIL_DISABLED, read by test_bytes inside a skipUnless."""
    return support.Py_GIL_DISABLED in (True, False)


CHECKS = [
    a_called_threading_decorator_takes_its_keyword,
    the_threading_decorator_handles_module_scope,
    reap_threads_is_still_used_bare,
    chmod_skip_is_a_decorator_and_chmod_works,
    a_stacked_skip_survives_the_chmod_decorator,
    no_tracing_wraps_and_still_calls,
    the_gil_flag_is_a_bool,
]

RESULTS = {}
for _fn in CHECKS:
    try:
        RESULTS[_fn.__name__] = _fn() is True
    except Exception as _exc:
        RESULTS[_fn.__name__] = type(_exc).__name__ + ': ' + str(_exc)
