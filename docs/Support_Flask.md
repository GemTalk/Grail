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

### Tier 1 — blinker (DONE)

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

### Tier 1.5 — small isolated stdlib (DONE)

All the small modules `itsdangerous` and Werkzeug import are in.
Most are Smalltalk-backed (wrap a GemStone primitive); a couple are
pure-Python ports.

* `base64` — list-accumulator port (works around Grail's empty
  `bytes(bytearray)`); `str.encode(encoding)` added on
  `CharacterCollection` for str inputs.
* `contextlib` — `closing`, `suppress`, `nullcontext`, `ExitStack`,
  and a real `@contextmanager` built on the generator runtime.  The
  with-statement codegen for `WithAst` landed in the same commit
  (was a `self halt` stub previously).
* `time` — wall-clock / `monotonic` / `perf_counter` / `sleep`
  (Delay-backed) / `gmtime` / `localtime` / `mktime` / `strftime`
  with the directives HTTP-date and cookie expiration need.
* `secrets` — `token_bytes` / `token_hex` / `token_urlsafe` (DEFAULT
  ENTROPY=32), `choice` / `randbelow` / `randbits`, constant-time
  `compare_digest` accepting str or bytes.  Backed by HostRandom.
* `warnings` — `warn` / `warn_explicit`, filter management
  (`simplefilter` / `filterwarnings` / `resetwarnings`), and a
  `catch_warnings` context manager that snapshots and restores
  filter state.
* `struct` — `pack` / `unpack` / `unpack_from` / `calcsize` with
  `@ = < > !` byte-order prefixes; `b B h H i I l L q Q` ints,
  `f d` IEEE 754 floats, `s` counted bytes, `c ?` byte/bool, `x`
  padding.  Repeat counts supported.
* `mimetypes` — `guess_type` / `guess_extension` / `add_type` /
  `init` with a built-in extension map covering HTML / images /
  fonts / archives / etc.  Strips query/fragment, peels encoding
  suffixes (`.gz` / `.bz2` / `.xz` / `.Z` / `.br`).
* `ipaddress` — `IPv4Address` / `IPv4Network` with `is_loopback` /
  `is_private` / `is_global` / `is_link_local` / `is_multicast` /
  etc. exposed as value attrs.  IPv6 not implemented — `ip_address`
  with a colon raises `ValueError` (Werkzeug catches and falls
  through to the raw string).
* `hashlib` — landed earlier this push; md5 / sha1 / sha256 / sha512
  / sha3 family via GemStone `ByteArray` hash primitives.
