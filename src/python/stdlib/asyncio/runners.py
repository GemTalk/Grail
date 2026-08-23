"""asyncio.run -- own a loop for the duration of one coroutine.

The ordering in the ``finally`` is the substance of this module, and it is easy
to get subtly wrong: cancel the leftover tasks and let them observe the
cancellation BEFORE the loop is closed, because a task's ``finally`` may await,
and awaiting on a closed loop raises instead of cleaning up.
"""

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
    """Context-manager form (3.11+).  Thin: the work is in run()."""

    def __init__(self, debug=None, loop_factory=None):
        self._loop_factory = loop_factory or _events.new_event_loop
        self._loop = None

    def __enter__(self):
        self._loop = self._loop_factory()
        _events.set_event_loop(self._loop)
        return self

    def __exit__(self, *exc):
        self.close()
        return False

    def close(self):
        if self._loop is None:
            return
        try:
            _cancel_all_tasks(self._loop)
        finally:
            _events.set_event_loop(None)
            self._loop.close()
            self._loop = None

    def get_loop(self):
        return self._loop

    def run(self, coro):
        return self._loop.run_until_complete(coro)
