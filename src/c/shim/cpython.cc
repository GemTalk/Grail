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
    if (obj == NULL)     return none_oop;
    if (obj == Py_None)  return none_oop;
    if (obj == Py_True)  return true_oop;
    if (obj == Py_False) return false_oop;
    return *(OopType *)((char *)obj + 16);
}

/* Convert a SmallInteger OOP (memory address) to a PyObject pointer. */
static inline PyObject *addr_to_pyobj(OopType addrOop) {
    return (PyObject *)(intptr_t)GciOopToI64(addrOop);
}

static int64 oopToLongWithIndex(OopType oop);  /* forward decl */

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
static struct _object _exc_BaseException     = { 1, NULL };
static struct _object _exc_Exception         = { 1, NULL };
static struct _object _exc_LookupError       = { 1, NULL };
static struct _object _exc_ArithmeticError   = { 1, NULL };
static struct _object _exc_NotImplementedError = { 1, NULL };
static struct _object _exc_OSError           = { 1, NULL };
static struct _object _exc_ImportError       = { 1, NULL };
static struct _object _exc_NameError         = { 1, NULL };
static struct _object _exc_StopAsyncIteration = { 1, NULL };
static struct _object _exc_BufferError       = { 1, NULL };
static struct _object _exc_EOFError          = { 1, NULL };
static struct _object _exc_KeyboardInterrupt = { 1, NULL };
static struct _object _exc_UnicodeError      = { 1, NULL };
static struct _object _exc_UnicodeDecodeError = { 1, NULL };
static struct _object _exc_UnicodeEncodeError = { 1, NULL };
static struct _object _exc_RuntimeWarning    = { 1, NULL };
static struct _object _exc_UserWarning       = { 1, NULL };

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
PyObject *PyExc_BaseException     = &_exc_BaseException;
PyObject *PyExc_Exception         = &_exc_Exception;
PyObject *PyExc_LookupError       = &_exc_LookupError;
PyObject *PyExc_ArithmeticError   = &_exc_ArithmeticError;
PyObject *PyExc_NotImplementedError = &_exc_NotImplementedError;
PyObject *PyExc_OSError           = &_exc_OSError;
PyObject *PyExc_IOError           = &_exc_OSError;  /* alias, as in CPython */
PyObject *PyExc_ImportError       = &_exc_ImportError;
PyObject *PyExc_NameError         = &_exc_NameError;
PyObject *PyExc_StopAsyncIteration = &_exc_StopAsyncIteration;
PyObject *PyExc_BufferError       = &_exc_BufferError;
PyObject *PyExc_EOFError          = &_exc_EOFError;
PyObject *PyExc_KeyboardInterrupt = &_exc_KeyboardInterrupt;
PyObject *PyExc_UnicodeError      = &_exc_UnicodeError;
PyObject *PyExc_UnicodeDecodeError = &_exc_UnicodeDecodeError;
PyObject *PyExc_UnicodeEncodeError = &_exc_UnicodeEncodeError;
PyObject *PyExc_RuntimeWarning    = &_exc_RuntimeWarning;
PyObject *PyExc_UserWarning       = &_exc_UserWarning;

/* Exception hierarchy for PyErr_(Given)ExceptionMatches. Each row is
   { child, parent }; matching walks child→parent until NULL. Only the
   relationships extensions actually test for are modeled. */
static PyObject *const exc_parent_table[][2] = {
    { &_exc_KeyError,           &_exc_LookupError },
    { &_exc_IndexError,         &_exc_LookupError },
    { &_exc_OverflowError,      &_exc_ArithmeticError },
    { &_exc_ZeroDivisionError,  &_exc_ArithmeticError },
    { &_exc_RecursionError,     &_exc_RuntimeError },
    { &_exc_NotImplementedError, &_exc_RuntimeError },
    { &_exc_UnicodeDecodeError, &_exc_UnicodeError },
    { &_exc_UnicodeEncodeError, &_exc_UnicodeError },
    { &_exc_UnicodeError,       &_exc_ValueError },
    { &_exc_EOFError,           &_exc_Exception },
    { &_exc_LookupError,        &_exc_Exception },
    { &_exc_ArithmeticError,    &_exc_Exception },
    { &_exc_ValueError,         &_exc_Exception },
    { &_exc_TypeError,          &_exc_Exception },
    { &_exc_AttributeError,     &_exc_Exception },
    { &_exc_RuntimeError,       &_exc_Exception },
    { &_exc_MemoryError,        &_exc_Exception },
    { &_exc_StopIteration,      &_exc_Exception },
    { &_exc_StopAsyncIteration, &_exc_Exception },
    { &_exc_SystemError,        &_exc_Exception },
    { &_exc_OSError,            &_exc_Exception },
    { &_exc_ImportError,        &_exc_Exception },
    { &_exc_NameError,          &_exc_Exception },
    { &_exc_BufferError,        &_exc_Exception },
    { &_exc_Exception,          &_exc_BaseException },
    { &_exc_KeyboardInterrupt,  &_exc_BaseException },
    { NULL, NULL }
};

static PyObject *exc_parent_of(PyObject *exc) {
    for (int i = 0; exc_parent_table[i][0]; i++) {
        if (exc_parent_table[i][0] == exc) return exc_parent_table[i][1];
    }
    return NULL;
}

/* Dynamically created exception types (PyErr_NewException). Each is a
   bare sentinel object plus its dotted name; get_error_type reports the
   part after the last dot so the server raises a sensibly named error. */
#define MAX_DYN_EXCEPTIONS 32

static struct {
    struct _object obj;
    char           name[128];
    PyObject      *base;
} dyn_exceptions[MAX_DYN_EXCEPTIONS];
static int dyn_exception_count = 0;

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
    if (current_error_type == PyExc_BaseException)     return "BaseException";
    if (current_error_type == PyExc_Exception)         return "Exception";
    if (current_error_type == PyExc_LookupError)       return "LookupError";
    if (current_error_type == PyExc_ArithmeticError)   return "ArithmeticError";
    if (current_error_type == PyExc_NotImplementedError) return "NotImplementedError";
    if (current_error_type == PyExc_OSError)           return "OSError";
    if (current_error_type == PyExc_ImportError)       return "ImportError";
    if (current_error_type == PyExc_NameError)         return "NameError";
    if (current_error_type == PyExc_StopAsyncIteration) return "StopAsyncIteration";
    if (current_error_type == PyExc_BufferError)       return "BufferError";
    if (current_error_type == PyExc_EOFError)          return "EOFError";
    if (current_error_type == PyExc_KeyboardInterrupt) return "KeyboardInterrupt";
    if (current_error_type == PyExc_UnicodeError)      return "UnicodeError";
    if (current_error_type == PyExc_UnicodeDecodeError) return "UnicodeDecodeError";
    if (current_error_type == PyExc_UnicodeEncodeError) return "UnicodeEncodeError";
    /* Dynamically created exception types: report the name after the
       last dot ("spam.error" → "error"). */
    for (int i = 0; i < dyn_exception_count; i++) {
        if (current_error_type == (PyObject *)&dyn_exceptions[i].obj) {
            const char *dot = strrchr(dyn_exceptions[i].name, '.');
            return dot ? dot + 1 : dyn_exceptions[i].name;
        }
    }
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

/* Keyword-aware variant. `args` holds npos positionals followed by nkw
   keyword values; `kwnames` is a PyObject tuple of the keyword names
   (the METH_FASTCALL|METH_KEYWORDS vector convention). */
static PyObject *call_method_on_kw(PyObject *self, PyMethodDef *method,
                                   PyTypeObject *defining_class,
                                   PyObject **args, Py_ssize_t npos,
                                   PyObject *kwnames, Py_ssize_t nkw) {
    if (!method->ml_meth) return NULL;

    if (nkw == 0)
        return call_method_on(self, method, defining_class, args, npos);

    int flags = method->ml_flags;
    if (!(flags & METH_KEYWORDS)) {
        PyErr_Format(PyExc_TypeError, "%s() takes no keyword arguments",
                     method->ml_name);
        return NULL;
    }
    PyErr_Clear();

    if (flags & METH_FASTCALL) {
        if (flags & METH_METHOD) {
            PyCMethod func = (PyCMethod)(void *)method->ml_meth;
            return func(self, defining_class,
                        (PyObject *const *)args, npos, kwnames);
        }
        typedef PyObject *(*FastCallKwFunc)(PyObject *, PyObject *const *,
                                            Py_ssize_t, PyObject *);
        FastCallKwFunc func = (FastCallKwFunc)(void *)method->ml_meth;
        return func(self, (PyObject *const *)args, npos, kwnames);
    }
    if (flags & METH_VARARGS) {
        PyObject *tuple = pack_args_as_tuple(args, npos);
        if (!tuple) return NULL;
        PyObject *kwdict = PyDict_New();
        if (!kwdict) return NULL;
        for (Py_ssize_t i = 0; i < nkw; i++) {
            PyObject *name = PyTuple_GetItem(kwnames, i);
            if (PyDict_SetItem(kwdict, name, args[npos + i]) < 0)
                return NULL;
        }
        typedef PyObject *(*VarArgsKwFunc)(PyObject *, PyObject *, PyObject *);
        VarArgsKwFunc func = (VarArgsKwFunc)(void *)method->ml_meth;
        return func(self, tuple, kwdict);
    }

    PyErr_Format(PyExc_TypeError,
                 "%s() has METH_KEYWORDS but no recognized calling convention",
                 method->ml_name);
    return NULL;
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
    if (obj == NULL) {
        PyErr_BadArgument();
        return -1.0;
    }
    OopType oop = pyobj_oop(obj);
    /* CPython accepts ints (and __index__-able wrappers) here too. */
    if (GCI_OOP_IS_SMALL_INT(oop))
        return (double)GciOopToI64(oop);
    if (Py_TYPE(obj) != NULL &&
        (Py_TYPE(obj)->tp_flags & Py_TPFLAGS_LONG_SUBCLASS))
        return (double)oopToLongWithIndex(oop);
    return GciOopToFlt(oop);
}

extern "C" int PyFloat_Check(PyObject *obj) {
    return obj != NULL && Py_TYPE(obj) == &PyFloat_Type;
}

/* ====================================================================
 * CPython API implementations — Integer
 * ==================================================================== */

extern "C" PyObject *PyLong_FromSsize_t(Py_ssize_t v) {
    OopType arg = GciI64ToOop(v);
    return addr_to_pyobj(GciPerform(server, "PyLong_FromSsize_t:", &arg, 1));
}

extern "C" PyObject *PyLong_FromLong(long v) {
    OopType arg = GciI64ToOop(v);
    return addr_to_pyobj(GciPerform(server, "PyLong_FromSsize_t:", &arg, 1));
}

/* Extract a 64-bit signed integer value from a Smalltalk OOP.
 *
 * Fast path: a tagged SmallInteger is unboxed in-place by GciOopToI64.
 *
 * Slow path: a non-SmallInteger OOP (a heap object — e.g.
 * NamedIntConstant wrapping an opcode) is sent ``__index__`` in
 * env 1, which is the Python contract for "I am conceptually an
 * integer" (PEP 357).  The returned OOP is expected to be a
 * SmallInteger; we unbox it the fast way.
 *
 * Centralising the wrapper-awareness here keeps every call site in
 * the rest of the shim (and inside _sre/sre.c) ignorant of the
 * wrapper class — they continue to call PyLong_AsLong /
 * PyLong_AsSsize_t / PyLong_AsUnsignedLong as if the OOP were
 * always a plain SmallInteger. */
static int64 oopToLongWithIndex(OopType oop) {
    if (GCI_OOP_IS_SMALL_INT(oop)) {
        return GciOopToI64(oop);
    }
    OopType indexed = GciPerform_(oop, "__index__", NULL, 0, 1);
    return GciOopToI64(indexed);
}

extern "C" Py_ssize_t PyLong_AsSsize_t(PyObject *obj) {
    if (obj == NULL) return 0;
    return (Py_ssize_t)oopToLongWithIndex(pyobj_oop(obj));
}

extern "C" long PyLong_AsLong(PyObject *obj) {
    if (obj == NULL) return -1;
    return (long)oopToLongWithIndex(pyobj_oop(obj));
}

/* Subclass-aware check: CPython's PyXxx_Check tests tp_flags subclass
   bits so bool passes PyLong_Check and heap-type subclasses pass too. */
static inline int type_flag_check(PyObject *obj, unsigned long flag) {
    return obj != NULL && Py_TYPE(obj) != NULL &&
           (Py_TYPE(obj)->tp_flags & flag) != 0;
}

extern "C" int PyLong_Check(PyObject *obj) {
    return type_flag_check(obj, Py_TPFLAGS_LONG_SUBCLASS);
}

extern "C" int PyBool_Check(PyObject *obj) {
    return obj != NULL &&
           (obj == Py_True || obj == Py_False || Py_TYPE(obj) == &PyBool_Type);
}

/* ====================================================================
 * CPython API implementations — Bool
 * ==================================================================== */

