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

Deferred to the next cuts (each falls back cleanly today): **the
`___derivePythonLineForMethod___:ip:` second path** (an IR frame still drops
from tracebacks — see cut 2), then **Assign, BinOp, Compare, Call, If, While**,
module globals / builtins, and parameter temps.

## Progress — cut 2 (source attachment)

The IR method now carries its def's **Python source** (`PyMethodIRBuilder`
`fileName:source:` + `sourceBase:` + per-node `at:` stamping from each node's
`beginPosition`), so `sourceString` is the Python def and `_sourceOffsets` map
step points to it. This fixed the one flag-on interaction
(`UnboundLocalErrorTestCase>>test_parameter_read_emits_no_guard`, which
introspects the generated source) — flag-on suite green again.

**The traceback line path is NOT done yet** and was deliberately backed out
rather than shipped wrong. Findings for whoever picks it up:
* `_lineNumberForIp:` is the WRONG API for IR methods — it reads a precomputed
  line *table* that `generateFromIR:` does not populate, so it answers 1 for
  every ip. The working mechanism is the source-offset one (`_sourceAtIp:` /
  the stack report), which for a source-mapped IR method reports the right
  line — verified: a hand-built raiser shows `@2 line 4` (absolute) with WHOLE
  module source, `line 2` (slice-relative) with a def slice.
* So the line base matters: with a def **slice** the VM counts newlines from the
  slice start (relative); `methNode lineNumber:`/`firstLine:` does NOT shift it.
  Either attach whole-module source (absolute lines, but O(defs×moduleSize)
  memory) or prepend `beginLine-1` newlines to the slice (absolute lines, tiny).
* The frame's ip (from `st at: i+1`) may already be a STEP POINT — `_sourceAtIp:`
  and `_sourceOffsetsAt:` (which takes a step point: 1→1, 2→20, 3→13) are the
  pieces; `ex _gsStack` is nil for a plain Smalltalk DNU, so end-to-end testing
  needs a real Python raise (i.e. wait for the Call/BinOp cut).
* Recognition marker for an IR method: its `sourceString`, leading-whitespace
  trimmed, begins with `'def '` — Smalltalk method sources never do. A
  ``module``-subclass-plus-no-``___curPos___`` test is NOT enough: a trivial
  module body's `initialize` also lacks `___curPos___`.

## Progress — cut 3 (arithmetic + unary operators)

`BinOp` (all arithmetic/bitwise ops) and the dunder unary ops (`-x` / `+x` /
`~x`) now emit as IR. Each is a single send:
* `a + b` -> `a ___binOpXxx___: b` (the NotImplemented-aware helper on `object`,
  the same one `BinOpAst>>printSmalltalkOn:` uses);
* `-x` -> `x __neg__` (and `__pos__` / `__invert__`).

**The send-environment gotcha (load-bearing):** `GsComSendNode`'s `envFlags`
ivar IS the send's environment id (comparse.ht `envId() == envFlags`). A Python
send must be **env 1** (where the protocol methods live), so
`PyMethodIRBuilder>>send:to:with:` sets `envFlags := 1`. envFlags 0 dispatches in
env 0 and DNUs `___binOpAdd___:` on a SmallInteger. A `send:to:with:env:` variant
exists for the `@env0:` Smalltalk sends the later cuts need (dynamicInstVarAt:,
`not`, ...).

Deferred: `not` and `BoolOp` (need env-0 truthiness sends), chained `Compare`
(temps + `and:` blocks).

## Progress — cut 4 (unchained rich comparisons)

`Compare` with a single rich-comparison op (`==` `!=` `<` `<=` `>` `>=`) emits
`a ___cmpXx___: b` (the NotImplemented-aware helper, same as
`CmpOpAst>>printSmalltalkOn:`) — one env-1 send, like BinOp. Chained comparisons
(`a < b < c`, needs the rhs/op temps + `and:` blocks) and `is`/`is not`/`in`/
`not in` (bare/identity/membership sends) stay on the text path.

## What the next big cut needs: the control-flow / block machinery

