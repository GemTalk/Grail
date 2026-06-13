# Python Standard Library Coverage in Grail

Survey date: 2026-06-12, against the Python 3.14 library index
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
| Data Types | datetime, calendar, collections(+abc), heapq, bisect, weakref, types, copy, pprint, reprlib, enum (partial) | zoneinfo, array, graphlib |
| Numeric & Mathematical | numbers, math, cmath, decimal, fractions, random, statistics | — |
| Functional Programming | itertools, functools, operator | — |
| File & Directory Access | pathlib (partial), os.path, stat, tempfile, glob, fnmatch, shutil | filecmp, linecache |
| Data Persistence | pickle (partial), copyreg, marshal (partial) | shelve, dbm, sqlite3 |
| Compression & Archiving | zlib (one-shot), gzip (stream-only) | compression.zstd, bz2, lzma, zipfile, tarfile |
| File Formats | csv, configparser, tomllib | netrc, plistlib |
| Cryptographic Services | hashlib, hmac, secrets | — |
| Generic OS Services | os, io (full file objects), time, logging, platform, errno | logging.config/handlers, ctypes |
| Command-line Interface | argparse, getpass | optparse, fileinput, curses, cmd |
| Concurrent Execution | threading (cooperative), queue, contextvars, _thread | multiprocessing, concurrent.futures, subprocess, sched |
| Networking & IPC | socket, ssl, select, selectors | asyncio, signal, mmap |
| Internet Data Handling | email (message model + utils), json, mimetypes, base64, binascii | mailbox, quopri |
| Structured Markup | html, html.entities, xml.etree (partial) | html.parser, xml.dom, xml.sax, xml.parsers.expat |
| Internet Protocols | urllib.parse/request/error, http(+client/server/cookies), wsgiref (util+headers), uuid, socketserver, ipaddress | webbrowser, urllib.robotparser, http.cookiejar, ftplib, poplib, imaplib, smtplib, xmlrpc |
| Multimedia | — | wave, colorsys |
| Internationalization | — | gettext, locale |
| GUIs with Tk | — | tkinter, turtle, IDLE (out of scope) |
| Development Tools | typing, unittest, unittest.mock | pydoc, doctest, test.support |
| Debugging & Profiling | — | bdb, pdb, timeit, trace, tracemalloc, faulthandler |
| Packaging & Distribution | — | ensurepip, venv, zipapp (out of scope) |
| Python Runtime Services | sys, builtins, warnings, dataclasses, contextlib, abc, traceback, \_\_future\_\_, inspect (partial) | sys.monitoring, sysconfig, \_\_main\_\_, atexit, gc, annotationlib, site |
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
click, itsdangerous, markupsafe, blinker, requests (partial), twilio.

## Deviation notes for the 2026-06-12 modules

What "in Grail" does NOT include, per module (each has a TestCase of
the same name):

- **open()/io** (`FileIoTestCase`) — no truncate()/fileno(), no
  universal-newline translation; utf-8 + latin-1 encodings only.
- **locals()** (`LocalsTestCase`) — class-body locals() answers the
  module namespace; closure free variables omitted; `f = locals`
  aliasing not rewritten.
- **heapq** — merge() is non-lazy.
- **bisect** — no key= parameter.
- **textwrap** — wrap/fill/shorten are greedy; no long-word breaking.
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
- **unittest** (`UnittestTestCase`) — no subTest; skip decorators only
  work applied explicitly; tracebacks are "Name: message" strings;
  main() requires a module argument.
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
- **email** (`EmailMessageTestCase`) — no RFC 2047 encoded words,
  quoted-printable decode, output line folding, or policies.

## Remaining gaps, prioritized

1. **zipfile** — needs raw deflate (z_stream / deflateInit2_ in the
   native zlib) first; then zipfile itself is mostly pure Python.
2. **sqlite3** — open design question: CCallout to libsqlite3 is
   feasible, but the killer demo is GemStone-as-the-database, so a
   DB-API shim over GemStone objects may be the better investment.
3. **Stub tier** (cheap import-compatibility wins): signal, atexit,
   gc, zoneinfo, locale, gettext, html.parser, quopri, linecache,
   filecmp, netrc, plistlib, array.
4. **logging.config / logging.handlers** — extend the existing
   logging port.
5. **smtplib / ftplib / http.cookiejar / xmlrpc** — only if a target
   library demands them; socket + ssl exist to build on.

## Out of scope on the GemStone VM (P3)

- subprocess, multiprocessing, concurrent.futures (process pools) — no
  fork/exec model inside a gem worth exposing yet.
- asyncio — cooperative green threads exist, but the event-loop surface
  is enormous; revisit if a target library demands it.
- tkinter/turtle/curses/readline, wave/colorsys, msvcrt/winreg,
  pty/termios/fcntl, ctypes, ensurepip/venv, pdb/bdb/tracemalloc.

## Known cross-cutting language gaps (tracked in TODO.md / memory)

Not stdlib modules, but they bite when porting stdlib code: no multiple
inheritance (C3 MRO), no name mangling (`self.__x`), module-level AND
class-body method decorators dropped, `kwargs` catch-all param name,
descriptor protocol (`__get__`) on class attributes, user `__new__`
never invoked, del-sys.modules str-vs-Symbol bug, eval-path `class`
statements broken (use importlib fixtures), `import x as y` aliases
defeat the native-module call fast path, isinstance(x, type) /
issubclass-on-non-class raise uncatchable Smalltalk errors (probe
`getattr(obj, "__mro__", None)` instead).
