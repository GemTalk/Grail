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
/* test_call_one(callable, arg) -> callable(arg)                       */
/* Exercises: PyObject_CallOneArg -> PyObject_Call -> server           */
/* ------------------------------------------------------------------ */

static PyObject *
test_call_one(PyObject *module, PyObject *const *args, Py_ssize_t nargs) {
    (void)module;
    if (nargs != 2) {
        PyErr_Format(PyExc_TypeError, "test_call_one expected 2 args, got %zd", nargs);
        return NULL;
    }
    return PyObject_CallOneArg(args[0], args[1]);
}

/* ------------------------------------------------------------------ */
/* test_call_noargs(callable) -> callable()                            */
/* ------------------------------------------------------------------ */

static PyObject *
test_call_noargs(PyObject *module, PyObject *const *args, Py_ssize_t nargs) {
    (void)module;
    if (nargs != 1) {
        PyErr_Format(PyExc_TypeError, "test_call_noargs expected 1 arg, got %zd", nargs);
        return NULL;
    }
    return PyObject_CallNoArgs(args[0]);
}

/* ------------------------------------------------------------------ */
/* test_obj_getitem(obj, key) -> obj[key]                              */
/* test_obj_setitem(obj, key, value) -> None                           */
/* Exercises: PyObject_GetItem / PyObject_SetItem                      */
/* ------------------------------------------------------------------ */

static PyObject *
test_obj_getitem(PyObject *module, PyObject *const *args, Py_ssize_t nargs) {
    (void)module;
    if (nargs != 2) {
        PyErr_Format(PyExc_TypeError, "test_obj_getitem expected 2 args, got %zd", nargs);
        return NULL;
    }
    return PyObject_GetItem(args[0], args[1]);
}

static PyObject *
test_obj_setitem(PyObject *module, PyObject *const *args, Py_ssize_t nargs) {
    (void)module;
    if (nargs != 3) {
        PyErr_Format(PyExc_TypeError, "test_obj_setitem expected 3 args, got %zd", nargs);
        return NULL;
    }
    if (PyObject_SetItem(args[0], args[1], args[2]) < 0)
        return NULL;
    Py_RETURN_NONE;
}

/* ------------------------------------------------------------------ */
/* test_setattr(obj, name, value) -> None                              */
/* Exercises: PyObject_SetAttrString                                   */
/* ------------------------------------------------------------------ */

static PyObject *
test_setattr(PyObject *module, PyObject *const *args, Py_ssize_t nargs) {
    (void)module;
    if (nargs != 3) {
        PyErr_Format(PyExc_TypeError, "test_setattr expected 3 args, got %zd", nargs);
        return NULL;
    }
    const char *name = PyUnicode_AsUTF8(args[1]);
    if (!name) return NULL;
    if (PyObject_SetAttrString(args[0], name, args[2]) < 0)
        return NULL;
    Py_RETURN_NONE;
}

/* ------------------------------------------------------------------ */
/* test_richcompare_obj(a, b, op) -> a <op> b as object                */
/* Exercises: PyObject_RichCompare (object-returning variant)          */
/* ------------------------------------------------------------------ */

static PyObject *
test_richcompare_obj(PyObject *module, PyObject *const *args, Py_ssize_t nargs) {
    (void)module;
    if (nargs != 3) {
        PyErr_Format(PyExc_TypeError, "test_richcompare_obj expected 3 args, got %zd", nargs);
        return NULL;
    }
    int op = (int)PyLong_AsLong(args[2]);
    return PyObject_RichCompare(args[0], args[1], op);
}

/* ------------------------------------------------------------------ */
/* test_seq_getitem(seq, i) -> seq[i] via PySequence_GetItem           */
/* (pass a str to exercise the server fallback path)                   */
/* ------------------------------------------------------------------ */

static PyObject *
test_seq_getitem(PyObject *module, PyObject *const *args, Py_ssize_t nargs) {
    (void)module;
    if (nargs != 2) {
        PyErr_Format(PyExc_TypeError, "test_seq_getitem expected 2 args, got %zd", nargs);
        return NULL;
    }
    return PySequence_GetItem(args[0], PyLong_AsSsize_t(args[1]));
}

/* ------------------------------------------------------------------ */
/* test_import_attr(modname, attrname) -> module.attr                  */
/* Exercises: _PyImport_GetModuleAttrString -> server importGetAttr    */
/* ------------------------------------------------------------------ */

static PyObject *
test_import_attr(PyObject *module, PyObject *const *args, Py_ssize_t nargs) {
    (void)module;
    if (nargs != 2) {
        PyErr_Format(PyExc_TypeError, "test_import_attr expected 2 args, got %zd", nargs);
        return NULL;
    }
    const char *mod = PyUnicode_AsUTF8(args[0]);
    const char *attr = PyUnicode_AsUTF8(args[1]);
    if (!mod || !attr) return NULL;
    return _PyImport_GetModuleAttrString(mod, attr);
}

