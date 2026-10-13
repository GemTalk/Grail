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

static PyTypeObject Box_Type = {
    PyVarObject_HEAD_INIT(NULL, 0)
    .tp_name = "_grail_demo.Box",
    .tp_basicsize = sizeof(BoxObject),
    .tp_dictoffset = offsetof(BoxObject, dict),
    .tp_flags = Py_TPFLAGS_DEFAULT,
    .tp_members = box_members,
    .tp_getset = box_getset,
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
