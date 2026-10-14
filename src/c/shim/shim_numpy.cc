/* shim_numpy.cc — NumPy (cp314) entry points beyond the base shim.
 * These began as log-once diagnostic stubs (STUBLOG) that answered as if they
 * had succeeded, to locate the first behavioral wall in
 * PyInit__multiarray_umath.  A stub that "succeeds" is a wrong answer waiting
 * to be found, so every one is now real; STUBLOG remains for the next entry
 * point a wheel needs that has no implementation yet. */
#include "cpython.h"
#include <stdio.h>
#include <stdarg.h>
#include <stdint.h>
#include <stdlib.h>
#include <string.h>
#include <errno.h>
#ifdef PyMem_Malloc
#undef PyMem_Malloc
#endif
#ifdef PyMem_Free
#undef PyMem_Free
#endif
#ifdef PyMem_Realloc
#undef PyMem_Realloc
#endif
#ifdef PyObject_Malloc
#undef PyObject_Malloc
#endif
#ifdef PyObject_Free
#undef PyObject_Free
#endif
#ifdef PyObject_Realloc
#undef PyObject_Realloc
#endif
#ifdef PyErr_CheckSignals
#undef PyErr_CheckSignals
#endif
#ifdef _PyObject_GC_New
#undef _PyObject_GC_New
#endif
#ifdef _PyErr_BadInternalCall
#undef _PyErr_BadInternalCall
#endif
#ifndef PY_CXX_CONST
#define PY_CXX_CONST
#endif
typedef int PyGILState_STATE;
#ifndef GRAIL_PYCOMPAT_TYPES
#define GRAIL_PYCOMPAT_TYPES
typedef struct { double real; double imag; } Py_complex;
typedef struct _grail_ts PyThreadState;
typedef struct _grail_is PyInterpreterState;
typedef struct _grail_mutex { uint8_t _b; } PyMutex;
#endif
#ifndef Py_hash_t
typedef Py_ssize_t Py_hash_t;
#endif
static void shim_stub_log(const char*n){fprintf(stderr,"SHIM-STUB-HIT: %s\n",n);}
#define STUBLOG(n) do{static int _w=0;if(!_w){_w=1;shim_stub_log(n);}}while(0)

/* ---- helpers for the entry points below ---- */
extern "C" PyObject *PyObject_CallMethod(PyObject *, const char *, const char *, ...);  /* cpython.cc */
extern "C" PyObject *PyNumber_Add(PyObject *, PyObject *);                              /* cpython.cc */
extern "C" PyObject *PyNumber_Multiply(PyObject *, PyObject *);                         /* cpython.cc */

/* builtins.<name>(*args) / <module>.<attr>(*args), Py_BuildValue-style. */
static PyObject *grail_call_attr_v(const char *module, const char *attr, const char *fmt, va_list va) {
    PyObject *m = PyImport_ImportModule(module);
    if (m == NULL) return NULL;
    PyObject *f = PyObject_GetAttrString(m, attr);
    Py_DECREF(m);
    if (f == NULL) return NULL;
    /* Always a tuple, even for one unit: "(O)", so a tuple argument is
       passed as one argument rather than spread. */
    char tfmt[64];
    snprintf(tfmt, sizeof tfmt, "(%s)", fmt);
    PyObject *args = Py_VaBuildValue(tfmt, va);
    if (args == NULL) { Py_DECREF(f); return NULL; }
    PyObject *r = PyObject_CallObject(f, args);
    Py_DECREF(args);
    Py_DECREF(f);
    return r;
}
static PyObject *grail_call_builtin(const char *name, const char *fmt, ...) {
    va_list va;
    va_start(va, fmt);
    PyObject *r = grail_call_attr_v("builtins", name, fmt, va);
    va_end(va);
    return r;
}
static PyObject *grail_call_module_attr(const char *module, const char *attr, const char *fmt, ...) {
    va_list va;
    va_start(va, fmt);
    PyObject *r = grail_call_attr_v(module, attr, fmt, va);
    va_end(va);
    return r;
}

/* type(*args) as a GRAIL exception when type is one of the shim's own static
   exception types: calling the type from C runs its tp_new and builds a
   C-level exception object, which raises as its text alone (an OSError with
   no errno, not the FileNotFoundError OSError(2, ...) is in Python).  Any
   other type is called. */
extern "C" const char *_grail_static_exc_name(PyObject *type);           /* cpython.cc */
extern "C" PyObject *_grail_call_in_grail(PyObject *callable, PyObject *args); /* cpython.cc */
static PyObject *grail_new_exception(PyObject *type, PyObject *args) {
    if (_grail_static_exc_name(type) != NULL) return _grail_call_in_grail(type, args);
    return PyObject_CallObject(type, args);
}

/* isinstance(obj, cls): 1, 0, or -1 with an error. */
static int grail_isinstance(PyObject *obj, PyObject *cls) {
    PyObject *r = grail_call_builtin("isinstance", "OO", obj, cls);
    if (r == NULL) return -1;
    int t = PyObject_IsTrue(r);
    Py_DECREF(r);
    return t;
}

/* PyErr_Print / PyErr_WriteUnraisable: "<Type>: <message>" to stderr, after
   "Exception ignored in: <obj>" for an unraisable one.  No traceback: the
   traceback module formats with generators, and a generator cannot run in a
   C callback (its body needs a GsProcess switch, error 6011). */
