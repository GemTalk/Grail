"""Fixture: generator, coroutine and async generator are sibling types.

In CPython all three derive from object alone.  A coroutine is not a
generator, nor an async generator, and each kind has only its own API: gi_* on
a generator, cr_* on a coroutine, ag_* and asend / athrow / aclose on an async
generator (which has no send / throw / close).

Grail built PythonCoroutine and PythonAsyncGenerator as SUBCLASSES of
PythonGenerator, to share its machinery, so every structural check answered as
for a generator:
* their __mro__ included generator;
* isinstance(coro, types.GeneratorType) was True, and so was
  collections.abc.Generator / Iterator / Iterable;
* an async generator had send / throw / close, and a coroutine had gi_code.
The machinery now lives in a hidden base the three share.

What Grail still does differently is pinned in KNOWN_DIVERGENCES.

Every EXPECTED check holds under CPython 3.14, which is what makes it
evidence.
"""

import collections.abc as abc
import inspect
import types

r = {}


def _try(thunk):
    try:
        return ('ok', thunk())
    except BaseException as e:
        return (type(e).__name__, str(e))


def gen():
    yield 1


async def coro():
    return 1


async def agen():
    yield 1


def _kinds():
    c = coro()
    out = (('generator', gen()), ('coroutine', c), ('async_generator', agen()))
    return out, c


def _names(t):
    return [k.__name__ for k in t]


r['mro'] = [_names(type(o).__mro__) for o in (gen(), agen())] + [
    _names(types.CoroutineType.__mro__)]
r['bases'] = [_names(t.__bases__) for t in
              (types.GeneratorType, types.CoroutineType, types.AsyncGeneratorType)]
r['subclass of generator'] = [issubclass(t, types.GeneratorType) for t in
                              (types.CoroutineType, types.AsyncGeneratorType)]

_ABCS = ('Iterable', 'Iterator', 'Generator', 'Awaitable', 'Coroutine',
         'AsyncIterable', 'AsyncIterator', 'AsyncGenerator')


def _structure():
    kinds, c = _kinds()
    try:
        out = {}
        for name, o in kinds:
            out[name] = (
                [n for n in _ABCS if isinstance(o, getattr(abc, n))],
                [isinstance(o, t) for t in (types.GeneratorType,
                                            types.CoroutineType,
                                            types.AsyncGeneratorType)],
                [inspect.isgenerator(o), inspect.iscoroutine(o),
                 inspect.isasyncgen(o), inspect.isawaitable(o)])
        return out
    finally:
        c.close()


r['structure'] = _try(_structure)

_API = ('send', 'throw', 'close', 'gi_code', 'gi_frame', 'gi_running',
        'gi_suspended', 'gi_yieldfrom', 'cr_code', 'cr_frame', 'cr_await',
        'ag_code', 'ag_frame', 'ag_await', 'asend', 'athrow', 'aclose',
        '_raiseThrown', '_resignalable', '_signalEscapedException')


def _api():
    kinds, c = _kinds()
    try:
        return {name: [n for n in _API if hasattr(o, n)] for name, o in kinds}
    finally:
        c.close()


r['api'] = _try(_api)


def _iteration():
    out = []
    for mk in (coro, agen):
        for name, f in (('iter', iter), ('next', next), ('list', list),
                        ('for', lambda o: [x for x in o]), ('star', lambda o: [*o]),
                        ('in', lambda o: 1 in o)):
            o = mk()
            out.append((name, _try(lambda: f(o))))
            if mk is coro:
                o.close()
    return out


r['iteration'] = _try(_iteration)


def _still_drive():
    import asyncio

    async def inner():
        await asyncio.sleep(0)
        return 'inner'

    async def ag():
        yield await inner()
        yield 2

    async def main():
        out = [await inner()]
        out.append([x async for x in ag()])
        a = ag()
        out.append(await a.asend(None))
        out.append(await a.aclose())
        return out

    c = coro()
    try:
        c.send(None)
    except StopIteration as e:
        sent = e.value
    g = gen()
    return (asyncio.run(main()), sent, next(g), g.send(None) if False else None,
            g.close())


