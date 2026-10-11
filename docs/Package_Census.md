# The package census — what fraction of pip's most-downloaded packages import

## Why this document exists

The goal is that **unmodified pip-installed packages work under Grail**. A
`kaggle` client now runs end to end, and a long run of stdlib and object-model
fixes landed in the days before this was written. None of that was measured
against the wider ecosystem: an earlier ad-hoc census put roughly 13 of 33
packages at "imports", but it was never written down and its package list is
gone, so it cannot be re-run and cannot be compared against.

This is that measurement, done so someone else can repeat it. Its real output
is not the headline fraction — it is the **ranked gap list** at the bottom,
which says which single fix unblocks the most packages.

## Top 100, with submodules (2026-10-11)

**This section is the current state; the sections below it are history.** Two
things changed from the measurement just below it. The list is now the top
**100** (the 2026-10-01 snapshot, so 51 new names). And `--submodules` (see
Method) scores every module each importing project installed, not just
`import X`.

Setup: GemStone 4.0 (build 2026-09-23), Grail `main` at `322a9092`, CPython
3.14.8, Darwin arm64. `./install.sh`, then `./scripts/run_tests.sh` (7803/7803,
8 of 8 shards), then
`./scripts/pypi_package_census.py --venv <venv> --submodules` against a fresh
venv of all 100 (pip resolved every one).

Controls: `nosuchmodule_xyz` and `nosuchmodule_xyz.sub` report
`ModuleNotFoundError` through both the single-module and the `--list` probe,
and `numpy` reports a catchable `ImportError`. The list runner was tested
against a fake package whose submodules exit the process and hang. It marked
them `CRASH` and `TIMEOUT` and resumed with the rest.

| Denominator | Import |
| --- | --- |
| **pure-Python projects** | **40 / 58** (+1 shadowed: click) |
| depending on a C-extension project | 4 / 15 (+2 shadowed: requests, jinja2) |
| shipping a C extension | 13 / 27 (+1 shadowed: markupsafe) |
| everything measured | **57 / 100** |
| **submodules, of those CPython imports** | **1,311 / 2,000** (65.6%) |

**Continuity with the top 50.** Of the 49 names carried over, 28 import:
exactly the 28/50 measured earlier the same day, with `litellm` (which failed)
now outside the list. The 51 new names score 29/51, 20/26 of them pure.

**The submodule level.** 51 projects import at the top level and have
submodules. 23 of them import every submodule CPython can. The 2,056 modules
their wheels install include 56 that CPython itself cannot import:
Windows-only modules, urllib3's emscripten backend (vendored in pip as well),
and modules that need an optional dependency pip did not install (`trio`,
`docutils`, `_tkinter`, …). Those 56 are left out of the denominator. Two
projects dominate the 689 Grail failures: pip (217, of which 184 are one
missing `logging` function) and
pyasn1-modules (130, one uncatchable crash). Without them the figure is
1,144 / 1,486 (77%).

