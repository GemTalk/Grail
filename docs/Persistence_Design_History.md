# Persistence Design History — what was tried, measured, and falsified

**What this is.** The evidence log behind
[Persistent_Modules_and_Classes.md](Persistent_Modules_and_Classes.md), which
states the design as it now stands. This file keeps the experiments — including
the ones that failed — because several of the current rules look arbitrary until
you know which alternative was implemented first and how it broke. Nothing here
is a specification; where the two documents disagree, the design document wins.

Sections are dated by when the finding landed. The text is preserved from the
original design document (revisions 2026-07 through 2026-08) with only its
cross-references repointed.

---

## A. The falsified model: reuse the code, re-run the body (2026-07-14)

The original design had two layers — code persistent, state session-local — and
the warm import path reused committed classes while re-executing the module body
to rebuild transient state. That was implemented, measured, and abandoned. This
is the single most important negative result in the file: it is why the module
body now runs *once per deployed source version* rather than once per session.


The first consumer of the flag-on path was an attempt to reuse compiled
classes across the test suite's forced re-imports (tests `removeKey:` a
module from `sys.modules` to get fresh state). Result: the suite cannot
reach green under the semantics phase 1 implemented (section F) — **reuse the code, re-run
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
first `import` is a session-cache miss, so under phase-1 semantics it re-runs the body
while binding committed classes. Session B then sees exactly the failures
above — a committed dataclass whose `MISSING` no longer matches, committed
enum classes whose injected globals belong to a dead session, duplicated or
missing registry registrations. **Users would hit the wall the first time
persistence matters at all — their second session.**


---

## B. Reconciling a reused class with an edited body (2026-07 / 2026-08-18)

Identity reuse on a stale-source rebuild is a hybrid — the class OBJECT is the
one the previous body populated, the CODE is re-executed — and the two halves
have to be reconciled in both directions. Both failure modes below were live
bugs, and the method-category table is the part that makes the reset decidable
rather than a guess.


Identity reuse is a hybrid — the class OBJECT is the one the previous body
populated, the CODE is re-executed — and phase 1 landed the code half only.
Nothing reconciled the class's own attribute namespace with the new source,
and the two directions of an edit failed in opposite ways:

| edit | before | after |
| --- | --- | --- |
| attribute **dropped** | `C.doomed` kept answering revision 1's value | `AttributeError`, identity kept |
| attribute **added** | whole class became `NameError: Grail could not compile this method (codegen gap)` | builds; identity re-minted |

**Dropped.** A Grail class attribute is a getter/setter pair on the metaclass
over a classInstVar slot. The rebuild recompiles a pair for every name the new
body declares and overwrites its value, but a name the new body no longer
mentions is written by nobody and removed by nobody, so it survived the edit.
`object >> ___grailResetClassNamespace___` clears the class's own attribute
namespace at the point in the rebuild that corresponds to CPython handing the
class statement a fresh namespace — inside `___canonicalSubclassOf:`, on the
reuse branch, before the emitted accessor compiles and attr stores run. It
clears the same three homes `___classBodyDefinitionalDelete___` has to look in:
the `Grail-Class Attrs` pairs (removed, not nilled — `___pyAttrLoad___` does not
read a nil accessor as absent), the per-class `___dynInstVars___` holder, and,
for the flag-on class-attr overlay, `___resetClassAttrOverlay___` already
emitted beside the guard.

Two exclusions, both structural: the `___dynInstVars___` accessor pair itself
(the door to the holder, not an entry in it) and anything inherited.

**Added.** A new attribute needs a new classInstVar slot, and *a reused class
cannot grow one*. Slots live on the metaclass; GemStone refuses `addInstVar:`
on a class that is not modifiable, and a metaclass is never modifiable — nor
can it be made so, since a modifiable class may not have instances and a
metaclass has exactly one, the class. So `___canonicalSlotsSatisfied___`
tests for the missing slot and declines the reuse, which re-mints: the same
answer a changed base gets, and for the same reason — the definition changed
in a way the old object cannot represent. Identity is lost, which is worse
than reuse but far better than a class that will not build, and it is what
CPython does anyway (re-executing a class statement always makes a new type).

