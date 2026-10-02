"""Fixture: async generator EXPRESSIONS (PEP 530's `(x async for x in ...)`).

An async genexp is not an async comprehension with different brackets.  A
comprehension runs to completion and hands back a container; a genexp hands back
a lazy PythonAsyncGenerator whose body runs on demand, so three things differ:

  * the wrapper is ``PythonAsyncGenerator withBlock:'' and the element is
    delivered by ``___asyncYield___:'' rather than appended to a collection;
  * the OUTERMOST iterable is evaluated -- and ``__aiter__''ed -- at
    CONSTRUCTION, in the enclosing scope, not when the generator is first
    driven;
  * because of that, the outermost clause must NOT acquire the iterator a
    second time.  A second ``__aiter__'' is a protocol violation for a one-shot
    iterable, and the sync path's habit of calling ``iter()'' twice (harmless,
    since ``iter(iter(x)) is iter(x)'') does not carry over.

``each_genexp_binds_its_own_loop_variable'' is the check that construction-time
evaluation exists for.  Written the lazy way it would be wrong: both generators
would close over the SAME ``j'' and read it after the enclosing loop finished,
giving range(5) twice.  CPython gives range(3) then range(5), and so must Grail.

``a_one_shot_source_is_not_restarted'' is the check the second-__aiter__ bug
would fail: the hand-written iterator counts how many times __aiter__ is asked
for, and the answer must be one.

Everything here is verified against real CPython by running the file directly.
"""

import asyncio

r = {}


async def arange(n):
    for i in range(n):
        yield i


async def drain(g):
    return [v async for v in g]


class CountingAiter:
    """Counts __aiter__ calls, so a double acquisition is visible."""

    def __init__(self, items):
        self.items = list(items)
        self.aiter_calls = 0

    def __aiter__(self):
        self.aiter_calls += 1
        return self

    async def __anext__(self):
        if not self.items:
            raise StopAsyncIteration
        return self.items.pop(0)


async def a_plain_async_genexp():
    return await drain(x * 2 async for x in arange(3))


async def a_filtered_async_genexp():
    return await drain(x async for x in arange(6) if x % 2 == 0)


async def async_then_sync_clause():
    return await drain((a, b) async for a in arange(2) for b in [10, 20])


async def sync_then_async_clause():
    return await drain((a, b) for a in [1, 2] async for b in arange(2))


async def each_genexp_binds_its_own_loop_variable():
    """Construction-time evaluation of the OUTERMOST iterable, which is the
    whole reason the wrapper takes a parameter."""
    gens = [(i async for i in arange(j)) for j in [3, 5]]
    return [await drain(g) for g in gens]


async def a_one_shot_source_is_not_restarted():
    src = CountingAiter([1, 2, 3])
    got = await drain(x async for x in src)
    return got, src.aiter_calls


async def it_is_lazy():
    """Constructing the genexp must not consume the source."""
    seen = []

    async def noisy():
        for i in range(3):
            seen.append(i)
            yield i

    g = (x async for x in noisy())
    before = list(seen)
    out = await drain(g)
    return before, out


async def the_element_may_await():
    async def double(v):
        return v * 2
    return await drain(await double(x) async for x in arange(3))


async def an_empty_source():
    return await drain(x async for x in arange(0))


async def it_is_an_async_generator():
    g = (x async for x in arange(1))
    got = hasattr(g, '__anext__') and hasattr(g, '__aiter__')
    await drain(g)
    return got


async def main():
    r['a_plain_async_genexp'] = await a_plain_async_genexp()
    r['a_filtered_async_genexp'] = await a_filtered_async_genexp()
    r['async_then_sync_clause'] = await async_then_sync_clause()
    r['sync_then_async_clause'] = await sync_then_async_clause()
    r['each_genexp_binds_its_own_loop_variable'] = \
        await each_genexp_binds_its_own_loop_variable()
    r['a_one_shot_source_is_not_restarted'] = \
        await a_one_shot_source_is_not_restarted()
    r['it_is_lazy'] = await it_is_lazy()
    r['the_element_may_await'] = await the_element_may_await()
    r['an_empty_source'] = await an_empty_source()
    r['it_is_an_async_generator'] = await it_is_an_async_generator()


asyncio.run(main())


# --------------------------------------------------------------------------
# A LIST comprehension is not a genexp, and must still acquire its iterator.
#
# The outermost clause of a GENEXP must not __aiter__ a second time, because
# construction already did.  A list comprehension's must, because nothing has.
# Getting that distinction wrong is silent for every well-formed source and
# only shows up here: driving a plain list as if it were an async iterator.
# CPython raises TypeError; so must Grail, on both paths.
# --------------------------------------------------------------------------


