"""asyncio.run -- own a loop for the duration of one coroutine.

The ordering in the ``finally`` is the substance of this module, and it is easy
to get subtly wrong: cancel the leftover tasks and let them observe the
cancellation BEFORE the loop is closed, because a task's ``finally`` may await,
and awaiting on a closed loop raises instead of cleaning up.
"""

import contextvars as _contextvars

from asyncio import events as _events
from asyncio import exceptions as _exceptions
from asyncio import tasks as _tasks


def run(main, debug=None):
    """Run ``main`` to completion in a fresh loop, then close it."""
    if _events._get_running_loop() is not None:
        raise RuntimeError(
            'asyncio.run() cannot be called from a running event loop')
    loop = _events.new_event_loop()
    try:
        _events.set_event_loop(loop)
        return loop.run_until_complete(main)
    finally:
        try:
            _cancel_all_tasks(loop)
        finally:
            _events.set_event_loop(None)
            loop.close()


def _cancel_all_tasks(loop):
    """Cancel what is left, then let each one run its cleanup.

    Draining after cancelling is the part that matters: cancel() only REQUESTS
    it -- CancelledError is delivered at the task's suspension point on its next
    step -- so without running the loop again the ``finally`` blocks never run
    and a half-open resource stays that way.
    """
    to_cancel = [t for t in list(_tasks._all_tasks)
                 if t._loop is loop and not t.done()]
    if not to_cancel:
        return
    for task in to_cancel:
        task.cancel()
    for task in to_cancel:
        if task.done():
            continue
        try:
            loop.run_until_complete(task)
        except _exceptions.CancelledError:
            pass
        except BaseException:
            pass
    for task in to_cancel:
        _tasks._all_tasks.discard(task)


class Runner:
    """Own a loop across SEVERAL ``run`` calls -- the 3.11+ context-manager form.

    Where ``run`` above is one coroutine in a throwaway loop, a Runner keeps its
    loop between calls, which is exactly why unittest's IsolatedAsyncioTestCase
    is built on it: asyncSetUp, the test coroutine and asyncTearDown have to see
    the same loop, and each is a separate ``run``.

    THE LOOP IS CREATED LAZILY, not in ``__enter__``.  That is upstream's
    contract and it is load-bearing rather than tidy: IsolatedAsyncioTestCase
    never uses ``with``, it calls ``get_loop()`` from _callSetUp precisely to
    force the loop into existence and make it current, then ``run()`` directly.
    A Runner that only built its loop in ``__enter__`` answered None from
    get_loop() and failed in run() on ``None.run_until_complete``.
    """

    def __init__(self, debug=None, loop_factory=None):
        self._debug = debug
        self._loop_factory = loop_factory
        self._loop = None
        self._context = None
        self._set_event_loop = False
        self._closed = False

    def __enter__(self):
        self._lazy_init()
        return self

    def __exit__(self, *exc):
        self.close()
        return False

    def _lazy_init(self):
        """Build the loop on first use; a no-op afterwards."""
        if self._closed:
            raise RuntimeError('Runner is closed')
        if self._loop is not None:
            return
        if self._loop_factory is None:
            self._loop = _events.new_event_loop()
            if not self._set_event_loop:
                # Once only, as upstream notes: set_event_loop is not free of
                # side effects.
                _events.set_event_loop(self._loop)
                self._set_event_loop = True
        else:
            self._loop = self._loop_factory()
        if self._debug is not None:
            self._loop.set_debug(self._debug)
        self._context = _contextvars.copy_context()

    def close(self):
        if self._loop is None:
            self._closed = True
            return
        try:
            _cancel_all_tasks(self._loop)
        finally:
            if self._set_event_loop:
                _events.set_event_loop(None)
            self._loop.close()
            self._loop = None
            self._context = None
            self._closed = True

    def get_loop(self):
        self._lazy_init()
        return self._loop

    def run(self, coro, *, context=None):
        """Run one coroutine in this Runner's loop.

        ``context`` is ACCEPTED AND NOT APPLIED, and the reason is worth stating
        rather than hiding behind a signature that looks complete.  Upstream
        passes it to ``loop.create_task(coro, context=...)`` so that setUp, the
        test and tearDown share one contextvars.Context.  Grail's contextvars is
        a stub -- one process-wide context whose ``Context.run`` simply calls
        through -- so that sharing already happens, and there is nothing for the
        argument to select between.  Callers therefore get the behaviour they
        asked for; what they do NOT get is isolation FROM other tasks, which is
        a contextvars limitation and not this method's to fix.
        """
        if _events._get_running_loop() is not None:
            raise RuntimeError(
                'Runner.run() cannot be called from a running event loop')
        self._lazy_init()
        return self._loop.run_until_complete(coro)