static void grail_report_exception(PyObject *unraisableObj, PyObject *type, PyObject *value) {
    (void)type;
    if (unraisableObj != NULL) {
        PyObject *r = PyObject_Repr(unraisableObj);
        const char *t = r == NULL ? NULL : PyUnicode_AsUTF8(r);
        fprintf(stderr, "Exception ignored in: %s\n", t == NULL ? "<object repr() failed>" : t);
        Py_XDECREF(r);
        PyErr_Clear();
    }
    const char *tn = NULL, *msg = NULL;
    PyObject *cls = value == NULL ? NULL : PyObject_GetAttrString(value, "__class__");
    PyObject *nm = cls == NULL ? NULL : PyObject_GetAttrString(cls, "__name__");
    PyObject *s = value == NULL ? NULL : PyObject_Str(value);
    tn = nm == NULL ? NULL : PyUnicode_AsUTF8(nm);
    msg = s == NULL ? NULL : PyUnicode_AsUTF8(s);
    if (msg != NULL && msg[0] != '\0')
        fprintf(stderr, "%s: %s\n", tn == NULL ? "Exception" : tn, msg);
    else
        fprintf(stderr, "%s\n", tn == NULL ? "Exception" : tn);
    fflush(stderr);
    Py_XDECREF(cls); Py_XDECREF(nm); Py_XDECREF(s);
    PyErr_Clear();
}

/* Encode code point c as UTF-8 at out; answers the byte count. */
static size_t grail_utf8_put(char *out, uint32_t c) {
    if (c < 0x80) { out[0] = (char)c; return 1; }
    if (c < 0x800) { out[0] = (char)(0xC0 | (c >> 6)); out[1] = (char)(0x80 | (c & 0x3F)); return 2; }
    if (c < 0x10000) {
        out[0] = (char)(0xE0 | (c >> 12)); out[1] = (char)(0x80 | ((c >> 6) & 0x3F));
        out[2] = (char)(0x80 | (c & 0x3F)); return 3;
    }
    out[0] = (char)(0xF0 | (c >> 18)); out[1] = (char)(0x80 | ((c >> 12) & 0x3F));
    out[2] = (char)(0x80 | ((c >> 6) & 0x3F)); out[3] = (char)(0x80 | (c & 0x3F)); return 4;
}

/* The code points of str u: their count, and when buf is not NULL the first
   cap of them stored there.  -1 with an error when u is not a str. */
static Py_ssize_t grail_utf8_to_ucs4(PyObject *u, Py_UCS4 *buf, Py_ssize_t cap) {
    Py_ssize_t n = 0;
    const char *s = PyUnicode_AsUTF8AndSize(u, &n);
    if (s == NULL) return -1;
    const unsigned char *p = (const unsigned char *)s, *e = p + n;
    Py_ssize_t count = 0;
    while (p < e) {
        uint32_t c = *p++;
        int more = c >= 0xF0 ? 3 : c >= 0xE0 ? 2 : c >= 0xC0 ? 1 : 0;
        if (more) c &= (0x3F >> more);
        while (more-- > 0 && p < e) c = (c << 6) | (*p++ & 0x3F);
        if (buf != NULL && count < cap) buf[count] = c;
        count++;
    }
    return count;
}

/* chr(ch).<method>() for the _PyUnicode_Is* character classes, so a wheel
   classifies characters by the same tables Grail's str does. */
static int grail_char_predicate(Py_UCS4 ch, const char *method) {
    char buf[4];
    size_t n = grail_utf8_put(buf, ch);
    PyObject *s = PyUnicode_FromStringAndSize(buf, (Py_ssize_t)n);
    if (s == NULL) { PyErr_Clear(); return 0; }
    PyObject *r = PyObject_CallMethod(s, method, NULL);
    Py_DECREF(s);
    if (r == NULL) { PyErr_Clear(); return 0; }
    int t = PyObject_IsTrue(r);
    Py_DECREF(r);
    return t > 0;
}
/* PyArg_ParseTupleAndKeywords / PyArg_VaParseTupleAndKeywords implemented in
   cpython.cc (shared vparse_kw core with PyArg_ParseTuple). */
extern "C" int PyBytes_AsStringAndSize(PyObject *obj, char **s, Py_ssize_t *len) {
    char *p = PyBytes_AsString(obj);
    if (p == NULL) return -1;
    Py_ssize_t n = PyBytes_Size(obj);
    if (n < 0) return -1;
    if (len != NULL) *len = n;
    else if ((Py_ssize_t)strlen(p) != n) {
        PyErr_SetString(PyExc_ValueError, "embedded null byte");
        return -1;
    }
    *s = p;
    return 0;
}
extern "C" PyObject * PyBytes_FromString(const char *v) {
    return PyBytes_FromStringAndSize(v, (Py_ssize_t)strlen(v));
}
/* The complex number API, over Grail's own complex.  Real values come from
   ``.real'' / ``.imag'', which int, float and complex all answer as CPython's
   do.  An object without them -- numpy's own scalars cross as foreign
   proxies -- is read as a real number through PyFloat_AsDouble, which reaches
   its nb_float slot.  These were log-once stubs answering 0 with no error
   set, so a caller could not tell a failure from a zero. */
