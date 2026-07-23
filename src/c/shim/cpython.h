/*
 * cpython.h — Stand-in for Python.h when extending CPython with GemStone.
 *
 * C extension modules include this header instead of Python.h. It declares
 * the same CPython C API functions (PyFloat_FromDouble, PyList_Append, etc.)
 * but the implementations route through GCI to GemStone objects.
 *
 * PyObject layout matches Python.h (ob_refcnt + ob_type). Each PyObject*
 * points to a 24-byte CByteArray allocated by Smalltalk, with the wrapped
 * GemStone OOP at a hidden offset 16.
 *
 * PyTypeObject matches CPython 3.14's full struct layout (~400 bytes)
 * so pre-compiled extension modules can dereference type fields correctly.
 */

#ifndef CPYTHON_H
#define CPYTHON_H

#include <stddef.h>
#include <stdint.h>
#include <string.h>
#include <assert.h>
#include <math.h>

/* Give every declared function/variable C linkage when this header is
   included from a C++ translation unit (cpython.cc, shim_numpy.cc, the
   bundled C++ modules).  Without this, a C++ TU mangles its calls to the
   shim's API (e.g. PyType_GenericAlloc), which the extern "C" definitions
   don't satisfy; under -undefined dynamic_lookup the mangled reference
   silently binds to 0x0 and crashes when first called (numpy's first
   _PyObject_GC_New -> PyType_GenericAlloc did exactly this). */
