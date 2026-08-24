"""unittest.IsolatedAsyncioTestCase -- a TestCase whose methods may be async.

GRAIL: upstream verbatim apart from the import of TestCase and the note below.
It is vendored rather than reimplemented because it is the single gate on
CPython's own asyncio tests: every file in test_asyncio that does not need
test_asyncio/utils.py subclasses this one class, which is ~4,950 lines of
upstream coverage for 158 lines of port -- locks, queues, taskgroups, timeouts,
waitfor, futures2, transports, protocols.

WHY IT WORKS HERE AT ALL.  The four call hooks it overrides (_callSetUp,
_callTestMethod, _callTearDown, _callCleanup) already exist in Grail's
unittest.TestCase, added as the documented extension point for exactly this
class.  What had to change was asyncio.Runner: upstream's creates its loop
LAZILY and this class depends on that -- it never uses with, it calls
get_loop() from _callSetUp to force the loop into existence and make it current,
then run() directly.  See asyncio/runners.py.

THE ONE THING THAT DOES NOT ISOLATE is the contextvars context, and since the
class is named for it that deserves stating plainly.  Upstream keeps ONE
contextvars.Context across asyncSetUp / test / asyncTearDown so a ContextVar set
in setUp is visible in the test, and hands it to loop.create_task so tasks do not
leak context into each other.  Grail's contextvars is a stub: one process-wide
context whose Context.run simply calls through.  So the SHARING upstream has
to engineer is free here, and the ISOLATION is absent -- a ContextVar set by one
task is visible to every other.  Tests that assert sharing pass; tests that
assert isolation will fail, and should, until contextvars is real.
"""

# GRAIL: asyncio is imported LAZILY, in _setupAsyncioRunner, which is the one
# place that uses it.  Upstream can afford a module-level ``import asyncio''
# because unittest/__init__.py imports THIS module lazily, through a PEP 562
# module __getattr__.  Grail has no PEP 562 (measured: a module-level
# __getattr__ is never consulted), so unittest has to import async_case
# eagerly -- and a module-level asyncio import here would therefore put the
# whole asyncio package behind every ``import unittest'' in the tree, which
# is 0.59s and a great deal of new import surface for the majority of test
# modules that never touch it.  Moving the import is the cheaper half of
# upstream's arrangement; implementing PEP 562 would allow the other half.
import contextvars
import inspect
import warnings

# GRAIL: upstream is from .case import TestCase''.  Grail defines TestCase
# in unittest/__init__.py -- unittest/case.py is a narrower seam module, see
# its docstring -- so the name comes from the package.  unittest imports THIS
# module at the very end of its own body, by which point TestCase is bound, so
# the cycle resolves the same way CPython's own case.py cycle does.
from unittest import TestCase

__unittest = True


# GRAIL: a LOCAL coroutine-function test, because inspect.iscoroutinefunction
# still cannot be trusted to answer.
#
# Upstream simply calls inspect.iscoroutinefunction in _callAsync and
# _callMaybeAsync.  Grail's is marker-only -- it tests an explicit
# _is_coroutine_marker and nothing else -- so it answers False for every
# ``async def`` method and _callAsync's assertion fails before any async test
# can run.
#
# The obvious fix is to give inspect the real implementation, since the co_flags
# word it needs does exist now (FunctionDefAst >> emitCoFlags: 131 for an async
# def, 3 for a plain one).  That was tried and REVERTED: it hangs
# ``import django.http.response'' indefinitely -- over six minutes, against 22
# seconds for the whole of test___all__ with the stub -- because something on
# Django's asgiref path loops once it is told the truth.  See docs/Issues.md.
#
# So the honest answer is kept where it is needed and provably safe, rather than
# switched on globally where it is neither.  When that bug is fixed this should
# go and the two call sites should read inspect.iscoroutinefunction again.
def _grail_iscoroutinefunction(func):
    f = func
    # Unwrap a bound method to the underlying function, as CPython's
    # _has_code_flag does.  ``__code__`` is readable directly off a BoundMethod
    # here, so this is belt and braces.
    for _ in range(4):
        if type(f).__name__ != 'BoundMethod':
            break
        try:
            f = f.__func__
        except Exception:
            break
    try:
        return bool(f.__code__.co_flags & inspect.CO_COROUTINE)
    except Exception:
        pass
    try:
        return getattr(func, '_is_coroutine_marker', False) is True
    except Exception:
        return False


