# Supporting FastAPI in Grail

The goal: `import fastapi`, define routes, and serve a request inside Grail.

This document is an **inventory and a feasibility measurement**, not a plan
that has been agreed. Everything below marked *measured* was run on
2026-08-22 against this checkout on GemStone 3.7.5; everything marked
*estimate* is not.

The headline, up front, because it decides whether the rest is worth reading:

* **The stdlib floor is already there.** 67 of the 72 stdlib modules the
  FastAPI stack imports already import in Grail. The five that do not are
  peripheral. *(measured)*
* **There were exactly two blockers.** Grail shipped no asyncio event loop; and
  modern FastAPI hard-requires pydantic v2, whose engine is a 4.2 MB
  compiled Rust extension with no pure-Python fallback. *(measured)* The
  first is now mostly gone: Grail has a working asyncio loop, including
  socket I/O, because GemStone's ProcessScheduler already supplied every
  primitive a loop is built from — what remains there is transports and
  protocols, plus anyio (§3).
* **Every route to FastAPI needs the async work.** Starlette is ASGI in both
  the 0.27 and 1.6 lines, so there is no synchronous path to sidestep it.
  The pydantic question is a genuine fork; the async question is not.
  *(measured)*

Contrast this with [Support_Flask.md](Support_Flask.md): Flask's whole
dependency set is pure Python and its request path is WSGI, i.e.
synchronous. Neither is true here. FastAPI is not a bigger Flask.

## 1. The dependency tree

`pip install fastapi` into a clean 3.14 venv, resolved 2026-08-22 *(measured)*:

| Package             | Version | Pure-Python? | Lines (.py) |
|---------------------|---------|--------------|------------:|
| `fastapi`           | 0.141.1 | Yes          | 21,048 |
| `starlette`         | 1.6.0   | Yes          |  6,890 |
| `pydantic`          | 2.13.4  | Yes          | 45,751 |
| `pydantic_core`     | 2.46.4  | **No**       |  4,632 + a 4.2 MB `.so` |
| `anyio`             | 4.14.2  | Yes          | 15,477 |
| `idna`              | 3.19    | Yes          | 20,103 |
| `annotated-types`   | 0.8.0   | Yes          |    562 |
| `annotated-doc`     | 0.0.5   | Yes          |     39 |
| `typing-inspection` | 0.4.4   | Yes          |  1,207 |
| `typing_extensions` | 4.16.0  | Yes          |      — |

~116k lines of pure Python, plus one binary.

### The binary is the whole validation engine

Exactly one compiled artifact appears anywhere in the tree *(measured)*:

```
pydantic_core/_pydantic_core.cpython-314-darwin.so     4,169,712 bytes
```

That is pydantic v2's validator/serializer, written in Rust against PyO3.
It is not an accelerator with a Python fallback — unlike `markupsafe`,
where Flask support could simply take the slow path. `pydantic/` builds
*core schemas* and hands them to `pydantic_core.SchemaValidator`; remove
the `.so` and nothing validates at all.

### Modern FastAPI has dropped pydantic v1

FastAPI used to run on either major pydantic. It no longer does *(measured)*:

```
fastapi-0.141.1.dist-info/METADATA:  Requires-Dist: pydantic>=2.9.0
fastapi/_compat/                     __init__.py  shared.py  v2.py
```

There is no `v1.py`. The surviving `annotation_is_pydantic_v1` /
`is_pydantic_v1_model_instance` helpers exist to *detect* v1-shaped
annotations, not to run on them. So "use pydantic v1" is not a
configuration of current FastAPI; it is a different, older FastAPI.

## 2. The stdlib slice

The stack imports **73 distinct stdlib top-level modules** at module scope
(static AST scan of every `.py` in the nine packages) *(measured)*.

Probing `__import__` for each of them inside Grail: **67 succeed, 5 fail**
*(measured)*.

| Missing | Wanted by | Why it is cheap |
|---------|-----------|-----------------|
| `atexit` | anyio | Process-exit hooks; a no-op registry is honest in a gem. |
| `colorsys` | pydantic | Pure arithmetic, ~100 lines, only for pydantic's colour type. |
| `runpy` | anyio | Only anyio's `__main__` path. |
| `_interpreters` | anyio | Subinterpreters — an optional anyio backend. |
| `_interpqueues` | anyio | Same. |

None of these is on a request path. **The stdlib is not the problem**, which
is the genuinely good news here and the reason the two blockers below are
worth taking seriously rather than dismissing.

Caveat on what that number means: it says these modules *import*. It does
not say every API the stack calls on them behaves. `asyncio` is the proof —
it "imports" and is a stub (§3).

## 3. Blocker 1 — no event loop, and no way to suspend

Grail's vendored `asyncio` is an **84-line stub** whose own header states the
contract *(measured)*:

> Grail has no event loop; threading is cooperative (GsProcess green
> threads). This package exists so asyncio-importing libraries (asgiref,
> django.dispatch, jinja2) load and their *synchronous* code paths run.
> [...] Anything that would actually *run* a coroutine raises
> NotImplementedError at call time.

The coroutine **object protocol** does exist — `PythonCoroutine`, added
deliberately, with `send` / `throw` / `close` / `__await__`. Measured
behaviour of a coroutine driven by hand:

| Probe | Result |
|-------|--------|
| `async def` call returns a coroutine | ✅ `PythonCoroutine` |
| `c.send(None)` on a non-awaiting body | ✅ `StopIteration(42)` |
| `await` another coroutine, then return | ✅ `StopIteration(8)` |
| `async with` over an `__aenter__`/`__aexit__` class | ✅ `StopIteration('in')` |
| **`await` an object whose `__await__` yields** | ❌ **returns the object itself** |

That last row is the blocker, and it is the only one that matters. The
mechanism is in `PythonCoroutine class >> ___grailAwait___:`:

```smalltalk
(anObject @env0:isKindOf: PythonGenerator) @env0:ifFalse: [^ anObject].
```

`await x` drives `x` only when `x` is already generator-shaped; **anything
else passes through unchanged**, and `__await__` is never consulted. So:

```python
class Sleeper:
    def __await__(self):
        yield 'suspend-me'      # how a real loop parks a task
        return 'resumed'

async def f():
    return await Sleeper()      # CPython: yields 'suspend-me' out to the loop
                                # Grail:   evaluates to the Sleeper object
```

An event loop *is* this mechanism. `asyncio.Future.__await__` does
`yield self`; the loop receives the future, registers a callback, and
resumes the coroutine later. A runtime that cannot propagate that yield out
through the await chain to its driver cannot host a loop, no matter how much
of `asyncio` is vendored on top.

`CoroutineObjectsTestCase` says as much in its own header: *"THERE IS STILL
NO EVENT LOOP, and this does not add one. [...] Nothing suspends."*

**This is required by every route.** Starlette is ASGI in both lines
measured — `starlette/routing.py` alone has 17 `async def` — and even
`TestClient` runs the app through an anyio portal, i.e. through a loop. There
is no synchronous door into FastAPI.