#ifdef __cplusplus
extern "C" {
#endif

/* ========== Core types ========== */

typedef intptr_t Py_ssize_t;
typedef Py_ssize_t Py_hash_t;
typedef size_t     Py_uhash_t;

typedef struct _typeobject PyTypeObject;
typedef struct _object PyObject;

/* PyObject layout matches Python.h (ob_refcnt + ob_type).
   The shim adds a hidden OOP field at offset 16. */
struct _object {
    Py_ssize_t    ob_refcnt;
    PyTypeObject *ob_type;
};

/* PyVarObject — extends PyObject with ob_size for variable-length objects. */
typedef struct {
    PyObject   ob_base;
    Py_ssize_t ob_size;
} PyVarObject;

/* Struct embedding macros (used in extension type definitions) */
#define PyObject_HEAD      PyObject ob_base;
#define PyObject_VAR_HEAD  PyVarObject ob_base;

/* ========== Type access macros ========== */

#define Py_TYPE(op)  (((PyObject *)(op))->ob_type)
#define Py_SIZE(ob)  (((PyVarObject *)(ob))->ob_size)

/* ========== Function pointer typedefs ========== */

typedef PyObject *(*unaryfunc)(PyObject *);
typedef PyObject *(*binaryfunc)(PyObject *, PyObject *);
typedef PyObject *(*ternaryfunc)(PyObject *, PyObject *, PyObject *);
typedef int (*inquiry)(PyObject *);
typedef Py_ssize_t (*lenfunc)(PyObject *);
typedef PyObject *(*ssizeargfunc)(PyObject *, Py_ssize_t);
typedef PyObject *(*ssizessizeargfunc)(PyObject *, Py_ssize_t, Py_ssize_t);
typedef int (*ssizeobjargproc)(PyObject *, Py_ssize_t, PyObject *);
typedef int (*ssizessizeobjargproc)(PyObject *, Py_ssize_t, Py_ssize_t, PyObject *);
typedef int (*objobjargproc)(PyObject *, PyObject *, PyObject *);
typedef int (*objobjproc)(PyObject *, PyObject *);
typedef int (*visitproc)(PyObject *, void *);
typedef int (*traverseproc)(PyObject *, visitproc, void *);
typedef void (*freefunc)(void *);
typedef void (*destructor)(PyObject *);
typedef PyObject *(*getattrfunc)(PyObject *, char *);
typedef PyObject *(*getattrofunc)(PyObject *, PyObject *);
typedef int (*setattrfunc)(PyObject *, char *, PyObject *);
typedef int (*setattrofunc)(PyObject *, PyObject *, PyObject *);
typedef PyObject *(*reprfunc)(PyObject *);
typedef Py_hash_t (*hashfunc)(PyObject *);
typedef PyObject *(*richcmpfunc)(PyObject *, PyObject *, int);
typedef PyObject *(*getiterfunc)(PyObject *);
typedef PyObject *(*iternextfunc)(PyObject *);
typedef PyObject *(*descrgetfunc)(PyObject *, PyObject *, PyObject *);
typedef int (*descrsetfunc)(PyObject *, PyObject *, PyObject *);
typedef int (*initproc)(PyObject *, PyObject *, PyObject *);
typedef PyObject *(*newfunc)(PyTypeObject *, PyObject *, PyObject *);
typedef PyObject *(*allocfunc)(PyTypeObject *, Py_ssize_t);
typedef PyObject *(*vectorcallfunc)(PyObject *callable, PyObject *const *args,
                                    size_t nargsf, PyObject *kwnames);

/* getter/setter for PyGetSetDef */
typedef PyObject *(*getter)(PyObject *, void *);
typedef int (*setter)(PyObject *, PyObject *, void *);

/* Buffer protocol */
typedef struct bufferinfo Py_buffer;

struct bufferinfo {
    void      *buf;
    PyObject  *obj;
    Py_ssize_t len;
    Py_ssize_t itemsize;
    int        readonly;
    int        ndim;
    char      *format;
    Py_ssize_t *shape;
    Py_ssize_t *strides;
    Py_ssize_t *suboffsets;
    void       *internal;
};

typedef int (*getbufferproc)(PyObject *, Py_buffer *, int);
typedef void (*releasebufferproc)(PyObject *, Py_buffer *);

/* Async protocol */
typedef enum {
    PYGEN_RETURN = 0,
    PYGEN_ERROR  = -1,
    PYGEN_NEXT   = 1
} PySendResult;

typedef PySendResult (*sendfunc)(PyObject *iter, PyObject *value,
                                 PyObject **result);

/* ========== Protocol sub-structs ========== */

typedef struct {
    binaryfunc  nb_add;
    binaryfunc  nb_subtract;
    binaryfunc  nb_multiply;
    binaryfunc  nb_remainder;
    binaryfunc  nb_divmod;
    ternaryfunc nb_power;
    unaryfunc   nb_negative;
    unaryfunc   nb_positive;
    unaryfunc   nb_absolute;
    inquiry     nb_bool;
    unaryfunc   nb_invert;
    binaryfunc  nb_lshift;
    binaryfunc  nb_rshift;
    binaryfunc  nb_and;
    binaryfunc  nb_xor;
    binaryfunc  nb_or;
    unaryfunc   nb_int;
    void       *nb_reserved;
    unaryfunc   nb_float;
    binaryfunc  nb_inplace_add;
    binaryfunc  nb_inplace_subtract;
    binaryfunc  nb_inplace_multiply;
    binaryfunc  nb_inplace_remainder;
    ternaryfunc nb_inplace_power;
    binaryfunc  nb_inplace_lshift;
    binaryfunc  nb_inplace_rshift;
    binaryfunc  nb_inplace_and;
    binaryfunc  nb_inplace_xor;
    binaryfunc  nb_inplace_or;
    binaryfunc  nb_floor_divide;
    binaryfunc  nb_true_divide;
    binaryfunc  nb_inplace_floor_divide;
    binaryfunc  nb_inplace_true_divide;
    unaryfunc   nb_index;
    binaryfunc  nb_matrix_multiply;
    binaryfunc  nb_inplace_matrix_multiply;
} PyNumberMethods;

typedef struct {
    lenfunc          sq_length;
    binaryfunc       sq_concat;
    ssizeargfunc     sq_repeat;
    ssizeargfunc     sq_item;
    void            *was_sq_slice;
    ssizeobjargproc  sq_ass_item;
    void            *was_sq_ass_slice;
    objobjproc       sq_contains;
    binaryfunc       sq_inplace_concat;
    ssizeargfunc     sq_inplace_repeat;
} PySequenceMethods;

typedef struct {
    lenfunc        mp_length;
    binaryfunc     mp_subscript;
    objobjargproc  mp_ass_subscript;
} PyMappingMethods;

typedef struct {
    unaryfunc am_await;
    unaryfunc am_aiter;
    unaryfunc am_anext;
    sendfunc  am_send;
} PyAsyncMethods;

typedef struct {
    getbufferproc     bf_getbuffer;
    releasebufferproc bf_releasebuffer;
} PyBufferProcs;

/* ========== Member/GetSet descriptors ========== */

typedef struct PyMemberDef {
    const char *name;
    int         type;
    Py_ssize_t  offset;
    int         flags;
    const char *doc;
} PyMemberDef;

typedef struct PyGetSetDef {
    const char *name;
    getter      get;
    setter      set;
    const char *doc;
    void       *closure;
} PyGetSetDef;

/* Member type constants */
#define Py_T_SHORT       0
#define Py_T_INT         1
#define Py_T_LONG        2
#define Py_T_FLOAT       3
#define Py_T_DOUBLE      4
#define Py_T_STRING      5
#define Py_T_OBJECT_EX  16
#define Py_T_PYSSIZET   19
#define Py_T_BOOL       21

/* Member flags */
#define Py_READONLY      1

/* PyCFunction and PyMethodDef — needed by _typeobject.tp_methods */
typedef PyObject *(*PyCFunction)(PyObject *, PyObject *);

typedef struct {
    const char  *ml_name;
    PyCFunction  ml_meth;
    int          ml_flags;
    const char  *ml_doc;
} PyMethodDef;

/* ========== PyTypeObject — full CPython 3.14 layout ========== */

struct _typeobject {
    PyVarObject ob_base;

    const char *tp_name;
    Py_ssize_t  tp_basicsize;
    Py_ssize_t  tp_itemsize;

    destructor           tp_dealloc;
    Py_ssize_t           tp_vectorcall_offset;
    getattrfunc          tp_getattr;
    setattrfunc          tp_setattr;
    PyAsyncMethods      *tp_as_async;
    reprfunc             tp_repr;

    PyNumberMethods     *tp_as_number;
    PySequenceMethods   *tp_as_sequence;
    PyMappingMethods    *tp_as_mapping;

    hashfunc             tp_hash;
    ternaryfunc          tp_call;
    reprfunc             tp_str;
    getattrofunc         tp_getattro;
    setattrofunc         tp_setattro;

    PyBufferProcs       *tp_as_buffer;

    unsigned long        tp_flags;

    const char          *tp_doc;

    traverseproc         tp_traverse;
    inquiry              tp_clear;

    richcmpfunc          tp_richcompare;

    Py_ssize_t           tp_weaklistoffset;

    getiterfunc          tp_iter;
    iternextfunc         tp_iternext;

    PyMethodDef         *tp_methods;
    PyMemberDef         *tp_members;
    PyGetSetDef         *tp_getset;
    PyTypeObject        *tp_base;
    PyObject            *tp_dict;
    descrgetfunc         tp_descr_get;
    descrsetfunc         tp_descr_set;
    Py_ssize_t           tp_dictoffset;
    initproc             tp_init;
    allocfunc            tp_alloc;
    newfunc              tp_new;
    freefunc             tp_free;
    inquiry              tp_is_gc;
    PyObject            *tp_bases;
    PyObject            *tp_mro;
    PyObject            *tp_cache;
    void                *tp_subclasses;
    PyObject            *tp_weaklist;
    destructor           tp_del;

    unsigned int         tp_version_tag;

    destructor           tp_finalize;
    vectorcallfunc       tp_vectorcall;

    unsigned char        tp_watched;
    uint16_t             tp_versions_used;
};

/* ========== tp_flags constants ========== */

#define Py_TPFLAGS_HAVE_FINALIZE          (1UL << 0)
#define Py_TPFLAGS_SEQUENCE               (1UL << 5)
#define Py_TPFLAGS_MAPPING                (1UL << 6)
#define Py_TPFLAGS_DISALLOW_INSTANTIATION (1UL << 7)
#define Py_TPFLAGS_IMMUTABLETYPE          (1UL << 8)
#define Py_TPFLAGS_HEAPTYPE               (1UL << 9)
#define Py_TPFLAGS_BASETYPE               (1UL << 10)
#define Py_TPFLAGS_HAVE_VECTORCALL        (1UL << 11)
#define Py_TPFLAGS_READY                  (1UL << 12)
#define Py_TPFLAGS_READYING               (1UL << 13)
#define Py_TPFLAGS_HAVE_GC                (1UL << 14)
#define Py_TPFLAGS_METHOD_DESCRIPTOR      (1UL << 17)
#define Py_TPFLAGS_HAVE_VERSION_TAG       (1UL << 18)
#define Py_TPFLAGS_VALID_VERSION_TAG      (1UL << 19)
#define Py_TPFLAGS_IS_ABSTRACT            (1UL << 20)
#define Py_TPFLAGS_ITEMS_AT_END           (1UL << 23)
#define Py_TPFLAGS_LONG_SUBCLASS          (1UL << 24)
#define Py_TPFLAGS_LIST_SUBCLASS          (1UL << 25)
#define Py_TPFLAGS_TUPLE_SUBCLASS         (1UL << 26)
#define Py_TPFLAGS_BYTES_SUBCLASS         (1UL << 27)
#define Py_TPFLAGS_UNICODE_SUBCLASS       (1UL << 28)
#define Py_TPFLAGS_DICT_SUBCLASS          (1UL << 29)
#define Py_TPFLAGS_BASE_EXC_SUBCLASS      (1UL << 30)
#define Py_TPFLAGS_TYPE_SUBCLASS          (1UL << 31)

#define Py_TPFLAGS_DEFAULT  0

/* ========== Static type initialization macros ========== */

#define PyObject_HEAD_INIT(type)  { 1, (type) },

#define PyVarObject_HEAD_INIT(type, size) \
    { { 1, (type) }, (size) },

/* ========== Global type objects ========== */

extern PyTypeObject PyFloat_Type;
extern PyTypeObject PyLong_Type;
extern PyTypeObject PyBool_Type;
extern PyTypeObject PyUnicode_Type;
extern PyTypeObject PyBytes_Type;
extern PyTypeObject PyList_Type;
extern PyTypeObject PyDict_Type;
extern PyTypeObject PyTuple_Type;
extern PyTypeObject PyBaseObject_Type;
extern PyTypeObject PyType_Type;
extern PyTypeObject _PyNone_Type;

/* ========== NULL ========== */

#ifndef NULL
#define NULL ((void *)0)
#endif

/* ========== Singleton objects ========== */

/* Match CPython's ABI: modules reference the struct symbols directly. */
extern PyObject _Py_NoneStruct;
extern PyObject _Py_TrueStruct;   /* actually PyLongObject in CPython */
extern PyObject _Py_FalseStruct;  /* actually PyLongObject in CPython */

#define Py_None   (&_Py_NoneStruct)
#define Py_True   ((PyObject *)&_Py_TrueStruct)
#define Py_False  ((PyObject *)&_Py_FalseStruct)

#define Py_RETURN_NONE  return Py_None
#define Py_RETURN_TRUE  return Py_True
#define Py_RETURN_FALSE return Py_False

/* ========== Casting ========== */

#define _PyObject_CAST(op) ((PyObject *)(op))

/* ========== Reference counting ========== */

/* _Py_Dealloc is called by CPython's Py_DECREF when refcount hits zero.
   In the shim, object lifetime is managed by GemStone, so this is a no-op. */
void _Py_Dealloc(PyObject *op);

#define Py_INCREF(op)  (++(((PyObject*)(op))->ob_refcnt))
#define Py_DECREF(op)  do { \
        PyObject *_py_decref_tmp = _PyObject_CAST(op); \
        if (--_py_decref_tmp->ob_refcnt == 0) \
            _Py_Dealloc(_py_decref_tmp); \
    } while (0)
