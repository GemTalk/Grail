# Understands-cache grow re-inserts into the dispatch cache, so a later send jumps into a GsNMethod (4.0, native code)

**Status: CONFIRMED and reproduced deterministically, with a Grail-free probe,
on real Linux x86_64.** Cause read from source, verified in a live gem under
gdb, and linked to the faulting address in a single run. Everything below is
measured on this build unless marked as inference.

```
GemStone/S 64 Bit
4.0.0 Build: 2026-09-08T19:14:17-07:00 28f41d4cc9f83190829d4fabdc63c3604a2bb60a
Linux x86_64 (real silicon, not emulated), GEM_NATIVE_CODE_ENABLED = 2
```

The one-line fix is at the end.

## Summary

`methodLookupCacheAtPut`'s grow path writes to the wrong cache. It reloads the
dictionary it is about to insert into via `(*clsH)->methodLookupCache()`, which
is hardwired to `class_lookup_cache_ofs` (`omobj.hf:2352`), instead of
`lookupCache(cacheWordOfs)` — the offset the function was called with and
loaded at entry (`ommethlookup.m4:249`):

```c
      newMethodLookupCache(omPtr, cacheWordOfs, clsH, primesIdx);  // correct cache
      *cacheH = (*clsH)->methodLookupCache();                      // hardwired to dispatch
      UTL_GUARANTEE(! (*cacheH)->isLargeRoot() );
      KeyValueDictMethDictAtPut(omPtr, cacheH, keyH, valH, &sizesOut);
```
`ommethlookup.m4:303-306`

So when a class's **understands** cache grows, the pair that triggered the grow
is re-inserted into that class's **dispatch** cache. The two caches hold
different value types, as the function's own asserts state
(`ommethlookup.m4:262-272`): the dispatch cache holds `GsNativeCode` when
native code is supported, the understands cache holds `GsNMethod`. The value
therefore arrives in the dispatch cache as a **`GsNMethod`**.

Nothing catches it. The type asserts run at the top of the function with the
*correct* `cacheWordOfs` and pass; the grow path then calls
`KeyValueDictMethDictAtPut` directly and bypasses them.

On the next send of that selector to that class from a cold send site,
`om::methodLookup` and the send-cache update paths treat any value above
`OOP_Two` as loaded native code (`ommethlookup.m4:385-386`):

```c
  if (methPtr > OOP_Two) {
    return (NatCodeObjSType*)methPtr;
  }
```

and control transfers into a `GsNMethod` object. `methodLookupPolyUpdate`
(`:686`) and `methodLookupPolyoverflow` (`:622`) — the paths a compiled send
site actually reaches — cast the same way.

The object regions carry the permissions that make this a SIGSEGV rather than
silent corruption. Read live from the running gem:

```
(gdb) print omPtr->code_gen.methods.meths.memory
$1 = {_start = 0x7ffff2d84000, _allocated_limit = 0x7ffff2db4000, ..., protFlags = 3}
(gdb) print omPtr->code_gen.methods.nCode.memory
$2 = {_start = 0x7ffff36b4000, _allocated_limit = 0x7ffff3704000, ..., protFlags = 7}
```

`.meths` (the `GsNMethod` objects) is `protFlags 3` = `PROT_READ|PROT_WRITE`,
**not executable**; `.nCode` is `7` = RWX. An instruction fetch from `.meths`
is therefore a protection violation on a mapped page — exactly `si_code 2`
(`SEGV_ACCERR`) with `err 0x15` (P=1 present, I/D=1 instruction fetch).

## Why it is rare: the documented grow trigger is dead code

This is a second, independent defect, and it is why the crash shows up as a
~1% intermittent rather than constantly.

`keyvaluedict.c:1305` packs both numbers into one word:

```c
      uint64 sizesOut = (numCollisions << 32) | (tableSize & 0xFFFFFFFF);
```

`ommethlookup.m4:283-284` unpacks the collision count correctly but takes
`tableSize` **without masking off the high half**:

```c
    int64 numCollisions = sizesOut >> 32 ;
    int64 tableSize = sizesOut ;          // needs & 0xFFFFFFFF
```

