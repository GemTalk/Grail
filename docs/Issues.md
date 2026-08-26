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

## RESOLVED: an honest `inspect.iscoroutinefunction` hangs `import django.http.response`

**Resolved 2026-08-25, by re-measurement rather than by a fix here.** The
honest mask went back in and the hang did not reproduce: `import
django.http.response` completes, and `test.test___all__` runs in its usual 23
seconds (the recorded failure mode was a 601-second timeout). The loop lived
in what asgiref did once told the truth, and the callable-classification work
of this month (`types.MethodType`/`FunctionType` instancechecks, `__wrapped__`
handling, function `__globals__`) fixed whatever it keyed on from underneath.
`iscoroutinefunction`, `isgeneratorfunction` and `isasyncgenfunction` are now
CPython's real mask against `co_flags`, with method/partial unwrapping;
`tests/python/inspect_async_predicates.py` pins the truth table. The history
below is kept as written, because the lesson — a stub can outlive its reason
— is the useful part.


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

## FIXED (partly): a bulleted docstring moved the reported frame line

`___derivePythonLineForMethod___:ip:` and its span companion find the Python line
by locating the caret `GsNMethod >> _sourceAtIp:` inserts, then taking the last
`___curPos___ := N` at or above it. The caret is marked

```
 * ^1                                                            *******
```

and both scans identified it as *the first line whose first non-blank character
is an asterisk*. That is not sufficient. A Python **docstring is emitted as a
multi-line Smalltalk string literal**, so its own lines land in the generated
source verbatim, and a bullet list in one is indistinguishable from the marker:

```smalltalk
___curPos___ := #(5 4 5 5 '    """Summary line.').
'Summary line.

    * first bullet
    * second bullet
    '.
___curPos___ := #(11 8 nil 8 '    a = 1').
```

Because the scan takes the FIRST match, a bullet **above** the real caret wins,
the caret is located too early, and the line reported comes from higher up the
function. Measured deterministically: a four-line function with a bulleted
docstring reported **40** where CPython reports **46**.

`___isCaretLine___` now requires `^` followed by a digit after the asterisk — the
marker always carries the ip, and prose does not.

**Comments are not affected, and that asymmetry is why this took a docstring to
find.** A Python comment never reaches the generated Smalltalk; only the one-line
source excerpt inside each position literal does. So `# * bullet` is harmless
while `* bullet` inside a string is not. Grail's own hand-written Smalltalk
comments use the same bullet style — 11 of 1060 probed methods have such a line —
so this is ordinary input, not a contrived one.

**It misreports lines only — it does NOT drop frames.** An earlier version of
this note claimed it could do both, reasoning that a caret landing above every
`___curPos___` would make the scan answer nil and drop the frame. That was a
guess and it is wrong: a `*` line can only occur inside a multi-line string
literal, and codegen always emits that statement's `___curPos___` store *before*
the literal, so there is always a store above the false caret. Measured on a
three-deep chain of bulleted-docstring functions:

| | frames | lines |
|---|---|---|
| with the fix | 3 | 12, 27, 32 |
| reverted | 3 | **8, 23**, 32 |

Same chain length, wrong lines. So this bug contributes to the *wrong-line* route
of the intermittent family and **not** to the *short-chain* route — a fix here
should not be expected to change the rate of `ValueError: call stack is not deep
enough` at all.

Pinned by `tests/python/frame_line_bulleted_docstring.py` (5 checks, expected
values CPython 3.14.6's; 3 flip when the fix is reverted, and the 2 that hold are
the controls — a plain docstring and a bulleted comment) driven by
`TracebackTestCase>>testABulletedDocstringDoesNotMoveTheReportedLine`.

It does **not** close the intermittent failures — see below.

## The live-frame tests fail intermittently, and `GRAIL_TEST_SHARDS="0 1"` reproduces it

`TracebackTestCase>>testLiveFramesAndGetframe` and
`FrameEqualityTestCase>>testFrameEquality` fail intermittently. Both stand on
`BaseException class >> ___liveFrameChain___`; the usual symptom is
`sys._getframe()` raising `ValueError: call stack is not deep enough`, i.e. the
walk came back without the caller's frame.

