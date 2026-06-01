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
  environ.**  **COMPLETE (2026-05-30).**  The full Request/Response
  round-trip is green and registered.  Pre-requisite stdlib gaps and
  Werkzeug source-drop order detailed in the *Werkzeug (Tier 6)*
  section above.

  *Done:* the whole Werkzeug package source-drops and imports
  (~95% verbatim upstream).  `werkzeug.test` is the real upstream
  source (not the old shim).  Both directions round-trip end-to-end:
  `Client.get()` builds an environ, invokes a WSGI app, and wraps the
  result in a real `TestResponse(Response)`; a `Request(environ)`
  reads `.method` / `.path` / `.args` / `.headers` back out; and a
  `Response(...)` serialises to a `(status, headers, app_iter)` WSGI
  triple including a custom header.

  *Acceptance gate (`use_werkzeug_roundtrip.py`, all 9 facets green,
  registered in `testWerkzeugWrappersConstructAndClient`):*
  * **Tier 1** — wrappers import; `Request`/`Response` *construct*
    from a WSGI environ; the `Client` drives a WSGI app and reads the
    response back.
  * **Tier 2** — `request_reads_method_and_path`,
    `request_reads_query_args`, `request_reads_headers`,
    `response_wsgi_serialization`, `response_emits_custom_header`.

  *Blockers that landed to get here (probed by walking the round-trip
  past each failure):*
  * **A. Request construction — `super().__init__(method=…, …)`.**
    RESOLVED (commit 5a34f71).  A fixed-arity selector encodes only
    arity, not parameter names, so the keyword args were dropped (and
    the Super dispatch additionally capped at 3 positional args).
    `__init__` is now compiled to the varargs `___init__:kw:` form
    even when simple-positional (FunctionDefAst >> compilesAsVarargs),
    so the varargs prologue binds positional / keyword / mixed by name
    and `super().__init__(...)` works for any arity.  `Request(environ)`
    now constructs; `req.method` / `req.path` read correctly.  General
    win beyond Werkzeug: `Foo(a=1, b=2)` keyword construction now works
    for any class.
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
    attribute form isn't detected.
  * **C. datastructures (multiple inheritance + a str-class bug).**
    Both partly resolved:
    * **Multiple inheritance** (commit a1e07c6): `class C(A, B)` used
      only the first base; werkzeug's `(Mixin, DataClass)` pattern lost
      the data class.  `C` now keeps Smalltalk single inheritance from
      the first base and merges the secondary Python bases' methods
      (importlib `___mergeSecondaryBases___`).  **Unblocks
      `req.headers.get(...)`** (`EnvironHeaders` inherits `Headers.get`).
    * **`str.split` class** (commit 3b4303d): `split` degraded
      `Unicode7` → plain `String`, failing `isinstance(x, str)` in
      `urllib.parse.unquote_to_bytes`.  Fixed — `parse_qsl` round-trips.
    * **Response → WSGI.**  RESOLVED — three independent fixes on the
      `get_wsgi_headers` → `get_wsgi_response` path, each a general win:
      * `yield from <iterable>` (YieldFromAst, commit 6ebabe1) drove the
        delegate with a Smalltalk `do:`, which a non-`do:` Python
        iterable (e.g. a `Headers`) doesn't answer.  Rewritten to the
        `__iter__`/`__next__` + `StopIteration` protocol.
      * `functools.partial` (commit 5497c9c) wasn't callable as a
        function — `_partial:kw:` now returns a closure that prepends
        the bound args and forwards via `___pyCallValue___:kw:`.
      * `bytes.join` (commit 5497c9c) only accepted a `list`/`tuple`;
        now materialises any Python iterable through `list(...)`.
      `response_wsgi_serialization` and `emits_custom_header` both pass.

    * **`req.args`.**  RESOLVED — two layers:
      * **Storage-base MRO selection** (commit d498e8b).
        `parameter_storage_class` is `ImmutableMultiDict(Immutable-
        MultiDictMixin, MultiDict)`; the merge-based MI cut always kept
        Smalltalk inheritance from the *first* base (the storage-less
        mixin), so the class lacked `dict` backing and died on a missing
        `keysAndValuesDo:`.  `ClassDefAst >> printSuperclassOn:` now
        emits `importlib ___selectStorageBase___`, which picks the
        leftmost base whose chain reaches a `Collection` (Grail dict/
        list/set), so a `(mixin, dict-subclass)` base list subclasses
        the dict-backed base.  (`MultipleInheritanceTestCase >>
        testStorageBaseSelectedAsSuperclass`.)
      * **Most-derived override resolution** (BoundMethod).
        `MultiDict.get(self, key, default=None, type=None)` has defaults,
        so it compiles to the varargs `_get:kw:` selector, while the
        inherited built-in `dict.get` is fixed-arity `get:`.  An indirect
        call `req.args.get('q')` routes through `BoundMethod >>
        value:value:`, which used to pick *any* fixed-arity selector in
        the hierarchy first — so the superclass built-in `get:` shadowed
        the subclass override.  It now compares the defining classes and
        prefers the varargs override when it is strictly more derived.
        (`BuiltinSubclassOverrideTestCase`.)

  `werkzeug.utils` / `werkzeug.exceptions` remain reduced shims
  (the exceptions one also wants the MI built-in/C3 extension for
  `BadRequestKeyError(BadRequest, KeyError)`).  `dataclasses` (Tier 3)
  works; the routing `State` `@dataclass` was restored to upstream.

  *M6 acceptance gate: all 9 facets green and registered* in
  `testWerkzeugWrappersConstructAndClient`.
