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
#include <ctype.h>

/* Maximum number of dynamically loaded modules */
#define MAX_MODULES 64

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
static struct _object _exc_DeprecationWarning = { 1, NULL };
static struct _object _exc_FutureWarning     = { 1, NULL };
static struct _object _exc_MemoryError       = { 1, NULL };
static struct _object _exc_StopIteration     = { 1, NULL };
static struct _object _exc_SystemError       = { 1, NULL };
static struct _object _exc_RecursionError    = { 1, NULL };

PyObject *PyExc_ValueError        = &_exc_ValueError;
PyObject *PyExc_TypeError         = &_exc_TypeError;
PyObject *PyExc_AttributeError    = &_exc_AttributeError;
PyObject *PyExc_KeyError          = &_exc_KeyError;
PyObject *PyExc_IndexError        = &_exc_IndexError;
PyObject *PyExc_OverflowError     = &_exc_OverflowError;
PyObject *PyExc_ZeroDivisionError = &_exc_ZeroDivisionError;
PyObject *PyExc_RuntimeError      = &_exc_RuntimeError;
PyObject *PyExc_DeprecationWarning = &_exc_DeprecationWarning;
PyObject *PyExc_FutureWarning     = &_exc_FutureWarning;
PyObject *PyExc_MemoryError       = &_exc_MemoryError;
PyObject *PyExc_StopIteration     = &_exc_StopIteration;
PyObject *PyExc_SystemError       = &_exc_SystemError;
PyObject *PyExc_RecursionError    = &_exc_RecursionError;

/* NotImplemented singleton */
PyObject _Py_NotImplementedStruct = { 1, NULL };

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

extern "C" void PyErr_SetNone(PyObject *type) {
    PyErr_SetString(type, "");
}

extern "C" void PyErr_Fetch(PyObject **ptype, PyObject **pvalue, PyObject **ptb) {
    *ptype = current_error_type;
    /* Create a string object for the message if there is one */
    if (current_error_type && current_error_msg[0]) {
        *pvalue = PyUnicode_FromString(current_error_msg);
    } else {
        *pvalue = NULL;
    }
    *ptb = NULL;
    current_error_type = NULL;
    current_error_msg[0] = '\0';
}

