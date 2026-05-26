# Supporting `weakref` in Grail

## Status

**Stubbed.** `src/python/stdlib/weakref.py` ships strong-ref
stand-ins for every public name (`ref`, `proxy`, `WeakValueDictionary`,
`WeakKeyDictionary`, `WeakSet`, `WeakMethod`, `getweakrefcount`,
`getweakrefs`).  All operations behave as if reference counts were
infinite — nothing is ever collected early, callbacks never fire.

The stub is adequate for:

* **`import` paths** — blinker / jinja2 / Werkzeug all import
  `weakref` at module load time; the stub satisfies the name
  lookup.
* **Short-run paths** — Flask hello-world via `werkzeug.test.Client`
  builds a request, runs a handler, returns a response, drops the
  request.  No long-lived state accumulates.

It is **not** adequate for:

* **`flask run` (long-running)** — blinker's signal registry grows
  monotonically (dead receivers never auto-unregister), and any
  Werkzeug request-local pattern that depends on weakref-driven
  cleanup leaks per request.
* **Cache-as-WeakValueDictionary** — entries that should expire when
  the value goes out of scope persist forever.

## What CPython's `weakref` does

In CPython, every object carries a refcount.  When `weakref.ref(obj,
callback)` is created, the ref does NOT bump `obj`'s refcount; instead
it registers in `obj`'s internal weakref list.  When `obj`'s refcount
drops to zero, the deallocator iterates the weakref list, sets each
ref's referent to `None`, and schedules each callback to fire.

`WeakValueDictionary` / `WeakKeyDictionary` are built on top: they
store weak refs to the values (or keys), with the callback set to
"remove this entry from me."  Result: when the last strong ref to a
value disappears, the dict entry is gone the next time you look.

Callback timing is **synchronous with deallocation**.  The moment
`obj` is freed, every weakref-callback runs (still on the calling
thread, in deterministic order).

## What GemStone provides

`Object >> beEphemeron:` / `isEphemeron` / `mourn`, and an existing
internal user (`FsFileDescriptorEphemeron` in the GemStone Smalltalk
library):

```smalltalk
fileDescriptor: aFileDescriptor
    fileDescriptor := aFileDescriptor.
    self beEphemeron: true.
    fileDescriptor _ephemeron: self
```

Semantics: an *ephemeron* is a holder object whose first instVar is
the *trigger*.  When the trigger has no other strong references, GC
puts the ephemeron on a finalization queue and asynchronously sends
it `mourn` (a method the holder class defines for cleanup).

Conceptually equivalent to CPython's `ref(obj, callback)`:

| CPython                    | GemStone                                   |
|----------------------------|--------------------------------------------|
| `r = ref(obj, cb)`         | `r := Holder new`; `r instVar1: obj`;      |
|                            | `r beEphemeron: true`                      |
| `obj` refcount → 0         | GC sees `obj` is otherwise unreachable     |
| `cb(r)` fires synchronously| `r mourn` fires asynchronously in finalizer|

## Why we haven't wired it up

Four sharp edges, ranked by severity:

1. **Async finalization timing.**  CPython callbacks run on the
   deallocating thread, immediately.  GemStone's `mourn` runs in a
   dedicated finalization GsProcess after GC.  Code that depends on
   "after the last reference drops, the cache entry is gone before
   my next lookup" silently behaves differently.  Realistic for
   long-running servers (eventually consistent), wrong for unit
   tests that `del x` and immediately check the dict.

2. **Committed-object semantics.**  Per the `beEphemeron:` doc:

   > the isEphemeron bit is silently cleared if an attempt is made
   > to commit the object, the isEphemeron bit remains cleared if
   > the commit fails due to concurrency conflicts.

   Caches that survive `System commit` would silently degrade to
   strong refs.  This is an unusual failure mode that user code
   wouldn't reasonably anticipate.  A "real" WeakValueDictionary
   that loses its weak semantics after `commit` is arguably worse
   than the strong-ref stub (which is at least predictably leaky).

3. **Eligibility restrictions.**  `beEphemeron:` raises
   `ArgumentError` for byte-format / Nsc / large (>2034 instVars) /
   committed / Behavior / GsProcess / ExecBlock / SoftReference
   receivers.  So we can't make the ephemeron directly *be* the
   callable / class / module / etc.  Need a `WeakRefHolder` wrapper
   class whose instVar #1 is the actual target.  That's an extra
   indirection on every read (`r()` becomes `r.instVarAt: 1`).

4. **Finalization process context.**  `mourn` fires inside the
   finalization GsProcess, which has no per-session Python module
   context, no user's symbol list, no transaction view.  The Python
   callback typically wants to e.g. remove a key from a dict that
   lives in user code.  Wiring the cross-process callback through
   safely (and not double-firing across transactions) is real work.

## Implementation sketch (when we decide it's worth it)

```smalltalk
Object subclass: 'WeakRefHolder'
    instVarNames: #( trigger callback registered )
    ...

method: WeakRefHolder
    _setTrigger: target callback: cb
        trigger := target.
        callback := cb.
        registered := true.
        self beEphemeron: true

method: WeakRefHolder
    mourn
        "GC fired us — trigger is no longer reachable.  Fire the
        Python callback (if any) and clear our slot so future reads
        return None."
        | cb |
        cb := callback.
        trigger := nil.
        callback := nil.
        registered := false.
        cb ifNotNil: [
            "Defer the callback to user code via a queue rather than
            running it in the finalization GsProcess — that process
            has no Python session context.  Concrete mechanism TBD."
            self _queuePythonCallback: cb arg: self]
```

Plus on the Python side:

```python
class ref:
    def __init__(self, obj, callback=None):
        self._holder = _make_holder(obj, callback)

    def __call__(self):
        v = self._holder.trigger
        return v  # is `None' (Python) when collected
```

`WeakValueDictionary` then becomes a normal dict whose stored values
are `WeakRefHolder` instances, with a synthesized callback that
removes the corresponding key.  Same for `WeakKeyDictionary` /
`WeakSet`.

## Triggers for revisiting

Concrete signals it's time to do the real work:

1. **A test fails because of leaked state.**  E.g. blinker's signal
   registry grows across test cases and a test assertion depends on
   the receiver count.

2. **`flask run` development server is reachable** (M8 milestone)
   and memory growth becomes observable.

3. **A Werkzeug test client run depends on weakref cleanup
   timing** — surprising but possible.

4. **A user reports** that their Python code that worked on CPython
   silently behaves differently on Grail in a weakref-shaped way.

Until then, the stub stays.  This file is the bookmark.

## Open questions for the eventual implementation

* **Callback context.**  Where does the Python callback actually
  run?  Options: (a) cross-process queue + per-session drain on
  next user call, (b) synchronously inside any user call that
  reads / writes the dict (turn the lazy collection into eager-on-
  access), (c) require explicit `weakref.poll_finalizers()` calls
  (would diverge from CPython).
* **Committed-object workaround.**  Reject `beEphemeron:` on
  committed targets and fall through to the strong-ref behavior,
  documenting the divergence?  Or override `commit` on
  `WeakRefHolder` to deny / warn?
* **Identity vs equality.**  CPython's `ref(a) == ref(a)` is True
  even after both refs go dead (refs of the same target compare
  equal).  Our wrapper has the same data — store an identity hash
  at construction so equality survives the clear.
* **`__class__` / `__name__`.**  `ref` instances expose them
  matching CPython — straightforward but easy to forget.

These all become real questions once a downstream consumer needs
real weakref semantics.  Doc, then defer.
