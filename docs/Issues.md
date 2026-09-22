# Known Issues

## An emptied `__class__` cell raises `RuntimeError`, where CPython 3.14 raises `NameError`

After `nonlocal __class__; del __class__`, a later zero-argument `super()` has
no cell to read. Both implementations raise; they disagree about what.

| | exception |
| --- | --- |
| CPython 3.14.6 | `NameError: cannot access free variable '__class__' where it is not associated with a value in enclosing scope` |
| Grail | `RuntimeError: super(): empty __class__ cell` |

Grail's is the OLDER CPython spelling, and it is raised on **both** the text and
the direct-to-IR paths, so this is a runtime-message question rather than a
codegen one -- `Super`'s empty-cell check is what needs to move, along with
whatever `super_precondition_errors.py` pins about it.

Found while closing the `NonlocalAst:classCell` census row, and deliberately
not fixed there: `tests/python/nonlocal_dunder_class.py` asserts only that the
delete HAS AN EFFECT (before that cut the emit nilled a temp nobody reads and
`super()` kept working against a cell that should have been empty), rather than
pinning a type that would either encode the divergence as expected or ship a
red test for a defect that fixture is not about.

## Extensions using internal macros

CPython extensions fall into two categories with respect to our shim:

**Public API only** (`PyList_GetItem`, `PyList_Append`, etc.) — These call functions by name. A pre-compiled `.so`/`.dylib` built against the real `Python.h` will link against our implementations without recompilation.

**Internal macros** (`PyList_GET_ITEM`, `PyList_SET_ITEM`, `_PyList_ITEMS`, etc.) — In the real `Python.h`, these expand to direct memory access into `PyListObject->ob_item[i]`. The compiled extension has that pointer arithmetic baked in. Since our lists are backed by GemStone `OrderedCollection` (not a contiguous C array), these extensions cannot work without recompilation against our `cpython.h`, which routes the macros through function calls.

The same applies to `PyTuple_GET_ITEM`/`PyTuple_SET_ITEM` and any other macro that accesses internal struct fields.

Our adapted `_heapqmodule.c` is an example: the original CPython source uses `_PyList_ITEMS()` for raw array access in the sift operations. We replaced those with `PyList_GET_ITEM`/`PyList_SET_ITEM` calls, which route through GCI to GemStone.

## FIXED: `sys.path[0]` was relative, and `-m` never saw the working directory

