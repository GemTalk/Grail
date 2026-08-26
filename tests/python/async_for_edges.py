"""async-for edges: exhaustion placement, unpack protocol, invalid __anext__,
and PEP 530's real genexp rule.

PLACEMENT.  A loop ends only when StopIteration / StopAsyncIteration comes
from the STEP -- the __next__ or awaited __anext__ call itself.  The same
exception raised by the iterable's __iter__, the target STORE, or the BODY
propagates to the caller.  Grail's loop emission wrapped everything in one
handler, so all of those quietly read as a drained loop; the step is now
guarded at the narrowest extent and re-signals an internal drain marker
(PythonLoopDrained) that the loop-level handler catches instead.  for-else
and break are placement-compatible and pinned below.

ESCAPE.  A StopAsyncIteration escaping an async generator BODY is as
ambiguous as StopIteration escaping a sync one, and CPython converts it the
same way: RuntimeError('async generator raised StopAsyncIteration') with the
escaped exception as __cause__ (PythonAsyncGenerator >>
_signalEscapedException).

UNPACK.  CPython's UNPACK_SEQUENCE is defined by ITERATION.  Grail unpacks
by subscript for speed; a non-subscriptable item is now materialised through
the iterator protocol first, so its VALUES come out in iteration order (a
dict item unpacks to its KEYS) and its ERRORS are its own -- an item whose
__iter__ raises StopAsyncIteration(42) surfaces exactly that.

INVALID __anext__.  An __anext__ result whose __await__ RAISES is as invalid
as one without __await__, and CPython says so with the same TypeError,
chaining what actually went wrong as __cause__.

GENEXPS.  PEP 530's rule is wider than the clauses: a generator expression
containing ``async for`` or ``await`` anywhere in its OWN scope -- a nested
list comprehension included -- is an async generator, even when its own
clause is sync.  A nested GENERATOR EXPRESSION is its own scope and does not
leak asynchrony outward.  And every genexp evaluates its OUTERMOST iterable
at creation, which for a lazy generator is the only correct reading of a
loop variable it references.

Every expectation was checked against CPython 3.14 first.
"""

RESULTS = {}


def check(name, fn, expected):
    try:
        RESULTS[name] = (fn() == expected) or repr(fn())
    except BaseException as exc:
        RESULTS[name] = 'raised %s: %s' % (type(exc).__name__, exc)


def drive(coro):
    try:
        coro.send(None)
        return '<suspended>'
    except StopIteration as exc:
        return exc.value
    except BaseException as exc:
        return '%s: %s' % (type(exc).__name__, exc)


async def asynciter(iterable):
    for x in iterable:
        yield x


# ------------------------------------------------- placement: async side

class _BadStore:
    def __setitem__(self, key, value):
        raise StopAsyncIteration(42)


_tgt = _BadStore()


async def _store_raises_in_for():
    try:
        async for _tgt[0] in asynciter([10]):
            pass
        return 'swallowed'
    except StopAsyncIteration as exc:
        return ('propagated', exc.args)


check('async_store_exception_propagates',
      lambda: drive(_store_raises_in_for()), ('propagated', (42,)))


async def _store_raises_in_listcomp():
    try:
        return [0 async for _tgt[0] in asynciter([10])]
    except StopAsyncIteration as exc:
        return ('propagated', exc.args)


check('async_listcomp_store_exception_propagates',
      lambda: drive(_store_raises_in_listcomp()), ('propagated', (42,)))


async def _escapes_async_genexp():
    gen = (0 async for _tgt[0] in asynciter([10]))
    try:
        await gen.asend(None)
        return 'no raise'
    except RuntimeError as exc:
        return (str(exc), type(exc.__cause__).__name__, exc.__cause__.args)


check('escaped_stopasynciteration_becomes_runtimeerror',
      lambda: drive(_escapes_async_genexp()),
      ('async generator raised StopAsyncIteration', 'StopAsyncIteration',
       (42,)))


# ------------------------------------------------- placement: sync twins

class _BadSyncStore:
    def __setitem__(self, key, value):
        raise StopIteration('from store')


_stgt = _BadSyncStore()


