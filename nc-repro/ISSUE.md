# SIGSEGV in code_methods: instruction fetch on a present-but-not-executable code page (4.0, Linux x86_64, native code)

## Summary

On GemStone/S 64 Bit **4.0.0** (Linux x86_64, `GEM_NATIVE_CODE_ENABLED=2`), a gem
intermittently dies with

```
SIGSEGV in object memory area: code_methods
```

The fault is **not** a wild jump and **not** a corrupt pointer. The faulting
address is a valid, identifiable compiled method, and the CPU fault code says
the page is *mapped* but *not executable* at the moment of the instruction
fetch. GemStone's own dump resolves it:

```
Program Counter is in code_methods
0x7f94f99a88ed in code_gen.methods.meths
0x7f94f99a88ed is in GsNMethod oop 45747457
```

## Decoding the fault (this is the substance of the report)

Identical in all three captures:

| field | value | meaning |
|---|---|---|
| `si_code` | `2` | `SEGV_ACCERR` — memory is **mapped**, permissions are wrong (not `SEGV_MAPERR`) |
| `err` | `0x15` = `0b10101` | see bits below |

`err` bit by bit (x86-64 page-fault error code):

| bit | name | value | meaning |
|---|---|---|---|
| 0 | P | 1 | page is **PRESENT** — a protection violation, not a missing page |
| 1 | W/R | 0 | not a write |
| 2 | U/S | 1 | user mode |
| 3 | RSVD | 0 | — |
| 4 | I/D | 1 | **INSTRUCTION FETCH** |

So: **a user-mode instruction fetch from a page that is present but lacks
execute permission.** `rip == si_addr == cr2` in every capture, confirming the
fault is the fetch itself rather than a data access.

That is the signature of a code page left in a non-executable state — the
classic W^X hazard for a code cache that must make pages writable to emit into
them and executable to run them.

## Occurrences

Three, on three different branches, all in CI, all `test-main` (4.0):

| date | run | shard | module being imported | GsNMethod oop at PC |
|---|---|---|---|---|
| 2026-09-07 | 34170511536 | 3 | `str_surrogate_protocol` | 45748481 |
| 2026-09-08 | 34289724169 | 0 | `subscript_typeerror` | 45747457 |
| 2026-09-09 | 34304829671 | 0 | `subscript_typeerror` | 45261825 |

Two of the three faulting methods (`45747457`, `45748481`) are **1024 apart** —
neighbours in the arena, consistent with one page being toggled while live
methods sit on it.

## What was happening at the time

All three fault while a freshly compiled method is entered for the first time,
during module import, with `#__name__` on the stack. The relevant detail for
the VM: **new methods are being compiled and native-coded, and control enters
that newly generated code immediately.** `GEM_NATIVE_CODE_ENABLED=2` documents
generation "for methods as they are loaded for execution", so there is no
warm-up threshold — first entry is into just-generated code.

The stack also carries `doits_nCode` frames while the PC is in `code_methods`,
so execution is crossing between the two code arenas.

## Ruled out