#define Py_XINCREF(op) do { if ((op) != NULL) Py_INCREF(op); } while (0)
#define Py_XDECREF(op) do { if ((op) != NULL) Py_DECREF(op); } while (0)

#define Py_CLEAR(op) do { PyObject *_py_tmp = _PyObject_CAST(op); (op) = NULL; Py_XDECREF(_py_tmp); } while (0)
#define Py_SETREF(op, op2) do { PyObject *_py_tmp = _PyObject_CAST(op); (op) = (op2); Py_DECREF(_py_tmp); } while (0)
#define Py_XSETREF(op, op2) do { PyObject *_py_tmp = _PyObject_CAST(op); (op) = (op2); Py_XDECREF(_py_tmp); } while (0)

/* Py_UNUSED — suppress unused parameter warnings */
#define Py_UNUSED(name) _unused_##name __attribute__((unused))

static inline PyObject *Py_NewRef(void *obj) {
    Py_INCREF((PyObject *)obj);
    return (PyObject *)obj;
}
static inline PyObject *Py_XNewRef(void *obj) {
    Py_XINCREF((PyObject *)obj);
    return (PyObject *)obj;
}

/* ========== Method and module definitions ========== */

/* Calling conventions */
#define METH_VARARGS    0x0001
#define METH_KEYWORDS   0x0002
#define METH_NOARGS     0x0004
#define METH_O          0x0008
#define METH_CLASS      0x0010
#define METH_FASTCALL   0x0080
#define METH_METHOD     0x0200

/* Module definition slots — ids MUST match real CPython's moduleobject.h:
   extension .so files compiled against real headers emit these numbers,
   and shimDynLoad walks their slot arrays. */
#define Py_mod_create                1
#define Py_mod_exec                  2
#define Py_mod_multiple_interpreters 3
#define Py_mod_gil                   4
#define Py_MOD_PER_INTERPRETER_GIL_SUPPORTED ((void *)1)
#define Py_MOD_GIL_NOT_USED                  ((void *)1)

typedef struct PyModuleDef_Slot {
    int   slot;
    void *value;
} PyModuleDef_Slot;

typedef struct PyModuleDef_Base {
    PyObject_HEAD
    PyObject* (*m_init)(void);
    Py_ssize_t m_index;
    PyObject*  m_copy;
} PyModuleDef_Base;

typedef struct PyModuleDef {
    PyModuleDef_Base m_base;
    const char      *m_name;
    const char      *m_doc;
    Py_ssize_t       m_size;
    PyMethodDef     *m_methods;
    struct PyModuleDef_Slot *m_slots;
    traverseproc     m_traverse;
    inquiry          m_clear;
    freefunc         m_free;
} PyModuleDef;

#define PyModuleDef_HEAD_INIT { \
    PyObject_HEAD_INIT(NULL)    \
    NULL, /* m_init */          \
    0,    /* m_index */         \
    NULL, /* m_copy */          \
  }

/* PyMODINIT_FUNC: the return type of PyInit_xxx() */
#ifdef _WIN32
#define PyMODINIT_FUNC __declspec(dllexport) PyObject *
#else
#define PyMODINIT_FUNC __attribute__((visibility("default"))) PyObject *
#endif

/* PyDoc_STRVAR: just a string constant. */
#define PyDoc_STRVAR(name, str) static const char name[] = str

/* ========== Type creation (PyType_Spec) ========== */

typedef struct {
    int   slot;
    void *pfunc;
} PyType_Slot;

typedef struct {
    const char    *name;
    int            basicsize;
    int            itemsize;
    unsigned int   flags;
    PyType_Slot   *slots;
} PyType_Spec;