Two residual halves of issue #847. The issue as filed — "`importlib runPath:`
leaves `sys.path` empty, so a script cannot import the module next to it" — was
already fixed by `8c8f503e` (the `sys.path` bootstrap, PR #714); it had been
measured on `5e8fc42`, which predates that commit. Re-measured at `0f9ac210`,
the reporter's own two-file repro prints `sys.path: ['/tmp/sib']` and imports
its sibling. What was left were the two parts of the issue's *suggested* fix
that had not been implemented.

**Gap A — the script directory went on relative.** Measured, cwd `/tmp/gapA`:

| | `sys.path[0]` | `os.chdir('/')` then `import helper` |
| --- | --- | --- |
| Grail, `runPath: 'sub/main_chdir.py'` | `'sub'` | `ModuleNotFoundError: No module named 'helper'` |
| CPython 3.11 / 3.13, `python3 sub/main_chdir.py` | `'/tmp/gapA/sub'` | imports, `VALUE = 42` |

A relative entry happens to work while the cwd stays put, which is why this
survived: the plain repro (no `chdir`) passes either way. It is `sys.path`, so
it is re-consulted at every later import — once the program moves, the script's
own siblings stop resolving. `___installScriptDir___:` now absolutises via
`os_path >> abspath:`, which normalises `.`/`..` with it. Note the branch for a
bare `app.py` was *already* absolute, since it comes from `getcwd`; only the
`sub/app.py` spelling was inconsistent.

**Gap B — `-m` did not put the working directory on `sys.path`.** Measured, a
module existing only in cwd `/tmp/gapB`:

| | result |
| --- | --- |
| Grail, `importlib runModule: 'cwdonly'` | `ModuleNotFoundError: No module named 'cwdonly'` |
| CPython 3.11 / 3.13, `python3 -m cwdonly` | runs it, `sys.path[0] == '/tmp/gapB'` |

New `___installCwdDir___`, called by `runModule:` **before**
`___moduleNameToPath___:` — the cwd has to be visible to the resolution it
exists to serve. `scripts/grail.tpz` calls it too, in the guarded block that
refines `sys.argv[0]` for `-m`, so a cwd-only module gets the resolved-file
spelling CPython gives it rather than the dotted name.

Both installers share the ONE `sys.path[0]` slot through the new
`___installSysPath0___:` (one remembered `#GrailSysScriptDir`), because
CPython's slot 0 is single and the last program to start owns it. Separate
entries would let a long session accumulate one stale directory per *kind* of
start.

**Accepted platform gap: symlinks are not resolved.** CPython resolves the
script path's symlinks before taking its directory. Grail's
`os_path >> realpath:` is literally `abspath:` — there is no symlink-reading
primitive under it to build on — so a symlinked script answers the *link's*
directory, not the target's. Absolutising is the part that was reachable; this
part is not, and is left as a known deviation rather than faked.

Covered by six new `SysPathBootstrapTestCase` tests, including the end-to-end
one the original fix never had (drive `runPath:` and assert `sys.path[0]`,
rather than calling the installer directly) and the reporter's repro hardened
with the `chdir` that makes a relative entry fail.

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

## FIXED: an exception loses its identity crossing a Task boundary

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

**Fixed (2026-08-27, the test_locks-to-green change).** Diagnosed to
`BaseException class >> ___signalOrPass___:`'s last-resort fallback: an
exception whose stale handler frames make plain `#signal` refuse (6011) and
whose original raise frame `#pass` cannot find was re-signalled as a **copy**.
The fallback now signals a CARRIER (`___signalCarrying___:`) — the payload is
never re-signalled, the except machinery unwraps it, identity is preserved on
every re-raise path. The pinning test flipped from
`testAReRaisedStoredExceptionLosesObjectIdentity` (expected False) to
`...KeepsObjectIdentity` (expects True), and the two `test_locks` identity
tests pass.

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

(`type(lambda: 1).__name__` answering `'ExecBlock'` is still open. The genexp
line that used to sit here — `type((x for x in [1])).__name__` answering
`'list'` — is FIXED: see `GenexpLazinessTestCase`. It was never
module-level-only, as this entry claimed; a genexp materialised in every
scope.)

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
``test.test_asyncgen`` carries the same gap's three twins --
``TestUnawaitedWarnings.test_asend/test_athrow/test_aclose`` warn about a
step object collected undriven, from the same destructor -- counted here
rather than re-decided there.  Two more members, same root, recorded with
the asyncgen-hooks work: ``test_async_gen_asyncio_gc_aclose_09`` (the
FINALIZER hook fires at collection; Grail's substitute is the
shutdown_asyncgens sweep, which runs later than the test's two
sleep(0)s), and ``test_async_gen_asyncio_shutdown_exception_02``'s phase
label (the abandoned generator's close error reaches the exception
handler with the SWEEP's message -- 'an error occurred during closing of
asynchronous generator' -- where CPython's GC-finalizer path reports
'unhandled exception during asyncio.run() shutdown'; right exception,
right handler, different funnel).

What would reopen the decision: a GemStone finalization hook for transient
session objects, or the async runtime growing a real event loop whose task
lifecycle (asyncio warns about un-retrieved exceptions from its own
bookkeeping, not from the GC) gives the warning a natural, prompt home.

## OPEN: two codec-reach gaps (found while adding UTF-32, 2026-08-31)

* **The `errors` policy is ignored for a lone surrogate on encode.** Grail
  raises `UnicodeEncodeError` whatever the caller asked for, and for every
  codec — so this is not utf-32-specific:

  ```python
  'a\ud800b'.encode('utf-8', 'replace')      # CPython b'a?b';  Grail raises
  'a\ud800b'.encode('ascii', 'replace')      # CPython b'a?b';  Grail raises
  'a\ud800b'.encode('utf-16-le', 'replace')  # CPython b'a\x00?\x00b\x00';  Grail raises
  ```

  The surrogate check fires ahead of codec dispatch, so the policy never
  reaches the encoder that would apply it. `_codecs._handle_encode_error`
  already implements the policies correctly; what is missing is routing.

  **The decode side has the matching gap**, and it is broader: `bytes>>decode:_:`
  handles two special cases (utf-8 with `ignore`, and `surrogateescape`) and
  then falls through to the one-argument form, which has no `errors` to pass —
  so every table-backed codec behaves as `strict`:

  ```python
  b'\x00\x00\x11\x00a\x00\x00\x00'.decode('utf-32-le', 'ignore')  # CPython 'a';  Grail raises
  ```

  A codec reached through the REGISTRY does get the policy (the round-trip
  helper passes it), so this is specifically about the built-in table.

* ~~A shipped codec is reachable from `str.encode` only once `codecs` is
  imported.~~ **FIXED** — `___registeredCodecInfoFor___:` now imports
  `codecs` on demand (`___importCodecsForLookup___`), with a re-entrancy
  flag for the fact that loading a module reads a file and reading one
  decodes, and a memoised failure so an unknown encoding does not pay a
  failed import per call. `b'\xa1'.decode('iso-8859-3')` works from a
  module that imported nothing, as it does in CPython.

## OPEN: three of `test_struct`'s five roots

The module's eight failures decomposed into five unrelated roots. Two —
the missing `P`/`F`/`D` format characters and an overflow cap that was
hardcoded to 2^63-1 where `sys.maxsize` is 2^60-1 — are fixed
(`StructGapsTestCase`), along with a general float defect they exposed:
`struct.pack('<d', -0.0)` dropped the sign bit. These three remain, each
needing a design rather than a corrected value:

* **`pack_into` cannot write through a `memoryview` of an
  `array.array`** — "cannot modify read-only memory". `memoryview`
  treats every non-`bytearray` source as read-only
  (`___isReadOnly___:`), and reads an array source by *copying* it with
  `tobytes()`. So making the view writable means giving it a
  write-through path to the array, not relaxing a flag: a write to the
  copy would be silently lost, which is worse than the refusal.

* **`iter_unpack` answers a plain `list_iterator`**, so there is no
  `unpack_iterator` type for `type(it)()` to refuse. Grail's is also
  EAGER where CPython's is lazy — it unpacks the whole buffer and
  returns `list.__iter__`. A named class should fix both at once rather
  than wrap the eager list, which would pin the eagerness in place.

* **A half-initialised `Struct`** — `Struct.__new__(Struct)` with no
  `__init__` — must raise `RuntimeError` from every operation
  (`pack`, `unpack`, `iter_unpack`, `format`, `__sizeof__`). Grail
  reaches format parsing with an unset format and raises `struct.error`
  about a bad char instead.

## OPEN: recursion depth is physical, so deep-recursion tests are fragile

`sys.setrecursionlimit()` raises `NotImplementedError` (GemStone issue
#52046): Grail's recursion limit is **physical Smalltalk stack
exhaustion**, not a counter, and the depth is fixed at login by
`GEM_MAX_SMALLTALK_STACK_DEPTH`. Measured 2026-09-03 under the suite's
own topaz settings:

```
sys.getrecursionlimit()   1000        (reported, and ignored)
actual depth reached      24112       (plain recursion, to stack exhaustion)
```

CPython stops at the counter — 993 for a limit of 1000 — and honours a
change to it. Grail stops when the stack runs out.

**The consequence is that any test whose outcome depends on recursion
depth is sensitive to how much Smalltalk stack everything else on the
call chain happens to consume.** A codegen change that alters frame size
moves the threshold, from anywhere in the system, with no logical
connection to the test.

### What actually fails in `test_traceback`, and it is four causes, not one

The row reads `FAIL | 370 | 3 | 0 | 224`. The three baseline failures have
**nothing to do with recursion**; each is its own defect, and none is
stack-sensitive:

| test | detail | cause |
| --- | --- | --- |
| `TestColorizedTraceback.test_colorized_traceback_from_exception_group` | `AssertionError: ['  + Exception Group Traceback …` | colourised `ExceptionGroup` rendering — ANSI-wrapped filename/lineno/`capture_locals` lines do not match |
| `TestStack.test_extract_stack_limit` | `AssertionError: 4 != 5` | `StackSummary.extract(walk_stack(None), limit=5)` gets 4 frames — the live stack walk is one frame short here |
| `TestStack.test_summary_should_show_carets` | `Not called` | `mock.patch.object(s, '_should_show_carets')` never fires — the internal call bypasses the instance override (see the self-send note below) |

Only the **fourth**, which appears on Darwin arm64 and not in CI, is the
deep-recursion one: `TestTracebackException.test_long_context_chain`
scoring `E: RecursionError: maximum recursion depth exceeded`. Everything
below is about that one test.

### `test_long_context_chain`: what it is testing, and what Grail does

```python
def f():
    try: 1/0
    except ZeroDivisionError: f()
try: f()
except RecursionError as e: exc_obj = e
te  = traceback.TracebackException.from_exception(exc_obj)
res = list(te.format())
self.assertGreater(len(res), sys.getrecursionlimit())
self.assertGreater(len([l for l in res if 'ZeroDivisionError:' in l]),
                   sys.getrecursionlimit() * 0.5)
```

It is a test of the **traceback formatter under a very long
`__context__` chain**: runaway recursion inside an `except` block chains
one `ZeroDivisionError` per level, and the assertion is that rendering
that chain does not truncate or blow up. `sys.getrecursionlimit()` is used
only as a *scale* for "long". It is not a test of the recursion limit.

**Grail supports the functionality the test demonstrates.** Run the test's
body directly, at six different starting stack depths (extra frames
0/5/10/20/40, fresh session each, 2026-09-04):

```
stage1 caught RecursionError · chain depth 5762 · from_exception OK
stage3 format OK, 24046 lines · limit=1000 · ZeroDivisionError lines 5761
```

Both assertions pass by a factor of ~24. Deep recursion raises a catchable
`RecursionError`, the context chain is intact 5762 links deep, and the
formatter renders all of it. Nothing user-facing is missing.

What fails is only the **margin** when the same body runs inside
`unittest`'s own machinery. The harness records `enter=3|converted=3` for
this test — three separate stack exhaustions in one test, every one of
them successfully converted to a `RecursionError` — against `enter=1` for
the bare body. The extra two come from `unittest` re-entering the same
formatter to describe the outcome. The first `RecursionError` is caught by
the test; a later one is not, and escapes as the module's one `ERROR`.

### Why it moved at #800, and what has been ruled out

It regressed at PR #800 ("codegen: a method-nested closure no longer
captures the frame"), bisected:

| commit | test_traceback fail+err |
| --- | --- |
| `096ecdc7` (before #800) | 3 |
| `f21dba05` (#800) | **4** |

Deterministic, five runs and six. It is **not a logic error in #800** — and
note the direction: #800 *increased* achievable method recursion depth
under the suite's settings, 1212 → 2599 (module-level calls unchanged at
674). The regression is the side effect of an improvement, so reverting
#800 would trade a wider stack for a green row.

Measured refutations (2026-09-03/04), each one a hypothesis that is now
closed:

* **Not leaked state.** Running all 310 preceding tests in one session and
  then this one still passes; repeated depth measurement gives 24112 every
  time.
* **Not native code vs interpreted.** In a local `grail-ci-base:local`
  container, `GEM_NATIVE_CODE_ENABLED` on *and* off both score `f=3 e=0`.
  The flag flip was verified with
  `System gemConfigurationAt: #GemNativeCodeEnabled` reading 2 then 0.
* **A bigger stack budget is not available, and would not help anyway.**
  `GEM_MAX_SMALLTALK_STACK_DEPTH` is **capped at 80000 by the VM** — asking
  for 320000 prints `value 320000, is out of range, it should be between
  100 and 80000. Setting to 80000` and runs at the ceiling the suite
  already uses. Structurally a bigger budget cannot help regardless: the
  test recurses *to exhaustion*, so it consumes whatever it is given and
  arrives at the same knife edge with a longer chain.
* **The warning is not firing too late.** Every overflow the guard sees is
  converted — `converted == enter`, 1/1 isolated and 3/3 under the harness.
  Widening the `AlmostOutOfStack` yellow-zone reserve would not change the
  outcome, because no conversion is failing.
* **The traceback machinery is not the recursion source.**
  `TracebackException.__init__` expands the chain breadth-first from a
  queue and `format()` is a `while link is not None` loop; both are
  iterative, so Python-level recursion depth there is 1.
* **The outcome is non-monotonic in available stack** — extra frames
  0/5 PASS, 10 ERROR, 20/40/80 PASS, reproduced twice. A knife edge, not a
  threshold.
* **CI is unaffected.** The baseline refreshed by #812 (run 33753211466)
  postdates #800 and still reads `f=3 e=0`.

### The options, and the recommendation

* **Count instead of exhausting.** A per-call depth counter raising
  `RecursionError` at `sys.getrecursionlimit()` would make
  `setrecursionlimit` work and make every deep-recursion test
  deterministic. The cost is an increment and a compare on the hottest
  path in the system. **Rejected** — not worth paying on every Python call
  to settle one test's margin.
* **Count frames on demand from `_gsStack`.** Would give an accurate
  *report* of depth. **Does not apply** — nothing in this test, or in the
  three baseline failures, asks how deep the stack is. The gap is
  enforcement timing, not reporting.
* **Trigger `AlmostOutOfStack` earlier / widen the reserve.** **Does not
  apply** — see above, conversion already succeeds every time.
* **Accept the row.** ← **recommended.** The user-visible behaviour the
  test exercises works, and works with room to spare; CI already reads 3
  and the committed baseline matches. What Grail does not have is
  CPython's *deterministic* limit, and that is a known, documented
  platform difference (`sys.setrecursionlimit` → `NotImplementedError`,
  GemStone #52046) of the same kind as the absence of refcounting GC.

The residual risk is unchanged and worth restating: any future codegen
change can move this row again, in either direction, with no diagnostic
connection to the change that did it — and nothing in the pre-merge
pipeline can catch it, since `ci.yml` does not run the conformance suite
and the nightly diff is a day of merges wide.

## OPEN: a frame built by `exec` reports no globals

CPython's `exec(src, ns)` runs the body with `ns` **as** its globals, so a
write to `ns` afterwards is visible to anything the body defined, and a
binding the body makes appears in `ns` immediately. Grail copies `ns` into
a scope and reflects the bindings back when the body finishes, so:

```python
ns = {}
exec('def peek(k): return globals().get(k)', ns)
ns['later'] = 42
ns['peek']('later')      # CPython 42;  Grail None
```

A binding made *by the body* is visible through the frame's globals
(`ExecFrameGlobalsTestCase` pins that); what is not visible is a later
write to the original dict from outside.

Unrelated to which object a FRAME reports — that is fixed — and the fix
here is to make the scope a view over the caller's mapping rather than a
seeded copy, which changes `_exec:`'s reflect-back contract.

## OPEN: `del sys.stdout` cannot hide the attribute

A module attribute in Grail is a compiled accessor with a dynamic-instVar
slot in front of it. Assigning creates the slot; `del` removes the slot —
and the accessor underneath answers `None`, so `hasattr(sys, 'stdout')` is
still `True`:

```python
sys.stdout = io.StringIO()
del sys.stdout
hasattr(sys, 'stdout')     # CPython False;  Grail True
```

CPython's `input()` raises `RuntimeError('lost sys.stdout')` when the
attribute is *absent*, which is the difference it is detecting. Grail
cannot express absence, so that guard cannot be written: an attempt was
made and REMOVED rather than shipped, because a check that can never fire
reads as a working feature.

This is what `test_builtin::test_input` now stops on. It used to fail
earlier, on `assertRaises(TypeError, input, 42, 42)`; with the arity check
in place (`BuiltinArgValidationTestCase`) it gets as far as the
`del sys.stdout` block and errors there instead — a **fail → error** move
that is the test progressing, not regressing.

Fixing it means making a module attribute genuinely deletable, which is
the accessor/slot design and not local to `sys`.

## OPEN: a registered error handler is never called by a Smalltalk codec

`codecs.register_error('name', handler)` succeeds, and
`'x'.encode('ascii', 'name')` **raises** instead of calling the handler.
Grail's Smalltalk-side encoders and decoders implement the five built-in
policies by name (`strict`, `ignore`, `replace`, `backslashreplace`,
`xmlcharrefreplace`) and treat every other name as `strict`. The
`_codecs.py` paths — charmap and the escape codecs — do dispatch, via
`_call_error_handler`.

This was blocked on the exception not carrying `start` / `end` /
`object`, since a handler receives the exception and nothing else. That
half is now FIXED (`UnicodeErrorArgsTestCase`), so what remains is the
dispatch — and one design point: a handler answers a RESUME POSITION,
and the three encode loops in `str.gs` advance by one code point, so
honouring an arbitrary resume needs the loops reworked rather than a
call inserted. Half-doing it — honouring the replacement but ignoring
the position — would look finished and silently mis-encode.

## OPEN: zlib has no compressobj / decompressobj

Grail's zlib is one-shot: `compress` / `decompress` over libz, with
`compressobj()` and `decompressobj()` raising `NotImplementedError`. So
there is no stream object to hold across calls, and
`encodings/zlib_codec.py`'s incremental pair BUFFERS its input and does
the work on the final call instead — the incremental *contract* holds
(feed any split, get the same bytes) at the cost of holding the input.

A caller that needs constant memory over a large stream wants the real
thing. Nothing in the corpus does today; `TransformCodecsTestCase` pins
the buffering behaviour so a future `compressobj` has something to
replace rather than to discover.

Related and deliberate: `binascii.b2a_qp` / `a2b_qp` are still absent.
`quopri` imports them, falls back to its own pure Python when the import
fails, and works — so adding them would move a working module onto an
untested path. They belong with quopri's own tests.

## OPEN: the rest of PEP 572 (test_named_expressions, 4 remaining)

Four passes are FIXED, each with its own test case:

* PLACEMENT — where `:=` may stand — 21 -> 12, `WalrusPlacementTestCase`,
  which also now covers what it may assign TO;
* inside a DISPLAY — the emit is parenthesised, because a brace array
  holds expressions and Smalltalk's assignment is a statement — 12 -> 8,
  `WalrusInDisplayTestCase`;
* inside a LAMBDA — a lambda is a scope, and its body is not a namedexpr
  position — 8 -> 6, `WalrusInLambdaTestCase`;
* inside a GENERATOR EXPRESSION — where the bug was the genexp, not the
  walrus — 6 -> 4, `GenexpLazinessTestCase`.

The last of those was not about the walrus at all. `scope_03` and
`scope_in_genexp` read as a comprehension-scope bug — which is what this
entry used to call them — and were eager generator expressions: the
binding went to the right place, it just happened for every element at
construction instead of one at a time.

What is left is two things:

* **Private-name mangling of a walrus target in a comprehension**, in a
  method of a class — `scope_mangled_names`, the one of the three that
  really is about names rather than laziness.

* **Two message shapes**: `invalid_16` wants CPython's wording rather than
  Grail's parser text, and `invalid_17` the "did you forget parentheses
  around the comprehension target?" hint.

Two smaller things, both found by probing rather than by a test, both
recorded so the next pass does not rediscover them:

* **A lambda in a CLASS BODY gets no receiver binding.** Nothing to do
  with the walrus — `class C: m = lambda self: 5` then `C().m()` raises
  `TypeError: <lambda>() missing 1 required positional argument: 'self'`.
  CPython treats the lambda as a plain function, so the descriptor
  protocol binds the instance. `tests/python/walrus_in_lambda.py` says why
  its class-body check calls the lambda where it stands instead.

* **Two lambda refusal messages read `cannot use assignment expressions
  with lambda` where CPython says `invalid syntax`**: `x = lambda: y := 1`
  and `f(lambda: x := 1)`. CPython's PEG backtracks out of the body to
  blame the enclosing rule; Grail's recursive descent has committed by
  then, so the body reports it. Catchable `SyntaxError` either way, and
  right in the two spellings `test_named_expressions` pins.

## OPEN: a method with no positional slot for the receiver, and arity counts

Two members of the argument-binding family found by sweeping it after the
`*args` receiver fix (2026-08-31). The third, a carried-over self name
colliding with the def's own keyword-only/`*vararg`/`**kwarg`, is FIXED —
see `SelfNameCollisionTestCase`.

* **A `**kwargs`-only or keyword-only-only method should refuse the call.**

  ```python
  class C:
      def kwargs_only(**kw): return kw
      def kwonly_only(*, a=1): return a
  C().kwargs_only(x=1)   # CPython TypeError: takes 0 positional arguments but 1 was given
                         # Grail {'x': 1} — receiver silently dropped
  C().kwonly_only(a=2)   # CPython TypeError (same shape);  Grail 2
  ```

  There is no positional parameter for the receiver to bind to, so CPython
  rejects the call outright. Grail drops the receiver and proceeds. Related:
  such a method cannot be reached through the CLASS either — `C.kwargs_only(x=1)`
  raises a Smalltalk `LookupError` rather than CPython's `{'x': 1}`.

* **A method's arity messages count without the receiver.**

  ```python
  class C:
      def posonly(a, /, b): ...
      def default_only(a=5): ...
  C().posonly(1, 2)      # CPython "takes 2 positional arguments but 3 were given"
                         # Grail   "takes 1 positional argument but 2 were given"
  C().default_only(9)    # CPython "takes from 0 to 1";  Grail "takes from 0 to 0"
  ```

  Grail strips the first declared parameter as the receiver and counts what
  is left, so both numbers are one lower than CPython's. Self-consistent,
  and no corpus test currently turns on it, but every method arity message
  in the corpus would move if this changed — so it wants its own change and
  its own tier-2 run rather than riding along with a fix.

## FIXED: a class-body `def m(*args)` with no named self drops the receiver

```python
class C:
    def m(*args, **kw): return args
C().m(1, 2)     # CPython (<C object>, 1, 2);  Grail (1, 2)
```

CPython binds the receiver as `args[0]` when a method declares no named
self; Grail compiles the class-body def instance-side, binds the receiver
to `self`, and starts `*args` after it. `def m(self, *args)` is correct —
only the no-named-self spelling loses it.

**Fixed (2026-08-28.)** One guard — `allParameterNames isEmpty` — in
`FunctionDefAst>>generateMethodSourceOn:`, which prepends the receiver to
the *args tuple when the def declared no parameter to strip. The scope
falls out of which generator ClassDefAst picks: class-side methods share
this one and want the same thing (CPython gives `@classmethod def
m(*args)` the class as `args[0]`, and a class-side Smalltalk receiver IS
the class), while `@staticmethod` is compiled with
`generateModuleMethodSourceOn:` and correctly gets none. This took
`test_genericclass` 8 -> 7 (`test_class_getitem`).

## OPEN: the rest of PEP 560 (test_genericclass, 3 remaining)

`__bases__`/`__mro__` tuples, sole-base `__orig_bases__`, the varargs
receiver binding, the runtime-assigned descriptor reads, both
`__class_getitem__` precedence bugs, and `type()`'s refusal to resolve
MRO entries are all FIXED (2026-08-28, 10 -> 3). What is left, diagnosed:
* **`test_mro_entry`** — the inherited-hook lookup now FINDS the hook (it
  used to report `cannot subclass a non-class base`), and then the hook's
  body cannot reach its enclosing-scope free variable: the method belongs
  to the secondary base `C` but is performed against a `D` instance, and
  the class-cell lookup resolves against `D`. Cross-class non-virtual
  performs and closure cells do not compose here.
* **`test_mro_entry_with_builtins` / `_2`** — an MRO containing a builtin
  base leaks Smalltalk ancestry: `(D, A, dict, dict, AbstractDictionary,
  Collection, object)` where CPython has `(D, A, dict, object)`. The same
  leak shows up directly as `list.__mro__` being
  `(list, SequenceableCollection, Collection, object)`, so it is not
  specific to the substitution path.

  **This one is a design decision, not an oversight.** `importlib class >>
  ___withoutImplementationRoots___:for:` hides exactly two universal roots
  (`PythonInstance`, `AbstractPropertyDescriptor`) and says why the rest
  are kept: `Number`/`Magnitude` above `int`, `CharacterCollection` above
  `str`, `AbstractDictionary`/`Collection` above `dict` all sit above
  classes Python also has, so hiding them means deciding **per builtin
  where the Python type ends** rather than deleting one universal root.
  Doing that is its own change with corpus-wide reach — every `int`,
  `str`, `Exception` and collection MRO moves — and wants its own tier-2
  run, so it was deliberately not folded into the `__class_getitem__`
  work.

## FIXED: a classmethod/staticmethod ASSIGNED at runtime is not bound on read

```python
class A: pass
def f(cls, item): return (cls.__name__, item)
A.m = classmethod(f)
A.m(5)      # CPython ('A', 5);  Grail TypeError: 'classmethod' object is not callable
```

**Fixed (2026-08-28.)** A runtime store lands in one of TWO homes and only
one of them resolved descriptors: `___classChainAttrLookup___` asks a value
in the per-class `___dynInstVars___` holder for `__get__`, while the
identical store landing in the canonical-class OVERLAY was returned raw by
`___pyAttrLoad___`. The overlay branch now applies the same
`___classDescriptorGet___:`, so both homes behave alike (staticmethod
unwraps to its function and property answers itself, as CPython's
`__get__(None, cls)` does). The instance read was always correct, which is
what kept this to the class-side spelling.

Found via `test_genericclass.test_class_getitem_patched`, which assigns
`cls.__class_getitem__ = classmethod(...)` from inside `__init_subclass__`.
That test needed a second fix one layer up: `Metaclass3>>__getitem__:` was
calling the (now bound) attribute with `{ self. index }`, supplying the
class a second time. CPython reads `__class_getitem__` off the class
through the descriptor protocol and calls it with the INDEX ALONE — probed
across all four shapes a runtime assignment can take (classmethod bound;
staticmethod unwrapped; a one-parameter function; a two-parameter plain
function, which is CPython's own TypeError since nothing binds a bare
function read off a class). Branch (1) of that method keeps its
two-argument call, because it unwraps the wrapper by hand and nothing has
bound the class at that point. `test_class_getitem_patched` now passes.

Independent of the descriptor gap, the DECLARED spellings work:
`@classmethod def __class_getitem__` and a plain
`def __class_getitem__(cls, item)` in a class body both bind correctly.

## OPEN: metaclass class-keyword plumbing, and type.__new__ keyword rejection

Found while taking `test_subclassinit` from 9 failures to 3 (the
`__init_subclass__` / `__set_name__` half is FIXED, 2026-08-28). What is
left is one cluster plus one unrelated test, diagnosed but not fixed:

* **A metaclass `__new__` that declares a class keyword as a named
  parameter breaks.** `class C(metaclass=M, otherarg=1)` where M is
  `def __new__(cls, name, bases, namespace, otherarg)` raises
  `type.__new__() argument 3 must be dict, not SmallInteger` — and the
  raise happens BEFORE M's body runs (a trace appended from inside
  `__new__` never fires), so the mis-binding is in the dispatch, not in
  the delegation up to `type.__new__`. `object>>___grailDispatchMetaclass___`
  passes `{meta. clsName. clsBases. ns} kw: hdrKw`, which is the right
  shape, so the fault is downstream of that call — most likely in how the
  `__new__` BoundMethod picks a selector when a 5-parameter def is called
  with 4 positional + 1 keyword. The `**kwargs`-carrying metaclass, which
  is how nearly every real metaclass is written, is unaffected.
* **`type.__new__` accepts keyword arguments where CPython refuses them.**
  `super().__new__(cls, name=name, bases=bases, dict=namespace)` should be
  `TypeError: type.__new__() takes exactly 3 arguments`; Grail builds the
  class. (`type(name=..., bases=..., dict={})` DOES raise, with different
  wording — that one is fine.)
* **`types.new_class(..., dict(metaclass=M, otherarg=1))` does not raise**
  where CPython reports the unconsumed keyword. `new_class` now performs
  PEP 560 base resolution (2026-08-31), but still ignores `kwds`
  entirely — `prepare_class` remains a stub returning `(type, {}, kwds)`,
  so neither `metaclass=` nor a class keyword reaches the build.

Those three are `test_errors` and `test_errors_changed_pep487`.

* **`__init_subclass__` is not resolved along the full MRO.** The
  cooperative chain walks Smalltalk superclass links, so a diamond whose
  hook lives on a SECONDARY base is skipped:
  `class A(Left, Middle, Right, middle="middle")` never reaches Middle's
  hook and the leftover keyword reaches `object.__init_subclass__`, which
  rejects it (`test_init_subclass_diamond`). `___grailInitSubclassRoots___`
  already exists for the mixin case; making the whole cooperative
  `super()` chain MRO-ordered is the real fix and is a larger job.

Noticed in passing, unrelated to the above: a class attribute SET AT
RUNTIME (including by `__init_subclass__`) is not visible through the
class's `__dict__` view — `Sub.__dict__.get('initialized')` is None where
the attribute reads fine as `Sub.initialized`. Runtime class attributes
live in `___dynInstVars___`; the `__dict__` view does not surface them.

## DECIDED: builtins rebinding is store-side; per-module shadowing and live doit globals are not emulated

Grail's dispatch model compiles `len(x)` to a direct Smalltalk send on the
builtins singleton (docs/LEGB.md, docs/Rewrite_Dispatch_Model.md) — chosen
for speed, and the reason three flavors of runtime dynamism behave
differently (test.test_dynamic):

* **`builtins.len = fake` WORKS** (2026-08-28): the store on the builtins
  module compiles session-method forwarders for the name's selector shapes,
  each reading the dynamic slot at call time; storing the original back (how
  `test.support.swap_attr` restores — the value is the BoundMethod the read
  cached) recompiles the captured originals. First-class reads route through
  `___globalAt___:otherwise:`, which also gave builtins stable identity.
  The cost lands entirely on the rare rebinder; ordinary calls stay direct
  sends. eval/exec with caller-provided globals that CONTAIN a builtin name
  also works — the seeded key shadows at compile time
  (`___pythonBindingShadows___:`'s doit clause).

* **`globals()['len'] = fake` per module does NOT**: honoring it would put a
  guard in front of every compiled builtin call — a permanent tax on the
  hottest path — for an idiom the corpus uses once. Decided against
  (2026-08-28). test_globals_shadow_builtins stays red.

* **A dict-SUBCLASS as eval/exec globals is a snapshot, not a live mapping**:
  the doit seeds the provided dict's keys at compile time, so a `__missing__`
  that synthesizes values on lookup is never consulted
  (test_load_global_specialization_failure_keeps_oparg). A design seam of the
  doit machinery, not a platform impossibility.

`sys.settrace` (TestTracing) is a separate, genuine platform gap: compiled
Smalltalk methods have no per-line/per-call tracing hooks.

## PLATFORM GAP: no CPython bytecode, so `dis`/`co_consts` introspection has nothing to see

Grail compiles Python to GemStone Smalltalk methods; there is no CPython
bytecode, no `co_consts` beyond metadata, and nothing for `dis` to
disassemble. Tests that assert properties OF THE BYTECODE — optimizer
behavior, opcode sequences, folded constants — are permanently out of scope,
as distinct from tests of what the code *does*, which Grail runs.

Known member: `test_positional_only_arg.test_annotations_constant_fold`
(asserts the compiler folded `not (int is int)` into `IS_OP(1)` by
disassembling `g.__code__.co_consts`). It is the module's ONLY remaining
failure; the other 27 tests pass.

## FIXED: an attribute decorator with a method-local base silently failed to apply

The narrow shape, measured precisely (2026-08-27):

```python
class Host:
    def build(self):
        import types                      # method-LOCAL name
        class C:
            @types.coroutine              # attribute read off that local
            def __anext__(self): ...
```

The decorator expression is evaluated against the wrong ``types`` -- the
class-dict entry behaves as the RAW function, and the decorator's effect
(wrapping, marking, anything) vanishes without an error.  Every neighbouring
shape works, which is what makes it easy to mistrust the diagnosis, so the
probe matrix is worth keeping:

* bare-name decorator, module global -- applies (all nestings)
* bare-name decorator from a LOCAL ``from types import coroutine`` -- applies
* attribute decorator off a module-GLOBAL base (``@TYPES.coroutine``) -- applies
* attribute decorator off an instance attribute (``@ns.tag``) -- applies
* a class body inside a method READING a method local (``captured = lv``) -- works
* attribute decorator off a method-LOCAL base, def inside a method-nested
  class body -- **silently dropped**

The suspected mechanism: the class-body def's decorator emission resolves the
base NameAst in a context that misses the enclosing method's temp, falling
back to the Python symbol dictionary -- where ``types`` is the module CLASS,
whose class-side attribute read answers something callable enough not to
crash and inert enough to change nothing.

RESOLVED (2026-08-27), and the mechanism was exactly where the suspicion
pointed, twice over.  The method-decorator chain
(FunctionDefAst >> printMethodDecoratorsOn:...) emits INLINE in whatever
scope emits the classdef -- where the enclosing method's temp is reachable
as a bare identifier -- but it never claimed ``inDecoratorEmit``, the flag
CLASS decorators raise and whose exclusion
NameAst >> ___readsThroughClassCell___ documents.  So the base NameAst
emitted the METHOD-BODY closure-cell form, ``self ___classCell___: ...'',
which was wrong twice at that position: the cell store is emitted AFTER the
decorator loop, and ``self'' there is the ENCLOSING receiver, not the class
holding the cells.  The read raised, the application handler swallowed it
as designed, and the decorator silently never applied.  One save/set/restore
of the flag around the chain fixes every shape in the probe matrix;
``test_python_async_iterator_types_coroutine_anext`` passes.  The matrix is
kept above because the diagnosis needed all six rows -- five working
neighbours made the sixth look impossible.

## FIXED: a `@property` on a subclass of a built-in answered the BoundMethod

Recorded here as OPEN while the kaggle acceptance harness was blocked on it;
fixed by `fix/property-on-builtin-subclass`. Kept because the SHAPE OF THE
MEASUREMENT is the reusable part: the defect looked tuple-specific and was not.

```python
class T(tuple):
    @property
    def first(self):
        return self[0]

T((7, 8)).first          # CPython: 7      Grail was: <BoundMethod object ...>
```

WHAT IT ACTUALLY WAS. `Object >> ___pyAttrLoad___:` reads a unary getter
paired with a same-named 1-arg setter as a value attribute and PERFORMS the
getter -- which is how a `@property` resolves, since ClassDefAst compiles the
decorated def as an ordinary getter and synthesizes the `name:` half beside
it. That pair-read was gated on the RECEIVER KIND: `PythonInstance`,
`AbstractPyInt`, or an enum member over `CharacterCollection`/float/str. A
class rooted at any other built-in matched none of the three, so the getter
was never performed.

Sweeping the roots is what turned "a tuple quirk" into one sentence: `tuple`,
`list`, `str`, `dict`, `set`, `bytes`, `float` and `Exception` subclasses were
ALL affected; `int` subclasses and plain classes were not -- exactly the set
the receiver-kind tests happen to name. Three earlier passes set this aside as
"pre-existing, unrelated" on the tuple spelling alone.

The gate now asks the SHAPE question instead (`___grailPyDefinedAccessorPair___:
setter:`): both halves declared on ONE class, and that class carrying
ClassDefAst's `___pyDefinedClass___` marker. The marker half is load-bearing --
Grail spells str/list/bytes methods as env-1 Smalltalk methods and several
exist in both spellings on one class (`strip`/`strip:`, `split`/`split:`,
`pop`/`pop:`, `decode`/`decode:`), so without it `s.strip` answers the
STRIPPED STRING where CPython answers a bound method.

`___pyInstanceDescriptorDelete___:` carried the same `isKindOf: PythonInstance`
gate and is fixed with it: `del obj.prop` on a built-in subclass raised
AttributeError where CPython runs the deleter. (`@x.setter` already reached a
built-in subclass; only the deleter did not.)

STILL OPEN, and unchanged: the attribute STORE path does not consult a data
descriptor's `__set__` in general, and a pair whose getter and setter are
declared on DIFFERENT classes (`@Base.p.getter` in a subclass) is still not
read as a pair -- see `___unaryGetterShadowedBySetter___:setter:` for why that
needs property provenance Grail does not record.


## OPEN: two parameter-default shapes still resolve a class-body name as a global

Found while fixing keyword-only defaults (the branch that added
`emitDefTimeDefaultFor:node:on:`). Both predate that change, both affect
POSITIONAL and KEYWORD-ONLY defaults IDENTICALLY, and both are on the same
mechanism: a class-body method's default is evaluated once in the class body
and stashed on the class (`ClassDefAst >> emitMethodDefaultStoresOn:`), and
these two shapes never reach that store.

**1. `@staticmethod`.** Deliberately excluded, and the exclusion is the whole
of the defect: the read is `self ___grailClassDefault___: #key`, and a
staticmethod's body has no receiver to walk outward from, so it keeps the
inline expression -- which resolves in module scope.

```python
class C:
    e = 1
    @staticmethod
    def s(k=e): return k        # CPython: 1   Grail: NameError: name 'e'
    @staticmethod
    def t(*, k=e): return k     # same, after a bare *
```

The same exclusion also leaves a staticmethod's MUTABLE default recreated per
call (`C.s(acc=[])` answers a fresh list each time). Fixing it needs a receiver
the compiled method can name -- the class is not in scope inside its own
method source, which is exactly why `___grailClassDefault___:` is sent to
`self`.

**2. A comprehension in the default expression.** The store's expression
compiles in class-body scope, and there the comprehension's OWN loop variable
does not resolve:

```python
class C:
    lst = [1, 2, 3]
    def m(self, k=[x * 2 for x in lst]): return k
    # CPython: [2, 4, 6]   Grail: NameError: name 'x' is not defined
```

The emitted store declares `x` as a block temp and then READS it as
`__main__ ___instance___ ___moduleAttrLoad___: #'x'`. A comprehension in a
plain class-body assignment (`doubled = [x * 2 for x in lst]`) is fine, and so
is one in a MODULE-level def's default, so the trigger is specifically
`inClassBodyValueEmit` being true while the NameAst's enclosing-function walk
runs into the `FunctionDefAst` whose arguments hold the comprehension. It is a
NameAst scope-resolution question, not a defaults one.

## FIXED: a KEYWORD-ONLY parameter's default could not see a class-body name

```python
class E:
    e = 5
    def m(self, *, kw=e): return kw
E().m()                       # was: NameError: name 'e' is not defined
```

The two generators that compile a def into a Smalltalk *method* (module-level
function, class-body method) emitted keyword-only defaults INLINE IN THE METHOD
BODY -- neither the def's enclosing scope nor def time.  So a free name resolved
as a module global, and the expression re-ran on every call: a mutable default
was recreated per call and a side-effecting one fired per call.  Positional
defaults in the same generators already went through a module memo / class side
table; the keyword-only half was a fourth path nobody routed through it.

Both bindings now emit through one method, `emitDefTimeDefaultFor:node:on:`,
with positional output byte-identical -- sharing the path is the point, since
two copies agreeing is exactly what failed.  `@staticmethod` keeps its inline
default, as positional does (see the OPEN entry above).  The closure/nested-def
generator is untouched.


## RESOLVED: the Kaggle acceptance harness scores 7/7

An unmodified pip-installed `kaggle` 1.6.17 -- CRLF source and all -- now
imports, authenticates, makes a real HTTP round trip against a local API
stand-in, deserialises JSON into models, downloads a zip, extracts it, and the
extracted bytes match on both members.  **7/7, matching the CPython 3.14.6
baseline**, measured on `main` with no open branches and no stubs.

The harness lives outside the repo (a mock server plus a driver script) and
needs no Kaggle account -- it drives the real client against a local endpoint
using only `KAGGLE_USERNAME` / `KAGGLE_KEY` / `KAGGLE_API_ENDPOINT`.

HOW IT WAS DONE, because the method generalised.  The blockers hid one another:
each fix revealed the next, which serialises the work.  A reconnaissance pass
(branch `recon/kaggle-blockers`, do not merge) instead walked the harness
forward STUBBING PAST each blocker in turn until it reached 7/7 under stubs,
then reverted every stub, reinstalled clean, and re-ran each minimal repro
alone to prove the six were INDEPENDENT.  That converted six sequential fixes
into six concurrent ones.  Each stub was marked SOUND or CRUDE, so findings
made past a crude stub were known to be provisional -- `os.utime`'s no-op was
the one crude stub, and it mattered: nothing in the harness reads an mtime
back, so 7/7 under it proved nothing about `os.utime` itself.

The six, all now fixed and each with its own entry above or below:

* `@property` on a subclass of a built-in answered the BoundMethod.
* A class-body name in a keyword-only parameter default.
* `http.client.HTTPConnection.__init__` missing `source_address`/`blocksize`.
* `sys.audit()` was zero-arg where CPython takes `(event, *args)`.
* `HTTPMessage` was not an `email.message.Message`.
* `isinstance(x, typing.Mapping)` raised `TypeError`.
* Subscripting a `float`/`bool`/`object` raised an uncatchable Smalltalk MNU.
* `os.utime` did not exist.

A note for whoever adds the next entry: this file has now caused merge
conflicts in FIVE consecutive pull requests, because every concurrent branch
appends a findings section and git cannot tell two appends apart.  Append a new
`##` section at the END and do not edit existing ones.  A marker-stripping
"keep both sides" resolution silently dropped five tests once -- verify a
resolution by checking that every heading from BOTH merge stages survives, not
by checking for duplicates.

## OPEN: settimeout() makes the socket OS-blocking and starves green threads

`socket.settimeout(...)` does more than record a timeout: `PyRawSocket>>
settimeout:` sends `GsSocket>>makeBlocking` (or `makeNonBlocking` for 0), which
changes the blocking mode AT THE OS LEVEL. Grail's threads are GREEN, so a
socket that really blocks never yields, and a loopback server running on
another thread never gets to accept. The request does not fail -- it hangs
forever.

Measured, on a green-thread loopback server (this is
`tests/python/use_http_client.py`'s `green_thread_server_roundtrip`, and it is
what `tests/python/twilio_client.py` has been relying on all along):

```python
s = socket.socket(); s.connect(addr)                 # completes
s = socket.socket(); s.settimeout(None); s.connect(addr)   # HANGS on read
socket.create_connection(addr, socket._GLOBAL_DEFAULT_TIMEOUT, None)  # completes
socket.create_connection(addr, None, None)           # HANGS on read
```

`settimeout(None)` is the surprising one: it is a state NO-OP on a freshly
created socket (`PyRawSocket>>initialize` already sets `timeoutSecs` from
`___defaultTimeout___`, which is nil unless `setdefaulttimeout` was called), so
the only thing it does is send `makeBlocking`. That is enough to hang.

HOW IT SURFACED. Routing `http.client.HTTPConnection.connect` through
`socket.create_connection` -- which is what makes `source_address` bind --
introduced the `settimeout(None)` call, because CPython's `create_connection`
makes it for an explicit `timeout=None` and that is what `requests` and
`urllib.request` pass. The whole SUnit shard holding `TwilioClientTestCase`
then never finished. It presents as a shard that produces no result at all,
not as a red test.

WORKED AROUND, NOT FIXED. `http.client.connect` now skips the call when the end
state is already blocking, and says so at the site. The defect is untouched:
`settimeout(30)` still sends `makeBlocking` and still starves green threads, so
any client that sets a real timeout and expects a same-process threaded server
to answer will hang. Fixing it properly means making the timeout/blocking
emulation cooperative in `PyRawSocket` rather than flipping the OS socket --
i.e. keeping the GsSocket non-blocking always and enforcing the deadline in the
poll loop -- which is a socket-layer change with its own tests to write.

## FIXED: `http.client.HTTPMessage` was not an `email.message.Message`

CPython's is `class HTTPMessage(email.message.Message)`, and consumers check
the ANCESTRY, not just the mapping surface.  `urllib3/util/response.py`'s
`assert_header_parsing` -- called on every response urllib3 reads -- opens with

```python
if not isinstance(headers, httplib.HTTPMessage):
    raise TypeError(f"expected httplib.Message, got {type(headers)}.")
```

and then reaches for `headers.is_multipart()`, `headers.get_payload()` and
`headers.defects`.  Grail's `HTTPMessage` was a stand-alone shim in
`src/python/stdlib/http/client.py` with a hand-copied mapping surface, so the
`isinstance` answered **false** and none of those three attributes existed.
Measured on the pre-fix build:

```
isinstance(msg, email.message.Message) : False
HTTPMessage has is_multipart           : False
HTTPMessage has get_payload            : False
HTTPMessage has defects                : False
http.client has parse_headers          : False
```

### Why route 1 (the real subclass) was reachable

The decision hinged on what `email` Grail actually has, and it turned out to be
enough.  `src/python/stdlib/email/message.py` is a hand-written `Message` --
about 300 lines, deviations listed in its own header -- and, decisively, it
imports NOTHING at module level (one lazy `import base64` inside
`get_payload`).  So subclassing it costs http.client no new dependency tree.
Its storage is already a list of `(name, value)` pairs, the same shape the shim
kept.  `email.errors` is a straight CPython drop and imports fine here despite
`MultipartConversionError(MessageError, TypeError)` being multiple-inheritance.

The vendoring trap did not bite because nothing had to be vendored: probing the
imported module's flattened class name showed `email_message`, i.e. the file on
disk, not a Smalltalk-implemented module pre-seeded into `sys.modules`.

Two CPython behaviours `Message` was missing had to be added first --
`__init__` now sets `defects = []`, and `__iter__` yields the header names
(without it, `for k in msg` fell through to integer `__getitem__` and raised).

### `parse_headers` came with it

`http.client.parse_headers(fp, _class=HTTPMessage)` is public in CPython and
was absent entirely.  It is now present, split CPython-style into
`_read_headers(fp)` (raw lines, `LineTooLong` / `_MAX_HEADERS` bounds) and
`_parse_header_lines()`, and `HTTPResponse._read_headers` delegates to it so
the response path and the public entry point cannot drift apart.

The parse follows email's compat32 policy rather than the old ad-hoc one, which
changed three things:

* header names are no longer `.strip()`ed (CPython keeps them verbatim);
* an obs-fold keeps its embedded CRLF -- `'one\r\n  two'`, not `'one two'`;
* the two defects `assert_header_parsing` was written to detect are recorded:
  `MissingHeaderBodySeparatorDefect` (the offending line and everything after
  it, terminating blank line included, becomes the payload) and
  `FirstHeaderLineIsContinuationDefect` (the line is dropped, parsing carries
  on).

Grail's own `email.parser` is deliberately NOT used: it takes no `_class=` and
records no defects.

### What is NOT implemented

RFC 2047 encoded-word decoding, Unix-From lines, and any policy other than
compat32.  `getallmatchingheaders` is ported WITH CPython's long-standing quirk
intact -- it compares against `name + ':'` while `keys()` yields bare names, so
it always answers `[]`.

### Ancestry is now correct

`isinstance(msg, email.message.Message)` answers **true**, on a fresh
`HTTPMessage()`, on `parse_headers()` output, and on a live response's
`.headers` over the loopback server.  The real pip-installed urllib3 2.7.0's
`assert_header_parsing` produces byte-identical results under Grail and CPython
3.14.6, both for a clean header block and for a malformed one:

```
HeaderParsingError: [MissingHeaderBodySeparatorDefect()], unparsed data: 'BADLINE\r\n\r\n'
```

`tests/python/use_http_client.py` grew 56 checks and a `__main__` block, so it
now opts in to `scripts/check_python_fixtures.sh` and every expectation is
re-measured against CPython on each gate run.  `_NotAMessage` in that fixture
is the negative control: it answers the old shim's whole surface and must still
fail both ancestry checks.

### It does NOT move the Kaggle harness

Measured, not assumed.  With PR #741 merged into a throwaway branch, the
harness scores **2/3 both with and without this change**, stopping in the same
place: `sys.audit("http.client.connect", self, self.host, self.port)` at
`urllib3/connection.py:223`, where Grail's `sys.audit` answers
`TypeError: audit() takes a different number of arguments (4 given)`.  That is
a different blocker and a different lane.  The response path this change fixes
sits BEYOND that call, so a live proof had to be taken directly: an
`http.client` GET against the mock server, with `assert_header_parsing` run on
the result, passes under Grail and CPython alike.

## os.utime exists now, and two vendored modules still say it does not

`os.utime` is implemented (PR "os.utime really sets the times"): it runs
`touch(1)` through the same `___shellQuote___:` / `___runShell___:` pair
`os.symlink` uses, because GemStone exposes no `utimes(2)`. What a caller can
rely on, and what it cannot:

* the times are REALLY SET, to WHOLE SECONDS. `___applyUtime___` re-stats the
  file afterwards and raises if the values did not take, so a caller does not
  have to distinguish "returned None" from "worked" -- which is exactly the
  distinction an earlier no-op stub erased;
* `os.stat` here already answers an int `st_mtime` where CPython answers a
  float, and `os.utime` floors to match. A round trip agrees with CPython on
  `math.floor(st_mtime)` and NOT on `st_mtime` itself. `ns=` is accepted and
  floored by the same rule rather than rejected;
* `follow_symlinks=False` works (`touch -h`). `dir_fd` raises
  NotImplementedError rather than being accepted and ignored: CPython honours
  it on Linux and macOS, so ignoring it would stamp the WRONG FILE;
* DEVIATION: a failure to apply the times -- usually no write permission, which
  CPython reports as `PermissionError` -- surfaces as a plain `OSError`.
  `System>>performOnServer:` hands back no exit status, so the cases cannot be
  told apart. `except OSError` catches both spellings; `except PermissionError`
  would not.

`os.utime` is deliberately NOT added to `os.supports_follow_symlinks`, even
though it now honours the argument. Membership in those sets is tested by
OBJECT IDENTITY (`os.utime in os.supports_follow_symlinks`), and an attribute
load of a module method here builds a fresh BoundMethod each time, so the set
could only ever answer false. An empty set remains the honest answer.

NOT DONE, and worth doing separately:

* `shutil.copystat` is still a no-op, and its docstring now says why: there is
  no `os.chmod`, so a copystat built on `os.utime` alone would move the
  timestamps and silently drop the mode. Every caller in the tree is written
  against "copies nothing", so changing `copy2` is a corpus-wide behaviour
  change that wants its own measurement, not a rider on this one.
* `tarfile.extract()` likewise still does not restore mtime. It could now, and
  the same argument applies -- restoring times but not mode is a partial answer
  whose blast radius is every archive extraction in the tree.

Also noticed while measuring the Kaggle acceptance harness, and unrelated to
`utime`: under `./grail <script>`, `sys.argv` is the WHOLE topaz command line,
not CPython's `[script, *args]`. Measured:

```
['topaz', '-lq', '-S', 'scripts/grail.tpz', '-T', '400000', '-C',
 'GEM_TEMPOBJ_CODE_SIZE=300000;', '--', '/path/to/script.py']
```

So `sys.argv[0]` is `'topaz'` rather than the script, and `sys.argv[1]` is the
flag `-lq` rather than the first argument. A script that reads `sys.argv[1]` as
a destination directory writes into a directory literally named `-lq` in the
current checkout -- which is how this was found. The fix belongs in
`scripts/grail.tpz`, which should slice at the `--`; nothing in the tree
depends on the current shape.


## `sys.audit()` accepts its arguments and DISCARDS them

FIXED, with one thing a caller must not conclude from it.

`sys.audit` was a ZERO-ARGUMENT stub (`src/smalltalk/Python/sys.gs`) against a
variadic CPython signature, so every real call was

    TypeError: audit() takes a different number of arguments (4 given)

urllib3's `HTTPConnection._new_conn` opens with exactly such a call --
`sys.audit('http.client.connect', self, self.host, self.port)` -- which is why
this stopped the Kaggle acceptance harness dead at its first network call.

It is now `_audit:kw:`, the module's varargs convention, and it accepts the
event and throws it away.

**What that establishes: events are accepted and discarded.  What it does NOT
establish: that auditing works.** Grail raises no audit events of its own and
dispatches none of the ones it is handed. Nothing can observe that an event was
raised -- not a hook, not a log, not a counter.

That is not an approximation of CPython, though. It is CPython's exact
behaviour when the audit-hook list is empty, and the list here can never be
anything else, because `sys.addaudithook()` now REFUSES to install one:

    RuntimeError: sys.addaudithook() is not supported: Grail raises no audit
    events, so a hook installed here would never be called

Refusing is the half that makes the no-op honest. Accepting a hook and never
calling it would report that auditing is on when it is off, which is the one
answer worse than an error -- and the call failed before this anyway, on arity,
so nothing that worked stops working. Building real audit-event dispatch is a
separate piece of work and nobody has asked for it.

One divergence remains, in the corner CPython reaches for a programming error.
`sys.audit()` with NO arguments answers the bound method instead of raising
`TypeError: audit expected at least 1 argument, got 0`. Grail cannot tell a
zero-argument call from an attribute read -- both are a unary send -- and the
attribute read is the spelling real code uses (`_audit = sys.audit`, or
`getattr(sys, 'audit', None)` in a library that must also run on a pre-3.8
interpreter), so the name is stored in the module dict as a `BoundMethod`, the
same device `breakpointhook` uses. Every other misuse is refused exactly as
CPython refuses it: a non-str event, and any keyword argument.

Tests: `SysTestCase` (9), driving `tests/python/sys_audit.py`, whose checks are
measured against CPython 3.14.6 by `scripts/check_python_fixtures.sh`. The
`addaudithook` check is an XFAIL there -- the machine-checked spelling of "we
know CPython disagrees, and here is why".


## `isinstance(x, typing.Mapping)` -- an ABC alias is a type-check target too

FIXED, in `src/python/stdlib/typing.py`, with no Smalltalk.

PR #726 gave `_AbcAlias` PEP 560's `__mro_entries__`, which made
`typing.MutableMapping` work as a BASE CLASS. It did not make it work as an
ISINSTANCE TARGET, and urllib3's `HTTPHeaderDict` is one line of each:

    class HTTPHeaderDict(typing.MutableMapping[str, str]):   # PR #726
        def extend(self, *args, **kwargs):
            if isinstance(val, typing.Mapping):              # this

so the class built and its method raised `TypeError: isinstance() arg 2 must be
a type, a tuple of types, or a union` -- the same objection `__mro_entries__`
answers for the base-class use, an instance is not a type.

The fix is the answer `typing.List` already gives: DELEGATE. `_AbcAlias` now
defines `__instancecheck__` / `__subclasscheck__` that ask the
`collections.abc` class the name stands for, so the alias and its origin cannot
drift apart -- verified as a whole-surface sweep against `collections.abc`
rather than name by name. No Smalltalk was needed because
`object >> ___nonClassCheckHook___:` (PR #392's sibling, added with
`_SpecialGenericAlias`) already routes a non-class second argument to its own
class's hook; this is the second caller of a path that existed.

Subscripting had to change with it. `_StubGeneric.__getitem__` answers `self`,
which was harmless while the alias answered no type check at all; once it does,
`typing.Mapping[str, str]` would inherit an answer CPython refuses to give.
`_AbcSubscriptedAlias` is that refusal --

    TypeError: Subscripted generics cannot be used with class and instance
    checks

-- and forwards `__mro_entries__`, `__call__` and `repr` to the bare alias, so
`class HTTPHeaderDict(typing.MutableMapping[str, str])` still works and the
origin is still resolved lazily. Grail refused the subscripted spelling before
too, but only by accident (it was not a type either); the refusal is now
deliberate, and says CPython's words.

Tests: `TypingGenericAliasTestCase` (7 new), driving
`tests/python/typing_generic_aliases.py`. One of them is a negative control: a
hook that answered True unconditionally passes every acceptance check and is
worthless, so `the_delegation_can_answer_false` pins the cases where the origin
says no -- `isinstance({}, typing.Sequence)` is False, which is exactly the
distinction `extend()` branches on.

## Subscripting a non-subscriptable object: FIXED, and what is still divergent

`(1.5)[0:2]`, `True[0]`, `object()[0]`, `{1, 2}[0]`, `frozenset()[0]` and
`...[0]` raised a Smalltalk `MessageNotUnderstood` -- an error no Python
`except` can see, so instead of being handled it terminated the process.
CPython raises a catchable `TypeError: 'float' object is not subscriptable`.
Real-world blocker: `kaggle/models/kaggle_models_extended.py:231` does
`string[:26]` inside `try: ... except: pass` and the value it is handed is a
float.

(The "Kaggle acceptance harness" section above still lists this among the open
blockers; it was written before this fix and is left untouched here so the two
edits do not collide again.)

FIXED by making `__getitem__:` a single fallback in
`Object >> doesNotUnderstand:args:envId:`, next to the `__setitem__` /
`__delitem__` / `__contains__` intercepts that were already there, instead of a
fourth per-class copy (`int` in `Int.gs`, `NoneType` in `NoneType.gs`,
`PythonInstance`).  The same change stops these messages naming the SMALLTALK
class behind a built-in (`'SmallDouble' object does not support item
assignment`, `'Unicode7'`, `'Interval'`, `'ByteArray'`, `'PythonGenerator'`):
they derive `type(x).__name__` now.

The full sweep -- `x[0]`, `x[0:2]`, `x[0] = 1`, `del x[0]` over int, float,
bool, complex, None, `object()`, a plain instance, a function, a module, a
class, `type`, set, frozenset, ellipsis, a generator and bytes, plus positive
controls -- went from 46/96 to 81/96 exact string matches against CPython
3.14.6.  What is left, all of it downstream of a DELIBERATE Grail divergence:

1. **A module is subscriptable in Grail** (`module` is a `SymbolDictionary`
   subclass), where CPython answers `'module' object is not subscriptable` for
   every key.  Two shapes are still UNCATCHABLE Smalltalk errors because the
   key never reaches a Python-level guard: `mod[0:2]` is `a slice does not
   understand #'asSymbol'`, and `del mod[0]` is `ArgumentTypeError` 2094
   (`expected a CharacterCollection`) from `removeKey:`.  Not fixed here
   because the honest fix is a decision about whether module subscripting
   should exist at all, not a message change: `importlib` and the class-body
   namespace machinery both index these dictionaries.
2. **A class is subscriptable in Grail** (`Metaclass3 >> __getitem__:` answers
   the class), which `Subscript.gs` documents as load-bearing: `class Foo(list[V])`
   has to compile to `class Foo(list)`.  CPython raises
   `type 'D' is not subscriptable`.
3. **A function is a `BoundMethod`**, which carries a PEP-585 generic-alias
   `__getitem__` (`Callable[..., T]`), so `f[0]` answers `f` where CPython
   raises; and its type name in an item error reads `'BoundMethod'` where
   CPython says `'function'`.
4. Because of 1-3, `del x[0]` on a module, a class or a function takes
   CPython's *sequence* wording (`doesn't support item deletion`) rather than
   `does not`.  `del gen[0]` does the same, because `PythonGenerator` is
   `PythonInstance`-backed and every Python-defined class takes that wording.

Two adjacent defects the sweep turned up that this change does NOT touch:

* **`hasattr(1.5, '__getitem__')` is True** (also for `bool`, `int`, `str`,
  `bytes`, `None`), where CPython says False.  An instance attribute load is
  reaching the CLASS-side `__getitem__:` that `Subscript.gs` installs on
  `Float` / `Boolean` / `Integer` / `CharacterCollection` / `ByteArray` /
  `UndefinedObject` -- a metaclass method answering for an instance.
  Pre-existing; `object()`, `set` and `frozenset`, which have no class-side
  entry, correctly answer False both before and after.
* **`slice` repr prints Smalltalk `nil` for an omitted bound**:
  `{0:'a'}[0:2]` raises `KeyError: slice(0, 2, <UndefinedObject object at
  0x101>)` where CPython prints `slice(0, 2, None)`.  A missing
  `None`-normalisation in slice construction, unrelated to the item protocol.
* **The binary-operator TypeError has the same Smalltalk-name leak** this
  change fixed for the item protocol: `unsupported operand type(s) for *:
  'slice' and 'SmallInteger'` where CPython says `'int'`.  Same one-line
  remedy (`___pyDnuTypeName___`), left out to keep this diff to the item
  protocol.

## A data descriptor's `__set__` is honoured now; the corpus workarounds are still in place

`obj.x = v` where `type(obj).x` defines `__set__` (or `__delete__`) has to call
the descriptor, not write the instance dict. Grail's store path asked the wrong
question: `object >> ___instancePropertyDescriptorFor___:` accepted a class
attribute only if it was `isKindOf: AbstractPropertyDescriptor` -- Grail's own
`property`. A user-written `class D: __get__/__set__` is the same thing to
CPython and was invisible to it, so the store fell through to the instance
dict, `__set__` never ran, and the shadowing entry then won every later read.
Fixed by asking the SHAPE instead (`___isDataDescriptorValue___:`), the same
move `___grailPyDefinedAccessorPair___:setter:` made on the READ path in PR
#739.

Three things worth keeping:

1. **The kind test also hid a missing HOME.** The old finder looked in the
   metaclass accessor pair and the `___dynInstVars___` holder, but not the
   session-local class-attribute overlay -- where a runtime
   `setattr(cls, 'x', descr)` lands when `cls` is canonical. No test could see
   that gap while the kind test rejected every user descriptor anyway. The new
   finder walks all three, overlay first, matching `___pyAttrLoad___`'s
   precedence.

2. **CPython's `tp_descr_set` is ONE slot filled from EITHER dunder.** A
   descriptor with `__delete__` but no `__set__` still *intercepts* a store and
   then raises `AttributeError: __set__`; the mirror holds for `del`. Grail now
   raises both halves. This is easy to get wrong in the direction of "no
   `__set__`, so fall through to the instance dict", which silently
   re-introduces the shadow.

3. **The non-data direction is as load-bearing as the data one.** Only
   `__get__` means the instance store MUST shadow the descriptor --
   `functools.cached_property` is exactly that shape and Grail's
   `___pyAttrLoad___` probes the instance slot first to match. A fix that
   intercepted on `__get__` alone would break every cached property in the
   corpus.

**Workarounds left in place, deliberately.** `collections._tuplegetter` spells
out a `__set__` that raises and then says in its own docstring that what
actually makes a namedtuple field read-only is `_NT.__setattr__`. That is now
belt-and-braces rather than the only mechanism, but `__setattr__` is a user
override compiled from the class body and still fires FIRST, so removing it is
a behaviour change (its message differs) and belongs in its own diff. Other
`__set__`-defining classes the fix newly activates: `flask.config`,
`werkzeug._internal` / `datastructures.range`, and eight in `django.db.models`
/ `django.contrib`.

**Adjacent defect fixed in the same diff.** The read-only setter `ClassDefAst`
synthesizes for a `@property` with no `@x.setter` raised through env-0
`AttributeError signal:` with a partial text, which reached Python as an
`AttributeError` whose `str()` was EMPTY -- so no message assertion could ever
pass. It now raises `___raiseReadOnlyProperty___:`, worded exactly as the call
form is: `property 'x' of 'C' object has no setter`.

**Still divergent, not touched here.** `del obj.x` on a `@property` with no
deleter falls through to the instance-attribute delete and raises
`AttributeError: 'x'` where CPython says `property 'x' of 'C' object has no
deleter`. `___pyInstanceDescriptorDelete___` deliberately does not gate on the
getter+setter pair, because a `@cached_property` has that pairing and its `del`
must drop the cached value; telling the two apart needs a marker the decorator
form does not currently emit.
## `sys.stdout` / `sys.stderr` are `None`, so a stdlib module that writes through them prints nothing

Found while vendoring CPython 3.14.6's `argparse` (PR: argparse constructor).
Not fixed there, deliberately -- see the reason at the end.

`sys.stdout` and `sys.stderr` are both `None` in a Grail session.  That is a
deliberate convention on the `print` side (`builtins >> ___printTarget___`:
"Grail's own sys.stdout is None, which is how an ordinary print still reaches
the Transcript"), and it is invisible for as long as everything writes with
`print`.  It stops being invisible the moment vendored CPython source writes
the way CPython writes -- through the stream object:

* `argparse.ArgumentParser.print_help()` reaches
  `_print_message(text, _sys.stdout)`, whose body is
  `try: file.write(message) except (AttributeError, OSError): pass`.
  `None.write` is an AttributeError, so it is SWALLOWED: `kaggle --help`
  renders its help perfectly and then prints NOTHING, with no error and no
  exit-code change.  So does `parser.error(...)`'s message, which is the more
  dangerous half -- the process still exits 2, with no diagnosis.
* `traceback.print_exc()` fails LOUDLY on the same thing:
  `AttributeError: 'NoneType' object has no attribute 'write'`, from
  `traceback >> _print_exc:kw:`.  A silent one and a loud one from one cause.

The old hand-written argparse subset did not show this because it printed help
with `print()`.  Nothing about the defect is argparse's; every vendored module
that writes to `sys.stdout`/`sys.stderr` is in the same position, and each new
source drop widens it.

WHAT THE FIX LOOKS LIKE, and why it was not done in the argparse PR.  Give
`sys.__stdout__` / `sys.__stderr__` a small stream object whose `write`
forwards to `builtins >> ___consoleWrite___:` -- which already exists, already
handles the GsFile-takes-bytes / ClientForwarder cases, and is where `print`
goes today.  The catch is `___printTarget___`: it reads `sys.stdout` at call
time and treats anything non-nil as a REDIRECT, so making `sys.stdout` an
object silently re-routes EVERY `print` in the corpus through the new object's
`write`.  That is a change whose blast radius is the whole corpus and which
needs its own tier-2 measurement to be attributable; folding it into a PR that
also moves `PythonAst` codegen would have made both results uninterpretable.
The narrow form is to have `___printTarget___` recognise the console stream and
answer nil for it, leaving `print` byte-identical while `sys.stdout` becomes
real.

Meanwhile a caller CAN work around it -- `sys.stdout = open('/dev/stdout', 'w')`
makes `kaggle --help` render, and its output is byte-identical to CPython's.

## FIXED: `sys.stdout` / `sys.stderr` are real streams, and `print` did not move

The previous section's defect, fixed. `sys.stdout`, `sys.stderr`,
`sys.__stdout__` and `sys.__stderr__` are now `PyConsoleStream` instances whose
`write` forwards to `builtins >> ___consoleWrite___:`. `argparse`'s
`print_help()` renders byte-identically to CPython (125 characters for the same
parser, measured both ways), `parser.error(...)` prints its usage + message and
still exits 2, and `traceback.print_exc()` no longer raises.

**How `print` was kept where it was.** `___printTarget___` reads `sys.stdout` at
call time and treats any non-`None` value as a REDIRECT, so an object there
would have re-routed every `print` in the corpus through the new `write`. It now
RECOGNISES a `PyConsoleStream` and answers `nil` — the console — under BOTH
spellings, `sys.stdout` and an explicit `file=` argument. A user redirect
(`sys.stdout = io.StringIO()`, `contextlib.redirect_stdout`, the
`open('/dev/stdout','w')` workaround) is not an instance of that class and is
written through exactly as before. Measured: full SUnit green and the
conformance gate `0 regression(s), 0 improvement(s)`.

**Two Smalltalk readers, not one.** `builtins >> ___printTarget___` was the
obvious one; `warnings >> showwarning` is the other, and it reads `sys.stderr`
with the same "`None` means the console" convention. Its console branch strips
the trailing newline and sends `#cr` while its `write:` branch does not, so
leaving it unrecognised would have changed how every displayed warning is
terminated. Anything else that grows a `sys.stdout`/`sys.stderr` read has to
make the same recognition; there is no third reader today
(`___sysStdin___` reads `stdin`, which is still `None`).

**Three things the console stream cannot honestly answer, and why.**
`___consoleWrite___:` exists precisely because the sink CANNOT BE PROBED — a
streaming embedder installs a `ClientForwarder`, a root class that forwards even
`class`, `respondsTo:` and `isNil` to the client as an uncatchable GCI error
2336. So:

* `isatty()` answers `false` unconditionally. Whether the console is a terminal
  is a property of the sink, and asking it is the one thing forbidden. The
  callers that ask (django's management colour support, twilio, `_pyrepl`'s
  pager) read `false` as "plain text, no ANSI", which agrees with Grail's
  `_colorize` stub.
* `fileno()` raises `io.UnsupportedOperation`. There is no descriptor on this
  side known to be the console's; for a client-side sink it lives in another
  process. `UnsupportedOperation` is an `OSError` subclass, so the `except
  OSError` a caller already wraps `fileno()` in catches it.
* `flush()` is a no-op — a flush would be exactly the forbidden send, and each
  write is passed on as it is made.

**stdout and stderr are two objects but ONE channel.** `___consoleWrite___:` has
a single sink and draws no out/err distinction, so the fix does not invent one:
the two instances differ only in `name` (`<stdout>` / `<stderr>`). Anything
wanting a genuinely separate error channel has to be given one at the
`___console___` box (SessionTemps `#GrailConsole`), not at the stream. Note this
is not a regression — with both `None`, everything already landed in the one
place.

`write()` answers `len(s)`, the character count CPython returns — counted before
any UTF-8 encoding `___consoleWrite___:` may do for a byte-taking sink, which is
what CPython counts too.

## FIXED: `./grail` printed UTF-16 and could not carry an exit status

Two defects in the LAUNCHER — the `./grail` shell wrapper and
`scripts/grail.tpz` — neither of which any SUnit test could see, because the
evidence in both cases is the bytes the command wrote and the status it exited
with. Both were fixed together; what follows is what each one was, and the two
general facts they turn on.

### `Transcript := GsFile stdout` writes UTF-16 code units

`grail.tpz` set the global `Transcript` to `GsFile stdout` so that `print()`
reached the terminal. A `GsFile` takes BYTES, and `nextPutAll:` writes a
`Unicode16`'s code units straight through, so a non-ASCII `print` came out
UTF-16BE. Measured, `print('café • 日')`:

```
63 00 61 00 66 00 e9 00 20 00 22 20 20 00 e5 65     (before)
63 61 66 c3 a9 20 e2 80 a2 20 e6 97 a5              (after — and CPython's bytes)
```

A NUL between every ASCII character, `•` (U+2022) truncated to `22 20`, `日` to
`e5 65`. **A pure-ASCII line is unaffected**, which is why this survived so
long: it only fires once the string is a `Unicode16`, and the common case never
is.

`builtins >> ___consoleWrite___:` had already solved this for GemDB (PR #701):
the `SessionTemps` `#GrailConsole` box carries the sink in slot 1 and a
declaration of what it takes in slot 2, and `#'utf8'` there means "encode". The
sink can never be PROBED — a streaming embedder installs a `ClientForwarder`,
and asking one anything forwards to the client as GCI error 2336, which is not
catchable in the gem — so the embedder declares it. `./grail` was simply never
wired up to it.

The `#GrailConsole` route is better than the reassignment for a second,
independent reason. `Transcript` is a COMMITTED `SymbolAssociation`, so
assigning it dirties the transaction. Measured in one session:

```
clean=false   after Transcript := GsFile stdout -> true   after #GrailConsole -> false
```

A script that then calls `gemstone.transaction()` reads that `needsCommit` as
the user's own pending changes. With the override there is nothing to save and
restore, nothing that can be committed by accident, and the `priorTranscript`
dance in the launcher is gone.

The same encoding bug reached the REPL by a second route: it read a line from
`GsFile stdin`, which answers BYTES, and appended it undecoded, so a non-ASCII
source line became one latin-1 character per UTF-8 byte and the console then
re-encoded it — `>>> print('café')` echoed `cafÃ©`. The line is now
`decodeFromUTF8`'d (guarded: invalid UTF-8 keeps the bytes).

### `on: Error` catches none of Grail's Python exceptions

Grail's `BaseException` sits under the kernel `Exception`, NOT under `Error`:

```
SystemExit < BaseException < Exception < AbstractException
AlmostOutOfStack < Admonition < Notification < Exception < AbstractException
Break < ControlInterrupt < Exception < AbstractException
ExitClientError < Error < Exception < AbstractException
```

so `grail.tpz`'s `on: Error do:` handler caught **nothing a Python script can
raise**. `import sys; sys.exit(3)` produced
`ERROR 2702 , a SystemExit occurred (error 2702), 3`, a 27-frame Smalltalk
stack on STDOUT, and exit **1**; an uncaught `ValueError` did the same. Note
that the name `Exception` inside a topaz `run` block resolves to Grail's PYTHON
`Exception` (the `Python` dictionary shadows the kernel class), so the kernel
spelling is not available to write down there anyway.

The handler is now `on: Error, BaseException do:` — an ExceptionSet, deliberately
NOT `on: AbstractException`. The broad spelling is what looks obviously right
and is worse than the bug: it also catches the RESUMABLE exceptions, and
swallowing `AlmostOutOfStack` turns the VM's stack warning into a fatal Red Zone
crash on the next overflow. `Break` and every other `Notification` are outside
the set for the same reason, and pass through exactly as they did.

### topaz `-l` carries an exit status; no status file is needed

GemDB's driver routes the exit code through a temp file, with the comment
"topaz cannot carry an exit status out of a run block". That is true of
`topaz -L`, which is what GemDB invokes. `./grail` invokes `topaz -l`, where
`ExitClientError signal: 'x' status: N` propagates verbatim — measured 0→0,
1→1, 2→2, 3→3, 255→255. So the launcher maps `SystemExit` onto that and needs
no status file.

One thing to know about it: **`ExitClientError` does NOT unwind through an
`ensure:`** (measured — the ensure block does not run). So the launcher computes
a status, lets the `ensure:` clean up `#GrailConsole`, and signals the exit
LAST, outside it.

`SystemExit`'s code is read the way GemDB reads it, `___pyAttrLoad___: #'args'`
then `at: 1`, and mapped to CPython's rules — all ten cases measured against
python3 3.14.6 and covered by `tests/scripts/test_grail_launcher.sh`:

| `sys.exit(...)` | status | stderr |
| --- | --- | --- |
| `3` | 3 | |
| *(no arg)*, `None`, `0` | 0 | |
| `256` | 0 | |
| `300` | 44 | |
| `-1` | 255 | |
| `True` | 1 | |
| `'fatal: bad input'` | 1 | `fatal: bad input` |
| `1.5` | 1 | `1.5` |

The integer cases are just the OS truncating the status, which is `\\ 256`
(Smalltalk's floored `\\` gives `-1 \\ 256 = 255`).

### FIXED: a real traceback (2026-09-06)

CPython prints a full traceback for an uncaught exception. The launcher printed
only the line that traceback ENDS with — `ValueError: boom`, on stderr — because
Grail attaches frames on the *Python* catch path only (`TryAst` →
`___pushCatchingFrame___:pos:`), and `grail.tpz`'s `on: BaseException do:` is a
Smalltalk handler: the exception it received had `__traceback__` None although
the VM's raise-time stack capture was on it in full, untouched.

The fix is a door, not new machinery: the public `Grail-Embedding` protocol on
`BaseException` (`ensurePythonTraceback`, `pythonTracebackFrames`,
`pythonExceptionChain`, `pythonTracebackString`, `releasePythonCapture`) walks
that capture on demand, exactly as the outermost Python handler would, and
`describeException` in `grail.tpz` prints `pythonTracebackString`. Measured on
the same script:

```
Traceback (most recent call last):
  File "/tmp/x/raise.py", line 2, in <module>
    raise ValueError('boom')
ValueError: boom
```

Design log 9.55 in `docs/Python_Traceback_Design.md` has the options weighed;
`tests/scripts/test_grail_launcher.sh` asserts the header, the frame and the
last line.

## FIXED: a Symbol was equal to a str but hashed differently, so dicts and sets missed it — sometimes

Python guarantees that `a == b` implies `hash(a) == hash(b)`. A GemStone
`Symbol` is a `String` subclass, so it satisfies `isinstance(sym, str)` and
compares equal to the str with the same characters **in both directions** — but
`Symbol >> hash` answers the **identity** hash (Symbols are canonical, so
identity is equality for the VM, and `SymbolDictionary` / symbol resolution /
method lookup are all built on that). Grail's `CharacterCollection >> __hash__`
was `^ self hash`, so the identity hash was what Python saw:

```
hash(#abc)   ->  61570      the identity hash
hash('abc')  ->  6723039    the content hash
#abc == 'abc'  and  'abc' == #abc   ->  both True
```

Equal objects, different hashes. `PyDict` — which also backs `set` and
`frozenset` — buckets by `__hash__` and only then matches by `__eq__`, so a
Symbol key and the equal str landed in different buckets and never met.
Measured under Grail before the fix, against CPython's answer for a
`class Symbol(str)` subclass:

| probe | Grail (before) | CPython |
| --- | --- | --- |
| `hash(sym) == hash('abc')` | `False` | `True` |
| `d = {sym: 1}; d['abc']` | `KeyError('abc')` | `1` |
| `d = {'abc': 1}; d[sym]` | `KeyError('abc')` | `1` |
| `len({sym: 1, 'abc': 2})` | `2` | `1` |
| `{sym} & {'abc'}` | `set()` | `{'abc'}` |
| `type(str(sym)).__name__` | `'Symbol'` | `'str'` |

**The miss is size-dependent, which is worse than an error.** A PyDict bucket is
`hash \\ tableSize`, so in a small table the identity hash and the content hash
can collide by luck, `__eq__` then matches, and the lookup **succeeds**. The
same probe on a leaked Symbol answered `1` from a 1-entry dict and raised
`KeyError` from a 65-entry one. Code that works on a small dict silently starts
missing as the dict grows, and a one-entry regression test would have passed
against the bug — which is why the SUnit coverage keys on 65-entry containers.

### How far Symbols actually leak

Every **ordinary Python door** was measured clean, and stays clean: `sys.modules`
keys, `sys.modules.keys()/items()`, `globals()`, `dir()` of a module / class /
`builtins`, `vars()`, `__dict__` of a class or instance, `os.environ`, `__name__` /
`__qualname__` / `__module__`, `f_locals` / `f_globals`, `co_name` / `co_filename`,
`inspect.signature(...).parameters`, traceback frame names, enum member names and
`__members__`, `namedtuple._fields`. All answer genuine `str`. `sys.modules` is
clean because PR #738 fixed it at the source (`PySysModules.gs`); the rest is the
module machinery already converting.

What is **not** closed is the Smalltalk/Python boundary itself. Two live routes
in the public `gemstone` interop module hand Python real Symbols today:

```python
gemstone.mySymbolList[0]    # a live SymbolDictionary; iterating it yields Symbols
gemstone['SomeGlobal']      # answers whatever the Smalltalk global holds
```

and any future bridge answering a Smalltalk object adds another. So the fix is on
the **value**, not on a list of leak sites: a hard-coded list of normalisation
points is defeated by the next one, which is the failure mode this codebase has
hit repeatedly.

### The fix

`Symbol >> __hash__` (env 1 only) answers the content hash, via
`self asString hash` — `String >> hash` is `<primitive: 31>`, and a session
method cannot declare a primitive itself (no `CompilePrimitives` privilege).
Under Unicode comparison mode `String`, `Unicode7`, `Unicode16` and `Unicode32`
all hash alike, so this is the str hash for a non-ASCII Symbol too.

`Symbol >> __str__` answers `self asString asUnicodeString`. Inherited,
`__str__` answered `self`, so `str(sym)` — the obvious way to launder a Symbol at
the boundary — laundered nothing: the result was still a Symbol and still
INVARIANT, so `str(sym).replace(...)` still died with the uncatchable
`Attempt to modify invariant object` that blocked `import kaggle`. `str.__new__`
answers a kernel-string argument's `__str__` without copying (it must: copying a
wide Unicode16/32 into the narrow canonical class would corrupt it), so
overriding `__str__` is what makes `str(sym)` a genuine `str`.

**Smalltalk-side hashing is untouched.** Only env 1 changes; `Symbol >> hash`
still answers `identityHash`, `SymbolDictionary` bucketing, `Globals at: #Object`
and method lookup are unaffected — asserted by
`SymbolStrHashEqTestCase >> testSmalltalkSymbolHashingIsUntouched`.

**Cost.** Ordinary str-keyed containers are unchanged, because `Symbol >> __hash__`
exists only on `Symbol` and a `str`/`int`/`tuple` key never reaches it: 200 000
`PyDict` str lookups took 58/59 ms with the fix and 61/59 ms with the pre-fix
`__hash__` restored; 200 000 str set-membership tests, 78/76 ms vs 75/74 ms.
The Symbol path itself costs one small allocation per hash: 200 000
`#sym @env1:__hash__` sends took 10 ms vs 2 ms, i.e. about +40 ns per Symbol hash.

## FIXED: a failed `dlopen` killed the session, so a pure-Python fallback was never reached

Measured on GemStone 3.7.5, Darwin arm64, against `main` at `edb26dd9`, with a
venv (`markupsafe` 3.0.3, `jinja2` 3.1.6, `numpy` 2.5.2, CPython 3.14 wheels) on
`sys.path`. Gap **G4** of `docs/Package_Census.md`.

### The mechanism, and what it is NOT

It is **not** a SIGSEGV. That mattered enough to check: the shim links with
`-undefined dynamic_lookup`, and a missing shim symbol elsewhere in this
codebase becomes a NULL call at pc 0x0 (see the shim-symbol note in this file),
which no exception could rescue. Here it does not happen, because
`shimDynLoad` in `src/c/shim/cpython.cc` uses `dlopen(path, RTLD_NOW |
RTLD_GLOBAL)`: `RTLD_NOW` **refuses the load** rather than deferring an
unresolvable symbol to a NULL call. The probe's exit status was **1**, not 139.

The real mechanism is an ordinary uncatchable-Smalltalk-error-at-the-Python-
boundary, the pattern this codebase keeps meeting. `raise_error()` signals a
`GrailShimError`, which is an `Error` — a *sibling* of Grail's Python
`BaseException`, not a subclass. `importlib class >> loadDynamicModuleNamed:
fromPath:` did not catch it, so it unwound past Python entirely: no `except
ImportError` and no `except BaseException` could see it, and the process died.

```
$ ./grail p1.py            # try: import markupsafe._speedups / except ImportError: ...
START
dlopen failed: dlopen(.../markupsafe/_speedups.cpython-314-darwin.so, 0x000A): symbol not found in flat namespace '_PyUnicode_New'
exit=1                     # no CAUGHT, no END
```

The failure DOES print a line, on stdout, before the session goes. That line is
topaz reporting the unhandled error, not Grail reporting an import problem, and
`scripts/grail_import_probe.py` cannot see it — which is why the census scored
these rows `CRASH` with no result line at all.

### Five shim texts, all measured, all one class

Probed by calling `CPythonShim class >> loadDynamicModule:fromPath:` under
`on: GrailShimError do:` — every one of them was catchable at that frame, so
nothing here needed a C change:

| what was wrong with the `.so` | shim's `messageText` |
| --- | --- |
| loads, but a CPython symbol is unresolvable (`markupsafe._speedups`, `numpy`) | `dlopen failed: dlopen(<p>, 0x000A): symbol not found in flat namespace '_PyUnicode_New'` |
| wrong architecture (x86_64 slice on arm64) | `dlopen failed: … incompatible architecture …` |
| not a Mach-O/ELF file at all | `dlopen failed: … slice is not valid mach-o file` |
| loads, defines no `PyInit_<leaf>` | `Symbol not found: PyInit__grail_noinit in <p>` |
| `PyInit_` answers NULL | `Module init failed: _grail_nullinit` |

A sixth, `Module exec failed: X` (a `Py_mod_exec` slot), is translated too but
was not reproduced — no fixture reaches it.

### What the fix is, and what it deliberately is not

`loadDynamicModuleNamed:fromPath:` now wraps the load in `on: GrailShimError
do:` and re-signals through
`ImportError class >> ___signalExtensionLoadFailed___:name:path:`, which maps
the shim texts onto CPython's wording (the dlerror text **verbatim** for a load
failure; `dynamic module does not define module export function (PyInit_X)` for
a missing init) and attaches CPython's `name` and `path`. Anything the shim
says that is not one of the four known shapes is passed through unchanged
rather than relabelled.

Re-signalling is legal at *that* frame and would not have been one frame in:
`GciRaiseException` unwinds the C stack before it signals, so the user-action
frame is already gone. Inside a shim callback it would be the 2758 /
`AlmostOutOfStack` loop `GrailShimError`'s class comment describes.

The handler is `GrailShimError` and nothing wider, so it cannot swallow a Grail
bug raised elsewhere in the loader. **One such bug is still live and unfixed**:
`loadDynamicModule:fromPath:` compiles a Smalltalk method per exported C
function, and a C function whose name is not a legal selector fragment would
raise `CompileError` — uncatchable, session dead, exactly the shape just fixed
one layer up. No fixture reaches it (every extension met so far exports
identifier-shaped names), so it is recorded rather than guessed at.

Two divergences from CPython, both deliberate. CPython raises `SystemError` for
an init that answers NULL *without* setting an exception, and re-raises the real
exception when one was set; Grail's shim cannot tell those apart — both arrive
as a NULL return with no error object — so both become `ImportError`, which is
the commoner CPython outcome of the pair and is what the graceful-degradation
guards catch.

### The second failure hiding behind the first

Once the session stopped dying, `import numpy._core._multiarray_umath` reached
numpy's own handler and immediately raised

```
AttributeError: 'ImportError' object has no attribute 'msg'
```

from `numpy/_core/__init__.py`'s `if exc.msg == "cannot load module more than
once per process":`. CPython's `ImportError.__init__` always sets `msg` — to the
single positional argument when there is exactly one, `None` otherwise — and
Grail declared the instance variable but never populated it. Fixed in
`ImportError >> ___args___:`, so it holds for every construction path and for
`ModuleNotFoundError` too. With it, numpy prints its own full troubleshooting
`ImportError` and the session lives.

This is worth generalising: **a fix that converts a process kill into an
exception will surface whatever the killed code would have done next.** Budget
for it rather than treating the follow-on failure as a regression.

### What it does NOT fix

`numpy`, `pandas`, `aiohttp` and `yarl` still do not work — they genuinely need
a CPython extension Grail cannot load. What changed for them is only that the
failure is now a diagnosable `ImportError` instead of a dead process, which is
what `docs/Sys_Path_Bootstrap.md` says the intent was.

And `import markupsafe` / `import jinja2` still resolve to **Grail's bundled
copies**, not the pip ones — gap G10, deliberate. The defect was never about
which copy answers: Grail's own bundled `markupsafe/__init__.py` carries the
same `try: from ._speedups import … except ImportError:` guard, and its relative
import resolves `markupsafe._speedups` against `sys.path`, so it found the
**venv's** `.so` and died on it. Installing a package into a venv broke an
import that had worked before. Always print the resolved `__file__` when
checking one of these four names; a green import can mean either copy.

## FIXED: a nested `from X import *` emitted a Smalltalk variable named `*` — and what is behind it for pyyaml and pydantic

`importlib >> expandStarImports:` scanned only `aModuleAst body body` — the
module's own top-level statement list. A star import written inside a `try`,
`if`, `with`, `for` or `while` was therefore never seen, kept its lone `*`
alias into codegen, and `ImportFromAst >> printSmalltalkOn:` emitted a per-name
binding for it. Dumped with `GRAIL_CODEGEN_TRACE_DIR` from
`try: from json import * / except ImportError: pass`:

```smalltalk
	[
		* := ((((Python @env0:at: #builtins) instance) ___import__: { 'json'. nil. nil. { '*' }. 0 } kw: nil) @env1:___pyAttrLoad___: #'*').
	] @env0:on: (PyLazyExceptSelector @env0:on: [BaseException @env1:___pyExceptType___: (ImportError)]) do: [...]
```

`a CompileError occurred (error 1001), expected a right bracket (])` —
uncatchable, unwinding past Python entirely, so the session dies with no Python
error at all. The same statement at top level was fine, which is why it read as
a `try` bug rather than an import one.

Fixed by making the scan `AbstractNode >>
___collectModuleScopeStarImportsInto___`, the generic instVar walk `setParent:`
already uses, stopping at a function, lambda or class body.

**CPython's rules, measured under 3.14.6, not recalled.** A star import is legal
anywhere at MODULE SCOPE — `try`/`except`/`else`, `if`/`else`, `with`, `for`,
`while` all bind — because Python's compound statements introduce no scope. It
is a `SyntaxError: import * only allowed at module level` inside a `def`, an
`async def` or a **class body** (the class-body case was legal in Python 2 and
is not now), at any depth: `def f(): \n if True: \n  from math import *` is
rejected too. `PythonParser >> parseFromImport` already raises exactly that
message, so the walk can stop at those nodes on the strength of it rather than
re-deriving the rule.

### Still divergent, and NOT nesting-specific: a star import ignores `__all__`

Measured against a provider module with `__all__ = ['exported',
'_underscore_exported']` and a public `not_exported` beside them:

| | CPython | Grail |
| --- | --- | --- |
| `exported` bound | yes | yes |
| `_underscore_exported` bound (underscore, but in `__all__`) | yes | yes |
| `not_exported` bound (public, but NOT in `__all__`) | **no** | **yes** |

Without `__all__` both exclude underscore names correctly. The parse-time
expansion in `expandStarImports:` does read `__all__` (`___starExportNamesFor___`);
what over-binds is the RUNTIME step beside it, `module >>
___mergePublicAttrsFrom:`, which copies every public attribute unconditionally.
It exists to catch names a module injects dynamically, which `__all__` cannot
describe. **This is identical at module top level and nested** — it predates and
is independent of the nesting fix — so `tests/python/nested_star_import.py`
deliberately does not assert it.

### How far pyyaml and pydantic get now (venv `/tmp/starvenv`, Darwin arm64, 3.7.5)

Neither is bundled in `src/python/stdlib`, and both resolved `__file__` inside
the venv, so neither is a SHADOWED reading.

* **pydantic 2.13.5** — was `CRASH` on the CompileError. Now a clean, catchable
  `AttributeError: module '?' has no attribute '_Final'`. All five star imports
  in `pydantic/__init__.py` (inside `if TYPE_CHECKING:`) compile to
  `self @env1:___mergePublicAttrsFrom: ...`, verified in the codegen dump. The
  next blocker is the census's **G2**: `typing_extensions` and `pydantic_core`
  both die on `typing._Final`; `annotated_types` dies separately on G14
  (`GroupedMetadata.__init_subclass__() missing 1 required positional argument:
  'cls'`); `typing_inspection` imports.
* **pyyaml 6.0.3** — was `CRASH` on the CompileError at `yaml/__init__.py:13`.
  Now it gets all the way THROUGH that file to its C extension and dies in
  `dlopen` of `_yaml.cpython-314-darwin.so` — the census's **G4**, a fatal
  `dlopen` killing the session instead of raising `ImportError`, which is
  exactly what the `try: from .cyaml import * / except ImportError` guard around
  it is there to swallow. With that `.so` moved aside, `import yaml` **succeeds**
  from `/tmp/starvenv/lib/python3.14/site-packages/yaml/__init__.py` with
  `__with_libyaml__ = False`, and `yaml.safe_load` / `yaml.safe_dump` run.

### The next pyyaml defect after that: a copied class attribute shadows a nearer base's

`yaml.safe_load("a: 1")` answers `{'a': '1'}` under Grail and `{'a': 1}` under
CPython; `safe_dump` emits `{k: [!!int '1', !!int '2']}` instead of `{k: [1, 2]}`.
Everything upstream agrees — the scanner's `ScalarToken(plain=True)`, the
parser's `ScalarEvent(implicit=(True, False))`, and `Resolver().resolve(...)`
called directly all match CPython. The divergence is one attribute:

```
                       CPython   Grail
Resolver.yaml_implicit_resolvers      30      30
BaseResolver.yaml_implicit_resolvers   0       0
SafeLoader.yaml_implicit_resolvers    30   ->  0
```

and the `__dict__` walk says why. `BaseResolver` declares
`yaml_implicit_resolvers = {}` in its class body; `Resolver` acquires a
populated one only later, from `add_implicit_resolver` doing
`cls.yaml_implicit_resolvers = ...` at import time. Under CPython that lands in
`Resolver.__dict__` and `SafeLoader` finds it through the MRO. Under Grail
`Resolver.__dict__` does **not** contain the name at all, while
`SafeLoader.__dict__` contains a COPY of `BaseResolver`'s empty `{}`, taken when
the six-base class was flattened. The copy wins and every scalar resolves to
`tag:yaml.org,2002:str`.

This was first written up as the populated table living in a *session overlay*.
It does not: probing the live classes showed it in `Resolver class`'s own
classInstVar slot, and the absence from `Resolver.__dict__` is a separate
`__dict__`-view divergence that made the overlay reading look right. The
corrected account, and the fix, are below under *a merged class attribute was
read from the wrong class*.

Worth knowing, and the reason the next section took a different route:
**the obvious minimal repro does not reproduce.** A two-level chain with the attribute assigned after the class body,
with a second base ahead of it, across modules, and via a `classmethod`, all
answer correctly under Grail — in those `SafeLoader.__dict__`'s equivalent stays
EMPTY. Something more specific about yaml's hierarchy (six bases; `BaseResolver`
reached past `BaseConstructor` in the MRO) triggers the copy. Start from
`SafeLoader.__dict__` rather than from a small case.

## FIXED: a merged class attribute was read from the wrong class, so `yaml.safe_load("a: 1")` answered `{'a': '1'}`

`yaml.safe_load("a: 1")` answered `{'a': '1'}` and `yaml.safe_load("a: true")`
answered `{'a': 'true'}`: **silently wrong values, not an error.** Scanner,
parser and `Resolver().resolve(...)` all agreed with CPython; one class
attribute did not.

```
                                        CPython 3.14.6   Grail (before)
len(BaseResolver.yaml_implicit_resolvers)        0             0
len(Resolver.yaml_implicit_resolvers)           30            30
len(SafeLoader.yaml_implicit_resolvers)         30      ->     0
```

### The three homes, measured — and PR #759's guess was wrong about one

Grail keeps a class attribute in one of three places, and reading only one of
them is the recurring shape behind PRs #739 (load path) and #750 (store path).
Probing the live pyyaml classes says where each copy actually was:

| class | accessor pair (classInstVar) | `___dynInstVars___` holder | session overlay |
| --- | --- | --- | --- |
| `BaseResolver` | **declares it; slot = `{}`** | absent | absent |
| `Resolver` | inherits the accessor; **own slot = 30 entries** | absent | absent |
| `SafeLoader` | no accessor anywhere in its metaclass chain | **`{}` (a copy)** | absent |

PR #759 recorded `Resolver`'s value as living in a **session overlay**. It does
not. It lives in `Resolver class`'s own classInstVar slot, reached through the
accessor pair `BaseResolver class` declares. What misled the reading is that
`'yaml_implicit_resolvers' in Resolver.__dict__` answers **False** under Grail
and **True** under CPython — Grail's class `__dict__` view reports an accessor
only for the class whose metaclass *declares* it, never for a subclass that has
merely written its own slot. That divergence is real and still open (below), but
it is a view bug, not a storage one.

### Why the wrong value got copied

`importlib >> ___mergeSecondaryBases___` implements MI by copy-down. For each
secondary base it walks that base's chain looking for the ancestor whose
metaclass carries the `Grail-Class Attrs` accessor, and then read the value from
**that ancestor**:

```smalltalk
v := [walker perform: sel env: 1] on: AbstractException do: [:e | e return: nil].
```

`walker` is the DECLARING class; the class named in the header is `base`. A
`Grail-Class Attrs` accessor is `x ^ x` over a **classInstVar**, and
classInstVars are **per-class storage** — one compiled accessor on `A class`
serves every subclass, but each subclass reads its own slot. So

```
BaseResolver perform: #yaml_implicit_resolvers   ->  {}          (walker)
Resolver     perform: #yaml_implicit_resolvers   ->  30 entries  (base)
```

The merge copied `{}` onto `SafeLoader`'s `___dynInstVars___` holder. Being on
`SafeLoader` itself, that copy is nearer than anything on `Resolver`, so it won
every later read and every scalar resolved to `tag:yaml.org,2002:str`.

### The obvious minimal repro really does not reproduce — and here is the reason

PR #759 reported four minimal repros of this shape all passing. They did, and
the discriminator is **which base becomes the storage base**. Grail picks it by
chain depth (`___selectStorageBase___`); the storage base becomes the Smalltalk
superclass, so nothing about it is copied and the read walks the real chain.
Put the reassigned base LAST after a shallow one and it is the deepest base, so
it wins storage and the bug cannot fire:

```python
class A:  x = 'from-A'
class B(A): pass
B.x = 'from-B'

class T0: pass
class D(T0, B): pass       # B is deepest -> storage base -> CORRECT ('from-B')

class S0: pass
class S1(S0): pass         # depth 2, ties with B, listed FIRST -> wins storage
class C(S1, B): pass       # B is now a merged secondary base
C.x                        # CPython 'from-B';  Grail (before) 'from-A'
```

In pyyaml the same thing happens by accident: `SafeConstructor` → `BaseConstructor`
ties with `Resolver` → `BaseResolver` and is listed earlier, so `Resolver` is
merged rather than inherited.

### The fix

`importlib >> ___classAttrValueSeenFrom___: aBase upTo: aWalker name: aSym`
reads the value as Python's MRO sees it **from the base named in the header**,
walking nearest-first up to the declaring class and probing all three homes at
each step (overlay, holder, accessor). When the named base never assigned the
attribute its slot is nil and the walk falls through to the declaring class —
the answer the old code gave, so the ordinary shape is unchanged.

Acceptance, byte-identical to CPython 3.14.6 with pyyaml 6.0.3 resolved from a
venv (`__file__` inside `site-packages`, nothing bundled):

```
safe_load a: 1     {'a': 1}
safe_load a: true  {'a': True}
safe_dump          {b: true, f: 2.5, i: 1, l: [1, 2], n: null, s: x}
round trip types   ['bool', 'float', 'int', 'list', 'NoneType', 'str']
nested             {'top': {'n': 3, 'when': datetime.date(2001, 12, 14), 'ok': True}}
```

Fixture `tests/python/subclass_attr_shadow.py` (14/14 under CPython, 14/14 under
Grail) and `SubclassAttrShadowTestCase`. `testShallowFirstBaseWasAlwaysCorrect`
keeps the discriminator standing, so the repro cannot quietly lose its teeth.

### Still divergent, and NOT what this fixes

* **A class `__dict__` does not report an accessor slot the class merely wrote.**
  `'yaml_implicit_resolvers' in Resolver.__dict__` is False under Grail, True
  under CPython. Concretely this makes pyyaml's
  `if not 'yaml_implicit_resolvers' in cls.__dict__:` guard fire on every
  `add_implicit_resolver` call, so the table is re-copied 30 times instead of
  once — correct, quadratic, invisible.
* **A merged subclass `__dict__` reports the copied name.**
  `'yaml_implicit_resolvers' in SafeLoader.__dict__` is True under Grail, False
  under CPython. That is copy-down MI showing through, and removing the copy
  would need the class-attribute read path to consult the registered `__mro__`
  rather than the Smalltalk superclass chain — a much larger change than this
  one, and the reason it was not attempted here.

## FIXED: class keywords a class body binds — TypedDict `total=`, and PEP 487's implicit classmethod

`object.__init_subclass__() takes no keyword arguments` was gap #3 in
`docs/Package_Census.md`. The census warned that the naive repro **passes**,
and it does. Measured against CPython 3.14.6, fourteen `__init_subclass__`
shapes, thirteen already agreed: `**kwargs` hooks, an explicit `@classmethod`,
a metaclass in the mix (`metaclass=` is withheld correctly), `super()`
chaining, a hook two levels up, a hook that must not fire for its own class,
and — measured, because the brief said otherwise — `__set_name__` runs
**before** `__init_subclass__`, not after, in both.

**The one divergence was `class Options(TypedDict, total=False)`.** CPython
consumes `total` in `_TypedDictMeta.__new__`, which *declares* it as a named
parameter. Grail's `typing.TypedDict` was `class TypedDict: pass`, which
declares nothing, so `total` survived to the end of PEP 487's cooperative
chain and `object`'s terminal hook rejected it — correctly. The message is the
whole trap: it names the one component that was working, and the census
recorded a `typing` gap as an object-model gap because of it. `TypedDict` is
now CPython's shape (factory object with `__mro_entries__`, `_TypedDictMeta`
consuming `total` and nothing else, the `__required_keys__` /
`__optional_keys__` / `__total__` / `__annotations__` a consumer reads back,
`Required`/`NotRequired` per key, and the functional form).

The leftover-keyword `TypeError` now **names the class being created**, as
CPython 3.14 does (`Mistyped.__init_subclass__() takes no keyword arguments`).
`InitSubclassTestCase` had pinned `object.__init_subclass__() ...`, a string
CPython 3.14 never produces.

Probing the object model while there did find three real defects in it:

* **A `def __init_subclass__` that is not at the top of a class body** — under
  an `if`, `for`, `try` or `with` — is PEP 487's implicit classmethod and must
  receive the class. It routes through `___classBodyDefinitionalStore___` as a
  bare block, and `___grailRunAssignedInitSubclass___` read that as a hook
  installed by `setattr` (which correctly receives nothing) rather than as one
  the body defined. Every such hook died with `missing 1 required positional
  argument: 'cls'`. Fixed by wrapping in `classmethod` at that store, which is
  where and when `type.__new__` wraps it. pip's `annotated-types` writes its
  hook under `if not TYPE_CHECKING:`.
* **`__init_subclass__ = classmethod(fn)` in a class body never ran at all**,
  silently, keywords or not. An assignment compiles no method for the
  definition search, and the assignment search read two of the three homes a
  class attribute can have — the session overlay and the `___dynInstVars___`
  holder, but not the **accessor pair** an unconditional body assignment lands
  in. (The three-homes lesson again; the category `Grail-Class Attrs` is what
  separates an accessor pair from a genuine class-side `__init_subclass__`.)
* **A hook DEFINED on a secondary base was skipped.** The search walked
  Smalltalk superclass links, which see the primary base only. It now uses
  `___grailInitSubclassRoots___`, the same base list the assigned-hook search
  already used.

### What is still open in the diamond

`___grailInitSubclassSearchBase___` is a **left-to-right walk of the bases,
each one's superclass chain first** — not a C3 linearization. It agrees with
the MRO for every hierarchy whose bases do not SHARE an ancestor, and
disagrees when they do. `test_subclassinit.test_init_subclass_diamond` is the
disagreeing shape and still fails, unchanged at ERROR 17/2/1: `class A(Left,
Middle, Right)` with `Left` and `Right` both deriving from `Base` puts `Base`
AFTER `Middle` in the real MRO, and the walk reaches `Base` through `Left`
first.

That test needs more than a search base in any case. Its hooks chain
cooperatively with `super().__init_subclass__(**kwargs)`, and Grail's `super()`
inside a hook walks Smalltalk links too, so `Middle`'s `super()` cannot reach
`Right` **whatever the entry point is**. So the `__init_subclass__` bullet in
`## OPEN: metaclass class-keyword plumbing, and type.__new__ keyword rejection`
is NARROWED, not resolved: reaching a secondary base's hook works; continuing
the cooperative chain in MRO order does not. That section's other three items were re-measured, and
two of the three readings have moved:

* a metaclass `__new__` naming a class keyword with no default is
  **unchanged** — still `type.__new__() argument 3 must be dict, not
  SmallInteger` where CPython builds the class;
* `super().__new__(cls, name=…, bases=…, dict=…)` no longer silently builds
  the class as that section says: it now raises `AttributeError: 'M' object
  has no attribute '__name__'`, where CPython raises `TypeError:
  type.__new__() takes exactly 3 arguments (0 given)`. Still a divergence,
  different symptom;
* `types.new_class('C', (), dict(metaclass=M, otherarg=1))` with a
  `**kwargs`-carrying `M` **did not reproduce** — CPython 3.14.6 does not
  raise there either, and Grail matches. Whatever shape that item was
  measured on is not this one; re-measure it before working on it.

### Divergences deliberately left in TypedDict

A TypedDict class here is a real `dict` **subclass**, so calling it answers an
instance of that subclass where CPython answers a plain `dict`, and `__mro__`
carries one extra link (`_TypedDictBase`). CPython gets the plain dict from
`_TypedDictMeta.__call__ = dict`, and **Grail does not consult a metaclass
`__call__` at all** — measured directly: with `class M(type): __call__ = dict`
(and equally with a `def __call__`), `B(x=1)` where `class B(metaclass=M)`
answers a `B` instance, not a dict. There is nowhere to hang it. The instance
is a dict, compares equal to the plain one, and `issubclass(TD, dict)` is true
either way.

### Four things measured in passing, none of them this gap

* **A method inherited from a SECONDARY base loses its closure over an
  enclosing function local.** Independent of `__init_subclass__`, and the
  sharper repro is a plain method:

  ```python
  def f():
      seen = []
      class Left: pass
      class Middle:
          def touch(self): seen.append('mid')
      class Right: pass
      class A(Left, Middle, Right): pass
      A().touch()          # NameError: free variable 'seen' referenced
  ```

  The same class as the PRIMARY base works. This surfaced only because the
  secondary-base hook now runs at all, and it made a `__init_subclass__` repro
  look like a closure bug in the fix.
* **A Python class named `Interval` becomes `range`.** `class Interval: pass`
  answers a class whose `__name__` is `'range'` — Grail maps Smalltalk's
  kernel `Interval` to Python `range`, and the new class resolves to the
  kernel one. `Fraction`, `Association`, `Bag` and `Date` are all fine, so it
  is not a general kernel-name collision but a specific aliased one.
  `annotated-types` defines `class Interval(GroupedMetadata)`, so it will hit
  this the moment the `typing` gap in front of it clears.
* **Calling a metaclass with three arguments answers an INSTANCE, not a
  class.** `class M(type): pass` then `M('Q', (dict,), {})` answers
  `<M object at ...>` where CPython answers a class.
  `type.__new__(M, 'Q', (dict,), {})` does answer a class, which is the
  workaround used here.
* **`hashlib` has no `sha384` or `sha224`.** `_digestBytes` covers md5, sha1,
  sha256, sha512 and the four sha3 variants; GemStone appears to supply no
  `sha384SumBytes`. This is what pyjwt stops on once `TypedDict` works.

### Where the five packages stop now

Measured with `scripts/grail_import_probe.py` from
`origin/measure/package-census`, one fresh `./grail` per package, with
`VIRTUAL_ENV` pointed at a venv and `PYTHONPATH` cleared. None of the five
reaches an import yet; each moved past this gap onto a different, named one:

| package | was | now |
| --- | --- | --- |
| filelock | `object.__init_subclass__() takes no keyword arguments` | `ModuleNotFoundError: No module named 'ctypes'` |
| pyjwt | same | `AttributeError: module '?' has no attribute 'sha384'` |
| annotated-types | `GroupedMetadata.__init_subclass__() missing 1 required positional argument: 'cls'` | `module '?' has no attribute '_Final'` (G2) |
| typing-extensions | G2, then this gap | `module '?' has no attribute '_Final'` (G2) |
| pathspec | G2, then this gap | `module '?' has no attribute '_Final'` (G2) |

The upstream module bodies themselves DO now run: `jwt/types.py` executes with
`Options.__total__` False over 11 optional keys, `filelock`'s `LockOptions`
with 12, and `annotated-types`' `GroupedMetadata` hook fires on subclassing.

**A note for whoever fills `typing`:** `typing._Final.__init_subclass__` must
consume `_root` (CPython raises `TypeError: Cannot subclass special typing
classes` when `'_root' not in kwds` and never delegates upward). A fabricated
`_Final` without it puts `typing-extensions`, `pathspec` and `litellm` straight
back on this gap's error message — which is exactly what the census's stubbed
reconnaissance pass measured. Grail already handles that hook shape correctly
(positional-only `cls`, `*args`, `**kwds`, no `super()` call); only the class
is missing.

### errno: 108 names, and they are BSD

`errno` went from 25 names to the 108 CPython publishes on Darwin, plus
`errorcode`. Values were read from the host's `errno` rather than recalled, so
the table stays the self-consistent BSD/macOS one its header documents.
**Linux-only names (`ENOMEDIUM`, `EREMOTEIO`, …) are still absent, on purpose**:
adding them would mix two platforms' numbering in one table, and a missing name
is an `AttributeError` at the point of use where a wrong number is a comparison
that silently comes out false. This moved `fsspec` and `s3fs` off `ESPIPE` onto
G13 (`'OrderedCollection' object has no attribute 'get'`), exactly as the
census's stubbed pass predicted.

## Vendoring CPython's typing.py: what it exposed, and what is still open

`src/python/stdlib/typing.py` was a 975-line hand-written stub with 104 names,
of which 83 of CPython 3.14's 105 public ones. It is now CPython 3.14.6's own
`typing.py`, unmodified except for two clearly-marked deviations at the end of
the file, over a pure-Python `_typing.py` standing in for the C accelerator.
`vars(typing)` goes 104 -> 208 against CPython's 210.

The bet was the one `argparse` took in PR #749: vendoring the real file
delivers the whole surface at once **and exposes genuine Grail defects instead
of hiding them behind a subset**. It did. Each of the following was found by
the real file exercising a path the stub never reached, and each has a repro
that fits on a screen.

### FIXED here

**PEP 562 module-level `__getattr__` was never consulted.**

```python
# m.py
def __getattr__(name):
    if name == "LAZY":
        return "lazy-value"
    raise AttributeError(name)

import m; m.LAZY        # AttributeError: module 'm' has no attribute 'LAZY'
```

CPython 3.14's typing.py moves five soft-deprecated names (`ForwardRef`,
`Pattern`, `Match`, `ContextManager`, `AsyncContextManager`) behind this hook
purely to keep `import typing` cheap, so without PEP 562 the vendoring would
have LOST five names the stub had. Fixed in the module branch of
`object >> ___pyAttrLoad___:`, consulted only after the ordinary lookup fails.

**Every module AttributeError named the module `'?'`.** Same method: the
module's name lives in the SymbolDictionary (`module >> __name__` reads
`self at: #__name__`), and the probe read a dynamic instVar, which could only
ever be nil. Called out in `docs/Package_Census.md` as having cost real time.

