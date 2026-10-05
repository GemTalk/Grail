# App namespaces: one set of globals per application (design)

**Status:** design agreed 2026-10-04. Cuts 1–4 and 6 (§9) are implemented:
the name-keyed registries live in a namespace; imports resolve per namespace,
with `gemdb.use_namespace`, `gemdb.namespace()`, `./grail --namespace` and
`GEMDB_NAMESPACE` (named `set_app` / `app()` / `--app` / `GEMDB_APP` until the
§4 rename); and
`__main__` in an app is canonical, with persistent globals, `__transient__` and
`gemdb.root` as their alias; a module-level `Final` initializes once; and
`gemdb.admin.namespaces()` / `drop_namespace()`, with the Persistent Modules departures
D11–D13. Cut 5 changed course after measurement: the commit-time check is
asked of the kernel instead (§6.2), and Grail makes its refusal catchable. It follows
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
the namespace is chosen explicitly, with `gemdb.use_namespace(name)` or a launcher
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
gemdb.use_namespace("shop")   # before the app's first import
import shop.models
```

- **Before any app module is imported.** The namespace decides where every
  later import resolves, so `use_namespace` raises if a non-shared module has
  already been imported this session, and also if a different app is already
  set. `import gemdb` itself is shared, so it is always allowed first.
- **Also from the launcher.** `./grail --namespace shop app.py`, or a
  `GEMDB_NAMESPACE` environment variable, so a deployment can choose the app
  without editing the top file. The launcher sets it before running anything.
  `importlib` reads the variable in `runPath:` / `runModule:`, so GemDB's
  launcher, a fork of `scripts/grail.tpz` (`~/code/GemDB_Code`), honours the
  variable already and needs only the option.
- **Creating vs. joining.** The first `use_namespace("shop")` in a repository
  creates the namespace in the current transaction, and it persists at the
  next commit. Later sessions join it. Listing and deleting apps belong in
  `gemdb.admin` (`namespaces()`, `drop_namespace(name)`; the latter refuses while the
  app's classes have instances, like `gemdb.modules.forget`).
- **Name.** `use_namespace`, snake_case to match the rest of `gemdb`
  (`rename_class`, `drop_class`, `needs_commit`). It was first built as
  `set_app` and renamed before any release, for three reasons. "set_" read as a
  setter callable at any time, where the call is a once-per-session choice
  that must precede the program's imports. "App" collides with Django, which
  Grail vendors: a Django project already has apps, and one GemDB namespace
  would hold several of them. And neither word said what the call buys,
  persistent globals and a module cache of the program's own. The name keeps
  its argument: which namespace is the whole point, since two programs
  sharing one is the §2.2 problem. "App namespace" stays the term in this
  design and in the `importlib` internals (`___grailSetApp___:`,
  `UserGlobals #GrailApps`), which were not renamed.

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
holding a socket, a client holding a lock.

### 6.0 What happens today (measured 2026-10-04, gs40, `./grail`)

Each object was stored in `gemdb.root` and committed with `gemdb.commit()`.
Then a fresh session read it back and used it:

| object | at commit | in the next session |
| --- | --- | --- |
| `threading.Lock` / `RLock` / `Semaphore` / `Condition` / `Event`, `queue.Queue` | commits | works. A lock committed while held comes back unlocked: lock state is per session. |
| `threading.Thread` (unstarted or finished), `asyncio` event loop, `io.StringIO` | commits | works |
| `socket.socket()`: fresh, listening, connected | commits | **any use raises ImproperOperation 2364** ("aGsSocket … has lost that transient state") |
| `open(path)`: read or write | commits | **any use raises 2364** (aGsFile) |
| `ssl.SSLContext` | commits | **raises "arg 1 has NULL CData"** |
| a generator, fresh or started | **TransactionError 2407** (its Semaphore: `instancesNonPersistent`) | n/a |

