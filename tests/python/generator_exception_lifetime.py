"""Fixture: an exception that leaves a generator does not outlive its catcher.

A generator body runs on a GsProcess of its own, so when it raises, Grail
keeps the frames captured on that process to splice into the traceback the
consumer sees.  That stash was a session-wide table keyed by the exception,
and only close() and a re-raise with a traceback ever removed an entry: every
exception that escaped a generator and was caught by its consumer stayed in
it for the rest of the session -- the exception, its __context__, and through
the stashed frames every local of the generator body.  test_exceptions'
test_generator_throw_cleanup_exc_state saw it as an object a generator's
except block held outliving the generator; a loop catching errors out of a
generator grew the table without bound.

Each case drops every reference it made and asks whether a weak reference to
the object the generator held still answers it, after the collection
test.support.gc_collect() drives.  The traceback cases check that the
generator's frames are still in the traceback the consumer catches, which is
what the stash is for; they are known divergences only for how a nested
generator's frame is NAMED, which predates this.

Every EXPECTED check holds under CPython 3.14, which is what makes it
evidence.
"""

import sys
import traceback
import weakref

from test.support import gc_collect

r = {}


def _try(thunk):
    try:
        return ('ok', thunk())
    except BaseException as e:
        return (type(e).__name__, str(e))


class Held:
    pass


class Carrier(Exception):
    def __init__(self, obj):
        self.obj = obj


def _released(make_and_drive):
    """Run make_and_drive(obj) with a fresh object, drop it, collect, and
    answer whether the object is gone."""
    obj = Held()
    wr = weakref.ref(obj)
    make_and_drive(obj)
    obj = None
    gc_collect()
    return wr() is None


def raises_after_yield(obj):
    local = obj
    yield 1
    raise ValueError(obj)


def yields_in_except(obj):
    try:
        raise Carrier(obj)
    except Carrier:
        yield


def caught_by_consumer(obj):
    try:
        for _ in raises_after_yield(obj):
            pass
    except ValueError:
        pass


def caught_traceback_cleared(obj):
    try:
        for _ in raises_after_yield(obj):
            pass
    except ValueError as e:
        e.__traceback__ = None


def thrown_and_escaping(obj):
    g = yields_in_except(obj)
    next(g)
    try:
        g.throw(RuntimeError())
    except RuntimeError:
        pass


def thrown_class_escaping(obj):
    g = yields_in_except(obj)
    next(g)
    try:
        g.throw(RuntimeError)
    except RuntimeError:
        pass


def closed(obj):
    g = yields_in_except(obj)
    next(g)
    g.close()


def many_in_a_loop(obj):
    for _ in range(20):
        try:
            for _ in raises_after_yield(obj):
                pass
        except ValueError:
            pass


for _fn in (caught_by_consumer, caught_traceback_cleared, thrown_and_escaping,
            thrown_class_escaping, closed, many_in_a_loop):
    r['released: ' + _fn.__name__] = _try(lambda: _released(_fn))


def _thrown_context():
    g = yields_in_except(Held())
    next(g)
    try:
        g.throw(RuntimeError())
    except RuntimeError as e:
        return type(e.__context__).__name__


r['thrown exception has the generator\'s exception as context'] = _try(
    _thrown_context)


def _traceback_names():
    def gen():
        yield 1
        raise KeyError('k')
    try:
        for _ in gen():
            pass
    except KeyError as e:
        return [fs.name for fs in traceback.extract_tb(e.__traceback__)]


r['traceback still holds the generator frame'] = _try(_traceback_names)


def _delegated_traceback_names():
    def inner():
        yield 1
        raise KeyError('k')

    def outer():
        yield from inner()
    try:
        for _ in outer():
            pass
    except KeyError as e:
        return [fs.name for fs in traceback.extract_tb(e.__traceback__)]


r['traceback through yield from'] = _try(_delegated_traceback_names)


EXPECTED = {
    'released: caught_by_consumer': ('ok', True),
    'released: caught_traceback_cleared': ('ok', True),
    'released: thrown_and_escaping': ('ok', True),
    'released: thrown_class_escaping': ('ok', True),
    'released: closed': ('ok', True),
    'released: many_in_a_loop': ('ok', True),
    "thrown exception has the generator's exception as context": (
        'ok', 'Carrier'),
}

# CPython's answers.  The generator frames ARE in the traceback -- one per
# level -- but a generator defined inside a function is named after the
# function that defines it (['_traceback_names', '_traceback_names']); the
# same generators at module level are named correctly.  Measured the same on
# main before the stash moved onto the exception, so it is not this change.
KNOWN_DIVERGENCES = {
    'traceback still holds the generator frame': (
        'ok', ['_traceback_names', 'gen']),
    'traceback through yield from': (
        'ok', ['_delegated_traceback_names', 'outer', 'inner']),
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
        print('%-5s %-44s -> %s' % ('OK' if ok else 'FAIL', key,
                                    'as expected' if ok else repr(actual)))
    for key, expected in KNOWN_DIVERGENCES.items():
        actual = r[key]
        print('%-5s %-44s -> %r' % ('OK' if actual == expected else 'XFAIL',
                                    key, actual))
    print(SUMMARY)
