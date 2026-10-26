/*
 * _grail_subhost — an extension module that makes a SUBMODULE the way PyO3
 * does (hypothesis._native.internal.floats): a module created from a def and
 * a spec (PyModule_FromDefAndSpec), its exec slots run (PyModule_ExecDef),
 * bound as an attribute of its parent and registered in sys.modules under
 * its dotted name.  A REAL CPython extension, like _grail_demo.so; the
 * Makefile's `dynmods` target builds it as lib/grail_extpkg/_host.so, inside
 * a package, so that importing ``grail_extpkg._host.inner'' must load the
 * extension as the PARENT of the name being imported.
 */

#include <Python.h>

static int inner_exec(PyObject *m) {
    return PyModule_AddIntConstant(m, "VALUE", 42);
}

static PyModuleDef_Slot inner_slots[] = {
    {Py_mod_exec, (void *)inner_exec},
    {0, NULL}
};

static struct PyModuleDef inner_def = {
    PyModuleDef_HEAD_INIT, "inner", NULL, 0, NULL, inner_slots, NULL, NULL, NULL
};

static int host_exec(PyObject *m) {
    PyObject *machinery = PyImport_ImportModule("importlib.machinery");
    if (machinery == NULL) return -1;
    PyObject *spec = PyObject_CallMethod(machinery, "ModuleSpec", "sO",
                                         "grail_extpkg._host.inner", Py_None);
    Py_DECREF(machinery);
    if (spec == NULL) return -1;
    PyObject *sub = PyModule_FromDefAndSpec(&inner_def, spec);
    Py_DECREF(spec);
    if (sub == NULL) return -1;
    if (PyModule_ExecDef(sub, &inner_def) < 0
            || PyModule_AddObjectRef(m, "inner", sub) < 0
            || PyDict_SetItemString(PyImport_GetModuleDict(), "grail_extpkg._host.inner", sub) < 0) {
        Py_DECREF(sub);
        return -1;
    }
    Py_DECREF(sub);
    return 0;
}

static PyModuleDef_Slot host_slots[] = {
    {Py_mod_exec, (void *)host_exec},
    {0, NULL}
};

static struct PyModuleDef host_def = {
    PyModuleDef_HEAD_INIT, "_host", NULL, 0, NULL, host_slots, NULL, NULL, NULL
};

PyMODINIT_FUNC PyInit__host(void) {
    return PyModuleDef_Init(&host_def);
}
