# Known Issues

## Extensions using internal macros

CPython extensions fall into two categories with respect to our shim:

**Public API only** (`PyList_GetItem`, `PyList_Append`, etc.) — These call functions by name. A pre-compiled `.so`/`.dylib` built against the real `Python.h` will link against our implementations without recompilation.

**Internal macros** (`PyList_GET_ITEM`, `PyList_SET_ITEM`, `_PyList_ITEMS`, etc.) — In the real `Python.h`, these expand to direct memory access into `PyListObject->ob_item[i]`. The compiled extension has that pointer arithmetic baked in. Since our lists are backed by GemStone `OrderedCollection` (not a contiguous C array), these extensions cannot work without recompilation against our `cpython.h`, which routes the macros through function calls.

The same applies to `PyTuple_GET_ITEM`/`PyTuple_SET_ITEM` and any other macro that accesses internal struct fields.

Our adapted `_heapqmodule.c` is an example: the original CPython source uses `_PyList_ITEMS()` for raw array access in the sift operations. We replaced those with `PyList_GET_ITEM`/`PyList_SET_ITEM` calls, which route through GCI to GemStone.

## FIXED: a failed `GsFile` probe answers nil, and nil is not a Boolean

Reported as "importing any submodule of the `grail` package poisons the
session": `import grail.gemstone`, `import grail.repl` — any
`grail.<submodule>` — failed with

```
a ImproperOperation occurred (error 2085), Expected nil to be a Boolean.
```

and every test that ran afterwards in the same SUnit shard failed the same
way, 80 of them, in classes with nothing to do with the import.

**The cause is one unguarded predicate.** For a dotted name,
`importlib >> ___moduleNameToSoPath___:` probes `<root>/<pkg>/<leaf>.so`.
Search root #1 is the repo, and `./grail` there is the Grail CLI **shell
script** — so `stat("<repo>/grail/gemstone.so")` fails with ENOTDIR, and
`GsFile>>existsOnServer:` answers **nil** (not false) for a probe that
errors. The inlined `ifTrue:` that nil reached raised error 2085. The `.py`
resolver had guarded exactly this with `== true` for longer, and its comment
even names `./grail`; the `.so` search, which runs after it, was missed.

That explains every row of the original report's table — it is the package
NAME only because the name collides with a plain FILE in a search root, so
`grailx`, `zzpkg` and a top-level import were all fine, and moving
`__pycache__` changed nothing.

**Two things the report got wrong**, both worth knowing for the next
diagnosis of this shape:

* **There is no session poisoning.** Measured after the crash, from a module
  body, from a Python `try/except`, and through the unload handler: every
  later import in the session succeeds, `sys.modules` is clean, and the
  initializing-module stack is empty. What looked like poison was one
  fixture, imported by 80 tests, hitting the same first-order crash each
  time — and because an `ImproperOperation` is a Smalltalk error, not a
  Python exception, `except BaseException` does not contain it, so it read as
  something spreading.
* **The submodule that crashes is the one that does not exist.** The `.so`
  probe runs only after the `.py` resolver comes up empty. `import
  grail.asgi` crashed because `src/python` is not a search root, so the
  module was never resolvable at all; the answer it deserved was
  `ModuleNotFoundError`.

**`open()` had the same defect on the same cause.** `open('grail/x.txt')`
raised error 2085 where CPython raises `NotADirectoryError`. Its failure
branch now asks `os >> ___statOrSignal___:isLstat:`, which maps the errno to
CPython's `OSError` subclass (ENOTDIR, ENOENT, EACCES) with CPython's message
text, instead of reporting every failure as "No such file".

Guards: `ImportlibTestCase >>
testSoSearchAnswersNilWhenAPlainFileShadowsAPackageDir` (asserts the live
`./grail` collision first, so it cannot pass by exercising nothing),
`testDottedImportUnderAFileShadowedRootReportsNotFound`, and `FileIoTestCase
>> testOpenBelowAPlainFileRaisesNotADirectory`.

`src/python/grail/` is fine to import from again, given a search root that
reaches it. Note that `grail/repl.py` still needs a `code` module Grail does
not have, and `grail/gemstone.py` publishes itself as `sys.modules['gemstone']`
— which is why `import gemstone` is the documented spelling.

## An honest `inspect.iscoroutinefunction` hangs `import django.http.response`

`inspect.iscoroutinefunction` is marker-only: it tests an explicit
`_is_coroutine_marker` attribute and nothing else, so it answers **False** for
every real `async def`. The comment beside it used to explain that as a platform
limit — a Grail `PyCode` carries no flags word. That is no longer true:
`FunctionDefAst >> emitCoFlags` computes real CPython `co_flags`, so an
`async def` reports 131 (`OPTIMIZED|NEWLOCALS|COROUTINE`) and a plain `def`
reports 3, with `CO_GENERATOR` / `CO_ASYNC_GENERATOR` set from whether the body
yields.

So the predicate can be CPython's own one-line mask. It was written, measured,
and **reverted**, because it hangs an import:

```
import django.http.response      # never returns; >6 minutes observed
```

