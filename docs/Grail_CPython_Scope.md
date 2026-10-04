# Which CPython Regression Modules Should Grail Support?

A scope + priority classification of **all 434** distinct `test_*` modules in the
CPython **3.14.4** regression suite (`Lib/test/`, 398 files + 36 packages), for
Grail (Python-on-GemStone).

**Scope boundary (agreed):** *in-scope* = the whole Python language plus all
pure-Python standard library — including the web / async / networking / serialization
stack the project already vendors (flask, jinja2, requests, werkzeug, asyncio, http,
email, xml). *Out-of-scope* = OS-process control, GUI/terminal, the C runtime &
interpreter internals, refcount/GC-timing & real/free-threading, and
hardware/OS-platform specifics.

Every module is tagged **in-scope** (priority tier P1–P4) or **out-of-scope** (with a
bucket + reason). The leading **Status** column on each in-scope table says where
that module stands in the measurement harness. Only the two states that carry
news get a glyph; the majority state is a blank cell:

| Status | Meaning |
|:------:|---------|
| ✅ | Wired into `scripts/cpython_suite_manifest.txt` **and scoring OK** — every test it discovers passes. |
| ❗ | Wired into the manifest but **not** OK: FAIL / ERROR / IMPORTERROR / STERROR / CRASH / TIMEOUT. Per-module counts and the current blocker are in [CPython_Suite_Scoreboard.md](CPython_Suite_Scoreboard.md). |
|  | *(blank)* **Not measured** — absent from the manifest, so its real standing is unknown. A blank is not a claim that the module fails; nobody has run it. |

Where the in-scope tiers stand:

<!-- status-tally -->
| Tier | ✅ OK | ❗ not OK | not measured | Total |
|------|------:|----------:|-------------:|------:|
| P1 | 56 | 5 | 29 | 90 |
| P2 | 17 | 3 | 14 | 34 |
| P3 | 13 | 1 | 42 | 56 |
| P4 | 12 | 3 | 60 | 75 |
| **In-scope** | **98** | **12** | **145** | **255** |
<!-- /status-tally -->

A package wired a submodule at a time takes its glyph from the submodules wired
so far: `test_asyncio` is ✅ because its five wired submodules pass, which is 250
of the package's 2,701 tests. The tests table below shows how much of a row that
is.

The out-of-scope tables carry **no** Status column at all, on purpose: those
modules are deliberately excluded, so "not measured" is the intent there rather
than a gap worth tracking.

The column is **derived, not authored** — it comes from the manifest plus the
committed per-module rows of the scoreboard. Refresh it after any suite run that
moves a row:

```
python3 scripts/sync_scope_status.py            # rewrite the column
python3 scripts/sync_scope_status.py --check    # exit 1 if it is stale
```

### Sizing the blank cells

A blank Status is 145 of the 255 in-scope rows, so most of what this document
describes is still unknown rather than measured. Wiring a module means vendoring its
test file into `src/python/stdlib/test/` first, which is why the measured set
grows slowly — but whether the module a test *exercises* can be imported at all
is one import away, and that is what says whether vendoring the test file is
worth doing:

```
./scripts/cpython_import_census.py            # probe every unmeasured in-scope row
./scripts/cpython_import_census.py --report   # re-print the last run
```

It maps each `test_x` to its subject module, imports each one through the same
`builtins.__import__` a Python `import` statement reaches, and buckets the
results into IMPORTS / MISSING / ERROR / NO_SUBJECT (a language test such as
`test_grammar`, which needs no subject). The whole survey is one Grail session
and a few seconds; the report is written to `out/cpython/import_census.tsv`
(gitignored). It measures **importability, not conformance** — a subject that
imports says the test file can be run, not that it will pass. Nothing here is
committed and nothing gates CI.

## Summary

| Bucket | Modules |
|--------|--------:|
| **In-scope — total** | **255** |
| &nbsp;&nbsp;P1 — Core language & built-in types | 90 |
| &nbsp;&nbsp;P2 — Core stdlib (data structures · numbers · algorithms · text) | 34 |
| &nbsp;&nbsp;P3 — Broader stdlib (serialization · io · dates · typing · introspection) | 56 |
| &nbsp;&nbsp;P4 — Web · async · net · security · advanced protocols | 75 |
| **Out-of-scope — total** | **179** |
| &nbsp;&nbsp;OS — process control, syscalls, real filesystem | 57 |
| &nbsp;&nbsp;GUI / terminal-UI / interactive REPL | 15 |
| &nbsp;&nbsp;C runtime · interpreter internals · bytecode · CPython tooling | 80 |
| &nbsp;&nbsp;Refcount/GC timing · weakref · real & free-threading | 9 |
| &nbsp;&nbsp;Hardware / OS-platform specific | 18 |
| **Total** | **434** |

<!-- wired-tally -->
Of the 255 in-scope modules, **110 are wired into the harness** (P1 61 · P2 20 · P3 14 · P4 15) and **98 of those score OK**.
<!-- /wired-tally -->

