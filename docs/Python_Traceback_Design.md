# Python tracebacks & PEP 657 locations — design & plan

Status: Phases 1, 2a, 2b, 3a, 3b, 3c **merged**; 3d (`finally`-during-propagation)
**done** (see §5); multi-frame deep frames deferred. Author-driven from the
`test.test_dictcomps` / `test.test_setcomps` `test_exception_locations`
conformance gap (2026-07-31, gs40 / GemStone 4.0).

## 1. What this unblocks

`test.test_dictcomps` and `test.test_setcomps` are each ERROR on a **single**
remaining test, `test_exception_locations`. Both do:

```python
exc = func()                                    # func catches an exc from a comprehension
f = traceback.extract_tb(exc.__traceback__)[0]  # first (outermost) frame
co = func.__code__
self.assertEqual(f.lineno,     co.co_firstlineno + 2)
self.assertEqual(f.end_lineno, co.co_firstlineno + 2)
self.assertEqual(f.line[f.colno - 16 : f.end_colno - 16], "BrokenIter(init_raises=True)")
```

Today `traceback.extract_tb` is a stub returning `[]`, so `[0]` raises
`IndexError`. Greening this needs the whole Python exception-location stack that
Grail has never had:

1. real `func.__code__` with `co_firstlineno` (there is **no code object** today —
   `func.__code__` raises `AttributeError`; `types.CodeType` is an empty stub);
2. a real `exc.__traceback__` object (today the attribute read returns a stray
   `BoundMethod` — see §3);
3. `traceback.extract_tb` walking that object into `FrameSummary`s;
4. **PEP 657** fine-grained column offsets: `colno`/`end_colno` must bracket the
   *iterable expression* `BrokenIter(...)` of the comprehension's first `for`
   clause — not the whole comprehension, not just the line.

This is broadly valuable beyond these two tests: real tracebacks make
`sys.exc_info()`, `traceback.format_exc()`, and any library that inspects
`e.__traceback__` behave correctly (today they silently degrade).

## 2. Exact requirement decoded

The three sub-cases (`init_raises` / `next_raises` / `iter_raises`) all put frame
`[0]` at the **same** spot: `func`'s frame, positioned at the comprehension's
iterable expression `BrokenIter(...=True)`.

- `init_raises`: `BrokenIter(init_raises=True)` raises in `__init__` while the
  argument is being *constructed* — in `func`'s frame directly.
- `iter_raises` / `next_raises`: the object constructs, then the comprehension
  calls `__iter__` / `__next__`. PEP 709 inlines the comprehension into `func`'s
  frame, and PEP 657 reports the *iterable expression* as the location.

So `[0]` = `func` at the iterable expression in every case; deeper frames
(`__init__`, `__iter__`, `__next__`) are **not** asserted. `f.line` is the
CPython-stripped source line (`linecache.getline(...).strip()`), and
`colno`/`end_colno` are absolute 0-based columns in the *original* line — the
test subtracts the 16-space indent to index the stripped line.

## 3. Current architecture (measured)

All references verified 2026-07-31 on `main`.

### Exceptions
- `BaseException` (`src/smalltalk/Python/BaseException.gs:22-31`) subclasses the
  kernel `Exception` and has **one** Python instVar: `args`. ~150 leaf exception
  classes are empty-instVar subclasses, so a slot added to `BaseException` is
  inherited by all.
- `exc.__traceback__` returns a `BoundMethod` because (a) `BaseException>>__traceback__`
  is a real method returning `nil` (a TODO, `BaseException.gs:348-354`) and
  (b) `object>>___pyAttrLoad___:` (`Object.gs:1238`) doesn't find `__traceback__`
  in the `___pythonValueAttrs___` whitelist (`BaseException.gs:402-411` lists only
  `args`, `__notes__`), so it falls to the generic BoundMethod-wrap
  (`Object.gs:1716-1724`) — wrapping the *selector*, never calling it.
- `exc.__traceback__ = tb` **already works** via the dynamic-instVar store
  fallback (`Object.gs:2935-2936`), and the read probe (`Object.gs:1271-1272`)
  sits before the method check — so a stored value shadows the dead method.
- **Raise choke point**: `object>>___signal___:` (`Object.gs:1803-1806`) funnels
  the `___signal___`/`___signalNew___` paths; `raise expr @env0:signal`
  (`RaiseAst.gs:101-103`) bypasses it.
