"""Fixture: a ``for'' / ``async for'' loop whose target is a SUBSCRIPT or an
ATTRIBUTE -- ``for d[k] in xs'', ``for o.a in xs'' -- alone or as a leaf of a
tuple target.

Legal Python, and in the corpus: test_generators' conjoin binds
``for values[i] in gs[i]()'', and test_coroutines'
test_for_assign_raising_stop_async_iteration runs ``async for tgt[0] in
source()'' against a __setitem__ that raises StopAsyncIteration.  The IR path
refused both shapes (``ForAst:target-SubscriptAst''; the async one was
mislabelled ``ForAst:async''), so every def holding one fell back to text.

THE ORDER IS THE POINT.  Per iteration CPython runs FOR_ITER first, then
evaluates the target's object, then its subscript, then STORE_SUBSCR /
STORE_ATTR -- and a loop that drains evaluates the target not at all.  Grail's
text emit used to hand the step to the store as an ARGUMENT, so the receiver
and index ran before each item was fetched and once more on the draining step;
``order_*'' and ``zero_trip_evaluates_no_target'' pin CPython's order.

Everything here is verified against real CPython by running the file directly;
ForStoreTargetsTestCase holds Grail to it on both codegen paths, and checks
that the IR arm compiled every def here rather than falling back.
"""

r = {}


def record(key, fn):
    try:
        r[key] = fn()
    except Exception as exc:
        r[key] = '%s: %s' % (type(exc).__name__, exc)


def run(coro):
    """Drive a coroutine that never really suspends."""
    try:
        coro.send(None)
    except StopIteration as stop:
        return stop.value
    raise RuntimeError('the coroutine suspended')


class Box:
    pass


class Slotted:
    __slots__ = ('v',)


class Logged:
    """A target whose stores are recorded."""

    def __init__(self, log):
        object.__setattr__(self, 'log', log)

    def __setitem__(self, key, value):
        self.log.append(('setitem', key, value))

    def __setattr__(self, name, value):
        self.log.append(('setattr', name, value))


class RaisesOn:
    """__setitem__ raises ``exc`` for the value ``bad`` and records the rest."""

    def __init__(self, bad, exc):
        self.bad = bad
        self.exc = exc
        self.stored = []

    def __setitem__(self, key, value):
        if value == self.bad:
            raise self.exc
        self.stored.append(value)


# --- sync ----------------------------------------------------------------

def subscript_list_target():
    a = [0, 0]
    seen = []
    for a[1] in [10, 20, 30]:
        seen.append(list(a))
    return seen, a


def subscript_dict_target():
    d = {}
    for d['k'] in 'xyz':
        pass
    return d


def subscript_slice_target():
    a = [1, 2, 3, 4]
    for a[1:3] in [['p'], ['q', 'r', 's']]:
        pass
    return a


def attribute_target():
    o = Box()
    seen = []
    for o.x in (1, 2, 3):
        seen.append(o.x)
    return seen, o.x


def slot_attribute_target():
    s = Slotted()
    seen = []
    for s.v in 'ab':
        seen.append(s.v)
    return seen


def tuple_of_store_leaves():
    a = [None, None]
    o = Box()
    out = []
    for a[0], o.y, z in [(1, 2, 3), (4, 5, 6)]:
        out.append((list(a), o.y, z))
    return out


def nested_and_starred_store_leaves():
    d = {}
    o = Box()
    out = []
    for (d['p'], o.q), *d['rest'] in [((1, 2), 3, 4), ((5, 6),)]:
        out.append((dict(d), o.q))
    return out


def order_subscript():
    log = []
    target = Logged(log)

    def obj():
        log.append('obj')
        return target

    def key():
        log.append('key')
        return len(log)

    def items():
        for i in range(2):
            log.append(('item', i))
            yield i
        log.append('drained')

    for obj()[key()] in items():
        log.append('body')
    return log


def order_attribute():
    log = []
    target = Logged(log)

    def obj():
        log.append('obj')
        return target

    def items():
        for i in range(2):
            log.append(('item', i))
            yield i
        log.append('drained')

    for obj().attr in items():
        log.append('body')
    return log


