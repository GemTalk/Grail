# CPython 3.14.4 Regression Suite Scoreboard — Grail

Generated: 2026-07-25T01:35:13Z  ·  GemStone: GemStone64Bit4.0.0-arm64.Darwin

**Modules: 21** — OK 13 · FAIL 0 · ERROR 8 · SKIP 0 · IMPORTERROR 0 · STERROR 0 · CRASH 0 · TIMEOUT 0

**Totals:** tests=3743 failures=500 errors=320 skipped=200

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
| test.test_datetime | ERROR | 111 | 32 | 29 | 0 | 50 pass; Grail-trimmed subset (core + TestDateOnly/TestDate) vs native datetime |
| test.test_datetime_datetime | ERROR | 92 | 31 | 36 | 0 | 25 pass; TestDateTime split out (compile budget) |
| test.test_datetime_time | ERROR | 30 | 12 | 8 | 0 | 10 pass; TestTime split out (compile budget) |
| test.test_re | OK | 165 | 0 | 0 | 28 |  |
| test.test_functools | ERROR | 325 | 93 | 83 | 2 |  |
| test.test_list | OK | 68 | 0 | 0 | 3 |  |
| test.test_tuple | OK | 38 | 0 | 0 | 6 |  |
| test.test_dict | ERROR | 120 | 1 | 1 | 20 |  |
| test.test_set | ERROR | 628 | 12 | 1 | 28 |  |
| test.test_bytes | ERROR | 316 | 52 | 43 | 16 |  |
| test.test_collections | OK | 101 | 0 | 0 | 41 |  |
| test.test_itertools | OK | 136 | 0 | 0 | 31 |  |
| test.test_enum | ERROR | 1077 | 267 | 119 | 0 |  |
