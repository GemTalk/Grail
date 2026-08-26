# GRAIL reduced contextlib.
#
# Covers contextmanager / asynccontextmanager / ExitStack / closing /
# aclosing / suppress / nullcontext / chdir and the abstract base classes.
# BOTH decorators now run the real single-yield protocol.  The header used
# to say generators weren't wired and the decorators were no-op
# pass-throughs; that stopped being true for @contextmanager some time
# ago, and the async half was still claiming "Grail has no async context
# managers, and `async with` is emitted as plain `with`" long after Grail
# grew async generators (asend/athrow/aclose) and real `async with`
# dispatch to __aenter__/__aexit__.
#
# The cost of that stale pass-through was not a NotImplementedError, which
# is what an unfinished stub ought to cost.  Returning the undecorated
# function meant `async with database():` met a bare async_generator and
# raised TypeError -- "does not support the asynchronous context manager
# protocol (missed __aexit__ method)" -- from inside the caller's block,
# where it looked like the caller's bug.  Found as one of the last two
# failures in test.test_asyncio.test_taskgroups, whose
# test_taskgroup_context_manager_exit_raises is precisely an
# @asynccontextmanager whose cleanup raises.
#
# NOT covered: AsyncExitStack is still aliased to the synchronous
# ExitStack (see below), so it has no enter_async_context/aclose.
# Expand as callers actually invoke the rest.


class _GeneratorContextManagerBase:
    """Shared construction for @contextmanager and @asynccontextmanager.

    CPython's name, and CPython's (func, args, kwds) constructor.  The two
    decorators differ only in how they DRIVE the generator they build --
    next/throw against anext/athrow -- so building it lives here and
    nothing else does."""

    def __init__(self, func, args, kwds):
        self.gen = func(*args, **kwds)
        self.func, self.args, self.kwds = func, args, kwds
        doc = getattr(func, "__doc__", None)
        if doc is None:
            doc = type(self).__doc__
        self.__doc__ = doc

    def _recreate_cm(self):
        # These instances are one-shot, so a decorator has to rebuild the
        # context manager for each call it wraps.
        return self.__class__(self.func, self.args, self.kwds)


class _GeneratorContextManager(_GeneratorContextManagerBase):
    """Wraps a generator that has yielded exactly once.  __enter__
    advances to the yield and returns the yielded value; __exit__
    advances past the yield (or throws an exception in) to run any
    cleanup code.

    The name is CPython's, and so is the (func, args, kwds) constructor:
    code that subclasses this — test_with's MockContextManager does, and
    calls the unbound __enter__/__exit__ on itself — needs both.  Grail
    called it _GeneratorCM and took an already-built generator, which was
    private-in-practice but not importable under the documented name."""

    def __enter__(self):
        # CPython also deletes self.args/kwds/func here to drop references
        # to the arguments; keeping them is strictly more permissive and
        # leaves _recreate_cm usable after a first entry.
        try:
            return next(self.gen)
        except StopIteration:
            raise RuntimeError("generator didn't yield") from None

    def __exit__(self, typ, value, traceback):
        if typ is None:
            try:
                next(self.gen)
            except StopIteration:
                return False
            else:
                raise RuntimeError("generator didn't stop")
        else:
            if value is None:
                # Only the exception type was supplied; the generator has
                # to be thrown an instance.
                value = typ()
            try:
                self.gen.throw(value)
            except StopIteration as exc:
                # Suppress StopIteration *unless* it is the exception we
                # threw in: __exit__() must not swallow that one.
                return exc is not value
            except RuntimeError as exc:
                # Don't re-raise the passed-in exception.
                if exc is value:
                    return False
                # Avoid suppressing if a StopIteration exception was passed
                # to throw() and later wrapped into a RuntimeError (see
                # PEP 479 / bpo-27122).
                if isinstance(value, StopIteration) and exc.__cause__ is value:
                    return False
                raise
            except BaseException as exc:
                # Only re-raise if it's *not* the exception that was passed
                # to throw(): the generator re-raising it means it did not
                # handle it, so __exit__ must not suppress.
                if exc is not value:
                    raise
                return False
            raise RuntimeError("generator didn't stop after throw()")


