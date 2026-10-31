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
tested two ways. Since cut 131 it is ON by default, so neither needs the flag
set; what needs the variable now is running the TEXT path (`GRAIL_IR_CODEGEN=0`).

### 1. The targeted class — runs by default, no env var

`IRCodegenSmokeTestCase` forces the flag on in its own `setUp`, imports
`tests/python/ir_codegen_smoke.py` cold, and restores the default in `tearDown`.
It is in `install.gs`, so **every `./scripts/run_tests.sh` and every CI run
already exercises the IR path.** It asserts four things: the functions return
what CPython returns, the method carries its Python source, an IR frame appears
in a traceback, and — the tripwire — that the path was actually taken:

    fallbacks = 0   and   compiled = 163        (the count as of cut 43)

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
table is derived from it.

Re-run it after each batch, from the project root, into a scratch directory:

```bash
./install.sh                      # FIRST -- see the warning below
D=/tmp/census; mkdir -p $D
source .setenv
topaz -lq -C "$CFG" -S experiments/ir/census_stdlib.tpz   > $D/census_stdlib.out
topaz -lq -C "$CFG" -S experiments/ir/census_tests_00.tpz > $D/census_tests_00.out
topaz -lq -C "$CFG" -S experiments/ir/census_tests_01.tpz > $D/census_tests_01.out
topaz -lq -C "$CFG" -S experiments/ir/census_tests_02.tpz > $D/census_tests_02.out
python3 experiments/ir/census_report.py $D                # WRITES CENSUS.md itself
```

with `CFG="GEM_TEMPOBJ_CODE_SIZE=300000;GEM_TEMPOBJ_CACHE_SIZE=900000;"`. The
whole thing is about two minutes.

Three things about it are easy to get wrong, and each produces a plausible wrong
board rather than an error:

* **`./install.sh` FIRST.** A `run_tests.sh` framework deploy commits the heavy
  modules, and a committed module is a cache hit that the census never sees
  compile — measured once as 603 stdlib defs where the true figure is over 1500.
* **`census_report.py` WRITES `CENSUS.md`.** It takes the scratch directory as
  its argument and prints a summary to stdout; never redirect that stdout onto
  the board.
* **The test corpus needs all three shards.** They are round-robin over
  `scripts/cpython_suite_manifest.txt`, read at run time, three sessions because
  one cannot hold the manifest. The report refuses to run if it finds no
  `census_tests_0*.out`, because a board written from corpus 1 alone silently
  replaces the corpus-2 half with nothing.

The split itself does not matter: every session compiles the stdlib its own
modules import, so a module reached from two shards is measured in both, and the
report builds its totals from the per-module rows taking each module ONCE.
Summing the session totals instead — which is what earlier boards did —
overstated the test corpus by about half. Verified by running a two-shard split
against the three-shard one: the boards are identical line for line apart from
the example names, which importlib caps at five per reason per session and which
are illustrative only.

### 2. The whole-suite sweep — the differential against text

With IR on, every module's eligible top-level defs compile through IR, so the
whole suite becomes a differential test of IR against text. Since cut 131 that
is simply what `ci.yml` runs, because IR is the default. `ci.yml`'s `test-main`
runs BOTH arms on every pull request and merge-queue entry -- the default (IR)
and `GRAIL_IR_CODEGEN=0` (text) -- and both are gated by `ci-complete`; each leg
also runs `tests/github/ir_seam_control.gs` to prove its arm really ran. (Before
that, the IR arm had its own workflow, `ir-flag-on.yml` from #1148, which ran in
the merge queue but was not a required check.) By hand, the text arm is the one
that needs asking for:

```bash
./scripts/run_tests.sh                                        # IR (the default since cut 131)
GRAIL_TEST_COLD=1 ./scripts/run_tests.sh                      # IR, cold frameworks
GRAIL_IR_CODEGEN=0 ./scripts/run_tests.sh                     # the text path, for a comparison
```

`GRAIL_TEST_COLD=1` is not optional. `run_tests.sh` normally runs
`deployFrameworks.gs` first, which cold-imports the frameworks and **commits**
them; its rebuild guard is a *source* hash, so the flag is invisible to it. Let
that deploy run flag-on and IR-built framework methods are committed into the
image, and the next flag-off run is silently measuring IR code.
`GRAIL_TEST_COLD=1` skips the deploy, so nothing is committed and each shard
compiles cold in-session — which also widens the IR surface under test.

Both arms must be perfectly green; that is the gate. The recursion checks that
used to flap under IR on a Mac (`test_recursion_raises_recursion_error`'s
mutual case, and the private-name recursion) are a GemStone VM defect, Kermit
52108: `resignalAs:` from the stack-overflow handler can re-trip the limit in
the INTERPRETER. They are skipped on interpreted gems -- every Darwin arm64 gem
-- and still run where native code is on, which is what CI runs.

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