/* Slot IDs for PyType_Slot */
#define Py_bf_getbuffer                 1
#define Py_bf_releasebuffer             2
#define Py_mp_ass_subscript             3
#define Py_mp_length                    4
#define Py_mp_subscript                 5
#define Py_nb_absolute                  6
#define Py_nb_add                       7
#define Py_nb_and                       8
#define Py_nb_bool                      9
#define Py_nb_divmod                   10
#define Py_nb_float                    11
#define Py_nb_floor_divide             12
#define Py_nb_index                    13
#define Py_nb_inplace_add              14
#define Py_nb_inplace_and              15
#define Py_nb_inplace_floor_divide     16
#define Py_nb_inplace_lshift           17
#define Py_nb_inplace_multiply         18
#define Py_nb_inplace_or               19
#define Py_nb_inplace_power            20
#define Py_nb_inplace_remainder        21
#define Py_nb_inplace_rshift           22
#define Py_nb_inplace_subtract         23
#define Py_nb_inplace_true_divide      24
#define Py_nb_inplace_xor              25
#define Py_nb_int                      26
#define Py_nb_invert                   27
#define Py_nb_lshift                   28
#define Py_nb_multiply                 29
#define Py_nb_negative                 30
#define Py_nb_or                       31
#define Py_nb_positive                 32
#define Py_nb_power                    33
#define Py_nb_remainder                34
#define Py_nb_rshift                   35
#define Py_nb_subtract                 36
#define Py_nb_true_divide              37
#define Py_nb_xor                      38
#define Py_sq_ass_item                 39
#define Py_sq_concat                   40
#define Py_sq_contains                 41
#define Py_sq_inplace_concat           42
#define Py_sq_inplace_repeat           43
#define Py_sq_item                     44
#define Py_sq_length                   45
#define Py_sq_repeat                   46
#define Py_tp_alloc                    47
#define Py_tp_base                     48
#define Py_tp_bases                    49
#define Py_tp_call                     50
#define Py_tp_clear                    51
#define Py_tp_dealloc                  52
#define Py_tp_del                      53
#define Py_tp_descr_get                54
#define Py_tp_descr_set                55
#define Py_tp_doc                      56
#define Py_tp_getattr                  57
#define Py_tp_getattro                 58
#define Py_tp_hash                     59
#define Py_tp_init                     60
#define Py_tp_is_gc                    61
#define Py_tp_iter                     62
#define Py_tp_iternext                 63
#define Py_tp_methods                  64
#define Py_tp_new                      65
#define Py_tp_repr                     66
#define Py_tp_richcompare              67
#define Py_tp_setattr                  68
#define Py_tp_setattro                 69
#define Py_tp_str                      70
#define Py_tp_traverse                 71
#define Py_tp_members                  72
#define Py_tp_getset                   73
#define Py_tp_free                     74
#define Py_nb_matrix_multiply          75
#define Py_nb_inplace_matrix_multiply  76
#define Py_am_await                    77
#define Py_am_aiter                    78
#define Py_am_anext                    79
#define Py_tp_finalize                 80
#define Py_am_send                     81
#define Py_tp_vectorcall               82

/* Type creation functions */
PyObject     *PyType_FromSpec(PyType_Spec *spec);
PyObject     *PyType_FromSpecWithBases(PyType_Spec *spec, PyObject *bases);
PyObject     *PyType_FromModuleAndSpec(PyObject *module, PyType_Spec *spec,
                                       PyObject *bases);
void         *PyType_GetSlot(PyTypeObject *type, int slot);
int           PyType_Ready(PyTypeObject *type);
PyObject     *PyType_GenericNew(PyTypeObject *type, PyObject *args,
                                PyObject *kwds);
PyObject     *PyType_GenericAlloc(PyTypeObject *type, Py_ssize_t nitems);
unsigned long PyType_GetFlags(PyTypeObject *type);
PyObject     *PyType_GetModule(PyTypeObject *type);

/* ========== Exception type objects ========== */

/* Match CPython's ABI: these are PyObject* variables (not structs). */
extern PyObject *PyExc_ValueError;
extern PyObject *PyExc_TypeError;
extern PyObject *PyExc_AttributeError;
extern PyObject *PyExc_KeyError;
extern PyObject *PyExc_IndexError;
extern PyObject *PyExc_OverflowError;
extern PyObject *PyExc_ZeroDivisionError;
extern PyObject *PyExc_RuntimeError;
extern PyObject *PyExc_DeprecationWarning;
extern PyObject *PyExc_FutureWarning;
extern PyObject *PyExc_MemoryError;
extern PyObject *PyExc_StopIteration;
extern PyObject *PyExc_SystemError;
extern PyObject *PyExc_RecursionError;
extern PyObject *PyExc_BaseException;
extern PyObject *PyExc_Exception;
extern PyObject *PyExc_LookupError;
extern PyObject *PyExc_ArithmeticError;
extern PyObject *PyExc_NotImplementedError;
extern PyObject *PyExc_OSError;
extern PyObject *PyExc_IOError;          /* alias of OSError in CPython */
extern PyObject *PyExc_ImportError;
extern PyObject *PyExc_NameError;
extern PyObject *PyExc_StopAsyncIteration;
extern PyObject *PyExc_BufferError;
extern PyObject *PyExc_EOFError;
extern PyObject *PyExc_KeyboardInterrupt;
extern PyObject *PyExc_UnicodeError;
extern PyObject *PyExc_UnicodeDecodeError;
extern PyObject *PyExc_UnicodeEncodeError;
extern PyObject *PyExc_RuntimeWarning;
extern PyObject *PyExc_UserWarning;

/* ========== Float API ========== */

PyObject *PyFloat_FromDouble(double v);
double    PyFloat_AsDouble(PyObject *obj);
int       PyFloat_Check(PyObject *obj);

/* ========== Integer API ========== */

PyObject   *PyLong_FromSsize_t(Py_ssize_t v);
PyObject   *PyLong_FromLong(long v);
Py_ssize_t  PyLong_AsSsize_t(PyObject *obj);
long        PyLong_AsLong(PyObject *obj);
int         PyLong_Check(PyObject *obj);

/* ========== Bool API ========== */

int       PyObject_IsTrue(PyObject *obj);
PyObject *PyBool_FromLong(long v);

/* ========== String (Unicode) API ========== */

PyObject   *PyUnicode_FromString(const char *str);
const char *PyUnicode_AsUTF8(PyObject *obj);
int         PyUnicode_Check(PyObject *obj);

/* ========== Bytes API ========== */

PyObject   *PyBytes_FromStringAndSize(const char *data, Py_ssize_t len);
char       *PyBytes_AsString(PyObject *obj);
Py_ssize_t  PyBytes_Size(PyObject *obj);
int         PyBytes_Check(PyObject *obj);

/* Compatibility aliases for macros used in CPython code */
#define PyBytes_AS_STRING(op) PyBytes_AsString(op)
#define PyBytes_GET_SIZE(op)  PyBytes_Size(op)
#define PyBytes_CheckExact(op) PyBytes_Check(op)

/* ========== List API ========== */

PyObject   *PyList_New(Py_ssize_t len);
int         PyList_Append(PyObject *list, PyObject *item);
PyObject   *PyList_GetItem(PyObject *list, Py_ssize_t index);
int         PyList_SetItem(PyObject *list, Py_ssize_t index, PyObject *item);
int         PyList_Insert(PyObject *list, Py_ssize_t index, PyObject *item);
int         PyList_SetSlice(PyObject *list, Py_ssize_t lo, Py_ssize_t hi,
                            PyObject *itemlist);
Py_ssize_t  PyList_Size(PyObject *list);
int         PyList_Check(PyObject *obj);

/* Unchecked macro versions — route through the checked functions. */
#define PyList_GET_SIZE(op)         PyList_Size(op)
#define PyList_GET_ITEM(op, index)  PyList_GetItem((op), (index))
#define PyList_SET_ITEM(op, i, v)   PyList_SetItem((op), (i), (v))

