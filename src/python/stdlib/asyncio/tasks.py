"""Task, sleep, and the helpers that wrap coroutines.

A Task is a Future that drives a coroutine.  ``_step`` is the whole of it: send
into the coroutine, look at what came back, and decide what to do next.

    StopIteration   the coroutine returned      -> set_result
    a Future        it awaited something         -> resume when that completes
    None            it yielded control (sleep 0) -> reschedule immediately
    an exception     it raised                   -> set_exception

Every one of those depends on a suspension inside the coroutine reaching this
send(), through however many nested awaits -- which is what
PythonGenerator >> ___grailAwait___: made possible.
"""

import types as _types

from asyncio import events as _events
from asyncio import exceptions as _exceptions
from asyncio import futures as _futures

# CPython keeps this in a WeakSet so a finished task can be collected.  A plain
# set here, cleared as tasks finish: Grail's weakref exists but a weak-keyed
# collection is the one thing this GemStone does not offer (see
# ExecBlockAttrs), and an unbounded strong set in a gem that serves requests for
# hours is exactly the leak worth avoiding.  Discarding on completion gets the
# same bound without needing weakness.
_all_tasks = set()
_current_tasks = {}


class Task(_futures.Future):
    """A coroutine being driven by the loop."""

    # The CancelledError instance the coroutine actually raised, kept so that
    # awaiting a cancelled task re-raises THAT object.  Class attribute, so it
    # reads safely on a task that was never cancelled.
    _cancelled_exc = None

    def __init__(self, coro, loop=None, name=None):
        if loop is None:
            loop = _events.get_event_loop()
        super().__init__(loop=loop)
        self._coro = coro
        self._name = name or 'Task-%d' % (id(self),)
        self._fut_waiter = None
        self._must_cancel = False
        self._cancel_requested = False
        _all_tasks.add(self)
        self._loop.call_soon(self._step)

    def __repr__(self):
        return '<Task %s %s>' % (self._name, self._state)

    def get_name(self):
        return self._name

    def set_name(self, value):
        self._name = str(value)

    def get_coro(self):
        return self._coro

    # --- cancellation -----------------------------------------------------

    def cancel(self, msg=None):
        """Request cancellation.

        NOT the same as Future.cancel: a task is running code, so it cannot
        simply be marked cancelled -- CancelledError has to be raised INSIDE
        the coroutine, at whatever it is parked on, so its ``finally`` blocks
        run where they were written.  If it is parked on another future we
        cancel that; otherwise we set a flag and throw at the next step.
        """
        if self.done():
            return False
        self._cancel_requested = True
        # Kept for the _must_cancel path below, where there is no future to
        # carry it: without this, ``cancel(msg="foo")`` on a task that is not
        # parked on a future lost the message and the coroutine saw a bare
        # CancelledError.
        self._cancel_message = msg
        if self._fut_waiter is not None:
            if self._fut_waiter.cancel(msg=msg):
                return True
        self._must_cancel = True
        return True

    def _make_cancelled_error(self):
        """The exception awaiting this task should see.

        A task differs from a plain future here: the CancelledError that ended
        it is a real object the coroutine already raised, and callers are
        entitled to that object rather than a fresh one.  Falls back to
        Future's message-carrying construction when the task was cancelled
        without ever running (no coroutine, so no instance to keep)."""
        if self._cancelled_exc is not None:
            return self._cancelled_exc
        return super()._make_cancelled_error()

    def cancelling(self):
        return 1 if self._cancel_requested else 0

    def uncancel(self):
        self._cancel_requested = False
        return 0

    # --- the driver -------------------------------------------------------

    def _step(self, exc=None):
        if self.done():
            return
        if self._must_cancel:
            if not isinstance(exc, _exceptions.CancelledError):
                exc = self._make_cancelled_error()
            self._must_cancel = False
        coro = self._coro
        self._fut_waiter = None
        _current_tasks[self._loop] = self
        try:
            if exc is None:
                result = coro.send(None)
            else:
                result = coro.throw(exc)
        except StopIteration as e:
            if self._must_cancel:
                self._must_cancel = False
                super().cancel(msg=self._cancel_message)
            else:
                super().set_result(e.value)
            _all_tasks.discard(self)
        except _exceptions.CancelledError as exc:
            # Keep the INSTANCE, not just its message.  ``super().cancel()`` is
            # Future.cancel(msg=None), which would reset _cancel_message and
            # lose what ``cancel(msg=...)`` recorded -- and awaiting the task
            # would raise a bare CancelledError.  CPython stores the exception
            # itself here for a second reason too: the caller is entitled to the
            # SAME object the coroutine raised (upstream's
            # test_cancelled_error_wakeup asserts identity, not just args).
            self._cancelled_exc = exc
            super().cancel()
            _all_tasks.discard(self)
        except BaseException as e:
            super().set_exception(e)
            _all_tasks.discard(self)
        else:
            if _futures.isfuture(result):
                # Parked on a future: resume when it completes.
                result.add_done_callback(self._wakeup)
                self._fut_waiter = result
                if self._must_cancel:
                    if result.cancel():
                        self._must_cancel = False
            elif result is None:
                # A bare yield -- ``await sleep(0)``, i.e. "let others run".
                self._loop.call_soon(self._step)
            else:
                self._loop.call_soon(
                    self._step,
                    RuntimeError('Task got bad yield: %r' % (result,)))
        finally:
            if _current_tasks.get(self._loop) is self:
                del _current_tasks[self._loop]

    def _wakeup(self, future):
        try:
            future.result()
        except BaseException as exc:
            self._step(exc)
        else:
            self._step()


