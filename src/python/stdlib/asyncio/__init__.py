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
#   * a ready queue, a timer heap, Future, Task, sleep, run.
#   * I/O: the loop waits inside `select` whenever a socket is registered, so
#     add_reader / sock_recv / sock_accept / sock_sendall work and a server can
#     actually serve.  GemStone already had the hard half --
#     `Processor whenReadable: sock signal: sem` is a per-socket readiness
#     registry and select.py was already built on it -- so this was wiring.
#
# WHAT IS STILL MISSING: transports and protocols.  There is no create_server /
# create_connection / StreamReader / StreamWriter, so an ASGI server cannot be
# pointed at this loop unmodified (uvicorn asks for `loop.create_server(
# protocol_factory, ...)`).  A hand-written server, or one built on
# sock_accept/sock_recv/sock_sendall, runs today.  See docs/Support_FastAPI.md.
#
# Two Smalltalk dependencies, both of which suspend only the calling green
# thread rather than the gem: time.sleep (a GemStone Delay) and select.

import inspect as _inspect

from asyncio import coroutines  # noqa: F401  (submodule, for asyncio.coroutines.*)
from asyncio import events  # noqa: F401  (submodule, for asyncio.events.*)
from asyncio import exceptions  # noqa: F401
from asyncio import futures  # noqa: F401
from asyncio import locks  # noqa: F401  (submodule, for asyncio.locks.*)
from asyncio import queues  # noqa: F401  (submodule, for asyncio.queues.*)
from asyncio import runners  # noqa: F401
from asyncio import taskgroups  # noqa: F401
from asyncio import tasks  # noqa: F401

from asyncio.exceptions import (
    BrokenBarrierError,
    CancelledError,
    IncompleteReadError,
    InvalidStateError,
    LimitOverrunError,
    SendfileNotAvailableError,
    TimeoutError,
)
from asyncio.events import (
    AbstractEventLoop,
    # The CONCRETE loop class, not the ABC above it.  On CPython/Unix
    # asyncio.EventLoop is SelectorEventLoop, re-exported from
    # unix_events; Grail has one loop implementation, so the public name
    # is that.  Needed by anything that CONSTRUCTS a loop rather than
    # asking for the running one -- test_taskgroups sets
    # ``loop_factory = asyncio.EventLoop``, and without this the whole
    # 1,118-line module scored IMPORTERROR.
    EventLoop,
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
from asyncio.locks import (
    Barrier,
    BoundedSemaphore,
    Condition,
    Event,
    Lock,
    Semaphore,
)
from asyncio.queues import (
    LifoQueue,
    PriorityQueue,
    Queue,
    QueueEmpty,
    QueueFull,
    QueueShutDown,
)
from asyncio.runners import Runner, run
from asyncio.taskgroups import TaskGroup
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
    'AbstractEventLoop', 'Barrier', 'BoundedSemaphore', 'BrokenBarrierError',
    'CancelledError', 'Condition', 'Event', 'EventLoop', 'Future', 'Handle',
    'IncompleteReadError', 'InvalidStateError', 'LifoQueue',
    'LimitOverrunError', 'Lock', 'PriorityQueue', 'Queue', 'QueueEmpty',
    'QueueFull', 'QueueShutDown', 'Runner', 'Semaphore',
    'SendfileNotAvailableError', 'Task', 'TaskGroup', 'TimeoutError',
    'TimerHandle',
    'all_tasks', 'coroutines', 'create_task', 'current_task', 'ensure_future',
    'events', 'exceptions', 'futures', 'gather', 'get_event_loop',
    'get_event_loop_policy', 'get_running_loop', 'iscoroutine',
    'iscoroutinefunction', 'isfuture', 'locks', 'new_event_loop', 'queues',
    'run',
    'runners', 'set_event_loop', 'set_event_loop_policy', 'shield', 'sleep',
    'taskgroups', 'tasks', 'wait_for',
]
