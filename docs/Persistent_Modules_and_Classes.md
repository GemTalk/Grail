# Persistent Modules and Classes in Grail

**Status:** design proposal (not yet implemented)
**Author:** design discussion, 2026-07
**Related:** [LEGB.md](LEGB.md), the module-loading path in
[../src/smalltalk/Python/importlib.gs](../src/smalltalk/Python/importlib.gs),
the annotations work (`__annotations__`, PEP 563 source strings).

## 1. Problem

Grail runs Python on a *shared, persistent* GemStone repository, where objects
created in one session are committed and faulted back by later sessions.
CPython was designed for a single process with no cross-process object sharing.
The two models collide at the module/class boundary.

CPython imports a module **once per process**: the first `import foo` finds
`foo.py`, compiles it (caching bytecode in `__pycache__/foo.cpython-XX.pyc`),
executes the body once, and stores the result in `sys.modules`. Every later
`import foo` in that process is a dict lookup — the file is not re-read and the
body is not re-run. The classes defined in the module are therefore *the same
class objects* for the life of the process.

Grail today re-executes a module on the **first import of each session**:

- `sys.modules` is session-local (SessionTemps `GrailSysModules`), so a fresh
  session starts with an empty cache and re-imports from source.
- Loading recreates the module class via `module subclass:`
  ([importlib.gs](../src/smalltalk/Python/importlib.gs)) and re-executes every
  `class` statement, minting **fresh user-class objects** (user classes are
  created `inDictionary: nil` — anonymous, reachable only through references).
- The module instance (holding globals) is session-local too
  (SessionTemps `GrailModuleInstances`).

**Consequence — verified empirically** (a committed `Widget` instance read in a
fresh session): the instance retains its methods and `__annotations__` (they
ride on the committed class, faulted through the object→class pointer), **but**
re-importing the module in the new session produces a *different* class object:

```
DIVERGENCE PROBE: re-imported Widget class == committed instance class?  false
```