/* ------------------------------------------------------------------ */
/* test_iter_sum(iterable) -> sum of int items                         */
/* Exercises: PyObject_GetIter, PyIter_Next                            */
/* ------------------------------------------------------------------ */

static PyObject *
test_iter_sum(PyObject *module, PyObject *const *args, Py_ssize_t nargs) {
    (void)module;
    if (nargs != 1) {
        PyErr_Format(PyExc_TypeError, "test_iter_sum expected 1 arg, got %zd", nargs);
        return NULL;
    }
    PyObject *iter = PyObject_GetIter(args[0]);
    if (!iter) return NULL;
    Py_ssize_t sum = 0;
    PyObject *item;
    while ((item = PyIter_Next(iter)) != NULL) {
        sum += PyLong_AsSsize_t(item);
    }
    if (PyErr_Occurred()) return NULL;
    return PyLong_FromSsize_t(sum);
}

/* ------------------------------------------------------------------ */
/* test_is_true(obj) -> int truthiness                                 */
/* test_long_check(obj) -> PyLong_Check (1 for bool too)               */
/* ------------------------------------------------------------------ */

static PyObject *
test_is_true(PyObject *module, PyObject *const *args, Py_ssize_t nargs) {
    (void)module;
    if (nargs != 1) {
        PyErr_Format(PyExc_TypeError, "test_is_true expected 1 arg, got %zd", nargs);
        return NULL;
    }
    return PyLong_FromSsize_t(PyObject_IsTrue(args[0]));
}

static PyObject *
test_long_check(PyObject *module, PyObject *const *args, Py_ssize_t nargs) {
    (void)module;
    if (nargs != 1) {
        PyErr_Format(PyExc_TypeError, "test_long_check expected 1 arg, got %zd", nargs);
        return NULL;
    }
    return PyLong_FromSsize_t(PyLong_Check(args[0]));
}

/* ------------------------------------------------------------------ */
/* test_slice_adjust(length, start, stop, step) -> [count,start,stop]  */
/* Exercises: PySlice_AdjustIndices                                    */
/* ------------------------------------------------------------------ */

static PyObject *
test_slice_adjust(PyObject *module, PyObject *const *args, Py_ssize_t nargs) {
    (void)module;
    if (nargs != 4) {
        PyErr_Format(PyExc_TypeError, "test_slice_adjust expected 4 args, got %zd", nargs);
        return NULL;
    }
    Py_ssize_t length = PyLong_AsSsize_t(args[0]);
    Py_ssize_t start = PyLong_AsSsize_t(args[1]);
    Py_ssize_t stop = PyLong_AsSsize_t(args[2]);
    Py_ssize_t step = PyLong_AsSsize_t(args[3]);
    Py_ssize_t count = PySlice_AdjustIndices(length, &start, &stop, step);
    PyObject *list = PyList_New(0);
    PyList_Append(list, PyLong_FromSsize_t(count));
    PyList_Append(list, PyLong_FromSsize_t(start));
    PyList_Append(list, PyLong_FromSsize_t(stop));
    return list;
}

/* ------------------------------------------------------------------ */
/* test_generic_new() -> 1 if PyType_GenericNew allocates correctly    */
/* ------------------------------------------------------------------ */

static PyTypeObject GenericNewDummy;

static PyObject *
test_generic_new(PyObject *module, PyObject *const *args, Py_ssize_t nargs) {
    (void)module; (void)args; (void)nargs;
    memset(&GenericNewDummy, 0, sizeof(PyTypeObject));
    GenericNewDummy.tp_name = "GenericNewDummy";
    GenericNewDummy.tp_basicsize = sizeof(PyObject) + 64;
    PyType_Ready(&GenericNewDummy);
    PyObject *obj = PyType_GenericNew(&GenericNewDummy, NULL, NULL);
    if (!obj) return PyLong_FromSsize_t(0);
    int ok = (Py_TYPE(obj) == &GenericNewDummy) && (obj->ob_refcnt == 1);
    PyObject_GC_Del(obj);
    return PyLong_FromSsize_t(ok);
}

/* ------------------------------------------------------------------ */
/* test_parse_tuple(s, n, d) -> strlen(s) + n + d as float             */
/* Exercises: PyArg_ParseTuple "snd"                                   */
/* ------------------------------------------------------------------ */

static PyObject *
test_parse_tuple(PyObject *module, PyObject *const *args, Py_ssize_t nargs) {
    (void)module;
    PyObject *tuple = PyTuple_New(nargs);
    if (!tuple) return NULL;
    for (Py_ssize_t i = 0; i < nargs; i++)
        PyTuple_SetItem(tuple, i, args[i]);
    const char *s = NULL;
    Py_ssize_t n = 0;
    double d = 0.0;
    if (!PyArg_ParseTuple(tuple, "snd:test_parse_tuple", &s, &n, &d))
        return NULL;
    return PyFloat_FromDouble((double)strlen(s) + (double)n + d);
}

/* ------------------------------------------------------------------ */
/* test_build_value(n, s) -> (n+1, s, [n, n]) via Py_BuildValue        */
/* ------------------------------------------------------------------ */

