# Concurrency and Multi-Session Safety

This document tracks Grail's approach to running safely across multiple
concurrent GemStone sessions. The central problem is that GemStone class
instance variables (`classInstVars`) and class variables (`classVars`) live
in the committed repository and are shared across all sessions. Any session
that writes one of these slots and commits creates a write-write conflict
with any other session that did the same since their shared checkpoint.

## Background: GemStone session model

Each Gem process runs in its own OS process but shares the committed object
store. State falls into three categories:

| Category | Scope | Risk |
|---|---|---|
| Instance variables on committed objects | Shared across sessions | Write conflicts if mutated at runtime |
| Class instance variables (`classInstVars`) | Shared across sessions | Write conflicts if mutated at runtime |
| `SessionTemps` entries | Per-gem process, never committed | Safe for any mutable runtime state |

The rule: **mutable state that changes during normal Python execution must
live in `SessionTemps`, not in classInstVars.** Configuration that is written
once at install time and never changed again is safe as a classInstVar.

## Audit result (2026-06-08)

All classInstVars and classVars in the Grail source were reviewed and
classified by risk level.

### Tier 1 — Fixed (concrete commit conflicts)

These were mutable classInstVars written during normal Python execution;
they have been moved to `SessionTemps`.

#### `ModuleAst` — compilation counters

`execCounter`, `evalCounter`, `doitCounter` were classInstVars used to
generate unique filenames for codegen-trace captures. Any two concurrent
sessions that compiled Python code would both write the same three slots
and conflict on commit.

**Fix:** `nextSeqFor:` now reads and writes SessionTemps keys
`___grailExecCounter___`, `___grailEvalCounter___`, `___grailDoitCounter___`.
Each gem process gets an independent counter sequence. The classInstVar
declarations were removed from `ModuleAst`.

**Regression test:** `ImportlibTestCase >> testCompilationCountersLiveInSessionTempsNotCommitted`

#### `importlib` — codegen-trace directory cache

`codegenTraceDir` and `codegenTraceDirChecked` cached the value of the
`GRAIL_CODEGEN_TRACE_DIR` gem environment variable. Storing this in a
classInstVar was wrong in two ways: (1) if session A read the env var and
committed `codegenTraceDirChecked := true`, session B would find the cached
value without reading its own environment; (2) two concurrent sessions
writing the slot would conflict.

**Fix:** `___codegenTraceDir___` now caches in SessionTemps under
`___grailCodegenTraceDir___` / `___grailCodegenTraceDirChecked___`.
`___codegenTraceDirInvalidate___` removes both SessionTemps keys.
The two classInstVar declarations were removed from `importlib`
(leaving only `grailDir`, which is write-once deployment config).

**Regression test:** `ImportlibTestCase >> testCodegenTraceDirLivesInSessionTempsNotCommitted`

#### `CPythonShim` — C shim singleton

`current` held the singleton `CPythonShim` instance, which wraps
`CByteArray` buffers backed by malloc'd C memory. C memory is local to an
OS process, so the committed singleton holds dead pointers after a session
restart. The workaround (`(System hasUserAction: #shimCall) not` check)
handled the restart case but didn't prevent write conflicts between two
concurrent sessions both initializing the shim.

`CPythonLibrary` already solved this correctly with `SessionTemps`.
`CPythonShim` now follows the same pattern.

**Fix:** `current` stores the singleton in `SessionTemps at: #CPythonShim`.
The session-restart guard is preserved. `ensureLoaded` was renamed
`ensureLoaded: aShim` and takes the instance as a parameter rather than
reading the (now-removed) classInstVar. `reset`, `isActive`, and
`libraryPath:` were all updated. The `current` classInstVar declaration
was removed.

**Regression test:** `CPythonShimTestCase >> testShimSingletonLivesInSessionTempsNotCommitted`

### Tier 2 — Design risk (no fix yet, tracked here)

These are correct for the current single-session development model but
will need attention before running concurrent production sessions.

#### `sys.modules` — module registry

