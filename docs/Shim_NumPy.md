# Running the real NumPy binary on the shim (extending path)

Branch: `shim`.  Goal: load the actual CPython NumPy wheel (the same
binary CPython uses) into Grail via the CPython shim — no libpython.

Test target: `numpy-2.4.6-cp314-cp314-macosx_14_0_arm64`'s
`_multiarray_umath.cpython-314-darwin.so` (3.7 MB), the module
`import numpy` loads first.  Driven in-gem via
`CPythonShim loadDynamicModule: '_multiarray_umath' fromPath: <so>`
(→ `shimDynLoad` → `dlopen` + `PyInit__multiarray_umath` + exec slots).

## Results so far (2026-06-13)

**The symbol floor is mechanical and done.** `_multiarray_umath`
references 317 Python C API symbols; the base shim already provided
153.  The remaining **164** (149 functions + 15 data objects) were
generated into `src/c/shim/shim_numpy.cc` (+ `shim_numpy_compat.c`):
~27 real (PyMem/PyObject_Malloc family, the no-op thread/GIL/trace
buckets, PyOS_* libc wrappers), the rest log-once diagnostic stubs,
plus 11 type-object structs, 2 exception sentinels, Ellipsis, and
`_Py_ascii_whitespace`.  Prototypes were extracted from the real 3.14
headers.  **0 of 317 remain unresolved; the shim links clean.**  This
was a few hours of mostly mechanical work, not "weeks."

**The binary loads and core init runs — no ABI crash.**
- `dlopen` succeeds; `PyInit__multiarray_umath` is found and runs.
- **No SIGSEGV** — the `PyObject`/`PyTypeObject` struct layouts in
  `cpython.h` match real 3.14, so NumPy's baked-in field offsets work.
- NumPy's multi-phase `Py_mod_exec` runs its **entire core type
  initialization** (`PyType_Ready` on `PyArray_Type`, all scalar/descr/
  ufunc types, the multiarray setup) hitting **zero missing-function
  stubs**.  The deep `PyType_Ready`-slot-inheritance wall that was
  feared did not materialize.

**Walls walked so far (each fixed, then re-probed):**
1. `PyModule_GetDict` returned NULL → implemented (lazily-created
   Grail dict per module, `cpython.cc`).
2. `PyCapsule_Import("datetime.datetime_CAPI")` (NumPy's
   `PyDateTime_IMPORT` for `datetime64`) → special-cased to return a
   minimal static `PyDateTime_CAPI` table (constructors stubbed; NumPy
   only stores the pointer at import and dereferences it during actual
   datetime64↔datetime conversion).
3. `PyImport_ImportModule("math")` → implemented, delegating to a new
   `CPythonShim>>PyImport_ImportModule:` server method.

## The reentrancy "wall" — investigated, and it is NOT what it looked like

NumPy imports `math` during init, then `PyObject_GetAttrString(math,
"floor")`, etc.  The first pass hit `RT_ERR_CANT_RETURN` (2079) and
`ERR_EXC_RETURN_DISALLOWED` (2758) here and it *looked* like a deep
problem ("wrapping a `SymbolDictionary` module instance fails").

A clean isolation experiment **disproved that.**  A dedicated
diagnostic user action, `shimWrapProbe(obj, depth)`, calls back into
Smalltalk to `wrap:` an object — the same single-level ST → userAction
→ callback pattern, no dlopen, no PyInit (see
`CPythonShim>>___wrapProbe___:`).  Results:

- **Every object kind wraps cleanly** (`err=0`): Float, SmallInteger,
  String, Symbol, Array, Object, Dictionary, IdentityKeyValueDictionary,
  bare `SymbolDictionary`, the `math` *class*, AND the `math`/`os`
  module *instances*.  So `SymbolDictionary` / module instances are
  **not** the problem.
- **C-stack depth is not the problem** either: recursing 5 000–20 000
  C frames before the callback is still `err=0`.
- Non-local `^` out of a block, exceptions caught internally, and even
  exceptions that escape the callback are all `err=0`.

So the user-action callback is far more permissive than the first pass
suggested.  The 2079/2758 failures were **specific latent shim bugs**
that the user-action context *amplifies* — turning what would be a
recoverable DNU / slow lazy-init into a fatal GemStone error:

1. **`typeAddrFor:`** used `^` inside an `ifAbsent:` block →
   `RT_ERR_CANT_RETURN`.  FIXED (local + normal returns).
2. **`PyImport_ImportModule:`** used `sys modules` — whose first call
   lazily runs `SymbolDictionary ___new___` + `initializeBuiltinModules`
   → `ERR_EXC_RETURN_DISALLOWED` (2758).  FIXED: resolve builtins from
   the `Python` dict via `___instance___` (verified clean at any depth).
3. **`PyObject_GetAttrString:`** did a *direct* env-1 send
   (`obj perform: #floor`), which **DNUs** for module-style attributes
   (the math module has `floor:` and `___pyAttrLoad___:`, not bare
   `floor`); that DNU surfaced as 2758.  FIXED: use the Python attribute
   protocol `___pyAttrLoad___:`, which returns the bound method.  This
   is also simply more correct, and the full suite stays green
   (2827/2827) with the change.

Red herring that cost real time: `check_gci_error` surfaces a *stale*
GCI error from an earlier step and misattributes it to the current
call.  Always clear error state before a `GciPerform` you intend to
check.

## Where it stands after the reentrancy fixes

NumPy now, in-gem: loads, runs core type init, **imports `math`, and
reads `math.floor` / `ceil` / `trunc` / `gcd`** — all clean.  The next
wall is a **different category**: NumPy then imports its own Python
submodule `numpy.exceptions`, which the builtin-only resolver can't
find.  Resolving that needs Grail's `importlib` pointed at the NumPy
package directory and able to load NumPy's `.py` files (including the
`_multiarray_umath` ↔ `numpy` circular-import dance that CPython handles
via the partially-initialized module in `sys.modules`).  That is a
package-integration problem, not a reentrancy problem.

## Interpretation (revised)

Path 1 was the right call and it largely **dissolved the wall**: this
is not a fundamental GemStone user-action limitation needing the core
server team.  It is a series of ordinary shim correctness bugs, each
individually fixable, that only the user-action context made fatal.
The callback model itself is sound; the server-side methods reachable
during a callback just need to (a) avoid `^`-out-of-block, (b) avoid
heavy lazy initialization, and (c) use the proper Python protocols
(`___pyAttrLoad___:`, `___instance___`) instead of direct sends that
DNU.  `shimWrapProbe` is kept as a permanent diagnostic for finding the
next such case.

The remaining large piece for "real NumPy on the shim" is now the
Python-package import integration (numpy's own submodules), plus the
reverse-proxy so Grail can *use* the returned arrays — not the
callback/reentrancy model.

## importlib integration (2026-06-13)

Goal: let `_multiarray_umath`'s C init resolve the NumPy Python
submodules it imports during init.

Done and working:
- **sys.path-like search mechanism** added to importlib:
  `extraSearchRoots` (SessionTemp-backed) + `addSearchRoot:`, and
  `___moduleNameToPath___` now searches those roots too.  Point Grail at
  NumPy with `importlib addSearchRoot: '<site-packages>'`.
- **On-demand submodule loading from the callback.**
  `CPythonShim>>PyImport_ImportModule:` now resolves a non-builtin name
  to a path and `loadModuleFromPath:`s it.  Crucially, this proved that
  **heavy module loading (parse + compile + execute) works inside the
  PyInit user-action callback** — `numpy.exceptions` (246 lines, the
  `AxisError`/`ComplexWarning` hierarchy) loads successfully mid-init.
  The C-side `import_cache` dedups by name so each loads once.
- NumPy's init now walks past `numpy.exceptions`.

The wall it exposed — and it is a **Grail language** wall, not importlib:
- The very next import is `numpy._globals`, which does
  `from ._utils import set_module` — a **relative import**.  Relative
  imports resolve against the parent package and pull in `numpy` itself.
- Loading `numpy/__init__.py` (949 lines) **fails to compile**:
  `undefined symbol e; undefined symbol w` — Grail's known module-scope
  name-binding gap (module-level `except … as e` / `with … as w` /
  comprehension targets produce a *compile* error instead of a runtime
  binding; see TODO.md "Module-level unbound names").  Hundreds of lines
  of NumPy init will surface more such gaps.

So the importlib *machinery* is now capable; the blocker has shifted to
**Grail compiling and running NumPy's own Python source** (module-scope
names first, then whatever `numpy/__init__.py` needs, then the
`_multiarray_umath`↔`numpy` circular-import dance via partial modules in
sys.modules).  That is core-language work, a separate and larger track.

