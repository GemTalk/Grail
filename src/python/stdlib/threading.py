# Minimal `threading` stub for Grail.  The gem runs single-threaded
# from Python's perspective; locks are no-ops that satisfy the
# acquire / release / context-manager protocol so Jinja2's LRUCache
# (and other downstream callers) can import without modification.
# Real concurrency primitives would have to wire through GemStone's
# session model, which is out of scope today.


class Lock:
    def __init__(self):
        self._locked = False

    def acquire(self, blocking=True, timeout=-1):
        self._locked = True
        return True

    def release(self):
        self._locked = False

    def locked(self):
        return self._locked

    def __enter__(self):
        self.acquire()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.release()
        return None


class RLock(Lock):
    """Re-entrant lock — same no-op semantics as Lock here."""

    pass


def get_ident():
    """Return a fixed thread id (single-threaded gem)."""
    return 1


def current_thread():
    return _MainThread


class _Thread:
    name = "MainThread"
    daemon = False

    def is_alive(self):
        return True


_MainThread = _Thread()


def main_thread():
    return _MainThread