def order_tuple_leaves():
    log = []
    target = Logged(log)

    def obj(tag):
        log.append(('obj', tag))
        return target

    for obj('a')[0], obj('b').m in [(1, 2), (3, 4)]:
        log.append('body')
    return log


def zero_trip_evaluates_no_target():
    log = []

    def obj():
        log.append('obj')
        return {}

    for obj()['k'] in []:
        log.append('body')
    return log


def store_raises_mid_loop():
    t = RaisesOn(2, KeyError('boom'))
    bodies = []
    try:
        for t[0] in [1, 2, 3]:
            bodies.append(t.stored[-1])
    except KeyError as exc:
        return 'KeyError', exc.args, t.stored, bodies
    return 'no raise', t.stored, bodies


def store_raising_stop_iteration_propagates():
    """A StopIteration from the STORE is not the iterator draining."""
    t = RaisesOn(2, StopIteration(7))
    try:
        for t[0] in [1, 2, 3]:
            pass
    except StopIteration as exc:
        return 'StopIteration', exc.args, t.stored
    return 'loop ended quietly', t.stored


def break_skips_else():
    d = {}
    trail = []
    for d['v'] in range(10):
        if d['v'] == 3:
            break
        trail.append(d['v'])
    else:
        trail.append('else')
    return trail, d


def else_runs_after_drain():
    o = Box()
    trail = []
    for o.v in range(3):
        trail.append(o.v)
    else:
        trail.append('else')
    return trail, o.v


def closure_cell_target():
    """test_generators' conjoin shape: a nested generator storing through a
    list it shares with its enclosing function."""

    gs = [lambda: iter('ab'), lambda: iter('xy')]
    values = [None] * len(gs)

    def gen(i):
        if i >= len(gs):
            yield list(values)
        else:
            for values[i] in gs[i]():
                for x in gen(i + 1):
                    yield x

    return list(gen(0))


class M:
    def self_attribute_target(self):
        seen = []
        for self.cur in [7, 8]:
            seen.append(self.cur)
        return seen, self.cur


# --- async ---------------------------------------------------------------

async def agen(values, log=None):
    for v in values:
        if log is not None:
            log.append(('item', v))
        yield v
    if log is not None:
        log.append('drained')


async def async_subscript_target():
    a = [0]
    seen = []
    async for a[0] in agen([1, 2, 3]):
        seen.append(a[0])
    return seen


async def async_attribute_target():
    o = Box()
    seen = []
    async for o.x in agen('pq'):
        seen.append(o.x)
    return seen


async def async_tuple_of_store_leaves():
    d = {}
    o = Box()
    out = []
    async for d['a'], o.b in agen([(1, 2), (3, 4)]):
        out.append((d['a'], o.b))
    return out


async def async_order_subscript():
    log = []
    target = Logged(log)

    def obj():
        log.append('obj')
        return target

    def key():
        log.append('key')
        return len(log)

    async for obj()[key()] in agen([0, 1], log):
        log.append('body')
    return log


async def async_store_raising_stop_async_iteration():
    """test_coroutines' test_for_assign_raising_stop_async_iteration."""
    t = RaisesOn(10, StopAsyncIteration(42))
    try:
        async for t[0] in agen([10]):
            pass
    except StopAsyncIteration as exc:
        return 'StopAsyncIteration', exc.args
    return 'loop ended quietly'


async def async_break_and_else():
    d = {}
    trail = []
    async for d['v'] in agen([1, 2, 3]):
        if d['v'] == 2:
            break
    else:
        trail.append('else after break?')
    async for d['w'] in agen([4]):
        pass
    else:
        trail.append('else')
    return trail, d


