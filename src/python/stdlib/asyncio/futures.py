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
    __class_getitem__ = classmethod(type(list[int]))  # types.GenericAlias, as CPython's

    # Read by Task._step to tell "a future was awaited" from "a bare yield".
    # CPython uses the same attribute name for the same purpose, so third-party
    # future-likes that set it interoperate.
    _asyncio_future_blocking = False

    # The message from ``cancel(msg=...)``, as a CLASS attribute so it reads
    # safely on a future that was never cancelled -- which is how CPython does
    # it too.  See _make_cancelled_error.
    _cancel_message = None

    # Which futures are awaiting this one -- see future_add_to_awaited_by at
    # the bottom of this module.  Declared here (rather than assigned in
    # __init__) so it reads on every future without costing one a set it never
    # needs.  The leading double underscore MANGLES this to
    # _Future__asyncio_awaited_by, which is the name those two module-level
    # functions use; that is upstream's own arrangement, kept verbatim, and
    # Grail mangles identically (measured).
    __asyncio_awaited_by = None

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

    def _make_cancelled_error(self):
        """The CancelledError this future's cancellation should raise.

        CPython's own helper, and the reason it exists is ``cancel(msg=...)``:
        the message has to reach the exception the awaiting coroutine actually
        sees, so `task.cancel(msg="foo")` produces `CancelledError("foo")`.
        Grail stored _cancel_message and then raised a bare CancelledError
        everywhere, so the message was silently dropped -- which upstream's
        test_locks catches twice (test_cancelled_error_wakeup and
        test_cancelled_error_re_aquire assert args == ("foo",))."""
        if self._cancel_message is None:
            return _exceptions.CancelledError()
        return _exceptions.CancelledError(self._cancel_message)

    def result(self):
        if self._state == _CANCELLED:
            raise self._make_cancelled_error()
        if self._state != _FINISHED:
            raise _exceptions.InvalidStateError('Result is not set.')
        if self._exception is not None:
            raise self._exception
        return self._result

    def exception(self):
        if self._state == _CANCELLED:
            raise self._make_cancelled_error()
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

    def add_done_callback(self, fn, *, context=None):
        """Callbacks are always scheduled through the loop, never run inline.

        Running one inline would let a callback execute in the middle of
        whatever called set_result(), which is how re-entrancy bugs get in --
        CPython is equally strict about it.

        Stored as CPython stores them, ``(fn, context)`` pairs, and run in that
        context: anyio walks ``task._callbacks`` unpacking exactly that shape
        (find_root_task, which every ``to_thread.run_sync`` calls) and passes
        ``context=`` itself.
        """
        if context is None:
            import contextvars
            context = contextvars.copy_context()
        if self._state != _PENDING:
            self._loop.call_soon(fn, self, context=context)
        else:
            self._callbacks.append((fn, context))

    def remove_done_callback(self, fn):
        filtered = [(f, ctx) for (f, ctx) in self._callbacks if f != fn]
        removed = len(self._callbacks) - len(filtered)
        self._callbacks = filtered
        return removed

    def _schedule_callbacks(self):
        callbacks = self._callbacks
        if not callbacks:
            return
        self._callbacks = []
        for callback, ctx in callbacks:
            self._loop.call_soon(callback, self, context=ctx)

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


# --- the "awaited by" graph ------------------------------------------------
#
# CPython 3.14 records, per future, which futures are awaiting it, so that
# asyncio's introspection tools can draw the await graph of a running program.
# Nothing in the scheduler consults it -- TaskGroup calls these two on every
# task it creates and retires, and that is the whole of the dependency.
#
# Implemented as an attribute on the future rather than a global dict for the
# reason upstream gives in its own comment: a global would hold strong
# references, and any "add" not followed by a "discard" would leak.
#
# The attribute is declared in the class body as ``__asyncio_awaited_by``, which
# MANGLES to ``_Future__asyncio_awaited_by`` -- the name written out here,
# because mangling only applies inside a class body and these are module-level
# functions.  Upstream's own arrangement, kept as-is; Grail mangles the same way
# (measured, both directions).
#
# Upstream restricts both functions to real Future subclasses and silently does
# nothing otherwise.  Kept, deliberately: a duck-typed future that never asked
# to be in the graph should not become an error at a call site that only wants
# bookkeeping.


def future_add_to_awaited_by(fut, waiter, /):
    """Record that `fut` is awaited on by `waiter`."""
    if isinstance(fut, Future) and isinstance(waiter, Future):
        if fut._Future__asyncio_awaited_by is None:
            fut._Future__asyncio_awaited_by = set()
        fut._Future__asyncio_awaited_by.add(waiter)


