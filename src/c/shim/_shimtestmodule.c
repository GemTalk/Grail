/*
 * _shimtestmodule.c — Test module for the CPython C API stand-in.
 *
 * Each function exercises a specific API feature so we can verify
 * correctness mechanically without depending on real extension modules.
 *
 * All functions use METH_FASTCALL.
 */

#include "cpython.h"
#include <string.h>

/* ------------------------------------------------------------------ */
/* test_float(x) -> x * 2.0                                           */
/* Exercises: PyFloat_AsDouble, PyFloat_FromDouble                     */
/* ------------------------------------------------------------------ */

static PyObject *
test_float(PyObject *module, PyObject *const *args, Py_ssize_t nargs) {
    (void)module;
    if (nargs != 1) {
        PyErr_Format(PyExc_TypeError, "test_float expected 1 arg, got %zd", nargs);
        return NULL;
    }
    double x = PyFloat_AsDouble(args[0]);
    return PyFloat_FromDouble(x * 2.0);
}

/* ------------------------------------------------------------------ */
/* test_int(n) -> n + 1                                                */
/* Exercises: PyLong_AsSsize_t, PyLong_FromSsize_t                     */
/* ------------------------------------------------------------------ */

static PyObject *
test_int(PyObject *module, PyObject *const *args, Py_ssize_t nargs) {
    (void)module;
    if (nargs != 1) {
        PyErr_Format(PyExc_TypeError, "test_int expected 1 arg, got %zd", nargs);
        return NULL;
    }
    Py_ssize_t n = PyLong_AsSsize_t(args[0]);
    return PyLong_FromSsize_t(n + 1);
}

/* ------------------------------------------------------------------ */
/* test_string_len(s) -> len(s) as integer                             */
/* Exercises: PyUnicode_AsUTF8, PyLong_FromSsize_t                     */
/* ------------------------------------------------------------------ */

static PyObject *
test_string_len(PyObject *module, PyObject *const *args, Py_ssize_t nargs) {
    (void)module;
    if (nargs != 1) {
        PyErr_Format(PyExc_TypeError, "test_string_len expected 1 arg, got %zd", nargs);
        return NULL;
    }
    const char *s = PyUnicode_AsUTF8(args[0]);
    if (!s) return NULL;
    return PyLong_FromSsize_t((Py_ssize_t)strlen(s));
}

/* ------------------------------------------------------------------ */
/* test_list_sum(n) -> sum of [1.0, 2.0, ..., n]                       */
/* Exercises: PyList_New, PyList_Append, PyList_Size, PyList_GetItem    */
/* ------------------------------------------------------------------ */

static PyObject *
test_list_sum(PyObject *module, PyObject *const *args, Py_ssize_t nargs) {
    (void)module;
    if (nargs != 1) {
        PyErr_Format(PyExc_TypeError, "test_list_sum expected 1 arg, got %zd", nargs);
        return NULL;
    }
    Py_ssize_t n = PyLong_AsSsize_t(args[0]);

    PyObject *list = PyList_New(0);
    for (Py_ssize_t i = 1; i <= n; i++) {
        PyList_Append(list, PyFloat_FromDouble((double)i));
    }

    double sum = 0.0;
    Py_ssize_t size = PyList_Size(list);
    for (Py_ssize_t i = 0; i < size; i++) {
        sum += PyFloat_AsDouble(PyList_GetItem(list, i));
    }

    return PyFloat_FromDouble(sum);
}

/* ------------------------------------------------------------------ */
/* test_list_modify(list, val) -> new size after appending val          */
/* Exercises: PyList_Append, PyList_Size (with external list)           */
/* ------------------------------------------------------------------ */

static PyObject *
test_list_modify(PyObject *module, PyObject *const *args, Py_ssize_t nargs) {
    (void)module;
    if (nargs != 2) {
        PyErr_Format(PyExc_TypeError, "test_list_modify expected 2 args, got %zd", nargs);
        return NULL;
    }
    PyList_Append(args[0], args[1]);
    return PyLong_FromSsize_t(PyList_Size(args[0]));
}

