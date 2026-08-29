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
| Binary Data | struct, codecs (registry + `encodings`: utf-8, utf-8-sig, ascii, latin-1, utf-16 +le/be, raw-unicode-escape, unicode-escape, cp1252) | the other ~90 CPython codecs (the CJK sets, the rest of the cp\*/iso8859-\* charmaps, the base64/bz2/hex "transform" codecs) |
| Data Types | datetime, calendar, collections(+abc), heapq, bisect, weakref, types, copy, pprint, reprlib, enum (partial), graphlib, zoneinfo (stub), array (stub) | — |
| Numeric & Mathematical | numbers, math, cmath, decimal, fractions, random, statistics | — |
| Functional Programming | itertools, functools, operator | — |
| File & Directory Access | pathlib (partial), os.path, stat, tempfile, glob, fnmatch, shutil | filecmp, linecache |
| Data Persistence | pickle (partial), copyreg, marshal (partial) | shelve, dbm, sqlite3 |
| Compression & Archiving | zlib (one-shot + streaming inflate), gzip (stream-only), zipfile (read), tarfile (read) | compression.zstd, bz2, lzma, zipfile/tarfile WRITE |
| File Formats | csv, configparser, tomllib | netrc, plistlib |
| Cryptographic Services | hashlib, hmac, secrets | — |
| Generic OS Services | os, io (full file objects), time, logging (+config stub), platform, errno | logging.handlers, ctypes |
| Command-line Interface | argparse, getpass | optparse, fileinput, curses, cmd |
| Concurrent Execution | threading (cooperative), queue, contextvars, _thread, subprocess (real, over GsHostProcess), concurrent.futures (stub), multiprocessing (ThreadPool only, inline) | sched |
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
| Python Runtime Services | sys, builtins, warnings, dataclasses, contextlib, abc, traceback, \_\_future\_\_, inspect (partial), gc (stub), annotationlib (stub), site (reports Grail's own directories — see docs/Sys_Path_Bootstrap.md), atexit (registry only — a gem has no observable shutdown, so nothing fires it; call `atexit._run_exitfuncs()`) | sys.monitoring, sysconfig, \_\_main\_\_ |
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
- **io buffered/ABC layer** (`BufferedIoTestCase`) — IOBase / RawIOBase /
  BufferedIOBase / TextIOBase and BufferedReader / BufferedWriter /
  BufferedRWPair / BufferedRandom come from CPython's vendored `_pyio`,
  so their semantics are upstream's.  TEXT mode over a buffer now works
  too: `io.text_encoding` exists, and `io.TextIOWrapper` dispatches on its
  first argument -- a str/PathLike keeps Grail's GsFile-backed wrapper
  (what `open()` answers), a BUFFER goes to `_pyio`'s.  That one had been
  unreachable because it asks `codecs.lookup(enc).incrementaldecoder` and
  `codecs` was a stub; with a real registry behind it, both
  `socket.makefile('rb')` and `makefile('r')` work.
  `_pyio.open` / `_pyio.FileIO` are still out — they are built on the
  POSIX fd calls (`os.open`, `os.read`, `os.lseek`), which Grail's `os`
  does not expose because its file layer is GsFile.  That is what the two
  remaining `test_bufio` errors are.
- **locals()** (`LocalsTestCase`) — class-body locals() answers the
  module namespace; closure free variables omitted; `f = locals`
  aliasing not rewritten.
- **heapq** — merge() is non-lazy.
- **enum** — `_simple_enum` is a no-op stub: it returns the decorated
  class unchanged instead of converting it into an Enum, so a class
  written as `@_simple_enum(IntEnum)` has no `__members__` / member
  lookup.  `StrEnum` members with `__new__` arguments and three-arg
  `type(name, (IntEnum,), {...})` construction are also unsupported.
  Together these are what stop CPython 3.14's `http/__init__.py` (and
  therefore its `http/client.py`) from being taken as an unmodified
  source drop — see the header of `src/python/stdlib/http/client.py`.
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
- **zlib** — DECOMPRESSION is complete: `decompressobj(wbits)` drives
  libz's `inflateInit2_`/`inflate`/`inflateEnd` over a real `z_stream`,
  so every windowBits CPython accepts works (8..15 zlib, -8..-15 raw
  deflate, 24..31 gzip, 40..47 auto-detect), with `eof`,
  `unused_data`, `unconsumed_tail` and the `max_length` cap.
  `decompress()` is implemented on top of it, so the one-shot and
  streaming paths share one code path.  COMPRESSION is still one-shot
  only: `compressobj()` raises NotImplementedError (it needs the
  matching `deflateInit2_` half), which is also why zipfile/tarfile are
  read-only.  An abandoned decompressobj leaks libz's window until the
  gem exits — Grail has no finalizers to hang `inflateEnd` on.