**None of the four failures can be caught from Python.** A Smalltalk error
crossing into Python is not a Python exception, so even `except BaseException`
did not catch them, and each ended the program.

`gemstone >> ___tryCommit___` does turn a 2407 into data, but only the
continuation path calls it. `gemdb.commit()` calls `gemstone.system.commit()`,
so the generator case escapes `gemdb.commit()`. The earlier text of this
section said otherwise.

Walking what each committed object reaches separates the two groups exactly:
- everything that broke reaches a **GsSocket**, a **GsFile** or a
  **CPointer / CByteArray**;
- the generator reaches a **Semaphore**;
- nothing that worked reaches any of these.

The kernel's own flags say why. Semaphore is `instancesNonPersistent`, so
the kernel refuses any commit that reaches one. GsSocket, GsFile, CPointer
and CByteArray are ordinary persistent classes whose C-side state does not
survive the session.

### 6.1 What "session-bound" means

Defined by the kernel object reached, not by Python type. An object that
**a commit would make persistent** is session-bound if:

1. its class is `instancesNonPersistent` (Semaphore; so a generator, and
   anything holding one). The kernel refuses these today, with TransactionError
   2407 naming the object.
2. it is a **GsSocket** or **GsFile**.
3. it is a **CPointer** or **CByteArray**, unless its holder rebuilds it.
   One holder already does: an `SrePattern` that kept its `compileArgs`
   recompiles on first use (the deploy audit already makes this exception,
   and the `issue2-sre-ptr` regression covers it). Measured on a cold import
   of five stdlib modules, all 7 CPointers found were such compiled regexes;
   and on the whole gs40 extent, every one of the 179 reachable committed
   CPointers is held by an SrePattern. So the exception is required, not
   optional.

Not session-bound:
- a `GsProcess` that is a continuation. Durable execution commits those on
  purpose (`gemstone >> ___isContinuation___:`).
- `WeakReference`. The deploy audit flags it, but it is a semantics question
  (it faults in dead) rather than a crash. Leave it to the audit.

### 6.2 Decision: the kernel refuses; Grail makes the refusal catchable

*Decided 2026-10-04, after the measurements below.* Grail does **not** walk
the commit set in Python on every commit. Rules 2 and 3 above are asked of the
kernel instead, as `instancesNonPersistent` on GsSocket and GsFile (and, with
a way for SrePattern to keep its pointer, on the C pointer classes):
[GemStone_Feature_Requests.md §1.8](GemStone_Feature_Requests.md#18-refuse-session-bound-objects-at-commit-and-let-the-session-retry--small-to-medium).

Why not check in Python:

- **The kernel already walks what a commit makes persistent**, to promote it,
  and refuses an `instancesNonPersistent` object on the way. That costs a
  commit that succeeds nothing. A Python walk repeats it on every commit.
- **The Python walk is linear in new objects**, about 0.75 µs each. Measured
  from `System _writtenObjects` (the committed objects this transaction wrote;
  new objects are not in it, so the walk descends from those into objects not
  yet committed, skipping classes, methods and DbTransient objects):
  - 125k new objects: 91 ms; 1.25M: 0.92 s;
  - a cold import of five stdlib modules: 3,035 objects in 5 ms;
  - an unchanged app re-run writes nothing, so it walks nothing.

  The time of the commit itself was not measured, so how large a share of a
  commit this is remains open.
- **A per-transaction flag cannot stand in for the walk.** Storing a socket
  does the damage, not creating one, and the two are usually in different
  transactions. A per-session flag ("a socket exists") is always set in a
  server, whose listening socket and log file outlive every commit. And Grail
  could only set it for objects created through Python.

What Grail does meanwhile:

- **`gemdb.commit()` and `gemdb.transaction()` go through
  `gemstone >> ___tryCommit___`**, so a 2407 raises a Python exception,
  `gemdb.SessionStateError(GemDBError, TypeError)`, instead of ending the
  program. Today that covers rule 1 (a generator); once the kernel marks the
  classes in rules 2 and 3, it covers those with no change in Grail.
- **A refused commit cannot be retried.** After a 2407, the same transaction
  will not commit even once the offending object is removed (measured: 2403
  `rtErrOmFlushFailed` through `System commitTransaction`; `___tryCommit___`'s
  comment records 2424 `rtErrCommitDisallowedUntilAbort` through
  `System commit`). The session must abort, which discards the transaction.
  So decision 3's "a failed commit keeps the session's changes" holds for a
  conflict, not for a refusal; the exception says so. Refusing before
  anything is flushed is ask (c) of the feature request.
- **Naming the path is for later, and only on the failing path.** After a
  refusal the session's state is still readable (measured: `needsCommit` is
  true and the stored value is still there), so a walk from
  `System _writtenObjects` to the refused object can name it in Python terms
  before the program aborts. A successful commit never pays for it. Ask (d)
  would make even that walk unnecessary.
