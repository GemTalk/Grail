"""Fixture: types.coroutine flags a generator function and wraps the rest.

CPython's types.coroutine hands an ``async def`` back untouched, flags a
generator function's code with CO_ITERABLE_COROUTINE and hands THAT function
back too, and wraps anything else that returns a generator-like object in
types._GeneratorWrapper.  The flag is what lets the function's generators
``yield from`` a coroutine, count as awaitable, and stand as an __anext__
result.

Grail wrapped every function and stamped each result generator instead, so
``types.coroutine(gen) is gen`` was False and there was no _GeneratorWrapper.
The flag now lives on the code -- by identity too, because a def compiled to
a method (module level, a class body, a class defined inside a function)
builds a fresh code object for each generator, and a closure's __code__
cannot be replaced.  Every shape is checked below.

Also: type() keeps a tuple subclass given as the bases, as __bases__.

Every EXPECTED check holds under CPython 3.14, which is what makes it
evidence.
"""

import asyncio
import collections.abc
import inspect
import sys
import types

r = {}


def _try(thunk):
    try:
        return ('ok', thunk())
    except BaseException as e:
        return (type(e).__name__, str(e))


def run(coro):
    try:
        while True:
            coro.send(None)
    except StopIteration as e:
        return e.value


async def spam():
    return 'spam'


def _local_generator_function():
    def gen():
        yield
    same = types.coroutine(gen) is gen
    again = types.coroutine(types.coroutine(gen)) is gen
    flagged = bool(gen.__code__.co_flags & inspect.CO_ITERABLE_COROUTINE)
    gi_flagged = bool(gen().gi_code.co_flags & inspect.CO_ITERABLE_COROUTINE)
    return (same, again, flagged, gi_flagged)


r['a generator function is returned itself, flagged'] = _try(
    _local_generator_function)


def _async_def():
    async def foo():
        pass
    flags = foo.__code__.co_flags
    return (types.coroutine(foo) is foo, foo.__code__.co_flags == flags)


r['an async def is returned untouched'] = _try(_async_def)


@types.coroutine
def module_level(coro):
    return (yield from coro)


class Holder:
    @types.coroutine
    def method(self, coro):
        return (yield from coro)


def _shapes():
    @types.coroutine
    def local(coro):
        return (yield from coro)

    def closure_maker():
        captured = 'x'

        @types.coroutine
        def closure(coro):
            captured
            return (yield from coro)
        return closure

    class InFunction:
        @types.coroutine
        def method(self, coro):
            return (yield from coro)

    makers = [local, module_level, Holder().method, closure_maker(),
              InFunction().method]
    return [(run(m(spam())), inspect.isawaitable(m(None))) for m in makers]


r['yield from a coroutine, and isawaitable, for every def shape'] = _try(_shapes)


def _plain_generator():
    def plain(coro):
        return (yield from coro)
    awaitable = inspect.isawaitable(plain(None))
    coro = spam()
    try:
        run(plain(coro))
    except TypeError as e:
        return (awaitable, str(e))
    finally:
        coro.close()
    return (awaitable, 'ran')


r['an unflagged generator is neither'] = _try(_plain_generator)


def _wrapper():
    def gen():
        yield 1
        return (yield 2)
    g = gen()

    @types.coroutine
    def returns_generator():
        return g
    w = returns_generator()
    return (type(w).__name__, w.__await__() is g, w.cr_code is g.gi_code,
            isinstance(w, collections.abc.Coroutine), 'GeneratorWrapper' in repr(w),
            next(w), w.send(None))


r['a function returning a generator is wrapped'] = _try(_wrapper)


def _duck_generator():
    class Duck:
        def __init__(self):
            self.i = 0
        def __iter__(self):
            return self
        def __next__(self):
            return self.send(None)
        def send(self, v):
            self.i += 1
            if self.i == 1:
                return 'fut'
            raise StopIteration(v * 2)
        def throw(self, *a):
            raise a[0]
        def close(self):
            pass

    @types.coroutine
    def foo():
        return Duck()

    async def corofunc():
        return await foo() + 100
    coro = corofunc()
    first = coro.send(None)
    try:
        coro.send(20)
    except StopIteration as e:
        return (type(foo()).__name__, first, e.value)


r['a generator-like object is wrapped and awaited'] = _try(_duck_generator)


def _passthrough():
    class Aw:
        def __await__(self):
            return iter(())
    aw = Aw()

    @types.coroutine
    def foo():
        return aw

    @types.coroutine
    def bar():
        return 'value'
    return (foo() is aw, types.coroutine(foo)() is aw, bar())


r['anything else passes through'] = _try(_passthrough)
r['a non-callable is refused'] = _try(lambda: types.coroutine(1))


def _anext():
    class Iter:
        def __init__(self):
            self.n = 0
        def __aiter__(self):
            return self
        @types.coroutine
        def __anext__(self):
            if False:
                yield
            if self.n >= 2:
                raise StopAsyncIteration
            self.n += 1
            return self.n

    async def consume():
        it = Iter()
        return [await anext(it), await anext(it), await anext(it, 'done')]
    return asyncio.run(consume())


r['a flagged __anext__ inside a function serves anext()'] = _try(_anext)


def _tuple_subclass_bases():
    class TupleSubclass(tuple):
        pass
    typ = type('typ', TupleSubclass((int, object)), {})
    return (typ.__bases__ == (int, object), type(typ.__bases__).__name__)


r['type() keeps a tuple subclass as __bases__'] = _try(_tuple_subclass_bases)
r['guard: plain bases stay a tuple'] = _try(
    lambda: type(type('plain', (int,), {}).__bases__).__name__)

EXPECTED = {
    'a generator function is returned itself, flagged': ('ok', (True, True, True, True)),
    'an async def is returned untouched': ('ok', (True, True)),
    'yield from a coroutine, and isawaitable, for every def shape': (
        'ok', [('spam', True)] * 5),
    'an unflagged generator is neither': (
        'ok', (False, "cannot 'yield from' a coroutine object in a non-coroutine generator")),
    'a function returning a generator is wrapped': (
        'ok', ('_GeneratorWrapper', True, True, True, True, 1, 2)),
    'a generator-like object is wrapped and awaited': (
        'ok', ('_GeneratorWrapper', 'fut', 140)),
    'anything else passes through': ('ok', (True, True, 'value')),
    'a non-callable is refused': ('TypeError', 'types.coroutine() expects a callable'),
    'a flagged __anext__ inside a function serves anext()': ('ok', [1, 2, 'done']),
    'type() keeps a tuple subclass as __bases__': ('ok', (True, 'TupleSubclass')),
    'guard: plain bases stay a tuple': ('ok', 'tuple'),
}

KNOWN_DIVERGENCES = {
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS,
    sorted(r) == sorted(list(EXPECTED) + list(KNOWN_DIVERGENCES)))


if __name__ == '__main__':
    if sys.argv[1:] == ['--emit']:
        for key, value in r.items():
            print('    %r: %r,' % (key, value))
        raise SystemExit
    for key in EXPECTED:
        actual = r[key]
        ok = actual == EXPECTED[key]
        print('%-5s %-60s -> %s' % ('OK' if ok else 'FAIL', key,
                                    'as expected' if ok else repr(actual)))
    for key, expected in KNOWN_DIVERGENCES.items():
        actual = r[key]
        print('%-5s %-60s -> %r' % ('OK' if actual == expected else 'XFAIL',
                                    key, actual))
    print(SUMMARY)