### The suspension half is now done

`await` delegates through the existing PEP 380 machinery, so a coroutine
suspends and a miniature event loop (Future whose `__await__` is
`yield self`, plus a round-robin scheduler) runs two interleaving tasks
under Grail. See `CoroutineSuspensionTestCase`. *(measured)*

### GemStone's ProcessScheduler is the loop engine, and Grail already uses it

This deserves its own heading because it substantially lowers the estimate
this document originally carried. An asyncio loop is built from four
primitives, and GemStone supplies all four *(measured, from the source)*:

| asyncio needs | GemStone gives | Grail already uses it for |
|---|---|---|
| cheap tasks | `[...] fork` (green threads) | `PythonGenerator >> _forkBody` — every generator and coroutine body |
| park / resume | `Semaphore` | `___yield___:` — the `consumerSem` / `producerSem` handoff |
| timers | `Delay`, `Semaphore>>waitForMilliseconds:` | `select`'s timeout |
| **I/O readiness** | **`Processor whenReadable: sock signal: sem`** / `whenWritable:` | `select.py` → `PyRawSocket >> ___select___` |

The last row is the one that matters most, because the selector loop is the
part asyncio hand-rolls over epoll/kqueue and the part that looked absent
here. It is not: GemStone has a per-socket readiness registry, and
`_socket_module.gs` already registers every socket against one semaphore to
get a true N-way wait — *"the gem sleeps until the first socket is ready or
the timeout expires, and other green threads keep running"*. `select`,
`selectors` and `socket` all import in Grail today.

So the remaining work was **an asyncio façade over these primitives**, not a
scheduler — a well-understood job of a different order from writing a runtime.

### Status: Blocker 1 is mostly gone *(as of 2026-08-23, measured)*

The façade exists. `src/python/stdlib/asyncio/` is a real package
(`events`, `futures`, `tasks`, `runners`, `exceptions`) and the 84-line stub
is gone. What runs today:

| | state | evidence |
|---|---|---|
| `await` suspends and delegates | done | `CoroutineSuspensionTestCase` |
| `async for`, async generators, async comprehensions | done | `AsyncIterationTestCase`, `AsyncGeneratorsTestCase` |
| `Future`, `Task`, `sleep`, `gather`, `run`, cancellation, timers | done | `EventLoopTestCase`, `test_asyncgen` 8 → 32 of 85 |
| I/O: `add_reader`/`add_writer`, `sock_recv`, `sock_recv_into`, `sock_sendall`, `sock_accept` | done | `AsyncioIoTestCase` — 14 probes, all agreeing with CPython |
| the loop waits *inside* `select`, so a socket or a timer wakes it | done | `a_timer_fires_while_waiting_on_io`, `the_loop_sleeps_rather_than_spins` |
| **an ASGI app is served over HTTP** | **done** | `AsgiServerTestCase` — 28 probes, all agreeing with CPython |
| transports / protocols / streams | **missing** | no `create_server`, `create_connection`, `StreamReader` |
| `Lock`, `Event`, `Condition`, `Semaphore`, `BoundedSemaphore`, `Barrier` | **done** | vendored from upstream; `test_asyncio.test_locks` 64/75 |
| `Queue`, `PriorityQueue`, `LifoQueue` | **done** | vendored from upstream; `test_asyncio.test_queues` 51/59, the other 8 all need `TaskGroup` |
| `TaskGroup` | **done** | vendored from upstream; `test_asyncio.test_taskgroups` 40/48, plus 48 more that need `eager_task_factory` |
| `eager_task_factory` | **missing** | half of `test_taskgroups` reruns itself under it; needs eager Task start |
| `timeout` / `timeout_at` | **missing** | `test_timeouts` (411 lines) |
| `TaskGroup`, `timeout`, `to_thread` | **missing** | — |

Two of the three things that "needed care" turned out fine, and the third
resolved itself:

* **One scheduler, not two** — held. The loop is pure Python on GemStone's
  primitives: a coroutine body runs on a forked process, `send()` is the
  two-semaphore handoff, and the loop is simply the top-level consumer.
  `Processor` stays the bottom half.
* **Cancellation is a `throw()`, not `GsProcess terminate`** — held, so
  `except CancelledError` / `finally` cleanup runs.
* **`select` keys on socket OBJECTS, not fds** — no longer a mismatch.
  `loop.add_reader` keys its table by descriptor as CPython does and resolves
  an int back through `_socket`'s fd registry, so both spellings work. A probe
  checks that adding by fd and removing by socket hit the same registration.

Two things found by measurement rather than anticipated, both of them Grail
bugs rather than platform limits:

* **The non-blocking state had to be fixed first.** `recv()` on a
  non-blocking socket raised `TimeoutError`, a *sibling* of
  `BlockingIOError`, so `except (BlockingIOError, InterruptedError):` never
  matched — the shape every one of these coroutines is written in. See
  `NonblockingSocketTestCase`.
* **`connect` was misreporting, not missing.** Grail answered a bare
  `OSError: connect failed: getpeername failed with Socket is not connected`
  for a connect that had merely *started* — that text is GemStone's internal
  completion probe, surfaced as though it were the connect's own error. The
  platform was already right: every socket the image creates is non-blocking
  at the OS level, every connect is issued non-blocking, and
  `connectTo:on:timeoutMs:` treats EINPROGRESS as "started, not finished",
  waiting with `writeWillNotBlockWithin:` — which suspends only the calling
  GsProcess. So a timeout of 0 starts a connect and polls once, exactly the
  primitive asyncio wants. `connect` now classifies (connected / in progress /
  resolved-and-failed, from readiness) and `sock_connect` waits in `select`
  with everything else. The only genuine gap is that no *public* call starts a
  connect and hands back the pending errno, so a resolved failure is reported
  as `ConnectionRefusedError` rather than a precise errno; GsSocket's private
  connect primitive does answer the real one at the cost of reimplementing the
  getaddrinfo loop around it.

  `connect_ex` was fixed in the same place: it shares the classifier now, after
  a measurement showed a *blocking* `connect_ex` to a closed port **raising**
  instead of answering `ECONNREFUSED` — the one contract it has.

### An ASGI app is now served *(as of 2026-08-23, measured)*

The "hand-written server runs today" line above has been cashed in:
`src/python/stdlib/grail_asgi.py` serves ASGI apps over real HTTP on the loop
as it stands, written against `sock_accept` / `sock_recv` / `sock_sendall`
rather than against transports. 28 probes in `tests/python/asgi_server.py`,
every one of them agreeing with CPython 3.14.6 — including two clients
interleaving, keep-alive with request pipelining, a 256 KiB response through
partial writes, and the error paths (400/411/431/500/505).

