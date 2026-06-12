# Python Standard Library Gaps in Grail

Survey date: 2026-06-12, against the Python 3.14 library index
(https://docs.python.org/3/library/index.html).

Inventory sources: native module classes in `src/smalltalk/Python/*.gs`
(`module subclass:` definitions) and pure-Python modules in
`src/python/stdlib/`.

## What Grail already has

| Section | Covered |
|---|---|
| Text processing | string, re (full SRE engine), difflib, unicodedata |
| Binary data | struct, codecs |
| Data types | datetime, collections(+abc), weakref, types, copy, pprint, enum (partial) |
| Numeric | numbers, math, cmath, decimal, fractions, random, statistics |
| Functional | itertools, functools, operator |
| File/dir | pathlib, os.path, stat, tempfile, fnmatch |
| Persistence | pickle, copyreg, marshal |
| File formats | — |
| Crypto | hashlib, hmac, secrets |
| OS services | os (metadata ops), io (StringIO/BytesIO only), time, logging, platform, errno |
| Concurrency | threading (cooperative), _thread, contextvars |
| Networking | socket, ssl, select, selectors |
| Internet data | email (utils), json, mimetypes, base64, binascii |
| Markup | html, html.entities, xml.etree (partial) |
| Internet protocols | urllib.parse/request/error, http(+client/server/cookies), uuid, socketserver, ipaddress |
| Dev/runtime | typing, sys, builtins, warnings, dataclasses, contextlib, abc, traceback, __future__, inspect (partial) |
| Importing | importlib (+reload), pkgutil, zipimport (stub) |
| Language | ast, keyword |

Third-party already vendored and working: flask, werkzeug, jinja2, click,
itsdangerous, markupsafe, blinker, requests (partial), twilio.

## Prioritized gaps

Priority weighs: (a) how often real-world Python hits the module,
(b) whether it blocks Grail's trajectories (Flask apps, REST/twilio,
GemStone-resident business logic), (c) feasibility on the GemStone VM.

### P0 — blocks ordinary programs

1. **`open()` builtin + real file objects in `io`** — DONE 2026-06-12.
   `FileIO` (binary) / `TextIOWrapper` (text) over server-side `GsFile`
   in `io_module.gs`; `open()` builtin (fixed-arity 1–4 args plus
   `_open:kw:` for kwargs) and `io.open` alias. Modes r/w/a/x with
   +/b/t, utf-8 (default) and latin-1 encodings, read/readline(s)/
   write(lines)/seek/tell/flush/close, iteration, context manager,
   FileNotFoundError/FileExistsError/IsADirectoryError mapping.
   Not supported (raise OSError): truncate(), fileno(); no
   universal-newline translation. Tests: `FileIoTestCase` (27).
2. **`locals()`** — DONE 2026-06-12. Compile-time rewrite in CallAst
   (`printLocalsCallOn:`): emits the enclosing function's variable set
   as name/value pairs; `builtins ___buildLocals___:` filters unbound
   (nil) entries into a fresh dict. Module-level locals() emits `self`
   (== globals()). V1 gaps: class-body locals() answers the module
   namespace; closure free variables omitted; aliased `f = locals` not
   rewritten. Tests: `LocalsTestCase` (8).

### P1 — small, pure-Python, high-frequency (each ≤ a day)

3. **heapq** — DONE 2026-06-12 (`HeapqTestCase`; merge() non-lazy).
4. **glob** — DONE 2026-06-12 (`GlobTestCase`; no `**`, raises
   ValueError). Required extending fnmatch with `[seq]`/`[!seq]`
   character classes (`FnmatchTestCase`).
5. **textwrap** — DONE 2026-06-12 (`TextwrapTestCase`; dedent/indent
   per CPython, wrap/fill/shorten greedy, no long-word breaking).
6. **shutil (subset)** — DONE 2026-06-12 (`ShutilTestCase`;
   copyfile/copy/copytree/move/rmtree, no metadata/symlinks). Exposed
   and fixed an os bug: listdir reported '.'/'..'.
7. **csv** — DONE 2026-06-12 (`CsvTestCase`; reader/writer/Dict*,
   multi-line quoted fields, QUOTE_* policies; kwargs-only dialects,
   no Sniffer).
