# Python Standard Library Coverage in Grail

Survey date: 2026-06-12 (coverage refreshed 2026-07-27 against the
current tree), against the Python 3.14 library index
(https://docs.python.org/3/library/index.html). All P0/P1/P2 items
from the original gap list shipped on 2026-06-12 — per-module details
are in `git log` and the per-module TestCases named below.

Inventory sources: native module classes in `src/smalltalk/Python/*.gs`
(`module subclass:` definitions) and pure-Python modules in
`src/python/stdlib/`.

## Coverage by official index section

Sections mirror the docs.python.org index so the two lists can be
compared side by side. "In Grail" includes partial implementations —
see the deviation notes in the next section for what "partial" means.

| Official section | In Grail | Not in Grail |
|---|---|---|
| Text Processing | string, re (full SRE engine), difflib, textwrap, unicodedata | string.templatelib, stringprep, readline, rlcompleter |
| Binary Data | struct, codecs | — |
| Data Types | datetime, calendar, collections(+abc), heapq, bisect, weakref, types, copy, pprint, reprlib, enum (partial), graphlib, zoneinfo (stub), array (stub) | — |
| Numeric & Mathematical | numbers, math, cmath, decimal, fractions, random, statistics | — |
| Functional Programming | itertools, functools, operator | — |
| File & Directory Access | pathlib (partial), os.path, stat, tempfile, glob, fnmatch, shutil | filecmp, linecache |
| Data Persistence | pickle (partial), copyreg, marshal (partial) | shelve, dbm, sqlite3 |
| Compression & Archiving | zlib (one-shot), gzip (stream-only) | compression.zstd, bz2, lzma, zipfile, tarfile |
| File Formats | csv, configparser, tomllib | netrc, plistlib |
| Cryptographic Services | hashlib, hmac, secrets | — |
| Generic OS Services | os, io (full file objects), time, logging (+config stub), platform, errno | logging.handlers, ctypes |
| Command-line Interface | argparse, getpass | optparse, fileinput, curses, cmd |
| Concurrent Execution | threading (cooperative), queue, contextvars, _thread, subprocess (stub), concurrent.futures (stub) | multiprocessing, sched |
| Networking & IPC | socket, ssl, select, selectors, asyncio (stub), signal (stub) | mmap |
| Internet Data Handling | email (message model + utils), json, mimetypes, base64, binascii, quopri | mailbox |
| Structured Markup | html, html.entities, html.parser, xml.etree (partial) | xml.dom, xml.sax, xml.parsers.expat |
| Internet Protocols | urllib.parse/request/error, http(+client/server/cookies), wsgiref (util+headers), uuid, socketserver, ipaddress | webbrowser, urllib.robotparser, http.cookiejar, ftplib, poplib, imaplib, smtplib, xmlrpc |
| Multimedia | — | wave, colorsys |
| Internationalization | gettext (stub), locale (stub) | — |
| GUIs with Tk | — | tkinter, turtle, IDLE (out of scope) |
| Development Tools | typing, unittest, unittest.mock, doctest (stub), pydoc (stub), test.support (trimmed, for the CPython harness) | — |
| Debugging & Profiling | — | bdb, pdb, timeit, trace, tracemalloc, faulthandler |
| Packaging & Distribution | — | ensurepip, venv, zipapp (out of scope) |
| Python Runtime Services | sys, builtins, warnings, dataclasses, contextlib, abc, traceback, \_\_future\_\_, inspect (partial), gc (stub), annotationlib (stub) | sys.monitoring, sysconfig, \_\_main\_\_, atexit, site |
| Custom Interpreters | — | code, codeop |
| Importing Modules | importlib (+reload/metadata/util), pkgutil, zipimport (stub) | modulefinder, runpy, importlib.resources |
| Language Services | ast, keyword | symtable, token, tokenize, py_compile, compileall, dis, pickletools |
| MS Windows | — | msvcrt, winreg, winsound (out of scope) |
| Unix-specific | shlex | posix, pwd, grp, termios, tty, pty, fcntl, resource, syslog |
| Superseded | getopt | — |

Builtins highlights beyond the module list: real `open()` with
FileIO/TextIOWrapper file objects (`FileIoTestCase`) and a
compile-time `locals()` (`LocalsTestCase`).

Third-party already vendored and working: flask, werkzeug, jinja2,
click, itsdangerous, markupsafe, blinker, requests (partial), twilio,
django (+asgiref, sqlparse).

## Deviation notes for the 2026-06-12 modules

What "in Grail" does NOT include, per module (each has a TestCase of
the same name):

- **open()/io** (`FileIoTestCase`) — no truncate()/fileno(), no
  universal-newline translation; utf-8 + latin-1 encodings only.
- **locals()** (`LocalsTestCase`) — class-body locals() answers the
  module namespace; closure free variables omitted; `f = locals`
  aliasing not rewritten.
- **heapq** — merge() is non-lazy.
- **glob** — no recursive `**` (raises ValueError).
- **fnmatch** — full `[seq]`/`[!seq]` support; translate() is
  approximate.
- **shutil** — no metadata copying (copymode/copystat no-ops), no
  symlinks; copy2 == copy.
- **csv** — dialects via kwargs only; no Sniffer; escapechar on the
  write path only.
- **queue** — poll-based blocking (no Condition in cooperative
  threading); SimpleQueue is an unbounded Queue.
- **configparser** — no ExtendedInterpolation; fixed delimiters and
  comment prefixes.
- **tomllib** — inline tables not frozen; dotted keys don't close
  tables; surrogate \u escapes not rejected.
- **calendar** — computational core + timegm only; no
  TextCalendar/HTMLCalendar.
- **shlex** — split/quote/join only; no streaming lexer class.
- **reprlib** — apply recursive_repr explicitly (method @-decorators
  are dropped by Grail).
- **getpass** — getpass() echoes (no termios layer).
- **unittest** (`UnittestTestCase`) — subTest runs inline (the first
  failing subTest fails the whole test); skip decorators only work
  applied explicitly; tracebacks are "Name: message" strings; main()
  requires a module argument.
- **argparse** — no subparsers, argument groups, mutually exclusive
  groups, prefix abbreviation, or fromfile args.
- **zlib** — one-shot only (zlib format, wbits 9..15); no
  compressobj/decompressobj, raw deflate, or gzip framing (needs
  z_stream — also the prerequisite for zipfile).
- **gzip** — file objects are stream-only (no seek/tell); GzipFile is
  a factory function; fileobj= unsupported; compresslevel ignored.
- **mock** (`MockTestCase`) — no spec/autospec/wraps; MagicMock is
  Mock (no dunder magic); patch is context-manager-only; call sites
  Grail compiled as direct module sends bypass patched module
  attributes (read via getattr, or patch object attributes).
- **wsgiref** — headers + util only; simple_server intentionally
  absent (werkzeug is the serving path).
- **email** (`EmailMessageTestCase`) — no output line folding (the
  generator writes flat messages only); policies are compat32-only (no
  EmailPolicy / structured headers); RFC 2047 header codecs and
  quoted-printable (header.py, charset.py, quoprimime.py) are vendored.

## Remaining gaps, prioritized

1. **zipfile** — needs raw deflate (z_stream / deflateInit2_ in the
   native zlib) first; then zipfile itself is mostly pure Python.
2. **sqlite3** — open design question: CCallout to libsqlite3 is
   feasible, but the killer demo is GemStone-as-the-database, so a
   DB-API shim over GemStone objects may be the better investment.
3. **Stub tier** (cheap import-compatibility wins): atexit, linecache,
   filecmp, netrc, plistlib.  (signal, gc, zoneinfo, locale, gettext,
   html.parser, quopri, and array shipped with the Django 5.2 and
   CPython-harness rounds, 2026-07.)
4. **logging.handlers** (and real handler/formatter wiring behind the
   logging.config stub) — extend the existing logging port.
5. **smtplib / ftplib / http.cookiejar / xmlrpc** — only if a target
   library demands them; socket + ssl exist to build on.
6. **memoryview / the buffer protocol** — `memoryview(x)` is an identity
   stub that returns `x` (see docs/Built-in&nbsp;Functions.md).  A real
   implementation needs a view object over shared storage plus an export
   count on the exporter, which is what CPython's `BufferError` guards
   are built on.  Two `test.test_bytes` cases are skipped for it; the
   tripwire is `BytearrayTestCase >> testMemoryviewIsIdentityStub`,
   which fails as soon as the stub is replaced.

## Out of scope on the GemStone VM (P3)

- subprocess, multiprocessing, concurrent.futures (process pools) — no
  fork/exec model inside a gem worth exposing yet (subprocess and
  concurrent.futures ship as import-compatibility stubs only).
- asyncio — cooperative green threads exist, but the event-loop surface
  is enormous; revisit if a target library demands it (an import stub
  covers the synchronous paths of asgiref/django/jinja2).
- tkinter/turtle/curses/readline, wave/colorsys, msvcrt/winreg,
  pty/termios/fcntl, ctypes, ensurepip/venv, pdb/bdb/tracemalloc.

## Known cross-cutting language gaps (tracked in TODO.md / memory)

Not stdlib modules, but they bite when porting stdlib code:
multiple-inheritance dispatch is a copy-down merge over a real C3
`__mro__` (per-send MRO precedence is approximate — see TODO.md), no
name mangling (`self.__x`), class-body method decorators dropped
(module-level function decorators DO run since 2026-06), `kwargs`
catch-all param name, del-sys.modules str-vs-Symbol bug, eval-path
`class` statements broken (use importlib fixtures), `import x as y`
aliases defeat the native-module call fast path.  Since resolved:
descriptor protocol (`__get__`) on class attributes and user `__new__`
(both 2026-07-10), and isinstance(x, type) / issubclass-on-non-class
now raise catchable Python errors.

### Function metadata (2026-07-29)

`functools.update_wrapper` / `wraps` really copy now, and closures
(`ExecBlock`) carry `__dict__`, `__doc__`, `__type_params__` and support
`__delattr__`.  The side table splits Grail's def-time `__name__` /
`__annotations__` stamps into a SLOT namespace so they stay out of
`func.__dict__`, matching CPython — otherwise `update_wrapper`'s
`__dict__` merge copies them onto every wrapper.  A leading string
literal in a `def` is captured as `__doc__` (FunctionDefAst).

Still missing, in the order they cost conformance:

* **PEP 695 type params.** `def f[T](...)` parses, but the bracket is
  discarded: `__type_params__` is always `()`.  Blocks
  `test_functools`' `TestUpdateWrapper.test_default_update`.
* **PEP 649 `__annotate__`**, and annotations are PEP 563 *source
  strings* rather than evaluated objects (`{'x': 'int'}`, not
  `{'x': int}`).  `WRAPPER_ASSIGNMENTS` therefore names
  `__annotations__` where CPython 3.14 names `__annotate__`.  Blocks
  `test_update_wrapper_annotations`.
* **Docstrings on built-in functions.** `max.__doc__` answers `object`'s
  docstring, not CPython's `max(iterable, ...)` signature text.  Blocks
  `test_builtin_update`.
* **Docstrings on module-level `def`s.** These compile to real methods
  reached through a `BoundMethod`, not to closures, so the
  FunctionDefAst docstring stamp doesn't apply; they still inherit
  `object`'s docstring.  A `module`-side table keyed by function name
  (like `___setFunctionAnnotations___`) is the shape that would fix it.