**The point is not the HTTP.** Transports are how CPython's asyncio prefers to
*reach* accept/read/write, not a precondition for them, so ASGI never needed
them — which moves a demonstrable milestone three increments earlier. And a
composed protocol test finds what primitive tests cannot: this one immediately
found a runtime bug that every socket fixture had missed, because it only
appears when **two** coroutines are suspended inside `except` handlers at once.
Grail kept "which handler bodies am I inside" in one session-wide stack, but a
coroutine is a generator on its own forked process, so the two unwound each
other and one was left permanently shielded against its own later clauses — the
next exception escaped *uncaught*, `except BaseException` included. It presented
as `connect()` answering EISCONN straight past an `except OSError` written to
catch exactly that. Fixed by saving and restoring that state across every
suspension, the way the currently-handled exception already was
(`BaseException >> ___captureHandlerState___`).

That is the argument for doing transports next rather than anyio first: the
cheap end-to-end test is what surfaces the runtime defects, and there are
evidently more of them than the primitive tests imply.

**What is left, in order:** transports and protocols (uvicorn asks for
`loop.create_server(protocol_factory, ...)`, so it still cannot be pointed at
this loop unmodified), then streams (`open_connection` / `start_server`,
`StreamReader` / `StreamWriter`), then the synchronisation primitives and
`TaskGroup` / `timeout` that anyio 4 needs. Then anyio's 15k lines of cancel
scopes, task groups and thread bridging on top. *(estimate: anyio is still the
long pole, but façade work rather than runtime work)*

### Upstream's `test_asyncio` is adoptable incrementally *(measured 2026-08-24)*

Until now the async work has been graded entirely by self-written
CPython-verified fixtures, because `test_asyncio` looked like an all-or-nothing
41-file, 31,330-line package. It is not: the suite driver resolves any dotted
name through `importlib ___moduleNameToPath___`, so the manifest can name a
single **submodule**. Proven end to end — `test.test_asyncio.test_context` is
in the manifest and scores, both on the skip path and (probed by temporarily
flipping `decimal.HAVE_CONTEXTVAR`) on the run path. No harness change was
needed.

Naming the *package* would score 0 tests, incidentally: the driver discovers
`unittest.TestCase` subclasses defined in one named module, and
`test_asyncio/__init__.py` defines none.

What divides the corpus is `test_asyncio/utils.py`:

| tier | gate | files | lines |
|---|---|---|---|
| 1 | `unittest.IsolatedAsyncioTestCase` only | 11 relevant | **~4,950** |
| 2 | + `utils.py` (609 lines) | ~22 | ~24,000 |

Tier 1 is almost exactly this roadmap: `test_locks` (1,825 —
Lock/Event/Semaphore/Condition/Barrier), `test_taskgroups` (1,118),
`test_queues` (725), `test_timeouts` (411), `test_waitfor` (353),
`test_transports` (103), `test_protocols` (67), `test_threads` (66),
`test_futures2`, `test_staggered`, `test_context`.

And it has **one** prerequisite. Every tier-1 file subclasses
`unittest.IsolatedAsyncioTestCase`; CPython's `unittest/async_case.py` is 158
lines and needs only `asyncio` + `contextvars` + `inspect` + `warnings` +
`.case`, all present, with an asyncio surface (`Runner`, `get_loop`, `run`,
`close`, `run_until_complete`, the policy getters) that is also all present.
Grail's `unittest/__init__.py` already carries the four call hooks built as the
documented extension point for exactly that class.

**So the switchover is the next increment, not a later one:** port
`async_case.py` *before* writing `Event`/`Lock`/`Semaphore`/`Condition`/`Queue`,
and implement them against 2,550 lines of upstream tests rather than against
fixtures we write ourselves. `test_taskgroups` and `test_timeouts` need one
extra helper (`await_without_task`).

Tier 2 is the honest cost of grading transports and streams — and it is where
`test_sock_lowlevel.py` (700 lines, the file that would grade the socket
coroutines already written) sits. `utils.py` needs `selectors`, `socketserver`,
`threading`, `unittest.mock`, `http.server`, `wsgiref.simple_server`, and three
asyncio submodules Grail does not have (`base_events`, `format_helpers`, `log`).

Own fixtures keep a narrower brief after this: deliberate Grail deviations
(which upstream cannot express), bug-specific regressions, and **composed
protocol tests** — `asgi_server.py` found the handler-stack bug precisely
because upstream's asyncio tests are overwhelmingly single-task unit tests and
that bug needs two coroutines suspended in `except` handlers at once.

### The gate is ported, and upstream tests are running *(2026-08-24)*

`unittest/async_case.py` is vendored (upstream verbatim but for the `TestCase`
import), so `IsolatedAsyncioTestCase` exists and drives real upstream asyncio
tests. Two things had to change under it:

* **`asyncio.Runner` creates its loop lazily.** `IsolatedAsyncioTestCase` never
  uses `with`; it calls `get_loop()` from `_callSetUp` precisely to force the
  loop into existence, then `run()` directly. Grail's Runner only built its loop
  in `__enter__`, so `get_loop()` answered None.
* **`inspect.iscoroutinefunction` is marker-only**, so `_callAsync`'s
  `assert iscoroutinefunction(self.asyncSetUp)` failed on every async test
  method. The comment explaining why — a Grail `PyCode` carries no flags word —
  was **stale**: `FunctionDefAst >> emitCoFlags` computes real CPython
  `co_flags`, so `async def` reports 131 and a plain `def` reports 3. Giving the
  predicate CPython's real one-line mask therefore looked free, and it is not:
  it **hangs `import django.http.response`** indefinitely (>6 min, against 22s
  for all of `test___all__` with the stub). So `async_case` keeps a local
  predicate and `inspect` still lies; the hang is written up with its
  reproduction in `docs/Issues.md`, and a truthful `iscoroutinefunction` is now
  a known prerequisite for anything dispatching on async-ness.

  `import unittest` also had to stay cheap. Upstream exposes
  `IsolatedAsyncioTestCase` through a PEP 562 module `__getattr__`, precisely so
  that importing `unittest` does not drag in asyncio. Grail has no PEP 562
  (measured — a module-level `__getattr__` is never consulted), so the import
  here is eager and `async_case` imports asyncio lazily instead.

`test.test_asyncio.test_waitfor` is the first real exercise: **19 upstream tests
collected, 15 passing.** The four that do not pass are the first to-do list this
work has been handed by upstream rather than written for itself:

| test | why |
|---|---|
| `test_asyncio_wait_for_cancelled` | `asyncio.wait` does not exist |
| `test_wait_for_timeout_less_then_0_or_0_coroutine_do_not_started` | `wait_for(coro, 0)` must not start the coroutine, and must raise TimeoutError |
| `WaitForShieldTests.test_shielded_timeout` | shield-on-timeout behaviour |
| `WaitForShieldTests.test_zero_timeout` | ditto, at timeout 0 |

That is the switchover working as intended: three real conformance gaps in
`wait_for`/`shield` that no fixture in this tree had noticed, and one missing
public API, surfaced by adopting 353 lines we did not have to write.

### The locks are upstream's, and they found two runtime bugs *(2026-08-24)*

