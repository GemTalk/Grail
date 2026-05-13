# Jasper MCP Server — Suggested Additional Tests

Feedback from a Grail (GemStone-Python) project that uses Jasper's MCP
server as its primary edit-test diagnostic surface. This is a companion
to `MCP_Server_Feedback.md` (rounds 1–5), which records the regression
history that motivates each suggestion below.

The intent is to identify test gaps that map to *bugs that actually
shipped* in rounds 2–5, plus a few thinner-coverage areas visible from
how a real client (Claude Code) exercises the server.

## Scope of what was reviewed

- `mcp-server/src/__tests__/` — `index.test.ts`, `mcpSession.test.ts`,
  `tools.test.ts` (~1275 lines total)
- `client/src/__tests__/` — `mcpTools.test.ts`, `mcpSocketServer.test.ts`,
  `mcpSocketServerIntegration.test.ts`, `mcpHttpServer.test.ts`,
  `sunitQueries.test.ts`, `browserQueries.test.ts`, `codeExecutor.test.ts`

The current coverage is broad — 33 tools each have at least one
happy-path test, and the integration test at
`mcpSocketServerIntegration.test.ts` does a real socket round-trip
through the MCP SDK. The suggestions below are about *depth* in a few
specific call paths, not breadth.

## Priority 1 — gaps that map to real shipped regressions

### 1. Error-wrapper encoding tests

**Maps to:** rounds 2, 3, and 4 — every one of those regressions was in
the *error-formatting* path:

