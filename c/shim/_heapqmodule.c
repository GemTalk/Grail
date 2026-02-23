/*
 * _heapqmodule.c — Heap queue algorithm (a.k.a. priority queue).
 *
 * Adapted from CPython 3.14 Modules/_heapqmodule.c.
 * Original by Kevin O'Connor, augmented by Tim Peters, annotated by
 * François Pinard, and converted to C by Raymond Hettinger.
 *
 * Changes for GemStone cpython shim:
 *   - Uses cpython.h instead of Python.h
 *   - Replaces _PyList_ITEMS() raw array access with PyList_GET_ITEM/SET_ITEM
 *   - Replaces PyListObject* with PyObject* (no internal list struct)
 *   - Replaces Argument Clinic macros with manual METH_FASTCALL wrappers
 */

#include "cpython.h"
#include <assert.h>

/* ====================================================================
 * siftdown — sift a node down toward the root (min-heap)
 * ==================================================================== */

static int
siftdown(PyObject *heap, Py_ssize_t startpos, Py_ssize_t pos)
{
    PyObject *newitem, *parent;
    Py_ssize_t parentpos, size;
    int cmp;

    size = PyList_GET_SIZE(heap);
    if (pos >= size) {
        PyErr_SetString(PyExc_IndexError, "index out of range");
        return -1;
    }

    newitem = PyList_GET_ITEM(heap, pos);
    while (pos > startpos) {
        parentpos = (pos - 1) >> 1;
        parent = PyList_GET_ITEM(heap, parentpos);
        Py_INCREF(newitem);
        Py_INCREF(parent);
        cmp = PyObject_RichCompareBool(newitem, parent, Py_LT);
        Py_DECREF(parent);
        Py_DECREF(newitem);
        if (cmp < 0)
            return -1;
        if (size != PyList_GET_SIZE(heap)) {
            PyErr_SetString(PyExc_RuntimeError,
                            "list changed size during iteration");
            return -1;
        }
        if (cmp == 0)
            break;
        /* Swap heap[parentpos] and heap[pos] */
        parent = PyList_GET_ITEM(heap, parentpos);
        newitem = PyList_GET_ITEM(heap, pos);
        PyList_SET_ITEM(heap, parentpos, newitem);
        PyList_SET_ITEM(heap, pos, parent);
        pos = parentpos;
        newitem = PyList_GET_ITEM(heap, pos);
    }
    return 0;
}

/* ====================================================================
 * siftup — sift a node up toward the leaves (min-heap)
 * ==================================================================== */

static int
siftup(PyObject *heap, Py_ssize_t pos)
{
    Py_ssize_t startpos, endpos, childpos, limit;
    PyObject *tmp1, *tmp2;
    int cmp;

    endpos = PyList_GET_SIZE(heap);
    startpos = pos;
    if (pos >= endpos) {
        PyErr_SetString(PyExc_IndexError, "index out of range");
        return -1;
    }

    limit = endpos >> 1;
    while (pos < limit) {
        childpos = 2*pos + 1;
        if (childpos + 1 < endpos) {
            PyObject *a = PyList_GET_ITEM(heap, childpos);
            PyObject *b = PyList_GET_ITEM(heap, childpos + 1);
            Py_INCREF(a);
            Py_INCREF(b);
            cmp = PyObject_RichCompareBool(a, b, Py_LT);
            Py_DECREF(a);
            Py_DECREF(b);
            if (cmp < 0)
                return -1;
            childpos += ((unsigned)cmp ^ 1);
            if (endpos != PyList_GET_SIZE(heap)) {
                PyErr_SetString(PyExc_RuntimeError,
                                "list changed size during iteration");
                return -1;
            }
        }
        /* Move the smaller child up */
        tmp1 = PyList_GET_ITEM(heap, childpos);
        tmp2 = PyList_GET_ITEM(heap, pos);
        PyList_SET_ITEM(heap, childpos, tmp2);
        PyList_SET_ITEM(heap, pos, tmp1);
        pos = childpos;
    }
    return siftdown(heap, startpos, pos);
}

