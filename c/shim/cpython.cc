/*
 * cpython.cc — GCI User Action library implementing the CPython C API.
 *
 * C extension modules include cpython.h (a stand-in for Python.h) and call
 * standard CPython API functions. Those functions are implemented here using
 * GCI calls to manipulate GemStone objects.
 *
 * PyObject* points to a 24-byte CByteArray buffer (allocated by Smalltalk):
 *   offset 0:  ob_refcnt  (matches Python.h)
 *   offset 8:  ob_type    (matches Python.h)
 *   offset 16: _oop       (GemStone OOP of the wrapped Smalltalk value)
 *
 * A CPythonShim instance ("server") is passed to C at init time. Every
 * delegated API function calls GciPerform(server, "PyXxx_Yyy:", ...).
 * C is a trivial pass-through with no knowledge of Smalltalk implementation.
 *
 * Compiled as C++ because gciua.hf requires it.
 */

#include "gciua.hf"

extern "C" {
#include "cpython.h"
}

#include <string.h>
#include <stdio.h>
#include <stdlib.h>
#include <stdarg.h>
#include <dlfcn.h>

/* GemStone OOPs for the three singletons (defined below, set by shimInit). */
static OopType none_oop;
static OopType true_oop;
static OopType false_oop;

/* ====================================================================
 * PyObject OOP access
 *
 * Each PyObject* points to a 24-byte CByteArray. The Smalltalk target
 * OOP lives at offset 16. Reading it is a single pointer dereference
 * — zero GCI calls.
 *
 * Singletons (None, True, False) are static C structs (matching
 * CPython's ABI symbol names) that don't have the hidden OOP field,
 * so we detect them by pointer identity.
 * ==================================================================== */

static inline OopType pyobj_oop(PyObject *obj) {
    if (obj == Py_None)  return none_oop;
    if (obj == Py_True)  return true_oop;
    if (obj == Py_False) return false_oop;
    return *(OopType *)((char *)obj + 16);
}

/* Convert a SmallInteger OOP (memory address) to a PyObject pointer. */
static inline PyObject *addr_to_pyobj(OopType addrOop) {
    return (PyObject *)(intptr_t)GciOopToI64(addrOop);
}

/* ====================================================================
 * Server — the CPythonShim instance, set by shimInit
 * ==================================================================== */

static OopType server = OOP_NIL;

/* ====================================================================
 * Global type objects
 *
 * C extensions compare Py_TYPE(op) against these for type checks.
 * Smalltalk fetches the addresses via the shimTypeAddr user action.
 * Initialized by init_types() called from GciUserActionInit().
 * ==================================================================== */

PyTypeObject PyType_Type;
PyTypeObject PyFloat_Type;
PyTypeObject PyLong_Type;
PyTypeObject PyBool_Type;
PyTypeObject PyUnicode_Type;
PyTypeObject PyBytes_Type;
PyTypeObject PyList_Type;
PyTypeObject PyDict_Type;
PyTypeObject PyTuple_Type;
PyTypeObject PyBaseObject_Type;
PyTypeObject _PyNone_Type;

/* Helper to initialize a type object with common fields */
static void init_type(PyTypeObject *type, const char *name,
                      PyTypeObject *base, unsigned long flags) {
    memset(type, 0, sizeof(PyTypeObject));
    type->ob_base.ob_base.ob_refcnt = 1;
    type->ob_base.ob_base.ob_type = &PyType_Type;
    type->tp_name = name;
    type->tp_base = base;
    type->tp_flags = flags | Py_TPFLAGS_READY;
}

static void init_types(void) {
    init_type(&PyType_Type, "type", &PyBaseObject_Type,
              Py_TPFLAGS_DEFAULT | Py_TPFLAGS_BASETYPE | Py_TPFLAGS_TYPE_SUBCLASS);
    /* PyType_Type's metatype is itself */
    PyType_Type.ob_base.ob_base.ob_type = &PyType_Type;

    init_type(&PyBaseObject_Type, "object", NULL,
              Py_TPFLAGS_DEFAULT | Py_TPFLAGS_BASETYPE);

    init_type(&PyFloat_Type, "float", &PyBaseObject_Type,
              Py_TPFLAGS_DEFAULT | Py_TPFLAGS_BASETYPE);

    init_type(&PyLong_Type, "int", &PyBaseObject_Type,
              Py_TPFLAGS_DEFAULT | Py_TPFLAGS_BASETYPE | Py_TPFLAGS_LONG_SUBCLASS);

    init_type(&PyBool_Type, "bool", &PyLong_Type,
              Py_TPFLAGS_DEFAULT | Py_TPFLAGS_LONG_SUBCLASS);

    init_type(&PyUnicode_Type, "str", &PyBaseObject_Type,
              Py_TPFLAGS_DEFAULT | Py_TPFLAGS_BASETYPE | Py_TPFLAGS_UNICODE_SUBCLASS);

    init_type(&PyBytes_Type, "bytes", &PyBaseObject_Type,
              Py_TPFLAGS_DEFAULT | Py_TPFLAGS_BASETYPE | Py_TPFLAGS_BYTES_SUBCLASS);

    init_type(&PyList_Type, "list", &PyBaseObject_Type,
              Py_TPFLAGS_DEFAULT | Py_TPFLAGS_BASETYPE |
              Py_TPFLAGS_LIST_SUBCLASS | Py_TPFLAGS_SEQUENCE);

    init_type(&PyDict_Type, "dict", &PyBaseObject_Type,
              Py_TPFLAGS_DEFAULT | Py_TPFLAGS_BASETYPE |
              Py_TPFLAGS_DICT_SUBCLASS | Py_TPFLAGS_MAPPING);

    init_type(&PyTuple_Type, "tuple", &PyBaseObject_Type,
              Py_TPFLAGS_DEFAULT | Py_TPFLAGS_BASETYPE |
              Py_TPFLAGS_TUPLE_SUBCLASS | Py_TPFLAGS_SEQUENCE);

    init_type(&_PyNone_Type, "NoneType", &PyBaseObject_Type,
              Py_TPFLAGS_DEFAULT);
}