**The MI merge's copies go with the data.** `___mergeSecondaryBases___`
re-copies a secondary base's methods and class attributes on every build, so
its `Grail-MI-Inherited` methods are wholly derived and are cleared too.
Leaving them was not untidiness but a live bug: the copy is guarded by "aClass
does not already define this selector", which the *previous* build's copy
satisfies, so the method survived while the decorator's rebinding — a holder
entry, cleared above — did not, and `@classproperty def MAX` answered a raw
`UnboundMethod` from the second load on.

**What made the reset possible.** Resetting the holder on every class *build*
was tried earlier and rejected: it destroyed `@dataclass`, whose `setattr`
landed in the holder on the first import and in the immediately-wiped session
overlay on the second. That had to be fixed first — a decorator's stores now
reach the class being rebuilt, via `___classAttrOverlayStore___`'s class-build
mark — so the reset clears only what the rebuild puts back. It also closed a
divergence `runCanonicalClassTest.gs` had recorded as unreachable: an enum
whose metaclass injects members used to answer two members on the first import
and four on the second (the previous build's injected members were still on the
class and got promoted). All five loads now agree, and agree with CPython.

**A `def` the edit deleted goes too.** *(Added 2026-08-18; this paragraph
previously recorded the method half as deliberately undone.)* The rebuild
recompiles every method the new body defines, so one the new revision REMOVED
was written by nobody and removed by nobody — `C().doomed()` kept running
revision 1's body in a class whose source no longer mentions it, where CPython
raises `AttributeError` because its class statement builds a new type every
time.

`object >> ___grailResetClassMethods___` clears it, and **the method category is
what makes that decidable**. By name a `def` is indistinguishable from the
accessor pairs, the synthesised enum/dataclass methods and the
slots/signature/traceback tables a class also carries; clearing by name would
delete the machinery the rebuild reads. `ClassDefAst` files each kind under its
own category, so the three that are *wholly derived from the body* are named
rather than guessed at:

| Category | What it holds | Why it is cleared |
|---|---|---|
| `Grail-Class Methods` | a class-body `def` and its `_name:kw:` varargs entry, instance side; `@staticmethod` / `@classmethod` on the **metaclass** side | the def itself |
| `Grail-Fixed Arity Forwarders` | per-def fixed-arity entry points into a varargs body | emitted per def and gated at *runtime* on the superclass implementing the selector, so a rebuild without the def emits no source and overwrites nothing |
| `Grail-Method Aliases` | a class-body `__lt__ = __eq__`, compiled as a real delegating method | derived from the body the same way |

Both method dictionaries are walked — a deleted `@classmethod` lingers exactly
as a deleted method does — and only the receiver's own, so an inherited method
is untouched.

Not cleared, deliberately: the tables the rebuild re-emits *unconditionally*
(`Grail-Slots`, `Grail-Signatures`, `Grail-Tracebacks`), since an unconditional
re-emit cannot go stale.

**Still stale, and recorded rather than guessed at:** `Grail-Dataclass`,
`Grail-NamedTuple` and `Grail-Annotations` are emitted only when the class *is*
one of those, so dropping the `@dataclass` decorator itself leaves its
synthesised methods behind. That is a decorator-identity question rather than a
def-deletion one — the class is arguably a different class at that point — and
clearing them blindly would break the rebuild path that re-runs the decorator
against the class it is rebuilding.


---

## C. Deploying a real application: the session tier in practice (2026-07-15)

Committing the flask/werkzeug closure surfaced four session-bound items that a
static audit of the vendored stdlib had missed, plus one wrong assumption about
native modules. All five were fixed at the framework/runtime level, so
application code needs nothing.

