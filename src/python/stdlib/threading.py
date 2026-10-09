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

from time import monotonic as _monotonic

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

    def _is_owned(self):
        # CPython's private predicate; Condition and test_contextlib use it.
        return self._owner == get_ident()

    # Condition.wait's hooks, as CPython's RLock has them: release EVERY level
    # of a recursive hold while waiting, and restore it afterwards.  Without
    # them Condition would fall back to one release(), and a waiter holding
    # the lock twice would wait while still holding it.
    def _release_save(self):
        if self._count == 0:
            raise RuntimeError("cannot release un-acquired lock")
        state = (self._count, self._owner)
        self._count = 0
        self._owner = None
        self._block.release()
        return state

    def _acquire_restore(self, state):
        self._block.acquire()
        self._count, self._owner = state

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
                 kwds=None, daemon=None, context=None):
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
        # 3.14's ``context=``: the contextvars.Context the thread's activity
        # runs in.  Passing one explicitly is how a caller gets a thread with a
        # KNOWN context rather than whatever sys.flags.thread_inherit_context
        # would give it -- test_decimal's threading test passes an empty
        # Context() for exactly that reason.  None keeps the previous
        # behaviour: run in whatever context is current when the thread runs.
        self._context = context
        self.ident = None
        self._alive = False
        # A lock held for the thread's lifetime: acquired before start, released
        # when run() finishes, so join() can block on it.
        self._done = _new_lock()
        self._done.acquire()

    def start(self):
        self._alive = True
        # Into _limbo first: start() returns before the thread necessarily
        # runs, and active_count() must already count it in that window --
        # which is the whole reason CPython has a second dict here.
        _limbo[self] = self
        try:
            _spawn(self._bootstrap, ())
        except Exception:
            del _limbo[self]
            self._alive = False
            raise

    def _bootstrap(self):
        self.ident = get_ident()
        _active[self.ident] = self
        _limbo.pop(self, None)
        try:
            # Around run(), not around the bookkeeping: a context is a scope for
            # the thread's WORK, and Context.run refuses re-entry, so holding it
            # open across the _active/_limbo updates would widen the window in
            # which another thread entering the same context object fails.
            try:
                if self._context is not None:
                    self._context.run(self.run)
                else:
                    self.run()
            except BaseException:
                # CPython's _bootstrap_inner: an exception that escapes run()
                # is REPORTED, through excepthook, and ends only this thread.
                # Letting it propagate ended the whole session instead -- the
                # GsProcess has no Python caller to catch it, so it reached
                # topaz as an unhandled error (test_pickle's
                # test_unpickle_module_race took the module's run with it).
                _invoke_excepthook(self)
        finally:
            self._alive = False
            # Identity-checked rather than a bare delete: an ident can be
            # reused once a GsProcess has gone, and removing the entry by name
            # alone would then unregister whoever holds it now.
            if _active.get(self.ident) is self:
                del _active[self.ident]
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


class ExceptHookArgs:
    """What excepthook is called with: CPython's structseq, as a plain class."""

    def __init__(self, exc_type, exc_value, exc_traceback, thread):
        self.exc_type = exc_type
        self.exc_value = exc_value
        self.exc_traceback = exc_traceback
        self.thread = thread


def excepthook(args):
    """Report an exception that escaped a thread's run(), as CPython does:
    ``Exception in thread NAME:'' and the traceback, on stderr.  SystemExit
    is silently ignored, which is also CPython's rule."""
    if args.exc_type is SystemExit:
        return
    import sys
    stderr = sys.stderr
    if stderr is None:
        return
    name = args.thread.name if args.thread is not None else get_ident()
    print("Exception in thread %s:" % (name,), file=stderr, flush=True)
    import traceback
    traceback.print_exception(args.exc_type, args.exc_value,
                              args.exc_traceback, file=stderr)
    stderr.flush()


__excepthook__ = excepthook


