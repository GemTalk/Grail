"""asyncio.Future -- the thing a coroutine parks on.

``Future.__await__`` is the entire reason an event loop can exist:

    def __await__(self):
        if not self.done():
            yield self          # hand ourselves to whoever is driving
        return self.result()

The loop receives the future at its own ``send()``, registers a callback, and
resumes the coroutine when the future resolves.  A runtime that cannot
propagate that yield out through nested awaits cannot host a loop at all, which
is why Grail could not until ``await`` started delegating (PythonGenerator >>
___grailAwait___:).

Kept deliberately small.  This is the subset the corpus actually reaches --
result / exception / cancel / done callbacks -- not CPython's full C-accelerated
Future.  No __log_traceback / _asyncio C module / debug hooks.
"""

from asyncio import exceptions as _exceptions
from asyncio import events as _events

_PENDING = 'PENDING'
_CANCELLED = 'CANCELLED'
_FINISHED = 'FINISHED'


class Future:
    """A result that is not available yet."""

    # Read by Task._step to tell "a future was awaited" from "a bare yield".
    # CPython uses the same attribute name for the same purpose, so third-party
    # future-likes that set it interoperate.
    _asyncio_future_blocking = False

    def __init__(self, loop=None):
        if loop is None:
            loop = _events.get_event_loop()
        self._loop = loop
        self._state = _PENDING
        self._result = None
        self._exception = None
        self._callbacks = []

    def __repr__(self):
        return '<Future %s>' % (self._state,)

    def get_loop(self):
        return self._loop

    # --- state ------------------------------------------------------------

    def done(self):
        return self._state != _PENDING

    def cancelled(self):
        return self._state == _CANCELLED

    def result(self):
        if self._state == _CANCELLED:
            raise _exceptions.CancelledError()
        if self._state != _FINISHED:
            raise _exceptions.InvalidStateError('Result is not set.')
        if self._exception is not None:
            raise self._exception
        return self._result

    def exception(self):
        if self._state == _CANCELLED:
            raise _exceptions.CancelledError()
        if self._state != _FINISHED:
            raise _exceptions.InvalidStateError('Exception is not set.')
        return self._exception

    # --- completion -------------------------------------------------------

    def set_result(self, result):
        if self._state != _PENDING:
            raise _exceptions.InvalidStateError(
                'invalid state: %s' % (self._state,))
        self._result = result
        self._state = _FINISHED
        self._schedule_callbacks()

    def set_exception(self, exception):
        if self._state != _PENDING:
            raise _exceptions.InvalidStateError(
                'invalid state: %s' % (self._state,))
        if isinstance(exception, type):
            exception = exception()
        self._exception = exception
        self._state = _FINISHED
        self._schedule_callbacks()

    def cancel(self, msg=None):
        """Cancel the future.  True if it was still pending."""
        if self._state != _PENDING:
            return False
        self._state = _CANCELLED
        self._cancel_message = msg
        self._schedule_callbacks()
        return True

    # --- callbacks --------------------------------------------------------

    def add_done_callback(self, callback):
        """Callbacks are always scheduled through the loop, never run inline.

        Running one inline would let a callback execute in the middle of
        whatever called set_result(), which is how re-entrancy bugs get in --
        CPython is equally strict about it.
        """
        if self._state != _PENDING:
            self._loop.call_soon(callback, self)
        else:
            self._callbacks.append(callback)

    def remove_done_callback(self, callback):
        filtered = [cb for cb in self._callbacks if cb != callback]
        removed = len(self._callbacks) - len(filtered)
        self._callbacks = filtered
        return removed

    def _schedule_callbacks(self):
        callbacks = self._callbacks
        if not callbacks:
            return
        self._callbacks = []
        for callback in callbacks:
            self._loop.call_soon(callback, self)

    # --- awaiting ---------------------------------------------------------

    def __await__(self):
        """THE MECHANISM.  Yielding self is how the coroutine hands control to
        the loop; the loop resumes it once the result is in.

        The recheck after the yield is not paranoia: it catches a driver that
        resumed us without the future having completed, which would otherwise
        surface as a confusing InvalidStateError from result() somewhere else.
        """
        if not self.done():
            self._asyncio_future_blocking = True
            yield self
        if not self.done():
            raise RuntimeError('await was not used with future')
        return self.result()

    # ``yield from fut`` in generator-based coroutines is the same operation.
    __iter__ = __await__


def isfuture(obj):
    """True for a Future or anything advertising the future protocol.

    Duck-typed on _asyncio_future_blocking rather than isinstance, exactly as
    CPython does, so a third-party future-like works with our Task.
    """
    return (hasattr(obj.__class__, '_asyncio_future_blocking')
            and obj._asyncio_future_blocking is not None)


def _set_result_unless_cancelled(fut, result):
    """Helper for timers: a fired timer must not resurrect a cancelled future."""
    if fut.cancelled():
        return
    fut.set_result(result)
