"""cr_await / gi_yieldfrom / ag_await: the delegation chain, made visible.

The delegating machinery now records its target, and the three spellings
read it back with CPython's gates, all measured on 3.14:

* ``cr_await`` -- the awaited object while the coroutine is PARKED
  mid-await, None while its body executes (test_cr_await asserts the None
  from inside the innermost frame, and the full chain
  ``coro_b.cr_await.cr_await.gi_code.co_name`` once suspended).
* ``gi_yieldfrom`` -- the sub-iterator, BY IDENTITY, while suspended
  inside a yield-from; None fresh, running, finished, or parked at a
  plain yield (the staleness case a cleared-at-completion target guards).
* ``ag_await`` -- the awaited object for the WHOLE asend-in-flight window:
  mid-await the async generator's state is AGEN_RUNNING (ag_running true,
  CPython's ag_running_async) and ag_await is the generator.

Every expectation was checked against CPython 3.14 first.
"""

import inspect
import types

RESULTS = {}


def check(name, fn, expected):
    try:
        RESULTS[name] = (fn() == expected) or repr(fn())
    except BaseException as exc:
        RESULTS[name] = 'raised %s: %s' % (type(exc).__name__, exc)


@types.coroutine
def _nop():
    yield


SEEN = []


async def _c():
    await _nop()


async def _b(inner):
    SEEN.append(inner.cr_await)      # None: b is executing right now
    await inner
    return 'done'


def _chain():
    inner = _c()
    cb = _b(inner)
    cb.send(None)
    parked = (inspect.getcoroutinestate(cb),
              type(cb.cr_await).__name__,
              type(cb.cr_await.cr_await).__name__,
              cb.cr_await.cr_await.gi_code.co_name,
              SEEN[0])
    cb.close()
    return parked


check('the_chain_while_suspended', _chain,
      ('CORO_SUSPENDED', 'coroutine', 'generator', '_nop', None))


def _fresh_and_closed():
    c = _c()
    fresh = c.cr_await
    c.close()
    return (fresh, c.cr_await)


check('fresh_and_closed_are_none', _fresh_and_closed, (None, None))


def _gi_yieldfrom_identity():
    def inner():
        yield 1
        yield 2

    ig = inner()

    def outer():
        yield from ig

    og = outer()
    fresh = og.gi_yieldfrom
    og.send(None)
    suspended_is_inner = og.gi_yieldfrom is ig
    og.close()
    return (fresh, suspended_is_inner)


check('gi_yieldfrom_is_the_inner_by_identity',
      _gi_yieldfrom_identity, (None, True))


def _plain_yield_park_shows_none():
    def inner():
        yield 'i'

    def outer():
        yield from inner()
        yield 'plain'

    og = outer()
    og.send(None)          # parked inside the delegation
    during = og.gi_yieldfrom is not None
    og.send(None)          # delegation done; parked at the PLAIN yield
    after = og.gi_yieldfrom
    og.close()
    return (during, after)


check('a_plain_yield_park_after_a_delegation_shows_none',
      _plain_yield_park_shows_none, (True, None))


async def _ag_with_await():
    await _nop()
    yield 1


def _ag_mid_await():
    g = _ag_with_await()
    step = g.asend(None)
    step.send(None)        # parked inside the body's await
    out = (inspect.getasyncgenstate(g),
           g.ag_running,
           type(g.ag_await).__name__,
           g.ag_await.gi_code.co_name)
    step.close()
    return out


check('ag_await_through_the_running_window', _ag_mid_await,
      ('AGEN_RUNNING', True, 'generator', '_nop'))


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
