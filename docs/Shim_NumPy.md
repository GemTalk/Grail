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

11. **CURRENT FRONTIER — `LONGDOUBLE_setitem` empty-string parse (logaddexp
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

## Repro

```
# build the shim
cd src/c/shim && make
# install numpy for 3.14 into a venv (one-time)
python3.14 -m venv /tmp/numpy_probe && /tmp/numpy_probe/bin/pip install numpy
# probe (drives the load in-gem, prints walls)
/tmp/probe_numpy.sh    # harness written during the investigation
```

The diagnostic stub layer (`shim_numpy.cc`) logs `SHIM-STUB-HIT: <fn>`
the first time NumPy calls any not-yet-real entry point, so the next
behavioral wall after this one is observable as soon as it's reached.