For scale, the whole of `test.test___all__` — which imports every module in the
tree — takes **22 seconds** with the stub and **times out at 601 seconds** with
the honest predicate. `test___all__` walks alphabetically and stops at
`django.conf.urls` → `django.urls.exceptions` → `django.http.response`.

Narrowed as far as the import graph: `asgiref`, `asgiref.local`,
`asgiref.current_thread_executor`, `asgiref.sync` and `django.core.exceptions`
all import fine. `django.http.response` does not. It imports
`async_to_sync, sync_to_async` from `asgiref.sync` and its module level is
otherwise only class definitions, so the loop is somewhere in what asgiref or
Django does once it is told a function really is a coroutine function — plausibly
`AsyncToSync`, which in CPython relies on real threads that Grail does not have.

**Not diagnosed further than that.** What it means in practice:

* `inspect.iscoroutinefunction` still lies, and code that needs the truth keeps
  a local predicate. `unittest/async_case.py` has one, because
  `IsolatedAsyncioTestCase` cannot work without it — see the comment there.
* `isgeneratorfunction` and `isasyncgenfunction` are hardcoded `False` for the
  same historical reason and were left alone deliberately: they are the same
  one-line fix, and the blast radius of this family of predicates is now known
  to be real and unmeasured.
* Fixing this properly means understanding Grail's asgiref/Django async path,
  which is worth doing — a truthful `iscoroutinefunction` is a prerequisite for
  anything that dispatches on async-ness, Django's own async views included.

## An exception loses its identity crossing a Task boundary

Grail preserves exception identity through a plain `raise` and through an
`await`, but not out of a `Task`. Measured (2026-08-24):

| shape | `e is original` |
|---|---|
| `try: raise made` / `except: e` | True |
| `await inner(made)` where inner re-raises | True |
| `await task` where the task's coroutine raises `made` | **False** |
| same, for `CancelledError` | **False** |

The args survive — only the object differs — so it shows up only where code
compares identity. `asyncio.Task._step` stores the exception with
`Future.set_exception`, and `Future.result()` then does `raise self._exception`;
re-raising an already-signalled exception is where the copy happens (the same
mechanism `PythonGenerator >> _resignalable:` documents: "``ex`` if it can be
signaled again, else a clean copy of it").

Found by `test.test_asyncio.test_locks`, whose `test_cancelled_error_wakeup` and
`test_cancelled_error_re_aquire` assert `assertIs(err.exception, raised)` — the
CancelledError a caller sees must be the object the coroutine raised, not an
equal one. Those two tests now get the right `args` (`cancel(msg=...)` was fixed
in the same change) and fail only on identity.

**Not diagnosed further.** It is in the raise/re-signal machinery rather than in
asyncio, and it is not specific to cancellation — a plain `ValueError` out of a
task is copied too.

## `type(x).__name__` leaks the Smalltalk class name

For a Python type Grail implements in Smalltalk without a name mapping,
`__name__` answers the Smalltalk class, not the Python one. Measured
(2026-08-24):

| expression | Grail | CPython |
|---|---|---|
| `type(1).__name__` | `'int'` | `'int'` |
| `type(list[int]).__name__` | `'PyGenericAlias'` | `'types.GenericAlias'` |
| `type(lambda: 1).__name__` | `'ExecBlock'` | `'function'` |

So the mapping exists (`int` is right) and is simply absent for these. It is
cosmetic until something reads it — a `repr`, an error message, a
`type(x).__name__ == 'function'` dispatch, or a test asserting the name — and
then it is a wrong answer rather than a missing feature.

Found while binding `types.GenericAlias` to the real class (which is
`PyGenericAlias`); deliberately **not** fixed there, because it is not specific
to aliases and the fix belongs wherever Grail decides a Smalltalk class's Python
name, once, for the whole family. `test.test_asyncio.test_queues`'
`test_generic_alias` does not assert the name, so nothing in the corpus is
currently blocked on it.

Do not confuse this with the separate genexp deviation:
`type((x for x in [1])).__name__` answers `'list'` here because Grail
materialises a module-level generator expression, which is a different thing
entirely.

## `EventLoopTestCase>>testCallSoonAndTimerOrdering` pins real wall-clock margins

`tests/python/event_loop.py`'s timer probes assert on genuine elapsed time:

```python
loop.call_later(0.03, seen.append, 'late')
loop.call_later(0.01, seen.append, 'early')
await asyncio.sleep(0.05)          # must be enough for BOTH
```

A 0.05 s window for a 0.03 s deadline is a 20 ms margin, and the SUnit gate runs
four shards concurrently — often alongside another agent's shards on the same
stone. Observed failing once under that load on 2026-08-24, then passing on the
next full run and 5/5 when its class was run alone in a fresh session.

So the test is not measuring what it means to measure. What it means to assert is
*ordering* — that the scheduled list is a heap and not a queue, so a later-queued
earlier deadline still fires first — and ordering does not need a clock margin at
all: firing both timers and asserting the sequence, or waiting on a future the
last timer resolves, would pin the same property without a race.

Left alone deliberately rather than widened to suit a passing run: a bigger sleep
makes the flake rarer and the test no better. The fix is to stop asserting on
elapsed time, which is the same principle the fixture guidance already states —
assert where a state machine ends up, not how long it took to get there.
