# Python-robust hash table — design & plan

**Status:** design, pending approval (branch `python-robust-hashtable`).
**Goal:** make Grail `set` / `frozenset` / `dict` key on Python `__hash__` /
`__eq__` (not Smalltalk `=` / `hash`), so CPython `test_set` / `test_dict`
conformance failures that depend on Python hashing semantics can pass, without
corrupting GemStone's native hashed collections.

## 1. What this unblocks

`test.test_set` (628 tests) is at **10F/0E/21S**; the 10 failures are all this:

| Cluster | Tests | Needs |
|---|---|---|
| `test_badcmp` | 4 | Python `__eq__` consulted on insert/lookup; a raising `__eq__` **propagates** |
| `test_subclass_with_custom_hash` | 2 | bucket by Python `__hash__` (custom, id-based) |
| `test_set_literal_insertion_order` | 2 | `{1, 1.0, True}` collapses to one (int 1) — numeric `1==1.0==True`, first-inserted kept |
| `test_contains` | 1 | frozenset-subclass vs frozenset keyed by contents |

`test_dict` has a parallel set of hashtable-blocked failures (bad-key/eq/hash,
mutating-lookup, str-vs-nonstr) covered by the same mechanism.

## 2. Current architecture (measured)

- **`set` / `frozenset`** are subclasses of the kernel `Set`
  (`set → Set → UnorderedCollection → Collection`). Element identity is 100%
  kernel `Set` — i.e. Smalltalk `hash` and `=`. **`Set` exposes no
  `hashFunction:` / `compareKey:with:` / `collisionBucketClass` hooks** (they are
  undefined on `Set`; verified by `whichClassIncludesSelector:`). Its hashing is
  baked into the native `add:` / `includes:`. `remove:` / `discard:` already do
  an O(n) `do:` scan honoring Python `__eq__`, but insert/lookup do not — an
  asymmetry.
- **`dict`** is `PyDict`, a `KeyValueDictionary` subclass that adds
  insertion-`order` + a `version` guard. It **already** keys by Python
  `__hash__` / `___pyRichEqBool___` — but only for `PythonInstance` keys, via
  three overridden KVD hooks (`hashFunction:`, `compareKey:with:`,
  `collisionBucketClass` + a `PyDictCollisionBucket`). Built-in keys
  (`int`/`float`/`bool`/`str`/`tuple`, none of which are `PythonInstance`) fall
  through to Smalltalk `=`/`hash` — which is why `{1: …, 1.0: …, True: …}` does
  not collapse even in a dict.
