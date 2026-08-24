"""asyncio exception types.

Separate module because CPython's is, and library code imports it directly
(``from asyncio.exceptions import CancelledError``).

CancelledError descends from BaseException, not Exception, and that is
load-bearing rather than trivia: cancellation must not be swallowed by the
``except Exception`` that wraps almost every task body.  It moved out of
Exception in 3.8 for exactly that reason.
"""

import builtins as _builtins


class CancelledError(BaseException):
    """The task or future was cancelled."""


class InvalidStateError(Exception):
    """The operation is not allowed in this state (result() on a pending
    future, set_result() on a finished one)."""


# NOT a class of our own, deliberately.  Upstream spells this
#
#     TimeoutError = TimeoutError  # make local alias for the standard exception
#
# because in 3.11 asyncio.TimeoutError BECAME the builtin.  Defining a separate
# Exception subclass here (as this module used to) reads the same at the
# raise site and is wrong at every catch site: code that writes the modern
# ``except TimeoutError`` -- the builtin, which is what any 3.11+ codebase and
# every upstream test does -- would not catch what wait_for raises.  Found by
# test.test_asyncio.test_queues, whose
# test_cancelled_getters_not_being_held_in_self_getters does exactly that and
# let the "wrong" TimeoutError escape its assertRaises.
#
# The builtin also descends from OSError, which a bare ``Exception`` subclass
# does not, so ``except OSError`` around a timing-out await behaved differently
# too.
#
# Written as an explicit read from builtins rather than upstream's
# self-referential assignment: the plain ``TimeoutError = TimeoutError`` relies
# on the name resolving to the builtin while the module-level binding for it is
# being created, which is a fine thing to depend on in CPython and not a thing
# to depend on here.
TimeoutError = _builtins.TimeoutError


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