**`__call__ = some_function` in a class body did not make instances callable.**

```python
def ident(self, x): return x
class C:
    __call__ = ident
C()(3)      # MessageNotUnderstood -- uncatchable, not a TypeError
```

`def __call__` works; the ASSIGNED form compiles to an accessor pair on the
metaclass, which `PythonInstance >> value:value:` did not consult. CPython's
rule is `type(obj).__call__(obj, *args)`, and that is now the last branch
before the DNU. `callable()` had the same blind spot and now matches. This is
`typing.NewType`, verbatim.

**`X | Y` refused typing's own objects, and did not terminate.** `T | None`
answered NotImplemented from `int.__or__`, Python tried `TypeVar.__ror__`,
typing spells that `Union[T, None]`, and Union's subscript built its result
with `|` again. The visible symptom was a `RecursionError` inside an unrelated
package's import, naming neither typing nor the operator.
`PyUnionType class >> ___isTypeOperand___:` now recognises the three shapes
typing produces by the protocol each implements, and `___grailUnionFrom___:`
is a constructor that does not fold `|`.

**`types.UnionType` was a stub class**, so `isinstance(int | str,
types.UnionType)` was False for a real union -- the one thing the name is used
for. Now `type(int | str)`, exactly as `types.GenericAlias` is `type(list[int])`.
Unions also had no `__eq__`/`__hash__`, so `Union[int, str] == int | str` was
False and every union missed in a dict.

