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

import contextvars as _contextvars
import inspect as _inspect
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

    def __init__(self, coro, loop=None, name=None, context=None,
                 eager_start=False):
        if loop is None:
            loop = _events.get_event_loop()
        super().__init__(loop=loop)
        self._coro = coro
        # Every step runs inside this context, so writes the coroutine makes
        # with ContextVar.set land here rather than in whatever context is
        # current when the loop happens to reach the step.  A task given no
        # context gets a COPY of its creator's: it starts from what the creator
        # could see, and its own writes do not travel back.
        if context is None:
            context = _contextvars.copy_context()
        self._context = context
        self._name = name or 'Task-%d' % (id(self),)
        self._fut_waiter = None
        self._must_cancel = False
        # A COUNT, not a flag.  See cancelling()/uncancel() below for why
        # TaskGroup cannot work without the counting version.
        self._num_cancels_requested = 0
        _all_tasks.add(self)
        # EAGER START runs the coroutine synchronously, here, up to its first
        # suspension -- instead of scheduling the first step and returning to
        # the loop.  ``is_running`` is upstream's guard and it is load-bearing:
        # outside a running loop there is nothing to be eager relative to, and
        # stepping a coroutine that immediately awaits would have no loop to
        # register the wait with.
        if eager_start and self._loop.is_running():
            self._eager_start()
        else:
            self._loop.call_soon(self._step)

    def __repr__(self):
        return '<Task %s %s>' % (self._name, self._state)

    def get_name(self):
        return self._name

    def set_name(self, value):
        self._name = str(value)

    def get_coro(self):
        return self._coro

    def get_stack(self, *, limit=None):
        """The suspended coroutine's frame chain -- one lightweight frame
        here (Grail's PyFrame carrier has no f_back chain to walk), an empty
        list for a finished task, which is the half CPython's own tests
        lean on.  test_async_gen_aclose_compatible_with_get_stack only
        requires the call to exist and not raise."""
        if self.done():
            return []
        frame = getattr(self._coro, 'cr_frame', None)
        if frame is None:
            return []
        return [frame]

    def get_context(self):
        return self._context

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
        self._num_cancels_requested += 1
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
        """How many times cancel() has been called and not yet uncancelled.

        A COUNT, and the counting is load-bearing rather than pedantic: it is
        how a nested construct tells "I cancelled the parent myself, to unwind
        it" apart from "somebody outside cancelled the parent".  TaskGroup is
        built on exactly that distinction --

            if self._parent_task.cancelling():
                self._parent_task.uncancel()
                self._parent_task.cancel()

        keeps an outside cancellation counted while the group re-raises, and

            if self._parent_task.uncancel() == 0:
                propagate_cancellation_error = None

        is what stops a group that cancelled its OWN parent from leaking a
        CancelledError to the caller.

        This used to answer ``1 if self._cancel_requested else 0``, a flag.  The
        flag is indistinguishable from the count for one cancel and wrong for
        every case with two, which is the whole of what these tests exercise.
        """
        return self._num_cancels_requested

    def uncancel(self):
        """Undo one cancel() request, answering how many remain.

        Answering the REMAINING count (upstream does) rather than always 0
        (Grail did): a caller uses it to decide whether anyone else still wants
        this task cancelled.  Clearing _must_cancel only when the count reaches
        zero is the other half -- otherwise uncancelling one of two requests
        would let the task run on with nobody having withdrawn anything.
        """
        if self._num_cancels_requested > 0:
            self._num_cancels_requested -= 1
            if self._num_cancels_requested == 0:
                self._must_cancel = False
        return self._num_cancels_requested

    # --- the driver -------------------------------------------------------

    def _eager_start(self):
        """Drive the first step inline, restoring whoever was running before.

        The subtlety is the current-task slot.  Eager start happens INSIDE
        another task's step -- that is the whole point, a task created by
        running code -- so ``_current_tasks[loop]`` already names the creator.
        ``_step`` sets the slot to itself and, in its ``finally``, DELETES it;
        that is correct for a step the loop drove, where nothing was running
        underneath, and wrong here, because it would leave the creator with no
        current task for the rest of its own step.  ``current_task()`` would
        answer None inside a perfectly ordinary coroutine.

        So save and restore around it rather than letting the delete stand.
        Upstream does the same thing with a swap and asserts the swap-back
        returned self; the assertion is what tells you the nesting held.
        """
        prev = _current_tasks.get(self._loop)
        try:
            self._step()
        finally:
            if prev is None:
                _current_tasks.pop(self._loop, None)
            else:
                _current_tasks[self._loop] = prev

    def _step(self, exc=None):
        """Enter the task's context, then take one step inside it.

        Split in two rather than wrapping at every call site: _step is reached
        from call_soon, from _wakeup, and from _eager_start, and a context
        applied at only some of those would make a variable's visibility depend
        on HOW the step was reached.
        """
        self._context.run(self._step_in_context, exc)

    def _step_in_context(self, exc=None):
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

