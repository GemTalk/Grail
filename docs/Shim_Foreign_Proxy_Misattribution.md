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
>
> **Round 3, 2026-08-05 — the same symptom came back, and this box was
> incomplete.** Session-scoping the map stopped the *singleton* from orphaning
> it, but `libraryPath:` still deleted the session entry on **every** call,
> including one that re-set the path it already had — and a test did precisely
> that. See [Round 3](#round-3-2026-08-05-the-same-map-wiped-by-librarypath).
> With that fixed, the whole suite in one session is 3803/3803 green.
>
> **Round 4, 2026-08-30 — a third way to orphan a wrapper, and this one was
> the C side's.** Rounds 2 and 3 both dropped the map. Round 4 does not: the
> map is intact and `sweep` reclaims a wrapper that is *legitimately* at
> refcount 0, because `PyList_Append` stored a raw pointer into a real-layout
> list without taking the reference its own comment claimed. See
> [Round 4](#round-4-2026-08-30-pylist_append-never-took-the-reference-its-comment-claimed).

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

### Round 3 (2026-08-05): the same map, wiped by `libraryPath:`

The sentence above — "`libraryPath:` *does* still discard the map" — was the
remaining hole, and it reopened the identical symptom. Making the map
session-scoped stopped the *singleton* from orphaning it; nothing stopped
`libraryPath:` from deleting the session entry outright.

`CPythonShim class>>libraryPath:` discarded the map **unconditionally**, on any
call, including one that sets the path it already had. Re-setting the same path
changes nothing: the library is loaded, every `tp_*` cached at a wrapper's
offset 8 is still valid, and the C structures pointing into those wrappers are
still live. Dropping the map there only destroys things — it is the sole strong
reference both to each wrapper and, as the map's **key**, to the Smalltalk
object whose OOP sits at the wrapper's offset 16.

One test did exactly that:
`CPythonShimTestCase>>testLibraryPathChangeDoesDiscardTheWrapperMap` set the
**same** path and asserted the discard, which passed only because the discard
was unconditional. So a test whose subject was "a library *change* drops the
wrappers" was in fact wiping the live wrappers of every other test in the
session. Because `_Py_Dealloc` is a no-op, a regex compiled earlier survives for
the whole process still holding its `groupindex` pointer — so the damage
surfaced far away, in `fractions`' `_RATIONAL_FORMAT` and thence
`DunderNewTestCase>>testVendoredFractionEndToEnd`.

Symptom this time was `a UndefinedObject does not understand #includesKey:`
rather than `a ShimForeignObject …`: the sentinel at offset 24 was intact and
the block not yet reused, but the OOP at offset 16 had been collected. Per the
reading in [Why a Grail dict became a
`ShimForeignObject`](#why-a-grail-dict-became-a-shimforeignobject), that is the
same failure one stage earlier.

**Fix:** `libraryPath:` compares old and new and discards the map only when the
path actually changes. The test now exercises a real change and restores the map
object afterwards (restoring the path is itself a change, so order matters);
`testSameLibraryPathKeepsTheWrapperMap` pins the same-path case.

**Result:** the whole suite in **one session** — 283 classes, 3803 tests — is
`3803 run, 3803 passed, 0 failed, 0 errors`. Before the fix the same run
reported `1373 run … 170 errors` at 70 classes, all of them one orphaned dict
re-reported. Sharded runs never saw any of it: `CPythonShimTestCase` and
`DunderNewTestCase` land in different shards, so the wipe and its victim were
never in the same session.

Note the round-2 "temp-cache limit of 3653 tests in one session" no longer
binds: with `GEM_TEMPOBJ_CODE_SIZE=600000;GEM_TEMPOBJ_CACHE_SIZE=1000000` the
full 3803 complete. `GEM_TEMPOBJ_CODE_SIZE` is the knob that matters for a long
single session — Python `eval:` compiles new methods, and code space overflows
(`code space doits_meths overflow`) long before object memory does.

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

## Round 4 (2026-08-30): `PyList_Append` never took the reference its comment claimed

*Investigated against `main` @ `7d17656c` (GemStone 3.7.5, x86_64 Linux in the CI
container). Fixed; regression test
`CPythonShimTestCase>>testRealLayoutListAppendTakesAReference`.*

### The report

The nightly CPython conformance job failed intermittently on `test.test_re` with a
shim memory error rather than a test failure:

```
SHIM-BADPTR foreign_proxy_oop ob_type: 0x31 is not a PyObject* (unaligned or too low ...)
SHIM-BADPTR   block@0x3cbc3e40 words [0]=0x3cbc3f20 [1]=0x31 [2]=0x0 [3]=0x7f55096531c0
GRAIL_DETAIL|E: SystemError: PyUnicode_AsUTF8: no Grail object behind 0x3cbc3e40
```

`tests=165 failures=0 errors=1`. The failing case is **`ReTests.test_large_subn`** —
the `GRAIL_TEST` line printed immediately before the error names it, and the
per-test id list is otherwise identical between a failing and a passing run.

Three nightlies: `33240738208` (`dbd87c08`) ERROR, `33290991295` (`e9511b4b`) OK,
`33299121058` (`7d17656c`) ERROR.

### It is not the native-ip bug, and `test_iter`/`test_traceback` do not share it

The 08-29 nightly also regressed `test.test_iter` (0 → 1) and
`test.test_traceback` (14 → 16). Those two are a **different, already-fixed**
defect: `dbd87c08` is the merge of PR #707 and does **not** contain PR #710
(`23242ddf`, the portable-ip conversion), which is what those two rows were waiting
for. Neither recurred afterwards. `test_re`, by contrast, fails again at
`7d17656c`, which *does* contain #710 — so the note in
[[native-code-is-the-linux-darwin-variable]] that `test_re` "also went green with
this fix, mechanism never established" was recording luck, not causation. The two
failures are unrelated; only the nightly's diff put them on one line.

### Reproduction

A Linux container built from `tests/github/Dockerfile` runs with
`GEM_NATIVE_CODE_ENABLED` on, i.e. CI's execution mode. Unamplified it does not
reproduce:

| arm | runs | ERROR |
| --- | --- | --- |
| `run_cpython_suite.sh test.test_re`, solo | 12 | 0 |
| full 102-module manifest, 4-way | 2 | 0 |

The trigger is **when a sweep lands**, so the amplifier is the sweep period. With
`wrap:`'s `wrapsSinceSweep \\ 1000` changed to `\\ 10` and nothing else:

| arm | runs | ERROR |
| --- | --- | --- |
| sweep every 10 wraps, unfixed | 6 | **6** |
| sweep every 10 wraps, fixed | 6 | 0 |

Every amplified failure is `ReTests.test_large_subn` carrying the nightly's own
line — `SystemError: PyUnicode_AsUTF8: no Grail object behind ...` — and at the
same address all six times. That is worth noting about the *nightly* too: at a
fixed SHA this is **deterministic**, and what looked like intermittency across
`dbd87c08` / `e9511b4b` / `7d17656c` is three different SHAs moving the wrap count
that decides where a sweep lands, not luck within one.

### Two measured facts

**1. Sweeps do fire mid-call.** An instrumented `sweep` logging its counters:

```
GRAIL-SWEEP removed=3 mapSize=434 callDepth=-1 depth=59 entryDepth=51
GRAIL-SWEEP removed=1 mapSize=545 callDepth=-1 depth=59 entryDepth=51
GRAIL-SWEEP removed=2 mapSize=602 callDepth=-1 depth=66 entryDepth=51
```

`callDepth` is **negative** while `System stackDepth` is well below (deeper than)
the recorded entry depth — a shim call is in flight. `___betweenShimCalls` opens
with `(callDepth isNil or: [callDepth <= 0]) ifTrue: [^ true]`, so once the counter
drifts negative the "never sweep during a call" guard is off for the rest of the
session. The drift is self-inflicted: the guard's own repair sets `callDepth := 0`,
and the live call's `callDepth := callDepth - 1` then takes it to −1.

**2. A real-layout list held raw wrapper pointers at refcount 0.** `PyList_New`
answers a **real-layout** `ShimListObject` whose `ob_item` is a C array of raw
`PyObject*`. Its append read:

```c
op->ob_item[op->ob_size++] = item;     /* PyList_Append adds a new ref */
```

The comment was aspirational — there was no `Py_INCREF`. Every CPython caller
appends and then releases its own reference (`sre.c`'s `pattern_subx` is
`PyList_Append(list, item); Py_DECREF(item);`), so **each element ended at
refcount 0** while the list still pointed at it. For a Grail-backed item that raw
pointer is all the C side has: the wrapper's only strong reference is its entry in
the session wrapper map, and `sweep` removes exactly the entries at refcount ≤ 0.

### The chain

`test_large_subn` is `@bigmemtest(dry_run=True)`, so it *runs* at the 5147-byte
fallback size rather than skipping:

1. `re.subn('', '', 'a'*5147)` matches empty at all 5148 positions and builds a
   **10295-element** real-layout list — a fresh `getslice` wrapper per `'a'`
   segment plus the literal replacement — every one of them left at refcount 0.
2. Those 5147 fresh wrappers are also, by a wide margin, the biggest burst of
   `wrap:` calls the suite makes inside a single shim call, so a sweep period
   elapses several times *during* it.
3. A sweep (mid-call, per fact 1) drops the map entries. The `CByteArray`s become
   garbage; the next scavenge frees their `gcMalloc` blocks.
4. `PyUnicode_Join` then reads all 10295 elements back through `PyList_GetItem`,
   which for a real-layout list hands back `ob_item[i]` verbatim, and
   `PyUnicode_AsUTF8` dereferences a freed block. Offset 24 no longer spells
   `GRAILWP1`, so `is_foreign()` says foreign and `foreign_proxy_oop` refuses the
   implausible `ob_type` — the `SHIM-BADPTR` pair above.

That also answers the question `report_pyobj_words` was added to settle — **dead
wrapper, not a block that was never a wrapper**. It is not a judgement about the
four words: the pointer came out of `ob_item` of a real-layout list, and the only
thing ever stored there is a pointer that *was* a live wrapper when it went in.
(The words are consistent with reuse rather than with a stale copy: in the
`0x3cbc3e40` sample word[1] `0x31` sits exactly where a glibc chunk header would
after the freed region was re-split, with a 48-byte chunk — the size `malloc(32)`
takes — beginning 16 bytes in.)

### The fix

Take the reference at the point the raw pointer is stored, which is both what the
comment claimed and what CPython does:

* `PyList_Append` real-layout branch — `Py_INCREF(item)`;
* `PyList_Insert` real-layout branch — the same;
* `to_real_tuple` — `Py_XNewRef` around the borrowed `PyTuple_GetItem` it copies.

`PyList_SetItem` / `PyTuple_SetItem` already document that they *steal*, which is
correct: the caller's own reference transfers to the container.

**Refcounts, not the mid-call guard, are what keep a wrapper alive.** Fact 1 says
the guard is best-effort and demonstrably fails; nothing in the counter can be
relied on. Every raw `PyObject*` the C side retains past the call that produced it
must therefore be covered by a count, and the fix restores that invariant for the
one place that broke it.

The elements of a real-layout container are now pinned for the life of the session,
because `_Py_Dealloc` is a no-op and such a container is never freed. That is the
retention that was already happening through the raw pointer; the incref only makes
it honest, and it is what stops `sweep` from reclaiming underneath C.

### Gates

Darwin arm64, 3.7.5: `run_tests.sh` **6022 run, 6022 passed, 0 failed, 0 errors**;
`check_python_fixtures.sh` 3543 OK / 35 XFAIL; full `run_cpython_suite.sh` then
`check_cpython_regressions.sh` — **0 regression(s), 0 improvement(s)** (tier 2, the
shim being shared machinery).

### Left alone, deliberately

`___betweenShimCalls` still answers `true` while a call is in flight once
`callDepth` has drifted negative. Restoring the guard properly needs an in-call
indicator that cannot drift, and the obvious cross-check — "answer false when the
stack is deeper than the recorded entry" — over-suppresses: `___noteShimEntry`
ratchets `shimEntryDepth` down to the shallowest shim call ever made on the
process, so almost any Python code is "deeper than" it and sweeping would stop
altogether. Recorded here rather than patched; the refcount invariant is what makes
it non-fatal.
