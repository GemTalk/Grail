"""The asyncgen hooks and the shutdown sweep: how a loop learns which
generators to close, and closes them.

``sys.set_asyncgen_hooks(firstiter=...)`` stores the hook (each keyword
updates independently, CPython's contract); the runtime fires firstiter
ONCE per async generator, at its first drive; the loop's hook registers the
generator, and ``loop.shutdown_asyncgens()`` -- awaited by asyncio.run() at
teardown, after cancelling tasks -- closes everything registered, reporting
a close that raises through the exception handler with CPython's message
and context keys, without stopping the sweep.

The FINALIZER hook fires when an async generator is collected before it
finished: the generator is handed to the hook bound at its first drive, and
asyncio's hook schedules its aclose() on the loop.  That needs a suspended
generator to be collectable at all, which it was not while its parked
process was a GC root -- so the collection checks below are the other half
of the same contract, for sync generators too.  And a step object dropped
undriven (``g.asend(v)`` without the await) warns from its destructor, as
CPython's does.

Also here: Task.get_stack() (a one-frame stack for a suspended task, [] for
a finished one -- the call not raising is what
test_async_gen_aclose_compatible_with_get_stack needs), and the asend
value-through: ``it.__anext__().send(10)`` delivers 10 to the suspended
yield of a STARTED generator (test_async_gen_asyncio_anext_05).

Every expectation was checked against CPython 3.14 first.
"""

import asyncio
import gc
import sys
import warnings
import weakref

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



def _suspended_generators_are_collected():
    def sgen():
        while True:
            yield 1

    async def agen():
        while True:
            yield 1

    g = sgen()
    next(g)
    r = weakref.ref(g)
    a = agen()
    try:
        a.asend(None).send(None)
    except StopIteration:
        pass
    ra = weakref.ref(a)
    del g, a
    gc.collect()
    return (r() is None, ra() is None)


check('a_suspended_generator_is_collected',
      _suspended_generators_are_collected, (True, True))


def _for_releases_its_iterator():
    def sgen():
        while True:
            yield 1

    g = sgen()
    r = weakref.ref(g)
    for _ in g:
        break
    del g
    gc.collect()
    return r() is None


check('a_for_loop_releases_its_iterator_at_exit',
      _for_releases_its_iterator, True)


def _finalizer_hook_contract():
    seen = []
    old = sys.get_asyncgen_hooks()

    async def ag():
        yield 1
        yield 2

    def drive(g):
        try:
            g.asend(None).send(None)
        except (StopIteration, StopAsyncIteration):
            pass

    sys.set_asyncgen_hooks(firstiter=lambda g: None, finalizer=seen.append)
    try:
        unfinished = ag()
        drive(unfinished)
        del unfinished
        gc.collect()
        after_unfinished = [g.__name__ for g in seen]
        finished = ag()
        for _ in range(3):
            drive(finished)
        del finished
        never_started = ag()
        del never_started
        gc.collect()
        after_others = len(seen)
        for g in seen:
            g.aclose().close()
        seen.clear()
        return (after_unfinished, after_others)
    finally:
        sys.set_asyncgen_hooks(firstiter=old[0], finalizer=old[1])


check('the_finalizer_hook_gets_only_an_unfinished_generator',
      _finalizer_hook_contract, (['ag'], 1))


def _abandoned_generator_closes_on_the_loop():
    events = []

    async def gen():
        try:
            while True:
                yield 1
        finally:
            await asyncio.sleep(0)
            events.append('closed')

    async def main():
        async for _ in gen():
            break
        gc.collect()
        await asyncio.sleep(0)
        await asyncio.sleep(0)
        events.append('main done')

    # run_until_complete and NOT asyncio.run: nothing here ever awaits
    # shutdown_asyncgens(), so the finalizer hook is the only way the
    # generator's ``finally`` can run (test_async_gen_asyncio_gc_aclose_09).
    loop = asyncio.new_event_loop()
    try:
        loop.run_until_complete(main())
    finally:
        loop.close()
    return events


check('an_abandoned_generator_is_closed_by_the_finalizer_hook',
      _abandoned_generator_closes_on_the_loop, ['main done', 'closed'])


def _undriven_step_warns():
    async def gen():
        yield 1

    out = []
    for method in ('asend', 'athrow', 'aclose'):
        with warnings.catch_warnings(record=True) as caught:
            warnings.simplefilter('always')
            g = gen()
            if method == 'asend':
                g.asend(None)
            elif method == 'athrow':
                g.athrow(RuntimeError)
            else:
                g.aclose()
            gc.collect()
        out.append([(w.category.__name__, str(w.message).split(' of ')[0])
                    for w in caught])
    with warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter('always')
        g = gen()
        g.aclose().close()
        g.asend(None).close()
        gc.collect()
    out.append(len(caught))
    return out


check('an_undriven_step_warns_it_was_never_awaited',
      _undriven_step_warns,
      [[('RuntimeWarning', "coroutine method 'asend'")],
       [('RuntimeWarning', "coroutine method 'athrow'")],
       [('RuntimeWarning', "coroutine method 'aclose'")],
       0])


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