/* ------------------------------------------------------------------ */
/* test_bool_not(x) -> not x                                           */
/* Exercises: PyObject_IsTrue, Py_True, Py_False                       */
/* ------------------------------------------------------------------ */

static PyObject *
test_bool_not(PyObject *module, PyObject *const *args, Py_ssize_t nargs) {
    (void)module;
    if (nargs != 1) {
        PyErr_Format(PyExc_TypeError, "test_bool_not expected 1 arg, got %zd", nargs);
        return NULL;
    }
    if (PyObject_IsTrue(args[0]))
        Py_RETURN_FALSE;
    else
        Py_RETURN_TRUE;
}

/* ------------------------------------------------------------------ */
/* test_none() -> None                                                 */
/* Exercises: Py_RETURN_NONE                                           */
/* ------------------------------------------------------------------ */

static PyObject *
test_none(PyObject *module, PyObject *const *args, Py_ssize_t nargs) {
    (void)module; (void)args; (void)nargs;
    Py_RETURN_NONE;
}

/* ------------------------------------------------------------------ */
/* test_error() -> raises ValueError("test error message")             */
/* Exercises: PyErr_SetString, error propagation                       */
/* ------------------------------------------------------------------ */

static PyObject *
test_error(PyObject *module, PyObject *const *args, Py_ssize_t nargs) {
    (void)module; (void)args; (void)nargs;
    PyErr_SetString(PyExc_ValueError, "test error message");
    return NULL;
}

/* ------------------------------------------------------------------ */
/* test_bytes_len(b) -> len(b) as integer                              */
/* Exercises: PyBytes_AsString, PyBytes_Size                           */
/* ------------------------------------------------------------------ */

static PyObject *
test_bytes_len(PyObject *module, PyObject *const *args, Py_ssize_t nargs) {
    (void)module;
    if (nargs != 1) {
        PyErr_Format(PyExc_TypeError, "test_bytes_len expected 1 arg, got %zd", nargs);
        return NULL;
    }
    if (!PyBytes_Check(args[0])) {
        PyErr_SetString(PyExc_TypeError, "argument must be bytes");
        return NULL;
    }
    return PyLong_FromSsize_t(PyBytes_Size(args[0]));
}

/* ------------------------------------------------------------------ */
/* test_list_insert(list, idx, val) -> None (inserts val at idx)        */
/* Exercises: PyList_Insert                                            */
/* ------------------------------------------------------------------ */

static PyObject *
test_list_insert(PyObject *module, PyObject *const *args, Py_ssize_t nargs) {
    (void)module;
    if (nargs != 3) {
        PyErr_Format(PyExc_TypeError, "test_list_insert expected 3 args, got %zd", nargs);
        return NULL;
    }
    Py_ssize_t idx = PyLong_AsSsize_t(args[1]);
    PyList_Insert(args[0], idx, args[2]);
    Py_RETURN_NONE;
}

/* ------------------------------------------------------------------ */
/* test_dict_roundtrip(key, value) -> sets key=value, gets it back      */
/* Exercises: PyDict_New, PyDict_SetItem, PyDict_GetItem, PyDict_Size   */
/* ------------------------------------------------------------------ */

static PyObject *
test_dict_roundtrip(PyObject *module, PyObject *const *args, Py_ssize_t nargs) {
    (void)module;
    if (nargs != 2) {
        PyErr_Format(PyExc_TypeError, "test_dict_roundtrip expected 2 args, got %zd", nargs);
        return NULL;
    }

    PyObject *dict = PyDict_New();
    if (!dict) return NULL;

    if (PyDict_SetItem(dict, args[0], args[1]) < 0) return NULL;

    /* Verify size is 1 */
    if (PyDict_Size(dict) != 1) {
        PyErr_SetString(PyExc_RuntimeError, "dict size should be 1");
        return NULL;
    }

    PyObject *result = PyDict_GetItem(dict, args[0]);
    if (!result) {
        PyErr_SetString(PyExc_KeyError, "key not found after setting it");
        return NULL;
    }

    return result;
}