extern "C" int PyObject_IsTrue(PyObject *obj) {
    if (obj == NULL) return 0;
    if (obj == Py_None || obj == Py_False) return 0;
    OopType oop = pyobj_oop(obj);
    if (oop == OOP_NIL || oop == OOP_FALSE)
        return 0;
    /* SmallInteger 0 is false */
    if ((oop & OOP_RAM_TAG_MASK) == OOP_TAG_SMALLINT && GciOopToI64(oop) == 0)
        return 0;
    /* Empty containers and empty strings are falsy. Byte-format objects
       (str/bytes) answer their size directly; list/dict sizes come from
       the server. SmallDouble 0.0 is also falsy. */
    PyTypeObject *t = Py_TYPE(obj);
    if (t == &PyUnicode_Type || t == &PyBytes_Type || t == &PyTuple_Type)
        return GciFetchSize_(oop) != 0;
    if (t == &PyList_Type)
        return PyList_Size(obj) != 0;
    if (t == &PyDict_Type)
        return PyDict_Size(obj) != 0;
    if (t == &PyFloat_Type)
        return GciOopToFlt(oop) != 0.0;
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
    if (obj == NULL) return NULL;
    OopType oop = pyobj_oop(obj);
    char *cached = buffer_cache_get(oop);
    if (cached) return cached;
    int64 size = GciFetchSize_(oop);
    return buffer_cache_add(oop, size);
}

extern "C" int PyUnicode_Check(PyObject *obj) {
    return type_flag_check(obj, Py_TPFLAGS_UNICODE_SUBCLASS);
}

/* ====================================================================
 * CPython API implementations — Bytes
 * ==================================================================== */

extern "C" PyObject *PyBytes_FromStringAndSize(const char *data, Py_ssize_t len) {
    /* GciCreateByteObj is not available inside user actions.
       Create the ByteArray via GciPerform(ByteArray, "new:", size),
       then copy data into it with GciStoreBytes. */
    OopType sizeOop = GciI64ToOop(len);
    OopType oop = GciPerform(OOP_CLASS_BYTE_ARRAY, "new:", &sizeOop, 1);
    if (len > 0) {
        GciStoreBytes(oop, 1, (const ByteType *)data, (int64)len);
    }
    return addr_to_pyobj(GciPerform(server, "PyBytes_FromStringAndSize:", &oop, 1));
}

extern "C" char *PyBytes_AsString(PyObject *obj) {
    if (obj == NULL) return NULL;
    OopType oop = pyobj_oop(obj);
    char *cached = buffer_cache_get(oop);
    if (cached) return cached;
    int64 size = GciFetchSize_(oop);
    return buffer_cache_add(oop, size);
}

extern "C" Py_ssize_t PyBytes_Size(PyObject *obj) {
    if (obj == NULL) return  0;
    return (Py_ssize_t)GciFetchSize_(pyobj_oop(obj));
}

extern "C" int PyBytes_Check(PyObject *obj) {
    return type_flag_check(obj, Py_TPFLAGS_BYTES_SUBCLASS);
}

/* ====================================================================
 * CPython API implementations — List (backed by OrderedCollection)
 * ==================================================================== */

extern "C" PyObject *PyList_New(Py_ssize_t len) {
    OopType arg = GciI64ToOop(len);
    return addr_to_pyobj(GciPerform(server, "PyList_New:", &arg, 1));
}

static void raise_error(const char *message);

#define CHECK_pyObj(anObj, msg ) \
    if (anObj == NULL) { \
      raise_error( msg " arg is NULL"); \
      return 0; \
    }

extern "C" int PyList_Append(PyObject *list, PyObject *item) {
    CHECK_pyObj(list, "PyList_Append list");
    CHECK_pyObj(item, "PyList_Append item");
    OopType args[2] = { pyobj_oop(list), pyobj_oop(item) };
    GciPerform(server, "PyList_Append:item:", args, 2);
    return 0;
}

extern "C" PyObject *PyList_GetItem(PyObject *list, Py_ssize_t index) {
    CHECK_pyObj(list, "PyList_GetItem list");
    OopType args[2] = { pyobj_oop(list), GciI64ToOop(index) };
    return addr_to_pyobj(GciPerform(server, "PyList_GetItem:at:", args, 2));
}

extern "C" int PyList_SetItem(PyObject *list, Py_ssize_t index, PyObject *item) {
    CHECK_pyObj(list, "PyList_SetItem list");
    CHECK_pyObj(item, "PyList_SetItem item");
    OopType args[3] = { pyobj_oop(list), GciI64ToOop(index), pyobj_oop(item) };
    GciPerform(server, "PyList_SetItem:at:put:", args, 3);
    return 0;
}

extern "C" int PyList_Insert(PyObject *list, Py_ssize_t index, PyObject *item) {
    CHECK_pyObj(list, "PyList_Insert list");
    CHECK_pyObj(item, "PyList_Insert item");
    OopType args[3] = { pyobj_oop(list), GciI64ToOop(index), pyobj_oop(item) };
    GciPerform(server, "PyList_Insert:at:item:", args, 3);
    return 0;
}

extern "C" int PyList_SetSlice(PyObject *list, Py_ssize_t lo, Py_ssize_t hi,
                               PyObject *itemlist) {
    CHECK_pyObj(list, "PyList_SetSlice list");
    OopType args[4] = {
        pyobj_oop(list),
        GciI64ToOop(lo),
        GciI64ToOop(hi),
        itemlist ? pyobj_oop(itemlist) : OOP_NIL
    };
    GciPerform(server, "PyList_SetSlice:from:to:with:", args, 4);
    if (check_gci_error()) return -1;
    return 0;
}

extern "C" Py_ssize_t PyList_Size(PyObject *list) {
    CHECK_pyObj(list, "PyList_Size list");
    OopType arg = pyobj_oop(list);
    return (Py_ssize_t)GciOopToI64(GciPerform(server, "PyList_Size:", &arg, 1));
}

extern "C" int PyList_Check(PyObject *obj) {
    return type_flag_check(obj, Py_TPFLAGS_LIST_SUBCLASS);
}

/* ====================================================================
 * CPython API implementations — Dict (backed by KeyValueDictionary)
 * ==================================================================== */

extern "C" PyObject *PyDict_New(void) {
    return addr_to_pyobj(GciPerform(server, "PyDict_New", NULL, 0));
}

extern "C" int PyDict_SetItem(PyObject *dict, PyObject *key, PyObject *value) {
    CHECK_pyObj(dict, "PyDict_SetItem dict");
    CHECK_pyObj(key, "PyDict_SetItem key");
    CHECK_pyObj(value, "PyDict_SetItem value");
    OopType args[3] = { pyobj_oop(dict), pyobj_oop(key), pyobj_oop(value) };
    GciPerform(server, "PyDict_SetItem:key:value:", args, 3);
    return 0;
}

extern "C" int PyDict_SetItemString(PyObject *dict, const char *key, PyObject *value) {
    CHECK_pyObj(dict, "PyDict_SetItemString dict");
    CHECK_pyObj(value, "PyDict_SetItemString value");
    OopType args[3] = { pyobj_oop(dict), GciNewString(key), pyobj_oop(value) };
    GciPerform(server, "PyDict_SetItemString:key:value:", args, 3);
    return 0;
}

extern "C" PyObject *PyDict_GetItem(PyObject *dict, PyObject *key) {
    CHECK_pyObj(dict, "PyDict_GetItem dict");
    CHECK_pyObj(key, "PyDict_GetItem key");
    OopType args[2] = { pyobj_oop(dict), pyobj_oop(key) };
    OopType addrOop = GciPerform(server, "PyDict_GetItem:key:", args, 2);
    int64 addr = GciOopToI64(addrOop);
    if (addr == 0) return NULL;
    return (PyObject *)(intptr_t)addr;
}

extern "C" PyObject *PyDict_GetItemString(PyObject *dict, const char *key) {
    CHECK_pyObj(dict, "PyDict_GetItemString dict");
    OopType args[2] = { pyobj_oop(dict), GciNewString(key) };
    OopType addrOop = GciPerform(server, "PyDict_GetItemString:key:", args, 2);
    int64 addr = GciOopToI64(addrOop);
    if (addr == 0) return NULL;
    return (PyObject *)(intptr_t)addr;
}

extern "C" int PyDict_Contains(PyObject *dict, PyObject *key) {
    CHECK_pyObj(dict, "PyDict_Contains dict");
    CHECK_pyObj(key, "PyDict_Contains key");
    OopType args[2] = { pyobj_oop(dict), pyobj_oop(key) };
    return GciPerform(server, "PyDict_Contains:key:", args, 2) == OOP_TRUE ? 1 : 0;
}

extern "C" int PyDict_DelItem(PyObject *dict, PyObject *key) {
    CHECK_pyObj(dict, "PyDict_DelItem dict");
    CHECK_pyObj(key, "PyDict_DelItem key");
    OopType args[2] = { pyobj_oop(dict), pyobj_oop(key) };
    GciPerform(server, "PyDict_DelItem:key:", args, 2);
    return 0;
}

extern "C" Py_ssize_t PyDict_Size(PyObject *dict) {
    CHECK_pyObj(dict, "PyDict_Size dict");
    OopType arg = pyobj_oop(dict);
    return (Py_ssize_t)GciOopToI64(GciPerform(server, "PyDict_Size:", &arg, 1));
}

extern "C" int PyDict_Check(PyObject *obj) {
    return type_flag_check(obj, Py_TPFLAGS_DICT_SUBCLASS);
}

/* ====================================================================
 * CPython API implementations — Tuple (backed by Array)
 *
 * PyTuple_New creates an Array (mutable during construction).
 * PyTuple_Check accepts both Array and InvariantArray.
 * ==================================================================== */

extern "C" PyObject *PyTuple_New(Py_ssize_t len) {
    OopType arg = GciI64ToOop(len);
    return addr_to_pyobj(GciPerform(server, "PyTuple_New:", &arg, 1));
}

extern "C" int PyTuple_SetItem(PyObject *tuple, Py_ssize_t pos, PyObject *value) {
    CHECK_pyObj(tuple, "PyTuple_SetItem tuple");
    CHECK_pyObj(value, "PyTuple_SetItem value");
    OopType args[3] = { pyobj_oop(tuple), GciI64ToOop(pos), pyobj_oop(value) };
    GciPerform(server, "PyTuple_SetItem:at:put:", args, 3);
    return 0;
}

extern "C" PyObject *PyTuple_GetItem(PyObject *tuple, Py_ssize_t pos) {
    CHECK_pyObj(tuple, "PyTuple_GetItem tuple");
    OopType args[2] = { pyobj_oop(tuple), GciI64ToOop(pos) };
    return addr_to_pyobj(GciPerform(server, "PyTuple_GetItem:at:", args, 2));
}

extern "C" Py_ssize_t PyTuple_Size(PyObject *tuple) {
    CHECK_pyObj(tuple, "PyTuple_Size tuple");
    return (Py_ssize_t)GciFetchSize_(pyobj_oop(tuple));
}

extern "C" int PyTuple_Check(PyObject *obj) {
    return type_flag_check(obj, Py_TPFLAGS_TUPLE_SUBCLASS);
}

/* ====================================================================
 * CPython API implementations — Object protocol
 *
 * These delegate to the server. All Python-level semantics live in
 * Smalltalk.
 * ==================================================================== */

/* C-side import cache: PyImport_ImportModule caches the wrapped module by
   name so repeated imports during an extension's init don't re-cross into
   Smalltalk.  Populated lazily on the first successful import. */
#define IMPORT_CACHE_MAX 64
static struct { char name[64]; PyObject *mod; } import_cache[IMPORT_CACHE_MAX];
static int import_cache_count = 0;

static PyObject *import_cache_get(const char *name) {
    for (int i = 0; i < import_cache_count; i++)
        if (strcmp(import_cache[i].name, name) == 0) return import_cache[i].mod;
    return NULL;
}
static void import_cache_put(const char *name, PyObject *mod) {
    if (import_cache_count >= IMPORT_CACHE_MAX) return;
    snprintf(import_cache[import_cache_count].name, 64, "%s", name);
    import_cache[import_cache_count].mod = mod;
    import_cache_count++;
}

static PyObject *do_import_via_server(const char *name) {
    GciErrSType e; GciErr(&e);              /* drop any stale error first */
    OopType arg = GciNewString(name);
    OopType r = GciPerform(server, "PyImport_ImportModule:", &arg, 1);
    if (GciErr(&e)) {                       /* a real error from THIS perform */
        fprintf(stderr,
            "SHIM-DIAG: import '%s' raised in server: [%d] %s\n",
            name, e.number, e.message);
        fflush(stderr);
        return NULL;
    }
    return addr_to_pyobj(r);               /* 0 if server returned 0 (not found) */
}