/* ====================================================================
 * Exception type objects — PyObject* variables matching CPython's ABI
 *
 * Used only for identity comparison (pointer equality) in PyErr_SetString.
 * Each points to a static sentinel; the identity is what matters, not
 * the content.
 * ==================================================================== */

static struct _object _exc_ValueError        = { 1, NULL };
static struct _object _exc_TypeError         = { 1, NULL };
static struct _object _exc_AttributeError    = { 1, NULL };
static struct _object _exc_KeyError          = { 1, NULL };
static struct _object _exc_IndexError        = { 1, NULL };
static struct _object _exc_OverflowError     = { 1, NULL };
static struct _object _exc_ZeroDivisionError = { 1, NULL };
static struct _object _exc_RuntimeError      = { 1, NULL };

PyObject *PyExc_ValueError        = &_exc_ValueError;
PyObject *PyExc_TypeError         = &_exc_TypeError;
PyObject *PyExc_AttributeError    = &_exc_AttributeError;
PyObject *PyExc_KeyError          = &_exc_KeyError;
PyObject *PyExc_IndexError        = &_exc_IndexError;
PyObject *PyExc_OverflowError     = &_exc_OverflowError;
PyObject *PyExc_ZeroDivisionError = &_exc_ZeroDivisionError;
PyObject *PyExc_RuntimeError      = &_exc_RuntimeError;

/* ====================================================================
 * Singleton objects — match CPython's ABI symbol names
 *
 * Extension modules compiled against Python.h reference _Py_NoneStruct,
 * _Py_TrueStruct, _Py_FalseStruct by address. These are the actual
 * PyObject structs that get returned from API functions.
 *
 * shimInit fills in the hidden OOP field at offset 16 so pyobj_oop()
 * can extract the GemStone value.
 * ==================================================================== */

struct _object _Py_NoneStruct  = { 1, &_PyNone_Type };
struct _object _Py_TrueStruct  = { 1, NULL };  /* ob_type set by shimInit */
struct _object _Py_FalseStruct = { 1, NULL };  /* ob_type set by shimInit */

/* _Py_Dealloc — called when refcount hits zero.
   In the shim, object lifetime is managed by GemStone. No-op. */
extern "C" void _Py_Dealloc(PyObject *op) {
    (void)op;
}

/* ====================================================================
 * Error state (single-threaded)
 * ==================================================================== */

static PyObject *current_error_type = NULL;
static char      current_error_msg[1024] = {0};

extern "C" void PyErr_SetString(PyObject *type, const char *message) {
    current_error_type = type;
    strncpy(current_error_msg, message, sizeof(current_error_msg) - 1);
    current_error_msg[sizeof(current_error_msg) - 1] = '\0';
}

extern "C" void PyErr_Format(PyObject *type, const char *format, ...) {
    va_list args;
    current_error_type = type;
    va_start(args, format);
    vsnprintf(current_error_msg, sizeof(current_error_msg), format, args);
    va_end(args);
}

extern "C" PyObject *PyErr_Occurred(void) {
    return current_error_type;
}

extern "C" void PyErr_Clear(void) {
    current_error_type = NULL;
    current_error_msg[0] = '\0';
}

static const char *get_error_type(void) {
    if (current_error_type == PyExc_ValueError)        return "ValueError";
    if (current_error_type == PyExc_TypeError)         return "TypeError";
    if (current_error_type == PyExc_AttributeError)    return "AttributeError";
    if (current_error_type == PyExc_KeyError)          return "KeyError";
    if (current_error_type == PyExc_IndexError)        return "IndexError";
    if (current_error_type == PyExc_OverflowError)     return "OverflowError";
    if (current_error_type == PyExc_ZeroDivisionError) return "ZeroDivisionError";
    if (current_error_type == PyExc_RuntimeError)      return "RuntimeError";
    if (current_error_type != NULL)                    return "UnknownError";
    return NULL;
}

static const char *get_error_message(void) {
    if (current_error_type == NULL) return NULL;
    return current_error_msg;
}

static int has_error(void) {
    return current_error_type != NULL ? 1 : 0;
}

/* ====================================================================
 * Module initialization and method dispatch
 * ==================================================================== */

extern "C" PyObject *PyModuleDef_Init(PyModuleDef *def) {
    return (PyObject *)def;
}