/* ------------------------------------------------------------------ */
/* test_dict_string_key(value) -> sets "mykey"=value, gets via string   */
/* Exercises: PyDict_SetItemString, PyDict_GetItemString                */
/* ------------------------------------------------------------------ */

static PyObject *
test_dict_string_key(PyObject *module, PyObject *const *args, Py_ssize_t nargs) {
    (void)module;
    if (nargs != 1) {
        PyErr_Format(PyExc_TypeError, "test_dict_string_key expected 1 arg, got %zd", nargs);
        return NULL;
    }

    PyObject *dict = PyDict_New();
    if (!dict) return NULL;

    if (PyDict_SetItemString(dict, "mykey", args[0]) < 0) return NULL;

    PyObject *result = PyDict_GetItemString(dict, "mykey");
    if (!result) {
        PyErr_SetString(PyExc_KeyError, "string key not found");
        return NULL;
    }

    return result;
}

/* ------------------------------------------------------------------ */
/* test_dict_contains(key) -> creates dict with key, returns bool       */
/* Exercises: PyDict_Contains                                           */
/* ------------------------------------------------------------------ */

static PyObject *
test_dict_contains(PyObject *module, PyObject *const *args, Py_ssize_t nargs) {
    (void)module;
    if (nargs != 1) {
        PyErr_Format(PyExc_TypeError, "test_dict_contains expected 1 arg, got %zd", nargs);
        return NULL;
    }

    PyObject *dict = PyDict_New();
    if (!dict) return NULL;

    /* Initially should not contain the key */
    if (PyDict_Contains(dict, args[0])) {
        PyErr_SetString(PyExc_RuntimeError, "empty dict should not contain key");
        return NULL;
    }

    /* Add the key */
    if (PyDict_SetItem(dict, args[0], Py_None) < 0) return NULL;

    /* Now it should contain the key */
    if (PyDict_Contains(dict, args[0]))
        Py_RETURN_TRUE;
    else
        Py_RETURN_FALSE;
}

/* ------------------------------------------------------------------ */
/* test_dict_del(key, value) -> sets key=value, deletes, returns size    */
/* Exercises: PyDict_DelItem                                            */
/* ------------------------------------------------------------------ */

static PyObject *
test_dict_del(PyObject *module, PyObject *const *args, Py_ssize_t nargs) {
    (void)module;
    if (nargs != 2) {
        PyErr_Format(PyExc_TypeError, "test_dict_del expected 2 args, got %zd", nargs);
        return NULL;
    }

    PyObject *dict = PyDict_New();
    if (!dict) return NULL;

    if (PyDict_SetItem(dict, args[0], args[1]) < 0) return NULL;
    if (PyDict_DelItem(dict, args[0]) < 0) return NULL;

    return PyLong_FromSsize_t(PyDict_Size(dict));
}

/* ------------------------------------------------------------------ */
/* test_tuple_roundtrip(a, b, c) -> creates tuple(a,b,c), returns b     */
/* Exercises: PyTuple_New, PyTuple_SetItem, PyTuple_GetItem, PyTuple_Size */
/* ------------------------------------------------------------------ */

static PyObject *
test_tuple_roundtrip(PyObject *module, PyObject *const *args, Py_ssize_t nargs) {
    (void)module;
    if (nargs != 3) {
        PyErr_Format(PyExc_TypeError, "test_tuple_roundtrip expected 3 args, got %zd", nargs);
        return NULL;
    }

    PyObject *tuple = PyTuple_New(3);
    if (!tuple) return NULL;

    PyTuple_SetItem(tuple, 0, args[0]);
    PyTuple_SetItem(tuple, 1, args[1]);
    PyTuple_SetItem(tuple, 2, args[2]);

    /* Verify size */
    if (PyTuple_Size(tuple) != 3) {
        PyErr_SetString(PyExc_RuntimeError, "tuple size should be 3");
        return NULL;
    }

    /* Return element at index 1 */
    return PyTuple_GetItem(tuple, 1);
}

/* ------------------------------------------------------------------ */
/* test_tuple_size(n) -> creates tuple of size n, returns size           */
/* Exercises: PyTuple_New, PyTuple_Size                                 */
/* ------------------------------------------------------------------ */