The session-tier mechanisms this section refers to — the explicit hook and the
vendored-stdlib audit — were both implemented on 2026-07-14:

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
  **Correction (the `sys.modules` seam):** the native singletons are
  rebuilt per session, but a *canonical/deployed* module reaches them by a
  committed reference the audit missed. A deployed module (e.g. `pickle`)
  warm-binds a COMMITTED instance whose `import sys` global (`#sys` dynamic
  instVar) points at the DEPLOY session's `sys` instance; that instance's
  captured `#modules` slot pinned the deploy session's (committed) module
  dict. So the deployed module's `sys.modules` was a *different, stale* dict
  than the current session's — and `pickle._find_global` could not resolve a
  module the session had cold-loaded, breaking pickle-by-reference of a cold
  class under canonical mode. Fix: an instance-side `sys>>modules` accessor
  delegates to the session-local class-side registry, so every holder of a
  `sys` instance (cold or committed) reads the ONE session dict; and
  `initialize_runtime_info` no longer snapshots the dict into the instance
  slot, so no committed `sys` instance can pin a deploy-time dict.
  (`SubclassCopyPickleTestCase` regresses this per-push under canonical mode.)
  Vendored `logging`'s StreamHandler deliberately defaults to `print()`
  (no captured stream handle); no vendored module binds
  `open()`/sockets/`sys.std*`/clock snapshots at module level. The two
  C-backed module caches are on `SessionDict` (above). User code gets
  `__session_init__` + `SessionDict` plus this section as documentation.

**Real-application findings (2026-07-15, from deploying a Flask app —
`runFlaskDeployTest.gs`).** Actually committing the flask/werkzeug closure
surfaced four session-tier items the audit's static grep could not, all
fixed at the framework/runtime level so app code needs nothing:

1. **Locks.** `threading.Lock()` wraps a GemStone `Semaphore` — a
   non-persistable kernel class, so the deploy commit itself failed
   (TransactionError 2407). `PyThreadLock` is now `#dbTransient` (the
   lock's identity commits, its slots don't) with a lazy `_sem` accessor:
   a faulted-in lock re-creates its mutex on first use, unlocked —
   correct, since mutex state is meaningless across sessions.
2. **Compiled regexes.** werkzeug's URL rules carry `SrePattern`s whose C
   pointers are dead in the next session (the old guard raised).
   `SrePattern` now remembers its six `_sre.compile()` arguments and
   **recompiles transparently** on first use per session; a wrapper
   without them (minted by `SreMatch>>re`) still raises the clean guard.
   `SreMatch` has no recompile story (it captures a moment) and still
   guards.
3. **Lazy first-touch bind.** Committed code resolves *dependency* module
   globals through the module-class session-singleton path without any
   import having run — serving a request read contextvars' `_MISSING`
   that way, and the old lazy path minted a fresh instance and re-ran the
   body (the section A hybrid resurfacing through a side door).
   `module class >> instance` now consults the canonical registry before
   minting (`___canonicalInstanceForModuleClass___:`): adopt the
   committed instance, register in `sys.modules`, run its
   `__session_init__`. This is section C's "first touch per session," now
   literal.
4. **Weakrefs in frameworks.** A committed Grail `WeakReference` faults
   into a later session dead *by contract* — flask's JSON provider held
   `weakref.proxy(app)` and jsonify raised `ReferenceError` on the
   deployed app. Vendored flask now holds strong references (CPython
   used the weakref only to break refcount cycles; GemStone collects
   cycles). Audit rule: **framework weakrefs to long-lived objects are a
   session-tier smell** in deployed closures.

