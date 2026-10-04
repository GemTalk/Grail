# App namespaces: one set of globals per application (design)

**Status:** proposal, 2026-10-04. Nothing here is implemented. It follows
from PRs #1295 (the slot-pair owner guard), #1296 (layout propagation through
the persistent class registry) and #1297 (refusing a different file under a
deployed module name, `gemdb.modules`), and from the discussion that led to
them. §9 lists the decisions this note needs before any code is written.

**Related:** [Persistent_Modules_and_Classes.md](Persistent_Modules_and_Classes.md)
(D3 class-attribute overlay, D4 `__persistent__`, D10 module source path),
[GemDB_Module.md](GemDB_Module.md), [LEGB.md](LEGB.md), issue #851 (why
`__main__` is session-local).

---

## 1. The idea

GemDB's goal is to merge the application runtime and the database. Today the
only way into persistence is `gemdb.root[...]`: each run starts with an empty
`__main__`, as in CPython, and anything that should outlive the run has to be
put somewhere deliberately. The alternative this note designs:

> **An application has one set of globals, shared by every run of it. Each
> run starts with the globals of the most recent commit.**

The rabbit-in-the-hat demo becomes `hat = rabbit` rather than
`gemdb.root['hat'] = rabbit`, and the explanation to a newcomer becomes "your
globals are the database" rather than "here is how you reach persistent
objects".

"An application" has to be a named thing. A user runs many programs, and
§2.2 shows what happens when two of them share a namespace by accident. So
the namespace is chosen explicitly, with `gemdb.set_app(name)` or a launcher
option. A run that names no app keeps today's behaviour.

## 2. What goes wrong without it

Both problems below were measured on `main` (gs40, Darwin arm64) during the
work on #1295–#1297.

### 2.1 `__main__` classes have no identity across runs

`__main__` is session-local by design (#851): every run mints fresh classes
and records none of them. So:

1. Run 1 defines `A(x)` and `B(A)(y)` and commits a `B` as `b1`.
2. Run 2 defines `A(x, z)` and `B(A)(y)` and commits `b2`.
3. `type(b1) is type(b2)` is **False**, and `isinstance(b1, B)` is False in run
   2. `b1`'s class is an orphan: named `__main__.B`, and resolvable by no
   session.

When the parent is a framework class, the orphan used to be worse. A
framework `A` that gained `z` kept its identity, and the orphaned `B` inherited
`A`'s new accessor, whose slot position was `B`'s `y`: `b1.getz()` answered
`'Y1'`, and `b1.setz('ZZ')` overwrote `y`. #1295 made that safe (an indexed
accessor now answers only for its own class) and #1296 reaches subclasses in
modules a session never imported. An orphaned `__main__` class is still in no
registry, so it still stays on its old layout. It is safe, but it never
follows its parent.

### 2.2 Two programs share one module cache

The module cache is persistent and keyed by dotted name, per user. Two
programs that each had their own `models.py` used to take turns rebuilding
one set of classes:

```
s1 app A: id(User) 1315570 .../appA/models.py | app A says hi to ann
s2 app B: id(User) 1315570 .../appB/models.py | layout ['name', 'email']
s3 app A: type(u) id 1315570 | app B says hi to ann
```

#1297 makes the second import an `ImportError` (D10), with `gemdb.modules.forget`
and `relocate` as the ways past it. That is a refusal, not a solution. The two
programs still cannot both run in one namespace, and app namespaces are how
they could.

## 3. The model

### 3.1 What a namespace holds

An **app namespace** is everything Grail keeps today under the user, keyed by
module name, plus the `__main__` globals:

| held per namespace | today (per user) |
| --- | --- |
| module backing classes (compiled code binds to them by name) | `PythonModules` SymbolDictionary |
| committed module instances | `UserGlobals #GrailCanonicalModules` |
| source hashes, dependency records | `#GrailCanonicalModuleHashes`, `#GrailCanonicalModuleDeps` |
| canonical classes, `module.Class` → class | `#GrailCanonicalClasses` |
| metaclass, class-structure and body class-attribute records | `#GrailCanonicalMetaclasses`, `#GrailCanonicalDirectMetaclasses`, `#GrailCanonicalClassStructure`, `#GrailCanonicalBodyClassAttrs` |
| `__persistent__` module state (D4) | `#GrailPersistentModuleState` |
| `gemdb.root` | `UserGlobals #GemDBRoot` |
| **`__main__`: its class and its globals** | session-local, never committed (#851) |

Two records are keyed by class *identity*, not by name, so they can stay one
per user: the canonical class set (`#GrailCanonicalClassSet`) and the
committed self-send overrides (`#GrailCommittedSelfSendOverrides`, class →
selectors). So can the deploy and runtime generations.

Each registry already has a single accessor in `importlib`
(`___canonicalModules___`, `___canonicalClassRegistry___`, …). The mechanical
part of the change is making those accessors read the **current namespace**
instead of `UserGlobals` directly.

### 3.2 The shared base

Modules that ship with Grail are the same in every app: the stdlib, Grail's
own runtime modules and `gemdb`. They stay in a **shared base namespace**,
which is today's per-user one, and are deployed once (`deployFrameworks.gs`,
`deployGemdb.gs`). An app namespace layers over it.

**Which namespace a module belongs to is decided by where its file is, not
by its name.** A file under the Grail installation
(`importlib class >> ___bundledRuntimeSource___:` already draws this line) goes
to the shared base. Anything else goes to the current app. So an app's own
`json.py` and the stdlib `json` can coexist, one in each. Within a session,
`sys.modules` is still one dictionary, so the app's `json` shadows the stdlib's
for that run, exactly as a `json.py` ahead of the stdlib on `sys.path` does in
CPython.