**Three projects crash the session at the top level**:
* `h11` and `httpcore` crash on the InternalError 2261 recorded below.
* `pytz` crashes only on the IR arm (#1424); it imports with `GRAIL_IR_CODEGEN=0`.

**At the submodule level, 156 modules crash**:
* 142 on #1422;
* 13 on #1423;
* 1 more, `botocore.regions`, whose session died with no message and has not
  been looked at.

### Every row

`Submodules` is Grail's count over CPython's, for projects whose top level
imports; `—` means a single-module wheel. `First blocker` is what stops the
top-level import.

| # | Project | Version | Scope | Verdict | Submodules | First blocker |
| ---: | --- | --- | --- | --- | ---: | --- |
| 1 | boto3 | 1.43.106 | pure | FAILS |  | #1411 (via `dateutil.tz`) |
| 2 | packaging | 26.3 | pure | IMPORTS | 20 / 21 |  |
| 3 | typing-extensions | 4.16.0 | pure | IMPORTS | — |  |
| 4 | idna | 3.20 | pure | IMPORTS | 7 / 8 |  |
| 5 | urllib3 | 2.8.0 | pure | IMPORTS | 27 / 27 |  |
| 6 | certifi | 2026.7.22 | pure | IMPORTS | 1 / 1 |  |
| 7 | requests | 2.34.2 | ext-dep | SHADOWED |  | Grail's bundled copy answers (G10) |
| 8 | charset-normalizer | 3.5.2 | ext | IMPORTS | 9 / 9 |  |
| 9 | cryptography | 50.0.2 | ext | IMPORTS | 17 / 77 |  |
| 10 | setuptools | 84.0.0 | pure | FAILS |  | G5 |
| 11 | cffi | 2.1.1 | ext | IMPORTS | 16 / 19 |  |
| 12 | pygments | 2.21.0 | pure | IMPORTS | 311 / 340 |  |
| 13 | pyyaml | 6.0.3 | ext | IMPORTS | 15 / 17 |  |
| 14 | python-dateutil | 2.9.0.post0 | pure | IMPORTS | 8 / 15 |  |
| 15 | six | 1.17.0 | pure | IMPORTS | — |  |
| 16 | pluggy | 1.6.0 | pure | IMPORTS | 7 / 7 |  |
| 17 | botocore | 1.43.106 | pure | IMPORTS | 23 / 73 |  |
| 18 | pydantic | 2.14.0 | ext-dep | FAILS |  | #1414 (pydantic-core extension) |
| 19 | pycparser | 3.11 | pure | IMPORTS | 6 / 6 |  |
| 20 | click | 8.5.0 | pure | SHADOWED |  | Grail's bundled copy answers (G10) |
| 21 | pydantic-core | 2.50.0 | ext | FAILS |  | #1414 (pydantic-core extension) |
| 22 | anyio | 4.15.1 | pure | IMPORTS | 43 / 44 |  |
| 23 | numpy | 2.5.4 | ext | FAILS |  | C extension (numpy) |
| 24 | pytest | 9.1.1 | pure | FAILS |  | G5 |
| 25 | iniconfig | 2.3.1 | pure | FAILS |  | #1412 |
| 26 | annotated-types | 0.8.0 | pure | IMPORTS | 1 / 1 |  |
| 27 | h11 | 0.16.0 | pure | CRASH |  | InternalError 2261, not isolated |
| 28 | typing-inspection | 0.4.4 | pure | IMPORTS | 2 / 2 |  |
| 29 | attrs | 26.1.0 | pure | FAILS |  | #1418 (attrs) |
| 30 | s3transfer | 0.19.2 | pure | FAILS |  | #1411 (via `dateutil.tz`) |
| 31 | aiobotocore | 3.9.2 | ext-dep | IMPORTS | 10 / 37 |  |
| 32 | protobuf | 7.36.2 | ext | IMPORTS | 37 / 55 |  |
| 33 | httpx | 0.28.1 | pure | IMPORTS | 21 / 22 |  |
| 34 | markupsafe | 3.0.4 | ext | SHADOWED |  | Grail's bundled copy answers (G10) |
| 35 | httpcore | 1.0.9 | pure | CRASH |  | InternalError 2261, not isolated |
| 36 | python-dotenv | 1.2.4 | pure | IMPORTS | 5 / 5 |  |
| 37 | pyjwt | 2.15.1 | pure | FAILS |  | C extension (cryptography) |
| 38 | platformdirs | 4.13.0 | pure | IMPORTS | 8 / 10 |  |
| 39 | fsspec | 2026.9.0 | pure | FAILS |  | #1413 |
| 40 | pandas | 3.0.6 | ext | FAILS |  | C extension (numpy) |
| 41 | jinja2 | 3.1.6 | ext-dep | SHADOWED |  | Grail's bundled copy answers (G10) |
| 42 | jmespath | 1.1.0 | pure | IMPORTS | 7 / 7 |  |
| 43 | pathspec | 1.1.1 | pure | IMPORTS | 30 / 30 |  |
| 44 | filelock | 4.1.0 | pure | FAILS |  | #1413 |
| 45 | starlette | 1.7.0 | pure | IMPORTS | 33 / 34 |  |
| 46 | uvicorn | 0.54.0 | pure | FAILS |  | #1429 |
| 47 | multidict | 6.9.1 | ext | IMPORTS | 3 / 3 |  |
| 48 | jsonschema | 4.26.0 | ext-dep | FAILS |  | #1418 (attrs) |
| 49 | rpds-py | 2026.9.1 | ext | FAILS |  | C extension |
| 50 | yarl | 1.25.1 | ext | IMPORTS | 7 / 7 |  |
| 51 | aiohttp | 3.14.5 | ext | FAILS |  | #1418 (attrs) |
| 52 | rich | 15.0.0 | pure | IMPORTS | 68 / 75 |  |
| 53 | tomlkit | 0.15.1 | pure | IMPORTS | 11 / 11 |  |
| 54 | markdown-it-py | 4.2.0 | pure | IMPORTS | 65 / 65 |  |
| 55 | propcache | 0.5.4 | ext | IMPORTS | 3 / 3 |  |
| 56 | referencing | 0.37.0 | ext-dep | FAILS |  | #1418 (attrs) |
| 57 | jsonschema-specifications | 2025.9.1 | ext-dep | FAILS |  | #1418 (attrs) |
| 58 | mdurl | 0.1.2 | pure | IMPORTS | 5 / 5 |  |
| 59 | pillow | 12.3.0 | ext | IMPORTS | 31 / 91 |  |
| 60 | opentelemetry-api | 1.45.1 | pure | IMPORTS | 28 / 29 |  |
| 61 | frozenlist | 1.8.0 | ext | IMPORTS | — |  |
| 62 | tqdm | 4.70.1 | pure | IMPORTS | 21 / 24 |  |
| 63 | pip | 26.2.1 | pure | IMPORTS | 166 / 383 |  |
| 64 | googleapis-common-protos | 1.75.5 | ext-dep | FAILS |  | #1428 |
| 65 | pyasn1 | 0.6.4 | pure | IMPORTS | 19 / 31 |  |
| 66 | aiosignal | 1.4.0 | ext-dep | IMPORTS | — |  |
| 67 | aiohappyeyeballs | 2.7.1 | pure | IMPORTS | 4 / 4 |  |
| 68 | websockets | 17.2 | ext | IMPORTS | 43 / 44 |  |
| 69 | annotated-doc | 0.0.5 | pure | IMPORTS | 1 / 1 |  |
| 70 | wrapt | 2.5.0 | ext | FAILS |  | #1428 |
| 71 | pytz | 2026.5 | pure | CRASH |  | #1424 (IR arm only) |
| 72 | sniffio | 1.3.1 | pure | IMPORTS | 2 / 2 |  |
| 73 | tzdata | 2026.5 | pure | IMPORTS | 21 / 21 |  |
| 74 | fastapi | 0.143.0 | ext-dep | FAILS |  | #1414 (pydantic-core extension) |
| 75 | google-auth | 2.61.0 | ext-dep | IMPORTS | 47 / 75 |  |
| 76 | zipp | 4.1.1 | pure | IMPORTS | 6 / 6 |  |
| 77 | greenlet | 3.5.6 | ext | FAILS |  | C extension |
| 78 | importlib-metadata | 9.0.1 | pure | FAILS |  | G5 |
| 79 | pydantic-settings | 2.15.0 | ext-dep | FAILS |  | #1414 (pydantic-core extension) |
| 80 | wheel | 0.48.0 | pure | IMPORTS | 9 / 13 |  |
| 81 | tenacity | 9.2.1 | pure | IMPORTS | 11 / 11 |  |
| 82 | trove-classifiers | 2026.9.21.13 | pure | IMPORTS | — |  |
| 83 | python-multipart | 0.0.32 | pure | IMPORTS | 5 / 7 |  |
| 84 | pyasn1-modules | 0.4.2 | pure | IMPORTS | 1 / 131 |  |
| 85 | grpcio-status | 1.84.0 | ext-dep | IMPORTS | 0 / 3 |  |
| 86 | pyarrow | 26.0.0 | ext | FAILS |  | C extension |
| 87 | sqlalchemy | 2.1.4 | ext | FAILS |  | #1428 |
| 88 | hatchling | 1.32.4 | pure | IMPORTS | 63 / 65 |  |
| 89 | grpcio | 1.84.0 | ext | FAILS |  | C extension |
| 90 | pyparsing | 3.3.3 | pure | FAILS |  | #1419 |
| 91 | lxml | 6.1.3 | ext | IMPORTS | 6 / 22 |  |
| 92 | jiter | 0.17.0 | ext | IMPORTS | — |  |
| 93 | regex | 2026.9.29 | ext | FAILS |  | C extension |
| 94 | watchfiles | 1.3.0 | ext | FAILS |  | C extension |
| 95 | s3fs | 2026.9.0 | ext-dep | FAILS |  | #1413 |
| 96 | ruff | 0.17.0 | pure | IMPORTS | 1 / 1 |  |
| 97 | scipy | 1.18.1 | ext | FAILS |  | C extension (numpy) |
| 98 | soupsieve | 3.0.1 | pure | FAILS |  | #1420 |
| 99 | beautifulsoup4 | 4.15.0 | pure | FAILS |  | #1420 |
| 100 | openai | 3.28.0 | ext-dep | FAILS |  | #1414 (pydantic-core extension) |

### The gap list now, ranked

**By projects blocked at the top level** (pure and ext-dep rows; C extensions
excluded):

| Gap | Projects |
| --- | --- |
| #1414 pydantic-core's extension needs PEP 489 multi-phase init | pydantic, fastapi, pydantic-settings, openai (and pydantic-core itself) |
| #1418 `object.__setattr__.__get__(obj)` re-dispatches to the override (attrs) | attrs, jsonschema, referencing, jsonschema-specifications (and aiohttp) |
| #1413 no `ctypes` | fsspec, filelock, s3fs |
| G5 no `importlib.abc` / `importlib.machinery.PathFinder` | setuptools, pytest, importlib-metadata |
| #1411 metaclass `__init__` attribute under `six.add_metaclass` | boto3, s3transfer |
| InternalError 2261, not isolated | h11, httpcore |
| #1420 `sys.version_info` is a plain tuple | beautifulsoup4, soupsieve |
| #1428 three object-model gaps | googleapis-common-protos (and wrapt, sqlalchemy) |
| #1412 `\N{}` aliases | iniconfig |
| #1419 `x: T = a, b` is a SyntaxError | pyparsing |
| #1424 class inside `__new__`, IR arm | pytz |
| #1429 no `multiprocessing.context` | uvicorn |

**By submodules blocked** (projects whose top level imports):

| Gap | Submodules | Where |
| --- | ---: | --- |
| #1429 `logging.setLoggerClass` | 184 | pip |
| #1422 keyword call to a private method — **uncatchable** | 142 | pyasn1-modules 130, pyasn1 12 |
| #1411, then #1416 (`from .tz import *` over a declared `global`) | 79 | botocore 49, aiobotocore 23, python-dateutil 7 |
| #1418 attrs | 27 | pip 18, rich 6, aiobotocore 3 (optional attrs imports) |
| #1429 `http.client` status constants | 18 | google-auth |
| #1426 calling a class-body helper from the class body | 16 | pygments |
| `google.protobuf.descriptor_pb2` has no `FileDescriptorProto` | 15 | protobuf; not yet root-caused |
| #1423 a ~2,000-element literal — **uncatchable** | 13 | pygments 11, idna 1, pip 1 |
| #1429 the rest (`types.CapsuleType`, `mmap`, `email.policy.EmailPolicy`, `importlib.metadata.Distribution`, `os.getuid`, `xmlrpc.client`, `py_compile`, `_imp`) | 30 | pillow, pip, wheel, hatchling, … |
| #1413 `ctypes` | 7 | pip, cffi, wheel |
| #1419 `x: T = a, b` | 3 | pillow |
| #1428 `__weakref__` slot check | 3 | protobuf, grpcio-status |
| G5 | 3 | anyio, platformdirs, pip |
| #1427 `rf'\{{'` is a SyntaxError | 2 | pygments |

The remaining failures fall into two groups. Some are C extensions:
cryptography's Rust bindings (68, including google-auth's 8), plus `dlopen`
failures in lxml, pillow and grpc. The other 44 are pillow's Python modules
after its extension is missing, which is inferred and not root-caused.