so the intended test at `:290` — grow "if collisions > tableSize / 2" — is
compared against a threshold of order 1e11 and can never be true. Measured in a
live gem, inserting 4000 distinct selectors into one class's understands cache:

```
PUT sizesOut=0x3900000017 numCollisions=57  tableSize=244813135895  thresh=122406567947
PUT sizesOut=0x8900000017 numCollisions=137 tableSize=588410519575  thresh=294205259787
PUT sizesOut=0x17900000017 numCollisions=377 tableSize=1619202670615 thresh=809601335307
```

The real table size is the low half — `0x17` = 23 — and it never changes: 377
collisions in a 23-slot table, average chain length ~17, and no grow. The
collision-based grow never fires at all.

That leaves `else if ((*cacheH)->isLargeRoot()) goto GROW_LOOKUP_CACHE;`
(`:307-310`) as the only live route into the grow path — a much rarer condition,
which fits the observed intermittency. It also has a performance cost of its
own, independent of the crash: method lookup caches never grow on collisions, so
hot classes degrade to long chains in a 23-slot table.

Note also that `methodLookupCacheAt` asserts `UTL_ASSERT(! cache->isLargeRoot())`
at `:120`, on the very condition that is now the sole grow trigger.

## Reproduction

`nc_repro3_gen.py` (attached) — **no application code, pure kernel Smalltalk.**

```bash
python3 nc_repro3_gen.py > /tmp/v3.tpz
topaz -l -I .topazini -S /tmp/v3.tpz
```

Dies with SIGSEGV, `si_code 2`, `err 0x15`. **3 of 3 runs**, plus a 4th from the
committed generator. It creates one class with 4000 unary methods, sends them
all with real compiled sends to populate the dispatch cache, then for each group
of 100 calls `respondsTo:` (which caches successes — `Object>>respondsTo:`
passes flags `16r10000`) and immediately runs a cold driver method that sends
those same 100 selectors.

Three details are load-bearing; each one cost a false negative before we
measured rather than assumed:

1. **The understands cache must become a large root.** Because of the mask bug
   above, collisions never grow it. A few hundred selectors do nothing; 4000 is
   what reaches `isLargeRoot()`.
2. **The dispatch cache must already be populated**, or there is nothing to
   poison. `perform:` does not populate it — only real compiled sends do. A
   probe built on `perform:` alone runs clean.
3. **Every method must be compiled before the poisoning, and the reading sends
   must be cold.** Compiling anything afterwards bumps
   `selectorDeltasSerialNum`, and the next read resets the cache
   (`:135-141`), wiping the poison. Hence separate `warm` and `cold` driver
   method sets, both compiled up front.

**Causal control.** The identical probe with only the `respondsTo:` calls
removed — same 4000 methods, same 80 driver methods, same 8000 compiled sends —
**exits 0 with no SIGSEGV**. The understands cache is the trigger.

## Direct evidence, one run

`grow_path.gdb` (attached) instruments the release build; `libgcilnk` ships with
`debug_info`, so no assert build is needed.

**The grow re-inserts into the dispatch cache.** Every grow, tagged with the
cache offset it was called with, and the dictionary the re-insert actually
targeted. Roles are derived within the same run from which offset each
dictionary is used with on the normal insert path:

```
GROW cwo=0: orig=0x7fffecfd59a8 roles=[0] -> reinserted into 0x7fffed00ca88 roles=[0]
GROW cwo=0: orig=0x7fffed00ca88 roles=[0] -> reinserted into 0x7fffed032b88 roles=[0]
GROW cwo=1: orig=0x7fffed0ac418 roles=[1] -> reinserted into 0x7fffed09be78 roles=[0]  ** WRONG CACHE **
GROW cwo=1: orig=0x7fffed0d6668 roles=[1] -> reinserted into 0x7fffed09be78 roles=[0]  ** WRONG CACHE **
GROW cwo=1: orig=0x7fffed0ec638 roles=[1] -> reinserted into 0x7fffed09be78 roles=[0]  ** WRONG CACHE **
GROW cwo=1: orig=0x7fffed102608 roles=[1] -> reinserted into 0x7fffed09be78 roles=[0]  ** WRONG CACHE **
GROW cwo=1: orig=0x7fffed1185d8 roles=[1] -> reinserted into 0x7fffed09be78 roles=[0]  ** WRONG CACHE **
```