static PyObject *
test_build_value(PyObject *module, PyObject *const *args, Py_ssize_t nargs) {
    (void)module;
    if (nargs != 2) {
        PyErr_Format(PyExc_TypeError, "test_build_value expected 2 args, got %zd", nargs);
        return NULL;
    }
    Py_ssize_t n = PyLong_AsSsize_t(args[0]);
    const char *s = PyUnicode_AsUTF8(args[1]);
    if (!s) return NULL;
    return Py_BuildValue("(ns[nn])", n + 1, s, n, n);
}

/* ------------------------------------------------------------------ */
/* test_getattr_obj(obj, name) -> getattr via PyObject_GetAttr         */
/* ------------------------------------------------------------------ */

static PyObject *
test_getattr_obj(PyObject *module, PyObject *const *args, Py_ssize_t nargs) {
    (void)module;
    if (nargs != 2) {
        PyErr_Format(PyExc_TypeError, "test_getattr_obj expected 2 args, got %zd", nargs);
        return NULL;
    }
    return PyObject_GetAttr(args[0], args[1]);
}

/* ------------------------------------------------------------------ */
/* test_long64(n) -> PyLong_AsLongLong(n) * 2 via FromLongLong         */
/* ------------------------------------------------------------------ */

static PyObject *
test_long64(PyObject *module, PyObject *const *args, Py_ssize_t nargs) {
    (void)module;
    if (nargs != 1) {
        PyErr_Format(PyExc_TypeError, "test_long64 expected 1 arg, got %zd", nargs);
        return NULL;
    }
    long long v = PyLong_AsLongLong(args[0]);
    return PyLong_FromLongLong(v * 2);
}

/* ------------------------------------------------------------------ */
/* test_utf8_size(s) -> byte length via PyUnicode_AsUTF8AndSize        */
/* ------------------------------------------------------------------ */

static PyObject *
test_utf8_size(PyObject *module, PyObject *const *args, Py_ssize_t nargs) {
    (void)module;
    if (nargs != 1) {
        PyErr_Format(PyExc_TypeError, "test_utf8_size expected 1 arg, got %zd", nargs);
        return NULL;
    }
    Py_ssize_t size = -1;
    const char *s = PyUnicode_AsUTF8AndSize(args[0], &size);
    if (!s) return NULL;
    return PyLong_FromSsize_t(size);
}

/* ------------------------------------------------------------------ */
/* test_unicode_concat(a, b) -> a + b                                  */
/* ------------------------------------------------------------------ */

static PyObject *
test_unicode_concat(PyObject *module, PyObject *const *args, Py_ssize_t nargs) {
    (void)module;
    if (nargs != 2) {
        PyErr_Format(PyExc_TypeError, "test_unicode_concat expected 2 args, got %zd", nargs);
        return NULL;
    }
    return PyUnicode_Concat(args[0], args[1]);
}

/* ------------------------------------------------------------------ */
/* Dict API additions                                                  */
/* ------------------------------------------------------------------ */

static PyObject *
test_dict_keys(PyObject *module, PyObject *const *args, Py_ssize_t nargs) {
    (void)module;
    if (nargs != 1) {
        PyErr_Format(PyExc_TypeError, "test_dict_keys expected 1 arg, got %zd", nargs);
        return NULL;
    }
    return PyDict_Keys(args[0]);
}

static PyObject *
test_dict_items_count(PyObject *module, PyObject *const *args, Py_ssize_t nargs) {
    (void)module;
    if (nargs != 1) {
        PyErr_Format(PyExc_TypeError, "test_dict_items_count expected 1 arg, got %zd", nargs);
        return NULL;
    }
    PyObject *items = PyDict_Items(args[0]);
    if (!items) return NULL;
    return PyLong_FromSsize_t(PyList_Size(items));
}

static PyObject *
test_dict_setdefault(PyObject *module, PyObject *const *args, Py_ssize_t nargs) {
    (void)module;
    if (nargs != 3) {
        PyErr_Format(PyExc_TypeError, "test_dict_setdefault expected 3 args, got %zd", nargs);
        return NULL;
    }
    return PyDict_SetDefault(args[0], args[1], args[2]);
}

static PyObject *
test_dict_merge(PyObject *module, PyObject *const *args, Py_ssize_t nargs) {
    (void)module;
    if (nargs != 3) {
        PyErr_Format(PyExc_TypeError, "test_dict_merge expected 3 args, got %zd", nargs);
        return NULL;
    }
    int override = PyObject_IsTrue(args[2]);
    if (PyDict_Merge(args[0], args[1], override) < 0)
        return NULL;
    Py_RETURN_NONE;
}

static PyObject *
test_dict_clear(PyObject *module, PyObject *const *args, Py_ssize_t nargs) {
    (void)module;
    if (nargs != 1) {
        PyErr_Format(PyExc_TypeError, "test_dict_clear expected 1 arg, got %zd", nargs);
        return NULL;
    }
    PyDict_Clear(args[0]);
    return PyLong_FromSsize_t(PyDict_Size(args[0]));
}