`asyncio.locks` and `asyncio.mixins` are vendored verbatim — 617 lines of
`Lock` / `Event` / `Condition` / `Semaphore` / `BoundedSemaphore` / `Barrier`
that did not have to be written — and graded by upstream's `test_locks`:
**75 tests, 64 passing.**

The first pass scored 59, and closing the gap meant fixing two runtime bugs
nothing in this tree had reached:

* **`async with` did not suspend on a blocking `__aenter__`.** The
  with-statement codegen drove the protocol through the class-side
  `PythonCoroutine ___grailAwait___:`, which holds no reference to the awaiting
  coroutine and so can only `send()` once: a coroutine that *returns* gives its
  value, one that *suspends* makes the helper answer `None` and the statement
  walks into its body anyway. So `async with lock:` on a **contended** Lock ran
  the critical section unlocked, then raised `RuntimeError: Lock is not
  acquired`. Uncontended it never suspends, which is exactly why it went
  unnoticed — it took a Barrier, where contention is the point. Fixed by giving
  `AsyncWithAst` the two-emit rule `AwaitAst` already had. The full CPython
  suite then reported `test_coroutines` improving 47 → 45 fail+err on its own,
  which is independent confirmation.
* **`cancel(msg=...)` lost the message.** `Future` stored `_cancel_message` and
  never read it; `Task._step` then called `super().cancel()` on completion,
  resetting it. Fixed with CPython's `_make_cancelled_error`, plus keeping the
  `CancelledError` *instance* on the task as CPython does.

Of the 11 that remain, none is a lock: 4 need `asyncio.wait` / `asyncio.timeout`
/ `asyncio.TaskGroup`; 3 assert that `await <non-awaitable>` raises `TypeError`,
a deliberate Grail deviation; 2 pin CPython's exact `TypeError` wording; and 2
want the *same* exception instance out of a cancelled task, which Grail copies
crossing a Task boundary — a raise-machinery limitation, measured for plain
`ValueError` too and written up in `docs/Issues.md`.

### The queues needed no adaptation, and found a wrong `TimeoutError` *(2026-08-24)*

`asyncio.queues` is vendored **verbatim** — 309 lines of `Queue` /
`PriorityQueue` / `LifoQueue`, `QueueEmpty` / `QueueFull` / `QueueShutDown` —
and imported with zero edits, `f'{id(self):#x}'` format specs and
`__class_getitem__ = classmethod(GenericAlias)` included. That is the first of
these files to need no adaptation at all, which is the more interesting result
than the score: the locks landed on top of a codegen fix, and this one landed on
top of nothing.

`test_queues`: **59 tests, 51 passing.** All 8 remaining failures are one cause
— `asyncio.TaskGroup` does not exist — so there is no queue behaviour left
unaccounted for.

The two bugs it did find are both outside asyncio, and both are the same shape:
a name bound to something that *looked* right at the point where Grail's own
tests read it.

* **`asyncio.TimeoutError` was a class of Grail's own.** Upstream aliases the
  builtin (`TimeoutError = TimeoutError  # make local alias`, since 3.11), and
  every 3.11+ codebase writes the plain `except TimeoutError`. Grail's separate
  `class TimeoutError(Exception)` read correctly everywhere you would look for
  it — `wait_for` raised a TimeoutError, with the right name and message — and
  was wrong at every *catch* site, plus missed the builtin's descent from
  `OSError`. Grail's own fixtures could not have caught it: they were written
  against `asyncio.TimeoutError`, the spelling that worked. It took
  `test_cancelled_getters_not_being_held_in_self_getters`, which writes the
  modern spelling and let the exception escape its `assertRaises`.
* **`types.GenericAlias` was a stub shadowing the real class.** Grail *has* a
  real `PyGenericAlias` in Smalltalk — `__origin__`, `__args__`,
  `__parameters__`, `__call__`, PEP 560 `__mro_entries__`, and a constructor
  already commented "CPython exposes the constructor". `types.py` bound a
  five-line stub to the name instead, from back when Grail never materialised an
  alias. The stub was worse than a missing name: it declared no `__init__`, so
  `__class_getitem__ = classmethod(GenericAlias)` *succeeded* and answered an
  attribute-less object. `asyncio.Queue[int]` was neither an alias nor an error.
  The fix is one line — `GenericAlias = type(list[int])`, the same idiom the
  file already uses for `EllipsisType`.

Note what the second one implies about the first increment: the *stub* had been
there long enough to be load-bearing-looking, and the thing that exposed it was
adopting a file that reaches the name the way upstream modules do. Writing our
own `test_queues` would have subscripted `Queue` the way Grail already worked,
if at all.

`TaskGroup` is the next increment and should be graded by `test_taskgroups`, not
by these 8: it needs `futures.future_add_to_awaited_by`, and real
`cancelling()` / `uncancel()` counting rather than the current 0/1 stubs, and a
TaskGroup that passed the happy paths here while failing its own module would be
exactly the "looks done, isn't" outcome worth avoiding.

### TaskGroup found two bugs with nothing to do with asyncio *(2026-08-24)*

`asyncio.taskgroups` vendored **verbatim** (280 lines), plus the three runtime
pieces it needs that Grail lacked: `futures.future_add_to_awaited_by` /
`future_discard_from_awaited_by`, a real *counting* `Task.cancelling()` /
`uncancel()` (they were a bool and a hardcoded `0`), and `asyncio.EventLoop`
exported — without that last one the whole 1,118-line test module scored
IMPORTERROR.

**`test_taskgroups`: 96 tests, 40 passing.** 48 of the 56 failures are a single
missing name: the module reruns its entire suite as `TestEagerTaskTaskGroup`
under `loop.set_task_factory(asyncio.eager_task_factory)`. So of the 48 tests
that are about TaskGroup itself, **40 pass**.

The knock-on is the better number: **`test_queues` went 51/59 → 59/59** (all 8
of its remaining failures were the missing `TaskGroup`), and `test_locks` gained
one.

Two bugs, both outside asyncio and both found only because TaskGroup exercises
paths nothing else in the tree does.

#### A `with` whose `__exit__` raises called `__exit__` twice

`WithAst` emitted the clean-path `mgr.__exit__(None, None, None)` as the last
expression **inside** the `try` whose `except BaseException` handler calls
`__exit__` again with the exception details. A manager whose `__exit__` raised
therefore had `__exit__` invoked a second time, handed its own exception as the
excinfo triple.

CPython puts that call in the `else` of the `try`, which no `except` covers —
and that is the shape `WithAst`'s own docstring had described all along, while
the code did something else. Nothing about it was async; plain `with` had it
identically.

How it surfaced is worth recording: TaskGroup's `__aexit__` raises
`BaseExceptionGroup` on the *normal* path, so it re-entered itself, and by then
its own `finally` had cleared `_parent_task` — reported as `'NoneType' object has
no attribute 'uncancel'`, which points nowhere near a with-statement. Three
synthetic reconstructions passed before instrumenting the real `_aexit` showed
it being entered twice. The fix guards the clean call on whether the protected
block answered `true`, which needs no new temp — a temp per `with` would cost
stack frame width in a construct that nests.