**A correction to the sections below.** They attribute attrs, and through it
aiohttp, to G11: assigning a dunder onto an existing class. That was inference
from the raising location, and it was wrong. G11's own reproducer now
behaves like CPython, and attrs still fails. The real cause is #1418:
`attrs.Attribute.__init__` writes its fields through
`object.__setattr__.__get__(self)`, and Grail's bound form re-dispatches to
the class's frozen `__setattr__`. One shape of G11 is still open: assigning a
`__setattr__` onto a class that never defined one has no effect. It blocks
nothing in this census.

**The uncatchable ones matter more than their counts.** #1422, #1423 and #1424
each end the session with a Smalltalk error that no `except` can see. Under a
real program that is a dead process, not a failed import.

**Most of this queue is cheap.** #1429's `logging.setLoggerClass` is the single
largest submodule blocker, and #1420 is a one-object change that unblocks two
top-100 projects outright.

## Re-measured 2026-10-11 (top 50)

Same 50 names (`scripts/pypi_census_packages.txt`, unchanged), same harness,
same method as below. GemStone 4.0 (build 2026-09-23), Grail `main` at
`5ee7aa1d`, CPython 3.14.8, Darwin arm64. `./install.sh` then
`./scripts/run_tests.sh` (7793/7793) then the census, so this is the
post-deploy image state the method section describes. pip resolved each name
afresh, so **versions moved** (boto3 1.43.56 → 1.43.106, pydantic 2.13.5 →
2.14.0, iniconfig 2.3.0 → 2.3.1, …). Two of the changes below come from that,
not from Grail, and say so.

Controls: `nosuchmodule_xyz` reports `ModuleNotFoundError`. `numpy` no longer
reports `CRASH`: it is now `FAILS ImportError`, because G4 (a failed `dlopen`
killing the session) is fixed. That control's expected answer moved for a good
reason.

| Denominator | 2026-08-30 | **2026-10-11** |
| --- | --- | --- |
| **pure-Python projects** | 17 / 32 | **20 / 32** |
| depending on a C-extension project | 2 / 6 | 2 / 6 |
| shipping a C extension | 3 / 12 | 6 / 12 |
| everything measured | 22 / 50 | **28 / 50** |

SHADOWED is unchanged (requests, click, jinja2, markupsafe).

### Every row that moved

