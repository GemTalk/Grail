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
  instVarNames: #('order')   "an OrderedCollection of keys, insertion order"
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

## 4. Creation touchpoints (where Python dicts are minted)

| Site | File | Change |
|---|---|---|
| dict literal `{...}` | `PythonAst/DictAst.gs` (emits `KeyValueDictionary perform: #new env: 0`) | emit `PyDict` |
| dict comprehension | `PythonAst/DictCompAst.gs` | emit `PyDict` |
| `dict()` / `dict(**kw)` | `Python/dict.gs` (`__new__`, `_new:kw:`) | inherits `dict`=`PyDict` |
| `**kwargs` collector | codegen keyword-dict construction (CallAst / Function/Lambda param binding) | build `PyDict` |
| `type(name, bases, ns)` / functional `Enum(...)` | already receive a dict from the above | free once above land |
| `dict` alias | `install.gs:817` (`at: #dict put: KeyValueDictionary`) | `put: PyDict` |
| internal `dict ___new___` sites | grep `Python/*.gs` | those that hand a dict to Python code → `PyDict`; pure-internal KVDs stay KVD |

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

**Non-goals (v1):** insertion order across the C-shim round-trip; changing
kernel `KeyValueDictionary`; ordered `set` (separate).

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