**`type.__new__(Meta, name, bases, ns)` dropped its metaclass argument.**

```python
class Meta(type):
    def __new__(cls, name, bases, ns): return super().__new__(cls, name, bases, ns)
C = type.__new__(Meta, 'C', (), {})
type(C)        # was <class 'type'>, CPython says <class '__main__.Meta'>
```

Silent, and it matters: this is how typing.py mints the base that
`class Point(NamedTuple)` inherits from, so subclassing it never ran
`NamedTupleMeta.__new__`.

**A `__mro_entries__` ASSIGNED onto a function was invisible.** `typing.NamedTuple`
and `typing.TypedDict` are plain functions in 3.14 with the hook assigned onto
them; under Grail a module-level def is a BoundMethod, and
`BoundMethod >> ___subclass___:` raised before `object >>___subclass___:` could
look. Both the sole-base and multi-base paths now consult a stored callable as
well as a compiled method.

**`annotationlib` had no `type_repr`**, so a generic alias could be built and
inspected but not printed -- `get_args(List[int])` worked and `repr` raised.
**`ForwardRef.evaluate` raised NotImplementedError**, which put
`get_type_hints` on ANY quoted annotation out of reach; it now evaluates in
CPython's namespace order. `ForwardRef` also declares `__slots__`, whose NAMES
typing_extensions and pydantic_core read as a version-detection API.

### NOT fixed -- open, with repros

**A top-level `def` cannot rebind a name a decorator stored.**

```python
def deco(f): return "DECORATED"
@deco
def g(): pass
def g(): return "real"
g()          # "DECORATED"; CPython says "real"
```

A top-level def compiles to a METHOD on the module class and emits nothing at
module-body time; a decorator stores its result in the module's attribute slot,
and the slot out-ranks the method. This is exactly the `@overload` shape --
CPython's `overload` answers a dummy that raises, and the real implementation
that follows cannot displace it. jinja2's `map` filter is written that way.

An attempted fix (emit a slot-clear for every undecorated top-level def) was
**reverted**: with it, `socket`'s `IntEnum._convert_('AddressFamily', ...)`
produced an enum with no members once the module had been through
`deployFrameworks`, and 26 suite tests errored. The mechanism was not
identified. Whatever the right fix is, it is not an unconditional clear.

`typing.overload` is therefore overridden in the deviation section of
typing.py to answer the function unchanged -- which is what Grail's stub typing
did -- while still registering it so `get_overloads` works. Delete that when
the codegen defect is fixed.

**A metaclass `__getitem__` is ignored for `Cls[...]`, and answers the class.**

```python
class M(type):
    def __getitem__(cls, k): return ("meta", k)
class A(metaclass=M): pass
A[int]       # <class '__main__.A'>; CPython says ('meta', <class 'int'>)
```

Not an error -- a well-formed value meaning nothing. `__class_getitem__` works,
and metaclass `__instancecheck__`/`__subclasscheck__` are both honoured, so
this is `__getitem__` specifically. `_typing.Union` is spelled with
`__class_getitem__` because of it.

**A metaclass cannot rewrite the bases of the class it is building.** By the
time any metaclass hook runs, the class statement has compiled its body onto a
Smalltalk class, so `type >> __new__` answers the class under construction
rather than building a new one. `NamedTupleMeta.__new__` depends on the
rewrite (`bases = tuple(tuple if base is _NamedTuple else base ...)`), so the
vendored path produces a `class Point(NamedTuple)` with no tuple in its
ancestry and only the bare fields -- silently. NamedTuple therefore keeps
Grail's own implementation, moved unchanged into the deviation section, which
reaches the same place through `__mro_entries__` instead. TypedDict is NOT
deviated: its metaclass rewrites bases too, but nothing depends on the result
being a `dict` subclass.

**Grail enforces `__slots__` where CPython does not.** CPython restricts an
instance to its slots only when EVERY base is slotted; Grail enforces the
declaration outright. `_typing.Generic` therefore omits the `__slots__ = ()`
CPython's C type has, because with it

```python
class RecentlyUsedContainer(Generic[K, V], MutableMapping[K, V]):
    def __init__(self): self._d = {}
```

ran its `__init__` and then `self._d` did not exist. urllib3 is written that
way.

**`test.test_warnings` gained one error, and it was NOT the price of this
change.** It was read that way at first -- bisected to the vendored typing.py,
with every other file ruled out one at a time, and recorded as an accepted cost.
That reading was wrong in its conclusion and in its mechanism: the guess that
the recursion "needs both the vendored typing and that base chain" is false, the
base chain is irrelevant, and the depth was never the point. The real cause was
an infinite recursion in this file's own Grail deviation for `typing.overload`,
described in full below under *`typing.overload` recursed forever*. It is fixed,
`test.test_warnings` reads one error BETTER than before, and the vendoring
carries no conformance cost at all.

**`test.test_typing` cannot measure any of this.** It is IMPORTERROR before and
after, on `type type_alias[...] = ...` at line 5860 -- PEP 695 syntax Grail's
parser does not have. The typing surface is therefore covered by
`tests/python/typing_surface.py` (28 checks, all of which also pass under
CPython 3.14.6) and not by the module named after it.

### What this bought, measured

Of the seven packages `docs/Package_Census.md` ranked as blocked by the typing
gap, **two now import from the venv** (`typing-extensions` 4.16.0 and
`pathspec` 1.1.1, both with `__file__` verified under
`/tmp/typing-venv/lib/python3.14/site-packages/`). The other five moved to the
gaps the census's stubbed probe predicted were behind this one: `anyio` to
`signal.Signals` (G9), `h11` and `httpcore` to `__class__` assignment (G12),
`litellm` to the nested `from X import *` codegen bug (G1), and `pydantic-core`
to the fatal `dlopen` of its real C extension (G4, out of scope). None of the
five is still blocked on typing.

`typing-extensions` is the one that matters beyond its own row: it is a
dependency of much of the modern ecosystem, and it was the package whose
failure named `_Final`.

## FIXED: `typing.overload` recursed forever — a module-level alias cannot capture a name a later top-level `def` rebinds

This root-causes, and removes, the one conformance regression recorded above as
"`test.test_warnings` gains one error ... it was not root-caused further". That
paragraph's bisection was right about the file and wrong about the mechanism:
nothing about `DeprecatedTests`' base chain was involved, and the recursion was
not deep-but-finite. `typing.overload` recursed **unconditionally, for every
caller**, and `test_dunder_deprecated` is simply the only test in the corpus
that calls it.

### The defect

