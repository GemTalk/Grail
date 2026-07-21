# CPython 3.14.4 Regression Suite Scoreboard — Grail

Generated: 2026-07-21T01:45:04Z  ·  GemStone: GemStone64Bit3.7.5-arm64.Darwin

**Modules: 19** — OK 4 · FAIL 0 · ERROR 11 · SKIP 2 · IMPORTERROR 2 · STERROR 0 · CRASH 0 · TIMEOUT 0

**Totals:** tests=3082 failures=684 errors=443 skipped=12

Status legend: OK (all pass) · FAIL (assertion failures) · ERROR (exceptions in tests) · SKIP (all skipped / none discovered) · IMPORTERROR (module/support import failed) · STERROR (uncatchable Smalltalk error escaped) · CRASH (topaz died, e.g. SIGSEGV) · TIMEOUT.

This is a measurement harness over a curated starter set, not the full
~480-module suite. See scripts/cpython_suite_manifest.txt and
scripts/run_cpython_suite.sh. Per-module logs: out/cpython/<module>.out.

| Module | Status | tests | fail | err | skip | detail |
|--------|--------|------:|-----:|----:|-----:|--------|
| test.test_textwrap | OK | 68 | 0 | 0 | 0 |  |
| test.test_math | OK | 88 | 0 | 0 | 2 |  |
| test.test_int | IMPORTERROR | 0 | 0 | 0 | 0 | codePoint 16rd800 is illegal for Unicode |
| test.test_float | IMPORTERROR | 0 | 0 | 0 | 0 | codePoint 16rd8f0 is illegal for Unicode |
| test.test_heapq | ERROR | 68 | 5 | 8 | 0 |  |
| test.test_bisect | ERROR | 42 | 0 | 12 | 0 |  |
| test.test_operator | OK | 110 | 0 | 0 | 0 |  |
| test.test_fractions | OK | 49 | 0 | 0 | 0 |  |
| test.test_datetime | SKIP | 0 | 0 | 0 | 0 |  |
| test.test_re | ERROR | 165 | 30 | 31 | 3 |  |
| test.test_functools | ERROR | 325 | 93 | 84 | 0 |  |
| test.test_list | ERROR | 68 | 3 | 5 | 2 |  |
| test.test_tuple | ERROR | 38 | 7 | 4 | 0 |  |
| test.test_dict | ERROR | 120 | 34 | 21 | 1 |  |
| test.test_set | ERROR | 628 | 151 | 58 | 0 |  |
| test.test_bytes | SKIP | 0 | 0 | 0 | 0 | a SkipTest occurred (error 2702) |
| test.test_collections | ERROR | 101 | 38 | 39 | 1 |  |
| test.test_itertools | ERROR | 135 | 36 | 45 | 3 |  |
| test.test_enum | ERROR | 1077 | 287 | 136 | 0 |  |
