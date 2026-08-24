"""asyncio exception types.

Separate module because CPython's is, and library code imports it directly
(``from asyncio.exceptions import CancelledError``).

CancelledError descends from BaseException, not Exception, and that is
load-bearing rather than trivia: cancellation must not be swallowed by the
``except Exception`` that wraps almost every task body.  It moved out of
Exception in 3.8 for exactly that reason.
"""


class CancelledError(BaseException):
    """The task or future was cancelled."""


class InvalidStateError(Exception):
    """The operation is not allowed in this state (result() on a pending
    future, set_result() on a finished one)."""


class TimeoutError(Exception):
    """The operation exceeded the given deadline."""


class IncompleteReadError(EOFError):
    """Incomplete read from a stream. Present for import compatibility."""

    def __init__(self, partial, expected):
        super().__init__("%d bytes read on a total of %r expected bytes"
                         % (len(partial), expected))
        self.partial = partial
        self.expected = expected


class LimitOverrunError(Exception):
    """Reached the buffer size limit while looking for a separator."""

    def __init__(self, message, consumed):
        super().__init__(message)
        self.consumed = consumed


class SendfileNotAvailableError(RuntimeError):
    """sendfile() is not available for this socket or file type."""


class BrokenBarrierError(RuntimeError):
    """Barrier is broken by barrier.abort() call."""