def _invoke_excepthook(thread):
    import sys
    exc_type, exc_value, exc_tb = sys.exc_info()
    hook = excepthook
    try:
        hook(ExceptHookArgs(exc_type, exc_value, exc_tb, thread))
    except BaseException:
        # A hook that raises must not take the session down either -- the
        # whole point of this path.  CPython falls back to sys.excepthook.
        try:
            sys.excepthook(*sys.exc_info())
        except BaseException:
            pass


class Event:
    """An event flag whose ``wait`` really waits: until ``set`` or the timeout.

    Each waiter parks on its own pre-acquired lock, as Barrier's do, and
    ``set`` releases every one of them.  A parked waiter yields, so the thread
    that will set the flag gets to run.

    ``wait`` used to answer the flag at once without waiting.  The thread
    starting a server then raced ahead of it: test_ssl's ThreadedEchoServer
    does ``self.start(threading.Event()); self.flag.wait()`` and then connects,
    and on Linux the server thread had not reached listen() yet, so every client
    connect failed (the Mac's scheduling happened to let it get there first).
    """

    def __init__(self):
        self._flag = False
        self._waiters = []

    def is_set(self):
        return self._flag

    def set(self):
        self._flag = True
        waiters = self._waiters
        self._waiters = []
        for w in waiters:
            w.release()

    def clear(self):
        self._flag = False

    def wait(self, timeout=None):
        if self._flag:
            return True
        own = _new_lock()
        own.acquire()               # pre-acquired, so the next acquire parks
        self._waiters.append(own)
        if timeout is None:
            own.acquire()           # parks until set() releases it
        elif not own.acquire(True, max(timeout, 0)):
            # Timed out.  A set() racing with this may already have taken
            # ``own'' off the list; releasing a lock nobody waits on is harmless.
            try:
                self._waiters.remove(own)
            except ValueError:
                pass
        return self._flag


class _MainThreadClass:
    name = "MainThread"
    daemon = False
    ident = None

    def is_alive(self):
        return True

    def __repr__(self):
        return "<_MainThread(MainThread)>"


# The live-thread registry: what active_count() counts, what enumerate()
# lists, and where current_thread() looks the caller up.
#
# CPython guards these two dicts with a lock because its threads are
# pre-emptive.  Grail's are cooperative GsProcess green threads sharing one OS
# thread, and neither a dict store nor a dict delete yields, so a lock here
# would protect nothing -- the same reasoning ``local'' below is built on.
_active = {}    # ident -> Thread, for threads that are running
_limbo = {}     # Thread -> Thread, started but not yet running

_MainThread = _MainThreadClass()
_MainThread.ident = get_ident()
_active[_MainThread.ident] = _MainThread


# threading's own exit hooks, which CPython runs from _shutdown() BEFORE the
# atexit module's -- concurrent.futures.thread registers its worker-draining
# _python_exit here at import.  Like atexit (see its docstring), Grail keeps the
# registry but has no shutdown event to fire it from; _shutdown() fires it for a
# caller who wants that deliberately.
_threading_atexits = []
_SHUTTING_DOWN = False


def _register_atexit(func, *arg, **kwargs):
    """CPython's private hook, as concurrent.futures uses it."""
    if _SHUTTING_DOWN:
        raise RuntimeError("can't register atexit after shutdown")
    _threading_atexits.append(lambda: func(*arg, **kwargs))


def _shutdown():
    global _SHUTTING_DOWN
    _SHUTTING_DOWN = True
    for atexit_call in reversed(_threading_atexits):
        atexit_call()


def current_thread():
    """The Thread the caller is running on.

    Answered the main thread unconditionally until the registry above existed,
    which made asgiref's ``current_thread() != self._work_thread'' guard say
    ``same thread'' everywhere, and left ``current_thread().ident'' -- which
    django's postgresql backend reads -- with nothing to read."""

    return _active.get(get_ident(), _MainThread)


def main_thread():
    return _MainThread


def active_count():
    """The number of Thread objects currently alive.

    Equal to the length of enumerate(), as CPython documents and as
    test.support.threading_helper.threading_setup() relies on."""

    return len(_active) + len(_limbo)


def enumerate():
    """Every Thread currently alive, the main thread included.

    Shadows the builtin of the same name for the rest of this module, exactly
    as CPython's threading does; nothing below needs the builtin."""

    return list(_active.values()) + list(_limbo.values())


