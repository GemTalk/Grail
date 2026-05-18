# GRAIL minimal contextlib stub.
#
# CPython exposes contextmanager / ExitStack / closing / suppress /
# nullcontext.  Grail's generator support is missing (yield isn't
# wired through a coroutine runtime), so `@contextmanager` can't do
# the with-block protocol.  Stub the decorators to a no-op
# pass-through and provide a few simple class-based helpers.
# Expand as Flask deps actually invoke these.


def contextmanager(func):
    """Stub: returns the function untouched.  A real
    @contextmanager turns a generator into a context-manager
    factory by capturing yield-time state — Grail can't do that
    yet, so the decorated function still works as a plain
    callable but the `with cm():` form will raise."""
    return func


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
            if exc_type is et or (
                isinstance(exc_type, type) and issubclass(exc_type, et)
            ):
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

    def callback(self, fn, *args, **kwargs):
        self._callbacks.append(lambda: fn(*args, **kwargs))
        return fn

    def enter_context(self, cm):
        result = cm.__enter__()
        self._callbacks.append(lambda: cm.__exit__(None, None, None))
        return result

    def push(self, cm):
        return self.enter_context(cm)


AsyncExitStack = ExitStack
