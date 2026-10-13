"""GRAIL multiprocessing.managers -- importable, not runnable.

A CPython manager starts a SERVER PROCESS and hands out proxies that talk to
it over a connection.  Grail runs inside one gem and has no child processes
(see multiprocessing/__init__.py), so no manager can actually start.

What real code needs at import time is the CLASS: s3transfer -- and so
boto3, PyPI's most downloaded package -- does ``from multiprocessing.managers
import BaseManager`` in s3transfer.compat, and s3transfer.processpool
subclasses it and calls ``register()`` while its module body runs.  Neither
starts a manager unless the caller asks for the process-pool downloader.

So, as with Process and Pool in this shim: the classes exist, can be
subclassed, and ``register()`` records typeids exactly as CPython's does.
``start()``, ``connect()``, entering the manager as a context manager, and
calling a registered creation method raise OSError -- at the point a caller
asks for a server process, rather than with results that only look shared.
"""

__all__ = ['BaseManager', 'SyncManager']


def _unsupported(what):
    return OSError(
        'multiprocessing.managers: %s is not supported in Grail (no child '
        'processes to run a manager server in)' % what)


class BaseManager(object):
    """CPython's manager base class, minus the server process."""

    _registry = {}
    _Server = None

    def __init__(self, address=None, authkey=None, serializer='pickle',
                 ctx=None, *, shutdown_timeout=1.0):
        self._address = address
        self._authkey = authkey
        self._serializer = serializer
        self._ctx = ctx
        self._shutdown_timeout = shutdown_timeout

    @property
    def address(self):
        return self._address

    @classmethod
    def register(cls, typeid, callable=None, proxytype=None, exposed=None,
                 method_to_typeid=None, create_method=True):
        """Record ``typeid`` on this manager class, as CPython does: each
        subclass gets its own copy of the registry the first time it
        registers, so registering on a subclass never touches its base."""
        if '_registry' not in cls.__dict__:
            cls._registry = cls._registry.copy()
        if method_to_typeid:
            for key, value in list(method_to_typeid.items()):
                assert type(key) is str, '%r is not a string' % key
                assert type(value) is str, '%r is not a string' % value
        cls._registry[typeid] = (callable, exposed, method_to_typeid, proxytype)
        if create_method:
            def temp(self, /, *args, **kwds):
                raise _unsupported('creating a shared %r object' % typeid)
            temp.__name__ = typeid
            setattr(cls, typeid, temp)

    def get_server(self):
        raise _unsupported('get_server()')

    def connect(self):
        raise _unsupported('connect()')

    def start(self, initializer=None, initargs=()):
        raise _unsupported('start()')

    def join(self, timeout=None):
        pass

    def shutdown(self):
        """Nothing was started, so there is nothing to stop."""

    def __enter__(self):
        # CPython starts the manager here when it has not been started.
        raise _unsupported('starting a manager')

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.shutdown()


class SyncManager(BaseManager):
    """``multiprocessing.Manager()``'s class.  Its shared types (dict, list,
    Lock, Queue, ...) are registered, so ``SyncManager.dict`` exists as in
    CPython, and creating one raises like any other registered type."""


for _typeid in ('Queue', 'JoinableQueue', 'Event', 'Lock', 'RLock',
                'Semaphore', 'BoundedSemaphore', 'Condition', 'Barrier',
                'Pool', 'list', 'dict', 'Value', 'Array', 'Namespace'):
    SyncManager.register(_typeid)
del _typeid