* `hmac` — pure-Python port over hashlib (compare_digest reuses
  secrets'-shape comparator).

Existing stub modules that need extending later: `typing`,
`inspect` (still skeleton); they suffice for current import chains.

### Tier 2 — partial / mostly done

**Bigger stdlib:**
* `datetime` — **done.**  Combined `datetime` + `timedelta` +
  `timezone` (Smalltalk-backed, wrapping GemStone DateTime/Duration)
  plus standalone `date` / `time` classes.  See merged `datetime`
  branch.
* `json` — **done.**  Smalltalk-backed dumps/loads with bytes/
  bytearray inputs, ``dump`` / ``load`` file-IO variants,
  Infinity/-Infinity/NaN encoding.
* `collections` (full) — **done.**  `defaultdict`, `OrderedDict`,
  `deque`, `namedtuple`, `Counter` (with kwargs init + arithmetic),
  `ChainMap` (with parents/pop/popitem/clear).
* `io` — **done.**  `StringIO` / `BytesIO` + `SEEK_SET` / `SEEK_CUR`
  / `SEEK_END` constants + `getbuffer`.
* `logging` — **done.**  Full Logger / Handler / Formatter /
  LogRecord with handler-pipeline tests, `hasHandlers`, asctime via
  `time.strftime`.
* `traceback` — **done.**  3.10+ single-exception form,
  `format_list` / `walk_tb` / `TracebackException`.
* `weakref` — strong-ref stub; deferred.  See [Weakref.md] for
  the GemStone ephemeron mechanism that could back a real
  implementation and the four reasons we're parked on the stub.

[Weakref.md]: Weakref.md

**Direct deps (Tier 3):**
* `itsdangerous`, `MarkupSafe` already imported and exercised.
* `dataclasses` — **working** (`DataclassesTestCase`, 6 tests).
  `@dataclass` synthesizes `__init__` / `__repr__` / `__eq__` /
  `__ne__`; `fields` / `asdict` / `astuple` / `replace` /
  `is_dataclass` work; fields with defaults and
  `field(default_factory=...)` are supported (ClassDefAst now exposes
  the full annotated-field layout via `___annotatedFields___`, and
  the synthesized dunders are reached through the
  `object>>__repr__`/`__eq__`/`__ne__` dynamic-dunder probe).
  Not yet: `frozen` enforcement, `order=True` comparisons,
  `make_dataclass` (no `type(name, bases, ns)`), cross-class field
  merging for dataclass inheritance, and `@dataclass` recognised only
  by name (not via an import alias).

**Jinja2 (Tier 4):**
* `urllib.parse` — done.  `pprint`, `decimal`, `ast` — stubs in
  place.
* Async templates and bytecode cache stay disabled (skip `asyncio`,
  `pickle`).

**click (Tier 5):**
* `gettext` (stub), `shutil` (subset).  Only needed for `flask run`.

**Werkzeug (Tier 6, long pole):**
* Stdlib gaps that Werkzeug import will hit (need at least a stub
  each):
  * `http.client` (status codes, `HTTPException` shells),
    `http.cookies` (`SimpleCookie`, `Morsel`).
  * `email.utils` (`parsedate_to_datetime`, `formatdate`,
    `parseaddr`, `quote`), `email.message` (`Message` for
    multipart parsing).
  * `wsgiref.util` (`request_uri`, `application_uri`,
    `setup_testing_defaults`), `wsgiref.headers` (`Headers`).
  * `socket` — light usage in environ defaults; can stub as
    blocking-disabled.
  * `cgi` — deprecated but Werkzeug 3.x has a fallback path that
    still imports.  Stub `cgi.parse_multipart` or rewrite the
    Werkzeug call sites to avoid it.
* `dataclasses` (Tier 3) blocks Werkzeug 3.x's typed wrapper
  classes (`werkzeug.test.EnvironBuilder` and friends).  Could
  port the pure-Python implementation from CPython or backport
  a Werkzeug 2.x compatible layer that avoids dataclasses
  on the load-bearing types.
* Werkzeug source drop order (each step ends in a probe run):
  1. `werkzeug._internal` (assorted helpers, type aliases) +
     `werkzeug.urls` (URL parsing wrappers over urllib.parse).
  2. `werkzeug.datastructures.*` (`MultiDict` /
     `ImmutableMultiDict` / `Headers` / `EnvironHeaders` / …).
     Largest single chunk — ~3500 LOC, mostly self-contained.
  3. `werkzeug.http` (HTTP date / cookie / Accept / Authorization /
     ETag / Range / If-Match parsing).  Pulls in `email.utils`.
  4. `werkzeug.wsgi` (WSGI environ helpers — `get_input_stream`,
     `get_host`, `get_current_url`).
  5. `werkzeug.exceptions` (`HTTPException` hierarchy).  Used by
     Flask error handlers.
  6. `werkzeug.wrappers` (`Request` / `Response` — the core).
  7. `werkzeug.routing` (`Rule` / `Map` / converters — Flask
     needs this for `@app.route('/')`).
  8. `werkzeug.local` (`Local` / `LocalStack` / `LocalProxy` —
     app context).  May trip on threading-local semantics; can
     stub thread-local to a plain dict for single-session use.
  9. `werkzeug.utils` (`redirect`, `secure_filename`,
     `cached_property`, …).
  10. `werkzeug.test` (`Client` + `EnvironBuilder`).  M6 finish
      line: build an environ, route through a WSGI callable,
      get a Response back.
  11. `werkzeug.serving` — **deferred to M8.**  Real HTTP server
      with socket / socketserver / signal.

**Flask (Tier 7):**
* `importlib.metadata` stub returning a fixed version.
* `flask.app`, `flask.blueprints`, `flask.config`, `flask.helpers`,
  `flask.json`, `flask.sessions`, `flask.templating`, `flask.wrappers`.

## 4. Decision points

- **`flask run` vs `werkzeug.test.Client`?**  Test client only skips
  Tier 5 (`click`) and the socket-server pieces of Werkzeug.
- **Smalltalk-backed vs port the source?**  `datetime` (Smalltalk-
  backed, wrapping GemStone DateTime) and `json` (pure-Smalltalk
  recursive descent) went the Smalltalk route — faster and fewer
  bugs.  `collections`, `logging`, `traceback` went the port route
  for closer CPython parity.  `weakref` would need either a
  Smalltalk-backed ephemeron implementation or stay a port-side
  stub; see [Weakref.md] for the trade-offs.
- **MarkupSafe `_speedups`** — stays off.  Pure-Python fallback is
  fine and the C extension uses CPython internals we don't shim.
- **`asyncio` / `pickle` / `zlib`** — none required for the minimum
  `flask hello-world` path.  Stub or omit.

## 5. Milestones

- **M1 — `re` works.**  Done.
- **M2 — `import blinker` + roundtrip basic signals.**  Done.
- **M2.5 — Tier 1.5 stdlib in place** (base64 / contextlib / time /
  secrets / warnings / struct / mimetypes / ipaddress / hashlib /
  hmac).  Done.  Unblocks `itsdangerous` at the stdlib layer.
- **M3 — `import itsdangerous` + `import markupsafe`.**  Both
  import.  `itsdangerous.Signer` sign/unsign round-trips end-to-
  end.  `markupsafe.escape()` returns a populated `Markup`
  instance: `class Markup(str):` instantiation now routes through
  `str.__new__(Markup, value)` (a class-side
  `CharacterCollection >> __new__:` that allocates a self-typed
  byte object and copies the input bytes), bypassing Markup's
  user-defined `__new__` body.  The `__html__` detour on objects
  that implement that hook is therefore skipped — revisit when
  Python `__new__` becomes a first-class class method.
- **M4 — Jinja2 renders a template** standalone, no Flask yet.
  **Done.** `env.from_string('Hello world').render()` worked since
  the M4 trivial-template push.  Coverage broadened on
  `jinja2-pass-x` (squashed to main as `4025c06`) to a wide range
  of common templates:

  *Expressions:* `{{ var }}`, `{{ x + 1 }}`, `{{ x * 2 }}`,
  `{{ 'A' + 'B' }}`, `{{ items[0] }}`, `{{ items[0:2] }}`,
  `{{ name.upper() }}`, `{{ name ~ "!" }}`, `{{ 5 % 3 }}`,
  `{{ '%d' % 5 }}`, `{{ "{:>4}".format(42) }}`, ternary
  expressions, comparison operators.

  *Filters working:* `upper`, `lower`, `trim`, `capitalize`,
  `title`, `center`, `escape`, `forceescape`, `safe`, `striptags`,
  `length`, `count`, `wordcount`, `replace`, `truncate`, `default`,
  `tojson`, `int`, `float`, `string`, `format`, `list`,
  `reverse`, `first`, `last`, `join`, `sort`, `unique`, `sum`,
  `min`, `max`, `map`, `select`, `reject`, `selectattr`,
  `rejectattr`, `slice`, `batch`, `groupby`, `round`.

  *Control flow:* `{% if %} / {% elif %} / {% else %}`,
  `{% for %} / {% else %}`, `{% set %}`, `{% with %}`,
  `{% block %}`, `{% macro %}`, comments, `is`-tests
  (`is odd`, `is iterable`, `is string`).

  *Render-path internals:* `__class__` as value-attr, live
  `__dict__` view (`PyInstanceDict`), kernel-metaclass-slot
  exclusion for inherited Python class attrs.

  Codegen / Object-protocol fixes that landed alongside (general,
  benefit any Python user):

  * `StarredAst` in list / tuple literals splats correctly
    (`[a, *b, c]` concatenates instead of stubbing to TypeError).
  * `CallAst.func` parenthesises any non-`NameAst` function
    expression so `f[k](args)` doesn't fuse `__getitem__:` with
    `value:value:` into one selector.
  * `Object>>___pyAttrLoad___` recognises the unbound-class-method
    descriptor read (`Cls.method(instance)`) — returns a closure
    that splats the first positional as `self` and dispatches the
    *exact* method compiled on the class via `performMethod:`
    (bypasses MRO; subclass overrides don't re-enter).  Metaclass-
    bound `@classmethod` lookup keeps precedence.
  * Narrow module-level decorator support for `@pass_environment`
    / `@pass_eval_context` / `@pass_context` (the whitelist of
    decorators that just mutate `f.jinja_pass_arg` and return
    `f`).  Decorator runs at module-body time, calls the closure
    on the BoundMethod, stores the tagged BoundMethod back in the
    dynamic instVar.  Wider decorator support deliberately not
    enabled — cascades into ExecBlock callability and
    `functools.wraps` kwargs issues; see commit `4025c06`.
  * `ExecBlock>>___pyCallValue___:kw:` dispatches 2-arg blocks
    (decorator factory closures) via `value:value:`, N-arg blocks
    via `valueWithArguments:`.
  * `PythonInstance>>value:value:` fix: `__call__` varargs
    selector is `___call__:kw:` (one underscore prefix from the
    BoundMethod convention + `__call__`'s two trailing
    underscores), not `___call___:kw:` — unblocked
    `{% macro %}` dispatch.
  * `bytes.decode('unicode-escape')` codec implemented (jinja2's
    lexer round-trips every TOKEN_STRING through it).
  * `str.format()` with `[fill][<|>|^][width]` spec subset,
    auto/explicit positional indices, `{name}` keyword fields,
    `!r` / `!s` / `!a` conversion flags, `{{` / `}}` escapes;
    `int.__format__` routes through the same spec helper.
  * `str.strip(chars)` 1-arg form (`None` → whitespace), `round`
    preserves Float over Fraction, `sum(iterable, start=0)`
    two-positional / kwarg form, `min` / `max` varargs with
    `key=` / `default=`.
  * `__debug__ = True` in the Grail builtin globals — jinja2's
    `Context.call` opens with `if __debug__:`.

  Jinja2 source patches (still needed; the underlying gaps are
  documented in commit `4025c06` for later cleanup):

  * `jinja2/filters.py`: filter dispatch table retargeted at
    `sync_do_X` for the dozen `@async_variant`-decorated filters
    (Grail drops the wrapper, so the bare `async def` would
    otherwise be dispatched).
  * `jinja2/filters.py`: `_GroupTuple.__repr__` rewritten to
    build the tuple repr explicitly (tuple's own `__repr__` uses
    env-1 `do:separatedBy:` which DNUs when `self` is a
    NamedTuple subclass).
  * `jinja2/compiler.py`: 12 `visit_Add = _make_binop(...)`
    factory-assigned class attributes expanded to explicit method
    bodies (Grail doesn't descriptor-bind a class-stored ExecBlock
    to instances).

  Known remaining gaps (none blocking Flask hello-world):

  * `|wordwrap` needs the `textwrap` stdlib stub.
  * `{% include %}` needs an environment loader (`DictLoader` etc.
    import but aren't wired up to template lookup yet).
  * `|map(attribute=...)` returns a `PythonGenerator` whose
    `__str__` is the class name rather than the eagerly-rendered
    list; users chain `|list` for now.
  * Template-side bare `str` / `list` / `int` aren't reachable as
    type-constructor names (`{{ str(x) }}` raises `UndefinedError`).
  * `{% block %}` doesn't yet detect duplicate block names
    (raises a TemplateAssertionError that tunnels through
    `Environment._handle_exception` and trips a BoundMethod-
    doesn't-understand-`signal` DNU; affects only malformed
    templates).
- **M5 — Tier-2 stdlib in place.**  Done across the `datetime`,
  `json`, `io`, `collections`, `logging`, `traceback` branches
  (each squash-merged to main).  Suite at 2237 / 2237 after the
  last merge.  `weakref` parked at the strong-ref stub — see
  [Weakref.md] for the ephemeron-based path forward and why
  it's deferred.
- **M6 — `werkzeug.wrappers.Request/Response` round-trip a WSGI
  environ.**  Long pole; ~70% there.  Pre-requisite stdlib gaps and
  Werkzeug source-drop order detailed in the *Werkzeug (Tier 6)*
  section above.

  *Done:* the whole Werkzeug package source-drops and imports
  (~95% verbatim upstream).  `werkzeug.test` is the real upstream
  source (not the old shim), and the **output** direction
  round-trips end-to-end: `Client.get()` builds an environ, invokes
  a WSGI app, and wraps the result in a real `TestResponse(Response)`
  (`use_werkzeug_test.py::client_calls_app`, green).

  *Measured in two tiers* (`use_werkzeug_roundtrip.py`):
  * **Tier 1 — registered, green** (`testWerkzeugWrappersConstruct-
    AndClient`): the wrappers import, a real `Request` and `Response`
    *construct* from a WSGI environ, and the `Client` drives a WSGI
    app and reads the response back.
  * **Tier 2 — manual acceptance probe, NOT registered**: the full
    round-trip — a `Request(environ)` reading `.method` / `.path` /
    `.args` / `.headers`, and a `Response(...)` serialized to a
    `(start_response, app_iter)` pair.  Run by hand until the blockers
    below land, then fold back into the Tier-1 test.  (Kept out of the
    suite because there's no expected-failure marker — a registered
    red would just be noise.)

  *Remaining blockers (probed 2026-05-29 by walking the round-trip
  past each failure):*
  * **A. Request construction — `super().__init__(method=…, …)`.**
    The `Super` dispatch (i) doesn't bind keyword args to a
    fixed-arity parent's named params, and (ii) caps at 3 positional
    args while sansio `Request.__init__` takes 8 (`super(): no parent
    method '__init__'`).  Blocks `.method` / `.path` / `.scheme` /
    `.headers` / `.query_string` / `.remote_addr` (all set in the
    parent `__init__`).
  * **B. `req.args` / `.headers` / `.cookies` — @cached_property
    read.**  RESOLVED (commit 688ddf7) for the read mechanism: a bare
    `instance.attr` on an @cached_property used to return a
    `BoundMethod` (the decorator was dropped and the method compiled
    as a plain getter).  ClassDefAst now pairs it with a setter — the
    same trick @property uses — so `___pyAttrLoad___` invokes the
    getter and returns the value (`CachedPropertyTestCase`).  Caveats:
    no caching yet (recomputes each read — fine for the idempotent
    `.args`/`.headers`/`.cookies`, but stream-consuming `.form`/
    `.data` need real caching), and the `@functools.cached_property`
    attribute form isn't detected.  With B done, the request-read path
    now bottlenecks on **A** (the underlying `.query_string` etc. that
    the getters read aren't set until construction works).
  * **C. Response → WSGI / `Headers` serialization.**  Assorted
    concrete API gaps past construction (e.g. `Headers` lacks `do:`
    iteration).  Smaller fill-in work, enumerable once A/B clear.

  `werkzeug.utils` / `werkzeug.exceptions` remain reduced shims
  (blocked on multiple inheritance for `cached_property(property,
  Generic[_T])` / `BadRequestKeyError(BadRequest, KeyError)`), but
  the **functional** gate is the A/B/C list above — descriptor `__get__`
  (B) is the planned first target.  `dataclasses` (Tier 3) now works
  (defaults + default_factory), so the routing `State` `@dataclass`
  was restored to upstream.
- **M7 — Flask hello-world responds via `werkzeug.test.Client`.**
  Flask "working" without a live socket.  Source under
  `src/python/stdlib/flask/`; bring up `app`, `blueprints`,
  `config`, `helpers`, `json`, `sessions`, `templating`,
  `wrappers`.
- **M8 — `flask run` serves a real HTTP request.**  Requires
  `socket` / `socketserver` / `signal` on top of M7.  Probably
  also forces a real `weakref` implementation (see Weakref.md
  triggers).

Calendar balance: M6 is the bulk (Werkzeug is the largest single
dep, ~50k LOC of which the test-client path touches maybe 8k);
M8 is comparatively small once everything else is in.
