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
 */

#ifdef GRAIL_SHIM
#include "cpython.h"
#else
#include <Python.h>
#endif

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
    {NULL, NULL, 0, NULL}
};

/* Multi-phase init: module-level constants. Works on both real CPython
   and Grail (where shimDynLoad runs Py_mod_exec and shimModuleAttrs
   exports the constants as Python attributes). */
static int
grail_demo_exec(PyObject *mod) {
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
