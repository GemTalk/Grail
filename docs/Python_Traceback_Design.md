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

**Phase 2a follow-up — `__code__` on defs that compile to real methods (DONE).**
The gate's first verdict was `IMPORTERROR`, blocked at import on `__code__` of a
class/module-level def (a `BoundMethod`) — hit by a *class-body* line
`callable_line = get_exception.__code__.co_firstlineno + 2`. Only nested-def
`ExecBlock`s carried `__code__`; module/class-level defs → `BoundMethod` had been
explicitly deferred. Closed by giving those defs a code object too:

- `ClassDefAst >> emitMethodCodeTableOn:className:` compiles a class-side
  `___methodCodeTable___` (method name → `PyCode`), the `__code__` twin of the
  doc / signature / annotations tables — a class-body def becomes a Smalltalk
  method and so cannot carry the def-time `___pyCode___:` cascade.
- It is emitted **before** the class-attribute statements, not beside those
  sibling tables at the end of the class emit: the blocking line *runs while the
  class body executes*, so a table compiled afterwards would not exist yet. The
  table is a literal dict of compile-time constants, so it is safe that early.
- `importlib`'s top-level-def pass compiles the same table on the module class,
  for module-level defs.
- `FunctionDefAst >> emitPyCodeExprOn:qualname:` derives the three parameter
  counts for both emitters, identically to the nested-def cascade.
- `BoundMethod` / `UnboundMethod >> __code__` walk the superclass chain for it
  (so an inherited method reports the code object from where it was *defined*),
  and raise `AttributeError` when absent — **not** `None`, because
  `hasattr(x, '__code__')` is how `inspect` / `functools.wraps` decide whether
  something is a function at all.

Covered by `TracebackTestCase>>testMethodCodeFirstlineno` +
`tests/python/method_code_firstlineno.py`.

**Skip markers honoured (DONE).** With the module importing, the gate's next
finding was not a traceback gap at all but a *scoring* bug: `unittest`'s
`TestCase>>run` never consulted `__unittest_skip__`. The decorators had been
recording it all along, so every `@skipIf` / `@skipUnless` / `@requires_*`-gated
test RAN and was reported as a failure or an error instead of a skip. Fixed by
checking the class and method markers before `setUp`, exactly as CPython's
`run()` does. `test.support.cpython_only` was likewise a passthrough no-op, so
the C-API classes executed and died on the absent `_testcapi`; it is now a real
skip (Grail is never CPython). Method-level `@cpython_only` was already handled
by `ClassDefAst` emitting a skipping body — the runtime change adds the CLASS
case, and the two agree.

`test.test_traceback`: 93 failures / 250 errors / 6 skips → **53 / 116 / 180**.
174 tests moved from bogus failures to correct skips. Passing stays 21: this
fixes scoring, not behaviour. Four other modules gained skips for the same
reason (`test_math`, `test_bytes`, `test_datetime`, `test_enum`); ~6 tests that
had been passing *because* their marker was ignored are now correctly skipped —
e.g. test_math's `test_exceptions`, which carries
`@unittest.skipUnless(verbose, ...)` and which CPython does not run either.

**`traceback` module API filled in (DONE).** The module was written as a
Flask-shaped minimum ("enough for itsdangerous / Werkzeug / Flask error paths"),
so the gate's next finding was simply *absent names* rather than wrong output.
Added: `format_exception_only`'s 3.10+ one-argument form (it needs a private
`_sentinel` default — `None` is a legal `value`, so a `None` default cannot
distinguish "not supplied") and its 3.11+ `show_group=`; `StackSummary.extract`
/ `from_list` / `format_frame_summary`; `print_stack` / `print_tb`;
`TracebackException.__str__` (CPython renders the message alone, not the whole
traceback) and its `format()` now emitting the captured frames. `format()` /
`format_exception_only()` also absorb presentation-only kwargs (`colorize`)
through `**kwargs`: Grail renders plain text, so honouring them would produce
identical bytes, and raising `TypeError` instead helped nobody.

`test.test_traceback`: 116 errors → **82**, 21 pass → **26**. Failures rise
53 → 82, which is the intended shape — a test that used to die on a missing
attribute now runs far enough to make its real content assertion. Verified
test-by-test (pairing each `GRAIL_TEST` id with whether a `GRAIL_DETAIL`
followed): **5 fixed, 0 regressions**.

**Status when this section was written** — 370 tests, 26 pass, 82 fail, 82
error, 180 skip. **Now 36 pass / 86 fail / 39 error / 209 skip** (2026-08-10);
items 4 and 5 below are closed and item 1 is scoped in §9. The gaps as they
stood, in rough order of leverage:

1. Multi-frame tracebacks: `tb_next` / `f_back` are always `None` (a 4-deep call
   chain yields depth 1), and `co_filename` is the `'<grail>'` placeholder, so
   the `format_exc()` comparison failures cannot pass yet. This is the big one,
   and the only one needing real interpreter work — see the "Deferred" note
   above for why it was prototyped and backed out twice, and what a real
   attempt would cost (`#directMethod` functions lose their fast path).
   **Now measured and re-scoped — see §9**, which prices the wrapper (+14 ns per
   call, constant), rejects the raise-time-capture alternative on measurement,
   and separates `co_filename` out as a no-runtime-cost prerequisite.
2. `SyntaxError` carries none of `msg` / `filename` / `lineno` / `offset` /
   `text` / `end_lineno` / `end_offset`; `compile()` returns a `str`.