record('subscript_list_target', subscript_list_target)
record('subscript_dict_target', subscript_dict_target)
record('subscript_slice_target', subscript_slice_target)
record('attribute_target', attribute_target)
record('slot_attribute_target', slot_attribute_target)
record('tuple_of_store_leaves', tuple_of_store_leaves)
record('nested_and_starred_store_leaves', nested_and_starred_store_leaves)
record('order_subscript', order_subscript)
record('order_attribute', order_attribute)
record('order_tuple_leaves', order_tuple_leaves)
record('zero_trip_evaluates_no_target', zero_trip_evaluates_no_target)
record('store_raises_mid_loop', store_raises_mid_loop)
record('store_raising_stop_iteration_propagates',
       store_raising_stop_iteration_propagates)
record('break_skips_else', break_skips_else)
record('else_runs_after_drain', else_runs_after_drain)
record('closure_cell_target', closure_cell_target)
record('self_attribute_target', M().self_attribute_target)
record('async_subscript_target', lambda: run(async_subscript_target()))
record('async_attribute_target', lambda: run(async_attribute_target()))
record('async_tuple_of_store_leaves',
       lambda: run(async_tuple_of_store_leaves()))
record('async_order_subscript', lambda: run(async_order_subscript()))
record('async_store_raising_stop_async_iteration',
       lambda: run(async_store_raising_stop_async_iteration()))
record('async_break_and_else', lambda: run(async_break_and_else()))


EXPECTED = {
    'subscript_list_target': ([[0, 10], [0, 20], [0, 30]], [0, 30]),
    'subscript_dict_target': {'k': 'z'},
    'subscript_slice_target': [1, 'q', 'r', 's'],
    'attribute_target': ([1, 2, 3], 3),
    'slot_attribute_target': ['a', 'b'],
    'tuple_of_store_leaves': [([1, None], 2, 3), ([4, None], 5, 6)],
    'nested_and_starred_store_leaves': [({'p': 1, 'rest': [3, 4]}, 2),
                                        ({'p': 5, 'rest': []}, 6)],
    # The item, THEN the target's object, THEN its subscript, THEN the store;
    # and nothing of the target on the step that drains the iterator.
    'order_subscript': [('item', 0), 'obj', 'key', ('setitem', 3, 0), 'body',
                        ('item', 1), 'obj', 'key', ('setitem', 8, 1), 'body',
                        'drained'],
    'order_attribute': [('item', 0), 'obj', ('setattr', 'attr', 0), 'body',
                        ('item', 1), 'obj', ('setattr', 'attr', 1), 'body',
                        'drained'],
    'order_tuple_leaves': [('obj', 'a'), ('setitem', 0, 1),
                           ('obj', 'b'), ('setattr', 'm', 2), 'body',
                           ('obj', 'a'), ('setitem', 0, 3),
                           ('obj', 'b'), ('setattr', 'm', 4), 'body'],
    'zero_trip_evaluates_no_target': [],
    'store_raises_mid_loop': ('KeyError', ('boom',), [1], [1]),
    'store_raising_stop_iteration_propagates': ('StopIteration', (7,), [1]),
    'break_skips_else': ([0, 1, 2], {'v': 3}),
    'else_runs_after_drain': ([0, 1, 2, 'else'], 2),
    'closure_cell_target': [['a', 'x'], ['a', 'y'], ['b', 'x'], ['b', 'y']],
    'self_attribute_target': ([7, 8], 8),
    'async_subscript_target': [1, 2, 3],
    'async_attribute_target': ['p', 'q'],
    'async_tuple_of_store_leaves': [(1, 2), (3, 4)],
    'async_order_subscript': [('item', 0), 'obj', 'key', ('setitem', 3, 0),
                              'body', ('item', 1), 'obj', 'key',
                              ('setitem', 8, 1), 'body', 'drained'],
    'async_store_raising_stop_async_iteration': ('StopAsyncIteration', (42,)),
    'async_break_and_else': (['else'], {'v': 2, 'w': 4}),
}


KEYS = sorted(EXPECTED)


if __name__ == '__main__':
    for key in KEYS:
        actual = r[key]
        status = 'OK' if actual == EXPECTED[key] else 'FAIL'
        print('%-5s %-42s -> %r' % (status, key, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-5s %-42s is not in EXPECTED' % ('FAIL', extra))