It was 19 wired when this document was written. **66** modules are genuinely
arguable — see [Judgment calls](#judgment-calls).

### How many TESTS, not modules

Modules are the unit this document plans in; **tests** are the unit progress is
made in, and the two are not proportional — `test_augassign` is 7 tests and
`test_asyncio` is 2701. The scoreboard can only count what Grail can *import*:
a module that fails at import scores IMPORTERROR and reports `tests=0`, which is
indistinguishable from a module with no tests in it. So the denominator has to
come from somewhere else.

`scripts/count_cpython_tests.py` supplies it. Against CPython 3.14.6, with the
committed board of 2026-09-28:

| tier | modules | wired | tests | passing | remaining | done |
|------|--------:|------:|------:|--------:|----------:|-----:|
| P1 | 90 | 56 | 4,697 | 2,532 | 2,165 | 53.9% |
| P2 | 34 | 17 | 9,086 | 2,831 | 6,255 | 31.2% |
| P3 | 56 | 13 | 13,722 | 2,015 | 11,707 | 14.7% |
| P4 | 75 | 14 | 12,255 | 1,159 | 11,096 | 9.5% |
| **all** | **255** | **100** | **39,760** | **8,537** | **31,223** | **21.5%** |

*wired* here counts modules with a row on the board, so the nine wired on
2026-09-28 join it at the next nightly.

*passing* is `tests − failures − errors − skipped` from
[CPython_Suite_Scoreboard.md](CPython_Suite_Scoreboard.md): a skip is not a pass,
it is a test still to be earned. Regenerate with
`scripts/count_cpython_tests.py --exact` (about 6s); `--per-module` gives one row
per module and `--json` feeds a chart.

Two ways of counting, and the difference is the point:

* `--exact` asks **CPython's own loader** — `loadTestsFromModule().countTestCases()`
  in a subprocess per module. Importing under CPython is safe (they are CPython's
  tests, and loading enumerates without running) and it is exact: `load_tests`
  hooks, doctest suites and classes built in an import-time loop are all counted.
  All 255 import cleanly here, so every figure above is exact.
* the default reads the **source** with `ast`, resolving base classes across
  files so `test_list`'s single `ListTest(list_tests.CommonTest)` is counted as
  the 68 tests it inherits. It totals 30,408 — 76% of the truth — because it
  cannot see tests built at import time. It exists for a tree CPython will not
  import (another platform, a partial checkout), and `--calibrate` measures its
  error rather than asserting it.

**Read 39,760 as CPython's denominator, not as Grail's ceiling.** Some of it
tests a *second implementation* of the same thing: `test_datetime` runs its whole
suite twice, pure-Python and C accelerator, for 3,608 of the total, and
`test_xpickle`'s 3,016 cross-version pickle round-trips need other CPython builds
installed. A burn-down against this number asymptotes below 100%, and that is a
property of the target rather than of the progress.

---

## In-scope

### P1 — Core language & built-in types  ·  90 modules

The definition of "is Grail Python?" — grammar, control flow, the object model, and every built-in type. These must all pass.

| Status | Module | Rationale |
|:------:|--------|-----------|
| ✅ | `test_asyncgen` | Async generators — a core language feature. |
| ✅ | `test_augassign` | Augmented-assignment semantics (language). |
| ✅ | `test_baseexception` | BaseException hierarchy (language). |
| ✅ | `test_binop` | Binary-operator dispatch (language). |
| ✅ | `test_bool` | bool type (language). |
| ✅ | `test_builtin` | Built-in functions (language). |
| ✅ | `test_bytes` | bytes / bytearray (language/core type). |
| ✅ | `test_call` | Call protocol (language). |
|  | `test_class` | Class definition/semantics (language). |
| ✅ | `test_compare` | Object comparison protocol (language). |
| ✅ | `test_complex` | complex type (language). |
| ✅ | `test_contains` | Membership (`in`) protocol (language). |
| ✅ | `test_coroutines` | Coroutines / async-await (language). |
| ✅ | `test_decorators` | Decorators (language). |
|  | `test_descr` | Descriptors / new-style class machinery (language). |
|  | `test_descrtut` | Descriptor tutorial doctests (language). |
| ✅ | `test_dict` | dict — core type (in harness). |
| ✅ | `test_dictcomps` | Dict comprehensions (language). |
| ✅ | `test_dictviews` | dict keys/values/items views (language). |
| ✅ | `test_dynamic` | Dynamic name binding / exec (language). |
| ✅ | `test_enumerate` | enumerate builtin (language). |
|  | `test_eof` | Parser EOF handling (language). |
| ❗ | `test_except_star` | except* / PEP 654 (language). |
| ❗ | `test_exception_group` | ExceptionGroup (language). |
| ❗ | `test_exception_hierarchy` | Built-in exception hierarchy (language). |
| ✅ | `test_exception_variations` | try/except/finally variations (language). |
|  | `test_exceptions` | Exceptions (language). |
|  | `test_extcall` | Extended call syntax */** (language). |
| ✅ | `test_float` | float — core type (in harness). |
|  | `test_flufl` | barry_as_FLUFL __future__ (language). |
| ✅ | `test_format` | str formatting / format() (language). |
|  | `test_fstring` | f-strings (language). |
| ✅ | `test_funcattrs` | Function/method attributes (language). |
|  | `test_future_stmt` | __future__ statements (language). |
| ✅ | `test_generator_stop` | PEP 479 StopIteration handling (language). |
| ❗ | `test_generators` | Generators (language). |
| ✅ | `test_genericclass` | __class_getitem__ / generic classes (language). |
|  | `test_genexps` | Generator expressions (language). |
| ✅ | `test_global` | global statement (language). |
|  | `test_grammar` | Grammar (language). |
| ✅ | `test_hash` | hash() protocol (language). |
| ✅ | `test_index` | __index__ protocol (language). |
| ✅ | `test_int` | int — core type (in harness). |
| ✅ | `test_int_literal` | Integer literal parsing (language). |
| ✅ | `test_isinstance` | isinstance/issubclass (language). |
| ✅ | `test_iter` | Iterator protocol (language). |
| ✅ | `test_iterlen` | __length_hint__ (language). |
| ✅ | `test_keywordonlyarg` | Keyword-only arguments (language). |
| ✅ | `test_list` | list — core type (in harness). |
| ✅ | `test_listcomps` | List comprehensions (language). |
| ❗ | `test_long` | Arbitrary-precision int (language). |
|  | `test_longexp` | Very long expressions (parser stress). |
|  | `test_metaclass` | Metaclasses (language). |
|  | `test_module` | Module objects & namespace (language). |
| ✅ | `test_named_expressions` | Walrus := operator (language). |
|  | `test_patma` | Structural pattern matching (language). |
|  | `test_pep646_syntax` | Variadic generics syntax / PEP 646 (language). |
| ✅ | `test_positional_only_arg` | Positional-only args / (language). |
| ✅ | `test_pow` | pow() / ** (language). |
| ✅ | `test_print` | print() (language/builtin). |
| ✅ | `test_property` | property descriptor (language). |
| ✅ | `test_raise` | raise statement (language). |
|  | `test_range` | range (language/builtin). |
| ✅ | `test_richcmp` | Rich comparison operators (language). |
| ✅ | `test_scope` | Lexical scoping / closures (language). |
| ✅ | `test_set` | set/frozenset — core type (in harness). |
| ✅ | `test_setcomps` | Set comprehensions (language). |
| ✅ | `test_slice` | slice objects (language). |
| ✅ | `test_sort` | list.sort / sorted (language/builtin). |
|  | `test_source_encoding` | Source-file encoding declarations (parser). |
|  | `test_str` | str — core type (language). |
| ✅ | `test_string_literals` | String-literal syntax (language). |
| ✅ | `test_subclassinit` | __init_subclass__ (language). |
| ✅ | `test_super` | super() (language). |
|  | `test_syntax` | SyntaxError coverage (language). |
|  | `test_tstring` | Template strings / PEP 750 (language, new in 3.14). |
| ✅ | `test_tuple` | tuple — core type (in harness). |
|  | `test_type_aliases` | type X = ... aliases / PEP 695 (language). |
|  | `test_type_annotations` | Annotation syntax/semantics (language). |
|  | `test_type_comments` | # type: comments (language/ast). |
|  | `test_type_params` | PEP 695 type parameters (language). |
| ✅ | `test_typechecks` | type()/isinstance checks (language). |
|  | `test_types` | types module — built-in type objects (language). |
| ✅ | `test_unary` | Unary operators (language). |
|  | `test_unicode_identifiers` | Unicode identifier support (language). |
| ✅ | `test_unpack` | Sequence unpacking (language). |
|  | `test_unpack_ex` | Extended (starred) unpacking (language). |
|  | `test_utf8source` | UTF-8 source files (parser). |
| ✅ | `test_with` | with statement / context managers (language). |
| ✅ | `test_yield_from` | yield from (language). |

### P2 — Core stdlib (data structures · numbers · algorithms · text)  ·  34 modules

Pure-Python (or thin-Smalltalk) foundations with no OS/C dependency. Highest payoff after the language core; several already pass.

| Status | Module | Rationale |
|:------:|--------|-----------|
| ❗ | `test_abc` | abc / ABCMeta — pure-Python, foundational to the type system. |
|  | `test_abstract_numbers` | numbers ABC tower — pure Python. |
| ✅ | `test_bisect` | bisect — pure-Python algorithm. |
|  | `test_cmath` | cmath — complex math. |
| ✅ | `test_collections` | collections — core containers. |
| ✅ | `test_copy` | copy — shallow/deep copy protocol. |
| ✅ | `test_datetime` | datetime — core data type (in harness). |
| ✅ | `test_decimal` | decimal — arbitrary-precision arithmetic. Scored for the first time here: the module reads `Context.flags` at IMPORT time, which the old hand-written decimal lacked, so the row could not be measured at all. 368 tests · 3 fail · 14 error · 200 skip. |
|  | `test_defaultdict` | collections.defaultdict. |
| ✅ | `test_deque` | collections.deque. |
|  | `test_dynamicclassattribute` | types.DynamicClassAttribute (used by enum). |
| ✅ | `test_enum` | enum — core (in harness). |
| ✅ | `test_fractions` | fractions — core numeric (in harness). |
| ✅ | `test_functools` | functools — core (in harness). |
|  | `test_genericalias` | types.GenericAlias — list[int] etc. (language/typing). |
|  | `test_graphlib` | graphlib.TopologicalSorter — pure algorithm. |
| ✅ | `test_heapq` | heapq — core (in harness). |
| ✅ | `test_itertools` | itertools — core (in harness). |
|  | `test_keyword` | keyword module — language keyword set. |
| ✅ | `test_math` | math — core (in harness). |
|  | `test_math_property` | math invariants — pure. |
|  | `test_numeric_tower` | Numeric coercion tower (language/numbers). |
| ✅ | `test_operator` | operator — core (in harness). |
|  | `test_ordered_dict` | OrderedDict. |
| ❗ | `test_random` | random — Mersenne Twister PRNG. CPython's random.py over a native `_random`; wired 2026-10-04 at 114t 0F/14E. |
| ✅ | `test_re` | re — core (in harness). |
| ❗ | `test_statistics` | statistics — pure Python. |
|  | `test_string` | string module (vendored) — Formatter/Template (pure). |
|  | `test_strtod` | String→double conversion (float parsing). |
| ✅ | `test_textwrap` | textwrap — core (in harness). |
|  | `test_unittest` | unittest (vendored) — the test framework itself. |
| ✅ | `test_userdict` | collections.UserDict (vendored). |
| ✅ | `test_userlist` | collections.UserList (vendored). |
| ❗ | `test_userstring` | collections.UserString (vendored). |

### P3 — Broader stdlib (serialization · io · dates · typing · introspection)  ·  56 modules

Larger pure-Python stdlib. Mostly implementable; a few need modest runtime support (in-memory io, UCD/tz data tables, light introspection).

| Status | Module | Rationale |
|:------:|--------|-----------|
| ✅ | `test_annotationlib` | PEP 649 deferred annotations (new in 3.14) — annotation evaluation semantics. |
|  | `test_argparse` | argparse — pure-Python CLI parsing. |
|  | `test_atexit` | atexit callbacks — pure-ish, but 'interpreter exit' semantics differ in a persistent DB VM. *(edge — see below)* |
|  | `test_base64` | base64 — pure-Python encoding. |
|  | `test_binascii` | binascii encodings — pure semantics. |
| ✅ | `test_bufio` | Buffered I/O layer — in-scope for StringIO/BytesIO; real-file backing is OS. *(edge — see below)* |
|  | `test_calendar` | calendar — pure Python. |
|  | `test_charmapcodec` | charmap codec — pure text codec. |
|  | `test_codeccallbacks` | Codec error-handler callbacks — pure. |
| ✅ | `test_codecs` | codecs core — encode/decode registry (pure). |
|  | `test_colorsys` | colorsys — pure color-space math. |
|  | `test_configparser` | configparser (INI) — pure Python. |
|  | `test_context` | contextvars — pure-Python context state. |
| ❗ | `test_contextlib` | contextlib — pure Python. |
| ✅ | `test_contextlib_async` | async contextlib — pure Python. |
| ❗ | `test_copyreg` | copyreg — pickle/copy registry. |
|  | `test_csv` | csv — reader/writer (pure semantics). |
|  | `test_dataclasses` | dataclasses — pure-Python codegen over classes. |
| ✅ | `test_difflib` | difflib — pure Python. |
|  | `test_doctest` | doctest — pure-Python test framework. |
|  | `test_fnmatch` | fnmatch — pure glob-pattern matching on strings. |
|  | `test_genericpath` | genericpath — pure string path operations. |
|  | `test_getopt` | getopt — pure CLI parsing. |
| ✅ | `test_gettext` | gettext — pure-Python .mo/.po i18n. |
|  | `test_inspect` | inspect — needs frame/code/signature introspection depth. *(edge — see below)* |
|  | `test_io` | io core — StringIO/BytesIO in-scope; FileIO backing is OS. *(edge — see below)* |
|  | `test_json` | json package (vendored) — pure-Python. |
| ✅ | `test_linecache` | linecache — caches source lines (reads files, but a caching layer). *(edge — see below)* |
|  | `test_logging` | logging (vendored) — core stdlib; socket/file handlers are optional. |
|  | `test_memoryio` | In-memory StringIO/BytesIO — pure. |
|  | `test_ntpath` | ntpath — pure Windows path-string operations. |
|  | `test_optparse` | optparse — pure (legacy CLI). |
|  | `test_pathlib` | pathlib — pure path algebra is in-scope; stat/IO methods are OS. *(edge — see below)* |
| ✅ | `test_pickle` | pickle (partial support today) — pure-Python protocol. |
|  | `test_pickletools` | pickletools — pure. |
|  | `test_posixpath` | posixpath — pure POSIX path-string operations. |
|  | `test_pprint` | pprint — pure Python. |
|  | `test_queue` | queue — pure structures (thread-safety atop them). |
| ✅ | `test_reprlib` | reprlib — pure Python. |
|  | `test_sched` | sched — pure event scheduler. |
|  | `test_shlex` | shlex — pure lexer. |
|  | `test_strftime` | time.strftime formatting — pure. |
|  | `test_strptime` | _strptime parsing — pure. |
| ✅ | `test_struct` | struct — binary packing; C-accelerated but pure semantics. *(edge — see below)* |
|  | `test_time` | time — clock/sleep; pure formatting parts in-scope, OS clock parts not. *(edge — see below)* |
|  | `test_timeit` | timeit — pure timing harness. |
|  | `test_tokenize` | tokenize — pure Python tokenizer. |
|  | `test_tomllib` | tomllib — pure-Python TOML parser. |
| ✅ | `test_traceback` | traceback — needs frame/tb introspection. *(edge — see below)* |
| ✅ | `test_typing` | typing — pure-Python type hints. |
|  | `test_ucn` | \N{...} unicode-name escapes — needs the UCD name table. |
|  | `test_unicodedata` | unicodedata — large UCD tables (C-backed). *(edge — see below)* |
|  | `test_univnewlines` | Universal newline handling (text io). |
| ✅ | `test_warnings` | warnings — pure-Python warning framework. |
|  | `test_xpickle` | Cross-Python-version pickle compatibility. *(edge — see below)* |
|  | `test_zoneinfo` | zoneinfo — IANA tz database (needs the tz data files). |

### P4 — Web · async · net · security · advanced protocols  ·  75 modules

The vendored web/async/net ambition (flask/jinja/requests/asyncio point here). Pure-Python protocol code is reachable; transport (socket/ssl) needs a GemStone I/O bridge, and *net tests need a live server.

| Status | Module | Rationale |
|:------:|--------|-----------|
| ✅ | `test___all__` | Meta-test asserting every stdlib module's __all__; depends on importing the whole library — low-priority hygiene check. *(edge — see below)* |
|  | `test_array` | array.array typed buffers — C-backed; a pure reimplementation is possible but non-trivial. *(edge — see below)* |
| ✅ | `test_asyncio` | asyncio (vendored) — coroutine/task machinery is in-scope; the selector event loop needs a GemStone I/O bridge. *(edge — see below)* |
|  | `test_codecencodings_cn` | CJK (GB*) codec tables — large, C-table-backed; low priority. *(edge — see below)* |
|  | `test_codecencodings_hk` | CJK (HK) codec tables — large, C-table-backed; low priority. *(edge — see below)* |
|  | `test_codecencodings_iso2022` | ISO-2022 stateful codecs — C-backed; low priority. *(edge — see below)* |
|  | `test_codecencodings_jp` | Japanese codec tables — C-table-backed; low priority. *(edge — see below)* |
| ✅ | `test_codecencodings_kr` | Korean codec tables — C-table-backed; low priority. *(edge — see below)* |
|  | `test_codecencodings_tw` | Traditional-Chinese codec tables — C-table-backed; low priority. *(edge — see below)* |
|  | `test_codecmaps_cn` | CJK codec round-trip maps (network-fetched data) — low priority. *(edge — see below)* |
|  | `test_codecmaps_hk` | CJK codec round-trip maps — low priority. *(edge — see below)* |
|  | `test_codecmaps_jp` | CJK codec round-trip maps — low priority. *(edge — see below)* |
|  | `test_codecmaps_kr` | CJK codec round-trip maps — low priority. *(edge — see below)* |
| ❗ | `test_codecmaps_tw` | CJK codec round-trip maps — low priority. *(edge — see below)* |
|  | `test_docxmlrpc` | XML-RPC docserver — net + server; low priority. *(edge — see below)* |
|  | `test_email` | email package (vendored) — pure-Python. |
|  | `test_ftplib` | ftplib — FTP client (net stack). |
|  | `test_hashlib` | hashlib — crypto digests; C/OpenSSL-accelerated but pure fallbacks exist. *(edge — see below)* |
|  | `test_hmac` | hmac — pure-Python over a hash. |
|  | `test_html` | html escaping/entities — pure (web stack). |
| ✅ | `test_htmlparser` | html.parser — pure (web stack). |
|  | `test_http_cookiejar` | http.cookiejar — pure (web stack). |
|  | `test_http_cookies` | http.cookies — pure (web stack). |
|  | `test_httplib` | http.client — web stack (needs socket bridge). |
|  | `test_httpservers` | http.server — web stack (needs socket bridge). |
|  | `test_imaplib` | imaplib — IMAP client (net stack). |
|  | `test_import` | Import system — Grail vendors importlib; heavy filesystem/C internals in the test. *(edge — see below)* |
|  | `test_importlib` | importlib package (vendored) — import machinery; some C/fs internals out of reach. *(edge — see below)* |
| ✅ | `test_ipaddress` | ipaddress — pure Python. |
|  | `test_mailbox` | mailbox — email adjacent, but backed by filesystem mailboxes. *(edge — see below)* |
|  | `test_mimetypes` | mimetypes — pure lookup tables (web stack). |
|  | `test_minidom` | xml.dom.minidom (vendored xml). |
|  | `test_modulefinder` | modulefinder — static import graph analysis (tooling). *(edge — see below)* |
|  | `test_multibytecodec` | Multibyte codec engine — C-backed CJK; low priority. *(edge — see below)* |
| ✅ | `test_netrc` | netrc — pure parser (net-config). |
|  | `test_nturl2path` | nturl2path — url<->path conversion (pure). |
|  | `test_pkg` | Package import semantics — import system. *(edge — see below)* |
|  | `test_pkgutil` | pkgutil — package discovery utilities. |
|  | `test_plistlib` | plistlib — pure XML/binary plist parsing (Apple format). *(edge — see below)* |
|  | `test_poplib` | poplib — POP3 client (net stack). |
| ✅ | `test_pulldom` | xml.dom.pulldom (vendored xml). |
|  | `test_pyclbr` | pyclbr — Python class browser (source parsing tool). *(edge — see below)* |
|  | `test_pydoc` | pydoc — introspection + doc HTTP server. *(edge — see below)* |
|  | `test_pyexpat` | pyexpat — C expat XML parser (needed under xml.etree). *(edge — see below)* |
|  | `test_quopri` | quopri — quoted-printable (email encoding). |
|  | `test_robotparser` | robotparser — robots.txt (pure, web stack). |
|  | `test_runpy` | runpy — -m module execution (import/exec machinery). *(edge — see below)* |
| ✅ | `test_sax` | xml.sax (vendored xml). |
|  | `test_secrets` | secrets — crypto-strong tokens (web/security). |
|  | `test_smtplib` | smtplib — SMTP client (net stack). |
|  | `test_smtpnet` | smtplib against a live external server (needs real network). *(edge — see below)* |
|  | `test_socket` | socket — net transport; requires a GemStone GsSocket bridge. *(edge — see below)* |
|  | `test_socketserver` | socketserver — atop sockets. *(edge — see below)* |
| ❗ | `test_ssl` | ssl — C/OpenSSL TLS; needed by the secure net stack. *(edge — see below)* |
|  | `test_stringprep` | stringprep (RFC 3454) — pure (net/security). |
|  | `test_tabnanny` | tabnanny — indentation checker (tokenize-based tool). *(edge — see below)* |
|  | `test_timeout` | Socket timeout behavior (net). *(edge — see below)* |
|  | `test_urllib` | urllib (vendored) — web stack. |
|  | `test_urllib2` | urllib.request — web stack. |
| ✅ | `test_urllib2_localnet` | urllib against a local server (needs a running server). *(edge — see below)* |
|  | `test_urllib2net` | urllib against the live internet (needs real network). *(edge — see below)* |
|  | `test_urllib_response` | urllib response objects — web stack. |
|  | `test_urllibnet` | urllib against the live internet (needs real network). *(edge — see below)* |
| ✅ | `test_urlparse` | urllib.parse — pure URL parsing (web stack). |
|  | `test_uuid` | uuid — pure (some OS node-id lookups optional). |
| ✅ | `test_wave` | wave — pure WAV container parsing (audio format). *(edge — see below)* |
|  | `test_wsgiref` | wsgiref (vendored) — WSGI reference (web stack). |
|  | `test_xml_dom_minicompat` | xml.dom minicompat (vendored xml). |
|  | `test_xml_dom_xmlbuilder` | xml.dom xmlbuilder (vendored xml). |
| ✅ | `test_xml_etree` | xml.etree.ElementTree (vendored xml). |
|  | `test_xmlrpc` | xmlrpc — web stack. |
| ❗ | `test_zipapp` | zipapp — build/run .pyz apps (zip + exec). *(edge — see below)* |
|  | `test_zipfile` | zipfile — ZIP archives (pure-ish + zlib codec). *(edge — see below)* |
|  | `test_zipimport` | zipimport — importing modules from ZIPs. *(edge — see below)* |
|  | `test_zipimport_support` | zipimport traceback/source support. *(edge — see below)* |

---

## Out-of-scope

### OS — process control, syscalls, real filesystem  ·  57 modules

Grail runs inside the GemStone object server; there is no child-process model or general POSIX filesystem to test against.

| Module | Reason |
|--------|--------|
| `test__locale` | C locale (_locale) bindings. |
| `test_c_locale_coercion` | C-locale coercion at interpreter startup. |
| `test_concurrent_futures` | Thread/Process pool executors — real threads & processes. *(edge — see below)* |
| `test_dbm` | dbm — on-disk key/value store. |
| `test_dbm_dumb` | dumbdbm — file-backed store. |
| `test_dbm_gnu` | gdbm (C). |
| `test_dbm_ndbm` | ndbm (C). |
| `test_eintr` | EINTR syscall-retry semantics. |
| `test_ensurepip` | pip bootstrap (subprocess/packaging). |
| `test_errno` | errno constants. |
| `test_fcntl` | fcntl syscalls. |
| `test_file` | Built-in file objects on real files. |
| `test_file_eintr` | File I/O EINTR retry. |
| `test_filecmp` | filecmp — filesystem comparison. |
| `test_fileinput` | fileinput — filesystem. |
| `test_fileio` | FileIO — raw file I/O. |
| `test_fileutils` | Internal file-descriptor utilities. |
| `test_fork1` | os.fork(). |
| `test_glob` | glob — filesystem directory walking. |
| `test_grp` | Unix group database. |
| `test_ioctl` | ioctl syscalls. |
| `test_largefile` | Large real files. |
| `test_locale` | locale — C locale. |
| `test_mmap` | mmap — memory-mapped files. |
| `test_multiprocessing_fork` | multiprocessing (fork start method). |
| `test_multiprocessing_forkserver` | multiprocessing (forkserver). |
| `test_multiprocessing_main_handling` | multiprocessing __main__ handling. |
| `test_multiprocessing_spawn` | multiprocessing (spawn). |
| `test_openpty` | openpty(). |
| `test_os` | os module — the OS interface. |
| `test_popen` | os.popen (subprocess). |
| `test_posix` | posix syscalls. |
| `test_pty` | pseudo-terminals. |
| `test_pwd` | Unix password database. |
| `test_resource` | Unix resource limits. |
| `test_select` | select() syscall. |
| `test_selectors` | selectors — I/O multiplexing over syscalls. |
| `test_shelve` | shelve — dbm+pickle persistence. |
| `test_shutil` | shutil — high-level filesystem ops. |
| `test_signal` | POSIX signals. |
| `test_site` | site — startup/site-packages setup. |
| `test_stat` | stat / os.stat. |
| `test_subprocess` | subprocess — child processes.  *(Was excluded because Grail had no child processes; it now does, over `GsHostProcess`.  The module is a re-scoping candidate — the blocker is no longer the capability but the fd/signal control the test exercises.)* |
| `test_syslog` | syslog. |
| `test_tarfile` | tarfile — archive + filesystem. |
| `test_tempfile` | tempfile — real temp files. |
| `test_termios` | termios — terminal I/O control. |
| `test_threadedtempfile` | Threads + temp files. |
| `test_threadsignals` | Signals delivered to threads. |
| `test_tty` | tty control. |
| `test_unicode_file` | Unicode filenames on the filesystem. |
| `test_unicode_file_functions` | Unicode filesystem functions. |
| `test_venv` | venv — creates environments (subprocess/fs). |
| `test_wait3` | wait3() syscall. |
| `test_wait4` | wait4() syscall. |
| `test_webbrowser` | webbrowser — launches an external browser. |
| `test_zipfile64` | ZIP64 large-file archives. |

### GUI / terminal-UI / interactive REPL  ·  15 modules

No display, terminal, or interactive line editor in a server session.

| Module | Reason |
|--------|--------|
| `test__colorize` | Terminal ANSI color output helper. |
| `test_cmd` | cmd — interactive line-command framework (pure, but interactive-terminal oriented). *(edge — see below)* |
| `test_code_module` | code.InteractiveInterpreter (REPL). |
| `test_curses` | curses terminal UI. |
| `test_getpass` | getpass — terminal password entry. |
| `test_idle` | IDLE Tk GUI. |
| `test_pyrepl` | New interactive REPL. |
| `test_readline` | GNU readline (terminal). |
| `test_repl` | Interactive interpreter REPL. |
| `test_rlcompleter` | readline tab-completion. |
| `test_tcl` | Tcl interpreter (Tk). |
| `test_tkinter` | Tkinter GUI toolkit. |
| `test_ttk` | Tk themed widgets. |
| `test_ttk_textonly` | Tk ttk (text-only subset). |
| `test_turtle` | turtle graphics GUI. |

### C runtime · interpreter internals · bytecode · CPython tooling  ·  80 modules

These assert CPython's own C internals — bytecode, the compiler pipeline, the C-API, debuggers/profilers. Grail is a different implementation, so they are not applicable (the pattern already used in cpython_suite_skips.txt).

| Module | Reason |
|--------|--------|
| `test__interpchannels` | Sub-interpreter channels (C-level). |
| `test__interpreters` | Sub-interpreters (C-level). |
| `test__opcode` | Bytecode opcode internals. |
| `test_asdl_parser` | ASDL grammar parser used to generate CPython's AST. |
| `test_ast` | CPython's ast module reflects its own compiler AST; Grail has an independent AST. Python-level ast is arguably useful tooling. *(edge — see below)* |
| `test_audit` | sys.audit hooks (C). |
| `test_bdb` | bdb debugger framework — depends on sys.settrace hooks. *(edge — see below)* |
| `test_bigaddrspace` | Huge-address-space stress (bigmem). |
| `test_bigmem` | Multi-gigabyte object stress. |
| `test_buffer` | PEP 3118 buffer protocol — C-level memory export. *(edge — see below)* |
| `test_build_details` | Interpreter build metadata. |
| `test_bz2` | bz2 — C compression codec (pure reimpl theoretically possible). *(edge — see below)* |
| `test_capi` | CPython C API. |
| `test_cext` | C-extension build/load. |
| `test_clinic` | Argument Clinic C code generator. |
| `test_cmd_line` | python(1) command-line handling. |
| `test_cmd_line_script` | Script/-m launch handling. |
| `test_code` | Code objects (C). |
| `test_codeop` | compile_command() REPL helper — needs the compiler. |
| `test_compile` | compile() / bytecode compilation. |
| `test_compileall` | .pyc precompilation. |
| `test_compiler_assemble` | Bytecode assembler. |
| `test_compiler_codegen` | Bytecode code generator. |
| `test_cppext` | C++ extension build. |
| `test_cprofile` | cProfile — C profiler (trace hooks). |
| `test_crossinterp` | Cross-interpreter data passing (C). |
| `test_ctypes` | ctypes FFI. |
| `test_dbm_sqlite3` | sqlite3-backed dbm (C extension). |
| `test_dis` | Bytecode disassembler. |
| `test_embed` | Embedding the CPython runtime. |
| `test_external_inspection` | Inspecting another process's interpreter state. |
| `test_faulthandler` | faulthandler (C, signals). |
| `test_frame` | Frame objects (C introspection). |
| `test_frozen` | Frozen modules. |
| `test_gdb` | gdb Python integration. |
| `test_generated_cases` | Generated interpreter opcode cases. |
| `test_getpath` | Interpreter path computation at startup. |
| `test_gzip` | gzip — C zlib codec. *(edge — see below)* |
| `test_interpreters` | Sub-interpreters API. |
| `test_lltrace` | Low-level interpreter tracing. |
| `test_lzma` | lzma — C compression codec. *(edge — see below)* |
| `test_marshal` | marshal — bytecode/object serialization (impl format). |
| `test_memoryview` | memoryview — buffer protocol (C memory). *(edge — see below)* |
| `test_monitoring` | sys.monitoring (C hooks). |
| `test_opcache` | Adaptive opcode cache (C). |
| `test_opcodes` | Opcode semantics (C). |
| `test_optimizer` | Bytecode/tier-2 optimizer (C). |
| `test_pdb` | pdb debugger (trace hooks). |
| `test_peepholer` | Peephole optimizer (C). |
| `test_peg_generator` | PEG parser generator. |
| `test_perf_profiler` | Linux perf profiler integration. |
| `test_perfmaps` | perf map files (JIT symbolization). |
| `test_picklebuffer` | PickleBuffer — out-of-band buffer (C). |
| `test_profile` | profile — trace-hook profiler. |
| `test_pstats` | pstats — profiler statistics. |
| `test_py_compile` | py_compile — source→.pyc. |
| `test_regrtest` | The CPython regression-test runner itself. |
| `test_remote_pdb` | Remote debugger attach. |
| `test_script_helper` | Test-suite helper for launching scripts. |
| `test_sqlite3` | sqlite3 — C database extension. |
| `test_stable_abi_ctypes` | Stable ABI surface (ctypes). |
| `test_structseq` | structseq — C struct-sequence base type. *(edge — see below)* |
| `test_sundry` | Smoke-imports obscure/impl modules. |
| `test_support` | test.support harness helpers. |
| `test_symtable` | symtable — compiler symbol tables. |
| `test_sys` | sys — dominated by interpreter-implementation details. *(edge — see below)* |
| `test_sys_setprofile` | sys.setprofile hooks. |
| `test_sys_settrace` | sys.settrace hooks. |
| `test_sysconfig` | sysconfig — build configuration. |
| `test_tools` | CPython Tools/ scripts. |
| `test_trace` | trace — line/coverage tracing (hooks). |
| `test_tracemalloc` | tracemalloc — C allocator instrumentation. |
| `test_type_cache` | Type attribute cache (C). |
| `test_unparse` | ast.unparse — depends on the CPython ast module. *(edge — see below)* |
| `test_utf8_mode` | PYTHONUTF8 interpreter mode (startup). |
| `test_xml_etree_c` | C-accelerated ElementTree (_elementtree). |
| `test_xxlimited` | Example limited-API C extension. |
| `test_xxtestfuzz` | Fuzz-test C harness. |
| `test_zlib` | zlib — C DEFLATE codec. *(edge — see below)* |
| `test_zstd` | zstandard — C compression codec (new in 3.14). |

### Refcount/GC timing · weakref · real & free-threading  ·  9 modules

GemStone uses mark-sweep GC (no refcounting, so no deterministic __del__) and cooperative green threads (no real/free-threading). Same rationale as the existing per-test skips.

| Module | Reason |
|--------|--------|
| `test_finalization` | __del__/finalization ordering — refcount/GC timing. |
| `test_free_threading` | Free-threading (GIL-disabled) build. |
| `test_gc` | gc module — refcount/cycle collector (Grail is mark-sweep). |
| `test_thread` | _thread low-level threads (real). |
| `test_thread_local_bytecode` | Per-thread bytecode (free-threading). |
| `test_threading` | threading — real OS threads (Grail is cooperative-green). |
| `test_threading_local` | threading.local. |
| `test_weakref` | weakref — refcount/GC-driven reclamation. |
| `test_weakset` | WeakSet — weakref-based. |

### Hardware / OS-platform specific  ·  18 modules

Bound to a specific OS/CPU/toolchain (Windows, macOS, Android, Solaris/BSD poll flavors).

| Module | Reason |
|--------|--------|
| `test__osx_support` | macOS build/toolchain support. |
| `test_android` | Android platform specifics. |
| `test_apple` | Apple (iOS/macOS) platform specifics. |
| `test_devpoll` | Solaris /dev/poll. |
| `test_dtrace` | DTrace static probes. |
| `test_epoll` | Linux epoll. |
| `test_kqueue` | BSD kqueue. |
| `test_launcher` | Windows py.exe launcher. |
| `test_msvcrt` | Microsoft C runtime. |
| `test_osx_env` | macOS environment specifics. |
| `test_platform` | platform — OS/architecture detection. *(edge — see below)* |
| `test_poll` | poll() syscall. |
| `test_startfile` | os.startfile (Windows). |
| `test_winapi` | Windows API. |
| `test_winconsoleio` | Windows console I/O. |
| `test_winreg` | Windows registry. |
| `test_winsound` | Windows sound. |
| `test_wmi` | Windows Management Instrumentation. |

---

## Judgment calls

Modules where the in/out line is genuinely arguable — flip any of these and I'll
re-tier. Grouped by the call to make:

| Module | Lean | The question |
|--------|------|--------------|
| `test_ast` | OUT | CPython's ast module reflects its own compiler AST; Grail has an independent AST. Python-level ast is arguably useful tooling. |
| `test_bdb` | OUT | bdb debugger framework — depends on sys.settrace hooks. |
| `test_buffer` | OUT | PEP 3118 buffer protocol — C-level memory export. |
| `test_bz2` | OUT | bz2 — C compression codec (pure reimpl theoretically possible). |
| `test_gzip` | OUT | gzip — C zlib codec. |
| `test_lzma` | OUT | lzma — C compression codec. |
| `test_memoryview` | OUT | memoryview — buffer protocol (C memory). |
| `test_structseq` | OUT | structseq — C struct-sequence base type. |
| `test_sys` | OUT | sys — dominated by interpreter-implementation details. |
| `test_unparse` | OUT | ast.unparse — depends on the CPython ast module. |
| `test_zlib` | OUT | zlib — C DEFLATE codec. |
| `test_cmd` | OUT | cmd — interactive line-command framework (pure, but interactive-terminal oriented). |
| `test_platform` | OUT | platform — OS/architecture detection. |
| `test_concurrent_futures` | OUT | Thread/Process pool executors — real threads & processes. |
| `test_atexit` | P3 | atexit callbacks — pure-ish, but 'interpreter exit' semantics differ in a persistent DB VM. |
| `test_bufio` | P3 | Buffered I/O layer — in-scope for StringIO/BytesIO; real-file backing is OS. |
| `test_inspect` | P3 | inspect — needs frame/code/signature introspection depth. |
| `test_io` | P3 | io core — StringIO/BytesIO in-scope; FileIO backing is OS. |
| `test_linecache` | P3 | linecache — caches source lines (reads files, but a caching layer). |
| `test_pathlib` | P3 | pathlib — pure path algebra is in-scope; stat/IO methods are OS. |
| `test_struct` | P3 | struct — binary packing; C-accelerated but pure semantics. |
| `test_time` | P3 | time — clock/sleep; pure formatting parts in-scope, OS clock parts not. |
| `test_traceback` | P3 | traceback — needs frame/tb introspection. |
| `test_unicodedata` | P3 | unicodedata — large UCD tables (C-backed). |
| `test_xpickle` | P3 | Cross-Python-version pickle compatibility. |
| `test___all__` | P4 | Meta-test asserting every stdlib module's __all__; depends on importing the whole library — low-priority hygiene check. |
| `test_array` | P4 | array.array typed buffers — C-backed; a pure reimplementation is possible but non-trivial. |
| `test_asyncio` | P4 | asyncio (vendored) — coroutine/task machinery is in-scope; the selector event loop needs a GemStone I/O bridge. |
| `test_codecencodings_cn` | P4 | CJK (GB*) codec tables — large, C-table-backed; low priority. |
| `test_codecencodings_hk` | P4 | CJK (HK) codec tables — large, C-table-backed; low priority. |
| `test_codecencodings_iso2022` | P4 | ISO-2022 stateful codecs — C-backed; low priority. |
| `test_codecencodings_jp` | P4 | Japanese codec tables — C-table-backed; low priority. |
| `test_codecencodings_kr` | P4 | Korean codec tables — C-table-backed; low priority. |
| `test_codecencodings_tw` | P4 | Traditional-Chinese codec tables — C-table-backed; low priority. |
| `test_codecmaps_cn` | P4 | CJK codec round-trip maps (network-fetched data) — low priority. |
| `test_codecmaps_hk` | P4 | CJK codec round-trip maps — low priority. |
| `test_codecmaps_jp` | P4 | CJK codec round-trip maps — low priority. |
| `test_codecmaps_kr` | P4 | CJK codec round-trip maps — low priority. |
| `test_codecmaps_tw` | P4 | CJK codec round-trip maps — low priority. |
| `test_docxmlrpc` | P4 | XML-RPC docserver — net + server; low priority. |
| `test_hashlib` | P4 | hashlib — crypto digests; C/OpenSSL-accelerated but pure fallbacks exist. |
| `test_import` | P4 | Import system — Grail vendors importlib; heavy filesystem/C internals in the test. |
| `test_importlib` | P4 | importlib package (vendored) — import machinery; some C/fs internals out of reach. |
| `test_mailbox` | P4 | mailbox — email adjacent, but backed by filesystem mailboxes. |
| `test_modulefinder` | P4 | modulefinder — static import graph analysis (tooling). |
| `test_multibytecodec` | P4 | Multibyte codec engine — C-backed CJK; low priority. |
| `test_pkg` | P4 | Package import semantics — import system. |
| `test_plistlib` | P4 | plistlib — pure XML/binary plist parsing (Apple format). |
| `test_pyclbr` | P4 | pyclbr — Python class browser (source parsing tool). |
| `test_pydoc` | P4 | pydoc — introspection + doc HTTP server. |
| `test_pyexpat` | P4 | pyexpat — C expat XML parser (needed under xml.etree). |
| `test_runpy` | P4 | runpy — -m module execution (import/exec machinery). |
| `test_smtpnet` | P4 | smtplib against a live external server (needs real network). |
| `test_socket` | P4 | socket — net transport; requires a GemStone GsSocket bridge. |
| `test_socketserver` | P4 | socketserver — atop sockets. |
| `test_ssl` | P4 | ssl — C/OpenSSL TLS; needed by the secure net stack. |
| `test_tabnanny` | P4 | tabnanny — indentation checker (tokenize-based tool). |
| `test_timeout` | P4 | Socket timeout behavior (net). |
| `test_urllib2_localnet` | P4 | urllib against a local server (needs a running server). |
| `test_urllib2net` | P4 | urllib against the live internet (needs real network). |
| `test_urllibnet` | P4 | urllib against the live internet (needs real network). |
| `test_wave` | P4 | wave — pure WAV container parsing (audio format). |
| `test_zipapp` | P4 | zipapp — build/run .pyz apps (zip + exec). |
| `test_zipfile` | P4 | zipfile — ZIP archives (pure-ish + zlib codec). |
| `test_zipimport` | P4 | zipimport — importing modules from ZIPs. |
| `test_zipimport_support` | P4 | zipimport traceback/source support. |

*66 flagged.*

---

## Where the harness stands

The manifest grew 19 → 32 → 50 modules in phases 1–4, then to 105 entries by
2026-09-27, 114 with the tracked baselines below, and 115 with
`test_contextlib`. Live per-module rows are
in [CPython_Suite_Scoreboard.md](CPython_Suite_Scoreboard.md). This section
records only what changes slowly: what is still open, and why.

**Eleven of the 114 rows on the committed board are not OK.** Re-read from
the board after the 2026-09-29 refresh (41bda4e4), which retired the `test_zipapp` row this
list used to carry and landed the nine tranche modules below with real counts:

- `test_ssl`, FAIL 196t 5F/0E. The remaining ssl gaps.
- `test_codecmaps_tw`, SKIP. All 6 tests skip.
- the nine wired on 2026-09-28: `test_statistics` ERROR 371t 37F/201E,
  `test_abc` ERROR 72t 0F/64E, `test_userstring` ERROR 71t 1F/59E,
  `test_exception_group` ERROR 52t 23F/1E, `test_except_star` ERROR 60t 10F/11E,
  `test_generators` ERROR 50t 10F/10E, `test_long` ERROR 47t 6F/8E,
  `test_exception_hierarchy` ERROR 16t 2F/3E, `test_copyreg` FAIL 6t 2F/0E.

`test_contextlib`, wired below, joins them as a twelfth at the next nightly.

Every phase-4 module is green, including the eight this section used to list
as not yet green (`test_datetime`, `test_enum`, `test_copy`, `test_listcomps`,
`test_property`, `test_scope`, `test_functools`, `test_traceback`). The nine modules
wired on 2026-09-28 are on the board with the counts listed above.

Two per-test entries in `scripts/cpython_suite_skips.txt` are worth knowing:

- `test_deque.test_extend` hangs the scoring session. `d.extend(d)`
  consumes the live deque it appends to, which is unbounded and uncatchable.
  Deleting that skip is its regression test.
- `test_format.test_common_format` asks for a 123456-fraction-digit float
  string. That exceeds GemStone's LargeInteger ceiling (~39000 decimal
  digits), so Grail raises `OverflowError`. The skip records a VM limit, not
  a missing fix.

## test_contextlib (tracked baseline, wired 2026-09-30)

Not part of the 26-candidate trial above — neither wired nor deferred there, so
it had simply never been considered. It meets that trial's rule (it RUNS today:
no IMPORTERROR, CRASH or TIMEOUT) and 81 of its 91 tests pass. The score below
was measured on the TEXT arm; the nightly measures IR, so the counts its first
run commits may differ.

| Module | Trial score | Main causes |
|--------|-------------|-------------|
| `test_contextlib` | 91t, 3F 7E (text arm) | `contextlib.chdir` is deliberately unsupported (3). `_GeneratorContextManager` is not callable, so a context manager cannot be used as a decorator (2). `Condition` and `RLock` lack `_is_owned` (2). One each: the `with`/`__exit__` frame position (#1272), a weakref not cleared in `test_nokeepref`, and an ExceptionGroup. |

**Why it is worth tracking.** Its async sibling `test_contextlib_async` has been
wired all along, and the two share `TestBaseExitStack`. So a defect in ordinary
`with` handling was being reported only through the async module: the frame
position bug on #1272 is IDENTICAL for the sync `ExitStack` — measured, same
`('measure', '1/0')` — and nothing on the board said so. Wiring the sync module
is what stops that class of bug hiding behind its async twin.

## Next tranche (tracked baselines, wired 2026-09-28)

26 unwired in-scope candidates were trialed with CPython 3.14.6's own test
files, on Darwin arm64 at `main` 84821c1e. Nine were wired as tracked
baselines. The rule was that a module must RUN today (no IMPORTERROR, CRASH or
TIMEOUT), so its row enters the board with a real count, and most of that count
should trace to one or two causes.

| Module | Trial score | Main cause |
|--------|-------------|------------|
| `test_statistics` | 371t, 37F 201E | `statistics` lacks `NormalDist` (36) and `StatisticsError` (22). `Decimal` does not understand `_generality` (19). **Since replaced by CPython's own `statistics.py` (#1301), and with CPython's `random.py` (#1305) OK: 371t 0F 0E.** |
| `test_abc` | 72t, 0F 64E | 62 are ONE "could not compile this method (codegen gap)", in `test_factory`'s nested classes. |
| `test_userstring` | 71t, 1F 59E | `UserString` lacks str methods (`find`, `strip`, ...), and `str + UserString` is unsupported. |
| `test_exception_group` | 52t, 23F 1E | Mostly "TypeError not raised" (10); a traceback kept that should be None (3). |
| `test_except_star` | 60t, 10F 11E | The same area as `test_exception_group`. |
| `test_generators` | 50t, 10F 10E | Frame `f_locals`, and a `None` where an exception was expected. |
| `test_long` | 47t, 6F 8E | Grail's integer capacity limit: "result exceeds Grail integer capacity", and "OverflowError not raised". |
| `test_exception_hierarchy` | 16t, 2F 3E | |
| `test_copyreg` | 6t, 2F 0E | |

### Trialed and deferred — with the blocker each log named

The other 17 from the same trial. Recorded so the next pass does not re-trial
them. The August trial this replaces named blockers that are nearly all fixed
now: `test_hash`, `test_super`, `test_funcattrs`, `test_call`, `test_global`,
`test_typechecks`, `test_binop` and others are wired and OK.

**Run today, not yet wired.** Each of these is a candidate for the next
tranche:

| Module | Trial score | Main cause |
|--------|-------------|------------|
| `test_syntax` | 44t, 34F 0E | `compile()` reports `'<string>'` for the filename it was given (12), and SyntaxErrors that are not raised (6). |
| `test_type_annotations` | 48t, 30F 7E | PEP 649: `__annotations__` empty and `__annotate__` missing. |
| `test_source_encoding` | 91t, 17F 14E | Non-UTF-8 source and encoding declarations. |

**One missing name away.** The fix is small, and each unblocks a whole module:

| Module | Tests | Blocker |
|--------|------:|---------|
| `test_argparse` | 1893 | No `py_compile` module. |
| `test_array` | 890 | `array._array_reconstructor` is missing. |
| `test_ordered_dict` | 295 | The pure-Python `OrderedDict` import answers `None` (`'NoneType' object has no attribute 'OrderedDict'`). |
| `test_types` | 129 | `test.support.no_rerun`. |
| `test_exceptions` | 107 | `test.support.SuppressCrashReport`. |
| `test_str` | 138 | No `_string` module. |

**Parser / codegen gaps** (the module does not import):

| Module | Blocker |
|--------|---------|
| `test_grammar` | "Expected OP ':' but got OP ','" at line 1412. |
| `test_patma` | "invalid syntax". |
| `test_fstring` | "malformed \N character escape" (`\N{...}` in an f-string). |
| `test_type_params` | Type parameters on a type alias, `type Alias[...] = ...`, at line 822. |

**The session dies.** Diagnose these before wiring, since a CRASH or TIMEOUT
entering the board fails the gate:

| Module | Outcome |
|--------|---------|
| `test_descr` | CRASH: topaz exits with no result line. |
| `test_defaultdict` | CRASH: the same. |
| `test_range` | TIMEOUT after 600s. `count`/`index`/`__contains__` still walk huge ranges instead of computing arithmetically (`test_contains` fails first). |

**How to re-run this trial.** Copy candidates out of a local CPython 3.14
`Lib/test/` (a Homebrew build ships one under `lib/python3.14/test/`) into `src/python/stdlib/test/`, then
`./scripts/run_cpython_suite.sh test.test_foo test.test_bar` — explicit
arguments override the manifest, but they also **rewrite**
`docs/CPython_Suite_Scoreboard.md` with only the modules you ran, so restore it
from git afterwards and finish with a full manifest run — then
`python3 scripts/sync_scope_status.py` to bring the Status column into line with
the new board. When a module
IMPORTERRORs on a `test.support` name, add it to
`src/python/stdlib/test/support/` — that package is explicitly the growth
surface, and its header says so.

---

<sub>Generated from CPython 3.14.4 `Lib/test/`. Verdicts are recommendations for
review, not a final commitment; the Judgment-calls section lists the arguable ones.</sub>