3. Implicit exception chaining leaves `__context__` as `None`.
4. ~~`tempfile.mkdtemp` raises `NotImplementedError` (6 errors).~~ **Closed** —
   `mkdtemp` is implemented (`os` provides mkdir/rmdir, so refusing the caller
   was never necessary).
5. ~~A residual 30 `_testcapi` errors in classes NOT decorated
   `@cpython_only`~~ — **mostly closed, and the diagnosis was wrong.** The
   classes *were* decorated; `@cpython_only` is a `_SkipDecorator` **instance**,
   and Grail silently dropped every decorator built as a callable instance
   (`object>>___pyCallValue___:kw:` answered "not callable" and the
   decorator-application guard discarded it). Fixed in
   `PythonInstance>>___pyCallValue___:kw:`; 30 → 6 errors, the remainder being
   test bodies that import `_testcapi` directly.

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

## 9. Scoping: multi-frame tracebacks (2026-08-10, gs40)

The remaining `test.test_traceback` gap is dominated by one thing: a traceback is
always **one frame deep**, that frame's `co_filename` is the `'<grail>'`
placeholder, and `tb_next` / `f_back` are always `None`. §7's "Deferred" note
says a real attempt costs `#directMethod` functions their fast path, and calls
the change large and high-risk — but never put a number on it. This section
does, and it changes the recommendation.

**Revised 2026-08-10, same day.** The first version of this section priced a
universal body wrapper (§9.1) and rejected raise-time capture (§9.2) because the
only live-stack API it had found was a formatted string report. That was wrong:
`#GemExceptionSignalCapturesStack` makes the VM hand over a **structural** stack
at signal time for ~1.3 ns per frame and nothing per call. §9.2 and §9.7 are
rewritten accordingly; §9.1's wrapper measurements are kept because they are
what the alternative is now compared against, and §9.3 / §9.4 are new.

### 9.1 What a Python call costs today (measured)

`GsProcess stackReportToLevel:` / `System _timeMs`, 2M direct static sends per
shape, best of 3, gs40 / GemStone 4.0. The four shapes are the ones codegen
already emits (`FunctionDefAst.gs:2696-2705`), so these are real alternatives,
not hypotheticals:

| body shape | mode | ns/call | vs `#directMethod` |
|---|---|---:|---:|
| method-scope temps, direct `^` | `#directMethod` | 11 | — |
| body in outer block, direct `^` | `#direct` | 15 | +4 |
| + one `on:do:` handler | `#exception` | 25 | **+14** |
| + two handlers (generator-aware) | (proposed) | 35 | **+24** |

A whole Grail **Python-level** call measures **~30 ns** (a `while` loop calling
`def leaf(x): return x + 1`, minus the same loop without the call).

The handler cost is **constant per call, not proportional to the body**. Re-run
with a ~12-operation body: 42 ns → 56 ns for one handler (+14), → 68 ns for two
(+26). Identical absolute deltas. So the relative cost is entirely a function of
how much work the body does:

- trivial leaf function: **+127%**
- ~12-operation body: **+33%**
- two handlers, ~12-operation body: **+62%**

That is the honest range for a universal single-handler body wrapper: somewhere
between a few percent on data-heavy code and a doubling on call-heavy code.
Material, but bounded and measurable — not the unknown the note implied.

### 9.2 Capture at raise time — the VM does it, cheaply

The attractive design is to pay nothing per call and get the stack when an
exception is actually raised. **This works, and it is the recommended
mechanism.** An earlier pass of this section concluded the opposite; that
conclusion was wrong because it had only found the string-report API. Both
findings are kept below, because which API you use changes the answer by three
orders of magnitude.

**What works: `#GemExceptionSignalCapturesStack`.** Per the kernel comment on
`AbstractException >> _gsStack`: when

```smalltalk
System gemConfigurationAt: #GemExceptionSignalCapturesStack put: true
```

and `gsStack == nil` on entry to primitive 2022 (`AbstractException >> _signal`),
the primitive fills `gsStack` with an **Array** — a Boolean (`inNativeCode`)
followed by **triples of `(aGsNMethod, ipOffset, receiver)`**, the same shape
`GsProcess >> _frameContentsAt:` answers. Structural data, built in C, no string
parsing. Verified on gs40: a 3-deep Smalltalk stack yields the expected
`class >> selector` per frame, plus the receiver.

Cost, measured as raise **and** catch, 20 000 iterations, best of 3:

| real stack depth | capture OFF | capture ON | delta |
|---:|---:|---:|---:|
| 5 | 150 ns | 150 ns | ~0 |
| 50 | 150 ns | 250 ns | +100 ns |
| 200 | 150 ns | 450 ns | +300 ns |
| 600 | 150 ns | 950 ns | +800 ns |

≈**1.3 ns per Smalltalk frame**, and **zero per-call cost** — the flag only
affects `_signal`. Break-even against the +14 ns/call wrapper of §9.1 is a
raise-to-call ratio of about **1 : 21** at depth 200. Ordinary Python is well
below that, so capture wins by roughly an order of magnitude; only
pathologically exception-dense code would favour the wrapper.

**Control-flow signals opt out for free.** Capture happens only when
`gsStack == nil` at signal time, so pre-stamping the instance suppresses it:

| | depth 50 | depth 600 |
|---|---:|---:|
| plain `Error new signal:` | 350 ns | 1150 ns |
| `e _gsStack: #()` first | 150 ns | 200 ns |

This matters because `#exception`-mode functions signal `PythonReturn` on every
return. `PythonReturn` / `PythonBreak` / `PythonContinue` / `StopIteration`
already subclass the kernel `Exception` rather than `BaseException`, so stamping
`_gsStack: #()` at construction keeps them at baseline cost.

**What does NOT work, and why the first pass got it wrong:**

- `GsProcess >> _frameContentsAt:` / `stackDepth` — answer only for a *suspended*
  process; on the running one `stackDepth` is 0.
- `AbstractException >> _gsStack` — nil for a normally signalled, caught
  exception **unless the flag above is set**. That is the fact the first pass
  missed.
- `GsProcess class >> stackReportToLevel:` — works live and carries the right
  information, but as a **formatted String**, and O(depth) at ~1.17 µs/frame
  (18 µs at depth 5, 192 µs at 200, 704 µs at 600). ~900× the flag's cost.
  Not the API to build on.
- **Forking a process to suspend the current one** (fork, pass `self`, wait on a
  semaphore, then use `_frameContentsAt:`) is unnecessary: the flag already
  answers structural data with no suspension. Measured for comparison, a bare
  `fork` + semaphore round trip alone is **~1000 ns**, before walking anything —
  strictly worse than 350 ns all-in at depth 50, and it adds suspension and
  reentrancy hazards.

### 9.3 What Python's `raise` actually does with the stack

Decisive for the design, because it determines whether a snapshot is *sufficient*.

CPython does **not** snapshot. A traceback is built **incrementally during
unwinding**:

1. `raise` attaches a traceback whose single entry is the raising frame.
2. Every frame the exception propagates *out of* adds an entry, which becomes the
   new **head**; `tb_next` chains inward toward the raise point. Head is the
   shallowest frame reached so far, tail is the raise point — hence "most recent
   call last".
3. A traceback therefore records the **propagation path**, not the stack. Frames
   above the eventual catcher never appear; callees that already returned never
   appear.
4. Bare `raise` / `raise e` re-raise the **same object**, which keeps its
   traceback and keeps **accumulating** — one traceback can span two disjoint
   paths joined at the re-raise point.
5. `__cause__` (`raise X from Y`) and `__context__` (implicit, raised while
   handling) each carry their **own** traceback.
6. `with_traceback(tb)` replaces it outright.
7. Entries hold frame objects alive, which is why `f_locals` stays inspectable.

Consequences for a raise-time snapshot:

- The snapshot is a **superset** of the traceback: it includes frames above the
  eventual catcher. It must be **trimmed at the catch site** — which is already
  the seam §3 identifies, the `except` binding at `TryAst.gs:128-134`, exactly
  where CPython does `e.__traceback__ = tb`.
- **Re-raise must splice, not replace**, or the original path is lost.
- Smalltalk frames must be **filtered** to those that are generated Python
  functions; the triple's method + receiver identify them.
- **Generators are the real risk.** Grail runs a generator body in a *forked
  GsProcess*, so a raise inside one captures that process's stack, which does
  **not** contain the consumer's frames — while Python's traceback spans both.
  That needs splicing across the process boundary, and it is the same boundary
  both backed-out wrapper attempts died on.

### 9.4 The one thing the flag does not give you: Python line numbers

> **Superseded by §9.9 — the conclusion below is wrong.** The flag *does* get you
> Python line numbers, with no compile-time map: `_sourceAtIp:` answers the
> generated source with a caret at the ip, and that source carries the Python
> line as the `___curPos___ := N` literal. Kept for the reasoning, which is
> instructive about *why* it looked impossible; act on §9.9.

The triple is `(method, ipOffset, receiver)` — **no temps** — so another frame's
`___curPos___` (which holds the Python line) is unreachable. `GsNMethod >>
_sourceAtIp:` does resolve an ip to an exact source position, but against the
**generated Smalltalk** source, whose line numbers are not Python line numbers.

So per-frame Python lines need a compile-time map from ip / step point to Python
line, emitted per method. That is plumbing with no runtime cost — the same
character as `co_filename` in §9.5, and naturally done alongside it.

(The error was reading "another frame's temps are unreachable" as "the line is
unreachable". The line never had to come from the live temp — it is a literal in
the source the method was compiled from.)

### 9.5 The gap is three separable pieces, not one

Worth stating explicitly, because they have very different costs:

