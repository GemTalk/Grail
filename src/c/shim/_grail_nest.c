/*
 * _grail_nest — extension modules whose exec slot imports another
 * extension module, as Cython modules import their siblings
 * (numpy.random._bounded_integers imports bit_generator, which imports
 * _common).  A REAL CPython extension, like _grail_demo.so; the Makefile's
 * `dynmods` target builds it four times:
 *
 *   -DNEST_LEVEL=1  _grail_nest1.so  imports nothing; exports two C
 *                   functions in __pyx_capi__, in two batches, as Cython's
 *                   __Pyx_ExportFunction does
 *   -DNEST_LEVEL=2  _grail_nest2.so  imports _grail_nest1 with
 *                   PyImport_ImportModule and calls its exported functions
 *   -DNEST_LEVEL=3  _grail_nest3.so  imports _grail_nest2 with
 *                   PyImport_ImportModuleLevelObject and the module's own
 *                   dict as globals, as Cython's __Pyx_Import does
 *   -DNEST_FAIL     _grail_nestbad.so  imports _grail_nest1, puts itself in
 *                   sys.modules as Cython does, then fails
 *
 * Under Grail, loading an extension is a user action, and GemStone allows
 * two in flight: three nested loads must not each be one.
 *
 * Each module also stores into the dict PyModule_GetDict answers, and reads
 * its __name__ there, as Cython's module init does.
 */

#include <Python.h>

#define STR2(x) #x
#define STR(x) STR2(x)

#ifdef NEST_FAIL
#define NEST_NAME _grail_nestbad
#define NEST_LEVEL 2
#define INNER_NAME "_grail_nest1"
#elif NEST_LEVEL == 1
#define NEST_NAME _grail_nest1
#elif NEST_LEVEL == 2
#define NEST_NAME _grail_nest2
#define INNER_NAME "_grail_nest1"
#else
#define NEST_NAME _grail_nest3
#define INNER_NAME "_grail_nest2"
#endif

#define CONCAT2(a, b) a##b
#define CONCAT(a, b) CONCAT2(a, b)

#if NEST_LEVEL == 1
static long doubled(long x) { return 2 * x; }
static long negated(long x) { return -x; }

/* __Pyx_ExportFunction: find or make the module's __pyx_capi__ dict, then
   add one capsule to it, named by the function's C signature. */
static int export_function(PyObject *mod, const char *name, long (*f)(long)) {
    PyObject *d = PyObject_GetAttrString(mod, "__pyx_capi__");
    if (d == NULL) {
        PyErr_Clear();
        d = PyDict_New();
        if (d == NULL) return -1;
        Py_INCREF(d);
        if (PyModule_AddObject(mod, "__pyx_capi__", d) < 0) {
            Py_DECREF(d); Py_DECREF(d);
            return -1;
        }
    }
    PyObject *cap = PyCapsule_New((void *)f, "long (long)", NULL);
    int rc = cap == NULL ? -1 : PyDict_SetItemString(d, name, cap);
    Py_XDECREF(cap);
    Py_DECREF(d);
    return rc;
}
#elif NEST_LEVEL == 2
/* __Pyx_ImportFunction: the capsule from the other module's __pyx_capi__,
   checked against the signature it was exported with. */
static long (*import_function(PyObject *inner, const char *name))(long) {
    PyObject *d = PyObject_GetAttrString(inner, "__pyx_capi__");
    if (d == NULL) return NULL;
    PyObject *cap = PyDict_GetItemString(d, name);
    Py_DECREF(d);
    if (cap == NULL) {
        PyErr_Format(PyExc_ImportError, "%s does not export %s", INNER_NAME, name);
        return NULL;
    }
    return (long (*)(long))PyCapsule_GetPointer(cap, "long (long)");
}
#endif

static int
nest_exec(PyObject *mod)
{
    PyObject *dict = PyModule_GetDict(mod);   /* borrowed */
    if (dict == NULL) return -1;
    long depth = 1;
#if NEST_LEVEL == 1
    if (export_function(mod, "doubled", doubled) < 0) return -1;
    if (export_function(mod, "negated", negated) < 0) return -1;
#else
#if NEST_LEVEL == 3
    PyObject *name = PyUnicode_FromString(INNER_NAME);
    PyObject *inner = name == NULL ? NULL
        : PyImport_ImportModuleLevelObject(name, dict, NULL, NULL, 0);
    Py_XDECREF(name);
#else
    PyObject *inner = PyImport_ImportModule(INNER_NAME);
#endif
    if (inner == NULL) return -1;
    PyObject *inner_depth = PyObject_GetAttrString(inner, "depth");
    if (inner_depth == NULL) { Py_DECREF(inner); return -1; }
    depth += PyLong_AsLong(inner_depth);
    Py_DECREF(inner_depth);
#if NEST_LEVEL == 2
    long (*dbl)(long) = import_function(inner, "doubled");
    long (*neg)(long) = dbl == NULL ? NULL : import_function(inner, "negated");
    if (neg == NULL) { Py_DECREF(inner); return -1; }
    PyObject *called = Py_BuildValue("(ll)", dbl(21), neg(5));
#else
    PyObject *called = PyObject_GetAttrString(inner, "called");
#endif
    if (called == NULL || PyDict_SetItemString(dict, "called", called) < 0) {
        Py_XDECREF(called); Py_DECREF(inner);
        return -1;
    }
    Py_DECREF(called);
    if (PyModule_AddObjectRef(mod, "inner", inner) < 0) { Py_DECREF(inner); return -1; }
    Py_DECREF(inner);
#endif
#ifdef NEST_FAIL
    /* A Cython module puts itself in sys.modules as its exec starts, so a
       failure after that must take it out again. */
    if (PyDict_SetItemString(PyImport_GetModuleDict(), "_grail_nestbad", mod) < 0) return -1;
    PyErr_SetString(PyExc_RuntimeError, "_grail_nestbad refuses to load");
    return -1;
#endif
    PyObject *v = PyLong_FromLong(depth);
    if (v == NULL || PyDict_SetItemString(dict, "depth", v) < 0) { Py_XDECREF(v); return -1; }
    Py_DECREF(v);
    PyObject *own = PyDict_GetItemString(dict, "__name__");   /* borrowed */
    if (PyDict_SetItemString(dict, "name_in_dict", own != NULL ? own : Py_None) < 0) return -1;
    return 0;
}

static PyModuleDef_Slot nest_slots[] = {
    {Py_mod_exec, (void *)nest_exec},
    {Py_mod_multiple_interpreters, Py_MOD_PER_INTERPRETER_GIL_SUPPORTED},
    {0, NULL}
};

static struct PyModuleDef nest_module = {
    PyModuleDef_HEAD_INIT,
    .m_name = STR(NEST_NAME),
    .m_doc  = "An extension module that imports another in its exec slot.",
    .m_size = 0,
    .m_slots = nest_slots,
};

PyMODINIT_FUNC
CONCAT(PyInit_, NEST_NAME)(void)
{
    return PyModuleDef_Init(&nest_module);
}
