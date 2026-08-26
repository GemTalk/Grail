"""Delegation boundaries: who may ``yield from`` a coroutine, and an async
generator is neither iterable nor awaitable.

CPython keys the first on CO_ITERABLE_COROUTINE: ``yield from <coroutine>``
inside a plain generator is

    TypeError: cannot 'yield from' a coroutine object in a non-coroutine
    generator

while a @types.coroutine generator may -- that is how await is built.  Grail
reads the mark the decorator's wrapper stamps on each result generator, and
lets an async generator's own body awaits (which travel the same delegation
path, with the asyncgen as delegator) pass untouched.

The second pair closes the family-direct fast path in the delegation that
bypassed the __iter__/__await__ refusals: ``yield from <async generator>``
is "'async_generator' object is not iterable" for every delegator, and
``await <async generator>`` is "'async_generator' object can't be awaited"
-- await's own wording, checked before the delegation would refuse with
iteration's.

Every expectation was checked against CPython 3.14 first.
"""

import types

RESULTS = {}


def check(name, fn, expected):
    try:
        RESULTS[name] = (fn() == expected) or repr(fn())
    except BaseException as exc:
        RESULTS[name] = 'raised %s: %s' % (type(exc).__name__, exc)


def outcome(fn):
    try:
        return ('v', fn())
    except StopIteration as exc:
        return ('stop', exc.value)
    except BaseException as exc:
        return '%s: %s' % (type(exc).__name__, exc)


async def _five():
    return 5


async def _agen():
    yield 1


def _drive(coro):
    try:
        coro.send(None)
        return '<suspended>'
    except StopIteration as exc:
        return exc.value


# ------------------------------------------------- the coroutine guard

def _plain_delegates_to_coroutine():
    c = _five()
    def g():
        yield from c
    try:
        return outcome(lambda: list(g()))
    finally:
        c.close()


check('plain_generator_may_not_yield_from_a_coroutine',
      _plain_delegates_to_coroutine,
      "TypeError: cannot 'yield from' a coroutine object in a "
      'non-coroutine generator')


@types.coroutine
def _decorated_delegate():
    return (yield from _five())


check('a_decorated_generator_may',
      lambda: _drive(_decorated_delegate()), 5)


async def _agen_with_await():
    x = await _five()
    yield x


def _asyncgen_body_awaits():
    a = _agen_with_await()
    try:
        a.asend(None).send(None)
        return '<suspended>'
    except StopIteration as exc:
        return exc.value


check('an_async_generators_own_awaits_still_pass',
      _asyncgen_body_awaits, 5)


async def _awaits_coro():
    return await _five()


check('await_of_a_coroutine_still_works',
      lambda: outcome(lambda: _awaits_coro().send(None)),
      ('stop', 5))


# ------------------------------------------------- the async-generator pair

async def _awaits_agen():
    await _agen()


check('await_of_an_async_generator_refuses',
      lambda: outcome(lambda: _awaits_agen().send(None)),
      "TypeError: 'async_generator' object can't be awaited")


def _plain_yields_from_agen():
    a = _agen()
    def g():
        yield from a
    return outcome(lambda: list(g()))


check('plain_yield_from_an_async_generator_refuses',
      _plain_yields_from_agen,
      "TypeError: 'async_generator' object is not iterable")


def _decorated_yields_from_agen():
    a = _agen()

    @types.coroutine
    def g():
        return (yield from a)
    return outcome(lambda: _drive(g()))


check('decorated_yield_from_an_async_generator_refuses_too',
      _decorated_yields_from_agen,
      "TypeError: 'async_generator' object is not iterable")


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