So `isinstance(persisted_obj, ReimportedClass)` is false across sessions, and
edits to the `.py` never reach already-persisted instances (they are frozen on
their defining session's class version).

Why it's session-local today: an earlier bug report — a module that kept
mutable state in its committed instance caused multi-user write-write commit
conflicts. The fix moved module instances (and several registries) to
SessionTemps. That was correct for **mutable state** but collateral-damaged
**class identity**: it made *everything* about a module session-local.

## 2. Key insight: two layers, one of which is already persistent

A module has two kinds of contents that need opposite treatment:

| Layer | Examples | Wants to be |
|---|---|---|
| **Code** (definitional, write-once) | classes, functions, compiled methods, the module class, `__annotations__`, `_fields` | **persistent, shared** — this *is* "the behavior of the `.py` file" |
| **State** (runtime-mutable) | reassigned globals, caches, counters, connection handles, class-level mutable attrs | **session-local** — committing it is the original conflict bug |

The module **class** is *already* persistent (committed in the `PythonModules`
dictionary; re-import re-parents the existing binding rather than minting a new
one). What diverges is the **user classes**, because they are anonymous and
re-minted each session. So the fix is narrower than "make modules persistent
from scratch": **give user classes the same persistent, canonical treatment
the module class already has.**

If the module (and its classes) become the shared, reused-on-import artifact,
the classes come along for free — exactly the CPython import-cache model,
lifted from *per process* to *per repository*.

## 3. Goals / non-goals

**Goals**

- Stable class identity across sessions (`isinstance` works; edits reach
  instances after recompile).
- **Do not re-parse/recompile on every import.** Load the committed compiled
  artifact instead — parity with CPython loading a `.pyc`. (This is *faster*
  than today, which recompiles every session.)
- Preserve the commit-safety win: no accidental committed mutable state.
- Make persistence a **deliberate developer choice**, not a guess.

**Non-goals (initially)**

- Automatic schema migration for arbitrary class redefinition (deferred; gated
  by a source hash so it is only needed when source actually changes).
- Imposing a concurrency policy (RC\* collections, etc.) on persistent state —
  that is the developer's decision (see §6).

## 4. The import cache — do we parse on every import?

**No.** Two scopes, mirroring CPython:

1. **Within a session** — already solved. `lookupModule:` returns the
   `sys.modules` entry on a hit, so a duplicate `import` in the same session is
   a dict lookup; the file is not re-read and the body is not re-run. This
   matches CPython's "ignore duplicate imports within a process."

2. **First import in a new session** — today this recompiles from source. The
   proposal: look up a **committed compiled-module artifact** and, when valid,
   *load* it (bind the canonical classes, reconstruct session-local state)
   without re-parsing or recompiling.

Freshness is checked with a **source hash**, exactly as CPython's hash-based
`.pyc` files do (PEP 552):

```
import foo (runtime — NEVER commits):
  in-session sys.modules hit?            -> return it            (no work, no commit)
  committed artifact for foo present?
    and (source absent OR hash matches)? -> LOAD committed       (no parse/compile/commit)
                                            (what LOAD means was revised by
                                             §10: bind the committed module
                                             instance; the body does NOT re-run)
    else (absent or hash mismatch)       -> BUILD in the CURRENT
                                            transaction (compile,
                                            register canonically);
                                            session-local until the
                                            developer next commits  (no auto-commit)

deploy foo (explicit admin/deploy action — e.g. install.sh, or an
            importlib.precompile('foo') call — the ONE intentional commit):
    parse -> compile -> register canonical classes
    -> migrate persisted instances if the class shape changed
    -> System commit
```

- The hash check is **once per session per module** (one file read + hash on the
  first import), not once per `import`. It is negligible next to the cost it
  avoids (parse + recompile every session). Net: **faster than today**.
- **The edited-file-without-cache-removal case** you raised is handled
  automatically: a changed source hash triggers recompile. This is strictly
  better than CPython, which within a single process ignores the file after the
  first import (you must `importlib.reload`). Under this design, edit-then-rerun
  *within a session* is still stale until `reload()` (CPython parity), but a
  **new session picks up the edit** (its first-import hash check sees the
  change). So the staleness window is bounded to one session, same as CPython
  bounds it to one process.
- **When source is unavailable** (a deployed/frozen image that ships no `.py`
  files): the hash can't be computed, so trust the committed artifact. This is
  also the natural **production fast-path** — set a "frozen" flag to skip the
  hash entirely when you know source won't change.

So we never re-parse on a warm cache; we parse only on first-ever import or a
real source change, and the freshness check is cheap and CPython-faithful.

### 4.1 Commit boundaries — `import` never commits

In GemStone the developer owns the commit boundary; a hidden commit inside
`import` would flush whatever else is in the current transaction, which is
surprising and wrong. So **`import` never calls `System commit`.** Persistence
of *code* happens in exactly two ways, both explicit:

1. **A deploy/precompile action** — the analog of the existing `install.sh`
   (which already compiles + commits Grail's runtime and the vendored stdlib).
   This is where a module's classes are compiled, registered canonically,
   instances migrated if the shape changed, and committed. Shipping an app =
   deploying its modules into the extent, exactly as the stdlib is today.

2. **The developer's own commit, via normal reachability.** If a developer
   builds classes in a session (cold import) and then creates persistent
   instances and commits — for their own reasons, at their own boundary — the
   classes reachable from those committed instances commit along with them
   (standard GemStone reachability), and so does the canonical-registry entry
   if it is written into the transaction. No hidden commit: it is the
   developer's commit that carries the code across, as a side effect of
   reachability, not an `import` side effect.

Consequences that fall out cleanly:

- **Development** — edit `.py`, re-run: a cold import rebuilds classes
  session-locally in the current transaction, no commit, fast iteration. You
  commit (or run the deploy step) when *you* decide.
- **Production** — modules are pre-deployed (committed once), so imports only
  LOAD; source may not even ship.
- **Migration is never a lazy side effect.** A changed source hash seen during
  a runtime import triggers a session-local rebuild, *not* an automatic
  migrate-and-commit of already-persisted instances — schema migration of
  committed data is a deliberate, potentially expensive operation and belongs
  to the explicit deploy action (§8, §9).

We could, since this is Grail and not legacy Smalltalk, offer an *opt-in*
convenience that commits after building (e.g. a distinct
`importlib.import_and_deploy('foo')`), but a bare `import` must stay
commit-free.

## 5. Canonical class registry

A committed registry keyed by `(module dotted-name, class qualname)` →
canonical GemStone class. The `class`-statement codegen consults it **before**
minting:

- **Hit** (registry has this `(module, qualname)`, source unchanged): reuse the
  committed class object. Its identity — and its committed methods,
  `__annotations__`, `_fields` — are shared across sessions.
- **Miss / changed**: compile the class, register it, and (if a prior version
  had persisted instances and the instVar shape changed) migrate them
  (`migrateInstances:` / a `become:` strategy), then commit.

This generalizes the existing `PythonModules` treatment of the *module* class
to *user* classes. The module class itself already fits this pattern.

Source-hash granularity is an open question (§8): per-module is simpler;
per-class allows recompiling only what changed.

## 6. State: session-local by default, persistent by explicit opt-in

Default (unmarked) module globals and class-level attributes stay
**session-local** — the module body re-runs on a cold (recompile) load to
rebuild them, and they never commit. This keeps the commit-safety guarantee and
matches CPython's "module globals are per-process."

Because we **cannot statically tell** a stable constant from a
runtime-mutated global (both are plain `x = expr`), the safe default is
transient, and persistence is **opt-in and declared** — the developer decides.

### 6.1 How to mark a variable persistent

Python has **no variable decorators** — `@persistent` cannot precede an
assignment (`@persistent\nx = 5` is a `SyntaxError`). Three valid-Python
spellings are possible; recommended order:

**Primary — a `__persistent__` list (the `__slots__` / `__all__` analog):**

```python
count = 0
registry = RcKeyValueDictionary.new()   # dev chose a conflict-safe value
__persistent__ = ['count', 'registry']  # these names are committed module slots
```

This is the direct analog of `__slots__` — a reserved dunder that declares
*special storage* for named attributes — and it is the recommended primary
mechanism because it avoids the two problems of the annotation form:

- **No name collision.** `__persistent__` is a reserved dunder (like `__all__`
  / `__slots__`), so it can never clash with a user class named `Persistent`.
- **No semantic overloading.** Storage class is declared in a *storage*
  declaration, not smuggled into a *type* annotation. A type annotation should
  describe the value's type (`count: int`), not its persistence.
- **Direct implementation mapping.** `__persistent__` literally names the
  module instVars to declare as committed named slots — the module-scope analog
  of `__slots__`. The same dunder in a *class body* declares which class
  attributes are committed vs. session-local (§7).

Cost: the list is separate from the assignment and must be kept in sync — the
same ergonomic tradeoff `__slots__` already asks of Python developers.

**Not recommended — an annotation marker (`count: Persistent[int]`).** It reads
locally and reuses the annotation-capture machinery, but it (a) collides with a
user class named `Persistent`, and (b) overloads type annotations with a
storage directive. Documented here only to record why it was rejected.

### 6.2 Semantics of a persistent variable — **IMPLEMENTED**

As landed (a committed side store rather than instVar surgery on the module
instance — the module instance stays session-local, unchanged):

- Storage: `UserGlobals at: #GrailPersistentModuleState` — a committed
  `(module dotted-name → (global-name → value))` map. Created lazily in the
  current transaction; **import never commits it** (§4.1).
- **Bind-or-capture on import** (`___syncPersistentState___:`, after the
  body runs): a listed name already in the store → the module global is
  **rebound to the committed value** (the body's initializer ran, but the
  committed value wins — CPython's "initializer runs once per process"
  lifted to once per repository). Absent → the initializer's value is
  **captured** into the store, in-transaction.
- **Two mutation flavors:**
  - *In-place mutation* of a persistent object (the intended pattern — an
    `RC*` collection, a dict): the binding is restored at import and
    mutations are ordinary GemStone object writes the developer commits.
    No flush needed.
  - *Rebinding* the name (`count = count + 1`): reaches the session binding;
    it persists at the developer's own **`gemstone.system.commit()`**, which
    flushes every loaded module's listed globals into the store first
    (`___flushPersistentState___`) — the developer's commit boundary is the
    write-through point. A raw Smalltalk `System commit` bypasses the flush;
    the Python-visible commit is the supported API.
- **Concurrency is the developer's problem.** Grail imposes nothing: a bare
  `__persistent__` `count` shared across concurrent writers *will* produce
  write-write conflicts, and that is the developer's signal to choose a
  conflict-tolerant value (an `RC*` reduced-conflict collection, a per-session
  key, etc.). Grail neither forces nor forbids `RC*`.
- Regression: `tests/scripts/runPersistentStateTest.gs` (rebound scalar via
  python-commit, in-place-mutated dict, unlisted global stays session-local,
  no store entry for non-declaring modules).

### 6.3 Storage split

- **Persistent vars** → entries in the committed per-module store, rebound
  onto the (session-local) module instance at import.
- **Transient vars** → the module instance's dynamic instVars (SessionTemps),
  as today.

The module instance itself stays session-local — only the values of marked
names outlive it, via the store. Needs no module-class shape changes and
keeps every existing read/write path untouched.

## 7. Class-level mutable state

Making user classes persistent re-introduces the conflict risk **at class
scope**: a class-side mutable attribute (`_cache = {}`, an `@lru_cache`
classmethod, a class-level counter) on a now-shared class becomes shared
committed state. The same rule applies one level down:

- Definitional class state (methods, `__annotations__`, `_fields`, class-body
  attribute *defaults*) → persistent (committed with the class). Already the
  case.
- **Runtime** class-attribute mutation (`Cls.x = v`, `setattr`, `del Cls.x`)
  → session-local per-class overlay (SessionTemps, keyed by the canonical
  class). — **IMPLEMENTED**, see below.
- A future `__persistent__` list in a *class body* could opt specific class
  attributes back into committed mutation (not yet implemented; the module
  form landed in §6).

**As landed:** the split is temporal — everything the class *definition* does
(class body, metaclass hook, decorators) runs before
`___canonicalClassRegister___` adds the class to the canonical set
(`#GrailCanonicalClassSet`, committed beside the registry), so definitional
stores land on and commit with the class; anything after registration is
runtime mutation and routes to the session overlay
(`#GrailClassAttrOverlay` in SessionTemps). One write choke point
(`object >> ___pyAttrStore___`, Behavior branch) and four read sites consult
the overlay first, matching CPython's last-setattr-wins: the Behavior branch
of `___pyAttrLoad___` (`Cls.x`), the PythonInstance fallback (`self.x`
through the class, with descriptor binding), `___dynamicClassAttr___` (walks
the superclass chain, so a store on a base is visible through a subclass —
type-MRO semantics), and `___classAttrDunder___` (operator dunders stored as
class attrs). `del Cls.x` removes the class's own overlay entry, letting the
committed value show through again. Flag off (the default) costs one
SessionTemps probe on the store path and nothing on reads (the overlay dict
doesn't exist). Known approximation: with the flag on, a runtime store is
session-local even if the developer *wanted* it committed — that's the
class-scope `__persistent__` follow-up above.

## 8. Open questions / decisions to make

- **Persistent-initializer semantics.** ~~Run-once vs. re-run-with-guard~~ —
  **ANSWERED by §10**: the body runs once per deployed source version, so
  initializers cannot double-run; the §6.2 bind-or-capture store remains
  valid for the cold path.
- **Does the body re-run on a warm load at all?** — **ANSWERED by §10: NO.**
  The "simplest" candidate here (run the body, resolve classes canonically)
  was implemented (§9.1) and experimentally falsified (§10.1): reused code +
  re-executed state is a hybrid with no consistent semantics. Transient
  globals are the session tier, rebuilt by §10.4's mechanisms, not by a body
  re-run.
- **Source-hash granularity:** per-module vs. per-class.
- **Redefinition / migration policy:** instVar shape changes, method removal,
  base-class changes; `migrateInstances:` vs. leaving old instances on the old
  version.
- **`importlib.reload` interaction:** force recompile + re-register + migrate.
- **Which current SessionTemps registries become persistent** and which stay
  (revisit the earlier commit-safety refactor decision-by-decision, keeping its
  intent: mutable state session-local, definitional state persistent).

## 9. Suggested rollout

1. **Canonical user-class registry + reuse-on-import**, gated by a source hash.
   This alone removes the cross-session divergence and makes warm imports skip
   recompilation. Everything else stays as-is. — **IMPLEMENTED** (flag-guarded,
   off by default; see §9.1).
2. **Persistent-variable marker** (`__persistent__ = [...]`) + the module
   storage split. — **IMPLEMENTED** (see §6.2; always available — the dunder
   itself is the opt-in, no feature flag needed).
3. **Class-level mutable-attribute** session-local overlay under shared
   classes. — **IMPLEMENTED** (see §7): one write choke point + four read
   sites (`___pyAttrLoad___` Behavior + PythonInstance branches,
   `___dynamicClassAttr___`, `___classAttrDunder___`) + delete; the
   canonical set is populated at register time so definitional class-body
   stores stay committed while post-definition mutation is session-local.
   Class-body reads during the build (`inClassBodyValueEmit` direct getter
   sends) intentionally bypass the overlay — it is empty until the class is
   registered. Not covered: a class-scope `__persistent__` opt-back-in for
   deliberately-shared mutable class attrs.
4. **Redefinition / migration** — only needed once someone edits a committed
   module; the source hash defers it until then. (The identity-preserving
   method refresh in §9.1 covers behavior-only edits; *shape* changes still
   need this phase.) **Decision (2026-07-13): instance migration is a larger
   task and must NOT happen automatically** — it is a deliberate
   developer/deploy action, never an import side effect.

### 9.1 Phase-1 implementation notes (as landed)

Flag: `importlib ___canonicalClassesEnabled___: true` (session-local,
default **off**; when off every path below is byte-for-byte the old
behavior). Registry: `UserGlobals at: #GrailCanonicalClasses`
(`module.qualname` → final class object); hashes:
`#GrailCanonicalModuleHashes` (`module` → source `sha1Sum`). Neither is
committed by import — they persist when the developer/deploy commits (§4.1).

- **Emit shape** (module-scope classdefs only; method-local classes still mint
  per execution, matching CPython):
  `probe → miss? [mint-or-identity-reuse → compiles → metaclass hook →
  decorators → register FINAL object] → bind into module instance`.
  The probe hits only when this session verified the module's source hash, so
  a **warm import binds classes with zero `___compileMethod:` sends** — it
  never dirties the committed class (no write-write conflicts between
  concurrent importers, nothing swept into the developer's next commit).
  Registering the *final* object keeps decorator wrappers intact. The guard
  sits inside the statement position, so `if cond: class C` only probes when
  the branch actually runs.
- **Warm module load**: on a hash match `loadModuleFromPath:` skips the parse
  and `___buildModuleClass:` entirely and reuses the committed module class;
  the body still runs for transient state (globals, sys.modules entry).
  **Superseded by §10** — the body re-run is the incoherent hybrid; phase 5
  replaces it with binding the committed module instance.
- **Edit workflow**: a stale hash forces a rebuild in which
  `___canonicalSubclassOf:` **reuses the registered class's identity** (same
  parent) and the emitted compiles refresh its methods in place — so edits
  reach already-persisted instances instead of stranding them on an old class.
  A changed base (or a non-class registry value) re-mints.
- **`Cls.__module__` is now the dotted-name STRING** (CPython semantics),
  emitted as a compile-time literal. The old emit stored the module
  *instance*, which made any committed class drag its defining session's
  entire globals graph into a commit via reachability — the ephemeron/
  commit-conflict shape all over again, resurfacing through the class. The
  one instance-consumer (`enum.global_enum`) now resolves through
  `sys.modules` and tolerates legacy instances.
- Regression: `tests/scripts/runCanonicalClassTest.gs` (cross-session reuse,
  flag-off default, edit-workflow identity+behavior refresh).

## 10. Import semantics, revised: bind the committed module — do not re-run the body

*(Added 2026-07-14, after the first real flag-on exercise. This section
answers §8's open question — "does the body re-run on a warm load at all?" —
with experimental evidence, and revises §2/§4/§9.1 accordingly. Nothing
already landed is wasted; this changes what the warm path does with the
module BODY, not the registry/hash/overlay machinery underneath.)*

### 10.1 What the experiment showed

The first consumer of the flag-on path was an attempt to reuse compiled
classes across the test suite's forced re-imports (tests `removeKey:` a
module from `sys.modules` to get fresh state). Result: the suite cannot
reach green under the semantics §9.1 implemented — **reuse the code, re-run
the body** — and the failures are structural, not bugs:

- **Re-running definition-time wiring on a reused class corrupts it.**
  `@dataclass` re-processed the canonical class against the *second* body
  run's `MISSING` sentinel — a different object than the one the class was
  built against — and died with `_MissingType has no attribute 'append'`.
- **Not re-running it loses effects the body depends on.**
  `enum.global_enum` injects member names into the module's globals *as a
  side effect of the class statement*; with the statement skipped, the
  body's later references die (`NameError: ALPHA`). Class-decorator side
  effects (registrations, logging) likewise never fire again.

Both placements were implemented and measured; each fixes one family and
breaks the other. The contradiction is inherent: **reused code + re-executed
state is a hybrid with no consistent semantics.** CPython is consistent
because a re-import rebuilds *everything together*; a GemStone image is
consistent because *nothing* re-runs. The middle is where all the breakage
lives.

**This is not a test-suite artifact.** The primary user scenario hits the
same hybrid: session A imports a module and commits instances; session B's
first `import` is a session-cache miss, so under §9.1 it re-runs the body
while binding committed classes. Session B then sees exactly the failures
above — a committed dataclass whose `MISSING` no longer matches, committed
enum classes whose injected globals belong to a dead session, duplicated or
missing registry registrations. **Users would hit the wall the first time
persistence matters at all — their second session.**

### 10.2 The revision: three tiers, and imports that bind

§2's two-layer model was one tier short. A module body interleaves:

| Tier | Examples | Treatment |
|---|---|---|
| **Code** | classes, functions, compiled methods | Canonical + committed (as landed, §5/§9.1) |
| **Persistent state** | singletons (`MISSING`), registries, constants, `__persistent__` globals | Committed **with the module instance** — created once, per deployed source version |
| **Session state** | sockets, `GsFile`/`Transcript` handles, C pointers, `os.environ` snapshots | Re-initialized per session, never committed |

The consequence for import — replacing §4's "LOAD committed (reconstruct
session-local state)" and §9.1's "the body still runs for transient state":

```
import foo (runtime — NEVER commits):
  in-session sys.modules hit?             -> return it (unchanged)
  COMMITTED module INSTANCE for foo,
    and (source absent OR hash matches)?  -> BIND it: register in sys.modules,
                                             run session re-init (§10.4).
                                             The body does NOT re-run.
    else (absent or hash mismatch)        -> COLD: parse, compile, run the
                                             body once, register classes AND
                                             the module instance canonically —
                                             all in the current transaction,
                                             no auto-commit (§4.1 unchanged)

importlib.reload(foo)                     -> always COLD (explicit re-execution;
                                             this is where "run the body again"
                                             semantics live, exactly as in
                                             CPython, where a plain re-import
                                             of a cached module doesn't re-run
                                             either)
```

The module body runs **once per deployed source version**, not once per
session. Everything the body created — the `MISSING` singleton, injected
enum globals, decorator side effects on module state — is *in* the committed
module instance, so binding it is consistent by construction: the classes
and the state they captured are the same objects.

This is honest to Python, not a departure from it: `import` of an
already-loaded module never re-executes in CPython either. We widen
"already loaded" from *this process* to *this repository*, which is
precisely the image model — and the pitch of the whole feature.

### 10.3 What §9.1's landed mechanism keeps / changes

- **Keeps:** the canonical registry, source hashing, identity-reuse on
  stale-source rebuild, the class-attr overlay (§7), `import` never commits
  (§4.1 — a repository with no committed module instance simply always takes
  the COLD path; sessions that never commit get consistent CPython-style
  semantics throughout).
- **Changes:** the warm path binds the committed module *instance* instead
  of minting a fresh instance and re-running `initialize`. The per-classdef
  probe/guard emit becomes a cold-path-only concern (on the warm path the
  class bindings are already in the committed instance's globals; the guard
  remains for mixed cases such as a cold body probing classes an earlier
  deploy committed).
- **Changes:** `Cls.__module__` reachability. §9.1 deliberately made
  `__module__` a string so a committed class would not drag its session's
  module-globals graph into a commit. Under §10.2 the module instance is
  *meant* to commit — but only at the developer's/deploy's boundary, and the
  session-state tier (§10.4) must be excluded from what that commit sweeps.

### 10.4 The open design problem: the session tier

Some module globals are wrong or dead in any later session: open sockets and
files, `Transcript`/`GsFile` handles (see the committed-Transcript gotcha),
boxed C pointers (the committed-`SrePattern` NULL-`CPointer` regression is
this bug class), `os.environ` snapshots, clocks/seeds. Python bodies
interleave these with persistent state, and arbitrary code cannot be sliced
automatically. Candidate mechanisms (not mutually exclusive):

1. **Explicit session hook** — a module-level `def __session_init__():`
   convention, run on first touch of the module per session (the analog of a
   GemStone session-init hook; developers already know this pattern from
   SessionTemps). Explicit, auditable, matches `__persistent__` in spirit:
   the developer declares, Grail obeys.
2. **Lazy fault-in re-init** — names listed in a `__transient__ = [...]`
   marker read through a per-session shim: first read per session runs a
   registered initializer (or re-raises a clean error if none). Classic
   GemStone idiom (deoptimized `isNil` re-init), more machinery.
3. **Vendored-stdlib audit** — the bounded, practical part: the stdlib
   modules Grail ships are patched once (by us) with hooks from (1)/(2)
   where they snapshot process state. User code gets documentation plus the
   same tools.

Recommendation: (1) + (3) first — explicit and cheap — with (2) as a
follow-up if real code shows fault-prone patterns that a hook can't reach.

A related exclusion problem: the deploy commit must not sweep session-tier
values reachable from the module instance at commit time (a socket sitting
in a global at deploy time). Candidate: `__session_init__`-owned names are
stored in SessionTemps-backed storage, not on the module instance proper —
i.e., the §6.3 storage split, inverted (persistent is the default, marked
names are transient).

**Status (2026-07-14): (1) and (3) are IMPLEMENTED.**

- `def __session_init__():` runs once per session per module, at every
  point the session *acquires* the module's code: after a cold body run,
  after a warm bind (where the body did not run), and after `reload()`.
  A `sys.modules` cache hit does not re-run it. Zero-arg by contract; a
  hook declared with parameters fails its dispatch loudly rather than
  being skipped. (`importlib ___runSessionInit___:`, three call sites.)
  Values the hook binds land on the module instance like any global —
  a hook that ran before a developer commit may leave a dead handle
  committed, but the next session's hook re-binds the name at import
  before use: correctness first, extent hygiene via `SessionDict` where
  it matters.
- The exclusion problem above already has its storage primitive:
  `_grail_session.SessionDict` (predates this design) is a dict view
  whose entries live in SessionTemps via `gemstone.sessionDict(name)` —
  per-session, never committed. `re`'s compiled-pattern cache (C
  pointers!) and jinja2's lexer cache already use it.
