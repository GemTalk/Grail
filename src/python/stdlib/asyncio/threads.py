"""High-level support for working with threads in asyncio (CPython's).

In Grail the worker is a cooperative green thread (a GsProcess in the same
gem), so to_thread keeps the loop responsive while the function BLOCKS -- on a
socket, a lock, a sleep -- but CPU-bound work still runs one thing at a time.
"""

import functools
import contextvars

from asyncio import events

__all__ = ("to_thread",)


async def to_thread(func, /, *args, **kwargs):
    """Asynchronously run function *func* in a separate thread.

    Any *args and **kwargs supplied for this function are directly passed
    to *func*. Also, the current :class:`contextvars.Context` is propagated,
    allowing context variables from the main thread to be accessed in the
    separate thread.

    Return a coroutine that can be awaited to get the eventual result of *func*.
    """
    loop = events.get_running_loop()
    ctx = contextvars.copy_context()
    func_call = functools.partial(ctx.run, func, *args, **kwargs)
    return await loop.run_in_executor(None, func_call)
