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

### 6.2 Semantics of a persistent variable

- It becomes a **committed named instVar** on the (now-persistent) module
  instance. The name is known at parse time from the marker, so the module
  class can declare the slot.
- Its initializer runs **once** (first compile), and the committed value is
  reused by later sessions — unlike a transient variable, whose initializer
  re-runs each session. (The body codegen must therefore **guard** persistent
  initializers so a re-run does not overwrite/commit them again — see §8.)
- **Concurrency is the developer's problem.** Grail imposes nothing: a bare
  `__persistent__` `count` shared across concurrent writers *will* produce
  write-write conflicts, and that is the developer's signal to choose a
  conflict-tolerant value (an `RC*` reduced-conflict collection, a per-session
  key, etc.). Grail neither forces nor forbids `RC*`.

### 6.3 Storage split

- **Persistent vars** → named instVars on the committed module instance.
- **Transient vars** → session-local overlay (SessionTemps), as today.

This is a cleaner split than today's "whole instance is session-local": the
module instance can be persistent (holding only the marked slots), while the
transient namespace lives in the session-local overlay.

## 7. Class-level mutable state

Making user classes persistent re-introduces the conflict risk **at class
scope**: a class-side mutable attribute (`_cache = {}`, an `@lru_cache`
classmethod, a class-level counter) on a now-shared class becomes shared
committed state. The same rule applies one level down:

- Definitional class state (methods, `__annotations__`, `_fields`) → persistent
  (committed with the class). Already the case.
- Mutable class attributes → session-local per-class overlay (SessionTemps,
  keyed by the canonical class) unless named in the class body's
  `__persistent__`.

## 8. Open questions / decisions to make

- **Persistent-initializer semantics.** Run-once vs. re-run-with-guard; how to
  guard so a body re-run (for transient state) does not re-commit persistent
  slots. Candidate: emit persistent initializers only on the compile path, not
  the warm-load path.
- **Does the body re-run on a warm load at all?** If transient globals must be
  rebuilt, the body (or a designated transient-init section) must run even on a
  hash-match load. Simplest: always run the body for its transient effects, but
  resolve `class`/`def` to canonical classes and skip persistent re-init.
  (Matches CPython "body runs once per process" ≈ "once per session".)
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
   recompilation. Everything else stays as-is.
2. **Persistent-variable marker** (`__persistent__ = [...]`) + the module
   storage split.
3. **Class-level mutable-attribute** session-local overlay under shared classes.
4. **Redefinition / migration** — only needed once someone edits a committed
   module; the source hash defers it until then.

## 10. Relationship to the annotations work

Function/method/class `__annotations__` already sit on the **code layer**
(class-side instVars and compiled class-side methods; module-function
annotations in a session-local table matching the session-local module
instance). They therefore ride along with whatever persistence policy this
design adopts — no rework needed.