static int find_method(PyObject *module_ptr, const char *name) {
    PyModuleDef *def = (PyModuleDef *)module_ptr;
    PyMethodDef *methods = def->m_methods;
    for (int i = 0; methods[i].ml_name != NULL; i++) {
        if (strcmp(methods[i].ml_name, name) == 0) {
            return i;
        }
    }
    return -1;
}

static PyObject *call_method(PyObject *module_ptr, int method_index,
                             PyObject **args, Py_ssize_t nargs) {
    PyModuleDef *def = (PyModuleDef *)module_ptr;
    PyMethodDef *method = &def->m_methods[method_index];

    if (!method->ml_meth) return NULL;

    typedef PyObject *(*FastCallFunc)(PyObject *, PyObject *const *, Py_ssize_t);
    FastCallFunc func = (FastCallFunc)(void *)method->ml_meth;

    PyErr_Clear();
    return func(module_ptr, (PyObject *const *)args, nargs);
}

/* ====================================================================
 * Buffer cache — materialized C buffers for bytes/strings
 *
 * When C code calls PyBytes_AsString or PyUnicode_AsUTF8, we copy the
 * GemStone bytes into a malloc'd buffer and cache it here. The cache
 * is cleared at the end of each shimCall invocation.
 * ==================================================================== */

#define MAX_BUFFER_CACHE 32

static struct {
    OopType oop;
    char   *buf;
    int64   size;
} buffer_cache[MAX_BUFFER_CACHE];
static int buffer_cache_count = 0;

static void buffer_cache_clear(void) {
    for (int i = 0; i < buffer_cache_count; i++) {
        free(buffer_cache[i].buf);
    }
    buffer_cache_count = 0;
}

static char *buffer_cache_get(OopType oop) {
    for (int i = 0; i < buffer_cache_count; i++) {
        if (buffer_cache[i].oop == oop)
            return buffer_cache[i].buf;
    }
    return NULL;
}

static char *buffer_cache_add(OopType oop, int64 size) {
    char *buf = (char *)malloc((size_t)(size + 1));
    if (!buf) return NULL;
    GciFetchBytes_(oop, 1, (ByteType *)buf, size);
    buf[size] = '\0';
    if (buffer_cache_count < MAX_BUFFER_CACHE) {
        buffer_cache[buffer_cache_count].oop = oop;
        buffer_cache[buffer_cache_count].buf = buf;
        buffer_cache[buffer_cache_count].size = size;
        buffer_cache_count++;
    }
    return buf;
}

/* ====================================================================
 * Helper: check for GCI error after a GciPerform and convert to PyErr.
 * ==================================================================== */

static int check_gci_error(void) {
    GciErrSType errInfo;
    if (GciErr(&errInfo)) {
        PyErr_Format(PyExc_RuntimeError, "%s", errInfo.message);
        return 1;
    }
    return 0;
}

/* ====================================================================
 * CPython API implementations — Float
 * ==================================================================== */

extern "C" PyObject *PyFloat_FromDouble(double v) {
    OopType arg = GciFltToOop(v);
    return addr_to_pyobj(GciPerform(server, "PyFloat_FromDouble:", &arg, 1));
}

extern "C" double PyFloat_AsDouble(PyObject *obj) {
    return GciOopToFlt(pyobj_oop(obj));
}

extern "C" int PyFloat_Check(PyObject *obj) {
    return Py_TYPE(obj) == &PyFloat_Type;
}

/* ====================================================================
 * CPython API implementations — Integer
 * ==================================================================== */

extern "C" PyObject *PyLong_FromSsize_t(Py_ssize_t v) {
    OopType arg = GciI64ToOop((int64)v);
    return addr_to_pyobj(GciPerform(server, "PyLong_FromSsize_t:", &arg, 1));
}

extern "C" PyObject *PyLong_FromLong(long v) {
    OopType arg = GciI64ToOop((int64)v);
    return addr_to_pyobj(GciPerform(server, "PyLong_FromSsize_t:", &arg, 1));
}

extern "C" Py_ssize_t PyLong_AsSsize_t(PyObject *obj) {
    return (Py_ssize_t)GciOopToI64(pyobj_oop(obj));
}

extern "C" long PyLong_AsLong(PyObject *obj) {
    return (long)GciOopToI64(pyobj_oop(obj));
}

extern "C" int PyLong_Check(PyObject *obj) {
    return Py_TYPE(obj) == &PyLong_Type;
}

/* ====================================================================
 * CPython API implementations — Bool
 * ==================================================================== */

extern "C" int PyObject_IsTrue(PyObject *obj) {
    OopType oop = pyobj_oop(obj);
    if (oop == OOP_NIL || oop == OOP_FALSE)
        return 0;
    /* SmallInteger 0 is false */
    if ((oop & OOP_RAM_TAG_MASK) == OOP_TAG_SMALLINT && GciOopToI64(oop) == 0)
        return 0;
    return 1;
}

extern "C" PyObject *PyBool_FromLong(long v) {
    return v ? Py_True : Py_False;
}

/* ====================================================================
 * CPython API implementations — String (Unicode)
 * ==================================================================== */

extern "C" PyObject *PyUnicode_FromString(const char *str) {
    OopType arg = GciNewString(str);
    return addr_to_pyobj(GciPerform(server, "PyUnicode_FromString:", &arg, 1));
}