# Grail's former private name for the above, kept so any in-tree caller
# that predates the rename keeps working.
_GeneratorCM = _GeneratorContextManager


def contextmanager(func):
    """Decorator: turn a single-yield generator function into a
    context-manager factory."""

    def helper(*args, **kw):
        return _GeneratorContextManager(func, args, kw)

    # CPython's contextmanager wraps with functools.wraps, so the factory carries
    # the decorated function's identity -- name, doc, and __wrapped__.  Grail's
    # did not, which left callers unable to see what it wraps: singledispatchmethod
    # decides whether it is over a class-side method by inspecting its target, and
    # an opaque ``helper`` made a @classmethod look like a plain function.
    import functools
    functools.update_wrapper(helper, func)
    return helper


def asynccontextmanager(func):
    """@asynccontextmanager decorator -- @contextmanager's async twin.

        @asynccontextmanager
        async def db():
            <setup>
            try:
                yield <value>
            finally:
                <cleanup>

    makes ``async with db() as v:`` run <setup>, bind <value>, then run
    <cleanup> on the way out however the block leaves."""

    def helper(*args, **kwds):
        return _AsyncGeneratorContextManager(func, args, kwds)

    # Same reason as @contextmanager's: the factory has to carry the
    # decorated function's identity or callers cannot see what it wraps.
    import functools
    functools.update_wrapper(helper, func)
    return helper


def closing(thing):
    """`with closing(x):` ensures x.close() runs at block exit."""
    return _ClosingContext(thing)


class _ClosingContext:
    def __init__(self, thing):
        self.thing = thing

    def __enter__(self):
        return self.thing

    def __exit__(self, exc_type, exc, tb):
        self.thing.close()
        return False


class suppress:
    """`with suppress(ValueError): ...` swallows the named
    exception types raised in the block."""

    def __init__(self, *exceptions):
        self.exceptions = exceptions

    def __enter__(self):
        return None

    def __exit__(self, exc_type, exc, tb):
        if exc_type is None:
            return False
        for et in self.exceptions:
            # isinstance handles the subclass case too, so the explicit
            # issubclass check from CPython's contextlib isn't needed here
            # (and Grail doesn't expose issubclass as a builtin yet).
            if isinstance(exc, et):
                return True
        return False


class nullcontext:
    """`with nullcontext(x):` yields x and does nothing on exit."""

    def __init__(self, enter_result=None):
        self.enter_result = enter_result

    def __enter__(self):
        return self.enter_result

    def __exit__(self, exc_type, exc, tb):
        return False


class ExitStack:
    """Bare minimum: track callbacks to run on exit."""

    def __init__(self):
        self._callbacks = []

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        while self._callbacks:
            cb = self._callbacks.pop()
            try:
                cb()
            except Exception:
                pass
        return False

    def callback(self, fn):
        # Grail's call-site *-unpack isn't ready, so callback() doesn't
        # capture extra args.  Callers wrap with a closure if needed.
        self._callbacks.append(fn)
        return fn

    def enter_context(self, cm):
        result = cm.__enter__()
        self._callbacks.append(_ExitStackCmCloser(cm))
        return result

    def push(self, cm):
        return self.enter_context(cm)

    def close(self):
        # Unwind all registered callbacks immediately, outside the
        # ``with`` protocol.  flask's test client holds an ExitStack of
        # pushed request/app contexts and calls close() between requests.
        self.__exit__(None, None, None)

    def pop_all(self):
        # Transfer the registered callbacks to a fresh stack and clear
        # self, so the caller can own/defer the cleanup (CPython parity).
        new = ExitStack()
        new._callbacks = self._callbacks
        self._callbacks = []
        return new


class _ExitStackCmCloser:
    def __init__(self, cm):
        self.cm = cm

    def __call__(self):
        self.cm.__exit__(None, None, None)


# NOT an async ExitStack: no enter_async_context, no aclose, and its
# callbacks are invoked synchronously.  Left as the alias it has always
# been so that ``from contextlib import AsyncExitStack'' keeps importing,
# but a caller that actually awaits it will not get what it asked for.
AsyncExitStack = ExitStack