- **zipfile** — READ side only, and complete for the two methods that
  occur in practice: stored (0) and deflated (8), including ZIP64
  archives, entry streaming through `ZipFile.open`, `extract`/
  `extractall`, and CRC verification.  Writing raises
  NotImplementedError; so do encrypted entries and bzip2/lzma members.
  `extract` does not restore permissions (no `os.chmod`).
- **tarfile** — READ side only: `open` for `r`, `r:` and `r:gz` (mode
  `r` sniffs the magic bytes rather than the extension), `getmembers`,
  `getnames`, `getmember`, `extractfile`, `extract`, `extractall` and
  iteration, over ustar, GNU-long-name and PAX archives.  `r:gz`
  inflates into a TEMP FILE rather than memory, because tar needs
  random access and a model tarball is exactly where the in-memory
  shortcut would hurt; `close()` removes it.  bz2/xz raise
  CompressionError; writing raises NotImplementedError; symlinks and
  hardlinks are recorded on the TarInfo but not recreated on extract;
  mode/owner/mtime are not restored.
- **gzip** — file objects are stream-only (no seek/tell); GzipFile is
  a factory function; fileobj= unsupported; compresslevel ignored.
- **mock** (`MockTestCase`) — no spec/autospec/wraps; MagicMock is
  Mock (no dunder magic); patch is context-manager-only; call sites
  Grail compiled as direct module sends bypass patched module
  attributes (read via getattr, or patch object attributes).
- **pickle** — a bounded encoder over Grail's OWN self-describing
  tagged byte format, NOT the CPython wire protocol: it round-trips the
  object graph within a Grail session, but `dumps` output is not
  readable by CPython (nor vice versa) and the `protocol=` argument is
  accepted and ignored.  `test.test_bool`'s `test_picklevalues` — the
  one remaining failure in that module — asserts the exact CPython
  opcode bytes (`pickle.dumps(True, 0) == b"I01\n."`) and so fails by
  construction; `test_pickle`, which only round-trips, passes.  Closing
  it means implementing the real stack-VM protocol, not patching bool.
- **marshal** — same encoder as pickle (marshal's wire format is
  explicitly an implementation detail in CPython, so this is legal),
  restricted to the value types marshal documents; code objects are
  unsupported, since Grail has no bytecode.
- **wsgiref** — headers + util only; simple_server intentionally
  absent (werkzeug is the serving path).
- **email** (`EmailMessageTestCase`) — no output line folding (the
  generator writes flat messages only); policies are compat32-only (no
  EmailPolicy / structured headers); RFC 2047 header codecs and
  quoted-printable (header.py, charset.py, quoprimime.py) are vendored.

## Remaining gaps, prioritized

1. **Archive WRITING (zipfile/tarfile) + `zlib.compressobj`** — the
   read side landed with the streaming inflater; the write side needs
   the matching `deflateInit2_`/`deflate`/`deflateEnd` half of the
   `z_stream` API, after which `ZipFile(mode='w')` and
   `tarfile.open(mode='w:gz')` are mostly bookkeeping.  Note that a
   zip can already be *read* without it, which is what the kaggle
   download path actually needs.
2. **sqlite3** — open design question: CCallout to libsqlite3 is
   feasible, but the killer demo is GemStone-as-the-database, so a
   DB-API shim over GemStone objects may be the better investment.
3. **Stub tier** (cheap import-compatibility wins): linecache,
   filecmp, netrc, plistlib.  (signal, gc, zoneinfo, locale, gettext,
   html.parser, quopri, and array shipped with the Django 5.2 and
   CPython-harness rounds, 2026-07; atexit with the pip long-tail round,
   2026-08.)
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