/* ====================================================================
 * siftdown_max — sift a node down toward the root (max-heap)
 * ==================================================================== */

static int
siftdown_max(PyObject *heap, Py_ssize_t startpos, Py_ssize_t pos)
{
    PyObject *newitem, *parent;
    Py_ssize_t parentpos, size;
    int cmp;

    size = PyList_GET_SIZE(heap);
    if (pos >= size) {
        PyErr_SetString(PyExc_IndexError, "index out of range");
        return -1;
    }

    newitem = PyList_GET_ITEM(heap, pos);
    while (pos > startpos) {
        parentpos = (pos - 1) >> 1;
        parent = PyList_GET_ITEM(heap, parentpos);
        Py_INCREF(parent);
        Py_INCREF(newitem);
        cmp = PyObject_RichCompareBool(parent, newitem, Py_LT);
        Py_DECREF(parent);
        Py_DECREF(newitem);
        if (cmp < 0)
            return -1;
        if (size != PyList_GET_SIZE(heap)) {
            PyErr_SetString(PyExc_RuntimeError,
                            "list changed size during iteration");
            return -1;
        }
        if (cmp == 0)
            break;
        /* Swap heap[parentpos] and heap[pos] */
        parent = PyList_GET_ITEM(heap, parentpos);
        newitem = PyList_GET_ITEM(heap, pos);
        PyList_SET_ITEM(heap, parentpos, newitem);
        PyList_SET_ITEM(heap, pos, parent);
        pos = parentpos;
        newitem = PyList_GET_ITEM(heap, pos);
    }
    return 0;
}

/* ====================================================================
 * siftup_max — sift a node up toward the leaves (max-heap)
 * ==================================================================== */

static int
siftup_max(PyObject *heap, Py_ssize_t pos)
{
    Py_ssize_t startpos, endpos, childpos, limit;
    PyObject *tmp1, *tmp2;
    int cmp;

    endpos = PyList_GET_SIZE(heap);
    startpos = pos;
    if (pos >= endpos) {
        PyErr_SetString(PyExc_IndexError, "index out of range");
        return -1;
    }

    limit = endpos >> 1;
    while (pos < limit) {
        childpos = 2*pos + 1;
        if (childpos + 1 < endpos) {
            PyObject *a = PyList_GET_ITEM(heap, childpos + 1);
            PyObject *b = PyList_GET_ITEM(heap, childpos);
            Py_INCREF(a);
            Py_INCREF(b);
            cmp = PyObject_RichCompareBool(a, b, Py_LT);
            Py_DECREF(a);
            Py_DECREF(b);
            if (cmp < 0)
                return -1;
            childpos += ((unsigned)cmp ^ 1);
            if (endpos != PyList_GET_SIZE(heap)) {
                PyErr_SetString(PyExc_RuntimeError,
                                "list changed size during iteration");
                return -1;
            }
        }
        /* Move the smaller child up */
        tmp1 = PyList_GET_ITEM(heap, childpos);
        tmp2 = PyList_GET_ITEM(heap, pos);
        PyList_SET_ITEM(heap, childpos, tmp2);
        PyList_SET_ITEM(heap, pos, tmp1);
        pos = childpos;
    }
    return siftdown_max(heap, startpos, pos);
}

/* ====================================================================
 * Public API functions — METH_FASTCALL wrappers
 * ==================================================================== */

/* heappush(heap, item) */
static PyObject *
heapq_heappush(PyObject *module, PyObject *const *args, Py_ssize_t nargs)
{
    (void)module;
    if (nargs != 2) {
        PyErr_Format(PyExc_TypeError, "heappush expected 2 args, got %zd", nargs);
        return NULL;
    }
    PyObject *heap = args[0];
    PyObject *item = args[1];

    if (PyList_Append(heap, item))
        return NULL;

    if (siftdown(heap, 0, PyList_GET_SIZE(heap) - 1))
        return NULL;
    Py_RETURN_NONE;
}