static int complex_part(PyObject *op, const char *part, double *out) {
    PyObject *v = PyObject_GetAttrString(op, part);
    if (v == NULL) { PyErr_Clear(); return 0; }
    double d = PyFloat_AsDouble(v);
    Py_DECREF(v);
    if (d == -1.0 && PyErr_Occurred()) return -1;
    *out = d;
    return 1;
}
extern "C" double PyComplex_RealAsDouble(PyObject *op) {
    double d;
    int got = complex_part(op, "real", &d);
    if (got < 0) return -1.0;
    return got ? d : PyFloat_AsDouble(op);
}
extern "C" double PyComplex_ImagAsDouble(PyObject *op) {
    double d;
    int got = complex_part(op, "imag", &d);
    if (got < 0) return -1.0;
    return got ? d : 0.0;
}
extern "C" Py_complex PyComplex_AsCComplex(PyObject *op) {
    Py_complex z = { -1.0, 0.0 };
    double re, im;
    int gotRe = complex_part(op, "real", &re);
    if (gotRe < 0) return z;
    int gotIm = gotRe ? complex_part(op, "imag", &im) : 0;
    if (gotIm < 0) return z;
    if (!gotRe) {
        re = PyFloat_AsDouble(op);
        if (re == -1.0 && PyErr_Occurred()) return z;
    }
    z.real = re;
    z.imag = gotIm ? im : 0.0;
    return z;
}
extern "C" PyObject * PyComplex_FromDoubles(double real, double imag) {
    PyObject *builtins = PyImport_ImportModule("builtins");
    if (builtins == NULL) return NULL;
    PyObject *complexType = PyObject_GetAttrString(builtins, "complex");
    if (complexType == NULL) return NULL;
    PyObject *z = PyObject_CallFunction(complexType, "dd", real, imag);
    Py_DECREF(complexType);
    return z;
}
extern "C" PyObject * PyComplex_FromCComplex(Py_complex c) {
    return PyComplex_FromDoubles(c.real, c.imag);
}
/* PyContextVar_New / _Get / _Set are implemented for real in cpython.cc
   (they delegate to the Grail contextvars.ContextVar class) — not stubbed. */
extern "C" int PyDict_ContainsString(PyObject *mp, const char *key) {
    PyObject *k = PyUnicode_FromString(key);
    if (k == NULL) return -1;
    int r = PyDict_Contains(mp, k);
    Py_DECREF(k);
    return r;
}
/* Was a stub answering success without deleting anything. */
extern "C" int PyDict_DelItemString(PyObject *dp, const char *key) {
    PyObject *k = PyUnicode_FromString(key);
    if (k == NULL) return -1;
    return PyDict_DelItem(dp, k);
}
/* CPython 3.13+ strong-ref dict lookups: return 1 (found, *result=new ref),
   0 (absent, *result=NULL), or -1 (error). */
extern "C" int PyDict_GetItemRef(PyObject *mp, PyObject *key, PyObject **result) {
    PyObject *v = PyDict_GetItem(mp, key);
    if (v) { Py_INCREF(v); *result = v; return 1; }
    *result = NULL;
    return PyErr_Occurred() ? -1 : 0;
}
/* CPython 3.13+ setdefault with a strong reference: 0 when the default was
   inserted, 1 when the key was already present, -1 on error.  *result, when
   asked for, is a new reference to the value now in the dict. */
extern "C" int PyDict_SetDefaultRef(PyObject *mp, PyObject *key, PyObject *dflt,
                                    PyObject **result) {
    if (result) *result = NULL;
    int present = PyDict_Contains(mp, key);
    if (present < 0) return -1;
    PyObject *v = PyDict_SetDefault(mp, key, dflt);
    if (v == NULL) return -1;
    if (result) { Py_INCREF(v); *result = v; }
    return present ? 1 : 0;
}
/* CPython invalidates its per-type method cache here.  The shim keeps no
   such cache, so there is nothing to invalidate. */
extern "C" void PyType_Modified(PyTypeObject *type) {
    (void)type;
}
extern "C" int PyDict_GetItemStringRef(PyObject *mp, const char *key, PyObject **result) {
    PyObject *v = PyDict_GetItemString(mp, key);
    if (v) { Py_INCREF(v); *result = v; return 1; }
    *result = NULL;
    return PyErr_Occurred() ? -1 : 0;
}
extern "C" int PyErr_CheckSignals(void) {
    return 0;
}
extern "C" PyObject * PyErr_FormatV(PyObject *exception, const char *format, va_list vargs) {
    PyObject *msg = PyUnicode_FromFormatV(format, vargs);
    if (msg != NULL) {
        PyErr_SetObject(exception, msg);
        Py_DECREF(msg);
    }
    return NULL;
}
extern "C" void PyErr_NormalizeException(PyObject **exc, PyObject **val, PyObject **tb) {
    (void)tb;
    if (exc == NULL || *exc == NULL || val == NULL) return;
    /* PyErr_Fetch can answer the message text rather than an instance. */
    if (*val != NULL && grail_isinstance(*val, *exc) == 1) return;
    PyObject *args = *val == NULL ? PyTuple_New(0) : PyTuple_Pack(1, *val);
    if (args == NULL) { PyErr_Clear(); return; }
    PyObject *inst = grail_new_exception(*exc, args);
    Py_DECREF(args);
    if (inst == NULL) { PyErr_Clear(); return; }
    *val = inst;
}
extern "C" void PyErr_Print(void) {
    PyObject *t = NULL, *v = NULL, *tb = NULL;
    PyErr_Fetch(&t, &v, &tb);
    if (t == NULL) return;
    PyErr_NormalizeException(&t, &v, &tb);
    grail_report_exception(NULL, t, v);
}
extern "C" PyObject * PyErr_SetFromErrno(PyObject *type) {
    int e = errno;
    PyObject *args = Py_BuildValue("(is)", e, strerror(e));
    if (args == NULL) return NULL;
    PyObject *inst = grail_new_exception(type, args);
    Py_DECREF(args);
    if (inst != NULL) {
        PyErr_SetObject(type, inst);
        Py_DECREF(inst);
    }
    return NULL;
}
extern "C" int PyErr_WarnFormat(PyObject *category, Py_ssize_t stack_level, const char *format, ...) {
    va_list va;
    va_start(va, format);
    PyObject *msg = PyUnicode_FromFormatV(format, va);
    va_end(va);
    if (msg == NULL) return -1;
    const char *text = PyUnicode_AsUTF8(msg);
    int r = text == NULL ? -1 : PyErr_WarnEx(category, text, stack_level);
    Py_DECREF(msg);
    return r;
}
extern "C" void PyErr_WriteUnraisable(PyObject *obj) {
    PyObject *t = NULL, *v = NULL, *tb = NULL;
    PyErr_Fetch(&t, &v, &tb);
    if (t == NULL) return;
    PyErr_NormalizeException(&t, &v, &tb);
    grail_report_exception(obj == NULL ? Py_None : obj, t, v);
}
/* vars(builtins): PyModule_GetDict of Grail's builtins module holds none of
   its functions.  Kept, because the reference is borrowed, as in CPython. */
