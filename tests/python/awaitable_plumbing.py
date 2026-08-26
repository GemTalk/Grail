"""Three small awaitable-protocol contracts, one increment.

1. ``__await__``'s RESULT must be a real iterator, judged the way CPython
   judges it -- by the TYPE, not by an attribute probe.  Grail's
   ``___respondsTo___:`` cannot make that call alone: PythonInstance carries a
   fallback __next__/__iter__ pair that every user-class instance inherits, so
   the probe answers true about everything -- which is how a self-returning
   awaitable (a class defining ONLY __await__, test_await_13's shape) slipped
   past the non-iterator check and surfaced with the wrong message.

2. ``throw(type, value, tb)`` -- the pre-3.12 signature -- still works, with
   CPython's normalisation and CPython's DeprecationWarning, emitted through
   the real warnings machinery: ``simplefilter('error')`` promotes it to a
   raise out of throw() itself, which is also how this fixture observes the
   text (Grail's catch_warnings(record=True) does not hand back the list).

3. ``anext(ait, default)`` answers CPython's anext_awaitable: nothing advances
   until driven, exhaustion becomes StopIteration carrying the default (so the
   await evaluates to it), close() on an undriven one is a quiet no-op, and
   close(1) is the arity TypeError test_await_17 asserts.

Every expectation was checked against CPython 3.14 first.
"""

import warnings

RESULTS = {}


def check(name, fn, expected):
    try:
        RESULTS[name] = (fn() == expected) or repr(fn())
    except BaseException as exc:
        RESULTS[name] = 'raised %s: %s' % (type(exc).__name__, exc)


def driven_error(coro):
    try:
        coro.send(None)
        return '<suspended>'
    except StopIteration as exc:
        return ('returned', exc.value)
    except BaseException as exc:
        return '%s: %s' % (type(exc).__name__, exc)


async def _await(x):
    return await x


# ---------------------------------------------- 1. real-iterator judgement

class _SelfReturning:
    def __await__(self):
        return self


check('self_returning_await_is_non_iterator',
      lambda: driven_error(_await(_SelfReturning())),
      "TypeError: __await__() returned non-iterator of type '_SelfReturning'")


class _SequenceLike:
    def __await__(self):
        return _OnlyGetitem()


class _OnlyGetitem:
    def __getitem__(self, i):
        return i


check('sequence_protocol_is_not_an_iterator_either',
      lambda: driven_error(_await(_SequenceLike())),
      "TypeError: __await__() returned non-iterator of type '_OnlyGetitem'")


class _RealIterator:
    def __init__(self):
        self.n = 0

    def __iter__(self):
        return self

    def __next__(self):
        if self.n:
            raise StopIteration('done')
        self.n += 1
        return 'step'


class _AwaitsToIterator:
    def __await__(self):
        return _RealIterator()


def _real_iterator_drives():
    c = _await(_AwaitsToIterator())
    first = c.send(None)
    return (first, driven_error(c))


check('a_real_user_iterator_is_driven',
      _real_iterator_drives, ('step', ('returned', 'done')))


# ---------------------------------------------- 2. legacy throw signatures

def _gen():
    try:
        yield 'ready'
    except ValueError as exc:
        raise RuntimeError('saw %s' % exc)


def _throw_three_arg():
    g = _gen()
    next(g)
    with warnings.catch_warnings():
        warnings.simplefilter('ignore')
        try:
            g.throw(ValueError, ValueError(41), None)
            return '<no raise>'
        except RuntimeError as exc:
            return str(exc)


check('three_arg_throw_normalises_the_instance',
      _throw_three_arg, 'saw 41')


def _throw_two_arg_bare_type():
    g = _gen()
    next(g)
    with warnings.catch_warnings():
        warnings.simplefilter('ignore')
        try:
            g.throw(ValueError, None)
            return '<no raise>'
        except RuntimeError as exc:
            return str(exc)


check('two_arg_throw_with_none_constructs_the_type',
      _throw_two_arg_bare_type, 'saw ')


def _throw_warns():
    g = _gen()
    next(g)
    try:
        with warnings.catch_warnings():
            warnings.simplefilter('error')
            try:
                g.throw(ValueError, ValueError(1), None)
                return '<no raise>'
            except DeprecationWarning as exc:
                return str(exc)
    finally:
        g.close()


check('legacy_throw_emits_the_deprecation_warning', _throw_warns,
      'the (type, exc, tb) signature of throw() is deprecated, '
      'use the single-arg signature instead.')


# ---------------------------------------------- 3. anext(ait, default)

class _Exhausted:
    def __aiter__(self):
        return self

    async def __anext__(self):
        raise StopAsyncIteration


class _Yields:
    def __init__(self):
        self.sent = False

    def __aiter__(self):
        return self

    async def __anext__(self):
        if self.sent:
            raise StopAsyncIteration
        self.sent = True
        return 'item'


check('await_anext_default_at_exhaustion',
      lambda: driven_error(_await(anext(_Exhausted(), 'the-default'))),
      ('returned', 'the-default'))
check('await_anext_default_delivers_the_item',
      lambda: driven_error(_await(anext(_Yields(), 'unused'))),
      ('returned', 'item'))


def _close_is_quiet_and_arity_checked():
    aw = anext(_Exhausted(), 'd').__await__()
    try:
        aw.close(1)
        arity = '<no error>'
    except TypeError:
        arity = 'TypeError'
    aw.close()
    return (arity, 'closed quietly')


check('anext_awaitable_close_contracts',
      _close_is_quiet_and_arity_checked, ('TypeError', 'closed quietly'))
def _anext_on_sync_iterator():
    try:
        anext(iter([]), 1)
        return '<no error>'
    except TypeError as exc:
        return str(exc)


check('anext_still_rejects_a_sync_iterator',
      _anext_on_sync_iterator,
      "'list_iterator' object is not an async iterator")


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
