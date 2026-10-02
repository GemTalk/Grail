/* shim_pyo3.cc — the CPython 3.14 entry points a PyO3 wheel needs beyond the
 * base shim and shim_numpy.cc.
 *
 * Written for pydantic_core 2.46.5 (PyO3 0.28.3, jiter 0.14.0) -- see
 * docs/Support_Pydantic.md, Phase 1.  scripts/shim_symbol_floor.sh measured
 * 33 functions that wheel imports and the shim did not export.  On macOS a
 * missing FUNCTION binds lazily and aborts the process on first call, so every
 * one has to exist before anything past dlopen can be measured.
 *
 * REAL where the body is a composition of calls the shim already makes work
 * (Py_TYPE, the type-name getters, PyIter_NextItem, PyUnicodeWriter over a C
 * buffer, PyLong_{As,From}NativeBytes up to 64 bits, the error-indicator pair
 * PyErr_{Get,Set}RaisedException, PyCMethod_New, ...).  A log-once STUBLOG
 * otherwise, so the first behavioural wall names itself; each stub sets an
 * error rather than answering a plausible value, so a caller that checks
 * fails loudly instead of computing with garbage.
 */
#include "cpython.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include <execinfo.h>

/* cpython.h spells these two as macros for the shim's own C modules; a
   prebuilt 3.14 wheel links them as FUNCTIONS, defined below. */
#undef Py_TYPE
#undef PyUnicode_DATA

#ifndef GRAIL_PYCOMPAT_TYPES
#define GRAIL_PYCOMPAT_TYPES
typedef struct _grail_ts PyThreadState;
#endif

static void shim_stub_log(const char *n) { fprintf(stderr, "SHIM-STUB-HIT: %s\n", n); }
#define STUBLOG(n) do { static int _w = 0; if (!_w) { _w = 1; shim_stub_log(n); } } while (0)

