# App namespaces: one set of globals per application (design)

**Status:** design agreed 2026-10-04; nothing is implemented yet. It follows
from PRs #1295 (the slot-pair owner guard), #1296 (layout propagation through
the persistent class registry) and #1297 (refusing a different file under a
deployed module name, `gemdb.modules`), and from the discussion that led to
them. §10 records the decisions; §9 is the order to build it in.

**Related:** [Persistent_Modules_and_Classes.md](Persistent_Modules_and_Classes.md)
(§4.1 the three tiers, D3 class-attribute overlay, D4 `__persistent__`, D5
`__session_init__`, D9 abort unloads, D10 module source path, §8.2 the wanted
class-scope `__transient__`),
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

Third-party packages (a venv's `site-packages`) belong to the **app**, not the
shared base (§10, decision 1): each app has its own venv, as in CPython, so two
apps can pin different versions of a framework. The cost is one build of each
framework per app.

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

An app's state falls into the three tiers Persistent Modules §4.1 already
names. The work that led here touched two of them, and they are separate
decisions:

- **Code.** §2.1 (hypothetical 1) is about class *identity* across runs. A
  canonical `__main__` (§5.1) fixes it, whatever the globals do.
- **Persistent state.** The rabbit demo is about *data*: §5.2.
- **Session state.** Sockets, files, locks and scratch values must never be
  committed, and an app has to be able to say so: §5.3 and §6.

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

### 5.2 Globals are persistent, with GemStone semantics

In an app, `__main__`'s globals are a **persistent dictionary** of the app,
and they behave as persistent objects always have in GemStone:

- **Each run starts with the globals of the last commit.**
- **An assignment is a write**, visible to this session at once and to other
  sessions after a commit.
- **A failed commit keeps the session's changes**, so the program can inspect
  the conflict and decide (`gemdb.ConflictError`, as today).
- **`gemdb.abort()` reloads the committed values.** A global the run had
  rebound reads its committed value on the next line; a global first bound by
  this run is gone.

Three objections made #851 keep `__main__` session-local, and this design
answers each:

1. **"The session is dirty before the script's first statement."** `import
   gemdb` rebinds a global, and measured on gs40, storing the *identical*
   object back into a committed dictionary still sets `needsCommit`. So a
   module-level store of an object **identical** to the current binding is
   skipped: codegen emits one identity compare before the store. A re-run
   that rebinds `gemdb`, `app` and `config` to the same objects writes
   nothing. On a first run the stores coincide with the cold imports, which
   dirty the transaction anyway, so "import inside the transaction that
   commits it" (Persistent Modules §4.2) still describes it.
2. **"An abort on a first run unbinds `gemdb` itself."** That is consistent,
   not surprising: D9 already unloads every module an abort rolls back, so the
   binding goes with the module it named.
3. **"Every top-level temporary becomes shared, conflicting state."** It does,
   unless declared transient (§5.3). A top file that loops at top level
   declares its loop variable; one that does not is told so at commit if the
   value cannot be committed (§6), and otherwise simply persists it.

`gemdb.root` in an app is an **alias** for these globals: a mapping view, so
`gemdb.root["hat"]` *is* the global `hat`. A second persistent root would earn
its keep only if the globals were not themselves the database. Existing code
that uses `root` keeps working. Outside an app, `root` is unchanged (§7).

### 5.3 `__transient__` and `__persistent__`: the default flips with the app

Which names are session state is declared per module, symmetrically:

```python
__transient__ = ["sock", "line"]      # in an app: these names are never committed
__persistent__ = ["count"]            # outside an app (D4): these names are
```

- **In an app, globals are persistent by default.** `__transient__` names the
  exceptions. A transient global is session state: it is never committed,
  survives an abort untouched, and starts unbound in each run, so the top
  file's own assignment rebinds it (the socket is reopened, the loop variable
  reset).
- **Outside an app, globals are transient by default**, as today, and D4's
  `__persistent__` opts names in. It is already implemented, including its
  flush at `gemdb.commit()`.

Naming an app is how a program says "my globals are the database". The
declaration a reader has to look for is always the exception.

### 5.4 Initialize once: `Final`

Re-running the top file re-executes every initializer, so `app = Flask(...)`
builds a new `Flask` on every run, and the new binding is a write. The Python
spelling for "bind once" already exists:

```python
from typing import Final
app: Final = Flask(__name__)
```

A type checker already enforces `Final` as single assignment. CPython evaluates
the right-hand side once per run, and a CPython run starts empty, so "once per
run" and "once per object space" coincide there. Under GemDB, a module-level
`Final` binding that the committed globals already hold **keeps the committed
value and does not evaluate the right-hand side**, like Clojure's `defonce`. So
re-runs write nothing for those names, and several sessions starting the same
app (web workers, say) cannot conflict on them. The only change from CPython is
that the initializer is skipped on a re-run, which is the point. It is
documented as a departure next to D4.

## 6. Session-bound objects are refused at commit

A global can be committable while something it reaches is not: an object
holding a socket, a client holding a lock. What happens today depends on the
object, and only part of it is loud:

- A `Semaphore` or a `GsProcess` makes the whole commit fail with
  TransactionError 2407. Grail hands that to Python as data rather than a
  Smalltalk error (`gemstone >> ___tryCommit___`).
