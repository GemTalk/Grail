"""``ExitStack``, ported from CPython instead of approximated.

Grail's ExitStack described itself as "bare minimum: track callbacks to
run on exit", and the four things it got wrong were not corners:

  * ``__exit__`` passed ``(None, None, None)`` to every callback and
    wrapped each one in ``except Exception: pass``.  So a context manager
    could not SEE the exception, could not SUPPRESS it by returning true,
    and an exception raised BY a cleanup vanished -- three of the
    guarantees the protocol exists to provide.
  * ``callback()`` could not capture arguments, on the grounds that
    Grail's call-site ``*``-unpack was not ready.  It is, and was; the
    constraint was a stale comment.
  * ``push()`` called ``__enter__``, which it must not -- push registers
    an ALREADY entered manager's ``__exit__``.
  * ``AsyncExitStack`` was an alias for the synchronous class, so
    ``async with`` on one failed outright.

These are the guarantees, all measured against CPython 3.14 first.
"""

import asyncio
from contextlib import AsyncExitStack, ExitStack

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or 'got: %r' % (got,)


def _outcome(fn):
    try:
        return ('ok', fn())
    except BaseException as exc:
        return (type(exc).__name__, str(exc))


class Cm:
    """A context manager that records what its __exit__ was told."""

    def __init__(self, log, name, suppress=False, raise_on_exit=None):
        self.log, self.name = log, name
        self.suppress, self.raise_on_exit = suppress, raise_on_exit

    def __enter__(self):
        self.log.append('enter ' + self.name)
        return self.name

    def __exit__(self, exc_type, exc, tb):
        self.log.append('exit %s %s'
                        % (self.name, exc_type.__name__ if exc_type else 'None'))
        if self.raise_on_exit:
            raise self.raise_on_exit
        return self.suppress


# ------------------------------------------------------------ unwinding

def _unwinds_in_reverse():
    log = []
    with ExitStack() as stack:
        stack.enter_context(Cm(log, 'a'))
        stack.enter_context(Cm(log, 'b'))
    return log


def _enter_context_returns_the_value():
    with ExitStack() as stack:
        return stack.enter_context(Cm([], 'a'))


def _close_unwinds_outside_with():
    log = []
    stack = ExitStack()
    stack.enter_context(Cm(log, 'a'))
    stack.close()
    return log


def _pop_all_defers_the_cleanup():
    log = []
    stack = ExitStack()
    stack.enter_context(Cm(log, 'a'))
    other = stack.pop_all()
    stack.close()
    after_close = list(log)
    other.close()
    return (after_close, log)


check('unwinds_in_reverse', _unwinds_in_reverse(),
      ['enter a', 'enter b', 'exit b None', 'exit a None'])
check('enter_context_returns_the_value',
      _enter_context_returns_the_value(), 'a')
check('close_unwinds_outside_with', _close_unwinds_outside_with(),
      ['enter a', 'exit a None'])
check('pop_all_defers_the_cleanup', _pop_all_defers_the_cleanup(),
      (['enter a'], ['enter a', 'exit a None']))


# ------------------------------------------------- the exception reaches exit

def _exit_is_told_the_exception():
    log = []

    def go():
        with ExitStack() as stack:
            stack.enter_context(Cm(log, 'a'))
            raise ValueError('boom')

    return (log, _outcome(go))


def _a_manager_can_suppress():
    log = []

    def go():
        with ExitStack() as stack:
            stack.enter_context(Cm(log, 'a', suppress=True))
            raise ValueError('boom')

    return (_outcome(go), log)


def _an_exception_from_a_cleanup_propagates():
    log = []

    def go():
        with ExitStack() as stack:
            stack.enter_context(
                Cm(log, 'a', raise_on_exit=RuntimeError('from exit')))

    return _outcome(go)


def _a_cleanup_exception_chains_to_the_body_one():
    def go():
        with ExitStack() as stack:
            stack.enter_context(
                Cm([], 'a', raise_on_exit=RuntimeError('from exit')))
            raise ValueError('from body')

    try:
        go()
    except RuntimeError as exc:
        return (str(exc), type(exc.__context__).__name__, str(exc.__context__))


check('exit_is_told_the_exception', _exit_is_told_the_exception(),
      (['enter a', 'exit a ValueError'], ('ValueError', 'boom')))
check('a_manager_can_suppress', _a_manager_can_suppress(),
      (('ok', None), ['enter a', 'exit a ValueError']))
check('an_exception_from_a_cleanup_propagates',
      _an_exception_from_a_cleanup_propagates(),
      ('RuntimeError', 'from exit'))
