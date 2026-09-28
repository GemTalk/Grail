"""Tracebacks and __context__ for exceptions that cross a generator boundary.

Found closing test.test_contextlib_async, whose failures were all Grail defects
in the exception machinery rather than in contextlib.  A generator (and so a
coroutine, and an async generator) runs its body on a FORKED GsProcess, and
each check below is a place where that boundary, or the carrier Grail raises to
re-deliver an exception still in flight, lost something CPython keeps:

  * a ``finally'' that raises while an exception is THROWN IN from inside the
    caller's handler chained its exception to a blank ``Exception()'' -- the
    carrier -- instead of the exception thrown in.  Every @contextmanager whose
    cleanup raises is that shape;
  * an exception caught INSIDE a generator body had __traceback__ None;
  * a caught StopIteration never had a traceback at all;
  * an ``async with'' whose body raised had its capture released by the
    StopIteration that ends the awaited __aexit__, so it too arrived with none;
  * ``raise exc'' of an exception that already had a traceback added no frame
    for the raise, and a bare ``raise'' out of a generator's except clause lost
    every frame of the consumer.

And one that is not about generators but was found the same way: a class whose
secondary base declares ``__slots__ = ()'' could not hold attributes of its own,
because the merged-in base made it strict.  ``class ExitStack(_BaseExitStack,
AbstractContextManager)'' is that shape once the ABC carries upstream's slots.

Frames are recorded as (function name, source line) pairs, never line numbers,
so the expectations do not move when this file is edited.  Every expectation
was measured against CPython 3.14.
"""

import os
import sys
import traceback
from contextlib import contextmanager, asynccontextmanager

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:300])


def frames(exc):
    return [(f.name, f.line) for f in traceback.extract_tb(exc.__traceback__)]


def run_coro(coro):
    """Drive a coroutine that never suspends, as test.support does."""
    try:
        coro.send(None)
    except StopIteration as stop:
        return stop.value
    raise AssertionError('coroutine suspended')


def context_chain(exc):
    out = []
    while exc is not None and len(out) < 6:
        out.append(repr(exc))
        exc = exc.__context__
    return out


# ------------------------------------------------ __context__ through a throw

def _finally_raises(exc):
    try:
        yield
    finally:
        raise exc


def _throw_from_a_handler():
    first, second = Exception(1), Exception(2)
    g = _finally_raises(second)
    next(g)
    try:
        raise first
    except Exception as handled:
        try:
            g.throw(handled)
        except Exception as got:
            return context_chain(got)


check('finally_raising_during_a_throw_chains_to_the_thrown_exception',
      _throw_from_a_handler(), ['Exception(2)', 'Exception(1)'])


@contextmanager
def _cleanup_raises(exc):
    try:
        yield
    finally:
        raise exc


def _nested_contextmanagers():
    e1, e2, e3 = Exception(1), Exception(2), Exception(3)
    try:
        with _cleanup_raises(e3):
            with _cleanup_raises(e2):
                raise e1
    except Exception as got:
        return context_chain(got)


check('contextmanager_cleanup_chains_every_link',
      _nested_contextmanagers(), ['Exception(3)', 'Exception(2)', 'Exception(1)'])


# ------------------------------------------------ caught inside the body

def _catches_its_own():
    try:
        1/0
    except ZeroDivisionError as exc:
        yield frames(exc)


check('an_exception_caught_inside_a_generator_has_a_traceback',
      next(_catches_its_own()), [('_catches_its_own', '1/0')])


async def _coro_catches_its_own():
    try:
        1/0
    except ZeroDivisionError as exc:
        return frames(exc)


check('an_exception_caught_inside_a_coroutine_has_a_traceback',
      run_coro(_coro_catches_its_own()), [('_coro_catches_its_own', '1/0')])


# ------------------------------------------------ StopIteration

def _caught_stop_iteration():
    try:
        raise StopIteration('x')
    except StopIteration as exc:
        return frames(exc)


check('a_caught_stop_iteration_has_a_traceback',
      _caught_stop_iteration(),
      [('_caught_stop_iteration', "raise StopIteration('x')")])


class _AsyncCM:
    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc_info):
        return False


async def _async_with_stop():
    try:
        async with _AsyncCM():
            raise StopAsyncIteration('y')
    except StopAsyncIteration as exc:
        return frames(exc)


check('an_async_with_keeps_the_traceback_of_what_its_body_raised',
      run_coro(_async_with_stop()),
      [('_async_with_stop', "raise StopAsyncIteration('y')")])


# ------------------------------------------------ re-raising

def _raise_exc():
    raise ValueError


def _raise_exc_again():
    try:
        _raise_exc()
    except ValueError as exc:
        caught = exc
    try:
        raise caught
    except ValueError:
        raise


def _outer_reraise():
    try:
        _raise_exc_again()
    except ValueError as exc:
        return frames(exc)


check('raise_exc_adds_the_frame_of_the_raise',
      _outer_reraise(),
      [('_outer_reraise', '_raise_exc_again()'),
       ('_raise_exc_again', 'raise caught'),
       ('_raise_exc_again', '_raise_exc()'),
       ('_raise_exc', 'raise ValueError')])


def _gen_bare_reraise():
    try:
        _raise_exc()
    except ValueError:
        raise
    yield


def _consume_bare_reraise():
    try:
        next(_gen_bare_reraise())
    except ValueError as exc:
        return frames(exc)


check('a_bare_raise_out_of_a_generator_keeps_the_consumer_frames',
      _consume_bare_reraise(),
      [('_consume_bare_reraise', 'next(_gen_bare_reraise())'),
       ('_gen_bare_reraise', '_raise_exc()'),
       ('_raise_exc', 'raise ValueError')])


# ------------------------------------------------ a frame names its own file

@asynccontextmanager
async def _passes_through():
    yield


class _Method:
    async def body(self):
        try:
            async with _passes_through():
                1/0
        except ZeroDivisionError as exc:
            return [(f.name, os.path.basename(f.filename))
                    for f in traceback.extract_tb(exc.__traceback__)]


check('a_method_frame_names_its_own_file_when_contextlib_catches_first',
      run_coro(_Method().body()),
      [('body', os.path.basename(__file__))])


# ------------------------------------------------ __slots__ on a secondary base

class _Slotted:
    __slots__ = ()


class _Plain:
    def __init__(self):
        self.x = 1


class _SecondarySlotted(_Plain, _Slotted):
    pass


def _secondary_slotted():
    obj = _SecondarySlotted()
    obj.y = 2
    return (obj.x, obj.y, hasattr(obj, '__dict__'))


check('a_slotted_secondary_base_does_not_remove_the_dict',
      _secondary_slotted(), (1, 2, True))


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
