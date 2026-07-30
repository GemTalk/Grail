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

### Tier 2 — Design risk (all fixed by the 2026-07-12 session-state refactor, commit `2900b14f`)

These were correct for the single-session development model but needed
attention before running concurrent production sessions. All three have
since been moved to SessionTemps.

#### `sys.modules` — module registry

`sys` held `modules` (a `SymbolDictionary`) as a classInstVar. It was
pre-populated at install time with references to committed built-in module
singletons, making the read path safe. The write path was not: `import
someUserModule` from running Python code modified this dict. Two sessions
doing dynamic imports would conflict.

**Fixed:** `sys >> modules` now returns a session-local `SymbolDictionary`
stored in SessionTemps (`#GrailSysModules`), populated with the built-in
modules on first access. The `modules` classInstVar declaration remains but
is unused.

#### `module.instance` — module singleton per class

Every module subclass inherited `instance` (a classInstVar from `module`).
If two sessions simultaneously imported the same user-defined module for
the first time, both created an instance and conflicted on the classInstVar.

**Fixed:** module singletons now live in a SessionTemps registry
(`#GrailModuleInstances`), and the `instance` classInstVar was removed
entirely (commit `c82923a6`, 2026-07-12) so a module-level Python global
has no committed slot to persist to.

#### `numbers_Number.registeredTypes` — ABC registration

Set by `registerBuiltinTypes` during `numbers >> initialize`. CPython
supports `numbers.Integral.register(MyClass)` from user code; two sessions
doing this at runtime would conflict on the classInstVar.

**Fixed:** registrations now live in SessionTemps
(`#GrailNumbersRegistry`, keyed per ABC class). The classInstVar
declaration remains but is unused.

### Tier 3 — Acceptable as committed state

These classInstVars are safe because they are truly write-once after install
or hold immutable singletons.

| Variable | Why it's safe |
|---|---|
| `NoneType.instance` | Immutable singleton; set at install |
| `CPythonLibrary.libraryPath` etc. | Deployment configuration; write-once |

Three entries originally listed here have since changed: `importlib.grailDir`
moved to SessionTemps (`#GrailDir` — the path differs per host/checkout, and
the lazy write dirtied the committed class), `PyTimezone._utc` moved to
SessionTemps (`#GrailTimezoneUtc`, same reason), and
`AbstractNode.escapeCharacters` was removed outright (commit `c82923a6`).

### Latent risk — `CallAst` compile-time context (since fixed)

`CallAst` had ten (later 19) classInstVars used as thread-local-like storage
during code generation (`moduleClassBeingCompiled`, `classBeingCompiled`,
etc.). These were cleared in `ensure:` blocks at compilation boundaries, so
they were nil at every commit point during normal operation — but any two
sessions that each compiled Python and both committed still collided on the
cleared slots.

**Fixed** (2026-07-14, commit `283f086f`): the whole compile context moved
to a SessionTemps-backed store (`#GrailCompileContext`, accessed via
`CallAst class >> ___compileContext___`), eliminating both the latent
mid-compilation-crash risk and the real any-two-compiling-sessions commit
conflict. The classInstVar declarations were removed.

## SessionTemps key registry

To avoid key collisions across modules, the keys from the original audit
follow the `___grailXxx___` naming convention; keys added by later work
use a shorter `GrailXxx` form. Keys as of the 2026-06-08 audit:

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
| `#'___ExecBlockAttrsTable___'` | `ExecBlockAttrs` | Per-session exec-block `__dict__` (user attributes) |
| `#'___ExecBlockSlotsTable___'` | `ExecBlockAttrs` | Per-session exec-block SLOTS (`__name__`, `__qualname__`, `__module__`, `__doc__`, `__annotations__`, `__type_params__`) — kept out of `__dict__` so `functools.update_wrapper`'s `__dict__` merge doesn't copy Grail's def-time stamps |

The 2026-07 session-state refactor (`2900b14f`, `283f086f`) and the
canonical-modules work (docs/Persistent_Modules_and_Classes.md) added many
more `GrailXxx` keys, among them `#GrailSysModules`,
`#GrailModuleInstances`, `#GrailNumbersRegistry`, `#GrailTimezoneUtc`,
`#GrailDir`, `#GrailCompileContext`, `#GrailClassAttrOverlay`,
`#GrailModuleHashState`, `#GrailCanonicalClassesEnabled`, and
`#GrailMiRegistry`. This table is the audit snapshot, not an exhaustive
registry; grep for `SessionTemps` for the current set.