Caution noted for next time: a too-greedy regex cleanup of the C
diagnostics deleted `PyObject_HasAttrString` and `PyObject_Repr` (caught
by a `dlopen` "symbol not found" and restored).  Diff the defined-symbol
set against `main` after any bulk edit of `cpython.cc`.

## 2026-06-13 (cont.): module-scope binding fixed; two shim import bugs; new frontier

Three things landed; NumPy's init now walks two submodules further.

1. **Module-scope `except … as e` / `with … as w` now compile and bind.**
   The "undefined symbol e/w" wall is gone.  Root cause was twofold: the
   parser never declared the `except` name (`parseTry` captured it but
   skipped `declareWrite:`), and both `with`-as and `except`-as codegen
   emitted a *bare* `name := …` that, at module scope, references a temp
   the module-body method doesn't have (module variables live in
   `dynamicInstVarAt:`).  Fix: `parseTry` now `declareWrite:`s the name;
   a shared `AbstractNode>>___emitModuleScopeStoreOf___:from:on:` (mirrors
   `ForAst>>emitForTargetStore:`) routes the binding through
   `self dynamicInstVarAt: #name put: …` when compiling a module body, and
   `WithAst` / `TryAst` call it.  `___functionDeclaresLocal___:` moved
   `NameAst → AbstractNode` so the emitter can do the enclosing-function
   check.  Regression: `ModuleScopeBindingsTestCase` (4 tests, module- and
   function-scope each).  Suite 2831/2831 + 127/127.

2. **`CPythonShim>>PyImport_ImportModule:` had two import-path bugs that
   only the callback exposed.**  (a) It sent `___moduleNameToPath___:`
   (an **env-1** classmethod) as a bare **env-0** send → DNU, which the C
   side reported as the misleading `No module named '…'`.  Must be
   `@env1:`.  (b) `___moduleNameToPath___:` itself did `^ pyPath` **out of
   a `do:` block** — fine normally, but `RT_ERR_CANT_RETURN` (2079) inside
   the PyInit callback (the same `^`-in-block class as the `typeAddrFor:`
   fix); rewritten to assign a local and return once.  NOTE the asymmetry:
   `loadModuleFromPath:name:` is an **env-0** classmethod, so it is sent
   **plainly** — an `@env1:` send to *it* DNUs.  (I over-corrected it to
   `@env1:` first and the callback reported the DNU as 2079; catching it
   revealed the real message.)  With both fixed, **`numpy.exceptions` now
   genuinely loads via the callback** (the prior "it loads" claim was
   optimistic — the env-0 DNU meant the resolver was never actually
   reached through the callback).

3. **Diagnostics (kept, permanent, fire only on failure):** the C shim now
   prints `SHIM-DIAG: Py_mod_exec slot failed; pending error: <type>: <msg>`
   when a `Py_mod_exec` slot returns -1, and
   `SHIM-DIAG: import '<name>' raised in server: [<errnum>] <msg>` when the
   import server-perform sets a GCI error.  These turn the opaque
   `Module exec failed` / `No module named` into the actual cause.

**New frontier — `numpy._globals`.**  Its body has
`@_set_module("numpy")` decorating `class _CopyMode(enum.Enum):` — a
**module-level decorated class**.  Grail drops module-level decorators
(see `project_decorator_codegen`: "decorator codegen is nested-only"), so
`_CopyMode` never binds as a module attribute and the import dies with
`AttributeError: module has no attribute '_CopyMode'`.  Next work:
(a) module-level decorator codegen (apply the decorator and bind the
result to the module variable), then (b) `enum.Enum` *subclassing* (only
`IntEnum`-ish reals exist today).

**Debugging lesson for the callback frontier.**  At the C boundary a
failed import surfaces as an opaque `2079`/`2702` with an *empty* message
— the underlying Grail exception's `messageText` is frequently nil.  To
see the real cause, wrap the load in `on: AbstractException do:`, write
`ex description` to a file, then `ex pass`.  Do **not** try to *re-signal*
a fresh error from inside the callback to carry the message out: signaling
a new exception in that reentrant context itself raises `2079` and loses
the text.

## 2026-06-13 (cont. 2): drive `import numpy`; the .so now loads in-package

The decisive change: **stop driving `_multiarray_umath` directly and
drive `import numpy` (numpy/__init__.py) instead.**  CPython's order is
that numpy/__init__.py runs first, registers `numpy` (partial) in
sys.modules at line 95's `from ._globals import _CopyMode`, and only
imports `_core` / `_multiarray_umath` later (line 122).  Driving the .so
first inverted that, so `_globals`'s relative `from ._utils import …`
pulled in numpy/__init__.py which read `_CopyMode` from the still-partial
`_globals` → the circular-import wall.  With `import numpy` as the entry
the order is correct and `_globals` completes before the .so loads.

A chain of language/import gaps then surfaced, each fixed and each
advancing numpy's init.  **The C extension's `PyInit__multiarray_umath`
now runs (~34 KB of core-init trace) under the package import.**  Fixes
(commit ca3fcc3):

1. **`isinstance(x, type)` / `issubclass(c, type)`.**  `type` referenced
   as a value is the builtins `type` callable (a BoundMethod), not a
   class; `___resolveClassRef___:` maps it to `Behavior` so both tests run
   as `isKindOf:` / `inheritsFrom:` (≈ "is x a class") instead of raising
   an uncatchable ArgumentTypeError.  numpy._utils.set_module needs this.
