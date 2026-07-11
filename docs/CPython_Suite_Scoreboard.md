# CPython 3.14.4 Regression Suite Scoreboard — Grail

Generated: 2026-07-11T20:00:17Z  ·  GemStone: GemStone64Bit3.7.5-arm64.Darwin

**Modules: 19** — OK 1 · FAIL 0 · ERROR 12 · SKIP 2 · IMPORTERROR 3 · STERROR 0 · CRASH 1 · TIMEOUT 0

**Totals:** tests=1703 failures=337 errors=472 skipped=5

Status legend: OK (all pass) · FAIL (assertion failures) · ERROR (exceptions in tests) · SKIP (all skipped / none discovered) · IMPORTERROR (module/support import failed) · STERROR (uncatchable Smalltalk error escaped) · CRASH (topaz died, e.g. SIGSEGV) · TIMEOUT.

This is a measurement harness over a curated starter set, not the full
~480-module suite. See scripts/cpython_suite_manifest.txt and
scripts/run_cpython_suite.sh. Per-module logs: out/cpython/<module>.out.

| Module | Status | tests | fail | err | skip | detail |
|--------|--------|------:|-----:|----:|-----:|--------|
| test.test_textwrap | OK | 68 | 0 | 0 | 0 |  |
| test.test_math | ERROR | 88 | 18 | 31 | 0 |  |
| test.test_int | IMPORTERROR | 0 | 0 | 0 | 0 | codePoint 16rd800 is illegal for Unicode |
| test.test_float | IMPORTERROR | 0 | 0 | 0 | 0 | codePoint 16rd8f0 is illegal for Unicode |
| test.test_heapq | ERROR | 68 | 8 | 14 | 0 |  |
| test.test_bisect | ERROR | 42 | 12 | 8 | 0 |  |
| test.test_operator | ERROR | 110 | 30 | 16 | 0 |  |
| test.test_fractions | ERROR | 49 | 18 | 13 | 0 |  |
| test.test_datetime | SKIP | 0 | 0 | 0 | 0 |  |
| test.test_re | ERROR | 161 | 32 | 30 | 2 |  |
| test.test_functools | ERROR | 253 | 51 | 172 | 0 |  |
| test.test_list | ERROR | 68 | 17 | 9 | 2 |  |
| test.test_tuple | ERROR | 38 | 11 | 9 | 0 |  |
| test.test_dict | ERROR | 120 | 35 | 23 | 1 |  |
| test.test_set | ERROR | 537 | 75 | 86 | 0 |  |
| test.test_bytes | SKIP | 0 | 0 | 0 | 0 | a SkipTest occurred (error 2702) |
| test.test_collections | ERROR | 101 | 30 | 61 | 0 |  |
| test.test_itertools | CRASH | 0 | 0 | 0 | 0 | topaz exit 1, no result line (see out/cpython/test.test_itertools.out) |
| test.test_enum | IMPORTERROR | 0 | 0 | 0 | 0 | name '_generate_next_value_' is not defined |
