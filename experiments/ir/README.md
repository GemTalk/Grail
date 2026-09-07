# Direct-to-IR code generation experiments

Grail today parses Python to an AST, walks the AST to emit **Smalltalk
source**, and compiles that. These experiments explore skipping the Smalltalk
detour: build the compiler's IR (`GsCompilerIRNode` trees) directly and
compile with `GsNMethod class >> generateFromIR:` (primitive 679). The plan of
record is to eventually move Grail's codegen to this model.

All 14 scripts pass on `gs40` as of 2026-09-04. Four of them
(`02`, `10`, `11`, `12`) need a **loop/goto build** — see [The VM
change](#the-vm-change-fix-52060-landed-on-gemstone-main) — which now means any
GemStone main build of **2026-08-31 or later**, or the `grail-ir-loop-goto`
branch. Do not read this off `$GEMSTONE/version.txt`: the `gs40` product on this
machine reports `Build: 2026-08-28 ... (branch main)` yet runs all four, because
it is a *private* build made from the branch before the fix was upstreamed. The
reliable test is to run `02_break_continue.tpz` and look for `irBreak -> 5`.

Scripts run as a plain user (no SystemUser step):

```bash
source .setenv                             # gs40 product + PATH
topaz -l -S experiments/ir/00_setup.tpz    # once per (extent, user)
topaz -l -S experiments/ir/01_ladder.tpz   # any of the rest, in any order
```

`00_setup.tpz` puts `GsCompilerClasses` on the user's symbol list and is the
only script that commits. Everything else is self-contained and leaves nothing
committed.

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
| `02_break_continue.tpz` | **break/continue** via `GsComLoopNode` + `GsComGotoNode` + `GsComLabelNode` | passes on a loop/goto build: `irBreak -> 5`, `irContinue -> 45` |
| `10_srcmap_break.tpz` | capstone: break + Python source mapping together — break semantics exact (incl. immediate break), step points stay Python-accurate through the goto, post-loop DNU reports `line 7` | passes on a loop/goto build |
| `11_nested_loops.tpz` | nested while loops: each break/continue binds to ITS loop's labels, with inner gotos 3–4 inline levels deep (`irNested: 4 -> 14`) | passes on a loop/goto build |
| `12_builder_demo.tpz` + `PyIRBuilder.gs` | **the builder layer**: `PyIRBuilder` tracks the statement context, lexLevel, and a loop stack (so `break`/`continue` are one-word calls that target the innermost loop), and hides every bit-rot workaround; rebuilds the nested-loop method in ~25 lines of client code vs ~130 raw | passes on a loop/goto build |
| `13_env1_srcmap_builder.tpz` | `PyIRBuilder` driving the **production shape**: an env-1, source-mapped method whose traceback frame reports `(env 1) @2 line 2` | passes |
| anonymous do-it (see git history of `scratch_ir/`) | `_executeInContext:` without installing | passes |

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

## The VM change (Fix 52060, landed on gemstone main)

break/continue (`GsComLoopNode` + `GsComGotoNode` + `GsComLabelNode` — the
MagLev machinery, no Smalltalk-source equivalent) needs two comgen.c changes.
They were developed on gemstone branch `grail-ir-loop-goto`, verified by
`02_break_continue.tpz` and `10_srcmap_break.tpz` on a rebuilt server, and
**upstreamed to gemstone `main` on 2026-08-31 as Fix 52060** (`20c853e4c3`),
where both live in one `ab_getGenLevel` helper whose comment names
`generateFromIR:` as the reason. The two changes were:

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

**This is not optional for Grail, only for the probes.** The production IR path
uses all three node kinds (`PyMethodIRBuilder>>whileTrue:do:` and the
break/continue emits), so a Python `while` with a `break` compiled through IR
needs a loop/goto build too. That is why CI's 4.0 shard runs the
`gemstone/main:grail` container rather than a stock product, and why the 3.7.5
shard never exercises the path at all (`___irCodegenSupported___` is false
there).

Also fixed-by-design in the VM: `emitStore` (comgen.c) **unconditionally**
refuses stores to `COMPAR_METHOD_ARG_VAR`/`BLOCK_ARG_VAR` — no flag unlocks it
(`forceAllArgsTmpsToVc` and `setMethodArgDefault` do not). Assigning to a
Python parameter keeps the temp-shadow copy (`| xx | xx := x`) even at IR
level (`01_ladder.tpz` rungs 5–6 demonstrate both halves).

## Running the IR codegen tests

These probe scripts test hand-built IR. The *production* path
(`GRAIL_IR_CODEGEN`, wired into `importlib>>___buildModuleClassBody:name:`) is
tested two ways, and only the second one needs the flag in your environment.

### 1. The targeted class — runs by default, no env var

`IRCodegenSmokeTestCase` forces the flag on in its own `setUp`, imports
`tests/python/ir_codegen_smoke.py` cold, and restores the default in `tearDown`.
It is in `install.gs`, so **every `./scripts/run_tests.sh` and every CI run
already exercises the IR path.** It asserts four things: the functions return
what CPython returns, the method carries its Python source, an IR frame appears
in a traceback, and — the tripwire — that the path was actually taken:

    fallbacks = 0   and   compiled = 153        (the count as of cut 41)

That count is what catches a *silent* regression, where a def quietly becomes
ineligible and falls back to text while every behavioural assertion still
passes. It caught exactly that in cut 24 (71 vs 73). **Adding a fixture def
means bumping the expected count** -- and a def that is *meant* to stay on text
(the fixture's negative controls `maybe` and `drop_then_read`, which must keep
their UnboundLocalError guard) is excluded from it on purpose.

On a platform without IR support (3.7.x) the same test asserts the opposite: the
forced flag is a correct no-op, `compiled = 0`, `fallbacks = 0`.

### The census — how much real code goes through IR

`CENSUS.md` answers "how far along are we": with the flag forced, the seam
records why each top-level def of the vendored stdlib is or is not
IR-compiled (`FunctionDefAst>>___irIneligibilityReason___`, tallied by
`importlib ___irCensus___` while `importlib ___irCensusOn: true`), and the
report ranks the missing shapes by the defs they block. MIGRATION.md's roadmap
table is derived from it. Re-run after each batch: force the flag, turn the
census on, import the corpus, print `___irCensus___` (see the scripts described
in CENSUS.md).

### 2. The whole-suite sweep — the flag-on differential

With the flag set, every module's eligible top-level defs compile through IR, so
the whole suite becomes a differential test of IR against text. This is NOT in
CI; run it by hand:

```bash
./scripts/run_tests.sh                                        # flag-off: the real gate
GRAIL_TEST_COLD=1 GRAIL_IR_CODEGEN=1 ./scripts/run_tests.sh   # flag-on sweep
```

`GRAIL_TEST_COLD=1` is not optional. `run_tests.sh` normally runs
`deployFrameworks.gs` first, which cold-imports the frameworks and **commits**
them; its rebuild guard is a *source* hash, so the flag is invisible to it. Let
that deploy run flag-on and IR-built framework methods are committed into the
image, and the next flag-off run is silently measuring IR code.
`GRAIL_TEST_COLD=1` skips the deploy, so nothing is committed and each shard
compiles cold in-session — which also widens the IR surface under test.

Flag-off must be perfectly green; that is the gate. Flag-on has three known
residuals, all documented in `MIGRATION.md`: the inherent
`testTheTempsFastPathNeedsNoSource`, PEP 657 column spans for exceptions raised
inside IR frames, and a `test_recursion_raises_recursion_error` stack-geometry
flap.

The env var reaches the gem because the runner uses linked topaz (`topaz -lq`),
so the gem inherits the shell environment; it is registered in the passthrough
list in `os.gs`.

### Observability, and one trap

`importlib ___irStats___` answers `#compiled` / `#fallbacks` / `#lastError` for
the current session; `___irStatsReset___` zeroes them around a single import.
`importlib ___irCodegenSupported___` says whether this platform can honour the
flag at all (`PyMethodIRBuilder class>>supportedOnThisPlatform` builds and
generates a throwaway `^ 42`).

**The trap: do not commit while a fixture module is imported.**
`loadModuleFromPath:` registers the module instance and its source hash in the
canonical registries as well as putting it in `sys.modules`. Those are
`UserGlobals`, so within a non-committing test run they are just session state —
but a session that *does* commit (an MCP session, a stray deploy) makes the
fixture **deployed** on that stone for good. After that, the first import of any
later session warm-BINDS the committed instance instead of running the body
(so `compiled` stays 0 and `ALL_OK` passes vacuously), and the second raises:

    module 'ir_codegen_smoke' is canonical (deployed); it was removed from
    sys.modules in this session. Use importlib.reload() to re-execute it, ...

`IRCodegenSmokeTestCase` now heals this per session (`tearDown` restores a
registry snapshot and calls `PythonTestCase>>___forgetCanonicalModule___:`), so
a poisoned stone no longer breaks the suite. To cure the stone itself, run the
same purge and commit:

```smalltalk
(IRCodegenSmokeTestCase selector: #testIRPathWasActuallyTaken)
    ___forgetCanonicalModule___: 'ir_codegen_smoke'.
System commitTransaction
```

`./install.sh` also clears it, as a side effect of bumping
`GrailRuntimeGeneration`.

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

## The builder layer (`PyIRBuilder.gs`)

`PyIRBuilder` is the prototype of the production API an AST walker would
drive. It keeps three pieces of state a walker needs and raw nodes don't
provide: the **current statement context** (`add:` appends to the method or
the innermost open block), the **current lexLevel** (`inBlockDo:` opens and
closes block contexts), and a **loop stack** (`while:do:` pushes a
break-label/continue-label pair, so `break` and `continue` are one-word calls
that always target the innermost loop). All the kernel-builder workarounds
live inside it. Prototype limits: env 0, `UserGlobals`, line numbers only —
the production version compiles into env 1 and stamps Python source offsets
(the `at:`-variant constructors are the natural extension).

## Not yet explored

* `GsComPathNode` — deliberately skipped: it addresses fixed instVar offsets,
  and Grail's Python attributes are dynamic.
* ~~Wiring an IR-emitting path into `PythonAst` alongside the source-text
  one~~ — **done**: 24 cuts, merged in PRs #762 / #766 / #769. See
  `MIGRATION.md` for the per-cut log and what is still deferred (multi-clause
  except, keyword/varargs calls, comprehensions, f-strings, `with`).
* Performance comparison against the source-text path.
