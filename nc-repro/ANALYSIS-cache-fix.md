# Analysis: `ca85915bfa` on main, and the grow-path bug it does not cover

Every claim below cites `src/…:line` at `origin/main`. Where something is
inference rather than something I read, it says so.

## 1. What `ca85915bfa` gets right

The regression from `822ff08b9` is that `fullMethodLookup` consults the *other*
cache before doing a real lookup, and the guard on those two cross-cache reads
is `methPtr > fullMeth_doNotUpdateLookupCache` (== 1) at
`ommethlookup.m4:799` and `:807`. A cached-DNU marker is a SmallInteger, so its
OOP is `(v << 3) | 2` (`gcioop.ht:117`) — `0x2` for SmallInt 0. That is greater
than 1, so the marker passes the guard and reaches `FOUND_IN_OTHER_CACHE`.

Allen's fix leaves the guards alone and handles the marker at the join point,
which is a reasonable design choice — one place to get right rather than two:

* **Lookup-cache branch** (`:895`): if `*methH` is a SmallInt, propagate the DNU
  into this cache and `return NULL`, before `LocateNativeMethodForExec` can
  touch it.
* **Understands branch** (`:915`): store, then `return NULL` instead of casting
  the SmallInt to `NatCodeObjSType*` and returning it.

Both crash paths are genuinely closed. Two further points in its favour:

* Propagating the DNU rather than discarding it is the better choice. The
  not-found path already caches DNUs the same way (`:880-881`), so this is
  consistent with existing behaviour and preserves the negative-caching benefit.
* Testing `OOP_IS_SMALL_INT` is **more robust than a magnitude guard**. The
  comment at `:99` says markers are "SmallInt 0..2"; `OOP_Two` is `0x12`, so a
  `> OOP_Two` guard covers 0..2 exactly and would silently fail if a marker
  value 3 were ever added. The tag test does not have that failure mode.

For completeness I checked the marker range: `methodLookupCacheAtPut` has four
call sites (`:881`, `:897`, `:906`, `:914`), only `:880` mints a marker, and it
mints `I32_TO_OOP(0)`. No other file writes these caches — every other
reference to `class_lookup_cache_ofs` / `class_understands_cache_ofs` outside
`ommethlookup.m4`/`omobj.hf` is a read or a `newMethodLookupCache`. **So the
only marker value in existence today is SmallInt 0**, and the "0..2" comment is
broader than the code.

## 2. What it does not cover: the grow path

`ca85915bfa` touches only `FOUND_IN_OTHER_CACHE`. It never goes near
`methodLookupCacheAtPut`, where this is still live at `ommethlookup.m4:303-306`:

```c
newMethodLookupCache(omPtr, cacheWordOfs, clsH, primesIdx);  // correct cache
*cacheH = (*clsH)->methodLookupCache();                      // hardwired
UTL_GUARANTEE(! (*cacheH)->isLargeRoot() );
KeyValueDictMethDictAtPut(omPtr, cacheH, keyH, valH, &sizesOut);
```

`methodLookupCache()` is `inline { return lookupCache(class_lookup_cache_ofs); }`
(`omobj.hf:2352`), whereas the same function loaded the cache at entry with
`lookupCache(cacheWordOfs)` (`ommethlookup.m4:249`).

So when the **understands** cache grows:

1. `newMethodLookupCache` correctly installs a fresh, larger *understands*
   cache;
2. `*cacheH` is then reloaded from the ***dispatch*** cache;
3. the re-insert puts the pair into the **dispatch** cache.

Two consequences. The first is benign: the grown understands cache is missing
the entry that triggered the grow — a cache miss, corrected by the next lookup.

**The second is not benign.** The two caches hold different value types, which
the code itself asserts (`ommethlookup.m4:263-270`):

| cache | value type |
|---|---|
| `class_lookup_cache_ofs` (dispatch) | `GsNativeCode` when `natCodeSupported()`, else `GsNMethod` |
| `class_understands_cache_ofs` | `GsNMethod` |

The value being re-inserted came from the understands cache, so it is a
**`GsNMethod` landing in the dispatch cache** on a native-code system.

Nothing catches it on the way in: the type asserts run at the top of
`methodLookupCacheAtPut` with the *correct* `cacheWordOfs` and pass, and the
grow path calls `KeyValueDictMethDictAtPut` directly, bypassing them.

On the next dispatch of that selector to that class, the poisoned entry is read
back and used as native code with no further checking:

* `methodLookupForExec` (`:385`): `if (methPtr > OOP_Two) return (NatCodeObjSType*)methPtr;`
* `methodLookupPolyUpdate` (`:672-686`): `meth = (NatCodeObjSType*)methPtr;`
* `methodLookupPolyoverflow` (`:607-620`): same

A `GsNMethod` is therefore used where `GsNativeCode` is expected, and control
transfers into it.

## 3. This appears to be the `code_methods` SIGSEGV we have been chasing

