"""The event loop, and the accessors that find it.

WHAT THIS LOOP IS, AND IS NOT.  It is the callback/timer half of asyncio: a
ready queue, a timer heap, and Task stepping.  It is NOT a selector loop -- it
does no I/O multiplexing, so there are no add_reader / sock_recv / transports
here, and networking still goes through the blocking socket module.

That split is deliberate and is where the next increment goes.  GemStone
already has the readiness half: ``Processor whenReadable: sock signal: sem''
(and whenWritable:), which _socket_module.gs already uses to give ``select''
a true N-way wait -- the gem sleeps until the first socket is ready and other
green threads keep running.  Wiring that in is what turns this into a serving
loop; see docs/Support_FastAPI.md.

WHY A PURE-PYTHON LOOP RATHER THAN A SMALLTALK ONE.  The scheduling primitives
are GemStone's, but the thing being scheduled is a Python coroutine, and driving
one is ``coro.send(None)'' -- which is ordinary Python now that await
propagates suspensions.  Writing the loop in Python keeps it readable, keeps it
testable against CPython's own asyncio tests, and leaves exactly one Smalltalk
dependency: time.sleep, which is a GemStone Delay and so yields to the
ProcessScheduler instead of spinning the gem.
"""

import heapq
import time as _time

from asyncio import exceptions as _exceptions

# The loop currently RUNNING, and the loop merely SET for this session.  Two
# separate facts: get_running_loop() must raise when nothing is running even if
# a loop has been created, because that is the canonical "am I in async code?"
# test and library code (asgiref.local) depends on it raising.
_running_loop = None
_event_loop = None


class Handle:
    """A scheduled callback.  Cancellable, because a timer that fires after its
    waiter went away must do nothing rather than resurrect it."""

    def __init__(self, callback, args, loop):
        self._callback = callback
        self._args = args
        self._loop = loop
        self._cancelled = False

    def cancel(self):
        self._cancelled = True
        self._callback = None
        self._args = None

    def cancelled(self):
        return self._cancelled

    def _run(self):
        if self._cancelled:
            return
        self._callback(*self._args)


class TimerHandle(Handle):
    """A Handle with a deadline.  Ordered by it, so the heap answers 'what is
    due next'."""

    def __init__(self, when, callback, args, loop):
        super().__init__(callback, args, loop)
        self._when = when

    def __lt__(self, other):
        return self._when < other._when

    def __le__(self, other):
        return self._when <= other._when

    def when(self):
        return self._when


class AbstractEventLoop:
    """Present so ``isinstance(loop, asyncio.AbstractEventLoop)`` answers."""


