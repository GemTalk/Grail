# The `gemstone` Module

Grail's `gemstone` module is the bridge between Python code and the
surrounding GemStone session: transaction control, the session's symbol
list, and named globals. It is a built-in module (a `module` subclass in
the `Python` SymbolDictionary, implemented in
`src/smalltalk/Python/gemstone.gs`) and is always importable:

```python
import gemstone
```

> **Note:** this is the *Grail-native* gemstone module (single object
> space). The embedded CPython REPL has its own `gemstone` module with an
> async API (`await gemstone.commit()`, `gemstone.root`) — see
> [Embedding_CPython_integration.md](Embedding_CPython_integration.md).

## Transaction control: `gemstone.system`

`gemstone.system` is the GemStone `System` class itself. Transaction
control is dispatched through it:

```python
import gemstone

gemstone.system.commit()   # System commit  — True on success, False on conflict
gemstone.system.abort()    # System abort   — discards uncommitted changes
```

`commit` and `abort` are env-1 class-side methods compiled directly onto
`System` (see `src/smalltalk/Python/System.gs`). Because they live on the
real kernel class, any reference to that class — `gemstone.system` or
`gemstone["System"]` — supports them. `System` belongs to the
SystemUser-owned security policy, so `System.gs` is loaded in
`install.gs`'s SystemUser section alongside the other kernel-class method
files.

> **History:** these calls replace the former module-level
> `gemstone.commit()` / `gemstone.abort()`, which now raise
> `AttributeError`.

## The session's symbol list: `gemstone.mySymbolList`

`gemstone.mySymbolList` returns a Python list of the session's
`SymbolDictionary` instances, in symbol-list order (from
`GsCurrentSession currentSession symbolList`):

```python
import gemstone

for sd in gemstone.mySymbolList:
    print(len(sd))                       # SymbolDictionaries support len()

user_globals = gemstone.mySymbolList[6]  # position depends on your symbol list
user_globals["UserGlobals"] is user_globals   # True — UserGlobals names itself
```

The list itself is a fresh copy on every read — mutating it cannot
disturb the session's real symbol list — but its elements are the *live*
SymbolDictionary objects. They answer Python `len()` and string
subscripts (`sd["name"]`) through Grail's dict protocol.

Note that the position of a given dictionary is installation-specific: in
a stock Grail image the Grail dictionaries (`Python`, `PythonAst`, …)
precede `UserGlobals`, so `gemstone.mySymbolList[0]` is `Python`, not
`UserGlobals`. For name-based access, prefer the subscript protocol
below.

## Named globals: `gemstone[name]`

The module supports the subscript protocol for session-namespace access:

```python
import gemstone

gemstone["UserGlobals"]        # any name visible to the session (objectNamed:)
gemstone["x"] = 42             # updates an existing Association anywhere in the
                               # symbol list, else adds to UserGlobals
del gemstone["x"]              # removes from UserGlobals (KeyError if absent)
```

* **Read** resolves through `GsCurrentSession >> objectNamed:` — the full
  symbol list, not just UserGlobals. A miss raises `KeyError`.
* **Write** updates the existing Association if the name already resolves
  anywhere in the symbol list; otherwise the entry is created in
  `UserGlobals`.
* **Delete** removes the key from `UserGlobals` only; a missing key
  raises `KeyError`.

Nothing is committed automatically — pair writes with
`gemstone.system.commit()` to persist them:

```python
import gemstone

gemstone["greeting"] = "Hello, Grail!"
gemstone.system.commit()
```

## Metadata: `gemstone.version`

```python
import gemstone
gemstone.version               # e.g. '3.7.5' — System stoneVersionAt: 'gsVersion'
```

## Session-local storage: `gemstone.sessionDict(name)` (internal)

`sessionDict(name)` returns a per-session Python dict stored in
`SessionTemps` (never committed). Grail's stdlib uses it (via the
`SessionDict` proxy in `_grail_session.py`) for caches that hold
process-bound objects — compiled regex patterns, jinja2 lexers. It is an
implementation detail rather than a public API, but is safe to use for
session-lifetime caching.

## Implementation notes

* Value attributes (`system`, `mySymbolList`, `version`) are unary env-1
  methods compiled in the `Grail-Accessors` category; `___pyAttrLoad___`'s
  module branch *performs* methods in that category on attribute reads,
  instead of wrapping them as `BoundMethod`s.
* `gemstone.system.commit()` compiles to load-then-call:
  `___pyAttrLoad___: #system` returns `System`, then
  `___pyAttrLoad___: #commit` on the class wraps the env-1 class-side
  method in a `BoundMethod`, which `value:value:` invokes.

## Tests

* `GemStoneTestCase` (src/smalltalk/PythonTests/) covers the module's
  surface — including that `commit`/`abort` resolve to `BoundMethod`s —
  but deliberately never commits or aborts mid-suite.
* `tests/scripts/runGemstoneSystemTest.gs` (wired into
  `scripts/run_tests.sh`) exercises the real thing across two sessions:
  commit persistence, abort discarding an uncommitted overwrite, and
  cleanup that leaves the repository unchanged.
