# Investigating the `code_methods` SIGSEGV on GemStone 4.0

## SETTLED — 2026-09-09. Cause found, reproduced, one-line fix identified.

This was handed off to be run on a real Linux x86_64 host with a 4.0 stone.
That has now happened (`pitcairn`, `snapshots/main`, stone `gs64stone40`,
4.0.0 build `28f41d4cc9`, `GEM_NATIVE_CODE_ENABLED=2`). **Read
[ISSUE.md](ISSUE.md) — it is the finished write-up, ready to file.** This file
is now just the trail.

**The cause.** `methodLookupCacheAtPut`'s grow path re-inserts into the wrong
cache: it reloads `*cacheH` from `(*clsH)->methodLookupCache()`, hardwired to
`class_lookup_cache_ofs`, instead of `lookupCache(cacheWordOfs)`
(`ommethlookup.m4:304`). A grow of a class's **understands** cache therefore
lands a `GsNMethod` in its **dispatch** cache; a later cold send casts it to
`NatCodeObjSType*` and jumps into the object, which lives in a
`PROT_READ|PROT_WRITE` region. Hence `si_code 2` / `err 0x15` on an instruction
fetch. The grow-path theory in [ANALYSIS-cache-fix.md](ANALYSIS-cache-fix.md)
was right about the mechanism.

**Reproduce it in one command** (Grail-free, ~20s, 3/3 deterministic):

```bash
python3 nc-repro/nc_repro3_gen.py > /tmp/v3.tpz
topaz -l -I .topazini -S /tmp/v3.tpz
```

**The fix**, plus a second defect that was hiding it (the collision-based grow
trigger is dead code, because `tableSize` is unpacked without masking off the
packed collision count) — both in [ISSUE.md](ISSUE.md).

## What the earlier notes got wrong, and what that cost

Kept because the mistakes are instructive, not to re-litigate them.

* **The W^X-race diagnosis was wrong**, and the correction to "a jump into a
  GsNMethod, not a permission race" was right. `info proc mappings` at the fault
  was never needed; `protFlags` on the two `code_gen` regions answers it
  statically (`.meths` = 3, `.nCode` = 7).
* **An assert build was listed as priority 1. It was not needed.** The shipped
  `libgcilnk-4.0.0-64.so` carries `debug_info` and is not stripped, and the m4
  line numbers map 1:1 onto `src/ommethlookup.m4`, so a release build can be
  instrumented directly with gdb. See [grow_path.gdb](grow_path.gdb). Check what
  the product already gives you before planning a build.
* **The suggested repro shape would not have fired.** The notes proposed
  hammering `respondsTo:` with "hundreds of distinct missing selectors" to force
  `numCollisions > tableSize/2`. That threshold is unreachable — see the mask
  bug — so no number of collisions grows the cache. Only `isLargeRoot()` does,
  which needs thousands of entries. Missing selectors are also the wrong choice:
  they cache DNU markers (SmallInteger 0), and a SmallInteger re-inserted into
  the dispatch cache is handled safely. It is the **found** methods that poison.
* **Three false negatives came from probes that silently did nothing**, which is
  exactly the trap the earlier notes warned about — and warning about it was not
  enough to avoid it. In order: `perform:` never populates the dispatch cache
  (nothing to poison); a breakpoint on `ommethlookup.c:161` resolved to a bogus
  address because that line "contains no code" in an optimised build, so a
  poison-detector reported zero while measuring nothing; and a hand-computed
  call-site offset (`+643`) was not the grow call, so a re-insert probe logged
  nothing. Every "clean" result here needs a positive control before it means
  anything — the one that finally worked was checking that a *known-hot*
  breakpoint on the same line was hit at all.

## Files here

| path | what |
|---|---|
| [ISSUE.md](ISSUE.md) | **the finished write-up to file with the GemStone team** |
| [ANALYSIS-cache-fix.md](ANALYSIS-cache-fix.md) | the source derivation that got the mechanism right |
| [nc_repro3_gen.py](nc_repro3_gen.py) | deterministic Grail-free repro |
| [grow_path.gdb](grow_path.gdb) | grow-path instrumentation for a release build |
| [dumps/](dumps/) | the three CI crash dumps |
| `../scripts/nc_repro.sh` | v1 (arena churn) — ran 1.8M cycles clean; targets the wrong mechanism |
| `../scripts/nc_repro2_gen.py` | v2 (arena growth, env 1) — superseded, never needed |
| `../.github/workflows/nc-repro.yml` | the CI probe; not for merge |

Branch `ci/nc-repro-probe` is a throwaway. The two files worth keeping are
`ISSUE.md` and `nc_repro3_gen.py`.
