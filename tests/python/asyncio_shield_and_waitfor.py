"""A real asyncio.shield, and wait_for's 3.12+ cancellation contract.

Grail's shield was ``async def shield(arg): return await ensure_future(arg)``
-- import compatibility, no protection: cancelling the wrapper rode straight
into the inner task, and the future API the tests poke (``shielded.cancelled()``)
did not exist on the returned coroutine.  It is now CPython's synchronous
wiring: a fresh outer future, an inner-done callback that forwards
result/exception/cancellation unless the outer was already cancelled (reading
the inner's exception so it never reports unretrieved), an outer-done callback
that unhooks, and the done-inner-answers-itself fast path.

wait_for is rebuilt to the 3.12+ shape, and the shape is behavioural: the
eager timeout<=0 path answers a done future's result and otherwise
cancels-and-AWAITS without scheduling (a zero-timeout coroutine's body never
starts); the normal path awaits the raw awaitable under the timeout() context
manager, so an outside cancel rides the _fut_waiter chain -- a coroutine that
swallows the CancelledError completes normally and the waiting task ends
done() but NOT cancelled(), while timeout expiry cancels the enclosing task
and __aexit__ converts the arriving CancelledError with uncancel()
bookkeeping.  A corollary this fixture PINS because it is surprising: expiry
against a cancel-swallowing coroutine raises nothing at all -- the body runs
to completion and wait_for returns its value, TimeoutError being reserved for
a cancellation that actually lands.  ensure_future gains CPython's awaitable validation on the way
('An asyncio.Future, a coroutine or an awaitable is required').

Every expectation was checked against CPython 3.14 first.
"""

import asyncio
import time

RESULTS = {}


def check(name, ok):
    RESULTS[name] = (ok is True) or repr(ok)


async def _shield_wiring():
    async def c():
        return 42

    t = asyncio.ensure_future(c())
    s = asyncio.shield(t)
    check('shield_returns_future', asyncio.isfuture(s) and s is not t)
    await t
    check('shield_of_done_is_inner', asyncio.shield(t) is t)
    check('await_shield_result', await s == 42)

    async def slow():
        await asyncio.sleep(0.05)
        return 'done'

    task = asyncio.create_task(slow())
    sh = asyncio.shield(task)
    await asyncio.sleep(0)
    sh.cancel()
    check('outer_cancel_leaves_inner',
          sh.cancelled() and not task.cancelled() and not task.done())
    check('inner_completes_after_outer_cancel', await task == 'done')

    task2 = asyncio.create_task(slow())
    sh2 = asyncio.shield(task2)
    await asyncio.sleep(0)
    task2.cancel()
    try:
        await sh2
        check('inner_cancel_propagates', 'NO RAISE')
    except asyncio.CancelledError:
        check('inner_cancel_propagates', True)

    async def boom():
        raise ValueError('x')

    sh3 = asyncio.shield(asyncio.create_task(boom()))
    try:
        await sh3
        check('inner_exception_propagates', 'NO RAISE')
    except ValueError as exc:
        check('inner_exception_propagates', str(exc) == 'x')

    try:
        asyncio.shield(42)
        check('shield_refuses_non_awaitable', 'NO RAISE')
    except TypeError as exc:
        check('shield_refuses_non_awaitable',
              str(exc) == 'An asyncio.Future, a coroutine or an '
                          'awaitable is required')


async def _waitfor_contract():
    started = []

    async def foo():
        started.append(True)

    try:
        await asyncio.wait_for(foo(), 0)
        check('zero_timeout_raises', 'NO RAISE')
    except asyncio.TimeoutError:
        check('zero_timeout_raises', True)
    check('zero_timeout_body_never_starts', started == [])

    loop = asyncio.get_running_loop()
    f = loop.create_future()
    f.set_result('done')
    check('zero_timeout_done_future_answers',
          await asyncio.wait_for(f, 0) == 'done')

    class Slow:
        TASK_TIMEOUT = 0.1

        def __init__(self):
            self.exited = False

        async def run(self):
            exitat = time.monotonic() + self.TASK_TIMEOUT
            while True:
                tosleep = exitat - time.monotonic()
                if tosleep <= 0:
                    break
                try:
                    await asyncio.sleep(tosleep)
                except asyncio.CancelledError:
                    pass
            self.exited = True

    st = Slow()
    wt = asyncio.create_task(asyncio.wait_for(st.run(), st.TASK_TIMEOUT * 2))
    await asyncio.sleep(0)
    wt.cancel()
    await asyncio.wait({wt})
    check('outside_cancel_waits_for_cleanup', st.exited)
    check('swallowed_cancel_ends_done_not_cancelled',
          wt.done() and not wt.cancelled())

    async def coro():
        await asyncio.sleep(0.01)
        return 'done'

    tk = asyncio.create_task(coro())
    try:
        sht = asyncio.shield(tk)
        await asyncio.wait_for(sht, timeout=0)
    except asyncio.TimeoutError:
        pass
    check('shielded_zero_timeout_kills_only_outer',
          sht.cancelled() and not tk.done() and not tk.cancelled())
    await asyncio.sleep(0.1)
    check('shielded_task_finished_in_background', tk.done())

    st2 = Slow()
    try:
        await asyncio.wait_for(st2.run(), st2.TASK_TIMEOUT / 4)
        check('expiry_swallowed_returns_normally', True)
    except asyncio.TimeoutError:
        check('expiry_swallowed_returns_normally', 'TimeoutError')
    check('expiry_swallowed_ran_to_completion', st2.exited)

    cleaned = []

    async def obedient():
        try:
            await asyncio.sleep(10)
        finally:
            cleaned.append(True)

    try:
        await asyncio.wait_for(obedient(), 0.01)
        check('expiry_raises_timeout', 'NO RAISE')
    except asyncio.TimeoutError:
        check('expiry_raises_timeout', True)
    check('expiry_ran_finally_first', cleaned == [True])


async def _main():
    await _shield_wiring()
    await _waitfor_contract()


asyncio.run(_main())


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
