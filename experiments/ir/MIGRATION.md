# Wiring IR emission into Grail: the migration plan

Findings from a survey of the production codegen pipeline (importlib.gs,
PythonAst/), distilled into the order of attack. Companion to README.md,
which covers what the IR layer itself can do.

## Where the seam is

**`importlib.gs` ~663–672, the top-level-def loop** inside
`importlib class >> ___buildModuleClassBody:name:` — the one place a whole
Python `def` becomes a whole Smalltalk method in a single step:

```smalltalk
stmt generateModuleMethodSourceOn: methodStream.          "text emit"
moduleClass compileMethod: methodStream contents
    dictionaries: sl category: 'Grail-Methods' environmentId: 1.
```

The IR path is a guarded alternative branch at exactly this site:

```smalltalk
(stmt ___irEligible___ and: [importlib ___irCodegenEnabled___])
    ifTrue: [stmt ___installIRMethodOn___: moduleClass]
    ifFalse: [ "existing text path" ].
```

Everything the IR path needs is already decided outside the emitter and is
reused verbatim: selector (`FunctionDefAst>>moduleMethodSelector`), arity,
target class, env 1. The stub pre-pass (importlib.gs ~577) compiles arity
stubs for every top-level def first, which means (a) an IR-built method just
replaces a stub, so nothing downstream cares how it was produced, and (b)
the env-1 method dictionary already exists — the exact prerequisite
`06_env1.tpz` documents.

## Why module-level defs first (and what NOT to start with)

* **Class methods** fork at three sites in ClassDefAst.gs and are *deferred*:
  their source strings are embedded as literals inside emitted runtime
  `___compileMethod:` statements. An IR tree cannot be embedded in a source
  literal, so class methods need a different transport (e.g. a class-side
  IR table + an `___installIRMethod:` runtime call). Later step.
* **Nested defs / lambdas** are inline blocks in the enclosing method's
  source — no seam short of building the whole enclosing method as IR.
* **Module body** (`initialize`) and **doits** (exec/eval/REPL,
  ModuleAst>>executeWithScope:as:) are separate, later steps — note the
  anonymous-do-it shape (`_compileInContext:` → `_executeInContext:`) has an
  IR twin already proven in the experiments.

## The eligibility predicate

No existing "is this def simple" test, but the pieces are all on
`FunctionDefAst` and cheap to compose:

* `isSimplePositionalArgs`, and NOT `compilesAsVarargs` /
  `needsVarargsForwarder` / `needsFixedArityForwarders`
* NOT `isGenerator` / `isAsync` / `___wrapsBody___` /
  `body hasReturnBlocking` (these force `returnEmitMode: #exception`;
  the target subset is always `#directMethod`)
* empty `decorator_list`, no annotations / signature spec
* a recursive node-class whitelist over the body: Assign, Expr, Return, If,
  While, Break, Continue, Pass, Name, Constant, BinOp, Compare, Call.

Start narrow; every construct the whitelist admits is already proven in
`experiments/ir/` (including break/continue on a `grail-ir-loop-goto` VM).

## The feature flag

House style is a memoized env-var read — copy
`importlib class >> ___codegenTraceDir___` exactly (SessionTemps-cached,
paired `___Invalidate___` for tests): **`GRAIL_IR_CODEGEN`**, registered in
the env-var list in `os.gs`.

## The traceback obligation (part of the first cut, not a follow-up)

Today Python line numbers are *baked into the generated text*: every
statement is preceded by a `___curPos___ := N.` store, and
`BaseException class >> ___derivePythonLineForMethod___:ip:` recovers the
line by string-scanning `_sourceAtIp:` output for that store. A frame is
*recognized as Python* by that scan succeeding — an IR-compiled method has
no `___curPos___` text, so without work it silently vanishes from
tracebacks.

The IR path replaces the mechanism outright: the AST already carries
1-based character offsets into the module source (`AbstractLocationNode`
`beginPosition`/`endPosition`, `sourceString`), which is exactly the
`fileName:source:` + `srcOffset:` pair the experiments proved gives native
Python step points and stack-report lines. So the first cut must:

1. stamp `srcOffset:` from `beginPosition` on every emitted node, and set
   `fileName:source:` from the module path + `sourceString`;
2. teach `___derivePythonLineForMethod___:ip:` a second recognition path
   for IR methods — and it becomes the *cheap* path: `_sourceOffsetsAt:`
   (step point from ip) + a line table over the Python source, no string
   scanning. `10_srcmap_break.tpz` demonstrates the mapping surviving
   loops and gotos.

## What the IR builder must know from compile context

The text emitters read ~40 statics via `CallAst class >> ___compileContext___`.
The minimal subset for the first cut: `moduleClassBeingCompiled`,
`moduleVariableNames` (module-global vs temp: module globals are
`dynamicInstVarAt:` sends, NOT temps), `moduleFunctionNames`,
`functionBeingCompiled`, `returnEmitMode`. The parameter-shadow decision
(`paramNeedsTemp:assigned:instVars:`) transfers unchanged — the VM refuses
arg stores at the IR level too.

## Order of work

1. `PyIRBuilder` hardening: env-1 install (`persistentMethodDictForEnv: 1`),
   target dictionary from context, `at:`-offset variants on constructors,
   name resolution split (module global / local temp / builtin).
2. `GRAIL_IR_CODEGEN` flag + `___irEligible___` + the one-site branch in
   `___buildModuleClassBody:name:`.
3. The `___derivePythonLineForMethod___:ip:` second path + tests that a
   traceback through an IR method names the right Python file/line.
4. Fixture + SUnit coverage; tier-2 CPython suite run (this touches
   importlib.gs and PythonAst — shared machinery by definition).
5. Then widen: more node types, module body, class methods (IR-table
   transport), nested defs.

## Progress — cut 1 (landed on feat/ir-codegen)

The seam is live behind `GRAIL_IR_CODEGEN` (off by default), for a deliberately
narrow node subset, proven end to end.

* **Flag** — `importlib class >> ___irCodegenEnabled___` (SessionTemps-cached
  env read, paired `___irCodegenEnabledInvalidate___` + a test-only
  `___irCodegenForce___:`), registered in `os.gs`. Observability counters:
  `___irStats___` reports `compiled` / `fallbacks` / `lastError`.
* **Builder** — `PythonAst::PyMethodIRBuilder`, the production sibling of
  `experiments/ir/PyIRBuilder.gs`: resolves the `GsCom*` node classes through
  the `GsCompilerClasses` dictionary (they are NOT on the runtime symbol list),
  installs into env 1, holds a name→leaf map for locals.
* **Eligibility** — `FunctionDefAst >> ___irEligible___`: module-level, simple
  positional, non-generator/async, direct-return, no decorators / annotations /
  PEP-695 type params, read-only params, and a body whitelist enforced by
  double-dispatch (`___irEligibleStatementLocals___:` /
  `___irEligibleValueLocals___:`). Cut-1 nodes: **Pass, Return, Expr** over
  **Constant** (bool / None / str / int / float / bytes) and **Name** (a plain
  parameter load).
* **Emit** — `___emitIRStatementOn___:` / `___emitIRValueOn___:` on those nodes,
  `FunctionDefAst >> ___installIRMethodOn___:` driving the builder.
* **Safety** — the seam tries IR only for an eligible def and **falls back to
  the text path on ANY error**, so an eligibility gap or an emitter bug never
  costs correctness; flag-off is the text path verbatim.
* **Tests** — `tests/python/ir_codegen_smoke.py` (CPython-validated) +
  `PythonTests::IRCodegenSmokeTestCase` (forces the flag, asserts correct values
  AND `compiled = 9, fallbacks = 0`). Full SUnit suite green with the flag off
  (6080/6080); the IR test green with the flag forced on.

Deferred to the next cuts (each falls back cleanly today): **source mapping +
the `___derivePythonLineForMethod___:ip:` second path** (step 3 — an IR frame
currently has no `___curPos___` to scan, so it drops from tracebacks), then
**Assign, BinOp, Compare, Call, If, While**, module globals / builtins, and
parameter temps.
