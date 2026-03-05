/*
 * _crc32cmodule.c — CRC32C (Castagnoli) CPython C extension module.
 *
 * Software-only table-based implementation using reflected polynomial
 * 0x82F63B78.
 *
 * Two METH_FASTCALL functions:
 *   crc32c(data)       – compute CRC32C of bytes, returns uint32
 *   extend(crc, data)  – extend existing CRC with more bytes
 */

#include "cpython.h"
#include <stdint.h>

/* ------------------------------------------------------------------ */
/* CRC32C lookup table                                                 */
/* ------------------------------------------------------------------ */

static uint32_t crc32c_table[256];
static int table_initialized = 0;

static void crc32c_init_table(void) {
    for (uint32_t i = 0; i < 256; i++) {
        uint32_t crc = i;
        for (int j = 0; j < 8; j++) {
            if (crc & 1)
                crc = (crc >> 1) ^ 0x82F63B78;
            else
                crc >>= 1;
        }
        crc32c_table[i] = crc;
    }
    table_initialized = 1;
}

/* ------------------------------------------------------------------ */
/* Core CRC32C computation                                             */
/* ------------------------------------------------------------------ */

static uint32_t
compute_crc32c(uint32_t crc, const uint8_t *data, Py_ssize_t len) {
    if (!table_initialized) crc32c_init_table();
    crc ^= 0xFFFFFFFF;
    for (Py_ssize_t i = 0; i < len; i++) {
        crc = crc32c_table[(crc ^ data[i]) & 0xFF] ^ (crc >> 8);
    }
    return crc ^ 0xFFFFFFFF;
}

/* ------------------------------------------------------------------ */
/* Module methods                                                      */
/* ------------------------------------------------------------------ */

static PyObject *
_crc32c_crc32c(PyObject *module, PyObject *const *args, Py_ssize_t nargs) {
    (void)module;

    if (nargs != 1) {
        PyErr_Format(PyExc_TypeError,
            "crc32c expected 1 argument, got %zd", nargs);
        return NULL;
    }

    if (!PyBytes_Check(args[0])) {
        PyErr_SetString(PyExc_TypeError, "argument must be bytes");
        return NULL;
    }

    uint32_t result = compute_crc32c(
        0,
        (const uint8_t *)PyBytes_AsString(args[0]),
        PyBytes_Size(args[0])
    );

    return PyLong_FromSsize_t((Py_ssize_t)result);
}

static PyObject *
_crc32c_extend(PyObject *module, PyObject *const *args, Py_ssize_t nargs) {
    (void)module;

    if (nargs != 2) {
        PyErr_Format(PyExc_TypeError,
            "extend expected 2 arguments, got %zd", nargs);
        return NULL;
    }

    if (!PyLong_Check(args[0])) {
        PyErr_SetString(PyExc_TypeError, "first argument must be an integer");
        return NULL;
    }

    if (!PyBytes_Check(args[1])) {
        PyErr_SetString(PyExc_TypeError, "second argument must be bytes");
        return NULL;
    }

    uint32_t crc = (uint32_t)PyLong_AsSsize_t(args[0]);
    uint32_t result = compute_crc32c(
        crc,
        (const uint8_t *)PyBytes_AsString(args[1]),
        PyBytes_Size(args[1])
    );

    return PyLong_FromSsize_t((Py_ssize_t)result);
}

/* ------------------------------------------------------------------ */
/* Module definition                                                   */
/* ------------------------------------------------------------------ */

static PyMethodDef crc32c_methods[] = {
    {"crc32c", (PyCFunction)(void *)_crc32c_crc32c,
     METH_FASTCALL, "Compute CRC32C checksum of bytes."},
    {"extend", (PyCFunction)(void *)_crc32c_extend,
     METH_FASTCALL, "Extend existing CRC32C with more bytes."},
    {NULL, NULL, 0, NULL}
};

PyDoc_STRVAR(module_doc,
    "CRC32C (Castagnoli) checksum (shim version, software-only).");

static struct PyModuleDef _crc32cmodule = {
    PyModuleDef_HEAD_INIT,
    .m_name    = "_crc32c",
    .m_doc     = module_doc,
    .m_size    = -1,
    .m_methods = crc32c_methods,
    .m_slots   = NULL,
    .m_traverse = NULL,
    .m_clear    = NULL,
    .m_free     = NULL,
};

PyMODINIT_FUNC
PyInit__crc32c(void) {
    crc32c_init_table();
    return PyModuleDef_Init(&_crc32cmodule);
}
