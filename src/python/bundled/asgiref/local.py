import asyncio
import contextlib
import contextvars
import threading
from typing import Any, Dict, Union


# GRAIL: upstream's Local._lock_storage is a @contextlib.contextmanager
# generator METHOD.  Grail drops method-level decorators in class
# bodies (only @property/@classmethod/@staticmethod/@smalltalk are
# honoured), so the decorator never wraps the generator and ``with
# self._lock_storage()`` calls __enter__ on a raw generator.  This
# module-level context-manager class reproduces the exact yield
# behaviour and is instantiated directly (no decorator needed).
class _LockStorage:
    def __init__(self, local):
        self._local = local
        self._held_lock = None

    def __enter__(self):
        local = self._local
        if local._thread_critical:
            is_async = True
            try:
                asyncio.get_running_loop()
            except RuntimeError:
                is_async = False
            if not is_async:
                return local._storage
            if not hasattr(local._storage, "cvar"):
                local._storage.cvar = _CVar()
            return local._storage.cvar
        else:
            self._held_lock = local._thread_lock
            self._held_lock.acquire()
            return local._storage

    def __exit__(self, exc_type, exc_value, traceback):
        if self._held_lock is not None:
            self._held_lock.release()
            self._held_lock = None
        return False


class _CVar:
    """Storage utility for Local."""

    def __init__(self) -> None:
        self._data: "contextvars.ContextVar[Dict[str, Any]]" = contextvars.ContextVar(
            "asgiref.local"
        )

    def __getattr__(self, key):
        storage_object = self._data.get({})
        try:
            return storage_object[key]
        except KeyError:
            raise AttributeError(f"{self!r} object has no attribute {key!r}")

    def __setattr__(self, key: str, value: Any) -> None:
        if key == "_data":
            return super().__setattr__(key, value)

        storage_object = self._data.get({}).copy()
        storage_object[key] = value
        self._data.set(storage_object)

    def __delattr__(self, key: str) -> None:
        storage_object = self._data.get({}).copy()
        if key in storage_object:
            del storage_object[key]
            self._data.set(storage_object)
        else:
            raise AttributeError(f"{self!r} object has no attribute {key!r}")


class Local:
    """Local storage for async tasks.

    This is a namespace object (similar to `threading.local`) where data is
    also local to the current async task (if there is one).

    In async threads, local means in the same sense as the `contextvars`
    module - i.e. a value set in an async frame will be visible:

    - to other async code `await`-ed from this frame.
    - to tasks spawned using `asyncio` utilities (`create_task`, `wait_for`,
      `gather` and probably others).
    - to code scheduled in a sync thread using `sync_to_async`

    In "sync" threads (a thread with no async event loop running), the
    data is thread-local, but additionally shared with async code executed
    via the `async_to_sync` utility, which schedules async code in a new thread
    and copies context across to that thread.

    If `thread_critical` is True, then the local will only be visible per-thread,
    behaving exactly like `threading.local` if the thread is sync, and as
    `contextvars` if the thread is async. This allows genuinely thread-sensitive
    code (such as DB handles) to be kept stricly to their initial thread and
    disable the sharing across `sync_to_async` and `async_to_sync` wrapped calls.

    Unlike plain `contextvars` objects, this utility is threadsafe.
    """

    def __init__(self, thread_critical: bool = False) -> None:
        self._thread_critical = thread_critical
        self._thread_lock = threading.RLock()

        self._storage: "Union[threading.local, _CVar]"

        if thread_critical:
            # Thread-local storage
            self._storage = threading.local()
        else:
            # Contextvar storage
            self._storage = _CVar()

    def _lock_storage(self):
        # GRAIL: returns a _LockStorage context-manager instance (see the
        # module-level class) instead of a @contextmanager generator.
        return _LockStorage(self)

    def __getattr__(self, key):
        with self._lock_storage() as storage:
            return getattr(storage, key)

    def __setattr__(self, key, value):
        if key in ("_local", "_storage", "_thread_critical", "_thread_lock"):
            return super().__setattr__(key, value)
        with self._lock_storage() as storage:
            setattr(storage, key, value)

    def __delattr__(self, key):
        with self._lock_storage() as storage:
            delattr(storage, key)
