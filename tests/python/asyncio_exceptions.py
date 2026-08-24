"""Fixture: asyncio's exception types are the BUILTIN ones where CPython says so.

The interesting case is TimeoutError.  Through 3.10 asyncio had a TimeoutError
of its own; in 3.11 it became an alias of the builtin --

    TimeoutError = TimeoutError  # make local alias for the standard exception

-- and every 3.11+ codebase, CPython's own tests included, writes the plain
``except TimeoutError``.  Grail defined a separate ``class
TimeoutError(Exception)``, which reads correctly at the raise site and is wrong
at every catch site: the modern spelling did not catch what ``wait_for``
raised, and since the builtin descends from OSError, ``except OSError`` around a
timing-out await behaved differently too.

Found by test.test_asyncio.test_queues, whose
test_cancelled_getters_not_being_held_in_self_getters does
``with self.assertRaises(TimeoutError): await asyncio.wait_for(q.get(), 0.1)``
and let the wrong TimeoutError escape.

CancelledError is here as the CONTRAST, and it matters that it is not the same
story: it is asyncio's own class, deliberately outside Exception, so a task body
wrapped in ``except Exception`` cannot swallow a cancellation.  Checking both
together is what keeps a future "just alias them to builtins" tidy-up from
taking CancelledError with it.
"""

import asyncio


def timeout_error_is_the_builtin():
    """The identity, which is the whole point."""
    return asyncio.TimeoutError is TimeoutError


def timeout_error_is_an_oserror():
    """The builtin's ancestry, which a bare Exception subclass did not have."""
    return issubclass(asyncio.TimeoutError, OSError)


def wait_for_raises_what_the_builtin_name_catches():
    """The failure as it was actually reported: catching the BUILTIN name.

    ``wait_for`` raises ``asyncio.exceptions.TimeoutError``; before the alias
    that was a different class, so this except clause did not fire and the
    exception escaped.  A never-resolved future is the timeout, so nothing here
    depends on how fast the machine is -- only that 0.01s elapses.
    """
    async def main():
        try:
            await asyncio.wait_for(asyncio.Future(), 0.01)
        except TimeoutError:
            return 'caught-as-builtin'
        except BaseException as exc:
            return 'escaped-as-%s' % (type(exc).__name__,)
        return 'no-exception'

    return asyncio.run(main()) == 'caught-as-builtin'


def cancelled_error_is_asyncios_own():
    """NOT aliased to anything, and NOT an Exception."""
    return (issubclass(asyncio.CancelledError, BaseException)
            and not issubclass(asyncio.CancelledError, Exception))


def cancelled_error_survives_except_exception():
    """The reason CancelledError sits outside Exception.

    A task body that wraps everything in ``except Exception`` must still be
    cancellable; if CancelledError were an Exception this would answer
    'swallowed' and cancellation would be unreliable in the most ordinary code
    there is.
    """
    async def body():
        try:
            await asyncio.Future()          # parks forever
        except Exception:
            return 'swallowed'

    async def main():
        task = asyncio.ensure_future(body())
        await asyncio.sleep(0)              # let it reach the park
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            return 'propagated'
        return 'returned-%r' % (task.result(),)

    return asyncio.run(main()) == 'propagated'


CHECKS = (
    timeout_error_is_the_builtin,
    timeout_error_is_an_oserror,
    wait_for_raises_what_the_builtin_name_catches,
    cancelled_error_is_asyncios_own,
    cancelled_error_survives_except_exception,
)

# Run at IMPORT, so the Smalltalk side (AsyncioExceptionsTestCase) reads results
# rather than driving five calls across the boundary -- the same shape as
# coroutine_suspension.py.  The __main__ block below runs the same functions, so
# the CPython fixture gate and SUnit are checking one set of definitions.
r = {fn.__name__: fn() for fn in CHECKS}


if __name__ == '__main__':
    for fn in CHECKS:
        print('%-4s %s' % ('OK' if r[fn.__name__] is True else 'FAIL',
                           fn.__name__))