/* ------------------------------------------------------------------ */
/* List / tuple API additions                                          */
/* ------------------------------------------------------------------ */

static PyObject *
test_list_slice(PyObject *module, PyObject *const *args, Py_ssize_t nargs) {
    (void)module;
    if (nargs != 3) {
        PyErr_Format(PyExc_TypeError, "test_list_slice expected 3 args, got %zd", nargs);
        return NULL;
    }
    return PyList_GetSlice(args[0], PyLong_AsSsize_t(args[1]),
                           PyLong_AsSsize_t(args[2]));
}

static PyObject *
test_list_sort(PyObject *module, PyObject *const *args, Py_ssize_t nargs) {
    (void)module;
    if (nargs != 1) {
        PyErr_Format(PyExc_TypeError, "test_list_sort expected 1 arg, got %zd", nargs);
        return NULL;
    }
    if (PyList_Sort(args[0]) < 0) return NULL;
    Py_RETURN_NONE;
}

static PyObject *
test_list_reverse(PyObject *module, PyObject *const *args, Py_ssize_t nargs) {
    (void)module;
    if (nargs != 1) {
        PyErr_Format(PyExc_TypeError, "test_list_reverse expected 1 arg, got %zd", nargs);
        return NULL;
    }
    if (PyList_Reverse(args[0]) < 0) return NULL;
    Py_RETURN_NONE;
}

static PyObject *
test_list_astuple(PyObject *module, PyObject *const *args, Py_ssize_t nargs) {
    (void)module;
    if (nargs != 1) {
        PyErr_Format(PyExc_TypeError, "test_list_astuple expected 1 arg, got %zd", nargs);
        return NULL;
    }
    return PyList_AsTuple(args[0]);
}

static PyObject *
test_tuple_slice(PyObject *module, PyObject *const *args, Py_ssize_t nargs) {
    (void)module;
    if (nargs != 3) {
        PyErr_Format(PyExc_TypeError, "test_tuple_slice expected 3 args, got %zd", nargs);
        return NULL;
    }
    return PyTuple_GetSlice(args[0], PyLong_AsSsize_t(args[1]),
                            PyLong_AsSsize_t(args[2]));
}

static PyObject *
test_seq_contains(PyObject *module, PyObject *const *args, Py_ssize_t nargs) {
    (void)module;
    if (nargs != 2) {
        PyErr_Format(PyExc_TypeError, "test_seq_contains expected 2 args, got %zd", nargs);
        return NULL;
    }
    int r = PySequence_Contains(args[0], args[1]);
    if (r < 0) return NULL;
    return PyLong_FromSsize_t(r);
}

/* ------------------------------------------------------------------ */
/* test_capsule_roundtrip() -> 1 when capsule semantics hold           */
/* ------------------------------------------------------------------ */

static PyObject *
test_capsule_roundtrip(PyObject *module, PyObject *const *args, Py_ssize_t nargs) {
    (void)module; (void)args; (void)nargs;
    static int payload = 42;
    PyObject *cap = PyCapsule_New(&payload, "shimtest.payload", NULL);
    if (!cap) return NULL;
    int ok = PyCapsule_IsValid(cap, "shimtest.payload");
    ok = ok && (PyCapsule_GetPointer(cap, "shimtest.payload") == &payload);
    ok = ok && (PyCapsule_GetPointer(cap, "wrong.name") == NULL);
    PyErr_Clear();  /* the wrong-name probe sets ValueError */
    ok = ok && (strcmp(PyCapsule_GetName(cap), "shimtest.payload") == 0);
    return PyLong_FromSsize_t(ok);
}

/* ------------------------------------------------------------------ */
/* test_new_exception() -> raises a dynamically created exception      */
/* ------------------------------------------------------------------ */

static PyObject *
test_new_exception(PyObject *module, PyObject *const *args, Py_ssize_t nargs) {
    (void)module; (void)args; (void)nargs;
    PyObject *exc = PyErr_NewException("_shimtest.CustomError", PyExc_ValueError, NULL);
    PyErr_SetString(exc, "custom failure");
    return NULL;
}

/* ------------------------------------------------------------------ */
/* test_exc_matches() -> 1 if KeyError matches LookupError             */
/* ------------------------------------------------------------------ */

static PyObject *
test_exc_matches(PyObject *module, PyObject *const *args, Py_ssize_t nargs) {
    (void)module; (void)args; (void)nargs;
    PyErr_SetString(PyExc_KeyError, "probe");
    int direct = PyErr_ExceptionMatches(PyExc_KeyError);
    int parent = PyErr_ExceptionMatches(PyExc_LookupError);
    int base = PyErr_ExceptionMatches(PyExc_Exception);
    int wrong = PyErr_ExceptionMatches(PyExc_TypeError);
    PyErr_Clear();
    return PyLong_FromSsize_t(direct && parent && base && !wrong);
}