# --- the public helpers ---------------------------------------------------

def current_task(loop=None):
    if loop is None:
        loop = _events._get_running_loop()
    return _current_tasks.get(loop)


def all_tasks(loop=None):
    """The set of tasks that have not finished.

    CPython filters by loop and by ``not done()``; both matter here because
    _all_tasks is a plain set and a task that finished between the caller's two
    statements would otherwise show up.
    """
    if loop is None:
        loop = _events._get_running_loop()
    return {t for t in list(_all_tasks) if t._loop is loop and not t.done()}


def ensure_future(coro_or_future, loop=None):
    """Wrap whatever was passed so it can be waited on."""
    if _futures.isfuture(coro_or_future):
        return coro_or_future
    if loop is None:
        loop = _events.get_event_loop()
    return Task(coro_or_future, loop=loop)


def create_task(coro, name=None):
    """Schedule a coroutine on the RUNNING loop.  Requires one, by design:
    creating a task with no loop running is the mistake this reports."""
    loop = _events.get_running_loop()
    task = Task(coro, loop=loop)
    if name is not None:
        task.set_name(name)
    return task


@_types.coroutine
def __sleep0():
    """``await sleep(0)`` -- yield control without a timer.

    A bare ``yield`` from a generator, which Task._step reads as "reschedule me
    immediately".  CPython spells it exactly this way, and @types.coroutine is
    what makes a generator awaitable there; in Grail a generator is already
    awaitable, so the decorator is an identity (types.coroutine) and this reads
    the same either way.
    """
    yield


async def sleep(delay, result=None):
    """Suspend for ``delay`` seconds.

    The zero case is not an optimisation -- it is a different operation.
    ``sleep(0)`` means "let everything else run once" and must not go near the
    timer heap, or a cooperative loop that yields with sleep(0) would take a
    real clock reading per turn.
    """
    if delay <= 0:
        await __sleep0()
        return result
    loop = _events.get_running_loop()
    future = loop.create_future()
    timer = loop.call_later(
        delay, _futures._set_result_unless_cancelled, future, result)
    try:
        return await future
    finally:
        timer.cancel()


async def gather(*coros_or_futures, return_exceptions=False):
    """Wait for all of them, answering results in the order passed.

    Order is by ARGUMENT, not completion -- callers index the result against
    their inputs, so completion order would be a quiet correctness bug.
    """
    if not coros_or_futures:
        return []
    loop = _events.get_event_loop()
    children = [ensure_future(c, loop=loop) for c in coros_or_futures]
    results = []
    for child in children:
        if return_exceptions:
            try:
                results.append(await child)
            except BaseException as exc:
                results.append(exc)
        else:
            results.append(await child)
    return results


async def wait_for(fut, timeout):
    """Await fut, cancelling it and raising TimeoutError if timeout elapses."""
    loop = _events.get_running_loop()
    if timeout is None:
        return await fut
    fut = ensure_future(fut, loop=loop)
    timed_out = []

    def _on_timeout():
        timed_out.append(True)
        fut.cancel()

    timer = loop.call_later(timeout, _on_timeout)
    try:
        try:
            return await fut
        except _exceptions.CancelledError:
            if timed_out:
                raise _exceptions.TimeoutError()
            raise
    finally:
        timer.cancel()


async def shield(arg):
    """Present for import compatibility; awaits without protecting."""
    return await ensure_future(arg)