/* heappop(heap) */
static PyObject *
heappop_internal(PyObject *heap, int (*siftup_func)(PyObject *, Py_ssize_t))
{
    PyObject *lastelt, *returnitem;
    Py_ssize_t n;

    n = PyList_GET_SIZE(heap);
    if (n == 0) {
        PyErr_SetString(PyExc_IndexError, "index out of range");
        return NULL;
    }

    lastelt = PyList_GET_ITEM(heap, n - 1);
    Py_INCREF(lastelt);
    if (PyList_SetSlice(heap, n - 1, n, NULL)) {
        Py_DECREF(lastelt);
        return NULL;
    }
    n--;

    if (!n)
        return lastelt;
    returnitem = PyList_GET_ITEM(heap, 0);
    PyList_SET_ITEM(heap, 0, lastelt);
    if (siftup_func(heap, 0)) {
        Py_DECREF(returnitem);
        return NULL;
    }
    return returnitem;
}

static PyObject *
heapq_heappop(PyObject *module, PyObject *const *args, Py_ssize_t nargs)
{
    (void)module;
    if (nargs != 1) {
        PyErr_Format(PyExc_TypeError, "heappop expected 1 arg, got %zd", nargs);
        return NULL;
    }
    return heappop_internal(args[0], siftup);
}

/* heapreplace(heap, item) */
static PyObject *
heapreplace_internal(PyObject *heap, PyObject *item,
                     int (*siftup_func)(PyObject *, Py_ssize_t))
{
    PyObject *returnitem;

    if (PyList_GET_SIZE(heap) == 0) {
        PyErr_SetString(PyExc_IndexError, "index out of range");
        return NULL;
    }

    returnitem = PyList_GET_ITEM(heap, 0);
    PyList_SET_ITEM(heap, 0, Py_NewRef(item));
    if (siftup_func(heap, 0)) {
        Py_DECREF(returnitem);
        return NULL;
    }
    return returnitem;
}

static PyObject *
heapq_heapreplace(PyObject *module, PyObject *const *args, Py_ssize_t nargs)
{
    (void)module;
    if (nargs != 2) {
        PyErr_Format(PyExc_TypeError, "heapreplace expected 2 args, got %zd", nargs);
        return NULL;
    }
    return heapreplace_internal(args[0], args[1], siftup);
}

/* heappushpop(heap, item) */
static PyObject *
heapq_heappushpop(PyObject *module, PyObject *const *args, Py_ssize_t nargs)
{
    (void)module;
    if (nargs != 2) {
        PyErr_Format(PyExc_TypeError, "heappushpop expected 2 args, got %zd", nargs);
        return NULL;
    }
    PyObject *heap = args[0];
    PyObject *item = args[1];
    PyObject *returnitem;
    int cmp;

    if (PyList_GET_SIZE(heap) == 0) {
        return Py_NewRef(item);
    }

    PyObject *top = PyList_GET_ITEM(heap, 0);
    Py_INCREF(top);
    cmp = PyObject_RichCompareBool(top, item, Py_LT);
    Py_DECREF(top);
    if (cmp < 0)
        return NULL;
    if (cmp == 0) {
        return Py_NewRef(item);
    }

    if (PyList_GET_SIZE(heap) == 0) {
        PyErr_SetString(PyExc_IndexError, "index out of range");
        return NULL;
    }

    returnitem = PyList_GET_ITEM(heap, 0);
    PyList_SET_ITEM(heap, 0, Py_NewRef(item));
    if (siftup(heap, 0)) {
        Py_DECREF(returnitem);
        return NULL;
    }
    return returnitem;
}

