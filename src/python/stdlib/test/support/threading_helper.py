# GRAIL: trimmed test.support.threading_helper.
#
# Grail's threading is cooperative green threads on native _thread (never
# truly parallel).  The decorators here are passthroughs (Grail drops
# method decorators anyway); the helpers are best-effort.

import threading
import unittest


def _passthrough(func):
    return func


# ``reap_threads`` is used BARE (``@threading_helper.reap_threads``), so it is
# the decorator itself.
reap_threads = _passthrough


def requires_working_threading(*, module=False):
    """Upstream is CALLED -- ``@requires_working_threading()`` -- and returns a
    decorator, or raises SkipTest when asked to skip a whole module.

    Aliasing it to _passthrough gave it _passthrough's signature, so the call
    with no arguments raised TypeError.  That went unnoticed because a
    class-body decorator that raises is silently dropped, leaving the method
    undecorated -- which for a passthrough looks identical to success, right
    up until the swallow is removed.

    Grail's threads are cooperative green threads, so they always "work" for
    the purpose these tests ask about.
    """
    if module:
        return None
    return _passthrough


class catch_threading_exception:
    def __init__(self):
        self.exc_type = None
        self.exc_value = None
        self.exc_traceback = None
        self.thread = None

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


def start_threads(threads, unlock=None):
    """Return a context manager that starts `threads` on entry and joins
    them on exit.  Cooperative in Grail, but the API shape holds."""
    return _StartThreads(threads, unlock)


class _StartThreads:
    def __init__(self, threads, unlock):
        self.threads = list(threads)
        self.unlock = unlock
        self.started = []

    def __enter__(self):
        for t in self.threads:
            t.start()
            self.started.append(t)
        return self

    def __exit__(self, *exc):
        if self.unlock is not None:
            self.unlock()
        for t in self.started:
            t.join()
        return False


def join_thread(thread, timeout=None):
    thread.join(timeout)


def threading_setup():
    return (threading.active_count(),)


def threading_cleanup(*original_values):
    return None


def run_concurrently(worker_func, nthreads=None, args=(), kwargs={}):
    """Run the worker function(s) concurrently in multiple threads.

    If `worker_func` is a single callable, it is used for all threads.
    If it is a list of callables, each callable is used for one thread.

    GRAIL: upstream re-raises through catch_threading_exception, which is a
    stub here that never sees a worker's exception, so each worker records
    its own and the first is re-raised after the join.  Grail's Thread takes
    no ``kwargs=``, so the wrapper closes over args/kwargs instead.
    """
    from collections.abc import Iterable

    if nthreads is None:
        nthreads = len(worker_func)
    if not isinstance(worker_func, Iterable):
        worker_func = [worker_func] * nthreads
    assert len(worker_func) == nthreads

    barrier = threading.Barrier(nthreads)
    errors = []

    def wrapper_func(func):
        # Wait for all threads to reach this point before proceeding.
        barrier.wait()
        try:
            func(*args, **kwargs)
        except BaseException as exc:
            errors.append(exc)

    workers = [threading.Thread(target=wrapper_func, args=(func,))
               for func in worker_func]
    with start_threads(workers):
        pass
    if errors:
        raise errors[0]