1. **`co_filename` is a placeholder, and is independent of frame depth.** It is
   `'<grail>'` only as a codegen convenience — `PyCode.gs:82` documents "a real
   file path is a later refinement". Every emit site (`ClassDefAst >>
   emitMethodCodeTableOn:className:`, importlib's top-level pass,
   `FunctionDefAst >> emitPyCodeExprOn:qualname:`) already knows the module's
   source path at compile time. Threading it through is **plumbing with no
   runtime cost**, and it unlocks `linecache`, hence `FrameSummary.line` source
   text — which §6 listed as a non-goal to be served by a position array
   instead. No wrapper needed.
2. **Frame depth** (`tb_next` / `f_back`) is the part that needs the universal
   wrapper, and the part §9.1 prices.
3. **Frame content** (`lineno` per frame) already works for the one frame that
   exists, via `___curPos___`; it extends to N frames for free once (2) lands.

### 9.6 What each piece buys

All 125 remaining fail+err in `test.test_traceback`, bucketed by the change that
would fix them (some overlap; counted by primary blocker):

| # | blocker | notes |
|---:|---|---|
| ~23 | frame depth + real `co_filename` | includes ~10 bare frame-count asserts (`1 != 3`, `0 != 5`, …) |
| 14 | PEP 654 group tree rendering | only 2 are winnable alone; the rest also need frames |
| 18 | suggestion machinery / `sys.path` file imports | independent; `sys.path` imports are a separate question |
| 8 | `TracebackException.__eq__` | small, independent |
| 7 | `_testcapi` / `_suggestions` | not fixable — no C extensions |
| 4 | `sys._getframe` | small, independent |
| 4 | uncatchable Smalltalk (`AlmostOutOfStack`, 255 dynamic instVars) | separate defects |
| 3 | `FrameSummary.locals` | small, independent |
| 3 | PEP 678 `__notes__` not rendered | small, independent |
| 2 | `SyntaxError` attributes (`compile()` answers a str) | larger than it looks |
| 2 | exception-name module qualification | **this row was backwards** -- Grail rendered the BARE name and CPython wants the module-qualified one; corrected and fixed, see §9.8 |
| ~37 | assorted small rendering/API | see the per-test log |

So frame depth is the single largest bucket but **not a majority**: ~23 of 125.
Roughly 20 more are reachable by small independent changes with no performance
question at all (`__notes__`, `__eq__`, `_getframe`, `locals`, name
qualification, `NoneType: None`).

### 9.7 Recommendation

**Do (1) `co_filename` first, as its own change.** No runtime cost, no risk to
the fast path, unblocks `linecache` / `FrameSummary.line`, and it is a
prerequisite for judging (2) — with a placeholder filename, correct frame depth
still cannot match CPython's expected output.

**Then the small independent set** (§9.6), which is cheap and needs no
architectural decision.

**Then frame depth via §9.2's VM capture — NOT a universal body wrapper.** This
is the part that changed: with `#GemExceptionSignalCapturesStack` the frame list
costs nothing per call and ~1.3 ns per frame per raise, so there is no fast-path
regression to weigh and no need for a codegen flag defaulting off. The two
backed-out wrapper attempts were solving the problem the expensive way.

The work that remains is therefore compile-time and catch-site, not per-call:

1. Set the flag at session init (alongside the other session setup) — it is a
   *gem* configuration, so it is per-session and must be re-set, not stored.
2. Stamp `_gsStack: #()` on `PythonReturn` / `PythonBreak` / `PythonContinue` /
   `StopIteration` at construction, so control flow stays at baseline cost.
3. Emit the ip → Python-line map of §9.4, with `co_filename`.
4. Walk `_gsStack` at the `except` binding (`TryAst.gs:128-134`), filtering to
   generated Python methods and **trimming to the catching frame** (§9.3).
5. Splice rather than replace on re-raise (§9.3).

The remaining real risk is **generators**: their body runs in a forked
GsProcess, so a captured stack does not contain the consumer's frames and has to
be spliced across that boundary (§9.3). That is the same boundary both wrapper
attempts died on, so it should be prototyped early rather than last.

Also still true from the earlier attempts, and worth keeping: `AbstractException`
cannot be named literally in every generated-code compile context, so any class
reference in generated code must be resolved at runtime.

### 9.8 Landed against §9.7's plan (2026-08-10)

Progress log, so §9.6's bucket table can be read against what is left rather
than re-measured each time. `test.test_traceback` **pass 27 → 45** over the
day; the numbers below are per landing, measured by running that one module.

| # | change | pass | notes |
|---|---|---:|---|
| — | (start of day) | 27 | |
| #285 | instance-decorator dispatch, `_testcapi` skips | 36 | `@cpython_only` was never *called* |
| #294 | `co_filename` = real path (+ `tokenize`, `PyStatResult`, lazy `FrameSummary.line`) | 37 | §9.5 item (1) |
| #296 | `os.stat` of a missing file raises `OSError` | 39 | see below |
| — | PEP 678 `__notes__` rendering | 42 | §9.6's "3, small, independent" |
| — | `TracebackException.__eq__` | 45 | §9.6's "8" — 3 of them; the rest need frames |
| — | module `__loader__` + `extract_tb` on any traceback | 51 | see below |
| — | exception naming + message rendering | 59 | see below |

Three things learned that the plan did not anticipate:

1. **`co_filename` alone was inert.** It needed three more pieces before a
   single line of source text appeared: a `tokenize` module (`linecache`
   imports it *inside* `updatecache` and returns `[]` on ImportError, so every
   lookup silently answered nothing), `os.stat` answering CPython's `st_*`
   names, and `FrameSummary.line` being a lazy property rather than a plain
   attribute. §9.5 called item (1) "plumbing with no runtime cost", which was
   true but not sufficient.

2. **`os.stat` never raised.** `GsFile>>stat:isLstat:` answers a SmallInteger
   *errno* on failure, never `nil`, which is what the three callers tested
   for — so `linecache.updatecache`'s `except OSError` never fired, and after
   #294 wrapped the errno in a `stat_result` the first `st_size` read became an
   **uncatchable Smalltalk MNU**. Eight tests died there. Fixed in #296 by
   testing for the *success* shape.

