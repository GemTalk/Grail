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

* **A shipped codec is reachable from `str.encode` only once `codecs` is
  imported.** `___registeredCodecInfoFor___:` consults the registry only
  when `codecs` is already in `sys.modules` — right for a codec a program
  REGISTERS (none can exist earlier), too strict for one the `encodings`
  package ships. `'ab'.encode('utf-32-le')` therefore works from a module
  that imported codecs and raises `unknown encoding` from one that did not,
  where CPython needs no import at all.

  Importing on demand from inside `encode` is the obvious fix and is not
  free: loading a module reads a file and reading one decodes, so the
  bridge can re-enter itself. An attempt using
  `builtins.___import__:kw:` from that context failed (it needs a module
  context `encode` does not have); a session-flag re-entrancy guard plus a
  supported Smalltalk-side import entry point is the shape that would work.

## OPEN: the rest of PEP 572 (test_named_expressions, 12 remaining)

Walrus PLACEMENT is FIXED (2026-09-01, 21 -> 12) — see
`WalrusPlacementTestCase`. What is left is three separate things:

* **A walrus inside a list display emits invalid Smalltalk.** `[y := 5, y + 1]`
  compiles to `{y := 5. ...}`, which is a GemStone CompileError — an
  *uncatchable* one, so it escapes Python's `except` entirely:

  ```python
  exec('r = [y := 5, y + 1]', {})   # CPython fine;  Grail: Smalltalk CompileError
  ```

  Three tests (`assignment_05`, `_12`, `_18`) plus `scope_04` report it as
  "Grail could not compile this method (codegen gap)". A brace-array
  constructor cannot hold an assignment; the walrus needs hoisting out of
  the display.

* **Comprehension scope.** A walrus inside a comprehension binds in the
  ENCLOSING function scope, not the comprehension's — `scope_03`,
  `scope_in_genexp` and `scope_mangled_names` all turn on that, and Grail
  currently binds it comprehension-locally.

* **Two message shapes**: `invalid_16` wants CPython's wording rather than
  Grail's parser text, and `invalid_17` the "did you forget parentheses
  around the comprehension target?" hint.

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

### What is still missing: a real traceback

CPython prints a full traceback for an uncaught exception. The launcher prints
only the line that traceback ENDS with — `ValueError: boom`, on stderr — because
Grail has no frames to put above it here: `__traceback__` is nil on this path.
Measured, inside a Grail script:

```python
try:
    f()                       # raises ValueError('boom')
except Exception as e:
    print(e.__traceback__)    # None
    print(traceback.format_exc())   # 'ValueError: boom\n' -- no frames
```

So the gap is not in the launcher; it is that Grail does not attach a traceback
object on this path. Anything built on `traceback.format_exception` inherits it.

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