extern "C" PyObject * PyEval_GetBuiltins(void) {
    static PyObject *cached = NULL;
    if (cached != NULL) return cached;
    PyObject *b = PyImport_ImportModule("builtins");
    if (b == NULL) return NULL;
    cached = grail_call_builtin("vars", "O", b);
    Py_DECREF(b);
    return cached;
}
extern "C" void PyEval_RestoreThread(PyThreadState *) {
    (void)0;
}
extern "C" PyThreadState * PyEval_SaveThread(void) {
    return 0;
}
extern "C" void PyException_SetCause(PyObject *exc, PyObject *cause) {
    /* Steals cause; sets __suppress_context__, as raise ... from does. */
    if (PyObject_SetAttrString(exc, "__cause__", cause == NULL ? Py_None : cause) < 0
            || PyObject_SetAttrString(exc, "__suppress_context__", Py_True) < 0)
        PyErr_Clear();
}
extern "C" void PyException_SetContext(PyObject *exc, PyObject *ctx) {
    if (PyObject_SetAttrString(exc, "__context__", ctx == NULL ? Py_None : ctx) < 0)
        PyErr_Clear();
}
extern "C" int PyException_SetTraceback(PyObject *exc, PyObject *tb) {
    return PyObject_SetAttrString(exc, "__traceback__", tb == NULL ? Py_None : tb);
}
extern "C" PyObject* PyFloat_FromString(PyObject *v) {
    return grail_call_builtin("float", "O", v);
}
extern "C" PyGILState_STATE PyGILState_Ensure(void) {
    return 0;
}
extern "C" void PyGILState_Release(PyGILState_STATE) {
    (void)0;
}
/* PyImport_Import lives in cpython.cc (it needs is_foreign). */
/* ONE interpreter and ONE thread state, both zeroed static blocks: what the
   gem is, as far as a wheel can ask.  A wheel reads a thread state's fields
   inline -- numpy's _reload_guard compares ``PyThreadState_Get()->interp''
   with PyInterpreterState_Main(), and both were stubs answering NULL, so
   ``import numpy'' died on that read.  CPython 3.14's PyThreadState begins
   prev, next, interp; the blocks are far larger than either struct, so any
   other field a wheel reads is zero (no frame, no exception, depth 0). */
static union { char bytes[8192]; void *align; } g_shim_interp;
static union {
    char bytes[8192];
    struct { void *prev; void *next; void *interp; } head;
} g_shim_tstate = { .head = { NULL, NULL, &g_shim_interp } };
extern "C" PyInterpreterState * PyInterpreterState_Main(void) {
    return (PyInterpreterState *)&g_shim_interp;
}
/* PyList_GetItemRef implemented in cpython.cc (strong-ref PyList_GetItem). */
/* PyLong_AsLongAndOverflow lives in cpython.cc. */
/* long and long long are the same width on the platforms the shim builds
   for (LP64), so this is PyLong_AsLongAndOverflow (cpython.cc).  It was a
   stub answering 0 with *overflow never written, and numpy's comparison of
   an integer array with a Python int (special_integer_comparisons.cpp)
   read the garbage as "out of range": np.arange(3) == 1 was all False. */
