# Supporting pydantic v2 — loading `_pydantic_core` through the CPython shim

Status: **Phases 0–6 done — `pydantic.BaseModel` works in Grail, and
pydantic's own test suite runs** (on the abi3 build of `pydantic_core`).
`import pydantic` is clean; a 12-module slice of pydantic's tests runs to the
end with the outcome CPython gets on most tests (Phase 6 below has the table);
W7 is measured and W8 is closed. Phases 0–2 merged as #1277, Phase 3 as #1282,
Phase 4 (b) as #1286; Phase 5 is #1289 (`jmason/pydantic3`); Phase 6 is on
`jmason/pydantic4`.

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

### Phase 0 — Python-side prerequisite (W4) — **done 2026-09-30**
Fix method-in-compound-statement `super()` in a class body; add a regression
test (both codegen paths — `...UnderIR` variant). Exit: census probe reports
`annotated_types` `IMPORTS`. Independent of everything below; do it first
because it is small and it is on pydantic's import path.

**Result: exit met** — `annotated_types` and `typing_inspection` report
`IMPORTS`; `import pydantic` now stops only at the `.so`. W4 was wider than the
reduction suggested. A class-body `def` inside `if`/`for`/`try`/`with` compiles
to a block stored as a class attribute rather than to a method, and that form
had **four** defects, all fixed on both codegen paths:

| defect | effect | fix |
| --- | --- | --- |
| zero-arg `super()` bound Smalltalk `self` — the **module** running the class body | `super().f()` ran with `type(self)` answering the module; silently wrong for any base method that reads `self` (the W4 symptom) | `CallAst>>___superObjTempName___`: bind the def's first-parameter temp |
| `__class__` read as class-body code | `NameError` | the two `__class__` branches in `NameAst` treat `classBodyValueDefNode` as method context |
| no implicit `classmethod` for `__init_subclass__`/`__class_getitem__`, nor `staticmethod` for `__new__` | `A[int]` → missing-argument `TypeError` | `FunctionDefAst>>___classBodyValueWrapper___`, used by both value-def emitters |
| **every nested def** (not only class-body ones) left a keyword bound to a named parameter in `**kw` too | `def f(tag=None, **kw)`; `f(tag=1)` gave `kw == {'tag': 1}` — `__init_subclass__` then passed `tag` on to `super()` | the closure form's kwarg binding drops `args args` as the method form already did (text and IR) |

Guarded by `tests/python/class_body_nested_def_binding.py` (18 checks, CPython
3.14 via `check_python_fixtures.sh`) and `ClassBodyNestedDefBindingTestCase`
(default path, forced IR, and an IR-actually-compiled guard).

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

**Result (2026-09-30): exit met** — floor 162 = **141 real / 21 stub / 0
missing**. The 33 functions are in `src/c/shim/shim_pyo3.cc`; the five data
symbols in `cpython.cc` (three unregistered static types, two exceptions in the
sentinel tables). Real, not stubbed: `PyCMethod_New` (a builtin-function object
in CPython 3.14's `PyCMethodObject` layout, with `tp_call` and vectorcall over
every `METH_*` convention), and `PyErr_GetRaisedException` /
`SetRaisedException` as an *interim* token carrying (type, message) whose
`ob_type` is the exception type — enough for PyO3's `PyErr` to round-trip and
match, not a Grail exception. `PyUnicode_New`/`PyUnicode_DATA` stay stubs that
raise: they need a writable real-layout str (W5).

Found on the way, and fixed because a PyO3 wheel hits them at once:
* **`PyObject_Vectorcall` ignored `kwnames`** — every keyword argument through
  vectorcall was silently dropped. PyO3 makes all keyword calls this way.
* **`shimDynLoad` walked `m_methods` unconditionally**; PyO3 leaves it NULL
  (functions arrive from the exec slot), so loading would have segfaulted.
* **W2 pulled forward: the exception sentinels became real `PyTypeObject`s.**
  pyo3-ffi *inlines* `PyExceptionClass_Check` as `Py_TYPE(t)->tp_flags`, and a
  sentinel's `ob_type` was NULL — the first error PyO3 raised would have
  segfaulted. Identity is unchanged (`get_error_type` and the parent table
  still compare pointers); each now has `ob_type = &PyType_Type`, `tp_name`,
  `tp_base` from the parent table, `BASE_EXC_SUBCLASS`, and a `tp_new` that
  allocates a `PyBaseExceptionObject`-layout body. Dynamic
  (`PyErr_NewException`) exceptions likewise.

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

**Result (2026-09-30): first half met — `import pydantic_core` reports
`IMPORTS`** (`__version__` answers `2.46.5`), and so does `import pydantic`
(its `__init__` is lazy, so that proves less). `SchemaValidator(...)` fails
`'ShimForeignObject' object is not callable`, which is Phase 3. Walls, in the
order they fell:

| # | wall | fix |
| --- | --- | --- |
| 1 | segfault: `Py_TYPE(module)` NULL — PyO3's exec slot runs `PyModule_Check` on the module, which in the shim is the bare `PyModuleDef` | `PyModuleDef_Init` stamps the def `PyModule_Type` (unregistered, so it still crosses as foreign) |
| 2 | `getattr(module, "__all__")` went to Grail as a foreign proxy; the miss raised `MessageNotUnderstood` (`,` sent in env 1 in `ShimForeignObject>>___pyAttrLoad___:`) and unwound across the user action (6011 cascade, stack overflow) | the env-0 concat; and module get/set/has-attr answered in C from `module_attrs` (`shim_module_getattr`/`setattr`), capacity 32 → 256 |
| 3 | `setattr(<pyclass>, "__match_args__", …)` → `ShimForeignObject` DNU | attribute writes on a wheel's TYPE objects go to `tp_dict`; reads consult the `tp_dict` chain first |
| 4 | Rust panic in `PydanticUndefinedType::new`: `TypeError: base type without tp_new` — PyO3 0.28 allocates every object-based pyclass through the base's `tp_new` | `PyBaseObject_Type` gets `tp_new`/`tp_alloc`/`tp_basicsize` |
| 5 | session died silently: `module subclass: 'pydantic_core._pydantic_core'` — GemStone 4.0 rejects a dotted class name (ArgumentError 2149, not a `GrailShimError`, so no ImportError) | `CPythonShim>>loadDynamicModule:` names the class by a sanitised identifier |
| 6 | `cannot import name 'ArgsKwargs'` — `shimModuleAttrs` exported only Grail value types (W3a) | every plausible object attr is exported through `pyobj_oop` — C-only objects as foreign proxies |
| 7 | `cannot import name 'from_json'` — `add_function` names each export by `getattr(fun, "__name__")`, and the proxy answered its TYPE's name | the builtin-function type answers `__name__`/`__qualname__`/`__module__`/`__doc__`/`__self__` via `tp_getattro`; a foreign object's own `tp_getattro` is consulted (except the still-stubbed `PyObject_GenericGetAttr`) |