/* ========== Dict API ========== */

PyObject   *PyDict_New(void);
int         PyDict_SetItem(PyObject *dict, PyObject *key, PyObject *value);
int         PyDict_SetItemString(PyObject *dict, const char *key, PyObject *value);
PyObject   *PyDict_GetItem(PyObject *dict, PyObject *key);
PyObject   *PyDict_GetItemString(PyObject *dict, const char *key);
int         PyDict_Contains(PyObject *dict, PyObject *key);
int         PyDict_DelItem(PyObject *dict, PyObject *key);
Py_ssize_t  PyDict_Size(PyObject *dict);
int         PyDict_Check(PyObject *obj);

/* ========== Tuple API ========== */

PyObject   *PyTuple_New(Py_ssize_t len);
int         PyTuple_SetItem(PyObject *tuple, Py_ssize_t pos, PyObject *value);
PyObject   *PyTuple_GetItem(PyObject *tuple, Py_ssize_t pos);
Py_ssize_t  PyTuple_Size(PyObject *tuple);
int         PyTuple_Check(PyObject *obj);

/* ========== Object protocol ========== */

PyObject   *PyObject_GetAttrString(PyObject *obj, const char *name);
int         PyObject_HasAttrString(PyObject *obj, const char *name);
PyObject   *PyObject_Repr(PyObject *obj);
PyObject   *PyObject_Str(PyObject *obj);
Py_ssize_t  PyObject_Length(PyObject *obj);

/* ========== Rich comparison ========== */

#define Py_LT 0
#define Py_LE 1
#define Py_EQ 2
#define Py_NE 3
#define Py_GT 4
#define Py_GE 5

int PyObject_RichCompareBool(PyObject *v, PyObject *w, int op);

/* ========== Error handling ========== */

void      PyErr_SetString(PyObject *type, const char *message);
void      PyErr_Format(PyObject *type, const char *format, ...);
PyObject *PyErr_Occurred(void);
void      PyErr_Clear(void);
PyObject *PyErr_NoMemory(void);
void      PyErr_SetNone(PyObject *type);
void      PyErr_Fetch(PyObject **ptype, PyObject **pvalue, PyObject **ptb);
void      PyErr_Restore(PyObject *type, PyObject *value, PyObject *tb);

/* ========== Argument parsing ========== */

int PyArg_UnpackTuple(PyObject *args, const char *name, Py_ssize_t min,
                      Py_ssize_t max, ...);

/* _PyArg_Parser — used by clinic-generated argument parsing code */
typedef struct _PyArg_Parser {
    const char *format;           /* unused in our shim */
    const char * const *keywords;
    const char *fname;
    const char *custom_msg;
    int pos;                      /* positional-only count */
    int min;
    int max;
    PyObject *kwtuple;
    struct _PyArg_Parser *next;
} _PyArg_Parser;

PyObject *const *
_PyArg_UnpackKeywords(PyObject *const *args, Py_ssize_t nargs,
                      PyObject *kwargs, PyObject *kwnames,
                      _PyArg_Parser *parser,
                      int minpos, int maxpos,
                      int minkw, int varpos,
                      PyObject **buf);

/* _PyNumber_Index — internal alias for PyNumber_Index */
#define _PyNumber_Index PyNumber_Index

/* ========== Module initialization ========== */

PyObject *PyModuleDef_Init(PyModuleDef *def);
int       PyModule_AddObjectRef(PyObject *module, const char *name,
                                PyObject *value);
int       PyModule_Add(PyObject *module, const char *name,
                       PyObject *value);
int       PyModule_AddIntConstant(PyObject *module, const char *name,
                                  long value);
int       PyModule_AddStringConstant(PyObject *module, const char *name,
                                     const char *value);
void     *PyModule_GetState(PyObject *module);

/* ========== Object allocation for C types ========== */

PyObject    *_PyObject_New(PyTypeObject *type);
PyVarObject *_PyObject_NewVar(PyTypeObject *type, Py_ssize_t nitems);

#define PyObject_New(type, typeobj)          ((type *)_PyObject_New(typeobj))
#define PyObject_NewVar(type, typeobj, n)    ((type *)_PyObject_NewVar(typeobj, n))

/* GC no-ops — GemStone manages object lifetime */
void PyObject_GC_Track(void *op);
void PyObject_GC_UnTrack(void *op);
void PyObject_GC_Del(void *op);

/* Py_VISIT — used in tp_traverse implementations (no-op in Grail) */
#define Py_VISIT(op) do { /* no-op */ } while (0)

/* Weak references — no-op in Grail */
static inline void PyObject_ClearWeakRefs(PyObject *op) { (void)op; }

#define _PyObject_GC_New(type, typeobj)       PyObject_New(type, typeobj)
#define _PyObject_GC_NewVar(type, typeobj, n) PyObject_NewVar(type, typeobj, n)
#define PyObject_GC_New(type, typeobj)        PyObject_New(type, typeobj)
#define PyObject_GC_NewVar(type, typeobj, n)  PyObject_NewVar(type, typeobj, n)

/* ========== Integer API (additional) ========== */

PyObject      *PyLong_FromUnsignedLong(unsigned long v);
unsigned long  PyLong_AsUnsignedLong(PyObject *obj);
int            PyIndex_Check(PyObject *obj);
PyObject      *PyNumber_Index(PyObject *obj);
PyObject      *PyLong_FromSize_t(size_t v);

/* ========== String (Unicode) API (additional) ========== */

Py_ssize_t  PyUnicode_GetLength(PyObject *unicode);
PyObject   *PyUnicode_FromStringAndSize(const char *str, Py_ssize_t len);
PyObject   *PyUnicode_Substring(PyObject *str, Py_ssize_t start,
                                Py_ssize_t end);

/* Unicode kind constants (CPython internal representation) */
#define PyUnicode_1BYTE_KIND  1
#define PyUnicode_2BYTE_KIND  2
#define PyUnicode_4BYTE_KIND  4

/* For Grail, all strings are UTF-8 internally. We provide UCS-4 access
   for the SRE engine through a conversion layer. */
typedef uint32_t Py_UCS4;
typedef uint16_t Py_UCS2;
typedef uint8_t  Py_UCS1;

/* Unicode internal access for SRE.
   In CPython, these access the internal compact representation.
   In Grail, we convert UTF-8 → UCS-4 and cache the result. */
Py_ssize_t _grail_PyUnicode_GET_LENGTH(PyObject *op);
int        _grail_PyUnicode_KIND(PyObject *op);
void      *_grail_PyUnicode_DATA(PyObject *op);

#define PyUnicode_GET_LENGTH(op) _grail_PyUnicode_GET_LENGTH(op)
#define PyUnicode_KIND(op)       _grail_PyUnicode_KIND(op)
#define PyUnicode_DATA(op)       _grail_PyUnicode_DATA(op)

