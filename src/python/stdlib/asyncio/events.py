"""The event loop: a ready queue, a timer heap, and I/O readiness.

WHAT MAKES THIS A SELECTOR LOOP.  The loop waits in ``select'' whenever any
socket is registered, so a turn with nothing to run sleeps until the first
socket is ready OR the first timer is due, whichever comes first -- which is
the property that separates a loop that can serve from a loop that can only
schedule.  Underneath, ``select'' is GemStone's per-socket readiness registry
(``Processor whenReadable: sock signal: aSemaphore'', and whenWritable:), so
the gem sleeps rather than polls and other green threads keep running; see
select.py and _socket_module.gs.

ONE DEVIATION, inherited from select and documented there: the reader/writer
tables are keyed by file descriptor as in CPython, but what is WATCHED is the
socket OBJECT, because GemStone's readiness events are keyed by GsSocket and
not by descriptor.  add_reader accepts either -- an int is resolved back
through _socket's fd registry -- so the CPython spelling
``loop.add_reader(sock.fileno(), cb)'' works as well as passing the socket.

STILL MISSING: transports and protocols.  ``sock_recv''/``sock_sendall'' and
friends are here, which is what a hand-written server or a stream-based one
needs, but there is no create_server / create_connection / StreamReader yet, so
an ASGI server cannot be pointed at this loop unmodified.  See
docs/Support_FastAPI.md.

WHY A PURE-PYTHON LOOP RATHER THAN A SMALLTALK ONE.  The scheduling primitives
are GemStone's, but the thing being scheduled is a Python coroutine, and driving
one is ``coro.send(None)'' -- which is ordinary Python now that await
propagates suspensions.  Writing the loop in Python keeps it readable, keeps it
testable against CPython's own asyncio tests, and leaves two Smalltalk
dependencies, both of which suspend only the calling green thread: time.sleep
(a GemStone Delay) and select.
"""

