"""asyncio.wait, and the identity of a re-raised CancelledError.

Two test_locks repairs that share an event loop.  asyncio.wait was absent
from Grail's hand-written asyncio (Barrier's test_filling_task_by_task
awaits it); the implementation is CPython's waiter-future shape -- a
per-future done callback decrements a counter and resolves the waiter when
the return_when condition is met -- with the validation order and wording
probed on 3.14: a bare future/coroutine argument names its type, empty is
the ValueError, return_when is checked BEFORE the no-coroutines refusal.

The identity pair is subtler and lives nowhere near asyncio: a
CancelledError delivered into ``await cond.wait_for(...)``, SUPPRESSED by a
with-statement handler (assertRaises), and later re-raised had gone through
___signalOrPass___'s last-resort COPY -- the suppressed-and-unwound
exception still carries stale GemStone handler frames, so plain #signal
refuses (6011) and #pass finds no live frame.  The fallback is now a
CARRIER, the same mechanism the in-flight re-raise and the generator throw
path already use: the payload is never re-signalled, the except machinery
unwraps it, and the awaiting caller receives the very instance the
coroutine raised (test_cancelled_error_wakeup / _re_aquire assert ``is'').

Every expectation was checked against CPython 3.14 first.
"""

import asyncio
import unittest

RESULTS = {}


def check(name, ok):
    RESULTS[name] = (ok is True) or repr(ok)


class _T(unittest.TestCase):
    def runTest(self):
        pass


async def _emsg(coro):
    try:
        await coro
        return 'NO RAISE'
    except BaseException as exc:
        return '%s: %s' % (type(exc).__name__, exc)


async def _wait_checks():
    async def c():
        pass

    check('wait_refuses_coroutines',
          (await _emsg(asyncio.wait([c()]))) ==
          'TypeError: Passing coroutines is forbidden, use tasks explicitly.')
    check('wait_refuses_empty',
          (await _emsg(asyncio.wait([]))) ==
          'ValueError: Set of Tasks/Futures is empty.')

    task = asyncio.ensure_future(c())
    check('wait_checks_return_when_first',
          (await _emsg(asyncio.wait([task], return_when='NOPE'))) ==
          'ValueError: Invalid return_when value: NOPE')
    check('wait_refuses_bare_future',
          (await _emsg(asyncio.wait(task))) ==
          'TypeError: expect a list of futures, not Task')
    await task

    t1 = asyncio.ensure_future(asyncio.sleep(0.01))
    t2 = asyncio.ensure_future(asyncio.sleep(10))
    done, pending = await asyncio.wait([t1, t2], timeout=0.2)
    check('wait_timeout_splits',
          (t1 in done) and (t2 in pending) and isinstance(done, set))
    t2.cancel()

    t3 = asyncio.ensure_future(asyncio.sleep(0.01))
    t4 = asyncio.ensure_future(asyncio.sleep(10))
    done, pending = await asyncio.wait(
        [t3, t4], return_when=asyncio.FIRST_COMPLETED)
    check('wait_first_completed', len(done) == 1 and len(pending) == 1)
    t4.cancel()

    tasks = [asyncio.create_task(asyncio.sleep(0)) for _ in range(3)]
    done, pending = await asyncio.wait(tasks)
    check('wait_all_completed', len(done) == 3 and not pending)


async def _cancel_identity():
    t = _T()
    wake = False
    raised = None
    cond = asyncio.Condition()

    async def func():
        nonlocal raised
        async with cond:
            with t.assertRaises(asyncio.CancelledError) as err:
                await cond.wait_for(lambda: wake)
            raised = err.exception
            raise raised

    task = asyncio.create_task(func())
    await asyncio.sleep(0)
    task.cancel(msg='foo')
    with t.assertRaises(asyncio.CancelledError) as err:
        await task
    check('cancel_message_carried', err.exception.args == ('foo',))
    check('cancel_instance_identity', err.exception is raised)


async def _main():
    await _wait_checks()
    await _cancel_identity()


asyncio.run(_main())

check('constants_are_the_strings',
      (asyncio.FIRST_COMPLETED, asyncio.FIRST_EXCEPTION,
       asyncio.ALL_COMPLETED) ==
      ('FIRST_COMPLETED', 'FIRST_EXCEPTION', 'ALL_COMPLETED'))


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
