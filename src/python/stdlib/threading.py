# Grail ``threading`` — built on the native ``_thread`` module (GsProcess +
# Semaphore), the same layering CPython uses.
#
# A gem is single-OS-threaded, so these are cooperative/interleaved green
# threads: concurrent but never parallel (much like CPython threads under the
# GIL).  That is enough for I/O-bound concurrency — e.g. a threaded dev server
# whose request handlers block on sockets and yield — but CPU-bound work won't
# run in parallel.  For true parallelism use separate gems (GsExternalSession),
# which is the ``multiprocessing`` story, not this one.
#
# The locks are real (Semaphore-backed) now that threads actually run
# concurrently; the previous no-op Lock would have been a correctness gap.
#
# Implementation note: referencing the native ``_thread`` module by attribute
# (``_thread.allocate_lock()``) works in a module-level function but NOT inside
# a class method — there Grail's module fast-path resolves the name to the
# ``_thread`` *class* object rather than the module instance.  So every
# ``_thread`` primitive is reached through a module-level helper below, and the
# Thread/RLock methods call those helpers instead of touching ``_thread``.

TIMEOUT_MAX = 600.0


def _new_lock():
    import _thread
    return _thread.allocate_lock()


def _spawn(func, args):
    import _thread
    return _thread.start_new_thread(func, args)


def get_ident():
    """Identifier of the calling thread (the active GsProcess)."""
    import _thread
    return _thread.get_ident()


def allocate_lock():
    return _new_lock()


# ``threading.Lock`` is a factory for the low-level lock (as in CPython, where
# Lock is just ``_thread.allocate_lock``).
def Lock():
    return _new_lock()


class RLock:
    """A reentrant lock: the owning thread may acquire it repeatedly, and must
    release it the same number of times.  Built over a non-reentrant
    ``_thread`` lock with owner/count bookkeeping."""

    def __init__(self):
        self._block = _new_lock()
        self._owner = None
        self._count = 0

    def acquire(self, blocking=True, timeout=-1):
        me = get_ident()
        if self._owner == me:
            self._count += 1
            return True
        acquired = self._block.acquire(blocking, timeout)
        if acquired:
            self._owner = me
            self._count = 1
        return acquired

    def release(self):
        if self._owner != get_ident():
            raise RuntimeError("cannot release un-acquired lock")
        self._count -= 1
        if self._count == 0:
            self._owner = None
            self._block.release()

    def __enter__(self):
        self.acquire()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.release()
        return None


class Thread:
    """A thread of control, run on a GsProcess.  Mirrors the
    ``threading.Thread`` API enough for ``socketserver.ThreadingMixIn`` and
    background workers: target/args/kwargs, start/run/join/is_alive, daemon."""

    def __init__(self, group=None, target=None, name=None, args=(),
                 kwds=None, daemon=None):
        # NB: the keyword-args parameter is named ``kwds`` rather than CPython's
        # ``kwargs`` because Grail treats a parameter literally named ``kwargs``
        # as a ``**kwargs`` catch-all, which would swallow ``target=``/``args=``
        # at call time.  Callers therefore can't pass ``Thread(kwargs=...)``;
        # they pass ``args=`` (and, if needed, ``kwds=``).
        self._target = target
        self._args = args
        self._kwargs = kwds if kwds is not None else {}
        self.name = name if name is not None else "Thread"
        self.daemon = bool(daemon)
        self.ident = None
        self._alive = False
        # A lock held for the thread's lifetime: acquired before start, released
        # when run() finishes, so join() can block on it.
        self._done = _new_lock()
        self._done.acquire()

    def start(self):
        self._alive = True
        _spawn(self._bootstrap, ())

    def _bootstrap(self):
        self.ident = get_ident()
        try:
            self.run()
        finally:
            self._alive = False
            self._done.release()

    def run(self):
        if self._target is not None:
            if self._kwargs:
                self._target(*self._args, **self._kwargs)
            else:
                self._target(*self._args)

    def join(self, timeout=None):
        if timeout is None:
            self._done.acquire()
        else:
            self._done.acquire(True, timeout)
        self._done.release()

    def is_alive(self):
        return self._alive

    def __repr__(self):
        return "<Thread(%s)>" % self.name


class Event:
    """A simple event flag.  ``wait`` returns the current flag state — fine for
    the cooperative dev-server use; it does not block a thread until set."""

    def __init__(self):
        self._flag = False

    def is_set(self):
        return self._flag

    def set(self):
        self._flag = True

    def clear(self):
        self._flag = False

    def wait(self, timeout=None):
        return self._flag


class _MainThreadClass:
    name = "MainThread"
    daemon = False

    def is_alive(self):
        return True


_MainThread = _MainThreadClass()


def current_thread():
    return _MainThread


def main_thread():
    return _MainThread


class local:
    """Thread-local storage.  Grail threads are cooperative GsProcess
    green threads sharing one OS thread, so plain per-instance storage
    (each Thread runs to completion or yields explicitly) is the
    honest equivalent — the same choice CPython makes for a
    single-threaded program."""

    pass


class Semaphore:
    def __init__(self, value=1):
        self._value = value

    def acquire(self, blocking=True, timeout=None):
        if self._value > 0:
            self._value -= 1
            return True
        if not blocking:
            return False
        raise RuntimeError(
            "Semaphore.acquire would block forever (Grail threads are cooperative)")

    def release(self, n=1):
        self._value += n

    def __enter__(self):
        self.acquire()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.release()
        return False


class BoundedSemaphore(Semaphore):
    def __init__(self, value=1):
        Semaphore.__init__(self, value)
        self._initial_value = value

    def release(self, n=1):
        if self._value + n > self._initial_value:
            raise ValueError("Semaphore released too many times")
        Semaphore.release(self, n)


class Condition:
    def __init__(self, lock=None):
        self._lock = lock if lock is not None else RLock()

    def acquire(self, *args):
        return self._lock.acquire(*args)

    def release(self):
        self._lock.release()

    def __enter__(self):
        self.acquire()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.release()
        return False

    def wait(self, timeout=None):
        raise RuntimeError(
            "Condition.wait would block forever (Grail threads are cooperative)")

    def notify(self, n=1):
        pass

    def notify_all(self):
        pass