extern "C" long PyLong_AsLongAndOverflow(PyObject *, int *);
extern "C" long long PyLong_AsLongLongAndOverflow(PyObject *obj, int *overflow) {
    static_assert(sizeof(long) == sizeof(long long), "LP64 only");
    return (long long)PyLong_AsLongAndOverflow(obj, overflow);
}
extern "C" void * PyLong_AsVoidPtr(PyObject *v) {
    /* A negative int converts too, as in CPython. */
    unsigned long long u = PyLong_AsUnsignedLongLong(v);
    if (u == (unsigned long long)-1 && PyErr_Occurred()) {
        PyErr_Clear();
        long long l = PyLong_AsLongLong(v);
        if (l == -1 && PyErr_Occurred()) return NULL;
        return (void *)(intptr_t)l;
    }
    return (void *)(uintptr_t)u;
}
extern "C" PyObject* PyLong_FromUnicodeObject(PyObject *u, int base) {
    return grail_call_builtin("int", "Oi", u, base);
}
extern "C" PyObject * PyLong_FromVoidPtr(void *p) {
    return PyLong_FromUnsignedLongLong((unsigned long long)(uintptr_t)p);
}
extern "C" int PyLong_IsZero(PyObject *obj) {
    PyObject *zero = PyLong_FromLong(0);
    if (zero == NULL) return -1;
    int r = PyObject_RichCompareBool(obj, zero, Py_EQ);
    Py_DECREF(zero);
    return r;
}
extern "C" PyObject * PyMapping_GetItemString(PyObject *o, const char *key) {
    PyObject *k = PyUnicode_FromString(key);
    if (k == NULL) return NULL;
    PyObject *r = PyObject_GetItem(o, k);
    Py_DECREF(k);
    return r;
}
extern "C" void * PyMem_Calloc(size_t nelem, size_t elsize) {
    return calloc(nelem, elsize);
}
extern "C" void PyMem_Free(void *ptr) {
    free(ptr);
}
extern "C" void * PyMem_Malloc(size_t size) {
    return malloc(size);
}
extern "C" void * PyMem_RawCalloc(size_t nelem, size_t elsize) {
    return calloc(nelem, elsize);
}
extern "C" void PyMem_RawFree(void *ptr) {
    free(ptr);
}
extern "C" void * PyMem_RawMalloc(size_t size) {
    return malloc(size);
}
extern "C" void * PyMem_RawRealloc(void *ptr, size_t new_size) {
    return realloc(ptr, new_size);
}
extern "C" void * PyMem_Realloc(void *ptr, size_t new_size) {
    return realloc(ptr, new_size);
}
extern "C" PyObject * PyMemoryView_FromObject(PyObject *base) {
    return grail_call_builtin("memoryview", "O", base);
}
extern "C" PyObject * PyMethod_New(PyObject *func, PyObject *self) {
    return grail_call_module_attr("types", "MethodType", "OO", func, self);
}
extern "C" void PyMutex_Lock(PyMutex *m) {
    (void)0;
}
extern "C" void PyMutex_Unlock(PyMutex *m) {
    (void)0;
}
/* float(o): pass through floats; otherwise coerce via the server's
   double conversion (applies __float__/__index__ on the Grail side). */
extern "C" PyObject * PyNumber_Float(PyObject *o) {
    if (o == NULL) return NULL;
    if (PyFloat_Check(o)) { Py_INCREF(o); return o; }
    return PyFloat_FromDouble(PyFloat_AsDouble(o));
}
/* int(o): already-int passes through; otherwise coerce via the server's
   Py_ssize_t conversion (which applies __index__/__int__ on the Grail side). */
extern "C" PyObject * PyNumber_Long(PyObject *o) {
    if (o == NULL) return NULL;
    if (PyLong_Check(o)) { Py_INCREF(o); return o; }
    return PyLong_FromSsize_t(PyLong_AsSsize_t(o));
}
extern "C" int PyOS_snprintf(char *str, size_t size, const char *format, ...) {
    va_list ap; va_start(ap,format); int r=vsnprintf(str,size,format,ap); va_end(ap); return r;
}
extern "C" double PyOS_string_to_double(const char *s, char **endptr, PyObject *overflow_exception) {
    (void)endptr;(void)overflow_exception; return strtod(s,(char**)0);
}
extern "C" long PyOS_strtol(const char *str, char **pend, int base) {
    return strtol(str,pend,base);
}
extern "C" unsigned long PyOS_strtoul(const char *str, char **pend, int base) {
    return strtoul(str,pend,base);
}
extern "C" int PyObject_AsFileDescriptor(PyObject *o) {
    PyObject *v;
    if (PyLong_Check(o)) { v = o; Py_INCREF(v); }
    else {
        if (!PyObject_HasAttrString(o, "fileno")) {
            PyErr_SetString(PyExc_TypeError, "argument must be an int, or have a fileno() method.");
            return -1;
        }
        v = PyObject_CallMethod(o, "fileno", NULL);
        if (v == NULL) return -1;
    }
    long fd = PyLong_AsLong(v);
    Py_DECREF(v);
    if (fd == -1 && PyErr_Occurred()) return -1;
    if (fd < 0) {
        PyErr_Format(PyExc_ValueError,
                     "file descriptor cannot be a negative integer (%ld)", fd);
        return -1;
    }
    return (int)fd;
}
extern "C" PyObject * PyObject_Bytes(PyObject *v) {
    return grail_call_builtin("bytes", "O", v);
}
/* PyObject_CallFunction / PyObject_CallMethod are implemented for real in
   cpython.cc (Py_BuildValue-format args + PyObject_Call) — not stubbed. */
extern "C" PyObject * PyObject_Format(PyObject *obj, PyObject *format_spec) {
    if (format_spec == NULL) return grail_call_builtin("format", "O", obj);
    return grail_call_builtin("format", "OO", obj, format_spec);
}
extern "C" void PyObject_Free(void *ptr) {
    free(ptr);
}
/* PyObject_GenericGetDict lives in cpython.cc. */
/* PyObject_GenericSetAttr lives in cpython.cc. */
/* PyObject_GetOptionalAttr: 1 and the value, 0 and NULL when there is no
   such attribute, -1 on any other error.  It was a stub answering 0 WITHOUT
   writing *result, and numpy's PyArray_LookupSpecial (np.can_cast,
   np.linspace, every ufunc call that checks for __array_ufunc__) then read
   whatever was in its uninitialised result variable. */
