# Shim memory: who frees what

Status: design for review, 2026-10-26; revised 2026-10-27 after trying
Step 1b. Implemented so far: proxies are `instancesNonPersistent` (Step 2's
precondition).

The C-extension shim never frees anything it allocates, so a long-running
numpy program grows until it runs out of temporary object memory. This
document describes the problem, sorts the objects involved into four
quadrants, and proposes an order of work in which each step can be measured
before the next starts.

## The problem, measured

`_Py_Dealloc` is a no-op (`src/c/shim/cpython.cc`), so when an object's
reference count reaches zero, nothing happens. Measured on
`fix/numpy-stack-leak` (#1779): about 7 KB of temporary object memory stays
live per call of `numpy.testing.assert_array_equal`, after a full
`System _vmMarkSweep`. With pytest's own retention on top,
`test_api -v` filled the 300 MB of old space `./grail` allows.

A diff of `System _vmInstanceCounts: 3` across 1500 calls showed what
accumulates, per call: about 31 `ShimForeignObject` proxies (each with a
`String` type name, a `CByteArray` view and a `CPointer`), about 34
`CByteArray` wrappers, and about 19 tuples. `findReferencesInMemory` on the
survivors found them held by three session maps:

* `GrailShimWrapperMap` (`CPythonShim>>valueToPyObject`): Grail value to the
  C wrapper made for it;
* `GrailForeignProxies` (`CPythonShim>>foreignProxyForPointer:typeName:`): C
  pointer to the proxy made for it;
* `GrailRealTupleOrigins` (`CPythonShim>>___noteRealTuple:origin:`): Grail
  copy of a C tuple to the C original.

Holding the second and third maps weakly was tried. It cut growth by about
40% and was reverted, because the first map is the bulk and does not shrink
on its own (see "Why the quadrants are coupled").

## Four quadrants

Every object involved is created on one side and seen by one or both.

| created by → seen by | what the shim does today | what is missing |
|---|---|---|
| Grail → Grail | Nothing. | Nothing: GemStone's GC handles it. |
| Grail → C | `wrap:` makes a 32-byte wrapper: C memory owned by a `CByteArray`, holding the object's OOP raw at offset 16. `GrailShimWrapperMap` is its only strong reference, so it plays the role of GemStone's export set. It also gives C the same pointer for the same object every time, which C relies on for identity. | A sound rule for removing an entry. `sweep` drops entries at refcount ≤ 0, but it is starved (below), and the counts are not honest (below). |
| C → C | Wheels already count references: CPython 3.14's `Py_INCREF` and `Py_DECREF` are inlined into numpy. The shim allocates with `calloc` (`PyTuple_New`, `PyList_New`, `PyType_GenericAlloc`, `_PyObject_New`). | Deallocation. `_Py_Dealloc` is a no-op and `_Py_DecRef` never calls it. |
| C → Grail | A wheel's object becomes a `ShimForeignObject` proxy, kept in `GrailForeignProxies`. A C tuple becomes a Grail copy, and `GrailRealTupleOrigins` remembers the original so the copy goes back to C as that same pointer. A C list becomes a Grail copy with no origin. | Ownership. Neither a proxy nor a copy holds a counted reference to its C object; that is safe today only because C never frees anything. |

## Why the quadrants are coupled

Most of what accumulates sits in the Grail → C map, but the cause is in
C → C. A C tuple holding a wrapper is never deallocated, so it never
decrefs the wrapper, so the wrapper's count never reaches zero, so no sweep
can drop it. Fixing the removal rule first would reclaim almost nothing.

The C → Grail quadrant feeds the same chain: a proxy that never releases its
C object keeps that object's references to wrappers alive.

So the order is C → C, then C → Grail, then Grail → C.

## Step 0: a measurement to move

Before any change, turn the probe used above into a repeatable measurement:
run a Python function N times from topaz (`mod @env1:step: n`), then
`System _vmMarkSweep` and read `System _tempObjSpaceUsed`, for several
batches. Growth per call should fall at each step below, and reach about
zero at the end. It should use `_grail_demo` rather than numpy, so it runs in
CI, with a numpy run alongside it locally.

`_tempObjSpaceUsed` sees Grail's objects, not C's. Step 1 frees only C
memory (what `calloc` gave the shim), so it cannot move that figure; the
proxies, origins and wrappers that hold Grail memory go at Steps 2 and 3.
So the measurement reads the C heap too (`malloc_zone_statistics`), with the
shim's own counts of objects allocated, released and quarantined.

## Step 1: C → C, real deallocation

`_Py_Dealloc(op)` dispatches on what `op` is:

* a real-layout tuple or list the shim allocated: decref each item, remove
  it from the real-layout registry, and free it;
* a wheel's own object: call its type's `tp_dealloc` (numpy's frees the
  array's data and then the object through its `tp_free`; the shim's
  allocators use `calloc`, and `PyObject_Free` and `PyObject_GC_Del` are
  `free`);
* a Grail wrapper: nothing. Its memory belongs to a `CByteArray`, and
  reaching zero only makes it eligible for the sweep.

That last case means **the sweep stays off while freeing is on**, until
Step 3. Releasing a container now decrements the wrappers it holds, and a
wrapper's count is not honest (Step 3): the same wrapper can be held by
other C objects whose handouts never added to it. So a container's release
can take a wrapper to zero that C still holds, and the sweep would drop it.
The sweep reclaims almost nothing today (Step 3), so turning it off costs
little.

`_Py_DecRef` (what abi3 wheels such as PyO3's call) must call `_Py_Dealloc`
at zero, and the shim's own `Py_DECREF` macro in `cpython.h` must match the
3.14 one.

**Immortal objects.** CPython 3.14 marks statically allocated objects
immortal: `PyObject_HEAD_INIT` gives them `_Py_STATIC_IMMORTAL_INITIAL_REFCNT`,
and a wheel's inlined `Py_DECREF` does nothing to an object whose low 32 bits
read as negative. A wheel's own static types are already immortal. The
shim's are not. `CPythonShim`'s initialization pins `None`, `True`, `False`,
`NotImplemented` and `Ellipsis` at `16r40000000` (1 << 30): too high for C to
count down to zero in practice, but positive in the low 32 bits, so a 3.14
wheel still increments and decrements it. The shim's types (its static ones,
`PyType_FromSpec` heap types and the type mirrors of Grail classes) are set
to refcount 1. Every object the shim never means to free should start at
`_Py_IMMORTAL_INITIAL_REFCNT` (`3 << 30`), and the shim's own macros must
skip immortal objects as 3.14's do. Otherwise, once deallocation is real, one
decrement too many on a type reaches `_Py_Dealloc`.

**The registry.** The real-layout registry (`real_reg_add`) never removes
entries, which is safe only while no address is ever reused. Freeing makes
reuse possible, so freeing must remove the entry.

**Refcount bugs become use-after-free.** Today a missing `Py_INCREF` in the
shim is a harmless leak. With freeing on, it frees an object something still
uses. There has been at least one such bug already: #735, a `PyList_Append`
that stored an item without increfing it. Known places to audit first:

* `real_layout_arg` copies call arguments into CPython's layout and never
  releases the copies. The copy should be released when the call returns.
* `PyDict_GetItem` and friends answer a borrowed reference, and since #1779 a
  tuple value can come back as a fresh copy. That copy's owner must be its
  origin entry (Step 2), not nobody.
* every shim function that answers a new reference must give the caller one
  (see Step 3).

**Quarantine mode.** To find these before they crash someone,
`GRAIL_SHIM_DEALLOC` chooses what `_Py_Dealloc` does: `off` (nothing, as
today), `free`, or `quarantine`. In quarantine mode, "free" poisons the block
instead of releasing it: it overwrites `ob_type` with a type the shim checks
for, so a later use reports the object (its address and original type) and
aborts. The block is never handed back to malloc, so its address is never
reused. Without that, a stale pointer reads whatever malloc put there next
and the report cannot name the object. Run the census, the numpy modules,
SUnit and the CPython suite (which reaches the shim through `_sre`) in that
mode before freeing is on by default.

Quarantine catches a stale *use*, not an extra release on its own: an
object released one decrement early, and never touched again, goes
unreported. So every bug it finds also gets a test of its own.

## Step 2: C → Grail, a proxy owns a reference

* When `foreignProxyForPointer:` makes a proxy, the proxy takes one
  reference to its C object (`Py_INCREF`), and the proxy map holds proxies
  weakly.
* When Grail collects the proxy, that reference is released. GemStone tells
  us through finalization, which cannot call C directly. An ephemeron's
  `mourn` can land in the middle of a compile, which is why Grail's
  `FinalizerEphemeron` only queues its hook. And the hook cannot call C
  either: `_runPending` also runs when a watch is registered, which can be
  inside a shim call, and the shipped kernel allows only two user actions in
  flight. So the hook only appends the C pointer to a release list, and
  `CPythonShim` hands the whole list to C as one user action at the next
  top-level shim call, before the call itself.
* "Top-level" cannot be read from `callDepth` as it stands: it has been
  caught at -1 with a shim call on the stack, and once it drifts negative
  `___betweenShimCalls` answers true for the rest of the session. Either the
  counter is fixed first, or C keeps its own depth (it knows when a user
  action is entered and left) and drains the list itself.
* `id()` of a proxy becomes its C address, as in CPython. That keeps `id()`
  stable when a proxy is collected and a later crossing makes a new one,
  which was the reason the weak-map experiment was reverted.
* This depends on the proxy staying temporary: GemStone mourns only
  temporary objects, and `FinalizerEphemeron` refuses to watch a committed
  one. So `ShimForeignObject` is `instancesNonPersistent` (done with this
  document): a commit that reaches a proxy is refused with TransactionError
  2407, and `gemdb.commit()` names where the proxy is held. Before, the proxy
  committed silently and pointed at nothing in the next session.
* A Grail copy of a C tuple works the same way: its origin entry takes a
  reference to the C tuple, and the copy's collection releases it through
  the same list. Unlike a proxy, the copy is an ordinary tuple and may
  legitimately be committed (a shape saved with some data). Only its link to
  the C original is session-local. So the hook drops the origin entry before
  it releases the reference, and it does not matter whether the ephemeron
  fires or never does: without an entry, `wrap:` makes an ordinary wrapper.

## Step 3: Grail → C, honest counts and a sweep that runs

Once Steps 1 and 2 release references, wrapper counts can fall to zero, and
"refcount 0, with no shim call in progress" becomes a sound rule for
dropping a wrapper. Two things make today's counts dishonest:

* **A second handout adds nothing.** `wrap:` answers the existing wrapper
  and only resets its count to 1 if it had fallen to zero or below. When the
  same object goes to C twice as a new reference, C decrefs twice but the
  count went up once. The counts undercount, and the sweep's test is
  `<= 0` for that reason. The fix is CPython's convention: a fresh wrapper
  starts with the map's reference only, every shim function that answers a
  new reference increfs it, and one that answers a borrowed reference
  does not. Only the C side knows which a given API is, so the increment
  belongs there, not in `wrap:`.
* **Borrowed references held across calls.** In CPython that is safe only
  for objects that never die: `None`, small ints, interned strings, type
  objects. Wrappers for those should be pinned rather than swept. Anything
  else a wheel holds without a reference is a wheel bug in CPython too.

The sweep itself is starved: its trigger is checked once per 1000 wraps and
dropped if a call is in progress at that moment, and a missed trigger is
never retried. Measured in August over ten passes of `test.test_re`: 0
reclaims across about 150,000 wraps, with the map growing by about 15,000
entries a pass. It needs a trigger that is retried at the next top-level
call, and that change should come last. In the same measurement, a forced
sweep followed by a scavenge left 7 of 5,849 swept wrappers pointing at
collected objects that C still held. The cause was a missing incref in
`PyList_Append`'s real-layout branch (#735), not the sweep's rule. So a
wrapper dying under the sweep is evidence of a reference C failed to count,
and the fix is the incref.

Quarantine mode covers this step too: a swept wrapper is poisoned, not
dropped, and a later use reports it.

## Cycles across the boundary

A Grail object holding a proxy, whose C object holds a wrapper of the same
Grail object, is a cycle neither collector can see. Other bridges (PyObjC,
JPype) accept this. numpy's own references (`ndarray.base` chains) do not
form cycles, so I propose to measure it once the steps above are in, not to
design for it now.

## Risks and open questions

* **Use-after-free** is the main risk, and quarantine mode is the answer. A
  step that is not clean in quarantine mode does not turn freeing on.
* **Python subclasses of C types** (`ShimForeignSubclass`): the Grail object
  owns a C body, which is in the wrapper map. When the Grail object dies,
  the body's `tp_dealloc` should run (numpy's array data lives there). How
  that fits Step 2's release list needs working out.