| # | Project | Aug | **Oct** | Now stops at | Why it moved |
| --- | --- | --- | --- | --- | --- |
| 1 | boto3 | FAILS | FAILS | `type object 'tzutc' has no attribute '_TzSingleton__instance'` (dateutil.tz) | G7 fixed; next wall is **#1411** |
| 3 | typing-extensions | FAILS | **IMPORTS** | | G2, G3a fixed |
| 12 | cffi | FAILS | **IMPORTS** | | G6 fixed |
| 15 | pyyaml | CRASH | **IMPORTS** | | G1 fixed |
| 19 | numpy | CRASH | FAILS | catchable `ImportError` | G4 fixed (out of scope either way) |
| 21 | pydantic | IMPORTS | FAILS | `cannot import name 'ArgsKwargs'` | **package moved**: pydantic-core 2.50 needs multi-phase init, **#1414**; `pydantic==2.13.5` still imports |
| 22 | pytest | FAILS | FAILS | `cannot import name 'PathFinder' from 'importlib.machinery'` | G8 fixed; G5 is now first, and iniconfig (below) is behind it |
| 24 | iniconfig | IMPORTS | FAILS | bare `SyntaxError` | **package moved**: 2.3.1 uses `"\N{BYTE ORDER MARK}"`, a Unicode name alias Grail lacks, **#1412** |
| 25 | anyio | FAILS | **IMPORTS** | | G2, G9 fixed |
| 26 | pydantic-core | IMPORTS | FAILS | as pydantic | **package moved**, #1414 |
| 29 | s3transfer | FAILS | FAILS | as boto3 | G7 fixed; #1411 |
| 30 | h11 | FAILS | **CRASH** | G12 `__class__` assignment, then a fatal `InternalError 2261` | G2 fixed, so it reaches G12; see G12 below |
| 31 | fsspec | FAILS | FAILS | `No module named 'ctypes'` | G3b fixed; it now stops at **#1413** before reaching G13, which is unverified |
| 32 | annotated-types | FAILS | **IMPORTS** | | G14 fixed |
| 36 | httpcore | FAILS | **CRASH** | as h11 | as h11 |
| 38 | pandas | CRASH | FAILS | numpy's `ImportError` | G4 fixed |
| 40 | pathspec | FAILS | **IMPORTS** | | G2, G3a fixed |
| 43 | filelock | FAILS | FAILS | `No module named 'ctypes'` | G3a fixed; #1413 |
| 44 | pyjwt | FAILS | FAILS | `cannot import name 'exceptions' from 'cryptography.hazmat.bindings._rust'` | G3a fixed; next wall is cryptography's Rust extension |
| 45 | s3fs | FAILS | FAILS | `No module named 'ctypes'` | #1413 |
| 46 | litellm | FAILS | FAILS | as pydantic | #1414 |
| 49 | aiohttp | CRASH | FAILS | attrs' `FrozenInstanceError` | G4 fixed; now blocked by G11 through attrs |
| 50 | yarl | CRASH | **IMPORTS** | | G4 fixed (pure-Python fallback) |

Unchanged rows: setuptools (G5), attrs (G11), cryptography, botocore and the
other packages that already imported.

Each "fixed" claim above was checked directly on this build, not inferred from
the package getting further: `EnvironmentError is OSError`, `errno.ESPIPE`,
`typing.AnyStr`/`typing._Final`, `__init_subclass__` keywords (both the
`type(...)` and class-statement forms), `signal.Signals`, and
`_thread.allocate_lock()` returning a fresh lock each call all hold. G5 does
not: `importlib.abc` is still absent, and `importlib.machinery` has no
`PathFinder`.

### The gap list now, ranked by packages blocked

| Gap | Blocks (first wall) | Notes |
| --- | --- | --- |
| **#1413** no `ctypes` | filelock, fsspec, s3fs | **3** |
| **#1414** multi-phase module init (`PyModule_FromDefAndSpec2`/`PyModule_ExecDef`) | pydantic, pydantic-core, litellm | **3**; likely every recent PyO3 extension |
| **#1411** metaclass `__init__` attribute under `six.add_metaclass` in an imported module | boto3, s3transfer | **2**, PyPI's #1 among them |
| G5 `importlib.abc` (absent) / `importlib.machinery.PathFinder` (module exists, class does not) | setuptools, pytest | 2; pytest also needs #1412 next |
| G12 `__class__` assignment, plus a fatal 2261 | h11, httpcore | 2; see below |
| G11 dunder reassignment on a class | attrs, aiohttp | 2 |
| **#1412** `\N{}` name aliases (and the detail-less SyntaxError) | iniconfig | 1, and behind G5 for pytest |
| cryptography's Rust extension | pyjwt | 1, out of scope as a C extension |

**G12 now ends in a CRASH, not a FAILS.** h11's `Sentinel` metaclass assigns
`v.__class__ = v`. Grail refuses that with the catchable `TypeError: __class__
assignment: 'CLIENT' object layout differs from 'CLIENT class'`, and a minimal
copy of the pattern, even four imports deep, is caught by `except
BaseException` exactly as it should be. Inside h11's real import the same
TypeError instead takes the session down with `InternalError 2261 ... process
switch not allowed in protected mode`, which no `except` survives. That second
failure is not yet isolated. Fixing G12 would make it moot for these two
packages, but the 2261 deserves its own repro.

## Headline (first measurement, 2026-08-30)

Measured 2026-08-30, GemStone 3.7.5 (build 2026-03-11), Grail at `main`
commit `edb26dd9`, Darwin arm64.

| Denominator | Imports | Of |
| --- | --- | --- |
| **pure-Python projects** (the number that means something) | **17** | **32** |
| pure-Python projects depending on a C-extension project | 2 | 6 |
| projects that themselves ship a C extension | 3 | 12 |
| everything measured | 22 | 50 |

Four further rows are neither: `requests`, `click`, `jinja2` and `markupsafe`
**import, but not the pip copy** — Grail ships its own, and its bundled tree
beats `sys.path` by design. They are reported as `SHADOWED` rather than
counted, because counting them would be a straight falsehood about the pip
package.

So: **17 of 32**, and the earlier "roughly 13 of 33" was in the same
neighbourhood but is not comparable — different packages, different list.

## Method

Reproducible from a clean checkout:

```bash
source .setenv                              # python3 is 3.14.6 here
python3 -m venv /tmp/census-venv
/tmp/census-venv/bin/pip install -r scripts/pypi_census_packages.txt
./install.sh
./scripts/run_tests.sh                      # see "image state" below
./scripts/pypi_package_census.py --venv /tmp/census-venv --submodules
```

**Image state matters, and `run_tests.sh` changes it.** `run_tests.sh` runs
`scripts/deployFrameworks.gs`, which builds and **commits** framework modules —
`jinja2` and its `markupsafe` dependency among them — into the extent. Before
that step, `import markupsafe` re-executes Grail's bundled
`try: from ._speedups import ...`, finds the venv's `.so`, and the session
dies (see G4). After it, the import is a cache hit from the committed image and
reports `SHADOWED`. The table below is the **post-deploy** state, which is why
the recipe names the step. Neither reading touches the 17/32 headline —
`jinja2` and `markupsafe` are `ext-dep`/`ext` — but a census that did not say
which state it measured would be irreproducible.

