# The `gemdb` Module

`gemdb` is the public Python API for persistence in GemDB — the module a
Python developer is *meant* to import, as distinct from the [`gemstone`
module](Gemstone_Module.md), which remains the low-level Smalltalk bridge
that `gemdb` is built on. It lives in the ported stdlib
(`src/python/stdlib/gemdb.py`) and is importable wherever Grail is:

```python
import gemdb
```

Its design goal, inherited from GemDB Code: introduce Python developers
to a persistent object database without making it feel complex. The
audience knows MongoDB or PostgreSQL; the API should be recognizable to
them while making the one big difference unmissable — **there is no
mapping layer, because there is nothing to map.**

## The whole surface

```python
gemdb.root                  # the persistent namespace: a dict-like object
gemdb.transaction()         # commit boundary: with-block or decorator
gemdb.commit()              # explicit commit (interactive work)
gemdb.abort()               # discard uncommitted changes, refresh the view
gemdb.refresh()             # see others' commits; refuses if you have changes
gemdb.needs_commit()        # does the session hold uncommitted changes?
gemdb.GemDBError            # base exception
gemdb.ConflictError         # a commit lost the race; carries the live objects
gemdb.PendingChangesError   # a block/refresh refused to run over pending work

gemdb.admin                 # repository administration -- see below
gemdb.sessions              # who is connected -- see below
```

That is deliberately all of it. Everything reachable from `gemdb.root`
persists at commit — plain dicts, lists, sets, and instances of the
user's own classes, unchanged. No schema, no serializer, no `save()`,
no `session.add()`. The absence of those calls *is* the message:

```python
import gemdb

orders = gemdb.root.setdefault("orders", [])   # find-or-create: the first line
orders.append(Order("widget", 3))              # of most GemDB programs

with gemdb.transaction():
    orders.append(Order("gadget", 1))          # committed on exit
```

For a MongoDB/PostgreSQL reader:

| They know                             | In GemDB                                       |
| ------------------------------------- | ---------------------------------------------- |
| `db.orders.insert_one({...})`          | `gemdb.root["orders"].append(order)` — a plain list of your own objects |
| `SELECT` / `find()` returning copies   | you already hold the live objects; navigate them |
| `session.commit()` after ORM mapping   | `gemdb.commit()` — nothing was mapped          |
| `BEGIN … COMMIT`                       | `with gemdb.transaction():`                    |

## Transactions: the design decision

GemStone sessions are always inside a transaction, and a commit commits
**everything the session has touched** — there is no per-block write
set. So a Python `with` block over commit/abort had three candidate
semantics:

1. **Commit boundary.** Enter does nothing; exit commits. Honest about
   the machinery, but the block silently sweeps in changes made before
   it — a block that commits things it doesn't contain.
2. **Manual-begin mode.** Make blocks real isolation scopes by running
   sessions in manual transaction mode. Truthful, but hostile to the
   notebook and the shell, GemDB's primary surfaces, where users mutate
   objects across cells and then decide to commit.
3. **Clean-entry check** *(chosen)*. Entering the block refuses
   (`PendingChangesError`) if the session already holds uncommitted
   changes; otherwise it aborts — which, since the session is clean,
   discards nothing and only refreshes to the latest committed view —
   runs the body, and commits on exit.

Option 3 gets isolation-scope semantics *by construction*: because entry
required a clean session, "commit everything the session touched" and
"commit what the block did" are the same set. The block starts from a
fresh snapshot, like `BEGIN`. And nothing is ever silently discarded or
silently committed — the failure mode is a clear, early exception with
instructions, not quiet data movement.

The full rules:

* **Enter:** raise `PendingChangesError` if `needs_commit`; otherwise
  abort (a pure view refresh, given the clean check) and run the body.
* **Clean exit:** commit. On a conflict, capture the conflict details,
  abort (a session that failed a commit cannot commit again until it
  aborts), and raise `ConflictError` with `aborted=True`.
* **Exception exit:** abort, propagate the exception.
* **No nesting**, and no explicit `commit()`/`abort()`/`refresh()`
  inside a block — each raises `GemDBError` immediately rather than
  corrupting the block's meaning.

