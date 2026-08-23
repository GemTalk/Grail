# Persistent Modules and Classes in Grail

**Status:** implemented and unconditional. The canonical module/class machinery
was feature-flagged from 2026-07 to 2026-08; the flag
(`importlib ___canonicalClassesEnabled___`) has been **retired** — there is one
code path, and what a session sees depends only on what has been committed.
Retiring it was not only a tidy-up: the flag defaulted *off*, so every session
that did not opt in (an embedder, the MCP session, the whole CPython suite)
recompiled from source whatever had already been deployed, and dirtied its
transaction doing so. Those sessions now bind what is committed and modify
**0** persistent objects (§8.1).

Instance migration for a changed class *shape* is the one large piece still
missing (§8.3). Two bugs the flag had been hiding — a bind losing an MI class's
bases/MRO and its subclass links, and a deployed module pinning
`copyreg.dispatch_table` — were found by the CPython corpus once it started warm
binding, and are fixed (§4.3;
[history](Persistence_Design_History.md#h-two-bugs-the-flag-was-hiding)).

**Related:** [Persistence_Design_History.md](Persistence_Design_History.md) is
the evidence log — the alternatives that were implemented and falsified, and the
findings that produced the rules below. [LEGB.md](LEGB.md) covers name
resolution; [GemDB_Module.md](GemDB_Module.md) covers the user-facing
persistence API; the code is
[importlib.gs](../src/smalltalk/Python/importlib.gs),
[module.gs](../src/smalltalk/Python/module.gs), and the class-side machinery in
[Object.gs](../src/smalltalk/Python/Object.gs) and
[ClassDefAst.gs](../src/smalltalk/PythonAst/ClassDefAst.gs).

---

## 1. The collision

CPython runs Python in one process against one heap. A module is imported once
per process: the file is read, compiled, executed, and cached in `sys.modules`;
the classes it defines are the same class objects for the life of the process;
and when the process exits, everything — code and data alike — is gone.

Grail runs Python on a shared, persistent GemStone repository. Objects created
in one session are committed and faulted back by later sessions and other users.
In GemStone an object holds a direct pointer to its class, and a class is an
ordinary object: it persists, it is shared, and its method dictionaries persist
with it.

So the two systems disagree about what a module *is*. In CPython it is a
per-process artifact. In Grail it cannot be, because the data it defines the
shape of outlives the process. Everything below follows from that one sentence.

---

## 2. Why not the pure CPython model

The obvious first answer is: change nothing. Let every session import from
scratch, exactly as CPython does — read the source, compile it, execute the body,
mint fresh classes — and let the extent hold only the user's data.

This was Grail's original design, and it does not work. **The type of a
persisted object must match the currently-defined class**, and under
re-import-from-scratch it cannot.

A committed instance holds a pointer to *the class object that made it*.
Re-executing the module body in a later session builds a **different** class:
Grail's Python classes are anonymous (`Class.gs`'s `___subclass___` creates every
one with `inDictionary: nil`), so nothing dedupes them by name. The consequences
are not subtle:

- `isinstance(persisted_obj, ReimportedClass)` is **False**. The instance's class
  and the imported class have the same name, the same methods, the same source —
  and different identity. The original divergence probe recorded exactly this.
- **Edits never reach persisted instances.** They are frozen on the class version
  of the session that created them, because that is the object they point at.
- **The extent accumulates near-duplicate classes** — one per session that ever
  imported the module and committed anything reachable from it.
- `pickle`, `copy`, `__subclasses__()`, and every registry keyed by class
  identity see two unrelated types where the user sees one.

The tempting reply is "then don't commit the classes" — but that is not on
offer. GemStone commits by reachability: the moment a user commits an object,
its class goes with it. There is no mode in which the data persists and the code
does not. So the pure model is not a simpler design with fewer features; it is
**incoherent in a persistent image**. The data is persistent whether or not the
code is, and the two have to agree.

There is a second, milder reason: cost. Re-executing every module per session
means re-parsing and re-compiling every module per session. Measured on the test
suite, compiling the flask/werkzeug/jinja2/twilio closure is ~110s *per session*;
binding the committed equivalent is milliseconds, and that difference is most of
the suite's wall clock (full gate 194s → 104s).

---

## 3. Why not "a commit saves everything"

The opposite pole is equally simple to state: run the body once, commit whatever
it produced, share all of it. Every session then sees one module, one set of
classes, one set of globals.

This fails on the *contents* of a real module body. Python has one syntax for
values with completely different intended lifetimes:

```python
NEXT_INVOICE = 1          # shared, must survive and be updated transactionally
_cache = {}               # scratch; sharing it across users is a bug
_lock = threading.Lock()  # meaningless outside the session that made it
_conn = socket.create_connection(...)   # dead in any other session
```

Nothing in the source distinguishes them, and no static analysis can: `x = expr`
is `x = expr`. Committing them all produces three distinct failure families,
each of which Grail has actually hit:

1. **Write-write conflicts between sessions that only *read* the module.** The
   original bug report that started this work: a module keeping mutable state in
   its committed instance made two users' unrelated imports collide on commit.
   This is why module instances and the several class-identity registries live in
   `SessionTemps` today.
2. **Values that cannot be committed at all.** `threading.Lock()` wraps a
   GemStone `Semaphore`, a non-persistable kernel class; the first real deploy of
   a Flask app failed with `TransactionError 2407` on exactly that. (`PyThreadLock`
   is now `#dbTransient` with a lazily re-created mutex.)
3. **Values that commit and then fault in *dead*.** Compiled regexes holding C
   pointers (werkzeug's URL rules), `GsFile`/`GsSocket` handles, `WeakReference`s
   (flask held `weakref.proxy(app)`, which faults in dead by contract), `os.environ`
   snapshots, clock and seed captures.

So "commit everything" is not a conservative choice — it silently converts
session-scoped junk into permanent, shared, sometimes unusable state. And it
answers the invoice-number case no better than the cache case, because it
treats them identically.

**Neither pole works, and the reason is the same in both directions:** a module
body interleaves three kinds of thing, and a model that gives all three the same
treatment is wrong about two of them.

---

## 4. The model

Two sentences:

> **A module is a compiled artifact in the database, produced by one execution of
> its body per source version, and *bound* — never rebuilt — by every import
> afterwards.**
>
> **What that one execution produced is the artifact and persists with it;
> everything a later session does is that session's own and dies with it.**

The first sentence is CPython's import cache, lifted from *per process* to *per
repository*. That is not a departure from Python: `import` of an
already-imported module never re-executes in CPython either. Grail widens
"already imported" to "already in this database", which is the whole point of an
image.

The second sentence is the line that resolves §3. It is **temporal, not
categorical**: the question is not *what kind of value is this* but *when was it
made*. Everything the definitional run produces — classes, functions, compiled
methods, the sentinels and registries the body built, decorator side effects — is
one consistent graph, committed together. Everything after it is session state.

### 4.1 The three tiers

| Tier | Examples | Treatment | Where it lives |
|---|---|---|---|
| **Code** | classes, functions, compiled methods, the module class, class-body attribute defaults, `__annotations__` | committed once per deployed source version | the module class in `PythonModules`; anonymous user classes reachable from the module instance |
| **Persistent state** | body-created singletons (`dataclasses.MISSING`), decorator registries, computed constants, `__persistent__` globals | committed **with** the module instance — same execution, same graph | the module instance's dynamic instVars; `GrailPersistentModuleState` for `__persistent__` names |
| **Session state** | sockets, `GsFile`/`Transcript` handles, locks, C pointers, caches, `os.environ` | rebuilt per session, never committed | `SessionTemps` via `SessionDict` / `gemstone.sessionDict(name)`; re-bound by `__session_init__` |

The middle tier is the one both poles in §2 and §3 get wrong, and the one that
makes the temporal rule necessary. `dataclasses.MISSING` is a plain module
global — "state" by any categorical test — but every committed dataclass's
default-detection compares against it *by identity*. It must be exactly as
persistent as the classes that reference it, and it is, because the same body
run made both.

### 4.2 The two verbs

**`import` binds. `deploy` commits.** Nothing else writes.

- `import` never calls `commit`. A hidden commit inside `import` would flush
  whatever else the session had in flight — surprising and wrong in a database
  where the developer owns the transaction boundary.
- A **deploy** is a cold import plus an explicit commit, done deliberately:
  [deployFrameworks.gs](../scripts/deployFrameworks.gs) /
  [deployGemdb.gs](../scripts/deployGemdb.gs) for the framework and gemdb
  closures, or a developer's own `gemdb.commit()` after importing their app.
  Note what is *not* in that list: `install.sh` commits Grail's Smalltalk
  runtime and lays the vendored `.py` files on disk, but it deploys no Python
  module, so a freshly installed extent has nothing to bind (§8.1).
- "Deployed" has a precise meaning in the code: **`isCommitted`**. A registry
  entry a session recorded in its own transaction and never committed is not
  deployed, and a session that never commits therefore gets CPython-style
  cold semantics throughout. It is also what `GRAIL_TEST_COLD=1` now means:
  skip the deploy, so the shards find nothing committed to bind. Note the
  weakened guarantee — that is *fully* cold only on an extent which has never
  been deployed; where an earlier run committed a closure, it still binds (§8.5).

### 4.3 What a bind has to restore

The body not running is the point of a bind — and it is also the trap. Anything
Grail keeps in **session-local** storage that only the class build or the module
body writes is, by construction, absent in a session that binds. Two such records
existed and were both wrong for a bound module before being fixed:

| Record | Home | Restored by |
|---|---|---|
| `metaclass=` | `SessionTemps`, written by the class build | `___restoreCanonicalMetaclasses___:` from a committed per-module registry |
| an MI class's declared bases + MRO | `___miRegistry___` (SessionTemps) | `___restoreCanonicalClassStructure___:` from `GrailCanonicalClassStructure` |
| direct-subclass links (`__subclasses__()`) | `___subclassRegistry___` (SessionTemps) | the same method, *derived*: a class is rooted at its Smalltalk superclass |

**The rule, stated once so the next such record is caught by review rather than
by a user:** if the class build writes it and it is not on the class, a bind
cannot see it. Either commit a record and restore it at every acquisition point
that skips the body — the warm bind *and* the lazy singleton adopt — or derive it
from the class. A Smalltalk `Class` cannot hold dynamic instVars, which is why
these records live beside the class rather than on it, and why §7 proposes moving
them onto it with reserved slots.

The mirror-image trap applies to module state: a **deployed** module's committed
globals hold whatever its body captured, so an early-bound name
(`from copyreg import dispatch_table`) freezes the deploy session's object while
the rest of the system moves on. Native modules make this sharpest, because their
*instances* are session-local even though their classes are install-stable — so
their mutable module state must be reached through an accessor, never captured.
`sys.modules` and `copyreg.dispatch_table` are both held class-side in
`SessionTemps` for exactly this reason.

---

## 5. Departures from the model, and why each exists

The model above is the target. Eight things depart from it. Each is here because
of a specific failure, and each is a place where a future simplification would
have to answer that failure.

### D1. There is a cold path (development)

Requiring a deploy before code can run at all is intolerable in development, so a
module with no committed artifact — or whose source hash no longer matches —
parses, compiles, and executes **in the current transaction, without
committing**. Edit, re-run, repeat; you commit when you decide to.

The cost is real and is §8.1: the cold path is the only part of `import` that
writes committed objects, and it therefore leaves the transaction dirty before
the user's first line.

### D2. A source edit reuses the class's identity (the hybrid)

Strictly, "one artifact per source version" would make an edited module a *new*
artifact with new classes, stranding every persisted instance on the old one.
Instead, a stale-hash rebuild **reuses the registered class object's identity**
and recompiles its methods in place, so persisted instances follow the edit.

That makes the rebuild a hybrid — the object is the previous body's, the code is
the new body's — and hybrids need reconciliation in both directions:

- an attribute or method the new body **dropped** is written by nobody and
  removed by nobody, so it survives the edit. `___grailResetClassNamespace___`
  and `___grailResetClassMethods___` clear the class's own namespace and its
  three wholly-derived method categories at the point in the rebuild
  corresponding to CPython handing the class statement a fresh namespace.
- an attribute the new body **added** needs a new classInstVar slot, and a reused
  class cannot grow one (slots live on the metaclass; a metaclass is never
  modifiable). `___canonicalSlotsSatisfied___` detects this and declines the
  reuse, which re-mints — losing identity, which is worse than reuse but better
  than a class that will not build, and is what CPython does anyway.

Details and the failure table are in the history log, §B.

### D3. Runtime class-attribute mutation is session-local

CPython lets you assign to a class at runtime (`Cls.x = v`, `setattr`,
`@dataclass`'s stamping). On a *shared, committed* class that write would dirty
the class for every user. So a store on a **canonical** class routes into a
session-local overlay (`GrailClassAttrOverlay`), consulted ahead of the committed
value by the four read paths, with `del Cls.x` removing the overlay entry and
letting the committed value show through again.

The boundary is temporal, as in §4: class-body and decorator stores run *before*
the class is registered canonically and therefore land on the class and commit
with it; stores after registration are runtime mutation and go to the overlay.

This is a deliberate departure from CPython (a mutation is not visible to other
sessions) and *not* a departure from the model — it is the model's second
sentence applied at class scope.

### D4. `__persistent__` opts module globals back into sharing

The invoice-number case from §3 needs a way to say "this global is shared and
committed". It is a declaration, not an inference:

```python
count = 0
registry = RcKeyValueDictionary.new()
__persistent__ = ['count', 'registry']
```

Listed names bind from a committed per-module store on import (the initializer
runs, the committed value wins), and rebinding one writes through at the
developer's own `gemstone.system.commit()`. Concurrency is explicitly the
developer's problem: a bare shared counter *will* produce write-write conflicts,
which is the signal to choose a conflict-tolerant value (an `RC*` collection, a
per-session key). Grail neither forces nor forbids `RC*`.

### D5. `__session_init__` rebuilds the session tier

Because the body does not re-run, a module that needs per-session resources gets
one hook, run once per session at every point a session *acquires* the module —
after a cold body run, after a warm bind, and after `reload()`. A `sys.modules`
cache hit does not re-run it.

### D6. `del sys.modules[m]` then re-import raises

Deleting the cache entry is a deliberate "give me fresh execution" request.
Handing back the committed artifact would silently run the caller's next lines
against state they just tried to discard, so the import raises with instructions
to use `importlib.reload()` instead. The guard applies only to that
within-session pattern; the session-boundary bind is silent, because it is the
feature.

The contract this buys is worth stating plainly: **within a session, Grail either
behaves as CPython does or raises with instructions. The only silent divergence
is at the session boundary.**

### D7. An install invalidates every deployment

`install.sh` recreates the Python runtime classes (exceptions, builtins) with new
identity, so a module deployed under the previous install holds compiled
references to dead class objects — producing exceptions no `except` clause can
match. `install.gs` bumps `GrailRuntimeGeneration`;
`___canonicalGenerationCheck___` (memoised once per session) compares it against
`GrailCanonicalDeployGeneration` and, on a mismatch, discards every canonical
registry in-transaction. **An install is a runtime upgrade, and a runtime upgrade
implies redeploy** — enforced rather than remembered.

### D8. Native (`.gs`) modules bypass all of this

`sys`, `os`, `socket`, `time`, `gemstone`, … are Smalltalk classes installed and
committed by `install.sh`. They never go through `loadModuleFromPath:`, so they
are never canonical-bound; their singletons are rebuilt per session by
construction. Importing one is a pure read — measured: **0 persistent objects
modified**.

The one seam this created is instructive: a *deployed* `.py` module holds a
committed reference to the `sys` **instance** from the deploy session, so
`sys.modules` read through it answered a stale dict. Fixed by making the
instance-side accessor delegate to the session-local class-side registry.

---

## 6. Lifecycle

### 6.1 A module

A module is in exactly one of these states, per repository and per session:

| State | Test | What the next `import` does |
|---|---|---|
| **unknown** | no `GrailCanonicalModules` entry | cold: parse, compile, run body, register in-transaction |
| **session-built** | entry present, `isCommitted` false | cold again in a new session (the entry died with the transaction) |
| **deployed** | entry present and `isCommitted`, source hash matches | **bind**: register in `sys.modules`, adopt as singleton, restore metaclasses, run `__session_init__`. The body does not run |
| **deployed-stale** | entry committed, source hash differs | cold rebuild, reusing class identities where the shape allows (D2) |
| **cached** | present in this session's `sys.modules` | nothing — a dict hit, as in CPython |
| **evicted** | loaded this session, then removed from `sys.modules` | raises (D6) |

The cold path, in order ([importlib.gs](../src/smalltalk/Python/importlib.gs)
`loadModuleFromPath:name:`):

1. hash the source; compare with the committed per-module hash; stamp this
   session's verdict `#stale` (a body run is always fully cold).
2. parse; expand `from X import *`; `___buildModuleClass:name:` — `module
   subclass: <name> … inDictionary: PythonModules`, which **re-parents an
   existing class** rather than minting a rival, then compiles stub methods for
   every top-level `def`.
3. record the source hash (in-transaction).
4. create the instance, adopt it as the class's session singleton *before*
   running the body (so self-referential module code cannot mint a second one),
   set `__name__` / `__package__` / `__file__` / `__loader__`.
5. register in `sys.modules` **before** executing, so circular imports resolve.
   A body that raises unloads the module and re-signals, so a half-built
   instance is never left cached.
6. run the body. Each module-scope `class` statement goes through
   `___canonicalSubclassOf:` (mint or identity-reuse) and ends with
   `___canonicalClassRegister___` recording the final post-decorator object.
7. `___syncPersistentState___` (D4), then `___runSessionInit___` (D5).
8. record the instance in `GrailCanonicalModules` — in-transaction. A later
   commit makes it a deployment.

The warm path is steps 1 and then: bind the committed instance, adopt, register,
restore the class-side records the body would have written
(`___restoreCanonicalMetaclasses___`, `___restoreCanonicalClassStructure___` —
§4.3), `___runSessionInit___`. **Zero compiles.**

`reload()` is the explicit cold path: force the verdict stale, rebuild in place
on the same instance (identity preserved, as CPython does), update the hash and
registry entry, re-run `__session_init__`.

### 6.2 A class

1. **Minted** by `___subclass___` — anonymous (`inDictionary: nil`). Its only
   references are the module global the class statement binds and the canonical
   registry entry.
2. **Populated** by the class body: methods compile into it; attribute defaults
   become getter/setter pairs over classInstVar slots on its metaclass;
   `__slots__` become real named instVars.
3. **Wired**: the metaclass hook (`___pyClassDefined___:`) runs, then decorators
   — which may return a wrapper instead of the class.
4. **Registered**: `___canonicalClassRegister___` records the final object and
   adds the class to `GrailCanonicalClassSet`. *This is the moment the
   definitional window closes* (D3).
5. **Committed** — or not — with its module, by reachability, at the developer's
   or the deploy's commit.
6. **Bound** in later sessions: reached through the module instance's globals; no
   class statement runs.
7. **Refreshed** on a stale rebuild (D2), or **re-minted** if its shape changed.

### 6.3 What a commit carries

Everything reachable from what you commit. Committing an *instance* commits its
class, its method dictionaries, its metaclass records, and — because the module
instance holds the module's globals — potentially the module's whole graph. That
is why:

- the session tier must be storable *outside* the module instance
  (`SessionDict`), or a deploy sweeps a dead socket into the repository;
- `gemstone.deploy_check(module)` exists: an on-demand pre-commit audit that
  walks the not-yet-committed graph and names the session-bound values a commit
  would sweep in (open handles, `Semaphore`, raw `CPointer`, unrecompilable
  `SrePattern`, `SreMatch`, `WeakReference`), each with a path from the module.
  It is an audit, not a write barrier.

---

## 7. The registries — and why the class cache is nearly redundant

Five committed structures, all in `UserGlobals`, all reduced-conflict types, all
discarded together by the generation guard (D7):

| Registry | Key → value | Question it answers | Reachable another way? |
|---|---|---|---|
| `GrailCanonicalModules` | dotted name → module instance | what do I bind? | no — this is the artifact |
| `GrailCanonicalModuleHashes` | dotted name → source `sha1Sum` | is the artifact current? | no |
| `GrailCanonicalClasses` | `module.classname` → final class object | which class object does this class statement reuse? | **yes — the module instance's globals** |
| `GrailCanonicalClassSet` | set of class objects | is this class past its definitional window? | it is a *predicate on a class*, not a lookup |
| `GrailCanonicalMetaclasses` | module → (class → metaclass) | what was `metaclass=`? | no — but it is *per-class data with no home on the class* |

**So: is a separate class cache needed? Almost entirely not.** Registration
happens only for `isModuleScopeClassDef` class statements, keyed by the module's
dotted name and the class's simple name, and stores the same post-decorator
object the module global holds. Every key therefore corresponds to a binding in
the committed module instance's own globals — a class *is* always reached via its
module. And the lookup that needs it, `___canonicalSubclassOf:`'s identity reuse,
runs while the *previous* artifact is still registered, so it could read that
instance's globals instead of a parallel map.

Two caveats keep this from being a pure identity. A body that rebinds or deletes
the name after its class statement (`C = wrapper`, `del C`) leaves the registry
holding a class the globals no longer name — the registry is a record of what the
statement *built*, the global of what the module *exports*. And nested classes
(`Outer.Inner`) are not registered at all: only `isModuleScopeClassDef`
statements are, so the registry is a subset of the module's globals, never a
superset.

The two things the class-side registries do that the module cannot are not
lookups at all:

- **the canonical *set*** answers a per-class boolean ("has this class been
  registered yet?") that decides whether a store is definitional or runtime. It
  wants to be a **marker on the class**, not a shared bag — an O(1) local test
  instead of a committed structure every cold import mutates.
- **the metaclass map** exists because a Smalltalk `Class` cannot hold dynamic
  instVars, so `class C(metaclass=M)` has nowhere on `C` to record `M`. Grail
  already gives classes real classInstVar slots for class attributes; **one
  reserved slot** would hold this and delete the registry, the string-keyed join
  in `___restoreCanonicalMetaclasses___`, and a whole class of
  registries-out-of-step bugs.

What the redundancy costs today: five structures to keep in sync, five to wipe on
a generation change, four for a test's `ensure:` block to save and restore, a
`module.classname` string join on every class statement, and the possibility of a
class-registry entry whose module instance is gone. The phase ordering explains
it — the class registry landed in phase 1, the module registry in phase 5, and
by then the class registry was load-bearing — but nothing defends it now.

**Proposed simplification (not implemented):** one committed record per module —
`{instance, sourceHash}` — plus a canonical marker and a metaclass slot on the
class. That is two registries collapsed into one and two moved onto the objects
they describe.

**A related suspicion, worth confirming before it is relied on:**
`___canonicalClassProbe___` may now be unreachable-by-construction. It only
returns a class when this session's verdict for the enclosing module is
`#match`, and every path that runs a module body stamps `#stale` first
(`loadModuleFromPath:` and `reload:` both do); the only path that sets `#match`
is the warm bind, which returns without running a body. If that is airtight, the
probe and its per-class-statement emit can go. It should be settled with an
instrumented run rather than by reading, since the emit is in generated code.

---

## 8. Remaining issues

### 8.1 A cold import still dirties the transaction

Measured on a fresh 3.7.5 session, counting distinct committed objects via
`System _numPersistentObjsModified`: importing a **deployed** module modifies
**0**, as does any native `.gs` module. Cold-loading an **undeployed** `.py`
module modifies 6 objects for a small fixture and 54 for a larger one.

Which modules are deployed is a property of the *extent*, not of the install:
`install.sh` commits Grail's Smalltalk runtime but deploys no Python modules at
all, so a freshly installed extent binds nothing and every `.py` import is cold.
A deploy action is what changes that, and it carries its transitive closure with
it — `deployFrameworks.gs` names 16 modules and commits **147**, because
flask/werkzeug/jinja2/twilio pull that much of the vendored stdlib in with them
(which is why `operator` is warm on a test machine). So the cold path is where
your *own* code lives during the edit loop, and on an undeployed extent it is
where everything lives — which is precisely the session in which an unexpected
`PendingChangesError` is most confusing.

The writer is not `import` but *compiling*: `module subclass: … inDictionary:
PythonModules` adds to (or re-parents inside) a committed `SymbolDictionary`, and
a class that already exists there is recompiled in place. Those writes buy
nothing at runtime — abort right after a cold import and the module still works —
but they make `System needsCommit` true before the user's first statement, which
is exactly what [gemdb](GemDB_Module.md)'s transaction-entry check exists to
refuse.

**Fix worth doing:** compile an undeployed module into a **session-local**
dictionary inserted into the compile symbol list (Grail already does this for
per-eval module scopes and for env-1 session methods), and promote the class into
`PythonModules` only at deploy. A cold import would then create only new objects
and touch nothing committed, making "import modifies no committed object" a true
invariant rather than a property of deployment state. The cost is that a
developer's own commit would no longer make a cold-imported module findable *by
name* in the next session without a deploy — which is the explicit-deploy rule
this document already prefers.

### 8.2 Mutable class-body values are shared by accident

`_cache = {}` in a class body is definitional by timing, so it commits with the
class; but its *purpose* is nearly always session scratch. D3's overlay catches
*rebinding* (`Cls._cache = {}`) and not *in-place mutation*
(`Cls._cache[k] = v`), which writes a committed dict: dirty transaction,
cross-user conflicts. Same shape at module scope for anything not listed in
`__persistent__`.

Wanted: a class-scope `__transient__ = [...]` (SessionDict-backed, the mirror of
D4), and a `deploy_check` predicate that flags mutable class-body containers the
way it already flags sockets and locks.

### 8.3 Instance migration for a changed class shape

Decided (2026-07-13) that it must never be an import side effect, and deferred
behind the source hash: it is only needed when someone edits a *deployed* module
in a way that changes instVar shape. D2 handles behavior-only edits; a shape
change re-mints and strands existing instances on the old class. This is the
largest missing piece, and it is the one that decides whether Grail is
deployable for long-lived customer data.

### 8.4 Smaller items

- **Decorator-identity staleness.** `Grail-Dataclass`, `Grail-NamedTuple` and
  `Grail-Annotations` methods are emitted only when a class *is* one of those, so
  dropping the `@dataclass` decorator on an edit leaves its synthesised methods
  behind. Arguably the class is a different class at that point.
- **`deploy_check` v1 gap.** It follows only non-committed references, so a new
  resource held through an already-committed-but-dirty object is not reached;
  that needs the VM dirty set.
- **Concurrent same-module cold import** collides on `PythonModules`, which must
  stay a plain `SymbolDictionary` for name resolution. Deploys should come from
  one session; the retry protocol (first commit wins, loser aborts and replays)
  is measured and converges.
- **Hash granularity** is per module. Per class would recompile less on an edit.

### 8.5 `GRAIL_TEST_COLD=1` is no longer a complete cold mode

It works by skipping the deploy, which was a complete answer while the retired
feature flag *also* gated warm binding: with the flag off nothing bound, whatever
was committed. Binding is now unconditional, so a previously deployed closure
still binds and the "everything recompiles" claim holds only on an extent that
has never been deployed. The warm-vs-cold discrepancy check is correspondingly
weaker.

Restoring it would need a genuine diagnostic switch — a session setting that
makes `loadModuleFromPath:` ignore committed instances. That is deliberately not
the feature flag returning: the flag decided whether the mechanism existed at
all, where this decides only whether one session uses it, and it should be named
and documented as a debugging aid rather than as configuration.

---

## 9. Invariants worth testing

These are the properties the design stands on. The first two are the ones that
regress silently.

1. **A deployed module's import modifies zero persistent objects.** Assert on
   `System _numPersistentObjsModified` — a count, not `needsCommit`: the count
   localises the writer, and a boolean only says "dirty". This is what
   [gemdb](GemDB_Module.md)'s clean-entry check depends on.
2. **Nothing in the import path commits.** No `System commit` /
   `commitTransaction` reachable from `import`.
3. **A warm bind compiles nothing** — zero `___compileMethod:` sends, which is
   also what makes concurrent importers conflict-free.
4. **A module body runs once per deployed source version** — the `__session_init__`
   / `init_count` checks in `runModuleBindTest.gs`.
5. **Cross-session class identity holds**: a committed instance's class is the
   class a later session's import binds (`isinstance` works).
6. **An edit reaches persisted instances** (D2), and a shape change re-mints
   rather than failing to build.
7. **A generation bump invalidates deployments** (D7).
8. **A warm-bound class is as reflective as a cold-built one** — it appears in
   its base's `__subclasses__()`, and an MI class reports its declared
   `__bases__`/`__mro__` (§4.3). Guarded by `runModuleBindTest.gs`, whose five
   `STRUCTURE` checks all fail against the pre-fix build. This is the invariant
   that would have caught the `singledispatch` fallout the moment the first
   framework closure was deployed, rather than two months later when the CPython
   corpus started warm binding.
9. **A registration in a session-local module reaches a deployed consumer** —
   `copyreg.pickle()` is honoured by `copy` and `pickle` (§4.3's mirror image).
   Guarded by `PickleDispatchTableTestCase`, whose discriminating case is a type
   whose default reduction cannot rebuild it.

Harnesses: `runCanonicalClassTest.gs` (cross-session reuse, edit workflow),
`runModuleBindTest.gs` (the session-A/B acceptance test, reload, the D6 guard),
`runFlaskDeployTest.gs` (a real framework closure), `runOverlayReuseTest.gs`
(D3), `runPersistentStateTest.gs` (D4), `runEphemeronCommitTest.gs`
(commit-safety), `run_concurrent_import_test.sh` (two interleaved sessions).
The sharded SUnit suite runs against the deployed framework closure, so warm
binding is exercised by every run.

---

## 10. Where things live

| Concern | Selector / name |
|---|---|
| module load, warm bind, cold build | `importlib class >> loadModuleFromPath:name:` |
| module class creation | `___buildModuleClass:name:` → `module subclass:… inDictionary: PythonModules` |
| class mint / identity reuse | `___canonicalSubclassOf:name:module:instVarNames:classInstVarNames:` |
| shape check before reuse | `___canonicalSlotsSatisfied___:names:` |
| class-statement epilogue | `___canonicalClassRegister___:name:value:` |
| namespace / method reset on rebuild | `object >> ___grailResetClassNamespace___`, `___grailResetClassMethods___` |
| runtime class-attr overlay | `object >> ___classAttrOverlayStore___:name:value:`, `GrailClassAttrOverlay` |
| metaclass restore on bind | `___restoreCanonicalMetaclasses___:` |
| lazy first-touch bind | `module class >> instance` → `___canonicalInstanceForModuleClass___:` |
| `__persistent__` | `___syncPersistentState___:`, `___flushPersistentState___`, `GrailPersistentModuleState` |
| `__session_init__` | `___runSessionInit___:` |
| session storage for Python | `gemstone.sessionDict(name)`, `_grail_session.SessionDict` |
| generation guard | `___canonicalGenerationCheck___`, `GrailRuntimeGeneration` |
| pre-deploy audit | `importlib ___deployCheck___:` / `gemstone.deploy_check(module)` |
| session refresh after an install | `importlib resetSessionForReinstall` |

Session-local (never committed): `GrailSysModules`, `GrailModuleInstances`,
`GrailModuleHashState`, `GrailMintedThisLoad`, `GrailClassAttrOverlay`,
`GrailSubclassRegistry`, `GrailMiRegistry`, `GrailMroOverrideRegistry`,
`GrailFunctoolsPlaceholder`, and the `CallAst` compile context.

---

## 11. Where the old paragraph numbers went

This document was rewritten in 2026-08 and renumbered. Roughly forty comments in
the code cite the *old* numbers (`par.10.4`, `par.9.1`, …), and they are cited by
paragraph precisely because that is stabler than quoting prose — so rather than
leave them dangling, here is the mapping. New comments should cite the numbers in
the left-hand column of the *new* scheme, i.e. the right-hand side below.

| Old | Subject | Now |
|---|---|---|
| par.4 / par.4.1 | the import cache; `import` never commits | §4.2 (the two verbs) |
| par.6 / par.6.2 | `__persistent__` module state | §5 D4 |
| par.7 | runtime class-attribute overlay | §5 D3 |
| par.9.1 | phase-1 canonical classes; identity reuse on a stale rebuild | §5 D2, and [history](Persistence_Design_History.md) F |
| par.9.2 | reconciling a reused class with an edited body | [history](Persistence_Design_History.md) B |
| par.10 / par.10.2 | bind the committed module; do not re-run the body | §4 (the model), §6.1 |
| par.10.1 | the falsified reuse-code/re-run-body experiment | [history](Persistence_Design_History.md) A |
| par.10.4 | the session tier; `__session_init__`; `SessionDict` | §4.1 (tiers), §5 D5, [history](Persistence_Design_History.md) C |
| par.10.4b | the generation guard | §5 D7, [history](Persistence_Design_History.md) D |
| par.10.5 | divergences from CPython; the delete-and-reimport guard | §5 D6, [history](Persistence_Design_History.md) E |
| par.10.6 | the session-A/B acceptance test | §9 (invariants), `runModuleBindTest.gs` |
| par.10.7 | rollout phases; the concurrency measurement | [history](Persistence_Design_History.md) F |
| par.8.4 / par.8.7 | the two bugs the flag was hiding | §4.3, [history](Persistence_Design_History.md) H |

---

## 12. Relationship to the annotations work

Function, method and class `__annotations__` sit on the **code** tier (class-side
instVars and compiled class-side methods; module-function annotations in a
session-local table matching the session-local module instance). They ride along
with whatever this design does — no rework needed.
