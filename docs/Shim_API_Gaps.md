# CPython Shim (cpython.cc / cpython.h) — Gap Analysis

Reviewed 2026-06-11 against the full C source (`src/c/shim/cpython.cc`,
`src/c/shim/cpython.h`) and the Smalltalk server (`src/smalltalk/Python/
CPythonShim.gs`).  Checkboxes track implementation status; this file is the
restart-safe work list for closing the gaps.

## Priority 1 — C calls server selectors that DO NOT EXIST (live runtime failures)

The C side already delegates to these `CPythonShim` selectors, but they were
never implemented in Smalltalk.  Any extension code path that reaches them
fails with a GemStone doesNotUnderstand surfaced through `GciPerform`
(observed previously as the "no Symbol" error on re.sub's callable path).

- [x] `PyObject_Call:args:` — generic callable invocation, via the canonical
      `___pyCallValue___:kw:` entry point. (Note: Grail's re.sub callable
      path is handled in `SrePattern>>___subWithExpansion___` Smalltalk-side
      and never reaches `pattern_subx`'s CALLABLE branch — this selector
      matters for *other* extensions that call back into Python values.
      Caveat: the C branch would pass a C-allocated MatchObject whose
      offset-16 read is garbage; C-struct objects can't cross the
      PyObject_Call boundary into Smalltalk.)
- [x] `PyObject_GetItem:key:` — `obj[key]` via `__getitem__`.
- [x] `PyObject_SetItem:key:value:` — `obj[key] = v` via `__setitem__`.
- [x] `PyObject_SetAttrString:name:value:` — setattr via the `name:` setter.
- [x] `PyObject_RichCompare:with:op:` — like RichCompareBool but returns the
      wrapped result object.
- [x] `PySequence_GetItem:at:` — fallback for non-list/tuple sequences.
- [x] `importGetAttr:name:` — backs `_PyImport_GetModuleAttrString`
      (used by `_sre` for `copy`/`deepcopy` interop). Implement via
      `importlib import_module:` + attribute load.

## Priority 2 — C-side correctness bugs in existing functions

- [x] `PyObject_IsTrue` returns 1 for empty str/bytes/list/tuple/dict
      (CPython: falsy). Check container emptiness for known types.
- [x] `PyLong_Check(Py_True)` returns 0 — bool is an int subclass in
      CPython. All `PyXxx_Check` functions use pointer-identity on the
      type instead of `tp_flags` subclass bits / `tp_base` walks, so
      heap-type subclasses also fail. Use flag-based checks.
- [x] `PyObject_GetBuffer` on str sets `len` to the *code-point* count but
      `buf` to UTF-8 bytes — `len` must be the byte length.
- [x] `PyType_GenericNew` / `PyType_GenericAlloc` are NULL-returning stubs;
      any heap type with `tp_new = PyType_GenericNew` silently fails.
      Implement real allocation (calloc tp_basicsize + refcnt/type setup).
- [x] `PySlice_AdjustIndices` is a no-op returning 0. Implement CPython's
      clamping algorithm (pure C, no object access needed).
- [x] `PyErr_ExceptionMatches` is identity-only (no subclass matching).
      Acceptable for the sentinel design, but `PyExc_LookupError`-style
      base classes now match their subclasses via a small table.

## Priority 3 — Format-string coverage

- [x] `PyArg_ParseTuple` supports only `O`, `n`, `i`. Added: `s` (UTF-8
      string), `s#`, `y`/`y#` (bytes), `d`/`f` (float), `l`, `k`, `I`, `p`
      (bool), `c`, `O!` (typed object), `O&` (converter), `:`/`;` names in
      error messages, and `$` (keyword-only marker, treated as `|`).
- [x] `Py_BuildValue` supports only `""` and `"Nn"`. Added: `i`, `l`, `n`,
      `d`, `f`, `s`, `s#`, `y`, `y#`, `O`, `N`, `S`, `(...)` tuples and
      `[...]` lists.

## Priority 4 — Missing APIs that nearly every real extension uses

- [x] `PyObject_GetAttr` / `PyObject_SetAttr` / `PyObject_HasAttr`
      (PyObject* name variants — only the *String forms existed).
- [x] `PyObject_CallNoArgs`, `PyObject_CallObject`,
      `PyObject_CallFunctionObjArgs`, `PyObject_CallMethodObjArgs`,
      `PyObject_CallMethodNoArgs`, `PyObject_CallMethodOneArg`.
- [x] `PyModule_AddObject` (the classic pre-3.10 spelling; most extensions
      in the wild call this, not `PyModule_AddObjectRef`).
- [x] `PyModule_AddType`.
- [x] Exception sentinels: only 14 existed. Added `PyExc_Exception`,
      `PyExc_BaseException`, `PyExc_LookupError`, `PyExc_ArithmeticError`,
      `PyExc_NotImplementedError`, `PyExc_OSError`, `PyExc_IOError`,
      `PyExc_ImportError`, `PyExc_NameError`, `PyExc_StopAsyncIteration`,
      `PyExc_BufferError`, `PyExc_EOFError`, `PyExc_KeyboardInterrupt`,
      `PyExc_UnicodeError`, `PyExc_UnicodeDecodeError`,
      `PyExc_UnicodeEncodeError`, `PyExc_RuntimeWarning`,
      `PyExc_UserWarning`, plus `get_error_type` mappings so they raise
      with the right Python class name server-side.
- [x] `Py_BEGIN_ALLOW_THREADS` / `Py_END_ALLOW_THREADS` (+ `Py_BLOCK_THREADS`
      etc.) — no-op macros; extensions use them constantly.
- [x] 64-bit int conversions: `PyLong_FromLongLong`, `PyLong_AsLongLong`,
      `PyLong_AsUnsignedLongLong`, `PyLong_FromUnsignedLongLong`,
      `PyLong_AsUnsignedLongMask`, `PyLong_FromDouble`, `PyLong_AsDouble`.
- [x] `PyUnicode_AsUTF8AndSize`, `PyUnicode_DecodeUTF8`,
      `PyUnicode_InternFromString`, `PyUnicode_Concat`.
- [x] `PySequence_Size`, `PySequence_Check`, `PySequence_Contains`,
      `PySequence_SetItem`.
- [x] `PyIter_Next` + `PyObject_GetIter` (delegate to server `__iter__` /
      `__next__`; StopIteration → NULL-without-error per protocol).
- [x] `PyDict_Clear`, `PyDict_Keys`, `PyDict_Values`, `PyDict_Items`,
      `PyDict_Copy`, `PyDict_Update`, `PyDict_Merge`, `PyDict_SetDefault`.
- [x] `PyList_GetSlice`, `PyList_AsTuple`, `PyList_Sort`, `PyList_Reverse`,
      `PyTuple_GetSlice`.
- [x] `PyCapsule_New` / `PyCapsule_GetPointer` / `PyCapsule_GetName` /
      `PyCapsule_IsValid` / `PyCapsule_SetPointer` / `PyCapsule_Import`
      stubs-with-substance (pure C; capsules never cross into Smalltalk).
- [x] `PyErr_NewException` / `PyErr_NewExceptionWithDoc` — returns a
      dynamically allocated exception sentinel whose name is reported
      through `get_error_type` (server raises by that name when known).
- [x] `PyErr_SetObject`, `PyErr_GivenExceptionMatches`, `PyErr_BadArgument`,
      `PyErr_BadInternalCall` (`_PyErr_BadInternalCall`).
- [x] `PyFloat_AsDouble` robustness: accept ints (and `__float__`-style
      wrappers) instead of mis-reading the OOP as a float.
- [x] `PyBool_Check`, `PyFloat_CheckExact`, `PyLong_CheckExact`,
      `PyList_CheckExact`, `PyDict_CheckExact`, `PyTuple_CheckExact`,
      `PyAnySet_Check` placeholders, `PyModule_Check`.
- [x] Header utility macros: `Py_VERSION_HEX` / version constants,
      `Py_ABS`, `Py_STRINGIFY`, `Py_CHARMASK`, `Py_RETURN_RICHCOMPARE`,
      `PyDoc_VAR`, `Py_NO_INLINE`, `PyMODINIT_FUNC` already present.

## Priority 5 — Design-level gaps (implemented 2026-06-12 unless noted)

- [x] **Module attribute export**: the `shimModuleAttrs` user action
      returns the `PyModule_AddIntConstant` / `AddStringConstant` /
      `AddObjectRef` table as `{name. value}` pairs (C-only objects like
      heap types and capsules are skipped — no OOP at offset 16);
      `CPythonShim>>moduleAttrs:` wraps it and
      `loadDynamicModule:fromPath:` stores the constants as dynamic
      instVars so `mymod.CONST` resolves via the `___pyAttrLoad___`
      probe. Two bugs found en route: `shimDynLoad` never ran
      `Py_mod_exec` slots, and `cpython.h` had `Py_mod_exec = 1` where
      the real CPython ABI uses 2 (1 is `Py_mod_create`) — .so files
      compiled against real headers silently skipped their exec.
      (`_sre`'s hand-duplicated MAGIC/CODESIZE still stand; switching
      them to the export is now possible but not done.)
- [x] **kwargs across the C boundary**: `shimCallKw` user action +
      `call_method_on_kw` deliver the METH_FASTCALL|METH_KEYWORDS vector
      convention (kwnames tuple + trailing values) and build a dict for
      METH_VARARGS|METH_KEYWORDS; methods without METH_KEYWORDS raise
      TypeError. Exposed as `callModule:method:args:kwargs:`; the
      generated dynamic-module `_name:kw:` methods route keywords through.
- [x] **`PyType_FromSpec` bases**: a single type object passed as `bases`
      becomes `tp_base`; subclass-identity `tp_flags` bits and buffer
      procs are inherited so flag-based Check functions see through the
      subclassing. A TUPLE of bases is rejected with a clear TypeError —
      tuples live in Smalltalk and type objects have no OOP, so the
      elements are unreadable by design.
- [x] **`tp_getset` setters**: `shimCallTyped` flags bit 4 selects the
      setter path (`callTyped:type:setattr:selfPtr:value:`). Type lookup
      also no longer requires module state, so zero-state modules can
      host typed objects.
- [x] **Buffer protocol for heap types**: `PyObject_GetBuffer` /
      `CheckBuffer` consult `bf_getbuffer`; `PyBuffer_Release` calls
      `bf_releasebuffer` when present.
- [x] **Slice objects**: `PySlice_New` / `PySlice_Unpack` are real,
      backed by the Grail `slice` class; CPython's defaults and the
      step≠0 check are applied C-side so PY_SSIZE_T sentinels never
      round-trip through Smalltalk.
- [x] **Set / frozenset / bytearray**: `PySet_New/Add/Contains/Discard/
      Clear/Size/Check` (+ `PyFrozenSet_*` aliases — mutability is not
      enforced) and `PyByteArray_FromStringAndSize/AsString/Size/Check`
      backed by the Grail `set` / `bytearray` classes. `PySet_New` with
      an iterable supports Smalltalk collections, not Python iterators.
- [x] **`PyUnicode_FromFormat`**: handles `%R` (repr), `%S` (str), `%A`,
      `%U` object conversions plus `%zd`/`%ld`/`%lld`/width/precision.

### Still deferred

- [ ] **`PyErr_Fetch/Restore` lose the exception class** for dynamically
      created exceptions (only type pointer + message text survive).
- [ ] **GC honesty**: `_PyObject_New` objects leak by design (refcount
      no-ops); fine for module-lifetime objects, wrong for high-churn
      allocation. Documented, not fixed.
- [ ] **`Py_GenericAlias`** returns origin unchanged (OK for
      `__class_getitem__` no-op semantics, wrong if code inspects args).
- [ ] **memoryview / complex APIs** (`PyMemoryView_*`, `PyComplex_*`) —
      add when a target extension needs them.
- [ ] **`Py_mod_create` slots** are ignored (custom module objects);
      `PyCapsule_Import` needs cross-module attr storage.
- [ ] **Tuple bases for `PyType_FromSpecWithBases`** — blocked on type
      objects having no Smalltalk identity; would need a C-side registry
      of wrapped type tuples.