class IsolatedAsyncioTestCase(TestCase):
    # Names intentionally have a long prefix
    # to reduce a chance of clashing with user-defined attributes
    # from inherited test case
    #
    # The class doesn't call loop.run_until_complete(self.setUp()) and family
    # but uses a different approach:
    # 1. create a long-running task that reads self.setUp()
    #    awaitable from queue along with a future
    # 2. await the awaitable object passing in and set the result
    #    into the future object
    # 3. Outer code puts the awaitable and the future object into a queue
    #    with waiting for the future
    # The trick is necessary because every run_until_complete() call
    # creates a new task with embedded ContextVar context.
    # To share contextvars between setUp(), test and tearDown() we need to execute
    # them inside the same task.

    # Note: the test case modifies event loop policy if the policy was not instantiated
    # yet, unless loop_factory=asyncio.EventLoop is set.
    # asyncio.get_event_loop_policy() creates a default policy on demand but never
    # returns None
    # I believe this is not an issue in user level tests but python itself for testing
    # should reset a policy in every test module
    # by calling asyncio.set_event_loop_policy(None) in tearDownModule()
    # or set loop_factory=asyncio.EventLoop

    loop_factory = None

    def __init__(self, methodName='runTest'):
        super().__init__(methodName)
        self._asyncioRunner = None
        self._asyncioTestContext = contextvars.copy_context()

    async def asyncSetUp(self):
        pass

    async def asyncTearDown(self):
        pass

    def addAsyncCleanup(self, func, /, *args, **kwargs):
        # A trivial trampoline to addCleanup()
        # the function exists because it has a different semantics
        # and signature:
        # addCleanup() accepts regular functions
        # but addAsyncCleanup() accepts coroutines
        #
        # We intentionally don't add inspect.iscoroutinefunction() check
        # for func argument because there is no way
        # to check for async function reliably:
        # 1. It can be "async def func()" itself
        # 2. Class can implement "async def __call__()" method
        # 3. Regular "def func()" that returns awaitable object
        self.addCleanup(*(func, *args), **kwargs)

    async def enterAsyncContext(self, cm):
        """Enters the supplied asynchronous context manager.

        If successful, also adds its __aexit__ method as a cleanup
        function and returns the result of the __aenter__ method.
        """
        # We look up the special methods on the type to match the with
        # statement.
        cls = type(cm)
        try:
            enter = cls.__aenter__
            exit = cls.__aexit__
        except AttributeError:
            msg = (f"'{cls.__module__}.{cls.__qualname__}' object does "
                   "not support the asynchronous context manager protocol")
            try:
                cls.__enter__
                cls.__exit__
            except AttributeError:
                pass
            else:
                msg += (" but it supports the context manager protocol. "
                        "Did you mean to use enterContext()?")
            raise TypeError(msg) from None
        result = await enter(cm)
        self.addAsyncCleanup(exit, cm, None, None, None)
        return result

    def _callSetUp(self):
        # Force loop to be initialized and set as the current loop
        # so that setUp functions can use get_event_loop() and get the
        # correct loop instance.
        self._asyncioRunner.get_loop()
        self._asyncioTestContext.run(self.setUp)
        self._callAsync(self.asyncSetUp)

    def _callTestMethod(self, method):
        result = self._callMaybeAsync(method)
        if result is not None:
            msg = (
                f'It is deprecated to return a value that is not None '
                f'from a test case ({method} returned {type(result).__name__!r})',
            )
            warnings.warn(msg, DeprecationWarning, stacklevel=4)

    def _callTearDown(self):
        self._callAsync(self.asyncTearDown)
        self._asyncioTestContext.run(self.tearDown)

    def _callCleanup(self, function, *args, **kwargs):
        self._callMaybeAsync(function, *args, **kwargs)

    def _callAsync(self, func, /, *args, **kwargs):
        assert self._asyncioRunner is not None, 'asyncio runner is not initialized'
        assert _grail_iscoroutinefunction(func), f'{func!r} is not an async function'
        return self._asyncioRunner.run(
            func(*args, **kwargs),
            context=self._asyncioTestContext
        )

    def _callMaybeAsync(self, func, /, *args, **kwargs):
        assert self._asyncioRunner is not None, 'asyncio runner is not initialized'
        if _grail_iscoroutinefunction(func):
            return self._asyncioRunner.run(
                func(*args, **kwargs),
                context=self._asyncioTestContext,
            )
        else:
            return self._asyncioTestContext.run(func, *args, **kwargs)

    def _setupAsyncioRunner(self):
        import asyncio          # GRAIL: lazy -- see the note at the imports
        assert self._asyncioRunner is None, 'asyncio runner is already initialized'
        runner = asyncio.Runner(debug=True, loop_factory=self.loop_factory)
        self._asyncioRunner = runner

    def _tearDownAsyncioRunner(self):
        runner = self._asyncioRunner
        runner.close()

    def run(self, result=None):
        self._setupAsyncioRunner()
        try:
            return super().run(result)
        finally:
            self._tearDownAsyncioRunner()

    def debug(self):
        self._setupAsyncioRunner()
        super().debug()
        self._tearDownAsyncioRunner()

    def __del__(self):
        if self._asyncioRunner is not None:
            self._tearDownAsyncioRunner()
