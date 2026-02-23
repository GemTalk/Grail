/*
 * _bisectmodule.c — Bisection algorithms (CPython C extension module).
 *
 * Uses the standard PyList_* and PyFloat_* APIs.
 *
 * All four functions use METH_FASTCALL with positional args:
 *   func(list, x [, lo [, hi]])
 */

#include "cpython.h"

/* ---------- Argument helpers ---------- */

/*
 * Parse the common (list, x, lo, hi) arguments for all four functions.
 * Returns 0 on success, -1 on error (with error state set).
 */
static int
parse_bisect_args(PyObject *const *args, Py_ssize_t nargs,
                  PyObject **out_list, double *out_x,
                  Py_ssize_t *out_lo, Py_ssize_t *out_hi)
{
    if (nargs < 2 || nargs > 4) {
        PyErr_Format(PyExc_TypeError,
            "expected 2 to 4 arguments, got %zd", nargs);
        return -1;
    }

    /* arg 0: list */
    if (!PyList_Check(args[0])) {
        PyErr_SetString(PyExc_TypeError, "first argument must be a list");
        return -1;
    }
    *out_list = args[0];

    /* arg 1: x (float) */
    if (!PyFloat_Check(args[1])) {
        PyErr_SetString(PyExc_TypeError, "second argument must be a float");
        return -1;
    }
    *out_x = PyFloat_AsDouble(args[1]);

    /* arg 2: lo (optional, default 0) */
    *out_lo = 0;
    if (nargs >= 3) {
        *out_lo = PyLong_AsSsize_t(args[2]);
        if (PyErr_Occurred()) return -1;
    }

    /* arg 3: hi (optional, default len(list)) */
    *out_hi = PyList_Size(*out_list);
    if (nargs >= 4) {
        *out_hi = PyLong_AsSsize_t(args[3]);
        if (PyErr_Occurred()) return -1;
    }

    if (*out_lo < 0) {
        PyErr_SetString(PyExc_ValueError, "lo must be non-negative");
        return -1;
    }
    if (*out_hi > PyList_Size(*out_list)) {
        *out_hi = PyList_Size(*out_list);
    }

    return 0;
}

/* ---------- Core algorithms ---------- */

static Py_ssize_t
internal_bisect_right(PyObject *list, double x,
                      Py_ssize_t lo, Py_ssize_t hi)
{
    while (lo < hi) {
        Py_ssize_t mid = (lo + hi) / 2;
        double midval = PyFloat_AsDouble(PyList_GetItem(list, mid));
        if (x < midval)
            hi = mid;
        else
            lo = mid + 1;
    }
    return lo;
}

static Py_ssize_t
internal_bisect_left(PyObject *list, double x,
                     Py_ssize_t lo, Py_ssize_t hi)
{
    while (lo < hi) {
        Py_ssize_t mid = (lo + hi) / 2;
        double midval = PyFloat_AsDouble(PyList_GetItem(list, mid));
        if (midval < x)
            lo = mid + 1;
        else
            hi = mid;
    }
    return lo;
}

/* ---------- Module methods ---------- */

static PyObject *
bisect_right(PyObject *module, PyObject *const *args, Py_ssize_t nargs)
{
    PyObject *list;
    double x;
    Py_ssize_t lo, hi;
    (void)module;

    if (parse_bisect_args(args, nargs, &list, &x, &lo, &hi) < 0)
        return NULL;

    return PyLong_FromSsize_t(internal_bisect_right(list, x, lo, hi));
}

static PyObject *
bisect_left(PyObject *module, PyObject *const *args, Py_ssize_t nargs)
{
    PyObject *list;
    double x;
    Py_ssize_t lo, hi;
    (void)module;

    if (parse_bisect_args(args, nargs, &list, &x, &lo, &hi) < 0)
        return NULL;

    return PyLong_FromSsize_t(internal_bisect_left(list, x, lo, hi));
}

static PyObject *
insort_right(PyObject *module, PyObject *const *args, Py_ssize_t nargs)
{
    PyObject *list;
    double x;
    Py_ssize_t lo, hi, index;
    (void)module;

    if (parse_bisect_args(args, nargs, &list, &x, &lo, &hi) < 0)
        return NULL;

    index = internal_bisect_right(list, x, lo, hi);
    PyList_Insert(list, index, args[1]);
    Py_RETURN_NONE;
}

static PyObject *
insort_left(PyObject *module, PyObject *const *args, Py_ssize_t nargs)
{
    PyObject *list;
    double x;
    Py_ssize_t lo, hi, index;
    (void)module;

    if (parse_bisect_args(args, nargs, &list, &x, &lo, &hi) < 0)
        return NULL;

    index = internal_bisect_left(list, x, lo, hi);
    PyList_Insert(list, index, args[1]);
    Py_RETURN_NONE;
}

/* ---------- Module definition ---------- */

static PyMethodDef bisect_methods[] = {
    {"bisect_right", (PyCFunction)(void *)bisect_right,
     METH_FASTCALL, "Return the index where to insert x in sorted list a (rightmost)."},
    {"bisect_left", (PyCFunction)(void *)bisect_left,
     METH_FASTCALL, "Return the index where to insert x in sorted list a (leftmost)."},
    {"insort_right", (PyCFunction)(void *)insort_right,
     METH_FASTCALL, "Insert x in sorted list a, keeping it sorted (rightmost)."},
    {"insort_left", (PyCFunction)(void *)insort_left,
     METH_FASTCALL, "Insert x in sorted list a, keeping it sorted (leftmost)."},
    {NULL, NULL, 0, NULL}
};

PyDoc_STRVAR(module_doc, "Bisection algorithms (shim version, float-only).");

static struct PyModuleDef _bisectmodule = {
    PyModuleDef_HEAD_INIT,
    .m_name = "_bisect",
    .m_doc = module_doc,
    .m_size = -1,
    .m_methods = bisect_methods,
    .m_slots = NULL,
    .m_traverse = NULL,
    .m_clear = NULL,
    .m_free = NULL,
};

PyMODINIT_FUNC
PyInit__bisect(void)
{
    return PyModuleDef_Init(&_bisectmodule);
}
