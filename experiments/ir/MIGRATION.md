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

## The cut log

One file per cut, under [`migration/`](migration/), oldest first. The list
below is GENERATED — run `python3 scripts/regen_migration_index.py` after
adding a cut, and re-run it rather than hand-merging if two cuts collide here.

<!-- BEGIN GENERATED CUT LOG -->
* [Progress — cut 1 (landed on feat/ir-codegen)](migration/001-cut-1-landed-on-feat-ir-codegen.md)
* [Progress — cut 2 (source attachment)](migration/002-cut-2-source-attachment.md)
* [Progress — cut 3 (arithmetic + unary operators)](migration/003-cut-3-arithmetic-unary-operators.md)
* [Progress — cut 4 (unchained rich comparisons)](migration/004-cut-4-unchained-rich-comparisons.md)
* [What the next big cut needs: the control-flow / block machinery](migration/005-what-the-next-big-cut-needs-the-control-flow-block-machinery.md)
* [Progress — cut 5 (block machinery + `if`/`elif`/`else`)](migration/006-cut-5-block-machinery-if-elif-else.md)
* [Progress — cut 6 (assignment + body locals)](migration/007-cut-6-assignment-body-locals.md)
* [Progress — cut 7 (IR methods are first-class in tracebacks)](migration/008-cut-7-ir-methods-are-first-class-in-tracebacks.md)
* [Progress — cut 8 (bare-name builtin calls)](migration/009-cut-8-bare-name-builtin-calls.md)
* [Progress — cut 9 (attribute load + plain subscript)](migration/010-cut-9-attribute-load-plain-subscript.md)
* [Progress — cut 10 (boolean `and` / `or`)](migration/011-cut-10-boolean-and-or.md)
* [Progress — cut 11 (augmented assignment)](migration/012-cut-11-augmented-assignment.md)
* [Progress — cut 12 (tuple / list literals)](migration/013-cut-12-tuple-list-literals.md)
* [Progress — cut 13 (attribute calls, legacy load-then-call form)](migration/014-cut-13-attribute-calls-legacy-load-then-call-form.md)
* [Progress — cut 14 (while loops + break/continue, relaxed flow analysis)](migration/015-cut-14-while-loops-break-continue-relaxed-flow-analysis.md)
* [Progress — cut 15 (module self-sends)](migration/016-cut-15-module-self-sends.md)
* [Progress — cut 16 (chained comparisons)](migration/017-cut-16-chained-comparisons.md)
* [Progress — cut 17 (unary not + conditional expressions)](migration/018-cut-17-unary-not-conditional-expressions.md)
* [Progress — cut 18 (for loops)](migration/019-cut-18-for-loops.md)
* [Progress — cut 19 (dict / set literals)](migration/020-cut-19-dict-set-literals.md)
* [Progress — cut 20 (is / is not / in / not in, unchained)](migration/021-cut-20-is-is-not-in-not-in-unchained.md)
* [Progress — cut 21 (subscript / attribute assignment targets)](migration/022-cut-21-subscript-attribute-assignment-targets.md)
* [Progress — cut 22 (general name loads + raise)](migration/023-cut-22-general-name-loads-raise.md)
* [Progress — cut 23 (try / except, single handler)](migration/024-cut-23-try-except-single-handler.md)
* [Progress — cut 24 (try / finally)](migration/025-cut-24-try-finally.md)
* [Progress — cut 25 (except tuples, in-handler bare `raise`, `raise … from …`)](migration/026-cut-25-except-tuples-in-handler-bare-raise-raise-from.md)
* [Progress — cut 26 (multi-clause `except` with the shield, `try/else`)](migration/027-cut-26-multi-clause-except-with-the-shield-try-else.md)
* [Progress — cut 27 (assert, slices, del)](migration/028-cut-27-assert-slices-del.md)
* [Progress — cut 28 (call shapes: class constructors, keyword arguments, general callees)](migration/029-cut-28-call-shapes-class-constructors-keyword-arguments.md)
* [Progress — cut 29 (reassigned parameters)](migration/030-cut-29-reassigned-parameters.md)
* [Progress — cut 30 (function-level `import`)](migration/031-cut-30-function-level-import.md)
* [Progress — cut 31 (the recursive flow analysis)](migration/032-cut-31-the-recursive-flow-analysis.md)
* [Progress — cut 32 (`from x import y`, multi-alias imports, `del name`)](migration/033-cut-32-from-x-import-y-multi-alias-imports-del-name.md)
* [Progress — cut 33 (tuple / list unpacking targets)](migration/034-cut-33-tuple-list-unpacking-targets.md)
* [Progress — cut 34 (the `with` statement)](migration/035-cut-34-the-with-statement.md)
* [Progress — cut 35 (late-bound module names)](migration/036-cut-35-late-bound-module-names.md)
* [Progress — cut 36 (the class-method seam: plain instance methods)](migration/037-cut-36-the-class-method-seam-plain-instance-methods.md)
* [Progress — cut 40 (parameter defaults: the varargs `_name:kw:` form)](migration/038-cut-40-parameter-defaults-the-varargs-name-kw-form.md)
* [Progress — cut 41 (`*args` and `**kwargs`)](migration/039-cut-41-args-and-kwargs.md)
* [Progress — cut 42 (keyword-only parameters)](migration/040-cut-42-keyword-only-parameters.md)
* [Progress — cut 43 (positional-only parameters in the varargs form)](migration/041-cut-43-positional-only-parameters-in-the-varargs-form.md)
* [Batch 6: the two lanes merged](migration/042-batch-6-the-two-lanes-merged.md)
* [Progress — cut 44 (class-body methods on the varargs selector)](migration/043-cut-44-class-body-methods-on-the-varargs-selector.md)
* [Progress — cut 45 (classes whose backing instVars are unknown)](migration/044-cut-45-classes-whose-backing-instvars-are-unknown.md)
* [Batch 7 after merging main (#836)](migration/045-batch-7-after-merging-main-836.md)
* [Progress — cut 47 (annotations) and cut 48 (decorators)](migration/046-cut-47-annotations-and-cut-48-decorators.md)
* [Progress — cuts 49-50 (varargs self-sends; module-function reads in methods)](migration/047-cuts-49-50-varargs-self-sends-module-function-reads-in-methods.md)
* [Progress — cut 51 (`__slots__` classes) and cut 52 (annotated assignment)](migration/048-cut-51-slots-classes-and-cut-52-annotated-assignment.md)
* [Progress — cut 53 (generators)](migration/049-cut-53-generators.md)
* [Progress — cut 54 (async defs)](migration/050-cut-54-async-defs.md)
* [Progress — cut 55 (`super()`, `super(C, obj)`, `__class__`, `type` inside methods)](migration/051-cut-55-super-super-c-obj-class-type-inside-methods.md)
* [Progress — cut 56 (call-site `*args` / `**kw` splats; starred tuple and list displays)](migration/052-cut-56-call-site-args-kw-splats-starred-tuple-and-list.md)
* [Progress — cut 57 (list comprehensions)](migration/053-cut-57-list-comprehensions.md)
* [Progress — cut 58 (set and dict comprehensions)](migration/054-cut-58-set-and-dict-comprehensions.md)
* [Progress — cut 59 (generator expressions)](migration/055-cut-59-generator-expressions.md)
* [Progress — cut 60 (the receiver need not be named `self`) and cut 61 (`@classmethod`)](migration/056-cut-60-the-receiver-need-not-be-named-self-and-cut-61.md)
* [Progress — cut 62 (augmented assignment to attribute and subscript targets)](migration/057-cut-62-augmented-assignment-to-attribute-and-subscript-targets.md)
* [Progress — cut 63 (chained assignment)](migration/058-cut-63-chained-assignment.md)
* [Progress — cut 64 (nested defs: the closure block inside the enclosing IR method)](migration/059-cut-64-nested-defs-the-closure-block-inside-the-enclosing-ir.md)
* [Progress — cut 65 (lambdas)](migration/060-cut-65-lambdas.md)
* [Progress — cut 66 (`nonlocal`, and annotated nested defs)](migration/061-cut-66-nonlocal-and-annotated-nested-defs.md)
* [Progress — cut 67 (`@staticmethod`)](migration/062-cut-67-staticmethod.md)
* [Progress — cut 68 (the long tail, part 1: Ellipsis, builtins as values, `raise Cls(kw=...)`, loop `else`)](migration/063-cut-68-the-long-tail-part-1-ellipsis-builtins-as-values-raise.md)
* [Progress — cut 69 (the long tail, part 2: `global` declarations and the walrus)](migration/064-cut-69-the-long-tail-part-2-global-declarations-and-the-walrus.md)
* [Progress — cut 70 (parameters and locals spelled like Smalltalk pseudo-variables)](migration/065-cut-70-parameters-and-locals-spelled-like-smalltalk-pseudo.md)
* [Progress — cut 71 (flow: what a `while True` loop leaves bound)](migration/066-cut-71-flow-what-a-while-true-loop-leaves-bound.md)
* [Progress — cut 72 (reads the flow analysis cannot prove bound carry the text's guard)](migration/067-cut-72-reads-the-flow-analysis-cannot-prove-bound-carry-the.md)
* [Progress — cut 74 (a nested def whose parameters or locals are pseudo-variables)](migration/068-cut-74-a-nested-def-whose-parameters-or-locals-are-pseudo.md)
* [Progress — cut 75 (a lambda parameter spelled like a pseudo-variable)](migration/069-cut-75-a-lambda-parameter-spelled-like-a-pseudo-variable.md)
* [Progress — the flag-on `with` position stamp (2026-09-10)](migration/070-the-flag-on-with-position-stamp.md)
* [Where we are (2026-09-08, after cuts 74-75) — and a census caveat](migration/071-where-we-are-2026-09-08-after-cuts-74-75-and-a-census-caveat.md)
* [After merging main: the `with` protocol load, and what the flag-on residue is now](migration/072-after-merging-main-the-with-protocol-load-and-what-the-flag.md)
* [Progress — cut 73 (the position map for IR frames)](migration/073-cut-73-the-position-map-for-ir-frames.md)
* [Reconciling cut 73 with PR #878 (the text lane's line refinement)](migration/074-reconciling-cut-73-with-pr-878-the-text-lane-s-line-refinement.md)
* [The census is reproducible again — and corpus 2 was overstated](migration/075-the-census-is-reproducible-again-and-corpus-2-was-overstated.md)
* [Progress — cut 76 (the method-local class, as a compiled-text helper)](migration/076-cut-76-the-method-local-class-as-a-compiled-text-helper.md)
* [Progress — cut 77 (a method-local class that captures)](migration/077-cut-77-a-method-local-class-that-captures.md)
* [Progress — cut 78 (the captured local, carried BY REFERENCE)](migration/078-cut-78-the-captured-local-carried-by-reference.md)
* [Progress — cut 79 (the method-local class's own METHOD BODIES)](migration/079-cut-79-the-method-local-class-s-own-method-bodies.md)
* [Progress — cut 80 (the two literals that are really constructor sends)](migration/080-cut-80-the-two-literals-that-are-really-constructor-sends.md)
* [Progress — cut 81 (the class-method closure CELL)](migration/081-cut-81-the-class-method-closure-cell.md)
* [Progress — cut 82 (the class statement's DECORATORS and metaclass KEYWORDS)](migration/082-cut-82-the-class-statement-s-decorators-and-metaclass-keywords.md)
* [Progress — cut 83 (bare `globals()`, and what the census row's name hides)](migration/083-cut-83-bare-globals-and-what-the-census-row-s-name-hides.md)
* [Progress — cut 84 (`locals()` / `vars()`, and a gate that was skipping the file)](migration/084-cut-84-locals-vars-and-a-gate-that-was-skipping-the-file.md)
* [Progress — cut 85 (`dir()`, and a census family that was mostly a naming bug)](migration/085-cut-85-dir-and-a-census-family-that-was-mostly-a-naming-bug.md)
* [Progress — cut 86 (`super` as a VALUE, and what the biggest row was hiding)](migration/086-cut-86-super-as-a-value-and-what-the-biggest-row-was-hiding.md)
* [Progress — `global` + `except ... as` under IR (2026-09-10)](migration/087-global-except-as-under-ir.md)
* [The `classNotAtModuleScope` row was one shape, not two (2026-09-11)](migration/088-the-classnotatmodulescope-row-was-one-shape-not-two.md)
* [Checking the `super` row's name: this one was honest (2026-09-11)](migration/089-checking-the-super-row-s-name-this-one-was-honest.md)
* [The board after the class-cell and class-body cuts (2026-09-11)](migration/090-the-board-after-the-class-cell-and-class-body-cuts.md)
* [Where we are (2026-09-10, after cuts 81-86)](migration/091-where-we-are-2026-09-10-after-cuts-81-86.md)
* [The flag-on CPYTHON SUITE, measured for the first time (2026-09-10)](migration/092-the-flag-on-cpython-suite-measured-for-the-first-time.md)
* [Roadmap — what blocks real code, ranked (census of 2026-09-06)](migration/093-roadmap-what-blocks-real-code-ranked-census-of-2026-09-06.md)
* [Where batch 4 leaves the deferred list](migration/094-where-batch-4-leaves-the-deferred-list.md)
* [The argument-0 cut, and a refusal that was never about argument 0 (2026-09-11)](migration/095-the-argument-0-cut-and-a-refusal-that-was-never-about.md)
* [`shape:TryAst` is one exit, not nine: it is all `except*` (2026-09-11)](migration/096-shape-tryast-is-one-exit-not-nine-it-is-all-except.md)
* [The reserved-name cut: a guard wider than the text it guarded (2026-09-11)](migration/097-the-reserved-name-cut-a-guard-wider-than-the-text-it-guarded.md)
* [The nonlocal write-back family: 42 rows, and what it actually costs (2026-09-12)](migration/098-the-nonlocal-write-back-family-42-rows-and-what-it-actually.md)
* [The module-call probe was costing two frames per call (2026-09-12)](migration/099-the-module-call-probe-was-costing-two-frames-per-call.md)
* [The frame-sensitive rows were two cuts wearing one name (2026-09-13)](migration/100-the-frame-sensitive-rows-were-two-cuts-wearing-one-name.md)
* [The bare rewrite: two pieces already here, plus the send that joins them (2026-09-13)](migration/101-the-bare-rewrite-two-pieces-already-here-plus-the-send-that.md)
* [The nonlocal write-back: the enclosing half, and why it was smaller than costed (2026-09-13)](migration/102-the-nonlocal-write-back-the-enclosing-half-and-why-it-was.md)
* [`except*`: the first cut that is a genuinely new emit (2026-09-13)](migration/103-except-the-first-cut-that-is-a-genuinely-new-emit.md)
* [`method:noSelf`: a def that declares nothing still gets a receiver (2026-09-13)](migration/104-method-noself-a-def-that-declares-nothing-still-gets-a.md)
* [`decorators:bigmemtest`: a refusal that was standing in for a crash (2026-09-13)](migration/105-decorators-bigmemtest-a-refusal-that-was-standing-in-for-a.md)
* [`nestedDef:kwonly`: the closure's defaults live in a cell, not in the closure (2026-09-13)](migration/106-nesteddef-kwonly-the-closure-s-defaults-live-in-a-cell-not-in.md)
* [`nestedDef:flow`: guard the closure's reads instead of refusing it (2026-09-14)](migration/107-nesteddef-flow-guard-the-closure-s-reads-instead-of-refusing.md)
* [`Comprehension:async`: three substitutions the statement form already had (2026-09-14)](migration/108-comprehension-async-three-substitutions-the-statement-form.md)
* [`__class__` in a method-local class: one send, once the right text is read (2026-09-14)](migration/109-class-in-a-method-local-class-one-send-once-the-right-text-is.md)
* [A class nested in a method-local class's method: a guard with no mechanism behind it (2026-09-14)](migration/110-a-class-nested-in-a-method-local-class-s-method-a-guard-with.md)
* [`method:selfRebound`: one flag, not a sweep through the node classes (2026-09-15)](migration/111-method-selfrebound-one-flag-not-a-sweep-through-the-node.md)
* [`frameSensitive-eval-nested`: the walk was right, the frame was missing (2026-09-15)](migration/112-framesensitive-eval-nested-the-walk-was-right-the-frame-was.md)
* [`nestedDef:global`: the store asked a different question from the read (2026-09-15)](migration/113-nesteddef-global-the-store-asked-a-different-question-from.md)
* [The class-body helper was not a frame: a wrong answer behind a refusal (2026-09-15)](migration/114-the-class-body-helper-was-not-a-frame-a-wrong-answer-behind-a.md)
* [`classDef:bodyStatement`: one declaration, once the frame it makes was real (2026-09-15)](migration/115-classdef-bodystatement-one-declaration-once-the-frame-it.md)
<!-- END GENERATED CUT LOG -->

---

### Why the log is one file per cut

Every cut used to append its section to the end of this file: a pure
end-of-file append, with no edit to any shared text. That is the shape most
likely to conflict, not least — any two cuts in flight resolve against the
same three lines of trailing context, and those lines were the previous cut's
`### The board` table, of which there were eighteen. So the merge would splice
one cut's prose onto another cut's numbers rather than failing cleanly, and it
did, repeatedly.

One file per cut removes the anchor: two cuts in flight add two different
paths, and different paths cannot conflict. What remains shared is a single
generated index line per cut, which is why it is generated.