- **Existing Python-semantics building blocks to reuse:**
  `object>>___pyRichEqBool___:` (identity-then-`__eq__`-truthy, a raising
  `__eq__` propagates — exactly CPython's `PyObject_RichCompareBool(a,b,Py_EQ)`);
  the numeric `__hash__` overrides (`int`, `float` — already consistent so
  `hash(2)==hash(2.0)==hash(Fraction(2))`); the `___requireHashable*___` gates;
  PyDict's `order`/`version` pattern.
- **`bool` has no `__hash__`** (falls to `object>>__hash__` = Smalltalk hash;
  `hash(True)` = 258, not 1). Must add `bool>>__hash__` → 1 / 0. Independent,
  small, and a prerequisite for numeric collapse.

## 3. Why native `Set` can't just be patched

- No hooks to override (unlike KVD).
- Even with hooks, native `Set` buckets by **Smalltalk `hash`**; `true hash`
  (258) ≠ `1 hash` (1), and `1 = true` is Smalltalk-false. Making
  `{1,1.0,True}` collapse in a native Set would require changing kernel
  `Boolean>>hash` and `SmallInteger>>=` — a kernel change with unacceptable
  blast radius across all of Smalltalk.
- **The corruption class (why a from-scratch table, not more kernel hackery):**
  GemStone's `Set`/`KVD` assume `hash` is stable and `=` is total and
  side-effect-free. Feed them Python semantics for arbitrary keys and:
  a raising `__eq__` mid-probe / mid-rebuild leaves the kernel table
  half-updated (`objErrBadOffsetIncomplete`); a Python `hash` that disagrees
  with the bucket a later probe computes reports a false miss
  (`objErrNotInColl` / `rtErrKeyNotFound`). PyDict avoids this *only* by
  diverging for `PythonInstance` keys whose `__hash__ == self hash` and
  `__eq__ == identity`, so the kernel still buckets them where it expects. A
  general "Python hash/eq for every key in the kernel table" breaks that
  invariant — the documented source of the earlier corruption. The fix is a
  table **we** control.

## 4. Design: a shared `PyHashTable` we control

A plain object (NOT a kernel `HashedCollection`) that every Python hashed
collection sits on:

```
Object subclass: PyHashTable
  instVars: buckets    "Array of bucket (each an OrderedCollection of Entry, or nil)"
            count      "number of live entries"
            order      "OrderedCollection of Entry, in insertion order"
            version    "mutation counter (changed-size-during-iteration guard)"
Entry: (hash, key, value)   "hash = cached Python __hash__ (SmallInteger); value = a sentinel for sets"
```

- **Lookup(key):** `h := key __hash__`; `b := buckets at: (h \\ size) + 1`;
  scan `b` — an entry matches iff `entry hash = h and: [entry key == key or:
  [key ___pyRichEqBool___ entry key]]`. Compare cached `hash` first (cheap
  SmallInteger `=`), call `___pyRichEqBool___` only on a hash hit; identity
  before `__eq__`; a raising `__eq__` propagates straight out.
- **Insert(key,value):** lookup; on hit, **keep the existing key** (set: ignore
  the new equal element — `{1,1.0,True}`→ keeps int 1; dict: keep key, update
  value — CPython semantics); on miss, append a new Entry to its bucket and to
  `order`, bump `count`/`version`.
- **Resize** (when `count / size` exceeds the load factor): rebuild `buckets`
  from `order`, re-bucketing by each entry's **cached `hash`** only. **No
  `__eq__` calls during resize** → a resize can never see a raising `__eq__`,
  and cached hashes never disagree with their bucket → the whole corruption
  class is structurally impossible.
- **Iteration** walks `order` (stable, insertion order); the `version` guard
  raises `RuntimeError` on mutation during iteration (reused from PyDict).
- Hashability is gated up front by `___requireHashable*___` (invokes `__hash__`;
  turns a `TypeError` into CPython's "unhashable type").

This is exactly CPython's `(hash, key[, value])` table, in Smalltalk, keyed on
the Python protocol, with resize decoupled from comparison.

## 5. The hard part — re-backing `set` / `frozenset`

`dict`/PyDict is comparatively easy (see Phase 1). `set`/`frozenset` are the
work, because they are `Set` subclasses used across the codebase (kernel `Set`
operations, `isKindOf: Set`, the C-shim, pickle/copy, comprehensions, literals).
Two options:

- **B1 — facade over `PyHashTable`.** Keep `set`/`frozenset` as `Set` subclasses
  (so `isKindOf: Set`/`set`/`frozenset` and the type identity all stay valid),
  add a `table` instVar, and override every element-touching method
  (`add:`/`includes:`/`remove:`/`do:`/`size`/set-ops/iteration/repr/pickle) to
  use `table`. The inherited native `Set` storage is left unused. Risk: any
  kernel or Grail path that reaches native `Set` storage directly (bypassing the
  overrides) sees an empty set — must audit `SetProtocol.gs`, the C-shim
  `PySet_*`, and callers. Smaller type-identity blast radius; larger
  method-override surface.
- **B2 — re-back as a keys-only `PyDict`.** Model a set as a dict with a
  sentinel value, reusing Phase 1's hooked table directly (CPython literally
  shares set/dict table code). Cleanest data model, maximal reuse — but changes
  `set`'s superclass away from `Set`, breaking `isKindOf: Set` and every native
  `Set` operation; the largest surface.

**Recommendation for §5:** B1 (facade) — it localizes the change to method
bodies and preserves type identity, which the rest of Grail (and the C-shim)
depends on.

## 6. Plan / phasing (incremental, each phase independently landable + gated)

1. **`bool.__hash__`** (tiny, standalone): `True`→1, `False`→0. Land + regress
   first; it's a prerequisite and low-risk.
2. **Phase 1 — dict to Python-hash for ALL keys.** Extend PyDict's
   `hashFunction:` / `compareKey:with:` to route every key (not just
   `PythonInstance`) through Python `__hash__` / `___pyRichEqBool___`. This is
   the *smaller, proven-mechanism* change and delivers the `test_dict`
   numeric/custom-hash/bad-key wins. **Validation gate:** it must not corrupt —
   because for numeric keys Python `__hash__` already equals Smalltalk `hash`
   (`1`→1, `1.0`→1), the bucketing is unchanged; the only new behavior is
   `___pyRichEqBool___` collapsing `1/1.0/True`. Prove with the full SUnit suite
   + `test_dict` scoreboard before proceeding. If this phase shows any kernel
   corruption, it is the early warning that even dict needs the §4 table.
3. **Phase 2 — `set`/`frozenset` on `PyHashTable` (B1 facade).** The large one;
   only after Phase 1 validates the approach. Re-point every element-touching
   method; keep the `Set` supertype; audit the C-shim + pickle/copy + set-ops.
4. **Optionally unify dict onto `PyHashTable` too** (retire the KVD dependency),
   once Phase 2's table is proven — a cleanup, not required for conformance.

Each phase keeps the full SUnit suite green (commit gate) and is its own PR.

## 7. Risks & non-goals

- **Surface.** set/dict/frozenset are pervasive (literals, comprehensions,
  kwargs, C-shim `PySet_*`/`PyDict_*`, pickle, copy, `__eq__`/`__hash__` of
  frozenset). Phase 2 must sweep all of it; the facade (B1) limits it to method
  bodies.
- **Performance.** These are hot. A bucketed table in Smalltalk is slower than
  the kernel primitive; acceptable for conformance, but watch the suite
  wall-clock. Cache `__hash__` in the Entry (done) to avoid recomputation.
- **Corruption — eliminated by construction** in §4 (resize never compares;
  append after compare). This is the whole point of owning the table.
- **Non-goal:** matching CPython's exact iteration order for sets (unspecified
  in CPython) or its exact frozenset hash algorithm (only consistency matters).
