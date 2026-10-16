"""Fixture: a generator dropped while suspended is closed when it is collected.

CPython's generator destructor (_PyGen_Finalize) closes a suspended
generator, so the GeneratorExit runs the body's ``finally'' and
``except GeneratorExit'' clauses.  An error that close() raises there --
typically ``generator ignored GeneratorExit'' -- goes to sys.unraisablehook,
because there is nobody to raise it to.  The generator is alive again while
that runs (PEP 442), and stays alive if its cleanup stores it.

Grail collected an abandoned generator but never closed it: the cleanup did
not run at all (test_generators' FinalizationTest).

CPython finalizes on the last reference; Grail at the next collection.  Every
check here collects before it looks, so both agree, and every EXPECTED check
holds under CPython 3.14, which is what makes it evidence.
"""

import sys
import weakref

r = {}


def _try(thunk):
    try:
        return ('ok', thunk())
    except BaseException as e:
        return (type(e).__name__, str(e))


def _force_collect():
    """Grail's `weakref._collect()`, or `gc.collect()` under CPython -- so this
    fixture is self-running and its expectations are MEASURED against CPython
    rather than written from a Grail session."""
    try:
        weakref._collect()
    except AttributeError:
        import gc

        gc.collect()


def _finally_runs():
    log = []

    def body():
        try:
            yield 1
        finally:
            log.append('finally')

    g = body()
    next(g)
    del g
    _force_collect()
    return log


r['the finally of a dropped generator runs'] = _try(_finally_runs)


def _sees_generator_exit():
    log = []

    def body():
        try:
            yield 1
        except BaseException as e:
            log.append(type(e).__name__)
            raise

    g = body()
    next(g)
    del g
    _force_collect()
    return log


r['the body sees GeneratorExit'] = _try(_sees_generator_exit)


def _unstarted_is_quiet():
    log = []

    def body():
        try:
            yield 1
        finally:
            log.append('finally')

    g = body()
    del g
    _force_collect()
    return log


r['a generator never started has nothing to run'] = _try(_unstarted_is_quiet)


def _finished_is_quiet():
    log = []

    def body():
        try:
            yield 1
        finally:
            log.append('finally')

    g = body()
    for _ in g:
        pass
    del g
    _force_collect()
    return log


r['a finished generator runs its finally once'] = _try(_finished_is_quiet)


def _abandon_self_referencing(keep):
    # The generator reaches itself through its closure, as CPython's test
    # reaches it through the globals of an exec'd module: once this returns,
    # a cycle collected as a whole, whose cleanup brings the generator back.
    me = []

    def body():
        try:
            yield 1
        except GeneratorExit:
            keep.append(me[0])
            raise

    me.append(body())
    next(me[0])


def _resurrected():
    keep = []
    _abandon_self_referencing(keep)
    _force_collect()
    g = keep[0]
    return (len(keep), type(g.gi_code).__name__, g.gi_frame is None,
            _try(lambda: next(g)))


r['a generator its cleanup stores survives, finished'] = _try(_resurrected)


def _frame_resurrect():
    seen = []

    def body():
        try:
            yield 1
        finally:
            seen.append(sys._getframe())

    g = body()
    ref = weakref.ref(g)
    next(g)
    del g
    _force_collect()
    return ref() is None, len(seen), seen[0].f_code.co_name


r['a frame its cleanup stores outlives the generator'] = _try(_frame_resurrect)


def _refcycle():
    log = []

    def body():
        try:
            me = yield
            yield 1
        finally:
            log.append('finally')

    g = body()
    next(g)
    g.send(g)
    del g
    _force_collect()
    return log


r['a generator that holds itself is finalized'] = _try(_refcycle)


def _unraisable():
    seen = []
    old = sys.unraisablehook
    sys.unraisablehook = seen.append

    def body():
        try:
            yield 1
        except GeneratorExit:
            yield 2

    try:
        g = body()
        next(g)
        rep = repr(g)
        del g
        _force_collect()
    finally:
        sys.unraisablehook = old
    if len(seen) != 1:
        return len(seen)
    u = seen[0]
    return (u.err_msg == 'Exception ignored while closing generator ' + rep,
            u.exc_type.__name__, str(u.exc_value),
            u.exc_traceback is not None, u.object)


r['a close that fails goes to unraisablehook'] = _try(_unraisable)


def _close_error_is_unraisable():
    seen = []
    old = sys.unraisablehook
    sys.unraisablehook = seen.append

    def body():
        try:
            yield 1
        finally:
            raise KeyError('in finally')

    try:
        g = body()
        next(g)
        del g
        _force_collect()
    finally:
        sys.unraisablehook = old
    return [(u.exc_type.__name__, str(u.exc_value)) for u in seen]


r['an error in the finally goes to unraisablehook'] = _try(
    _close_error_is_unraisable)


EXPECTED = {
    'the finally of a dropped generator runs': ('ok', ['finally']),
    'the body sees GeneratorExit': ('ok', ['GeneratorExit']),
    # No frame yet, so nothing to close.
    'a generator never started has nothing to run': ('ok', []),
    # Run by the exhaustion, and not again when the generator dies.
    'a finished generator runs its finally once': ('ok', ['finally']),
    # (stored, gi_code type, gi_frame is None, next()): back, and finished.
    'a generator its cleanup stores survives, finished': (
        'ok', (1, 'code', True, ('StopIteration', ''))),
    # (generator dead, frames stored, their function).
    'a frame its cleanup stores outlives the generator': (
        'ok', (True, 1, 'body')),
    'a generator that holds itself is finalized': ('ok', ['finally']),
    # (err_msg names the generator, exc_type, exc_value, exc_traceback set,
    # object): PyErr_FormatUnraisable's shape.
    'a close that fails goes to unraisablehook': (
        'ok', (True, 'RuntimeError', 'generator ignored GeneratorExit', True,
               None)),
    'an error in the finally goes to unraisablehook': (
        'ok', [('KeyError', "'in finally'")]),
}

KNOWN_DIVERGENCES = {
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS,
    sorted(r) == sorted(list(EXPECTED) + list(KNOWN_DIVERGENCES)))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        ok = actual == EXPECTED[key]
        print('%-5s %-52s -> %s' % ('OK' if ok else 'FAIL', key,
                                    'as expected' if ok else repr(actual)))
    for key, expected in KNOWN_DIVERGENCES.items():
        actual = r[key]
        print('%-5s %-52s -> %r' % ('OK' if actual == expected else 'XFAIL',
                                    key, actual))
    print(SUMMARY)