**Package selection.** Rows 1–100, in rank order, of
[hugovk's top-pypi-packages](https://hugovk.dev/top-pypi-packages/) dump
(`top-pypi-packages.min.json`, `last_update 2026-10-01`, downloaded
2026-10-11). The first two measurements used rows 1–50 of the 2026-08-01
snapshot. Downloaded, not recalled: a list from memory is not a basis, and
the file is the thing another person can re-fetch. No hand-picking — "the 100
most-downloaded projects" is a rule; a curated list is a preference. That rule
is why `litellm`, measured twice, is no longer in the list: it fell below rank
100. The names are frozen in `scripts/pypi_census_packages.txt`, and a refresh
is a deliberate edit to that file.

**How `sys.path` reaches the venv.** Grail populates `sys.path` from
`$VIRTUAL_ENV`'s site-packages (see `docs/Sys_Path_Bootstrap.md`), so the
harness sets `VIRTUAL_ENV` and nothing else. It clears `$PYTHONPATH` so the
measurement is of the venv and Grail's own tree, and of nothing the launching
shell happened to export.

**One fresh process per package.** `./grail scripts/grail_import_probe.py
<name>`, one process each. A shared session would let one package's
half-finished import poison the next, and a package that kills the session
would take the remainder of the run with it — eight of these do kill it.

**Import names are derived, not guessed.** `pyyaml` is imported as `yaml`,
`pyjwt` as `jwt`, `python-dateutil` as `dateutil`. The harness reads the
top-level names out of each wheel's own `RECORD`. Four projects need a
hand-written entry, all for the same reason: their top level is a
**namespace** package (`google`, `opentelemetry`), and `import google`
succeeds while measuring nothing. They are `protobuf` → `google.protobuf`,
`google-auth` → `google.auth`, `opentelemetry-api` → `opentelemetry.trace`,
and `googleapis-common-protos` → `google.rpc.status_pb2`. That last wheel has
no `__init__.py` anywhere, so it is named by the module `grpcio-status`
imports.

**The submodule level (`--submodules`).** `import X` returning says little
about `X`. In the first census `python-dateutil` imported, while
`dateutil.tz`, the part anyone actually uses, did not. So for every project
whose top level IMPORTS, the harness also imports each module its wheel
installed:
* **The list comes from the wheel's `RECORD`**, not a walk of the import
  name's directory. pytest's code is in `_pytest`, setuptools also ships
  `pkg_resources`, and protobuf's import name is only one directory of a
  namespace. Directories and modules named `tests`, `test`, `conftest` and
  `__main__` are excluded.
* **CPython decides the denominator.** The same list is imported first by the
  venv's own interpreter, and only modules that import there count. A
  submodule that needs an optional dependency pip never installed
  (`dateutil.tz.win` wants `winreg`) is no more importable under CPython, and
  scoring it against Grail would be a phantom failure.
* **Both interpreters import the list the same way.** That is one process
  each, in the same sorted order, printing and flushing one line per module.
  When a Grail session dies or goes silent for `--timeout` seconds, the module
  it was importing is marked `CRASH` or `TIMEOUT` and the rest of the list
  resumes in a fresh process, so one bad submodule costs one row rather than
  the package.
* **A message count is not a gap count.** Later modules in the same process
  see whatever the first failure left behind, so one gap can show up under
  several messages. The verdict is what is scored. To root-cause a group,
  start from the earliest failure in its package.

**C extensions are measured, not pre-filtered.** Grail cannot load a CPython
extension, so a project that ships one is out of scope and its failure is not a
Grail defect. It is still run, and reported in its own row, for two reasons
found in this very census: `charset-normalizer` and `protobuf` ship pure-Python
fallbacks and import fine, and `pyyaml` never reaches its `.so` at all — it
dies earlier, on a Grail codegen bug that pre-filtering would have hidden.
Classification is mechanical: does the project's own wheel contain a
`.so`/`.dylib`/`.pyd` (`ext`), does anything in its installed dependency
closure (`ext-dep`), or neither (`pure`)?

**Proving the harness can see a failure.** Before the run: `nosuchmodule_xyz`
reported `FAILS ModuleNotFoundError`, and `numpy` reported `CRASH`. A census
that reports everything green because it swallowed the errors is the classic
outcome here, and the two controls are what rule it out. The rows below are
printed in full for the same reason — a total nobody can check is a number
describing nothing.

**`CRASH` is data, not a hole.** An uncatchable Smalltalk error
(`CompileError`, a fatal `dlopen`) unwinds past Python entirely, so no
`except BaseException` sees it and the process dies with no result line. The
harness reads a missing line as `CRASH` and says so.

## Results (first measurement, 2026-08-30)

`scope`: `pure` / `ext-dep` / `ext` as defined above. Full per-package output
lands in `out/pypi/<project>.out` (gitignored).

| # | Project | Version | Scope | Verdict | Error | Root-cause gap |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | boto3 | 1.43.56 | pure | FAILS | `AttributeError: 'super' object has no attribute '__call__'` | G7 six.moves |
| 2 | packaging | 26.3 | pure | **IMPORTS** | | |
| 3 | typing-extensions | 4.16.0 | pure | FAILS | `AttributeError: module '?' has no attribute '_Final'` | G2 typing, then G3 |
| 4 | certifi | 2026.7.22 | pure | **IMPORTS** | | |
| 5 | urllib3 | 2.7.0 | pure | **IMPORTS** | | |
| 6 | idna | 3.19 | pure | **IMPORTS** | | |
| 7 | requests | 2.34.2 | ext-dep | SHADOWED | Grail's own `src/python/stdlib/requests` answered | G10 |
| 8 | charset-normalizer | 3.5.1 | ext | **IMPORTS** | (pure-Python fallback) | |
| 9 | setuptools | 84.0.0 | pure | FAILS | `ModuleNotFoundError: No module named 'importlib.abc'` | G5 |
| 10 | botocore | 1.43.56 | pure | **IMPORTS** | | |
| 11 | cryptography | 50.0.1 | ext | **IMPORTS** | top level is metadata only | |
| 12 | cffi | 2.1.1 | ext | FAILS | `TypeError: 'PyThreadLock' object is not callable` | G6 |
| 13 | pluggy | 1.6.0 | pure | **IMPORTS** | | |
| 14 | pygments | 2.21.0 | pure | **IMPORTS** | | |
| 15 | pyyaml | 6.0.3 | ext | CRASH | `CompileError (error 1001), expected a right bracket (])` | G1 |
| 16 | python-dateutil | 2.9.0.post0 | pure | **IMPORTS** | (but `dateutil.tz` does not — see G7) | |
| 17 | six | 1.17.0 | pure | **IMPORTS** | | |
| 18 | aiobotocore | 3.9.0 | ext-dep | **IMPORTS** | | |
| 19 | numpy | 2.5.2 | ext | CRASH | fatal `dlopen` of `_multiarray_umath...so` | out of scope, via G4 |
| 20 | pycparser | 3.0 | pure | **IMPORTS** | | |
| 21 | pydantic | 2.13.5 | ext-dep | **IMPORTS** | re-measured 2026-10-02; `BaseModel` works on the abi3 `pydantic_core` build ([Support_Pydantic.md](Support_Pydantic.md)) | was G1 |
| 22 | pytest | 9.1.1 | pure | FAILS | `NameError: name 'EnvironmentError' is not defined` | G8, then G5 |
| 23 | click | 8.5.0 | pure | SHADOWED | Grail's own `src/python/stdlib/click` answered | G10 |
| 24 | iniconfig | 2.3.0 | pure | **IMPORTS** | | |
| 25 | anyio | 4.14.2 | pure | FAILS | `ImportError: cannot import name 'AnyStr' from 'typing'` | G2, then G9 |
| 26 | pydantic-core | 2.46.5 | ext | **IMPORTS** | re-measured 2026-10-02; the stock wheel imports but its first validation kills the gem (inline `str`/`float` layout, W5/W6) — validating needs the abi3 build | was G2 |
| 27 | grpcio-status | 1.83.1 | ext-dep | **IMPORTS** | | |
| 28 | attrs | 26.1.0 | pure | FAILS | `FrozenInstanceError: can't set attribute` | G11 |
| 29 | s3transfer | 0.19.2 | pure | FAILS | `AttributeError: 'super' object has no attribute '__call__'` | G7 six.moves |
| 30 | h11 | 0.16.0 | pure | FAILS | `ImportError: cannot import name 'AnyStr' from 'typing'` | G2, then G12 |
| 31 | fsspec | 2026.7.0 | pure | FAILS | `ImportError: cannot import name 'ESPIPE' from 'errno'` | G3, then G13 |
| 32 | annotated-types | 0.8.0 | pure | FAILS | `TypeError: GroupedMetadata.__init_subclass__() missing 1 required positional argument: 'cls'` | G14 |
| 33 | protobuf | 7.36.0 | ext | **IMPORTS** | (pure-Python fallback) | |
| 34 | markupsafe | 3.0.3 | ext | SHADOWED | Grail's own `src/python/stdlib/markupsafe` answered | G10 (pre-deploy: CRASH, **G4**) |
| 35 | httpx | 0.28.1 | pure | **IMPORTS** | | |
| 36 | httpcore | 1.0.9 | pure | FAILS | `ImportError: cannot import name 'AnyStr' from 'typing'` | G2, then G12 |
| 37 | typing-inspection | 0.4.4 | pure | **IMPORTS** | | |
| 38 | pandas | 3.0.5 | ext | CRASH | fatal `dlopen` (numpy's) | out of scope, via G4 |
| 39 | platformdirs | 4.11.5 | pure | **IMPORTS** | | |
| 40 | pathspec | 1.1.1 | pure | FAILS | `AttributeError: module '?' has no attribute '_Final'` | G2, then G3 |
| 41 | python-dotenv | 1.2.3 | pure | **IMPORTS** | | |
| 42 | jinja2 | 3.1.6 | ext-dep | SHADOWED | Grail's own `src/python/stdlib/jinja2` answered | G10 (pre-deploy: CRASH, **G4**) |
| 43 | filelock | 3.32.4 | pure | FAILS | `TypeError: object.__init_subclass__() takes no keyword arguments` | G3 |
| 44 | pyjwt | 2.13.0 | pure | FAILS | `TypeError: object.__init_subclass__() takes no keyword arguments` | G3 |
| 45 | s3fs | 2026.7.0 | ext-dep | FAILS | `ImportError: cannot import name 'ESPIPE' from 'errno'` | G3 errno, then G13 |
| 46 | litellm | 1.98.0 | ext | FAILS | `AttributeError: module '?' has no attribute '_Final'` | G2, then G3 |
| 47 | jmespath | 1.1.0 | pure | **IMPORTS** | | |
| 48 | tqdm | 4.70.0 | pure | **IMPORTS** | | |
| 49 | aiohttp | 3.14.3 | ext | CRASH | fatal `dlopen` of multidict's `.so` | out of scope, via G4 |
| 50 | yarl | 1.24.5 | ext | CRASH | fatal `dlopen` of multidict's `.so` | out of scope, via G4 |

**Rows 21 and 26 were re-measured on 2026-10-02**, after the pydantic work in
[Support_Pydantic.md](Support_Pydantic.md) (Phases 0–6); every other row, and
every total below, is the original measurement. The G1 and G2 walls those two
rows stopped at are gone for them, and pydantic's own test suite now runs —
see that document for the slice and its numbers.

(The "then Gx" entries come from the stubbed probe pass described below, not
from this run.)

## Probing past the first blocker

A package that dies on its first import line names one gap and hides the rest.
So a second, **stubbed** pass ran the failing packages again with the cheapest
possible shim in place for each named gap (`errno` constants filled from
CPython 3.14, `typing.AnyStr`/`typing._Final` fabricated,
`builtins.EnvironmentError = OSError`) to see what was behind it. **Nothing
from that pass is committed, and no number in the Headline or Results tables
above comes from it** — those are from a clean run with no stubs.

What it bought:

| Package | Behind the first blocker |
| --- | --- |
| pytest | `EnvironmentError` + `errno` cleared → `No module named 'importlib.machinery'` (same gap as setuptools' `importlib.abc`) |
| typing-extensions, pathspec, litellm | `typing` names cleared → `object.__init_subclass__() takes no keyword arguments` — the SAME gap that blocks filelock and pyjwt |
| anyio | `typing` cleared → `ImportError: cannot import name 'Signals' from 'signal'` |
| h11, httpcore | `typing` cleared → `TypeError: __class__ assignment: 'CLIENT' object layout differs from 'CLIENT class'` |
| fsspec, s3fs | `errno` cleared → `AttributeError: 'OrderedCollection' object has no attribute 'get'` |
| boto3, s3transfer, attrs, annotated-types, cffi | unchanged — none of these is a stdlib-surface gap |

The load-bearing result is the second row: **G3 blocks five packages, not two.**
The clean run could only see two of them, because `typing` failed first. That
is the reconnaissance argument in one line.

## The ranked gap list (first measurement, 2026-08-30)

Ranked by packages unblocked, counting only what the evidence supports.
"Blocks" means the package's import stops there; "behind" means a stubbed probe
reached it.

### G3 — `object.__init_subclass__()` rejects keyword arguments, and `errno` has 25 of 109 names

Two gaps that happen to share a rank; split them when picking work.

**G3a `__init_subclass__` keywords — 5 packages.** Blocks `filelock`, `pyjwt`
outright; behind G2 for `typing-extensions`, `pathspec`, `litellm`.
`typing-extensions` alone is a dependency of much of the rest of the ecosystem,
so this is the widest single object-model gap here. Note the naive repro
**passes** — `class Sub(Base, flavour='x')` with a `__init_subclass__(cls, **kw)`
works, as do `metaclass=`, `Protocol` and `Generic[T]` subclassing. The failing
shape is more specific and is in `filelock/_api.py`; find it there rather than
from the message.

**G3b `errno` — 2 packages, and trivially fixable.** Blocks `fsspec` and
`s3fs` on `ESPIPE`; `pytest` hits `EXDEV` one step later. Grail's `errno`
exposes **25 of CPython 3.14's 109** public names. Missing includes `ESPIPE`,
`EXDEV`, `ENOTSUP`, `EOPNOTSUPP`, `ENOSPC`, `ERANGE`, `EDOM`, `ELOOP`,
`errorcode`. This is a table, not a design problem.

### G2 — `typing` has 84 of 200 names

**4 packages blocked** (`typing-extensions`, `pathspec`, `pydantic-core`,
`litellm`) **and 3 more** (`anyio`, `h11`, `httpcore`) on `AnyStr`. Missing
public names include `AnyStr`, `Text`, `ChainMap`, `Counter`, `Deque`,
`DefaultDict`, `OrderedDict`, `TypeGuard`, `TypeIs`, `TypeAliasType`,
`ReadOnly`, `NoDefault`, `ParamSpecArgs`/`Kwargs`. Missing internals that
`typing_extensions` reaches for directly include `_Final`, `_SpecialForm`,
`_GenericAlias`, `_type_check`, `_eval_type`, `_ProtocolMeta`, `_TypedDictMeta`.

Note the error text: `AttributeError: module '?' has no attribute '_Final'`.
The module's name is rendered as `?`, which cost real time here — worth fixing
alongside.

### G4 — a failed `dlopen` kills the session instead of raising `ImportError`

**4 packages** land here in the measured run (`numpy`, `pandas`, `aiohttp`,
`yarl`), plus **2 more in the pre-deploy image state** (`markupsafe`, `jinja2`)
— and those two are where it is a genuine Grail defect rather than
C-extension scope, because both ship pure-Python fallbacks behind
`try: from ._speedups import ... except ImportError:`. Measured directly, and
independently of any of them:

```python
print("START")
try:
    import numpy._core._multiarray_umath
except ImportError as e:
    print("CAUGHT", e)
print("END")
```

prints `START`, then the process dies. No `CAUGHT`, no `END` — `except
BaseException` cannot see it either.

The sharpest form of it: `import markupsafe` and `import jinja2` **succeed**
with no venv on `sys.path`, and **kill the session** once a venv containing
`markupsafe`'s `.so` is present — that is exactly the pre-deploy reading above.
Installing a package into a venv breaks something that worked before. The
committed framework build hides it rather than fixing it: any bundled module
that reaches a venv `.so` through an `except ImportError` guard has the same
exposure the first time it is built. Fixing G4 costs nothing for numpy and pandas —
they really do need the extension — but it converts a process kill into the
clean `ModuleNotFoundError` that `docs/Sys_Path_Bootstrap.md` says is the point
of not adopting the host's site-packages.

### G1 — `from X import *` inside a nested block emits invalid Smalltalk

**2 packages**, both large: `pyyaml` and `pydantic`. Minimal repro:

```python
try:
    from json import *
except ImportError:
    pass
```

→ `a CompileError occurred (error 1001), expected a right bracket (])`,
uncatchable, session dead. At module top level the same statement is fine — it
compiles to `self @env1:___mergePublicAttrsFrom: …`. Inside a `try`, codegen
falls through to the named-import path and emits a *variable named `*`*
(dumped with `GRAIL_CODEGEN_TRACE_DIR`):

```smalltalk
* := ((((Python @env0:at: #builtins) instance) ___import__: { 'yaml.cyaml'. nil. nil. { '*' }. 0 } kw: nil) @env1:___pyAttrLoad___: #'*').
```

`pydantic/__init__.py` produces five of those lines,
`yaml/__init__.py` one. The guarded `from .cyaml import *` / `from .errors
import *` idiom is common, so expect more than these two in a wider census.

### G5 — `importlib.abc` and `importlib.machinery` do not exist

**2 packages**: `setuptools` (`importlib.abc`) and, once G8 and G3b are
stubbed, `pytest` (`importlib.machinery`).

### G7 — `six.moves.<windows-only>` raises the wrong exception type

**2 packages**: `boto3` and `s3transfer`, both through `dateutil.tz`.
`dateutil/tz/__init__.py` imports `.win` inside `try/except ImportError`;
`win.py` does `from six.moves import winreg`. CPython raises `ImportError`
there and the guard swallows it. Grail raises `AttributeError: 'super' object
has no attribute '__call__'`, which the guard does not catch.

Worth stressing: `import dateutil` is one of the 17 successes, and
`import dateutil.tz` fails. See the caveat section.

### G6 — `_thread.allocate_lock` is a lock INSTANCE, not a factory

**1 package** (`cffi`), and a two-line fix. `_thread.allocate_lock` is a
`PyThreadLock` object. A direct `_thread.allocate_lock()` happens to work, but
the alias form `cffi/lock.py` uses does not:

```python
f = _thread.allocate_lock
f()      # TypeError: 'PyThreadLock' object is not callable
```

(`threading.Lock` is fine — it is a bound method.)

### G8 — `EnvironmentError` is not a builtin

**1 package** (`pytest`). A deprecated alias of `OSError`, still written.

### G11 — assigning a dunder onto an existing class has no effect

**1 package** (`attrs`). Reproduced directly:

```python
class A:
    def __setattr__(self, k, v): raise Exception("frozen")
A.__setattr__ = object.__setattr__
A().y = 3        # still raises Exception("frozen")
```

`attr/_make.py` does exactly this (`cls.__setattr__ = _OBJ_SETATTR`) to unfreeze
an inherited attrs `__setattr__`, and the import dies with
`FrozenInstanceError`. The mechanism is reproduced; that it is the *same*
failure attrs hits is inference from the location, not proof.
(`object.__setattr__(obj, k, v)` **does** correctly bypass a custom
`__setattr__`, including via an alias and with `__slots__` — that half is fine.)

### G14 — `__init_subclass__` not made an implicit classmethod in some shapes

**1 package** (`annotated-types`):
`GroupedMetadata.__init_subclass__() missing 1 required positional argument: 'cls'`.
The plain shape works, so this is a conditional/`Protocol` class-body variant.

### G12 — `__class__` assignment rejects a same-layout class

**2 packages** behind G2 (`h11`, `httpcore`):
`__class__ assignment: 'CLIENT' object layout differs from 'CLIENT class'`.
Plain `o.__class__ = SubClass` works, so the failing shape is narrower — h11's
sentinel classes.

### G13 — a Smalltalk `OrderedCollection` reaches Python code

**2 packages** behind G3b (`fsspec`, `s3fs`):
`AttributeError: 'OrderedCollection' object has no attribute 'get'`. Something
in the stdlib hands back a raw Smalltalk collection where a `dict` is due.

### G9 — `signal` has 32 of 65 names

**1 package** behind G2 (`anyio`), on `signal.Signals`. Also missing:
`Handlers`, `Sigmasks`, `pthread_kill`, `pthread_sigmask`, `setitimer`,
`getitimer`, `siginterrupt`, `sigwait`, `set_wakeup_fd`, `SIGTRAP`, `SIGPROF`.

### G10 — Grail's bundled tree silently shadows the pip package

**4 packages** (`requests`, `click`, `jinja2`, `markupsafe`). This is
deliberate — `docs/Sys_Path_Bootstrap.md` explains
why Grail's own stdlib must win — and it is not obviously wrong. It is listed
because it is invisible: `import requests` succeeds, `requests.__version__`
reads `2.32.0+grail.shim`, and the user's pinned 2.34.2 is simply not what ran.
Whatever the resolution, a census has to report these separately or it is
lying about its own numbers.

### Summary table

| Gap | Packages blocked (clean run) | + behind another gap | Total |
| --- | --- | --- | --- |
| G3a `__init_subclass__` keywords | filelock, pyjwt | typing-extensions, pathspec, litellm | **5** |
| G4 fatal `dlopen` | numpy, pandas, aiohttp, yarl | markupsafe, jinja2 (pre-deploy) | **6** (2 in scope) |
| G2 `typing` surface | typing-extensions, pathspec, pydantic-core, litellm, anyio, h11, httpcore | | **7** |
| G1 nested `import *` | pyyaml, pydantic | | **2** |
| G3b `errno` surface | fsspec, s3fs | pytest | **3** |
| G5 `importlib.abc`/`.machinery` | setuptools | pytest | **2** |
| G7 six.moves wrong exception | boto3, s3transfer | | **2** |
| G12 `__class__` assignment | | h11, httpcore | **2** |
| G13 `OrderedCollection` leak | | fsspec, s3fs | **2** |
| G6 `_thread.allocate_lock` | cffi | | 1 |
| G8 `EnvironmentError` | pytest | | 1 |
| G11 dunder reassignment on a class | attrs | | 1 |
| G14 `__init_subclass__` classmethod | annotated-types | | 1 |
| G9 `signal` surface | | anyio | 1 |

The columns are not disjoint and must not be summed: `pytest` needs G8 **and**
G5, `anyio` needs G2 **and** G9. The table ranks candidate fixes; it does not
predict how many packages go green.

**If you want the cheapest wins first:** G3b (`errno` — a table), G8
(`EnvironmentError` — an alias), G6 (`allocate_lock` — a factory), G4 (turn a
fatal `dlopen` into `ImportError`). Those four are small and between them touch
six distinct packages (`fsspec`, `s3fs`, `pytest`, `cffi`, `markupsafe`,
`jinja2`) — though only `cffi` and `pytest` plausibly go green on that fix
alone; the rest have a next blocker already named above. **If you want the widest win:** G2/G3a, which is most of the
`typing` stack and therefore most of the modern ecosystem.

## What this does NOT measure

* **Importing is not using.** Every "IMPORTS" here means `import <pkg>`
  returned. It says nothing about whether the package does its job. The census
  contains its own counterexample: `python-dateutil` is one of the 17
  successes, and `import dateutil.tz` — the part anyone actually wants — fails.
  `docs/Sys_Path_Bootstrap.md` records two more: `idna` imports and
  `idna.encode()` fails on `unicodedata.bidirectional`.
* **Submodules are scored only for projects whose top level imports.** A
  project that fails at the top has no submodule number, because every one of
  its submodules imports the top first. The submodule level also stops at
  importing; it does not call anything.
* **One platform.** Darwin arm64 (GemStone 3.7.5 for the first census, 4.0
  since). Nothing here has been run on Linux x86_64, and this project has been
  bitten before by a stable platform-only delta that turned out to be a real
  defect (PR #710).
* **One dependency resolution.** Versions are whatever pip resolved on
  2026-08-30. A package that imports today can break on its next release, and a
  re-run months later measures partly the ecosystem's drift, not Grail's.
* **The `ext`/`ext-dep`/`pure` split is from wheel contents**, not from what
  the code needs at runtime. A `pure` project can still fail on a C-only
  dependency imported lazily, and an `ext` project can be fine if its extension
  is optional — `charset-normalizer` and `protobuf` both are.
* **Grail gives no traceback frames for an exception raised during an import.**
  Observed, not root-caused: `traceback.format_exception` on such an exception
  yields the message and nothing else, and `tb_frame.f_code.co_filename` reports
  the wrong file. Every root cause above therefore came from the exception
  message plus either a hand-rolled `__import__` spy or a
  `GRAIL_CODEGEN_TRACE_DIR` dump. That tax is paid on every package
  investigation and is worth its own fix.
* **The image is not pristine.** The measured extent has had `install.sh` and
  `run_tests.sh` run against it, so every framework module `deployFrameworks.gs`
  builds is committed. Two rows are known to move with that state; others may.
* **Nothing here gates CI.** This is a survey, like
  `scripts/cpython_import_census.py`. It is not in `ci.yml` and no number here
  is a threshold.

## Re-running it

```bash
./scripts/pypi_package_census.py --venv <venv> --only pyyaml,click   # a subset
./scripts/pypi_package_census.py --venv <venv> --submodules          # + level 2
./scripts/pypi_package_census.py --report                            # last TSV
```

`out/pypi/census.tsv` is the machine-readable form and `out/pypi/<project>.out`
holds each probe's full output. With `--submodules`,
`out/pypi/submodules.tsv` has one row per module (CPython's verdict, then
Grail's), and `out/pypi/submodules/<project>.{cpython,grail}.out` hold the two
runs' full output, including where each crashed process resumed. All of it is
gitignored; the committed artefact is this document.
