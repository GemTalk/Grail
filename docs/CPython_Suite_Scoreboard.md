# CPython 3.14.4 Regression Suite Scoreboard — Grail

Generated: 2026-07-22T19:14:24Z  ·  GemStone: GemStone64Bit3.7.5-arm64.Darwin

**Modules: 19** — OK 6 · FAIL 0 · ERROR 10 · SKIP 2 · IMPORTERROR 1 · STERROR 0 · CRASH 0 · TIMEOUT 0

**Totals:** tests=3134 failures=523 errors=366 skipped=93

Status legend: OK (all pass) · FAIL (assertion failures) · ERROR (exceptions in tests) · SKIP (all skipped / none discovered) · IMPORTERROR (module/support import failed) · STERROR (uncatchable Smalltalk error escaped) · CRASH (topaz died, e.g. SIGSEGV) · TIMEOUT.

This is a measurement harness over a curated starter set, not the full
~480-module suite. See scripts/cpython_suite_manifest.txt and
scripts/run_cpython_suite.sh. Per-module logs: out/cpython/<module>.out.

| Module | Status | tests | fail | err | skip | detail |
|--------|--------|------:|-----:|----:|-----:|--------|
| test.test_textwrap | OK | 68 | 0 | 0 | 0 |  |
| test.test_math | OK | 88 | 0 | 0 | 4 |  |
| test.test_int | ERROR | 52 | 11 | 14 | 10 |  |
| test.test_float | IMPORTERROR | 0 | 0 | 0 | 0 | codePoint 16rd8f0 is illegal for Unicode |
| test.test_heapq | ERROR | 68 | 5 | 8 | 0 |  |
| test.test_bisect | ERROR | 42 | 0 | 12 | 0 |  |
| test.test_operator | OK | 110 | 0 | 0 | 0 |  |
| test.test_fractions | OK | 49 | 0 | 0 | 0 |  |
| test.test_datetime | SKIP | 0 | 0 | 0 | 0 |  |
| test.test_re | ERROR | 165 | 30 | 30 | 3 |  |
| test.test_functools | ERROR | 325 | 93 | 83 | 2 |  |
| test.test_list | OK | 68 | 0 | 0 | 3 |  |
| test.test_tuple | OK | 38 | 0 | 0 | 6 |  |
| test.test_dict | ERROR | 120 | 14 | 5 | 23 |  |
| test.test_set | ERROR | 628 | 12 | 1 | 28 |  |
| test.test_bytes | SKIP | 0 | 0 | 0 | 0 | a SkipTest occurred (error 2702) |
| test.test_collections | ERROR | 101 | 39 | 35 | 4 |  |
| test.test_itertools | ERROR | 135 | 32 | 42 | 10 |  |
| test.test_enum | ERROR | 1077 | 287 | 136 | 0 |  |
