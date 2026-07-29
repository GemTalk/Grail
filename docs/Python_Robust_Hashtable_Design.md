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