`sys` holds `modules` (a `SymbolDictionary`) as a classInstVar. It is
pre-populated at install time with references to committed built-in module
singletons, making the read path safe. The write path is not: `import
someUserModule` from running Python code modifies this dict. Two sessions
doing dynamic imports will conflict.

**Planned fix:** Session-local overlay — keep the committed baseline for
built-ins; store per-session dynamic imports in SessionTemps. The committed
`modules` classInstVar becomes an "installed modules" registry; `sys >>
modules` returns a session-local `SymbolDictionary` pre-populated from it.

#### `module.instance` — module singleton per class

Every module subclass inherits `instance` (a classInstVar from `module`).
For built-in modules this is set during `install.sh` and never touched
again — safe. The risk is narrower: if two sessions simultaneously `import`
the same user-defined module for the first time (first access after a fresh
install that didn't pre-run it), both create an instance and conflict on
the classInstVar. The `___adoptInstance___:` pattern prevents the
double-initialization race within a single session but not across sessions.

#### `numbers_Number.registeredTypes` — ABC registration

Set by `registerBuiltinTypes` during `numbers >> initialize`, which runs at
install time. All registered types are committed classes (Integer, Float,
etc.), so the set is stable after install. The risk is latent: CPython
supports `numbers.Integral.register(MyClass)` from user code. Two sessions
doing this at runtime would conflict.

### Tier 3 — Acceptable as committed state

These classInstVars are safe because they are truly write-once after install
or hold immutable singletons.

| Variable | Why it's safe |
|---|---|
| `importlib.grailDir` | Set once by `install.sh`, never modified at runtime |
| `NoneType.instance` | Immutable singleton; set at install |
| `PyTimezone._utc` | Immutable UTC timezone; set on first access, never changes |
| `AbstractNode.escapeCharacters` | Constant lookup table |
| `CPythonLibrary.libraryPath` etc. | Deployment configuration; write-once |

### Latent risk — `CallAst` compile-time context

`CallAst` has ten classInstVars used as thread-local-like storage during
code generation (`moduleClassBeingCompiled`, `classBeingCompiled`, etc.).
These are cleared in `ensure:` blocks at compilation boundaries, so they
are nil at every commit point during normal operation. The latent risk is
a VM-level crash (not a Smalltalk exception) mid-compilation leaving
non-nil state committed. This is low probability and has no fix today;
a future defensive measure would be a class-side `verifyClean` assertion
in tests confirming all ten vars are nil after every compilation round-trip.

## SessionTemps key registry

To avoid key collisions across modules, all Grail SessionTemps keys follow
the `___grailXxx___` naming convention. Current keys:

| Key | Owner | Purpose |
|---|---|---|
| `#CPythonShim` | `CPythonShim` | Shim singleton for this gem |
| `#CPythonLibrary` | `CPythonLibrary` | Embedded CPython library handle |
| `#grailImportBackend` | `CPythonShim` / `EmbeddedExtensionModule` | Backend selector (`#shim` or `#embedded`) |
| `#'___grailExecCounter___'` | `ModuleAst` | Per-session exec compilation counter |
| `#'___grailEvalCounter___'` | `ModuleAst` | Per-session eval compilation counter |
| `#'___grailDoitCounter___'` | `ModuleAst` | Per-session doit compilation counter |
| `#'___grailCodegenTraceDir___'` | `importlib` | Cached `GRAIL_CODEGEN_TRACE_DIR` value |
| `#'___grailCodegenTraceDirChecked___'` | `importlib` | Whether the env var has been read this session |
| `#'___GrailRandomGenerator___'` | `random` | Per-session Mersenne Twister state |
| `#'___GrailSecretsGenerator___'` | `secrets` | Per-session CSPRNG state |
| `#PythonStoreRootsMap` | `PythonStore` | IncRef'd PyObject roots map |
| `#'___GrailSessionDict___*'` | `gemstone` | Per-session `SessionDict` backing stores (one key per dict) |
| `ExecBlockAttrs` | `ExecBlockAttrs` | Per-session exec-block attribute dictionary |
