# CPython 3.14.4 Regression Suite Scoreboard — Grail

Status legend: OK (all pass) · FAIL (assertion failures) · ERROR (exceptions in tests) · SKIP (all skipped / none discovered) · IMPORTERROR (module/support import failed) · STERROR (uncatchable Smalltalk error escaped) · CRASH (topaz died, e.g. SIGSEGV) · TIMEOUT.

This is a measurement harness over a curated starter set, not the full
~480-module suite. See scripts/cpython_suite_manifest.txt and
scripts/run_cpython_suite.sh. Per-module logs: out/cpython/<module>.out.

Run timestamp and aggregate totals are intentionally NOT committed here:
they change on every run and would collide across concurrent sessions
even when the sessions edit different modules.  Find them in
out/cpython/scoreboard.json (gitignored) or this script's stdout summary.
Only the per-test rows below are committed, so unrelated work touches
different rows and merges cleanly.

| Module | Status | tests | fail | err | skip | detail |
|--------|--------|------:|-----:|----:|-----:|--------|
| test.test_textwrap | OK | 68 | 0 | 0 | 0 |  |
| test.test_math | OK | 88 | 0 | 0 | 4 |  |
| test.test_int | OK | 52 | 0 | 0 | 17 |  |
| test.test_float | OK | 54 | 0 | 0 | 3 |  |
| test.test_heapq | OK | 68 | 0 | 0 | 1 |  |
| test.test_bisect | OK | 46 | 0 | 0 | 0 |  |
| test.test_operator | OK | 110 | 0 | 0 | 0 |  |
| test.test_fractions | OK | 50 | 0 | 0 | 0 |  |
| test.test_datetime | ERROR | 525 | 77 | 37 | 2 |  |
| test.test_re | OK | 165 | 0 | 0 | 28 |  |
| test.test_functools | ERROR | 325 | 18 | 19 | 6 |  |
| test.test_list | OK | 68 | 0 | 0 | 3 |  |
| test.test_tuple | OK | 38 | 0 | 0 | 6 |  |
| test.test_dict | OK | 120 | 0 | 0 | 20 |  |
| test.test_set | OK | 628 | 0 | 0 | 21 |  |
| test.test_bytes | OK | 316 | 0 | 0 | 22 |  |
| test.test_collections | OK | 101 | 0 | 0 | 41 |  |
| test.test_itertools | OK | 136 | 0 | 0 | 31 |  |
| test.test_enum | ERROR | 1077 | 71 | 27 | 1 |  |
| test.test_unary | OK | 6 | 0 | 0 | 0 |  |
| test.test_int_literal | OK | 6 | 0 | 0 | 0 |  |
| test.test_unpack | OK | 1 | 0 | 0 | 0 |  |
| test.test_augassign | OK | 7 | 0 | 0 | 0 |  |
| test.test_contains | OK | 4 | 0 | 0 | 0 |  |
| test.test_dictcomps | OK | 10 | 0 | 0 | 0 |  |
| test.test_setcomps | OK | 1 | 0 | 0 | 0 |  |
| test.test_pow | OK | 7 | 0 | 0 | 0 |  |
| test.test_richcmp | OK | 11 | 0 | 0 | 0 |  |
| test.test_slice | OK | 11 | 0 | 0 | 0 |  |
| test.test_bool | OK | 31 | 0 | 0 | 0 |  |
| test.test_iter | OK | 57 | 0 | 0 | 4 |  |
| test.test_traceback | IMPORTERROR | 0 | 0 | 0 | 0 | BoundMethod object has no attribute '__code__' |
| test.test_compare | OK | 16 | 0 | 0 | 0 |  |
| test.test_iterlen | OK | 22 | 0 | 0 | 0 |  |
| test.test_keywordonlyarg | OK | 11 | 0 | 0 | 0 |  |
| test.test_dictviews | OK | 16 | 0 | 0 | 0 |  |
| test.test_sort | OK | 21 | 0 | 0 | 2 |  |
| test.test_generator_stop | OK | 2 | 0 | 0 | 0 |  |
| test.test_userdict | OK | 28 | 0 | 0 | 0 |  |
| test.test_userlist | OK | 54 | 0 | 0 | 1 |  |
| test.test_isinstance | ERROR | 23 | 1 | 13 | 2 |  |
| test.test_index | OK | 55 | 0 | 0 | 0 |  |
| test.test_baseexception | ERROR | 11 | 1 | 7 | 0 |  |
| test.test_listcomps | ERROR | 60 | 8 | 23 | 0 | outermost-iterable scope fixed; remainder = NameAst/exec name-res, cells/super/__class__, frames, code objects |
| test.test_property | ERROR | 31 | 18 | 8 | 0 |  |
| test.test_copy | ERROR | 81 | 28 | 15 | 0 |  |
| test.test_scope | ERROR | 41 | 6 | 9 | 0 |  |
| test.test_yield_from | ERROR | 43 | 18 | 12 | 0 |  |
| test.test_deque | ERROR | 80 | 10 | 23 | 4 |  |
| test.test_format | ERROR | 18 | 10 | 3 | 3 |  |
