# `gemstone` MCP Server — Agent Feedback

Notes from a Claude Code session that implemented the class-call fast
path (`bool(x)`, `int(x)`, `object()`, etc.) for `CallAst`. The session
used the standard CLI workflow (`./install.sh`, `./scripts/run_tests.sh`,
ad-hoc topaz scripts in `/tmp`) and then exercised the `gemstone` MCP
server retroactively to compare. After my first-round notes, the server
shipped six new tools (`refresh`, `eval_python`, `compile_python`,
`list_test_classes`, `list_failing_tests`, `describe_test_failure`).
This document covers both rounds.

## Round 1 — pain points the MCP could replace

The CLI workflow's friction points:

1. **Full reinstall after every method tweak.** `./install.sh`
   recompiles all 114 classes (~30+ seconds) just to test a one-line
   change. Done 8–10 times in this session.
2. **Full test suite to check one class.** `./scripts/run_tests.sh`
   runs all 1497 tests when I only care about ~17 in
   `ClassCallFastPathTestCase`.
3. **Ad-hoc `/tmp/diag*.gs` scripts.** Every time I needed to inspect
   runtime state (`Python at: #PythonClass`, `methodDictForEnv:`,
   codegen output for a Python expression), I wrote a one-off
   `login`/`run`/`%`/`logout` topaz script in `/tmp` and parsed its
   output.
4. **`grep` over `src/smalltalk/`.** Worked, but found false positives
   in comments and tests, and is filename-grain instead of method-grain.

## Round 1 — what worked well

| Tool | Verdict | What it replaces |
|------|---------|------------------|
| `run_test_class` | **Big win.** Per-method PASSED/FAILED report, no parsing. | `run_tests.sh` for the iteration loop |
| `run_test_method` | Big win for "fix one failing test" cycles. | (no clean CLI equivalent) |
| `find_implementors` (with `environmentId: 1`) | Best-in-class. | grep over `__new__:` patterns gave false positives in comments and tests; the MCP returned the actual 14 class-side implementations cleanly |
| `find_senders` | Same idea; useful. | grep equivalent |
| `get_method_source` | Saved a `Read` + line-counting. | `Read` |
| `describe_class` | Looks promising; great as a "give me the shape of this class in one round trip." | `Read` of the entire `.gs` file |
| `list_methods` | Useful for orienting in a class. | grep + Read |
| `status` | Useful sanity check on session/transaction state. | (no equivalent) |

## Round 1 — what was rough

1. **`execute_code` rejects multi-statement input** unless wrapped in
   `[...] value`. `| x | x := 42. x + 1` errors with "expected start of
   a statement". Every diagnostic snippet I wrote needs the
   `[...] value` wrapper.

2. **Stale-transaction silently lies.** My MCP session showed
   `1497 run` (old state) right after `install.sh` had committed
   changes producing 1517. Calling `abort` explicitly fixed it.

3. **`find_implementors` defaults to `environmentId: 0`.** Almost
   everything Python-related lives in env 1. I asked "find `__new__:`"
   and got "No implementors found" when there are 14.

4. **Validator errors are not actionable.** `get_method_source` failed
   because `isMeta` was missing; the response was a raw JSON-schema
   "expected boolean, received undefined." Same with `run_test_method`
   — the parameter is `selector`, not `methodName`, and the error
   didn't suggest the right name.

5. **No bulk-source operations.** Refactoring 4 method definitions
   across 4 classes was 4 × (`Read` + `Edit`). `compile_method` is
   live-only; the on-disk `.gs` files are the source of truth a
   subsequent `install.sh` will read.

## Round 2 — the new tools

The server added six tools targeting most of my round-1 asks. Notes
from trying each:

### `refresh` — solid

```text
mcp__gemstone__refresh
→ refreshed
```

Solves the staleness story cleanly. Crucially, the description
explicitly says *"Refresh this session's view of committed state by
aborting if (and only if) there are no uncommitted changes."* That
guard is the right design — silent auto-abort would risk losing live
edits.

