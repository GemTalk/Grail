# Direct-to-IR code generation experiments

Grail today parses Python to an AST, walks the AST to emit **Smalltalk
source**, and compiles that. These experiments explore skipping the Smalltalk
detour: build the compiler's IR (`GsCompilerIRNode` trees) directly and
compile with `GsNMethod class >> generateFromIR:` (primitive 679). The plan of
record is to eventually move Grail's codegen to this model.

All results below are from **GemStone 4.0 build 2026-08-28** (`gs40`), scripts
run as a plain user (no SystemUser step): `topaz -l -S experiments/ir/<n>.tpz`
with this checkout's `.topazini`. Run `00_setup.tpz` once per (extent, user);
everything else is self-contained and leaves nothing committed.

## What works today (stock 4.0)

| script | demonstrates | result |
| --- | --- | --- |
| `01_ladder.tpz` | literal return, expression sends, args, IR-method calling IR-method | all pass |
| `04_while_plain.tpz` | inlined `whileTrue:` loop (send node + `controlOp`) | passes |
| `03_srcmap.tpz` | **Python source mapping** | passes — see below |
| `12` (anonymous, see git history of `scratch_ir/`) | `_executeInContext:` without installing (do-it shape) | passes |

The pipeline: build a `GsComMethNode`, `GsNMethod generateFromIR:`, then either
run it anonymously (`_executeInContext:`) or install it —
`(cls persistentMethodDictForEnv: 0) at: sel put: meth` followed by
`Behavior _clearLookupCaches: 0`.

**Oracle**: after any normal source compile,
`(System __sessionStateAt: 19) printString` prints the IR the Smalltalk
compiler produced for it. Every hand-built shape here was cribbed from that.

### Source mapping (the headline result)

`03_srcmap.tpz` attaches Python text as the method's source
(`fileName: 'bump.py' source: pySrc`) and points every node's `srcOffset` into
that text. With no mapping layer of any kind:

* `meth sourceString` answers the Python text;
* `meth _sourceOffsets` / `_sourceOffsetsOfSends` answer step points and send
  sites as offsets into the Python text;
* a runtime error's stack report prints `GrailIRScratch >> irPy: @4 line 3` —
  the **Python** line of `return len(y)`.

So step points, the debugger, and stack reports natively speak Python
positions. This removes the whole Smalltalk→Python back-mapping problem
(cf. the `_gsStack` native-ip work in PR #710).

## What needs a VM change

`02_break_continue.tpz` builds `while` loops containing `break`/`continue` as
`GsComLoopNode` + `GsComGotoNode` + `GsComLabelNode` — the MagLev machinery,
with no Smalltalk-source equivalent. Generation fails with **"Unsupported loop
node"**: the emitters survive (`emitLoopNode`/`emitGotoNode`/`emitLabelNode`,
`src/comgen.c` ~4397–4511) but the `analyzeBlocks` pre-pass was rewritten
without those node kinds — `ab_ForValue`/`ab_ForEffect` hard-error on
`COMPAR_LOOP_NODE`/`GOTO`/`LABEL` (`comgen.c` ~9905–9917, ~10009–10016).
Teaching `ab_*` the three kinds should re-enable them; the script is the probe
(expected output once fixed: `irBreak -> 5`, `irContinue -> 45`).

Also fixed-by-design in the VM: `emitStore` (comgen.c) **unconditionally**
refuses stores to `COMPAR_METHOD_ARG_VAR`/`BLOCK_ARG_VAR` — no flag unlocks it
(`forceAllArgsTmpsToVc` and `setMethodArgDefault` do not). Assigning to a
Python parameter keeps the temp-shadow copy (`| xx | xx := x`) even at IR
level (`01_ladder.tpz` rungs 5–6 demonstrate both halves).

## Builder-class bit-rot (workarounds in every script)

The Smalltalk-side builder classes were last exercised by MagLev, and two
entry points are broken in 4.0 builds through at least 2026-08-28:

* `GsComMethNode>>selector:` sends `self envId`, which does not exist.
  Workaround: assign the `selector` ivar directly (`instVarAt:put:`;
  note `allInstVarNames` holds Symbols).
* `GsComSendNode>>stSelector:` reads `SpecialSendsDict` through a **stale
  association**: the kernel method's literal binds a nil-valued association
  from the image build, while `_classVars` holds a different, populated one.
  Workaround: assign `selLeaf` := the bare selector Symbol (that IS the
  non-optimized-send representation) and `envFlags` := 0.

`controlOp` on send nodes must be set by the IR producer (comgen only reads
it); take the values from `GsCompilerIRNode _classVars` (e.g.
`COMPAR_WHILE_TRUE`), never hardcode.

Both breakages are image-side, not VM-side, so a future Grail builder layer
can also simply avoid the broken convenience methods, as these scripts do.

## Not yet explored

* `GsComBlockNode` as a real (non-inlined) block; `lexLevel` > 2 nesting.
* Exceptions (`on:do:` shapes), `GsComCascadeNode`, `GsComPathNode`,
  `GsComArrayBuilderNode`, env-1 selectors on send nodes (Grail runs in env 1).
* Performance comparison against the source-text path.