#define Py_UNICODE_TOLOWER(ch) _grail_unicode_tolower(ch)
#define Py_UNICODE_TOUPPER(ch) _grail_unicode_toupper(ch)
#define Py_UNICODE_ISALNUM(ch) _grail_unicode_isalnum(ch)

Py_UCS4 _grail_unicode_tolower(Py_UCS4 ch);
Py_UCS4 _grail_unicode_toupper(Py_UCS4 ch);
int     _grail_unicode_isalnum(Py_UCS4 ch);
int     _grail_unicode_iscased_extra(Py_UCS4 ch);

/* ========== Tuple API (additional) ========== */

PyObject *PyTuple_Pack(Py_ssize_t n, ...);

/* Unchecked macro versions */
#define PyTuple_GET_ITEM(op, i)     PyTuple_GetItem((op), (i))
#define PyTuple_SET_ITEM(op, i, v)  PyTuple_SetItem((op), (i), (v))
#define PyTuple_GET_SIZE(op)        PyTuple_Size(op)

/* ========== Sequence protocol ========== */

PyObject   *PySequence_GetItem(PyObject *seq, Py_ssize_t i);
Py_ssize_t  PySequence_Length(PyObject *seq);

/* ========== Object protocol (additional) ========== */

PyObject *PyObject_GetItem(PyObject *obj, PyObject *key);
int       PyObject_SetItem(PyObject *obj, PyObject *key, PyObject *value);
PyObject *PyObject_Call(PyObject *callable, PyObject *args, PyObject *kwargs);
PyObject *PyObject_CallOneArg(PyObject *callable, PyObject *arg);
int       PyObject_SetAttrString(PyObject *obj, const char *name,
                                 PyObject *value);
int       PyCallable_Check(PyObject *obj);
PyObject *PyObject_RichCompare(PyObject *v, PyObject *w, int op);
PyObject *PyObject_Type(PyObject *obj);

/* ========== Slice API ========== */

PyObject *PySlice_New(PyObject *start, PyObject *stop, PyObject *step);
int       PySlice_Unpack(PyObject *slice, Py_ssize_t *start,
                         Py_ssize_t *stop, Py_ssize_t *step);
Py_ssize_t PySlice_AdjustIndices(Py_ssize_t length, Py_ssize_t *start,
                                  Py_ssize_t *stop, Py_ssize_t step);

/* ========== Buffer protocol ========== */

#define PyBUF_SIMPLE    0
#define PyBUF_WRITABLE  0x0001
#define PyBUF_FORMAT    0x0004
#define PyBUF_ND        0x0008
#define PyBUF_STRIDES   (0x0010 | PyBUF_ND)
#define PyBUF_FULL      (PyBUF_FORMAT | PyBUF_STRIDES | PyBUF_WRITABLE)
#define PyBUF_READ      0x100
#define PyBUF_WRITE     0x200

int  PyObject_GetBuffer(PyObject *obj, Py_buffer *view, int flags);
void PyBuffer_Release(Py_buffer *view);
int  PyObject_CheckBuffer(PyObject *obj);

/* ========== Dict API (additional) ========== */

int PyDict_Next(PyObject *dict, Py_ssize_t *ppos, PyObject **pkey,
                PyObject **pvalue);
PyObject *PyDict_GetItemWithError(PyObject *dict, PyObject *key);

/* ========== Argument parsing ========== */

int PyArg_ParseTuple(PyObject *args, const char *format, ...);
int PyArg_Parse(PyObject *arg, const char *format, ...);

/* ========== Warning API ========== */

int PyErr_WarnEx(PyObject *category, const char *message, Py_ssize_t level);

/* ========== Miscellaneous ========== */

/* PyCMethod calling convention (METH_METHOD) */
typedef PyObject *(*PyCMethod)(PyObject *self, PyTypeObject *defining_class,
                               PyObject *const *args, Py_ssize_t nargs,
                               PyObject *kwnames);

/* PyDoc_STR */
#define PyDoc_STR(str) str

/* PY_SSIZE_T_MAX / PY_SSIZE_T_MIN */
#ifndef PY_SSIZE_T_MAX
#define PY_SSIZE_T_MAX  ((Py_ssize_t)(((size_t)-1) >> 1))
#endif
#ifndef PY_SSIZE_T_MIN
#define PY_SSIZE_T_MIN  (-PY_SSIZE_T_MAX - 1)
#endif

/* Py_GenericAlias (used for __class_getitem__ support) */
PyObject *Py_GenericAlias(PyObject *origin, PyObject *args);

/* SIZEOF_SIZE_T and SIZEOF_VOID_P (needed by sre_constants.h in #if directives).
   sizeof() is not available at preprocessor time, so use platform detection. */
#ifndef SIZEOF_SIZE_T
#if defined(__LP64__) || defined(_WIN64) || defined(__x86_64__) || defined(__aarch64__)
#define SIZEOF_SIZE_T 8
#define SIZEOF_VOID_P 8
#else
#define SIZEOF_SIZE_T 4
#define SIZEOF_VOID_P 4
#endif
#endif

/* Py_DEPRECATED macro */
#ifndef Py_DEPRECATED
#define Py_DEPRECATED(ver)
#endif

/* Critical section no-ops (Grail is single-threaded) */
#define Py_BEGIN_CRITICAL_SECTION(op)
#define Py_END_CRITICAL_SECTION()
#define Py_BEGIN_CRITICAL_SECTION2(op1, op2)
#define Py_END_CRITICAL_SECTION2()

/* INT32_MAX if not defined */
#ifndef INT32_MAX
#define INT32_MAX 0x7fffffff
#endif

/* _Py_RVALUE is used in some CPython macros */
#define _Py_RVALUE(x) (x)

/* Py_UNREACHABLE */
#define Py_UNREACHABLE() __builtin_unreachable()

/* Py_ALWAYS_INLINE */
#define Py_ALWAYS_INLINE

/* _Py_CAST */
#define _Py_CAST(type, expr) ((type)(expr))

/* Py_MEMCPY */
#define Py_MEMCPY memcpy

/* Py_LOCAL / Py_LOCAL_INLINE for sre_lib.h */
#define Py_LOCAL(type) static type
#define Py_LOCAL_INLINE(type) static inline type

/* _PyUnicode_IsLinebreak (used by sre_lib.h) */
static inline int _PyUnicode_IsLinebreak(Py_UCS4 ch) {
    return (ch == 0x000A || ch == 0x000B || ch == 0x000C ||
            ch == 0x000D || ch == 0x001C || ch == 0x001D ||
            ch == 0x001E || ch == 0x0085 || ch == 0x2028 ||
            ch == 0x2029);
}

/* SRE engine needs to check for signals periodically */
#define PyErr_CheckSignals() 0