static PyObject *
test_tuple_size(PyObject *module, PyObject *const *args, Py_ssize_t nargs) {
    (void)module;
    if (nargs != 1) {
        PyErr_Format(PyExc_TypeError, "test_tuple_size expected 1 arg, got %zd", nargs);
        return NULL;
    }

    Py_ssize_t n = PyLong_AsSsize_t(args[0]);
    PyObject *tuple = PyTuple_New(n);
    if (!tuple) return NULL;

    return PyLong_FromSsize_t(PyTuple_Size(tuple));
}

/* ------------------------------------------------------------------ */
/* test_repr(obj) -> returns repr(obj) as string                        */
/* Exercises: PyObject_Repr                                             */
/* ------------------------------------------------------------------ */

static PyObject *
test_repr(PyObject *module, PyObject *const *args, Py_ssize_t nargs) {
    (void)module;
    if (nargs != 1) {
        PyErr_Format(PyExc_TypeError, "test_repr expected 1 arg, got %zd", nargs);
        return NULL;
    }
    return PyObject_Repr(args[0]);
}

/* ------------------------------------------------------------------ */
/* test_str(obj) -> returns str(obj) as string                          */
/* Exercises: PyObject_Str                                              */
/* ------------------------------------------------------------------ */

static PyObject *
test_str(PyObject *module, PyObject *const *args, Py_ssize_t nargs) {
    (void)module;
    if (nargs != 1) {
        PyErr_Format(PyExc_TypeError, "test_str expected 1 arg, got %zd", nargs);
        return NULL;
    }
    return PyObject_Str(args[0]);
}

/* ------------------------------------------------------------------ */
/* test_length(obj) -> returns len(obj) as integer                      */
/* Exercises: PyObject_Length                                            */
/* ------------------------------------------------------------------ */

static PyObject *
test_length(PyObject *module, PyObject *const *args, Py_ssize_t nargs) {
    (void)module;
    if (nargs != 1) {
        PyErr_Format(PyExc_TypeError, "test_length expected 1 arg, got %zd", nargs);
        return NULL;
    }
    Py_ssize_t len = PyObject_Length(args[0]);
    if (len < 0) return NULL;
    return PyLong_FromSsize_t(len);
}

/* ------------------------------------------------------------------ */
/* test_getattr(obj, name) -> returns getattr(obj, name)                */
/* Exercises: PyObject_GetAttrString                                    */
/* ------------------------------------------------------------------ */

static PyObject *
test_getattr(PyObject *module, PyObject *const *args, Py_ssize_t nargs) {
    (void)module;
    if (nargs != 2) {
        PyErr_Format(PyExc_TypeError, "test_getattr expected 2 args, got %zd", nargs);
        return NULL;
    }
    const char *name = PyUnicode_AsUTF8(args[1]);
    if (!name) return NULL;
    return PyObject_GetAttrString(args[0], name);
}

/* ------------------------------------------------------------------ */
/* test_hasattr(obj, name) -> returns hasattr(obj, name) as bool        */
/* Exercises: PyObject_HasAttrString                                    */
/* ------------------------------------------------------------------ */

static PyObject *
test_hasattr(PyObject *module, PyObject *const *args, Py_ssize_t nargs) {
    (void)module;
    if (nargs != 2) {
        PyErr_Format(PyExc_TypeError, "test_hasattr expected 2 args, got %zd", nargs);
        return NULL;
    }
    const char *name = PyUnicode_AsUTF8(args[1]);
    if (!name) return NULL;
    if (PyObject_HasAttrString(args[0], name))
        Py_RETURN_TRUE;
    else
        Py_RETURN_FALSE;
}

/* ------------------------------------------------------------------ */
/* test_type_checks(obj) -> bitmask of type checks                     */
/* Exercises: PyFloat_Check, PyLong_Check, PyUnicode_Check,            */
/*            PyBytes_Check, PyList_Check, PyDict_Check, PyTuple_Check */
/* ------------------------------------------------------------------ */

