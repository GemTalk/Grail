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