`If`/`While`/`For` and every `Call` form share one prerequisite the experiments
already proved (05_real_blocks, 04_while_plain, 07_array_builder, and
PyIRBuilder's `if:then:` / `while:do:`): the builder must grow `GsComBlockNode`
contexts, optimized `ifTrue:`/`ifFalse:`/`whileTrue:` sends (set the send's
`controlOp` from `GsCompilerIRNode _classVars` COMPAR_*), `GsComArrayBuilderNode`,
and **env-0 sends** (`send:to:with:env:` is already in place) for
`dynamicInstVarAt:` and truthiness. Even the "simple" module self-send is a
probe-then-branch block (`[:___f___ | ___f___ == nil ifTrue: [self name: args]
ifFalse: [___f___ ___pyCallValue___: {args} kw: nil]] value: (self
@env0:dynamicInstVarAt: #name)`), so Call depends on this machinery too. Port it
into `PyMethodIRBuilder` next, then If/While, then the call forms.

## Progress — cut 5 (block machinery + `if`/`elif`/`else`)

`PyMethodIRBuilder` grew the block/loop machinery ported from the experiment
builder: a `blockStack` (so `add:` appends to the innermost `GsComBlockNode`),
`inBlockDo:`, `if:then:` / `if:then:else:` (optimized sends with `controlOp` =
`COMPAR__IF_TRUE` / `COMPAR_IF_TRUE_IF_FALSE`), and `while:do:` / `break` /
`continue` (goto-based, `COMPAR_WHILE_TRUE`).

**`If` is wired** (`IfAst>>___emitIRStatementOn___:`): `(test) ___isTruthy___
ifTrue: [body] ifFalse: [orelse]`. elif chains and nested ifs work — the body /
orelse are `SuiteAst` (not `BlockAst`), so BOTH classes got
`___emitIRStatementsOn___:` + `___irEligibleStatementsWithLocals___:`. Verified:
sign/absval/clamp all IR-compiled and correct.

**`While` / `Break` / `Continue` are NOT wired yet**, even though the builder can
do them: Grail's text path implements them with EXCEPTION handlers
(`@env0:on: PythonContinue do:`, an outer PythonBreak handler), not the goto
loop the experiment used. The two are observably equivalent for simple loops but
diverge around `try`/`finally` and exceptions, so wiring them needs care (and a
while loop is not useful until `Assign` lands anyway). Next: `Assign` + body
locals, then `While`, then the `Call` forms.

## Progress — cut 6 (assignment + body locals)

`Assign` with a single bare-local target (`name := value`) is wired, and body
locals become method temps (declared in `___installIRMethodOn___:`, registered by
Python name so a `Name` load / `Assign` target resolves to the leaf).
`___irLocalNameSet___` now = parameters + body-locals.

**The unbound-local rule (the subtle part).** Python raises `UnboundLocalError`
when a local is read before assignment; the text path emits a `(name ifNil:
[UnboundLocalError ___signalUnbound___: #name])` guard for conditionally-bound
locals. Rather than reproduce the guard, `___irAssignFlowSafe___:` keeps such
functions on the **text path**: it admits a def only when (a) every local write
is a top-level assignment (none conditional inside an if/loop branch) and (b)
each local is bound before every read (a sequential walk with a per-node
`___irReadLocalNamesInto___:` read-collector). So the IR path emits bare reads
with no guard, and a conditionally-bound local (`if c: w=1 else: w=2; return w`)
falls back to text — which is also what keeps
`UnboundLocalErrorTestCase>>test_body_local_read_still_guarded` (it introspects
the guard in the generated source) passing. Verified: poly/scaled/use_in_if
IR-compiled; cond_local cleanly fell back (compiled=3, fallbacks=0).

Deferred: conditional local binding (needs the guard, or a proper
bound-on-all-paths intersection), tuple/attribute/subscript targets, augmented
assignment. Next: `While`, then the `Call` forms.

## Progress — cut 7 (IR methods are first-class in tracebacks)

An IR method's frame now appears in a Python traceback with the correct absolute
line and source text — verified end to end: a text `run()` calling an IR `bad()`
that raises reports `File "tb2.py", line 3, in bad / return x + "oops"`.

How it fits together:
* **Absolute lines.** `_lineNumberForIp:` is useless for IR methods (empty line
  table), and `methNode lineNumber:` does NOT shift the VM's line base. So the
  attached source is the def slice **prefixed with `beginLine-1` newlines**: the
  VM counts newlines from the start, so a source line's position IS its module
  line. `sourceBase = defBegin - beginLine + 1` rebases node offsets into it.
* **Recognition.** `BaseException>>___isGeneratedPythonMethod___:` (which gates
  whether a frame is Python) now also accepts a source that, trimmed, begins
  with `def `/`async def ` — the IR method shape — via
  `___sourceMarksGeneratedPython___:`. A hand-written Smalltalk method never
  does. `___isIRPythonMethod___:` is the IR-specific test (def-prefix, cached).
* **Line derivation.** `___pythonLineForMethod___:ip:` routes an IR method to
  `___irPythonLineForMethod___:ip:`, which reads `_sourceAtIp:`'s caret and
  counts the source lines at/above it — the absolute line, since the source is
  padded to module line numbers.

**Known flag-on interaction (inherent, not a regression):**
`LiveFrameProbeResilienceTestCase>>testTheTempsFastPathNeedsNoSource` asserts a
def carries `___curPos___` as a METHOD TEMP (the text fast path that recognises a
Python frame with no source read). IR methods have no `___curPos___` temp — they
use the native-offset path above — so this text-specific test fails when the flag
is forced on. Off by default, so it passes normally.

## Progress — cut 8 (bare-name builtin calls)

A fixed-arity builtin call — `abs(x)`, `max(a, b)`, `pow(x, y)` — emits the same
shape `printBareCallFastPathOn:` does: `(((Python @env0:at: #builtins) instance)
name: arg1 _: arg2)`, i.e. three nested sends (`at:` in env 0, `instance` and the
`name:_:` fast-path selector in env 1). Eligibility reuses
`CallAst>>bareCallFastPathSelector` verbatim (bare NameAst, arity ≥ 1, no
kwargs/starred, not shadowed by a local, builtins actually has the selector), so
the IR path admits exactly what the text fast path would take. Nested calls work
(`abs(a) + max(a, b)`). Verified absval/biggest/power/combo IR-compiled.

The OTHER call forms are deferred and more involved: the module self-send is a
probe-then-branch BLOCK (`[:___f___ | ___f___ == nil ifTrue: [self name: args]
ifFalse: [___f___ ___pyCallValue___: {args} kw: nil]] value: (self
@env0:dynamicInstVarAt: #name)`), which needs block ARGUMENTS + an array builder;
attribute calls, class-call `__new__`, and the varargs/keyword forms each have
their own shape. `While` (exception-based break/continue) is also still open.

## Progress — cut 9 (attribute load + plain subscript)

Two more single-send value nodes, matching `printSmalltalkOn:`:
* `obj.attr` -> `(value) @env1:___pyAttrLoad___: #attr` — the general
  attribute-load path (an eligible module def has no `self`/class context or
  `__slots__`, so the fast paths never apply).
* `xs[i]` -> `(xs) __getitem__: (i)` — plain index only; slice subscripts
  (`xs[i:j]`, which build a `slice` object) are deferred.
Verified char_at/first (subscript) and re_part (`z.real`) IR-compiled.

## Progress — cut 10 (boolean `and` / `or`)

`a and b` -> `((a) ___pyAnd___: [b])` and `a or b` -> `((a) ___pyOr___: [b])` —
the value-preserving short-circuit helpers, right-folded for chains
(`a and b and c`). The tail operand is wrapped in a **block** so the helper
evaluates it lazily — the first use of a `GsComBlockNode` as a REGULAR send
argument (earlier blocks were control-send receivers/args for
`ifTrue:`/`whileTrue:`). Verified value preservation and short-circuit:
`both(0,5)=0`, `either(3,7)=3`, `guard(-1)=false`.

## Progress — cut 11 (augmented assignment)

`x += v` (simple LOCAL target) -> `x := (x) @env1:___augmentedOp___: (v)
inplace: #'__iadd__:' binary: #'__add__:'.` — the text path's simple-local
branch verbatim: one runtime-helper send that tries the in-place dunder and
falls back to the binary one, exactly as CPython. The selector pair is derived
from the op printer just as `printSmalltalkOn:` derives it (guarded, non-raising).
The other target branches (attribute, subscript, module-scope, class-body,
closure-cell) stay on text via `___irLocalNameTarget___:`.

Flow analysis grew a polymorphic hook: `___irLocalWriteTarget___:` (AbstractNode
default nil, overridden by Assign and AugAssign) replaces the `isKindOf: AssignAst`
tests in `___irAssignFlowSafe___:`, and AugAssign's `___irReadLocalNamesInto___:`
adds its own TARGET to the read set — `x += v` reads x before writing it, so a
def whose only binding of x is the aug-assign correctly fails bound-before-read
and stays on text (where the UnboundLocalError guard lives). An aug-assign to a
PARAMETER is already ineligible: the parser's `declareWrite:` puts the target in
`assignedNamesInBody`, which fails `___irAllParamsAreReadOnlyArgs___`.

Fixture: bump (`+=`), scale (`*=`, `-=`), concat (str `+=`, exercising the
`__iadd__` -> `__add__` fallback); compiled count 25 -> 28. Flag-on suite
6235/6236 (only the inherent temps-fast-path test), flag-off 6236/6236.

## Progress — cut 12 (tuple / list literals)

The builder grew `arrayOf:` (GsComArrayBuilderNode -- the `{ e1 . e2 }`
construct, proven in experiment 07). Non-splat, Load-context displays only:
* `(a, b)` -> `tuple withAll: {a. b}` (env 0) and `()` -> `tuple new` (env 0)
* `[a, b]` -> `{a. b} asOrderedCollection` (env 0) and `[]` ->
  `OrderedCollection new` (env 0)
matching the text path's non-splat branches exactly (text's `perform:env:` is
just its syntax for forcing env 0; IR sets the send env directly). Splat
(`[a, *b]`) and store-context unpacking targets stay on text -- Assign's
single-Name-target rule already refuses tuple targets. Containers nest
(`[(a, b), a]`). Fixture: pair/empty_tuple/listing/empty_list/nested;
compiled 28 -> 33. Flag-on 6235/6236 (inherent only), flag-off 6236/6236.

## Progress — cut 13 (attribute calls, legacy load-then-call form)

`obj.attr(args)` -> `((obj) @env1:___pyAttrLoad___: #attr) @env1:value:
{ args } value: nil` — the text path's legacy fallback (Python is load THEN
call: the attribute might be a BoundMethod, a class, or any callable value;
`value:value:` routes all three through the unified call protocol; empty
keywords print as `nil`). Exactness: every earlier fast path in CallAst's
printSmalltalkOn: must stand down — the eligibility probe requires
moduleSelfSend*/classSelfSend*/attributeCallFastPath/attributeCallVarargs all
nil (the branches before them are NameAst-function-guarded and cannot match an
AttributeAst), so a call any fast path would claim stays on text. No
splat/keywords. CallAst's read collector now includes the FUNCTION position
(the receiver of `s.upper()` reads `s`) — exact for the bare-builtin shape too,
whose function name is never a local. Fixture: shout (0-arg), find_pos (1-arg),
dashed (`sep.join([a, b])`, composing the cut-12 list literal); compiled
33 -> 36. Flag-on 6235/6236 (inherent only), flag-off 6236/6236.

## Progress — cut 14 (while loops + break/continue, relaxed flow analysis)

`while test: body` (no else) reproduces the text path's EXCEPTION-based loop,
shape for shape:

    [[(test) ___isTruthy___] whileTrue: [
        [body] @env0:on: PythonContinue do: [:___ex___ | nil].
    ]] @env0:on: PythonBreak do: [:___ex___ | nil].

`break` / `continue` -> `PythonBreak/PythonContinue @env0:___signal___` — the
text emits verbatim. The builder grew `handlerBlockNamed:` (a one-arg
`[:___ex___ | nil]` handler; blockArg:argNumber:forBlock:, never a method
local) and text-shaped `whileTrue:do:` (inlined COMPAR_WHILE_TRUE, distinct
from the goto-based `while:do:` kept for later optimization). while-else stays
on text.

**The bug this cut flushed out: builder `return:` was a BLOCK return.**
`GsComReturnNode new return:` sets returnKind 0; source compilation emits
returnKind 1 (`returnFromHome:`) for EVERY `^`, method top level included
(oracle-verified). Kind 0 is indistinguishable at method level and in INLINED
blocks — cuts 1-13 never noticed — but a `return` inside a while body sits in a
REAL block (the on: PythonContinue do: receiver), where kind 0 ends only the
block: find_first_ge re-entered its loop forever. `return:` now always emits
`returnFromHome:`.

**Flow analysis relaxed, still sound.** The all-writes-top-level rule would
have made eligible loops useless (`i += 1` is a nested write). New rule, per
top-level statement: subtree READS must be bound; subtree NESTED writes must
ALSO be already bound (conditionally REbinding a bound local is safe; a FIRST
binding inside a branch/loop is not — the branch may not run, the loop may run
zero times); then the statement's own top-level write target joins the bound
set. Requires complete write collectors (`___irWriteLocalNamesInto___:locals:`
on Assign/AugAssign/If/While/Block/Suite) — complete because eligibility is
established before the analysis runs. Bonus: `x = 0; if c: x = 1` (conditional
REBIND) is now eligible too.

Fixture: count_to, sum_below, find_first_ge (return-from-loop), skip_odds
(while True + break + continue + %), cond_rebind; compiled 36 -> 41. Flag-on
6235/6236 (inherent only), flag-off 6236/6236.

## Progress — cut 15 (module self-sends)