2. **`from PKG import missing` → `ModuleNotFoundError` (an ImportError).**
   A fromlist name that is neither an attribute nor a loadable submodule
   now raises in `___import__:kw:` instead of letting a downstream
   AttributeError escape — so numpy's `try: from . import
   _distributor_init_local except ImportError` hook is caught.  Guards
   exclude the `*` star marker and the `import X` self-binding
   (fromName == absoluteName); a final `__getattr__` probe avoids false
   misses.
3. **In-package `.so` loading.**  `___moduleNameToSoPath___` now also
   searches the package tree under each search root, globbing
   `<leaf>.*.so` (the `cpython-<ver>-<plat>.so` suffix), so
   `numpy._core._multiarray_umath` resolves to its in-package `.so`.  And
   `shimDynLoad` (cpython.cc) builds the init symbol from the module's
   **simple (leaf)** name — `PyInit__multiarray_umath`, not the dotted
   path.
4. **Single-element tuple unpack `arr, = f()`.**  The parser
   (`parseStarExpressions`) stopped at the `=` after a trailing comma and
   collapsed `x,` to a bare name; now it builds a 1-tuple target so the
   unpack binds `f()[0]`.  numpy.fromnumeric uses `arr, = conv.as_arrays`.
5. **`cls.__base__` / `cls.__bases__`** (Behavior + the
   `___pyAttrLoad___` class-dunder allowlist), used by
   numpy._core._exceptions' `cls.__name__ = cls.__base__.__name__`.

Module-level CLASS decorators and `enum.Enum` subclassing — the previous
frontier — turned out to **already work**; the real `_globals` blocker
was the entry order, not decorators.

Regression coverage for the language/import fixes:
`ImportTypeIntrospectionTestCase`.  Suite 2842/2842 + 127/127.

### Walls walked since (each a small fix, .so init runs further)

- **`os.PathLike`** (commit bff967b): numpy does
  `isinstance(filename, os.PathLike)`.  Added `os.PathLike` as a class
  whose class-side `__instancecheck__:` reports objects whose type defines
  `__fspath__` (str/bytes/int are not PathLike).
- **`sys.flags`** (commit 9714ad0): numpy's core reads
  `PySys_GetObject("flags")`, which was a C stub returning NULL, and
  `sys.flags` was `None`.  Implemented `PySys_GetObject` in cpython.cc to
  delegate to the Grail `sys` module via the server, and made `sys.flags`
  a real `sys_flags` object (mirrors `os.path`) whose attributes
  (`optimize`, `debug`, …) default to 0.

**contextvars — done (commit b74fd7c).**  numpy 2.x creates ContextVars
from C during `_multiarray_umath` init (ufunc extobj, printoptions).  The
shim stubbed `PyContextVar_New/_Get/_Set`; they now delegate to the
existing Grail `contextvars.ContextVar` (a Python stdlib port) so a
C-created var and any Python-created one are the same object.  Two gotchas:
a Grail Python class is **not** callable via `___pyCallValue___:kw:` — the
server instantiates through the class-call entry `value:value:`; and
numpy's extobj **default** is a C-built object whose offset-16 OOP isn't a
live Grail object (`OBJ_ERR_OOP_NOT_ALLOCATED` 2106, raised at the
GciPerform-arg level so the server method never runs), so `PyContextVar_New`
retries without the default — the var still loads, and `.get()` before a
`.set()` would `LookupError` (numpy sets extobj during use).  Test:
`ContextVarsTestCase`.

## The object-model track — prebuilt wheels inline CPython struct macros

The SIGSEGV after contextvars (`Signal 11`, fault `0x7654321f`) was lldb'd
to `_multiarray_umath`'s `npy_cpu_baseline_list + 48`:

```
PyList_New(4) -> x19 ; PyUnicode_FromString("NEON") -> x0
ldr x8, [x19, #0x18] ; x8 = list->ob_item   (PyListObject offset 0x18)
str x0, [x8]         ; ob_item[0] = x0       <- CRASH, x8 = 0x7654321f
```

**Root cause (architectural).**  numpy's `.so` was compiled against real
CPython headers, so it inlines `PyList_SET_ITEM` as
`((PyListObject*)op)->ob_item[i] = v` — direct struct access.  The shim
intercepts *function calls*, but cannot intercept struct-access macros
baked into a prebuilt wheel, and a Grail-backed 24-byte `CByteArray` has no
`ob_item` at offset 0x18.  numpy uses these macros pervasively
(`PyTuple_SET_ITEM`, `PyList_GET_ITEM`) and accesses its own structs
(`PyArrayObject->data/dimensions`).  Decision (with the user): build real
CPython memory layouts in the shim — the **object-model track**.  It has
two directions:

1. **Grail → numpy (build objects numpy struct-accesses).**  *Step 1 done
   (ad3c770):* `PyList_New` returns a real-layout `ShimListObject`
   (ABI-identical to `PyListObject`, real `ob_item` array), recorded in a
   registry; `is_real_layout()` detects them; `pyobj_oop()` bridges one to
   a Grail list at the C↔Grail boundary; the `PyList_*` functions handle
   both representations.  numpy now builds `__cpu_baseline__` without
   crashing.  *Still to do:* tuples (`PyTuple_SET_ITEM`), real-layout
   `tp_dealloc`, identity-stable bridging.
   Also implemented `PyObject_CallFunction` / `PyObject_CallMethod`
   (cf471e7) on Py_BuildValue + PyObject_Call — numpy's init uses them
   heavily.

2. **numpy → Grail (the reverse proxy) — DONE for `__name__` + round-trip
   (commits 9342da3, 5758851).**  After CPU/feature init, `_multiarray_umath`'s
   exec registers the legacy dtypes.  The original failure (pinned with a
   `GRAIL_SHIM_DIAG` C backtrace in `check_gci_error`):

   ```
   _multiarray_umath_exec -> set_typeinfo
     -> dtypemeta_wrap_legacy_descriptor
       -> PyObject_CallFunction(numpy.dtypes._add_dtype_helper, "OO", DType, alias)
         -> GS err #2702 (a Smalltalk Exception, empty message)
   ```

   `_add_dtype_helper(DType, alias)` does
   `setattr(dtypes, DType.__name__, DType)` + `__all__.append(...)`.
   `DType` is numpy's own real C type object — *not* Grail-backed — so
   `pyobj_oop(DType)` reads offset 16 of a numpy C struct (garbage), the
   parameter binds to a junk OOP, and accessing `DType.__name__` raises.
   The function's codegen is fine (an isolated `helper(GrailClass, alias)`
   with the same shape — param + function-local `from`-import + `__all__`
   — works); the wall is purely that a foreign C `PyObject*` can't cross
   into Grail.

   **Diagnosis note (2026-06-14):** this root cause was masked by two
   secondary symptoms, now resolved, so a fresh probe shows it cleanly:
   (a) numpy's `finally: os.unsetenv(...)` raised AttributeError (Grail
   lacked `os.unsetenv`) *while* err #2702 unwound across the C frame →
   `UncontinuableError` cascade; with a raised stack limit this drove an
   unbounded exception-handler recursion → temp-cache OOM (err #4067, 0
   successful scavenges).  Fixed by adding `os.unsetenv`.  (b) numpy init
   needs `GEM_MAX_SMALLTALK_STACK_DEPTH` well above the 1000 default (the
   import chain alone is ~55 frames); run probes with e.g.
   `-C GEM_MAX_SMALLTALK_STACK_DEPTH=80000`.

   **Implemented (`ShimForeignObject`).**  Foreign objects are detected by
   a self-identifying mark on Grail wrappers: `wrap:` now makes 32-byte
   wrappers and stamps a `GRAILWP1` sentinel at offset 24 (ob_type can't
   distinguish them — numpy readies its DType *type objects* under the
   shim's `PyType_Type`, same as a Grail-wrapped class).  `is_foreign(obj)`
   = no sentinel at offset 24.  `pyobj_oop()` bridges a foreign object to a
   session-scoped `ShimForeignObject` (via
   `CPythonShim>>foreignProxyForPointer:typeName:`, a SessionTemps
   pointer→proxy map) that holds the raw pointer + the C `tp_name`.  The
   proxy forwards `__name__`/`__qualname__`/`__module__` (the unqualified
   tail / module prefix of `tp_name`); other attributes raise
   `AttributeError` (richer forwarding back to C via `tp_getattro` is future
   work — it needs a real-layout `str` for the name argument).  `wrap:`
   round-trips a proxy straight back to its original `PyObject*` through a
   non-owning `CByteArray fromCPointer: (CPointer forAddress: cPtr)
   numBytes: 32`, so numpy gets its own DType pointer again.  Tests:
   `ShimForeignObjectTestCase` (5, no `.so` needed).

3. **numpy cast-table init — FIXED (commit b875b66).**  With the proxy in
   place, `_add_dtype_helper` succeeded and init reached
   `PyArray_InitializeCasts -> PyArrayMethod_FromSpec_int`, which rejected a
   DType: `"ArrayMethod provided object %R is not a DType."`.  A
   `GRAIL_SHIM_DIAG` trap identified the object as `numpy.dtypes.BoolDType`
   whose `ob_type` was the shim's `PyType_Type` instead of numpy's
   `PyArrayDTypeMeta_Type`.  Cause: the shim's `PyType_Ready` set
   `ob_type = &PyType_Type` *unconditionally*; numpy allocates a DType class
   as an instance of its own metaclass and then readies it, so the metatype
   was clobbered.  Fix: default the metatype only when NULL (CPython
   semantics).  Also made `PyErr_Format` honor `%R`/`%S` (shared
   `shim_format_into`), so numpy errors are now legible.

4. **StringDType init — FIXED (commits 4e784e4, 1b12cd8, a590d21, 881d931).**
   Building a default StringDType descriptor exercised the whole "forward
   calls back to C" half of the object model.  In order, each wall and fix:
   - `use_new_as_default -> PyObject_Call(StringDType, ())` raised GS #2702:
     the shim delegated *every* callable to the Grail server (proxy not
     callable).  Fix: `PyObject_Call` routes a foreign callable to
     `call_foreign()`, which invokes `ob_type->tp_call` or, for a type,
     emulates `type_call` (tp_new/tp_init) **in C**; args are converted to a
     real-layout tuple (`to_real_tuple`).  Implemented `PyType_IsSubtype`
     (was a stub returning 0).
   - `StringDType.tp_new` then hit a stubbed `PyArg_ParseTupleAndKeywords`.
     Fix: real parser — `parse_one_unit`/`skip_one_unit`/`vparse_kw` shared
     with `PyArg_ParseTuple`.
   - `arraydescr_new -> subtype->tp_alloc(...)` jumped to 0x0: `PyType_Ready`
     did no slot inheritance.  Fix: inherit tp_alloc/tp_new/tp_free/... from
     tp_base and default tp_alloc to `PyType_GenericAlloc`.
   - `PyUFunc_FromFuncAndData... -> _PyObject_GC_New -> PyType_GenericAlloc`
     jumped to 0x0: **cpython.h had no `extern "C"` wrapper**, so a C++ TU
     (shim_numpy.cc) mangled its call to the extern "C" definition; under
     `-undefined dynamic_lookup` the mangled ref bound to 0x0.  Fix: wrap the
     header in `extern "C"` — a broad latent-bug fix.

5. **ufunc info-tuple validation — FIXED (commit 77830a5).**  numpy validates
   its loop "info" with inlined `PyTuple_CheckExact` + `PyTuple_GET_SIZE`; a
   Grail-backed tuple's offset-16 OOP read as ob_size gave TypeError
   "Info must be a tuple…".  Fix: **real-layout tuples** (`ShimTupleObject`,
   inline ob_item) mirroring lists, bridged to/from Grail at the boundary.

6. **PyUFunc_AddLoop tuple layout — FIXED (commit c6c49bf).**  The crash
   (`PyUFunc_AddLoop+288: ldr x0,[x23,#8]`, `x23≈NULL`) was *not* a
   round-trip-identity problem (an early wrong guess).  Reading the crashing
   object's memory showed a clean real-layout tuple — but numpy's inlined
   `PyTuple_GET_ITEM` accessed `ob_item` at **offset 32**, while
   `ShimTupleObject` had it at 24.  CPython 3.14 added `Py_hash_t ob_hash`
   to `PyTupleObject` (tuple hash cache) between `ob_size` and `ob_item`.
   Added the field (init -1); ob_item now sits at offset 32.  numpy got
   `info[0]` right via the `PyTuple_GetItem` *function* (shim layout) but
   read elements via the inlined macro (real layout) — the two disagreed by
   one slot.  [Lists were unaffected: `PyListObject` has no `ob_hash`.]

7. **Stub run during ufunc-loop registration — FIXED (commit 198b88e).**
   Implemented `PyList_GetItemRef`, `PyDict_GetItemRef`/`StringRef` (3.13+
   strong-ref getters), `PyNumber_Long`, and `PyObject_Init` (each was a
   stub returning NULL/0).

8. **ufunc-loop dedup + `PyNumber_Float` — FIXED (commit, see git log).**
   `PyUFunc_AddLoop` dedups loops with `PyObject_RichCompareBool(infoA,
   infoB, Py_EQ)` over real-layout tuples of foreign DType/method singletons.
   The server path bridged each tuple to Grail (836 bridges; #2163 comparing
   foreign-proxy elements).  Fix: `PyObject_RichCompareBool` identity-
   shortcuts ==/!= and compares two real-layout tuples **structurally in C**
   (`real_tuple_eq`): recurse nested tuples, treat non-identical
   foreign/real-layout leaves as not-equal (DTypes/methods are singletons →
   identity == equality), defer only genuine Grail leaves to the server.
   Bridges dropped 836→26.  Also implemented `PyNumber_Float`.

9. **Foreign-scalar protocol forwarding — FIXED (commit d0cced9).**  numpy
   passed its own scalars (`numpy.int64`/`numpy.float64`) to the C-API
   conversions during ufunc-identity setup; the proxy had no `__index__`, so
   `PyLong_As*` raised GCI #2163.  Fix: route a foreign object through its own
   C slots — `foreign_number_oop` invokes `nb_index`/`nb_int`/`nb_float`
   (numpy's C builds the result via our `PyLong_From*`/`PyFloat_FromDouble`, a
   Grail value we then convert); `foreign_str` routes `PyObject_Str`/`Repr`
   through `tp_str`/`tp_repr`.  This is the reverse-proxy *protocol
   forwarding* the design doc called for.

10. **Float non-finite repr/str — FIXED (commit f0a5f27).**  Found while
    tracing the longdouble wall: `float.__repr__`/`__str__` rendered non-finite
    values via GemStone's `printString` → `"PlusInfinity"`/`"MinusInfinity"`/
    `"PlusQuietNaN"` instead of CPython's `"inf"`/`"-inf"`/`"nan"`.  Mapped them
    (NaN variants end in `"NaN"`; `Plus/MinusInfinity`).  A real CPython-compat
    bug, *independent* of the longdouble wall (verified: it does not clear it).

11. **FIXED 2026-10-13 (see "Stage 1 on numpy 2.5.4" below) — `LONGDOUBLE_setitem` empty-string parse (logaddexp
    identity).**  Init reaches numpy setting the longdouble identity of the
    **`logaddexp`** ufunc (`-inf`):

    ```
    InitOperators → … → get_initial_from_ufunc
      → LONGDOUBLE_setitem + 724:  PyErr_Format(ValueError,
            "invalid literal for long double: %s")   ← the %s string is EMPTY
    ```

    Pinned via lldb: the failing frame's `x25 = logaddexp_signatures`; the
    format is `"invalid literal for long double: %s"`; `op` reaches the
    `PyUnicode_Check` branch (so it's a **string**) and `PyUnicode_AsUTF8(op)`
    is empty.  `op` is **Grail-backed (not foreign)** — `PyUnicode_AsUTF8`/
    `PyObject_Str` on a *foreign* object never fire here.  Ruled out:
    `PyUnicode_FromStringAndSize` (correct), `PyOS_snprintf`/`PyOS_string_to_double`
    (real), and our float `__str__` (gives `"MinusInfinity"`, non-empty — and
    now `"-inf"`).  So numpy builds the identity string itself (its own
    longdouble formatting / a stored identity string) and it comes out `""`.
    The exact producer of the empty Grail string is still open.  Next:
    instrument `PyUnicode_FromStringAndSize` (the only string-builder numpy
    imports) to log `len==0` creations + C backtrace, OR break at the
    `logaddexp` `get_initial_from_ufunc` and watch how it materializes the
    identity string — likely a numpy longdouble→text path that yields nothing
    on our platform/longdouble handling.

## Stage 1 on numpy 2.5.4 (2026-10-13): module exec completes

Re-measured on `main` with numpy 2.5.4 (cp314, macOS arm64), four months after
the walls above.  `import numpy` then failed before any numpy code ran:
`dlopen` refused `_multiarray_umath` on a missing `PyDict_SetDefaultRef`.
`scripts/shim_symbol_floor.sh` put the floor for a plain `import numpy` at five
missing symbols across the two extensions it loads (`_multiarray_umath` and
`linalg._umath_linalg`): four functions and `PyExc_ModuleNotFoundError`.
`numpy.random`'s Cython modules miss 20 to 48 each, but they load lazily.

Every wall below was a shim defect.  None needed a change to numpy, and none was
the user-action limitation.  **`_multiarray_umath`'s module exec now runs to
completion**: past wall 11, through `InitOperators`, `initumath`,
`set_matmul_flags` and the static-reference reads at its end.

12. **Five missing symbols.**  `PyDict_SetDefaultRef` (3.13), `PyType_Modified`
    (a no-op: the shim keeps no type cache), `PyUnicode_FromFormatV`,
    `PyUnicode_FromObject`, and `PyExc_ModuleNotFoundError` (a subclass of
    `ImportError` in the shim's exception tables).
13. **An unguarded `PyContextVar_New` unloaded numpy mid-import.**
    `contextvars.ContextVar` takes `default` as a keyword now, so the server
    method's positional call was a `TypeError`.  The server method was not
    wrapped in `___guardCallback:`, so the exception searched Grail's handlers,
    and the import handlers below the user-action frame ran *on top of* it.
    Each one unloaded its module: `numpy`, `numpy._core` and
    `numpy._core.multiarray` left `sys.modules` mid-import.  numpy's next import
    from C then ran `numpy/_core/__init__.py` a second time, and that run is what
    printed numpy's "Importing the numpy C-extensions failed" message, with 80
    error-6011 lines from the refused unwinds.  The fix passes `default=` as a
    keyword and guards `PyContextVar_New`, `_Get` and `_Set`.  The C side now
    goes through `check_gci_error`, which leaves C a pending error; `_Get` and
    `_Set` used to return failure with none.  **Lesson: any server method C
    calls must be guarded.**  A Smalltalk error such as a DNU is not caught by
    `___guardCallback:` (it catches Python exceptions only), and it produced the
    same cascade during this work.
14. **Stubs that fail with no error set.**  `PyComplex_AsCComplex`,
    `RealAsDouble`, `ImagAsDouble`, `FromDoubles`, `FromCComplex` and
    `PyUnicode_AsUTF8String` were log-once stubs answering 0 or NULL.  numpy's
    exec then failed with "pending error: (none)".  All are real now.
15. **A real-layout tuple came back as a wrapper.**  numpy keeps each ufunc's
    loops in a dict of `(DTypes, ArrayMethod)` info tuples, reads one back with
    `PyDict_GetItemRef`, then reads it with the inlined `PyTuple_GET_ITEM`.  The
    shim had bridged the stored tuple to a Grail tuple, and handed back a
    32-byte wrapper, so offset 0x28 read NULL (`get_info_no_cast`).  This is the
    "identity-stable bridging" listed above as still to do, done for tuples:
    `real_obj_to_oop` records the original pointer
    (`CPythonShim>>___noteRealTuple:origin:`), and `wrap:` returns it when the
    Grail copy crosses back.  Tuples are immutable, and the shim never frees a
    real-layout object, so the original is always valid.
16. **Wall 11's actual cause: `PyBytes_AsString` accepted anything.**
    `string_to_long_double` tries `PyBytes_AsString` on a non-string first and
    falls back to the number when it gets NULL.  Given the float `-inf` identity
    of `logaddexp`, the shim answered `""`, and `strtold` parsed nothing.  It now
    raises CPython's `TypeError` for anything that is not bytes.  The shim's own
    bytes-like paths (`PyByteArray_AsString`, the `PyArg` `y#`/`s#` parsers) keep
    the unchecked read, through a helper.
17. **`PyCallable_Check` asked the Grail proxy about a ufunc.**  For a foreign
    object it now answers from `tp_call` along the base chain; a foreign type
    is always callable.  `_PyArray_SetNumericOps` returned -1 with no error.
18. **`Py_BuildValue("{s, [(i), (i, i), (i)]}")`.**  CPython skips separators
    before any unit; the shim's dict case stepped over a single `:`.
19. **A shim module's attribute read ignored its `__dict__`.**  numpy stores
    every ufunc with `PyDict_SetItemString(PyModule_GetDict(m), ...)` and then
    reads `imag` back off the module.  The same gap existed on the Grail side:
    `shimModuleAttrs` exported only the `PyModule_AddObject` table, so
    `from numpy._core._multiarray_umath import _ArrayFunctionDispatcher` found
    nothing.  Both now include the dict.
20. **Capsules carried a private type.**  A wheel inlines `PyCapsule_CheckExact`
    as `ob_type == &PyCapsule_Type`.  The shim's capsules now carry the exported
    symbol, and numpy no longer refuses its own promoter.
21. **An instance method read off a wheel's TYPE answered nothing.**
    `PyDescr_NewMethod` / `PyDescr_NewGetSet` (in `shim_pyo3.cc`) build
    `method_descriptor` / `getset_descriptor` objects.  They are cached in the
    defining type's `tp_dict`, as CPython's `PyType_Ready` caches them, so every
    read returns the same object; numpy compares
    `ndarray.__array_finalize__` by identity.
22. **#1433 cause 2: `shimCall` split a dotted module name.**  Every positional
    call into `numpy._core._multiarray_umath` looked up module `numpy`.  The
    combined `"module.method"` form passes an argument (a SmallInteger) in the
    method slot, and the plain form passes the method name (a String), so the
    kind of that slot now decides.

### The frontier then

The extension loads and the Python side of `import numpy` runs.  The next wall
was in `numpy/_core/overrides.py`: `add_docstring` refused the object Grail
handed it.  That looked like a Grail-side gap (a `BoundMethod` that cannot take
`__doc__`), but it was the shim again: see stage 2.

### Finding a silent failure

Wall 13 onwards were found this way, and it beats guessing:

* `GRAIL_SHIM_DIAG=1` logs every foreign crossing, the exec slot's pending
  error, a C backtrace for each failed GemStone perform, and, new here, each
  callback that raised (`take_callback_error`).
* When the exec slot fails with **no** pending error, some call returned
  failure without setting one.  Run the gem under lldb **following the fork**
  (`settings set target.process.follow-fork-mode child`; without it no
  breakpoint in a dlopen'ed library ever resolves) with stdin from `/dev/null`
  (`process launch -i /dev/null`, or topaz stops on SIGTTIN).  Pass every
  signal through.
* Do not `thread step-out` from a breakpoint command in batch mode: the first
  stop ends the session.  Instead, disassemble the failing function
  (`otool -tV`), set an auto-continuing breakpoint on the instruction after
  each `bl` (`breakpoint set -s <so> -a <file address>`), and log the callee
  and `x0` from a Python callback.  The last call before the failure is the
  answer.  Drill down one function at a time:
  `_multiarray_umath_exec` -> `initumath` -> `InitOperators` ->
  `get_info_no_cast`.

## Stage 2 (2026-10-13): `numpy/_core/__init__.py` runs to line 118

`import numpy` used to stop at `_core/__init__.py` line 24 (`from . import
multiarray`, which imports `overrides`).  It now stops at line 118
(`from .memmap import *`): `multiarray`, `overrides`, `umath`, `numerictypes`
and `_type_aliases` all import.  Again every wall was in the shim, not in Grail's
Python semantics.

23. **A module function crossed into C as a wrapper of a Grail object.**  Grail
    exposes a dynamically loaded module's functions as methods of its module
    class, so `mod.f` is a `BoundMethod`, and passed back into C it became a
    generic wrapper.  numpy's `add_docstring` writes `ml_doc` only when
    `Py_TYPE(obj) == &PyCFunction_Type`, and fell back to
    `setattr(obj, '__doc__', ...)`, which a builtin function refuses ("Cannot set
    a docstring for that object").  Two fixes:
    * `CPythonShim>>wrap:` now hands C the module's own
      `builtin_function_or_method` for such a `BoundMethod`.  The new user action
      `shimFunctionObject` makes it with `PyCMethod_New` over the module's
      `PyMethodDef`, once per definition.
    * `PyCMethod_New`'s objects carry the exported `PyCFunction_Type`, which was
      a zeroed placeholder, not a private type, as the descriptor types already
      did (wall 21).
24. **`functools.wraps` on a wheel object never reached C.**  `overrides.py` wraps
    every public numpy function as an `_ArrayFunctionDispatcher` and runs
    `functools.wraps` over it, which stores `__name__`, `__doc__`, `__wrapped__`
    and the rest.  A Grail-side store on a `ShimForeignObject` stayed on the
    proxy, and the shim knew no `tp_dictoffset` at all.  Now
    `ShimForeignObject>>___pyAttrStore___:put:` asks C (`shimForeignSetAttr`),
    which stores the way `object.__setattr__` does: a data descriptor's setter,
    else the instance dict at `tp_dictoffset`.  Reads check that dict after
    data descriptors and before the type, as `PyObject_GenericGetAttr` does.
    C-side `PyObject_SetAttrString` and `PyObject_GenericSetAttr` on a wheel
    object take the same path; the latter used to raise `TypeError`.  A store C
    has nowhere to put (no such descriptor, no dict) still lands on the proxy,
    as before.
25. **`PyObject_GenericGetDict` recursed until the C stack overflowed.**  It
    answered `PyObject_GetAttrString(obj, "__dict__")`, which found the type's
    `__dict__` getset, which is `PyObject_GenericGetDict`.  The gem died with
    SIGSEGV and no Python traceback.  For a wheel object it now returns the
    instance dict, making it on first use.
26. **Struct members were never read on a wheel object.**
    `_core/_type_aliases.py` reads `dtype.type` for every `typeinfo` entry, and
    `type` is a `PyMemberDef` field.  The shim now has CPython's
    `PyMember_GetOne` and `PyMember_SetOne`, and the foreign getattr consults
    `tp_members`.  A read-only member refuses a store with CPython's "readonly
    attribute".  `cpython.h` had two member type codes wrong: `_Py_T_OBJECT` was
    16 (it is 6) and `Py_T_BOOL` was 21 (it is 14).  Only the shim's own modules,
    built against that header, agreed with them; numpy's `dtype.type` is a 6.
27. **`PyDict_DelItemString` was a stub that reported success** without
    deleting anything.  It is now real.  Found on the way, not yet hit.

`_grail_demo.so`, the test extension built against the real `Python.h`, gained a
`Box` type (struct members, an instance dict, a `__dict__` getset that is
`PyObject_GenericGetDict`) and three probes.  Seven `CPythonShimTestCase` tests
in category "NumPy Stage 2" pin walls 23 to 26 against CPython's answers.

### The frontier then

`numpy/_core/memmap.py` line 24, `class memmap(ndarray):` -- "cannot subclass a
non-class base (ShimForeignObject)".  **This is a different kind of wall.** A
Python class whose base is a C extension type needs instances that are real C
objects in that type's layout, allocated by its `tp_alloc`/`tp_new`, with the
Python class's own attributes and methods on top.  numpy leans on this
throughout: `memmap`, `matrix`, `recarray`, `numpy.ma`, and any user subclass of
`ndarray`.  Grail has no such object model yet.  The problem and the options are in
[Shim_Foreign_Subclassing.md](Shim_Foreign_Subclassing.md); its recommendation
is a subtype mirror per Grail subclass (the instance split into a C body in the
base's layout and a Grail half of the subclass), staged behind a stopgap and the
foreign operator protocol.

## Stage 3 (2026-10-14): `import numpy` completes; arrays compute

Steps 1 and 2 of [Shim_Foreign_Subclassing.md](Shim_Foreign_Subclassing.md):
a class statement may subclass a C type, and Python's operators reach a
wheel's slots.  With them `import numpy` runs to the end on Linux, and on
macOS up to the polyfit check it runs there (`_mac_os_check`, see the first
wall below).  Measured with one workaround in the venv, for #1580.

The walls, in the order they fell:

28. **`class memmap(ndarray)`.**  The stopgap: `ShimForeignObject>>
    ___subclass___:` builds the class on `ShimForeignSubclass`, which records
    the foreign base for `__bases__`, `__base__`, `__mro__` and `issubclass`,
    and refuses instantiation with CPython's "cannot create 'X' instances"
    (and the reason) before any `__new__` can hand numpy a type it cannot
    allocate.
29. **Member descriptors, and every descriptor's layout.**  numpy documents
    `flatiter.base` (a struct member read off its type), so there is now a
    `member_descriptor` (`PyDescr_NewMember`).  And numpy's `add_docstring`
    writes through `d_method` / `d_getset` / `d_member` at CPython's offset 40,
    after `PyDescr_COMMON`; the shim's descriptors kept the definition at 16,
    so the docstrings went to garbage.  All three now have CPython's layout.
30. **Slot wrappers.**  `add_newdoc('dtype', ('__ge__', ...))` reads
    `dtype.__ge__`, which `PyType_Ready` puts in a type's dict.  An operator
    dunder read off a wheel's type answers a `wrapper_descriptor`, and off an
    instance a `method-wrapper`, both over the slot table below.
31. **`np.dtypes.BoolDType` missing.**  A proxy for a TYPE takes its own
    `tp_name` -- but "is a type" meant "its metatype is `type`", and a DType's
    is `_DTypeMeta`, a subclass, so every DType was named `_DTypeMeta` and
    `_add_dtype_helper` wrote one attribute 24 times.
32. **A cached type descriptor read off an instance answered the descriptor.**
    The descriptor protocol now applies to a type-dict hit, so after
    `dtype.char` is read for its docstring, `dtype('int8').char` is still the
    character.
33. **Operators: the slot table.**  `ShimForeignObject`'s 80-odd dunders call
    the object's slots (`shimForeignOp`, `foreign_op_invoke`) with CPython's
    conventions: binary slots both ways round, `NotImplemented` when a slot is
    missing (so the other operand is tried), in-place falling back to binary,
    rich comparison, `nb_bool` then length, `mp_subscript` then `sq_item`,
    item assignment and deletion, `sq_contains` then iteration, `tp_iter` /
    `tp_iternext`, and hash with CPython's rule that comparison without a
    hash is unhashable (ndarray).  A builtin's comparison with a wheel object
    reaches the object's slot reflected (`3 == box`, `3 < box`).
34. **`NotImplemented` and `Ellipsis`.**  Both cross as the C singletons, by
    pointer: numpy's slots answer `Py_NotImplemented`, and its indexing tests
    `index == Py_Ellipsis`.  `_Py_EllipsisObject` was a pointer VARIABLE of
    that name, so a wheel's `Py_Ellipsis` was the pointer's address.
35. **Floats crossed with their OOP where the value belongs.**  numpy reads a
    float with the inline `PyFloat_AS_DOUBLE` (`ob_fval`, offset 16), and a
    Grail float's wrapper held its OOP there: `np.subtract(2.0, 0.0)` was
    `-6e-323`.  An exact float now crosses as its value (magic `GRAILFV1`),
    and `pyobj_oop` rebuilds it -- this is the "W5" of the pydantic notes.
36. **Lists and tuples read inline.**  A Grail list or tuple argument of a
    wheel's callable, operator or module function, and the result of
    `PySequence_Fast` and `PyDict_Keys` / `Values` / `Items`, is a real-layout
    copy (`real_layout_arg`); `np.dtype([('a', 'f8')])` read its list with
    `PyList_GET_ITEM`.  The shim's own modules keep the caller's list:
    `_bisect.insort` mutates its argument.
37. **`np.float64(x)` was always 0.0.**  `numpy.float64` subclasses float and
    builds through `PyFloat_Type.tp_new`, which was object's: a zeroed
    object.  `float_tp_new` stores the value at `ob_fval` for a subtype, and a
    wheel's float subtype without slots of its own uses float's arithmetic.
38. **Silent stubs** that returned "success" with nothing done, each found by
    a wrong answer or a crash: `PySequence_Fast`, `PySequence_Tuple`,
    `PyVectorcall_Call` (every numpy function is a vectorcall dispatcher),
    `PyObject_GetOptionalAttr` (never wrote its result), `PyThreadState_Get` /
    `PyInterpreterState_Main` (`_reload_guard` reads `->interp`),
    `PyObject_InitVar`, `PyLong_AsLongAndOverflow` and
    `PyLong_AsLongLongAndOverflow` (`np.arange(3) == 1` was all False),
    `PySeqIter_New` / `PyObject_SelfIter` (`for x in array`).  Also
    `PyObject_HashNotImplemented` was missing, and slices are typed as
    `PySlice_Type` (`a[:, 1]`).
39. **Hashing a DType at depth.**  numpy keys its cast tables by DType class;
    a hash that needed a nested user action failed deep in `np.linspace` and
    the lookup missed ("builtin cast ... not found").  A proxy now learns at
    birth whether its type has `tp_richcompare` / `tp_hash`, and one with
    neither compares and hashes by identity with no user action, as in
    CPython.

`_grail_demo.so` gained probes for each (a `Box` with slots, `Plain`,
`NoHash`, `MyFloat`, a type with a `type` subclass as metatype, and ten
functions that read the C API inline), and 19 `CPythonShimTestCase` tests in
"NumPy Stage 3" compare each with CPython's answer.

A sample of everyday use -- `arange`, `reshape`, arithmetic, `.T`, `mean`,
`sum(axis=0)`, indexing and slicing, comparison, `zeros`, `array` from nested
lists, `dot`, `@`, `std`, `concatenate`, `where`, iteration, item assignment
-- prints what CPython prints in 18 of 22 lines.

### The frontier then

1. **GemStone's user-action nesting limit.**  `INT_MAX_USER_ACTION = 2`
   (`src/interp.ht`): the interpreter may be re-entered through a user action
   twice, and a third time is `RT_ERR_MAX_RECURSION` (2138, "Too many levels
   of recursion from user actions").  Every public numpy function is a C
   dispatcher (`_ArrayFunctionDispatcher`) that calls its Python
   implementation back, so a numpy function written in Python that calls
   another -- `np.linspace` calling `ndim`, `_mac_os_check`'s `polyfit` --
   needs a third level.  `GEM_MAX_SMALLTALK_STACK_DEPTH` does not affect it.
   Two ways out: raise the constant in the VM (it also sizes
   `currStkSegments`, via `INT_MAX_RECUR`), or have Grail call a
   dispatcher's Python implementation itself, without the C round trip,
   when no argument overrides `__array_function__`.
2. **`str()` / `repr()` of numpy objects.**  numpy formats in Python, called
   back from C, and the callback ends in error 2758 ("return from on:do:
   block would cross frame of ... user action"); the proxy then prints
   itself.
3. **#1580**: a class-body statement that reads a sibling `@property` sees
   the function (`numpy/matrixlib/defmatrix.py:1009`).
4. **55 more stubs** in `shim_numpy.cc` answer as if they succeeded.  The ones
   above were found by their wrong answers; making the rest real or loud is
   cheaper than finding them that way.
5. **A Grail generator cannot be iterated from C** (its body runs on its own
   GsProcess, and a user action cannot switch process).

## Stage 4 (2026-10-14): numpy's dispatchers run in Grail; `import numpy` completes on macOS

Before: the nesting limit (frontier item 1 above) stopped `np.linspace`, and
with it `_mac_os_check`'s `polyfit`, which `import numpy` runs on macOS.
After: with numpy's own `__init__.py`, unpatched, `import numpy` completes on
macOS and `np.polyfit([0, 1, 2], [1, 3, 5], 1)` answers CPython's
`[1.9999999999999996, 1.0000000000000016]` to the last bit.  The
everyday-use sample now matches CPython on 19 of 22 lines; the three left are
`str(dtype)`, `repr(array)` and `str(array)` (item 2 below).

**Wall 40 -- the nesting limit, resolved on the Grail side.**  A numpy public
function is an `_ArrayFunctionDispatcher`.  Its C `tp_call` calls the Python
dispatcher for the relevant arguments, asks each one for
`__array_function__`, and when none overrides it (none has one, or the one it
has is ndarray's) calls the Python implementation.  Through C that is two
user-action re-entries per call; called from Grail it is now none:
`ShimForeignObject>>___callArrayDispatch:args:kwargs:` does the same work in
Grail.  It needs two things only C can see, answered by two user actions that
do not call back:

* `shimArrayDispatcherParts` -- the dispatcher and implementation, which numpy
  keeps at offsets 32 and 40 of the object and exposes only the second of (the
  `_implementation` getset).  The layout is checked against that getset and
  `tp_dictoffset` before it is trusted; a mismatch answers nil and the call
  goes to C as before.
* `shimArrayFunctionKind` -- for a wheel object passed as a relevant
  argument: no `__array_function__`, ndarray's, or another.

Anything else goes to C unchanged: an override (C hands the call to that
`__array_function__`), a `like=` dispatcher (no dispatcher function), and a
call the dispatcher rejects -- it runs again in C, which raises with the public
function's name, as numpy words it.  A dispatcher is argument plumbing, so
running it twice changes nothing.  A dispatcher that is a GENERATOR (several
of numpy's are) now works too: Grail iterates it, where C could not (item 5
below).

The VM limit itself is unchanged, and a C extension that calls back into
Python three deep still meets it; a VM issue is being filed for it.

**Wall 41 -- `PyObject_SetAttrString` on a Grail object.**  The server sent
the env-1 setter `name:`, which exists only for an attribute the class
declares; for a new one it was taken for a call of a method `name` and raised
AttributeError.  numpy's `finfo` fills an empty instance from C
(`_populate_finfo_constants`), so `polyfit`'s `finfo(x.dtype).eps` failed.  It
is now `setattr()`, so a `__setattr__` override sees the store too.

Tests: six in `CPythonShimTestCase`, "Grail-Tests - NumPy Dispatch", on the
demo extension's miniature of numpy's dispatcher (`Dispatcher`, with numpy's
`tp_name` and layout; `NdLike`, named `numpy.ndarray`; `OverLike`).  Each
expected value is what CPython answers for the same source.  With the two
fixes reverted, the four that cover them error (nesting, ndarray-default
arguments, a generator dispatcher, the C setattr) and the two that cover
what still goes to C pass.

### The frontier then

1. **The VM's nesting limit** still applies to any other path that re-enters
   three deep: an override's `__array_function__`, a ufunc calling a Python
   `__array_ufunc__`, numpy's printing (item 2).
2. **`str()` / `repr()` of numpy objects.**  numpy formats in Python, called
   back from C, and the callback ends in error 2758 ("return from on:do:
   block would cross frame of ... user action"); the proxy then prints
   itself.
3. **A C builtin function reads as a Python function.**  `import numpy` warns
   30 times "add_newdoc was used on a pure-python object <function array>":
   numpy's `_needs_add_docstring` finds `isinstance(obj, types.FunctionType)`
   true for its own C functions.
4. **#1580**: a class-body statement that reads a sibling `@property` sees
   the function (`numpy/matrixlib/defmatrix.py:1009`).
5. **55 more stubs** in `shim_numpy.cc` answer as if they succeeded.
6. **A Grail generator cannot be iterated from C** (its body runs on its own
   GsProcess, and a user action cannot switch process).  numpy's dispatchers
   no longer need it.

## Stage 5 (2026-10-14): printing -- two shim bugs, then the nesting limit again

Before: `str(np.dtype('f8'))` printed the proxy, `<ShimForeignObject
numpy.dtypes.Float64DType @...>`, after error 2758 in the callback.  Two
shim bugs sat in front of the real wall:

**Wall 42 -- a metatype's getset, read off a type.**  numpy's `dtype.name`
is a C getset that calls Python `_dtype._name_get`, which reads
`type(dtype)._legacy`.  `_legacy` is a getset of the METATYPE `_DTypeMeta`.
CPython's `type_getattro` looks there first, for a data descriptor, with
the type as the instance; the shim looked only along the type's own chain,
and answered AttributeError.  `foreign_generic_getattr` now does what
`type_getattro` does.  After it, `dt.name`, `_dtype.__str__(dt)` and
`_dtype.__repr__(dt)` all answer CPython's `'float64'` / `"dtype('float64')"`
when called from Grail.

**Wall 43 -- `PyUnicode_Compare`** (and `PyUnicode_Contains`,
`PyUnicode_CompareWithASCIIString`) were stubs answering "equal" and
"absent".  numpy's dtype naming reached the first.  They compare UTF-8 bytes,
which orders strings as their code points do.

**The wall: the nesting limit, counted correctly this time.**  `str(dt)` still
prints the proxy.  The limit is not on callbacks but on USER ACTIONS IN
FLIGHT: `pushUaMarker` (`intloopsup.c`) increments `ffiEntryCount` each time a
user action is invoked and refuses the third; a GciPerform back into Smalltalk
(`Bc_BOOT_EXECUTE`) is not counted.  `str(dt)` is three:

1. `str(dt)` -- `shimForeignStr`, which runs numpy's `arraydescr_str`, which
   calls `_dtype.__str__` back;
2. its `dtype.name` -- `shimForeignGetAttr`, which runs `arraydescr_name_get`,
   which calls `_dtype._name_get` back;
3. its first statement's `dtype.isbuiltin` -- `shimForeignGetAttr` again, a
   leaf read that would not even call back.  Refused.

The refusal (2138) is raised inside the user-action primitive, and the
callback guard's `ex return: nil` would unwind through that primitive's frame,
so what surfaces is 2758.  The same count explains the dispatchers (stage 4):
the third user action, not the third callback.

Ways around it on the Grail side, measured and closed:

* **FFI instead of user actions.**  A C function called through `CCallout`
  does not touch `ffiEntryCount`, but it may not call back: GciExecuteStr from
  inside one answers error 2203 ("GCI operation requested while a nonblocking
  or thread safe call in progress").  `CCallin`, GemStone's FFI callback,
  needs native code (its own tests skip without it), which Darwin arm64 does
  not have.
* **Doing numpy's printing in Grail**, as stage 4 does its dispatching:
  `arraydescr_str`/`repr` and `array_str`/`repr` call fixed Python functions
  (`_dtype.__str__`, `_default_array_str`, ...), so Grail could call them
  itself.  Possible, but it copies numpy internals that are not a protocol
  (`npy_runtime_imports`), and any Python that numpy calls back two deep
  meets the same wall the next time.

So the general fix is the VM constant.  `INT_MAX_USER_ACTION` also sizes
`currStkSegments` (`INT_MAX_RECUR = INT_MAX_USER_ACTION * 3`), which is why it
is a VM change rather than a configuration.

## Stage 6 (2026-10-14): a census, and three silent wrong answers

With `import numpy` complete, a probe of 105 everyday operations
(`scripts/numpy_census.py` -- construction, indexing, ufuncs, reductions,
linalg, polyfit, I/O, scalars, string arrays) was run under Grail and CPython
and diffed.  The basics agree: arange/reshape/arithmetic/broadcasting,
sum/mean/std, slicing, fancy and boolean indexing, linspace, dot/matmul,
where/sort/argsort, cumsum, sqrt/exp, astype, isnan, linalg.inv/det,
polyfit, structured arrays, datetime64, einsum, histogram, nditer.  What did
not is listed in the frontier below; this stage fixed the three that answered
WRONG DATA with no error.

**Wall 44 -- a bytes object's buffer died with the call.**
`np.frombuffer(b'abcd', 'u1')` answered `[115, 244, 43, 130]`: numpy keeps
the buffer view's pointer as the array's data (and the bytes as its base),
but the shim's `PyObject_GetBuffer` and `PyBytes_AsString` handed out a copy
from a per-call cache, freed when the call returned.  A bytes object's copy
now lives as long as its WRAPPER (`CPythonShim>>PyBytes_Buffer:`), as a
str's UTF-8 form already did, and the sweep drops both with the wrapper.  The
copy is made with `copyBytesFrom:...allowCodePointZero: true`: the plain form
has C-string semantics and refuses a NUL.  A bytearray's copy is refreshed in
place on each request; a change either side makes after C took the pointer is
not seen by the other.  `PyObject_GetBuffer` is now CPython's, through a real
`PyBuffer_FillInfo`: a WRITABLE request on a bytes raises
`BufferError: Object is not writable.` (so the array is read-only, as in
CPython), format and shape are filled on request, `view->obj` holds a
reference that `PyBuffer_Release` drops, and a str has no buffer.

**Wall 45 -- numpy re-readied the shim's own builtin types.**
`np.array(b'ab')` held `b''`.  numpy's `setup_scalartypes` calls
`PyType_Ready(&PyBytes_Type)`, `&PyUnicode_Type` and others before deriving
its scalar types, and the shim's `PyType_Ready` ran its slot inheritance on
them: `bytes` and `str` inherited object's `tp_new`, so the shim no longer
routed a C call of `builtins.bytes` to Grail, and `PyObject_Bytes(b'xy')`
built five zero bytes in C.  `PyType_Ready` now leaves a READY type alone, as
CPython does.  `bytes` and `str` have a `tp_new` of their own, which the
scalar types inherit: the type itself still goes to Grail; a subtype
(`numpy.bytes_`) gets an instance in CPython's `PyBytesObject` layout, which
the shim's bytes functions read in place.  A `numpy.str_` is still a zeroed
instance (the frontier below).  `PyType_Ready` also passes on the base's
int/list/tuple/bytes/str/dict `_SUBCLASS` flag, as `inherit_special` does,
so `PyBytes_Check(numpy.bytes_ instance)` holds in numpy's C.  Side effect:
`complex(np.complex128(1+2j))` now keeps its imaginary part.

**Wall 46 -- `np.array(range(4))` was a 0-d object array.**  numpy treats
anything that passes `PySequence_Check` as a sequence; the shim answered from
the C type's slots, and a Grail object's type has none.  It now asks the
server (`CPythonShim>>PySequence_Check:`), which applies CPython's rule: the
class defines a real `__getitem__` and is not a dict.  "Real" excludes the
refusal methods Grail gives int and None (`hasattr(int, '__getitem__')` is
True in Grail, False in CPython), the same exclusions %-formatting's mapping
test already made -- now one method, `object>>___hasOwnGetitem___`.  A range,
a deque, an `array.array` and a class with `__len__`/`__getitem__` convert as
in CPython.

All of it is checked against CPython through `_grail_demo.capi`
(`CPythonShimTestCase>>testCApiBuffersSequencesAndBuiltinTypes`), and each
fix's control fails it.

### The frontier now

1. **The VM's user-action limit** (two in flight): `str()`/`repr()` of an
   array or dtype, an override's `__array_function__`, a ufunc calling a
   Python `__array_ufunc__`, and any callback that reads a wheel object two
   deep.
2. ~~**A Python subclass of `ndarray` cannot be instantiated**~~: fixed in
   stage 7, below.
3. **`numpy.random` -- Cython.**  Its modules are Cython-generated, and
   between them import ~50 CPython symbols the shim does not export
   (`nm -u` over numpy's `.so` files against `libcpython_ua`): Cython's
   module-init and traceback machinery (`PyImport_GetModule`,
   `PyImport_AddModuleRef`, `PyCode_NewEmpty`, `PyFrame_New`,
   `PyTraceBack_Here`, `_PyType_Lookup`, `PyType_FromMetaclass`,
   `PyThreadState_GetUnchecked`, `Py_Version`, ...), the in-place number
   protocol, `PyMethod_Type`/`PyRange_Type`, and a few `_PyDict_`/`_PyUnicode_`
   internals.  dlopen reports only the first (`PyMethod_Type`).  This is
   Cython support in general, not numpy's: pandas, scipy and scikit-learn are
   built the same way.
4. **Complex dtypes**: `np.fft.fft` raises `Cannot interpret '1j' as a data
   type`.
5. **`numpy.str_` / `numpy.bytes_` scalars** are not str/bytes to Grail
   (`len`, `==`); a `numpy.str_` is built zeroed.
6. **Session-killers**: `np.save`/`np.load` (error 2085, "Expected
   numpy.bool to be a Boolean"); `np.savetxt`/`np.loadtxt` (core dump).
7. ~~**`np.unique`**: a codegen CompileError 1001~~: fixed by #1639
   (reserved selector names).
8. Smaller: `np.allclose` ("'ShimForeignObject' object is not callable"),
   `format(np.float64(1.5), '.1f')`, `pickle`/`copy.deepcopy` of an array
   ("issubclass() arg 1 must be a class"), `memoryview(ndarray)` and the
   dtype of `np.asarray(memoryview)` (Grail objects export no buffer),
   `np.char.upper` (AlmostOutOfStack), and `np.array.__doc__` (C docstrings
   are not read back).
9. **A Grail generator cannot be iterated from C.**

## Stage 7 (2026-10-15): Python subclasses of ndarray make instances

Frontier item 2 above is closed by option A of
[Shim_Foreign_Subclassing.md](Shim_Foreign_Subclassing.md) (§8 there says
what was built). A subclass instance is a C body of a per-class subtype mirror plus a
Grail half. The census now agrees with CPython on these, with the sanity and
mac checks skipped as before:
* `np.matrix`: creation, `*` and `.T`;
* ndarray subclassing and `view(Sub)`;
* `np.recarray` field access;
* `numpy.ma`: import, `sum`, `filled` and `masked`;
* `np.unique` and `np.percentile`.

`numpy.ma` also needs module-level function docstrings (#1646). It rewrites
`np.fromfunction.__doc__` and asserts that the text it replaces is there.

The subclass work exposed these general shim defects, now fixed:

* **`PyErr_Format` lost its error.** It set the exception before
  formatting, and a `%R` that called back into Grail cleared it. It now
  formats first.
* **`PyObject_HasAttrString` sent a message instead of reading the
  attribute**, so `np.dtype(V)` for a class with a `dtype` attribute
  answered nil. It now reads, and answers in C for a wheel's own objects.
* **`PyObject_IsInstance` / `IsSubclass` against a C type** answer in C,
  which also saves a user action on numpy's hot paths.
* **`iter()` on a C object with only `sq_item`** falls back to
  `PySeqIter_New`, as CPython does.
* **A C function's `__doc__` and `__text_signature__`** are split from its
  internal doc as CPython's `find_signature` splits them. `inspect.signature`
  reads `__text_signature__` for builtins.

Still open on this front:
* `matrix.I`, which is Python code inside a C callback reading a base
  attribute, so it is three user actions deep (frontier item 1);
* `memmap`, which needs an `mmap` module.

`np.loadtxt` and `np.save`/`np.load` still kill the session (frontier
item 6), so the census runs with
`NP_SKIP=savetxt/loadtxt,np.save/load`.

## Repro

```
# build the shim and _grail_demo.so (install.sh does both)
./install.sh
# numpy for 3.14 in a venv (one-time)
python3.14 -m venv /tmp/npvenv && /tmp/npvenv/bin/pip install numpy==2.5.4
# a probe: put the venv's site-packages on sys.path, then import numpy
printf 'import sys\nsys.path.insert(0, "/tmp/npvenv/lib/python3.14/site-packages")\nimport numpy\n' > /tmp/np_probe.py
./grail /tmp/np_probe.py
```

Add `GRAIL_SHIM_DIAG=1` to log foreign crossings and failed callbacks.

The diagnostic stub layer (`shim_numpy.cc`) logs `SHIM-STUB-HIT: <fn>`
the first time NumPy calls any not-yet-real entry point, so the next
behavioral wall after this one is observable as soon as it's reached.
