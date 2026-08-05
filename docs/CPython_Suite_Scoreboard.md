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
| test.test_contains | FAIL | 4 | 1 | 0 | 0 |  |
