# CPython 3.14.4 Regression Suite Scoreboard — Grail

Generated: 2026-07-11T00:44:12Z  ·  GemStone: GemStone64Bit3.7.5-arm64.Darwin

**Modules: 11** — OK 1 · FAIL 0 · ERROR 4 · SKIP 1 · IMPORTERROR 3 · STERROR 2 · CRASH 0 · TIMEOUT 0

**Totals:** tests=430 failures=96 errors=64 skipped=2

Status legend: OK (all pass) · FAIL (assertion failures) · ERROR (exceptions in tests) · SKIP (all skipped / none discovered) · IMPORTERROR (module/support import failed) · STERROR (uncatchable Smalltalk error escaped) · CRASH (topaz died, e.g. SIGSEGV) · TIMEOUT.

This is a measurement harness over a curated starter set, not the full
~480-module suite. See scripts/cpython_suite_manifest.txt and
scripts/run_cpython_suite.sh. Per-module logs: out/cpython/<module>.out.

| Module | Status | tests | fail | err | skip | detail |
|--------|--------|------:|-----:|----:|-----:|--------|
| test.test_textwrap | OK | 68 | 0 | 0 | 0 |  |
| test.test_math | IMPORTERROR | 0 | 0 | 0 | 0 | Grail cannot subclass sealed kernel class 'Integer' |
| test.test_int | IMPORTERROR | 0 | 0 | 0 | 0 | codePoint 16rd800 is illegal for Unicode |
| test.test_float | IMPORTERROR | 0 | 0 | 0 | 0 | codePoint 16rd8f0 is illegal for Unicode |
| test.test_heapq | STERROR | 0 | 0 | 0 | 0 | env-1 #'__iter__' not understood by G |
| test.test_bisect | ERROR | 42 | 14 | 6 | 0 |  |
| test.test_operator | ERROR | 110 | 30 | 16 | 0 |  |
| test.test_fractions | ERROR | 49 | 19 | 13 | 0 |  |
| test.test_datetime | SKIP | 0 | 0 | 0 | 0 |  |
| test.test_re | ERROR | 161 | 33 | 29 | 2 |  |
| test.test_functools | STERROR | 0 | 0 | 0 | 0 | a CompileError occurred (error 1001), undefined symbol  _self |
