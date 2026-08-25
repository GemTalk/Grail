"""A coroutine is awaited once -- CPython issue 25887.

Where an exhausted GENERATOR keeps answering the iterator protocol (a bare
StopIteration on every further next(), the thrown exception on a throw()), a
finished COROUTINE refuses reuse outright:

    RuntimeError: cannot reuse already awaited coroutine

on send() AND on throw() -- because silently re-answering StopIteration is
exactly how a double-await bug disappears into a truncated result instead of
surfacing.  The refusal composes through await: awaiting an already-consumed
coroutine raises the same RuntimeError from inside the delegation.

A coroutine that is SUSPENDED mid-await is just as unavailable, with its own
wording -- its frame belongs to whoever is driving it:

    RuntimeError: coroutine is being awaited already

close() stays quiet throughout: closing a finished coroutine (repeatedly) is
explicitly fine, as with generators.

The generator half of each pair is pinned here too, so the coroutine override
provably does NOT leak into generators.

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
        return ('value', fn())
    except BaseException as exc:
        return '%s: %s' % (type(exc).__name__, exc)


async def _spam():
    return 'spam'


# ------------------------------------------------- the refusal itself

def _send_twice():
    c = _spam()
    return (outcome(lambda: c.send(None)), outcome(lambda: c.send(None)))


check('second_send_is_reuse_error', _send_twice,
      ('StopIteration: spam',
       'RuntimeError: cannot reuse already awaited coroutine'))


def _throw_after_finish():
    c = _spam()
    outcome(lambda: c.send(None))
    return outcome(lambda: c.throw(Exception('wat')))


check('throw_after_finish_is_reuse_error', _throw_after_finish,
      'RuntimeError: cannot reuse already awaited coroutine')


def _close_stays_quiet():
    c = _spam()
    outcome(lambda: c.send(None))
    c.close()
    c.close()
    return 'quiet'


check('close_after_finish_stays_quiet', _close_stays_quiet, 'quiet')


# ------------------------------------------------- through await

async def _reader(coro):
    return await coro


def _await_consumed():
    victim = _spam()
    first = outcome(lambda: _reader(victim).send(None))
    second = outcome(lambda: _reader(victim).send(None))
    return (first, second)


check('awaiting_a_consumed_coroutine_is_reuse_error', _await_consumed,
      ('StopIteration: spam',
       'RuntimeError: cannot reuse already awaited coroutine'))


@types.coroutine
def _nop():
    yield


async def _parks():
    await _nop()


def _await_suspended():
    c = _parks()
    c.send(None)
    try:
        return outcome(lambda: _reader(c).send(None))
    finally:
        c.close()


check('awaiting_a_suspended_coroutine_is_refused', _await_suspended,
      'RuntimeError: coroutine is being awaited already')


# ------------------------------------------------- generators are untouched

def _gen():
    yield 1


def _generator_stays_iterator_protocol():
    g = _gen()
    next(g)
    first_stop = outcome(lambda: next(g))
    second_stop = outcome(lambda: next(g))
    return (first_stop, second_stop)


check('exhausted_generator_keeps_bare_stopiteration',
      _generator_stays_iterator_protocol,
      ('StopIteration: ', 'StopIteration: '))


def _generator_throw_still_raises_the_thrown():
    g = _gen()
    next(g)
    outcome(lambda: next(g))
    return outcome(lambda: g.throw(ValueError('mine')))


check('finished_generator_throw_raises_the_thrown',
      _generator_throw_still_raises_the_thrown,
      'ValueError: mine')


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