- A `GsSocket` or `GsFile` commits **without complaint** and comes back dead in
  the next session. The same goes for a `CPointer` (NULL after logout) and a
  `WeakReference` (faults in dead).

A warning is easy to miss, so in an app this becomes an **error, at commit,
that names the path**:

```
gemdb.TransientReferenceError: cannot commit hat.connection._sock:
GsSocket (open socket -- dead after commit/logout). Declare the global in
__transient__, or the attribute in its class's __transient__.
```

The detector already exists. The deploy audit classifies session-bound
objects (`importlib class >> ___deployDescribe___:`) and reports the reference
path to each. At commit it walks the objects **this transaction wrote** that are
reachable from the app's globals, not the whole graph, so its cost follows the
size of the change. Measuring that cost is the first job of the cut (§9).

### 6.1 Class-level `__transient__`

The fix for an otherwise committable object that holds a session-bound one is
a class-scope declaration (Persistent Modules §8.2 already lists it as wanted):

```python
class Connection:
    __transient__ = ("_sock",)

    def __session_init__(self):          # D5: rebuild the session tier
        self._sock = socket.create_connection(self.address)
```

The named attributes are never committed: they read as unset in a session
that did not assign them, and `__session_init__` (D5) is where they are
rebuilt.

It is GemStone's **DbTransient** idea, but not GemStone's DbTransient
mechanism. A DbTransient object's slots can silently revert to `nil` *within
one session* under memory pressure, once nothing holds the object strongly
(memory note `dbtransient-ivars-are-not-durable-in-session`), and a live
socket cannot vanish mid-session. So Grail keeps these slots in `SessionTemps`,
keyed by object, which holds them strongly for the session's life.

## 7. The default namespace

A run that names no app keeps today's semantics exactly:

- `__main__` is session-local, as #851 made it: fresh classes every run, and
  globals that die with the run;
- globals are transient by default, with D4's `__persistent__` to opt in;
- the module cache is the user's, shared by every program the user runs, with
  D10 refusing a different file under a deployed name;
- `gemdb.root` is its own persistent dictionary and the main way into
  persistence.

So nothing that works today changes, and the documented problems (§2) remain
for programs that do not name an app. That is the trade: an app is what a
program declares when it wants its globals to be the database.

## 8. Two users, one app

Several people or sessions running one app under the same GemStone user,
possibly from different paths, share one namespace. D10 refuses only a
different file with *different source*, so identical checkouts at different
paths, or the same installation on several application servers, are one
module. An edit at the deployed path rebuilds the module for everyone, which
is correct for "the same app": they are running one program. An edit in a
*second* checkout is a different file with different source, so its import is
refused. An app has one source of truth, and `gemdb.modules.relocate` is how a
developer deliberately moves it. A developer who wants an independent working
copy picks another app name (`shop-dev-james`).

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

## 9. Cuts

1. **Namespace object and accessors.** A `GrailAppNamespace` holding the
   registries of §3.1. Every registry accessor reads `SessionTemps
   #GrailCurrentApp` and falls back to `UserGlobals` (the default namespace).
   No behaviour change while no app is set; this is the cut that proves the
   accessors are the only access path.
2. **Imports resolve per namespace.** File location chooses shared or app,
   with third-party packages in the app; the per-app module-class dictionary
   goes into the compile symbol list; `set_app` and the launcher option. Test:
   two apps each with their own `models.py`, both deployed, no refusal, and
   each app's objects keep their own code (the §2.2 scenario inverted).
3. **`__main__` in an app.** A canonical `__main__` whose globals are the app's
   persistent dictionary; the identical-store skip; `__transient__`;
   `gemdb.root` as the alias. Tests: §2.1 with `type(b1) is type(b2)` True; the
   rabbit demo across two sessions; a re-run that changes nothing writes
   nothing; abort reloads a rebound global and unbinds a new one; a transient
   global is never committed and survives an abort.
4. **`Final` as initialize-once.**
5. **Session-bound objects refused at commit** (§6), with the walk's cost
   measured on a realistic app before it is on by default, and class-level
   `__transient__` (§6.1) in the same cut, since the error message points to it.
6. **`gemdb.admin.apps()` / `drop_app()`**, and the docs: GemDB_Module.md,
   Persistent Modules (new departures next to D4 for persistent app globals,
   `__transient__` and `Final`), and the getting-started story.

Cross-user apps (§8) come after these.

## 10. Decisions (2026-10-04)

1. **Third-party packages are per app**, not shared: CPython's model, one venv
   per app, so two apps can pin different framework versions.
2. **`gemdb.root` in an app is an alias for the app's globals.** A second
   persistent root would only earn its keep if the globals were a session
   copy; they are not (decision 3).
3. **An app's globals are persistent, with GemStone semantics**: a failed
   commit keeps the session's changes, and an abort reloads the committed
   values. In an app, globals are persistent by default and `__transient__`
   names the session-only ones. Outside an app, globals stay transient by
   default and D4's `__persistent__` opts in. This replaces the first draft's
   "session copy written back at commit", which needed its own abort rule.
4. **A session-bound object reachable from what a commit writes is an error,
   naming the path**, not a warning (§6). Class-level `__transient__` is the
   per-attribute fix, kept in `SessionTemps` rather than GemStone's DbTransient.
5. **`Final` is the initialize-once marker** (§5.4).
6. **The API is `gemdb.set_app(name)`**, plus `--app` and `GEMDB_APP` from the
   launcher.