extern "C" PyObject *PyImport_ImportModule(const char *name) {
    PyObject *cached = import_cache_get(name);
    if (cached) return cached;
    PyObject *m = do_import_via_server(name);
    if (m == NULL) {
        PyErr_Format(PyExc_ImportError, "No module named '%s'", name);
        return NULL;
    }
    import_cache_put(name, m);
    return m;
}


extern "C" PyObject *PyObject_GetAttrString(PyObject *obj, const char *name) {
    CHECK_pyObj(obj, "PyObject_GetAttrString obj");
    OopType args[2] = { pyobj_oop(obj), GciNewString(name) };
    OopType addrOop = GciPerform(server, "PyObject_GetAttrString:name:", args, 2);
    if (check_gci_error()) return NULL;
    return addr_to_pyobj(addrOop);
}

extern "C" int PyObject_HasAttrString(PyObject *obj, const char *name) {
    CHECK_pyObj(obj, "PyObject_HasAttrString obj");
    OopType args[2] = { pyobj_oop(obj), GciNewString(name) };
    OopType result = GciPerform(server, "PyObject_HasAttrString:name:", args, 2);
    if (check_gci_error()) return 0;
    return result == OOP_TRUE ? 1 : 0;
}

extern "C" PyObject *PyObject_Repr(PyObject *obj) {
    CHECK_pyObj(obj, "PyObject_Repr obj");
    OopType arg = pyobj_oop(obj);
    OopType addrOop = GciPerform(server, "PyObject_Repr:", &arg, 1);
    if (check_gci_error()) return NULL;
    return addr_to_pyobj(addrOop);
}

extern "C" PyObject *PyObject_Str(PyObject *obj) {
    CHECK_pyObj(obj, "PyObject_Str obj");
    OopType arg = pyobj_oop(obj);
    OopType addrOop = GciPerform(server, "PyObject_Str:", &arg, 1);
    if (check_gci_error()) return NULL;
    return addr_to_pyobj(addrOop);
}

extern "C" Py_ssize_t PyObject_Length(PyObject *obj) {
    CHECK_pyObj(obj, "PyObject_Length obj");
    OopType arg = pyobj_oop(obj);
    OopType result = GciPerform(server, "PyObject_Length:", &arg, 1);
    if (check_gci_error()) return -1;
    return (Py_ssize_t)GciOopToI64(result);
}

/* ====================================================================
 * CPython API implementations — Rich comparison
 * ==================================================================== */

extern "C" int PyObject_RichCompareBool(PyObject *v, PyObject *w, int op) {
    CHECK_pyObj(v, "PyObject_RichCompareBool v");
    CHECK_pyObj(w, "PyObject_RichCompareBool w");
    OopType args[3] = { pyobj_oop(v), pyobj_oop(w), GciI64ToOop(op) };
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
    PyObject      *dict;    /* lazily-created Grail dict for PyModule_GetDict */
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
    module_attrs[idx].dict = NULL;
    return idx;
}

extern "C" PyObject *PyModule_GetDict(PyObject *module) {
    /* NumPy's init calls this early to get the namespace to populate.
       Return a lazily-created real (Grail-backed) dict associated with the
       module; PyDict_SetItemString into it delegates to Grail. */
    int idx = find_or_create_module_attrs(module);
    if (idx < 0) return NULL;
    if (module_attrs[idx].dict == NULL)
        module_attrs[idx].dict = PyDict_New();
    return module_attrs[idx].dict;
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
    if (obj == NULL) return 0;
    return (unsigned long)oopToLongWithIndex(pyobj_oop(obj));
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
                 obj ? Py_TYPE(obj)->tp_name : "NULL");
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
    if (op == NULL) return -1;
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
    OopType sizeOop = GciI64ToOop(len);
    OopType oop = GciPerform(OOP_CLASS_STRING, "new:", &sizeOop, 1);
    if (len > 0) {
        GciStoreBytes(oop, 1, (const ByteType *)str, (int64)len);
    }
    return addr_to_pyobj(GciPerform(server, "PyUnicode_FromString:", &oop, 1));
}

extern "C" PyObject *PyUnicode_Substring(PyObject *str, Py_ssize_t start,
                                         Py_ssize_t end) {
    /* Extract a substring. For simplicity, delegate to Smalltalk. */
    if (str == NULL) {
      return addr_to_pyobj(OOP_NIL);
    }
    OopType args[3] = {
        pyobj_oop(str),
        GciI64ToOop(start),
        GciI64ToOop(end)
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
    if (seq == NULL) {
      return addr_to_pyobj(OOP_NIL);
    }
    if (PyList_Check(seq)) return PyList_GetItem(seq, i);
    if (PyTuple_Check(seq)) return PyTuple_GetItem(seq, i);
    OopType args[2] = { pyobj_oop(seq), GciI64ToOop(i) };
    return addr_to_pyobj(GciPerform(server, "PySequence_GetItem:at:", args, 2));
}

extern "C" Py_ssize_t PySequence_Length(PyObject *seq) {
    return PyObject_Length(seq);
}

/* ====================================================================
 * CPython API — Object protocol (additional)
 * ==================================================================== */

extern "C" PyObject *PyObject_GetItem(PyObject *obj, PyObject *key) {
    if (obj == NULL || key == NULL) {
      return NULL;
    }
    OopType args[2] = { pyobj_oop(obj), pyobj_oop(key) };
    OopType result = GciPerform(server, "PyObject_GetItem:key:", args, 2);
    if (check_gci_error()) return NULL;
    return addr_to_pyobj(result);
}

extern "C" int PyObject_SetItem(PyObject *obj, PyObject *key, PyObject *value) {
    if (obj == NULL || key == NULL || value == NULL) {
      return -1;
    }
    OopType args[3] = { pyobj_oop(obj), pyobj_oop(key), pyobj_oop(value) };
    GciPerform(server, "PyObject_SetItem:key:value:", args, 3);
    if (check_gci_error()) return -1;
    return 0;
}

extern "C" PyObject *PyObject_Call(PyObject *callable, PyObject *args,
                                    PyObject *kwargs) {
    /* Minimal: call with tuple args, ignore kwargs for now */
    (void)kwargs;
    if (callable == NULL || args == NULL) {
      return NULL;
    }
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
    if (obj == NULL || value == NULL) {
      return -1;
    }
    OopType args[3] = { pyobj_oop(obj), GciNewString(name), pyobj_oop(value) };
    GciPerform(server, "PyObject_SetAttrString:name:value:", args, 3);
    if (check_gci_error()) return -1;
    return 0;
}

extern "C" int PyCallable_Check(PyObject *obj) {
    /* Common non-callables: strings, bytes, ints, floats, lists, tuples,
       dicts, None, bool.  Real callables include functions, BoundMethods,
       callable classes — the server is the source of truth, so delegate
       for anything we don't recognise as a non-callable.  re.sub relies
       on this returning 0 for a literal-string replacement: the CALLABLE
       path tries to send the str as a function, which trips a
       "no Symbol" error inside GciPerform. */
    if (!obj) return 0;
    if (obj == Py_None || obj == Py_True || obj == Py_False) return 0;
    PyTypeObject *t = Py_TYPE(obj);
    if (t == &PyUnicode_Type) return 0;
    if (t == &PyBytes_Type) return 0;
    if (t == &PyLong_Type) return 0;
    if (t == &PyFloat_Type) return 0;
    if (t == &PyList_Type) return 0;
    if (t == &PyTuple_Type) return 0;
    if (t == &PyDict_Type) return 0;
    /* Anything else: ask the server. */
    OopType arg = pyobj_oop(obj);
    OopType result = GciPerform(server, "PyCallable_Check:", &arg, 1);
    if (check_gci_error()) return 0;
    return result == OOP_TRUE ? 1 : 0;
}

extern "C" PyObject *PyObject_RichCompare(PyObject *v, PyObject *w, int op) {
    if (v == NULL || w == NULL) return NULL;
    OopType args[3] = { pyobj_oop(v), pyobj_oop(w), GciI64ToOop(op) };
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
    /* pyobj_oop(NULL) is the None OOP, so C NULL maps to Python None. */
    OopType args[3] = { pyobj_oop(start), pyobj_oop(stop), pyobj_oop(step) };
    OopType result = GciPerform(server, "PySlice_New:stop:step:", args, 3);
    if (check_gci_error()) return NULL;
    return addr_to_pyobj(result);
}

extern "C" int PySlice_Unpack(PyObject *slice, Py_ssize_t *start,
                               Py_ssize_t *stop, Py_ssize_t *step) {
    OopType arg = pyobj_oop(slice);
    OopType result = GciPerform(server, "PySlice_Unpack:", &arg, 1);
    if (check_gci_error()) return -1;
    if (result == OOP_NIL) {
        PyErr_SetString(PyExc_TypeError, "PySlice_Unpack: not a slice object");
        return -1;
    }

    /* result is { startOrNil. stopOrNil. stepOrNil }; CPython defaults
       are applied here so the huge sentinel values never round-trip
       through Smalltalk SmallIntegers. */
    OopType idx1[1] = { OOP_One };
    OopType idx2[1] = { OOP_Two };
    OopType idx3[1] = { OOP_Three };
    OopType stepOop = GciPerform(result, "at:", idx3, 1);
    *step = (stepOop == OOP_NIL) ? 1 : (Py_ssize_t)GciOopToI64(stepOop);
    if (*step == 0) {
        PyErr_SetString(PyExc_ValueError, "slice step cannot be zero");
        return -1;
    }
    OopType startOop = GciPerform(result, "at:", idx1, 1);
    *start = (startOop == OOP_NIL)
        ? (*step < 0 ? PY_SSIZE_T_MAX : 0)
        : (Py_ssize_t)GciOopToI64(startOop);
    OopType stopOop = GciPerform(result, "at:", idx2, 1);
    *stop = (stopOop == OOP_NIL)
        ? (*step < 0 ? PY_SSIZE_T_MIN : PY_SSIZE_T_MAX)
        : (Py_ssize_t)GciOopToI64(stopOop);
    return 0;
}

extern "C" Py_ssize_t PySlice_AdjustIndices(Py_ssize_t length, Py_ssize_t *start,
                                             Py_ssize_t *stop, Py_ssize_t step) {
    /* CPython's clamping algorithm (Objects/sliceobject.c). Returns the
       number of elements the adjusted slice selects. */
    assert(step != 0);

    if (*start < 0) {
        *start += length;
        if (*start < 0)
            *start = (step < 0) ? -1 : 0;
    }
    else if (*start >= length) {
        *start = (step < 0) ? length - 1 : length;
    }

    if (*stop < 0) {
        *stop += length;
        if (*stop < 0)
            *stop = (step < 0) ? -1 : 0;
    }
    else if (*stop >= length) {
        *stop = (step < 0) ? length - 1 : length;
    }

    if (step < 0) {
        if (*stop < *start)
            return (*start - *stop - 1) / (-step) + 1;
    }
    else {
        if (*start < *stop)
            return (*stop - *start - 1) / step + 1;
    }
    return 0;
}

/* ====================================================================
 * CPython API — Buffer protocol
 * ==================================================================== */

extern "C" int PyObject_CheckBuffer(PyObject *obj) {
    if (PyBytes_Check(obj) || PyUnicode_Check(obj)) return 1;
    return obj != NULL && Py_TYPE(obj) != NULL &&
           Py_TYPE(obj)->tp_as_buffer != NULL &&
           Py_TYPE(obj)->tp_as_buffer->bf_getbuffer != NULL;
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
        /* Return the raw UTF-8 bytes; len is the BYTE length (the
           code-point count can be shorter for non-ASCII strings). */
        view->buf = (void *)PyUnicode_AsUTF8(obj);
        view->len = (Py_ssize_t)GciFetchSize_(pyobj_oop(obj));
        view->itemsize = 1;
        view->readonly = 1;
        return 0;
    }
    /* Heap types implementing the buffer protocol (Py_bf_getbuffer slot) */
    if (obj != NULL && Py_TYPE(obj) != NULL &&
        Py_TYPE(obj)->tp_as_buffer != NULL &&
        Py_TYPE(obj)->tp_as_buffer->bf_getbuffer != NULL) {
        return Py_TYPE(obj)->tp_as_buffer->bf_getbuffer(obj, view, flags);
    }
    PyErr_Format(PyExc_TypeError, "a bytes-like object is required, not '%.200s'",
                 obj ? Py_TYPE(obj)->tp_name : "NULL");
    return -1;
}

extern "C" void PyBuffer_Release(Py_buffer *view) {
    /* Heap types with a release hook get it; str/bytes buffers are owned
       by the buffer cache and must not be freed here. */
    if (view->obj != NULL && Py_TYPE(view->obj) != NULL &&
        Py_TYPE(view->obj)->tp_as_buffer != NULL &&
        Py_TYPE(view->obj)->tp_as_buffer->bf_releasebuffer != NULL) {
        Py_TYPE(view->obj)->tp_as_buffer->bf_releasebuffer(view->obj, view);
    }
    memset(view, 0, sizeof(Py_buffer));
}

