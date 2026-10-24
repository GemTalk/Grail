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

THE COMMITTED BASELINE IS CI-MEASURED (Linux x86_64), because that is
where check_cpython_regressions.sh gates it. A local run is measured on
whatever this machine is, and the two do not always agree: as of
2026-08-27, test.test_traceback reads 14 fail+err on Darwin arm64 and 16
in CI, deterministically in both -- MiscTracebackCases.test_extract_stack
and TestTracebackFormat.test_format_stack fail only on Linux. So a local
run reporting those rows as IMPROVED is reporting the platform, not a
win, and committing a locally-measured board makes the nightly fail on a
row nobody broke. Refresh the baseline from CI: run the CPython
conformance workflow with refresh_baseline=true and merge the PR it
opens. See .github/workflows/cpython-conformance.yml.

| Module | Status | tests | fail | err | skip | detail |
|--------|--------|------:|-----:|----:|-----:|--------|
| test.test_textwrap | OK | 68 | 0 | 0 | 0 |  |
| test.test_math | OK | 89 | 0 | 0 | 5 |  |
| test.test_int | OK | 52 | 0 | 0 | 17 |  |
| test.test_float | OK | 54 | 0 | 0 | 3 |  |
| test.test_heapq | OK | 68 | 0 | 0 | 34 |  |
| test.test_bisect | OK | 46 | 0 | 0 | 0 |  |
| test.test_operator | OK | 112 | 0 | 0 | 59 |  |
| test.test_fractions | OK | 50 | 0 | 0 | 0 |  |
| test.test_decimal | OK | 433 | 0 | 0 | 200 |  |
| test.test_datetime | OK | 528 | 0 | 0 | 3 |  |
| test.test_re | OK | 166 | 0 | 0 | 30 |  |
| test.test_functools | OK | 325 | 0 | 0 | 125 |  |
| test.test_list | OK | 68 | 0 | 0 | 4 |  |
| test.test_tuple | OK | 38 | 0 | 0 | 6 |  |
| test.test_dict | OK | 122 | 0 | 0 | 20 |  |
| test.test_set | OK | 630 | 0 | 0 | 21 |  |
| test.test_bytes | OK | 321 | 0 | 0 | 25 |  |
| test.test_collections | OK | 101 | 0 | 0 | 40 |  |
| test.test_itertools | OK | 136 | 0 | 0 | 31 |  |
| test.test_enum | OK | 1077 | 0 | 0 | 6 |  |
| test.test_unary | OK | 6 | 0 | 0 | 0 |  |
| test.test_int_literal | OK | 6 | 0 | 0 | 0 |  |
| test.test_unpack | OK | 2 | 0 | 0 | 0 |  |
| test.test_augassign | OK | 7 | 0 | 0 | 0 |  |
| test.test_contains | OK | 4 | 0 | 0 | 0 |  |
| test.test_dictcomps | OK | 10 | 0 | 0 | 0 |  |
| test.test_setcomps | OK | 2 | 0 | 0 | 0 |  |
| test.test_pow | OK | 7 | 0 | 0 | 0 |  |
| test.test_richcmp | OK | 11 | 0 | 0 | 0 |  |
| test.test_slice | OK | 11 | 0 | 0 | 0 |  |
| test.test_bool | OK | 31 | 0 | 0 | 0 |  |
| test.test_iter | OK | 57 | 0 | 0 | 4 |  |
| test.test_traceback | OK | 370 | 0 | 0 | 270 |  |
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
| test.test_listcomps | OK | 66 | 0 | 0 | 0 |  |
| test.test_property | OK | 31 | 0 | 0 | 5 |  |
| test.test_copy | OK | 81 | 0 | 0 | 0 |  |
| test.test_scope | OK | 41 | 0 | 0 | 4 |  |
| test.test_yield_from | OK | 43 | 0 | 0 | 0 |  |
| test.test_deque | OK | 81 | 0 | 0 | 6 |  |
| test.test_format | OK | 19 | 0 | 0 | 4 |  |
| test.test_binop | OK | 12 | 0 | 0 | 0 |  |
| test.test_complex | OK | 38 | 0 | 0 | 1 |  |
| test.test_enumerate | OK | 105 | 0 | 0 | 17 |  |
| test.test_raise | OK | 37 | 0 | 0 | 2 |  |
| test.test_funcattrs | OK | 38 | 0 | 0 | 4 |  |
| test.test_decorators | OK | 16 | 0 | 0 | 0 |  |
| test.test_print | OK | 9 | 0 | 0 | 0 |  |
| test.test_builtin | OK | 137 | 0 | 0 | 15 |  |
| test.test_call | OK | 189 | 0 | 0 | 182 |  |
| test.test_dynamic | OK | 11 | 0 | 0 | 2 |  |
| test.test_exception_variations | OK | 30 | 0 | 0 | 0 |  |
| test.test_global | OK | 20 | 0 | 0 | 0 |  |
| test.test_hash | OK | 30 | 0 | 0 | 16 |  |
| test.test_named_expressions | OK | 74 | 0 | 0 | 0 |  |
| test.test_subclassinit | OK | 17 | 0 | 0 | 0 |  |
| test.test_super | OK | 40 | 0 | 0 | 3 |  |
| test.test_typechecks | OK | 6 | 0 | 0 | 0 |  |
| test.test_with | OK | 54 | 0 | 0 | 0 |  |
| test.test_positional_only_arg | OK | 28 | 0 | 0 | 1 |  |
| test.test_string_literals | OK | 20 | 0 | 0 | 0 |  |
| test.test_genericclass | OK | 22 | 0 | 0 | 1 |  |
| test.test_annotationlib | OK | 118 | 0 | 0 | 8 |  |
| test.test_bufio | OK | 4 | 0 | 0 | 0 |  |
| test.test_codecs | OK | 288 | 0 | 0 | 22 |  |
| test.test_contextlib | OK | 91 | 0 | 0 | 0 |  |
| test.test_contextlib_async | OK | 58 | 0 | 0 | 0 |  |
| test.test_asyncgen | OK | 85 | 0 | 0 | 0 |  |
| test.test_coroutines | OK | 100 | 0 | 0 | 4 |  |
| test.test_difflib | OK | 59 | 0 | 0 | 0 |  |
| test.test_gettext | OK | 74 | 0 | 0 | 1 |  |
| test.test_linecache | OK | 29 | 0 | 0 | 1 |  |
| test.test_pickle | OK | 470 | 0 | 0 | 50 |  |
| test.test_reprlib | OK | 33 | 0 | 0 | 2 |  |
| test.test_struct | OK | 44 | 0 | 0 | 8 |  |
| test.test_typing | OK | 714 | 0 | 0 | 3 |  |
| test.test_warnings | OK | 197 | 0 | 0 | 35 |  |
| test.test___all__ | OK | 1 | 0 | 0 | 0 |  |
| test.test_codecencodings_kr | OK | 54 | 0 | 0 | 0 |  |
| test.test_codecmaps_tw | SKIP | 6 | 0 | 0 | 6 |  |
| test.test_htmlparser | OK | 68 | 0 | 0 | 2 |  |
| test.test_ipaddress | OK | 211 | 0 | 0 | 0 |  |
| test.test_netrc | OK | 24 | 0 | 0 | 1 |  |
| test.test_pulldom | OK | 11 | 0 | 0 | 0 |  |
| test.test_sax | OK | 191 | 0 | 0 | 0 |  |
| test.test_ssl | OK | 203 | 0 | 0 | 22 |  |
| test.test_urllib2_localnet | OK | 21 | 0 | 0 | 0 |  |
| test.test_wave | OK | 113 | 0 | 0 | 0 |  |
| test.test_xml_etree | OK | 233 | 0 | 0 | 7 |  |
| test.test_zipapp | OK | 35 | 0 | 0 | 0 |  |
| test.test_urlparse | OK | 77 | 0 | 0 | 5 |  |
| test.test_asyncio.test_context | OK | 1 | 0 | 0 | 0 |  |
| test.test_asyncio.test_waitfor | OK | 19 | 0 | 0 | 0 |  |
| test.test_asyncio.test_locks | OK | 75 | 0 | 0 | 0 |  |
| test.test_asyncio.test_queues | OK | 59 | 0 | 0 | 0 |  |
| test.test_asyncio.test_taskgroups | OK | 96 | 0 | 0 | 12 |  |
| test.test_statistics | OK | 400 | 0 | 0 | 6 |  |
| test.test_abc | OK | 74 | 0 | 0 | 0 |  |
| test.test_userstring | OK | 71 | 0 | 0 | 2 |  |
| test.test_exception_group | OK | 53 | 0 | 0 | 0 |  |
| test.test_except_star | OK | 60 | 0 | 0 | 0 |  |
| test.test_generators | ERROR | 59 | 8 | 1 | 3 |  |
| test.test_long | ERROR | 47 | 0 | 3 | 7 |  |
| test.test_exception_hierarchy | OK | 16 | 0 | 0 | 1 |  |
| test.test_copyreg | OK | 6 | 0 | 0 | 0 |  |
| test.test_random | ERROR | 116 | 0 | 1 | 5 |  |
| test.test_string.test_string | OK | 42 | 0 | 0 | 1 |  |
| test.test_shlex | OK | 45 | 0 | 0 | 1 |  |
| test.test_uuid | OK | 120 | 0 | 0 | 73 |  |
| test.test_abstract_numbers | OK | 7 | 0 | 0 | 0 |  |
| test.test_c_locale_coercion | OK | 8 | 0 | 0 | 6 |  |
| test.test_colorsys | OK | 7 | 0 | 0 | 0 |  |
| test.test_errno | OK | 3 | 0 | 0 | 0 |  |
| test.test_fnmatch | OK | 24 | 0 | 0 | 0 |  |
| test.test_html | OK | 2 | 0 | 0 | 0 |  |
| test.test_http_cookiejar | OK | 77 | 0 | 0 | 0 |  |
| test.test_longexp | OK | 1 | 0 | 0 | 0 |  |
| test.test_opcodes | OK | 8 | 0 | 0 | 0 |  |
| test.test_picklebuffer | OK | 9 | 0 | 0 | 3 |  |
| test.test_quopri | OK | 11 | 0 | 0 | 2 |  |
| test.test_stringprep | OK | 1 | 0 | 0 | 0 |  |
| test.test_sundry | OK | 1 | 0 | 0 | 0 |  |
| test.test_unicode_file_functions | FAIL | 30 | 10 | 0 | 0 |  |
| test.test_urllib_response | OK | 4 | 0 | 0 | 0 |  |
| test.test_xml_dom_minicompat | OK | 11 | 0 | 0 | 0 |  |
| test.test_xml_etree_c | OK | 252 | 0 | 0 | 25 |  |
| test.test_pickletools | ERROR | 190 | 1 | 1 | 16 |  |
| test.test_secrets | ERROR | 11 | 0 | 1 | 0 |  |
| test.test_range | FAIL | 29 | 3 | 0 | 0 |  |
| test.test_buffer | ERROR | 95 | 6 | 4 | 80 |  |
| test.test_numeric_tower | ERROR | 9 | 0 | 1 | 0 |  |
| test.test_largefile | ERROR | 16 | 0 | 2 | 6 |  |
| test.test_pprint | FAIL | 45 | 6 | 0 | 1 |  |
| test.test_multibytecodec | ERROR | 36 | 5 | 1 | 2 |  |
| test.test_str | ERROR | 138 | 20 | 8 | 11 |  |
| test.test_utf8_mode | OK | 12 | 0 | 0 | 13 |  |
| test.test_urllib | ERROR | 101 | 5 | 6 | 2 |  |
| test.test_ntpath | ERROR | 105 | 0 | 16 | 28 |  |
| test.test_signal | TIMEOUT | 0 | 0 | 0 | 0 | killed after 1800s |
| test.test_posixpath | ERROR | 94 | 11 | 11 | 29 |  |
| test.test_genericpath | ERROR | 25 | 0 | 6 | 3 |  |
| test.test_sys | ERROR | 97 | 5 | 19 | 56 |  |
| test.test_descrtut | FAIL | 8 | 2 | 0 | 0 |  |
| test.test_fileio | SKIP | 0 | 0 | 0 | 0 | a SkipTest occurred (error 2702) |
| test.test_defaultdict | OK | 13 | 0 | 0 | 0 |  |
| test.test_exceptions | ERROR | 107 | 14 | 14 | 30 |  |
| test.test_descr | ERROR | 162 | 50 | 32 | 12 |  |
| test.test_cmd | OK | 7 | 0 | 0 | 3 |  |
| test.test_sched | OK | 11 | 0 | 0 | 0 |  |
| test.test_fileinput | OK | 57 | 0 | 0 | 1 |  |
| test.test_shelve | OK | 182 | 0 | 0 | 0 |  |
| test.test_dbm | OK | 18 | 0 | 0 | 3 |  |
| test.test_filecmp | ERROR | 16 | 0 | 1 | 0 |  |
| test.test_dbm_dumb | ERROR | 26 | 0 | 1 | 1 |  |
| test.test_robotparser | ERROR | 50 | 0 | 5 | 0 |  |
| test.test_rlcompleter | FAIL | 8 | 2 | 0 | 0 |  |
| test.test_timeit | OK | 41 | 0 | 0 | 0 |  |
| test.test_nturl2path | OK | 3 | 0 | 0 | 0 |  |
| test.test_plistlib | CRASH | 0 | 0 | 0 | 0 | topaz exit 1, no result line (see out/cpython/test.test_plistlib.out) |
| test.test_gzip | ERROR | 75 | 4 | 3 | 9 |  |
| test.test_zlib | ERROR | 76 | 5 | 8 | 8 |  |