- **Deferred/related:** the `test_contains` frozenset-subclass case and
  `test_8420_set_merge` (error during a large rehash) both fall out of §4 for
  free (cached-hash bucketing + propagating `__eq__`).

## 8. Phase 2 concrete implementation spec (set / frozenset re-backing)

Investigated surface (2026-07-29). The shared Python set protocol is compiled
onto the **kernel `Set` class** (`method: Set` in `SetProtocol.gs`); `set` and
`frozenset` are sibling `Set` subclasses adding overrides. Bare kernel `Set`s
DO leak into Python (`hashlib.algorithms_guaranteed` = `names asSet`), so the
facade must tolerate a set-typed receiver with no table.

### 8.1 Backing store & instVar
- Add instVar `table` to **`set`** and **`frozenset`** (change `instVarNames:
  #()` → `#( table )` in set.gs / frozenset.gs class defs). NOT on kernel `Set`
  (a per-user install cannot safely reshape a kernel class).
- `table` is a **PyDict** (elements = keys, value = a fixed non-nil sentinel,
  e.g. `true`). Reuses Phase 1's Python `__hash__`/`___pyRichEqBool___` keying.
  PyDict insertion `order` gives first-inserted-key-wins on collision (CPython
  set semantics) and a stable iteration order; its `version` guard reused for
  "set changed size during iteration".

### 8.2 Polymorphic element primitives (define on `Set`, native fallback)
Put these on kernel `Set`; `set`/`frozenset` get the table via
`___pySetTable___`. A nil table ⇒ bare kernel Set ⇒ native storage.
- `Set>>___pySetTable___` → `^ nil`  (override `set>>___pySetTable___ ^ table`,
  `frozenset>>___pySetTable___ ^ table`)
- `Set>>___pySetDo___: b` → `t := self ___pySetTable___. t isNil ifTrue: [^ self
  @env0:do: b]. ^ t @env0:keysDo: b`
- `Set>>___pySetSize___` → nil→`self @env0:size` else `t @env0:size`
- `Set>>___pySetIsEmpty___` → nil→`self @env0:isEmpty` else `t @env0:isEmpty`
- `Set>>___pySetIncludesKey___: x` → nil→`self @env0:includes: x` else
  `t @env0:includesKey: x`  (PyDict includesKey: keys by Python hash/eq)
- `Set>>___pySetAddKey___: x` → nil→`self @env0:add: x` else `t @env0:at: x put:
  true`  (dedups by Python hash/eq; first key kept)
- `Set>>___pySetRemoveKey___: x` (answer Boolean found) → nil→native
  `remove:ifAbsent:[^false]. ^true`; else `t @env0:removeKey: x ifAbsent:
  [^ false]. ^ true`
- `Set>>___pySetClear___` → nil→`self @env0:removeAll: self`; else
  `t @env0:removeAllKeys` (or a fresh PyDict)