extern "C" int PyObject_GetOptionalAttr(PyObject *obj, PyObject *name, PyObject **result) {
    *result = PyObject_GetAttr(obj, name);
    if (*result != NULL) return 1;
    if (PyErr_Occurred() && !PyErr_ExceptionMatches(PyExc_AttributeError)) return -1;
    PyErr_Clear();
    return 0;
}
/* Initialize a freshly-allocated object: set its type and refcount. */
extern "C" PyObject * PyObject_Init(PyObject *op, PyTypeObject *type) {
    if (op == NULL) return NULL;
    op->ob_refcnt = 1;
    op->ob_type = type;
    return op;
}
/* PyObject_Init plus the item count -- was a stub answering NULL. */
extern "C" PyVarObject * PyObject_InitVar(PyVarObject *op, PyTypeObject *type, Py_ssize_t size) {
    if (op == NULL) return NULL;
    op->ob_size = size;
    PyObject_Init((PyObject *)op, type);
    return op;
}
/* PyObject_IsInstance / PyObject_IsSubclass live in cpython.cc. */
extern "C" Py_ssize_t PyObject_LengthHint(PyObject *o, Py_ssize_t defaultvalue) {
    if (PyObject_HasAttrString(o, "__len__")) {
        Py_ssize_t n = PyObject_Length(o);
        if (n >= 0) return n;
        if (!PyErr_ExceptionMatches(PyExc_TypeError)) return -1;
        PyErr_Clear();
    }
    if (!PyObject_HasAttrString(o, "__length_hint__")) return defaultvalue;
    PyObject *hint = PyObject_CallMethod(o, "__length_hint__", NULL);
    if (hint == NULL) {
        if (!PyErr_ExceptionMatches(PyExc_TypeError)) return -1;
        PyErr_Clear();
        return defaultvalue;
    }
    if (hint == Py_NotImplemented) { Py_DECREF(hint); return defaultvalue; }
    long r = PyLong_AsLong(hint);
    Py_DECREF(hint);
    if (r == -1 && PyErr_Occurred()) return -1;
    if (r < 0) {
        PyErr_SetString(PyExc_ValueError, "__length_hint__() should return >= 0");
        return -1;
    }
    return (Py_ssize_t)r;
}
extern "C" void * PyObject_Malloc(size_t size) {
    return malloc(size);
}
extern "C" int PyObject_Not(PyObject *v) {
    int r = PyObject_IsTrue(v);
    return r < 0 ? r : !r;
}
extern "C" int PyObject_Print(PyObject *op, FILE *fp, int flags) {
    PyObject *s = (flags & 1) ? PyObject_Str(op) : PyObject_Repr(op);   /* Py_PRINT_RAW */
    if (s == NULL) return -1;
    const char *t = PyUnicode_AsUTF8(s);
    int r = t == NULL ? -1 : (fputs(t, fp) < 0 ? -1 : 0);
    Py_DECREF(s);
    return r;
}
extern "C" void * PyObject_Realloc(void *ptr, size_t new_size) {
    return realloc(ptr, new_size);
}
/* PyObject_SelfIter lives in cpython.cc. */
/* len(o): PyObject_Length's other name (cpython.cc).  It was a stub
   answering 0, which pydantic_core's model_dump reaches. */
extern "C" Py_ssize_t PyObject_Size(PyObject *o) {
    return PyObject_Length(o);
}
/* PySeqIter_New lives in cpython.cc. */
extern "C" PyObject * PySequence_Concat(PyObject *o1, PyObject *o2) {
    return PyNumber_Add(o1, o2);
}
/* PySequence_Fast lives in cpython.cc. */
extern "C" PyObject * PySequence_InPlaceConcat(PyObject *o1, PyObject *o2) {
    return grail_call_module_attr("operator", "iadd", "OO", o1, o2);
}
extern "C" PyObject * PySequence_InPlaceRepeat(PyObject *o, Py_ssize_t count) {
    return grail_call_module_attr("operator", "imul", "On", o, count);
}
extern "C" PyObject * PySequence_Repeat(PyObject *o, Py_ssize_t count) {
    PyObject *n = PyLong_FromSsize_t(count);
    if (n == NULL) return NULL;
    PyObject *r = PyNumber_Multiply(o, n);
    Py_DECREF(n);
    return r;
}
/* PySequence_Tuple lives in cpython.cc. */
/* PySys_GetObject is implemented for real in cpython.cc (delegates to the
   Grail sys module via the server) — not stubbed here. */
