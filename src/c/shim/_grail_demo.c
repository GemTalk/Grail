/*
 * _grail_demo — A small C extension module that compiles unchanged
 * against either CPython's Python.h or Grail's cpython.h.
 *
 * Build for CPython:
 *   cc -shared -fPIC -o _grail_demo$(python3-config --extension-suffix) \
 *      $(python3-config --includes) _grail_demo.c
 *
 * Build for Grail:
 *   Compiled into libcpython_ua via the Makefile (with -DGRAIL_SHIM).
 *
 * Functions:
 *   add(a, b)              — integer addition
 *   dot_product(xs, ys)    — float dot product of two lists
 *   scale(xs, factor)      — multiply each float in a list, return new list
 *   function_name(obj)     — obj's ml_name if it is a builtin function, else
 *                            None (CPython build only; see below)
 *   same_object(a, b)      — whether a and b are one C object (CPython build
 *                            only)
 *   make_box(value)        — a Box: an object of this module's own type, with
 *                            struct members and an instance __dict__ (CPython
 *                            build only)
 *   getattr_in_c(obj, name) — PyObject_GetAttrString, asked from C (CPython
 *                            build only)
 */

#ifdef GRAIL_SHIM
#include "cpython.h"
#else
#include <Python.h>
#endif
#include <stddef.h>   /* offsetof */

/* ------------------------------------------------------------------ */
/* add(a, b) -> a + b  (integers)                                      */
/* ------------------------------------------------------------------ */

static PyObject *
grail_add(PyObject *module, PyObject *const *args, Py_ssize_t nargs)
{
    (void)module;
    if (nargs != 2) {
        PyErr_Format(PyExc_TypeError,
            "add expected 2 arguments, got %zd", nargs);
        return NULL;
    }
    Py_ssize_t a = PyLong_AsSsize_t(args[0]);
    if (a == -1 && PyErr_Occurred()) return NULL;
    Py_ssize_t b = PyLong_AsSsize_t(args[1]);
    if (b == -1 && PyErr_Occurred()) return NULL;
    return PyLong_FromSsize_t(a + b);
}

/* ------------------------------------------------------------------ */
/* dot_product(xs, ys) -> sum of xs[i]*ys[i]  (float lists)            */
/* ------------------------------------------------------------------ */

static PyObject *
grail_dot_product(PyObject *module, PyObject *const *args, Py_ssize_t nargs)
{
    (void)module;
    if (nargs != 2) {
        PyErr_Format(PyExc_TypeError,
            "dot_product expected 2 arguments, got %zd", nargs);
        return NULL;
    }
    if (!PyList_Check(args[0]) || !PyList_Check(args[1])) {
        PyErr_SetString(PyExc_TypeError, "both arguments must be lists");
        return NULL;
    }

    Py_ssize_t n = PyList_Size(args[0]);
    if (PyList_Size(args[1]) != n) {
        PyErr_SetString(PyExc_ValueError, "lists must have equal length");
        return NULL;
    }

    double sum = 0.0;
    for (Py_ssize_t i = 0; i < n; i++) {
        double x = PyFloat_AsDouble(PyList_GetItem(args[0], i));
        if (x == -1.0 && PyErr_Occurred()) return NULL;
        double y = PyFloat_AsDouble(PyList_GetItem(args[1], i));
        if (y == -1.0 && PyErr_Occurred()) return NULL;
        sum += x * y;
    }
    return PyFloat_FromDouble(sum);
}

/* ------------------------------------------------------------------ */
/* scale(xs, factor) -> [x * factor for x in xs]  (float list)         */
/* ------------------------------------------------------------------ */

static PyObject *
grail_scale(PyObject *module, PyObject *const *args, Py_ssize_t nargs)
{
    (void)module;
    if (nargs != 2) {
        PyErr_Format(PyExc_TypeError,
            "scale expected 2 arguments, got %zd", nargs);
        return NULL;
    }
    if (!PyList_Check(args[0])) {
        PyErr_SetString(PyExc_TypeError, "first argument must be a list");
        return NULL;
    }
    double factor = PyFloat_AsDouble(args[1]);
    if (factor == -1.0 && PyErr_Occurred()) return NULL;

    Py_ssize_t n = PyList_Size(args[0]);
    PyObject *result = PyList_New(0);
    if (!result) return NULL;

    for (Py_ssize_t i = 0; i < n; i++) {
        double x = PyFloat_AsDouble(PyList_GetItem(args[0], i));
        if (x == -1.0 && PyErr_Occurred()) return NULL;
        PyObject *val = PyFloat_FromDouble(x * factor);
        if (!val) return NULL;
        if (PyList_Append(result, val) < 0) return NULL;
        Py_DECREF(val);
    }
    return result;
}