3. **`__notes__` had to become a real attribute.** It was stored under a
   private `___pyNotes___` slot with a `__notes__` accessor, so
   `e.__notes__ = [...]` and `del e.__notes__` — both of which the stdlib and
   the conformance tests use — were invisible; the accessor kept answering the
   old list. Since `___pyAttrLoad___` probes dynamic instVars *before* the
   method chain, naming the slot `__notes__` makes assignment and deletion work
   through the ordinary attribute path with no new machinery.

**Two separate defects found while doing this, not yet fixed:**

- **`str()` of an exception whose class defines `__getattr__` answers `''`.**
  `Exception(123).__str__()` is `'123'`, but `BrokenException(123)` (whose only
  addition is a `__getattr__`) renders as `BrokenException` with no message.
  Independent of tracebacks; it just shows up there first.
- ~~**`linecache`'s `module_globals` / `lazycache` path is missing.**~~
  **Fixed.** The port of `lazycache` / `_make_lazycache_entry` was already
  faithful; what was missing was that Grail set `__name__`, `__package__` and
  `__file__` on every module but **no `__loader__`**, so
  `_make_lazycache_entry` found no `get_source` and answered None — and every
  such lookup silently returned `[]`. Added `PySourceFileLoader` (CPython's
  `SourceFileLoader`, reduced to answering the module's source) and set it as
  `__loader__` when the module is built. All six of those tests pass.

**A second lesson of the same shape as (1).** `extract_tb` read `tb_line` /
`tb_end_lineno` / `tb_colno` / `tb_end_colno` off the traceback. Those are
Grail's own shortcut for the common case, not part of the traceback protocol
CPython documents — which is `tb_frame` / `tb_lineno` / `tb_next`, with the
PEP 657 columns coming off `code.co_positions()` indexed by `tb_lasti`. So
`extract_tb` raised AttributeError on any other traceback-shaped object, and
`TracebackException.__init__` swallowed that into an **empty stack** — the
caller then saw `IndexError` from `stack[0]` with nothing to say why. Reading
the extras with `getattr` and falling back to `co_positions()` fixed three more
tests. Both this and (1) were cases where a *defensive* `except Exception:`
converted a precise failure into a silent wrong answer.

**§9.6's "exception-name module qualification" row was backwards**, and the
fix was the opposite of what it implied. CPython names an exception with
`__qualname__` **qualified by `__module__`** unless that module is `builtins` or
`__main__`; Grail rendered the bare `__name__`. Reading
`assertEqual(exp, err)`'s argument order is what caught it -- the note had the
expected and actual values the wrong way round. Blast radius checked before
changing anything: every builtin exception reports `__module__ == 'builtins'`,
so `ValueError: x` is untouched and only library-defined exceptions become
qualified.

**Three message-rendering defects found alongside it**, all outside the
traceback module itself:

- **`str(Exception(None))` answered `'aNoneType'`.** The one-argument branch of
  `BaseException>>__str__` used Smalltalk `#asString`, so the argument's
  printString leaked instead of its Python `__str__`. The multi-argument branch
  had already been fixed for exactly this (`'atuple'`); this was its other half.
  It affects any exception carrying a non-str argument, which is why fixing it
  also took `test.test_datetime` from 6 errors to 4 -- a second module, not
  predicted.
- **`format_exc()` short-circuited to `'None\n'`** with no active exception,
  where CPython answers `'NoneType: None\n'`. Deleted rather than adjusted:
  `format_exception(None, None, None)` now renders it correctly on its own.
- **`print_exc`'s first positional was `file`, not `limit`.** CPython's is
  `print_exc(limit=None, file=None, chain=True)`, so a caller writing
  `print_exc(None, file=f)` bound None to the wrong parameter.

~~**A separate defect found and deliberately NOT fixed here:**~~ **Fixed.** A
user-defined exception subclass with an **empty body** did not record `args` --
`class E(Exception): pass` then `E("boom").args` answered `()` where CPython
answers `("boom",)`, so `str()` was `''` and the message disappeared from every
render of `raise MyError("...")`, the most common way libraries declare an
exception.

The cause was a *silent* selector miss, not a logic error. A generated class
constructor whose class defines no `__init__` of its own probes the **varargs**
selector `___init__:kw:` and swallows `MessageNotUnderstood` -- deliberately, so
a plain data class with no `__init__` anywhere keeps zero-arg `new` semantics
(`ClassDefAst`'s `ifNil:` branch). `BaseException` implemented only the 0- and
1-argument `__init__` / `__init__:`, never the varargs form, so the send missed
and the miss was swallowed. A subclass whose `__init__` chained to `super()` was
dispatched statically and worked, which is why this stayed hidden.

Adding `BaseException>>___init__:kw:` -- CPython's `BaseException(*args)`, which
sets `args` to the whole positional tuple and rejects keyword arguments -- fixes
every shape at once: empty body, docstring-only, class-attribute-only, and
subclasses two levels deep.

Worth recording that this won **zero** conformance tests: the full 50-module
suite did not move a single row. The curated modules that subclass exceptions
either define `__init__` or never assert on the message. Its value is
real-code correctness, covered by the new `ExceptionSubclassArgsTestCase`
(three tests over an eight-check fixture) rather than by the scoreboard.

**§9.7's ordering still holds** for what remains: the rest of the small
independent set (`sys._getframe` -- now the only one left of it), then frame
depth via §9.2's VM capture,
with generators prototyped early. Nothing measured today changes the frame-depth
recommendation.

### 9.9 Frame-depth prototype (2026-08-10, gs40)

§9.7 said the generator boundary "should be prototyped early rather than last".
This is that prototype. It is measurement only — no product change — and it
**simplifies §9.4** while **confirming §9.3's generator risk** as a hard
boundary rather than a worry.

#### The capture gives real Python frames

With `#GemExceptionSignalCapturesStack` on, a raise three Python calls deep
(`catcher` → `outer` → `middle` → `leaf`) yields, innermost first:

```
[1] AbstractException >> #'signal:'                    env=0
[2] Object >> #'___signal___:'                          env=1
[3] BaseException class >> #'___signalNew___:kw:cause:'  env=1
[4] BaseException class >> #'___pyRaiseNew___:args:kw:cause:'
[5] BaseException class >> #'___pyRaiseNew___:args:kw:'
[6] _spike >> #'leaf:'        ip=112   env=1     <- Python frame
[7] _spike >> nil             ip=120   env=1     <- block inside leaf:
[8] _spike >> #'middle:'      ip=128   env=1     <- Python frame
...
[15] _spike >> #'catcher'     ip=136   env=1     <- Python frame
[16] Object >> #'perform:env:'                   env=0
[18] GsNMethod class >> #'_gsReturnToC'          env=0
[19..21] nil                                     <- over-allocated padding
```

So the selection rule is concrete: **`environmentId = 1`, `inClass` is a
generated Python module/class, `selector` not nil**, stopping at the first nil
method (the array is over-allocated, so `size` overstates the frame count).
Block frames carry a **nil selector** and belong to the enclosing method — they
must be merged into it, not reported as separate frames, since CPython has no
frame for a comprehension body or an `except` block.

Two corrections to §9.2 from the observed data: the leading element is a
SmallInteger (`0`), not a Boolean; and the trailing padding means the frame
count has to be derived by scanning for nil rather than from `(size - 1) // 3`.

#### §9.4 was wrong: Python line numbers need NO compile-time map

§9.4 concluded that per-frame Python lines require "a compile-time map from ip /
step point to Python line, emitted per method". They do not. `GsNMethod >>
_sourceAtIp:` answers the **generated Smalltalk source with a caret at the exact
ip**, and that source already carries the Python line as a literal, because
codegen emits `___curPos___ := N` before each statement:

```
   leaf: x
   | ___curPos___ |
   ___curPos___ := 2.
   BaseException @env1:___pyRaiseNew___: (ValueError) args: {...} kw: nil.
 *                     ^4
```

So the Python line for a frame is **the last `___curPos___ := N` at or above the
caret line**. §9.4's obstacle was that `___curPos___` is a method temp and
another frame's temps are unreachable — true, but irrelevant: the line is read
from the *source literal*, not from the live temp.

Verified against a multi-statement function, where the `raise` is on Python line
39 and its caller's call site on line 44:

| frame | ip | derived Python line |
|---|---:|---:|
| `multi:` | 280 | **39** ✔ |
| block in `multi_catcher` | 104 | 44 |
| block in `multi_catcher` | 120 | 44 |
| `multi_catcher` | 136 | **44** ✔ |

Both exact. Block frames resolve to their home method's line, which is what
makes merging them safe.

That removes a whole codegen phase from §9.7's step 3.

#### …but the derivation does NOT hold for the CATCHING frame

The table above measured the catching frame on a gem running **interpreted**,
where `multi_catcher`'s ip resolved to its call site. A gem running **native
code** does not. That frame is suspended inside the `on:do:` protected block
codegen wraps a `try` in, and there `_sourceAtIp:` answers a report whose caret
sits *past the whole block* — so "the last `___curPos___ := N` at or above the
caret" is the function's **final** statement:

```
17{   ___curPos___ := 34.}
18{   ^ (None).}
19{ * ^6 …}          <- caret, past the on:do: that is actually executing
```

Measured, same commit, same 3.7.5, `tests/python/frame_depth.py`'s `catcher`:

| gem | `GemNativeCodeEnabled` | captured ips (leaf/middle/outer/catcher) | catcher line |
|---|---:|---|---:|
| CI, Linux x86_64 | 2 | 295 / 425 / 425 / 367 | **34** ✘ |
| local, macOS arm64 | 0 | 104 / 128 / 128 / 136 | **31** ✔ |

The native ips are ~3× the bytecode ones, and only the `on:do:`-suspended frame
misresolves: CI derives `leaf`/`middle`/`outer` as 18/22/26 exactly, because
those sit at *call* sites.

This is **not** a 3.7.x-vs-4.0 difference — 3.7.5 with the pre-fix code passes
the whole suite on an interpreted gem, and native code is simply unavailable on
macOS/arm64, which is why every local run (both versions) looked fine.

So the catching frame takes the position **codegen recorded** —
`___pushCatchingFrame___` is handed `pos: ___curPos___`, exact by construction —
and never the derived one. Note the shape: codegen passes a bare **SmallInteger**
for an ordinary statement and a 5-tuple only for a comprehension / for-loop
iterator clause, so honouring `pos` only when `isKindOf: Array` (as the first cut
did) silently left every ordinary `try/except` on the derived line.

Residual, unmeasured: an intermediate frame that is itself inside a `try` whose
handler did not match is suspended in a protected block too, so under native code
its line may read as its function's last statement. The derivation now **fails
closed** when no caret line is present at all — answering nil drops the frame and
leaves the single-frame fallback, since a missing frame is recoverable and a
confidently wrong line number is not — but it cannot detect a caret that is
merely in the wrong place.

Practical note for anyone debugging this class of bug: a divergence like this is
invisible to every local gem on macOS, so the only place it reproduces is CI.

#### Cost: ~100 µs per frame, at traceback-build time only

200 iterations over the env-1 frames of one captured stack: **182 ms**, ≈0.9 ms
per traceback, ≈**100 µs per frame**. Nothing per call, and nothing on a raise
that is never rendered — but note this is ~85× the *per-frame* cost of the
`stackReportToLevel:` string API that §9.2 rejected. The difference is that this
is paid only when a traceback is actually inspected, whereas the flag's
1.3 ns/frame is paid on every raise.

It should be **cached per (method, ip)** — tracebacks repeat the same frames
constantly, and the derivation is pure. A session-local dictionary, or a lazily
built per-method ip→line table, reduces it to once per distinct site. Worth
doing in the same change, since 100 µs × frames × exceptions is easy to notice
in a loop that raises.

#### Generators: confirmed hard boundary

A raise inside a generator body, consumed by `for v in gen_body()`, captures:

```
[6] _spike >> nil          env=1     <- the generator body
[9] PythonGenerator >> nil           <- the forked-process plumbing
[17] GsProcess >> #'_start'
```

`gen_consumer`'s frames are **absent entirely** — the capture is of the
generator's own GsProcess, which does not contain the consumer's stack. So
§9.3's prediction holds exactly, and it is a boundary, not a degradation: there
is nothing to trim or filter, the frames simply are not there.

This means a first landable increment should be **multi-frame tracebacks for the
non-generator case**, with a generator raise keeping today's single-frame
behaviour, documented as a known limitation. Splicing the consumer's stack
across the process boundary needs the generator to record its consumer at
resume time, which is its own change and should not gate the ordinary case.

#### Revised remaining work

1. ~~Set the flag at session init~~ **done** — armed on the raise path
   (`___pyRaiseNew___`), not an import hook: a session can raise without
   importing, and the flag must be set *before* the signal. Memoised in
   SessionTemps, so it costs one dictionary probe per raise thereafter.
2. ~~Stamp `_gsStack: #()` on the control-flow signals~~ **done** for
   `PythonReturn` / `PythonBreak` / `PythonContinue`.
3. ~~Emit the ip → Python-line map~~ **not needed** — derived from
   `_sourceAtIp:` + `___curPos___`, cached per (method, ip).
4. ~~Walk `_gsStack` at the `except` binding~~ **done**, with one correction to
   the rule: a frame is identified by its **line derivation succeeding**, not by
   a class or category test. That is self-validating (only codegen emits
   `___curPos___`) and avoids a false-positive list — a category test is not
   usable, because `importlib` and `ShimSreModule` are hand-written yet also use
   codegen's `Grail-Methods`.
5. ~~Splice rather than replace on re-raise~~ **done** — and the splice turned
   out to be a *rebuild*, not an append; see §9.10.
6. Generators: single frame as today (pinned by a test), then splice across the
   process boundary as a separate change. **Still open.**
7. ~~An exception raised inside an `except` handler inherits the handled
   exception's frames~~ **done**; see §9.11.

One thing the walk must preserve: the catching frame keeps the position
**codegen** recorded, in either shape it comes in — a bare `___curPos___`
SmallInteger, or the 5-tuple with PEP 657 columns for a comprehension / for-loop
iterator clause. Honouring only the 5-tuple lost the columns on comprehensions
(`testForLoopExceptionPositions`, `init_span`, which is what `test_dictcomps` /
`test_setcomps` assert on) *and* left every ordinary `try/except` on an
ip-derived line, which is native-code dependent.

**What it bought, measured.** `test.test_traceback` pass **59 → 61**. That is far
short of the "~23" §9.6 attributed to frame depth, and worth being clear about:
correct multi-frame tracebacks are *necessary* for those tests but not
*sufficient* — the rest also need `sys._getframe`, `__cause__`/`__context__`
chaining, caret/anchor lines, or exception-group tree rendering. The two that
moved (`LimitTests.test_extract_tb`, `test_format_exception`) did so only after
`limit` was threaded through `extract_tb` / `format_tb` / `format_exception` /
`print_exception`, which the correct frame count exposed as the next blocker:
both had previously failed on `1 != 6` and got no further.

### 9.10 Re-raise splicing, and the handler-context gap (2026-08-11, gs40)

Item 5 said "splice rather than replace". Measured against real CPython 3.14.6,
the correct operation is the opposite: **rebuild**.

`___pushCatchingFrame___` used to bail out whenever a traceback already existed,
so everything above a bare `raise` was lost. CPython instead adds a frame for
**every** function the exception unwinds through, each at the line where it
*entered* that function — not at the `raise` — and each function exactly once:

| scenario | CPython | Grail before | Grail now |
|---|---|---|---|
| bare re-raise | `outer@17 middle@10 leaf@5` | `middle@10 leaf@5` | matches |
| through a `try`-less function | `two_levels@21 passthrough@16 mid@10 leaf@5` | `mid@10 leaf@5` | matches |
| two nested re-raises | `catch_twice@42 reraise_twice_outer@35 reraise_twice_inner@28 leaf@5` | `reraise_twice_inner@28 leaf@5` | matches |

Rebuilding from the live captured stack answers all three exactly, for a reason
specific to the host: **Smalltalk has not unwound anything.** A handler runs *on
top of* the frames that signalled, so at the moment of the re-raise the stack
still holds the original chain (`leaf`, `mid`) below the handler, with the newly
entered frames (`passthrough`, `two_levels`) above it — every one parked at its
call site, which is the position CPython reports. Appending only the catch-site
frame would have dropped every pass-through frame.

Which of the three cases applies is decided by the head of the existing
traceback:

- head names **this** function → a body wrapper or comprehension wrapper already
  located the exception here, more precisely (it has columns). Leave it.
- head names **another** function → the exception was re-raised deeper and has
  propagated into us. Discard the partial chain and walk again.

Same-name recursion is the case that rule cannot see: re-raised in `f` and caught
again in `f` reads as the first case and keeps the deeper chain.

#### The gap this exposed: raising a NEW exception inside a handler

The same "nothing has unwound" property that makes the rebuild correct makes this
case wrong, and it predates this change:

```python
def explicit():
    try:
        leaf()                     # 25
    except ValueError:
        raise KeyError('wrapped')  # 27
```

| | frames |
|---|---|
| CPython | `catch_explicit@32 explicit@27` |
| Grail | `catch_explicit@32 explicit@25 leaf@5` |

Two errors, one root cause. `leaf@5` is still on the Smalltalk stack below the
handler, so the walk reports it even though Python considers it unwound — the new
exception must not inherit it. And `explicit` reads as line 25 (the `leaf()` call,
where its frame is parked at the `on:do:`) instead of 27, because the statement in
flight is known only to the handler *block*, whose frame the walk skips.

Both point the same way: the walk needs to recognise that the innermost Python
frame is the **handler block's home method**, not the deepest frame on the stack,
and stop there rather than continuing into the signalling frames below. That is
item 7, and it is a change to frame identification rather than to splicing, so it
is deliberately not bundled here.

#### A frame's line comes from its innermost BLOCK, not from the method frame

CI caught the half of item 5 that no local gem can see. A re-raising frame is
itself inside a `try`, so its **method** frame is parked at the `on:do:` — and the
residual noted above says exactly that such an ip does not resolve under native
code, where it reads as the function's last `___curPos___`. `mid` therefore came
out at its `raise` (34) rather than at the call the exception entered on (32), and
`testBareReraiseSplicesFrames` failed in CI while passing on every local gem. That
residual had been listed as "untested either way"; it is now tested, and it was
not peripheral — it is the exact line CPython's rule is about.

The fix uses what §9.4's prototype already observed: a **block** frame resolves
within its home method's source. The block is parked at the statement in flight,
while the method frame is parked at whatever construct is *running* that block. So
blocks remain unreported as frames of their own (CPython has none for a try body,
an except handler or a comprehension body) but now supply their home's **line**,
innermost winning — a later block for the same home is an enclosing one, hence
less precise.

Interpreted this is a no-op: all four measured scenarios come out byte-identical
and SUnit is unchanged. Its only effect is where the two sources disagree, which
is native code, so CI is the only verification — as §9.9's closing note says.

It does **not** fix item 7, and the walk shows why: between the handler block and
its home method frame sit the signalling frames of the exception being handled,
which reset the pending line. Hence `explicit` still reads 25.

### 9.11 Frames Python has already unwound (2026-08-11, gs40)

§9.10's item 7. An exception raised while another is being handled gets its **own**
traceback; the handled exception's frames belong to `__context__`, not to it. Grail
reported them, because a Smalltalk handler runs *on top of* the frames that
signalled — nothing is unwound before `on:do:` is entered — so the whole
propagation path of the exception being handled is still on the stack below the
`raise`.

Measured against real CPython 3.14.6:

| case | CPython | Grail before | now |
|---|---|---|---|
| `raise K()` in the handler | `catch@35 wrap_bare@16` | `catch@35 wrap_bare@14 leaf@5` | matches |
| `raise K() from e` | `catch@35 wrap_from@23` | `catch@35 wrap_from@21 leaf@5` | matches |
| handler calls a helper that raises | `catch@35 wrap_via_helper@30 helper@9` | `catch@35 wrap_via_helper@28 leaf@5 helper@9` | matches |

Two symptoms, one cause. `leaf@5` was included, and the handler's own frame read as
the *try body* line (14) rather than the `raise` (16) — because the frames between
the handler block and its home method frame reset the pending block line (§9.10).

**The rule.** Reaching a method frame that is not the pending block's home means we
are inside a handler running above already-unwound frames, so skip until the pending
home's own frame arrives. One skip fixes both symptoms: the foreign frames stop
being reported *and* stop clobbering the line. In the ordinary case nothing is
skipped, because a block's frames are immediately followed outward by their own
method frame — a foreign method frame in between is precisely the signature of a
handler.

Note what this is *not*: "stop at the handler". A function the handler **calls** does
contribute its frames (`helper@9` above), and the third row pins that.

**Not fixed, and now measured:** implicit chaining. Grail answers `None` for
`__context__`, so the frames dropped here are not yet reachable the way CPython
makes them reachable — the exception being handled is simply not linked to the new
one. That is §9.6's chaining work, unchanged by this. The test pins the invariant
that *is* in scope: the handled exception's own traceback still names its own
frames, held directly rather than through `__context__`, so it fails for the right
reason if this regresses.
