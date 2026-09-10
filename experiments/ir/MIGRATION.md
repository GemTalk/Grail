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

## Progress — cut 35 (late-bound module names)

The census's first actionable row: 32 stdlib defs (re._compiler's star import
of _constants foremost) refused because a bare name was neither a local, a
module variable, a top-level def nor a symbol-list global.  The text path's
answer for such a name is its late module-name binding -- the same
``self @env1:___moduleAttrLoad___: #name'' runtime lookup it emits for a module
variable, raising NameError on a miss -- so ___irNonLocalLoadKind___: now
answers #module for it instead of nil.  The remaining nil exits are the
earlier text dispatcher branches (super / __class__ / type, reserved
identifiers, a builtin function read as a value).  Fixture: read_dynamic over
a ``globals().update'' binding; compiled 137 -> 138.

## Progress — cut 36 (the class-method seam: plain instance methods)

Roadmap item 1, opened.  A Python class's methods are compiled at RUN time:
ClassDefAst emits, into the module's initialize, one ``<cls> ___compileMethod:
'<source>' category: 'Grail-Class Methods'.`` statement per def, with the method
source embedded as a string literal, and the class object only exists when
that statement runs.  An IR tree cannot travel inside a string literal, so the
transport is a session-side table plus a deferred build:

* while ClassDefAst emits the class body -- the moment the compile context
  (classBeingCompiled, selfParameterName, classFunctionNames, the slot and
  backing-instVar sets, ...) is exactly what the text source was generated
  under -- an IR-eligible def is registered with `importlib
  ___irRegisterDef:forClass:name:`, which stores the def AST together with
  `CallAst ___compileContextSnapshot___` (a copy of the session compile-context
  dictionary) and answers an id;
* the emission loop then writes ``importlib @env0:___irInstallDef: <id> on:
  <cls> or: '<source>' category: 'Grail-Class Methods'.`` in place of the
  ___compileMethod: statement (ClassDefAst>>emitIRInstallOn:id:source:
  category:onStream:);
* at run time `importlib ___irInstallDef:on:or:category:` restores the
  snapshot around `FunctionDefAst>>___installIRMethodOn___:category:` -- the
  module-def builder with the method selector (`instanceMethodSelector`), the
  receiver stripped from the Smalltalk arguments (`___irBuildParamNames___`)
  and the category set explicitly (the runtime tells a def from a class-body
  value BY category: object>>___setNameOn___:, the property-pair test) -- and
  on any error, or with the flag off, or an unknown id, compiles the embedded
  text exactly as before.  The same stats counters record the outcome.

The table is session-local like the compile context: a module builds and
runs in one session, and a deployed class keeps its methods in the repository.

**Method-mode eligibility** (`___irMethodModeReason___`, each exit a census
``method:...`` row) is deliberately narrow for this cut: a PLAIN instance
method (`InstanceFunctionDefAst` -- no @classmethod / @staticmethod /
decorators / forwarders) of a module-level class, receiver named ``self`` and
never rebound, no __slots__, no method temp shadowing a backing instVar, and
NOT `__init__`: it compiles under the varargs selector ``___init__:kw:`` even
when simple-positional (compilesAsVarargs, for keyword construction), so it
needs the varargs calling convention the defaults/varargs lane is building.
Everything else about the body is the module-def rules.