static PyObject *
test_type_checks(PyObject *module, PyObject *const *args, Py_ssize_t nargs) {
    (void)module;
    if (nargs != 1) {
        PyErr_Format(PyExc_TypeError, "test_type_checks expected 1 arg, got %zd", nargs);
        return NULL;
    }
    int mask = 0;
    if (PyFloat_Check(args[0]))   mask |= 1;
    if (PyLong_Check(args[0]))    mask |= 2;
    if (PyUnicode_Check(args[0])) mask |= 4;
    if (PyBytes_Check(args[0]))   mask |= 8;
    if (PyList_Check(args[0]))    mask |= 16;
    if (PyDict_Check(args[0]))    mask |= 32;
    if (PyTuple_Check(args[0]))   mask |= 64;
    return PyLong_FromSsize_t(mask);
}

/* ------------------------------------------------------------------ */
/* test_list_setitem(list, idx, val) -> returns list[idx] after set     */
/* Exercises: PyList_SetItem, PyList_GetItem                           */
/* ------------------------------------------------------------------ */

static PyObject *
test_list_setitem(PyObject *module, PyObject *const *args, Py_ssize_t nargs) {
    (void)module;
    if (nargs != 3) {
        PyErr_Format(PyExc_TypeError, "test_list_setitem expected 3 args, got %zd", nargs);
        return NULL;
    }
    Py_ssize_t idx = PyLong_AsSsize_t(args[1]);
    PyList_SetItem(args[0], idx, args[2]);
    return PyList_GetItem(args[0], idx);
}

/* ------------------------------------------------------------------ */
/* test_string_roundtrip(s) -> creates new string from C, returns it   */
/* Exercises: PyUnicode_AsUTF8, PyUnicode_FromString                   */
/* ------------------------------------------------------------------ */

static PyObject *
test_string_roundtrip(PyObject *module, PyObject *const *args, Py_ssize_t nargs) {
    (void)module;
    if (nargs != 1) {
        PyErr_Format(PyExc_TypeError, "test_string_roundtrip expected 1 arg, got %zd", nargs);
        return NULL;
    }
    const char *s = PyUnicode_AsUTF8(args[0]);
    if (!s) return NULL;
    return PyUnicode_FromString(s);
}

/* ------------------------------------------------------------------ */
/* test_bytes_roundtrip(b) -> creates bytes from C, returns size        */
/* Exercises: PyBytes_AsString, PyBytes_Size, PyBytes_FromStringAndSize */
/* ------------------------------------------------------------------ */

static PyObject *
test_bytes_roundtrip(PyObject *module, PyObject *const *args, Py_ssize_t nargs) {
    (void)module;
    if (nargs != 1) {
        PyErr_Format(PyExc_TypeError, "test_bytes_roundtrip expected 1 arg, got %zd", nargs);
        return NULL;
    }
    if (!PyBytes_Check(args[0])) {
        PyErr_SetString(PyExc_TypeError, "argument must be bytes");
        return NULL;
    }
    char *data = PyBytes_AsString(args[0]);
    Py_ssize_t size = PyBytes_Size(args[0]);
    PyObject *copy = PyBytes_FromStringAndSize(data, size);
    if (!copy) return NULL;
    return PyLong_FromSsize_t(PyBytes_Size(copy));
}

/* ------------------------------------------------------------------ */
/* test_error_format(n) -> raises TypeError with formatted message      */
/* Exercises: PyErr_Format                                             */
/* ------------------------------------------------------------------ */

static PyObject *
test_error_format(PyObject *module, PyObject *const *args, Py_ssize_t nargs) {
    (void)module;
    if (nargs != 1) {
        PyErr_Format(PyExc_TypeError, "test_error_format expected 1 arg, got %zd", nargs);
        return NULL;
    }
    Py_ssize_t n = PyLong_AsSsize_t(args[0]);
    PyErr_Format(PyExc_TypeError, "format error: %zd", n);
    return NULL;
}

/* ------------------------------------------------------------------ */
/* test_richcompare(a, b, op) -> RichCompareBool as bool               */
/* Exercises: PyObject_RichCompareBool                                 */
/* ------------------------------------------------------------------ */