extern "C" const char *PyUnicode_AsUTF8(PyObject *obj) {
    OopType oop = pyobj_oop(obj);
    char *cached = buffer_cache_get(oop);
    if (cached) return cached;
    int64 size = GciFetchSize_(oop);
    return buffer_cache_add(oop, size);
}

extern "C" int PyUnicode_Check(PyObject *obj) {
    return Py_TYPE(obj) == &PyUnicode_Type;
}

/* ====================================================================
 * CPython API implementations — Bytes
 * ==================================================================== */

extern "C" PyObject *PyBytes_FromStringAndSize(const char *data, Py_ssize_t len) {
    /* GciCreateByteObj is not available inside user actions.
       Create the ByteArray via GciPerform(ByteArray, "new:", size),
       then copy data into it with GciStoreBytes. */
    OopType sizeOop = GciI64ToOop((int64)len);
    OopType oop = GciPerform(OOP_CLASS_BYTE_ARRAY, "new:", &sizeOop, 1);
    if (len > 0) {
        GciStoreBytes(oop, 1, (const ByteType *)data, (int64)len);
    }
    return addr_to_pyobj(GciPerform(server, "PyBytes_FromStringAndSize:", &oop, 1));
}

extern "C" char *PyBytes_AsString(PyObject *obj) {
    OopType oop = pyobj_oop(obj);
    char *cached = buffer_cache_get(oop);
    if (cached) return cached;
    int64 size = GciFetchSize_(oop);
    return buffer_cache_add(oop, size);
}

extern "C" Py_ssize_t PyBytes_Size(PyObject *obj) {
    return (Py_ssize_t)GciFetchSize_(pyobj_oop(obj));
}

extern "C" int PyBytes_Check(PyObject *obj) {
    return Py_TYPE(obj) == &PyBytes_Type;
}

/* ====================================================================
 * CPython API implementations — List (backed by OrderedCollection)
 * ==================================================================== */

extern "C" PyObject *PyList_New(Py_ssize_t len) {
    OopType arg = GciI64ToOop((int64)len);
    return addr_to_pyobj(GciPerform(server, "PyList_New:", &arg, 1));
}

extern "C" int PyList_Append(PyObject *list, PyObject *item) {
    OopType args[2] = { pyobj_oop(list), pyobj_oop(item) };
    GciPerform(server, "PyList_Append:item:", args, 2);
    return 0;
}

extern "C" PyObject *PyList_GetItem(PyObject *list, Py_ssize_t index) {
    OopType args[2] = { pyobj_oop(list), GciI64ToOop((int64)index) };
    return addr_to_pyobj(GciPerform(server, "PyList_GetItem:at:", args, 2));
}

extern "C" int PyList_SetItem(PyObject *list, Py_ssize_t index, PyObject *item) {
    OopType args[3] = { pyobj_oop(list), GciI64ToOop((int64)index), pyobj_oop(item) };
    GciPerform(server, "PyList_SetItem:at:put:", args, 3);
    return 0;
}

extern "C" int PyList_Insert(PyObject *list, Py_ssize_t index, PyObject *item) {
    OopType args[3] = { pyobj_oop(list), GciI64ToOop((int64)index), pyobj_oop(item) };
    GciPerform(server, "PyList_Insert:at:item:", args, 3);
    return 0;
}

extern "C" int PyList_SetSlice(PyObject *list, Py_ssize_t lo, Py_ssize_t hi,
                               PyObject *itemlist) {
    OopType args[4] = {
        pyobj_oop(list),
        GciI64ToOop((int64)lo),
        GciI64ToOop((int64)hi),
        itemlist ? pyobj_oop(itemlist) : OOP_NIL
    };
    GciPerform(server, "PyList_SetSlice:from:to:with:", args, 4);
    if (check_gci_error()) return -1;
    return 0;
}

extern "C" Py_ssize_t PyList_Size(PyObject *list) {
    OopType arg = pyobj_oop(list);
    return (Py_ssize_t)GciOopToI64(GciPerform(server, "PyList_Size:", &arg, 1));
}

extern "C" int PyList_Check(PyObject *obj) {
    return Py_TYPE(obj) == &PyList_Type;
}

/* ====================================================================
 * CPython API implementations — Dict (backed by KeyValueDictionary)
 * ==================================================================== */

extern "C" PyObject *PyDict_New(void) {
    return addr_to_pyobj(GciPerform(server, "PyDict_New", NULL, 0));
}

extern "C" int PyDict_SetItem(PyObject *dict, PyObject *key, PyObject *value) {
    OopType args[3] = { pyobj_oop(dict), pyobj_oop(key), pyobj_oop(value) };
    GciPerform(server, "PyDict_SetItem:key:value:", args, 3);
    return 0;
}

extern "C" int PyDict_SetItemString(PyObject *dict, const char *key, PyObject *value) {
    OopType args[3] = { pyobj_oop(dict), GciNewString(key), pyobj_oop(value) };
    GciPerform(server, "PyDict_SetItemString:key:value:", args, 3);
    return 0;
}

extern "C" PyObject *PyDict_GetItem(PyObject *dict, PyObject *key) {
    OopType args[2] = { pyobj_oop(dict), pyobj_oop(key) };
    OopType addrOop = GciPerform(server, "PyDict_GetItem:key:", args, 2);
    int64 addr = GciOopToI64(addrOop);
    if (addr == 0) return NULL;
    return (PyObject *)(intptr_t)addr;
}