### Explicit commit stays first-class

`gemdb.commit()` and `gemdb.abort()` are not a deprecated escape hatch:
a `with` block cannot span notebook cells or shell lines, and
interactive work is GemDB's front door. The two forms differ on one
point, deliberately: when an **explicit** `commit()` conflicts, the
failed transaction is *not* aborted — the user's uncommitted changes
stay in place so they can inspect `ConflictError.conflicts` and decide;
`ConflictError.aborted` says which behavior happened. A block auto-
aborts because its contract is atomicity; an interactive session never
has work destroyed without asking.

`gemdb.refresh()` exists because "show me other sessions' commits" is a
daily operation, and in GemStone it is spelled *abort* — a verb no
Mongo/Postgres user would guess, and a destructive one. `refresh()` is
the same operation guarded: it refuses with `PendingChangesError` when
the session holds changes, so the routine action can never destroy work,
while `abort()` remains the explicit "discard my changes."

### Conflicts and retry

`ConflictError.conflicts` is the GemStone conflict dictionary converted
to Python: category names (`"Write-Write"`, …) mapped to **lists of the
live objects fought over** — something no mapped database can offer.
Resolving a conflict means abort-and-replay, and only code the library
can call again is replayable. A `with` block's suite is not; a function
is. So retry is decorator-only:

```python
@gemdb.transaction(retries=3)
def transfer(a, b, amount):
    a.balance -= amount
    b.balance += amount
```

Each attempt is a full transaction (fresh view, commit at return);
`retries=3` replays up to three extra times on `ConflictError` before
letting it propagate. Passing `retries=` to the `with` form raises a
`TypeError` explaining the decorator form. (PyMongo made the same split
for the same reason: `start_transaction()` is a plain context manager,
retry lives in `with_transaction(callback)`.)

### Imports belong inside the transaction that commits them

A cold import is a **write**. Compiling a Python module creates its class in the
committed `PythonModules` dictionary, so `needs_commit` is true before the user's
first statement — and the clean-entry check then refuses, describing changes the
user did not make:

```python
import my_app                    # cold: builds the module's class
with gemdb.transaction():        # PendingChangesError -- the import's writes
    ...
```

That is not the check misfiring. The module becoming part of the database *is*
the write, and committing is what keeps it (see
[the model](Persistent_Modules_and_Classes.md), §4.2 — there is no separate
deploy step to remember). So the rule is one line: **do the import inside the
transaction that commits it.**

```python
with gemdb.transaction():
    import my_app                # built here, published by the block's commit
    my_app.setup()
```

```python
import my_app                    # the interactive spelling
gemdb.commit()
```

**What an abort does to an import:** it discards it. The module's class, its
registration and its source hash were all written in that transaction, so the
session stops finding the module by name and the next `import` rebuilds it cold
— which is what you want, because the repository has never heard of it. One
residual is worth knowing: a reference you *already hold* keeps working, and
committing an instance of it persists a class nothing names. After an abort,
re-import rather than reusing the module object you were holding.

`refresh()` will not do this to you by accident. It refuses with
`PendingChangesError` exactly when the session holds changes, and after a cold
import it does — so the routine "show me other sessions' commits" cannot silently
throw away a module you just built. Discarding one takes the explicit
`abort()`.

**In production, preload instead.** One session imports the list your
application needs and commits once, so application sessions start warm, compile
nothing, and cannot conflict with one another the first time two of them import
the same module. That is what the scripts below are.

## `gemdb.root`

A dict-like view (subscripts, `in`, `len`, iteration, `get`,
`setdefault`, `pop`, `keys/values/items`) over one persistent dictionary
stored under the name `GemDBRoot` in UserGlobals — visible under that
name to Smalltalk tools, and per-user, like UserGlobals itself. Two
deliberate behaviors:

* **Reads never create.** The backing dictionary is created on the
  first *write*; reads on an empty database answer emptiness without
  leaving anything to commit (which would otherwise trip the very entry
  check the transaction design depends on).
