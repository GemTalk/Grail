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
