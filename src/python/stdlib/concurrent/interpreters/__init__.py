# GRAIL concurrent.interpreters -- the public surface, with no subinterpreters.
#
# CPython 3.14's module is a front end over the C module _interpreters, which
# runs a separate interpreter per OS thread.  A gem has one Python runtime per
# session and only green threads, so there is nothing to create: the names
# exist and the exception classes have CPython's bases, and every operation
# that would need a second interpreter raises InterpreterError.
#
# Why the module exists at all: anyio imports it unguarded at module scope on
# 3.14 (anyio/to_interpreter.py: `from concurrent.interpreters import
# ExecutionFailed, create`), and `import anyio` imports to_interpreter -- so
# without these names anyio, starlette and FastAPI cannot be imported, though
# none of them runs code in a subinterpreter unless asked to.

import queue as _queue

__all__ = [
    'get_current', 'get_main', 'create', 'list_all', 'is_shareable',
    'Interpreter',
    'InterpreterError', 'InterpreterNotFoundError', 'ExecutionFailed',
    'NotShareableError',
    'create_queue', 'Queue', 'QueueEmpty', 'QueueFull',
]

_UNSUPPORTED = 'subinterpreters are not supported in Grail'


class InterpreterError(Exception):
    """A cross-interpreter operation failed."""


class InterpreterNotFoundError(InterpreterError):
    """An interpreter was not found."""


class NotShareableError(TypeError):
    """An object cannot be shared between interpreters."""


class ExecutionFailed(InterpreterError):
    """An unhandled exception happened during execution."""

    def __init__(self, excinfo):
        msg = getattr(excinfo, 'formatted', None) or str(excinfo)
        super().__init__(msg)
        self.excinfo = excinfo


class QueueError(RuntimeError):
    """Indicates that a queue-related error happened."""


class QueueEmpty(QueueError, _queue.Empty):
    """Raised from get_nowait() when the queue is empty."""


class QueueFull(QueueError, _queue.Full):
    """Raised from put_nowait() when the queue is full."""


class Interpreter:
    """A single Python interpreter.  Grail cannot create one."""

    def __new__(cls, id, /, _whence=None, _ownsref=None):
        raise InterpreterError(_UNSUPPORTED)


class Queue:
    """A cross-interpreter queue.  Grail cannot create one."""

    def __new__(cls, id, /):
        raise InterpreterError(_UNSUPPORTED)


def create():
    """Return a new (idle) Python interpreter."""
    raise InterpreterError(_UNSUPPORTED)


def create_queue(maxsize=0, *, unbounditems=None):
    """Return a new cross-interpreter queue."""
    raise InterpreterError(_UNSUPPORTED)


def list_all():
    """Return all existing interpreters."""
    raise InterpreterError(_UNSUPPORTED)


def get_current():
    """Return the currently running interpreter."""
    raise InterpreterError(_UNSUPPORTED)


def get_main():
    """Return the main interpreter."""
    raise InterpreterError(_UNSUPPORTED)


def is_shareable(obj):
    """Return True if the object's data may be shared between interpreters.

    CPython's answer, for the types it lists as shareable."""
    return obj is None or type(obj) in (bool, int, float, str, bytes) or (
        type(obj) is tuple and all(is_shareable(o) for o in obj))
