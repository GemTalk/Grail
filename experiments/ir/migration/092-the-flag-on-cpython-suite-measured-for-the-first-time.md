## The flag-on CPYTHON SUITE, measured for the first time (2026-09-10)

**A green flag-on SUnit suite does not mean the IR path is ready to be the
default.**  The SUnit suite is now identical in both arms (above).  The 103-module
CPython conformance corpus is not, and it had never been run with the flag on.
Both arms, same tree (main at #906), same container, run back to back:

| | flag OFF | flag ON |
| --- | ---: | ---: |
| OK | 71 | **66** |
| FAIL | 3 | **6** |
| ERROR | 17 | **18** |
| SKIP | 1 | 1 |
| IMPORTERROR | 10 | 10 |
| CRASH | 0 | **1** |
| TIMEOUT | 1 | 1 |
| wall time | 939s | **1773s** |

THE IR PATH IS GENUINELY ACTIVE IN THAT RUN, which has to be established before
any of the numbers mean anything -- a corpus that silently fell back to text
would score exactly like flag-off and look like a pass.  Importing one real
stdlib module (`textwrap`) and reading the seam's own counters:

    flag on:   compiled=101  fallbacks=0
    flag off:  compiled=0    fallbacks=0

Eight modules differ.  Seven are worse, one is better:

| module | flag OFF | flag ON |
| --- | --- | --- |
| test.test_set | OK (630 tests) | **CRASH** |
| test.test_copy | OK | FAIL 4 |
| test.test_global | OK | ERROR 1 |
| test.test_traceback | OK | FAIL 1 |
| test.test_with | OK | FAIL 1 |
| test.test_codecs | ERROR 25f/52e | ERROR 26f/52e |
| test.test_funcattrs | ERROR 0f/1e | ERROR 1f/1e |
| test.test_contextlib_async | ERROR 6f/2e | ERROR 6f/**1e** |

`test.test_math` reads TIMEOUT in BOTH arms and is not IR: four modules at once
under x86_64 emulation, and run alone it reads `OK t=88` in 4m18s against the
600s limit.  It has done this in three separate runs.  Note also that
`check_cpython_regressions.sh` does not compare an OK/TIMEOUT transition and
reported `0 regressions` through every one of them -- the statuses have to be
diffed by hand.

**The crash is an OUT OF MEMORY, and it is the structural item.**
test.test_set dies with `VM temporary object memory is full, almost out of
memory, too many markSweeps since last successful scavenge`, with the old
generation full at `374783/374784Kold` and `47869Kdoits 68309KdoitsNcode` --
~116MB in doits and doit native code.  Taken with the 1.9x wall time, the IR
path costs substantially more memory and time per compiled def than the text
path, and on the heaviest module in the corpus that is fatal rather than slow.
Whatever the per-def cost is, it is not free, and nothing in the coverage census
measures it.

**The functional divergences, with their signatures.**  Two look like the same
class of bug as ForAst's tuple-target span, which is worth trying first for that
reason:

* `test_with` -- `AssertionError: 'self.Dummy()' != 'self.ExitRaises()'`.  A
  `with` statement blaming the wrong expression: a POSITION STAMP, the same
  shape as cut 84's ForAst fix.
* `test_traceback` -- one ExceptionGroup traceback renders differently.
* `test_global` -- `KeyError: 'name_caught_exc'`.
* `test_funcattrs` -- `NameError: name '__builtins__' is not defined`, plus
  `UnboundLocalError not raised`.  A scope/name issue, not a position one.
* `test_copy` -- four identical `AssertionError: 2 != 1`.
* `test_codecs` -- one additional failure among 26; not isolated.

So the readiness queue is: the memory/time cost first (it is the only one that
takes a whole module out), then the position stamps, then the name/scope pair.
Coverage is 93.9-95.8% of defs and is no longer the limiting factor.
