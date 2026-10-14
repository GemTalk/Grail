/* shim_numpy.cc — NumPy 2.4.6 (cp314) entry points beyond the base shim.
 * Memory + no-op buckets REAL; rest are log-once diagnostic stubs to locate the
 * first BEHAVIORAL wall in PyInit__multiarray_umath. */
#include "cpython.h"
#include <stdio.h>
#include <stdarg.h>
#include <stdint.h>
#include <stdlib.h>
#include <string.h>
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
/* PyArg_ParseTupleAndKeywords / PyArg_VaParseTupleAndKeywords implemented in
   cpython.cc (shared vparse_kw core with PyArg_ParseTuple). */
extern "C" int PyBytes_AsStringAndSize(PyObject *obj, char **s, Py_ssize_t *len) {
    STUBLOG("PyBytes_AsStringAndSize");
    return 0;
}
extern "C" PyObject * PyBytes_FromString(const char *) {
    STUBLOG("PyBytes_FromString");
    return 0;
}
extern "C" void * PyCapsule_GetContext(PyObject *capsule) {
    STUBLOG("PyCapsule_GetContext");
    return 0;
}
extern "C" int PyCapsule_SetContext(PyObject *capsule, void *context) {
    STUBLOG("PyCapsule_SetContext");
    return 0;
}
extern "C" int PyCapsule_SetName(PyObject *capsule, const char *name) {
    STUBLOG("PyCapsule_SetName");
    return 0;
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
    STUBLOG("PyDict_ContainsString");
    return 0;
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
    STUBLOG("PyErr_FormatV");
    return 0;
}
extern "C" void PyErr_NormalizeException(PyObject**, PyObject**, PyObject**) {
    STUBLOG("PyErr_NormalizeException");
}
extern "C" void PyErr_Print(void) {
    STUBLOG("PyErr_Print");
}
extern "C" PyObject * PyErr_SetFromErrno(PyObject *) {
    STUBLOG("PyErr_SetFromErrno");
    return 0;
}
extern "C" int PyErr_WarnFormat(PyObject *category, Py_ssize_t stack_level, const char *format, ...) {
    STUBLOG("PyErr_WarnFormat");
    return 0;
}
extern "C" void PyErr_WriteUnraisable(PyObject *) {
    STUBLOG("PyErr_WriteUnraisable");
}
extern "C" PyObject * PyEval_GetBuiltins(void) {
    STUBLOG("PyEval_GetBuiltins");
    return 0;
}
extern "C" void PyEval_RestoreThread(PyThreadState *) {
    (void)0;
}
extern "C" PyThreadState * PyEval_SaveThread(void) {
    return 0;
}
extern "C" void PyException_SetCause(PyObject *, PyObject *) {
    STUBLOG("PyException_SetCause");
}
extern "C" void PyException_SetContext(PyObject *, PyObject *) {
    STUBLOG("PyException_SetContext");
}
extern "C" int PyException_SetTraceback(PyObject *, PyObject *) {
    STUBLOG("PyException_SetTraceback");
    return 0;
}
extern "C" PyObject* PyFloat_FromString(PyObject*) {
    STUBLOG("PyFloat_FromString");
    return 0;
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
extern "C" void * PyLong_AsVoidPtr(PyObject *) {
    STUBLOG("PyLong_AsVoidPtr");
    return 0;
}
extern "C" PyObject* PyLong_FromUnicodeObject(PyObject *u, int base) {
    STUBLOG("PyLong_FromUnicodeObject");
    return 0;
}
extern "C" PyObject * PyLong_FromVoidPtr(void *) {
    STUBLOG("PyLong_FromVoidPtr");
    return 0;
}
extern "C" int PyLong_IsZero(PyObject *obj) {
    STUBLOG("PyLong_IsZero");
    return 0;
}
extern "C" PyObject * PyMapping_GetItemString(PyObject *o, const char *key) {
    STUBLOG("PyMapping_GetItemString");
    return 0;
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
    STUBLOG("PyMemoryView_FromObject");
    return 0;
}
extern "C" PyObject * PyMethod_New(PyObject *, PyObject *) {
    STUBLOG("PyMethod_New");
    return 0;
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
extern "C" int PyObject_AsFileDescriptor(PyObject *) {
    STUBLOG("PyObject_AsFileDescriptor");
    return 0;
}
extern "C" PyObject * PyObject_Bytes(PyObject *) {
    STUBLOG("PyObject_Bytes");
    return 0;
}
/* PyObject_CallFunction / PyObject_CallMethod are implemented for real in
   cpython.cc (Py_BuildValue-format args + PyObject_Call) — not stubbed. */
extern "C" PyObject * PyObject_Format(PyObject *obj, PyObject *format_spec) {
    STUBLOG("PyObject_Format");
    return 0;
}
extern "C" void PyObject_Free(void *ptr) {
    free(ptr);
}
extern "C" PyObject * PyObject_GenericGetAttr(PyObject *, PyObject *) {
    STUBLOG("PyObject_GenericGetAttr");
    return 0;
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
extern "C" Py_ssize_t PyObject_LengthHint(PyObject *o, Py_ssize_t) {
    STUBLOG("PyObject_LengthHint");
    return 0;
}
extern "C" void * PyObject_Malloc(size_t size) {
    return malloc(size);
}
extern "C" int PyObject_Not(PyObject *) {
    STUBLOG("PyObject_Not");
    return 0;
}
extern "C" int PyObject_Print(PyObject *, FILE *, int) {
    STUBLOG("PyObject_Print");
    return 0;
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
    STUBLOG("PySequence_Concat");
    return 0;
}
/* PySequence_Fast lives in cpython.cc. */
extern "C" PyObject * PySequence_InPlaceConcat(PyObject *o1, PyObject *o2) {
    STUBLOG("PySequence_InPlaceConcat");
    return 0;
}
extern "C" PyObject * PySequence_InPlaceRepeat(PyObject *o, Py_ssize_t count) {
    STUBLOG("PySequence_InPlaceRepeat");
    return 0;
}
extern "C" PyObject * PySequence_Repeat(PyObject *o, Py_ssize_t count) {
    STUBLOG("PySequence_Repeat");
    return 0;
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
    STUBLOG("PyUnicode_AsASCIIString");
    return 0;
}
extern "C" PyObject* PyUnicode_AsEncodedString(PyObject *unicode, const char *encoding, const char *errors) {
    STUBLOG("PyUnicode_AsEncodedString");
    return 0;
}
extern "C" PyObject* PyUnicode_AsLatin1String(PyObject *unicode) {
    STUBLOG("PyUnicode_AsLatin1String");
    return 0;
}
extern "C" Py_UCS4* PyUnicode_AsUCS4(PyObject *unicode, Py_UCS4* buffer, Py_ssize_t buflen, int copy_null) {
    STUBLOG("PyUnicode_AsUCS4");
    return 0;
}
extern "C" Py_UCS4* PyUnicode_AsUCS4Copy(PyObject *unicode) {
    STUBLOG("PyUnicode_AsUCS4Copy");
    return 0;
}
/* A str's UTF-8 encoding as bytes.  It was a stub answering NULL with no
   error set, which ended numpy's module exec with "no pending error". */
extern "C" PyObject* PyUnicode_AsUTF8String(PyObject *unicode) {
    Py_ssize_t n = 0;
    const char *s = PyUnicode_AsUTF8AndSize(unicode, &n);
    if (s == NULL) return NULL;
    return PyBytes_FromStringAndSize(s, n);
}
extern "C" int PyUnicode_Compare(PyObject *left, PyObject *right) {
    STUBLOG("PyUnicode_Compare");
    return 0;
}
extern "C" int PyUnicode_CompareWithASCIIString(PyObject *left, const char *right) {
    STUBLOG("PyUnicode_CompareWithASCIIString");
    return 0;
}
extern "C" int PyUnicode_Contains(PyObject *container, PyObject *element) {
    STUBLOG("PyUnicode_Contains");
    return 0;
}
extern "C" PyObject * PyUnicode_Format(PyObject *format, PyObject *args) {
    STUBLOG("PyUnicode_Format");
    return 0;
}
extern "C" PyObject* PyUnicode_FromEncodedObject(PyObject *obj, const char *encoding, const char *errors) {
    STUBLOG("PyUnicode_FromEncodedObject");
    return 0;
}
extern "C" PyObject* PyUnicode_FromKindAndData(int kind, const void *buffer, Py_ssize_t size) {
    STUBLOG("PyUnicode_FromKindAndData");
    return 0;
}
extern "C" PyObject * PyUnicode_Replace(PyObject *str, PyObject *substr, PyObject *replstr, Py_ssize_t maxcount) {
    STUBLOG("PyUnicode_Replace");
    return 0;
}
extern "C" Py_ssize_t PyUnicode_Tailmatch(PyObject *str, PyObject *substr, Py_ssize_t start, Py_ssize_t end, int direction) {
    STUBLOG("PyUnicode_Tailmatch");
    return 0;
}
extern "C" int PyUnstable_Object_IsUniqueReferencedTemporary(PyObject *) {
    STUBLOG("PyUnstable_Object_IsUniqueReferencedTemporary");
    return 0;
}
extern "C" int PyUnstable_Object_IsUniquelyReferenced(PyObject *) {
    STUBLOG("PyUnstable_Object_IsUniquelyReferenced");
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
    STUBLOG("_PyUnicode_IsAlpha");
    return 0;
}
extern "C" int _PyUnicode_IsDecimalDigit(Py_UCS4 ch) {
    STUBLOG("_PyUnicode_IsDecimalDigit");
    return 0;
}
extern "C" int _PyUnicode_IsDigit(Py_UCS4 ch) {
    STUBLOG("_PyUnicode_IsDigit");
    return 0;
}
extern "C" int _PyUnicode_IsLowercase(Py_UCS4 ch) {
    STUBLOG("_PyUnicode_IsLowercase");
    return 0;
}
extern "C" int _PyUnicode_IsNumeric(Py_UCS4 ch) {
    STUBLOG("_PyUnicode_IsNumeric");
    return 0;
}
extern "C" int _PyUnicode_IsTitlecase(Py_UCS4 ch) {
    STUBLOG("_PyUnicode_IsTitlecase");
    return 0;
}
extern "C" int _PyUnicode_IsUppercase(Py_UCS4 ch) {
    STUBLOG("_PyUnicode_IsUppercase");
    return 0;
}
extern "C" int _PyUnicode_IsWhitespace(const Py_UCS4 ch) {
    STUBLOG("_PyUnicode_IsWhitespace");
    return 0;
}
extern "C" Py_hash_t _Py_HashDouble(PyObject *, double) {
    STUBLOG("_Py_HashDouble");
    return 0;
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