extern "C" PyObject *PyDict_GetItemString(PyObject *dict, const char *key) {
    OopType args[2] = { pyobj_oop(dict), GciNewString(key) };
    OopType addrOop = GciPerform(server, "PyDict_GetItemString:key:", args, 2);
    int64 addr = GciOopToI64(addrOop);
    if (addr == 0) return NULL;
    return (PyObject *)(intptr_t)addr;
}

extern "C" int PyDict_Contains(PyObject *dict, PyObject *key) {
    OopType args[2] = { pyobj_oop(dict), pyobj_oop(key) };
    return GciPerform(server, "PyDict_Contains:key:", args, 2) == OOP_TRUE ? 1 : 0;
}

extern "C" int PyDict_DelItem(PyObject *dict, PyObject *key) {
    OopType args[2] = { pyobj_oop(dict), pyobj_oop(key) };
    GciPerform(server, "PyDict_DelItem:key:", args, 2);
    return 0;
}

extern "C" Py_ssize_t PyDict_Size(PyObject *dict) {
    OopType arg = pyobj_oop(dict);
    return (Py_ssize_t)GciOopToI64(GciPerform(server, "PyDict_Size:", &arg, 1));
}

extern "C" int PyDict_Check(PyObject *obj) {
    return Py_TYPE(obj) == &PyDict_Type;
}

/* ====================================================================
 * CPython API implementations — Tuple (backed by Array)
 *
 * PyTuple_New creates an Array (mutable during construction).
 * PyTuple_Check accepts both Array and InvariantArray.
 * ==================================================================== */

extern "C" PyObject *PyTuple_New(Py_ssize_t len) {
    OopType arg = GciI64ToOop((int64)len);
    return addr_to_pyobj(GciPerform(server, "PyTuple_New:", &arg, 1));
}

extern "C" int PyTuple_SetItem(PyObject *tuple, Py_ssize_t pos, PyObject *value) {
    OopType args[3] = { pyobj_oop(tuple), GciI64ToOop((int64)pos), pyobj_oop(value) };
    GciPerform(server, "PyTuple_SetItem:at:put:", args, 3);
    return 0;
}

extern "C" PyObject *PyTuple_GetItem(PyObject *tuple, Py_ssize_t pos) {
    OopType args[2] = { pyobj_oop(tuple), GciI64ToOop((int64)pos) };
    return addr_to_pyobj(GciPerform(server, "PyTuple_GetItem:at:", args, 2));
}

extern "C" Py_ssize_t PyTuple_Size(PyObject *tuple) {
    return (Py_ssize_t)GciFetchSize_(pyobj_oop(tuple));
}

extern "C" int PyTuple_Check(PyObject *obj) {
    return Py_TYPE(obj) == &PyTuple_Type;
}

/* ====================================================================
 * CPython API implementations — Object protocol
 *
 * These delegate to the server. All Python-level semantics live in
 * Smalltalk.
 * ==================================================================== */

extern "C" PyObject *PyObject_GetAttrString(PyObject *obj, const char *name) {
    OopType args[2] = { pyobj_oop(obj), GciNewString(name) };
    OopType addrOop = GciPerform(server, "PyObject_GetAttrString:name:", args, 2);
    if (check_gci_error()) return NULL;
    return addr_to_pyobj(addrOop);
}

extern "C" int PyObject_HasAttrString(PyObject *obj, const char *name) {
    OopType args[2] = { pyobj_oop(obj), GciNewString(name) };
    OopType result = GciPerform(server, "PyObject_HasAttrString:name:", args, 2);
    if (check_gci_error()) return 0;
    return result == OOP_TRUE ? 1 : 0;
}

extern "C" PyObject *PyObject_Repr(PyObject *obj) {
    OopType arg = pyobj_oop(obj);
    OopType addrOop = GciPerform(server, "PyObject_Repr:", &arg, 1);
    if (check_gci_error()) return NULL;
    return addr_to_pyobj(addrOop);
}

extern "C" PyObject *PyObject_Str(PyObject *obj) {
    OopType arg = pyobj_oop(obj);
    OopType addrOop = GciPerform(server, "PyObject_Str:", &arg, 1);
    if (check_gci_error()) return NULL;
    return addr_to_pyobj(addrOop);
}

extern "C" Py_ssize_t PyObject_Length(PyObject *obj) {
    OopType arg = pyobj_oop(obj);
    OopType result = GciPerform(server, "PyObject_Length:", &arg, 1);
    if (check_gci_error()) return -1;
    return (Py_ssize_t)GciOopToI64(result);
}

/* ====================================================================
 * CPython API implementations — Rich comparison
 * ==================================================================== */

extern "C" int PyObject_RichCompareBool(PyObject *v, PyObject *w, int op) {
    OopType args[3] = { pyobj_oop(v), pyobj_oop(w), GciI64ToOop((int64)op) };
    OopType result = GciPerform(server,
        "PyObject_RichCompareBool:with:op:", args, 3);
    if (check_gci_error()) return -1;
    return result == OOP_TRUE ? 1 : 0;
}

