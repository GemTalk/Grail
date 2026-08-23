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
* **There are exactly two blockers.** Grail ships no asyncio event loop; and
  modern FastAPI hard-requires pydantic v2, whose engine is a 4.2 MB
  compiled Rust extension with no pure-Python fallback. *(measured)* The
  first is smaller than it looks: coroutines can now suspend, and GemStone's
  ProcessScheduler already supplies every primitive a loop is built from,
  including socket readiness — so what is missing is an asyncio *façade*,
  not a runtime (§3).
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

So the remaining work is **an asyncio façade over these primitives**, not a
scheduler: `get_running_loop`, `create_task`, `Future`, `sleep`,
`TaskGroup`, `run`. That is a well-understood job of a different order from
writing a runtime.

Three things still need care, and none is a mystery:

* **One scheduler, not two.** A task must not be parked in two places at
  once — blocked on a GemStone semaphore *and* held by a loop that thinks it
  owns scheduling. Grail's generator design already resolves this the right
  way: the body runs on a forked process, `send()` is a synchronous two-
  semaphore handoff, and the consumer drives. An asyncio façade slots in as
  the top-level consumer; `Processor` stays the bottom half.
* **Cancellation must be a `throw()`, not `GsProcess terminate`.** anyio's
  cancel scopes are Python-level `except CancelledError` / `finally`, which
  only run if the exception arrives at the coroutine's suspension point.
  That now works, and terminating the process instead would silently skip
  every cleanup handler.
* **`select` keys on socket OBJECTS, not fds** (documented subset; `xlist`
  is always empty, no poll/epoll/kqueue). `loop.add_reader(fd, cb)` is
  fd-keyed in asyncio's own contract, so that is a real impedance mismatch
  to design around rather than ignore.

Then anyio's 15k lines of cancel scopes, task groups and thread bridging on
top. *(estimate: still the long pole, but façade work rather than runtime
work)*

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
