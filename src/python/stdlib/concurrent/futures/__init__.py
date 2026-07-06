# GRAIL minimal concurrent.futures stub.
#
# Grail threading is cooperative (GsProcess green threads), so a
# "thread pool" degenerates to running the callable inline.  That is
# enough for asgiref, whose sync-only paths construct executors at
# import time (SyncToAsync's class body builds a
# ThreadPoolExecutor(max_workers=1)) but only *use* them from inside a
# running event loop, which Grail doesn't have.
#
# Future is a real, if simplified, synchronous future: submit() runs
# the callable immediately and stores the result/exception.

FIRST_COMPLETED = "FIRST_COMPLETED"
FIRST_EXCEPTION = "FIRST_EXCEPTION"
ALL_COMPLETED = "ALL_COMPLETED"


class Error(Exception):
    pass


class CancelledError(Error):
    pass


class TimeoutError(Error):
    pass


class InvalidStateError(Error):
    pass


class Future:
    def __init__(self):
        self._done = False
        self._result = None
        self._exception = None
        self._cancelled = False

    def cancel(self):
        if self._done:
            return False
        self._cancelled = True
        self._done = True
        return True

    def cancelled(self):
        return self._cancelled

    def running(self):
        return False

    def done(self):
        return self._done

    def set_result(self, result):
        self._result = result
        self._done = True

    def set_exception(self, exception):
        self._exception = exception
        self._done = True

    def set_running_or_notify_cancel(self):
        return not self._cancelled

    def result(self, timeout=None):
        if self._cancelled:
            raise CancelledError()
        if not self._done:
            raise TimeoutError("Future has no result (Grail futures are synchronous)")
        if self._exception is not None:
            raise self._exception
        return self._result

    def exception(self, timeout=None):
        if self._cancelled:
            raise CancelledError()
        return self._exception

    def add_done_callback(self, fn):
        if self._done:
            fn(self)
        else:
            raise NotImplementedError(
                "add_done_callback on a pending Future is not supported in Grail")


class Executor:
    def submit(self, fn, *args, **kwargs):
        future = Future()
        try:
            future.set_result(fn(*args, **kwargs))
        except BaseException as exc:
            future.set_exception(exc)
        return future

    def map(self, fn, *iterables, timeout=None, chunksize=1):
        return map(fn, *iterables)

    def shutdown(self, wait=True, cancel_futures=False):
        pass

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.shutdown()
        return False


class ThreadPoolExecutor(Executor):
    def __init__(self, max_workers=None, thread_name_prefix="",
                 initializer=None, initargs=()):
        self._initializer = initializer
        self._initargs = initargs
        self._initialized = False

    def submit(self, fn, *args, **kwargs):
        if self._initializer is not None and not self._initialized:
            self._initialized = True
            self._initializer(*self._initargs)
        return Executor.submit(self, fn, *args, **kwargs)


class ProcessPoolExecutor(Executor):
    def __init__(self, *args, **kwargs):
        raise OSError("ProcessPoolExecutor is not supported in Grail (no child processes)")


def wait(fs, timeout=None, return_when=ALL_COMPLETED):
    done = set(f for f in fs if f.done())
    not_done = set(fs) - done
    return done, not_done


def as_completed(fs, timeout=None):
    for f in fs:
        if not f.done():
            raise TimeoutError("pending Future (Grail futures are synchronous)")
        yield f