check('a_cleanup_exception_chains_to_the_body_one',
      _a_cleanup_exception_chains_to_the_body_one(),
      ('from exit', 'ValueError', 'from body'))


# ------------------------------------------------------------- callback()

def _callback_captures_arguments():
    log = []
    with ExitStack() as stack:
        stack.callback(lambda x, y=2: log.append(('cb', x, y)), 1)
    return log


def _callback_captures_keywords():
    log = []
    with ExitStack() as stack:
        stack.callback(lambda **kw: log.append(kw), a=1, b=2)
    return log


def _callback_returns_its_function():
    def f():
        pass
    with ExitStack() as stack:
        return stack.callback(f) is f


def _a_callback_cannot_suppress():
    """It is called for its effect; its return value is ignored."""
    def go():
        with ExitStack() as stack:
            stack.callback(lambda: True)
            raise ValueError('boom')

    return _outcome(go)[0]


check('callback_captures_arguments', _callback_captures_arguments(),
      [('cb', 1, 2)])
check('callback_captures_keywords', _callback_captures_keywords(),
      [{'a': 1, 'b': 2}])
check('callback_returns_its_function', _callback_returns_its_function(), True)
check('a_callback_cannot_suppress', _a_callback_cannot_suppress(),
      'ValueError')


# ----------------------------------------------------------------- push()

def _push_does_not_enter():
    """push registers an ALREADY entered manager -- it must not call
    __enter__, which is the whole difference from enter_context."""
    log = []
    with ExitStack() as stack:
        stack.push(Cm(log, 'pushed'))
    return log


def _push_returns_its_argument():
    cm = Cm([], 'x')
    with ExitStack() as stack:
        return stack.push(cm) is cm


check('push_does_not_enter', _push_does_not_enter(), ['exit pushed None'])
check('push_returns_its_argument', _push_returns_its_argument(), True)


# ------------------------------------------------------- AsyncExitStack

class ACm:
    def __init__(self, log, name, suppress=False):
        self.log, self.name, self.suppress = log, name, suppress

    async def __aenter__(self):
        self.log.append('aenter ' + self.name)
        return self.name

    async def __aexit__(self, exc_type, exc, tb):
        self.log.append('aexit %s %s'
                        % (self.name, exc_type.__name__ if exc_type else 'None'))
        return self.suppress


def _async_stack_unwinds():
    log = []

    async def main():
        async with AsyncExitStack() as stack:
            await stack.enter_async_context(ACm(log, 'a'))
            await stack.enter_async_context(ACm(log, 'b'))
        return log

    return asyncio.run(main())


def _async_stack_mixes_sync_and_async():
    log = []

    async def main():
        async with AsyncExitStack() as stack:
            stack.enter_context(Cm(log, 'sync'))
            await stack.enter_async_context(ACm(log, 'async'))
        return log

    return asyncio.run(main())


def _async_callback_runs():
    log = []

    async def cb(x):
        log.append(('acb', x))

    async def main():
        async with AsyncExitStack() as stack:
            stack.push_async_callback(cb, 7)
        return log

    return asyncio.run(main())


def _async_manager_can_suppress():
    log = []

    async def main():
        async with AsyncExitStack() as stack:
            await stack.enter_async_context(ACm(log, 'a', suppress=True))
            raise ValueError('boom')
        return 'suppressed'

    return (asyncio.run(main()), log)


def _aclose_unwinds_outside_the_block():
    log = []

    async def main():
        stack = AsyncExitStack()
        await stack.enter_async_context(ACm(log, 'a'))
        await stack.aclose()
        return log

    return asyncio.run(main())


def _enter_async_context_refuses_a_sync_manager():
    async def main():
        async with AsyncExitStack() as stack:
            await stack.enter_async_context(Cm([], 'sync'))

    return _outcome(lambda: asyncio.run(main()))[0]


check('async_stack_unwinds', _async_stack_unwinds(),
      ['aenter a', 'aenter b', 'aexit b None', 'aexit a None'])
check('async_stack_mixes_sync_and_async', _async_stack_mixes_sync_and_async(),
      ['enter sync', 'aenter async', 'aexit async None', 'exit sync None'])
check('async_callback_runs', _async_callback_runs(), [('acb', 7)])
check('async_manager_can_suppress', _async_manager_can_suppress(),
      ('suppressed', ['aenter a', 'aexit a ValueError']))
check('aclose_unwinds_outside_the_block', _aclose_unwinds_outside_the_block(),
      ['aenter a', 'aexit a None'])
check('enter_async_context_refuses_a_sync_manager',
      _enter_async_context_refuses_a_sync_manager(), 'TypeError')


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