def future_discard_from_awaited_by(fut, waiter, /):
    """Record that `fut` is no longer awaited on by `waiter`."""
    if isinstance(fut, Future) and isinstance(waiter, Future):
        if fut._Future__asyncio_awaited_by is not None:
            fut._Future__asyncio_awaited_by.discard(waiter)
            if not fut._Future__asyncio_awaited_by:
                # Drop the empty set rather than keep it: a long-lived future
                # that was briefly awaited should not carry the container.
                fut._Future__asyncio_awaited_by = None


# --- bridging to concurrent.futures ----------------------------------------
#
# CPython's, nearly verbatim: how a thread-pool result reaches a coroutine
# (wrap_future, under loop.run_in_executor and asyncio.to_thread) and how a
# coroutine's result reaches a thread (run_coroutine_threadsafe).  Grail's
# threads are cooperative green threads, so "another thread" here is another
# GsProcess in the same gem; the cross-loop hop is still call_soon_threadsafe,
# which is what wakes a loop that is waiting with nothing else due.
#
# concurrent.futures is imported where it is used rather than at the top: it
# pulls in threading and logging, and most asyncio programs never cross a
# thread.


def _get_loop(fut):
    return fut.get_loop()


def _convert_future_exc(exc):
    import concurrent.futures
    exc_class = type(exc)
    if exc_class is concurrent.futures.CancelledError:
        return _exceptions.CancelledError(*exc.args).with_traceback(exc.__traceback__)
    elif exc_class is concurrent.futures.InvalidStateError:
        return _exceptions.InvalidStateError(*exc.args).with_traceback(exc.__traceback__)
    else:
        return exc


def _set_concurrent_future_state(concurrent, source):
    """Copy state from a future to a concurrent.futures.Future."""
    assert source.done()
    if source.cancelled():
        concurrent.cancel()
    if not concurrent.set_running_or_notify_cancel():
        return
    exception = source.exception()
    if exception is not None:
        concurrent.set_exception(_convert_future_exc(exception))
    else:
        result = source.result()
        concurrent.set_result(result)


def _copy_future_state(source, dest):
    """Internal helper to copy state from another Future.

    The other Future must be a concurrent.futures.Future.
    """
    assert source.done()
    if dest.cancelled():
        return
    assert not dest.done()
    if source.cancelled():
        dest.cancel()
    else:
        exception = source.exception()
        if exception is not None:
            dest.set_exception(_convert_future_exc(exception))
        else:
            result = source.result()
            dest.set_result(result)


def _chain_future(source, destination):
    """Chain two futures so that when one completes, so does the other.

    The result (or exception) of source will be copied to destination.
    If destination is cancelled, source gets cancelled too.
    Compatible with both asyncio.Future and concurrent.futures.Future.
    """
    import concurrent.futures
    if not isfuture(source) and not isinstance(source,
                                               concurrent.futures.Future):
        raise TypeError('A future is required for source argument')
    if not isfuture(destination) and not isinstance(destination,
                                                    concurrent.futures.Future):
        raise TypeError('A future is required for destination argument')
    source_loop = _get_loop(source) if isfuture(source) else None
    dest_loop = _get_loop(destination) if isfuture(destination) else None

    def _set_state(future, other):
        if isfuture(future):
            _copy_future_state(other, future)
        else:
            _set_concurrent_future_state(future, other)

    def _call_check_cancel(destination):
        if destination.cancelled():
            if source_loop is None or source_loop is dest_loop:
                source.cancel()
            else:
                source_loop.call_soon_threadsafe(source.cancel)

    def _call_set_state(source):
        if (destination.cancelled() and
                dest_loop is not None and dest_loop.is_closed()):
            return
        if dest_loop is None or dest_loop is source_loop:
            _set_state(destination, source)
        else:
            if dest_loop.is_closed():
                return
            dest_loop.call_soon_threadsafe(_set_state, destination, source)

    destination.add_done_callback(_call_check_cancel)
    source.add_done_callback(_call_set_state)


def wrap_future(future, *, loop=None):
    """Wrap concurrent.futures.Future object."""
    import concurrent.futures
    if isfuture(future):
        return future
    assert isinstance(future, concurrent.futures.Future), \
        f'concurrent.futures.Future is expected, got {future!r}'
    if loop is None:
        loop = _events.get_event_loop()
    new_future = loop.create_future()
    _chain_future(future, new_future)
    return new_future
