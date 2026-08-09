# Fixture for BaseExceptionTestCase>>test_recursion_raises_recursion_error.
#
# Runaway Python recursion must raise CPython's catchable RecursionError, not
# exhaust the Smalltalk stack with an AlmostOutOfStack notification that no
# Python ``except'' can contain.  BaseException class>>___recursionGuard___
# converts it with #resignalAs:, which re-signals from the ORIGINAL (deep)
# point -- so the ``except RecursionError:`` clauses below, all of which sit
# BELOW the guard, actually see it.

RESULTS = {}


# --- 1. plain infinite recursion, caught at the top --------------------------
def _infinite():
    return _infinite()


try:
    _infinite()
    RESULTS['plain'] = 'no-error'
except RecursionError as e:
    RESULTS['plain'] = True
    RESULTS['plain_message'] = 'recursion' in str(e)
except BaseException as e:
    RESULTS['plain'] = 'wrong-type:' + type(e).__name__


# --- 2. RecursionError is a RuntimeError, and an Exception -------------------
RESULTS['is_runtime_error'] = issubclass(RecursionError, RuntimeError)
RESULTS['is_exception'] = issubclass(RecursionError, Exception)


# --- 3. caught by a broader clause -------------------------------------------
def _infinite2():
    return _infinite2()


try:
    _infinite2()
    RESULTS['by_runtime_error'] = 'no-error'
except RuntimeError:
    RESULTS['by_runtime_error'] = True

try:
    _infinite2()
    RESULTS['by_exception'] = 'no-error'
except Exception:
    RESULTS['by_exception'] = True


# --- 4. KNOWN LIMITATION: a handler at EVERY recursion level -----------------
# Not asserted, and deliberately not exercised here.  When every frame of the
# recursion installs its own handler, GemStone must PASS the AlmostOutOfStack
# outward through all ~900 of them, and that unwind itself consumes what little
# stack remains -- landing in the untrappable Red Zone before the conversion
# can finish.  ___recursionGuard___ cannot help there: the reserve is gone.
#
# test.test_traceback's test_long_context_chain has exactly this shape
# (`try/except ZeroDivisionError` inside the recursing function), which is why
# it is still an ST case on the scoreboard.  Fixing it needs a bound on Python
# recursion depth reached BEFORE the stack runs out -- i.e. a real
# sys.setrecursionlimit -- not a conversion at the point of overflow.


# --- 5. the session survives: ordinary work still runs afterwards ------------
# A real stack overflow would have taken the whole evaluation down.
RESULTS['still_alive'] = sum(range(10)) == 45


def _recurse_n(n):
    if n <= 0:
        return 0
    return 1 + _recurse_n(n - 1)


RESULTS['bounded_recursion_ok'] = _recurse_n(20) == 20


# --- 6. recursion through a nested CALL, no per-level handler ----------------
# Mutual recursion still converts, so the fix is not limited to direct
# self-calls.
def _a(n):
    return _b(n + 1)


def _b(n):
    return _a(n + 1)


try:
    _a(0)
    RESULTS['mutual'] = 'no-error'
except RecursionError:
    RESULTS['mutual'] = True
except BaseException as e:
    RESULTS['mutual'] = 'wrong-type:' + type(e).__name__
