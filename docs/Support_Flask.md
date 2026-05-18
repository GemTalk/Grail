# Supporting Flask in Grail

The goal: `import flask` and run a minimal Flask app inside Grail. Flask itself
is small (~7k lines), but it sits on top of a deep stack of dependencies. This
document inventories that stack, maps each piece against what Grail already
ships, and proposes an implementation order from cheapest to most expensive.

## 1. Flask's direct dependencies (Flask 3.x)

Flask's `pyproject.toml` declares five runtime dependencies:

| Package        | Version (3.x line) | Pure-Python? | Notes                                |
|----------------|--------------------|--------------|--------------------------------------|
| `blinker`      | >= 1.9             | Yes          | Signals (publish/subscribe).         |
| `itsdangerous` | >= 2.2             | Yes          | Signed tokens, cookie signing.       |
| `click`        | >= 8.1.3           | Yes          | CLI framework (`flask run`).         |
| `Jinja2`       | >= 3.1.2           | Yes          | Template engine.                     |
| `Werkzeug`     | >= 3.0             | Yes          | WSGI utilities + dev server.         |

One transitive dep, pulled in by Jinja2 and Werkzeug:

| Package        | Pure-Python?         | Notes                                  |
|----------------|----------------------|----------------------------------------|
| `MarkupSafe`   | Yes (C accelerator)  | HTML-safe string. C `_speedups` falls back to Python. |

That is the entire wheelhouse. Nothing else is required to `import flask`. To
actually *serve a request* you also need a working WSGI loop, which is the bulk
of Werkzeug.

## 2. Stdlib modules these depend on

To support the five packages, Grail needs a sizeable slice of CPython's
standard library. Below is each dep with its stdlib touchpoints (imports that
actually fire at import time or on the common code paths — not every reachable
module).

### blinker
`weakref`, `collections`, `collections.abc`, `inspect`, `re`, `threading`, `typing`.

### MarkupSafe
`re`, `html`, `string`, `collections.abc`, `typing`. C accelerator
`markupsafe._speedups` is optional; the Python fallback is fine.

### itsdangerous
`base64`, `hashlib`, `hmac`, `json`, `re`, `secrets`, `datetime`, `struct`,
`time`, `typing`, `zlib` (used by URL-safe compressed serializer only).

### click
`os`, `sys`, `io`, `errno`, `stat`, `re`, `inspect`, `typing`, `collections`,
`contextlib`, `gettext`, `shutil`, `codecs`. Also touches `termios`/`tty`/
`fcntl` lazily on POSIX for password prompts and pagers (optional paths).

### Jinja2
`ast` (the Python `ast` module, for literal_eval), `re`, `os`, `typing`,
`collections`, `decimal`, `weakref`, `inspect`, `pickle`, `string`, `pprint`,
`fnmatch`, `urllib.parse` (for some loaders), `logging`, `asyncio` (optional —
only async templates).

### Werkzeug (the big one)
`http`, `http.client`, `http.cookies`, `urllib.parse`, `urllib.request`,
`email`, `email.utils`, `email.message`, `email.policy`, `wsgiref`,
`wsgiref.util`, `wsgiref.headers`, `socket`, `socketserver`, `selectors`,
`mimetypes`, `hashlib`, `hmac`, `secrets`, `ipaddress`, `posixpath`, `os`,
`io`, `re`, `datetime`, `typing`, `collections`, `collections.abc`,
`contextlib`, `functools`, `itertools`, `inspect`, `weakref`, `warnings`,
`threading`, `logging`, `pickle`, `pkgutil`, `signal`, `traceback`, `shutil`,
`tempfile`, `dataclasses`, `enum`, `errno`, `stat`, `struct`, `base64`,
`zlib`, `gzip`, `mimetypes`. The dev server needs a TCP listen socket.

### Flask itself
On top of all the above: `logging`, `traceback`, `warnings`, `weakref`,
`importlib.metadata`, `dataclasses`, `pkgutil`, `signal` (optional).

## 3. What Grail already has

From `src/smalltalk/Python/` plus the C shim modules:

- **Stdlib pure-Python**: `math`, `cmath`, `os`, `os.path`, `sys`, `enum`,
  `functools`, `html`, `html.entities`, `importlib`, `random`, `statistics`,
  `string`, `copyreg`, `numbers`, `fractions`, `decimal`.
