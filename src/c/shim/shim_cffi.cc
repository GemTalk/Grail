/* shim_cffi.cc — the CPython 3.14 entry points cffi's backend needs beyond the
 * base shim, shim_numpy.cc and shim_pyo3.cc.
 *
 * Written for _cffi_backend (cffi 2.1.1), which argon2-cffi-bindings -- and so
 * pwdlib's recommended hasher, FastAPI's OAuth2 tutorials -- loads first.
 * Its dlopen failed on the first DATA symbol missing (Py_FileSystemDefaultEncoding);
 * 24 were missing in all.  On macOS a missing FUNCTION binds lazily and aborts
 * on first call, so every one exists here before anything is measured.
 *
 * The gem is ONE interpreter running ONE Python thread inside a user action
 * (see the thread-state blocks in shim_numpy.cc), so the thread, lock and GIL
 * entry points describe exactly that: the one thread state, an interpreter
 * that is always the main one, locks that are always free.
 */
#include "cpython.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdarg.h>

/* cpython.h spells this one as a macro for the shim's own C modules; a
   prebuilt wheel links it as a FUNCTION, defined below. */
#undef _PyObject_GC_NewVar

#ifndef GRAIL_PYCOMPAT_TYPES
#define GRAIL_PYCOMPAT_TYPES
typedef struct _grail_ts PyThreadState;
typedef struct _grail_is PyInterpreterState;
#endif

