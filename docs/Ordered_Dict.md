# Insertion-Ordered Python dict for Grail

## 1. Problem

CPython guarantees `dict` preserves **insertion order** (a language guarantee
since 3.7). Grail maps the Python `dict` type directly to GemStone's
`KeyValueDictionary` (`install.gs`: `at: #dict put: KeyValueDictionary`),
which is **hash-ordered**. So Grail silently diverges wherever dict iteration
order is observable:

```
dict(first=1, second=2, third=3, dupe=4)  -> iterates first|third|second|dupe
{'one':1, 'nine':9, 'two':2}               -> nine|one|two
d['zz']=..; d['aa']=..; d['mm']=..         -> zz|mm|aa
```

Blast radius (why this is high-leverage, not an enum-only bug): kwargs
iteration, dict literals, dict comprehensions, `**`-unpacking, JSON
round-trips, `dataclasses` built from a dict, `vars()`, `__dict__` views,
and the functional `Enum('Name', {...})` / `type('C', bases, {...})` paths.
In `test_enum` alone it is ~37 errors + 28 failures (the scrambled
MainEnum-Function family). See [[dict-ordering]].

## 2. Reconnaissance findings (2026-07-15)

- **`dict` IS `KeyValueDictionary`** — a kernel class, aliased into the Python
  namespace. The Python dict methods (`__getitem__:`, `items`, `keys`,
  `__iter__`, `__repr__`, …) are compiled *onto* `KeyValueDictionary` (env 1).
- GemStone ships **no** insertion-ordered dictionary (`OrderedDictionary` /
  `GsOrderedDictionary` do not exist).
- **A `KeyValueDictionary` subclass CAN carry a named instVar**: probing
  `KeyValueDictionary subclass: 'PyDict' instVarNames: #('order')` gives
  `allInstVarNames = (numElements numCollisions collisionLimit tableSize
  order)` — `order` sits cleanly at instVar 5, and `at:`/`at:put:` keep
  working. (Dynamic instVars also work on a plain KVD instance, as a
  fallback, but a named instVar is cleaner.)
- Kernel `KeyValueDictionary` cannot itself be changed — it backs the
  canonical registries, `sys.modules`, SessionTemps, etc. Ordering must be a
  Python-dict-only concern.

## 3. Architecture: `PyDict`, a KVD subclass that maintains an order list

```
KeyValueDictionary subclass: 'PyDict'
  instVarNames: #('order' 'rehashing')   "order: OrderedCollection of keys; rehashing: table-rebuild guard"
```

**Why is-a KVD (not a wrapper):** every consumer — internal Smalltalk
`at:` / `at:put:` / `do:` / `includesKey:` / `keysAndValuesDo:`, the C-shim
marshalling that checks `isKindOf: KeyValueDictionary`, and `isinstance`
paths — keeps working unchanged, because a `PyDict` *is* a
`KeyValueDictionary`. Only two things change: **creation** (Python dicts
become `PyDict`) and **iteration order** (walk `order`, not the hash).

**Mutators (env-0) overridden to maintain `order`:**
- `at:put:` — append key to `order` iff not already present (update keeps
  position, matching CPython).
- `removeKey:` / `removeKey:ifAbsent:` — remove key from `order`.
- `at:ifAbsentPut:`, `removeAll:`, and the `clear` path — maintain `order`.
- The Python-level mutators (`__setitem__:_:`, `__delitem__:`, `pop:`,
  `popitem`, `clear`, `setdefault:`, `update:`) already route through these
  env-0 mutators, so they inherit correct ordering for free.

**Iteration overridden to walk `order`:**
- env-0: `do:` (values in order), `keysAndValuesDo:`, `keysDo:`, `keys`,
  `associationsDo:`.
- Python (env-1): `__iter__`, `keys`, `values`, `items`, `__repr__`,
  `__reversed__`, and `popitem` (CPython pops LIFO).

**`copy`** must produce a `PyDict` preserving `order`.