Validated 2026-09-30 (Darwin arm64, local, so not a gate result for the
nightly): SUnit 7644/7644 once `CPythonShimTestCase>>testModuleAttrsExport` was
updated for wall 6 (it pinned "capsules are skipped"; a capsule now crosses as
a foreign proxy, as CPython exposes one). CPython gate: 2 regressions, neither
caused here — `test_pickle` TIMEOUT is load at the 600 s limit (OK alone in
518 s), and `test_xml_etree`'s `test_recursive_repr` (a stack-depth test) fails
identically on a clean `HEAD` install on this machine.

Diagnostics kept: `Py_TYPE` reports a NULL `ob_type` with a C backtrace (the
crash is otherwise inside stripped Rust); under `GRAIL_SHIM_DIAG`, exec-slot
entry and every `PyErr_GetRaisedException` (type and message) are logged.

Noted for later: `PyType_FromSpec` does **no slot inheritance** from the base
(a pyclass extending `ValueError` gets no `tp_new` from it — PyO3 reaches the
base's directly, which is why wall 4's fix is on the base), and a foreign
type's `repr` is `<ShimForeignObject object at …>`, which is what PyO3's
panic message printed for the error type.

### Phase 3 — the foreign bridge (W3)
Generic forwarding for `ShimForeignObject`: attribute load through
`tp_getattro` (PyO3 sets `PyObject_GenericGetAttr`, so the shim needs a real
one walking `tp_dict` built from `tp_methods`/`tp_getset`), calls, `isinstance`.
Raise a foreign exception instance into Grail as a Grail exception that
inherits the right Grail base (`ValueError`) and carries the pointer.
Exit: `SchemaValidator({'type': 'int'}).validate_python('1') == 1`, and
`validate_python('x')` raises a `ValidationError` caught by `except ValueError`
with a correct `.errors()`.

**Result (2026-09-30, branch `jmason/pydantic1`): exit met for int schemas.**

```python
v = SchemaValidator({'type': 'int'})
v.validate_python('1') == 1                          # True
try: v.validate_python('x')
except ValueError as e:                              # caught
    type(e)       # <class 'pydantic_core._pydantic_core.ValidationError'>, same object pydantic_core exports
    e.errors()    # [{'type': 'int_parsing', 'loc': (), 'msg': ..., 'input': 'x', ...}]  -- from Rust
    e.error_count(), e.title                         # 1, 'int'
```

What made it work:

| piece | where |
| --- | --- |
| **calling** a foreign object: `ShimForeignObject>>value:value:` → `CPythonShim>>callForeign:args:kwargs:` → user action `shimCallObject` → C `PyObject_Call` (a type is instantiated through `tp_new`/`tp_init`, a builtin function through its `METH_*` convention) | `ShimForeignObject.gs`, `CPythonShim.gs`, `cpython.cc` |
| **attributes** of a foreign object asked of C first (`shimForeignGetAttr`): the type's `tp_dict`, its own `tp_getattro`, then `tp_methods` (answering a bound builtin function; `METH_CLASS`/`METH_STATIC` bind to the type / nothing) and `tp_getset` (call the getter) along the `tp_base` chain — `foreign_generic_getattr`, shared with C callers | `cpython.cc` |
| a **Grail dict** reached C typed `object` — `PyDict` is a *subclass* of the `KeyValueDictionary` `typeAddrFor:` mapped, and pyo3-ffi's `PyDict_Check` is an inline `tp_flags` read. `typeAddrFor:` now tests `isKindOf:` for dict and list, which also covers classes defined at run time | `CPythonShim.gs` |
| **exception types** cross into Grail as Grail classes, not proxies: a shim type as the Grail class of its name, a wheel's pyclass as `type(name, (nearest base,), ns)` built once per C type, whose `__getattr__` (a Smalltalk block) forwards to the C instance each Grail instance carries | `foreign_proxy_oop`, `CPythonShim>>foreignExceptionTypeForPointer:…` |
| **exception instances**: the error indicator also holds the wheel's instance (`SetRaisedException`, `SetObject`, `Restore`; `Fetch`/`GetRaisedException` hand it back), `get_error_type` reports a pyclass by its nearest known ancestor, and `check_and_raise_error` notes the instance with the server so `___translateShimError:` raises the Grail exception built around it | `cpython.cc`, `shim_pyo3.cc`, `CPythonShim.gs` |
| `PyObject_Call` dropped keywords for a **Grail** callable called from C ("not yet wired") | `cpython.cc`, `CPythonShim>>PyObject_Call:args:kwargs:` |
| `PyType_FromSpec` stored `tp_name` (and `tp_doc`) **by pointer**; PyO3 frees its spec strings after the call, so every pyclass's name was garbage. Copied, as CPython does | `cpython.cc` |

**Next wall: W5, exactly as predicted.** `SchemaValidator({'type': 'str'}).validate_python('hi')`
segfaults with `si_addr = 0x475241494c575031` — the ASCII bytes `GRAILWP1`,
the magic word at offset 24 of every Grail wrapper — inside pydantic_core:
the wheel reads a Grail str by inline struct access and follows the magic as
a pointer. int survived because it goes through API functions. That is the
Phase 4 decision point.

