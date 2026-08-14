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
| test.test_textwrap | OK | 68 | 0 | 0 | 0 |  |
| test.test_math | OK | 88 | 0 | 0 | 5 |  |
| test.test_int | OK | 52 | 0 | 0 | 17 |  |
| test.test_float | OK | 54 | 0 | 0 | 3 |  |
| test.test_heapq | OK | 68 | 0 | 0 | 34 |  |
| test.test_bisect | OK | 46 | 0 | 0 | 0 |  |
| test.test_operator | OK | 110 | 0 | 0 | 58 |  |
| test.test_fractions | OK | 50 | 0 | 0 | 0 |  |
| test.test_datetime | OK | 525 | 0 | 0 | 3 |  |
| test.test_re | OK | 165 | 0 | 0 | 30 |  |
| test.test_functools | OK | 325 | 0 | 0 | 125 |  |
| test.test_list | OK | 68 | 0 | 0 | 4 |  |
| test.test_tuple | OK | 38 | 0 | 0 | 6 |  |
| test.test_dict | OK | 120 | 0 | 0 | 20 |  |
| test.test_set | OK | 630 | 0 | 0 | 21 |  |
| test.test_bytes | OK | 317 | 0 | 0 | 25 |  |
| test.test_collections | OK | 101 | 0 | 0 | 41 |  |
| test.test_itertools | OK | 136 | 0 | 0 | 31 |  |
| test.test_enum | ERROR | 1077 | 3 | 5 | 6 |  |
| test.test_unary | OK | 6 | 0 | 0 | 0 |  |
| test.test_int_literal | OK | 6 | 0 | 0 | 0 |  |
| test.test_unpack | OK | 1 | 0 | 0 | 0 |  |
| test.test_augassign | OK | 7 | 0 | 0 | 0 |  |
| test.test_contains | OK | 4 | 0 | 0 | 0 |  |
| test.test_dictcomps | OK | 10 | 0 | 0 | 0 |  |
| test.test_setcomps | OK | 1 | 0 | 0 | 0 |  |
| test.test_pow | OK | 7 | 0 | 0 | 0 |  |
| test.test_richcmp | OK | 11 | 0 | 0 | 0 |  |
| test.test_slice | OK | 11 | 0 | 0 | 0 |  |
| test.test_bool | OK | 31 | 0 | 0 | 0 |  |
| test.test_iter | OK | 57 | 0 | 0 | 4 |  |
| test.test_traceback | ERROR | 370 | 45 | 12 | 218 |  |
| test.test_compare | OK | 16 | 0 | 0 | 0 |  |
| test.test_iterlen | OK | 22 | 0 | 0 | 0 |  |
| test.test_keywordonlyarg | OK | 11 | 0 | 0 | 0 |  |
| test.test_dictviews | OK | 16 | 0 | 0 | 0 |  |
| test.test_sort | OK | 21 | 0 | 0 | 2 |  |
| test.test_generator_stop | OK | 2 | 0 | 0 | 0 |  |
| test.test_userdict | OK | 28 | 0 | 0 | 0 |  |
| test.test_userlist | OK | 54 | 0 | 0 | 1 |  |
| test.test_isinstance | OK | 23 | 0 | 0 | 2 |  |
| test.test_index | OK | 55 | 0 | 0 | 0 |  |
| test.test_baseexception | OK | 11 | 0 | 0 | 1 |  |
| test.test_listcomps | ERROR | 60 | 5 | 16 | 0 |  |
| test.test_property | OK | 31 | 0 | 0 | 5 |  |
| test.test_copy | ERROR | 81 | 21 | 12 | 0 |  |
| test.test_scope | OK | 41 | 0 | 0 | 4 |  |
| test.test_yield_from | ERROR | 43 | 17 | 12 | 0 |  |
| test.test_deque | OK | 80 | 0 | 0 | 6 |  |
| test.test_format | OK | 18 | 0 | 0 | 3 |  |
| test.test_binop | OK | 12 | 0 | 0 | 0 |  |
| test.test_complex | ERROR | 37 | 13 | 12 | 0 |  |
| test.test_enumerate | FAIL | 92 | 12 | 0 | 15 |  |
| test.test_raise | ERROR | 37 | 1 | 14 | 0 |  |
| test.test_funcattrs | ERROR | 35 | 14 | 13 | 1 |  |
| test.test_decorators | ERROR | 16 | 1 | 5 | 0 |  |
| test.test_print | ERROR | 9 | 6 | 2 | 0 |  |
| test.test_builtin | IMPORTERROR | 0 | 0 | 0 | 0 | cannot import name 'CO_COROUTINE' from 'inspect' (src/python/stdlib/inspect.py) |
| test.test_call | OK | 186 | 0 | 0 | 182 |  |
| test.test_dynamic | ERROR | 11 | 5 | 2 | 0 |  |
| test.test_exception_variations | ERROR | 30 | 2 | 7 | 0 |  |
| test.test_global | IMPORTERROR | 0 | 0 | 0 | 0 | Unexpected token: NEWLINE '' at line 165 |
| test.test_hash | OK | 30 | 0 | 0 | 16 |  |
| test.test_named_expressions | ERROR | 74 | 21 | 15 | 0 |  |
| test.test_subclassinit | ERROR | 17 | 7 | 3 | 0 |  |
| test.test_super | ERROR | 40 | 13 | 24 | 3 |  |
| test.test_typechecks | OK | 6 | 0 | 0 | 0 |  |
| test.test_with | ERROR | 54 | 6 | 5 | 0 |  |
| test.test_positional_only_arg | ERROR | 28 | 4 | 4 | 0 |  |
| test.test_string_literals | ERROR | 20 | 3 | 10 | 0 |  |
| test.test_genericclass | ERROR | 22 | 12 | 7 | 1 |  |
| test.test_annotationlib | IMPORTERROR | 0 | 0 | 0 | 0 | Expected NAME but got STRING '{a}' at line 372 |
| test.test_bufio | IMPORTERROR | 0 | 0 | 0 | 0 | No module named '_pyio' |
| test.test_codecs | IMPORTERROR | 0 | 0 | 0 | 0 | No module named 'encodings' |
| test.test_contextlib_async | IMPORTERROR | 0 | 0 | 0 | 0 | cannot import name 'run_no_yield_async_fn' from 'test.support' (src/python/stdlib/test/support/__init__.py) |
| test.test_difflib | IMPORTERROR | 0 | 0 | 0 | 0 | cannot import name 'findfile' from 'test.support' (src/python/stdlib/test/support/__init__.py) |
| test.test_gettext | ERROR | 73 | 14 | 4 | 1 |  |
| test.test_linecache | IMPORTERROR | 0 | 0 | 0 | 0 | No module named 'importlib.machinery' |
| test.test_pickle | IMPORTERROR | 0 | 0 | 0 | 0 | No module named '_compat_pickle' |
| test.test_reprlib | IMPORTERROR | 0 | 0 | 0 | 0 | name 'wrapped' is not defined |
| test.test_struct | ERROR | 43 | 6 | 29 | 7 |  |
| test.test_typing | IMPORTERROR | 0 | 0 | 0 | 0 | cannot import name 'assert_never' from 'typing' (src/python/stdlib/typing.py) |
| test.test_warnings | IMPORTERROR | 0 | 0 | 0 | 0 | cannot import name 'get_overloads' from 'typing' (src/python/stdlib/typing.py) |
