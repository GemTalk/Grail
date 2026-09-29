# Supporting pydantic v2 — loading `_pydantic_core` through the CPython shim

Status: **plan, nothing implemented yet** (recorded 2026-09-29, to resume
2026-09-30). Branch `jmason/pydantic`.

## The decision

pydantic v2 is a pure-Python front end (`pydantic`, ~46k lines) over
`pydantic_core`, whose engine is `_pydantic_core.so`: Rust, written against
**PyO3**, with no pure-Python fallback. [Support_FastAPI.md](Support_FastAPI.md)
§4 laid out three routes. We are taking **Route A: run the real
`_pydantic_core` on the CPython shim** — the model `_sre` and NumPy set — and
**not** the embedded libpython in `EmbeddedPython`. The embedded interpreter
would run pydantic unmodified, but over CPython objects in a separate heap;
the point here is validating *Grail* objects in the gem.

The shim has two variants, and this plan uses the first while keeping the
second as the recorded fallback:

| Variant | Precedent | What is loaded | Pro | Con |
| --- | --- | --- | --- | --- |
| **stock wheel** | NumPy ([Shim_NumPy.md](Shim_NumPy.md)) | the PyPI `cp314` `.so`, unmodified | `pip install pydantic` just works; no toolchain | the wheel inlines CPython struct access (see W5) |
| **built from source against the shim** | `_sre` (compiled against `cpython.h`, linked into `libcpython_ua`) | `pydantic_core` built by maturin/cargo with our PyO3 config | we choose the ABI, e.g. `abi3`, which removes W5 | we ship and maintain our own build of a Rust project |

Maturin is only the build/packaging tool; it does not exist at run time. What
the `.so` needs is fixed by how **PyO3** was configured when it was built. The
binary links no libpython and resolves every `Py*` symbol at `dlopen` —
exactly like a C wheel — so this is the NumPy mechanism, not a new one.

## Where it stands (measured 2026-09-29)

Target: `pydantic 2.13.5` / `pydantic_core 2.46.5`
(`_pydantic_core.cpython-314-darwin.so`, 4.1 MB, arm64), built with
**PyO3 0.28.3**, **jiter 0.14.0**, speedate 0.17.0. GemStone 4.0.0.a4
(build 2026-09-25), `main` at `ef619733`.

