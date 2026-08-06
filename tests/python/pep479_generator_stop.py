# Fixture for GeneratorStopTestCase (PEP 479).
#
# A StopIteration raised INSIDE a generator body is a bug: it is
# indistinguishable from the generator's own "I am exhausted" signal, so it
# silently truncates the consumer's loop instead of surfacing.  PEP 479 replaces
# it with RuntimeError('generator raised StopIteration'), chained onto the
# StopIteration as both __cause__ and __context__ with __suppress_context__ set.
#
# Grail let the raw StopIteration through, so CPython's test_generator_stop
# errored on both of its tests.
#
# The MUST-NOT-CONVERT half of this fixture is the important half: the same
# StopIteration is how a generator reports normal exhaustion, how `yield from`
# ends a delegation, and what `next(it, default)` swallows.  Converting one of
# those would break every generator in Grail, so each is pinned here.

out = {}


def _run(label, fn):
    try:
        out[label] = repr(fn())
    except BaseException as e:
        out[label] = "%s: %s" % (type(e).__name__, e)


# --- MUST convert -----------------------------------------------------------


def body_raises():
    def f():
        raise StopIteration

    def g():
        yield f()

    return next(g())


def body_raises_chaining():
    def f():
        raise StopIteration

    def g():
        yield f()

    try:
        next(g())
    except RuntimeError as exc:
        return (
            type(exc.__cause__).__name__,
            type(exc.__context__).__name__,
            exc.__suppress_context__,
        )
    return "no RuntimeError"


def inner_next_exhausted():
    """The classic PEP 479 shape: next() on a drained inner iterator."""

    def g(it):
        while True:
            yield next(it)

    return list(g(iter([1, 2])))


def body_raises_with_send():
    """send() reaches the same re-signal path as next()."""

    def g():
        yield 1
        raise StopIteration

    it = g()
    next(it)
    return it.send(None)


# --- MUST NOT convert -------------------------------------------------------


def normal_exhaustion():
    def g():
        yield 1
        yield 2

    return list(g())


def explicit_return():
    def g():
        yield 1
        return

    return list(g())


def caught_in_body():
    def g():
        try:
            raise StopIteration
        except StopIteration:
            yield "caught"

    return list(g())


def yield_from_delegation():
    def inner():
        yield 1
        yield 2

    def outer():
        yield from inner()
        yield 3

    return list(outer())


def for_loop_drain():
    def g():
        yield 1
        yield 2

    total = 0
    for x in g():
        total += x
    return total


def genexp_drain():
    return list(x * 2 for x in range(3))


def next_with_default():
    def g():
        yield 1

    it = g()
    return (next(it), next(it, "dflt"))


def exhausted_generator_reraises():
    """Advancing an already-finished generator keeps raising StopIteration."""

    def g():
        yield 1

    it = g()
    next(it)
    try:
        next(it)
    except StopIteration:
        pass
    try:
        next(it)
    except StopIteration:
        return "StopIteration both times"
    return "second advance did not raise StopIteration"


def other_exception_unchanged():
    def g():
        yield 1 / 0

    return next(g())


def throw_stopiteration_caught():
    def g():
        try:
            yield 1
        except StopIteration:
            yield "swallowed"

    it = g()
    next(it)
    return it.throw(StopIteration())


# --- an exception that was PASSED must still reach the consumer -------------
#
# A generator body runs on a forked producer process; an exception raised there
# is stowed and re-signalled on the consumer.  The VM refuses to signal an
# exception instance that still carries handler frames, and an exception that
# was PASSED on its way out keeps a frame's worth -- so these three shapes used
# to surface as an uncontinuable "Exception has already been signaled" (error
# 6011) that no `except` could catch, instead of the user's own exception.
#
# All three are ordinary Python: RaiseAst compiles a bare `raise` inside an
# `except` to `___ex pass`, and every comprehension re-passes what escapes it
# (that is where the traceback frame is pushed).


def bare_reraise_in_body():
    def g():
        try:
            raise ValueError("boom")
        except ValueError:
            raise
        yield 1

    return next(g())


def reraise_through_comprehension_in_body():
    def g():
        yield [1 // 0 for _ in range(3)]

    return next(g())


def throw_an_exception_being_handled():
    """gen.throw(e) from inside `except ... as e` -- e is mid-signal."""

    def g():
        yield 1

    it = g()
    next(it)
    try:
        raise ValueError("thrown")
    except ValueError as exc:
        try:
            it.throw(exc)
        except ValueError as again:
            return "rethrown: %s" % again
    return "throw did not raise"


_run("convert_body_raises", body_raises)
_run("convert_chaining", body_raises_chaining)
_run("convert_inner_next", inner_next_exhausted)
_run("convert_via_send", body_raises_with_send)
_run("keep_normal_exhaustion", normal_exhaustion)
_run("keep_explicit_return", explicit_return)
_run("keep_caught_in_body", caught_in_body)
_run("keep_yield_from", yield_from_delegation)
_run("keep_for_loop", for_loop_drain)
_run("keep_genexp", genexp_drain)
_run("keep_next_default", next_with_default)
_run("keep_exhausted_reraise", exhausted_generator_reraises)
_run("keep_other_exception", other_exception_unchanged)
_run("keep_throw_caught", throw_stopiteration_caught)
_run("passed_bare_reraise", bare_reraise_in_body)
_run("passed_comprehension", reraise_through_comprehension_in_body)
_run("passed_throw_handled", throw_an_exception_being_handled)

RESULTS = out