- **M7 — Flask hello-world responds via `werkzeug.test.Client`.**
  Flask "working" without a live socket.  Source under
  `src/python/stdlib/flask/`.  **DONE (2026-05-30).**  A Flask
  hello-world now responds **`200 OK` + `Hello, Grail!`** through the
  full WSGI application entry point `app(environ, start_response)` —
  exactly what `werkzeug.test.Client` invokes.  Regression:
  `FlaskScaffoldingTestCase >> testFlaskHelloWorldWsgiRoundTrip`
  (fixture `pkg_scaffolding/use_flask_wsgi.py`).

  *Beyond hello-world (2026-05-31):* dynamic routing and the HTTP error
  path now work through `app.test_client()`.  Regression:
  `testFlaskRoutingAndErrorPath` (fixture `pkg_scaffolding/use_flask_routing.py`).
  * **Variable routes / converters / query args** (`/<name>`, `/<int:a>`,
    `request.args`) — a view returning a *computed* string used to fail in
    the test client with `RuntimeError: the response object required the
    iterable to be a sequence`.  Root cause: `test_client` wraps the
    response in `WrapperTestResponse`, built via the 3-arg `type()`, which
    didn't inherit `Response.implicit_sequence_conversion` (a class-body
    attribute).  `builtins.type(name, bases, ns)` now runs the same
    `___inheritClassAttrs___` copy ClassDefAst does (DynamicTypeTestCase).
  * **`abort(404)` and unmatched-URL 404** — both produce a proper `404`
    now.  Three pieces: the hand-rolled `werkzeug.exceptions` shim declares
    `code`/`name`/`description` as **class** attributes (so `cls.code` and
    `e.code` both resolve, independent of whether `__init__` ran via the
    Smalltalk exception path); `Flask.make_response` renders an
    `HTTPException` return via `get_response()` (Grail's shim isn't a WSGI
    callable like upstream); and routing constructs `NoMatch` into a local
    before raising so its `__init__` runs (`raise Cls(args)` lowers to
    `Cls ___signal___: arg`, which skips `__init__`).
  * **Known general gap (deferred):** `raise CustomException(args)` lowers
    to `Cls ___signal___: arg` and skips `__init__`, so per-instance state
    set there is lost.  Switching the args case to construct-then-signal
    breaks *built-in* exceptions (`str(ValueError('x'))` → `___new___ not
    understood by Unicode7`), so the codegen change was reverted; affected
    raise sites (e.g. routing's `NoMatch`) construct-then-raise instead.
    The general fix needs built-in exception construction-with-message
    repaired first.
  * **`jsonify` (2026-05-31).**  Works now — returns `200` + a JSON body.
    It overflowed the Smalltalk stack because `jsonify` reaches `current_app`
    (a `LocalProxy`) which is wrapped in a `weakref.proxy`, and `_Proxy.__get`
    read its *name-mangled* internal slot `_Proxy__ref` (set in `__init__`
    via the explicit string) through a bare `self.__ref`.  **Grail doesn't
    implement Python name mangling** (`self.__name` inside class `C` →
    `self._C__name`), so the read missed `_Proxy__ref`, fell into
    `__getattr__`, and recursed into `__get` forever.  Fixed `_Proxy` to use
    the explicit `self._Proxy__ref` plus a `__getattr__` guard
    (WeakrefModuleTestCase proxy tests; jsonify covered in
    `testFlaskRoutingAndErrorPath`).
  * **General gap surfaced — no name mangling.**  `self.__private` inside a
    class is read/written verbatim as `__private`, not mangled to
    `_Class__private`.  Self-consistent code works, but any class that mixes
    an explicit mangled name (e.g. `object.__setattr__(self, "_C__x", …)` —
    common with `__slots__`) and an implicit `self.__x` breaks.  The proper
    fix is a parser/codegen transform; until then, affected library classes
    are patched to use one consistent name.
  * **Tier 4 — jinja2 templates via flask.**  DONE (2026-05-31).
    `render_template_string("Hello {{ who }}!", who="Grail")` renders through
    flask.  flask's `Environment(jinja2.Environment)` calls the parent init
    *explicitly* — `BaseEnvironment.__init__(self, **options)`
    (templating.py:48).  Grail dispatched `ParentClass.__init__(self, …)` as a
    **class-side** (metaclass) send → `MessageNotUnderstood`.  Fix: a new
    `UnboundMethod` class ([UnboundMethod.gs](src/smalltalk/Python/UnboundMethod.gs))
    returned by `object >> ___pyAttrLoad___` when a Behavior (class) receiver
    loads an *instance*-method name; calling it with `(instance, *args,
    **kwargs)` runs that class's own method on the instance NON-virtually via
    the env-0 `performMethod:` primitives.  Its resolver walks the chain
    class-by-class so an inherited no-op (the env-1 default `object.__init__`)
    doesn't shadow a subclass's real varargs `___init__:kw:`.  A second
    blocker after the env constructed: flask does
    `rv.globals.update(url_for=…, …)` — added the varargs `dict._update:kw:`
    (`dict.update([E], **F)`).  Tests: `UnboundMethodTestCase` (varargs/fixed
    parent init + a non-`__init__` unbound call) and jinja2 render in
    `FlaskScaffoldingTestCase >> testFlaskRoutingAndErrorPath`.
    *Note:* `super().__init__()` (the `Super` proxy) still has the same
    inherited-`object.__init__` shadowing bug in its own resolver — flask uses
    the explicit form, so it's unblocked, but `Super.gs` could borrow this
    closest-class resolver in a follow-up.

  *Working:* `import flask` succeeds; `app = Flask(__name__)` constructs;
  `@app.route('/')` registers a view (the decorator + rule machinery
  runs).  Probing `app.test_client().get('/')` walked the request path
  past a chain of blockers, each fixed:
  * **`{**mapping}` dict-literal unpacking** — DictAst codegen crashed
    on the parser's nil unpack key (commit 63d9a9c).
  * **3-arg `type(name, bases, ns)`** — werkzeug builds
    `WrapperTestResponse` dynamically; added `builtins >> type:_:_:`
    reusing the storage-base / merge machinery (DynamicTypeTestCase).
  * **`global` statement** — `flask.testing._get_werkzeug_version`
    lazy-inits a module global; the declaration was a no-op, so the
    assigned name was treated as a function local (UnboundLocalError).
    Now honored in the parser (GlobalStatementTestCase).
  * **`urlsplit(...)` unpacking** — `_SplitResult` defined `__iter__`
    but not `__getitem__`; Grail unpacks tuple targets via
    `__getitem__`, and the missing method fell through to a
    `doesNotUnderstand` *setter* that returned the index, so
    `scheme, netloc, ... = urlsplit(u)` bound `[0,1,2,3,4]`.  Added
    `__getitem__`/`__len__` to the shim (UrlsplitIndexingTestCase).
  * **`contextlib.ExitStack.close()` / `pop_all()`** — flask's test
    client unwinds pushed contexts via `close()`; the shim lacked it
    (ExitStackUsageTestCase).

  * **Keyword-only parameters.**  RESOLVED.  werkzeug's
    `Client.open(self, *args, buffered=False, follow_redirects=False,
    **kwargs)` is called by flask as `super().open(request,
    buffered=…, follow_redirects=…)`.  Grail bound the kw-only values
    correctly but did NOT remove them from the trailing `**kwargs`
    (the varargs prologue passed the kwargs dict straight through), so
    `buffered` / `follow_redirects` leaked into `kwargs`, the
    `if not kwargs and len(args) == 1` fast path was skipped, and the
    already-built `Request` was wrongly re-fed to
    `EnvironBuilder(request)` → `urlsplit(<Request>)`.  Both varargs
    prologue generators now build `**kwargs` as a *copy* with the bound
    kw-only names dropped (`KeywordOnlyParamsTestCase`).  *Closure form
    not yet fixed:* a nested `def f(*a, kw=…, **kw2)` still leaks (the
    `___positional___`/`___kwargs___` block path is separate); werkzeug
    uses methods, so the request path is unblocked.

  * **`request.host = …` on a `@cached_property`.**  RESOLVED.
    `Flask.create_url_adapter` assigns `request.host` (a werkzeug
    `@cached_property`).  ClassDefAst paired @cached_property with the
    same read-only raising setter as @property, but CPython's
    cached_property is a NON-data descriptor: assignment writes the
    instance dict and shadows the getter.  @cached_property now gets a
    storing setter; `___pyAttrLoad___` already probes dynamic storage
    before the getter (commit 973c6fe, CachedPropertyTestCase).
  * **`list.sort(key=…, reverse=…)`, and in-place sort.**  RESOLVED.
    Flask routing sorts its rule list with a key; only the 0-arg
    `sort` existed, and GemStone's `OrderedCollection >> sort:` returns
    a *new* Array rather than reordering the receiver (so even
    `xs.sort()` was a no-op).  Added `_sort:kw:` and made both forms
    copy the sorted result back in place (commit 3ff3b4b,
    ListSortKwargsTestCase).
  * **4-arg method via attribute-load.**  RESOLVED.  Routing's
    `StateMachineMatcher.match(domain, path, method, websocket)` is
    reached as `self.map._matcher.match(...)` (chained receiver →
    load-then-call).  `___pyAttrLoad___` enumerated only 1–3 fixed-arity
    selectors + varargs to recognise a callable attr, so the 4-arg
    `match:_:_:_:` was missed → AttributeError.  Added `sym4` to the
    BoundMethod-wrap chains (commit dc86a8d, FourArgAttrCallTestCase).

  * **werkzeug `LocalProxy`.**  RESOLVED (method-based shim).
    `current_app` / `request` / `g` / `session` are `LocalProxy`
    instances that forward *every* operation to the wrapped context
    object.  Upstream does this through `_ProxyLookup` **descriptor**
    class attributes (`__getattr__ = _ProxyLookup(getattr)`,
    `__eq__ = _ProxyLookup(operator.eq)`, …).  Grail dispatches dunders
    as methods and resolves `__getattr__` as a method (not the
    descriptor protocol), and even operators go through method dispatch
    — so honouring the upstream descriptor table would require hooking
    both attribute lookup AND operator dispatch through `__get__`, a
    huge change to two hot paths.  Instead the `LocalProxy` class body
    in `werkzeug/local.py` was rewritten to forward through real
    `__getattr__` / `__call__` / comparison / container *methods*
    (delegating to `_get_current_object()`), with an internal-slot guard
    so a miss can't recurse.  Verified in isolation (attribute, method,
    and `==` forwarding all work) and it advances dispatch past
    `current_app.blueprints` into routing/response.  *Limitation:*
    `isinstance(proxy, X)` is not forwarded (Grail isinstance uses the
    Smalltalk class), and the upstream `_ProxyLookup`/`_ProxyIOp`
    classes are now dead code.

  * **`re.sub` with a callable replacement.**  RESOLVED (commit
    ef2c4cb).  `Client.get('/')` reaches cookie quoting on the response
    — `_cookie_slash_re.sub(lambda m: _cookie_slash_map[m.group()],
    value.encode())`.  Non-literal/callable replacements are expanded in
    Smalltalk (`SrePattern >> ___subWithExpansion___`); it called the
    Grail lambda with `value: m` (1 arg), but a Grail Python callable is
    a 2-arg block `[:positional :kwargs | …]` → "block evaluated with 1
    argument when 2 were expected".  Now dispatched by block arity.
    (The crash first presented as a `SIGSEGV` in C `pattern_subx`; that
    was the `-O2` stack unwinder *misattributing* this Smalltalk-side
    error.  To debug shim crashes, rebuild `_sre.o` with
    `-g -fno-omit-frame-pointer`, relink, and reproduce in isolated
    `topaz -l -S`, never the MCP session.)  Tests: `ReSubCallableTestCase`.

  * **Cross-session stale `SrePattern` C pointer.**  RESOLVED (commit
    4a46289).  `SrePattern` / `SreMatch` wrapped a raw `cPtr` (C
    address, gem-process lifetime) that got persisted via `re._cache`
    and module-level patterns (`_cookie_slash_re`); a fresh gem
    dereferenced the dead pointer → SIGSEGV.  The `cPtr` is now boxed in
    a `CPointer` that goes NULL across sessions so a stale pattern is
    detected and recompiled rather than crashing.

  * **`*expr` splat over a Python iterator.**  RESOLVED (commit
    481f16e).  flask's `preprocess_request` builds
    `(None, *reversed(request.blueprints))`; the splat codegen used a
    bare `asArray`, which a `list_iterator` / generator doesn't answer.
    Now materialised via `___pyStarToArray___` (StarUnpackIteratorTestCase).

  * **Nested-`def` `__name__`.**  RESOLVED.  flask's `_endpoint_from_view_func`
    keys `view_functions` by `view_func.__name__`, but the hello view is
    a nested `def` → a bare ExecBlock with no lexical name, so
    `__name__` came back as a BoundMethod and the endpoint mapping broke.
    FunctionDefAst now stamps the def name onto the block via
    `___pyNamed___:`, and ExecBlock exposes `__name__` / `__qualname__`
    as value attributes (NestedDefNameTestCase).

  * **`f(a, kw=v, **mapping)` — named kwarg mixed with `**` splat.**
    RESOLVED.  flask's `Rule(rule, methods=methods, **options)` carries
    its `endpoint` in `**options`; CallAst's `printKeywordsDictOn:`
    DROPPED the splat whenever explicit kwargs were also present, so the
    rule endpoint came back nil and routing raised KeyError.  The splat
    is now merged into the kwargs dict via `@env1:update:`
    (KwargSplatMergeTestCase).

  * **Class-body data attribute on a built-in subclass.**  RESOLVED.
    flask's `SecureCookieSession(CallbackDict, SessionMixin)` is a
    `dict` subclass that reads `session.accessed` / `session.modified`
    (class-body `= False` defaults).  `object >> ___pyAttrLoad___`
    consulted the synthesised metaclass-side `Grail-Class Attrs`
    accessors only for `PythonInstance` receivers, but a `dict` subclass
    instance is a `KeyValueDictionary` (and a `list` subclass an
    `OrderedCollection`) → the read fell through to `AttributeError`.
    Both the class-receiver and instance-receiver branches now consult
    the `Grail-Class Attrs` accessor for any receiver
    (ClassAttrDictSubclassTestCase).

  *Known general gap surfaced (deferred, not blocking hello-world):*
  class attributes inherited from a **non-first / non-`dict`** base in
  multiple inheritance are not copied into the subclass metaclass
  (`class C(D, Mix): ...` can't see `Mix.attr` from an instance).
  SecureCookieSession redeclares `accessed`/`modified` on its own body,
  so the hello-world path is unaffected.

  *Known general gaps surfaced (not yet fixed):* tuple-unpacking drives
  `__getitem__` rather than the iterator protocol, so a class with only
  `__iter__` won't unpack; `PythonInstance >> doesNotUnderstand:` treats
  any unknown `name:` (including dunders like `__getitem__:`) as an
  attribute *setter* that returns the value, masking real errors; the
  closure form of keyword-only params still leaks into `**kwargs`; and
  werkzeug's full WSGI error path turns an app exception into an
  `UncontinuableError` ("exception already signaled") that hides the
  underlying error — drive dispatch via `app.full_dispatch_request()`
  (a request context) to see the real exception.
- **M8 — `flask run` serves a real HTTP request.**  **Thin path DONE
  (2026-05-31).**  A Flask hello-world now answers a real HTTP/1.1 `GET`
  over a TCP socket with `200 OK` + `Hello, Grail!` — verified end to end
  (`FlaskScaffoldingTestCase >> testFlaskHelloWorldOverRealSocket`,
  fixture `pkg_scaffolding/use_flask_serving.py`).

  * **Native `socket` module.**  No libpython / CPython `_socket`, so
    `socket` is a Smalltalk wrapper (`PySocket`) over GemStone's
    `GsSocket` (`src/smalltalk/Python/socket_module.gs`): `socket()` /
    `bind` / `listen` / `accept` / `connect` / `recv` / `send` /
    `sendall` / `close` / `shutdown` / `setsockopt` (no-op) /
    `settimeout` / `getsockname` / `gethostname`, plus `AF_INET` /
    `SOCK_STREAM` / … constants.  `bind((host, 0))` → OS-ephemeral port
    read back via `getsockname`.  `GsSocket` integrates with the
    `GsProcess` scheduler, so a blocking `accept` / `recv` suspends the
    green thread and yields — a single session can run both ends
    sequentially (the client `connect`+`sendall` buffer in the listen
    backlog before the server `accept`), which is how the tests avoid a
    fork.  Tests: `SocketModuleTestCase`.
  * **Thin `werkzeug.serving`.**  The `NotImplementedError` stub became a
    real (compact) `run_simple` / `make_server` / `WSGIServer` built on
    the socket: accept → read the request line + headers (+ body by
    `Content-Length`) → build the WSGI `environ` → call the app → write
    the HTTP response.  `wsgi.input` is an `io.BytesIO`.  Registration:
    `socket` must be post-bound into `sys.modules` (install.gs), like the
    other native modules.

  * **Faithful serving stack (2026-05-31, ``socket`` branch).**  The thin
    hand-rolled `run_simple` was replaced by the real stdlib path, all built
    on the GsSocket-backed `socket` module:
    - `socket.makefile()` → `PySocketIO`, a buffered binary file object
      (readline / read(n) / write / flush) — what `http.server` reads/writes
      through.
    - `select` + `selectors` — over `GsSocket`'s readiness primitives
      (`readWillNotBlock` / `readWillNotBlockWithin:`), operating on socket
      OBJECTS (GsSocket has the real OS fd via `id`, but Grail has no
      `select(2)` binding; the GsProcess scheduler suspends the green thread
      while a single socket waits).
    - `socketserver` — `BaseServer` / `TCPServer` / `StreamRequestHandler` /
      `ThreadingMixIn` (no ForkingMixIn / UDP / Unix).  `PySocket.bind()`
      now does the real OS bind (so `getsockname` works between bind and
      activate, as socketserver expects).
    - `http.server` — `HTTPServer` + `BaseHTTPRequestHandler` (request-line +
      header parsing, `do_<METHOD>` dispatch, `send_response` /
      `send_header` / `end_headers`).  Header parsing is a line split, not
      `email`; `date_time_string` is a fixed valid HTTP date.
    - `werkzeug.serving` — `make_server` / `run_simple` /
      `BaseWSGIServer(HTTPServer)` / `WSGIRequestHandler(BaseHTTPRequestHandler)`.
    Verified: a flask app served over a real socket through the full stack
    returns `200 OK` + `Hello, Grail!`.  Tests: `SocketModuleTestCase`
    (makefile / select / selectors / socketserver / http.server) +
    `testFlaskHelloWorldOverRealSocket`.

  *Still deferred:* the auto-reloader (needs `subprocess` + file watching);
  HTTPS / `ssl_context`; HTTP keep-alive (every response sends `Connection:
  close`); chunked transfer-encoding; `email`-based header parsing.
  `threaded=True` uses `ThreadingMixIn` but GsProcess threads are
  cooperative, not parallel.  `signal` not needed; `weakref` was always real.

Calendar balance: M6 is the bulk (Werkzeug is the largest single
dep, ~50k LOC of which the test-client path touches maybe 8k);
M8's thin path is small now that the socket layer exists.