extern "C" {

/* Exported by cpython.cc / shim_numpy.cc but not declared in cpython.h. */
PyObject *PyImport_ImportModule(const char *name);
PyObject *PyModuleDef_Init(PyModuleDef *def);
PyThreadState *PyThreadState_Get(void);
PyInterpreterState *PyInterpreterState_Main(void);
void PyErr_WriteUnraisable(PyObject *obj);
PyVarObject *_PyObject_NewVar(PyTypeObject *type, Py_ssize_t nitems);

/* ====================================================================
 * Data
 * ==================================================================== */

/* What os.fsencode uses; Grail's filesystem encoding is UTF-8. */
const char *Py_FileSystemDefaultEncoding = "utf-8";


/* ====================================================================
 * Modules
 * ==================================================================== */

/* SINGLE-phase init.  The shim never builds a separate module object -- the
   def IS the module (PyModuleDef_Init in cpython.cc) -- so creating one is
   stamping the def.  The init function then adds its attributes to it the
   usual way, and a def with no m_slots runs no exec phase. */
PyObject *PyModule_Create2(PyModuleDef *def, int apiver) {
    (void)apiver;
    return PyModuleDef_Init(def);
}

/* ====================================================================
 * Threads, the interpreter and the GIL
 * ==================================================================== */

PyThreadState *PyGILState_GetThisThreadState(void) { return PyThreadState_Get(); }
PyInterpreterState *PyThreadState_GetInterpreter(PyThreadState *ts) {
    (void)ts;
    return PyInterpreterState_Main();
}
PyInterpreterState *PyInterpreterState_Get(void) { return PyInterpreterState_Main(); }

/* The one thread state is static; nothing to clear or free. */
void PyThreadState_Clear(PyThreadState *ts) { (void)ts; }
void PyThreadState_Delete(PyThreadState *ts) { (void)ts; }

/* Per-thread and per-interpreter scratch dicts.  cffi keeps its per-thread
   errno and its interpreter-wide caches here.  One of each, made on first
   use and held for the life of the library, since there is one of each. */
static PyObject *g_tstate_dict = NULL;
static PyObject *g_interp_dict = NULL;

PyObject *PyThreadState_GetDict(void) {
    if (g_tstate_dict == NULL) g_tstate_dict = PyDict_New();
    return g_tstate_dict;                  /* borrowed, as in CPython */
}
PyObject *PyInterpreterState_GetDict(PyInterpreterState *interp) {
    (void)interp;
    if (g_interp_dict == NULL) g_interp_dict = PyDict_New();
    return g_interp_dict;                  /* borrowed, as in CPython */
}

/* Locks.  A user action runs one Python thread at a time, so a lock taken
   inside it is never contended: acquire always succeeds at once.  Allocation
   and freeing live in shim_numpy.cc. */
typedef void *PyThread_type_lock;
int PyThread_acquire_lock(PyThread_type_lock lock, int waitflag) {
    (void)lock; (void)waitflag;
    return 1;                              /* PY_LOCK_ACQUIRED */
}
void PyThread_release_lock(PyThread_type_lock lock) { (void)lock; }

/* ====================================================================
 * Objects
 * ==================================================================== */

PyVarObject *_PyObject_GC_NewVar(PyTypeObject *type, Py_ssize_t nitems) {
    return _PyObject_NewVar(type, nitems);
}

/* CPython's pointer hash: the address rotated right by 4, never -1. */
Py_hash_t Py_HashPointer(const void *ptr) {
    size_t y = (size_t)ptr;
    y = (y >> 4) | (y << (8 * sizeof(void *) - 4));
    Py_hash_t x = (Py_hash_t)y;
    return x == -1 ? -2 : x;
}

/* -1, 0 or 1. */
int _PyLong_Sign(PyObject *v) {
    PyObject *zero = PyLong_FromLong(0);
    if (zero == NULL) return 0;
    int lt = PyObject_RichCompareBool(v, zero, Py_LT);
    int gt = lt == 1 ? 0 : PyObject_RichCompareBool(v, zero, Py_GT);
    Py_DECREF(zero);
    return lt == 1 ? -1 : (gt == 1 ? 1 : 0);
}

/* Contiguity of a buffer in C ('C'), Fortran ('F') or either ('A') order.  A
   buffer without strides is C-contiguous by definition. */
static int buffer_is_c_contiguous(const Py_buffer *view) {
    if (view->strides == NULL) return 1;
    Py_ssize_t sd = view->itemsize;
    for (int i = view->ndim - 1; i >= 0; i--) {
        if (view->shape[i] > 1 && view->strides[i] != sd) return 0;
        sd *= view->shape[i];
    }
    return 1;
}
static int buffer_is_f_contiguous(const Py_buffer *view) {
    if (view->strides == NULL) return view->ndim <= 1;
    Py_ssize_t sd = view->itemsize;
    for (int i = 0; i < view->ndim; i++) {
        if (view->shape[i] > 1 && view->strides[i] != sd) return 0;
        sd *= view->shape[i];
    }
    return 1;
}
int PyBuffer_IsContiguous(const Py_buffer *view, char order) {
    if (view->suboffsets != NULL) return 0;
    if (order == 'C') return buffer_is_c_contiguous(view);
    if (order == 'F') return buffer_is_f_contiguous(view);
    if (order == 'A')
        return buffer_is_c_contiguous(view) || buffer_is_f_contiguous(view);
    return 0;
}

/* ====================================================================
 * Strings
 * ==================================================================== */

/* Latin-1 maps each byte to the code point of the same value: widen it to
   UTF-8 and decode that. */
PyObject *PyUnicode_DecodeLatin1(const char *s, Py_ssize_t size, const char *errors) {
    (void)errors;
    char *buf = (char *)malloc((size_t)size * 2 + 1);
    if (buf == NULL) return PyErr_NoMemory();
    Py_ssize_t n = 0;
    for (Py_ssize_t i = 0; i < size; i++) {
        unsigned char c = (unsigned char)s[i];
        if (c < 0x80) {
            buf[n++] = (char)c;
        } else {
            buf[n++] = (char)(0xC0 | (c >> 6));
            buf[n++] = (char)(0x80 | (c & 0x3F));
        }
    }
    PyObject *r = PyUnicode_DecodeUTF8(buf, n, "strict");
    free(buf);
    return r;
}

/* ====================================================================
 * Errors
 * ==================================================================== */

/* PyErr_WriteUnraisable with a formatted context message, as 3.13 added. */
void PyErr_FormatUnraisable(const char *format, ...) {
    if (format != NULL) {
        va_list ap;
        va_start(ap, format);
        fputs("Exception ignored: ", stderr);
        vfprintf(stderr, format, ap);
        fputc('\n', stderr);
        va_end(ap);
    }
    PyErr_WriteUnraisable(NULL);
}


/* ====================================================================
 * Weak references -- through Grail's own weakref module
 * ==================================================================== */

PyObject *PyWeakref_NewRef(PyObject *ob, PyObject *callback) {
    PyObject *mod = PyImport_ImportModule("weakref");
    if (mod == NULL) return NULL;
    PyObject *ref = PyObject_GetAttrString(mod, "ref");
    Py_DECREF(mod);
    if (ref == NULL) return NULL;
    PyObject *r = (callback == NULL || callback == Py_None)
        ? PyObject_CallFunctionObjArgs(ref, ob, NULL)
        : PyObject_CallFunctionObjArgs(ref, ob, callback, NULL);
    Py_DECREF(ref);
    return r;
}

/* 3.13's strong-reference getter: 1 and a new reference while the referent
   lives, 0 and NULL once it is gone, -1 on error. */
int PyWeakref_GetRef(PyObject *ref, PyObject **pobj) {
    PyObject *r = PyObject_CallFunctionObjArgs(ref, NULL);
    if (r == NULL) { *pobj = NULL; return -1; }
    if (r == Py_None) { Py_DECREF(r); *pobj = NULL; return 0; }
    *pobj = r;
    return 1;
}

}  /* extern "C" */