#ifndef GRAIL_SHIM
/* ------------------------------------------------------------------ */
/* function_name(obj), same_object(a, b)                               */
/*                                                                     */
/* What a wheel sees when Grail hands it one of the module's own       */
/* functions back.  numpy's add_docstring writes a function's ml_doc   */
/* only when ``Py_TYPE(obj) == &PyCFunction_Type'', and refused every  */
/* one Grail passed it (CPythonShim>>___functionObjectFor:).  Built    */
/* only against the real Python.h: the shim's cpython.h declares no    */
/* PyCFunctionObject, and the copy compiled into libcpython_ua is not  */
/* the one these are for.                                              */
/* ------------------------------------------------------------------ */

static PyObject *
grail_function_name(PyObject *module, PyObject *const *args, Py_ssize_t nargs)
{
    (void)module;
    if (nargs != 1) {
        PyErr_SetString(PyExc_TypeError, "function_name() takes 1 argument");
        return NULL;
    }
    if (Py_TYPE(args[0]) != &PyCFunction_Type)
        Py_RETURN_NONE;
    return PyUnicode_FromString(((PyCFunctionObject *)args[0])->m_ml->ml_name);
}

static PyObject *
grail_same_object(PyObject *module, PyObject *const *args, Py_ssize_t nargs)
{
    (void)module;
    if (nargs != 2) {
        PyErr_SetString(PyExc_TypeError, "same_object() takes 2 arguments");
        return NULL;
    }
    return PyBool_FromLong(args[0] == args[1]);
}

/* ------------------------------------------------------------------ */
/* Box: the shape of numpy's _ArrayFunctionDispatcher and dtype as     */
/* Grail sees them -- an object of the wheel's own type, never a Grail */
/* one.  ``value'', ``count'' and ``tag'' are struct members           */
/* (tp_members; ``tag'' is a _Py_T_OBJECT, as dtype.type is, and reads */
/* None while unset); attributes stored on it land in its instance dict*/
/* at tp_dictoffset, and its ``__dict__'' is PyObject_GenericGetDict,  */
/* as the dispatcher's is.                                             */
/* ------------------------------------------------------------------ */

typedef struct {
    PyObject_HEAD
    PyObject *value;
    int count;
    PyObject *tag;
    PyObject *dict;
} BoxObject;

static PyMemberDef box_members[] = {
    {"value", Py_T_OBJECT_EX, offsetof(BoxObject, value), Py_READONLY, NULL},
    {"count", Py_T_INT, offsetof(BoxObject, count), Py_READONLY, NULL},
    {"tag", _Py_T_OBJECT, offsetof(BoxObject, tag), 0, NULL},
    {NULL, 0, 0, 0, NULL}
};

static PyGetSetDef box_getset[] = {
    {"__dict__", PyObject_GenericGetDict, PyObject_GenericSetDict, NULL, NULL},
    {NULL, NULL, NULL, NULL, NULL}
};

/* Box's operators delegate to its value -- enough to see Grail's operator
   protocol reach a wheel's slots: Box(3) + 4, 4 + Box(3), -Box(3),
   Box(3) == 3, hash(Box(3)), Box([1, 2])[0], len(...), iter(...), in. */
