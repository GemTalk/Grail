"""Fixture: what generator.close() answers.

Since CPython 3.13, close() returns the value a generator returns when it
catches the GeneratorExit close() injected: ``except GeneratorExit: return 0''
makes close() answer 0.  The value is delivered once.  A second close(), and a
later next(), find an exhausted generator.  Every other case answers None: an
uncaught GeneratorExit, a generator never started or already finished, and a
delegator, whose ``yield from'' or ``await'' closes the inner generator and
then lets GeneratorExit carry on out of itself.

Grail answered None in every case (test_generators test_close_return_value,
test_close_closed).

Every check holds under CPython 3.14, which is what makes it evidence.
"""

import types

r = {}


def _try(thunk):
    try:
        return thunk()
    except BaseException as e:
        return 'EXC ' + type(e).__name__ + ': ' + str(e)


def catching():
    try:
        yield
    except GeneratorExit:
        return 0


def _caught_and_returned():
    x = catching()
    next(x)
    a = x.close()
    b = x.close()
    try:
        next(x)
    except StopIteration as e:
        c = e.value
    return (a, b, c)


r['a_caught_exit_returns_its_value_once'] = _try(_caught_and_returned)


def not_catching():
    yield
    return 0


def _not_caught():
    x = not_catching()
    next(x)
    return x.close()


r['an_uncaught_exit_answers_none'] = _try(_not_caught)
r['an_unstarted_generator_answers_none'] = _try(lambda: catching().close())


def returns_from_finally():
    try:
        yield
    finally:
        return 'f'


def _finally_return():
    x = returns_from_finally()
    next(x)
    return x.close()


r['a_return_in_finally_is_answered'] = _try(_finally_return)


def exhausted():
    yield
    return 5


def _already_exhausted():
    x = exhausted()
    next(x)
    try:
        next(x)
    except StopIteration:
        pass
    return x.close()


r['a_finished_generator_answers_none'] = _try(_already_exhausted)


def delegator():
    v = yield from catching()
    return ('outer', v)


def _yield_from():
    x = delegator()
    next(x)
    return x.close()


r['a_delegator_answers_none'] = _try(_yield_from)


@types.coroutine
def awaited():
    try:
        yield
    except GeneratorExit:
        return 'coro'


async def awaiting():
    return await awaited()


def _coroutine():
    c = awaiting()
    c.send(None)
    return c.close()


r['an_awaiting_coroutine_answers_none'] = _try(_coroutine)


def explicit_none():
    try:
        yield
    except GeneratorExit:
        return None


def _returns_none():
    x = explicit_none()
    next(x)
    return x.close()


r['returning_none_answers_none'] = _try(_returns_none)


EXPECTED = {
    'a_caught_exit_returns_its_value_once': (0, None, None),
    'an_uncaught_exit_answers_none': None,
    'an_unstarted_generator_answers_none': None,
    'a_return_in_finally_is_answered': 'f',
    'a_finished_generator_answers_none': None,
    'a_delegator_answers_none': None,
    'an_awaiting_coroutine_answers_none': None,
    'returning_none_answers_none': None,
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS,
    sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        ok = actual == EXPECTED[key]
        print('%-5s %-40s -> %s' % ('OK' if ok else 'FAIL', key,
                                    'as expected' if ok else repr(actual)))
    print(SUMMARY)