* **`repr` answers the first question.** `repr(gemdb.root)` prints the
  key names, not the contents — "what is in this database?" is the first
  thing everyone asks at the shell.

## Session hygiene: what the clean-entry check required

`PendingChangesError` is only useful if a session that has merely
*imported and read things* is clean — otherwise the check blames the
user for the machinery's writes and fires on hello-world. Getting a
fresh session to `needs_commit == False` surfaced four distinct writers,
each now handled; anything new added to Grail must respect the same
invariant (**readonly user actions must not dirty the transaction**):

1. **`functools` initialize re-stored `__hash__ = None`** on the
   committed `cmp_to_key` holder every session (module singletons are
   session-local, so module `initialize` runs per session — but this
   store lands on the *committed* class-attribute holder). Fixed with a
   store-only-when-absent guard in `functools.gs`; the first import of a
   session no longer dirties anything on a deployed image.
2. **A function-level `import` is a repeated write.** Grail binds the
   imported name into the importing module's dict on every call; on a
   committed module that dirties the session. `gemdb.py` therefore binds
   everything at module-body time (committed with the module) and calls
   `gemstone.sessionDict` directly rather than through
   `_grail_session.SessionDict`, whose lazy `import gemstone` still has
   this cost (harmless today because nothing observes `needsCommit`
   around it, but worth fixing upstream eventually).