/* ------------------------------------------------------------------ */
/* test_kwargs(*args, x=?, y=?) — METH_FASTCALL|METH_KEYWORDS          */
/* returns sum(args) + 100*x + 10000*y                                 */
/* ------------------------------------------------------------------ */

static PyObject *
test_kwargs(PyObject *module, PyObject *const *args, Py_ssize_t nargs,
            PyObject *kwnames) {
    (void)module;
    Py_ssize_t sum = 0;
    for (Py_ssize_t i = 0; i < nargs; i++)
        sum += PyLong_AsSsize_t(args[i]);
    if (kwnames) {
        Py_ssize_t nkw = PyTuple_Size(kwnames);
        for (Py_ssize_t i = 0; i < nkw; i++) {
            const char *name = PyUnicode_AsUTF8(PyTuple_GetItem(kwnames, i));
            PyObject *val = args[nargs + i];
            if (name && strcmp(name, "x") == 0)
                sum += 100 * PyLong_AsSsize_t(val);
            else if (name && strcmp(name, "y") == 0)
                sum += 10000 * PyLong_AsSsize_t(val);
        }
    }
    return PyLong_FromSsize_t(sum);
}

/* ------------------------------------------------------------------ */
/* test_kwargs_dict(**kw) — METH_VARARGS|METH_KEYWORDS                 */
/* returns kw["key"] or None                                           */
/* ------------------------------------------------------------------ */

static PyObject *
test_kwargs_dict(PyObject *module, PyObject *args, PyObject *kwargs) {
    (void)module; (void)args;
    if (!kwargs) Py_RETURN_NONE;
    PyObject *v = PyDict_GetItemString(kwargs, "key");
    if (!v) Py_RETURN_NONE;
    return Py_NewRef(v);
}

/* ------------------------------------------------------------------ */
/* Counter — heap type exercising tp_getset (get AND set), tp_methods, */
/* and the buffer protocol via PyType_FromModuleAndSpec.               */
/* ------------------------------------------------------------------ */

typedef struct {
    PyObject_HEAD
    Py_ssize_t value;
    char text[16];
} CounterObject;

static PyObject *
Counter_incr(PyObject *self, PyObject *ignored) {
    (void)ignored;
    CounterObject *c = (CounterObject *)self;
    c->value++;
    return PyLong_FromSsize_t(c->value);
}

static PyObject *
Counter_get_value(PyObject *self, void *closure) {
    (void)closure;
    return PyLong_FromSsize_t(((CounterObject *)self)->value);
}

static int
Counter_set_value(PyObject *self, PyObject *v, void *closure) {
    (void)closure;
    Py_ssize_t n = PyLong_AsSsize_t(v);
    if (n == -1 && PyErr_Occurred()) return -1;
    ((CounterObject *)self)->value = n;
    return 0;
}

static int
Counter_getbuffer(PyObject *self, Py_buffer *view, int flags) {
    (void)flags;
    CounterObject *c = (CounterObject *)self;
    memset(view, 0, sizeof(Py_buffer));
    view->obj = self;
    view->buf = c->text;
    view->len = (Py_ssize_t)strlen(c->text);
    view->itemsize = 1;
    view->readonly = 1;
    return 0;
}

static PyMethodDef Counter_methods[] = {
    {"incr", (PyCFunction)Counter_incr, METH_NOARGS, "increment, return value"},
    {NULL, NULL, 0, NULL}
};

static PyGetSetDef Counter_getset[] = {
    {"value", Counter_get_value, Counter_set_value, "counter value", NULL},
    {NULL, NULL, NULL, NULL, NULL}
};

static PyType_Slot Counter_slots[] = {
    {Py_tp_methods, Counter_methods},
    {Py_tp_getset, Counter_getset},
    {Py_bf_getbuffer, (void *)Counter_getbuffer},
    {0, NULL}
};

static PyType_Spec Counter_spec = {
    "_shimtest.Counter",
    sizeof(CounterObject),
    0,
    Py_TPFLAGS_DEFAULT,
    Counter_slots
};

static PyObject *CounterType;  /* created in shimtest_exec */

static PyObject *
test_make_counter(PyObject *module, PyObject *const *args, Py_ssize_t nargs) {
    (void)module; (void)args; (void)nargs;
    if (!CounterType) {
        PyErr_SetString(PyExc_RuntimeError, "Counter type not initialized");
        return NULL;
    }
    PyObject *obj = PyType_GenericNew((PyTypeObject *)CounterType, NULL, NULL);
    if (!obj) return NULL;
    strcpy(((CounterObject *)obj)->text, "counter!");
    return obj;
}

static PyObject *
test_counter_text(PyObject *module, PyObject *const *args, Py_ssize_t nargs) {
    (void)module;
    if (nargs != 1) {
        PyErr_Format(PyExc_TypeError, "test_counter_text expected 1 arg, got %zd", nargs);
        return NULL;
    }
    /* arg is the counter's C address as an int */
    PyObject *obj = (PyObject *)(intptr_t)PyLong_AsSsize_t(args[0]);
    Py_buffer view;
    if (PyObject_GetBuffer(obj, &view, PyBUF_SIMPLE) < 0)
        return NULL;
    PyObject *result = PyUnicode_FromStringAndSize((const char *)view.buf, view.len);
    PyBuffer_Release(&view);
    return result;
}