#### `BaseExceptionGroup` never narrowed to `ExceptionGroup`

PEP 654: `BaseExceptionGroup(msg, excs)` hands construction to `ExceptionGroup`
when every member is an `Exception`. Grail always built a `BaseExceptionGroup`,
so `except ExceptionGroup` — the ordinary spelling, and what every one of these
tests uses — caught nothing, and the group escaped as an uncaught Smalltalk
error. That was 17 tests.

The nested case is the interesting half, and it is why the check cannot be an
`isKindOf:`. CPython declares `class ExceptionGroup(BaseExceptionGroup,
Exception)` — two bases — so an `ExceptionGroup` is itself an `Exception` and a
group *of groups* narrows. GemStone is single-inheritance: Grail's
`ExceptionGroup` descends from `BaseExceptionGroup` alone, and the rule that
makes `except Exception` catch one already lived in `Exception class >> handles:`.
The narrowing asks that method rather than restating the rule. Nested
TaskGroups are exactly this shape — and that is what anyio and FastAPI build,
not a corner case.

Implemented as a `___classForArgs___:` hook on `BaseException class` because
there are three construction paths (the literal-arity `__new__:` forms,
`___signalNew___:`, and the `___pyRaiseNew___:` that funnels into it). A rule
applied to only some of them would be worse than none: the class would depend on
whether the group was built as an expression or raised directly.

#### `test_taskgroups` scores OK *(2026-08-26, measured)*

**96 tests: 84 passing, 12 skipped, 0 failures.** It was 40 passing.

The 12 skips are the refcycle family (`test_exception_refcycles_*`, ×2 classes),
now listed **explicitly** in `scripts/cpython_suite_skips.txt` rather than
counted as failures. They assert CPython *refcounting* properties —
`gc.get_referrers`, and a weakref that must be dead by a given statement — and
reach them through a coro's `cr_frame`. Both halves are facts about CPython's
memory model, not about asyncio. The skip entries say what that stops covering:
the invariant those tests protect (TaskGroup not retaining the exception it
raised) is now unmeasured here, though the `del` statements are present because
`taskgroups.py` is vendored verbatim.

Everything else closed. In order:

| was | closed by |
|---|---|
| 48 `TestEagerTaskTaskGroup` errors | `eager_task_factory` + `eager_start`, a `loop.create_task` that consults the factory, and the shadowing-`@staticmethod` attribute fix |
| 1 needs `asyncio.timeout` | vendored verbatim (below) |
| 1 "`asynccontextmanager` with nested groups, not diagnosed" | not about nesting — `@asynccontextmanager` was a pass-through (below) |
| 1 needs `create_task(coro, context=ctx)` | real `contextvars` (below) |

### `contextvars` was one global slot *(2026-08-26)*

`ContextVar` stored **one** value, on the `ContextVar` itself, and `Context.run`
simply called its argument. That was written for `werkzeug.local`, which uses
`ContextVar` purely as proxy-storage indirection in a single-gem process, and it
stayed correct for exactly as long as nothing needed two contexts at once.

**asyncio needs two.** `loop.create_task(coro, context=ctx)` exists so a task
runs its steps inside a caller-supplied `Context` and its writes land *there* —
how `unittest` shares one context across setUp/test/tearDown, and how a server
keeps one request's state out of another's. Under the stub every write went to
the same slot, so `context=` had nothing to select between and asyncio did not
plumb it **anywhere**: not `Task`, not `create_task`, not `call_soon`, and
`Runner.run` documented the argument as accepted-and-ignored.

Now real, on both sides:

* **`contextvars`** — `Context` is a mapping of `ContextVar` → value with a
  current-context scope (`run`/`copy`/`get`/`__getitem__`/`__contains__`/
  `__iter__`/`__len__`/`keys`/`values`/`items`); `Token` carries `MISSING` and is
  single-use, per-variable and per-context; `default` is keyword-only as
  upstream has it.
* **asyncio** — `Task(context=)` and a `get_context()`, with every step run
  inside it; `context=` through `loop.create_task`, `asyncio.create_task` and
  (already, via `**kwargs`) `TaskGroup.create_task`; `Handle` captures a context
  at `call_soon`/`call_at` time and runs the callback in it; `Runner.run` applies
  the argument it used to ignore.

**The model, for whoever changes this next.** There is a *current* context;
`ContextVar.get`/`set` read and write it; `Context.run` makes a context current
for one **synchronous** call and restores the previous one after. A task's step
is such a call, so a task enters its context on every step and leaves it at
every suspension — which is how a `Context` accumulates writes across `await`s
while never being current when the task is parked. That also bounds it: `run`
takes a synchronous callable. Suspending inside one would leave the wrong
context current for whoever resumed, because a Grail generator body is a
separate call stack while the current context is shared. CPython forbids the
same thing for its own reasons.

Twenty-four checks in `tests/python/contextvars_pep567.py`, all agreeing with
CPython 3.14.6; `ContextVarsPep567TestCase` 24/24.

**Still one process-wide in one respect:** nothing here makes contextvars
*thread*-local, because Grail is one gem per session with cooperative green
threads. Per-*task* isolation is what asyncio needed and what this provides.

### `@asynccontextmanager` was a pass-through *(2026-08-26)*

`contextlib.asynccontextmanager` was `def asynccontextmanager(func): return
func`, with a header explaining that Grail had "no async context managers, and
`async with` is emitted as plain `with`". Both halves had stopped being true:
async generators support `asend`/`athrow`/`aclose`, and `async with` really does
dispatch to `__aenter__`/`__aexit__` — `asyncio.timeout` is one.

**This one matters for FastAPI beyond the test count.** `lifespan` handlers are
written as `@asynccontextmanager`, and FastAPI's dependency injection resolves
`yield`-style dependencies through async context managers. A pass-through here
is not a missing corner; it is the startup/shutdown protocol.

**How it failed is the argument for a stub raising `NotImplementedError`.**
Returning the undecorated function meant `async with database():` met a bare
`async_generator` — which has `__anext__` but no `__aexit__` — so the caller got
`TypeError: 'async_generator' object does not support the asynchronous context
manager protocol (missed __aexit__ method)` raised inside its own block, naming
its own object. Under a TaskGroup that surfaced as an `ExceptionGroup` whose
single child was a `TypeError`, so `except* CustomException` correctly declined
it and the group escaped — three layers from the two-line stub responsible. The
generalisable lesson: **an `ExceptionGroup` carrying the wrong child type is a
report about the child, not about the group.**

Three neighbours were wrong in the same family, each by sharing something with
the synchronous half that could not be shared:

* `AsyncContextDecorator` subclassed `ContextDecorator`, so decorating with an
  async context manager produced a wrapper running a plain `with` over an object
  that has only `__aenter__`/`__aexit__`.
* `AbstractAsyncContextManager` was `pass`, so a subclass relying on the
  documented default `__aenter__` got no async hooks at all.
* `aclosing()` returned the *synchronous* `closing()`, which calls `.close()` —
  a method an async iterator does not have.

