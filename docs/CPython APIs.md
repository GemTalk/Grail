# CPython APIs That Need Object Manager / Interpreter Interaction

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
