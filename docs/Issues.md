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

## OPEN: the rest of PEP 560 (test_genericclass, 6 remaining)

`__bases__`/`__mro__` tuples, sole-base `__orig_bases__`, the varargs
receiver binding, and the runtime-assigned descriptor reads above are all
FIXED (2026-08-28, 10 -> 6). What is left, diagnosed:

* **`test_class_getitem_metaclass_first`** — a metaclass `__getitem__`
  must WIN over the class's own `__class_getitem__`; Grail checks
  `__class_getitem__` first.
* **`test_class_getitem_with_builtins`** — `B[int]` on a dict-subclass
  runs the wrong subscript path, so the hook never sets `called_with`.
* **`test_mro_entry`** — the inherited-hook lookup now FINDS the hook (it
  used to report `cannot subclass a non-class base`), and then the hook's
  body cannot reach its enclosing-scope free variable: the method belongs
  to the secondary base `C` but is performed against a `D` instance, and
  the class-cell lookup resolves against `D`. Cross-class non-virtual
  performs and closure cells do not compose here.
* **`test_mro_entry_type_call`** — `type(name, bases, ns)` with a
  substituted base builds a class with no `___dynInstVars___` holder
  (uncatchable does-not-understand).
* **`test_mro_entry_with_builtins` / `_2`** — an MRO containing a builtin
  base leaks Smalltalk ancestry: `(D, A, dict, dict, AbstractDictionary,
  Collection, object)` where CPython has `(D, A, dict, object)`. The same
  leak shows up directly as `list.__mro__` being
  `(list, SequenceableCollection, Collection, object)`, so it is not
  specific to the substitution path.

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
  where CPython reports the unconsumed keyword.

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