Also seen: making `PyImport_Import` real (on `PyImport_ImportModule`) turned
the error path into a failure — the module-name str PyO3 passes reads back
as garbage through `PyUnicode_AsUTF8`, the same str-layout question. Left a
stub (NULL, no error), which the int path tolerates; revisit with Phase 4.

Validated (local, Darwin arm64): SUnit 7644/7644, all 8 shards, and the
concurrent-import test against a NetLDI. The first run lost shard 6 to a
segfault in `shimForeignGetAttr`: `ShimForeignObjectTestCase` builds proxies
around synthetic pointers (`16r1000`) to test the captured-name answers, and
asking C first dereferenced them. Both new user actions now refuse a pointer
`plausible_pyobj` rejects (as a miss / a TypeError) instead.

Not yet done for Phase 3: constructing a wheel exception FROM Grail
(`raise PydanticCustomError(...)` in a validator, which PyO3 must recognise
as its own), class-level forwarding on the Grail exception class
(`ValidationError.from_exception_data`), `repr`/`str` of non-exception
foreign objects, and SUnit tests that need no wheel (`_shimtestmodule.c`).

### Phase 4 — inline layout (W5, W6) — **decided 2026-10-01: (b) abi3; (a) deferred**
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

**Trial of (b), 2026-10-01 (branch `jmason/pydantic2`): the abi3 build
completes, runs, and fixes W5 outright.**

* **The complete set is 9, not 7.** After the 7 above, `cargo check` found two
  more: direct reads of `tp_base` (`serializers/ob_type.rs`) and `tp_new`
  (`validators/model.rs`, the W1 site), replaced by `PyType_GetSlot`. All nine
  are fixed by `scripts/pydantic/pydantic_core-2.46.5-abi3.patch` (7 files,
  +117/−7, every change `cfg`-gated so the tree still builds non-abi3):
  a `datetime_access` module that provides the three accessor traits by
  attribute reads; `PyFunction` by type name; `TzInfo` without
  `extends = PyTzInfo`, a parsed offset becoming `PyTzInfo::fixed_offset`
  (a `datetime.timezone` — same offset, different `repr`; this is also how
  W6 is resolved under (b)); the two slot reads.
* **Building it:** `scripts/pydantic/build_pydantic_core_abi3.sh <venv>` —
  sdist, patch, `cargo rustc` (~1 minute), install as `_pydantic_core.abi3.so`.
  `PYO3_BUILD_EXTENSION_MODULE=1` is required: without it PyO3 links
  Homebrew's libpython, whose symbols would compete with the shim's.
* **Shim floor for the abi3 build:** 161 needed; 5 missing, all now real in
  `shim_pyo3.cc` — `_Py_IncRef`/`_Py_DecRef`, `Py_GetConstantBorrowed`,
  `PyLong_AsUnsignedLongLongMask`, `PyObject_GetTypeData`. abi3 PyO3 declares
  every pyclass with a **negative `basicsize`** ("the base plus this much"),
  which `type_from_spec_impl` now resolves. `PyImport_Import` had to become
  real (on `PyImport_ImportModule`) — abi3 PyO3 reaches it for
  `py.import("decimal")` while building serializer tables.

| schema | stock wheel | abi3 build | CPython |
| --- | --- | --- | --- |
| int `'1'` / `'x'` | `1` / `ValidationError` | same | same |
| **str** `'hi'` | **segfault** | `'hi'` | `'hi'` |
| bool `'yes'` | — | `True` | `True` |
| list[int] `['1', 2]` | — | `[1, 2]` | `[1, 2]` |
| **float** `1.5` / `'2.25'` | (inline `ob_fval` read) | `1.5` / `2.25` | same |
| dict[str,int] `{'a': '3'}` | — | `{'a': 3}` | `{'a': 3}` |

