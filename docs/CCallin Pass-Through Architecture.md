# CCallin Pass-Through Architecture for the Shim

## How GemStone CCallins Work

A `CCallin` defines a callback signature — a Smalltalk block that C code can invoke as a function pointer:

```smalltalk
myCallin := CCallin name: 'doMath' result: #double args: { #double . #int64 }.

myCallout := CCallout
    library: lib name: 'register_callback'
    result: #void args: { myCallin }.

myCallout callWith: { [:a :b | a + b] }.
```

The C side receives a regular function pointer and calls it. GemStone intercepts the call and dispatches to the Smalltalk block. Supported types: `#int64`, `#double`, `#'char*'`, `#'ptr'`, `#void`, etc.

**Key limitation**: CCallin requires native code generation to be enabled.

## CPython APIs That Need Object Manager / Interpreter Interaction

The CPython C API functions fall into two categories relative to the shim:

**Category A — Can stay pure C** (no interpreter needed):
- Math/data crunching (`_statistics`, `_bisect`, `_crc32c`)
- Buffer/bytes operations on owned data
- Table lookups, hashing, compression
- Error state management (`PyErr_*`)

**Category B — Need GemStone interaction** (require CCallins):

| API Group | Key Functions | GemStone Equivalent |
|-----------|--------------|---------------------|
| **Object creation** | `PyObject_New`, `PyList_New`, `PyDict_New` | `OrderedCollection new`, `Dictionary new` |
| **Container ops** | `PyList_Append`, `PyList_GetItem`, `PyDict_SetItem` | `list add:`, `list at:`, `dict at:put:` |
| **Attribute access** | `PyObject_GetAttr`, `PyObject_SetAttr` | `obj perform:`, `obj ___at___:put:` |
| **Call protocol** | `PyObject_Call`, `PyObject_CallMethod` | `block value:value:` |
| **Type checking** | `PyFloat_Check`, `PyLong_Check`, `PyObject_IsTrue` | `obj isKindOf:`, `obj == true` |
| **Import system** | `PyImport_ImportModule` | `importlib importModule:` |
| **String ops** | `PyUnicode_FromString`, `PyUnicode_AsUTF8` | String creation/access |
| **Ref counting** | `Py_INCREF`, `Py_DECREF` | GemStone GC (automatic) |

## Proposed Architecture: Handle Table + Typed Dispatchers

The key design challenge is mapping between C `PyObject*` pointers and GemStone OOPs. The solution is a **handle table**:

```
C side (shim)                    GemStone side
─────────────                    ──────────────
PyObject* ──→ handle_id (int) ──→ GemStone object (OOP)
              (index into table)
```

### 1. Add a new kind tag: `PY_SHIM_GS_OBJECT`

```c
typedef enum {
    PY_SHIM_NONE, PY_SHIM_FLOAT, PY_SHIM_LONG, ...
    PY_SHIM_GS_OBJECT,   // NEW: backed by a GemStone object
} PyShimKind;

typedef struct {
    PyObject ob_base;
    int64_t  handle_id;   // index into GemStone-side handle table
} PyGsObject;
```

### 2. Register CCallin dispatchers during initialization

```smalltalk
"In CPythonShim>>initialize, register typed dispatchers:"
| callinGetAttr callinSetAttr callinCall |
callinGetAttr := CCallin name: 'gs_getattr' result: #int64
    args: { #int64 . #'const char*' }.
callinCall := CCallin name: 'gs_call' result: #int64
    args: { #int64 . #int64 . #int64 }.  "handle, args_handle, nargs"

(self calloutFor: 'PyShim_RegisterCallbacks' result: #void
    args: { callinGetAttr . callinCall })
  callWith: {
    [:handle :name | self gsGetAttr: handle name: name] .
    [:handle :argsH :n | self gsCall: handle args: argsH nargs: n] }.
```

### 3. C side stores and calls the function pointers

```c
typedef int64_t (*GsGetAttrFunc)(int64_t handle, const char *name);
typedef int64_t (*GsCallFunc)(int64_t handle, int64_t args_handle, int64_t nargs);

static GsGetAttrFunc gs_getattr = NULL;
static GsCallFunc   gs_call    = NULL;

SHIM_EXPORT void PyShim_RegisterCallbacks(GsGetAttrFunc f1, GsCallFunc f2) {
    gs_getattr = f1;
    gs_call = f2;
}

/* Now PyObject_GetAttr can route through GemStone: */
PyObject *PyObject_GetAttr(PyObject *obj, PyObject *name) {
    if (obj->ob_kind == PY_SHIM_GS_OBJECT) {
        int64_t result_handle = gs_getattr(
            ((PyGsObject*)obj)->handle_id,
            PyUnicode_AsUTF8(name));
        return handle_to_pyobject(result_handle);
    }
    /* ... fall through to shim-local handling */
}
```

### 4. Minimal CCallin set

3-4 dispatchers cover most extensions:

| CCallin | Signature | Purpose |
|---------|-----------|---------|
| `gs_getattr` | `(int64, char*) -> int64` | Attribute access |
| `gs_setattr` | `(int64, char*, int64) -> void` | Attribute set |
| `gs_call` | `(int64, int64, int64) -> int64` | Call an object |
| `gs_convert` | `(int64, int32) -> double/int64` | Type conversion |

## Challenges and Tradeoffs

**Performance**: Each CCallin round-trip crosses the C-Smalltalk boundary. For tight loops (e.g., NumPy element operations), this would be prohibitively slow. The dual-path design preserves the zero-overhead fast path for computational extensions.

**Reference counting vs GC**: GemStone objects in the handle table need to be pinned (kept in a Smalltalk-side Array) to prevent GC. The C side manages `PY_SHIM_GS_OBJECT` refs manually, and when the last ref drops, the handle is returned to GemStone for cleanup.

**Incremental path forward**:
1. **Phase 1**: Add `PY_SHIM_GS_OBJECT` kind + handle table + `PyShim_RegisterCallbacks` infrastructure
2. **Phase 2**: Implement `PyObject_GetAttr`/`SetAttr` via CCallins (enables C extensions that do attribute access on Python objects)
3. **Phase 3**: Implement `PyObject_Call` via CCallins (enables C extensions that call Python callables)
4. **Phase 4**: Implement `PyList_*`/`PyDict_*` via CCallins on GemStone-resident containers

This preserves the fast path for modules like `_statistics`, `_bisect`, and `_crc32c` while enabling more complex extensions that need to interact with the Python object model.

## Sources

- [GemStone 3.7 FFI Documentation](https://downloads.gemtalksystems.com/docs/GemStone64/3.7.x/GS64-ProgGuide-3.7/19-FFI.htm)
- [GemBuilder for C 3.7](https://downloads.gemtalksystems.com/docs/GemStone64/3.7.x/GS64-GemBuilderforC-3.7.pdf)