Sixteen checks in `tests/python/asynccontextmanager.py`, all agreeing with
CPython 3.14.6; `AsyncContextManagerTestCase` 16/16.

**Still a stub:** `AsyncExitStack` remains an alias for the synchronous
`ExitStack`, so it has no `enter_async_context` and no `aclose`. That is now
stated at the alias in `contextlib.py` rather than left to be discovered, and it
is the next thing FastAPI will want — its dependency resolution drives one per
request.

### `asyncio.timeout` needed no adaptation *(2026-08-25, measured)*

Upstream's `asyncio/timeouts.py` vendored **verbatim**, 183 lines, zero edits.
Ten checks in `tests/python/asyncio_timeout.py`, all agreeing with CPython
3.14.6; `AsyncioTimeoutTestCase` 10/10.

**Why it was free is the point.** A timeout does not raise — it cancels the task
and converts the resulting `CancelledError` into `TimeoutError` on the way out.
Telling "the timeout cancelled me" from "somebody else cancelled me" is exactly
what the cancel COUNT is for, and that arrived with TaskGroup when
`_cancel_requested` (a bool) became `_num_cancels_requested` (an int). On the
boolean build the happy paths here would pass and the two propagation checks
would not. So this is the second time the counting cancel has paid for itself,
and it is the pattern worth expecting: each primitive that lands makes the next
one cheaper than its line count suggests.

It closes the `asyncio.timeout` row above and leaves `test_taskgroups` at the
same total, because `TestEagerTaskTaskGroup` — 48 of the 55 errors, one `setUp`
failing repeatedly on a missing `asyncio.eager_task_factory` — dominates
everything else in that module. **That is the next cheap-looking increment, with
one caveat: `eager_task_factory` needs `Task(eager_start=True)` semantics, i.e.
running the coroutine synchronously to its first suspension, so it is a real
feature and not a missing name.** The refcycle family (now 5, up from 4) is
still the same story as recorded above — it reaches the chain through
`cr_await`, which #667's coroutine identity work does not extend, and it asserts
CPython refcounting either way.

## 4. Blocker 2 — pydantic v2 means running Rust

Three ways out, in ascending order of what they ask of the runtime.

### Route A — load the real `_pydantic_core.so` through the shim

> **Chosen (2026-09-29).** The measured symbol floor, the ranked walls and the
> phased plan are in [Support_Pydantic.md](Support_Pydantic.md).
>
> **Working (2026-10-02).** `pydantic.BaseModel` runs in Grail on an abi3
> build of the real `_pydantic_core` (Phases 0–5), and pydantic's own test
> suite runs: a 12-module slice — `test_main`, `test_fields`,
> `test_validators`, `test_serialize`, `test_json` and seven more — compared
> test by test against CPython (Phase 6). The cost is speed: a validation is
> two to three orders of magnitude slower than on CPython (W7), every one of
> it shim crossings. The stock PyPI wheel imports but cannot validate yet; it
> needs a real CPython memory layout for `str`/`float` (Phase 4, option (a)).

Grail already loads real CPython C extensions through a hand-written shim
(`_sre`, `_bisect`, `_crc32c`, `_statistics`), and
[Shim_NumPy.md](Shim_NumPy.md) records a serious attempt at the same trick
for a 3.7 MB NumPy binary: symbol floor closed (317 symbols, 0
unresolved), `dlopen` succeeds, no ABI crash, and NumPy's entire core type
initialisation runs. That is real evidence the approach is not fantasy.

What is different here, and it cuts both ways: NumPy is C against the
stable-ish CPython API, while `_pydantic_core` is **Rust against PyO3** — a
different and broad surface. And NumPy's win was measured at *import*,
whereas pydantic\_core is on the hot path of every single request, so
"init runs" would be a much smaller fraction of done.

### Route B — reimplement the engine

Write pydantic v2's validator/serializer against Grail. The interface alone
(`_pydantic_core.pyi`) is 45,932 bytes, and `core_schema.py` — the schema
vocabulary it must accept — is 155,574 bytes. This is building a new
validation engine, not porting one. *(estimate: largest of the three)*

### Route C — FastAPI 0.99 + pydantic v1, entirely pure Python

Measured: `pip install fastapi==0.99.1` resolves to a tree with **no binary
requirement at all**.

| Package | Version | Lines (.py) |
|---------|---------|------------:|
| `fastapi` | 0.99.1 | 6,311 |
| `starlette` | 0.27.0 | 6,454 |
| `pydantic` | 1.10.26 | 13,277 |
| `anyio` | 4.14.2 | 15,477 |

**~41.6k lines, versus ~116k plus Rust.** The v1 wheel is Cython-compiled,
but it ships all 26 `.py` sources beside the `.so`s, so vendoring the pure
source is exactly the established Flask/Django pattern.

What it costs: FastAPI 0.99 is from mid-2023. Real FastAPI semantics —
routing, dependency injection, request/response models, OpenAPI generation —
but not the current API, and a later jump to v2 would redo the pydantic
half.

Note that Route C **does not avoid Blocker 1**. Starlette 0.27 is ASGI too.

## 5. Where this leaves the decision

| | Route A (shim) | Route B (reimplement) | Route C (0.99 + v1) | Starlette only |
|---|---|---|---|---|
| Async work needed | yes | yes | yes | yes |
| Rust/C work needed | yes | no | **no** | no |
| Pure-Python lines to vendor | ~116k | ~116k | **~42k** | ~6.5k |
| Ships *current* FastAPI | **yes** | yes | no | n/a |
| Longest pole | PyO3 surface | new engine | async only | async only |

Two observations that are not recommendations:

1. **The async foundation is unconditional.** It is the prerequisite for
   every column above, including a Starlette-only outcome. Work spent there
   is not wasted under any choice, which makes it the natural first
   increment regardless of how the pydantic question is settled.
2. **The pydantic question can be deferred**, precisely because of (1).
   Nothing about the loop work depends on which pydantic wins.

A useful intermediate milestone, if one is wanted before committing to the
whole campaign: `import starlette` and serve one request through a
hand-driven loop. That exercises the async foundation end to end and needs
no pydantic at all.

## 6. What has *not* been established

Stated plainly, so this document is not read as more than it is:

* ~~No FastAPI, starlette or anyio code has been run under Grail.~~ Run
  (2026-10-05): with a monkeypatch per wall, a FastAPI app serves `GET` and a
  pydantic-validated `POST` — see §7. Nothing is vendored; the stack is
  installed into a venv. The line counts and dependency facts in §1 come from
  CPython venvs; the 67/72 import result and the coroutine table come from
  Grail.
* ~~The depth of the suspension fix in §3 is unmeasured.~~ Done (§3).
* ~~Route A's viability for a **PyO3** binary is unmeasured.~~ Measured
  (2026-10-02): it works for pydantic_core on the abi3 build, at W7's cost
  — see [Support_Pydantic.md](Support_Pydantic.md). FastAPI on top of it
  is §7.
