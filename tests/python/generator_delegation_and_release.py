"""Fixture: yield-from delegation to a custom iterator, and a finished
generator releasing its locals.

PEP 380 delegates throw() and send() to a sub-iterator by looking the method
up as an ATTRIBUTE.  Grail looked for a Smalltalk selector first, and when
that missed -- ``def throw(self, *args)'' compiles to none -- it still did
the attribute lookup, but threw away what it found and raised the exception
in the delegator.  The sub-iterator's throw never ran
(test_generators' test_throw_with_yield_from_custom_generator).

A generator that has finished, or been closed, cannot run again, and CPython
lets go of its frame and so of every local the body bound (gh-118272,
test_close_releases_frame_locals).  Grail kept the body block and its process
for as long as the generator object lived.

Every EXPECTED check holds under CPython 3.14, which is what makes it
evidence.
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


def _stack_names(frame, depth):
    names = []
    while frame is not None and len(names) < depth:
        names.append(frame.f_code.co_name)
        frame = frame.f_back
    return names


# --- delegation to a sub-iterator whose methods take *args -----------------

class StarArgsIterator:
    """throw and send written with *args, so no fixed-arity method exists."""

    def __init__(self):
        self.calls = []

    def __iter__(self):
        return self

    def __next__(self):
        return 'next'

    def throw(self, *args):
        self.calls.append(('throw', len(args), _stack_names(sys._getframe(), 2)))
        return 'from throw'

    def send(self, *args):
        self.calls.append(('send', args))
        return 'from send'


def delegator(target):
    result = yield from target
    return result


def _throw_reaches_star_args_method():
    target = StarArgsIterator()
    gen = delegator(target)
    first = next(gen)
    answered = gen.throw(RuntimeError('boom'))
    return first, answered, target.calls


r['throw reaches a *args method'] = _try(_throw_reaches_star_args_method)


def _send_reaches_star_args_method():
    target = StarArgsIterator()
    gen = delegator(target)
    next(gen)
    return gen.send(7), target.calls


r['send reaches a *args method'] = _try(_send_reaches_star_args_method)


class StopsOnThrow(StarArgsIterator):
    def throw(self, *args):
        raise StopIteration('finished by throw')


def _throw_that_stops_ends_the_delegation():
    gen = delegator(StopsOnThrow())
    next(gen)
    try:
        gen.throw(ValueError)
    except StopIteration as e:
        return 'StopIteration', e.value
    return 'still running'


r['a throw that stops ends the delegation'] = _try(
    _throw_that_stops_ends_the_delegation)


class RaisesFromThrow(StarArgsIterator):
    def throw(self, *args):
        raise KeyError('raised by throw')


def _throw_that_raises_propagates():
    gen = delegator(RaisesFromThrow())
    next(gen)
    gen.throw(ValueError)


r['a throw that raises propagates'] = _try(_throw_that_raises_propagates)


class NoThrow:
    def __iter__(self):
        return self

    def __next__(self):
        return 'next'


def _no_throw_raises_in_the_delegator():
    gen = delegator(NoThrow())
    next(gen)
    gen.throw(ValueError('in the delegator'))


r['no throw raises in the delegator'] = _try(_no_throw_raises_in_the_delegator)


def _no_send_is_attribute_error():
    gen = delegator(NoThrow())
    next(gen)
    gen.send(1)


r['no send is AttributeError'] = _try(_no_send_is_attribute_error)


# --- a generator that can never run again lets go of its locals -------------

class Held:
    pass


def _released_after(finish):
    held = Held()
    ref = weakref.ref(held)

    def body(arg):
        local = arg
        yield
        yield

    gen = body(held)
    del held
    finish(gen)
    _force_collect()
    alive_while_generator_is = ref() is not None
    return alive_while_generator_is, gen is not None


def _close_suspended(gen):
    next(gen)
    gen.close()


def _exhaust(gen):
    for _ in gen:
        pass


def _close_unstarted(gen):
    gen.close()


def _throw_into_suspended(gen):
    next(gen)
    try:
        gen.throw(ValueError)
    except ValueError:
        pass


r['close of a suspended generator releases its locals'] = _try(
    lambda: _released_after(_close_suspended))
r['exhaustion releases its locals'] = _try(lambda: _released_after(_exhaust))
r['close before the first next releases its arguments'] = _try(
    lambda: _released_after(_close_unstarted))
r['an uncaught throw releases its locals'] = _try(
    lambda: _released_after(_throw_into_suspended))


def _suspended_keeps_its_locals():
    held = Held()
    ref = weakref.ref(held)

    def body(arg):
        local = arg
        yield

    gen = body(held)
    next(gen)
    del held
    _force_collect()
    alive = ref() is not None
    gen.close()
    return alive


r['a suspended generator keeps its locals'] = _try(_suspended_keeps_its_locals)


EXPECTED = {
    # The *args throw runs, with the exception as its one argument, on top of
    # the delegator's frame; what it answers is what gen.throw() answers.
    'throw reaches a *args method': (
        'ok', ('next', 'from throw', [('throw', 1, ['throw', 'delegator'])])),
    'send reaches a *args method': ('ok', ('from send', [('send', (7,))])),
    # StopIteration out of the sub-iterator's throw is the delegation's
    # result, so the delegator returns it.
    'a throw that stops ends the delegation': (
        'ok', ('StopIteration', 'finished by throw')),
    'a throw that raises propagates': ('KeyError', "'raised by throw'"),
    'no throw raises in the delegator': ('ValueError', 'in the delegator'),
    'no send is AttributeError': (
        'AttributeError', "'NoThrow' object has no attribute 'send'"),
    # (local still alive?, generator still alive?): the generator object is
    # still referenced, and its locals are gone anyway.
    'close of a suspended generator releases its locals': ('ok', (False, True)),
    'exhaustion releases its locals': ('ok', (False, True)),
    'close before the first next releases its arguments': ('ok', (False, True)),
    # The control: a generator that can still run must keep them.
    'a suspended generator keeps its locals': ('ok', True),
}

KNOWN_DIVERGENCES = {
    # CPython: ('ok', (False, True)).  An exception that ESCAPES a Grail
    # generator body has the body's half of its stack stashed in a
    # session-wide registry keyed by the exception (BaseException >>
    # ___stashGeneratorStack___:), and the stash holds the body's block as a
    # frame receiver.  Nothing removes the entry when the exception dies, so
    # the locals stay for the session.  close() drops the entry for the
    # GeneratorExit it absorbs; an exception the consumer receives needs a
    # weak-keyed registry, which the Smalltalk side does not have yet.
    'an uncaught throw releases its locals': ('ok', (True, True)),
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