import errno as _errno
import heapq
import select as _select
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
        # fd -> (Handle, watchable).  Two tables, because a socket can be
        # waited on for reading and writing at once and the callbacks differ.
        self._readers = {}
        self._writers = {}
        self._stopping = False
        self._closed = False
        self._task_factory = None
        self._exception_handler = None
        self._debug = False

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

    # --- I/O readiness ----------------------------------------------------

    def _fileobj_to_fd(self, fileobj):
        """CPython keys these tables by descriptor, and so do we -- an int and
        the socket it came from must name the SAME registration or a caller
        that adds by socket and removes by fd leaks a watcher."""
        if isinstance(fileobj, int):
            return fileobj
        try:
            return int(fileobj.fileno())
        except (AttributeError, TypeError, ValueError):
            raise ValueError('invalid file object: %r' % (fileobj,))

    def _watchable(self, fileobj):
        """The object the readiness registry can actually watch.

        GemStone's readiness events are keyed by GsSocket rather than by
        descriptor, so ``select'' here takes socket OBJECTS (its own module
        docstring explains why an int cannot be registered).  This is where a
        descriptor is turned back into one: _socket keeps an fd registry --
        it has to, because accept() hands socket.py a descriptor to rebuild
        from -- so an fd belonging to a socket this session created resolves,
        and anything else raises rather than silently watching nothing.
        """
        if not isinstance(fileobj, int):
            return fileobj
        import _socket
        try:
            return _socket.socket(fileno=fileobj)
        except OSError as exc:
            raise ValueError(
                'file descriptor %r is not a socket this session knows: '
                'readiness events are keyed by socket, not by descriptor '
                '(%s)' % (fileobj, exc))

    def add_reader(self, fileobj, callback, *args):
        self._check_closed()
        fd = self._fileobj_to_fd(fileobj)
        self._readers[fd] = (Handle(callback, args, self), self._watchable(fileobj))

    def remove_reader(self, fileobj):
        """True if there was one to remove.  Callers use the answer -- and a
        remove must not raise for an fd that was never added, because the
        canonical shape is a ``finally'' that runs however the wait ended."""
        if self._closed:
            return False
        return self._readers.pop(self._fileobj_to_fd(fileobj), None) is not None

    def add_writer(self, fileobj, callback, *args):
        self._check_closed()
        fd = self._fileobj_to_fd(fileobj)
        self._writers[fd] = (Handle(callback, args, self), self._watchable(fileobj))

    def remove_writer(self, fileobj):
        if self._closed:
            return False
        return self._writers.pop(self._fileobj_to_fd(fileobj), None) is not None

    def _poll_io(self, timeout):
        """Wait for readiness, then promote the callbacks that fired.

        THIS IS THE ONLY PLACE A SERVING LOOP BLOCKS.  ``timeout'' is None only
        when there is nothing else at all to do, so the loop is free to sleep
        until a socket speaks; it is 0 when work is already queued, which makes
        this a poll.  Anything in between is a timer deadline, so a timer
        cannot be starved by an idle socket -- the wait ends at whichever comes
        first.

        Registrations are LEVEL-triggered, as CPython's selectors are: a socket
        that is still readable fires again next turn.  The waiters below remove
        their own registration once satisfied, so this does not re-run a
        finished read.
        """
        readers = []
        writers = []
        r_of = {}
        w_of = {}
        for fd, (_handle, watchable) in self._readers.items():
            readers.append(watchable)
            r_of[id(watchable)] = fd
        for fd, (_handle, watchable) in self._writers.items():
            writers.append(watchable)
            w_of[id(watchable)] = fd

        ready_r, ready_w, _x = _select.select(readers, writers, [], timeout)

        for obj in ready_r:
            entry = self._readers.get(r_of.get(id(obj)))
            if entry is not None:
                self._ready.append(entry[0])
        for obj in ready_w:
            entry = self._writers.get(w_of.get(id(obj)))
            if entry is not None:
                self._ready.append(entry[0])

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
        self._readers = {}
        self._writers = {}

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
        """One turn: wait for whatever is next, promote it, run what is ready.

        THE WAIT IS THE ONLY PLACE THIS LOOP BLOCKS, and how long for is
        decided by what there is to do: 0 if work is already queued -- so
        ``asyncio.sleep(0)`` never sleeps and a busy loop never waits -- the
        first timer's deadline if there is one, and otherwise unbounded.

        WHERE it waits is decided by whether any socket is registered.  With
        one, the wait happens inside select, so the loop wakes on readiness OR
        on the timer, whichever comes first; with none, it is a plain sleep.
        Both suspend only this green thread (select arms GemStone's readiness
        events, time.sleep is a Delay), so waiting here does not freeze the gem.

        Only ONE ready item's worth of work is promoted per turn (the snapshot
        below), because a callback that calls call_soon must not have its own
        callback run in the same turn -- that is how a ``sleep(0)`` loop would
        starve the timer heap.
        """
        timeout = 0 if self._ready else None
        if timeout is None and self._scheduled:
            timeout = max(0, self._scheduled[0]._when - self.time())

        if self._readers or self._writers:
            self._poll_io(timeout)
        elif timeout is None:
            # Nothing queued, no timer, nothing to watch: whatever this loop is
            # waiting for cannot arrive from inside it.  run_until_complete
            # always has at least its own task, so this is run_forever() on an
            # empty loop, which spins in CPython too.
            pass
        elif timeout > 0:
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

    def set_debug(self, enabled):
        """CPython gates several checks on this (and asyncio.run(debug=True)
        sets it), so code that turns it on must not fail on the attribute."""
        self._debug = bool(enabled)

    def get_debug(self):
        return self._debug

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

    # --- socket operations, as coroutines ---------------------------------
    #
    # Every one of these is the same shape: try the call, and if the socket
    # says it would have blocked, wait for readiness and try again.  That shape
    # is why PyRawSocket had to start raising BlockingIOError for the
    # non-blocking state instead of TimeoutError -- the two are siblings under
    # OSError, so the except clause below simply did not match and the first
    # attempt escaped as a timeout.
    #
    # CPython writes these as callback chains (_sock_recv_ready and friends)
    # because it cannot afford a coroutine frame per pending operation in C.
    # Here the loop is Python and a suspended coroutine is already a suspended
    # GsProcess, so the loop form is both shorter and easier to follow.

    def _check_nonblocking(self, sock):
        """Refuse a blocking socket -- ALWAYS, where CPython refuses only under
        set_debug(True).

        A deliberate deviation, and the reason is the cost of being wrong.  In
        CPython a blocking recv here stalls the loop; here it stalls the loop
        AND everything cooperating with it, with no thread left to notice, so
        the symptom is a hang rather than a slow call.  A ValueError at the call
        site names the mistake; a hang does not.  CPython's own message is used
        so the failure reads the same."""
        if sock.gettimeout() != 0:
            raise ValueError('the socket must be non-blocking')

    async def _wait_readable(self, sock):
        future = self.create_future()
        self.add_reader(sock, _set_result_unless_done, future, True)
        try:
            await future
        finally:
            # Removed here, BEFORE the caller can close the socket: fileno()
            # answers -1 once closed, so a later remove would look up the wrong
            # key and leave the watcher registered for good.
            self.remove_reader(sock)

    async def _wait_writable(self, sock):
        future = self.create_future()
        self.add_writer(sock, _set_result_unless_done, future, True)
        try:
            await future
        finally:
            self.remove_writer(sock)

    async def sock_recv(self, sock, n):
        self._check_nonblocking(sock)
        while True:
            try:
                return sock.recv(n)
            except (BlockingIOError, InterruptedError):
                await self._wait_readable(sock)

    async def sock_recv_into(self, sock, buf):
        self._check_nonblocking(sock)
        while True:
            try:
                return sock.recv_into(buf)
            except (BlockingIOError, InterruptedError):
                await self._wait_readable(sock)

    async def sock_sendall(self, sock, data):
        """Answers None, as CPython does: either everything was sent or it
        raised.  Which is why ``send`` rather than ``sendall`` is the primitive
        underneath -- a partial sendall cannot report how far it got, so the
        remainder has to be tracked out here."""
        self._check_nonblocking(sock)
        view = memoryview(data)
        total = len(view)
        sent = 0
        while sent < total:
            try:
                sent += sock.send(view[sent:])
            except (BlockingIOError, InterruptedError):
                await self._wait_writable(sock)
        return None

    async def sock_accept(self, sock):
        """The accepted socket comes back NON-BLOCKING, as in CPython: a server
        that then read from it with a blocking recv would stall every other
        connection on the loop."""
        self._check_nonblocking(sock)
        while True:
            try:
                conn, addr = sock.accept()
                conn.setblocking(False)
                return conn, addr
            except (BlockingIOError, InterruptedError):
                await self._wait_readable(sock)

    # A connect is re-polled at least this often even if no readiness event
    # arrives.  Short, because it only runs while a connect is outstanding, and
    # a connect is a brief thing; the timer is a safety net, not the mechanism.
    _CONNECT_POLL_INTERVAL = 0.05

    async def _wait_connectable(self, sock):
        """Wait until an outstanding connect has RESOLVED -- and never wait on
        readiness ALONE.

        Both registrations are needed: a connect that completes makes the socket
        writable, and one that is refused makes it readable.  But whether an
        ERRORED socket reports ready at all turns out to be platform-dependent,
        and a wait that depends on it is a HANG when it is wrong -- which is
        exactly what happened: a readiness rule measured on macOS hung CI on
        Linux, because "no event" is indistinguishable from "still connecting".

        So a timer runs alongside the two registrations and the caller re-polls
        the connect whenever any of them fires.  The primitive's verdict is
        authoritative; this just guarantees it gets asked again.  A missed
        readiness event now costs one extra poll rather than the whole loop."""
        future = self.create_future()
        self.add_reader(sock, _set_result_unless_done, future, True)
        self.add_writer(sock, _set_result_unless_done, future, True)
        timer = self.call_later(self._CONNECT_POLL_INTERVAL,
                                _set_result_unless_done, future, True)
        try:
            await future
        finally:
            timer.cancel()
            self.remove_reader(sock)
            self.remove_writer(sock)

    async def sock_connect(self, sock, address):
        """The ordinary asyncio shape, and it does not block the loop.

        GemStone issues every connect non-blocking and reports EINPROGRESS as
        "started, not finished", so `connect` on a non-blocking socket starts
        the connect and raises BlockingIOError -- exactly what this loop wants.
        The wait then happens in select along with everything else, so other
        tasks keep running while a connect is outstanding.

        Retrying `connect` is the poll, and it reads the same answer CPython's
        own asyncio reads after writability: SO_ERROR (PyRawSocket >>
        ___connectCode___:).  So the sequence is CPython's -- EINPROGRESS, then
        EALREADY while it is still going, then EISCONN once it is done, or the
        real errno if it failed.

        EISCONN is success HERE even though it is an error to `connect`: it says
        the connect this coroutine started has completed.  And because EISCONN is
        an ordinary OSError rather than a BlockingIOError, the loop below cannot
        spin on it -- a connect that resolves always leaves through one of the
        two returns or the raise.
        """
        self._check_nonblocking(sock)
        while True:
            try:
                sock.connect(address)
                return None
            except BlockingIOError:
                await self._wait_connectable(sock)
            except OSError as exc:
                if exc.errno == _errno.EISCONN:
                    return None
                raise


def _set_result_unless_done(future, value):
    """A readiness callback that cannot hurt a waiter which has already been
    cancelled or resolved.  Level-triggered registrations can fire once more
    before a remove takes effect, and setting a result twice raises
    InvalidStateError."""
    if not future.done():
        future.set_result(value)


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
