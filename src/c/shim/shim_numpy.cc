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
extern "C" Py_complex PyComplex_AsCComplex(PyObject *op) {
    STUBLOG("PyComplex_AsCComplex");
    Py_complex _z={0.0,0.0}; return _z;
}
extern "C" PyObject * PyComplex_FromCComplex(Py_complex) {
    STUBLOG("PyComplex_FromCComplex");
    return 0;
}
extern "C" PyObject * PyComplex_FromDoubles(double real, double imag) {
    STUBLOG("PyComplex_FromDoubles");
    return 0;
}
extern "C" double PyComplex_ImagAsDouble(PyObject *op) {
    STUBLOG("PyComplex_ImagAsDouble");
    return 0.0;
}
extern "C" double PyComplex_RealAsDouble(PyObject *op) {
    STUBLOG("PyComplex_RealAsDouble");
    return 0.0;
}
/* PyContextVar_New / _Get / _Set are implemented for real in cpython.cc
   (they delegate to the Grail contextvars.ContextVar class) — not stubbed. */
extern "C" int PyDict_ContainsString(PyObject *mp, const char *key) {
    STUBLOG("PyDict_ContainsString");
    return 0;
}
extern "C" int PyDict_DelItemString(PyObject *dp, const char *key) {
    STUBLOG("PyDict_DelItemString");
    return 0;
}
/* CPython 3.13+ strong-ref dict lookups: return 1 (found, *result=new ref),
   0 (absent, *result=NULL), or -1 (error). */