static PyTypeObject Box_Type;
#define BOX_VALUE(o) (((BoxObject *)(o))->value)
static PyObject *box_unbox(PyObject *o) { return PyObject_TypeCheck(o, &Box_Type) ? BOX_VALUE(o) : o; }
static PyObject *box_add(PyObject *a, PyObject *b) { return PyNumber_Add(box_unbox(a), box_unbox(b)); }
static PyObject *box_neg(PyObject *a) { return PyNumber_Negative(BOX_VALUE(a)); }
static int box_bool(PyObject *a) { return PyObject_IsTrue(BOX_VALUE(a)); }
static PyObject *box_richcompare(PyObject *a, PyObject *b, int op) {
    return PyObject_RichCompare(box_unbox(a), box_unbox(b), op);
}
static Py_hash_t box_hash(PyObject *a) { return PyObject_Hash(BOX_VALUE(a)); }
static PyObject *box_getitem(PyObject *a, PyObject *k) { return PyObject_GetItem(BOX_VALUE(a), k); }
static Py_ssize_t box_len(PyObject *a) { return PyObject_Length(BOX_VALUE(a)); }
static PyObject *box_iter(PyObject *a) { return PyObject_GetIter(BOX_VALUE(a)); }
static int box_contains(PyObject *a, PyObject *v) { return PySequence_Contains(BOX_VALUE(a), v); }
static PyObject *box_twice(PyObject *self, PyObject *noargs) {
    (void)noargs;
    return PyNumber_Add(BOX_VALUE(self), BOX_VALUE(self));
}
static PyNumberMethods box_as_number = { .nb_add = box_add, .nb_negative = box_neg, .nb_bool = box_bool };
static PyMappingMethods box_as_mapping = { .mp_length = box_len, .mp_subscript = box_getitem };
static PySequenceMethods box_as_sequence = { .sq_contains = box_contains };
static PyMethodDef box_methods[] = {
    {"twice", box_twice, METH_NOARGS, "value + value"},
    {NULL, NULL, 0, NULL}
};

static PyTypeObject Box_Type = {
    PyVarObject_HEAD_INIT(NULL, 0)
    .tp_name = "_grail_demo.Box",
    .tp_basicsize = sizeof(BoxObject),
    .tp_dictoffset = offsetof(BoxObject, dict),
    .tp_flags = Py_TPFLAGS_DEFAULT | Py_TPFLAGS_BASETYPE,
    .tp_members = box_members,
    .tp_getset = box_getset,
    .tp_methods = box_methods,
    .tp_as_number = &box_as_number,
    .tp_as_mapping = &box_as_mapping,
    .tp_as_sequence = &box_as_sequence,
    .tp_richcompare = box_richcompare,
    .tp_hash = box_hash,
    .tp_iter = box_iter,
};

/* Plain: no slots at all -- == is identity and hash is object's, as for a
   numpy DType class.  NoHash: compares, never hashes -- ndarray's case. */
typedef struct { PyObject_HEAD } PlainObject;
static PyTypeObject Plain_Type = {
    PyVarObject_HEAD_INIT(NULL, 0)
    .tp_name = "_grail_demo.Plain",
    .tp_basicsize = sizeof(PlainObject),
    .tp_flags = Py_TPFLAGS_DEFAULT,
};
static PyObject *nohash_richcompare(PyObject *a, PyObject *b, int op) {
    if (op == Py_EQ) return PyBool_FromLong(a == b);
    Py_RETURN_NOTIMPLEMENTED;
}
static PyTypeObject NoHash_Type = {
    PyVarObject_HEAD_INIT(NULL, 0)
    .tp_name = "_grail_demo.NoHash",
    .tp_basicsize = sizeof(PlainObject),
    .tp_flags = Py_TPFLAGS_DEFAULT,
    .tp_richcompare = nohash_richcompare,
    .tp_hash = PyObject_HashNotImplemented,
};

/* MyFloat: a float subclass of the wheel's own, built through float's
   tp_new as numpy.float64 is. */
static PyTypeObject MyFloat_Type = {
    PyVarObject_HEAD_INIT(NULL, 0)
    .tp_name = "_grail_demo.MyFloat",
    .tp_basicsize = sizeof(PyFloatObject),
    .tp_flags = Py_TPFLAGS_DEFAULT,
};

/* WithMeta: a type whose METATYPE subclasses type, as numpy's DTypes are
   instances of _DTypeMeta. */
static PyTypeObject Meta_Type = {
    PyVarObject_HEAD_INIT(NULL, 0)
    .tp_name = "_grail_demo.Meta",
    .tp_basicsize = sizeof(PyHeapTypeObject),
    .tp_flags = Py_TPFLAGS_DEFAULT | Py_TPFLAGS_BASETYPE | Py_TPFLAGS_TYPE_SUBCLASS,
};
static PyTypeObject WithMeta_Type = {
    PyVarObject_HEAD_INIT(NULL, 0)
    .tp_name = "_grail_demo.WithMeta",
    .tp_basicsize = sizeof(PlainObject),
    .tp_flags = Py_TPFLAGS_DEFAULT,
};