**This has been investigated twice before and written off as unreproducible**
(PR #641, PR #649: "passed alone, passed in its shard twice, passed on the next
full run"). It is reproducible — the missing variable was not load, it was
**which shards share a session**. CI splits the four SUnit shards across two
runners, `0 1` and `2 3`; the local default runs all four together, which is why
`./scripts/run_tests.sh` almost never shows it.

Measured on 2026-08-24, macOS/3.7.5, on clean `main` at dbe1597f:

```
GRAIL_TEST_SHARDS="0 1" ./scripts/run_tests.sh
```

| runs | failures |
|---|---|
| 5 | **3** — 1× `testLiveFramesAndGetframe`, 2× `testFrameEquality` |

Not a fixed test and not a fixed failure mode: the same command produces a
`[FAIL]` or an `[ERROR]`, in one of two classes, or passes. Both classes live in
shards 0/1, so the pair has to be co-resident for it to appear at all.

**The mechanism is NOT capture truncation.** I guessed that first and it is
wrong — measured elsewhere on 2026-08-24, `___trimCapturedStack___:` truncation
was ruled out directly (`truncatedWalks=0` while the flake fired), along with the
capture flag being off or leaking across shards, a poisoned
`GrailPyMethodCache`, a swallowed `AlmostOutOfStackError`, native-code ips, and
unstable test order. PR #648's three fixes do not fix it either (2/12 against a
2/8 control).

**What it looks like instead is a wrong ip→line derivation.** Made visible by
having `tests/python/frame_depth.py` report evidence rather than a bare `False`:

```
got  [('catcher', 31), ('outer', 26), ('middle', 22), ('leaf', 128)]
want [('catcher', 31), ('outer', 26), ('middle', 22), ('leaf', 18)]
```

Every frame present, right order, right names — **one wrong line number**, on the
innermost frame. 128 is a comment line in an unrelated function and is in the
range of plausible *ip offsets*, which points at `___pythonLineForMethod___:ip:`
/ `_sourceAtIp:` rather than at frame collection.

That also accounts for the two different symptoms. The live-frame filter keeps
only frames with a DERIVABLE Python line, so a derivation that comes out wrong
misreports the frame (`testFrameEquality`, the `'<nested>'` misnaming), while a
derivation that comes out empty DROPS it — and a dropped innermost frame is
exactly `sys._getframe()` reporting "call stack is not deep enough". One broken
derivation, two faces.

**A sharper probe now exists.** `TracebackTestCase>>testABulletedDocstringDoesNotMoveTheReportedLine`
(added with the caret fix above) asserts exact line numbers and reports the wrong
value, where the older tests report only that something differed. Under the shard
split it flaked once in five runs with:

```
got (46, 108) want (46, 77)
```

The inner frame is right; the OUTER frame reported **108**. The fixture file is
**100 lines long**, so 108 is not a line in it at all — which rules out a
mis-scan of that method's own source, caret or otherwise, and says the number
came from somewhere else entirely.

**That out-of-range signature is almost certainly a different bug from the caret
one fixed above**, and matches what the parallel investigation in `wt/c` records
for its wrong-line route: lines 128, 93 and 747 reported for a two-line function
in a 182-line file. The caret bug can only ever answer a real `___curPos___` from
the *same* method, and always one EARLIER than the true line. A number outside
the file cannot come from it.

Two candidates, neither confirmed:

* **A stale cache entry.** Five session caches key on `aMethod asOop` with no
  liveness guarantee (`GrailIpLineCache`, `GrailIpSpanCache`, `GrailFnNameCache`,
  `GrailSoleFnNameCache`, `GrailPyMethodCache`), so a recycled OOP would answer
  from an unrelated method — which fits "a line in an unrelated function"
  exactly. **Measured against, so far:** 25 generations of loading and dropping
  the same fixture module produced **0** OOP collisions, so recycling was not
  demonstrated. Worth retrying under the real suite rather than a tight loop.
