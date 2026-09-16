## The census is reproducible again — and corpus 2 was overstated

`census_tests_00..02.tpz` had never been committed. Only `census_stdlib.tpz`
was, and `census_report.py` writes the WHOLE board from both corpora, so nobody
could regenerate `CENSUS.md` without replacing its corpus-2 half with nothing.
The migration's own progress metric was unreproducible.

The three scripts now exist and **read `scripts/cpython_suite_manifest.txt` at
run time**, round-robin, so adding a module to the manifest needs no edit here
and no split has to be remembered. Three sessions because one cannot hold the
manifest: every module compiles itself and every stdlib module it imports, and
nothing is released.

**Fixing it exposed a real error in the committed numbers.** Each session
compiles the stdlib its own modules pull in, so a module reached from two shards
was measured in both, and the report SUMMED the session totals. Measured: of the
220 modules the test corpus touches, **83 are reached from more than one shard**,
and summing inflates the corpus **1.47x**. The report now builds its totals from
the per-module rows, taking each module once.

So corpus 2 moves, and it moves DOWN, because the duplicated modules were stdlib
(high IR coverage) and were over-weighting the average:

| corpus 2 | old board (summed) | now (deduplicated) |
| --- | ---: | ---: |
| top-level defs | 2809 | **1327** |
| class-body methods | 14132 | **10942** |
| class methods IR-eligible | 77.7% | **71.7%** |
| all defs through IR | 79.7% | **73.5%** |

Corpus 1 is unaffected (one session, nothing to deduplicate) and is confirmed
exactly by two independent measurements: 1592 top-level defs, 1564 compiled
(98.2%), 4621 class methods, 4541 eligible, 95.1% of all 6417 defs.

**Two controls, because a number that moves this much needs them.**

* The report asserts that the single-session corpus reconstructs exactly from
  its per-module rows. If importlib ever records a count without a module, or
  under a different key, the report stops rather than quietly reporting a wrong
  total.
* The claim that the split does not matter was checked by running a DIFFERENT
  one: a two-shard contiguous split against the three-shard round-robin. Ignoring
  the example column, the two boards are identical — 162 lines, zero differences.
  Row order is now sorted by (count, reason) so ties cannot drift either.

The example names beside each reason remain split-dependent, and the board now
says so: importlib keeps the first five it sees per reason per session, so which
five arrive depends on compile order. They illustrate a reason; they never
enumerate it.