`cwo=0` grows correctly target their own new dispatch cache. All five `cwo=1`
grows write into `0x7fffed09be78`, a dictionary used only ever as a dispatch
cache, and never into any of the six understands dictionaries — confirming the
hardwired `methodLookupCache()` reload.

**The faulting PC is the object that was re-inserted.** Same run, the last grow
re-insert and the fault:

```
GROWINSERT dict=0x7fffed0aa5e8 val=0x7ffff055b738
=== FAULT ===
rip=0x7ffff055b77d rax=0x7ffff055b760 rip_minus_rax=29
```

`rax` is the re-inserted `GsNMethod` + `0x28`, and `rip` is that object +
`0x45`. Execution jumped to an entry point computed from precisely the object
the grow had put in the dispatch cache.

That `rip - rax` of `0x1d` (29) matches the CI dumps exactly (`rip
0x7f94f99a88ed`, `rax 0x7f94f99a88d0`), which we had previously recorded as
consistent-but-not-probative.

## Relationship to the CI crashes

Three CI occurrences on 4.0, three branches, never on 3.7.5:

| date | run | shard | module being imported | GsNMethod oop at PC |
|---|---|---|---|---|
| 2026-09-07 | 34170511536 | 3 | `str_surrogate_protocol` | 45748481 |
| 2026-09-08 | 34289724169 | 0 | `subscript_typeerror` | 45747457 |
| 2026-09-09 | 34304829671 | 0 | `subscript_typeerror` | 45261825 |

The probe matches every element of the fault decode:

| field | CI dumps | probe |
|---|---|---|
| `si_code` | `2` (`SEGV_ACCERR`) | `2` |
| `err` | `0x15` | `0x15` |
| `trapno` | `0xe` | `0xe` |
| `rip == si_addr == cr2` | yes | yes |
| `rip - rax` | `0x1d` | `0x1d` |

**One honest difference.** The CI dumps report the PC in
`code_gen.methods.meths`; the probe reports `old_gen`. Both are jumps into a
`GsNMethod` object in a non-executable region, but in the probe the method
object is newly created and still in `old_gen`, whereas the CI methods had been
loaded into `code_gen`. The residence of the victim object differs; the
mechanism and the fault decode do not.

Why 4.0 only: these caches arrived with `822ff08b9`. Why during module import:
that path does heavy `respondsTo:`-style probing with many distinct selectors
against module and class objects, which is what fills an understands cache.

Not to be confused with the cached-DNU lookup crash (`si_code 1`,
`si_addr 0x12`, in the lookup primitives), which is a different fault.

## Fix

```diff
-      *cacheH = (*clsH)->methodLookupCache();
+      *cacheH = (*clsH)->lookupCache(cacheWordOfs);
```
`ommethlookup.m4:304`

Independent of `ca85915bfa`, which closed the two cross-cache DNU paths in
`FOUND_IN_OTHER_CACHE` and never touched the grow path.

Worth fixing at the same time, separately, since it is what has been hiding the
above and carries its own performance cost:

```diff
-    int64 tableSize = sizesOut ;
+    int64 tableSize = sizesOut & 0xFFFFFFFF ;
```
`ommethlookup.m4:284`

Note these interact: masking `tableSize` makes the collision-based grow live
again for the first time, which will exercise the grow path far more often. The
`:304` fix should land first or together, not after.

Two smaller notes, not live bugs:

* The doc comment at `:244-246` says cache values "are always GsNativeCode or
  GsNMethod", with no mention of the cached-DNU SmallIntegers the function has
  handled for some time.
* In the understands branch at `:911-916`, `OOP_IS_POM` is evaluated before the
  SmallInt test. `OOP_IS_POM(oop)` is `(oop & 0x1) != 0` and SmallInt OOPs are
  even, so `LocateObj` is never reached with a marker today — safe incidentally,
  through tag parity, and it would break if the tests were reordered.

## Attachments

| file | what |
|---|---|
| `nc_repro3_gen.py` | the deterministic Grail-free repro generator |
| `grow_path.gdb` | grow-path instrumentation for a release build |
| `dumps/` | the three CI crash dumps |
