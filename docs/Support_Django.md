# Supporting Django in Grail

The goal: `import django`, `settings.configure(...)`, `django.setup()`,
and serve a request through the WSGI application inside Grail.

Django 5.2 is vendored under `src/python/stdlib/django/` (plus its two
runtime dependencies, `asgiref` and `sqlparse`).  It sits on the same
stack Flask does — this document records what the Django push added on
top of the Flask/Werkzeug foundation.

Status (2026-07-06): a no-database, no-installed-apps hello-world
serves end to end.  `DjangoTestCase` (4 tests) drives `import django`,
version gating, URL routing with a `<name>` path converter, and the
full WSGI request path producing `HttpResponse` / `JsonResponse`
bodies.  The fixture is `tests/python/pkg_scaffolding/use_django.py`.

## 1. What runs

```python
import django
from django.conf import settings

settings.configure(
    DEBUG=False, SECRET_KEY="…", ROOT_URLCONF=__name__,
    ALLOWED_HOSTS=["*"], INSTALLED_APPS=[], DATABASES={},
    USE_TZ=False, USE_I18N=False, LOGGING_CONFIG=None,
)
django.setup()

from django.http import HttpResponse, JsonResponse
from django.urls import path

def index(request):
    return HttpResponse("Hello from Django on Grail!")

def greet(request, name):
    return HttpResponse("Hello, %s!" % name)

urlpatterns = [path("", index), path("greet/<name>/", greet)]

# get_wsgi_application()(environ, start_response) → 200 + body
```

This exercises `settings.configure` + the lazy-settings `LazyObject`
proxy, `django.setup()` (the apps registry `populate()`, logging
configuration, URL script-prefix), `URLResolver` / `URLPattern` regex
compilation with a path converter, the WSGI handler + middleware chain,
view dispatch, and `HttpResponse` / `JsonResponse` materialisation.

## 2. Out of scope (for now)

The ORM (`models.Model` + a database backend), migrations, the admin,
template rendering through `INSTALLED_APPS`, i18n catalogs, management
commands (`manage.py runserver`), and anything async (ASGI, an event
loop).  These import cleanly but are not driven end to end.

## 3. Stdlib added for the Django import chain

Django imports a wider stdlib slice than Flask.  New modules landed as
either faithful CPython vendor copies or intentional Grail stubs:

* `subprocess` — **stub.**  Grail gems spawn no child processes;
  every entry point raises `OSError`.  Django imports it at module
  level (`django.utils.version` stamps a dev build with its git hash)
  but the hello-world path never calls it.
* `asyncio` (package) — **stub.**  Grail has no event loop.
  `get_running_loop()` raises `RuntimeError` (the canonical
  "am I async?" probe asgiref.local uses, so raising is *correct*, not
  a gap); `iscoroutinefunction` delegates to `inspect`; anything that
  would *run* a coroutine raises `NotImplementedError`.
* `concurrent.futures` — **stub.**  Cooperative threading degenerates
  a thread pool to inline execution; `Executor.submit` runs the
  callable immediately into a synchronous `Future`.  asgiref builds a
  `ThreadPoolExecutor(max_workers=1)` in a class body at import time
  but only *uses* it from inside an event loop, which never runs.
* `zoneinfo` — **stub.**  No IANA tz database ships; `ZoneInfo("UTC")`
  works, anything else raises `ZoneInfoNotFoundError`.  Only reached
  with `USE_TZ=True`.
* `gettext` — **stub.**  Null-translations passthrough (translations
  were stripped from the vendored packages); only reached with
  `USE_I18N=True`.
