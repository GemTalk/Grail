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
# ExitStack and AsyncExitStack are PORTED FROM CPython rather than
# approximated -- see the comment above _BaseExitStack for what the previous
# reduced ExitStack got wrong and why a faithful port became possible.
#
# Also covered, at the end of the file: redirect_stdout / redirect_stderr.
#
# NOTE for anyone adding an import here: this file has NO module-level imports
# on purpose.  contextlib is a DEPLOYED module, so a module-level ``import sys''
# is bound once, at deploy time, to the DEPLOY session's sys instance -- and
# that is not the object a later session's print() consults.  Measured:
# ``contextlib.sys is sys'' answers False from a script, and a redirect written
# against the module-level name silently retargeted the wrong sys.  The redirect
# managers below import sys INSIDE their methods for exactly that reason.


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


# ---------------------------------------------------------------------------
# ExitStack / AsyncExitStack, PORTED FROM CPython 3.14 rather than
# approximated.  The previous ExitStack was a "bare minimum: track callbacks
# to run on exit" list, and the four things it got wrong were not corners:
#
#   * __exit__ passed (None, None, None) to every callback and wrapped each
#     in ``except Exception: pass``.  So a context manager could not SEE the
#     exception, could not SUPPRESS it by returning true, and an exception
#     raised BY a cleanup was swallowed silently -- three of the guarantees
#     the protocol exists to provide.
#   * callback() could not capture arguments, because a comment said Grail's
#     call-site ``*``-unpack was not ready.  It is, and has been for a while;
#     the constraint was stale, not real.
#   * push() called __enter__, which it must not: push registers an ALREADY
#     entered manager's __exit__.
#   * AsyncExitStack was an alias for this class, so ``async with`` on one
#     failed with "does not support the asynchronous context manager protocol
#     (missed __aexit__ method)" -- 26 of test_contextlib_async's failures.
#
# Porting rather than repairing is what makes the exception plumbing right:
# _fix_exception_context and the re-raise dance below are subtle (CPython
# issue 20317), and every language feature they need -- ``*args`` unpacking,
# sys.exception(), types.MethodType over an unbound dunder, __traceback__,
# and a bare ``raise`` preserving __context__ -- was measured working in
# Grail first.
#
# TWO DELIBERATE DEVIATIONS FROM THE UPSTREAM TEXT, both forced by this file:
#   * __exit__ and __aexit__ take (exc_type, exc_value, traceback) rather
#     than upstream's ``*exc_details``.  Behaviourally identical -- the
#     protocol always passes exactly three -- but NOT cosmetic here: a Grail
#     method whose only positional parameter is ``*args`` gets no fixed-arity
#     forwarders (FunctionDefAst >> fixedArityForwarderArities enumerates
#     NAMED positionals, and there are none), so it does not override a
#     fixed-arity method of the same name inherited from a base.  With
#     ``*exc_details`` every call reached AbstractContextManager.__exit__
#     instead, silently, and the stack unwound nothing.  Recorded in
#     docs/Issues.md with a five-line repro.
#   * a plain list replaces collections.deque.  Only append/pop/truthiness
#     are used, which a list does identically, and this module may not carry
#     module-level imports (see the NOTE at the top -- contextlib is DEPLOYED,
#     so a module-level import binds to the deploy session's object).
#   * sys and MethodType are imported INSIDE the methods that need them, for
#     that same reason.