**Rehash safety (the load-bearing subtlety).** `KeyValueDictionary` grows /
shrinks its hash table through `rebuildTable:`, which enumerates the LIVE
table via the very `keysAndValuesDo:` we override — and mid-rebuild an entry
has moved, so `self at:` inside an order-walk cannot find it (this crashes,
e.g., `mimetypes` builds a ~40-entry table). `rebuildTable:` is the single
choke point every grow/shrink funnels through, so we override it to set a
`rehashing` flag for the duration of the rebuild; while set, the iteration
overrides fall back to `super` (hash order, table-safe) and the mutator
overrides skip `order` bookkeeping on any re-insertion the rebuild performs.
Everywhere else they walk `order`.

## 4. Creation touchpoints (where Python dicts are minted)

| Site | File | Change |
|---|---|---|
| dict literal `{...}` | `PythonAst/DictAst.gs` (emits `KeyValueDictionary perform: #new env: 0`) | emit `PyDict` |
| dict comprehension | `PythonAst/DictCompAst.gs` | emit `PyDict` |
| `dict()` / `dict(**kw)` | `Python/dict.gs` (`__new__`, `_new:kw:`) | inherits `dict`=`PyDict` |
| `**kwargs` at a CALL (`f(**kw)`) | `PythonAst/CallAst.gs` (kwargs collector) | emit `PyDict` |
| `**kw` PARAM binding (`def f(**kw)`) | `PythonAst/FunctionDefAst.gs` (empty-default + copy paths), `LambdaAst.gs` | build `PyDict` — **easy to miss; the call side and the param side are separate codegen** |
| `func.__annotations__` | `PythonAst/FunctionDefAst.gs` (annotation-dict builder) | emit `PyDict` |
| `type(name, bases, ns)` / functional `Enum(...)` | already receive a dict from the above | free once above land |
| `dict` alias | `install.gs` aliases `dict`→`KeyValueDictionary` before `PyDict` exists; **re-aliased `dict`→`PyDict` at the end of `Python/PyDict.gs`** (which files in after `dict.gs`) | `put: PyDict` |
| internal `dict ___new___` sites | grep `Python/*.gs` | those that hand a dict to Python code → `PyDict`; pure-internal KVDs stay KVD. **Instance/class `__dict__` reflection and `globals()` still mint plain KVDs (v1 gap — see equality note)** |

**Equality across dict flavours (load-bearing).** With two dict classes in
play (`PyDict` for freshly-minted Python dicts, plain `KeyValueDictionary`
for `__dict__` reflection / `globals()` / internal), two content-equal dicts
of *different* Smalltalk class must still compare equal to Python:
- `dict.__eq__` (`Python/dict.gs`) guards on `isKindOf: KeyValueDictionary`,
  **not** `isKindOf: dict` — else a `PyDict == plainKVD` wrongly returns
  false (this is exactly what `isKindOf: dict` meant when `dict` *was*
  `KeyValueDictionary`; the flip silently narrowed it).
- `SequenceableCollection>>__eq__:` (tuple/list) took a fast path
  `^ self = other` (Smalltalk structural `=`) for same-class sequences —
  but Smalltalk `AbstractDictionary>>=` requires `self class == other class`,
  so a tuple/list containing a `PyDict` in one position and a plain KVD in
  the matching position compared unequal though Python `==` held. Fix: trust
  a TRUE structural `=`, but on FALSE fall back to element-wise env-1
  `__eq__` (Python semantics). Applies to `1 == 1.0` element pairs too.

**`isinstance(x, dict)`** — decision: keep it true for **any**
`KeyValueDictionary` (not just `PyDict`), so internal KVDs still read as
dicts to Python. `dict` = `PyDict`, and the isinstance path already
special-cases builtin type aliases; verify it treats a bare KVD as a dict
(it does today, since `dict`=KVD).

**Shim boundary** — C→Grail dict marshalling currently builds a
`KeyValueDictionary`. That path loses order at the boundary (v1 gap: a dict
that round-trips through C comes back hash-ordered). Grail-native dicts
(the common case, and everything `test_enum` exercises) are unaffected.
Documented, deferred.

