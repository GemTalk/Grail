# Supporting the `twilio` Python package in Grail

Status as of 2026-06-10 (overnight implementation pass).

## What works

All of the following run on Grail today, verified by SUnit cases that
are part of `./scripts/run_tests.sh`:

**Tier 1 — webhooks (no outbound HTTP needed)**

* `twilio.twiml` — TwiML generation (MessagingResponse, VoiceResponse,
  Gather nesting, attribute camelCasing).  Output is byte-identical to
  twilio 9.10.9 under CPython 3.13.  (`TwilioTier1TestCase`)
* `twilio.request_validator` — X-Twilio-Signature validation for
  form-POST and JSON (`bodySHA256`) webhooks, including the computed
  HMAC-SHA1 signature matching CPython byte-for-byte.

**Tier 2 — REST API client (outbound HTTPS)**

* `http.client` — HTTPConnection / HTTPSConnection / HTTPResponse over
  the native socket + ssl modules: keep-alive, Content-Length and
  chunked bodies, HEAD/204/304 rules, case-insensitive header access.
  (`HttpClientTestCase`)
* `urllib.request.urlopen` + `urllib.error.HTTPError/URLError`,
  with redirect following.  (`TwilioClientTestCase`)
* `requests` — a Grail-native shim of the requests API (Session,
  Request/PreparedRequest/Response, HTTPAdapter, hooks,
  CaseInsensitiveDict, exceptions), implementing exactly the surface
  twilio's transport drives plus requests.get/post helpers.
* `twilio.rest.Client` — the real vendored twilio core:
  `client.messages.create(to=..., from_=..., body=...)` composes the
  correct POST to `/2010-04-01/Accounts/{sid}/Messages.json` with form
  params and basic auth, and deserializes the response into a
  `MessageInstance` (including rfc2822 dates).  API errors surface as
  `TwilioRestException` with the decoded twilio error code.
  `TwilioHttpClient` was verified posting forms with auth over a live
  loopback socket through the requests shim.

## What is vendored (src/python/stdlib/)

* `twilio/` — `__init__`, `base/` (complete), `http/` (sync only:
  `__init__`, `http_client`, `request`, `response`),
  `credential/credential_provider`, `auth_strategy/` (minus
  `token_auth_strategy`, which needs jwt), `request_validator`,
  `twiml/` (complete), and a TRIMMED `rest/`: `Client` (verbatim),
  `api/ApiBase` (verbatim), and hand-trimmed `api/__init__`,
  `api/v2010/__init__`, `api/v2010/account/__init__` that keep only
  the Messages path (upstream eagerly imports ~30 account
  sub-resources, ~4 MB of generated code).  `account/message/` is
  verbatim.  Each trimmed file carries a `GRAIL NOTE` header.
* `requests/` — Grail-native shim (NOT vendored upstream; real
  requests drags in urllib3, whose ssl introspection exceeds what
  GsSecureSocket exposes).
* `http/client.py` — hand-rolled (upstream parses headers through the
  full email package; revisit the source-drop if email lands).
* `xml/etree/ElementTree.py` — build + serialize subset (Element,
  SubElement, tostring, ElementTree).  No parsing (fromstring/parse
  raise NotImplementedError).
* `abc.py` — abstractmethod/ABC markers, no instantiation enforcement.
* Filled gaps in existing modules: `urllib.parse` `_replace`,
  `urllib/error.py`, `urllib.request.urlopen`, `email.utils.parsedate`,
  `decimal.BasicContext`, `os.cpu_count()`.

## Grail runtime/codegen fixes that fell out (all suite-green)

1. **BaseException class-side `__new__` family** — rewritten to the
   class-call fast-path convention (receiver IS the class), so
   `e = ValueError('x')` as an expression works.  The old explicit-cls
   forms bound the first ctor arg as `cls`.  NOTE: `Fraction.gs` still
   uses the old convention and `Fraction(1, 2)` is wrong (returns 2) —
   pre-existing, untouched, worth its own pass.
