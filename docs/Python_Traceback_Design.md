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
6. ~~Generators: splice across the process boundary~~ **done**; see §9.12.
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

### 9.12 Splicing across the generator's process boundary (2026-08-11, gs40)

§9.9's item 6, the last of them. §9.9 called this "a hard boundary": the stack
captured when a generator body raises holds the body and the fork plumbing and
**nothing** of the consumer, because the body runs in its own `GsProcess`.

The boundary is real but it is crossable, and the crossing point already existed.
`PythonGenerator >> _forkBody` catches an exception escaping the body *on the
forked process* and stows it; `_signalEscapedException` **re-signals it on the
consumer**. So:

1. at the stow, take the capture (the generator's half) and **clear `_gsStack`** —
   primitive 2022 fills it only when nil on entry, so without the clear the
   re-signal never captures the consumer's half and the traceback collapses to the
   catch-site frame;
2. the re-signal on the consumer captures the consumer's half naturally;
3. the walk concatenates them, generator half first because it is innermost.

One stash **per level**, because `yield from` nests forked processes: the inner
generator is re-signalled onto the *outer generator's* process, whose handler stows
in turn. Overwriting instead of appending lost the inner frame. A **boundary index**
is recorded where each level ends, and the walk flushes its pending block there —
which is what finally reports a generator's own frame at all, since the body is a
block whose home *method* frame is not on the forked stack.

Measured against real CPython 3.14.6, all seven shapes now match:

| shape | CPython | Grail before |
|---|---|---|
| `for … in gen()` | `consume_for@11 gen@6` | `consume_for@11` |
| `next(g)` | `consume_next@22 gen@6` | `consume_next@22` |
| intermediate consumer | `nested_consumer@30 consume_inner@37 gen@6` | `nested_consumer@30` |
| `yield from` | `consume_delegated@15 outer_gen@10 inner_gen@6` | `consume_delegated@15 outer_gen@10`\* |
| `gen.throw()` | `throw_into@96 simple_gen@41` | already matched |
| body catches its own | no traceback | already matched |
| PEP 479 `StopIteration` | consumer only | already matched |

\* with the first version of the stash, which overwrote per level.

#### A digit-scanning bug the generator fixture exposed

`___derivePythonLineForMethod___` collected **every** digit from `___curPos___ := `
to end of line, so when the generated statement carried other numeric literals on
that line they ran together: a `for` loop over a generator derived **37133718**
from `___curPos___ := 37.`. A whole Python statement does land on one generated
line, so this was the common case rather than an exotic one — it simply had not
been hit, because in the earlier fixtures the assignment was the last thing on its
line. It now reads only the consecutive digits, and takes the **last** assignment
on the line.

#### The pin that would not have caught it

§9.9 said `a_generator_raise_still_produces_a_traceback` was "what will catch the
behaviour change when the boundary is spliced". It would not have: it asserted
`len(frames) >= 1`. It is now exact, and asserts the two frames' **source lines**
rather than numbers or names — numbers because constants for the check's own body
need editing whenever anything above them moves, names because of the gap below.

#### A third native-code residual: a frame parked on a loop's iteration send

CI found this one, as it found §9.10's. An **intermediate** consumer frame — one
that is neither the catcher nor parked on a plain call — reports the wrong line
under native code:

```
consume_inner:  for _ in gen():   <- 72, what CPython reports
                    pass          <- 73, what a native-code capture derives
```

The block frame is parked on the loop's `__next__` send, and the caret lands past
the loop's own `___curPos___ := 73`. Same shape as §9.10's `on:do:` case: an ip
inside a *construct* does not resolve back to the statement in flight, and only the
positions **codegen** records are dependable there.

The same weakness covers a generator that is **thrown into**: it is parked at a
`yield`, so `gen.throw()`'s generator frame does not resolve either, while a
generator that *raises* is parked on the raise and does (`gen@28` is asserted
exactly). Interpreted, both are right.

It does not affect the catching function (which takes codegen's position) nor a
frame parked on a plain call, so `generator_frames.py` advances the intermediate
consumer with `next()` and says so — the alternative would be a fixture that
tolerates two answers, which is a test that has stopped testing. The general fix is
to prefer the frames generated code pushed (`ForAst` records the iterator clause
with PEP 657 columns) over re-deriving them during a rebuild, which is a change to
the rebuild rule of §9.10 rather than to this splice.

#### Still open: nested functions

Measured on `main` as well as here, so pre-existing and not from this change:

| | CPython | Grail |
|---|---|---|
| nested `def` raises | `[('outer', 9), ('helper', 6)]` | `[('outer', 9)]` |
| nested generator raises | `[('outer', 10), ('gen', 7)]` | `[('outer', 10), ('outer', 7)]` |

A nested function's frame is missing entirely for a plain `def`, and a nested
*generator* now gets its frame with the right line but named after the **enclosing**
function — its body is a block whose home method is the enclosing one, and
`___pythonFrameNameFor___` reads the name from the home method's selector. Giving
nested functions their own frame identity is its own change; `generator_frames.py`
therefore uses module-level generators to pin naming.

With item 6 done, §9.9's plan is complete. What remains for `test.test_traceback`
is what §9.6 already attributed elsewhere: `sys._getframe`, `__cause__` /
`__context__` chaining (Grail answers `None` for `__context__` today, §9.11),
caret/anchor lines, and exception-group rendering — plus the nested-function gap
above.

### 9.13 __cause__ / __context__ chaining (2026-08-11, gs40)

The largest coherent group left in `test.test_traceback` after §9.9's plan, found
by bucketing the 96 non-passing tests by cause rather than by trusting §9.6's
estimates: **20** suggestion tests, **19** exception-group, **12** chaining,
4 `sys._getframe`. Chaining is the one that was half-built already.

Grail had `__cause__` (`raise X from Y`) and `__suppress_context__`, but never set
`__context__`, and `format_exception` rendered only the outermost exception even
when a cause existed. Measured against real CPython 3.14.6:

| | CPython | before |
|---|---|---|
| raise inside a handler | `context=ZeroDivisionError`, 2 sections, "During handling" | `context=None`, 1 section |
| `raise X from Y` | `cause=Y context=Y suppress=True`, 2 sections, "direct cause" | cause ✓, `context=None`, **1 section** |
| `raise X from None` | `context=Y suppress=True`, 1 section | `context=None` |

**Implicit context needs no new bookkeeping.** The exception being handled is
already recorded — `TryAst` sets `___currentException___` on handler entry and
restores it on exit, which `sys.exception()` uses. So a raise consults it, subject
to three rules: don't overwrite a context already set, don't chain an exception to
itself (`except E as e: raise e`), and **break** cycles rather than decline them.

That last one matters and is easy to get backwards. CPython's `_PyErr_SetObject`
walks the candidate's context chain and, on finding the exception being raised,
*clears that link's context* and chains anyway. Declining instead leaves the
context unset — visibly wrong, since `test_cause_recursive` builds exactly this
shape and CPython reports `__context__` as the `KeyError`, not `None`.

**Every raise path needs it**, which the tests found one at a time. `RaiseAst`
emits three shapes: a constructed `raise Cls(...)` through `___signalNew___`, a
bare `raise expr` through `___pyRaise___:` — which covers both a bare *class* and
an already-built *instance* — and `Cls ___signal___: msg` for built-ins. The bare
class had no instance to hang a context on and signalled the class directly; it
now builds an instance when, and only when, something is being handled, so the
common uncontexted raise keeps the cheaper path.

**Rendering** walks the chain in `format_exception` (over live exceptions) and in
`TracebackException.format` (over links captured at construction, as CPython does
so rendering can be deferred). One subtlety: the deepest exception introduces
nothing, and when the walk stops on a cycle its link still carries the connector
it would have used for the link it refused to follow — which printed a stray "the
direct cause of" *ahead of* the first block (5 blocks where CPython has 3).

**Result: `test.test_traceback` 61 → 63 passing, failures 72 → 67.** Modest
against 12 tests in the bucket, and worth being precise about why: the rest fail
on things chaining does not supply — `DeprecationWarning` on the legacy 3-arg
form, exception-group tree rendering, and `test_long_context_chain`, which builds
its chain from a runaway recursion. §9.14 takes that one up.

> Superseded, and recorded because guessing a cause is what went wrong: this
> section originally named the next piece as converting `TracebackException`'s
> **recursive** chain construction to a queue, on the theory that the recursion
> was what exhausted the temporary object space in `test_long_context_chain`.
> Measurement (§9.14) put the actual blocker two steps earlier — the chain was
> length **1**, so nothing deep was ever walked. The queue conversion turned out
> to be worth doing for a different reason, and not to be what fixed anything
> here.


### 9.14 The chain a runaway recursion builds (2026-08-12, gs40)

Taking up `test_long_context_chain`, the one test §9.13 left named. CPython's
shape is the classic runaway:

```python
def f():
    try: 1/0
    except ZeroDivisionError: f()
```

Every level raises `ZeroDivisionError` while the level above is *handling* one, so
each links to the next by `__context__`; the `RecursionError` that finally stops it
links to the innermost. CPython therefore reports a context chain as long as the
recursion and renders one traceback block per link.

**Measuring first changed the plan.** §9.13 had guessed the blocker was recursive
chain construction exhausting temp object space. It was not. Probing the actual
shape found three separate things, in the order they bite:

1. **The `AlmostOutOfStack` never reached Python at all.** Grail has no Python
   frame counter, so the gem's Smalltalk stack runs out first and GemStone signals
   `AlmostOutOfStack`, a *notification* no Python `except` can contain.
   `BaseException class>>___recursionGuard___` has converted it to a catchable
   `RecursionError` since before this work — but only around **module bodies**, in
   `importlib`. The CPython-suite harness's per-test call into Python was
   unguarded, so the notification escaped into Smalltalk and the per-test rescue
   scored the test `ST: ...`. One `___recursionGuard___:` around
   `harnessMod run_one:` fixes that; it is the other Smalltalk → Python entry
   point the suite uses.
2. **The guard's replacement exception took no `__context__`.** It is built with
   `___new___` and args directly, which bypasses the implicit-context path §9.13
   added to every other raise. So the chain was length **1**: the whole thing
   rendered as a single traceback. This is the actual bug, and it is a
   one-line fix — `re ___applyImplicitContext___` before the `resignalAs:`.
   With it, the chain is as long as the recursion (measured: 6645 links under the
   suite's stack settings).
3. **Only then does construction depth matter** — and, measured, *not* for this
   test. See below.

**The depth reached is a property of the gem, not of Grail**, which the fixture
has to respect. `sys.getrecursionlimit()` answers a fixed 1000 that has nothing to
do with the depth actually reachable; the real limit is wherever the Smalltalk
stack runs out, and the gem's configuration moves it:

| gem config | Python levels reached | chain links |
|---|---|---|
| `run_tests.sh` (default stack depth) | 187 | 188 |
| `run_cpython_suite.sh` (`GEM_MAX_SMALLTALK_STACK_DEPTH=80000`) | 6645 | 6645 |
| CPython 3.14.6 | 998 | 999 |

So `tests/python/recursion_chain.py` asserts **relations** — one chain link per
level, one rendered block per link — rather than counts. That is stricter than
CPython's own test (which uses loose `> recursionlimit * 0.5` thresholds) and it
holds unchanged across both gem configurations and under real CPython.

One thing the fixture has to do to be *stable*, found the hard way: **drive the
runaway once and memoize it.** GemStone runs an `on:do:` handler at the signal
point, before unwinding, so the Python `except RecursionError` that catches the
converted notification executes in whatever reserve is left past the
`AlmostOutOfStack` threshold. That works — but it is a margin, and spending it
once per check meant the outcome depended on how deep the *caller* already was:
with five excursions the checks passed under SUnit on 4.0 and escaped as an
uncaught `RecursionError` on 3.7.5 at a slightly different frame budget. One
excursion, memoized, passes on both stones under both gem configurations, and runs
about 4× faster. A test whose result depends on a few frames of caller depth is
not measuring what it claims to.

**The queue conversion: real, but not what fixed this.** `TracebackException`
captured the chain by recursing once per link. Converting it to CPython's explicit
queue (only the top-level construction expands; a nested one receives `_seen` and
builds just itself) was §9.13's predicted fix. Measured, the recursive version
handled the full 6645-link chain fine, in the same time — so it is *not* what
makes this test's chain renderable, and saying otherwise would be inventing a
result.

What the queue does buy is reachable a different way. `__context__` is a
**writable** attribute in CPython and in Grail, so a loop can build a chain of any
length with no stack cost at all — bounded by memory, not by the recursion that
would normally produce it. There the recursive version breaks:

| loop-built chain | recursive | queue |
|---|---|---|
| 13 000 links | builds | builds |
| 16 000 links | `RecursionError` **while reporting a `RecursionError`** | builds |
| 20 000 links | `RecursionError` | builds, 39 999 lines |

Raising `RecursionError` from inside the reporting machinery is the one place that
error is useless, so the conversion is worth keeping on its own merits — stated as
what it is, robustness, not a fix.

**The cycle guard went from O(n²) to O(n).** Both walks (`_chain_of` over live
exceptions, `_seen` during construction) guarded by scanning a *list* by identity —
deliberately, since an exception may define `__eq__`, and `test_unhashable` builds
one with no `__hash__`. CPython avoids both problems by holding **`id()` values in
a set**, which Grail supports and which is immune to a pathological `__eq__`
because the members are integers. At 20 000 links: **33.2s → 11.8s**, and the gap
widens with length.

**Result: no change to the scoreboard.** `test_long_context_chain` still fails,
now on `AlmostOutOfMemory` — "session's temporary object memory is almost full" —
rather than on a wrong chain. The failure moved from wrong output to a resource
ceiling; the behaviour under it is right, and that is worth separating from a pass.

> Corrected in §9.15: the explanation offered here — that what is exhausted is the
> *accumulated* temp memory of a session that has already run the module's other
> 369 tests — is wrong. It rested on the chain building fine in an isolated probe,
> but that probe ran with raise-time stack capture OFF, which is the whole cost.
> Tripling `GEM_TEMPOBJ_CACHE_SIZE` disproves the accumulation story outright.

Sizing that footprint is the open item — §9.15 takes it up, and both guesses in
this paragraph turned out to be wrong.

**Found, not fixed:** `1/0` reports `integer division or modulo by zero` where
CPython 3.14 says `division by zero` (it reserves the former for `//` and `%`).
Unrelated to chaining, and changing a built-in's message text can move other
modules' expectations, so it is recorded here rather than bundled in.

### 9.15 Releasing the raise-time capture (2026-08-12, gs40)

`test_long_context_chain` now passes. §9.14 left it failing on `AlmostOutOfMemory`
and named the wrong culprit twice; measuring properly found a single cause with a
one-line fix.

**Both of §9.14's guesses were wrong.** It suggested the exhausted memory was the
session's *accumulated* garbage from the module's other 369 tests, and that the
footprint to investigate was `FrameSummary` holding its own copy of each source
line where CPython shares them through `linecache`. Neither survived measurement:

* Tripling `GEM_TEMPOBJ_CACHE_SIZE` (500 000 → 1 500 000) changed nothing — the
  test still failed identically. Accumulation would have been relieved by that.
* `FrameSummary` already stores the string `linecache.getline` returns, so the
  lines *are* shared. Building the chain with `lookup_lines=False` did not reduce
  memory at all.

The reason §9.14's isolated probe seemed to show the chain building fine in ~10 MB
is that a bare `topaz` session has `#GemExceptionSignalCapturesStack` **off** —
`___ensureStackCapture___` enables it lazily, on the first traceback build. So the
probe measured the one configuration in which the problem does not exist. Enabling
capture explicitly reproduces it immediately, and not as a near miss:

| capture | 6645-level runaway |
|---|---|
| off | chain + build + format, ~10 MB |
| on, before this change | **fatal** "VM temporary object memory is full" |
| on, after this change | chain + build + format, ~62 MB peak |

**The cost is quadratic, and it is retention rather than allocation.** Primitive
2022 fills `_gsStack` with the *whole* Smalltalk stack at every raise. That is
what makes multi-frame tracebacks affordable in the first place — ~1.3 ns per
frame per raise and nothing per call (§9.2) — but the capture is only raw
material for building the traceback. Nothing dropped it afterwards. A recursion
that raises once per level captures O(depth) triples at level 1, at level 2, and
so on; while each exception stays reachable — which is exactly what a `__context__`
chain does — the retained total is **O(depth²)**. At 6645 levels of ~16 Smalltalk
frames each that is ~350 million triples, which no cache size accommodates.

**Where to release it is the whole question**, and the obvious answer is wrong.
Releasing when the traceback is first built fails: an exception's capture has to
outlive its first catch, because a bare re-raise rebuilds the traceback by walking
that *same* capture again with a wider trim (§9.10). The pass-through frames it
splices in are in the original capture — they were already on the stack when the
raise happened — and `pass` does not refill `_gsStack`, so a cleared capture leaves
the rebuild with nothing. `testBareReraiseSplicesFrames` caught this on the first
try.

`___applyImplicitContext___` is the point where the exception is provably spent: we
are raising from inside its handler, so its traceback is built and it is no longer
propagating. One line there — `current ___releaseCapturedStack___` — turns O(depth²)
retention into O(depth).

**A vacuous test, caught before it shipped.** The obvious regression test — assert
`_gsStack` is nil on a context link — passed with the fix *removed*. In a fresh
session the first raise happens before any traceback build, so capture is still off
and the slot is nil for an unrelated reason. The test now calls
`___ensureStackCapture___` first, and without that line it proves nothing. Worth
recording because a test that cannot fail is worse than no test: it reads as
coverage.

**Result: `test.test_traceback` 63 → 64 passing, errors 24 → 23**, identical on
3.7.5 and 4.0. SUnit 4073 → 4074, all passing on both stones. Full 50-module
conformance run changes exactly one row, the expected one.

This also lifts a quadratic memory cost off *every* long chain, not just this
test's — any application that wraps errors repeatedly in a loop was paying it.

### 9.16 "Did you mean: 'x'?" on an AttributeError (2026-08-12, gs40)

CPython appends a suggestion to an `AttributeError` / `NameError` / `ImportError`
whose misspelled name is close to a real one. `test_traceback` has 20 tests for
it. This section covers the AttributeError half; the other two need things Grail
does not have yet, recorded at the end.

**Three separate gaps had to close before a suggestion was computable at all**,
and none of them is the algorithm:

1. **`dir(instance)` reported almost nothing useful.** `object>>__dir__` scanned
   env-1 *selectors*, which are methods. A class body's data attributes
   (`blech = None`) compile to accessors on the METACLASS, so `dir(TheClass)`
   found them and `dir(instance)` did not; per-instance attributes live in
   dynamic instVars and were invisible to both. So `dir(A())` answered A's
   methods and nothing else — every candidate list was empty. It now unions the
   selector scan with what the class offers and with the instance's own
   `__dict__`, which is what CPython's `object.__dir__` is
   (`list(inst.__dict__) + dir(type(inst))`). Guarded to non-classes: for a class
   `self class` is its METAclass, and the selector scan already reaches the
   class's attributes through it.
2. **`AttributeError` carried no `name` / `obj`.** CPython has exposed both since
   3.10, and the suggestion needs both — `name` is the misspelling, `obj` supplies
   the candidates. Stored as dynamic instVars under their own Python names, the
   idiom `__notes__` already uses: `___pyAttrLoad___` probes dynamic instVars
   before the method chain, so `e.name` answers the value rather than a
   BoundMethod.
3. **A bare `raise AttributeError()` from a user `__getattr__` had nothing to go
   on.** CPython's `set_attribute_error_context()` stamps `name`/`obj` on an
   AttributeError escaping attribute access when the exception did not supply
   them. Grail now does the same, at both `__getattr__` dispatch sites (the `def`
   form and the class-attribute form), filling only what is missing — an
   AttributeError from a *nested* access already names its own object and that
   must win.

The algorithm itself is a faithful port of CPython's `_levenshtein_distance` /
`_compute_suggestion_error`, including the early bail (callers rely on
"> max_cost" meaning *no suggestion*) and the weighted substitution cost. It was
validated against CPython's own function on the exact strings the tests use, with
zero mismatches — worth doing, because the tests assert which candidate *wins*:
substitution over elimination over addition, and a case change over all three.

**A latent `_safe_string` bug surfaced.** Appending the suffix concatenates to the
message, and that turned a silent wrong-type into a `TypeError`: Grail's `str()`
on a class with `__str__ = None` returns None where CPython raises, so `msg` was
None and `None + suffix` blew up. `_safe_string` now guarantees a str, which is
what its contract always claimed. **Found, not fixed:** the underlying divergence
— `str(obj)` should raise `TypeError` when `__str__` is None.

**The scoreboard shows `test_set` going OK → ERROR, and that is an improvement.**
Grail's `TestLoader.getTestCaseNames` calls `dir()` on an INSTANCE
(`testCaseClass("setUp")`), where CPython calls it on the class. Widening instance
`dir()` therefore widened test discovery, and two tests that had **never run**
now do: `TestSetSubclassWithSlots.test_pickling` and its frozenset twin, which
`test_set.py` installs as class-body assignments
(`test_pickling = TestJointOps.test_pickling`) — exactly the class-attribute shape
instance `dir()` used to miss. Both fail with `object has no attribute 's'`.
The cause is NOT diagnosed: two plausible explanations were checked and both were
wrong (a `__slots__` class declaring `__dict__` does accept `self.s`, and a
class-body `setUp = Donor.setUp` does correctly shadow an inherited `setUp`). So
this is recorded as an open question rather than explained. The measurement got
more honest, and hiding it by narrowing `dir()` again would be the wrong trade.

**Result: `test.test_traceback` 64 → 68 passing** (failures 67 → 64, errors 23 →
22), with `test_set` 628 → 630 discovered and its 2 newly-run tests failing.
SUnit 4082 → 4083.

**Deliberately not done — `sys.stdlib_module_names` is empty**, so
`NameError: name 'io' is not defined` gets no "Did you forget to import 'io'?"
hint and two tests keep failing. Populating it is a genuine behavioural choice,
not an oversight: CPython's set is the names that are stdlib **for that version**,
and it deliberately includes modules unimportable on the running platform
(`winreg` on Linux). Grail ships 82 stdlib modules and has no `io` at all, so
copying CPython's ~310-name list would make Grail advise an import that then
fails, while listing only what Grail ships means those two tests fail honestly
because Grail's stdlib genuinely differs. Left unchanged pending that call.

**Still needing more than this section provides:** NameError suggestions want
`f_locals`/`f_globals` on PyFrame (also the last three assertions of
`test_getattr_suggestions_underscored`, which un-hide underscored candidates when
`self` in the frame IS the object); ImportError suggestions want `from X import Y`
to raise `ImportError` rather than `ModuleNotFoundError`;
`test_getattr_suggestions_with_custom___dir__` wants a metaclass `__dir__` to be
honoured for `dir(TheClass)`; and `test_getattr_suggestions_do_not_trigger_for_big_dicts`
hits GemStone's 255-dynamic-instVar ceiling.

### 9.17 A frame's globals, and NameError suggestions (2026-08-12, gs375)

§9.16 shipped the AttributeError half of CPython's suggestions and recorded that
the NameError half wanted frame namespaces. This adds `f_globals`, which gets the
global and builtin cases; the local case stays out of reach and is now pinned as
deliberate behaviour rather than an omission.

**`f_globals` is derived, not captured.** A traceback frame is reconstructed from
the VM's `(method, ip, receiver)` triples, so threading a namespace through the
capture walk would mean editing the most delicate code in the traceback path —
§9.10–§9.12 took three CI rounds to stabilise, every one of them a native-code
line-resolution surprise. The frame's `PyCode` already carries `co_filename`,
which identifies the module unambiguously (exactly one `sys.modules` entry has
that `__file__`), so `PyFrame>>f_globals` resolves the **live** `PyModuleDict` on
demand and answers None when the module cannot be identified. No change to the
walk at all.

The dynamic instVar had to stop being written when the caller passes None:
`___pyAttrLoad___` probes dynamic instVars *before* the method chain, so a stored
None would shadow the accessor and every frame would report None.

**No `f_builtins`, on purpose.** CPython's is the real builtins module dict.
Grail's builtins are *methods* on the builtins class, so there is no mapping to
hand back, and a dict built here would have to invent its values —
`builtins ___pyAttrLoad___: #str` deliberately answers something different from
what the bare name `str` resolves to (§ the handle-vs-class note in PyEnumTypes).
`dir(builtins)` lists exactly the 143 names a bare-name read *can* resolve, so
`traceback.py` takes the builtin candidates from there and the frame object stays
honest about what it has.

**Being more helpful than CPython is a conformance bug.** Two drafts got this
wrong in opposite directions, and the fixture caught both:

* The first sourced builtin candidates *regardless* of whether a frame was found,
  so Grail suggested `ZeroDivisionError` where CPython stays silent. CPython gates
  the whole NameError branch on having a frame.
* The fix for *that* then found no frame at all on the path the tests actually
  use, because `format_exception_only` has no traceback parameter — so the
  suggestion never appeared. Reaching for `value.__traceback__` inside it made the
  tests pass and reintroduced the first bug: `format_exception_only(exc)` offers no
  suggestion in CPython even for a misspelled builtin.

The resolution is a private `_tb` argument, passed only by the callers that
legitimately hold a traceback (`format_exception`, and
`TracebackException.format_exception_only` from its own `_tb`). `format_exception_only`
never sniffs the exception for one. `no_suggestion_without_a_traceback` in the
fixture is the check that keeps this honest, and it is the reason the fixture
asserts a *negative*.

**`f_locals` does not exist and cannot cheaply.** A Python function's locals are
Smalltalk method temporaries; the raise-time capture records only
`(method, ip, receiver)`, with no temps, so a misspelled LOCAL gets no suggestion
where CPython offers one. The fixture prints that difference rather than asserting
it, so it stays visible. Reading temps would need live `GsProcess` frame
introspection at raise time — a different mechanism from the capture, and a
separate piece of work.

**Result: `test.test_traceback` 68 → 70 passing** (failures 64 → 62), the two
being `test_name_error_suggestions_from_globals` and
`test_name_error_suggestions_from_builtins`. SUnit 4100 → 4101. Full 50-module run
moves only this row.

**Still open in this thread:** `test_name_error_suggestions` and
`test_name_error_with_instance` need `f_locals`; two more need the
`sys.stdlib_module_names` decision from §9.16; and
`test_name_error_suggestions_with_non_string_candidates` /
`..._when_builtins_is_module` fail earlier, on `AttributeError: PyModuleDict object
has no attribute 'copy'` — `globals().copy()` is unimplemented, which is unrelated
to suggestions and worth its own fix.

### 9.18 A module namespace you can copy, and a NameError that names itself (2026-08-12, gs40)

§9.17 left two suggestion tests failing on `AttributeError: PyModuleDict object has
no attribute 'copy'`, unrelated to suggestions. Fixing that exposed a second gap
behind it, and both are worth stating because each is a general bug rather than a
test-shaped one.

**`globals()` could not be copied.** CPython's `globals()` *is* a dict. Grail's is
a live view over the module (`PyModuleDict`), which is the right object — a write
through it must reach the module — but it was missing precisely the operations that
deliberately *do not* write through. `copy()` was absent, so the ordinary

```python
custom = globals().copy()
custom['k'] = v
eval(expr, custom)
```

idiom raised `AttributeError`. Returning another live view would have been worse
than the error: the mutations would land in the module, silently. `copy()` now
answers a plain `dict` snapshot, and `popitem` / `__or__` / `__ior__` are added
alongside it — the same family, missing for the same reason. `__ior__` *does* write
through, matching `update()`; `__or__` does not, matching CPython's dict.

`fromkeys` is deliberately left out: it is a dict *constructor* helper, not a
mapping operation on an instance, and its presence on a live view would mean
nothing.

**A NameError raised inside a function was anonymous.** §9.16 gave `NameError` a
`name` attribute and routed the module-global miss (`module>>___moduleAttrLoad___:`)
through it. But a bare-name miss compiled *inside a function body* is emitted by
`NameAst` codegen, which raised inline:

    NameError ___signal___: 'name ''x'' is not defined'

— message only, no attribute. So the very case a suggestion is most wanted for had
nothing to compute one from. The codegen now emits
`NameError @env0:___signalUndefined___: 'x'`, which builds the identical message
*and* sets `name`. The fixture asserts the message is unchanged, because adding an
attribute must not reword an error.

This is what makes `eval("ZeroDivisionErrrrr", custom_globals)` suggest
`ZeroDivisionError`: the frame and its `f_globals` were already right after §9.17,
and the only thing missing was the name to match against.

**Result: `test.test_traceback` 70 → 71 passing** (failures 62 → 61), the test being
`test_name_error_suggestions_from_builtins_when_builtins_is_module`. SUnit 4101 →
4102 before the new test, 4103 with it.

Worth being precise about what `copy()` alone bought: **nothing on the scoreboard.**
It cleared the `AttributeError` and both blocked tests then failed on their *next*
obstacle. One of them needed the codegen fix above; the other,
`test_name_error_suggestions_with_non_string_candidates`, wants a candidate from
`locals()` and so still needs `f_locals` (§9.17). A fix that moves no counter is
still a fix — `globals().copy()` is a common idiom that simply did not work — but it
would be misleading to bundle it with the number.

**Still open in this thread:** `f_locals` for local-name suggestions (2 tests, and a
prerequisite for `sys._getframe`); the `sys.stdlib_module_names` decision from §9.16
(2 tests); ImportError suggestions, which need `from X import Y` to raise
`ImportError` rather than `ModuleNotFoundError` (3 tests); and the 19 ExceptionGroup
tests, now the largest single bucket.

### 9.19 Import machinery: sys.path, from-import errors, and Symbol-keyed deletes (2026-08-13, gs40)

Chasing the three ImportError suggestion tests turned up three bugs, none of them
about tracebacks, and **none of them moved the scoreboard**. That is recorded here
plainly because the temptation is to report the fixes and let the reader assume a
gain that did not happen.

**`sys.path` was not consulted at all.** The resolver searched `grailDir`, the
bundled stdlib, and a Grail-specific `extraSearchRoots` list — reachable only from
code written *for* Grail. So `sys.path.append(d); import m` raised
`ModuleNotFoundError` however `d` was populated, which makes the single most common
way to extend the import path in Python a no-op. Both the `.py` and `.so` resolvers
now search `sys.path` as well, read live on each resolution since it is an ordinary
list a caller may append to or pop from.

It is searched **last**, a deliberate deviation from CPython, where `sys.path` *is*
the whole search path. Grail's ported stdlib has to win: a directory added to
`sys.path` must not be able to shadow Grail's own `os` or `traceback` with a
same-named file.

**`from PKG import missing` claimed the wrong thing.** It raised
`ModuleNotFoundError` naming `PKG.missing` as a missing *module*, where the module
was found and the *name* was not. CPython raises `ImportError`, `cannot import name
'x' from 'PKG' (path)`, carrying `name` / `name_from` / `path`. The old choice was
deliberate — a `ModuleNotFoundError` is an `ImportError` subclass, so
`try: from . import x except ImportError: pass` hooks worked — and `ImportError`
itself keeps those working, being the base class, while saying what actually
happened.

**Deleting a str key from a Symbol-keyed dictionary raised an uncatchable
Smalltalk error.** `includesKey:` compares by equality, so a Python str key is
*found*; `removeKey:` matches by identity, so it matched nothing and GemStone
signalled `LookupError` — not a Python exception, so not catchable from Python at
all. `sys.modules` is such a dictionary, so `del sys.modules[name]` and
`sys.modules.pop(name, None)` did this to every caller, including
`test.support.import_helper`'s `unload` / `forget` that every temp-module test uses
for cleanup. `__delitem__` / `pop` / `pop(k, default)` now resolve the key the
dictionary actually holds, via one shared `___removeStoredKey___`.

That third bug is why the first two showed *negative* progress at first: fixing the
import let those tests get as far as their cleanup, which then died on the delete.
Four tests went from failing to erroring before it was fixed — a reminder that a
fix which unblocks a code path is answerable for what the path then hits.

**Result: `test.test_traceback` unchanged at 71 passing** — verified by measuring
the module with these changes stashed and unstashed on the same extent, both
`failures=61 errors=22`. SUnit 4103 → 4117. Full 50-module run: no row moves.

**Why the suggestion tests still fail**, stated as an open question rather than a
theory, because two theories were checked and both were wrong. The tests now get a
real `ImportError` with `name_from` set, and the machinery that would compute a
suggestion from it is already in place, but the test's own
`except ImportError: raise e from None` does not appear to take the exception —
`self.fail("Expected ImportError but got <ImportError class object ...>")` fires
instead. It is *not* that `except ImportError` fails to match an ImportError
(checked directly: it matches, including one raised through `exec` and one from this
very from-import path), and it is *not* that `ModuleNotFoundError` is not a subclass
of `ImportError` (it is). Something about how the exception crosses `exec` inside
that test remains to be found.

### 9.20 Rendering an exception group as a tree (2026-08-13, gs40)

The largest single bucket left in `test.test_traceback`, and the first item in a
while that needed new machinery rather than gap-filling. A PEP 654 group is the
one exception that does not render as a block of text — its children are drawn
inside a box:

```
  + Exception Group Traceback (most recent call last):
  |   File "f.py", line 12, in f
  | ExceptionGroup: eg (2 sub-exceptions)
  +-+---------------- 1 ----------------
    | ValueError: first
    +---------------- 2 ----------------
    | ValueError: second
    +------------------------------------
```

Grail rendered the group's own line and stopped. The children were simply absent,
so a group reported strictly less than it already knew — the exceptions were
there, in `exc.exceptions`, unread.

**Three independent pieces were missing**, which is why this reads as one change
rather than three: none of them is useful alone.

**The nesting indent was two spaces, and cumulative.** `format_exception_only(eg,
show_group=True)` indents each level by *three*, measured from the absolute depth.
Grail used two, and got there by having each level prefix the level below — which
produces the same shape at one level of nesting and diverges at two. The depth is
not only a width: it also decides whether a multi-line *message* is split into
one string per line, which is what lets every line of it carry the indent. The
group's own message is deliberately not split, so
`test_format_exception_group_multiline_messages` asserts both halves at once —
`'ExceptionGroup: A\n1 (1 sub-exception)\n'` stays whole while the nested
`ValueError('B\n2')` becomes `'   ValueError: B\n', '   2\n'`. Ten of CPython's
group tests differ from the old output in nothing but this indent.

**`TracebackException.exceptions` did not exist.** A list of `TracebackException`
for a group, `None` for anything else — `None` and not an empty list, because
`format()` tests it to choose between a plain traceback and a tree, and an empty
group is a real thing that draws a (correct, different) empty box. Without it
nothing downstream could draw a tree even in principle, and `max_group_width` /
`max_group_depth` were accepted and then discarded. The children go on the same
breadth-first queue §9.14 built for the cause/context chain, for the same reason:
group nesting is unbounded, so recursing per level would put back the stack-depth
ceiling that queue exists to remove. Unlike cause/context they are *not*
deduplicated against `_seen` — the same exception may legitimately appear in two
groups, and CPython renders it in both.

**The margin is positional state, so `format_exception` had to hand groups over.**
The `|` and `+-+---- 1 ----` are drawn from a depth counter plus a "this level
still owes a closing rule" flag, shared across the *whole* chain (CPython keeps
both in a private `_ExceptionPrintContext`; Grail now has the same class, and
`format()` threads it through a private `_ctx`). The module-level
`format_exception` renders a chain link by link and has nowhere to keep that, so
it now delegates to `TracebackException` when a group appears anywhere in the
chain. Deliberately *only* then: CPython routes every exception through
`TracebackException`, and moving Grail wholesale would re-route the rendering of
every exception in the language to gain the groups.

**The port was checked against CPython before it was checked against Grail.**
`src/python/stdlib/traceback.py` is pure Python, so it imports under CPython 3.14.6
directly, and its output can be diffed against the real `traceback` module for the
same exception. Every group shape came out byte-identical — the only differences
in the whole comparison were the caret lines (`~^^`) under the failing expression,
which is an unrelated pre-existing gap. That is a much tighter loop than an
install-and-sweep per iteration, and worth reaching for whenever the change is
confined to a ported stdlib module.

**It still cost a test, and only measuring found it.** `nesting_indent` started out
called `indent` — and the SyntaxError branch of the same function already binds
`indent`, to a *width*: how much whitespace `strip()` removed from the source line,
needed to place the caret. The width overwrote the string, so every SyntaxError
whose text was indented rendered as `int + str`. It turned
`test_syntax_error_various_offsets` (whose `add=2` arm supplies exactly that) from
a failure into an error.

The CPython-side comparison did not catch it, because the one SyntaxError in that
probe had `offset=None` and never entered the branch that rebinds the name. What
caught it was diffing the *named* failing and erroring tests before and against
after, rather than the totals: errors went 22 → 23 while failures dropped 61 → 45,
and a net gain of fifteen would have hidden it completely. The fixture now carries
a check for a top-level indented SyntaxError — asserted as a shape, since the
caret-run gap means Grail and CPython genuinely differ on those bytes, and pinning
CPython's would assert the gap instead of the crash.

**Result: `test.test_traceback` 71 → 86 passing** (failures 61 → 46, errors
unchanged at 22), verified by name: fifteen tests fixed, no test newly failing or
newly erroring. SUnit 4125, all green. Full 50-module sweep: no other row moves.

Two group tests remain, both blocked on things that are not about groups:
`test_exception_group_format` and `test_exception_group_format_exception_onlyi_recursive`
need `1/0` to say `division by zero` where Grail says `integer division or modulo
by zero` (the Smalltalk message), and the first also needs the caret lines.
`TestTracebackException_ExceptionGroups.test_comparison` fails on an uncatchable
`cannot find handler frame for exception` when a group is re-raised five times —
unchanged by this work, and unexplained.

Next, in the order I would take them: the `ZeroDivisionError` wording, which is
small and now blocks named tests rather than being a curiosity; `f_locals` via live
`GsProcess` introspection (2 tests, plus `sys._getframe`'s 4); the three
ImportError suggestion tests whose blocker §9.19 left as an open question; and the
`sys.stdlib_module_names` decision from §9.16, which is still the user's to make.

### 9.21 Division by zero: the message, and three cases that never raised (2026-08-13, gs40)

§9.20 named this as next because it blocked two *group* tests, and it is otherwise
not a traceback topic at all. It began as a wording fix and turned out to be four
bugs — the guards were written per operator, so each was wrong in a way the others
hid.

**The wording.** CPython used to distinguish the operators — `integer division or
modulo by zero`, `float division by zero`, `float floor division by zero`, `float
modulo` — and **3.14 collapsed every one of them into `division by zero`**. Grail
still said the 3.13 text. Separately `0 ** -1` says `zero to a negative power`,
where Grail said `0.0 cannot be raised to a negative power`, a wording no recent
CPython has used.

**Float division did not raise at all.** `1.0 / 0` answered `inf` and `1.0 % 0`
answered `nan`: `float.__truediv__` and `float.__mod__` had no guard, and
`float.__divmod__` had neither a guard nor a type check. IEEE 754 says those are
the correct values and GemStone obliges — Python's `/` is not IEEE division, and
checks the divisor first. A silently wrong number is worse than a wrong message.

**`False` was not recognised as a zero.** A Python bool *is* an int, so `1 //
False` is division by zero. Grail represents `False` as the Smalltalk `false`,
whose class is `Boolean` and **not** a `Number`, so every guard shaped `(other
isKindOf: Number) and: [other = 0]` short-circuited on the *first* clause and
never looked at the value — even though the second clause would have answered true
(`false = 0` is true in GemStone). `1 // False`, `1 % False` and `divmod(1,
False)` then reached the kernel and raised GemStone's `ZeroDivide`: error 2026,
not a Python exception, and so uncatchable from Python at all. `1 / False` took
another route and answered `OverflowError`, claiming the quotient was too large
for a float — an answer about the quotient's size for a divisor that is zero.

**A complex zero was not recognised either.** `(1+2j) / 0` answered `(nan-nanj)`.
Both operand orders are guarded now, so `1 / 0j` raises too.

The zero *test* is one method, `ZeroDivisionError class >> ___isZeroDivisor___:`.
It tests the **type**, not just `= 0`: a user class whose `__eq__` claims equality
with zero is not a zero *divisor* and still gets its `__rtruediv__`. That is a
deliberate limit rather than an oversight, so the fixture checks it.

**There is deliberately no helper that both tests and raises**, though it would
read better at the seventeen call sites. Wrapping the raise puts one more frame
underneath `___signal___:`, and that frame *persists* while the exception is
handled — a Smalltalk handler block runs on top of the signalling stack. For the
classic runaway

```python
def f():
    try: 1/0
    except ZeroDivisionError: f()
```

that is one extra frame per level of recursion, and it moved where the gem runs
out of stack: `AlmostOutOfStack` began arriving inside
`PyLazyExceptSelector >> handles:`, while the handler search was deciding whether
`except ZeroDivisionError` matched. `___recursionGuard___` cannot convert that as
cleanly, and `testRecursionContextChain` went from passing to erroring with
`RecursionError` escaping the test. So the call sites test with a helper whose
frame is popped before anything is signalled, then send `___signal___:` from the
operator's own frame exactly as they did before. The message literal is repeated
as a result — the intended trade, since what the bugs were about was the test.

**A fixture had been pinning Grail's own bug.**
`tests/python/exec_class_definition.py` asserted `ZeroDivisionError: integer
division or modulo by zero`, and that check was **false when run under real
CPython** — which is the whole point of these fixtures being standalone-runnable.
It passes under CPython now for the first time. Worth remembering that a fixture
verified against CPython *at the time it was written* can rot when the expectation
was wrong to begin with.

**Result: `test.test_traceback` 86 → 88 passing** (failures 46 → 44), the two
tests §9.20 predicted: `test_exception_group_format_exception_onlyi_recursive` and
`test_format_exception_group_with_tracebacks`. `check_cpython_regressions.sh`: **0
regressions, 1 improvement**. SUnit 4149, all green.

`test_exception_group_format` still fails, now on the caret lines alone — the last
of §9.20's three blockers, and the one that needs real PEP 657 anchor work rather
than a message change.

### 9.22 A live stack: sys._getframe, and why it raises to read one (2026-08-13, gs40)

Every frame Grail had until now came from an **exception**: §9.9's machinery
reconstructs frames from the VM's raise-time capture. `sys._getframe` asks a
different question — what is on the stack *right now*, with nothing raised — and
it did not exist. So `traceback.walk_stack` answered an empty iterator, and
`print_stack` / `format_stack` / `extract_stack` all reported nothing at all,
each with a comment saying an empty answer was the honest one. It was, until it
wasn't.

**A running gem cannot read its own stack the obvious way.** `GsProcess` is the
natural place to look, and it is a dead end: `GsProcess current` inside running
code answers `stackDepth` **0** and `_frameContentsAt:` **nil** for every level —
that API reads a *suspended* process, one stopped at a breakpoint. Measured
before designing anything, which saved building on it.

What does work is the mechanism already in use: `#GemExceptionSignalCapturesStack`
fills `_gsStack` with `(method, ip, receiver)` triples for the whole live stack at
the moment of a raise. So `___liveFrameChain___` **signals a throwaway `Error` and
catches it in the same expression**, purely for the capture. `ex return: ex`
unwinds without letting it reach any outer handler — notably not a Python
`except`. CPython's `_getframe` is free; Grail's costs a raise, which §9.2 already
measures at ~1.3 ns per frame.

It deliberately does **not** reuse `___buildFramesFromCapturedStack___`. That walk
answers a *traceback* — the path from raise to catch — so it trims at the catching
function, which is exactly the frame a live walk needs to continue past. The block
merging rule is repeated rather than shared, because the two walks agree on
little else.

**Env 1 plus a decodable selector does not mean "Python frame".** The first
working version reported `['perform', 'value', 'leaf', 'mid', 'top', 'probe']` —
Grail compiles its own runtime helpers into env 1 too, and `Object >> perform:` /
`ExecBlock >> value` decode, quite reasonably, to `perform` and `value`. The fix
is a better question: does the frame have a **derivable Python line**? Only
generated Python code carries the `___curPos___ := N` literals that
`___pythonLineForMethod___:` reads, so a nil line *is* the signal that a frame
belongs to the machinery rather than to the program. That also means the line is
computed once, in the filter, and carried.

Filenames are per frame here, unlike a traceback's. A traceback takes one
filename from the catching function's PyCode — fine when a traceback stays in one
module, wrong in general — and a live walk crosses modules routinely. A generated
function's defining class **is** its module (`meth inClass name`), so the module's
own `__file__` is one `sys.modules` lookup away.

**CI found a bug local runs structurally cannot.** The first version used
"can a Python line be derived at this ip?" as the test for *is this a Python
frame*, which conflates two questions. §9.10 records that ip → line derivation
**fails closed** — a frame suspended inside a protected block resolves to
nothing — and native ips differ from bytecode ips. Native code is on in CI and
*unavailable on macOS/arm64*, so locally every frame resolved and the filter
looked right; on CI legitimate frames were silently **dropped from the walk**
rather than merely losing a line number. `format_stack` then skipped one level too
far, because it identified its own frame to exclude by *position* — "drop the
innermost, it's mine" — and the frame it dropped was the caller's.

Both halves are fixed by asking better questions. Is this Python code? Ask the
method's **source** for the `___curPos___` literal codegen emits, which no ip can
affect (cached per method, like the line cache). Which frames are the traceback
module's own? Identify them by **file**, which cannot miscount however many
survive. A nil line now costs a frame its line number, not its existence.

**The native-code attribution is measured, not assumed.** With `gs375` available
locally the two candidate variables separate cleanly: the *original* ip-based
filter was reinstalled on 3.7.5 on this machine and **passed** the whole fixture,
so the GemStone version is not the variable — leaving
`GemNativeCodeEnabled`, which is 2 on CI's Linux x86_64 and unavailable on
macOS/arm64, exactly as §9.10's table records. The current code was then verified
on 3.7.5 too: SUnit 4156 all green and `test_traceback` identical to 4.0 at
47 failures / 17 errors / 217 skipped.

**Two limits, asserted rather than left to be discovered.** `f_locals` does not
exist and is not faked: a Python function's locals are Smalltalk method *temps*,
and the capture holds neither their values nor their names, so an empty dict would
let a caller believe a frame had no variables. And a **nested function gets no
frame of its own** — Grail compiles a nested `def` into its enclosing method — which
is pre-existing and is precisely why `test_walk_stack` and
`test_walk_innermost_frame` still fail: both assert that a nested call adds
exactly one frame.

**Result: `test.test_traceback` 88 → 89 passing**, two tests fixed by name
(`TestTracebackFormat.test_stack_format` and
`CExcReportingTests.test_KeyboardInterrupt_at_first_line_of_frame`) with **no test
newly failing or erroring**, and three more moved from *error* to *failure* —
they now run and disagree, instead of dying on a missing attribute. SUnit 4149 all
green; full sweep 0 regressions, 1 improvement.

**One number is unexplained**, recorded rather than smoothed over: `skipped` went
216 → 217, so a test that previously passed now skips, which is why two fixes net
+1.  (Measured twice, against two different bases — before and after #351 merged —
with the same 2-fixed / 1-newly-skipped shape both times, so it is a property of
this change rather than of the base.) It cannot be attributed with the current harness — `run_one_cpython_module.gs`
emits a line per test and a detail line only for failures and errors, so a skipped
test is indistinguishable from a passing one in the log, and `test_traceback` has
no static `@skipIf` to inspect. Attributing it needs the harness to record skip
names, which is a harness change and not this one.

`f_locals` remains the blocker for `MiscTracebackCases.test_clear`, and it is not
a matter of effort: the capture records `(method, ip, receiver)`, so a frame's
temps are genuinely absent from it. Reaching them would need either a codegen
change (record each function's local names, and read the temps some other way) or
VM support — a much larger piece than this one, and worth its own investigation
rather than an incremental attempt.

### 9.23 An except handler's raise is caught by its sibling (2026-08-13, gs40) — diagnosed here, **fixed in §9.24**

**The bug.** In Grail, an exception raised inside an `except` handler is caught by
a *later* `except` clause of the same `try`. CPython propagates it out of the whole
statement — the except clauses are alternatives for the try **body** only.

```python
try:
    raise ValueError('original')
except ValueError:
    raise RuntimeError('from handler')   # must leave the try
except Exception:
    return 'this must not run'           # Grail runs this
```

The cause is the emitted shape. Handlers compile to nested protected blocks:

```
[[ body ] on: T1 do: [H1] ] on: T2 do: [H2]
```

so H1's *body* runs inside H2's protected block, and H2 catches whatever H1 raises.
**Every handler but the last is exposed to every handler after it.** That silently
breaks the commonest narrowing idiom in the language, and it is not a traceback
issue at all — it is core control flow.

`tests/python/handler_raise.py` is the reproduction: 18 checks, all passing under
real CPython 3.14.6, **7 failing in Grail**. It is committed and standalone-runnable
but deliberately *not* wired into SUnit, since it would fail the suite.

**This is also the answer to §9.19's open question.** The import-suggestion tests do
`except ImportError as e: raise e from None` with an `except Exception` after it, and
got their own re-raise back in the second handler — reported as the baffling
`Expected ImportError but got <ImportError class object>`. Three theories in §9.19
were checked and all three were wrong (ImportError matching, the `exec` boundary,
`ModuleNotFoundError`'s hierarchy). The fault was in `try/except` codegen and had
nothing to do with imports. Instrumenting the failing test, rather than reasoning
about it, is what found this in minutes.

**Two designs were built and measured; each has a real defect.** Recorded because
the defects are the useful part — both look obviously correct until run.

*1. Record which handler matched; run its body after the `on:do:`.*

```
[ | sel exc | sel := 0.
  [[ body ] on: T1 do: [:ex | sel := 1. exc := ex. nil] ] on: T2 do: [:ex | sel := 2. ...].
  sel = 1 ifTrue: [ <H1 body> ].  sel = 2 ifTrue: [ <H2 body> ] ] value
```

Semantically exact, and it **breaks `raise`**. Once a handler's `on:do:` has
unwound, GemStone will not signal that exception again: `UncontinuableError` 6011,
*Exception has already been signaled*. A bare `raise` inside a handler therefore
becomes impossible — `___ex pass` needs an active handler context, `___ex signal`
and `___pyRaise___:` both hit 6011. Found by `test_listcomps`'
`test_comp_in_try_except` (a comprehension raising `ValueError` under
`except ValueError: ... raise`), not by the fixture, whose re-raise cases happened
to sit in a shape that survived.

*2. Keep the nesting; shield the later selectors.* A flag in a block enclosing the
statement, set while any handler body runs; `PyLazyExceptSelector` answers
`handles: false` while it is set. This **works** — all 18 fixture checks pass,
`test_traceback` 46 → 44 failures, `test_listcomps` unchanged — but it wraps every
`try` in one extra block, and that costs stack depth: `test_richcmp`'s
`MiscTest.test_recursion` goes from OK to `RecursionError`. A previously-green
module regressing is not a trade worth making, and it is the same lesson §9.21
recorded about the division guard — a frame added per level of recursion is not free.

**The design that avoids both**, for whoever takes this next: give each `try`
statement its own flag in a **method temp**, declared by `FunctionDefAst` (one per
`try` in the body, e.g. `___tryInH_1`, `___tryInH_2`). Method temps are per
*activation*, which is the granularity the flag needs, and they cost no stack
frame. A single shared counter will not do — an inner `try`'s handlers must still
catch exceptions from the inner body while an outer handler is running, so the
state has to be per-`try`, not per-function. Module-level `try` (no method temps)
needs a separate route.

**Found along the way, unrelated and unfixed:** `str(KeyError('x'))` is `'x'` in
Grail and `"'x'"` in CPython — KeyError's `__str__` is the *repr* of its argument.
The fixture uses `RuntimeError` throughout to avoid entangling the two.

### 9.24 Shielding a sibling handler with a depth, not a flag (2026-08-13, gs40)

§9.23's bug, fixed: an exception raised inside an `except` handler no longer
reaches a later `except` clause of the same `try`.

The two designs §9.23 rejected both failed on something structural, and the fix
came from taking their failures seriously rather than trying harder at either.

- *Bodies outside the `on:do:`* died because **GemStone will not signal an
  exception whose handler has unwound** (`UncontinuableError` 6011), so a bare
  `raise` became impossible.  Constraint learned: **the handler body has to stay
  inside its own protected block.**
- *A flag in a block enclosing the `try`* died because that block is **a stack
  frame per `try`**, and `test_richcmp`'s `test_recursion` sits close enough to
  the ceiling to notice.  Constraint learned: **no new frame, and no new
  per-activation temp either** (a temp needs a scope to live in).

Both constraints are satisfied by putting the state in the **selector**, which is
already constructed once per `on:do:` install — i.e. once per activation — and
costs nothing extra:

```smalltalk
PyLazyExceptSelector on: [ ...type... ] shieldedAbove: (BaseException ___handlerDepth___)
```

`___handlerDepth___` is a session count of how many handler *bodies* are running;
each body brackets itself with `___enterHandler___` / `___exitHandler___` through
the `ensure:` that already restores `sys.exc_info()`, so a `return` / `break` /
`continue` or a re-raise still unwinds the count.  A selector handles nothing once
the depth has risen **above the value it recorded when it was installed**.

**A depth rather than a flag is the whole trick**, and the case that proves it is
a `try` nested inside a handler:

| moment | depth | O1 (base 0) | O2 (base 0) | I1 (base 1) | I2 (base 1) |
|---|---:|---|---|---|---|
| O's body raises | 0 | **matches** | — | — | — |
| inside O1, I's body raises | 1 | — | — | **matches** | — |
| inside I1, X raised | 2 | — | shielded | — | shielded |
| back in O1, Y raised | 1 | — | shielded | — | — |

A single shared flag or counter gets the second row wrong — it would shield `I1`
from its own body's exception.  Capturing the baseline at install time is what
distinguishes "a handler of *this* `try` is running" from "we happen to be
somewhere under some handler".

Only handlers **after the first** are shielded, because the nesting puts each
handler's `do:` block outside the `on:do:` of every *earlier* handler — the first
handler is never in a position to catch what a later one raises.  A bare
`except:` compiles to the class directly, so it has to be wrapped in a
`PyLazyExceptSelector` to carry a shield at all; appending `shieldedBy:` to the
bare class instead produced the three-keyword `on:shieldedBy:do:`, which nothing
implements, and `test_format` found it as an MNU on `ExecBlock`.

**Result.** `tests/python/handler_raise.py` — 18 checks, all passing under real
CPython 3.14.6 — passes in full, and is now wired into SUnit rather than sitting
as a known-failing file. `test.test_traceback` **89 → 91 passing** (failures 46 →
44). Tier 2, since this is codegen every `try` in the language goes through: full
sweep with **0 regressions, 1 improvement**, and specifically `test_richcmp` and
`test_format` back to OK and `test_listcomps` unmoved — the three modules the
earlier designs broke. SUnit 4176, all green.

Still open from §9.23, unrelated: `str(KeyError('x'))` is `'x'` in Grail and
`"'x'"` in CPython, because KeyError's `__str__` is the *repr* of its argument.
The fixture uses `RuntimeError` so the two stay separate. **Closed in §9.25.**

### 9.25 KeyError's message quotes its key (2026-08-13, gs40)

Closes the loose end §9.24 recorded. `str(KeyError(k))` is `repr(k)`, not `str(k)`
— KeyError is the one built-in exception whose message shows its argument's repr,
and it is deliberate: a missing key is usually a string, so `KeyError: missing`
reads as prose where `KeyError: 'missing'` shows the value actually looked up. It
also tells `KeyError('')` apart from `KeyError()`.

Grail inherited `BaseException >> __str__`, so every KeyError message was
unquoted. The rule is uniform for a single argument rather than special-cased for
strings — `KeyError(1)` → `1`, `KeyError(None)` → `None`, `KeyError(('t', 1))` →
`('t', 1)` — and for no arguments or several, CPython falls straight back to
`BaseException_str`, so `KeyError >> __str__` sends `super __str__` rather than
reimplementing the empty and tuple cases.

**It reaches further than it looks.** `traceback.py` renders an exception through
`str()`, so this changes the last line of every traceback ending in a KeyError.
That is the point, and it is also why five of Grail's own tests failed on the
first run — all five had encoded the unquoted form.

**Three of the five were the interesting kind.** `KeyError ___signal___: key
printString` appeared at five raise sites (`PyInstanceDict`, `PyModuleDict`,
`PyEnumTypes`) — a hand-rolled *workaround* for the missing repr rule, quoting the
key at the raise instead of in `__str__`. With the real rule in place those
double-quoted (`KeyError: "'k'"`), which is how they were found. They now pass the
raw key, as `dict.gs` and `gemstone.gs` always did. The `popitem(): dictionary is
empty` sites needed no change: CPython quotes that message too, since it is just
a one-argument KeyError like any other.

**And a fixture was pinning the bug again.** `tests/python/exception_naming.py`
asserted `KeyError: x` in a loop over builtin exception classes, which made that
check **false under real CPython** — the third time this session a
standalone-runnable fixture turned out to encode Grail's behaviour rather than
CPython's (after `exec_class_definition.py` in §9.21 and the `handler_raise.py`
near-miss in §9.23). Worth stating as a pattern: *a fixture is only verified
against CPython if someone actually ran it there*, and the ones that predate that
habit are where these hide.

**Result.** `tests/python/keyerror_str.py` — 13 checks, all green under real
CPython 3.14.6 — passes in full. SUnit **4202, all green** (five stale assertions
corrected). Full 71-module sweep: **0 regressions**, and no row moves — this is
correctness the scoreboard cannot see, which is the honest way to report it.

### 9.26 Three small conformance gaps, and a scoping result on carets (2026-08-13, gs40) — caret scoping refined in **§9.32**

**Carets are not the next thing, and now there is a reason on record.** §9.20/§9.24
listed PEP 657 caret rendering as the largest remaining bucket (8 tests), and the
plan looked cheap: `___pyPositionLiteralArray` already emits a full
`#(line col endLine endColno sourceLine)` literal, and `___pushFrameFromPos___`
already accepts it. Measuring CPython first killed the plan:

```
x = foo(bar()) + 1
        ~~~^^
```

CPython's carets are **per-instruction** — they underline the *failing
sub-expression*, not the statement. Grail's `___curPos___` is per-**statement** by
design, so feeding it to the caret renderer would underline the whole line
whenever a statement contains more than one call: confidently wrong output, which
§9.10 already argues is worse than none. Real carets need a position store per
*call site*, which changes both the cost of `___curPos___` and the meaning the
§9.10 machinery depends on. That is a project, not an increment.

**Nested-function frames are likewise deeper than they look.** A nested `def`
compiles to an ExecBlock, and the raise-time capture records `(method, ip,
receiver)` — so every closure of the same nested function shares one `GsNMethod`
and there is no per-closure identity in the capture to name a frame by. Giving
them frames means compiling nested defs to real methods, which is where closure
semantics live.

**What shipped instead: three small gaps, all in traceback.py.**

`print_exception(42)` is a `TypeError` — *Exception expected for value, int found*
— not a render of `int: 42`. Grail rendered it and then failed writing to a file
it had not been given, so the error a caller saw was an `AttributeError` on None.
Only the **one-argument** form is guarded: the legacy three-argument form fails
under CPython too, but with whatever the value happens to raise, and tightening it
would break Grail callers that pass a type and a message.

`FrameSummary._lines` is CPython 3.14's slot name for a frame's cached source
text, and it stays None while `lookup_line=False`. Grail called it `_line`.

A SyntaxError's location fields are a plain writable tuple, so any of them can be
any object — `SyntaxError('error', 'abcd')` gives `lineno='b'`, `offset='c'`,
`text='d'` (gh-128894). Rendering must not raise; Grail called `int()` on the
offset and died with `ValueError`. The rules were **measured**, because one is
counter-intuitive:

| condition | result |
|---|---|
| `text` not a str | no source block at all |
| `offset` None | source line, no caret |
| `offset` an int | source line + caret |
| `offset` present, not an int | **no source block at all** |

An unusable offset suppresses the source *line* too, not just the caret. `lineno`
needs no check — it is only ever printed, so `line b` is what CPython shows.

**And a fourth fixture was pinning Grail's own name.**
`tests/python/code_filename.py` read `FrameSummary._line`, which does not exist in
CPython — so that check did not merely disagree there, it **raised
AttributeError**. After §9.21's `exec_class_definition.py`, §9.25's
`exception_naming.py`, and the `handler_raise.py` near-miss, that is four. The
common factor is not carelessness about expectations; it is that these fixtures
are *driven from Smalltalk* and only 16 of the 253 have a `__main__` block, so
most have never been executed under CPython at all. A guard is possible but not
free: the other 237 legitimately test Grail-specific behaviour and would fail
there by design.

**Result: `test.test_traceback` 92 → 95 passing** (errors 17 → 14), the three
tests named above, verified by name with nothing newly failing. SUnit **4224, all
green**. Full 71-module sweep: **0 regressions, 1 improvement**.

### 9.27 A gate for the fixtures, and an honest measure of its reach (2026-08-13, gs40)

§9.26 ended by proposing a CI guard that runs the self-running fixtures under
CPython, on the strength of four fixtures that had pinned Grail's behaviour
instead of CPython's. Building it started with checking that premise, and the
check embarrassed it:

**Three of those four bugs are in files the guard cannot see.**
`exec_class_definition.py`, `exception_naming.py` and `code_filename.py` have no
`__main__` block. Only the `handler_raise.py` near-miss was in a self-running
file — and that one was caught by hand at the time. So the guard, as motivated,
would have caught **none** of the bugs used to justify it. That does not make it
worthless, but it does move the value: it holds a line for fixtures that have
opted in, and makes opting in cheap for new ones. It is not evidence that the
corpus agrees with CPython, and §9.26's framing should be read with that
correction.

A census of all 258 fixtures under CPython 3.14.6, each in its own subprocess:

| | files | |
| --- | --- | --- |
| no zero-argument checks | 116 | return values for the harness to compare, not booleans |
| some check differs | 93 | mostly helpers my probe called as if they were checks |
| all checks answer True | 32 | already CPython-clean; **16 are not yet self-running** |
| fails to import | 16 | several deliberately |
| hangs | 1 | |

The 93 are largely a probe artefact: with no `checks` list to read, "every public
zero-argument function" also collects helpers like `leaf` and `runaway` that
raise *by design*. That is precisely why the gate reads an explicit `__main__`
block rather than introspecting — **a fixture must declare what its checks are**.
The interesting number is the 32: those already agree with CPython, and 16 of
them could opt in for the cost of a `__main__` block.

**The count is 15, not 16.** `module_higher_arity_def.py` matches a naive grep
for `if __name__ == '__main__':` but the string is *inside a function* — it
checks that the idiom is False on import. Running it as a script would falsify
its own subject: its other checks assert
`__name__ == 'module_higher_arity_def'`. The gate anchors the pattern at column
zero, so the file excludes itself.

**Two traps, both of which look like a passing run**, are pinned by
`tests/scripts/test_python_fixture_gate.sh`:

* `live_frames.py` prints a separator line containing the word "FAIL". A
  grep-based gate fails on a clean tree, so the status word is read from the
  first or second whitespace field instead. Its two Grail-limitation checks now
  print `XFAIL`; `XPASS` fails the gate, since a limitation that has quietly
  gone away means the check is stale.
* A fixture whose `__main__` block prints nothing would otherwise pass by
  vacuity, so zero recognised result lines is an error.

The self-test was **mutation-tested** rather than merely run: reverting the gate
to grep-based status detection, unanchoring the `__main__` pattern, and deleting
the no-results check each turn it red (2, 1 and 1 assertions respectively). A
gate self-test that cannot fail is worse than none, because it certifies the
thing it does not check.

**A side finding, not fixed here.** `cached_property_descriptor.py:82` does
`cp = cp` inside a `class` body nested in a function. That is a `NameError` in
CPython — class bodies use `LOAD_NAME` (local → global → builtins) and skip the
enclosing function scope — so the fixture cannot run there as written. If Grail
executes it, Grail resolves class-body names through the enclosing scope and
differs. This belongs with the class-body namespace work
(`docs/Class_Body_Namespace.md`), not here.

**Result:** 15 fixtures, **180 OK + 2 XFAIL**, wired into the existing no-stone
`scripts` job in CI (which needs `setup-python` 3.14 — the runner's system
`python3` is 3.10 and predates `ExceptionGroup`). SUnit **4271, all green**. No
Smalltalk changed; the only fixture edit is a `__main__` block, which the harness
provably never executes — `TracebackTestCase` loads the file with
`name: 'live_frames'`.

### 9.28 Widening the net: 15 fixtures → 38 (2026-08-13, gs40)

§9.27 argued that converting fixtures, not tightening the gate, is what makes it
worth anything. Done: the 23 fixtures whose checks already answered `True` under
CPython now have `__main__` blocks, taking the gate from **15 files / 180 OK** to
**38 files / 288 OK + 2 XFAIL**.

Most of this is not traceback work at all — the converted set is class bodies,
comprehension scoping, pickling, iterators, dataclasses and closures — so the
substance lives in `docs/Testing_Guide.md` rather than here. Two things are worth
recording where the earlier sections are:

**A fixture can pass on import and fail as a script**, and the difference is
`__name__`. The census imported each file under its real module name; the gate
runs it as `__main__`. `exception_subclass_args.py` failed on exactly that,
asserting a literal `'exception_subclass_args.Empty: boom'` — and the fix is a
traceback rule this document had not yet stated: `format_exception_only`
qualifies by `__module__`, but **CPython suppresses the prefix entirely for
`__main__` and `builtins`**, which is why `ValueError: x` renders bare. The check
now derives the prefix, so it is right in both contexts instead of pinned to one.

**Two of the four historical bug-pinning fixtures are now covered**
(`exec_class_definition.py`, `handler_raise.py`). `exception_naming.py` and
`code_filename.py` remain outside, because they do not run under CPython as
written — the honest accounting from §9.27 improves but does not close.

SUnit **4288, all green**. No Smalltalk changed.

### 9.29 The last two bug-pinners, and a legacy-form gap (2026-08-14, gs40) — gap **closed in §9.30**

§9.28 left `exception_naming.py` and `code_filename.py` outside the gate because
they did not run under CPython as written. Both now do — **40 fixtures, 304 OK**
— and getting there turned up three separate wrong expectations plus one real
conformance gap. All four were *measured*, not reasoned about.

**A class defined inside a function has `<locals>` in its `__qualname__`.**
`format_exception_only` names a class by `__qualname__`, so a function-local
`class X(Exception)` renders as `check.<locals>.X`, never `X`. Two checks
hardcoded the bare name and so were pinned to Grail, which does not add the
segment. Both now derive the expected text through a new `_rendered_name`
helper, a direct transcription of CPython's `_get_exc_type_str`:

```python
stype = cls.__qualname__
smod = cls.__module__
if smod not in ('__main__', 'builtins'):
    if not isinstance(smod, str):
        smod = '<unknown>'
    stype = smod + '.' + stype
```

That one helper also absorbs the `__main__` suppression from §9.28, which is why
three further checks in the file needed no bespoke handling.

**`st_mtime_ns == st_mtime * 1e9` is false in CPython.** `st_mtime` is a float
and `st_mtime_ns` an exact integer, so they agree only to float precision —
about a microsecond at present-day timestamps. `code_filename.py` asserted exact
equality, which holds in Grail. It now asserts they describe the same instant
(`abs(...) < 1e-3`), which is the rule actually worth pinning.

**The legacy `(type, value)` form: Grail matches neither CPython path, and does
not even fail the same way twice.** Both sides were measured — CPython 3.14.6,
and Grail through `ModuleAst evaluateExpressionSource:`:

| call | CPython 3.14 | Grail |
| --- | --- | --- |
| `format_exception_only(ValueError, None)` | `NoneType: None` | `ValueError` |
| `format_exception(ValueError, None, None)` | `NoneType: None` | **raises `TypeError`** |
| `TracebackException(ValueError, None, None)` | `ValueError: None` | — |

The module-level entry points **ignore the type they are handed** and derive it
from the value; the *class* keeps the type it was constructed with. Grail's two
paths diverge for different reasons: `format_exception_only` carries a `derived`
flag and reads "value is None and not derived" as "no message at all"
(traceback.py:499), giving the bare name, while `format_exception` instead
reaches the single-argument guard added in §9.26, which rejects a *type* as a
value and raises `Exception expected for value, type found`. The fixture had
asserted Grail's `'ValueError\n'` as though it were CPython's rule.

Worth stating plainly because it nearly went out wrong: the first draft of this
section claimed Grail rendered the bare name for *all three*, reasoned from
reading `format_exception_only`. Running the second form against a live gem is
what turned up the `TypeError`. Because that clause **raises** rather than
answering `False`, nothing in the harness may call this check until it is fixed
— which is a stronger constraint than an ordinary failing assertion, and is
recorded in the driver comment for the next person.

**This one is left failing on purpose.** Fixing it means reworking that flag
while keeping the class path intact — the two internal callers at
traceback.py:742 and :1463 both pass `(type, value)` pairs, and :1463 is the
class path that must *not* normalise. That is its own change with its own blast
radius, so the check now states CPython, carries a `KNOWN GRAIL GAP` docstring,
and `TracebackTestCase` no longer asserts it — with a comment naming the check,
because a silent removal reads as an oversight later. Note this is **not**
`XFAIL`: an `XFAIL` check asserts a Grail limitation and fails under *CPython*,
whereas this asserts CPython and fails under *Grail*.

**`code_filename.py` keeps both shapes.** Its three filename functions answer a
path rather than a bool, because the Smalltalk driver asserts each equals the
absolute path it loaded — a stronger claim than any self-comparison, and the one
that caught `co_filename` being the `'<grail>'` placeholder. A standalone run has
no such external path, so a new boolean check states the portable half (all three
def shapes agree with each other and with `__file__`). Neither run is weakened to
suit the other.

**Result:** the gate covers **40 fixtures, 304 OK + 2 XFAIL**, and every fixture
known to have pinned Grail's behaviour is now checked against CPython on each
push. SUnit **4288, all green**. The only Smalltalk change is a comment and one
removed assertion in `TracebackTestCase`; `traceback.py` is untouched, so
`test.test_traceback` is unaffected.

### 9.30 Telling "not passed" from "passed None" (2026-08-14, gs40)

§9.29 recorded the legacy-form gap and left it failing. This closes it. The three
shapes now answer exactly what CPython answers, verified against a live gem:

| call | CPython 3.14.6 | Grail before | Grail now |
| --- | --- | --- | --- |
| `format_exception_only(ValueError, None)` | `NoneType: None` | `ValueError` | `NoneType: None` |
| `format_exception(ValueError, None, None)` | `NoneType: None` | raises `TypeError` | `NoneType: None` |
| `TracebackException(ValueError, None, None)` | `ValueError: None` | `ValueError` | `ValueError: None` |

**The whole bug was that `None` cannot mean two things at once.** `value` and
`tb` defaulted to `None`, and the one-argument form was detected by
`value is None and tb is None` — which is also true of an explicit
`format_exception(ValueError, None, None)`. That call therefore took the
single-argument path and hit §9.26's `_require_exception` guard, which rejects a
*type* as a value. The fix is CPython's: **make the defaults a sentinel**, so
"not passed" and "passed `None`" are distinguishable at all. Everything else
follows from being able to tell them apart.

**The rule the legacy form obeys is counter-intuitive and worth stating.** The
type argument is *ignored*: CPython derives the type from the value, because the
value is the only argument that can carry a message. `format_exception_only`
previously kept the passed type and used a `derived` flag to decide whether the
value contributed a message at all, reading "value is None and not derived" as
"no message" — producing a bare `ValueError` that matches **neither** CPython
path. The flag is gone; the value always contributes.

**And the trap: the class must NOT do this.** `TracebackException` keeps the type
it was constructed with, so the same arguments render two ways depending on which
door you come in by. Two changes protect that half:

* `TracebackException.__init__` no longer calls `_unpack_exc_args` — that
  helper normalises *for the module-level functions*. It keeps the triple it is
  handed, retaining only Grail's convenience of expanding a `BaseException`
  passed as the type. All five internal constructors already pass a consistent
  triple, so nothing else moved.
* `format_exception_only` takes a private `_keep_type`, which the class path
  passes. Without it, `TracebackException(ValueError, None, None)` would render
  `NoneType: None` — trading one wrong answer for another.

The fixture asserts all three shapes together, precisely so a later
"simplification" into one rule cannot quietly drop whichever half was not in
mind.

**Blast radius, measured rather than assumed.** `test.test_traceback` is
**unchanged by name** — same 57 failing tests before and after, none fixed, none
newly failing, no test changing kind. The fix corrects behaviour that module does
not exercise. No stdlib module outside `traceback.py` calls these entry points,
so the surface is the module plus its tests.

**The sentinel is Python-level, and that draws a contract boundary.** Grail reads
`nil` as "undefined / unbound" and `None` as an explicit Python value
(`NoneType.gs`), which makes `nil` the natural "no argument" marker for a
Smalltalk caller. These are Python entry points following CPython's contract, so
the marker must be a value no *caller* can produce — a private `object()`, as in
`contextvars._MISSING`, `dataclasses.KW_ONLY` and `itertools._sentinel`. A
Smalltalk caller that fills the optional slots with `nil` therefore does **not**
get the one-argument form; `nil` is taken as an explicit value and the type is
derived from it:

| call | answers |
| --- | --- |
| `tb @env1:format_exception: exc` | `ValueError: v` ✅ |
| `tb @env1:format_exception: exc _: nil _: nil` | `UndefinedObject: <UndefinedObject object at 0x101>` |

Both were measured. The second is **out of contract**: omit the optional
arguments rather than passing `nil`. It was already wrong before this change —
it rendered `ValueError: <UndefinedObject object at 0x101>`, right type and
garbage message, where it is now garbage in both halves — so this reshapes a
pre-existing hole rather than opening one. Closing it properly would mean
teaching the Smalltalk → Python boundary to map `nil` onto each function's
default, which is a dispatch-wide decision and not traceback.py's to make.

**A "stale scoreboard row" reported here was wrong — corrected in §9.31.** This
section originally claimed the committed board recorded `test.test_traceback` at
f=44 e=14 s=217 against an actual f=45 e=12 s=218. The committed board says
f=45 e=12 s=218 and always did. What was read was
`out/cpython/scoreboard.json`, which **`out/` is gitignored** — a local leftover
from an earlier run in the same worktree, not the baseline. The A/B above
compares two runs made here, which was the right method for an unrelated reason
(it isolates the change under test); the justification given for it was not.

### 9.31 The scoreboard was never stale: read the committed board (2026-08-14, gs40)

§9.30 claimed three stale rows and put "refresh the scoreboard" at the top of the
backlog. A full-manifest run settles it: **there is nothing to refresh.**

```
$ ./scripts/run_cpython_suite.sh          # 83 modules, 285s
$ git status --short                      # (no output)
$ ./scripts/check_cpython_regressions.sh
cpython regression gate: 0 regression(s), 0 improvement(s)
```

The regenerated `docs/CPython_Suite_Scoreboard.md` is **byte-identical** to the
committed one, and all three rows said the right thing all along:

| module | committed | fresh run |
| --- | --- | --- |
| `test.test_traceback` | 370 / 45 / 12 / 218 | same |
| `test.test_yield_from` | 43 / 17 / 12 / 0 | same |
| `test.test_raise` | 37 / 1 / 14 / 0 | same |

**The mistake was reading the wrong file.** The committed baseline is
`docs/CPython_Suite_Scoreboard.md`; `out/cpython/scoreboard.json` is a **local
artefact** — `.gitignore` line 3 ignores `out/` wholesale — left behind by
whatever ran last in that worktree. Reading the JSON and calling it "the
committed board" produced a confident, specific, wrong claim that reached a
commit message, a PR body, a PR comment and this document.

Two things make the trap easy to fall into, and both are worth knowing:

* The JSON is the *natural* thing to parse — it is structured, it sits under the
  obvious name `scoreboard.json`, and the markdown looks like a rendered report
  rather than the source of truth. It is the other way round: the markdown rows
  are what is committed and what the gate diffs, and the board's own header says
  so.
* A gitignored file is invisible to `git status`, so nothing about a stale one
  looks unusual. It cannot be caught by inspecting the working tree; it is only
  caught by reading the baseline the *gate* reads.

**How to check a baseline claim in future:** `git show HEAD:docs/CPython_Suite_Scoreboard.md`,
or just run `check_cpython_regressions.sh`, which does exactly that comparison
and is the authority. Never quote `out/cpython/scoreboard.json` as a baseline —
it is only ever the result of the last run on that machine.

The earlier note that `test_raise` sat at 6/9 while measuring 1/14 was true when
it was written; someone has since refreshed the board. That is the ordinary
lifecycle working, not a backlog item.

### 9.32 Carets: worth 9 tests, not 2, and here is the design (2026-08-14, gs40)

Two corrections to the backlog, both from bucketing all **57** remaining
`test.test_traceback` failures by cause rather than by guess.

**The seven "exception group" failures are caret failures.** They were being
counted as a group-rendering bucket on the strength of an assertion message
beginning `'  + Exception Group Traceback (most recent call last):'`. Rendering
the same group under both interpreters shows Grail's output is **structurally
identical** to CPython's — same header, same `  | ` margin, same frames, same
`+-+---- 1 ----` boxes. The only difference is the caret line:

```
  |     exception_or_callable()
  |     ~~~~~~~~~~~~~~~~~~~~~^^        <- CPython emits this; Grail does not
```

`test_exception_group_basic` asserts that line literally
(`test_traceback.py:2645`). §9.20's group work is done; these tests are waiting
on carets alone. So carets are worth **~9 tests** (7 group + 2 direct), which
makes them the largest single cause left — not the 2 they were credited with.

**The remaining clusters, for the record:** suggestion family 11 (several
sub-causes; 2 of them are `sys.stdlib_module_names`, and the underscored /
`self.blech` variants need frame locals — CPython un-hides a private candidate
only when the access came from inside the object's own method), colorize 4,
`<grail>` filename 5, nested frames 4, `f_locals` 1.

#### Why §9.26 called this a project, and what it missed

§9.26 concluded carets need per-call-site positions and stopped there. That is
right, but the obstacle is narrower and more mechanical than "the position array
cannot be used". **There are two independent position mechanisms**, and only one
of them is a problem:

| | how a frame gets its position | takes a span today? |
| --- | --- | --- |
| unwinding through a function | `___pushFrameFromPos___` reads the runtime `___curPos___` temp | **yes** — it already accepts the 5-element array |
| rebuilt from a `(method, ip)` triple | `_sourceAtIp:` scans the GENERATED SMALLTALK SOURCE for the last `___curPos___ := N` above a caret marker | **no** — it reads the digits immediately after `:=` |

So `___pyPositionLiteralArray` is not blocked by the consumer; it is blocked by a
**text scanner**. Emit `___curPos___ := #(12 4 12 20 'src')` and the digit-read
finds no digit after `:=`, answers nil, and drops the frame — fail-closed by
design (§9.26 chose that over a confidently wrong line). ForAst.gs:186 already
emits the array form for a comprehension iterable, which works precisely because
that path pushes its frame directly rather than going through the scanner.

#### The design

Two parts, and the cheap part is not the expensive one.

**Part 1 — teach the scanner the array form (small).** Extend the digit-read in
`_sourceAtIp:` to accept `#(` followed by the line number, so both
`___curPos___ := 12` and `___curPos___ := #(12 ...)` answer 12. Roughly ten
lines in one method, no codegen change, no behaviour change on its own. This
removes the blocker §9.26 recorded.

**Part 2 — emit spans at call sites (the actual work, tier 2).** A caret on a
non-innermost frame marks the CALL that led to the next frame, so the position
must be the call's span, not the statement's. That means a store before each call
expression rather than one per statement — a change in the call path, which fires
for every call in every Python function.

Two things make Part 2 more tractable than it sounds:

* **A literal array allocates nothing.** `___pyPositionLiteralArray` emits `#(...)`
  of compile-time constants, so the store is a pointer assignment — the same cost
  as today's integer store, which `___emitCurPosBefore:on:` already calls "free
  enough to sit before EVERY statement". Per-call cost is one store, not an
  allocation.
* **Statement-level stores stay.** Calls refine the position within a statement;
  they do not replace the statement store, so any path without a call keeps
  today's behaviour exactly.

The open questions are scope, not feasibility: whether to emit at every call or
only where a frame can be observed, what module-level code does (it has no
`___curPos___` temp at all — `CallAst functionBeingCompiled` is nil there, so
module frames would stay line-only), and whether the innermost frame needs
operator spans (`x['a']['b']` marking the failing subscript) as well as call
spans — `TestColorizedTraceback.test_colorized_traceback` wants exactly that.

**Recommended split:** Part 1 alone, verified to change nothing, then Part 2
behind a full sweep. Doing Part 2 first is what makes this look like one big
risky change; the blocker and the feature are separable.

> **§9.32's plan is incomplete — read §9.33 before starting it.** It treats the
> Python side as ready because `FrameSummary` carries `colno` and `extract_tb`
> populates it. Nothing *renders* a caret, and the renderer has its own blocker.

### 9.33 Carets need three things, and two are missing (2026-08-14, gs40)

Starting §9.32's Part 1 turned up two blockers it did not account for. Both were
measured, and either one alone makes Part 2 (the expensive tier-2 codegen work)
produce nothing usable.

**What IS done: the plumbing, end to end.** `PyTraceback` carries `tb_colno` /
`tb_end_colno` (`PyTraceback.gs:31`), `extract_tb` reads them into a
`FrameSummary` alongside `_code_positions_at` as a fallback
(`traceback.py:1098`), and `FrameSummary` stores `colno` / `end_colno` /
`end_lineno` with the documented `line[colno - indent : end_colno - indent]`
contract. A span that reaches a frame survives to the renderer intact.

**Missing 1 — nothing renders a caret line.** CPython draws it in
`StackSummary.format_frame_summary`; Grail's returns `str(frame_summary)`, and
`FrameSummary.__str__` emits only the `File` row and the source line. (Note
CPython's own `__str__` is just the repr — the two implementations differ here
deliberately, see the comment on `StackSummary.format`.) Measured CPython
behaviour, which is not what one would guess:

| `line`, `colno`, `end_colno` | rendered caret line |
| --- | --- |
| `exception_or_callable()`, 4, 27 | `        ~~~~~~~~~~~~~~~~~^^` |
| `foo()`, 0, 5 | `    ~~~^^` |
| `y = x['a']['b']['c']`, 4, 19 | `        ^^^^^^^^^^^^^^^` |
| `a = b + c`, 4, 9 | `        ~~^~~` |
| `foo()`, None, None | *(no caret line)* |

A span covering the whole line **still** gets a caret line — the obvious
"suppress when it spans everything" rule is wrong. And the `~` / `^` split is
expression-aware: a call anchors the parentheses, a binary operator anchors the
operator, a subscript chain anchors everything.

**Missing 2 — that split needs a real `ast`, and Grail's is a stub.** CPython
computes it in `_extract_caret_anchors_from_line_segment`, which parses the
source segment and reads `col_offset` off the node. `src/python/stdlib/ast.py`
says plainly what it is: `parse()` returns a `_ParsedExpr` wrapper, "anything
that walks the tree will hit AttributeError", and the node classes are "minimal
stubs so werkzeug.routing's converter parser can reference `ast.AST` … as type
tags". There is no `col_offset` to read. CPython's fallback when anchors cannot
be computed is to emit all `^`, which renders `foo()` as `^^^^^` where CPython
gives `~~~^^` — so the fallback does not win the tests either.

#### The data Grail already has is worse than none

`ForAst.gs:186` emits a real span for a comprehension, and it reaches the frame.
For `return [1 / 0 for i in range(3)]`:

| | span on frame `boom` | what it points at |
| --- | --- | --- |
| CPython | `colno=12 end_colno=17` | `1 / 0` — the failing division, anchored `~~^~~` |
| Grail | `colno=27 end_colno=35` | `range(3)` — the comprehension's **iterable** |

Both are "correct" for what they record; only CPython's records *what failed*.
So switching on a renderer today would underline `range(3)` for a
`ZeroDivisionError` — a confident, precise, wrong answer, which §9.10 argues is
worse than no caret at all. **Part 2 is therefore not "emit spans at call
sites" but "emit spans for the failing sub-expression"**, and any existing span
whose semantics are "the iterable" has to be re-pointed or excluded rather than
inherited.

#### Revised shape of the work

1. **A real `ast`** — or an equivalent way to locate the anchor within a source
   segment. Grail has a Python parser in Smalltalk, so exposing enough of it to
   answer "where is the operator in this segment" is plausible, but it is its own
   project and `test.test_ast` is in the manifest as its own scoreboard row.
2. **The renderer**, transcribing CPython's algorithm — tier 1, self-contained,
   testable with fixtures that construct `FrameSummary` with explicit columns.
   Cannot land usefully before (1), because without anchors it renders all `^`.
3. **Per-operation spans in codegen** — tier 2, and larger than §9.32 framed it:
   the span must mark the failing sub-expression, which is a property of the
   *operation*, not of the call site or the statement.

**Recommendation: do not start §9.32's Part 1/Part 2 yet.** Ten lines of scanner
change and a tier-2 codegen pass would deliver data that nothing can draw, in a
semantics that would draw the wrong thing. Carets remain the largest cluster
(~9 tests) and the least ready. If traceback work continues, the `<grail>`
filename cluster (5 tests) and the suggestion family (11, several sub-causes) are
unblocked; carets are gated on an `ast` decision that is bigger than traceback.

### 9.34 A live frame for a method named `<grail>` (2026-08-14, gs40)

The `<grail>` cluster from §9.32's bucketing is five tests — `test_extract_stack`,
`test_format_stack`, `test_print_stack`, `test_custom_format_frame` — and they
are all LIVE-stack tests, not exception tracebacks. The two mechanisms resolve a
filename differently, which is why `code_filename.py` passed throughout while
these failed.

**The bug: only one of the two def shapes resolved.**
`BaseException class >> ___liveFrameFilenameFor___:` derived `co_filename` from
`aMethod inClass name`, on the stated premise that "a generated Python function's
defining class IS its module". That holds for a MODULE-LEVEL def. A CLASS-BODY
def compiles to a Smalltalk method whose `inClass` is the **Python class** —
`T`, not `stackprobe` — so the `sys.modules` lookup missed and every live frame
for a method answered `<grail>`. Measured, before:

```
MODLEVEL=[('/.../stackprobe.py','probe'), ('/.../stackprobe.py','modlevel')]
METHOD  =[('/.../stackprobe.py','probe'), ('<grail>','meth')]
```

**The fix** consults the defining class's class-side `___methodCodeTable___`
first — the same `PyCode` that backs `__code__`, so its `co_filename` is exactly
the path `code_filename.py` already pins and the two mechanisms cannot disagree.
No superclass walk is needed, unlike `BoundMethod>>___methodCodeForClass___:name:`:
that starts from the RECEIVER's class and must climb to find an inherited method,
whereas `aMethod inClass` IS the defining class. The module route stays as the
fallback for module-level defs, and `<grail>` remains the last resort.

One trap worth recording: the temp could not be called `name`. This is a
CLASSMETHOD, so `self` is the class and GemStone's `Class` instVar `name` is
already in scope — `CompileError 1030, variable has already been declared`.

**It fixes the filename and wins no tests, which is the useful part.** After the
change, `<grail>` in `test.test_traceback`'s failure details drops from 5 lines
to 1, and the scoreboard row is unchanged at `t=370 f=45 e=12 s=218`. The
placeholder was masking two further problems, now legible:

* **Relative vs absolute paths.** `test_custom_format_frame` renders
  `File "src/python/stdlib/test/test_traceback.py"` where the test expects the
  absolute `__file__`. A module's `co_filename` mirrors however the module was
  loaded, and the CPython harness loads by relative path while `__file__` is
  absolutised. `code_filename.py` does not catch this because its fixture is
  loaded by an absolute path, so both agree there.
* **Harness and unittest frames are in the walk.** `run_one`
  (`_grail_harness.py`) and `run` (`unittest/__init__.py`) appear in the
  extracted stack; the tests compare against a specific expected list.

Both are real and neither is what the cluster looked like from the outside. A
regression check is pinned in `live_frames.py`
(`a_method_s_live_frame_names_its_real_file`), asserting BOTH shapes so that a
future fix repairing one by breaking the other fails rather than looks like
progress.

### 9.35 An override with a defaulted parameter does not override (2026-08-14, gs40)

Chasing the `<grail>` cluster's remaining failures turned up a bug that has
nothing to do with tracebacks. `test_custom_format_frame` was rendering the
DEFAULT frame format rather than its subclass's, and the reason generalises:

```python
class Base:
    def m(self, x):            return 'BASE'
    def call_internally(self, x): return self.m(x)

class ExtraDefault(Base):
    def m(self, x, flag=False): return 'SUB'
```

| call | CPython | Grail |
| --- | --- | --- |
| `SameArity().call_internally(1)` | `SUB` | `SUB` |
| `ExtraDefault().m(1)` — from outside | `SUB` | `SUB` |
| `ExtraDefault().call_internally(1)` — from base code | `SUB` | **`BASE`** |

**Why.** A simple-positional def compiles to a FIXED-ARITY selector — `m:`, via
`CallAst fastPathSelectorForAttr:arity:`. A def carrying a default compiles to
the varargs form `_m:kw:` instead. Base-class code calling `self.m(x)` emits the
fixed-arity send, which finds the base's `m:` and never reaches the subclass's
`_m:kw:`. Verified directly: on the subclass, `whichClassIncludesSelector:
#'format_frame_summary:' environmentId: 1` answers `StackSummary`, while the
subclass's own env-1 method dictionary holds only `_format_frame_summary:kw:`.

Calls from OUTSIDE resolve through attribute lookup, which goes by name and
works — so the bug is invisible from the caller's side and appears only for
calls made from within the base class. There is no DNU and no error; the wrong
method simply runs.

**This is the shape stdlib subclassing takes** whenever CPython grows a keyword.
`def format_frame_summary(self, frame_summary, colorize=False)` overriding a base
`def format_frame_summary(self, frame_summary)` is real code from
`test_traceback`, and the same pattern recurs across 3.13+ signatures.

**The fix has precedent in the codebase, in the opposite direction.** Grail
already emits a varargs COMPANION for simple-positional defs so keyword call
sites bind (`FunctionDefAst>>needsVarargsForwarder`: "a fixed-arity selector
encodes only arity, so a keyword call ... would DNU"), and it already emits a
fixed-arity companion for one special case
(`generateBigmemtestUnaryForwarderSource`, which "restores the plain `name`
entry" so `dir()`-based test discovery finds it). What is missing is the general
reverse direction: a def that compiles as varargs gets no fixed-arity entry
points, so it cannot override one.

Emitting fixed-arity forwarders for each arity a defaulted def accepts would
close it, at the cost of extra (tiny) methods per def — `def f(a, b=1, c=2)`
would gain three. It is a codegen change in `PythonAst/`, so **tier 2**, and it
changes method dispatch generally: it wants its own change and a full sweep,
not a rider on traceback work.

`tests/python/override_default_arg.py` pins the rules. It is NOT wired into a
Smalltalk driver, because two of its checks state CPython and fail here — the
same treatment §9.29 gave the legacy-form gap, and for the same reason: the
fixture should say what is true, and the harness should not go red for a bug it
is documenting.

### 9.36 Fixing the override, and the property pair it collided with (2026-08-14, gs40)

§9.35's fix, plus the thing that made it a two-part change rather than a
one-part one.

**Part 1 — the forwarders.** `FunctionDefAst>>needsFixedArityForwarders` now
emits a fixed-arity entry point for each arity a defaulted def accepts, each
one delegating into the varargs body so the omitted arguments take their
defaults. `def m(self, x, flag=False)` gains `m:` and `m:_:` alongside
`_m:kw:`, so a base-class `self.m(x)` — which compiles to `m:` — lands on the
override. This is the mirror of `needsVarargsForwarder`, which already emits a
varargs companion for simple-positional defs so keyword call sites bind.
`*args` is excluded (unbounded arity) and so is `__init__`, which routes
through varargs on purpose.

**Part 2 — the collision, which is the part worth remembering.** An arity-1
forwarder `m:` is *shape-identical to a synthesized property setter*, and
`___pyAttrLoad___` treats a class chain carrying both `m` and `m:` as a
getter/setter pair: it PERFORMS the unary and answers the value. That is how
`@property` and instVar reads work, and it is the right behaviour for a real
pair. With the forwarders it fired on ordinary methods, so `obj.m` answered the
method's RESULT and the call site then tried to call that result.

It failed as `TypeError: 'SmallInteger' object is not callable` on
`import werkzeug.local`, through re/_parser's
`State.opengroup(self, name=None)` — which returns a group id, so
`state.opengroup(name)` read the id and called it. Reduced to six lines:

```python
class C:
    def foo(self, a=None):
        return 42
C().foo        # 42 under the unfixed change; CPython answers a bound method
C().foo(1)     # TypeError: 'int' object is not callable
```

The fix is to make the two distinguishable. The forwarders compile into their
own method category, `Grail-Fixed Arity Forwarders`, and the pair test in
`___pyAttrLoad___` consults the category of whatever implements `m:` before
deciding it is a setter. The probe runs only when both spellings exist, which
is the rare case, and the same category-based discrimination is already used a
few branches up for module receivers.

**Part 3 — gating the forwarders on need, which is what the suite forced.**
With the category guard in, SUnit and the sweep still came back at **114 errors
and 22 regressions**, through two more mechanisms the category could not reach:

* `UnboundMethod`'s selector-by-arity lookup picked the new `_operator_fallbacks:`
  over the varargs body, and `with:performMethod:` — which exists to run an
  EXACT method, bypassing MRO — then dispatched the forwarder's inner `self`
  send on the wrong receiver. 86 errors, all from one line of `fractions.py`.
* Plain name collisions: `Unicode7 does not understand #'new'`, 17 more.

Three unrelated mechanisms, each surfacing only after the previous was fixed,
is the signal that the DESIGN was wrong rather than that it needed another
patch. Emitting a fixed-arity selector for every defaulted def changes name
resolution across the whole image, and `fractions._operator_fallbacks` and
`re/_parser.State.opengroup` have no override relationship at all.

A forwarder is only ever NEEDED where a superclass already answers that exact
fixed-arity selector — which is the definition of the override case. So each
one is now emitted behind a runtime test:

```smalltalk
(Cls ___grailSuperImplements___: #'m:') ifTrue: [Cls ___compileMethod: '...' category: 'Grail-Fixed Arity Forwarders'].
```

It has to be a RUNTIME test: the base class is a runtime object, and codegen
cannot see it. `ExtraDefault.m` overriding `Base.m(self, x)` gets exactly one
forwarder, `m:`; `fractions`, `re/_parser` and the `new` collisions fall outside
the gate and get nothing.

**Why this matters beyond the bug.** An earlier attempt tried to duck part 2 by
emitting only arities ≥ 1, on the theory that the unary forwarder was the unsafe
one. That is what the werkzeug failure looked like in isolation, and it was
wrong in both directions: `m:` alone still forges a pair when a base class
supplies the unary `m`, and it broke a plain `ZeroArgSub().m()` call that had
worked before. Each of the three collisions was found by MEASURING, and none of
them by reading the change. For codegen that fires on every class definition,
the tier-2 sweep is not a formality — it was the only thing standing between
this and a 22-module regression.

`tests/python/override_default_arg.py` grew from six checks to eight; the two
that §9.35 left failing now pass, and the two new ones cover the arity-0 shape
from outside and from base-class code. It is wired to
`PythonTests>>OverrideDefaultArgTestCase`, which §9.35 deliberately did not do
because the fixture then documented a bug.

Tier 2, per CLAUDE.md: `PythonAst/` codegen runs for every module, and
`Object.gs` / `Class.gs` are on the attribute and class-creation paths. Final
run: SUnit **4378/4378**, gate **0 regressions, 0 improvements**, scoreboard
byte-identical. Zero improvements is the honest number — this wins no CPython
test today. It removes a silent wrong-method bug and unblocks the 3.13+
`colorize=` override shape that `test_traceback`'s `test_custom_format_frame`
needs.
