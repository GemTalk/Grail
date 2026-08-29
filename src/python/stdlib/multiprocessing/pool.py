"""GRAIL multiprocessing.pool -- ThreadPool, run inline.

Grail's threading is cooperative (GsProcess green threads), so a worker
pool degenerates to calling the function on the spot.  Every AsyncResult
this module hands back is therefore ALREADY complete: ready() is true
immediately and get() never blocks.

That is a real behavioural deviation and it is worth being precise about
where it shows.  Code that submits work and then does something else
before collecting it still gets the right ANSWER, because the answer was
computed at submit time -- kaggle's ApiClient.request(async_req=True)
works exactly this way.  Code that depends on the submitting thread
making progress WHILE the work runs -- a producer feeding a bounded
queue that a worker drains, say -- will deadlock or serialise instead,
and there is no way to paper over that here.

Exceptions are captured at submit time and re-raised out of get(), which
is CPython's contract; a failure therefore surfaces where the caller
looks for it rather than at the submit call.

Kept deliberately consistent with concurrent/futures/__init__.py, which
strikes the same bargain for Executor.
"""

import multiprocessing

__all__ = ['ThreadPool', 'Pool', 'AsyncResult', 'ApplyResult', 'MapResult',
           'ThreadPool']


class _MainProcess:
    """Just enough of a Process object for current_process()."""
    name = 'MainProcess'
    daemon = False

    @property
    def pid(self):
        import os
        return os.getpid()

    def is_alive(self):
        return True


class AsyncResult:
    """A result that is always already available.

    CPython computes this on a worker thread; Grail computed it before
    the object existed.  The API is the same either way."""

    def __init__(self, value=None, exc=None):
        self._value = value
        self._exc = exc

    def ready(self):
        return True

    def wait(self, timeout=None):
        """Returns immediately -- the work is already done."""
        return None

    def successful(self):
        """CPython raises ValueError when the result is not ready.  Here it
        always is, so this only reports whether the call raised."""
        return self._exc is None

    def get(self, timeout=None):
        if self._exc is not None:
            raise self._exc
        return self._value


# CPython names these separately; both are AsyncResult in behaviour.
ApplyResult = AsyncResult
MapResult = AsyncResult


class ThreadPool:
    """A pool whose workers are the calling thread.

    processes/initializer/initargs are accepted for signature
    compatibility.  initializer runs once, lazily, before the first piece
    of work -- CPython runs it once per worker thread, and with the
    calling thread as the only worker, once is the faithful count."""

    def __init__(self, processes=None, initializer=None, initargs=(),
                 maxtasksperchild=None):
        if processes is None:
            processes = multiprocessing.cpu_count()
        if processes < 1:
            raise ValueError('Number of processes must be at least 1')
        self._processes = processes
        self._initializer = initializer
        self._initargs = initargs
        self._initialized = False
        self._state = 'RUN'

    # -- internals ---------------------------------------------------

    def _check_running(self):
        """CPython raises ValueError on submission to a closed pool, and
        callers do rely on it -- so do not let work through here."""
        if self._state != 'RUN':
            raise ValueError('Pool not running')

    def _run_initializer(self):
        if self._initializer is not None and not self._initialized:
            self._initialized = True
            self._initializer(*self._initargs)

    def _call(self, func, args, kwds):
        self._run_initializer()
        return func(*args, **(kwds or {}))

    # -- submission --------------------------------------------------

    def apply(self, func, args=(), kwds=None):
        self._check_running()
        return self._call(func, args, kwds)

    def apply_async(self, func, args=(), kwds=None, callback=None,
                    error_callback=None):
        self._check_running()
        try:
            value = self._call(func, args, kwds)
        except BaseException as exc:
            if error_callback is not None:
                error_callback(exc)
            return AsyncResult(exc=exc)
        if callback is not None:
            callback(value)
        return AsyncResult(value=value)

    def map(self, func, iterable, chunksize=None):
        """A LIST, as in CPython -- not a lazy map object."""
        self._check_running()
        self._run_initializer()
        return [func(x) for x in iterable]

    def map_async(self, func, iterable, chunksize=None, callback=None,
                  error_callback=None):
        self._check_running()
        try:
            value = self.map(func, iterable, chunksize)
        except BaseException as exc:
            if error_callback is not None:
                error_callback(exc)
            return AsyncResult(exc=exc)
        if callback is not None:
            callback(value)
        return AsyncResult(value=value)

    def starmap(self, func, iterable, chunksize=None):
        self._check_running()
        self._run_initializer()
        return [func(*args) for args in iterable]

    def starmap_async(self, func, iterable, chunksize=None, callback=None,
                      error_callback=None):
        self._check_running()
        try:
            value = self.starmap(func, iterable, chunksize)
        except BaseException as exc:
            if error_callback is not None:
                error_callback(exc)
            return AsyncResult(exc=exc)
        if callback is not None:
            callback(value)
        return AsyncResult(value=value)

    def imap(self, func, iterable, chunksize=1):
        """An ITERATOR, as in CPython.  Lazy here too, so a caller that
        stops early does not pay for the rest."""
        self._check_running()
        self._run_initializer()
        return iter([func(x) for x in iterable])

    def imap_unordered(self, func, iterable, chunksize=1):
        """With one worker there is only one order, so this matches imap."""
        return self.imap(func, iterable, chunksize)

    # -- lifecycle ---------------------------------------------------

    def close(self):
        if self._state == 'RUN':
            self._state = 'CLOSE'

    def terminate(self):
        self._state = 'TERMINATE'

    def join(self):
        """CPython requires close() or terminate() first, and says so."""
        if self._state == 'RUN':
            raise ValueError('Pool is still running')

    def __enter__(self):
        self._check_running()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.terminate()
        return False


def Pool(*args, **kwargs):
    """The PROCESS pool.  Not supported -- use ThreadPool."""
    raise OSError(
        'multiprocessing.Pool is not supported in Grail (no child '
        'processes); use multiprocessing.pool.ThreadPool, which runs inline')