2. **Super resolver walks per-class, both arity forms** —
   `super().__init__(**kwargs)` with an EMPTY splat used to resolve
   object's no-op 0-arg `__init__` instead of the direct parent's
   varargs form (TwiML subclasses lost `verbs`/`attrs`).
3. **`set(dict)` iterates keys** (SetProtocol) — Smalltalk `do:` walks
   dictionary values; request_validator KeyError'd.
4. **bool bitwise ops** — `b1 & b2` coerces/narrows properly
   (`result &= c1 == c2` in request_validator.compare).
5. **str comparisons are codepoint-ordered** — GemStone collation is
   case-insensitive; `sorted()` order feeds twilio's HMAC input.
6. **`**kwargs` excludes bound named params** (FunctionDefAst) —
   declared params leaked into the kwargs dict (TwiML attrs were
   duplicated).
7. **`except` with dotted / tuple class expressions** (TryAst) —
   parenthesize attribute loads; emit GemStone ExceptionSet for
   `except (A, B):`.
8. **`raise <non-bare-name call>`** (RaiseAst) — evaluate the call and
   signal the result; only bare names go through `___signalNew___`
   (twilio's `raise self.exception(...)` pattern).
9. **`class C(object):` == `class C:`** (ClassDefAst) — explicit
   `object` base now maps to PythonInstance, not GemStone Object
   (ClientBase(object) had dropped out of the property machinery).
10. **Attribute load probes 5/6-arg selectors** (`___pyAttrLoad___`) —
    `Session.merge_environment_settings` (5 params, no defaults) was
    unreachable.
11. **classmethod-via-instance direct sends** (PythonInstance DNU) —
    `self.cls_method(args)` forwards to the metaclass method
    (category `Grail-Class Methods`).
12. **`from PKG import name` vs dict protocol** (importlib) — the
    already-bound guard now only counts attributes the module itself
    owns, so `from twilio.base import values` loads `values.py`
    instead of returning `SymbolDictionary>>values`.
13. **Method-param sentinel renaming** (FunctionDefAst) — a body LOCAL
    named `kwargs`/`positional` shadows the varargs method parameter;
    every keyword-passed argument silently bound None
    (TwilioHttpClient.request builds a local dict named `kwargs`).

## Known gaps / next steps

* **`twilio.jwt` (access/capability tokens)** — needs a PyJWT-HS256
  shim (`jwt.encode`/`decode` over hmac+sha256+base64url+json; pure
  Python, no `cryptography` needed for HS256).  `ValidationClient` and
  `token_auth_strategy` are excluded until then.
* **Other REST domains** — vendor on demand; each domain follows the
  same pattern as `api/` (Client's lazy properties already reference
  them; untouched domains raise ModuleNotFoundError on first access).
  Un-trim `account/__init__.py` as sub-resources are added.
* **Async client** — out of scope for single-object-space Grail
  (aiohttp); the embedded-CPython integration is the escape hatch.
* **Live-network verification** — everything here is loopback/fake
  transport; a real `client.messages.create` against Twilio (or the
  twilio test credentials) over TLS still needs a manual run.
  `https://` pathing goes through `ssl.SSLContext.wrap_socket`
  (GsSecureSocket), which the Flask work already exercises server-side
  but client-side TLS to a public endpoint is unverified.
* **`Fraction(...)` constructor convention** (see fix 1).
* **property setters** (`@x.setter`) — V2010's `account` setter was
  dropped in the trim; Grail properties are read-only today.

## Test inventory

| TestCase | Fixture | Covers |
|---|---|---|
| `TwilioShapeTestCase` | `tests/python/twilio_shape.py` | class shapes the SDK relies on (inheritance chains, properties, classmethod-via-instance, iterator protocol, exception-as-value) |
| `TwilioTier1TestCase` | `tests/python/twilio_tier1.py` | TwiML generation + request validation, CPython byte-identical vectors |
| `HttpClientTestCase` | `tests/python/use_http_client.py` | http.client over loopback (GET/POST/chunked/HEAD/error) |
| `TwilioClientTestCase` | `tests/python/twilio_client.py` | requests shim, urlopen, TwilioHttpClient on a live socket, full `messages.create` + error path |