/* heapify(heap) */
static PyObject *
heapify_internal(PyObject *heap, int (*siftup_func)(PyObject *, Py_ssize_t))
{
    Py_ssize_t i, n;

    n = PyList_GET_SIZE(heap);
    for (i = (n >> 1) - 1; i >= 0; i--)
        if (siftup_func(heap, i))
            return NULL;
    Py_RETURN_NONE;
}

static PyObject *
heapq_heapify(PyObject *module, PyObject *const *args, Py_ssize_t nargs)
{
    (void)module;
    if (nargs != 1) {
        PyErr_Format(PyExc_TypeError, "heapify expected 1 arg, got %zd", nargs);
        return NULL;
    }
    return heapify_internal(args[0], siftup);
}

/* _heappop_max(heap) */
static PyObject *
heapq_heappop_max(PyObject *module, PyObject *const *args, Py_ssize_t nargs)
{
    (void)module;
    if (nargs != 1) {
        PyErr_Format(PyExc_TypeError, "_heappop_max expected 1 arg, got %zd", nargs);
        return NULL;
    }
    return heappop_internal(args[0], siftup_max);
}

/* _heapreplace_max(heap, item) */
static PyObject *
heapq_heapreplace_max(PyObject *module, PyObject *const *args, Py_ssize_t nargs)
{
    (void)module;
    if (nargs != 2) {
        PyErr_Format(PyExc_TypeError, "_heapreplace_max expected 2 args, got %zd", nargs);
        return NULL;
    }
    return heapreplace_internal(args[0], args[1], siftup_max);
}

/* _heapify_max(heap) */
static PyObject *
heapq_heapify_max(PyObject *module, PyObject *const *args, Py_ssize_t nargs)
{
    (void)module;
    if (nargs != 1) {
        PyErr_Format(PyExc_TypeError, "_heapify_max expected 1 arg, got %zd", nargs);
        return NULL;
    }
    return heapify_internal(args[0], siftup_max);
}

/* ====================================================================
 * Module definition
 * ==================================================================== */

static PyMethodDef heapq_methods[] = {
    {"heappush", (PyCFunction)(void *)heapq_heappush,
     METH_FASTCALL, "Push item onto heap, maintaining the heap invariant."},
    {"heappop", (PyCFunction)(void *)heapq_heappop,
     METH_FASTCALL, "Pop the smallest item off the heap."},
    {"heapreplace", (PyCFunction)(void *)heapq_heapreplace,
     METH_FASTCALL, "Pop and return smallest, push new item."},
    {"heappushpop", (PyCFunction)(void *)heapq_heappushpop,
     METH_FASTCALL, "Push item, then pop and return smallest."},
    {"heapify", (PyCFunction)(void *)heapq_heapify,
     METH_FASTCALL, "Transform list into a heap, in-place."},
    {"_heappop_max", (PyCFunction)(void *)heapq_heappop_max,
     METH_FASTCALL, "Maxheap variant of heappop."},
    {"_heapreplace_max", (PyCFunction)(void *)heapq_heapreplace_max,
     METH_FASTCALL, "Maxheap variant of heapreplace."},
    {"_heapify_max", (PyCFunction)(void *)heapq_heapify_max,
     METH_FASTCALL, "Maxheap variant of heapify."},
    {NULL, NULL, 0, NULL}
};

PyDoc_STRVAR(module_doc,
    "Heap queue algorithm (a.k.a. priority queue).");

static struct PyModuleDef _heapqmodule = {
    PyModuleDef_HEAD_INIT,
    .m_name    = "_heapq",
    .m_doc     = module_doc,
    .m_size    = -1,
    .m_methods = heapq_methods,
    .m_slots   = NULL,
    .m_traverse = NULL,
    .m_clear    = NULL,
    .m_free     = NULL,
};

PyMODINIT_FUNC
PyInit__heapq(void) {
    return PyModuleDef_Init(&_heapqmodule);
}
