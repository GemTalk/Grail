# CPython 3.14.4 Regression Suite Scoreboard — Grail

Generated: 2026-07-10T08:11:25Z  ·  GemStone: GemStone64Bit3.7.5-arm64.Darwin

**Modules: 11** — OK 1 · FAIL 0 · ERROR 0 · SKIP 1 · IMPORTERROR 5 · STERROR 4 · CRASH 0 · TIMEOUT 0

**Totals:** tests=68 failures=0 errors=0 skipped=0

Status legend: OK (all pass) · FAIL (assertion failures) · ERROR (exceptions in tests) · SKIP (all skipped / none discovered) · IMPORTERROR (module/support import failed) · STERROR (uncatchable Smalltalk error escaped) · CRASH (topaz died, e.g. SIGSEGV) · TIMEOUT.

This is a measurement harness over a curated starter set, not the full
~480-module suite. See scripts/cpython_suite_manifest.txt and
scripts/run_cpython_suite.sh. Per-module logs: out/cpython/<module>.out.

| Module | Status | tests | fail | err | skip | detail |
|--------|--------|------:|-----:|----:|-----:|--------|
| test.test_textwrap | OK | 68 | 0 | 0 | 0 |  |
| test.test_math | IMPORTERROR | 0 | 0 | 0 | 0 | a ImproperOperation occurred (error 2014), reason:classErrSubclassDisallowed, Cannot create a subclass of the class Integer. |
| test.test_int | IMPORTERROR | 0 | 0 | 0 | 0 | codePoint 16rd800 is illegal for Unicode |
| test.test_float | IMPORTERROR | 0 | 0 | 0 | 0 | codePoint 16rd8f0 is illegal for Unicode |
| test.test_heapq | STERROR | 0 | 0 | 0 | 0 | Not yet implemented: __lt__ |
| test.test_bisect | STERROR | 0 | 0 | 0 | 0 | Expected a Number |
| test.test_operator | STERROR | 0 | 0 | 0 | 0 | Not yet implemented: __ge__ |
| test.test_fractions | IMPORTERROR | 0 | 0 | 0 | 0 | a CompileError occurred (error 1001), unexpected token ; expected a right bracket (]) ; unexpected token ; unexpected token ; unexpected token  |
| test.test_datetime | SKIP | 0 | 0 | 0 | 0 |  |
| test.test_re | STERROR | 0 | 0 | 0 | 0 | a MessageNotUnderstood occurred (error 2010), a Unicode7 does not understand  #'_generality' |
| test.test_functools | IMPORTERROR | 0 | 0 | 0 | 0 | Expected OP '(' but got OP '[' at line 840 |