static PyObject *
test_richcompare(PyObject *module, PyObject *const *args, Py_ssize_t nargs) {
    (void)module;
    if (nargs != 3) {
        PyErr_Format(PyExc_TypeError, "test_richcompare expected 3 args, got %zd", nargs);
        return NULL;
    }
    int op = (int)PyLong_AsSsize_t(args[2]);
    int result = PyObject_RichCompareBool(args[0], args[1], op);
    if (result < 0) return NULL;
    if (result)
        Py_RETURN_TRUE;
    else
        Py_RETURN_FALSE;
}

/* ------------------------------------------------------------------ */
/* test_ob_type(obj) -> returns tp_name string of the object's type    */
/* Exercises: Py_TYPE, tp_name                                         */
/* ------------------------------------------------------------------ */

static PyObject *
test_ob_type(PyObject *module, PyObject *const *args, Py_ssize_t nargs) {
    (void)module;
    if (nargs != 1) {
        PyErr_Format(PyExc_TypeError, "test_ob_type expected 1 arg, got %zd", nargs);
        return NULL;
    }
    PyTypeObject *type = Py_TYPE(args[0]);
    if (!type)
        return PyUnicode_FromString("NULL");
    return PyUnicode_FromString(type->tp_name);
}

/* ------------------------------------------------------------------ */
/* test_type_identity(obj) -> int identifying the type by pointer      */
/* 1=float, 2=int, 3=bool, 4=str, 5=bytes, 6=list, 7=dict, 8=tuple   */
/* Exercises: Py_TYPE, type object pointer comparison                   */
/* ------------------------------------------------------------------ */

static PyObject *
test_type_identity(PyObject *module, PyObject *const *args, Py_ssize_t nargs) {
    (void)module;
    if (nargs != 1) {
        PyErr_Format(PyExc_TypeError, "test_type_identity expected 1 arg, got %zd", nargs);
        return NULL;
    }
    PyObject *obj = args[0];
    if (Py_TYPE(obj) == &PyFloat_Type)      return PyLong_FromSsize_t(1);
    if (Py_TYPE(obj) == &PyLong_Type)       return PyLong_FromSsize_t(2);
    if (Py_TYPE(obj) == &PyBool_Type)       return PyLong_FromSsize_t(3);
    if (Py_TYPE(obj) == &PyUnicode_Type)    return PyLong_FromSsize_t(4);
    if (Py_TYPE(obj) == &PyBytes_Type)      return PyLong_FromSsize_t(5);
    if (Py_TYPE(obj) == &PyList_Type)       return PyLong_FromSsize_t(6);
    if (Py_TYPE(obj) == &PyDict_Type)       return PyLong_FromSsize_t(7);
    if (Py_TYPE(obj) == &PyTuple_Type)      return PyLong_FromSsize_t(8);
    if (Py_TYPE(obj) == &PyBaseObject_Type) return PyLong_FromSsize_t(9);
    return PyLong_FromSsize_t(0);
}

/* ------------------------------------------------------------------ */
/* test_tp_flags(obj) -> returns tp_flags of the object's type         */
/* Exercises: Py_TYPE, tp_flags                                        */
/* ------------------------------------------------------------------ */

static PyObject *
test_tp_flags(PyObject *module, PyObject *const *args, Py_ssize_t nargs) {
    (void)module;
    if (nargs != 1) {
        PyErr_Format(PyExc_TypeError, "test_tp_flags expected 1 arg, got %zd", nargs);
        return NULL;
    }
    PyTypeObject *type = Py_TYPE(args[0]);
    if (!type) return PyLong_FromSsize_t(0);
    return PyLong_FromSsize_t((Py_ssize_t)type->tp_flags);
}

/* ------------------------------------------------------------------ */
/* test_tp_base_name(obj) -> returns tp_name of the type's tp_base     */
/* Exercises: Py_TYPE, tp_base, tp_name                                */
/* ------------------------------------------------------------------ */

