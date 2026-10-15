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
 *   setattr_in_c(obj, name, value) — PyObject_SetAttrString, from C (CPython
 *                            build only)
 *   Dispatcher, NdLike, OverLike — numpy's _ArrayFunctionDispatcher in
 *                            miniature (CPython build only; see below)
 */

#ifdef GRAIL_SHIM
#include "cpython.h"
#else
#include <Python.h>
#endif
#include <stddef.h>   /* offsetof */
#include <errno.h>
#include <stdarg.h>
#include <stdint.h>

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

/* ByteSub: a bytes subclass of the wheel's own, built through bytes' tp_new
   and read inline (PyBytes_AS_STRING) as numpy.bytes_ is. */
static PyTypeObject ByteSub_Type = {
    PyVarObject_HEAD_INIT(NULL, 0)
    .tp_name = "_grail_demo.ByteSub",
    .tp_basicsize = sizeof(PyBytesObject),
    .tp_itemsize = 1,
    .tp_flags = Py_TPFLAGS_DEFAULT,
};

/* WithMeta: a type whose METATYPE subclasses type, as numpy's DTypes are
   instances of _DTypeMeta.  Meta's getset ``_legacy'' answers the type's
   name, read off WithMeta the way numpy reads ``type(dtype)._legacy''. */
