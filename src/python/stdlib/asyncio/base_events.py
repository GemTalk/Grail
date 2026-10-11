# GRAIL asyncio.base_events -- the names other packages import from here.
#
# CPython's module is the 2,000-line BaseEventLoop that SelectorEventLoop and
# ProactorEventLoop build on.  Grail has one loop implementation
# (asyncio.events.EventLoop), so this module is that loop under its CPython
# name, plus the private helper anyio's asyncio backend imports by name:
#
#     from asyncio.base_events import _run_until_complete_cb
#
# which is what kept anyio._backends._asyncio -- and with it every anyio task
# group, cancel scope, memory stream, and starlette's TestClient -- from
# importing at all.

from asyncio import events, futures

__all__ = ('BaseEventLoop', 'Server')

BaseEventLoop = events.EventLoop


class Server:
    """Present so ``isinstance(x, asyncio.base_events.Server)`` answers; Grail's
    loop has no create_server yet (docs/Support_FastAPI.md)."""


def _run_until_complete_cb(fut):
    """CPython's: stop the future's loop when it completes -- unless it
    finished with SystemExit / KeyboardInterrupt, which run_until_complete
    re-raises and must not be swallowed by a stop."""
    if not fut.cancelled():
        exc = fut.exception()
        if isinstance(exc, (SystemExit, KeyboardInterrupt)):
            return
    fut.get_loop().stop()
