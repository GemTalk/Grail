"""A coroutine is not iterable; an async generator is not sync-iterable.

CPython refuses at the protocol boundary, before running any of the body:

    iter(coro)  / for / list / tuple / sum / a comprehension
        -> TypeError: 'coroutine' object is not iterable
    next(coro)
        -> TypeError: 'coroutine' object is not an iterator

and the async-generator twins say 'async_generator'.  Grail inherited the
generator's ``__iter__ -> self`` in both subclasses, so ``list(coro)`` DROVE
the coroutine -- test_func_4's body raised StopIteration mid-drive and
surfaced as PEP 479's RuntimeError -- and ``for v in agen()`` bound internal
PyAsyncYield carrier objects as items.

The refusal lives ONLY at the Python protocol boundary (__iter__ / __next__).
The delegation underneath is untouched, which two checks below pin:
``await coro`` still delegates, and a @types.coroutine generator doing
``yield from coro`` still works -- that pattern is legal in CPython (the
decorator's flag makes it so) and load-bearing for vendored asyncio.
PythonGenerator >> do: now drives ``send:`` directly rather than __next__,
which is what keeps the internal path open while the protocol refuses.

Every expectation was checked against CPython 3.14 first.
"""

import types

RESULTS = {}


def check(name, fn, expected):
    try:
        RESULTS[name] = (fn() == expected) or repr(fn())
    except BaseException as exc:
        RESULTS[name] = 'raised %s: %s' % (type(exc).__name__, exc)


def refusal(fn):
    try:
        fn()
        return '<no error>'
    except BaseException as exc:
        return '%s: %s' % (type(exc).__name__, exc)


BODY_RAN = []


async def _coro():
    BODY_RAN.append('coro')
    return 1


async def _agen():
    BODY_RAN.append('agen')
    yield 1


NOT_ITERABLE = "TypeError: 'coroutine' object is not iterable"


def _with_coro(fn):
    c = _coro()
    try:
        return refusal(lambda: fn(c))
    finally:
        c.close()


# ------------------------------------------------- the coroutine refusals

check('iter_refuses', lambda: _with_coro(iter), NOT_ITERABLE)
check('list_refuses', lambda: _with_coro(list), NOT_ITERABLE)
check('tuple_refuses', lambda: _with_coro(tuple), NOT_ITERABLE)
check('sum_refuses', lambda: _with_coro(sum), NOT_ITERABLE)


def _for_loop(c):
    for _ in c:
        pass


check('for_refuses', lambda: _with_coro(_for_loop), NOT_ITERABLE)
check('comprehension_refuses',
      lambda: _with_coro(lambda c: [v for v in c]), NOT_ITERABLE)
check('next_refuses', lambda: _with_coro(next),
      "TypeError: 'coroutine' object is not an iterator")
check('the_body_never_ran', lambda: BODY_RAN, [])


# ------------------------------------------------- the async-generator twins

def _with_agen(fn):
    a = _agen()
    return refusal(lambda: fn(a))


check('agen_iter_refuses', lambda: _with_agen(iter),
      "TypeError: 'async_generator' object is not iterable")
check('agen_list_refuses', lambda: _with_agen(list),
      "TypeError: 'async_generator' object is not iterable")
check('agen_next_refuses', lambda: _with_agen(next),
      "TypeError: 'async_generator' object is not an iterator")
check('the_agen_body_never_ran_either', lambda: BODY_RAN, [])


# ------------------------------------------------- delegation is untouched

def _drive(coro):
    try:
        coro.send(None)
        return '<suspended>'
    except StopIteration as exc:
        return exc.value


async def _awaits():
    return await _coro()


def _await_still_delegates():
    out = _drive(_awaits())
    ran = list(BODY_RAN)
    del BODY_RAN[:]
    return (out, ran)


check('await_still_delegates', _await_still_delegates, (1, ['coro']))


@types.coroutine
def _yields_from():
    return (yield from _coro())


def _decorated_yield_from():
    out = _drive(_yields_from())
    ran = list(BODY_RAN)
    del BODY_RAN[:]
    return (out, ran)


check('decorated_yield_from_still_delegates',
      _decorated_yield_from, (1, ['coro']))


async def _async_iterates():
    return [v async for v in _agen()]


def _async_for_still_works():
    out = _drive(_async_iterates())
    ran = list(BODY_RAN)
    del BODY_RAN[:]
    return (out, ran)


check('async_for_still_works', _async_for_still_works, ([1], ['agen']))


def _plain_gen():
    yield 'g'


check('plain_generators_still_iterate',
      lambda: list(_plain_gen()), ['g'])


# ------------------------------------------------- the coroutine_wrapper

# What __await__() answers instead of the coroutine: CPython's
# _PyCoroWrapper_Type, the iterator the coroutine itself refuses to be.
# Everything semantic -- delivery, then the reuse refusal -- is the
# coroutine's own, forwarded.

def _wrapper_facts():
    c = _coro()
    w = c.__await__()
    facts = (type(w).__name__,
             'coroutine_wrapper' in repr(w),
             iter(w) is w)
    del BODY_RAN[:]
    c.close()
    return facts


check('await_dunder_answers_a_coroutine_wrapper',
      _wrapper_facts, ('coroutine_wrapper', True, True))


def _wrapper_drives_and_then_refuses():
    w = _coro().__await__()
    try:
        w.send(None)
        delivered = '<suspended>'
    except StopIteration as exc:
        delivered = exc.value
    try:
        next(w)
        reuse = '<no error>'
    except RuntimeError as exc:
        reuse = str(exc)
    del BODY_RAN[:]
    return (delivered, reuse)


check('wrapper_delivers_then_refuses_reuse',
      _wrapper_drives_and_then_refuses,
      (1, 'cannot reuse already awaited coroutine'))


class _ForwardingAwaitable:
    """test_await_14's shape: a custom __await__ that hands over the
    wrapped coroutine's own iterator."""

    def __init__(self, coro):
        self._coro = coro

    def __await__(self):
        return self._coro.__await__()


async def _awaits_through_forwarder():
    return await _ForwardingAwaitable(_coro())


def _forwarded_await():
    out = _drive(_awaits_through_forwarder())
    del BODY_RAN[:]
    return out


check('custom_await_may_return_the_wrapper', _forwarded_await, 1)


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
