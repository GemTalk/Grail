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

## Headline

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
./scripts/pypi_package_census.py --venv /tmp/census-venv
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

**Package selection.** Rows 1–50, in rank order, of
[hugovk's top-pypi-packages](https://hugovk.dev/top-pypi-packages/) dump
(`top-pypi-packages.min.json`, `last_update 2026-08-01`, downloaded
2026-08-30). Downloaded, not recalled: a list from memory is not a basis, and
the file is the thing another person can re-fetch. No hand-picking — "the 50
most-downloaded projects" is a rule; a curated list is a preference. The names
are frozen in `scripts/pypi_census_packages.txt`.

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
top-level names out of each wheel's own `RECORD`. One project needs a
hand-written entry (`protobuf` → `google.protobuf`): its top level is the
`google` **namespace** package, and `import google` succeeds while measuring
nothing.

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

## Results

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
| 21 | pydantic | 2.13.5 | ext-dep | CRASH | `CompileError (error 1001), expected a right bracket (])` | G1 |
| 22 | pytest | 9.1.1 | pure | FAILS | `NameError: name 'EnvironmentError' is not defined` | G8, then G5 |
| 23 | click | 8.5.0 | pure | SHADOWED | Grail's own `src/python/stdlib/click` answered | G10 |
| 24 | iniconfig | 2.3.0 | pure | **IMPORTS** | | |
| 25 | anyio | 4.14.2 | pure | FAILS | `ImportError: cannot import name 'AnyStr' from 'typing'` | G2, then G9 |
| 26 | pydantic-core | 2.46.5 | ext | FAILS | `AttributeError: module '?' has no attribute '_Final'` | G2 |
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

## The ranked gap list

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
* **Only the top-level module.** A package with 40 submodules is scored on one
  import. Submodule coverage is unmeasured everywhere except where a package
  imports them itself.
* **One platform, one version.** Darwin arm64, GemStone 3.7.5. Nothing here has
  been run on Linux x86_64 or on 4.0, and this project has been bitten before by
  a stable platform-only delta that turned out to be a real defect (PR #710).
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
./scripts/pypi_package_census.py --report                            # last TSV
```

`out/pypi/census.tsv` is the machine-readable form and `out/pypi/<project>.out`
holds each probe's full output. Both are gitignored — the committed artefact is
this document.