`f(x)` where f is a top-level def of the module being compiled — the deferred
probe-then-branch block, now emittable since the builder has block ARGS and the
array builder. Shape for shape with printModuleSelfSendOn::

    ([:___f___ | ___f___ == nil
        ifTrue: [self name: arg1 _: arg2]
        ifFalse: [___f___ @env1:___pyCallValue___: { args } kw: nil]]
        value: (self @env0:dynamicInstVarAt: #name))

Builder grew `selfNode` (GsComVarLeaf initializeSelf) and `blockWithArg:do:`
(a one-arg block whose arg leaf the emit block receives for reads). The arg
expressions appear once per branch — separate node trees, as in the text,
since IR nodes cannot be shared. Eligibility (`___irModuleSelfSendSelector___`)
is exact: the special-cased ids (globals/locals/vars/dir/eval/exec/super) are
denied, and bareCallFastPath/bareCallVarargs/bareCallClassNew/knownBuiltinName
must all answer nil before moduleSelfSendSelector decides. Varargs self-sends
(kwargs/defaults) stay on text.

**Landmine: `GsComSelectorLeaf newSelector:env:` is unusable per-user.** It
reads a lazily-initialized special-selector table; cold it raises
(`nil at:otherwise:`), and initializing it (`_initializeSpecialSelectors`)
writes an objectSecurityPolicyId-1 dictionary — SecurityError for a per-user
session. So `#==` and `#value:` are REAL env-0 sends (bare-Symbol selLeaf):
kernel `Object>>==` is the identity test and `ExecBlock>>value:` the block
invoke — semantically identical to the special opcodes, just not inlined.

Fixture: double/quadruple (nested self-sends), dispatch_add (two self-sends in
one expression), base_impl/call_base plus a module-level rebind
(`base_impl = lambda: 2`) proving the probe's REBOUND branch answers the new
value; compiled 41 -> 46. Flag-on 6235/6236 (inherent only), flag-off 6236/6236.

## Progress — cut 16 (chained comparisons)

`a < b < c` reproduces printSmalltalkOn:'s temp + and:-block shape:

    (((a) ___cmpLt___: (___1 := b)) and: [((___1) ___cmpLt___: (c))])

Each middle comparator is captured into the parse-allocated `rhsTemp` as an
assignment EXPRESSION (GsComAssignmentNode as a send argument) and re-read as
the next op's left operand — every operand evaluated at most once, and only as
far as the chain gets. The rhsTemp is registered as a method temp at emit
(guarded by leafFor:, matching text's `| ___1 |` declaration). The `and:` is a
real env-0 send to the Boolean (kernel Boolean>>and:) — text's and: IS
Boolean>>and:, just inlined. Chains containing is / is not / in / not in stay
on text (they need the extra lhsTemp shape). Fixture: in_range
(`lo <= x <= hi`), ascending (4-operand chain); compiled 46 -> 48. Flag-on
6235/6236 (inherent only), flag-off 6236/6236.

## Progress — cut 17 (unary not + conditional expressions)

* `not x` -> `((x) ___isTruthy___) @env0:not` — truthiness (env 1) then Boolean
  negation (env 0), overriding UnaryOpAst's dunder-selector default on NotAst.
* `a if c else b` -> `((c) ___isTruthy___ ifTrue: [a] ifFalse: [b])` — the
  builder grew `ifValue:then:else:`, the un-added VALUE form of the inlined
  conditional (if:then:else: is now a one-line add: of it).
Fixture: negation, pick (incl. non-bool truthy test); compiled 48 -> 50.
Flag-on 6235/6236 (inherent only), flag-off 6236/6236.

## Progress — cut 18 (for loops)

`for target in iter: body` (sync, simple local Name target, no else) reproduces
printSmalltalkOn:'s exception-based loop:

    [[ ___iterN___ := (iter) __iter__.
       [true] whileTrue: [
         [ target := ([___iterN___ __next__]
               @env0:on: StopIteration
               do: [:___dx___ | PythonLoopDrained @env0:___signal___]).
           body...
         ] @env0:on: PythonContinue do: [:___ex___ | nil].
       ].
    ] @env0:on: PythonLoopDrained do: [:___ex___ | nil].
    ] @env0:on: PythonBreak do: [:___ex___ | nil].

Only the STEP's own StopIteration means drained (re-signalled as the internal
PythonLoopDrained); one raised by the body sails past to the caller — same
placement as text. Differences from text, both deliberate: the iterator temp is
a METHOD temp (depth-unique `___iterN___`; a user local of that name makes the
def ineligible — text shadows with a block temp), and the `___curPos___`
position stores are omitted (IR derives positions natively; the __iter__ /
__next__ sends are stamped at the iterable's offset instead).

Flow analysis: the loop TARGET is excluded from the statement's reported reads
AND nested writes — its write/read pair is self-contained within an iteration —
but it contributes no binding after the loop (zero-trip leaves it unbound), so
___irLocalWriteTarget___ stays nil and a later read of the target keeps the def
on text. AsyncForAst (a subclass) never qualifies; tuple targets and for-else
stay on text.

Fixture: total_of (accumulate), first_even (return from loop body),
count_pairs (nested loops, distinct iter temps, inner reads outer's target);
compiled 50 -> 53.

## Progress — cut 19 (dict / set literals)

printSmalltalkOn:'s accumulator-block shapes:
* `{k: v, ...}` -> `([:___d | ___d __setitem__: (k) _: (v). ... ___d]
  value: (PyDict perform: #new env: 0))`; `{}` -> `PyDict new` (env 0).
* `{a, b}` -> `([:___s | ___s add: (a). ... ___s] value: (set perform: #new
  env: 0))`.
Pairs/elements store left to right (later dict keys overwrite earlier, as in
CPython). `{**m}` unpacking (a nil key) and set splats stay on text. Reuses
blockWithArg:do: from cut 15 — the accumulator arg is read per store and is the
block's final statement (its value). Fixture: make_point, empty_dict, lookup
(dict literal + subscript), uniq_count (set + len); compiled 53 -> 57.

## Progress — cut 20 (is / is not / in / not in, unchained)

The four remaining single comparison ops, matching their printers:
* `a is b` -> `((a) == (b))` and `a is not b` -> `((a) ~~ (b))` — real env-0
  sends to the kernel identity tests (same rationale as cut 15's `==`).
* `a in b` -> `((b) ___pyContains___: (a))` — the CONTAINER receives;
  `a not in b` -> `(((b) ___pyContains___: (a)) ___isTruthy___) @env0:not`
  (the helper may answer a non-Boolean, so coerce before negating — NotInAst's
  own shape).
Chains containing these still stay on text (the lhsTemp staging shape).
Fixture: same, differs, holds, lacks (incl. str contains); compiled 57 -> 61.

## Progress — cut 21 (subscript / attribute assignment targets)

The two remaining single-target store shapes, matching printSmalltalkOn:'s
target dispatch:
* `obj[idx] = value` -> `(obj) __setitem__: (idx) _: (value).` — slice indices
  (SliceAst) are not emittable values, so slice stores fall out naturally.
* `obj.attr = value` -> `(obj) @env1:__setattr__: 'attr' _: (value).` — the
  FOREIGN-receiver form, the only live branch in a module def
  (CallAst>>isSelfReference: needs classBeingCompiled); `__class__` stores
  (the type-change special case) stay on text. The attribute name is a
  Smalltalk STRING, not a Symbol — user __setattr__ overrides compare
  `name == 'x'` str-vs-str.
AssignAst's read collector now includes a subscript target's receiver + index
and an attribute target's receiver (they are reads; only a bare-name target is
a pure write). Chained (`a = b = v`) and tuple-unpacking targets stay on text.
Fixture: set_at, tag (attribute store on a text-compiled helper class);
compiled 61 -> 63.

## Progress — cut 22 (general name loads + raise)

**Name loads beyond locals** — NameAst's IR eligibility now admits three kinds,
via `___irNonLocalLoadKind___:` (guarded, conservative-nil):
* a plain LOCAL (as before, via its registered leaf);
* a MODULE name (variable or top-level def) -> `(self @env1:
  ___moduleAttrLoad___: #'name')` — emitModuleAttrLoad:'s shape, probing
  dynamic-instVar storage, falling through to class-method lookup (defs as
  BoundMethods), NameError on miss, so `del`/rebinding behave;
* a RESOLVABLE BARE GLOBAL (a builtins-namespace name resolving on the user's
  symbol list that is NOT a builtins method — those take the BoundMethod
  fast-path wrap and stay on text) -> its symbol-list association, exactly
  what the bare identifier compiles to.  super/__class__/type, reserved
  identifiers, and class contexts all stand down.

**raise** — printSmalltalkOn:'s three no-cause shapes:
* bare `raise` OUTSIDE a handler -> `BaseException @env0:___reRaise___: nil.`
  (inside a handler it must name the handler's ___ex block arg — deferred to
  the try/except cut);
* `raise Cls(args)` (bare-name callee) -> `BaseException @env1:
  ___pyRaiseNew___: (Cls) args: { args } kw: nil.` — the construct-and-signal
  that runs user __init__ and validates the callee is a BaseException subclass;
* `raise expr` -> `BaseException @env1:___pyRaise___: (expr).`
`raise X from Y` stays on text.

Fixture: FLOOR module constant + read_floor/above_floor (module-var loads),
demand_positive (raise ValueError(...)), reraise_expr (raise e), bare_reraise
(RuntimeError), with module-level try blocks capturing the outcomes;
compiled 63 -> 68.

### Cut 22 flushed out three latent defects (found by the widened flag-on surface)

1. **`value:` / `value:value:` sends MUST carry specialOpcode 109.** Source
   compilation attaches the ExecBlock-invoke opcode to every value:-family
   send — even under `@env1:` (oracle-verified). The opcode makes a RAW
   ExecBlock receiver (a class-body lambda read off its class — the legacy
   block-calling protocol) invoke the block; a bare-Symbol selLeaf skips it,
   so the block landed on `object>>value:value:` and raised
   `'ExecBlock' object is not callable`. `newSelector:env:` can't build the
   leaf per-user (SystemUser-only table), so the builder assembles it
   directly (`setIRnodeKind` + selector/specialOpcode/specialSendClass ivars).
2. **`generateFromIR:` answers an ARRAY when it has warnings** (e.g.
   ``statement with no effect`` from a docstring expression statement), with
   the GsNMethod first. Warnings are non-fatal for a source compile;
   `generatedMethod` now unwraps them instead of treating them as failure.
3. **The cut-8 bare-builtin probe lacked the special-id denylist.**
   printSmalltalkOn: special-cases globals/locals/vars/dir/eval/exec/super
   BEFORE the builtins fast path; `exec(...)` only became reachable when cut
   19/22 made its arguments eligible. `___irBareBuiltinSelector___` now denies
   the same seven ids the self-send probe does.

Verified: ClassScopeComprehensionTestCase's fixture imports flag-on with all
11 RESULTS true (9 defs IR-compiled, 0 fallbacks).

### Second known flag-on interaction (stack geometry)

`BaseExceptionTestCase>>test_recursion_raises_recursion_error` can FLAP under
the forced flag (observed once in a full flag-on suite; 5/5 green on retry,
class suite 15/15, direct import all-true). The recursion guard is a stack
BYTE budget (an ~343-frame AlmostOutOfStack reserve), so IR methods' smaller
frames legitimately move where the guard fires; the test sits near that
boundary and harness depth tips it. Deterministic flag-off; nothing gates on
flag-on. Watch for recurrence.

## Progress — cut 23 (try / except, single handler)

`try: body / except [T] [as n]: hbody` (one handler, no else / finally / star)
reproduces printSmalltalkOn:'s single-handler shape:

    [ body ] @env0:on: <sel> do: [:___ex | | ___savedExc |
      ((___ex isKindOf: PythonReturn) or: [... PythonBreak ... PythonContinue])
          ifTrue: [___ex @env0:pass].
      ___savedExc := BaseException @env0:___currentException___.
      BaseException @env0:___setCurrentException___:
          (BaseException @env0:___payloadOf___: ___ex).
      BaseException @env0:___enterHandler___.
      [ <n := payload.> hbody ] @env0:ensure: [
          BaseException @env0:___exitHandler___.
          BaseException @env0:___setCurrentException___: ___savedExc]].

`<sel>` = BaseException for bare `except:`, else the LAZILY-evaluated validated
type `(PyLazyExceptSelector @env0:on: [BaseException @env1:___pyExceptType___:
(T)])` — evaluated only when an exception reaches the clause. The builder grew
`blockWithArg:temp:do:` (blockTemp:sourceLexLevel: + appendTemp:) for the
handler's ___savedExc. The control-flow pass-guard keeps a Python `except`
from swallowing PythonReturn/Break/Continue. Text's ___pushCatchingFrame___
fallback (keyed on ___curPos___) is omitted — IR frames are natively
first-class in tracebacks, which is the no-op condition it exists for.

Flow analysis: the `as` name is treated like a for target (its handler-body
reads are self-satisfied; it contributes no binding after the statement); body
and handler-body writes are conditional-nested. Multi-clause shields,
`except (A, B)` tuples, else, finally, and the in-handler bare `raise` (needs
___ex) stay on text. Fixture: safe_div, catch_as (as-binding used via
len(ex.args)), catch_all (bare except); compiled 68 -> 71.

### Cut 23 follow-through: the catch-site frame push is load-bearing

The first emit omitted ___pushCatchingFrame___ on the theory that IR frames
are natively first-class. Wrong: that call is what BUILDS the exception's
whole traceback chain from the VM's raise-time stack capture (its case 1) —
without it __traceback__ stays None, and an all-IR propagation chain reported
`got []` (7 traceback tests). Two fixes:
* ___installIRMethodOn___: now sets CallAst functionBeingCompiled around the
  emit (ensure-restored), exactly as the text path does — node emitters
  consult it (the catch-site PyCode among them).
* The IR handler emits `(BaseException ___payloadOf___: ___ex)
  ___pushCatchingFrame___: (PyCode name:filename:firstlineno:) pos: nil` —
  pos nil, where text passes ___curPos___: the pos only REFINES the catcher
  frame's span; nil makes the builder derive every line from the captured
  ips, which the IR-aware line machinery answers natively.

**Third known flag-on interaction: PEP 657 COLUMN spans are absent for an
exception raised inside an IR frame** (lines are correct; IR step points
carry only begin offsets, so colno/end_colno cannot be derived and stay
None — per §9.10, absent columns beat wrong ones). One fixture check
(for_traceback_positions body_span) reads false under the forced flag.
Deriving true spans needs per-send end offsets (a (method, ip) -> span side
table built at emit time) — deferred.

## Progress — cut 24 (try / finally)

A finally clause wraps the statement (bare body, or the single-handler nest) in

    BaseException @env0:___ensureFinally___: [ ... ] finally: [ finalbody ].

— the helper, not a bare ensure:, so sys.exc_info() inside the finally sees a
propagating exception; text uses it for every non-generator scope, and a
generator def is never IR-eligible. try/finally with no except qualifies too.

**The enabling insight: `hasReturnBlocking` is a TEXT-SYNTAX constraint.**
GemStone's parser rejects statements after `^`, so a text return inside
try/finally must compile to a PythonReturn signal; ___irEligible___ was
inheriting that bail-out, silently keeping every try/finally def on text
(compiled=71 vs expected 73 — the smoke count caught it). IR has no parser:
returnFromHome unwinds directly and ensure-family blocks run on any unwind, so
the check is now skipped for IR (``with`` also sets the flag but WithAst is
statement-ineligible anyway). Verified: a return through an IR try/finally
runs the finally (div_logged's append count).

Fixture: FINALLY_RAN + div_logged (return through finally, incl. during
exception propagation), guarded_get (except + finally); compiled 71 -> 73.

## Progress — cut 25 (except tuples, in-handler bare `raise`, `raise … from …`)

Three completions of the try/raise surface, each reproducing its text shape:

* **`except (A, B, C)`** — the type handed to ___pyExceptType___: is the
  ExceptionSet join `(A @env0:, B) @env0:, C` (on:do: asks its argument
  #handles:, which a tuple/Array lacks), left-folded in source order like the
  text.  `TryAst>>___irExceptTypeEligible___:locals:` admits a non-empty tuple
  of emittable values; `___emitIRExceptType___:on:` builds the chain.
* **bare `raise` inside a handler** → `BaseException @env0:___reRaise___:
  ___ex`.  The builder grew a handler-ex stack (`pushHandlerEx:` /
  `popHandlerEx` / `currentHandlerEx`); TryAst brackets the handler-body emit
  with it (ensure-popped), and RaiseAst names `currentHandlerEx` when its
  `___enclosingExceptHandler___` is non-nil — the two agree because a RaiseAst
  in a handler body is emitted while that handler is open.  A bare raise in a
  finally or try body still passes nil, as text does; the runtime prefers the
  session's current exception anyway (see ___reRaise___:).
* **`raise X from Y`** → the `cause:` selectors (`___pyRaiseNew___:args:kw:
  cause:` / `___pyRaise___:cause:`); `from None` passes the None global, which
  is what distinguishes "suppress context" from "no cause".

Fixture: classify (tuple), rethrow (bare raise in handler, module-level check
RETHROWN), chained (`from e`, CHAINED reads __cause__), suppressed (`from
None`, SUPPRESSED checks __cause__ is None and __suppress_context__); compiled
73 -> 77.

### Cut 25 flag-on triage (main moved under the sweep)

Six flag-on residuals against a main that gained several test classes since
the last sweep.  Attribution, each re-run alone in a fresh forced-flag session:

* **`FrameLocalsCaptureTestCase` (landed 09-04) — a REAL IR parity gap, fixed.**
  `the_except_target_is_bound_while_the_handler_runs` read false: the IR
  handler pushed its catch-site frame with `___pushCatchingFrame___:pos:` and
  never bound the `as` name, where text passes `target: 'name'` and unbinds it
  (`___unbindCatchingTarget___:`) in the handler's ensure:.  Grail's f_locals is
  a snapshot taken while the exception propagates -- before the handler stores
  the name -- so codegen has to hand the name over.  The IR handler now emits
  both, so the "gone once the handler ends" half is no longer vacuously true.
* **`RaiseSpanTestCase` and `SpanEndTokenTestCase` (both 09-01)** — PEP 657
  COLUMN spans, the documented third flag-on interaction (IR step points carry
  begin offsets only).  Two more test classes now measure it; the fix is still
  the (method, ip) -> span side table.
* **`PropertyNotDynamicClassAttributeTestCase>>testHelpOnAnEnumPrintsCPythonsHeading`**
  (08-18, green in every earlier sweep) ERRORed once in the sharded run and
  passes 9/9 alone under the flag: suite-order state on a cold flag-on pydoc
  import, not an IR emit defect.  Watch for recurrence.
* The two inherent ones as before: `testTheTempsFastPathNeedsNoSource`,
  `testForLoopExceptionPositions`.

## Progress — cut 26 (multi-clause `except` with the shield, `try/else`)

`TryAst>>___emitIRProtectedPartOn___:` now builds printSmalltalkOn:'s full
handler NEST, `[[[body] on: s1 do: h1] on: s2 do: h2] on: s3 do: h3`, plus the
two things text does for more than one clause:

* **The shield.** H1's body runs INSIDE H2's protected block, but Python's
  clauses are alternatives for the try BODY only, so every clause after the
  first gets `PyLazyExceptSelector on: [..] shieldedFor: #token` and every
  handler calls `___enterHandler___: #token` (the no-arg form for a single
  clause).  The token is the per-SITE Symbol the text bakes in
  (`___grailTrySite_<path>_<line>___`, see ___trySiteTokenLiteral___ for why
  per-site).  A bare `except:` after the first clause wraps BaseException in
  the lazy selector so the shield has a selector to live on.
* **The else** sits OUTSIDE the nest and INSIDE the finally -- it is exactly
  the code this statement's own handlers must not protect.  Whether the body
  fell through is the nest's VALUE: body block ends in `true`, every handler
  in `false`, `(nest) ifTrue: [orelse]`.  Emitted only with an else.

**One emit defect caught by the smoke fixture, worth recording:** the first
emit sent the outer `on:do:` to the inner send's VALUE.  `on:do:` installs a
handler only on a BLOCK receiver, so the second clause never installed and a
TypeError from the body escaped `except TypeError:` (module import died with
``unsupported operand type(s) for //``).  Every clause after the first now
protects a block WRAPPING the inner on:do: -- the text's outer brackets.

**Also fixed here, from the cut-25 flag-on triage:** the IR handler now passes
`target: 'name'` to ___pushCatchingFrame___ for `except X as name` and emits
`___unbindCatchingTarget___:` in the handler's ensure:, so the catching
frame's f_locals shows the target while the handler runs and not after
(FrameLocalsCaptureTestCase both halves true under the flag).

**Flow-analysis limit surfaced:** `v = d[k]` in a try body followed by `v` in
the else is ineligible -- the body may raise before the write, so the write is
nested/conditional and a FIRST nested binding is refused; the rule does not yet
know an else runs only after the body completed.  The fixture pre-binds `v`.
Refinement (body top-level writes are bound within the else) deferred.

Fixture: pick_handler (three clauses), shielded (raise in H1 must not reach
H2; SHIELDED), with_else / else_not_protected (ELSE_LEAK: a TypeError from
the else propagates past `except KeyError`), bare_after_typed; compiled
77 -> 82.

Cut 26 flag-on sweep: FrameLocalsCaptureTestCase is green (the target: parity
fix above).  Residue: the two PEP 657 column classes, the two inherent tests,
and two ERRORs that both pass alone in a fresh forced-flag session --
`PropertyNotDynamicClassAttributeTestCase>>testHelpOnAnEnumPrintsCPythonsHeading`
(second recurrence) and `UnicodeNamesTestCase>>testAHangulSyllableIsFoundByComposition`
(new on main with #826).  Both are cold-shard ORDER effects under the flag, not
emit defects; a stack-geometry or shared-state interaction to chase when they
stop being intermittent.  Flag-off is the gate and is deterministic.

## Progress — cut 27 (assert, slices, del)

* **assert** — `(test) ___isTruthy___ ifFalse: [AssertionError signal]` (env 0)
  or, with a message, `... ifFalse: [AssertionError ___signal___: msg]` (env
  1).  The text spells the two sends as `perform: #signal env: 0` / `perform:
  #'___signal___:' env: 1 withArguments:` -- text-syntax spellings the IR sends
  directly.  The builder grew `unless:then:` (inlined ifFalse:, controlOp
  COMPAR__IF_FALSE = 2).
* **slice loads** `xs[i:j:k]` → `(xs) __getitem__: (slice @env0:___newStart: lo
  stop: hi step: st)`, nil for an omitted bound -- the SequenceableCollection
  fast path's spelling, special-cased in SubscriptAst exactly as the text does.
* **slice objects** everywhere else (store / del subscripts, values) →
  `slice @env1:__new__: lo _: hi _: st` with None for omitted bounds: SliceAst
  is now an emittable value, which makes `xs[i:j] = v` eligible through
  AssignAst's existing subscript-store path with no change there.
* **del** `x[k]` → `(x) __delitem__: (k)`; `del o.a` → `(o) @env1:__delattr__:
  'a'` (a Smalltalk String: user overrides compare `name == 'a'` str-vs-str).
  `del name` stays on text -- it unbinds a local and a later read would need
  the unbound guard the IR path does not emit.

Fixture: check_positive / check_with_msg (ASSERT_BARE == "", ASSERT_MSG),
middle / evens / prefix / tail_from (four slice shapes), splice (slice store),
drop_key, drop_attr; compiled 82 -> 91.

Cut 27 flag-on sweep: only the four known-family residuals (two PEP 657 column
classes, two inherent); neither cold-shard order ERROR from cut 26 recurred.

## Progress — cut 28 (call shapes: class constructors, keyword arguments, general callees)

`CallAst>>___irCallShape___` replaces the three ad-hoc call predicates with ONE
classifier that walks printSmalltalkOn:'s probes in the text's own order and
answers the branch as a Symbol -- or nil where the text takes a branch the IR
does not emit (the special ids, the two arity-mismatch TypeErrors, class-
context sends, `*`/`**` splats).  Exactness by construction: a call an earlier
branch would claim never reaches a later shape.  Nine shapes:

    #builtinFixed    ((builtins instance) name: a _: b)          [was cut 8]
    #builtinVarargs  ((builtins instance) _name: {args} kw: kw)   NEW
    #classNew        (Cls __new__: a _: b)   [bool -> ___truthOf___:]   NEW
    #moduleSelfSend / #moduleSelfSendVarargs  the rebinding probe   [15 / NEW]
    #attrFixed       ((recv) name: a _: b)   [module receiver]     NEW
    #attrVarargs     ((recv) _name: {args} kw: kw)                 NEW
    #attrLegacy      (((obj) ___pyAttrLoad___: #m) value: {args} value: kw) [13, +kw]
    #general         ((callee) value: {args} value: kw)            NEW

**Keyword arguments** lower to printKeywordsDictOn:'s literal -- `((PyDict
@env0:new) @env0:at: 'k' put: v; ...; yourself)` -- through a new builder
`cascade:sends:env:` (GsComCascadeNode over nil-receiver sends, probe 09's
shape).  Named keywords only; a `**splat` merges at runtime and stays on text.

**Class constructors** `str(x)`, `int(s)`, `list(xs)` are the shape that had
kept f-strings on text: the parser desugars `f"{x!r:>4}"` into `+` chains of
`repr(x)` / `format(x, spec)` calls, and `str()` is a class.  The receiver is
the bare class name -- `globalNamed:`, the compile-time symbol-list binding the
text resolves it to, NOT a module-attribute load.  The selector is rebuilt from
the probe's base plus the arity (`___irFixedAritySelector___:`), which is also
how bool's `___truthOf___:` special case rides along.

**General callees** -- a parameter holding a function, a call result, a
subscript, a user class defined in the module (`Box()`: not in the Python
dictionary, so no class-new fast path; text loads the module attribute and
sends value:value:) -- take the unified-protocol fallback with the callee
emitted as a value.  Every fast path stands down for a shadowed name
(___pythonBindingShadows___:), so a local callee lands here exactly as in text.

Fixture: to_text / as_int (class new), make_box (user class, general),
rounded / sorted_desc (builtin varargs with kwargs), apply / apply_kw
(general, local callee, with and without kwargs; kw_target stays on text by
its default argument), spec_fmt (the f-string that would not compile before),
count_chars (len(str(a))); compiled 91 -> 100.

f-strings, confirmed free after cut 28: a three-def probe module (plain
`f"hi {name}!"`, `f"{x!r}/{x:>4}"`, `f"{a + b} and {len(str(a))}"`) compiled
1/3 before the cut (only the plain one) and 3/3 after -- there is no
JoinedStrAst emit to write, only the `str` / `repr` / `format` constructor
and builtin-varargs calls the parser desugars to.  The smoke fixture's
spec_fmt is the standing proof.

Cut 28 flag-on sweep: the four known-family residuals, plus one ERROR --
`TransformCodecsTestCase>>testRot13IsTheStrToStrCase` -- that passes 6/6 alone
in a fresh forced-flag session (73 IR compiles, 0 fallbacks).  That is the THIRD
class to show this shape (enum help, Unicode names, now codecs): an ERROR in a
cold flag-on shard, green alone, never twice in a row.  Not an emit defect of
the cut it appeared under; a cold-shard ORDER interaction under the flag that
deserves its own investigation -- capture the ERROR text from the shard log
before the next run wipes it, and reproduce with GRAIL_TEST_SHARDS on the
shard that carried it.  Flag-off remains the deterministic gate.

## Progress — cut 29 (reassigned parameters)

A Smalltalk method argument is read-only and comgen refuses the store outright
(`emitStore: unexpected store to method or block arg` -- probe 01, rungs 5-6),
so a parameter the body rebinds arrives under a TRANSPORT name and is copied
into a temp of its own name before the body runs: the text's ``_x'' argument
and ``x := _x'' opener, reproduced by `___installIRMethodBodyOn___:`.  The
transport is ``_x'' unless that collides with another parameter, a body local
or a module instVar, else ``___<i>'' (the text's rule).  Reads of ``x'' in the
body resolve to the temp because the temp is what `leafFor: #x` answers; the
flow analysis already seeds `bound` with every parameter, which the opener
makes true.  `___irAllParamsAreReadOnlyArgs___` now refuses only a DELETED or
a pseudo-variable parameter (the latter cannot be a temp; the text renames its
reads instead).

Fixture: clamp (two conditional rebinds), accumulate (aug-assign to a param
inside a for), normalize (chained rebinding through attribute calls); compiled
100 -> 103.

### The cold-shard flag-on ERRORs are AlmostOutOfMemory, and importlib's handler makes them fatal

Captured from the cut-29 sweep's shard log before it was wiped:
`PropertyNotDynamicClassAttributeTestCase>>testHelpOnAnEnumPrintsCPythonsHeading`
ERRORed with **`AlmostOutOfMemory` (notification 6013), "Session's temporary
object memory is almost full"**, signalled asynchronously during
`Behavior>>methodDictForEnv:` inside `___pyAttrLoad___:` -- deep in a COLD
`importlib loadModuleFromPath:name:`.  The frame that turned a notification
into a test ERROR is importlib's own: the module body runs under

    [...] on: AbstractException do: [:ex | self removeModule: moduleName. ex outer]

and `AbstractException` includes every Notification, so a memory-pressure
warning UNLOADS the module being imported and hands the notification up to
SUnit's runCase, which reports it as an error.  Three different classes have
now shown exactly this shape (enum help, Unicode names, codecs), always in a
cold shard, always green alone -- the pressure is GRAIL_TEST_COLD=1 (every
shard compiles every framework) plus the IR builder's node garbage per def.
Not an emit defect, and not flag-specific in principle: any cold shard near
the temp-memory ceiling can trip it.  Two follow-ups, both outside the IR
cuts: (a) the handler should not unload on a Notification -- `on: Error` (or
excluding Notification) keeps a warning a warning; (b) the sweep could raise
GEM_TEMPOBJ_CACHE_SIZE for cold flag-on shards.  Recorded here so the next
sweep does not re-triage it.

## Progress — cut 30 (function-level `import`)

A single-alias `import` inside a def binds a body local (the parser's
declareWrite:), so it is printImportBindingOpenOn:name:'s plain ``name := ...''
branch with valueSourceFor:'s value:

    name := (((Python @env0:at: #builtins) instance) ___import__: { 'a.b.c' } kw: nil)

plus, for ``import a.b.c as x'', the leaf reached by the ``@env1:b @env1:c''
walks after the import (``import a.b.c'' binds the TOP name ``a''
unaliased).  The builtins varargs fast path is used directly so the import
does not depend on ``__import__'' resolving through the symbol list.
Multi-alias statements (``import a, b'') stay on text -- the flow analysis
takes one write target per statement -- and so does ``from x import y'' for
now.  ImportAst answers a synthetic NameAst as its ___irLocalWriteTarget___:.

The smoke fixture's text_caller carries a ``global FLOOR'' declaration now:
its ``import traceback'' would otherwise have made it IR-eligible, and it is
the TEXT side of the text-calls-IR traceback check.  Fixture: load_sqrt,
alias_join, dotted_top; compiled 103 -> 106.

## Progress — cut 31 (the recursive flow analysis)

The bound-before-read proof (`___irAssignFlowSafe___:`) was a FLAT walk of the
top-level statements: every local a statement's subtree read had to be bound
already, and any FIRST binding below the top level (inside an if branch, a
loop body, a try body) was refused outright.  That kept every def of the shape
``if c: x = 1; return x'' -- with the return inside the branch -- or a loop
body that bound a name and then used it, or ``v = d[k]'' in a try body read in
the body itself, on the text path.  Cut 26 recorded the try/else case as a
deferred refinement; the general form is the same problem.

The walk is now `___irFlowBound___: boundIn locals: localSet`, per statement,
answering the set of locals DEFINITELY bound afterwards (or nil = unprovable),
and the containers walk their bodies with the right entry set:

* Block / Suite: statement by statement, each from what the previous left.
* If: test reads bound; both branches from the entry set; result is the MEET
  (intersection) of the two -- an absent else contributes the entry set.
* While: test reads bound at entry; body from the entry set; result is the
  entry set (zero-trip).  A name bound late in one iteration is not known
  bound at the top of the next, so a read there is refused.
* For: iterable reads bound; body from entry ∪ {target}; result the entry set.
* Try: body from entry; else from what the BODY left (the cut-26 refinement);
  each handler from entry ∪ {as-name}, type reads bound at entry; finally from
  entry (it also runs when no handler matched).  Result: else-path met with
  every handler path, then the finally's own bindings added.  The as-name is
  left out of its handler's contribution (text keeps the temp, CPython unbinds
  it; a later read keeps the def on text either way).
* Terminators (return, raise, break, continue): reads bound; answer EVERY
  local -- what follows on that path is dead, and a branch that returns must
  not narrow what the other branch bound.
* Everything else: the old simple rule (reads bound, nested writes bound, the
  statement's `___irTopLevelWriteNames___:` added).  That hook replaces the
  single `___irLocalWriteTarget___:` in the analysis, so a statement binding
  several names at once (a multi-alias import, a tuple unpack) can say so.

Soundness argument: the set answered for a statement is a subset of the names
bound on every path through it, by construction of the meets and the zero-trip
loop rule, so a read the walk accepts is a read of a name bound on every path
to it.  The fixture's `maybe` (``if flag: x = 1; return x'') is the negative
control: it must stay on text so the guard raises UnboundLocalError, and
`maybe_unbound` asserts that it does.

Fixture: `with_else` loses its ``v = None'' pre-bind; first_even_bound, label,
sum_squares, try_get, try_get_else, countdown, maybe_unbound; compiled
106 -> 113 (`maybe` excluded).

**Cut 31 flag-on triage -> a traceback defect, fixed.** The wider eligibility
made general_traceback.py's two catching defs IR-compiled for the first time,
and `TracebackTestCase>>testCaughtExceptionHasFrame` failed: each traceback
held only the `<module>` frame.  `BaseException class>>___isIRPythonMethod___:`
classed a method as IR only if its source began with ``def '' AND contained no
``___curPos___'' -- and that fixture's Python COMMENTS mention ___curPos___ by
name.  An IR method's attached source is the user's Python, comments included
(a text method's generated source never carries comments, which is what the
old marker heuristics relied on), so the defs were classed as text, the marker
scan found no ``___curPos___ :='' store, and the frame was dropped as
non-Python.  The prefix test is decisive alone -- generated text begins with
the selector pattern and no Python identifier is ``def'' -- so the exclusion
is gone.  Any IR def whose source mentioned ___curPos___ would have vanished
from tracebacks the same way.

Cut 31 flag-on residue after the fix: the PEP 657 column families
(`testForLoopExceptionPositions`, `RaiseSpanTestCase`, `SpanEndTokenTestCase`),
the temps-fast-path test, and one AlmostOutOfMemory-driven shard ERROR
(`PropertyNotDynamicClassAttributeTestCase>>testNeitherMroNamesTheSharedImplementationBase`,
10 hits of the notification in that shard's log).

A probe note: a single-class flag-on run in a bare topaz session dies with
``VM temporary object memory is full, code space doits_meths overflow'' for
TracebackTestCase; pass run_tests.sh's `-C "GEM_TEMPOBJ_CODE_SIZE=300000;
GEM_TEMPOBJ_CACHE_SIZE=500000;"`.

## Progress — cut 32 (`from x import y`, multi-alias imports, `del name`)

All three were held back by the single-write-target flow rule cut 31 replaced.

* `from m import a, b as c` inside a def: valueSourceFor:'s two shapes, one
  statement per alias.  The fromlist carries the imported name so the importer
  answers the LEAF module (``___import__: { 'abs.name'. nil. nil. { 'attr' }.
  0 } kw: nil''); then ``@env1:___pyAttrLoad___: #attr'' -- or, when the
  module class resolves at compile time and ``attr'' is one of its env-1
  fast-path methods, the text's ``BoundMethod receiver: … selector: #attr''
  wrap.  Relative imports resolve through resolvedModuleName as the text does;
  a star import is refused (module-level only anyway).  The fixture covers
  both value shapes: `from math import sqrt` (fast-path wrap) and
  `from os.path import join as pjoin, sep` (attribute loads).
* `import a, b`: ImportAst's emit loops over its aliases;
  ___irTopLevelWriteNames___: answers every bound name.  The shared
  ``((Python @env0:at: #builtins) instance)'' receiver moved to
  StatementAst>>___emitIRBuiltinsInstanceOn___:.
* `del name`: the text's function-local branch, ``name := nil''.  Soundness
  comes from the flow analysis, not a guard: DeleteAst's ___irFlowBound___
  drops the name, so a later read makes the def ineligible and the text
  path's unbound guard raises UnboundLocalError (the fixture's
  `drop_then_read` is the negative control).  A DELETED parameter is carried
  like a reassigned one (transport argument + temp), the text's
  paramNeedsTemp rule with deletedNamesInSubtree folded in.

Fixture: from_import, from_import_alias, multi_import, drop_name, drop_param,
drop_then_read_raises; compiled 113 -> 119.

Cut 32 flag-on sweep: the four known-family residuals plus two ERRORs that
the runner now labels outright as ``a AlmostOutOfMemory occurred (notification
6013)'' -- `PropertyNotDynamicClassAttributeTestCase>>testARealPropertyStillClassifiesAsOne`
and `WeakReferenceTestCase>>testCallbackFiredOnCollection`; the latter passes
alone in a forced-flag session.  The pressure effect, not emit defects.

## Progress — cut 33 (tuple / list unpacking targets)

`a, b = expr` (single target; chained assignment stays on text) reproduces
printSmalltalkTupleStoreOn:target: + emitUnpackCoercionAndStoresOn:elts:holder::

    ___unpack___ := (expr) ___unpackSequence___ ___unpackCheck___: nBefore star: b after: nAfter.
    a := ___unpack___ __getitem__: 0.   b := ___unpack___ __getitem__: 1.

with the star element reading ``___getslice___: i _: -nAfter _: nil'' and the
elements after it reading negative indices, exactly as the text.  Leaves may be
locals, attribute stores (``__setattr__: 'attr' _:'', String name) or subscript
stores; a nested tuple recurses with holder ``___unpack____n'' (the text's block
temp names), and the holders are METHOD temps reused per depth, so a user local
of one of those names makes the def ineligible.  The machinery lives on
AbstractNode (___irUnpackTargetEligible___:locals:, ___emitIRUnpack___:from:
holder:on:, ___emitIRUnpackStore___:from:holder:on:) because ``with … as
(a, b)'' uses the same per-leaf stores.

`for k, v in items` reproduces printSmalltalkOn:'s tuple branch: the step lands
in ``___itemN___'', is normalised through ``PythonCoroutine
___unpackNormalize___:'' (unpacking is defined by iteration), and each leaf reads
``(src __getitem__: i)'' with the subscript re-evaluated per leaf for a nested
tuple (emitUnpackOn:target:source:depth:).  A starred for-target stays on text:
its shape needs a Smalltalk arithmetic send (``@env0:-'') the IR emit does not
yet make.  ForAst's collectors and flow entry now take the target's LEAF names.

AssignAst answers the leaf names as its ___irTopLevelWriteNames___: -- the
first user of the multi-name hook cut 31 introduced.

Fixture: swap, head_tail, middle_star, nested_unpack, unpack_into,
unpack_items, pairs_sum, nested_for, unpack_count_error; compiled 119 -> 128,
first try.

Cut 33 flag-on sweep: the four known-family residuals plus two ERRORs the
runner labels AlmostOutOfMemory (`SubclassAttrShadowTestCase>>testMiChildSeesNearestBase`,
`ZipfileTestCase>>testOpenStreamsInSmallReads`) -- the pressure effect.

## Progress — cut 34 (the `with` statement)

printItem:onStream:'s nest, one ``[:___cm___ | ...] value: (expr)'' per item,
innermost item running the body.  Inside each block the same sends as the
text: ``PythonCoroutine @env0:___grailAwait___: ((___cm___ @env1:___pyAttrLoad___:
#'__enter__') @env1:value: { } value: nil)'' stored into the ``as'' target (any
store shape the cut-33 unpack emitter knows -- a name, an attribute, a
subscript, a tuple on holder ``___tgt____n''), the body under ``@env0:on:
BaseException do:'' with the control-flow-signal filter (PythonReturn / Break /
Continue get a clean __exit__ and ``pass''), and the exceptional __exit__ run
under ``BaseException ___whileHandling___:do:'' on the PAYLOAD with a falsy
result re-``pass''-ing the exception.

Two departures, both because an IR ``return'' is a real ``^'' (returnFromHome)
where the text signals PythonReturn for its own handler to catch:

* the CLEAN __exit__(None, None, None) runs from an ``ensure:'' block, guarded
  by a ``___handled___'' block temp the handler sets first, instead of the
  text's ``(protected) == true ifTrue: [...]'' after the on:do:.  A ``^'' out of
  the body never reaches the handler, but ensure blocks run on every unwind,
  so the manager still exits cleanly on return; a handled exception -- passed
  on or suppressed -- set the flag, so it gets no second __exit__, exactly the
  double-call the text's ``else'' placement fixed;
* there is no ``___val___'' temp: the enter value goes straight into the target
  (or is evaluated for effect when there is none).

`AsyncWithAst` (a subclass) never qualifies.  Flow: items in order -- each
manager expression's reads must be bound by what precedes it and its target
names join the set (``with a() as x, b(x) as y'') -- then the body walks from
that set; afterwards only the targets count as bound, since a suppressed body
exception skips the rest of the body.  The control-signal filter moved to
StatementAst>>___emitIRControlSignalGuard___:on: (TryAst still carries its own
copy; a later tidy).

Fixture: two text-compiled managers (Ctx logging enter/exit and optionally
suppressing; Pair whose __enter__ answers a tuple) and with_plain, with_target,
with_return (+ with_return_log asserting the clean exit ran on the ``^''),
with_raise, with_suppress, with_two, with_break, with_tuple; compiled
128 -> 137, first try.

Cut 34 flag-on sweep: the known families, one AlmostOutOfMemory ERROR
(`SmalltalkForwarderTestCase>>testStaticmethodKeywordForwarder`), and one NEW
member of the PEP 657 column family:
`WithItemPositionsTestCase>>testTheColumnsIdentifyWhichManagerFailed` reads
``[None, None]'' for ``[22, 34]'' -- the manager expression's COLUMNS in the
frame that blames a raising __init__.  The line is right (the sibling tests
pass; the enter-call send is stamped at the manager expression's offset); IR
frames carry no columns until the (method, ip) -> span side table exists.

## Progress — cut 40 (parameter defaults: the varargs `_name:kw:` form)

The first signature cut.  A def with positional defaults compiles, as in the
text, to the ONE varargs method `_name: positional kw: kwargs` (the same
selector the stub pre-pass registered and `CallAst>>moduleSelfSendVarargs
Selector` / `___irCallShape___` already reach), whose body opens with
generateModuleMethodSourceOn:'s non-simple prologue, statement for statement
(oracle: the GRAIL_CODEGEN_TRACE_DIR dump of a nine-def probe module):

    ((positional size) > 2) ifTrue: [TypeError ___signal___: ('f() takes from 1 to 2
        positional arguments but ' , positional size printString , (positional size > 1
        ifTrue: [' were given'] ifFalse: [' was given']))].            printArgCountChecksOn:
    (kwargs isNil) not ifTrue: [kwargs keysDo: [:___k___ | ({ 'a'. 'b' } includes:
        ___k___ asString) ifFalse: [TypeError ___signal___: ('f() got an unexpected
        keyword argument ''' , ___k___ asString , '''')]]].
    ((positional size) < 1) ifTrue: [TypeError ___checkMissingPositional___: positional
        kwargs: kwargs names: #( 'a' ) posonly: 0 qualifiedName: 'f'].   printMissingPositionalCheckOn:
    a := ((positional size) >= 1) ifTrue: [positional at: 1]
        ifFalse: [(kwargs isNil not and: [kwargs includesKey: 'a']) ifTrue: [kwargs at: 'a']
        ifFalse: [TypeError ___signalMissingArguments___: #( 'a' ) kind: 'positional'
        qualifiedName: 'f']].                                            printPositionalUnpackingOn:
    b := ... ifFalse: [(self ___moduleDefaultAt: #'___default_f__b___' compute: [2])]].

In this form EVERY parameter is a method temp the prologue fills, so a
reassigned parameter needs no transport (cut 29's machinery is the fixed-arity
branch's alone), and the method's two arguments follow the text's collision
rule -- `positional` / `kwargs` unless a parameter or body local is spelled the
same, then `___pos___` / `___kw___` (`___irVarargsMethodParamNames___`).  The
`positional`-size compare, `at:`, `includesKey:`, `keysDo:`, `printString` and
`,` are the text's `@env0:` sends; `TypeError ___signal___:` and the two
argument-check class methods are env-1 sends to the symbol-list global.  Three
inlined control shapes the builder lacked -- `and:` (controlOp
COMPAR_AND_SELECTOR), `ifNil:ifNotNil:` (COMPAR_IF_NIL_IF_NOTNIL) and `ifNil:`
(COMPAR_IF_NIL), the values source compilation stamps -- are new builder
constructors (`andValue:then:`, `ifNilValue:then:else:`, `ifNilValue:then:`);
the last two wait for cuts 41/42.

**The default is the text's def-time memo, not a per-call expression.**  The
method body is neither the def's scope nor def time, so the text evaluates
each default through `module>>___moduleDefaultAt:compute:` -- once per module,
shared across calls, which is what keeps `def f(item, bucket=[])` accumulating
as CPython's def-time list does.  The IR emits the same send with the same
`___default_<f>__<p>___` key, so a module whose defs are split between the two
paths shares one memo per default.  The expression inside the `compute:` block
is emitted with `___emitIRValueOn___:` in the METHOD's frame, where the text
resolves its names as module globals; `___irDefaultsReason___` therefore admits
only a default that is an emittable value with NO local in scope
(`#'signature:defaultExpr'` otherwise -- a builtin function as a value, a
lambda) and refuses one that names a parameter or body local at all
(`#'signature:defaultReadsLocal'`) rather than emit it differently from the
text.

The parser registers `*vararg`, keyword-only and `**kwarg` names in
`body.variables` alongside the positional ones, so the IR's body-local
derivation, local-name set, flow seed, pseudo-variable check and annotation
check now run over `___irAllBoundParamNames___` (every kind) instead of
`allParameterNames` (positional only) -- otherwise `args` would have been a
"body local" read before binding.  `___irSignatureReason___` still names
`signature:*args` / `signature:**kwargs` / `signature:kwonly`, and now
`signature:posonly` (the varargs form's positional-only checks are their own
message shapes), each until its cut lands; a def refused for its signature no
longer hides a later reason (`returnAnnotation`, `decorators`) in the census.

Fixture: add_default, step_default (a module-global default, keyword call),
shared_default (the mutable-default memo, called twice), all_default (no
required parameter: no missing check emitted), rebind_default (a rebound
defaulted parameter), default_from_call (a module self-send in the default),
call_defaults (every call route), default_errors (the three TypeError
messages, asserted verbatim) -- plus cut 28's kw_target, on text until now by
its default; compiled 137 -> 146, first try.

Cut 40 flag-on sweep: the known families (`testForLoopExceptionPositions`,
`RaiseSpanTestCase`, `SpanEndTokenTestCase`, `WithItemPositionsTestCase`'s
columns, `testTheTempsFastPathNeedsNoSource`) plus two ERRORs the runner labels
``a AlmostOutOfMemory occurred (notification 6013)'' --
`StaticmethodShadowingTestCase>>testAMultiArgumentStaticmethodIsUnaffected`
(signalled during a cold import's compileMethod:) and
`ZipfileTestCase>>testOpenStreamsInSmallReads` (as in cut 33) -- the pressure
effect, not emit defects.

## Roadmap — what blocks real code, ranked (census of 2026-09-06)

Until batch 5 the cuts were chosen syntax-first, and there was no measure of
progress.  `experiments/ir/CENSUS.md` now measures it: with the flag forced,
the seam records why every top-level def in the vendored stdlib (and, as a
second corpus, the CPython suite's test modules) is or is not IR-compiled.
Re-run it after each batch; the two headline numbers are the progress metric.

**Where we are.** Of the stdlib's 1570 top-level defs, **658 (41.9%) compile
through IR**.  Of ALL 6245 defs in that corpus, 10.5% do -- because 4471
(71.6%) are class-body methods, which the seam never sees.  The test corpus
reads the same way (54.6% of top-level defs; 80% of all defs are class methods).

**What to do next, by defs unblocked** (stdlib counts; the test corpus ranks
them identically):

| # | blocker | stdlib defs | what it takes | status |
| ---: | --- | ---: | --- | --- |
| 1 | class-body methods | 4471 | a second seam in ClassDefAst: the class's methods are compiled at class-build time from source literals embedded in the emitted class statement, so IR needs a transport -- a class-side IR table plus an `___installIRMethod:` runtime call (original plan, step 5) | not started |
| 2 | parameter defaults | 355 | the text's prologue: the def-time default memo, positional/kw binding, the missing-argument TypeErrors; the same emit as (3) | **cut 40** |
| 3 | `*args` / `**kwargs` / keyword-only | 169 | the varargs calling convention (`_f:kw:` selector, the `positional` / `kwargs` binding prologue) | not started |
| 4 | nested defs and lambdas | 239 (204 nested + 34 defs + 1 lambda as first refusal) | closures: a nested def is a block in the enclosing method; needs the PyFunction wrap and cell/temps capture | not started |
| 5 | return / parameter annotations | 168 | annotation runtime statements (`__annotations__`); or simply IGNORE them for the method body and emit only the function-object side, as the text does | not started |
| 6 | decorators | 46 | the def-time decorator application cascade | not started |
| 7 | late-bound module names | 32 | the text's `___moduleAttrLoad___:` fallback for a name neither local, module-var nor resolvable (a star import) -- the IR already emits that send for module names | **cut 35** |
| 8 | comprehensions / genexps | 30 | scoped locals in the builder (a target shadows a method temp), the outer-iterable hoist, the traceback-frame wrapper | not started |
| 9 | generators / async | 24 | the PythonGenerator / PythonCoroutine body wrapper (`___wrapsBody___`); a different method shape | not started |
| 10 | `global` declarations | 12 | module-route the declared names (dynamicInstVarAt:put:) | not started |
| 11 | call-site `*` splats | 9 | `___pyCallSplat___`-style varargs call | not started |
| 12 | the long tail | ~30 | flow refinements (5), pseudo-variable params (4), class defs inside a def (3), `super`/`__class__`/`type` reads (3), attribute/subscript aug-assign targets (5), chained assignment (3), builtin function as a value (2), complex literals (2), walrus (1), loop `else` (2), `raise Cls(kw=...)` (1), Ellipsis (1) | as met |

Items 2 and 3 share machinery and together unblock a third of the refused
top-level defs; item 1 is the only way past ~11% of all defs.  Items 7 and 12
are cheap and keep the syntax coverage honest, but they do not move the
headline number much any more -- the next batch should start on 2+3 or 1.

Still-open non-coverage work: PEP 657 columns for IR frames (the (method, ip)
-> span side table; five test classes measure it), the recursion-guard byte
budget, and the memory-pressure follow-ups (importlib's ``on: AbstractException''
handler unloading a module on a Notification; a larger temp-object cache for
cold shards).

## Where batch 4 leaves the deferred list

Done in cuts 25–30: except tuples, in-handler bare raise, ``raise … from``,
multi-clause except (the shield), try/else, the as-target f_locals parity,
assert, slice loads and slice objects, del subscript/attribute, all nine call
shapes (class constructors, keyword arguments, general callees, module and
attribute varargs), reassigned parameters, function-level import, and -- for
free through the call shapes -- f-strings.

Still deferred: `with` (the __enter__/__exit__ protocol with its own frame
push), comprehensions and generator expressions (ComprehensionAst's iteration
protocol and traceback frame), `from x import y` and multi-alias imports,
`del name`, ``**splat'' keywords and ``*args'' splats, the two arity-mismatch
TypeErrors (text's, deliberately not ours), tuple-target assignment
(``a, b = b, a''), the try/else flow-analysis refinement (body top-level writes
are bound within the else), PEP 657 columns for IR frames (the (method, ip) ->
span side table), and the recursion-guard byte budget that makes
test_recursion_raises_recursion_error flap under the flag.

Cut 30 flag-on sweep: the four known-family residuals, plus one shard-1 ERROR
(`PropertyNotDynamicClassAttributeTestCase>>testARealPropertyStillClassifiesAsOne`
this time) with `AlmostOutOfMemory` present in that shard's log -- the
pressure effect above, landing on whichever import is running when the
ceiling is hit.
