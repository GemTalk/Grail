"""Fixture: ``@contextlib.asynccontextmanager`` -- @contextmanager's async twin.

Grail's contextlib carried ``def asynccontextmanager(func): return func`` --
a pass-through, with a header explaining that Grail had "no async context
managers, and `async with` is emitted as plain `with`".  Both halves stopped
being true some time ago: async generators support asend/athrow/aclose, and
``async with`` really does dispatch to __aenter__/__aexit__.

The interesting part is HOW the stub failed, because it is the argument for
raising NotImplementedError in a stub rather than degrading quietly.  Handing
back the undecorated function meant ``async with database():`` met a bare
async_generator, which has __anext__ but no __aexit__, so the caller got

    TypeError: 'async_generator' object does not support the asynchronous
    context manager protocol (missed __aexit__ method)

raised inside its own block, naming its own object.  Under a TaskGroup that
surfaced as an ExceptionGroup whose one child was a TypeError, so
``except* CustomException`` correctly declined to catch it and the group
escaped -- three layers away from the two-line stub that caused it.
test.test_asyncio.test_taskgroups.test_taskgroup_context_manager_exit_raises
is exactly this shape (an @asynccontextmanager whose cleanup raises) and the
suite had it filed as "mixes asynccontextmanager with nested groups
(undiagnosed)".

The __aexit__ checks below are weighted toward the identity comparisons,
because that is where the protocol is subtle rather than merely long: athrow
signals "the block's exception was not handled" by RAISING it, while __aexit__
signals the same thing by returning false.  Getting that backwards gives a
context manager that either swallows every exception or re-raises its own
cleanup's, and the happy paths pass either way.
"""

import asyncio
import contextlib


def _run(coro_fn):
    return asyncio.run(coro_fn())


# --------------------------------------------------------------- the basics

def the_decorator_returns_a_context_manager():
    """Not the undecorated function: the object must have BOTH async hooks.

    This is the check the pass-through failed, and it fails without running
    an event loop at all.
    """
    @contextlib.asynccontextmanager
    async def cm():
        yield 1

    obj = cm()
    return (hasattr(obj, '__aenter__') and hasattr(obj, '__aexit__')
            and not isinstance(obj, type(cm)))


def the_yielded_value_reaches_the_as_clause():
    @contextlib.asynccontextmanager
    async def cm():
        yield 7

    async def main():
        async with cm() as v:
            return v == 7
    return _run(main)


def cleanup_runs_on_the_happy_path():
    order = []

    @contextlib.asynccontextmanager
    async def cm():
        order.append('setup')
        try:
            yield
        finally:
            order.append('cleanup')

    async def main():
        async with cm():
            order.append('body')
    _run(main)
    return order == ['setup', 'body', 'cleanup']


def cleanup_runs_when_the_body_raises():
    order = []

    @contextlib.asynccontextmanager
    async def cm():
        try:
            yield
        finally:
            order.append('cleanup')

    async def main():
        try:
            async with cm():
                raise ValueError('boom')
        except ValueError:
            order.append('propagated')
    _run(main)
    return order == ['cleanup', 'propagated']


def the_generator_can_await_across_the_yield():
    """A cleanup that suspends must still complete before the block exits."""
    order = []

    @contextlib.asynccontextmanager
    async def cm():
        await asyncio.sleep(0)
        order.append('setup')
        try:
            yield
        finally:
            await asyncio.sleep(0)
            order.append('cleanup')

    async def main():
        async with cm():
            order.append('body')
    _run(main)
    return order == ['setup', 'body', 'cleanup']


# ------------------------------------------- __aexit__'s identity comparisons

def the_body_exception_is_seen_by_the_generator():
    """``except`` inside the generator sees what the block raised."""
    seen = []

    @contextlib.asynccontextmanager
    async def cm():
        try:
            yield
        except ValueError as e:
            seen.append(str(e))
            raise

    async def main():
        try:
            async with cm():
                raise ValueError('boom')
        except ValueError:
            pass
        return seen == ['boom']
    return _run(main)


def a_generator_that_swallows_suppresses_the_exception():
    """Not re-raising inside the generator means the block's exception is
    handled -- __aexit__ must report false-y, i.e. suppress."""
    @contextlib.asynccontextmanager
    async def cm():
        try:
            yield
        except ValueError:
            pass

    async def main():
        async with cm():
            raise ValueError('boom')
        return True
    return _run(main)


def a_cleanup_that_raises_replaces_the_body_exception():
    """The case test_taskgroups exercises.  athrow raises something that is
    NOT what was thrown in, so __aexit__ must let it out."""
    @contextlib.asynccontextmanager
    async def cm():
        try:
            yield
        finally:
            raise KeyError('from cleanup')

    async def main():
        try:
            async with cm():
                raise ValueError('from body')
        except KeyError as e:
            return 'from cleanup' in str(e)
        except ValueError:
            return 'ValueError escaped instead of the cleanup KeyError'
        return 'nothing raised'
    return _run(main) is True