async def async_comp_over_a_plain_list():
    try:
        return [x async for x in [1, 2]]
    except TypeError as exc:
        return 'TypeError: %s' % ('__aiter__' in str(exc))


async def async_genexp_over_a_plain_list():
    try:
        g = (x async for x in [1, 2])
        return [v async for v in g]
    except TypeError as exc:
        return 'TypeError: %s' % ('__aiter__' in str(exc))


async def more_shapes():
    r['async_comp_over_a_plain_list'] = await async_comp_over_a_plain_list()
    r['async_genexp_over_a_plain_list'] = await async_genexp_over_a_plain_list()


asyncio.run(more_shapes())


# --------------------------------------------------------------------------
# AN AWAIT INSIDE THE GENEXP, WHERE THE GENEXP IS DECLARED IN A PLAIN def.
#
# The genexp's own wrapper binds ``___gen___'', so an await inside it has a
# coroutine to suspend whatever the enclosing function is.  AwaitAst used to
# decide by asking about the ENCLOSING FUNCTION only, so inside an ordinary def
# it emitted the class-side form, which runs the awaited object inline and
# cannot suspend.  A coroutine that DID suspend then answered None:
#
#     def make(n):
#         return (await sleeper(i) for i in range(n))       -> [None, None, ...]
#         return (i for i in range(n) if await sleeper(i))  -> []
#
# In a filter None is falsy, so every element was dropped and the genexp yielded
# nothing.  Declaring the SAME genexp inside an ``async def'' always worked,
# which is what localised it.
#
# ONLY THE SUSPENDING CASE IS AFFECTED.  Awaiting a coroutine that returns
# without suspending gave the right answer throughout, so `sleeper' must really
# sleep -- ``the_element_may_await'' above awaits a plain coroutine from an
# ``async def'' and passes either way, which is why this went unnoticed.
#
# test_asyncgen's test_async_gen_expression_02 is the filter case (#1272).
# --------------------------------------------------------------------------


async def sleeper(n):
    """Suspends, unlike a coroutine that merely returns."""
    await asyncio.sleep(0.01)
    return n


def genexp_awaiting_in_its_element(n):
    return (await sleeper(i * 2) for i in range(n))


def genexp_awaiting_in_its_filter(n):
    return (i * 2 for i in range(n) if await sleeper(i))


async def awaits_in_a_genexp_from_a_plain_def():
    return (await drain(genexp_awaiting_in_its_element(4)),
            await drain(genexp_awaiting_in_its_filter(5)))


async def awaits_in_a_genexp_from_an_async_def():
    """The spelling that always worked, asserted so a repair that traded one
    position for the other could not pass."""
    element = (await sleeper(i * 2) for i in range(4))
    got_element = await drain(element)
    filtered = (i * 2 for i in range(5) if await sleeper(i))
    return got_element, await drain(filtered)


async def plain_def_shapes():
    r['awaits_in_a_genexp_from_a_plain_def'] = \
        await awaits_in_a_genexp_from_a_plain_def()
    r['awaits_in_a_genexp_from_an_async_def'] = \
        await awaits_in_a_genexp_from_an_async_def()


asyncio.run(plain_def_shapes())


EXPECTED = {
    'a_plain_async_genexp': [0, 2, 4],
    'a_filtered_async_genexp': [0, 2, 4],
    'async_then_sync_clause': [(0, 10), (0, 20), (1, 10), (1, 20)],
    'sync_then_async_clause': [(1, 0), (1, 1), (2, 0), (2, 1)],
    'each_genexp_binds_its_own_loop_variable': [[0, 1, 2], [0, 1, 2, 3, 4]],
    'a_one_shot_source_is_not_restarted': ([1, 2, 3], 1),
    'it_is_lazy': ([], [0, 1, 2]),
    'the_element_may_await': [0, 2, 4],
    'an_empty_source': [],
    'it_is_an_async_generator': True,
    # The list-comprehension side of the same distinction: nothing acquired
    # the iterator at construction, so the clause must, and a plain list has
    # no __aiter__.
    'async_comp_over_a_plain_list': 'TypeError: True',
    'async_genexp_over_a_plain_list': 'TypeError: True',
    # An await inside the genexp, the genexp declared in a PLAIN def.  Both
    # entries are the same pair on purpose: where the genexp is written must
    # make no difference.
    'awaits_in_a_genexp_from_a_plain_def': ([0, 2, 4, 6], [2, 4, 6, 8]),
    'awaits_in_a_genexp_from_an_async_def': ([0, 2, 4, 6], [2, 4, 6, 8]),
}


if __name__ == '__main__':
    for key, expected in EXPECTED.items():
        actual = r[key]
        print('%-5s %-44s -> %r' % ('OK' if actual == expected else 'FAIL',
                                    key, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-5s %-44s is not in EXPECTED' % ('FAIL', extra))
