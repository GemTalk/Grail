# GRAIL minimal asyncio stub.
#
# Grail has no event loop; threading is cooperative (GsProcess green
# threads).  This package exists so asyncio-importing libraries
# (asgiref, django.dispatch, jinja2) load and their *synchronous* code
# paths run.  The contract:
#
#   * `get_running_loop()` always raises RuntimeError — exactly what
#     CPython does outside an event loop.  Callers use this as the
#     canonical "am I async?" test (asgiref.local does), so raising is
#     the correct behaviour, not a limitation.
#   * `iscoroutinefunction` delegates to Grail's inspect, which knows
#     the `markcoroutinefunction` marker.
#   * Anything that would actually *run* a coroutine raises
#     NotImplementedError at call time.

import inspect as _inspect

from asyncio import coroutines  # noqa: F401  (submodule, for asyncio.coroutines.*)

iscoroutinefunction = _inspect.iscoroutinefunction
iscoroutine = _inspect.iscoroutine


class CancelledError(BaseException):
    pass


class InvalidStateError(Exception):
    pass


class TimeoutError(Exception):
    pass


def get_running_loop():
    raise RuntimeError("no running event loop (Grail has no asyncio event loop)")


def get_event_loop():
    raise RuntimeError("no event loop (Grail has no asyncio event loop)")


def current_task(loop=None):
    return None


def _no_loop(*args, **kwargs):
    raise NotImplementedError("asyncio is not supported in Grail (no event loop)")


run = _no_loop
ensure_future = _no_loop
run_coroutine_threadsafe = _no_loop
new_event_loop = _no_loop
set_event_loop = _no_loop
wait = _no_loop
wait_for = _no_loop
gather = _no_loop
shield = _no_loop
sleep = _no_loop
create_task = _no_loop


class Future:
    """Constructible placeholder; awaiting or driving it is unsupported."""

    def __init__(self, *, loop=None):
        _no_loop()


class Task(Future):
    pass


class Event:
    def __init__(self):
        _no_loop()


class Lock:
    def __init__(self):
        _no_loop()
