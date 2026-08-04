# A dead Grail wrapper reads as "foreign", and `_sre` reports it as `IndexError: no such group`

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

**Still open — the one question the fix depends on:** *which* pointer arrived at
`PyDict_GetItem:key:`. Two possibilities, with different fixes:

| if… | then the fix is… |
| --- | --- |
| a **dead/reclaimed Grail wrapper** whose sentinel no longer reads | wrapper lifetime: keep `groupindex`'s wrapper alive for the Pattern's lifetime; the type guard is only a diagnostic |
| a **genuinely foreign** dict (real CPython object) | route the dict APIs through the proxy instead of assuming a Smalltalk dictionary |

The shim already ships the diagnostic that settles it. `diag_foreign`
(`src/c/shim/cpython.cc:1037`) prints every foreign crossing when `GRAIL_SHIM_DIAG` is
set:

```
GRAIL_SHIM_DIAG=1 ./scripts/run_tests.sh 2>&1 | grep SHIM-DIAG
SHIM-DIAG FOREIGN obj=0x... ob_type=0x... tp_name='...'
```

A `tp_name` of `dict` (or garbage) at the moment of failure says "dead Grail wrapper".
A real foreign type name says "genuine foreign object". **Please run that in the
session that reproduces it** — it is the difference between a lifetime fix and a
proxy-routing fix.

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
