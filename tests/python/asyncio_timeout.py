"""Fixture: ``asyncio.timeout`` -- the 3.11 async context manager.

Upstream's ``asyncio/timeouts.py``, vendored verbatim.  It is 183 lines that
lean entirely on machinery Grail already had: ``get_running_loop``,
``loop.call_at``, ``loop.time``, ``current_task``, and -- the interesting part --
``Task.cancelling()`` / ``Task.uncancel()``.

Those last two are why this fixture exists rather than being obvious.  A
timeout does not raise; it CANCELS the task and then converts the resulting
CancelledError into TimeoutError on the way out.  Distinguishing "the timeout
cancelled me" from "somebody else cancelled me" is exactly what the cancel
COUNT is for, so a build with a boolean ``_cancel_requested`` (which Grail had
until the counting versions landed) turns an outer cancellation into a spurious
TimeoutError, and vice versa.  The two propagation checks below are the ones
that fail on such a build; the happy paths pass on it.

``timeout(-1)`` is separated out because test_taskgroups reaches for it
specifically: a delay already in the past must fire on the first suspension
rather than never, which is a different code path from a positive delay.
"""

import asyncio


def completes_inside_the_budget():
    """The uneventful case: finish in time, no exception, state is finished."""
    async def main():
        async with asyncio.timeout(10):
            await asyncio.sleep(0)
        return True
    return asyncio.run(main())


def expiry_raises_timeout_error():
    """A budget that runs out surfaces as TimeoutError, not CancelledError."""
    async def main():
        try:
            async with asyncio.timeout(0.01):
                await asyncio.sleep(10)
        except TimeoutError:
            return True
        return False
    return asyncio.run(main())


def a_negative_delay_expires_immediately():
    """`timeout(-1)`: already past, so it must fire at the first suspension.

    test_taskgroups uses exactly this spelling.
    """
    async def main():
        try:
            async with asyncio.timeout(-1):
                await asyncio.sleep(0)
        except TimeoutError:
            return True
        return False
    return asyncio.run(main())


def expired_reports_true_after_expiry():
    """The introspection half of the contract."""
    async def main():
        seen = []
        try:
            async with asyncio.timeout(0.01) as cm:
                seen.append(cm.expired())
                await asyncio.sleep(10)
        except TimeoutError:
            seen.append(cm.expired())
        return seen == [False, True]
    return asyncio.run(main())


def reschedule_extends_the_budget():
    """`reschedule` moves the deadline, so work that would have timed out does not."""
    async def main():
        async with asyncio.timeout(0.01) as cm:
            cm.reschedule(asyncio.get_running_loop().time() + 10)
            await asyncio.sleep(0.05)
        return True
    return asyncio.run(main())


def an_outer_cancellation_is_not_converted():
    """The cancel-count check, in the direction a boolean flag gets wrong.

    Somebody else cancels the task while a live (unexpired) timeout is in
    scope.  That is a CancelledError and must stay one -- turning it into
    TimeoutError would tell the caller the deadline passed when it did not.
    """
    async def main():
        async def body():
            async with asyncio.timeout(10):
                await asyncio.sleep(10)
        task = asyncio.ensure_future(body())
        await asyncio.sleep(0)
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            return True
        except TimeoutError:
            return False
        return False
    return asyncio.run(main())


def the_error_is_chained_from_cancellation():
    """`__cause__` keeps the CancelledError the timeout raised through."""
    async def main():
        try:
            async with asyncio.timeout(0.01):
                await asyncio.sleep(10)
        except TimeoutError as exc:
            return isinstance(exc.__cause__, asyncio.CancelledError)
        return False
    return asyncio.run(main())


def timeout_at_takes_an_absolute_deadline():
    """`timeout_at` is the same machine keyed on loop time rather than a delay."""
    async def main():
        loop = asyncio.get_running_loop()
        try:
            async with asyncio.timeout_at(loop.time() + 0.01):
                await asyncio.sleep(10)
        except TimeoutError:
            return True
        return False
    return asyncio.run(main())


def none_means_no_deadline():
    """`timeout(None)` is a legal no-op, which the loop must not schedule."""
    async def main():
        async with asyncio.timeout(None):
            await asyncio.sleep(0)
        return True
    return asyncio.run(main())


def the_public_names_are_exported():
    """asyncio.timeout / timeout_at / Timeout, and the submodule."""
    return (asyncio.timeout is asyncio.timeouts.timeout
            and asyncio.timeout_at is asyncio.timeouts.timeout_at
            and asyncio.Timeout is asyncio.timeouts.Timeout)


CHECKS = (
    completes_inside_the_budget,
    expiry_raises_timeout_error,
    a_negative_delay_expires_immediately,
    expired_reports_true_after_expiry,
    reschedule_extends_the_budget,
    an_outer_cancellation_is_not_converted,
    the_error_is_chained_from_cancellation,
    timeout_at_takes_an_absolute_deadline,
    none_means_no_deadline,
    the_public_names_are_exported,
)

# Run at IMPORT, so the Smalltalk side reads results rather than driving each
# call across the boundary -- same shape as asyncio_exceptions.py.
r = {fn.__name__: fn() for fn in CHECKS}


if __name__ == '__main__':
    for fn in CHECKS:
        print('%-4s %s' % ('OK' if r[fn.__name__] is True else 'FAIL',
                           fn.__name__))