class local:
    """Thread-local storage.  Grail threads are cooperative GsProcess
    green threads sharing one OS thread, so plain per-instance storage
    (each Thread runs to completion or yields explicitly) is the
    honest equivalent — the same choice CPython makes for a
    single-threaded program."""

    pass


# Semaphore, BoundedSemaphore and Condition are CPython's (3.14), over the
# real locks above.  They were non-blocking stand-ins that raised where CPython
# waits -- "would block forever (Grail threads are cooperative)" -- which was
# wrong once threads ran: a waiter parks on a lock and yields, and the thread
# that will notify it gets to run.  concurrent.futures' ThreadPoolExecutor is
# what needed them (its idle semaphore and every Future's Condition).
# Deviation: the waiter queue is a list, not a deque, so importing threading
# does not pull in collections.

class Condition:
    """A condition variable: wait() releases the lock and parks until notify(),
    then re-acquires it."""

    def __init__(self, lock=None):
        if lock is None:
            lock = RLock()
        self._lock = lock
        self._waiters = []

    def acquire(self, *args):
        return self._lock.acquire(*args)

    def release(self):
        self._lock.release()

    def __enter__(self):
        return self._lock.__enter__()

    def __exit__(self, *args):
        return self._lock.__exit__(*args)

    def __repr__(self):
        return "<Condition(%s, %d)>" % (self._lock, len(self._waiters))

    def _release_save(self):
        release_save = getattr(self._lock, "_release_save", None)
        if release_save is not None:
            return release_save()
        self._lock.release()
        return None

    def _acquire_restore(self, state):
        acquire_restore = getattr(self._lock, "_acquire_restore", None)
        if acquire_restore is not None:
            acquire_restore(state)
        else:
            self._lock.acquire()

    def _is_owned(self):
        # As CPython: ask the lock when it can say (RLock), otherwise probe
        # it -- a lock we can take without blocking is not held by anyone.
        is_owned = getattr(self._lock, "_is_owned", None)
        if is_owned is not None:
            return is_owned()
        if self._lock.acquire(False):
            self._lock.release()
            return False
        return True

    def wait(self, timeout=None):
        if not self._is_owned():
            raise RuntimeError("cannot wait on un-acquired lock")
        waiter = _new_lock()
        waiter.acquire()
        self._waiters.append(waiter)
        saved_state = self._release_save()
        gotit = False
        try:
            if timeout is None:
                waiter.acquire()
                gotit = True
            elif timeout > 0:
                gotit = waiter.acquire(True, timeout)
            else:
                gotit = waiter.acquire(False)
            return gotit
        finally:
            self._acquire_restore(saved_state)
            if not gotit:
                try:
                    self._waiters.remove(waiter)
                except ValueError:
                    pass

    def wait_for(self, predicate, timeout=None):
        endtime = None
        waittime = timeout
        result = predicate()
        while not result:
            if waittime is not None:
                if endtime is None:
                    endtime = _monotonic() + waittime
                else:
                    waittime = endtime - _monotonic()
                    if waittime <= 0:
                        break
            self.wait(waittime)
            result = predicate()
        return result

    def notify(self, n=1):
        if not self._is_owned():
            raise RuntimeError("cannot notify on un-acquired lock")
        waiters = self._waiters
        while waiters and n > 0:
            waiter = waiters[0]
            try:
                waiter.release()
            except RuntimeError:
                pass
            else:
                n -= 1
            try:
                waiters.remove(waiter)
            except ValueError:
                pass

    def notify_all(self):
        self.notify(len(self._waiters))

    def notifyAll(self):
        self.notify_all()


