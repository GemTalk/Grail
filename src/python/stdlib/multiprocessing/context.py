"""GRAIL minimal multiprocessing.context.

The start-method contexts exist so that code naming them at IMPORT time
loads -- uvicorn's _subprocess does ``from multiprocessing.context import
SpawnProcess'' and ``multiprocessing.get_context("spawn")'' at module
level, so without them ``import uvicorn'' fails even for a program that
never starts a worker.  Every Process class here is the package's own
Process, which raises when constructed: Grail cannot fork a gem, and the
rule in multiprocessing/__init__.py (fail at the decision, not later)
applies unchanged.
"""

from multiprocessing import Process as _UnsupportedProcess, cpu_count

__all__ = ['BaseContext', 'DefaultContext', 'ForkProcess', 'SpawnProcess',
           'ForkServerProcess', 'Process', 'ProcessError', 'BufferTooShort',
           'TimeoutError', 'AuthenticationError', 'get_context',
           'get_all_start_methods', 'get_start_method', 'set_start_method']


# Where CPython defines them, so pickle's _compat_pickle mapping
# (``multiprocessing.ProcessError'' <-> ``multiprocessing.context'') finds
# each name in the module it names (test_pickle's CompatPickleTests).
class ProcessError(Exception):
    pass


class BufferTooShort(ProcessError):
    pass


class TimeoutError(ProcessError):
    pass


class AuthenticationError(ProcessError):
    pass


Process = _UnsupportedProcess

_METHODS = ('fork', 'spawn', 'forkserver')


class ForkProcess(_UnsupportedProcess):
    _start_method = 'fork'


class SpawnProcess(_UnsupportedProcess):
    _start_method = 'spawn'


class ForkServerProcess(_UnsupportedProcess):
    _start_method = 'forkserver'


_PROCESS_FOR = {'fork': ForkProcess, 'spawn': SpawnProcess,
                'forkserver': ForkServerProcess}


class BaseContext:
    _name = None

    def __init__(self, method=None):
        self._name = method

    @property
    def Process(self):
        return _PROCESS_FOR.get(self._name, _UnsupportedProcess)

    def cpu_count(self):
        return cpu_count()

    def get_context(self, method=None):
        return get_context(method)

    def get_start_method(self, allow_none=False):
        return self._name

    def get_all_start_methods(self):
        return list(_METHODS)

    def allow_connection_pickling(self):
        pass


_default_method = None


def get_context(method=None):
    if method is None:
        method = _default_method or 'spawn'
    if method not in _METHODS:
        raise ValueError('cannot find context for %r' % (method,))
    return BaseContext(method)


def get_start_method(allow_none=False):
    if _default_method is None and allow_none:
        return None
    return _default_method or 'spawn'


def get_all_start_methods():
    return list(_METHODS)


def set_start_method(method, force=False):
    global _default_method
    if _default_method is not None and not force:
        raise RuntimeError('context has already been set')
    if method is not None and method not in _METHODS:
        raise ValueError('cannot find context for %r' % (method,))
    _default_method = method


DefaultContext = BaseContext