Third-party packages (a venv's `site-packages`) are §9 decision 1.

### 3.3 Compiling against a namespace

Generated code reaches an imported module's backing class **by name**,
through `PythonModules` in its compile symbol list
(`importlib class >> ___grailCompileSymbolList___`). Each reference is bound to
a SymbolAssociation in a specific dictionary when the method compiles. So an
app gets its own module-class dictionary, and the compile list for an app's
code becomes:

```
Python  ·  [session-local __main__, default namespace only]  ·  app modules  ·  shared modules  ·  curated kernel
```

App code binds to the app's classes first. Shared code is compiled with no app
dictionary in its list, so it can never bind to one app's class. That matters
because the shared base is deployed once and run by every app.

## 4. Choosing the namespace

```python
import gemdb
gemdb.set_app("shop")      # before the app's first import
import shop.models
```

- **Before any app module is imported.** The namespace decides where every
  later import resolves, so `set_app` raises if a non-shared module has
  already been imported this session, and also if a different app is already
  set. `import gemdb` itself is shared, so it is always allowed first.
- **Also from the launcher.** `gemdb --app shop app.py` (and `./grail --app`),
  or a `GEMDB_APP` environment variable, so a deployment can choose the app
  without editing the top file. The launcher sets it before running anything.
  GemDB's launcher is a fork of `scripts/grail.tpz` (`~/code/GemDB_Code`), so
  the option lands in both.
- **Creating vs. joining.** The first `set_app("shop")` in a repository
  creates the namespace in the current transaction, and it persists at the
  next commit. Later sessions join it. Listing and deleting apps belong in
  `gemdb.admin` (`apps()`, `drop_app(name)`; the latter refuses while the
  app's classes have instances, like `gemdb.modules.forget`).
- **Name.** `set_app`, not `setApp`, to match the rest of `gemdb`
  (`rename_class`, `drop_class`, `needs_commit`).

## 5. `__main__` in an app

### 5.1 Classes

In an app, `__main__` is a canonical module like any other, with the key
`__main__.A` in that app's registry. Run 2 of §2.1 then reuses run 1's `A` and
`B` (identity reuse needs only an unchanged superclass), appends `z` to the
layouts, and gives `B` its own accessors. `type(b1) is type(b2)` is True. #1296's
registry walk reaches `B` when only the framework parent is rebuilt.

Two top files that both run as `__main__` in one app are the same module, so
D10 applies: a different file with different source is refused. An app
therefore has **one** top file, which is what the app name means. Re-running
an edited top file is the normal edit loop.

### 5.2 Globals: a session copy, written back at commit

The globals are **not** a shared dictionary that the running script writes
into. Doing that brings back every reason #851 made `__main__` session-local:

- `import gemdb` on the first line binds a global. Measured on gs40: storing
  the *identical* object back into a committed dictionary still sets
  `needsCommit`. So the session would be dirty before the script's first
  statement, and `with gemdb.transaction():` would refuse.
- `gemdb.abort()` would roll back the script's own top-level bindings,
  including `gemdb` itself on a first run.
- Every top-level temporary (`for line in f:` leaves `line`) would be shared
  mutable state, and two sessions committing it would conflict.

Instead the globals follow D4, which already does this for
`__persistent__`-listed names:

1. **Bind.** When the top file starts, the session's `__main__` globals are
   seeded from the app's committed globals.
2. **Run.** Assignments change the session's copy only. Nothing is dirty until
   the program writes a persistent object.
3. **Write back at commit.** `gemdb.commit()` (and the transaction block's
   commit) already flushes D4 state first (`System class >> commit` calls
   `___flushPersistentState___`). It also writes back each `__main__` global
   whose binding changed since the seed. Unchanged bindings write nothing, so
   re-running a top file that rebinds `gemdb`, `app`, `config` to the same
   objects does not conflict.
4. **Abort** discards the transaction as always. The session copy is left
   alone (§9 decision 3).

What is written back, and what is not:

- **Data:** yes. That is the point (`hat = rabbit`).
- **Modules** (`import x` binds `x`): the binding is written. The module
  itself is already persistent, and its warm bind is cheap.
- **Classes and functions** defined by the top file: their *code* is persistent
  through the canonical registry (§5.1), and the binding is written like any
  other.
- **Values that cannot be committed** (sockets, open files, locks): skipped,
  with a warning naming each. They are session state, as in Persistent Modules
  §4.1 (§9 decision 4).
- **A name the run deleted** (`del x`) is deleted at commit.
- **A name the run never mentioned** survives. That is the whole model ("each
  run starts with the globals of the last commit"), and it is also its hidden
  state: removing a global needs `del`.

### 5.3 Initialize once: `Final`

Re-running the top file re-executes every initializer, so `app = Flask(...)`
builds a new `Flask` on every run and the write-back sees a changed binding.
The Python spelling for "bind once" already exists:

```python
from typing import Final
app: Final = Flask(__name__)
```

A type checker already enforces `Final` as single assignment. CPython evaluates
the right-hand side once per run, and a CPython run starts empty, so "once per
run" and "once per object space" coincide there. Under GemDB, a module-level
`Final` binding that the committed globals already hold **keeps the committed
value and does not evaluate the right-hand side**, like Clojure's `defonce`. So
re-runs write nothing for those names and cannot conflict on them. Nothing in
CPython code changes meaning except that the initializer is skipped on a re-run,
which is the point. (§9 decision 5.)

### 5.4 `gemdb.root`

In an app, the globals do what `root` did. `root` can stay as the app's dictionary
for compatibility (§9 decision 2).

## 6. The default namespace

A run that names no app keeps today's semantics exactly:

- `__main__` is session-local, as #851 made it: fresh classes every run, and
  globals that die with the run;
- the module cache is the user's, shared by every program the user runs, with
  D10 refusing a different file under a deployed name;
- `gemdb.root` is the way into persistence.

So nothing that works today changes, and the documented problems (§2) remain
for programs that do not name an app. That is the trade: an app is what a
program declares when it wants its globals to be the database.

## 7. Two users, one app

"Two users run the same app, possibly from different paths" works within one
namespace. Identity is (app, dotted name); the path does not matter, and D10
refuses only a different file with *different source*, so identical
checkouts at different paths, or on different hosts, share one module. An
*edit* by either user rebuilds the module for both, which is correct for "the
same app": they are running one program. A developer who wants isolation
picks another app name (`shop-dev-james`).

Sharing across GemStone **users** needs more than this note designs:

- The namespace must live where both users can reach it. Today's registries
  live in each user's `UserGlobals`. A shared app needs its dictionary placed
  in both users' symbol lists, with an object-security policy that lets both
  write it, which is GemStone administration.
- More fundamentally, compiled code binds to the `Python` dictionary of the
  Grail installation it was compiled under. On a dev stone every user has their
  own installation (`install.sh` is per user), so one user's compiled classes
  would reference the other's runtime. Sharing an app across users therefore
  implies sharing one Grail installation, which is the production shape, not
  the dev one.

So the first cut makes apps **per user** (`UserGlobals #GrailApps`, name →
namespace), and cross-user apps are a later cut once a shared installation
exists.

## 8. Cuts

1. **Namespace object and accessors.** A `GrailAppNamespace` holding the
   registries of §3.1. Every registry accessor reads `SessionTemps
   #GrailCurrentApp` and falls back to `UserGlobals` (the default namespace).
   No behaviour change while no app is set; this is the cut that proves the
   accessors are the only access path.
2. **Imports resolve per namespace.** File location chooses shared or app;
   the per-app module-class dictionary goes into the compile symbol list;
   `set_app` and the launcher option. Test: two apps each with their own
   `models.py`, both deployed, no refusal, and each app's objects keep their
   own code (the §2.2 scenario inverted).
3. **`__main__` in an app.** A canonical `__main__`, and globals bound and
   written back through the D4 machinery. Tests: §2.1 with `type(b1) is
   type(b2)` True; the rabbit demo across two sessions; a re-run that changes
   nothing writes nothing; abort; an uncommittable value is skipped with a
   warning.
4. **`Final` as initialize-once.**
5. **`gemdb.admin.apps()` / `drop_app()`**, and the docs: GemDB_Module.md,
   Persistent Modules (a new departure next to D4), and the getting-started
   story.

Cross-user apps (§7) come after these.

## 9. Decisions needed

1. **Third-party packages: per app or shared?** Per app is CPython's model
   (each app has its own venv, so two apps can pin different Flask versions)
   and costs one build of each framework per app. Shared builds once but
   forces every app onto one version, and a version change would then be an
   edit to every app at once. *Recommendation: per app.*
2. **`gemdb.root` in an app:** keep it as the app's dictionary, or retire it
   in favour of the globals? *Recommendation: keep it, per app; it costs
   nothing and existing code keeps working.*
3. **Abort and the session copy.** After `gemdb.abort()`, should the
   `__main__` globals keep the run's values (they are the program's local
   state; nothing was committed) or be re-seeded from the committed globals
   (abort means "back to the database")? *Recommendation: keep them.
   Re-seeding would yank values out from under the running script, the very
   surprise #851 removed.*
4. **An uncommittable global at commit:** skip with a warning, or fail the
   commit? *Recommendation: skip and warn. A socket at top level is normal in
   a server script, and failing every commit for it would make the feature
   unusable there.*
5. **`Final` as initialize-once**, or a Grail-specific marker? `Final` needs no
   new syntax and already means single assignment to a type checker. Its
   cost is that skipping the initializer is a departure a reader might not
   expect. *Recommendation: `Final`, documented as a departure next to D4.*
6. **The API's name and shape:** `gemdb.set_app(name)` plus `--app` /
   `GEMDB_APP`, as above.
