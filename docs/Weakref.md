# Weak References in Grail

## Status

**Implemented**, backed by GemStone ephemerons. The Smalltalk layer
lives in [`src/weakref/WeakReference.gs`](../src/weakref/WeakReference.gs);
the Python `weakref` module is re-implemented on top of it in
[`src/python/stdlib/weakref.py`](../src/python/stdlib/weakref.py),
exposed to Python through the Smalltalk-backed `_weakref` module
(also in `WeakReference.gs`). The replacement is API-compatible with
CPython for the surface Grail's bundled stdlib uses: `ref`, `proxy`,
`WeakValueDictionary`, `WeakKeyDictionary`, `WeakSet`, `WeakMethod`,
`finalize` (plus stubs for the rarely-used `getweakrefcount` /
`getweakrefs`).

## What CPython's `weakref` does

In CPython every object carries a refcount. `weakref.ref(obj, callback)`
does **not** bump `obj`'s refcount; it registers in `obj`'s internal
weakref list. When `obj`'s refcount drops to zero the deallocator
iterates the weakref list, sets each ref's referent to `None`, and
fires each callback synchronously on the deallocating thread.
`WeakValueDictionary`, `WeakKeyDictionary` and `WeakSet` are built on
top, with the callback set to "remove this entry."

Callback timing is **synchronous with deallocation**: the moment `obj`
is freed, every callback has already run.

## What GemStone provides

`Object >> beEphemeron:` / `isEphemeron` / `mourn`. An *ephemeron* is
an object whose first instVar is treated as the **key**: when the GC
finds the key reachable *only* through ephemerons (i.e., if every
ephemeron-slot referencing it were nilled, the key would be
unreachable), the GC fires the ephemeron. Firing synchronously clears
the `isEphemeron` bit and queues the object for `#mourn` on a dedicated
high-priority finalization process (`GcFinalizeNotification`).

Conceptually the same as CPython's `ref(obj, callback)`, with one
timing difference: `mourn` is *post-GC asynchronous* rather than
synchronous-with-deallocation. In practice, in a single-threaded topaz
session, the finalization signal is delivered before the next statement
after the scavenge — but a test that wants determinism drains the queue
explicitly (see `WeakReferenceTestCase>>collectGarbage`).

## Architecture: three-class chain

The naive "make `WeakReference` itself an ephemeron" design fails as
soon as a `WeakReference` ends up in any committed graph — committing
an ephemeron signals `TransactionError 2407 "attempt to commit an
ephemeron"`. The fix uses GemStone's `dbTransient` class option to
hide the ephemeron from commit's graph walk:

```
WeakReference          (regular, persistent)
  instVarNames: #( holder hashCache )

WeakReferenceHolder    (dbTransient wrapper)
  instVarNames: #( ephemeron callback dead )

WeakReferenceEphemeron (regular, beEphemeron: true on instances)
  instVarNames: #( referent holder )
```

- **`WeakReference`** is a plain persistent object. `holder` points at
  the inner wrapper; `hashCache` is the SmallInteger hash frozen from
  the referent at construction, so a ref remains a stable dict key
  even after the referent dies or after a commit / read-back cycle
  (matching CPython).

- **`WeakReferenceHolder`** is `dbTransient`. The dbTransient option
  means commit does not walk a wrapper instance's slots — so the
  inner ephemeron, sitting in slot 1, is never visited during commit
  and never trips commit's ephemeron check. After commit + read-back
  all three slots come back nil; the `WeakReference` then reports
  dead (matching CPython's "weakrefs do not survive pickle"
  contract).