class _BaseExitStack:
    """A base class for ExitStack and AsyncExitStack."""

    @staticmethod
    def _create_exit_wrapper(cm, cm_exit):
        from types import MethodType
        return MethodType(cm_exit, cm)

    @staticmethod
    def _create_cb_wrapper(callback, /, *args, **kwds):
        def _exit_wrapper(exc_type, exc, tb):
            callback(*args, **kwds)
        return _exit_wrapper

    def __init__(self):
        self._exit_callbacks = []

    def pop_all(self):
        """Preserve the context stack by transferring it to a new instance."""
        new_stack = type(self)()
        new_stack._exit_callbacks = self._exit_callbacks
        self._exit_callbacks = []
        return new_stack

    def push(self, exit):
        """Registers a callback with the standard __exit__ method signature.

        Can suppress exceptions the same way __exit__ method can.
        Also accepts any object with an __exit__ method (registering a call
        to the method instead of the object itself).
        """
        # We use an unbound method rather than a bound method to follow
        # the standard lookup behaviour for special methods.
        _cb_type = type(exit)

        try:
            exit_method = _cb_type.__exit__
        except AttributeError:
            # Not a context manager, so assume it's a callable.
            self._push_exit_callback(exit)
        else:
            self._push_cm_exit(exit, exit_method)
        return exit  # Allow use as a decorator.

    def enter_context(self, cm):
        """Enters the supplied context manager.

        If successful, also pushes its __exit__ method as a callback and
        returns the result of the __enter__ method.
        """
        # We look up the special methods on the type to match the with
        # statement.
        cls = type(cm)
        try:
            _enter = cls.__enter__
            _exit = cls.__exit__
        except AttributeError:
            raise TypeError("'" + cls.__module__ + "." + cls.__qualname__
                            + "' object does not support the context manager"
                            " protocol") from None
        result = _enter(cm)
        self._push_cm_exit(cm, _exit)
        return result

    def callback(self, callback, /, *args, **kwds):
        """Registers an arbitrary callback and arguments.

        Cannot suppress exceptions.
        """
        _exit_wrapper = self._create_cb_wrapper(callback, *args, **kwds)

        # We changed the signature, so using @wraps is not appropriate, but
        # setting __wrapped__ may still help with introspection.
        _exit_wrapper.__wrapped__ = callback
        self._push_exit_callback(_exit_wrapper)
        return callback  # Allow use as a decorator

    def _push_cm_exit(self, cm, cm_exit):
        """Helper to correctly register callbacks to __exit__ methods."""
        _exit_wrapper = self._create_exit_wrapper(cm, cm_exit)
        self._push_exit_callback(_exit_wrapper, True)

    def _push_exit_callback(self, callback, is_sync=True):
        self._exit_callbacks.append((is_sync, callback))


class ExitStack(_BaseExitStack, AbstractContextManager):
    """Context manager for dynamic management of a stack of exit callbacks."""

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        import sys
        exc = exc_value
        received_exc = exc is not None

        # We manipulate the exception state so it behaves as though
        # we were actually nesting multiple with statements
        frame_exc = sys.exception()

        def _fix_exception_context(new_exc, old_exc):
            # Context may not be correct, so find the end of the chain
            while 1:
                exc_context = new_exc.__context__
                if exc_context is None or exc_context is old_exc:
                    # Context is already set correctly (see issue 20317)
                    return
                if exc_context is frame_exc:
                    break
                new_exc = exc_context
            # Change the end of the chain to point to the exception
            # we expect it to reference
            new_exc.__context__ = old_exc

        # Callbacks are invoked in LIFO order to match the behaviour of
        # nested context managers
        suppressed_exc = False
        pending_raise = False
        while self._exit_callbacks:
            is_sync, cb = self._exit_callbacks.pop()
            try:
                if exc is None:
                    exc_details = None, None, None
                else:
                    exc_details = type(exc), exc, exc.__traceback__
                if cb(*exc_details):
                    suppressed_exc = True
                    pending_raise = False
                    exc = None
            except BaseException as new_exc:
                # simulate the stack of exceptions by setting the context
                _fix_exception_context(new_exc, exc)
                pending_raise = True
                exc = new_exc

        if pending_raise:
            try:
                # bare "raise exc" replaces our carefully set-up context
                fixed_ctx = exc.__context__
                raise exc
            except BaseException:
                exc.__context__ = fixed_ctx
                raise
        return received_exc and suppressed_exc

    def close(self):
        """Immediately unwind the context stack."""
        self.__exit__(None, None, None)