static PyObject *
grail_make_box(PyObject *module, PyObject *const *args, Py_ssize_t nargs)
{
    (void)module;
    if (nargs != 1) {
        PyErr_SetString(PyExc_TypeError, "make_box() takes 1 argument");
        return NULL;
    }
    BoxObject *box = PyObject_New(BoxObject, &Box_Type);
    if (box == NULL) return NULL;
    Py_INCREF(args[0]);
    box->value = args[0];
    box->count = 1;
    box->tag = NULL;
    box->dict = NULL;
    return (PyObject *)box;
}

#define ONE_ARG(fn) if (nargs != 1) { PyErr_SetString(PyExc_TypeError, fn "() takes 1 argument"); return NULL; }

static PyObject *
grail_make_plain(PyObject *module, PyObject *const *args, Py_ssize_t nargs)
{
    (void)module; (void)args; (void)nargs;
    return (PyObject *)PyObject_New(PlainObject, &Plain_Type);
}

static PyObject *
grail_make_nohash(PyObject *module, PyObject *const *args, Py_ssize_t nargs)
{
    (void)module; (void)args; (void)nargs;
    return (PyObject *)PyObject_New(PlainObject, &NoHash_Type);
}

/* The definition a descriptor reads through, at CPython's offset -- what
   numpy's add_docstring does. */
static PyObject *
grail_descr_def_name(PyObject *module, PyObject *const *args, Py_ssize_t nargs)
{
    (void)module;
    ONE_ARG("descr_def_name")
    PyObject *d = args[0];
    if (Py_TYPE(d) == &PyMethodDescr_Type)
        return PyUnicode_FromString(((PyMethodDescrObject *)d)->d_method->ml_name);
    if (Py_TYPE(d) == &PyMemberDescr_Type)
        return PyUnicode_FromString(((PyMemberDescrObject *)d)->d_member->name);
    if (Py_TYPE(d) == &PyGetSetDescr_Type)
        return PyUnicode_FromString(((PyGetSetDescrObject *)d)->d_getset->name);
    Py_RETURN_NONE;
}

static PyObject *
grail_singletons(PyObject *module, PyObject *const *args, Py_ssize_t nargs)
{
    (void)module;
    if (nargs != 2) {
        PyErr_SetString(PyExc_TypeError, "singletons() takes 2 arguments");
        return NULL;
    }
    return Py_BuildValue("(OO)", args[0] == Py_NotImplemented ? Py_True : Py_False,
                         args[1] == Py_Ellipsis ? Py_True : Py_False);
}

static PyObject *
grail_give_singletons(PyObject *module, PyObject *const *args, Py_ssize_t nargs)
{
    (void)module; (void)args; (void)nargs;
    return Py_BuildValue("(OO)", Py_NotImplemented, Py_Ellipsis);
}

/* A float read inline (PyFloat_AS_DOUBLE), as a wheel built against the
   full API reads one. */
static PyObject *
grail_float_inline(PyObject *module, PyObject *const *args, Py_ssize_t nargs)
{
    (void)module;
    ONE_ARG("float_inline")
    if (!PyFloat_Check(args[0])) Py_RETURN_NONE;
    return PyFloat_FromDouble(PyFloat_AS_DOUBLE(args[0]));
}

/* Lists and tuples read inline: the sum of a list of ints, and of a list
   of (int, int) pairs. */
static PyObject *
grail_sum_inline(PyObject *module, PyObject *const *args, Py_ssize_t nargs)
{
    (void)module;
    ONE_ARG("sum_inline")
    PyObject *l = args[0];
    if (!PyList_Check(l)) { PyErr_SetString(PyExc_TypeError, "a list"); return NULL; }
    long total = 0;
    for (Py_ssize_t i = 0; i < PyList_GET_SIZE(l); i++) {
        PyObject *x = PyList_GET_ITEM(l, i);
        if (PyTuple_Check(x)) {
            for (Py_ssize_t j = 0; j < PyTuple_GET_SIZE(x); j++)
                total += PyLong_AsLong(PyTuple_GET_ITEM(x, j));
        } else {
            total += PyLong_AsLong(x);
        }
    }
    return PyLong_FromLong(total);
}

