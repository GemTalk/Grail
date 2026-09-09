# Investigating the `code_methods` SIGSEGV on GemStone 4.0

**Read this first if you are a Claude Code session on a real Linux x86_64 host
with a GemStone 4.0 stone.** Everything here was prepared from a Mac, where the
one thing that matters — native code execution — cannot be tested. You are on
the only hardware that can settle this.

## READ THIS FIRST — the diagnosis changed (2026-09-09)

An earlier version of these notes said the fault was a **W^X race in the
native-code cache**. **That was wrong.** All three dumps say the PC was in
`code_gen.methods.meths` — the region holding `GsNMethod` *objects* — not
`code_gen.methods.nCode`, which holds executable native code
(`ominit.c:1033-1069` distinguishes them). The PC was in **data**, so this is a
jump into a GsNMethod, not a permission race on real code.

There is a known, still-unfixed bug on gemstone `main` that produces exactly
that: the cache grow path re-inserts into the wrong cache and lands a
`GsNMethod` in the dispatch cache, whose consumers cast it to
`NatCodeObjSType*` and jump. Full derivation with source citations in
[ANALYSIS-cache-fix.md](ANALYSIS-cache-fix.md).

**What this means for you:** priority 1 is no longer `info proc mappings`.
It is the assert build — `methodLookupCacheAt`'s `FLG_DEBUG` block
(`ommethlookup.m4:143-153`) asserts that a RAM value in the dispatch cache is a
`GsNativeCode`, and a poisoned entry fails it on the very next read, close to
the cause. The mappings check is still worth doing if you happen to catch a
fault, but it is now a cross-check rather than the main event.

## The bug in one paragraph

GemStone 4.0 on Linux x86_64 with `GEM_NATIVE_CODE_ENABLED=2` intermittently
dies with `SIGSEGV in object memory area: code_methods`. It is **not** a wild
jump: the faulting address is a valid, named compiled method, and the fault
codes say the page is *mapped* but *not executable* at the instant of the
instruction fetch. Three occurrences in CI (2026-09-07, -08, -09), on three
different branches, never on 3.7.5. Full analysis in [ISSUE.md](ISSUE.md);
raw dumps in [dumps/](dumps/).

The decode, which is the whole substance:

| field | value | meaning |
|---|---|---|
| `si_code` | `2` | `SEGV_ACCERR` — mapped, wrong permissions (not `SEGV_MAPERR`) |
| `err` | `0x15` = `0b10101` | P=1 page **present**, W=0 not a write, U=1 user mode, I/D=1 **instruction fetch** |

`rip == si_addr == cr2` in all three. So: a user-mode instruction fetch from a
present-but-non-executable page — and per the correction above, that page is in
`code_gen.methods.meths`, the **GsNMethod object** region. Control was
transferred into data.

## What you are trying to find out, in priority order

### 1. BUILD WITH ASSERTS — this is now the highest-value step

The poisoned dispatch-cache entry is caught by an existing assert, at the read,
close to the cause. `methodLookupCacheAt`'s `FLG_DEBUG` block
(`ommethlookup.m4:143-153`) asserts that a RAM value read from the dispatch
cache has `classPtr() == GsNativeCode()` when native code is supported. A
`GsNMethod` wrongly cached there fails that assert on the very next read — long
before any jump.

It will **not** fire at insert time: the grow path calls
`KeyValueDictMethDictAtPut` directly and bypasses the type asserts at the top of
`methodLookupCacheAtPut`. So expect it on a read, not a write.

This makes an assert build far more valuable than chasing the SIGSEGV, because
it converts an intermittent crash into a deterministic assertion with the
receiver class and selector in hand.

### 2. Instrument the grow path

Cheaper still, and it answers the question with or without a crash. Log every
time `methodLookupCacheAtPut` grows a cache with
`cacheWordOfs == class_understands_cache_ofs` (`ommethlookup.m4:295-306`),
printing the class and selector. If Grail's workload never grows an understands
cache, this theory is dead and you have saved everyone the hunt. If it does,
correlate the entries against crash times.

### 2b. Cross-check at the fault (only if you catch one)

```
(gdb) info proc mappings      # which region covers $rip
(gdb) p *(omObjSType*)$rip    # is the containing object a GsNMethod?
```

Confirming the object at `$rip` is a `GsNMethod` — rather than `GsNativeCode` —
nails it.

### 3. Try to reproduce

Two scripts, both **Grail-free** — the GemStone team will not look at anything
that needs the application.

```bash
export GEMSTONE=/path/to/product
./scripts/nc_repro.sh <stoneName> [blocks] [perBlock] [passes]
```

`nc_repro.sh` (v1) compiles a doit, compiles a method inside it, calls the
method immediately, in a tight loop with a small selector pool forcing
recompilation.

**v1 has already been run and did NOT reproduce**: 1.8M compile+call cycles
across 6 parallel CI jobs on real Linux x86_64, clean. Do not spend long
repeating it.