* **Not the application's C code.** The full stack is 39 `methods_nCode` + 4
  `doits_nCode` frames — zero user-action, callout, or non-nCode return
  addresses. The application's C sources contain no `mprotect`, `mmap`,
  `munmap`, or `madvise` at all, and those are the only calls that can remove
  execute permission from a page. (It does call `dlopen(RTLD_NOW|RTLD_GLOBAL)`
  to load extension modules, but that maps *new* regions; it does not re-protect
  GemStone's arena — and neither crashing test imports such a module.)
* **Not 3.7.5.** The identical workload, same host, same C library, runs on
  3.7.5 in the same CI matrix: zero occurrences in the same 60-run window.
* **Not the cached-DNU lookup crash** fixed on `fix-cached-understands-lookup-dnu`.
  That one is `si_code 1` (`SEGV_MAPERR`) with `si_addr 0x12` in the lookup
  primitives. This is `si_code 2`, `err 0x15`, in generated code. Different
  fault entirely.

## Reproduction

Attached: `nc_repro.sh` — self-contained, **no application code required**.

```bash
export GEMSTONE=/path/to/product
./nc_repro.sh <stoneName> [blocks] [perBlock] [passes]
```

It drives the same shape: thousands of doits (each compiled, native-coded into
`code_doits`, executed once, discarded), each compiling a method (native code
into `code_methods`) and calling it immediately. A deliberately small selector
pool forces constant recompilation, so native code is freed and its pages
reused. It prints `version.txt`, the native-code setting and `uname`, then loops
and reports `*** REPRODUCED` with the dump excerpt if it hits.

**Honest status: this script has NOT yet reproduced the fault.** 100,000
compile+call cycles ran clean. But that was in a `linux/amd64` container on
Apple Silicon, where the x86_64 binary runs under translation and code pages are
managed by the translator — so the test is close to meaningless for a page-
protection bug. It needs a **real Linux x86_64 host**, which is where all three
CI occurrences happened. The script is a targeted starting point, not a proven
recipe.

### Under gdb

`topaz -l` is a linked session, so the VM is in-process:

```
gdb --args topaz -l -i
(gdb) run < /tmp/nc_repro.tpz
```

### The single most decisive datum, and it is cheap

At the moment of the fault, dump the actual page permissions:

```
(gdb) info proc mappings          # or: shell cat /proc/<pid>/maps
```

and find the line covering `$rip`. **If it reads `rw-p` rather than `r-xp`, the
diagnosis is confirmed outright** and the remaining work is finding which path
left it that way. This is worth capturing before anything else, because by the
time the SIGSEGV arrives the interesting window has already closed.

A watchpoint or catchpoint on `mprotect` calls covering the `code_methods`
arena range would then show the toggling sequence directly.

## On a slow (assert-enabled, unoptimised) build

Worth doing, with one caveat:

* **Likely to help.** If this is a missing or mis-ordered "restore
  `PROT_EXEC`" on some path, that is an *ordering* bug, not a timing one — a
  slow build should hit it just as readily, and any assert guarding arena
  protection state would fire at the point of the mistake rather than at the
  much later fetch. There is precedent in this codebase: the cached-DNU crash
  was bounded only by a `UTL_ASSERT`, and adding a production guard that logged
  the offending values is what turned it from a crash into a diagnosis.
* **Caveat.** If it is genuinely a race, slowing everything down may widen or
  narrow the window unpredictably, and changed code layout and arena sizing may
  shift where pages get recycled. A null result on a slow build would therefore
  not clear the theory.
* On balance a classic multi-threaded data race looks unlikely here, since
  Smalltalk execution in a gem is single-threaded and green threads are
  cooperative. That argues for an ordering bug, which argues *for* the slow
  build.

Best value for effort, in order: (1) `/proc/<pid>/maps` at the fault, (2) an
`mprotect`-logging or assert build, (3) the slow build.

## Environment

```
GemStone/S 64 Bit
4.0.0 Build: 2026-09-07T10:31:08-07:00 7b57c58cc68f7690b4c191ada0d82eb1b6672860
Tue Sep  8 01:08:50 2026 (branch HEAD)
```

* Image: `container.gemtalksystems.com/gemstone/gemstone/main:grail`,
  digest `sha256:196cf84f260752f7de3ef11d588d0345dd210c8e98621a7e876c88fae6dfcae7`,
  built 2026-09-08T10:27:05Z
* Host: GitHub Actions `ubuntu-22.04`, x86_64, container `--shm-size=1g`
* `GEM_NATIVE_CODE_ENABLED = 2` (Linux x86_64 default)
* No `gdb` on the runners, so no C backtrace is available from the CI captures —
  `pstack` reports `Cannot find gdb in path`. Full `shard_*.out` dumps for all
  three occurrences are attached.

**Artifact retention is 7 days**, so the 2026-09-07 capture expires imminently;
the attached copies were taken before expiry.