def create_eager_task_factory(custom_task_constructor):
    """Create a function suitable for use as a task factory on an event-loop.

    Example usage:

        loop.set_task_factory(
            asyncio.create_eager_task_factory(my_task_constructor))

    Now, tasks created will be started immediately (rather than being first
    scheduled to an event loop).  The constructor argument can be any
    callable that returns a Task-compatible object and has a signature
    compatible with `Task.__init__`; it must have the `eager_start`
    keyword argument.

    Most applications will use `Task` for `custom_task_constructor` and in
    this case there's no need to call `create_eager_task_factory()`
    directly. Instead the  global `eager_task_factory` instance can be
    used. E.g. `loop.set_task_factory(asyncio.eager_task_factory)`.
    """

    def factory(loop, coro, *, eager_start=True, **kwargs):
        return custom_task_constructor(
            coro, loop=loop, eager_start=eager_start, **kwargs)

    return factory


eager_task_factory = create_eager_task_factory(Task)


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


def create_task(coro, name=None, context=None):
    """Schedule a coroutine on the RUNNING loop.  Requires one, by design:
    creating a task with no loop running is the mistake this reports.

    Delegates to ``loop.create_task`` rather than constructing a Task, which
    is what upstream does and is not a stylistic point: the loop is where the
    task FACTORY lives, so building a Task here would ignore any factory the
    application installed -- including the eager one -- for every caller who
    reached for the module-level spelling.
    """
    loop = _events.get_running_loop()
    return loop.create_task(coro, name=name, context=context)


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


# The concurrent.futures constants, by value: CPython re-exports them from
# there, and callers compare with == against these exact strings.
FIRST_COMPLETED = 'FIRST_COMPLETED'
FIRST_EXCEPTION = 'FIRST_EXCEPTION'
ALL_COMPLETED = 'ALL_COMPLETED'


async def wait(fs, *, timeout=None, return_when=ALL_COMPLETED):
    """Wait for the futures in fs; answer the (done, pending) sets.

    Validation order and wording are CPython's, probed on 3.14: a single
    future or coroutine (a common slip for wait([fut])) is a TypeError
    naming its type; an empty iterable is a ValueError; return_when is
    checked BEFORE the no-coroutines rule; and coroutines are refused
    outright (3.11 removed the auto-wrapping) since wait() gives no way
    back to the task that would have wrapped them.
    """
    if _futures.isfuture(fs) or _inspect.iscoroutine(fs):
        raise TypeError(f"expect a list of futures, not {type(fs).__name__}")
    if not fs:
        raise ValueError('Set of Tasks/Futures is empty.')
    if return_when not in (FIRST_COMPLETED, FIRST_EXCEPTION, ALL_COMPLETED):
        raise ValueError(f'Invalid return_when value: {return_when}')
    fs = set(fs)
    if any(_inspect.iscoroutine(f) for f in fs):
        raise TypeError('Passing coroutines is forbidden, use tasks explicitly.')
    loop = _events.get_running_loop()

    waiter = loop.create_future()
    timeout_handle = None
    if timeout is not None:
        timeout_handle = loop.call_later(
            timeout, _futures._set_result_unless_cancelled, waiter, None)
    counter = len(fs)

    def _on_completion(f):
        nonlocal counter
        counter -= 1
        if (counter <= 0
                or return_when == FIRST_COMPLETED
                or (return_when == FIRST_EXCEPTION
                    and not f.cancelled()
                    and f.exception() is not None)):
            if timeout_handle is not None:
                timeout_handle.cancel()
            if not waiter.done():
                waiter.set_result(None)

    for f in fs:
        f.add_done_callback(_on_completion)
    try:
        await waiter
    finally:
        if timeout_handle is not None:
            timeout_handle.cancel()
        for f in fs:
            f.remove_done_callback(_on_completion)

    done, pending = set(), set()
    for f in fs:
        if f.done():
            done.add(f)
        else:
            pending.add(f)
    return done, pending