Remaining difference seen: the key ORDER of each dict in `e.errors()`
(`msg, type, loc, …` vs CPython's `type, loc, msg, …`), which points at a dict
built from C not preserving insertion order — not yet investigated.

**And it carried pydantic itself to `BaseModel`'s schema build**, through four
Python-side walls, all general Grail bugs, fixed:

| wall | fix |
| --- | --- |
| `from pydantic import BaseModel` → stdlib `warnings` instead of `pydantic.warnings` | Grail's `importlib.import_module` stripped the dots of a relative name and ignored `package`; it now resolves it as CPython's `_resolve_name` does |
| `Decorator[X]`: "parameters must all be type variables" — a class whose `__eq__` was *assigned* (every dataclass) compared equal to other classes | `object>>___dynamicInstanceDunder___:` — the setattr-`__eq__`/`__ne__`/`__hash__` probes skip a CLASS receiver (`C == x` is `type(C).__eq__`), and `___reflectedFirst___` no longer applies the instance subclass-priority rule to two classes (Smalltalk's metaclass hierarchy said `D class inheritsFrom: Generic class`) |
| `ModelMetaclass` took `BaseModel` for a subclass of itself | a metaclass was called with `bases == (object,)` for `class A(metaclass=M)`; CPython passes `()`. The written-empty case is recorded by `___grailPrepareNamespace___:bases:keywords:` and answered by `___grailHeaderBases___` (non-empty headers keep `__bases__`, the `__mro_entries__`-resolved tuple — `class C(TypedDict)` needs that) |
| serializer setup: `py.import("decimal")` → SystemError | `PyImport_Import` real (above) |

The three Grail fixes are guarded by
`tests/python/class_identity_and_relative_import.py` (13 checks, agrees with
CPython 3.14) and `ClassIdentityAndRelativeImportTestCase` (default path,
forced IR). Validated locally: SUnit 7644/7644 (all 8 shards, concurrent-import
passing); CPython gate 1 regression, `test_pickle` OK → TIMEOUT, which is load
at the 600 s limit — alone it is OK in 528 s, against 518 s before this change.

**Where it stops: W1.** Building the serializer's type table, abi3 PyO3 takes
`datetime.datetime` with `py.import(...).getattr(...)` and checks it with
`PyType_Check` — and a Grail class reaches C as a wrapper whose type is
`object`. That is Phase 5 exactly as planned (type-object mirrors for Grail
classes), now on the path of `class M(BaseModel)`.

**Decision (2026-10-01, user): proceed with (b), the abi3 build; keep (a) on
file to revisit.** (b) is established and cheap — the patch is small,
mechanical and `cfg`-gated, the build is a minute, and it removes W5 (and the
float misread) without touching Grail's object model. What it gives up is the
`pip install pydantic` story: the stock PyPI wheel still does not work, and a
Grail deployment of pydantic means building `pydantic_core` with
`scripts/pydantic/build_pydantic_core_abi3.sh` and carrying the patch forward
with each pydantic_core release.

**Option (a), deferred — what revisiting it means.** Give Grail's immutable
values a real CPython memory layout so a STOCK wheel's inlined struct reads
are right: `float` (`ob_fval` at offset 16), `bytes` (`ob_sval` at 32), `str`
(the compact-ASCII / UCS-1/2/4 body and its `state` bits), and later `datetime`
(the `PyDateTime_*` data bytes and a real datetime C-API capsule).

* *Why it matters beyond pydantic:* every prebuilt wheel compiled against the
  full (non-limited) API inlines these reads; NumPy already lives with them.
  (a) is the route by which `pip install <wheel>` works unmodified, for any
  wheel, without a per-package source build and patch.
* *The design on file:* the "prefix OOP" header of
  [Shim_Object_Model.md](Shim_Object_Model.md) §2 — the GemStone OOP moves
  out of offset 16 (where a float's value, a str's length and a tuple's size
  live) into a header BEFORE the object, so the bytes from the `PyObject*`
  onward are CPython's own layout. §4 of that doc named this very trigger: an
  extension forcing inline access to the immutable scalars.
* *A cheaper intermediate noted during Phase 3:* since these values are
  immutable, a real-layout COPY is semantically safe — the shim already hands
  C real-layout copies of tuples and lists (`to_real_tuple`, `ShimTupleObject`).
  The catch is coverage: every path by which a str/float/bytes reaches C
  (arguments, dict items, attribute values, return values of callbacks) would
  have to produce the copy, not only direct call arguments.
* *Prototype order:* `float` first (one 8-byte field, and the stock wheel's
  silent misread makes a perfect guard test:
  `SchemaValidator({'type': 'float'}).validate_python(1.5) == 1.5`), then
  `bytes`, then `str`, whose writable form (`PyUnicode_New` +
  `PyUnicode_DATA`, used by jiter) also needs the buffer to be real.
* *What to measure when revisiting:* the stock-wheel probe set in the table
  above (str/float/bytes rows), NumPy's existing suite (it shares the layout
  questions), and the per-crossing cost — (a) moves work from every shim call
  into object creation.

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

**Result (2026-10-01, branch `jmason/pydantic3`, on the abi3 build): exit
met.** The assertion above passes, and a broader probe — nested models (dump,
JSON, and a nested error's location `('inner', 'a')`), `Field(ge=0)`
constraints, a missing field, `model_validate_json`, `model_copy(update=)`,
model `==` and `model_json_schema()` — prints exactly what CPython prints,
line for line. So does a Python `after_validator` that raises `ValueError`:
one `value_error` line error, `'Value error, must be non-negative'`.

Walls, in the order they fell (C = shim, S = Grail Smalltalk, P = Grail's
Python semantics):

| # | wall | fix |
| --- | --- | --- |
| 1 | C `PyType_Check(datetime.datetime)` false — a Grail class crossed as a 32-byte wrapper typed `object` (W1) | **type mirrors**: a class crosses as a full-size `PyTypeObject` built Smalltalk-side (`CPythonShim>>typeObjectFor:`) — real `tp_name` / `tp_flags` (subclass bits from the MRO) / `tp_basicsize` / `tp_base` chain, the class OOP in `tp_weaklist` and a magic in `tp_cache`, recognised by `is_type_mirror` in `pyobj_oop` / `is_foreign`; geometry from the `shimTypeMirrorLayout` user action. A **builtin** class crosses as the shim's own static type (`PyLong_Type`, `PyExc_ValueError`, …) and comes back as itself (`classForStaticTypeNamed:`). Instances of Python classes carry their class's mirror as `ob_type` |
| 2 | `PyObject_IsInstance` / `IsSubclass` were stubs answering 0 | real: the `tp_base` chain between C types, else the server's builtins |
| 3 | every model came out empty: `PyObject_GenericSetAttr` (pydantic_core's `force_setattr` of `__dict__`) was a stub | C `PyObject_GenericSetAttr` / `GenericGetDict` run `object`'s own `__setattr__:_:` / `__delattr__:` **non-virtually**; and **P** `obj.__dict__ = d` replaces the instance's attributes (it stored an attribute *named* `__dict__`) |
| 4 | `strict=None` refused as "not a bool" — a Grail `None` reached C as a wrapper, not `Py_None` | **None / True / False cross as the shim's static singletons** (`_Py_NoneStruct` …); `shimInit` keeps the OOPs it first read when re-initialised with the statics |
| 5 | `model_dump()` → `'object' object is not an instance of 'dict'` | the instance-dict view (`PyInstanceDict`) is typed `dict` in `typeAddrFor:` |
| 6 | `import pydantic_core` from Rust (its MISSING sentinel) **re-ran** `pydantic_core/__init__` mid-validation → recursion | `CPythonShim>>PyImport_ImportModule:` answers an already-imported module from `sys.modules` first |
| 7 | `model_dump()` → `{}` — `PyBackedStr` field names dangled: the shim's UTF-8 buffers lived in a per-call cache | `PyUnicode_AsUTF8[AndSize]` answer a buffer owned by the **string's wrapper** (`PyUnicode_UTF8Buffer:`), dropped by `sweep` with the wrapper; also `PyDict_New` makes a Python `dict` (insertion-ordered — `e.errors()` rows were in hash order) and `PyDict_Next` iterates in insertion order |
| 8 | **P** `@overload` stubs in a class body beat the implementation (`NotImplementedError` from `_overload_dummy`) | `isOverloadStub` recognises a BARE `@overload` (the parser's Symbol form); a decorated def's result is not stored when a later statement rebinds the name (`___isRebindLaterInBody___:`) |
| 9 | a Python validator's `ValueError` escaped past pydantic_core (`UncontinuableError`), and a matching outer `except` re-ran forever | **guarded callbacks**: 16 server methods that run Python code for C (`PyObject_Call*`, `GetAttr`/`SetAttr`, `GetItem`/`SetItem`, `RichCompare*`, `Str`/`Repr`, `GetIter`/`Iter_Next`, `IsInstance`/`IsSubclass`, `GenericSetAttr`, `Length`) catch a Python exception INSIDE the callback (`___guardCallback:`), record it and set a C flag through a `CByteArray` view; `check_gci_error()` takes it as C's pending error (a wheel's own exception as its C instance); if C hands it back unhandled, the ORIGINAL exception object is re-raised. `str()` / `repr()` of the shim's raised-exception token answer its message |
| 10 | nested error location `('a',)` not `('inner', 'a')` — every model looked like it had a custom `__init__` | **P** `f.attr = value` on a sibling def in a class body was dropped; BaseModel marks its `__init__` that way (`___methodAttributeAssigns___`) |
| 11 | `base type without tp_new` once models were built by pydantic_core itself | a mirror's `tp_new` is a C trampoline into `cls.__new__(cls)` (`PyType_GenericNew:`, guarded) |
| 12 | **P** `model_copy()` → store on nil — `obj.__dict__.copy()` / `copy.copy(obj.__dict__)` did not exist | `PyInstanceDict >> copy` / `__copy__` answer a plain dict |

Validated (local, Darwin arm64): SUnit 7650/7650, all 8 shards, concurrent-
import passing; fixture gate 509/509; CPython gate 0 regressions (1
improvement, `test_ssl`, as in every local run). The first SUnit run caught
one regression of this phase's own making — wall 3's `__dict__` replacement
also applied to FUNCTIONS, whose `__dict__` has its own handling
(`FunctionAttrWriteTestCase`); it is now limited to instances of Python
classes.

The P-rows are general Grail bugs, guarded by
`tests/python/class_body_rebinding_and_instance_dict.py` (15 checks, agrees
with CPython 3.14) and `ClassBodyRebindingAndInstanceDictTestCase`.
`CPythonShimTestCase>>testNoneWrapperEmbedsSingletonOop` now pins the new
contract (None / True / False ARE the shim's statics).

Seen and not yet addressed:
* pydantic_core's `py.import("pydantic")` for the version in docs URLs
  (`.ok()`, tolerated) hits `RecursionError` when it first runs inside a
  validator callback — the URL then says `latest`.
* Grail emits `PydanticDeprecatedSince20` / `PydanticDeprecatedSince211`
  warnings CPython does not, while building `BaseModel` (Grail's eager
  attribute introspection touching deprecated members).
* `PyBytes_AsString` still answers from the per-call cache — the same
  lifetime bug as wall 7, for `PyBackedBytes`.
* a Python class's mirror always has metatype `type`, even under a custom
  metaclass (`ModelMetaclass`); nothing has needed better yet.

### Phase 6 — end to end, and measure
`import pydantic` clean; a slice of pydantic's own test suite; wall-clock per
validation vs CPython (W7); W8 audit. Update `Package_Census.md` rows 21 and 26,
and `Support_FastAPI.md` §4/§6.

**Phase 6 so far (2026-10-02, branch `jmason/pydantic4`).**

*W7 — speed, measured.* Same loops, same machine (Darwin arm64),
`scratchpad bench.py`; Grail figures are the mean of three runs (±10%):

| operation | Grail, start of Phase 6 | Grail, end of Phase 6 | CPython 3.14 stock | CPython 3.14 abi3 |
| --- | ---: | ---: | ---: | ---: |
| `SchemaValidator(int).validate_python('1')` | 8.0 µs | 5.7 µs | 0.1 µs | 0.1 µs |
| typed_dict validate | 25.3 µs | 23.9 µs | 0.2 µs | 0.2 µs |
| `M(x='1', y='s')` | 192 µs | 176 µs | 1.1 µs | 1.2 µs |
| `m.model_dump()` | 523 µs | 374 µs | 0.8 µs | 0.9 µs |
| `m.model_dump_json()` | 612 µs | 427 µs | 0.8 µs | 0.9 µs |
| `M.model_validate_json(...)` | 525 µs | 455 µs | 0.9 µs | 1.0 µs |

(The model rows were re-measured after the slice's fixes, three runs within
1% of each other; the two `SchemaValidator` rows are from mid-phase.)

* **The abi3 build costs nothing on CPython** — option (b) is free.
* Grail is two to three orders of magnitude slower, and the cost is the
  crossings: `GRAIL_SHIM_PROFILE=1` now prints a per-selector count of every
  `GciPerform` at exit. A `model_dump` made 219; 120 of them were `at:` sends
  reading a result Array, now `GciFetchOop` reads (99 left). Time follows the
  Smalltalk side, not the count: `ProfMonitorTree` put **`PyDict_Next` at 44%**
  — it rebuilt the dict's key list on every call, O(n²) per walk; it now walks
  a per-dict snapshot fetched once (`PyDict_ItemsFlat:`), −31% on
  `model_dump`. `__dict__` replacement now writes through the instance-dict
  view's raw store instead of the full attribute protocol (−13% on
  construction). What remains is spread across ~240 methods — wrap: map
  lookups, dict hashing, per-call wrapping — with no single hotspot left.

*W8 — process-lifetime state, audited.* A logout and re-login in ONE gem
process (topaz allows it) used to **segfault** on the next import of
pydantic: the C side survived the logout (the dlopen'd library, `module_cache`,
`module_attrs`, PyO3's Rust statics — interned strings, type pointers) while
the Grail objects they point at did not. `GciUserActionInit`/`Shutdown` do
not run across such a re-login, so the boundary is detected in `shimInit`
from a token `CPythonShim class>>ensureLoaded:` makes once per session; on a
new session the shim drops its session-scoped state, and a DYNAMICALLY
LOADED extension first initialised in an earlier session is refused with
`ImportError: extension module '…' was initialised in an earlier session of
this gem process and cannot be initialised again; import it in a new gem
process` — CPython does not re-initialise an extension in one process
either. The shim's own built-in modules (`_sre`) re-initialise and keep
working (checked: `re.sub` / `re.findall` in both sessions).

*pydantic's own tests — the slice.* Real pytest does not import in Grail
(it needs `importlib.machinery`'s `PathFinder` for assertion rewriting), so
`tests/pydantic/` carries a stand-in: `minipytest/pytest.py` (raises, warns,
marks, `param`, fixtures, `approx`, `monkeypatch`) and
`run_pydantic_tests.py`, which collects a module's tests, expands
parametrize, resolves fixtures and prints one `RESULT|id|outcome|msg` line per
test. **The runner is run under CPython too**, against the same sdist
(pydantic 2.13.5), and the CPython tallies match real pytest's (`test_main`:
244 passed, 25 skipped, 1 xfailed). `compare_results.py` diffs the two
test by test and clusters the divergences. `run_pydantic_slice.sh` restarts
past a test that kills the gem, recording it as `crashed`.

```bash
PYTHONPATH=<abi3 venv>/lib/python3.14/site-packages GRAIL_IR_CODEGEN=0 \
  tests/pydantic/run_pydantic_slice.sh <sdist>/tests/test_main.py out.grail
<abi3 venv>/bin/python tests/pydantic/run_pydantic_tests.py <sdist>/tests/test_main.py > out.cpy
python3 tests/pydantic/compare_results.py out.grail out.cpy
```

*The slice, measured 2026-10-02* (Darwin arm64, `GRAIL_IR_CODEGEN=0`, the
abi3 build; "crashed" is a test that killed the gem, recorded and stepped
past):

| module | tests | CPython passes | of those, Grail passes | same outcome as CPython | crashed the gem |
| --- | ---: | ---: | ---: | ---: | ---: |
| `test_main` | 266 | 240 | 215 | 241 | 0 |
| `test_fields` | 68 | 68 | 62 | 62 | 0 |
| `test_validators` | 179 | 174 | 92 | 96 | 3 |
| `test_serialize` | 89 | 88 | 45 | 46 | 1 |
| `test_json` | 60 | 58 | 50 | 52 | 0 |
| `test_aliases` | 153 | 121 | 115 | 147 | 0 |
| `test_computed_fields` | 37 | 33 | 23 | 27 | 0 |
| `test_root_model` | 78 | 78 | 70 | 70 | 0 |
| `test_private_attributes` | 35 | 35 | 19 | 19 | 2 |
| `test_construction` | 42 | 42 | 25 | 25 | 10 |
| `test_edge_cases` | 193 | 192 | 147 | 148 | 2 |
| `test_create_model` | 28 | 28 | 25 | 25 | 0 |
| **12 modules** | **1228** | **1157** | **888 (76%)** | **958 (78%)** | **18** |

At the start of the phase none of this ran: `tests/test_main.py` did not
import. `test_types` (956 tests) still does not — the TEST MODULE itself binds
more than the 255 names a Grail module can hold, GemStone's dynamic-instVar
ceiling ([GemStone_Feature_Requests.md](GemStone_Feature_Requests.md) §2.1),
which is structural and not this phase's to lift.

*The walls the slice found*, each a general Grail or shim bug rather than a
pydantic quirk, in the order they were met:

| wall | symptom in pydantic | fix |
| --- | --- | --- |
| a metaclass's class-body namespace held a classmethod's **bound** value and a property's **getter** | `tests/test_main.py` did not import: pydantic.v1's metaclass took both for fields | `___grailNsBind___:` offers the descriptor; `___grailOwnPropertyNames___` compiles before the body |
| `from m import *` **ignored `__all__`** | `pydantic.v1` passed the 255 attributes a module can hold — uncatchable | `module>>___mergePublicAttrsFrom:` |
| `warnings.warn(msg, Cat)` skipped `Cat.__init__` | every deprecation printed `a … occurred (error 2702)` | `warnings` calls the category |
| a type mirror's base chain read a **Smalltalk metaclass**, and its `on: Error` missed Python exceptions | Rust panic: `type object 'PythonInstance class' has no attribute '__module__'` | mirror base is `type`; `on: AbstractException` |
| an inherited classmethod's `__func__` differed per class | `PydanticDeprecatedSince211` on every schema build | `__func__` resolves on the defining class |
| `copy.deepcopy(obj.__dict__)` stored into nil | `model_copy(deep=True)` killed the gem | `PyInstanceDict>>__deepcopy__:` |
| a metaclass property ran when the body bound a same-named def | `PydanticDeprecatedSince20` on every `import pydantic` | properties are built, not loaded |
| `PyObject_VectorcallMethod` was a stub | `SystemError` from every `model_post_init` | implemented |
| `__annotations__` cleared **in place** by a metaclass did not reach the class | `extra='allow'` refused every model | replay compares contents |
| a protocol dunder under a class-body **`if`** was ignored (`__setattr__`, `__delattr__`, `__len__`, `__getitem__`, `__iter__`, `__call__`, `__hash__`, `__bool__`, …) | frozen models accepted assignment; `validate_assignment` and `extra='forbid'` did nothing | forwarders compiled at class build |
| `ValidationError`'s class methods were not on its Grail class; a foreign object's `str()` was the proxy's | `from_exception_data` AttributeError; messages read `<ShimForeignObject …>` | `METH_CLASS`/`STATIC` names passed at build; `shimForeignStr` |
| non-`PythonInstance` objects (a `datetime.date`) crossed typed as `object` | dates refused as `input_type=object` | `___nativeTypeAddrFor:` |
| `PySet_Type` / `PyFrozenSet_Type` were never initialised | `model_dump(exclude_unset=True)` failed | real static types |
| `PyDict_Copy` of an instance `__dict__` was a second **view**; `PyDict_DelItem` sent it `removeKey:` | `validate_assignment` recursed to stack overflow | plain-dict copy; `__delitem__:` |
| the shim's rich compare sent the bare dunder, and `NotImplemented` read as true | `exclude_defaults` dropped a `str` field defaulting to `None` | the `___cmpXx___:` operator helpers |
| `uuid` was a 71-line stub; `colorsys` was missing | UUID fields and `default_factory=uuid4` | both vendored from CPython 3.14.7 |
| every **lambda's** signature was `()`; a `classmethod.__get__` binding kept `cls` | `default_factory=lambda data: …` and classmethod validators called with the wrong arguments | lambdas stamp `___pySig___:`; `MethodBinding>>__signature_spec__` |
| `PyLong_AsLong` of a `str` answered 0 with no error | `Literal['a', StrEnum.X]` built as `Literal[0]` | TypeError, and no `__index__` probe for a string |
| `super().__new__(mcls, name, bases, ns, **kw)` refused | `class M(Base, a=1)` could not be written | `type>>___new__:kw:` |
| a str/int-mixed enum had no `_missing_` | every `StrEnum`-style field failed schema build | copied with the enum protocol |
| an infinite float literal (`1e400`, `2.2250738585072011e308`) compiled to `PlusInfinity` | `tests/test_validators.py` did not compile | emitted as an overflow |
| a decorator's result reached a metaclass's namespace only after it ran | `@computed_field` found nothing | `___grailNsRebind___:` after the decorator store |
| a module-level `@overload` stub's arity method survived its implementation | `computed_field(f)` answered `None` | stubs followed by an implementation compile no method |
| Grail's `dataclasses` stub counted a string `ClassVar` as a field | `ComputedFieldInfo(...)`: missing argument `repr` | skipped |
| the `PyNumber_*` operators were stubs answering NULL with no error | `dump_json(uuid)` killed the gem | implemented over `operator` |
| unsigned 64-bit conversions rode the signed SmallInteger path | a UUID's 128-bit int, which abi3 PyO3 reads as two halves, failed | exact, via 32-bit halves |
| `functools.cache`'s wrapper class had no `__module__` | a model with an `@cache` method failed to build | `'functools'`, as CPython's |

*Left, and why it is left.* Class keywords through a metaclass whose
`__new__` takes `**kwargs` do not reach `__init_subclass__` — Grail runs the
hook outside the metaclass dispatch and cannot see what the `__new__`
forwards. Grail's `importlib` has no `module_from_spec` / `exec_module` (the
runner's `create_module` falls back to importing by name). A `warnings.warn`
at MODULE scope reports line 0 (`sys._getframe().f_lineno` is 0 for a
module's own frame). Importing `pydantic_core` WITHOUT `pydantic` first makes
its error formatting import `pydantic` from inside a C callback, which runs
out of stack (harmless — it answers None). The stock wheel still dies on its
first inline layout read (W5/W6, option (a)).

### Tests and CI
* `tests/python/pydantic_phase6_walls.py` (+ `PydanticPhase6WallsTestCase`,
  both codegen arms): the Python-level walls above, 41 checks measured
  against CPython 3.14.
* `CPythonShimTestCase` *Pydantic Phase 6* tests, through new `_shimtest`
  functions that make each call the way a PyO3 wheel does: vectorcall-method,
  the set types, `PyLong_AsLong` of a str, `PyDict_Copy`/`DelItem` of an
  instance dict, a native type's subtype check, str-vs-None rich compare, and
  two `PyDict_Next` walks in lockstep.
* `tests/scripts/run_shim_relogin_test.sh` (in `run_tests.sh`): W8 — a
  dlopen'd extension across logout/login in one linked gem.
* None of these needs the wheel. The pydantic slice itself does (the abi3
  build and the sdist's tests), so it is run by hand, not in CI.
* Tier 2 (2026-10-02, Darwin arm64): `check_python_fixtures.sh` 518 fixtures
  agree; the CPython conformance gate reads **0 regressions, 1 improvement**
  (`test_ssl` FAIL/5 → FAIL/3). A regression its first run caught was this
  phase's and is fixed: copying Enum's default `_missing_` onto mixed enums
  had overwritten user overrides (`test_enum`). `test_pickle` times out at
  600 s in a full run on this machine now and then; alone it takes ~510–526 s
  with or without this phase (measured both), so that is the machine, not a
  regression.
* After merging `origin/main` (which had fixed the same namespace problems in
  parallel — `___grailNsRebind___:`, the builtin-property record, `type`'s
  class keywords; theirs are kept where they overlap): `run_tests.sh` 7,721
  run, 7,720 passed, the one failure an expectation this branch had changed
  and has now restored; gated against `origin/main`'s board, 0 regressions
  besides that `test_pickle` timeout (OK alone), 3 improvements
  (`test_exception_group` and `test_zipapp` ERROR → OK, `test_except_star`
  21 → 20).

### Phase 7 — future improvements (not scheduled)

Phase 6 ends the plan as written: pydantic works in Grail on the abi3 build,
its own tests run, and the walls they found are fixed. What follows is the
list of what would make that support better, recorded so the next piece of
work starts from measurements rather than from memory. None of it is
scheduled; each item stands on its own and they can be taken in any order.

**7.1 — the stock wheel: a real CPython layout for `str`, `float`, `bytes`.**
This is Phase 4's option (a), deferred when (b) was chosen. Today pydantic
validates only on a `pydantic_core` rebuilt against the stable ABI
(`scripts/pydantic/build_pydantic_core_abi3.sh`), which needs a Rust
toolchain. The wheel `pip install pydantic` fetches imports (Package_Census
row 26) but dies on its first validation, because PyO3's non-abi3 code reads
`ob_fval`, `ob_sval` and the compact-unicode body INLINE (W5/W6), and a Grail
wrapper has none of them. The work is giving those immutable values a real
CPython-shaped body behind the wrapper — the prefix-OOP header of
[Shim_Object_Model.md](Shim_Object_Model.md) §2 — prototyped on `float`
first, guarded by Phase 4's test
`SchemaValidator({'type': 'float'}).validate_python(1.5) == 1.5`. It is the
deepest item here, and the only one that helps every future wheel rather than
pydantic alone. Exit: the stock wheel passes the Phase 6 slice with the same
numbers as the abi3 build.

**7.2 — speed (W7).** A validation is still 200–500× slower than on CPython
(the W7 table above): constructing a model costs 176 µs against ~1 µs, a
`model_dump` 374 µs against ~0.8 µs. Phase 6 removed the hotspots a profile
could see — `PyDict_Next`'s O(n²) rebuild, `at:` sends for array reads, the
full attribute protocol for `__dict__` replacement — and what is left is
spread over ~240 methods, every one of them a crossing. So the next gains are
structural, not local:
* fewer crossings per call — `GRAIL_SHIM_PROFILE=1` counts them by selector;
  a `model_dump` still makes ~99;
* cheaper wrapping — the per-value `wrap:` map lookup and CByteArray, which
  every argument and result pays;
* C-side caches for the values pydantic_core asks for repeatedly (interned
  attribute names, type objects, a model's field dict).

Measure with the Phase 6 benchmark on both builds before and after each step.
Exit: a target agreed beforehand — an order of magnitude on `model_dump` would
be a reasonable first one.

**7.3 — the rest of pydantic's test suite.** The Phase 6 slice is 12 of
pydantic's ~70 test modules, and 269 of its 1,228 tests still differ from
CPython — mostly one-of-a-kind after the walls tabled above, so the work is a
long tail rather than a few big fixes. In order of reach:
* `test_types` (956 tests) cannot import: the TEST module binds more than the
  255 names a Grail module can hold, GemStone's dynamic-instVar ceiling
  ([GemStone_Feature_Requests.md](GemStone_Feature_Requests.md) §2.1). Either
  the kernel ask is met, or module globals get an overflow store like the one
  `GrailClassAttrHolder` gives class attributes.
* the modules not yet run — `test_json_schema`, `test_generics`,
  `test_dataclasses`, `test_discriminated_union`, `test_networks`, … — each
  baselined under CPython first with the runner, as Phase 6 did.
* the 18 tests that still kill the gem (RecursionError, one compile error on a
  nested PEP 695 `type` statement, one pydantic_core panic on a constrained
  `TypeVar` with `float`), before the ordinary failures — a crash costs a
  whole run's worth of context.
* the gaps recorded under Phase 6's *Left, and why it is left*: class keywords
  through a `**kwargs` metaclass `__new__` not reaching `__init_subclass__`;
  `importlib.util.module_from_spec` / `exec_module`; `warnings.warn` at module
  scope reporting line 0; `pydantic_core` importing `pydantic` from inside a C
  callback when it was imported first; and `from <native module> import *`
  binding accessor methods (see the note under *Resume here*).

Exit: the slice widened to every module that imports, with its numbers
tabled here, and no test that kills the gem.

**7.4 — distribution and CI.** Two things keep the Phase 6 result from being
durable:
* the abi3 `pydantic_core` exists only as a local build. Until 7.1 lands, a
  user needs it built for them — a prebuilt abi3 wheel for each platform Grail
  supports (Darwin arm64, Linux x86_64), produced by the build script in CI
  and published somewhere `pip` can reach, would make `pip install` work
  against Grail without a Rust toolchain.
* nothing in CI exercises pydantic. The Phase 6 SUnit tests need no wheel,
  but the slice does, so it runs by hand and a regression in it would be seen
  only by the next person to run it. With the wheel above available, a CI
  job — nightly, beside the CPython conformance run — could run the slice and
  gate it against a committed baseline the way `check_cpython_regressions.sh`
  gates the scoreboard, its baseline CI-measured for the same reason.

Exit: `pip install pydantic` plus the published wheel works in a fresh Grail
venv, and the nightly reports the slice.

## Resume here

1. `source .setenv`. The environment has moved more than once, so check it
   rather than trusting this line: on 2026-09-30 `.setenv` was a plain file
   pointing at a dev build (`../gemstone/fast/gs/product`, `gslist` reports
   4.0.0.a4), `gs40` was running from it with locks in `/opt/gemstone/locks`,
   there was no `./.topazini` (topaz logs in through `~/.topazini` as
   `DataCurator`), and `GRAIL_NETLDI` was unset, so `run_tests.sh` skips
   `concurrent-import`. On that build `./install.sh` succeeds **with IR on**,
   including the gemdb deploy — the `GsComMethNode>>envId` defect CLAUDE.md
   describes is absent.
2. Recreate the probe venv (the 2026-09-29 one was in a session scratchpad):
   ```bash
   python3.14 -m venv /tmp/pydantic_probe
   /tmp/pydantic_probe/bin/pip install pydantic==2.13.5 pydantic_core==2.46.5 pyyaml
   SO=/tmp/pydantic_probe/lib/python3.14/site-packages/pydantic_core/_pydantic_core.cpython-314-darwin.so
   make -C src/c/shim && ./scripts/shim_symbol_floor.sh $SO --list
   ```
   For the abi3 variant (Phase 4 option (b)), copy that venv and rebuild the
   extension in it:
   ```bash
   cp -R /tmp/pydantic_probe /tmp/pydantic_abi3
   ./scripts/pydantic/build_pydantic_core_abi3.sh /tmp/pydantic_abi3
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
5. The pydantic sdist's tests: `pip download --no-binary :all: --no-deps
   pydantic==2.13.5`, unpack, and run the slice as Phase 6 shows (the abi3
   venv needs `pytest dirty-equals jsonschema` for the CPython side).
6. Next: the future improvements in **Phase 7** above — the stock wheel,
   speed, the rest of pydantic's test suite, distribution and CI.

Two defects found on the way, both in `module>>___mergePublicAttrsFrom:`.
`from X import *` **ignored `X.__all__`** — fixed in Phase 6, because
`pydantic.v1`'s star imports are not under `TYPE_CHECKING` and hit it. Still
open: `from <native module> import *` binds a native module's constant
*accessor methods* as functions (`from string import *` makes
`ascii_lowercase` a function; `string.ascii_lowercase` is right).

## What has not been established

* The rest of pydantic's suite: the slice is 12 of its ~70 test modules, and
  `test_types` (956 tests), `test_json_schema`, `test_generics`,
  `test_dataclasses` have not been run under Grail.
* Whether the slice's remaining divergences cluster further — after the walls
  above they are mostly one-of-a-kind.
* FastAPI itself: nothing in it has been run, only the pydantic half of
  Route A.
* The stock (non-abi3) wheel past import — that is option (a) of Phase 4.