3. **Function-attribute reads cache BoundMethods on the module
   instance** (module.gs, for CPython's stable function identity). On a
   committed module the first `gemdb.commit`-style attribute read per
   session is a write. `gemdb.py` warms every cache in its module body —
   `getattr` on itself through `sys.modules` during the cold import — so
   the caches ship inside the same commit that deploys the module and
   later sessions only read. (A bare-name read does not warm them: the
   module-scope path wraps unary defs without caching; only the getattr
   path caches.)
4. **The kernel `System commit` signals `TransactionError`** on a
   conflict instead of answering false (measured on 4.0), so the env-1
   `System class >> commit` never actually delivered its documented
   False-on-conflict — a real conflict tore through Python as a
   Smalltalk error. `System.gs` now calls `System commitTransaction`,
   the Boolean-returning primitive, which is what `gemdb`'s
   `ConflictError` handling stands on.

5. **A dotted import re-stored the submodule binding on the committed
   parent.** `import gemdb.sessions` wrote `gemdb`'s dict and dynamic
   slot every session even when the binding already held that exact
   module, while `from gemdb import sessions` never wrote — the two
   spellings left different session state. Fixed with an identity guard
   in importlib's `___bind:onParent:as:`.
6. **Capturing output by reassigning `Transcript` dirtied every
   evaluation.** The global is a committed SymbolAssociation, so an
   embedder that pointed it at a capture stream per evaluation (GemDB's
   notebook, shell, and CLI all did) marked the session as needing a
   commit before the user's code even ran. Grail's console writes —
   `print()`'s default target, `input()`'s prompt echo, `help`,
   warnings — now resolve through `builtins ___console___`: the
   session-local `SessionTemps` `#GrailConsole` override when one is
   installed, else the Transcript. Embedders install the override
   (transient, clean) instead of reassigning the global. The override
   is stored **boxed in an Array**, for the reason first measured at
   `stdinProvider:`: `SessionTemps>>at:put:` sends to the value it
   stores, and a streaming override is a ClientForwarder — a root class
   that forwards even those internal sends to a client that cannot
   answer them.

Session state that must never be committed (the in-a-block flag) lives
in SessionTemps via `gemstone.sessionDict("gemdb")`. Submodules follow
the same rules as the package root: module-body imports only, and each
warms its own function-attribute caches during the cold import
(`gemdb.sessions` additionally warms `gemstone.describe_session`, an
argument-taking method whose BoundMethod would otherwise be cached onto
the committed gemstone module by the first call of a session).

## Deploying: the preload, not a second decision

A deploy is just the cold import committed — the same commit any session makes,
run once by an installer so that no application session has to:

```python
import gemdb   # then commit (the test scripts and image builds do this)
```

That one cold import commits the package (its `__init__` pulls in the
submodules), every function-cache warm-up, and the
`gemstone.sessionDict` / `describe_session` caches, so every later
session imports gemdb with nothing left to commit — which is what makes `with gemdb.transaction():` work
as the first statement of a fresh program.
`tests/scripts/runGemdbTest.gs` asserts exactly this property.

`scripts/deployGemdb.gs` is the standalone deploy — gemdb alone, no
frameworks — for installers that want the clean-session contract
without adding framework megabytes to the image; GemDB's
`resources/install-grail.sh` runs it as its final step.
`scripts/deployFrameworks.gs` also deploys gemdb, for Grail's own test
runs. Committing once is now the whole requirement: canonical modules are
unconditional (the feature flag was retired in 2026-08), so any later
session warm-binds the committed package with no per-session setup.

What a preload buys is startup cost and contention, not correctness: an
application that never preloads still works, with each session paying the cold
compile and two sessions importing the same module for the first time racing for
`PythonModules` (first commit wins, the loser retries).

## The submodules: organized by who needs it, not by implementation

`System` in GemStone accreted forty years of unrelated surface — object
locks next to cache statistics next to transaction control. `gemdb`
takes the opposite bet: organize by *who needs it and when*, so the top
level never silts up. A developer who only writes Python never types
any of these, and never learns GemDB *has* administration.

### `gemdb.admin` — the repository itself

```python
import gemdb.admin

gemdb.admin.size()                     # {"bytes": ..., "free_bytes": ...}
gemdb.admin.backup("/backups/mon.gz")  # .gz -> compressed, else plain
gemdb.admin.garbage_collect()          # mark-for-collection; returns its report
```

`backup` and `garbage_collect` refuse (`PendingChangesError`) while the
session has uncommitted changes — a backup covers only committed state,
so pending work would silently not be in it; the collector likewise
walks the committed graph. Kernel failures come back as ordinary Python
exceptions (`OSError` from backup, `RuntimeError` from the collector)
rather than tearing through as Smalltalk errors.

The primitives are env-1 *instance* methods on the kernel `Repository`
class (`Repository.gs`), reached through the `gemstone.repository`
accessor — the same relationship `gemstone.system` has to `System.gs`.
They are deliberately **not** methods on the gemstone module: a unary
method on a module class is *performed by a bare attribute read* (the
accessor protocol), so a module-level `mark_for_collection` would run
from `dir(gemstone)`. Instance attribute reads only wrap; nothing runs
until the caller writes parentheses. Put destructive primitives on
kernel instances, never on module classes.

### `gemdb.sessions` — who is connected

```python
import gemdb.sessions

gemdb.sessions.current()   # {"session_id", "user", "pid", "host", "name", "current"}
gemdb.sessions.all()       # every session, the system's own gems included
```

`name` is set for the system's service gems (`"symbolgem"`, ...) and
`None` for ordinary logins. Backed by `gemstone.session_serial` /
`session_ids` (accessors) and `gemstone.describe_session(serial)`.

### Still reserved

* `gemdb.stats` — cache and I/O statistics, for diagnosis.
* `gemdb.locks` — if ever exposed: `with gemdb.locks.write(obj):`,
  the `threading.Lock` idiom.

Also deliberately deferred: queries and indexed collections (the
feature Mongo users will ask for first — it deserves its own design,
not a bolt-on), restore (it is not a live-session operation), and
schema evolution for persistent instances of user classes.

## Testing

* `tests/scripts/runGemdbTest.gs` (wired into `run_tests.sh` as
  `gemdb`) — the single-session surface plus the fresh-session
  properties, two logins, leaves the repository clean. Commits and
  aborts, so it cannot be an SUnit test.
* `tests/scripts/run_gemdb_conflict_test.sh` /
  `runGemdbConflictRpc.gs` (wired in as `gemdb-conflict`) — two RPC
  sessions interleaved with `set session:`; a real write-write conflict
  through the block path, the `ConflictError` contract (`aborted=True`,
  live objects, session usable afterward), and the retry decorator.