r['all three still run'] = _try(_still_drive)


def _hasattr_iter():
    kinds, c = _kinds()
    try:
        return [hasattr(o, '__iter__') for _, o in kinds]
    finally:
        c.close()


r['hasattr __iter__'] = _try(_hasattr_iter)


def _star_call():
    c = coro()
    try:
        def f(*a):
            return a
        return f(*c)
    finally:
        c.close()


r['a coroutine as a star argument'] = _try(_star_call)


def _msg(kind, word):
    return ('TypeError', "'%s' object is not %s" % (kind, word))


EXPECTED = {
    'mro': [['generator', 'object'], ['async_generator', 'object'],
            ['coroutine', 'object']],
    'bases': [['object'], ['object'], ['object']],
    'subclass of generator': [False, False],
    'structure': ('ok', {
        'generator': (['Iterable', 'Iterator', 'Generator'],
                      [True, False, False], [True, False, False, False]),
        'coroutine': (['Awaitable', 'Coroutine'],
                      [False, True, False], [False, True, False, True]),
        'async_generator': (['AsyncIterable', 'AsyncIterator', 'AsyncGenerator'],
                            [False, False, True], [False, False, True, False]),
    }),
    'api': ('ok', {
        'generator': ['send', 'throw', 'close', 'gi_code', 'gi_frame',
                      'gi_running', 'gi_suspended', 'gi_yieldfrom'],
        'coroutine': ['send', 'throw', 'close', 'cr_code', 'cr_frame', 'cr_await'],
        'async_generator': ['ag_code', 'ag_frame', 'ag_await', 'asend',
                            'athrow', 'aclose'],
    }),
    'iteration': ('ok', [
        ('iter', _msg('coroutine', 'iterable')),
        ('next', _msg('coroutine', 'an iterator')),
        ('list', _msg('coroutine', 'iterable')),
        ('for', _msg('coroutine', 'iterable')),
        ('star', ('TypeError', 'Value after * must be an iterable, not coroutine')),
        ('in', ('TypeError', "argument of type 'coroutine' is not a container or iterable")),
        ('iter', _msg('async_generator', 'iterable')),
        ('next', _msg('async_generator', 'an iterator')),
        ('list', _msg('async_generator', 'iterable')),
        ('for', _msg('async_generator', 'iterable')),
        ('star', ('TypeError', 'Value after * must be an iterable, not async_generator')),
        ('in', ('TypeError', "argument of type 'async_generator' is not a container or iterable")),
    ]),
    'all three still run': ('ok', (['inner', ['inner', 2], 'inner', None], 1, 1, None, None)),
}

KNOWN_DIVERGENCES = {
    # CPython: ('ok', [True, False, False]).  Every Grail Python instance
    # inherits PythonInstance's fallback __iter__ / __next__, so hasattr
    # answers True for anything; collections.abc reads __dict__ and is right.
    'hasattr __iter__': ('ok', [True, True, True]),
    # CPython: ('TypeError', '..._star_call.<locals>.f() argument after * must
    # be an iterable, not coroutine') -- Grail's call-site message for any
    # non-iterable star argument omits the function.
    'a coroutine as a star argument': (
        'TypeError', 'Value after * must be an iterable, not coroutine'),
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS,
    sorted(r) == sorted(list(EXPECTED) + list(KNOWN_DIVERGENCES)))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        ok = actual == EXPECTED[key]
        print('%-5s %-32s -> %s' % ('OK' if ok else 'FAIL', key,
                                    'as expected' if ok else repr(actual)))
    for key, expected in KNOWN_DIVERGENCES.items():
        actual = r[key]
        print('%-5s %-32s -> %r' % ('OK' if actual == expected else 'XFAIL',
                                    key, actual))
    print(SUMMARY)