v2 exists because of what that null implies: raw compile+call volume is not the
driver. **Given the corrected diagnosis, note that neither v1 nor v2 targets the
real mechanism** — both grow the *code arena*, whereas the suspect is growth of
a class's **understands cache**, driven by `respondsTo:`-style probes with many
distinct selectors against one class. A better repro would hammer
`_respondsTo:` / `_whichClassIncludesSelector:` with hundreds of distinct
missing selectors on a single class to force `numCollisions > tableSize/2`, then
send one of those selectors normally. Treat v2 as superseded unless the
grow-path theory is disproved.

```bash
python3 scripts/nc_repro2_gen.py <stone> [classes] [methods] [stmts] [envId] > /tmp/v2.tpz
topaz -l -i < /tmp/v2.tpz
# defaults: 150 classes x 60 methods x 60 statements, environmentId 1
```

v2 differs from v1 in four ways, in order of suspicion: many classes with large
methods so the arena must grow; **environment 1**, matching Grail's session
methods; larger method bodies; and a class per unit rather than one shared
class. It ends with a re-entry phase that calls every method again after the
arena has grown.

### 4. If neither reproduces, amplify with Grail

The gating variable is almost certainly **first entries into freshly generated
native code**, not elapsed time or suite runs. `run_tests.sh` spends most of its
5½ minutes executing already-compiled tests. All three crashes happened during
**module import**.

So loop imports instead of suites. `importlib removeModule: 'name'` evicts a
module so the next import rebuilds it from source
(`src/smalltalk/Python/importlib.gs:2463`). A tight loop over the
`tests/python/` fixtures — `subscript_typeerror` and `str_surrogate_protocol`
are the two that actually crashed — concentrates the risky operation far more
densely than the suite does.

## Do not repeat my mistakes

* **The rate is ~1% per suite run, not 1 in 15.** 100 `ci.yml` runs over two
  days × 4 `test-main` jobs ≈ 400 job executions, 3 crashes. So **18 suite reps
  have only a ~17% chance of firing, and ~230 reps are needed for 90% power.**
  I sized a CI probe at 18 before working this out; it came back clean and
  proved nothing. Compute the power *before* running, and never read a null as
  absence.
* **Verify the instrument did the work.** I have twice been fooled by runs that
  looked clean because they had silently done nothing. Check block counters,
  suite totals, exit codes — not just "it passed".
* **Do not trust a container on Apple Silicon for this.** A `linux/amd64`
  container there runs under translation and code pages belong to the
  translator. That is why this is being handed to you.
* **Two different 4.0 crashes exist. Do not conflate them.** `si_addr 0x12` with
  `si_code 1` in the lookup primitives is the *cached-DNU* bug, fixed on branch
  `fix-cached-understands-lookup-dnu` (commit `2e94eb3efd`) — and **that fix is
  NOT on gemstone `origin/main`**, so the public 4.0.0 download still has it and
  crashes every SUnit shard. This bug is `si_code 2`, `err 0x15`, in generated
  code. Check `si_code` before assuming which one you have.

## Environment the crashes came from

```
GemStone/S 64 Bit
4.0.0 Build: 2026-09-07T10:31:08-07:00 7b57c58cc68f7690b4c191ada0d82eb1b6672860
```

Image `container.gemtalksystems.com/gemstone/gemstone/main:grail`,
digest `sha256:196cf84f260752f7de3ef11d588d0345dd210c8e98621a7e876c88fae6dfcae7`,
built 2026-09-08T10:27:05Z. `GEM_NATIVE_CODE_ENABLED = 2`.

**Confirm your host matches before drawing conclusions:**

```bash
cat $GEMSTONE/version.txt        # should be a build WITH the cached-DNU fix
uname -m                         # must be x86_64, and must be real silicon
```

## On a slow (assert-enabled) build

Worth building, with one caveat. If this is a missing or mis-ordered "restore
`PROT_EXEC`", that is an *ordering* bug and a slow build should hit it just as
readily, with any arena-protection assert firing at the mistake rather than at
the much later fetch. There is precedent: the cached-DNU crash was bounded only
by a `UTL_ASSERT`, and a production guard logging the offending values is what
turned it from a crash into a diagnosis. **But if it is genuinely a race, a slow
build may move the window either way, so a clean slow build would not clear the
theory.** A gem executes Smalltalk single-threaded with cooperative green
threads, which argues against a classic data race and therefore *for* the slow
build being effective.

## Files here

| path | what |
|---|---|
| [ISSUE.md](ISSUE.md) | the write-up to file with the GemStone team, ready to paste |
| [dumps/](dumps/) | all three CI crash dumps — GitHub artifacts expire after 7 days, these are the surviving copies |
| `../scripts/nc_repro.sh` | v1 repro (already run, did not reproduce) |
| `../scripts/nc_repro2_gen.py` | v2 generator (arena growth, env 1) — **not yet run anywhere** |
| `../.github/workflows/nc-repro.yml` | the CI probe, for reference; not for merge |

Branch `ci/nc-repro-probe` is a throwaway. Nothing here is meant to merge.