- **`WeakReferenceEphemeron`** is the actual ephemeron. `referent` in
  slot 1 is the ephemeron key; `holder` is a back-pointer so `mourn`
  can dispatch to the holder's `_ephemeronFired` hook. When the
  ephemeron fires, `_ephemeronFired` flips `dead` first (so the user
  callback observes `value == nil`, matching CPython's "referent is
  None inside the callback"), runs the callback wrapped to substitute
  the outer `WeakReference` for its argument, then nils internal
  references.

Public API on `WeakReference`: `value`, `isAlive`, `isDead`, `=`,
`hash`, plus the env-1 Python protocol methods `__new__:`, `__call__`,
`__eq__:`, `__hash__`.

### The dbTransient + ephemeron contract

The structural choice is forced by what `dbTransient` does and doesn't
suppress:

| Pattern | Commit |
|---|---|
| Plain ephemeron reachable from a committed graph | ❌ `TransactionError 2407` — expected. |
| dbTransient instance that **is itself** an ephemeron (`beEphemeron: true` on the dbTransient instance) | ❌ `TransactionError 2407` — the bit-check fires on the instance regardless of dbTransient. |
| dbTransient instance **holding** a separate ephemeron in a slot | ✓ succeeds — dbTransient hides the slot from commit's walk, so the inner ephemeron is never visited. |

Hence the wrapper holds the ephemeron rather than being one. The
cross-session regression in
[`tests/scripts/runEphemeronCommitTest.gs`](../tests/scripts/runEphemeronCommitTest.gs)
verifies the end-to-end contract.

## Alternative we considered: OOP-based storage

Before adopting ephemerons we considered building weak references on
GemStone's `Object class >> _objectForOop:`. The brilliance of that
proposal was that an OOP is a SmallInteger — holding it doesn't keep
the object alive, and `_objectForOop:` returns `nil` once the object
is collected, so weakness falls out for free. The design works
uniformly on transient and persistent objects.

Two known holes the proposal also identified up front:

1. **Lazy callbacks.** A dead object's `WeakReference` only notices
   the death on the next `value` call, so a callback never fires
   unless someone happens to read. Mitigation: a class-level registry
   of all callback-bearing refs, scanned periodically.

2. **OOP reuse.** GemStone may recycle a dead object's OOP for a
   fresh object, giving `_objectForOop:` an ABA result. Mitigation:
   stamp the target with a dynamic instVar carrying a unique token;
   the ref stores the same token; on lookup, the OOP must resolve
   *and* the token must match. The `WeakReference`'s own OOP makes a
   reasonable token because it can't be recycled while the ref is
   alive.

### Comparison

| Dimension | OOP + token | Ephemeron + dbTransient wrapper (chosen) |
|---|---|---|
| **Eager callbacks** | No — fires only on scan; lazy. | Yes — GC queues `mourn` automatically. |
| **OOP-reuse safety** | Solved by the token, but it's a hand-rolled invariant; token discipline must be perfect. | N/A — the ephemeron holds an actual identity reference, not an integer. |
| **Per-ref overhead** | Integer + token in the ref; a dynamic instVar slot stamped on every weakly-referenced target. | Three small Smalltalk objects per `WeakReference`. No mutation of the target. |
| **Per-target overhead** | Target gains a `__weakref_token__` dynamic instVar — pollutes object state across the whole image. | Target is untouched. |
| **Multiple refs to same target** | Awkward — the dynamic instVar slot has to hold a shared token, and the WeakReference whose OOP serves as the token can't die before the others. | Trivial — each `WeakReference` builds its own ephemeron; the target is just a key in N independent ephemerons. |
| **Persistence / commit** | Works naturally — the OOP is just an integer and the token is value data. | Required the three-class split, but commit-safety is now built in. |
| **Registry need** | Mandatory for callbacks; secondary leak from accumulated registered refs unless we prune. | None at runtime — GC drives `mourn`. |
| **Implementation complexity** | One Smalltalk class plus registry plumbing, token-stamping discipline, and scan-trigger machinery. | Three small Smalltalk classes; GC does the hard work. |
| **Failure mode** | A bug in the token discipline or registry scan silently leaks or misidentifies an object. | A bug in the structure (e.g., wrapper *is* the ephemeron instead of *holding* one) trips a hard `TransactionError 2407` at commit — visible immediately. |

### Why ephemerons won

The decisive fact was that GemStone *does* expose a real weak-reference
primitive — `beEphemeron:` / `mourn` / the finalization queue. Once
that was on the table the comparison stopped being "polling vs
ephemerons" and started being "polling vs free." Ephemerons give us
the eager-callback property the registry would have had to simulate,
and they sidestep the ABA problem entirely (no integer, no token, no
stamping). The dbTransient + commit interaction was the only real
wrinkle; once the wrapper-holds-ephemeron pattern was understood, the
ephemeron approach won on every axis: simpler runtime structure, no
per-target pollution, GC-driven finalization, and a clean public API.

The OOP scheme would still be the right answer if ephemerons didn't
exist — but they do.

## Python module

`src/python/stdlib/weakref.py` is mostly pure Python on top of `ref`,
which is a thin function delegating to `_weakref.ref(obj, callback)`.
The Smalltalk-backed `_weakref` module exposes `ref:` / `ref:_:` and a
`_collect` Grail extension that triggers GC + drains the finalization
queue (the equivalent of CPython's `gc.collect()` for weakref tests).

The `proxy`, `WeakValueDictionary`, `WeakKeyDictionary`, `WeakSet`,
`WeakMethod` and `finalize` classes are pure-Python wrappers around
`ref` callbacks for auto-pruning. Two compile-shape gotchas surfaced
during the Python-side work and are documented in the code:

1. Python lambdas in Grail compile to 2-arg `ExecBlock`s
   (`positional, kwargs`), so `_weakref.ref:_:` wraps the Python
   callback in a 1-arg Smalltalk block before storing.
2. A nested `def` inside `__init__` captures the parent frame's
   parameter slots — `finalize`'s ref callback is built in a separate
   helper (`_make_finalize_callback`) so its closure doesn't pin the
   referent through `__init__`'s `obj` parameter.

`getweakrefcount` / `getweakrefs` raise `NotImplementedError`. GemStone
doesn't track reference counts, and a per-target registry just to
support these introspection helpers would cost continuous overhead for
APIs almost nobody calls.

## Tests

- **Smalltalk layer:** [`src/weakref/WeakReferenceTestCase.gs`](../src/weakref/WeakReferenceTestCase.gs)
  exercises `WeakReference`, `WeakValueDictionary`, `WeakKeyDictionary`
  and `WeakSet` directly. Auto-discovered via `PythonTestCase suite`.
  Death tests use the `collectGarbage` helper, which scavenges then
  explicitly drains the ephemeron finalization queue.

- **Python layer:** [`src/smalltalk/PythonTests/WeakrefModuleTestCase.gs`](../src/smalltalk/PythonTests/WeakrefModuleTestCase.gs)
  exercises `weakref.ref` / `proxy` / collections / `finalize` from the
  Python surface, loaded via `importlib.loadModuleFromPath:` against
  [`tests/python/weakref_basic.py`](../tests/python/weakref_basic.py).

- **Commit safety (cross-session):** [`tests/scripts/runEphemeronCommitTest.gs`](../tests/scripts/runEphemeronCommitTest.gs)
  builds a Grail `WeakReference`, commits the UserGlobals graph that
  holds it, re-logs in, and verifies the post-commit contract: outer
  ref persists, holder's instVars come back nil (dbTransient erased
  the link to the inner ephemeron), ref reports dead, hashCache
  survives so the ref is still usable as a dict key. Wired into
  `scripts/run_tests.sh`.