extern "C" int PyDict_GetItemRef(PyObject *mp, PyObject *key, PyObject **result) {
    PyObject *v = PyDict_GetItem(mp, key);
    if (v) { Py_INCREF(v); *result = v; return 1; }
    *result = NULL;
    return PyErr_Occurred() ? -1 : 0;
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
extern "C" PyObject * PyImport_Import(PyObject *name) {
    STUBLOG("PyImport_Import");
    return 0;
}
extern "C" PyInterpreterState * PyInterpreterState_Main(void) {
    STUBLOG("PyInterpreterState_Main");
    return 0;
}
/* PyList_GetItemRef implemented in cpython.cc (strong-ref PyList_GetItem). */
extern "C" long PyLong_AsLongAndOverflow(PyObject *, int *) {
    STUBLOG("PyLong_AsLongAndOverflow");
    return 0;
}
extern "C" long long PyLong_AsLongLongAndOverflow(PyObject *, int *) {
    STUBLOG("PyLong_AsLongLongAndOverflow");
    return 0;
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
extern "C" PyObject * PyNumber_Absolute(PyObject *o) {
    STUBLOG("PyNumber_Absolute");
    return 0;
}
extern "C" PyObject * PyNumber_Add(PyObject *o1, PyObject *o2) {
    STUBLOG("PyNumber_Add");
    return 0;
}
extern "C" PyObject * PyNumber_And(PyObject *o1, PyObject *o2) {
    STUBLOG("PyNumber_And");
    return 0;
}
extern "C" int PyNumber_Check(PyObject *o) {
    STUBLOG("PyNumber_Check");
    return 0;
}
extern "C" PyObject * PyNumber_Divmod(PyObject *o1, PyObject *o2) {
    STUBLOG("PyNumber_Divmod");
    return 0;
}
/* float(o): pass through floats; otherwise coerce via the server's
   double conversion (applies __float__/__index__ on the Grail side). */
extern "C" PyObject * PyNumber_Float(PyObject *o) {
    if (o == NULL) return NULL;
    if (PyFloat_Check(o)) { Py_INCREF(o); return o; }
    return PyFloat_FromDouble(PyFloat_AsDouble(o));
}
extern "C" PyObject * PyNumber_FloorDivide(PyObject *o1, PyObject *o2) {
    STUBLOG("PyNumber_FloorDivide");
    return 0;
}
extern "C" PyObject * PyNumber_Invert(PyObject *o) {
    STUBLOG("PyNumber_Invert");
    return 0;
}
/* int(o): already-int passes through; otherwise coerce via the server's
   Py_ssize_t conversion (which applies __index__/__int__ on the Grail side). */
extern "C" PyObject * PyNumber_Long(PyObject *o) {
    if (o == NULL) return NULL;
    if (PyLong_Check(o)) { Py_INCREF(o); return o; }
    return PyLong_FromSsize_t(PyLong_AsSsize_t(o));
}
extern "C" PyObject * PyNumber_Lshift(PyObject *o1, PyObject *o2) {
    STUBLOG("PyNumber_Lshift");
    return 0;
}
extern "C" PyObject * PyNumber_Multiply(PyObject *o1, PyObject *o2) {
    STUBLOG("PyNumber_Multiply");
    return 0;
}
extern "C" PyObject * PyNumber_Negative(PyObject *o) {
    STUBLOG("PyNumber_Negative");
    return 0;
}
extern "C" PyObject * PyNumber_Or(PyObject *o1, PyObject *o2) {
    STUBLOG("PyNumber_Or");
    return 0;
}
extern "C" PyObject * PyNumber_Positive(PyObject *o) {
    STUBLOG("PyNumber_Positive");
    return 0;
}
extern "C" PyObject * PyNumber_Power(PyObject *o1, PyObject *o2, PyObject *o3) {
    STUBLOG("PyNumber_Power");
    return 0;
}
extern "C" PyObject * PyNumber_Remainder(PyObject *o1, PyObject *o2) {
    STUBLOG("PyNumber_Remainder");
    return 0;
}
extern "C" PyObject * PyNumber_Rshift(PyObject *o1, PyObject *o2) {
    STUBLOG("PyNumber_Rshift");
    return 0;
}
extern "C" PyObject * PyNumber_Subtract(PyObject *o1, PyObject *o2) {
    STUBLOG("PyNumber_Subtract");
    return 0;
}
extern "C" PyObject * PyNumber_TrueDivide(PyObject *o1, PyObject *o2) {
    STUBLOG("PyNumber_TrueDivide");
    return 0;
}
extern "C" PyObject * PyNumber_Xor(PyObject *o1, PyObject *o2) {
    STUBLOG("PyNumber_Xor");
    return 0;
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
extern "C" PyObject * PyObject_GenericGetDict(PyObject *, void *) {
    STUBLOG("PyObject_GenericGetDict");
    return 0;
}
extern "C" int PyObject_GenericSetAttr(PyObject *, PyObject *, PyObject *) {
    STUBLOG("PyObject_GenericSetAttr");
    return 0;
}
extern "C" int PyObject_GetOptionalAttr(PyObject *, PyObject *, PyObject **) {
    STUBLOG("PyObject_GetOptionalAttr");
    return 0;
}
/* Initialize a freshly-allocated object: set its type and refcount. */
extern "C" PyObject * PyObject_Init(PyObject *op, PyTypeObject *type) {
    if (op == NULL) return NULL;
    op->ob_refcnt = 1;
    op->ob_type = type;
    return op;
}
extern "C" PyVarObject * PyObject_InitVar(PyVarObject *, PyTypeObject *, Py_ssize_t) {
    STUBLOG("PyObject_InitVar");
    return 0;
}
extern "C" int PyObject_IsInstance(PyObject *object, PyObject *typeorclass) {
    STUBLOG("PyObject_IsInstance");
    return 0;
}
extern "C" int PyObject_IsSubclass(PyObject *object, PyObject *typeorclass) {
    STUBLOG("PyObject_IsSubclass");
    return 0;
}
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
extern "C" PyObject * PyObject_SelfIter(PyObject *) {
    STUBLOG("PyObject_SelfIter");
    return 0;
}
extern "C" Py_ssize_t PyObject_Size(PyObject *o) {
    STUBLOG("PyObject_Size");
    return 0;
}
extern "C" PyObject * PyObject_VectorcallMethod(PyObject *name, PyObject *const *args, size_t nargsf, PyObject *kwnames) {
    STUBLOG("PyObject_VectorcallMethod");
    return 0;
}
extern "C" PyObject * PySeqIter_New(PyObject *) {
    STUBLOG("PySeqIter_New");
    return 0;
}
extern "C" PyObject * PySequence_Concat(PyObject *o1, PyObject *o2) {
    STUBLOG("PySequence_Concat");
    return 0;
}
extern "C" PyObject * PySequence_Fast(PyObject *o, const char* m) {
    STUBLOG("PySequence_Fast");
    return 0;
}
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
extern "C" PyObject * PySequence_Tuple(PyObject *o) {
    STUBLOG("PySequence_Tuple");
    return 0;
}
/* PySys_GetObject is implemented for real in cpython.cc (delegates to the
   Grail sys module via the server) — not stubbed here. */
extern "C" PyThreadState * PyThreadState_Get(void) {
    STUBLOG("PyThreadState_Get");
    return 0;
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
extern "C" PyObject* PyUnicode_AsUTF8String(PyObject *unicode) {
    STUBLOG("PyUnicode_AsUTF8String");
    return 0;
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
extern "C" PyObject * PyVectorcall_Call(PyObject *callable, PyObject *tuple, PyObject *dict) {
    STUBLOG("PyVectorcall_Call");
    return 0;
}
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
  PyObject _shim_Ellipsis={1,0}; PyObject *_Py_EllipsisObject=&_shim_Ellipsis;
  static struct _object _exc_FPE={1,0}; PyObject *PyExc_FloatingPointError=&_exc_FPE;
  static struct _object _exc_IW={1,0}; PyObject *PyExc_ImportWarning=&_exc_IW;
}
