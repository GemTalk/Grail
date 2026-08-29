"""Fixtures for Grail's multiprocessing shim, driven by
PythonTests>>MultiprocessingModuleTestCase.

Grail has no child processes and its threading is cooperative, so
``multiprocessing.pool.ThreadPool`` runs its work INLINE and every
AsyncResult comes back already complete.  These checks pin the parts of
the contract that survive that -- the answers, the exception routing,
the lifecycle errors -- and deliberately do NOT pin the parts that do
not, because those differ legitimately.

Two places where an earlier draft of this file asserted Grail's
behaviour rather than CPython's, both caught by running it under CPython
(``python3 tests/python/use_multiprocessing.py``):

  * ``successful()`` RAISES ValueError when the result is not ready, so
    a portable check has to ``wait()`` first.  Grail's result is always
    ready, so without the wait the check passes here and explodes there.
  * the initializer runs once PER WORKER THREAD, so with ThreadPool(2)
    CPython calls it twice.  Asserting ``== 1`` pinned Grail's topology.
    The portable claim is only that it ran before the work did.

Run it under CPython to see what it produces -- that is where the
expectations come from.
"""

import multiprocessing
from multiprocessing.pool import ThreadPool


def _square(x):
    return x * x


def _add(a, b):
    return a + b


def _boom(x):
    raise ValueError('boom-%s' % x)


def cpu_count_is_positive():
    """Kaggle's Configuration multiplies this by 5 for its pool size."""
    n = multiprocessing.cpu_count()
    return isinstance(n, int) and n > 0


def apply_returns_the_value():
    return ThreadPool().apply(_square, (7,)) == 49


def apply_async_get_returns_the_value():
    return ThreadPool().apply_async(_square, (8,)).get() == 64


def a_result_becomes_ready():
    r = ThreadPool().apply_async(_square, (2,))
    r.wait()
    return r.ready() is True


def a_successful_result_reports_success():
    r = ThreadPool().apply_async(_square, (2,))
    r.wait()
    return r.successful() is True


def a_failed_result_reports_failure():
    r = ThreadPool().apply_async(_boom, (1,))
    r.wait()
    return r.successful() is False


def get_reraises_the_callables_exception():
    """CPython's contract: the failure surfaces where the caller collects
    it, not where the work was submitted."""
    r = ThreadPool().apply_async(_boom, (1,))
    try:
        r.get()
    except ValueError as e:
        return str(e) == 'boom-1'
    return False


def map_returns_a_list():
    p = ThreadPool()
    out = p.map(_square, [1, 2, 3])
    return out == [1, 4, 9] and isinstance(out, list)


def starmap_spreads_the_arguments():
    return ThreadPool().starmap(_add, [(1, 2), (3, 4)]) == [3, 7]


def imap_returns_an_iterator():
    it = ThreadPool().imap(_square, [1, 2, 3])
    return iter(it) is it and list(it) == [1, 4, 9]


def map_async_get_returns_the_list():
    return ThreadPool().map_async(_square, [2, 3]).get() == [4, 9]


def callback_receives_the_value():
    seen = []
    p = ThreadPool()
    p.apply_async(_square, (3,), callback=seen.append)
    p.close()
    p.join()
    return seen == [9]


def error_callback_receives_the_exception():
    errs = []
    p = ThreadPool()
    p.apply_async(_boom, (2,), error_callback=errs.append)
    p.close()
    p.join()
    return len(errs) == 1 and isinstance(errs[0], ValueError)


def the_initializer_runs_before_the_work():
    """Not how MANY times -- that is the worker count, which differs."""
    init = []
    p = ThreadPool(2, initializer=lambda: init.append(1))
    p.apply(_square, (1,))
    return len(init) >= 1


def submitting_to_a_closed_pool_raises():
    p = ThreadPool()
    p.close()
    try:
        p.apply_async(_square, (1,))
    except ValueError:
        return True
    return False


def joining_a_running_pool_raises():
    try:
        ThreadPool().join()
    except ValueError:
        return True
    return False


def the_pool_is_a_context_manager():
    with ThreadPool() as p:
        return p.apply(_square, (5,)) == 25


def zero_processes_raises():
    try:
        ThreadPool(0)
    except ValueError:
        return True
    return False


# --- Grail-only deviations -------------------------------------------
#
# These assert what Grail does DIFFERENTLY, so they are deliberately kept
# out of CHECKS: under CPython both Process and Pool work fine, and a
# check that CPython contradicts must never sit in the list that
# check_python_fixtures.sh runs as the conformance oracle.  They are
# driven from MultiprocessingModuleTestCase instead.


def grail_only_process_raises():
    """Grail cannot fork a gem, so Process must fail at construction
    rather than silently doing something else."""
    try:
        multiprocessing.Process(target=_square, args=(1,))
    except OSError:
        return True
    return False


def grail_only_process_pool_raises():
    """The PROCESS pool must not quietly degrade to serial execution --
    silently serial results are indistinguishable from correct ones
    until they are too slow."""
    try:
        multiprocessing.Pool(2)
    except OSError:
        return True
    return False


CHECKS = [
    cpu_count_is_positive,
    apply_returns_the_value,
    apply_async_get_returns_the_value,
    a_result_becomes_ready,
    a_successful_result_reports_success,
    a_failed_result_reports_failure,
    get_reraises_the_callables_exception,
    map_returns_a_list,
    starmap_spreads_the_arguments,
    imap_returns_an_iterator,
    map_async_get_returns_the_list,
    callback_receives_the_value,
    error_callback_receives_the_exception,
    the_initializer_runs_before_the_work,
    submitting_to_a_closed_pool_raises,
    joining_a_running_pool_raises,
    the_pool_is_a_context_manager,
    zero_processes_raises,
]


def all_checks():
    """Every check, as a list of (name, passed) -- what the SUnit case reads."""
    return [(fn.__name__, fn() is True) for fn in CHECKS]


if __name__ == '__main__':
    for fn in CHECKS:
        print('%-4s %s' % ('OK' if fn() is True else 'FAIL', fn.__name__))