- Round 2: UTF-16 leak — `"E r r o r :   M e s s a g e N o t U n d e r s t o o d…"`
- Round 3: `Utf8 at:put:` against an invariant buffer
- Round 4: `asUtf8` typo (selector doesn't exist) → MNU on every tool
  that returns through the wrapper

The success-path encoding pattern (`WriteStream on: Unicode7 new` +
`encodeAsUTF8`) is exercised in `sunitQueries.test.ts`, but the
`"Error: <class> — <messageText>"` wrapper used by `eval_python` (and
implicitly by the message column in `list_failing_tests`) has no direct
test where the underlying `messageText` is non-ASCII or comes back as a
non-`Unicode7` class.

**Suggested test (in `tools.test.ts`):**

```ts
it('eval_python error wrapper encodes Unicode16 messageText as UTF-8', async () => {
  // mock the Grail pipeline to raise with messageText that is a Unicode16
  // (e.g. a method name containing a non-Latin-1 char, or any error whose
  // formatter pulls a Unicode16 description out of the exception)
  mockGciPerform.mockResolvedValueOnce(asUnicode16('…unicode error…'));
  const result = await tools.eval_python({ source: '…' });
  // Assert: no doubled bytes (UTF-16LE leak), no MNU, well-formed UTF-8
  expect(result).toMatch(/^Error: /);
  expect(Buffer.from(result, 'utf-8').toString('utf-8')).toEqual(result);
  expect(result).not.toMatch(/does not understand #'(asUtf8|at:put:)'/);
});
```

A single test of this shape — forcing the wrapper to receive a non-`Unicode7`
string — would have caught all three regressions before they shipped.

### 2. `list_failing_tests` no-args dedup

**Maps to:** Round 5 — the only remaining bug after the round-4 fix.
The no-args discovery path returned duplicate `(className, selector)`
rows. This is now fixed in the current build, but there is no regression
test for it.

[`tools.test.ts:870`](mcp-server/src/__tests__/tools.test.ts#L870) covers
the `classNames` and `classNamePattern` filters but not the no-args path,
which is the one that walked TestCase subclasses via two routes.

**Suggested test:**

```ts
it('list_failing_tests with no args returns each failure exactly once', async () => {
  // fixture: 3 TestCase classes, each with 2 failing tests
  mockTestDiscovery(...);
  const output = await tools.list_failing_tests({});
  const lines = output.trim().split('\n');
  const keys = lines.map(l => {
    const [, cls, sel] = l.split('\t');
    return `${cls}::${sel}`;
  });
  expect(new Set(keys).size).toBe(keys.length); // no duplicates
  expect(keys.length).toBe(6);
});
```

### 3. Grail-specific paths beyond "not detected"

**Why:** `eval_python` and `compile_python` are the most-used Grail-side
tools in real workflows, and the only coverage today is the
`Grail not detected` hint at
[`tools.test.ts:694`](mcp-server/src/__tests__/tools.test.ts#L694). The
two tools collapse the entire `/tmp/diag*.gs` workflow into one MCP
call; thin coverage here means regressions show up first in client
sessions, as rounds 2–5 demonstrated.

**Suggested tests (with Grail mocked-loaded):**

```ts
describe('eval_python (Grail loaded)', () => {
  it('returns printString for a simple expression', async () => {
    mockGrailEval('2 + 3', '5');
    expect(await tools.eval_python({ source: '2 + 3' })).toBe('5');
  });

  it('formats CompileError as Error: CompileError — …', async () => {
    mockGrailEvalRaises('undefined_var', { class: 'CompileError', message: 'undefined symbol  undefined_var' });
    const r = await tools.eval_python({ source: 'undefined_var' });
    expect(r).toMatch(/^Error: CompileError — /);
    expect(r).toContain('undefined_var');
  });

  it('formats runtime MNU as Error: MessageNotUnderstood — …', async () => {
    mockGrailEvalRaises('…', { class: 'MessageNotUnderstood', message: '…' });
    expect(await tools.eval_python({ source: '…' })).toMatch(/^Error: MessageNotUnderstood — /);
  });

  it('accepts multi-line input (def + call)', async () => {
    mockGrailEval('def f(n):\n    return n * 2\nf(5)', '10');
    expect(await tools.eval_python({
      source: 'def f(n):\n    return n * 2\nf(5)',
    })).toBe('10');
  });
});

describe('compile_python (Grail loaded)', () => {
  it('returns generated Smalltalk source', async () => {
    mockGrailCompile('bool(1)', '(bool @env1:__new__: (1)).');
    expect(await tools.compile_python({ source: 'bool(1)' })).toContain('@env1:__new__:');
  });
});
```

The multi-line case in particular is something Round 5 explicitly
verified by hand (`def factorial(n): …; factorial(5) → 120`) and which
has no test today.

## Priority 2 — quality-of-life gaps

### 4. Argument-validation error quality

**Why:** Round 1 issue 4 — when I passed `methodName` instead of
`selector`, or omitted `isMeta` on `get_method_source`, the error was a
raw zod "expected boolean, received undefined" with no hint at which
field. The integration test at `mcpSocketServerIntegration.test.ts`
checks *that* validation fires, but not that the message names the
field.

**Suggested test:**

```ts
describe.each(allTools)('argument validation for %s', (toolName) => {
  it('returns a message that names the missing required field', async () => {
    for (const requiredField of getRequiredFields(toolName)) {
      const args = makeValidArgsFor(toolName);
      delete args[requiredField];
      const err = await callAndCaptureError(toolName, args);
      expect(err.message).toContain(requiredField);
    }
  });
});
```

This is a single parameterized loop that protects every tool's
parameter docs from drift.

### 5. Large-output behavior

**Why:** Currently no test exercises a tool whose output crosses
whatever the buffer limit downstream is (GCI fetch-string, Topaz output,
or the MCP SDK's content-length cap). `list_failing_tests` with no args
already returns ~100 rows in a real Grail session; an order-of-magnitude
larger fixture would surface any hidden truncation.

**Suggested test:** generate a fixture with ~5000 failing tests, run
`list_failing_tests` no-args, assert either intact output or a clean
truncation marker (rather than a silent cutoff).

### 6. `environmentId` default behavior beyond the search trio

**Why:** `find_implementors`, `find_senders`, `find_references_to` have
explicit env-0 → env-1 fallback tests. `get_method_source` and
`compile_method` accept the same optional `environmentId` but only have
happy-path coverage. For projects whose code lives entirely in env 1
(Grail), the default-resolution behavior of these tools matters too.

**Suggested test:** for each tool that accepts `environmentId`,
parameterized cases for `{ omitted, 0, 1 }` and assert the expected
lookup behavior.

## Out-of-scope but worth noting

- **Tool description / schema quality:** Round 1 issue 4 is partly
  about parameter docs ("the parameter is `selector`, not `methodName`,
  and the error didn't suggest the right name"). That's primarily fixed
  by improving the zod schemas' `.describe(...)` calls, not by tests —
  but a smoke test asserting that every tool has a non-empty
  `description` and that every parameter has a non-empty `description`
  would catch undocumented additions before they ship.
- **End-to-end Grail integration:** Building a fixture stone with Grail
  loaded into the test harness is probably more setup than it's worth;
  mocked-pipeline tests as in §3 give most of the coverage for
  significantly less infrastructure.

## What's already well covered (no change suggested)

- `describe_test_failure` — three exception classes including the
  `mnuReceiver` / `mnuSelector` / `stackReport` shape
- `refresh` — both clean-session and dirty-session paths
- env-0 → env-1 fallback for the search trio
- `commit` / `abort` transaction pair
- The integration test in `mcpSocketServerIntegration.test.ts` already
  does a real socket round-trip through the MCP SDK, which is more than
  many MCP servers ship

## Summary table

| Priority | Test | Maps to bug | Effort |
|----------|------|-------------|--------|
| P1 | Error wrapper with Unicode16 `messageText` | Rounds 2, 3, 4 | ~20 lines |
| P1 | `list_failing_tests` no-args dedup | Round 5 | ~15 lines |
| P1 | Grail-loaded `eval_python` (success, compile error, runtime error, multi-line) | Coverage thin on most-used tool | ~80 lines |
| P1 | Grail-loaded `compile_python` (happy path) | Coverage thin on most-used tool | ~10 lines |
| P2 | Argument-validation error names the missing field | Round 1 issue 4 | ~30 lines |
| P2 | Large-output behavior | Latent | ~25 lines |
| P2 | `environmentId` default for `get_method_source` / `compile_method` | Latent | ~30 lines |

The P1 group has the strongest signal — each entry maps to a specific
shipped regression and the tests are small. The P2 group is
quality-of-life and protects against regressions that haven't happened
yet but plausibly could.

---

## Response from the Jasper side

Reviewed against the actual test layout in the Jasper repo. The doc is
thoughtful, but most of the P1/P2 gaps it identifies are already covered
— usually by tests in directories the doc didn't enumerate. Specifically,
the scope-of-review section lists `mcp-server/src/__tests__/` and
`client/src/__tests__/` but the bulk of the regression guards for the
rounds-2–5 incidents actually live in:

- `client/src/queries/__tests__/structuredQueries.test.ts` —
  structural assertions over the *generated Smalltalk source* for every
  query, including the python and runFailingTests paths
- `client/src/__tests__/gci/querySelectors.smoke.test.ts` and
  `querySunit.smoke.test.ts` — live-GCI probes that send each
  hardcoded selector to its receiver class and assert
  `canUnderstand:` on a real stone
- `client/src/__tests__/mcpZodErrorMap.test.ts` — the parameter-naming
  error-map behavior

Section-by-section:

### P1 #1 — Error-wrapper encoding tests

**Already covered, and the proposed test shape would not catch the bug
class it's aimed at.**

The rounds-2/3/4 regressions were all in Smalltalk source. `mockGciPerform`
(or whatever mocks `executeFetchString` in JS) only ever sees a JS string
*after* GCI has already decoded the wire bytes — the "messageText is
Unicode16" distinction doesn't survive the boundary, so mocking the
pipeline to "return a Unicode16" isn't expressible from JS.

What's actually defending these regressions:

- `structuredQueries.test.ts` § "python (Grail) queries" pins every
  regressed anti-pattern as a structural assertion on the generated
  Smalltalk: requires `WriteStream on: Unicode7 new` and
  `result encodeAsUTF8`; forbids `'Error: ' , e class name` (round-2
  widening), `WriteStream on: Utf8 new` (round-3 immutability), and
  `asInteger < 128` + `ifFalse: [$?]` (round-3-revised lossy gating).
- `querySelectors.smoke.test.ts` is a live-GCI probe that asserts
  `Unicode7/16/32 canUnderstand: #encodeAsUTF8` and
  `Unicode7 canUnderstand: #'at:put:'` on a real stone — this is the
  exact shape that catches the round-4 `asUtf8` typo (and any future
  selector rename in this family) before any tool is invoked.

That combination is strictly stronger than the suggested mock: it
catches both the encoding-class mistakes *and* the selector-existence
mistakes, against a real GemStone session.

### P1 #2 — `list_failing_tests` no-args dedup

**Already covered.**

`structuredQueries.test.ts` includes a test "skips abstract TestCase
classes in the no-args discovery walk" that asserts `v isAbstract not`
is in the discover-all snippet. That predicate *is* the round-5 fix
(per the comment in `runFailingTests.ts` explaining that an abstract
TestCase's `suite` cascades into its subclasses, so including both the
parent and the leaves runs every leaf test twice). The proposed
fixture-based dedup test would re-verify the symptom; pinning the
mechanism is more durable.

### P1 #3 — Grail-specific paths beyond "not detected"

**Mixed — basic happy paths covered, multi-line input genuinely is not.**

- Happy-path coverage exists: `tools.test.ts` § "eval_python"/"compile_python"
  cover the non-nil success case with a mocked GCI return, and
  `mcpTools.test.ts` covers the JS-side delegation through
  `python.evalPython` / `python.compilePython`.
- CompileError / runtime MNU formatting: the
  `Error: <class> — <messageText>` shape is already pinned by the
  structural tests cited under #1 (the WriteStream-with-Unicode7 +
  encodeAsUTF8 path produces exactly that format). Adding a separate
  end-to-end test would require a real Grail stone fixture, which the
  doc itself flags as out of scope.
- Multi-line input is the one case worth adding cheaply: the
  `escapeString` round-trip for `\n`-containing Python source has no
  direct test today, and a 3-line unit test in
  `structuredQueries.test.ts` would close it.

### P2 #4 — Argument-validation error quality

**Already done.**

`client/src/__tests__/mcpZodErrorMap.test.ts` is the parameterized
"names the missing field" suite this suggestion asks for. It covers:

- `"Missing required parameter 'isMeta'"` — the exact text suggested
- nested path notation (`outer.inner`)
- "Parameter 'X' must be boolean, received string" for wrong-type
- per-shape attachment so the SDK's no-override `safeParse` picks it
  up (with a guard that the global zod config is *not* mutated, since
  that's what makes the approach SDK-safe)

The original Round-1 issue 4 ("expected boolean, received undefined"
with no hint at which field) was addressed by `mcpErrorMap` itself,
not just by tests — the test file is the regression guard for that
fix.

### P2 #5 — Large-output behavior

**Genuinely uncovered. Worth adding.**

The useful version is probably unit-scale rather than 5000-row: assert
that `MAX_MSG = 1024` in `runFailingTests.ts` actually clips a long
captured exception text, and that the total cap keeps a pathological
case under MAX_RESULT. A 5000-row fixture mostly exercises GCI's
buffer, not Jasper code.

### P2 #6 — `environmentId` default for `get_method_source` / `compile_method`

**Misreads the env semantics.**

The env-0 → env-1 fallback only applies to the search trio
(`find_implementors` / `find_senders` / `find_references_to`) because
those tools have a "not found" outcome and can usefully retry in the
other env. `get_method_source` and `compile_method` take a specific
class plus env and either succeed or raise — there's no fallback
behavior to test. The env-handling that *does* matter is already
covered:

- `getMethodSource.test.ts` exercises env=0 (no clause emitted) and
  env=2 (explicit `environmentId:` clause)
- `writePathQueries.test.ts` pins env=0 as the default for
  `compile_method`

### Net recommendation

Two items land:

1. **Multi-line `eval_python` input round-trip** — ~5 lines, the only
   Grail-side path the structural tests don't already touch.
2. **`MAX_MSG` clipping in `runFailingTests`** — the real "large
   output" gap that maps to Jasper code rather than GCI buffer
   behavior.

The remaining suggestions are either already covered or rest on
assumptions about the JS↔Smalltalk boundary that don't quite hold. The
fastest way to recalibrate this kind of suggestion in future rounds is
to look under `client/src/queries/__tests__/` (structural assertions
over generated Smalltalk source) and `client/src/__tests__/gci/`
(live-GCI selector probes), not just the two `__tests__/` directories
in the doc's scope-of-review section — the round-2/3/4/5 regressions
each have their primary guard in one of those two places.

---

## Follow-up from the Grail side

The Jasper response is correct on every technical point. Five of the
seven suggestions withdraw; two land. Reproducing the conclusions here
so a future round of this exercise starts from the right place.

### Suggestions that land

1. **Multi-line `eval_python` input round-trip.** The `escapeString`
   path for `\n`-containing Python source has no direct test today; a
   ~5-line assertion in `structuredQueries.test.ts` closes it. Round 5
   verified the case (`def factorial(n): …; factorial(5) → 120`) by
   hand.
2. **`MAX_MSG = 1024` clipping in `runFailingTests`.** Unit-scale
   assertion that a long captured exception text is actually clipped
   (and that the total cap keeps a pathological case under
   `MAX_RESULT`). This maps to Jasper code rather than to GCI buffer
   behavior, which is the right scope for a Jasper test.

### Suggestions that withdraw (and why, briefly)

- **Error-wrapper encoding (P1 #1):** `executeFetchString` returns a JS
  string after GCI has decoded the wire bytes — the "messageText is
  Unicode16" distinction doesn't survive the JS↔Smalltalk boundary, so
  the bug class isn't expressible via JS-side mocks. The actual guard
  lives in `structuredQueries.test.ts` (pins `WriteStream on: Unicode7
  new` + `result encodeAsUTF8`, forbids the regressed anti-patterns)
  plus `querySelectors.smoke.test.ts` (live-GCI `canUnderstand:` probe
  for `encodeAsUTF8`).
- **`list_failing_tests` dedup (P1 #2):** A fixture-based test of the
  symptom is weaker than `structuredQueries.test.ts`'s assertion that
  `v isAbstract not` appears in the discover-all snippet — which is the
  actual mechanism, since an abstract `TestCase`'s `suite` cascades to
  subclasses and including both parent and leaves runs every leaf twice.
- **`Error: <class> — …` formatting in Grail paths (part of P1 #3):**
  Pinned by the same structural tests as #1; the format falls out of the
  WriteStream-with-Unicode7 + encodeAsUTF8 path.
- **Argument-validation error quality (P2 #4):** Already implemented as
  `mcpZodErrorMap.test.ts`, which covers the "names the missing field"
  case, the nested-path notation, the wrong-type case, and the guard
  that the global zod config isn't mutated. The original Round-1 issue
  was fixed by the `mcpErrorMap` itself; that test file is its guard.
- **`environmentId` default for `get_method_source` / `compile_method`
  (P2 #6):** I conflated "default behavior" with "fallback behavior."
  The env-0 → env-1 *fallback* is meaningful only for the search trio
  because those have a "not found" outcome. `get_method_source` and
  `compile_method` either succeed or raise; their env handling is
  already covered in `getMethodSource.test.ts` (env=0 emits no clause;
  env=2 emits an explicit `environmentId:` clause) and
  `writePathQueries.test.ts` (env=0 default for `compile_method`).

### Methodology note for future rounds

The original review enumerated `mcp-server/src/__tests__/` and
`client/src/__tests__/` but missed two directories that hold most of the
relevant regression guards:

- `client/src/queries/__tests__/` — structural assertions over the
  *generated Smalltalk source* of every query, including the python and
  runFailingTests paths. This is where regressions in emitted code are
  caught, and is the right place to add the multi-line `eval_python`
  round-trip test above.
- `client/src/__tests__/gci/` — live-GCI smoke probes that send
  hardcoded selectors to their receiver classes on a real stone. This
  is the layer that caught the round-4 `asUtf8` typo and would catch
  any future selector rename in this family.

Two heuristics for next time:

1. **When proposing a JS-side test for a bug whose root cause is in
   Smalltalk source, first check whether the structural test for that
   query already pins the pattern.** A JS mock can only assert on
   post-decode strings; it cannot reproduce class-of-string distinctions
   that live below the GCI boundary.
2. **Distinguish "fallback" from "default" when talking about
   `environmentId`.** Only the search trio has a meaningful fallback,
   because only those tools have a "not found" outcome worth retrying.

### What this round did contribute

Even with five of seven suggestions withdrawing, the exercise wasn't
zero-value: the two items that land are real, and the response itself
serves as durable documentation of *why* the rounds-2–5 regressions are
guarded the way they are. If a future contributor proposes a similar
JS-side mock for an encoding bug, this section now points them at the
right layer.
