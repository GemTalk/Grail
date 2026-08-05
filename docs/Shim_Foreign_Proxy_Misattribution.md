# A dead Grail wrapper reads as "foreign", and `_sre` reports it as `IndexError: no such group`

> **RESOLVED 2026-08-04 — read this box before the rest.**
>
> The headline is right: a *dead Grail wrapper* is misread as foreign. The
> mechanism given below for *how* it dies is **wrong**, and is corrected in
> [How the wrapper actually dies](#how-the-wrapper-actually-dies-corrected).
> In short: `sweep` is not involved and cannot be — it only removes wrappers at
> refcount ≤ 0, and `groupindex` is held at ≥ 2. The wrappers were orphaned by
> **replacing the `CPythonShim` singleton**, which dropped the instance-held
> map that was their only strong reference (measured: 108 wrappers before a
> `CPythonShim reset`, 2 after).
>
> The open question the doc ends on — dead wrapper vs genuinely foreign object —
> is settled: **dead wrapper**. No `GRAIL_SHIM_DIAG` run by the reporter is
> needed.
>
> Fixed by making the wrapper map session-scoped, so a new singleton inherits
> it. The whole-suite-in-one-session reproducer went from a SIGSEGV at test
> 1241 to no crash at all.

*Investigated 2026-08-04 against `main` @ 96f59625 (GemStone 4.0.0, arm64 Darwin).
Written up for the core-team developer who reported the stack. The reported failure
is **not** a `Fraction` bug, a regex bug, or a bad group index.*

## The report

`DunderNewTestCase>>testVendoredFractionEndToEnd` produced two errors, in this order:

```
ERROR 2010  a MessageNotUnderstood occurred (error 2010),
            a ShimForeignObject does not understand  #'includesKey:'
   ...
   16 CPythonShim >> PyDict_GetItem:key:
    9 CPythonShim >> ___translateShimError:   @31 line 17
    4 MessageNotUnderstood >> pass

ERROR 2710  a Error occurred (error 2710), IndexError: no such group
   ...
   27 SreMatch >> group:
   31 [] in Fraction >> ___new__:kw:
   45 DunderNewTestCase >> testVendoredFractionEndToEnd
```

**The second error is a red herring.** The order is the giveaway: the MNU happened
first, and the `IndexError` is what the C `_sre` code stamps on afterwards.

## The causal chain (verified in code)

1. `fractions.py:277` does `m.group('num')` — a **named** group. Named groups are the
   only path that consults the group-name dict.

2. `_sre`'s `match_getindex` (`src/c/shim/_sre/sre.c:2339-2352`):

   ```c
   if (PyIndex_Check(index)) { i = PyNumber_AsSsize_t(index, NULL); }
   else {
       i = -1;
       if (self->pattern->groupindex) {
           index = PyDict_GetItemWithError(self->pattern->groupindex, index);
           if (index && PyLong_Check(index)) { i = PyLong_AsSsize_t(index); }
       }
   }
   if (i < 0 || i >= self->groups) {
       if (!PyErr_Occurred()) {
           PyErr_SetString(PyExc_IndexError, "no such group");   /* <-- the red herring */
       }
       return -1;
   }
   ```

   A string index takes the `else` branch and calls back into Grail.

3. `PyDict_GetItemWithError` → `CPythonShim>>PyDict_GetItem:key:`
   (`src/smalltalk/Python/CPythonShim.gs:1137`), which assumes a Smalltalk dictionary
   with no type guard at all:

   ```smalltalk
   PyDict_GetItem: aDictionary key: aKey
       (aDictionary includesKey: aKey) ifFalse: [ ^ 0 ].
       ^ (self wrap: (aDictionary at: aKey)) memoryAddress
   ```

   It was handed a **`ShimForeignObject`**, which implements no dictionary protocol →
   `MessageNotUnderstood #includesKey:`.

4. `___translateShimError:` cannot recognise that error. It parses `<ExcName>: <msg>`
   by locating the **first colon** — and in an MNU's text the first colon is *inside
   the selector*:

   ```
   first colon index: 101
   parsed exc name  : 'a MessageNotUnderstood occurred (error 2010), a
                       ShimForeignObject does not understand  #''includesKey'
   Python at: that   : nil        -> falls through to `^ ex pass`
   ```

   So the MNU is **passed out of a C user-action callback**, which is Grail's known
   can't-unwind path.

5. Back in C, the callback failed but no *CPython-level* `PyErr` was ever set. So
   `PyErr_Occurred()` is false, `i` is still `-1`, and `_sre` executes its own
   fallback: `PyErr_SetString(PyExc_IndexError, "no such group")`.

   That is the error the test reports. `_sre` has an explicit "if nothing else went
   wrong, blame the group number" branch, and a failed Grail callback lands squarely
   in it.

## Why a Grail dict became a `ShimForeignObject`

`pattern->groupindex` is a Grail dictionary wrapped by `CPythonShim>>wrap:`, which
allocates a 32-byte `CByteArray gcMalloc:` and stamps a sentinel at offset 24
(`0x475241494C575031`, "GRAILWP1"). The C side classifies pointers by **reading that
sentinel out of the pointed-to memory** (`src/c/shim/cpython.cc:1027`):

```c
static int is_foreign(PyObject *obj) {
    if (obj == NULL) return 0;
    if (obj == Py_None || obj == Py_True || obj == Py_False) return 0;
    if (is_real_layout(obj)) return 0;
    return *(uint64_t *)((char *)obj + 24) != GRAIL_WRAP_MAGIC;
}
```

Anything whose bytes 24..31 do not spell `GRAILWP1` is declared foreign and gets a
`ShimForeignObject` proxy — **including a Grail wrapper whose memory is no longer
live**. The wrapper's only strong reference is the `valueToPyObject` entry, and
`CPythonShim>>sweep` removes entries whose refcount has reached zero:

```smalltalk
sweep
    valueToPyObject keysAndValuesDo: [:key :pyObj |
        (pyObj int64At: 0) <= 0 ifTrue: [ toRemove add: key ] ].
    toRemove do: [:key | valueToPyObject removeKey: key].
```

Once the entry is gone nothing holds the `CByteArray`, it can be reclaimed, and any
`PyObject*` C still holds is dangling. Reading offset 24 then returns whatever now
occupies that memory — so the sentinel check reports "foreign".

`wrap:` already documents this hazard in its sibling path: *"C may have decref'd this
cached wrapper to zero after a previous call. Handing it out at refcnt <= 0 would make
it sweep-bait while in flight."* This is the same family as the already-fixed `_sre`
GC-geometry coredump (`dad0e8c`, wrapper use-after-free) — the softer version, where
instead of crashing, the sentinel check silently **misclassifies** the object.

That also explains the reproducibility: it depends on allocation pattern,
`GEM_TEMPOBJ_CACHE_SIZE`, when the sweep fires (`wrapsSinceSweep \\ 1000 = 0` while
`callDepth = 0`), and what ran earlier in the same session.

## What is proven vs. what still needs the reporter's session

**Proven here, deterministically** (`scripts/probe_shim_foreign_dict.gs`):

* `PyDict_GetItem:key:` given a `ShimForeignObject` raises exactly the reported MNU.
* `___translateShimError:` cannot parse an MNU and takes `^ ex pass`.
* `_sre` overwrites a failed callback with `IndexError: no such group`.
* `fractions.py` uses named groups, so it takes that path.

**Not reproducible in this environment:** `testVendoredFractionEndToEnd` passes on
`main` @ 96f59625 (`DunderNewTestCase`: 82 run, 81 passed — the one failure is
`testCanonicalClassAttrOverlay`, unrelated).

### Why a full SUnit run can miss it — and it is *not* the warm/cold distinction

> **Superseded in part.** The conclusion stands — this is per-session state, not
> warm/cold — but the reasoning below attributes it to `sweep` phase, which is
> wrong. What actually varies per session is whether a *reset* happened and
> whether the freed block was later *reused*. See
> [How the wrapper actually dies](#how-the-wrapper-actually-dies-corrected).

The state that governs the trigger is **per-session shim state, not module state**.
`CPythonShim current` keeps its singleton in `SessionTemps` ("each gem process holds
its own"), and the two fields that matter are instance variables on it:

```
instVarNames: #(valueToPyObject noneWrapper typeAddresses wrapsSinceSweep callDepth)
```

`sweep` only runs when `(wrapsSinceSweep \\ 1000) = 0` **and** `callDepth = 0`. So
whether a sweep lands in the window that drops `groupindex`'s wrapper depends on **how
many `wrap:` calls happened earlier in the same topaz session** — which is decided by
*which other test classes shared that session*.

`run_tests.sh` shards the suite across `GRAIL_TEST_WORKERS` sessions, partitioning **by
class** via a stable char-sum hash plus `tests/scripts/shard_overrides.txt`. Both
depend on the worker count, so:

* changing `GRAIL_TEST_WORKERS` gives `DunderNewTestCase` different session-mates, a
  different wrap count before it runs, and a different sweep phase;
* running it alone — `DunderNewTestCase debug: #testVendoredFractionEndToEnd`, which is
  the form in the report — is a third geometry again, and a long-lived interactive
  session that has already done work is a fourth.

`runTestsShard.gs` says as much in its own comment: *"some tests incidentally rely on a
module imported by an earlier test in the same session … True cross-test dependencies
that span shards are surfaced by WORKERS>1."*

Warm-vs-cold is a **contributing input, not the mechanism**: warm-binding skips
recompiling flask/werkzeug/jinja2/twilio, so a warm shard executes far less Python
before reaching any given test — which shifts the wrap count and therefore the sweep
phase. It can flip the symptom without being the cause. Chasing it as a warm/cold
problem would lead away from the wrapper lifetime, which is where the fix is.

**Settled: it is a dead/reclaimed Grail wrapper**, so the fix is wrapper
lifetime, not proxy routing. Nobody needs to run `GRAIL_SHIM_DIAG` to find out.

## How the wrapper actually dies (corrected)

### A reliable reproducer

Run the whole SUnit suite in **one session** — the sharded runner never hits
this, because sharding puts the tests in different sessions:

```
PythonTestCase suite run     "in a bare topaz login"
```

It always died on `DunderNewTestCase>>testVendoredFractionEndToEnd`, test
**1241 of 3653** — the test in the original report. (Established with a progress
log whose file is closed after every write, so the last line survives a
SIGSEGV; buffered stdout loses it.)

### `sweep` is not the mechanism — it cannot be

The section above blames sweep timing. That is wrong:

* `sweep` removes only entries whose refcount is **≤ 0**.
* `groupindex` is held at **≥ 2**: 1 from `wrap:`, plus 1 from
  `Py_NewRef(groupindex)` at `sre.c:1696`.
* Measured: forcing 5000 `wrap:` calls reclaimed **nothing** — 5108 wrappers
  still held afterwards.

So the wrap-count/`wrapsSinceSweep` phase story, including the claim that
`GRAIL_TEST_WORKERS` matters because it changes sweep phase, does not hold.
Worker count matters only because it changes *which tests share a session*.

Also ruled out by reading the code: refcount imbalance in `PyDict_GetItem` or
`PyDictProxy_New` (both correct), a missing incref of `match->pattern` (it is
there, `sre.c:2750`), and `Match_Type`'s `tp_itemsize` failing to propagate
(`cpython.cc` does propagate it).

### What actually orphans the wrappers

`valueToPyObject` was an **instance** variable of the `CPythonShim` singleton,
and it is the only strong reference to every wrapper. Three places replace that
singleton — `reset`, `libraryPath:`, and `current` when the user action library
is not loaded — and replacing it dropped the whole map:

```
wrappers held before CPythonShim reset : 108
wrappers held after                    : 2
```

`CPythonShimTestCase>>testShimSingletonLivesInSessionTempsNotCommitted` does
exactly that reset, in the same session as everything after it.

Meanwhile the C side never lets go: `_PyObject_New` `calloc`s a `PatternObject`
and `_Py_Dealloc` is a **no-op**, so a compiled regex lives for the life of the
process and keeps its raw `groupindex` pointer. A module-level pattern —
`fractions.py`'s `_RATIONAL_FORMAT`, reached through session-local
`sys.modules` — is precisely such a survivor.

### Why it is geometry-sensitive

Freeing the block is not enough: freed-but-unreused memory still reads back its
old contents, so the sentinel still matches and everything works. Verified —
after a reset plus 20 rounds of GC pressure, `groupindex` was byte-identical and
the fraction test passed. It breaks only once the block is **reused**, which is
why thousands of intervening tests are needed and why warm-vs-cold and worker
count appear to matter. That is the real answer to "why didn't I see this in a
sharded run?"

### The crash site

Once the block is reused, offset 24 no longer spells `GRAILWP1`, so
`is_foreign()` says foreign and `foreign_proxy_oop()` reads `tp_name` off an
`ob_type` that is now whatever overwrote the block:

```
SHIM-SRE match=0xa9914c600 pattern=0x102d1a390 groupindex=0xa98d2af10 groups=10
    info->si_addr = 0xe832a          <- ob_type 0xe8312 + 24, where tp_name lives
frame #6: libcpython_ua.dylib`pyobj_oop(_object*) + 196
frame #7: libcpython_ua.dylib`PyDict_GetItem + 80
frame #8: libcpython_ua.dylib`match_getindex + 104
frame #9: libcpython_ua.dylib`match_group + 88
```

Note `groupindex` itself looks perfectly healthy — large, aligned, in the
gcMalloc range. Only its *contents* are stale. A register dump alone is
misleading here; the `SHIM-SRE` line (now gated by `GRAIL_SHIM_DIAG`) is what
identified the right pointer.

Whether you get the SIGSEGV or the reported
`ShimForeignObject does not understand #includesKey:` is just whether the stale
`ob_type` happens to be readable.

### The fix

`CPythonShim>>valueToPyObject` keeps the map in `SessionTemps`, so replacing the
singleton no longer orphans it; the instVar remains as a per-instance memo, so
`wrap:` still costs one instVar read. `libraryPath:` *does* still discard the
map — a library reload invalidates the `tp_*` addresses cached at offset 8 of
every wrapper.

Two guards were added so this class of bug reports itself instead of
segfaulting: `plausible_pyobj()` rejects a value that cannot be a `PyObject*`
(`CHECK_pyObj` names the call site, `pyobj_oop` bails to nil), and
`foreign_proxy_oop` refuses to dereference an implausible `ob_type`. Neither
fires in a healthy run.

**Result:** the one-session reproducer no longer crashes. It now runs to test
3134 and stops on `VM temporary object memory is full` — the ordinary
temp-cache limit of running 3653 tests in one session, which is why the suite is
sharded.

## Two defects worth fixing regardless of which it is

**1. Three more entry points share the unguarded assumption — and one of them fails
SILENTLY.** Immediately after `PyDict_GetItem:key:` in the same file:

```smalltalk
PyDict_Contains: aDictionary key: aKey   ^ aDictionary includesKey: aKey
PyDict_DelItem:  aDictionary key: aKey   aDictionary removeKey: aKey.
PyDict_Size:     aDictionary             ^ aDictionary size
```

Running the probe against a `ShimForeignObject`:

| entry point | result |
| --- | --- |
| `PyDict_GetItem:key:` | MNU `#includesKey:` |
| `PyDict_Contains:key:` | MNU `#includesKey:` |
| `PyDict_Size:` | **`0` — no error at all** |

`PyDict_Size:` is the dangerous one. `ShimForeignObject` inherits a `size`, so a
foreign (or dead-wrapper) dict reports itself as **empty** and the C caller proceeds
on that basis with nothing logged anywhere. Whatever it then concludes is wrong, and
there is no error to trace back. A type guard here is worth having on its own merits,
independent of which root cause turns out to be at work.

**2. `___translateShimError:` converts an internal Grail bug into a misattributed
Python exception.** An error arriving there that is *not* a translatable
`<ExcName>: <msg>` is by definition not a Python-level failure — it is a shim bug —
and `ex pass` from inside a user action is the pattern that cannot unwind. Reporting
the real receiver and selector instead would have put

```
ShimForeignObject does not understand #includesKey:
```

in the test's failure line, rather than a plausible-looking `IndexError` two
subsystems away. As it stands, this class of bug always surfaces misattributed to
whatever C code happened to make the callback — the debugging cost is the point.

## Reproducer

`scripts/probe_shim_foreign_dict.gs` demonstrates both second-order defects without
depending on GC timing:

```
source ./.setenv && ./scripts/evaluate.sh < scripts/probe_shim_foreign_dict.gs
```