- multiprocessing.Process and the process pools (multiprocessing.Pool,
  concurrent.futures.ProcessPoolExecutor) — no fork/exec model inside a gem
  worth exposing.  All three RAISE rather than degrade to serial execution:
  a caller reaching for them wants parallelism, and silently serial results
  are indistinguishable from correct ones until they are merely too slow.
  What ships instead is `multiprocessing.cpu_count()` and
  `multiprocessing.pool.ThreadPool`, which runs its work INLINE on the
  calling thread and hands back an already-complete AsyncResult — the same
  bargain concurrent.futures' Executor stub strikes.  Code that submits work
  and later collects it gets the right answer; code that depends on the
  submitting thread making progress WHILE the work runs will serialise
  instead, and that cannot be papered over.

  **subprocess is no longer in this list.**  The claim that a gem has no
  fork/exec model was wrong: `GsHostProcess` forks with an argv array, hands
  back the pipes as `GsSocket`s, reaps with waitpid and kills with a timeout.
  `subprocess` is now real — Popen, run, check_output and friends, with
  `cwd=`/`env=`/`shell=`/`timeout=` — see `src/smalltalk/Python/subprocess_module.gs`
  and `SubprocessTestCase`.  What it still cannot do is anything needing
  per-child fd or signal control (`preexec_fn`, `pass_fds`,
  `start_new_session`, a file object as a stream), and those raise rather than
  no-op.  `os.fork()` itself remains impossible: a gem cannot fork and remain
  a gem.
- asyncio — cooperative green threads exist, but the event-loop surface
  is enormous; revisit if a target library demands it (an import stub
  covers the synchronous paths of asgiref/django/jinja2).
- tkinter/turtle/curses/readline, wave/colorsys, msvcrt/winreg,
  pty/termios/fcntl, ctypes, ensurepip/venv, pdb/bdb/tracemalloc.

## Known cross-cutting language gaps (tracked in TODO.md / memory)

Not stdlib modules, but they bite when porting stdlib code:
multiple-inheritance dispatch is a copy-down merge over a real C3
`__mro__` (per-send MRO precedence is approximate — see TODO.md), no
name mangling (`self.__x`), `kwargs`
catch-all param name, del-sys.modules str-vs-Symbol bug, eval-path
`class` statements broken (use importlib fixtures), `import x as y`
aliases defeat the native-module call fast path.  Since resolved:
descriptor protocol (`__get__`) on class attributes and user `__new__`
(both 2026-07-10), isinstance(x, type) / issubclass-on-non-class
now raise catchable Python errors, and class-body method decorators
now run (2026-07-30; module-level function decorators since 2026-06).

### `__doc__` on a compiled def (module function or method)

Reads as `object`'s docstring rather than the def's own — and, worse than
being absent, `functools.wraps` therefore *copies* that wrong value onto a
wrapper.  Not decorator-specific: a plain `modfn.__doc__` shows it too.
Docstrings ARE captured for nested defs and lambdas (`ExecBlock`, via the
`___pyNamed___:doc:` stamp); a compiled def has nowhere to put one yet, so
this needs a per-class/per-module docstring registry populated at compile
time.  Visible as `TestCachedProperty.test_doc` and
`TestUpdateWrapper.test_default_update_doc` in `test.test_functools`.

### Function metadata (2026-07-29)

`functools.update_wrapper` / `wraps` really copy now, and closures
(`ExecBlock`) carry `__dict__`, `__doc__`, `__type_params__` and support
`__delattr__`.  The side table splits Grail's def-time `__name__` /
`__annotations__` stamps into a SLOT namespace so they stay out of
`func.__dict__`, matching CPython — otherwise `update_wrapper`'s
`__dict__` merge copies them onto every wrapper.  A leading string
literal in a `def` is captured as `__doc__` (FunctionDefAst).

Still missing, in the order they cost conformance:

* **PEP 695 type params on a module-level `def` or a method.** No longer
  "always `()`": a def or lambda that compiles to a BLOCK carries its
  type parameters, and `typing.TypeVar` is a real class so
  `isinstance(T, TypeVar)` works (test_funcattrs'
  `test___type_params__` passes).  What is still missing is the other
  code path.  A module-level `def` compiles to a real Smalltalk METHOD
  whose metadata lives in a PyCode built by
  `FunctionDefAst >> emitPyCodeExprOn:qualname:` and stored in a method
  code table, and `FunctionDefAst` emits the `___pyTypeParams___` stamp
  only on the nested-def cascade — so `module_level_generic[U]` answers
  AttributeError rather than `(U,)`.  Closing it means carrying the
  names on the PyCode (a `___setTypeParamNames___:` cascade beside the
  `___setFlags___:` / `___setFreevars___:` ones already emitted for
  both paths) plus a `BoundMethod` / `UnboundMethod` reader and their
  write guards.  Blocks `test_functools`'
  `TestUpdateWrapper.test_default_update`.
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