- **Stdlib audit result:** the vendored `.py` stdlib has no further
  import-time process state. `os`/`sys`/`socket`/`time` are native `.gs`
  modules — rebuilt per session by construction and never
  canonical-bound (they don't go through `loadModuleFromPath:`);
  `os.environ` is lazily populated per session on the native module.
  Vendored `logging`'s StreamHandler deliberately defaults to `print()`
  (no captured stream handle); no vendored module binds
  `open()`/sockets/`sys.std*`/clock snapshots at module level. The two
  C-backed module caches are on `SessionDict` (above). User code gets
  `__session_init__` + `SessionDict` plus this section as documentation.

### 10.5 Divergences to document (and their CPython mapping)

- **"Fresh state per forced re-import" is spelled `reload()` — and the old
  spelling raises.** `del sys.modules[m]; import m` does not silently bind:
  deleting the cache entry is a deliberate "give me fresh execution" signal,
  and handing back the canonical module would run the caller's subsequent
  code against state they explicitly tried to discard. Instead the import
  raises

  ```
  ImportError: module 'm' is canonical (deployed); it was removed from
  sys.modules in this session. Use importlib.reload() to re-execute it,
  or assign a replacement into sys.modules to substitute it.
  ```

  (2026-07-14, user decision.) The guard applies ONLY to the within-session
  delete-and-reimport pattern — the session-boundary bind (§10.2) stays
  silent; it is the feature. Detection is nearly free: the session-local
  hash-state map already records every module this session loaded, so
  warm path + entry present + `sys.modules` missing ⇒ deleted this session
  ⇒ raise (checked before recording the current attempt). Edge cases that
  correctly do NOT trip it: CPython-style failed-import retry (a failed cold
  import never registered or committed anything — no canonical instance, so
  the retry is cold, matching CPython) and stub substitution
  (`sys.modules[m] = fake` performs no import).

  This yields the contract worth stating to customers plainly: **within a
  session, flag-on Grail never silently diverges from CPython — it either
  behaves identically or raises with instructions.** The only silent
  divergence is at the session boundary, which is what the module was
  deployed for.
- **Module-body side effects happen at deploy time, not per process.** Print
  statements, network calls, registrations against *other* modules — once
  per deployed version.
- **Class identity across redefinition** (already landed, §9.1): a stale
  rebuild refreshes methods in place rather than minting a divergent class,
  so persisted instances follow edits; `RuntimeClassCreation`-style
  same-body redefinition keeps CPython behavior because it happens within
  one cold execution.

### 10.6 Acceptance test (the missing one)

The suite never encoded the user story; this is the gate the flag must pass
before it can ever default on (shape mirrors `runCanonicalClassTest.gs`):

- **Session A** (flag on): import a fixture using `@dataclass` (with
  `field(default_factory=...)`), an enum under `@enum.global_enum`, and a
  module-level registry populated by a class decorator; create instances;
  commit via `gemstone.system.commit()`.
- **Session B** (fresh login, flag on): `import` the same module. Assert:
  the committed dataclass instance still round-trips (`asdict`, default
  detection — the `MISSING` identity check); `isinstance` holds against the
  imported classes; the injected enum globals resolve; the registry has
  exactly one registration; a *new* dataclass instance created in B behaves
  identically to A's.
- **Session B, edit case:** change the fixture source; import → cold rebuild
  in-transaction, committed instances still answer refreshed behavior
  (§9.1's identity reuse), nothing auto-commits.

### 10.7 Rollout (continues §9)

5. **Warm-bind the committed module instance** (replaces the §9.1 warm body
   re-run): commit the module instance at deploy/developer commit; on warm
   import, bind + `sys.modules` register, skip `initialize`; raise the
   §10.5 `ImportError` on a within-session delete-and-reimport. Gate: §10.6
   session-A/B test plus the full suite flag-off unchanged. —
   **IMPLEMENTED** (flag-guarded, off by default). Registry:
   `UserGlobals at: #GrailCanonicalModules` (dotted-name → module
   instance), recorded by every flag-on cold import in-transaction (import
   never commits) and consulted by the warm path. "Deployed" is made
   precise by `isCommitted`: only an instance actually in the committed
   repository binds or guards, so a non-committing flag-on session keeps
   the previous semantics throughout (its forced re-imports keep working —
   e.g. the overlay regression's per-test fixture reloads). `reload()`
   already re-executes (phase 7 folded in): it forces the class-def probes
   `#stale` for the body re-run (identity-reused classes refresh in
   place), then updates the hash, session verdict, and registry entry.
   The imported closure composes: session B's reload of the fixture
   re-runs `from dataclasses import ...`, which warm-binds the committed
   dataclasses module — same `MISSING` sentinel, so re-decoration is
   coherent. Acceptance: `tests/scripts/runModuleBindTest.gs` (§10.6 as
   specified, plus reload and guard checks), wired into run_tests.sh.
6. **Session tier:** `__session_init__` hook + SessionTemps-backed storage
   for its names; audit vendored stdlib for process-state snapshots. —
   **IMPLEMENTED** (see the §10.4 status block: hook at all three
   acquisition points, `SessionDict` as the existing never-committed
   storage, audit found the vendored stdlib clean). Acceptance: the
   `init_count` checks in `runModuleBindTest.gs` (cold = 1, warm bind =
   committed + 1, reload = 1).
7. **`reload()` as the explicit cold path** (today's cold machinery,
   repointed), including re-register + hash update. — **IMPLEMENTED**
   (folded into phase 5; see above).
8. **Concurrency polish:** two sessions cold-importing the same new module
   and both committing → registry write-write conflict; resolve by
   retry-with-probe (first commit wins, loser rebinds). Document extent
   growth: deploying an app commits its imported closure (the image model's
   cost, and its point).

## 11. Relationship to the annotations work

Function/method/class `__annotations__` already sit on the **code layer**
(class-side instVars and compiled class-side methods; module-function
annotations in a session-local table matching the session-local module
instance). They therefore ride along with whatever persistence policy this
design adopts — no rework needed.
