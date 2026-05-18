# Supporting Flask in Grail

The goal: `import flask` and run a minimal Flask app inside Grail.
Flask itself is small (~7k lines), but it sits on top of a deep stack
of dependencies.  This document inventories that stack, maps each
piece against what Grail already ships, and proposes an implementation
order from cheapest to most expensive.

## 1. Flask's direct dependencies (Flask 3.x)

| Package        | Pure-Python?         | Notes                                 |
|----------------|----------------------|---------------------------------------|
| `blinker`      | Yes                  | Signals (publish/subscribe).          |
| `itsdangerous` | Yes                  | Signed tokens, cookie signing.        |
| `click`        | Yes                  | CLI framework (`flask run`).          |
| `Jinja2`       | Yes                  | Template engine.                      |
| `Werkzeug`     | Yes                  | WSGI utilities + dev server.          |
| `MarkupSafe`   | Yes (C accelerator)  | HTML-safe string; pure-Python fallback fine. |

To `import flask` and serve a single request via the test client,
nothing outside this list is required.  `flask run` (a live dev
server) additionally needs working sockets.

## 2. Stdlib slice each dep imports

(Touchpoints that fire at import time or on the common code paths —
not every reachable module.)

- **blinker** — `weakref`, `collections`, `collections.abc`, `inspect`,
  `re`, `threading`, `typing`.
- **MarkupSafe** — `re`, `html`, `string`, `collections.abc`, `typing`.
- **itsdangerous** — `base64`, `hashlib`, `hmac`, `json`, `re`,
  `secrets`, `datetime`, `struct`, `time`, `typing`, `zlib`.
- **click** — `os`, `sys`, `io`, `errno`, `stat`, `re`, `inspect`,
  `typing`, `collections`, `contextlib`, `gettext`, `shutil`, `codecs`.
- **Jinja2** — `ast`, `re`, `os`, `typing`, `collections`, `decimal`,
  `weakref`, `inspect`, `pickle`, `string`, `pprint`, `fnmatch`,
  `urllib.parse`, `logging`, `asyncio`.
- **Werkzeug** — the big one: `http.*`, `urllib.*`, `email.*`,
  `wsgiref.*`, `socket`, `socketserver`, `selectors`, `mimetypes`,
  `hashlib`, `hmac`, `secrets`, `ipaddress`, `posixpath`, `os`, `io`,
  `re`, `datetime`, `typing`, `collections`, `collections.abc`,
  `contextlib`, `functools`, `itertools`, `inspect`, `weakref`,
  `warnings`, `threading`, `logging`, `pickle`, `pkgutil`, `signal`,
  `traceback`, `shutil`, `tempfile`, `dataclasses`, `enum`, `errno`,
  `stat`, `struct`, `base64`, `zlib`, `gzip`.
- **Flask** — on top of all the above: `logging`, `traceback`,
  `warnings`, `weakref`, `importlib.metadata`, `dataclasses`,
  `pkgutil`, `signal` (optional).

## 3. Status snapshot

### Tier 0 — `re` (DONE)

The full Python-level `re` API round-trips through the upstream
`_constants` / `_casefix` / `_parser` / `_compiler` stack onto the
C-level `_sre` engine: `compile`, `match`, `search`, `fullmatch`,
`findall`, `finditer`, `split`, `sub`, `subn`, `group`/`span` by
index and name, character classes, quantifiers, anchors, named
groups, numeric and named backreferences (`\1`, `\g<name>`), callable
replacements, count caps.  Coverage: `ReModuleTestCase` (25 tests)
plus `SreTestCase` (13 tests).

Known deviations (all upstream-compatible behaviour):
* Non-literal `sub`/`subn` replacements expand on the Grail side
  instead of the C `TemplateObject` + `expand_template` path.