extern "C" {

/* Exported by cpython.cc but not declared in cpython.h. */
PyObject *PyObject_CallMethod(PyObject *obj, const char *name, const char *format, ...);
PyObject *PyImport_ImportModule(const char *name);

/* ====================================================================
 * Object / type basics
 * ==================================================================== */

/* A real function in 3.14 (for the limited API and non-C callers), which is
   how PyO3 links it.  The inline form reads the same field. */
PyTypeObject *Py_TYPE(PyObject *ob) {
    PyTypeObject *t = ob ? ob->ob_type : NULL;
    /* Every caller dereferences the answer (tp_flags, Py_INCREF), so a NULL
       here is a segfault one instruction later, inside stripped Rust.  Say
       which object it was, and from where, while that is still knowable. */
    if (t == NULL) {
        fprintf(stderr, "SHIM-DIAG: Py_TYPE(%p) has a NULL ob_type\n", (void *)ob);
        void *frames[16];
        int n = backtrace(frames, 16);
        backtrace_symbols_fd(frames, n, 2);
        fflush(stderr);
    }
    return t;
}

/* One interpreter, never finalizing while a gem runs Python. */
int Py_IsFinalizing(void) {
    return 0;
}

/* tp_name is "module.qualname" for a static or FromSpec type, a bare name
   for a builtin.  The three getters answer the parts CPython does: the text
   after the last dot (__name__, and __qualname__ for anything not nested),
   and the text before it (__module__, "builtins" when there is no dot). */
static const char *tp_name_of(PyTypeObject *t) {
    return (t && t->tp_name) ? t->tp_name : "?";
}

PyObject *PyType_GetName(PyTypeObject *t) {
    const char *n = tp_name_of(t);
    const char *dot = strrchr(n, '.');
    return PyUnicode_FromString(dot ? dot + 1 : n);
}

PyObject *PyType_GetQualName(PyTypeObject *t) {
    return PyType_GetName(t);
}

PyObject *PyType_GetModuleName(PyTypeObject *t) {
    const char *n = tp_name_of(t);
    const char *dot = strrchr(n, '.');
    if (dot == NULL) return PyUnicode_FromString("builtins");
    return PyUnicode_FromStringAndSize(n, (Py_ssize_t)(dot - n));
}

/* 3.14: make a type immutable.  The shim does not enforce immutability, so
   recording the flag is the whole of it. */
int PyType_Freeze(PyTypeObject *t) {
    if (t == NULL) return -1;
    t->tp_flags |= Py_TPFLAGS_IMMUTABLETYPE;
    return 0;
}

int PyObject_GenericSetDict(PyObject *obj, PyObject *value, void *context) {
    (void)obj; (void)value; (void)context;
    STUBLOG("PyObject_GenericSetDict");
    PyErr_SetString(PyExc_TypeError, "__dict__ assignment is not supported by the Grail shim");
    return -1;
}

/* ====================================================================
 * Calls
 * ==================================================================== */

/* The fallback PyO3's INLINED vectorcall takes when the callable's type has
   no vectorcall slot -- which is every Grail-backed object, since the shim's
   static types leave Py_TPFLAGS_HAVE_VECTORCALL clear.  `keywords' is a
   kwnames tuple (the vectorcall convention) or, from the older paths, a dict. */
PyObject *_PyObject_MakeTpCall(PyThreadState *tstate, PyObject *callable,
                               PyObject *const *args, Py_ssize_t nargs,
                               PyObject *keywords) {
    (void)tstate;
    if (keywords == NULL || PyTuple_Check(keywords))
        return PyObject_Vectorcall(callable, args, (size_t)nargs, keywords);
    PyObject *tuple = PyTuple_New(nargs);
    if (tuple == NULL) return NULL;
    for (Py_ssize_t i = 0; i < nargs; i++) {
        Py_INCREF(args[i]);
        PyTuple_SetItem(tuple, i, args[i]);
    }
    PyObject *result = PyObject_Call(callable, tuple, keywords);
    Py_DECREF(tuple);
    return result;
}

/* CPython's own consistency check on a call result: NULL must come with an
   error set, and a result must not. */
PyObject *_Py_CheckFunctionResult(PyThreadState *tstate, PyObject *callable,
                                  PyObject *result, const char *where) {
    (void)tstate; (void)callable;
    if (result == NULL) {
        if (!PyErr_Occurred())
            PyErr_Format(PyExc_SystemError,
                         "%s returned NULL without setting an exception",
                         where ? where : "a call");
        return NULL;
    }
    if (PyErr_Occurred()) {
        PyErr_Format(PyExc_SystemError,
                     "%s returned a result with an exception set",
                     where ? where : "a call");
        return NULL;
    }
    return result;
}

/* --- PyCMethod_New: a builtin function object over a PyMethodDef ---------

   PyO3 builds EVERY #[pyfunction] this way (module functions and the
   methods it wraps), then stores the result as a module attribute.  The
   shim had no function object at all: a hand-written C module's functions
   are dispatched by NAME through its PyModuleDef (cpython.cc find_method),
   never materialised.

   The layout is CPython 3.14's PyCMethodObject, field for field, because
   pyo3-ffi inlines PyCFunction_GET_FUNCTION / GET_SELF against it.  The type
   is deliberately NOT a registered shim type: the object is the wheel's
   side of the boundary, so it crosses into Grail as a foreign proxy, and a
   Grail-side call comes back through call_foreign -> tp_call. */
typedef PyObject *(*vectorcallfunc_t)(PyObject *, PyObject *const *, size_t, PyObject *);

typedef struct {
    Py_ssize_t        ob_refcnt;
    PyTypeObject     *ob_type;
    PyMethodDef      *m_ml;
    PyObject         *m_self;
    PyObject         *m_module;
    PyObject         *m_weakreflist;
    vectorcallfunc_t  vectorcall;
    PyTypeObject     *mm_class;       /* PyCMethodObject's extra field */
} GrailCMethodObject;

static PyTypeObject GrailCFunction_Type;

/* Dispatch on ml_flags with positional args as an array and keyword values
   after them, kwnames naming those (the METH_FASTCALL|METH_KEYWORDS vector
   convention) -- the shape every other calling convention is built from. */
static PyObject *gcm_invoke(GrailCMethodObject *f, PyObject *const *args,
                            Py_ssize_t nargs, PyObject *kwnames) {
    PyMethodDef *ml = f->m_ml;
    int flags = ml->ml_flags;
    Py_ssize_t nkw = kwnames ? PyTuple_Size(kwnames) : 0;
    PyObject *self = f->m_self;

    if (flags & METH_FASTCALL) {
        if (flags & METH_METHOD) {
            PyCMethod fn = (PyCMethod)(void *)ml->ml_meth;
            return fn(self, f->mm_class, args, nargs, nkw ? kwnames : NULL);
        }
        if (flags & METH_KEYWORDS) {
            typedef PyObject *(*fastkw_t)(PyObject *, PyObject *const *, Py_ssize_t, PyObject *);
            return ((fastkw_t)(void *)ml->ml_meth)(self, args, nargs, nkw ? kwnames : NULL);
        }
        if (nkw) goto no_keywords;
        typedef PyObject *(*fast_t)(PyObject *, PyObject *const *, Py_ssize_t);
        return ((fast_t)(void *)ml->ml_meth)(self, args, nargs);
    }
    if (flags & METH_VARARGS) {
        PyObject *tuple = PyTuple_New(nargs);
        if (tuple == NULL) return NULL;
        for (Py_ssize_t i = 0; i < nargs; i++) {
            Py_INCREF(args[i]);
            PyTuple_SetItem(tuple, i, args[i]);
        }
        if (flags & METH_KEYWORDS) {
            PyObject *kw = NULL;
            if (nkw) {
                kw = PyDict_New();
                if (kw == NULL) return NULL;
                for (Py_ssize_t i = 0; i < nkw; i++)
                    if (PyDict_SetItem(kw, PyTuple_GetItem(kwnames, i), args[nargs + i]) < 0)
                        return NULL;
            }
            typedef PyObject *(*varkw_t)(PyObject *, PyObject *, PyObject *);
            return ((varkw_t)(void *)ml->ml_meth)(self, tuple, kw);
        }
        if (nkw) goto no_keywords;
        return ml->ml_meth(self, tuple);
    }
    if (nkw) goto no_keywords;
    if (flags & METH_NOARGS) {
        if (nargs != 0) {
            PyErr_Format(PyExc_TypeError, "%s() takes no arguments (%zd given)",
                         ml->ml_name, nargs);
            return NULL;
        }
        return ml->ml_meth(self, NULL);
    }
    if (flags & METH_O) {
        if (nargs != 1) {
            PyErr_Format(PyExc_TypeError, "%s() takes exactly one argument (%zd given)",
                         ml->ml_name, nargs);
            return NULL;
        }
        return ml->ml_meth(self, args[0]);
    }
    PyErr_Format(PyExc_SystemError, "%s() has an unsupported calling convention (flags 0x%x)",
                 ml->ml_name, flags);
    return NULL;

no_keywords:
    PyErr_Format(PyExc_TypeError, "%s() takes no keyword arguments", ml->ml_name);
    return NULL;
}

static PyObject *gcm_vectorcall(PyObject *callable, PyObject *const *args,
                                size_t nargsf, PyObject *kwnames) {
    Py_ssize_t nargs = (Py_ssize_t)(nargsf & ~((size_t)1 << (8 * sizeof(size_t) - 1)));
    return gcm_invoke((GrailCMethodObject *)callable, args, nargs, kwnames);
}

/* tp_call: a tuple and a dict, flattened into the vector convention. */
static PyObject *gcm_call(PyObject *callable, PyObject *args, PyObject *kwargs) {
    Py_ssize_t nargs = args ? PyTuple_Size(args) : 0;
    Py_ssize_t nkw = kwargs ? PyDict_Size(kwargs) : 0;
    if (nargs < 0) nargs = 0;
    if (nkw < 0) nkw = 0;
    PyObject **vec = (PyObject **)calloc((size_t)(nargs + nkw + 1), sizeof(PyObject *));
    if (vec == NULL) return PyErr_NoMemory();
    for (Py_ssize_t i = 0; i < nargs; i++) vec[i] = PyTuple_GetItem(args, i);
    PyObject *kwnames = NULL;
    if (nkw) {
        kwnames = PyTuple_New(nkw);
        if (kwnames == NULL) { free(vec); return NULL; }
        Py_ssize_t pos = 0, i = 0;
        PyObject *k, *v;
        while (i < nkw && PyDict_Next(kwargs, &pos, &k, &v)) {
            Py_INCREF(k);
            PyTuple_SetItem(kwnames, i, k);
            vec[nargs + i] = v;
            i++;
        }
    }
    PyObject *r = gcm_invoke((GrailCMethodObject *)callable, vec, nargs, kwnames);
    free(vec);
    return r;
}

/* The attributes a builtin function answers for itself.  PyO3's
   add_function names each export by getattr(fun, "__name__"); sent to
   Grail, the foreign proxy answered its TYPE's name, so every function in
   the module was bound as ``builtin_function_or_method'' and
   ``from pydantic_core._pydantic_core import from_json'' found none. */
static PyObject *gcm_getattro(PyObject *self, PyObject *name) {
    GrailCMethodObject *f = (GrailCMethodObject *)self;
    const char *n = PyUnicode_AsUTF8(name);
    if (n == NULL) return NULL;
    if (strcmp(n, "__name__") == 0 || strcmp(n, "__qualname__") == 0)
        return PyUnicode_FromString(f->m_ml->ml_name);
    if (strcmp(n, "__doc__") == 0) {
        if (f->m_ml->ml_doc) return PyUnicode_FromString(f->m_ml->ml_doc);
        Py_INCREF(Py_None);
        return Py_None;
    }
    if (strcmp(n, "__module__") == 0) {
        if (f->m_module) { Py_INCREF(f->m_module); return f->m_module; }
        Py_INCREF(Py_None);
        return Py_None;
    }
    if (strcmp(n, "__self__") == 0) {
        PyObject *s = f->m_self ? f->m_self : Py_None;
        Py_INCREF(s);
        return s;
    }
    PyErr_Format(PyExc_AttributeError,
                 "'builtin_function_or_method' object has no attribute '%s'", n);
    return NULL;
}

static void init_cfunction_type(void) {
    static int done = 0;
    if (done) return;
    done = 1;
    memset(&GrailCFunction_Type, 0, sizeof(GrailCFunction_Type));
    GrailCFunction_Type.ob_base.ob_base.ob_refcnt = 1;
    GrailCFunction_Type.ob_base.ob_base.ob_type = &PyType_Type;
    GrailCFunction_Type.tp_name = "builtin_function_or_method";
    GrailCFunction_Type.tp_basicsize = sizeof(GrailCMethodObject);
    GrailCFunction_Type.tp_base = &PyBaseObject_Type;
    GrailCFunction_Type.tp_call = gcm_call;
    GrailCFunction_Type.tp_getattro = gcm_getattro;
    GrailCFunction_Type.tp_flags = Py_TPFLAGS_DEFAULT | Py_TPFLAGS_READY;
}

PyObject *PyCMethod_New(PyMethodDef *ml, PyObject *self, PyObject *module,
                        PyTypeObject *cls) {
    if (ml == NULL) {
        PyErr_SetString(PyExc_SystemError, "PyCMethod_New: NULL PyMethodDef");
        return NULL;
    }
    init_cfunction_type();
    GrailCMethodObject *f = (GrailCMethodObject *)calloc(1, sizeof(GrailCMethodObject));
    if (f == NULL) return PyErr_NoMemory();
    f->ob_refcnt = 1;
    f->ob_type = &GrailCFunction_Type;
    f->m_ml = ml;
    f->m_self = self;
    f->m_module = module;
    f->vectorcall = gcm_vectorcall;
    f->mm_class = cls;
    return (PyObject *)f;
}

/* ====================================================================
 * The error indicator as an exception OBJECT (3.12+)
 *
 * PyO3's whole error path on 3.12+ is PyErr_GetRaisedException /
 * PyErr_SetRaisedException: take the pending exception as one object, hold
 * it in a Rust PyErr, restore it later.  The shim's indicator is a (type,
 * message) pair, so the object here is a small token carrying exactly that
 * pair -- with the TYPE as its ob_type, which is what pyo3-ffi's inlined
 * PyExceptionInstance_Check and Py_TYPE-based matching read.  That needs the
 * exception types to be real type objects, which cpython.cc's
 * init_exception_types now makes them.
 *
 * Interim, and it says so: a token is not an instance of a Grail exception,
 * carries no args / traceback, and a pyclass exception (ValidationError) is
 * not constructible yet.  Phase 2 of docs/Support_Pydantic.md replaces it
 * with real exception instances.
 * ==================================================================== */

#define GRAIL_RAISED_MAGIC 0x4752524149534544ULL   /* "GRRAISED" */

typedef struct {
    Py_ssize_t    ob_refcnt;
    PyTypeObject *ob_type;           /* the exception type */
    uint64_t      pad;               /* keeps offset 24 off GRAIL_WRAP_MAGIC */
    uint64_t      magic;             /* GRAIL_RAISED_MAGIC */
    PyObject     *cause;
    int           from_grail;        /* raised by a Grail callback */
    char          msg[1024];
} GrailRaisedException;

static GrailRaisedException *as_raised(PyObject *o) {
    GrailRaisedException *r = (GrailRaisedException *)o;
    return (o != NULL && r->magic == GRAIL_RAISED_MAGIC) ? r : NULL;
}

/* cpython.cc's error indicator: the wheel's own exception instance behind
   it (NULL when there is none), and str() of such an instance. */
void _grail_err_set_instance(PyObject *exc);
PyObject *_grail_err_instance(void);
void _grail_foreign_exc_text(PyObject *v, char *buf, size_t cap);
int  _grail_err_from_grail(void);
void _grail_err_set_from_grail(int v);

PyObject *PyErr_GetRaisedException(void) {
    PyObject *type = PyErr_Occurred();
    if (type == NULL) return NULL;
    /* A real instance behind the indicator (a pyclass exception the wheel
       raised, now being taken back by PyO3) goes back as itself. */
    PyObject *inst = _grail_err_instance();
    if (inst != NULL) {
        Py_INCREF(inst);
        PyErr_Clear();
        return inst;
    }
    int from_grail = _grail_err_from_grail();
    PyObject *ptype = NULL, *pvalue = NULL, *ptb = NULL;
    PyErr_Fetch(&ptype, &pvalue, &ptb);
    /* A value that already IS a raised exception (Set -> Fetch round trip)
       goes back unchanged. */
    if (as_raised(pvalue)) return pvalue;
    GrailRaisedException *r = (GrailRaisedException *)calloc(1, sizeof(GrailRaisedException));
    if (r == NULL) return NULL;
    r->ob_refcnt = 1;
    r->ob_type = (PyTypeObject *)ptype;
    r->magic = GRAIL_RAISED_MAGIC;
    r->from_grail = from_grail;
    const char *m = pvalue ? PyUnicode_AsUTF8(pvalue) : NULL;
    if (m) snprintf(r->msg, sizeof(r->msg), "%s", m);
    if (getenv("GRAIL_SHIM_DIAG")) {
        fprintf(stderr, "SHIM-DIAG: PyErr_GetRaisedException -> %s: %s\n",
                tp_name_of((PyTypeObject *)ptype), r->msg);
        fflush(stderr);
    }
    return (PyObject *)r;
}

void PyErr_SetRaisedException(PyObject *exc) {
    if (exc == NULL) { PyErr_Clear(); return; }
    GrailRaisedException *r = as_raised(exc);
    if (r) {
        PyErr_SetString((PyObject *)r->ob_type, r->msg);
        if (r->from_grail) _grail_err_set_from_grail(1);
        return;
    }
    /* An instance of one of the wheel's own exception classes: keep the
       OBJECT, with its type and str() as the indicator's pair. */
    char text[1024];
    _grail_foreign_exc_text(exc, text, sizeof(text));
    PyErr_SetString((PyObject *)exc->ob_type, text);
    _grail_err_set_instance(exc);
}

/* The message of one of the tokens above, or NULL for anything else --
   cpython.cc's foreign_str answers str()/repr() of a token with it. */
const char *_grail_raised_message(PyObject *o) {
    GrailRaisedException *r = as_raised(o);
    return r ? r->msg : NULL;
}

PyObject *PyException_GetCause(PyObject *exc) {
    GrailRaisedException *r = as_raised(exc);
    if (r && r->cause) { Py_INCREF(r->cause); return r->cause; }
    return NULL;
}

PyObject *PyException_GetTraceback(PyObject *exc) {
    (void)exc;
    return NULL;
}

/* No sys.stderr / traceback machinery on this side, so print what the
   indicator holds -- the type's name and the message -- and clear it, which
   is the part of PyErr_PrintEx a caller relies on.  (PyErr_Print itself is a
   shim_numpy.cc stub, so delegating would print nothing.) */
void PyErr_PrintEx(int set_sys_last_vars) {
    (void)set_sys_last_vars;
    PyObject *ptype = NULL, *pvalue = NULL, *ptb = NULL;
    PyErr_Fetch(&ptype, &pvalue, &ptb);
    if (ptype == NULL) return;
    const char *msg = pvalue ? PyUnicode_AsUTF8(pvalue) : NULL;
    fprintf(stderr, "%s: %s\n", tp_name_of((PyTypeObject *)ptype), msg ? msg : "");
    fflush(stderr);
}

int PyTraceBack_Print(PyObject *tb, PyObject *f) {
    (void)tb; (void)f;
    return 0;
}

PyObject *PyUnicodeDecodeError_Create(const char *encoding, const char *object,
                                      Py_ssize_t length, Py_ssize_t start,
                                      Py_ssize_t end, const char *reason) {
    (void)object; (void)length;
    /* The call wants an exception OBJECT back; the shim cannot build one yet,
       so raise the equivalent and answer NULL, which a caller treats as
       "creating the exception failed" and propagates. */
    PyErr_Format(PyExc_UnicodeDecodeError,
                 "'%s' codec can't decode bytes in position %zd-%zd: %s",
                 encoding ? encoding : "?", start, end - 1, reason ? reason : "");
    return NULL;
}

/* ====================================================================
 * Iteration, mappings, modules
 * ==================================================================== */

int PyIter_NextItem(PyObject *iter, PyObject **item) {
    *item = PyIter_Next(iter);
    if (*item) return 1;
    return PyErr_Occurred() ? -1 : 0;
}

/* list(o.items()) -- CPython answers a list for any mapping. */
PyObject *PyMapping_Items(PyObject *o) {
    PyObject *view = PyObject_CallMethod(o, "items", NULL);
    if (view == NULL) return NULL;
    PyObject *it = PyObject_GetIter(view);
    if (it == NULL) return NULL;
    PyObject *list = PyList_New(0);
    if (list == NULL) return NULL;
    PyObject *x;
    while ((x = PyIter_Next(it)) != NULL)
        if (PyList_Append(list, x) < 0) return NULL;
    return PyErr_Occurred() ? NULL : list;
}

int PyObject_DelItem(PyObject *o, PyObject *key) {
    PyObject *r = PyObject_CallMethod(o, "__delitem__", "O", key);
    return r ? 0 : -1;
}

PyObject *PyObject_Dir(PyObject *o) {
    PyObject *builtins = PyImport_ImportModule("builtins");
    if (builtins == NULL) return NULL;
    PyObject *dir = PyObject_GetAttrString(builtins, "dir");
    if (dir == NULL) return NULL;
    PyObject *args = PyTuple_New(o ? 1 : 0);
    if (args == NULL) return NULL;
    if (o) { Py_INCREF(o); PyTuple_SetItem(args, 0, o); }
    return PyObject_Call(dir, args, NULL);
}

PyObject *PyModule_GetNameObject(PyObject *m) {
    return PyObject_GetAttrString(m, "__name__");
}

/* ====================================================================
 * int <-> native bytes (3.13+)
 *
 * The shim's int path is 64-bit (PyLong_AsLongLong / FromLongLong), so these
 * are exact for any value that fits in 64 bits and report OverflowError past
 * that rather than truncating.  PyO3 takes this route for its 128-bit
 * extractions, so an i128 field holding a small value works and a huge one
 * fails loudly.
 * ==================================================================== */

#define GRAIL_NB_LITTLE_ENDIAN   1
#define GRAIL_NB_NATIVE_ENDIAN   3
#define GRAIL_NB_UNSIGNED_BUFFER 4
#define GRAIL_NB_REJECT_NEGATIVE 8

static int nb_little(int flags) {
    if (flags == -1 || (flags & GRAIL_NB_NATIVE_ENDIAN) == GRAIL_NB_NATIVE_ENDIAN) {
        const uint16_t one = 1;
        return *(const uint8_t *)&one == 1;
    }
    return (flags & GRAIL_NB_LITTLE_ENDIAN) != 0;
}

Py_ssize_t PyLong_AsNativeBytes(PyObject *v, void *buffer, Py_ssize_t n_bytes,
                                int flags) {
    long long x = PyLong_AsLongLong(v);
    if (x == -1 && PyErr_Occurred()) return -1;
    int unsigned_buf = flags != -1 && (flags & GRAIL_NB_UNSIGNED_BUFFER);
    if (x < 0 && flags != -1 && (flags & GRAIL_NB_REJECT_NEGATIVE)) {
        PyErr_SetString(PyExc_ValueError, "Cannot convert negative int");
        return -1;
    }
    /* Bytes needed: two's complement with a sign bit, or plain magnitude for
       a non-negative value into an unsigned buffer. */
    Py_ssize_t need = 1;
    while (need < 8) {
        int bits = 8 * (int)need;
        if (x >= 0 && unsigned_buf) { if ((unsigned long long)x < (1ULL << bits)) break; }
        else if (x >= -(1LL << (bits - 1)) && x < (1LL << (bits - 1))) break;
        need++;
    }
    uint8_t *out = (uint8_t *)buffer;
    int little = nb_little(flags);
    uint8_t fill = x < 0 ? 0xFF : 0x00;
    for (Py_ssize_t i = 0; i < n_bytes; i++) {
        uint8_t b = i < 8 ? (uint8_t)((unsigned long long)x >> (8 * i)) : fill;
        out[little ? i : n_bytes - 1 - i] = b;
    }
    return need;
}

PyObject *PyLong_FromNativeBytes(const void *buffer, size_t n_bytes, int flags) {
    const uint8_t *in = (const uint8_t *)buffer;
    int little = nb_little(flags);
    int unsigned_buf = flags != -1 && (flags & GRAIL_NB_UNSIGNED_BUFFER);
    if (n_bytes == 0) return PyLong_FromLongLong(0);
#define NB_AT(i) (in[little ? (i) : n_bytes - 1 - (i)])
    int negative = !unsigned_buf && (NB_AT(n_bytes - 1) & 0x80);
    /* Past 8 bytes, every extra byte must be pure sign extension. */
    for (size_t i = 8; i < n_bytes; i++)
        if (NB_AT(i) != (negative ? 0xFF : 0x00)) {
            PyErr_SetString(PyExc_OverflowError,
                            "int wider than 64 bits is not supported by the Grail shim");
            return NULL;
        }
    unsigned long long u = negative ? ~0ULL : 0ULL;
    size_t n = n_bytes < 8 ? n_bytes : 8;
    for (size_t i = 0; i < n; i++) {
        u &= ~(0xFFULL << (8 * i));
        u |= (unsigned long long)NB_AT(i) << (8 * i);
    }
#undef NB_AT
    if (unsigned_buf || !negative) {
        if (!unsigned_buf || u <= (unsigned long long)INT64_MAX)
            return PyLong_FromLongLong((long long)u);
        return PyLong_FromUnsignedLongLong(u);
    }
    return PyLong_FromLongLong((long long)u);
}

/* ====================================================================
 * str
 * ==================================================================== */

int PyUnicode_EqualToUTF8AndSize(PyObject *u, const char *s, Py_ssize_t size) {
    Py_ssize_t n = 0;
    const char *us = PyUnicode_AsUTF8AndSize(u, &n);
    if (us == NULL) { PyErr_Clear(); return 0; }
    return n == size && memcmp(us, s, (size_t)size) == 0;
}

/* Interning is an identity optimisation; leaving the object as it is keeps
   every equality answer right. */
void PyUnicode_InternInPlace(PyObject **p) {
    (void)p;
}

/* A fresh str whose buffer the CALLER then writes (jiter builds decoded JSON
   strings this way).  That needs a real-layout str -- W5 in the plan -- so for
   now it fails with an error rather than handing out a buffer nothing reads. */
PyObject *PyUnicode_New(Py_ssize_t size, Py_UCS4 maxchar) {
    (void)size; (void)maxchar;
    STUBLOG("PyUnicode_New");
    PyErr_SetString(PyExc_SystemError, "PyUnicode_New: writable str buffers are not supported by the Grail shim");
    return NULL;
}

void *PyUnicode_DATA(PyObject *u) {
    (void)u;
    STUBLOG("PyUnicode_DATA");
    return NULL;
}

/* --- PyUnicodeWriter: an appendable UTF-8 buffer, finished into a str ---- */

typedef struct {
    char       *buf;
    Py_ssize_t  len;
    Py_ssize_t  cap;
} GrailUnicodeWriter;

static int guw_reserve(GrailUnicodeWriter *w, Py_ssize_t more) {
    if (w->len + more <= w->cap) return 0;
    Py_ssize_t cap = w->cap ? w->cap : 64;
    while (cap < w->len + more) cap *= 2;
    char *b = (char *)realloc(w->buf, (size_t)cap);
    if (b == NULL) { PyErr_NoMemory(); return -1; }
    w->buf = b;
    w->cap = cap;
    return 0;
}

void *PyUnicodeWriter_Create(Py_ssize_t length) {
    GrailUnicodeWriter *w = (GrailUnicodeWriter *)calloc(1, sizeof(GrailUnicodeWriter));
    if (w == NULL) { PyErr_NoMemory(); return NULL; }
    if (length > 0 && guw_reserve(w, length) < 0) { free(w); return NULL; }
    return w;
}

void PyUnicodeWriter_Discard(void *writer) {
    GrailUnicodeWriter *w = (GrailUnicodeWriter *)writer;
    if (w == NULL) return;
    free(w->buf);
    free(w);
}

PyObject *PyUnicodeWriter_Finish(void *writer) {
    GrailUnicodeWriter *w = (GrailUnicodeWriter *)writer;
    PyObject *s = PyUnicode_FromStringAndSize(w->buf ? w->buf : "", w->len);
    PyUnicodeWriter_Discard(w);
    return s;
}

int PyUnicodeWriter_WriteUTF8(void *writer, const char *str, Py_ssize_t size) {
    GrailUnicodeWriter *w = (GrailUnicodeWriter *)writer;
    if (size < 0) size = (Py_ssize_t)strlen(str);
    if (guw_reserve(w, size) < 0) return -1;
    memcpy(w->buf + w->len, str, (size_t)size);
    w->len += size;
    return 0;
}

int PyUnicodeWriter_WriteChar(void *writer, Py_UCS4 ch) {
    char b[4];
    Py_ssize_t n;
    if (ch < 0x80)         { b[0] = (char)ch; n = 1; }
    else if (ch < 0x800)   { b[0] = (char)(0xC0 | (ch >> 6));  b[1] = (char)(0x80 | (ch & 0x3F)); n = 2; }
    else if (ch < 0x10000) { b[0] = (char)(0xE0 | (ch >> 12)); b[1] = (char)(0x80 | ((ch >> 6) & 0x3F));
                             b[2] = (char)(0x80 | (ch & 0x3F)); n = 3; }
    else if (ch < 0x110000){ b[0] = (char)(0xF0 | (ch >> 18)); b[1] = (char)(0x80 | ((ch >> 12) & 0x3F));
                             b[2] = (char)(0x80 | ((ch >> 6) & 0x3F)); b[3] = (char)(0x80 | (ch & 0x3F)); n = 4; }
    else {
        PyErr_SetString(PyExc_ValueError, "character must be in range(0x110000)");
        return -1;
    }
    return PyUnicodeWriter_WriteUTF8(writer, b, n);
}

/* ====================================================================
 * The limited API (abi3) -- a pydantic_core built with pyo3/abi3-py314
 * (docs/Support_Pydantic.md, Phase 4 option (b)) imports these five in place
 * of the struct access the stock wheel inlines.
 * ==================================================================== */

/* Refcounting as calls: the shim's lifetimes are GemStone's, so these do
   what the inline forms do -- adjust the count -- and never deallocate. */
void _Py_IncRef(PyObject *o) { if (o) o->ob_refcnt++; }
void _Py_DecRef(PyObject *o) { if (o) o->ob_refcnt--; }

unsigned long long PyLong_AsUnsignedLongLongMask(PyObject *o) {
    return (unsigned long long)PyLong_AsLongLong(o);
}

/* 3.13: the interpreter's constants by number (Include/object.h
   Py_CONSTANT_*).  Borrowed and immortal, so the numbers and empty
   containers are made once and pinned with a large refcount. */
extern PyObject *_Py_EllipsisObject;          /* shim_numpy.cc */
PyObject *Py_GetConstantBorrowed(unsigned int id) {
    static PyObject *cache[10];
    if (id >= 10) {
        PyErr_Format(PyExc_SystemError, "Py_GetConstantBorrowed: invalid constant %u", id);
        return NULL;
    }
    if (cache[id]) return cache[id];
    PyObject *v = NULL;
    switch (id) {
    case 0: v = Py_None; break;
    case 1: v = Py_False; break;
    case 2: v = Py_True; break;
    case 3: v = _Py_EllipsisObject; break;
    case 4: v = Py_NotImplemented; break;
    case 5: v = PyLong_FromLong(0); break;
    case 6: v = PyLong_FromLong(1); break;
    case 7: v = PyUnicode_FromStringAndSize("", 0); break;
    case 8: v = PyBytes_FromStringAndSize("", 0); break;
    case 9: v = PyTuple_New(0); break;
    }
    if (v == NULL) return NULL;
    v->ob_refcnt += 1 << 20;   /* never swept */
    cache[id] = v;
    return v;
}

/* 3.12: where a class's OWN data starts inside an instance -- after the
   base's storage, aligned.  abi3 PyO3 declares each pyclass with a NEGATIVE
   basicsize ("the base plus this much"), which type_from_spec_impl resolves,
   and finds its Rust struct with this. */
void *PyObject_GetTypeData(PyObject *obj, PyTypeObject *cls) {
    Py_ssize_t base = (cls && cls->tp_base) ? cls->tp_base->tp_basicsize : (Py_ssize_t)sizeof(PyObject);
    base = (base + 15) & ~(Py_ssize_t)15;
    return (char *)obj + base;
}

} /* extern "C" */
