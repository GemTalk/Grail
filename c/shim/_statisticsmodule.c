/*
 * _statisticsmodule.c — CPython's statistics accelerator,
 * modified to compile against cpython.h instead of Python.h.
 *
 * Original: https://github.com/python/cpython/blob/main/Modules/_statisticsmodule.c
 *
 * Changes from the original:
 *   1. #include "cpython.h" instead of "Python.h"
 *   2. Removed #include "clinic/_statisticsmodule.c.h" (inlined below)
 *   3. Removed Py_LIMITED_API / Py_GIL_DISABLED guards
 */

#include "cpython.h"

/* ---------- Inlined clinic-generated code ---------- */

PyDoc_STRVAR(_statistics__normal_dist_inv_cdf__doc__,
"_normal_dist_inv_cdf($module, p, mu, sigma, /)\n"
"--\n\n");

static double
_statistics__normal_dist_inv_cdf_impl(PyObject *module, double p, double mu,
                                      double sigma);

static PyObject *
_statistics__normal_dist_inv_cdf(PyObject *module, PyObject *const *args, Py_ssize_t nargs)
{
    PyObject *return_value = NULL;
    double p;
    double mu;
    double sigma;
    double _return_value;

    if (nargs != 3) {
        PyErr_Format(PyExc_TypeError,
            "_normal_dist_inv_cdf expected 3 arguments, got %zd", nargs);
        goto exit;
    }
    p = PyFloat_AsDouble(args[0]);
    if (p == -1.0 && PyErr_Occurred()) {
        goto exit;
    }
    mu = PyFloat_AsDouble(args[1]);
    if (mu == -1.0 && PyErr_Occurred()) {
        goto exit;
    }
    sigma = PyFloat_AsDouble(args[2]);
    if (sigma == -1.0 && PyErr_Occurred()) {
        goto exit;
    }
    _return_value = _statistics__normal_dist_inv_cdf_impl(module, p, mu, sigma);
    if ((_return_value == -1.0) && PyErr_Occurred()) {
        goto exit;
    }
    return_value = PyFloat_FromDouble(_return_value);

exit:
    return return_value;
}

#define _STATISTICS__NORMAL_DIST_INV_CDF_METHODDEF    \
    {"_normal_dist_inv_cdf", \
     (PyCFunction)(void(*)(void))_statistics__normal_dist_inv_cdf, \
     METH_FASTCALL, \
     _statistics__normal_dist_inv_cdf__doc__},

/* ---------- Original implementation (unmodified) ---------- */

static double
_statistics__normal_dist_inv_cdf_impl(PyObject *module, double p, double mu,
                                      double sigma)
{
    double q, num, den, r, x;
    if (p <= 0.0 || p >= 1.0) {
        goto error;
    }

    q = p - 0.5;
    if(fabs(q) <= 0.425) {
        r = 0.180625 - q * q;
        num = (((((((2.5090809287301226727e+3 * r +
                     3.3430575583588128105e+4) * r +
                     6.7265770927008700853e+4) * r +
                     4.5921953931549871457e+4) * r +
                     1.3731693765509461125e+4) * r +
                     1.9715909503065514427e+3) * r +
                     1.3314166789178437745e+2) * r +
                     3.3871328727963666080e+0) * q;
        den = (((((((5.2264952788528545610e+3 * r +
                     2.8729085735721942674e+4) * r +
                     3.9307895800092710610e+4) * r +
                     2.1213794301586595867e+4) * r +
                     5.3941960214247511077e+3) * r +
                     6.8718700749205790830e+2) * r +
                     4.2313330701600911252e+1) * r +
                     1.0);
        if (den == 0.0) {
            goto error;
        }
        x = num / den;
        return mu + (x * sigma);
    }
    r = (q <= 0.0) ? p : (1.0 - p);
    if (r <= 0.0 || r >= 1.0) {
        goto error;
    }
    r = sqrt(-log(r));
    if (r <= 5.0) {
        r = r - 1.6;
        num = (((((((7.74545014278341407640e-4 * r +
                     2.27238449892691845833e-2) * r +
                     2.41780725177450611770e-1) * r +
                     1.27045825245236838258e+0) * r +
                     3.64784832476320460504e+0) * r +
                     5.76949722146069140550e+0) * r +
                     4.63033784615654529590e+0) * r +
                     1.42343711074968357734e+0);
        den = (((((((1.05075007164441684324e-9 * r +
                     5.47593808499534494600e-4) * r +
                     1.51986665636164571966e-2) * r +
                     1.48103976427480074590e-1) * r +
                     6.89767334985100004550e-1) * r +
                     1.67638483018380384940e+0) * r +
                     2.05319162663775882187e+0) * r +
                     1.0);
    } else {
        r -= 5.0;
        num = (((((((2.01033439929228813265e-7 * r +
                     2.71155556874348757815e-5) * r +
                     1.24266094738807843860e-3) * r +
                     2.65321895265761230930e-2) * r +
                     2.96560571828504891230e-1) * r +
                     1.78482653991729133580e+0) * r +
                     5.46378491116411436990e+0) * r +
                     6.65790464350110377720e+0);
        den = (((((((2.04426310338993978564e-15 * r +
                     1.42151175831644588870e-7) * r +
                     1.84631831751005468180e-5) * r +
                     7.86869131145613259100e-4) * r +
                     1.48753612908506148525e-2) * r +
                     1.36929880922735805310e-1) * r +
                     5.99832206555887937690e-1) * r +
                     1.0);
    }
    if (den == 0.0) {
        goto error;
    }
    x = num / den;
    if (q < 0.0) {
        x = -x;
    }
    return mu + (x * sigma);

  error:
    PyErr_SetString(PyExc_ValueError, "inv_cdf undefined for these parameters");
    return -1.0;
}

/* ---------- Module definition ---------- */

static PyMethodDef statistics_methods[] = {
    _STATISTICS__NORMAL_DIST_INV_CDF_METHODDEF
    {NULL, NULL, 0, NULL}
};

PyDoc_STRVAR(statistics_doc,
"Accelerators for the statistics module.\n");

static struct PyModuleDef_Slot _statisticsmodule_slots[] = {
    {Py_mod_multiple_interpreters, Py_MOD_PER_INTERPRETER_GIL_SUPPORTED},
    {Py_mod_gil, Py_MOD_GIL_NOT_USED},
    {0, NULL}
};

static struct PyModuleDef statisticsmodule = {
        PyModuleDef_HEAD_INIT,
        "_statistics",
        statistics_doc,
        0,
        statistics_methods,
        _statisticsmodule_slots,
        NULL,
        NULL,
        NULL
};

PyMODINIT_FUNC
PyInit__statistics(void)
{
    return PyModuleDef_Init(&statisticsmodule);
}