extern "C" PyThreadState * PyThreadState_Get(void) {
    return (PyThreadState *)&g_shim_tstate;   /* see PyInterpreterState_Main */
}
extern "C" int PyTraceMalloc_Track(unsigned int domain, uintptr_t ptr, size_t size) {
    return 0;
}
extern "C" int PyTraceMalloc_Untrack(unsigned int domain, uintptr_t ptr) {
    return 0;
}
/* PyType_IsSubtype implemented in cpython.cc (walks tp_base). */
extern "C" PyObject* PyUnicode_AsASCIIString(PyObject *unicode) {
    return PyObject_CallMethod(unicode, "encode", "s", "ascii");
}
extern "C" PyObject* PyUnicode_AsEncodedString(PyObject *unicode, const char *encoding, const char *errors) {
    return PyObject_CallMethod(unicode, "encode", "ss",
                               encoding == NULL ? "utf-8" : encoding,
                               errors == NULL ? "strict" : errors);
}
extern "C" PyObject* PyUnicode_AsLatin1String(PyObject *unicode) {
    return PyObject_CallMethod(unicode, "encode", "s", "latin-1");
}
extern "C" Py_UCS4* PyUnicode_AsUCS4(PyObject *unicode, Py_UCS4* buffer, Py_ssize_t buflen, int copy_null) {
    Py_ssize_t n = grail_utf8_to_ucs4(unicode, NULL, 0);
    if (n < 0) return NULL;
    if (buflen < n + (copy_null ? 1 : 0)) {
        PyErr_SetString(PyExc_SystemError, "string is longer than the buffer");
        return NULL;
    }
    grail_utf8_to_ucs4(unicode, buffer, n);
    if (copy_null) buffer[n] = 0;
    return buffer;
}
extern "C" Py_UCS4* PyUnicode_AsUCS4Copy(PyObject *unicode) {
    Py_ssize_t n = grail_utf8_to_ucs4(unicode, NULL, 0);
    if (n < 0) return NULL;
    Py_UCS4 *buf = (Py_UCS4 *)PyMem_Malloc((size_t)(n + 1) * sizeof(Py_UCS4));
    if (buf == NULL) { PyErr_NoMemory(); return NULL; }
    grail_utf8_to_ucs4(unicode, buf, n);
    buf[n] = 0;
    return buf;
}
/* A str's UTF-8 encoding as bytes.  It was a stub answering NULL with no
   error set, which ended numpy's module exec with "no pending error". */
extern "C" PyObject* PyUnicode_AsUTF8String(PyObject *unicode) {
    Py_ssize_t n = 0;
    const char *s = PyUnicode_AsUTF8AndSize(unicode, &n);
    if (s == NULL) return NULL;
    return PyBytes_FromStringAndSize(s, n);
}
/* Comparing UTF-8 bytes orders strings as comparing their code points does
   (a property of UTF-8), and a match of one UTF-8 string inside another
   starts on a character boundary.  These were stubs answering "equal" and
   "absent"; numpy's dtype naming reached PyUnicode_Compare. */
static int utf8_compare(const char *a, Py_ssize_t na, const char *b, Py_ssize_t nb) {
    int c = memcmp(a, b, (size_t)(na < nb ? na : nb));
    if (c != 0) return c < 0 ? -1 : 1;
    return na < nb ? -1 : (na > nb ? 1 : 0);
}
extern "C" int PyUnicode_Compare(PyObject *left, PyObject *right) {
    Py_ssize_t na = 0, nb = 0;
    const char *a = PyUnicode_AsUTF8AndSize(left, &na);
    if (a == NULL) return -1;
    const char *b = PyUnicode_AsUTF8AndSize(right, &nb);
    if (b == NULL) return -1;
    return utf8_compare(a, na, b, nb);
}
extern "C" int PyUnicode_CompareWithASCIIString(PyObject *left, const char *right) {
    Py_ssize_t na = 0;
    const char *a = PyUnicode_AsUTF8AndSize(left, &na);
    if (a == NULL) { PyErr_Clear(); return -1; }
    return utf8_compare(a, na, right, (Py_ssize_t)strlen(right));
}
extern "C" int PyUnicode_Contains(PyObject *container, PyObject *element) {
    Py_ssize_t nc = 0, ne = 0;
    const char *c = PyUnicode_AsUTF8AndSize(container, &nc);
    if (c == NULL) return -1;
    const char *e = PyUnicode_AsUTF8AndSize(element, &ne);
    if (e == NULL) return -1;
    if (ne == 0) return 1;
    return memmem(c, (size_t)nc, e, (size_t)ne) != NULL;
}
extern "C" PyObject * PyUnicode_Format(PyObject *format, PyObject *args) {
    return grail_call_module_attr("operator", "mod", "OO", format, args);
}
extern "C" PyObject* PyUnicode_FromEncodedObject(PyObject *obj, const char *encoding, const char *errors) {
    return grail_call_builtin("str", "Oss", obj,
                              encoding == NULL ? "utf-8" : encoding,
                              errors == NULL ? "strict" : errors);
}
extern "C" PyObject* PyUnicode_FromKindAndData(int kind, const void *buffer, Py_ssize_t size) {
    if (size < 0 || (kind != 1 && kind != 2 && kind != 4)) {
        PyErr_SetString(PyExc_SystemError, "invalid kind or size");
        return NULL;
    }
    char *out = (char *)malloc((size_t)size * 4 + 1);
    if (out == NULL) return PyErr_NoMemory();
    size_t o = 0;
    for (Py_ssize_t i = 0; i < size; i++) {
        uint32_t c = kind == 1 ? ((const uint8_t *)buffer)[i]
                   : kind == 2 ? ((const uint16_t *)buffer)[i]
                               : ((const uint32_t *)buffer)[i];
        if (c > 0x10FFFF) {
            free(out);
            PyErr_SetString(PyExc_ValueError, "character out of range");
            return NULL;
        }
        o += grail_utf8_put(out + o, c);
    }
    PyObject *r = PyUnicode_FromStringAndSize(out, (Py_ssize_t)o);
    free(out);
    return r;
}
extern "C" PyObject * PyUnicode_Replace(PyObject *str, PyObject *substr, PyObject *replstr, Py_ssize_t maxcount) {
    return PyObject_CallMethod(str, "replace", "OOn", substr, replstr, maxcount);
}
extern "C" Py_ssize_t PyUnicode_Tailmatch(PyObject *str, PyObject *substr, Py_ssize_t start, Py_ssize_t end, int direction) {
    PyObject *r = PyObject_CallMethod(str, direction > 0 ? "endswith" : "startswith",
                                      "Onn", substr, start, end);
    if (r == NULL) return -1;
    int t = PyObject_IsTrue(r);
    Py_DECREF(r);
    return t;
}
/* Whether op is a temporary nothing else refers to, so the caller may reuse
   it (numpy elides array temporaries this way).  Grail cannot tell -- a
   wrapper's refcount says nothing about Smalltalk references -- and 0 is the
   answer that is always safe: the caller makes a new object. */