/* _Py_IsDigit, _Py_IsAlpha etc. (used by sre) */
static inline int _Py_IsDigit(Py_UCS4 ch) {
    return ch >= '0' && ch <= '9';
}

/* Py_TOLOWER, Py_ISDIGIT, etc. — ASCII ctype wrappers used by sre's SRE_IS_* macros */
#include <ctype.h>
#define Py_TOLOWER(c)  tolower((unsigned char)(c))
#define Py_TOUPPER(c)  toupper((unsigned char)(c))
#define Py_ISDIGIT(c)  isdigit((unsigned char)(c))
#define Py_ISSPACE(c)  isspace((unsigned char)(c))
#define Py_ISALNUM(c)  isalnum((unsigned char)(c))
#define Py_ISALPHA(c)  isalpha((unsigned char)(c))

/* Py_UNICODE_* category functions (Unicode-aware, used by sre's SRE_UNI_IS_* macros).
   These wrap ICU / POSIX wide-char functions for basic Unicode support. */
#include <wctype.h>

static inline int Py_UNICODE_ISDECIMAL(Py_UCS4 ch) {
    /* ASCII decimal digits + Unicode Nd category (simplified) */
    if (ch < 128) return (ch >= '0' && ch <= '9');
    return iswdigit((wint_t)ch);
}

static inline int Py_UNICODE_ISSPACE(Py_UCS4 ch) {
    if (ch < 128) return isspace((unsigned char)ch);
    return iswspace((wint_t)ch);
}

static inline int Py_UNICODE_ISLINEBREAK(Py_UCS4 ch) {
    return _PyUnicode_IsLinebreak(ch);
}

/* Memory allocation — route to standard library */
#include <stdlib.h>
#define PyMem_Malloc   malloc
#define PyMem_Realloc  realloc
#define PyMem_Free     free
#define PyMem_New(type, n) ((type *)malloc((n) * sizeof(type)))

#define PyObject_Malloc  malloc
#define PyObject_Realloc realloc
#define PyObject_Free    free

/* ========== Additional APIs needed by _sre ========== */

/* Utility macros */
#define Py_ARRAY_LENGTH(array) (sizeof(array) / sizeof((array)[0]))
#define Py_IS_TYPE(op, type) (Py_TYPE(op) == (type))
#define Py_SET_SIZE(op, size) (((PyVarObject *)(op))->ob_size = (size))
#define Py_MIN(a, b) ((a) < (b) ? (a) : (b))
#define Py_MAX(a, b) ((a) > (b) ? (a) : (b))

/* Py_RETURN_NOTIMPLEMENTED */
extern PyObject _Py_NotImplementedStruct;
#define Py_NotImplemented (&_Py_NotImplementedStruct)
#define Py_RETURN_NOTIMPLEMENTED return Py_NotImplemented

/* Vectorcall protocol */
PyObject *PyObject_Vectorcall(PyObject *callable, PyObject *const *args,
                               size_t nargsf, PyObject *kwnames);

/* Error handling (additional) */
int PyErr_ExceptionMatches(PyObject *exc);

/* Unicode (additional) */
#define PyUnicode_CheckExact(op) PyUnicode_Check(op)
PyObject   *PyUnicode_FromFormat(const char *format, ...);
PyObject   *PyUnicode_Join(PyObject *separator, PyObject *seq);
Py_ssize_t  PyUnicode_FindChar(PyObject *str, Py_UCS4 ch,
                                Py_ssize_t start, Py_ssize_t end, int dir);

/* _PyUnicode_Copy — return a copy of the string (simplified: just NewRef) */
static inline PyObject *_PyUnicode_Copy(PyObject *str) {
    return Py_NewRef(str);
}

/* _PyUnicode_JoinArray — join an array of PyObject* strings */
PyObject *_PyUnicode_JoinArray(PyObject *separator, PyObject *const *items,
                                Py_ssize_t seqlen);

/* Bytes (additional) */
PyObject *PyBytes_FromObject(PyObject *obj);
PyObject *PyBytes_Join(PyObject *sep, PyObject *iterable);

/* Import helper */
PyObject *_PyImport_GetModuleAttrString(const char *modname, const char *attrname);

/* Py_BuildValue — format-based value construction */
PyObject *Py_BuildValue(const char *format, ...);

/* Number protocol (additional) */
Py_ssize_t PyNumber_AsSsize_t(PyObject *obj, PyObject *exc);

/* Object protocol (additional) */
Py_hash_t PyObject_Hash(PyObject *obj);
Py_hash_t Py_HashBuffer(const void *ptr, Py_ssize_t len);

/* Dict (additional) */
#define PyDict_GET_SIZE(op) PyDict_Size(op)
PyObject *PyDictProxy_New(PyObject *mapping);

/* Iterator */
PyObject *PyCallIter_New(PyObject *callable, PyObject *sentinel);

/* Member type constants (additional) */
#define _Py_T_OBJECT Py_T_OBJECT_EX

/* Singletons */
#define _Py_SINGLETON(name) /* unused */
#define _Py_STR(name) /* unused */

/* ========== Version constants ========== */

#define PY_MAJOR_VERSION 3
#define PY_MINOR_VERSION 14
#define PY_MICRO_VERSION 0
#define PY_VERSION_HEX 0x030E00A4  /* 3.14.0a4 — matches the forked _sre */

/* ========== Utility macros (additional) ========== */

#define Py_ABS(x) ((x) < 0 ? -(x) : (x))
#define _Py_STRINGIFY2(x) #x
#define Py_STRINGIFY(x) _Py_STRINGIFY2(x)
#define Py_CHARMASK(c) ((unsigned char)((c) & 0xff))

#define Py_RETURN_RICHCOMPARE(val1, val2, op)                               \
    do {                                                                    \
        switch (op) {                                                       \
        case Py_EQ: if ((val1) == (val2)) Py_RETURN_TRUE; Py_RETURN_FALSE;  \
        case Py_NE: if ((val1) != (val2)) Py_RETURN_TRUE; Py_RETURN_FALSE;  \
        case Py_LT: if ((val1) < (val2)) Py_RETURN_TRUE; Py_RETURN_FALSE;   \
        case Py_GT: if ((val1) > (val2)) Py_RETURN_TRUE; Py_RETURN_FALSE;   \
        case Py_LE: if ((val1) <= (val2)) Py_RETURN_TRUE; Py_RETURN_FALSE;  \
        case Py_GE: if ((val1) >= (val2)) Py_RETURN_TRUE; Py_RETURN_FALSE;  \
        default: Py_UNREACHABLE();                                          \
        }                                                                   \
    } while (0)

/* GIL macros — Grail gems are single-threaded; pure no-ops. */
#define Py_BEGIN_ALLOW_THREADS {
#define Py_END_ALLOW_THREADS }
#define Py_BLOCK_THREADS
#define Py_UNBLOCK_THREADS

/* ========== Subclass-aware type checks ========== */