- **`try/except ... as e`** binds `e := ___ex` at `TryAst.gs:128-134` — exactly
  where CPython does `e.__traceback__ = tb`. Grail attaches nothing today.
- `sys.exc_info()` is a hardcoded `(None, None, None)` (`sys.gs:746-750`); no
  active-exception state is tracked anywhere.

### Code objects / functions
- **No code-object class exists** (`inspect.py:40` "Grail has no code objects";
  `types.CodeType` at `types.py:76` is `class CodeType: pass`). `func.__code__`
  raises `AttributeError`.
- Top-level / class `def` → a real `CompiledMethod`, handed back as a
  `BoundMethod` (minted per attribute read; metadata derived, not stored).
- Nested `def` (the shape used by this test's `init_raises` etc.) → a GemStone
  `ExecBlock`; metadata lives in the `ExecBlockAttrs` side table (six dunder
  slots: `__name__ __qualname__ __module__ __doc__ __annotations__
  __type_params__`), stamped at def-time by `FunctionDefAst>>printSmalltalkOn:`
  chaining `@env0:___pyNamed___:` variants (`FunctionDefAst.gs:554-560`,
  `ExecBlock.gs:373-433`). No line/AST back-reference is stored.
- `FunctionDefAst.beginLine` points at the `def` keyword (== `co_firstlineno`
  semantics, `PythonParser.gs:144` from the `def` start token) but is **not**
  retained on the runtime function.

### Codegen (double-dispatch `printSmalltalkOn:`)
- Every function body is **already** wrapped in
  `[...] @env0:on: PythonReturn do: [:___ex___ | ___ex___ returnValue]`
  (real methods: `FunctionDefAst>>printBodyOn:` at `FunctionDefAst.gs:2091-2112`;
  nested defs: `FunctionDefAst.gs:481-525`). **This existing wrapper is the
  frame-capture seam** — no new structural block needed.
- Three statement-list walk loops (the setPos injection points):
  `FunctionDefAst.gs:2101-2103`, `FunctionDefAst.gs:509-511`,
  `BlockAst>>printSmalltalkOn:useTemps:` (`BlockAst.gs:100-107`).
- The comprehension **iterable** is emitted at `ComprehensionAst.gs:176`
  (`___iterN___ := (SOMEITER) __iter__.`); `gen iter` is the iterable AST node
  and carries its own `beginLine`/`beginColumn`/`endLine`/`endColumn`.
- `AbstractLocationNode` (`AbstractLocationNode.gs:9-11`) holds all four position
  instVars, populated by the parser. Accessors exist for `beginLine`/`column`;
  **`endLine`/`endColumn` need accessors added** (Phase 3).

## 4. Design

**Construction model = CPython's incremental unwind, not a snapshot.** As an
exception propagates up, each Python frame it *exits* prepends its own frame to
`exc.__traceback__`; the frame that *catches* it prepends itself at the
except-binding. Net order: head = shallowest (the catching frame), `tb_next`
chains toward the raise. `extract_tb(tb)[0]` is therefore the catching frame —
exactly what the test wants.

Grail already wraps every function body in `on: PythonReturn do:`; we extend that
handler to *also* catch escaping non-control-flow exceptions, prepend this
function's frame at its **current position**, and re-signal. "Current position"
is a per-function local (`___curPos___`) updated by a cheap `setPos` store before
each statement (line granularity) and before the comprehension iterable (PEP 657
column granularity). Happy-path cost is one store per statement; the frame
machinery only runs when an exception is actually propagating.

### Objects
- **`PyCode`** (new Smalltalk class in `Python`): `co_name`, `co_qualname`,
  `co_filename`, `co_firstlineno`. Returned by `func.__code__`.
- **`PyFrame`** (new): `f_code`, `f_lineno`, `f_back`, `f_globals`. Minimal.
- **`PyTraceback`** (new): `tb_frame`, `tb_lineno`, `tb_next` (CPython-visible),
  plus the PEP 657 quadruple + source line stored on the node
  (`___endLineno___`, `___colno___`, `___endColno___`, `___line___`) since Grail
  has no `co_positions(tb_lasti)` to derive them from. A single
  `___summaryFields___` method returns the tuple `extract_tb` needs, to minimise
  Smalltalk↔Python attribute round-trips.
- **`traceback.FrameSummary`** (Python, in `traceback.py`): `filename`, `lineno`,
  `end_lineno`, `colno`, `end_colno`, `name`, `line`; `extract_tb` builds one per
  `tb` node walking `tb_next`.
- **`BaseException`**: new `___traceback___` slot; `__traceback__` returns it;
  `#'__traceback__'` added to `___pythonValueAttrs___`; `with_traceback:` stores
  and returns self.

### Why not the alternatives (considered, rejected/deferred)
- *Persistent push/pop frame stack*: adds a push+pop per call on top of the
  existing return-wrapper. The incremental-unwind model reuses that wrapper and
  needs neither.
- *Live-stack walk at the handler via `GsProcess`* (zero happy-path cost): the
  handler does run with the signalling stack live (proven by
  `GrailTestResult>>safeStack`, `GrailTestResult.gs:155-166`), but mapping
  GemStone frames → Python `(line, col)` needs a per-method step-point→position
  table that is intricate and GemStone-version-sensitive (3.7 vs 4.0). Deferred
  as a possible future zero-overhead reimplementation behind the same object API.

## 5. Plan / phasing (each phase independently landable + gated)

**Phase 1 — data model + `traceback.py`, NO codegen (this PR).** Adds `PyCode`,
`PyFrame`, `PyTraceback`; the `BaseException` `___traceback___` slot + whitelist
+ real `__traceback__` / `with_traceback:`; and rewrites
`traceback.extract_tb`/`walk_tb`/`format_tb` + `FrameSummary`/`StackSummary` to
consume a real `tb` linked list. Tested with a **hand-built** traceback (SUnit +
a Python fixture that round-trips `with_traceback`). Touches none of the
parser/codegen/exception-raise hot files, so it cannot collide with the parallel
work flagged in [[project_scoreboard_small_modules_2026_07]]. Moves no scoreboard
row yet — it is the de-risked foundation.

**Phase 2 — populate tracebacks at runtime (DONE, as two sub-steps).**

*Phase 2a — code objects.* `func.__code__` def-time stamp from
`FunctionDefAst.beginLine`: the nested-def emit cascades `___pyCode___:` onto the
block, stamping a `PyCode` into the `ExecBlock` side-table; `ExecBlock>>__code__`
(env-1, value-attr whitelisted) reads it. So `func.__code__.co_firstlineno`
answers the `def` line. (Module/class-level defs → `BoundMethod` are a follow-up.)

*Phase 2b — comprehension iterator-protocol frames (+ PEP 657 columns).* Rather
than the fully general per-statement instrumentation first sketched here (a
`___curPos___` local + `setPos` in all three statement loops + body-wrapper and
except-binding frame prepends — a large, high-risk change to every function's
codegen), Phase 2 greens the target tests with a **targeted, low-risk** mechanism
that implements exactly the PEP 657 rule the tests exercise:

- `ComprehensionAst` wraps the **outermost** generator (`anIndex = 1`) in one
  `on: Exception do:` handler that prepends a single traceback frame — enclosing
  function's `PyCode` (`CallAst functionBeingCompiled`) at the **iterable
  expression's** position + source line — then re-raises. One handler per
  comprehension (no per-iteration cost).
- `BaseException>>___pushTracebackFrame___:…` builds the `PyFrame`/`PyTraceback`
  and prepends (incremental-unwind order); it **no-ops for StopIteration and the
  control-flow signals**, so normal loop termination and a pending
  return/break/continue are untouched.
- `AbstractLocationNode` gains `endLine`/`endColumn` accessors; its `sourceLine`
  is made robust to a `CharacterCollection` (already-decoded) module source.

Greens `test_dictcomps` and `test_setcomps` `test_exception_locations`
(ERROR→OK). Grail's `beginColumn`/`endColumn` are already 0-based / end-exclusive
(matching Python `col_offset`), so no column adjustment was needed.

**Phase 3a — `sys.exc_info()` backing (DONE).** The zero-happy-path-overhead
slice of the general-population phase. A session-local "currently-handled
exception" register (`BaseException class>>___currentException___` /
`___setCurrentException___:`, in `SessionTemps`) is set by `TryAst` codegen at
each except-handler entry (after the control-flow guard) and restored on exit via
`ensure:`, so nested handlers stack correctly. `sys.exc_info()` /
`sys.exception()` return it (were hardcoded `(None,None,None)` / `None`), which
also gives `traceback.format_exc()` a real exception to render. No per-statement
instrumentation, so no happy-path cost; the only added work is per except
handler. (`finally`-during-propagation isn't tracked yet — a minor gap.)

**Phase 3b — general caught-exception frames (DONE).** Every function now carries
a `___curPos___` temp (a 5-array `{line. col. endLine. endCol. sourceLine}`)
updated by a per-statement `setPos` (emitted by `AbstractNode>>___emitCurPosBefore:on:`
in all three statement loops — the two `FunctionDefAst` body loops and
`BlockAst`; declared in `paramNames` / `allLocals`). At an except handler, `TryAst`
prepends a frame for the CATCHING function at `___curPos___`
(`BaseException>>___pushCatchingFrame___:pos:`), but **only as a fallback** — it
no-ops if a traceback already exists (so a comprehension's exact-column frame, or
a future deeper frame, wins and there is no double-count). So `extract_tb` /
`sys.exc_info()[2]` / `format_exc` are now non-empty for **any** caught exception,
locating the catching function at statement granularity. `nil` position fields are
stored as the `None` singleton (a nil dynamic instVar reads back as *absent* →
`AttributeError`), and `StackSummary.format` no longer double-indents frame lines.

**Phase 3c — exact raise-line precision (DONE).** The Phase 3b catching frame
was located at the `try`-statement header, not the line inside the try body that
actually raised, because `SuiteAst>>printSmalltalkOn:` (every compound-statement
body — `try`/`except`/`else`/`finally` and `while`/`for`/`if`, all built by the
parser's `wrapSuite:`) iterated statements *without* the per-statement `setPos`
that `BlockAst` and the `FunctionDefAst` body loops emit. So `___curPos___` froze
at the enclosing compound-statement header and every nested block reported that
line. Fix: `SuiteAst` now emits `___emitCurPosBefore:` before each statement, so
`___curPos___` tracks into try/loop/if bodies and the catching frame points at
the raising line (verified for a raise several statements deep inside a `for` in a
`try`). To keep this affordable on hot loops — `setPos` now sits before *every*
statement, loop bodies included — `___curPos___` is a bare SmallInteger beginLine
at statement granularity (was a freshly-allocated 5-array), so the store costs no
allocation / GC; `___pushFrameFromPos___` reconstructs a line-only frame from the
integer (and still accepts the legacy 5-array defensively). Columns / source line
stay unknown for the general path (CPython reports them for the raising
instruction, which we don't track outside a comprehension).

**Deferred (future) — multi-frame deep frames.** Today a traceback carries the
*catching* frame (+ the exact-column comprehension frame where applicable), but
not a frame for each function the exception unwound *through* between the raise
and the catch. The natural seam — prepend a frame in each function's body wrapper
— was prototyped and backed out (broadening the `on: PythonReturn` catch re-raised
inside generators, "exception already signalled", and named `AbstractException`,
absent from the symbol list in some generated-code compile contexts). The deeper
obstacle, found since: **the body wrapper is not universal.** It is emitted only
for generators and return-blocking functions (`FunctionDefAst`'s `#exception`
return mode); simple functions use a direct `^`/`#directMethod` return with no
`on:do:` at all. So deep frames would need a *new* universal handler wrapping
every function body — adding an `on:do:` per call and knocking `#directMethod`
functions off their method-temp fast path — the large, high-risk change Phase 2b
deliberately avoided. It needs a generator-aware, `Exception`-based
(runtime-resolved, never named literally) two-handler body wrapper, gated behind
a codegen flag and measured. **And — see §8 — the vendored `test.test_traceback`
shows deep frames is *not* the next gap: code objects on class/module-level defs
come first.**

## 8. Gate: `test.test_traceback` vendored (2026-08-02)

To gate the remaining work with CPython's own suite rather than hand-written
fixtures, `test.test_traceback` (3.14.4, 4972 lines) is vendored under
`src/python/stdlib/test/` and added to `scripts/cpython_suite_manifest.txt` as a
tracked **baseline**. Getting it to load pulled in reusable stdlib support (all
additive, 0 regressions across the existing scoreboard):

- `linecache.py` (vendored verbatim) and a minimal `_colorize.py` stub (Grail
  renders tracebacks as plain text — `COLORIZE = False`, `can_colorize()` False);
- `test.support` fills: `Error`, `requires_subprocess`/`has_subprocess_support`,
  `requires_debug_ranges`/`has_no_debug_ranges`, and the colourization
  decorators `force_color`/`force_not_colorized`/`force_not_colorized_test_class`
  (plain-class CM + identity passthroughs, per the module's Grail constraints);
- `os_helper.temp_dir`, `import_helper.forget`.

**Current status: `IMPORTERROR`**, blocked at import on `__code__` of a
class/module-level def (a `BoundMethod`) — hit by a *class-body* line
`callable_line = get_exception.__code__.co_firstlineno + 2`. This is the Phase 2a
follow-up (only nested-def `ExecBlock`s carry `__code__` today; module/class-level
defs → `BoundMethod` were explicitly deferred). **So the gate's verdict: the next
traceback gap is `BoundMethod.__code__` (code objects on class/module-level defs),
a prerequisite that ranks ahead of multi-frame deep frames.** The scoreboard's
`detail` column tracks the live blocker; grow from there.

**Phase 3d — `finally`-during-propagation for `sys.exc_info()` (DONE).** Phase 3a
set the current-exception register only at except-handler entry, so a `finally`
that ran while an exception propagated saw `(None, None, None)`. Now `TryAst`
emits the finally through `BaseException class>>___ensureFinally___:finally:`
(in place of a bare `ensure:`): it runs the protected block under an
`on: BaseException do: [:ex | propExc := ex. ex pass]` catch, and its `ensure:`
installs `propExc` as the current exception for the duration of the finally
(save/restore), so `sys.exc_info()` / `sys.exception()` inside the finally report
the in-flight exception — for a bare `try/finally`, and for a `try/except/finally`
whose `except` doesn't match. Control-flow signals and `StopIteration` subclass
the kernel `Exception` directly (not `BaseException`), so a return/break/continue
/normal exit through the finally leaves `exc_info` untouched — no guard needed.
**Gated to non-generator scopes**: the `ex pass` re-raise is unsafe inside a
forked generator process, so a `try/finally` inside a generator keeps the plain
`ensure:` and this one `exc_info` gap (documented limitation).

Note found while testing (pre-existing, NOT changed here, out of scope): GemStone
runs an *outer* `except` handler body on the signal stack **before** an inner
`finally` (`ensure:`) unwinds — the reverse of CPython's finally-before-outer-
except ordering. It affects only code whose outer `except` body observes a
side effect the inner `finally` performs; `___ensureFinally___:finally:` is
ordering-neutral (same as the bare `ensure:` it replaces).

Still open: multi-frame deep frames (above), and the outer-except/inner-finally
ordering just noted.

## 6. Risks & non-goals

- **Overhead**: one `setPos` store per statement on the happy path. Cheap, but
  measure the suite timing in Phase 2; if material, gate `setPos` emission behind
  a codegen flag.
- **Raise-path completeness**: the `raise expr @env0:signal` form
  (`RaiseAst.gs:101-103`) bypasses `___signal___:`; frame capture rides the body
  wrapper (which sees every escape regardless of how it was signalled), so this
  gap does not affect traceback construction — but `sys.exc_info` backing in
  Phase 2 must hook a universal point (body wrapper / `on:do:` boundary), not
  just `___signal___:`.
- **Non-goals (for now)**: exact CPython `tb_lasti`/`co_positions`/`co_code`
  bytecode fidelity; `__cause__`/`__context__` chaining frames; frame locals
  capture; `traceback` rendering byte-for-byte identical to CPython (only the
  `FrameSummary` field values the tests read are guaranteed).

## 7. Validation

- Phase 1: new `TracebackTestCase` (hand-built `tb` → `extract_tb` field checks;
  `exc.with_traceback(tb)` round-trip) + a `tests/python/` fixture; full SUnit
  green; cpython regression gate 0 regressions (no board row changes expected).
- Phase 2: `TracebackTestCase>>testFuncCodeFirstlineno` (2a) +
  `>>testComprehensionExceptionTraceback` (2b, end-to-end) +
  `tests/python/{func_code_firstlineno,comprehension_traceback}.py`.
  `test_dictcomps` 10/0/1/0 → **10/0/0/0 OK** and `test_setcomps`
  1/0/1/0 → **1/0/0/0 OK** (isolated + via the parallel regen; the known flaky
  test_enum row restored to baseline). Full SUnit 3325/3325, cpython gate 0
  regressions / 2 improvements.