def _sync_store_raises():
    def src():
        yield 1
    try:
        for _stgt[0] in src():
            pass
        return 'swallowed'
    except StopIteration as exc:
        return ('propagated', str(exc))


check('sync_store_exception_propagates', _sync_store_raises,
      ('propagated', 'from store'))


def _sync_body_raises():
    try:
        for _ in [1]:
            raise StopIteration('from body')
        return 'swallowed'
    except StopIteration as exc:
        return ('propagated', str(exc))


check('sync_body_exception_propagates', _sync_body_raises,
      ('propagated', 'from body'))


class _BadIter:
    def __iter__(self):
        raise StopIteration('from iter')


def _sync_iter_raises():
    try:
        for _ in _BadIter():
            pass
        return 'swallowed'
    except StopIteration as exc:
        return ('propagated', str(exc))


check('sync_dunder_iter_exception_propagates', _sync_iter_raises,
      ('propagated', 'from iter'))


def _placement_leaves_the_loop_protocol_alone():
    seen = []
    for x in [1, 2]:
        seen.append(x)
    else:
        seen.append('else ran')
    for x in [1, 2]:
        seen.append('once')
        break
    else:
        seen.append('else must not run')
    return seen


check('for_else_and_break_are_placement_compatible',
      _placement_leaves_the_loop_protocol_alone,
      [1, 2, 'else ran', 'once'])


# ------------------------------------------------- unpack via iteration

class _PairIterator:
    """A non-subscriptable iterable of exactly two values."""

    def __init__(self):
        self.vals = iter(['left', 'right'])

    def __iter__(self):
        return self.vals


def _unpack_non_subscriptable():
    out = []
    for a, b in [_PairIterator()]:
        out.append((a, b))
    return out


check('unpack_of_a_non_subscriptable_iterable',
      _unpack_non_subscriptable, [('left', 'right')])


def _unpack_dict_item_gives_keys():
    for a, b in [{'k1': 'v1', 'k2': 'v2'}]:
        return (a, b)


check('unpack_of_a_dict_item_gives_keys',
      _unpack_dict_item_gives_keys, ('k1', 'k2'))


class _RaisingIterable:
    def __iter__(self):
        raise StopAsyncIteration(42)


async def _badpairs():
    yield _RaisingIterable()


async def _unpack_item_raises():
    try:
        async for i, j in _badpairs():
            pass
        return 'swallowed'
    except StopAsyncIteration as exc:
        return ('propagated', exc.args)


check('unpack_surfaces_the_items_own_error',
      lambda: drive(_unpack_item_raises()), ('propagated', (42,)))


# ------------------------------------------------- invalid __anext__

class _BadAwait:
    def __aiter__(self):
        return self

    def __anext__(self):
        return self

    def __await__(self):
        1 / 0


async def _loops_over_bad_await():
    async for _ in _BadAwait():
        pass


def _invalid_anext():
    c = _loops_over_bad_await()
    try:
        c.send(None)
        return '<no raise>'
    except TypeError as exc:
        return (str(exc), type(exc.__cause__).__name__)


check('raising_dunder_await_is_wrapped_with_cause', _invalid_anext,
      ("'async for' received an invalid object from __anext__: _BadAwait",
       'ZeroDivisionError'))


# ------------------------------------------------- PEP 530 genexps

async def _list_inside_gen():
    gen = ([i + j async for i in asynciter([1, 2])] for j in [10, 20])
    return [x async for x in gen]


check('genexp_with_async_elt_is_an_async_generator',
      lambda: drive(_list_inside_gen()), [[11, 12], [21, 22]])


async def _gen_inside_list():
    gens = [(i async for i in asynciter(range(j))) for j in [3, 5]]
    return [x for g in gens async for x in g]


check('outermost_iterable_is_captured_at_creation',
      lambda: drive(_gen_inside_list()), [0, 1, 2, 0, 1, 2, 3, 4])


async def _gen_inside_gen():
    gens = ((i async for i in asynciter(range(j))) for j in [3, 5])
    return [x for g in gens async for x in g]


check('a_nested_genexp_does_not_leak_asynchrony_outward',
      lambda: drive(_gen_inside_gen()), [0, 1, 2, 0, 1, 2, 3, 4])


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