* **`import pydantic` → clean `ImportError`**:
  `dlopen(...): symbol not found in flat namespace '_PyByteArray_Type'`.
  G4 (#755) made that an ImportError rather than a dead session.
* **The Package_Census blockers G1 and G2 are fixed** — re-verified today on
  both codegen paths. Nested `from X import *` compiles and binds (f619a8a9);
  `typing` matches CPython 3.14 name-for-name (#1200–#1241). `yaml`,
  `typing_extensions`, `typing_inspection` all report `IMPORTS`. pydantic's
  own star imports sit under `if typing.TYPE_CHECKING:`, so only their
  *compiling* ever mattered.
* **Symbol floor** (`./scripts/shim_symbol_floor.sh <so> --list`): 162 CPython
  API symbols — about half of NumPy's 317.

  | | count | notes |
  | --- | ---: | --- |
  | real in the shim | 106 | |
  | stub in the shim | 18 | `PyObject_IsInstance`, `PyObject_IsSubclass`, `PyObject_GenericSetAttr` (pydantic sets model `__dict__` with it), `PyObject_GenericGetDict`, `PyImport_Import` (how PyO3 imports *every* module), `PyObject_VectorcallMethod`, `PyObject_Size`, `PyObject_LengthHint`, `PyException_SetCause`/`SetTraceback`, `PyErr_WriteUnraisable`, `PyThreadState_Get`, `PyUnicode_AsEncodedString`, `PyNumber_Remainder`/`TrueDivide`, `PyComplex_*` ×3 |
  | missing, data | 5 | `PyByteArray_Type`, `PyFunction_Type`, `PyModule_Type`, `PyExc_AssertionError`, `PyExc_BaseExceptionGroup` — each fails `dlopen` |
  | missing, function | 33 | notably `PyErr_GetRaisedException`/`SetRaisedException` (PyO3's *entire* error path on 3.12+), `Py_TYPE` (a real function in 3.14), `PyUnicodeWriter_*` ×5, `PyLong_As/FromNativeBytes`, `PyType_GetName`/`GetQualName`/`GetModuleName`, `PyType_Freeze`, `PyCMethod_New`, `PyUnicode_New`/`DATA`/`InternInPlace` |

  The binary uses classic lazy binding (no `LC_DYLD_CHAINED_FIXUPS`): a missing
  function does not fail `dlopen`, it **aborts the process** on first call. So
  all 38 must exist before anything past `dlopen` can be measured.

## The walls, ranked

The symbol floor is the cheap part (it was "a few hours, mostly mechanical"
for NumPy). What costs is the object model — the same finding as
[Shim_Object_Model.md](Shim_Object_Model.md) §3, sharper here.

**W1 — Grail classes are not `PyTypeObject`s.** `pydantic_core`
`src/validators/model.rs:348 create_class` reads `(*raw_type).tp_new` off the
model class and calls it; `Bound<PyType>` downcasts check the type flags first.
A wrapped Grail class is the 32-byte wrapper (`CPythonShim>>wrap:`) whose
`ob_type` is `object` (`typeAddrFor:` falls through to `Object`). Needs a
real-layout type-object *mirror* per Grail class that crosses, with `tp_new`
trampolining into Grail `cls.__new__`, `tp_flags`, `tp_name`, and
`PyType_IsSubtype` answered by Grail `issubclass`. On the path of every
`BaseModel` validation.

**W2 — exception types are 16-byte sentinels**, `{1, NULL}`
(`src/c/shim/cpython.cc:225ff`), not type objects. Nine pyclasses extend
them: `ValidationError`, `PydanticCustomError`, `PydanticKnownError`,
`PydanticOmit`, `PydanticUseDefault`, `PydanticSerializationError`, … (`#[pyclass(extends=PyValueError)]`
/ `extends=PyException`). PyO3 passes the base to `PyType_FromSpec` and, on
instantiation, calls the base's `tp_new` — reading past a 16-byte object.
Plus PyO3's `PyErr` is built on `PyErr_GetRaisedException`, which must return
an exception *instance*. And a raised `ValidationError` must surface in Grail
as something `except ValueError` catches and whose `.errors()` works.
`PanicException` (PyO3's Rust-panic wrapper) has the same need. This bites
during **module init** — `add_class` creates the types there.

**W3 — the foreign-object bridge is too thin.** 25 `#[pyclass]` types
(`SchemaValidator`, `SchemaSerializer`, `ValidationError`, `Url`,
`MultiHostUrl`, `ArgsKwargs`, `TzInfo`, `PydanticUndefinedType`, …) reach
Grail as `ShimForeignObject`, which forwards only `__name__`/`__qualname__`/
`__module__`, number conversions, and `str`/`repr`. Needed: generic attribute
lookup (`tp_getattro` / `tp_methods` / `tp_getset`), method calls, `isinstance`
against foreign types, and pickling/`__reduce__` later. Four are declared
`subclass` (`ValidationError`, `PydanticCustomError`, `Url`, `MultiHostUrl`),
so Python code may define a *Grail class whose base is a foreign C type* —
the one-direction-harder version of W1; find out early whether pydantic's own
Python does this on its import path.

**W3a — heap types are not exported as module attributes.**
`shimModuleAttrs` skips C-only objects ("no OOP at offset 16",
[Shim_API_Gaps.md](Shim_API_Gaps.md) P5), so
`from ._pydantic_core import SchemaValidator` — line 8 of
`pydantic_core/__init__.py` — cannot find anything. Export them as foreign
proxies.

**W4 — the Python half.** `annotated_types` (a pydantic dependency) fails:
`super(type, obj): obj (instance of annotated_types) is not an instance or
subtype of type (Generic)` at `src/python/stdlib/typing.py:1175`. Reduced:

```python
from typing import Protocol, TYPE_CHECKING
class A(Protocol):
    if not TYPE_CHECKING:
        def __init_subclass__(cls, **kw):
            super().__init_subclass__(**kw)
class B(A): pass     # Grail: TypeError (module passed as obj); CPython: fine
```

The same `def` directly in the class body works. So: **a method defined inside
a compound statement in a class body gets the wrong `super()`** — the class-body
sibling of G1. Both codegen paths. Expect more Python-side walls once
`import pydantic` gets past the `.so`; none are known yet.

**W5 — the stock wheel reads object memory directly.** PyO3's non-limited
3.14 FFI (`pyo3-ffi-0.28.3/src/cpython/*.rs`) inlines:

| access | what it reads | on a Grail wrapper |
| --- | --- | --- |
| `PyFloat_AS_DOUBLE` | `ob_fval` @16 | **the OOP** → *silently wrong value*, taken on every `f64` extract of an exact float (`pyo3 src/types/float.rs:127`) |
| `PyBytes_AS_STRING` | `ob_sval` @32 | past the 32-byte wrapper |
| `PyTuple_GET_ITEM`/`SET_ITEM`, `PyList_*` | `ob_item` | fine — real-layout `ShimTupleObject`/`ShimListObject` (incl. 3.14 `ob_hash`) |
| `Py_INCREF`/`Py_DECREF` | `ob_refcnt` @0 | fine; `_Py_Dealloc` is a no-op |
| `PyDateTime_GET_YEAR` … | `PyDateTime_*` data bytes | garbage; also the datetime capsule is a static stub (`cpython.cc:5517`) and a Grail datetime's `ob_type` is `object`, so `PyDateTime_Check` fails first |
| jiter `PyUnicode_New` + `PyUnicode_DATA` | writes into a fresh str's buffer | needs a real-layout str (`PyUnicode_DATA` itself is a function on 3.14 — implementable) |

This is exactly the trigger [Shim_Object_Model.md](Shim_Object_Model.md) §4
set for revisiting the "prefix OOP" design: *an extension forcing inline
access of our immutable scalar types*.

**W6 — `TzInfo` extends `datetime.tzinfo`** (`src/input/datetime.rs:729`), a
second native base type after W2.

**W7 — speed, unmeasured.** Every `Py*` call on a Grail object is a
`GciPerform` into Smalltalk; pydantic makes several per field.

**W8 — process-lifetime Rust caches.** PyO3 keeps interned strings and type
objects in Rust statics for the life of the *process*; shim wrappers are
session-scoped and swept. `CPythonShim.gs:120-135` documents the same
use-after-free shape for `_sre`. Check that nothing PyO3 caches can be swept
or survive a shim library reload.

## The plan

Each phase ends at a measurable exit, and the next phase starts from whatever
wall that exit hits — as `Shim_NumPy.md` did. Record each wall and its fix in
this file as it falls.

### Phase 0 — Python-side prerequisite (W4)
Fix method-in-compound-statement `super()` in a class body; add a regression
test (both codegen paths — `...UnderIR` variant). Exit: census probe reports
`annotated_types` `IMPORTS`. Independent of everything below; do it first
because it is small and it is on pydantic's import path.

### Phase 1 — symbol floor
New `src/c/shim/shim_pyo3.cc` (the `shim_numpy.cc` pattern; add to
`EXT_OBJECTS` in `src/c/shim/Makefile`), prototypes taken from the real 3.14
headers. Real implementations where cheap — `Py_TYPE`, `Py_IsFinalizing`,
`PyType_GetName`/`QualName`/`ModuleName`, `PyUnicodeWriter_*` over a C buffer
finishing in `PyUnicode_FromStringAndSize`, `PyIter_NextItem`, `PyObject_DelItem`,
`PyObject_Dir`, `PyMapping_Items`, `PyLong_*NativeBytes` — and `STUBLOG`
stubs otherwise. The five data symbols as real type objects / exceptions.
Exit: `./scripts/shim_symbol_floor.sh` reports **0 missing**, `dlopen` succeeds,
`PyInit__pydantic_core` runs to its first behavioural wall.

### Phase 2 — module init (W2, W3a, the init-time stubs)
Expected, in order of likelihood: `PyCMethod_New` (module functions),
`PyImport_Import` (real, via `CPythonShim>>PyImport_ImportModule:`),
`PyUnicode_InternInPlace`, `PyType_FromSpec` for 25 pyclasses — and the
exception bases. **Exception types become real `PyTypeObject`s** (keep
`get_error_type` name mapping working), with a `BaseException` `tp_new` that
allocates a `PyBaseExceptionObject`-layout body; `PyErr_GetRaisedException` /
`SetRaisedException` over instances. Then export heap types as module
attributes (foreign proxies). Exit: **`import pydantic_core` succeeds in
Grail** and `pydantic_core.SchemaValidator` is callable.

### Phase 3 — the foreign bridge (W3)
Generic forwarding for `ShimForeignObject`: attribute load through
`tp_getattro` (PyO3 sets `PyObject_GenericGetAttr`, so the shim needs a real
one walking `tp_dict` built from `tp_methods`/`tp_getset`), calls, `isinstance`.
Raise a foreign exception instance into Grail as a Grail exception that
inherits the right Grail base (`ValueError`) and carries the pointer.
Exit: `SchemaValidator({'type': 'int'}).validate_python('1') == 1`, and
`validate_python('x')` raises a `ValidationError` caught by `except ValueError`
with a correct `.errors()`.

### Phase 4 — inline layout (W5, W6) — **decision point**
Write the guard test first: `SchemaValidator({'type': 'float'}).validate_python(1.5) == 1.5`
(fails silently today by construction). Then choose:
* **(a) give Grail's immutable scalars a real CPython layout** — float
  (`ob_fval`), bytes (`ob_sval`), str (compact-ASCII/UCS4 body), datetime — via
  the prefix-OOP header of Shim_Object_Model.md §2, prototyped on `float` first;
  keeps the stock-wheel variant, and helps every future wheel; or
* **(b) switch to the source-built variant with `abi3`.** Measured today:
  `cargo build --features pyo3/abi3-py314` on the `pydantic_core` sdist stops
  at **7 errors** (29 for `abi3-py310`): `TzInfo` subclassing `PyTzInfo` (2),
  `PyDateAccess`/`PyTimeAccess`/`PyDeltaAccess` imports (4), `PyFunction` (1).
  Under `Py_LIMITED_API` PyO3 does no struct access beyond
  `ob_refcnt`/`ob_type`. Those 7 may be only the first compile phase; a full
  abi3 build is **not** established. Costs a patched fork.

PyO3 also has a `GraalPy` cfg that routes these same accessors through
functions — and pydantic-core ships `graalpy311`/`graalpy312` and `pp311`
wheels, i.e. two non-CPython runtimes already run it through C-API
emulation. That is the evidence the route is sound, and a hint at the cost:
both keep a native mirror of their managed objects, which is option (a).
Exit: str/bytes/float/int/list/dict/datetime schemas validate correctly.

### Phase 5 — Grail classes as types (W1)
Type-object mirrors for Grail classes; real `PyObject_GenericSetAttr` /
`GenericGetDict` / `IsInstance` / `IsSubclass` on Grail objects. Exit:

```python
from pydantic import BaseModel
class M(BaseModel):
    x: int
    y: str = "d"
assert M(x="1").x == 1 and M.model_validate({"x": 2}).model_dump() == {"x": 2, "y": "d"}
```

### Phase 6 — end to end, and measure
`import pydantic` clean; a slice of pydantic's own test suite; wall-clock per
validation vs CPython (W7); W8 audit. Update `Package_Census.md` rows 21 and 26,
and `Support_FastAPI.md` §4/§6.

### Tests and CI (open)
Phases 1–3 can have SUnit tests that need no wheel (the `_shimtestmodule.c` /
`ShimForeignObjectTestCase` pattern: exception types, `RaisedException`,
generic forwarding). A test that loads the real `.so` needs the wheel in CI;
decide whether CI installs it or those tests skip without it.

## Resume here

1. `source .setenv` — it now points at the **4.0.0.a4** product
   (`~/Documents/GemStone/GemStone64Bit4.0.0.a4-arm64.Darwin`) with
   `GEMSTONE_GLOBAL_DIR=~/Documents/GemStone` and
   `GEMSTONE_NRS_ALL=#netldi:ldi40`, which is how the current `gs40`/`ldi40`
   were started. (`.setenv` is a symlink to the shared `../.setenv`.) On this
   build `./install.sh` succeeds **with IR on**, including the gemdb deploy —
   the `GsComMethNode>>envId` defect CLAUDE.md describes is absent.
2. Recreate the probe venv (the 2026-09-29 one was in a session scratchpad):
   ```bash
   python3.14 -m venv /tmp/pydantic_probe
   /tmp/pydantic_probe/bin/pip install pydantic==2.13.5 pydantic_core==2.46.5 pyyaml
   SO=/tmp/pydantic_probe/lib/python3.14/site-packages/pydantic_core/_pydantic_core.cpython-314-darwin.so
   make -C src/c/shim && ./scripts/shim_symbol_floor.sh $SO --list
   ```
3. Probe an import the way the census does (fresh process, venv via
   `VIRTUAL_ENV`, nothing else on the path):
   ```bash
   mkdir -p /tmp/pyd_probe && cp scripts/grail_import_probe.py /tmp/pyd_probe/
   env -u PYTHONPATH VIRTUAL_ENV=/tmp/pydantic_probe ./grail /tmp/pyd_probe/grail_import_probe.py pydantic
   ```
4. Rust sources, for reading what PyO3 does at a wall:
   ```bash
   pip download --no-binary :all: --no-deps pydantic_core==2.46.5 -d /tmp/pdc && tar xzf /tmp/pdc/*.tar.gz -C /tmp/pdc
   (cd /tmp/pdc/pydantic_core-2.46.5 && CARGO_HOME=/tmp/pdc/cargo cargo fetch)
   # pyo3 / pyo3-ffi / jiter land in /tmp/pdc/cargo/registry/src/*/
   ```
5. Start at **Phase 0**, then Phase 1.

Two unrelated defects found on the way, not on pydantic's path (its star
imports are under `TYPE_CHECKING`), recorded so they are not lost — both in
`module>>___mergePublicAttrsFrom:` (`src/smalltalk/Python/module.gs:987`):
`from X import *` **ignores `X.__all__`** and copies every public name; and
`from <native module> import *` binds a native module's constant *accessor
methods* as functions (`from string import *` makes `ascii_lowercase` a
function; `string.ascii_lowercase` is right).

## What has not been established

* Nothing past `dlopen` has run. The wall order in Phases 2–5 is predicted
  from PyO3 and pydantic_core source, not observed.
* Whether pydantic's Python half has further walls beyond W4.
* A complete abi3 build of pydantic_core (only the first 7 errors are known).
* Any performance number.