/* ====================================================================
 * CPython API implementations — Argument parsing
 * ==================================================================== */

extern "C" int PyArg_UnpackTuple(PyObject *args, const char *name,
                                 Py_ssize_t min, Py_ssize_t max, ...) {
    /*
     * In CPython, args is a tuple and this unpacks its elements into
     * variadic PyObject** output pointers. In our shim, METH_FASTCALL
     * extensions don't use this (they get args as an array), but some
     * METH_VARARGS extensions do. We implement it for tuple args.
     */
    Py_ssize_t nargs = PyTuple_Size(args);
    if (nargs < min || nargs > max) {
        PyErr_Format(PyExc_TypeError,
            "%s expected %zd to %zd arguments, got %zd",
            name, min, max, nargs);
        return 0;
    }
    va_list vargs;
    va_start(vargs, max);
    for (Py_ssize_t i = 0; i < nargs; i++) {
        PyObject **out = va_arg(vargs, PyObject **);
        *out = PyTuple_GetItem(args, i);
    }
    va_end(vargs);
    return 1;
}

/* ====================================================================
 * CPython API implementations — Module attributes
 * ==================================================================== */

extern "C" int PyModule_AddObjectRef(PyObject *module, const char *name,
                                     PyObject *value) {
    /* For our shim, modules are just PyModuleDef pointers.
       We don't currently store module attributes. This is a no-op
       that succeeds — extensions use it for constants like __about__. */
    (void)module; (void)name; (void)value;
    return 0;
}

extern "C" int PyModule_Add(PyObject *module, const char *name,
                            PyObject *value) {
    /* Like PyModule_AddObjectRef, but steals a reference to value.
       Since we don't track refcounts meaningfully, same as above. */
    (void)module; (void)name; (void)value;
    return 0;
}

/* ====================================================================
 * Module registry — statically linked extension modules
 * ==================================================================== */

extern "C" PyObject *PyInit__statistics(void);
extern "C" PyObject *PyInit__bisect(void);
extern "C" PyObject *PyInit__crc32c(void);
extern "C" PyObject *PyInit__shimtest(void);
extern "C" PyObject *PyInit__heapq(void);
extern "C" PyObject *PyInit__grail_demo(void);

typedef PyObject *(*ModuleInitFunc)(void);

static struct {
    const char    *name;
    ModuleInitFunc init;
} module_registry[] = {
    { "_statistics",  PyInit__statistics },
    { "_bisect",      PyInit__bisect },
    { "_crc32c",      PyInit__crc32c },
    { "_shimtest",    PyInit__shimtest },
    { "_heapq",       PyInit__heapq },
    { "_grail_demo",  PyInit__grail_demo },
    { NULL,           NULL }
};

/* ====================================================================
 * Module cache
 * ==================================================================== */

#define MAX_MODULES 64

static PyObject *module_cache[MAX_MODULES];
static char      module_names[MAX_MODULES][64];
static int       num_modules = 0;

static PyObject *get_or_load_module(const char *name) {
    /* Check cache */
    for (int i = 0; i < num_modules; i++) {
        if (strcmp(module_names[i], name) == 0)
            return module_cache[i];
    }

    /* Find in registry */
    for (int i = 0; module_registry[i].name != NULL; i++) {
        if (strcmp(module_registry[i].name, name) == 0) {
            PyObject *mod = module_registry[i].init();
            if (mod && num_modules < MAX_MODULES) {
                strncpy(module_names[num_modules], name, 63);
                module_names[num_modules][63] = '\0';
                module_cache[num_modules] = mod;
                num_modules++;
            }
            return mod;
        }
    }

    return NULL;  /* module not found */
}

/* ====================================================================
 * Helper: fetch a GemStone String OOP into a C buffer
 * ==================================================================== */

static int fetch_string(OopType oop, char *buf, int bufSize) {
    int64 len = GciFetchBytes_(oop, 1, (ByteType *)buf, bufSize - 1);
    buf[len] = '\0';
    return (int)len;
}

/* ====================================================================
 * Helper: raise a GemStone Error from C
 * ==================================================================== */

static void raise_error(const char *message) {
    GciErrSType err;
    err.number = 2101;
    err.argCount = 1;
    err.args[0] = GciNewString(message);
    strncpy(err.message, message, GCI_ERR_STR_SIZE);
    err.message[GCI_ERR_STR_SIZE] = '\0';
    GciRaiseException(&err);
}

/* Check for an error and raise it as a GemStone exception. */
static void check_and_raise_error(void) {
    if (!has_error()) return;

    const char *errType = get_error_type();
    const char *errMsg  = get_error_message();

    char msg[2048];
    snprintf(msg, sizeof(msg), "%s: %s", errType ? errType : "Error",
             errMsg ? errMsg : "unknown error");
    PyErr_Clear();

    raise_error(msg);
}

/* ====================================================================
 * shimCall — the single generic user action
 *
 * Arguments (8 OopType):
 *   mod   — String: module name (e.g. "_statistics")
 *   meth  — String: method name (e.g. "_normal_dist_inv_cdf")
 *   a1–a5 — SmallInteger: CByteArray memory addresses (0 for unused)
 *   flags — SmallInteger: bits 0–2 = nargs (0–5)
 *
 * Returns: the target OOP read from the result PyObject's offset 16
 * ==================================================================== */