static PyObject *
grail_seq_fast_len(PyObject *module, PyObject *const *args, Py_ssize_t nargs)
{
    (void)module;
    ONE_ARG("seq_fast_len")
    PyObject *f = PySequence_Fast(args[0], "not a sequence");
    if (f == NULL) return NULL;
    Py_ssize_t n = PySequence_Fast_GET_SIZE(f);
    PyObject *first = n > 0 ? PySequence_Fast_GET_ITEM(f, 0) : Py_None;
    PyObject *r = Py_BuildValue("(nO)", n, first);
    Py_DECREF(f);
    return r;
}

static PyObject *
grail_as_long_overflow(PyObject *module, PyObject *const *args, Py_ssize_t nargs)
{
    (void)module;
    ONE_ARG("as_long_overflow")
    int overflow = 99;
    long v = PyLong_AsLongAndOverflow(args[0], &overflow);
    if (v == -1 && overflow == 0 && PyErr_Occurred()) return NULL;
    int overflow2 = 99;
    long long w = PyLong_AsLongLongAndOverflow(args[0], &overflow2);
    if (w == -1 && overflow2 == 0 && PyErr_Occurred()) return NULL;
    return Py_BuildValue("(lili)", v, overflow, (long)w, overflow2);
}

static PyObject *
grail_interp_matches(PyObject *module, PyObject *const *args, Py_ssize_t nargs)
{
    (void)module; (void)args; (void)nargs;
    return PyBool_FromLong(PyThreadState_Get()->interp == PyInterpreterState_Main());
}

static PyObject *
grail_optional_attr(PyObject *module, PyObject *const *args, Py_ssize_t nargs)
{
    (void)module;
    if (nargs != 2) {
        PyErr_SetString(PyExc_TypeError, "optional_attr() takes 2 arguments");
        return NULL;
    }
    PyObject *v = (PyObject *)0x1;   /* must be overwritten */
    int rc = PyObject_GetOptionalAttr(args[0], args[1], &v);
    if (rc < 0) return NULL;
    return Py_BuildValue("(iO)", rc, v == NULL ? Py_None : v);
}

/* PyDict_Values read with the inline sequence macros, as numpy's ufunc
   dispatch reads its loop table. */
static PyObject *
grail_dict_values_inline(PyObject *module, PyObject *const *args, Py_ssize_t nargs)
{
    (void)module;
    ONE_ARG("dict_values_inline")
    PyObject *vals = PyDict_Values(args[0]);
    if (vals == NULL) return NULL;
    Py_ssize_t n = PySequence_Fast_GET_SIZE(vals);
    PyObject *out = PyTuple_New(n);
    for (Py_ssize_t i = 0; i < n; i++) {
        PyObject *x = PySequence_Fast_GET_ITEM(vals, i);
        Py_INCREF(x);
        PyTuple_SET_ITEM(out, i, x);
    }
    return out;
}

static PyObject *
grail_getattr_in_c(PyObject *module, PyObject *const *args, Py_ssize_t nargs)
{
    (void)module;
    if (nargs != 2 || !PyUnicode_Check(args[1])) {
        PyErr_SetString(PyExc_TypeError, "getattr_in_c() takes an object and a str");
        return NULL;
    }
    const char *name = PyUnicode_AsUTF8(args[1]);
    if (name == NULL) return NULL;
    return PyObject_GetAttrString(args[0], name);
}
#endif

/* ------------------------------------------------------------------ */
/* Module definition                                                   */
/* ------------------------------------------------------------------ */