**Method-body emits added**, each the text's own shape: ``self`` is the
receiver (`NameAst>>___irIsSelfReceiver___`); ``self.x`` loads as
``(self @env0:dynamicInstVarAt: #x ifAbsent: [self @env1:___pyAttrLoad___: #x])``;
``self.x = v`` is the same ``__setattr__: 'x' _:`` send as a foreign store;
``self.m(a)`` for a sibling def is the direct self-send ``(self m: a)``
(#classSelfSend; the keyword / arity-mismatch varargs twin is refused); a
module variable, or a free name resolving nowhere, loads through the module
singleton ``(<Module> @env0:___instance___) @env1:___moduleAttrLoad___:``
(#moduleInstance); a same-module top-level FUNCTION read (the dynamic-slot-first
BoundMethod shape) and a closure-cell read are refused for now.

**Three defects found by the smoke fixture**, in order: the bulk rename of
``allParameterNames`` to the build-params helper reached three TEXT-path
methods that follow the IR section in the file -- `instanceMethodParameterNames`
recursed into the helper (stack overflow on import) and the two source
generators would have changed the text path; the receiver became a body local
because the body-locals helper excluded only the build params, so every
``self`` read failed the flow proof (`cm:flow` for all seven methods); and
`__init__`'s varargs selector was built with a fixed-arity argument list (the
constructor's `perform:` then reported a MessageNotUnderstood).  Also changed
in passing: `PyMethodIRBuilder>>ensureEnvDict` created a class's first env-1
method dictionary through the `intoMethodDict: nil` compile variant; it now
uses the plain form ___compileMethod: uses, with the stub removed again.

**Two more defects, both found only by the cold flag-on sweep**, which is
exactly what it is for:

* **Every shard died of ``VM temporary object memory is full''.**  The def
  table held each registered def AST -- and, through the parent chain, its
  whole module AST -- plus a context snapshot, for the session.  Two leaks:
  a registration was never released once its install statement had run
  (fixed: `___irInstallDef:` removes the entry first), and a module whose
  class bodies were COMPILED but whose body did not RUN in the session (a
  deployed module bound from the repository) left every registration
  pending -- 640 of them after twenty stdlib imports (fixed: `loadModuleFromPath:`
  purges the module's pending registrations in its ensure:).  The per-class
  name->id map is dropped after emission, and an id the emission loop did not
  consume is dropped with it.
* **1044 errors, ``NameError: method compile failed []'', all under classes
  with several bases.**  `importlib ___mergeSecondaryBases___:bases:` (and the
  enum gap-fill walk) copies a secondary base's methods onto the subclass by
  RECOMPILING THEIR SOURCE -- and an IR method's source is its Python, which
  the Smalltalk compiler rejects; `___compileMethod:` then installs the
  codegen-gap stub, and the first call raises.  The instance-side copies now
  go through `___copyMethod___:from:to:category:`, which SHARES the GsNMethod
  when the provider's method is IR-built (sound for what method mode admits:
  no super, no instVar references) and recompiles text otherwise.  The
  class-side copies still recompile text; class-side methods are not IR yet.
  A general lesson recorded: any consumer that re-compiles a method's
  sourceString must first ask `BaseException ___isIRPythonMethod___:`.

Fixture: `Counter` (four plain methods over `self.value` / `self.log`, a
self-send, `str()`, a module variable) and `counter_run`; the with fixture's
`Pair` and `Ctx` managers gain IR methods too; compiled 138 -> 147 (`__init__`
of both classes stays on text).  The census now tallies class methods by
reason (``cm:...`` rows) from inside ClassDefAst's emit, where the context is
live; the report shows them as their own table.

Cut 36 flag-on sweep (fifth run, after the fixes above): the known families,
two AlmostOutOfMemory ERRORs, and two NEW inherent residuals:
`ImportlibTestCase>>testInstanceMethodNoOuterBlock` reads the generated .tpz
text for ``Counter ___compileMethod: 'get ...''' -- under the flag that method
is an ``___irInstallDef:'' statement, so the assertion is about a shape the
IR path does not emit (the temps-fast-path test's twin); and
`FrameReceiverSuggestionTestCase>>testASuggestionMayNameTheReceiver` -- the
``self.blech'' suggestion for a NameError raised inside an IR method.  The
receiver name comes from the class-side ``___methodReceiverTable___'' via
PyFrame>>___receiverNameForMethod___:, which the frame walk consults only for
frames it recognises through the text's ``___curPos___'' marker names
(___namesIncludeCodegenMarker___:); an IR frame has no such names.  The same
gap as the PEP 657 columns -- the frame walk's text-marker heuristics -- and
it joins that family for the (method, ip) side-table work.
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

## Progress — cut 41 (`*args` and `**kwargs`)

The two collectors, appended to cut 40's prologue where the text appends them
(after the positional binding; the keyword-only binding of cut 42 goes between
them):

    args := tuple perform: #withAll: env: 0 withArguments: { positional copyFrom: 3
        to: positional size }.                                    *vararg
    kwargs := (___kw___ ifNil: [(PyDict perform: #new env: 0)]) copy.
    kwargs removeKey: 'k' ifAbsent: [].  kwargs removeKey: 'a' ifAbsent: [].   **kwarg

The vararg is the positional tail as a tuple -- TupleAst's env-0 `withAll:`
over `copyFrom:to:`.  The **kwarg is a COPY of the caller's dict (never
mutated) with every name the prologue already bound removed: the keyword-only
names first, then the regular positional ones; positional-only names stay,
since a keyword spelled like one legitimately lands there (cut 43 admits
those).  `removeKey:ifAbsent: []` takes an EMPTY block, which the IR accepts as
a GsComBlockNode with no statements -- exactly what source compilation
produces for `[]`.

The guards adapt as the text's do: `*args` absorbs the positional tail, so the
too-many-positional check is not emitted; `**kwargs` collects unknown keywords,
so the unexpected-keyword check is not.  The `kwargs`-vs-`___kw___` method
argument rename (cut 40) is what makes `def f(**kwargs)` work at all: the
user's `kwargs` is the temp, the incoming dict arrives as `___kw___`; the
fixture's `star_named_collision(*positional, **kwargs)` renames both.

Fixture: star_args, star_kwargs (sorted items), star_both, star_defaults (a
default before the star), star_named_collision, star_calls (nine call routes),
star_errors (the four TypeError messages, verbatim); compiled 146 -> 153.

Cut 41 flag-on sweep: the known families, plus two things worth naming.  (1) A
NEW member of the PEP 657 column family: `LambdaFrameTestCase>>
testLambdaFrameSpans` (and, behind it, `a_nested_lambda_spans_its_own_body`)
-- the fixture's `def _boom(*args): return 1 / 0` is IR-compiled now, and its
frame reads `('_boom', None)` where the check wants the columns of `1 / 0`; the
lambda frames themselves are right.  (2) One `AlmostOutOfMemory` ERROR
(`SmalltalkForwarderTestCase>>testStaticmethodDerivedForwarder`, signalled
during a cold import) after which EVERY remaining test of that shard -- 102,
S through W -- ERRORed with `CompileError 1001, undefined symbol ...` on its
fixture module's compile; all eight of the classes sampled pass alone in a
fresh forced-flag session.  The pressure effect in a more expensive form than
the one-test hits of cuts 29-34: the notification's unload evidently leaves
the shard's compile scope broken, so the ``on: AbstractException'' follow-up
recorded under cut 29 has a larger cost than was known.

## Progress — cut 42 (keyword-only parameters)

Three additions to the prologue, each the text's:

* the too-many-positional guard grows CPython's parenthetical when the call
  ALSO bound keyword-only parameters (`takes 1 positional argument but 2
  positional arguments (and 1 keyword-only argument) were given`,
  test_keywordonlyarg pins it).  The count is runtime -- the kw dict's keys
  that name a keyword-only parameter -- accumulated in `___kg___`, which is a
  block temp of an INLINED block in the text and so a method temp here, over
  `{ 'k'. 'j' } do: [:___n___ | kwargs keysDo: [:___k___ | ... ifTrue: [___kg___
  := ___kg___ + 1]]]`; a store to a method temp from inside real nested
  blocks, which probe 05 proved needs nothing from the producer.  The plain
  message is the fall-through (`___emitIRTooManyWithKeywordOnlyOn___:...`);
* after the positional and *vararg bindings, `TypeError
  ___checkMissingKeywordOnly___: kwargs defaults: nil names: #( 'k' )
  qualifiedName: 'f'` -- only when some keyword-only parameter has no default
  -- then per parameter `k := kwargs ifNil: [<default or raise>] ifNotNil:
  [kwargs at: 'k' ifAbsent: [<default or raise>]]`, the fallback emitted twice
  as fresh nodes (cut 40's `ifNilValue:then:else:` finally used);
* the keyword-only names join the accepted list of the unexpected-keyword
  guard, and the kw_defaults (positionally paired with kwonlyargs, nil where
  required) go through `___irDefaultsReason___` like the positional ones.

`___irSignatureReason___` now refuses only `signature:posonly` (and a default
expression it cannot emit).

Fixture: kw_only (required + defaulted), kw_only_default_global, kw_only_star
(`*args` plus a keyword-only default), kw_only_kwargs (keyword-only dropped
from **rest), kw_only_calls, kw_only_errors (the four messages verbatim,
including the parenthetical); compiled 153 -> 159.

Cut 42 flag-on sweep: the known families (now including cut 41's
`testLambdaFrameSpans`) plus two `AlmostOutOfMemory` ERRORs
(`StaticmethodShadowingTestCase>>testAnUnshadowedStaticmethodIsUnaffected`,
`ZipfileTestCase>>testOpenStreamsInSmallReads`) -- the pressure effect, this
time without the cascade.

## Progress — cut 43 (positional-only parameters in the varargs form)

The last signature shape; `___irSignatureReason___` now judges only the
default expressions.  A positional-only parameter (PEP 570) is not
keyword-bindable, which changes three places, each the text's:

* its binding has no kwargs gate: `a := (positional size >= 1) ifTrue:
  [positional at: 1] ifFalse: [<default or raise>]`;
* the missing-positional check passes `posonly: N` (the leading positional-only
  parameters among the required ones) so the runtime check does not credit a
  keyword of that name;
* the unexpected-keyword guard becomes the collecting form: every keyword that
  names a positional-only parameter goes to `___po___` (in PARAMETER order),
  the first plainly unknown one to `___unk___`, and the positional-only report
  outranks the unknown one, as CPython's format_kwargs_error does -- `f() got
  some positional-only arguments passed as keyword arguments: 'a, b'`, joined
  by `inject:into:` over a two-argument block.  The text wraps this in an
  immediately-evaluated `[ | ___po___ ___unk___ | ... ] value` only to declare
  the two temps mid-method; here they are method temps and the statements sit
  in the guard's `ifTrue:` block directly -- the same sends in the same order.

Two builder additions: `orValue:then:` (inlined `or:`, COMPAR_OR_SELECTOR) and
`blockWithArgs:do:` (a block with several arguments, for the `inject:into:`).

Fixture: pos_only (`a, /, b=2`), pos_only_kw (positional-only names surviving
into **rest), pos_only_calls, pos_only_errors (the posonly report from a lone
keyword and from a keyword mixed with an unknown one, the unknown-only case,
and the missing case); compiled 159 -> 163.

Cut 43 flag-on sweep: the known families plus two `AlmostOutOfMemory` ERRORs
(`SmalltalkForwarderTestCase>>testKeywordSelectorTwoArgs`,
`ZipfileTestCase>>testOpenStreamsInSmallReads`) -- the pressure effect.

With cuts 40-43 the whole signature grammar -- defaults, `*args`, `**kwargs`,
keyword-only, positional-only -- compiles through IR at the module-def seam;
`___irSignatureReason___` refuses only a default expression it cannot emit.

## Batch 6: the two lanes merged

Cuts 35-36 (wt/c) and 40-43 (wt/d) were developed in parallel on two
worktrees and merged in FunctionDefAst: the varargs lane's all-bound-parameter
set feeds the body-local derivation and the flow analysis, minus the receiver
in method mode (`___irLocalParamNames___`); the class-method lane's build
parameters name the Smalltalk arguments of the simple form inside the varargs
lane's branch; the eligibility predicate runs the method-mode conditions first
(they keep methods on the simple-positional selector for now) and then the
signature judgement.  Smoke fixture 147 + 26 = 173 compiled.

Merged flag-on sweep: 6429 run, 8 failed, 1 error -- all known: the PEP 657
span family (`testForLoopExceptionPositions`, `RaiseSpanTestCase`,
`SpanEndTokenTestCase`, `WithItemPositionsTestCase`, `LambdaFrameTestCase`),
the two generated-text introspections (`testTheTempsFastPathNeedsNoSource`,
`testInstanceMethodNoOuterBlock`), the IR-frame receiver suggestion, and one
AlmostOutOfMemory.

After merging main (#835, the bound-method capture pin): flag-off 6430/6430;
flag-on adds `PrivateNameManglingTestCase>>testPrivateNameMangling` -- the
fixture's ``Deep'' recursion (a private method recursing until RecursionError,
which the caller's ``except RecursionError'' must catch) now escapes the IR
handler: the recursion-guard byte budget, already on the deferred list
(test_recursion_raises_recursion_error flaps the same way).  An IR frame is
narrower than its text twin, so the guard fires at a different depth and the
reserve left for the handler differs; the test passed alone before #835 moved
the call path's frame sizes.  Deterministic now, and the right fix is the
guard's, not the emitter's.

## Progress — cut 44 (class-body methods on the varargs selector)

Roadmap item 1a, the largest single blocker in the census (`method:varargsSelector`,
1235 stdlib methods): a method that compiles as varargs -- parameter defaults,
`*args` / `**kwargs`, keyword-only or positional-only parameters, and
`__init__` always, since `compilesAsVarargs` forces it there so keyword
construction and `super().__init__(a=1)` bind by name.  The cuts 40-43
prologue now runs in method mode, and the differences from the module form
are exactly the text's (`generateMethodSourceOn:`'s varargs branch against
`generateModuleMethodSourceOn:`'s):

* `___irUsesVarargsForm___` is the text's rule per generator -- a module def
  whenever the signature is not simple-positional, a method under
  `compilesAsVarargs` -- and replaces the `isSimplePositionalArgs` test both
  in the install and in eligibility;
* the prologue declares every bound parameter BUT the receiver as a temp
  (`___irLocalParamNames___`; `self` is the Smalltalk receiver) and binds the
  positional parameters AFTER `self` (`___irBuildParamNames___`, the text's
  `instanceMethodParameterNames`), so `positional at: 1` is the first real
  parameter and the arity messages count as the text's do; the
  positional-only count is the text's consecutive-leading-names count, so a
  positional-only `self` is not counted;
* `___irSelector___` answers `_<mangled>:kw:`;
* the def-time default memo takes the text's CLASS form,
  `((self ___grailClassDefault___: #'___default_<Cls>__<f>__<p>___') ifNil:
  [expr])` -- the class-side table ClassDefAst fills while the class body
  runs, the inline expression the fallback -- keyed by
  `___classDefaultKeyFor___:className:` so a class split between the two
  paths shares one stored default per parameter;
* a default naming any bound parameter, the receiver included, is refused
  (`signature:defaultReadsLocal`): it is a def-time NameError in CPython, and
  the text would emit a receiver read.

The fixture found one defect outside the emitter: `CallAst
___compileContextSnapshot___` was a shallow copy, so the deferred build
shared the LIVE lexical scope stack, which `___restoreScopeDepth___:` had
truncated by the time the class-build statement ran -- the arity messages a
varargs prologue bakes in came out as `advance()` where the text (and
CPython) say `Gauge.advance()`.  Cut 36's plain methods never noticed: a
fixed-arity method bakes no message, and the `__qualname__` stamp lives in
the text-emitted class body.  The stack is now copied into the snapshot.

Fixture: class Gauge (a defaulted `__init__`, keyword-only, `*args` /
`**kwargs`, positional-only, a module-global default, a shared mutable
default) and its callers; the arity-message assertions are limited to the
spellings CPython and Grail agree on (CPython counts `self` in "takes N
positional arguments", Grail does not -- a text-path difference, not an IR
one).  Compiled 173 -> 184: the six Gauge methods, three callers, and
`Ctx.__init__` / `Counter.__init__`, which were refused until now.

## Progress — cut 45 (classes whose backing instVars are unknown)

Roadmap item 1b (`method:unknownInstVars`, 1152 stdlib methods), and it
turned out to need no install-time check at all.  Both refusals --
`unknownInstVars` for a class not rooted at PythonInstance, `instVarShadow`
for a local spelled like a backing instVar -- were the TEXT's constraints: a
method temp that shadows an instance variable is a CompileError for the
source compiler, so the text keeps such locals in an outer `^ [ ... ] value`
block and cannot decide when it cannot enumerate the instVars at emit time (a
dict / str / Exception root brings slots the compile does not see).

The IR has no name resolution.  A method temp and an instVar are distinct
`GsComVarLeaf` nodes whatever they are called, and `generateFromIR:` accepts
the method -- measured before the cut, with a class carrying instVar `xval`
and an IR method declaring temp `xval`: it compiles, answers the temp's value
(7) and leaves the instVar untouched (99).  Every read and write of the Python
local resolves to the temp, which is exactly the text's block-temp semantics.
So both rules go; `method:slots` stays (a `__slots__` class stores `self.x`
in a mangled instVar the IR's dynamic-instVar emit does not reach -- 1c).

Fixture: Boom(Exception) with a local `args` (a named instVar of the
Smalltalk Exception beneath it) and a parameter `messageText`; Bag(dict) with
locals `count` / `total` and a `self[key] = value` store.  Compiled 184 -> 190.

## Batch 7 after merging main (#836)

Main brought #836 -- `self.m()` honours an override -- whose dispatcher keeps
the pristine original under a `___grailOrig_` shadow by recompiling `orig
sourceString` with the prefix, and `del C.m` does the same.  That is the
[recompiling-method-source] trap of cut 36 again: an IR method's source is
its Python, so under the flag the shadow compiled nothing, the dispatcher's
fall-through DNU'd (`SelfSendOverrideTestCase`), and a metaclass that stores
the class body's defs as attributes installed a dispatcher whose pinned
capture found no shadow and re-entered it until AlmostOutOfStack
(`MetaclassDispatchTestCase`, `ClassBodyNamespaceDefsTestCase`) -- three new
flag-on errors on the merged tree, none of them from cuts 44-45.

Both sites now go through `importlib ___copyMethod___:from:to:prefix:category:`
(the cut-36 copier with a selector prefix): a text method's source recompiled
prefixed, exactly as before; an IR method recompiled from its text twin, or
SHARED under the prefixed key when there is none -- a method-dictionary entry
need not be keyed by the method's own selector (measured).  One more lesson
from the same fix: importlib.gs returns to `compile_env: 0` before that
section, so the copier is an env-0 method, and an `@env1:` send from Object.gs
DNU'd *inside the sites' handlers* -- the two tests then failed flag-OFF too,
which is what pointed at the send rather than at the IR.  Every consumer that
recompiles `sourceString` -- MI merge, enum gap-fill, `smalltalk_class`, the
special-receiver recompile, and now the dispatcher shadow and the delete
shadow -- goes through the one helper.

Gates on the merged tree (main incl. #836 and #837, plus cuts 44-45 and the
shadow fix): smoke 4/4 at 190 with 0 fallbacks; flag-off **6431 run, 6431
passed, 0 failed, 0 errors**; flag-on 6431 run, 8 failed, 1 error -- the same
residue as before the merge (five PEP 657 span tests, the two generated-text
introspections, the IR-frame receiver suggestion, the private-name recursion
budget) and nothing new.

## Progress — cut 47 (annotations) and cut 48 (decorators)

Roadmap items 5 and 6, the two largest class-method blockers after batch 7
(return annotations 1140 methods + 258 defs; decorators 353 + 70).  Both
turned out to be eligibility-only cuts: neither changes an emit.

**Annotations (cut 47).** The refusal assumed annotations emit runtime
statements the IR does not produce.  They do -- but never in the method.  A
module def's PEP 649 `__annotate__` is stamped on the module instance by the
def STATEMENT (`___setFunctionAnnotations___:annotate:` in
`printSmalltalkOn:`), a class method's by ClassDefAst's stamp loop
(`___methodAnnotationsTable___` and friends), both text statements emitted
around the compiled method whichever path built it; neither
`generateModuleMethodSourceOn:` nor `generateMethodSourceOn:` reads
`returns` or a parameter annotation.  The two refusals go; `typeParams` (PEP
695) stays.

**Decorators (cut 48).** The same shape.  Grail compiles the def to a real
method FIRST and applies decorators over it afterwards, as text: a module
def's by its statement (`printModuleDecoratorsOn:`, storing `A(B(f))` in the
module slot that every bare call probes first -- the IR's `#moduleSelfSend`
emits the same probe), a class method's by ClassDefAst's decorator loop
(`Cls.m := A(B(Cls.m))` over the compiled method, the base an UnboundMethod
resolved by selector, so an IR method serves as well as a text one).  The
decorator-specific SOURCES -- `@requires_resource` / `@cpython_only` skip
bodies, the `@x.deleter` redirect -- are separate ClassDefAst branches the
predicate is never asked about; a `@property` getter is the plain unary
method plus a synthesized text setter; `@bigmemtest` is normalised before
codegen; and a self-send to a decorated sibling already takes the attribute
path (`classSelfSendSelector` consults `classDecoratedFunctionNames`, and the
IR call shape reuses it).  The refusal goes.

Fixtures: typed_add / typed_none / class Typed with an `__annotations__`
check against CPython's exact values; a `functools.wraps` decorator and a
tagging factory on module defs, class Deco with a decorated method, a
`@property` getter and a self-send to the decorated sibling.  One text gap
recorded and not asserted: `deco_add.__doc__` through `functools.wraps`
answers None on either path.  Compiled 190 -> 196 -> 204.

### Cut 48 flushed out a seam defect: registrations keyed by Python name

The first flag-on sweep lost every `@property` with an explicit setter (six
`AttributePropertyTestCase` failures, the BuiltinSubclassProperty and
ClassBodyMethodDecorator property tests, an inherited-pair read, three
Django WSGI errors -- a request property answering the getter's
BoundMethod).  The seam's per-class registration map (`___irClassDefIdsFor___:`)
was keyed by PYTHON NAME, and a getter and its `@x.setter` share one: the
setter's registration overwrote the getter's, the getter's install
statement built the SETTER (the setter's own text compile overwrote it a
statement later), the getter's text fallback never ran, and the unary
`celsius` was simply absent from the class.  Until cut 48 no two eligible
defs in one class body could share a name, so the key was never exercised.
Keyed by SELECTOR now: `___irSelector___` at registration, and the emission
loop reads the same key off each source's pattern line
(`___irSelectorOfSource___:`).  Fixture: Deco gains a `level` getter/setter
pair; compiled 204 -> 206.

The census then showed four FALLBACKS in the test corpus (`test_large_subn`,
`test_large_utf8_input`, ...): `@bigmemtest` methods.  `applyBigmemtestDefaultIfNeeded`
rewrites the def before codegen, injecting a synthetic `size` default with no
source position, and the default memo stamps the def's position -- the IR
build raised (`nil does not understand #-`) and fell back to text.  Safe, but
a fallback is not a refusal; `isBigmemtestDecorated` now refuses
(`decorators:bigmemtest`), and the fallback counters read 0 across all four
census sessions again.

## Progress — cuts 49-50 (varargs self-sends; module-function reads in methods)

Item 1c's two one-emit pieces.

**Cut 49.** `self.m(a, k=v)`, or a positional self-send to a sibling that
compiles as varargs (defaults, `*args`, keyword-only), took no shape
(`CallAst:selfSendKeywordsOrArity`, 261 stdlib methods).  The text's
`printClassSelfSendVarargsOn:` is `(self _m: { args } kw: kwDict)`; the IR
call shape `#classSelfSendVarargs` emits the same send with the positional
Array and the keyword dict the module twin already builds
(`___emitIRKeywordsOn___:`).

**Cut 50.** A same-module top-level FUNCTION read inside a method
(`NameAst:moduleFunctionInMethod`, 233) is the text's dynamic-slot-first
BoundMethod shape: `((Mod ___instance___) dynamicInstVarAt: #f) ifNil: [
| ___fn___ | ___fn___ := BoundMethod receiver: (Mod ___instance___) selector:
#f. (Mod ___instance___) dynamicInstVarAt: #f put: ___fn___. ___fn___ ]` --
the slot first because a module-level decorator stores its wrapper there,
the compiled def wrapped as a BoundMethod on the module instance and
memoised on a miss.  The text's block temp is a method temp here (an inlined
`ifNil:` block's temp is one anyway), registered once per method.  A CALL of
such a function inside a method already took the `#general` shape once its
callee value could be emitted.

Fixture: class Sender (a keyword self-send, a positional self-send to a
varargs sibling, a module-function call, an aliased read, a read of the
decorated `deco_add` whose slot holds the wrapper).  Compiled 206 -> 215.

## Progress — cut 51 (`__slots__` classes) and cut 52 (annotated assignment)

**Cut 51.** A class with `__slots__` refused every method (`method:slots`,
266 stdlib methods).  The text reads and writes a slot through the mangled
NAMED instVar `___slot_x___` -- `(___slot_x___ ifNil: [self ___pyAttrLoad___:
#x])` on a load (a set slot answers at once, an unset one falls through so
`__getattr__` / AttributeError still apply), `___slot_x___ := (v)` on a
store, the same for a tuple-unpack leaf -- by bare name, since the method
is compiled ON the slotted class.  The IR has no name resolution, so the
builder gains `instVarNamed:`, a `GsComVarLeaf instanceVariable:ivOffset:`
resolved against `targetClass allInstVarNames` -- which is exactly why the
slot classes had to wait for the deferred build, where the class exists.
`AttributeAst>>___irSelfSlotName___` is the one discriminator (`CallAst
classSlotNames`, the text's); the load, the single store and the unpack
store consult it.  Augmented attribute stores stay refused for every
receiver (`AugAssignAst:target-AttributeAst`).

**Cut 52.** Annotated assignment (`stmt:AnnAssignAst`, 79 methods, a shape
the class-method corpus exposed), the text's `printSmalltalkOn:` exactly:
the annotation is never evaluated; a def-local `x: T = v` is `x := v`;
`self.attr: T = v` writes dynamic-instVar storage (`dynamicInstVarAt:put:`,
not `__setattr__` -- the text's choice, mirrored) or the class-side setter
for a name in `classAttrNames`; a foreign `obj.attr: T = v` is the setter
send; a subscript is `__setitem__`; a pure annotation emits nothing and
binds nothing; a module-scope Name target (a `global`-declared name) stays
on text.

Fixtures: class Slotted (init, sum, a tuple-swap of two slots, an unset
non-slot read raising AttributeError); AnnTyped and typed_locals (local,
self-attribute and subscript annotated stores).  Compiled 215 -> 224.

## Progress — cut 53 (generators)

Roadmap item 9, first half: a def whose body contains `yield` (65 stdlib class
methods and a share of 24 top-level defs in the 2026-09-07 census).  The
refusal (`#generator`) went with the `___wrapsBody___` test in
`___irIneligibilityReason___`; `#async` stays for cut 54.

**What the text emits** (GRAIL_CODEGEN_TRACE_DIR on a module def `gen(n)` and a
class method `K.walk(self, n)` -- the two differ only in the outer block's
parameter copies):

    ^ [| ___curPos___ x r |
    PythonGenerator @env1:withBlock: [:___gen___ |
    [
      x := (___gen___ @env1:___yield___: (n)).
      r := (___gen___ @env1:___yieldFrom___: (...)).
      PythonReturn ___signal___: (5).
      None.
    ] @env0:on: PythonReturn do: [:___ex___ | ___ex___ returnValue]]
      name: 'gen' qualname: 'gen'
      code: [((PyCode @env0:name: 'gen' qualname: 'gen' filename: '...'
          firstlineno: 6 argcount: 1 posonlyargcount: 0 kwonlyargcount: 0)
          @env0:___setFlags___: 35)].
    ] value

**What the IR emits** (`FunctionDefAst>>___emitIRWrappedBodyOn___:`, after the
unchanged argument / temp / transport / varargs prologue): the same sends, the
same block nesting.  The method's temps and arguments stand in for the text's
outer-block temps -- the wrapper block closes over them like any IR loop or
handler block -- and the method's one statement is `^ <wrapper class>
withBlock:name:qualname:code:` (env 1) over a `[:___gen___ | ...]` block whose
body is `[stmts. None] on: PythonReturn do: [:___ex___ | ___ex___ returnValue]`
(env 0, `returnValue` env 1), plus the code thunk
(`___emitIRPyCodeExprOn___:qualname:nested:`, the text's PyCode expression
field for field: `___irFileName___`, `beginLine`, the three parameter counts,
`___coFlags___:`, and `___setFreevars___:` when the def has free variables).
The statement list is the text's `___reachableStatements___:`.  The wrapper
class is `___lazyWrapperClass___` -- PythonGenerator here, PythonCoroutine /
PythonAsyncGenerator once cut 54 admits async.

Three node emits carry the body:

* `PyMethodIRBuilder>>genLeaf` holds the `___gen___` block-argument leaf while
  the wrapped body emits (nil outside one; set/cleared under an ensure);
* `YieldAst` / `YieldFromAst` gain the IR protocol: `___gen___ ___yield___: v`
  (`___asyncYield___:` inside an async generator, the text's gate on the
  enclosing function) and `___gen___ ___yieldFrom___: it`, env 1, value the
  send's answer -- so `x = yield v` binds what send() passed.  A yield with no
  ___gen___ raises in the emit (the text's compile error), which the seam
  turns into a fallback;
* `ReturnAst` inside a wrapped body signals `PythonReturn ___signal___: v`
  (env 1) instead of a home return: the home method answered the wrapper
  before the body ever ran, on the generator's own GsProcess, so `^` has no
  live home -- this is the text's #exception return mode, and the wrapper's
  on:do: hands the value to the runtime as StopIteration.value.  Outside a
  wrapped body the direct `^` is unchanged, and it remains the only place
  the IR emits a home return besides the fall-off `^ None`.

Nothing else changed shape: `for` / `while` / `try` / `with` / `if` inside
the generator block are the cuts 5-34 emits, and a `return` through
try/finally inside a generator unwinds through `___ensureFinally___:finally:`
the way the signal does in the text (gen_ret_finally).  The runtime cannot
tell the two apart: send / throw / close, `yield from` delegation, the
StopIteration value, `__name__` / `__qualname__` / `type(g).__name__`, and
the forked-process frame walk all see a PythonGenerator over a block whose
home is the def's method.

**What is still refused**: nothing generator-specific.  A generator body
refuses for what any body refuses (nested defs, comprehensions, the 1c tail).
The async wrappers are cut 54.

**A method-mode gap the fixture found**: `Walker.pairs` and `Walker.take`
stayed on text -- `cm:AugAssignAst:target-NameAst`, for `i += 1`.
`AugAssignAst>>___irLocalNameTarget___:` refused EVERY Name target under
`classBeingCompiled`, a cut-36 conservatism; the text's only method-specific
Name branch is a `nonlocal` of an enclosing function reached past the class
(the closure cells).  The predicate now refuses exactly that
(`___enclosingFunctionLocalBeyondClass___:`) and admits the rest, which take
the same simple-local `___augmentedOp___` send the module form emits.

Fixture: nine generator defs (a counter, `send()` round-trips returning the
received list, `yield from` a sub-generator and a list with the sub-generator's
return value, an early bare `return`, try/finally with `close()`, an except
clause receiving `throw()`, a defaulted `gen_step(n, step=1)` on the varargs
form, `return value` through finally), five consumers (for-loop consumption,
next / send / throw / close, StopIteration.value, `list()`), and class
`Walker` with four generator methods (`for` over `self.items`, a `while` with
`i += 1`, an early return inside the loop, a defaulted `take(self, n=2)`) plus
`type(g).__name__` / `__qualname__` / `__name__` checks; every expected
value verified under CPython 3.14.6.  Compiled 224 -> 241 -> 243 (the last
two are the AugAssign widening), fallbacks 0, first try; the fixture with the
flag OFF reads ALL_OK with compiled=0, so both paths agree.

**Gates** (wt/d, gs40, Claude3):

* smoke tripwire: `4 run, 4 passed`, compiled = 243, fallbacks = 0;
* flag-off `./scripts/run_tests.sh`: `main suite (sharded: 4 of x4): 6431 run, 6431 passed, 0 failed, 0 errors`;
* flag-on cold sweep `GRAIL_TEST_COLD=1 GRAIL_IR_CODEGEN=1 ./scripts/run_tests.sh`:
  `main suite (sharded: 4 of x4): 6431 run, 6422 passed, 8 failed, 1 errors` --
  exactly the known residue at 18ae8495, by name: the five PEP 657 span
  tests (TracebackTestCase>>testForLoopExceptionPositions,
  RaiseSpanTestCase>>testRaiseAndAssertSpans,
  SpanEndTokenTestCase>>testSpanReachesTheEndOfItsLastToken,
  WithItemPositionsTestCase>>testTheColumnsIdentifyWhichManagerFailed,
  LambdaFrameTestCase>>testLambdaFrameSpans),
  LiveFrameProbeResilienceTestCase>>testTheTempsFastPathNeedsNoSource,
  ImportlibTestCase>>testInstanceMethodNoOuterBlock,
  FrameReceiverSuggestionTestCase>>testASuggestionMayNameTheReceiver, and the
  [ERROR] PrivateNameManglingTestCase>>testPrivateNameMangling.  No new
  failure: generator bodies through the wrapper are invisible to the sweep.

## Progress — cut 54 (async defs)

Roadmap item 9, second half: `async def` (66 stdlib class methods in the
2026-09-07 census), covering coroutines AND async generators.  The `#async`
refusal goes; `___irIneligibilityReason___` no longer consults
`___wrapsBody___` at all.

**What the text emits** is cut 53's wrapper with a different class and three
more ___gen___ sends (trace of `co`, `loop_it` and `K.fetch`):

    PythonCoroutine @env1:withBlock: [:___gen___ |
    [
      a := (___gen___ @env1:___grailAwait___: (v)).
      ___iter0___ := PythonCoroutine @env1:___grailAiter___: ((ait)).
      ... i := ([(___gen___ @env1:___grailAwaitAnext___: (___iter0___ __anext__))]
             @env0:on: StopAsyncIteration do: [:___dx___ | PythonLoopDrained ...]).
      ... PythonCoroutine @env0:___checkAsyncCM___: ___cm___.
          ___val___ := (___gen___ @env1:___grailAwaitAenter___: ((___cm___ ... #'__aenter__') ...)).
          ... (___gen___ @env1:___grailAwaitAexit___: (...))
      PythonReturn ___signal___: (...).
      None.
    ] @env0:on: PythonReturn do: [...]] name: 'co' qualname: 'co' code: [... ___setFlags___: 131)]

**What the IR emits.** `___emitIRWrappedBodyOn___:` already took the class
from `___lazyWrapperClass___` (PythonCoroutine; PythonAsyncGenerator when the
body also yields, whose YieldAst emit already switched to `___asyncYield___:`
on the enclosing function), so the def-level change is the refusal alone.
The statement shapes follow the text's own hook structure, so `for` /
`async for` and `with` / `async with` share one emitter each:

* `AwaitAst` gains the IR protocol with printSmalltalkOn:'s two-emit rule:
  inside a wrapped body (`aBuilder genLeaf` set) the INSTANCE-side `___gen___
  ___grailAwait___: v` (env 1), which can suspend the awaiting coroutine
  through ___yieldFrom___:; anywhere else the class-side `PythonCoroutine
  ___grailAwait___: v` (env 0) -- the same form the `with` emitter has used
  since cut 34 for its protocol calls;
* `ForAst`'s emit now goes through three hooks -- `___emitIRIteratorFrom___:on:`
  (`__iter__`), `___emitIRNextFrom___:on:` (`__next__`) and
  `___irExhaustedExceptionSymbol___` (#StopIteration) -- the IR twins of the
  text's `___emitIteratorFrom___:on:` / `___nextExpressionFor___:` /
  `___exhaustedExceptionName___`.  `AsyncForAst` overrides them:
  `PythonCoroutine ___grailAiter___: it` (env 1), `___gen___
  ___grailAwaitAnext___: (___iterN___ __anext__)` (env 1, the strict variant
  that makes a non-awaitable __anext__ a TypeError rather than an endless
  loop) and #StopAsyncIteration.  The loop machinery -- the whileTrue, the
  drain guard, break / continue, target binding -- is untouched;
* `WithAst`'s protocol call takes its selectors from `___enterSelector___` /
  `___exitSelector___` and its await from a new per-site hook
  `___emitIRAwait___:site:on:` (class-side pass-through), and runs
  `___emitIRProtocolPreflightOn___:builder:` (nothing) before the enter call.
  `AsyncWithAst` overrides both: inside a wrapped body `___gen___
  ___grailAwaitAenter___:` / `___grailAwaitAexit___:` (env 1) -- the
  suspending instance forms whose absence once ran an `async with lock:` body
  without the lock -- else the inherited class-side form, as the text; and the
  `PythonCoroutine ___checkAsyncCM___: ___cm___` preflight (env 0) so a
  missing __aexit__ refuses before __aenter__ runs.

**What is still refused**: nothing async-specific.  An async body refuses for
what any body refuses.  `await` / `async for` / `async with` outside a wrapped
body take the text's class-side forms, never a raise, so an `async with` in a
plain def (legal in Grail, a SyntaxError in Python) still compiles either way.

Fixture: a suspending awaitable (`Suspend.__await__`, itself an IR generator
method), an async iterator class (`__aiter__`, `async def __anext__` raising
StopAsyncIteration), an async context manager (`async def __aenter__` /
`__aexit__` logging the exception type), and coroutines for `await`, a plain
return, `async for`, `async with` (clean and with a raise caught outside),
awaiting another coroutine, an async generator consumed by `async for`, and
`return` through finally -- all driven by a hand-rolled `send(None)` loop
that also counts suspensions, plus `type(c).__name__` and `__qualname__`.
Every expected value verified under CPython 3.14.6 and against the text path.
Compiled 243 -> 262 (all nineteen new defs), fallbacks 0, first try; with the
flag OFF the fixture reads ALL_OK at compiled=0.

**Gates** (wt/d, gs40, Claude3):

* smoke tripwire: `4 run, 4 passed`, compiled = 262, fallbacks = 0;
* flag-off `./scripts/run_tests.sh`: `main suite (sharded: 4 of x4): 6431 run, 6431 passed, 0 failed, 0 errors`;
* flag-on cold sweep `GRAIL_TEST_COLD=1 GRAIL_IR_CODEGEN=1 ./scripts/run_tests.sh`:
  `main suite (sharded: 4 of x4): 6431 run, 6422 passed, 8 failed, 1 errors` --
  the same nine as cut 53 and 18ae8495, by name (the five PEP 657 span
  tests, LiveFrameProbeResilienceTestCase>>testTheTempsFastPathNeedsNoSource,
  ImportlibTestCase>>testInstanceMethodNoOuterBlock,
  FrameReceiverSuggestionTestCase>>testASuggestionMayNameTheReceiver, and the
  [ERROR] PrivateNameManglingTestCase>>testPrivateNameMangling).  No new
  failure.  Roadmap item 9 is done; the census should now show no
  `generator` / `async` rows.
## Progress — cut 55 (`super()`, `super(C, obj)`, `__class__`, `type` inside methods)

The largest method-only refusal after batch 9 (`NameAst:super-__class__-type`,
186 stdlib methods + 22 defs) was one label for four reads with four text
shapes.  Every one is emitted now for a method of a MODULE-SCOPE class; the
method-local-class spellings (the closure-cell reads `___classCellForSuper___:`
/ `___dunderClassCell___:`) stay on text, and the method seam refuses those
classes anyway (`method:classNotAtModuleScope`).

**Zero-argument `super()`** (`#superZero`, the corpus's 1662 occurrences) is
the text's `___printShadowableSuperOn___:arm:` exactly:

    ([:___sup___ | ___sup___ == nil
            ifTrue: [(Super @env1:cls: ((<Mod> @env0:___instance___) @env1:<Cls>) obj: self)]
            ifFalse: [___sup___ @env1:value: { } value: nil]]
        @env0:value: ((<Mod> @env0:___instance___) @env1:___grailShadowedSuper___))

-- a real one-argument block so the run-time shadow probe (a `super` patched
onto the module after its body compiled, test_super's test_shadowed_dynamic)
is evaluated once and in the enclosing expression's order; the class read is
wrapped in `___grailClassCellValueForSuper___` when ClassDefAst found the
class's `__class__` cell rebindable (classCellRebindable, in the compile
context the seam snapshots).  The argument-0 deletion guard is absent by
construction: the shape is admitted only for a method's own receiver, which
no `del` can nil.  **`super(C, obj)`** (`#superExplicit`) is `(Super
@env1:checkedCls: <cls> obj: <obj>)`, the first argument read through the
module instance's class accessor when the module binds that name and as its
own value otherwise (a parameter holding a class, a builtin type).
**`__class__`** (`#dunderClass`) is printDefiningClassOn:'s module route,
`((<Mod> @env0:___instance___) @env1:<Cls>)`, wrapped in
`___grailClassCellValue___` when rebindable.  **`type`** as a value is the
bare global `type` (the class, not a BoundMethod wrapper) whenever the text's
fast-path-builtin branch would claim it.

The text branches' compile-time side effects -- `classNeedsClassCell:` and
`___recordClassCellMethod___`, which ClassDefAst reads to inject
`__classcell__` and answer `__closure__` -- are deliberately NOT repeated in
the IR emits: every seam method's text twin is generated first
(`methodSources`, then the registration), so they have already fired under
the same context when the deferred IR build runs.

Two things found on the way.  (1) A Python edit script whose anchor was the
closing brackets of `___irNonLocalLoadKind___:` swallowed the method's `on:
Error do: [:ex | nil]` line into the NEXT method: the guarded block was then
answered UNEVALUATED -- a BlockClosure, non-nil, so every name looked
eligible -- and 59 of 235 smoke defs fell back at emit time with "unhandled
name load ZeroDivisionError".  (2) That was undiagnosable from `lastError`
alone, so `importlib ___irStats___` now carries a `fallbackLog` (every
fallback's `def: message`, capped at 500) and `___irNoteFallback___:error:`
appends to it.

Fixture: Base / Child / Grand (zero-arg `super()` in `__init__` and a
sibling, `super(Child, self)`, `super(cls, obj)` with a parameter,
`__class__` on a subclass instance answering the DEFINING class, `type(self)`,
`isinstance(Child, type)`).  Compiled 224 -> 235.  Flag-on probe of the 72
SUnit classes that mention `super` / `__class__`: 16752 defs compiled, 0
fallbacks, one error -- `SuperTwoArgLocalTestCase>>
testTwoArgSuperAcceptsNonModuleClasses` -- which passed alone and passed on
the probe's re-run, both flag-on, while a flag-off suite was running on the
same stone; recorded, not attributed.

## Progress — cut 56 (call-site `*args` / `**kw` splats; starred tuple and list displays)

`value:StarredAst` (89 methods + 23 defs) was mostly `f(*args, **kwargs)`
forwarding, and `CallAst:doubleStarKwargs` (50 + 31) the same calls' keyword
half.  Both are the text's `printArgumentsArrayOn:` / `printKeywordsDictOn:`:

  * a positional splat is the concatenation `({} @env0:, { a } @env0:, (x
    @env0:___pyStarToArray___) @env0:, { c })` -- an empty seed, one run per
    element -- now `AbstractNode>>___emitIRElementsArrayOn___:elts:`, shared
    by call arguments and by the tuple and list displays `(a, *b)` / `[*a,
    *b]`, whose text emits the same run inside `tuple withAll:` /
    `asOrderedCollection`;
  * a lone `**m` is the mapping itself, no wrapping dict; `**m` among named
    keywords is an env-1 `update:` in the PyDict cascade, in source order
    (later entries win) -- the builder gained `cascade:specs:` with a
    per-send environment for that mix.

The call-shape dispatcher no longer refuses a splat up front: every
fixed-arity selector probe declines it as the text's do, so the call lands on
`#general` / `#attrLegacy` -- or on `#builtinVarargs` / `#attrVarargs`, whose
text printers also go through printArgumentsArrayOn: (the first flag-on probe
caught `max(*xs)` taking that shape with a brace-literal emit; every varargs
shape now splices).  The two arity-mismatch refusals mirror the text's
deferrals: a known builtin's TypeError is not emitted when a splat makes the
arity unknown or the name is also a class with a varargs constructor, a known
class's not when a splat is present.

Fixture: splat_target / splat_calls (positional, mixed, lone `**`, `**` with
named keywords, `*xs, *xs`, `max(*xs)`, `range(*[...])`), splat_seq (starred
tuple and list displays), Splatter (self-sends with splats, `(*xs, len(xs))`).
Compiled 235 -> 242, 0 fallbacks, RESULTS all true with the flag on and off.

Gates for cuts 55-56 together (the two are one commit because the cut-56
fixture was appended while the cut-55 flag-on sweep was still reading the
fixture from disk -- the sweep's one extra failure, the smoke tripwire, was
that edit, and the rule not to touch `tests/python` during a run exists for
exactly this): flag-off `6431 run, 6431 passed, 0 failed, 0 errors`; flag-on cold sweep `6431 run, 6422 passed, 8 failed, 1 errors`, exactly the known nine (the five PEP 657 span tests, the two generated-text introspections, the IR-frame receiver suggestion, the recursion-guard byte budget).  Fixture gate:
316 fixtures, 4938 OK, 39 XFAIL, all agree with CPython 3.14.6.

## Progress — cut 57 (list comprehensions)

Roadmap item 8, first cut: `value:ListCompAst` was the largest remaining
refusal family in the 2026-09-07 census (71 stdlib class methods + 45
top-level defs).

**What the text emits** (GRAIL_CODEGEN_TRACE_DIR on `squares(xs)`,
`pairs(xs, ys)`, `unpack(items)` and the method `K.doubled(self)`):

    ^ (([| ___r___ |
        ___r___ := (OrderedCollection perform: #new env: 0).
        [
        [| ___src1___ |
          ___src1___ := (xs).
          [| ___iter1___ x |
            ___iter1___ := ___src1___ __iter__.
            [true] whileTrue: [
              x := ([___iter1___ __next__] @env0:on: StopIteration do: [:___dx___ | PythonLoopDrained @env0:___signal___]).
              (cond) ___isTruthy___ ifTrue: [
                [| ___iter2___ b |  ___iter2___ := (ys) __iter__.  [true] whileTrue: [ ... ] ] @env0:on: PythonLoopDrained do: [:___ex___ | nil].
              ].
            ].
          ] @env0:on: PythonLoopDrained do: [:___ex___ | nil].
        ] value
        ] @env0:on: Exception do: [:___tex___ | ___tex___ @env0:___pushTracebackFrame___: (PyCode @env0:name: 'squares' filename: '...' firstlineno: 1) lineno: 2 colno: 27 endLineno: 2 endColno: 29 line: '    return [x * x for x in xs]'. ___tex___ @env0:pass].
        ___r___
    ] value))

-- ComprehensionAst class>>emitGenerators:from:on:innerBody:outerSource:
around ListCompAst's accumulator.  Everything is a BLOCK temp: the
accumulator, the hoisted outermost iterable (evaluated in the ENCLOSING scope,
before any target temp exists -- CPython's rule, and what lets `[x * 2 for x
in x]` read the parameter), one iterator temp per clause, and the clause's
target names, so a target shadows an enclosing method temp or parameter for
the comprehension's extent only (`shadow`: `x = 100; ys = [x + 1 for x in
xs]; return (x, ys)` answers `(100, [...])`, the text's read of the shadowing
`x` going through the unbound guard because the def also declares it).  A
tuple target lands in `___item1___`, is normalised through `PythonCoroutine
___unpackNormalize___:` and stored leaf by leaf off `(___item1___ __getitem__:
i)`, as ForAst's tuple branch.  The outermost clause is wrapped in the
traceback-frame handler that prepends ONE frame for the enclosing function at
the iterable's PEP 657 position.

**What the IR emits**: the same sends, the same block nesting, through two
new builder primitives -- `blockWithTemps:do:` (a zero-argument
GsComBlockNode declaring block temps, leaves handed to the body) and
`withLocals:do:` (a SCOPED shadow of the builder's local table: the target
names resolve to the clause block's temp leaves for the body's duration and
to whatever they were before -- a method temp, a parameter, nothing --
afterwards, restored under ensure:).  The clause emitter is class-side on
ComprehensionAst (`___emitIRGenerators___:from:on:innerBody:outerSource:`,
`___emitIRClause___:...`, `___emitIRFilters___:...`, `___emitIRUnpack___:...`,
`___emitIRTracebackHandlerFor___:on:`) so the three other comprehension kinds
reuse it with their own accumulator and innermost statement.  The
`[...] value` of the accumulator and source blocks is a plain env-0 `value`
send to the block node; `[true] whileTrue: [...]` is the ForAst loop's
inlined whileTrue:, without the break / continue handlers a comprehension
cannot need.  The traceback handler is emitted as the text's: its frame's
code is `CallAst functionBeingCompiled`'s name and line, which
`___installIRMethodOn___:` sets around the IR build exactly as printBodyOn:
does.  Measured on `[x for x in None]` and `[x + "a" for x in [1]]` caught by
a text def: the IR traceback names the same two frames with the same lines
and source text as the text path's; only the PEP 657 carets differ, the
known IR-frame column family (the text's carets underline the whole return
statement there, CPython's the iterable, so neither is right).

**Scoping in the predicates.** A comprehension target is not a local of the
def -- the parser keeps it out of the body's `variables` and `writes`
(declareWrite:) -- so the flow analysis and the eligibility walk had to learn
the comprehension's own scope: `ComprehensionAst class>>___irScopeLocals___:
generators:` is the enclosing set plus every clause target, the element /
filters / later iterables are judged against it and the FIRST iterable
against the enclosing set (`___irClausesEligible___:locals:`); the read
collector (`___irReadsOf___:parts:into:locals:`) treats the first iterable's
reads as the enclosing scope's and drops the target names from every other
read, ForAst's rule.  A new hook, `AbstractNode>>___irChildLocals___:`,
lets the census walk (`FunctionDefAst>>___irFirstRefusedChildOf___:`) judge
a comprehension's children in that scope too; without it a comprehension
refused for something else was blamed on its own target read.  A target
named like a builtin (`[dir + 1 for dir in xs]`) already shadows it in the
call classifier through the text's own `___pythonBindingShadows___:`, which
consults the enclosing comprehension targets.

**What is refused**, each a census label of its own: an `async for` clause
(`Comprehension:async`), a starred target (`Comprehension:starTarget` -- the
text's slice shape needs a Smalltalk `-` send the IR does not make, as for
the for-loop), a subscript or attribute target (`Comprehension:target-
SubscriptAst` / `-AttributeAst`, the `___emitTargetStore___:` shapes).  A
walrus in a comprehension refuses as `value:NamedExprAst`, unchanged.

Fixture: sixteen module defs -- squares, two filters, nested `for`, an inner
iterable reading the outer target, tuple and nested-tuple targets, a target
shadowing a local, a parameter, a builtin, `_`, a nested comprehension, a
nested comprehension iterating the outer target, comprehensions as call
arguments, a comprehension after a for loop over the same name, the
iterator-protocol TypeError and a body TypeError caught -- and class `Comp`
(a self-send in the element, `for` over `self.items` and another instance's,
an `enumerate` tuple target with a filter), all values verified under CPython
3.14.6.  `lc_after_target_read` first read its for-loop target after the
loop and was refused `flow` (a zero-trip loop binds nothing, cut 31's rule --
not a comprehension matter); it pre-binds the name now.  Compiled 280 -> 302
(all 22 new defs), fallbacks 0; with the flag OFF the fixture reads ALL_OK at
compiled=0.

**Gates** (wt/d, gs40, Claude3):

* smoke tripwire: `4 run, 4 passed`, compiled = 302, fallbacks = 0;
* flag-off `./scripts/run_tests.sh`: `main suite (sharded: 4 of x4): 6431 run, 6431 passed, 0 failed, 0 errors`;
* flag-on cold sweep `GRAIL_TEST_COLD=1 GRAIL_IR_CODEGEN=1 ./scripts/run_tests.sh`:
  first run `main suite (sharded: 4 of x4): 6431 run, 6420 passed, 9 failed,
  2 errors` -- the known nine at 9b72095b by name (the five PEP 657 span
  tests, LiveFrameProbeResilienceTestCase>>testTheTempsFastPathNeedsNoSource,
  ImportlibTestCase>>testInstanceMethodNoOuterBlock,
  FrameReceiverSuggestionTestCase>>testASuggestionMayNameTheReceiver, the
  [ERROR] PrivateNameManglingTestCase>>testPrivateNameMangling) plus two,
  both re-run alone flag-on in a fresh topaz:
  `TracebackTestCase>>testTheLineCacheIsNotPoisonedByRecycledMethodOops`
  failed alone too (``only 280 derivations checked'') and is attributed to
  this cut and fixed (below); `WeakReferenceTestCase>>testCallbackFiredOnCollection`
  ERRORed on an AlmostOutOfMemory notification (4 in that run's shard logs)
  and passes 13/13 alone -- the recorded cold-shard pressure effect.

**The line-cache test.** `testTheLineCacheIsNotPoisonedByRecycledMethodOops`
compares the cached ip -> line accessor against the UNCACHED TEXT derivation
(`___derivePythonLineForMethod___:ip:`, the ``___curPos___ :='' scan), which
answers nil for an IR-built method -- its source is the Python def.  Its
fixture, frame_depth.py, is fourteen defs that are almost all list
comprehensions over `traceback.extract_tb`; under the flag twelve of them
became IR with this cut (census: 2 refusals left, a nested def and a genexp),
the checked count fell from >500 to exactly 280 (40 generations x 7) and the
test's own vacuous-pass guard fired -- correctly: it was about to prove
nothing.  The bug it guards (asOop-keyed caches recycling) belongs to the
cache, not to either codegen path, so the test now loads its fixture on the
text path whatever the flag says (`___irCodegenForce___: false`, the flag
restored in its ensure:) and reads 46/46 flag-off, 45/46 flag-on (the known
testForLoopExceptionPositions).

**The sweep is at the memory ceiling, and that is not this cut.**  Two
re-runs of the flag-on cold sweep after the test fix both lost SHARD 1 to
``VM temporary object memory is full'' (old space 374911/374912K, once as
``old space overflow'' at 1828 scavenges / 261 markSweeps, once as ``too many
markSweeps since last successful scavenge'') -- `4672 run, 4650 passed, 9
failed, 13 errors`, the twelve extra ERRORs all AlmostOutOfMemory-driven
(ZipfileTestCase's `encodeAsUTF8` at the top of every stack, a
SuperShadowingTestCase, a WeakrefModuleTestCase), 12 notifications in the
surviving shards, and the crash landing on a different test each time
(PropertyNotDynamicClassAttributeTestCase, then SubprocessTestCase).  The
CONTROL -- the same sweep on a clean `git checkout 9b72095b`, installed on the
same stone as the same user -- reproduces it exactly: shard 1 crashes, `4672
run, 4653 passed, 9 failed, 10 errors`, 9 notifications, the same
Zipfile/Warning/Tarfile ERROR shapes.  Cuts 53-54's sweeps on this machine
had ZERO notifications, so the pressure arrived with the merge of cuts 55-56
(186 + 89 more methods through the seam) and is the ``larger temp-object
cache for cold shards'' follow-up the roadmap already lists, now urgent: with
shard 1 blind the sweep cannot see PrivateNameManglingTestCase or anything
else in that shard.  A candidate contributor, measured but not yet
attributed: an IR method's attached source is the def slice PREFIXED with
(beginLine - 1) newlines so the VM reports absolute lines
(___installIRMethodBodyOn___:), and over the vendored stdlib that padding is
26.2 MB against 13.8 MB of actual def source -- each late method in a long
module carries kilobytes of newlines.  Whether that or the text methods'
larger generated sources dominates a cold shard's old space has not been
measured.

## Progress — cut 58 (set and dict comprehensions)

`value:SetCompAst` (2 stdlib defs + methods) and `value:DictCompAst` (5 + 8):
the list comprehension's accumulator block with a different seed and a
different innermost statement, and nothing else.  The text (trace of
`uniq(xs)` and `index(xs)`):

    ___r___ := (set perform: #new env: 0).      ...  ___r___ @env0:add: ((x) ___binOpMod___: (3)).
    ___r___ := (PyDict perform: #new env: 0).   ...  ___r___ @env0:at: (x) @env0:put: (i).

SetCompAst and DictCompAst take the four IR methods ListCompAst has
(eligibility, the census child-scope hook, the refusal detail, the read
collector) with `ComprehensionAst class>>___emitIRGenerators___:...` doing
the clauses; DictCompAst judges and collects reads for both its key and its
value in the comprehension's scope and emits the key before the value, the
text's argument order.  Nothing new is refused: the clause refusals are cut
57's (`Comprehension:async` / `starTarget` / `target-<Class>`).

Fixture: seven module defs (set: modulo, pairs with a filter, a tuple target
with a filter; dict: enumerate, `.items()` with a filter, a nested list
comprehension as the value, a target shadowing a parameter and read after)
and class `CompBag` (a set and a dict comprehension over `self.items`, a dict
whose value is a self-send whose body is itself a list comprehension), values
verified under CPython 3.14.6.  Compiled 302 -> 315 (all 13 new defs),
fallbacks 0; flag OFF ALL_OK at compiled=0.

**Gates** (wt/d, gs40, Claude3):

* smoke tripwire: `4 run, 4 passed`, compiled = 315, fallbacks = 0;
* flag-off `./scripts/run_tests.sh`: `main suite (sharded: 4 of x4): 6431 run, 6431 passed, 0 failed, 0 errors`
  on the second run.  The first read `6431 run, 6430 passed, 0 failed, 1
  errors` -- `ZipfileTestCase>>testOpenStreamsInSmallReads`, an
  AlmostOutOfMemory notification in shard 3 (4 in that shard's log; the
  test cut 33 recorded for the same effect), 14/14 alone in a fresh
  session, 0 notifications on the re-run.  With the flag OFF none of this
  cut's code runs (`___buildModuleClassBody:name:` consults the flag before
  eligibility), so this is the machine's ceiling reaching the flag-off gate
  for the first time; cuts 53, 54 and 57's flag-off runs had 0 notifications.
* flag-on cold sweep `GRAIL_TEST_COLD=1 GRAIL_IR_CODEGEN=1 ./scripts/run_tests.sh`:
  `main suite (sharded: 4 of x4): 6431 run, 6422 passed, 8 failed, 1 errors`
  -- exactly the known nine at 9b72095b by name, every shard finished, 0
  AlmostOutOfMemory notifications in any shard log (the run before, cut 57's,
  lost shard 1 to the ceiling three times out of four, control included).

## Progress — cut 59 (generator expressions)

`value:GeneratorExpAst` (57 stdlib class methods + 25 top-level defs) -- the
second-largest comprehension family, and the one whose text shape is LAZY.
GeneratorExpAst>>printSmalltalkOn: has two forms; this cut emits the
synchronous one and refuses the async one.

**What the text emits** (trace of `lazy(xs)`, `total(xs)` and `K.lazy(self)`):

    ^ (([:___gxsrc0___ |
        (PythonGenerator @env1:withBlock: [:___gen___ |
          [
          [| ___src1___ |
            ___src1___ := ___gxsrc0___.
            [| ___iter1___ x |
              ___iter1___ := ___src1___ __iter__.
              [true] whileTrue: [
                x := ([___iter1___ __next__] @env0:on: StopIteration do: [:___dx___ | PythonLoopDrained @env0:___signal___]).
                ___gen___ @env1:___yield___: ((x) ___binOpMul___: (2)).
              ].
            ] @env0:on: PythonLoopDrained do: [:___ex___ | nil].
          ] value
          ] @env0:on: Exception do: [:___tex___ | ... ___pushTracebackFrame___ ... ___tex___ @env0:pass].
          None
        ] name: '<genexpr>' qualname: 'lazy.<locals>.<genexpr>' code: nil)
    ] @env0:value: ((xs) __iter__)))

A real PythonGenerator over the clause blocks: the outermost iterable is
evaluated AND `__iter__`'d at construction, in the enclosing scope, and
passed in through the depth-named wrapper-block parameter (`___gxsrc1___`
for a genexp nested in a genexp) -- which is why `(x for x in None)` raises
its TypeError from the enclosing statement rather than the first `next()`,
and why a genexp built in a loop closes over the loop variable's VALUE, not
its temp.  Inside, emitGenerators' `outerSource:` path binds `___src1___`
from that parameter, and the innermost statement is `___gen___
___yield___:` on the genexp's OWN generator.

**What the IR emits** is that, send for send, through
GeneratorExpAst>>___emitIRValueOn___: -- `blockWithArg:` for the `___gxsrcD___`
wrapper and the `___gen___` block, the shared clause emitter with an
`outerSource:` block answering the wrapper parameter, the `withBlock:name:
qualname:code:` send (env 1) with `code: nil`, and the `value:` of the outer
block over `(iter) __iter__` (env 1).  Two things from cut 53's generator
machinery are reused rather than duplicated: the `___yield___:` send to the
builder's `genLeaf`, which is SWAPPED to the genexp's own block argument for
the body and restored under ensure: -- so a genexp inside a generator def
(`ge_in_generator`) yields its elements to itself while the def's own
`yield` still reaches the def's generator -- and the wrapper class name.
Nothing of `___emitIRWrappedBodyOn___:` applies: a genexp has no statements,
no PythonReturn handler, no PyCode.

**The qualname needed one thing the IR build did not do.**  The text's
`'lazy.<locals>.<genexpr>'` comes from `CallAst ___qualnameFor___:name:`
walking the LEXICAL SCOPE STACK, on which printBodyOn: pushes the def's own
frame around its body emit.  `___installIRMethodOn___:` set
functionBeingCompiled around the IR build but pushed no frame, so the first
build would have answered `<genexpr>` (module def) or `K.<genexpr>` (method,
where the seam's snapshot restores the class frame).  It now pushes the
def's frame for the same window and truncates back in its ensure:; the def's
own qualname (cut 53's `Walker.walk`) is unaffected because
`___qualnamePrefixBefore___:` stops at the node's own frame.  Measured:
`lazy.<locals>.<genexpr>` and `K.lazy.<locals>.<genexpr>` under the flag,
equal to the text.

**What is refused**: the ASYNC generator expression (`GeneratorExpAst:async`,
PEP 530's rule as `___isAsyncGenexp___` -- an `async for` clause or an
`await` anywhere in the expression's own scope, nested list / set / dict
comprehensions included, nested genexps excluded), whose wrapper is
PythonAsyncGenerator over `___asyncYield___:` with the outermost iterable
`___grailAiter___`'d at construction when the first clause is async.  The
census counts it separately now; the stdlib corpus has few.  The clause
refusals are cut 57's.

Fixture: ten module defs -- a returned genexp consumed by `list()`, `sum()`
over a filtered genexp, `any()` short-circuit proving laziness (the
appended log stops at the first hit), `next()` then `list()` on one
generator, the construction-time TypeError of `(x for x in None)`,
`type(g).__name__` / `__name__` / `__qualname__`, a genexp nested in a
genexp, a tuple target, a genexp inside a generator def, a target
shadowing the parameter that its own outermost iterable reads -- and class
`GenExpr` (a genexp over `self.items` and a `sum()` over self-sends), plus
`genexpr_run` checking `GenExpr.lazy.<locals>.<genexpr>`; every value
verified under CPython 3.14.6.  Compiled 315 -> 330 (all 15 new defs),
fallbacks 0; flag OFF ALL_OK at compiled=0.  The eleven-def comprehension
probe module (list / set / dict / genexp, module and method) now compiles
14/14 under the flag with the text's OUT.

**Gates** (wt/d, gs40, Claude3):

* smoke tripwire: `4 run, 4 passed`, compiled = 330, fallbacks = 0;
* flag-off `./scripts/run_tests.sh`: `main suite (sharded: 4 of x4): 6431 run, 6431 passed, 0 failed, 0 errors`, 0 AlmostOutOfMemory notifications;
* flag-on cold sweep `GRAIL_TEST_COLD=1 GRAIL_IR_CODEGEN=1 ./scripts/run_tests.sh`:
  `main suite (sharded: 4 of x4): 6431 run, 6421 passed, 8 failed, 2 errors`
  -- the known nine at 9b72095b by name plus one ERROR,
  `WarningRegistryTestCase>>testDefaultactionCanBeReplacedAndDeleted`, whose
  text is the AlmostOutOfMemory notification (13 in shard 3's log, 0 in the
  other three); 11/11 alone in a fresh flag-on session (132 IR compiles, 0
  fallbacks).  The cold-shard pressure effect, on the shard that carries the
  frameworks; every shard finished this time.

**Where item 8 leaves the census (2026-09-07, after cuts 57-59; stdlib
corpus, `census_stdlib.tpz` right after `./install.sh` on gs40 as Claude3,
125 modules imported, 0 failures, 5279 IR compiles, 0 fallbacks).**  Of the
stdlib's 1570 top-level defs **1334 (85.0%)** compile through IR (was 1167,
74.3%, after cuts 49-52 -- the difference also carries cuts 55-56, which
this lane did not census separately); of its 4427 class-body methods
**3947 (89.2%)** are built through the seam (was 3337, 75.4%); of ALL 6201
defs **85.2%** go through IR (was 72.6%).  No `value:ListCompAst`,
`value:GeneratorExpAst`, `value:DictCompAst` or `value:SetCompAst` row
remains.  What the comprehension family still refuses: `Comprehension:async`
-- 1 top-level def (jinja2.async_utils.auto_to_list) + 4 class methods
(jinja2's Template.render_async / make_module_async, BlockReference._async_call,
AsyncLoopContext.length); `GeneratorExpAst:async`, `Comprehension:starTarget`
and the subscript / attribute target labels do not occur in this corpus.
The largest refusals now are nested defs (`stmt:FunctionDefAst`, 76 defs +
77 methods -- roadmap item 4), pseudo-variable parameters (23), and on the
method side attribute-target augmented assignment (64), `self`-less receivers
(64), classmethod (42) and staticmethod (19), chained assignment (36),
method-local classes (34), lambdas (25).  The CENSUS.md rewrite is the other
lane's; these numbers are from the raw census log.
## Progress — cut 60 (the receiver need not be named `self`) and cut 61 (`@classmethod`)

Two of item 1c's three leftovers.

**Cut 60.** `method:selfNotNamedSelf` (64 stdlib methods -- `abc.ABCMeta`'s
`cls`, `_pyio`'s `this`, `__new__(cls, ...)`) refused a method whose first
parameter had any other name.  The text never cared: ClassDefAst switches
`selfParameterName` to each def's FIRST parameter before generating its
source, `isSelfReference:` maps every read of that name to Smalltalk `self`,
and the seam's compile-context snapshot carries the same name to the deferred
build.  The predicate now asks only that the two agree (`method:
receiverNameMismatch` -- a def with no plain positional parameter keeps the
class-wide name, which is not its receiver), the rebinding check names the
receiver rather than `self`, and `NameAst>>___irIsSelfReceiver___` drops its
`== #self` test; every self-receiver emit (attribute loads and stores, self-
sends, the annotated store) already went through that one predicate.

**Cut 61.** `method:classmethod` (42).  The parser re-classes a
`@classmethod` def as ClassFunctionDefAst; the text builds it from the SAME
per-method generator with `cls` as the receiver and installs it on the
metaclass (`<cls> @env0:class ___compileMethod:`), so the IR method is the
same method built onto `<cls> class` -- `cls(...)` is `self value:value:`,
`cls.n` the dynamic-instVar-first load, on the class object.  The classmethod
loop now judges and registers like the instance loop (key `class>>` +
selector, so a class-side and an instance-side method of one selector cannot
collide in the per-class map), the class-side emission loop emits
`___irInstallDef:on: <cls> @env0:class or:`, and the install seam needed no
change.  `@staticmethod` (19) stays on text: its source is the MODULE form
(no receiver strip, `selfParameterName` nil), so it wants the module-mode
prologue built onto the metaclass -- a separate cut.

Defect found: the first flag-on probe compiled 289 of 292 -- the three
classmethods were judged eligible (`cm:eligible` 77) and registered, yet the
text compiled and nothing counted a miss.  `___irForgetClassDefIds___:` ran
right after the INSTANCE emission loop, dropping the still-unconsumed
`class>>` registrations before the classmethod loop could read them; it now
runs after that loop.  A registration the emission never consumes is a
silent text fallback, invisible to `fallbacks` -- the tripwire is the only
instrument that sees it.

Second defect, from the flag-on sweep (12 new errors: six
SubclassAttrShadowTestCase, four Django, MixinMethodMetadata, an inspect
landmine): `NameError: method compile failed []: CompileError unexpected
token` -- the signature of a Smalltalk recompile handed an IR method's
PYTHON source, this time on the class side.  `___mergeSecondaryBases___:`'s
class-side pass copied a metaclass method as `walker class sourceCodeAt:`
into `aClass class ___compileMethod:`; for an IR-built @classmethod that is
its Python.  The pass now goes through `___copyMethod___:from:to:category:`
like the instance pass, `___textSourceFor___:in:selector:` accepts a
METACLASS provider (looks the class's table up under `class>>` + selector),
and the class-side emission loop notes its text twins under that key -- so
the `___irTextSources___` table and the registration-map release both move
past the classmethod loop (still before the merge statement).  The pattern
is the one memory already records for the instance side (#836's shadow
sites, the MI merge): every consumer that recompiles a method's source must
go through the copier, and a new install target (here the metaclass) has to
be walked for such consumers before it is switched on.

Fixtures: Rect (receivers `this`, `me`, `rect`, `self_`, `s`; an augmented
attribute store rewritten as a plain one, since `AugAssignAst:target-
AttributeAst` is still refused); Maker / SubMaker (`cls(v)`, `cls.n`,
`cls.__name__`, a keyword default, inherited classmethods answering the
subclass, an instance-side self-send to a classmethod).  Compiled 280 -> 286
-> 292, 0 fallbacks, RESULTS true with the flag on and off.  Gates (after both fixes): flag-off
`6431 run, 6431 passed, 0 failed, 0 errors`; flag-on cold sweep `6431 run,
6421 passed, 8 failed, 2 errors` -- the known nine plus `[ERROR]
WarningRegistryTestCase>>testAnUnknownCallSiteDoesNotDedupe`, whose shard log
reads `AlmostOutOfMemory ... Session's temporary object memory is almost
full` and which passes alone flag-on (11/11): the recorded cold-shard
memory-pressure follow-up (importlib's `on: AbstractException` unloading a
module on a Notification), not a cut defect.  The 63 SUnit classes that
mention classmethods or non-`self` receivers, run flag-on in one session:
only the known FrameReceiverSuggestion failure.

## Progress — cut 62 (augmented assignment to attribute and subscript targets)

`AugAssignAst:target-AttributeAst` (64 stdlib methods + 3 defs) and
`-SubscriptAst` (a handful) were the last statement shapes the class-method
corpus ranked above the long tail.  printSmalltalkOn:'s three branches are
reproduced -- and, unlike the simple-local branch's `___augmentedOp___:
inplace:binary:` probe, all three apply the BINARY operator send to the
loaded value and store the result, as the text does:

    self @env0:dynamicInstVarAt: #x put: ((self @env0:dynamicInstVarAt: #x
        ifAbsent: [self @env1:___pyAttrLoad___: #x]) __add__: (v))          -- self.x op= v
    ___slot_x___ := (___slot_x___ ifNil: [self @env1:___pyAttrLoad___: #x]) __add__: (v)
                                                                            -- a __slots__ name
    (obj) @env1:___pyAttrStore___: #x put: (((obj) @env1:___pyAttrLoad___: #x) __add__: (v))
    (obj) __setitem__: (i) _: (((obj) __getitem__: (i)) __add__: (v))

The receiver (and index) are emitted twice for the foreign and subscript
shapes because the text prints them twice -- a call there runs twice on both
paths.  A slice index (`a[1:] += ...`) stays on text
(`AugAssignAst:target-SubscriptAst-slice`); the structural discriminator
(`___irComplexTargetShape___`) is shared by eligibility and the emit, which
has no locals set at build time.  The flow analysis counts the target's
receiver and index as reads.

Fixture: Tally (`self.n += k`, `self.items += [k]`, a foreign `other.n -=
1`, `d["k"] += 10`, `lst[1] *= 3`), SlotAcc (`self.total += v` on a slot).
Compiled 292 -> 298, 0 fallbacks, RESULTS true with the flag on and off.

The first flag-on sweep added `TracebackTestCase>>testRecursionContextChain`
(reproducible alone flag-on, 46/46 flag-off in the same harness).  The
fixture's runaway `f()` does `_depth[0] += 1`, so this cut moved it to IR --
and the RecursionError block's innermost frame then rendered `line 53 /
except ZeroDivisionError:` where the text renders `line 52 / 1 / 0`, so the
one-block-per-link count found an extra `ZeroDivisionError:`.  An IR frame's
line comes from its ip, and at a stack overflow ON ENTRY to the try the ip
sits on the try's set-up sends: the `on:do:` itself (stamped at the TryAst's
position, which is the except header) and the lazy except-selector
construction (stamped wherever the type NAME's emit had left the builder --
the header again).  The text names the try-body statement there
(`___curPos___`).  Both sends are now stamped at the first try-body
statement's position (`___irTryStampPosition___`); the selector block's
contents keep the header's line, so a failing `except <expr>` still points at
its clause.  Direct probes of the fixture (`perform:` outside the module
body) overflow uncatchably on BOTH paths -- the recursion guard wraps the
module body, which is where the test's checks run -- so the instrument had
to be the SUnit class itself, flag-off as the control.
Gates (after the fix): flag-off `6431 run, 6431 passed, 0 failed, 0 errors`;
flag-on cold sweep `6431 run, 6421 passed, 8 failed, 2 errors` -- the known
nine plus `[ERROR] WeakReferenceTestCase>>testCallbackFiredOnCollection`
(AlmostOutOfMemory in its shard log, 13/13 alone flag-on: the cold-shard
memory-pressure follow-up again, 4 notifications in the sweep).

## Progress — cut 63 (chained assignment)

`AssignAst:chained` (36 stdlib methods + 7 defs).  The text binds once and
stores to each target from a block temp:

    [| ___chain___ | ___chain___ := (value). <store>. <store>. ...] value.

-- the temp is a method temp here (cut 50's convention), and each store is
the chain branch's own spelling: `x := ___chain___` for a body local, the
slot or dynamic-instVar write for `self.x`, `(obj) @env1:__setattr__: 'x' _:
___chain___` for a foreign receiver, `(obj) __setitem__: (i) _:
___chain___`, and the tuple-unpack emitter reading the chain temp for `(a, b)
= r = v`.  A Name target the text routes elsewhere (a module-scope store, a
class-body runtime store, a `nonlocal` reached past the class) and the
`__class__` type change keep the whole statement on text
(`AssignAst:chained-target-<Node>`), as does a def whose own local is named
`___chain___`.  The flow analysis learned that a chain binds every Name
target and every tuple leaf, and reads each attribute / subscript target's
pieces.

Fixture: Linked (`self.x = d["k"] = lst[0] = v`, `a = b = self.y = v + 1`,
`(p, q) = r = (a, b)`, a foreign `l.x = other.y = 42`), SlotChain (`self.m =
self.n = v` on slots).  Compiled 298 -> 303, 0 fallbacks, RESULTS true with
the flag on and off.  Gated together with the merge of the wt/d lane's cuts
57-59 (tripwire 353): flag-off `6431 run, 6431 passed, 0 failed, 0 errors`;
flag-on cold sweep `6431 run, 6421 passed, 8 failed, 2 errors` -- the known
nine plus `[ERROR] WarningRegistryTestCase>>testDefaultIsOncePerCallSite`,
AlmostOutOfMemory in its shard log (4 notifications in the sweep): the
cold-shard memory-pressure follow-up, which the wt/d lane measured at the
55-56 merge base as stochastic (3 of its 6 sweeps clean) and traced a
candidate contributor for -- the (beginLine - 1) newline padding on every IR
method's attached source, 26.2 MB across the stdlib against 13.8 MB of real
def source (see the cut 57 section).

## Progress — cut 64 (nested defs: the closure block inside the enclosing IR method)

Roadmap item 4, first cut.  `stmt:FunctionDefAst` (76 stdlib top-level defs
+ 77 class methods refused because a def INSIDE them had no IR emit) and the
`nestedDef` tally (204 nested defs counted separately) were the largest
remaining refusal family after cuts 57-59.

**What the text emits** (GRAIL_CODEGEN_TRACE_DIR on `plain(x)`, `capture(x,
y)`, `with_default(x)`, `star(x)`, `deep(x)`, `gen_inner(x)`, `deco(x)`,
`counter()`, `posonly(x)`, `in_loop(xs)`, `reassigned(x)` and the methods
`K.m(self, x)` / `K.nl(self)` -- printSmalltalkOn:'s non-module branch):

    inner := ([| ___default_b___ |                          (defaults only: an immediately-
        ___default_b___ := 10.                              evaluated wrapper, def-time, enclosing scope)
        [:___positional___ :___kwargs___ |
            | a b ___curPos___ |                            (every parameter + body local: block temps)
            ((___positional___ size) > 2) ifTrue: [TypeError ___signal___: ('with_default.<locals>.inner() takes from 1 to 2 ...')].
            (___kwargs___ isNil) not ifTrue: [___kwargs___ keysDo: [:___k___ | ...unexpected keyword...]].
            ((___positional___ size) < 1) ifTrue: [TypeError ___checkMissingPositional___: ... qualifiedName: 'with_default.<locals>.inner'].
            a := ((___positional___ size) >= 1) ifTrue: [___positional___ at: 1] ifFalse: [(kwargs gate) ... ifFalse: [TypeError ___signalMissingArguments___: ...]].
            b := ((___positional___ size) >= 2) ifTrue: [___positional___ at: 2] ifFalse: [(kwargs gate) ... ifFalse: [___default_b___]].
            args := tuple perform: #withAll: env: 0 withArguments: { ___positional___ copyFrom: 3 to: ___positional___ size }.   (*args)
            kw := ___kwargs___ ifNil: [(PyDict perform: #new env: 0)].                                                        (**kw: the PLAIN ALIAS)
            [
                [ stmt. stmt. PythonReturn ___signal___: (value). ] value.
                None.
            ] @env0:on: PythonReturn do: [:___ex___ | ___ex___ returnValue]
        ]] value) @env0:shallowCopy
            @env0:___pyNamed___: 'inner' [doc: 'Doc here.'];
            @env0:___pyModuleNamed___: 'nprobe';
            @env0:___pyQualname___: 'with_default.<locals>.inner';
            @env0:___pyCode___: (((PyCode @env0:name: 'inner' filename: '...' firstlineno: 12 argcount: 2 posonlyargcount: 0 kwonlyargcount: 0) @env0:___setFlags___: 19) @env0:___setFreevars___: #( 'x' ));
            @env0:___pySig___: { { 'a'. 1 }. { 'b'. 1. '10' } };
            @env0:___pyClosure___: { (PyCell @env0:reader: [x]). }.
    inner := wrap value: { inner } value: nil.                                          (one decorator)
    inner := [:___grailDecoFns___ | ((___grailDecoFns___ at: 1) value: { ((___grailDecoFns___ at: 2)
        value: { inner } value: nil) } value: nil)] @env0:value: { d1. d2 }.             (a chain)

The def's name is a body local of the ENCLOSING def (a method temp on the IR
path already); the block captures enclosing temps natively -- `capture`'s
`x + y` are the method's arguments read from inside the block, `deep`'s
`inner` reads `y`, a block temp of `mid`'s block, one level up.  `counter`'s
``nonlocal n; n += 1'' is the text writing the enclosing temp from inside the
block (`n := (n) ___augmentedOp___: ...`) -- there is no cell mechanism for a
nested def in a def; the `___cell_<name>___` pairs belong to a CLASS body
nested in a def.  A generator nested def wraps the same body in
`PythonGenerator withBlock: [:___gen___ | ...] name:qualname:code:` as the
block's value (no `^`).  A reassigned enclosing parameter is the one case the
closure cell gets a `setter:` (the text's rule: the free variable's read
source is the bare name AND the binding scope assigns it); a body local's
guarded read disqualifies its cell.  A default may read an enclosing local
(`in_loop`'s `def f(m=v)`): the wrapper runs at the def site.

**What the IR emits** (`FunctionDefAst>>___emitIRStatementOn___:` and
`___emitIRNestedFunctionValueOn___:` / `___emitIRNestedBlockOn___:` /
`___emitIRNestedBodyOn___:`): the same sends, the same block nesting.

* The closure is `PyMethodIRBuilder>>blockWithArgs:temps:do:` (new: several
  arguments AND temps, ``[:a :b | | t1 t2 | ...]'') over `___positional___` /
  `___kwargs___`, with every parameter and body local of the nested def a
  block temp bound into the local table by `withLocals:do:` for the block's
  duration -- so a read or store inside resolves to the block temp and an
  enclosing local of the same name is shadowed (`nd_shadow`, `nd_shadow_local`),
  and a deeper nested def's free variables resolve to the enclosing closure's
  temps (`nd_deep`).  The `___po___` / `___unk___` collectors of the
  positional-only keyword guard join the temps when the shape needs them.
* The prologue is cuts 40-43's own emitters (`___emitIRArgCountChecksOn___:`,
  `___emitIRMissingPositionalCheckOn___:`, `___emitIRPositionalBindingOn___:`,
  `___emitIRVarargBindingOn___:`) over the two block-argument leaves; their
  qualified name comes from the scope stack (`with_default.<locals>.inner`,
  `K.m.<locals>.inner`, `deep.<locals>.mid.<locals>.inner`) because the emit
  pushes the nested def's frame and sets functionBeingCompiled for the body's
  window, as printSmalltalkOn: does.  ONE hook: `___irDefTimeDefault___:node:on:`
  answers the wrapper's `___default_<p>___` temp when the local table holds
  one -- the defaults wrapper is `blockWithTemps:do:` + `withLocals:do:` over
  those names, evaluated (`send: #value env: 0`) at the def site.  The **kwarg
  is the closure form's own plain alias (`___emitIRNestedKwargBindingOn___:`),
  not the varargs method's copy-and-remove.
* The body is `[ [stmts] value. None ] on: PythonReturn do: [:___ex___ |
  ___ex___ returnValue]` (env 0; `returnValue` env 1), statements the text's
  `___reachableStatements___:`; ReturnAst signals PythonReturn inside it
  through a new builder flag, `inNestedFunction` (`nestedFunctionDo:`), the
  twin of cut 53's genLeaf test.  genLeaf is cleared for the nested body and
  set to the nested def's OWN `___gen___` when it is a generator / coroutine
  (`nd_generator`, `Nester.gen_method`), whose wrapper is the block's last
  statement, its code thunk cut 53's `___emitIRPyCodeExprOn___:qualname:nested:`
  with nested: true.
* `shallowCopy` (env 0) then the cascade (`cascade:specs:`): `___pyNamed___:`
  or `___pyNamed___:doc:` (`___docString___`), `___pyModuleNamed___:`,
  `___pyQualname___:` when it differs from the name, `___pyCode___:` with the
  def-site form (`___emitIRNestedPyCodeOn___:` -- `name:filename:firstlineno:
  argcount:posonlyargcount:kwonlyargcount:`, no qualname field, flags with
  CO_NESTED, `___setFreevars___:` when there are free variables),
  `___pySig___:` as fresh brace arrays of `{ name. kind [. default source
  text] }` (`___emitIRSignatureSpecOn___:`), and `___pyClosure___:` with one
  `PyCell reader: [x]` per free variable, `reader:setter:` exactly when the
  text emits a setter -- decided by the text's own two predicates
  (`CallAst ___freeVariableReadSource___:parent:` = the bare name and
  `___freeVariableIsAssignable___:for:`), so the two paths agree by
  construction (`nd_cell_setter`: 50 / 50 on both).  A captured method receiver
  reads as `self` (`Nester.closure_over_self`: co_freevars `('self',)`).
* Decorators (`___emitIRNestedDecoratorsOn___:leaf:`): one is `name := deco
  value: { name } value: nil` (env 1); a chain is the ordered one-statement
  form over a `[:___grailDecoFns___ | ...]` block and the brace array of
  decorator values, applied innermost-first (`nd_deco`: `['d1', 'd2', 'd1']`).
  A bare-name decorator resolves in printDecoratorReceiverOn:deco:'s order: a
  module variable through `(<Mod> ___instance___) ___moduleAttrLoad___:`
  (`nd_module_deco`), else the enclosing local's leaf, else the resolvable
  global.

**Eligibility and flow** (`___irNestedDefReason___:`, each exit a census row).
`FunctionDefAst>>___irEligibleStatementLocals___:` now exists, so the body
walk of the enclosing def admits a nested def; its body is judged against
`___irNestedLocals___:` (the enclosing set plus its own parameters and body
locals -- also its `___irChildLocals___:` for the census walk) and must be
bound-before-read on its own: `body ___irFlowBound___:` seeded with its
parameters and every enclosing local it does not shadow (`nestedDef:flow`
otherwise).  For the ENCLOSING flow analysis the def statement reads its
defaults and decorators plus the free variables of its body
(`___irReadLocalNamesInto___:locals:` walks the body against the enclosing
set minus its own names), writes what its body writes to enclosing names
(none until cut 66), and binds its name; `___irFlowBound___:locals:` lets an
UNDECORATED def read its own name (`nd_recursive`'s `fact(k - 1)` -- the
closure cannot run before the assignment completes) while a decorated one
keeps the plain rule, as CPython's decorator call would NameError there.
Refused, by label: `nestedDef:kwonly` (keyword-only parameters -- the text's
mutable `___kwdefaults___` cell and `___pyKwDefaults___:` stamp are a
different prologue, deferred), `nestedDef:annotations` (the `annotate:` block),
`nestedDef:nonlocal` (cut 66), `nestedDef:global`, `nestedDef:reservedName`
(a pseudo-variable parameter or local: the text's `_self` transport),
`nestedDef:typeParams`, `nestedDef:decorator` (a class-body sibling name, or a
name a doit must look up at run time), `nestedDef:defaultExpr`,
`nestedDef:moduleScopeTarget` (a def whose name lands at module scope),
`nestedDef:reclassed`, `nestedDef:classBodyRuntime`.  Mutual recursion between
two nested defs (the first reads the second before it is bound) is
`nestedDef:flow`, deliberately.

**How nested defs are counted.**  A nested def is a block inside its parent's
GsNMethod, not a method: the tripwire's `compiled` counts the top-level defs
and class methods built through the seam, so a def with nested defs counts
ONCE however many it nests.  The census's `nestedDef` row is unchanged (it
tallies nested defs and lambdas per top-level def whatever path built them);
what moved is `stmt:FunctionDefAst`, which no longer occurs in the fixture.

**Probes** (three modules, each verified against CPython 3.14.6 first): the
eleven-shape `nprobe.py` compiles 11 of 19 defs / methods under the flag
(the eight held back are exactly the labels above plus `value:LambdaAst` --
cut 65 -- and `stmt:NonlocalAst`), `nprobe2.py` 8 of 10 (annotations, a
lambda), both with the text's OUT; `nprobe3.py` compares thirteen
introspection facts flag-on against flag-off -- `__name__`, `__qualname__`,
`__module__`, `__doc__`, `str(inspect.signature(f))`, co_flags / co_freevars
/ co_argcount / co_posonlyargcount / co_kwonlyargcount / co_name /
co_firstlineno, `__closure__`, the cell setter, the four arity TypeError
messages, the positional-only-as-keyword message, distinct objects per def
execution (`stamp_run`: `('ABSENT', 'ABSENT')`), generator identity, and
decorator order -- all equal.

Fixture: 29 module defs (`nd_plain` .. `nd_async_gen_loop`: capture of one and two
locals, positional-only + defaults, `*args` / `**kw`, a returned closure, two
levels of nesting, recursion, a def in a loop with a loop-variable default, a
docstring, `__code__` fields, `__closure__` and co_freevars, the cell setter,
the TypeError messages verbatim, the positional-only report, distinct objects,
per-object stamps, a generator, one and two decorators, a module-function
decorator, parameter and body-local shadowing, an early return, try / except
/ finally inside the closure, a def bound in both branches of an `if`) and
class `Nester` (a closure over `self` and a parameter, `co_freevars` of a
captured receiver, a decorator factory defined in the method, a generator
closure over `self`).  Compiled 353 -> 386 -> 390, fallbacks 0: the 31 new defs and
methods, the four interleaving cases, plus two pre-existing fixture defs
(`doubled`, `labelled`) that a nested def had kept on text (`Nester.nested_super`
stays on text by design); the fixture census now shows no
`stmt:FunctionDefAst` -- only the deliberate controls (`flow` x2,
`globalDeclaration`).  Flag OFF: ALL_OK at compiled=0.

**Defects found, six.**  (1) GemStone's Array has no `with:collect:` (the
first build fell back for every def: `a Array does not understand
#with:collect:`, ten fallbacks in the log -- a fallback is safe, and the
fallbackLog named it at once); the zips are `(1 to: n) collect:` now.  (2)
Under `python3 tests/python/ir_codegen_smoke.py` a nested def's `__module__`
is `__main__`, so the fixture compares it to `__name__`.  (3) **The first
flag-on sweep hung for nine hours** (shard 0 at 519 CPU-minutes, killed by the
coordinator; shards 1 and 3 died of ``VM temporary object memory is full'',
the known cold-shard ceiling).  Shard 0's SUnit log ended at
`EventLoopTestCase>>testAFutureIsTheSuspensionPoint` with `MessageNotUnderstood:
a range_iterator class does not understand #__anext__` raised inside a
coroutine -- and an asyncio loop whose task died that way then spins forever,
which is the hang.  Reproduced alone (the class hangs flag-on, passes
flag-off), then with a six-variant probe: the shape is a nested ASYNC
GENERATOR whose body has a `for` loop, consumed by the enclosing coroutine's
`async for`.  Cause: the IR emitters allocate their helper temps lazily and
REUSE them by name -- ForAst's `___iter<depth>___` / `___item<depth>___`,
the unpack holder, `___fn___` -- as METHOD temps, which is sound within one
frame; a closure's block runs in the MIDDLE of the enclosing frame's
statements, so the nested generator's `for i in range(k)` stored its
range_iterator into the same `___iter0___` the enclosing `async for` was
iterating, and the next `__anext__` went to the range iterator.  The text has
no such sharing: it declares those helpers as block temps inside each loop.
Fix in the builder: `nestedFunctionDo:` opens a CLOSURE FRAME (the closure
block, its lexLevel, a copy of the local table), hides every inherited
``___``-prefixed helper binding (the def-time default temps excepted), and
`tempNamed:` allocates on the innermost closure block while one is open; the
table is restored whole on exit.  The same clobber reproduces with plain
synchronous defs (a nested def with its own loop called from the enclosing
loop stopped the enclosing loop after one iteration; a nested generator with
a loop consumed by an outer loop; a tuple unpack inside a closure called from
a tuple-unpacking loop) -- `nd_interleaved_loops`, `nd_gen_interleaved`,
`nd_unpack_interleaved`, `nd_async_gen_loop` pin all four, driven without
asyncio.  (4) `SuperPreconditionErrorsTestCase>>testANestedDefReadsItsOwnParameterList`
(shard 2): `def inner(): super()` inside a method was bound to the METHOD's
receiver by cut 55's `#superZero` shape, where the text asks the innermost def
and raises ``super(): no arguments''; a nested def whose body mentions `super`
is refused (`nestedDef:super`; `Nester.nested_super` is the fixture control,
"super(): no arguments" on both paths).  (5) **Twelve frame-walk tests** (NestedFunctionFramesTestCase x3,
GeneratorStackFrameTestCase, LambdaFrameNameTestCase,
FirstExceptionTracebackTestCase x2, CrossModuleFrameTestCase,
TracebackObjectTestCase, TracebackTestCase>>testForLoopIteratorErrorsReportTheForLine)
named every IR nested-def frame ``<nested>``: the walk classes a two-argument
block frame in a generated Python method as a nested function and names it
from the TEXT -- the ``___pyNamed___:`` stamp past the block's bracket
(`___stampedNameForBlock___:`) or the line-range scan of PyCode stamps
(`___nestedFunctionNameFor___:line:`) -- and an IR method's source is the
def's Python.  Three IR namers now sit beside the text ones, each tried
before its text twin and each answering nil (so falling through) for a text
home: `___irNestedNameForBlock___:home:` reads the nested ``def NAME`` (or
``lambda``) off the home's Python at the block's own `_firstSourceOffset` --
the LINE holding it, since a def two levels down reports a beginPosition one
character high -- taking the home from the WALK (`aMethod`), because a nested
def that captures nothing is a clean block and cannot supply one;
`___irNestedNameIn___:line:` finds the innermost nested def whose INDENTATION
range contains the Python line (the padded source's line indices are the
module's; the first ``def`` is the home's own header and is skipped); and
`___irSoleNestedNameIn___:` is the sole-nested-def fallback for a nil line.
Measured on the frames fixture: `['two_deep', 'a', 'b']`,
`['takes_a_parameter', 'middle', 'leaf']`, and ``['a', 'b']`` with every
derived line forced to nil, flag-on equal to flag-off.  (6)
`ClosureCellsPerActivationTestCase>>testDeletingTheCellUnbindsTheVariable`:
``del inner.__closure__[0].cell_contents`` then `inner()` answered the value
where CPython (and the text) raise -- the closure's read of a FREE variable
was bare, on the strength of the enclosing def's flow proof, which only holds
at the def statement; the binding can be emptied later (a ``del`` in the
enclosing body, or the cell).  NameAst now emits the text's guarded read,
``(x ifNil: [UnboundLocalError ___signalUnbound___: #x])``, for a free
variable inside a closure exactly when the text's own
`___guardedLocalNeedsCheck___:` would (a body local of the binding scope, or
a deleted parameter); the closure's own locals and plain parameters stay bare
(`___irFreeReadNeedsGuard___`).  Lessons recorded: a shape that runs a block
in the middle of the enclosing method's statements exposes every
lazily-shared method temp; a hung shard's SUnit<pid>.log names the test; and
a flow proof made at the def statement does not cover a binding a closure
reads later.

**Gates** (wt/d, gs40, Claude3):

* smoke tripwire: `4 run, 4 passed`, compiled = 390, fallbacks = 0; flag OFF ALL_OK at compiled=0;
* flag-off `./scripts/run_tests.sh`: `main suite (sharded: 4 of x4): 6431 run, 6431 passed, 0 failed, 0 errors` (three runs: before and after the sweep fixes);
* flag-on cold sweep `GRAIL_TEST_COLD=1 GRAIL_IR_CODEGEN=1 ./scripts/run_tests.sh`:
  `main suite (sharded: 4 of x4): 6431 run, 6419 passed, 10 failed, 2 errors`,
  seven minutes, every shard reporting -- the known nine at 91041f20 by name
  (TracebackTestCase>>testForLoopExceptionPositions,
  RaiseSpanTestCase>>testRaiseAndAssertSpans,
  SpanEndTokenTestCase>>testSpanReachesTheEndOfItsLastToken,
  WithItemPositionsTestCase>>testTheColumnsIdentifyWhichManagerFailed,
  LambdaFrameTestCase>>testLambdaFrameSpans,
  LiveFrameProbeResilienceTestCase>>testTheTempsFastPathNeedsNoSource,
  ImportlibTestCase>>testInstanceMethodNoOuterBlock,
  FrameReceiverSuggestionTestCase>>testASuggestionMayNameTheReceiver,
  [ERROR] PrivateNameManglingTestCase>>testPrivateNameMangling) plus three:
  `WithItemPositionsTestCase>>testANestedFunctionKeepsTheColumnsToo` and
  `>>testTheExitCaseSurvivesTwoLevelsOfNesting` -- the PEP 657 column family
  (`[108, None, None]` where the text gives `[108, 26, 38]`): the nested
  functions they inspect are IR block frames now, and an IR frame has no
  columns yet; both pass flag-off in the same harness -- and `[ERROR]
  TwilioClientTestCase>>testMessagesCreate`, whose text is the
  AlmostOutOfMemory notification (15 in shard 3's log, 0 elsewhere) and which
  passes 6/6 alone flag-on: the cold-shard pressure effect.  The first sweep
  (before defects 3-6 were fixed) read `21 failed, 2 errors` and, before defect
  3 was fixed, hung.

**Where item 4's first cut leaves the census (2026-09-08; stdlib corpus,
`census_stdlib.tpz` right after `./install.sh` on gs40 as Claude3, before the
sweep fixes -- the eligibility since differs only by `nestedDef:super`): 125
modules imported, 0 failures, 5554 IR compiles, 0 fallbacks.**  Of the
stdlib's 1570 top-level defs **1390 (88.5%)** compile through IR (was 1334,
85.0%, after cuts 57-59); of its 4427 class-body methods **4166 (94.1%)** are
eligible through the seam (was 3947, 89.2%).  No `stmt:FunctionDefAst` or
`cm:stmt:FunctionDefAst` row remains (were 76 + 77).  What the nested-def
family still refuses: `nestedDef:annotations` 23 top-level + 51 methods (the
`annotate:` block -- the largest, and a regular shape: a two-argument block
over a PyDict cascade of `PyAnnotate ___annotationValue___:source:format:`
sends, each expression in a thunk), `nestedDef:reservedName` 5 (dataclasses'
`_make_synthesized_*` and reprlib.recursive_repr, whose inner defs take a
`self` parameter), `nestedDef:kwonly` 1 (asyncio.tasks.create_eager_task_factory),
`nestedDef:flow` 1 + 1 (difflib._mdiff, argparse's _parse_known_args: a nested
def read before it is bound).  Beside it: `stmt:NonlocalAst` 3 + 2 (cut 66)
and `value:LambdaAst` 19 + 28 (cut 65).  The CENSUS.md rewrite is the other
lane's; these numbers are from the raw census log.

## Progress — cut 65 (lambdas)

Roadmap item 4, second cut: `value:LambdaAst` (19 stdlib top-level defs +
28 class methods after cut 64).

**What the text emits** (LambdaAst>>printSmalltalkOn:; trace of `lam(x)`,
`lam_defaults(x)`, `lam_arg(xs)`, `K.lam(self)`):

    f := ([:___positional___ :___kwargs___ | | ___curPos___ a |
        ((___positional___ size) < 1) ifTrue: [TypeError ___checkMissingPositional___: ___positional___
            kwargs: ___kwargs___ names: #( 'a' ) posonly: 0 qualifiedName: '<lambda>'].
        a := (___positional___ size >= 1) ifTrue: [___positional___ at: 1]
            ifFalse: [(___kwargs___ isNil not and: [___kwargs___ includesKey: 'a'])
                ifTrue: [___kwargs___ at: 'a']
                ifFalse: [TypeError ___signalMissingArguments___: #( 'a' ) kind: 'positional' qualifiedName: '<lambda>']].
        ___curPos___ := ...
        (a) ___binOpAdd___: (x)
    ] @env0:___pyNamed___: '<lambda>'; @env0:___pyModuleNamed___: 'nprobe';
      @env0:___pyQualname___: 'lam.<locals>.<lambda>';
      @env0:___pyCode___: (PyCode @env0:name: '<lambda>' filename: '...' firstlineno: 32
          argcount: 1 posonlyargcount: 0 kwonlyargcount: 0)).

    f := ([| ___lamdef_b_35_8___ | ___lamdef_b_35_8___ := 2.               (defaults: a wrapper whose
        [:___positional___ :___kwargs___ | | ___curPos___ a b rest kw |      temps carry the lambda's
        a := ...  b := ... ifFalse: [___lamdef_b_35_8___]].                  source position)
        rest := tuple perform: #withAll: env: 0 withArguments: { ___positional___ copyFrom: 3 to: ___positional___ size }.
        kw := ___kwargs___ isNil ifTrue: [PyDict new] ifFalse: [___kwargs___ copy].
        kw removeKey: 'a' ifAbsent: [].  kw removeKey: 'b' ifAbsent: [].
        <body>
        ] ___pyNamed___: '<lambda>'; ...; ___pyCode___: (...)] value)

The same closure block as a def's with an EXPRESSION body and a lighter
prologue: no arg-count guards (a lambda silently ignores extra arguments --
the text records it as a known gap), the missing-positional check only when
some positional is required, every positional -- positional-only included --
through the kwargs gate, the `*args` tail, a required-keyword-only check and
per-parameter keyword-only bindings, a `**kw` that is a COPY minus the
regular and keyword-only names; no shallowCopy, no signature spec, no closure
cells, no flags or freevars on the PyCode; the stamps cascaded onto the inner
block INSIDE the defaults wrapper.  The arity messages say ``<lambda>()``,
where CPython says ``lam.<locals>.<lambda>()`` -- so the fixture compares only
the message tail.

**What the IR emits** (`LambdaAst>>___emitIRValueOn___:`,
`___emitIRLambdaBlockOn___:`, `___emitIRLambdaPrologueOn___:pos:kw:`): that,
send for send, through cut 64's builder machinery -- `blockWithArgs:temps:do:`
over the two block arguments with every parameter a block temp bound by
`withLocals:do:`, `nestedFunctionDo:` for the closure's own helper temps (and
`inNestedFunction`, unused by an expression body), `blockWithTemps:do:` for
the `___lamdef_<p><line>_<col>___` wrapper (`defaultTempSuffix`, the text's
own), the body's `___emitIRValueOn___:` as the block's value, genLeaf cleared
for the body, and the cascade `___pyNamed___: '<lambda>'; ___pyModuleNamed___:;
___pyQualname___:` (from `CallAst ___qualnameFor___:name:` -- a lambda pushes
no scope, so the enclosing def's frame gives ``f.<locals>.<lambda>'' and a
method's ``K.lam.<locals>.<lambda>``) `; ___pyCode___:` with the six-field
PyCode.  The prologue is the lambda's own (it cannot share a def's: the
qualified name is the literal ``<lambda>`` and positional-only parameters take
the kwargs gate), written against the same builder primitives.

**Eligibility** (`___irLambdaReason___:`, guarded): the body must be an
emittable value against the enclosing locals plus the parameters
(`___irNestedLocals___:`, also its `___irChildLocals___:` for the census);
defaults and keyword defaults emittable in the enclosing scope; refused, each
a census row: `LambdaAst:walrus` (a walrus target is a block temp the text
declares; NamedExprAst is refused as a value anyway), `LambdaAst:yield` (a
generator lambda), `LambdaAst:reservedName` (a pseudo-variable parameter --
the text's `_self` transport).  For the enclosing flow analysis a lambda reads
its defaults and its body's free variables (`___irReadLocalNamesInto___:locals:`
drops its own parameters); nothing inside can be unbound, so no flow walk of
its own.  A lambda as a MODULE def's default (`___irDefaultsReason___`) is
judged against an empty local set, as before, and now passes when it reads
nothing but its parameters.  Free-variable reads inside a lambda take the
cut-64 guard rule (`___irFreeReadNeedsGuard___` walks to the innermost def
OR lambda).

Fixture: twelve module defs -- a plain closure, a `key=` argument, defaults +
`*rest` + `**kw` on three call routes, keyword-only, positional-only, `__name__`
/ `__qualname__` / `__module__` / `co_name` / `co_argcount`, the loop-capture
idiom (`lambda m=v:` binds early, `lambda: v` late), a lambda returning a
lambda, a lambda as a nested def's default and as a keyword override, the
three arity messages (tails), a conditional body, an immediately-invoked
lambda -- and class `Lammer` (a lambda over `self.v` inside a comprehension,
a `key=` tuple, a method's `<lambda>` qualname).  Compiled 390 -> 407 (all 17),
fallbacks 0, first try; flag OFF ALL_OK at compiled=0.  The probe modules:
nprobe.py 11 -> 15 (`lam`, `lam_default`, `lam_arg`, `K.lam`), nprobe2.py
8 -> 9 (`lam_defaults`), OUT unchanged; the fixture census shows no
`LambdaAst:` row.

**Gates** (wt/d, gs40, Claude3):

* smoke tripwire: `4 run, 4 passed`, compiled = 407, fallbacks = 0; flag OFF ALL_OK at compiled=0;
* flag-off `./scripts/run_tests.sh`: `main suite (sharded: 4 of x4): 6431 run, 6431 passed, 0 failed, 0 errors`;
* flag-on cold sweep `GRAIL_TEST_COLD=1 GRAIL_IR_CODEGEN=1 ./scripts/run_tests.sh`:
  `main suite (sharded: 4 of x4): 6431 run, 6420 passed, 10 failed, 1 errors`,
  every shard reporting, 0 AlmostOutOfMemory notifications -- exactly cut 64's
  residue by name: the known nine at 91041f20 plus the two WithItemPositions
  column tests reached through IR nested frames.  Nothing lambda-specific.

## Progress — cut 66 (`nonlocal`, and annotated nested defs)

Roadmap item 4, third cut: `stmt:NonlocalAst` (3 stdlib top-level defs + 2
class methods after cut 64) and, folded in because it was the largest
remaining nested-def refusal, `nestedDef:annotations` (23 + 51).

**`nonlocal`: the text has no cell mechanism for it.**  Trace of `counter()`
and `K.nl(self)`: the nested block simply writes the enclosing temp --
``n := (n) @env1:___augmentedOp___: (1) inplace: #'__iadd__:' binary: #'__add__:'``
inside `[:___positional___ :___kwargs___ | ...]` -- because a Smalltalk block
captures its home's temps by reference; NonlocalAst>>printSmalltalkOn: emits
nothing.  The `___cell_<name>___` reader/writer pairs the roadmap mentions
belong to a CLASS body nested in a def (the class's methods are separate
methods with no lexical link), not to a def in a def.  So the IR needs no
runtime shape either: `NonlocalAst>>___irEligibleStatementLocals___:` admits a
declaration whose every name is an in-scope local and
`___emitIRStatementOn___:` emits nothing; the parser already strips the
declared names from the nested body's `variables` / `writes`, so they are not
block temps, and a store or augmented store to the name resolves through
`leafFor:` to the ENCLOSING leaf -- a method temp, or for two levels of
nesting the middle closure's block temp (`nl_two_levels`, `nl_mid_owner`).
The enclosing flow analysis already saw the write: the def statement's
`___irWriteLocalNamesInto___:locals:` (cut 64) reports the nested body's
writes to enclosing names, so the target must be bound before the def
(`n = 0` first); a nonlocal that FIRST binds its target from inside the closure
refuses as `flow` when the enclosing body reads it afterwards.  A closure's
read of the target takes cut 64's guard, as the text's does.  A nonlocal that
reaches past a class body stays refused (`___enclosingFunctionLocalBeyondClass___:`,
the AugAssign method-mode rule of cut 53).

**Two `nonlocal` shapes stay REFUSED, both found by the flag-on sweep rather
than by reading.**  The first build admitted every declaration whose names were
in-scope locals, and the cold sweep answered with four failures the flag-off
run did not have.  Both refusals are `NonlocalAst`'s own, named in the census:

* `NonlocalAst:classCell` -- **`nonlocal __class__`**.  It is the one name
  `popScope` EXEMPTS from stripping (it keeps it local, so the Smalltalk temp is
  declared and the method compiles at all), because CPython gives `__class__` to
  every method of a class as an implicit SHARED cell.  The text answers that by
  routing the class's `__class__` reads through the cell whenever anything
  rebinds it (`ClassDefAst>>___classCellIsRebindable___`); the IR has the READ
  shape (NameAst's `#dunderClass` arm, `___grailClassCellValue___`) but no
  transport for the STORE, so `nonlocal __class__; del __class__` emptied a
  fresh local nobody reads and left the cell intact.  Measured:
  `SuperPreconditionErrorsTestCase` >> `testDeletingTheClassCellEmptiesItForSuper`
  and `testTheCellIsSharedByEveryMethodOfTheClass`, three of
  tests/python/super_precondition_errors.py's keys (`empty_class_cell`,
  `empty_cell_again`, `bare_read_after_del`) answering NO RAISE where CPython
  raises.  This is test_super's `tearDown` shape, so it is worth a cut of its
  own rather than a quiet approximation.
* `NonlocalAst:del` -- a **`del` of a declared name**, the enclosing side of the
  same problem.  The delete UNBINDS the enclosing binding, and the enclosing
  method's own flow proof has no way to record that: cut 64's
  `___irWriteLocalNamesInto___:locals:` reports the nested body's writes as
  BINDINGS, which is the opposite of what a `del` does.  So the enclosing body's
  later read was emitted bare and answered nil where CPython raises
  UnboundLocalError -- `UnboundLocalErrorTestCase >>
  test_nested_nonlocal_del_keeps_guard_and_raises`, over
  tests/python/unbound_local_guard.py's `nested_nonlocal_del`.  Note this was a
  BEHAVIOURAL failure, not the `sourceString` kind: the test's first assertion
  reads the emitted text, but the `should:raise:` after it failed too.

Both refusals cost the stdlib corpus nothing: neither row appears in the
125-module census (below), so the shapes live only in these fixtures.

**One shape the IR does that the text cannot.**  `def nl_assign(x): def
record(v): nonlocal x; ... x = v` -- a nonlocal REBINDING THE ENCLOSING DEF'S
PARAMETER.  The text fails to compile it flag-off (``expected an assignable
variable'', CompileError 1029/1001 at module load): the parameter is a bare
Smalltalk argument, and both the block's store and the closure cell's setter
write it.  The IR's first build fell back on the same shape (`generateFromIR
failed: emitStore: unexpected store to method or block arg`) -- and the
fallback then died in the text.  `___irReassignedParamNames___` now also
counts a parameter that any nested def declares `nonlocal`
(`___irNestedNonlocalNames___`), so it takes the cut-29 transport (`_x`
argument, `x` temp) and the closure writes the temp: `nl_assign(0)` answers
`(2, [0, 1])`, CPython's value, 0 fallbacks.  It cannot be in the fixture
(the fixture must load flag-off); it lives in the probe module nlprobe.py,
and `nl_cell_view` was rewritten over a local for the same reason.  Recorded
as a text-path defect: a nonlocal of an enclosing parameter takes the whole
module down under the text.

**Annotated nested defs** (`___emitIRAnnotateBlockOn___:`): emitAnnotateBlockOn:'s
PEP 649 block, send for send --

    ___pyNamed___: 'inner' annotate: [:___annArgs___ :___annKw___ | ((PyDict @env0:new)
        @env0:at: 'a' put: (PyAnnotate @env1:___annotationValue___: [int] source: 'int'
            format: (___annArgs___ @env0:at: 1));
        @env0:at: 'return' put: (...); @env0:yourself)] [doc: '...']

-- a `blockWithArgs:temps:do:` over the two arguments, a PyDict cascade of
`at:put:` sends ending in `yourself`, each value a `PyAnnotate
___annotationValue___:source:format:` send (env 1) whose expression sits in a
zero-argument thunk and whose source text is the node's
`___annotationSourceString___`.  Built at the DEF SITE, outside the closure's
local bindings and with `annotationOwnerDefNode` set, so the expressions
resolve in the enclosing scope as CPython evaluates them; the name stamp
becomes the one keyword send `___pyNamed___:annotate:` /
`___pyNamed___:annotate:doc:`.  Eligibility: every annotation an emittable
value of the enclosing scope with a spellable source text, else
`nestedDef:annotationExpr`.  `inner.__annotations__` answers `{'a': int,
'b': 'str', 'return': str}` flag-on as flag-off.

**The thunk is `nestedFunctionDo:`, and that is load-bearing.**  Each
annotation expression is emitted with `inNestedFunction` set, so a read of an
enclosing local carries the text's free-read guard
(`(x ifNil: [UnboundLocalError ___signalUnbound___: #x])`,
`NameAst>>___irFreeReadNeedsGuard___`).  The enclosing flow proof does NOT
cover the annotate block -- PEP 649 exists precisely so an annotation naming a
not-yet-bound local can be built now and read later -- and the first build,
which emitted the read bare, answered nil where CPython raises: the flag-on
sweep failed `Pep649AnnotationsTestCase >>
testUpdateWrapperDefersAnUnresolvedAnnotation` with ``NO RAISE'' for a forward
reference bound after the def (`x: resolved_afterwards`, then
`resolved_afterwards = str`).  `UnboundLocalError` is a `NameError` subclass,
which is what makes the fixture's `except NameError` the right catch.

Fixture: `nl_counter` (`+=` through nonlocal, twice, then a call after the
read), `nl_two_levels` and `nl_mid_owner` (the target two levels up / owned by
the middle closure), `nl_cell_view` (`__closure__[0].cell_contents` before and
after the write), `nl_annotated` (three annotations including a string one
and a defaulted parameter), `nl_annotated_docd` (annotate + doc), class
`Nonlocaler` (nonlocal inside a method's closure reading `self.v`; an
annotated closure in a method).  Compiled 407 -> 417 (all 10), fallbacks 0;
flag OFF ALL_OK at compiled=0.  The probe modules: nprobe.py 15 -> 17
(`counter`, `K.nl`), nprobe2.py 9 -> 10 (`annot`), OUT unchanged; only
`kwonly` (`nestedDef:kwonly`) and `self_inner` (`nestedDef:reservedName`)
remain on text there.

**Gates** (wt/d, gs40, Claude3):

* smoke tripwire: `4 run, 4 passed`, compiled = 417, fallbacks = 0; flag OFF ALL_OK at compiled=0; `python3 tests/python/ir_codegen_smoke.py` ALL_OK: True;
* flag-off `./scripts/run_tests.sh`: `main suite (sharded: 4 of x4): 6431 run, 6431 passed, 0 failed, 0 errors`;
* flag-on cold sweep `GRAIL_TEST_COLD=1 GRAIL_IR_CODEGEN=1 ./scripts/run_tests.sh`:
  `main suite (sharded: 4 of x4): 6431 run, 6420 passed, 10 failed, 1 errors`,
  every shard reporting, 0 AlmostOutOfMemory notifications -- **exactly cut
  65's residue, name for name**: FrameReceiverSuggestionTestCase>>
  testASuggestionMayNameTheReceiver, LambdaFrameTestCase>>testLambdaFrameSpans,
  TracebackTestCase>>testForLoopExceptionPositions, ImportlibTestCase>>
  testInstanceMethodNoOuterBlock, LiveFrameProbeResilienceTestCase>>
  testTheTempsFastPathNeedsNoSource, RaiseSpanTestCase>>testRaiseAndAssertSpans,
  SpanEndTokenTestCase>>testSpanReachesTheEndOfItsLastToken, the three
  WithItemPositionsTestCase column tests, and [ERROR]
  PrivateNameManglingTestCase>>testPrivateNameMangling.  Nothing
  nonlocal- or annotation-specific.

The four cut-66 regressions above were all found by an EARLIER flag-on sweep
of this cut and are fixed, not absorbed: re-run alone flag-on they pass
(UnboundLocalErrorTestCase 21/21, Pep649AnnotationsTestCase 12/12,
SuperPreconditionErrorsTestCase 13/13), with the same classes flag-off in the
same harness as the control.  That sweep also lost shards 1 and 3 to a FATAL
``VM temporary object memory is full, old space overflow'' (old gen at
374911/374912K of run_tests.sh's ~490MB `GEM_TEMPOBJ_CACHE_SIZE`, 3190 of
6431 tests run) while a second worktree's four shards were running on the same
host; it did not recur on the clean sweep.  Worth knowing that a cold flag-on
sweep sits near that ceiling -- `GRAIL_TEST_COLD=1` commits nothing, so every
IR-built method of the run stays in temp object memory, and each cut adds
more of them.

**Census** (125 vendored modules, flag forced, after `install.sh` so the
denominator is real -- a test run's framework deploy turns most of the stdlib
into cache hits).  Against the cut-64 census on the same corpus, cuts 65-66
close four rows and open none: `value:LambdaAst` 19 -> 0 and
`cm:value:LambdaAst` 28 -> 0 (cut 65); `nestedDef:annotations` 23 -> 0,
`cm:nestedDef:annotations` 51 -> 0, `stmt:NonlocalAst` 3 -> 0 and
`cm:stmt:NonlocalAst` 2 -> 0 (cut 66).  Top-level defs compiled 1390 -> 1426;
eligible class methods 4166 -> 4241.  Neither `NonlocalAst:classCell` nor
`NonlocalAst:del` appears at all.

What the freed defs now refuse for is the ranking for the next cut in this
lane -- 18 nested defs, in four rows:

| row | defs | example |
| --- | --- | --- |
| `nestedDef:reservedName` | 12 | `dataclasses._make_synthesized_init` |
| `cm:nestedDef:reservedName` | 2 | `werkzeug.local._ProxyIOp.__init__` |
| `nestedDef:flow` / `cm:nestedDef:flow` | 1 + 1 | `difflib._mdiff`, `argparse.ArgumentParser._parse_known_args` |
| `cm:nestedDef:super` | 1 | `_py_warnings.deprecated.__call__` |
| `nestedDef:kwonly` | 1 | `asyncio.tasks.create_eager_task_factory` |

`reservedName` -- a nested def with a `self` (or other Smalltalk
pseudo-variable) parameter or local, where the text renames the reads and the
IR has no transport -- is 14 of the 18 and grew from 5 as annotations stopped
masking it.  It is the next cut.
## Progress — cut 67 (`@staticmethod`)

The last of item 1c's receiver shapes (`method:staticmethod`, 19 stdlib
methods).  The text builds a @staticmethod from the MODULE generator
(generateModuleMethodSourceOn:) under the class context -- every parameter a
Smalltalk argument, the module selector, `selfParameterName` nil so no name
maps to the receiver, module names through the module instance -- and
installs it on the metaclass.  One predicate carries the difference:
`___irStripsReceiver___` (method mode AND not a StaticFunctionDefAst) now
decides the selector, the parameter list, the varargs form and the default
owner where `___irMethodMode___` used to; the static loop in ClassDefAst
registers and installs class-side exactly as the classmethod loop does
(`class>>` key, text twin noted, the table and the map release moved after
the LAST method loop).

One shape had to be read rather than guessed: a @staticmethod's parameter
DEFAULT.  The text's module-form generator, run in a class context, emits no
memo at all -- neither the module `___moduleDefaultAt:compute:` (which the
first probe sent to the CLASS: `a Util class does not understand`) nor the
class table -- the default expression is simply evaluated inline on every
call that needs it.  That is the third of the three default paths the
``defaults are recreated per call'' note already records; the IR mirrors it
rather than fixing it, because the two paths must agree.

Fixture: Util (fixed-arity, a default reading a module global, `*args /
**kw`, called on the class, on an instance, from an instance method, and with
a splat).  Compiled 353 -> 358, 0 fallbacks, RESULTS true with the flag on
and off.  Gates: flag-off `6431 run, 6431 passed, 0 failed, 0 errors`;
flag-on cold sweep `6431 run, 6421 passed, 8 failed, 2 errors` -- the known
nine plus `[ERROR] TwilioClientTestCase>>testMessagesCreate`, AlmostOutOfMemory
in its shard log (15 notifications in this sweep, the most yet; 6/6 alone
flag-on).  The cold-shard memory pressure is now the one thing every sweep
reports, and it is growing with coverage.

## Progress — cut 68 (the long tail, part 1: Ellipsis, builtins as values, `raise Cls(kw=...)`, loop `else`)

Four small emits from item 12, each the text's shape:

  * **Ellipsis** (`ConstantAst:Ellipsis`, 13 methods + 17 defs): the marker
    Symbol `#'...'` emits the GLOBAL `Ellipsis`, never the marker (the text's
    rule, so `type(...)` is not Symbol).
  * **a builtin function as a value** (`NameAst:builtinFunctionAsValue`, 18
    + 11): emitBuiltinFirstClassRead:'s chain, `((Python at: #builtins)
    instance) ___globalAt___: #len otherwise: [BoundMethod receiver: ...
    selector: #len]` -- the module slot first (a runtime `builtins.len =
    fake` and the cached wrap both live there, so `len is len` holds), the
    wrap in a real block on the miss.  The `#builtinValue` load kind sits
    exactly where the chain used to answer nil; `type` keeps its own earlier
    branch.
  * **`raise Cls(a, kw=v)` and `raise Cls(*args)`** (`RaiseAst:keywords` 12,
    `:starArgs`): the raise's `___pyRaiseNew___:args:kw:` takes the same
    argument Array and keyword dict the call shapes build.
  * **`for ... else` / `while ... else`** (`ForAst:else` 11 + 7,
    `WhileAst:else`): the else statements go INSIDE the PythonBreak-protected
    outer block, after the drain handler (for) / the `whileTrue:` (while), so
    a break propagates past them -- the text's placement.  The flow analysis
    walks the else from what was bound BEFORE the loop and lets none of its
    bindings survive the statement (a break skips it).

Fixture: Tagged (an Exception subclass with a keyword `__init__`),
tail_ellipsis, tail_builtin_values (`f = len`, `map(len, ...)`, `f is len`),
tail_raise_kw, tail_loop_else (break and natural exit for both loops),
TailUser.scan (for-else with a return in the body).  Compiled 358 -> 365, 0
fallbacks, RESULTS true with the flag on and off (one expected value and one
tripwire count were first written wrong by hand and corrected against
CPython, which is what the fixture check is for).  Gates: flag-off `6431
run, 6431 passed, 0 failed, 0 errors`; flag-on cold sweep `6431 run, 6421
passed, 8 failed, 2 errors` -- the known nine plus `[ERROR]
TwilioClientTestCase>>testMessagesCreate` (AlmostOutOfMemory in its shard
log, 15 notifications; 6/6 alone flag-on).

## Progress — cut 69 (the long tail, part 2: `global` declarations and the walrus)

**`global`** (`globalDeclaration`, 19 top-level defs + a few methods).  The
parser already does the work: a declared name is removed from the body's
variables and registered in the module scope, so a READ takes the module load
kind the IR has had since cut 5 and only the STORE was missing --
`AssignAst>>___irModuleStoreTarget___:` now emits the text's
`printSmalltalkModuleStoreOn:target:` route, `<recv> @env0:dynamicInstVarAt:
#name put: (v)` with `self` in a module def and `<Mod> @env0:___instance___`
inside a class method (`___moduleStoreReceiverExpr___`).  The GlobalAst
statement itself emits nothing, as the text's does.  The def-level refusal is
gone; a `nonlocal` still refuses through the name's own predicates.

**The walrus** (`value:NamedExprAst`, 14 methods + a few defs).  A local
target is the assignment node used as a VALUE (an assignment is an expression
in the IR as in Smalltalk source -- the text parenthesises `(x := v)` for the
same reason); a module-scope target is the module store send, whose answer is
the value put.  The class-body branches stay on text.  The flow analysis
learned the one idiom that matters: a walrus evaluated UNCONDITIONALLY in an
`if` or `while` test (`if (m := re.match(...)):`, `while (chunk :=
f.read(n)):`, through a comparison or `not`, or as the first operand of
`and` / `or`) is bound on both branches and after the statement
(`___irWalrusTargetNames___:`); a walrus anywhere else keeps the default
rule -- a below-top-level write must already be bound, or the def stays on
text.

Two fixture hazards met, both recorded because they will recur: (1) the
text-side def of the text-calls-IR traceback check used `global` as its
opt-out from IR, which this cut made eligible; it now uses `dir()`
(frame-sensitive, refused for good).  (2) The first replacement tried was
`eval("0")`, and it failed with `ImproperOperation: object cannot have more
than 255 dynamic instVars` on the fixture's module instance: a doit
pre-creates a module slot for every module variable of the source, and the
smoke module -- 372 defs, dozens of classes and constants -- is within reach
of GemStone's per-object dynamic-instVar limit.  The fixture must not grow
its module-level NAMES much further; new cases should reuse classes or move
to a second fixture module.

Fixture: bump_global / read_global / GlobalUser.poke (a module-def store, a
method store through the module instance), walrus_if, walrus_while,
walrus_compare.  Compiled 365 -> 372, 0 fallbacks, RESULTS true with the flag
on and off.  Gates: flag-off `6431 run, 6431 passed, 0 failed, 0 errors`;
flag-on cold sweep `6431 run, 6421 passed, 8 failed, 2 errors` -- the known
nine plus `[ERROR] WarningRegistryTestCase>>testOnceIsOncePerProcess`
(AlmostOutOfMemory in its shard log, 4 notifications).

## Progress — cut 70 (parameters and locals spelled like Smalltalk pseudo-variables)

`pseudoVariableParam` (23 top-level defs -- typing's `def NoReturn(self,
parameters)` family).  The text carries such a binding under its transport
identifier (`self` -> `_self`, `super` -> `_super`, ...:
`___transportIdentifierFor___:`) and rewrites its reads; the IR has no name
resolution, so the leaf merely gets that name while the builder's table
stays keyed by the PYTHON name (`argNamed:leafName:`, `tempNamed:leafName:`,
`___irLeafNameFor___:`).  Every registration site -- fixed-arity arguments,
transport temps, varargs-prologue temps, body locals -- goes through it, and
the def-level refusal is gone.

Two TEXT gaps found by the fixture and not asserted (the fixture must pass
with the flag off too): a star parameter spelled like a pseudo-variable (`def
f(*super, **false)`) is a CompileError on the text path, and a METHOD with
any parameter spelled like a pseudo-variable (`def combine(me, nil)`) hits
the text's codegen-gap stub (`NameError: Grail could not compile this
method`), and a KEYWORD argument spelled like one (`pv_add(1, 2, nil=5)`)
binds the default instead of the value on the text path (5 where CPython and
the IR answer 8).  All three compile and run correctly through IR.

Fixture: pv_add (`self`, `true`, `nil` parameters, a `thisContext` local, at
module level).  Compiled 372 -> 374, 0
fallbacks, RESULTS true with the flag on and off.  Gated together with cut 69:
flag-off `6431 run, 6431 passed, 0 failed, 0 errors`; flag-on cold sweep
`6431 run, 6422 passed, 8 failed, 1 errors` -- exactly the known nine, and
for once no AlmostOutOfMemory notification in any shard.

## Progress — cut 71 (flow: what a `while True` loop leaves bound)

The bound-before-read analysis treated every `while` as possibly zero-trip,
so nothing its body bound was known afterwards -- and `re._compiler`'s
`while True: ... op, av = ...; if ...: break` followed by a read of `op` was
one of the 21 + 17 `flow` refusals.  A `while True:` (or `while 1:`) never
leaves through its test: what is bound after it is what EVERY `break` had
bound.  BreakAst now records the set in force at each break into a collector
the enclosing loop pushes around its body walk
(`AbstractNode class>>___irCollectBreakSetsDuring___:`); a `while True` meets
those sets for its after-set (no break at all: nothing after the loop is
reachable, every local counts as bound), any other test keeps the entry set.
A `for` loop pushes and discards its own collector so an inner break cannot
leak into an outer `while True`.

Fixture: scan_tokens (the re._compiler shape, with an inner `for ... break`),
first_even_loop (`while 1:`).  Compiled 374 -> 377, 0 fallbacks, RESULTS
true with the flag on and off.  Gates: flag-off `6431 run, 6431 passed, 0
failed, 0 errors`; flag-on cold sweep `6431 run, 6421 passed, 8 failed, 2
errors` -- the known nine plus `[ERROR] TwilioClientTestCase>>testMessagesCreate`
(AlmostOutOfMemory in its shard log, 15 notifications).

## Progress — cut 72 (reads the flow analysis cannot prove bound carry the text's guard)

The bound-before-read analysis (cut 31) was a GATE: a def with one read it
could not prove bound stayed on text (`flow`, 21 methods + 17 defs after cut
71).  The text never had that constraint -- it guards EVERY read of a
function local with `(x ifNil: [UnboundLocalError ___signalUnbound___: #x])`
and skips the guard only for a parameter no `del` can unbind
(`___guardedLocalNeedsCheck___:`).  The IR now does the same in the one case
the analysis fails: the build asks `___irAssignFlowSafe___:` and, when it is
false, hands the builder the guarded set -- every body local plus any deleted
parameter (`___irGuardedLocalNames___`) -- and NameAst emits the guarded read
(`ifNilValue:then:`, the inlined `ifNil:` the text relies on) for those
names.  A def the analysis proves keeps its bare reads, so the common case
pays nothing; the analysis is an optimisation now, not a refusal.

The two fixture defs written in cut 31 to exercise the refusal (`maybe`,
`drop_then_read`) moved to IR with this cut and answer the same values --
the guard is what they were exercising on the text side.

Fixture: guarded_with (a `with` body binding on both branches, read after --
the `_py_warnings.catch_warnings.__enter__` shape), guarded_unbound (an
UnboundLocalError caught, with CPython's message), guarded_del (a deleted
parameter).  Compiled 377 -> 385 (six new defs and the two that moved), 0
fallbacks, RESULTS true with the flag on and off.

The first flag-on sweep added four UnboundLocalErrorTestCase failures: all
four read the compiled fixture methods' `sourceString` for the text's
`ifNil: [UnboundLocalError ...]` guard (one also checks `_blockLiterals
isNil`), which an IR method -- Python source, the guard an inlined node --
cannot show; the behavioural half (the deleted parameter RAISES) passed.
They measure the TEXT emitter, so `unboundGuardFixture` now loads its module
with the flag forced off and restored in an ensure:, as TracebackTestCase
does for its line-cache fixture.  Gates after that: flag-off `6431 run, 6431
passed, 0 failed, 0 errors`; flag-on cold sweep `6431 run, 6421 passed, 8
failed, 2 errors` -- the known nine plus `[ERROR]
TwilioClientTestCase>>testMessagesCreate` (AlmostOutOfMemory, 15
notifications).

## Progress — cut 74 (a nested def whose parameters or locals are pseudo-variables)

Numbering note: the two lanes both reached for 73 at the same time.  **73 is
the OTHER lane's** (the position map for IR frames, `feat/ir-position-map`);
these two are 74 and 75.  The flag-on residue quoted below is therefore
measured on a base that does NOT yet carry the position map -- 15 items.  With
cut 73 merged the same residue is 5, and those five
(`TracebackTestCase>>testForLoopExceptionPositions`,
`FrameReceiverSuggestionTestCase`, `ImportlibTestCase>>testInstanceMethodNoOuterBlock`,
`LiveFrameProbeResilienceTestCase>>testTheTempsFastPathNeedsNoSource`,
`PrivateNameManglingTestCase>>testPrivateNameMangling`) are a subset of the
fifteen, so nothing here is hidden by the difference.

`nestedDef:reservedName` -- 13 stdlib top-level defs + 2 stdlib class methods,
3 + 4 in the test corpus, the largest remaining nested-def refusal.  The shape
is `dataclasses._make_synthesized_init`'s: a closure whose first parameter is
spelled `self` (or `nil`, `true`, `false`, `super`, `thisContext`), which
Smalltalk cannot declare as a block temp.

This is **cut 70 one lexical level down** and nothing more.  Cut 70 gave a
METHOD's arguments and temps a transport LEAF NAME while the builder's local
table stayed keyed by the PYTHON name (`argNamed:leafName:` /
`tempNamed:leafName:` / `___irLeafNameFor___:`); the closure block wants the
same split.  `___irNestedOwnLeafNames___` answers the transport spelling of
each `___irNestedOwnNames___` entry, in the same order, and
`___emitIRNestedBlockOn___:` now carries two parallel lists -- the leaf names
go to `blockWithArgs:temps:do:`, the Python names to `withLocals:do:`.  Every
consumer inside the block already resolves through `aBuilder leafFor:
<python name>` (the positional binding, the vararg and kwarg bindings, name
reads and stores, the closure cells), so **not one send moved**: the only
difference in the emitted method is the spelling of a block temp, which is
exactly what the text does (`transportParamName:`, `| _self other
___curPos___ |`).

What is refused instead, a new census row: `nestedDef:leafNameCollision`, a
def that binds BOTH `self` and `_self`, whose transport identifiers are the
same string.  The text silently aliases the two onto one temp (its body-local
merge skips a name already present under its transport spelling); refusing is
cheaper than reproducing that.  No occurrence in either corpus.

**Three TEXT gaps this cut walked into, all recorded and none asserted** (the
fixture must pass with the flag off too):

* A **defaulted** pseudo-variable parameter of a nested def is an uncatchable
  CompileError on the text path: the def-time wrapper declares
  `| ___default_nil___ |` (the raw Python name, `printSmalltalkOn:` line ~502)
  and the binding reads `___default__nil___` (built from the TRANSPORT name in
  `printPositionalUnpackingOn:`), so `def inner(nil=2)` inside a def is
  "undefined symbol" and takes the whole enclosing method with it.  The IR uses
  one spelling on both sides and compiles it.  The fixture therefore puts the
  default on a normal parameter (`def inner(nil, k=2)`).
* The **keyword lookup** uses the transport name: the text emits `kwargs
  includesKey: '_self'`, so `init(self=box)` cannot bind the parameter -- while
  the SAME method's unexpected-keyword guard admits `'self'`, so the call is
  accepted and then reported as a missing positional argument.  The IR looks up
  `'self'`, which is what CPython binds.  This is the nested twin of the
  keyword gap cut 70 recorded at method level.
* Not a gap, checked and equal: the missing-argument REPORT already names the
  Python spelling on both paths (`printMissingPositionalCheckOn:` maps back
  through `___pythonParamNameFor___:`), so `names: #( 'self' )` in the text and
  in the IR.

Oracle check: the text dump of the fixture (`GRAIL_CODEGEN_TRACE_DIR`) for
`npv_synth.<locals>.init` and `NpvNester.make.<locals>.i_op` is the cut-64
closure shape with `_self` in the temp pane and in every read -- identical send
for send to what the IR builds, the kwargs key above being the one literal that
differs.

Fixture: npv_synth / npv_synth_run (the dataclasses shape: `def init(self,
*args, **kwargs)` with `setattr`), npv_locals (a `nil` parameter and `true` /
`false` body locals -- django `View.as_view`'s `self = cls(**initkwargs)`),
npv_deco (reprlib `recursive_repr`'s shape: a decorator factory whose wrapper
takes `self`, applied to a nested def that also takes `self`), npv_free (the
pseudo-variable is the closure's, the free variable is the enclosing local),
NpvNester.make (the werkzeug `_ProxyIOp.__init__` shape -- the nested `self`
SHADOWS the method's receiver, which `___irIsSelfReceiver___` already got
right through `___boundInNestedFunction___:`) and NpvNester.cell.  Compiled
449 -> 458 (6 top-level defs + 3 class methods), 0 fallbacks, RESULTS true
with the flag on and off.

Gates: flag-off `6535 run, 6535 passed, 0 failed, 0 errors`; flag-on cold
sweep `6535 run, 6520 passed, 14 failed, 1 errors` -- the known fifteen, every
one of them a method with no position map or a Smalltalk-source introspection
(`RaiseSpanTestCase`, `SpanEndTokenTestCase`, `LambdaFrameTestCase`,
`NestedOperandSpanTestCase` x2, `WithItemPositionsTestCase` x3,
`TracebackTestCase>>testForLoopExceptionPositions`, `PythonOffsetMapTestCase`
x2, `LiveFrameProbeResilienceTestCase>>testTheTempsFastPathNeedsNoSource`,
`ImportlibTestCase>>testInstanceMethodNoOuterBlock`,
`FrameReceiverSuggestionTestCase>>testASuggestionMayNameTheReceiver`) plus
`[ERROR] PrivateNameManglingTestCase>>testPrivateNameMangling`, the
recursion-guard byte budget.  No new name.

## Progress — cut 75 (a lambda parameter spelled like a pseudo-variable)

`LambdaAst:reservedName`, cut 74's twin one node class over: 1 def in the test
corpus (`test.test_call.TestPEP590.test_vectorcall_override_on_mutable_class`),
none in the stdlib.  Same fix, same size: `___irOwnLeafNames___` answers the
transport spelling of each `___irOwnNames___` entry, and
`___emitIRLambdaBlockOn___:` hands those to `blockWithArgs:temps:do:` while
`withLocals:do:` keeps the Python names.  The prologue already resolves every
parameter through `leafFor: <python name>` (the positional gate, the vararg
tuple, the keyword-only bindings, the `**kwargs` copy and its `removeKey:`
drops), so nothing else moved.  `LambdaAst:leafNameCollision` replaces the
refusal, for the same `self` + `_self` case; no occurrence in either corpus.

Unlike the nested def, **the lambda text path had no gaps to record here**: it
spells the `___lamdef_` default temps with the transport name on BOTH the
declaration and the read (so a defaulted pseudo-variable parameter compiles),
and it looks a keyword up under the PYTHON name (`pyName` in
`printSmalltalkOn:`), which is what CPython binds.  The one text limit is the
same star-parameter one cut 70 found for defs: `varargName` / `kwargName` are
taken raw, so `lambda *self: ...` is a CompileError on text.  It compiles
through IR and is therefore not asserted in the fixture.

Oracle check: the text dump for `lpv_plain.<locals>.<lambda>` and
`lpv_defaults.<locals>.<lambda>` is `| ___curPos___ _self _nil _true |` with
`_self` in every read and `'self'` as the kwargs key -- what the IR builds,
send for send, differing only in the temps' spelling (an IR method has no
`___curPos___`, and its `___lamdef_` memo temps take the raw name; neither is
observable).

Fixture: lpv_plain (a `self` parameter, called positionally and by keyword),
lpv_defaults (`self`, a defaulted `nil`, a keyword-only `true`), lpv_key (the
inline `key=lambda nil: ...` a call site passes), lpv_meta (the `__name__` /
`__qualname__` stamps), LpvHolder.scaled (the lambda's `self` shadowing the
method's receiver, inside a comprehension).  Compiled 458 -> 465 (5 top-level
defs + 2 class methods), 0 fallbacks, RESULTS true with the flag on and off.

Gates: flag-off `6535 run, 6535 passed, 0 failed, 0 errors`; flag-on cold
sweep `6535 run, 6520 passed, 14 failed, 1 errors` -- the same fifteen as cut
74, no new name.

A harness note worth carrying: main's PR #876 took `run_tests.sh` from four
shards to EIGHT, so ONE run now opens 8 sessions and two worktrees on one
stone exceed gs40's max-sessions.  Three of my shards died on "Login failed:
the maximum number of users are already logged in" and the runner still
printed a well-formed `4028 run, 4028 passed, 0 failed` -- the vacuous pass of
the "Overlapping run_tests.sh" note, and 4028 is short of 6535 only if you
know the number.  Check `pgrep -fl runTestsShard.gs` before starting, and
after a run confirm `grep -h GRAIL_SHARD_RESULT out/shard_*.out | wc -l` is 8
and the per-shard counts sum to the suite line.

### The flag-on board, measured again on Darwin arm64 (2026-09-10)

Both arms, same tree (this branch), same machine, back to back, after the `with`
fix above. This is a SECOND measurement of the board #909 opened, in a different
environment, and it qualifies one of its two headline findings.

| | flag OFF | flag ON |
| --- | ---: | ---: |
| OK | 72 | 68 |
| FAIL | 3 | 4 |
| ERROR | 17 | 19 |
| CRASH | 0 | **1** |
| TIMEOUT | 0 | 0 |
| wall time | 452s (and 420s on a second run) | **450s** |

**The 1.9x wall-time cost does not reproduce here.** #909 read 939s -> 1773s;
this machine reads 452s -> 450s, which is INSIDE the flag-off run-to-run spread
(420-452s). The difference between the two measurements is the environment --
#909's arms ran in the x86_64 container under emulation, this one runs native --
so the time cost is a property of that environment rather than of the IR path.
Worth knowing before anyone optimises against a 1.9x that native hardware does
not show.

**The memory cost is NOT environment-specific: `test.test_set` OOMs here too**
(`CRASH`, from `OK`). So of #909's two structural claims, the crash stands
unchanged and the slowdown needs re-measuring wherever it is going to be acted
on.

Seven modules differ, same machine, same tree -- six worse, one better:

| module | flag OFF | flag ON |
| --- | --- | --- |
| test.test_set | OK | **CRASH** (out of memory) |
| test.test_copy | OK | ERROR f=4 e=1 |
| test.test_global | OK | ERROR e=1 |
| test.test_traceback | OK | FAIL f=1 |
| test.test_codecs | ERROR f=25 e=52 | ERROR f=**26** e=52 |
| test.test_funcattrs | ERROR f=0 e=1 | ERROR f=**1** e=1 |
| test.test_contextlib_async | ERROR f=6 e=2 | ERROR f=6 e=**1** (better) |

`test.test_with` is no longer among them, which is this branch's fix seen on the
corpus rather than on one module.

**Three modules on #909's flag-on list are not IR divergences at all.**
`test_named_expressions`, `test_asyncgen` and `test___all__` appear as FAIL in
the flag-on run and fail IDENTICALLY flag-off, so they are pre-existing failures
that a one-arm reading picks up as though the flag caused them. The flag-on
board is only interpretable as a DIFF against a flag-off run of the same tree on
the same machine; the absolute counts carry the corpus's own failures along with
them. `test.test_math`'s TIMEOUT behaves the same way (it reads TIMEOUT in both
arms, or neither, depending on load).

## Progress — the flag-on `with` position stamp (2026-09-10)

The first item taken off the readiness queue the flag-on CPython board opened.
Not a coverage cut: no census row moves.

`test.test_with` was `OK` flag-off and `FAIL 1` flag-on, on
`NestedWith.testExceptionLocation`, with the signature
`AssertionError: 'self.Dummy()' != 'self.ExitRaises()'`. Reproduced locally
before touching anything -- one module, flag off `OK 1`, flag on `FAIL 1`.

**Cause.** CPython pins a raise out of `__init__` / `__enter__` / `__exit__` to
the CONTEXT MANAGER EXPRESSION, precisely so `with A(), B(), C():` says which one
failed. `___emitIRItem___:` stamps its own item at entry -- and then its block
emits **item N+1 recursively**, because that is how the nest is built. Item N's
handler and ensure block, which hold item N's three `__exit__` call sites, are
emitted *after* that recursion has re-stamped the builder with N+1's expression.
So `with ExitRaises(), Dummy() as d:` blamed `Dummy()`.

**Fix.** Stamp inside `___emitIRProtocolCall___:...at:`, not at the call site.
It cannot be done by the caller: building the argument array is itself emission
and re-stamps the builder before the method is entered. The stamp has to be the
last thing before the send it labels. `AsyncWithAst` inherits the method and so
the fix.

**Why the test case built for this missed it.** `WithItemPositionsTestCase`
already drove `with ExitRaises(), Dummy() as d:` -- and asserted only the LINE.
Both managers sit on one line, so `exit_raises_line` reads `[63, 63]` whichever
is blamed; the columns are the entire point of the file and only the INIT case
had them. `exit_raises_columns` and `enter_raises_columns` are now asserted,
measured from CPython (`[13, 25]`, `[13, 26]`). Verified by **positive control**:
with the emit fix reverted the new assertion fails on the flag-on arm and
nothing else new does, so the test has detection power and the fix is what fixes
it.

The fixture additions are appended at the TAIL on purpose -- three expectations
in that file encode ABSOLUTE line numbers, and an insertion mid-file silently
invalidates them (it did, in three tests, before being moved).

**Gates.** flag-off `6593 run, 6593 passed`; flag-on cold `6593, 1 error`
(`PrivateNameMangling` alone). Tier 2 flag-off reports two rows, NEITHER
attributable: this change is IR-emit code and `run_cpython_suite.sh` does not set
the flag, so it is unreachable in that run. Measured per module: `test_decimal`
reads fail+err 10 on this machine even run ALONE against a CI baseline of 9 -- an
unexplained platform delta, worth chasing rather than baselining, in the class of
the old `test_traceback` 14-vs-16 story; `test_urllib2_localnet` reads **9 alone**
and 10 in the full run, so it is suite-order-dependent.

## Where we are (2026-09-08, after cuts 74-75) — and a census caveat

Same stone, same denominators as the board in `CENSUS.md` (1592 stdlib
top-level defs, 4621 class-body methods; `./install.sh` first, so the
denominator is the whole corpus and not a set of cache hits).

Of the stdlib's 1592 top-level defs **1564 (98.2%)** compile through IR (was
1551, 97.4%); of its 4621 class-body methods **4541 (98.3%)** are built through
the seam (was 4539, 98.2%); of ALL 6417 defs **95.1%** go through IR (was
94.9%).  **The `nestedDef:reservedName` row is GONE from both stdlib tables**
-- it was the 13 + 2 these two cuts retired -- and nothing took its place: the
new `nestedDef:leafNameCollision` / `LambdaAst:leafNameCollision` rows have no
occurrence in the corpus.

What refuses a stdlib top-level def now, in full: classes defined in a def (6),
the deliberately frame-sensitive calls (`globals` 4, `dir` 4, `vars` 3, `exec`
1), PEP 695 type parameters (2), complex literals (2), and one each of
`stmt:MatchAst`, `Comprehension:async`, `nestedDef:kwonly`, `nestedDef:flow`,
`NameAst:super`, `AugAssignAst:target-NameAst`.  Class methods: method-local
classes (35), a rebound receiver (10, all `_pydecimal`), then the
frame-sensitive calls and single digits.  Coverage work is now
method-local classes and nothing else; the rest is frame-sensitive by design.

**The caveat, and it is why `CENSUS.md` was NOT regenerated.**  The report
script writes the WHOLE board from two corpora, and the corpus-2 scripts
(`census_tests_00..02.tpz`) **are not in the repository** -- `git ls-files
experiments/ir/` lists `census_stdlib.tpz` and nothing else, and no worktree on
this machine has them.  Re-splitting the 103-module manifest into three
sessions by hand would not reproduce the committed numbers even with no code
change: the report SUMS `byModule` across session files, so a stdlib module
pulled in by two sessions is counted twice, and a different split moves the
corpus-2 totals for reasons that have nothing to do with the cut.  Running
`census_report.py` with only corpus 1 present would overwrite the corpus-2
section outright.  So the stdlib half above was measured and is reported here;
`CENSUS.md`'s corpus-1 table is stale by exactly the `nestedDef:reservedName`
rows, and its corpus-2 table by `nestedDef:reservedName` (3 top-level, 4 class
methods) and `LambdaAst:reservedName` (1).  **Committing the three missing
scripts is the fix**, and whoever writes them should record the split they
used, since the board is only comparable across runs that share it.

## After merging main: the `with` protocol load, and what the flag-on residue is now

Merging main (45 commits: the vendored `_pydecimal`, the metaclass `with` /
`next` fix, and **a Python position map in every generated method**) needed
one IR change and re-ranked the residue.

**The change.** Main's metaclass fix moved the text's `with` from
`___pyAttrLoad___: #'__enter__'` to `___grailProtocolAttr___: #'__enter__'`
-- a miss must answer the raising DEFAULT rather than propagate
AttributeError, so `with Bare:` is CPython's "'Bare' object does not support
the context manager protocol" and not an AttributeError.  The IR emit still
said `___pyAttrLoad___:`, so under the flag that test failed
(`MetaclassWithAndNextTestCase>>testAClassWithNoMetaclassStillRefuses`, and
only under the flag).  `___emitIRProtocolCall___:on:args:builder:` now sends
what the text sends.  This is the emit rule doing its job in the other
direction: when the TEXT changes, the IR twin has to follow, and the flag-on
sweep is what says so.

**The residue is now one cause.** Flag-on cold sweep on the merged tree:
`6531 run, 6518 passed, 12 failed, 1 errors`, every shard reporting, zero
memory notifications.  All thirteen are the same thing -- an IR method
carries no position map:

  * the PEP 657 span family (`RaiseSpanTestCase`, `SpanEndTokenTestCase`,
    `LambdaFrameTestCase`, `TracebackTestCase>>testForLoopExceptionPositions`,
    `WithItemPositionsTestCase` x3);
  * main's two new `PythonOffsetMapTestCase` tests, which measure exactly the
    table an IR method lacks;
  * the two generated-TEXT introspections
    (`LiveFrameProbeResilienceTestCase>>testTheTempsFastPathNeedsNoSource`,
    `ImportlibTestCase>>testInstanceMethodNoOuterBlock`) and
    `FrameReceiverSuggestionTestCase`, which read Smalltalk source an IR
    method does not have;
  * `[ERROR] PrivateNameManglingTestCase>>testPrivateNameMangling`, the
    recursion-guard byte budget.

So the next non-coverage cut is well defined, and main just built the half
that was missing.  The text stores its map as a trailing comment in the
method source: six SmallIntegers per node (Smalltalk start and end offset,
then the Python line, column, end line and end column), and
`BaseException class>>___mapSpanForMethod___:ip:` turns an ip into a span
with `_previousStepPointForIp:` + `_sourceOffsetsAt:` and an
innermost-containing-range search.  An IR method needs no Smalltalk-offset
half at all: the builder stamps every node with its PYTHON offset already
(`aBuilder at: <position>`), so the same two primitives answer a Python
offset directly, and what is missing is only offset -> span.  The IR twin is
therefore a per-method table the builder fills as it stamps, plus a branch in
`___mapSpanForMethod___:ip:` -- not a new mechanism.

## Progress — cut 73 (the position map for IR frames)

Retires fourteen of the fifteen flag-on residue items, which were all one cause:
an IR method carried no position map, so a frame could report a line but never
columns.

**The half that did not need building.** A text-compiled method needs two hops
-- ip to Smalltalk offset, then Smalltalk offset to Python node -- and only the
second is knowable at emit time, which is why `PrettyWriteStream` records it.
An IR method needs no Smalltalk hop at all. `PyMethodIRBuilder>>stamp:` already
writes each node's PYTHON offset onto its IR node, and GemStone keeps one source
offset per step point inside the method (`_numSourceOffsets` /
`_sourceOffsetsAt:`), so `_previousStepPointForIp:` + `_sourceOffsetsAt:` answer
a Python offset directly. Measured on `nested_operand_span.py`: 17 IR methods,
99 step points, 82 of them carrying a distinct stamped offset and exactly one
per method reading offset 1 (the prologue, which has no Python node behind it).

So the only thing missing was offset -> span, and the reader needs no new
parsing: `___mapSpanForMethod___:ip:` reads the same `"___GRAILPOS___ ..."`
trailing comment, byte for byte, in whichever coordinate system the method was
built in. One reader, two paths.

**Why the map records a RANGE and not a start.** An offset alone cannot name a
node, because nested nodes routinely share a `beginPosition`. Dumping the step
points of `return [(1, 2 + 1 / 0)][0]`:

| step | offset | source there |
| ---: | ---: | --- |
| 2 | 119 | `1 / 0` |
| 3 | 115 | `2 + 1 / 0` |
| 4 | 111 | `(1, 2 + 1 / 0)` |
| 5, 6 | 110 | `[(1, 2 + 1 / 0)]` **and** the subscript |
| 7 | 103 | `return ...` |

Steps 5 and 6 are different operations at the same offset. Recording each node's
extent and taking the smallest containing range is what separates them -- the
rule main's reader already applies, arrived at independently from the same
constraint.

**Three things that had to be got right, each found by a test rather than by
reading.**

*An entry earns its place only if a send can land in it.* The text map tests the
generated text (`sendFreeFrom:to:`); the IR map reaches the same rule
structurally -- `atNode:` only ARMS an entry and `stamp:` commits it when the
node it stamps is a send. It matters more here, because resolution is by
smallest range: the literal `1` in `1 / 0` is one character wide, so recording it
won every lookup the division should have won and every traceback underlined
`1`. Measured exactly that way before the commit was made conditional.

*A compound node must not stamp where its leading child stamps.* `_bad +
(_other)` and `_bad` begin at the same character, so both step points reported
the same offset and the narrower operand won. The text path never had this
problem: its step point lands on the SELECTOR, which for `a ___binOpAdd___: b`
sits between the operands. `___irStampChild___` puts the IR stamp in the same
place -- just past the leading child -- while the recorded range stays the
node's own. Six overrides (BinOp, Compare, BoolOp, Subscript, Attribute, Call)
and a nil default; no call site changed.

*The stamp must be the LAST thing before the send it labels.* Two emitters set
it and then built their arguments, and each argument's own emit overwrote it:
`assert x > 0, 'must be positive'` underlined the MESSAGE, and `_boom(lambda: 1 +
1)` gave the calling frame the LAMBDA's span. Both now stamp immediately before
the send. This is the one rule a new emitter can get wrong silently, so it is
stated in `stamp:`.

**Two guards carried over from the text path, for the same reasons.** Nodes
parsed from an f-string replacement field claim line 1 column 1
(`___markFragmentPositions___`) and are neither recorded nor stamped -- a line-1
range would nest inside the true one and win, blaming line 1 of the file. And
asking a node for its columns can RAISE: `column`/`endColumn` scan the module
source backwards, and linecache's module body and one nested `__init__` both
failed there. Unguarded that is worse than imprecision, because an IR compile
that raises is a silent fallback to text -- it cost 2 of 818 smoke defs before
the guard went in. Every other reader of those accessors guards them the same
way.

**One test changed rather than one behaviour.**
`NestedOperandSpanTestCase>>testAMultiLineExpressionKeepsTheStatementsLine`
asserts a documented coarseness: a multi-line expression keeps the statement's
line. That coarseness is a property of recovering the line by SCANNING for a
per-statement `___curPos___` store -- the store is the statement's, so the line
is. An IR method has no store and no scan, so its frame was already on the
operand's line before any map existed, and the map only gives it columns that
agree. The test now asks the module which path built it and expects CPython's
answer on the IR path. This cut changed no line on either path; the live-frame
-chain hazard the guard exists for is untouched.

**The one residue item left, by name.**
`TracebackTestCase>>testForLoopExceptionPositions` / `tuple_target_span`. `for
a, b in LateBreak():` inside a `try`: the catching frame's ip resolves to the
try's own `on:do:` step point (offset 239, the `for` keyword), which no map
entry covers, so it gets no columns. The text path wins this one differently --
it reads the RUNTIME `___curPos___` value, not an ip -- and main's
`___refineCatcherPos___:span:` supplies a catcher's columns from the protected
block's span. That path is not yet wired for IR blocks, which is the next cut,
not a defect in this one. Stamping the loop's outer `on:do:` sends at the
iterable (which they should be anyway, since an iterator-protocol raise belongs
to the iterator expression) was necessary but not sufficient.

**Gates.** Flag-off 6535 run / 6535 passed. Smoke tripwire 4/4 with 818
compiled and 0 fallbacks. Span classes under the flag: NestedOperandSpan 2/2,
RaiseSpan 1/1, SpanEndToken 1/1, PythonOffsetMap 4/4, WithItemPositions 7/7,
LambdaFrame 1/1, PrivateNameMangling 1/1, ShortCircuitOperandSpan 1/1.

**An operational note that cost a gate.** Main's PR #876 took the suite from
four shards to eight, so one `run_tests.sh` now opens eight GemStone sessions.
Two worktrees on one stone need sixteen and exceed its limit: three shards died
with "Login failed: the maximum number of users are already logged in" and the
runner still printed a well-formed `4288 run, 4288 passed, 0 failed`. A suite
line is only a gate result if `grep -h GRAIL_SHARD_RESULT out/shard_*.out | wc
-l` is 8. The lanes must serialize their suite runs.

## Reconciling cut 73 with PR #878 (the text lane's line refinement)

#878 landed while cut 73 was in flight and moved the text path in the same
area: a frame's LINE now comes from the position map, not only its columns. Two
things had to change here, and one thing deliberately did not.

**The `onLine:` filter is gone.** Cut 73 filtered the IR map lookup to the caret
scan's line, so that a span could never disagree with the line the frame
reported. That was right while the map refined columns only. Once the LINE also
came from the map, filtering on the caret line would have restricted the span to
a line the frame no longer claims to be on, and the caller's `span line = frame
line` gate would have thrown the columns away. `___irPythonSpanForMethod___`
now takes the map's own line, so it agrees with `___tracebackLineForMethod___`
by construction. That also restores `___mapSpanForMethod___:ip:` to main's exact
form.

**The footprint on shared text code is now three lines** — the dispatch in
`___pythonSpanForMethod___:ip:`, which mirrors the one main already has in
`___pythonLineForMethod___:ip:`. Everything else the IR path adds is new
IR-only methods. The two lanes read one map FORMAT and one parser, and keep
their policy apart.

**What did not change: the IR line stays send-granular.** #878's new control
`testALiveFrameKeepsTheStatementsLine` fails under the flag, and a control run
says it did so BEFORE cut 73:

| test, flag on | origin/main (has #878, not cut 73) | with cut 73 |
| --- | --- | --- |
| `testANestedOperandIsBlamedForItsOwnRaise` | FAIL | PASS |
| `testALiveFrameKeepsTheStatementsLine` | FAIL | FAIL |

So cut 73 fixes one and does not cause the other. The failing one asserts that a
LIVE frame keeps the coarse statement line. The text path gets that coarseness
free, because its `___curPos___` scan is statement-granular; the IR path is
send-granular by construction, which is the point of compiling Python straight
to IR — every IR node carries the offset of the AST node it came from, so a
frame names the SEND in flight rather than the statement containing it.

Coarsening the IR line to the statement was tried and reverted. It would buy
this one test by discarding the property the whole approach exists to provide.

**The root cause is not a position at all.** #878's own analysis names it:
`traceback.walk_stack` answers a LIST here and a generator in CPython, so when
the stack is read the frame is suspended at `walk_stack(` in Grail and at
`extract(` in CPython — two lines of one statement. A statement-granular line
hides that; an exact one reports it. #878 records making `walk_stack` a
generator as the fix and defers it as its own change. That is the text lane's
call and its file (`src/python/stdlib/traceback.py`), so it is not taken here.
Until it is, this is a known IR-path divergence with a named cause, not an open
defect in the map.

## The census is reproducible again — and corpus 2 was overstated

`census_tests_00..02.tpz` had never been committed. Only `census_stdlib.tpz`
was, and `census_report.py` writes the WHOLE board from both corpora, so nobody
could regenerate `CENSUS.md` without replacing its corpus-2 half with nothing.
The migration's own progress metric was unreproducible.

The three scripts now exist and **read `scripts/cpython_suite_manifest.txt` at
run time**, round-robin, so adding a module to the manifest needs no edit here
and no split has to be remembered. Three sessions because one cannot hold the
manifest: every module compiles itself and every stdlib module it imports, and
nothing is released.

**Fixing it exposed a real error in the committed numbers.** Each session
compiles the stdlib its own modules pull in, so a module reached from two shards
was measured in both, and the report SUMMED the session totals. Measured: of the
220 modules the test corpus touches, **83 are reached from more than one shard**,
and summing inflates the corpus **1.47x**. The report now builds its totals from
the per-module rows, taking each module once.

So corpus 2 moves, and it moves DOWN, because the duplicated modules were stdlib
(high IR coverage) and were over-weighting the average:

| corpus 2 | old board (summed) | now (deduplicated) |
| --- | ---: | ---: |
| top-level defs | 2809 | **1327** |
| class-body methods | 14132 | **10942** |
| class methods IR-eligible | 77.7% | **71.7%** |
| all defs through IR | 79.7% | **73.5%** |

Corpus 1 is unaffected (one session, nothing to deduplicate) and is confirmed
exactly by two independent measurements: 1592 top-level defs, 1564 compiled
(98.2%), 4621 class methods, 4541 eligible, 95.1% of all 6417 defs.

**Two controls, because a number that moves this much needs them.**

* The report asserts that the single-session corpus reconstructs exactly from
  its per-module rows. If importlib ever records a count without a module, or
  under a different key, the report stops rather than quietly reporting a wrong
  total.
* The claim that the split does not matter was checked by running a DIFFERENT
  one: a two-shard contiguous split against the three-shard round-robin. Ignoring
  the example column, the two boards are identical — 162 lines, zero differences.
  Row order is now sorted by (count, reason) so ties cannot drift either.

The example names beside each reason remain split-dependent, and the board now
says so: importlib keeps the first five it sees per reason per session, so which
five arrive depends on compile order. They illustrate a reason; they never
enumerate it.
## Progress — cut 76 (the method-local class, as a compiled-text helper)

`stmt:ClassDefAst` — a `class` statement inside a def — was the largest
remaining coverage refusal: 6 stdlib top-level defs and 3 stdlib class methods,
and **963 class methods in the CPython-suite corpus**, where it was the biggest
single blocker after `method:classNotAtModuleScope`.

**What the text emits** (GRAIL_CODEGEN_TRACE_DIR on `plain()`, `make(n)`,
`with_if(flag)` and the methods `Host.build(self)` / `Host.build2(self, tag)`).
`ClassDefAst>>printSmalltalkOn:` is `printSmalltalkRuntimeOn:` for every scope,
module or not, and inside a def it inlines ~30 statements into the enclosing
method:

    Simple := (PythonInstance) @env1:___subclass___: #'Simple' instVarNames: #( ) classInstVarNames: #( __doc__ __module__ ___dynInstVars___ ).
    Simple ___compileMethod: '___pyDefinedClass___ ^ true' category: 'Grail-Slots'.
    (Simple ___pyInheritsStrictSlots___) ifTrue: [Simple ___compileMethod: '___pySlotsStrict___ ^ false' category: 'Grail-Slots'.].
    Simple ___compileMethod: '<one method source per def>' category: 'Grail-Class Methods'.
    Simple @env0:class ___compileMethod: '<accessor pair / table>' category: 'Grail-Class Attrs'.
    Simple @env1:___grailBeginClassBuild___.  Simple @env1:___grailPrepareNamespace___: nil.
    Simple __doc__: (Simple @env1:___grailNsStore___: '__doc__' value: ((None))).
    Simple @env1:___grailNsBind___: '<name>'.        "one per def"
    Simple __module__: '<module>'.
    Simple ___dynInstVars___ == nil ifTrue: [Simple ___dynInstVars___: (Object @env0:new)].
    Simple @env1:___classHolderAttrStore___: #'___qualname___' put: 'plain.<locals>.Simple'.
    Simple @env1:___pyAttrStore___: #'___cell_n___' put: [n].       "one per captured local"
    Simple := Simple @env1:___pyClassDefined___: { ... }.
    Simple @env1:___grailInitSubclass___: nil.
    Simple := Simple @env1:___grailDispatchMetaclass___.

**What the IR emits — and why it is not a transcription.**  Every other cut
reproduces the text's sends as IR nodes.  This one deliberately does not, and
the reason is the size and the shape of the producer rather than of the output:
`printSmalltalkRuntimeOn:` is ~2400 lines of branches (slots, dataclasses,
metaclass hooks, decorators, aliases, property pairs, conditional defs, the
five class-side tables), and almost every ARGUMENT it emits is a STRING LITERAL
holding a whole method's source.  An IR twin would be a second copy of those
2400 lines, free to drift from the original, for output that is mostly literals
— exactly the failure the emit rule exists to prevent, arrived at from the
other end.

So the class statement travels as **compiled text**, the way a class-body
method already does on both paths (`<cls> ___compileMethod: '<source>'`, and
cut 36's `importlib ___irInstallDef: <id> on: <cls> or: '<source>'`, whose
fallback carrier is the same text).  `ClassDefAst>>___emitIRStatementOn___:`

* generates the class emit's own text — `printSmalltalkOn:` on a fresh stream,
  called at the point in the IR build where the compile context
  (`functionBeingCompiled`, the scope stack, `classBeingCompiled`,
  `moduleClassBeingCompiled`) is exactly what the text path would have
  generated it under, so the text is the text path's, character for character;
* wraps it in a private unary method — `| <ClassVar> <class-body helper temps> |`,
  the emit, `^ <ClassVar>` — and compiles it with
  `compileMethod:dictionaries:category:environmentId: 1` onto
  **`aBuilder targetClass`, the very class the enclosing method is being built
  on**;
* emits one IR statement: `<ClassVar> := self ___irClassDef_<offset>_<Name>___`.

The receiver is `self` and the helper lives on the enclosing method's own
class, which is the whole trick: `self` means inside the helper exactly what it
means in the enclosing method — the module instance for a top-level def, the
Python receiver for a class-body method, the metaclass for a @classmethod — so
every `self`-relative resolution in the generated text (a module attribute
load, `self.x` in a base expression, `(<Mod> ___instance___)` in method mode)
is unchanged, and ONE shape covers both seams.

**Three things the helper must not do**, each of which decided a rule:

* **It must not look like a Python frame.**  `PyFrame class>>___namesIncludeCodegenMarker___:`
  recognises a Grail-generated frame by the temp name `___curPos___`, so a
  helper that declared one would put a phantom entry in every traceback through
  it.  The class emit does not store `___curPos___` for the admitted shapes
  (measured: the only stores in a dumped module are the ENCLOSING statement's
  and the ones inside each method's own source literal), so the helper declares
  none — and if a shape ever needed one, the reference is an undeclared
  identifier and the compile fails, which is a fallback to text, not a wrong
  traceback.  `___irClassBodyStatementsAreSimple___` keeps out the class bodies
  that WOULD need it: control flow in a class body (`if`, `for`, `try`, `with`,
  `del`, augmented assignment) falls through to the ordinary statement
  emitters, which do stamp `___curPos___`.
* **It must not register the class body's defs for a deferred IR build.**
  `___irEmitClassBodyAsTextDo___:` turns cut 36's seam off for the duration
  (`importlib ___irClassSeamEnabled___`), so the body's defs come out as the
  plain `___compileMethod:` statements the flag-off path emits.  Registering
  them would register a class-body method's defs TWICE — its text twin is
  generated anyway, as its own install statement's fallback literal — and
  either way the entries would be waiting for a statement that runs, if at all,
  long after `___irPurgeDefTableForModule___:` has dropped them (a method-local
  class is built on every CALL of its enclosing def, not once at module load).
  The inner class's own methods are therefore text, exactly as flag-off, and
  are a later cut.
* **It must not carry the class's extent into the position map.**  The stamp is
  `at: beginPosition`, not `atNode:`: a class statement's extent is its whole
  suite, so a map entry would put carets under every line of the class body for
  anything raised while the class is built.  With no entry the reader falls
  through to the line-only answer, which is **the line CPython names for this
  frame** — measured on a class whose body divides by zero, CPython reports the
  `class Bad:` line for the enclosing function's frame (and adds a `Bad` frame
  Grail has on neither path), where the TEXT path reports the failing
  class-body line.  So flag-on is closer here than flag-off.

**Eligibility** (`___irMethodLocalClassReason___:`, each exit a census
`classDef:...` row): no decorators (`classDef:decorated`), no class keywords /
metaclass (`classDef:keywords`), no PEP 695 type parameters
(`classDef:typeParams`), not inside an exec/eval doit (`classDef:doit`), a
module class in context (`classDef:noModule`), the class name not `global`-bound
to the module (`classDef:moduleScopeTarget`), no `global` / `nonlocal` at the
top of the class body (`classDef:outerBinding`), no class-body walrus
(`classDef:walrus`), only declarative body statements
(`classDef:bodyStatement`), and — the one that matters — **no capture of an
enclosing local** (`classDef:capturesLocal`).  The helper is unary: a name the
class statement reads out of the enclosing def's frame (which the text turns
into a `___pyAttrStore___: #'___cell_x___' put: [x]` closure cell, by
REFERENCE) is simply not reachable there.  A locally-defined BASE CLASS is a
capture too, by the same rule.

The capture set is computed twice and unioned, which is not belt and braces but
a measured hole.  The first pass is the parser's own sets — `body reads` (the
class scope's mention set, accumulated outward at popScope so a name only a
deeper method mentions is still free here) minus `body variables` and
`body globalNames`, intersected with the enclosing locals — the same inputs
`CallAst>>___freeVariableNamesFor___:` uses.  **An f-string replacement field
is parsed by a CHILD parser, so a name mentioned only inside one never reaches
that set**: `typing.NewType.__mro_entries__` reads `superclass_name` only from
an f-string in a nested `__init_subclass__`, and the helper compiled against an
undefined symbol — a safe fallback, but a fallback and not a refusal, and the
one fallback in a 6098-def stdlib census.  So a second, syntactic pass adds
every load in the subtree that names an enclosing local and is not bound by any
scope inside the class.  It over-approximates in the safe direction and cannot
under-approximate the f-string case, which is what it is for.

**Census walk.**  `___irWalksChildrenForRefusal___` (new on AbstractNode, false
only on ClassDefAst) stops the first-refusing-child walk at a class statement:
nothing under it is judged as IR at all, so a node inside it that the IR path
happens not to handle is not why the class refused.

**Fixture**: `mlc_plain` (name / qualname / module), `mlc_fresh` (a distinct
class object per execution), `mlc_attrs` (docstring + class attributes),
`mlc_methods` (`__init__`, instance state, two methods), `mlc_based` (a
module-level base, raised and caught), `mlc_slots`, `mlc_decorated_members`
(@staticmethod / @classmethod / @property inside the local class),
`mlc_nested_class`, `mlc_in_branch` (a class per branch of an `if`),
`mlc_in_loop`, `mlc_body_error` (a class-body ZeroDivisionError caught by the
enclosing def), `mlc_after` (the statement after the class still runs), and
`Mlcer.build` / `Mlcer.counted` — a class defined inside a class METHOD, which
is the corpus's dominant shape.  Two NEGATIVE CONTROLS stay on text and are
excluded from the compiled count: `mlc_captures` (reads an enclosing parameter)
and `mlc_two_classes` (its base class is a local of the same def, and its
`super()` therefore exercises the text path).  Compiled 465 -> 480, 0
fallbacks, RESULTS true with the flag on and off.

**Two things the transport costs, both recorded rather than hidden.**  For a
class inside a class-body METHOD the class emit runs TWICE -- the method's text
twin is generated anyway (it is the fallback literal of its own
`___irInstallDef:` statement) and the helper generates it again -- which is
compile-time string work, not a second class.  It also double-counted the inner
class's methods in the census: 326 phantom `cm:method:classNotAtModuleScope`
rows over fourteen test modules, which moves the DENOMINATOR and so every share
on the board.  `importlib ___irClassEmitIsForTransport___` now turns the census
off for the transport emit as well as the seam.

Gates (both from wt/d on gs40, through `scripts/with_stone_lock.sh`; 8 of 8
shards reporting, no "Login failed", per-shard counts summing to the suite
line):

* flag-off `6551 run, 6551 passed, 0 failed, 0 errors`;
* flag-on cold sweep `6551 run, 6545 passed, 5 failed, 1 errors` -- the SAME
  six as main, no new name: `TracebackTestCase>>testForLoopExceptionPositions`
  (`tuple_target_span`), `FrameReceiverSuggestionTestCase>>testASuggestionMayNameTheReceiver`,
  `ImportlibTestCase>>testInstanceMethodNoOuterBlock`,
  `LiveFrameProbeResilienceTestCase>>testTheTempsFastPathNeedsNoSource`,
  `NestedOperandSpanTestCase>>testALiveFrameKeepsTheStatementsLine`, and the
  `[ERROR] PrivateNameManglingTestCase>>testPrivateNameMangling` recursion-guard
  flap.

**Census.**  Stdlib corpus (`experiments/ir/census_stdlib.tpz`, 125 imports,
`./install.sh` first): 1565 / 1592 top-level defs (98.3%, was 1564) and 4541 /
4621 class methods (98.3%, was 4539), 6098 compiled with **0 fallbacks**.
`stmt:ClassDefAst` is gone from both stdlib tables; what replaced it is
`classDef:capturesLocal` 5 + `cm:classDef:capturesLocal` 3, so five of the six
stdlib top-level defs and all three stdlib class methods that a class statement
blocked capture an enclosing local.  The stdlib was never where this refusal
lived.

The CPython-suite corpus is, and it was measured as a MATCHED PAIR on one
stone: fourteen test modules (`test.test_math`, `test_enum`, `test_heapq`,
`test_operator`, `test_builtin`, `test_collections`, `test_functools`,
`test_itertools`, `test_super`, `test_property`, `test_scope`, `test_listcomps`,
`test_dict`, `test_set`) plus everything they import, run twice with
`./install.sh` immediately before each -- once with
`ClassDefAst>>___irEligibleStatementLocals___:` forced to `false`, once as
landed:

| | before | after |
| --- | ---: | ---: |
| top-level defs compiled | 795 / 821 (96.8%) | **797 / 821 (97.1%)** |
| class methods eligible | 2716 / 4103 (66.2%) | **2957 / 4102 (72.1%)** |

**+241 class methods**, and the `stmt:ClassDefAst` row is gone.  What is left of
it: `cm:classDef:capturesLocal` 140, `cm:classDef:decorated` 22,
`cm:classDef:keywords` 14, `cm:classDef:bodyStatement` 2,
`cm:classDef:outerBinding` 1.  So the next cut in this family is unambiguous --
**the captured enclosing local**, 140 of the 179 remaining refusals here and 8
of 8 in the stdlib.  It needs the helper to stop being unary: the captured
values become arguments, which is sound exactly when the enclosing binding
cannot change after the class statement (the text's cell is by REFERENCE), so
the rule is a parameter never reassigned or deleted, or a body local assigned
once.  `classDef:decorated` and `classDef:keywords` are separate, smaller cuts:
both evaluate an expression in the enclosing scope, which is the same
marshalling problem.

**Two capture-detection holes were found by the census's fallback log**, both
worth recording because a missed capture is a compile failure and so a silent
fallback rather than a wrong answer:

* `typing.NewType.__mro_entries__` -- a name read only from inside an f-string,
  which the parser's `reads` set never sees (the child parser);
* `test.test_scope.ScopeTests.testFreeVarInMethod` -- a local whose name a
  class-body def also binds, where a method-body read is still a capture
  because Python skips class scope.

The second pass described above answers both, and the census's fallback count
went 1 -> 0 in each corpus.  The lesson generalises: **when eligibility is
decided from the parser's scope sets, a scope Python treats specially (a class
body) and a scope the parser does not model (an f-string) are the two places to
check**, and the instrument that finds them is the fallback log, not the tests.

## Progress — cut 77 (a method-local class that captures)

Cut 76's one real refusal was `classDef:capturesLocal`, 140 of the 179
remaining class-method refusals in the fourteen-module test subset and 8 of 8
in the stdlib.  Two of the three kinds of capture can be carried; the third is
what is left, and it is now measured rather than guessed.

* **The enclosing RECEIVER needs no marshalling at all.**  The text names it
  Smalltalk `self` everywhere in the class emit, cell store included
  (`R ___pyAttrStore___: #'___cell_self___' put: [self]`), and cut 76's helper
  is installed on the same class -- so `self` means the same object there and
  the text compiles unchanged.  Cut 76 refused these for nothing.  Measured on
  a class whose body method reads the enclosing `self` past a differently-named
  receiver (`def get(inner): return self.v`).
* **An enclosing PARAMETER the def never assigns and never deletes is carried
  BY VALUE.**  Such a name binds once per call and cannot change afterwards, so
  a value is observationally identical to the text's by-reference cell block.
  The helper stops being unary: the values arrive as one Array
  (`___irCaptured___`) in sorted order and are bound to temps spelled the way
  the class emit names them in the ENCLOSING scope
  (`___enclosingScopeIdentifierFor___:`, which is the `_self` transport
  identifier for a pseudo-variable parameter and the plain name otherwise), so
  every read the emit makes -- the cell block `[tag]`, a class attribute's
  value expression, a base-class expression -- resolves to the temp.  The
  argument array is built BEFORE the position stamp, because each captured read
  re-stamps the builder (cut 73's rule).
* **A BODY LOCAL, or a reassigned parameter, still refuses.**  The text's cell
  is a block, so a later rebinding is visible through it -- CPython's cell
  semantics -- and a loop rebinds under the class's feet.  `mlc_cap_reassigned`
  is the negative control: the def does `x = x + 1` after the class statement
  and both CPython and the text answer the NEW value, which a carried value
  would freeze.

One correctness gap found while drawing the line: a `nonlocal` anywhere below
the class (in a body method, not just at class-body level) makes the text emit
a SETTER cell, `___cellSetter_x___ put: [:v | x := v]`, which writes the
enclosing frame's temp.  No marshalling reaches that frame, so
`classDef:nonlocalBelow` refuses it -- 9 class methods and 1 top-level def in
the test subset, previously inside the `capturesLocal` count.

Two more traps, both of which would have been silent:

* **Eligibility cannot read `CallAst functionBeingCompiled`.**  The seam asks
  `___irEligible___` BEFORE `___installIRMethodOn___:` sets that static, so at
  eligibility time it is nil (or an outer def) and every capture looked
  uncarried -- the cut measured as a no-op until the enclosing def came from
  the PARENT CHAIN instead, which answers the same node at both moments.
* **The census's denominator moved, in both directions.**  A class inside a
  class-body METHOD is emitted twice (the method's text twin is generated
  anyway), so the inner class's methods were tallied twice: +326 phantom
  `cm:method:classNotAtModuleScope` rows over fourteen modules.  Suppressing
  the tally for every transport emit then made a MODULE-level def's inner
  methods vanish, because there the transport is the only emit.  The census
  flag is therefore set only in method mode
  (`ClassDefAst>>___irEmitClassBodyAsTextDo___:`), separately from the seam
  flag, and the cut-76 numbers above were re-measured with it right.

**Census.**  Stdlib: unchanged at 1565 / 1592 top-level defs and 4541 / 4621
class methods, 6098 compiled, 0 fallbacks -- all eight stdlib captures are body
locals (`collections.namedtuple`, `typing._nt_base`, `pydoc._start_server`,
`pydoc._url_handler`, `jinja2.runtime.make_logging_undefined`,
`typing.NewType.__mro_entries__`, `pydoc.HTMLDoc.docclass`,
`pydoc.TextDoc.docclass`).  Test subset (same fourteen modules, `./install.sh`
first): class methods 2957 -> **2960 / 4103**, top-level defs unchanged at 797
/ 821, and `cm:classDef:capturesLocal` 140 -> 128 with 9 of the difference
reclassified as `nonlocalBelow`.

**So this cut is small, and the number says why**: real code captures BODY
LOCALS, not parameters -- `calls = []` and then a class whose method appends to
it is the archetypal test-corpus shape.  Carrying those needs the by-REFERENCE
cell, which the helper can only get by being handed the enclosing frame's own
block: the reader `[calls]` built in the IR method and the cell store rewritten
to `put: [<arg> value]` through `___enclosingScopeIdentifierFor___:`, which is
the one hook the text already routes every cell store through.  That is sound
only when the name is read NOWHERE but inside the body's methods (a class-body
value expression or a base would see the block, not the value), which is
checkable.  It is the next cut, and it is worth 128 of the 179 refusals here.

Gates (both from wt/d on gs40 through `scripts/with_stone_lock.sh`, 8 of 8
shards reporting, no "Login failed", per-shard counts summing to the suite
line): flag-off `6551 run, 6551 passed, 0 failed, 0 errors`; flag-on cold sweep
`6551 run, 6545 passed, 5 failed, 1 errors` -- the same six as main, no new
name.

Fixture: mlc_cap_attr (a captured parameter read at class-body level AND from a
method), mlc_cap_base (the base class is a parameter, with `super()`),
mlc_cap_two, mlc_cap_default, mlc_cap_pseudo (`self` and `nil` parameters, the
transport spelling), MlcerCap.from_receiver / from_body / from_param (the
enclosing receiver, alone and with a parameter), and mlc_cap_reassigned as the
negative control.  Compiled 480 -> 492, 0 fallbacks, RESULTS true with the flag
on and off and under CPython 3.14.6.

## Progress — cut 78 (the captured local, carried BY REFERENCE)

Cut 77 carried a capture by VALUE and so could only carry a name that cannot
change -- an unassigned parameter -- which measured as +3 class methods,
because real code captures BODY LOCALS.  This cut carries all of them, and the
mechanism is one hook the text already routes every cell store through.

**How.**  The helper is handed the enclosing frame's own zero-argument READER
BLOCK for each captured name, `[x]`, built in the IR method (`inBlockDo:` over
`var: (leafFor: #x)` -- bare, no unbound guard, which is what the text's `[x]`
compiles to).  Each gets two temps in the helper, and they answer different
questions:

* `___irCell_<i>___` holds the block, and the class's cell BODY calls it --
  `Cap ___pyAttrStore___: #'___cell_x___' put: [___irCell_1___ @env0:value]` --
  so a method-body read sees what the enclosing binding holds AT READ TIME.
  That is by reference through one more level of indirection, and it is
  CPython's cell semantics and the text's alike.
* the enclosing-scope IDENTIFIER temp holds the value the block answers NOW,
  for the reads the class emit makes EAGERLY at class-creation time: a base
  expression, a class attribute's value, a method's def-time default.  That is
  exactly when the text evaluates those too, and the read is unguarded on both
  sides, so an unbound binding answers nil rather than raising -- again what
  the text does.

The only new seam is `ClassDefAst>>___cellReaderSourceFor___:`, which answers
the cell reader's body: normally `___enclosingScopeIdentifierFor___:`'s answer
(the text's own), and the `___irCell_<i>___ @env0:value` form while a
captured-name -> index map is in place (`___irWithCaptureCellMap___:do:`, set
only around the transport emit).  `___enclosingScopeIdentifierFor___:` itself
is untouched, because the helper's own temp declarations need its plain answer.

**Why the SETTER cell cannot go the same way**, and so why
`classDef:nonlocalBelow` stays: the setter's identifier is emitted as an
assignment TARGET (`x := ___cellSetVal___`), and no block call can be one.  10
defs / class methods in the test subset.

**What the shapes prove.**  Every fixture entry here is a DIFFERENT value under
by-value marshalling, which is the point of choosing them:

* `mlc_loop_classes(3)` -> `[2, 2, 2]` -- three classes made in a loop, each
  reading the loop variable, all seeing its FINAL value.  This is Python's
  famous late-binding closure result, and by-value would have given
  `[0, 1, 2]`.
* `mlc_late_bound()` -> `7` -- the class is built and instantiated BEFORE the
  captured name is ever bound; by-value would have frozen nil.
* `mlc_rebound()` -> `[2, 3]` -- the def rebinds the captured list after the
  class statement (cut 77's negative control `mlc_cap_reassigned`, now
  carried, is the scalar twin: `(2, 2)`).
* `mlc_mutated()` -> `(1, 3, [1, 9, 1])` -- interleaved mutation from inside
  and outside the class.
* `mlc_body_and_cell(5)` -> `(5, 5)` -- the SAME name read both eagerly (a
  class attribute) and lazily (a method body), which is what the two temps are
  for.
* `mlc_two_levels(9)` -> `9` -- a class inside a NESTED def, capturing the
  outer def's parameter across the closure block.

**Census.**  Stdlib (125 imports, `./install.sh` first): **1570 / 1592
top-level defs (98.62%)**, was 1565; **4544 / 4621 class methods (98.33%)**,
was 4541; 6106 compiled, **0 fallbacks**.  The `classDef:*` rows are GONE from
the stdlib board outright -- what refuses a stdlib top-level def now is only
the deliberately frame-sensitive calls (`globals` 4, `dir` 4, `vars` 3, `exec`
1), PEP 695 type parameters (2), complex literals (2), and one each of
`stmt:MatchAst`, `Comprehension:async`, `nestedDef:kwonly`, `nestedDef:flow`,
`NameAst:super`, `AugAssignAst:target-NameAst`.

Test subset (the same fourteen modules, matched against the same before-run):

| | before cuts 76-78 | after |
| --- | ---: | ---: |
| top-level defs compiled | 795 / 821 (96.8%) | **801 / 821 (97.6%)** |
| class methods eligible | 2716 / 4103 (66.2%) | **3071 / 4103 (74.8%)** |

**+355 class methods and +6 top-level defs** over the three cuts.

**WHICH class methods, because the number invites the wrong reading.**  They
are the ENCLOSING class-body methods -- `test.test_math.MathTests.testCeil` and
its 350-odd siblings, methods of MODULE-LEVEL classes whose BODIES contain a
`class` statement.  Those refused with `cm:stmt:ClassDefAst` and now compile
through cut 36's seam like any other method.  The INNER class's own methods do
NOT go through IR and this cut does not claim they do: they are refused by
`___irMethodModeReason___`'s module-scope test as `cm:method:classNotAtModuleScope`,
and that row reads **842 in both halves of the matched pair** -- it did not move
by one.  Retiring it is a separate cut, and a harder one (see the def-table
lifetime note in cut 76: a method-local class is rebuilt on every CALL of its
enclosing def, long after `___irPurgeDefTableForModule___:` has run).

The row-by-row account, so the total is checkable rather than asserted.  Gone:
`cm:shape:ClassDefAst` 347 and `cm:classDef:capturesLocal` 60 = 407.  Grown
within the family: keywords +10, nonlocalBelow +9, decorated +2, bodyStatement
+2 = +23, so the family shrank by 384.  Of those 384, **29 did not become
eligible but simply reported their NEXT blocker** -- refusal is
first-reason-wins, and a class statement earlier in the body had been masking
it: `frameSensitive-globals` +14, `dir` +4, `complex` +2, `exec` +2,
`nestedDef:flow` +2, `eval`/`locals`/`super`/`nestedDef:super`/
`AssignAst:target-AttributeAst` +1 each.  384 - 29 = **355**.

And the eligibility tally is corroborated by the RUNTIME one, which is the
harder number: `importlib ___irStats___`'s `compiled` -- methods actually built
by `generateFromIR:`, counted by `___irNoteCompiled___` in both seams -- goes
**3508 -> 3869 across the same pair, +361 = 355 + 6**.  So these methods are
built, not merely classified.

**The census-tally bug is not in this pair**, which is worth stating because
its phantom rows landed in exactly the row a sceptic would suspect.  The
pre-fix reading of the cut-76 run was `cm:method:classNotAtModuleScope` 1168
and a 4429 denominator; the matched pair reads 842 and 4103 in BOTH halves.
The BEFORE half cannot have been affected at all: with
`___irEligibleStatementLocals___:` forced to `false` the transport emit never
runs, so `___irEmitClassBodyAsTextDo___:` never sets the flag and the old
`___irCensusOn___` behaved identically to the fixed one.  The AFTER half was
measured after the fix.  The 1168/4429 reading was discarded and re-measured,
and it is the only reading the bug ever touched.

What is left of the family: `cm:classDef:decorated` 23, `cm:classDef:keywords` 14 (a
metaclass or other class keyword), `cm:classDef:nonlocalBelow` 9 + 1,
`cm:classDef:bodyStatement` 3, `cm:classDef:outerBinding` 1.  The two biggest
are the same problem as each other -- a decorator and a class keyword are both
expressions the emit evaluates in the enclosing scope, around the class rather
than inside it -- and they are now the next cut in this family.

Gates (both from wt/d on gs40 through `scripts/with_stone_lock.sh`, 8 of 8
shards reporting, no "Login failed", per-shard counts summing to the suite
line): flag-off `6551 run, 6551 passed, 0 failed, 0 errors`; flag-on cold sweep
`6551 run, 6545 passed, 5 failed, 1 errors` -- the same six as main, no new
name.  Fixture: 6 more shapes; compiled 492 -> 500, 0 fallbacks, RESULTS true
with the flag on and off and under CPython 3.14.6.

## Progress — cut 79 (the method-local class's own METHOD BODIES)

Cuts 76-78 made the class STATEMENT work inside an IR method and said so
carefully: the `+355 class methods` were the ENCLOSING class-body methods, and
the inner class's own methods stayed text, refused as
`cm:method:classNotAtModuleScope` — a row that read **842 in both halves** of
that matched pair. This cut retires it. Those methods now go through the same
class-method seam a module-level class's methods use (cut 36).

**Why the body needs no new emit, read off the oracle rather than reasoned.**
`GRAIL_CODEGEN_TRACE_DIR` on a method-local class carrying an `__init__`, a
plain method, a captured read and a module-global read: the generated method
source is the SAME shape as a module-level class's, statement for statement.
The three differences are all things that already have a name:

* the qualname prefix in the argument-error literals —
  `mlc_methods.<locals>.P.get()` where a module-level class says `C.get()`,
  which is the qualname machinery both paths share;
* a captured enclosing local reads `(self @env1:___classCell___:
  #'___cell_tag___')` — a plain one-argument env-1 send on `self`, resolved at
  run time out of the class's own attrs — where a module-level class's method
  would name a module attribute. The IR path does not emit it yet, so those
  refuse, now as `NameAst:classCell` instead of being masked;
* `super()` and `__class__` were already refused for a method-local class
  (`CallAst:super-methodLocalClass`, `NameAst:__class__-methodLocalClass`).

So the body was never the problem. What differs is the LIFETIME.

**The lifetime, which is the whole cut.** A method-local class is rebuilt on
every CALL of its enclosing def, from the compiled helper of cut 76, and the
first of those calls may come long after `___irPurgeDefTableForModule___:`. Cut
36's registration therefore cannot be used as-is on two counts: it is RELEASED
on first consumption (`___irInstallDef:` drops the entry, because a
module-scope class builds once) and it is PURGED at end of load. A registration
that survived both would hold the def's AST — and through the parent chain the
whole module's — for the session, which is exactly the retention recorded at
`___irForgetClassDefIds___:` as what killed the first cold flag-on sweeps.

Neither of the two routes considered up front is what landed. Making the
registration survive (route a) is the retention above. Driving
`PyMethodIRBuilder` from the `FunctionDefAst` reachable through the enclosing
method's IR closure (route b) does not exist to be driven: the closure holds IR
nodes, not AST.

What landed is **build at emit time, memoize the finished IR NODE TREE, and
regenerate per class**:

* the build happens at the seam's REGISTRATION point, inside the class body's
  method loop — which is the point cut 76 already chose for generating the
  class's text, so `functionBeingCompiled`, the scope stack,
  `classBeingCompiled` and `selfParameterName` are the ones the text path would
  have used. It is also where the census row is taken, so eligibility and the
  build see one context;
* the memo (`importlib ___irSharedMethodTable___`) holds the builder, whose IR
  tree names no AST node: the position map is SmallIntegers, the attached
  source is a String, and the only class in it is the one regeneration
  replaces. **Measured: after six test modules the memo holds 347 entries and
  `___irDefTable___` holds 0** — nothing of the AST is retained;
* each run of the class-build statement calls
  `PyMethodIRBuilder>>___irRegenerateOn___:`, which re-points the methNode at
  THIS class and generates. `attachPositionMap` recomputes from `attachedSource`
  each time, so it is idempotent. That is primitive 679 over a finished node
  tree against the source compile of the whole method text that the flag-off
  path does on every one of those same calls, so the transport is cheaper than
  what it replaces, not dearer.

**Why regeneration and not one shared method** — the first attempt did share
one, on the strength of `___copyMethod___:from:to:category:`'s measured note
that "the method's inClass never matters to its execution". It matters here,
and not to execution. A `GsNMethod` carries an `inClass`, and
`whichClassIncludesSelector:environmentId:` is a CACHING PRIMITIVE (`flags :=
16r10000 bitOr: envId`, "cache lookup result") that answers that class rather
than the one whose dictionary holds the entry. So a getter built against the
stand-in reported `PythonInstance` as its owner while its read-only setter stub
reported the real class, `___grailPyDefinedAccessorPair___:setter:` saw a pair
spanning two classes and declined it, and `W(4).doubled` answered the
BoundMethod. One fixture entry, `mlc_body_property`, is that regression.
Regeneration gives each class its own method with its own correct `inClass`
(measured directly: two generations of one methNode for two classes, both
running, both carrying the same Python source, each owning its selector).

**Registration is gated so the two kinds of class register in exactly OPPOSITE
emits** (`importlib ___irClassSeamEnabled___`, now one line): a module-scope
class while its emit is the module's own output and not a transport helper's; a
method-local class ONLY while its emit is the transport one. Its other emit is
the one inside an enclosing class-body method's text twin — generated whatever
path builds that method, since it is the fallback literal of its own install
statement — and registering there would register every such def twice, once for
a statement that runs and once for a statement that runs only if the enclosing
method fell back.

**Eligibility reads the parent chain, not the compile context.**
`classDefIsModuleScope` answers false for THREE shapes and only one of them is
this one (`isModuleScopeClassDef`: no module class, nested in a class body,
nested in a function), so `FunctionDefAst>>___irEnclosingClassIsMethodLocal___`
walks up to the nearest `ClassDefAst` and then up again, answering true at the
first `FunctionDefAst` / `LambdaAst` and false at the first `ClassDefAst`. Two
new refusals, both because the build has no real class yet:

* `method:methodLocalSlots` — a `__slots__` entry is an instVar leaf resolved by
  OFFSET against the class the method is built on (cut 51), and here the class
  does not exist at emit time, its base is a runtime expression, and every call
  makes a new one. 15 class methods in the subset;
* `method:methodLocalNestedClass` — a `class` statement inside such a method
  would have cut 76 compile ITS helper onto `aBuilder targetClass`, which for
  this build is the stand-in, i.e. onto `PythonInstance`. 6 class methods.

**Census.** Fourteen-module test subset, measured as a MATCHED PAIR on one
stone with `./install.sh` immediately before each half — `git checkout
origin/main -- <the five sources>` for the control, then back. Both halves read
the SAME denominators (4103 class methods, 918 top-level defs), which is how the
pair is known to be a pair:

| | before | after |
| --- | ---: | ---: |
| class methods eligible | 3071 / 4103 (74.8%) | **3696 / 4103 (90.1%)** |
| top-level defs compiled | 801 / 918 | 801 / 918 |
| runtime `compiled` (`___irStats___`) | 3869 | **4335** |

`cm:method:classNotAtModuleScope` 842 -> **5**. The row-by-row account, so the
total is checkable: `NameAst:classCell` +120, `NameAst:super` +38,
`method:methodLocalSlots` +15, `NonlocalAst:notLocal` +11,
`NameAst:__class__-methodLocalClass` +8, `method:noSelf` +7,
`method:methodLocalNestedClass` +6, `classNotAtModuleScope` 5 left,
`NameAst:reservedIdentifier` +3, `method:selfRebound` +2,
`NonlocalAst:classCell` +1, `frameSensitive-globals` +1 = 217, and
842 - 217 = **625**, which is the `cm:eligible` move exactly.

**The two numbers disagree by 159, and the reason is worth stating rather than
smoothing.** Eligibility moves +625; the runtime build count moves +466. The
census judges a def at the ORDINARY emit, where the enclosing def's own fate is
not yet known; the BUILD happens only in the transport emit, which exists only
when the class statement itself is admitted and the enclosing def is IR-built.
So a method-local class whose `classDef:*` row still refuses (decorated 23,
keywords 14, nonlocalBelow 9, bodyStatement 3, outerBinding 1) contributes
eligible methods that nothing builds. Those become real the moment the class
decorator / keyword cut lands; until then the honest headline is the runtime
one.

Stdlib corpus (`experiments/ir/census_stdlib.tpz`, 125 imports, `./install.sh`
first): top-level defs unchanged at 1570 / 1592; class methods 4544 ->
**4565 / 4621 (98.79%)**; runtime compiled 6106 -> **6127**, 0 fallbacks. Only
+21, and for the reason cut 76 already recorded: the stdlib is not where this
refusal lived. `cm:method:classNotAtModuleScope` reads 3 there now and
`cm:NameAst:classCell` 10.

`CENSUS.md` IS regenerated, on the combined tree, and the reason given here for
not regenerating it was stale rather than a real blocker: the corpus-2 scripts
(`census_tests_00..02.tpz`) landed with the census fix in #887 and are in the
repository. The subset pair above still stands as the measurement FOR THIS CUT --
a matched pair on one stone with agreeing denominators is the stronger evidence
for a delta -- but the committed board no longer has to be reasoned around.

**Fixture**: seven shapes, each chosen for something the shared build could get
wrong that nothing else in the file would notice — `mlc_body_twice` (two calls,
two classes, two instances, `type(p) is not type(q)`), `mlc_body_property` (the
inClass regression above), `mlc_body_decorated` (@staticmethod and @classmethod,
which build onto the metaclass), `mlc_body_varargs` (`*args`, a keyword-only
default, and a default the prologue binds), `mlc_body_generator` (the
`___wrapsBody___` branch, whose build must also stop short of installing),
`mlc_body_raises` (a raise unwinding out of such a method), and `mlcer79_run`
(a class inside a class-body METHOD, the corpus's dominant shape, including a
@property there). `mlc_body_traceback` is called from a test of its own rather
than from RESULTS, because `import traceback` would put a few hundred stdlib
defs into the exact compiled count `testIRPathWasActuallyTaken` asserts — and
that count would then depend on whether some earlier test had already imported
it. Compiled 500 -> **536**, 0 fallbacks, RESULTS true with the flag on and off
and under CPython 3.14.6. The traceback through a method-local class's method
names the method and shows ITS line with carets, measured before the fixture
was written.

**Gates** (both from wt/d on gs40 through `scripts/with_stone_lock.sh`; 8 of 8
shards reporting, per-shard counts summing to the suite line, no "Login
failed"):

* flag-off `6561 run, 6561 passed, 0 failed, 0 errors`;
* flag-on cold sweep `6561 run, 6554 passed, 6 failed, 1 errors` — SEVEN
  residue items, and a flag-on cold CONTROL run from `origin/main` on the same
  stone reads `6560 run, 6553 passed, 6 failed, 1 errors` with the same seven
  BY NAME: `LiveFrameProbeResilienceTestCase>>testTheProbeClassifiesBothShapes`,
  `LiveFrameProbeResilienceTestCase>>testTheTempsFastPathNeedsNoSource`,
  `NestedOperandSpanTestCase>>testALiveFrameKeepsTheStatementsLine`,
  `FrameReceiverSuggestionTestCase>>testASuggestionMayNameTheReceiver`,
  `TracebackTestCase>>testForLoopExceptionPositions`,
  `ImportlibTestCase>>testInstanceMethodNoOuterBlock`, and the
  `[ERROR] PrivateNameManglingTestCase>>testPrivateNameMangling` recursion-guard
  flap. The 6561/6560 difference is the one test method this cut adds. Neither
  flag-on run shows an `AlmostOutOfMemory` or a "temporary object memory" line
  in any shard.

**A census trap worth recording, because it produced a confident wrong pair.**
The first "after" reading was `cm:eligible` 2735 and a 3127 denominator — a
REGRESSION on a change that can only add. It was measured immediately after a
`run_tests.sh`, whose Flask-deploy and concurrent-import acceptance checks
COMMIT canonically-deployed modules; the census's imports then hit that cache
and compiled nothing, so both the numerator and the DENOMINATOR fell. The next
`./install.sh` bumps `GrailRuntimeGeneration` and drops the stale canonical
registries, which is why the control run that followed looked normal and made
the reading look like a real regression. **A census pair is only a pair when
both halves ran immediately after an `install.sh`, and the denominators are the
check that says so.**

**What is next in this family, and it is now unambiguous.**
`cm:NameAst:classCell` at 120 is the single biggest remaining refusal in the
subset, and it is the cheapest kind: the text emits `(self @env1:___classCell___:
#'___cell_x___')`, one env-1 send on `self` with a Symbol literal, which the IR
path can already spell. After that, `NameAst:super` 43 (a method-local class's
`super()`), then the class DECORATOR and KEYWORD cut that cuts 76-78 left, which
would also convert ~50 of the eligible-but-unbuilt methods above into real ones.

## Progress — cut 80 (the two literals that are really constructor sends)

Not every Python literal compiles to a Smalltalk literal.  Two cannot, for the
same reason: there is no literal syntax that can hold the value.  A `complex`
has none at all, and a str holding a LONE SURROGATE has no Character for its
code point -- which is why `PyStrSurrogate` exists.  So `printSmalltalkOn:`
emits a CONSTRUCTOR SEND for each, and until this cut `ConstantAst`'s IR
eligibility refused both, which is why they show on the board as
`ConstantAst:complex` and `ConstantAst:surrogateStr`.

**How.**  Both emits are one send, read off the text rather than chosen:

* `(PyStrSurrogate @env0:___fromCodePoints___: #(cp cp ...))` -- an ENV 0 send,
  with the code points as an invariant literal Array, matching what the
  Smalltalk compiler makes of `#(...)`;
* `(complex ___new___: <real> _: <imag>)` -- an ENV 1 send.

The environment is the part worth naming, because getting it wrong is SILENT:
`envFlags` is just an integer on the send node, so an env-1 send where the text
wrote `@env0:` compiles fine and dispatches into the wrong method dictionary at
run time.

The two arguments travel as the OBJECTS the parser already holds, where the text
has to print them and have the compiler read them back.  That is strictly safer
rather than merely shorter: a Float literal's round trip through `printString`
is the one place this emit could disagree with the text about a VALUE, and
passing the Float itself removes the question.  Checked rather than assumed --
`0.1 + 0.30000000000000004j`, `1e-300 + 2.5e-17j` and
`1.7976931348623157e308 + 1j` all `repr()` identically on the IR path, the text
path, and CPython 3.9.6.  So do the surrogate cases (`'\ud800'` -> `[55296]`,
`'a\udc80b'` -> `[97, 56448, 98]`, and an astral pair, which must NOT be
treated as a surrogate at all).

**Measured.**  `ConstantAst:complex` 74 -> **0** and `ConstantAst:surrogateStr`
27 -> **0**; total remaining refusals across both corpora 2322 -> **2221**,
which is exactly -101.  Corpus 2 goes from 80.3% to **81.1%** of all defs
through IR (class-body methods 8676 -> 8776 eligible).  The stdlib side moves by
one def, because these literals are overwhelmingly TEST code.

**Also here: one residue item retired, in the test rather than the emitter.**
`ImportlibTestCase>>testInstanceMethodNoOuterBlock` reads the emitted TEXT --
the `___compileMethod:` send, the pragma and temps lines inside its source
literal, the absence of a `^ [` wrapper.  Under the flag the class-method seam
emits `___irInstallDef:` instead, so the test failed on its own PREMISE (its
first search found nothing) rather than on the wrapper it exists to rule out.
It now forces the flag off around `runPath:` and restores it in an `ensure:`,
the `UnboundLocalErrorTestCase>>unboundGuardFixture` idiom.  That is not
weakening it: the text emitter is still the shape it is about, and still the
fallback the IR seam compiles when a build fails.

**A finding for the record: an IR method can never carry the `<grailPython>`
pragma.**  Main's #880 replaced the `___curPos___`-temp heuristic with an
explicit pragma, and the obvious follow-up was to emit it from the builder too.
It cannot be done.  `GsComMethNode` has no pragma instance variable and no
pragma selector, and `generateFromIR:` (prim 679) takes only the meth node, so
there is nothing to put in the slot; measured on a hand-built IR method, its
`pragmas` is empty and debugInfo slot 4 is `nil`.  Nor can it be patched
afterwards: `_debugInfo:` fails with `Attempt to modify invariant object` even
on a fresh, never-installed method.  (`_hasPragmaInfo` is not a usable test
either -- it answers true for a method with an EMPTY pragma array.)

The consequence is worth stating where it will be read.  `BaseException class
>> ___isGeneratedPythonMethod___`'s comment presents its SOURCE probe as a
compatibility shim for methods compiled before the pragma.  For the IR path it
is not a shim: an IR method carries no pragma and no `___curPos___` temp, so the
source read is the ONLY route to its identity -- and that is the read whose
fault under concurrent shards motivated the retry #880 built.  So the retry is
load-bearing for IR, not legacy.  Nothing is broken today (classification is
correct through the fallback, measured on `_py_warnings>>resetwarnings`), but
the source probe must not be pruned as dead.  An in-memory marker is possible
-- a distinctively named method-level temp -- and is deliberately NOT taken
here: it costs a frame word on every generated Python method, and frame width is
already load-bearing for recursion depth (one extra temp in `___pyAttrLoad___`
broke `test_richcmp`).  It should be measured against the recursion tests before
anyone writes it.

## Progress — cut 81 (the class-method closure CELL)

Cut 79 exposed this row rather than creating it.  A class method reading an
enclosing FUNCTION's local was previously refused twice over -- the whole
method refused as `classNotAtModuleScope` -- so `NameAst:classCell` sat at 120
in a subset and jumped to **272** on the full board the moment cut 79 let those
methods build.  It was then the single biggest refusal, three times the next.

**How.**  One send, and the text already had it: the method compiles with no
home context, so the enclosing temp is unreachable from it; the class emit
stores each captured name on the class at DEFINITION time and the read goes
back through the receiver's class chain --
`(self @env1:___classCell___: #'___cell_x___')`.  `___irClassContextLoadKind___`
answers `#classCell` where it answered nil, and `___emitIRValueOn___:` emits
that send: env 1, receiver `self`, one Symbol literal.

**The part that is not obvious, and is a sequencing argument rather than a
translation.**  The text branch also has a SIDE EFFECT -- `CallAst
addCapturedClassName: id` -- and that registration is what makes the class emit
store the cell at all.  The IR emit deliberately does NOT repeat it, because it
could not work if it tried: an IR method is built at the seam's registration
point or later, by which time the emit has already written its cell stores, so
a registration from here would arrive too late to have any effect.  It is not
needed either -- a class-body method's TEXT TWIN is generated whatever path
builds it, being the fallback literal of its own `___irInstallDef:` statement,
and the text branch fires the registration as it runs.  This is the same
argument `___irDunderClassLoadKind___` already relies on, and the two now stand
or fall together: if the text twin ever stops being generated, both break.

**Measured.**  `NameAst:classCell` **272 -> 0**.  Total refusals across both
corpora **998 -> 737**.  Corpus 2 goes from 91.0% to **93.1%** of all defs
through IR (class-body methods 9999 -> 10260 eligible); the stdlib moves by 7,
because a class inside a function is mostly a TEST shape.

`NameAst:super` is the new top at 91, up from 84 -- seven methods that used to
refuse on the cell now get as far as refusing on `super`.  That is worth
stating plainly: retiring a refusal can UNCOVER the next one on the same
method, so a row that grows after a cut is not necessarily a regression.

**Verified against both oracles, not just the text.**  Six new fixture shapes
in `ir_codegen_smoke.py`, each one that a by-VALUE reading of the cell or a
partial registration would get wrong: a plain capture; the class's own name
read inside its method (`C.__name__`, also an enclosing local); a rebinding
AFTER the class is defined (105 in CPython, 5 under by-value); two
instantiations that must not see each other's cell; several captured names in
one method plus one only a sibling method reads; and one class per loop
iteration.  All six agree on the IR path, the text path, and CPython -- the
fixture gate reads 5167 OK / 39 XFAIL under Python 3.14.6.

**The smoke count moved twice and the split is recorded** in
`IRCodegenSmokeTestCase`: 536 -> 549 from the emitter change alone, then -> 563
with this cut's fixture defs and their inner classes' methods.  That assertion
is exact on purpose -- it is what makes a silently dead seam visible -- and the
flag-OFF suite is what catches it, because the smoke test forces the flag.  A
stale pin there reads as a flag-off failure, which is alarming and is not one.

## Progress — cut 82 (the class statement's DECORATORS and metaclass KEYWORDS)

Cuts 76-78 left two refusals in the method-local class family and said they
were one problem: `classDef:decorated` (42) and `classDef:keywords` (27) are
both expressions the class emit evaluates in the ENCLOSING scope, around the
class rather than inside it. They are, and the fix is not a new mechanism but
the removal of two tests — because the machinery that carries an enclosing
value into the compiled-text helper already existed, and the only thing missing
was that the capture scan did not LOOK at these two expression lists.

**Read off the text, which says it in its own words.** The class emit prints
the bases under `CallAst inBasesEmit` and the decorators, the `boundary=`
value and the `metaclass=` value under `CallAst inDecoratorEmit`; the comment
at the decorator guard states outright that both flags exist to suppress the
same class-cell branch, because all of these "evaluate in the scope ENCLOSING
the class statement ... exactly like a decorator". So a decorator and a class
keyword stand in exactly the relation to the helper's frame that a base class
does — which cut 76 already walked, and cuts 77/78 already carried.

**The change, in two places.**

* `___irClassCapturedNames___:` walks `decorator_list` and each keyword's
  `value` with `___irReadLocalNamesInto___:`, on the same line as the bases. A
  name that resolves to an enclosing local therefore becomes a carried capture,
  arrives as the enclosing frame's own reader block, and is bound to the
  identifier the emit already names it by (`___enclosingScopeIdentifierFor___:`).
  Everything else — a module attribute, a builtin, `self` — resolves out of the
  helper unchanged, because the helper is a method on the same class the
  enclosing IR method is being built on.
* `___irMethodLocalClassReason___:` drops the two early exits. Nothing replaces
  them: the capture tests that follow are the question these shapes actually
  raise, and they now see the decorator and keyword reads.

No emit changed at all, and that is the point of cut 76's transport: the class
statement's Smalltalk is generated by `printSmalltalkOn:` and compiled by the
Smalltalk compiler, so the sends for a decorated class are the text path's BY
CONSTRUCTION, decorator loop, `___grailPrepareNamespace___:`, `___grailSetMetaclass___:`,
`___grailInitSubclass___:` and all. There is no second copy to keep in step.

**PEP 695 type parameters are NOT the same shape** and still refuse: they BIND
names in a scope of their own, which is a different question from reading one.

**Census, measured as a matched pair** — `./install.sh` immediately before each
half, and the denominators agree exactly (1592 / 4621 stdlib, 1327 / 10942
corpus 2), which is what says it is a pair. The stdlib board does not move at
all: neither row was ever on it.

| corpus 2 | before | after |
| --- | ---: | ---: |
| class-body methods eligible | 10260 / 10942 (93.8%) | **10322 / 10942 (94.3%)** |
| top-level defs compiled | 1299 / 1327 | 1299 / 1327 |
| all defs through IR | 93.1% | **93.6%** |

The row-by-row account, so the total is checkable rather than asserted:
`cm:classDef:decorated` 42 -> **0** and `cm:classDef:keywords` 27 -> **0** = 69
retired; SEVEN of those did not become eligible but simply reported their NEXT
blocker (`cm:classDef:nonlocalBelow` +6, `cm:classDef:bodyStatement` +1), which
is the effect cut 81 recorded — retiring a refusal can uncover the next one on
the same method. 69 - 7 = **62**, which is the `cm:eligible` move exactly, and
every delta on the board sums to zero, so nothing left the denominator.

**The two numbers do NOT move together, and the gap is cut 79's residue being
paid out.** Eligibility moves +62; the runtime build count (`importlib
___irStats___`'s `compiled`) moves **+140** over the same three sessions:

| census session | `cm:eligible` delta | runtime `compiled` delta |
| --- | ---: | ---: |
| stdlib | +0 | 6135 -> 6135 |
| tests_00 | +3 | 4948 -> 4951 (+3) |
| tests_01 | +31 | 5844 -> 5895 (+51) |
| tests_02 | +28 | 5687 -> 5773 (+86) |

Cut 79's section predicted exactly this and named the mechanism: "a method-local
class whose `classDef:*` row still refuses contributes eligible methods that
nothing builds", 159 of them in its subset. Those methods are the INNER class's
own method bodies. They were already counted `cm:eligible` in BOTH halves here —
the census judges them at the ordinary emit — but nothing built them, because
the build happens only in the TRANSPORT emit, which runs only when the class
statement itself is admitted. Admitting 69 class statements turns that on, so
the 62 newly-eligible enclosing methods arrive together with **78 further real
builds** that the board cannot show. The honest headline for this cut is the
runtime one, and the two numbers agreeing would have meant the residue was not
there.

**Fixture**: thirteen shapes in `tests/python/ir_codegen_smoke.py`, each chosen
for something a wrong marshalling or a lost result would get wrong rather than
for coverage — `cd_module_deco` (the corpus's commonest form, a module-level
decorator), `cd_local_deco` (the decorator IS an enclosing local, so a missed
capture is a compile failure and a silent fallback), `cd_order` (`@d1 @d2` is
d1(d2(C)), so the answer is "21" and not "12"), `cd_replaces` (a decorator
answering something that is not a class, which the helper must return),
`cd_loop_late_bound` (a decorator built per iteration reading the loop
variable), `cd_deco_and_body_read` (one name read EAGERLY by the decorator and
LAZILY from a method body — cut 78's two temps in one shape),
`cd_total_ordering` (`functools.total_ordering`, which rewrites the class),
`ck_metaclass` / `ck_metaclass_local` (the metaclass as a parameter and as a
class bound earlier in the same def), `ck_init_subclass` and
`ck_kwarg_is_capture` (PEP 487 forwarding, and a keyword value that is an
enclosing local), `ck_deco_and_keyword` (both at once, asserting CPython's
ORDER: `__init_subclass__` before the decorators) and `Mlcer82` (a decorated
method-local class inside a class-body METHOD, plus a keyword one). All thirteen
agree on the IR path, the text path and CPython 3.14.6; the fixture gate reads
5202 OK / 39 XFAIL.

**The smoke count moved, and the split is the interesting half**:
`IRCodegenSmokeTestCase` 563 -> **586**, of which the EMITTER contributed
**zero** — a full flag-off suite run with cut 82's emitter and cut 81's fixture
read `6592 run, 6592 passed, 0 failed, 0 errors`, pin included — and all +23
are this cut's own fixture defs and their inner classes' methods. That is not a
sign the emitter is dead: the old fixture simply contained no method-local class
carrying a decorator or a class keyword, because until now none could compile.

**Gates** (both from wt/d on gs40 through `scripts/with_stone_lock.sh`; 8 of 8
shards reporting, per-shard counts summing to the suite line, no "Login
failed", and no `AlmostOutOfMemory` or "temporary object memory" line in any
shard):

* flag-off `6592 run, 6592 passed, 0 failed, 0 errors`;
* flag-on cold sweep `6592 run, 6588 passed, 3 failed, 1 errors` — FOUR residue
  items, all of them already on main's list and none new:
  `NestedOperandSpanTestCase>>testALiveFrameKeepsTheStatementsLine`,
  `FrameReceiverSuggestionTestCase>>testASuggestionMayNameTheReceiver`,
  `TracebackTestCase>>testForLoopExceptionPositions` (`tuple_target_span`), and
  the `[ERROR] PrivateNameManglingTestCase>>testPrivateNameMangling`
  recursion-guard flap. The two `LiveFrameProbeResilienceTestCase` items that
  usually appear did not fire in this sweep, which is the direction that costs
  nothing to accept.

**The corpus shapes were checked behaving, not merely compiling**, because
neither gate reaches them: the flag-off suite is untouched by this change (the
eligibility predicate and the capture scan are IR-path only) and the CPython
suite runs flag-OFF, so a wrong answer in `test_enum`'s decorated method-local
classes would have been invisible to both. The ten manifest modules that held
these rows -- `test_copy`, `test_decorators`, `test_enum`, `test_fractions`,
`test_functools`, `test_genericclass`, `test_subclassinit`, `test_super`,
`test_traceback`, `test_warnings` -- were therefore run with
`GRAIL_IR_CODEGEN=1` and compared module for module against the same ten from
the flag-off full run. Eight are identical status and counts. The two that
differ, `test_copy` (OK -> ERROR 4/1) and `test_traceback` (OK -> FAIL 3/0),
are pre-existing FLAG-ON deltas and not this cut's: a control run of exactly
those two, flag-on, with `ClassDefAst.gs` checked out from `origin/main` and
`./install.sh` in between, reads the SAME `ERROR 81/4/1/0` and
`FAIL 370/3/0/225`.

**Tier 2** (`run_cpython_suite.sh` then `check_cpython_regressions.sh`, because
this touches `PythonAst/`): `1 regression(s), 2 improvement(s)` -- the
regression is `test.test_urllib2_localnet` fail+err 9 -> 10, the known local
delta this machine shows on `origin/main`, and the two "improvements"
(`test_decimal` 17 -> 10, `test_reprlib` 14 -> 11) are the machine rather than
a win: the committed board is CI-measured on Linux x86_64. The board is NOT
committed, per the rule in CLAUDE.md.
## Progress — cut 83 (bare `globals()`, and what the census row's name hides)

**The `frameSensitive` family is misnamed, and that is the finding, not the
cut.**  Six rows -- `globals`, `locals`, `vars`, `dir`, `eval`, `exec`, 231
together -- read as builtins that need the calling frame, and the roadmap was
about to skip the whole block on that reading.  They do not.  Every one is a
COMPILE-TIME REWRITE that `printSmalltalkOn:` performs at step 0, before any
fast path:

* `globals()` becomes `(PyModuleDict @env0:on: <recv>)`, the receiver chosen at
  compile time;
* `locals()` / zero-arg `vars()` become a pair-array of the names in the
  enclosing scope (`printLocalsCallOn:`);
* zero-arg `dir()` is `___dirOfNamespace___:` applied to that same pair-array;
* bare `eval` / `exec` in a function inject that same pair-array as the
  evaluation namespace.

So four of the six are DOWNSTREAM of one piece of machinery, `printLocalsCallOn:`,
and none of the six needs a runtime frame.  The block is tractable; it was the
row name that said otherwise.

**This cut takes the one that stands alone.**  `globals()` does not depend on
`printLocalsCallOn:` at all -- its receiver comes from
`___globalsViewReceiverExpr___`, which is two cases once doits are excluded:
`self` in the module body and its top-level defs, where `self` IS the module
instance, and the module SINGLETON inside a class method, where `self` is the
Python instance instead.  Both sends are ENV 0.  Picking the wrong receiver
still compiles and only misbehaves at run time, which is why the fixture
exercises both.

Doits are excluded rather than handled: there the text's receiver is
`___pyGlobals___`, a symbol-list scope the IR builder has no leaf for, and IR
refuses doits everywhere else already.  The match is otherwise the text's
exactly -- the bare name, no arguments, no keywords.  `globals` reached through
a local alias is not a `NameAst` function and never arrives here; a local
literally NAMED `globals` is rewritten by the text too, because its step 0 runs
before any shadowing test, and reproducing that is the point.

**Measured.**  `CallAst:frameSensitive-globals` **49 -> 0**.  Total refusals
across both corpora **737 -> 699**, which is 38 rather than 49: eleven of those
defs refuse again a step later, the same UNCOVERING effect cut 81 recorded for
`NameAst:super`.  Corpus 2 goes 93.1% -> **93.4%** of all defs through IR;
the stdlib reaches 1575 of 1592 top-level defs (98.9%) and 4573 of 4621 class
methods (99.0%).

**Verified against both oracles.**  Nine fixture shapes: a read, a missing key
raising `KeyError`, a write that creates a real global, the LIVE view (a write
through it visible as a global and back through the same view), a name defined
later in the module, `isinstance(globals(), dict)`, a read and a write from
inside a METHOD (the module-singleton receiver), and a local shadowing a global
-- where the bare read must answer the local and the view still report the
module binding.  All nine agree on the IR path, the text path, and CPython;
fixture gate 5185 OK / 39 XFAIL under Python 3.14.6.

Smoke count 563 -> **572**, almost all of it this cut's own fixture defs: the
emitter change moves little there, because the smoke module barely called
`globals()` before.

**Next in this family** is `printLocalsCallOn:` itself -- `locals()`/`vars()`
at 23 rows directly, but it is the machinery `dir` (37) and `eval`/`exec` (125)
all stand on, so it is worth more than its own row count.  It is also the
branchiest thing here: five scope cases (function, module, module-inside-a-
comprehension, class body, class-body-inside-a-comprehension), each with a
recorded reason.  That is a cut of its own, not an extension of this one.

## Progress — cut 84 (`locals()` / `vars()`, and a gate that was skipping the file)

Cut 83 established that the `frameSensitive` family is compile-time, not
frame-sensitive, and that four of its six rows stand on one method,
`printLocalsCallOn:`.  This is that method -- the FUNCTION-scope case of it.

**What it emits.**  `(builtins instance) ___buildLocals___: { {'name'. <read>}.
... }` -- a pair-array in the text's ORDER, which is load-bearing: free
variables first, then the function's own names sorted, then comprehension
targets last so they shadow a same-named local.  `___buildLocals___:` drops the
entries whose value is still nil, which is how a not-yet-bound name stays out.
Each name resolves as the text resolves it: a self/cls parameter is Smalltalk
`self`, a reserved-named PARAMETER is its transport temp, anything else is the
plain local.

Module-scope `locals()`/`vars()` outside a comprehension IS `globals()`, so it
rides cut 83's `#globalsView` rather than getting a second spelling.  The class
body and the comprehension cases stay on text and are still refused.

**Free variables reuse the text's own trick rather than copying its rules.**
`___emitFreeVariableRead___:parent:on:` resolves a free variable by building a
`NameAst` AT THE RESOLUTION POINT and letting it compile itself; the IR twin
builds the same node and calls `___emitIRValueOn___:` on it.  So the two paths
agree by construction, and cut 81's class-cell case comes along for free.

**A trap that produced correct answers.**  The first version fell back to text
on exactly the shapes the free-variable path touched -- and the fixture still
agreed with CPython on all ten shapes, because the fallback compiles the text.
Only `___irStats___` showed it: two fallbacks, logging `UndefinedObject does
not understand #-`.  A SYNTHESIZED node carries nil in all four
`AbstractLocationNode` position instVars, and the IR path stamps every node it
emits -- `column` is `beginPosition - prevEolPos - 1`.  The text twin never
notices because it only prints.  Fixed by copying the four positions from the
call site, which is also the honest position: that read IS emitted there.
**Assert `fallbacks = 0` after every emit change; matching values prove
nothing.**

**Measured.**  `frameSensitive-locals` **11 -> 0**, `frameSensitive-vars`
12 -> 9 (the class-body and comprehension cases, still refused).  Total
refusals **637 -> 626**.  Corpus 2 class methods eligible 10356 -> **10365**.
Modest by design -- the value here is the machinery `dir` (38), `exec` (81) and
`eval` (54) all stand on, 173 rows still to come.

**And a gap in the gate, closed.**  `ir_codegen_smoke.py` had no top-level
`__main__` block, so `check_python_fixtures.sh` -- which runs only self-running
fixtures -- had been SKIPPING it entirely.  Its "all self-running fixtures agree
with CPython" was quoted in three PRs as evidence for shapes it had never
executed.  The gate's own docstring warns the skip is silent.  The file now opts
in and prints one line per RESULTS entry: **337 -> 338 fixtures, 5202 -> 5598
checks**, +396 conformance claims now checked on every run.

It earned its keep immediately: `lv_in_comprehension` was written from
expectation as `['x']` and CPython 3.14 answers `['x', 'xs']`, because PEP 709
inlines a list comprehension into the function's scope from 3.12 on.  Measured
and corrected.

## Progress — cut 85 (`dir()`, and a census family that was mostly a naming bug)

Cut 85 began as the bare-`dir()` emit and found something larger: **most of the
`frameSensitive` family was never frame-sensitive, or even rewritten.** The
shape dispatch refused `globals`, `locals`, `vars`, `dir`, `eval` and `exec`
**by name, at any arity**, while the text rewrites only specific shapes. Every
refusing `frameSensitive-dir` site in the stdlib is `dir(obj)` -- the
one-argument form, which the text does not touch at all: it falls through to the
ordinary builtins dispatch, exactly like `len(obj)`. The IR path was refusing
ordinary calls because of the name on the front.

So the guard now refuses only what the text's own step 0 claims. Measured, IR
and text emit byte-identical results on `dir(obj)`, `vars(obj)`,
`eval(e, g)`, `eval(e, g, l)` and `exec(s, g)`, all matching CPython.

**The bare `dir()` emit itself** is a thin wrapper, on purpose: Python defines
`dir()` with no argument as the names in the current scope, and the text routes
it through the SAME machinery `locals()` uses rather than finding the scope a
second way. `___emitIRDirOfScopeOn___:` does likewise, over
`___emitIRScopeNamespaceOn___:`, which picks between cut 84's locals snapshot
and cut 83's module view. The class-body and comprehension cases stay on text.

### Three defects found, none of which showed up as a wrong answer

**1. A silent fallback in cut 84** (fixed here). A function with a parameter
spelled like a Smalltalk pseudo-variable (`def f(nil, true)`) fell back to text
on every `locals()`. Cut 84 passed the TRANSPORT name to `localVar:`, which is
what the text must print; but the builder registers such a parameter under its
PYTHON name and only *names* the leaf `_nil`. The IR path must not translate at
all. Correct answers throughout -- the fallback compiled the text -- so only
`___irStats___` showed it.

**2. Eligibility and emit run in DIFFERENT compile-time contexts.** This is the
general one, and it had never bitten because every context-dependent branch
happened to land on *some* emittable shape in both phases. `CallAst
functionBeingCompiled` is **nil** while the seam judges a def and **set** while
its body is emitted, so a shape test consulting it can answer "ordinary call"
to the judge and "refuse" to the emitter. A guard copied from the text's own
`eval` rewrite did exactly that: `pickle._builtin_type_registry`
(`cls = eval(name)`) was judged eligible, then raised `call shape not
emittable`, falling the whole method back to text. It surfaced as the census's
own `fallback` row -- one line, in a board of thousands.

*A shape test must give the same answer in both phases.* Anything consulting
`functionBeingCompiled` or `inClassBodyValueEmit` needs checking against this.

**3. `eval`/`exec` are frame-sensitive at RUN time, and no shape test can see
it.** `eval(e, g, l)` whose `g` and `l` hold None means "use the caller's
namespaces", and Grail honours that by finding the calling Python frame --
identified by the `___curPos___` temp that TEXT-generated methods carry. An IR
method carries `___grailPython___` instead, so the walk does not recognise it
and the expression gets no caller namespace. Compiling those calls through IR
turned test_decorators' `dbcheck` shape into `NameError: name 'args' is not
defined`: **13 errors in EvalCallerNamespaceTestCase**, caught by the flag-on
gate. The values decide, at run time, so `eval`/`exec` are refused at every
arity here. **Unifying the two marker spellings is the next cut** -- it changes
the shared frame walk the traceback path also uses, so it is not a rider on
this one.

*Updated on merging main, then CORRECTED by measurement.* The unification
landed as **#906**, from another lane and for an independent reason -- under
`GRAIL_IR_CODEGEN` the walk ran past every IR method, so a `NameError` inside a
method lost its `self.<name>` suggestion (which was also this lane's
`FrameReceiverSuggestion` residue item). On reading that, this section claimed
the eval/exec blocker was gone. **It is not.** With eval/exec narrowed on top of
#906, loading `tests/python/eval_caller_namespace.py` under a forced flag still
raises `NameError: name 'args' is not defined` -- 19 compiled, 0 fallbacks,
where the text path loads it. Reading a fix's docstring is not measuring it.

What #906 did fix is most of the shapes. Probed one at a time, the IR path now
agrees with text and CPython on a plain parameter, a plain local, a module
global, a top-level `*args` def, and a method. The remaining divergence is a
**nested def**, and it goes BOTH ways:

* `def outer(n): def inner(): return eval('n + 100', None, None)` -- IR answers
  101 where text and CPython raise `NameError`. CPython's compiler never makes
  a cell for a name appearing only inside the eval string, so it is genuinely
  out of scope; IR is too **permissive**, seeing the enclosing method's locals.
* the `dbcheck` shape -- a nested def taking `*args` -- cannot see `args` at
  all.

A nested def compiles to a BLOCK inside the enclosing method, so the frame the
snapshot walk finds is not the one whose temps it wants. That is the next cut in
this lane, and it is frame machinery rather than codegen.

### Measured

| | before | after |
| --- | ---: | ---: |
| stdlib top-level compiled | 1575 / 1592 (98.9%) | **1582 / 1592 (99.4%)** |
| stdlib class methods eligible | 4576 / 4621 (99.0%) | **4585 / 4621 (99.2%)** |
| corpus 2 top-level compiled | 1302 / 1327 (98.1%) | **1312 / 1327 (98.9%)** |
| corpus 2 class methods eligible | 10365 / 10942 (94.7%) | **10396 / 10942 (95.0%)** |
| corpus 2, all defs through IR | 93.9% | **94.3%** |

`frameSensitive-dir` (25 + 4) and `frameSensitive-vars` (4 + 3) are **gone**.
`frameSensitive-eval` (50 + 2) and `-exec` (77 + 3) survive, deferred to the
marker cut with the reason recorded. No `fallback` rows anywhere on the board.

### A test that had quietly stopped testing

`text_caller` is the TEXT side of `testTracebackThroughIRMethod`. It was kept on
the text path by a bare `dir()` in its body -- and this cut made that eligible.
Every test stayed green; the check had simply become IR-calls-IR. The only trace
was the pinned compiled count reading 614 where the new fixture defs accounted
for 613.

The general problem has no permanent fix: *every* refusing shape is by
construction a future cut, so any opt-out is temporary. What is durable is
making its retirement LOUD. `text_caller` now opts out with an inert `match`
statement, and the test asserts its own premise -- an IR method's `sourceString`
is its Python def, so a text method's is not. Verified by positive control: with
the `dir()` opt-out restored the assertion fires and names the fix; with the
`match` in place it is silent.

**Chasing an off-by-one in that pinned count has now twice been worth more than
the count.** The full split is in the test's own docstring; the short version is
604 -> 613 -> 614 (emitter alone, fixture held fixed) -> 622 -> 619, and it
closes exactly once you know class-body methods land in the counter too --
measured on a two-line module rather than assumed.

## Where we are (2026-09-09, after cuts 81-85)

Same denominators as `CENSUS.md` (stdlib 1592 top-level / 4621 class-body;
corpus 2 1327 / 10942), regenerated on the combined tree with `./install.sh`
immediately before.

| | stdlib | corpus 2 (suite manifest) |
| --- | ---: | ---: |
| top-level defs compiled | 1582 / 1592 (99.4%) | 1312 / 1327 (98.9%) |
| class-body methods eligible | 4585 / 4621 (99.2%) | 10396 / 10942 (95.0%) |
| all defs through IR | **96.1%** | **94.3%** |

Corpus 2 has gone 73.5% -> 81.1% -> 91.0% -> 93.9% -> **94.3%** over cuts
79-85.

Cuts 82 and 83 were developed in parallel and their eligibility deltas are
exactly additive: 10260 + 62 + 34 = 10356.  So is the smoke count, 563 + 23 +
9 = 595 -- measured, not assumed, and not a rule to rely on next time.

**What is left, ranked, with the tractability read rather than the row name.**

* `NameAst:super` **91** -- the biggest single row.  `super()` CALLS already
  emit (cut 55's two Super-proxy rewrites); what refuses is `super` read as a
  VALUE.  Subtle (the `__class__` cell, the MRO), so worth doing carefully
  rather than first.
* **The two frame-marker spellings**, worth `exec` 80 and `eval` 53 and the
  next cut in this lane.  Cuts 83-85 retired `globals`, `locals`, `vars` and
  `dir` from this family -- most of it turned out to be ordinary calls refused
  by NAME rather than by shape (cut 85).  What is left is the genuinely
  runtime-frame-sensitive half: `eval(e, g, l)` with None namespaces means
  "use the caller's", and the caller frame is identified by the `___curPos___`
  temp that only TEXT-generated methods carry, while an IR method carries
  `___grailPython___`.  Until `PyFrame >> ___namesIncludeCodegenMarker___:`
  accepts both, compiling these calls through IR silently drops the caller
  namespace -- measured, 13 errors in EvalCallerNamespaceTestCase.  The change
  is small; its blast radius is not, since the same walk feeds the traceback
  path, so it wants its own cut and its own tier-2 run.
* `method:classNotAtModuleScope` **72** plus `methodLocalSlots` 17 and
  `methodLocalNestedClass` 11 -- cut 79's own named residue.
* `NameAst:reservedIdentifier` **28** and a tail below 25.

**One of the two things on this board that were not coverage is now CLOSED.**
`FrameReceiverSuggestionTestCase>>testASuggestionMayNameTheReceiver` was
recorded here as "a genuine IR gap, undiagnosed"; it is diagnosed and fixed
(#906).  `PyFrame >> ___namesIncludeCodegenMarker___:` tested for
`___curPos___` alone -- the TEXT emitter's position temp -- and that predicate
is how `___innermostPythonFrameSnapshot___` FINDS the frame whose receiver and
locals get snapshotted at raise time.  So under the flag the walk ran past every
IR method, nothing was captured, and the exception reached traceback.py with
`___frameLocalNames___`/`___frameSelf___` absent, which is what made
`_raising_frame_self` decline:

    text:  NameError: name 'blech' is not defined. Did you mean: 'self.blech'?
    IR:    NameError: name 'blech' is not defined. Did you mean: 'blich'?

Ruled out first, both cheaper explanations: `___methodReceiverTable___` is
populated identically on both paths, and `extract_tb(capture_locals=True)`
reports the same locals on both.  The receiver machinery was fine.  Note that
`___curPosLineFromFrameContents___:` must NOT be widened the same way -- it
reads the position VALUE out of the temp, and `___grailPython___` holds none.

`TracebackTestCase>>testForLoopExceptionPositions` closed with it (#906): the
tuple-target branch of ForAst's IR emit stamped the iterator protocol at the
TARGET, so `for a, b in LateBreak():` blamed `a, b` (colno 12..16) where the
text path and CPython blame `LateBreak()` (20..31).

**With those two, the flag-on SUnit suite is GREEN on 4.0: 6592 run, 6592
passed, 0 failed, 0 errors -- identical to flag-off, 8 of 8 shards.**  Because
two identical arms are the shape of a vacuous pass, the flag was verified to
reach the gem under the suite's own env (`raw='1' flag=true enabled=true`), and
the same harness read 3 failures before the fixes and 1 after a rebase, so it
distinguishes the arms.

`PrivateNameManglingTestCase` fires
intermittently under the cold flag-on sweep and nobody knows why: the IR
method's selector pool is IDENTICAL to the text method's (so it does take the
private-method direct-send fast path) and its frame is NARROWER, not wider --
both hypotheses refuted by measurement.  It also still fires with #893's
identity marker in, so the marker neither caused nor fixed it.

**Not worth doing: transcribing the class emit itself into IR.**  Cut 76
already routes every eligible class statement through IR, so it would retire
zero rows, and it would cost a second copy of `printSmalltalkRuntimeOn:` --
~2400 lines of branches -- free to drift from the text path that is the oracle
for every other emit.  See `___irEligibleStatementLocals___:`, which argues it
at the site.

## The flag-on CPYTHON SUITE, measured for the first time (2026-09-10)

**A green flag-on SUnit suite does not mean the IR path is ready to be the
default.**  The SUnit suite is now identical in both arms (above).  The 103-module
CPython conformance corpus is not, and it had never been run with the flag on.
Both arms, same tree (main at #906), same container, run back to back:

| | flag OFF | flag ON |
| --- | ---: | ---: |
| OK | 71 | **66** |
| FAIL | 3 | **6** |
| ERROR | 17 | **18** |
| SKIP | 1 | 1 |
| IMPORTERROR | 10 | 10 |
| CRASH | 0 | **1** |
| TIMEOUT | 1 | 1 |
| wall time | 939s | **1773s** |

THE IR PATH IS GENUINELY ACTIVE IN THAT RUN, which has to be established before
any of the numbers mean anything -- a corpus that silently fell back to text
would score exactly like flag-off and look like a pass.  Importing one real
stdlib module (`textwrap`) and reading the seam's own counters:

    flag on:   compiled=101  fallbacks=0
    flag off:  compiled=0    fallbacks=0

Eight modules differ.  Seven are worse, one is better:

| module | flag OFF | flag ON |
| --- | --- | --- |
| test.test_set | OK (630 tests) | **CRASH** |
| test.test_copy | OK | FAIL 4 |
| test.test_global | OK | ERROR 1 |
| test.test_traceback | OK | FAIL 1 |
| test.test_with | OK | FAIL 1 |
| test.test_codecs | ERROR 25f/52e | ERROR 26f/52e |
| test.test_funcattrs | ERROR 0f/1e | ERROR 1f/1e |
| test.test_contextlib_async | ERROR 6f/2e | ERROR 6f/**1e** |

`test.test_math` reads TIMEOUT in BOTH arms and is not IR: four modules at once
under x86_64 emulation, and run alone it reads `OK t=88` in 4m18s against the
600s limit.  It has done this in three separate runs.  Note also that
`check_cpython_regressions.sh` does not compare an OK/TIMEOUT transition and
reported `0 regressions` through every one of them -- the statuses have to be
diffed by hand.

**The crash is an OUT OF MEMORY, and it is the structural item.**
test.test_set dies with `VM temporary object memory is full, almost out of
memory, too many markSweeps since last successful scavenge`, with the old
generation full at `374783/374784Kold` and `47869Kdoits 68309KdoitsNcode` --
~116MB in doits and doit native code.  Taken with the 1.9x wall time, the IR
path costs substantially more memory and time per compiled def than the text
path, and on the heaviest module in the corpus that is fatal rather than slow.
Whatever the per-def cost is, it is not free, and nothing in the coverage census
measures it.

**The functional divergences, with their signatures.**  Two look like the same
class of bug as ForAst's tuple-target span, which is worth trying first for that
reason:

* `test_with` -- `AssertionError: 'self.Dummy()' != 'self.ExitRaises()'`.  A
  `with` statement blaming the wrong expression: a POSITION STAMP, the same
  shape as cut 84's ForAst fix.
* `test_traceback` -- one ExceptionGroup traceback renders differently.
* `test_global` -- `KeyError: 'name_caught_exc'`.
* `test_funcattrs` -- `NameError: name '__builtins__' is not defined`, plus
  `UnboundLocalError not raised`.  A scope/name issue, not a position one.
* `test_copy` -- four identical `AssertionError: 2 != 1`.
* `test_codecs` -- one additional failure among 26; not isolated.

So the readiness queue is: the memory/time cost first (it is the only one that
takes a whole module out), then the position stamps, then the name/scope pair.
Coverage is 93.9-95.8% of defs and is no longer the limiting factor.

## Roadmap — what blocks real code, ranked (census of 2026-09-06)

Until batch 5 the cuts were chosen syntax-first, and there was no measure of
progress.  `experiments/ir/CENSUS.md` now measures it: with the flag forced,
the seam records why every top-level def in the vendored stdlib (and, as a
second corpus, the CPython suite's test modules) is or is not IR-compiled.
Re-run it after each batch; the two headline numbers are the progress metric.

**Where we were (2026-09-06).** Of the stdlib's 1570 top-level defs, 658
(41.9%) compiled through IR.  Of ALL 6245 defs in that corpus, 10.5% did --
because 4471 (71.6%) are class-body methods, which the seam never saw.

**Where we are (2026-09-07, after cuts 35-36 and 40-43 -- CENSUS.md
regenerated on the same stone).** Of the stdlib's 1570 top-level defs, **957
(61.0%) compile through IR**; of its 4427 class-body methods, **851 (19.2%)
are built through the class-method seam**; of ALL 6201 defs, **29.2%** go
through IR.  The test corpus: 75.8% of top-level defs, 15.7% of class
methods, 25.4% of all defs.  Item 1 is open, items 2, 3 and 7 are done.

**Where we are (2026-09-07, after cuts 44-45 -- same stone, same
denominators).** Top-level defs unchanged (957 / 1570, 61.0%); of the 4427
stdlib class-body methods **1685 (38.1%) are built through the seam** (was
851); of ALL 6201 defs **42.6%** go through IR (was 29.2%).  The test corpus:
75.8% of top-level defs, **45.7%** of class methods (was 15.7%), **50.0%** of
all defs (was 25.4%).  Items 1a and 1b are done; what refuses a class method
now is, in order: return annotations (1140), decorators (353), `__slots__`
(266), module-function reads in methods (151), `self.m(kw=...)` self-sends
(143), `super`/`__class__`/`type` reads (76), async (66), generators (65),
receivers not named `self` (64).  The two biggest are items 5 and 6 of the
table, which now block methods far more than they block top-level defs.

**Where we are (2026-09-07, after cuts 47-48 -- same stone, same
denominators).** Of the stdlib's 1570 top-level defs **1160 (73.9%)** compile
through IR (was 957, 61.0%); of its 4427 class-body methods **2628 (59.4%)**
are built through the seam (was 1685, 38.1%); of ALL 6201 defs **61.1%** go
through IR (was 42.6%).  The test corpus: 77.0% of top-level defs, 48.9% of
class methods, 52.8% of all defs (was 75.8 / 45.7 / 50.0).  Items 5 and 6
are done.  What refuses a class method now, in order: `__slots__` (266),
`self.m(kw=...)` self-sends and arity mismatches (261), module-function
reads in methods (233), `super` / `__class__` / `type` reads (173),
annotated assignments (79, a new statement shape), starred values (75),
async (66), generators (65), receivers not named `self` (64).  Item 1c is
now the whole of the method-only tail; the rest is the long tail of items
4, 8-12 as it occurs inside methods.

**Where we are (2026-09-07, after cuts 49-52 -- same stone, same
denominators).** Of the stdlib's 1570 top-level defs **1167 (74.3%)**
compile through IR (was 1160, 73.9%); of its 4427 class-body methods **3337
(75.4%)** are built through the seam (was 2628, 59.4%); of ALL 6201 defs
**72.6%** go through IR (was 61.1%).  The test corpus: 77.0% of top-level
defs, **57.7%** of class methods (was 48.9%), **60.0%** of all defs (was
52.8%).  Four of item 1c's six pieces are done.  What refuses a class method
now, in order: `super` / `__class__` / `type` reads (186), starred values
(89), generators (72), nested defs (68), async (67), name-target augmented
assignment (67 -- a method-only count; the module twin is done, so this is
a missing method-mode branch, not a missing emit), receivers not named
`self` (64), generator expressions (57), attribute-target augmented
assignment (57), `**kwargs` call splats (50), classmethod (42), classes not
at module scope (34), chained assignment (31), staticmethod (19).  Item 9
(generators + async, 139 methods + 48 top-level defs) is being cut in the
second lane (wt/d, `feat/ir-generators`).

**Where we are (2026-09-07, after cuts 53-56 -- the two lanes merged; same
stone, same denominators).** Of the stdlib's 1570 top-level defs **1267
(80.7%)** compile through IR (was 1167, 74.3%); of its 4427 class-body
methods **3809 (86.0%)** are built through the seam (was 3337, 75.4%); of
ALL 6201 defs **81.9%** go through IR (was 72.6%).  The test corpus: 82.7% of
top-level defs, **63.4%** of class methods, **65.6%** of all defs (was 77.0 /
57.7 / 60.0).  Item 9 is done (wt/d lane, cuts 53-54); of item 1c, `super`
/ `__class__` / `type` is done (cut 55); starred values are done (cut 56,
with `**kw` splats, item 11).  What refuses a class method now, in order:
list comprehensions (82), nested defs (76), generator expressions (67),
attribute-target augmented assignment (64), receivers not named `self`
(64), classmethod (42), chained assignment (36), classes not at module
scope (34), lambdas (22), staticmethod (19), builtin functions as values
(15), walrus (13), `raise Cls(kw=...)` (12), Ellipsis (12).  Top-level defs
refuse, in order: nested defs (70), list comprehensions (48), generator
expressions (27), pseudo-variable parameters (23), `global` (19), lambdas
(18), Ellipsis (17).  Item 8 (comprehensions, ~210 defs across the four
node kinds) is being cut in the second lane (wt/d, `feat/ir-comprehensions`).

**Where we are (2026-09-07, after cuts 57-63 and 67 -- the two lanes merged
again; same stone, same denominators).** Of the stdlib's 1570 top-level defs
**1348 (85.9%)** compile through IR (was 1267, 80.7%); of its 4427 class-body
methods **4161 (94.0%)** are built through the seam (was 3809, 86.0%); of ALL
6201 defs **88.8%** go through IR (was 81.9%).  The test corpus: 86.5% of
top-level defs, **68.3%** of class methods, **70.2%** of all defs (was 82.7 /
63.4 / 65.6).  Item 8 is done (wt/d lane, cuts 57-59: list / set / dict
comprehensions, generator expressions); item 1c is done but for method-local
classes (cuts 60, 61, 67: any receiver name, @classmethod, @staticmethod);
the two statement shapes are done (cut 62 augmented attribute / subscript
stores, cut 63 chained assignment).  What refuses a class method now, in
order: nested defs (81), classes not at module scope (35), lambdas (26),
builtin functions as values (18), flow (15), walrus (14), Ellipsis (13),
`raise Cls(kw=...)` (12), `for ... else` (11); every other row is under 6.
Top-level: nested defs (76), pseudo-variable parameters (23), lambdas (19),
`global` (19), Ellipsis (17), flow (13), builtin functions as values (11).
Item 4 (nested defs and lambdas, 81 + 76 + 26 + 19) is being cut in the second
lane (wt/d, `feat/ir-nested-defs`, cuts 64-66); what is left for the first
lane is the long tail of item 12 and the method-local classes.

**Where we are (2026-09-08, after cuts 67-70 -- same stone, same
denominators).** Of the stdlib's 1570 top-level defs **1429 (91.0%)** compile
through IR (was 1348, 85.9%); of its 4427 class-body methods **4226 (95.5%)**
are built through the seam (was 4161, 94.0%); of ALL 6201 defs **91.2%** go
through IR (was 88.8%).  The test corpus: 91.9% of top-level defs, **69.8%**
of class methods, **72.3%** of all defs (was 86.5 / 68.3 / 70.2).  Item 1c is
complete but for method-local classes (cut 67 @staticmethod); of item 12 the
Ellipsis, builtin-as-value, `raise Cls(kw=...)`, loop-`else`, `global`,
walrus and pseudo-variable-parameter rows are done (cuts 68-70).  What
refuses a class method now: nested defs (84), method-local classes (35),
lambdas (26), flow (21), then the deliberately frame-sensitive calls (`dir`,
`exec`, `vars`, `globals`, `locals`, `eval`: 5 + 3 + 3 + ...) and single
digits.  Top-level: nested defs (77), lambdas (19), flow (17), classes
defined in a def (5), frame-sensitive calls (4 + 4 + 3).  Item 4 (nested defs
and lambdas) is in the wt/d lane (cuts 64-66); after it the coverage work is
essentially the flow refinements and the method-local classes -- the rest is
frame-sensitive by design.

**Where we are (2026-09-08, after cuts 71-72 -- same stone, same
denominators).** Of the stdlib's 1570 top-level defs **1446 (92.1%)** compile
through IR (was 1429, 91.0%); of its 4427 class-body methods **4247 (95.9%)**
are built through the seam (was 4226, 95.5%); of ALL 6201 defs **91.8%** go
through IR.  The test corpus: 93.0% of top-level defs, **70.6%** of class
methods, **73.2%** of all defs (was 91.9 / 69.8 / 72.3).  The `flow` row is
GONE from both corpora: cut 71 taught the analysis what a `while True` loop
leaves bound, and cut 72 stopped it being a refusal at all (an unproven read
carries the text's unbound guard).  What refuses a class method now: nested
defs (84), method-local classes (35), lambdas (26), then only the
deliberately frame-sensitive calls (`dir` 5, `exec` 3, `vars` 3, ...), async
comprehensions (4), a default reading a local (4) and single digits.
Top-level: nested defs (77), lambdas (19), classes defined in a def (5),
frame-sensitive calls (4 + 4 + 3).  Item 4 (nested defs and lambdas) is in
the wt/d lane; after it the only coverage work left is the method-local
classes -- everything else on the board is frame-sensitive by design.

**Where we are (2026-09-08, after cuts 64-72 and the merge with main).  THE
DENOMINATORS MOVED**: main vendored `_pydecimal` and `test_decimal`, so the
stdlib corpus is 1592 top-level defs and 4621 class-body methods (was 1570 /
4427) and the test corpus 2809 / 14132 (was 2731 / 13550).  Compare shares,
not counts, against anything above this paragraph.

Of the stdlib's 1592 top-level defs **1551 (97.4%)** compile through IR; of
its 4621 class-body methods **4539 (98.2%)** are built through the seam; of
ALL 6417 defs **94.9%** go through IR.  The test corpus: **97.0%** of
top-level defs, **77.7%** of class methods, **79.7%** of all defs.

Item 4 is done (wt/d lane, cuts 64-66: nested defs, lambdas, `nonlocal`).
What refuses a class method now, in full: method-local classes (35), a
rebound receiver (10, all in the newly vendored `_pydecimal`), the
deliberately frame-sensitive calls (`dir` 5, `vars` 4, `exec` 3, `globals`,
`locals`, `eval`), async comprehensions (5), a default that reads a local
(4), and single digits below that.  Top-level: nested defs with a
pseudo-variable-named parameter or local (13), classes defined in a def (6),
frame-sensitive calls (4 + 4 + 3).

So the coverage work is essentially finished: what is left is method-local
classes (35 + 6), the `reservedName` nested defs (13 + 2), a rebound
receiver (10), and shapes that are frame-sensitive by design and belong on
the text path.  The next non-coverage cut is the position map for IR frames
-- see the section above.

A trap in re-measuring, recorded because it cost one wrong census: the
denominator is *modules compiled in the session*, and a `run_tests.sh` run
deploys the framework modules (committed canonical cache), after which a
census session takes cache HITS for most of the stdlib and counts 603
top-level defs instead of 1570.  `./install.sh` bumps the runtime generation
and invalidates the deployed set; run it, then the census, before anything
else touches the stone.  Compare denominators before comparing shares.

**What to do next, by defs unblocked** (stdlib counts; the test corpus ranks
them identically):

| # | blocker | stdlib defs | what it takes | status |
| ---: | --- | ---: | --- | --- |
| 1 | class-body methods | 4471 | a second seam in ClassDefAst: the class's methods are compiled at class-build time from source literals embedded in the emitted class statement, so IR needs a transport -- a class-side IR table plus an `___installIRMethod:` runtime call (original plan, step 5) | **opened, cut 36**: 851 of 4427 stdlib class methods (19.2%); **1685 (38.1%) after cuts 44-45**; the remaining method-only blockers are 1c below, the rest are the table's items 4-12 as they occur inside methods |
| 1a | methods on the varargs selector (`__init__`, any method with defaults / `*args` / keyword-only) | 1235 | run the cuts 40-43 prologue in method mode: the receiver is stripped, `positional` / `kwargs` are the two Smalltalk arguments, the selector is `_name:kw:`; the class-form default memo | **done, cut 44** |
| 1b | classes whose backing instVars are unknown at emit time | 1152 | the no-shadow rule was the TEXT's (a method temp shadowing an instVar is a source-compiler CompileError); IR leaves have no name resolution, so no check is needed at any time | **done, cut 45** |
| 1c | `__slots__` classes (266), `self.x(kw=...)` self-sends (143), module-function reads in methods (151), `self`-less receiver names (64), classmethod / staticmethod (61), classes not at module scope (34) | ~720 | slot instVar leaves in the builder; the varargs self-send; the dynamic-slot-first BoundMethod read shape; `cls`; class-side install; the closure-cell class path | **done but for method-local classes (35)**: varargs self-sends cut 49, module-function reads cut 50, `__slots__` cut 51 (+ annotated assignment cut 52), `super` / `__class__` / `type` reads cut 55, any receiver name cut 60, @classmethod cut 61, @staticmethod cut 67 |
| 2 | parameter defaults | 355 | the text's prologue: the def-time default memo, positional/kw binding, the missing-argument TypeErrors; the same emit as (3) | **done, cut 40** |
| 3 | `*args` / `**kwargs` / keyword-only | 169 | the varargs calling convention (`_f:kw:` selector, the `positional` / `kwargs` binding prologue) | **done**: `*args`/`**kwargs` cut 41, keyword-only cut 42, positional-only cut 43 |
| 4 | nested defs and lambdas | 239 (204 nested + 34 defs + 1 lambda as first refusal); after batch 11: 81 + 76 defs refuse on a nested def, 26 + 19 on a lambda | closures: a nested def is a block in the enclosing method; needs the PyFunction wrap and cell/temps capture | **in progress** (wt/d lane, `feat/ir-nested-defs`, cuts 64-66) |
| 5 | return / parameter annotations | 168 (+1140 methods) | the annotation statements are the def STATEMENT's / ClassDefAst's, never the method's -- an eligibility-only cut | **done, cut 47** |
| 6 | decorators | 46 (+353 methods) | Grail applies decorators OVER the compiled method, as text, on both seams -- an eligibility-only cut; it flushed out the name-keyed registration map (fixed: keyed by selector) | **done, cut 48** |
| 7 | late-bound module names | 32 | the text's `___moduleAttrLoad___:` fallback for a name neither local, module-var nor resolvable (a star import) -- the IR already emits that send for module names | **done, cut 35** |
| 8 | comprehensions / genexps | 30 (+~210 across the four node kinds in methods) | scoped locals in the builder (a target shadows a method temp), the outer-iterable hoist, the traceback-frame wrapper | **done, cuts 57-59** (wt/d lane): scoped locals (`withLocals:do:`), the hoisted outer iterable, chained filters, the traceback-frame wrapper; genexps reuse the generator machinery |
| 9 | generators / async | 24 (+139 methods) | the PythonGenerator / PythonCoroutine body wrapper (`___wrapsBody___`); a different method shape | **done, cuts 53-54** (wt/d lane): the wrapper block with `PythonReturn`, `yield` / `yield from` / `await`, `async for` / `async with` through the ForAst / WithAst hooks |
| 10 | `global` declarations | 12 (19 after batch 11) | module-route the declared names (dynamicInstVarAt:put:) | **done, cut 69** (with the walrus; cut 70 the pseudo-variable parameters, cut 68 Ellipsis / builtins as values / `raise Cls(kw=...)` / loop `else`) |
| 11 | call-site `*` splats | 9 (+89 methods; `**kw` 50 + 31) | the text's Array concatenation and the `update:` keyword merge | **done, cut 56**, together with starred tuple / list displays |
| 12 | the long tail | ~30 | flow refinements (5), pseudo-variable params (4), class defs inside a def (3), `super`/`__class__`/`type` reads (3), attribute/subscript aug-assign targets (5), chained assignment (3), builtin function as a value (2), complex literals (2), walrus (1), loop `else` (2), `raise Cls(kw=...)` (1), Ellipsis (1) | **done but for the frame-sensitive calls and method-local classes**: cuts 55 (`super` family), 62-63 (the two statement shapes), 68 (Ellipsis, builtins as values, `raise Cls(kw=...)`, loop `else`), 69 (`global`, walrus), 70 (pseudo-variable params), 71-72 (flow) |

Items 1a, 1b, 1c (but for method-local classes), 2, 3, 5, 6, 7, 8, 9, 10,
11 and 12 (but for the frame-sensitive calls, which stay on text by design)
are done, and so are the two statement shapes (cuts 62, 63) and the flow
refinements (cuts 71, 72).  What moves the headline number now is item 4,
nested defs and lambdas, in the wt/d lane (84 + 77 methods/defs on a nested
def, 26 + 19 on a lambda); after that, method-local classes (35 + 5).

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