static PyObject *meta_legacy(PyObject *type, void *closure) {
    (void)closure;
    return PyUnicode_FromFormat("legacy:%s", ((PyTypeObject *)type)->tp_name);
}
static PyGetSetDef meta_getset[] = {
    {"_legacy", meta_legacy, NULL, NULL, NULL},
    {NULL, NULL, NULL, NULL, NULL}
};
static PyTypeObject Meta_Type = {
    PyVarObject_HEAD_INIT(NULL, 0)
    .tp_name = "_grail_demo.Meta",
    .tp_basicsize = sizeof(PyHeapTypeObject),
    .tp_flags = Py_TPFLAGS_DEFAULT | Py_TPFLAGS_BASETYPE | Py_TPFLAGS_TYPE_SUBCLASS,
    .tp_getset = meta_getset,
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

/* PyUnicode_Compare and PyUnicode_Contains, from C: (compare, contains). */
static PyObject *
grail_unicode_compare(PyObject *module, PyObject *const *args, Py_ssize_t nargs)
{
    (void)module;
    if (nargs != 2) {
        PyErr_SetString(PyExc_TypeError, "unicode_compare() takes 2 arguments");
        return NULL;
    }
    int c = PyUnicode_Compare(args[0], args[1]);
    if (c == -1 && PyErr_Occurred()) return NULL;
    int k = PyUnicode_Contains(args[0], args[1]);
    if (k < 0) return NULL;
    const char *b = PyUnicode_AsUTF8(args[1]);
    if (b == NULL) return NULL;
    return Py_BuildValue("(iOi)", c, k ? Py_True : Py_False,
                         PyUnicode_CompareWithASCIIString(args[0], b));
}

/* PyObject_SetAttrString, asked from C (numpy's finfo fills an empty
   instance this way, _populate_finfo_constants). */
static PyObject *
grail_setattr_in_c(PyObject *module, PyObject *const *args, Py_ssize_t nargs)
{
    (void)module;
    if (nargs != 3 || !PyUnicode_Check(args[1])) {
        PyErr_SetString(PyExc_TypeError, "setattr_in_c() takes an object, a str and a value");
        return NULL;
    }
    const char *name = PyUnicode_AsUTF8(args[1]);
    if (name == NULL || PyObject_SetAttrString(args[0], name, args[2]) < 0) return NULL;
    Py_RETURN_NONE;
}

/* capi(name, *args): one C-API entry point each, called from C, so a test
   can compare Grail's shim with CPython for the same calls.  These were
   shim_numpy.cc stubs that answered as if they had succeeded. */
static PyObject *capi_formatv(PyObject *exc, const char *fmt, ...) {
    va_list va;
    va_start(va, fmt);
    PyErr_FormatV(exc, fmt, va);
    va_end(va);
    return NULL;
}
static PyObject *ucs4_list(const Py_UCS4 *buf, Py_ssize_t n) {
    PyObject *out = PyList_New(n);
    for (Py_ssize_t i = 0; i < n; i++) PyList_SetItem(out, i, PyLong_FromLong((long)buf[i]));
    return out;
}
static PyObject *
grail_capi(PyObject *module, PyObject *const *args, Py_ssize_t nargs)
{
    (void)module;
    if (nargs < 1 || !PyUnicode_Check(args[0])) {
        PyErr_SetString(PyExc_TypeError, "capi() takes a name");
        return NULL;
    }
    const char *n = PyUnicode_AsUTF8(args[0]);
    PyObject *a = nargs > 1 ? args[1] : NULL, *b = nargs > 2 ? args[2] : NULL;
    PyObject *c = nargs > 3 ? args[3] : NULL;
#define IS(x) (strcmp(n, x) == 0)
    if (IS("bytes_from_string")) return PyBytes_FromString(PyUnicode_AsUTF8(a));
    if (IS("bytes_as_string_and_size")) {
        char *s; Py_ssize_t len;
        if (PyBytes_AsStringAndSize(a, &s, &len) < 0) return NULL;
        return PyTuple_Pack(2, PyLong_FromSsize_t(len), PyBytes_FromStringAndSize(s, len));
    }
    if (IS("bytes_as_string_no_len")) {
        char *s;
        if (PyBytes_AsStringAndSize(a, &s, NULL) < 0) return NULL;
        return PyBytes_FromString(s);
    }
    if (IS("dict_contains_string")) return PyBool_FromLong(PyDict_ContainsString(a, PyUnicode_AsUTF8(b)));
    if (IS("err_formatv")) return capi_formatv(PyExc_ValueError, "x=%d y=%s", 5, "abc");
    if (IS("normalize")) {
        PyObject *t, *v, *tb;
        PyErr_SetString(PyExc_KeyError, "k");
        PyErr_Fetch(&t, &v, &tb);
        PyErr_NormalizeException(&t, &v, &tb);
        return PyTuple_Pack(2, PyBool_FromLong(PyObject_IsInstance(v, t) == 1), v);
    }
    if (IS("set_from_errno")) { errno = ENOENT; return PyErr_SetFromErrno(PyExc_OSError); }
    if (IS("warn_format")) {
        if (PyErr_WarnFormat(PyExc_UserWarning, 1, "warned %d %s", 7, "times") < 0) return NULL;
        Py_RETURN_NONE;
    }
    if (IS("print_clears")) {
        PyErr_SetString(PyExc_ValueError, "printed by capi");
        PyErr_Print();
        return PyBool_FromLong(PyErr_Occurred() == NULL);
    }
    if (IS("unraisable_clears")) {
        PyErr_SetString(PyExc_ValueError, "unraisable from capi");
        PyErr_WriteUnraisable(a);
        return PyBool_FromLong(PyErr_Occurred() == NULL);
    }
    if (IS("builtins_len")) {
        PyObject *d = PyEval_GetBuiltins();
        if (d == NULL) return NULL;
        PyObject *v = PyDict_GetItemString(d, "len");
        if (v == NULL) Py_RETURN_NONE;
        Py_INCREF(v);
        return v;
    }
    if (IS("set_cause")) {
        Py_INCREF(b);
        PyException_SetCause(a, b);
        PyException_SetContext(a, c);
        if (PyException_SetTraceback(a, Py_None) < 0) return NULL;
        Py_INCREF(a);
        return a;
    }
    if (IS("float_from_string")) return PyFloat_FromString(a);
    if (IS("long_from_unicode")) return PyLong_FromUnicodeObject(a, (int)PyLong_AsLong(b));
    if (IS("void_ptr_roundtrip")) {
        void *p = PyLong_AsVoidPtr(a);
        if (p == NULL && PyErr_Occurred()) return NULL;
        return PyLong_FromVoidPtr(p);
    }
    if (IS("long_is_zero")) return PyLong_FromLong(PyLong_IsZero(a));
    if (IS("mapping_get_item_string")) return PyMapping_GetItemString(a, PyUnicode_AsUTF8(b));
    if (IS("memoryview_bytes")) {
        PyObject *mv = PyMemoryView_FromObject(a);
        if (mv == NULL) return NULL;
        PyObject *r = PyObject_Bytes(mv);
        Py_DECREF(mv);
        return r;
    }
    if (IS("method_new_call")) {
        PyObject *m = PyMethod_New(a, b);
        if (m == NULL) return NULL;
        PyObject *r = PyObject_CallNoArgs(m);
        Py_DECREF(m);
        return r;
    }
    if (IS("as_fd")) {
        int fd = PyObject_AsFileDescriptor(a);
        if (fd < 0) return NULL;
        return PyLong_FromLong(fd);
    }
    if (IS("object_bytes")) return PyObject_Bytes(a);
    if (IS("object_format")) return PyObject_Format(a, b);
    if (IS("generic_getattr")) return PyObject_GenericGetAttr(a, b);
    if (IS("length_hint")) {
        Py_ssize_t h = PyObject_LengthHint(a, PyLong_AsSsize_t(b));
        if (h < 0) return NULL;
        return PyLong_FromSsize_t(h);
    }
    if (IS("object_not")) return PyLong_FromLong(PyObject_Not(a));
    if (IS("object_print")) {
        FILE *fp = tmpfile();
        if (fp == NULL) Py_RETURN_NONE;
        if (PyObject_Print(a, fp, 0) < 0 || PyObject_Print(a, fp, 1) < 0) { fclose(fp); return NULL; }
        long len = ftell(fp);
        rewind(fp);
        char buf[256];
        size_t got = fread(buf, 1, len < 255 ? (size_t)len : 255, fp);
        fclose(fp);
        return PyUnicode_FromStringAndSize(buf, (Py_ssize_t)got);
    }
    if (IS("seq_concat")) return PySequence_Concat(a, b);
    if (IS("seq_repeat")) return PySequence_Repeat(a, PyLong_AsSsize_t(b));
    if (IS("seq_inplace_concat")) {
        PyObject *r = PySequence_InPlaceConcat(a, b);
        if (r == NULL) return NULL;
        return PyTuple_Pack(2, r, PyBool_FromLong(r == a));
    }
    if (IS("seq_inplace_repeat")) {
        PyObject *r = PySequence_InPlaceRepeat(a, PyLong_AsSsize_t(b));
        if (r == NULL) return NULL;
        return PyTuple_Pack(2, r, PyBool_FromLong(r == a));
    }
    if (IS("as_ascii")) return PyUnicode_AsASCIIString(a);
    if (IS("as_latin1")) return PyUnicode_AsLatin1String(a);
    if (IS("as_encoded")) return PyUnicode_AsEncodedString(a, PyUnicode_AsUTF8(b), NULL);
    if (IS("as_ucs4")) {
        Py_UCS4 buf[64];
        if (PyUnicode_AsUCS4(a, buf, 64, 1) == NULL) return NULL;
        return ucs4_list(buf, PyUnicode_GetLength(a));
    }
    if (IS("as_ucs4_short_buffer")) {
        Py_UCS4 buf[2];
        if (PyUnicode_AsUCS4(a, buf, 2, 1) == NULL) return NULL;
        Py_RETURN_NONE;
    }
    if (IS("as_ucs4_copy")) {
        Py_UCS4 *buf = PyUnicode_AsUCS4Copy(a);
        if (buf == NULL) return NULL;
        PyObject *r = ucs4_list(buf, PyUnicode_GetLength(a));
        PyMem_Free(buf);
        return r;
    }
    if (IS("from_kind_and_data")) {
        int kind = (int)PyLong_AsLong(a);
        Py_ssize_t size = PyList_Size(b);
        uint32_t buf4[64]; uint16_t buf2[64]; uint8_t buf1[64];
        for (Py_ssize_t i = 0; i < size && i < 64; i++) {
            long v = PyLong_AsLong(PyList_GetItem(b, i));
            buf4[i] = (uint32_t)v; buf2[i] = (uint16_t)v; buf1[i] = (uint8_t)v;
        }
        return PyUnicode_FromKindAndData(kind, kind == 1 ? (void *)buf1 : kind == 2 ? (void *)buf2 : (void *)buf4, size);
    }
    if (IS("unicode_format")) return PyUnicode_Format(a, b);
    if (IS("from_encoded")) return PyUnicode_FromEncodedObject(a, PyUnicode_AsUTF8(b), NULL);
    if (IS("unicode_replace")) return PyUnicode_Replace(a, b, c, nargs > 4 ? PyLong_AsSsize_t(args[4]) : -1);
    if (IS("tailmatch")) {
        return PyTuple_Pack(2,
            PyLong_FromSsize_t(PyUnicode_Tailmatch(a, b, 0, PY_SSIZE_T_MAX, -1)),
            PyLong_FromSsize_t(PyUnicode_Tailmatch(a, b, 0, PY_SSIZE_T_MAX, 1)));
    }
    if (IS("char_classes")) {
        Py_UCS4 ch = (Py_UCS4)PyLong_AsLong(a);
        return Py_BuildValue("(iiiiiiii)",
            _PyUnicode_IsAlpha(ch) != 0, _PyUnicode_IsDecimalDigit(ch) != 0,
            _PyUnicode_IsDigit(ch) != 0, _PyUnicode_IsLowercase(ch) != 0,
            _PyUnicode_IsNumeric(ch) != 0, _PyUnicode_IsTitlecase(ch) != 0,
            _PyUnicode_IsUppercase(ch) != 0, _PyUnicode_IsWhitespace(ch) != 0);
    }
    if (IS("hash_double")) return PyLong_FromSsize_t(_Py_HashDouble(a, PyFloat_AsDouble(a)));
    if (IS("capsule")) {
        static int target = 42, ctx = 7;
        PyObject *cap = PyCapsule_New(&target, "first", NULL);
        if (cap == NULL) return NULL;
        int before = PyCapsule_GetContext(cap) == NULL;
        if (PyCapsule_SetContext(cap, &ctx) < 0 || PyCapsule_SetName(cap, "second") < 0) return NULL;
        int *ptr = (int *)PyCapsule_GetPointer(cap, "second");
        int *got = (int *)PyCapsule_GetContext(cap);
        Py_DECREF(cap);
        if (ptr == NULL) return NULL;
        return Py_BuildValue("(iii)", before, *ptr, got == NULL ? -1 : *got);
    }
    /* A pointer into a bytes object stays valid while C holds the object:
       kept here in one call and read back in a later one, as numpy's
       frombuffer keeps the view's buf in the array it returns. */
    if (IS("buffer_keep")) {
        static Py_buffer kept;
        static int have = 0;
        if (a != NULL) {
            if (have) PyBuffer_Release(&kept);
            if (PyObject_GetBuffer(a, &kept, PyBUF_SIMPLE) < 0) { have = 0; return NULL; }
            have = 1;
            Py_RETURN_NONE;
        }
        if (!have) Py_RETURN_NONE;
        /* Reuse whatever memory of that size has been freed since, so a
           buffer that did not outlive its call reads back as scribble. */
        void *junk[64];
        for (int i = 0; i < 64; i++) {
            junk[i] = malloc((size_t)kept.len + 1);
            if (junk[i] != NULL) memset(junk[i], 0x5a, (size_t)kept.len + 1);
        }
        PyObject *r = PyBytes_FromStringAndSize((const char *)kept.buf, kept.len);
        for (int i = 0; i < 64; i++) free(junk[i]);
        PyBuffer_Release(&kept);
        have = 0;
        return r;
    }
    if (IS("getbuffer")) {
        Py_buffer v;
        if (PyObject_GetBuffer(a, &v, (int)PyLong_AsLong(b)) < 0) return NULL;
        PyObject *r = Py_BuildValue("(inziin)", v.readonly, v.len, v.format, v.ndim,
                                    v.shape != NULL, v.shape != NULL ? v.shape[0] : (Py_ssize_t)-1);
        PyBuffer_Release(&v);
        return r;
    }
    if (IS("sequence_check")) return PyLong_FromLong(PySequence_Check(a));
    if (IS("check_buffer")) return PyLong_FromLong(PyObject_CheckBuffer(a));
    /* numpy's setup_scalartypes readies the builtin types it derives from;
       that must leave them what they were. */
    if (IS("ready_then_call")) {
        if (PyType_Ready(&PyBytes_Type) < 0 || PyType_Ready(&PyUnicode_Type) < 0
                || PyType_Ready(&PyLong_Type) < 0)
            return NULL;
        PyObject *x = PyObject_CallOneArg((PyObject *)&PyBytes_Type, a);
        PyObject *y = PyObject_CallOneArg((PyObject *)&PyUnicode_Type, b);
        PyObject *z = PyObject_Bytes(a);
        PyObject *w = PyObject_CallOneArg((PyObject *)&PyLong_Type, y);
        if (x == NULL || y == NULL || z == NULL || w == NULL) return NULL;
        return Py_BuildValue("(NNNN)", x, y, z, w);
    }
    if (IS("bytesub")) {
        PyObject *o = PyObject_CallOneArg((PyObject *)&ByteSub_Type, a);
        if (o == NULL) return NULL;
        PyObject *r = Py_BuildValue("(snN)", Py_TYPE(o)->tp_name, Py_SIZE(o),
                                    PyBytes_FromStringAndSize(PyBytes_AS_STRING(o), Py_SIZE(o)));
        Py_DECREF(o);
        return r;
    }
    if (IS("unique_temporary")) return PyLong_FromLong(PyUnstable_Object_IsUniqueReferencedTemporary(a));
#undef IS
    PyErr_Format(PyExc_ValueError, "capi: unknown name %s", n);
    return NULL;
}

/* ------------------------------------------------------------------ */
/* Dispatcher: numpy's _ArrayFunctionDispatcher in miniature -- its    */
/* tp_name and struct layout, which is what Grail recognises it by     */
/* (shimArrayDispatcherParts), and a tp_call that does what numpy's    */
/* does: call the dispatcher for the relevant arguments, hand the call */
/* to an argument's __array_function__ when one overrides it, and      */
/* otherwise call the implementation.  NdLike stands for ndarray (its  */
/* tp_name, and an __array_function__ that is the default); OverLike   */
/* has one of its own.  Dispatcher(None, impl) is numpy's like=        */
/* dispatcher, which has no relevant_arg_func.                         */
/* ------------------------------------------------------------------ */

typedef struct {
    PyObject_HEAD
    void *vectorcall;              /* numpy's vectorcallfunc; unused here */
    PyObject *dict;
    PyObject *relevant_arg_func;
    PyObject *default_impl;
    PyObject *dispatcher_name;
    PyObject *public_name;
} DispatcherObject;

typedef struct { PyObject_HEAD } NdLikeObject;

static PyObject *ndlike_array_function(PyObject *self, PyObject *args) {
    (void)self; (void)args;
    Py_RETURN_NOTIMPLEMENTED;
}
static PyMethodDef ndlike_methods[] = {
    {"__array_function__", ndlike_array_function, METH_VARARGS, NULL},
    {NULL, NULL, 0, NULL}
};
static PyTypeObject NdLike_Type = {
    PyVarObject_HEAD_INIT(NULL, 0)
    .tp_name = "numpy.ndarray",
    .tp_basicsize = sizeof(NdLikeObject),
    .tp_flags = Py_TPFLAGS_DEFAULT,
    .tp_methods = ndlike_methods,
    .tp_new = PyType_GenericNew,
};

static PyObject *overlike_array_function(PyObject *self, PyObject *args) {
    (void)self;
    PyObject *func, *types, *fargs, *fkwargs;
    if (!PyArg_ParseTuple(args, "OOOO", &func, &types, &fargs, &fkwargs)) return NULL;
    return Py_BuildValue("(sO)", "overridden", fargs);
}
static PyMethodDef overlike_methods[] = {
    {"__array_function__", overlike_array_function, METH_VARARGS, NULL},
    {NULL, NULL, 0, NULL}
};
static PyTypeObject OverLike_Type = {
    PyVarObject_HEAD_INIT(NULL, 0)
    .tp_name = "_grail_demo.OverLike",
    .tp_basicsize = sizeof(NdLikeObject),
    .tp_flags = Py_TPFLAGS_DEFAULT,
    .tp_methods = overlike_methods,
    .tp_new = PyType_GenericNew,
};

static PyObject *dispatcher_new(PyTypeObject *type, PyObject *args, PyObject *kwds) {
    (void)kwds;
    PyObject *rel, *impl;
    if (!PyArg_ParseTuple(args, "OO", &rel, &impl)) return NULL;
    DispatcherObject *d = (DispatcherObject *)type->tp_alloc(type, 0);
    if (d == NULL) return NULL;
    if (rel != Py_None) { Py_INCREF(rel); d->relevant_arg_func = rel; }
    Py_INCREF(impl);
    d->default_impl = impl;
    return (PyObject *)d;
}

static PyObject *dispatcher_call(PyObject *self, PyObject *args, PyObject *kwargs) {
    DispatcherObject *d = (DispatcherObject *)self;
    if (d->relevant_arg_func == NULL)
        return PyObject_Call(d->default_impl, args, kwargs);
    PyObject *relevant = PyObject_Call(d->relevant_arg_func, args, kwargs);
    if (relevant == NULL) return NULL;
    PyObject *seq = PySequence_Fast(relevant, "dispatcher did not return an iterable");
    Py_DECREF(relevant);
    if (seq == NULL) return NULL;
    for (Py_ssize_t i = 0; i < PySequence_Fast_GET_SIZE(seq); i++) {
        PyObject *a = PySequence_Fast_GET_ITEM(seq, i);
        if (PyObject_TypeCheck(a, &NdLike_Type)) continue;
        PyObject *af = NULL, *name = PyUnicode_FromString("__array_function__");
        int found = name == NULL ? -1 : PyObject_GetOptionalAttr(a, name, &af);
        Py_XDECREF(name);
        if (found < 0) {
            Py_DECREF(seq);
            return NULL;
        }
        if (af == NULL) continue;
        PyObject *kw = kwargs != NULL ? kwargs : PyDict_New();
        PyObject *r = PyObject_CallFunction(af, "O(O)OO", self, (PyObject *)Py_TYPE(a), args, kw);
        if (kw != kwargs) Py_DECREF(kw);
        Py_DECREF(af);
        Py_DECREF(seq);
        return r;
    }
    Py_DECREF(seq);
    return PyObject_Call(d->default_impl, args, kwargs);
}

static PyObject *dispatcher_get_implementation(PyObject *self, void *closure) {
    (void)closure;
    PyObject *impl = ((DispatcherObject *)self)->default_impl;
    Py_INCREF(impl);
    return impl;
}
static PyGetSetDef dispatcher_getset[] = {
    {"__dict__", PyObject_GenericGetDict, PyObject_GenericSetDict, NULL, NULL},
    {"_implementation", dispatcher_get_implementation, NULL, NULL, NULL},
    {NULL, NULL, NULL, NULL, NULL}
};
static PyTypeObject Dispatcher_Type = {
    PyVarObject_HEAD_INIT(NULL, 0)
    .tp_name = "numpy._ArrayFunctionDispatcher",
    .tp_basicsize = sizeof(DispatcherObject),
    .tp_dictoffset = offsetof(DispatcherObject, dict),
    .tp_flags = Py_TPFLAGS_DEFAULT,
    .tp_getset = dispatcher_getset,
    .tp_new = dispatcher_new,
    .tp_call = dispatcher_call,
};
#endif

#ifndef GRAIL_SHIM
/* ------------------------------------------------------------------ */
/* Cell: a subclassable type with its own tp_new and struct, as        */
/* ndarray is -- what ``class Sub(Cell)'' instances exercise          */
/* (docs/Shim_Foreign_Subclassing.md).  tp_new allocates through       */
/* type->tp_alloc, so a Python subclass's instance is a C body of the  */
/* subtype; ``describe'' reads a Python attribute of self from C, as   */
/* numpy reads __array_priority__ and __array_finalize__; ``is_cell''  */
/* is PyObject_TypeCheck, which walks the subtype's tp_mro / tp_base.  */
/* ------------------------------------------------------------------ */

typedef struct {
    PyObject_HEAD
    PyObject *value;
} CellObject;

static PyTypeObject Cell_Type;
#define CELL_VALUE(o) (((CellObject *)(o))->value)

static PyObject *cell_new(PyTypeObject *type, PyObject *args, PyObject *kwds) {
    PyObject *value = Py_None;
    static char *kwlist[] = {"value", NULL};
    if (!PyArg_ParseTupleAndKeywords(args, kwds, "|O:Cell", kwlist, &value))
        return NULL;
    CellObject *self = (CellObject *)type->tp_alloc(type, 0);
    if (self == NULL) return NULL;
    self->value = Py_NewRef(value);
    return (PyObject *)self;
}
static void cell_dealloc(PyObject *self) {
    Py_CLEAR(CELL_VALUE(self));
    Py_TYPE(self)->tp_free(self);
}
static PyObject *cell_get(PyObject *self, PyObject *noargs) {
    (void)noargs;
    return Py_NewRef(CELL_VALUE(self));
}
static PyObject *cell_describe(PyObject *self, PyObject *noargs) {
    (void)noargs;
    PyObject *label = PyObject_GetAttrString(self, "label");
    if (label == NULL) return NULL;
    PyObject *out = PyUnicode_FromFormat("%s:%S", Py_TYPE(self)->tp_name, label);
    Py_DECREF(label);
    return out;
}
static PyObject *cell_add(PyObject *a, PyObject *b) {
    if (PyObject_TypeCheck(a, &Cell_Type)) return PyNumber_Add(CELL_VALUE(a), b);
    return PyNumber_Add(a, CELL_VALUE(b));
}
static PyNumberMethods cell_as_number = { .nb_add = cell_add };
static PyMemberDef cell_members[] = {
    {"value", Py_T_OBJECT_EX, offsetof(CellObject, value), Py_READONLY, NULL},
    {NULL, 0, 0, 0, NULL}
};
static PyMethodDef cell_methods[] = {
    {"get", cell_get, METH_NOARGS, "the value"},
    {"describe", cell_describe, METH_NOARGS, "tp_name:self.label, read from C"},
    {NULL, NULL, 0, NULL}
};
static PyTypeObject Cell_Type = {
    PyVarObject_HEAD_INIT(NULL, 0)
    .tp_name = "_grail_demo.Cell",
    .tp_basicsize = sizeof(CellObject),
    .tp_flags = Py_TPFLAGS_DEFAULT | Py_TPFLAGS_BASETYPE,
    .tp_new = cell_new,
    .tp_dealloc = cell_dealloc,
    .tp_members = cell_members,
    .tp_methods = cell_methods,
    .tp_as_number = &cell_as_number,
};

/* sig_demo: a function whose doc carries a text signature, as Argument
   Clinic writes one -- ``__doc__'' is the text after the ``--'' line and
   ``__text_signature__'' the signature, which inspect.signature reads. */
static PyObject *
grail_sig_demo(PyObject *mod, PyObject *const *args, Py_ssize_t nargs) {
    (void)mod;
    return PyLong_FromSsize_t(nargs);
}

static PyObject *
grail_is_cell(PyObject *mod, PyObject *const *args, Py_ssize_t nargs) {
    (void)mod;
    if (nargs != 1) {
        PyErr_SetString(PyExc_TypeError, "is_cell takes one argument");
        return NULL;
    }
    return PyBool_FromLong(PyObject_TypeCheck(args[0], &Cell_Type));
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
    {"setattr_in_c", (PyCFunction)(void *)grail_setattr_in_c, METH_FASTCALL, NULL},
    {"unicode_compare", (PyCFunction)(void *)grail_unicode_compare, METH_FASTCALL, NULL},
    {"capi", (PyCFunction)(void *)grail_capi, METH_FASTCALL, NULL},
    {"is_cell", (PyCFunction)(void *)grail_is_cell, METH_FASTCALL, NULL},
    {"sig_demo", (PyCFunction)(void *)grail_sig_demo, METH_FASTCALL,
     "sig_demo($module, a, /, b=2, *, c=None)\n--\n\nA function with a text signature."},
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
    ByteSub_Type.tp_base = &PyBytes_Type;
    if (PyType_Ready(&ByteSub_Type) < 0) return -1;
    Meta_Type.tp_base = &PyType_Type;
    if (PyType_Ready(&Meta_Type) < 0) return -1;
    Py_SET_TYPE(&WithMeta_Type, &Meta_Type);
    if (PyType_Ready(&WithMeta_Type) < 0) return -1;
    if (PyModule_AddObjectRef(mod, "WithMeta", (PyObject *)&WithMeta_Type) < 0) return -1;
    if (PyType_Ready(&Dispatcher_Type) < 0 || PyType_Ready(&NdLike_Type) < 0
            || PyType_Ready(&OverLike_Type) < 0)
        return -1;
    if (PyModule_AddObjectRef(mod, "Dispatcher", (PyObject *)&Dispatcher_Type) < 0
            || PyModule_AddObjectRef(mod, "NdLike", (PyObject *)&NdLike_Type) < 0
            || PyModule_AddObjectRef(mod, "OverLike", (PyObject *)&OverLike_Type) < 0)
        return -1;
    if (PyType_Ready(&Cell_Type) < 0) return -1;
    if (PyModule_AddObjectRef(mod, "Cell", (PyObject *)&Cell_Type) < 0) return -1;
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