def a_cleanup_that_raises_on_the_happy_path_propagates():
    @contextlib.asynccontextmanager
    async def cm():
        try:
            yield
        finally:
            raise KeyError('from cleanup')

    async def main():
        try:
            async with cm():
                pass
        except KeyError:
            return True
        return False
    return _run(main)


def a_generator_that_never_yields_is_a_runtime_error():
    @contextlib.asynccontextmanager
    async def cm():
        if False:
            yield

    async def main():
        try:
            async with cm():
                pass
        except RuntimeError as e:
            return "didn't yield" in str(e)
        return False
    return _run(main)


def a_generator_that_yields_twice_is_a_runtime_error():
    @contextlib.asynccontextmanager
    async def cm():
        yield 1
        yield 2

    async def main():
        try:
            async with cm():
                pass
        except RuntimeError as e:
            return "didn't stop" in str(e)
        return False
    return _run(main)


# ------------------------------------------------------------ identity & kin

def the_factory_carries_the_wrapped_functions_identity():
    """functools.update_wrapper, same as @contextmanager: callers that
    inspect the decorated object must see what it wraps."""
    @contextlib.asynccontextmanager
    async def database():
        """The docstring."""
        yield

    return (database.__name__ == 'database'
            and database.__doc__ == 'The docstring.')


def the_context_manager_works_as_a_decorator():
    """AsyncContextDecorator: inheriting the SYNCHRONOUS ContextDecorator
    gave a wrapper that ran a plain ``with`` over an object with only
    __aenter__/__aexit__."""
    order = []

    @contextlib.asynccontextmanager
    async def cm():
        order.append('enter')
        try:
            yield
        finally:
            order.append('exit')

    @cm()
    async def work():
        order.append('work')
        return 5

    async def main():
        return await work()

    got = _run(main)
    return got == 5 and order == ['enter', 'work', 'exit']


def aclosing_awaits_aclose():
    """It returned the SYNCHRONOUS closing(), which calls .close() -- a
    method an async iterator does not have."""
    closed = []

    class Thing:
        async def aclose(self):
            closed.append(True)

    async def main():
        async with contextlib.aclosing(Thing()) as t:
            pass
        return t
    _run(main)
    return closed == [True]


def the_abstract_base_supplies_aenter():
    """AbstractAsyncContextManager was ``pass``, so a subclass relying on the
    documented default __aenter__ ("return self") got a plain object with no
    async hooks at all.

    Only __aenter__ is checked: upstream makes __aexit__ abstract, so a
    subclass that omits it cannot even be instantiated there.  Grail's base
    is not an ABC, and this fixture has to agree with CPython, so the
    subclass supplies __aexit__ and inherits only the default entry.
    """
    class Mine(contextlib.AbstractAsyncContextManager):
        async def __aexit__(self, *exc):
            return None

    async def main():
        async with Mine() as v:
            return isinstance(v, Mine)
    return _run(main)


# ------------------------------------------------- the shape the bug wore

def a_taskgroup_collects_both_the_body_and_the_cleanup_error():
    """test_taskgroup_context_manager_exit_raises, reduced.  Two distinct
    CustomExceptions -- one from the child task, one from the cleanup -- must
    both land in the group, and ``except*`` must catch it.

    On the pass-through build the group held a single TypeError instead.
    """
    class CustomException(Exception):
        pass

    async def raise_exc():
        raise CustomException

    @contextlib.asynccontextmanager
    async def database():
        try:
            yield
        finally:
            raise CustomException

    out = {}

    async def main():
        task = asyncio.current_task()
        try:
            async with asyncio.TaskGroup() as tg:
                async with database():
                    tg.create_task(raise_exc())
                    await asyncio.sleep(1)
        except* CustomException as err:
            out['cancelling'] = task.cancelling()
            out['n'] = len(err.exceptions)
        else:
            out['caught'] = False

    async def top():
        await asyncio.create_task(main())

    _run(top)
    return out == {'cancelling': 0, 'n': 2}


CHECKS = (
    the_decorator_returns_a_context_manager,
    the_yielded_value_reaches_the_as_clause,
    cleanup_runs_on_the_happy_path,
    cleanup_runs_when_the_body_raises,
    the_generator_can_await_across_the_yield,
    the_body_exception_is_seen_by_the_generator,
    a_generator_that_swallows_suppresses_the_exception,
    a_cleanup_that_raises_replaces_the_body_exception,
    a_cleanup_that_raises_on_the_happy_path_propagates,
    a_generator_that_never_yields_is_a_runtime_error,
    a_generator_that_yields_twice_is_a_runtime_error,
    the_factory_carries_the_wrapped_functions_identity,
    the_context_manager_works_as_a_decorator,
    aclosing_awaits_aclose,
    the_abstract_base_supplies_aenter,
    a_taskgroup_collects_both_the_body_and_the_cleanup_error,
)

# Run at IMPORT, so the Smalltalk side reads results rather than driving each
# call across the boundary -- same shape as asyncio_timeout.py.
r = {fn.__name__: fn() for fn in CHECKS}


if __name__ == '__main__':
    for fn in CHECKS:
        print('%-4s %s' % ('OK' if r[fn.__name__] is True else 'FAIL',
                           fn.__name__))