class EventLoop(AbstractEventLoop):
    def __init__(self):
        self._ready = []
        self._scheduled = []
        self._stopping = False
        self._closed = False
        self._task_factory = None
        self._exception_handler = None

    # --- clock ------------------------------------------------------------

    def time(self):
        return _time.monotonic()

    # --- scheduling -------------------------------------------------------

    def call_soon(self, callback, *args):
        self._check_closed()
        handle = Handle(callback, args, self)
        self._ready.append(handle)
        return handle

    # A loop is single-threaded here (one gem, cooperative green threads), so
    # the threadsafe variant is the same call.  Named so cross-thread callers
    # from vendored code still work.
    call_soon_threadsafe = call_soon

    def call_later(self, delay, callback, *args):
        return self.call_at(self.time() + delay, callback, *args)

    def call_at(self, when, callback, *args):
        self._check_closed()
        timer = TimerHandle(when, callback, args, self)
        heapq.heappush(self._scheduled, timer)
        return timer

    # --- objects ----------------------------------------------------------

    def create_future(self):
        from asyncio import futures
        return futures.Future(loop=self)

    def create_task(self, coro, name=None):
        from asyncio import tasks
        task = tasks.Task(coro, loop=self)
        if name is not None:
            task.set_name(name)
        return task

    def set_task_factory(self, factory):
        self._task_factory = factory

    def get_task_factory(self):
        return self._task_factory

    # --- running ----------------------------------------------------------

    def is_running(self):
        return _running_loop is self

    def is_closed(self):
        return self._closed

    def _check_closed(self):
        if self._closed:
            raise RuntimeError('Event loop is closed')

    def stop(self):
        self._stopping = True

    def close(self):
        if self.is_running():
            raise RuntimeError('Cannot close a running event loop')
        self._closed = True
        self._ready = []
        self._scheduled = []

    def run_forever(self):
        global _running_loop
        self._check_closed()
        if _running_loop is not None:
            raise RuntimeError(
                'Cannot run the event loop while another loop is running')
        _running_loop = self
        self._stopping = False
        try:
            while True:
                self._run_once()
                if self._stopping:
                    break
        finally:
            _running_loop = None
            self._stopping = False

    def run_until_complete(self, future):
        """Run until ``future`` completes, then answer its result.

        A coroutine is wrapped in a Task first, which is what makes
        ``loop.run_until_complete(main())`` work at all -- a bare coroutine has
        nothing to drive it.
        """
        from asyncio import tasks
        self._check_closed()
        future = tasks.ensure_future(future, loop=self)
        future.add_done_callback(self._on_complete_stop)
        try:
            self.run_forever()
        finally:
            future.remove_done_callback(self._on_complete_stop)
        if not future.done():
            raise RuntimeError('Event loop stopped before Future completed.')
        return future.result()

    def _on_complete_stop(self, fut):
        self.stop()

    def _run_once(self):
        """One turn: wait if idle, promote due timers, run what is ready.

        THE WAIT IS THE ONLY PLACE THIS LOOP BLOCKS, and it blocks only when
        there is nothing at all to run -- so ``asyncio.sleep(0)`` never sleeps
        and a busy loop never waits.  time.sleep is a GemStone Delay, which
        suspends just this process and lets other green threads run, so waiting
        here does not freeze the gem.

        Only ONE ready item's worth of work is promoted per turn (the snapshot
        below), because a callback that calls call_soon must not have its own
        callback run in the same turn -- that is how a ``sleep(0)`` loop would
        starve the timer heap.
        """
        if not self._ready and self._scheduled:
            timeout = self._scheduled[0]._when - self.time()
            if timeout > 0:
                _time.sleep(timeout)

        now = self.time()
        while self._scheduled and self._scheduled[0]._when <= now:
            timer = heapq.heappop(self._scheduled)
            if not timer._cancelled:
                self._ready.append(timer)

        # Snapshot: callbacks added during this turn run on the NEXT one.
        pending = self._ready
        self._ready = []
        for handle in pending:
            if not handle._cancelled:
                handle._run()

    # --- error reporting --------------------------------------------------

    def set_exception_handler(self, handler):
        self._exception_handler = handler

    def get_exception_handler(self):
        return self._exception_handler

    def default_exception_handler(self, context):
        import sys
        message = context.get('message') or 'Unhandled error in event loop'
        sys.stderr.write('%s: %r\n' % (message, context.get('exception')))

    def call_exception_handler(self, context):
        if self._exception_handler is None:
            self.default_exception_handler(context)
        else:
            self._exception_handler(self, context)


# --- the accessors --------------------------------------------------------

def new_event_loop():
    return EventLoop()


def get_running_loop():
    """The loop running RIGHT NOW, or RuntimeError.

    Raising is the contract, not a limitation: this is the canonical "am I
    inside async code?" test, and callers such as asgiref.local rely on the
    exception to take their synchronous path.
    """
    if _running_loop is None:
        raise RuntimeError('no running event loop')
    return _running_loop


def _get_running_loop():
    """CPython's private accessor: the loop or None, no raising."""
    return _running_loop


def get_event_loop():
    """The running loop if there is one, else the one set for this session,
    creating it on first use."""
    global _event_loop
    if _running_loop is not None:
        return _running_loop
    if _event_loop is None:
        _event_loop = new_event_loop()
    return _event_loop


def set_event_loop(loop):
    global _event_loop
    _event_loop = loop


def get_event_loop_policy():
    return _Policy()


def set_event_loop_policy(policy):
    pass


def _get_event_loop_policy():
    """3.14 renamed the policy accessors to private names while deprecating
    them.  Both spellings are provided: the public pair is what older library
    code calls, the private pair is what CPython's own test suite calls --
    test_asyncgen's tearDown does ``asyncio.events._set_event_loop_policy(None)``
    for every test in AsyncGenAsyncioTest, so its absence failed 17 tests in
    teardown rather than in anything they were testing."""
    return get_event_loop_policy()


def _set_event_loop_policy(policy):
    set_event_loop_policy(policy)


class _Policy:
    """Just enough policy object for code that reaches through it."""

    def get_event_loop(self):
        return get_event_loop()

    def set_event_loop(self, loop):
        set_event_loop(loop)

    def new_event_loop(self):
        return new_event_loop()