extern "C" int PyUnstable_Object_IsUniqueReferencedTemporary(PyObject *op) {
    (void)op;
    return 0;
}
/* As above: 0, "possibly shared", is always safe. */
extern "C" int PyUnstable_Object_IsUniquelyReferenced(PyObject *op) {
    (void)op;
    return 0;
}
/* PyVectorcall_Call lives in cpython.cc. */
extern "C" int Py_EnterRecursiveCall(const char *where) {
    return 0;
}
extern "C" int Py_IsInitialized(void) {
    return 1;
}
extern "C" void Py_LeaveRecursiveCall(void) {
    (void)0;
}
extern "C" int _PyUnicode_IsAlpha(Py_UCS4 ch) {
    return grail_char_predicate(ch, "isalpha");
}
extern "C" int _PyUnicode_IsDecimalDigit(Py_UCS4 ch) {
    return grail_char_predicate(ch, "isdecimal");
}
extern "C" int _PyUnicode_IsDigit(Py_UCS4 ch) {
    return grail_char_predicate(ch, "isdigit");
}
extern "C" int _PyUnicode_IsLowercase(Py_UCS4 ch) {
    return grail_char_predicate(ch, "islower");
}
extern "C" int _PyUnicode_IsNumeric(Py_UCS4 ch) {
    return grail_char_predicate(ch, "isnumeric");
}
/* The CHARACTER property: category Lt.  str.istitle() is a different
   question -- 'Z'.istitle() is true, and 'Z' is no titlecase letter. */
extern "C" int _PyUnicode_IsTitlecase(Py_UCS4 ch) {
    char buf[4];
    size_t n = grail_utf8_put(buf, ch);
    PyObject *cat = grail_call_module_attr("unicodedata", "category", "s#", buf, (Py_ssize_t)n);
    if (cat == NULL) { PyErr_Clear(); return 0; }
    const char *c = PyUnicode_AsUTF8(cat);
    int r = c != NULL && strcmp(c, "Lt") == 0;
    Py_DECREF(cat);
    return r;
}
extern "C" int _PyUnicode_IsUppercase(Py_UCS4 ch) {
    return grail_char_predicate(ch, "isupper");
}
extern "C" int _PyUnicode_IsWhitespace(const Py_UCS4 ch) {
    return grail_char_predicate(ch, "isspace");
}
/* hash(float) as Grail answers it, so a wheel's hash of a float agrees with
   Grail's dict lookups; a NaN hashes by identity, as in CPython 3.10+. */
extern "C" Py_hash_t _Py_HashDouble(PyObject *inst, double v) {
    if (v != v) return (Py_hash_t)((uintptr_t)inst >> 4);
    PyObject *f = PyFloat_FromDouble(v);
    if (f == NULL) { PyErr_Clear(); return 0; }
    Py_hash_t h = PyObject_Hash(f);
    Py_DECREF(f);
    if (h == -1) PyErr_Clear();
    return h;
}
extern "C" PyObject *_PyObject_GC_New(PyTypeObject *type){ return PyType_GenericAlloc(type, 0); }
extern "C" void _PyErr_BadInternalCall(const char *f, int l){ (void)f;(void)l; PyErr_BadInternalCall(); }
extern "C" {
  PyTypeObject PyCFunction_Type;
  PyTypeObject PyCapsule_Type;
  PyTypeObject PyComplex_Type;
  PyTypeObject PyDictProxy_Type;
  PyTypeObject PyFrozenSet_Type;
  PyTypeObject PyGetSetDescr_Type;
  PyTypeObject PyMemberDescr_Type;
  PyTypeObject PyMemoryView_Type;
  PyTypeObject PyMethodDescr_Type;
  PyTypeObject PySet_Type;
  PyTypeObject PySlice_Type;
  /* THE Ellipsis object, as CPython declares it (sliceobject.h:
     ``PyAPI_DATA(PyObject) _Py_EllipsisObject'', Py_Ellipsis being its
     ADDRESS).  This used to be a POINTER variable of that name, so a wheel's
     Py_Ellipsis was the address of the pointer, and numpy's ``index ==
     Py_Ellipsis'' never matched.  Typed and mapped to Grail's Ellipsis in
     cpython.cc (pyobj_oop, shimTypeAddr ``Ellipsis''). */
  PyObject _Py_EllipsisObject={1,0};
  static struct _object _exc_FPE={1,0}; PyObject *PyExc_FloatingPointError=&_exc_FPE;
  static struct _object _exc_IW={1,0}; PyObject *PyExc_ImportWarning=&_exc_IW;
}