8. **bisect** — DONE 2026-06-12 (`BisectTestCase`; pure Python, no
   key= param yet).
9. **queue** — DONE 2026-06-12 (`QueueTestCase`; poll-based blocking
   under the cooperative scheduler — no Condition; PriorityQueue over
   heapq; SimpleQueue = unbounded Queue).
10. **reprlib** — DONE 2026-06-12 (`ReprlibTestCase`; Repr/aRepr/
    repr/recursive_repr; note: apply recursive_repr explicitly —
    method @-decorators are dropped).
11. **shlex** — DONE 2026-06-12 (`ShlexTestCase`; split/quote/join,
    no lexer class).
12. **configparser** — DONE 2026-06-12 (`ConfigparserTestCase`;
    sections/DEFAULT/interpolation/getters/mapping access/write; no
    ExtendedInterpolation).
13. **tomllib** — DONE 2026-06-12 (`TomllibTestCase`; hand-rolled
    recursive descent, full TOML 1.0 value surface incl. RFC 3339
    datetimes; inline tables not frozen, dotted keys don't close
    tables). **P1 is complete.**
14. **calendar** — DONE 2026-06-12 (`CalendarTestCase`; computational
    core + timegm; no TextCalendar formatting classes).
15. **getpass / getopt** — DONE 2026-06-12 (`GetpassTestCase` /
    `GetoptTestCase`; getpass() echoes — no termios layer).

### P2 — bigger efforts, high leverage

16. **unittest** — DONE 2026-06-12 (`UnittestTestCase`; TestCase with
    the standard assertion set, loader/suite/result/runner,
    main(module=...)). No mock or subTest; skip decorators only work
    applied explicitly. Side fix: `module` now has a safe `__dir__`
    (the inherited one let dir+getattr execute popitem/clear).
17. **argparse** — DONE 2026-06-12 (`ArgparseTestCase`; actions,
    nargs, type/choices/required, option-value forms, clusters, '--',
    set_defaults, minimal help; no subparsers/groups/abbreviation).
18. **zlib (real)** — DONE 2026-06-12 (`ZlibTestCase`; native module
    over /usr/lib/libz.dylib via CCallout: compress/decompress (zlib
    format, wbits 9..15), crc32/adler32, zlib.error; no streaming
    objects / raw deflate / gzip framing yet — those need z_stream,
    which is also the path to zipfile).
18b. **gzip** — DONE 2026-06-12 (`GzipTestCase`; files over GsFile's
    transparent zlib compression via io._gzip_open; in-memory
    compress/decompress via temp file; stream-only, no seek/tell).
18c. **unittest.mock** — DONE 2026-06-12 (`MockTestCase`; Mock/patch/
    sentinel/call/ANY as top-level `mock`, aliased to unittest.mock;
    no spec/autospec; direct-send call sites bypass patched module
    attrs — documented).
19. **email (full message model)** — only utils today; smtplib later.
    THE remaining P2 item.
20. **wsgiref** — DONE 2026-06-12 (`WsgirefTestCase`; headers.Headers
    + util; simple_server intentionally absent — werkzeug serves).
21. **sqlite3** — CCallout to libsqlite3; big, but the killer demo is
    GemStone-as-the-database, so consider a DB-API shim over GemStone
    objects instead.
22. **signal / atexit / gc** — thin façades over GemStone facilities
    (mostly no-op stubs to make imports succeed).
23. **zoneinfo / locale / gettext** — stubs first; real data later.

### P3 — out of scope / not feasible on the GemStone VM

- subprocess, multiprocessing, concurrent.futures (process pools) — no
  fork/exec model inside a gem worth exposing yet.
- asyncio — cooperative green threads exist, but the event-loop surface
  is enormous; revisit if a target library demands it.
- tkinter/turtle/curses/readline, wave/colorsys, msvcrt/winreg,
  pty/termios/fcntl, ctypes, ensurepip/venv, pdb/bdb/tracemalloc.

## Known cross-cutting language gaps (tracked in TODO.md / memory)

Not stdlib modules, but they bite when porting stdlib code: no multiple
inheritance (C3 MRO), no name mangling (`self.__x`), module-level
decorators dropped, `kwargs` catch-all param name, descriptor protocol
(`__get__`) on class attributes, user `__new__` never invoked,
del-sys.modules str-vs-Symbol bug.