/* ------------------------------------------------------------------ */
/* test_heap_type_base() — FromSpecWithBases(spec, PyLong_Type):       */
/* instance must pass PyLong_Check via inherited subclass flag.        */
/* ------------------------------------------------------------------ */

static PyObject *
test_heap_type_base(PyObject *module, PyObject *const *args, Py_ssize_t nargs) {
    (void)module; (void)args; (void)nargs;
    static PyType_Slot IntLike_slots[] = { {0, NULL} };
    static PyType_Spec IntLike_spec = {
        "_shimtest.IntLike", sizeof(PyObject), 0, Py_TPFLAGS_DEFAULT,
        IntLike_slots
    };
    PyObject *type = PyType_FromSpecWithBases(&IntLike_spec,
                                              (PyObject *)&PyLong_Type);
    if (!type) return NULL;
    PyObject *inst = PyType_GenericNew((PyTypeObject *)type, NULL, NULL);
    if (!inst) return NULL;
    int ok = PyLong_Check(inst) &&
             (((PyTypeObject *)type)->tp_base == &PyLong_Type);
    PyObject_GC_Del(inst);
    return PyLong_FromSsize_t(ok);
}

/* ------------------------------------------------------------------ */
/* test_slice_roundtrip(start, stop, step) -> [start, stop, step]      */
/* via PySlice_New + PySlice_Unpack                                    */
/* ------------------------------------------------------------------ */

static PyObject *
test_slice_roundtrip(PyObject *module, PyObject *const *args, Py_ssize_t nargs) {
    (void)module;
    if (nargs != 3) {
        PyErr_Format(PyExc_TypeError, "test_slice_roundtrip expected 3 args, got %zd", nargs);
        return NULL;
    }
    PyObject *sl = PySlice_New(args[0], args[1], args[2]);
    if (!sl) return NULL;
    Py_ssize_t start, stop, step;
    if (PySlice_Unpack(sl, &start, &stop, &step) < 0)
        return NULL;
    PyObject *list = PyList_New(0);
    PyList_Append(list, PyLong_FromSsize_t(start));
    PyList_Append(list, PyLong_FromSsize_t(stop));
    PyList_Append(list, PyLong_FromSsize_t(step));
    return list;
}

/* ------------------------------------------------------------------ */
/* test_slice_defaults() -> 1 when slice(None,None,None) unpacks to    */
/* CPython defaults (0, PY_SSIZE_T_MAX, 1)                             */
/* ------------------------------------------------------------------ */

static PyObject *
test_slice_defaults(PyObject *module, PyObject *const *args, Py_ssize_t nargs) {
    (void)module; (void)args; (void)nargs;
    PyObject *sl = PySlice_New(NULL, NULL, NULL);
    if (!sl) return NULL;
    Py_ssize_t start, stop, step;
    if (PySlice_Unpack(sl, &start, &stop, &step) < 0)
        return NULL;
    int ok = (start == 0) && (stop == PY_SSIZE_T_MAX) && (step == 1);
    return PyLong_FromSsize_t(ok);
}

/* ------------------------------------------------------------------ */
/* test_set_roundtrip(item) -> the set, after New/Add/Contains checks  */
/* ------------------------------------------------------------------ */

static PyObject *
test_set_roundtrip(PyObject *module, PyObject *const *args, Py_ssize_t nargs) {
    (void)module;
    if (nargs != 1) {
        PyErr_Format(PyExc_TypeError, "test_set_roundtrip expected 1 arg, got %zd", nargs);
        return NULL;
    }
    PyObject *set = PySet_New(NULL);
    if (!set) return NULL;
    if (PySet_Add(set, args[0]) < 0) return NULL;
    if (PySet_Add(set, args[0]) < 0) return NULL;  /* dup is a no-op */
    if (PySet_Contains(set, args[0]) != 1) {
        PyErr_SetString(PyExc_RuntimeError, "PySet_Contains failed");
        return NULL;
    }
    if (PySet_Size(set) != 1) {
        PyErr_SetString(PyExc_RuntimeError, "PySet_Size != 1");
        return NULL;
    }
    if (!PySet_Check(set)) {
        PyErr_SetString(PyExc_RuntimeError, "PySet_Check failed");
        return NULL;
    }
    return set;
}

/* ------------------------------------------------------------------ */
/* test_bytearray(b) -> bytearray copy of the bytes argument           */
/* ------------------------------------------------------------------ */