## Module body at scale (P0.7)

`15_module_body_scale.tpz` is the spike the IR-only codegen plan calls P0.7.
It asks whether ONE IR method can carry a module body as large as the largest
generated `initialize`, and measures memory, build time and the position map
against the text path. It needs an installed Grail. Measured on 4.0.0.a8,
Darwin arm64, 2026-10-30. Each configuration ran in its own process, three
times, with the 1-minute load average between 1 and 2.

### What the largest module bodies hold today

From `P07_MODS=...`. A module body is one text `initialize` whose class
statements are blocks, so the code is spread over many methods. Its source is
mostly STRING LITERALS: the method source each class statement compiles at
run time (`___compileMethod:`, `___irInstallDef:...or:`, the `___irTextSources___`
and table methods).

| module | `initialize` source | .py | home literal frame | distinct strings | of which translated method source | largest string | methods | step points (all / home) | words (all / home) | map |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| test.test_typing | 18.55 MB | 398 KB | 12,393 | 2,828 / 17.2 MB | 16.2 MB (94%) | 239 KB | 220 | 12,361 / 886 | 45,857 / 3,172 | 10.9 KB |
| _pydecimal | 2.50 MB | 230 KB | 3,358 | 954 / 2.22 MB | 1.87 MB (84%) | 242 KB | 141 | 3,449 / 400 | 13,136 / 1,649 | 5.0 KB |
| argparse | 1.84 MB | 110 KB | 3,204 | 673 / 1.58 MB | 1.37 MB (86%) | 243 KB | 157 | 3,234 / 112 | 11,691 / 373 | 1.0 KB |
| typing | 1.26 MB | 136 KB | 4,680 | 940 / 0.92 MB | 0.70 MB (76%) | 56 KB | 161 | 5,646 / 1,129 | 19,726 / 4,126 | 10.6 KB |

So the plan's "~900 KB" was too small by 20x in the test corpus. It is also
the wrong measure. Source bytes are mostly literals that P4.6 removes. What
limits one method is its CODE (words, step points) and its string-literal
slots.

### The synthetic body

There is no IR module-body emitter yet, so the body is a single def whose
statements store to module slots through `global`. That is the `#module`
routing P4.2 reuses, emitted by the def-body emitters every IR def already
uses. Both arms compile it as one home method; text also puts each call in a
block. Two shapes:

* `payload`: N calls `reg('<distinct L-char string>', 'Grail-Class Methods', i)`,
  the shape of a class statement today. At N=4000, L=2860 that is 8,000
  string slots and 11.6 MB of strings.
* `code`: N statements cycling arithmetic assignment, a list display, a
  conditional call and a call. Executable code with small literals.

### Two limits, both per method

**1. Past about 12k words, a method loses its traceback frame, on BOTH arms.**
Somewhere between 11k and 12.3k words the generated method grows by 20-25% in
one step, and the kernel can then no longer read its debug info.
`GsNMethod >> _debugInfoAccess:at:` fails (`ArgumentError` 2258, arguments
`(3, 91312)`, from `_previousStepPointForIp:`), so even GemStone's
`stackReportToLevel:` raises. Grail's traceback walk drops the frame
silently: the traceback shows the caller and the exception, and nothing for
the method that raised.

| arm | last size that keeps its frame | first that loses it |
| --- | --- | --- |
| IR, `code` | 620 statements, 12,265 words, 3,727 steps | 640, 15,221 words |
| IR, `payload` | 580 statements, 11,035 words | 590, 14,175 words |
| text, `code` | 690 statements, 11,078 home words | 700, 13,159 home words |

It is not the literal count: `code` keeps its frame at 1,255 literals, and
`payload` loses it at 1,189. Today's text bodies stay under it only because
every class statement and call is its own block method. The largest home
method above is 4,126 words. A def this size loses its frame today too, on
either arm.

**2. More than 8,192 string-literal slots in one method fails the IR build.**
`generateFromIR:` answers error 1057, `emitInstr_s1 operand exceeds short`.
Nothing falls back to text, so the import raises.

| shape | builds | fails |
| --- | --- | --- |
| `payload` | 4,090 statements, 8,180 strings | 4,100, 8,200 strings |
| `code` | 8,150 statements, 8,151 strings (20,371 literals, 48,908 steps, 197,644 words) | 8,250 |

It is the STRING count (2^13), not literals, steps, words or source size. The
text compiler has no such limit: it built 48,000 string slots in one frame.
test.test_typing's home frame holds 5,157 string slots today, so even
carrying today's literals one IR method would build.

**No limit on literal or source size was reached.** IR built a method with
11.8 MB of attached source, and one with two 6 MB string literals. Text
refuses the latter (`ArgumentTypeError` 2094: string literals are capped at
5,000,000 characters). This answers the literal-size question in P3.1's spike
note.

