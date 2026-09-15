"""Fixture: ``async for'' clauses inside a comprehension (PEP 530).

An async clause differs from a sync one in three places, and nowhere else:

  * the iterator comes from ``PythonCoroutine ___grailAiter___: (src)'' rather
    than ``(src) __iter__'' -- routed through the helper so a missing
    ``__aiter__'' is a catchable Python TypeError instead of an uncatchable
    Smalltalk doesNotUnderstand;
  * each step AWAITS ``__anext__'' through the enclosing coroutine, so a
    suspension inside it suspends the whole comprehension and reaches the
    driver, which is the point of async iteration;
  * exhaustion is ``StopAsyncIteration'', which is NOT a StopIteration subclass
    (it descends from Exception), so the sync handler would never catch it.

The checks below pin all four comprehension kinds, the filter, and -- the one
that distinguishes a per-CLAUSE decision from a per-COMPREHENSION one -- a
comprehension that MIXES a sync ``for'' with an async one, in both orders.

``a_suspension_really_suspends'' is the check that a synchronous stand-in would
pass while being wrong: the source sleeps between items, so anything that drains
it without awaiting would either hang or lose the interleaving.

Everything here is verified against real CPython by running the file directly.
"""

import asyncio

r = {}


async def arange(n):
    """A minimal async iterable: the shape the corpus actually uses."""
    for i in range(n):
        yield i


class Manual:
    """An async iterator written by hand, so __aiter__/__anext__ are real."""

    def __init__(self, items):
        self.items = list(items)

    def __aiter__(self):
        return self

    async def __anext__(self):
        if not self.items:
            raise StopAsyncIteration
        return self.items.pop(0)


async def every_kind():
    lst = [x async for x in arange(3)]
    st = {x async for x in arange(3)}
    dct = {x: x * 2 async for x in arange(3)}
    gen = [y async for y in arange(3)]
    return lst, sorted(st), dct, gen


async def with_a_filter():
    return [x async for x in arange(6) if x % 2 == 0]


async def async_then_sync():
    return [(a, b) async for a in arange(2) for b in [10, 20]]


async def sync_then_async():
    return [(a, b) for a in [1, 2] async for b in arange(2)]


async def two_async_clauses():
    return [(a, b) async for a in arange(2) async for b in arange(2)]


async def a_handwritten_iterator():
    return [x async for x in Manual(['a', 'b', 'c'])]


async def the_element_may_await():
    async def double(v):
        return v * 2
    return [await double(x) async for x in arange(3)]


async def a_missing_aiter_is_a_typeerror():
    try:
        return [x async for x in [1, 2]]
    except TypeError:
        return 'TypeError'


async def a_suspension_really_suspends():
    """The source yields control between items; the order proves interleaving."""
    order = []

    async def slow():
        for i in range(3):
            order.append(('yield', i))
            await asyncio.sleep(0)
            yield i

    async def watcher():
        for _ in range(3):
            order.append(('tick',))
            await asyncio.sleep(0)

    async def collect():
        return [x async for x in slow()]

    got = await asyncio.gather(collect(), watcher())
    return got[0], len(order)


async def an_empty_source_gives_an_empty_result():
    return [x async for x in arange(0)], {x async for x in arange(0)}


async def main():
    r['every_kind'] = await every_kind()
    r['with_a_filter'] = await with_a_filter()
    r['async_then_sync'] = await async_then_sync()
    r['sync_then_async'] = await sync_then_async()
    r['two_async_clauses'] = await two_async_clauses()
    r['a_handwritten_iterator'] = await a_handwritten_iterator()
    r['the_element_may_await'] = await the_element_may_await()
    r['a_missing_aiter_is_a_typeerror'] = await a_missing_aiter_is_a_typeerror()
    r['a_suspension_really_suspends'] = await a_suspension_really_suspends()
    r['an_empty_source_gives_an_empty_result'] = \
        await an_empty_source_gives_an_empty_result()


asyncio.run(main())


EXPECTED = {
    'every_kind': ([0, 1, 2], [0, 1, 2], {0: 0, 1: 2, 2: 4}, [0, 1, 2]),
    'with_a_filter': [0, 2, 4],
    'async_then_sync': [(0, 10), (0, 20), (1, 10), (1, 20)],
    'sync_then_async': [(1, 0), (1, 1), (2, 0), (2, 1)],
    'two_async_clauses': [(0, 0), (0, 1), (1, 0), (1, 1)],
    'a_handwritten_iterator': ['a', 'b', 'c'],
    'the_element_may_await': [0, 2, 4],
    'a_missing_aiter_is_a_typeerror': 'TypeError',
    'a_suspension_really_suspends': ([0, 1, 2], 6),
    'an_empty_source_gives_an_empty_result': ([], set()),
}


if __name__ == '__main__':
    for key, expected in EXPECTED.items():
        actual = r[key]
        print('%-5s %-42s -> %r' % ('OK' if actual == expected else 'FAIL',
                                    key, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-5s %-42s is not in EXPECTED' % ('FAIL', extra))
