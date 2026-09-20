## Where we are (2026-09-08, after cuts 74-75) — and a census caveat

Same stone, same denominators as the board in `CENSUS.md` (1592 stdlib
top-level defs, 4621 class-body methods; `./install.sh` first, so the
denominator is the whole corpus and not a set of cache hits).

Of the stdlib's 1592 top-level defs **1564 (98.2%)** compile through IR (was
1551, 97.4%); of its 4621 class-body methods **4541 (98.3%)** are built through
the seam (was 4539, 98.2%); of ALL 6417 defs **95.1%** go through IR (was
94.9%).  **The `nestedDef:reservedName` row is GONE from both stdlib tables**
-- it was the 13 + 2 these two cuts retired -- and nothing took its place: the
new `nestedDef:leafNameCollision` / `LambdaAst:leafNameCollision` rows have no
occurrence in the corpus.

What refuses a stdlib top-level def now, in full: classes defined in a def (6),
the deliberately frame-sensitive calls (`globals` 4, `dir` 4, `vars` 3, `exec`
1), PEP 695 type parameters (2), complex literals (2), and one each of
`stmt:MatchAst`, `Comprehension:async`, `nestedDef:kwonly`, `nestedDef:flow`,
`NameAst:super`, `AugAssignAst:target-NameAst`.  Class methods: method-local
classes (35), a rebound receiver (10, all `_pydecimal`), then the
frame-sensitive calls and single digits.  Coverage work is now
method-local classes and nothing else; the rest is frame-sensitive by design.

**The caveat, and it is why `CENSUS.md` was NOT regenerated.**  The report
script writes the WHOLE board from two corpora, and the corpus-2 scripts
(`census_tests_00..02.tpz`) **are not in the repository** -- `git ls-files
experiments/ir/` lists `census_stdlib.tpz` and nothing else, and no worktree on
this machine has them.  Re-splitting the 103-module manifest into three
sessions by hand would not reproduce the committed numbers even with no code
change: the report SUMS `byModule` across session files, so a stdlib module
pulled in by two sessions is counted twice, and a different split moves the
corpus-2 totals for reasons that have nothing to do with the cut.  Running
`census_report.py` with only corpus 1 present would overwrite the corpus-2
section outright.  So the stdlib half above was measured and is reported here;
`CENSUS.md`'s corpus-1 table is stale by exactly the `nestedDef:reservedName`
rows, and its corpus-2 table by `nestedDef:reservedName` (3 top-level, 4 class
methods) and `LambdaAst:reservedName` (1).  **Committing the three missing
scripts is the fix**, and whoever writes them should record the split they
used, since the board is only comparable across runs that share it.
