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
| `Queue` | **missing** | `test_queues` (725 lines) is the next one waiting |
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

## 4. Blocker 2 — pydantic v2 means running Rust

Three ways out, in ascending order of what they ask of the runtime.

### Route A — load the real `_pydantic_core.so` through the shim

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

* No FastAPI, starlette, pydantic or anyio code has been vendored or run
  under Grail. The line counts and dependency facts come from CPython venvs;
  the 67/72 import result and the coroutine table come from Grail.
* The depth of the suspension fix in §3 is unmeasured. It could be a
  contained change to `___grailAwait___:` plus the generator send path, or it
  could reach into codegen. Nobody has tried.
* Route A's viability for a **PyO3** binary is unmeasured. The NumPy
  evidence is encouraging and is about a different toolchain.
* `test_typing` and `test_annotationlib` both currently score IMPORTERROR
  (PEP 695 type aliases; an f-string parse). pydantic v2 leans hard on
  `annotationlib` and modern typing, so those rows are probably on the
  critical path for Route A/B and were not investigated here.