- **C shim modules**: `_bisect`, `_crc32c`, `_heapq`, `_sre` (in progress —
  `_sre.compile` not yet returning a working Pattern), `_statistics`.
- **Core types and exceptions**: full Python type tree (`int`, `float`, `str`,
  `bytes`, `list`, `dict`, `set`, `tuple`, `range`, generators/iterators) and
  the standard exception hierarchy.
- **Language features**: parser, AST → Smalltalk codegen, classes, decorators,
  Phase 5c dispatch with bound methods and varargs.

What is conspicuously **missing** for Flask's stack:

| Need            | Status                                                                 |
|-----------------|------------------------------------------------------------------------|
| `re`            | Depends on `_sre.compile()` — partially shimmed, returns C `PatternObject` but Smalltalk-side `re.Pattern` not wired. **Blocker for everything below.** |
| `hashlib`       | Not present. Needs MD5/SHA-1/SHA-256 at minimum.                       |
| `hmac`          | Not present. Pure-Python given `hashlib`.                              |
| `base64`        | Not present. Pure-Python, trivial.                                     |
| `json`          | Not present. Sizeable but pure-Python.                                 |
| `datetime`      | Not present. Big and fiddly (tz, deltas, formatting).                  |
| `secrets`       | Not present. Thin wrapper over `os.urandom`/`random`.                  |
| `struct`        | Not present. C-flavoured packing; needs care for endianness.           |
| `time`          | Partial via `sys`/`os`? Needs `time.time`, `time.monotonic`, `strftime`. |
| `io`            | Not present as Python module. File objects exist informally.           |
| `collections`   | Partial. Need `OrderedDict`, `defaultdict`, `deque`, `namedtuple`, `ChainMap`, `Counter`. |
| `collections.abc` | Not present. ABCs are widely used in isinstance checks.              |
| `weakref`       | Not present. Used heavily by blinker and Werkzeug request stack.       |
| `threading`     | Not present. `Local` / `LocalStack` is core to Flask's context.        |
| `inspect`       | Not present. Used for signature introspection in click, Jinja2.        |
| `urllib.parse`  | Not present. `quote`, `unquote`, `urlencode`, `urlsplit` are mandatory.|
| `http.*`        | Not present. `HTTPStatus`, cookie parsing.                             |
| `email.*`       | Not present. Header parsing.                                           |
| `wsgiref.*`     | Not present. `BaseWSGIServer` and headers helpers.                     |
| `socket`        | Not present. Needed for the dev server only.                           |
| `socketserver`  | Not present. Needed for the dev server only.                           |
| `ipaddress`     | Not present. IPv4/IPv6 parsing.                                        |
| `mimetypes`     | Not present. Mostly a `.types` lookup table.                           |
| `contextlib`    | Not present. `contextmanager`, `ExitStack`.                            |
| `dataclasses`   | Not present.                                                           |
| `typing`        | Not present (used only at import time, can be a stub).                 |
| `logging`       | Not present.                                                           |
| `traceback`     | Not present.                                                           |
| `warnings`      | Not present.                                                           |
| `gettext`       | Not present (click only — can be stubbed).                             |
| `shutil`        | Not present (click only for `get_terminal_size`).                      |
| `pickle`        | Not present (Jinja2 uses for bytecode cache only — skippable).         |
| `ast` (Python's)| Not present as a Python module (Grail has its own AST).                |
| `asyncio`       | Not present (Jinja2 async templates only — skippable).                 |
| `zlib` / `gzip` | Not present (compressed cookies/responses — skippable for minimum).    |

## 4. Implementation order (easiest first)

The path is shaped by two facts: (a) most of these are pure-Python in CPython,
so once Grail can run their source we get them for free, and (b) `re` is on
the critical path for almost every package — without working regexes, blinker,
MarkupSafe, click, Jinja2 and Werkzeug all fail at import time.

### Tier 0 — unblock everything (must do first)
1. **`re` module — DONE (2026-05-17).** The full Python-level `re` API
   round-trips through the upstream `_constants` / `_casefix` / `_parser` /
   `_compiler` stack onto the C-level `_sre` engine: `compile`, `match`,
   `search`, `fullmatch`, `findall`, `finditer`, `split`, `sub`, `subn`,
   `group`/`span` by index and name, character classes, quantifiers,
   anchors, named groups, numeric and named backreferences (`\1`,
   `\g<name>`), callable replacements, count caps.  Coverage:
   `ReModuleTestCase` (25 tests) plus `SreTestCase` (13 tests).

   **Known deviations** (still upstream-compatible behaviour):
   * Non-literal `sub`/`subn` replacements expand on the Grail side
     instead of going through the C `TemplateObject` +
     `expand_template` path (would need a dedicated `SreTemplate`
     wrapper with bespoke `wrap` / `pyobj_oop` marshalling).  Behaviour
     matches CPython; performance is per-match Python loop instead of
     compiled bytecode.
   * `re/__init__.py` carries two small Grail patches: `_ZeroSentinel(int)`
     rewritten as a plain marker class (Grail can't subclass `int`), and
     three `__text_signature__ = '…'` assignments commented out
     (`BoundMethod` has no attribute slot).
   * `re/_parser.py` carries a one-liner `__iter__` on `SubPattern`
     (CPython's `iter()` falls back to the sequence protocol, Grail's
     `ForAst` codegen emits a direct `__iter__` send).
   * `re/_compiler.py` `dis(code)` body still stubbed (`raise
     NotImplementedError`); debug-only, never on the regex hot path.

   With the language fixes that landed during this push (slice as a
   real class, `list.__setitem__`/`__delitem__` slice support, dict
   `fromkeys`, bytearray `find`, keyword-only varargs codegen,
   `___pythonValueAttrs___` hook for shim wrappers, `tp_members`
   support in `shimCallTyped`, frozenset(str) yielding 1-char
   substrings, `PythonInstance` DNU preferring `_name:kw:` over
   setter, `PyCallable_Check` filtering value types, …) the rest of
   the stack should hit far fewer compiler-level surprises.

   **Original state as of 2026-05-14:** The C-level `_sre` engine is fully wired —
   `_sre.compile()` produces a `SrePattern`, and `.match`/`.search`/`.group`/
   `.span`/etc. round-trip correctly through the shim. `SreTestCase` is all
   green (13/13) and registered in `install.gs`. The fixes that got us here
   (`shimCall` dot-splitting + 6-arg/returnCPtr support, server-side
   `PyUnicode_Substring:from:to:`, Py_None handling, stale-CByteArray reset
   across sessions) are committed.

   **What remains:** Grail has no SRE *compiler*. Calling `_sre.compile()`
   requires a list of pre-built opcodes — nobody writes those by hand. The
   compiler in CPython lives in the pure-Python `re` package (5 files,
   ~2600 lines):

   | File              | Lines | Notes                                       |
   |-------------------|-------|---------------------------------------------|
   | `_constants.py`   | 224   | Opcodes, flags. Uses `int` subclassing and `globals().update()` — need to rewrite or stub. |
   | `_casefix.py`     | 106   | Pure lookup tables. Easy.                   |
   | `_parser.py`      | 1066  | Regex parser → AST. Heavy use of `string`, `unicodedata`, `copy`, tokenizer state. |
   | `_compiler.py`    | 782   | AST → SRE bytecode. Calls into `_sre` for charset compilation. |
   | `__init__.py`     | 428   | Public API + caching. Mostly glue.          |

   Two viable paths:

   - **(a) Port CPython's source as-is.** Drop the five files into Grail's
     Python source tree and fix Grail bugs as they surface. This doubles as
     a stress test for the compiler/runtime. Risk: every language feature
     CPython uses that Grail doesn't support yet becomes a blocker —
     `__new__` on int subclasses, `globals()` mutation, complex tokenizer
     state, character class compilation that calls back into `_sre`.

   - **(b) Hand-roll a minimal Smalltalk-backed regex.** Skip `_sre`,
     implement `re.Pattern`/`re.Match` directly in Smalltalk. Smaller and
     guaranteed to work, but loses CPython exactness (group counting,
     `re.DOTALL`, named groups, etc. need each to be re-implemented).

   GemStone has no native POSIX/PCRE regex — only the primitive
   `String>>match:` glob (`*` and `#` wildcards). So (b) means writing a real
   regex engine, not wrapping an existing one.

   **Recommendation:** Path (a). The bytecode round-trip already works, so
   we're getting `_sre`'s correctness for free. The cost is paying down
   Grail language gaps, which we'd hit eventually anyway. Start with
   `_constants.py` and `_casefix.py` (small), then attempt `_parser.py`
   import-only (no execution) to surface gaps fast.

   **Progress checkpoint (2026-05-14, on branch `re`):**

   Compiler / runtime gaps cleared:
   - **List/dict/set/generator comprehensions** all emit working code.
     Shared `ComprehensionAst class >> emitGenerators:from:on:innerBody:`
     handles target binding (including tuple unpack), `if`-chains, and
     nested generators. New `ComprehensionTestCase` (14 tests) locks it
     in. *Before this, every comprehension was a `self halt`.*
   - **`*args` / `**kwargs` parameter binding** in both the closure
     emit path (`[:positional :keyword | ...]`) and the varargs-selector
     emit path (`_name: positional kw: kwargs`). Vararg names bind to
     a `tuple withAll: (positional copyFrom: K to: size)`; kwargs names
     to the `keyword`/`kwargs` dict (or an empty dict).
   - **`CallAst.moduleSelfSendSelector` fallthrough** — checks
     `methodDictForEnv: 1` for the fixed-arity selector and returns nil
     when only the varargs form exists, so a positional call to a varargs
     `def` routes through `moduleSelfSendVarargsSelector` instead of
     calling a non-existent method.
   - **Legacy-call kwargs dict** — the fallback bare-call form was
     emitting `... value: { } value:  at: #a put: 1; yourself)` (no
     receiver). Added the missing `(IdentityKeyValueDictionary new` opener.
   - **`globals()` → `self`** when emitted as a bare 0-arg call. Inside a
     module-level def, `self` is the module instance, so the existing
     `module>>doesNotUnderstand:` fallback makes dynamically-added names
     accessible via attribute syntax.
   - **`module>>update:`** mirroring `dict>>update:` so
     `globals().update({...})` works. String keys fold to Symbols (the
     underlying SymbolDictionary requires it).
   - **Slice subscript codegen** — `SubscriptAst` detects a `SliceAst`
     and emits `(value) __getslice__: lo _: hi _: st`, with `nil` for
     each omitted bound. `SequenceableCollection >> __getslice__:_:_:`
     handles negative indices, reverse step, and species preservation.
     `xs[i:j]`, `xs[:n]`, `xs[::-1]`, `s[1:4]` all work.

   Modules that now load end-to-end under `src/python/stdlib/re/`:
   - **`re._constants`** — 43 opcodes, 12 positions, 18 categories, all
     SRE_FLAG_* / SRE_INFO_* constants. Local copy declares each
     constant statically (43 + 12 + 18 = 73 names) and builds the
     `OPCODES` / `ATCODES` / `CHCODES` lists as plain list literals,
     because Grail can't forward-reference names that are added
     dynamically by `globals().update()` later in the same module.
     `_NamedIntConstant(int)` was dropped — Smalltalk's SmallInteger
     can't carry the `.name` inst var, and the attribute is only used
     for debug `repr()`.
   - **`re._casefix`** — 50 Unicode case-fold pairs. Loads with no
     local modifications.

   Still ahead before `re.compile('abc')` works end-to-end:
   - **`re._parser` (1066 lines)** — first import error is
     `from ._constants import *`. Two unrelated gaps need fixing:
     (a) relative imports (the leading `.`), and (b) star imports.
     Plus `import re._constants` itself trips on Grail naming an inst
     var with a `.` in it — the dotted-submodule loader needs work.
   - **`re._compiler` (782 lines)** — depends on `_parser`. Calls back
     into `_sre` for charset bytecode; once `_parser` lands and
     produces an AST, this should fit.
   - **`re/__init__.py` (428 lines)** — public API + compile cache.
     Easy once `_compiler` works.

   Other compiler gaps observed but not yet hit on the critical path:
   - **`super(Cls, self)`** — only the no-arg `super()` form is
     accepted at compile time. The 2-arg form rejects the class-name
     reference inside the class body.
   - **`del`** statement — codegen panics.
   - **int subclasses with extra inst vars** — Python's
     `_NamedIntConstant(int)` adds `.name` to int instances; SmallInteger
     has no room. Workaround for now: drop the wrapper and use plain
     ints in our stdlib copies.

### Tier 1 — small, isolated stdlib modules
These are mostly pure-Python in CPython; the bulk of the work is just running
the upstream source.

2. **`typing`** — stub to no-ops; almost every dep imports it.
3. **`collections.abc`** — minimal ABC set (`Mapping`, `MutableMapping`,
   `Sequence`, `Iterable`, `Callable`). Many `isinstance` checks rely on it.
4. **`contextlib`** — `contextmanager`, `closing`, `suppress`, `ExitStack`.
5. **`warnings`** — `warn`, `filterwarnings`. Cheap stub is fine.
6. **`base64`** — pure-Python, ~100 useful lines.
7. **`struct`** — implement `pack`/`unpack`/`calcsize` for the formats Flask's
   stack actually uses (`>I`, `>Q`, `b`, etc.). Not the full grammar.
8. **`hashlib`** — wrap GemStone's existing MD5/SHA implementations or expose
   OpenSSL via CCallout. Needed by `hmac`, `itsdangerous`, Werkzeug.
9. **`hmac`** — pure-Python on top of `hashlib`.
10. **`secrets`** — thin wrapper, depends on `os.urandom`.
11. **`time`** — `time.time`, `time.monotonic`, `time.strftime`. Use existing
    GemStone date/time primitives.
12. **`mimetypes`** — load a static `.types` table; lookup logic is trivial.
13. **`ipaddress`** — pure-Python, self-contained.
14. **`weakref`** — non-trivial. GemStone has `EphemeralEntry`; need to expose
    `ref`, `WeakValueDictionary`, `WeakSet`. Likely a Smalltalk-backed module.
15. **`inspect`** — pure-Python, but pulls on Grail's introspection. We need
    enough to satisfy `signature()` and `getfullargspec()`. Could be partial.

### Tier 2 — `datetime` and `json`
16. **`datetime`** — large, fiddly, and a hard dependency of `itsdangerous`
    and Werkzeug. Easiest path: implement as a Smalltalk-backed module
    wrapping GemStone's `DateTime`. CPython's `datetime.py` exists as a pure
    fallback if we'd rather port the source.
17. **`json`** — pure-Python implementation in CPython works fine once we have
    `re`. Used by Flask's response API and by `itsdangerous`.
18. **`collections`** (full) — `OrderedDict`, `defaultdict`, `deque`,
    `namedtuple`, `ChainMap`, `Counter`. Mostly Smalltalk-backed wrappers.
19. **`io`** — `StringIO`, `BytesIO`. Both pure-Python in CPython.
20. **`logging`** — used pervasively but mostly via `getLogger().info(...)`.
    A minimal implementation that writes to `sys.stderr` is enough.
21. **`traceback`** — pretty-print exceptions; needed for error pages.

### Tier 3 — first top-level Flask deps land here
At this point we can take real shots at the small packages.

22. **`blinker`** — small, ~2k lines, depends on `weakref`, `inspect`,
    `collections.abc`, `re`. Should land in a day once Tier 1 is in.
23. **`MarkupSafe`** — small. Disable the `_speedups` C extension and use the
    pure-Python `_native.py`. Depends on `re`, `html`, `string`.
24. **`itsdangerous`** — small. Depends on Tier 1 (`hashlib`, `hmac`, `base64`,
    `json`, `datetime`, `struct`, `time`).
25. **`dataclasses`** — pure-Python in CPython. Required by Werkzeug 3.x.

### Tier 4 — Jinja2
26. **`urllib.parse`** — pure-Python, but the percent-encoding tables are
    large. Needed by Jinja2's `urlize` filter and by Werkzeug.
27. **`Jinja2`** — once `re`, `MarkupSafe`, `urllib.parse`, `pprint`,
    `decimal`, `weakref`, `inspect`, `collections`, `ast` (or a stub) and
    `asyncio` (or a stub) are present. Disable async templates and the
    bytecode cache to skip `asyncio` and `pickle`.

### Tier 5 — click
28. **`gettext`** — stub: `gettext(x) -> x`, `ngettext`, no catalogs.
29. **`shutil`** — only `get_terminal_size`, `which`, `copyfile` are needed.
30. **`click`** — once `inspect`, `contextlib`, `errno`, `stat`, `shutil`,
    `gettext` are in. Skip the optional `_compat` paths that touch
    `termios`/`tty`.

### Tier 6 — Werkzeug (the long pole)
This is where most of the calendar time goes.

31. **`urllib.parse` (complete)** — quote/unquote tables, IDNA, `urlsplit`,
    `parse_qsl`. Already started in Tier 4; finish all corners.
32. **`http.*`** — `HTTPStatus`, `http.cookies` (Morsel + SimpleCookie),
    `http.client.parse_headers`.
33. **`email.*`** — Werkzeug uses `email.utils.parsedate_to_datetime`,
    `email.message` for multipart. The full `email` package is huge; we can
    likely shim just the entry points Werkzeug actually calls.
34. **`wsgiref.headers`** + `wsgiref.util` — small, pure-Python.
35. **`socket`** + **`socketserver`** + **`selectors`** + **`signal`** — only
    needed for `werkzeug.serving` (the dev server). Could be deferred if we
    intentionally skip `flask run` and accept WSGI-via-test-client only.
36. **`pkgutil`** — `get_loader`, `iter_modules`. Small.
37. **`Werkzeug`** — bring up in stages:
    - 37a. `werkzeug.datastructures` (most of it is pure-Python, depends on
           Tier 1/2).
    - 37b. `werkzeug.urls`, `werkzeug.http` (cookies, dates, ranges).
    - 37c. `werkzeug.wrappers` (Request/Response).
    - 37d. `werkzeug.routing` (URL maps — heavy regex usage).
    - 37e. `werkzeug.exceptions`.
    - 37f. `werkzeug.test` (test client — lets us run Flask apps without a
           live socket).
    - 37g. `werkzeug.serving` (last, optional, needs `socket`).

### Tier 7 — Flask
38. **`importlib.metadata`** — Flask reads its own version; a stub returning
    a fixed string is fine.
39. **`flask`** — `flask.app`, `flask.blueprints`, `flask.config`,
    `flask.helpers`, `flask.json`, `flask.sessions`, `flask.templating`,
    `flask.wrappers`. Once Werkzeug is solid, Flask itself is glue.

## 5. Decision points to make early

A few choices will reshape the order above:

- **Do we want `flask run` or just `werkzeug.test.Client`?** If we accept the
  test client only, we skip Tier 5 (`click`) and the socket-server pieces of
  Werkzeug, saving meaningful effort.
- **Smalltalk-backed vs port the source?** `datetime`, `collections`,
  `weakref`, `json`, `re` are all candidates for Smalltalk-backed
  implementations rather than running CPython's source. Smalltalk-backed is
  faster and likely fewer bugs, but loses CPython exactness.
- **MarkupSafe `_speedups`** — leave it off. The pure-Python fallback is fine
  and the C extension uses CPython internals we don't shim.
- **`asyncio`, `pickle`, `zlib`** — none are required for the minimum
  `flask hello-world` path. Stub them or omit.

## 6. Suggested milestones

- **M1 — `re` works** (Tier 0). Sanity check by porting a small library that
  exercises it (e.g., a piece of `urllib.parse`).
- **M2 — `import blinker`, `import itsdangerous`, `import markupsafe` all
  succeed and round-trip basic operations.** Validates Tier 1 + Tier 3.
- **M3 — Jinja2 renders a template** (Tier 4). Standalone, no Flask yet.
- **M4 — `werkzeug.wrappers.Request/Response` round-trip a WSGI environ**
  (Tier 6 through 37c).
- **M5 — Flask hello-world responds via `werkzeug.test.Client`.** This is
  Flask "working" without a live socket.
- **M6 — `flask run` serves a real HTTP request** (Tier 6 socket pieces +
  Tier 5 click).

The rough cost balance: M1–M3 are weeks of work, M4–M5 is the bulk of the
project (Werkzeug is by far the largest single dep), and M6 is comparatively
small once everything else is in.
