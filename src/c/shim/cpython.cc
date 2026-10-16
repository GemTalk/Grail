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
#include <execinfo.h>
#include <stdarg.h>
#include <dlfcn.h>
#include <ctype.h>
#include "grail_case_tables.h"   /* generated simple Unicode case tables */

/* GRAIL_SHIM_PROFILE=1: count every GciPerform the shim makes, by selector,
   and print the table at exit -- each one is a crossing into Smalltalk, which
   is where a wheel's time goes (docs/Support_Pydantic.md, Phase 6 / W7).
   Off by default: one getenv per process, then a branch per call. */
static int g_prof_on = -1;
static struct { const char *sel; long n; } g_prof[256];
static int g_prof_count = 0;
static void prof_dump(void) {
    for (int i = 1; i < g_prof_count; i++)          /* insertion sort, by count */
        for (int j = i; j > 0 && g_prof[j].n > g_prof[j - 1].n; j--) {
            auto t = g_prof[j]; g_prof[j] = g_prof[j - 1]; g_prof[j - 1] = t; }
    long total = 0;
    for (int i = 0; i < g_prof_count; i++) total += g_prof[i].n;
    fprintf(stderr, "SHIM-PROFILE: %ld GciPerform calls\n", total);
    for (int i = 0; i < g_prof_count && i < 40; i++)
        fprintf(stderr, "SHIM-PROFILE: %10ld  %s\n", g_prof[i].n, g_prof[i].sel);
}
static OopType grail_counted_perform(OopType r, const char *sel, const OopType *a, int n) {
    if (g_prof_on < 0) {
        g_prof_on = getenv("GRAIL_SHIM_PROFILE") ? 1 : 0;
        if (g_prof_on) atexit(prof_dump);
    }
    if (g_prof_on) {
        int i = 0;
        while (i < g_prof_count && g_prof[i].sel != sel && strcmp(g_prof[i].sel, sel) != 0) i++;
        if (i == g_prof_count && g_prof_count < 256) { g_prof[i].sel = sel; g_prof[i].n = 0; g_prof_count++; }
        if (i < 256) g_prof[i].n++;
    }
    return GciPerform(r, sel, a, n);
}
#define GciPerform(r, s, a, n) grail_counted_perform((r), (s), (a), (n))

/* Reading an element of a result ARRAY the server answered is GciFetchOop,
   a direct read -- not GciPerform(arr, "at:"), a full message send into
   Smalltalk.  The profile above found ``at:'' to be 120 of the 219 crossings
   in one pydantic model_dump(). */
#include "grail_digit_table.h"    /* generated Unicode Nd (decimal digit) ranges */

/* Binary-search a sorted GrailCasePair table; return mapped code or ch. */
static unsigned int grail_case_lookup(const GrailCasePair *map, int len, unsigned int ch) {
    int lo = 0, hi = len - 1;
    while (lo <= hi) {
        int mid = (lo + hi) >> 1;
        unsigned int f = map[mid].from;
        if (f == ch) return map[mid].to;
        if (f < ch) lo = mid + 1; else hi = mid - 1;
    }
    return ch;
}

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

/* Real-CPython-layout objects (e.g. lists built by prebuilt wheels that
   inline PyList_SET_ITEM) are NOT Grail-backed 24-byte CByteArrays — they
   have no OOP at offset 16.  is_real_layout() detects them via a registry;
   real_obj_to_oop() bridges one to an equivalent Grail value's OOP. */
static int is_real_layout(PyObject *obj);
static OopType real_obj_to_oop(PyObject *obj);
static void register_shim_type(PyTypeObject *t);   /* shim type registry */
static int is_shim_type(PyTypeObject *t);          /* type the shim created */
static int is_foreign(PyObject *obj);              /* not a Grail wrapper */
static OopType foreign_number_oop(PyObject *obj, int want_float); /* nb_* slot */
static OopType foreign_proxy_oop(PyObject *obj);   /* reverse proxy bridge */
static int is_foreign_type(PyObject *obj);         /* a wheel's type object */
static inline int plausible_pyobj(const void *p);  /* could this be a PyObject*? */
static void report_bad_pyobj(const char *where, const void *p);
extern "C" int PyType_IsSubtype(PyTypeObject *a, PyTypeObject *b);

/* A TYPE MIRROR: the C-side face of a Grail CLASS (docs/Support_Pydantic.md,
   Phase 5 / W1).  A wrapper cannot be a type -- it is 32 bytes with the OOP at
   offset 16 and GRAIL_WRAP_MAGIC at 24, where a PyTypeObject has ob_size and
   tp_name -- so a class crosses as a full-size PyTypeObject built Smalltalk-side
   (CPythonShim>>typeMirrorFor:): real tp_name / tp_flags / tp_basicsize and a
   tp_base chain, so PyType_Check, PyType_IsSubtype and the PyType_Get* calls
   answer from the struct.  The class's OOP rides in tp_weaklist and this magic
   in tp_cache, two fields nothing in the shim or the limited API reads.
   Offsets are handed to Smalltalk by shimTypeMirrorLayout, never restated. */
#define GRAIL_MIRROR_MAGIC 0x524f5252494d4c47ULL   /* "GLMIRROR" */
#define GRAIL_WRAP_MAGIC 0x475241494C575031ULL    /* "GRAILWP1" -- see is_foreign() */
/* "GRAILFV1": a Grail FLOAT crossing as its VALUE -- [refcnt][&PyFloat_Type]
   [double][this] -- which is a CPython PyFloatObject in its first 24 bytes.
   A wheel built against the full API reads a float with the inline
   PyFloat_AS_DOUBLE (ob_fval, offset 16), and from an ordinary wrapper it
   read the OOP as a double: numpy's np.subtract(2.0, 0.0) answered -6e-323.
   A float is an immutable value, so the wrapper keeps no OOP at all;
   pyobj_oop rebuilds the Grail float from the double (CPythonShim>>wrap:). */
#define GRAIL_FLOAT_MAGIC 0x475241494C465631ULL   /* "GRAILFV1" */
static inline int is_grail_wrapper_magic(uint64_t m) {
    return m == GRAIL_WRAP_MAGIC || m == GRAIL_FLOAT_MAGIC;
}
/* "GRAILPX1": an int or str in CPython 3.14's OWN layout, with its OOP in a
   hidden PREFIX -- [magic][oop] at ptr-16 / ptr-8, before the object, as
   CPython hides its PyGC_Head (docs/Shim_Object_Model.md, section 2).  A
   Cython module reads both inline: an int's lv_tag and 30-bit digits (the
   SmallInteger OOP's tag bits at offset 16 read as "negative"), a str's
   length, hash, state and data.  Detected by ob_type FIRST: an exact int or
   str is only ever made by the shim -- by CPythonShim>>wrap:, or by
   PyUnicode_New for a wheel to fill -- so ptr-16 is never read in front of
   a wheel's own object.  An OOP of 0 is a str C built: pyobj_oop makes the
   Grail str from its data.  An exact bytes too ([ob_size@16][ob_shash@24]
   [data@32]): Cython keeps its signature strings in a bytes constant and
   reads them with the inline PyBytes_AS_STRING -- past the end of a 32-byte
   wrapper -- and its capsules' names point into that buffer. */
#define GRAIL_PREFIX_MAGIC 0x475241494C505831ULL   /* "GRAILPX1" */
static inline int has_grail_prefix(PyObject *obj) {
    PyTypeObject *t = obj->ob_type;
    if (t != &PyLong_Type && t != &PyUnicode_Type && t != &PyBytes_Type) return 0;
    return *(uint64_t *)((char *)obj - 16) == GRAIL_PREFIX_MAGIC;
}
static OopType prefixed_value_oop(PyObject *obj);
static inline int is_type_mirror(PyObject *obj) {
    /* A wrapper is excluded FIRST: it is only 32 bytes, and an instance of a
       mirrored class carries the mirror as its ob_type. */
    if (is_grail_wrapper_magic(*(uint64_t *)((char *)obj + 24))) return 0;
    PyTypeObject *mt = obj->ob_type;
    if (mt == NULL || !plausible_pyobj(mt)) return 0;
    /* Its metatype is type, or itself a mirror (a Grail metaclass). */
    if (mt != &PyType_Type
            && !(mt->ob_base.ob_base.ob_type == &PyType_Type
                 && (uint64_t)(uintptr_t)mt->tp_cache == GRAIL_MIRROR_MAGIC))
        return 0;
    return (uint64_t)(uintptr_t)((PyTypeObject *)obj)->tp_cache == GRAIL_MIRROR_MAGIC;
}

/* A SUBTYPE MIRROR: the C type of a Grail class whose base is a wheel's own
   type -- ``class memmap(ndarray)'' (docs/Shim_Foreign_Subclassing.md, option
   A).  A copy of the base's PyTypeObject, so every slot is the base's, with
   the mirror magic and the class's OOP as a type mirror has them, one more
   word of tp_basicsize, and this second magic in tp_subclasses.  An instance
   is a BODY in the base's layout (numpy reads its fields inline) whose last
   word holds the OOP of its Grail half -- an instance of the Grail class --
   both made together by grail_subtype_alloc, whoever asked: Python's
   ``memmap(...)'' or numpy's own ``m[1:]''.  pyobj_oop answers the half. */
#define GRAIL_SUBTYPE_MAGIC 0x50595442555347ULL    /* "GSUBTYP" */
static inline int is_subtype_mirror(PyTypeObject *t) {
    return t != NULL && (uint64_t)(uintptr_t)t->tp_subclasses == GRAIL_SUBTYPE_MAGIC
        && (uint64_t)(uintptr_t)t->tp_cache == GRAIL_MIRROR_MAGIC;
}
/* For shim_pyo3.cc's PyType_GetQualName / GetModuleName: a subtype
   mirror's tp_name is the bare class name, as a CPython heap type's is. */
extern "C" int _grail_is_subtype_mirror(PyTypeObject *t) { return is_subtype_mirror(t); }
static inline int is_subtype_body(PyObject *obj) {
    if (is_grail_wrapper_magic(*(uint64_t *)((char *)obj + 24))) return 0;
    PyTypeObject *t = obj->ob_type;
    return t != NULL && plausible_pyobj(t) && is_subtype_mirror(t);
}
static inline PyTypeObject *subtype_real_base(PyTypeObject *t) {
    while (t != NULL && is_subtype_mirror(t)) t = t->tp_base;
    return t;
}
static PyObject *subtype_python_attr(OopType target, const char *name, int *found);
static inline OopType subtype_body_oop(PyObject *obj) {
    return *(OopType *)((char *)obj + obj->ob_type->tp_basicsize - 8);
}

static OopType notimpl_oop(void);                 /* Grail's NotImplemented */
static OopType ellipsis_oop(void);                /* Grail's Ellipsis */
extern "C" PyObject _Py_EllipsisObject;           /* shim_numpy.cc */
static inline OopType pyobj_oop(PyObject *obj) {
    if (obj == NULL)     return none_oop;
    if (obj == Py_None)  return none_oop;
    if (obj == Py_NotImplemented) return notimpl_oop();
    if (obj == &_Py_EllipsisObject) return ellipsis_oop();
    if (obj == Py_True)  return true_oop;
    if (obj == Py_False) return false_oop;
    /* Every line below this dereferences obj.  Report and bail instead of
       taking the gem down when what arrived cannot be a PyObject* at all --
       see plausible_pyobj().  Deliberately does NOT raise: this helper runs
       inside user actions, where an unwind is its own failure mode
       (RT_ERR_CANT_RETURN), and every caller can cope with a nil.  The
       stderr line is the attribution; CHECK_pyObj raises at the API
       boundary, where there is a return path. */
    if (!plausible_pyobj(obj)) { report_bad_pyobj("pyobj_oop", obj); return none_oop; }
    if (has_grail_prefix(obj)) {
        OopType oop = *(OopType *)((char *)obj - 8);
        return oop != 0 ? oop : prefixed_value_oop(obj);
    }
    if (is_real_layout(obj)) return real_obj_to_oop(obj);
    /* Before is_type_mirror: a body's ob_type IS a mirror, and that test reads
       a type's fields far past the end of a body. */
    if (is_subtype_body(obj)) return subtype_body_oop(obj);
    if (is_type_mirror(obj)) return (OopType)(uintptr_t)((PyTypeObject *)obj)->tp_weaklist;
    if (is_foreign(obj)) return foreign_proxy_oop(obj);
    if (*(uint64_t *)((char *)obj + 24) == GRAIL_FLOAT_MAGIC)
        return GciFltToOop(*(double *)((char *)obj + 16));
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

/* Types a prebuilt wheel references by ADDRESS but whose instances the shim
   never hands out: PyO3 links PyByteArray_Type / PyFunction_Type /
   PyModule_Type for its PyByteArray_Check / PyFunction_Check /
   PyModule_Check, and a missing data symbol fails dlopen outright
   (docs/Support_Pydantic.md, Phase 1).  NOT registered with
   register_shim_type: no Grail wrapper carries one as its ob_type
   (typeAddrFor: never answers them), so registering would only make a
   wheel's own object of that type look like a wrapper. */
PyTypeObject PyByteArray_Type;
PyTypeObject PyFunction_Type;
PyTypeObject PyModule_Type;

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

static void init_exception_types(void);   /* below, with the exception objects */
static void install_value_type_slots(void);   /* below, with the number protocol */

/* object.__new__ for a wheel's own subtype: allocate subtype->tp_basicsize
   through the subtype's allocator.  PyO3 creates EVERY pyclass instance whose
   base is object by calling PyBaseObject_Type's tp_new with the subtype, and
   with it NULL answered ``TypeError: base type without tp_new'' for the first
   instance pydantic_core makes at import. */
extern "C" PyObject *PyType_GenericAlloc(PyTypeObject *type, Py_ssize_t nitems);
static PyObject *object_tp_new(PyTypeObject *subtype, PyObject *args, PyObject *kwds) {
    (void)args; (void)kwds;
    allocfunc alloc = subtype->tp_alloc ? subtype->tp_alloc : PyType_GenericAlloc;
    return alloc(subtype, 0);
}

/* float.__new__(type, x=0.0): Grail's float() decides the value -- a str
   parsed, __float__ / __index__ honoured, CPython's errors -- and a SUBTYPE
   gets an instance of its own, the value stored at ob_fval.  numpy's
   numpy.float64 subclasses float and builds every instance through
   PyFloat_Type.tp_new (scalartypes.c double_arrtype_new); with object's
   tp_new inherited it got a zeroed object back, so np.float64(0.5) was 0.0
   and np.float64(0.5) + 1 was 1.0.  The server is asked directly: the
   static type is foreign to PyObject_Call, which would come back here. */
static int check_gci_error(void);
static PyObject *float_tp_new(PyTypeObject *type, PyObject *args, PyObject *kwds) {
    if (kwds != NULL && PyDict_Size(kwds) > 0) {
        PyErr_SetString(PyExc_TypeError, "float() takes no keyword arguments");
        return NULL;
    }
    Py_ssize_t n = args ? PyTuple_Size(args) : 0;
    if (n > 1) {
        PyErr_Format(PyExc_TypeError, "float expected at most 1 argument, got %zd", n);
        return NULL;
    }
    double v = 0.0;
    if (n == 1) {
        OopType cargs[2] = { pyobj_oop((PyObject *)&PyFloat_Type), pyobj_oop(args) };
        OopType r = GciPerform(server, "PyObject_Call:args:", cargs, 2);
        if (check_gci_error()) return NULL;
        PyObject *g = addr_to_pyobj(r);
        if (type == &PyFloat_Type) return g;
        v = PyFloat_AsDouble(g);
        if (v == -1.0 && PyErr_Occurred()) return NULL;
    } else if (type == &PyFloat_Type) {
        return PyFloat_FromDouble(0.0);
    }
    allocfunc alloc = type->tp_alloc ? type->tp_alloc : PyType_GenericAlloc;
    PyObject *o = alloc(type, 0);
    if (o == NULL) return NULL;
    *(double *)((char *)o + 16) = v;
    return o;
}

/* builtins.<type>(*args, **kwds) in Grail, for one of the shim's own static
   types.  The server is asked directly, as float_tp_new does: the static
   type is foreign to PyObject_Call, which would come back to its tp_new. */
static PyObject *grail_static_type_call(PyTypeObject *type, PyObject *args, PyObject *kwds) {
    OopType r;
    if (kwds != NULL && PyDict_Size(kwds) > 0) {
        OopType cargs[3] = { pyobj_oop((PyObject *)type), pyobj_oop(args), pyobj_oop(kwds) };
        r = GciPerform(server, "PyObject_Call:args:kwargs:", cargs, 3);
    } else {
        OopType cargs[2] = { pyobj_oop((PyObject *)type), args ? pyobj_oop(args) : OOP_NIL };
        r = GciPerform(server, "PyObject_Call:args:", cargs, 2);
    }
    if (check_gci_error()) return NULL;
    return addr_to_pyobj(r);
}

/* bytes.__new__(type, ...): Grail's bytes() decides the value, and a SUBTYPE
   gets an instance of its own in CPython's PyBytesObject layout -- ob_size,
   ob_shash, then the bytes at ob_sval -- as bytes_subtype_new builds it,
   because a wheel reads that data inline (PyBytes_AS_STRING).  numpy's
   numpy.bytes_ subclasses bytes and builds its instances through
   PyBytes_Type.tp_new. */
#define GRAIL_BYTES_SVAL_OFFSET 32
static PyObject *bytes_tp_new(PyTypeObject *type, PyObject *args, PyObject *kwds) {
    PyObject *g = grail_static_type_call(&PyBytes_Type, args, kwds);
    if (g == NULL || type == &PyBytes_Type) return g;
    Py_ssize_t n = PyBytes_Size(g);
    const char *data = PyBytes_AsString(g);
    if (data == NULL) return NULL;
    allocfunc alloc = type->tp_alloc ? type->tp_alloc : PyType_GenericAlloc;
    PyObject *o = alloc(type, n);
    if (o == NULL) return NULL;
    Py_SET_SIZE(o, n);
    *(Py_hash_t *)((char *)o + 24) = -1;
    memcpy((char *)o + GRAIL_BYTES_SVAL_OFFSET, data, (size_t)n);
    ((char *)o)[GRAIL_BYTES_SVAL_OFFSET + n] = '\0';
    return o;
}

/* str.__new__(type, ...): Grail's str() for str itself.  A SUBTYPE (numpy's
   numpy.str_) still gets a zeroed instance -- what object's tp_new gave it
   before -- because CPython's PyUnicodeObject layout is not built here yet. */
static PyObject *unicode_tp_new(PyTypeObject *type, PyObject *args, PyObject *kwds) {
    if (type == &PyUnicode_Type) return grail_static_type_call(&PyUnicode_Type, args, kwds);
    return object_tp_new(type, args, kwds);
}

static void init_types(void) {
    init_type(&PyType_Type, "type", &PyBaseObject_Type,
              Py_TPFLAGS_DEFAULT | Py_TPFLAGS_BASETYPE | Py_TPFLAGS_TYPE_SUBCLASS);
    /* PyType_Type's metatype is itself */
    PyType_Type.ob_base.ob_base.ob_type = &PyType_Type;

    init_type(&PyBaseObject_Type, "object", NULL,
              Py_TPFLAGS_DEFAULT | Py_TPFLAGS_BASETYPE);
    PyBaseObject_Type.tp_basicsize = sizeof(PyObject);
    PyBaseObject_Type.tp_new = object_tp_new;
    PyBaseObject_Type.tp_alloc = PyType_GenericAlloc;

    init_type(&PyFloat_Type, "float", &PyBaseObject_Type,
              Py_TPFLAGS_DEFAULT | Py_TPFLAGS_BASETYPE);
    PyFloat_Type.tp_new = float_tp_new;

    init_type(&PyLong_Type, "int", &PyBaseObject_Type,
              Py_TPFLAGS_DEFAULT | Py_TPFLAGS_BASETYPE | Py_TPFLAGS_LONG_SUBCLASS);

    init_type(&PyBool_Type, "bool", &PyLong_Type,
              Py_TPFLAGS_DEFAULT | Py_TPFLAGS_LONG_SUBCLASS);

    init_type(&PyUnicode_Type, "str", &PyBaseObject_Type,
              Py_TPFLAGS_DEFAULT | Py_TPFLAGS_BASETYPE | Py_TPFLAGS_UNICODE_SUBCLASS);
    PyUnicode_Type.tp_new = unicode_tp_new;

    init_type(&PyBytes_Type, "bytes", &PyBaseObject_Type,
              Py_TPFLAGS_DEFAULT | Py_TPFLAGS_BASETYPE | Py_TPFLAGS_BYTES_SUBCLASS);
    PyBytes_Type.tp_new = bytes_tp_new;

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

    init_type(&PyByteArray_Type, "bytearray", &PyBaseObject_Type,
              Py_TPFLAGS_DEFAULT | Py_TPFLAGS_BASETYPE | Py_TPFLAGS_SEQUENCE);
    init_type(&PyFunction_Type, "function", &PyBaseObject_Type,
              Py_TPFLAGS_DEFAULT);
    init_type(&PyModule_Type, "module", &PyBaseObject_Type,
              Py_TPFLAGS_DEFAULT | Py_TPFLAGS_BASETYPE);
    /* set / frozenset: pyo3-ffi INLINES PySet_Check / PyFrozenSet_Check as
       ``Py_TYPE(o) == &PySet_Type || PyType_IsSubtype(...)'', so a Grail set
       has to cross typed as these and they have to be real types.  Both were
       zeroed declarations (shim_numpy.cc), never initialised -- a NULL
       ob_type -- and a Grail set crossed as ``object'', so pydantic_core
       refused a model's fields-set for model_dump(exclude_unset=True). */
    init_type(&PySet_Type, "set", &PyBaseObject_Type,
              Py_TPFLAGS_DEFAULT | Py_TPFLAGS_BASETYPE);
    init_type(&PyFrozenSet_Type, "frozenset", &PyBaseObject_Type,
              Py_TPFLAGS_DEFAULT | Py_TPFLAGS_BASETYPE);
    /* slice likewise: numpy's indexing tests PySlice_Check -- an inline
       ``Py_TYPE(o) == &PySlice_Type'' -- and reads the bounds through
       PySlice_Unpack, so a Grail slice crossing typed ``object'' made a[:, 1]
       an IndexError. */
    init_type(&PySlice_Type, "slice", &PyBaseObject_Type, Py_TPFLAGS_DEFAULT);

    /* CPython 3.14.8's instance sizes (``T.__basicsize__'', ``__itemsize__'').
       A Cython module checks a type it imports against the struct it was
       compiled with -- ``builtins.type size changed, may indicate binary
       incompatibility. Expected 936 from C header, got 0'' -- and a wheel's
       subtype of one of these starts its own fields after them. */
    {
        static const struct { PyTypeObject *t; Py_ssize_t basic, item; } sizes[] = {
            { &PyType_Type, 936, 40 }, { &PyBaseObject_Type, 16, 0 },
            { &PyLong_Type, 24, 4 },   { &PyBool_Type, 24, 4 },
            { &PyFloat_Type, 24, 0 },  { &PyUnicode_Type, 64, 0 },
            { &PyBytes_Type, 33, 1 },  { &PyByteArray_Type, 56, 0 },
            { &PyList_Type, 40, 0 },   { &PyTuple_Type, 32, 8 },
            { &PyDict_Type, 48, 0 },   { &PySet_Type, 200, 0 },
            { &PyFrozenSet_Type, 200, 0 }, { &PySlice_Type, 40, 0 },
            { &_PyNone_Type, 16, 0 },  { &PyModule_Type, 56, 0 },
            { &PyFunction_Type, 152, 0 },
        };
        for (size_t i = 0; i < sizeof(sizes) / sizeof(sizes[0]); i++) {
            sizes[i].t->tp_basicsize = sizes[i].basic;
            sizes[i].t->tp_itemsize = sizes[i].item;
        }
    }

    /* Record every static shim type so is_foreign() can tell a Grail-backed
       wrapper (ob_type is one of these) from a wheel's own object. */
    register_shim_type(&PyType_Type);
    register_shim_type(&PyBaseObject_Type);
    register_shim_type(&PyFloat_Type);
    register_shim_type(&PyLong_Type);
    register_shim_type(&PyBool_Type);
    register_shim_type(&PyUnicode_Type);
    register_shim_type(&PyBytes_Type);
    register_shim_type(&PyList_Type);
    register_shim_type(&PyDict_Type);
    register_shim_type(&PyTuple_Type);
    register_shim_type(&_PyNone_Type);
    register_shim_type(&PySet_Type);
    register_shim_type(&PyFrozenSet_Type);
    register_shim_type(&PySlice_Type);

    init_exception_types();
    install_value_type_slots();
}

/* ====================================================================
 * Exception type objects — PyObject* variables matching CPython's ABI
 *
 * The shim's error state compares them by IDENTITY (get_error_type,
 * PyErr_GivenExceptionMatches), which is all a hand-written C module needs.
 * They used to be 16-byte sentinels, { 1, NULL }, and that was enough.
 *
 * A PyO3 wheel needs more: its error path runs PyExceptionClass_Check(t),
 * which pyo3-ffi INLINES as Py_TYPE(t)->tp_flags & Py_TPFLAGS_TYPE_SUBCLASS
 * and then t->tp_flags & Py_TPFLAGS_BASE_EXC_SUBCLASS -- a NULL ob_type is a
 * segfault on the first error it raises (docs/Support_Pydantic.md, W2).  So
 * each is a real, zeroed PyTypeObject whose metatype is type, named, with
 * tp_base following exc_parent_table below (init_exception_types).  Identity
 * is unchanged, so nothing that compared pointers can tell the difference.
 *
 * Each also has a tp_new (exc_tp_new) that allocates a
 * PyBaseExceptionObject-layout body, because a wheel's pyclass that EXTENDS
 * one gets its storage from the base's tp_new.  What that body is NOT yet is
 * a Grail exception: raising one into Grail is Phase 3 of the plan.
 * ==================================================================== */

static PyTypeObject _exc_ValueError;
static PyTypeObject _exc_TypeError;
static PyTypeObject _exc_AttributeError;
static PyTypeObject _exc_KeyError;
static PyTypeObject _exc_IndexError;
static PyTypeObject _exc_OverflowError;
static PyTypeObject _exc_ZeroDivisionError;
static PyTypeObject _exc_RuntimeError;
static PyTypeObject _exc_DeprecationWarning;
static PyTypeObject _exc_FutureWarning;
static PyTypeObject _exc_MemoryError;
static PyTypeObject _exc_StopIteration;
static PyTypeObject _exc_SystemError;
static PyTypeObject _exc_RecursionError;
static PyTypeObject _exc_BaseException;
static PyTypeObject _exc_Exception;
static PyTypeObject _exc_LookupError;
static PyTypeObject _exc_ArithmeticError;
static PyTypeObject _exc_NotImplementedError;
static PyTypeObject _exc_OSError;
static PyTypeObject _exc_ImportError;
static PyTypeObject _exc_ModuleNotFoundError;
static PyTypeObject _exc_NameError;
static PyTypeObject _exc_StopAsyncIteration;
static PyTypeObject _exc_BufferError;
static PyTypeObject _exc_EOFError;
static PyTypeObject _exc_KeyboardInterrupt;
static PyTypeObject _exc_UnicodeError;
static PyTypeObject _exc_UnicodeDecodeError;
static PyTypeObject _exc_UnicodeEncodeError;
static PyTypeObject _exc_RuntimeWarning;
static PyTypeObject _exc_UserWarning;
static PyTypeObject _exc_AssertionError;
static PyTypeObject _exc_BaseExceptionGroup;
static PyTypeObject _exc_GeneratorExit;
static PyTypeObject _exc_UnboundLocalError;

PyObject *PyExc_ValueError        = (PyObject *)&_exc_ValueError;
PyObject *PyExc_TypeError         = (PyObject *)&_exc_TypeError;
PyObject *PyExc_AttributeError    = (PyObject *)&_exc_AttributeError;
PyObject *PyExc_KeyError          = (PyObject *)&_exc_KeyError;
PyObject *PyExc_IndexError        = (PyObject *)&_exc_IndexError;
PyObject *PyExc_OverflowError     = (PyObject *)&_exc_OverflowError;
PyObject *PyExc_ZeroDivisionError = (PyObject *)&_exc_ZeroDivisionError;
PyObject *PyExc_RuntimeError      = (PyObject *)&_exc_RuntimeError;
PyObject *PyExc_DeprecationWarning = (PyObject *)&_exc_DeprecationWarning;
PyObject *PyExc_FutureWarning     = (PyObject *)&_exc_FutureWarning;
PyObject *PyExc_MemoryError       = (PyObject *)&_exc_MemoryError;
PyObject *PyExc_StopIteration     = (PyObject *)&_exc_StopIteration;
PyObject *PyExc_SystemError       = (PyObject *)&_exc_SystemError;
PyObject *PyExc_RecursionError    = (PyObject *)&_exc_RecursionError;
PyObject *PyExc_BaseException     = (PyObject *)&_exc_BaseException;
PyObject *PyExc_Exception         = (PyObject *)&_exc_Exception;
PyObject *PyExc_LookupError       = (PyObject *)&_exc_LookupError;
PyObject *PyExc_ArithmeticError   = (PyObject *)&_exc_ArithmeticError;
PyObject *PyExc_NotImplementedError = (PyObject *)&_exc_NotImplementedError;
PyObject *PyExc_OSError           = (PyObject *)&_exc_OSError;
PyObject *PyExc_IOError           = (PyObject *)&_exc_OSError;  /* alias, as in CPython */
PyObject *PyExc_ImportError       = (PyObject *)&_exc_ImportError;
PyObject *PyExc_ModuleNotFoundError = (PyObject *)&_exc_ModuleNotFoundError;
PyObject *PyExc_NameError         = (PyObject *)&_exc_NameError;
PyObject *PyExc_StopAsyncIteration = (PyObject *)&_exc_StopAsyncIteration;
PyObject *PyExc_BufferError       = (PyObject *)&_exc_BufferError;
PyObject *PyExc_EOFError          = (PyObject *)&_exc_EOFError;
PyObject *PyExc_KeyboardInterrupt = (PyObject *)&_exc_KeyboardInterrupt;
PyObject *PyExc_UnicodeError      = (PyObject *)&_exc_UnicodeError;
PyObject *PyExc_UnicodeDecodeError = (PyObject *)&_exc_UnicodeDecodeError;
PyObject *PyExc_UnicodeEncodeError = (PyObject *)&_exc_UnicodeEncodeError;
PyObject *PyExc_RuntimeWarning    = (PyObject *)&_exc_RuntimeWarning;
PyObject *PyExc_UserWarning       = (PyObject *)&_exc_UserWarning;
PyObject *PyExc_AssertionError    = (PyObject *)&_exc_AssertionError;
PyObject *PyExc_BaseExceptionGroup = (PyObject *)&_exc_BaseExceptionGroup;
PyObject *PyExc_GeneratorExit     = (PyObject *)&_exc_GeneratorExit;
PyObject *PyExc_UnboundLocalError = (PyObject *)&_exc_UnboundLocalError;

/* Exception hierarchy for PyErr_(Given)ExceptionMatches. Each row is
   { child, parent }; matching walks child→parent until NULL. Only the
   relationships extensions actually test for are modeled. */
static PyTypeObject *const exc_parent_table[][2] = {
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
    { &_exc_ModuleNotFoundError, &_exc_ImportError },
    { &_exc_ImportError,        &_exc_Exception },
    { &_exc_NameError,          &_exc_Exception },
    { &_exc_UnboundLocalError,  &_exc_NameError },
    { &_exc_BufferError,        &_exc_Exception },
    { &_exc_AssertionError,     &_exc_Exception },
    { &_exc_BaseExceptionGroup, &_exc_BaseException },
    { &_exc_Exception,          &_exc_BaseException },
    { &_exc_KeyboardInterrupt,  &_exc_BaseException },
    { &_exc_GeneratorExit,      &_exc_BaseException },
    { NULL, NULL }
};

static PyObject *exc_parent_of(PyObject *exc) {
    for (int i = 0; exc_parent_table[i][0]; i++) {
        if ((PyObject *)exc_parent_table[i][0] == exc)
            return (PyObject *)exc_parent_table[i][1];
    }
    return NULL;
}

/* Give every static exception its type-object identity: named, metatype
   type, BASE_EXC_SUBCLASS, and tp_base from exc_parent_table (Exception is
   the default parent, BaseException's is object).  Called from
   init_types(), before any module loads. */
/* CPython 3.14's PyBaseExceptionObject, which a wheel's exception pyclass
   (ValidationError extends ValueError) is laid out AFTER: PyO3 sizes the
   pyclass as this plus its own fields, and calls the base's tp_new to get
   the storage. */
typedef struct {
    Py_ssize_t    ob_refcnt;
    PyTypeObject *ob_type;
    PyObject     *dict;
    PyObject     *args;
    PyObject     *notes;
    PyObject     *traceback;
    PyObject     *context;
    PyObject     *cause;
    char          suppress_context;
} ShimBaseExceptionObject;

static PyObject *exc_tp_new(PyTypeObject *subtype, PyObject *args, PyObject *kwds) {
    (void)kwds;
    allocfunc alloc = subtype->tp_alloc ? subtype->tp_alloc : PyType_GenericAlloc;
    if (subtype->tp_basicsize < (Py_ssize_t)sizeof(ShimBaseExceptionObject)) {
        PyErr_Format(PyExc_SystemError, "exception type '%s' is smaller than BaseException",
                     subtype->tp_name ? subtype->tp_name : "?");
        return NULL;
    }
    ShimBaseExceptionObject *e = (ShimBaseExceptionObject *)alloc(subtype, 0);
    if (e == NULL) return NULL;
    Py_XINCREF(args);
    e->args = args;
    return (PyObject *)e;
}

static void init_exc_type(PyTypeObject *t, const char *name) {
    memset(t, 0, sizeof(PyTypeObject));
    t->ob_base.ob_base.ob_refcnt = 1;
    t->ob_base.ob_base.ob_type = &PyType_Type;
    t->tp_name = name;
    t->tp_basicsize = sizeof(ShimBaseExceptionObject);
    t->tp_new = exc_tp_new;
    t->tp_alloc = PyType_GenericAlloc;
    t->tp_flags = Py_TPFLAGS_DEFAULT | Py_TPFLAGS_BASETYPE
                | Py_TPFLAGS_BASE_EXC_SUBCLASS | Py_TPFLAGS_READY;
}

static void init_exception_types(void) {
    init_exc_type(&_exc_ValueError, "ValueError");
    init_exc_type(&_exc_TypeError, "TypeError");
    init_exc_type(&_exc_AttributeError, "AttributeError");
    init_exc_type(&_exc_KeyError, "KeyError");
    init_exc_type(&_exc_IndexError, "IndexError");
    init_exc_type(&_exc_OverflowError, "OverflowError");
    init_exc_type(&_exc_ZeroDivisionError, "ZeroDivisionError");
    init_exc_type(&_exc_RuntimeError, "RuntimeError");
    init_exc_type(&_exc_DeprecationWarning, "DeprecationWarning");
    init_exc_type(&_exc_FutureWarning, "FutureWarning");
    init_exc_type(&_exc_MemoryError, "MemoryError");
    init_exc_type(&_exc_StopIteration, "StopIteration");
    init_exc_type(&_exc_SystemError, "SystemError");
    init_exc_type(&_exc_RecursionError, "RecursionError");
    init_exc_type(&_exc_BaseException, "BaseException");
    init_exc_type(&_exc_Exception, "Exception");
    init_exc_type(&_exc_LookupError, "LookupError");
    init_exc_type(&_exc_ArithmeticError, "ArithmeticError");
    init_exc_type(&_exc_NotImplementedError, "NotImplementedError");
    init_exc_type(&_exc_OSError, "OSError");
    init_exc_type(&_exc_ImportError, "ImportError");
    init_exc_type(&_exc_ModuleNotFoundError, "ModuleNotFoundError");
    init_exc_type(&_exc_NameError, "NameError");
    init_exc_type(&_exc_StopAsyncIteration, "StopAsyncIteration");
    init_exc_type(&_exc_BufferError, "BufferError");
    init_exc_type(&_exc_EOFError, "EOFError");
    init_exc_type(&_exc_KeyboardInterrupt, "KeyboardInterrupt");
    init_exc_type(&_exc_UnicodeError, "UnicodeError");
    init_exc_type(&_exc_UnicodeDecodeError, "UnicodeDecodeError");
    init_exc_type(&_exc_UnicodeEncodeError, "UnicodeEncodeError");
    init_exc_type(&_exc_RuntimeWarning, "RuntimeWarning");
    init_exc_type(&_exc_UserWarning, "UserWarning");
    init_exc_type(&_exc_AssertionError, "AssertionError");
    init_exc_type(&_exc_GeneratorExit, "GeneratorExit");
    init_exc_type(&_exc_UnboundLocalError, "UnboundLocalError");
    init_exc_type(&_exc_BaseExceptionGroup, "BaseExceptionGroup");
    for (int i = 0; exc_parent_table[i][0]; i++)
        exc_parent_table[i][0]->tp_base = exc_parent_table[i][1];
    PyTypeObject *const unparented[] = {
        &_exc_ValueError,
        &_exc_TypeError,
        &_exc_AttributeError,
        &_exc_KeyError,
        &_exc_IndexError,
        &_exc_OverflowError,
        &_exc_ZeroDivisionError,
        &_exc_RuntimeError,
        &_exc_DeprecationWarning,
        &_exc_FutureWarning,
        &_exc_MemoryError,
        &_exc_StopIteration,
        &_exc_SystemError,
        &_exc_RecursionError,
        &_exc_BaseException,
        &_exc_Exception,
        &_exc_LookupError,
        &_exc_ArithmeticError,
        &_exc_NotImplementedError,
        &_exc_OSError,
        &_exc_ImportError,
        &_exc_ModuleNotFoundError,
        &_exc_NameError,
        &_exc_StopAsyncIteration,
        &_exc_BufferError,
        &_exc_EOFError,
        &_exc_KeyboardInterrupt,
        &_exc_UnicodeError,
        &_exc_UnicodeDecodeError,
        &_exc_UnicodeEncodeError,
        &_exc_RuntimeWarning,
        &_exc_UserWarning,
        &_exc_AssertionError,
        &_exc_BaseExceptionGroup,
    };
    for (size_t i = 0; i < sizeof(unparented) / sizeof(unparented[0]); i++)
        if (unparented[i]->tp_base == NULL)
            unparented[i]->tp_base = (unparented[i] == &_exc_BaseException)
                ? &PyBaseObject_Type : &_exc_Exception;
}

/* Dynamically created exception types (PyErr_NewException). Each is a
   bare sentinel object plus its dotted name; get_error_type reports the
   part after the last dot so the server raises a sensibly named error. */
#define MAX_DYN_EXCEPTIONS 32

static struct {
    PyTypeObject   obj;       /* a real type object; see init_exc_type */
    char           name[128];
    PyObject      *base;
} dyn_exceptions[MAX_DYN_EXCEPTIONS];
static int dyn_exception_count = 0;

/* NotImplemented singleton.  Typed by init_types (NotImplementedType), and
   crossing both ways as Grail's NotImplemented: pyobj_oop answers its OOP,
   asked once per session of CPythonShim>>___notImplemented, and Grail hands C
   this address for it (CPythonShim>>initTypeAddresses).  A wheel's binary
   slot answers it to decline an operand -- numpy's do for a type they do not
   know -- and read as anything else, the other operand was never tried. */
PyObject _Py_NotImplementedStruct = { 1, NULL };
static PyTypeObject _PyNotImplemented_Type;
static OopType g_notimpl_oop = 0;
/* Ellipsis the same way: numpy's indexing tests ``index == Py_Ellipsis'' by
   pointer, so ``y[-1, ...]'' was an IndexError while Grail's Ellipsis
   crossed as a wrapper. */
static PyTypeObject _PyEllipsis_Type;
static OopType g_ellipsis_oop = 0;
static OopType ellipsis_oop(void) {
    if (g_ellipsis_oop == 0) {
        GciErrSType e;
        g_ellipsis_oop = GciPerform(server, "___ellipsis", NULL, 0);
        if (GciErr(&e)) g_ellipsis_oop = 0;
    }
    return g_ellipsis_oop != 0 ? g_ellipsis_oop : none_oop;
}
static OopType notimpl_oop(void) {
    if (g_notimpl_oop == 0) {
        GciErrSType e;
        g_notimpl_oop = GciPerform(server, "___notImplemented", NULL, 0);
        if (GciErr(&e)) g_notimpl_oop = 0;
    }
    return g_notimpl_oop != 0 ? g_notimpl_oop : none_oop;
}

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
/* lv_tag = (ndigits << 3) | sign, sign 0 positive and 1 zero: True is one
   digit of 1, False is zero -- CPython 3.14's own encoding of both. */
_GrailLongSingleton _Py_TrueStruct  = { { 1, NULL }, 0x8, { 1, 0 } };  /* ob_type set by shimInit */
_GrailLongSingleton _Py_FalseStruct = { { 1, NULL }, 0x1, { 0, 0 } };  /* ob_type set by shimInit */

/* _Py_Dealloc — called when refcount hits zero.
   In the shim, object lifetime is managed by GemStone. No-op. */
extern "C" void _Py_Dealloc(PyObject *op) {
    (void)op;
}

/* ====================================================================
 * Error state (single-threaded)
 * ==================================================================== */

static void shim_format_into(char *buf, size_t cap0, const char *format,
                             va_list ap);   /* shared %R/%S/printf engine */

static PyObject *current_error_type = NULL;
static char      current_error_msg[1024] = {0};

/* THE ORIGINAL EXCEPTION, translated where it is still available.
   check_gci_error() has to keep the CPython return-code convention -- callers
   do `if (check_gci_error()) return -1;' and unwind through their own C frames
   -- but the placeholder it leaves behind used to be built from
   errInfo.message, which is EMPTY for an exception raised in a callback.  The
   class and text live only in errInfo.exceptionObj, so ask Smalltalk for them
   at the point of failure and keep the answer for the boundary to raise.

   Held as TEXT, not as the OOP: an OopType kept across later GCI calls is a
   lifetime question we would rather not have, and the text is all the boundary
   needs -- raise_error() re-creates the exception object from it.

   Cleared by every entry point that clears or replaces the Python error
   indicator, so a failure a C module deliberately tolerated cannot leak into
   an unrelated later raise. */
static char saved_gs_error_text[1024] = {0};
static int  have_saved_gs_error = 0;

/* The wheel's own exception INSTANCE behind the indicator, when there is
   one: a PyO3 pyclass exception (pydantic_core's ValidationError) is raised
   as an object -- PyErr_SetRaisedException(instance) -- and carries state the
   (type, message) pair cannot (its .errors()).  Kept so the boundary can hand
   Grail the object itself (check_and_raise_error), and so a Get/Set round
   trip through PyO3 answers the same instance.  Cleared with the rest of the
   indicator: every entry point that replaces or clears it goes through
   forget_saved_gs_error(). */
static PyObject *current_error_instance = NULL;

/* A PYTHON EXCEPTION RAISED IN A CALLBACK -- Grail code C called (a
   validator function, a __getattr__, a property) -- must become C's pending
   error, not search Grail's handlers.  An outer Python ``except'' that
   matches it lies BELOW the user-action frame; Smalltalk runs that handler on
   top of the live C frames, the unwind is refused, and it re-signals until
   the session dies -- or, with no such handler, the exception escapes the
   extension altogether (pydantic_core never saw a validator's ValueError, so
   it never became a ValidationError).  So CPythonShim>>___guardCallback:
   catches it INSIDE the callback, records it, and sets this flag through a
   CByteArray view of it; check_gci_error() -- already run after every
   GciPerform -- takes it as the pending error (take_callback_error).
   current_error_from_grail marks such an error, so if C hands it back to
   Grail unhandled the ORIGINAL exception object is what is raised. */
static int32_t g_cb_error_flag = 0;
static int current_error_from_grail = 0;

static void forget_saved_gs_error(void) {
    have_saved_gs_error = 0;
    saved_gs_error_text[0] = '\0';
    current_error_instance = NULL;
    current_error_from_grail = 0;
}

/* THE INDICATOR IN THE THREAD STATE.  Cython keeps a pending exception in
   ``tstate->current_exception'' and reads and writes that slot INLINE
   (CYTHON_FAST_THREAD_STATE): an error is pending when it is not NULL, a
   fetch takes the object out, a restore puts one back, and an exception's
   type is Py_TYPE of the object.  So the slot mirrors the indicator above:
   err_publish puts it there after every change -- a wheel's own exception
   instance as itself, any other error as a token carrying the (type,
   message) pair (shim_pyo3.cc) -- and err_adopt takes back whatever Cython
   left there before the indicator is read: NULL clears it, a token restores
   its pair, a wheel's instance becomes the raised object.  g_err_published
   is what the shim last put there, so a difference is Cython's doing.
   A token still in the slot when the indicator changes was never taken, so
   it is recycled.  Offset measured against CPython 3.14.8's headers. */
#define GRAIL_TSTATE_CURRENT_EXCEPTION_OFFSET 112
extern "C" char *_grail_tstate_bytes(void);                                   /* shim_numpy.cc */
extern "C" PyObject *_grail_raised_token(PyObject *type, const char *msg, int from_grail);   /* shim_pyo3.cc */
extern "C" int _grail_raised_token_read(PyObject *o, PyObject **type, const char **msg, int *from_grail);
extern "C" void _grail_raised_token_recycle(PyObject *o);
static PyObject *g_err_published = NULL;
static int g_err_sync_busy = 0;

static PyObject **tstate_exc_slot(void) {
    return (PyObject **)(_grail_tstate_bytes() + GRAIL_TSTATE_CURRENT_EXCEPTION_OFFSET);
}

static int is_foreign_exc_instance(PyObject *v);
static int keep_grail_exc_instance(PyObject *type, PyObject *value);
static void foreign_exc_text(PyObject *v, char *buf, size_t cap);

static void err_publish(void) {
    if (g_err_sync_busy) return;
    PyObject **slot = tstate_exc_slot();
    PyObject *old = *slot;
    PyObject *now = NULL;
    if (current_error_type != NULL) {
        if (current_error_instance != NULL && is_foreign_exc_instance(current_error_instance))
            now = current_error_instance;
        else
            now = _grail_raised_token(current_error_type, current_error_msg, current_error_from_grail);
    }
    if (old != NULL && old == g_err_published && old != now) _grail_raised_token_recycle(old);
    *slot = now;
    g_err_published = now;
}

static void err_adopt(void) {
    if (g_err_sync_busy) return;
    PyObject *cur = *tstate_exc_slot();
    if (cur == g_err_published) return;
    g_err_published = cur;
    PyObject *type; const char *msg; int from_grail;
    if (cur == NULL) {
        forget_saved_gs_error();
        current_error_type = NULL;
        current_error_msg[0] = '\0';
    } else if (!is_foreign(cur)) {
        /* A Grail exception object, written into the slot from C: Cython
           re-raising one it fetched (__Pyx_ErrRestoreInState), or
           PyErr_SetRaisedException.  It is a wrapper, not a C exception
           struct, so reading it as a token or as a wheel's instance read
           past its end (a SIGSEGV).  It becomes the indicator as
           PyErr_SetObject would make it, and stays in the slot. */
        g_err_sync_busy = 1;
        int kept = keep_grail_exc_instance((PyObject *)cur->ob_type, cur);
        g_err_sync_busy = 0;
        if (!kept) {
            forget_saved_gs_error();
            current_error_type = (PyObject *)cur->ob_type;
            current_error_msg[0] = '\0';
        }
    } else if (_grail_raised_token_read(cur, &type, &msg, &from_grail)) {
        forget_saved_gs_error();
        current_error_type = type;
        snprintf(current_error_msg, sizeof(current_error_msg), "%s", msg);
        current_error_from_grail = from_grail;
    } else {
        char text[sizeof(current_error_msg)];
        g_err_sync_busy = 1;            /* str() may run, and clear, the indicator */
        foreign_exc_text(cur, text, sizeof(text));
        g_err_sync_busy = 0;
        forget_saved_gs_error();
        current_error_type = (PyObject *)cur->ob_type;
        memcpy(current_error_msg, text, sizeof(current_error_msg));
        current_error_instance = cur;
    }
}

/* PyErr_GetRaisedException: the object in the slot, now the caller's -- out
   of the slot first, so clearing the indicator does not recycle it. */
extern "C" PyObject *_grail_err_take_published(void) {
    err_adopt();
    PyObject **slot = tstate_exc_slot();
    PyObject *exc = *slot;
    *slot = NULL;
    g_err_published = NULL;
    forget_saved_gs_error();
    current_error_type = NULL;
    current_error_msg[0] = '\0';
    return exc;
}

/* PyErr_SetRaisedException: exc becomes the slot's object, then the
   indicator -- the same path as Cython's own restore. */
extern "C" void _grail_err_set_published(PyObject *exc) {
    err_adopt();
    PyObject **slot = tstate_exc_slot();
    if (*slot != NULL && *slot == g_err_published && *slot != exc) _grail_raised_token_recycle(*slot);
    *slot = exc;
    err_adopt();
}

extern "C" int  _grail_err_from_grail(void) { err_adopt(); return current_error_from_grail; }
extern "C" void _grail_err_set_from_grail(int v) { current_error_from_grail = v; err_publish(); }

extern "C" void _grail_err_set_instance(PyObject *exc) { current_error_instance = exc; err_publish(); }
extern "C" PyObject *_grail_err_instance(void) { err_adopt(); return current_error_instance; }

extern "C" void PyErr_SetString(PyObject *type, const char *message) {
    forget_saved_gs_error();
    current_error_type = type;
    strncpy(current_error_msg, message, sizeof(current_error_msg) - 1);
    current_error_msg[sizeof(current_error_msg) - 1] = '\0';
    err_publish();
}

extern "C" void PyErr_Format(PyObject *type, const char *format, ...) {
    va_list args;
    char msg[sizeof(current_error_msg)];
    /* Use the shim format engine (not vsnprintf) so CPython object
       conversions like %R / %S are honored — numpy's error messages rely
       on them, and a botched %R was what hid the offending object here.

       FORMAT FIRST, then set the indicator.  %R calls PyObject_Repr, which
       may call into Grail, and a completed call clears the indicator: set
       beforehand, numpy's ``ValueError: `.dtype` attribute %R is not a valid
       dtype instance'' was gone by the time np.dtype() returned NULL, and
       Grail saw a call answer nothing at all. */
    va_start(args, format);
    shim_format_into(msg, sizeof(msg), format, args);
    va_end(args);
    forget_saved_gs_error();
    current_error_type = type;
    memcpy(current_error_msg, msg, sizeof(current_error_msg));
    err_publish();
}

extern "C" PyObject *PyErr_Occurred(void) {
    err_adopt();
    return current_error_type;
}

extern "C" void PyErr_Clear(void) {
    forget_saved_gs_error();
    current_error_type = NULL;
    current_error_msg[0] = '\0';
    err_publish();
}

extern "C" void PyErr_SetNone(PyObject *type) {
    PyErr_SetString(type, "");
}

extern "C" void PyErr_Fetch(PyObject **ptype, PyObject **pvalue, PyObject **ptb) {
    err_adopt();
    *ptype = current_error_type;
    /* The instance itself when there is one, so Fetch -> Restore through a
       wheel keeps its exception object; the message text otherwise. */
    if (current_error_type && current_error_instance) {
        *pvalue = current_error_instance;
    } else if (current_error_type && current_error_msg[0]) {
        *pvalue = PyUnicode_FromString(current_error_msg);
    } else {
        *pvalue = NULL;
    }
    *ptb = NULL;
    forget_saved_gs_error();
    current_error_type = NULL;
    current_error_msg[0] = '\0';
    err_publish();
}

static int keep_grail_exc_instance(PyObject *type, PyObject *value);

static void err_restore(PyObject *type, PyObject *value);
extern "C" void PyErr_Restore(PyObject *type, PyObject *value, PyObject *tb) {
    (void)tb;
    err_restore(type, value);
    err_publish();
}
static void err_restore(PyObject *type, PyObject *value) {
    forget_saved_gs_error();
    if (type != NULL && keep_grail_exc_instance(type, value)) return;
    current_error_type = type;
    if (value && is_foreign_exc_instance(value)) {
        foreign_exc_text(value, current_error_msg, sizeof(current_error_msg));
        current_error_instance = value;
    } else if (value) {
        const char *msg = PyUnicode_AsUTF8(value);
        if (msg) {
            strncpy(current_error_msg, msg, sizeof(current_error_msg) - 1);
            current_error_msg[sizeof(current_error_msg) - 1] = '\0';
        }
    } else {
        current_error_msg[0] = '\0';
    }
}

static const char *name_for_exc_type(PyObject *current_error_type);

static const char *get_error_type(void) {
    err_adopt();
    if (current_error_type == NULL) return NULL;
    /* A wheel's OWN exception class (a PyO3 pyclass extending ValueError) is
       reported as the nearest ancestor the table knows, so Grail raises
       something ``except ValueError'' catches; the instance itself travels
       separately (current_error_instance). */
    for (PyObject *t = current_error_type; t != NULL; ) {
        const char *n = name_for_exc_type(t);
        if (n) return n;
        if (t->ob_type != &PyType_Type) break;
        t = (PyObject *)((PyTypeObject *)t)->tp_base;
    }
    return "UnknownError";
}

static const char *name_for_exc_type(PyObject *current_error_type) {
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
    if (current_error_type == PyExc_ModuleNotFoundError) return "ModuleNotFoundError";
    if (current_error_type == PyExc_NameError)         return "NameError";
    if (current_error_type == PyExc_StopAsyncIteration) return "StopAsyncIteration";
    if (current_error_type == PyExc_BufferError)       return "BufferError";
    if (current_error_type == PyExc_EOFError)          return "EOFError";
    if (current_error_type == PyExc_KeyboardInterrupt) return "KeyboardInterrupt";
    if (current_error_type == PyExc_UnicodeError)      return "UnicodeError";
    if (current_error_type == PyExc_UnicodeDecodeError) return "UnicodeDecodeError";
    if (current_error_type == PyExc_UnicodeEncodeError) return "UnicodeEncodeError";
    if (current_error_type == PyExc_AssertionError)    return "AssertionError";
    if (current_error_type == PyExc_GeneratorExit)     return "GeneratorExit";
    if (current_error_type == PyExc_UnboundLocalError) return "UnboundLocalError";
    if (current_error_type == PyExc_BaseExceptionGroup) return "BaseExceptionGroup";
    if (current_error_type == PyExc_RuntimeWarning)    return "RuntimeWarning";
    if (current_error_type == PyExc_UserWarning)       return "UserWarning";
    if (current_error_type == PyExc_DeprecationWarning) return "DeprecationWarning";
    if (current_error_type == PyExc_FutureWarning)     return "FutureWarning";
    /* Dynamically created exception types: report the name after the
       last dot ("spam.error" → "error"). */
    for (int i = 0; i < dyn_exception_count; i++) {
        if (current_error_type == (PyObject *)&dyn_exceptions[i].obj) {
            const char *dot = strrchr(dyn_exceptions[i].name, '.');
            return dot ? dot + 1 : dyn_exceptions[i].name;
        }
    }
    return NULL;
}

static const char *get_error_message(void) {
    err_adopt();
    if (current_error_type == NULL) return NULL;
    return current_error_msg;
}

/* ====================================================================
 * Module initialization and method dispatch
 * ==================================================================== */

extern "C" PyObject *PyModuleDef_Init(PyModuleDef *def) {
    /* The shim never builds a separate module object: the def IS the module
       its exec slots receive.  CPython's PyModuleDef_Init gives the def a type
       (PyModuleDef_HEAD_INIT leaves ob_type NULL), and a PyO3 exec slot's
       first act is PyModule_Check(module) -- an inlined read of
       Py_TYPE(module)->tp_flags, which segfaulted on the NULL.  So stamp it
       as a module.  PyModule_Type is deliberately not a registered shim type,
       so the def still crosses into Grail as a foreign object, as before. */
    if (def->m_base.ob_base.ob_type == NULL)
        def->m_base.ob_base.ob_type = &PyModule_Type;
    return (PyObject *)def;
}

static int find_method(PyObject *module_ptr, const char *name) {
    PyModuleDef *def = (PyModuleDef *)module_ptr;
    PyMethodDef *methods = def->m_methods;
    /* A multi-phase module may have NO method table: PyO3 leaves m_methods
       NULL and adds its functions as attributes from the exec slot. */
    if (methods == NULL) return -1;
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

/* Cache the bytes of `src` under the key `key`.  The two differ only for
   PyUnicode_AsUTF8, which caches a string's UTF-8 ENCODING (a separate
   Utf8 object) under the original string's oop. */
static char *buffer_cache_add_from(OopType key, OopType src, int64 size) {
    char *buf = (char *)malloc((size_t)(size + 1));
    if (!buf) return NULL;
    if (size > 0)
        GciFetchBytes_(src, 1, (ByteType *)buf, size);
    buf[size] = '\0';
    if (buffer_cache_count < MAX_BUFFER_CACHE) {
        buffer_cache[buffer_cache_count].oop = key;
        buffer_cache[buffer_cache_count].buf = buf;
        buffer_cache[buffer_cache_count].size = size;
        buffer_cache_count++;
    }
    /* NOTE: an overflow buffer (past the 32nd in one shimCall) is handed out
       and never freed -- buffer_cache_clear only frees what the table above
       recorded.  PyUnicode_Join materialises one buffer per list element, so
       a single re.subn over a few thousand characters (CPython test_re's
       ReTests.test_large_subn) overflows by thousands and leaks them for the
       life of the gem.  Deliberately NOT fixed here: tracking them for the
       free would widen an existing hazard, because the clears sit at each
       user-action entry point with no nesting depth, so an inner shimCall
       already frees an outer one's buffers.  Fixing the leak wants that
       depth counter first. */
    return buf;
}

static char *buffer_cache_add(OopType oop, int64 size) {
    return buffer_cache_add_from(oop, oop, size);
}

static int64 buffer_cache_get_size(OopType oop) {
    for (int i = 0; i < buffer_cache_count; i++) {
        if (buffer_cache[i].oop == oop)
            return buffer_cache[i].size;
    }
    return -1;
}

/* ====================================================================
 * Helper: check for GCI error after a GciPerform and convert to PyErr.
 * ==================================================================== */

/* ====================================================================
 * Diagnostic allocation counters (gated by GRAIL_SHIM_DIAG).  Used to
 * locate runaway allocation during a monolithic C module init that the
 * GemStone scavenger cannot reclaim mid-call.  Zero cost when disabled
 * (a single static-int compare).
 * ==================================================================== */
static int  g_diag_on = -1;            /* -1 = unknown, 0 = off, 1 = on */
static long g_diag_unicode = 0, g_diag_long = 0, g_diag_dict = 0,
            g_diag_tuple = 0, g_diag_list = 0, g_diag_bridge = 0,
            g_diag_getattr = 0, g_diag_call = 0, g_diag_total = 0;
static inline void diag_tick(long *counter) {
    if (g_diag_on < 0) g_diag_on = getenv("GRAIL_SHIM_DIAG") ? 1 : 0;
    if (!g_diag_on) return;
    (*counter)++;
    if ((++g_diag_total % 100000) == 0) {
        fprintf(stderr,
            "SHIM-DIAG alloc@%ld: unicode=%ld long=%ld dict=%ld tuple=%ld "
            "list=%ld listBridge=%ld getattr=%ld call=%ld\n",
            g_diag_total, g_diag_unicode, g_diag_long, g_diag_dict,
            g_diag_tuple, g_diag_list, g_diag_bridge, g_diag_getattr,
            g_diag_call);
        fflush(stderr);
    }
}

/* Did the just-completed GciPerform fail for any reason OTHER than the
   receiver not understanding the selector?  Used by the encodeAsUTF8 probes,
   whose fallback is only correct for a genuine "this receiver has no such
   method" (RT_ERR_DOES_NOT_UNDERSTAND, 2010).  Falling back on ANY error
   turns a raise inside encodeAsUTF8 into silently mis-decoded bytes, which
   is worse than an error: the caller gets plausible mojibake.  Consumes the
   error either way -- leaving it pending is what escalates into a refused
   cross-frame unwind.  Returns 1 if the failure should be reported. */
static int probe_failed_for_real(const char *what) {
    GciErrSType e;
    if (!GciErr(&e)) return 0;                       /* no error at all */
    if (e.number == RT_ERR_DOES_NOT_UNDERSTAND) return 0;  /* expected */
    /* GciErrSType.message and .reason are routinely EMPTY for an exception
       raised in a callback -- see docs/GemStone_Feature_Requests.md 1.5 -- so
       name the send, otherwise the caller gets a RuntimeError with no text at
       all and no clue which probe produced it. */
    if (e.message[0])
        PyErr_Format(PyExc_RuntimeError, "%s", e.message);
    else if (e.reason[0])
        PyErr_Format(PyExc_RuntimeError, "%s", e.reason);
    else
        PyErr_Format(PyExc_RuntimeError, "%s raised (GemStone error %d)",
                     what, e.number);
    return 1;
}

/* Did pyobj_oop answer an OBJECT, or a refusal?  Its guards answer OOP_NIL,
   never a usable receiver: foreign_proxy_oop returns OOP_NIL both when it
   refuses to dereference an implausible ob_type -- a Grail wrapper whose
   gcMalloc block was freed and REUSED arrives there as "foreign", see
   docs/Shim_Foreign_Proxy_Misattribution.md -- and when the proxy's own
   GciPerform fails.  A live wrapper can never hold Smalltalk nil at offset
   16, because wrap: maps nil to the Py_None singleton's oop, so OOP_NIL
   reaching a caller here is always the refusal.

   Performing on that nil anyway is the worst option available, and it is
   what the encodeAsUTF8 probes used to do.  The DNU is signalled with the
   user-action C frame LIVE beneath it, so a caller's broad Smalltalk
   handler runs on top of that frame and its terminating return is refused
   with 2758 (ERR_EXC_RETURN_DISALLOWED) -- and probe_failed_for_real tests
   for 2010, so its "expected DNU, fall back to raw bytes" branch never
   fires.  Measured in the nightly CPython conformance run (test.test_re,
   ReTests.test_large_subn): the module scored 166 tests for 165 cases and
   two errors for one failure, once as "a UndefinedObject does not
   understand #'encodeAsUTF8'" and once as "RuntimeError: encodeAsUTF8
   raised (GemStone error 2758)" -- neither naming the dead wrapper that
   actually failed.  Refusing here keeps it one ordinary Python-level
   error that points at the real fault. */
static int refuse_unusable_oop(OopType oop, const char *where,
                               const void *obj) {
    if (oop != OOP_NIL && oop != OOP_ILLEGAL) return 0;
    PyErr_Format(PyExc_SystemError,
                 "%s: no Grail object behind %p -- a dead wrapper or a "
                 "refused foreign proxy (see the SHIM-BADPTR line)",
                 where, obj);
    return 1;
}

static int64 fetch_string(OopType oop, char *buf, int bufSize);   /* below */
static PyObject *static_exc_named(const char *name);              /* below */

/* The Python exception a guarded callback recorded, as C's pending error:
   { Python name of its nearest shim exception type. message. C instance of a
   wheel's own exception it carries, or 0 } -- see g_cb_error_flag. */
static void take_callback_error(void) {
    OopType arr = GciPerform(server, "___takeCallbackError", NULL, 0);
    GciErrSType e;
    if (GciErr(&e) || arr == OOP_NIL || arr == OOP_ILLEGAL) {
        PyErr_SetString(PyExc_RuntimeError, "a Grail callback raised");
        return;
    }
    char base[128], msg[1024];
    OopType i1 = GciI64ToOop(1), i2 = GciI64ToOop(2), i3 = GciI64ToOop(3);
    fetch_string(GciFetchOop(arr, GciOopToI64(i1)), base, sizeof(base));
    fetch_string(GciFetchOop(arr, GciOopToI64(i2)), msg, sizeof(msg));
    int64 ptr = GciOopToI64(GciFetchOop(arr, GciOopToI64(i3)));
    int64 typ = 0;
    if (GciFetchSize_(arr) >= 4)
        typ = GciOopToI64(GciFetchOop(arr, GciOopToI64(GciI64ToOop(4))));
    GciErr(&e);
    PyObject *inst = (PyObject *)(intptr_t)ptr;
    /* The check_gci_error diagnostic covers a GemStone error; a callback
       that RAISED arrives here instead and was silent, so an empty message
       (numpy's exec slot ending on a bare ImportError) named no call site. */
    if (getenv("GRAIL_SHIM_DIAG")) {
        fprintf(stderr, "SHIM-DIAG callback raised %s: '%s'\n", base, msg);
        void *bt[16];
        int n = backtrace(bt, 16);
        char **syms = backtrace_symbols(bt, n);
        if (syms) {
            for (int i = 0; i < n; i++)
                fprintf(stderr, "    bt[%d] %s\n", i, syms[i]);
            free(syms);
        }
        fflush(stderr);
    }
    if (ptr != 0 && plausible_pyobj(inst) && plausible_pyobj(inst->ob_type)) {
        PyErr_SetString((PyObject *)inst->ob_type, msg);
        current_error_instance = inst;
    } else if (typ != 0 && is_type_mirror((PyObject *)(intptr_t)typ)) {
        /* The class's own type object (a mirror, for a class Python defined),
           so PyErr_GivenExceptionMatches can tell decimal.InvalidOperation
           from any other ArithmeticError. */
        PyErr_SetString((PyObject *)(intptr_t)typ, msg);
    } else {
        PyObject *t = static_exc_named(base);
        PyErr_SetString(t ? t : PyExc_Exception, msg);
    }
    current_error_from_grail = 1;
    err_publish();
}

static int check_gci_error(void) {
    GciErrSType errInfo;
    if (g_cb_error_flag) {
        g_cb_error_flag = 0;
        GciErr(&errInfo);               /* nothing should be pending; drop it */
        take_callback_error();
        return 1;
    }
    if (GciErr(&errInfo)) {
        const char *msg = errInfo.message[0] ? errInfo.message
                        : (errInfo.reason[0] ? errInfo.reason : "");
        if (getenv("GRAIL_SHIM_DIAG")) {
            fprintf(stderr,
                "SHIM-DIAG check_gci_error: GS err #%d argc=%d msg='%s' reason='%s'"
                " exceptionObj=%llu category=%llu context=%llu\n"
                "  alloc totals@%ld: unicode=%ld long=%ld dict=%ld tuple=%ld "
                "list=%ld listBridge=%ld getattr=%ld call=%ld\n",
                errInfo.number, errInfo.argCount, errInfo.message, errInfo.reason,
                (unsigned long long)errInfo.exceptionObj,
                (unsigned long long)errInfo.category,
                (unsigned long long)errInfo.context,
                g_diag_total, g_diag_unicode, g_diag_long, g_diag_dict,
                g_diag_tuple, g_diag_list, g_diag_bridge, g_diag_getattr,
                g_diag_call);
            void *bt[16];
            int n = backtrace(bt, 16);
            char **syms = backtrace_symbols(bt, n);
            if (syms) {
                for (int i = 0; i < n; i++)
                    fprintf(stderr, "    bt[%d] %s\n", i, syms[i]);
                free(syms);
            }
            fflush(stderr);
        }
        PyErr_Format(PyExc_RuntimeError, "%s", msg);

        /* AFTER PyErr_Format, which clears any previous save.  `msg' above is
           EMPTY whenever the exception came from a callback, so ask Smalltalk
           what it actually was -- GciErr() has already CLEARED the error
           state, which is what makes a perform legal here (the same ordering
           raise_error() relies on).  If the translation itself fails, keep the
           placeholder rather than erroring about an error. */
        if (server != OOP_NIL
            && errInfo.exceptionObj != OOP_NIL
            && errInfo.exceptionObj != OOP_ILLEGAL) {
            OopType excOop = errInfo.exceptionObj;
            OopType textOop = GciPerform(server, "___shimErrorTextFor:",
                                         &excOop, 1);
            GciErrSType tmp;
            if (!GciErr(&tmp)
                && textOop != OOP_NIL && textOop != OOP_ILLEGAL) {
                int64 n = GciFetchSize_(textOop);
                if (n > 0) {
                    if (n > (int64) sizeof(saved_gs_error_text) - 1)
                        n = (int64) sizeof(saved_gs_error_text) - 1;
                    GciFetchBytes_(textOop, 1,
                                   (ByteType *) saved_gs_error_text, n);
                    saved_gs_error_text[n] = '\0';
                    have_saved_gs_error = 1;
                }
            }
        }
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

static void *foreign_nb_slot(PyTypeObject *t, int off);   /* below */
extern "C" double PyFloat_AsDouble(PyObject *obj) {
    if (obj == NULL) {
        PyErr_BadArgument();
        return -1.0;
    }
    /* A wheel's own subclass of float has a real ob_fval (float_tp_new). */
    if (is_foreign(obj) && Py_TYPE(obj) && PyType_IsSubtype(Py_TYPE(obj), &PyFloat_Type)
            && foreign_nb_slot(Py_TYPE(obj), (int)offsetof(PyNumberMethods, nb_float)) == NULL)
        return *(double *)((char *)obj + 16);
    /* Foreign numpy scalar: take its own nb_float (or nb_index for ints). */
    if (is_foreign(obj)) {
        OopType fo = foreign_number_oop(obj, 1);
        if (fo == OOP_NIL) fo = foreign_number_oop(obj, 0);
        if (fo == OOP_NIL) { PyErr_BadArgument(); return -1.0; }
        return GCI_OOP_IS_SMALL_INT(fo) ? (double)GciOopToI64(fo) : GciOopToFlt(fo);
    }
    OopType oop = pyobj_oop(obj);
    /* The cheap cases inline: a SmallInteger, a SmallDouble, a heap Float,
       and bool (which is not a SmallInteger in Grail). */
    if (GCI_OOP_IS_SMALL_INT(oop))
        return (double)GciOopToI64(oop);
    if (GCI_OOP_IS_SMALL_DOUBLE(oop))
        return GCI_OOP_TO_SMALL_DOUBLE(oop);
    if (oop == OOP_TRUE) return 1.0;
    if (oop == OOP_FALSE) return 0.0;
    if (GciIsKindOfClass(oop, OOP_CLASS_BINARY_FLOAT))
        return GciOopToFlt(oop);
    /* Everything else is CPython's nb_float / nb_index protocol, answered in
       Smalltalk (CPythonShim>>PyFloat_AsDouble:): an int beyond 64 bits --
       this used GciOopToI64 and failed ``not representable'' -- and any
       object with __float__ or __index__.  GciOopToFlt on those raised
       GemStone's ``The given object is not a float'', which pydantic hit
       building FastAPI's OpenAPI document. */
    OopType f = GciPerform(server, "PyFloat_AsDouble:", &oop, 1);
    if (check_gci_error()) return -1.0;
    /* A Symbol is the failure answer (the server must not raise inside a
       user action): #overflow or #type. */
    if (GciIsKindOfClass(f, OOP_CLASS_SYMBOL)) {
        char tag[16];
        fetch_string(f, tag, sizeof(tag));
        if (strcmp(tag, "overflow") == 0)
            PyErr_SetString(PyExc_OverflowError, "int too large to convert to float");
        else
            PyErr_Format(PyExc_TypeError, "must be real number, not %s",
                         (Py_TYPE(obj) && Py_TYPE(obj)->tp_name) ? Py_TYPE(obj)->tp_name : "object");
        return -1.0;
    }
    if (GCI_OOP_IS_SMALL_DOUBLE(f)) return GCI_OOP_TO_SMALL_DOUBLE(f);
    if (GCI_OOP_IS_SMALL_INT(f)) return (double)GciOopToI64(f);
    return GciOopToFlt(f);
}

extern "C" int PyFloat_Check(PyObject *obj) {
    return obj != NULL && Py_TYPE(obj) == &PyFloat_Type;
}

/* ====================================================================
 * CPython API implementations — Integer
 * ==================================================================== */

extern "C" PyObject *PyLong_FromSsize_t(Py_ssize_t v) {
    diag_tick(&g_diag_long);
    OopType arg = GciI64ToOop(v);
    return addr_to_pyobj(GciPerform(server, "PyLong_FromSsize_t:", &arg, 1));
}

extern "C" PyObject *PyLong_FromLong(long v) {
    diag_tick(&g_diag_long);
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
    /* A STR is not an integer, and asking it is not free: CPython's
       PyLong_AsLong raises TypeError for one, and PyO3 extracts with exactly
       that to tell an int from anything else -- pydantic_core's literal
       serializer tries ``item.extract::<i64>()'' on every expected value
       before trying it as a str.  The probe below DNU'd on each, which is
       noisy and, under a deep stack, was where the gem ran out of it. */
    if (GciIsKindOfClass(oop, OOP_CLASS_CHARACTER_COLLECTION)) {
        PyErr_SetString(PyExc_TypeError, "'str' object cannot be interpreted as an integer");
        return -1;
    }
    OopType indexed = GciPerform_(oop, "__index__", NULL, 0, 1);
    /* Same shape as the encodeAsUTF8 probes: "no __index__" is an expected
       answer for this send, but __index__ EXISTING AND RAISING is not.
       Without the split, a raising __index__ fell through to GciOopToI64(nil),
       which fails in turn and REPLACES the pending error -- so the caller was
       told "Argument to GciOopToLong ... is not an Integer" instead of
       whatever __index__ actually raised.  -1 is the CPython convention for
       these conversions (PyLong_AsLong and friends) and every caller here
       reaches one of them. */
    if (probe_failed_for_real("__index__")) return -1;
    /* No __index__ at all -- the expected DNU, which probe_failed_for_real
       lets through -- is CPython's TypeError.  It used to fall through to
       GciOopToI64(nil), which answered 0 with no Python error set, so PyO3
       read the object as the integer 0: pydantic_core counted a str literal
       as ``Literal[0]''. */
    if (indexed == OOP_NIL) {
        PyErr_SetString(PyExc_TypeError, "object cannot be interpreted as an integer");
        return -1;
    }
    return GciOopToI64(indexed);
}

/* Convert a foreign object (a wheel's own C object, e.g. a numpy.int64 /
   numpy.float64 scalar) to a Grail-backed number's OOP by invoking its OWN C
   number slot — NOT routing through the reverse proxy's (absent) Python
   dunders.  The slot is numpy's C, which builds its result via our
   PyLong_From* / PyFloat_FromDouble, so the returned object is Grail-backed
   and converts normally.  want_float picks nb_float; otherwise nb_index then
   nb_int.  Returns OOP_NIL if the object exposes no suitable slot. */
static OopType foreign_number_oop(PyObject *obj, int want_float) {
    PyTypeObject *t = obj ? obj->ob_type : NULL;
    PyNumberMethods *nb = t ? t->tp_as_number : NULL;
    if (nb == NULL) return OOP_NIL;
    PyObject *r = NULL;
    if (want_float) {
        if (nb->nb_float) r = nb->nb_float(obj);
    } else {
        if (nb->nb_index)     r = nb->nb_index(obj);
        else if (nb->nb_int)  r = nb->nb_int(obj);
    }
    /* r must be Grail-backed (the slot built it via our PyLong_/PyFloat_ ctors);
       guard against NULL or a still-foreign result to avoid bad reads. */
    if (r == NULL || is_foreign(r)) return OOP_NIL;
    return pyobj_oop(r);
}

/* OOP to feed an integer conversion: a foreign object goes through its nb_*
   slot, everything else through the normal wrapper. */
static inline OopType int_conv_oop(PyObject *obj) {
    return is_foreign(obj) ? foreign_number_oop(obj, 0) : pyobj_oop(obj);
}

extern "C" Py_ssize_t PyLong_AsSsize_t(PyObject *obj) {
    if (obj == NULL) return 0;
    return (Py_ssize_t)oopToLongWithIndex(int_conv_oop(obj));
}

extern "C" long PyLong_AsLong(PyObject *obj) {
    if (obj == NULL) return -1;
    return (long)oopToLongWithIndex(int_conv_oop(obj));
}

/* PyLong_AsLong, with an integer out of range reported through *overflow
   (its sign) rather than as an error.  numpy reads every Python int it is
   given this way -- an index, a shape, a scalar operand -- and it was a stub
   answering 0 with *overflow never written. */
extern "C" long PyLong_AsLongAndOverflow(PyObject *obj, int *overflow) {
    *overflow = 0;
    if (obj == NULL) { PyErr_BadInternalCall(); return -1; }
    OopType oop = int_conv_oop(obj);
    if (GCI_OOP_IS_SMALL_INT(oop)) return (long)GciOopToI64(oop);
    if (oop != OOP_NIL && GciIsKindOfClass(oop, OOP_CLASS_INTEGER)) {
        GciErrSType e;
        int64 v = GciOopToI64(oop);
        if (!GciErr(&e)) return (long)v;
        OopType sign = GciPerform(oop, "sign", NULL, 0);
        if (GciErr(&e)) return -1;
        *overflow = GCI_OOP_IS_SMALL_INT(sign) && GciOopToI64(sign) < 0 ? -1 : 1;
        return -1;
    }
    return (long)oopToLongWithIndex(oop);
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
    diag_tick(&g_diag_unicode);
    OopType arg = GciNewString(str);
    return addr_to_pyobj(GciPerform(server, "PyUnicode_FromString:", &arg, 1));
}

/* A Grail str's UTF-8 bytes and their length, from a buffer that lives as
   long as the str's WRAPPER (CPythonShim>>PyUnicode_UTF8Buffer:).  CPython
   keeps a str's UTF-8 form in the object, and PyO3's PyBackedStr keeps the
   pointer while it holds the str; the per-call buffer cache this used to
   answer from was freed at the end of the call, so a wheel's stored field
   names dangled (pydantic_core's model_dump() found no fields).

   Encoded through GemStone's encodeAsUTF8 (server side), not the raw
   object bytes: String / ISOLatin store latin-1 code points and Unicode16
   UTF-16 units, whose 0x00 high bytes truncated every strlen() consumer at
   the first wide character (re.sub on 'ab\u0800c' answered 'a'). */
/* A wheel's own instance of a bytes subtype (numpy.bytes_), in CPython's
   PyBytesObject layout as bytes_tp_new builds it: its data is read in place. */
static int is_foreign_bytes(PyObject *obj) {
    if (obj != NULL && obj->ob_type == &PyBytes_Type && has_grail_prefix(obj)) return 1;
    return obj != NULL && is_foreign(obj) && !is_foreign_type(obj)
        && (Py_TYPE(obj)->tp_flags & Py_TPFLAGS_BYTES_SUBCLASS);
}

/* The { address. size } a server buffer method (PyUnicode_UTF8Buffer:,
   PyBytes_Buffer:) answers for oop: a block that lives as long as the
   object's wrapper.  writable, when asked, reads PyBytes_Buffer:'s third
   element: is the object a bytearray? */
static char *grail_wrapper_buffer(const char *sel, OopType oop, Py_ssize_t *size,
                                  int *writable) {
    OopType arr = GciPerform(server, sel, &oop, 1);
    if (check_gci_error()) return NULL;
    OopType one = GciI64ToOop(1), two = GciI64ToOop(2);
    OopType addrOop = GciFetchOop(arr, GciOopToI64(one));
    OopType sizeOop = GciFetchOop(arr, GciOopToI64(two));
    if (check_gci_error()) return NULL;
    if (size) *size = (Py_ssize_t)GciOopToI64(sizeOop);
    if (writable) *writable = GciFetchOop(arr, 3) == OOP_TRUE;
    return (char *)(intptr_t)GciOopToI64(addrOop);
}

static const char *grail_utf8(PyObject *obj, Py_ssize_t *size) {
    if (size) *size = 0;
    if (obj == NULL) return NULL;
    OopType oop = pyobj_oop(obj);
    if (refuse_unusable_oop(oop, "PyUnicode_AsUTF8", obj)) return NULL;
    return grail_wrapper_buffer("PyUnicode_UTF8Buffer:", oop, size, NULL);
}

extern "C" const char *PyUnicode_AsUTF8(PyObject *obj) {
    return grail_utf8(obj, NULL);
}

extern "C" int PyUnicode_Check(PyObject *obj) {
    return type_flag_check(obj, Py_TPFLAGS_UNICODE_SUBCLASS);
}

/* ====================================================================
 * Ints and strs in CPython's own layout (see GRAIL_PREFIX_MAGIC)
 *
 * CPython 3.14: an int is [refcnt][type][lv_tag][30-bit digits...], lv_tag
 * = (ndigits << 3) | sign (0 positive, 1 zero, 2 negative).  A compact str
 * is [refcnt][type][length@16][hash@24][state@32] and its data at 40 (ASCII)
 * or 56 (PyCompactUnicodeObject: utf8_length@40, utf8@48); state holds the
 * kind in bits 2-4, compact in bit 5, ascii in bit 6.
 * ==================================================================== */

static inline unsigned grail_str_state(PyObject *o) { return *(uint32_t *)((char *)o + 32); }
static inline int grail_str_kind(PyObject *o) { return (int)((grail_str_state(o) >> 2) & 7); }
static inline char *grail_str_data(PyObject *o) {
    return (char *)o + (((grail_str_state(o) >> 6) & 1) ? 40 : 56);
}
static inline Py_ssize_t grail_str_length(PyObject *o) { return *(Py_ssize_t *)((char *)o + 16); }

extern "C" PyObject *PyUnicode_FromKindAndData(int kind, const void *buffer, Py_ssize_t size);

/* The Grail value of an int or str C made, which has no OOP: an int from its
   digits (the shim makes ints only through the server, so a C-made one is
   small), a str from its data -- PyUnicode_New filled in place. */
static OopType prefixed_value_oop(PyObject *obj) {
    if (obj->ob_type == &PyLong_Type) {
        uintptr_t tag = *(uintptr_t *)((char *)obj + 16);
        uint32_t *d = (uint32_t *)((char *)obj + 24);
        Py_ssize_t n = (Py_ssize_t)(tag >> 3);
        if (n <= 2) {
            int64 v = n == 0 ? 0 : (int64)d[0] | (n == 2 ? (int64)d[1] << 30 : 0);
            return GciI64ToOop((tag & 3) == 2 ? -v : v);
        }
        report_bad_pyobj("prefixed_value_oop: a C-made int wider than 60 bits", obj);
        return none_oop;
    }
    if (obj->ob_type == &PyBytes_Type) {
        PyObject *g = PyBytes_FromStringAndSize((char *)obj + 32, Py_SIZE(obj));
        return g ? pyobj_oop(g) : none_oop;
    }
    PyObject *w = PyUnicode_FromKindAndData(grail_str_kind(obj), grail_str_data(obj),
                                            grail_str_length(obj));
    if (w == NULL) return none_oop;
    return pyobj_oop(w);
}

/* A fresh str for the caller to fill, in CPython's compact layout with an
   empty prefix: Cython's string joins (f-strings, error messages) write
   their pieces straight into PyUnicode_DATA.  It was refused. */
extern "C" PyObject *PyUnicode_New(Py_ssize_t size, Py_UCS4 maxchar) {
    if (size < 0 || maxchar > 0x10ffff) {
        PyErr_SetString(PyExc_SystemError, "invalid size or maximum character for PyUnicode_New");
        return NULL;
    }
    int kind = maxchar < 256 ? 1 : maxchar < 65536 ? 2 : 4;
    int ascii = maxchar < 128;
    size_t hdr = ascii ? 40 : 56;
    char *block = (char *)calloc(1, 16 + hdr + (size_t)(size + 1) * (size_t)kind);
    if (block == NULL) return PyErr_NoMemory();
    *(uint64_t *)block = GRAIL_PREFIX_MAGIC;            /* OOP stays 0 */
    PyObject *o = (PyObject *)(block + 16);
    o->ob_refcnt = 1;
    o->ob_type = &PyUnicode_Type;
    *(Py_ssize_t *)((char *)o + 16) = size;
    *(Py_hash_t *)((char *)o + 24) = -1;
    *(uint32_t *)((char *)o + 32) = (uint32_t)((kind << 2) | 0x20 | (ascii ? 0x40 : 0));
    return o;
}

/* PyUnicode_DATA's answer (shim_pyo3.cc exports the function; here it is a
   macro for the shim's own modules). */
extern "C" void *_grail_str_data_in_layout(PyObject *u) {
    if (u != NULL && has_grail_prefix(u)) return grail_str_data(u);
    PyErr_SetString(PyExc_SystemError, "PyUnicode_DATA: not a str in CPython's layout");
    return NULL;
}

static inline Py_UCS4 grail_str_read(int kind, const char *data, Py_ssize_t i) {
    return kind == 1 ? ((const uint8_t *)data)[i]
         : kind == 2 ? ((const uint16_t *)data)[i] : ((const uint32_t *)data)[i];
}

/* Copy how_many characters of from into to, a str C is filling (PyUnicode_New).
   Answers how_many, or -1 with an error. */
extern "C" Py_ssize_t PyUnicode_CopyCharacters(PyObject *to, Py_ssize_t to_start, PyObject *from,
                                               Py_ssize_t from_start, Py_ssize_t how_many) {
    if (to == NULL || from == NULL || !has_grail_prefix(to) || !has_grail_prefix(from)) {
        PyErr_SetString(PyExc_SystemError, "PyUnicode_CopyCharacters: not strs in CPython's layout");
        return -1;
    }
    if (*(OopType *)((char *)to - 8) != 0) {
        PyErr_SetString(PyExc_SystemError, "Cannot modify a string currently used");
        return -1;
    }
    Py_ssize_t from_len = grail_str_length(from), to_len = grail_str_length(to);
    if (from_start < 0 || to_start < 0 || from_start > from_len || to_start > to_len) {
        PyErr_SetString(PyExc_IndexError, "string index out of range");
        return -1;
    }
    if (how_many > from_len - from_start) how_many = from_len - from_start;
    if (how_many > to_len - to_start) {
        PyErr_SetString(PyExc_SystemError, "Cannot write characters past the end of the string");
        return -1;
    }
    int fk = grail_str_kind(from), tk = grail_str_kind(to);
    const char *fd = grail_str_data(from);
    char *td = grail_str_data(to);
    for (Py_ssize_t i = 0; i < how_many; i++) {
        Py_UCS4 c = grail_str_read(fk, fd, from_start + i);
        if ((tk == 1 && c > 0xff) || (tk == 2 && c > 0xffff)) {
            PyErr_SetString(PyExc_SystemError, "Cannot write a character wider than the string's kind");
            return -1;
        }
        if (tk == 1) ((uint8_t *)td)[to_start + i] = (uint8_t)c;
        else if (tk == 2) ((uint16_t *)td)[to_start + i] = (uint16_t)c;
        else ((uint32_t *)td)[to_start + i] = c;
    }
    return how_many;
}

/* Shrink or grow a str C is filling, in place when it can. */
extern "C" int PyUnicode_Resize(PyObject **unicode, Py_ssize_t length) {
    PyObject *u = unicode ? *unicode : NULL;
    if (u == NULL || length < 0 || !has_grail_prefix(u) || *(OopType *)((char *)u - 8) != 0) {
        PyErr_SetString(PyExc_SystemError, "PyUnicode_Resize: not a str C is filling");
        return -1;
    }
    int kind = grail_str_kind(u);
    size_t hdr = (size_t)(grail_str_data(u) - (char *)u);
    char *block = (char *)realloc((char *)u - 16, 16 + hdr + (size_t)(length + 1) * (size_t)kind);
    if (block == NULL) { PyErr_NoMemory(); return -1; }
    u = (PyObject *)(block + 16);
    Py_ssize_t old = grail_str_length(u);
    char *data = grail_str_data(u);
    if (length > old) memset(data + old * kind, 0, (size_t)(length - old) * (size_t)kind);
    memset(data + length * kind, 0, (size_t)kind);
    *(Py_ssize_t *)((char *)u + 16) = length;
    *unicode = u;
    return 0;
}

/* ====================================================================
 * CPython API implementations — Bytes
 * ==================================================================== */

extern "C" PyObject *PyBytes_FromStringAndSize(const char *data, Py_ssize_t len) {
    /* NO DATA: a bytes of len uninitialised bytes, for the caller to fill in
       place -- CPython's contract, and how Cython 3 unpacks its string table
       (it writes the decompressed text at PyBytes_AS_STRING, offset 32).  So
       it is in CPython's PyBytesObject layout with an empty prefix (see
       GRAIL_PREFIX_MAGIC), read in place by the shim's bytes functions and
       made a Grail bytes when it crosses (prefixed_value_oop).  Copying len
       bytes from NULL into a Grail ByteArray took the gem down. */
    if (data == NULL) {
        if (len < 0) {
            PyErr_SetString(PyExc_SystemError, "Negative size passed to PyBytes_FromStringAndSize");
            return NULL;
        }
        char *block = (char *)calloc(1, 16 + GRAIL_BYTES_SVAL_OFFSET + (size_t)len + 1);
        if (block == NULL) return PyErr_NoMemory();
        *(uint64_t *)block = GRAIL_PREFIX_MAGIC;       /* OOP 0: C fills it */
        PyObject *o = (PyObject *)(block + 16);
        o->ob_refcnt = 1;
        o->ob_type = &PyBytes_Type;
        Py_SET_SIZE(o, len);
        *(Py_hash_t *)((char *)o + 24) = -1;
        return o;
    }
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

/* The bytes of any byte-indexable Grail object (bytes, bytearray, a buffer),
   with no type check: what the shim's own bytes-like paths need --
   PyByteArray_AsString and the PyArg "y#"/"s#" parsers.

   One that crosses as bytes (a bytes or a bytearray) answers a block that
   lives as long as its WRAPPER (CPythonShim>>PyBytes_Buffer:), as CPython's
   data lives as long as the object: numpy's frombuffer keeps the pointer in
   the array it returns, and from the per-call cache below, freed when the
   call returned, np.frombuffer(b'abcd', 'u1') read freed memory. */
static char *grail_buffer_of(PyObject *obj) {
    if (obj == NULL) return NULL;
    if (is_foreign_bytes(obj)) return (char *)obj + GRAIL_BYTES_SVAL_OFFSET;
    OopType oop = pyobj_oop(obj);
    if (PyBytes_Check(obj))
        return grail_wrapper_buffer("PyBytes_Buffer:", oop, NULL, NULL);
    char *cached = buffer_cache_get(oop);
    if (cached) return cached;
    int64 size = GciFetchSize_(oop);
    return buffer_cache_add(oop, size);
}

/* CPython's contract: NULL and TypeError for anything that is not bytes.
   It answered the fetched bytes of WHATEVER it was given, and numpy relies on
   the refusal: string_to_long_double tries PyBytes_AsString on a non-string
   first and falls back to the number on NULL.  Given a float -- the -inf
   identity of the logaddexp ufunc -- the shim answered "", strtold parsed
   nothing, and numpy's init failed with "invalid literal for long double: "
   (docs/Shim_NumPy.md, wall 11). */
extern "C" char *PyBytes_AsString(PyObject *obj) {
    if (obj == NULL) return NULL;
    if (!PyBytes_Check(obj)) {
        PyTypeObject *t = Py_TYPE(obj);
        PyErr_Format(PyExc_TypeError, "expected bytes, %.200s found",
                     (t && t->tp_name) ? t->tp_name : "object");
        return NULL;
    }
    return grail_buffer_of(obj);
}

extern "C" Py_ssize_t PyBytes_Size(PyObject *obj) {
    if (obj == NULL) return  0;
    if (is_foreign_bytes(obj)) return Py_SIZE(obj);
    return (Py_ssize_t)GciFetchSize_(pyobj_oop(obj));
}

extern "C" int PyBytes_Check(PyObject *obj) {
    return type_flag_check(obj, Py_TPFLAGS_BYTES_SUBCLASS);
}

/* ====================================================================
 * CPython API implementations — List
 *
 * Prebuilt wheels (numpy) inline PyList_SET_ITEM / PyList_GET_ITEM as
 * direct struct access to PyListObject->ob_item, so a list handed to such
 * code must have the REAL CPython memory layout — not a Grail-backed
 * 24-byte CByteArray.  PyList_New returns a real-layout ShimListObject
 * (ABI-identical to PyListObject), recorded in a registry so pyobj_oop()
 * and the rest of the shim detect it and bridge to a Grail list at the
 * boundary.
 * ==================================================================== */

/* ABI-identical to CPython's PyListObject (PyObject_VAR_HEAD + ob_item). */
typedef struct {
    Py_ssize_t    ob_refcnt;
    PyTypeObject *ob_type;
    Py_ssize_t    ob_size;
    PyObject    **ob_item;
    Py_ssize_t    allocated;
} ShimListObject;

/* Registry of real-layout object pointers: fixed open-addressing set,
   entries never removed (bounded by a module load's allocations). */
#define REAL_REG_CAP 262144            /* power of two */
static PyObject *g_real_reg[REAL_REG_CAP];
static int       g_real_reg_count = 0;

static inline size_t real_reg_slot(PyObject *p) {
    uintptr_t x = (uintptr_t)p;
    x = (x >> 4) ^ (x >> 21) ^ (x >> 38);
    return (size_t)(x & (REAL_REG_CAP - 1));
}
static void real_reg_add(PyObject *p) {
    if (g_real_reg_count >= REAL_REG_CAP / 2) return;   /* keep load factor < 0.5 */
    size_t i = real_reg_slot(p);
    while (g_real_reg[i] != NULL) {
        if (g_real_reg[i] == p) return;
        i = (i + 1) & (REAL_REG_CAP - 1);
    }
    g_real_reg[i] = p;
    g_real_reg_count++;
}
static int is_real_layout(PyObject *obj) {
    if (g_real_reg_count == 0 || obj == NULL) return 0;
    size_t i = real_reg_slot(obj);
    while (g_real_reg[i] != NULL) {
        if (g_real_reg[i] == obj) return 1;
        i = (i + 1) & (REAL_REG_CAP - 1);
    }
    return 0;
}

/* ====================================================================
 * Shim type registry + foreign-object detection.
 *
 * A Grail-backed wrapper carries, at offset 8 (ob_type), the address of
 * one of the shim's own PyTypeObjects (set Smalltalk-side by
 * `typeAddrFor:`, whose values are all shim type structs).  A *foreign*
 * object — one created by a prebuilt wheel's own C code (e.g. numpy's
 * DType type objects) — carries a pointer to that wheel's own type, and
 * has no valid OOP at offset 16.  Detect the foreign case by membership:
 * obj->ob_type is NOT one of the types the shim created/exposed.
 *
 * Every shim type is registered here: the static types (init_types),
 * heap types (PyType_FromSpec), and the capsule type. ==================*/
#define SHIM_TYPE_CAP 4096                 /* power of two */
static PyTypeObject *g_shim_types[SHIM_TYPE_CAP];
static int           g_shim_type_count = 0;
static inline size_t shim_type_slot(PyTypeObject *t) {
    uintptr_t x = (uintptr_t)t;
    x = (x >> 4) ^ (x >> 21) ^ (x >> 38);
    return (size_t)(x & (SHIM_TYPE_CAP - 1));
}
static void register_shim_type(PyTypeObject *t) {
    if (t == NULL || g_shim_type_count >= SHIM_TYPE_CAP / 2) return;
    size_t i = shim_type_slot(t);
    while (g_shim_types[i] != NULL) {
        if (g_shim_types[i] == t) return;
        i = (i + 1) & (SHIM_TYPE_CAP - 1);
    }
    g_shim_types[i] = t;
    g_shim_type_count++;
}
static int is_shim_type(PyTypeObject *t) {
    if (t == NULL) return 0;
    size_t i = shim_type_slot(t);
    while (g_shim_types[i] != NULL) {
        if (g_shim_types[i] == t) return 1;
        i = (i + 1) & (SHIM_TYPE_CAP - 1);
    }
    return 0;
}

/* Grail wrappers are 32 bytes with this sentinel at offset 24 (stamped by
   CPythonShim>>wrap:).  ob_type alone can't identify them — a prebuilt
   wheel's own type objects (numpy's DTypes) carry the same shim PyType_Type
   the shim readied them under — so the sentinel is the reliable positive ID.
   Value spells "GRAILWP1" and is < 2^63 so it round-trips through
   Smalltalk int64At:put: (which requires a signed value).  (#defined above
   pyobj_oop, which needs it first.) */

/* Could p be a PyObject* at all?  Every PyObject the shim can see is either
   malloc/calloc'd by _PyObject_New, gcMalloc'd by CPythonShim>>wrap:, or a
   static singleton -- all of them 8-byte aligned and far above the unmapped
   low pages.

   A GemStone OOP fails both tests: SmallInteger OOPs are odd (tagged) and
   object OOPs are small dense integers.  That is exactly what this catches.
   A whole-suite-in-one-session run reached is_foreign() with obj = 0xeb321 --
   OOP-shaped, and `Object _objectForOop:' answers nil for it, i.e. a STALE
   OOP -- and the unguarded offset-24 read below took the gem down with
   SIGSEGV at 0xeb339 (= 0xeb321 + 24).  The stack was
   shimCallTyped -> match_group -> match_getindex -> PyDict_GetItem, which is
   also where the softer "a ShimForeignObject does not understand
   #includesKey:" report comes from: when the bad address happens to be
   readable, the sentinel simply mismatches and the value is misclassified as
   foreign instead of crashing.  See docs/Shim_Foreign_Proxy_Misattribution.md. */
static inline int plausible_pyobj(const void *p) {
    uintptr_t v = (uintptr_t)p;
    return v >= 0x10000u && (v & 7u) == 0u;
}

/* Report a value that reached a PyObject* parameter without being one.  Always
   printed, not gated by GRAIL_SHIM_DIAG: it means something has already gone
   wrong, and the alternative is a SIGSEGV with no attribution at all. */
static void report_bad_pyobj(const char *where, const void *p) {
    fprintf(stderr, "SHIM-BADPTR %s: %p is not a PyObject* "
                    "(unaligned or too low -- an OOP or corrupted slot)\n",
            where ? where : "(unknown)", p);
    fflush(stderr);
}

/* Dump the first four words of a block that failed the wrapper sentinel.
   A Grail wrapper is [refcnt][ob_type][oop][GRAILWP1], so all four words
   together are what distinguishes a wrapper whose gcMalloc block was freed
   and REUSED -- the documented failure, docs/Shim_Foreign_Proxy_Misattribution.md
   -- from a block that was never a wrapper at all.  The nightly's evidence
   so far is one ob_type value (0x41), which cannot tell those apart, and
   the failure has not reproduced on arm64 Darwin, so the next CI hit is the
   only place the question can be answered.  Reading here is no more
   dangerous than the offset-24 read is_foreign already did to get us here;
   the caller has checked plausible_pyobj. */
static void report_pyobj_words(const void *p) {
    const uint64_t *w = (const uint64_t *)p;
    fprintf(stderr, "SHIM-BADPTR   block@%p words [0]=0x%llx [1]=0x%llx "
                    "[2]=0x%llx [3]=0x%llx (a live wrapper has [3]=0x%llx)\n",
            p, (unsigned long long)w[0], (unsigned long long)w[1],
            (unsigned long long)w[2], (unsigned long long)w[3],
            (unsigned long long)GRAIL_WRAP_MAGIC);
    fflush(stderr);
}

/* A foreign object: a non-NULL pointer that is neither a shim singleton,
   nor a real-layout object, nor a Grail-backed wrapper (no sentinel at
   offset 24).  Reading offset 24 of a real PyObject is safe (they are well
   over 24 bytes); singletons and real-layout objects are excluded first. */
static int is_foreign(PyObject *obj) {
    if (obj == NULL) return 0;
    if (obj == Py_None || obj == Py_True || obj == Py_False) return 0;
    /* Never dereference an implausible pointer.  Answering "not foreign" keeps
       this predicate total; pyobj_oop raises on the same condition, so the
       caller gets a reportable error rather than a proxy for garbage. */
    if (!plausible_pyobj(obj)) { report_bad_pyobj("is_foreign", obj); return 0; }
    if (is_real_layout(obj)) return 0;
    if (has_grail_prefix(obj)) return 0;   /* a Grail int or str */
    /* A subtype body IS a C object -- the base's slots, through its subtype
       mirror -- though pyobj_oop answers its Grail half for it. */
    if (is_type_mirror(obj)) return 0;     /* a Grail class's type mirror */
    return !is_grail_wrapper_magic(*(uint64_t *)((char *)obj + 24));
}

/* Observe-only diagnostic for foreign crossings (gated by GRAIL_SHIM_DIAG).
   Reports the object and, if its type looks readable, tp_name — used to
   validate detection before the reverse proxy is wired in. */
static void diag_foreign(PyObject *obj) {
    if (g_diag_on < 0) g_diag_on = getenv("GRAIL_SHIM_DIAG") ? 1 : 0;
    if (!g_diag_on) return;
    PyTypeObject *t = obj->ob_type;
    const char *nm = (t && t->tp_name) ? t->tp_name : "(null)";
    fprintf(stderr, "SHIM-DIAG FOREIGN obj=%p ob_type=%p tp_name='%s'\n",
            (void *)obj, (void *)t, nm);
    fflush(stderr);
}

/* The names of a wheel type's METH_CLASS / METH_STATIC methods, up its tp_base
   chain, space-separated into buf.  The Grail class the shim builds for a
   wheel's EXCEPTION type forwards only INSTANCE attributes to the C object, so
   these have to be put on the class itself
   (CPythonShim>>___buildForeignExceptionClass:base:pointer:classMethods:).
   pydantic_core's ValidationError.from_exception_data is one: pydantic's
   frozen-model and validate_assignment paths raise through it. */
static void foreign_class_method_names(PyTypeObject *type, char *buf, size_t cap)
{
    size_t used = 0;
    buf[0] = '\0';
    for (PyTypeObject *t = type; t != NULL; t = t->tp_base) {
        for (PyMethodDef *ml = t->tp_methods; ml && ml->ml_name; ml++) {
            if (!(ml->ml_flags & (METH_CLASS | METH_STATIC))) continue;
            size_t len = strlen(ml->ml_name);
            if (used + len + 2 > cap) return;
            if (used > 0) buf[used++] = ' ';
            memcpy(buf + used, ml->ml_name, len);
            used += len;
            buf[used] = '\0';
        }
    }
}

/* Reverse proxy: bridge a foreign C PyObject* (a prebuilt wheel's own
   object, e.g. a numpy DType) into a Grail ShimForeignObject, so Grail
   code that receives it (e.g. numpy.dtypes._add_dtype_helper(DType, ...))
   can use it.  The server keeps a session-scoped pointer->proxy map so the
   same foreign pointer always yields the same proxy.  Pass the name a
   Python `__name__` should report: for a *type* object that is the type's
   own tp_name; otherwise its ob_type's tp_name.  A type is anything whose
   metatype is type OR A SUBCLASS of it: numpy's DTypes are instances of
   _DTypeMeta, and testing for PyType_Type alone named every one of them
   ``_DTypeMeta'', so numpy.dtypes._add_dtype_helper's
   ``setattr(dtypes, DType.__name__, DType)'' wrote one attribute 24 times
   and np.dtypes.BoolDType never existed. */
static int64 foreign_compare_hash_bits(PyObject *obj);   /* see below */
static OopType foreign_proxy_oop(PyObject *obj) {
    if (g_diag_on == 1) diag_foreign(obj);

    PyTypeObject *mt = obj->ob_type;
    int is_type = mt == &PyType_Type
        || (mt != NULL && plausible_pyobj(mt) && PyType_IsSubtype(mt, &PyType_Type));
    PyTypeObject *t = is_type ? (PyTypeObject *)obj : mt;
    /* THE CRASH SITE.  A wrapper whose gcMalloc block has been freed and reused
       fails the offset-24 sentinel check, so it arrives here as "foreign" -- but
       its ob_type is now whatever reused the block, and reading t->tp_name (at
       offset 24 of a PyTypeObject) SIGSEGVs.  Observed: si_addr 0xe832a with
       ob_type 0xe8312.  Report and refuse instead of dereferencing; the caller
       gets nil, which surfaces as an ordinary Python-level error. */
    if (t != NULL && !plausible_pyobj(t)) {
        report_bad_pyobj("foreign_proxy_oop ob_type", t);
        report_pyobj_words(obj);
        return OOP_NIL;
    }
    const char *nm = (t && t->tp_name) ? t->tp_name : "";
    /* One of the shim's static BUILTIN types (int, str, dict, object, type,
       ...) is the Grail class of that name: typeObjectFor: hands these out for
       the builtin classes, so a class that went into C comes back as itself
       -- getattr(42, '__class__') from C answers Integer, not a proxy.
       Compared against the list, not is_shim_type: PyType_FromSpec heap types
       are registered shim types too. */
    {
        PyTypeObject *const statics[] = { &PyType_Type, &PyBaseObject_Type, &PyFloat_Type,
            &PyLong_Type, &PyBool_Type, &PyUnicode_Type, &PyBytes_Type, &PyList_Type,
            &PyDict_Type, &PyTuple_Type, &_PyNone_Type };
        for (size_t i = 0; i < sizeof(statics) / sizeof(statics[0]); i++)
            if ((PyTypeObject *)obj == statics[i]) {
                OopType nameOop = GciNewString(statics[i]->tp_name);
                return GciPerform(server, "classForStaticTypeNamed:", &nameOop, 1);
            }
    }
    /* An EXCEPTION TYPE crosses as a Grail exception class, not a proxy, so
       ``except pydantic_core.ValidationError'' and ``except ValueError'' both
       catch what the wheel raises.  One of the shim's own static types (and a
       PyErr_NewException one) answers the Grail class of that name; a wheel's
       pyclass answers a Grail subclass of its nearest such ancestor, built
       once per type (CPythonShim>>foreignExceptionTypeForPointer:...). */
    if (t == (PyTypeObject *)obj && is_foreign_type(obj)
            && (t->tp_flags & Py_TPFLAGS_BASE_EXC_SUBCLASS)) {
        const char *own = name_for_exc_type(obj);
        const char *base = own;
        for (PyTypeObject *b = t->tp_base; base == NULL && b != NULL; b = b->tp_base)
            base = name_for_exc_type((PyObject *)b);
        char cms[4096];
        foreign_class_method_names(t, cms, sizeof(cms));
        OopType args[5] = { GciI64ToOop((int64)(intptr_t)obj), GciNewString(nm),
                            GciNewString(base ? base : "Exception"),
                            own ? OOP_TRUE : OOP_FALSE, GciNewString(cms) };
        return GciPerform(server,
            "foreignExceptionTypeForPointer:typeName:baseName:isShimType:classMethods:",
            args, 5);
    }
    OopType args[3] = { GciI64ToOop((int64)(intptr_t)obj), GciNewString(nm),
                        GciI64ToOop(foreign_compare_hash_bits(obj)) };
    return GciPerform(server, "foreignProxyForPointer:typeName:ops:", args, 3);
}

/* ABI-identical to CPython 3.14's PyTupleObject: PyObject_VAR_HEAD, then a
   cached hash (added in 3.14), then an INLINE ob_item array — so ob_item is
   at offset 32, NOT 24.  A prebuilt wheel inlines PyTuple_GET_ITEM/GET_SIZE
   (direct struct access), so the ob_hash field must be present or numpy
   reads every element one slot high.  ob_hash starts -1 ("not computed"). */
typedef struct {
    Py_ssize_t    ob_refcnt;
    PyTypeObject *ob_type;
    Py_ssize_t    ob_size;
    Py_hash_t     ob_hash;      /* CPython 3.14 tuple hash cache (offset 24) */
    PyObject     *ob_item[1];   /* inline, flexible (offset 32) */
} ShimTupleObject;

static PyObject *real_layout_arg(PyObject *o, int depth);

/* Build a real-layout tuple from a Grail-backed tuple, so a prebuilt
   wheel's C (numpy's tp_new) can struct-access the call arguments.  The
   result is registered as real-layout so it round-trips correctly if it
   ever crosses back into Grail.  Its ELEMENTS go the same way when they are
   Grail lists or tuples (real_layout_arg). */
static PyObject *to_real_tuple(PyObject *t) {
    if (t == NULL) return NULL;
    if (is_real_layout(t)) return t;          /* already real */
    if (is_foreign(t)) return t;              /* a wheel's own real tuple */
    Py_ssize_t n = PyTuple_Size(t);
    if (n < 0) n = 0;
    ShimTupleObject *op = (ShimTupleObject *)calloc(
        1, sizeof(ShimTupleObject) + (size_t)(n > 0 ? n - 1 : 0) * sizeof(PyObject *));
    if (op == NULL) return NULL;
    op->ob_refcnt = 1;
    op->ob_type   = &PyTuple_Type;
    op->ob_size   = n;
    op->ob_hash   = -1;
    for (Py_ssize_t i = 0; i < n; i++)
        /* PyTuple_GetItem answers a BORROWED reference; the raw pointer stored
           here outlives the call, so take one (as PyList_Append does). */
        op->ob_item[i] = real_layout_arg(Py_XNewRef(PyTuple_GetItem(t, i)), 1);
    real_reg_add((PyObject *)op);
    return (PyObject *)op;
}

/* An ARGUMENT bound for a wheel's own code -- a positional or keyword
   argument of a foreign call, an operand of a foreign operator: a
   Grail-backed list or tuple becomes a real-layout copy, its elements
   likewise, to a bounded depth; anything else is answered as it is.

   A wheel reads such arguments with the inline macros (PyList_GET_SIZE,
   PyList_GET_ITEM, PyTuple_GET_ITEM), which read a Grail wrapper's OOP and
   magic words as the size and the item array.  numpy's np.dtype([('a',
   'f8')]) -- _convert_from_array_descr -- died that way, inside the polyfit
   that ``import numpy'' runs on macOS.  A COPY is exact for reading, which
   is what an argument is for; a wheel that mutated an argument list in place
   would change the copy, not the caller's list.  Tuples are immutable, so
   for them nothing is lost. */
static PyObject *real_layout_arg(PyObject *o, int depth) {
    if (o == NULL || depth > 8) return o;
    if (o == Py_None || o == Py_True || o == Py_False || o == Py_NotImplemented) return o;
    if (!plausible_pyobj(o) || is_real_layout(o) || is_type_mirror(o) || is_foreign(o)) return o;
    PyTypeObject *t = o->ob_type;
    if (t == &PyTuple_Type) {
        Py_ssize_t n = PyTuple_Size(o);
        if (n < 0) { PyErr_Clear(); return o; }
        ShimTupleObject *op = (ShimTupleObject *)calloc(
            1, sizeof(ShimTupleObject) + (size_t)(n > 0 ? n - 1 : 0) * sizeof(PyObject *));
        if (op == NULL) return o;
        op->ob_refcnt = 1;
        op->ob_type   = &PyTuple_Type;
        op->ob_size   = n;
        op->ob_hash   = -1;
        for (Py_ssize_t i = 0; i < n; i++)
            op->ob_item[i] = real_layout_arg(Py_XNewRef(PyTuple_GetItem(o, i)), depth + 1);
        real_reg_add((PyObject *)op);
        return (PyObject *)op;
    }
    if (t == &PyList_Type) {
        Py_ssize_t n = PyList_Size(o);
        if (n < 0) { PyErr_Clear(); return o; }
        PyObject *l = PyList_New(n);
        if (l == NULL) { PyErr_Clear(); return o; }
        for (Py_ssize_t i = 0; i < n; i++)
            ((ShimListObject *)l)->ob_item[i] =
                real_layout_arg(Py_XNewRef(PyList_GetItem(o, i)), depth + 1);
        return l;
    }
    return o;
}

/* Bridge a real-layout object to an equivalent Grail value's OOP.  Lists
   and tuples exist: build a fresh Grail collection and fill it with each
   (bridged) element.  Elements may themselves be real-layout (recurses) or
   Grail-backed (offset-16 OOP). */
static OopType real_obj_to_oop(PyObject *obj) {
    diag_tick(&g_diag_bridge);
    if (obj->ob_type == &PyTuple_Type) {
        ShimTupleObject *tp = (ShimTupleObject *)obj;
        OopType nOop = GciI64ToOop(tp->ob_size);
        PyObject *gt = addr_to_pyobj(GciPerform(server, "PyTuple_New:", &nOop, 1));
        for (Py_ssize_t i = 0; i < tp->ob_size; i++) {
            PyObject *el = tp->ob_item[i];
            OopType args[3] = { pyobj_oop(gt), GciI64ToOop(i),
                                el ? pyobj_oop(el) : none_oop };
            GciPerform(server, "PyTuple_SetItem:at:put:", args, 3);
        }
        /* The Grail copy goes back to C as THIS object, so a wheel that reads
           it with PyTuple_GET_ITEM finds its own layout again
           (CPythonShim>>___noteRealTuple:origin:). */
        OopType gtOop = pyobj_oop(gt);
        OopType note[2] = { gtOop, GciI64ToOop((int64)(intptr_t)obj) };
        GciPerform(server, "___noteRealTuple:origin:", note, 2);
        return gtOop;
    }
    ShimListObject *op = (ShimListObject *)obj;
    OopType zero = GciI64ToOop(0);
    PyObject *glist = addr_to_pyobj(GciPerform(server, "PyList_New:", &zero, 1));
    for (Py_ssize_t i = 0; i < op->ob_size; i++) {
        PyObject *el = op->ob_item[i];
        OopType item = el ? pyobj_oop(el) : none_oop;
        OopType args[2] = { pyobj_oop(glist), item };
        GciPerform(server, "PyList_Append:item:", args, 2);
    }
    return pyobj_oop(glist);
}

extern "C" PyObject *PyList_New(Py_ssize_t len) {
    diag_tick(&g_diag_list);
    ShimListObject *op = (ShimListObject *)calloc(1, sizeof(ShimListObject));
    if (op == NULL) return NULL;
    op->ob_refcnt = 1;
    op->ob_type   = &PyList_Type;
    op->ob_size   = len;
    op->allocated = len;
    if (len > 0) {
        op->ob_item = (PyObject **)calloc((size_t)len, sizeof(PyObject *));
        if (op->ob_item == NULL) { free(op); return NULL; }
    }
    real_reg_add((PyObject *)op);
    return (PyObject *)op;
}

static void raise_error(const char *message);

/* Validate a PyObject* parameter at the API boundary.  NULL has always been
   rejected; an implausible pointer (an OOP, or a corrupted slot) now is too,
   and the `msg' label names the call site -- so a bad value is reported as
   e.g. "PyDict_GetItem dict" instead of segfaulting inside is_foreign(). */
#define CHECK_pyObj(anObj, msg ) \
    if (anObj == NULL) { \
      raise_error( msg " arg is NULL"); \
      return 0; \
    } \
    if (!plausible_pyobj(anObj)) { \
      report_bad_pyobj( msg, anObj); \
      raise_error( msg " arg is not a PyObject* (an OOP or a corrupted slot)"); \
      return 0; \
    }

extern "C" int PyList_Append(PyObject *list, PyObject *item) {
    CHECK_pyObj(list, "PyList_Append list");
    CHECK_pyObj(item, "PyList_Append item");
    if (is_real_layout(list)) {
        ShimListObject *op = (ShimListObject *)list;
        if (op->ob_size >= op->allocated) {
            Py_ssize_t cap = op->allocated < 4 ? 4 : op->allocated * 2;
            PyObject **ni = (PyObject **)realloc(op->ob_item,
                                                 (size_t)cap * sizeof(PyObject *));
            if (ni == NULL) return -1;
            op->ob_item = ni;
            op->allocated = cap;
        }
        /* TAKE the reference the comment always claimed.  A real-layout list
           holds a RAW PyObject*, and for a Grail-backed item that pointer is
           the only thing keeping the wrapper's gcMalloc block alive on the C
           side -- the Smalltalk map entry is dropped by CPythonShim>>sweep the
           moment the refcount reaches 0.  Callers append and then release
           their own reference (sre.c's pattern_subx: PyList_Append then
           Py_DECREF), so without this incref every element of the list sits at
           refcount 0 while the list still points at it.  Measured in
           ReTests.test_large_subn, whose re.subn('','', 'a'*5147) builds a
           10295-element list that way and then reads every element back in
           PyUnicode_Join: a sweep landing in between frees the blocks and the
           join hands PyUnicode_AsUTF8 a dead wrapper.  See
           docs/Shim_Foreign_Proxy_Misattribution.md. */
        Py_INCREF(item);
        op->ob_item[op->ob_size++] = item;
        return 0;
    }
    OopType args[2] = { pyobj_oop(list), pyobj_oop(item) };
    GciPerform(server, "PyList_Append:item:", args, 2);
    if (check_gci_error()) return -1;
    return 0;
}

extern "C" PyObject *PyList_GetItem(PyObject *list, Py_ssize_t index) {
    CHECK_pyObj(list, "PyList_GetItem list");
    if (is_real_layout(list)) {
        ShimListObject *op = (ShimListObject *)list;
        if (index < 0 || index >= op->ob_size) return NULL;
        return op->ob_item[index];             /* borrowed ref, per CPython */
    }
    OopType args[2] = { pyobj_oop(list), GciI64ToOop(index) };
    OopType r = GciPerform(server, "PyList_GetItem:at:", args, 2);
    if (check_gci_error()) return NULL;
    return addr_to_pyobj(r);
}

/* Like PyList_GetItem but returns a *strong* reference (CPython 3.13+).
   numpy uses it during ufunc-loop registration. */
extern "C" PyObject *PyList_GetItemRef(PyObject *list, Py_ssize_t index) {
    PyObject *item = PyList_GetItem(list, index);
    Py_XINCREF(item);
    return item;
}

extern "C" int PyList_SetItem(PyObject *list, Py_ssize_t index, PyObject *item) {
    CHECK_pyObj(list, "PyList_SetItem list");
    if (is_real_layout(list)) {
        ShimListObject *op = (ShimListObject *)list;
        if (index < 0 || index >= op->ob_size) return -1;
        op->ob_item[index] = item;             /* steals ref, per CPython */
        return 0;
    }
    CHECK_pyObj(item, "PyList_SetItem item");
    OopType args[3] = { pyobj_oop(list), GciI64ToOop(index), pyobj_oop(item) };
    GciPerform(server, "PyList_SetItem:at:put:", args, 3);
    if (check_gci_error()) return -1;
    return 0;
}

extern "C" int PyList_Insert(PyObject *list, Py_ssize_t index, PyObject *item) {
    CHECK_pyObj(list, "PyList_Insert list");
    CHECK_pyObj(item, "PyList_Insert item");
    if (is_real_layout(list)) {
        ShimListObject *op = (ShimListObject *)list;
        Py_ssize_t n = op->ob_size;
        if (index < 0) index = 0;
        if (index > n) index = n;
        if (n >= op->allocated) {
            Py_ssize_t cap = op->allocated < 4 ? 4 : op->allocated * 2;
            PyObject **ni = (PyObject **)realloc(op->ob_item,
                                                 (size_t)cap * sizeof(PyObject *));
            if (ni == NULL) return -1;
            op->ob_item = ni;
            op->allocated = cap;
        }
        memmove(&op->ob_item[index + 1], &op->ob_item[index],
                (size_t)(n - index) * sizeof(PyObject *));
        Py_INCREF(item);                       /* same as PyList_Append */
        op->ob_item[index] = item;
        op->ob_size = n + 1;
        return 0;
    }
    OopType args[3] = { pyobj_oop(list), GciI64ToOop(index), pyobj_oop(item) };
    GciPerform(server, "PyList_Insert:at:item:", args, 3);
    if (check_gci_error()) return -1;
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
    if (is_real_layout(list)) return ((ShimListObject *)list)->ob_size;
    OopType arg = pyobj_oop(list);
    OopType n = GciPerform(server, "PyList_Size:", &arg, 1);
    if (check_gci_error()) return -1;
    return (Py_ssize_t)GciOopToI64(n);
}

extern "C" int PyList_Check(PyObject *obj) {
    return type_flag_check(obj, Py_TPFLAGS_LIST_SUBCLASS);
}

/* ====================================================================
 * CPython API implementations — Dict (backed by KeyValueDictionary)
 * ==================================================================== */

extern "C" PyObject *PyDict_New(void) {
    diag_tick(&g_diag_dict);
    return addr_to_pyobj(GciPerform(server, "PyDict_New", NULL, 0));
}

extern "C" int PyDict_SetItem(PyObject *dict, PyObject *key, PyObject *value) {
    CHECK_pyObj(dict, "PyDict_SetItem dict");
    CHECK_pyObj(key, "PyDict_SetItem key");
    CHECK_pyObj(value, "PyDict_SetItem value");
    OopType args[3] = { pyobj_oop(dict), pyobj_oop(key), pyobj_oop(value) };
    GciPerform(server, "PyDict_SetItem:key:value:", args, 3);
    if (check_gci_error()) return -1;
    return 0;
}

extern "C" int PyDict_SetItemString(PyObject *dict, const char *key, PyObject *value) {
    CHECK_pyObj(dict, "PyDict_SetItemString dict");
    CHECK_pyObj(value, "PyDict_SetItemString value");
    OopType args[3] = { pyobj_oop(dict), GciNewString(key), pyobj_oop(value) };
    GciPerform(server, "PyDict_SetItemString:key:value:", args, 3);
    if (check_gci_error()) return -1;
    return 0;
}

/* ONE dict lookup, the failure REPORTED: 1 found (*out borrowed), 0 absent,
   -1 with the Python error set.  A lookup fails for an unhashable key --
   pydantic_core's Literal validator looks every input up in a dict of the
   expected values and takes the TypeError a list raises as a miss.

   The error-suppressing variants below are built on this rather than on a
   perform left unchecked: an unchecked GciPerform error is not dropped, it
   stays PENDING in GciErr(), and the next check_gci_error() -- after some
   unrelated call -- reported it.  So PyDict_GetItemRef answered "absent"
   while the TypeError surfaced later from a call that had succeeded, and
   PyO3 unwound mid-validation into a Rust ``capacity overflow'' panic
   (FastAPI's ``Schema(type=["string", "null"])'', whose field is
   ``Literal[...] | list[Literal[...]]''). */
static int dict_lookup(PyObject *dict, OopType keyOop, PyObject **out) {
    OopType args[2] = { pyobj_oop(dict), keyOop };
    OopType addrOop = GciPerform(server, "PyDict_GetItem:key:", args, 2);
    *out = NULL;
    if (check_gci_error()) return -1;
    int64 addr = GciOopToI64(addrOop);
    if (addr == 0) return 0;
    *out = (PyObject *)(intptr_t)addr;
    return 1;
}

/* CPython's PyDict_GetItem / PyDict_GetItemString are the error-SUPPRESSING
   lookups: "absent" and "failed" both answer NULL, and an error that was
   already set when they were called survives them. */
static PyObject *dict_lookup_suppressing(PyObject *dict, OopType keyOop) {
    PyObject *t = NULL, *v = NULL, *tb = NULL;
    int had = PyErr_Occurred() != NULL;
    if (had) PyErr_Fetch(&t, &v, &tb);
    PyObject *found;
    if (dict_lookup(dict, keyOop, &found) < 0) PyErr_Clear();
    if (had) PyErr_Restore(t, v, tb);
    return found;
}

extern "C" PyObject *PyDict_GetItem(PyObject *dict, PyObject *key) {
    CHECK_pyObj(dict, "PyDict_GetItem dict");
    CHECK_pyObj(key, "PyDict_GetItem key");
    return dict_lookup_suppressing(dict, pyobj_oop(key));
}

extern "C" PyObject *PyDict_GetItemString(PyObject *dict, const char *key) {
    CHECK_pyObj(dict, "PyDict_GetItemString dict");
    return dict_lookup_suppressing(dict, GciNewString(key));
}

/* CPython 3.13+ strong-ref lookups: 1 (found, *result a new reference), 0
   (absent, *result NULL) or -1 (error set). */
extern "C" int PyDict_GetItemRef(PyObject *dict, PyObject *key, PyObject **result) {
    CHECK_pyObj(dict, "PyDict_GetItemRef dict");
    CHECK_pyObj(key, "PyDict_GetItemRef key");
    int r = dict_lookup(dict, pyobj_oop(key), result);
    if (r > 0) Py_INCREF(*result);
    return r;
}

extern "C" int PyDict_GetItemStringRef(PyObject *dict, const char *key, PyObject **result) {
    CHECK_pyObj(dict, "PyDict_GetItemStringRef dict");
    int r = dict_lookup(dict, GciNewString(key), result);
    if (r > 0) Py_INCREF(*result);
    return r;
}

extern "C" int PyDict_Contains(PyObject *dict, PyObject *key) {
    CHECK_pyObj(dict, "PyDict_Contains dict");
    CHECK_pyObj(key, "PyDict_Contains key");
    OopType args[2] = { pyobj_oop(dict), pyobj_oop(key) };
    OopType r = GciPerform(server, "PyDict_Contains:key:", args, 2);
    if (check_gci_error()) return -1;
    return r == OOP_TRUE ? 1 : 0;
}

extern "C" int PyDict_DelItem(PyObject *dict, PyObject *key) {
    CHECK_pyObj(dict, "PyDict_DelItem dict");
    CHECK_pyObj(key, "PyDict_DelItem key");
    OopType args[2] = { pyobj_oop(dict), pyobj_oop(key) };
    GciPerform(server, "PyDict_DelItem:key:", args, 2);
    if (check_gci_error()) return -1;
    return 0;
}

extern "C" Py_ssize_t PyDict_Size(PyObject *dict) {
    CHECK_pyObj(dict, "PyDict_Size dict");
    OopType arg = pyobj_oop(dict);
    OopType n = GciPerform(server, "PyDict_Size:", &arg, 1);
    if (check_gci_error()) return -1;
    return (Py_ssize_t)GciOopToI64(n);
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

/* Tuples are real-layout (like lists): a prebuilt wheel inlines
   PyTuple_GET_SIZE / PyTuple_GET_ITEM (direct struct access), so a tuple it
   builds and then validates — numpy's ufunc "info" tuples, for one — must
   have a real ob_size/ob_item.  pyobj_oop()/real_obj_to_oop() bridge one to
   a Grail tuple at the boundary. */
extern "C" PyObject *PyTuple_New(Py_ssize_t len) {
    diag_tick(&g_diag_tuple);
    if (len < 0) len = 0;
    ShimTupleObject *op = (ShimTupleObject *)calloc(
        1, sizeof(ShimTupleObject) + (size_t)(len > 0 ? len - 1 : 0) * sizeof(PyObject *));
    if (op == NULL) return NULL;
    op->ob_refcnt = 1;
    op->ob_type   = &PyTuple_Type;
    op->ob_size   = len;
    op->ob_hash   = -1;
    real_reg_add((PyObject *)op);
    return (PyObject *)op;
}

extern "C" int PyTuple_SetItem(PyObject *tuple, Py_ssize_t pos, PyObject *value) {
    CHECK_pyObj(tuple, "PyTuple_SetItem tuple");
    if (is_real_layout(tuple)) {
        ShimTupleObject *op = (ShimTupleObject *)tuple;
        if (pos < 0 || pos >= op->ob_size) return -1;
        op->ob_item[pos] = value;          /* steals a ref (no-op for us) */
        return 0;
    }
    CHECK_pyObj(value, "PyTuple_SetItem value");
    OopType args[3] = { pyobj_oop(tuple), GciI64ToOop(pos), pyobj_oop(value) };
    GciPerform(server, "PyTuple_SetItem:at:put:", args, 3);
    if (check_gci_error()) return -1;
    return 0;
}

extern "C" PyObject *PyTuple_GetItem(PyObject *tuple, Py_ssize_t pos) {
    CHECK_pyObj(tuple, "PyTuple_GetItem tuple");
    if (is_real_layout(tuple)) {
        ShimTupleObject *op = (ShimTupleObject *)tuple;
        if (pos < 0 || pos >= op->ob_size) return NULL;
        return op->ob_item[pos];
    }
    OopType args[2] = { pyobj_oop(tuple), GciI64ToOop(pos) };
    OopType r = GciPerform(server, "PyTuple_GetItem:at:", args, 2);
    if (check_gci_error()) return NULL;
    return addr_to_pyobj(r);
}

extern "C" Py_ssize_t PyTuple_Size(PyObject *tuple) {
    CHECK_pyObj(tuple, "PyTuple_Size tuple");
    if (is_real_layout(tuple)) return ((ShimTupleObject *)tuple)->ob_size;
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
    /* THE CACHE OWNS A REFERENCE.  Without it the only count on the module's
       wrapper was the caller's, which PyO3 drops when it is done -- the wrapper
       reached 0, CPythonShim>>sweep freed it, and this slot kept the dangling
       pointer.  The next import of the same name handed it out; once a STR
       wrapper had reused the memory, pydantic_core's ``re.compile'' lookup
       read ``'str' object has no attribute 'compile''', or the gem
       segfaulted (docs/Support_FastAPI.md, Phase 5). */
    Py_INCREF(mod);
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

extern "C" PyObject *_grail_import_level(PyObject *name, PyObject *globals, PyObject *locals,
                                         PyObject *fromlist, int level);
extern "C" PyObject *PyImport_GetModule(PyObject *name);          /* shim_numpy.cc */
extern "C" PyObject *PyImport_ImportModule(const char *name) {
    PyObject *cached = import_cache_get(name);
    /* A NEW reference, as CPython's is: the caller will decref it. */
    if (cached) { Py_INCREF(cached); return cached; }
    PyObject *m = do_import_via_server(name);
    if (m == NULL) {
        /* Not a builtin or a .py on the search path: Grail's whole import,
           which also finds a package's .so submodule (Cython cimports). */
        PyObject *n = PyUnicode_FromString(name);
        m = n ? _grail_import_level(n, NULL, NULL, NULL, 0) : NULL;
        Py_XDECREF(n);
        if (m == NULL) return NULL;
        /* __import__ answers the TOP package for a dotted name. */
        if (strchr(name, '.') != NULL) {
            PyObject *top = m;
            m = PyImport_GetModule(n = PyUnicode_FromString(name));
            Py_XDECREF(n);
            Py_DECREF(top);
            if (m == NULL) {
                if (!PyErr_Occurred()) PyErr_Format(PyExc_ImportError, "No module named '%s'", name);
                return NULL;
            }
        }
    }
    import_cache_put(name, m);
    return m;
}

/* PySys_GetObject(name): borrowed ref to the named sys-module attribute,
   or NULL if absent.  Delegates to the Grail sys module via the server
   (CPythonShim>>PySys_GetObject:).  NumPy's core reads sys.flags here. */
static PyObject *sys_get_object_raw(const char *name) {
    GciErrSType e; GciErr(&e);              /* drop any stale error first */
    OopType arg = GciNewString(name);
    OopType r = GciPerform(server, "PySys_GetObject:", &arg, 1);
    if (GciErr(&e)) return NULL;
    return addr_to_pyobj(r);               /* 0 -> NULL (no such sys attr) */
}

/* ``sys.version'' AS A C EXTENSION READS IT: CPython's leads with the
   language version, and extensions check it -- cffi's PyInit__cffi_backend
   compares its first three characters with PY_VERSION and refuses to load
   otherwise.  Grail's reads ``Grail 0.1.0 (GemStone/S ...)'', which Python
   code (platform) parses as it is, so only the C view changes:
   ``3.14.0 (Grail 0.1.0 (GemStone/S ...))'', from sys.version_info.  Built
   once and kept, like the other process-lifetime shim objects. */
static PyObject *g_c_sys_version = NULL;
static PyObject *c_sys_version(void) {
    if (g_c_sys_version != NULL) return g_c_sys_version;
    PyObject *orig = sys_get_object_raw("version");
    PyObject *info = sys_get_object_raw("version_info");
    if (orig == NULL || info == NULL) return orig;
    long part[3] = { 0, 0, 0 };
    for (int i = 0; i < 3; i++) {
        PyObject *p = PySequence_GetItem(info, i);
        if (p == NULL) { PyErr_Clear(); return orig; }
        part[i] = PyLong_AsLong(p);
        Py_DECREF(p);
    }
    const char *text = PyUnicode_AsUTF8(orig);
    if (text == NULL) { PyErr_Clear(); return orig; }
    char buf[512];
    snprintf(buf, sizeof buf, "%ld.%ld.%ld (%s)", part[0], part[1], part[2], text);
    g_c_sys_version = PyUnicode_FromString(buf);
    return g_c_sys_version != NULL ? g_c_sys_version : orig;
}

extern "C" PyObject *PySys_GetObject(const char *name) {
    if (name != NULL && strcmp(name, "version") == 0) return c_sys_version();
    GciErrSType e; GciErr(&e);              /* drop any stale error first */
    OopType arg = GciNewString(name);
    OopType r = GciPerform(server, "PySys_GetObject:", &arg, 1);
    if (GciErr(&e)) return NULL;
    return addr_to_pyobj(r);               /* 0 -> NULL (no such sys attr) */
}

/* contextvars (PEP 567).  NumPy's _multiarray_umath core init creates a
   ContextVar from C (printoptions).  These delegate to the Grail
   `contextvars.ContextVar` class (src/python/stdlib/contextvars.py) so the
   C-created var and any Python-created one are the same kind of object.
   A NULL default_value means "no default" (passed as OOP_NIL). */
extern "C" PyObject *PyContextVar_New(const char *name, PyObject *default_value) {
    GciErrSType e; GciErr(&e);              /* clear stale error */
    OopType args[2] = { GciNewString(name),
                        default_value ? pyobj_oop(default_value) : OOP_NIL };
    OopType r = GciPerform(server, "PyContextVar_New:default:", args, 2);
    /* A Python exception from ContextVar() itself: the guarded server method
       recorded it, and check_gci_error makes it C's pending error. */
    if (g_cb_error_flag) { check_gci_error(); return NULL; }
    if (GciErr(&e)) {
        if (!default_value) {
            fprintf(stderr, "SHIM-DIAG: PyContextVar_New('%s') failed: [%d] %s\n",
                    name, e.number, e.message);
            fflush(stderr);
            return NULL;
        }
        /* The default's offset-16 OOP wasn't a live Grail object
           (OBJ_ERR_OOP_NOT_ALLOCATED, 2106) — e.g. numpy's extobj default,
           a C-built object the shim didn't keep rooted; the server method
           never ran.  Retry with no default so the ContextVar still loads;
           .get() before .set() then raises LookupError (numpy sets extobj
           during use), which beats failing module init. */
        OopType retry[2] = { GciNewString(name), OOP_NIL };
        r = GciPerform(server, "PyContextVar_New:default:", retry, 2);
        if (g_cb_error_flag) { check_gci_error(); return NULL; }
        if (GciErr(&e)) {
            fprintf(stderr, "SHIM-DIAG: PyContextVar_New('%s') retry failed: [%d] %s\n",
                    name, e.number, e.message);
            fflush(stderr);
            return NULL;
        }
    }
    return addr_to_pyobj(r);
}

extern "C" int PyContextVar_Get(PyObject *var, PyObject *default_value,
                                PyObject **value) {
    CHECK_pyObj(var, "PyContextVar_Get var");
    GciErrSType e; GciErr(&e);
    OopType args[2] = { pyobj_oop(var),
                        default_value ? pyobj_oop(default_value) : OOP_NIL };
    OopType r = GciPerform(server, "PyContextVar_Get:default:", args, 2);
    /* check_gci_error, not a bare GciErr: it also takes a raised callback,
       and it leaves C a pending error -- the -1 used to come with none. */
    if (check_gci_error()) return -1;
    *value = addr_to_pyobj(r);
    return 0;
}

extern "C" PyObject *PyContextVar_Set(PyObject *var, PyObject *value) {
    CHECK_pyObj(var, "PyContextVar_Set var");
    GciErrSType e; GciErr(&e);
    OopType args[2] = { pyobj_oop(var), pyobj_oop(value) };
    OopType r = GciPerform(server, "PyContextVar_Set:value:", args, 2);
    if (check_gci_error()) return NULL;
    return addr_to_pyobj(r);
}


static PyObject *shim_module_getattr(PyObject *module, const char *name);
static int is_shim_module(PyObject *obj);

/* A TYPE object built by a wheel (PyType_FromSpec, or a static type of its
   own) and the metatype test for it.  Such a type has no OOP, so it crosses
   into Grail as a ShimForeignObject -- which holds no attributes.  PyO3 sets
   class attributes on its pyclasses at init (``__match_args__'', and
   whatever #[classattr]s a class declares), so they are kept where CPython
   keeps them, in tp_dict, and read back from the tp_dict chain before the
   Grail-side proxy is consulted. */
extern "C" PyObject *PyObject_GenericGetAttr(PyObject *, PyObject *);  /* below */

static int is_foreign_type(PyObject *obj) {
    if (!is_foreign(obj)) return 0;
    PyTypeObject *mt = obj->ob_type;
    return mt != NULL && (mt == &PyType_Type || PyType_IsSubtype(mt, &PyType_Type));
}

static PyObject *foreign_type_dict_lookup(PyTypeObject *t, const char *name) {
    for (; t != NULL; t = t->tp_base) {
        if (t->tp_dict == NULL) continue;
        PyObject *v = PyDict_GetItemString(t->tp_dict, name);
        if (v != NULL) { Py_INCREF(v); return v; }
    }
    return NULL;
}

/* PyObject_GenericGetAttr's walk, for a wheel's own object: along the type
   chain, the type's dict, then its method table (a bound builtin function --
   PyCMethod_New, shim_pyo3.cc), then its getset table (call the getter).  On
   a TYPE object only METH_CLASS / METH_STATIC methods bind, to the type or to
   nothing.  NULL with no error set means "not found here", which the caller
   may still try elsewhere. */
extern "C" PyObject *PyCMethod_New(PyMethodDef *, PyObject *, PyObject *, PyTypeObject *);

/* A descriptor made for a TYPE read, kept in the defining type's tp_dict --
   where CPython's PyType_Ready put it -- so foreign_type_dict_lookup answers
   the same object on every later read. */
static PyObject *cache_type_descr(PyTypeObject *owner, const char *name,
                                  PyObject *descr) {
    if (descr == NULL) return NULL;
    if (owner->tp_dict == NULL && (owner->tp_dict = PyDict_New()) == NULL) {
        PyErr_Clear();
        return descr;
    }
    if (PyDict_SetItemString(owner->tp_dict, name, descr) < 0) PyErr_Clear();
    return descr;
}

/* A wheel object's own INSTANCE dict: the PyObject* slot at its type's
   tp_dictoffset, NULL until something is stored, as in CPython.  numpy's
   _ArrayFunctionDispatcher has one, and every numpy function is one:
   overrides.py runs functools.wraps over each, which sets __name__,
   __qualname__, __doc__, __module__ and __wrapped__ on it and reads its
   __dict__.  The shim knew no tp_dictoffset at all, and the __dict__ read
   looped -- PyObject_GenericGetDict asked PyObject_GetAttrString, which found
   the type's __dict__ getset, which is PyObject_GenericGetDict -- until the
   C stack ran out.  A type object, a Grail wrapper and a type with no dict
   have none (NULL). */
extern "C" int PyObject_GenericSetAttr(PyObject *, PyObject *, PyObject *);
extern "C" int PyDict_DelItemString(PyObject *, const char *);  /* shim_numpy.cc */

static PyObject **foreign_dict_slot(PyObject *obj) {
    if (!is_foreign(obj) || is_foreign_type(obj)) return NULL;
    PyTypeObject *t = obj->ob_type;
    if (t == NULL || t->tp_dictoffset <= 0) return NULL;
    return (PyObject **)((char *)obj + t->tp_dictoffset);
}

static PyObject *foreign_instance_dict(PyObject *obj, int create) {
    PyObject **slot = foreign_dict_slot(obj);
    if (slot == NULL) return NULL;
    if (*slot == NULL && create) *slot = PyDict_New();
    return *slot;
}

/* The value of one PyMemberDef field of the object at addr, boxed by its
   declared type -- CPython's PyMember_GetOne.  A wheel's struct fields
   reach Python this way: numpy's ``dtype.type'' (the scalar type) is a
   _Py_T_OBJECT member, read by numpy/_core/_type_aliases.py for every
   entry of typeinfo. */
extern "C" PyObject *PyMember_GetOne(const char *addr, PyMemberDef *m) {
    if (m->flags & Py_RELATIVE_OFFSET) {
        PyErr_SetString(PyExc_SystemError,
                        "PyMember_GetOne used with Py_RELATIVE_OFFSET");
        return NULL;
    }
    const char *p = addr + m->offset;
    switch (m->type) {
        case Py_T_BOOL:      return PyBool_FromLong(*(const char *)p);
        case Py_T_BYTE:      return PyLong_FromLong(*(const signed char *)p);
        case Py_T_UBYTE:     return PyLong_FromUnsignedLong(*(const unsigned char *)p);
        case Py_T_SHORT:     return PyLong_FromLong(*(const short *)p);
        case Py_T_USHORT:    return PyLong_FromUnsignedLong(*(const unsigned short *)p);
        case Py_T_INT:       return PyLong_FromLong(*(const int *)p);
        case Py_T_UINT:      return PyLong_FromUnsignedLong(*(const unsigned int *)p);
        case Py_T_LONG:      return PyLong_FromLong(*(const long *)p);
        case Py_T_ULONG:     return PyLong_FromUnsignedLong(*(const unsigned long *)p);
        case Py_T_PYSSIZET:  return PyLong_FromSsize_t(*(const Py_ssize_t *)p);
        case Py_T_LONGLONG:  return PyLong_FromLongLong(*(const long long *)p);
        case Py_T_ULONGLONG: return PyLong_FromUnsignedLongLong(*(const unsigned long long *)p);
        case Py_T_FLOAT:     return PyFloat_FromDouble(*(const float *)p);
        case Py_T_DOUBLE:    return PyFloat_FromDouble(*(const double *)p);
        case Py_T_CHAR:      return PyUnicode_FromStringAndSize(p, 1);
        case Py_T_STRING_INPLACE: return PyUnicode_FromString(p);
        case Py_T_STRING: {
            const char *str = *(char *const *)p;
            if (str == NULL) { Py_INCREF(Py_None); return Py_None; }
            return PyUnicode_FromString(str);
        }
        case _Py_T_OBJECT: {
            PyObject *v = *(PyObject *const *)p;
            if (v == NULL) v = Py_None;
            Py_INCREF(v);
            return v;
        }
        case Py_T_OBJECT_EX: {
            PyObject *v = *(PyObject *const *)p;
            if (v == NULL) {
                PyErr_Format(PyExc_AttributeError, "object has no attribute '%s'", m->name);
                return NULL;
            }
            Py_INCREF(v);
            return v;
        }
        case _Py_T_NONE:     Py_INCREF(Py_None); return Py_None;
        default:
            PyErr_SetString(PyExc_SystemError, "bad memberdescr type");
            return NULL;
    }
}

/* Store value (NULL deletes) into one PyMemberDef field of the object at
   addr -- CPython's PyMember_SetOne.  A READONLY member refuses, with
   CPython's message; so does a non-object field asked to delete. */
extern "C" int PyMember_SetOne(char *addr, PyMemberDef *m, PyObject *v) {
    if (m->flags & Py_READONLY) {
        PyErr_SetString(PyExc_AttributeError, "readonly attribute");
        return -1;
    }
    if (m->flags & Py_RELATIVE_OFFSET) {
        PyErr_SetString(PyExc_SystemError,
                        "PyMember_SetOne used with Py_RELATIVE_OFFSET");
        return -1;
    }
    char *p = addr + m->offset;
    if (v == NULL && m->type != _Py_T_OBJECT && m->type != Py_T_OBJECT_EX) {
        PyErr_SetString(PyExc_TypeError, "can't delete numeric/char attribute");
        return -1;
    }
    switch (m->type) {
        case _Py_T_OBJECT:
        case Py_T_OBJECT_EX: {
            if (v == NULL && m->type == Py_T_OBJECT_EX && *(PyObject **)p == NULL) {
                PyErr_SetString(PyExc_AttributeError, m->name);
                return -1;
            }
            PyObject *old = *(PyObject **)p;
            Py_XINCREF(v);
            *(PyObject **)p = v;
            Py_XDECREF(old);
            return 0;
        }
        case Py_T_BOOL: {
            if (v != Py_True && v != Py_False) {
                PyErr_SetString(PyExc_TypeError, "attribute value type must be bool");
                return -1;
            }
            *(char *)p = (char)(v == Py_True);
            return 0;
        }
        case Py_T_FLOAT:
        case Py_T_DOUBLE: {
            double d = PyFloat_AsDouble(v);
            if (d == -1.0 && PyErr_Occurred()) return -1;
            if (m->type == Py_T_FLOAT) *(float *)p = (float)d;
            else *(double *)p = d;
            return 0;
        }
        case Py_T_BYTE: case Py_T_UBYTE: case Py_T_SHORT: case Py_T_USHORT:
        case Py_T_INT: case Py_T_UINT: case Py_T_LONG: case Py_T_ULONG:
        case Py_T_PYSSIZET: case Py_T_LONGLONG: case Py_T_ULONGLONG: {
            long long n = PyLong_AsLongLong(v);
            if (n == -1 && PyErr_Occurred()) return -1;
            switch (m->type) {
                case Py_T_BYTE:      *(signed char *)p = (signed char)n; break;
                case Py_T_UBYTE:     *(unsigned char *)p = (unsigned char)n; break;
                case Py_T_SHORT:     *(short *)p = (short)n; break;
                case Py_T_USHORT:    *(unsigned short *)p = (unsigned short)n; break;
                case Py_T_INT:       *(int *)p = (int)n; break;
                case Py_T_UINT:      *(unsigned int *)p = (unsigned int)n; break;
                case Py_T_LONG:      *(long *)p = (long)n; break;
                case Py_T_ULONG:     *(unsigned long *)p = (unsigned long)n; break;
                case Py_T_PYSSIZET:  *(Py_ssize_t *)p = (Py_ssize_t)n; break;
                case Py_T_LONGLONG:  *(long long *)p = n; break;
                default:             *(unsigned long long *)p = (unsigned long long)n; break;
            }
            return 0;
        }
        default:
            PyErr_Format(PyExc_SystemError, "bad memberdescr type for %s", m->name);
            return -1;
    }
}

/* The PyMemberDef named ``name'' on t's chain, or NULL. */
static PyMemberDef *foreign_member_named(PyTypeObject *t, const char *name) {
    for (; t != NULL; t = t->tp_base)
        for (PyMemberDef *m = t->tp_members; m && m->name; m++)
            if (strcmp(m->name, name) == 0) return m;
    return NULL;
}

/* A getset entry -- a data descriptor -- named ``name'' on t's chain. */
static PyGetSetDef *foreign_getset_named(PyTypeObject *t, const char *name) {
    for (; t != NULL; t = t->tp_base)
        for (PyGetSetDef *gs = t->tp_getset; gs && gs->name; gs++)
            if (strcmp(gs->name, name) == 0) return gs;
    return NULL;
}

/* Is ``name'' a data descriptor of t -- a getset or a struct member -- and so
   ahead of the instance dict? */
static int foreign_has_data_descr(PyTypeObject *t, const char *name) {
    return foreign_getset_named(t, name) != NULL || foreign_member_named(t, name) != NULL;
}

/* Store (value) or delete (NULL) an attribute of a wheel's own instance the
   way object.__setattr__ does: a data descriptor's setter, else the
   instance dict.  What PyObject_GenericSetAttr means for such an object. */
static int foreign_generic_setattr(PyObject *obj, const char *name, PyObject *value) {
    PyTypeObject *t = obj->ob_type;
    PyGetSetDef *gs = foreign_getset_named(t, name);
    if (gs != NULL) {
        if (gs->set == NULL) {
            PyErr_Format(PyExc_AttributeError,
                         "attribute '%s' of '%s' objects is not writable", name, t->tp_name);
            return -1;
        }
        return gs->set(obj, value, gs->closure);
    }
    PyMemberDef *m = foreign_member_named(t, name);
    if (m != NULL) return PyMember_SetOne((char *)obj, m, value);
    PyObject *d = foreign_instance_dict(obj, value != NULL);
    if (d == NULL) {
        if (!PyErr_Occurred())
            PyErr_Format(PyExc_AttributeError,
                         value != NULL
                             ? "'%s' object has no attribute '%s' and no __dict__ for setting new attributes"
                             : "'%s' object has no attribute '%s'",
                         t->tp_name, name);
        return -1;
    }
    if (value == NULL) return PyDict_DelItemString(d, name);
    return PyDict_SetItemString(d, name, value);
}

/* The same through the type's own tp_setattro when it has one. */
static int foreign_setattr(PyObject *obj, const char *name, PyObject *value) {
    PyTypeObject *t = obj->ob_type;
    if (t->tp_setattro != NULL && t->tp_setattro != PyObject_GenericSetAttr) {
        PyObject *n = PyUnicode_FromString(name);
        if (n == NULL) return -1;
        return t->tp_setattro(obj, n, value);
    }
    return foreign_generic_setattr(obj, name, value);
}

/* ====================================================================
 * OPERATORS on a wheel's own object (docs/Shim_Foreign_Subclassing.md,
 * step 2).  A C type implements its operators as slots -- nb_add,
 * tp_richcompare, mp_subscript, ... -- and CPython's interpreter is what
 * turns ``a + b'' into a slot call.  For a wheel object reaching Grail that
 * part is ours: ShimForeignObject's dunder methods call foreign_op_invoke
 * through the shimForeignOp user action, and an attribute read of the same
 * dunder answers a slot wrapper (wrapper_descriptor off the type,
 * method-wrapper off an instance), as CPython's PyType_Ready puts in a type's
 * dict.  numpy reads ``dtype.__ge__'' at import, and ``abs(x.dot(x) -
 * float32(2.0)) < 1e-5'' in its import-time sanity check needs the rest.
 *
 * Slots are looked up along tp_base, stopping at the shim's own static types
 * (Grail-backed builtins), because the shim's PyType_Ready does not copy the
 * number / sequence / mapping suites into a subtype as CPython's does.
 * ==================================================================== */

enum ForeignOpKind {
    FOP_BIN, FOP_RBIN, FOP_IBIN, FOP_CMP, FOP_UNARY, FOP_BOOL, FOP_LEN,
    FOP_HASH, FOP_ITER, FOP_NEXT, FOP_GETITEM, FOP_SETITEM, FOP_DELITEM,
    FOP_CONTAINS, FOP_INIT
};

struct ForeignOpDef {
    const char *name;
    int kind;
    int off;            /* offset in PyNumberMethods; the compare op for FOP_CMP */
    const char *sym;    /* the operator, for an error message */
};

#define NBO(f) ((int)offsetof(PyNumberMethods, f))
static const ForeignOpDef g_foreign_ops[] = {
    /* ``T.__init__'' is T's tp_init: Cython's ``BitGenerator.__init__(self,
       seed)'' in MT19937.__init__ calls it so, and it answered object's
       __init__, a no-op -- every numpy.random bit generator came out with
       no seed sequence. */
    {"__init__", FOP_INIT, 0, "__init__"},
    {"__add__", FOP_BIN, NBO(nb_add), "+"},             {"__radd__", FOP_RBIN, NBO(nb_add), "+"},
    {"__sub__", FOP_BIN, NBO(nb_subtract), "-"},        {"__rsub__", FOP_RBIN, NBO(nb_subtract), "-"},
    {"__mul__", FOP_BIN, NBO(nb_multiply), "*"},        {"__rmul__", FOP_RBIN, NBO(nb_multiply), "*"},
    {"__matmul__", FOP_BIN, NBO(nb_matrix_multiply), "@"}, {"__rmatmul__", FOP_RBIN, NBO(nb_matrix_multiply), "@"},
    {"__truediv__", FOP_BIN, NBO(nb_true_divide), "/"}, {"__rtruediv__", FOP_RBIN, NBO(nb_true_divide), "/"},
    {"__floordiv__", FOP_BIN, NBO(nb_floor_divide), "//"}, {"__rfloordiv__", FOP_RBIN, NBO(nb_floor_divide), "//"},
    {"__mod__", FOP_BIN, NBO(nb_remainder), "%"},       {"__rmod__", FOP_RBIN, NBO(nb_remainder), "%"},
    {"__divmod__", FOP_BIN, NBO(nb_divmod), "divmod()"}, {"__rdivmod__", FOP_RBIN, NBO(nb_divmod), "divmod()"},
    {"__pow__", FOP_BIN, NBO(nb_power), "**"},          {"__rpow__", FOP_RBIN, NBO(nb_power), "**"},
    {"__lshift__", FOP_BIN, NBO(nb_lshift), "<<"},      {"__rlshift__", FOP_RBIN, NBO(nb_lshift), "<<"},
    {"__rshift__", FOP_BIN, NBO(nb_rshift), ">>"},      {"__rrshift__", FOP_RBIN, NBO(nb_rshift), ">>"},
    {"__and__", FOP_BIN, NBO(nb_and), "&"},             {"__rand__", FOP_RBIN, NBO(nb_and), "&"},
    {"__or__", FOP_BIN, NBO(nb_or), "|"},               {"__ror__", FOP_RBIN, NBO(nb_or), "|"},
    {"__xor__", FOP_BIN, NBO(nb_xor), "^"},             {"__rxor__", FOP_RBIN, NBO(nb_xor), "^"},
    {"__iadd__", FOP_IBIN, NBO(nb_inplace_add), "+="},  {"__isub__", FOP_IBIN, NBO(nb_inplace_subtract), "-="},
    {"__imul__", FOP_IBIN, NBO(nb_inplace_multiply), "*="}, {"__imatmul__", FOP_IBIN, NBO(nb_inplace_matrix_multiply), "@="},
    {"__itruediv__", FOP_IBIN, NBO(nb_inplace_true_divide), "/="}, {"__ifloordiv__", FOP_IBIN, NBO(nb_inplace_floor_divide), "//="},
    {"__imod__", FOP_IBIN, NBO(nb_inplace_remainder), "%="}, {"__ipow__", FOP_IBIN, NBO(nb_inplace_power), "**="},
    {"__ilshift__", FOP_IBIN, NBO(nb_inplace_lshift), "<<="}, {"__irshift__", FOP_IBIN, NBO(nb_inplace_rshift), ">>="},
    {"__iand__", FOP_IBIN, NBO(nb_inplace_and), "&="},  {"__ior__", FOP_IBIN, NBO(nb_inplace_or), "|="},
    {"__ixor__", FOP_IBIN, NBO(nb_inplace_xor), "^="},
    {"__lt__", FOP_CMP, Py_LT, "<"}, {"__le__", FOP_CMP, Py_LE, "<="}, {"__eq__", FOP_CMP, Py_EQ, "=="},
    {"__ne__", FOP_CMP, Py_NE, "!="}, {"__gt__", FOP_CMP, Py_GT, ">"}, {"__ge__", FOP_CMP, Py_GE, ">="},
    {"__neg__", FOP_UNARY, NBO(nb_negative), "unary -"}, {"__pos__", FOP_UNARY, NBO(nb_positive), "unary +"},
    {"__abs__", FOP_UNARY, NBO(nb_absolute), "abs()"},   {"__invert__", FOP_UNARY, NBO(nb_invert), "unary ~"},
    {"__int__", FOP_UNARY, NBO(nb_int), "int()"},       {"__float__", FOP_UNARY, NBO(nb_float), "float()"},
    {"__index__", FOP_UNARY, NBO(nb_index), "index()"},
    {"__bool__", FOP_BOOL, NBO(nb_bool), "bool()"},
    {"__len__", FOP_LEN, 0, "len()"}, {"__hash__", FOP_HASH, 0, "hash()"},
    {"__iter__", FOP_ITER, 0, "iter()"}, {"__next__", FOP_NEXT, 0, "next()"},
    {"__getitem__", FOP_GETITEM, 0, "[]"}, {"__setitem__", FOP_SETITEM, 0, "[]="},
    {"__delitem__", FOP_DELITEM, 0, "del []"}, {"__contains__", FOP_CONTAINS, 0, "in"},
    {NULL, 0, 0, NULL}
};
#undef NBO

static const ForeignOpDef *foreign_op_named(const char *name) {
    if (name == NULL || name[0] != '_' || name[1] != '_') return NULL;
    for (const ForeignOpDef *d = g_foreign_ops; d->name != NULL; d++)
        if (strcmp(d->name, name) == 0) return d;
    return NULL;
}

/* The first type on t's tp_base chain, short of the shim's own types, for
   which pick() answers a slot -- and that slot. */
#define FOREIGN_SLOT(t, expr) ({ void *_r = NULL; \
    for (PyTypeObject *_t = (t); _t != NULL && !is_shim_type(_t); _t = _t->tp_base) { \
        PyTypeObject *T = _t; (void)T; void *_v = (void *)(expr); if (_v) { _r = _v; break; } } _r; })

static void *foreign_nb_slot(PyTypeObject *t, int off) {
    return FOREIGN_SLOT(t, T->tp_as_number ? *(void **)((char *)T->tp_as_number + off) : NULL);
}
static void *foreign_mp_subscript(PyTypeObject *t) { return FOREIGN_SLOT(t, T->tp_as_mapping ? (void *)T->tp_as_mapping->mp_subscript : NULL); }
static void *foreign_mp_ass(PyTypeObject *t)       { return FOREIGN_SLOT(t, T->tp_as_mapping ? (void *)T->tp_as_mapping->mp_ass_subscript : NULL); }
static void *foreign_mp_length(PyTypeObject *t)    { return FOREIGN_SLOT(t, T->tp_as_mapping ? (void *)T->tp_as_mapping->mp_length : NULL); }
static void *foreign_sq_length(PyTypeObject *t)    { return FOREIGN_SLOT(t, T->tp_as_sequence ? (void *)T->tp_as_sequence->sq_length : NULL); }
static void *foreign_sq_item(PyTypeObject *t)      { return FOREIGN_SLOT(t, T->tp_as_sequence ? (void *)T->tp_as_sequence->sq_item : NULL); }
static void *foreign_sq_ass_item(PyTypeObject *t)  { return FOREIGN_SLOT(t, T->tp_as_sequence ? (void *)T->tp_as_sequence->sq_ass_item : NULL); }
static void *foreign_sq_contains(PyTypeObject *t)  { return FOREIGN_SLOT(t, T->tp_as_sequence ? (void *)T->tp_as_sequence->sq_contains : NULL); }
static void *foreign_tp_richcompare(PyTypeObject *t) { return FOREIGN_SLOT(t, (void *)T->tp_richcompare); }
/* Iteration searches HEAP types too.  The shim's PyType_FromSpec registers
   every type it builds as a shim type, and every PyO3 class is built that way
   -- pydantic_core's ValidatorIterator, what an ``Iterable[Model]'' validates
   to -- so stopping at the first shim type found no tp_iter and the iterator
   answered ``not iterable''.  Only iteration: the compare / hash slots keep
   FOREIGN_SLOT's stop, so a PyO3 object's == and hash stay consistent. */
#define FOREIGN_ITER_STOP(t) (is_shim_type(t) && !((t)->tp_flags & Py_TPFLAGS_HEAPTYPE))
static void *foreign_tp_iter(PyTypeObject *t) {
    for (; t != NULL && !FOREIGN_ITER_STOP(t); t = t->tp_base)
        if (t->tp_iter) return (void *)t->tp_iter;
    return NULL;
}
static void *foreign_tp_iternext(PyTypeObject *t) {
    for (; t != NULL && !FOREIGN_ITER_STOP(t); t = t->tp_base)
        if (t->tp_iternext) return (void *)t->tp_iternext;
    return NULL;
}
static void *foreign_tp_init(PyTypeObject *t) {
    for (; t != NULL && !FOREIGN_ITER_STOP(t); t = t->tp_base)
        if (t->tp_init) return (void *)t->tp_init;
    return NULL;
}

/* tp_hash and tp_richcompare go together, as CPython inherits them: the first
   type defining either decides.  Comparison without a hash is CPython's
   ``__hash__ = None'' -- ndarray's case.  *unhashable says so; NULL with it
   clear means object's identity hash applies. */
/* What a type sets as its tp_hash to say it is unhashable (CPython's
   object.h).  Missing from the shim, so a wheel that used it did not load. */
extern "C" Py_hash_t PyObject_HashNotImplemented(PyObject *v) {
    PyErr_Format(PyExc_TypeError, "unhashable type: '%s'",
                 v && Py_TYPE(v) && Py_TYPE(v)->tp_name ? Py_TYPE(v)->tp_name : "?");
    return -1;
}

static hashfunc foreign_tp_hash(PyTypeObject *t, int *unhashable) {
    *unhashable = 0;
    for (; t != NULL && !is_shim_type(t); t = t->tp_base) {
        if (t->tp_hash == PyObject_HashNotImplemented) { *unhashable = 1; return NULL; }
        if (t->tp_hash != NULL) return t->tp_hash;
        if (t->tp_richcompare != NULL) { *unhashable = 1; return NULL; }
    }
    return NULL;
}

/* What a proxy needs to know to compare and hash WITHOUT asking C, handed to
   it at birth (CPythonShim>>foreignProxyForPointer:typeName:ops:): 1 = its
   type has tp_richcompare, 2 = tp_hash, 4 = unhashable (compares, no hash).
   Most wheel objects have neither -- every numpy DType class, every ufunc --
   and for those == is identity and the hash is the identity hash, as in
   CPython, with no user action.  That matters beyond speed: numpy keys its
   cast tables by DType class, and a hash that needed a nested user action
   failed deep inside np.linspace, so the lookup missed ("builtin cast ...
   not found, this should not be possible"). */
static int64 foreign_compare_hash_bits(PyObject *obj) {
    PyTypeObject *t = obj ? obj->ob_type : NULL;
    if (t == NULL || !plausible_pyobj(t)) return 0;
    int unhashable = 0;
    int64 bits = 0;
    if (foreign_tp_richcompare(t) != NULL) bits |= 1;
    if (foreign_tp_hash(t, &unhashable) != NULL) bits |= 2;
    if (unhashable) bits |= 4;
    /* A subclass of float compares and hashes as float does
       (float_subtype_op), whatever slots its own type lacks. */
    if (PyType_IsSubtype(t, &PyFloat_Type)) {
        bits |= 1;
        if (!unhashable) bits |= 2;
    }
    return bits;
}

/* Does t implement op at all -- whether an attribute read answers a wrapper. */
static int foreign_op_present(PyTypeObject *t, const ForeignOpDef *d) {
    int unhashable;
    switch (d->kind) {
        case FOP_BIN: case FOP_RBIN: case FOP_IBIN: case FOP_UNARY: case FOP_BOOL:
            return foreign_nb_slot(t, d->off) != NULL;
        case FOP_CMP:      return foreign_tp_richcompare(t) != NULL;
        case FOP_LEN:      return foreign_mp_length(t) != NULL || foreign_sq_length(t) != NULL;
        case FOP_HASH:     return foreign_tp_hash(t, &unhashable) != NULL;
        case FOP_ITER:     return foreign_tp_iter(t) != NULL || foreign_sq_item(t) != NULL;
        case FOP_NEXT:     return foreign_tp_iternext(t) != NULL;
        case FOP_GETITEM:  return foreign_mp_subscript(t) != NULL || foreign_sq_item(t) != NULL;
        case FOP_SETITEM:
        case FOP_DELITEM:  return foreign_mp_ass(t) != NULL || foreign_sq_ass_item(t) != NULL;
        case FOP_CONTAINS: return foreign_sq_contains(t) != NULL;
        case FOP_INIT:     return foreign_tp_init(t) != NULL;
    }
    return 0;
}

static PyObject *foreign_not_implemented(void) {
    Py_INCREF(Py_NotImplemented);
    return Py_NotImplemented;
}

static PyObject *foreign_bool_obj(int v) {
    PyObject *r = v ? Py_True : Py_False;
    Py_INCREF(r);
    return r;
}

/* A sequence index for sq_item / sq_ass_item, made non-negative with
   sq_length as CPython's PySequence_GetItem does.  -1 with an error set on
   failure. */
static Py_ssize_t foreign_seq_index(PyTypeObject *t, PyObject *self, PyObject *key) {
    Py_ssize_t i = PyNumber_AsSsize_t(key, PyExc_IndexError);
    if (i == -1 && PyErr_Occurred()) return -1;
    if (i < 0) {
        lenfunc len = (lenfunc)foreign_sq_length(t);
        if (len != NULL) {
            Py_ssize_t n = len(self);
            if (n < 0) return -1;
            i += n;
        }
    }
    return i;
}

/* ``self <op> a'' (and b, the value of an item assignment or a pow modulus)
   by self's own slot, with CPython's semantics: a binary slot missing is
   NotImplemented, so the caller can try the other operand; the rest raise
   CPython's TypeError.  NULL with no error set means ``no answer here'' --
   only __hash__ (object's identity hash applies) and __contains__ (no
   sq_contains, so search by iteration) answer that way, and the
   searching is done here.  New reference, or NULL with an error. */
/* An instance of a wheel's own SUBCLASS OF FLOAT, for an operator its type
   does not implement itself: float's.  In CPython the subclass inherits
   float's C slots; the shim's float has none -- Grail does float arithmetic
   -- so the instance's value (its ob_fval, real since float_tp_new) goes to
   the shim's number API as a float.  NULL with no error: not applicable. */
extern "C" PyObject *PyNumber_Add(PyObject *, PyObject *);
extern "C" PyObject *PyNumber_Subtract(PyObject *, PyObject *);
extern "C" PyObject *PyNumber_Multiply(PyObject *, PyObject *);
extern "C" PyObject *PyNumber_TrueDivide(PyObject *, PyObject *);
extern "C" PyObject *PyNumber_FloorDivide(PyObject *, PyObject *);
extern "C" PyObject *PyNumber_Remainder(PyObject *, PyObject *);
extern "C" PyObject *PyNumber_Power(PyObject *, PyObject *, PyObject *);
extern "C" PyObject *PyNumber_Divmod(PyObject *, PyObject *);
extern "C" PyObject *PyNumber_Negative(PyObject *);
extern "C" PyObject *PyNumber_Positive(PyObject *);
extern "C" PyObject *PyNumber_Absolute(PyObject *);
extern "C" PyObject *PyNumber_Long(PyObject *);
static PyObject *float_subtype_op(PyObject *self, const ForeignOpDef *d, PyObject *a, PyObject *b) {
    PyObject *f = PyFloat_FromDouble(*(double *)((char *)self + 16));
    if (f == NULL) return NULL;
    PyObject *x = d->kind == FOP_RBIN ? a : f, *y = d->kind == FOP_RBIN ? f : a;
    switch (d->kind) {
        case FOP_BIN: case FOP_RBIN: case FOP_IBIN: {
            int off = d->off;
#define NB_IS(f1, f2) (off == (int)offsetof(PyNumberMethods, f1) || off == (int)offsetof(PyNumberMethods, f2))
            if (NB_IS(nb_add, nb_inplace_add))                 return PyNumber_Add(x, y);
            if (NB_IS(nb_subtract, nb_inplace_subtract))       return PyNumber_Subtract(x, y);
            if (NB_IS(nb_multiply, nb_inplace_multiply))       return PyNumber_Multiply(x, y);
            if (NB_IS(nb_true_divide, nb_inplace_true_divide)) return PyNumber_TrueDivide(x, y);
            if (NB_IS(nb_floor_divide, nb_inplace_floor_divide)) return PyNumber_FloorDivide(x, y);
            if (NB_IS(nb_remainder, nb_inplace_remainder))     return PyNumber_Remainder(x, y);
            if (NB_IS(nb_power, nb_inplace_power))             return PyNumber_Power(x, y, b ? b : Py_None);
            if (off == (int)offsetof(PyNumberMethods, nb_divmod)) return PyNumber_Divmod(x, y);
#undef NB_IS
            return foreign_not_implemented();
        }
        case FOP_CMP:   return PyObject_RichCompare(f, a, d->off);
        case FOP_UNARY:
            if (d->off == (int)offsetof(PyNumberMethods, nb_negative)) return PyNumber_Negative(f);
            if (d->off == (int)offsetof(PyNumberMethods, nb_positive)) return PyNumber_Positive(f);
            if (d->off == (int)offsetof(PyNumberMethods, nb_absolute)) return PyNumber_Absolute(f);
            if (d->off == (int)offsetof(PyNumberMethods, nb_float))    return f;
            if (d->off == (int)offsetof(PyNumberMethods, nb_int))      return PyNumber_Long(f);
            break;
        case FOP_BOOL:  return foreign_bool_obj(*(double *)((char *)self + 16) != 0.0);
        case FOP_HASH: {
            Py_hash_t h = PyObject_Hash(f);
            if (h == -1 && PyErr_Occurred()) return NULL;
            return PyLong_FromSsize_t((Py_ssize_t)h);
        }
        default: break;
    }
    return NULL;
}

extern "C" PyObject *PySeqIter_New(PyObject *seq);
static PyObject *foreign_op_invoke(PyObject *self, const ForeignOpDef *d, PyObject *a, PyObject *b) {
    PyTypeObject *t = Py_TYPE(self);
    const char *tn = (t && t->tp_name) ? t->tp_name : "?";
    if (t != NULL && PyType_IsSubtype(t, &PyFloat_Type) && !foreign_op_present(t, d)) {
        PyObject *r = float_subtype_op(self, d, a, b);
        if (r != NULL || PyErr_Occurred()) return r;
    }
    switch (d->kind) {
        case FOP_BIN:
        case FOP_RBIN:
        case FOP_IBIN: {
            void *f = foreign_nb_slot(t, d->off);
            if (f == NULL) return foreign_not_implemented();
            PyObject *x = d->kind == FOP_RBIN ? a : self;
            PyObject *y = d->kind == FOP_RBIN ? self : a;
            if (d->off == (int)offsetof(PyNumberMethods, nb_power)
                    || d->off == (int)offsetof(PyNumberMethods, nb_inplace_power))
                return ((ternaryfunc)f)(x, y, b != NULL ? b : Py_None);
            return ((binaryfunc)f)(x, y);
        }
        case FOP_CMP: {
            richcmpfunc f = (richcmpfunc)foreign_tp_richcompare(t);
            if (f == NULL) return foreign_not_implemented();
            return f(self, a, d->off);
        }
        case FOP_UNARY: {
            unaryfunc f = (unaryfunc)foreign_nb_slot(t, d->off);
            if (f == NULL) {
                /* CPython's words for each, from float(), int() and
                   operator.index() */
                if (d->off == (int)offsetof(PyNumberMethods, nb_float))
                    PyErr_Format(PyExc_TypeError, "float() argument must be a string or a real number, not '%s'", tn);
                else if (d->off == (int)offsetof(PyNumberMethods, nb_int))
                    PyErr_Format(PyExc_TypeError, "int() argument must be a string, a bytes-like object or a real number, not '%s'", tn);
                else if (d->off == (int)offsetof(PyNumberMethods, nb_index))
                    PyErr_Format(PyExc_TypeError, "'%s' object cannot be interpreted as an integer", tn);
                else
                    PyErr_Format(PyExc_TypeError, "bad operand type for %s: '%s'", d->sym, tn);
                return NULL;
            }
            return f(self);
        }
        case FOP_BOOL: {
            inquiry f = (inquiry)foreign_nb_slot(t, d->off);
            int r;
            if (f != NULL) {
                r = f(self);
            } else {
                lenfunc len = (lenfunc)foreign_mp_length(t);
                if (len == NULL) len = (lenfunc)foreign_sq_length(t);
                if (len == NULL) return foreign_bool_obj(1);
                Py_ssize_t n = len(self);
                r = n < 0 ? -1 : n != 0;
            }
            if (r < 0) return NULL;
            return foreign_bool_obj(r);
        }
        case FOP_LEN: {
            lenfunc len = (lenfunc)foreign_mp_length(t);
            if (len == NULL) len = (lenfunc)foreign_sq_length(t);
            if (len == NULL) {
                PyErr_Format(PyExc_TypeError, "object of type '%s' has no len()", tn);
                return NULL;
            }
            Py_ssize_t n = len(self);
            if (n < 0) return NULL;
            return PyLong_FromSsize_t(n);
        }
        case FOP_HASH: {
            int unhashable;
            hashfunc f = foreign_tp_hash(t, &unhashable);
            if (unhashable) {
                PyErr_Format(PyExc_TypeError, "unhashable type: '%s'", tn);
                return NULL;
            }
            if (f == NULL) return NULL;
            Py_hash_t h = f(self);
            if (h == -1 && PyErr_Occurred()) return NULL;
            return PyLong_FromSsize_t((Py_ssize_t)h);
        }
        case FOP_ITER: {
            getiterfunc f = (getiterfunc)foreign_tp_iter(t);
            /* No tp_iter but sq_item: CPython's PyObject_GetIter answers a
               sequence iterator over __getitem__ (numpy's _array_converter,
               which np.unique unpacks). */
            if (f == NULL && foreign_sq_item(t) != NULL)
                return PySeqIter_New(self);
            if (f == NULL) {
                PyErr_Format(PyExc_TypeError, "'%s' object is not iterable", tn);
                return NULL;
            }
            return f(self);
        }
        case FOP_NEXT: {
            iternextfunc f = (iternextfunc)foreign_tp_iternext(t);
            if (f == NULL) {
                PyErr_Format(PyExc_TypeError, "'%s' object is not an iterator", tn);
                return NULL;
            }
            PyObject *r = f(self);
            if (r == NULL && !PyErr_Occurred()) PyErr_SetNone(PyExc_StopIteration);
            return r;
        }
        case FOP_GETITEM: {
            binaryfunc f = (binaryfunc)foreign_mp_subscript(t);
            if (f != NULL) return f(self, a);
            ssizeargfunc g = (ssizeargfunc)foreign_sq_item(t);
            if (g == NULL) {
                PyErr_Format(PyExc_TypeError, "'%s' object is not subscriptable", tn);
                return NULL;
            }
            Py_ssize_t i = foreign_seq_index(t, self, a);
            if (i == -1 && PyErr_Occurred()) return NULL;
            return g(self, i);
        }
        case FOP_SETITEM:
        case FOP_DELITEM: {
            PyObject *v = d->kind == FOP_SETITEM ? b : NULL;
            int rc;
            objobjargproc f = (objobjargproc)foreign_mp_ass(t);
            if (f != NULL) {
                rc = f(self, a, v);
            } else {
                ssizeobjargproc g = (ssizeobjargproc)foreign_sq_ass_item(t);
                if (g == NULL) {
                    PyErr_Format(PyExc_TypeError, d->kind == FOP_SETITEM
                                     ? "'%s' object does not support item assignment"
                                     : "'%s' object doesn't support item deletion", tn);
                    return NULL;
                }
                Py_ssize_t i = foreign_seq_index(t, self, a);
                if (i == -1 && PyErr_Occurred()) return NULL;
                rc = g(self, i, v);
            }
            if (rc < 0) return NULL;
            Py_INCREF(Py_None);
            return Py_None;
        }
        case FOP_CONTAINS: {
            objobjproc f = (objobjproc)foreign_sq_contains(t);
            if (f != NULL) {
                int r = f(self, a);
                if (r < 0) return NULL;
                return foreign_bool_obj(r);
            }
            /* No sq_contains: search by iteration, CPython's
               _PySequence_IterSearch. */
            getiterfunc gi = (getiterfunc)foreign_tp_iter(t);
            if (gi == NULL) {
                PyErr_Format(PyExc_TypeError, "argument of type '%s' is not a container or iterable", tn);
                return NULL;
            }
            PyObject *it = gi(self);
            if (it == NULL) return NULL;
            for (;;) {
                PyObject *item = PyIter_Next(it);
                if (item == NULL) {
                    if (PyErr_Occurred()) return NULL;
                    return foreign_bool_obj(0);
                }
                int eq = PyObject_RichCompareBool(item, a, Py_EQ);
                if (eq < 0) return NULL;
                if (eq) return foreign_bool_obj(1);
            }
        }
    }
    PyErr_SetString(PyExc_SystemError, "unknown foreign operator");
    return NULL;
}

/* --- Slot wrappers: what a dunder read off a wheel's type or object answers.
   ``wrapper_descriptor'' off the type -- called with the instance first --
   and ``method-wrapper'' off an instance, bound to it.  Both call
   foreign_op_invoke.  numpy's import reads ``dtype.__ge__'' and friends to
   attach docstrings (which add_docstring declines for these, as CPython's
   does; numpy's _add_docstring ignores that). */
typedef struct {
    Py_ssize_t ob_refcnt;
    PyTypeObject *ob_type;
    PyTypeObject *d_type;
    PyObject *d_name;
    PyObject *d_qualname;
    const ForeignOpDef *op;
} GrailSlotWrapper;

typedef struct {
    Py_ssize_t ob_refcnt;
    PyTypeObject *ob_type;
    PyObject *self;
    const ForeignOpDef *op;
} GrailMethodWrapper;

static PyTypeObject GrailSlotWrapper_Type;
static PyTypeObject GrailMethodWrapper_Type;

static PyObject *foreign_wrapper_call(PyObject *self, const ForeignOpDef *op,
                                      PyObject *args, Py_ssize_t from, PyObject *kw,
                                      PyTypeObject *owner) {
    if (op->kind == FOP_INIT) {
        /* tp_init(self, args, kwargs): every argument after self, and the
           keywords, which the fixed-arity operators below never take.  The
           OWNER's slot -- the type the wrapper was read from, as CPython's
           wrapper_descriptor holds it: ``BitGenerator.__init__(self, seed)''
           inside MT19937.__init__ found MT19937's own tp_init through
           Py_TYPE(self) and recursed until the C stack ran out. */
        initproc f = (initproc)foreign_tp_init(owner ? owner : Py_TYPE(self));
        if (f == NULL) {
            PyErr_SetString(PyExc_TypeError, "object has no __init__ slot");
            return NULL;
        }
        PyObject *rest = PyTuple_GetSlice(args, from, PyTuple_Size(args));
        if (rest == NULL) return NULL;
        rest = to_real_tuple(rest);       /* the slot reads its size inline */
        if (rest == NULL) return NULL;
        int rc = f(self, rest, kw);
        Py_DECREF(rest);
        if (rc < 0) return NULL;
        Py_INCREF(Py_None);
        return Py_None;
    }
    Py_ssize_t n = PyTuple_Size(args) - from;
    PyObject *a = n >= 1 ? PyTuple_GetItem(args, from) : NULL;
    PyObject *b = n >= 2 ? PyTuple_GetItem(args, from + 1) : NULL;
    int want = (op->kind == FOP_UNARY || op->kind == FOP_BOOL || op->kind == FOP_LEN
                || op->kind == FOP_HASH || op->kind == FOP_ITER || op->kind == FOP_NEXT) ? 0
             : (op->kind == FOP_SETITEM) ? 2 : 1;
    int is_pow = (op->kind == FOP_BIN || op->kind == FOP_RBIN || op->kind == FOP_IBIN)
                 && op->off == (int)offsetof(PyNumberMethods, nb_power);
    if (n != want && !(is_pow && n == 2)) {
        PyErr_Format(PyExc_TypeError, "expected %d argument%s, got %zd",
                     want, want == 1 ? "" : "s", n);
        return NULL;
    }
    PyObject *r = foreign_op_invoke(self, op, a, b);
    if (r == NULL && !PyErr_Occurred()) {
        if (op->kind == FOP_HASH) return PyLong_FromSsize_t((Py_ssize_t)(((uintptr_t)self) >> 4));
        PyErr_SetString(PyExc_SystemError, "slot wrapper answered nothing");
    }
    return r;
}

static PyObject *slotwrapper_call(PyObject *w, PyObject *args, PyObject *kw) {
    (void)kw;
    GrailSlotWrapper *d = (GrailSlotWrapper *)w;
    if (PyTuple_Size(args) < 1) {
        PyErr_Format(PyExc_TypeError, "descriptor '%s' of '%s' object needs an argument",
                     d->op->name, d->d_type ? d->d_type->tp_name : "?");
        return NULL;
    }
    return foreign_wrapper_call(PyTuple_GetItem(args, 0), d->op, args, 1, kw, d->d_type);
}

static PyObject *new_method_wrapper(PyObject *self, const ForeignOpDef *op);

static PyObject *slotwrapper_get(PyObject *w, PyObject *obj, PyObject *type) {
    (void)type;
    if (obj == NULL || obj == Py_None) { Py_INCREF(w); return w; }
    return new_method_wrapper(obj, ((GrailSlotWrapper *)w)->op);
}

static PyObject *methodwrapper_call(PyObject *w, PyObject *args, PyObject *kw) {
    (void)kw;
    GrailMethodWrapper *m = (GrailMethodWrapper *)w;
    return foreign_wrapper_call(m->self, m->op, args, 0, kw, NULL);
}

static PyObject *wrapper_getattro(PyObject *w, PyObject *name) {
    const char *n = PyUnicode_AsUTF8(name);
    if (n == NULL) return NULL;
    int bound = Py_TYPE(w) == &GrailMethodWrapper_Type;
    const ForeignOpDef *op = bound ? ((GrailMethodWrapper *)w)->op : ((GrailSlotWrapper *)w)->op;
    PyTypeObject *owner = bound ? Py_TYPE(((GrailMethodWrapper *)w)->self) : ((GrailSlotWrapper *)w)->d_type;
    if (strcmp(n, "__name__") == 0) return PyUnicode_FromString(op->name);
    if (strcmp(n, "__qualname__") == 0) {
        const char *tn = owner && owner->tp_name ? owner->tp_name : "?";
        const char *dot = strrchr(tn, '.');
        return PyUnicode_FromFormat("%s.%s", dot ? dot + 1 : tn, op->name);
    }
    if (strcmp(n, "__doc__") == 0) { Py_INCREF(Py_None); return Py_None; }
    if (strcmp(n, "__objclass__") == 0 && owner != NULL) { Py_INCREF((PyObject *)owner); return (PyObject *)owner; }
    if (bound && strcmp(n, "__self__") == 0) {
        PyObject *s = ((GrailMethodWrapper *)w)->self;
        Py_INCREF(s);
        return s;
    }
    PyErr_Format(PyExc_AttributeError, "'%s' object has no attribute '%s'", Py_TYPE(w)->tp_name, n);
    return NULL;
}

static void init_wrapper_types(void) {
    static int done = 0;
    if (done) return;
    done = 1;
    PyTypeObject *ts[2] = { &GrailSlotWrapper_Type, &GrailMethodWrapper_Type };
    const char *names[2] = { "wrapper_descriptor", "method-wrapper" };
    for (int i = 0; i < 2; i++) {
        ts[i]->ob_base.ob_base.ob_refcnt = 1;
        ts[i]->ob_base.ob_base.ob_type = &PyType_Type;
        ts[i]->tp_name = names[i];
        ts[i]->tp_base = &PyBaseObject_Type;
        ts[i]->tp_getattro = wrapper_getattro;
        ts[i]->tp_flags = Py_TPFLAGS_DEFAULT | Py_TPFLAGS_READY;
    }
    GrailSlotWrapper_Type.tp_basicsize = sizeof(GrailSlotWrapper);
    GrailSlotWrapper_Type.tp_call = slotwrapper_call;
    GrailSlotWrapper_Type.tp_descr_get = slotwrapper_get;
    GrailMethodWrapper_Type.tp_basicsize = sizeof(GrailMethodWrapper);
    GrailMethodWrapper_Type.tp_call = methodwrapper_call;
}

static PyObject *new_slot_wrapper(PyTypeObject *t, const ForeignOpDef *op) {
    init_wrapper_types();
    GrailSlotWrapper *w = (GrailSlotWrapper *)calloc(1, sizeof(GrailSlotWrapper));
    if (w == NULL) return PyErr_NoMemory();
    w->ob_refcnt = 1;
    w->ob_type = &GrailSlotWrapper_Type;
    w->d_type = t;
    w->op = op;
    return (PyObject *)w;
}

static PyObject *new_method_wrapper(PyObject *self, const ForeignOpDef *op) {
    init_wrapper_types();
    GrailMethodWrapper *m = (GrailMethodWrapper *)calloc(1, sizeof(GrailMethodWrapper));
    if (m == NULL) return PyErr_NoMemory();
    m->ob_refcnt = 1;
    m->ob_type = &GrailMethodWrapper_Type;
    Py_INCREF(self);
    m->self = self;
    m->op = op;
    return (PyObject *)m;
}

/* ``T.__new__'' for a wheel's type with a tp_new: CPython's tp_new_wrapper,
   which add_tp_new_wrapper puts in every such type's dict.  It takes the
   class to make first -- ``ndarray.__new__(memmap, shape, ...)'', how numpy's
   own subclasses build themselves -- checks that it is a subtype of T, and
   calls T's tp_new with it. */
static PyObject *grail_tp_new_wrapper(PyObject *self, PyObject *args, PyObject *kwds) {
    PyTypeObject *type = (PyTypeObject *)self;
    Py_ssize_t n = args ? PyTuple_Size(args) : 0;
    if (n < 1) {
        PyErr_Format(PyExc_TypeError, "%.200s.__new__(): not enough arguments", type->tp_name);
        return NULL;
    }
    PyObject *arg0 = PyTuple_GetItem(args, 0);
    if (arg0 == NULL) return NULL;
    if (Py_TYPE(arg0) != &PyType_Type && !PyType_IsSubtype(Py_TYPE(arg0), &PyType_Type)) {
        PyErr_Format(PyExc_TypeError, "%.200s.__new__(X): X is not a type object (%.200s)",
                     type->tp_name, Py_TYPE(arg0)->tp_name);
        return NULL;
    }
    PyTypeObject *subtype = (PyTypeObject *)arg0;
    if (!PyType_IsSubtype(subtype, type)) {
        PyErr_Format(PyExc_TypeError, "%.200s.__new__(%.200s): %.200s is not a subtype of %.200s",
                     type->tp_name, subtype->tp_name, subtype->tp_name, type->tp_name);
        return NULL;
    }
    if (type->tp_new == NULL) {
        PyErr_Format(PyExc_TypeError, "cannot create '%.200s' instances", subtype->tp_name);
        return NULL;
    }
    PyObject *rest = PyTuple_GetSlice(args, 1, n);
    if (rest == NULL) return NULL;
    return type->tp_new(subtype, rest, kwds);
}
static PyObject *foreign_generic_getattr(PyObject *obj, const char *name);
/* ``T.__getattribute__'' for a wheel's type: object.__getattribute__ as the
   type has it, the C walk of the instance's type -- what recarray's
   ``ndarray.__getattribute__(self, 'dtype')'' asks of a subclass instance. */
static PyObject *grail_getattribute_wrapper(PyObject *self, PyObject *args) {
    (void)self;
    if (args == NULL || PyTuple_Size(args) != 2) {
        PyErr_SetString(PyExc_TypeError, "expected 2 arguments, got another number");
        return NULL;
    }
    PyObject *obj = PyTuple_GetItem(args, 0);
    PyObject *nameObj = PyTuple_GetItem(args, 1);
    if (obj == NULL || nameObj == NULL) return NULL;
    const char *name = PyUnicode_AsUTF8(nameObj);
    if (name == NULL) return NULL;
    PyObject *v = is_foreign(obj) ? foreign_generic_getattr(obj, name)
                                  : PyObject_GetAttrString(obj, name);
    if (v == NULL && !PyErr_Occurred())
        PyErr_Format(PyExc_AttributeError, "'%.100s' object has no attribute '%.200s'",
                     Py_TYPE(obj)->tp_name, name);
    return v;
}
static PyMethodDef grail_getattribute_def = {
    "__getattribute__", (PyCFunction)(void (*)(void))grail_getattribute_wrapper, METH_VARARGS,
    "Return getattr(self, name)."
};

/* ``d.__get__(obj, type=None)'' / ``d.__set__(obj, value)'' on a C object
   whose type has tp_descr_get / tp_descr_set: CPython's method-wrappers for
   those slots.  numpy asks ``hasattr(T.dtype, '__get__')'' of the dtype
   attribute of a void subclass -- numpy.record's is void's getset -- to tell
   a class property from a bad dtype, and refused np.dtype(np.record). */
static PyObject *grail_descr_get_wrapper(PyObject *self, PyObject *args) {
    Py_ssize_t n = args ? PyTuple_Size(args) : 0;
    if (n < 1 || n > 2) {
        PyErr_SetString(PyExc_TypeError, "__get__(None, None) is invalid");
        return NULL;
    }
    PyObject *obj = PyTuple_GetItem(args, 0);
    PyObject *type = n > 1 ? PyTuple_GetItem(args, 1) : NULL;
    if (obj == Py_None) obj = NULL;
    if (type == Py_None) type = NULL;
    if (obj == NULL && type == NULL) {
        PyErr_SetString(PyExc_TypeError, "__get__(None, None) is invalid");
        return NULL;
    }
    return Py_TYPE(self)->tp_descr_get(self, obj, type);
}
static PyObject *grail_descr_set_wrapper(PyObject *self, PyObject *args) {
    if (args == NULL || PyTuple_Size(args) != 2) {
        PyErr_SetString(PyExc_TypeError, "expected 2 arguments");
        return NULL;
    }
    if (Py_TYPE(self)->tp_descr_set(self, PyTuple_GetItem(args, 0), PyTuple_GetItem(args, 1)) < 0)
        return NULL;
    Py_RETURN_NONE;
}
static PyMethodDef grail_descr_get_def = {
    "__get__", (PyCFunction)(void (*)(void))grail_descr_get_wrapper, METH_VARARGS,
    "Return an attribute of instance, which is of type owner."
};
static PyMethodDef grail_descr_set_def = {
    "__set__", (PyCFunction)(void (*)(void))grail_descr_set_wrapper, METH_VARARGS,
    "Set an attribute of instance to value."
};

static PyMethodDef grail_tp_new_def = {
    "__new__", (PyCFunction)(void (*)(void))grail_tp_new_wrapper, METH_VARARGS | METH_KEYWORDS,
    "Create and return a new object.  See help(type) for accurate signature."
};

/* One of the shim's static builtin types, which cross into Grail as the
   Grail class of that name (foreign_proxy_oop). */
static int is_builtin_static_type(PyTypeObject *t) {
    PyTypeObject *const statics[] = { &PyType_Type, &PyBaseObject_Type, &PyFloat_Type,
        &PyLong_Type, &PyBool_Type, &PyUnicode_Type, &PyBytes_Type, &PyList_Type,
        &PyDict_Type, &PyTuple_Type, &_PyNone_Type };
    for (size_t i = 0; i < sizeof(statics) / sizeof(statics[0]); i++)
        if (t == statics[i]) return 1;
    return 0;
}

extern "C" PyObject *PyMethod_New(PyObject *func, PyObject *self);   /* shim_numpy.cc */
/* A C type's own names, as its __dict__ has them in CPython: its tp_dict
   (what Cython and cache_type_descr put there) and what PyType_Ready would
   have added from the method, member and getset tables.  Each name once,
   appended to the list ``into''. */
static void foreign_type_own_names(PyTypeObject *t, PyObject *into) {
    PyObject *seen = PyDict_New();
    if (seen == NULL) { PyErr_Clear(); return; }
#define GRAIL_ADD_NAME(n) do { \
        if (PyDict_GetItemString(seen, (n)) == NULL) { \
            PyObject *s_ = PyUnicode_FromString(n); \
            if (s_ != NULL) { PyList_Append(into, s_); PyDict_SetItemString(seen, (n), Py_None); } \
        } } while (0)
    if (t->tp_dict != NULL) {
        PyObject *keys = PyDict_Keys(t->tp_dict);
        for (Py_ssize_t i = 0; keys != NULL && i < PyList_Size(keys); i++) {
            const char *k = PyUnicode_AsUTF8(PyList_GetItem(keys, i));
            if (k != NULL) GRAIL_ADD_NAME(k);
        }
        Py_XDECREF(keys);
    }
    for (PyMethodDef *m = t->tp_methods; m && m->ml_name; m++) GRAIL_ADD_NAME(m->ml_name);
    for (PyMemberDef *m = t->tp_members; m && m->name; m++)
        if (m->name[0] != '_' || m->name[1] != '_' || strstr(m->name, "offset__") == NULL)
            GRAIL_ADD_NAME(m->name);
    for (PyGetSetDef *g = t->tp_getset; g && g->name; g++) GRAIL_ADD_NAME(g->name);
#undef GRAIL_ADD_NAME
    Py_DECREF(seen);
    PyErr_Clear();
}

/* ``T.__doc__'' as CPython's type_get_doc answers it: the type's own
   __doc__ entry, else its tp_doc with any Argument Clinic signature left
   out, else None.  Its own only -- a type's doc is not inherited. */
extern "C" PyObject *_grail_doc_from_internal_doc(const char *name, const char *doc);
static PyObject *foreign_type_doc(PyTypeObject *t) {
    if (t->tp_dict != NULL) {
        PyObject *v = PyDict_GetItemString(t->tp_dict, "__doc__");
        if (v != NULL) return Py_NewRef(v);
    }
    return _grail_doc_from_internal_doc(t->tp_name, t->tp_doc);
}

/* ``T.__dict__'': a read-only view of the type's own entries, each the
   object ``T.name'' answers (a method or member descriptor, a getset, a
   value), plus __doc__.  It was a miss, so vars(T) listed the proxy's
   Smalltalk instance variables and inspect saw no methods. */
static PyObject *foreign_type_dict(PyTypeObject *t) {
    PyObject *names = PyList_New(0);
    PyObject *d = PyDict_New();
    if (names == NULL || d == NULL) { Py_XDECREF(names); Py_XDECREF(d); return NULL; }
    foreign_type_own_names(t, names);
    for (Py_ssize_t i = 0; i < PyList_Size(names); i++) {
        PyObject *n = PyList_GetItem(names, i);
        const char *k = PyUnicode_AsUTF8(n);
        if (k == NULL) continue;
        PyObject *v = t->tp_dict != NULL ? PyDict_GetItemString(t->tp_dict, k) : NULL;
        if (v != NULL) Py_INCREF(v);
        else v = foreign_generic_getattr((PyObject *)t, k);
        if (v == NULL) { PyErr_Clear(); continue; }
        PyDict_SetItem(d, n, v);
        Py_DECREF(v);
    }
    Py_DECREF(names);
    if (PyDict_GetItemString(d, "__doc__") == NULL) {
        PyObject *doc = foreign_type_doc(t);
        if (doc != NULL) { PyDict_SetItemString(d, "__doc__", doc); Py_DECREF(doc); }
    }
    PyErr_Clear();
    PyObject *proxy = PyDictProxy_New(d);
    Py_DECREF(d);
    return proxy;
}

/* ``repr(T)'' of a C type, as CPython's type_repr writes it: <class
   'module.qualname'>, the module left out when it is builtins.  The
   module is the type's __module__ entry, else tp_name before its last
   dot; the name is what follows the dot. */
static PyObject *foreign_type_repr(PyTypeObject *t) {
    const char *tn = t->tp_name ? t->tp_name : "?";
    const char *dot = strrchr(tn, '.');
    const char *qual = dot ? dot + 1 : tn;
    PyObject *mod = t->tp_dict != NULL ? PyDict_GetItemString(t->tp_dict, "__module__") : NULL;
    const char *m = mod != NULL && PyUnicode_Check(mod) ? PyUnicode_AsUTF8(mod) : NULL;
    if (m != NULL && strcmp(m, "builtins") != 0)
        return PyUnicode_FromFormat("<class '%s.%s'>", m, qual);
    if (m == NULL && dot != NULL) {
        char buf[512];
        snprintf(buf, sizeof(buf), "<class '%.*s.%s'>", (int)(dot - tn), tn, qual);
        return PyUnicode_FromString(buf);
    }
    return PyUnicode_FromFormat("<class '%s'>", qual);
}

static PyObject *foreign_generic_getattr(PyObject *obj, const char *name) {
    int is_type = is_foreign_type(obj);
    PyTypeObject *start = is_type ? (PyTypeObject *)obj : obj->ob_type;
    /* The instance dict comes after a data descriptor and before everything
       else on the type, as in CPython's PyObject_GenericGetAttr. */
    if (!is_type) {
        PyObject *d = foreign_instance_dict(obj, 0);
        if (d != NULL && !foreign_has_data_descr(start, name)) {
            PyObject *iv = PyDict_GetItemString(d, name);
            if (iv != NULL) { Py_INCREF(iv); return iv; }
        }
    }
    /* On a TYPE, a data descriptor of its metatype comes first, as in
       CPython's type_getattro: a getset or member of a wheel's own metatype,
       read with the type as its instance.  numpy's _DTypeMeta gives every
       DType class ``_legacy'', ``_abstract'' and ``type'' this way, and
       dtype.name reads ``type(dtype)._legacy'' -- so str(dtype) and
       repr(dtype) failed. */
    if (is_type) {
        for (PyTypeObject *m = obj->ob_type; m != NULL && m != &PyType_Type
                && plausible_pyobj((PyObject *)m); m = m->tp_base) {
            for (PyGetSetDef *gs = m->tp_getset; gs && gs->name; gs++) {
                if (strcmp(gs->name, name) != 0 || gs->get == NULL) continue;
                return gs->get(obj, gs->closure);
            }
            for (PyMemberDef *mb = m->tp_members; mb && mb->name; mb++)
                if (strcmp(mb->name, name) == 0) return PyMember_GetOne((const char *)obj, mb);
        }
    }
    /* type's own members, read off the struct as CPython's type_members do:
       numpy's add_newdoc tests ``obj.__flags__ & Py_TPFLAGS_HEAPTYPE'' of
       every type it documents. */
    if (is_type) {
        PyTypeObject *t = (PyTypeObject *)obj;
        if (strcmp(name, "__flags__") == 0) return PyLong_FromUnsignedLong(t->tp_flags);
        if (strcmp(name, "__basicsize__") == 0) return PyLong_FromSsize_t(t->tp_basicsize);
        if (strcmp(name, "__itemsize__") == 0) return PyLong_FromSsize_t(t->tp_itemsize);
        if (strcmp(name, "__dictoffset__") == 0) return PyLong_FromSsize_t(t->tp_dictoffset);
        if (strcmp(name, "__weakrefoffset__") == 0) return PyLong_FromSsize_t(t->tp_weaklistoffset);
        /* The tuples PyType_Ready builds (grail_set_mro). */
        if (strcmp(name, "__base__") == 0)
            return Py_NewRef(t->tp_base != NULL ? (PyObject *)t->tp_base : Py_None);
        if (strcmp(name, "__bases__") == 0 && t->tp_bases != NULL) return Py_NewRef(t->tp_bases);
        if (strcmp(name, "__mro__") == 0 && t->tp_mro != NULL) return Py_NewRef(t->tp_mro);
        if (strcmp(name, "__doc__") == 0) return foreign_type_doc(t);
        if (strcmp(name, "__dict__") == 0) return foreign_type_dict(t);
    }
    PyObject *v = foreign_type_dict_lookup(start, name);
    /* A descriptor found in the type's dict binds to an instance, as in
       CPython's PyObject_GenericGetAttr.  A type read caches one there
       (cache_type_descr: ``dtype.char'' read for its docstring), and the next
       read off an INSTANCE -- ``dtype('int8').char'' -- answered the member
       descriptor itself, not the character. */
    if (v != NULL && !is_type && Py_TYPE(v) != NULL && plausible_pyobj(Py_TYPE(v))
            && Py_TYPE(v)->tp_descr_get != NULL)
        return Py_TYPE(v)->tp_descr_get(v, obj, (PyObject *)start);
    /* A GRAIL function in a C type's dict binds too, as a function's __get__
       does: Cython 3.3 keeps a cdef class's methods there as functions, and
       ``ss.generate_state(2)'' called the unbound function ("takes at least
       1 positional argument (0 given)").  Through types.MethodType, which is
       what PyMethod_New is. */
    if (v != NULL && !is_type && !is_foreign(v) && Py_TYPE(v) != NULL
            && Py_TYPE(v)->tp_name != NULL && strcmp(Py_TYPE(v)->tp_name, "function") == 0) {
        PyObject *bound = PyMethod_New(v, obj);
        Py_DECREF(v);
        return bound;
    }
    if (v != NULL) return v;
    for (PyTypeObject *t = start; t != NULL; t = t->tp_base) {
        for (PyMethodDef *ml = t->tp_methods; ml && ml->ml_name; ml++) {
            if (strcmp(ml->ml_name, name) != 0) continue;
            if (ml->ml_flags & METH_STATIC)
                return PyCMethod_New(ml, NULL, NULL, t);
            if (ml->ml_flags & METH_CLASS)
                return PyCMethod_New(ml, (PyObject *)start, NULL, t);
            /* An instance method read off the class: its descriptor. */
            if (is_type) return cache_type_descr(t, name, PyDescr_NewMethod(t, ml));
            return PyCMethod_New(ml, obj, NULL, t);
        }
        for (PyGetSetDef *gs = t->tp_getset; gs && gs->name; gs++) {
            if (strcmp(gs->name, name) != 0) continue;
            if (is_type) return cache_type_descr(t, name, PyDescr_NewGetSet(t, gs));
            if (gs->get) return gs->get(obj, gs->closure);
        }
        /* A struct field (tp_members): its value off an instance, its member
           descriptor off the type (numpy documents ``flatiter.base''). */
        for (PyMemberDef *m = t->tp_members; m && m->name; m++) {
            if (strcmp(m->name, name) != 0) continue;
            if (is_type) return cache_type_descr(t, name, PyDescr_NewMember(t, m));
            return PyMember_GetOne((const char *)obj, m);
        }
    }
    /* ``T.__new__'', on T itself only: its tp_new_wrapper, kept in T's dict
       as CPython keeps it, so every read answers the same object. */
    if (is_type && strcmp(name, "__new__") == 0 && start->tp_new != NULL)
        return cache_type_descr(start, name, PyCMethod_New(&grail_tp_new_def, obj, NULL, NULL));
    if (!is_type && strcmp(name, "__get__") == 0 && start->tp_descr_get != NULL)
        return PyCMethod_New(&grail_descr_get_def, obj, NULL, NULL);
    if (!is_type && strcmp(name, "__set__") == 0 && start->tp_descr_set != NULL)
        return PyCMethod_New(&grail_descr_set_def, obj, NULL, NULL);
    if (is_type && strcmp(name, "__getattribute__") == 0)
        return cache_type_descr(start, name, PyCMethod_New(&grail_getattribute_def, obj, NULL, NULL));
    /* An operator dunder the type implements as a slot: its slot wrapper. */
    const ForeignOpDef *op = foreign_op_named(name);
    if (op != NULL && foreign_op_present(start, op)) {
        if (is_type) return cache_type_descr(start, name, new_slot_wrapper(start, op));
        return new_method_wrapper(obj, op);
    }
    /* PAST THE C CHAIN, GRAIL'S.  A wheel's type whose tp_base chain reaches
       one of the shim's builtin types -- object, for every cdef class --
       inherits that class's attributes, as CPython's MRO ends in object:
       Cython's __Pyx_setup_reduce reads ``T.__reduce_ex__'' off every cdef
       class and failed with "foreign object has no attribute".  Types only:
       object's methods bound to a C instance are not this.  NOT type's own
       data descriptors, which CPython's type_getattro reads off the METATYPE
       before the MRO: object's __name__ answered for every DType class, and
       numpy.dtypes._add_dtype_helper filed them all under 'object'. */
    static const char *const type_data_descrs[] = {
        "__abstractmethods__", "__annotate__", "__annotations__", "__base__", "__bases__",
        "__basicsize__", "__dict__", "__dictoffset__", "__doc__", "__flags__",
        "__itemsize__", "__module__", "__mro__", "__name__", "__qualname__",
        "__text_signature__", "__type_params__", "__weakrefoffset__",
        /* and type's methods that object would answer bound to itself:
           the proxy answers these (ShimForeignObject>>mro). */
        "mro", "__subclasses__" };
    for (size_t i = 0; is_type && i < sizeof(type_data_descrs) / sizeof(type_data_descrs[0]); i++)
        if (strcmp(name, type_data_descrs[i]) == 0) return NULL;
    if (is_type) {
        for (PyTypeObject *t = start->tp_base; t != NULL && plausible_pyobj((PyObject *)t); t = t->tp_base) {
            if (!is_builtin_static_type(t)) continue;
            PyObject *v = PyObject_GetAttrString((PyObject *)t, name);
            if (v == NULL) PyErr_Clear();
            return v;
        }
    }
    return NULL;
}

/* Everything C can answer about a wheel's object, before Grail is asked:
   the object's own tp_getattro (not the shim_numpy.cc GenericGetAttr stub),
   then the generic walk.  Shared by PyObject_GetAttrString (a C caller) and
   the shimForeignGetAttr user action (a Grail caller). */
/* object.__getattribute__ as C calls it -- the generic walk, NOT the type's
   tp_getattro, which commonly falls back to this function: going through
   PyObject_GetAttr here would call that tp_getattro again and recurse.  A
   Grail object's attributes are Grail's.  It was a shim_numpy.cc stub that
   answered NULL with no error. */
extern "C" PyObject *PyObject_GenericGetAttr(PyObject *obj, PyObject *name) {
    const char *s = PyUnicode_AsUTF8(name);
    if (s == NULL) return NULL;
    if (!is_foreign(obj)) return PyObject_GetAttrString(obj, s);
    PyObject *v = foreign_generic_getattr(obj, s);
    if (v != NULL || PyErr_Occurred()) return v;
    PyErr_Format(PyExc_AttributeError, "'%.100s' object has no attribute '%.200s'",
                 Py_TYPE(obj)->tp_name, s);
    return NULL;
}

static PyObject *foreign_getattr_c(PyObject *obj, const char *name) {
    PyTypeObject *mt = obj->ob_type;
    if (!is_foreign_type(obj) && mt != NULL && mt->tp_getattro != NULL
            && mt->tp_getattro != PyObject_GenericGetAttr) {
        PyObject *n = PyUnicode_FromString(name);
        if (n == NULL) return NULL;
        return mt->tp_getattro(obj, n);
    }
    return foreign_generic_getattr(obj, name);
}

extern "C" PyObject *PyObject_GetAttrString(PyObject *obj, const char *name) {
    CHECK_pyObj(obj, "PyObject_GetAttrString obj");
    diag_tick(&g_diag_getattr);
    if (is_shim_module(obj)) return shim_module_getattr(obj, name);
    /* A subtype mirror -- the C type of ``class memmap(ndarray)'': its Python
       classes, then the base type, read in C (see subtype_python_attr). */
    if (is_type_mirror(obj) && is_subtype_mirror((PyTypeObject *)obj)) {
        int found;
        PyObject *v = subtype_python_attr(pyobj_oop(obj), name, &found);
        if (found) return v;
        v = foreign_generic_getattr((PyObject *)subtype_real_base((PyTypeObject *)obj), name);
        if (v == NULL && !PyErr_Occurred())
            PyErr_Format(PyExc_AttributeError, "type object '%.100s' has no attribute '%.200s'",
                         ((PyTypeObject *)obj)->tp_name, name);
        return v;
    }
    /* A wheel's own object: answered in C where it can be (foreign_getattr_c),
       and only a miss with no error goes on to the Grail proxy below. */
    if (is_foreign(obj)) {
        PyObject *v = foreign_getattr_c(obj, name);
        if (v != NULL || PyErr_Occurred()) return v;
    }
    OopType args[2] = { pyobj_oop(obj), GciNewString(name) };
    OopType addrOop = GciPerform(server, "PyObject_GetAttrString:name:", args, 2);
    if (check_gci_error()) return NULL;
    return addr_to_pyobj(addrOop);
}

extern "C" int PyObject_HasAttrString(PyObject *obj, const char *name) {
    CHECK_pyObj(obj, "PyObject_HasAttrString obj");
    if (is_shim_module(obj)) {
        PyObject *v = shim_module_getattr(obj, name);
        if (v == NULL) { PyErr_Clear(); return 0; }
        return 1;
    }
    OopType args[2] = { pyobj_oop(obj), GciNewString(name) };
    /* A wheel's own object: asked in C, as PyObject_GetAttrString would be.
       numpy asks ``hasattr(descr, '__get__')'' of a getset, which the
       server, sending the name as a message, answered false. */
    if (is_foreign(obj)) {
        PyObject *v = foreign_getattr_c(obj, name);
        if (v != NULL) { Py_DECREF(v); return 1; }
        if (PyErr_Occurred()) { PyErr_Clear(); return 0; }
    }
    OopType result = GciPerform(server, "PyObject_HasAttrString:name:", args, 2);
    if (check_gci_error()) return 0;
    return result == OOP_TRUE ? 1 : 0;
}

/* A foreign object (numpy scalar/dtype) stringifies through its own C
   tp_str/tp_repr slot (which builds a Grail-backed str via our PyUnicode
   ctors), not through the reverse proxy's absent Python dunders. */
extern "C" const char *_grail_raised_message(PyObject *o);   /* shim_pyo3.cc */
static void foreign_exc_text(PyObject *v, char *buf, size_t cap);

static PyObject *foreign_str(PyObject *obj, int want_repr) {
    PyTypeObject *t = obj->ob_type;
    if (t == NULL) return NULL;
    /* The shim's own raised-exception token (PyErr_GetRaisedException):
       its text is the message, as str() of the exception it stands for.
       pydantic_core formats a validator's error with str(exc), and the token
       otherwise reached Grail as a bare foreign proxy. */
    const char *raised = _grail_raised_message(obj);
    if (raised) {
        if (!want_repr) return PyUnicode_FromString(raised);
        const char *tn = t->tp_name ? t->tp_name : "Exception";
        const char *dot = strrchr(tn, '.');
        return PyUnicode_FromFormat("%s('%s')", dot ? dot + 1 : tn, raised);
    }
    /* Along the base chain: the shim's PyType_FromSpec does no slot
       inheritance, so a pyclass's tp_str may live on its base. */
    for (PyTypeObject *b = t; b != NULL; b = b->tp_base) {
        /* A type whose metatype chain reaches type with no slot of its own
           on the way: type's repr, which is also its str. */
        if (b == &PyType_Type && !b->tp_repr && !b->tp_str)
            return foreign_type_repr((PyTypeObject *)obj);
        if (want_repr) { if (b->tp_repr) return b->tp_repr(obj);
                         if (b->tp_str)  return b->tp_str(obj); }
        else           { if (b->tp_str)  return b->tp_str(obj);
                         if (b->tp_repr) return b->tp_repr(obj); }
    }
    /* An exception instance with no slot at all: str() is args[0]. */
    if (t->tp_flags & Py_TPFLAGS_BASE_EXC_SUBCLASS) {
        char buf[1024];
        foreign_exc_text(obj, buf, sizeof(buf));
        return PyUnicode_FromString(buf);
    }
    return NULL;
}

extern "C" PyObject *PyObject_Repr(PyObject *obj) {
    CHECK_pyObj(obj, "PyObject_Repr obj");
    if (is_foreign(obj)) { PyObject *r = foreign_str(obj, 1); if (r) return r; }
    OopType arg = pyobj_oop(obj);
    OopType addrOop = GciPerform(server, "PyObject_Repr:", &arg, 1);
    if (check_gci_error()) return NULL;
    return addr_to_pyobj(addrOop);
}

extern "C" PyObject *PyObject_Str(PyObject *obj) {
    CHECK_pyObj(obj, "PyObject_Str obj");
    if (is_foreign(obj)) { PyObject *r = foreign_str(obj, 0); if (r) return r; }
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

/* Structural equality of two real-layout tuples, in C.  numpy dedups ufunc
   loops with PyObject_RichCompareBool(infoA, infoB, Py_EQ) over real-layout
   tuples whose elements are foreign DType/method objects (and nested
   tuples).  Comparing them via the server would bridge each tuple to Grail
   (slow, O(n) per compare — numpy does O(n^2) of them — and it errors when
   the elements are foreign proxies).  Element equality: pointer identity,
   recursion for nested tuples, else defer to the general comparison. */
static int real_tuple_eq(PyObject *a, PyObject *b) {
    ShimTupleObject *ta = (ShimTupleObject *)a, *tb = (ShimTupleObject *)b;
    if (ta->ob_size != tb->ob_size) return 0;
    for (Py_ssize_t i = 0; i < ta->ob_size; i++) {
        PyObject *ea = ta->ob_item[i], *eb = tb->ob_item[i];
        if (ea == eb) continue;                  /* identical (singletons) */
        if (ea == NULL || eb == NULL) return 0;
        if (is_real_layout(ea) && ea->ob_type == &PyTuple_Type &&
            is_real_layout(eb) && eb->ob_type == &PyTuple_Type) {
            if (!real_tuple_eq(ea, eb)) return 0;
            continue;
        }
        /* A foreign object (numpy DType/method) is a singleton, so
           non-identical means not-equal — comparing by value would bridge to
           Grail and error.  Likewise a non-identical real-layout leaf. */
        if (is_foreign(ea) || is_foreign(eb) ||
            is_real_layout(ea) || is_real_layout(eb)) return 0;
        /* Both Grail-backed (int/str/...): value-compare via the server. */
        if (PyObject_RichCompareBool(ea, eb, Py_EQ) != 1) return 0;
    }
    return 1;
}

extern "C" int PyObject_RichCompareBool(PyObject *v, PyObject *w, int op) {
    CHECK_pyObj(v, "PyObject_RichCompareBool v");
    CHECK_pyObj(w, "PyObject_RichCompareBool w");
    /* Identity shortcut for ==/!= (matches CPython). */
    if (v == w) {
        if (op == Py_EQ) return 1;
        if (op == Py_NE) return 0;
    }
    /* ==/!= of two real-layout tuples: compare in C, no Grail bridge. */
    if ((op == Py_EQ || op == Py_NE) &&
        is_real_layout(v) && v->ob_type == &PyTuple_Type &&
        is_real_layout(w) && w->ob_type == &PyTuple_Type) {
        int eq = real_tuple_eq(v, w);
        return (op == Py_EQ) ? eq : !eq;
    }
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
/* 256, not 32: a PyO3 module (pydantic_core) sets every class, function and
   constant it exports as an attribute from its exec slot -- ~60 of them. */
#define MAX_MODULE_ATTRS 256

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

static const char *module_name_for(PyObject *module);   /* below, with module_names */

extern "C" PyObject *PyModule_GetDict(PyObject *module) {
    /* NumPy's init calls this early to get the namespace to populate.
       Return a lazily-created real (Grail-backed) dict associated with the
       module; PyDict_SetItemString into it delegates to Grail. */
    int idx = find_or_create_module_attrs(module);
    if (idx < 0) return NULL;
    if (module_attrs[idx].dict == NULL) {
        PyObject *d = PyDict_New();
        module_attrs[idx].dict = d;
        /* __name__ and __package__, as every CPython module dict has: Cython
           passes this dict as the globals of its relative imports
           (``from .bit_generator cimport ...''), and __import__ finds the
           package there -- "attempted relative import with no known parent
           package" without them.  The name is the dotted one the module was
           loaded under (shimDynLoad). */
        const char *full = d ? module_name_for(module) : NULL;
        if (full != NULL) {
            const char *dot = strrchr(full, '.');
            PyObject *n = PyUnicode_FromString(full);
            PyObject *p = dot ? PyUnicode_FromStringAndSize(full, dot - full) : PyUnicode_FromString("");
            if (n) PyDict_SetItemString(d, "__name__", n);
            if (p) PyDict_SetItemString(d, "__package__", p);
            Py_XDECREF(n); Py_XDECREF(p);
            PyErr_Clear();
        }
    }
    return module_attrs[idx].dict;
}

static int module_dict_store(PyObject *module, const char *name, PyObject *value);
extern "C" int PyModule_AddObjectRef(PyObject *module, const char *name,
                                     PyObject *value) {
    int idx = find_or_create_module_attrs(module);
    if (idx < 0) return -1;
    int ai = module_attrs[idx].attr_count;
    if (ai >= MAX_MODULE_ATTRS) return -1;
    module_attrs[idx].attrs[ai].name = name;
    module_attrs[idx].attrs[ai].type = ModuleAttr::ATTR_OBJECT;
    /* CPython's AddObjectRef ADDS a reference (only PyModule_Add steals), and
       this table keeps the value for the life of the process.  Storing it
       uncounted let the caller's own decref take the wrapper to 0 and the
       sweep free it under the table -- see import_cache_put. */
    Py_XINCREF(value);
    module_attrs[idx].attrs[ai].obj_val = value;
    module_attrs[idx].attr_count++;
    return module_dict_store(module, name, value);
}

extern "C" int PyModule_Add(PyObject *module, const char *name,
                            PyObject *value) {
    /* STEALS value, on success or failure alike, as CPython's does. */
    int r = PyModule_AddObjectRef(module, name, value);
    Py_XDECREF(value);
    return r;
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

/* Attribute access ON a module the shim loaded.

   The shim never builds a module object: the PyModuleDef is the module
   (PyModuleDef_Init stamps it PyModule_Type), and its attributes live in
   module_attrs above until shimModuleAttrs exports them to Grail.  A
   hand-written C module only ever ADDS to that table.  A PyO3 module READS
   and WRITES it from its exec slot through the generic protocol --
   ``getattr(m, "__all__")'' (expecting AttributeError the first time), then
   ``setattr(m, name, value)'' per export.  Sent to Grail, those reached the
   def as a foreign proxy, which has no attributes to give and none to take.
   So a module is answered here, from the same table. */
static int is_shim_module(PyObject *obj) {
    return obj != NULL && obj->ob_type == &PyModule_Type;
}

static PyObject *shim_module_getattr(PyObject *module, const char *name) {
    PyModuleDef *def = (PyModuleDef *)module;
    if (strcmp(name, "__name__") == 0)
        return PyUnicode_FromString(def->m_name ? def->m_name : "?");
    if (strcmp(name, "__dict__") == 0)
        return PyModule_GetDict(module);
    int idx = find_or_create_module_attrs(module);
    if (idx >= 0) {
        /* Latest binding wins, as for a rebinding in a real namespace. */
        for (int i = module_attrs[idx].attr_count - 1; i >= 0; i--) {
            ModuleAttr *a = &module_attrs[idx].attrs[i];
            if (strcmp(a->name, name) != 0) continue;
            switch (a->type) {
            case ModuleAttr::ATTR_INT:    return PyLong_FromLong(a->int_val);
            case ModuleAttr::ATTR_STRING: return PyUnicode_FromString(a->str_val);
            case ModuleAttr::ATTR_OBJECT: Py_XINCREF(a->obj_val); return a->obj_val;
            }
        }
        /* ...then the module's __dict__, which in CPython IS the namespace.
           numpy's generated InitOperators stores every ufunc with
           PyDict_SetItemString(PyModule_GetDict(m), ...), and
           init_real_imag_ufuncs then reads ``imag'' back off the module:
           without this it was an AttributeError and module exec failed. */
        if (module_attrs[idx].dict != NULL) {
            PyObject *v = PyDict_GetItemString(module_attrs[idx].dict, name);
            if (v != NULL) { Py_INCREF(v); return v; }
            if (PyErr_Occurred()) return NULL;
        }
    }
    PyErr_Format(PyExc_AttributeError, "module '%s' has no attribute '%s'",
                 def->m_name ? def->m_name : "?", name);
    return NULL;
}

/* The module's __dict__ holds what is stored on it, as in CPython, where
   the dict IS the namespace: Cython reads its globals -- the types it set
   with PyObject_SetAttr, and ``__pyx_capi__'', which it looks for there
   before it makes a new one -- from PyModule_GetDict.  Kept in the table too,
   for the readers of that. */
static int module_dict_store(PyObject *module, const char *name, PyObject *value) {
    PyObject *d = PyModule_GetDict(module);
    return (d == NULL || value == NULL) ? 0 : PyDict_SetItemString(d, name, value);
}

static int shim_module_setattr(PyObject *module, const char *name, PyObject *value) {
    int idx = find_or_create_module_attrs(module);
    if (idx < 0) return -1;
    if (module_dict_store(module, name, value) < 0) return -1;
    for (int i = 0; i < module_attrs[idx].attr_count; i++) {
        ModuleAttr *a = &module_attrs[idx].attrs[i];
        if (strcmp(a->name, name) == 0) {
            a->type = ModuleAttr::ATTR_OBJECT;
            a->obj_val = value;
            return 0;
        }
    }
    if (module_attrs[idx].attr_count >= MAX_MODULE_ATTRS) {
        PyErr_Format(PyExc_SystemError, "module '%s': more than %d attributes",
                     ((PyModuleDef *)module)->m_name, MAX_MODULE_ATTRS);
        return -1;
    }
    /* The caller's name is typically a transient UTF-8 buffer (PyO3 passes
       PyUnicode_AsUTF8 of its own str), so the table keeps a copy. */
    return PyModule_AddObjectRef(module, strdup(name), value);
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
    return (unsigned long)oopToLongWithIndex(int_conv_oop(obj));
}

extern "C" int PyIndex_Check(PyObject *obj) {
    return PyLong_Check(obj);
}

extern "C" PyObject *PyNumber_Index(PyObject *obj) {
    if (PyLong_Check(obj)) {
        Py_INCREF(obj);
        return obj;
    }
    /* A foreign object (numpy scalar) supplies an exact int via its own
       nb_index slot. */
    if (is_foreign(obj) && Py_TYPE(obj) && Py_TYPE(obj)->tp_as_number &&
        Py_TYPE(obj)->tp_as_number->nb_index) {
        return Py_TYPE(obj)->tp_as_number->nb_index(obj);
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
    if (refuse_unusable_oop(oop, "get_ucs4_for_string", op)) return -1;

    /* Check cache */
    for (int i = 0; i < ucs4_cache_count; i++) {
        if (ucs4_cache[i].oop == oop) {
            *data_out = ucs4_cache[i].data;
            *length_out = ucs4_cache[i].length;
            return 0;
        }
    }

    /* Fetch the content as UTF-8 via GemStone's own encoder
       (CharacterCollection>>encodeAsUTF8 -> a Utf8 byte object).  Raw
       GciFetchBytes_ bytes are only UTF-8-compatible for 7-bit content:
       String / ISOLatin store latin-1 code points ('\xe4' is the single
       byte 0xE4, an invalid UTF-8 lead that mis-decoded by swallowing
       its neighbors), and DoubleByteString stores UTF-16 units (whose
       0x00 high bytes masquerade as NULs).  This mis-decode scrambled
       every SRE span on non-ASCII subjects -- CPython test_textwrap's
       umlaut / no-break-space wraps split mid-word. */
    GciErrSType encErr; GciErr(&encErr);    /* drop any stale error first */
    OopType fetchOop = GciPerform(oop, "encodeAsUTF8", NULL, 0);
    if (probe_failed_for_real("encodeAsUTF8")) return -1;
    if (fetchOop == OOP_NIL || fetchOop == OOP_ILLEGAL)
        fetchOop = oop;                     /* fall back to raw bytes */
    int64 byte_len = GciFetchSize_(fetchOop);
    char *utf8 = (char *)malloc((size_t)(byte_len + 1));
    if (!utf8) return -1;
    GciFetchBytes_(fetchOop, 1, (ByteType *)utf8, byte_len);
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
    OopType r = GciPerform(server, "PySequence_GetItem:at:", args, 2);
    if (check_gci_error()) return NULL;
    return addr_to_pyobj(r);
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

/* One of the shim's own static builtin types (int, str, bytes, ...), with no
   tp_new of its own: it crosses into Grail as the Grail class of that name
   (foreign_proxy_oop), so a call is the class's.  call_foreign found no tp_new
   on PyLong_Type and answered "foreign object of type 'type' is not callable",
   so a C call of builtins.int, bytes, str or memoryview failed.  bytes and str
   have a tp_new now, for a wheel's subtype, and their own call still goes to
   Grail.  float has a tp_new (float_tp_new) and keeps it; so do the exception types (exc_tp_new,
   which a wheel's exception pyclass builds on). */
static int is_grail_class_type(PyObject *callable) {
    PyTypeObject *t = (PyTypeObject *)callable;
    if (callable->ob_type != &PyType_Type) return 0;
    if (t->tp_new != NULL && t->tp_new != bytes_tp_new && t->tp_new != unicode_tp_new)
        return 0;
    PyTypeObject *const statics[] = { &PyType_Type, &PyBaseObject_Type, &PyLong_Type,
        &PyBool_Type, &PyUnicode_Type, &PyBytes_Type, &PyList_Type, &PyDict_Type,
        &PyTuple_Type };
    for (size_t i = 0; i < sizeof(statics) / sizeof(statics[0]); i++)
        if (t == statics[i]) return 1;
    return 0;
}

/* The exception CLASS a static shim exception type stands for, as Grail
   names it (ValueError, OSError, ...), or NULL for any other type -- a
   wheel's own exception pyclass among them. */
extern "C" const char *_grail_static_exc_name(PyObject *type) {
    if (type == NULL || type->ob_type != &PyType_Type) return NULL;
    if (!(((PyTypeObject *)type)->tp_flags & Py_TPFLAGS_BASE_EXC_SUBCLASS)) return NULL;
    if (((PyTypeObject *)type)->tp_new != exc_tp_new) return NULL;
    return name_for_exc_type(type);
}

/* Call a foreign callable — a prebuilt wheel's own object — in C, instead
   of delegating to the Grail server (where the proxy isn't callable).  Used
   when numpy instantiates a DType, e.g. PyObject_Call(StringDType, ()).
   Args are converted to a real-layout tuple so the wheel's C can struct-
   access them. */
extern "C" PyObject *PyVectorcall_Call(PyObject *callable, PyObject *tuple, PyObject *kwargs);   /* below */
static PyObject *call_foreign(PyObject *callable, PyObject *args,
                              PyObject *kwargs) {
    PyTypeObject *mt = callable->ob_type;
    PyObject *real_args = to_real_tuple(args);
    /* A VECTORCALL type is called through its vectorcall entry, as CPython's
       PyObject_Call does (_PyVectorcall_Call): the keywords travel as a
       kwnames tuple, never as the dict.  Cython's cyfunction tp_call sizes
       a keyword dict with the INLINE PyDict_GET_SIZE (ma_used, offset 16),
       which on a Grail dict read the OOP -- a keyword call crashed and a
       positional one answered NULL with no error. */
    if (mt && (mt->tp_flags & Py_TPFLAGS_HAVE_VECTORCALL) && mt->tp_vectorcall_offset > 0
            && *(vectorcallfunc *)((char *)callable + mt->tp_vectorcall_offset) != NULL)
        return PyVectorcall_Call(callable, real_args, kwargs);
    /* A defined tp_call on the (meta)type handles general callables. */
    if (mt && mt->tp_call)
        return mt->tp_call(callable, real_args, kwargs);
    /* callable is itself a type (its metatype is type or a metaclass) →
       emulate type_call: tp_new then tp_init.  The shim's PyType_Ready does
       no slot inheritance, so a metaclass like numpy._DTypeMeta has a NULL
       tp_call even though it subclasses type — hence this fallback. */
    if (mt && (mt == &PyType_Type || PyType_IsSubtype(mt, &PyType_Type))) {
        PyTypeObject *t = (PyTypeObject *)callable;
        if (t->tp_new == NULL) {
            PyErr_Format(PyExc_TypeError, "cannot create '%.200s' instances", t->tp_name);
            return NULL;
        }
        if (t->tp_new) {
            PyObject *obj = t->tp_new(t, real_args, kwargs);
            if (obj && t->tp_init && t->tp_init(obj, real_args, kwargs) < 0)
                return NULL;
            return obj;
        }
    }
    PyErr_Format(PyExc_TypeError,
                 "foreign object of type '%s' is not callable in the Grail shim",
                 (mt && mt->tp_name) ? mt->tp_name : "?");
    return NULL;
}

extern "C" PyObject *PyObject_Call(PyObject *callable, PyObject *args,
                                    PyObject *kwargs) {
    diag_tick(&g_diag_call);
    if (callable == NULL || args == NULL) {
      return NULL;
    }
    if (is_foreign(callable) && !is_grail_class_type(callable))
        return call_foreign(callable, args, kwargs);
    /* Grail-backed callable: delegate to the server.  Keywords used to be
       dropped here ("not yet wired") -- a C caller's f(x, key=v) ran as f(x),
       silently.  PyO3 calls back into Python (pydantic's validators) this way. */
    OopType result;
    if (kwargs != NULL && PyDict_Size(kwargs) > 0) {
        OopType cargs[3] = { pyobj_oop(callable), pyobj_oop(args), pyobj_oop(kwargs) };
        result = GciPerform(server, "PyObject_Call:args:kwargs:", cargs, 3);
    } else {
        OopType cargs[2] = { pyobj_oop(callable), args ? pyobj_oop(args) : OOP_NIL };
        result = GciPerform(server, "PyObject_Call:args:", cargs, 2);
    }
    if (check_gci_error()) return NULL;
    return addr_to_pyobj(result);
}

/* callable(*args) in Grail, whatever it is in C: the server half of
   PyObject_Call.  For one of the shim's static exception types, whose C call
   runs exc_tp_new and builds a C-level exception, this builds the Grail
   exception of that class (shim_numpy.cc, grail_new_exception). */
extern "C" PyObject *_grail_call_in_grail(PyObject *callable, PyObject *args) {
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
    if (is_shim_module(obj)) return shim_module_setattr(obj, name, value);
    if (is_foreign_type(obj)) {
        PyTypeObject *t = (PyTypeObject *)obj;
        if (t->tp_dict == NULL && (t->tp_dict = PyDict_New()) == NULL) return -1;
        return PyDict_SetItemString(t->tp_dict, name, value);
    }
    /* A wheel's own instance has no OOP to store on: its descriptor, its
       tp_setattro or its instance dict (foreign_setattr). */
    if (is_foreign(obj)) return foreign_setattr(obj, name, value);
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
    /* A wheel's own object is callable when its type has a tp_call, as in
       CPython -- its Grail proxy answers no to everything, and numpy's
       _PyArray_SetNumericOps returns -1 with no error set when a ufunc
       (whose type is numpy's own PyUFunc_Type) is refused here.  A wheel's
       TYPE object is called through the shim's type_call emulation
       (call_foreign), so it is callable whatever its metatype says. */
    if (is_foreign(obj)) {
        if (is_foreign_type(obj)) return 1;
        for (PyTypeObject *b = t; b != NULL; b = b->tp_base)
            if (b->tp_call != NULL) return 1;
        return 0;
    }
    /* Anything else: ask the server. */
    OopType arg = pyobj_oop(obj);
    OopType result = GciPerform(server, "PyCallable_Check:", &arg, 1);
    if (check_gci_error()) return 0;
    return result == OOP_TRUE ? 1 : 0;
}

/* --- Number protocol (binary / unary operators) ---

   Python's operator semantics -- NotImplemented, the reflected operand, int
   arbitrary precision -- live on the Grail side, so each operator is the
   ``operator'' module's function of the same meaning
   (CPythonShim>>PyNumber_Op:a:b:c:n:).  They were all stubs answering NULL
   with NO error set, so a wheel that used one died: PyO3's abi3 build
   extracts a 128-bit integer with PyNumber_Rshift / PyNumber_And, and
   pydantic_core serialising a UUID to JSON took the gem down
   (docs/Support_Pydantic.md, Phase 6). */
static PyObject *number_op(const char *op, int n, PyObject *a, PyObject *b, PyObject *c) {
    if (a == NULL || (n >= 2 && b == NULL)) {
        PyErr_SetString(PyExc_SystemError, "NULL operand to a number operation");
        return NULL;
    }
    OopType args[5] = { GciNewString(op), pyobj_oop(a),
                        n >= 2 ? pyobj_oop(b) : OOP_NIL,
                        n >= 3 ? pyobj_oop(c) : OOP_NIL,
                        GciI64ToOop(n) };
    OopType r = GciPerform(server, "PyNumber_Op:a:b:c:n:", args, 5);
    if (check_gci_error()) return NULL;
    return addr_to_pyobj(r);
}
extern "C" PyObject *PyNumber_Add(PyObject *a, PyObject *b)         { return number_op("add", 2, a, b, NULL); }
extern "C" PyObject *PyNumber_Subtract(PyObject *a, PyObject *b)    { return number_op("sub", 2, a, b, NULL); }
extern "C" PyObject *PyNumber_Multiply(PyObject *a, PyObject *b)    { return number_op("mul", 2, a, b, NULL); }
extern "C" PyObject *PyNumber_FloorDivide(PyObject *a, PyObject *b) { return number_op("floordiv", 2, a, b, NULL); }
extern "C" PyObject *PyNumber_TrueDivide(PyObject *a, PyObject *b)  { return number_op("truediv", 2, a, b, NULL); }
extern "C" PyObject *PyNumber_Remainder(PyObject *a, PyObject *b)   { return number_op("mod", 2, a, b, NULL); }
extern "C" PyObject *PyNumber_Divmod(PyObject *a, PyObject *b)      { return number_op("divmod", 2, a, b, NULL); }
extern "C" PyObject *PyNumber_Lshift(PyObject *a, PyObject *b)      { return number_op("lshift", 2, a, b, NULL); }
extern "C" PyObject *PyNumber_Rshift(PyObject *a, PyObject *b)      { return number_op("rshift", 2, a, b, NULL); }
extern "C" PyObject *PyNumber_And(PyObject *a, PyObject *b)         { return number_op("and_", 2, a, b, NULL); }
extern "C" PyObject *PyNumber_Or(PyObject *a, PyObject *b)          { return number_op("or_", 2, a, b, NULL); }
extern "C" PyObject *PyNumber_Xor(PyObject *a, PyObject *b)         { return number_op("xor", 2, a, b, NULL); }
extern "C" PyObject *PyNumber_Power(PyObject *a, PyObject *b, PyObject *c) {
    return (c == NULL || c == Py_None) ? number_op("pow", 2, a, b, NULL)
                                       : number_op("pow", 3, a, b, c);
}
extern "C" PyObject *PyNumber_MatrixMultiply(PyObject *a, PyObject *b) { return number_op("matmul", 2, a, b, NULL); }
/* The augmented assignments: operator's i-functions, which try __iadd__ and
   friends and fall back to the binary form, as CPython's in-place slots do.
   Cython's ``x += y'' on objects compiles to these. */
extern "C" PyObject *PyNumber_InPlaceAdd(PyObject *a, PyObject *b)         { return number_op("iadd", 2, a, b, NULL); }
extern "C" PyObject *PyNumber_InPlaceSubtract(PyObject *a, PyObject *b)    { return number_op("isub", 2, a, b, NULL); }
extern "C" PyObject *PyNumber_InPlaceMultiply(PyObject *a, PyObject *b)    { return number_op("imul", 2, a, b, NULL); }
extern "C" PyObject *PyNumber_InPlaceFloorDivide(PyObject *a, PyObject *b) { return number_op("ifloordiv", 2, a, b, NULL); }
extern "C" PyObject *PyNumber_InPlaceTrueDivide(PyObject *a, PyObject *b)  { return number_op("itruediv", 2, a, b, NULL); }
extern "C" PyObject *PyNumber_InPlaceRemainder(PyObject *a, PyObject *b)   { return number_op("imod", 2, a, b, NULL); }
extern "C" PyObject *PyNumber_InPlaceLshift(PyObject *a, PyObject *b)      { return number_op("ilshift", 2, a, b, NULL); }
extern "C" PyObject *PyNumber_InPlaceRshift(PyObject *a, PyObject *b)      { return number_op("irshift", 2, a, b, NULL); }
extern "C" PyObject *PyNumber_InPlaceAnd(PyObject *a, PyObject *b)         { return number_op("iand", 2, a, b, NULL); }
extern "C" PyObject *PyNumber_InPlaceOr(PyObject *a, PyObject *b)          { return number_op("ior", 2, a, b, NULL); }
extern "C" PyObject *PyNumber_InPlaceXor(PyObject *a, PyObject *b)         { return number_op("ixor", 2, a, b, NULL); }
extern "C" PyObject *PyNumber_InPlaceMatrixMultiply(PyObject *a, PyObject *b) { return number_op("imatmul", 2, a, b, NULL); }
extern "C" PyObject *PyNumber_InPlacePower(PyObject *a, PyObject *b, PyObject *c) {
    (void)c;   /* three-argument in-place pow has no operator; CPython ignores it too */
    return number_op("ipow", 2, a, b, NULL);
}
extern "C" PyObject *PyNumber_Negative(PyObject *a) { return number_op("neg", 1, a, NULL, NULL); }
extern "C" PyObject *PyNumber_Positive(PyObject *a) { return number_op("pos", 1, a, NULL, NULL); }
extern "C" PyObject *PyNumber_Absolute(PyObject *a) { return number_op("abs", 1, a, NULL, NULL); }
extern "C" PyObject *PyNumber_Invert(PyObject *a)   { return number_op("invert", 1, a, NULL, NULL); }
/* int, bool and float have their number slots, as every CPython builtin
   does: a wheel calls them DIRECTLY -- Cython's int fast paths fetch
   ``Py_TYPE(op)->tp_as_number->nb_and'' (and the rest) for an operand it
   does not handle inline, and raised "unsupported operand type(s) for &:
   'int' and 'int'" from SeedSequence when they were NULL.  Each is the
   shim's PyNumber_* function, which asks the server and never a slot. */
extern "C" PyObject *PyNumber_Float(PyObject *);   /* shim_numpy.cc */
extern "C" PyObject *PyNumber_Long(PyObject *);    /* shim_numpy.cc */
static PyNumberMethods grail_value_number_methods;
static void install_value_type_slots(void) {
    PyNumberMethods *m = &grail_value_number_methods;
    m->nb_add = PyNumber_Add;           m->nb_subtract = PyNumber_Subtract;
    m->nb_multiply = PyNumber_Multiply; m->nb_remainder = PyNumber_Remainder;
    m->nb_divmod = PyNumber_Divmod;     m->nb_power = PyNumber_Power;
    m->nb_negative = PyNumber_Negative; m->nb_positive = PyNumber_Positive;
    m->nb_absolute = PyNumber_Absolute; m->nb_bool = PyObject_IsTrue;
    m->nb_invert = PyNumber_Invert;     m->nb_lshift = PyNumber_Lshift;
    m->nb_rshift = PyNumber_Rshift;     m->nb_and = PyNumber_And;
    m->nb_xor = PyNumber_Xor;           m->nb_or = PyNumber_Or;
    m->nb_int = PyNumber_Long;          m->nb_float = PyNumber_Float;
    m->nb_inplace_add = PyNumber_InPlaceAdd;
    m->nb_inplace_subtract = PyNumber_InPlaceSubtract;
    m->nb_inplace_multiply = PyNumber_InPlaceMultiply;
    m->nb_inplace_remainder = PyNumber_InPlaceRemainder;
    m->nb_inplace_power = PyNumber_InPlacePower;
    m->nb_inplace_lshift = PyNumber_InPlaceLshift;
    m->nb_inplace_rshift = PyNumber_InPlaceRshift;
    m->nb_inplace_and = PyNumber_InPlaceAnd;
    m->nb_inplace_xor = PyNumber_InPlaceXor;
    m->nb_inplace_or = PyNumber_InPlaceOr;
    m->nb_floor_divide = PyNumber_FloorDivide;
    m->nb_true_divide = PyNumber_TrueDivide;
    m->nb_inplace_floor_divide = PyNumber_InPlaceFloorDivide;
    m->nb_inplace_true_divide = PyNumber_InPlaceTrueDivide;
    m->nb_index = PyNumber_Index;
    m->nb_matrix_multiply = PyNumber_MatrixMultiply;
    m->nb_inplace_matrix_multiply = PyNumber_InPlaceMatrixMultiply;
    PyLong_Type.tp_as_number = m;
    PyBool_Type.tp_as_number = m;
    PyFloat_Type.tp_as_number = m;
}

/* An int, a float (bool included), or anything with __index__ / __float__
   / __int__ -- CPython's test; asked of the server only past the two inline
   cases. */
extern "C" int PyNumber_Check(PyObject *o) {
    if (o == NULL) return 0;
    if (PyLong_Check(o) || PyFloat_Check(o)) return 1;
    OopType args[5] = { GciNewString("___check"), pyobj_oop(o), OOP_NIL, OOP_NIL, GciI64ToOop(1) };
    OopType r = GciPerform(server, "PyNumber_Op:a:b:c:n:", args, 5);
    if (check_gci_error()) { PyErr_Clear(); return 0; }
    return r == OOP_TRUE ? 1 : 0;
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
    OopType stepOop = GciFetchOop(result, GciOopToI64(idx3[0]));
    *step = (stepOop == OOP_NIL) ? 1 : (Py_ssize_t)GciOopToI64(stepOop);
    if (*step == 0) {
        PyErr_SetString(PyExc_ValueError, "slice step cannot be zero");
        return -1;
    }
    OopType startOop = GciFetchOop(result, GciOopToI64(idx1[0]));
    *start = (startOop == OOP_NIL)
        ? (*step < 0 ? PY_SSIZE_T_MAX : 0)
        : (Py_ssize_t)GciOopToI64(startOop);
    OopType stopOop = GciFetchOop(result, GciOopToI64(idx2[0]));
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

/* A str has no buffer in CPython ("a bytes-like object is required, not
   'str'"); the shim used to answer its UTF-8 bytes. */
extern "C" int PyObject_CheckBuffer(PyObject *obj) {
    if (PyBytes_Check(obj)) return 1;
    return obj != NULL && Py_TYPE(obj) != NULL &&
           Py_TYPE(obj)->tp_as_buffer != NULL &&
           Py_TYPE(obj)->tp_as_buffer->bf_getbuffer != NULL;
}

/* CPython's PyBuffer_FillInfo (Objects/abstract.c): a one-dimensional byte
   view of buf, refusing a WRITABLE request on read-only memory -- which is
   how numpy's frombuffer learns that a bytes object's array must be
   read-only.  view->obj takes a reference, which PyBuffer_Release drops. */
extern "C" int PyBuffer_FillInfo(Py_buffer *view, PyObject *obj, void *buf,
                                 Py_ssize_t len, int readonly, int flags) {
    if (view == NULL) {
        PyErr_SetString(PyExc_BufferError,
                        "PyBuffer_FillInfo: view==NULL argument is obsolete");
        return -1;
    }
    if (flags != PyBUF_SIMPLE && (flags == PyBUF_READ || flags == PyBUF_WRITE)) {
        PyErr_BadInternalCall();
        return -1;
    }
    if ((flags & PyBUF_WRITABLE) == PyBUF_WRITABLE && readonly == 1) {
        PyErr_SetString(PyExc_BufferError, "Object is not writable.");
        return -1;
    }
    view->obj = obj;
    Py_XINCREF(obj);
    view->buf = buf;
    view->len = len;
    view->readonly = readonly;
    view->itemsize = 1;
    view->format = NULL;
    if ((flags & PyBUF_FORMAT) == PyBUF_FORMAT)
        view->format = (char *)"B";
    view->ndim = 1;
    view->shape = NULL;
    if ((flags & PyBUF_ND) == PyBUF_ND)
        view->shape = &(view->len);
    view->strides = NULL;
    if ((flags & PyBUF_STRIDES) == PyBUF_STRIDES)
        view->strides = &(view->itemsize);
    view->suboffsets = NULL;
    view->internal = NULL;
    return 0;
}

extern "C" int PyObject_GetBuffer(PyObject *obj, Py_buffer *view, int flags) {
    memset(view, 0, sizeof(Py_buffer));

    /* A bytes is read-only, as in CPython.  A bytearray crosses as bytes too
       (CPythonShim>>typeAddrFor:), and is writable there: its block is the
       wrapper's copy (PyBytes_Buffer:), so a write C makes is not seen by
       Grail -- the old per-call copy lost it the same way. */
    if (is_foreign_bytes(obj))
        return PyBuffer_FillInfo(view, obj, (char *)obj + GRAIL_BYTES_SVAL_OFFSET,
                                 Py_SIZE(obj), 1, flags);
    if (PyBytes_Check(obj)) {
        Py_ssize_t len = 0;
        int writable = 0;
        char *buf = grail_wrapper_buffer("PyBytes_Buffer:", pyobj_oop(obj),
                                         &len, &writable);
        if (buf == NULL) return -1;
        return PyBuffer_FillInfo(view, obj, buf, len, writable ? 0 : 1, flags);
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

/* CPython's: the exporter's release hook, then the reference view->obj
   holds.  A bytes object's block is its wrapper's, freed by the sweep. */
extern "C" void PyBuffer_Release(Py_buffer *view) {
    PyObject *obj = view->obj;
    if (obj != NULL && Py_TYPE(obj) != NULL &&
        Py_TYPE(obj)->tp_as_buffer != NULL &&
        Py_TYPE(obj)->tp_as_buffer->bf_releasebuffer != NULL) {
        Py_TYPE(obj)->tp_as_buffer->bf_releasebuffer(obj, view);
    }
    view->obj = NULL;
    Py_XDECREF(obj);
}

/* ====================================================================
 * CPython API — Dict (additional)
 * ==================================================================== */

/* PyDict_Next walks a SNAPSHOT: the first call of a walk (pos 0) fetches
   every { key, value } address in one crossing (CPythonShim>>
   PyDict_ItemsFlat:, insertion order) and the rest of the walk is served
   here.  It used to be one crossing per entry, each of which rebuilt the
   dict's whole key list to find entry ``pos'' -- O(n^2) per walk, and 44% of
   a pydantic model_dump() (docs/Support_Pydantic.md, Phase 6).  A small ring
   of snapshots keyed by dict pointer, because a serializer walks an inner
   dict in the middle of walking an outer one.  CPython does not allow a dict
   to be MUTATED during PyDict_Next either, so a snapshot answers what the
   live walk would; a walk resumed at a pos > 0 on a dict with no snapshot
   just takes one. */
#define DICT_NEXT_SLOTS 8
static struct { PyObject *dict; int64 *items; Py_ssize_t n; } g_dn[DICT_NEXT_SLOTS];
static int g_dn_next = 0;

static int dict_next_slot(PyObject *dict, int refresh) {
    int slot = -1;
    for (int i = 0; i < DICT_NEXT_SLOTS; i++)
        if (g_dn[i].dict == dict) { slot = i; break; }
    if (slot >= 0 && !refresh) return slot;
    OopType arg = pyobj_oop(dict);
    OopType flat = GciPerform(server, "PyDict_ItemsFlat:", &arg, 1);
    if (check_gci_error() || flat == OOP_NIL) return -1;
    int64 n = GciFetchSize_(flat);
    if (slot < 0) { slot = g_dn_next; g_dn_next = (g_dn_next + 1) % DICT_NEXT_SLOTS; }
    free(g_dn[slot].items);
    g_dn[slot].items = (int64 *)malloc((size_t)(n > 0 ? n : 1) * sizeof(int64));
    if (g_dn[slot].items == NULL) { g_dn[slot].dict = NULL; return -1; }
    for (int64 i = 0; i < n; i++)
        g_dn[slot].items[i] = GciOopToI64(GciFetchOop(flat, i + 1));
    g_dn[slot].dict = dict;
    g_dn[slot].n = (Py_ssize_t)(n / 2);
    return slot;
}

extern "C" int PyDict_Next(PyObject *dict, Py_ssize_t *ppos, PyObject **pkey,
                            PyObject **pvalue) {
    if (dict == NULL) return 0;
    int slot = dict_next_slot(dict, *ppos == 0);
    if (slot < 0) return 0;
    if (*ppos < 0 || *ppos >= g_dn[slot].n) return 0;
    if (pkey)   *pkey   = (PyObject *)(intptr_t)g_dn[slot].items[2 * *ppos];
    if (pvalue) *pvalue = (PyObject *)(intptr_t)g_dn[slot].items[2 * *ppos + 1];
    (*ppos)++;
    return 1;
}

/* The REPORTING lookup: NULL with the error set when the lookup failed, NULL
   with none when the key is absent. */
extern "C" PyObject *PyDict_GetItemWithError(PyObject *dict, PyObject *key) {
    CHECK_pyObj(dict, "PyDict_GetItemWithError dict");
    CHECK_pyObj(key, "PyDict_GetItemWithError key");
    PyObject *found;
    dict_lookup(dict, pyobj_oop(key), &found);
    return found;
}

/* ====================================================================
 * CPython API — Argument parsing
 * ==================================================================== */

/* Convert a single argument per one format unit.  *pf points at the unit's
   base char; on success it is advanced to the unit's LAST char (a modifier
   like '!','&','#','*' if present) and the caller advances past it.  Mirrors
   the conversion cases of PyArg_ParseTuple; shared by the keyword parser. */
static int parse_one_unit(PyObject *item, const char **pf, va_list *va,
                          const char *fname, Py_ssize_t argnum) {
    const char *f = *pf;
    switch (*f) {
        case 'O': {
            if (f[1] == '!') {
                PyTypeObject *expected = va_arg(*va, PyTypeObject *);
                PyObject **out = va_arg(*va, PyObject **);
                if (Py_TYPE(item) != expected &&
                    !(Py_TYPE(item) && expected &&
                      Py_TYPE(item)->tp_base == expected)) {
                    PyErr_Format(PyExc_TypeError,
                        "%s argument %zd must be %s, not %s", fname, argnum,
                        expected->tp_name,
                        Py_TYPE(item) ? Py_TYPE(item)->tp_name : "?");
                    return 0;
                }
                *out = item; f++;
            } else if (f[1] == '&') {
                typedef int (*converter_t)(PyObject *, void *);
                converter_t conv = va_arg(*va, converter_t);
                void *out = va_arg(*va, void *);
                if (!conv(item, out)) {
                    if (!PyErr_Occurred())
                        PyErr_Format(PyExc_TypeError,
                            "%s argument %zd conversion failed", fname, argnum);
                    return 0;
                }
                f++;
            } else {
                PyObject **out = va_arg(*va, PyObject **);
                *out = item;
            }
            break;
        }
        case 'n': { Py_ssize_t *o = va_arg(*va, Py_ssize_t *); *o = PyLong_AsSsize_t(item); break; }
        case 'i': { int *o = va_arg(*va, int *); *o = (int)PyLong_AsLong(item); break; }
        case 'b': { unsigned char *o = va_arg(*va, unsigned char *); *o = (unsigned char)PyLong_AsLong(item); break; }
        case 'h': { short *o = va_arg(*va, short *); *o = (short)PyLong_AsLong(item); break; }
        case 'l': { long *o = va_arg(*va, long *); *o = PyLong_AsLong(item); break; }
        case 'k': { unsigned long *o = va_arg(*va, unsigned long *); *o = PyLong_AsUnsignedLong(item); break; }
        case 'L': { long long *o = va_arg(*va, long long *); *o = PyLong_AsLongLong(item); break; }
        case 'K': { unsigned long long *o = va_arg(*va, unsigned long long *); *o = PyLong_AsUnsignedLongLong(item); break; }
        case 'I': { unsigned int *o = va_arg(*va, unsigned int *); *o = (unsigned int)PyLong_AsUnsignedLong(item); break; }
        case 'd': { double *o = va_arg(*va, double *); *o = PyFloat_AsDouble(item); break; }
        case 'f': { float *o = va_arg(*va, float *); *o = (float)PyFloat_AsDouble(item); break; }
        case 'p': { int *o = va_arg(*va, int *); *o = PyObject_IsTrue(item); break; }
        case 'c': {
            char *o = va_arg(*va, char *);
            const char *s = PyUnicode_AsUTF8(item);
            if (!s || strlen(s) != 1) {
                PyErr_Format(PyExc_TypeError,
                    "%s argument %zd must be a 1-character string", fname, argnum);
                return 0;
            }
            *o = s[0];
            break;
        }
        case 'z':
        case 's': {
            if (*f == 'z' && item == Py_None) {
                const char **o = va_arg(*va, const char **);
                *o = NULL;
                if (f[1] == '#') { Py_ssize_t *len = va_arg(*va, Py_ssize_t *); *len = 0; f++; }
                break;
            }
            if (!PyUnicode_Check(item)) {
                PyErr_Format(PyExc_TypeError,
                    "%s argument %zd must be str, not %s", fname, argnum,
                    Py_TYPE(item) ? Py_TYPE(item)->tp_name : "?");
                return 0;
            }
            if (f[1] == '#') {
                const char **o = va_arg(*va, const char **);
                Py_ssize_t *len = va_arg(*va, Py_ssize_t *);
                *o = PyUnicode_AsUTF8AndSize(item, len); f++;
            } else {
                const char **o = va_arg(*va, const char **);
                *o = PyUnicode_AsUTF8(item);
            }
            break;
        }
        case 'y': {
            if (!PyBytes_Check(item)) {
                PyErr_Format(PyExc_TypeError,
                    "%s argument %zd must be bytes, not %s", fname, argnum,
                    Py_TYPE(item) ? Py_TYPE(item)->tp_name : "?");
                return 0;
            }
            if (f[1] == '*') {
                Py_buffer *view = va_arg(*va, Py_buffer *);
                if (PyObject_GetBuffer(item, view, PyBUF_SIMPLE) < 0) return 0;
                f++;
            } else if (f[1] == '#') {
                const char **o = va_arg(*va, const char **);
                Py_ssize_t *len = va_arg(*va, Py_ssize_t *);
                *o = grail_buffer_of(item); *len = PyBytes_Size(item); f++;
            } else {
                const char **o = va_arg(*va, const char **);
                *o = grail_buffer_of(item);
            }
            break;
        }
        default:
            PyErr_Format(PyExc_RuntimeError,
                "PyArg parsing: unsupported format char '%c'", *f);
            return 0;
    }
    *pf = f;
    return 1;
}

/* Consume the va_arg pointer(s) for one format unit WITHOUT converting —
   used when an optional keyword argument is absent, to keep the caller's
   va_list aligned with the remaining (present) units.  Advances *pf over
   any modifier, matching parse_one_unit's count of va_args. */
static void skip_one_unit(const char **pf, va_list *va) {
    const char *f = *pf;
    int n = 1;                              /* va_args to consume */
    switch (*f) {
        case 'O':
            if (f[1] == '!' || f[1] == '&') { n = 2; f++; }
            break;
        case 's': case 'z':
            if (f[1] == '#') { n = 2; f++; }
            break;
        case 'y':
            if (f[1] == '#') { n = 2; f++; }
            else if (f[1] == '*') { n = 1; f++; }
            break;
        default: break;                     /* all scalar units: 1 pointer */
    }
    for (int j = 0; j < n; j++) (void)va_arg(*va, void *);
    *pf = f;
}

/* Shared positional+keyword argument parser (CPython's vgetargskeywords).
   kwlist/kwds may be NULL for positional-only parsing (PyArg_ParseTuple). */
static int vparse_kw(PyObject *args, PyObject *kwds, const char *format,
                     char **kwlist, va_list *va) {
    Py_ssize_t nargs = args ? PyTuple_Size(args) : 0;
    const char *f = format;
    const char *fname = strchr(format, ':');
    if (!fname) fname = strchr(format, ';');
    fname = fname ? fname + 1 : "function";

    Py_ssize_t i = 0;          /* argument-unit index (also kwlist index) */
    int required = 1;
    while (*f) {
        if (*f == '|' || *f == '$') { required = 0; f++; continue; }
        if (*f == ':' || *f == ';') break;
        if (*f == ' ') { f++; continue; }

        const char *kwname = kwlist ? kwlist[i] : NULL;
        PyObject *item = NULL;
        if (i < nargs) item = PyTuple_GetItem(args, i);
        else if (kwds && kwname) item = PyDict_GetItemString(kwds, kwname);

        if (item != NULL) {
            if (!parse_one_unit(item, &f, va, fname, i + 1)) return 0;
        } else if (required) {
            PyErr_Format(PyExc_TypeError,
                "%s missing required argument '%s' (pos %zd)",
                fname, kwname ? kwname : "?", i + 1);
            return 0;
        } else {
            skip_one_unit(&f, va);
        }
        f++;
        i++;
    }
    return 1;
}

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
                        *out = grail_buffer_of(item);
                        *len = PyBytes_Size(item);
                    }
                    f++;  /* consume '#' or '*' */
                } else {
                    const char **out = va_arg(vargs, const char **);
                    *out = grail_buffer_of(item);
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

extern "C" int PyArg_VaParseTupleAndKeywords(PyObject *args, PyObject *kwds,
                                             const char *format,
                                             char **kwlist, va_list va) {
    /* Copy the va_list — vparse_kw consumes it. */
    va_list copy;
    va_copy(copy, va);
    int r = vparse_kw(args, kwds, format, kwlist, &copy);
    va_end(copy);
    return r;
}

extern "C" int PyArg_ParseTupleAndKeywords(PyObject *args, PyObject *kwds,
                                           const char *format,
                                           char **kwlist, ...) {
    va_list va;
    va_start(va, kwlist);
    int r = vparse_kw(args, kwds, format, kwlist, &va);
    va_end(va);
    return r;
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

/* warnings.warn(message, category, level), so the warning filters apply --
   ``error'' turns it into an exception, and the caller sees -1.  It was a
   silent no-op (_sre's deprecation warnings among others went nowhere). */
extern "C" PyObject *PyObject_CallMethod(PyObject *, const char *, const char *, ...);
extern "C" int PyErr_WarnEx(PyObject *category, const char *message,
                             Py_ssize_t level) {
    PyObject *warnings = PyImport_ImportModule("warnings");
    if (warnings == NULL) return -1;
    PyObject *r = PyObject_CallMethod(warnings, "warn", "sOn", message,
                                      category == NULL ? PyExc_UserWarning : category,
                                      level < 1 ? (Py_ssize_t)1 : level);
    Py_DECREF(warnings);
    if (r == NULL) return -1;
    Py_DECREF(r);
    return 0;
}

/* ====================================================================
 * CPython API — Unicode helpers (for SRE)
 * ==================================================================== */

/* Simple Unicode case mappings (the regex engine's Py_UNICODE_TOLOWER /
   TOUPPER).  ASCII via ctype; non-ASCII via the generated tables
   (grail_case_tables.h).  A code point not in the table maps to itself. */
extern "C" Py_UCS4 _grail_unicode_tolower(Py_UCS4 ch) {
    if (ch < 128) return (Py_UCS4)tolower((int)ch);
    return (Py_UCS4)grail_case_lookup(grail_lower_map, grail_lower_map_len, ch);
}

extern "C" Py_UCS4 _grail_unicode_toupper(Py_UCS4 ch) {
    if (ch < 128) return (Py_UCS4)toupper((int)ch);
    return (Py_UCS4)grail_case_lookup(grail_upper_map, grail_upper_map_len, ch);
}

/* True for cased code points that have NO simple case mapping (sharp-s,
   dotted-I, the ﬅ/ﬆ ligatures, ...): the regex iscased test derives most
   cased chars from a lower/upper mapping difference, but must still treat
   these as cased so IGNORECASE folding (via _casefix._EXTRA_CASES) applies. */
extern "C" int _grail_unicode_iscased_extra(Py_UCS4 ch) {
    int lo = 0, hi = grail_cased_extra_len - 1;
    while (lo <= hi) {
        int mid = (lo + hi) >> 1;
        unsigned int f = grail_cased_extra[mid];
        if (f == ch) return 1;
        if (f < ch) lo = mid + 1; else hi = mid - 1;
    }
    return 0;
}

/* Py_UNICODE_ISDECIMAL -- the Nd general category, by binary search over the
   generated range table (grail_digit_table.h).

   This used to be `iswdigit((wint_t)ch)`, under a comment claiming it covered
   Nd.  It cannot: the C standard defines iswdigit as exactly the ten ASCII
   digits, in every locale.  So `\d` matched no non-ASCII digit, and because
   _pydecimal parses with `\d`, Decimal(U+FF11) raised InvalidOperation -- which
   under the test context is a silent NaN. */
extern "C" int _grail_unicode_isdecimal(Py_UCS4 ch) {
    if (ch < 128) return ch >= '0' && ch <= '9';
    int low = 0, high = grail_decimal_ranges_len - 1;
    while (low <= high) {
        int mid = low + (high - low) / 2;
        if (ch < grail_decimal_ranges[mid].first) high = mid - 1;
        else if (ch > grail_decimal_ranges[mid].last) low = mid + 1;
        else return 1;
    }
    return 0;
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

/* A DYNAMICALLY LOADED extension is initialised once per PROCESS
   (docs/Support_Pydantic.md, W8).  The library stays mapped across a logout,
   and what its init built -- PyO3's Rust statics: interned strings, type
   pointers, the module's own attributes -- points at Grail objects of the
   session that ran it, which a logout discards.  Running the init again in
   the next session of the same gem process re-used those dangling pointers
   and segfaulted (measured: pydantic_core, logout then login in one topaz).
   CPython does not re-initialise an extension in one process either.  So a
   module first loaded in an EARLIER session is refused with an ImportError
   naming the cause; g_session_gen counts logins (GciUserActionInit). */
static int g_session_gen = 0;
#define MAX_DYN_EVER 64
static struct { char name[64]; int gen; } g_dyn_ever[MAX_DYN_EVER];
static int g_dyn_ever_count = 0;
static char      module_names[MAX_MODULES][64];
static int       num_modules = 0;

/* The dotted name a loaded module was loaded under, or NULL. */
static const char *module_name_for(PyObject *module) {
    for (int i = 0; i < num_modules; i++)
        if (module_cache[i] == module) return module_names[i];
    return NULL;
}

/* Multi-phase init: allocate state and run Py_mod_exec slots.
   Returns 0 on success, -1 if an exec slot failed. */
static int run_module_exec_slots(PyObject *mod) {
    PyModuleDef *def = (PyModuleDef *)mod;
    if (!def->m_slots) return 0;
    if (def->m_size > 0) {
        allocate_module_state(def);
    }
    if (getenv("GRAIL_SHIM_DIAG")) {
        fprintf(stderr, "SHIM-DIAG: running Py_mod_exec slots of %s, module ptr %p\n",
                def->m_name ? def->m_name : "?", (void *)mod);
        fflush(stderr);
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
    GciErrSType err;                 /* constructor calls init(): fields cleared */
    /* Set the fields directly.  GciErrSType::setError() is DECLARED in
       $GEMSTONE/include/gci.ht but is not exported by any library a user
       action links (checked libgcilnk*.dylib and gciualib.o on 4.0.0): it is
       implemented server-side only.  Because the Makefile links Darwin with
       -undefined dynamic_lookup, calling it links cleanly and then resolves
       to NULL at run time -- SIGSEGV at pc 0x0 inside raise_error, which is
       how CPythonShimTestCase>>testHeapqPopEmpty took down a whole test
       shard.  Anything that reports an error must not itself need a symbol
       we cannot resolve. */
    err.number = ERR_Error;
    strncpy(err.message, message, GCI_ERR_STR_SIZE);
    err.message[GCI_ERR_STR_SIZE] = '\0';
    /* Attach a real Error instance carrying `message` as its messageText.
       MEASURED on base 4.0.0: without this, GciRaiseException does not
       surface err.message as the raised exception's messageText for a bare
       ERR_Error, and CPythonShim>>___translateShimError: opens with

           text := ex messageText.
           text isNil ifTrue: [^ ex pass].

       so a nil messageText collapses the whole Python-exception
       reconstruction -- 8 SUnit tests fail with `Expected <PythonError>, GOT
       a Error occurred (error 2710)`.  Setting argCount/args[0] alone is NOT
       enough: it substitutes the text into the error's printString (the
       failures then read `..., IndexError: index out of range`) but
       messageText stays nil, so 7 of the 8 still fail.  Only exceptionObj
       makes messageText non-nil.

       Note this is BASE-image behaviour on 4.0, not the patched-image quirk
       45540efb described -- that commit found base 3.7.x did not need it, so
       4.0 is stricter here and CI does now cover it.

       Calling GCI here is safe: check_and_raise_error() drains the GCI error
       state before control can reach this path, so this perform never runs
       with an error pending.  That ORDERING, rather than removing the
       perform, is what satisfies "no further Gci calls after a Gci error". */
    if (server != OOP_NIL) {
        OopType msgOop = GciNewString(message);
        err.argCount = 1;
        err.args[0] = msgOop;
        OopType exc = GciPerform(server, "___makeErrorWithText:", &msgOop, 1);
        GciErrSType tmp; GciErr(&tmp);   /* drop any error from the perform */
        if (exc != OOP_NIL && exc != OOP_ILLEGAL)
            err.exceptionObj = exc;
    }
    // printf("cpython.cc: raise_error %s\n", message); // uncomment for debugging
    GciRaiseException(&err); // unwinds C stack
}

/* Report whatever error is outstanding -- Python-level, GemStone-level, or
   neither -- as a GemStone exception.  Called at every user-action exit.

   The bug this replaces: the boundary test used to be has_error(), which read
   ONLY current_error_type, the shim's *Python* error indicator.  A Smalltalk
   exception raised in a GciPerform callback sets the *GCI* error state, which
   has_error() never looked at, so the boundary saw nothing at all.

   What the boundary can and cannot do -- measured, see
   scripts/probe_shim_error_propagation.gs.  It CANNOT rescue an unchecked
   perform: by the time the C function returns, the VM has already refused the
   cross-frame unwind, so re-raising the pending struct here yields 2758 and
   then recursion, exactly as it does with no boundary check at all.  That has
   to be fixed at the call site, by checking and CONSUMING.  What the boundary
   must do is never let an outstanding error go unreported. */
static void check_and_raise_error(void) {
    err_adopt();       /* Cython may have raised, or cleared, through the slot */
    /* Sample-and-clear the GCI error state FIRST, unconditionally, for two
       independent reasons:
         (a) it must not still be pending when raise_error() performs
             ___makeErrorWithText: below; and
         (b) when there is no Python error it is the only remaining record
             that a callback raised. */
    GciErrSType gsErr;
    int haveGsErr = GciErr(&gsErr) ? 1 : 0;

    if (have_saved_gs_error) {
        /* A callback raised, check_gci_error() consumed it to keep the
           return-code convention, and translated it while it could.  Raise
           THAT, not the RuntimeError placeholder standing in for it: the text
           is already in the ``Name: message'' shape
           CPythonShim>>___translateShimError: parses, so the caller gets the
           real class instead of a RuntimeError with no text. */
        char msg[sizeof(saved_gs_error_text)];
        memcpy(msg, saved_gs_error_text, sizeof(msg));
        forget_saved_gs_error();
        PyErr_Clear();              /* drop the placeholder */
        raise_error(msg);           /* unwinds the C stack; does not return */
        return;
    }

    if (current_error_type != NULL) {
        /* A Python error takes priority.  It is what the C module chose to
           report, and on the instrumented paths it *is* the GCI error,
           translated by check_gci_error().  Preferring it keeps every path
           that works today working unchanged, and stops a benign GCI error
           the shim deliberately tolerated (an __index__ probe DNU, say) from
           displacing the real diagnosis. */
        const char *errType = get_error_type();
        const char *errMsg  = get_error_message();

        char msg[2048];
        snprintf(msg, sizeof(msg), "%s: %s", errType ? errType : "Error",
                 errMsg ? errMsg : "unknown error");
        /* The text alone cannot carry a wheel's exception OBJECT, so hand the
           instance and its type to the server first; ___translateShimError:
           raises a Grail exception built around them instead of a bare
           ValueError.  GCI state is drained above, so this perform is safe. */
        if (current_error_from_grail) {
            /* It came FROM Grail and C did not handle it: raise the original
               exception object again, not a reconstruction. */
            GciPerform(server, "___noteReraiseCallbackException", NULL, 0);
            GciErrSType tmp; GciErr(&tmp);
        } else if (current_error_instance != NULL) {
            PyObject *inst = current_error_instance;
            PyTypeObject *it = inst->ob_type;
            OopType args[3] = { GciI64ToOop((int64)(intptr_t)inst),
                                GciI64ToOop((int64)(intptr_t)it),
                                GciNewString((it && it->tp_name) ? it->tp_name : "") };
            GciPerform(server, "___noteForeignException:type:typeName:", args, 3);
            GciErrSType tmp; GciErr(&tmp);
        }
        PyErr_Clear();
        raise_error(msg);
    } else if (haveGsErr) {
        /* No Python error, but a callback raised and nobody consumed it.
           Report it rather than returning a bare nil that reads as a
           successful empty answer.  Re-raising the original struct keeps its
           exceptionObj, so the class survives WHEN the VM permits the raise
           at all; when it does not, this is the 2758 path above, which is
           still strictly better than losing the exception (ask 1 of
           docs/GemStone_Feature_Requests.md 1.5) but is not a fix. */
        GciRaiseException(&gsErr); // unwinds C stack
    }
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

/* Was ``name'' loaded from a wheel's .so (shimDynLoad), rather than being
   one of the shim's own modules?  A wheel is built against CPython's
   headers and reads its arguments with the inline list / tuple macros, so a
   Grail list or tuple argument goes to it as a real-layout copy
   (real_layout_arg).  The shim's own modules are built against cpython.h,
   use the functions, and may MUTATE a list argument -- _bisect.insort does
   -- so they keep receiving the caller's list itself. */
static int is_wheel_module(const char *name) {
    for (int i = 0; i < g_dyn_ever_count; i++)
        if (strcmp(g_dyn_ever[i].name, name) == 0) return 1;
    return 0;
}

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
    /* A dot alone does not mean the combined form: a dynamically loaded
       extension inside a package is NAMED with dots (markupsafe._speedups,
       numpy._core._multiarray_umath), and splitting it looked up module
       "numpy" -- "Module not found: numpy" on every positional call (#1433).
       The combined form passes its first ARGUMENT in the meth slot, a
       SmallInteger (an address, or 0); the plain form passes the method NAME
       there, a String.  So the slot's kind decides. */
    int combined = (dot != NULL) && GCI_OOP_IS_SMALL_INT(methOop);
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

    if (is_wheel_module(modName))
        for (int i = 0; i < nargs && i < 6; i++) pyArgs[i] = real_layout_arg(pyArgs[i], 0);

    /* 6. Call the method */
    PyObject *result = call_method(module, methIdx, pyArgs, nargs);

    /* 7. Clear buffer cache (free materialized bytes/string buffers) */
    buffer_cache_clear();

    /* 8. Check for error */
    check_and_raise_error();

    /* 9. Return either the hidden OOP at offset 16, or the raw C pointer */
    if (!result)
        return OOP_NIL;
    if (returnCPtr)
        return GciI64ToOop((intptr_t)result);
    OopType res = pyobj_oop(result);
    check_and_raise_error();
    return res;
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
        OopType addrOop = GciFetchOop(posArrOop, GciOopToI64(idxOop));
        args[i] = (PyObject *)(intptr_t)GciOopToI64(addrOop);
    }
    PyObject *kwnames = PyTuple_New(nkw);
    if (!kwnames) {
        raise_error("shimCallKw: could not allocate kwnames");
        return OOP_NIL;
    }
    for (Py_ssize_t i = 0; i < nkw; i++) {
        OopType idxOop = GciI64ToOop(i + 1);
        OopType nameOop = GciFetchOop(kwNamesOop, GciOopToI64(idxOop));
        OopType valAddrOop = GciFetchOop(kwValsOop, GciOopToI64(idxOop));
        /* The name is already a Smalltalk String — wrap it as a PyObject */
        OopType nameAddr = GciPerform(server, "PyUnicode_FromString:", &nameOop, 1);
        PyTuple_SetItem(kwnames, i, addr_to_pyobj(nameAddr));
        args[npos + i] = (PyObject *)(intptr_t)GciOopToI64(valAddrOop);
    }

    if (is_wheel_module(modName))
        for (Py_ssize_t i = 0; i < npos + nkw; i++) args[i] = real_layout_arg(args[i], 0);

    PyModuleDef *def = (PyModuleDef *)module;
    PyMethodDef *method = &def->m_methods[methIdx];
    PyErr_Clear();
    PyObject *result = call_method_on_kw(module, method, NULL,
                                         args, npos, kwnames, nkw);

    buffer_cache_clear();
    check_and_raise_error();
    
    if (!result) return OOP_NIL;
    OopType res = pyobj_oop(result);
    check_and_raise_error();
    return res;
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
    check_and_raise_error();

    return OOP_TRUE;
}

/* ====================================================================
 * shimInit — called from Smalltalk after library load
 *
 * Receives the CPythonShim server instance and pre-wrapped CByteArray
 * addresses for None, True, False.
 * ==================================================================== */

static void new_session_reset(void);

static OopType shimInit(OopType serverOop, OopType noneAddr,
                        OopType trueAddr, OopType falseAddr, OopType sessionToken)
{
    /* A NEW SESSION of this process?  GciUserActionInit/Shutdown do not run
       across a logout and re-login in one gem process -- the library stays
       initialised -- so the boundary is the token CPythonShim class>>
       ensureLoaded: makes once per session (see g_dyn_ever). */
    static int64 last_token = 0;
    int64 token = GciOopToI64(sessionToken);
    if (token != last_token) {
        if (last_token != 0) new_session_reset();
        last_token = token;
    }
    server = serverOop;

    /* Extract OOPs from the Smalltalk-allocated CByteArray wrappers
       (which have the GemStone OOP at offset 16) -- the FIRST time.  Once
       CPythonShim>>initTypeAddresses has switched None / True / False to
       crossing as the shim's own static singletons, a re-init (ensureLoaded:
       runs shimInit again for an instance it already set up) is handed THOSE,
       which are 16 bytes: offset 16 is the next singleton's refcount, and
       reading it made None an OOP that does not exist.  The OOPs recorded
       the first time stand. */
    PyObject *na = (PyObject *)(intptr_t)GciOopToI64(noneAddr);
    PyObject *ta = (PyObject *)(intptr_t)GciOopToI64(trueAddr);
    PyObject *fa = (PyObject *)(intptr_t)GciOopToI64(falseAddr);
    if (na != Py_None)  none_oop  = *(OopType *)((char *)na + 16);
    if (ta != Py_True)  true_oop  = *(OopType *)((char *)ta + 16);
    if (fa != Py_False) false_oop = *(OopType *)((char *)fa + 16);

    /* Set type pointers on the static singletons. */
    _Py_TrueStruct.ob_base.ob_type  = &PyBool_Type;
    if (_Py_NotImplementedStruct.ob_type == NULL) {
        init_type(&_PyNotImplemented_Type, "NotImplementedType", &PyBaseObject_Type,
                  Py_TPFLAGS_DEFAULT);
        register_shim_type(&_PyNotImplemented_Type);
        _Py_NotImplementedStruct.ob_type = &_PyNotImplemented_Type;
    }
    if (_Py_EllipsisObject.ob_type == NULL) {
        init_type(&_PyEllipsis_Type, "ellipsis", &PyBaseObject_Type, Py_TPFLAGS_DEFAULT);
        register_shim_type(&_PyEllipsis_Type);
        _Py_EllipsisObject.ob_type = &_PyEllipsis_Type;
    }
    _Py_FalseStruct.ob_base.ob_type = &PyBool_Type;
    check_and_raise_error();

    return OOP_TRUE;
}

/* ====================================================================
 * shimTypeAddr — return the C address of a named type object
 *
 * Called from Smalltalk to populate the type address dictionary.
 * ==================================================================== */

/* One of the shim's static exception types, by its Python name, or NULL. */
static PyObject *static_exc_named(const char *name) {
    PyObject *const excs[] = {
        PyExc_BaseException, PyExc_Exception, PyExc_ValueError, PyExc_TypeError,
        PyExc_AttributeError, PyExc_KeyError, PyExc_IndexError, PyExc_LookupError,
        PyExc_OverflowError, PyExc_ZeroDivisionError, PyExc_ArithmeticError,
        PyExc_RuntimeError, PyExc_RecursionError, PyExc_NotImplementedError,
        PyExc_MemoryError, PyExc_StopIteration, PyExc_StopAsyncIteration,
        PyExc_SystemError, PyExc_OSError, PyExc_ImportError,
        PyExc_ModuleNotFoundError, PyExc_NameError,
        PyExc_BufferError, PyExc_EOFError, PyExc_KeyboardInterrupt,
        PyExc_UnicodeError, PyExc_UnicodeDecodeError, PyExc_UnicodeEncodeError,
        PyExc_AssertionError, PyExc_BaseExceptionGroup, PyExc_DeprecationWarning,
        PyExc_FutureWarning, PyExc_RuntimeWarning, PyExc_UserWarning,
        PyExc_GeneratorExit, PyExc_UnboundLocalError };
    for (size_t i = 0; i < sizeof(excs) / sizeof(excs[0]); i++) {
        const char *n = name_for_exc_type(excs[i]);
        if (n && strcmp(n, name) == 0) return excs[i];
    }
    return NULL;
}

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
    else if (strcmp(name, "set")    == 0) type = &PySet_Type;
    else if (strcmp(name, "slice")  == 0) type = &PySlice_Type;
    else if (strcmp(name, "frozenset") == 0) type = &PyFrozenSet_Type;
    /* Not types: the three singletons, so Grail can hand C THESE pointers
       for None / True / False (CPythonShim>>initTypeAddresses). */
    else if (strcmp(name, "None")  == 0) type = (PyTypeObject *)&_Py_NoneStruct;
    else if (strcmp(name, "True")  == 0) type = (PyTypeObject *)&_Py_TrueStruct;
    else if (strcmp(name, "False") == 0) type = (PyTypeObject *)&_Py_FalseStruct;
    else if (strcmp(name, "NotImplemented") == 0) type = (PyTypeObject *)&_Py_NotImplementedStruct;
    else if (strcmp(name, "Ellipsis") == 0) type = (PyTypeObject *)&_Py_EllipsisObject;
    /* The shim's static exception types, by name, so a Grail exception
       class mirrors onto the very type C compares against. */
    if (!type) type = (PyTypeObject *)static_exc_named(name);
    /* The callback-error flag, for CPythonShim>>___guardCallback:. */
    if (!type && strcmp(name, "___cbErrorFlag") == 0) type = (PyTypeObject *)&g_cb_error_flag;

    check_and_raise_error();
    if (!type) return OOP_Zero;
    return GciI64ToOop((intptr_t)type);
}

/* ====================================================================
 * GCI User Action registration
 * ==================================================================== */

/* ====================================================================
 * Type creation API stubs
 * ==================================================================== */

/* tp_bases and tp_mro as real-layout tuples, as PyType_Ready gives every
   type: the MRO is the type, then its tp_base chain, which is the C3 order
   for single inheritance.  Cython reads both INLINE (PyTuple_GET_SIZE /
   GET_ITEM) when it readies a cdef class. */
static void grail_set_mro(PyTypeObject *type) {
    /* tp_bases first, as type_ready_set_bases: (tp_base,), or () for object.
       Cython reads its size inline while it sets up a cdef class (a read of
       address 0x10 when it was NULL). */
    if (type->tp_bases == NULL) {
        PyObject *bases = PyTuple_New(type->tp_base ? 1 : 0);
        if (bases == NULL) { PyErr_Clear(); return; }
        if (type->tp_base) {
            Py_INCREF((PyObject *)type->tp_base);
            PyTuple_SET_ITEM(bases, 0, (PyObject *)type->tp_base);
        }
        type->tp_bases = bases;
    }
    if (type->tp_mro != NULL) return;
    Py_ssize_t n = 0;
    for (PyTypeObject *t = type; t != NULL && n < 64; t = t->tp_base) n++;
    PyObject *mro = PyTuple_New(n);
    if (mro == NULL) { PyErr_Clear(); return; }
    Py_ssize_t i = 0;
    for (PyTypeObject *t = type; t != NULL && i < n; t = t->tp_base, i++) {
        Py_INCREF((PyObject *)t);
        PyTuple_SET_ITEM(mro, i, (PyObject *)t);
    }
    type->tp_mro = mro;
}

extern "C" int PyType_Ready(PyTypeObject *type) {
    /* In real CPython, this resolves bases, populates tp_dict, etc.
       For our shim, just set the READY flag and default base.

       A type that is already READY is left alone, as CPython does.  numpy's
       setup_scalartypes readies the builtin types it derives from
       (PyType_Ready(&PyBytes_Type), &PyUnicode_Type, &PyBool_Type, ...),
       and the slot inheritance below gave the shim's own static types
       object's tp_new: is_grail_class_type then no longer routed a C call
       of builtins.bytes or str to Grail, and PyObject_Bytes(b'xy') answered
       five zero bytes from a C-level object -- np.array(b'ab') held b''. */
    if (type->tp_flags & Py_TPFLAGS_READY) return 0;
    if (type->tp_base == NULL && type != &PyBaseObject_Type)
        type->tp_base = &PyBaseObject_Type;
    type->tp_flags |= Py_TPFLAGS_READY;
    /* A readied type has its dict and its MRO, as in CPython: Cython stores
       a cdef class's __pyx_vtable__ straight into tp_dict, and reads tp_mro. */
    if (type->tp_dict == NULL) type->tp_dict = PyDict_New();
    grail_set_mro(type);
    type->ob_base.ob_base.ob_refcnt = 1;
    /* Only default the metatype when unset — matching CPython, which does
       `if (Py_IS_TYPE(type, NULL)) Py_SET_TYPE(type, &PyType_Type);`.
       numpy allocates a DType *class* as an instance of its own metaclass
       (PyArrayDTypeMeta_Type) and then calls PyType_Ready on it; clobbering
       ob_type here turned every DType into a plain `type`, so numpy's later
       PyObject_TypeCheck(dtype, &PyArrayDTypeMeta_Type) rejected it. */
    if (type->ob_base.ob_base.ob_type == NULL)
        type->ob_base.ob_base.ob_type = &PyType_Type;
    /* Every readied type HAS a tp_dict in CPython, and an extension may write
       straight into it: cffi's PyInit__cffi_backend sets ``__module__'' and
       ``__name__'' in CData_Type.tp_dict right after PyType_Ready, and with no
       dict that write failed and the module's init answered NULL with no
       error set ("initialization of _cffi_backend failed without raising an
       exception" -- argon2-cffi, and so pwdlib's default hasher).  The other
       tp_dict readers here already treat an empty dict as nothing stored. */
    if (type->tp_dict == NULL) type->tp_dict = PyDict_New();

    /* Minimal slot inheritance (CPython's inherit_slots): a readied type
       inherits unset slots from its base.  Without this a prebuilt wheel's
       type has NULL tp_alloc/tp_new/etc. and numpy crashes calling them —
       e.g. arraydescr_new -> subtype->tp_alloc(...) jumped to 0x0. */
    PyTypeObject *base = type->tp_base;
    if (base != NULL && base != type) {
#define INHERIT_SLOT(slot) if (type->slot == NULL) type->slot = base->slot
        INHERIT_SLOT(tp_alloc);
        /* tp_new as CPython's type_ready_set_new has it: a static type
           directly on object that sets none cannot be instantiated
           (DISALLOW_INSTANTIATION, "cannot create 'T' instances"), and a
           type with that flag keeps a NULL tp_new; only the rest inherit.
           Inheriting object's made such a type -- and every Python subclass
           of it -- callable, answering a bare object. */
        if (type->tp_new == NULL && base == &PyBaseObject_Type
                && !(type->tp_flags & Py_TPFLAGS_HEAPTYPE))
            type->tp_flags |= Py_TPFLAGS_DISALLOW_INSTANTIATION;
        if (!(type->tp_flags & Py_TPFLAGS_DISALLOW_INSTANTIATION))
            INHERIT_SLOT(tp_new);
        INHERIT_SLOT(tp_free);
        INHERIT_SLOT(tp_dealloc);
        INHERIT_SLOT(tp_getattro);
        INHERIT_SLOT(tp_setattro);
        INHERIT_SLOT(tp_getattr);
        INHERIT_SLOT(tp_setattr);
        INHERIT_SLOT(tp_call);
        INHERIT_SLOT(tp_hash);
        INHERIT_SLOT(tp_str);
        INHERIT_SLOT(tp_repr);
        INHERIT_SLOT(tp_richcompare);
        INHERIT_SLOT(tp_iter);
        INHERIT_SLOT(tp_iternext);
        INHERIT_SLOT(tp_descr_get);
        INHERIT_SLOT(tp_descr_set);
        if (type->tp_itemsize == 0) type->tp_itemsize = base->tp_itemsize;
        /* CPython's inherit_special: a subtype of a builtin value type is
           one for PyBytes_Check and the rest, which read these flags inline.
           numpy.bytes_ failed PyBytes_Check in numpy's own C.  TYPE_SUBCLASS
           and BASE_EXC_SUBCLASS too, as inherit_special passes every one: a
           wheel's metatype (numpy's _DTypeMeta) is a type subclass, so a
           DType class -- numpy.dtype itself -- passes PyType_Check, which a
           Cython module's __Pyx_ImportType reads inline ("numpy.dtype is not
           a type object" when it was left out). */
        type->tp_flags |= base->tp_flags & (Py_TPFLAGS_LONG_SUBCLASS
            | Py_TPFLAGS_LIST_SUBCLASS | Py_TPFLAGS_TUPLE_SUBCLASS
            | Py_TPFLAGS_BYTES_SUBCLASS | Py_TPFLAGS_UNICODE_SUBCLASS
            | Py_TPFLAGS_DICT_SUBCLASS | Py_TPFLAGS_TYPE_SUBCLASS
            | Py_TPFLAGS_BASE_EXC_SUBCLASS);
#undef INHERIT_SLOT
    }
    /* object's default allocator — every type needs a working tp_alloc. */
    if (type->tp_alloc == NULL)
        type->tp_alloc = PyType_GenericAlloc;
    return 0;
}

/* Walk the tp_base chain (single inheritance — the shim does not build
   tp_mro).  Sufficient for numpy's metaclasses (PyArrayDTypeMeta_Type
   subclasses type) and the PyObject_TypeCheck paths numpy relies on. */
extern "C" int PyType_IsSubtype(PyTypeObject *a, PyTypeObject *b) {
    if (a == NULL || b == NULL) return 0;
    for (PyTypeObject *t = a; t != NULL; t = t->tp_base)
        if (t == b) return 1;
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
    /* COPY the name, as CPython does (ht_name / ht_qualname): the spec is the
       caller's, and PyO3 builds it from temporaries it frees as soon as
       PyType_FromSpec returns -- tp_name then pointed at freed memory, and
       pydantic_core's ValidationError reported its __name__ as garbage. */
    type->tp_name = strdup(spec->name ? spec->name : "?");
    type->tp_basicsize = spec->basicsize;
    type->tp_itemsize = spec->itemsize;
    type->tp_flags = spec->flags | Py_TPFLAGS_HEAPTYPE | Py_TPFLAGS_READY;
    type->tp_base = &PyBaseObject_Type;

    /* `bases` is a type, or a tuple of them (Cython passes ``(base,)'' for
       every cdef class).  The first becomes tp_base -- CPython's best_base
       whenever the first base has the widest layout, as single inheritance
       does -- and a tuple is kept as tp_bases.  A tuple's elements are read
       with PyTuple_GetItem, which answers a real-layout tuple's in C and a
       Grail tuple's through the server; a type element comes back as its C
       pointer either way. */
    if (bases != NULL) {
        PyTypeObject *bt = Py_TYPE(bases);
        int bases_is_type = bt == &PyType_Type || PyType_IsSubtype(bt, &PyType_Type);
        PyObject *first = bases_is_type ? bases
            : (PyTuple_Check(bases) && PyTuple_Size(bases) > 0) ? PyTuple_GetItem(bases, 0) : NULL;
        PyTypeObject *ft = first ? Py_TYPE(first) : NULL;
        if (first == NULL || ft == NULL
                || !(ft == &PyType_Type || PyType_IsSubtype(ft, &PyType_Type))) {
            free(type);
            if (!PyErr_Occurred())
                PyErr_SetString(PyExc_TypeError,
                    "PyType_FromSpecWithBases: bases must be a type or a non-empty tuple of types");
            return NULL;
        }
        type->tp_base = (PyTypeObject *)first;
        if (!bases_is_type) { Py_INCREF(bases); type->tp_bases = bases; }
    }

    type->tp_dict = PyDict_New();     /* see PyType_Ready */
    grail_set_mro(type);

    int idx = heap_type_count++;
    heap_types[idx].type = type;
    register_shim_type(type);          /* not foreign — the shim made it */
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
            /* Copied like tp_name: CPython copies the doc, so a caller may free it. */
            case Py_tp_doc:        type->tp_doc = slot->pfunc ? strdup((const char *)slot->pfunc) : NULL; break;
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
            /* A descriptor type binds: Cython's cyfunction (every method of a
               cdef class) has tp_descr_get, and without it an instance read
               answered the unbound function -- ``generate_state() takes at
               least 1 positional argument (0 given)''. */
            case Py_tp_descr_get:  type->tp_descr_get = (descrgetfunc)slot->pfunc; break;
            case Py_tp_descr_set:  type->tp_descr_set = (descrsetfunc)slot->pfunc; break;
            case Py_tp_getattr:    type->tp_getattr = (getattrfunc)slot->pfunc; break;
            case Py_tp_setattr:    type->tp_setattr = (setattrfunc)slot->pfunc; break;
            case Py_tp_is_gc:      type->tp_is_gc = (inquiry)slot->pfunc; break;
            case Py_tp_del:        type->tp_del = (destructor)slot->pfunc; break;
            case Py_tp_vectorcall: type->tp_vectorcall = (vectorcallfunc)slot->pfunc; break;

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

    /* The offsets a spec declares as members, as type_from_spec reads them:
       ``__vectorcalloffset__'', ``__dictoffset__'' and ``__weaklistoffset__''.
       Cython declares its cyfunction's vectorcall slot this way, and without
       tp_vectorcall_offset a call fell to its tp_call, which sizes a keyword
       dict inline. */
    for (PyMemberDef *mb = type->tp_members; mb != NULL && mb->name != NULL; mb++) {
        if (strcmp(mb->name, "__vectorcalloffset__") == 0) type->tp_vectorcall_offset = mb->offset;
        else if (strcmp(mb->name, "__dictoffset__") == 0) type->tp_dictoffset = mb->offset;
        else if (strcmp(mb->name, "__weaklistoffset__") == 0) type->tp_weaklistoffset = mb->offset;
    }

    /* A NEGATIVE basicsize (3.12) means "the base's size plus this much":
       the class's own data follows the base's, aligned, and is found with
       PyObject_GetTypeData.  abi3 PyO3 declares every pyclass this way.
       Resolved here, after the slots, because the base may come from one. */
    if (spec->basicsize < 0) {
        Py_ssize_t b = type->tp_base ? type->tp_base->tp_basicsize : (Py_ssize_t)sizeof(PyObject);
        b = (b + 15) & ~(Py_ssize_t)15;
        type->tp_basicsize = b + (-spec->basicsize);
    } else if (spec->basicsize == 0 && type->tp_base) {
        /* 0 means "same as the base", as in CPython. */
        type->tp_basicsize = type->tp_base->tp_basicsize;
    }

    /* Inherit subclass-identity flag bits (and buffer procs) from the
       base so PyXxx_Check and PyObject_GetBuffer see through heap-type
       subclassing. */
    if (type->tp_base) {
        type->tp_flags |= type->tp_base->tp_flags & Py_TPFLAGS_SUBCLASS_MASK;
        if (!type->tp_as_buffer && type->tp_base->tp_as_buffer)
            type->tp_as_buffer = type->tp_base->tp_as_buffer;
    }

    /* The allocator, as type_ready inherits it: a spec with no Py_tp_alloc
       slot gets its base's, and object's is PyType_GenericAlloc.  It was
       left NULL, so a tp_new calling ``type->tp_alloc(type, 0)'' -- what a
       C type's tp_new does -- jumped to 0. */
    if (type->tp_alloc == NULL)
        type->tp_alloc = type->tp_base && type->tp_base->tp_alloc
            ? type->tp_base->tp_alloc : PyType_GenericAlloc;
    if (type->tp_free == NULL && type->tp_base)
        type->tp_free = type->tp_base->tp_free;

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

/* Called as a user action, shimDynLoad reports a failure by raising across
   the boundary (raise_error).  Called from C inside a user action already in
   flight (grail_import_level, for an import C asked for), it must not: the
   failure becomes the pending ImportError and the caller returns NULL. */
static int g_dynload_direct = 0;
static void dynload_fail(const char *msg) {
    if (g_dynload_direct) PyErr_SetString(PyExc_ImportError, msg);
    else raise_error(msg);
}

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
            while (methods && methods[count].ml_name) count++;
            OopType sizeOop = GciI64ToOop(count);
            OopType arr = GciPerform(OOP_CLASS_ARRAY, "new:", &sizeOop, 1);
            for (int j = 0; j < count; j++) {
                OopType nameStr = GciNewString(methods[j].ml_name);
                GciStoreOop(arr, j + 1, nameStr);
            }
            if (!g_dynload_direct) check_and_raise_error();
            return arr;
        }
    }

    /* Loaded in an earlier SESSION of this process?  See g_dyn_ever. */
    for (int i = 0; i < g_dyn_ever_count; i++) {
        if (strcmp(g_dyn_ever[i].name, name) == 0 && g_dyn_ever[i].gen != g_session_gen) {
            char msg[512];
            snprintf(msg, sizeof(msg),
                "ImportError: extension module '%s' was initialised in an earlier "
                "session of this gem process and cannot be initialised again; "
                "import it in a new gem process", name);
            dynload_fail(msg);
            return OOP_NIL;
        }
    }

    /* dlopen the .so */
    void *handle = dlopen(path, RTLD_NOW | RTLD_GLOBAL);
    if (!handle) {
        char msg[1024];
        snprintf(msg, sizeof(msg), "dlopen failed: %s", dlerror());
        dynload_fail(msg);
        return OOP_NIL;
    }


    /* Look for PyInit_{leaf}.  CPython names the init function by the
       module's SIMPLE name (the last dotted component), not its
       fully-qualified package path: numpy._core._multiarray_umath is
       initialised by PyInit__multiarray_umath. */
    const char *leaf = strrchr(name, '.');
    leaf = leaf ? leaf + 1 : name;
    char initName[128];
    snprintf(initName, sizeof(initName), "PyInit_%s", leaf);
    ModuleInitFunc initFunc = (ModuleInitFunc)dlsym(handle, initName);
    if (!initFunc) {
        char msg[1024];
        snprintf(msg, sizeof(msg), "Symbol not found: %s in %s", initName, path);
        dynload_fail(msg);
        return OOP_NIL;
    }

    /* Call the init function */
    PyObject *mod = initFunc();
    if (!mod) {
        char msg[256];
        snprintf(msg, sizeof(msg), "Module init failed: %s", name);
        dynload_fail(msg);
        return OOP_NIL;
    }

    /* Cache the module */
    if (num_modules >= MAX_MODULES) {
        dynload_fail("Too many loaded modules (increase MAX_MODULES)");
        return OOP_NIL;
    }
    snprintf(module_names[num_modules], sizeof(module_names[num_modules]), "%s", name);
    module_cache[num_modules] = mod;
    num_modules++;
    if (g_dyn_ever_count < MAX_DYN_EVER) {
        snprintf(g_dyn_ever[g_dyn_ever_count].name, sizeof(g_dyn_ever[0].name), "%s", name);
        g_dyn_ever[g_dyn_ever_count].gen = g_session_gen;
        g_dyn_ever_count++;
    }

    /* Multi-phase modules: run Py_mod_exec slots (registers constants,
       creates heap types). Previously only the static-registry path did
       this, so dynamically loaded modules silently skipped their init. */
    if (run_module_exec_slots(mod) != 0) {
        num_modules--;
        if (g_dynload_direct && PyErr_Occurred()) return OOP_NIL;
        char msg[256];
        snprintf(msg, sizeof(msg), "Module exec failed: %s", name);
        dynload_fail(msg);
        return OOP_NIL;
    }

    /* Walk the method table and return an Array of method name strings */
    PyModuleDef *def = (PyModuleDef *)mod;
    PyMethodDef *methods = def->m_methods;
    int count = 0;
    /* NULL for a PyO3 module, which has no method table -- see find_method. */
    while (methods && methods[count].ml_name) count++;

    OopType sizeOop = GciI64ToOop(count);
    OopType arr = GciPerform(OOP_CLASS_ARRAY, "new:", &sizeOop, 1);
    for (int i = 0; i < count; i++) {
        OopType nameStr = GciNewString(methods[i].ml_name);
        GciStoreOop(arr, i + 1, nameStr);
    }
    if (!g_dynload_direct) check_and_raise_error();
    return arr;
}

/* __import__(name, globals, locals, fromlist, level) for C, in Grail
   (CPythonShim>>PyImport_ImportModuleLevel:...).  When that import reaches a
   .so the server hands the load back (-1 and ___pendingDynLoad): it runs
   here, as a plain call of shimDynLoad inside the user action already in
   flight, the server builds and registers the module
   (finishDynLoad:path:methodNames:), and the import is asked again.  A
   Cython module's exec imports its siblings this way, and as user actions
   numpy.random's would nest three deep, past GemStone's two in flight.  A
   load the server would do as a user action of its own is still the third. */
extern "C" PyObject *PyErr_GetRaisedException(void);        /* shim_pyo3.cc */
extern "C" void PyErr_SetRaisedException(PyObject *exc);
extern "C" PyObject *_grail_import_level(PyObject *name, PyObject *globals, PyObject *locals,
                                         PyObject *fromlist, int level) {
    if (name == NULL || !PyUnicode_Check(name)) {
        PyErr_SetString(PyExc_TypeError, "module name must be a str");
        return NULL;
    }
    for (int round = 0; round < 64; round++) {
        /* A missing argument is Python's None (pyobj_oop(NULL)), not nil. */
        OopType args[5] = { pyobj_oop(name), pyobj_oop(globals), pyobj_oop(locals),
                            pyobj_oop(fromlist), GciI64ToOop(level) };
        OopType r = GciPerform(server, "PyImport_ImportModuleLevel:globals:locals:fromlist:level:", args, 5);
        if (check_gci_error()) return NULL;
        if (r != GciI64ToOop(-1)) {
            PyObject *m = addr_to_pyobj(r);
            if (m == NULL && !PyErr_Occurred())
                PyErr_Format(PyExc_ImportError, "No module named '%s'", PyUnicode_AsUTF8(name));
            return m;
        }
        OopType req = GciPerform(server, "___pendingDynLoad", NULL, 0);
        if (check_gci_error()) return NULL;
        OopType pathOop = GciFetchOop(req, 1);
        OopType nameOop = GciFetchOop(req, 2);
        g_dynload_direct++;
        OopType methods = shimDynLoad(pathOop, nameOop);
        g_dynload_direct--;
        if (methods == OOP_NIL) {
            if (!PyErr_Occurred()) PyErr_SetString(PyExc_ImportError, "extension load failed");
            /* Nothing left in sys.modules, as CPython removes a failed load
               (a Cython module registers itself as its exec starts). */
            PyObject *exc = PyErr_GetRaisedException();
            PyObject *mods = PySys_GetObject("modules");
            OopType delArgs[2] = { mods ? pyobj_oop(mods) : OOP_NIL, nameOop };
            if (mods != NULL) {
                GciPerform(server, "___removeModule:named:", delArgs, 2);
                GciErrSType e; GciErr(&e);
            }
            PyErr_SetRaisedException(exc);
            return NULL;
        }
        OopType fin[3] = { nameOop, pathOop, methods };
        GciPerform(server, "finishDynLoad:path:methodNames:", fin, 3);
        if (check_gci_error()) return NULL;
    }
    PyErr_Format(PyExc_ImportError, "import of '%s' kept asking for extension loads",
                 PyUnicode_AsUTF8(name));
    return NULL;
}

/* ====================================================================
 * shimModuleAttrs — export module-level constants to Smalltalk
 *
 * PyModule_AddIntConstant / AddStringConstant / AddObjectRef record
 * attributes in the C-side module_attrs table. This user action returns
 * them as a flat Array { name1. value1. name2. value2. ... } so the
 * Smalltalk module wrapper can expose them as Python attributes.
 *
 * Every object attr is exported, through pyobj_oop: a Grail-backed wrapper
 * as its value, a real-layout tuple/list as a bridged copy, and a C-ONLY
 * object -- a heap type, a builtin function, a capsule, an instance of the
 * wheel's own class -- as its ShimForeignObject proxy.  Only the Grail value
 * types used to be exported and C-only objects were skipped ("no OOP at
 * offset 16"), which predates the foreign proxy.  PyO3 exports its classes
 * and functions this way, so ``from pydantic_core._pydantic_core import
 * SchemaValidator'' found nothing (docs/Support_Pydantic.md, W3a).
 * ==================================================================== */

static int is_exportable_pyobj(PyObject *obj) {
    return obj != NULL && plausible_pyobj(obj);
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
        if (a->type == ModuleAttr::ATTR_OBJECT && !is_exportable_pyobj(a->obj_val))
            continue;
        exportable++;
    }
    /* ...plus the module's __dict__, as ONE marked pair that
       CPythonShim>>moduleAttrs: expands.  numpy publishes most of its names
       (_ArrayFunctionDispatcher, every ufunc) with PyDict_SetItemString into
       PyModule_GetDict, never through PyModule_AddObject, so without it
       ``from numpy._core._multiarray_umath import ...'' found nothing. */
    PyObject *modDict = (idx < 0) ? NULL : module_attrs[idx].dict;
    if (modDict != NULL) exportable++;

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
                if (!is_exportable_pyobj(a->obj_val)) continue;
                valOop = pyobj_oop(a->obj_val);
                break;
            default:
                continue;
        }
        GciStoreOop(arr, slot++, GciNewString(a->name));
        GciStoreOop(arr, slot++, valOop);
    }
    if (modDict != NULL) {
        GciStoreOop(arr, slot++, GciNewString("___grailShimModuleDict___"));
        GciStoreOop(arr, slot++, pyobj_oop(modDict));
    }
    check_and_raise_error();
    return arr;
}

/* ====================================================================
 * shimFunctionObject — the builtin_function_or_method for one function of
 * a dynamically loaded module, as a raw address (or nil if there is none)
 *
 * Grail exposes a C module's functions as METHODS of the module class
 * (CPythonShim class>>loadDynamicModule:fromPath:), so ``mod.f'' is a Grail
 * BoundMethod, and passed back into C it crossed as a plain wrapper.  C code
 * that tests the type -- numpy's add_docstring requires
 * ``Py_TYPE(obj) == &PyCFunction_Type'' before it writes ml_doc -- refused
 * it.  CPythonShim>>wrap: asks here instead, and hands C the function
 * object CPython would have, over the module's own PyMethodDef.
 *
 * One object per PyMethodDef, made on first request and kept: a docstring
 * add_docstring writes lands in the shared PyMethodDef either way, and C
 * that compares function pointers sees the same one every time.
 * ==================================================================== */

static PyMethodDef **g_fn_defs = NULL;
static PyObject   **g_fn_objs = NULL;
static int g_fn_count = 0, g_fn_cap = 0;

static OopType shimFunctionObject(OopType modOop, OopType nameOop) {
    char modName[256], methName[256];
    fetch_string(modOop, modName, sizeof(modName));
    fetch_string(nameOop, methName, sizeof(methName));

    PyObject *module = get_or_load_module(modName);
    if (module == NULL) return OOP_NIL;
    int idx = find_method(module, methName);
    if (idx < 0) return OOP_NIL;
    PyMethodDef *ml = &((PyModuleDef *)module)->m_methods[idx];

    for (int i = 0; i < g_fn_count; i++)
        if (g_fn_defs[i] == ml)
            return GciI64ToOop((int64)(intptr_t)g_fn_objs[i]);

    PyObject *fn = PyCMethod_New(ml, module, PyUnicode_FromString(modName), NULL);
    if (fn == NULL) { PyErr_Clear(); return OOP_NIL; }
    if (g_fn_count == g_fn_cap) {
        int cap = g_fn_cap ? g_fn_cap * 2 : 64;
        PyMethodDef **defs = (PyMethodDef **)realloc(g_fn_defs, cap * sizeof(*defs));
        PyObject **objs = (PyObject **)realloc(g_fn_objs, cap * sizeof(*objs));
        if (defs) g_fn_defs = defs;
        if (objs) g_fn_objs = objs;
        if (defs == NULL || objs == NULL)
            return GciI64ToOop((int64)(intptr_t)fn);   /* uncached, still right */
        g_fn_cap = cap;
    }
    g_fn_defs[g_fn_count] = ml;
    g_fn_objs[g_fn_count++] = fn;
    return GciI64ToOop((int64)(intptr_t)fn);
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

/* A wheel's own exception INSTANCE: foreign, not a type, and its type
   carries BASE_EXC_SUBCLASS. */
static int is_foreign_exc_instance(PyObject *v) {
    if (v == NULL || !is_foreign(v) || is_foreign_type(v)) return 0;
    return v->ob_type != NULL && (v->ob_type->tp_flags & Py_TPFLAGS_BASE_EXC_SUBCLASS);
}
/* An exception object in C's own layout -- a raised-exception token or a
   wheel's instance -- whose traceback is a struct field (shim_pyo3.cc). */
extern "C" int _grail_is_c_exception(PyObject *o) { return is_foreign_exc_instance(o); }

/* str(exc) for such an instance, in C: the nearest tp_str on its type chain
   (PyO3 fills it from the class's __str__), else args[0] when that is a
   str.  The shim does no slot inheritance, hence the walk. */
extern "C" void _grail_foreign_exc_text(PyObject *v, char *buf, size_t cap);
static void foreign_exc_text(PyObject *v, char *buf, size_t cap) {
    buf[0] = '\0';
    for (PyTypeObject *t = v->ob_type; t != NULL; t = t->tp_base) {
        if (t->tp_str == NULL) continue;
        PyObject *s = t->tp_str(v);
        const char *u = s ? PyUnicode_AsUTF8(s) : NULL;
        if (u) { snprintf(buf, cap, "%s", u); return; }
        PyErr_Clear();
        break;
    }
    ShimBaseExceptionObject *e = (ShimBaseExceptionObject *)v;
    if (e->args && PyTuple_Check(e->args) && PyTuple_Size(e->args) > 0) {
        PyObject *a0 = PyTuple_GetItem(e->args, 0);
        const char *u = (a0 && PyUnicode_Check(a0)) ? PyUnicode_AsUTF8(a0) : NULL;
        if (u) snprintf(buf, cap, "%s", u);
    }
}
extern "C" void _grail_foreign_exc_text(PyObject *v, char *buf, size_t cap) {
    foreign_exc_text(v, buf, cap);
}

/* The import PyO3 uses for EVERY module it touches -- py.import("decimal")
   while building pydantic_core's serializer tables, among others.  It was a
   shim_numpy.cc stub answering NULL with no error set, which PyO3 reports as
   "attempted to fetch exception but none was set" and then panics on.

   Only a Grail-backed name is read: the stock (non-abi3) wheel can hand over
   a str whose layout the shim cannot read yet (W5), and reading that one
   produced a garbage module name and an unwinding import.  Anything else
   raises ImportError, which is at least an error a caller can see. */
extern "C" PyObject *PyImport_Import(PyObject *name) {
    if (name == NULL || is_foreign(name) || is_real_layout(name) || !PyUnicode_Check(name)) {
        PyErr_SetString(PyExc_ImportError, "PyImport_Import: module name is not a str the Grail shim can read");
        return NULL;
    }
    const char *n = PyUnicode_AsUTF8(name);
    if (n == NULL) return NULL;
    return PyImport_ImportModule(n);
}

/* ====================================================================
 * Calling and reading a wheel's own object FROM GRAIL
 *
 * A foreign object crosses into Grail as a ShimForeignObject.  These two
 * user actions are how Python code in the gem uses one: call it
 * (SchemaValidator(schema), validator.validate_python(x)) and read its
 * attributes (the bound method validate_python itself).  Arguments arrive
 * as the addresses CPythonShim>>wrap: answers, exactly as shimCallKw's do.
 * docs/Support_Pydantic.md, Phase 3.
 * ==================================================================== */

static OopType shimCallObject(OopType ptrOop, OopType posArrOop,
                              OopType kwNamesOop, OopType kwValsOop)
{
    PyObject *callable = (PyObject *)(intptr_t)GciOopToI64(ptrOop);
    if (!plausible_pyobj(callable) || !plausible_pyobj(callable->ob_type)) {
        PyErr_SetString(PyExc_TypeError, "foreign object is not callable (not a live PyObject*)");
        check_and_raise_error();
        return OOP_NIL;
    }
    Py_ssize_t npos = (Py_ssize_t)GciFetchSize_(posArrOop);
    Py_ssize_t nkw = (Py_ssize_t)GciFetchSize_(kwNamesOop);
    PyObject *tuple = PyTuple_New(npos);
    if (!tuple) { raise_error("shimCallObject: could not allocate args"); return OOP_NIL; }
    for (Py_ssize_t i = 0; i < npos; i++) {
        OopType idxOop = GciI64ToOop(i + 1);
        OopType addrOop = GciFetchOop(posArrOop, GciOopToI64(idxOop));
        /* A Grail list or tuple argument as a real-layout copy: the tuple is
           real already, so call_foreign's to_real_tuple would not look at its
           elements (real_layout_arg). */
        PyTuple_SetItem(tuple, i, real_layout_arg((PyObject *)(intptr_t)GciOopToI64(addrOop), 1));
    }
    PyObject *kwargs = NULL;
    if (nkw > 0) {
        kwargs = PyDict_New();
        for (Py_ssize_t i = 0; i < nkw; i++) {
            OopType idxOop = GciI64ToOop(i + 1);
            OopType nameOop = GciFetchOop(kwNamesOop, GciOopToI64(idxOop));
            OopType valAddrOop = GciFetchOop(kwValsOop, GciOopToI64(idxOop));
            OopType nameAddr = GciPerform(server, "PyUnicode_FromString:", &nameOop, 1);
            PyDict_SetItem(kwargs, addr_to_pyobj(nameAddr),
                           real_layout_arg((PyObject *)(intptr_t)GciOopToI64(valAddrOop), 0));
        }
    }
    PyErr_Clear();
    PyObject *result = PyObject_Call(callable, tuple, kwargs);
    buffer_cache_clear();
    if (result == NULL && PyErr_Occurred() == NULL && getenv("GRAIL_SHIM_DIAG")) {
        fprintf(stderr, "SHIM-DIAG: call of %s answered NULL with no error set\n",
                Py_TYPE(callable) && Py_TYPE(callable)->tp_name ? Py_TYPE(callable)->tp_name : "?");
        fflush(stderr);
    }
    check_and_raise_error();
    if (!result) return OOP_NIL;
    OopType res = pyobj_oop(result);
    check_and_raise_error();
    return res;
}

static OopType shimForeignGetAttr(OopType ptrOop, OopType nameOop)
{
    char name[256];
    fetch_string(nameOop, name, sizeof(name));
    PyObject *obj = (PyObject *)(intptr_t)GciOopToI64(ptrOop);
    PyErr_Clear();
    /* Never dereference what cannot be a PyObject* -- a proxy for a pointer
       that died, or a synthetic one (ShimForeignObjectTestCase builds proxies
       at 0x1000 to test the name answers).  A miss, so the proxy falls back
       to the name it captured; before this it segfaulted a whole shard. */
    if (!plausible_pyobj(obj) || !plausible_pyobj(obj->ob_type)) {
        PyErr_Format(PyExc_AttributeError, "foreign object has no attribute '%s'", name);
        check_and_raise_error();
        return OOP_NIL;
    }
    /* ``obj.__class__'' is its type, as for every CPython object -- the
       generic getattr finds it on no dict.  CPython's dataclasses reads
       ``f.default.__class__.__hash__'' for every field, and pydantic gives
       fields defaults that are pydantic_core objects (PydanticUndefined). */
    PyObject *v;
    if (strcmp(name, "__class__") == 0) {
        v = (PyObject *)obj->ob_type;
        Py_INCREF(v);
    } else if (is_subtype_body(obj)) {
        /* Grail asks for the BASE's part of a subclass instance, having looked
           in the Python classes itself: the C walk, not the subtype mirror's
           tp_getattro, which would ask Grail again (recarray's
           __getattribute__ ran round that loop until the user actions ran
           out). */
        v = foreign_generic_getattr(obj, name);
    } else {
        v = foreign_getattr_c(obj, name);
    }
    if (v == NULL && !PyErr_Occurred()) {
        PyTypeObject *t = is_foreign_type(obj) ? (PyTypeObject *)obj : obj->ob_type;
        PyErr_Format(PyExc_AttributeError, "'%s' object has no attribute '%s'",
                     (t && t->tp_name) ? t->tp_name : "?", name);
    }
    buffer_cache_clear();
    check_and_raise_error();
    if (!v) return OOP_NIL;
    OopType res = pyobj_oop(v);
    check_and_raise_error();
    return res;
}

/* ``proxy.attr = value'' from Grail (ShimForeignObject>>___pyAttrStore___:put:):
   the value arrives as its wrap: address, and is stored the way
   PyObject_SetAttrString stores on a wheel's own object -- tp_dict for a
   type, otherwise its descriptor, tp_setattro or instance dict.  Answers
   true when stored; a refusal (a read-only member, a setter that raised)
   raises.  FALSE, with no error, means C has nowhere to put it -- an
   instance with no descriptor of that name, no tp_setattro and no
   __dict__ -- and the proxy keeps it itself, which is all a store reached
   before C was asked. */
static OopType shimForeignSetAttr(OopType ptrOop, OopType nameOop, OopType valAddrOop)
{
    char name[256];
    fetch_string(nameOop, name, sizeof(name));
    PyObject *obj = (PyObject *)(intptr_t)GciOopToI64(ptrOop);
    PyObject *value = (PyObject *)(intptr_t)GciOopToI64(valAddrOop);
    PyErr_Clear();
    if (!plausible_pyobj(obj) || !plausible_pyobj(obj->ob_type) || !plausible_pyobj(value)) {
        PyErr_Format(PyExc_AttributeError, "foreign object has no attribute '%s'", name);
        check_and_raise_error();
        return OOP_NIL;
    }
    if (is_foreign(obj) && !is_foreign_type(obj) && foreign_dict_slot(obj) == NULL
            && !foreign_has_data_descr(obj->ob_type, name)
            && (obj->ob_type->tp_setattro == NULL
                || obj->ob_type->tp_setattro == PyObject_GenericSetAttr))
        return OOP_FALSE;
    int rc = PyObject_SetAttrString(obj, name, value);
    if (rc < 0 && !PyErr_Occurred())
        PyErr_Format(PyExc_AttributeError, "cannot set attribute '%s'", name);
    buffer_cache_clear();
    check_and_raise_error();
    return OOP_TRUE;
}

/* ``self <op> a'' from Grail (ShimForeignObject's dunder methods): the
   operator by its dunder name, the operands as wrap: addresses (0 when
   absent).  Answers the result; nil when there is no answer here (an
   inherited identity __hash__); raises what the slot raised. */
static OopType shimForeignOp(OopType ptrOop, OopType nameOop, OopType aAddrOop, OopType bAddrOop)
{
    char name[64];
    fetch_string(nameOop, name, sizeof(name));
    PyObject *self = (PyObject *)(intptr_t)GciOopToI64(ptrOop);
    int64 aa = GciOopToI64(aAddrOop), ba = GciOopToI64(bAddrOop);
    PyObject *a = aa ? real_layout_arg((PyObject *)(intptr_t)aa, 0) : NULL;
    PyObject *b = ba ? real_layout_arg((PyObject *)(intptr_t)ba, 0) : NULL;
    PyErr_Clear();
    const ForeignOpDef *op = foreign_op_named(name);
    if (op == NULL || !plausible_pyobj(self) || !plausible_pyobj(self->ob_type)) {
        PyErr_Format(PyExc_TypeError, "no foreign operator '%s'", name);
        check_and_raise_error();
        return OOP_NIL;
    }
    PyObject *r = foreign_op_invoke(self, op, a, b);
    buffer_cache_clear();
    check_and_raise_error();
    if (r == NULL) return OOP_NIL;
    OopType res = pyobj_oop(r);
    check_and_raise_error();
    return res;
}

/* str() / repr() of a wheel's own object, asked by Grail
   (ShimForeignObject>>__str__ / __repr__): its own tp_str / tp_repr, the way
   C's PyObject_Str already reaches it.  nil when the pointer is not a
   plausible object or the type has no slot, and the proxy then renders
   itself -- before this, every str() of a foreign object was the proxy's
   ``<ShimForeignObject ...>'', so a pydantic_core ValidationError built by
   from_exception_data printed as one. */
static OopType shimForeignStr(OopType ptrOop, OopType reprOop)
{
    PyObject *obj = (PyObject *)(intptr_t)GciOopToI64(ptrOop);
    if (!plausible_pyobj(obj) || !plausible_pyobj(obj->ob_type)) return OOP_NIL;
    PyErr_Clear();
    PyObject *r = foreign_str(obj, reprOop == OOP_TRUE);
    buffer_cache_clear();
    if (r == NULL) { PyErr_Clear(); return OOP_NIL; }
    OopType res = pyobj_oop(r);
    check_and_raise_error();
    return res;
}

/* isinstance() / issubclass() against a wheel's own TYPE, asked by Grail
   (ShimForeignObject>>___foreignTypeCheck___:).  typeOop is the proxied type's
   pointer; objOop is the candidate's pointer, or 0 for a Grail object, which
   is never an instance of a PyO3 class.  With wantSubclass the candidate is
   itself a type and the question is PyType_IsSubtype.  Answers nil when the
   pointer is not a type at all -- the caller then raises CPython's
   ``arg 2 must be a type'' TypeError -- else true / false.  fastapi's
   jsonable_encoder asks ``isinstance(obj, PydanticUndefinedType)'' of every
   value it encodes. */
static OopType shimForeignTypeCheck(OopType objOop, OopType typeOop, OopType wantSubclassOop)
{
    PyObject *t = (PyObject *)(intptr_t)GciOopToI64(typeOop);
    if (!plausible_pyobj(t) || !plausible_pyobj(t->ob_type) || !is_foreign_type(t))
        return OOP_NIL;
    int64_t ptr = GciOopToI64(objOop);
    if (ptr == 0) return OOP_FALSE;
    PyObject *o = (PyObject *)(intptr_t)ptr;
    if (!plausible_pyobj(o) || !plausible_pyobj(o->ob_type)) return OOP_FALSE;
    PyTypeObject *sub;
    if (wantSubclassOop == OOP_TRUE) {
        if (!is_foreign_type(o)) return OOP_FALSE;
        sub = (PyTypeObject *)o;
    } else {
        sub = o->ob_type;
    }
    if (sub == (PyTypeObject *)t) return OOP_TRUE;
    return PyType_IsSubtype(sub, (PyTypeObject *)t) ? OOP_TRUE : OOP_FALSE;
}

/* numpy's public functions are _ArrayFunctionDispatcher objects, and calling
   one from Grail cost two user-action re-entries: C calls the Python
   dispatcher back for the relevant arguments, then the Python implementation.
   A numpy function written in Python that calls another numpy function needs a
   third, which GemStone refuses (INT_MAX_USER_ACTION, error 2138), so
   np.linspace failed.  Grail now does the dispatcher's work itself
   (ShimForeignObject>>___callArrayDispatch:args:kwargs:), and these two
   answer what it needs from C.

   shimArrayDispatcherParts: { relevant_arg_func. default_impl } of a
   dispatcher, or nil.  numpy keeps both in the object, at offsets 32 and 40
   (arrayfunction_override.c, PyArray_ArrayFunctionDispatcherObject: HEAD,
   vectorcall, dict, relevant_arg_func, default_impl), and exposes only the
   second, as the _implementation getset.  The layout is checked against that
   getset and the dict offset before it is trusted.  nil also for a like=
   dispatcher, which has no relevant_arg_func. */
static OopType shimArrayDispatcherParts(OopType objOop)
{
    PyObject *o = (PyObject *)(intptr_t)GciOopToI64(objOop);
    if (!plausible_pyobj(o) || !plausible_pyobj(o->ob_type) || !is_foreign(o)) return OOP_NIL;
    PyTypeObject *t = o->ob_type;
    if (t->tp_name == NULL || strcmp(t->tp_name, "numpy._ArrayFunctionDispatcher") != 0
            || t->tp_basicsize < 48 || t->tp_dictoffset != 24)
        return OOP_NIL;
    PyObject *rel = *(PyObject **)((char *)o + 32);
    PyObject *impl = *(PyObject **)((char *)o + 40);
    if (rel == NULL || impl == NULL || !plausible_pyobj(rel) || !plausible_pyobj(impl))
        return OOP_NIL;
    PyObject *viaGetset = NULL;
    for (PyGetSetDef *g = t->tp_getset; g != NULL && g->name != NULL; g++)
        if (strcmp(g->name, "_implementation") == 0 && g->get != NULL) {
            viaGetset = g->get(o, g->closure);
            break;
        }
    if (viaGetset == NULL) { PyErr_Clear(); return OOP_NIL; }
    int same = viaGetset == impl;
    Py_DECREF(viaGetset);
    if (!same) return OOP_NIL;
    OopType sizeOop = GciI64ToOop(2);
    OopType arr = GciPerform(OOP_CLASS_ARRAY, "new:", &sizeOop, 1);
    GciStoreOop(arr, 1, pyobj_oop(rel));
    GciStoreOop(arr, 2, pyobj_oop(impl));
    check_and_raise_error();
    return arr;
}

/* Whether t itself (not a base) defines name: in its dict, its method table,
   its getsets or its members. */
static int type_defines_name(PyTypeObject *t, const char *name)
{
    if (t->tp_dict != NULL && PyDict_GetItemString(t->tp_dict, name) != NULL) return 1;
    for (PyMethodDef *m = t->tp_methods; m != NULL && m->ml_name != NULL; m++)
        if (strcmp(m->ml_name, name) == 0) return 1;
    for (PyGetSetDef *g = t->tp_getset; g != NULL && g->name != NULL; g++)
        if (strcmp(g->name, name) == 0) return 1;
    for (PyMemberDef *d = t->tp_members; d != NULL && d->name != NULL; d++)
        if (strcmp(d->name, name) == 0) return 1;
    return 0;
}

/* shimArrayFunctionKind: how numpy's dispatcher treats a wheel object passed
   as a relevant argument (arrayfunction_override.c, get_array_function): 0
   when its type has no __array_function__, 1 when the one it inherits is
   ndarray's -- the default, which lets the dispatcher call the
   implementation directly -- and 2 for any other, which must go to C.  An
   object that cannot be read answers 2, so the C path decides. */
static OopType shimArrayFunctionKind(OopType objOop)
{
    PyObject *o = (PyObject *)(intptr_t)GciOopToI64(objOop);
    if (!plausible_pyobj(o) || !plausible_pyobj(o->ob_type)) return GciI64ToOop(2);
    for (PyTypeObject *t = o->ob_type; t != NULL; t = t->tp_base)
        if (type_defines_name(t, "__array_function__"))
            return GciI64ToOop(t->tp_name != NULL && strcmp(t->tp_name, "numpy.ndarray") == 0 ? 1 : 2);
    return GciI64ToOop(0);
}

/* tp_new of a Grail class's type mirror: ``cls.__new__(cls)'' in Grail
   (CPythonShim>>PyType_GenericNew:).  pydantic_core builds a model
   instance this way when the model has no custom __init__ -- it reads the
   class's tp_new slot and calls it, then sets __dict__ through the generic
   setattr -- and a mirror without one answered ``base type without
   tp_new'' (W1, the half of it a type check does not cover). */
static PyObject *grail_mirror_tp_new(PyTypeObject *subtype, PyObject *args, PyObject *kwds) {
    (void)args; (void)kwds;
    OopType cls = pyobj_oop((PyObject *)subtype);
    OopType r = GciPerform(server, "PyType_GenericNew:", &cls, 1);
    if (check_gci_error()) return NULL;
    return addr_to_pyobj(r);
}

/* tp_alloc of a subtype mirror: the Grail half and the body together
   (CPythonShim>>PyType_AllocForeignSubclass:type:basicSize:).  numpy makes
   every array through ``subtype->tp_alloc(subtype, 0)'', so a view, a slice
   or a ufunc result of a subclass instance comes back here too. */
static PyObject *grail_subtype_alloc(PyTypeObject *t, Py_ssize_t nitems) {
    if (t->tp_itemsize != 0 && nitems != 0) {
        PyErr_Format(PyExc_TypeError,
                     "Grail cannot yet make a variable-size instance of '%.200s'", t->tp_name);
        return NULL;
    }
    OopType args[3] = { (OopType)(uintptr_t)t->tp_weaklist,
                        GciI64ToOop((int64)(intptr_t)t),
                        GciI64ToOop((int64)t->tp_basicsize) };
    OopType r = GciPerform(server, "PyType_AllocForeignSubclass:type:basicSize:", args, 3);
    if (check_gci_error() || r == OOP_NIL) return NULL;   /* nil: the guard set the error */
    return addr_to_pyobj(r);
}

/* tp_free of a subtype mirror: nothing.  The body is gcMalloc'd memory its
   Grail half holds; GemStone frees it with the half. */
static void grail_subtype_free(void *p) { (void)p; }

/* What the PYTHON classes of a subtype mirror's class define for name --
   asked of the Grail half (or of the class, for a mirror) with the fall back
   to the base type turned off (CPythonShim>>foreignSubclassGetAttr:name:), so
   the base's part is read here, in C.  That keeps a C caller's attribute read
   on a subclass instance -- numpy's __array_ufunc__ / __array_wrap__ /
   __array_priority__ probes, made while it is itself inside a user action --
   from needing another user action, which GemStone allows two of in flight.
   *found is 0 for a miss. */
static PyObject *subtype_python_attr(OopType target, const char *name, int *found) {
    OopType args[2] = { target, GciNewString(name) };
    OopType r = GciPerform(server, "foreignSubclassGetAttr:name:", args, 2);
    *found = 1;
    if (check_gci_error()) return NULL;
    if (r == OOP_FALSE) { *found = 0; return NULL; }
    if (r == OOP_NIL) {
        if (!PyErr_Occurred())
            PyErr_Format(PyExc_AttributeError, "attribute '%.200s' could not be read", name);
        return NULL;
    }
    return addr_to_pyobj(r);
}

static PyObject *foreign_generic_getattr(PyObject *obj, const char *name);
static int foreign_generic_setattr(PyObject *obj, const char *name, PyObject *value);
static int foreign_has_data_descr(PyTypeObject *t, const char *name);

/* tp_getattro of a subtype mirror: the Python classes and the half's own
   attributes first, then the base type's, as CPython's MRO walk has them. */
static PyObject *grail_subtype_getattro(PyObject *obj, PyObject *nameObj) {
    const char *name = PyUnicode_AsUTF8(nameObj);
    if (name == NULL) return NULL;
    int found;
    PyObject *v = subtype_python_attr(subtype_body_oop(obj), name, &found);
    if (found) return v;
    v = foreign_generic_getattr(obj, name);
    if (v == NULL && !PyErr_Occurred())
        PyErr_Format(PyExc_AttributeError, "'%.100s' object has no attribute '%.200s'",
                     Py_TYPE(obj)->tp_name, name);
    return v;
}

/* tp_setattro of a subtype mirror: a data descriptor of the base type
   (ndarray's ``shape'') is the base's to set; anything else is an attribute
   of the Grail half, as it would go to the instance dict in CPython. */
static int grail_subtype_setattro(PyObject *obj, PyObject *nameObj, PyObject *value) {
    const char *name = PyUnicode_AsUTF8(nameObj);
    if (name == NULL) return -1;
    if (foreign_has_data_descr(subtype_real_base(Py_TYPE(obj)), name))
        return foreign_generic_setattr(obj, name, value);
    OopType args[3] = { subtype_body_oop(obj), pyobj_oop(nameObj),
                        value ? pyobj_oop(value) : OOP_NIL };
    GciPerform(server, "PyObject_GenericSetAttr:name:value:", args, 3);
    if (check_gci_error()) return -1;
    return 0;
}

/* shimDataDescriptorNames: the names a C type and its bases (up to the
   shim's own static types) answer with a DATA descriptor -- every getset
   and every member, since CPython's getset_descriptor and member_descriptor
   both define __set__ and a read-only one refuses the store ("readonly
   attribute") rather than letting the instance dict shadow it --
   space-separated.  An attribute store on an
   instance of a Python subclass of the type goes to C for these (ndarray's
   ``shape'', ``dtype''), and to the Grail half for every other name
   (ShimForeignSubclass>>___pyAttrStore___:put:). */
static OopType shimDataDescriptorNames(OopType typeOop)
{
    PyTypeObject *t = (PyTypeObject *)(intptr_t)GciOopToI64(typeOop);
    char buf[8192];
    size_t used = 0;
    buf[0] = '\0';
    for (; t != NULL && plausible_pyobj((PyObject *)t) && !is_shim_type(t); t = t->tp_base) {
        for (PyGetSetDef *gs = t->tp_getset; gs && gs->name; gs++) {
            int n = snprintf(buf + used, sizeof(buf) - used, "%s ", gs->name);
            if (n < 0 || (size_t)n >= sizeof(buf) - used) break;
            used += (size_t)n;
        }
        for (PyMemberDef *m = t->tp_members; m && m->name; m++) {
            int n = snprintf(buf + used, sizeof(buf) - used, "%s ", m->name);
            if (n < 0 || (size_t)n >= sizeof(buf) - used) break;
            used += (size_t)n;
        }
    }
    return GciNewString(buf);
}

/* shimForeignDirNames: the names dir() finds in C for a wheel's object, as a
   list -- for a type, its own names and its C bases' (stopping at the
   shim's builtin types, whose names Grail adds); for an instance, its
   instance dict's keys and then its type's.  ShimForeignObject>>__dir__. */
static OopType shimForeignDirNames(OopType ptrOop)
{
    PyObject *obj = (PyObject *)(intptr_t)GciOopToI64(ptrOop);
    if (!plausible_pyobj(obj) || !plausible_pyobj(obj->ob_type)) return OOP_NIL;
    PyErr_Clear();
    PyObject *names = PyList_New(0);
    if (names == NULL) { PyErr_Clear(); return OOP_NIL; }
    PyTypeObject *t = obj->ob_type;
    if (is_foreign_type(obj)) {
        t = (PyTypeObject *)obj;
    } else {
        PyObject *d = foreign_instance_dict(obj, 0);
        PyObject *keys = d != NULL ? PyDict_Keys(d) : NULL;
        for (Py_ssize_t i = 0; keys != NULL && i < PyList_Size(keys); i++)
            PyList_Append(names, PyList_GetItem(keys, i));
        Py_XDECREF(keys);
    }
    for (; t != NULL && plausible_pyobj((PyObject *)t) && !is_shim_type(t); t = t->tp_base)
        foreign_type_own_names(t, names);
    PyErr_Clear();
    buffer_cache_clear();
    OopType res = pyobj_oop(names);
    check_and_raise_error();
    return res;
}

/* The PyTypeObject geometry CPythonShim>>typeMirrorFor: builds a mirror
   with: { size. tp_name. tp_basicsize. tp_flags. tp_base. tp_cache.
   tp_weaklist. tp_doc. tp_new }, as offsets from the struct start, then the
   address of grail_mirror_tp_new, then what a subtype mirror adds.  (The magic,
   GRAIL_MIRROR_MAGIC, is a literal on the Smalltalk side: it is wider than a
   SmallInteger.) */
static OopType shimTypeMirrorLayout(OopType ignored)
{
    (void)ignored;
    const int64 vals[] = {
        (int64)sizeof(PyTypeObject),
        (int64)offsetof(PyTypeObject, tp_name),
        (int64)offsetof(PyTypeObject, tp_basicsize),
        (int64)offsetof(PyTypeObject, tp_flags),
        (int64)offsetof(PyTypeObject, tp_base),
        (int64)offsetof(PyTypeObject, tp_cache),
        (int64)offsetof(PyTypeObject, tp_weaklist),
        (int64)offsetof(PyTypeObject, tp_doc),
        (int64)offsetof(PyTypeObject, tp_new),
        (int64)(intptr_t)grail_mirror_tp_new,
        /* For a subtype mirror (CPythonShim>>___buildSubtypeMirrorFor:base:):
           11-13 tp_alloc / tp_free / tp_subclasses, 14-16 the allocator, the
           free and the marker. */
        (int64)offsetof(PyTypeObject, tp_alloc),
        (int64)offsetof(PyTypeObject, tp_free),
        (int64)offsetof(PyTypeObject, tp_subclasses),
        (int64)(intptr_t)grail_subtype_alloc,
        (int64)(intptr_t)grail_subtype_free,
        (int64)GRAIL_SUBTYPE_MAGIC,
        /* 17-20: tp_getattro / tp_setattro, and their trampolines. */
        (int64)offsetof(PyTypeObject, tp_getattro),
        (int64)offsetof(PyTypeObject, tp_setattro),
        (int64)(intptr_t)grail_subtype_getattro,
        (int64)(intptr_t)grail_subtype_setattro,
        /* 21-22: tp_mro, and PyTuple_Type -- a subtype mirror's tp_mro is a
           real-layout tuple numpy reads inline (_descr_from_subtype). */
        (int64)offsetof(PyTypeObject, tp_mro),
        (int64)(intptr_t)&PyTuple_Type,
        /* 23-26: tp_iter / tp_iternext, and the shim's PyObject_GetIter /
           PyIter_Next, which a type mirror of a class with __iter__ /
           __next__ carries as those slots (CPythonShim>>
           ___buildTypeMirrorFor:).  Both ask the server for a Grail object,
           never a slot, and PyIter_Next answers NULL with no error at the
           end, as tp_iternext must. */
        (int64)offsetof(PyTypeObject, tp_iter),
        (int64)offsetof(PyTypeObject, tp_iternext),
        (int64)(intptr_t)PyObject_GetIter,
        (int64)(intptr_t)PyIter_Next,
    };
    int n = (int)(sizeof(vals) / sizeof(vals[0]));
    OopType sizeOop = GciI64ToOop(n);
    OopType arr = GciPerform(OOP_CLASS_ARRAY, "new:", &sizeOop, 1);
    for (int i = 0; i < n; i++) GciStoreOop(arr, i + 1, GciI64ToOop(vals[i]));
    check_and_raise_error();
    return arr;
}

/* object.__setattr__ / object.__dict__ as C sees them -- the generic slots a
   pyclass inherits, and what pydantic_core calls DIRECTLY (force_setattr) to
   give a validated model its __dict__ and __pydantic_fields_set__ without
   running BaseModel.__setattr__.  They were shim_numpy.cc stubs answering
   success and doing nothing, so every model came out with no fields.  On a
   Grail object they run object's own __setattr__:_: / __delattr__:
   NON-virtually (CPythonShim>>PyObject_GenericSetAttr:name:value:); a NULL
   value is a delete, as in CPython. */
extern "C" int PyObject_GenericSetAttr(PyObject *obj, PyObject *name, PyObject *value) {
    if (obj == NULL || name == NULL) return -1;
    if (is_foreign(obj)) {
        const char *n = PyUnicode_AsUTF8(name);
        if (n == NULL) return -1;
        return foreign_generic_setattr(obj, n, value);
    }
    OopType args[3] = { pyobj_oop(obj), pyobj_oop(name), value ? pyobj_oop(value) : OOP_NIL };
    GciPerform(server, "PyObject_GenericSetAttr:name:value:", args, 3);
    if (check_gci_error()) return -1;
    return 0;
}

extern "C" PyObject *PyObject_GenericGetDict(PyObject *obj, void *context) {
    (void)context;
    /* A wheel's own instance: the dict at its tp_dictoffset, made on first
       read as CPython makes it.  Asking PyObject_GetAttrString here found the
       type's ``__dict__'' getset -- this function -- and recursed until the C
       stack overflowed (numpy's _ArrayFunctionDispatcher, under
       functools.wraps). */
    if (is_foreign(obj)) {
        PyObject *d = foreign_instance_dict(obj, 1);
        if (d == NULL) {
            if (!PyErr_Occurred())
                PyErr_SetString(PyExc_AttributeError, "This object has no __dict__");
            return NULL;
        }
        Py_INCREF(d);
        return d;
    }
    return PyObject_GetAttrString(obj, "__dict__");
}

/* isinstance / issubclass, the protocol PyO3 uses for every downcast it
   cannot settle by type identity.  They were shim_numpy.cc stubs answering
   0.  Between C types (a wheel's own, the shim's statics, Grail-class
   mirrors) the tp_base chain answers; otherwise the server's builtins do. */
/* Is t a type object C can answer subtype questions about by tp_base alone:
   a wheel's own type, or the subtype mirror of a Python class built on one? */
static int c_answers_subtype(PyObject *t) {
    return t != NULL && (is_foreign_type(t)
        || (is_type_mirror(t) && is_subtype_mirror((PyTypeObject *)t)));
}

extern "C" int PyObject_IsInstance(PyObject *obj, PyObject *cls) {
    if (obj == NULL || cls == NULL) return -1;
    if (cls->ob_type == &PyType_Type && (is_foreign(cls) || is_type_mirror(cls))
            && obj->ob_type != NULL && PyType_IsSubtype(obj->ob_type, (PyTypeObject *)cls))
        return 1;
    /* A wheel's own type has a C metatype, so no Python __instancecheck__
       can answer for it, and a Grail object is an instance of it only as the
       body of a subclass instance, whose ob_type's tp_base chain reaches it:
       the NO is C's to give too.  Asked of the server, Grail's isinstance
       asked C again through another user action -- the third in flight, and
       GemStone allows two (numpy's first ndarray.all() failed so). */
    if (is_foreign_type(cls) && obj->ob_type != NULL)
        return PyType_IsSubtype(obj->ob_type, (PyTypeObject *)cls);
    OopType args[2] = { pyobj_oop(obj), pyobj_oop(cls) };
    OopType r = GciPerform(server, "PyObject_IsInstance:cls:", args, 2);
    if (check_gci_error()) return -1;
    return r == OOP_TRUE ? 1 : 0;
}

extern "C" int PyObject_IsSubclass(PyObject *derived, PyObject *cls) {
    if (derived == NULL || cls == NULL) return -1;
    if (derived->ob_type == &PyType_Type && cls->ob_type == &PyType_Type
            && PyType_IsSubtype((PyTypeObject *)derived, (PyTypeObject *)cls))
        return 1;
    /* Both C's to answer -- see PyObject_IsInstance. */
    if (is_foreign_type(cls) && c_answers_subtype(derived))
        return PyType_IsSubtype((PyTypeObject *)derived, (PyTypeObject *)cls);
    OopType args[2] = { pyobj_oop(derived), pyobj_oop(cls) };
    OopType r = GciPerform(server, "PyObject_IsSubclass:cls:", args, 2);
    if (check_gci_error()) return -1;
    return r == OOP_TRUE ? 1 : 0;
}

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
                    /* Report anything the setter actually signalled first, so
                       the real cause wins over the synthetic message below. */
                    check_and_raise_error();
                    if (rc < 0) {
                        /* The setter failed but signalled nothing at all --
                           neither a Python error nor a GCI error.  CPython's
                           contract says that cannot happen, but returning
                           OOP_TRUE here would report success and returning a
                           bare nil reads as an empty answer, so name it. */
                        char msg[256];
                        snprintf(msg, sizeof(msg),
                                 "AttributeError: setting %s.%s failed without "
                                 "signalling an exception", typeName, methName);
                        raise_error(msg);
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
                    check_and_raise_error();
                    
                    if (!result) return OOP_NIL;
                    if (returnCPtr)
                        return GciI64ToOop(result == Py_None ? 0 : (intptr_t)result);
                    OopType res = pyobj_oop(result);
                    check_and_raise_error();
                    return res;
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
                            /* Honor returnCPtr here too: Match.re is a
                               _Py_T_OBJECT member holding a heap
                               PatternObject, which has no OOP slot —
                               pyobj_oop would manufacture a foreign-object
                               wrapper instead of the raw pointer the
                               SrePattern wrapper expects. */
                            PyObject *v = *(PyObject **)base;
                            if (!v) return OOP_NIL;
                            if (returnCPtr)
                                return GciI64ToOop(v == Py_None ? 0
                                                   : (intptr_t)v);
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
    check_and_raise_error();

    if (!result) return OOP_NIL;

    /* Return value: either a C pointer or a GemStone OOP. Py_None as a
       returned C pointer is reported as 0 — the convention used by the
       Smalltalk wrappers to mean "no match / not present". */
    if (returnCPtr)
        return GciI64ToOop(result == Py_None ? 0 : (intptr_t)result);
    OopType res = pyobj_oop(result);
    check_and_raise_error();
    return res;
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
    /* A type MIRROR -- the C face of an exception class Python defined --
       matches its own tp_base chain, which ends in the static types:
       decimal.InvalidOperation -> DecimalException -> ArithmeticError.  So
       does a wheel's OWN exception type: pydantic_core's ValidationError
       extends ValueError, and its convert_err asks exactly that of an error a
       wrap validator's Python function let through.  Unmatched, the error
       became an internal one, which a union does not catch -- ``AnyUrl | str''
       refused "/" instead of trying str (FastAPI's test_openapi_servers). */
    if (is_type_mirror(given) || is_foreign_type(given)) {
        PyObject *base = (PyObject *)((PyTypeObject *)given)->tp_base;
        if (base != NULL && base != given)
            return PyErr_GivenExceptionMatches(base, exc);
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
    snprintf(dyn_exceptions[idx].name, sizeof(dyn_exceptions[idx].name),
             "%s", name);
    init_exc_type(&dyn_exceptions[idx].obj, dyn_exceptions[idx].name);
    /* tp_base only when the declared base is itself one of our exception
       types; a tuple of bases, or anything else, keeps Exception, which is
       also what PyErr_GivenExceptionMatches below assumes for a NULL base. */
    dyn_exceptions[idx].obj.tp_base =
        (base != NULL && base->ob_type == &PyType_Type)
            ? (PyTypeObject *)base : &_exc_Exception;
    dyn_exceptions[idx].base = base;
    return (PyObject *)&dyn_exceptions[idx].obj;
}

PyObject *PyErr_NewExceptionWithDoc(const char *name, const char *doc,
                                    PyObject *base, PyObject *dict) {
    (void)doc;
    return PyErr_NewException(name, base, dict);
}

/* A GRAIL exception OBJECT handed to C as an error value -- the instance
   PyErr_SetFromErrno builds with OSError(errno, text), or one a wheel got back
   from a call -- is kept as itself: the server records it
   (CPythonShim>>___noteCallbackExceptionInstance:) and the error is marked as
   from Grail, so it is raised again as that object (a FileNotFoundError with
   its errno), and PyErr_Fetch answers it.  It used to become its type and
   str(value): an OSError with an empty message. */
static int keep_grail_exc_instance(PyObject *type, PyObject *value) {
    if (value == NULL || value == Py_None || is_foreign(value) || PyUnicode_Check(value))
        return 0;
    OopType oop = pyobj_oop(value);
    OopType kept = GciPerform(server, "___noteCallbackExceptionInstance:", &oop, 1);
    GciErrSType e;
    if (GciErr(&e) || kept != OOP_TRUE) return 0;
    PyObject *str = PyObject_Str(value);
    const char *text = str ? PyUnicode_AsUTF8(str) : NULL;
    PyErr_SetString(type, text ? text : "");
    if (str == NULL) PyErr_Clear();
    current_error_type = type;
    current_error_instance = value;
    current_error_from_grail = 1;
    err_publish();
    return 1;
}

void PyErr_SetObject(PyObject *type, PyObject *value) {
    if (keep_grail_exc_instance(type, value)) return;
    if (value != NULL && is_foreign_exc_instance(value)) {
        char text[1024];
        foreign_exc_text(value, text, sizeof(text));
        PyErr_SetString(type, text);
        current_error_instance = value;
        err_publish();
        return;
    }
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
    Py_ssize_t nargs = (Py_ssize_t)(nargsf & ~(1ULL << 63));
    PyObject *tuple = PyTuple_New(nargs);
    if (!tuple) return NULL;
    for (Py_ssize_t i = 0; i < nargs; i++) {
        Py_INCREF(args[i]);
        PyTuple_SetItem(tuple, i, args[i]);
    }
    /* The keyword VALUES follow the positionals in args, one per name in
       kwnames.  They used to be dropped -- kwnames was ignored outright -- so
       ``f(x, key=v)'' through vectorcall ran as ``f(x)'' with no error.
       PyO3 makes every keyword call this way. */
    PyObject *kwargs = NULL;
    Py_ssize_t nkw = kwnames ? PyTuple_Size(kwnames) : 0;
    if (nkw > 0) {
        kwargs = PyDict_New();
        if (!kwargs) return NULL;
        for (Py_ssize_t i = 0; i < nkw; i++) {
            if (PyDict_SetItem(kwargs, PyTuple_GetItem(kwnames, i), args[nargs + i]) < 0)
                return NULL;
        }
    }
    PyObject *result = PyObject_Call(callable, tuple, kwargs);
    Py_DECREF(tuple);
    return result;
}

/* --- Unicode additional --- */

/* Shared formatting engine for PyUnicode_FromFormat and PyErr_Format.
   Supports the printf subset plus CPython's object conversions: %R (repr),
   %S (str), %A (repr), %U (str object), with optional width/precision
   digits honored for %s.  Writes a NUL-terminated result into buf[0..cap). */
static void shim_format_into(char *buf, size_t cap0, const char *format,
                             va_list ap) {
    size_t pos = 0;
    const size_t cap = cap0 - 1;

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
    buf[pos] = '\0';
}

PyObject *PyUnicode_FromFormat(const char *format, ...) {
    char buf[4096];
    va_list ap;
    va_start(ap, format);
    shim_format_into(buf, sizeof(buf), format, ap);
    va_end(ap);
    return PyUnicode_FromString(buf);
}

/* The va_list form, which numpy's _multiarray_umath imports (its own
   error-message helpers take a va_list).  Missing, it bound to nothing and
   the dlopen of numpy 2.5 failed outright. */
extern "C" PyObject *PyUnicode_FromFormatV(const char *format, va_list vargs) {
    char buf[4096];
    va_list ap;
    va_copy(ap, vargs);
    shim_format_into(buf, sizeof(buf), format, ap);
    va_end(ap);
    return PyUnicode_FromString(buf);
}

/* CPython's str-only conversion: a str comes back as a new reference, and
   anything else is a TypeError -- unlike PyObject_Str, it never calls
   __str__. */
extern "C" PyObject *PyUnicode_FromObject(PyObject *obj) {
    if (obj == NULL) {
        PyErr_SetString(PyExc_SystemError, "PyUnicode_FromObject: NULL object");
        return NULL;
    }
    if (PyUnicode_Check(obj)) {
        Py_INCREF(obj);
        return obj;
    }
    PyErr_SetString(PyExc_TypeError, "Can't convert object to str implicitly");
    return NULL;
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
    check_and_raise_error();
    
    return addr_to_pyobj(result);
}

/* --- Py_BuildValue --- */

/* Build a single value from one format unit, advancing *pf past it.
   Returns NULL with an error set for unsupported units. */
static PyObject *build_value_item(const char **pf, va_list *ap) {
    const char *f = *pf;
    PyObject *result = NULL;
    /* CPython's do_mkvalue skips separators before ANY unit, so a dict may
       separate key from value with ", " as well as ":" -- numpy builds
       "{s, [(i), (i, i), (i)]}" during module init, and the dict case here
       only stepped over a single ':'. */
    while (*f == ' ' || *f == '\t' || *f == ',' || *f == ':') f++;
    switch (*f) {
        case 'i': case 'b': case 'h': case 'B': case 'H':
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
        /* c is a bytes of length 1 and C a str of one code point, as in
           CPython's do_mkvalue; c used to build a str. */
        case 'c': {
            char buf[1] = { (char)va_arg(*ap, int) };
            result = PyBytes_FromStringAndSize(buf, 1); f++; break;
        }
        case 'C':
            result = PyUnicode_FromOrdinal(va_arg(*ap, int)); f++; break;
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
            if (obj && is_foreign(obj)) diag_foreign(obj);
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

/* va_list core shared by Py_BuildValue and PyObject_CallFunction/Method.
   Per CPython: 0 units -> None, 1 unit -> that value (NOT a 1-tuple),
   2+ units -> a tuple. */
static PyObject *va_build_value(const char *format, va_list *ap) {
    const char *f = format;
    PyObject *items[32];
    int count = 0;

    while (*f && *f != ':' && *f != ';') {
        if (*f == ',' || *f == ' ') { f++; continue; }
        if (count >= 32) {
            PyErr_SetString(PyExc_SystemError, "Py_BuildValue: too many items");
            return NULL;
        }
        items[count] = build_value_item(&f, ap);
        if (!items[count]) return NULL;
        count++;
    }

    if (count == 0) return Py_None;
    if (count == 1) return items[0];
    PyObject *tuple = PyTuple_New(count);
    if (!tuple) return NULL;
    for (int j = 0; j < count; j++)
        PyTuple_SetItem(tuple, j, items[j]);
    return tuple;
}

PyObject *Py_BuildValue(const char *format, ...) {
    va_list ap;
    va_start(ap, format);
    PyObject *result = va_build_value(format, &ap);
    va_end(ap);
    return result;
}

extern "C" PyObject *Py_VaBuildValue(const char *format, va_list vargs) {
    va_list ap;
    va_copy(ap, vargs);
    PyObject *result = va_build_value(format, &ap);
    va_end(ap);
    return result;
}

/* Wrap the result of va_build_value as a positional-args tuple: a tuple
   passes through; anything else (incl. None for an empty build) becomes a
   1-tuple.  Used by PyObject_CallFunction / PyObject_CallMethod. */
static PyObject *args_as_tuple(PyObject *built) {
    if (built == NULL) return NULL;
    if (PyTuple_Check(built)) return built;
    PyObject *t = PyTuple_New(1);
    if (t == NULL) return NULL;
    PyTuple_SetItem(t, 0, built);          /* steals ref */
    return t;
}

/* PyObject_CallFunction(callable, format, ...): build args from a
   Py_BuildValue format + varargs, then call.  numpy's core init uses this
   (and PyObject_CallMethod) heavily. */
extern "C" PyObject *PyObject_CallFunction(PyObject *callable,
                                           const char *format, ...) {
    if (callable == NULL) return NULL;
    if (format == NULL || *format == '\0')
        return PyObject_CallObject(callable, NULL);
    va_list ap;
    va_start(ap, format);
    PyObject *built = va_build_value(format, &ap);
    va_end(ap);
    PyObject *args = args_as_tuple(built);
    if (args == NULL) return NULL;
    return PyObject_Call(callable, args, NULL);
}

/* PyObject_CallMethod(obj, name, format, ...): obj.name(*args). */
extern "C" PyObject *PyObject_CallMethod(PyObject *obj, const char *name,
                                         const char *format, ...) {
    if (obj == NULL || name == NULL) return NULL;
    PyObject *method = PyObject_GetAttrString(obj, name);
    if (method == NULL) return NULL;
    if (format == NULL || *format == '\0')
        return PyObject_CallObject(method, NULL);
    va_list ap;
    va_start(ap, format);
    PyObject *built = va_build_value(format, &ap);
    va_end(ap);
    PyObject *args = args_as_tuple(built);
    if (args == NULL) return NULL;
    return PyObject_Call(method, args, NULL);
}

/* --- Number protocol --- */

Py_ssize_t PyNumber_AsSsize_t(PyObject *obj, PyObject *exc) {
    (void)exc;
    return PyLong_AsSsize_t(obj);
}

/* --- Object protocol (hash) --- */

/* Python's hash(obj) (CPythonShim>>PyObject_Hash:), so a wheel's hash agrees
   with Grail's dicts.  It sent Smalltalk's #hash, which is another function:
   hash(1.5) from C differed from hash(1.5) in Python, and 1 and 1.0 could
   hash apart.  An unhashable object raises TypeError, as in CPython. */
/* The hash of a str or bytes in CPython's layout, computed in C and cached in
   the object as CPython caches it (hash@24).  Cython matches a keyword by its
   hash FIELD -- ``((PyASCIIObject *)name)->hash == key_hash'' -- trusting
   its interned names to carry one, so a field left at -1 matched nothing
   ("got an unexpected keyword argument 'n_words'").  FNV-1a over the code
   points, so it does not depend on the kind, nor on whether Grail holds the
   text as a String or a Symbol, whose Python hashes differ.  A C caller's
   own hashing agrees with itself; the shim's dict operations are the
   server's and do not use it. */
static Py_hash_t grail_inline_hash(PyObject *obj) {
    Py_hash_t *field = (Py_hash_t *)((char *)obj + 24);
    if (*field != -1) return *field;
    Py_uhash_t h = 14695981039346656037ULL;
    if (obj->ob_type == &PyBytes_Type) {
        const unsigned char *p = (const unsigned char *)obj + 32;
        for (Py_ssize_t i = 0; i < Py_SIZE(obj); i++) { h ^= p[i]; h *= 1099511628211ULL; }
    } else {
        int kind = grail_str_kind(obj);
        const char *data = grail_str_data(obj);
        for (Py_ssize_t i = 0; i < grail_str_length(obj); i++) {
            Py_UCS4 c = grail_str_read(kind, data, i);
            for (int b = 0; b < 4; b++) { h ^= (c >> (8 * b)) & 0xff; h *= 1099511628211ULL; }
        }
    }
    if ((Py_hash_t)h == -1) h = (Py_uhash_t)-2;
    *field = (Py_hash_t)h;
    return (Py_hash_t)h;
}
extern "C" Py_hash_t _grail_inline_hash_if_str(PyObject *obj) {
    if (obj != NULL && obj->ob_type != &PyLong_Type && has_grail_prefix(obj)) return grail_inline_hash(obj);
    return -1;
}

Py_hash_t PyObject_Hash(PyObject *obj) {
    if (obj == NULL) return -1;
    if (obj->ob_type != &PyLong_Type && has_grail_prefix(obj)) return grail_inline_hash(obj);
    OopType oop = pyobj_oop(obj);
    OopType result = GciPerform(server, "PyObject_Hash:", &oop, 1);
    if (check_gci_error()) return -1;
    Py_hash_t h = (Py_hash_t)GciOopToI64(result);
    if (check_gci_error()) return -1;
    return h == -1 ? -2 : h;
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

/* A read-only view of the mapping, Grail's mappingproxy -- it answered the
   mapping itself, so a C type's __dict__ could be written through. */
PyObject *PyDictProxy_New(PyObject *mapping) {
    if (mapping == NULL) return NULL;
    OopType arg = pyobj_oop(mapping);
    OopType r = GciPerform(server, "PyDictProxy_New:", &arg, 1);
    if (check_gci_error()) return NULL;
    return addr_to_pyobj(r);
}

/* --- Iterator --- */

PyObject *PyCallIter_New(PyObject *callable, PyObject *sentinel) {
    (void)callable;
    (void)sentinel;
    PyErr_SetString(PyExc_RuntimeError, "PyCallIter_New not yet implemented");
    return NULL;
}

/* --- Iteration protocol --- */

/* A wheel's own object iterates through its own type's tp_iter / tp_iternext,
   along the base chain (the shim's PyType_FromSpec does no slot inheritance),
   or NULL when it has none.  pydantic_core's ValidatorIterator -- what an
   ``Iterable[Model]'' validates to -- is one: serialising it round-tripped
   through Grail, which knew no iteration for a foreign proxy, and FastAPI's
   ``-> Iterable[Model]'' routes failed with ``Error serializing to JSON''. */
static getiterfunc foreign_obj_iter(PyObject *obj) {
    if (!is_foreign(obj) || is_foreign_type(obj)) return NULL;
    return (getiterfunc)foreign_tp_iter(obj->ob_type);
}

static iternextfunc foreign_obj_iternext(PyObject *obj) {
    if (!is_foreign(obj) || is_foreign_type(obj)) return NULL;
    return (iternextfunc)foreign_tp_iternext(obj->ob_type);
}

extern "C" PyObject *PyObject_GetIter(PyObject *obj) {
    if (obj == NULL) return NULL;
    getiterfunc fi = foreign_obj_iter(obj);
    if (fi) return fi(obj);
    OopType arg = pyobj_oop(obj);
    OopType result = GciPerform(server, "PyObject_GetIter:", &arg, 1);
    if (check_gci_error()) return NULL;
    return addr_to_pyobj(result);
}

extern "C" PyObject *PyIter_Next(PyObject *iterator) {
    if (iterator == NULL) return NULL;
    iternextfunc fn = foreign_obj_iternext(iterator);
    if (fn) {
        PyObject *r = fn(iterator);
        /* CPython's PyIter_Next: an exhausted iterator's StopIteration is
           not an error. */
        if (r == NULL && PyErr_Occurred() && PyErr_ExceptionMatches(PyExc_StopIteration))
            PyErr_Clear();
        return r;
    }
    OopType arg = pyobj_oop(iterator);
    OopType result = GciPerform(server, "PyIter_Next:", &arg, 1);
    if (check_gci_error()) return NULL;
    int64 addr = GciOopToI64(result);
    if (addr == 0) return NULL;  /* exhausted — NULL without error */
    return (PyObject *)(intptr_t)addr;
}

/* PySequence_Fast: a list or tuple as itself, anything else iterated into a
   new list -- and in REAL LAYOUT either way, because the caller reads the
   result with the inline PySequence_Fast_GET_SIZE / _ITEMS macros, which is
   the whole point of the call.  A Grail list or tuple is answered as a
   real-layout copy (real_layout_arg).  It was a stub answering NULL with no
   error set, so np.array([3., 2., 1.]) answered nothing at all -- which a
   Grail assignment then read as an unbound local. */
extern "C" PyObject *PySequence_Fast(PyObject *o, const char *m) {
    if (o == NULL) {
        if (!PyErr_Occurred())
            PyErr_SetString(PyExc_SystemError, "null argument to internal routine");
        return NULL;
    }
    PyTypeObject *t = Py_TYPE(o);
    int listish = t == &PyList_Type || t == &PyTuple_Type
        || (t != NULL && plausible_pyobj(t)
            && (PyType_IsSubtype(t, &PyList_Type) || PyType_IsSubtype(t, &PyTuple_Type)));
    if (listish && (is_real_layout(o) || is_foreign(o))) { Py_INCREF(o); return o; }
    if (listish) return real_layout_arg(o, 0);
    PyObject *it = PyObject_GetIter(o);
    if (it == NULL) {
        if (PyErr_ExceptionMatches(PyExc_TypeError)) {
            PyErr_Clear();
            PyErr_SetString(PyExc_TypeError, m ? m : "expected a sequence");
        }
        return NULL;
    }
    PyObject *l = PyList_New(0);
    if (l == NULL) return NULL;
    for (;;) {
        PyObject *item = PyIter_Next(it);
        if (item == NULL) break;
        if (PyList_Append(l, item) < 0) return NULL;
    }
    if (PyErr_Occurred()) return NULL;
    return l;
}

/* PySequence_Tuple: a tuple of o's items, in real layout (see above).  Was a
   stub answering NULL with no error set. */
extern "C" PyObject *PySequence_Tuple(PyObject *o) {
    if (o != NULL && Py_TYPE(o) == &PyTuple_Type) {
        if (is_real_layout(o) || is_foreign(o)) { Py_INCREF(o); return o; }
        return real_layout_arg(o, 0);
    }
    PyObject *f = PySequence_Fast(o, "argument must be an iterable");
    if (f == NULL) return NULL;
    /* f is a list or tuple in real layout (PySequence_Fast's contract). */
    int is_tup = Py_TYPE(f) == &PyTuple_Type
        || PyType_IsSubtype(Py_TYPE(f), &PyTuple_Type);
    Py_ssize_t n = is_tup ? ((ShimTupleObject *)f)->ob_size : ((ShimListObject *)f)->ob_size;
    PyObject **items = is_tup ? ((ShimTupleObject *)f)->ob_item : ((ShimListObject *)f)->ob_item;
    PyObject *tup = PyTuple_New(n);
    if (tup == NULL) return NULL;
    for (Py_ssize_t i = 0; i < n; i++) {
        PyObject *item = items[i];
        Py_XINCREF(item);
        if (PyTuple_SetItem(tup, i, item) < 0) return NULL;
    }
    return to_real_tuple(tup);
}

/* PyVectorcall_Call: call ``callable'' through the vectorcall function it
   stores at its type's tp_vectorcall_offset, turning an args tuple and a
   kwargs dict into the vector form (positional values, then keyword values,
   and a tuple of the keyword names).  A type uses it AS its tp_call when its
   instances are vectorcall-only -- numpy's _ArrayFunctionDispatcher, which
   every public numpy function is -- so as a stub answering NULL with no
   error, np.linspace(0, 2, 5) answered nothing. */
extern "C" PyObject *PyVectorcall_Call(PyObject *callable, PyObject *tuple, PyObject *kwargs) {
    PyTypeObject *t = Py_TYPE(callable);
    Py_ssize_t off = t ? t->tp_vectorcall_offset : 0;
    vectorcallfunc func = off > 0 ? *(vectorcallfunc *)((char *)callable + off) : NULL;
    if (func == NULL) {
        PyErr_Format(PyExc_TypeError, "'%.200s' object does not support vectorcall",
                     t && t->tp_name ? t->tp_name : "?");
        return NULL;
    }
    Py_ssize_t nargs = tuple ? PyTuple_Size(tuple) : 0;
    if (nargs < 0) return NULL;
    Py_ssize_t nkw = kwargs ? PyDict_Size(kwargs) : 0;
    if (nkw < 0) return NULL;
    PyObject **stack = (PyObject **)calloc((size_t)(nargs + nkw + 1), sizeof(PyObject *));
    if (stack == NULL) return PyErr_NoMemory();
    for (Py_ssize_t i = 0; i < nargs; i++)
        stack[i] = PyTuple_GetItem(tuple, i);
    PyObject *kwnames = NULL;
    if (nkw > 0) {
        kwnames = PyTuple_New(nkw);
        if (kwnames == NULL) { free(stack); return NULL; }
        Py_ssize_t pos = 0, k = 0;
        PyObject *key, *value;
        while (k < nkw && PyDict_Next(kwargs, &pos, &key, &value)) {
            Py_INCREF(key);
            PyTuple_SetItem(kwnames, k, key);
            stack[nargs + k] = value;
            k++;
        }
        kwnames = to_real_tuple(kwnames);
    }
    PyObject *r = func(callable, stack, (size_t)nargs, kwnames);
    free(stack);
    return r;
}

/* PySeqIter_New: an iterator that indexes a sequence from 0 until
   IndexError -- what CPython's iter() makes of an object with __getitem__
   and no __iter__, and what numpy's array_iter returns.  It was a stub
   answering NULL with no error, so ``for x in np.arange(3)'' found nothing
   to iterate.  A C object of its own type, so it crosses into Grail as a
   foreign proxy whose __next__ is tp_iternext. */
typedef struct {
    Py_ssize_t    ob_refcnt;
    PyTypeObject *ob_type;
    PyObject     *seq;      /* NULL once exhausted */
    Py_ssize_t    index;
} GrailSeqIterObject;

static PyTypeObject GrailSeqIter_Type;

static PyObject *seqiter_next(PyObject *self) {
    GrailSeqIterObject *it = (GrailSeqIterObject *)self;
    if (it->seq == NULL) return NULL;
    PyObject *r;
    if (is_foreign(it->seq)) {
        PyObject *k = PyLong_FromSsize_t(it->index);
        if (k == NULL) return NULL;
        r = foreign_op_invoke(it->seq, foreign_op_named("__getitem__"), k, NULL);
    } else {
        r = PySequence_GetItem(it->seq, it->index);
    }
    if (r == NULL) {
        if (PyErr_ExceptionMatches(PyExc_IndexError)
                || PyErr_ExceptionMatches(PyExc_StopIteration)) {
            PyErr_Clear();
            it->seq = NULL;
        }
        return NULL;
    }
    it->index++;
    return r;
}

extern "C" PyObject *PyObject_SelfIter(PyObject *obj) {
    Py_INCREF(obj);
    return obj;
}

extern "C" PyObject *PySeqIter_New(PyObject *seq) {
    if (seq == NULL) { PyErr_BadInternalCall(); return NULL; }
    if (GrailSeqIter_Type.tp_name == NULL) {
        GrailSeqIter_Type.ob_base.ob_base.ob_refcnt = 1;
        GrailSeqIter_Type.ob_base.ob_base.ob_type = &PyType_Type;
        GrailSeqIter_Type.tp_name = "iterator";
        GrailSeqIter_Type.tp_basicsize = sizeof(GrailSeqIterObject);
        GrailSeqIter_Type.tp_base = &PyBaseObject_Type;
        GrailSeqIter_Type.tp_iter = PyObject_SelfIter;
        GrailSeqIter_Type.tp_iternext = seqiter_next;
        GrailSeqIter_Type.tp_flags = Py_TPFLAGS_DEFAULT | Py_TPFLAGS_READY;
    }
    GrailSeqIterObject *it = (GrailSeqIterObject *)calloc(1, sizeof(GrailSeqIterObject));
    if (it == NULL) return PyErr_NoMemory();
    it->ob_refcnt = 1;
    it->ob_type = &GrailSeqIter_Type;
    Py_INCREF(seq);
    it->seq = seq;
    return (PyObject *)it;
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
    return (long long)oopToLongWithIndex(int_conv_oop(obj));
}

/* Unsigned 64-bit values, which GemStone holds as LargeIntegers from 2^60
   up, cross as two 32-bit halves (CPythonShim>>PyLong_U64Parts:mask: and
   PyLong_FromU64Hi:lo:).  PyO3's abi3 build reads and writes a 128-bit int
   as two of these -- the low half through the MASK form, which takes any
   int -- so pydantic_core's UUID support needs every one of them exact.
   They went through the signed SmallInteger path, and a UUID's int did not
   fit (docs/Support_Pydantic.md, Phase 6). */
static int u64_parts(PyObject *obj, int mask, unsigned long long *out) {
    OopType args[2] = { int_conv_oop(obj), mask ? OOP_TRUE : OOP_FALSE };
    OopType r = GciPerform(server, "PyLong_U64Parts:mask:", args, 2);
    if (check_gci_error()) return -1;
    if (r == OOP_NIL) return -1;
    unsigned long long lo = (unsigned long long)GciOopToI64(GciFetchOop(r, 1));
    unsigned long long hi = (unsigned long long)GciOopToI64(GciFetchOop(r, 2));
    *out = (hi << 32) | lo;
    return 0;
}

extern "C" PyObject *PyLong_FromUnsignedLongLong(unsigned long long v) {
    if (v <= (unsigned long long)(1ULL << 59))
        return PyLong_FromSsize_t((Py_ssize_t)v);
    OopType args[2] = { GciI64ToOop((int64)(v >> 32)), GciI64ToOop((int64)(v & 0xFFFFFFFFULL)) };
    OopType r = GciPerform(server, "PyLong_FromU64Hi:lo:", args, 2);
    if (check_gci_error()) return NULL;
    return addr_to_pyobj(r);
}

extern "C" unsigned long long PyLong_AsUnsignedLongLong(PyObject *obj) {
    unsigned long long v;
    if (obj == NULL) return (unsigned long long)-1;
    return u64_parts(obj, 0, &v) < 0 ? (unsigned long long)-1 : v;
}

extern "C" unsigned long long PyLong_AsUnsignedLongLongMask_impl(PyObject *obj) {
    unsigned long long v;
    if (obj == NULL) return (unsigned long long)-1;
    return u64_parts(obj, 1, &v) < 0 ? (unsigned long long)-1 : v;
}

extern "C" unsigned long PyLong_AsUnsignedLongMask(PyObject *obj) {
    return (unsigned long)PyLong_AsUnsignedLongLongMask_impl(obj);
}

extern "C" PyObject *PyLong_FromDouble(double v) {
    return PyLong_FromSsize_t((Py_ssize_t)v);  /* truncates toward zero */
}

extern "C" double PyLong_AsDouble(PyObject *obj) {
    if (obj == NULL) return -1.0;
    return (double)oopToLongWithIndex(int_conv_oop(obj));
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
    /* The legacy API steals value on SUCCESS only (CPython). */
    int r = PyModule_AddObjectRef(module, name, value);
    if (r == 0) Py_XDECREF(value);
    return r;
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
    /* The UTF-8 ENCODED length, which is what the buffer holds. */
    return grail_utf8(unicode, size);
}

extern "C" PyObject *PyUnicode_DecodeUTF8(const char *s, Py_ssize_t size,
                                          const char *errors) {
    (void)errors;
    return PyUnicode_FromStringAndSize(s, size);
}

/* Interned strs carry their hash, as CPython's do (see grail_inline_hash). */
extern "C" PyObject *PyUnicode_InternFromString(const char *s) {
    PyObject *u = PyUnicode_FromString(s);
    if (u != NULL) (void)_grail_inline_hash_if_str(u);
    return u;
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
    /* A Grail object's C type has no slots, list/tuple/str/bytes aside: the
       server applies CPython's rule (CPythonShim>>PySequence_Check:). */
    if (is_foreign(obj) || is_real_layout(obj) || is_type_mirror(obj)) return 0;
    if (t->tp_flags & Py_TPFLAGS_DICT_SUBCLASS) return 0;
    OopType oop = pyobj_oop(obj);
    OopType r = GciPerform(server, "PySequence_Check:", &oop, 1);
    if (check_gci_error()) return 0;
    return r == OOP_TRUE;
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

/* Keys, values and items come back as REAL-LAYOUT lists (and items as
   real-layout pairs): a wheel reads them with the inline list macros --
   numpy's ufunc dispatch takes PySequence_Fast_GET_ITEM over
   PyDict_Values(ufunc->_loops) for every call -- and a Grail list's wrapper
   would be read as garbage (real_layout_arg). */
extern "C" PyObject *PyDict_Keys(PyObject *dict) {
    PyObject *r = dict_view_call(dict, "PyDict_Keys:");
    return r == NULL ? NULL : real_layout_arg(r, 0);
}

extern "C" PyObject *PyDict_Values(PyObject *dict) {
    PyObject *r = dict_view_call(dict, "PyDict_Values:");
    return r == NULL ? NULL : real_layout_arg(r, 0);
}

extern "C" PyObject *PyDict_Items(PyObject *dict) {
    PyObject *r = dict_view_call(dict, "PyDict_Items:");
    return r == NULL ? NULL : real_layout_arg(r, 0);
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
    return grail_buffer_of(obj);
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
    void                *context;
} GrailCapsule;

/* Capsules carry the EXPORTED PyCapsule_Type (defined, zero-initialized, in
   shim_numpy.cc): a prebuilt wheel inlines PyCapsule_CheckExact as an ob_type
   compare against that symbol.  A private type here made every capsule the
   shim built fail it -- numpy's PyUFunc_AddPromoter refused its own promoter
   with "promoter must (currently) be a PyCapsule." */
extern "C" PyTypeObject PyCapsule_Type;

extern "C" PyObject *PyCapsule_New(void *pointer, const char *name,
                                   PyCapsule_Destructor destructor) {
    if (pointer == NULL) {
        PyErr_SetString(PyExc_ValueError, "PyCapsule_New called with null pointer");
        return NULL;
    }
    if (PyCapsule_Type.tp_name == NULL) {
        PyCapsule_Type.tp_name = "PyCapsule";
        register_shim_type(&PyCapsule_Type);
    }
    GrailCapsule *cap = (GrailCapsule *)calloc(1, sizeof(GrailCapsule));
    if (!cap) return PyErr_NoMemory();
    cap->ob_base.ob_refcnt = 1;
    cap->ob_base.ob_type = &PyCapsule_Type;
    cap->pointer = pointer;
    cap->name = name;
    cap->destructor = destructor;
    return (PyObject *)cap;
}

extern "C" int PyCapsule_CheckExact(PyObject *op) {
    return op != NULL && Py_TYPE(op) == &PyCapsule_Type;
}

/* A capsule's context and name.  These were stubs in shim_numpy.cc answering
   NULL and success without storing anything. */
extern "C" void *PyCapsule_GetContext(PyObject *capsule) {
    if (!PyCapsule_CheckExact(capsule)) {
        PyErr_SetString(PyExc_ValueError, "PyCapsule_GetContext called with invalid PyCapsule object");
        return NULL;
    }
    return ((GrailCapsule *)capsule)->context;
}

extern "C" int PyCapsule_SetContext(PyObject *capsule, void *context) {
    if (!PyCapsule_CheckExact(capsule)) {
        PyErr_SetString(PyExc_ValueError, "PyCapsule_SetContext called with invalid PyCapsule object");
        return -1;
    }
    ((GrailCapsule *)capsule)->context = context;
    return 0;
}

extern "C" int PyCapsule_SetName(PyObject *capsule, const char *name) {
    if (!PyCapsule_CheckExact(capsule)) {
        PyErr_SetString(PyExc_ValueError, "PyCapsule_SetName called with invalid PyCapsule object");
        return -1;
    }
    ((GrailCapsule *)capsule)->name = name;
    return 0;
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
    GCI_DECLARE_ACTION("shimInit", shimInit, 5);
    GCI_DECLARE_ACTION("shimTypeAddr", shimTypeAddr, 1);
    GCI_DECLARE_ACTION("shimDynLoad", shimDynLoad, 2);
    GCI_DECLARE_ACTION("shimModuleAttrs", shimModuleAttrs, 1);
    GCI_DECLARE_ACTION("shimFunctionObject", shimFunctionObject, 2);
    GCI_DECLARE_ACTION("shimCallKw", shimCallKw, 5);
    GCI_DECLARE_ACTION("shimCallObject", shimCallObject, 4);
    GCI_DECLARE_ACTION("shimTypeMirrorLayout", shimTypeMirrorLayout, 1);
    GCI_DECLARE_ACTION("shimDataDescriptorNames", shimDataDescriptorNames, 1);
    GCI_DECLARE_ACTION("shimForeignDirNames", shimForeignDirNames, 1);
    GCI_DECLARE_ACTION("shimForeignGetAttr", shimForeignGetAttr, 2);
    GCI_DECLARE_ACTION("shimForeignSetAttr", shimForeignSetAttr, 3);
    GCI_DECLARE_ACTION("shimForeignOp", shimForeignOp, 4);
    GCI_DECLARE_ACTION("shimForeignStr", shimForeignStr, 2);
    GCI_DECLARE_ACTION("shimForeignTypeCheck", shimForeignTypeCheck, 3);
    GCI_DECLARE_ACTION("shimArrayDispatcherParts", shimArrayDispatcherParts, 1);
    GCI_DECLARE_ACTION("shimArrayFunctionKind", shimArrayFunctionKind, 1);
}

/* Drop everything that points at the PREVIOUS session's Grail objects:
   loaded-module bookkeeping (registry modules re-initialise on demand; a
   dynamically loaded one is refused -- g_dyn_ever), module attributes,
   dict-walk snapshots, the function-object cache, the pending error and the
   callback flag. */
static void new_session_reset(void) {
    g_session_gen++;
    buffer_cache_clear();
    num_modules = 0;
    module_attrs_count = 0;
    for (int i = 0; i < DICT_NEXT_SLOTS; i++) { free(g_dn[i].items); g_dn[i].items = NULL; g_dn[i].dict = NULL; }
    g_fn_count = 0;   /* each function object's m_module is a Grail str */
    g_notimpl_oop = 0;
    g_ellipsis_oop = 0;
    g_cb_error_flag = 0;
    current_error_type = NULL;
    current_error_msg[0] = '\0';
    forget_saved_gs_error();
    *tstate_exc_slot() = NULL;
    g_err_published = NULL;
}

extern "C" void GciUserActionShutdown(void) {
    buffer_cache_clear();
    num_modules = 0;
}