### `eval_python` — exactly what I wanted, with one rendering bug

```text
mcp__gemstone__eval_python source="2 + 3"           → 5
mcp__gemstone__eval_python source="[1, 2, 3]"        → anOrderedCollection( 1, 2, 3)
mcp__gemstone__eval_python source="print('hello')"   → None
mcp__gemstone__eval_python source="def factorial(n): ...; factorial(5)"  → 120
```

This single tool replaces the entire `/tmp/diag*.gs` workflow for
Python-level checks. Multi-line input works. End-to-end test of the
codegen pipeline as a side benefit.

**One rendering bug to fix.** Error returns come back with each
character followed by a space-like byte:

```text
mcp__gemstone__eval_python source="bool(1)"
→ "E r r o r :   M e s s a g e N o t U n d e r s t o o d  ..."
```

That's UTF-16LE leaking through the JSON layer. Successful results
(integers, OrderedCollections, `None`) are fine; only the error path
hits it. I'd guess the error formatter receives a `Unicode16`-class
string from `messageText` / `description` and the JSON encoder isn't
transcoding it to UTF-8. Fix: force-coerce the error string to
`Unicode7` / UTF-8 before returning, mirroring how the success path
already works.

### `compile_python` — a clean win for codegen inspection

```text
mcp__gemstone__compile_python source="bool(1)"
→ bool value: { (1). } value: nil.

mcp__gemstone__compile_python source="print(abs(-5))"
→ (((Python @env0:at: #builtins) instance) _print: { ((((Python @env0:at: #builtins) instance) abs: ((5) __neg__))). } kw: nil).
```

This is **the** tool for verifying codegen changes. In the previous
session I wrote a `generatedSourceFor:` Smalltalk helper in the test
case to extract the emitted source via `parseSource: → body → instVarAt:
→ first → value → printSmalltalkOn:`; with this tool, the test would
just call `compile_python` and string-match the result. Worth adding
test-case helpers that wrap it.

### `list_test_classes` — useful

Returns 113 test classes including SUnit infrastructure and the full
Python suite. Tab-separated `dictName \t className`. Pairs with
`list_failing_tests` for "run only this dictionary's tests."

### `list_failing_tests` — works, two issues

- **Calling without arguments fails.** The schema says
  *"With no classNames, discovers and runs every TestCase subclass in
  the symbolList,"* but both omitting the field and passing `[]`
  return `CompileError 1001, expected a primary expression`. I was
  forced to pass an explicit array of names.

- **Output is regression-friendly but the `message` column is just
  the SUnit debug recipe** (`ClassTestCase debug:
  #testCounterClassExists`). That's enough to triage which tests
  failed but doesn't say *why*. For the why I had to follow up with
  `describe_test_failure` per failure. Nine times out of ten I want
  the `messageText` inline so I can scan the failure list once and
  decide which to drill into. Suggested format:
  ```
  ERROR  ClassTestCase  testCounterClassExists  MessageNotUnderstood: nil does not understand #'contentsAsUtf8'
  ```

### `describe_test_failure` — exactly right

```text
status: error
exceptionClass: MessageNotUnderstood
errorNumber: 2010
messageText: a MessageNotUnderstood occurred (error 2010), a UndefinedObject does not understand  #'contentsAsUtf8'
description: ...
mnuReceiver: nil
mnuSelector: contentsAsUtf8
stackReport:
  MessageNotUnderstood (AbstractException) >> signal @2 line 47
  UndefinedObject (Object) >> doesNotUnderstand: @9 line 10
  ...
  importlib class >> astForPath: @4 line 8
  importlib class >> loadModuleFromPath:name: @2 line 17
  ClassTestCase >> setUp @10 line 10
```