* `graphlib` — **vendor** (`TopologicalSorter`; the `GenericAlias`
  subscript sugar dropped, Grail's `types` has no `GenericAlias`).
  Django's migration/app dependency ordering uses it.
* `logging.config` — **stub.**  `dictConfig` validates and records the
  config; Grail's logging shim does the actual routing.
* `email.*` — **vendor** (parseaddr / policy / header / charset / …);
  `django.http` and Werkzeug pull in the email package for header
  handling.
* `_markupbase`, `html.*`, `quopri`, `locale`, `signal`,
  `annotationlib` — vendor/stub as each import demanded.

## 4. Interpreter / codegen changes

The Django push exposed several general Python-semantics gaps.  Each
fix is broad (not Django-specific) and covered by the suite:

### 4a. `sys.implementation` + real `version_info`

`django.utils.version` reads `sys.implementation.name` and gates
features on `sys.version_info >= (3, N)`.  Grail's `version_info` was a
placeholder `(0, 1, 0, …)`, which took every *pre*-3.10 branch —
branches that assume interpreter features Grail never had.  Now:

* `sys.implementation` is a real namespace (`name='grail'`,
  `version=(3,14,0,'final',0)`, `hexversion`) — a new `sys_implementation`
  module class.
* `sys.version_info` / `sys.hexversion` report the CPython **language
  level** Grail emulates (3.14 — the vendored stdlib and `_sre` are
  3.14).  The Grail release number stays in `sys.version`.

### 4b. Rebindable `self` / `cls` parameter

CPython treats the receiver parameter as an ordinary rebindable local.
Grail mapped it to Smalltalk's non-assignable `self` pseudo-variable,
so a method that assigns it hit `CompileError: expected an assignable
variable`.  Two real occurrences:

* `asgiref.current_thread_executor` — `self = None` to break a
  reference cycle in a `finally`.
* `django.db.migrations` / `django.forms` — `self = tuple.__new__(cls,
  …)` / `object.__new__(cls)` in `__new__`.

Fix: when a method's body assigns its self/cls parameter, the receiver
is carried in a `_self` block temp (`CallAst selfParameterRebound`).
`NameAst`'s reserved-name rename points reads and writes at the temp,
and every receiver fast path (instVar read/store, self-send) degrades
to the generic object paths — exactly the semantics of a rebound
local.  The same rename now also covers reserved-named **body locals**
(`self = cls(**initkwargs)` in `View.as_view`'s inner closure), not
just parameters.

### 4c. Multiple-inheritance C3 precedence

`___selectStorageBase___` picks the base whose Smalltalk chain becomes
the new class's superclass; the others are merged method-by-method by
`___mergeSecondaryBases___`.  Two changes were needed, and they had to
be balanced against each other:

* **Deepest-chain storage selection.**  When no base is built-in
  storage, the storage base is now the one with the **deepest**
  superclass chain, not simply the first.  Django's exception,
  descriptor, and field hierarchies use the `class Sub(ShallowMixin,
  SubstantialBase)` idiom, and `super().__init__` from `Sub` must reach
  `SubstantialBase` — which can only happen if that base is the
  Smalltalk superclass.  Without this, Django's import dies with
  `super(): no parent method '__init__'`.

* **Scoped C3 override in the merge.**  Deepest-chain can demote a
  **leftmost** base to secondary.  The merge used to only *gap-fill*,
  so the deeper (rightmost) base's method beat the leftmost mixin's —
  violating C3 (leftmost wins).  `ThreadedWSGIServer(ThreadingMixIn,
  BaseWSGIServer)` resolved `process_request` to `BaseServer`'s inline
  version instead of `ThreadingMixIn`'s spawn-a-worker version, so the
  threaded dev server silently ran requests on the main thread.  Now a
  secondary base declared **before** the storage base *overrides* the
  primary chain.

  This override is **deliberately scoped out of the built-in-storage
  case** (`ImmutableMultiDict(ImmutableMultiDictMixin, MultiDict)` and
  friends).  Those classes collapse onto Grail's primitive
  dict/list/set storage; overriding the storage base's own methods
  (`__setitem__`, the construction-time populators, `get`) breaks reads
  and construction.  There the pre-existing gap-fill behaviour stands
  (the immutable mixin's mutators are skipped, leaving the structure
  effectively mutable — a latent quirk no test exercises).

Regressions caught by `FlaskScaffoldingTestCase>>testFlaskServeThreaded`
(threaded) and `testWerkzeugWrappersConstructAndClient` (ImmutableMultiDict
`.args.get`).

### 4d. Native module vs. vendored submodule collision

Grail ships a native Smalltalk `html` module (`escape` / `unescape` /
a curated `entities` table) whose entity keys are semicolon-less
(`acE`, matching `HtmlTestCase`).  Django's `django.utils.text` does
`from html.parser import HTMLParser`, which makes Grail load the
**vendored** `html/parser.py` + `html/entities.py` (CPython's, whose
keys carry the trailing `;` — `acE;`).  The submodule bind
(`importlib>>___bind:onParent:as:`) was overwriting the native `html`
module's `entities` attribute with the vendored table, so after any
Django import `html.entities.html5['acE']` raised `KeyError`.

Fix: the submodule bind now **skips** a name that the native parent
module already defines as a compiled env-1 accessor.  The vendored
`html.entities` stays reachable via `sys.modules` (so the parser's
`from html.entities import html5` still gets the full CPython table),
but `html.entities` as an *attribute* remains the native table.
(Regression caught by `HtmlTestCase>>testHtml5MultiCodepoint`.)

### 4e. Other general fixes folded in

Attribute/descriptor protocol (`object>>___descriptorGet___:` for
class attributes with `__get__` — Django's `LocaleRegexDescriptor`),
the instance/module **varargs forwarders** (keyword-argument view
dispatch), comprehension and `for`-target codegen refinements, and a
raft of `str` methods (`count` / `replace` / `rfind` / `rsplit` /
`split` / …) that Django's text utilities need.  `typing` grew
`ParamSpec` / `Concatenate` / `Annotated` / `final` / `get_origin` /
`get_args`; `inspect` grew `markcoroutinefunction` + a real
`iscoroutinefunction` keyed on that marker.

## 5. Tests

`DjangoTestCase` (`src/smalltalk/PythonTests/DjangoTestCase.gs`,
wired into `install.gs`):

* `testDjangoVersion` — `import django; get_version()` → `5.2.x`.
* `testDjangoWsgiIndex` — GET `/` → 200 + body via the WSGI app.
* `testDjangoWsgiPathConverter` — GET `/greet/World/` → the `<name>`
  converter passes the segment as a keyword argument.
* `testDjangoWsgiJsonResponse` — GET `/info/` → `JsonResponse` body.

The fixture imports Django once and caches it (as
`FlaskScaffoldingTestCase` does) — `django.setup()` is process-global
and the import is heavy, so re-importing per test would refill the
gem's transient code space and OOM the suite.
