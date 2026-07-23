# CPython 3.14.4 Regression Suite Scoreboard — Grail

Generated: 2026-07-23T16:09:59Z  ·  GemStone: GemStone64Bit4.0.0-arm64.Darwin

**Modules: 19** — OK 8 · FAIL 0 · ERROR 7 · SKIP 2 · IMPORTERROR 2 · STERROR 0 · CRASH 0 · TIMEOUT 0

**Totals:** tests=3082 failures=507 errors=332 skipped=81

Status legend: OK (all pass) · FAIL (assertion failures) · ERROR (exceptions in tests) · SKIP (all skipped / none discovered) · IMPORTERROR (module/support import failed) · STERROR (uncatchable Smalltalk error escaped) · CRASH (topaz died, e.g. SIGSEGV) · TIMEOUT.

This is a measurement harness over a curated starter set, not the full
~480-module suite. See scripts/cpython_suite_manifest.txt and
scripts/run_cpython_suite.sh. Per-module logs: out/cpython/<module>.out.

| Module | Status | tests | fail | err | skip | detail |
|--------|--------|------:|-----:|----:|-----:|--------|
| test.test_textwrap | OK | 68 | 0 | 0 | 0 |  |
| test.test_math | OK | 88 | 0 | 0 | 4 |  |
| test.test_int | IMPORTERROR | 0 | 0 | 0 | 0 | codePoint 16rd800 is illegal for Unicode |
| test.test_float | IMPORTERROR | 0 | 0 | 0 | 0 | codePoint 16rd8f0 is illegal for Unicode |
| test.test_heapq | OK | 68 | 0 | 0 | 1 |  |
| test.test_bisect | OK | 42 | 0 | 0 | 0 |  |
| test.test_operator | OK | 110 | 0 | 0 | 0 |  |
| test.test_fractions | OK | 49 | 0 | 0 | 0 |  |
| test.test_datetime | SKIP | 0 | 0 | 0 | 0 |  |
| test.test_re | ERROR | 165 | 30 | 30 | 3 |  |
| test.test_functools | ERROR | 325 | 93 | 83 | 2 |  |
| test.test_list | OK | 68 | 0 | 0 | 3 |  |
| test.test_tuple | OK | 38 | 0 | 0 | 6 |  |
| test.test_dict | ERROR | 120 | 14 | 5 | 20 |  |
| test.test_set | ERROR | 628 | 12 | 1 | 28 |  |
| test.test_bytes | SKIP | 0 | 0 | 0 | 0 | a SkipTest occurred (error 2702) |
| test.test_collections | ERROR | 101 | 39 | 35 | 4 |  |
| test.test_itertools | ERROR | 135 | 32 | 42 | 10 |  |
| test.test_enum | ERROR | 1077 | 287 | 136 | 0 |  |