class ContextDecorator:
    """Base adding ``@cm``-style decorator behaviour to a context
    manager class (django.db.transaction.Atomic subclasses it)."""

    def _recreate_cm(self):
        return self

    def __call__(self, func):
        def inner(*args, **kwds):
            with self._recreate_cm():
                return func(*args, **kwds)
        try:
            inner.__name__ = func.__name__
        except (AttributeError, TypeError):
            pass
        return inner


class AsyncContextDecorator:
    """@cm-style decorator behaviour for an ASYNC context manager class.

    Deliberately NOT a subclass of ContextDecorator: the only method that
    matters here is __call__, and inheriting the synchronous one produced a
    wrapper that ran ``with self._recreate_cm()'' -- a plain ``with'' over
    an object that has only __aenter__/__aexit__.  Sharing the base looked
    like reuse and was the one thing that could not be shared."""

    def _recreate_cm(self):
        return self

    def __call__(self, func):
        async def inner(*args, **kwds):
            async with self._recreate_cm():
                return await func(*args, **kwds)
        try:
            inner.__name__ = func.__name__
        except (AttributeError, TypeError):
            pass
        return inner


class AbstractContextManager:
    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        return None


class AbstractAsyncContextManager:
    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_value, traceback):
        return None


class _AsyncGeneratorContextManager(
    _GeneratorContextManagerBase,
    AbstractAsyncContextManager,
    AsyncContextDecorator,
):
    """Helper for the @asynccontextmanager decorator."""

    async def __aenter__(self):
        # CPython deletes self.args/kwds/func here.  Grail's synchronous
        # __enter__ keeps them on purpose -- strictly more permissive, and
        # it leaves _recreate_cm usable after a first entry -- so this
        # keeps them too rather than having the two halves disagree.
        try:
            return await anext(self.gen)
        except StopAsyncIteration:
            raise RuntimeError("generator didn't yield") from None

    async def __aexit__(self, typ, value, traceback):
        if typ is None:
            try:
                await anext(self.gen)
            except StopAsyncIteration:
                return False
            else:
                try:
                    raise RuntimeError("generator didn't stop")
                finally:
                    await self.gen.aclose()
        else:
            if value is None:
                # Only the type was supplied; athrow needs an instance, and
                # we need one we can compare identities against below.
                value = typ()
            try:
                await self.gen.athrow(value)
            except StopAsyncIteration as exc:
                # Suppress it UNLESS it is the very exception we threw in:
                # a StopAsyncIteration raised inside the block must not be
                # swallowed just because it looks like generator exhaustion.
                return exc is not value
            except RuntimeError as exc:
                # Do not re-raise what we threw in (CPython issue 27122).
                if exc is value:
                    exc.__traceback__ = traceback
                    return False
                # PEP 479: a Stop(Async)Iteration thrown in can come back
                # wrapped in a RuntimeError.  Only treat it as ours when the
                # thing it wraps really is the exception we threw.
                if (
                    isinstance(value, (StopIteration, StopAsyncIteration))
                    and exc.__cause__ is value
                ):
                    value.__traceback__ = traceback
                    return False
                raise
            except BaseException as exc:
                # athrow has to RAISE to signal "not handled", but __aexit__
                # signals that by returning false.  Re-raise only what is
                # NOT the exception we threw in; anything else is a genuine
                # failure of the cleanup code and belongs to the caller.
                if exc is not value:
                    raise
                exc.__traceback__ = traceback
                return False
            try:
                raise RuntimeError("generator didn't stop after athrow()")
            finally:
                await self.gen.aclose()


def aclosing(thing):
    """``async with aclosing(x):`` awaits x.aclose() at block exit.  It
    returned the SYNCHRONOUS closing(), which calls x.close() -- a method
    an async iterator does not have."""
    return _AsyncClosingContext(thing)


class _AsyncClosingContext:
    def __init__(self, thing):
        self.thing = thing

    async def __aenter__(self):
        return self.thing

    async def __aexit__(self, exc_type, exc, tb):
        await self.thing.aclose()
        return False


def chdir(path):
    raise NotImplementedError("contextlib.chdir is not supported in Grail")
