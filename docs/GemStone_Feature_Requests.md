# What Grail Needs from GemStone

Feature requests to the GemStone kernel team, with the evidence behind each one.

This is the citation appendix for the ranked summary; every claim below carries
the `file:line` it came from so a reader can check it rather than trust it.
Three source trees are cited:

| Prefix | Tree |
| --- | --- |
| (none) | this repository |
| `KERNEL:` | GemStone image Smalltalk (Tonel), `image/rowan/src/Filein*/` in the GemStone product source tree |
| `VM:` | GemStone C VM source, `src/` in the same tree |

Measured against **GemStone 4.0.0** (stone `gs40`), which is what this checkout
runs — see `.setenv`.

**Citation convention.** Repository files are cited `path:line`, which anyone
with this checkout can resolve. Kernel Smalltalk is cited **file + selector**
rather than by line: line numbers differ between the product tree and a
per-stone `.gemstone` dump of the same image, so a selector is the only form
that survives the difference. VM C sources keep line numbers, each verified
against the 4.0.0 tree at the time of writing.

**How the asks are sized.** `Small` = additive, sits beside existing kernel
code. `Medium` = new mechanism, contained scope. `Structural` = touches object
format or VM policy.

## Contents

1. [Catchable failure semantics](#1-catchable-failure-semantics)
2. [Representation ceilings](#2-representation-ceilings)
3. [Unicode and string primitives](#3-unicode-and-string-primitives)
4. [Filesystem and child processes](#4-filesystem-and-child-processes)
5. [Sockets and TLS](#5-sockets-and-tls)
6. [Persistent weak references](#6-persistent-weak-references)
7. [What we are not asking for](#7-what-we-are-not-asking-for)
8. [Already in the kernel — Grail work, not asks](#8-already-in-the-kernel--grail-work-not-asks)

---

## 1. Catchable failure semantics

The governing principle, stated in Grail's own design notes: *"an uncatchable
Smalltalk error escaping into Python code is strictly worse than a
wrong-but-catchable one"* (`docs/Python_Traceback_Design.md:3290`). Everything
in this section is a condition that escapes today, taking a test module, a
topaz session, or a whole scoring run with it.

### 1.1 Stack headroom: query + soft limit — Medium

| | |
| --- | --- |
| **Condition** | `AlmostOutOfStack`, notification 2059, with an untrappable "Red Zone" beneath it |
| **Python trigger** | Any unbounded recursion: `def f(): return f()`; a self-referential `@property def __bases__`; a `__getattr__` manufacturing classes per level; recursive `repr`/`pickle` |

Evidence:

* Red Zone, and the statement that it cannot be handled — `tests/python/recursion_limit.py:1-10`, `:45-60`
* Depth table and the arrival point moving with one extra frame per level — `docs/Python_Traceback_Design.md:1335-1345`, `:1356-1380`, `:1936`
* Grail's boundary guard, using `resignalAs:` so one guard serves every `except RecursionError` below it — `src/smalltalk/Python/BaseException.gs:474-511`, installed at `src/smalltalk/Python/importlib.gs:1713-1726` and `scripts/run_one_cpython_module.gs:161-169`
* Why a broad handler is not an option: catching it with `on: Exception` triggers `UncontinuableError` "return … would cross frame of C primitive" and scores the module CRASH at t=0 — `src/smalltalk/Python/builtins.gs:3298-3312`
* Session-fatal cases, re-verified 2026-08-05 — `scripts/cpython_suite_skips.txt:282-300` (test_isinstance, CRASH t=0, all 23 results lost), `:172-197` (test_functools, unrecoverable 6011 cascade kills topaz, 0 of 325 scored), `:12-31` (four test_itertools overflow tests)
* **A running GsProcess has zero addressable frames** — `GsProcess current` answers `stackDepth` 0 at top level and 20 frames deep alike; `_frameContentsAt: 1` answers nil — `docs/Python_Traceback_Design.md:1974`, `:3716`, `:3776-3790`
* Consequence: `sys.getrecursionlimit()` is a hardcoded 1000 and `setrecursionlimit` a no-op — `src/smalltalk/Python/sys.gs:836-837`, `:975-976`
* Configuration is external only: the suite runs at `GEM_MAX_SMALLTALK_STACK_DEPTH=80000` to reach ~6,645 Python frames where the 1000 default reaches 187 — `scripts/run_cpython_suite.sh:42-46`, `docs/Python_Traceback_Design.md:1360-1366`

**Measured 2026-08-20 on gs40 (4.0.0), and it revises part (a) of the ask below.**

* **A cheap in-session depth query DOES exist: `System stackDepth`.** It reports
  the RUNNING process, unlike `GsProcess current stackDepth` (which answers 0 --
  the measurement the bullet above records, and the reason this ask was written as
  if no query existed). Verified exact: 4 at top level, 15 at ten frames deeper,
  105 at a hundred. Cost **11 ns** per send (10M sends in 109 ms), against 6.7 ns
  for `Association>>value` as a floor.
* **But polling it per call is not a substitute for a VM-side limit.** One trivial
  Python call in Grail measures **31 ns** (2M calls, loop-with-call minus
  loop-only, 282 ms - 220 ms). A depth check on every Python call is therefore
  **~35% overhead on call-heavy code**, which is why Grail has not adopted it.
  What is still missing is the *settable soft limit* half of the ask, not the
  query.
* **Both parameters ARE documented, in `$GEMSTONE/data/system.conf`, and the docs
  match what was measured.** An earlier revision of this section called the mapping
  undocumented; that was wrong, and the real definitions explain the numbers:
  * `GEM_MAX_SMALLTALK_STACK_DEPTH` -- *"Size of GemStone Smalltalk execution stack
    space allocated at GciLogin time, in units of approximate number of method
    activations. Causes stack memory allocation of approximately 64K bytes plus 128
    bytes per activation."* Default 1000, min 100, max 80000. So the setting is a
    BYTE BUDGET expressed in nominal 128-byte activations, NOT a frame count -- and
    the frames a given program actually gets depend on how big its frames really
    are. That is the whole explanation for 1000 -> 3072 measured here: the probe
    recursed through a small block whose activations are well under 128 bytes, so
    more of them fit. Fatter frames reach fewer. Nothing to ask for; it just cannot
    be read as "N frames".
  * `GEM_SMALLTALK_STACK_ERROR_PERCENT` -- *"The size of the stack overflow error
    handling area... execution of the error handler runs in this error handling area
    (yellow zone) area of the stack. If the stack grows beyond the yellow [zone] a
    not-trappable AlmostOutOfStackError is signaled to the GCI. This config value is
    a percentage of GEM_MAX_SMALLTALK_STACK_DEPTH."* Default 25, min 10, max 100.
    "Yellow zone" is the product's own term for the reserve measured above, and the
    measurement (trip point unchanged, reserve growing with the percentage)
    confirms the documented behaviour rather than discovering it.
* **A NEW BUG, unrelated to the ask: `System stackDepthHighwater` COREDUMPS the
  gem.** The selector next to `stackDepth`, from a bare
  `./scripts/evaluate.sh 'System stackDepthHighwater printString'`:
  `HostCoredump: Waiting 60 seconds for C Debugger to attach`. Reproduced twice on
  4.0.0.
* **The two knobs, measured. `GEM_SMALLTALK_STACK_ERROR_PERCENT` does NOT move the
  trip point -- it sets the RESERVE that remains after it.** The trip stayed at
  3072 frames across 25 / 50 / 75, but the depth still reachable from inside the
  handler scaled with it:

  | ERROR_PERCENT | AlmostOutOfStack at | deepest reachable after | reserve |
  | --- | --- | --- | --- |
  | 25 (default) | 3072 | 3415 | ~343 frames |
  | 50 | 3072 | 4098 | ~1026 frames |
  | 75 | 3072 | 4780 | ~1708 frames |

  `GEM_MAX_SMALLTALK_STACK_DEPTH` is what moves the trip: 100 -> 2048, 500 -> 2390,
  1000 -> 3072, 2000 -> 4438, 4000 -> 7168, 8000 -> 12630, 20000 -> 28672. It
  scales but NOT proportionally, and the configured number is never the frame
  count, so the mapping cannot be predicted from the setting.
  BOTH are startup-only: `System configurationAt:put:` answers `ImproperOperation`
  for each at runtime.
* **An UNEXPLAINED divergence, recorded rather than diagnosed.** Twice, inside
  SUnit, a shape reported `raised RecursionError instead: maximum recursion depth
  exceeded` -- the exception IS a `RecursionError` and `except RecursionError:` did
  not match it, while a later `except Exception:` did. The same shapes match
  correctly outside SUnit. The obvious explanation is that clause resolution
  (`PyLazyExceptSelector` evaluates the clause expression inside `#handles:`, which
  is what gives Python's lazy timing) cannot run with the stack nearly gone -- but
  that is NOT SUPPORTED: padding the call chain with 400, 800 and 1200 extra frames
  reproduces nothing, at ERROR_PERCENT 25 or 75. So raw depth is not the variable
  and the cause is open. Candidates not yet tested: the clause SHIELD
  (`___handlerTokenActive___:`), which is sensitive to which handlers are active,
  and SUnit's own `on:do:`/`ensure:` frames.
* Recursion through `__getattr__` is worse and unfixable in Grail: the overflow
  arrives with C-PRIMITIVE frames on the stack (the `doesNotUnderstand:` route a
  missing attribute takes), and the `return` in the `except` clause cannot cross
  them -- `CannotReturn` -> `UncontinuableError` 6011, session-fatal. See 1.5.

**Ask, revised by the measurements above -- two thirds of the original ask already
exist.** The depth QUERY exists (`System stackDepth`) and the unwind RESERVE is
settable (`GEM_SMALLTALK_STACK_ERROR_PERCENT`, ~343 -> ~1708 frames across its
range). What remains:

* (a) **Runtime settability.** Both stack parameters are startup-only, so a library
  cannot raise its own reserve before doing something recursive, and a deployed
  application inherits whatever the gem was launched with.
* (b) ~~A documented mapping from `GEM_MAX_SMALLTALK_STACK_DEPTH` to the frame
  ceiling.~~ **WITHDRAWN** -- it is documented (64K bytes + 128 bytes per
  activation, in units of *approximate* activations), and the non-proportionality
  is a consequence of real frames differing from the nominal 128 bytes, not a gap.
  A caller genuinely cannot predict its own frame sizes, so picking the setting
  empirically is inherent rather than a missing feature.
* (c) ~~Reclassify 2059 as a catchable `Error` rather than a `Notification` under
  `Exception`.~~ **WITHDRAWN -- ALREADY AVAILABLE.** `AlmostOutOfStackError class >>
  enable` (which is `System _updateSignalErrorStatus: 10 toState: true`) switches
  the VM to signal `AlmostOutOfStackError`, error **2519**, an ordinary `Error`
  instead of the notification. Verified catchable with a handler that RETURNS:

  ```smalltalk
  AlmostOutOfStackError enable.
  [runaway] on: AlmostOutOfStackError do: [:ex | ex return: #caught]   "=> #caught"
  ```

  Grail now enables it once per session (`importlib class >>
  ___ensureStackErrorFlavour___`). Two notes for anyone else adopting it, both
  learned the hard way: enabling makes every `on: AlmostOutOfStack` handler stop
  matching SILENTLY, so the conversion sites must move to an ExceptionSet in the
  same change; and handlers deliberately narrowed to `on: Error` *because* the
  signal was a Notification now swallow it, so they have to pass it explicitly.
  Neither half fails loudly on its own.

  The motivating bug (PR #582) is unaffected either way: a broad
  `on: AbstractException` swallows the Error just as it swallowed the
  notification. What the Error flavour fixes is the SHAPE -- `Admonition`'s default
  action is to RESUME, and resuming after the VM says it is nearly out of stack is
  how that crash reached the Red Zone.

**Raising the reserve buys nothing measurable, and the cost I first reported was a
FLAKE.** Tried `GEM_SMALLTALK_STACK_ERROR_PERCENT=75` for test runs, on the theory
that a handler search needs room:

* No benefit: `test.test_traceback` scored `f=13 e=3` with an IDENTICAL failure set
  at 25 and at 75.
* No cost either, on the evidence. A first run at 75 failed
  `TracebackTestCase>>testLiveFramesAndGetframe` (`depth_counts_outwards`), and an
  earlier revision of this section reported that as the parameter perturbing live
  frame addressing. **WITHDRAWN.** Two further runs at 75 were clean (5449/5449),
  making the sample 1 failure in 3 -- and a DIRECT probe settles it: dumping 12
  live frame levels from an identical call chain gives byte-identical selectors at
  25 and at 75. The parameter does not move the numbering.

So the setting is NEUTRAL, Grail does not use it, and there is nothing here to ask
GemStone for. What the episode did establish is that
**`TracebackTestCase>>testLiveFramesAndGetframe` is FLAKY**: `depth_counts_outwards`
reported `sys._getframe(2)` naming the calling function instead of its own, once in
three runs at a configuration where the other two passed. That is a Grail bug to
chase on its own, not a GemStone one.

Grail's own words for what it needs: *"a bound on Python recursion depth reached
BEFORE the stack runs out -- i.e. a real `sys.setrecursionlimit`"*
(`tests/python/recursion_limit.py:62`).

### 1.2 Stable error numbers for limit conditions — Small

Where a limit cannot move, its failure should at least be identifiable. Grail
currently distinguishes the 255-attribute ceiling by **matching English message
text**:

* `src/smalltalk/Python/Object.gs:4677-4707` — wraps the store in `on: Error do:`,
  matches `'more than 255 dynamic instVars'`, resignals as `MemoryError`. The
  comment at `:4698` says why: *"Match on the reason, not the class:
  ImproperOperation covers more than this one condition"*
* Same shape for invariant writes — `rtErrObjInvariant` escapes as an uncatchable
  *"Attempt to modify invariant object"* (`src/smalltalk/Python/Bytes.gs:2448-2452`)
* And for the empty-Symbol refusal — `src/smalltalk/Python/Object.gs:4727-4735`,
  kernel site `KERNEL: Filein1A/Object.extension.st >> dynamicInstVarAt:put:`

**Ask.** Distinct, documented, stable error numbers for these conditions.
Cheapest item in this document, independent of every other ask, and it hardens
guards Grail has already written against message-text drift across releases.

### 1.3 Catchable out-of-memory, with a headroom query — Medium

* Founding rationale of the whole skip list — `scripts/cpython_suite_skips.txt:3-10`
* *"HARD VM death (uncatchable OutOfMemory)"* — `scripts/run_one_cpython_module.gs:124-130`
* `GEM_TEMPOBJ_CODE_SIZE` is the binding knob for a long session; `code space
  doits_meths overflow` arrives long before object memory — `docs/Shim_Foreign_Proxy_Misattribution.md:318-322`, `:369-372`
* Measured: *"VM temporary object memory is full"* at ~100k `def` evaluations —
  `src/smalltalk/Python/ExecBlockAttrs.gs:395-410`
* Grail's mitigations are all avoidance: lazy iterators (`src/smalltalk/Python/seq_iterator.gs:29`,
  `filter_iterator.gs:26`, `zip_iterator.gs:26`), pre-computed length caps
  (`src/smalltalk/Python/Bytes.gs:2691`), per-module topaz isolation

**Ask.** A catchable, per-allocation OOM (Python `MemoryError`) rather than a gem
kill, plus an in-session query for remaining temp-object and code space.

### 1.4 Re-signal an exception that carries handler frames — Medium

Error 6011, *"Exception has already been signaled"*: the VM refuses `#signal` on
an instance still holding handler frames in its indexed slots. Python re-raises
the same exception object routinely.

* Full analysis — `src/smalltalk/Python/PythonGenerator.gs:332`, `:364-380`
* `docs/Python_Traceback_Design.md:2118-2125`, `:2155-2160`
* 6011 is what **rejected an otherwise semantically exact `try/except` codegen
  design** — `src/smalltalk/PythonAst/TryAst.gs:84-92`
* Surfaced raw from a jinja2 template render — `src/smalltalk/PythonTests/GeneratorStopTestCase.gs:210-240`
* Identity matters: the copy workaround breaks `contextlib`'s `if exc is not
  value: raise` — `src/smalltalk/PythonTests/ReraiseIdentityTestCase.gs:36-45`
* Cascades are session-fatal — `scripts/cpython_suite_skips.txt:178-181`; an
  *"UncontinuableError storm"* at `src/smalltalk/Python/ShimSreModule.gs:1517`

**Ask.** Allow re-signalling an instance that carries handler frames, or expose a
supported "detach frames / make resignalable" primitive.

### 1.5 Unwind across user-action and C-primitive frames — Medium

Errors 2758 (`ERR_EXC_RETURN_DISALLOWED`) and 2079 (`RT_ERR_CANT_RETURN`).

* **STANDALONE REPRODUCER, no Grail: `src/c/ua_unwind_probe/` +
  `scripts/probe_ua_unwind.gs`.** ~100 lines of C declaring three GCI user
  actions, each of which calls back into Smalltalk with `GciPerform` on a method
  that signals, while the caller holds a handler OUTSIDE the action that tries to
  recover with `ex return:`. Build with `make -C src/c/ua_unwind_probe` (it must
  link `$GEMSTONE/lib/gciualib.o` for `GciUserActionLibMain`), then
  `topaz -l -I .topazini -S scripts/probe_ua_unwind.gs` -- which files in class
  `Kermit52015`, whose single class-side method `probe_ua_unwind` IS the probe,
  and runs it once. The class is committed, so re-running it later needs only
  `Kermit52015 probe_ua_unwind`.
  Measured on 4.0.0 / arm64 Darwin -- **the refusal reproduces, and presents in two
  different ways depending on what the C code does:**

  | action | C side sees | Smalltalk caller gets |
  | --- | --- | --- |
  | `uaPerformIgnore` (ignores GciErr, returns) | `GciErr number=2758` | **`nil`** -- the handler NEVER RAN; the exception vanished silently |
  | `uaPerformReraise` (`GciRaiseException`) | re-raises 2758 | `UncontinuableError` (2758), *"return from on:do: block would cross frame of C primitive, user action, or FFI call"* |
  | `uaPerformNested` (raise two activations up) | `GciErr number=2758` | `nil` -- distance from the C frame does not matter |

  The first row is the more dangerous: a caller that wrote
  `[...] on: Error do: [:ex | ex return: #fallback]` receives neither its fallback
  nor an error, but `nil`, which is indistinguishable from a successful empty
  answer. The second is the amplification this ask describes -- a recoverable
  `Error` replaced by a non-recoverable one. Note the product's own error text
  names all three cases: C primitive, **user action**, or FFI call.
* **Reproduction script: `scripts/probe_unwind_boundary.gs`** (run
  `./scripts/evaluate.sh < scripts/probe_unwind_boundary.gs`). Its Part 1 is a
  NEGATIVE CONTROL and the more useful half: the BASE IMAGE DOES NOT REPRODUCE
  THIS. Eight shapes where a block is called from a kernel method and raises --
  `sort:`, `detect:`, `do:`, `collect:`, `perform:`, `perform:env:`, a raise from
  an `ensure:` during unwind, and a dictionary iteration callback -- ALL unwind
  correctly with `ex return:`. So the refusal is not a property of ordinary block
  callbacks or of `perform:`, and the defect is isolated to frames that are C USER
  ACTIONS (or the primitive frames a deep `doesNotUnderstand:` chain leaves). Part
  2 drives real user actions and **does not reproduce it either**: `shimWrapProbe`
  over three argument shapes answers normally, and `shimLoadModule` on a `.py`
  module whose BODY raises -- the documented shape, a Smalltalk raise with a
  user-action frame on the stack -- let the handler outside recover cleanly. So
  TWELVE shapes, no 2758: the refusal needs something narrower than "a user action
  whose Smalltalk callback raises", and on this evidence that is the numpy/`PyInit`
  frontier 1.5's own citation points at.
* The C-PRIMITIVE twin, measured 2026-08-20: Python recursion through
  `__getattr__` overflows with `doesNotUnderstand:` primitive frames on the stack,
  and the `return` in an `except RecursionError:` clause cannot cross them --
  `CannotReturn` -> `UncontinuableError` 6011, session-fatal, where every other
  recursion shape converts cleanly (`tests/python/recursion_shapes.py`).
* Isolation experiment showing the context **amplifies recoverable bugs into
  fatal ones** — `docs/Shim_NumPy.md:46-90`
* Sites — `src/smalltalk/Python/CPythonShim.gs:939`, `:1029`, `:1304`; `Object.gs:7546-7550`
* A DNU inside a user action becomes 2758 rather than a recoverable MNU; an
  `AttributeError` unwinding across the frame becomes a storm

* **SECOND REPRODUCER, through Grail's real shim:
  `scripts/probe_shim_error_propagation.gs`** (run
  `topaz -lq -T 400000 -I .topazini -S scripts/probe_shim_error_propagation.gs`).
  Where `probe_ua_unwind` isolates the VM behaviour with ~100 lines of C, this
  drives the same refusal through the production path -- `shimCall`, a C
  extension module, and `CPythonShim>>___shimUserAction:` -- across four shapes
  that differ only in what the C code does after the failing `GciPerform`. Its
  two purpose-built C entry points are `test_silent_raise` and
  `test_erased_raise` in `src/c/shim/_shimtestmodule.c`. Measured on 4.0.0 /
  arm64 Darwin, and it adds three facts that change what the ask should be:

  1. **The C caller never receives the original exception, so no amount of
     error-checking in C can recover its class.** The callback raises
     `LookupError` (2021, `rtErrKeyNotFound`) -- confirmed by calling the same
     callback directly, outside any user action, where it is caught cleanly as
     `LookupError`. What `GciErr` reports to the user action is a *substituted*
     exception: `2758` in the standalone probe, `2059` (`AlmostOutOfStack`,
     *"overflow during execution"*) through Grail's shim, whose callback does
     more work before raising. In both cases `GciErrSType.message` and
     `.reason` are EMPTY, and while `.exceptionObj` is populated it holds the
     substituted exception, not the raised one. Checking immediately after the
     `GciPerform` -- the earliest a user action can possibly look -- still sees
     2059, so the original is destroyed inside the VM before the perform
     returns.
  2. **How the refusal presents is decided by the OUTER HANDLER, not by the C
     code.** This reconciles the two rows of the table above with what Grail
     actually sees. A handler that recovers with `ex return:` gets the silent
     `nil` (`uaPerformIgnore`). A handler that RE-SIGNALS -- which is what
     `___shimUserAction:` does, via `on: Error do: [... ___translateShimError:
     ...]` -- crosses the frame again, so 2758 is re-raised repeatedly and the
     session ends in `UncontinuableError 6011` after `AlmostOutOfStack`. The
     dangerous row and the fatal row are the same defect seen through
     different handlers.
  3. **Consuming the error in C converts session-fatal into merely
     misclassed.** Calling `GciErr()` right after the failing perform (which
     clears the error) lets the C frames unwind on CPython's own return-code
     convention and the user action return normally, so nothing attempts the
     cross-frame unwind at all. Measured: `test_erased_raise` goes from
     `UncontinuableError 6011`, session-fatal, to a catchable `RuntimeError`.
     This is the only mitigation available from the client side, and Grail now
     applies it at 13 container call sites -- but the exception arrives as
     `RuntimeError` with an empty `messageText`, so `except LookupError:`
     around C-extension code still cannot work.

* **THIRD REPRODUCER, and it WITHDRAWS an earlier ask:
  `scripts/probe_ua_exception_obj.gs`** with the `uaExcObj` action in
  `src/c/ua_unwind_probe/`. No Grail. The action performs an arbitrary
  selector, dumps every field of the trapped `GciErrSType`, and RETURNS
  `err.exceptionObj` so Smalltalk decides what came back.

  An earlier revision of this section claimed `GciErrSType` does not carry the
  signalled exception. **That was wrong**, and it was wrong because both
  shapes it was inferred from had already been spoiled -- one by a `2758`
  refusal, one by a `2059` overflow. Measured on 4.0.0, with NO handler
  outside the user action, `err.exceptionObj` carries the real exception with
  its class and `messageText` intact, a custom `Error` subclass included:

  | callback raises | `err.number` | `err.exceptionObj` is |
  | --- | --- | --- |
  | `self error: 'boom'` | 2318 | `UserDefinedError`, *'boom from plainError'* |
  | `UaExcProbeError new signal:` | 2710 | **`UaExcProbeError`** -- the custom subclass survives |
  | `1 / 0` | 2026 | `ZeroDivide`, full reason text |
  | `self glorpFrobnicate` | 2010 | `MessageNotUnderstood`, full text |
  | `Dictionary new removeKey:` | 2021 | `LookupError`, full text |

  So GemStone hands a user action everything it needs. Two caveats that
  matter for client code:

  Re-run on **3.7.5**: byte-identical results in all three columns below.
  This behaviour is not version-specific, so 1.5 is one defect on both
  supported releases rather than two.

  1. `err.message` and `err.reason` are **EMPTY** in every one of those rows.
     The text is only in `exceptionObj messageText`. A user action that reads
     `err.message` -- which is what Grail's `check_gci_error` does -- throws
     away the class and the message both, and that alone explains the
     `RuntimeError` with empty text that this section previously blamed on
     the VM.
  2. The substitution to `UncontinuableError` 2758 is caused by **the OUTER
     HANDLER, not by the raise.** Same callback (`1 / 0`), varying only what
     encloses the user-action call:

     | enclosing construct | what the C code sees |
     | --- | --- |
     | nothing | `ZeroDivide` -- the real exception |
     | `ensure:` only | `ZeroDivide` |
     | `on:` a NON-matching class | `ZeroDivide` (handler present, never found) |
     | `on:` matching, `ex resume:` | no error at all; the perform succeeded |
     | `on:` matching, `ex return:` | `UncontinuableError` 2758 |
     | `on:` matching, `ex pass` | `UncontinuableError` 2758 |

     A matching handler that TERMINATES is the trigger; a resuming one, a
     non-matching one, and `ensure:` are all fine. This is Grail's own
     situation exactly: `CPythonShim>>___shimUserAction:` installs
     `on: Error do: [... ___translateShimError: ...]` OUTSIDE the user action,
     and `___translateShimError:` ends in `ex pass` or a re-signal -- both
     terminating. **Grail is manufacturing its own 2758**, and the repeated
     re-signal is what then escalates it to `AlmostOutOfStack` /
     `UncontinuableError 6011`.

**Ask,** in priority order, revised by the third reproducer:

1. **Permit the unwind.** This is back to being the ask that matters. The
   refusal is narrow and now precisely characterised -- a matching handler
   outside the frame that terminates -- and it is the only thing standing
   between a user action and faithful error reporting. Everything else on this
   list is a workaround for it.
2. **Never lose the exception.** `uaPerformIgnore` shows a handler that never
   runs and a caller that receives `nil`. The refusal must be reported rather
   than swallowed -- silent `nil` is worse than any error.
3. **Do not escalate a re-signal into a session kill.** Translating one
   exception into another is the normal reason to catch it, and `ex pass` /
   re-signal from a handler outside a user action currently ends the session
   rather than reporting the refusal once.

   Characterised 2026-08-23, and the loop is on GRAIL's side of the line,
   which is worth stating plainly. `ex pass` is NOT loopy in general: on
   committed code an unparseable shim error (`'Module not found: foo'`, which
   `___translateShimError:` cannot map to a Python class, so it passes)
   answers `Error (2710)` once and cleanly, because `GciRaiseException` has
   already unwound the C stack and the pass has somewhere to go. The loop
   needs a REFUSAL in the cycle, which needs the user-action frame to still
   be live -- i.e. an exception that propagated NATIVELY rather than through
   `GciRaiseException`. Then: refusal (2739/2758) -> caught by
   `___shimUserAction:`'s `on: Error do:` -> `___translateShimError:` cannot
   parse it -> `ex pass` -> refusal again -> ... allocating an exception each
   turn. It presents as `AlmostOutOfStack` on a default stack and as
   `OutOfMemory almost out of memory, too many markSweeps` with
   `GEM_MAX_SMALLTALK_STACK_DEPTH=25000`, which is how it was identified as
   unbounded allocation rather than depth. Bypassing `___shimUserAction:`
   entirely gives ONE clean `UncontinuableError` and no loop.

   So the Grail-side fix is to stop the wrapper's handler feeding a refusal
   back into itself -- and `scripts/probe_ua_process_and_stack.gs` shows that
   needs NO new GemStone API, which retires two asks drafted here earlier.

   **It is ONE continuous stack, with the user action in the middle.** A stack
   report taken inside a callback, and the same report taken by a handler
   outside, both show the boundary as `<Reenter marker>` frames:

   ```
    1 UaStackSubject >> raiseIt              <- the callback
    ...
    7 <Reenter marker>                       <- the C / user-action boundary
    8 <Reenter marker>
    9 System class >> userAction:with:with:
   10 [] in Executed Code                    <- the CALLER's frames, below
   11 ExecBlock0 (ExecBlock) >> on:do:
   ```

   Not a fresh stack with the user action at the bottom. And the callback runs
   on the **same green thread**: `Processor activeProcess` inside it is the
   identical object (`==`, same oop) the caller sees. So a user action never
   needs the process passed in -- it can obtain it -- and `GciContinueWith`
   fails for a different reason, below.

   **A handler can therefore SEE that an unwind will be refused, before
   trying it.** `(GsProcess stackReportToLevel: 60) includesString: 'Reenter
   marker'` answers `true` from inside the handler, so `___shimUserAction:`
   can choose to translate-and-report rather than attempt an `ex return:` that
   becomes 2758 and then loops. (Building a report String is too costly for a
   hot path, but this only runs once something has already failed. A cheap
   predicate -- "is a C-primitive/user-action frame live?" -- would still be
   welcome, and is the one thing here worth asking for.)

   **Returning a value was never missing.** The user-action return convention
   is an ordinary C `return` of an `OopType`; `GciRaiseException` is the other
   way out, and it unwinds the C frame before signalling, which is why a
   handler CAN recover from an error the shim raises that way. There is no
   `GciNbReturn` -- the whole `GciNb*` family is the non-blocking client-side
   variants, unrelated to user actions -- and none is needed.

   **`GciContinueWith` cannot serve as one.** Called from inside a user action
   with the correct process OOP (obtained as above) after a trapped callback
   error, measured on 4.0.0: it returns `OOP_NIL`, reports `err.number = 0`
   -- i.e. claims success -- and the caller then fails with `InternalError`
   (2092). The tell was already in the struct: it documents `process` as
   coming from an error report's `context` field, and inside a user action
   that field is `OOP_NIL` (`0x14` = 20). It is a client-side API for resuming
   a gem's SUSPENDED process; here the process is not suspended, it is the one
   executing us, so there is no point to continue from and
   `replaceTopOfStack` has nothing to replace.

   **And the stack was never the constraint.** `System stackLimit` is 1000,
   depth inside a callback is 8, so ~992 frames of headroom; the user-action
   call itself costs four frames. Any "ran out of stack inside the user
   action" explanation -- including one this document briefly carried -- has
   to answer to that number.
4. Failing 1, make the refusal **catchable and distinguishable** -- a specific
   exception class the caller can handle, rather than `UncontinuableError`
   substituted for the original.

**NOT an ask, retracted:** "make the original exception available to the user
action." It already is. See the third reproducer above.

### 1.6 In-session interrupt and timeouts — Medium

| Mechanism | Present? |
| --- | --- |
| External poll-and-kill watchdog (per module, 600s) | Yes — the only working option (`scripts/run_cpython_suite.sh:48-65`, `:232-233`) |
| Topaz REPL soft `Break` | Yes, REPL only (`scripts/grail.tpz:107`) |
| Terminate a GsProcess mid-primitive | No |
| Timeout on a primitive or doit | No |
| `KeyboardInterrupt` delivery path | None |

Hangs this leaves unkillable from inside: `d.extend(d)` unbounded growth
(`scripts/cpython_suite_skips.txt:275-278`), megabyte `bytes.find`
(`:115-124`), real-thread contention deadlocking cooperative green threads
(`:11`, `:125-130`).

**Ask.** A deliverable soft break that unwinds as a catchable Smalltalk
exception, and wall-clock timeouts on a doit.

### 1.7 Runtime name resolution for dynamically compiled code — Small

`CompileError` 1001/1031 aborts the entire `exec`/`eval` compilation unit and
cannot be caught from Python.

* *"a CompileError is a SMALLTALK exception, so it is not catchable from Python"*
  — `src/smalltalk/PythonTests/ExecStarImportTestCase.gs:44-53`, `:118`
* *"which aborts the entire exec() and CANNOT be caught"* — `src/smalltalk/PythonTests/EvalExecModeCodeTestCase.gs:68`
* *"takes the whole enclosing MODULE down"* — `src/smalltalk/PythonTests/ClassBodyUnpackingTestCase.gs:44`, `:131`
* Blocks `eval(repr(d))` round-trips — `scripts/cpython_suite_skips.txt:68-74`
* Grail's partial defence: catch `CompileError` and install a raising stub so one
  bad method does not abort a class build — `src/smalltalk/Python/Class.gs:437-483`

**Ask.** A compiler mode where an undefined symbol compiles to a runtime-raising
send instead of failing the whole compilation unit.

---

## 2. Representation ceilings

### 2.1 The 255 dynamic-instVar cap — Structural

Grail stores every Python attribute as a GemStone dynamic instVar — measured as
faster than a dictionary (`docs/Rewrite_Dispatch_Model.md:302-304`, `:418-423`;
benchmark `scripts/benchDynamicInstVar.gs`). So the VM's cap becomes a hard
**255-attribute ceiling on every Python class, instance, and module**.

* VM enforcement — `VM: src/intloop.c:2157` *"object cannot have more than 255 dynamic instVars"*
* Objects that refuse dynamic instVars entirely (special objects, `Class`,
  `GsNMethod`, `ExecBlock`) — `VM: src/intloop.c:2067-2085`
* Full measurement, §9.41 — `docs/Python_Traceback_Design.md:3254-3305`: *"Grail
  dies on the 256th"*; both class and instance receivers cap at 255; *"Python
  code cannot defend against this, cannot detect it, and gets no traceback it
  can act on"*
* Two workaround subsystems exist only because of the refusals: the ExecBlock
  side-table (`src/smalltalk/Python/ExecBlockAttrs.gs:1-30`, needed because
  jinja2 sets an attribute on a closure) and the class-attribute proxy
  (`src/smalltalk/Python/Object.gs:7389`, `docs/Rewrite_Dispatch_Model.md:1553-1555`)

**Ask.** (a) the distinct error number from §1.2; (b) widen the count field — a
>255-attribute object is ordinary Python (a large enum, a generated constants
class, a module namespace); (c) accept dynamic instVars on `ExecBlock` and
`Behavior`, which would delete both workaround subsystems.

### 2.2 LargeInteger ceiling, ~130,144 bits ≈ 39,000 digits — Structural

* Constant and message — `VM: src/gcierr.ht:2100-2101` (`RT_ERR_LARGE_INT_OVERFLOW 2503`, *"an Integer would exceed 130144 bits"*)
* Raised from 15 sites — `VM: src/lrgint.c:456`, `:474`, `:518`, `:528`, `:550`, `:600`, `:645`, `:1061`, `:1862`, `:2075`, `:2965`, `:3602`, `:3745`, `:3903`, `:4250`
* It **is** trappable Smalltalk (mapped to `NumericError`) — the error-class map in `KERNEL: Filein1B/Upgrade1B.class.st` (2503 → `NumericError`). Contrast `RT_ERR_STACK_LIMIT_RED 2502` at `VM: src/gcierr.ht:2095`, explicitly *"Not Trappable"*
* Grail resignals it as catchable `OverflowError` — `src/smalltalk/Python/Int.gs:918-941`, `math.gs:405-427`
* Reached by real Python — `scripts/cpython_suite_skips.txt:255-269` (CPython genuinely builds a 123,456-digit fraction string); six skip sites in `src/python/stdlib/test/test_int.py:612`, `:621`, `:667`, `:673`, `:717`, `:904`

**Ask.** Raise or make the ceiling configurable; failing that, confirm 2503 is
trappable from all 15 raise sites, since Grail's guards depend on it. (The one
practically-blocking case also needs a Ryū-style digit generator on Grail's
side — that half is not a kernel ask.)

### 2.3 A surrogate-tolerant string mode — Medium

CPython strings hold unpaired surrogates; they are load-bearing for PEP 383
`surrogateescape`, which is how Python round-trips non-UTF-8 filenames, argv and
environ.

* Kernel rejection sites — `KERNEL: Filein1A/Character.extension.st >> codePoint:` (primitive 72); `Filein3B/Unicode7.extension.st >> at:put:` and siblings; `Filein3B/Unicode16.extension.st`; `Filein1A/String.extension.st`; `VM: src/icuprim.c:1870`, `:1915`
* ICU itself is willing — it maps surrogates to category `Cs` at `VM: src/icuprim.c:4186`
* Grail's workaround: a 630-line parallel string type — `src/smalltalk/Python/PyStrSurrogate.gs`
  (class comment at `:22-66` is the clearest statement of the problem), plus
  tokenizer promotion (`src/smalltalk/PythonAst/PythonTokenizer.gs:718-748`) and
  WTF-8 encode/decode (`src/smalltalk/Python/Bytes.gs:1437`, `:1471`, `:1681-1685`)
* Deliberately partial: no slicing (`PyStrSurrogate.gs:429`), no `__format__`
  with a spec (`:384`), DNU raises rather than forwards (`:298`, `:312`)
* Residual deviation: `chr(0xD800)` raises `ValueError` — `src/smalltalk/Python/builtins.gs:805-836`

**Ask.** Not relaxing `Character` — that breaks CharacterCollection invariants
and the UTF-8 encoders. A **raw-code-unit / WTF-8 string variant** admitting
0..0x10FFFF unrestricted, strict UTF-8 encode by default. That matches CPython's
PEP 393 storage and would delete `PyStrSurrogate` entirely.

### 2.4 Symbol economics — Small (a question, not a demand)

* Kernel facts — the `KERNEL: Filein4Rowan/Symbol.class.st` class comment: max 1024
  characters, case-sensitive, canonical in `AllSymbols` (a
  `CanonicalStringDictionary` in the DataCurator security policy), *"not
  recommended … for names that should remain private"*
* Grail keys every Python attribute by Symbol — `docs/LEGB.md:62`, `:71`, `:81`;
  `src/smalltalk/PythonAst/ClassDefAst.gs:1665`, `:2190`

Every distinct attribute name Grail ever sees becomes a permanent, universally
visible `AllSymbols` entry. **Question:** what is the practical growth budget for
a long-running workload that generates names dynamically, and is a
non-canonical or collectable key form for `dynamicInstVarAt:` feasible?

The 1024-character cap has never been hit and is not an ask. The empty-Symbol
refusal is Grail work — route `''` into the spill dictionary that already
handles non-string namespace keys (`tests/python/namespace_non_string_keys.py:17-27`).

---

## 3. Unicode and string primitives

GemStone already links and dlopens ICU, and the one exposed property is already
paying off: `Character>>unicodeCategory` backs Grail's `repr()`/`isprintable()`
(`src/smalltalk/Python/str.gs:1805-1819`). Each item below is a thin wrapper over
a function already in the linked library.

The existing bridge is `Character>>_unicodeStatus: opcode` → `VM: src/icuprim.c:4216-4290`,
a switch with opcodes 1–30 used and **31+ free**.

### 3.1 Normalization — Small

* **Nothing in the image exposes a normalizer.** The only `normalize` in
  `VM: src/icuprim.c:3851` is `UCOL_NORMALIZATION_MODE`, a collator on/off
  attribute (`:4021`, `:4073`). No `unorm2_*` anywhere in the tree.
* Grail's `unicodedata.normalize` therefore **returns its input unchanged** —
  `src/python/stdlib/unicodedata.py:15-20`. Silently wrong, with no Smalltalk-side
  approximation available.

**Ask.** `CharacterCollection>>normalize:` taking `#NFC #NFD #NFKC #NFKD`, via
`unorm2_getNFCInstance` / `unorm2_normalize`. Unblocks `unicodedata.normalize`,
`werkzeug.secure_filename`, IDNA, and path comparison.

### 3.2 Character names — Small

* No `u_charName` / `u_charFromName` binding exists
* Grail maintains **two hand-curated tables that must be kept in sync by hand** —
  `src/smalltalk/PythonAst/PythonTokenizer.gs:92-98` (for `\N{...}`; unknown name
  raises `SyntaxError` at `:930-932`) and `src/python/stdlib/unicodedata.py`

**Ask.** `Character>>unicodeName` and `Character class>>fromUnicodeName:`.

### 3.3 Case folding and the remaining UCD properties — Small

* **`u_strFoldCase` is already compiled in** at `VM: src/icuprim.c:4606` with no
  Smalltalk selector reaching it — the cheapest win in this document
* Per-character folding exists as opcode 22 → `KERNEL: Filein1A/Character.extension.st >> asFoldcase`
* Grail's `str.casefold` is just `asLowercase` — `src/smalltalk/Python/str.gs:862-864`
  — wrong for ß, ﬁ, dotted-I
* Case conversion is **simple, per-character** only (`u_toupper`/`u_tolower`/`u_totitle`
  at `VM: src/icuprim.c:4129`, `:4140`, `:4151`), so `'ß'.upper() == 'SS'` cannot hold
* Grail generates its own case tables to cover the gap — `scripts/generate_grail_case_tables.py`
  (see the `cased_extra` computation at `:32-36`)
* Missing with no binding at all: `u_getCombiningClass`, `u_charDirection`,
  `UCHAR_EAST_ASIAN_WIDTH`, decomposition, `uidna_*`

**Ask.** Expose `CharacterCollection>>asFoldcase` over the existing primitive;
add combining class, bidi category and East-Asian width as new opcodes in the
existing switch; full (not simple) case mappings.

### 3.4 Substring search: right algorithm, existing primitive — Medium

The kernel's search primitive is a **first-character-anchored naive scan**,
Θ(n·m) worst case. The entire algorithm is `VM: src/strprim_smallFind.hc` —
no skip table, no `memchr` for the anchor scan.

* Call chain — `KERNEL: Filein1A/CharacterCollection.extension.st >> indexOfSubCollection:startingAt:`
  → `>> findString:startingAt:` → `>> _findString:startingAt:ignoreCase:` →
  `KERNEL: Filein1A/String.extension.st` / `Filein1A/MultiByteString.extension.st` /
  `Filein3B/Unicode16.extension.st` → `VM: src/strprim.c:3262-3340` (`StrPrimFindString30`), dispatching through a
  **9-entry width-pair function table** at `VM: src/strprim.c:481-493`
* **`ByteArray` has no substring-search primitive at all** — only single-byte
  `indexOf:` (`KERNEL: Filein2A/ByteArray.extension.st >> indexOf:`),
  so `bytes.find` falls back to an *interpreted* loop
  (`KERNEL: Filein1A/SequenceableCollection.extension.st >> indexOfSubCollection:startingAt:ifAbsent:`;
  Grail's own at `src/smalltalk/Python/Bytearray.gs:774-790`)
* Cost: six skipped tests, *"a 2.5M-char haystack hangs the session (minutes)"* —
  `scripts/cpython_suite_skips.txt:115-124`

**Ask.** Swap the inner loop behind the existing width-dispatch table for a
Bloom/Horspool skip loop — CPython's `fastsearch.h` is ~200 permissively
licensed lines, parameterized the same way. Add a `ByteArray` substring
primitive reaching the same code. No API change, and every existing
`indexOfSubCollection:` caller in the base image gets faster.

---

## 4. Filesystem and child processes

`docs/Grail_CPython_Scope.md` writes off "OS — process control, syscalls, real
filesystem" as 57 out-of-scope modules. That bucket is largely re-scopeable:
what is missing is a short list of additive user actions, each sitting beside
existing kernel code. The definitive inventory of what exists is the user-action
install table at `VM: src/gsfile.c:3916-3985`.

Grail can reach libc through `CCallout` for any of these — and already does for
the CPython shim. The argument for the base image rather than a per-site
callout: the `onClient:` split `GsFile` already implements, the
`NoGsFileOnServer` privilege model, errno translation, and the `IO` finalization
registry.

| Ask | Size | Today | Kernel evidence |
| --- | --- | --- | --- |
| `symlink:to:` / `readlink:` | Small | Grail shells out to `ln -s` / `readlink` through `System performOnServer:` with hand-rolled quote escaping, detecting errors by re-statting — `src/smalltalk/Python/os.gs:1212-1326` (`___shellQuote___:`, `___runShell___:`, `symlink:_:`, `readlink:`) | No `GsfSymlink`/`GsfReadlink` in `VM: src/gsfile.c:3922-3982`; `isSymbolicLink:onClient:` already exists in `KERNEL: Filein1A/GsFile.extension.st` |
| `GsfTruncate` | Small | `truncate()` refuses — `src/smalltalk/Python/io_module.gs:1223` | No truncate user action; ~15 lines of C beside the existing `GsfSync` (`KERNEL: Filein1A/GsFile.extension.st >> sync`) |
| `O_EXCL` mode + permission argument on open | Small | `open(...,'x')` is emulated stat-then-open, a TOCTOU race — `src/smalltalk/Python/io_module.gs:936-939` | `validModes` is exactly `{r,w,a,r+,w+,a+,rb,wb,ab,r+b,w+b,a+b}` — `VM: src/gsfile.c:1991-1993`. No `O_EXCL`, `O_NONBLOCK`, `O_CLOEXEC`, no mode argument |
| Nanosecond `GsFileStat` fields | Small | `st_*_ns` fabricated as seconds × 10⁹ — `src/smalltalk/Python/PyStatResult.gs:83-85` | C stores whole seconds only — `VM: src/gsfile.c:4143-4162`; the `KERNEL: Filein4Rowan/GsFileStat.class.st` class comment |
| `GsfChmod` / `GsfChown` / `GsfUtime` / `GsfAccess` | Small | absent from `os.gs`; `shutil.copymode`/`copystat` are no-ops — `src/python/stdlib/shutil.py:34-53` | None in `VM: src/gsfile.c:3922-3982` |
| `System>>gemEnvironment` (environment block) | Small | Enumeration impossible; see §8 for the bug this masked | `gemEnvironmentVariable:` reads one NAMED variable — `KERNEL: Filein1A/System.extension.st`. No `environ`/`getenviron` anywhere |
| `GsHostProcess`: `env:`, `cwd:`, PATH search, `kill: signal` | Small | Grail now uses `GsHostProcess` (#577) and works around each of these: PATH is searched in Smalltalk, `cwd=`/`env=` are re-expressed as a `/bin/sh -c` prefix, and `kill()` shells out to `kill(1)` because `killChild` is SIGTERM-only.  Each workaround is a cost the ask removes | `fork:args:` takes argv only, documents *"Lookup in the PATH environment variable is not performed"*; only SIGTERM via `killChild` — `KERNEL: Filein2A/GsHostProcess.class.st >> fork:args:`, `>> childStatus`, `>> killChild:`, `>> forkAndDetach` |
| Raw-fd surface + `GsFile class>>fromFileDescriptor:` | Medium | No `os.open/read/write/lseek/dup2/pipe`; integer fd to `open()` raises — `src/smalltalk/Python/io_module.gs:902` | `_fstat:isLstat:` already accepts a bare fd (`KERNEL: Filein1A/GsFile.extension.st`) and `GsSocket class>>fromFileHandle:` exists (`KERNEL: Filein2A/GsSocket.extension.st`), but `GsFile` has no counterpart |
| Narrow signals: SIGINT → catchable exception, SIGCHLD notification, `kill(pid, sig)` | Medium | `signal.py` is constants-only; nothing can ever deliver — `src/python/stdlib/signal.py:1-6`, `:49`, `:57` | GemStone's `sendSignal:` family is inter-**session** notification, not POSIX signals — `KERNEL: Filein1A/System.extension.st >> sendSignal:to:withMessage:` and siblings |
| Streaming `opendir`/`readdir` | Small | `os.scandir` is eager, so no `ResourceWarning` — `src/smalltalk/Python/os.gs:119-127` | Directory read is all-or-nothing — `KERNEL: Filein1A/GsFile.extension.st >> _contentsOfServerDirectory:expandPath:utf8Results:` |

---

## 5. Sockets and TLS

Plain sockets are in better shape than Grail's own docs assume — see §8. The
genuine kernel gaps are multiplexing, the OpenSSL surface `GsSecureSocket` does
not expose, and two primitives that exist in the VM with no public class.

### 5.1 N-way readiness wait — Small *(mostly closed — see below)*

The per-socket event registry already exists:

* `KERNEL: Filein1A/ProcessorScheduler.extension.st >> whenReadable:signal:`,
  `>> whenWritable:signal:`, `>> cancelWhenReadable:signal:`. The doc notes the
  notified object may be a `Semaphore`, `SharedQueue` or `GsProcess`
* `SharedQueue>>_reapSignal:` records **which** socket fired —
  `KERNEL: Filein3B/SharedQueue.class.st >> _reapSignal:`; `Semaphore>>waitForMilliseconds:`
  gives the timeout — `KERNEL: Filein3B/Semaphore.extension.st`

**Grail now uses it** — `PySocket>>___select___` in
`src/smalltalk/Python/socket_module.gs` registers every socket against one
`Semaphore` and waits on it, replacing the 50 ms polling loop and the
writers-always-ready answer that `select.py` used to give. So a real
`select()` turned out to be Grail work, not an ask. What remains kernel-side
is smaller than this section first claimed:

**Ask (a) — a convenience, no longer a blocker.** A first-class
`waitForReadReady:writeReady:timeoutMs:` over socket arrays, so every
application does not re-implement the arm / wait / cancel dance. Two hazards
in that dance are easy to get wrong and a kernel-supplied wait would spare the
next caller both: the registry signals on a **transition**, so a socket that
becomes ready between the readiness test and the arming never fires (arm
first, then test again, then sleep); and an event that never fired stays
**armed**, so every registration must be cancelled afterwards or it later
signals a semaphore nobody is waiting on.

**Ask (b), a defect — still real, but Grail no longer trips it.**
`whenReadable:signal:` goes straight to `GsSocket>>_whenReadableNotify:`
(`KERNEL: Filein2A/GsSocket.extension.st`) and **ignores the TLS receive
buffer** that `GsSecureSocket>>readWillNotBlock` consults via `_peek`
(`KERNEL: Filein3B/GsSecureSocket.class.st >> readWillNotBlock`, `>> _peek`).
A loop that arms an event and then sleeps can therefore stall on a TLS socket
with decrypted plaintext already buffered: the bytes are past the descriptor,
so nothing further arrives to fire the event.

Grail avoids it by never trusting the event alone. `___select___` tests
readiness with `readWillNotBlock` — which *does* consult `_peek` — both before
arming and again after arming, and only then sleeps. The second test was added
for a different reason (the registry signals on a *transition*, so a socket
that became ready between the first test and the arming would never fire), but
it closes this hole too: any plaintext already buffered when `select()` is
called is seen by one of the two tests, and data arriving later moves the
descriptor and fires the event normally.

So the ask is now about the registry being **safe to use directly**, not about
unblocking Grail. Anyone who registers a `GsSecureSocket` with
`whenReadable:signal:` and waits — the obvious reading of the API — gets a
stall that the same code over a plain `GsSocket` would not produce. This gap
was found by reading the kernel source rather than by being bitten, and
Grail's cover for it is incidental: the re-test exists for the transition
hazard above and closes this one as a side effect, which is a thin thing to
rely on. Having `_whenReadableNotify:` consult `_peek` for a secure socket —
or documenting that it deliberately does not, so callers know to re-test —
would remove the trap.

(For scale of how quietly TLS problems fail here: a *different* bug on this
path, Grail handing the registry an `ssl.SSLSocket` wrapper instead of the
socket underneath, surfaced only as the client seeing a connection reset, with
no error on the server side at all.)

### 5.2 Expose the AF_UNIX and socketpair primitives — Small

The primitives are **in the VM already**, with no kernel class calling them:

* `_twoArgPrim:` opcodes 13 (`UNIXServer>>bind:`), 16 (`connect:`), 21
  (`_getsockaddrUnix:`), 22 (`_unpackSockAddrUnix:`) — documented at
  the opcode table in `KERNEL: Filein2A/GsSocket.extension.st` (opcodes 13/16)
* `_zeroArgPrim:` opcodes 27/28 (UNIX stream/dgram create), **29 `SocketPair
  UNIX Stream`**, 30/31 (AF_UNIX address) — same table, opcodes 27–31
* `grep UNIXServer` finds only the comment — the class does not exist in the image
* Verified absent as a class: `find image/rowan/src -name 'UNIXServer*'` returns
  nothing, so the opcodes above have no caller in the image

**Ask.** Public `AF_UNIX` stream/datagram support and `socket.socketpair()`.
Enables Unix-socket Postgres/Redis clients and the asyncio self-pipe idiom.

### 5.3 TLS surface for the modern Python stack — Medium

`GsSecureSocket` already covers SNI, TLS min/max version, mTLS, cipher lists,
hostname-check flags, and peer-cert subject/issuer/SAN/validity (§8). Missing,
in priority order:

| Gap | Evidence |
| --- | --- |
| **ALPN** | Zero hits for `alpn`/`next protocol` in the entire kernel dump. Blocks HTTP/2, gRPC, and CPython's `set_alpn_protocols` |
| **Per-connection trust config + `cadata`** | CA setup is class-side/session-global — `KERNEL: Filein3B/GsSecureSocket.class.st >> useCACertificateFileForClients:` and siblings; two `SSLContext`s in one gem clobber each other, as Grail notes at `src/smalltalk/Python/socket_module.gs:481-487`. CA sources are file/hash-dir paths only, so `cadata` raises `NotImplementedError` — `src/python/stdlib/ssl.py:178` |
| **Certificate introspection parity** | `GsX509Certificate` exposes subject/issuer/SAN/validity only (`KERNEL: Filein3B/GsX509Certificate.class.st >> subjectName`, `>> issuerName`, `>> subjectAlternateNames`); no DER export, serial, version, or extensions. This is the gap that forced Grail to shim `requests` rather than vendor it — *"real requests drags in urllib3, whose ssl introspection exceeds what GsSecureSocket exposes"* (`docs/Support_Twilio.md:53-54`) |
| **In-memory BIO** | TLS is bound to a live fd; no BIO pair. Blocks asyncio `sslproto`, `loop.start_tls`, and `ssl.SSLObject` |
| **Session resumption** | No `SSL_SESSION` selector; `ssl.SSLSession` and `session_reused` unimplementable |
| **Verify / servername callbacks** | Verification is fixed-policy (enable/disable + option symbols); no `SSL_CTX_set_verify` callback, no `set_servername_callback` |
| **`SSL_CTX_set_options`, `get_ciphers()`, keylog** | Grail's `OP_*` and `VERIFY_*` flags are all `= 0` — `src/python/stdlib/ssl.py:33-43` |

### 5.4 Socket odds and ends — Small

Generic `(level, optname)` get/setsockopt pass-through — the current `option:`
takes a fixed name-string whitelist (`KERNEL: Filein2A/GsSocket.extension.st >> option:` / `>> option:put:`) that cannot express `IPV6_V6ONLY`, `TCP_KEEPIDLE`, `SO_BINDTODEVICE`.
Also `MSG_PEEK` recv (no public peek exists), and event registration for
non-socket fds.

---

## 6. Persistent weak references — Structural

Ephemerons gave Grail a CPython-compatible `weakref` for the life of a session.
**Weakness cannot cross a commit**, and since Grail's purpose is adding
persistence to Python, that is a product-level gap rather than a conformance one.

* A plain ephemeron in a committed graph is refused — `TransactionError` 2407,
  *"attempt to commit an ephemeron"* — `docs/Weakref.md:48-52`
* So Grail hides the ephemeron behind a `dbTransient` wrapper, and a committed
  `WeakReference` **reads back dead** — the contract table at `docs/Weakref.md:92-105`,
  cross-session regression at `tests/scripts/runEphemeronCommitTest.gs`
* That matched CPython's "weakrefs do not survive pickle" contract
  (`docs/Weakref.md:74-80`) — correct for suite conformance, wrong for a
  persistent object store
* The same wall hits `threading.Lock` in a deployed graph — `docs/Persistent_Modules_and_Classes.md:713-718`

Today every persistent cache faces a leak-or-forget dilemma: hold strongly and
pin referents in the repository forever, or hold weakly and lose the cache at
commit.

**Ask (a), the cheaper tier.** A weak slot or weak collection the **repository**
GC honors: commit-legal, not traced by MFC/epoch GC, reading nil once the
referent is reclaimed, **with no callback required**. Grail's weak dictionaries
already prune lazily on access (`src/python/stdlib/weakref.py`), so this alone
makes a persistent `WeakValueDictionary` sound.

**Ask (b), the fuller tier.** Persistent ephemerons — fired by repository GC,
with `mourn` queued durably and drained by the next logged-in session or a
maintenance gem. This is what would carry `weakref.finalize` across sessions,
and it is where the hard design question lives (which session runs finalization
when nobody is logged in?), which is why (a) is worth having on its own.

The OOP-as-integer scheme Grail evaluated and rejected is not a substitute: OOPs
are recycled, and the ABA hazard is worse across a repository's lifetime than a
session's — comparison table at `docs/Weakref.md:132-145`.

---

## 7. What we are not asking for

Named explicitly so the list above keeps its credibility.

| Not asking | Why |
| --- | --- |
| Reference-counting GC / deterministic `__del__` | Whole measurable cost is ~15 refcount-timing skips that PyPy also takes — `scripts/cpython_suite_skips.txt:33-38`, `:95-101`, `:158-163` |
| Real OS threads / free-threading | Cooperative GsProcess green threads are the model; the atomicity tests are CPython-build-specific — `scripts/cpython_suite_skips.txt:39-42`, `:125-130` |
| In-gem `os.fork()` / `execv()` / multiprocessing | A gem cannot fork and remain a gem. Child processes are covered by `GsHostProcess` instead (§8) |
| `mmap` / buffer protocol in the VM | Sequencing is wrong: Grail must first build a real `memoryview` with export counting — its own listed gap (`docs/Stdlib_Gaps.md`, "Remaining gaps" item 6; tripwire `BytearrayTestCase>>testMemoryviewIsIdentityStub`) |
| `poll`/`epoll`/`kqueue` wrappers | Emulate over the N-way wait (§5.1) |
| `sys.settrace`-grade per-send hooks | Debugger/profiler modules already out of scope — `docs/Grail_CPython_Scope.md:532`, `:573`, `:592-593` |
| Float formatting primitives | GemStone's `asString` is already shortest-round-trip (`KERNEL: Filein1C/Float.extension.st >> asString`, primitive 131); every gap found was Grail-side and is fixed |
| `identityHash` / `id()` changes | Adequate, and its recycling semantics match CPython's own contract. One **question** worth confirming: is `objIdOfObj` guaranteed stable across commit/abort/session restart for a persistent object? Grail's `id()` and its method-OOP-keyed traceback caches depend on "yes" |

---

## 8. Already in the kernel — Grail work, not asks

These surveys falsified assumptions written into Grail's own source and docs.
Recorded here so they are never asked for by mistake, and so the stale claims
get retracted.

**Corrections landed.** With the PR accompanying this document: `os.environ`,
`time.monotonic`/`perf_counter`/`process_time`, `os.cpu_count`, `FileIO.fileno`
and `isatty`. Since, as their own PRs: **`subprocess`** over `GsHostProcess`
(#577) and **`select`/`selectors`** over the scheduler's readiness events
(#579) — the two largest items this section identified. Both rows below are
updated accordingly; what is left in this table is still-unclaimed ground.

Line references in the "stale claim" column below are as of **39be4117**, the commit
before those fixes — the quoted code is gone from the working tree, which is the
point. Read them with `git show 39be4117:<path>`.

| Capability | Kernel provides | Grail's stale claim |
| --- | --- | --- |
| **Child processes** | `GsHostProcess` — `fork:args:` (primitive 956) with argv, separate stdin/stdout/stderr pipes as non-blocking `GsSocket`s, `processId`, `childStatus` (waitpid, primitive 957) with decoded exit/signal status, `killChild:` with timeout, `forkAndDetach`, `stdinPath:`/`stdoutPath:`/`stderrPath:`, `redirectStderrToStdout` — `KERNEL: Filein2A/GsHostProcess.class.st >> fork:args:`, `>> childStatus`, `>> killChild:`, `>> forkAndDetach` | *"subprocess is not supported in Grail (no child processes)"* — `src/python/stdlib/subprocess.py:1-8`, `:47-62`; *"no fork/exec model inside a gem worth exposing yet"* — `docs/Stdlib_Gaps.md`. There were **zero references to `GsHostProcess` in the tree**. **Fixed (#577)**: `subprocess` is real, both claims retracted. The wrapper adds PATH lookup, `cwd=`/`env=` and space-bearing paths, none of which `fork:` offers |
| **Shell exit status** | `System class>>_performOnServer:withShell:` (primitive 347) answers `{rawStatus. WEXITSTATUS. stdout. stderr. errno}` — `KERNEL: Filein1A/System.extension.st >> _performOnServer:withShell:` | *"performOnServer: does not report an exit status, so nothing here can branch on one"* — `src/smalltalk/Python/os.gs:1240`. The public wrapper (`:8384`) discards four of the five elements |
| **Monotonic + CPU clocks** | `System timeNs` (CLOCK_MONOTONIC ns, *"not correlated in any way with the time of day"*) — `KERNEL: Filein1A/System.extension.st >> timeNs`; `readClockNano` (process CPU ns); `_timeGmtMicroSeconds`; `_hostTimes` — same file | `time.monotonic` was literally `^ self time`, i.e. the wall clock. **Fixed** |
| **Host CPU count** | `System hostCpuCount` — `KERNEL: Filein1A/System.extension.st` | *"GemStone has no portable host-CPU primitive exposed to gems"*, returning a hardcoded 4 — measured 18 on this machine. **Fixed** |
| **File descriptors, fsync, isatty, locking** | `IO>>fileDescriptor` — `KERNEL: Filein1C/IO.extension.st`, populated by `GsFile>>_open:mode:onClient:`; `GsFile>>sync` (fflush + fsync); `isTerminal`; complete `fcntl(F_SETLK)` byte-range locking via `_acquireLockKind:atOffset:forBytes:waitTime:` — all `KERNEL: Filein1A/GsFile.extension.st` and the `GsfLock`/`GsfUnlock`/`GsfLockQuery` user actions at the `GsfLock`/`GsfUnlock`/`GsfLockQuery` entries in `VM: src/gsfile.c` | *"fileno() is not supported in Grail"* — `src/smalltalk/Python/io_module.gs:1266`. **Fixed.** Locking remains entirely unused — a genuine opportunity |
| **UDP, IPv6, options, timeouts, half-close** | `newUdp`/`newUdpIpv6`, `sendUdp:flags:toHost:port:`, `recvfrom:`, `bindTo:toAddress:`, `option:put:` (REUSEADDR, NODELAY, KEEPALIVE, RCVBUF/SNDBUF, LINGER), `connectTo:on:timeoutMs:`, `acceptTimeoutMs:`, `read:into:startingAt:maxWait:`, `shutdownReading`/`shutdownWriting`, `getHostAddressesByName:` — all `KERNEL: Filein2A/GsSocket.extension.st` | Socket ctor ignores family/type so `SOCK_DGRAM` silently returns TCP (`src/smalltalk/Python/socket_module.gs:840-871`); `has_ipv6 = False` (`:829`); `setsockopt` no-op (`:298`); `settimeout` stored and never applied (`:307`); `shutdown(how)` ignores `how` (`:288`); `bind` discards the host (`:162`) |
| **Multi-socket readiness** | `whenReadable:signal:` / `whenWritable:signal:` → Semaphore/SharedQueue — `KERNEL: Filein1A/ProcessorScheduler.extension.st`; `writeWillNotBlock[Within:]` — `KERNEL: Filein2A/GsSocket.extension.st` | *"Grail has no `select(2)` binding"* — `docs/Support_Flask.md:818-826`. True at the syscall level, but the event registry above is a workable substitute and was unused. **Fixed (#579)**: `select` is an N-way wait on it. Two hazards worth knowing before using the registry — it signals on a *transition*, so arm before the final readiness test or lose the wakeup; and it ignores the TLS receive buffer (§5.1b) |
| **TLS features Grail stubs** | `setServerNameIndication:`, `tlsMinVersion:`/`tlsMaxVersion:`, `setCipherListFromString:`, `useClientCertificateFile:withPrivateKeyFile:privateKeyPassphrase:`, `setCertificateVerificationOptions:`, `setExpectedHost:`, `peerCertificate` — all `KERNEL: Filein3B/GsSecureSocket.class.st` | `ssl.py`: `set_ciphers` is `pass` (`:204`), `getpeercert()` returns None (`:348`), no min/max version, mTLS declared out of scope (`:13-18`) |
| **Misc** | `serverRealPath:` / `_directoryPrim: 3`; umask via `_directoryPrim: 5`; `contentsAndTypesOfDirectory:onClient:` (type-cached scandir) — `KERNEL: Filein1A/GsFile.extension.st`; `gemEnvironmentVariable:put:` documents nil = clearenv — `KERNEL: Filein1A/System.extension.st` | `os.path.realpath` aliases `abspath` (`src/smalltalk/Python/os_path.gs:150`); `DirEntry` re-stats per question; `unsetenv` wraps nil in a fallback it does not need (`src/smalltalk/Python/os.gs:1379-1388`) |

**Second retraction.** `docs/Grail_CPython_Scope.md:855` lists lone-surrogate
literals as blocking `test_str` and `test_userstring`. That is stale: it predates
`PyStrSurrogate` and the `surrogateescape` work. The residual blocker set is
narrower (`chr(0xD800)`, slicing, formatting) and is what §2.3 removes.

---

<sub>Compiled 2026-08-18 from the CPython 3.14 scoreboard, `scripts/cpython_suite_skips.txt`,
Grail's design docs, and source surveys of the Grail tree, the GemStone 4.0
kernel image Smalltalk, and the GemStone C VM source. Verdicts are
recommendations for review, not a commitment.</sub>
