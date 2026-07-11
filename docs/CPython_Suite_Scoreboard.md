# CPython 3.14.4 Regression Suite Scoreboard — Grail

Generated: 2026-07-11T08:50:38Z  ·  GemStone: GemStone64Bit3.7.5-arm64.Darwin

**Modules: 11** — OK 1 · FAIL 0 · ERROR 6 · SKIP 1 · IMPORTERROR 2 · STERROR 1 · CRASH 0 · TIMEOUT 0

**Totals:** tests=586 failures=125 errors=110 skipped=2

Status legend: OK (all pass) · FAIL (assertion failures) · ERROR (exceptions in tests) · SKIP (all skipped / none discovered) · IMPORTERROR (module/support import failed) · STERROR (uncatchable Smalltalk error escaped) · CRASH (topaz died, e.g. SIGSEGV) · TIMEOUT.

This is a measurement harness over a curated starter set, not the full
~480-module suite. See scripts/cpython_suite_manifest.txt and
scripts/run_cpython_suite.sh. Per-module logs: out/cpython/<module>.out.

| Module | Status | tests | fail | err | skip | detail |
|--------|--------|------:|-----:|----:|-----:|--------|
| test.test_textwrap | OK | 68 | 0 | 0 | 0 |  |
| test.test_math | ERROR | 88 | 23 | 31 | 0 |  |
| test.test_int | IMPORTERROR | 0 | 0 | 0 | 0 | codePoint 16rd800 is illegal for Unicode |
| test.test_float | IMPORTERROR | 0 | 0 | 0 | 0 | codePoint 16rd8f0 is illegal for Unicode |
| test.test_heapq | ERROR | 68 | 8 | 14 | 0 |  |
| test.test_bisect | ERROR | 42 | 12 | 8 | 0 |  |
| test.test_operator | ERROR | 110 | 30 | 16 | 0 |  |
| test.test_fractions | ERROR | 49 | 19 | 12 | 0 |  |
| test.test_datetime | SKIP | 0 | 0 | 0 | 0 |  |
| test.test_re | ERROR | 161 | 33 | 29 | 2 |  |
| test.test_functools | STERROR | 0 | 0 | 0 | 0 | env-1 #'nextPutAll:' not understood by WriteStream |