* **Cost.** A proxy gains an ephemeron. That is one object per proxy, and
  numpy makes dozens of proxies per call, so measure it against Step 0.
* **Persistence.** A proxy can no longer be committed (Step 2). That is a
  visible change: a commit that reaches any C extension object, such as a
  numpy array stored in `gemdb.root`, is now refused instead of succeeding
  and then failing in a later session. Storing an array's data persistently
  means converting it first (`tolist()`, `tobytes()`).
* **Reinstalling over a changed class.** Rowan's incremental reload added the
  `instancesNonPersistent` option but does not remove one, and GemStone
  refuses `makeInstancesPersistent` on the installed class (error 2270). So
  undoing it locally, as a control does, needs a fresh extent. CI always
  installs on one.

## Order of work

| step | change | done when |
|---|---|---|
| 0 | memory measurement (demo, numpy) | it reports growth per call, in CI |
| 1a | immortal statics; `_Py_DecRef` and the macros as 3.14's | nothing changes yet; the census still agrees |
| 1b | quarantine mode; `_Py_Dealloc` frees real-layout containers and wheel objects; the sweep off while freeing | census, numpy modules, SUnit and the CPython suite are clean in quarantine mode; the C heap's growth per call falls |
| 2 | proxies `instancesNonPersistent` (done); a trustworthy "no shim call in progress"; proxies and tuple origins own a reference; release list; `id()` of a proxy | the same, and growth falls again |
| 3 | new references incref; immortal wrappers pinned; sweep retried | growth per call is about zero |

Each step is its own PR, with its controls, and Tier 2.
