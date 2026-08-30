# Direct-to-IR code generation experiments

Grail today parses Python to an AST, walks the AST to emit **Smalltalk
source**, and compiles that. These experiments explore skipping the Smalltalk
detour: build the compiler's IR (`GsCompilerIRNode` trees) directly and
compile with `GsNMethod class >> generateFromIR:` (primitive 679). The plan of
record is to eventually move Grail's codegen to this model.

All results below are from **GemStone 4.0 built from gemstone branch
`grail-ir-loop-goto`** (`gs40`); everything except `02` and `10` also passes
on the stock 2026-08-28 build. Scripts run as a plain user (no SystemUser
step): `topaz -l -S experiments/ir/<n>.tpz` with this checkout's `.topazini`.
Run `00_setup.tpz` once per (extent, user); everything else is self-contained
and leaves nothing committed.

## What works

| script | demonstrates | result |
| --- | --- | --- |
| `01_ladder.tpz` | literal return, expression sends, args, IR-method calling IR-method | all pass |
| `04_while_plain.tpz` | inlined `whileTrue:` loop (send node + `controlOp`) | passes |
| `03_srcmap.tpz` | **Python source mapping** | passes — see below |
| `05_real_blocks.tpz` | real (non-inlined) blocks: a `do:` block that WRITES a method temp, a closure returned from its frame, and `on:do:` (the try/except shape) with a literal-variable global (`Globals associationAt: #ZeroDivide`) | all pass |
| `06_env1.tpz` | env-1 method (envInfo ivar = `bodyEnv \| (selectorEnv << 8)` = 257) installed in the env-1 method dict, reached from an env-0 method whose send node has `environment: 1` | passes |
| `07_array_builder.tpz` | `GsComArrayBuilderNode` — the `{ }` construct Python tuple/list literals lower to | passes |
| `08_srcmap_loop.tpz` | source mapping through control flow: multi-line Python source on a method with an inlined while loop; all 11 step points map to exact Python offsets and a DNU in the loop body reports `line 6` | passes |
| `09_misc_nodes.tpz` | `GsComCascadeNode` (sends with nil rcvr), and NON-LOCAL return (`returnFromHome:`) out of a real `do:` block — what Python `return` inside a lowered handler block needs | passes |
| `02_break_continue.tpz` | **break/continue** via `GsComLoopNode` + `GsComGotoNode` + `GsComLabelNode` | passes on a `grail-ir-loop-goto` build: `irBreak -> 5`, `irContinue -> 45` |
| `10_srcmap_break.tpz` | capstone: break + Python source mapping together — break semantics exact (incl. immediate break), step points stay Python-accurate through the goto, post-loop DNU reports `line 7` | passes on a `grail-ir-loop-goto` build |
| `12` (anonymous, see git history of `scratch_ir/`) | `_executeInContext:` without installing (do-it shape) | passes |

Notes from `05`/`06`:

* **Variable capture needs nothing from the IR producer.** A block that reads
  or writes an enclosing method temp just references the SAME `GsComVarLeaf`;
  `analyzeBlocks` computes variable-context placement itself. Block args are
  `blockArg:argNumber:forBlock:` (BLOCK_ARG, the block's lexLevel).
* `GsComMethNode>>bodyEnv:`/`selectorEnv:` are more builder bit-rot: they
  compute the new `envInfo` and return it **without assigning** — set the
  `envInfo` ivar directly.
* `Behavior>>persistentMethodDictForEnv: 1 put:` is a protected primitive; the
  supported way to create the env-1 dict is compiling any stub with
  `compileMethod:...environmentId: 1`, then `at:put:` into the fetched dict.

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

## The VM change (gemstone branch `grail-ir-loop-goto`, VERIFIED)

break/continue (`GsComLoopNode` + `GsComGotoNode` + `GsComLabelNode` — the
MagLev machinery, no Smalltalk-source equivalent) needs two comgen.c commits,
both on gemstone branch `grail-ir-loop-goto` and both verified by
`02_break_continue.tpz` and `10_srcmap_break.tpz` on a rebuilt server:

* `e771706172` restores `ab_LabelNode`/`ab_LoopNode`/`ab_GotoNode`, which the
  2023 Ruby/Maglev cleanup (`fa1c812425`) deleted from the `analyzeBlocks`
  pre-pass, stubbing the call sites with "Unsupported loop node" logicErrors.
  The emit-phase functions (`emitLoopNode`/`emitGotoNode`/`emitLabelNode`,
  ~4397–4511) had never been removed.
* `e550730112` fixes a bug that predates the deletion: the restored functions
  stamped goto/label cData with the raw `srcLexLevel`, under which no goto
  could ever match its label once the Smalltalk-only `analyzeBlocks` rewrite
  counted inline blocks as source levels (so the deleted code was already
  dead). They now stamp the nearest enclosing REAL (non-inline) frame — the
  identity `emitGotoNode`'s `inSameGenBlock` actually means. A goto in a real
  closure targeting an outer label still correctly mismatches.

This branch is the candidate PR to the GemStone core team.

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

* `GsComPathNode` — deliberately skipped: it addresses fixed instVar offsets,
  and Grail's Python attributes are dynamic.
* `lexLevel` > 2 nesting; `continue` in a loop nested inside another loop
  (two LoopNodes, gotos targeting the right labels).
* A `PyIRBuilder` layer in Grail wrapping node construction (and hiding the
  builder bit-rot workarounds), then lowering a first real PythonAst node.
* Performance comparison against the source-text path.
