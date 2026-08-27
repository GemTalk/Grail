"""The asyncgen hooks and the shutdown sweep: how a loop learns which
generators to close, and closes them.

``sys.set_asyncgen_hooks(firstiter=...)`` stores the hook (each keyword
updates independently, CPython's contract); the runtime fires firstiter
ONCE per async generator, at its first drive; the loop's hook registers the
generator, and ``loop.shutdown_asyncgens()`` -- awaited by asyncio.run() at
teardown, after cancelling tasks -- closes everything registered, reporting
a close that raises through the exception handler with CPython's message
and context keys, without stopping the sweep.

This sweep is the working substitute for the FINALIZER hook Grail cannot
fire (no destruction-time callbacks -- the recorded platform gap), which is
why the finalizer half of set_asyncgen_hooks is stored but never called.

Also here: Task.get_stack() (a one-frame stack for a suspended task, [] for
a finished one -- the call not raising is what
test_async_gen_aclose_compatible_with_get_stack needs), and the asend
value-through: ``it.__anext__().send(10)`` delivers 10 to the suspended
yield of a STARTED generator (test_async_gen_asyncio_anext_05).

Every expectation was checked against CPython 3.14 first.
"""

import asyncio
import sys

RESULTS = {}


def check(name, fn, expected):
    try:
        RESULTS[name] = (fn() == expected) or repr(fn())
    except BaseException as exc:
        RESULTS[name] = 'raised %s: %s' % (type(exc).__name__, exc)


def _hooks_roundtrip():
    old = sys.get_asyncgen_hooks()

    def fi(agen):
        pass

    def fin(agen):
        pass

    try:
        sys.set_asyncgen_hooks(firstiter=fi)
        first = sys.get_asyncgen_hooks()[0] is fi
        sys.set_asyncgen_hooks(finalizer=fin)
        second = (sys.get_asyncgen_hooks()[0] is fi,
                  sys.get_asyncgen_hooks()[1] is fin)
        return (first, second)
    finally:
        if old[0] is not None:
            sys.set_asyncgen_hooks(firstiter=old[0])
        if old[1] is not None:
            sys.set_asyncgen_hooks(finalizer=old[1])


check('set_asyncgen_hooks_updates_each_keyword_independently',
      _hooks_roundtrip, (True, (True, True)))


def _firstiter_fires_once():
    seen = []
    old = sys.get_asyncgen_hooks()
    sys.set_asyncgen_hooks(firstiter=seen.append)

    async def ag():
        yield 1
        yield 2

    try:
        g = ag()
        pre = list(seen)
        step = g.asend(None)
        try:
            step.send(None)
        except StopIteration:
            pass
        after_first = len(seen)
        step2 = g.asend(None)
        try:
            step2.send(None)
        except StopIteration:
            pass
        after_second = len(seen)
        return (pre, after_first, seen[0] is g, after_second)
    finally:
        if old[0] is not None:
            sys.set_asyncgen_hooks(firstiter=old[0])


check('firstiter_fires_once_at_the_first_drive',
      _firstiter_fires_once, ([], 1, True, 1))


def _run_sweeps_abandoned_generators():
    finalized = []

    async def waiter():
        try:
            yield 1
        finally:
            await asyncio.sleep(0)
            finalized.append('cleaned')

    async def main():
        async for _ in waiter():
            break

    asyncio.run(main())
    return finalized


check('asyncio_run_sweeps_abandoned_generators',
      _run_sweeps_abandoned_generators, ['cleaned'])


def _sweep_reports_close_errors():
    messages = []

    def handler(loop, context):
        messages.append(context)

    async def bad():
        try:
            yield 1
        finally:
            1 / 0

    it = bad()

    async def main():
        loop = asyncio.get_running_loop()
        loop.set_exception_handler(handler)
        async for _ in it:
            break

    asyncio.run(main())
    message, = messages
    return (type(message['exception']).__name__,
            message['asyncgen'] is it,
            'an error occurred during closing of asynchronous generator'
            in message['message'])


check('the_sweep_reports_a_close_error_and_continues',
      _sweep_reports_close_errors, ('ZeroDivisionError', True, True))


def _get_stack_contract():
    out = []

    async def parked():
        await asyncio.sleep(10)

    async def main():
        t = asyncio.get_running_loop().create_task(parked())
        await asyncio.sleep(0)
        out.append(len(t.get_stack()))
        t.cancel()
        try:
            await t
        except asyncio.CancelledError:
            pass
        out.append(t.get_stack())

    asyncio.run(main())
    return out


check('get_stack_one_frame_suspended_empty_done',
      _get_stack_contract, [1, []])


def _anext_value_through():
    async def foo():
        v = yield 1
        v = yield v
        yield v * 100

    it = foo().__aiter__()
    out = []
    for sendval in (None, 10, 12):
        try:
            it.__anext__().send(sendval)
        except StopIteration as exc:
            out.append(exc.args[0])
    return out


check('asend_first_drive_delivers_the_sent_value',
      _anext_value_through, [1, 10, 1200])


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