/* ====================================================================
 * CPython API — Dict (additional)
 * ==================================================================== */

extern "C" int PyDict_Next(PyObject *dict, Py_ssize_t *ppos, PyObject **pkey,
                            PyObject **pvalue) {
    /* Iterate over a GemStone-backed dictionary.
       Delegate to server — it returns an Array { key, value } or nil. */
    if (dict == NULL) return 0;
    OopType args[2] = { pyobj_oop(dict), GciI64ToOop(*ppos) };
    OopType result = GciPerform(server, "PyDict_Next:pos:", args, 2);
    if (check_gci_error()) return 0;
    if (result == OOP_NIL) return 0;

    /* Result is an Array of { key_addr, value_addr, next_pos } */
    OopType keyArr[1] = { OOP_One  };
    OopType valArr[1] = { OOP_Two };
    OopType nextArr[1] = { OOP_Three };
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
    /* Covers the format units used by typical extension modules:
       O, O!, O&, n, i, b, h, l, k, K, L, I, d, f, p, c, s, s#, z, y, y#,
       plus '|' (optional), '$' (keyword-only — treated like '|'),
       and ':'/';' function-name suffixes. */
    Py_ssize_t nargs = PyTuple_Size(args);
    va_list vargs;
    va_start(vargs, format);

    const char *f = format;
    const char *fname = strchr(format, ':');
    if (!fname) fname = strchr(format, ';');
    fname = fname ? fname + 1 : "function";

    Py_ssize_t i = 0;
    int required = 1;

    while (*f) {
        if (*f == '|' || *f == '$') { required = 0; f++; continue; }
        if (*f == ':' || *f == ';') break;  /* end of format */
        if (*f == ' ') { f++; continue; }

        if (i >= nargs) {
            if (required) {
                va_end(vargs);
                PyErr_Format(PyExc_TypeError,
                    "%s expected at least %zd arguments, got %zd",
                    fname, i + 1, nargs);
                return 0;
            }
            break;
        }

        PyObject *item = PyTuple_GetItem(args, i);
        if (item == NULL) {
          va_end(vargs);
          PyErr_Format(PyExc_RuntimeError, "PyArg_ParseTuple: item == NULL");
          return 0;
        }
        switch (*f) {
            case 'O': {
                if (f[1] == '!') {
                    PyTypeObject *expected = va_arg(vargs, PyTypeObject *);
                    PyObject **out = va_arg(vargs, PyObject **);
                    if (Py_TYPE(item) != expected &&
                        !(Py_TYPE(item) && expected &&
                          Py_TYPE(item)->tp_base == expected)) {
                        va_end(vargs);
                        PyErr_Format(PyExc_TypeError,
                            "%s argument %zd must be %s, not %s",
                            fname, i + 1, expected->tp_name,
                            Py_TYPE(item) ? Py_TYPE(item)->tp_name : "?");
                        return 0;
                    }
                    *out = item;
                    f++;  /* consume '!' */
                    break;
                }
                if (f[1] == '&') {
                    typedef int (*converter_t)(PyObject *, void *);
                    converter_t conv = va_arg(vargs, converter_t);
                    void *out = va_arg(vargs, void *);
                    if (!conv(item, out)) {
                        va_end(vargs);
                        if (!PyErr_Occurred())
                            PyErr_Format(PyExc_TypeError,
                                "%s argument %zd conversion failed", fname, i + 1);
                        return 0;
                    }
                    f++;  /* consume '&' */
                    break;
                }
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
            case 'b': {
                unsigned char *out = va_arg(vargs, unsigned char *);
                *out = (unsigned char)PyLong_AsLong(item);
                break;
            }
            case 'h': {
                short *out = va_arg(vargs, short *);
                *out = (short)PyLong_AsLong(item);
                break;
            }
            case 'l': {
                long *out = va_arg(vargs, long *);
                *out = PyLong_AsLong(item);
                break;
            }
            case 'k': {
                unsigned long *out = va_arg(vargs, unsigned long *);
                *out = PyLong_AsUnsignedLong(item);
                break;
            }
            case 'L': {
                long long *out = va_arg(vargs, long long *);
                *out = PyLong_AsLongLong(item);
                break;
            }
            case 'K': {
                unsigned long long *out = va_arg(vargs, unsigned long long *);
                *out = PyLong_AsUnsignedLongLong(item);
                break;
            }
            case 'I': {
                unsigned int *out = va_arg(vargs, unsigned int *);
                *out = (unsigned int)PyLong_AsUnsignedLong(item);
                break;
            }
            case 'd': {
                double *out = va_arg(vargs, double *);
                *out = PyFloat_AsDouble(item);
                break;
            }
            case 'f': {
                float *out = va_arg(vargs, float *);
                *out = (float)PyFloat_AsDouble(item);
                break;
            }
            case 'p': {
                int *out = va_arg(vargs, int *);
                *out = PyObject_IsTrue(item);
                break;
            }
            case 'c': {
                char *out = va_arg(vargs, char *);
                const char *s = PyUnicode_AsUTF8(item);
                if (!s || strlen(s) != 1) {
                    va_end(vargs);
                    PyErr_Format(PyExc_TypeError,
                        "%s argument %zd must be a 1-character string",
                        fname, i + 1);
                    return 0;
                }
                *out = s[0];
                break;
            }
            case 'z':   /* string or None */
            case 's': {
                if (*f == 'z' && item == Py_None) {
                    if (f[1] == '#') {
                        const char **out = va_arg(vargs, const char **);
                        Py_ssize_t *len = va_arg(vargs, Py_ssize_t *);
                        *out = NULL; *len = 0;
                        f++;
                    } else {
                        const char **out = va_arg(vargs, const char **);
                        *out = NULL;
                    }
                    break;
                }
                if (!PyUnicode_Check(item)) {
                    va_end(vargs);
                    PyErr_Format(PyExc_TypeError,
                        "%s argument %zd must be str, not %s",
                        fname, i + 1,
                        Py_TYPE(item) ? Py_TYPE(item)->tp_name : "?");
                    return 0;
                }
                if (f[1] == '#') {
                    const char **out = va_arg(vargs, const char **);
                    Py_ssize_t *len = va_arg(vargs, Py_ssize_t *);
                    *out = PyUnicode_AsUTF8AndSize(item, len);
                    f++;  /* consume '#' */
                } else {
                    const char **out = va_arg(vargs, const char **);
                    *out = PyUnicode_AsUTF8(item);
                }
                break;
            }
            case 'y': {
                if (!PyBytes_Check(item)) {
                    va_end(vargs);
                    PyErr_Format(PyExc_TypeError,
                        "%s argument %zd must be bytes, not %s",
                        fname, i + 1,
                        Py_TYPE(item) ? Py_TYPE(item)->tp_name : "?");
                    return 0;
                }
                if (f[1] == '#' || f[1] == '*') {
                    /* 'y#' fills ptr+len; 'y*' fills a Py_buffer. */
                    if (f[1] == '*') {
                        Py_buffer *view = va_arg(vargs, Py_buffer *);
                        if (PyObject_GetBuffer(item, view, PyBUF_SIMPLE) < 0) {
                            va_end(vargs);
                            return 0;
                        }
                    } else {
                        const char **out = va_arg(vargs, const char **);
                        Py_ssize_t *len = va_arg(vargs, Py_ssize_t *);
                        *out = PyBytes_AsString(item);
                        *len = PyBytes_Size(item);
                    }
                    f++;  /* consume '#' or '*' */
                } else {
                    const char **out = va_arg(vargs, const char **);
                    *out = PyBytes_AsString(item);
                }
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

    /* Too many args? Count remaining required format units. */
    if (i < nargs && *f != ':' && *f != ';' && *f != '\0') {
        /* leftover format units exist but we ran out — already handled */
    }
    if (i < nargs && (*f == '\0' || *f == ':' || *f == ';')) {
        PyErr_Format(PyExc_TypeError,
            "%s expected at most %zd arguments, got %zd", fname, i, nargs);
        return 0;
    }
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

/* Multi-phase init: allocate state and run Py_mod_exec slots.
   Returns 0 on success, -1 if an exec slot failed. */
static int run_module_exec_slots(PyObject *mod) {
    PyModuleDef *def = (PyModuleDef *)mod;
    if (!def->m_slots) return 0;
    if (def->m_size > 0) {
        allocate_module_state(def);
    }
    for (PyModuleDef_Slot *slot = def->m_slots; slot->slot; slot++) {
        if (slot->slot == Py_mod_exec) {
            typedef int (*ExecFunc)(PyObject *);
            ExecFunc exec = (ExecFunc)slot->value;
            if (exec(mod) != 0) {
                const char *et = get_error_type();
                const char *em = get_error_message();
                fprintf(stderr,
                    "SHIM-DIAG: Py_mod_exec slot failed; pending error: %s: %s\n",
                    et ? et : "(none)", em ? em : "(none)");
                fflush(stderr);
                return -1;
            }
        }
    }
    return 0;
}

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
                snprintf(module_names[num_modules], sizeof(module_names[num_modules]), "%s", name);
                module_cache[num_modules] = mod;
                num_modules++;

                if (run_module_exec_slots(mod) != 0) {
                    /* exec failed — remove from cache */
                    num_modules--;
                    return NULL;
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

static int64 fetch_string(OopType oop, char *buf, int bufSize) {
    int64 len = GciFetchBytes_(oop, 1, (ByteType *)buf, bufSize - 1);
    buf[len] = '\0';
    return len;
}

/* ====================================================================
 * Helper: raise a GemStone Error from C
 * ==================================================================== */

static void raise_error(const char *message) {
    GciErrSType err;
    err.number = ERR_Error;
    err.argCount = 1;
    err.args[0] = GciNewString(message);
    strncpy(err.message, message, GCI_ERR_STR_SIZE);
    err.message[GCI_ERR_STR_SIZE] = '\0';
    // printf("cpython.cc: raise_error %s\n", message); // uncomment for debugging
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

    /* 1. Fetch module name. If it contains a '.', it carries the method
       name too ("_sre.compile") — in that case, the methOop slot is reused
       as the first call argument, giving us 6 arg slots instead of 5. */
    fetch_string(modOop, modName, sizeof(modName));
    char *dot = strchr(modName, '.');
    int combined = (dot != NULL);
    if (combined) {
        *dot = '\0';
        snprintf(methName, sizeof(methName), "%s", dot + 1);
    } else {
        fetch_string(methOop, methName, sizeof(methName));
    }

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

    /* 4. Decode flags — bits 0-2 = nargs, bit 3 = return raw C pointer */
    int flags = GciOopToI32(flagsOop);
    int nargs = flags & 0x7;
    int returnCPtr = (flags >> 3) & 1;

    /* 5. Convert Integer addresses to PyObject* pointers. Unused args are
       0 (SmallInteger), which become NULL pointers. In combined mode the
       methOop slot is the first arg, freeing all five a1..a5 slots and
       letting a6 (passed via the 8th user-action slot) fit. */
    PyObject *pyArgs[6];
    if (combined) {
        pyArgs[0] = (PyObject *)(intptr_t)GciOopToI64(methOop);
        pyArgs[1] = (PyObject *)(intptr_t)GciOopToI64(a1);
        pyArgs[2] = (PyObject *)(intptr_t)GciOopToI64(a2);
        pyArgs[3] = (PyObject *)(intptr_t)GciOopToI64(a3);
        pyArgs[4] = (PyObject *)(intptr_t)GciOopToI64(a4);
        pyArgs[5] = (PyObject *)(intptr_t)GciOopToI64(a5);
    } else {
        pyArgs[0] = (PyObject *)(intptr_t)GciOopToI64(a1);
        pyArgs[1] = (PyObject *)(intptr_t)GciOopToI64(a2);
        pyArgs[2] = (PyObject *)(intptr_t)GciOopToI64(a3);
        pyArgs[3] = (PyObject *)(intptr_t)GciOopToI64(a4);
        pyArgs[4] = (PyObject *)(intptr_t)GciOopToI64(a5);
        pyArgs[5] = NULL;
    }

    /* 6. Call the method */
    PyObject *result = call_method(module, methIdx, pyArgs, nargs);

    /* 7. Clear buffer cache (free materialized bytes/string buffers) */
    buffer_cache_clear();

    /* 8. Check for error */
    if (has_error()) {
        check_and_raise_error();
        return OOP_NIL;  /* unreachable if exception raised */
    }

    /* 9. Return either the hidden OOP at offset 16, or the raw C pointer */
    if (!result)
        return OOP_NIL;
    if (returnCPtr)
        return GciI64ToOop((intptr_t)result);
    return pyobj_oop(result);
}

/* ====================================================================
 * shimCallKw — call a module method with positional AND keyword args
 *
 * Arguments (5 OopType):
 *   mod      — String: module name
 *   meth     — String: method name
 *   posArr   — Array of SmallInteger: PyObject addresses (positionals)
 *   kwNames  — Array of String: keyword names
 *   kwVals   — Array of SmallInteger: PyObject addresses (keyword values)
 *
 * Follows the METH_FASTCALL|METH_KEYWORDS vector convention internally;
 * METH_VARARGS|METH_KEYWORDS methods get a dict instead.
 * ==================================================================== */

#define SHIM_KW_MAX_ARGS 16

static OopType shimCallKw(OopType modOop, OopType methOop,
                          OopType posArrOop, OopType kwNamesOop,
                          OopType kwValsOop)
{
    char modName[64], methName[64];
    fetch_string(modOop, modName, sizeof(modName));
    fetch_string(methOop, methName, sizeof(methName));

    PyObject *module = get_or_load_module(modName);
    if (!module) {
        char msg[256];
        snprintf(msg, sizeof(msg), "Module not found: %s", modName);
        raise_error(msg);
        return OOP_NIL;
    }
    int methIdx = find_method(module, methName);
    if (methIdx < 0) {
        char msg[256];
        snprintf(msg, sizeof(msg), "Method not found: %s.%s", modName, methName);
        raise_error(msg);
        return OOP_NIL;
    }

    Py_ssize_t npos = (Py_ssize_t)GciFetchSize_(posArrOop);
    Py_ssize_t nkw = (Py_ssize_t)GciFetchSize_(kwNamesOop);
    if (npos + nkw > SHIM_KW_MAX_ARGS) {
        raise_error("shimCallKw: too many arguments");
        return OOP_NIL;
    }

    /* args = positionals followed by keyword values */
    PyObject *args[SHIM_KW_MAX_ARGS];
    for (Py_ssize_t i = 0; i < npos; i++) {
        OopType idxOop = GciI64ToOop(i + 1);
        OopType addrOop = GciPerform(posArrOop, "at:", &idxOop, 1);
        args[i] = (PyObject *)(intptr_t)GciOopToI64(addrOop);
    }
    PyObject *kwnames = PyTuple_New(nkw);
    if (!kwnames) {
        raise_error("shimCallKw: could not allocate kwnames");
        return OOP_NIL;
    }
    for (Py_ssize_t i = 0; i < nkw; i++) {
        OopType idxOop = GciI64ToOop(i + 1);
        OopType nameOop = GciPerform(kwNamesOop, "at:", &idxOop, 1);
        OopType valAddrOop = GciPerform(kwValsOop, "at:", &idxOop, 1);
        /* The name is already a Smalltalk String — wrap it as a PyObject */
        OopType nameAddr = GciPerform(server, "PyUnicode_FromString:", &nameOop, 1);
        PyTuple_SetItem(kwnames, i, addr_to_pyobj(nameAddr));
        args[npos + i] = (PyObject *)(intptr_t)GciOopToI64(valAddrOop);
    }

    PyModuleDef *def = (PyModuleDef *)module;
    PyMethodDef *method = &def->m_methods[methIdx];
    PyErr_Clear();
    PyObject *result = call_method_on_kw(module, method, NULL,
                                         args, npos, kwnames, nkw);

    buffer_cache_clear();
    if (has_error()) {
        check_and_raise_error();
        return OOP_NIL;
    }
    if (!result) return OOP_NIL;
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

    if (!type) return OOP_Zero;
    return GciI64ToOop((intptr_t)type);
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

extern "C" PyObject *PyType_GenericAlloc(PyTypeObject *type,
                                         Py_ssize_t nitems) {
    size_t size = (size_t)type->tp_basicsize +
                  (size_t)nitems * (size_t)type->tp_itemsize;
    PyObject *obj = (PyObject *)calloc(1, size);
    if (!obj) {
        PyErr_NoMemory();
        return NULL;
    }
    obj->ob_refcnt = 1;
    obj->ob_type = type;
    if (type->tp_itemsize != 0)
        Py_SET_SIZE(obj, nitems);
    return obj;
}

extern "C" PyObject *PyType_GenericNew(PyTypeObject *type, PyObject *args,
                                       PyObject *kwds) {
    (void)args; (void)kwds;
    allocfunc alloc = type->tp_alloc ? type->tp_alloc : PyType_GenericAlloc;
    return alloc(type, 0);
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

/* Subclass-identity bits a heap type inherits from its base so the
   flag-based PyXxx_Check functions see through the subclassing. */
#define Py_TPFLAGS_SUBCLASS_MASK                                         \
    (Py_TPFLAGS_LONG_SUBCLASS | Py_TPFLAGS_LIST_SUBCLASS |               \
     Py_TPFLAGS_TUPLE_SUBCLASS | Py_TPFLAGS_BYTES_SUBCLASS |             \
     Py_TPFLAGS_UNICODE_SUBCLASS | Py_TPFLAGS_DICT_SUBCLASS |            \
     Py_TPFLAGS_BASE_EXC_SUBCLASS | Py_TPFLAGS_TYPE_SUBCLASS)

static PyObject *type_from_spec_impl(PyObject *module, PyType_Spec *spec,
                                     PyObject *bases) {
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

    /* A single type object passed as `bases` becomes tp_base. A TUPLE of
       bases cannot be supported: the tuple lives in Smalltalk and type
       objects have no OOP at offset 16, so its elements are unreadable —
       reject loudly rather than mis-derive. */
    if (bases != NULL) {
        if (Py_TYPE(bases) == &PyType_Type) {
            type->tp_base = (PyTypeObject *)bases;
        } else {
            free(type);
            PyErr_SetString(PyExc_TypeError,
                "PyType_FromSpecWithBases: only a single type object is "
                "supported as bases in the Grail shim (not a tuple)");
            return NULL;
        }
    }

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

    /* Inherit subclass-identity flag bits (and buffer procs) from the
       base so PyXxx_Check and PyObject_GetBuffer see through heap-type
       subclassing. */
    if (type->tp_base) {
        type->tp_flags |= type->tp_base->tp_flags & Py_TPFLAGS_SUBCLASS_MASK;
        if (!type->tp_as_buffer && type->tp_base->tp_as_buffer)
            type->tp_as_buffer = type->tp_base->tp_as_buffer;
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
            OopType sizeOop = GciI64ToOop(count);
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
        char msg[1024];
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
    snprintf(module_names[num_modules], sizeof(module_names[num_modules]), "%s", name);
    module_cache[num_modules] = mod;
    num_modules++;

    /* Multi-phase modules: run Py_mod_exec slots (registers constants,
       creates heap types). Previously only the static-registry path did
       this, so dynamically loaded modules silently skipped their init. */
    if (run_module_exec_slots(mod) != 0) {
        num_modules--;
        char msg[256];
        snprintf(msg, sizeof(msg), "Module exec failed: %s", name);
        raise_error(msg);
        return OOP_NIL;
    }

    /* Walk the method table and return an Array of method name strings */
    PyModuleDef *def = (PyModuleDef *)mod;
    PyMethodDef *methods = def->m_methods;
    int count = 0;
    while (methods[count].ml_name) count++;

    OopType sizeOop = GciI64ToOop(count);
    OopType arr = GciPerform(OOP_CLASS_ARRAY, "new:", &sizeOop, 1);
    for (int i = 0; i < count; i++) {
        OopType nameStr = GciNewString(methods[i].ml_name);
        GciStoreOop(arr, i + 1, nameStr);
    }
    return arr;
}

/* ====================================================================
 * shimModuleAttrs — export module-level constants to Smalltalk
 *
 * PyModule_AddIntConstant / AddStringConstant / AddObjectRef record
 * attributes in the C-side module_attrs table. This user action returns
 * them as a flat Array { name1. value1. name2. value2. ... } so the
 * Smalltalk module wrapper can expose them as Python attributes.
 *
 * Object attrs are exported only when they wrap a Smalltalk value
 * (int/float/str/bytes/list/dict/tuple/bool/None) — C-only objects
 * (heap types, capsules) have no OOP at offset 16 and are skipped.
 * ==================================================================== */

static int is_value_pyobj(PyObject *obj) {
    if (obj == NULL) return 0;
    if (obj == Py_None || obj == Py_True || obj == Py_False) return 1;
    PyTypeObject *t = Py_TYPE(obj);
    return t == &PyLong_Type || t == &PyFloat_Type || t == &PyBool_Type ||
           t == &PyUnicode_Type || t == &PyBytes_Type || t == &PyList_Type ||
           t == &PyDict_Type || t == &PyTuple_Type;
}

static OopType shimModuleAttrs(OopType modOop)
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

    int idx = -1;
    for (int i = 0; i < module_attrs_count; i++) {
        if (module_attrs[i].module == module) { idx = i; break; }
    }

    /* First pass: count exportable attrs */
    int exportable = 0;
    int total = (idx < 0) ? 0 : module_attrs[idx].attr_count;
    for (int i = 0; i < total; i++) {
        ModuleAttr *a = &module_attrs[idx].attrs[i];
        if (a->type == ModuleAttr::ATTR_OBJECT && !is_value_pyobj(a->obj_val))
            continue;
        exportable++;
    }

    OopType sizeOop = GciI64ToOop(exportable * 2);
    OopType arr = GciPerform(OOP_CLASS_ARRAY, "new:", &sizeOop, 1);
    int slot = 1;
    for (int i = 0; i < total; i++) {
        ModuleAttr *a = &module_attrs[idx].attrs[i];
        OopType valOop;
        switch (a->type) {
            case ModuleAttr::ATTR_INT:
                valOop = GciI64ToOop(a->int_val);
                break;
            case ModuleAttr::ATTR_STRING:
                valOop = GciNewString(a->str_val);
                break;
            case ModuleAttr::ATTR_OBJECT:
                if (!is_value_pyobj(a->obj_val)) continue;
                valOop = pyobj_oop(a->obj_val);
                break;
            default:
                continue;
        }
        GciStoreOop(arr, slot++, GciNewString(a->name));
        GciStoreOop(arr, slot++, valOop);
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
    int setAttr = (flags >> 4) & 1;

    /* Find the module */
    PyObject *module = get_or_load_module(modName);
    if (!module) {
        char msg[256];
        snprintf(msg, sizeof(msg), "Module not found: %s", modName);
        raise_error(msg);
        return OOP_NIL;
    }

    /* Find the type in the heap-type registry by short name (after the
       last '.'). Registered at PyType_FromModuleAndSpec / PyModule_AddType
       time; no module state is needed for the lookup. */
    PyTypeObject *targetType = NULL;
    for (int i = 0; i < heap_type_count; i++) {
        if (heap_types[i].module == module &&
            heap_types[i].type &&
            heap_types[i].type->tp_name) {
            const char *name = heap_types[i].type->tp_name;
            const char *dot = strrchr(name, '.');
            const char *shortName = dot ? dot + 1 : name;
            if (strcmp(shortName, typeName) == 0) {
                targetType = heap_types[i].type;
                break;
            }
        }
    }

    if (!targetType) {
        char msg[256];
        snprintf(msg, sizeof(msg), "Type not found: %s.%s", modName, typeName);
        raise_error(msg);
        return OOP_NIL;
    }

    /* Setter path (flags bit 4): methName names a tp_getset entry; a1 is
       the value PyObject. */
    if (setAttr) {
        PyGetSetDef *getset = targetType->tp_getset;
        if (getset) {
            for (int i = 0; getset[i].name; i++) {
                if (strcmp(getset[i].name, methName) == 0 && getset[i].set) {
                    PyObject *self = (PyObject *)(intptr_t)GciOopToI64(selfOop);
                    PyObject *value = (PyObject *)(intptr_t)GciOopToI64(a1);
                    PyErr_Clear();
                    int rc = getset[i].set(self, value, getset[i].closure);
                    buffer_cache_clear();
                    if (rc < 0 || has_error()) {
                        check_and_raise_error();
                        return OOP_NIL;
                    }
                    return OOP_TRUE;
                }
            }
        }
        char msg[256];
        snprintf(msg, sizeof(msg), "No settable attribute: %s.%s",
                 typeName, methName);
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
                        return GciI64ToOop(result == Py_None ? 0 : (intptr_t)result);
                    return pyobj_oop(result);
                }
            }
        }

        /* tp_members — struct fields exposed as attributes
           (PyMemberDef).  re._compiler.compile asks for
           pattern.groups which is a Py_T_PYSSIZET member; the
           template compiler in turn rejects backref indices that
           exceed it.  Read the field at the documented offset and
           box it according to its declared type. */
        PyMemberDef *members = targetType->tp_members;
        if (members) {
            PyObject *self = (PyObject *)(intptr_t)GciOopToI64(selfOop);
            for (int i = 0; members[i].name; i++) {
                if (strcmp(members[i].name, methName) == 0) {
                    char *base = (char *)self + members[i].offset;
                    switch (members[i].type) {
                        case Py_T_PYSSIZET: {
                            Py_ssize_t v = *(Py_ssize_t *)base;
                            return GciI64ToOop((int64)v);
                        }
                        case Py_T_INT: {
                            int v = *(int *)base;
                            return GciI64ToOop((int64)v);
                        }
                        case Py_T_LONG: {
                            long v = *(long *)base;
                            return GciI64ToOop((int64)v);
                        }
                        case _Py_T_OBJECT: {
                            PyObject *v = *(PyObject **)base;
                            if (!v) return OOP_NIL;
                            return pyobj_oop(v);
                        }
                        default:
                            /* Unsupported member type — fall through to
                               not-found and let raise_error fire. */
                            break;
                    }
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

    /* Return value: either a C pointer or a GemStone OOP. Py_None as a
       returned C pointer is reported as 0 — the convention used by the
       Smalltalk wrappers to mean "no match / not present". */
    if (returnCPtr)
        return GciI64ToOop(result == Py_None ? 0 : (intptr_t)result);
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

int PyErr_GivenExceptionMatches(PyObject *given, PyObject *exc) {
    if (given == NULL || exc == NULL) return 0;
    /* Walk the sentinel hierarchy: a KeyError matches LookupError etc. */
    for (PyObject *e = given; e != NULL; e = exc_parent_of(e)) {
        if (e == exc) return 1;
    }
    /* Dynamic exceptions match their declared base (and its ancestry). */
    for (int i = 0; i < dyn_exception_count; i++) {
        if (given == (PyObject *)&dyn_exceptions[i].obj) {
            PyObject *base = dyn_exceptions[i].base;
            if (base == NULL) base = PyExc_Exception;
            return PyErr_GivenExceptionMatches(base, exc);
        }
    }
    return 0;
}

int PyErr_ExceptionMatches(PyObject *exc) {
    return PyErr_GivenExceptionMatches(PyErr_Occurred(), exc);
}

PyObject *PyErr_NewException(const char *name, PyObject *base, PyObject *dict) {
    (void)dict;
    /* Reuse an existing slot if the same dotted name was created before
       (modules may be re-initialized within a session). */
    for (int i = 0; i < dyn_exception_count; i++) {
        if (strcmp(dyn_exceptions[i].name, name) == 0)
            return (PyObject *)&dyn_exceptions[i].obj;
    }
    if (dyn_exception_count >= MAX_DYN_EXCEPTIONS) {
        /* Degrade gracefully: errors raise as RuntimeError. */
        return PyExc_RuntimeError;
    }
    int idx = dyn_exception_count++;
    dyn_exceptions[idx].obj.ob_refcnt = 1;
    dyn_exceptions[idx].obj.ob_type = NULL;
    snprintf(dyn_exceptions[idx].name, sizeof(dyn_exceptions[idx].name),
             "%s", name);
    dyn_exceptions[idx].base = base;
    return (PyObject *)&dyn_exceptions[idx].obj;
}

PyObject *PyErr_NewExceptionWithDoc(const char *name, const char *doc,
                                    PyObject *base, PyObject *dict) {
    (void)doc;
    return PyErr_NewException(name, base, dict);
}

void PyErr_SetObject(PyObject *type, PyObject *value) {
    if (value != NULL && PyUnicode_Check(value)) {
        PyErr_SetString(type, PyUnicode_AsUTF8(value));
        return;
    }
    if (value == NULL || value == Py_None) {
        PyErr_SetString(type, "");
        return;
    }
    PyObject *str = PyObject_Str(value);
    PyErr_SetString(type, str ? PyUnicode_AsUTF8(str) : "");
}

int PyErr_BadArgument(void) {
    PyErr_SetString(PyExc_TypeError, "bad argument type for built-in operation");
    return 0;
}

void PyErr_BadInternalCall(void) {
    PyErr_SetString(PyExc_SystemError, "bad argument to internal function");
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
    /* Supports the printf subset plus CPython's object conversions:
       %R (repr), %S (str), %A (repr, ascii not enforced), %U (str object),
       with optional width/precision digits which are honored for %s. */
    char buf[4096];
    size_t pos = 0;
    const size_t cap = sizeof(buf) - 1;
    va_list ap;
    va_start(ap, format);

    for (const char *f = format; *f && pos < cap; f++) {
        if (*f != '%') { buf[pos++] = *f; continue; }
        f++;
        /* Collect width/precision digits (e.g. %.200s) */
        char spec[16];
        int si = 0;
        while (*f && (strchr("0123456789.", *f) != NULL) && si < 12)
            spec[si++] = *f++;
        spec[si] = '\0';
        size_t rem = cap - pos;

        switch (*f) {
            case '%': buf[pos++] = '%'; break;
            case 'c': {
                int c = va_arg(ap, int);
                buf[pos++] = (char)c;
                break;
            }
            case 'd': case 'i': {
                pos += (size_t)snprintf(buf + pos, rem, "%d", va_arg(ap, int));
                break;
            }
            case 'u': {
                pos += (size_t)snprintf(buf + pos, rem, "%u", va_arg(ap, unsigned int));
                break;
            }
            case 'x': {
                pos += (size_t)snprintf(buf + pos, rem, "%x", va_arg(ap, unsigned int));
                break;
            }
            case 'z': {
                f++;  /* zd / zu / zi */
                if (*f == 'u')
                    pos += (size_t)snprintf(buf + pos, rem, "%zu", va_arg(ap, size_t));
                else
                    pos += (size_t)snprintf(buf + pos, rem, "%zd", va_arg(ap, Py_ssize_t));
                break;
            }
            case 'l': {
                f++;  /* ld / lu / lld / llu */
                if (*f == 'l') {
                    f++;
                    if (*f == 'u')
                        pos += (size_t)snprintf(buf + pos, rem, "%llu", va_arg(ap, unsigned long long));
                    else
                        pos += (size_t)snprintf(buf + pos, rem, "%lld", va_arg(ap, long long));
                } else if (*f == 'u') {
                    pos += (size_t)snprintf(buf + pos, rem, "%lu", va_arg(ap, unsigned long));
                } else {
                    pos += (size_t)snprintf(buf + pos, rem, "%ld", va_arg(ap, long));
                }
                break;
            }
            case 'p': {
                pos += (size_t)snprintf(buf + pos, rem, "%p", va_arg(ap, void *));
                break;
            }
            case 's': {
                const char *s = va_arg(ap, const char *);
                if (!s) s = "(null)";
                if (spec[0] == '.') {
                    int prec = atoi(spec + 1);
                    pos += (size_t)snprintf(buf + pos, rem, "%.*s", prec, s);
                } else {
                    pos += (size_t)snprintf(buf + pos, rem, "%s", s);
                }
                break;
            }
            case 'R': case 'S': case 'A': case 'U': {
                PyObject *obj = va_arg(ap, PyObject *);
                PyObject *strObj;
                if (*f == 'U')      strObj = obj;
                else if (*f == 'S') strObj = PyObject_Str(obj);
                else                strObj = PyObject_Repr(obj);
                const char *s = strObj ? PyUnicode_AsUTF8(strObj) : NULL;
                if (!s) s = "<unprintable>";
                pos += (size_t)snprintf(buf + pos, rem, "%s", s);
                break;
            }
            default:
                buf[pos++] = '%';
                if (*f && pos < cap) buf[pos++] = *f;
                break;
        }
        if (pos > cap) pos = cap;
    }
    va_end(ap);
    buf[pos] = '\0';
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
                 obj ? Py_TYPE(obj)->tp_name : "NULL");
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

/* Build a single value from one format unit, advancing *pf past it.
   Returns NULL with an error set for unsupported units. */
static PyObject *build_value_item(const char **pf, va_list *ap) {
    const char *f = *pf;
    PyObject *result = NULL;
    switch (*f) {
        case 'i': case 'b': case 'h':
            result = PyLong_FromLong((long)va_arg(*ap, int)); f++; break;
        case 'l':
            result = PyLong_FromLong(va_arg(*ap, long)); f++; break;
        case 'n':
            result = PyLong_FromSsize_t(va_arg(*ap, Py_ssize_t)); f++; break;
        case 'L':
            result = PyLong_FromLongLong(va_arg(*ap, long long)); f++; break;
        case 'k':
            result = PyLong_FromUnsignedLong(va_arg(*ap, unsigned long)); f++; break;
        case 'K':
            result = PyLong_FromUnsignedLongLong(va_arg(*ap, unsigned long long)); f++; break;
        case 'I':
            result = PyLong_FromUnsignedLong((unsigned long)va_arg(*ap, unsigned int)); f++; break;
        case 'd': case 'f':
            result = PyFloat_FromDouble(va_arg(*ap, double)); f++; break;
        case 'c': {
            char buf[2] = { (char)va_arg(*ap, int), '\0' };
            result = PyUnicode_FromString(buf); f++; break;
        }
        case 's': case 'z': {
            const char *s = va_arg(*ap, const char *);
            if (f[1] == '#') {
                Py_ssize_t len = va_arg(*ap, Py_ssize_t);
                result = s ? PyUnicode_FromStringAndSize(s, len) : Py_None;
                f += 2;
            } else {
                result = s ? PyUnicode_FromString(s) : Py_None;
                f++;
            }
            break;
        }
        case 'y': {
            const char *s = va_arg(*ap, const char *);
            if (f[1] == '#') {
                Py_ssize_t len = va_arg(*ap, Py_ssize_t);
                result = s ? PyBytes_FromStringAndSize(s, len) : Py_None;
                f += 2;
            } else {
                result = s ? PyBytes_FromStringAndSize(s, (Py_ssize_t)strlen(s))
                           : Py_None;
                f++;
            }
            break;
        }
        case 'O': case 'N': case 'S': {
            PyObject *obj = va_arg(*ap, PyObject *);
            result = obj ? obj : Py_None;
            f++;
            break;
        }
        case '(': case '[': {
            char open = *f, close = (open == '(') ? ')' : ']';
            f++;
            PyObject *items[32];
            int count = 0;
            while (*f && *f != close) {
                if (*f == ',' || *f == ' ') { f++; continue; }
                if (count >= 32) {
                    PyErr_SetString(PyExc_SystemError,
                                    "Py_BuildValue: too many items");
                    return NULL;
                }
                items[count] = build_value_item(&f, ap);
                if (!items[count]) return NULL;
                count++;
            }
            if (*f == close) f++;
            if (open == '(') {
                result = PyTuple_New(count);
                for (int j = 0; j < count; j++)
                    PyTuple_SetItem(result, j, items[j]);
            } else {
                result = PyList_New(0);
                for (int j = 0; j < count; j++)
                    PyList_Append(result, items[j]);
            }
            break;
        }
        case '{': {
            f++;
            PyObject *dict = PyDict_New();
            while (*f && *f != '}') {
                if (*f == ',' || *f == ' ') { f++; continue; }
                PyObject *key = build_value_item(&f, ap);
                if (!key) return NULL;
                if (*f == ':') f++;
                PyObject *val = build_value_item(&f, ap);
                if (!val) return NULL;
                PyDict_SetItem(dict, key, val);
            }
            if (*f == '}') f++;
            result = dict;
            break;
        }
        default:
            PyErr_Format(PyExc_SystemError,
                         "Py_BuildValue: unsupported format char '%c'", *f);
            return NULL;
    }
    *pf = f;
    return result;
}

PyObject *Py_BuildValue(const char *format, ...) {
    va_list ap;
    va_start(ap, format);

    const char *f = format;
    PyObject *items[32];
    int count = 0;

    while (*f && *f != ':' && *f != ';') {
        if (*f == ',' || *f == ' ') { f++; continue; }
        if (count >= 32) {
            va_end(ap);
            PyErr_SetString(PyExc_SystemError, "Py_BuildValue: too many items");
            return NULL;
        }
        items[count] = build_value_item(&f, &ap);
        if (!items[count]) { va_end(ap); return NULL; }
        count++;
    }
    va_end(ap);

    if (count == 0) return Py_None;
    if (count == 1) return items[0];
    PyObject *tuple = PyTuple_New(count);
    if (!tuple) return NULL;
    for (int j = 0; j < count; j++)
        PyTuple_SetItem(tuple, j, items[j]);
    return tuple;
}

/* --- Number protocol --- */

Py_ssize_t PyNumber_AsSsize_t(PyObject *obj, PyObject *exc) {
    (void)exc;
    return PyLong_AsSsize_t(obj);
}

/* --- Object protocol (hash) --- */

Py_hash_t PyObject_Hash(PyObject *obj) {
    if (obj == NULL) return -1;
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

/* --- Iteration protocol --- */

extern "C" PyObject *PyObject_GetIter(PyObject *obj) {
    if (obj == NULL) return NULL;
    OopType arg = pyobj_oop(obj);
    OopType result = GciPerform(server, "PyObject_GetIter:", &arg, 1);
    if (check_gci_error()) return NULL;
    return addr_to_pyobj(result);
}

extern "C" PyObject *PyIter_Next(PyObject *iterator) {
    if (iterator == NULL) return NULL;
    OopType arg = pyobj_oop(iterator);
    OopType result = GciPerform(server, "PyIter_Next:", &arg, 1);
    if (check_gci_error()) return NULL;
    int64 addr = GciOopToI64(result);
    if (addr == 0) return NULL;  /* exhausted — NULL without error */
    return (PyObject *)(intptr_t)addr;
}

extern "C" int PyIter_Check(PyObject *obj) {
    /* Best effort: anything with __next__ would pass; cheap heuristic is
       to say yes and let PyIter_Next raise if not. Type-level info isn't
       tracked for Smalltalk-backed objects. */
    return obj != NULL;
}

/* --- Integer 64-bit family --- */

extern "C" PyObject *PyLong_FromLongLong(long long v) {
    return PyLong_FromSsize_t((Py_ssize_t)v);
}

extern "C" long long PyLong_AsLongLong(PyObject *obj) {
    if (obj == NULL) return -1;
    return (long long)oopToLongWithIndex(pyobj_oop(obj));
}

extern "C" PyObject *PyLong_FromUnsignedLongLong(unsigned long long v) {
    /* Values above 2^63-1 cannot ride the tagged SmallInteger path;
       extensions in practice pass sizes/flags that fit. Saturate with an
       OverflowError rather than corrupting silently. */
    if (v > (unsigned long long)PY_SSIZE_T_MAX) {
        PyErr_SetString(PyExc_OverflowError,
                        "value too large for the shim's integer path");
        return NULL;
    }
    return PyLong_FromSsize_t((Py_ssize_t)v);
}

extern "C" unsigned long long PyLong_AsUnsignedLongLong(PyObject *obj) {
    if (obj == NULL) return (unsigned long long)-1;
    return (unsigned long long)oopToLongWithIndex(pyobj_oop(obj));
}

extern "C" unsigned long PyLong_AsUnsignedLongMask(PyObject *obj) {
    if (obj == NULL) return (unsigned long)-1;
    return (unsigned long)oopToLongWithIndex(pyobj_oop(obj));
}

extern "C" PyObject *PyLong_FromDouble(double v) {
    return PyLong_FromSsize_t((Py_ssize_t)v);  /* truncates toward zero */
}

extern "C" double PyLong_AsDouble(PyObject *obj) {
    if (obj == NULL) return -1.0;
    return (double)oopToLongWithIndex(pyobj_oop(obj));
}

/* --- Object protocol: PyObject* attribute names --- */

extern "C" PyObject *PyObject_GetAttr(PyObject *obj, PyObject *name) {
    const char *s = PyUnicode_AsUTF8(name);
    if (!s) return NULL;
    return PyObject_GetAttrString(obj, s);
}

extern "C" int PyObject_SetAttr(PyObject *obj, PyObject *name, PyObject *value) {
    const char *s = PyUnicode_AsUTF8(name);
    if (!s) return -1;
    return PyObject_SetAttrString(obj, s, value);
}

extern "C" int PyObject_HasAttr(PyObject *obj, PyObject *name) {
    const char *s = PyUnicode_AsUTF8(name);
    if (!s) return 0;
    return PyObject_HasAttrString(obj, s);
}

/* --- Call helpers --- */

extern "C" PyObject *PyObject_CallNoArgs(PyObject *callable) {
    PyObject *args = PyTuple_New(0);
    if (!args) return NULL;
    return PyObject_Call(callable, args, NULL);
}

extern "C" PyObject *PyObject_CallObject(PyObject *callable, PyObject *args) {
    if (args == NULL) return PyObject_CallNoArgs(callable);
    return PyObject_Call(callable, args, NULL);
}

extern "C" PyObject *PyObject_CallFunctionObjArgs(PyObject *callable, ...) {
    PyObject *items[16];
    int count = 0;
    va_list ap;
    va_start(ap, callable);
    PyObject *arg;
    while ((arg = va_arg(ap, PyObject *)) != NULL && count < 16) {
        items[count++] = arg;
    }
    va_end(ap);
    PyObject *args = PyTuple_New(count);
    if (!args) return NULL;
    for (int i = 0; i < count; i++)
        PyTuple_SetItem(args, i, items[i]);
    return PyObject_Call(callable, args, NULL);
}

extern "C" PyObject *PyObject_CallMethodObjArgs(PyObject *obj, PyObject *name, ...) {
    PyObject *meth = PyObject_GetAttr(obj, name);
    if (!meth) return NULL;
    PyObject *items[16];
    int count = 0;
    va_list ap;
    va_start(ap, name);
    PyObject *arg;
    while ((arg = va_arg(ap, PyObject *)) != NULL && count < 16) {
        items[count++] = arg;
    }
    va_end(ap);
    PyObject *args = PyTuple_New(count);
    if (!args) return NULL;
    for (int i = 0; i < count; i++)
        PyTuple_SetItem(args, i, items[i]);
    return PyObject_Call(meth, args, NULL);
}

/* --- Module helpers --- */

extern "C" int PyModule_AddObject(PyObject *module, const char *name,
                                  PyObject *value) {
    return PyModule_AddObjectRef(module, name, value);
}

extern "C" int PyModule_AddType(PyObject *module, PyTypeObject *type) {
    /* Register so shimCallTyped can find the type by short name. Heap
       types created via PyType_FromModuleAndSpec are already recorded;
       static types arrive here after PyType_Ready. */
    for (int i = 0; i < heap_type_count; i++) {
        if (heap_types[i].type == type) {
            if (heap_types[i].module == NULL)
                heap_types[i].module = module;
            return 0;
        }
    }
    if (heap_type_count < MAX_HEAP_TYPES) {
        int idx = heap_type_count++;
        heap_types[idx].type = type;
        heap_types[idx].module = module;
        heap_types[idx].as_mapping = NULL;
        heap_types[idx].as_sequence = NULL;
        heap_types[idx].as_number = NULL;
        heap_types[idx].as_buffer = NULL;
    }
    return 0;
}

/* --- Unicode additional --- */

extern "C" const char *PyUnicode_AsUTF8AndSize(PyObject *unicode,
                                               Py_ssize_t *size) {
    const char *s = PyUnicode_AsUTF8(unicode);
    if (!s) {
        if (size) *size = 0;
        return NULL;
    }
    if (size) *size = (Py_ssize_t)GciFetchSize_(pyobj_oop(unicode));
    return s;
}

extern "C" PyObject *PyUnicode_DecodeUTF8(const char *s, Py_ssize_t size,
                                          const char *errors) {
    (void)errors;
    return PyUnicode_FromStringAndSize(s, size);
}

extern "C" PyObject *PyUnicode_InternFromString(const char *s) {
    return PyUnicode_FromString(s);
}

extern "C" PyObject *PyUnicode_Concat(PyObject *left, PyObject *right) {
    if (left == NULL || right == NULL) return NULL;
    OopType args[2] = { pyobj_oop(left), pyobj_oop(right) };
    OopType result = GciPerform(server, "PyUnicode_Concat:with:", args, 2);
    if (check_gci_error()) return NULL;
    return addr_to_pyobj(result);
}

/* --- Sequence protocol additional --- */

extern "C" Py_ssize_t PySequence_Size(PyObject *seq) {
    return PyObject_Length(seq);
}

extern "C" int PySequence_Check(PyObject *obj) {
    if (obj == NULL) return 0;
    PyTypeObject *t = Py_TYPE(obj);
    if (t == NULL) return 0;
    if (t->tp_flags & (Py_TPFLAGS_LIST_SUBCLASS | Py_TPFLAGS_TUPLE_SUBCLASS |
                       Py_TPFLAGS_UNICODE_SUBCLASS | Py_TPFLAGS_BYTES_SUBCLASS |
                       Py_TPFLAGS_SEQUENCE))
        return 1;
    if (t->tp_as_sequence && t->tp_as_sequence->sq_item)
        return 1;
    return 0;
}

extern "C" int PySequence_Contains(PyObject *seq, PyObject *item) {
    if (seq == NULL || item == NULL) return -1;
    OopType args[2] = { pyobj_oop(seq), pyobj_oop(item) };
    OopType result = GciPerform(server, "PySequence_Contains:item:", args, 2);
    if (check_gci_error()) return -1;
    return result == OOP_TRUE ? 1 : 0;
}

extern "C" int PySequence_SetItem(PyObject *seq, Py_ssize_t i, PyObject *value) {
    if (PyList_Check(seq)) return PyList_SetItem(seq, i, value);
    PyObject *key = PyLong_FromSsize_t(i);
    if (!key) return -1;
    return PyObject_SetItem(seq, key, value);
}

/* --- Dict additional --- */

extern "C" void PyDict_Clear(PyObject *dict) {
    if (dict == NULL) return;
    OopType arg = pyobj_oop(dict);
    GciPerform(server, "PyDict_Clear:", &arg, 1);
    check_gci_error();
}

static PyObject *dict_view_call(PyObject *dict, const char *selector) {
    if (dict == NULL) return NULL;
    OopType arg = pyobj_oop(dict);
    OopType result = GciPerform(server, selector, &arg, 1);
    if (check_gci_error()) return NULL;
    return addr_to_pyobj(result);
}

extern "C" PyObject *PyDict_Keys(PyObject *dict) {
    return dict_view_call(dict, "PyDict_Keys:");
}

extern "C" PyObject *PyDict_Values(PyObject *dict) {
    return dict_view_call(dict, "PyDict_Values:");
}

extern "C" PyObject *PyDict_Items(PyObject *dict) {
    return dict_view_call(dict, "PyDict_Items:");
}

extern "C" PyObject *PyDict_Copy(PyObject *dict) {
    return dict_view_call(dict, "PyDict_Copy:");
}

extern "C" int PyDict_Merge(PyObject *dict, PyObject *other, int override) {
    if (dict == NULL || other == NULL) return -1;
    OopType args[3] = { pyobj_oop(dict), pyobj_oop(other),
                        override ? OOP_TRUE : OOP_FALSE };
    GciPerform(server, "PyDict_Merge:with:override:", args, 3);
    if (check_gci_error()) return -1;
    return 0;
}

extern "C" int PyDict_Update(PyObject *dict, PyObject *other) {
    return PyDict_Merge(dict, other, 1);
}

extern "C" PyObject *PyDict_SetDefault(PyObject *dict, PyObject *key,
                                       PyObject *defaultobj) {
    if (dict == NULL || key == NULL) return NULL;
    OopType args[3] = { pyobj_oop(dict), pyobj_oop(key),
                        defaultobj ? pyobj_oop(defaultobj) : OOP_NIL };
    OopType result = GciPerform(server, "PyDict_SetDefault:key:default:", args, 3);
    if (check_gci_error()) return NULL;
    return addr_to_pyobj(result);
}

/* --- List / Tuple additional --- */

extern "C" PyObject *PyList_GetSlice(PyObject *list, Py_ssize_t low,
                                     Py_ssize_t high) {
    if (list == NULL) return NULL;
    OopType args[3] = { pyobj_oop(list), GciI64ToOop(low), GciI64ToOop(high) };
    OopType result = GciPerform(server, "PyList_GetSlice:from:to:", args, 3);
    if (check_gci_error()) return NULL;
    return addr_to_pyobj(result);
}

extern "C" PyObject *PyList_AsTuple(PyObject *list) {
    return dict_view_call(list, "PyList_AsTuple:");
}

extern "C" int PyList_Sort(PyObject *list) {
    if (list == NULL) return -1;
    OopType arg = pyobj_oop(list);
    GciPerform(server, "PyList_Sort:", &arg, 1);
    if (check_gci_error()) return -1;
    return 0;
}

extern "C" int PyList_Reverse(PyObject *list) {
    if (list == NULL) return -1;
    OopType arg = pyobj_oop(list);
    GciPerform(server, "PyList_Reverse:", &arg, 1);
    if (check_gci_error()) return -1;
    return 0;
}

extern "C" PyObject *PyTuple_GetSlice(PyObject *tuple, Py_ssize_t low,
                                      Py_ssize_t high) {
    if (tuple == NULL) return NULL;
    OopType args[3] = { pyobj_oop(tuple), GciI64ToOop(low), GciI64ToOop(high) };
    OopType result = GciPerform(server, "PyTuple_GetSlice:from:to:", args, 3);
    if (check_gci_error()) return NULL;
    return addr_to_pyobj(result);
}

/* --- Sets (backed by the Grail `set` class) --- */

extern "C" PyObject *PySet_New(PyObject *iterable) {
    OopType arg = iterable ? pyobj_oop(iterable) : OOP_NIL;
    OopType result = GciPerform(server, "PySet_New:", &arg, 1);
    if (check_gci_error()) return NULL;
    return addr_to_pyobj(result);
}

extern "C" PyObject *PyFrozenSet_New(PyObject *iterable) {
    /* Mutability distinction is not enforced by the shim. */
    return PySet_New(iterable);
}

extern "C" int PySet_Add(PyObject *set, PyObject *key) {
    if (set == NULL || key == NULL) return -1;
    OopType args[2] = { pyobj_oop(set), pyobj_oop(key) };
    GciPerform(server, "PySet_Add:item:", args, 2);
    if (check_gci_error()) return -1;
    return 0;
}

extern "C" int PySet_Contains(PyObject *set, PyObject *key) {
    if (set == NULL || key == NULL) return -1;
    OopType args[2] = { pyobj_oop(set), pyobj_oop(key) };
    OopType result = GciPerform(server, "PySet_Contains:item:", args, 2);
    if (check_gci_error()) return -1;
    return result == OOP_TRUE ? 1 : 0;
}

extern "C" int PySet_Discard(PyObject *set, PyObject *key) {
    if (set == NULL || key == NULL) return -1;
    OopType args[2] = { pyobj_oop(set), pyobj_oop(key) };
    OopType result = GciPerform(server, "PySet_Discard:item:", args, 2);
    if (check_gci_error()) return -1;
    return result == OOP_TRUE ? 1 : 0;
}

extern "C" int PySet_Clear(PyObject *set) {
    if (set == NULL) return -1;
    OopType arg = pyobj_oop(set);
    GciPerform(server, "PySet_Clear:", &arg, 1);
    if (check_gci_error()) return -1;
    return 0;
}

extern "C" Py_ssize_t PySet_Size(PyObject *set) {
    return PyObject_Length(set);
}

extern "C" int PySet_Check(PyObject *obj) {
    if (obj == NULL) return 0;
    OopType arg = pyobj_oop(obj);
    OopType result = GciPerform(server, "PySet_Check:", &arg, 1);
    if (check_gci_error()) return 0;
    return result == OOP_TRUE ? 1 : 0;
}

extern "C" int PyFrozenSet_Check(PyObject *obj) {
    return PySet_Check(obj);
}

extern "C" int PyAnySet_Check(PyObject *obj) {
    return PySet_Check(obj);
}

/* --- Bytearray (backed by the Grail `bytearray` class) --- */

extern "C" PyObject *PyByteArray_FromStringAndSize(const char *data,
                                                   Py_ssize_t len) {
    OopType sizeOop = GciI64ToOop(len);
    OopType oop = GciPerform(OOP_CLASS_BYTE_ARRAY, "new:", &sizeOop, 1);
    if (len > 0) {
        GciStoreBytes(oop, 1, (const ByteType *)data, (int64)len);
    }
    OopType result = GciPerform(server, "PyByteArray_FromStringAndSize:", &oop, 1);
    if (check_gci_error()) return NULL;
    return addr_to_pyobj(result);
}

extern "C" char *PyByteArray_AsString(PyObject *obj) {
    return PyBytes_AsString(obj);
}

extern "C" Py_ssize_t PyByteArray_Size(PyObject *obj) {
    return PyBytes_Size(obj);
}

extern "C" int PyByteArray_Check(PyObject *obj) {
    if (obj == NULL) return 0;
    OopType arg = pyobj_oop(obj);
    OopType result = GciPerform(server, "PyByteArray_Check:", &arg, 1);
    if (check_gci_error()) return 0;
    return result == OOP_TRUE ? 1 : 0;
}

/* --- Capsules (pure C; never cross into Smalltalk) --- */

typedef struct {
    PyObject_HEAD
    void                *pointer;
    const char          *name;
    PyCapsule_Destructor destructor;
} GrailCapsule;

static PyTypeObject GrailCapsule_Type;  /* zero-initialized; identity only */

extern "C" PyObject *PyCapsule_New(void *pointer, const char *name,
                                   PyCapsule_Destructor destructor) {
    if (pointer == NULL) {
        PyErr_SetString(PyExc_ValueError, "PyCapsule_New called with null pointer");
        return NULL;
    }
    if (GrailCapsule_Type.tp_name == NULL)
        GrailCapsule_Type.tp_name = "PyCapsule";
    GrailCapsule *cap = (GrailCapsule *)calloc(1, sizeof(GrailCapsule));
    if (!cap) return PyErr_NoMemory();
    cap->ob_base.ob_refcnt = 1;
    cap->ob_base.ob_type = &GrailCapsule_Type;
    cap->pointer = pointer;
    cap->name = name;
    cap->destructor = destructor;
    return (PyObject *)cap;
}

extern "C" int PyCapsule_CheckExact(PyObject *op) {
    return op != NULL && Py_TYPE(op) == &GrailCapsule_Type;
}

static int capsule_name_matches(GrailCapsule *cap, const char *name) {
    if (cap->name == NULL && name == NULL) return 1;
    if (cap->name == NULL || name == NULL) return 0;
    return strcmp(cap->name, name) == 0;
}

extern "C" void *PyCapsule_GetPointer(PyObject *capsule, const char *name) {
    if (!PyCapsule_CheckExact(capsule)) {
        PyErr_SetString(PyExc_ValueError, "PyCapsule_GetPointer called with invalid PyCapsule object");
        return NULL;
    }
    GrailCapsule *cap = (GrailCapsule *)capsule;
    if (!capsule_name_matches(cap, name)) {
        PyErr_SetString(PyExc_ValueError, "PyCapsule_GetPointer called with incorrect name");
        return NULL;
    }
    return cap->pointer;
}

extern "C" const char *PyCapsule_GetName(PyObject *capsule) {
    if (!PyCapsule_CheckExact(capsule)) {
        PyErr_SetString(PyExc_ValueError, "PyCapsule_GetName called with invalid PyCapsule object");
        return NULL;
    }
    return ((GrailCapsule *)capsule)->name;
}

extern "C" int PyCapsule_IsValid(PyObject *capsule, const char *name) {
    return PyCapsule_CheckExact(capsule) &&
           ((GrailCapsule *)capsule)->pointer != NULL &&
           capsule_name_matches((GrailCapsule *)capsule, name);
}

extern "C" int PyCapsule_SetPointer(PyObject *capsule, void *pointer) {
    if (!PyCapsule_CheckExact(capsule) || pointer == NULL) {
        PyErr_SetString(PyExc_ValueError, "PyCapsule_SetPointer called with invalid arguments");
        return -1;
    }
    ((GrailCapsule *)capsule)->pointer = pointer;
    return 0;
}

/* Minimal datetime C-API table for PyDateTime_IMPORT (NumPy datetime64).
   Layout matches CPython 3.14 datetime.h.  Constructors are stubs for now:
   NumPy stores this pointer at import and only calls through it during
   actual datetime64<->datetime.datetime conversion, which we wire to Grail
   later.  Returning a non-NULL table lets module init proceed. */
typedef struct {
    PyTypeObject *DateType, *DateTimeType, *TimeType, *DeltaType, *TZInfoType;
    PyObject *TimeZone_UTC;
    PyObject *(*Date_FromDate)(int,int,int,PyTypeObject*);
    PyObject *(*DateTime_FromDateAndTime)(int,int,int,int,int,int,int,PyObject*,PyTypeObject*);
    PyObject *(*Time_FromTime)(int,int,int,int,PyObject*,PyTypeObject*);
    PyObject *(*Delta_FromDelta)(int,int,int,int,PyTypeObject*);
    PyObject *(*TimeZone_FromTimeZone)(PyObject*,PyObject*);
    PyObject *(*DateTime_FromTimestamp)(PyObject*,PyObject*,PyObject*);
    PyObject *(*Date_FromTimestamp)(PyObject*,PyObject*);
    PyObject *(*DateTime_FromDateAndTimeAndFold)(int,int,int,int,int,int,int,PyObject*,int,PyTypeObject*);
    PyObject *(*Time_FromTimeAndFold)(int,int,int,int,PyObject*,int,PyTypeObject*);
} ShimDateTimeCAPI;

static PyObject *shim_dt_unsupported(void) {
    PyErr_SetString(PyExc_NotImplementedError,
        "datetime C-API constructor not yet wired to Grail");
    return NULL;
}
/* trampolines with the right signatures, all routing to the stub */
static PyObject *dt_DateFromDate(int a,int b,int c,PyTypeObject*t){(void)a;(void)b;(void)c;(void)t;return shim_dt_unsupported();}
static PyObject *dt_DateTimeFromDateAndTime(int a,int b,int c,int d,int e,int f,int g,PyObject*h,PyTypeObject*i){(void)a;(void)b;(void)c;(void)d;(void)e;(void)f;(void)g;(void)h;(void)i;return shim_dt_unsupported();}
static PyObject *dt_TimeFromTime(int a,int b,int c,int d,PyObject*e,PyTypeObject*f){(void)a;(void)b;(void)c;(void)d;(void)e;(void)f;return shim_dt_unsupported();}
static PyObject *dt_DeltaFromDelta(int a,int b,int c,int d,PyTypeObject*e){(void)a;(void)b;(void)c;(void)d;(void)e;return shim_dt_unsupported();}
static PyObject *dt_TimeZoneFromTimeZone(PyObject*a,PyObject*b){(void)a;(void)b;return shim_dt_unsupported();}
static PyObject *dt_DateTimeFromTimestamp(PyObject*a,PyObject*b,PyObject*c){(void)a;(void)b;(void)c;return shim_dt_unsupported();}
static PyObject *dt_DateFromTimestamp(PyObject*a,PyObject*b){(void)a;(void)b;return shim_dt_unsupported();}
static PyObject *dt_DateTimeFromDateAndTimeAndFold(int a,int b,int c,int d,int e,int f,int g,PyObject*h,int i,PyTypeObject*j){(void)a;(void)b;(void)c;(void)d;(void)e;(void)f;(void)g;(void)h;(void)i;(void)j;return shim_dt_unsupported();}
static PyObject *dt_TimeFromTimeAndFold(int a,int b,int c,int d,PyObject*e,int f,PyTypeObject*g){(void)a;(void)b;(void)c;(void)d;(void)e;(void)f;(void)g;return shim_dt_unsupported();}

extern PyTypeObject PyComplex_Type;  /* any non-null type ptr placeholder */
static ShimDateTimeCAPI shim_datetime_capi = {
    &PyType_Type, &PyType_Type, &PyType_Type, &PyType_Type, &PyType_Type,
    NULL,
    dt_DateFromDate, dt_DateTimeFromDateAndTime, dt_TimeFromTime, dt_DeltaFromDelta,
    dt_TimeZoneFromTimeZone, dt_DateTimeFromTimestamp, dt_DateFromTimestamp,
    dt_DateTimeFromDateAndTimeAndFold, dt_TimeFromTimeAndFold
};

extern "C" void *PyCapsule_Import(const char *name, int no_block) {
    (void)no_block;
    if (name && strcmp(name, "datetime.datetime_CAPI") == 0) {
        return &shim_datetime_capi;
    }
    PyErr_Format(PyExc_ImportError, "PyCapsule_Import('%s') not supported", name);
    return NULL;
}

/* ====================================================================
 * GCI User Action registration (keep at end of file)
 * ==================================================================== */

/* Diagnostic user action: minimal ST -> userAction(C) -> callback(ST)
   reentrancy probe, isolated from dlopen/PyInit.  Calls the server's
   ___wrapProbe___: on the given object and returns the GCI error number
   (0 = clean).  Lets us test which object kinds trip 2079 at a SINGLE
   level of user-action reentrancy. */
static OopType shim_wrap_at_depth(OopType valOop, long depth)
{
    /* Recurse `depth` C frames, then do the wrap callback — tests whether
       raw C-stack depth (independent of dlopen/PyInit) is what trips 2079. */
    char pad[256];                 /* keep a real frame, defeat tail-call */
    pad[0] = (char)depth;
    if (depth > 0) {
        OopType r = shim_wrap_at_depth(valOop, depth - 1);
        return (OopType)(r + (OopType)pad[0] - (OopType)pad[0]);
    }
    GciErrSType eClear; GciErr(&eClear);
    OopType r = GciPerform(server, "___wrapProbe___:", &valOop, 1);
    (void)r;
    GciErrSType e;
    long num = GciErr(&e) ? (long)e.number : 0;
    return GciI64ToOop(num);
}

static OopType shimWrapProbe(OopType valOop, OopType depthOop)
{
    long depth = (long)GciOopToI64(depthOop);
    return shim_wrap_at_depth(valOop, depth);
}

extern "C" void GciUserActionInit(void) {
    server   = OOP_NIL;
    none_oop = 0;
    true_oop = 0;
    false_oop = 0;

    init_types();
    GCI_DECLARE_ACTION("shimWrapProbe", shimWrapProbe, 2);

    GCI_DECLARE_ACTION("shimCall", shimCall, 8);
    GCI_DECLARE_ACTION("shimCallTyped", shimCallTyped, 8);
    GCI_DECLARE_ACTION("shimLoadModule", shimLoadModule, 1);
    GCI_DECLARE_ACTION("shimInit", shimInit, 4);
    GCI_DECLARE_ACTION("shimTypeAddr", shimTypeAddr, 1);
    GCI_DECLARE_ACTION("shimDynLoad", shimDynLoad, 2);
    GCI_DECLARE_ACTION("shimModuleAttrs", shimModuleAttrs, 1);
    GCI_DECLARE_ACTION("shimCallKw", shimCallKw, 5);
}

extern "C" void GciUserActionShutdown(void) {
    buffer_cache_clear();
    num_modules = 0;
}