class AsyncExitStack(_BaseExitStack, AbstractAsyncContextManager):
    """Async context manager for dynamic management of a stack of exit
    callbacks."""

    @staticmethod
    def _create_async_exit_wrapper(cm, cm_exit):
        from types import MethodType
        return MethodType(cm_exit, cm)

    @staticmethod
    def _create_async_cb_wrapper(callback, /, *args, **kwds):
        async def _exit_wrapper(exc_type, exc, tb):
            await callback(*args, **kwds)
        return _exit_wrapper

    async def enter_async_context(self, cm):
        """Enters the supplied async context manager.

        If successful, also pushes its __aexit__ method as a callback and
        returns the result of the __aenter__ method.
        """
        cls = type(cm)
        try:
            _enter = cls.__aenter__
            _exit = cls.__aexit__
        except AttributeError:
            raise TypeError("'" + cls.__module__ + "." + cls.__qualname__
                            + "' object does not support the asynchronous"
                            " context manager protocol") from None
        result = await _enter(cm)
        self._push_async_cm_exit(cm, _exit)
        return result

    def push_async_exit(self, exit):
        """Registers a coroutine function with the standard __aexit__ method
        signature.

        Can suppress exceptions the same way __aexit__ method can.
        Also accepts any object with an __aexit__ method (registering a call
        to the method instead of the object itself).
        """
        _cb_type = type(exit)
        try:
            exit_method = _cb_type.__aexit__
        except AttributeError:
            # Not an async context manager, so assume it's a coroutine function
            self._push_exit_callback(exit, False)
        else:
            self._push_async_cm_exit(exit, exit_method)
        return exit  # Allow use as a decorator

    def push_async_callback(self, callback, /, *args, **kwds):
        """Registers an arbitrary coroutine function and arguments.

        Cannot suppress exceptions.
        """
        _exit_wrapper = self._create_async_cb_wrapper(callback, *args, **kwds)

        # We changed the signature, so using @wraps is not appropriate, but
        # setting __wrapped__ may still help with introspection.
        _exit_wrapper.__wrapped__ = callback
        self._push_exit_callback(_exit_wrapper, False)
        return callback  # Allow use as a decorator

    async def aclose(self):
        """Immediately unwind the context stack."""
        await self.__aexit__(None, None, None)

    def _push_async_cm_exit(self, cm, cm_exit):
        """Helper to correctly register coroutine function to __aexit__
        method."""
        _exit_wrapper = self._create_async_exit_wrapper(cm, cm_exit)
        self._push_exit_callback(_exit_wrapper, False)

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_value, traceback):
        import sys
        exc = exc_value
        received_exc = exc is not None

        # We manipulate the exception state so it behaves as though
        # we were actually nesting multiple with statements
        frame_exc = sys.exception()

        def _fix_exception_context(new_exc, old_exc):
            # Context may not be correct, so find the end of the chain
            while 1:
                exc_context = new_exc.__context__
                if exc_context is None or exc_context is old_exc:
                    # Context is already set correctly (see issue 20317)
                    return
                if exc_context is frame_exc:
                    break
                new_exc = exc_context
            # Change the end of the chain to point to the exception
            # we expect it to reference
            new_exc.__context__ = old_exc

        # Callbacks are invoked in LIFO order to match the behaviour of
        # nested context managers
        suppressed_exc = False
        pending_raise = False
        while self._exit_callbacks:
            is_sync, cb = self._exit_callbacks.pop()
            try:
                if exc is None:
                    exc_details = None, None, None
                else:
                    exc_details = type(exc), exc, exc.__traceback__
                if is_sync:
                    cb_suppress = cb(*exc_details)
                else:
                    cb_suppress = await cb(*exc_details)

                if cb_suppress:
                    suppressed_exc = True
                    pending_raise = False
                    exc = None
            except BaseException as new_exc:
                _fix_exception_context(new_exc, exc)
                pending_raise = True
                exc = new_exc

        if pending_raise:
            try:
                # bare "raise exc" replaces our carefully set-up context
                fixed_ctx = exc.__context__
                raise exc
            except BaseException:
                exc.__context__ = fixed_ctx
                raise
        return received_exc and suppressed_exc


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


class _RedirectStream:
    """Shared machinery for redirect_stdout and redirect_stderr.

    The saved targets are a STACK, not a single slot, which is what makes the
    manager re-entrant -- ``with redirect_stdout(a): with redirect_stdout(b):``
    unwinds to a and then to the original.  CPython does the same, and the
    stack costs one list.
    """

    _stream = None

    def __init__(self, new_target):
        self._new_target = new_target
        self._old_targets = []

    def __enter__(self):
        # Imported HERE, not at module scope.  contextlib is deployed, so a
        # module-level binding would be the deploy session's sys instance --
        # a different object from the one print() reads in this session, so
        # the redirect would set a name nothing consults.  A call-time import
        # resolves through this session's sys.modules.
        import sys
        self._old_targets.append(getattr(sys, self._stream))
        setattr(sys, self._stream, self._new_target)
        return self._new_target

    def __exit__(self, exctype, excinst, exctb):
        import sys
        setattr(sys, self._stream, self._old_targets.pop())
        return False


class redirect_stdout(_RedirectStream):
    """Temporarily send ``sys.stdout`` somewhere else.

        with redirect_stdout(io.StringIO()) as buf:
            print("captured")

    Grail note: this rebinds the NAME ``sys.stdout``, so it captures whatever
    consults that name -- ``print()`` does.  Anything writing to a file handle
    it grabbed earlier, or to Smalltalk's ``GsFile stdout``, is unaffected, the
    same way CPython cannot redirect a C extension's own ``stdout``.
    """

    _stream = "stdout"


class redirect_stderr(_RedirectStream):
    """Temporarily send ``sys.stderr`` somewhere else.  See redirect_stdout."""

    _stream = "stderr"