static PyMethodDef grail_demo_methods[] = {
    {"add", (PyCFunction)(void *)grail_add,
     METH_FASTCALL, "Add two integers."},
    {"dot_product", (PyCFunction)(void *)grail_dot_product,
     METH_FASTCALL, "Dot product of two float lists."},
    {"scale", (PyCFunction)(void *)grail_scale,
     METH_FASTCALL, "Multiply each element of a float list by a factor."},
#ifndef GRAIL_SHIM
    {"function_name", (PyCFunction)(void *)grail_function_name,
     METH_FASTCALL, "ml_name of a builtin function, else None."},
    {"same_object", (PyCFunction)(void *)grail_same_object,
     METH_FASTCALL, "Whether two arguments are one C object."},
    {"make_box", (PyCFunction)(void *)grail_make_box,
     METH_FASTCALL, "A Box holding a value."},
    {"getattr_in_c", (PyCFunction)(void *)grail_getattr_in_c,
     METH_FASTCALL, "PyObject_GetAttrString, from C."},
    {"make_plain", (PyCFunction)(void *)grail_make_plain, METH_FASTCALL, NULL},
    {"make_nohash", (PyCFunction)(void *)grail_make_nohash, METH_FASTCALL, NULL},
    {"descr_def_name", (PyCFunction)(void *)grail_descr_def_name, METH_FASTCALL, NULL},
    {"singletons", (PyCFunction)(void *)grail_singletons, METH_FASTCALL, NULL},
    {"give_singletons", (PyCFunction)(void *)grail_give_singletons, METH_FASTCALL, NULL},
    {"float_inline", (PyCFunction)(void *)grail_float_inline, METH_FASTCALL, NULL},
    {"sum_inline", (PyCFunction)(void *)grail_sum_inline, METH_FASTCALL, NULL},
    {"seq_fast_len", (PyCFunction)(void *)grail_seq_fast_len, METH_FASTCALL, NULL},
    {"as_long_overflow", (PyCFunction)(void *)grail_as_long_overflow, METH_FASTCALL, NULL},
    {"interp_matches", (PyCFunction)(void *)grail_interp_matches, METH_FASTCALL, NULL},
    {"optional_attr", (PyCFunction)(void *)grail_optional_attr, METH_FASTCALL, NULL},
    {"dict_values_inline", (PyCFunction)(void *)grail_dict_values_inline, METH_FASTCALL, NULL},
#endif
    {NULL, NULL, 0, NULL}
};

/* Multi-phase init: module-level constants. Works on both real CPython
   and Grail (where shimDynLoad runs Py_mod_exec and shimModuleAttrs
   exports the constants as Python attributes). */
static int
grail_demo_exec(PyObject *mod) {
#ifndef GRAIL_SHIM
    if (PyType_Ready(&Box_Type) < 0) return -1;
    if (PyModule_AddObjectRef(mod, "Box", (PyObject *)&Box_Type) < 0) return -1;
    if (PyType_Ready(&Plain_Type) < 0 || PyType_Ready(&NoHash_Type) < 0) return -1;
    MyFloat_Type.tp_base = &PyFloat_Type;
    if (PyType_Ready(&MyFloat_Type) < 0) return -1;
    if (PyModule_AddObjectRef(mod, "MyFloat", (PyObject *)&MyFloat_Type) < 0) return -1;
    Meta_Type.tp_base = &PyType_Type;
    if (PyType_Ready(&Meta_Type) < 0) return -1;
    Py_SET_TYPE(&WithMeta_Type, &Meta_Type);
    if (PyType_Ready(&WithMeta_Type) < 0) return -1;
    if (PyModule_AddObjectRef(mod, "WithMeta", (PyObject *)&WithMeta_Type) < 0) return -1;
#endif
    PyModule_AddIntConstant(mod, "DEMO_VERSION", 7);
    PyModule_AddStringConstant(mod, "DEMO_NAME", "grail-demo");
    return 0;
}

static PyModuleDef_Slot grail_demo_slots[] = {
    {Py_mod_exec, (void *)grail_demo_exec},
#ifndef GRAIL_SHIM
    {Py_mod_multiple_interpreters, Py_MOD_PER_INTERPRETER_GIL_SUPPORTED},
#endif
    {0, NULL}
};

static struct PyModuleDef _grail_demo_module = {
    PyModuleDef_HEAD_INIT,
    .m_name    = "_grail_demo",
    .m_doc     = "Demo module that runs on both CPython and Grail.",
    .m_size    = 0,
    .m_methods = grail_demo_methods,
    .m_slots   = grail_demo_slots,
};

PyMODINIT_FUNC
PyInit__grail_demo(void)
{
    return PyModuleDef_Init(&_grail_demo_module);
}