- **`gemstone.deploy_check()` stays the deliberate audit.** Its walk needs an
  indexed queue (with `removeFirst`, 1.25M objects took 74 s rather than
  0.92 s) and its classifier misses CByteArray.

Until the kernel marks GsSocket and GsFile, a socket or file in a committed
global still commits and fails in the next session, as §6.0 measured.
Naming the global in `__transient__` keeps it out of the commit today;
class-level `__transient__` (§6.3, not built yet) will do the same for an
attribute.

### 6.3 Class-level `__transient__`

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
   goes into the compile symbol list; `use_namespace` and the launcher option. Test:
   two apps each with their own `models.py`, both deployed, no refusal, and
   each app's objects keep their own code (the §2.2 scenario inverted).

   *As built (cuts 1–2).* A namespace is a SymbolDictionary in
   `UserGlobals #GrailApps` (an RcKeyValueDictionary, name → namespace); its
   module classes are in its own `#GrailModuleClasses`. Which namespace a
   registry read means is decided three ways:
   - **During a load**, by the file. `loadModuleFromPath:name:` chooses shared
     or app from the path and runs the whole load bound to that choice (a
     stack in SessionTemps, since a load imports others). The load also
     records the choice for the session.
   - **Outside a load**, by the module name. The entry points handed a module
     name (dependency checks, class probes, reload, forget, relocate, the
     schema commands) re-run themselves in that module's namespace: the
     recorded one, else whichever registry knows the name.
   - **Walks over every deployed class** (metaclass and MI restores, the class
     census, the schema report, the subclass walk) visit the shared base and
     then the app.

   With no app set, each of these is one SessionTemps probe that answers
   `UserGlobals`, so nothing changes.
3. **`__main__` in an app.** A canonical `__main__` whose globals are the app's
   persistent dictionary; the identical-store skip; `__transient__`;
   `gemdb.root` as the alias. Tests: §2.1 with `type(b1) is type(b2)` True; the
   rabbit demo across two sessions; a re-run that changes nothing writes
   nothing; abort reloads a rebound global and unbinds a new one; a transient
   global is never committed and survives an abort.

   *As built (cut 3).*
   - **Canonical `__main__`.** `___isSessionLocalModule___: '__main__'` is false
     in an app, so the top file goes through the registries like any module.
     Its committed instance holds the globals.
   - **The unchanged re-run.** When the source is unchanged, the load takes a
     re-run path instead of the warm bind. It adopts the committed instance and
     its class, sets the hash verdict to `match` (so class statements' probes
     hit and nothing recompiles), and runs the body over the globals. It keeps
     the committed spec and deps record.
   - **The edited run.** An edit takes the cold path and rebuilds into the
     committed instance, as a stale deployed module does.
   - **The store skip.** It is one override, `module >> dynamicInstVarAt:put:`,
     which every module-global store goes through. It skips the identical
     object and equal values of `str`, `int` and `tuple` of them: CPython folds
     a constant tuple into one code constant, and a fresh `(1, 2)` was the one
     write left on a measured re-run.
   - **`__transient__`.** A literal list or tuple in the body compiles three
     accessor overrides onto that module's class only, with the names inlined,
     keeping those globals in SessionTemps. It applies in any module.
   - **`gemdb.root`.** `importlib ___grailAppGlobals___` answers the session's
     own `__main__` when it is the app's, else the committed one, and
     `gemdb.root` wraps `vars()` of it.