* `test_typing` and `test_annotationlib` both currently score IMPORTERROR
  (PEP 695 type aliases; an f-string parse). pydantic v2 leans hard on
  `annotationlib` and modern typing, so those rows are probably on the
  critical path for Route A/B and were not investigated here.

## 7. The first end-to-end run *(2026-10-05, measured)*

Route A was chosen (§4) and pydantic runs (Phases 0–6 of
[Support_Pydantic.md](Support_Pydantic.md)), so the question became what
stands between that and FastAPI. This section answers it by running the
current stack until it stops, recording the wall, monkeypatching past it in
the probe script, and running again.

**Setup.** Darwin arm64, GemStone 4.0.0.a4, branch `jmason/fastapi` (the
pydantic Phase 6 tree), `GRAIL_IR_CODEGEN=0`. A copy of the pydantic abi3 venv
(Support_Pydantic.md, *Resume here* step 2) with the current FastAPI resolved
into it — note it has moved on since §1:

| package | §1 (2026-08-22) | now |
|---|---|---|
| `fastapi` | 0.141.1 | 0.142.2 |
| `starlette` | 1.6.0 | 1.7.0 |
| `anyio` | 4.14.2 | 4.15.1 |
| `pydantic` / `pydantic_core` | 2.13.4 / 2.46.4 | 2.13.5 / 2.46.5 (abi3 build) |
| `httpx` (for testing) | — | 0.28.1 |

```bash
cp -R /tmp/pydantic_abi3 /tmp/fastapi_abi3
/tmp/fastapi_abi3/bin/python -m pip install fastapi 'pydantic==2.13.5' 'pydantic_core==2.46.5' httpx
env -u PYTHONPATH VIRTUAL_ENV=/tmp/fastapi_abi3 GRAIL_IR_CODEGEN=0 ./grail probe.py
```