I previously diagnosed those crashes as a W^X race in the native-code cache.
**I now think that was wrong**, and the dumps say so in one word I did not read
carefully enough.

`om::printFaultInCodeGen` (`ominit.c:1033-1069`) distinguishes four regions:

```c
code_gen.methods.meths   ->  "%p in code_gen.methods.meths"
code_gen.doits.meths     ->  "%p in code_gen.doits.meths"
code_gen.methods.nCode   ->  "%p in code_gen.methods.nCode"
code_gen.doits.nCode     ->  "%p in code_gen.doits.nCode"
```

`.meths` holds `GsNMethod` **objects**; `.nCode` holds the **executable**
`GsNativeCode`. All three crash dumps in [dumps/](dumps/) say:

```
0x… in code_gen.methods.meths
0x… is in GsNMethod oop <n>
```

**`.meths`, not `.nCode`.** The program counter was inside the GsNMethod
*object* region — which is mapped but has no reason to be executable. That is
exactly `si_code 2` (`SEGV_ACCERR`) with `err 0x15` (P=1 present, I/D=1
instruction fetch): a jump into data, not a permission race on real code.

A jump into a `GsNMethod` is precisely what §2 produces. The full chain:

1. `_respondsTo:` / `understandsLookup` on a class populates its understands
   cache with `GsNMethod` values (`:404-427`).
2. Enough distinct selectors on that class → `numCollisions > tableSize/2`
   (`:289`) → `GROW_LOOKUP_CACHE`.
3. The grow re-inserts `(selectorId → GsNMethod)` into the **dispatch** cache.
4. A later ordinary send of that selector to that class hits the dispatch cache,
   casts the `GsNMethod` to `NatCodeObjSType*`, and jumps.
5. SIGSEGV, instruction fetch, in `code_gen.methods.meths`, inside a GsNMethod.

Every element of the observed signature is accounted for, including several I
could not explain before:

* **Why `.meths` rather than `.nCode`** — the jump target *is* a GsNMethod.
* **Why 4.0 only, never 3.7.5** — these caches arrived with `822ff08b9`.
* **Why during Python module import** — that path does heavy
  `respondsTo:`-style probing against module and class objects with many
  distinct selectors, which is what grows an understands cache.
* **Why intermittent** — it needs a grow event *and* a later real send of that
  same selector to that same class, within the cache's lifetime.
* **Why two faulting GsNMethod oops from different runs were 1024 apart** —
  neighbouring objects in `.meths`.
* **Why it survived `ca85915bfa`** — that fix never touched the grow path.

Registers are consistent though not probative: `rip 0x7f94f99a88ed`,
`rax 0x7f94f99a88d0` (rip − 0x1d), `r8 0x7f94f99a88a8` — an entry point computed
at a small offset from an object base.

**Confidence.** The mechanism is read from source and the region evidence is
strong, but I have not reproduced it. Three cheap confirmations, any one of
which would settle it:

1. **An assert build catches this at the read**, close to the cause. The
   `FLG_DEBUG` block in `methodLookupCacheAt` (`:143-153`) asserts that a RAM
   value read from the dispatch cache has `classPtr() == GsNativeCode()` when
   native code is supported. A poisoned entry fails that assert on the very next
   read. Note it will *not* fire at insert time, for the bypass reason above.
2. Log in the grow path when `cacheWordOfs == class_understands_cache_ofs`, and
   correlate with crashes.
3. At fault time under gdb, check whether the object containing `$rip` is a
   `GsNMethod` and whether the receiver class's dispatch cache holds it.

## 4. Minor robustness notes (not live bugs)

Stated as nits, having checked each:

* **`OOP_IS_POM` is evaluated before the SmallInt test** in the understands
  branch (`:911-916`). `OOP_IS_POM(oop)` is `(oop & 0x1) != 0` (`oop.ht:202`)
  and SmallInt OOPs are even, so `LocateObj` is never called on a marker today.
  It is safe *incidentally*, through tag parity, and would break if the tests
  were reordered.
* **The house idiom is belt-and-braces.** Both primitive entry points use
  `> OOP_Two` **and then** `OOP_IS_SMALL_INT` (`:385-390`, `:408-413`). The
  cross-cache guards now have only the tag test. Matching the entry-point idiom
  at `:799`/`:807` would cost nothing.
* **The doc comment on `methodLookupCacheAtPut` (`:244-246`)** still says values
  "are always GsNativeCode or GsNMethod" with no mention of cached DNUs, which
  the function has handled since before this fix.

## 5. Recommendation

The one-line grow-path fix is independent of everything `ca85915bfa` did and
does not conflict with it:

```c
-      *cacheH = (*clsH)->methodLookupCache();
+      *cacheH = (*clsH)->lookupCache(cacheWordOfs);
```

Branch `fix-cached-understands-lookup-dnu` also carries a *different* fix for
bug 1 (tightening the guards to `> OOP_Two`, which makes Allen's downstream
checks unreachable), so the branch **will not merge cleanly** and should not be
merged. A fresh one-line commit against main is the right vehicle.
