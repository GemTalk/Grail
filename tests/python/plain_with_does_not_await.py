"""A plain `with` binds what `__enter__` returns, and awaits nothing.

    with contextlib.closing(generator) as it:
        ...                                  # it was None

Grail compiled every `with` through the same await helper `async with` needs,
on the reasoning that the helper passes a non-coroutine straight through.  It
does not pass a GENERATOR through: it drives anything generator-shaped to
completion, as `await` must for a generator-based coroutine.  So an `__enter__`
that returned a generator had it RUN, and the `as` target got the generator's
return value -- None.

`contextlib.closing(gen())` is a common idiom, and it is exactly how CPython's
own glob lists a directory.

The controls pin the other half: `async with` still awaits `__aenter__` --
including one that genuinely suspends, which is the shape that once let a body
run without holding a contended asyncio.Lock.

Every expectation here was measured against CPython 3.14.
"""

import asyncio
import contextlib

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:120])


def _numbers():
    yield 1
    yield 2
    return 'the return value the old code bound'


class _EntersAGenerator:
    def __enter__(self):
        return _numbers()

    def __exit__(self, *exc_info):
        return False


async def _a_coroutine():
    return 'awaited'


class _EntersACoroutine:
    def __enter__(self):
        return _a_coroutine()

    def __exit__(self, *exc_info):
        return False


class _Plain:
    def __enter__(self):
        return 'entered'

    def __exit__(self, *exc_info):
        return False


# ------------------------------------------------------------- the bug

def _closing_a_generator():
    with contextlib.closing(_numbers()) as it:
        return type(it).__name__, list(it)


check('closing_a_generator_binds_the_generator', _closing_a_generator(),
      ('generator', [1, 2]))


def _enter_returns_a_generator():
    with _EntersAGenerator() as it:
        return type(it).__name__, list(it)


check('an_enter_that_returns_a_generator_binds_it_unrun',
      _enter_returns_a_generator(), ('generator', [1, 2]))


def _enter_returns_a_coroutine():
    with _EntersACoroutine() as it:
        kind = type(it).__name__
        it.close()          # never awaited, on purpose: nothing awaits it here
        return kind


check('an_enter_that_returns_a_coroutine_binds_it_unawaited',
      _enter_returns_a_coroutine(), 'coroutine')


def _nested():
    with contextlib.closing(_numbers()) as outer, _Plain() as inner:
        return list(outer), inner


check('nested_items_each_bind_their_own_value', _nested(), ([1, 2], 'entered'))


# ---------------------------------------------- the paths that still await

def _plain():
    with _Plain() as value:
        return value


check('a_plain_manager_is_unchanged', _plain(), 'entered')


class _Suspends:
    async def __aenter__(self):
        await asyncio.sleep(0)
        return 'async-entered'

    async def __aexit__(self, *exc_info):
        await asyncio.sleep(0)
        return False


async def _async_with():
    async with _Suspends() as value:
        return value


check('async_with_still_awaits_an_aenter_that_suspends',
      asyncio.run(_async_with()), 'async-entered')


async def _contended():
    lock = asyncio.Lock()
    order = []

    async def worker(name):
        async with lock:
            order.append(name + ' in')
            await asyncio.sleep(0)
            order.append(name + ' out')

    await asyncio.gather(worker('a'), worker('b'))
    return order


check('async_with_still_holds_a_contended_lock_across_the_body',
      asyncio.run(_contended()), ['a in', 'a out', 'b in', 'b out'])


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