static PyObject *
test_tp_base_name(PyObject *module, PyObject *const *args, Py_ssize_t nargs) {
    (void)module;
    if (nargs != 1) {
        PyErr_Format(PyExc_TypeError, "test_tp_base_name expected 1 arg, got %zd", nargs);
        return NULL;
    }
    PyTypeObject *type = Py_TYPE(args[0]);
    if (!type || !type->tp_base)
        return PyUnicode_FromString("NULL");
    return PyUnicode_FromString(type->tp_base->tp_name);
}

/* ------------------------------------------------------------------ */
/* test_type_ready() -> creates a type via PyType_Ready, checks READY  */
/* Exercises: PyType_Ready, Py_TPFLAGS_READY                          */
/* ------------------------------------------------------------------ */

static PyTypeObject TestDummyType;

static PyObject *
test_type_ready(PyObject *module, PyObject *const *args, Py_ssize_t nargs) {
    (void)module; (void)args; (void)nargs;
    /* Clear it, then call PyType_Ready */
    memset(&TestDummyType, 0, sizeof(PyTypeObject));
    TestDummyType.tp_name = "DummyType";
    TestDummyType.tp_basicsize = sizeof(PyObject);
    TestDummyType.tp_flags = Py_TPFLAGS_DEFAULT;

    int result = PyType_Ready(&TestDummyType);
    if (result < 0)
        return PyLong_FromSsize_t(-1);

    /* Check that READY flag was set and base was assigned */
    int flags_ok = (TestDummyType.tp_flags & Py_TPFLAGS_READY) ? 1 : 0;
    int base_ok = (TestDummyType.tp_base == &PyBaseObject_Type) ? 1 : 0;
    return PyLong_FromSsize_t(flags_ok + base_ok);  /* 2 = both ok */
}

/* ------------------------------------------------------------------ */
/* test_sizeof_type() -> returns sizeof(PyTypeObject)                   */
/* Exercises: struct size                                               */
/* ------------------------------------------------------------------ */

static PyObject *
test_sizeof_type(PyObject *module, PyObject *const *args, Py_ssize_t nargs) {
    (void)module; (void)args; (void)nargs;
    return PyLong_FromSsize_t((Py_ssize_t)sizeof(PyTypeObject));
}

/* ------------------------------------------------------------------ */
/* Module definition                                                   */
/* ------------------------------------------------------------------ */