static OopType shimCall(OopType modOop, OopType methOop,
                        OopType a1, OopType a2, OopType a3,
                        OopType a4, OopType a5, OopType flagsOop)
{
    char modName[64], methName[64];

    /* 1. Fetch module and method names */
    fetch_string(modOop, modName, sizeof(modName));
    fetch_string(methOop, methName, sizeof(methName));

    /* 2. Load module */
    PyObject *module = get_or_load_module(modName);
    if (!module) {
        char msg[256];
        snprintf(msg, sizeof(msg), "Module not found: %s", modName);
        raise_error(msg);
        return OOP_NIL;
    }

    /* 3. Find method */
    int methIdx = find_method(module, methName);
    if (methIdx < 0) {
        char msg[256];
        snprintf(msg, sizeof(msg), "Method not found: %s.%s", modName, methName);
        raise_error(msg);
        return OOP_NIL;
    }

    /* 4. Decode flags — just nargs */
    int nargs = GciOopToI32(flagsOop) & 0x7;

    /* 5. Convert Integer addresses to PyObject* pointers.
       Unused args are 0 (SmallInteger), which become NULL pointers. */
    PyObject *pyArgs[5] = {
        (PyObject *)(intptr_t)GciOopToI64(a1),
        (PyObject *)(intptr_t)GciOopToI64(a2),
        (PyObject *)(intptr_t)GciOopToI64(a3),
        (PyObject *)(intptr_t)GciOopToI64(a4),
        (PyObject *)(intptr_t)GciOopToI64(a5),
    };

    /* 6. Call the method */
    PyObject *result = call_method(module, methIdx, pyArgs, nargs);

    /* 7. Clear buffer cache (free materialized bytes/string buffers) */
    buffer_cache_clear();

    /* 8. Check for error */
    if (has_error()) {
        check_and_raise_error();
        return OOP_NIL;  /* unreachable if exception raised */
    }

    /* 9. Read target OOP from offset 16 of result PyObject */
    if (!result)
        return OOP_NIL;
    return pyobj_oop(result);
}

/* ====================================================================
 * shimLoadModule — verify a module can be loaded
 * ==================================================================== */

static OopType shimLoadModule(OopType modOop)
{
    char modName[64];
    fetch_string(modOop, modName, sizeof(modName));

    PyObject *module = get_or_load_module(modName);
    if (!module) {
        char msg[256];
        snprintf(msg, sizeof(msg), "Module not found: %s", modName);
        raise_error(msg);
        return OOP_NIL;
    }

    return OOP_TRUE;
}

/* ====================================================================
 * shimInit — called from Smalltalk after library load
 *
 * Receives the CPythonShim server instance and pre-wrapped CByteArray
 * addresses for None, True, False.
 * ==================================================================== */

static OopType shimInit(OopType serverOop, OopType noneAddr,
                        OopType trueAddr, OopType falseAddr)
{
    server = serverOop;

    /* Extract OOPs from the Smalltalk-allocated CByteArray wrappers
       (which have the GemStone OOP at offset 16). */
    none_oop  = *(OopType *)((char *)(intptr_t)GciOopToI64(noneAddr) + 16);
    true_oop  = *(OopType *)((char *)(intptr_t)GciOopToI64(trueAddr) + 16);
    false_oop = *(OopType *)((char *)(intptr_t)GciOopToI64(falseAddr) + 16);

    /* Set type pointers on the static singletons. */
    _Py_TrueStruct.ob_type  = &PyBool_Type;
    _Py_FalseStruct.ob_type = &PyBool_Type;

    return OOP_TRUE;
}

/* ====================================================================
 * shimTypeAddr — return the C address of a named type object
 *
 * Called from Smalltalk to populate the type address dictionary.
 * ==================================================================== */

static OopType shimTypeAddr(OopType nameOop)
{
    char name[64];
    fetch_string(nameOop, name, sizeof(name));

    PyTypeObject *type = NULL;
    if      (strcmp(name, "float")  == 0) type = &PyFloat_Type;
    else if (strcmp(name, "int")    == 0) type = &PyLong_Type;
    else if (strcmp(name, "bool")   == 0) type = &PyBool_Type;
    else if (strcmp(name, "str")    == 0) type = &PyUnicode_Type;
    else if (strcmp(name, "bytes")  == 0) type = &PyBytes_Type;
    else if (strcmp(name, "list")   == 0) type = &PyList_Type;
    else if (strcmp(name, "dict")   == 0) type = &PyDict_Type;
    else if (strcmp(name, "tuple")  == 0) type = &PyTuple_Type;
    else if (strcmp(name, "object") == 0) type = &PyBaseObject_Type;
    else if (strcmp(name, "type")   == 0) type = &PyType_Type;
    else if (strcmp(name, "NoneType") == 0) type = &_PyNone_Type;

    if (!type) return GciI64ToOop(0);
    return GciI64ToOop((int64)(intptr_t)type);
}

/* ====================================================================
 * GCI User Action registration
 * ==================================================================== */

/* ====================================================================
 * Type creation API stubs
 * ==================================================================== */