## 5. Rollout (incremental, gate after each)

1. **`PyDict` class** — subclass, `order` instVar, mutator + iteration
   overrides, `copy`. `dict` alias → `PyDict`. Move/keep the Python dict
   protocol working (mostly inherited; override iteration). Gate: dict
   basics ordered (`{...}` literal, `d[k]=v` sequence, `repr`, `list(d)`),
   full suite unchanged.
2. **Literals + comprehensions** codegen → `PyDict`. Gate.
3. **kwargs** collector → `PyDict` (unlocks the `dict(a=…, b=…)` /
   `**kwargs` order — the enum fix). Gate.
4. **Reconcile** `isinstance`, `copy`, internal `dict ___new___` sites,
   shim recognition. Gate: full suite + measure `test_enum` delta.

**Status:** phase 1 (PyDict class + `PyDictTestCase`, 8/8) landed 191920f.
Phase 2 (rehash-safety, literals/comprehensions/`dict()`/call-kwargs/param-kwargs
→ PyDict, `__eq__` robustness, `SequenceableCollection` element-wise fallback)
landed together; **cold gate 3027/3027**.

**Reflection order (measured 2026-07-15, after phase 2):**
- **Instance `__dict__` / `vars(obj)` — already insertion-ordered.** Not a
  gap: `obj.__dict__` is a `PyInstanceDict` live view over the instance's
  dynamic instVars, which GemStone stores in declaration order; `del` +
  re-assign appends at the end (CPython). Locked by
  `PyDictTestCase>>testInstanceDictPreservesInsertionOrder`
  (fixture `tests/python/instdict_order.py`).
- **Class `__dict__` — a `PyDict`, but populated in scrambled order.**
  `___classDict___` unions data attributes (metaclass accessor-pairs) and
  methods (env-1 method dicts) from separate hash-ordered stores, so the
  snapshot is not in definition order. Preserving it would require tracking
  class-body definition order and sorting the snapshot — deferred (low value:
  the case that matters, enum *member* order, is set during class-body
  execution, not read back from this snapshot).
- **`globals()`** has a separate pre-existing defect (`globals().keys()`
  raises `TypeError: 'OrderedCollection' object is not callable`) and module
  scope is a `SymbolDictionary`; module-attribute ordering is out of scope
  here.

**Non-goals (v1):** insertion order across the C-shim round-trip; changing
kernel `KeyValueDictionary`; ordered `set` (separate); class-`__dict__`
definition-order reflection; `globals()` fidelity.

**Testing lesson (cost me a long debug loop).** The warm/canonical sharded
gate surfaced `LookupError`/codec crashes that DID NOT reproduce cold or in
warm isolation. Root cause was **not** the dict change: repeated
`install.sh` runs recreate the Python exception classes (new object
identity), and a module deployed by an *earlier* run keeps its compiled
methods' captured references to the *old* exception classes — so a warm-bound
`contextvars.get()` raises a `LookupError` that `except LookupError` (bound
to the current class) can't match. Fixed by clearing the committed canonical
registries and redeploying. **Validate dict-semantics changes with the COLD
gate; treat warm-only, non-reproducing failures on a repeatedly-installed
extent as committed-state artifacts, not code bugs** (wipe/redeploy before
theorizing).

## 6. Risks

- **Mutator coverage.** Any KVD mutator not overridden silently drops
  order-list maintenance → a key iterates out of order or a stale key
  lingers in `order`. Mitigation: enumerate KVD's mutating protocol; a
  defensive `order` rebuild-from-keys on read-mismatch is possible but
  should not be needed.
- **Performance.** `at:put:` gains an `order includes:` check (O(n)) unless
  paired with a membership guard; use `includesKey:` (already O(1) on the
  hash) to decide append instead of scanning `order`.
- **Commit/persistence.** `PyDict` instances committed via canonical modules
  carry `order` (a normal instVar) — no special handling; `order` is an
  ordinary `OrderedCollection`, fully persistable.