#define PyLong_CheckExact(op)   ((op) != NULL && Py_TYPE(op) == &PyLong_Type)
#define PyFloat_CheckExact(op)  ((op) != NULL && Py_TYPE(op) == &PyFloat_Type)
#define PyList_CheckExact(op)   ((op) != NULL && Py_TYPE(op) == &PyList_Type)
#define PyDict_CheckExact(op)   ((op) != NULL && Py_TYPE(op) == &PyDict_Type)
#define PyTuple_CheckExact(op)  ((op) != NULL && Py_TYPE(op) == &PyTuple_Type)
int PyBool_Check(PyObject *obj);

/* ========== Object protocol — PyObject* attribute names ========== */

PyObject *PyObject_GetAttr(PyObject *obj, PyObject *name);
int       PyObject_SetAttr(PyObject *obj, PyObject *name, PyObject *value);
int       PyObject_HasAttr(PyObject *obj, PyObject *name);

/* ========== Call helpers ========== */

PyObject *PyObject_CallNoArgs(PyObject *callable);
PyObject *PyObject_CallObject(PyObject *callable, PyObject *args);
PyObject *PyObject_CallFunctionObjArgs(PyObject *callable, ...);
PyObject *PyObject_CallMethodObjArgs(PyObject *obj, PyObject *name, ...);

static inline PyObject *PyObject_CallMethodNoArgs(PyObject *self, PyObject *name) {
    PyObject *meth = PyObject_GetAttr(self, name);
    if (!meth) return NULL;
    return PyObject_CallNoArgs(meth);
}
static inline PyObject *PyObject_CallMethodOneArg(PyObject *self, PyObject *name,
                                                  PyObject *arg) {
    PyObject *meth = PyObject_GetAttr(self, name);
    if (!meth) return NULL;
    return PyObject_CallOneArg(meth, arg);
}

/* ========== Iteration protocol ========== */

PyObject *PyObject_GetIter(PyObject *obj);
PyObject *PyIter_Next(PyObject *iterator);
int       PyIter_Check(PyObject *obj);

/* ========== Module helpers (additional) ========== */

int PyModule_AddObject(PyObject *module, const char *name, PyObject *value);
int PyModule_AddType(PyObject *module, PyTypeObject *type);

/* ========== Error handling (additional) ========== */

PyObject *PyErr_NewException(const char *name, PyObject *base, PyObject *dict);
PyObject *PyErr_NewExceptionWithDoc(const char *name, const char *doc,
                                    PyObject *base, PyObject *dict);
void      PyErr_SetObject(PyObject *type, PyObject *value);
int       PyErr_GivenExceptionMatches(PyObject *given, PyObject *exc);
int       PyErr_BadArgument(void);
void      PyErr_BadInternalCall(void);
#define _PyErr_BadInternalCall(filename, lineno) PyErr_BadInternalCall()

/* ========== Integer API (64-bit + double) ========== */

PyObject          *PyLong_FromLongLong(long long v);
long long          PyLong_AsLongLong(PyObject *obj);
PyObject          *PyLong_FromUnsignedLongLong(unsigned long long v);
unsigned long long PyLong_AsUnsignedLongLong(PyObject *obj);
unsigned long      PyLong_AsUnsignedLongMask(PyObject *obj);
PyObject          *PyLong_FromDouble(double v);
double             PyLong_AsDouble(PyObject *obj);

/* ========== Unicode (additional) ========== */

const char *PyUnicode_AsUTF8AndSize(PyObject *unicode, Py_ssize_t *size);
PyObject   *PyUnicode_DecodeUTF8(const char *s, Py_ssize_t size,
                                 const char *errors);
PyObject   *PyUnicode_InternFromString(const char *s);
PyObject   *PyUnicode_Concat(PyObject *left, PyObject *right);

/* ========== Sequence protocol (additional) ========== */

Py_ssize_t PySequence_Size(PyObject *seq);
int        PySequence_Check(PyObject *obj);
int        PySequence_Contains(PyObject *seq, PyObject *item);
int        PySequence_SetItem(PyObject *seq, Py_ssize_t i, PyObject *value);

/* ========== Dict API (additional) ========== */

void      PyDict_Clear(PyObject *dict);
PyObject *PyDict_Keys(PyObject *dict);
PyObject *PyDict_Values(PyObject *dict);
PyObject *PyDict_Items(PyObject *dict);
PyObject *PyDict_Copy(PyObject *dict);
int       PyDict_Update(PyObject *dict, PyObject *other);
int       PyDict_Merge(PyObject *dict, PyObject *other, int override);
PyObject *PyDict_SetDefault(PyObject *dict, PyObject *key,
                            PyObject *defaultobj);

/* ========== List / Tuple (additional) ========== */

PyObject *PyList_GetSlice(PyObject *list, Py_ssize_t low, Py_ssize_t high);
PyObject *PyList_AsTuple(PyObject *list);
int       PyList_Sort(PyObject *list);
int       PyList_Reverse(PyObject *list);
PyObject *PyTuple_GetSlice(PyObject *tuple, Py_ssize_t low, Py_ssize_t high);

/* ========== Sets ========== */

PyObject  *PySet_New(PyObject *iterable);
PyObject  *PyFrozenSet_New(PyObject *iterable);
int        PySet_Add(PyObject *set, PyObject *key);
int        PySet_Contains(PyObject *set, PyObject *key);
int        PySet_Discard(PyObject *set, PyObject *key);
int        PySet_Clear(PyObject *set);
Py_ssize_t PySet_Size(PyObject *set);
int        PySet_Check(PyObject *obj);
int        PyFrozenSet_Check(PyObject *obj);
int        PyAnySet_Check(PyObject *obj);
#define PySet_GET_SIZE(op) PySet_Size(op)

/* ========== Bytearray ========== */

PyObject  *PyByteArray_FromStringAndSize(const char *data, Py_ssize_t len);
char      *PyByteArray_AsString(PyObject *obj);
Py_ssize_t PyByteArray_Size(PyObject *obj);
int        PyByteArray_Check(PyObject *obj);
#define PyByteArray_AS_STRING(op) PyByteArray_AsString(op)
#define PyByteArray_GET_SIZE(op)  PyByteArray_Size(op)

/* ========== Capsules ========== */

typedef void (*PyCapsule_Destructor)(PyObject *);

PyObject   *PyCapsule_New(void *pointer, const char *name,
                          PyCapsule_Destructor destructor);
void       *PyCapsule_GetPointer(PyObject *capsule, const char *name);
const char *PyCapsule_GetName(PyObject *capsule);
int         PyCapsule_IsValid(PyObject *capsule, const char *name);
int         PyCapsule_SetPointer(PyObject *capsule, void *pointer);
void       *PyCapsule_Import(const char *name, int no_block);
int         PyCapsule_CheckExact(PyObject *op);

#ifdef __cplusplus
}  /* extern "C" */
#endif

#endif /* CPYTHON_H */