(`python -m pip`, not `bin/pip`: a copied venv's `pip` still has the original
venv's interpreter in its shebang.) pip keeps the installed abi3
`pydantic_core` because its version already satisfies FastAPI.

**The app is driven without `TestClient`** — `httpx.AsyncClient` over
`httpx.ASGITransport(app=app)` inside `asyncio.run`. `TestClient` needs a
thread (wall 7 below); the ASGI transport needs only the loop §3 built.

### Result

With every wall below patched in the probe, against the same probe on
CPython 3.14:

| request | Grail | CPython |
|---|---|---|
| `GET /` (`async def`) | `200 {'hello': 'world'}` | same |
| `POST /items` with a pydantic body, `price: "1.5"` | `200 {'name': 'x', 'double': 3.0}` | same |
| `POST /items` missing a field | `422`, keys `msg, input, type, loc` | `422`, keys `type, loc, msg, input` |
| `GET /dep?q=7` with `db=Depends(get_db)` | `200 {'q': 7, 'db': 'Depends(get_db)'}` | `200 {'q': 7, 'db': "'DB'"}` |
| `GET /dep` (`q: int = Query(3)` defaulted) | `TypeError: cannot create 'ExecBlock2' instances` | `200 {'q': 3, ...}` |
| `GET /openapi.json` | `UnboundLocalError: status_code` | `200` |
| `import fastapi`, fresh gem | **~70 s** | 0.3 s |
| build a 3-route app | ~7 s | ~0 s |

So routing, request parsing, pydantic body validation and the 422 path work
end to end on the loop §3 built, on the shim §4 chose. What does not is
everything that reads a **default value** — dependency injection, parameter
defaults and OpenAPI — and that is one wall (3).

### The walls, in the order met

| # | wall | symptom in FastAPI | kind |
|---|---|---|---|
| 1 | `signal.Signals` absent; `shlex.shlex` absent (Grail's `shlex` is an 88-line `split`/`join`/`quote`); no `concurrent.interpreters`; no `runpy` | `import anyio` → `import fastapi` fails. anyio imports all four at module scope (`to_interpreter` imports `concurrent.interpreters` unguarded on 3.14; `starlette.datastructures` imports `shlex`) | stdlib |
| 2 | a class body binding `__eq__ = object.__eq__` makes the **class's own** `==` answer the class: `M == int` → `M` | starlette's `HTTPConnection` binds exactly that. `class X(Request)` then raises `Cannot inherit from plain Generic` (typing's `Generic in cls.__bases__` is true), and an ABC check makes `issubclass(NoneType, HTTPConnection)` true — so `isinstance(None, Mapping)` answers **True**, and `httpx.Headers(None)` fails | runtime |
| 3 | functions have no `__defaults__` / `__kwdefaults__`, and `inspect.signature` reports each default as `_DefaultText`, its source text | **dependency injection**: FastAPI finds `Depends(...)`, `Query(...)`, `Body(...)` by reading `Parameter.default`. It sees text, so a dependency is passed as the string `'Depends(get_db)'` and a `Query(3)` default crashes; OpenAPI's `isinstance(status_code_param.default, int)` fails | codegen |
| 4 | Grail's `dataclasses` is a metadata-and-`__init__` stub; it never calls `__post_init__` | FastAPI's `ModelField` is a `@dataclass` whose `__post_init__` builds its `TypeAdapter`: `'ModelField' object has no attribute '_type_adapter'` on the first body | stdlib |
| 5 | `isinstance(x, T)` raises when `T` is a PyO3 `#[pyclass]` — it surfaces as a `ShimForeignObject`, not a `type` | `jsonable_encoder` tests `isinstance(obj, PydanticUndefinedType)` on every response | shim |
| 6 | a plain `def` endpoint runs through `anyio.to_thread.run_sync` → `anyio._backends._asyncio`, which imports `asyncio.base_events._run_until_complete_cb` and wants a worker thread | only `async def` endpoints serve | asyncio + threads |
| 7 | `TestClient` runs the app through `anyio.from_thread.start_blocking_portal` | `concurrent.futures.TimeoutError: Future has no result (Grail futures are synchronous)` | asyncio + threads |

Wall 2 deserves its note because of how far the symptom lands from the
cause: it surfaced as `'NoneType' object has no attribute 'items'` inside
httpx, three packages from the class body responsible, and only *after* the
app was built — an `isinstance(None, Mapping)` made earlier, before
`HTTPConnection` existed, had cached the right negative answer and hid it.

Also seen, not yet chased: importing `h11` on its own once killed the gem
(`InternalError 2261 … CorruptObj, process switch not allowed in protected
mode`) — `httpx` imports fine; and the 422 detail's key ORDER differs from
CPython (row 3 of the result table), which is likely the order the shim
builds pydantic_core's error dicts in.

### The plan from here

| phase | walls | gate |
|---|---|---|
| 1 | 1 — the four stdlib gaps | `import fastapi` with no probe patches |
| 2 | 2, 3, 4 — the general runtime bugs | each a fixture against CPython 3.14; **tier 2** (they are shared machinery) |
| 3 | 5, and the error-dict key order | shim tests in `CPythonShimTestCase` |
| 4 | 6, 7 — sync endpoints and `TestClient` | decision pending: a same-green-thread portal (run each call to completion with `asyncio.run`) vs a real GsProcess-backed thread pool and cross-thread `concurrent.futures` |
| 5 | serve over HTTP with `grail_asgi`; a slice of FastAPI's own tests with the pydantic Phase 6 runner, compared test by test; latency and import time | — |


### Phases 1 and 2, done *(2026-10-05)*

`tests/python/fastapi_walls.py` (+ `FastapiWallsTestCase`, both codegen arms)
holds a check for each wall below, every one measured against CPython 3.14.

**Phase 1 — the stdlib floor.** `anyio` and `starlette` import with nothing
patched.

| wall | fix |
|---|---|
| `signal.Signals` / `Handlers` | `signal.py` is CPython's, verbatim, over a `_signal` stand-in (Grail's old stub, plus the rest of Darwin's 1..31) |
| `shlex.shlex` | `shlex.py` is CPython's; `test.test_shlex` joins the manifest, **OK 45/0/0** |
| `concurrent.interpreters` | the public surface with CPython's exception bases; every operation needing a second interpreter raises `InterpreterError` |
| `runpy` | CPython's, verbatim |
| *(found on the way)* a top-level `def` after `from X import *` did not rebind a name the star import had bound — exactly CPython's `signal.py` | `ImportFromAst >> ___storesModuleSlot___:` answers true for a star import, so the def clears the slot |

**Phase 2 — the runtime walls.** With these, FastAPI's dependency injection,
parameter defaults, body validation and 422 path run with no workaround —
`GET /dep?q=7` → `{'q': 7, 'db': 'DB'}`, `GET /dep` → `{'q': 3, ...}`:

| wall | fix |
|---|---|
| 2 — class-body `__eq__ = object.__eq__` made the CLASS's `==` a store | the accessor pair stays (math, the `None`-blocking rule and `callable()` all read it), but a protocol dunder's SETTER falls through to `super` unless a marked store is in progress (`ClassDefAst class >> ___isProtocolDunderAttr___:`, `object class >> ___grailClassAttrStoring___`) |
| 2b — a function ASSIGNED to a protocol dunder (`__len__ = lambda ...`) was never reached by the protocol | instance-side forwarders at the end of the class statement (`___grailInstallAssignedProtocolForwarders___:`) and on a runtime `setattr` (frozen dataclasses' `__setattr__`); they fall back to `super` when the attribute is gone, and a rebuilt class drops them |
| 2c — `object`'s own method stored under its own name recursed (`__lt__ = object.__lt__`, `C.__repr__ = object.__repr__`, and `__eq__ = object.__eq__` over an inherited `def __eq__` — starlette's exact shape) | `object >> ___isObjectDefault___:for:` makes such a value read as absent; the varargs-`__eq__` probe moved out of `___grailObjectEq___:`, which an explicit `object.__eq__(a, b)` runs |
| 3 — module functions and methods had no `__defaults__`; `inspect.signature` defaults were source text | module functions record a defaults block at the def (`module >> ___setFunctionDefaults___:block:`) over the same memo the method binds from; methods get a class-side `___methodDefaultKeysTable___` naming the class-body default store. Closures already had a real `__defaults__` (read from the def-time temps, assignment writing through — `FunctionDefaultsTestCase`), so nothing changed there. `inspect` now uses the values and keeps `_DefaultText` only where none is available |
| 4 — `dataclasses` was a stub (no `__post_init__`, `frozen`, `slots`) | CPython's module, verbatim. It needed: `exec`'d defs to read a parameter named `self` (`NameAst` bailed out in a doit); `sys._clear_type_descriptors`; a `__code__` on a class's `__annotate_func__`; `types.FunctionType` to exclude a built-in type's method (`object.__hash__`); and four `type(name, bases, ns)` bugs, below |
| 4b — `type(name, bases, ns)` | `T(1)` with an `__init__` in the namespace was `__new__(1)` (uncatchable) and `T()` skipped `__init__`; `(object,)` rooted the class at the kernel `Object` rather than `PythonInstance`; declared `__slots__` got no accessors; and a copied function was unreachable by a self-send (`self.b()`), which broke every method-to-method call in a `slots=True` dataclass |
| 5 (early) — CPython's dataclasses reads `default.__class__.__hash__`, and pydantic's defaults are pydantic_core objects | the shim answers `__class__` (`Py_TYPE`) in C, and a foreign `__hash__` C does not answer falls back to `object.__hash__` |

Tests that pinned the old `dataclasses` stub were moved to CPython's answers:
`FlaskScaffoldingTestCase` (`make_dataclass` now works; `MISSING` is a
`_MISSING_TYPE`) and `EnumDataclassReprTestCase` (a `repr=False` field is left
out of the generated `__repr__`; a member's field reads its default, `True`).
The enum member repr of a `@dataclass` mixin applies CPython's `_value_repr_`
in `Enum >> ___grailMemberRepr:` too, since the mixin's `__repr__` is now a
forwarder the merge would otherwise find; and `importlib >>
___primaryChainProvides___:` does not count forwarders as methods.

**Known, not fixed** (none on FastAPI's path):

* the accessor pair's unary GETTER has the same collision as the setter had:
  `repr(C)` of a class whose body assigns `__repr__` answers the function;
* `class C: __eq__ = None` keeps the old class-level `==` collision (the
  `None`-blocking readers need the pair);
* a class attribute holding `object.__repr__` read through an instance binds
  the wrong receiver (pre-existing);
* after a class-body `del __eq__`, `C.__dict__` still lists an `__eq__`.

**Where FastAPI stops now** (async endpoints and dependencies, no patches
but wall 5's encoder `isinstance`):

| request | result |
|---|---|
| `GET /`, `GET /dep?q=7`, `GET /dep`, `POST /items` (200 and 422) | as CPython (the 422 detail's key ORDER still differs) |
| a plain `def` dependency or endpoint | wall 6: `asyncio.base_events` (Phase 4) |
| `GET /openapi.json` | new shim wall: pydantic validating the OpenAPI model raises `RuntimeError: The given object is not a float` (Phase 3) |
| `import fastapi` | **~102 s** (was ~70 s): CPython's dataclasses `exec`s source for every dataclass, and Grail's `exec` compiles |

**Gates** (Darwin arm64, 2026-10-05, after merging the pydantic Phase 6 tree):
`run_tests.sh` **7725 run, 7725 passed**, 8 of 8 shards; the CPython
conformance gate **0 regressions** (four modules timed out while the SUnit
suite ran beside it, and are OK alone: test_math, test_bytes, test_pickle,
test___all__), 3 improvements inherited from `main` (test_zipapp,
test_exception_group, test_except_star) and one new row, `test_shlex` OK
45/0/0; `check_python_fixtures.sh` 538 fixtures agree with CPython.

**Next:** Phase 3 (the shim: `isinstance` against PyO3 types, the OpenAPI
"not a float" error, the 422 key order) and the Phase 4 decision on sync
endpoints and `TestClient`.