extern "C" int PyType_Ready(PyTypeObject *type) {
    /* In real CPython, this resolves bases, populates tp_dict, etc.
       For our shim, just set the READY flag and default base. */
    if (type->tp_base == NULL && type != &PyBaseObject_Type)
        type->tp_base = &PyBaseObject_Type;
    type->tp_flags |= Py_TPFLAGS_READY;
    type->ob_base.ob_base.ob_refcnt = 1;
    type->ob_base.ob_base.ob_type = &PyType_Type;
    return 0;
}

extern "C" PyObject *PyType_GenericNew(PyTypeObject *type, PyObject *args,
                                       PyObject *kwds) {
    (void)type; (void)args; (void)kwds;
    /* Stub — real implementation would allocate an instance. */
    return NULL;
}

extern "C" PyObject *PyType_GenericAlloc(PyTypeObject *type,
                                         Py_ssize_t nitems) {
    (void)type; (void)nitems;
    return NULL;
}

extern "C" PyObject *PyType_FromSpec(PyType_Spec *spec) {
    (void)spec;
    return NULL;
}

extern "C" PyObject *PyType_FromSpecWithBases(PyType_Spec *spec,
                                              PyObject *bases) {
    (void)spec; (void)bases;
    return NULL;
}

extern "C" void *PyType_GetSlot(PyTypeObject *type, int slot) {
    (void)type; (void)slot;
    return NULL;
}

/* ====================================================================
 * shimDynLoad — dynamically load a .so extension module
 *
 * Arguments (2 OopType):
 *   pathOop — String: absolute path to the .so file
 *   nameOop — String: module name (e.g. "_grail_demo")
 *
 * Returns: an Array of method name Strings (the module's method table)
 * ==================================================================== */

static OopType shimDynLoad(OopType pathOop, OopType nameOop)
{
    char path[512], name[64];
    fetch_string(pathOop, path, sizeof(path));
    fetch_string(nameOop, name, sizeof(name));

    /* Check if already cached */
    for (int i = 0; i < num_modules; i++) {
        if (strcmp(module_names[i], name) == 0) {
            /* Already loaded — just return the method names */
            PyModuleDef *def = (PyModuleDef *)module_cache[i];
            PyMethodDef *methods = def->m_methods;
            int count = 0;
            while (methods[count].ml_name) count++;
            OopType sizeOop = GciI64ToOop((int64)count);
            OopType arr = GciPerform(OOP_CLASS_ARRAY, "new:", &sizeOop, 1);
            for (int j = 0; j < count; j++) {
                OopType nameStr = GciNewString(methods[j].ml_name);
                GciStoreOop(arr, j + 1, nameStr);
            }
            return arr;
        }
    }

    /* dlopen the .so */
    void *handle = dlopen(path, RTLD_NOW | RTLD_GLOBAL);
    if (!handle) {
        char msg[1024];
        snprintf(msg, sizeof(msg), "dlopen failed: %s", dlerror());
        raise_error(msg);
        return OOP_NIL;
    }

    /* Look for PyInit_{name} */
    char initName[128];
    snprintf(initName, sizeof(initName), "PyInit_%s", name);
    ModuleInitFunc initFunc = (ModuleInitFunc)dlsym(handle, initName);
    if (!initFunc) {
        char msg[256];
        snprintf(msg, sizeof(msg), "Symbol not found: %s in %s", initName, path);
        raise_error(msg);
        return OOP_NIL;
    }

    /* Call the init function */
    PyObject *mod = initFunc();
    if (!mod) {
        char msg[256];
        snprintf(msg, sizeof(msg), "Module init failed: %s", name);
        raise_error(msg);
        return OOP_NIL;
    }

    /* Cache the module */
    if (num_modules >= MAX_MODULES) {
        raise_error("Too many loaded modules (increase MAX_MODULES)");
        return OOP_NIL;
    }
    strncpy(module_names[num_modules], name, 63);
    module_names[num_modules][63] = '\0';
    module_cache[num_modules] = mod;
    num_modules++;

    /* Walk the method table and return an Array of method name strings */
    PyModuleDef *def = (PyModuleDef *)mod;
    PyMethodDef *methods = def->m_methods;
    int count = 0;
    while (methods[count].ml_name) count++;

    OopType sizeOop = GciI64ToOop((int64)count);
    OopType arr = GciPerform(OOP_CLASS_ARRAY, "new:", &sizeOop, 1);
    for (int i = 0; i < count; i++) {
        OopType nameStr = GciNewString(methods[i].ml_name);
        GciStoreOop(arr, i + 1, nameStr);
    }
    return arr;
}

/* ====================================================================
 * GCI User Action registration
 * ==================================================================== */

extern "C" void GciUserActionInit(void) {
    server   = OOP_NIL;
    none_oop = 0;
    true_oop = 0;
    false_oop = 0;

    init_types();

    GCI_DECLARE_ACTION("shimCall", shimCall, 8);
    GCI_DECLARE_ACTION("shimLoadModule", shimLoadModule, 1);
    GCI_DECLARE_ACTION("shimInit", shimInit, 4);
    GCI_DECLARE_ACTION("shimTypeAddr", shimTypeAddr, 1);
    GCI_DECLARE_ACTION("shimDynLoad", shimDynLoad, 2);
}

extern "C" void GciUserActionShutdown(void) {
    buffer_cache_clear();
    num_modules = 0;
}
