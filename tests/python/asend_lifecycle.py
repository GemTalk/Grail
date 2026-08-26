"""The asend/athrow/aclose step objects live once and own the generator.

CPython's async_generator_asend (and its athrow twin, which aclose rides) is
a one-shot coroutine-like object with two guards, both measured on 3.14:

REUSE.  A step that has delivered -- or been closed, or been refused -- never
drives the generator again:

    RuntimeError: cannot reuse already awaited __anext__()/asend()
    RuntimeError: cannot reuse already awaited aclose()/athrow()

CONCURRENCY.  From its first send until its step completes, one step object
OWNS the generator; a different one driven inside that window is refused by
its own kind -- ``anext(): asynchronous generator is already running`` /
``athrow(): ...`` / ``aclose(): ...`` -- and the refused object comes out
CLOSED (its next send is the reuse error).  Suspension does NOT release the
claim; that window is what the guard exists for.

CLOSE MID-FLIGHT.  close() on a suspended step throws GeneratorExit at the
suspension; a body that catches it and suspends again has ignored it --
``RuntimeError: coroutine ignored GeneratorExit`` (the COROUTINE spelling:
the close is on the step object).  A body that lets it out closed cleanly.

And the anext(ait, default) awaitable validates the __anext__ result with
full GET_AWAITABLE: an __await__ answering 42 is the non-iterator TypeError,
an inert result is "can't be awaited" -- previously both were uncatchable
MessageNotUnderstood errors.

Every expectation was checked against CPython 3.14 first.
"""

import types

RESULTS = {}


def check(name, fn, expected):
    try:
        RESULTS[name] = (fn() == expected) or repr(fn())
    except BaseException as exc:
        RESULTS[name] = 'raised %s: %s' % (type(exc).__name__, exc)


def out(fn):
    try:
        return ('v', fn())
    except StopIteration as exc:
        return ('stop', exc.value)
    except BaseException as exc:
        return '%s: %s' % (type(exc).__name__, exc)


@types.coroutine
def _async_yield(v):
    return (yield v)


async def _two():
    yield 1
    yield 2


# ------------------------------------------------- reuse

def _asend_reuse():
    a = _two()
    s = a.asend(None)
    first = out(lambda: s.send(None))
    return (first, out(lambda: s.send(None)), out(lambda: s.throw(ValueError())))


check('a_delivered_asend_refuses_reuse', _asend_reuse,
      (('stop', 1),
       'RuntimeError: cannot reuse already awaited __anext__()/asend()',
       'RuntimeError: cannot reuse already awaited __anext__()/asend()'))


def _aclose_reuse():
    a = _two()
    c = a.aclose()
    first = out(lambda: c.send(None))
    return (first, out(lambda: c.send(None)))


check('a_delivered_aclose_refuses_reuse', _aclose_reuse,
      (('stop', None),
       'RuntimeError: cannot reuse already awaited aclose()/athrow()'))


def _send_after_close():
    a = _two()
    s = a.asend(None)
    s.close()
    return out(lambda: s.send(None))


check('send_after_close_is_the_reuse_error', _send_after_close,
      'RuntimeError: cannot reuse already awaited __anext__()/asend()')


# ------------------------------------------------- concurrency

async def _parks_forever():
    while True:
        try:
            await _async_yield(None)
        except ValueError:
            pass
    return
    yield


def _concurrent(second_kind):
    a = _parks_forever()
    g = a.asend(None)
    g.send(None)
    if second_kind == 'asend':
        g2 = a.asend(None)
    elif second_kind == 'athrow':
        g2 = a.athrow(ValueError('x'))
    else:
        g2 = a.aclose()
    refused = out(lambda: g2.send(None))
    closed = out(lambda: g2.send(None))
    return (refused, closed)


check('a_second_asend_is_refused_by_kind_and_closed',
      lambda: _concurrent('asend'),
      ('RuntimeError: anext(): asynchronous generator is already running',
       'RuntimeError: cannot reuse already awaited __anext__()/asend()'))
check('a_second_athrow_is_refused_by_kind_and_closed',
      lambda: _concurrent('athrow'),
      ('RuntimeError: athrow(): asynchronous generator is already running',
       'RuntimeError: cannot reuse already awaited aclose()/athrow()'))
check('a_second_aclose_is_refused_by_kind_and_closed',
      lambda: _concurrent('aclose'),
      ('RuntimeError: aclose(): asynchronous generator is already running',
       'RuntimeError: cannot reuse already awaited aclose()/athrow()'))


# ------------------------------------------------- close mid-flight

async def _absorbs_exit():
    try:
        await _async_yield(None)
    except GeneratorExit:
        await _async_yield(None)
    return
    yield


def _close_ignored():
    a = _absorbs_exit()
    g = a.asend(None)
    g.send(None)
    return out(lambda: g.close())


check('a_body_that_absorbs_the_exit_ignored_it', _close_ignored,
      'RuntimeError: coroutine ignored GeneratorExit')


async def _lets_exit_out():
    await _async_yield(None)
    return
    yield


def _close_clean():
    a = _lets_exit_out()
    g = a.asend(None)
    g.send(None)
    return (out(lambda: g.close()), out(lambda: g.send(None)))


check('a_body_that_lets_the_exit_out_closes_cleanly', _close_clean,
      (('v', None),
       'RuntimeError: cannot reuse already awaited __anext__()/asend()'))


# ------------------------------------------------- anext-awaitable validation

class _BadAwaitResult:
    def __await__(self):
        return 42


class _IterOfBad:
    def __aiter__(self):
        return self

    def __anext__(self):
        return _BadAwaitResult()


class _IterOfInert:
    def __aiter__(self):
        return self

    def __anext__(self):
        # iter([]) rather than iter(''): both interpreters call this
        # 'list_iterator', where a string iterator is 'str_ascii_iterator'
        # in CPython 3.12+ (an ASCII-specialisation detail) and
        # 'str_iterator' here.
        return iter([])


async def _drives(ait):
    return await anext(ait, 'default')


def _drive_err(coro):
    try:
        coro.send(None)
        return '<suspended>'
    except StopIteration as exc:
        return ('returned', exc.value)
    except BaseException as exc:
        return '%s: %s' % (type(exc).__name__, exc)


check('anext_validates_a_bad_await_result',
      lambda: _drive_err(_drives(_IterOfBad())),
      "TypeError: __await__() returned non-iterator of type 'int'")
check('anext_rejects_an_inert_anext_result',
      lambda: _drive_err(_drives(_IterOfInert())),
      "TypeError: 'list_iterator' object can't be awaited")


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