extern "C" void PyErr_Restore(PyObject *type, PyObject *value, PyObject *tb) {
    (void)tb;
    current_error_type = type;
    if (value) {
        const char *msg = PyUnicode_AsUTF8(value);
        if (msg) {
            strncpy(current_error_msg, msg, sizeof(current_error_msg) - 1);
            current_error_msg[sizeof(current_error_msg) - 1] = '\0';
        }
    } else {
        current_error_msg[0] = '\0';
    }
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
    if (current_error_type == PyExc_MemoryError)       return "MemoryError";
    if (current_error_type == PyExc_StopIteration)     return "StopIteration";
    if (current_error_type == PyExc_SystemError)       return "SystemError";
    if (current_error_type == PyExc_RecursionError)    return "RecursionError";
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

/* Helper: pack an array of PyObject* into a GemStone-backed tuple.
   Used for METH_VARARGS dispatch. */
static PyObject *pack_args_as_tuple(PyObject **args, Py_ssize_t nargs) {
    PyObject *tuple = PyTuple_New(nargs);
    if (!tuple) return NULL;
    for (Py_ssize_t i = 0; i < nargs; i++) {
        PyTuple_SetItem(tuple, i, args[i]);
    }
    return tuple;
}

static PyObject *call_method_on(PyObject *self, PyMethodDef *method,
                                PyTypeObject *defining_class,
                                PyObject **args, Py_ssize_t nargs) {
    if (!method->ml_meth) return NULL;

    int flags = method->ml_flags;
    PyErr_Clear();

    if (flags & METH_FASTCALL) {
        if (flags & METH_METHOD) {
            /* METH_METHOD|METH_FASTCALL|METH_KEYWORDS */
            PyCMethod func = (PyCMethod)(void *)method->ml_meth;
            return func(self, defining_class,
                       (PyObject *const *)args, nargs, NULL);
        }
        if (flags & METH_KEYWORDS) {
            /* METH_FASTCALL|METH_KEYWORDS (without METH_METHOD) */
            typedef PyObject *(*FastCallKwFunc)(PyObject *, PyObject *const *,
                                                Py_ssize_t, PyObject *);
            FastCallKwFunc func = (FastCallKwFunc)(void *)method->ml_meth;
            return func(self, (PyObject *const *)args, nargs, NULL);
        }
        /* Plain METH_FASTCALL */
        typedef PyObject *(*FastCallFunc)(PyObject *, PyObject *const *, Py_ssize_t);
        FastCallFunc func = (FastCallFunc)(void *)method->ml_meth;
        return func(self, (PyObject *const *)args, nargs);
    }
    if (flags & METH_VARARGS) {
        PyObject *tuple = pack_args_as_tuple(args, nargs);
        if (!tuple) return NULL;
        if (flags & METH_KEYWORDS) {
            typedef PyObject *(*VarArgsKwFunc)(PyObject *, PyObject *, PyObject *);
            VarArgsKwFunc func = (VarArgsKwFunc)(void *)method->ml_meth;
            return func(self, tuple, NULL);
        }
        PyCFunction func = method->ml_meth;
        return func(self, tuple);
    }
    if (flags & METH_NOARGS) {
        PyCFunction func = method->ml_meth;
        return func(self, NULL);
    }
    if (flags & METH_O) {
        PyCFunction func = method->ml_meth;
        return func(self, nargs > 0 ? args[0] : NULL);
    }

    /* Fallback: treat as METH_FASTCALL */
    typedef PyObject *(*FastCallFunc)(PyObject *, PyObject *const *, Py_ssize_t);
    FastCallFunc func = (FastCallFunc)(void *)method->ml_meth;
    return func(self, (PyObject *const *)args, nargs);
}

static PyObject *call_method(PyObject *module_ptr, int method_index,
                             PyObject **args, Py_ssize_t nargs) {
    PyModuleDef *def = (PyModuleDef *)module_ptr;
    PyMethodDef *method = &def->m_methods[method_index];
    return call_method_on(module_ptr, method, NULL, args, nargs);
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

static void ucs4_cache_clear(void);  /* forward decl */

static void buffer_cache_clear(void) {
    for (int i = 0; i < buffer_cache_count; i++) {
        free(buffer_cache[i].buf);
    }
    buffer_cache_count = 0;
    ucs4_cache_clear();
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
 * CPython API implementations — Module attributes & state
 * ==================================================================== */

/* Module attribute storage — for PyModule_AddIntConstant etc.
   Each module can store up to MAX_MODULE_ATTRS named values. */
#define MAX_MODULE_ATTRS 32

struct ModuleAttr {
    const char *name;
    enum { ATTR_INT, ATTR_STRING, ATTR_OBJECT } type;
    union {
        long   int_val;
        char  *str_val;
        PyObject *obj_val;
    };
};

static struct {
    PyObject      *module;  /* PyModuleDef pointer */
    ModuleAttr     attrs[MAX_MODULE_ATTRS];
    int            attr_count;
} module_attrs[MAX_MODULES];
static int module_attrs_count = 0;

static int find_or_create_module_attrs(PyObject *module) {
    for (int i = 0; i < module_attrs_count; i++) {
        if (module_attrs[i].module == module) return i;
    }
    if (module_attrs_count >= MAX_MODULES) return -1;
    int idx = module_attrs_count++;
    module_attrs[idx].module = module;
    module_attrs[idx].attr_count = 0;
    return idx;
}

extern "C" int PyModule_AddObjectRef(PyObject *module, const char *name,
                                     PyObject *value) {
    int idx = find_or_create_module_attrs(module);
    if (idx < 0) return -1;
    int ai = module_attrs[idx].attr_count;
    if (ai >= MAX_MODULE_ATTRS) return -1;
    module_attrs[idx].attrs[ai].name = name;
    module_attrs[idx].attrs[ai].type = ModuleAttr::ATTR_OBJECT;
    module_attrs[idx].attrs[ai].obj_val = value;
    module_attrs[idx].attr_count++;
    return 0;
}

extern "C" int PyModule_Add(PyObject *module, const char *name,
                            PyObject *value) {
    return PyModule_AddObjectRef(module, name, value);
}

extern "C" int PyModule_AddIntConstant(PyObject *module, const char *name,
                                       long value) {
    int idx = find_or_create_module_attrs(module);
    if (idx < 0) return -1;
    int ai = module_attrs[idx].attr_count;
    if (ai >= MAX_MODULE_ATTRS) return -1;
    module_attrs[idx].attrs[ai].name = name;
    module_attrs[idx].attrs[ai].type = ModuleAttr::ATTR_INT;
    module_attrs[idx].attrs[ai].int_val = value;
    module_attrs[idx].attr_count++;
    return 0;
}

extern "C" int PyModule_AddStringConstant(PyObject *module, const char *name,
                                          const char *value) {
    int idx = find_or_create_module_attrs(module);
    if (idx < 0) return -1;
    int ai = module_attrs[idx].attr_count;
    if (ai >= MAX_MODULE_ATTRS) return -1;
    module_attrs[idx].attrs[ai].name = name;
    module_attrs[idx].attrs[ai].type = ModuleAttr::ATTR_STRING;
    module_attrs[idx].attrs[ai].str_val = strdup(value);
    module_attrs[idx].attr_count++;
    return 0;
}

/* ====================================================================
 * Module state — malloc'd buffer per module, keyed by PyModuleDef*
 * ==================================================================== */

static struct {
    PyModuleDef *def;
    void        *state;
} module_state_table[MAX_MODULES];
static int module_state_count = 0;

extern "C" void *PyModule_GetState(PyObject *module) {
    PyModuleDef *def = (PyModuleDef *)module;
    for (int i = 0; i < module_state_count; i++) {
        if (module_state_table[i].def == def)
            return module_state_table[i].state;
    }
    return NULL;
}

static void *allocate_module_state(PyModuleDef *def) {
    if (def->m_size <= 0) return NULL;
    void *state = calloc(1, (size_t)def->m_size);
    if (module_state_count < MAX_MODULES) {
        module_state_table[module_state_count].def = def;
        module_state_table[module_state_count].state = state;
        module_state_count++;
    }
    return state;
}

/* ====================================================================
 * CPython API — Object allocation for C types
 * ==================================================================== */

extern "C" PyObject *_PyObject_New(PyTypeObject *type) {
    PyObject *obj = (PyObject *)calloc(1, (size_t)type->tp_basicsize);
    if (!obj) return NULL;
    obj->ob_refcnt = 1;
    obj->ob_type = type;
    return obj;
}

extern "C" PyVarObject *_PyObject_NewVar(PyTypeObject *type, Py_ssize_t nitems) {
    size_t size = (size_t)type->tp_basicsize + (size_t)nitems * (size_t)type->tp_itemsize;
    PyVarObject *obj = (PyVarObject *)calloc(1, size);
    if (!obj) return NULL;
    obj->ob_base.ob_refcnt = 1;
    obj->ob_base.ob_type = type;
    obj->ob_size = nitems;
    return obj;
}

extern "C" void PyObject_GC_Track(void *op)   { (void)op; }
extern "C" void PyObject_GC_UnTrack(void *op)  { (void)op; }
extern "C" void PyObject_GC_Del(void *op)      { free(op); }

/* ====================================================================
 * CPython API — Integer (additional)
 * ==================================================================== */

extern "C" PyObject *PyLong_FromUnsignedLong(unsigned long v) {
    return PyLong_FromSsize_t((Py_ssize_t)v);
}

extern "C" unsigned long PyLong_AsUnsignedLong(PyObject *obj) {
    return (unsigned long)GciOopToI64(pyobj_oop(obj));
}

extern "C" int PyIndex_Check(PyObject *obj) {
    return PyLong_Check(obj);
}

extern "C" PyObject *PyNumber_Index(PyObject *obj) {
    if (PyLong_Check(obj)) {
        Py_INCREF(obj);
        return obj;
    }
    PyErr_Format(PyExc_TypeError, "'%.200s' object cannot be interpreted as an integer",
                 Py_TYPE(obj)->tp_name);
    return NULL;
}

extern "C" PyObject *PyLong_FromSize_t(size_t v) {
    return PyLong_FromSsize_t((Py_ssize_t)v);
}

/* ====================================================================
 * CPython API — Unicode (additional)
 * ==================================================================== */

extern "C" Py_ssize_t PyUnicode_GetLength(PyObject *unicode) {
    /* Return the number of Unicode code points.
       For ASCII-only strings, this equals byte length. */
    return _grail_PyUnicode_GET_LENGTH(unicode);
}

/* ====================================================================
 * Unicode UCS-4 conversion cache
 *
 * The SRE engine needs fixed-width character access (PyUnicode_KIND,
 * PyUnicode_DATA). GemStone strings are UTF-8. We decode UTF-8 → UCS-4
 * on demand and cache the result for the duration of the shim call.
 *
 * The cache is cleared at the end of each shimCall (via buffer_cache_clear).
 * ==================================================================== */

#define MAX_UCS4_CACHE 16

static struct {
    OopType oop;
    Py_UCS4 *data;
    Py_ssize_t length;  /* number of code points */
} ucs4_cache[MAX_UCS4_CACHE];
static int ucs4_cache_count = 0;

static void ucs4_cache_clear(void) {
    for (int i = 0; i < ucs4_cache_count; i++) {
        free(ucs4_cache[i].data);
    }
    ucs4_cache_count = 0;
}

/* Decode UTF-8 bytes into UCS-4, returning the number of code points. */
static Py_ssize_t utf8_to_ucs4(const char *utf8, Py_ssize_t byte_len,
                                 Py_UCS4 **out) {
    /* First pass: count code points */
    Py_ssize_t cp_count = 0;
    const unsigned char *p = (const unsigned char *)utf8;
    const unsigned char *end = p + byte_len;
    while (p < end) {
        if (*p < 0x80) { p += 1; }
        else if ((*p & 0xE0) == 0xC0) { p += 2; }
        else if ((*p & 0xF0) == 0xE0) { p += 3; }
        else { p += 4; }
        cp_count++;
    }

    /* Allocate UCS-4 buffer */
    Py_UCS4 *buf = (Py_UCS4 *)malloc((size_t)(cp_count + 1) * sizeof(Py_UCS4));
    if (!buf) { *out = NULL; return 0; }

    /* Second pass: decode */
    p = (const unsigned char *)utf8;
    Py_ssize_t i = 0;
    while (p < end && i < cp_count) {
        if (*p < 0x80) {
            buf[i++] = *p++;
        } else if ((*p & 0xE0) == 0xC0) {
            buf[i++] = ((Py_UCS4)(p[0] & 0x1F) << 6) |
                        (Py_UCS4)(p[1] & 0x3F);
            p += 2;
        } else if ((*p & 0xF0) == 0xE0) {
            buf[i++] = ((Py_UCS4)(p[0] & 0x0F) << 12) |
                       ((Py_UCS4)(p[1] & 0x3F) << 6) |
                        (Py_UCS4)(p[2] & 0x3F);
            p += 3;
        } else {
            buf[i++] = ((Py_UCS4)(p[0] & 0x07) << 18) |
                       ((Py_UCS4)(p[1] & 0x3F) << 12) |
                       ((Py_UCS4)(p[2] & 0x3F) << 6) |
                        (Py_UCS4)(p[3] & 0x3F);
            p += 4;
        }
    }
    buf[i] = 0;  /* null terminate */

    *out = buf;
    return cp_count;
}

/* Get or create cached UCS-4 data for a GemStone string. */
static int get_ucs4_for_string(PyObject *op, Py_UCS4 **data_out,
                                Py_ssize_t *length_out) {
    OopType oop = pyobj_oop(op);

    /* Check cache */
    for (int i = 0; i < ucs4_cache_count; i++) {
        if (ucs4_cache[i].oop == oop) {
            *data_out = ucs4_cache[i].data;
            *length_out = ucs4_cache[i].length;
            return 0;
        }
    }

    /* Fetch UTF-8 bytes */
    int64 byte_len = GciFetchSize_(oop);
    char *utf8 = (char *)malloc((size_t)(byte_len + 1));
    if (!utf8) return -1;
    GciFetchBytes_(oop, 1, (ByteType *)utf8, byte_len);
    utf8[byte_len] = '\0';

    /* Convert to UCS-4 */
    Py_UCS4 *ucs4;
    Py_ssize_t cp_count = utf8_to_ucs4(utf8, (Py_ssize_t)byte_len, &ucs4);
    free(utf8);

    if (!ucs4) return -1;

    /* Cache */
    if (ucs4_cache_count < MAX_UCS4_CACHE) {
        ucs4_cache[ucs4_cache_count].oop = oop;
        ucs4_cache[ucs4_cache_count].data = ucs4;
        ucs4_cache[ucs4_cache_count].length = cp_count;
        ucs4_cache_count++;
    }

    *data_out = ucs4;
    *length_out = cp_count;
    return 0;
}

extern "C" Py_ssize_t _grail_PyUnicode_GET_LENGTH(PyObject *op) {
    Py_UCS4 *data;
    Py_ssize_t length;
    if (get_ucs4_for_string(op, &data, &length) < 0)
        return 0;
    return length;
}

extern "C" int _grail_PyUnicode_KIND(PyObject *op) {
    (void)op;
    /* All Grail strings are decoded to UCS-4 (4 bytes per character) */
    return PyUnicode_4BYTE_KIND;
}

extern "C" void *_grail_PyUnicode_DATA(PyObject *op) {
    Py_UCS4 *data;
    Py_ssize_t length;
    if (get_ucs4_for_string(op, &data, &length) < 0)
        return NULL;
    return (void *)data;
}

extern "C" PyObject *PyUnicode_FromStringAndSize(const char *str, Py_ssize_t len) {
    /* Create a GemStone String of the given length */
    OopType sizeOop = GciI64ToOop((int64)len);
    OopType oop = GciPerform(OOP_CLASS_STRING, "new:", &sizeOop, 1);
    if (len > 0) {
        GciStoreBytes(oop, 1, (const ByteType *)str, (int64)len);
    }
    return addr_to_pyobj(GciPerform(server, "PyUnicode_FromString:", &oop, 1));
}

extern "C" PyObject *PyUnicode_Substring(PyObject *str, Py_ssize_t start,
                                         Py_ssize_t end) {
    /* Extract a substring. For simplicity, delegate to Smalltalk. */
    OopType args[3] = {
        pyobj_oop(str),
        GciI64ToOop((int64)start),
        GciI64ToOop((int64)end)
    };
    return addr_to_pyobj(GciPerform(server, "PyUnicode_Substring:from:to:", args, 3));
}

/* ====================================================================
 * CPython API — Tuple (additional)
 * ==================================================================== */

extern "C" PyObject *PyTuple_Pack(Py_ssize_t n, ...) {
    PyObject *tuple = PyTuple_New(n);
    if (!tuple) return NULL;
    va_list vargs;
    va_start(vargs, n);
    for (Py_ssize_t i = 0; i < n; i++) {
        PyObject *item = va_arg(vargs, PyObject *);
        PyTuple_SetItem(tuple, i, item);
    }
    va_end(vargs);
    return tuple;
}

/* ====================================================================
 * CPython API — Sequence protocol
 * ==================================================================== */

extern "C" PyObject *PySequence_GetItem(PyObject *seq, Py_ssize_t i) {
    if (PyList_Check(seq)) return PyList_GetItem(seq, i);
    if (PyTuple_Check(seq)) return PyTuple_GetItem(seq, i);
    OopType args[2] = { pyobj_oop(seq), GciI64ToOop((int64)i) };
    return addr_to_pyobj(GciPerform(server, "PySequence_GetItem:at:", args, 2));
}

extern "C" Py_ssize_t PySequence_Length(PyObject *seq) {
    return PyObject_Length(seq);
}

/* ====================================================================
 * CPython API — Object protocol (additional)
 * ==================================================================== */

extern "C" PyObject *PyObject_GetItem(PyObject *obj, PyObject *key) {
    OopType args[2] = { pyobj_oop(obj), pyobj_oop(key) };
    OopType result = GciPerform(server, "PyObject_GetItem:key:", args, 2);
    if (check_gci_error()) return NULL;
    return addr_to_pyobj(result);
}

extern "C" int PyObject_SetItem(PyObject *obj, PyObject *key, PyObject *value) {
    OopType args[3] = { pyobj_oop(obj), pyobj_oop(key), pyobj_oop(value) };
    GciPerform(server, "PyObject_SetItem:key:value:", args, 3);
    if (check_gci_error()) return -1;
    return 0;
}

extern "C" PyObject *PyObject_Call(PyObject *callable, PyObject *args,
                                    PyObject *kwargs) {
    /* Minimal: call with tuple args, ignore kwargs for now */
    (void)kwargs;
    OopType cargs[2] = { pyobj_oop(callable), args ? pyobj_oop(args) : OOP_NIL };
    OopType result = GciPerform(server, "PyObject_Call:args:", cargs, 2);
    if (check_gci_error()) return NULL;
    return addr_to_pyobj(result);
}

extern "C" PyObject *PyObject_CallOneArg(PyObject *callable, PyObject *arg) {
    PyObject *args = PyTuple_Pack(1, arg);
    if (!args) return NULL;
    return PyObject_Call(callable, args, NULL);
}

extern "C" int PyObject_SetAttrString(PyObject *obj, const char *name,
                                       PyObject *value) {
    OopType args[3] = { pyobj_oop(obj), GciNewString(name), pyobj_oop(value) };
    GciPerform(server, "PyObject_SetAttrString:name:value:", args, 3);
    if (check_gci_error()) return -1;
    return 0;
}

extern "C" int PyCallable_Check(PyObject *obj) {
    (void)obj;
    /* Simplified: assume all objects might be callable. */
    return 1;
}

extern "C" PyObject *PyObject_RichCompare(PyObject *v, PyObject *w, int op) {
    OopType args[3] = { pyobj_oop(v), pyobj_oop(w), GciI64ToOop((int64)op) };
    OopType result = GciPerform(server, "PyObject_RichCompare:with:op:", args, 3);
    if (check_gci_error()) return NULL;
    return addr_to_pyobj(result);
}

extern "C" PyObject *PyObject_Type(PyObject *obj) {
    /* Return the type as a PyObject*. For our shim, return the ob_type. */
    return (PyObject *)Py_TYPE(obj);
}

/* ====================================================================
 * CPython API — Slice
 * ==================================================================== */

extern "C" PyObject *PySlice_New(PyObject *start, PyObject *stop, PyObject *step) {
    (void)start; (void)stop; (void)step;
    /* Stub — _sre doesn't actually call this */
    PyErr_SetString(PyExc_RuntimeError, "PySlice_New not implemented");
    return NULL;
}

extern "C" int PySlice_Unpack(PyObject *slice, Py_ssize_t *start,
                               Py_ssize_t *stop, Py_ssize_t *step) {
    (void)slice; (void)start; (void)stop; (void)step;
    PyErr_SetString(PyExc_RuntimeError, "PySlice_Unpack not implemented");
    return -1;
}

extern "C" Py_ssize_t PySlice_AdjustIndices(Py_ssize_t length, Py_ssize_t *start,
                                             Py_ssize_t *stop, Py_ssize_t step) {
    (void)length; (void)start; (void)stop; (void)step;
    return 0;
}

/* ====================================================================
 * CPython API — Buffer protocol
 * ==================================================================== */

extern "C" int PyObject_CheckBuffer(PyObject *obj) {
    return PyBytes_Check(obj) || PyUnicode_Check(obj);
}

extern "C" int PyObject_GetBuffer(PyObject *obj, Py_buffer *view, int flags) {
    (void)flags;
    memset(view, 0, sizeof(Py_buffer));
    view->obj = obj;

    if (PyBytes_Check(obj)) {
        view->buf = PyBytes_AsString(obj);
        view->len = PyBytes_Size(obj);
        view->itemsize = 1;
        view->readonly = 1;
        return 0;
    }
    if (PyUnicode_Check(obj)) {
        /* Return the raw UTF-8 bytes */
        view->buf = (void *)PyUnicode_AsUTF8(obj);
        view->len = PyUnicode_GetLength(obj);
        view->itemsize = 1;
        view->readonly = 1;
        return 0;
    }
    PyErr_Format(PyExc_TypeError, "a bytes-like object is required, not '%.200s'",
                 Py_TYPE(obj)->tp_name);
    return -1;
}

extern "C" void PyBuffer_Release(Py_buffer *view) {
    /* Buffer memory is managed by the buffer cache — don't free here */
    memset(view, 0, sizeof(Py_buffer));
}

/* ====================================================================
 * CPython API — Dict (additional)
 * ==================================================================== */

extern "C" int PyDict_Next(PyObject *dict, Py_ssize_t *ppos, PyObject **pkey,
                            PyObject **pvalue) {
    /* Iterate over a GemStone-backed dictionary.
       Delegate to server — it returns an Array { key, value } or nil. */
    OopType args[2] = { pyobj_oop(dict), GciI64ToOop((int64)*ppos) };
    OopType result = GciPerform(server, "PyDict_Next:pos:", args, 2);
    if (check_gci_error()) return 0;
    if (result == OOP_NIL) return 0;

    /* Result is an Array of { key_addr, value_addr, next_pos } */
    OopType keyArr[1] = { GciI64ToOop(1) };
    OopType valArr[1] = { GciI64ToOop(2) };
    OopType nextArr[1] = { GciI64ToOop(3) };
    OopType keyAddr = GciPerform(result, "at:", keyArr, 1);
    OopType valAddr = GciPerform(result, "at:", valArr, 1);
    OopType nextPos = GciPerform(result, "at:", nextArr, 1);

    *pkey = addr_to_pyobj(keyAddr);
    *pvalue = addr_to_pyobj(valAddr);
    *ppos = (Py_ssize_t)GciOopToI64(nextPos);
    return 1;
}

extern "C" PyObject *PyDict_GetItemWithError(PyObject *dict, PyObject *key) {
    return PyDict_GetItem(dict, key);
}

/* ====================================================================
 * CPython API — Argument parsing
 * ==================================================================== */

extern "C" int PyArg_ParseTuple(PyObject *args, const char *format, ...) {
    /* Minimal implementation for _sre's match_group (METH_VARARGS).
       Supports: "O", "n", "On", "OO", "|" for optional args.
       args is a tuple. */
    Py_ssize_t nargs = PyTuple_Size(args);
    va_list vargs;
    va_start(vargs, format);

    const char *f = format;
    Py_ssize_t i = 0;
    int required = 1;

    while (*f) {
        if (*f == '|') { required = 0; f++; continue; }
        if (*f == ':' || *f == ';') break;  /* end of format */

        if (i >= nargs) {
            if (required) {
                va_end(vargs);
                PyErr_SetString(PyExc_TypeError, "not enough arguments");
                return 0;
            }
            break;
        }

        PyObject *item = PyTuple_GetItem(args, i);
        switch (*f) {
            case 'O': {
                PyObject **out = va_arg(vargs, PyObject **);
                *out = item;
                break;
            }
            case 'n': {
                Py_ssize_t *out = va_arg(vargs, Py_ssize_t *);
                *out = PyLong_AsSsize_t(item);
                break;
            }
            case 'i': {
                int *out = va_arg(vargs, int *);
                *out = (int)PyLong_AsLong(item);
                break;
            }
            default:
                va_end(vargs);
                PyErr_Format(PyExc_RuntimeError,
                    "PyArg_ParseTuple: unsupported format char '%c'", *f);
                return 0;
        }
        f++;
        i++;
    }

    va_end(vargs);
    return 1;
}

extern "C" int PyArg_Parse(PyObject *arg, const char *format, ...) {
    /* Minimal: parse a single value */
    va_list vargs;
    va_start(vargs, format);
    const char *f = format;
    while (*f) {
        switch (*f) {
            case 'n': {
                Py_ssize_t *out = va_arg(vargs, Py_ssize_t *);
                *out = PyLong_AsSsize_t(arg);
                break;
            }
            case 'O': {
                PyObject **out = va_arg(vargs, PyObject **);
                *out = arg;
                break;
            }
            default: break;
        }
        f++;
    }
    va_end(vargs);
    return 1;
}

/* ====================================================================
 * CPython API — Warning
 * ==================================================================== */

extern "C" int PyErr_WarnEx(PyObject *category, const char *message,
                             Py_ssize_t level) {
    /* No-op warning — _sre uses this for deprecation warnings */
    (void)category; (void)message; (void)level;
    return 0;
}

/* ====================================================================
 * CPython API — Unicode helpers (for SRE)
 * ==================================================================== */

extern "C" Py_UCS4 _grail_unicode_tolower(Py_UCS4 ch) {
    if (ch < 128) return (Py_UCS4)tolower((int)ch);
    /* For non-ASCII, return unchanged (full Unicode case folding would
       require ICU or a case table). */
    return ch;
}

extern "C" Py_UCS4 _grail_unicode_toupper(Py_UCS4 ch) {
    if (ch < 128) return (Py_UCS4)toupper((int)ch);
    return ch;
}

extern "C" int _grail_unicode_isalnum(Py_UCS4 ch) {
    if (ch < 128) return isalnum((int)ch);
    /* For non-ASCII: treat as alphanumeric if > 127 (rough approximation) */
    return 1;
}

/* ====================================================================
 * CPython API — Misc
 * ==================================================================== */

extern "C" PyObject *Py_GenericAlias(PyObject *origin, PyObject *args) {
    /* Used for __class_getitem__. Return origin unchanged for now. */
    (void)args;
    Py_INCREF(origin);
    return origin;
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
extern "C" PyObject *PyInit__sre(void);

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
    { "_sre",         PyInit__sre },
    { NULL,           NULL }
};

/* ====================================================================
 * Module cache
 * ==================================================================== */

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

                /* Multi-phase init: check for Py_mod_exec slot */
                PyModuleDef *def = (PyModuleDef *)mod;
                if (def->m_slots) {
                    /* Allocate module state if m_size > 0 */
                    if (def->m_size > 0) {
                        allocate_module_state(def);
                    }
                    /* Run Py_mod_exec slots */
                    for (PyModuleDef_Slot *slot = def->m_slots; slot->slot; slot++) {
                        if (slot->slot == Py_mod_exec) {
                            typedef int (*ExecFunc)(PyObject *);
                            ExecFunc exec = (ExecFunc)slot->value;
                            int rc = exec(mod);
                            if (rc != 0) {
                                /* exec failed — remove from cache */
                                num_modules--;
                                return NULL;
                            }
                        }
                    }
                }
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

/* ====================================================================
 * Heap type registry — for types created by PyType_FromSpec
 *
 * Each heap type gets a malloc'd PyTypeObject plus sub-structs for
 * number/sequence/mapping/buffer protocols. We also store the
 * module reference for METH_METHOD dispatch.
 * ==================================================================== */

#define MAX_HEAP_TYPES 32

static struct {
    PyTypeObject       *type;
    PyObject           *module;    /* defining module (for METH_METHOD) */
    PyMappingMethods   *as_mapping;
    PySequenceMethods  *as_sequence;
    PyNumberMethods    *as_number;
    PyBufferProcs      *as_buffer;
} heap_types[MAX_HEAP_TYPES];
static int heap_type_count = 0;

static PyObject *type_from_spec_impl(PyObject *module, PyType_Spec *spec,
                                     PyObject *bases) {
    (void)bases;

    if (heap_type_count >= MAX_HEAP_TYPES) {
        PyErr_SetString(PyExc_RuntimeError, "Too many heap types");
        return NULL;
    }

    /* Allocate the type object */
    PyTypeObject *type = (PyTypeObject *)calloc(1, sizeof(PyTypeObject));
    if (!type) return NULL;

    type->ob_base.ob_base.ob_refcnt = 1;
    type->ob_base.ob_base.ob_type = &PyType_Type;
    type->tp_name = spec->name;
    type->tp_basicsize = spec->basicsize;
    type->tp_itemsize = spec->itemsize;
    type->tp_flags = spec->flags | Py_TPFLAGS_HEAPTYPE | Py_TPFLAGS_READY;
    type->tp_base = &PyBaseObject_Type;

    int idx = heap_type_count++;
    heap_types[idx].type = type;
    heap_types[idx].module = module;
    heap_types[idx].as_mapping = NULL;
    heap_types[idx].as_sequence = NULL;
    heap_types[idx].as_number = NULL;
    heap_types[idx].as_buffer = NULL;

    /* Walk the spec slots and populate the type */
    for (PyType_Slot *slot = spec->slots; slot && slot->slot; slot++) {
        switch (slot->slot) {
            case Py_tp_dealloc:    type->tp_dealloc = (destructor)slot->pfunc; break;
            case Py_tp_repr:       type->tp_repr = (reprfunc)slot->pfunc; break;
            case Py_tp_hash:       type->tp_hash = (hashfunc)slot->pfunc; break;
            case Py_tp_call:       type->tp_call = (ternaryfunc)slot->pfunc; break;
            case Py_tp_str:        type->tp_str = (reprfunc)slot->pfunc; break;
            case Py_tp_getattro:   type->tp_getattro = (getattrofunc)slot->pfunc; break;
            case Py_tp_setattro:   type->tp_setattro = (setattrofunc)slot->pfunc; break;
            case Py_tp_doc:        type->tp_doc = (const char *)slot->pfunc; break;
            case Py_tp_traverse:   type->tp_traverse = (traverseproc)slot->pfunc; break;
            case Py_tp_clear:      type->tp_clear = (inquiry)slot->pfunc; break;
            case Py_tp_richcompare: type->tp_richcompare = (richcmpfunc)slot->pfunc; break;
            case Py_tp_iter:       type->tp_iter = (getiterfunc)slot->pfunc; break;
            case Py_tp_iternext:   type->tp_iternext = (iternextfunc)slot->pfunc; break;
            case Py_tp_methods:    type->tp_methods = (PyMethodDef *)slot->pfunc; break;
            case Py_tp_members:    type->tp_members = (PyMemberDef *)slot->pfunc; break;
            case Py_tp_getset:     type->tp_getset = (PyGetSetDef *)slot->pfunc; break;
            case Py_tp_base:       type->tp_base = (PyTypeObject *)slot->pfunc; break;
            case Py_tp_init:       type->tp_init = (initproc)slot->pfunc; break;
            case Py_tp_alloc:      type->tp_alloc = (allocfunc)slot->pfunc; break;
            case Py_tp_new:        type->tp_new = (newfunc)slot->pfunc; break;
            case Py_tp_free:       type->tp_free = (freefunc)slot->pfunc; break;
            case Py_tp_finalize:   type->tp_finalize = (destructor)slot->pfunc; break;

            /* Mapping protocol slots */
            case Py_mp_length:
            case Py_mp_subscript:
            case Py_mp_ass_subscript: {
                if (!heap_types[idx].as_mapping) {
                    heap_types[idx].as_mapping = (PyMappingMethods *)calloc(1, sizeof(PyMappingMethods));
                    type->tp_as_mapping = heap_types[idx].as_mapping;
                }
                if (slot->slot == Py_mp_length)
                    heap_types[idx].as_mapping->mp_length = (lenfunc)slot->pfunc;
                else if (slot->slot == Py_mp_subscript)
                    heap_types[idx].as_mapping->mp_subscript = (binaryfunc)slot->pfunc;
                else
                    heap_types[idx].as_mapping->mp_ass_subscript = (objobjargproc)slot->pfunc;
                break;
            }

            /* Sequence protocol slots */
            case Py_sq_length:
            case Py_sq_item:
            case Py_sq_contains: {
                if (!heap_types[idx].as_sequence) {
                    heap_types[idx].as_sequence = (PySequenceMethods *)calloc(1, sizeof(PySequenceMethods));
                    type->tp_as_sequence = heap_types[idx].as_sequence;
                }
                if (slot->slot == Py_sq_length)
                    heap_types[idx].as_sequence->sq_length = (lenfunc)slot->pfunc;
                else if (slot->slot == Py_sq_item)
                    heap_types[idx].as_sequence->sq_item = (ssizeargfunc)slot->pfunc;
                else
                    heap_types[idx].as_sequence->sq_contains = (objobjproc)slot->pfunc;
                break;
            }

            /* Buffer protocol slots */
            case Py_bf_getbuffer:
            case Py_bf_releasebuffer: {
                if (!heap_types[idx].as_buffer) {
                    heap_types[idx].as_buffer = (PyBufferProcs *)calloc(1, sizeof(PyBufferProcs));
                    type->tp_as_buffer = heap_types[idx].as_buffer;
                }
                if (slot->slot == Py_bf_getbuffer)
                    heap_types[idx].as_buffer->bf_getbuffer = (getbufferproc)slot->pfunc;
                else
                    heap_types[idx].as_buffer->bf_releasebuffer = (releasebufferproc)slot->pfunc;
                break;
            }

            default:
                /* Ignore unhandled slots */
                break;
        }
    }

    return (PyObject *)type;
}

extern "C" PyObject *PyType_FromSpec(PyType_Spec *spec) {
    return type_from_spec_impl(NULL, spec, NULL);
}

extern "C" PyObject *PyType_FromSpecWithBases(PyType_Spec *spec,
                                              PyObject *bases) {
    return type_from_spec_impl(NULL, spec, bases);
}

extern "C" PyObject *PyType_FromModuleAndSpec(PyObject *module,
                                              PyType_Spec *spec,
                                              PyObject *bases) {
    return type_from_spec_impl(module, spec, bases);
}

extern "C" void *PyType_GetSlot(PyTypeObject *type, int slot) {
    if (!type) return NULL;
    switch (slot) {
        case Py_tp_dealloc:    return (void *)type->tp_dealloc;
        case Py_tp_repr:       return (void *)type->tp_repr;
        case Py_tp_hash:       return (void *)type->tp_hash;
        case Py_tp_call:       return (void *)type->tp_call;
        case Py_tp_str:        return (void *)type->tp_str;
        case Py_tp_getattro:   return (void *)type->tp_getattro;
        case Py_tp_setattro:   return (void *)type->tp_setattro;
        case Py_tp_doc:        return (void *)type->tp_doc;
        case Py_tp_traverse:   return (void *)type->tp_traverse;
        case Py_tp_clear:      return (void *)type->tp_clear;
        case Py_tp_richcompare: return (void *)type->tp_richcompare;
        case Py_tp_iter:       return (void *)type->tp_iter;
        case Py_tp_iternext:   return (void *)type->tp_iternext;
        case Py_tp_methods:    return (void *)type->tp_methods;
        case Py_tp_members:    return (void *)type->tp_members;
        case Py_tp_getset:     return (void *)type->tp_getset;
        case Py_tp_init:       return (void *)type->tp_init;
        case Py_tp_alloc:      return (void *)type->tp_alloc;
        case Py_tp_new:        return (void *)type->tp_new;
        case Py_tp_free:       return (void *)type->tp_free;
        default:               return NULL;
    }
}

extern "C" unsigned long PyType_GetFlags(PyTypeObject *type) {
    return type ? type->tp_flags : 0;
}

extern "C" PyObject *PyType_GetModule(PyTypeObject *type) {
    /* Look up in heap_types registry */
    for (int i = 0; i < heap_type_count; i++) {
        if (heap_types[i].type == type) return heap_types[i].module;
    }
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
 * shimCallTyped — call a method on a C-allocated typed object
 *
 * Arguments (8 OopType):
 *   modOop   — String: module name (e.g. "_sre")
 *   typeOop  — String: type name (e.g. "Pattern", "Match", "Scanner")
 *   methOop  — String: method name (e.g. "match", "group")
 *   selfOop  — SmallInteger: C pointer to the object
 *   a1–a3    — SmallInteger: CByteArray memory addresses or C pointers (0 for unused)
 *   flagsOop — SmallInteger: bits 0–2 = nargs, bit 3 = return C pointer
 * ==================================================================== */

static OopType shimCallTyped(OopType modOop, OopType typeOop, OopType methOop,
                              OopType selfOop, OopType a1, OopType a2,
                              OopType a3, OopType flagsOop)
{
    char modName[64], typeName[64], methName[64];
    fetch_string(modOop, modName, sizeof(modName));
    fetch_string(typeOop, typeName, sizeof(typeName));
    fetch_string(methOop, methName, sizeof(methName));

    int flags = GciOopToI32(flagsOop);
    int nargs = flags & 0x7;
    int returnCPtr = (flags >> 3) & 1;

    /* Find the module */
    PyObject *module = get_or_load_module(modName);
    if (!module) {
        char msg[256];
        snprintf(msg, sizeof(msg), "Module not found: %s", modName);
        raise_error(msg);
        return OOP_NIL;
    }

    /* Find the type — look in module state for the type pointer */
    PyModuleDef *def = (PyModuleDef *)module;
    void *state = NULL;
    if (def->m_size > 0) {
        state = PyModule_GetState(module);
    }

    /* The module state contains PyTypeObject* entries. We search by name. */
    PyTypeObject *targetType = NULL;
    if (state) {
        /* Walk through heap_types to find matching name */
        for (int i = 0; i < heap_type_count; i++) {
            if (heap_types[i].module == module &&
                heap_types[i].type &&
                heap_types[i].type->tp_name) {
                /* Match by short name (after last '.') */
                const char *name = heap_types[i].type->tp_name;
                const char *dot = strrchr(name, '.');
                const char *shortName = dot ? dot + 1 : name;
                if (strcmp(shortName, typeName) == 0) {
                    targetType = heap_types[i].type;
                    break;
                }
            }
        }
    }

    if (!targetType) {
        char msg[256];
        snprintf(msg, sizeof(msg), "Type not found: %s.%s", modName, typeName);
        raise_error(msg);
        return OOP_NIL;
    }

    /* Find the method in the type's tp_methods */
    PyMethodDef *methods = targetType->tp_methods;
    if (!methods) {
        char msg[256];
        snprintf(msg, sizeof(msg), "No methods on type: %s", typeName);
        raise_error(msg);
        return OOP_NIL;
    }

    PyMethodDef *method = NULL;
    for (int i = 0; methods[i].ml_name; i++) {
        if (strcmp(methods[i].ml_name, methName) == 0) {
            method = &methods[i];
            break;
        }
    }

    if (!method) {
        /* Also check tp_getset for getter access */
        PyGetSetDef *getset = targetType->tp_getset;
        if (getset) {
            for (int i = 0; getset[i].name; i++) {
                if (strcmp(getset[i].name, methName) == 0 && getset[i].get) {
                    PyObject *self = (PyObject *)(intptr_t)GciOopToI64(selfOop);
                    PyErr_Clear();
                    PyObject *result = getset[i].get(self, getset[i].closure);

                    buffer_cache_clear();
                    if (has_error()) {
                        check_and_raise_error();
                        return OOP_NIL;
                    }
                    if (!result) return OOP_NIL;
                    if (returnCPtr)
                        return GciI64ToOop((int64)(intptr_t)result);
                    return pyobj_oop(result);
                }
            }
        }

        char msg[256];
        snprintf(msg, sizeof(msg), "Method not found: %s.%s", typeName, methName);
        raise_error(msg);
        return OOP_NIL;
    }

    /* Build self + args */
    PyObject *self = (PyObject *)(intptr_t)GciOopToI64(selfOop);
    PyObject *pyArgs[3] = {
        (PyObject *)(intptr_t)GciOopToI64(a1),
        (PyObject *)(intptr_t)GciOopToI64(a2),
        (PyObject *)(intptr_t)GciOopToI64(a3),
    };

    /* Call the method */
    PyObject *result = call_method_on(self, method, targetType,
                                       pyArgs, nargs);

    /* Clear buffer cache */
    buffer_cache_clear();

    /* Check for error */
    if (has_error()) {
        check_and_raise_error();
        return OOP_NIL;
    }

    if (!result) return OOP_NIL;

    /* Return value: either a C pointer or a GemStone OOP */
    if (returnCPtr)
        return GciI64ToOop((int64)(intptr_t)result);
    return pyobj_oop(result);
}

/* ====================================================================
 * GCI User Action registration
 * ==================================================================== */

/* ====================================================================
 * Additional API stubs for _sre and other extensions
 * ==================================================================== */

/* --- Error handling --- */

PyObject *PyErr_NoMemory(void) {
    PyErr_SetString(PyExc_MemoryError, "");
    return NULL;
}

int PyErr_ExceptionMatches(PyObject *exc) {
    PyObject *current = PyErr_Occurred();
    return current == exc;
}

/* --- Vectorcall protocol --- */

PyObject *PyObject_Vectorcall(PyObject *callable, PyObject *const *args,
                               size_t nargsf, PyObject *kwnames) {
    (void)kwnames;
    Py_ssize_t nargs = (Py_ssize_t)(nargsf & ~(1ULL << 63));
    PyObject *tuple = PyTuple_New(nargs);
    if (!tuple) return NULL;
    for (Py_ssize_t i = 0; i < nargs; i++) {
        Py_INCREF(args[i]);
        PyTuple_SetItem(tuple, i, args[i]);
    }
    PyObject *result = PyObject_Call(callable, tuple, NULL);
    Py_DECREF(tuple);
    return result;
}

/* --- Unicode additional --- */

PyObject *PyUnicode_FromFormat(const char *format, ...) {
    char buf[4096];
    va_list ap;
    va_start(ap, format);
    vsnprintf(buf, sizeof(buf), format, ap);
    va_end(ap);
    return PyUnicode_FromString(buf);
}

PyObject *PyUnicode_Join(PyObject *separator, PyObject *seq) {
    if (!separator || !seq) return NULL;
    Py_ssize_t len = PyList_Size(seq);
    if (len == 0) return PyUnicode_FromString("");

    const char *sep = PyUnicode_AsUTF8(separator);
    if (!sep) return NULL;
    size_t sep_len = strlen(sep);

    size_t bufsize = 256;
    char *buf = (char *)malloc(bufsize);
    if (!buf) { PyErr_NoMemory(); return NULL; }
    size_t pos = 0;

    for (Py_ssize_t i = 0; i < len; i++) {
        if (i > 0) {
            while (pos + sep_len >= bufsize) {
                bufsize *= 2;
                buf = (char *)realloc(buf, bufsize);
                if (!buf) { PyErr_NoMemory(); return NULL; }
            }
            memcpy(buf + pos, sep, sep_len);
            pos += sep_len;
        }
        PyObject *item = PyList_GetItem(seq, i);
        const char *s = PyUnicode_AsUTF8(item);
        if (!s) { free(buf); return NULL; }
        size_t slen = strlen(s);
        while (pos + slen >= bufsize) {
            bufsize *= 2;
            buf = (char *)realloc(buf, bufsize);
            if (!buf) { PyErr_NoMemory(); return NULL; }
        }
        memcpy(buf + pos, s, slen);
        pos += slen;
    }
    buf[pos] = '\0';
    PyObject *result = PyUnicode_FromString(buf);
    free(buf);
    return result;
}

PyObject *_PyUnicode_JoinArray(PyObject *separator, PyObject *const *items,
                                Py_ssize_t seqlen) {
    if (seqlen == 0) return PyUnicode_FromString("");
    if (seqlen == 1) return Py_NewRef(items[0]);

    const char *sep = PyUnicode_AsUTF8(separator);
    if (!sep) return NULL;
    size_t sep_len = strlen(sep);

    size_t bufsize = 256;
    char *buf = (char *)malloc(bufsize);
    if (!buf) { PyErr_NoMemory(); return NULL; }
    size_t pos = 0;

    for (Py_ssize_t i = 0; i < seqlen; i++) {
        if (i > 0 && sep_len > 0) {
            while (pos + sep_len >= bufsize) {
                bufsize *= 2;
                buf = (char *)realloc(buf, bufsize);
                if (!buf) { PyErr_NoMemory(); return NULL; }
            }
            memcpy(buf + pos, sep, sep_len);
            pos += sep_len;
        }
        const char *s = PyUnicode_AsUTF8(items[i]);
        if (!s) { free(buf); return NULL; }
        size_t slen = strlen(s);
        while (pos + slen >= bufsize) {
            bufsize *= 2;
            buf = (char *)realloc(buf, bufsize);
            if (!buf) { PyErr_NoMemory(); return NULL; }
        }
        memcpy(buf + pos, s, slen);
        pos += slen;
    }
    buf[pos] = '\0';
    PyObject *result = PyUnicode_FromString(buf);
    free(buf);
    return result;
}

Py_ssize_t PyUnicode_FindChar(PyObject *str, Py_UCS4 ch,
                               Py_ssize_t start, Py_ssize_t end, int dir) {
    /* Use UCS-4 conversion for correctness */
    Py_ssize_t ulen = _grail_PyUnicode_GET_LENGTH(str);
    Py_UCS4 *data = (Py_UCS4 *)_grail_PyUnicode_DATA(str);
    if (!data) return -2;

    if (start < 0) start = 0;
    if (end > ulen || end < 0) end = ulen;
    if (start >= end) return -1;

    if (dir >= 0) {
        for (Py_ssize_t i = start; i < end; i++) {
            if (data[i] == ch) return i;
        }
    } else {
        for (Py_ssize_t i = end - 1; i >= start; i--) {
            if (data[i] == ch) return i;
        }
    }
    return -1;
}

/* --- Bytes additional --- */

PyObject *PyBytes_FromObject(PyObject *obj) {
    if (PyBytes_Check(obj)) return Py_NewRef(obj);
    Py_buffer buf;
    if (PyObject_GetBuffer(obj, &buf, PyBUF_SIMPLE) == 0) {
        PyObject *result = PyBytes_FromStringAndSize((const char *)buf.buf, buf.len);
        PyBuffer_Release(&buf);
        return result;
    }
    PyErr_Format(PyExc_TypeError, "cannot convert '%.200s' to bytes",
                 Py_TYPE(obj)->tp_name);
    return NULL;
}

PyObject *PyBytes_Join(PyObject *sep, PyObject *iterable) {
    Py_ssize_t len = PyList_Size(iterable);
    if (len == 0) return PyBytes_FromStringAndSize("", 0);

    char *sep_data = PyBytes_AsString(sep);
    Py_ssize_t sep_len = PyBytes_Size(sep);

    Py_ssize_t total = 0;
    for (Py_ssize_t i = 0; i < len; i++) {
        if (i > 0) total += sep_len;
        total += PyBytes_Size(PyList_GetItem(iterable, i));
    }

    char *buf = (char *)malloc(total);
    if (!buf) { PyErr_NoMemory(); return NULL; }

    Py_ssize_t pos = 0;
    for (Py_ssize_t i = 0; i < len; i++) {
        if (i > 0 && sep_len > 0) {
            memcpy(buf + pos, sep_data, sep_len);
            pos += sep_len;
        }
        PyObject *item = PyList_GetItem(iterable, i);
        char *data = PyBytes_AsString(item);
        Py_ssize_t sz = PyBytes_Size(item);
        memcpy(buf + pos, data, sz);
        pos += sz;
    }

    PyObject *result = PyBytes_FromStringAndSize(buf, total);
    free(buf);
    return result;
}

/* --- Import helper --- */

PyObject *_PyImport_GetModuleAttrString(const char *modname,
                                         const char *attrname) {
    OopType modStr = GciNewString(modname);
    OopType attrStr = GciNewString(attrname);
    OopType args[2] = { modStr, attrStr };
    OopType result = GciPerform(server, "importGetAttr:name:", args, 2);
    if (has_error()) {
        check_and_raise_error();
        return NULL;
    }
    return addr_to_pyobj(result);
}

/* --- Py_BuildValue --- */

PyObject *Py_BuildValue(const char *format, ...) {
    va_list ap;
    va_start(ap, format);

    if (strcmp(format, "Nn") == 0) {
        PyObject *obj = va_arg(ap, PyObject *);
        Py_ssize_t n = va_arg(ap, Py_ssize_t);
        va_end(ap);
        PyObject *tuple = PyTuple_New(2);
        if (!tuple) return NULL;
        PyTuple_SetItem(tuple, 0, obj);  /* steals reference */
        PyTuple_SetItem(tuple, 1, PyLong_FromSsize_t(n));
        return tuple;
    }
    if (strcmp(format, "") == 0) {
        va_end(ap);
        return Py_None;
    }

    va_end(ap);
    PyErr_Format(PyExc_SystemError,
                 "Py_BuildValue format '%s' not implemented", format);
    return NULL;
}

/* --- Number protocol --- */

Py_ssize_t PyNumber_AsSsize_t(PyObject *obj, PyObject *exc) {
    (void)exc;
    return PyLong_AsSsize_t(obj);
}

/* --- Object protocol (hash) --- */

Py_hash_t PyObject_Hash(PyObject *obj) {
    OopType oop = pyobj_oop(obj);
    OopType result = GciPerform(oop, "hash", NULL, 0);
    if (has_error()) {
        check_and_raise_error();
        return -1;
    }
    return (Py_hash_t)GciOopToI64(result);
}

Py_hash_t Py_HashBuffer(const void *ptr, Py_ssize_t len) {
    /* FNV-1a hash */
    const unsigned char *p = (const unsigned char *)ptr;
    Py_uhash_t hash = 14695981039346656037ULL;
    for (Py_ssize_t i = 0; i < len; i++) {
        hash ^= p[i];
        hash *= 1099511628211ULL;
    }
    if ((Py_hash_t)hash == -1) hash = (Py_uhash_t)-2;
    return (Py_hash_t)hash;
}

/* --- Dict additional --- */

PyObject *PyDictProxy_New(PyObject *mapping) {
    return Py_NewRef(mapping);
}

/* --- Iterator --- */

PyObject *PyCallIter_New(PyObject *callable, PyObject *sentinel) {
    (void)callable;
    (void)sentinel;
    PyErr_SetString(PyExc_RuntimeError, "PyCallIter_New not yet implemented");
    return NULL;
}

/* ====================================================================
 * GCI User Action registration (keep at end of file)
 * ==================================================================== */

extern "C" void GciUserActionInit(void) {
    server   = OOP_NIL;
    none_oop = 0;
    true_oop = 0;
    false_oop = 0;

    init_types();

    GCI_DECLARE_ACTION("shimCall", shimCall, 8);
    GCI_DECLARE_ACTION("shimCallTyped", shimCallTyped, 8);
    GCI_DECLARE_ACTION("shimLoadModule", shimLoadModule, 1);
    GCI_DECLARE_ACTION("shimInit", shimInit, 4);
    GCI_DECLARE_ACTION("shimTypeAddr", shimTypeAddr, 1);
    GCI_DECLARE_ACTION("shimDynLoad", shimDynLoad, 2);
}

extern "C" void GciUserActionShutdown(void) {
    buffer_cache_clear();
    num_modules = 0;
}