This is the gold standard. Structured fields, MNU-specific `mnuReceiver`/
`mnuSelector` (huge — that's almost always what you want first), and a
stack trace pinpointing `importlib class >> astForPath: @4 line 8` as
the actual bug location. I would have spent 2–3 minutes parsing topaz
output to extract the same info.

## Net assessment after round 2

The MCP has gone from "useful for some queries" to "**clearly faster
than the CLI for the targeted edit-test cycle.**" `eval_python` +
`compile_python` + `describe_test_failure` together cover the bulk of
what I was previously doing through `/tmp` scripts and topaz-output
parsing.

Remaining gaps:

1. **Fix the UTF-16 leak in `eval_python` error returns.** Highest
   priority — currently the error path is unreadable.

2. **`list_failing_tests` with no args should work as documented**
   (run every TestCase). Today it errors instead of running the suite.

3. **`list_failing_tests` should include `messageText` in the
   `message` column,** not just the SUnit debug recipe.

4. **Also still useful:** `find_implementors` defaulting to
   `environmentId: 1` for projects that mostly live in env 1, and
   prefix/glob support in `run_test_class`.

## Withdrawn from round 1: `compile_method_from_file` / `save_to_file`

These were on my round-1 wishlist. After feedback from the Jasper
team and a re-think, I'm withdrawing both:

- The `.gs` file is the canonical source of truth; the stone is the
  derived artifact (`install.sh` reads files → produces stone state).
  After `compile_method`, the *stone* has drifted from canonical, not
  the file. `save_to_file` would write derived state back over
  canonical state — the wrong direction.

- `save_to_file` also creates a second write path into the same
  file. Even without an editor in the loop, "me via Edit" racing
  "me via save_to_file" loses track of which version reflects intent.

- `compile_method_from_file` is solved by `Read` + `compile_method`
  in two calls. The only thing a dedicated tool adds is parser-aware
  "extract method X from this file region," which is a small win.

The actual underlying ask is "let me skip `install.sh` when I only
changed one method," and the existing tools already cover that:
edit the file, push the same method to the live stone via
`compile_method`, run targeted tests against the live stone, and on
the next session let `install.sh` re-derive the stone from the file
canonically. The single-canonical-sync-direction invariant is worth
preserving.

## Round 3 — verification of round-2 fixes

Same test methodology as round 2: hit each round-1/round-2 issue
directly, on the live MCP, and report what happens.

### Round-1 issues — fixed and confirmed

| Issue | Status | Evidence |
|-------|--------|----------|
| `execute_code` rejected multi-statement input | **fixed** | `\| x \| x := 42. x + 1` returns `43`; tool description now says explicitly that bodies are evaluated as a block. |
| `find_implementors` defaulted to env 0 only | **fixed** | `find_implementors __new__:` with no `environmentId` returns 14 env-1 results from `Python` and `Globals`. Description now documents the env-0-then-env-1 fallback. |

### Round-2 issues — regressed into a bigger bug

The Round-2 wishlist asked for a UTF-8 transcode on `eval_python`'s
error path and for `list_failing_tests` to accept no-args / `[]`. The
Round-3 build appears to have re-routed both through a new code path
that mutates a returned `Utf8` buffer — and `Utf8` is invariant, so
the mutation is rejected at runtime. Result: both tools now error
out before producing any user-visible output.

`eval_python` — every error case fails with the same wrapper error,
regardless of the underlying cause:

```text
mcp__gemstone__eval_python source="undefined_var"
→ Error: a Error occurred (error 2007), reason:rtErrShouldNotImplement,
  A method was invoked that has been specifically disallowed in a
  subclass. Receiver:  anUtf8( ).  Selector:  #'at:put:'.

mcp__gemstone__eval_python source="bool(1)"
→ (same error)

mcp__gemstone__eval_python source="[x*2 for x in range(3)]"
→ (same error)
```

The success path still works — `2 + 3 → 5` returns cleanly. So the
bug is specific to the error-formatting branch.

`list_failing_tests` — every variant errors with the same family:

```text
list_failing_tests (no args)
→ Error: ... Receiver: anUtf8( ). Selector: #'at:put:'.

list_failing_tests classNamePattern="Bytes*TestCase"
→ Error: ... Receiver: anUtf8( ). Selector: #'copyFrom:to:'.

list_failing_tests classNames=["BytesTestCase"]
→ (same as above)
```

Because the tool errors before producing any output, I couldn't
verify the round-2 ask about inlining `messageText` in the message
column. The fix may be there; it's not observable.

### Round-2 issues — confirmed unaffected

Tools that didn't touch the new error-formatting path are still
working:

- `describe_test_failure` — round-2 gold standard, still produces
  the structured `mnuReceiver` / `mnuSelector` / stackReport output.
- `refresh` — works.
- `run_test_method` — works, but the FAILED output still emits the
  SUnit debug recipe rather than the underlying `messageText`
  (e.g. `FAILED: PackageImportTestCase debug: #testModuleNameToPathFindsPackage`).
  Round-2 ask #3 (inline the messageText) applies here too — same
  fix idea, different tool.

### Diagnosis

Both regressed tools share a code path that the working tools don't:
they take a Grail / SUnit error string and re-format it for inline
inclusion in their own response (the inline error in `eval_python`,
the message column in `list_failing_tests`). The other tools either
return errors structurally (`describe_test_failure` returns separate
fields) or never touch the error path (`execute_code`, `refresh`,
`run_test_method`'s success path).

The fix likely lives in a single helper that does
`buffer at: i put: ch` against a `Utf8` instance. Two options:

1. Build the UTF-8 string with `WriteStream on: String new` and
   `nextPutAll:` / `nextPut:`, never mutating an existing buffer
   in place.
2. Coerce the source string to a mutable `String` (or `Unicode7`)
   before the in-place mutation, then convert back to UTF-8 at the
   boundary.

Either should be a small change. The good news is that the round-2
encoding bug itself (the `E r r o r :  ...` UTF-16 leak) appears not
to recur on the success paths — the round-3 build *did* address that
case correctly; it just over-corrected on the error path.

## Bottom line

The MCP server is on the right trajectory: round-2 added the right
new tools, round-3 fixed the round-1 issues that didn't depend on
error formatting (`execute_code`, `find_implementors`). The remaining
work is the `Utf8 at:put:` regression on `eval_python` and
`list_failing_tests`, which makes those two tools unusable on any
error case. Once that's fixed, the natural division stands:
**CLI for sweeps and final validation; MCP for the targeted
edit-test cycle.**

## Round 4 — verification of round-3 fixes

The round-3 attempt to fix the `Utf8 at:put:` regression replaced the
in-place mutation with `asUtf8`, but that selector doesn't exist on
any string class in the image. As a result, every tool that converts
a returned string through this path now MNUs:

```text
mcp__gemstone__find_implementors selector="asUtf8"
→ No implementors found in environmentId 0 or 1.

mcp__gemstone__find_implementors selector="encodeAsUTF8"
→ DoubleByteString, QuadByteString, String, Utf16, Utf8 (5 implementors)
```

The intended selector is `encodeAsUTF8` (camel-case, with `UTF8`,
not `Utf8`).

### Round 4 — what regressed (every call site, not just errors)

| Tool | Round 3 | Round 4 |
|------|---------|---------|
| `eval_python` (success) | OK | **broken** — `String does not understand #'asUtf8'` |
| `eval_python` (error) | broken (`Utf8 at:put:`) | **broken** — `Unicode16 does not understand #'asUtf8'` |
| `compile_python` | OK | **broken** — `Unicode7 does not understand #'asUtf8'` |
| `run_test_method` | OK | **broken** — `String does not understand #'asUtf8'` |
| `list_failing_tests` (any form) | broken (`Utf8 at:put:`) | **broken** — `String does not understand #'asUtf8'` |

So the round-4 attempt expanded the set of broken tools from two
(`eval_python` error + `list_failing_tests`) to five — `compile_python`
and `run_test_method` worked in round 3 and don't now.

### Round 4 — what still works

`execute_code`, `find_implementors`, `describe_test_failure`,
`refresh` — all unaffected, all working as before.

### Fix

A two-character typo: `asUtf8` → `encodeAsUTF8`.

The selector lives on `String`, `DoubleByteString`, `QuadByteString`,
`Utf16`, and `Utf8` (confirmed by `find_implementors`). It's the
right primitive for "give me a UTF-8 byte sequence regardless of the
source string class," which is the operation the wrapper layer is
trying to perform. Once that one rename lands, all five regressed
tools should come back, and the round-2 message-column inlining for
`list_failing_tests` will finally be observable.

## Round 4 bottom line

Round 4 didn't address the round-3 regression; it broadened it. But
the fix is small (a selector-name correction) and the four tools that
work cleanly (`describe_test_failure`, `execute_code`,
`find_implementors`, `refresh`) continue to be the most useful ones
in the suite. The other five become a single character-class fix
away from working again.

## Round 5 — verification of round-4 fixes

The `asUtf8` selector has been replaced (presumably with
`encodeAsUTF8`). All five tools that broke in round 4 now work, and
the round-2 message-column inlining for `list_failing_tests` is
finally observable. **This is the first round where every tool I'd
asked for actually works end-to-end.**

### Round 5 — confirmed working

| Tool | Verdict | Notes |
|------|---------|-------|
| `eval_python` (success) | ✓ | `2 + 3 → 5` |
| `eval_python` (compile error) | ✓ | `undefined_var → Error: CompileError — a CompileError occurred (error 1001), undefined symbol  undefined_var` — clean, readable, no UTF-16 leak |
| `eval_python` (runtime MNU) | ✓ | `bool(1) → Error: MessageNotUnderstood — a MessageNotUnderstood occurred (error 2010), a Boolean class does not understand  #'value:value:' (env 1)` |
| `eval_python` (codegen gap) | ✓ | `[x*2 for x in range(3)] → Error: UserDefinedError — AbstractNode is abstract; subclasses must implement printSmalltalkOn:` — diagnoses the comprehension-codegen TODO without a single ad-hoc script |
| `compile_python` | ✓ | `bool(1) → bool value: { (1). } value: nil.` |
| `run_test_method` (FAIL path) | ✓ | `FAILED: TestFailure: Assertion failed (11ms)` — round-2 ask #3 satisfied: the underlying `messageText` is now inline, no SUnit debug-recipe boilerplate |
| `list_failing_tests` (no args) | ✓ | Runs every TestCase, returns the failures. Round-2 ask #2 satisfied. |
| `list_failing_tests` (classNamePattern) | ✓ | `Bytes*TestCase → All tests passed.` |
| `list_failing_tests` (classNames) | ✓ | Returns failures for the named class only |
| `list_failing_tests` message column | ✓ | Each row is `status \t className \t selector \t exceptionClass: messageText`. Round-2 ask #3 satisfied: `MessageNotUnderstood: a MessageNotUnderstood occurred (error 2010), a UndefinedObject does not understand  #'contentsAsUtf8'`, `TestFailure: Assertion failed`, `ModuleNotFoundError: No module named 'src.python.mypkg'`, etc. |

### Round 5 — one new, low-priority issue

`list_failing_tests` with no `classNames`/`classNamePattern` returns
**duplicate rows**. The same failures appear twice in the output —
e.g. `PackageImportTestCase testModuleNameToPathFindsPackage  TestFailure: Assertion failed`
shows up at row 60 and again at row 87, and the two ClassTestCase /
ModuleFunctionTestCase / CPythonShimTestCase blocks each repeat
verbatim later in the output. The same call with explicit
`classNames=["ClassTestCase"]` returns 11 rows with no duplicates,
so the issue is specific to the no-args / discovery path.

Plausible cause: the no-args path discovers TestCase subclasses
through more than one route (e.g. walking `TestCase suite` AND
iterating the symbolList directly) and ends up running each test
twice. The fix is presumably to dedupe by `(className, selector)`
before returning, or to pick one discovery route.

Not a blocker — the rows are still readable and the unique results
are all there. Just makes the row count look 2× larger than it is.

### Round 5 — bonus: the test discovery is great triage

Running `list_failing_tests` with no args now produces a triage list
straight out of the box. Examples I can read directly from the output
without follow-up calls:

- A whole `ClassTestCase` lineage failing on `nil does not understand
  #'contentsAsUtf8'` — single root cause; same MNU at
  `importlib class >> astForPath:`.
- `CPythonShimTestCase >> setUp` calling `self skip:` which doesn't
  exist on the test class — likely a stub for a "skip if shim
  unavailable" pattern.
- `CPythonTestCase` cannot run in the same session as `CPythonShim`
  (matches `runCPythonTests.gs`'s comment about a separate session).
- `PackageImportTestCase` failing on path resolution — a few different
  symptoms (`ModuleNotFoundError`, assertion failures) sharing a
  resolution-related root cause.

That's exactly the value the round-2 ask was about. With `messageText`
in the message column, I can scan the full failure list once and
decide which root cause to drill into via `describe_test_failure`,
without making N follow-up calls.

## Round 5 bottom line

The MCP server is in genuinely good shape now. Every tool I asked
about works; every round-1 / round-2 issue is resolved; the only
remaining bug is a duplicate-row issue in one specific path of
`list_failing_tests`. The original feedback's bottom line stands and
strengthens: **CLI for sweeps and final validation; MCP for the
targeted edit-test cycle.** The MCP is now strictly the better tool
for the latter.

## Round 6 — re-verification

Re-ran each Round 5 claim against the live MCP after a fresh Jasper
1.4.3 session.

### Confirmed still working

| Check | Round 5 said | Round 6 |
|------|-------------|---------|
| `eval_python` success | ✓ `2+3 → 5` | ✓ `5` |
| `eval_python` compile error | ✓ clean readable | ✓ `Error: CompileError — a CompileError occurred (error 1001), undefined symbol  undefined_var` |
| `eval_python` codegen gap | ✓ comprehension error | ✓ `Error: UserDefinedError — AbstractNode is abstract; subclasses must implement printSmalltalkOn:` |
| `compile_python` | ✓ | ✓ (output evolved — see below) |
| `list_failing_tests` classNamePattern | ✓ `All tests passed.` | ✓ same |
| `list_failing_tests` message column | ✓ inline `messageText` | ✓ same (MNU / TestFailure / ModuleNotFoundError all readable inline) |
| `run_test_method` FAIL | ✓ inline messageText | ✓ `FAILED: TestFailure: Assertion failed (0ms)` |
| `refresh` / `status` | ✓ | ✓ |

### Round 5's one remaining bug is fixed

`list_failing_tests` with no `classNames`/`classNamePattern` no longer
returns duplicate rows. The output is 96 unique `(className, selector)`
rows on the current Grail test suite. The fix lives in the discovery
walk (`v isAbstract not` filter) and is now pinned by a structural
test on the Jasper side (see `Jasper_MCP_Test_Suggestions.md`).

### Two evolutions worth noting (not regressions)

The code under the MCP has moved between Round 5 and Round 6, so two
of the Round 5 examples now return different values. Both are
improvements, not regressions:

1. **`bool(1)` no longer errors.** Round 5 recorded it as a runtime
   MNU (`a Boolean class does not understand #'value:value:'`). With
   the class-call fast path that landed in commit 2b8a69f, it now
   returns `true` cleanly. The MCP error path remains testable via
   `undefined_var` and the comprehension example above.

2. **`compile_python` output reflects the new codegen.** Round 5
   showed `bool value: { (1). } value: nil.`; current output is
   `(bool @env1:__new__: (1)).` — the class-call fast path's emission.
   The tool itself works fine; just the example string in the Round 5
   doc is now stale.

## Round 6 bottom line

Zero outstanding issues from this feedback series. The Round 5
verdict stands: **CLI for sweeps and final validation; MCP for the
targeted edit-test cycle.** This round closed the duplicate-row bug
and confirmed every other claim against a fresh session.

Follow-on test-coverage discussion for the Jasper side is in
`Jasper_MCP_Test_Suggestions.md`.

## Round 7 — session lifecycle gaps (2026-05-14)

Session: finishing Grail's `_sre` integration so `_sre.compile()`
round-trips and `SreTestCase` is 13/13 green. The C-side bug fix
required rebuilding the shim `.dylib` and asking the gem to pick it
up. That sequence is where I hit the most friction.

### What I needed but couldn't do

1. **Restart the active gem session.** When the C shim is rebuilt,
   the gem's `dlopen`'d copy stays mapped — only a logout + login
   picks up the new code. I had to ask the user to manually use
   the VS Code Sessions pane to logout/login. **Three times** in
   one session, because each new piece of debugging required the
   rebuilt shim. A `mcp__gemstone__restart_session` tool that
   replays the same login config would have collapsed those three
   user interruptions to zero.

   *Bonus value:* when the gem crashes (HostCoreDump → 
   `socket read EOF`), the only way back is to relog. That's the
   second use case for the same tool. I hit this 4× in one session
   today.

2. **Load / reload a user action library.** I had to write
   `System loadUserActionLibrary: '/path/to/lib.dylib'` through
   `execute_code`. It works once, then errors on every subsequent
   call with `ImproperOperation 2171, 'User action library
   ''...'' is already loaded'`. With a dedicated tool the server
   can also tell me *which* version is currently mapped (mtime,
   sha) so I know whether the rebuilt file is actually in process.

3. **List / pick / inspect the configured Jasper sessions.**
   Today I'm bound to whatever the user selected in the Sessions
   pane. If a project has multiple stones (`gs64stone` for dev,
   another for tests, etc.), there's no way for me to know they
   exist, let alone switch. A `list_sessions` + `select_session`
   pair would close this.

4. **Read the last crash backtrace.** When `ensureLoaded` segfaulted
   in `shimInit`, I had to:
   - notice the next `status` call returned `socket read EOF`
   - guess that the gem had crashed
   - shell out to find the gem log
     (`/Users/jfoster/Documents/GemStone/db-1/log/gemnetobject_*.log`)
   - `grep -B2 -A20 "frame #" ...` to extract the C stack
   - identify which function and offset crashed (`shimInit + 36`)

   A `last_crash_backtrace` tool that returns the C stack + signal +
   thread state from the most recent `HostCoreDump` would turn a 4–5
   tool call investigation into one.

### Smaller gaps

5. **A `session_health` / `status` signal that the gem is dead.**
   Right now `status` returns the *cached* user/stone info even
   after the gem has died, and only fails when it actually tries
   to send. A health check would let me detect death before issuing
   a stray test run.

6. **Tool to compose multiple compiles + commit atomically.** I
   recompiled 9 test methods in this session, each via separate
   `compile_method` calls. A `compile_methods` (batch) variant
   would have made the "remove `self skip…` from every test" edit
   a single tool call. Same shape as how `eval_python` collapses
   multiple steps. Not a blocker — `compile_method` works.

7. **VS Code command access.** Not strictly an MCP-server gap, but
   relevant: a way for me to drive any registered VS Code command
   (the Jasper extension already has `gemstone-ide.session.logout`
   etc.). The cleanest fit is to surface them as MCP tools on the
   `gemstone` server — that keeps the security model centralized.

### What worked well this session

- `compile_method` + `delete_method` for tight edit cycles. I made
  ~15 method changes and never re-installed.
- `run_test_class` after each fix. Caught two genuine bugs
  (Py_None handling, wrong `groups` arg).
- `execute_code` for ad-hoc Smalltalk: reading `instVarAt:`,
  checking `(CPythonShim current) wrap: None`, etc. Fast.
- `get_method_source` to diff against my Edit before recompiling.
- `commit` was reliable. I committed 4× without surprises.

### Cost of the gaps in this session

Three relogs that required pinging the user, ~6 minutes of
user-interrupting handoffs (relog requests + me guessing the gem
had crashed before realizing it). One crash backtrace investigation
that required four shell commands when one MCP call would have done
it. Probably 15–20% of the session's wall clock.

The gaps are all in the **session lifecycle / process control**
column. The code-editing column is in great shape.