static PyObject *
test_bytearray(PyObject *module, PyObject *const *args, Py_ssize_t nargs) {
    (void)module;
    if (nargs != 1) {
        PyErr_Format(PyExc_TypeError, "test_bytearray expected 1 arg, got %zd", nargs);
        return NULL;
    }
    char *data = PyBytes_AsString(args[0]);
    Py_ssize_t len = PyBytes_Size(args[0]);
    PyObject *ba = PyByteArray_FromStringAndSize(data, len);
    if (!ba) return NULL;
    if (!PyByteArray_Check(ba)) {
        PyErr_SetString(PyExc_RuntimeError, "PyByteArray_Check failed");
        return NULL;
    }
    return ba;
}

/* ------------------------------------------------------------------ */
/* test_from_format(obj) -> "repr=<%R> str=<%S> n=42"                  */
/* ------------------------------------------------------------------ */

static PyObject *
test_from_format(PyObject *module, PyObject *const *args, Py_ssize_t nargs) {
    (void)module;
    if (nargs != 1) {
        PyErr_Format(PyExc_TypeError, "test_from_format expected 1 arg, got %zd", nargs);
        return NULL;
    }
    return PyUnicode_FromFormat("repr=<%R> str=<%S> n=%d", args[0], args[0], 42);
}

/* ------------------------------------------------------------------ */
/* Module definition                                                   */
/* ------------------------------------------------------------------ */

