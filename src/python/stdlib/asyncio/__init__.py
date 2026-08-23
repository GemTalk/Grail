# Grail's asyncio.
#
# This package used to be an 84-line STUB whose stated contract was that
# anything which would actually run a coroutine raises NotImplementedError:
# Grail had no event loop, and could not have had one, because `await` could not
# propagate a suspension.  It exists so asyncio-importing libraries (asgiref,
# django.dispatch, jinja2) load and their *synchronous* paths run.
#
# It now runs coroutines.  What changed underneath, in order:
#
#   * `await` DELEGATES, so a coroutine can suspend and the yield reaches
#     whoever is driving (PythonGenerator >> ___grailAwait___:).  Without this
#     no amount of asyncio would have helped -- asyncio.Future.__await__ is
#     `yield self`, and the loop is the thing that receives it.
#   * `async for` consults __aiter__/__anext__, and async generators exist.
#   * this package: a ready queue, a timer heap, Future, Task, sleep, run.
#
# WHAT IS STILL MISSING, and it is one thing: I/O.  This is the callback/timer
# half of asyncio, not a selector loop -- no add_reader, no sock_recv, no
# transports or protocols, so networking still goes through the blocking socket
# module.  GemStone already has the readiness half
# (`Processor whenReadable: sock signal: sem`, which _socket_module.gs uses to
# give `select` a true N-way wait), so wiring it in is the next increment
# rather than a redesign.  See docs/Support_FastAPI.md.
#
# The one Smalltalk dependency is time.sleep, which is a GemStone Delay: it
# suspends only the calling green thread, so an idle loop does not freeze the
# gem.

import inspect as _inspect

from asyncio import coroutines  # noqa: F401  (submodule, for asyncio.coroutines.*)
from asyncio import events  # noqa: F401  (submodule, for asyncio.events.*)
from asyncio import exceptions  # noqa: F401
from asyncio import futures  # noqa: F401
from asyncio import runners  # noqa: F401
from asyncio import tasks  # noqa: F401

from asyncio.exceptions import (
    CancelledError,
    IncompleteReadError,
    InvalidStateError,
    LimitOverrunError,
    SendfileNotAvailableError,
    TimeoutError,
)
from asyncio.events import (
    AbstractEventLoop,
    Handle,
    TimerHandle,
    get_event_loop,
    get_event_loop_policy,
    get_running_loop,
    _get_event_loop_policy,
    _set_event_loop_policy,
    new_event_loop,
    set_event_loop,
    set_event_loop_policy,
)
from asyncio.futures import Future, isfuture
from asyncio.runners import Runner, run
from asyncio.tasks import (
    Task,
    all_tasks,
    create_task,
    current_task,
    ensure_future,
    gather,
    shield,
    sleep,
    wait_for,
)

# Delegated to Grail's inspect, which knows both the markcoroutinefunction
# marker and (since types.CoroutineType names the real class) the object tests.
iscoroutine = _inspect.iscoroutine
iscoroutinefunction = _inspect.iscoroutinefunction

__all__ = [
    'AbstractEventLoop', 'CancelledError', 'Future', 'Handle',
    'IncompleteReadError', 'InvalidStateError', 'LimitOverrunError', 'Runner',
    'SendfileNotAvailableError', 'Task', 'TimeoutError', 'TimerHandle',
    'all_tasks', 'coroutines', 'create_task', 'current_task', 'ensure_future',
    'events', 'exceptions', 'futures', 'gather', 'get_event_loop',
    'get_event_loop_policy', 'get_running_loop', 'iscoroutine',
    'iscoroutinefunction', 'isfuture', 'new_event_loop', 'run', 'runners',
    'set_event_loop', 'set_event_loop_policy', 'shield', 'sleep', 'tasks',
    'wait_for',
]