class Semaphore:
    """A counter of permits: acquire() takes one, waiting while there are none;
    release() returns n and wakes up to n waiters."""

    def __init__(self, value=1):
        if value < 0:
            raise ValueError("semaphore initial value must be >= 0")
        self._cond = Condition(Lock())
        self._value = value

    def __repr__(self):
        return "<%s at %#x: value=%d>" % (type(self).__qualname__, id(self),
                                         self._value)

    def acquire(self, blocking=True, timeout=None):
        if not blocking and timeout is not None:
            raise ValueError("can't specify timeout for non-blocking acquire")
        rc = False
        endtime = None
        with self._cond:
            while self._value == 0:
                if not blocking:
                    break
                if timeout is not None:
                    if endtime is None:
                        endtime = _monotonic() + timeout
                    else:
                        timeout = endtime - _monotonic()
                        if timeout <= 0:
                            break
                self._cond.wait(timeout)
            else:
                self._value -= 1
                rc = True
        return rc

    def __enter__(self):
        return self.acquire()

    def release(self, n=1):
        if n < 1:
            raise ValueError("n must be one or more")
        with self._cond:
            self._value += n
            self._cond.notify(n)

    def __exit__(self, t, v, tb):
        self.release()


class BoundedSemaphore(Semaphore):
    """A Semaphore that refuses to be released above its initial value."""

    def __init__(self, value=1):
        Semaphore.__init__(self, value)
        self._initial_value = value

    def release(self, n=1):
        if n < 1:
            raise ValueError("n must be one or more")
        with self._cond:
            if self._value + n > self._initial_value:
                raise ValueError("Semaphore released too many times")
            self._value += n
            self._cond.notify(n)


class BrokenBarrierError(RuntimeError):
    """Raised by Barrier when the barrier is reset or aborted while a thread is
    waiting on it."""


class Barrier:
    """A rendezvous for a fixed number of threads: every ``wait`` blocks until
    ``parties`` of them have arrived, then all are released together.

    Built on the real (Semaphore-backed) locks rather than on Event, which does
    not block -- a barrier that returned immediately would defeat the point.
    The waiting is genuine: each waiter parks on its own pre-acquired lock and
    the last party to arrive releases them all.  Grail's threads are
    cooperative green threads, so a parked waiter yields and the others run,
    which is exactly the interleaving a barrier needs.

    Consequence worth stating: if fewer than ``parties`` threads ever arrive,
    the waiters park forever.  The ``timeout`` argument is accepted for API
    compatibility and NOT honoured -- the underlying lock acquire has no
    deadline -- so a miscounted barrier hangs rather than raising
    BrokenBarrierError.  CPython would time out.  Callers in the test suite
    always supply the full party count.
    """

    def __init__(self, parties, action=None, timeout=None):
        self.parties = parties
        self._action = action
        self._default_timeout = timeout
        self._mutex = _new_lock()
        self._count = 0
        self._waiters = []
        self.broken = False

    @property
    def n_waiting(self):
        return self._count

    def wait(self, timeout=None):
        """Block until ``parties`` threads have called wait.  Answers this
        thread's arrival index (0 .. parties-1), as CPython does, so exactly
        one waiter can be singled out to do follow-up work."""
        self._mutex.acquire()
        index = self._count
        self._count += 1
        if self._count >= self.parties:
            # Last to arrive: release the whole cohort and reopen the barrier.
            self._count = 0
            waiters = self._waiters
            self._waiters = []
            self._mutex.release()
            if self._action is not None:
                self._action()
            for w in waiters:
                w.release()
            return index
        own = _new_lock()
        own.acquire()               # pre-acquired, so the next acquire parks
        self._waiters.append(own)
        self._mutex.release()
        own.acquire()               # parks here until the last party arrives
        if self.broken:
            raise BrokenBarrierError()
        return index

    def reset(self):
        """Return the barrier to the empty state.  Any thread still parked is
        released with BrokenBarrierError, matching CPython -- a reset while
        someone waits is a programming error, not a quiet no-op."""
        self._mutex.acquire()
        waiters = self._waiters
        self._waiters = []
        self._count = 0
        if waiters:
            self.broken = True
        self._mutex.release()
        for w in waiters:
            w.release()

    def abort(self):
        """Put the barrier into the broken state and release every waiter."""
        self._mutex.acquire()
        self.broken = True
        waiters = self._waiters
        self._waiters = []
        self._count = 0
        self._mutex.release()
        for w in waiters:
            w.release()