**Pre-deploy audit tool — IMPLEMENTED (2026-07-15).**
`gemstone.deploy_check(module)` (Python) → `importlib
___deployCheck___:` walks the module's NOT-YET-COMMITTED object graph and
returns a list of the session-bound values a deploy commit would sweep in
— open `GsFile`/`GsSocket`, `Semaphore`/`GsProcess`, raw `CPointer`, an
`SrePattern` with no `compileArgs` (can't recompile), `SreMatch`,
`WeakReference` — each with a class-path from the module (e.g.
`Grail_deploy_dirty.PySocket.GsSocket -> GsSocket (open socket — dead
after commit/logout)`). It is an ON-DEMAND pre-commit check, NOT a write
barrier: run it before deploying a module you authored. Bounded by
following only non-committed references (the deploy's new closure);
known v1 gap — a new resource held through a pre-committed-but-dirty
object needs the VM dirty-set and is not reached. Tests:
`DeployCheckTestCase` (clean module = 0 findings; a socket + a
`threading.Lock` Semaphore each flagged; findings carry the class-path;
an unimported module returns an explanatory finding, not an error).


---

## D. An install invalidates every deployment (2026-07-15)


**The failure (found 2026-07-15, on a fresh extent):** `install.sh`
recreates the Python runtime classes — exceptions, builtins — with new
object identity. A canonical module deployed under the *previous* install
keeps its compiled methods' captured references to the OLD class objects.
Warm-binding it afterwards produces exceptions that no `except` clause can
match (the raised `LookupError`'s Smalltalk class is not the session's
`LookupError`), i.e. uncatchable crashes in whatever imports the stale
module. This is systematic — every install-after-deploy cycle triggers it —
not an artifact of a dirty extent. CI never sees it (one install per
pipeline); a developer's install→test loop and a customer upgrading Grail
both would.

**The guard:** `install.gs` bumps `UserGlobals GrailRuntimeGeneration` at
the end of every install. `importlib ___canonicalGenerationCheck___` —
memoised once per session, invoked at the top of the three canonical
registry accessors — compares it against
`GrailCanonicalDeployGeneration`; on mismatch it discards all four
`GrailCanonical*` registries in-transaction and stamps the deploy
generation current. A non-committing session (a test shard) simply acts
cold from that point; the next deploy action rebuilds the registries
against the current runtime and commits the reset. Net effect: **an
install is a runtime upgrade, and a runtime upgrade implies redeploy** —
enforced automatically instead of by a manual registry wipe. Regression:
`DeployCheckTestCase>>testStaleGenerationDiscardsCanonicalRegistries`.


---

## E. Divergences from CPython, and the reasoning for each (2026-07-14)


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
  delete-and-reimport pattern — the session-boundary bind (the bind-the-committed-module rule (design doc, §4)) stays
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
- **Class identity across redefinition** (landed in phase 1; section F): a stale
  rebuild refreshes methods in place rather than minting a divergent class,
  so persisted instances follow edits; `RuntimeClassCreation`-style
  same-body redefinition keeps CPython behavior because it happens within
  one cold execution.


---

## F. The phased rollout as it actually happened

Kept for archaeology: which phase landed what, and the concurrency measurement
that closed the last one. The feature flag these phases were gated behind
(`importlib ___canonicalClassesEnabled___`) was retired in 2026-08 once the
flag-on configuration had been the tested default for a month; the code now has
one path.


5. **Warm-bind the committed module instance** (replaces the phase-1 warm body
   re-run): commit the module instance at deploy/developer commit; on warm
   import, bind + `sys.modules` register, skip `initialize`; raise the
   section E `ImportError` on a within-session delete-and-reimport. Gate: the
   session-A/B acceptance test plus the full suite unchanged with nothing
   deployed. —
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
   coherent. Acceptance: `tests/scripts/runModuleBindTest.gs` (the session-A/B
   story as specified, plus reload and guard checks), wired into run_tests.sh.

   **The test suite itself is now the largest production use of warm-bind
   (2026-07-15).** `run_tests.sh` deploys the flask/werkzeug/jinja2/twilio
   closure once (`scripts/deployFrameworks.gs`) and the sharded flag-on
   suite warm-binds it — full local gate 194s → ~104-119s, and the suite
   passes identically (3014/3014 warm). This validates the whole bind-the-committed-module model
   under real load: coherent (fixtures stay cold, only committed closures
   bind), the guard works (tests that reset a deployed module go through
   `PythonTestCase>>___resetImportedFramework___`, which skips deployed
   modules), and `deployFrameworks.gs` unregisters the reset-prone modules
   the closure pulls in transitively (dataclasses/threading/itertools/re)
   so their re-import stays cold. `GRAIL_TEST_COLD=1` restores the classic
   flag-off run as the warm-vs-cold discrepancy check. *(No longer true after
   the flag's retirement: skipping the deploy is fully cold only on an extent
   that has never been deployed — see the design doc, §8.6.)*
6. **Session tier:** `__session_init__` hook + SessionTemps-backed storage
   for its names; audit vendored stdlib for process-state snapshots. —
   **IMPLEMENTED** (see the section C status block: hook at all three
   acquisition points, `SessionDict` as the existing never-committed
   storage, audit found the vendored stdlib clean). Acceptance: the
   `init_count` checks in `runModuleBindTest.gs` (cold = 1, warm bind =
   committed + 1, reload = 1).
7. **`reload()` as the explicit cold path** (today's cold machinery,
   repointed), including re-register + hash update. — **IMPLEMENTED**
   (folded into phase 5; see above).
8. **Concurrency polish.** — **IMPLEMENTED (reduced-conflict registries +
   the abort-retry protocol), and measured with a true interleaved test.**
   `#GrailCanonicalClasses`, `#GrailCanonicalModules`, and
   `#GrailCanonicalModuleHashes` are `RcKeyValueDictionary`;
   `#GrailCanonicalClassSet` is an `RcIdentityBag`. The interleaved test
   (`tests/scripts/run_concurrent_import_test.sh`: two concurrent topaz
   processes, marker-file sync, overlapping transactions, sequenced
   commits) shows what actually happens when two sessions cold-import
   **disjoint** modules and both commit:

   - The RC registries themselves **merge** (they appear in the loser's
     RcReadSet, resolved by replay — the design working as intended).
   - The commit initially conflicted on two **residual** shared
     structures. `CallAst class` — codegen kept compile-state in class
     instVars of a committed class, dirtied by ANY Python compile, so any
     two sessions that each compiled Python and both commit collided,
     flag-off included — is **FIXED** (2026-07-15): all 19 compile-context
     class instVars moved to a SessionTemps-backed store
     (`CallAst ___compileContext___`, the item the session-state refactor
     had deferred); the interleaved test's conflict dump now shows only
     `PythonModules` (a plain SymbolDictionary both sessions add module
     classes to; it must stay a SymbolDictionary for name resolution).
   - So the protocol is the classic GemStone one, exactly as this phase
     originally sketched: **first commit wins; the loser aborts (its view
     refreshes past the winner), re-imports, re-commits — and succeeds.**
     The test demonstrates the retry converging and a fresh session
     seeing both registry entries merged.

   The important asymmetry: **warm binds — the common concurrent-runtime
   case — write none of these structures and cannot conflict.** Cold
   import + commit is a *deploy*; concurrent deploys retry (or simply
   serialize deploys, the sane operational default). A same-module
   concurrent first import additionally collides on `PythonModules` —
   one more reason deploys come from one session. Extent growth stands
   as documented: deploying an app commits its imported closure (the
   image model's cost, and its point).


---

## G. Rejected spellings and answered questions

**An annotation marker for persistent module globals** (`count: Persistent[int]`)
was considered and rejected in favour of `__persistent__ = [...]`: it collides
with a user class named `Persistent`, and it overloads a *type* annotation with a
*storage* directive. Recorded so the question is not reopened without the reason.

**"Does the module body re-run on a warm load at all?"** — answered NO by
section A above, after the alternative was implemented and measured.

**"Run-once vs re-run-with-guard for a persistent initializer"** — dissolved by
the same result: the body runs once per deployed source version, so an
initializer cannot double-run.

**Automatic instance migration on a changed class shape** — decided
2026-07-13 that it must NOT happen as an import side effect. It remains
unimplemented and is the largest open item in the design document.

---

## H. Two bugs the flag was hiding (2026-08-23)

Retiring the canonical-modules feature flag (section F) made the CPython corpus
warm-bind whatever had been deployed, for the first time. Two bugs surfaced
immediately as four test failures across two modules. Neither was caused by the
retirement: both need only a deploy plus a warm bind, which the test gate had
been doing since July — the corpus simply had never exercised these paths, and
one of the two had no coverage at all.

Both are fixed; the rules they produced are §4.3 of the design document. The
narratives are kept here because the measurements are the argument.

### H.1 Session-local class metadata is lost by a warm bind

`__subclasses__()`, the multiple-inheritance registry (`__bases__`/`__mro__` for
MI classes) and the MRO-override registry are all **session-local, keyed by class
identity, and written only by the class build**. A warm bind runs no class
statement, so nothing repopulates them: a deployed module's classes are missing
from their base's `__subclasses__()`, and a deployed MI class reports its
Smalltalk superclass rather than its declared bases.

**Measured** (3.7.5, `werkzeug.exceptions` deployed): a fresh session that
warm-binds it answers `HTTPException.__subclasses__()` → **0**; after
`importlib.reload()` re-runs the body in the same session → **9**, the number the
source defines.

**This is not cosmetic, and it is the one gap with known user-visible fallout.**
`functools.singledispatch._compose_mro` walks `__mro__` and `__subclasses__` over
the `collections.abc` ABCs, so a deployed `collections.abc` breaks dispatch
resolution. Measured in the CPython corpus: deploying `collections`,
`collections.abc` turns `test.test_functools` from OK into 1 failure + 1 error
(`TestSingleDispatch.test_compose_mro`, and `test_mro_conflicts` raising
"Ambiguous dispatch: Container or Iterable" where the expected answer is
`"sized"`); undeploying it restores the module exactly. The two `test.test_copy`
errors that appear alongside are **not** this bug — they are H.2. Measured with
`collections.abc` warm-bound:

| | warm-bound | after `reload()` re-runs the body |
|---|---|---|
| `Collection.__bases__` | `['Sized']` | `['Sized', 'Iterable', 'Container']` |
| `Collection.__mro__` | `[Collection, Sized, _ABCRoot, object]` | `[Collection, Sized, Iterable, Container, _ABCRoot, object]` |
| `Sized.__subclasses__()` | 0 | 2 |
| `_compose_mro(dict, [MutableMapping])` | drops `Iterable`, `Container` | correct |

`isinstance({}, collections.abc.Mapping)` still answers True, which bounds the
damage: ABC *registration* is definitional and commits, so type checks survive.
What breaks is every consumer that reads the reflective metadata — and
`singledispatch` is one, so this is a wrong-answer bug, not just a bad `repr`.
`deployFrameworks.gs` excluded the module while this was open — a placeholder,
never a solution, since no exclusion list helps a user whose own closure reaches
`collections.abc`. The exclusion went away with the fix.

The fix has a precedent to copy: `metaclass=` had this exact shape (session-local,
written only by the class build, missing after a bind) and was fixed by
committing the record beside the class registry and restoring it on bind
(`___restoreCanonicalMetaclasses___`). One committed per-class record of
`{bases, mro}` would rebuild both the MI registry and the subclass links on bind,
since a class's primary base is its Smalltalk superclass. §7's proposal — put it
on the class instead of in a registry — would do the same job with one less
structure. The MI and MRO registries have the same shape — written only by
`___registerBases___` / `___grailApplyMroHook___` at class build, read by
`__bases__` and `__mro__` — so a warm-bound MI class reports its Smalltalk
superclass rather than its declared bases; that half is by inspection of the same
mechanism, not separately measured.

This is the same shape as the metaclass bug that the deploy work found and fixed
by committing the record — which is the pattern H.3 followed. The MI *methods*
are compiled onto the class and were never affected; it is the reflective
metadata that degraded.

### H.2 A deployed module pins its deploy-time dependencies

`copy.py` does `from copyreg import dispatch_table` at module level and reads
`dispatch_table.get(cls)` at call time — early binding, as CPython does. `copyreg`
is a native `.gs` module, so its instance (and that dict) is **rebuilt every
session**, while a *deployed* `copy` holds the deploy session's dict in its
committed globals. The two are then different objects for the rest of the
repository's life:

```
copy.dispatch_table is copyreg.dispatch_table        -> False
copyreg.pickle(Z, pz, Z); Z in copyreg.dispatch_table -> True
                          Z in copy.dispatch_table    -> False
```

That is the two `test.test_copy` errors (`test_copy_registry`,
`test_deepcopy_registry`): the reducer is registered and `copy.copy` never sees
it. **`pickle` has the identical line** (`from copyreg import dispatch_table as
_dispatch_table`) and is part of the standard framework deployment, so a deployed
image silently ignores every `copyreg.pickle()` registration in `pickle.dumps`
too — measured, and *not* covered by the corpus, where `test.test_pickle` is an
IMPORTERROR for an unrelated reason (`test.pickletester` is not vendored).

This is the same shape as the `sys.modules` seam that the deploy work already
fixed (a deployed module's committed `sys` instance pinned the deploy session's
module dict) — fixed there by making the accessor delegate to the session-local
registry rather than by changing what the body captured.

**Scope.** Auditing all 145 deployed modules for module-level `from X import …`
where `X` is not itself deployed finds 19 such dependencies, but almost every
imported name is a class or function (`timedelta`, `defaultdict`, `chain`,
`sha1`, `Lock`): for a native module those objects are installed once and stable,
so capturing them is harmless. `dispatch_table` is the only *mutable container*
in the set, which is why this shows up as exactly two failures rather than
everywhere. The general hazard remains for user code: a deployed module that
captures a mutable global from a session-rebuilt module gets a private copy.

The fix is H.3. Note what it does *not* do: nothing prevents a user's own
deployed module from capturing a mutable global out of a session-rebuilt one.
That general hazard is documented as the mirror-image rule in §4.3 of the design
document, and the only structural answer would be to make every such
module-level container reachable through an accessor — which is what
`sys.modules` and `copyreg.dispatch_table` now are.

### H.3 How each was fixed, and how the fix was proved

**The metadata gap** got the treatment `metaclass=` already had: a committed
per-module registry (`GrailCanonicalClassStructure`) written at class-registration
time for MI classes only, restored at both acquisition points that skip the body.
The subclass links needed no record — a class is rooted at its Smalltalk
superclass, so `___registerSubclass___` is re-derivable from the class itself.

**The pinning** needed two halves, because either alone leaves it broken:
`copyreg` now holds its table class-side in `SessionTemps` (so any holder of any
copyreg instance, stale included, reads the live table), and `copy.py`/`pickle.py`
read `copyreg.dispatch_table` through the module instead of binding the
dictionary at import time (an early-bound name cannot be redirected by an
accessor).

Both fixes were proved by A/B on the exact failing configuration rather than by a
green run:

| | before | after |
|---|---|---|
| `test_functools`, `collections.abc` deployed | 1 failure + 1 error | OK |
| `test_copy`, `copy` deployed | 5F / 9E | 5F / 7E (the baseline) |
| `Collection.__bases__`, warm-bound | `['Sized']` | `['Sized', 'Iterable', 'Container']` |
| `Sized.__subclasses__()`, warm-bound | 0 | 2 |
| `runModuleBindTest` STRUCTURE checks | 5 named failures | all pass |

The two exclusions that had been keeping the corpus readable were then removed
from `deployFrameworks.gs`, leaving only the original test-reset set.

A note on why the existing `PickleDispatchTableTestCase` had passed throughout:
`super` is seeded into *every* session's table, and its other registered type
round-trips through the default reduction path whether or not the table is
consulted. The fixture now carries a type whose default reduction cannot rebuild
it, and records which reductors actually ran — the difference between asserting a
value and asserting a code path.