* `re/__init__.py`: `_ZeroSentinel(int)` rewritten as a plain marker
  class (Grail can't subclass `int`); three `__text_signature__ = '…'`
  lines commented out (`BoundMethod` has no attribute slot).
* `re/_parser.py`: one-liner `__iter__` on `SubPattern` (Grail's
  `ForAst` codegen emits a direct `__iter__` send rather than
  CPython's iter() sequence-protocol fallback).
* `re/_compiler.py`: `dis(code)` body stubbed (debug-only, never on
  the regex hot path).

### Tier 1 — blinker (IN PROGRESS)

End-to-end user code works:

```python
import blinker
sig = blinker.Signal()
sig.connect(my_receiver, weak=False)
sig.send('hi')   # returns [(my_receiver, 'ok')]
```

Pieces landed during the push:
* **Subscripted bases** — `class Namespace(dict[str, NamedSignal]):`
  via `dict` class-side `__getitem__:` returning the origin class.
* **`object class >> value:value:`** — built-in classes (Set,
  KeyValueDictionary, …) are callable through the unified call
  protocol, dispatching to their `__new__` family.
* **Zero-arg `super()`** — codegen detects bare `super()` and emits
  a `Super` proxy bound to (lexical class, current method receiver);
  the proxy's `doesNotUnderstand:` walks the parent chain and
  invokes the inherited method on the original receiver via
  `performMethod:` / `with:performMethod:`.  Limitations documented
  in `Super.gs`.
* **`__name__` on classes / `__dict__` on PythonInstance** —
  introspection accessors that the cached-property idiom in blinker
  needs.
* **Varargs prologue parity** — `*args` / `**kwargs` / kwonly args
  now bind correctly in both module-method and class-method codegen
  paths.  Named params with defaults check kwargs before falling to
  the default (Python `Signal.connect(receiver, weak=False)` was
  silently ignoring the kwarg before).
* **Generators** — full PEP 255 + PEP 380 protocol (`yield`,
  `__iter__`, `__next__`, `send`, `throw`, `close`) via a forked
  `GsProcess` synchronised through a Semaphore pair.  `yield from`
  delegation is still a stub.
* **Unified attribute call** — `obj.X()` routes through
  `___pyAttrLoad___` + `@env1:value:value:` so classes, BoundMethods,
  and ExecBlocks all resolve through the same call protocol.  The
  fix that finally made `blinker.Signal()` construct an instance
  from user code rather than just reading the class.

Stubs in `src/python/stdlib/` for blinker's other imports
(`collections`, `collections.abc`, `weakref`, `inspect`, `typing`,
`__future__`) — enough for `import blinker` to succeed.

### Tier 2 + — not yet started

Everything below depends on bringing up more stdlib.  Implementation
order, cheapest-first:

**Small, isolated stdlib (Tier 1.5):**
* `typing` (stub already; extend if any Tier 2 dep trips on it),
  `contextlib` (`contextmanager`, `closing`, `suppress`, `ExitStack`),
  `warnings`, `base64`, `struct`, `hashlib`, `hmac`, `secrets`,
  `time`, `mimetypes`, `ipaddress`, `inspect` (extend the stub).

**Bigger stdlib (Tier 2):**
* `datetime` — large, fiddly; hard dep of `itsdangerous` + Werkzeug.
  Easiest path: Smalltalk-backed wrapping GemStone's `DateTime`.
* `json` — pure-Python in CPython, works once `re` is in.
* `collections` (full) — `OrderedDict`, `deque`, `namedtuple`,
  `ChainMap`, `Counter` (`defaultdict` already stubbed).
* `io` — `StringIO`, `BytesIO`.
* `logging`, `traceback` — minimal implementations.
* `weakref` — currently a strong-ref stub; needs real semantics if
  long-running processes start depending on cleanup.

**Direct deps (Tier 3):**
* `itsdangerous`, `MarkupSafe` once Tier 1.5/2 are in.
* `dataclasses` — pure-Python in CPython; required by Werkzeug 3.x.

**Jinja2 (Tier 4):**
* `urllib.parse`, `pprint`, `decimal`, `ast` (stub).
* Disable async templates and bytecode cache (skip `asyncio`,
  `pickle`).

**click (Tier 5):**
* `gettext` (stub), `shutil` (subset).

**Werkzeug (Tier 6, long pole):**
* `http.*`, `email.*`, `wsgiref.*` — staged.
* `werkzeug.datastructures` → `urls`/`http` → `wrappers` →
  `routing` → `exceptions` → `test` (test client).
* `serving` last, optional, needs `socket`/`socketserver`/`signal`.

**Flask (Tier 7):**
* `importlib.metadata` stub returning a fixed version.
* `flask.app`, `flask.blueprints`, `flask.config`, `flask.helpers`,
  `flask.json`, `flask.sessions`, `flask.templating`, `flask.wrappers`.

## 4. Decision points

- **`flask run` vs `werkzeug.test.Client`?**  Test client only skips
  Tier 5 (`click`) and the socket-server pieces of Werkzeug.
- **Smalltalk-backed vs port the source?**  `datetime`, `collections`,
  `weakref`, `json` are all candidates for Smalltalk-backed
  implementations.  Faster + likely fewer bugs, but loses CPython
  exactness.
- **MarkupSafe `_speedups`** — stays off.  Pure-Python fallback is
  fine and the C extension uses CPython internals we don't shim.
- **`asyncio` / `pickle` / `zlib`** — none required for the minimum
  `flask hello-world` path.  Stub or omit.

## 5. Milestones

- **M1 — `re` works.**  Done.
- **M2 — `import blinker` + roundtrip basic signals.**  Done.
- **M3 — `import itsdangerous` + `import markupsafe`.**
- **M4 — Jinja2 renders a template** standalone, no Flask yet.
- **M5 — `werkzeug.wrappers.Request/Response` round-trip a WSGI
  environ.**
- **M6 — Flask hello-world responds via `werkzeug.test.Client`.**
  Flask "working" without a live socket.
- **M7 — `flask run` serves a real HTTP request.**

Calendar balance: M3–M4 are weeks; M5 is the bulk (Werkzeug is the
largest single dep); M7 is comparatively small once everything else
is in.