The GRAIL DEVIATION 2 block at the foot of `src/python/stdlib/typing.py`
replaces `overload` so that it answers the function unchanged instead of
`_overload_dummy` (a top-level `def` cannot clear a module attribute slot a
decorator wrote, so the dummy would poison every later call — see "A top-level
def cannot rebind a decorated name"). It was written the obvious way:

```python
_grail_cpython_overload = overload          # keep the original

def overload(func):
    _grail_cpython_overload(func)           # ... still register
    return func
```

Under Grail that is not a wrapper, it is an infinite loop. **A top-level `def`
compiles to a METHOD on the module class**, so both `def overload` statements in
the file compile onto the same `overload:` selector, and the later one wins —
for every reader of the name, *including the module body executing above it*. By
the time `_grail_cpython_overload = overload` runs, `overload` already resolves
to the method compiled from the second def. Measured directly:

```
grail_cpython_overload class = BoundMethod
selector = #'overload'
receiver = atyping( #'__name__'->'typing', ...)
overload class = BoundMethod
ov selector = #'overload'
same = true
```

`typing.overload(42)` then exhausted the Smalltalk stack — at
`GEM_MAX_SMALLTALK_STACK_DEPTH=80000` it reached depth 78965 before the yellow
zone converted it to `RecursionError`. The stack is unambiguous, four frames
repeating ~2300 times:

```
9142 typing >> overload:                    (envId 1) @5 line 6
9143 typing (Object) >> _perform:env:withArguments: @1 line 13
9144 typing (Object) >> perform:env:withArguments: (envId 1) @4 line 19
9145 BoundMethod >> value:value:            (envId 1) @40 line 55
9146 typing >> overload:                    (envId 1) @5 line 6
...
9166 [] in DeprecatedTests >> test_dunder_deprecated (envId 1) @278 line 82
```

and line 6 of the generated `overload:` is exactly the alias call:

```smalltalk
(self @env1:___moduleAttrLoad___: #'_grail_cpython_overload') @env1:value: { (func). } value: nil.
```

The collateral damage was larger than the one test: because control never
reached the registration, `_overload_registry` stayed empty and
`typing.get_overloads` answered `[]` for everything.

### The general rule

**There is no spelling of "the previous `def` of this name" in a Grail module.**
Python's own escapes — a closure over the old function, a default-argument
capture, a module-level alias — all *read the name*, and under Grail the name
already denotes the last `def` before the module body starts running. This is
the mirror image of the known "a top-level `def` cannot rebind a decorated
name": there, a `def` cannot displace a slot; here, a slot cannot see past the
`def`. Any vendored module that wants to wrap one of its own top-level functions
has to **copy the body, not call it**.

### The fix

`overload`'s four lines of registry work are copied verbatim from CPython's
`overload` into the deviation, and the alias is gone. Everything above the
DEVIATION line stays byte-for-byte CPython. `test.test_warnings` goes from
7 fail / 4 err back to 7 fail / **3** err, matching the pre-vendoring baseline,
and `DeprecatedTests.test_dunder_deprecated` passes — which also demonstrates
`get_overloads` working, since that test asserts two registered stubs.

Two checks in `tests/python/typing_surface.py` now pin it
(`get_overloads_reads_back_what_overload_registered`,
`get_overloads_is_empty_for_a_plain_function`). Both had to be written against
the REGISTRY rather than the return value: Grail's `overload` answers the
function and CPython's answers `_overload_dummy`, so a return-value check could
not agree with CPython, and the fixture gate requires that it does.

## `docs/Issues.md merge=union` does not work on GitHub

Added (PR #747) so that concurrent branches each appending a findings section
would not conflict. It does that **locally** and only locally: a
`.gitattributes` merge driver is applied by the git that runs the merge, and
GitHub's server-side merge does not apply this one.

Measured 2026-08-31. Ten PRs were open; eight of them appended a section here.
Replaying the merge queue's own order locally, with the union driver active,
exactly one PR conflicted -- a genuine `typing.py` collision between two
branches. Replaying the same order in a clone with the driver disabled
reproduced the queue's failure set precisely:

```
ok        fix/data-descriptor-set        (750)   -- does not touch Issues.md
CONFLICT  fix/sys-stdout-console-stream  (751)   -> docs/Issues.md
CONFLICT  fix/grail-launcher-...         (752)   -> docs/Issues.md
ok        measure/package-census         (753)   -- does not touch Issues.md
CONFLICT  fix/symbol-hash-eq             (754)   -> docs/Issues.md
...
```

The correlation is exact: **the only two PRs the queue accepted were the only
two that left this file alone.**

The attribute is kept, because it makes the local resolution automatic and
correct: `git merge origin/main` then push clears the PR without anyone reading
a diff. What it cannot do is prevent the collision, so it does not help when
several branches are in flight at once.

**How to work with it.** While a branch is one of several in flight, keep
findings out of this file; land them in a separate docs PR after the code
merges. That is what was done here -- the eight sections above were stripped
from their branches and rewritten together, which is also how the two
contradictions between them were caught (see the corrections noted inside the
`from X import *` and `typing.py` sections).

The durable fix, not done here because it would conflict with everything
currently in flight: one file per finding under `docs/issues/`, so concurrent
lanes never touch the same path.

## FIXED: TypedDict `total=` under the VENDORED typing.py — and the three reasons it is not a keyword-plumbing bug

Written while merging #758 (vendor CPython 3.14.6's typing.py, 208 names) with
#757 (a hand-built `TypedDict` that consumes `total=`). The two were assumed to
be duplicates, with #758's vendored `_TypedDictMeta` subsuming #757's factory.
They are not, and the reason is worth recording because the obvious diagnosis
is wrong and was believed by three separate write-ups, this file included.

**THE OBVIOUS DIAGNOSIS, AND WHY IT IS WRONG.** `class P(TypedDict, total=False)`
under the vendored file was reported as "Grail does not deliver class keywords
to the metaclass `__new__`, so `_TypedDictMeta` never sees `total=` and it falls
through to `object.__init_subclass__`, which rejects it". Measured on the merge
of #758 with current main: **the keyword is delivered.** `P.__total__` is
`False`, `Movie.__total__` is `True`, `total` is per-class and not inherited,
and a typo beside it (`total=False, tootal=True`) is still the TypeError PEP 487
promises. Four of the twenty checks in `tests/python/typed_dict_total.py` are
exactly that question and all four were already green.

What #757's `Object.gs` work fixed was the `__init_subclass__` search, not the
keyword route; the keyword route was already there in
`object >> ___grailDispatchMetaclass___`, which stashes the header keywords and
passes them as `kw: hdrKw`.

**THE PLUMBING GAP THAT REMAINS IS NARROWER THAN THE `## OPEN: metaclass
class-keyword plumbing` SECTION ABOVE SAYS, AND IS GATED ON A DEFAULT.**
That section's first bullet says a metaclass `__new__` declaring a class keyword
as a named parameter breaks. Measured, both spellings, on current main:

```python
class M1(type):
    def __new__(cls, name, bases, ns, otherarg):      # NO default
        ...
class C1(metaclass=M1, otherarg=1): pass
# Grail:   TypeError: type.__new__() argument 3 must be dict, not SmallInteger
# CPython: builds it

class M2(type):
    def __new__(cls, name, bases, ns, otherarg=99):   # WITH a default
        ...
class C2(metaclass=M2, otherarg=1): pass
# Grail:   builds it, otherarg=1        <-- works
# CPython: builds it, otherarg=1
```

So the defect is not "a named parameter", it is "a named parameter **with no
default**" — the 5-parameter def called with 4 positional plus 1 keyword picks
the wrong selector only when there is no default to make the 4-argument arity
legal. CPython's `_TypedDictMeta.__new__(cls, name, bases, ns, total=True)` has
a default, which is why `total=` works and why the whole "keywords do not
arrive" story survived as long as it did: nobody had measured the shape that
actually matters.

**WHAT DOES BREAK THE VENDORED `_TypedDictMeta`.** Three things, none of them
about keywords, each Grail-wide rather than anything about `typing`:

1. **`type.__new__` cannot rewrite the bases.** Grail compiles the class body
   onto a real Smalltalk class BEFORE any metaclass hook can run, so
   `type.__new__(cls, name, (*generic_base, dict), ns)` answers the class
   already under construction and the `dict` in that tuple is dropped.
   `___grailDispatchMetaclass___` says so in as many words. Consequence:
   `issubclass(TD, dict)` is False.
2. **The namespace handed to a metaclass `__new__` carries no annotations.**
   Measured: Grail gives `{'__doc__'}` plus the names the body ASSIGNED. A bare
   `x: int` binds no name, so neither `ns['__annotations__']` (Python <= 3.13)
   nor PEP 649's `__annotate_func__` (3.14) is there to find. The vendored
   `own_annotations` is therefore `{}` and **every key set comes out empty** —
   `__required_keys__` and `__optional_keys__` are `frozenset()` for every
   TypedDict written as a class statement.
3. **Annotations are never EVALUATED.** `Cls.__annotations__` reads back the
   SOURCE TEXT — `'NotRequired[str]'`, a `str` — where CPython 3.14 hands over a
   `_GenericAlias`. So `_get_typeddict_qualifiers`, which unwraps by
   `get_origin`, cannot see a qualifier at all: `Required`, `NotRequired` and
   `ReadOnly` silently do nothing.

Measured score for the vendored path against CPython 3.14.6, on
`tests/python/typed_dict_total.py`: **9 of 20**. The only spellings that worked
were `total`/`__total__` (see above) and the functional
`TypedDict('Name', {...})` form — which works precisely because that form builds
its own namespace with `__annotations__` in it, sidestepping (2) and (3).

**A CORRECTION TO THE `## Vendoring CPython's typing.py` SECTION.** That section
and the comment it put in `src/python/stdlib/typing.py` both stated that
TypedDict did not need replacing, on the grounds that "what callers ask a
TypedDict for is `__annotations__`, `__required_keys__` and `is_typeddict`, and
those the vendored path computes correctly". Two of those three were wrong:
`__required_keys__` was empty and `__annotations__` dropped every inherited key.
The claim was reasoned about rather than measured. The comment is now corrected
in the file itself.

**RESOLUTION.** Route B, on the evidence above: the vendored TypedDict
machinery is excised and #757's design stands in for it as `GRAIL DEVIATION 3`,
next to the `NamedTuple` deviation it mirrors and for the same root cause (a
metaclass that rewrites its bases). Fixing (2) alone is plausibly bounded;
(3) is PEP 649 lazy-annotation evaluation for the whole corpus, and (1) is the
class-construction inversion the codebase already documents as out of reach.
Any one of the three leaves TypedDict broken, so no bounded plumbing fix
reaches this. After the splice: `typed_dict_total.py` 20/20,
`typing_surface.py` 30/30, `vars(typing)` 217 names, public surface 120 —
identical to CPython 3.14.6's.

## Binary-operator TypeErrors name GEMSTONE classes, not Python types

Measured 2026-09-03, while finishing `test_builtin`'s `test_sum`.

```python
1 + {}          # CPython: unsupported operand type(s) for +: 'int' and 'dict'
                # Grail:   unsupported operand type(s) for +: 'SmallInteger' and 'PyDict'
10**30 + {}     # Grail:   ... 'LargeInteger' and 'PyDict'
1.5 + {}        # Grail:   ... 'SmallDouble' and 'PyDict'
True + {}       # Grail:   ... 'Boolean' and 'PyDict'
'a' + 1         # Grail:   ... 'Unicode7' and 'SmallInteger'
[] + 1          # Grail:   ... 'OrderedCollection' and 'SmallInteger'
```

Every arithmetic and bitwise operator is affected, on both operands: `+ - * /
% ** & | ^ << >>` all route through `___binOpFallback___:op:reflected:`, which
builds the message from `class name`. **The COMPARISON path already gets this
right** -- `1 < {}` answers `'<' not supported between instances of 'int' and
'dict'`, exactly CPython's text -- so a correct Python-type-name helper exists
in the tree and the arithmetic path simply does not call it. That is what makes
this cheap to fix rather than a design question.

It matters beyond cosmetics because these strings are what
`assertRaisesRegex(TypeError, ...)` matches on, and a test that pins the
message is the normal way the corpus checks an operator refuses a type. It is
also what a user sees first when their own code is wrong, and `SmallInteger` is
an answer to a question they did not ask.

Three CPython messages are additionally SPECIAL-CASED and Grail gives the
generic one instead:

```python
'a' + 1     # can only concatenate str (not "int") to str
[] + 1      # can only concatenate list (not "int") to list
() + 1      # can only concatenate tuple (not "int") to tuple
1 ** {}     # unsupported operand type(s) for ** or pow(): 'int' and 'dict'
```

(`b'a' + 1` -- "can't concat int to bytes" -- is already right, so the pattern
is understood here, just not applied to the other three.)

## `float` ⊕ a too-large `int` answers `inf` instead of raising

Measured 2026-09-03. The last remaining assertion in `test_builtin`'s
`test_sum` after PR #815.

```python
float(10**1000)   # both:   OverflowError: int too large to convert to float
1.0 + 10**1000    # CPython: OverflowError;  Grail: inf
10**1000 + 1.0    # CPython: OverflowError;  Grail: inf
(10**1000) / 1.0  # CPython: OverflowError;  Grail: inf
sum([1.0, 10**1000])  # CPython: OverflowError;  Grail: inf
```

The explicit conversion is RIGHT (`int >> __float__` checks `_getKind == 3` and
raises), so the defect is precisely that mixed-type arithmetic never goes
through it: `int >> __add__:` and `float >> __add__:` both test `other isKindOf:
Number` and hand off to GemStone's `+`, which coerces the LargeInteger to a
double and overflows to an IEEE infinity.

Not fixed here because the blast radius is the wrong shape for a small change:
the coercion is in every arithmetic method on both `int` and `float`, and it is
the hottest path in the system, so the fix is one guard applied in a dozen
places and wants its own measurement. `sum([1j, 10**1000])` is ALREADY correct
-- complex goes through a conversion that checks -- which shows the guard's
shape.

## `__builtins__` is not a name in any module

Measured 2026-09-04, while fixing the `global`-shadows-a-builtin fallback (PR
for `test_builtin` `test_all` / `test_any`). Distinct root, left open.

```python
__builtins__          # CPython: the builtins module (or its dict)
                      # Grail:   NameError: name '__builtins__' is not defined
```

CPython injects `__builtins__` into every module's globals; Grail never binds
it. This is NOT covered by the builtins fallback that PR fixed, and could not
be: `__builtins__` is not itself a name in `builtins.__dict__` — it is a name
CPython puts in each MODULE's globals, so the fix belongs in module
initialisation (or in `module >> ___globalAt___:otherwise:`), not in the
builtins lookup.

The reason it was not just added: **CPython's own answer depends on how the
module was loaded**, and the language reference calls the variable an
implementation detail that should not be relied on. Measured on 3.14.7:

```
python3 -c '...'                    module
runpy.run_path(...)                 dict
imported as a module                dict
```

So "bind `__builtins__`" is a choice between two answers, not a transcription,
and the choice is only observable through code that inspects it — which is
exactly what the tests wanting it do (`test_builtin` `test_callable` asserts
`callable(__builtins__)` is False, which either answer satisfies).

Worth doing, but as its own change: `test_exec_globals_frozen`, the other test
that reads it, needs far more than the name — a custom `__builtins__` MAPPING
honoured by `exec`, `__build_class__` resolved through it, and real code
objects from `compile()`.

## Five `IMPORTERROR` modules blamed on "a missing file": only one of them was

Measured 2026-09-04. Five wired CPython modules score `IMPORTERROR` with a
detail that names a file Grail does not vendor, which reads like five copies
away from running. Copying all five verbatim from CPython 3.14.7 and measuring:

| vendored | module | result |
| --- | --- | --- |
| `test/test_contextlib.py` | `test_contextlib_async` | **runs** — 58 tests, 25 pass |
| `zipapp.py` | `test_zipapp` | runs, but 27 of 30 errors are one missing capability |
| `importlib/machinery.py` | `test_linecache` | still IMPORTERROR: `No module named 'importlib._bootstrap'` |
| `xml/sax/xmlreader.py` | `test_sax`, `test_pulldom` | still IMPORTERROR: `cannot import name 'make_parser'` / `'handler'` from `xml.sax` |
| `test/pickletester.py` | `test_pickle` | still IMPORTERROR: `unknown Unicode character name: EMPTY SET` |

So the "just vendor it" reading was right ONCE. The other four each hit a real
dependency, and the three still-failing ones are listed below because each is a
different KIND of obstacle and only one of them is about pickling, SAX or
linecache at all.

### `importlib.machinery` is not vendorable — Grail's importlib is not CPython's

`machinery.py` is nothing but re-exports from `importlib._bootstrap` and
`importlib._bootstrap_external`. Grail has no `_bootstrap` (its import system is
Smalltalk, in `src/smalltalk/Python/importlib.gs`) and its `_bootstrap_external`
does not define most of the names the re-export list asks for. A `machinery`
that works here has to be WRITTEN against Grail's importer, not copied — and
first someone has to decide what `SourceFileLoader` even means when loading a
module compiles it to Smalltalk methods.

### `xml.sax` needs a parser, not a file

`xmlreader.py` supplies the abstract `XMLReader`/`InputSource` interfaces.
`test_sax` and `test_pulldom` fail on `make_parser` and `handler`, which need
`xml.sax.handler`, `xml.sax.expatreader` and an expat binding underneath. That
is an XML parser port, not a vendoring.

### FIXED: `\N{EMPTY SET}` — a tokenizer gap that was in TWO places

`pickletester.py` contains one named-character escape, and Grail's tokenizer
could not resolve it:

```python
non_ascii_str = "\N{EMPTY SET}"   # SyntaxError: unknown Unicode character name
```

`PythonTokenizer >> ___unicodeNameToCodePoint___:` resolved `\N{...}` against a
HAND-CURATED table of 33 names whose comment said "extend the table as needed",
and `src/python/stdlib/unicodedata.py` carried a SECOND hand-curated copy of
substantially the same table for `unicodedata.lookup`. Two curated lists of the
same data, each with a comment asking the next person to keep them in sync.

Both are gone. `scripts/generate_unicode_names.py` now generates
`src/smalltalk/Python/unicode_names.gs` from the UCD: 34137 stored names plus
65 control aliases, with the 114716 Hangul syllables and hex-suffixed
ideographs COMPUTED rather than stored, exactly as CPython splits them.
`unicodedata.name()` exists for the first time as a result, since the reverse
map comes free.

**`test_pickle` is still IMPORTERROR**, but for entirely different reasons — the
escape was the first of four blockers, not the only one. Measured by vendoring
each dependency in turn and re-running:

```
"\N{EMPTY SET}"        FIXED here
No module named 'dbm'          -> vendorable (dbm/__init__.py + dumb.py)
No module named 'pickletools'  -> vendorable (one pure-Python file)
'pickle' object has no attribute 'bytes...'   -> a real gap in Grail's pickle
```

The first three are files; the fourth is not, so `test_pickle` needs work on
Grail's own `pickle` before vendoring the other two buys anything. They were
deliberately NOT shipped with the Unicode change: three files with no consumer
that still leave the module at IMPORTERROR are maintenance surface for no
measurement.

### `zipapp` runs, and says Grail cannot write a zip file

Vendored and then WITHDRAWN rather than shipped. With `pathlib` grown to match
(this change), `test_zipapp` runs 35 tests: 5 pass and **27 of the 30 errors are
one line** —

```
NotImplementedError: Grail's zipfile is read-only; mode 'w' is not implemented
```

Creating archives is what `zipapp` is FOR, so the module cannot do better than
about 15% until `zipfile` learns to write. Shipping it would have bought 5
passing tests and added 27 identical errors to every nightly, forever, to say
something this paragraph says once. Vendoring it is a two-minute follow-up the
day `zipfile` grows a writer — at which point it becomes a real measurement.

### FIXED: `AsyncExitStack` was an alias for the synchronous `ExitStack`

`contextlib.py` said so itself (`AsyncExitStack = ExitStack`, with a comment
admitting a caller that awaits it "will not get what it asked for"), and it was
26 of `test_contextlib_async`'s 33 failures.

Both are now PORTED from CPython 3.14 rather than approximated, and the
synchronous one needed it more than the async one: it passed `(None, None,
None)` to every callback and wrapped each in `except Exception: pass`, so a
context manager could not see the exception, could not suppress it, and an
exception raised BY a cleanup vanished. `test.test_contextlib_async` goes
**33 -> 20** fail+err.

Every language feature the upstream text needs was measured working in Grail
first -- `*args`/`**kwargs` unpacking, `sys.exception()`, `types.MethodType`
over an unbound dunder, `__traceback__`, and a bare `raise` preserving
`__context__`. The "Grail's call-site `*`-unpack isn't ready" comment that
justified the crippled `callback()` was **stale**.

The remaining 20 are two Grail defects that the port surfaced, both below.

## FIXED: a `*args`-only method did not override a fixed-arity inherited one

```python
class Mixin: pass
class ACM:
    def __exit__(self, exc_type, exc_value, traceback): return 'BASE'
class Sub(Mixin, ACM):
    def __exit__(self, *d): return 'OWN'

Sub().__exit__(None, None, None)   # was 'BASE', now 'OWN'
```

`ClassDefAst` emits fixed-arity forwarders for exactly this hazard, but
`FunctionDefAst >> fixedArityForwarderArities` enumerated NAMED positional
parameters and a `*args` def has none, so `needsFixedArityForwarders` excluded
them outright -- "the positional arity is unbounded, so the set of forwarders
cannot be enumerated". True, and beside the point: the set that matters is the
arities the SUPERCLASS implements, and each emitted forwarder is already
wrapped in `___grailSuperImplements___:`, so a candidate the base does not have
is never compiled. Candidates now run to four past the named parameters
(`___varargForwarderReach___`).

### And the trap that came with it: a forwarder is a trampoline

Fixing the above regressed `test_with` into `RecursionError`, and the reason is
worth keeping. A forwarder's whole body is a VIRTUAL re-send of the varargs
form -- which is right for a virtual call and wrong for an unbound one:

```python
class Over(Base):
    def __exit__(self, *a):
        return Base.__exit__(self, *a)     # asks for BASE's implementation
```

`UnboundMethod >> _resolveMethodNargs:kwOk:from:` resolved the fixed-arity
selector, found the new forwarder, and ran it -- and the forwarder re-sent
virtually, landing back on `Over.__exit__`. `test_with`'s `MockNested` is
exactly that shape and recursed until the stack ran out. The resolver now skips
forwarders, telling them apart by their method category, the same way
`___pyAttrLoad___` keeps an arity-0 forwarder from reading as a property getter.

## FIXED: a synthesized dunder is no longer a visible class attribute

`object` installs default `__enter__`/`__exit__`/`__aenter__`/`__aexit__`/
`__iter__`/`__contains__` and `PythonInstance` installs default
`__next__`/`__getitem__`/`__setitem__`/`__delitem__`, each a method whose body
raises the TypeError CPython's interpreter would raise. That is what makes
`with obj:` on a non-manager say the right thing -- and it made every type
answer every one of those attributes, where CPython's `object` has none of them.

The cost was that the standard "is this a context manager" probe --
`type(x).__exit__` inside `try/except AttributeError`, which is what
`contextlib.ExitStack.push` does -- answered yes for everything, so `push()`
registered plain functions as context managers.

The Smalltalk defaults stay exactly where they were; only the Python-visible
CLASS attribute is hidden, so `with`, `for` and subscripting still produce
CPython's messages. The test is on the OWNER rather than the name, so a class
that genuinely defines the dunder keeps it, as do builtins, `async def`
definitions (which land in the per-class dynamic store) and runtime assignment.

A bare class now answers `__eq__`, `__hash__`, `__lt__`, `__repr__`, `__str__`
-- CPython answers those five plus `__call__`, which Grail still lacks and
which is a separate, opposite-direction gap.

### FIXED: a hand-written metaclass's dunder is visible again

`class Owned(metaclass=Meta)` does NOT put `Meta` in `Owned`'s Smalltalk
metaclass chain -- `Owned`'s class is `Owned class`, whose superclass is
`PythonInstance class`. The association is recorded separately, in
`___grailMetaclass___`, and the branch of `___pyAttrLoad___` immediately after
the visibility guard resolves ordinary metaclass attributes through it.

The guard ran FIRST and asked only the two Smalltalk chains, so it hid an
attribute that the next branch was about to answer:

```python
class Meta(type):
    def __contains__(cls, item): return True
class Owned(metaclass=Meta): pass

Owned.__contains__     # CPython: Meta's bound method
                       # was: AttributeError.  Now: the bound method.
```

It now asks `___grailMetaclass___` too. Grail's own metaclasses were never
affected (`Color.__contains__` resolves through `EnumType`, which IS on the
Smalltalk chain), which is why only a hand-written `class Meta(type)` showed it.

## A metaclass dunder is found as an attribute but not used by the OPERATOR

Measured 2026-09-07. Distinct from the above and older than it: reading the
attribute works, invoking the operator does not.

```python
class Meta(type):
    def __contains__(cls, item): return 'META'
    def __iter__(cls): return iter(['a'])
    def __len__(cls): return 42
    def __getitem__(cls, k): return ('META', k)
    def __call__(cls, *a): return 'META-call'
class Owned(metaclass=Meta): pass

len(Owned)              # 42          -- works
Owned['k']              # ('META','k')-- works
'x' in Owned            # TypeError: 'type' object is not iterable
list(Owned)             # TypeError: 'type' object is not iterable
Owned()                 # an Owned instance, not 'META-call'
Owned.__contains__('x') # TypeError, though the attribute reads fine
```

**The split is explained by whether `object` has a DEFAULT for the name.**
`__len__` and `__getitem__` have none, so the env-1 send fails to find a method
and the doesNotUnderstand: path consults the recorded metaclass -- which is why
they work. `__iter__` and `__contains__:` DO have defaults on `object` (the ones
that raise CPython's "not iterable" TypeError), so the send resolves there and
never reaches the metaclass fallback. The default shadows the metaclass.

The fix is for those defaults to consult `___grailMetaclass___` before raising,
when the receiver is a class. Not done here because `object >> __iter__` and
`>> __contains__:` are on the hot path for every iteration and every `in` in the
corpus, no suite test currently needs it (`test_enum` passes because `EnumType`
is a Smalltalk metaclass, which the DNU path finds), and the change wants its
own measurement rather than riding along with an attribute-visibility fix.

`Owned()` ignoring `Meta.__call__` is a third thing again -- class
instantiation, not attribute lookup or operator dispatch.


## FIXED: a metaclass's `__iter__` and `__contains__` reach the operator

Measured 2026-09-07. Reading the attribute worked; invoking the operator did
not, and the split had a clean cause:

```python
class Meta(type):
    def __iter__(cls): return iter(['a'])
    def __contains__(cls, item): return item == 'yes'
    def __len__(cls): return 42
    def __getitem__(cls, k): return ('META', k)
class Owned(metaclass=Meta): pass

len(Owned)      # 42            -- worked
Owned['k']      # ('META','k')  -- worked
'yes' in Owned  # was TypeError: 'type' object is not iterable
list(Owned)     # was TypeError: 'type' object is not iterable
```

**Whether it worked depended on whether `object` carries a synthesized DEFAULT
for the name.** `__len__` and `__getitem__` have none, so the env-1 send missed,
`doesNotUnderstand:` consulted the recorded metaclass, and they worked all
along. `__iter__` and `__contains__:` DO have defaults -- the ones raising
CPython's "not iterable" / "not a container" TypeErrors -- so the send resolved
there and the metaclass was never asked. A default written to produce a good
error message had become the reason a correct program could not run.

Both defaults now consult `___grailMetaclass___` before raising. Not the
Smalltalk metaclass chain -- `class Owned(metaclass=Meta)` does not put `Meta`
there at all -- but the recorded association, which already walks the superclass
chain, so an inherited metaclass works too.

**The probe refuses an implementation owned by `object` or `PythonInstance`,
and that is not a detail.** A metaclass is itself a Python class and inherits
the same defaults, so an ungated lookup finds the default again -- and
performing it would re-enter the same method on the same receiver, forever.

Cost on the hot path is one `isKindOf:` test: `___grailMetaclass___` answers nil
for anything that is not a Behavior, and the receiver of an ordinary `in` or
iteration is an instance. That matters here because `object >> __contains__:` is
not merely an error path -- it IS the iterate-and-compare containment fallback
for every object with `__iter__` and no `__contains__`.

### Still open in the same area

Three things a metaclass still does not reach, each a different mechanism:

```python
next(Owned)     # TypeError: 'type' object is not iterable
                # Grail's next() goes through __iter__; CPython calls __next__
Owned()         # an instance, not Meta.__call__'s answer -- class
                # instantiation, not attribute lookup or operator dispatch
with Owned:     # __enter__/__exit__ need the same delegation, but their
                # attribute READ has to work first (PR #859)
```

## FIXED: `with SomeClass:` and `next(SomeClass)` reach the metaclass

Measured 2026-09-07, completing the thread the `__iter__` / `__contains__` fix
opened. Same cause, three different places, which is why it took three changes
rather than one edit:

* `__enter__` / `__exit__` / `__aenter__` / `__aexit__` are defaults on
  `object`, so they shadow the metaclass exactly as `__iter__` did, and take
  the same delegation.
* `__next__` is **not** on `object` at all -- a class whose metaclass defines
  one would have reached it through `doesNotUnderstand:` -- but a Python class
  inherits `PythonInstance`, which DOES carry a default, and that resolves the
  send first.
* even with that fixed, `next(x)` never sends `__next__` to a class:
  `builtins >> ___asIterator___:` diverts a receiver that does not answer
  `__next__` to its `__iter__`, and `___respondsTo___` cannot see a method on
  the metaclass. The bridge had to learn the same question.

### And a regression the fixture caught, live on main since the visibility fix

`with SomeClass:` on a class with no `__enter__` raised **`AttributeError`**
instead of CPython's context-manager `TypeError`.

`WithAst` fetches the protocol dunder with an attribute READ
(`___cm___ ___pyAttrLoad___: #'__enter__'`) and then calls it. Once a class
correctly stopped answering a dunder it does not define -- which is what
`ExitStack.push` needs -- that read began raising, and the raise escaped as the
error the user saw.

CPython does not have the attribute either (`type(Bare).__enter__` is an
`AttributeError` there too); its interpreter turns the missing slot into the
protocol message. So the fix is not to restore the attribute but to restore the
MESSAGE: `object >> ___grailProtocolAttr___:` is `___pyAttrLoad___:` with a miss
answering a `BoundMethod` on the raising default, and `WithAst`'s four emission
sites use it. `async with` inherits the same emission and is covered by it.

### Still open in the same area

* FIXED, and the diagnosis above was WRONG -- see the next section.
* `Owned()` still ignores `Meta.__call__`: class instantiation, a different
  mechanism from attribute lookup and operator dispatch alike.
* An exception raised inside `asyncio.run` escapes without passing through an
  enclosing `try/except`, which is why the negative `async with` case is not
  pinned in the fixture.


## FIXED: `async with` against a metaclass -- and the misdiagnosis that hid it

Recorded by the previous change as "an `async def` on a metaclass compiles to no
Smalltalk method, so the delegation cannot see it". **That was wrong**, and worth
recording as a wrong turn: an `async def` on a metaclass compiles to real
Smalltalk methods, `__aenter__` and `__aexit__:_:_:` (plus their `_name:kw:`
varargs forms), exactly like any other def. The claim was inferred from a
comment about `___definesProtocolMethod___:selectors:` rather than measured, and
one `methodDictForEnv: 1` would have refuted it.

The real cause is that `async with` never reaches `object`'s defaults at all.
`AsyncWithAst` emits a PREFLIGHT as the block's FIRST statement -- CPython's
`BEFORE_ASYNC_WITH` loads both halves before calling either, so a manager with
`__aenter__` and no `__aexit__` must refuse before the body runs -- and that
preflight, `PythonCoroutine >> ___checkAsyncCM___:`, asks
`___definesProtocolMethod___:selectors:`.

That probe looks in two places: the dynamic class-attribute store, and
`self class whichClassIncludesSelector:`. For a CLASS receiver, `self class` is
the SMALLTALK metaclass -- `Managed class`, whose superclass is
`PythonInstance class` -- and `class Managed(metaclass=Meta)` does not put `Meta`
there. So a class whose metaclass supplied the entire protocol read as supplying
none of it, the preflight refused, and the delegation added for `with` never got
a chance to run.

`___definesProtocolMethod___:selectors:` now also asks `___grailMetaclass___`.
One place, and it fixes the message builders too: the same probe is what decides
whether a context-manager error says "but it supports the context manager
protocol. Did you mean to use 'with'?".

### Still open in the same area

* `Owned()` still ignores `Meta.__call__`: class instantiation, a different
  mechanism from attribute lookup and operator dispatch alike.
## FIXED: a metaclass's `__call__` owns instantiation

Measured 2026-09-08, the last item in the metaclass thread.

```python
class CallMeta(type):
    def __call__(cls, *args, **kwargs): return ('META', args, kwargs)
class Owned(metaclass=CallMeta): pass

Owned(1, k=2)   # CPython: ('META', (1,), {'k': 2})
                # was:     a fresh ordinary Owned instance
```

`Owned(...)` is `type(Owned).__call__(Owned, ...)`, so a metaclass defining
`__call__` replaces `__new__`/`__init__` entirely. Grail went straight to
`__new__`/`__init__`, so the singleton and registry idioms built on this
silently produced a new ordinary instance every time -- the wrong-answer half
of a conformance gap, not the missing-error half.

**Two entry points had to ask.** `ClassDefAst` synthesizes a per-class
`value:value:` for user classes; built-in classes fall back to the one on
`object`'s class side. Which of the two a class happens to use must not decide
whether its metaclass runs.

The hook is emitted for **every** class, not only one written with a
`metaclass=` keyword, because a metaclass is inherited. The cost is one send
whose answer is CACHED per class -- resolving it means a SessionTemps read, a
superclass walk and a selector-family probe, none of which can happen per
object. Measured over five runs each way on a loop that does nothing but
construct 200000 objects: median **1.396s without, 1.422s with**, about 2 to 3
percent, and proportionally less wherever `__init__` does real work.

`super().__call__(...)` is the half that makes it usable -- almost every real
metaclass `__call__` does something and then delegates -- so `type >>
___call__:kw:` performs the ordinary construction. Its receiver is the class
being instantiated, which is the very method the hook guards, hence a BYPASS: a
set of classes currently delegating, consulted only once a handler is known to
exist. A set rather than a flag, so a `__call__` that constructs a DIFFERENT
class on the way still gets that class's own hook.

## A metaclass's class-body ATTRIBUTE is not reachable from the class

Measured 2026-09-08, found while writing the singleton fixture for the above.
Methods on a metaclass reach the class; data does not.
## FIXED: a metaclass's class-body ATTRIBUTE is reachable from the class

Measured 2026-09-08. Methods on a metaclass reached the class; data did not.

```python
class AttrMeta(type):
    registry = {}
    COUNT = 7
    def get(cls): return cls.registry
class Owned(metaclass=AttrMeta): pass

AttrMeta.COUNT   # 7 -- reading it off the METACLASS works
Owned.COUNT      # CPython: 7;  Grail: AttributeError
Owned.registry   # CPython: {};  Grail: AttributeError
Owned.get()      # CPython: {};  Grail: AttributeError -- cls.registry
                 #                       fails from INSIDE a metaclass method
```

`___pyAttrLoad___`'s metaclass branch already tries
`___meta ___classChainAttrLookup___:` first, and that answers nil: the value is
not in the metaclass's `___dynInstVars___` (probed directly), and
`meta class canUnderstand: #COUNT` is false -- so the class-body assignment
lands somewhere neither probe looks, even though reading it off the metaclass
itself works.

It matters because it is half of the canonical metaclass idiom: CPython's
singleton writes `_instances = {}` on the metaclass and reads it as
`cls._instances` from inside `__call__`. The fixture for the `__call__` fix
holds its registry at module level to work around exactly this, and says so.
class Owned(metaclass=AttrMeta): pass

AttrMeta.registry   # {} -- reading it off the METACLASS always worked
Owned.registry      # was AttributeError; CPython answers {}
Owned.get()         # cls.registry failed from INSIDE a metaclass method too
```

**Two stores, and the lookup knew one.** `ClassDefAst` compiles a class-body
`name = expr` to a class-side getter/setter PAIR, not to an entry in
`___dynInstVars___` -- so `AttrMeta.registry` resolved through the accessor
branch of `___pyAttrLoad___`, while `Owned.registry` reached the metaclass
branch, which consults `___classChainAttrLookup___:` and that walks only the
store the accessor branch does not use. Same value, two representations, and
the metaclass path knew about one of them.

The CATEGORY is what tells such a pair from an ordinary method, exactly as the
accessor branch uses it: `___grailIsClassAttrAccessorCategory___:` already
covers the four categories `ClassDefAst` emits these pairs under.
`whichClassIncludesSelector:` walks the metaclass's own class-side chain, so a
metaclass inheriting the assignment from another metaclass is found too.

It matters because it is half of the canonical metaclass idiom: a registry or a
singleton keeps its table on the metaclass and reads it as `cls._registry` from
inside a metaclass method, where `cls` is the USING class -- so the read has to
work from there and the WRITE has to land in the one shared dict. Both are
asserted, as is the ordering the new probe could most easily have broken: a name
the class itself binds shadows the metaclass's, a classmethod on the class beats
a metaclass method of the same name, and an INSTANCE still sees none of it.

## `str.center` / `ljust` / `rjust` reject their fill-character argument

Measured 2026-09-08, while checking whether a `test_decimal` gate row was mine.

```python
'ab'.center(6)        # '  ab  '   -- works
'ab'.center(6, '-')   # CPython '--ab--';  Grail TypeError:
                      # center() takes a different number of arguments
'ab'.ljust(6, '-')    # same
'ab'.rjust(6, '-')    # same
```

The one-argument form works, so only the optional `fillchar` is missing. It is
what stops `test.test_decimal` importing on Darwin -- the module scores
IMPORTERROR here with exactly that message, on a stashed baseline as well, so it
is not caused by any recent change.

The committed board records `test.test_decimal | ERROR | 368` from CI, which is
worth resolving rather than assuming a platform delta: either the module imports
on Linux by a route Darwin does not take, or the board row predates whatever
introduced this. The three methods are a small fix and unblock a 368-test module
if the former.

## FIXED: `center`/`ljust`/`rjust` — the fill character, and the odd pad

Measured 2026-09-09. Two defects, one loud and one silent.

**The loud one.** `str` had only the ONE-argument forms:

```python
'ab'.center(6, '-')   # TypeError: center() takes a different number of arguments
```

`bytes` had the two-argument forms all along, which is why the gap never
surfaced anywhere else.

**The silent one**, found while fixing the first and present in BOTH str and
bytes: the odd margin went to the wrong side. CPython's rule is

```
left = marg // 2 + (marg & width & 1)
```

so when the margin AND the width are both odd the extra character goes LEFT:

```python
'ab'.center(7, '*')   # CPython '***ab**';  Grail was '**ab***'
b'ab'.center(3, b'*') # CPython b'*ab';     Grail was b'ab*'
```

It had been wrong since long before the two-argument form existed and nobody
noticed, because the one-argument form pads with SPACES and nobody counts
spaces. The non-obvious half is that an odd margin with an EVEN width goes
RIGHT -- the rule is not "odd margin goes left" -- and the fixture pins both.

Also fixed, because these were the three methods being rewritten: a `bytearray`
receiver now answers a `bytearray`, as `upper` and slicing already did. These
three hardcoded `bytes`.

### FIXED: bytes methods that lost a bytearray receiver

`center`/`ljust`/`rjust` were not the only ones. Measuring the whole surface --
27 methods that answer a new bytes-like -- found **17 wrong**:

```
wrong   lower title capitalize swapcase replace strip lstrip rstrip
        zfill expandtabs split rsplit splitlines partition rpartition
        removeprefix removesuffix
right   upper center ljust rjust translate join slice + * copy
```

`upper` preserved the type while `lower` did not, from adjacent methods written
the same way -- so it was carelessness, not a design. The cause was a hardcoded
`bytes ___new___:` where the established idiom is `(self class) ___new___:`;
the fix is that substitution at 38 construction sites across 18 methods, and
deliberately NOT at the single-byte scratch operands, which are the right-hand
side of a concatenation and take their class from the accumulator.

`replace` was wrong for a DIFFERENT reason, worth separating: it answers
`new join: parts`, and `join` follows its RECEIVER -- which there is the
REPLACEMENT. So the result type tracked an *argument* rather than the object the
method was called on. `___asReceiverClass___:` coerces at the end and is a no-op
whenever the two already agree.

The silent kind: the bytes are right, so nothing fails until something
downstream mutates the result (a bytearray is mutable, a bytes is not) or checks
its type.

### EXPLAINED: why test_decimal imported on Linux but not on Darwin

Recorded first as unexplained, then chased down. `test.test_decimal` was
IMPORTERROR on Darwin arm64 with the `center()` arity error, while the committed
scoreboard -- refreshed from CI on Linux x86_64 -- carried it at 368 tests. Same
commit, same code, two answers.

The caller is platform-gated at both ends. `test_decimal.py`:

```python
if sys.platform == 'darwin':
    darwin_malloc_err_warning('test_decimal')
```

and the function itself, in `test/support/__init__.py`:

```python
def darwin_malloc_err_warning(test_name):
    if sys.platform != 'darwin':
        return
    ...
    print(msg.center(padding, '-'))     # <- the only two-argument center
```

So the two-argument `center` is reached ONLY on macOS. On Linux the call never
happens and the module imports; on Darwin it raised at import time and took the
whole module with it. Nothing in `_pydecimal.py` or the body of `test_decimal.py`
calls `center` at all, which is why grepping the obvious files found nothing.

Worth keeping in mind when a local gate and the CI gate disagree about a row:
the CPython test suite is full of `sys.platform` branches, and a defect behind
one of them is invisible to whichever platform does not take it.

## FIXED: `sys.implementation.cache_tag`, and the `join` bug it exposed

Measured 2026-09-09.

`cache_tag` names the bytecode-cache files an implementation would write --
`__pycache__/x.<tag>.pyc`. PEP 421 lets it be None when caching does not apply,
and Grail's was None, which is defensible on its face: nothing here writes a
.pyc.

It was the wrong answer anyway, because the tag is used for **path arithmetic**
far more than for reading files. `importlib.util.cache_from_source` raises on a
None tag, so every caller that merely wants to KNOW the path got an exception
instead of a string:

```python
importlib.util.cache_from_source('x.py')
# NotImplementedError: sys.implementation.cache_tag is None
```

CPython's own `test_reprlib` calls it in `_check_path_limitations`, purely to
compute the cached path's LENGTH for a Windows skip decision. It never opens it.
Five `LongReprTest` cases died in that helper, none of them about caching; three
now pass and the other two turn out to have entirely different roots the helper
had been hiding.

The tag is DERIVED from `name` and `version` (`<name>-<major><minor>`, so
`grail-314`) rather than written out, so the two cannot drift.

### And it exposed a real path bug, in both joins, in opposite directions

With a tag in place, `cache_from_source('x.py')` answered
`/__pycache__/x.grail-314.pyc` -- with a LEADING SLASH, because the first
component is the empty dirname of a bare filename. That turns a RELATIVE path
into an ABSOLUTE one.

`os.path` is Smalltalk (`os_path.gs`) and `posixpath` is vendored Python, so
they are separate implementations, and each was wrong in its own direction:

| | CPython | Grail was |
| --- | --- | --- |
| `os.path.join('', 'a')` | `'a'` | `'/a'` |
| `os.path.join('', '', '')` | `''` | `'/'` |
| `posixpath.join('a', '')` | `'a/'` | `'a'` |
| `posixpath.join('a', 'b', '')` | `'a/b/'` | `'a/b'` |

The Smalltalk one was missing CPython's `not path` guard, so it added a
separator after an EMPTY accumulator. The vendored Python one carried an
`if not p: continue` that CPython does **not** have -- skipping empty components
reads like a harmless tidy-up and is not, because the trailing separator it
drops is how a caller says "directory".

Both now follow CPython's rule exactly, and the fixture asserts the two AGREE,
since agreeing is the property that would have caught either.

### Still open: importlib.util.source_from_cache

The inverse of `cache_from_source` does not exist -- `importlib.util
.source_from_cache(...)` raises AttributeError. Nothing in the corpus needs it
yet, and it is a handful of lines whenever something does.

## FIXED: `x += y` could not find an `__add__` that has optional parameters

Measured 2026-09-09.

`Decimal(1) + 5` worked and `d = Decimal(1); d += 5` raised
`TypeError: unsupported operand type(s) for +: 'Decimal' and 'int'`. Same
class, same method, one spelling.

The five-line repro has nothing to do with decimals:

```python
class W:
    def __add__(self, other, context=None):
        return W(...)

W(1) + 5          # works
x = W(1); x += 5  # TypeError: unsupported operand type(s) for +
```

Take the `context=None` away and both spellings work. That third parameter is
the whole defect.

### Why a defaulted parameter changes which selector exists

A Python `def` compiles to one of two Smalltalk shapes:

| `def` | selector |
| --- | --- |
| `def __add__(self, other)` | `__add__:` |
| `def __add__(self, other, context=None)` | `___add__:kw:` |

and the second gets no fixed-arity `__add__:` forwarder either. That is
correct, not an oversight: `ClassDefAst` emits those forwarders so a varargs
override can be REACHED by a superclass's fixed-arity send, and `object` has no
`__add__:` to override — its binary operators go through `___binOpAdd___:`
instead. There is nothing for a forwarder to intercept, so none is emitted.

So `__add__:` is simply not a selector every class with an `__add__` has.

### The asymmetry

`object >> ___augmentedOp___:inplace:binary:` tries the in-place dunder and
falls back to the binary one. For the in-place half it probed BOTH shapes:

```smalltalk
(self ___respondsTo___: iSel)
    ifTrue: [ ... perform: iSel ... ]
    ifFalse: [
        iVa := ...  "___iadd__:kw:"
        (self ___respondsTo___: iVa) ifTrue: [ ... ]].
```

and for the binary half it performed `bSel` directly, with no varargs probe at
all. That send missed, and the MNU surfaced through `UndefinedObject`'s env-1
backstop as the "unsupported operand" TypeError — which is why the report named
the operator and never the arity.

`+` itself was fine throughout, because `___binOpAdd___:` has always probed both
shapes. Only the augmented form went through this method.

### What it cost

`_pydecimal`'s `Decimal` is exactly this shape — *every* arithmetic dunder there
takes an optional `context`:

```python
def __add__(self, other, context=None):
def __sub__(self, other, context=None):
def __mul__(self, other, context=None):
```

so every augmented assignment on a Decimal failed. `test.test_decimal` went
**3 fail + 14 err → 3 fail + 7 err**, seven tests fixed, all of them reporting
"unsupported operand" and none of them about decimal arithmetic in the sense the
message suggested.

### The NotImplemented half

The new branch honours a `NotImplemented` return by falling through to the
reflected probe, exactly as the in-place branch above it falls through to the
binary one. Without that, a defaulted-parameter `__add__` that DECLINES would
swallow the reflected operation its fixed-arity twin would have reached — a
second, quieter version of the same asymmetry.

### Most of the fixture is the regression half

This method has accumulated four behaviours that each have a defect behind
them, and a new branch in the middle of it is exactly the change that quietly
breaks one:

* `__iadd__ = None` disables the operator AND blocks the binary fallback
  (unlike a merely missing `__iadd__`);
* `__iadd__` returning `NotImplemented` falls through to `__add__`;
* an unbound local still raises `UnboundLocalError` — `nil` is Grail's
  unbound-local sentinel and must reach the final `perform:`, not the reflected
  branch, which would run `other.__radd__(nil)` and mis-report a `TypeError`;
* a receiver with no forward `__add__` at all (a bare iterator, not rooted at
  Grail's `object`) still reaches the right operand's `__radd__`.

All four are asserted individually rather than trusted.

## FIXED: `-x` answered the bound method instead of calling it

Measured 2026-09-09.

`-Decimal(45)` evaluated to `<BoundMethod object at 0x12f34a6>` rather than
`Decimal('-45')`. No exception, no warning — the wrong value simply flowed
onward, and `test_decimal` caught it only as an eventual `!=`.

All four unary operators were affected, and so were `len`/`hash`/`str`, on any
class whose dunder takes an optional parameter:

```python
class W:
    def __neg__(self, context=None): return W(...)

-W(45)    # <BoundMethod object at 0x...>   (CPython: W(-45))
```

Take the `context=None` away and it works — the same shape that caused the
augmented-assignment defect above.

### Why

`def __neg__(self, context=None)` compiles to `___neg__:kw:` with no 0-arg
`__neg__`. `UnaryOpAst` emits `-x` as the bare Smalltalk send `x __neg__`, which
missed and reached `object >> doesNotUnderstand:args:envId:`, where a branch
answered a `BoundMethod` for any 0-arg send whose class had a same-named
callable form — the varargs one included:

```smalltalk
"Unary selector with 0 args — return BoundMethod if class has any
same-named callable form (for `f = obj.method` patterns)."
((md includesKey: (s , ':') asSymbol)
    or: [... or: [md includesKey: ('_' , s , ':kw:') asSymbol]]])
    ifTrue: [^ BoundMethod @env1:receiver: self selector: aSelector].
```

### The branch was serving nobody, and a stale comment is why it looked otherwise

Its stated purpose was `f = obj.method`, and the method's own doc comment
explained that "our codegen emits attribute reads as `obj attr` (a unary message
send)". That has not been true for some time. `AttributeAst >>
___emitSmalltalkOn___` emits `value @env1:___pyAttrLoad___: #attr`, and that
helper probes every arity variant — the varargs form included — and makes its
own `BoundMethod`.

The one-line proof is that `k.zero` answers a bound method even though a real
0-arg `zero` exists; a bare send would have called it. So reads never arrive
here, and what did arrive was operators.

Both comments are corrected in place, since the stale one is what made the
branch look load-bearing.

The fixed-arity spellings still answer a `BoundMethod`: a class with only
`foo:` cannot satisfy a 0-arg call at all, so there is no call to prefer.

`test.test_decimal`: `test_unary_operators` fixed, and `test_implicit_context`
moved from a wrong-value assertion to a genuine `pow()` gap further along — a
fail→error swap that a count-based gate would have read as "no change".

## FIXED: a unary operator on a type with no such dunder

Found while writing the fixture for the varargs-dispatch fix above, left out of
it so that one very hot method changed one behaviour at a time, and fixed here.
Three defects met in this one message.

### 1. It was uncatchable

For a user-defined class, `-obj` raised a Smalltalk `MessageNotUnderstood`,
which Python code cannot catch:

```python
try:
    -NoUnary()
except TypeError:
    ...        # never reached; the module ABORTS instead
```

`doesNotUnderstand:args:envId:` did have the right TypeError, but it was gated
`(self isKindOf: PythonInstance) ifFalse:` — firing for `None` and the kernel
types and skipped for exactly the user-defined classes that needed it. The
comment said user-instance unary sends "stay on the attribute-semantics path",
the same stale premise corrected above: a bare 0-arg send is not an attribute
read.

**An error a program cannot catch is worse than a wrong message**, so this is
the half that mattered.

### 2. `abs()` had an empty message

`builtins >> abs:` raised a bare `TypeError signal` — right class, no message
at all — for every receiver kind, built-ins included.

### 3. The message leaked Smalltalk class names

Built from `self class name asString`, so it named the class backing the
built-in rather than the Python type:

| | Grail was | CPython |
| --- | --- | --- |
| `-'ab'` | `'Unicode7'` | `'str'` |
| `-[1]` | `'OrderedCollection'` | `'list'` |
| `-{}` | `'PyDict'` | `'dict'` |
| `-object()` | `'Object'` | `'object'` |

That is the exact bug `___pyDnuTypeName___` exists to prevent, in a message that
had never been converted to use it.

### The measurement

Nine receiver kinds × four operators, message text included. **9 of the 36 cells
matched CPython before; all 36 do now.** Each of the three defects hit a
different part of that grid, which is why the fixture varies both axes rather
than testing one operator on one class.

### The fix is split in two, deliberately

A kernel-backed receiver is refused EARLY, before any resolution is attempted,
because it has no Python class body that could still supply the dunder. A
`PythonInstance` is refused at the END of the 0-arg path, once the varargs,
classmethod and metaclass probes have all missed — otherwise the early exit
would shadow a dunder a user class really does define. A test covers exactly
that risk, in the varargs shape that only resolves late.

Both call one `___unaryOperandErrorMessage___:`, so the two wordings live in one
place: three operators name the GLYPH (`bad operand type for unary -: 'X'`) and
`abs()` names the FUNCTION (`bad operand type for abs(): 'X'`). That is
CPython's distinction, not a tidy-up.

`builtins >> abs:` keeps its `MessageNotUnderstood` handler as a fallback — the
DNU now raises this same TypeError from the same helper, so a missing `__abs__`
no longer reaches it — because an unhandled MNU out of `abs()` would be a worse
failure than a redundant guard.
The fix is to raise the unary TypeError at the END of the 0-arg path, after the
varargs, classmethod and metaclass probes have all failed, without the
`PythonInstance` exclusion — at that point nothing else can resolve the send.
Left out of the fix above deliberately, to keep a change to this very hot method
to one behaviour at a time.

## FIXED: a varargs-only `__index__` was invisible to every index guard

Measured 2026-09-09. Found by sweeping the whole dunder surface rather than by
chasing one failing test — see "how this was found" below, which is the part
worth reusing.

`def __index__(self, context=None)` compiles to `___index__:kw:` with no 0-arg
`__index__` — correctly, since `ClassDefAst` emits a fixed-arity forwarder only
to OVERRIDE a superclass method and `object` has no `__index__` to override.

Every index consumer guarded itself with a SELECTOR test:

```smalltalk
(index ___respondsTo___: #'__index__')
(index @env0:class @env0:whichClassIncludesSelector: #'__index__' environmentId: 1) ~~ nil
```

Both answer false for that shape, so the guard concluded the object was not
index-like and raised the sequence's own refusal:

```python
[10, 20, 30, 40][k]
# TypeError: list indices must be integers or slices, not IdxOpt
```

for a class that plainly has an `__index__`, and that `hasattr` agrees has one.
Nothing about `[10,20,30,40][k]` suggests that the parameter count of
`__index__` decides whether it works.

**Seventeen of twenty index consumers refused it.** Now sixteen of the
seventeen pass; the other four in the table were never about this (below).

### The fix, and the thing deliberately not done

Thirty-two guard sites across fifteen files now ask one predicate,
`object >> ___hasIndexDunder___`, which probes both shapes.

`___respondsTo___:` is **left alone**. It documents an exact equivalence to
`whichClassIncludesSelector:environmentId:`, it sits on a hot cached primitive,
and it is asked about many selectors for which the varargs form is not an
equivalent answer. Teaching it about varargs would have fixed this at the cost
of a contract every other caller relies on. The `__index__` protocol gets its
own predicate instead — one semantic, one name.

**Five of the thirty-one sites were nearly missed**: they spell the selector
unquoted (`#__index__` rather than `#'__index__'`), so a search for the quoted
form found twenty-six. `Int.gs` is the sharpest illustration of the whole
defect — its `__int__` branch already handles the varargs form, with a comment
about `fractions.Fraction`, and the `__index__` fallback three lines below did
not.

### How this was found — the sweep is the reusable part

Two earlier fixes in this family (`x += y` finding a defaulted-parameter
`__add__`, and `-x` calling a defaulted-parameter `__neg__`) each came from one
failing `test_decimal` case. Rather than take a third, the whole dunder surface
was swept at once: every dunder defined ONLY in the varargs shape, exercised
through its operator or protocol rather than by calling it — 46 cases across
binary forward, binary reflected, comparison, container, conversion, callable,
context-manager and iterator paths.

**45 of 46 passed.** The family was already closed except for exactly one hole,
and the sweep named it in a single run. It now reads 46 of 46.

That is a much better use of a run than fixing the next symptom: it produced
both the remaining defect and the evidence that there is not a sixth one hiding.

### Also: `str`'s refusal wording

CPython QUOTES the type name for `str` and nowhere else:

| | CPython |
| --- | --- |
| `[1,2][N()]` | `list indices must be integers or slices, not N` |
| `'ab'[N()]` | `string indices must be integers, not 'N'` |
| `(1,2)[N()]` | `tuple indices must be integers or slices, not N` |
| `b'ab'[N()]` | `byte indices must be integers or slices, not N` |

Grail matched three of the four exactly and dropped the quotes on `str`.

## `list.insert`, `list.pop` and `range()` never consult `__index__`

Found by the same sweep; **pre-existing and unrelated to the fix above**,
measured identical before and after it.

| | CPython 3.14 | Grail |
| --- | --- | --- |
| `[1,2].insert(k, 9)` | inserts | `MessageNotUnderstood` |
| `[1,2,3].pop(k)` | `3` | `MessageNotUnderstood` |
| `range(k)` | `[0, 1]` | `MessageNotUnderstood` |
| `range(0, k)` | `[0, 1]` | `MessageNotUnderstood` |

These fail for a `__index__` object in **either** shape, so they are not part of
the varargs family — they simply never coerce. `list >> insert:_:` does
`idx := index` and then `idx @env0:< 0`, an env-0 comparison on a Python object,
which is an uncatchable `MessageNotUnderstood` rather than a `TypeError` a
program could handle — the same catchability problem as the unary operators
above.

The fix is `___asIndex___` at the top of each, which is what every other
consumer already does. Left out of the change above because that one is a
mechanical guard rename with a uniform shape, and this is a behavioural change
to which arguments get coerced and to the resulting error wording; the two want
separate before/after tables.

## Grail accepts an `__index__` object where CPython wants a number

Also from the sweep, also pre-existing, and in the OPPOSITE direction from
everything above — Grail is more permissive than CPython:

| | CPython 3.14 | Grail |
| --- | --- | --- |
| `IdxPlain() + 63` | `TypeError: unsupported operand type(s) for +` | `2 + 63 = 65` |
| `sum([1,2], IdxPlain())` | `TypeError: unsupported operand type(s) for +` | `5` |

`__index__` is PEP 357's *index* protocol, not a general numeric coercion:
CPython uses it for subscripts, slices, `hex`/`oct`/`bin` and friends, and
NOT for arithmetic. Grail's `+` falls back to it, so code that would be
rejected upstream runs here — the kind of difference that only shows up as a
portability surprise, since nothing fails locally.

Not fixed here: narrowing a coercion is a riskier change than widening a guard,
and it wants its own measurement of what in the corpus currently relies on it.

## FIXED: an index ARGUMENT is now coerced through `__index__`, as a subscript was

Measured 2026-09-09. This is the defect the previous entry documented and left,
and sweeping it turned four consumers into **fourteen**.

`x[k]` honoured PEP 357. `L.insert(k, v)`, `L.pop(k)`, `range(k)`,
`s.find(sub, k)` and friends did not: they took the argument as given and went
straight to env-0 arithmetic on it.

### The failure was the bad kind

An env-0 send to a Python object is a Smalltalk `MessageNotUnderstood`, which
Python code cannot catch:

```python
try:
    [1, 2].insert(k, 9)
except TypeError:
    ...        # never reached; the module ABORTS instead
```

### Not the varargs family

Unlike the `__index__` guard defect above, this one fails for a plain
`def __index__(self)` too, because nothing was coerced at all. That is why the
fixture asserts **both** shapes at every consumer rather than treating the plain
one as a regression check.

| consumer | Grail was |
| --- | --- |
| `list.insert`, `list.pop` | `MessageNotUnderstood` |
| `list.index(v, start)`, `tuple.index(v, start)` | `MessageNotUnderstood` |
| `bytearray.pop` | `MessageNotUnderstood` |
| `range(k)`, `range(0,k)`, `range(0,3,k)` | `MessageNotUnderstood` |
| `str.find/index/count/startswith/endswith` with a start | `MessageNotUnderstood` |
| `bytes.find(sub, start)` | `MessageNotUnderstood` |

Index-argument conformance went from **34/48 to 44/48** on the sweep; the four
that remain are the `+` permissiveness below, reached through the probe's own
`k + N` arithmetic, not the argument path.

### Two shared choke points carried most of it

`SequenceableCollection >> ___pyIndex___:from:to:` serves `list.index` and
`tuple.index` at every arity, and one start/end normalization idiom repeats
across `str` and `bytes` seven times. `bytearray.insert` already coerced (via
`bytes >> ___coerceIndex___:`, itself an alias for `___asIndex___`) while its
own `pop` did not — the same one-line-apart inconsistency `Int.gs` showed for
`__int__` versus `__index__`.

### The ordering is load-bearing

`None` must be resolved to its default BEFORE coercing, and only for the SEARCH
methods, because CPython splits the two cases:

| | CPython |
| --- | --- |
| `'abcabc'.find('c', None, None)` | `2` |
| `'abc'.startswith('a', None)` | `True` |
| `[1,2].pop(None)` | `TypeError: 'NoneType' object cannot be interpreted as an integer` |
| `range(None)` | `TypeError: 'NoneType' object cannot be interpreted as an integer` |

So the search methods default `None` first and the positional ones correctly let
`___asIndex___` refuse it. Coercing uniformly would have turned every
`s.find(sub, None)` into a TypeError — which is exactly what a first cut of this
change did, and what the fixture's `None_is_still_a_legal_bound` check caught.

### Residual: `list.index` names the wrong TypeError

`[1,2,3].index(3, None)` answers CPython's
`slice indices must be integers or have an __index__ method`; Grail now answers
the generic `'NoneType' object cannot be interpreted as an integer`. Both are
TypeErrors and both are catchable — a strict improvement on the
`MessageNotUnderstood` this used to be — but the wording differs. Left as is
rather than threading a second message through the shared scan.

## FIXED: an unbound call above three arguments ran the SUBCLASS's method

Measured 2026-09-10, found while working on `test.test_subclassinit`.

`Base.method(instance, ...)` names the implementation it wants.
`UnboundMethod >> _resolveMethodNargs:kwOk:from:` builds the fixed-arity
Smalltalk selector for the argument count and performs it NON-virtually — and
the table that built it stopped at three:

```smalltalk
fixedSel := nargs = 0 ifTrue: [selector]
    ifFalse: [nargs = 1 ... nargs = 2 ... nargs = 3 ...
    ifFalse: [nil]]]].
```

`nil` means "no fixed form exists", so four or more arguments skipped to the
varargs branch — and the varargs form is the keyword-binding entry, whose last
act is a VIRTUAL self-send. A virtual send goes back down to the subclass:

| | Grail was | CPython |
| --- | --- | --- |
| `Base.m3(sub, 1, 2, 3)` | `'B3'` | `'B3'` |
| `Base.m4(sub, 1, 2, 3, 4)` | **`'S4'`** | `'B4'` |

The consequence is worse than a wrong answer, because the ordinary way to call
a parent explicitly is exactly that shape:

```python
class Sub(Base):
    def m4(self, a, b, c, d):
        return Base.m4(self, a, b, c, d)   # AlmostOutOfStackError
```

which recursed until the stack died at four arguments while working at three.
The guard that skips fixed-arity FORWARDERS — there precisely because a
forwarder re-sends virtually — had been protecting arities 1..3 and nothing
else. The selector is now generated for any arity.

### The same dispatch, in its sharpest form: a metaclass `__new__`

`def __new__(cls, name, bases, ns, extra)` is four arguments after `cls`. Its
body sits on the metaclass's INSTANCE side while the call has the metaclass
itself as receiver, so the send resolved up the METACLASS chain and found
`type`'s own `__new__` with every argument shifted one left —
`type.__new__() argument 3 must be dict, not SmallInteger`, for a metaclass
whose `__new__` had simply never run.

`type.gs` had been reporting that, with a comment ending "fixing the
forwarder's dispatch is its own change". It now REPAIRS the mis-forward
instead: it holds all four original arguments and the metaclass as receiver, so
it can finish the dispatch the self-send got wrong. The two cases are told
apart by whether the first argument is a Behavior — a genuine
`super().__new__(cls, ...)` passes the metaclass, the mis-forward passes the
class NAME.

### What that exposed: a test passing for the wrong reason

`test_super`'s `test___classcell___overwrite` builds a metaclass of exactly
that shape and expects a TypeError. It was getting one — from the shifted
`ns` tripping the dict guard, an error about the wrong argument entirely. With
the metaclass actually running, that accident disappears, and Grail turned out
never to have validated `__classcell__` at all.

`type.__new__` now raises CPython's own
`__classcell__ must be a nonlocal cell, not <class 'NoneType'>`, and the test
passes for the reason it is named after.

### Also fixed

* **`type.__new__` is positional-only.** `super().__new__(cls, name=n,
  bases=b, dict=ns)` is a TypeError in CPython
  (`takes exactly 3 arguments (0 given)`); Grail had no varargs entry on `type`,
  so the inherited one accepted it and built the class, and a metaclass written
  that way appeared to work while its keywords went nowhere. This is what
  `test_errors_changed_pep487` asserts, and it now passes.
* **`types.prepare_class`** was a stub answering `(type, {}, kwds)`. It now
  pops `metaclass`, computes the most derived one, and copies `kwds` — while
  still never CALLING the metaclass, which is the asymmetry
  `test_subclassinit` relies on.

`test.test_subclassinit`: 2 failures + 1 error → **1 failure + 1 error**.

## Still open in `test.test_subclassinit`, and why

Both remaining failures need work the codebase already scoped as larger jobs.

**`test_errors` — `types.new_class` cannot forward its keywords**, because
calling a metaclass to build a class does not work: `M('X', (), {})` for
`class M(type)` answers an INSTANCE of M rather than a class, so
`M(...).__name__` is an AttributeError. `new_class` therefore still builds with
`type` and ignores `kwds`; forwarding would replace a class built with the
wrong metaclass by an outright error. `prepare_class` beside it is now faithful,
so the pieces are in place for the day the call works.

**`test_init_subclass_diamond` — `super().__init_subclass__()` does not chain
along the MRO.** `object >> ___grailInitSubclassSearchBase___` already names
this test and says making the cooperative chain MRO-ordered "is the real fix and
is a larger job". Measured, it is worse than the one test suggests:

| | CPython | Grail |
| --- | --- | --- |
| `class Q(L, R)` sharing a base | `['r']` | `[]` — silently wrong |
| diamond with a middle hook | `['r', 'm']` | `[]` — silently wrong |
| three-deep cooperative chain | `['a', 'b']` | uncatchable `ImproperOperation` |

Only the first hook in the MRO runs; `super().__init_subclass__(**kw)` reaches
no further, because `super()` walks single-inheritance Smalltalk links.

## Keyword arguments in an unbound call still dispatch virtually

Found by the same sweep, pre-existing, and NOT the arity defect — it fails at
every arity, including one:

| | CPython | Grail |
| --- | --- | --- |
| `Base.m1(sub, a=1)` | `'B1'` | `'S1'` |
| `Base.m4(sub, 1, 2, 3, d=4)` | `'B4'` | `'S4'` |

Keywords force the varargs branch, whose re-send is virtual. Binding them
against a fixed-arity selector without going through that entry is the fix, and
it is the same job as the `__init_subclass__` chain in kind: the resolution is
right and the DISPATCH is what escapes.

Five or more arguments are also still virtual, for a different and harder
reason: GemStone's non-virtual `performMethod:` variants stop at four
(`with:with:with:with:performMethod:`) and there is no N-ary form, so the
resolver now finds the right method and cannot run it directly.
## FIXED: a note added while an exception propagated landed on a CARRIER

Measured 2026-09-10.

PEP 678 notes are attached to a caught exception on its way out — the codec
machinery adds `"encoding with 'X' codec failed"`, `__set_name__` one naming the
descriptor, `dict()` one naming the bad element.

Grail cannot always re-signal an exception instance: one with live frames raises
GemStone's "cannot be signalled again", so `BaseException >>
___signalCarrying___:` wraps it in a CARRIER — literally `payload class new`, a
fresh instance of the same class holding the real one. Handlers see the carrier;
Python sees the payload, because `___payloadOf___:` is, in its own words, "THE
ONE SANCTIONED CROSSING" back.

A note site that writes to the handler's exception without crossing back
therefore decorates an object nobody will ever look at.

### Why it hid

**A first raise needs no carrier.** The note landed on the real exception and
everything looked right. Only a SECOND raise of the SAME instance goes through
one — and `test_codecs`' `ExceptionNotesTest` does exactly that: it raises one
instance four times over, clearing `__notes__` between, precisely because the
codec cache stops it from making a fresh one. Every raise after the first found
the list empty, and `__notes__[0]` was an `IndexError`.

Measured before the fix, with one `RuntimeError` instance:

| | CPython | Grail |
| --- | --- | --- |
| raised twice through a codec | `[note, note]` | `[note]` |
| raised, `__notes__.clear()`, raised again | `[note]` | `[]` |
| encoded then decoded | `[encoding…, decoding…]` | `[encoding…]` |
| two different codecs, one instance | `[a, b]` | `[a]` |

The exception the handler received was a different object each time, with
`__notes__` unset — instrumenting the note site showed it running all three
times on three distinct receivers, which is what identified the carrier.

### Two of the three note sites were wrong

`Object >> ___grailNoteSetName___` already crossed back correctly, which is why
nobody had connected the symptoms. `importlib >> ___noteCodecFailure___:` and
`dict.gs`'s sequence-element note did not. All three are now asserted, the
already-correct one included.

`test.test_codecs`: **77 bad → 71**, six `ExceptionNotesTest` cases.

## `dict()` notes an element CPython leaves bare

Found while fixing the above; separate, and NOT fixed.

CPython adds "Cannot convert dictionary update sequence element #0 to a
sequence" when the element is **not iterable**:

```python
dict([1])          # TypeError, with the note
```

Grail also adds it when iterating the element raises something else entirely:

```python
class Boom:
    def __iter__(self): raise RuntimeError('m')

dict([Boom()])     # CPython: RuntimeError, no note.  Grail: note attached.
```

The note is meant to explain a conversion that could not start, not to annotate
an arbitrary failure from inside the element's own code. Narrowing it to
CPython's condition is a small change to `dict.gs`, kept separate because it
alters which exceptions get decorated rather than where the decoration lands.

## `DefaultObjectReprTestCase` is flaky

`testTwoObjectsOfOneClassNoLongerReadAlike` asserts that two distinct objects
have different `repr`s, which Grail derives from the object's address. It failed
once in a full sharded run and passed on the re-run and 3/3 in isolation, so it
is collision-dependent rather than ordering-dependent. Not investigated further;
recorded so the next person to see it does not go looking for a real defect.

## FIXED: the substituting error handlers ignored a lone surrogate

Measured 2026-09-10, working on `test_codecs`.

`'\xe4'.encode('ascii', 'replace')` answered `b'?'`, because
`CharacterCollection >> ___unencodable___:at:encoding:errors:reason:` decides
what an un-encodable code point contributes. A string holding a LONE SURROGATE
never reached it: that is a `PyStrSurrogate`, whose `encode:_:` handled
`surrogatepass`, `surrogateescape` and utf-7 and then refused outright.

So whether `replace` worked depended on **which** character could not be
encoded — a distinction CPython does not make. Nine codecs × four handlers:
**0/36 before, 36/36 now.**

### Substitute text, then encode once

CPython's encode handlers answer a replacement STRING, which the codec then
encodes like any other text. A first cut here assembled BYTES instead — encode
each ordinary run, concatenate the handler's bytes between — and that is wrong
twice over on a multi-byte codec:

| `'[\udc80]'.encode('utf-16', ...)` | |
| --- | --- |
| CPython | `b'\xff\xfe[\x00\\\x00u\x00d\x00c\x00...'` |
| byte assembly | `b'\xff\xfe[\x00\\udc80\xff\xfe]\x00'` |

— the escape left as raw ASCII among UTF-16 units, and a SECOND BOM where the
next run began. Both are asserted, which is why the fixture's grid covers
utf-16 and utf-32 rather than utf-8 alone.

The handler is passed on to the run rather than `strict`: a string can hold
both a non-surrogate the codec cannot encode and a surrogate (`'\xe4\udc80'` to
ascii), and CPython applies one policy to both.

`test.test_codecs`: 77 bad → 76. The count understates it — six
`test_lone_surrogates` cases moved from raising to asserting, then failed on
`surrogateescape` for the multi-byte codecs, which is the next root below.

## Still open in the surrogate family

Measured while fixing the above; each is its own root.

| | CPython | Grail |
| --- | --- | --- |
| `'\ud800'.encode('utf-16-le','surrogatepass')` | `b'\x00\xd8'` | `b'\xed\xa0\x80'` |
| `'[\udc80]'.encode('utf-16-le','surrogateescape')` | `b'[\x00\x80]\x00'` | `UnicodeEncodeError` |
| `b'\xed\xa0\x80'.decode('utf-8','surrogatepass')` | `'\ud800'` | `UnicodeDecodeError` |
| `b'\x00\xd8'.decode('utf-16-le','surrogatepass')` | `'\ud800'` | uncatchable `ST: OutOfRange` |
| `b'a\x80b'.decode('utf-8','replace')` | `'a�b'` | `UnicodeDecodeError` |
| `b'a\x80b'.decode('utf-8','backslashreplace')` | `'a\\x80b'` | `UnicodeDecodeError` |

1. **`surrogatepass` encode ignores the target codec.** It always answers the
   WTF-8 form, because `___wtf8Bytes___` is what the handler branch calls
   whatever the encoding is. It should emit the surrogate as the target's own
   unit — two bytes for utf-16, four for utf-32.
2. **`surrogateescape` encode does not reach the multi-byte codecs.**
   `___surrogateEscapeBytes___:` open-codes ascii, latin-1 and utf-8 by their
   maximum code point and hands everything else to the registry, which does not
   answer for utf-16/32.
3. **`surrogatepass` decode is unsupported everywhere**, and for utf-16 it fails
   as an uncatchable Smalltalk `OutOfRange` rather than a Python error.
4. **Decode-side `replace` and `backslashreplace` do not fire** — `ignore` does,
   so the decode handler dispatch is partial in a way the encode side no longer
   is.

## An unknown error-handler name raises the wrong exception

Pre-existing and wider than the surrogate work — it holds for a plain `str`:

| | CPython | Grail |
| --- | --- | --- |
| `'\xe4'.encode('ascii','bogus')` | `LookupError: unknown error handler name 'bogus'` | `UnicodeEncodeError` |
| `b'a\x80'.decode('utf-8','bogus')` | `LookupError` | `UnicodeDecodeError` |
| `'abc'.encode('ascii','bogus')` | `b'abc'` | `b'abc'` |

The last row is the subtlety: CPython consults the registry only when the
handler is actually needed, so a clean string encodes fine under a nonsense
handler name. `___unencodable___`'s own comment asserts that raising the codec
error "is what CPython does for an unregistered handler", which is not so —
recorded here rather than fixed alongside a change to which handlers fire.

## FIXED: namereplace, codec-aware surrogatepass, and an uncatchable UTF-16 decode

Measured 2026-09-10. Three findings from one thread, each uncovered by fixing
the one before it.

### 1. `namereplace` was unimplemented

`___unencodable___`'s comment said it "needs the Unicode character-name
database". Grail has one: `unicode_names >> ___nameForCodePoint:` is what
`unicodedata.name()` already answers from.

```python
'\xe4'.encode('ascii', 'namereplace')   # b'\\N{LATIN SMALL LETTER A WITH DIAERESIS}'
'[\udc80]'.encode('utf-8', 'namereplace')  # b'[\\udc80]'
```

A code point WITHOUT a name falls back to the backslash escape, which is
CPython's rule and is why a lone surrogate comes out identically under
`namereplace` and `backslashreplace` — the equality `ReadTest
.test_lone_surrogates` asserts for every UTF.

### 2. `surrogatepass` ignored the target codec

It always answered the WTF-8 form, so it was right for utf-8 by coincidence and
wrong for every other UTF:

| | CPython | Grail was |
| --- | --- | --- |
| `'\udc80'.encode('utf-16-le','surrogatepass')` | `b'\x80\xdc'` | `b'\xed\xb2\x80'` |
| `'\udc80'.encode('utf-32-be','surrogatepass')` | `b'\x00\x00\xdc\x80'` | `b'\xed\xb2\x80'` |

Each UTF now spells a surrogate the way it spells any other code point, with the
BOM written once for the unsuffixed spellings. A supplementary character is
still a surrogate PAIR in utf-16 — the handler changes what is allowed through,
not how the codec works. `ascii` and `latin-1` still refuse, and `utf-7` still
carries one natively (RFC 2152 encodes UTF-16 code units).

### 3. A UTF-16 decode of a lone surrogate was UNCATCHABLE

`Character codePoint:` refuses a surrogate — GemStone has no such Character — so
the decoder died with `OutOfRange` (2723) rather than a Python exception:

```python
try:
    b'[\x00\x80\xdc]\x00'.decode('utf-16-le')
except UnicodeDecodeError:
    ...        # never reached; the session's error path ran instead
```

It fired for **every** handler — `strict`, `replace` and `ignore` alike —
because the one-argument decode this runs under never receives them. utf-32
already raised properly; utf-16 now does too, with CPython's own `encoding`,
`start`, `end` and `reason` (`illegal encoding`), including the byte order plain
`utf-16` resolves to.

### The order is the lesson

Finding 3 was uncovered BY finding 1. With `namereplace` in place the UTF-16
tests got as far as `surrogatepass` and began dying uncatchably — six tests
moved from a Python error to a Smalltalk one, which is a worse module than
before even though the failure COUNT was unchanged. That is not a trade worth
shipping, so the decode raise is part of the same change rather than a
follow-up.

`test.test_codecs`: 77 bad → 75.

## Still open: a UTF-16 decode ignores its error handler

`replace` and `ignore` on a UTF-16 decode answer the `UnicodeDecodeError` above
where CPython substitutes:

| | CPython | Grail |
| --- | --- | --- |
| `b'[\x00\x80\xdc]\x00'.decode('utf-16-le','replace')` | `'[�]'` | `UnicodeDecodeError` |
| `... .decode('utf-16-le','ignore')` | `'[]'` | `UnicodeDecodeError` |

`bytes >> decode:_:` handles a few cases itself and otherwise delegates to the
one-argument `decode:`, which has no `errors` to consult — so `___pyDecodeUTF16___:`
cannot see the handler at all. Threading it through is its own change. Being
CATCHABLE was the part that could not wait, and is what the fix above delivers.

The same shape is presumably why `surrogatepass` decode is unsupported across
the UTF codecs; that entry above still stands.

## FIXED: `replace`, `ignore` and `backslashreplace` on a DECODE

Measured 2026-09-10.

Every builtin decoder is written to RAISE on ill-formed input, and the
one-argument `bytes >> decode:` they fall through to has no `errors` to consult
— so the substituting policies all behaved as `strict` for ascii, utf-16 and
utf-32, and for utf-8 everything but `ignore`. **Nine of thirty codec/handler
pairs agreed with CPython; twenty-five do now.**

### Re-entering the strict decoder, not teaching each decoder a policy

A strict decoder already reports an accurate `[start, end)` for the bytes it
choked on, which is the only thing a policy needs. Re-entry after each refusal
reproduces CPython's granularity for free:

| | CPython |
| --- | --- |
| `b'a\x80\x81b'.decode('utf-8','replace')` | `'a��b'` — two ranges |
| `b'a\xe2\x82'.decode('utf-8','replace')` | `'a�'` — one truncated sequence |
| `b'a\x80\x81b'.decode('utf-8','backslashreplace')` | `'a\\x80\\x81b'` — per BYTE |

### Three things the loop had to learn

1. **utf-32 did not say where.** Its raises carried a message and nothing else,
   so `exc.start` was None. Giving them positions also brought the STRICT
   wording into line with CPython's, which had drifted unnoticed because nothing
   read it — `surrogates not allowed` where CPython says `code point in
   surrogate code point range(0xd800, 0xe000)`.
2. **A decoder that still does not say where must be left alone.** punycode,
   unicode-escape, raw-unicode-escape and utf-7 raise without a range; without a
   guard, `nil > 0` turned each into an uncatchable `MessageNotUnderstood` —
   three tests went from a Python error to a Smalltalk one. They now keep
   raising exactly as before.
3. **A REGISTERED codec must reach the registry first.** Every `encodings.*`
   module implements its own policies and is only reachable through
   `___codecRoundTrip___`; running the loop before it sent such a decode into
   the one-argument form, which does not know those names —
   `b'xn--w&'.decode('punycode','replace')` became `LookupError` and broke a
   test that had been passing.

Points 2 and 3 were caught by the tier-2 name-level diff, not by the count: the
run that introduced them read **3 fixed** and would have looked like progress.

**A BOM is resolved once.** `utf-16` detects its byte order from a mark, and
decoding the remainder after an error would look for one again — in the middle
of the stream. The order is resolved and the mark dropped before the loop
starts.

`test.test_codecs`: 77 bad → 65 across this and the preceding codec changes.

## Still open: `surrogatepass` / `surrogateescape` on a UTF-16 or UTF-32 decode

The five cells of the thirty that remain. Both must answer a str CARRYING lone
surrogates — a `PyStrSurrogate` rather than an ordinary Grail string — so they
need the decoders to build a different KIND of result, not just a policy applied
to a byte range. `PyStrSurrogate class >> ___fromCodePoints___:` is the piece
that would do it.

## FIXED: the escape codecs, five roots deep

Measured 2026-09-11. Each root was found by fixing the one before it, and the
last two were found because the earlier fixes let the decoder get FURTHER and
die worse.

1. **`\<newline>` is a line continuation** — both characters go. It reached the
   unknown-escape arm, which keeps the backslash and rescans, so `b'[\\\n]'`
   decoded to `'[\\\n]'` where CPython gives `'[]'`. **LF only**: CPython does
   not continue on CR or CRLF.
2. **A lone trailing backslash is an error** in `unicode-escape` — though not in
   `raw-unicode-escape`, where a backslash beginning no escape is an ordinary
   byte.
3. **A supplementary code point encodes as `\UXXXXXXXX`.** The encoder emitted
   `\u` for everything above 255, so U+1D120 came out as `ᴒ0` — a
   five-digit `\u`, which is not an escape any reader accepts: decoding it back
   gives U+1D12 followed by `'0'`. `raw-unicode-escape` beside it had always
   chosen the width by the code point.
4. **The decode errors carried no positions**, so `exc.start` was nil — which is
   why `___decodeSubstituting___` had to leave these codecs alone and `replace`
   on a bad escape still raised. One rule now covers both ways an escape can
   fail: scan the hex digits that ARE there and report `i+1+avail`, because
   CPython does not distinguish a short escape from one with a non-hex digit.

   | | CPython |
   | --- | --- |
   | `b'a\uXYZW'` | `unicodeescape\|1\|3\|truncated \uXXXX escape` |
   | `b'a\uD'` | `unicodeescape\|1\|4\|truncated \uXXXX escape` |

5. **These codecs produce and consume lone surrogates**, which is the point of
   them: `b'\ud800'.decode('unicode-escape')` is U+D800 and encodes back to the
   escape under every handler, `strict` included. Building into a `Unicode32`
   stream could not express that — `Character codePoint:` refuses a surrogate —
   so the decoder died with an uncatchable `OutOfRange` (2723) the moment it
   reached such an escape. The same holds above U+10FFFF, which is not a
   character at all (`illegal Unicode character`, and `\Uxxxxxxxx out of range`
   for the raw codec — CPython's own asymmetry).

### Roots 4 and 5 are the lesson

Fixing the continuation and the truncation messages let the decoder reach
escapes it had never reached before, and it died there **uncatchably** — two
tests went from a Python error to a Smalltalk one while the failure COUNT
improved. Both are part of the same change rather than a follow-up, for the same
reason the UTF-16 decode raise was.

Two byte-assembly notes, both mistakes made and corrected here: the reason
strings were written `'truncated \\uXXXX escape'` in Smalltalk source, which is
two literal backslashes and had drifted from CPython unnoticed because nothing
read them; and the surrogate encoder first wrote the escape as TEXT and handed
it back to the codec, which escaped the backslash a second time.

`test.test_codecs`: 65 bad → 60.

## Still open: the INCREMENTAL escape decoder — FIXED below

The seven escape tests that remain are all `test_partial`, `test_readline` and
`test_incremental_*`. They feed bytes a chunk at a time, and an escape split
across a chunk boundary must be BUFFERED rather than raised on. That is the
incremental-decoder mechanism rather than the batch codec this entry fixes.

Fixed since; see *FIXED: the incremental escape decoder* at the end of this file.

## FIXED: `surrogatepass` on a DECODE

Measured 2026-09-11.

The strict decoders reject a lone surrogate — correctly — and there was no path
that did anything else, so **every** `surrogatepass` decode raised. Twenty-one
`test_codecs` cases were waiting on it: ten `test_incremental_surrogatepass`,
nine `test_lone_surrogates` and two `test_surrogatepass_handler`, spread across
every UTF class.

Each UTF spells a surrogate the way it spells any other code point — utf-8 the
three-byte WTF-8 form, utf-16 a bare 16-bit unit, utf-32 a bare 32-bit one — so
the new decoder reads them exactly as the strict one does and declines to reject
the result. It answers nil for a codec with no surrogate form, leaving the rest
of `decode:_:` to handle it as before.

**What made it possible** was `bytes class >> ___stringFromCodePoints___:`,
written one change earlier for the escape codecs: an ordinary Grail string
cannot hold a lone surrogate, so the answer has to be a `PyStrSurrogate`, and
that is the piece that decides which to build. The same block serves both, which
is the argument for having put it there rather than inline.

`test.test_codecs`: **60 bad → 46**, 14 tests.

The handler changes what is ALLOWED THROUGH, not how the codec works: a
supplementary character is still a surrogate PAIR in utf-16, and a high
surrogate not followed by a low one stays alone rather than swallowing the next
unit. Both are asserted, along with the encode/decode round trip that the
already-fixed encode half could not previously complete.

## An odd byte count under utf-16 is accepted — FIXED below

Found while writing the fixture above; **pre-existing**, measured identical with
and without that change.

| | CPython | Grail |
| --- | --- | --- |
| `b'a\x00b'.decode('utf-16-le')` | `UnicodeDecodeError: … truncated data` | `'a'` |
| `b'a\x00b'.decode('utf-16-le','replace')` | `'a�'` | `'a'` |
| `b'a\x00\x00\x00\x00'.decode('utf-32-le')` | `UnicodeDecodeError` | `UnicodeDecodeError` |

The utf-16 decoder's loop is `[i + 1 <= n] whileTrue:`, so a trailing odd byte
simply ends the walk and is dropped — silently, under every handler. utf-32
already checks its length and raises, so this is utf-16 alone.

Fixed since, together with a second and worse defect in the same decoder;
see *FIXED: utf-16 stopped dropping and inventing characters* at the end of
this file.


## FIXED: the incremental escape decoder

Measured 2026-09-11.

`BufferedIncrementalDecoder` was already doing its half correctly: it keeps
whatever the codec did not consume and prepends it to the next chunk. What it
needs FROM THE CODEC is the `final` flag honoured — when `final` is false, stop
before a trailing sequence that might still be completed and report `consumed`
short, so the buffer picks the remainder up.

utf-8 and utf-16 did that, through `_utf8_incomplete_tail`. The two ESCAPE
decoders accepted `final` and ignored it, decoding the whole input every time,
so a chunk ending mid-escape raised instead of waiting: `b'a\\'` fed without
`final` is not "a backslash at end of string", it is a caller who has not sent
the rest yet. `_escape_incomplete_tail(data, raw)` is the escape-codec
counterpart, wired into both decoders.

**WHICH escapes can be incomplete differs between the two codecs**, which is the
part worth testing rather than assuming:

| tail | `unicode-escape` | `raw-unicode-escape` |
| --- | --- | --- |
| `b'a\\'` | held (consumed 1) | held (consumed 1) |
| `b'a\\x'` | held (consumed 1) | **complete** (consumed 3) |
| `b'a\\u'` | held (consumed 1) | held (consumed 1) |
| `b'a\\1'` | complete | complete |

raw-unicode-escape knows only `\uXXXX` and `\UXXXXXXXX`, so its `\x` is an
ordinary backslash followed by an ordinary `x` and is already finished. Octal
and the one-letter escapes (`\t`, `\n`) are never held by either: they are
complete as soon as the backslash has one byte after it. All fourteen tail
shapes were read off CPython 3.14 before being asserted here.

Two details the scan has to get right, both asserted:

* a backslash preceded by an ODD run of backslashes is itself escaped, so it
  begins nothing — `b'a\\\\'` is a finished escaped backslash, not a pending one;
* `\UXXXXXXXX` is the longest escape, so the scan need look back at most ten
  bytes; anything earlier cannot still be open.

`test.test_codecs`: **46 bad → 40**, 6 tests —
`{Raw,}UnicodeEscapeTest.test_incremental_surrogatepass`, `.test_partial` and
`.test_readline`. Full-suite name-and-kind diff against a stashed baseline:
185 → 179 bad, 0 newly failing, 0 fail↔error swaps.

## FIXED: utf-16 stopped dropping and inventing characters

Measured 2026-09-14.

utf-16 reads TWO BYTES AT A TIME, and a high surrogate is only half a character
until a low one follows it. `bytes >> ___pyDecodeUTF16___` got both edges wrong,
and both **silently** — the failure mode that is worse than raising, because
nothing tells the caller anything happened.

**1. An odd trailing byte was dropped.** The walk advanced while `i + 1 <= n`,
so a leftover byte simply ended the loop:

| | CPython | Grail (before) |
| --- | --- | --- |
| `b'a\x00b'.decode('utf-16-le')` | `UnicodeDecodeError: truncated data` | `'a'` |
| `b'a\x00b'.decode('utf-16-le','replace')` | `'a\ufffd'` | `'a'` |
| `b'a'.decode('utf-16-le')` | `UnicodeDecodeError` | `''` |

It was dropped under **every** handler — `strict`, `replace`, `ignore`,
`backslashreplace`, `surrogatepass` and `surrogateescape` all returned the
truncated result.

**2. A high surrogate was combined with whatever followed — found while fixing
the first, and strictly worse.** The branch checked that two more bytes existed
but never that they were a LOW surrogate, and combined them anyway:

```
b'\x00\xd8a\x00'.decode('utf-16-le')   CPython: UnicodeDecodeError
                                      Grail:   '②'
```

`0x10000 + ((0xD800-0xD800) << 10) + (0x0061-0xDC00)` is `0x2461`, a circled
digit two. So an ill-formed pair produced a **wrong character** and **ate the
`a` after it** (the branch advanced four bytes regardless). Inventing a
character is worse than losing one: a dropped byte might be noticed downstream,
a plausible-looking one will not be.

The fix leaves `lo` nil when the second unit is not a low surrogate, which drops
through to the existing lone-surrogate refusal and advances by **two** — so the
unit that did not pair is read again on its own, and the survivor survives.

**CPython names three cases differently**, and a handler reads the SPAN as much
as the message, so they could not all stay `'illegal encoding'`:

| shape | reason | span |
| --- | --- | --- |
| high surrogate, fewer than 2 bytes after it | `unexpected end of data` | through end of data |
| high surrogate + a unit that is not low | `illegal UTF-16 surrogate` | 2 bytes |
| an unpaired low surrogate | `illegal encoding` | 2 bytes |
| an odd trailing byte | `truncated data` | 1 byte |

Positioning the refusals is all the substituting handlers need:
`___decodeSubstituting___` reads `start`/`end` off the error and puts one
replacement in that span, so `replace`/`ignore`/`backslashreplace` came out
right without touching them. `surrogatepass` and `surrogateescape` both fall
through to the strict decoder, which is correct — half a unit is not a
surrogate, and CPython refuses a truncated tail under both.

Seventeen shapes and all six handlers were read off CPython 3.14 before being
asserted, in `tests/python/utf16_odd_byte.py` and
`PythonTests.Utf16TruncatedDecodeTestCase`. utf-32 already length-checked and
raised; it is pinned in the fixture so the fix cannot drift into it.
## Survey: what the remaining 177 are actually blocked on

Measured 2026-09-14, against main at `d53f23cd` (board: 179 total bad, 177 after
the utf-16 fix). Recorded because the conclusion is a campaign-level one and
cost a day of probing: **the cheap one-root conformance defects are largely
exhausted.** Every remaining cluster of two or more tests that was probed bottoms
out in a structural gap, not a local bug. The probes are worth keeping so the
next pass does not repeat them.

### 1. Callable `__repr__` is downstream of callable TYPE IDENTITY — repr half FIXED

`repr()` of any callable prints no name and the wrong type — `repr(a_function)`
is `'<BoundMethod object at 0xb297b7>'` where CPython gives
`'<function a_function at 0x…>'`. `__name__` and `__qualname__` are both already
correct, so it looks like a repr bug. It is not: Grail has **two** callable
classes where CPython has **four**, and the mapping is partly inverted.

| | CPython | Grail |
| --- | --- | --- |
| `type(modfunc)` | `function` | `BoundMethod` |
| `type(K().meth)` | `method` | `BoundMethod` |
| `type(hash)` | `builtin_function_or_method` | `BoundMethod` |
| `type(dict.items)` | `method_descriptor` | `function` |
| `type(K.sm)` (staticmethod) | `function` | `BoundMethod` |

Printing `<built-in function hash>` or `<method 'items' of 'dict' objects>`
requires distinctions the type system does not make.

**The repr half is now fixed, all nine shapes.** The form is chosen from the
RECEIVER rather than from the class, which reaches eight; the ninth — a
`@staticmethod` read off its class, which CPython prints as a plain function
because it is bound to nothing — needed something the runtime had thrown away.
`ClassDefAst` compiles `@classmethod` and `@staticmethod` **both onto the
metaclass**, so by the time the callable exists the two are one thing. The
compiler is the only place that still knows, so it now writes the staticmethods
down in a class-side `___staticMethodNames___` table, in the same shape as the
doc / signature / annotations tables beside it.

That is worth stating as a general lesson rather than a local fix: **where one
Smalltalk representation serves several CPython concepts, the distinction has to
be RECORDED AT COMPILE TIME or it is gone.** Consulting the instance recovers the
rest (which is how the other eight shapes, and `types.py`'s `__instancecheck__`
metaclasses, already work).

`type()` is still wrong for every callable, and that is the remaining half. It
cannot use the same trick: `type(x)` answers a class and the name is keyed by
class, so one class cannot report two names. It needs real `function` / `method`
/ `builtin_function_or_method` / `method_descriptor` types — **and that is a big,
risky change**, measured: `BoundMethod` alone has 854 mentions and 31 `isKindOf:`
sites across the Smalltalk tree. Weighed against ~3-5 further tests, it is not
obviously worth it, and is recorded here as a decision to take deliberately
rather than a defect to fix casually.

**Three bound representations, and they bind differently.** Probed after the
table above, and the sharper statement of the same defect:

```
type(P().repr_string)   def'd method     Grail: BoundMethod    CPython: method
type(P().repr_str)      aliased method   Grail: MethodBinding  CPython: method
type(hash)              builtin          Grail: BoundMethod    CPython: builtin_function_or_method
```

Because the representations differ, so does binding — and whether a class-body
function binds depends on WHERE THE FUNCTION CAME FROM:

| class body contains | binds? |
| --- | --- |
| `def m(self): ...` | yes |
| `alias = m` (a method in the same body) | yes |
| `h = module_level_func` | **no** — `TypeError: missing 'self'` |
| `f = lambda self: ...` | **no** |

Measured across the vendored tree: 18 occurrences of the broken shape, all in
`django/db/backends/dummy/base.py`, and no lambdas in any class body. So it is
rare in the code that ships here (1 corpus test) — but it is the same root as the
repr and `type()` problems, not a separate bug.

### 2. Pickling `map`/`filter`/`zip` needs the reduce protocol, not a module fix

Seven `test_builtin` tests fail as `PicklingError: Can't pickle <class
'map_iterator'>: module '__main__' not found`, which reads like a missing
`__main__`. Probed:

```
type(map(str,'ab'))              Grail: map_iterator     CPython: map
type(map(...)).__module__        Grail: AttributeError   CPython: 'builtins'
map(...).__reduce__()            Grail: NotImplemented   CPython: (map, (str, <str_iterator>))
'__main__' in sys.modules        Grail: False            CPython: True
```

So three separate gaps stack: CPython models `map` as a CLASS whose instances are
the iterators (Grail has a function plus a distinct `map_iterator`), `__module__`
is absent, and `__reduce__` is unimplemented. `check_iter_pickle` also pickles a
PARTLY CONSUMED iterator, so the inner iterator must be picklable too — a chain,
not a leaf.

### 3. `SyntaxWarning` on an invalid escape needs a filename plumbed through the compiler

Four `test_string_literals` tests want `'\z'` to warn. The emit point is exactly
one branch — `"Unknown escape - keep as-is"` in `PythonTokenizer` — but the
warning must carry `filename` and `lineno`, and **neither `PythonTokenizer` nor
`PythonParser` has a filename instance variable**. It also has two messages, not
one: under `simplefilter('error')` the SyntaxWarning becomes a `SyntaxError`
whose text drops the middle sentence.

```
warning: "\z" is an invalid escape sequence. Such sequences will not work in
         the future. Did you mean "\\z"? A raw string is also an option.
error:   "\z" is an invalid escape sequence. Did you mean "\\z"? A raw string
         is also an option.
```

Only the first invalid escape in a literal warns. The fix is small; the plumbing
through the parse API — used by every compile — is not.

### 4. There are no cheap codec ALIAS wins left

`test_string_literals.test_file_latin9` fails on `LookupError: unknown encoding:
latin9`, which looks like a one-line alias. It is not. Sweeping all 436 codec
names and aliases CPython knows against Grail:

* **83 supported, 353 missing**
* **0 pure alias gaps** — there is no name whose canonical codec Grail already
  implements but does not recognise.

So every missing name needs an actual codec (`latin9` is `iso8859-15`, itself
unimplemented). Adding single-byte charmaps is mechanical but is table work, one
codec at a time, not an alias table.

### 5. A writable `memoryview` over `array.array` needs a buffer-backed array

Two `test_struct` tests (`test_pack_into`, `test_pack_into_fn`) fail with
`TypeError: cannot modify read-only memory`. The buffer under test is
`memoryview(array.array('b', …))`. `memoryview.___isReadOnly___:` answers
`(anObject isKindOf: bytearray) not`, so only a bytearray is writable — but
flipping that flag is not enough: `___sourceBytes___` answers the LIVE ByteArray
only for a ByteArray source and otherwise calls `tobytes`, **a copy**, so writes
would be silently lost. `array.array` is pure Python storing `self._data =
list(...)`, so a real fix is either backing `array.py` with a bytearray or giving
memoryview a write-back path.

### Narrow items that ARE local (1-3 tests each)

* `PyStrSurrogate` does not support slicing or coercion — 3 occurrences across
  `test_codecs` and `test_warnings`.
* A method inside a class body inside a function cannot close over the
  function's locals: `NameError: free variable 'tested' referenced before
  assignment in enclosing scope` (`test_genericclass.TestMROEntry.test_mro_entry`).
  One occurrence, but it is a codegen correctness bug rather than a missing
  feature, so it may be worth more than its count.

## FIXED: xml.sax is real apart from the parser, and three io defects under it

Measured 2026-09-14.

`xml.sax` was a deliberate three-function stub — `escape`, `unescape`,
`quoteattr` — whose docstring said `make_parser`, `ContentHandler`,
`InputSource` and the SAX exception hierarchy were ABSENT so that code needing a
parser "fails loudly at the name it wanted".

**Only the PARSER is C.** CPython's `_exceptions`, `handler`, `xmlreader` and the
full `saxutils` are pure Python, so they are vendored verbatim. The loud failure
now comes from the real driver at the real point:
`SAXReaderNotAvailable('No parsers found')` — which is exactly what CPython
raises when it can find no parser module, so the stub's intent is preserved
rather than discarded. `XMLGenerator` is a SERIALIZER and works in full.

`test.test_sax`: **IMPORTERROR → SKIP** (the gate counts it `unblocked`). The
module now imports and raises CPython's own `SkipTest: no XML parsers available`
— the honest end state until Grail has a parser. `test.test_pulldom` advanced
too: its blocker moved from `No module named 'xml.sax.xmlreader'` to
`No module named 'xml.dom'`.

### Three io defects, all found BY the vendored code

`saxutils._gettextwriter` is the function that found them, and the way it found
them is the lesson.

**1. `StringIO`/`BytesIO` had no `seekable` / `readable` / `writable`.** The
caller reads them inside `try: ... except AttributeError: pass`, so the missing
method was SWALLOWED and the failure surfaced later as *"unbound method
'seekable' must be called with an instance"* — naming nothing that was wrong. A
missing predicate is not a missing convenience; it is a silently wrong branch.

**2. Grail's `StringIO` was outside `_pyio`'s ABC hierarchy**, so
`isinstance(StringIO(), io.TextIOBase)` was False — correct on the letter of it,
since Grail's streams are Smalltalk classes written from scratch, and wrong for
every caller that BRANCHES on the answer. That test is `_gettextwriter`'s first
branch and the one CPython takes. Falling past it landed in the path for objects
that merely have `.write`, so `XMLGenerator(StringIO())` died inside machinery
it should never have reached, reporting *"write to closed file"* about a stream
that was open.

> **An isinstance that is false for the wrong reason does not fail where it is
> wrong. It fails somewhere else entirely.**

Fixed with `abc.ABCMeta.register`, which is the mechanism CPython documents for
exactly this — a class implementing a protocol without inheriting it — done at
the one point per session where `_pyio`'s ABCs are built.

**3. `BytesIO >> flush` answered SELF**, not `None`: the method fell off the end
with no `^`. Harmless until a caller tests the result, where a truthy stream
takes the wrong branch. Pre-existing and unrelated to sax.

## Still open: a zero-argument `module.Attr()` call answers the ATTRIBUTE — FIXED below

Found while making `XMLGenerator` work over a `BytesIO`; **isolated, not fixed**,
because it is core codegen with corpus-wide blast radius.

| written | Grail | CPython |
| --- | --- | --- |
| `io.BufferedIOBase()` | the class | an instance |
| `C = io.BufferedIOBase; C()` | an instance | an instance |
| `getattr(io, 'BufferedIOBase')()` | an instance | an instance |
| `io.StringIO('x')` (one argument) | an instance | an instance |

A module's attribute read compiles to a unary Smalltalk send, and with ZERO
arguments the "fixed arity" call compiles to *the same send* — `#attrFixed` in
`CallAst >> ___irCallShape___`. So read and call are indistinguishable. For a
module attribute that is a FUNCTION this is right (performing it *is* calling
it); for one that is a CLASS ACCESSOR, the call is swallowed and the class comes
back.

`io_module.gs` already documents the other half of the same tension: a varargs
twin cannot simply be added, because that selector is probed FIRST and would
make every bare read answer a `BoundMethod` — `class SocketIO(io.RawIOBase)`
then fails with "cannot subclass a non-class base".

This is what blocks `XMLGenerator` over a `BytesIO`, which is the CPython path
for that case, and it is why `tests/python/xml_sax_infrastructure.py` asserts the
`StringIO` form only.

## Still open: Grail has no XML parser at all — FIXED below

`pyexpat` is a C extension. `xml.etree.ElementTree.fromstring` / `parse` raise
`NotImplementedError`, and `xml.sax.make_parser()` raises
`SAXReaderNotAvailable`. Everything else in both packages is now present.

The API surface needed is bounded and was measured off CPython's
`expatreader.py`: `ParserCreate`, `Parse`, `ErrorString`, `error`,
`ErrorLineNumber` / `ErrorColumnNumber`, and about twenty handler slots
(`StartElementHandler`, `CharacterDataHandler`, `StartNamespaceDeclHandler`,
`StartCdataSectionHandler`, …). A pure-Python `pyexpat` exposing that would let
CPython's own `expatreader.py` run unmodified, and would unblock `test_sax`'s 91
tests, `xml.etree` parsing, and — with a DOM — `test_pulldom`.

**Written, and that measurement is what made it tractable** — see *FIXED: a
pure-Python XML parser* below. `xml.etree` is NOT wired to it yet: Grail's
`ElementTree` is a hand-rolled serialize-only shim that never called expat, so
`fromstring`/`parse` still raise `NotImplementedError`. That is now a small,
separate job rather than a missing parser.

## FIXED: a pure-Python XML parser

Measured 2026-09-16.

`pyexpat` is a C extension, so Grail had **no XML parser at all**.
`xml.sax.make_parser()` raised `SAXReaderNotAvailable`, and `test.test_sax`
could not run a single test. Everything else in `xml.sax` is pure Python and
already vendored, so one module stood between them and working.

`src/python/stdlib/pyexpat.py` is that module. **`test.test_sax`: 0 tests → 186,
with 106 passing.**

### Matching expat's shape was the design decision

Not a nicer API: CPython's `expatreader.py` and `xml/parsers/expat.py` are
written against expat's exact one — handlers assigned onto a parser object,
`Parse(data, isfinal)` fed incrementally, `ExpatError` carrying
`code`/`lineno`/`offset`. Matching it means **both of those files are vendored
unmodified and simply run**. They are the tested upstream implementations;
nothing here re-derives their behaviour.

### How it was checked, which is the part worth copying

**Differentially, against the real expat.** Both parsers were run over the same
~60 documents — including *every* chunk split of the same input — and their full
handler call sequences compared: order, arguments, error codes, error positions.

That is a far better oracle than a list of expectations written by hand, because
it tests what every callback RECEIVES and in what ORDER, not just the final
result. It earned its keep twice:

* **expat blames an error where the construct BEGINS** — the NAME in an end tag,
  the `&` in a reference — while this parser reported where the scanner noticed
  it. Two columns late, every time, and nothing but a differential run would
  have shown it.
* It caught **four wrong expectations in the fixture itself**, including one
  asserting a single `CharacterData` call where real expat splits a run across
  chunks. Expectations written from the new code's own output test nothing.

### Scope, stated honestly

Well-formed XML: elements, attributes, text, CDATA, comments, PIs, character
references, the five predefined entities, namespace processing. **Not the DTD
engine** — no external entities, no validation, no conditional sections.
`<!DOCTYPE>` is reported through the doctype handlers and its internal subset is
skipped, except for simple `<!ENTITY name "text">` declarations, which are
common enough in real documents to honour. A reference to an entity it does not
know is an error AT the reference, which is what expat does when the entity is
genuinely undefined.

### Three small absences it surfaced on the way

Each blocked `test_sax`'s import in turn, and each is one line of real content:
`test.support.os_helper.FakePath`, `os.path.supports_unicode_filenames` (NOT a
constant — CPython's posixpath says `(sys.platform == 'darwin')`, so it is
derived from the same GemStone `osName` that `sys.platform` is), and
`os_helper.TESTFN_UNICODE`. The XML test data (`test/xmltestdata/`) was vendored
too.

## The conformance gate treated an unblocked SKIP as a regression

Found by the change above and fixed with it, because it would otherwise have
reported a false regression for exactly this kind of progress.

`check_cpython_regressions.sh` exempts `IMPORTERROR`/`CRASH`/`TIMEOUT`/`STERROR`
from count-gating, and its comment says why: *"unblocking an IMPORTERROR always
looks like a huge regression (0 fail+err → however many tests in the module do
not pass yet) when it is the opposite."*

**`SKIP` is the same case and was not in the list.** A module whose import
raises `SkipTest` — the CPython idiom for an unavailable dependency — runs
nothing, so its 0 is definitional, not earned. `test_sax` going SKIP → running
186 tests read as `REGRESSION: fail+err 0 -> 80`.

The fix is guarded on the TEST COUNT, not the status name: only a `SKIP` that
ran **zero** tests is exempt. A module that ran forty tests and skipped every one
has a 0 that IS on merit and stays gated normally. Verified against a synthetic
board before being trusted — SKIP/0 unblocks, SKIP/40 still reports a regression.

## FIXED: a zero-argument `module.Attr()` call answers the ATTRIBUTE

Measured 2026-09-16. **`test.test_sax`: 80 bad → 27** — 53 tests, the largest
single fix of this campaign.

A module attribute read compiles to a unary Smalltalk send, and so does a
zero-argument call: `m.f` and `m.f()` both emit `(m) f`. Whether that collapse
is right depends entirely on what the method DOES:

* a **function** — `os.getcwd`, `hashlib.md5`, `random.random` — performs the
  work and answers the result, so performing it IS calling it. Harmless.
* a **value accessor** answers something the caller then means to call, and the
  collapse silently DROPS the call.

```
io.BufferedIOBase()            ->  the CLASS      (wrong)
C = io.BufferedIOBase; C()     ->  an instance    (right)
getattr(io,'BufferedIOBase')() ->  an instance    (right)
```

The same expression, three spellings, two answers — only the one that collapsed
was wrong.

### The first fix was unsound, and how that was found is the point

The obvious fix is to reuse the category allowlist the READ path already
uses — function categories become a `BoundMethod`, everything else is
performed — and decline the collapse for everything unlisted.

**That breaks real functions.** They live in ad-hoc categories: `os.getcwd` in
`Grail-File and Directory Operations`, `hashlib.md5` in `Grail-Constructors`,
`_thread.get_ident` in `Grail-Threading`. Declining the collapse routes them
through read-then-call, which performs the method and then calls its *result* —
`hashlib.md5()` began failing with `Hash class does not understand #'__call__'`.

Found by testing the fix against the functions it might break rather than by
reasoning about it. The categories simply do not encode the distinction.

So the rule is **opt-in and inverted**: a module DECLARES its value accessors
(`Grail-Type Accessors`), and only those decline the collapse. Everything else
compiles exactly as before, which makes the change additive rather than a
reinterpretation of every module method. `io`'s eight `_pyio` class accessors
are the first — and, today, only — declarers.

The trade, stated plainly: another module's value accessors stay broken until
someone declares them (`warnings.WarningMessage` is probably one). That is the
price of not guessing.

## Still open: module functions in ad-hoc categories are not first-class

Found while fixing the above, and the honest other half of it.

```
hashlib.md5()          ->  a hash object   (works, by the collapse)
f = hashlib.md5; f()   ->  TypeError       (CPython: a hash object)
```

Reading `hashlib.md5` PERFORMS it and hands back a `Hash`, because its category
is not one of the six the read path treats as functions. So the name is not a
first-class function object, and only the call form works — by the same
coincidence this entry's fix is about.

Affects roughly seventeen zero-argument module methods: `os.getcwd`,
`os.getpid`, `os.cpu_count`, `os.scandir`, the `hashlib` constructors,
`_socket.gethostname`, `_socket.getdefaulttimeout`, `_thread.get_ident`,
`_thread.allocate_lock`, `mimetypes.init`.

The fix is to recategorise them into a function category, which would make the
read answer a `BoundMethod` — and would leave the CALL working, since the fast
path emits a direct send that bypasses the read entirely. Each one should be
classified by READING it rather than by its name, since the categories have
already been shown untrustworthy here.

## xml.etree.ElementTree could not parse, and the reason it could not had expired

`fromstring` and `parse` raised `NotImplementedError`. Grail's ElementTree was a
269-line hand-rolled shim that could build a tree with `Element`/`SubElement`
and serialize it with `tostring`, and no more — which was the honest state while
Grail had no XML parser at all.

It has one now (`src/python/stdlib/pyexpat.py`), so CPython 3.14.7's own
`ElementTree.py` is vendored VERBATIM, together with the `ElementPath.py` it
needs for `find`/`findall` — 2565 lines replacing 269. The upstream file is pure
Python and its parsing reaches `xml.parsers.expat`, so it needed no
Grail-specific change: the same pattern that worked for `xml.sax`.

**What unblocked it is the part worth keeping.** The shim carried an explicit
`_attr_order` list, justified by a comment saying Grail's dict ordering is not
guaranteed. Measured, that is no longer true — Grail dicts preserve insertion
order and agree with CPython on every case tried, including delete-then-reinsert.
A comment that was true when written had become the only remaining reason not to
vendor the real file, and nothing about it announced that it had expired.

So: re-measure the assumption a workaround rests on before writing more of the
workaround. This one had been paid for in every `NotImplementedError` since.

### What the corpus does not yet cover

`test.test_xml_etree` is upstream's 226-test module for this, and it is NOT in
the manifest, because 224 of those 226 error on one root that has nothing to do
with ElementTree: **Grail's `unittest` does not run `setUpModule`**, and that is
where the module under test is imported. `import_fresh_module` itself works. Six
vendored modules define `setUpModule` and five are already in the manifest, so
the gap is wider than this one module.
## FIXED: the sys hooks are readable, and assigning one no longer invokes it

Measured 2026-09-16. **Corpus-neutral: 0 newly failing, 0 fixed.** No suite test
touches the hooks; this is a correctness fix, and `0 newly failing` is the
number that mattered, because it removes an accessor from `sys`.

Filed as one defect; it was **two**, and the second is the worse one.

### 1. Reading a hook before assigning to it raised

CPython starts every hook equal to its `__`-prefixed twin — on a fresh
interpreter `sys.excepthook is sys.__excepthook__` is True — and programs read
it in order to CHAIN, which is the documented way to install a handler:

```python
previous = sys.excepthook
sys.excepthook = lambda *arguments: my_handler(previous, *arguments)
```

Only the dunder twins were seeded, while `excepthook` and `displayhook` kept
accessor methods reading a key nobody had put. The read raised a raw Smalltalk
`LookupError` (error 2021, `rtErrKeyNotFound`) — not an `AttributeError`, so
invisible to `except AttributeError` and uncatchable from Python. The chaining
read took the whole program down.

### 2. `sys.displayhook = handler` INVOKED the handler

Found while testing the fix for (1), by exercising all four hooks through
Python's own `setattr` rather than one of them at the Smalltalk level.

`displayhook` owned a unary getter beside a one-argument call form
`displayhook: value` — exactly the shape `___mayDispatchToSetter___` reads as a
getter/setter PAIR. So the assignment dispatched to the CALL form and tried to
**display** the handler instead of installing it, dying inside `printString`
with an uncatchable `MessageNotUnderstood`.

* `excepthook` escaped because its call form takes THREE arguments
  (`excepthook:_:_:`), which is not setter-shaped.
* `breakpointhook` escaped because its accessor had already been removed, for
  the neighbouring reason its own comment gives.

The fix gives `displayhook` the same treatment — no unary accessor, the seeded
dict entry answering the read — which is the pattern the file already documents
for a replaceable hook.

### What was NOT wrong, recorded because it was the first suspicion

**Assignment is not broken in general.** Storing a hook writes a dynamic
instance variable that the read then finds, so `excepthook`, `breakpointhook`
and `unraisablehook` round-tripped correctly throughout. The setter-dispatch
theory was raised early, tested with a Smalltalk-level round trip, seen to pass,
and dropped — it only resurfaced when the fixture drove all four hooks through
`setattr`. A probe that exercises one member of a family can exonerate the
family wrongly.

## unittest ran two of its three fixture scopes

`setUpModule` / `tearDownModule` did not run. They were not declared, not
called, and not mentioned — so a test module whose module-level fixture builds
the thing under test ran every one of its tests against an unbuilt world, and
the failures named the missing object rather than the fixture that never built
it.

That is the same defect the class fixtures were added to fix — `setUpClass` and
`tearDownClass` were declared on `TestCase` and called by nobody, until
`test.test_gettext` failed 21 tests on the `.mo` catalogs its own fixture was
supposed to have written — one scope further out. It survived that fix because
nothing looks for a hook that was never declared.

**How it was found** is worth recording: not by reading unittest, but by
vendoring `test.test_xml_etree` and reading what 224 of its 226 errors had in
common. They had one root, and it was three levels away from the module they
named.

The scope is what makes it its own mechanism rather than a special case of the
class fixture: `setUpModule` fires when the MODULE changes, once, however many
classes the module holds. A per-class approximation would run it five times for
a five-class module, which for `test_xml_etree` means re-importing ElementTree
and its parser five times.

### Two harnesses needed it, not one

Grail runs the CPython corpus twice over and only one of the two paths is
`unittest.TestSuite`.

The scoreboard is the other. `scripts/run_one_cpython_module.gs` hands out one
`TestCase` at a time from topaz, so that an uncatchable Smalltalk error in one
test cannot void the module's whole score, and `test/_grail_harness.py` fires
the fixtures around that loop instead. Fixing only `TestSuite` would have left
the scoreboard — the thing that measures whether the fix worked — unchanged.

The two differ deliberately in one respect. The class fixture is re-run per test
in the harness, because the loop is handed one case at a time and has no cheap
way to see a class boundary. The module fixture is run once, because one topaz
session scores exactly one module, so "once per session" IS "once per module".

### The one deliberate deviation from CPython

CPython reports a failed module fixture as a single synthetic `_ErrorHolder`
entry and runs no tests. Grail reports it against every test in the module, as
it already does for a failed class fixture and for the same reason: `testsRun`
then still counts the tests the module has, and the scoreboard attributes them
where they belong rather than showing a module with zero tests and one error.

`tests/python/module_fixtures.py` asserts the INVARIANTS both agree on — no test
body ran, `tearDownModule` did not, the cleanups did — rather than the counts
they differ on, so the fixture runs green under real CPython 3.14.

### What it moved, and what it uncovered

Tier 2, stash-cycle on Darwin arm64: **201 bad tests before, 197 after**, gate
`0 regression(s), 2 improvement(s)`. All of the movement is in one module, and
all of it comes from one fixture:

```python
def init(m):                       # test.test_decimal, called by setUpModule
    DefaultTestContext = m.Context(
       prec=9, rounding=ROUND_HALF_EVEN, traps=dict.fromkeys(Signals[m], 0))
    m.setcontext(DefaultTestContext)
```

`prec=9` and **every trap off**. Without it the corpus was measuring Grail's
decimal against the wrong context:

| test | before | after |
| --- | --- | --- |
| `test_explicit_context_create_decimal` | `E: InvalidOperation: Invalid literal for Decimal: ''` | fixed |
| `test_explicit_from_string` | `E: InvalidOperation: trailing or leading whitespace…` | fixed |
| `test_tonum_methods` | `E: InvalidOperation: quantize with one INF` | fixed |
| `test_implicit_from_int` | `F: Decimal('123456789005') != Decimal('123456789000')` | fixed by `prec=9` |
| `test_unicode_digits` | `E: InvalidOperation: Invalid literal for Decimal: '\u{FF11}'` | `F: 'NaN' != '1'` |

The last row is the one worth reading rather than counting. With the traps off
the conversion no longer raises, so the test gets as far as its own assertion —
and lands on a real Grail gap that the unrun fixture had been hiding.

## Still open: Decimal does not accept Unicode digits — FIXED below

**Resolved** — see "Decimal answered NaN for a Unicode digit, three levels from
the cause" below, which found the root in the C shim rather than in `decimal`.
Left in place because the prediction it records is the useful part: the defect
was visible here one PR before anyone knew where it lived.

```
Decimal('１')                 ->  NaN        (CPython: Decimal('1'))
Decimal('٠.٠٣٧٢e-٣')
                                  ->  NaN        (CPython: 0.0000372)
```

CPython's decimal accepts any character with the Nd category as a digit.
Grail's accepts ASCII only and signals `InvalidOperation`, which under the test
context becomes a quiet `NaN`. `test.test_decimal.PyExplicitConstructionTest.test_unicode_digits`
is the measurement.

## Still open: threading has no active_count — FIXED below

**Resolved** — see "threading did not know which threads were alive" below. The
missing name turned out to be a missing registry, and two further defects fell
out of the same gap.

Found by the same change, and a good example of what the annotation is for.
`test.test_urllib2_localnet`'s `setUpModule` calls
`threading_helper.threading_setup()`, which reaches `threading.active_count()` —
a name Grail's `threading` does not have. The fixture therefore fails, and the
harness now says so against every test that goes wrong in that module:

```
GRAIL_DETAIL|E: AttributeError: 'urllib_request' object has no attribute
  'HTTPBasicAuthHandler' [setUpModule failed: AttributeError: 'threading'
  object has no attribute 'active_count']
```

The test's own error names `urllib_request`, three levels from the cause. The
module's row is unchanged (`21 | 1 | 8 | 1`), so the failing fixture costs
nothing — it is the diagnosis that improved.

## Decimal answered NaN for a Unicode digit, three levels from the cause

```
Decimal('１')            ->  NaN        (CPython: Decimal('1'))
Decimal('٠.٠٣٧٢e-٣')     ->  NaN        (CPython: 0.0000372)
```

The cause was not in `decimal`, nor in `re`, but in the C shim:

```c
static inline int Py_UNICODE_ISDECIMAL(Py_UCS4 ch) {
    /* ASCII decimal digits + Unicode Nd category (simplified) */
    if (ch < 128) return (ch >= '0' && ch <= '9');
    return iswdigit((wint_t)ch);
}
```

**The comment claims a category `iswdigit` cannot deliver.** The C standard
defines `iswdigit` as exactly the ten ASCII digits, in every locale — it has
never been a route to Nd. So the regex engine's `\d`, which compiles to
`CATEGORY_UNI_DIGIT`, which is `Py_UNICODE_ISDECIMAL`, matched no non-ASCII
digit; `_pydecimal`'s `_parser` rejected the literal; and the `InvalidOperation`
it raised became a silent `NaN` under a test context with its traps off.

Fixed by reading a generated Nd range table (`src/c/shim/grail_digit_table.h`,
from `scripts/generate_unicode_digit_table.py`) — 70 ranges, 750 code points,
built from CPython's own `str.isdecimal()`. The generator asserts that
`str.isdecimal()` and the Nd category still agree, so a future Unicode version
cannot silently drift the table away from `unicodedata`. It also removes a
dependence on the host libc's locale, which is the sort of thing that makes
Darwin and CI disagree for reasons nobody can see.

### What made it findable

The asymmetry: `\w` matched U+FF11 and `\d` did not. Both go through the same
string marshalling and the same pattern compiler, so one comparison ruled out
everything they share and left one predicate. Grail's compiled code for `\d`
was then confirmed byte-identical to CPython's, which put the fault past the
compiler and inside the engine.

Measured: tier 2 moved 197 bad tests to 196 — `\d` is used across the whole
corpus and exactly one test changed, which is the evidence that the new table is
exact rather than merely wider.

## Still open: \w matches every non-ASCII character

Found while fixing the above, in the same file and from the same habit of
approximating Unicode:

```c
extern "C" int _grail_unicode_isalnum(Py_UCS4 ch) {
    if (ch < 128) return isalnum((int)ch);
    /* For non-ASCII: treat as alphanumeric if > 127 (rough approximation) */
    return 1;
}
```

So `\w` matches things it must not. Measured against CPython 3.14:

```
\w matches, CPython does not:  U+2014 —   U+00AB «   U+2192 →
                               U+1F600 😀  U+00A9 ©   U+3001 、
```

This is why `\w` appeared to work on U+FF11 during the diagnosis above: it
answers true for every non-ASCII code point, correct ones included. The fix is
the same shape as the digit table — a generated alphanumeric table — but the
blast radius is not: `\w` is everywhere in the corpus, and tightening it will
move rows in both directions, so it wants its own measured change rather than a
ride along with this one.

`Py_UNICODE_ISSPACE` still delegates to `iswspace`, and was measured CORRECT on
this platform for U+00A0, U+2028, U+2003 and U+3000. It is left alone, but it is
locale-dependent by construction and belongs in the same eventual table.

## Still open: str.isdigit() misses the No digits

```
'²'.isdigit()      ->  False      (CPython: True)
'²'.isdecimal()    ->  False      (CPython: False, agrees)
```

CPython's `isdigit` is true for a character carrying either a decimal or a digit
property — Nd plus the No digits (superscripts, circled digits). Grail's answers
only the decimal half. Unrelated to the shim (this is `str`, on the Smalltalk
side); found because a check written for the digit-table boundary above tripped
over it.
## threading did not know which threads were alive

`threading.active_count()` did not exist, so
`test.support.threading_helper.threading_setup()` — which is
`return (threading.active_count(),)` — raised `AttributeError`, and every corpus
module whose `setUpModule` calls it failed its fixture outright.

The missing name was the symptom. Grail's `threading` had **no registry of live
threads at all**: no `_active`, no `_limbo`. `active_count()` is defined by
CPython as the length of `enumerate()`, so the registry was the actual
deliverable and the counter fell out of it.

Two further things were already wrong for want of it, and are fixed by the same
change rather than separately:

* `current_thread()` answered the main thread unconditionally, even inside a
  spawned thread. `asgiref.current_thread_executor` guards on
  `current_thread() != self._work_thread`, a test that could only ever be false.
* `_MainThreadClass` had no `ident`, which django's postgresql backend reads as
  `threading.current_thread().ident`.

### Two measurements, rather than two assumptions

This module's own header warns that Grail resolves module-level names oddly
inside class methods, so both premises of the design were probed before it was
written: a module-level dict **is** mutable from inside a class method, and
instances **are** hashable (`_limbo` is keyed by Thread, as CPython's is).

The second measurement shaped where a test could live. Under Grail `_spawn` is
**deferred** — the new GsProcess does not run before `start()` returns — so a
thread sits in `_limbo` for an observable window and `active_count()` reads 2
there. CPython's answer for the same code is a race, because its `start()` waits
for the thread to be running and a short target may already have finished. So
that assertion is a Grail-specific SUnit test, not a check in the
CPython-measured fixture.

The registry takes no lock where CPython's takes one. Grail's threads are
cooperative GsProcess green threads sharing one OS thread, and neither a dict
store nor a dict delete yields — the same reasoning `threading.local` in this
file was already built on.

### What it moved, which is nothing, and why that is the finding

`test.test_urllib2_localnet`'s `setUpModule` now succeeds, and the module's row
is **unchanged** at `21 | 1 | 8 | 1`. That is exactly what the entry above
predicted when the failing fixture was first surfaced: the broken fixture was
costing diagnosis, not score. The 8 errors were always about `urllib_request`
missing `HTTPBasicAuthHandler` / `ProxyHandler`, and they still are — now
without a misleading `[setUpModule failed: ...]` annotation attached to each.

## A reserved-named parameter with a default would not compile

Two bugs, both invisible until a parameter was named after a Smalltalk
pseudo-variable AND had a default. Grail renames such a parameter (`self`,
`super`, `nil`, `true`, `false`, `thisContext`) to a transport temp `_<name>`,
because Smalltalk cannot declare those.

**1 — the def-time default temp had two names.** It was DECLARED from the
Python name and READ from the transport name:

```smalltalk
| ___default_self___ |         "declared from 'self'"
___default_self___ := self.
_self := ... ifFalse: [___default__self___]   "read from '_self'"
```

For every ordinary parameter those two strings are identical, which is why this
survived: only a reserved name makes them differ, and then the whole enclosing
method fails to compile.

**2 — the default expression was resolved in the wrong scope.** A default is
evaluated at def time, in the scope that CONTAINS the def. The reserved-name
rename resolved it in the def's own scope instead, so `def h(y, self=self)`
emitted h's transport temp into the enclosing method, where no such temp exists.
Fixed by `NameAst >> ___defScopesName___:enteredFrom:`, which both name walks
now consult: a def's parameters scope its BODY, not its own arguments node.

### Why the second one is the interesting half

Fixing only the first would have traded a loud failure for a silent wrong
answer, and the obvious reduction could not have caught it:

```python
def handler(x, self=self):
    return (x, self is not None)     # True whether or not the fix works
```

`self=self` reads correctly *and* incorrectly to the same value, because the
default IS the receiver the buggy path fell back to. Substituting a default of
`7` is what separates them, and is what the fixture asserts:

| | before | after |
| --- | --- | --- |
| nested `h(y, self=7)` → `h(0)` | codegen gap | `(0, 7)` |
| nested `h(y, self=7)` → `h(0, 99)` | codegen gap | `(0, 99)` |
| nested `h(y, self=self)` in a method | codegen gap | the enclosing receiver |
| `def outer(self): def h(y, self=self)` | codegen gap | outer's transport temp |

### What it was costing

CPython's `ElementTree.XMLParser._setevents` uses `self=self` twice to carry the
instance into its handlers. It would not compile, so `XMLPullParser.__init__`
raised, so every use of `iterparse` was unreachable — **30 of
`test.test_xml_etree`'s 64 failures, from one method**. After the fix that
module reads `226 | 13 | 36 | 2` (was `226 | 12 | 52 | 2`): **15 more tests
pass** and its codegen-gap count is 1, an unrelated multiple-inheritance shape
(`class MyElement(base, ValueError)`).

The corpus itself does not move — `196` bad before and after, no fail↔error
swaps — because no module currently in the manifest uses the idiom.

## Still open: exec() does not rename reserved-named parameters

Unchanged by the above, and a different path: a def compiled through `exec()`
gets no transport rename at all.

```python
exec("def f(x, self=7): return (x, self)", scope)
scope['f'](1)      ->  (1, <UndefinedObject>)   (CPython: (1, 7))
scope['f'](1, 9)   ->  (1, <UndefinedObject>)   (CPython: (1, 9))
```

`nil` behaves the same; `true` and `false` answer Smalltalk's booleans; `super`
and `thisContext` raise a `CompileError` that escapes as an uncatchable
Smalltalk error rather than a Python exception. `___enclosingFuncDeclaresReservedParam___:`
stands down when `CallAst moduleClassBeingCompiled` is nil, which is the state
an exec/doit scope compiles in, so the whole family is silently wrong there.

A silently wrong VALUE rather than an error, which is the worst shape — recorded
here rather than fixed because it is a different compilation path with its own
guard.

## Still open: a class attribute holding a bound method is re-bound on read

```python
class It:
    __next__ = gen.__next__     # gen is a generator instance
It().__next__()                 # TypeError: __next__() takes a different
                                #   number of arguments (1 given)
```

CPython does not re-bind: a bound method is not a descriptor, so reading it off
a class hands back the same bound method. Grail treats it as a plain function
and passes the instance, so the call arrives with one argument too many.

This is `ElementTree.iterparse`'s `IterParseIterator.__next__`, and it is now
the largest single root left in `test.test_xml_etree` at **12 tests** — the
pull-parser API works (`XMLPullParser.feed` / `read_events` match CPython), but
iterating an `iterparse` result does not.
## test.test_xml_etree joins the corpus: 160 of 226 pass

Upstream's 226-test module for ElementTree, unrunnable until now for a reason
that had nothing to do with ElementTree. It needed **two** things, and they
landed one after the other:

* CPython's real `ElementTree.py` (#1030) — Grail's was a serialize-only shim
  whose `fromstring` raised `NotImplementedError`;
* `setUpModule` support (#1031) — this module imports the module under test in
  its module fixture, so without it 224 of the 226 errored against an unbuilt
  `ET`, every one of them naming something other than the cause.

With both, the module scores `226 | 12 | 52 | 2` — **160 passing**, and its
`setUpModule` runs clean.

That is the whole shape of the thing worth remembering: the measurement that
said "224 errors, one root" was right, and the root was two PRs away from the
module it was reported against.

### What the remaining 64 are

Bucketed by root rather than by message, because the counts are what decide
what to do next:

```
  30  codegen gap: a nested def with a ``self='' parameter (XMLParser._setevents)
  12  AssertionError -- serializer / expat conformance, assorted
   6  ParseError     -- entity and well-formedness message wording and positions
   5  xml.etree.ElementInclude is not vendored
   4  AttributeError
   3  Smalltalk OffsetError escaping into the harness
   2  FileNotFoundError
   2  TypeError -- *-unpack in call sites is not yet supported
```

**One root is worth nearly half of it**, and it is a two-line construct — see
the next entry.

## Still open: a nested def cannot take a parameter named self

```python
class A:
    def m(self):
        def handler(x, self=self):        # CPython: (1, True)
            return (x, self is not None)  # Grail: codegen gap
        return handler(1)
```

`NameError: Grail could not compile this method (codegen gap)`. Reduced from
`XMLParser._setevents`, which uses the idiom twice (the `comment` and `pi`
handlers) to carry the enclosing instance into a callback. Because
`_setevents` will not compile, `XMLPullParser.__init__` raises, and with it
every use of `iterparse` — **30 of `test_xml_etree`'s 64 failures, from one
method**.

It is specifically the NAME. Measured alongside, all of these compile and run
correctly:

```python
def handler(x, start=start):        # a plain closed-over default   OK
def handler(x, start=self._s):      # a bound method as a default   OK
def handler(x, n=n):                # redefined per if/elif branch  OK
```

so it is not defaults, not closing over the instance, and not redefinition in a
loop. Only a parameter literally named `self` in a nested `def` inside a method.
Grail already has test cases for `self` name collisions elsewhere
(`SelfNameCollisionTestCase`, `SelfReboundInMethodTestCase`), so this is a gap
in that family rather than a new subject.

## A bare `super()` in a nested def skips the supercheck

CPython builds `super()` from the enclosing class and argument 0 and then
**checks** that argument 0 is an instance of that class, raising

    TypeError: super(type, obj): obj (instance of int) is not an instance or
    subtype of type (Holder)

Grail builds the proxy and answers it. Measured 2026-09-20 on both paths:

```python
class Holder:
    def m(self):
        def inner(x):
            return super()          # closes over Holder's class cell
        return type(inner(1)).__name__

Holder().m()        # CPython: TypeError      Grail: 'super'
```

The cause is structural rather than an oversight: the supercheck rides on
`Super checkedCls:obj:`, which is what the EXPLICIT two-argument rewrite emits.
The zero-argument rewrite builds its proxy directly and never goes through it,
so the check has nowhere to happen. The text path and the IR path do the same
thing, so this is not an IR gap and closing it would change both.

Pinned arm-against-arm by
`NestedDefExplicitSuperTestCase>>testTheThreeNestedBareSuperLandingsAgreeWithCPython`,
which asserts the two ERROR arms against CPython outright and compares this one
between the arms, so the divergence cannot silently widen into a disagreement
between the two paths.

## test.test_xml_etree crashed on CI while passing locally

The "160 of 226 pass" entry above was true on Darwin arm64 and false on the
board that matters. The CI-measured scoreboard recorded the module as
`CRASH | 0 | 0 | 0 | 0` — topaz exited after 14 of 226 tests and printed no
result line, so every test that passes was invisible.

**One test did it.** `BadElementTest.test_deeply_nested_deepcopy` builds a
500,000-deep element chain and deep-copies it, asserting a `RecursionError`
(upstream: *"This should raise a RecursionError and not crash"* — CPython itself
crashed on it, cpython#148801). Both platforms run the same stack configuration,
`max=74000, errorPercent=25`, but that is a BYTE budget, so the frames a program
actually gets depend on how large its frames are:

```
Darwin arm64   GRAIL_STACK_OVERFLOW|enter=1|converted=1|deepest=72587   -> passes
Linux x86_64   AlmostOutOfStackError 2519 at stack depth 6,
               from GsProcess>>_start                                   -> session dies
```

Native code (on for x86_64, unavailable on arm64) spends the yellow-zone reserve
before the `RecursionError` can be built, so the error surfaces outside the
driver's per-test rescue. It is skipped in `scripts/cpython_suite_skips.txt`,
which exists for exactly this failure mode. Measured on both platforms after the
skip, the module now agrees to the digit:

```
Darwin arm64   ERROR | 226 | 14 | 34 | 3
Linux x86_64   ERROR | 226 | 14 | 34 | 3     (workflow_dispatch run 35623620330)
```

**175 passing tests are now visible on the board.** The skip costs Darwin one
real pass, which is the right trade for a CI-measured board.

`BadElementTest.test_recursive_repr` also exhausts the stack (61,324 frames on
Darwin) and was NOT skipped pre-emptively: CI died before reaching it, so its
Linux behaviour was unknown. Measured, it converts there too
(`deepest=61009`) and passes — a guess would have thrown away a real pass on
both platforms.

### Two lessons, one of them a gap

The first is procedural: the module was verified only on Darwin, and a recursion
limit that is a physical stack is exactly the thing that differs between the two
platforms. A module that drives recursion deliberately wants a Linux run before
it is called done — `workflow_dispatch` with `modules=` does that in minutes.

The second is a gap in the gate. The nightly that first measured the crash
reported `new test.test_xml_etree: CRASH (0 fail+err) -- no baseline` and still
passed with 0 regressions: a NEW module that enters the board as CRASH, STERROR
or TIMEOUT is never flagged, so this sat for three days behind green nightlies.
Fixed in the next entry.

## The gate now fails a module that enters the board measuring nothing

`check_cpython_regressions.sh` reported a module absent from the baseline and
moved on, deliberately: it cannot judge counts it has never seen. That left one
judgement on the table that needs no baseline at all. A module that enters the
board `CRASH`, `TIMEOUT` or `STERROR` measured nothing — the harness died, so
its `0 fail+err` is not a count — and `is_hard()` already calls the same move a
regression for a module that WAS on the board. Entering hard is no better than
moving there.

The rule stays narrow on purpose. A new module that enters `IMPORTERROR`, `ERROR`,
`FAIL` or `OK` is still reported and passed: an import failure is a real
measurement (the manifest carries such modules so the detail column can name
the missing symbol), and a module that runs has counts the gate simply has
nothing to compare with yet.

**Replayed against the nightly that let `test_xml_etree` through** — the real
09-21 CI board against the baseline committed at the time:

```
before   new       test.test_xml_etree: CRASH (0 fail+err) -- no baseline
         cpython regression gate: 0 regression(s), 3 improvement(s)    exit 0
after    REGRESSION test.test_xml_etree: entered the board as CRASH -- ...
         cpython regression gate: 1 regression(s), 3 improvement(s)    exit 1
```

The self-test gains seven cases, and they were checked against the OLD gate as
well as the new one: exactly the four that assert the new rule fail there
(entering as CRASH, TIMEOUT and STERROR, and a CRASH row on an empty baseline),
while the three that pin the rule's narrowness pass on both. A case that passes
before and after a change proves nothing about the change.

Safe to land today: the manifest and the committed board agree row for row
(104 and 104), so no module is "new" to the next nightly and this cannot turn it
red by itself. It fires the next time someone adds a module that crashes — which
is exactly when it should.

## A plain with ran the generator __enter__ returned

`with contextlib.closing(gen()) as it:` bound `None`.

Every `with` was compiled through the await helper `async with` needs
(`PythonCoroutine >> ___grailAwait___:`), on reasoning written into three comments:
the helper "passes a non-coroutine straight through, so the synchronous path is
untouched". It does not pass a GENERATOR through. It drives anything
generator-shaped to completion, as an `await` must for a generator-based
coroutine — so an `__enter__` that returned a generator had it RUN, and the `as`
target got its return value, `None`. A coroutine returned from `__enter__` was
likewise awaited where CPython binds it unawaited.

A plain `with` now has no await at all, as CPython has none. The class-side await
was really `async with` knowledge that `WithAst` held only so `AsyncWithAst` could
inherit it through `super`; it now lives in `AsyncWithAst`, which keeps it for an
`async with` outside a wrapped body. Both codegen arms change and both were
measured: the corpus (tier 2) and the text arm do not move, and the IR arm is 53
failures before and after with an empty name diff — this changes the code emitted
for every `with` in the corpus, and nothing moved.

Found through CPython's glob, which lists a directory with exactly
`contextlib.closing(_iterdir(...))`.
## A def __new__ under an if in a class body crashed the gem

```python
class A:
    if True:
        def __new__(cls, *args, **kwargs):
            ...
```

Uncatchable `ExecBlock does not understand #new`. A def at the TOP of a class
body compiles to a method; a def inside an `if` is a conditional binding, so it
reaches `object >> ___classBodyDefinitionalStore___:put:`. That store tested only
the getter/setter SHAPE, and every class answers both `__new__` and `__new__:` —
so it read them as an accessor pair and CALLED `object.__new__` with the function
standing in for the class.

**The gate that knew better already existed.** `___mayDispatchToSetter___:`
excludes `__new__`, because the one-argument `__new__` takes a CLASS, not a value
to store; it was added when PEP 702's `@deprecated` failed on the same shape.
`__setattr__` and `___pyAttrStore___` consult it. This third store never did, and
the gate's own comment named only the two it knew about — the same "two copies of
one decision, one of them never updated" that `os.fspath` had.

Narrow, measured: an unconditional `def __new__`, a conditional `def __init__` and
a conditional ordinary method all worked; only a conditional `__new__` failed.

Found through CPython's pathlib, whose `WindowsPath` defines `__new__` only off
Windows, so the real pathlib could not be imported at all.
## zipfile is CPython's own, and it can write

Started as "`test.test_zipapp` cannot import: no `zipapp`". Vendoring the 231-line
`zipapp` moved it to `ERROR` with 27 of 35 tests failing on one line —
`Grail's zipfile is read-only; mode 'w' is not implemented`. `zipapp` was
never the gap. Grail's `zipfile` was a 599-line hand-written reader, and the
fix was the one that worked for ElementTree: vendor CPython's real module,
verbatim, and let it find out what the rest of Grail is missing.

It found six things, in order, each a piece CPython has and Grail did not:

| blocked | missing | fixed by |
| --- | --- | --- |
| import | `os.SEEK_SET/CUR/END` | three constants beside the `O_*` flags |
| extraction | `os.path.splitdrive` (sanitises every member name) | `os_path.gs` |
| extraction | `os.makedirs(p, exist_ok=True)` matched no selector | a keyword form, no semantic change |
| adding a file named by a `Path` | `os.fspath(Path(...))` raised `TypeError` | one class-chain predicate shared with `___fsPath___:` |
| `zipapp.create_archive` | `shutil.copyfileobj` | CPython's six lines, verbatim |
| **listing any ordinary archive** | the `cp437` codec | `encodings/cp437.py`, verbatim |
| writing a **deflated** entry | `zlib.compressobj` | `ZlibCompress`, over `deflateInit2_` |

Plus `os.path.splitroot` and `os.path.samefile`, which the package and `zipapp`
use. Every piece was measured against CPython 3.14 before it was trusted.

### Two of those were regressions against the reader it replaced

This is the part worth keeping. The real `zipfile` *read* worse than the shim at
first, twice, and only the existing tests said so:

* **`cp437`.** CPython decodes a member name without the UTF-8 flag in `cp437`,
  and it sets that flag only for non-ASCII names — so `cp437` is the encoding of
  most archives in existence. Without it the real module could not *list* the
  CPython-made fixtures. `ZipfileTestCase` went from 14/14 to 1/14.
* **An exponential memory blow-up** reading a 320 KB member in 1000-byte steps,
  from a PRE-EXISTING zlib bug — next entry.

Neither would have surfaced by testing only what this change added. The CPython
round trip of archives Grail WROTE was clean; it was re-running the untouched
reader tests that exposed both.

## zlib's decompressobj prepended unconsumed_tail, which CPython does not

`ZlibDecompress>>decompress:_:` prepended the previous `unconsumed_tail` itself,
under a comment claiming that matched CPython. It does not. CPython's documented
protocol is that the CALLER hands the tail back, and every protocol-following
caller does — CPython's own `ZipExtFile._read1` among them. So each call received
the tail twice, and it grew with every call until the gem's temporary object
memory was exhausted.

Measured, `max_length=100` over 51,200 bytes:

```
                                      CPython              Grail before
A  empty follow-up calls              101 of 51200         (continued -- the bug)
B  pass unconsumed_tail back          51200 of 51200 exact AlmostOutOfMemory
```

**A test was pinning the bug.** `ZlibTestCase>>testMaxLengthAndUnconsumedTail`
fed empty follow-up calls and expected them to continue from the tail. Run under
CPython 3.14, its own final assertion was `False` — 533 of 131,072 bytes. It had
been written from what a Grail session did, which is exactly what
`scripts/check_python_fixtures.sh` warns about in its header. It now asserts the
documented protocol, and a second test pins that an empty follow-up does NOT
resume — the half that would catch the prepend coming back.

`tarfile` (no `max_length`, so never a tail) and `zlib_codec` (one-shot) were
unaffected; only a caller that uses `max_length` AND follows CPython's protocol
could see it, which is why it survived until CPython's own `zipfile` arrived.

## zlib.compressobj exists

`ZlibCompress` drives `deflateInit2_` / `deflate` / `deflateEnd` over the same
112-byte z_stream as `ZlibDecompress` (one shared allocator now, `zlib
_zeroedStream`). libz judges every option itself: a bad level, method, wbits or
memLevel comes back as `Z_STREAM_ERROR`, reported as CPython reports it —
`ValueError: Invalid initialization option` — with no second set of range checks
to disagree with libz. A finished stream raises CPython's exact
`Error -2 while compressing data: inconsistent stream state`.

Verified across implementations, not just by round trip: raw deflate written by
Grail decompresses in real CPython, and a DEFLATED zip written by Grail passes
CPython's `testzip()` with `compress_type` 8 on every entry.

`ZlibTestCase>>testCompressobjStillUnsupported` pinned the gap; it is replaced by
a round-trip test. `zdict` is refused with `NotImplementedError` rather than
silently compressing without the dictionary.

## Still open, found along the way

* **`os.makedirs` never raises `FileExistsError`.** `exist_ok=False` is not
  honoured and `mode` is not applied — by the one-argument form too, so both
  spellings behave the same. The keyword form was added to reach it, not to
  change it.
* **Subclassing `io.BytesIO` breaks `write` / `tell`** with an uncatchable
  `nil + ...` MessageNotUnderstood — the subclass instance's native state is
  never initialised. A plain `BytesIO` is fine.
* **`pathlib.Path` lacks `chmod`, `stat`, `open`, `match`** — 9 of the 11 errors
  left in `test_zipapp` (35 | 0 | 11 | 0, was IMPORTERROR).
* **`cp437` cannot ENCODE**: `'é'.encode('cp437')` raises where CPython answers
  `b'\x82'`. Decoding works, and zipfile only decodes with it (it writes names
  as ASCII or UTF-8), but the dict-based `charmap_encode` path is wrong.

## pathlib is CPython's own package

Grail's `pathlib` was a 272-line hand-written stub whose header called itself
"the minimum Path / PurePath surface" Flask needed. It is now CPython 3.14's
package (`src/python/stdlib/pathlib/`), vendored with two adaptations marked
`GRAIL`, and the modules it imports came with it: `glob`, `fnmatch` and
`posixpath` replace hand-written versions (110, 138 and 114 lines), and
`ntpath`, `genericpath` and a `_collections_abc` bridge are new. The same route
as ElementTree and zipfile: vendor the real module verbatim, and let it find out
what the rest of Grail is missing.

| blocked | missing | fixed by |
| --- | --- | --- |
| import | a class-body `def __new__` under an `if` was CALLED (`WindowsPath`) | #1081 |
| listing a directory | a plain `with` ran the generator `__enter__` returned | #1082 |
| import (`glob`) | `os.path.lexists` | `os_path.gs` |
| import | `_collections_abc` | a bridge onto `collections.abc` |
| `isinstance(x, os.PathLike)` | `os.PathLike.register` | `os.gs` |
| `isinstance(st, os.stat_result)` | the name `os.stat_result` | `os.gs` |
| `Path.stat(follow_symlinks=False)`, `Path.lstat` | a keyword form of `os.stat` | `os.gs` |
| `Path.touch` | `os.open` | GRAIL adaptation: builtin `open` in `'x'`/`'a'`, then `chmod` |
| `import pathlib.types` | `register()` on an `ABC` subclass | GRAIL adaptation: name `ABCMeta` |
| **`Path.resolve()`** | `os.path.realpath(p, strict=...)` | a keyword form |
| **`Path.mkdir(parents=True)`** | `os.mkdir` raising `FileNotFoundError` | the errno's own subclass |

### Two of those were regressions against the stub

`resolve()` and `mkdir(parents=True)` both worked with the stub, because it
reached `os` by a different road: its `mkdir` called `os.makedirs`, and its
`resolve` called `os.path.abspath`. The real module calls
`realpath(path, strict=strict)`, which matched no selector, and it creates
parents by catching the `FileNotFoundError` that `os.mkdir` raises for a
missing one — where Grail's raised a plain `OSError`, so the catch never fired.

Neither showed at import time, and neither showed in the first spike. They
surfaced only once a fixture made the calls a real caller makes, which is the
argument for `tests/python/real_pathlib.py` checking CALLS rather than names.

`os.mkdir` now raises what CPython's does: `FileNotFoundError`,
`FileExistsError`, `NotADirectoryError` or `PermissionError`, with `errno`,
`strerror` and `filename` set. The kernel primitive answers only `nil`, so the
errno is read back from the filesystem: the path already exists (`EEXIST`), its
parent cannot be stat'd (that stat's own errno), or the parent is not a
directory (`ENOTDIR`). The first version parsed the strerror text `GsFile`
leaves in its class error buffer instead. That passed every run on Darwin and
fell through to a plain `OSError` on CI's Linux gem — the text is not portable,
and a Mac run cannot say so. A directory that exists but refuses the entry
(`EACCES` on the final component) still raises a plain `OSError`.

### A class enumeration assumed every canonical value is a class

The full SUnit run found one more, outside pathlib entirely: five
`PythonClassEnumerationTestCase` errors, `a ALLOW_MISSING does not understand
#name`. genericpath declares its sentinel as

```python
@object.__new__
class ALLOW_MISSING: ...
```

and the canonical class registry keeps the FINAL object a module-scope class
statement bound, after its decorators — here an instance. The registry is right
to: a warm probe must hand back exactly what the build produced, and two readers
in `Object.gs` already guard with `isKindOf: Behavior`. `importlib pythonClasses`
and `pythonClassCensus` (#885) did not, so once any session had imported pathlib
and committed, the enumeration answered an instance among its classes. Both now
read the registry through one helper that yields classes only.
`tests/python/class_statement_binding_an_instance.py` puts such an instance in the
registry on purpose, so the two new tests do not depend on what some earlier
session happened to commit.

### A tripwire replaced

`GlobTestCase>>testDoubleStarRaises` pinned the stub's refusal of `**`. Real
`glob` recurses when asked, so the test became
`testDoubleStarRecursesOnlyWhenAsked`, and the two tests that compared listings
now compare `sorted(...)`: CPython's `glob` answers in directory order, which is
unspecified, and the stub had happened to sort.

### Still open, found on the way

None of these is a regression — the stub had none of these methods — but each is
a call the real pathlib now makes and Grail cannot yet answer.

* **`os.path.realpath` does not resolve symlinks.** `os.readlink` exists, so this
  is a gap, not a platform limit. On macOS every `tempfile` directory sits under
  `/var -> /private/var`, so `Path(tempfile.mkdtemp()).resolve()` differs from
  CPython there. `real_pathlib.py` compares paths relative to its root for this
  reason.
* **`os.rename` of a missing file returns normally.**
  `GsFile renameFileOnServer:to:` answers an errno on failure, and `os.rename`
  tests only for `nil`. `Path.rename` inherits it.
* **`OSError(2, 'msg')` stays an `OSError`.** CPython's `OSError.__new__` picks
  the subclass from the errno. `BaseException class >> ___classForArgs___:` is
  the hook for exactly this, but only the two-argument constructor consults it.
* **Missing `os` support for other `Path` methods:** `replace`/`move`
  (`os.replace`), `walk` (`os._walk_symlinks_as_files`), `is_mount`
  (`os.path.ismount`), `is_junction` (`os.path.isjunction`), and
  `as_uri`/`from_uri` (`urllib.request.pathname2url`/`url2pathname`).
* **`abc.ABC` does not carry `ABCMeta`.** That is why `pathlib.types` needs its
  adaptation; `abc.py` records why the switch is deferred.
