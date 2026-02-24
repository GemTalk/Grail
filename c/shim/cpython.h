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
#include <math.h>

/* ========== Core types ========== */

typedef intptr_t Py_ssize_t;
typedef Py_ssize_t Py_hash_t;

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

static inline PyObject *Py_NewRef(PyObject *obj) {
    Py_INCREF(obj);
    return obj;
}
static inline PyObject *Py_XNewRef(PyObject *obj) {
    Py_XINCREF(obj);
    return obj;
}

/* ========== Method and module definitions ========== */

/* Calling conventions */
#define METH_VARARGS    0x0001
#define METH_KEYWORDS   0x0002
#define METH_NOARGS     0x0004
#define METH_O          0x0008
#define METH_FASTCALL   0x0080

/* Module definition slots */
#define Py_mod_exec                  1
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
void         *PyType_GetSlot(PyTypeObject *type, int slot);
int           PyType_Ready(PyTypeObject *type);
PyObject     *PyType_GenericNew(PyTypeObject *type, PyObject *args,
                                PyObject *kwds);
PyObject     *PyType_GenericAlloc(PyTypeObject *type, Py_ssize_t nitems);

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

/* ========== Argument parsing ========== */

int PyArg_UnpackTuple(PyObject *args, const char *name, Py_ssize_t min,
                      Py_ssize_t max, ...);

/* ========== Module initialization ========== */

PyObject *PyModuleDef_Init(PyModuleDef *def);
int       PyModule_AddObjectRef(PyObject *module, const char *name,
                                PyObject *value);
int       PyModule_Add(PyObject *module, const char *name,
                       PyObject *value);

#endif /* CPYTHON_H */