* **A mis-parsed position literal.** `___parsePositionLiteral___:from:` reads the
  digits after `#(`, and its own comment records a previous bug of this exact
  shape — concatenating a line with an adjacent numeric literal to derive
  `37133718`. `108` is what `#(10 8 ...)` yields if the digit scan does not stop
  at the space.

**Two reproductions, pick by what you need.** The shard split above is the one
that explains CI and gives a whole-suite base rate. For iterating on a fix, four
concurrent topaz sessions each running ONE test class in a loop is far faster
(~12% per iteration, no suite needed) — and note that the stock `TestResult` from
`suite run` drops the assertion description, which is where fixture evidence
lands, so pass a `GrailTestResult`. Calling the fixture function directly in a
tight loop does NOT reproduce it (0 of 1600): the surrounding class context is
needed.

**Instrument sparingly.** Heavy instrumentation makes it vanish (ring-buffer walk
tracing: 0/8), so probes have to be integer-only and near-free or they measure
the bug away.

Worth fixing rather than tolerating: while it is live, a traceback in an affected
session silently misreports a line — or loses a frame — and the loss is reported
by whatever reads the walk as a fact about *its own* request.

## PLATFORM GAP (decided): no unawaited-coroutine warning, no origin tracking

CPython warns when a coroutine is garbage-collected without ever having been
awaited -- ``RuntimeWarning: coroutine 'f' was never awaited`` -- and, with
``sys.set_coroutine_origin_tracking_depth()``, records where the orphan was
created so the warning can point at it.  Both fire from the coroutine's
**destructor**: the check lives in ``coro_dealloc``, and the report goes
through ``warnings._warn_unawaited_coroutine`` at collection time.

Grail deliberately implements neither, and the reason is the platform, not
the effort.  A Grail coroutine is an ordinary GemStone session object; nothing
runs when one becomes unreachable -- there is no per-object finalization hook
for transient objects, and the in-memory collector gives no destruction
callback the runtime could attach the check to.  Every route that fakes it
gives a worse answer than absence:

* **Sweep at commit/abort/session end.**  Warns arbitrarily late (CPython
  warns at collection, which is usually promptly after the drop), attributes
  the warning to the sweep point rather than the drop site, and costs a scan
  of session memory that grows with the session.  A warning whose line points
  at ``System commitTransaction`` teaches nobody anything.
* **Warn on reuse instead of on drop.**  Reuse already raises
  (``cannot reuse already awaited coroutine``, PR #672); the never-awaited
  bug is precisely the coroutine nobody ever touches AGAIN, so a reuse hook
  never sees it.
* **A weak-reference/ephemeron registry.**  GemStone's finalization story is
  for persistent objects and epochs, not per-temp-object callbacks; polling a
  registry is the sweep option wearing a different hat.

This is the same platform-honesty call as ``os.fork``: CPython itself ships
platforms where pieces are absent (Windows and WASI have no fork; PyPy warns
about unawaited coroutines only when its GC happens to run, and its docs tell
users not to rely on it).  PyPy is the precedent that matters here: a
tracing-GC Python already cannot promise CPython's prompt warning, so
portable code treats it as best-effort diagnostics, never semantics.

What this costs on the scoreboard, recorded rather than hidden -- seven
tests of ``test.test_coroutines``, all of which EXIST to test the warning
machinery itself: ``test_bpo_45813_1/2``, ``test_func_9``,
``test_fatal_coro_warning``, and the three ``OriginTrackingTest`` cases
(which also want ``sys.get/set_coroutine_origin_tracking_depth``; adding
no-op depth accessors without the warning they configure would be a stub
that lies, so they stay absent too).
``CoroutineObjectsTestCase>>testDroppingAnUnawaitedCoroutineIsSilent`` pins
the deviation so a green run is not read as more than it is.

What would reopen the decision: a GemStone finalization hook for transient
session objects, or the async runtime growing a real event loop whose task
lifecycle (asyncio warns about un-retrieved exceptions from its own
bookkeeping, not from the GC) gives the warning a natural, prompt home.
