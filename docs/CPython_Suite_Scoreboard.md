# CPython 3.14.4 Regression Suite Scoreboard — Grail

Generated: 2026-07-31T11:29:04Z  ·  GemStone: GemStone64Bit4.0.0-arm64.Darwin

**Modules: 31** — OK 20 · FAIL 1 · ERROR 10 · SKIP 0 · IMPORTERROR 0 · STERROR 0 · CRASH 0 · TIMEOUT 0

**Totals:** tests=4188 failures=400 errors=240 skipped=207

Status legend: OK (all pass) · FAIL (assertion failures) · ERROR (exceptions in tests) · SKIP (all skipped / none discovered) · IMPORTERROR (module/support import failed) · STERROR (uncatchable Smalltalk error escaped) · CRASH (topaz died, e.g. SIGSEGV) · TIMEOUT.

This is a measurement harness over a curated starter set, not the full
~480-module suite. See scripts/cpython_suite_manifest.txt and
scripts/run_cpython_suite.sh. Per-module logs: out/cpython/<module>.out.

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
| test.test_datetime | ERROR | 525 | 75 | 43 | 2 |  |
| test.test_re | OK | 165 | 0 | 0 | 28 |  |
| test.test_functools | ERROR | 325 | 73 | 58 | 6 |  |
| test.test_list | OK | 68 | 0 | 0 | 3 |  |
| test.test_tuple | OK | 38 | 0 | 0 | 6 |  |
| test.test_dict | OK | 120 | 0 | 0 | 20 |  |
| test.test_set | OK | 628 | 0 | 0 | 21 |  |
| test.test_bytes | OK | 316 | 0 | 0 | 22 |  |
| test.test_collections | OK | 101 | 0 | 0 | 41 |  |
| test.test_itertools | OK | 136 | 0 | 0 | 31 |  |
| test.test_enum | ERROR | 1077 | 235 | 103 | 1 |  |
| test.test_unary | OK | 6 | 0 | 0 | 0 |  |
| test.test_int_literal | OK | 6 | 0 | 0 | 0 |  |
| test.test_unpack | OK | 1 | 0 | 0 | 0 |  |
| test.test_augassign | OK | 7 | 0 | 0 | 0 |  |
| test.test_contains | OK | 4 | 0 | 0 | 0 |  |
| test.test_dictcomps | ERROR | 10 | 0 | 1 | 0 |  |
| test.test_setcomps | ERROR | 1 | 0 | 1 | 0 |  |
| test.test_pow | ERROR | 7 | 0 | 2 | 0 |  |
| test.test_richcmp | ERROR | 11 | 1 | 2 | 0 |  |
| test.test_slice | ERROR | 11 | 2 | 2 | 0 |  |
| test.test_bool | ERROR | 31 | 8 | 5 | 0 |  |
| test.test_iter | ERROR | 58 | 4 | 23 | 1 |  |