4. **`Final` as initialize-once.**

   *As built.* `AnnAssignAst` wraps a module-level `name: Final = v` store in
   `(self ___finalIsBound___: #name) ifFalse: [...]`. The check is
   `module >> ___finalIsBound___:`, which answers true when the module
   instance is committed and the name is bound. An uncommitted instance (a
   session-local `__main__`, a first run) always evaluates. Annotations
   recognised: `Final`, `Final[T]`, and `typing.Final` / `t.Final`. Not inside
   a def, a lambda or a class body. Module-scope annotated stores never take
   the IR path, so the text emitter is the only one.

   Measuring it showed the store skip's one gap. A module with an annotated
   assignment stores a PEP 649 `__annotate__` closure on every run, which is
   a write on a re-run. `module >> ___storeAnnotate___:` keeps the current
   closure when it is the same compiled block over the same module. The
   emitted block captures nothing else, so the two are equivalent. After an
   edit the body recompiles and the block differs.
5. **Session-bound objects refused at commit** (§6), with the walk's cost
   measured on a realistic app before it is on by default, and class-level
   `__transient__` (§6.3) in the same cut, since the error message points to it.

   *Measured 2026-10-04 (§6.0).* The premise needed revisiting. Most
   session-bound objects commit without error and fail uncatchably in the
   next session, and a generator's refusal escapes `gemdb.commit()`
   uncaught. §6.1 defines session-bound by the kernel object reached
   (non-persistent classes, GsSocket, GsFile, and C pointers whose holder
   cannot rebuild them).

   *Decided the same day (§6.2):* no Python walk on every commit. The kernel
   already refuses non-persistent objects at no cost to a successful commit,
   so the rest of the definition is a feature request
   ([GemStone_Feature_Requests.md §1.8](GemStone_Feature_Requests.md)). Grail
   routes `gemdb.commit()` and `gemdb.transaction()` through `___tryCommit___`,
   so a refusal is a catchable `gemdb.SessionStateError`. Naming the path on a
   refusal, the deploy audit's walker, and class-level `__transient__` (§6.3)
   remain to do.

6. **`gemdb.admin.namespaces()` / `drop_namespace()`**, and the docs: GemDB_Module.md,
   Persistent Modules (new departures next to D4 for persistent app globals,
   `__transient__` and `Final`), and the getting-started story.

   *As built.* `namespaces()` lists `UserGlobals #GrailApps`. `drop_namespace(name)`
   removes the namespace after counting the instances of its classes'
   subtrees, the scan `forget` uses, and refusing if there are any. It also
   releases the app's classes from the identity-keyed class set and
   self-send records. The departures are D11 (the app, its `__main__`), D12
   (`__transient__`) and D13 (`Final`). The getting-started story is the
   first-app walkthrough in GemDB_Module.md; GemDB's own guide is in its
   repository.

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
   *Revised the same day:* the kernel raises the error (a feature request for
   sockets, files and C pointers; it already does for non-persistent classes),
   and Grail makes it catchable rather than walking every commit (§6.2).
5. **`Final` is the initialize-once marker** (§5.4).
6. **The API is `gemdb.use_namespace(name)`**, plus `--namespace` and
   `GEMDB_NAMESPACE` from the launcher, `gemdb.namespace()`, and
   `gemdb.admin.namespaces()` / `drop_namespace()`. First agreed as
   `set_app`; renamed for the reasons in §4.