### 8.3 Construction — every path must create the table BEFORE use (and before freeze)
- Add `set class>>new` and keep `frozenset class>>new`: allocate via `super new`,
  then set `table := PyDict new`. (frozenset: create+populate+`immediateInvariant`
  LAST; the frozen instance's `table` reference is set once — never reassigned.)
- Add `set class>>withAll: coll` and rewrite `frozenset class>>withAll:` to:
  `inst := self new. coll do: [:e | inst ___pySetAddKey___: e]. freeze if
  frozenset. ^ inst`.  (Do NOT lazy-init `table` in the accessor — frozensets are
  frozen, so assignment there fails.)
- `SetProtocol Set class>>__new__` / `__new__:` / `__new__:_:` already route to
  `self @env0:new` / `self @env0:withAll:` — now table-backed via the overrides.

### 8.4 Per-file edit checklist (route every native element send through §8.2)
- **set.gs**: `add:`→`___pySetAddKey___:` (keep the hashable gate); `clear`→
  `___pySetClear___`; `discard:`/`remove:`/`pop`/`*_update:`/`update:` — replace
  `self @env0:do:`/`@env0:add:`/`@env0:remove:`/`@env0:isEmpty` with the
  primitives; `__repr__` uses `___pySetSize___`/`___pySetDo___:`.
- **SetProtocol.gs**: `__contains__:` → `___pySetIncludesKey___:` + iterate the
  NaN identity fallback via `___pySetDo___:` (detect on `==`); `__len__`→
  `___pySetSize___`; `__iter__` (set_iterator snapshots via `___pySetDo___:`);
  `__eq__:` via `___pySetSize___`+`issubset:`; `difference:`/`intersection:`/
  `symmetric_difference:`/`union:` — build accumulator as a facade `set @env0:new`
  and `accumulator ___pySetAddKey___:` (NOT `Set new`/native add:, which would
  re-dedup by Smalltalk =); `isdisjoint:`/`issubset:`/`issuperset:` iterate via
  `___pySetDo___:`; `copy` via `withAll:`.
- **frozenset.gs**: `__hash__` XOR via `___pySetDo___:`; `__repr__` via
  `___pySetSize___`/`___pySetDo___:`; `new`/`withAll:`/`___frozenInstance:` per §8.3.
- **set_iterator.gs**: `___on:` snapshot via `aSet ___pySetDo___:`; `__next__`
  mutation guard via `collection ___pySetSize___`.
- **PythonAst/SetAst.gs** (literal) + **SetCompAst.gs** (comprehension): emit the
  build through the facade — send `add:` in **env 1** (so it hits `set>>add:` →
  `___pySetAddKey___:`), NOT `@env0:add:` (native kernel storage). Currently both
  emit `set new` (env 0) + `@env0:add:`.
- **CPythonShim.gs** `PySet_New:/Add:/Contains:/Discard:/Clear:` — call the env-1
  facade methods (`add:`/`__contains__:`/`discard:`/`clear`) instead of native
  kernel selectors.
- **dict_view.gs** `dict_set_view` comparisons (`__eq__`/`__le__`/…): replace
  `other @env0:size` with `other @env1:__len__` (facade-safe for a set operand).
- **hashlib.gs:267–268** — expose `frozenset withAll: names` (real facade sets),
  not bare `names asSet`. (The Set native-fallback in §8.2 also covers it, but a
  real frozenset is cleaner.)

### 8.5 Validation
- `test.test_set` scoreboard: target the 10 remaining (badcmp×4,
  subclass_with_custom_hash×2, set_literal_insertion_order×2, contains×1,
  8420_set_merge×1) → 0. Add per-push SUnit: numeric collapse `{1,1.0,True}` (len
  1, stored int), and — via an off-collections-shard fixture class (avoid the
  shard-0 flake, cf. SubclassCopyPickleTestCase) — custom-`__hash__` collision +
  bad-`__eq__` propagation.
- Full SUnit suite GREEN (commit gate) — watch for any consumer that built data
  in a Python `set` and read it via native `do:`/`asArray` (the §6 audit found
  only hashlib Python-visible; internal `Set new` temporaries are unaffected).
- Corruption is structurally avoided: the table is a PyDict (Phase-1-proven), and
  `__eq__` is only called during a probe walk before any mutation; resize
  re-buckets by cached hash with no `__eq__`.
