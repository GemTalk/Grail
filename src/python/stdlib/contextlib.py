# GRAIL minimal contextlib stub.
#
# CPython exposes contextmanager / ExitStack / closing / suppress /
# nullcontext.  Grail's generator support is missing (yield isn't
# wired through a coroutine runtime), so `@contextmanager` can't do
# the with-block protocol.  Stub the decorators to a no-op
# pass-through and provide a few simple class-based helpers.
# Expand as Flask deps actually invoke these.


class _GeneratorCM:
    """Wraps a generator that has yielded exactly once.  __enter__
    advances to the yield and returns the yielded value; __exit__
    advances past the yield (or throws an exception in) to run any
    cleanup code.  Mirrors CPython's contextlib._GeneratorContextManager
    behavior closely enough for the common patterns."""

    def __init__(self, gen):
        self.gen = gen

    def __enter__(self):
        try:
            return next(self.gen)
        except StopIteration:
            raise RuntimeError("generator didn't yield")

    def __exit__(self, exc_type, exc, tb):
        if exc_type is None:
            try:
                next(self.gen)
            except StopIteration:
                return False
            raise RuntimeError("generator didn't stop")
        # Exceptional exit: re-raise inside the generator.
        try:
            self.gen.throw(exc)
        except StopIteration:
            # Generator caught and finished — exception swallowed.
            return True
        except BaseException as e:
            if e is exc:
                # Generator re-raised the same instance: don't swallow.
                return False
            # A new exception escaped — surface it.
            raise
        raise RuntimeError("generator didn't stop after throw")


def contextmanager(func):
    """Decorator: turn a single-yield generator function into a
    context-manager factory.  Grail's call-site *-unpack isn't ready
    yet so the wrapper dispatches positional args explicitly for the
    common 0-3 arg case; kwargs are not threaded through."""

    def helper(*args, **kw):
        n = len(args)
        if n == 0:
            g = func()
        elif n == 1:
            g = func(args[0])
        elif n == 2:
            g = func(args[0], args[1])
        elif n == 3:
            g = func(args[0], args[1], args[2])
        else:
            raise TypeError("@contextmanager wrapper supports up to 3 positional args")
        return _GeneratorCM(g)

    return helper


def asynccontextmanager(func):
    return func


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


class _ExitStackCmCloser:
    def __init__(self, cm):
        self.cm = cm

    def __call__(self):
        self.cm.__exit__(None, None, None)


AsyncExitStack = ExitStack