static PyMethodDef shimtest_methods[] = {
    {"test_kwargs", (PyCFunction)(void *)test_kwargs,
     METH_FASTCALL | METH_KEYWORDS, "test_kwargs(*a, x=0, y=0) -> sum"},
    {"test_kwargs_dict", (PyCFunction)(void *)test_kwargs_dict,
     METH_VARARGS | METH_KEYWORDS, "test_kwargs_dict(**kw) -> kw['key']"},
    {"test_make_counter", (PyCFunction)(void *)test_make_counter,
     METH_FASTCALL, "test_make_counter() -> new Counter (C ptr)"},
    {"test_counter_text", (PyCFunction)(void *)test_counter_text,
     METH_FASTCALL, "test_counter_text(addr) -> buffer contents"},
    {"test_heap_type_base", (PyCFunction)(void *)test_heap_type_base,
     METH_FASTCALL, "test_heap_type_base() -> 1 if ok"},
    {"test_slice_roundtrip", (PyCFunction)(void *)test_slice_roundtrip,
     METH_FASTCALL, "test_slice_roundtrip(a, b, c) -> [start, stop, step]"},
    {"test_slice_defaults", (PyCFunction)(void *)test_slice_defaults,
     METH_FASTCALL, "test_slice_defaults() -> 1 if ok"},
    {"test_set_roundtrip", (PyCFunction)(void *)test_set_roundtrip,
     METH_FASTCALL, "test_set_roundtrip(item) -> set"},
    {"test_bytearray", (PyCFunction)(void *)test_bytearray,
     METH_FASTCALL, "test_bytearray(b) -> bytearray"},
    {"test_from_format", (PyCFunction)(void *)test_from_format,
     METH_FASTCALL, "test_from_format(obj) -> formatted string"},
    {"test_call_one", (PyCFunction)(void *)test_call_one,
     METH_FASTCALL, "test_call_one(f, x) -> f(x)"},
    {"test_call_noargs", (PyCFunction)(void *)test_call_noargs,
     METH_FASTCALL, "test_call_noargs(f) -> f()"},
    {"test_obj_getitem", (PyCFunction)(void *)test_obj_getitem,
     METH_FASTCALL, "test_obj_getitem(obj, key) -> obj[key]"},
    {"test_obj_setitem", (PyCFunction)(void *)test_obj_setitem,
     METH_FASTCALL, "test_obj_setitem(obj, key, value) -> None"},
    {"test_setattr", (PyCFunction)(void *)test_setattr,
     METH_FASTCALL, "test_setattr(obj, name, value) -> None"},
    {"test_richcompare_obj", (PyCFunction)(void *)test_richcompare_obj,
     METH_FASTCALL, "test_richcompare_obj(a, b, op) -> object"},
    {"test_seq_getitem", (PyCFunction)(void *)test_seq_getitem,
     METH_FASTCALL, "test_seq_getitem(seq, i) -> seq[i]"},
    {"test_import_attr", (PyCFunction)(void *)test_import_attr,
     METH_FASTCALL, "test_import_attr(mod, attr) -> value"},
    {"test_iter_sum", (PyCFunction)(void *)test_iter_sum,
     METH_FASTCALL, "test_iter_sum(iterable) -> sum"},
    {"test_is_true", (PyCFunction)(void *)test_is_true,
     METH_FASTCALL, "test_is_true(obj) -> 0/1"},
    {"test_long_check", (PyCFunction)(void *)test_long_check,
     METH_FASTCALL, "test_long_check(obj) -> 0/1"},
    {"test_slice_adjust", (PyCFunction)(void *)test_slice_adjust,
     METH_FASTCALL, "test_slice_adjust(len, start, stop, step) -> [count, start, stop]"},
    {"test_generic_new", (PyCFunction)(void *)test_generic_new,
     METH_FASTCALL, "test_generic_new() -> 1 if ok"},
    {"test_parse_tuple", (PyCFunction)(void *)test_parse_tuple,
     METH_FASTCALL, "test_parse_tuple(s, n, d) -> len(s)+n+d"},
    {"test_build_value", (PyCFunction)(void *)test_build_value,
     METH_FASTCALL, "test_build_value(n, s) -> (n+1, s, [n, n])"},
    {"test_getattr_obj", (PyCFunction)(void *)test_getattr_obj,
     METH_FASTCALL, "test_getattr_obj(obj, name) -> attr"},
    {"test_long64", (PyCFunction)(void *)test_long64,
     METH_FASTCALL, "test_long64(n) -> n*2 via long long"},
    {"test_utf8_size", (PyCFunction)(void *)test_utf8_size,
     METH_FASTCALL, "test_utf8_size(s) -> UTF-8 byte length"},
    {"test_unicode_concat", (PyCFunction)(void *)test_unicode_concat,
     METH_FASTCALL, "test_unicode_concat(a, b) -> a + b"},
    {"test_dict_keys", (PyCFunction)(void *)test_dict_keys,
     METH_FASTCALL, "test_dict_keys(d) -> list of keys"},
    {"test_dict_items_count", (PyCFunction)(void *)test_dict_items_count,
     METH_FASTCALL, "test_dict_items_count(d) -> len(d.items())"},
    {"test_dict_setdefault", (PyCFunction)(void *)test_dict_setdefault,
     METH_FASTCALL, "test_dict_setdefault(d, k, v) -> value"},
    {"test_dict_merge", (PyCFunction)(void *)test_dict_merge,
     METH_FASTCALL, "test_dict_merge(a, b, override) -> None"},
    {"test_dict_clear", (PyCFunction)(void *)test_dict_clear,
     METH_FASTCALL, "test_dict_clear(d) -> 0"},
    {"test_list_slice", (PyCFunction)(void *)test_list_slice,
     METH_FASTCALL, "test_list_slice(list, lo, hi) -> list[lo:hi]"},
    {"test_list_sort", (PyCFunction)(void *)test_list_sort,
     METH_FASTCALL, "test_list_sort(list) -> None (in place)"},
    {"test_list_reverse", (PyCFunction)(void *)test_list_reverse,
     METH_FASTCALL, "test_list_reverse(list) -> None (in place)"},
    {"test_list_astuple", (PyCFunction)(void *)test_list_astuple,
     METH_FASTCALL, "test_list_astuple(list) -> tuple"},
    {"test_tuple_slice", (PyCFunction)(void *)test_tuple_slice,
     METH_FASTCALL, "test_tuple_slice(t, lo, hi) -> t[lo:hi]"},
    {"test_seq_contains", (PyCFunction)(void *)test_seq_contains,
     METH_FASTCALL, "test_seq_contains(seq, item) -> 0/1"},
    {"test_capsule_roundtrip", (PyCFunction)(void *)test_capsule_roundtrip,
     METH_FASTCALL, "test_capsule_roundtrip() -> 1 if ok"},
    {"test_new_exception", (PyCFunction)(void *)test_new_exception,
     METH_FASTCALL, "test_new_exception() -> raises CustomError"},
    {"test_exc_matches", (PyCFunction)(void *)test_exc_matches,
     METH_FASTCALL, "test_exc_matches() -> 1 if hierarchy matching works"},
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

/* Multi-phase init: register module-level constants so shimModuleAttrs
   export can be tested. The capsule is deliberately non-exportable (a
   C-only object) and must be skipped by the export. */
static int
shimtest_exec(PyObject *mod) {
    static int capsule_payload = 7;
    PyModule_AddIntConstant(mod, "MAGIC_INT", 42);
    PyModule_AddStringConstant(mod, "MAGIC_STR", "grail");
    PyModule_AddObjectRef(mod, "MAGIC_FLOAT", PyFloat_FromDouble(2.5));
    PyModule_AddObjectRef(mod, "SKIPPED_CAPSULE",
        PyCapsule_New(&capsule_payload, "shimtest.skipped", NULL));
    /* Heap type for the typed-object tests (registered against this
       module so shimCallTyped finds it by short name "Counter"). */
    CounterType = PyType_FromModuleAndSpec(mod, &Counter_spec, NULL);
    if (!CounterType) return -1;
    return 0;
}

static PyModuleDef_Slot shimtest_slots[] = {
    {Py_mod_exec, (void *)shimtest_exec},
    {0, NULL}
};

static struct PyModuleDef _shimtestmodule = {
    PyModuleDef_HEAD_INIT,
    .m_name    = "_shimtest",
    .m_doc     = module_doc,
    .m_size    = -1,
    .m_methods = shimtest_methods,
    .m_slots   = shimtest_slots,
    .m_traverse = NULL,
    .m_clear    = NULL,
    .m_free     = NULL,
};

PyMODINIT_FUNC
PyInit__shimtest(void) {
    return PyModuleDef_Init(&_shimtestmodule);
}