### Cost, IR against text, where both build

The build time is the module load minus the parse, which both arms share.
Temp is `System _tempObjSpaceUsed` after the load, against a scavenged start.
RSS is the process peak (`/usr/bin/time -l`), with the parse-only run of the
same source in brackets. Each cell gives the range over three runs.

| body | arm | build ms | temp MB | peak RSS MB | attached source | map | far-end traceback, cold / warm ms |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| payload 1000 x 2860 (2.9 MB strings, about _pydecimal's) | IR | 610-650 | 30.2 | 472 (277) | 2.94 MB | 30.2 KB | frame lost (limit 1) |
| | text | 1,570-1,610 | 47.3 | 491 (277) | 8.93 MB | 30.6 KB | 4,166-4,191 / 6-7 |
| payload 4000 x 2860 (11.6 MB, the most IR builds) | IR | 2,940-2,960 | 55.5 | 503 (316) | 11.8 MB | 130 KB | frame lost |
| | text | 11,820-11,910 | 122.5 | 607 (316) | 35.8 MB | 135 KB | frame lost |
| code 600 (under limit 1) | IR | 132-135 | 10.3 | 437 (283) | 84 KB | 59 KB | 101 / 7-8 |
| | text | 129-130 | 9.8 | 420 (283) | 220 KB | 40 KB | 129-132 / 8 |
| code 4000 | IR | 1,320-1,325 | 38.1 | 483 (308) | 630 KB | 451 KB | frame lost |
| | text | 1,537-1,543 | 34.8 | 483 (308) | 1.54 MB | 296 KB | frame lost |

* **IR builds 2.5-4x faster when literals dominate**, as they do in real
  module bodies. It is within 3% of text on code-shaped bodies: 14% faster at
  `code` 4000 and 3% slower at `code` 600. It carries a third to two-fifths of
  the attached source, because that source is the Python, not the Smalltalk.
* **IR needs less temp memory for literal-heavy bodies.** At `-T 400000` both
  arms build payload 4000. At `-T 200000` IR still builds and text fails with
  `AlmostOutOfMemoryError`. The memory failure cut 92 recorded on `test_set`
  was not reproduced (cut 128 traced it to a per-class leak in both arms).
* **Build time grows faster than linearly with the size of one method, on both
  arms.** `payload` loads (to the failure, for IR past 4,090): IR 1.1 s at 1k
  statements, 8.0 s at 6k, 22.6 s at 12k and 73.5 s at 24k; text 2.0, 26.2,
  87.7 and 320.6 s. That is another reason to keep methods small.
* **The position map grows linearly**: about 30 bytes per `payload`
  statement on both arms, and 99-113 bytes per `code` statement on IR against
  66-74 on text. IR records more spans.
  Finding it costs the map's length, not the source's
  (`___positionMapMarkerIn___:`). The text arm's 4.2 s cold far-end lookup at
  payload 1000 is its `___curPos___` scan through `_sourceAtIp:` on an 8.9 MB
  source. IR has no such scan.

### What this means for P4

One IR method can be BUILT at the scale of today's largest module body, even
carrying today's literals. It builds faster and in less memory than the text.
It cannot be USED at that scale: the largest bodies' code is 13k-46k words
(the "words, all" column) against a traceback limit of about 12k. The 8,192
string-slot limit is a second ceiling for any body that still carries
literals.

So P4 should build several methods, not one. P4.1's statement seam is the end
state, not a stepping stone:

* `initialize` is a short list of sends.
* Each class statement gets its own method (the P3.2 helper).
* Consecutive simple statements are grouped under a budget that is checked on
  the GENERATED method, where the numbers are cheap to read. For example, at
  most 8,000 words (`basicSize`), 2,000 step points (`_numSourceOffsets`) and
  4,000 string slots, splitting a group that exceeds it.

Use methods rather than blocks: in 4.0 a block shares its home method's
literal frame, so blocks would not lift the string limit.

The budget belongs in the IR builder for defs too. Both limits apply to any
generated method, and today the first one fails silently. A guard that raises
when a generated method is past it would turn a lost frame into an error.

### Reproducing

```bash
# one configuration; a fresh process each, so RSS and temp belong to it
P07_KIND=payload P07_N=4000 P07_L=2860 [GRAIL_IR_CODEGEN=0] [P07_PARSEONLY=1] \
  /usr/bin/time -l topaz -lq -T 2000000 -C "GEM_TEMPOBJ_CODE_SIZE=300000;" \
    -S experiments/ir/15_module_body_scale.tpz
# the real modules
P07_MODS='_pydecimal argparse typing test.test_typing' \
  topaz -lq -T 2000000 -C "GEM_TEMPOBJ_CODE_SIZE=300000;" \
    -S experiments/ir/15_module_body_scale.tpz
```