static PyMethodDef shimtest_methods[] = {
    {"test_float", (PyCFunction)(void *)test_float,
     METH_FASTCALL, "test_float(x) -> x * 2.0"},
    {"test_int", (PyCFunction)(void *)test_int,
     METH_FASTCALL, "test_int(n) -> n + 1"},
    {"test_string_len", (PyCFunction)(void *)test_string_len,
     METH_FASTCALL, "test_string_len(s) -> len(s)"},
    {"test_list_sum", (PyCFunction)(void *)test_list_sum,
     METH_FASTCALL, "test_list_sum(n) -> sum of [1..n]"},
    {"test_list_modify", (PyCFunction)(void *)test_list_modify,
     METH_FASTCALL, "test_list_modify(list, val) -> new size"},
    {"test_bool_not", (PyCFunction)(void *)test_bool_not,
     METH_FASTCALL, "test_bool_not(x) -> not x"},
    {"test_none", (PyCFunction)(void *)test_none,
     METH_FASTCALL, "test_none() -> None"},
    {"test_error", (PyCFunction)(void *)test_error,
     METH_FASTCALL, "test_error() -> raises ValueError"},
    {"test_bytes_len", (PyCFunction)(void *)test_bytes_len,
     METH_FASTCALL, "test_bytes_len(b) -> len(b)"},
    {"test_list_insert", (PyCFunction)(void *)test_list_insert,
     METH_FASTCALL, "test_list_insert(list, idx, val) -> None"},
    {"test_dict_roundtrip", (PyCFunction)(void *)test_dict_roundtrip,
     METH_FASTCALL, "test_dict_roundtrip(key, value) -> value"},
    {"test_dict_string_key", (PyCFunction)(void *)test_dict_string_key,
     METH_FASTCALL, "test_dict_string_key(value) -> value"},
    {"test_dict_contains", (PyCFunction)(void *)test_dict_contains,
     METH_FASTCALL, "test_dict_contains(key) -> True"},
    {"test_dict_del", (PyCFunction)(void *)test_dict_del,
     METH_FASTCALL, "test_dict_del(key, value) -> 0"},
    {"test_tuple_roundtrip", (PyCFunction)(void *)test_tuple_roundtrip,
     METH_FASTCALL, "test_tuple_roundtrip(a, b, c) -> b"},
    {"test_tuple_size", (PyCFunction)(void *)test_tuple_size,
     METH_FASTCALL, "test_tuple_size(n) -> n"},
    {"test_repr", (PyCFunction)(void *)test_repr,
     METH_FASTCALL, "test_repr(obj) -> repr(obj)"},
    {"test_str", (PyCFunction)(void *)test_str,
     METH_FASTCALL, "test_str(obj) -> str(obj)"},
    {"test_length", (PyCFunction)(void *)test_length,
     METH_FASTCALL, "test_length(obj) -> len(obj)"},
    {"test_getattr", (PyCFunction)(void *)test_getattr,
     METH_FASTCALL, "test_getattr(obj, name) -> getattr(obj, name)"},
    {"test_hasattr", (PyCFunction)(void *)test_hasattr,
     METH_FASTCALL, "test_hasattr(obj, name) -> hasattr(obj, name)"},
    {"test_type_checks", (PyCFunction)(void *)test_type_checks,
     METH_FASTCALL, "test_type_checks(obj) -> bitmask"},
    {"test_list_setitem", (PyCFunction)(void *)test_list_setitem,
     METH_FASTCALL, "test_list_setitem(list, idx, val) -> list[idx]"},
    {"test_string_roundtrip", (PyCFunction)(void *)test_string_roundtrip,
     METH_FASTCALL, "test_string_roundtrip(s) -> s"},
    {"test_bytes_roundtrip", (PyCFunction)(void *)test_bytes_roundtrip,
     METH_FASTCALL, "test_bytes_roundtrip(b) -> size"},
    {"test_error_format", (PyCFunction)(void *)test_error_format,
     METH_FASTCALL, "test_error_format(n) -> raises TypeError"},
    {"test_richcompare", (PyCFunction)(void *)test_richcompare,
     METH_FASTCALL, "test_richcompare(a, b, op) -> bool"},
    {"test_ob_type", (PyCFunction)(void *)test_ob_type,
     METH_FASTCALL, "test_ob_type(obj) -> tp_name string"},
    {"test_type_identity", (PyCFunction)(void *)test_type_identity,
     METH_FASTCALL, "test_type_identity(obj) -> int code"},
    {"test_tp_flags", (PyCFunction)(void *)test_tp_flags,
     METH_FASTCALL, "test_tp_flags(obj) -> tp_flags"},
    {"test_tp_base_name", (PyCFunction)(void *)test_tp_base_name,
     METH_FASTCALL, "test_tp_base_name(obj) -> base type name"},
    {"test_type_ready", (PyCFunction)(void *)test_type_ready,
     METH_FASTCALL, "test_type_ready() -> 2 if ok"},
    {"test_sizeof_type", (PyCFunction)(void *)test_sizeof_type,
     METH_FASTCALL, "test_sizeof_type() -> sizeof(PyTypeObject)"},
    {NULL, NULL, 0, NULL}
};

PyDoc_STRVAR(module_doc,
    "Test module for the CPython C API stand-in.");

static struct PyModuleDef _shimtestmodule = {
    PyModuleDef_HEAD_INIT,
    .m_name    = "_shimtest",
    .m_doc     = module_doc,
    .m_size    = -1,
    .m_methods = shimtest_methods,
    .m_slots   = NULL,
    .m_traverse = NULL,
    .m_clear    = NULL,
    .m_free     = NULL,
};

PyMODINIT_FUNC
PyInit__shimtest(void) {
    return PyModuleDef_Init(&_shimtestmodule);
}
