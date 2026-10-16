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
   and the text before it (__module__, "builtins" when there is no dot).
   A subtype mirror -- a Python class over a C type -- is a heap type, whose
   tp_name is the bare __name__; CPython reads its qualname and module off
   the class, and so do these. */
int _grail_is_subtype_mirror(PyTypeObject *t);   /* cpython.cc */
static const char *tp_name_of(PyTypeObject *t) {
    return (t && t->tp_name) ? t->tp_name : "?";
}

PyObject *PyType_GetName(PyTypeObject *t) {
    const char *n = tp_name_of(t);
    const char *dot = strrchr(n, '.');
    return PyUnicode_FromString(dot ? dot + 1 : n);
}

PyObject *PyType_GetQualName(PyTypeObject *t) {
    if (t != NULL && _grail_is_subtype_mirror(t))
        return PyObject_GetAttrString((PyObject *)t, "__qualname__");
    return PyType_GetName(t);
}

PyObject *PyType_GetModuleName(PyTypeObject *t) {
    if (t != NULL && _grail_is_subtype_mirror(t))
        return PyObject_GetAttrString((PyObject *)t, "__module__");
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

/* ``args[0].name(*args[1:nargs], **dict(zip(kwnames, args[nargs:])))'' --
   CPython's method-call form of vectorcall.  It was a stub answering NULL with
   no exception set, so pydantic_core's call of a model's model_post_init
   surfaced as ``SystemError: attempted to fetch exception but none was set''
   (docs/Support_Pydantic.md, Phase 6).  The offset flag is masked off as
   PyObject_Vectorcall masks it: args has no slot before it to borrow here. */
extern "C" PyObject *PyObject_VectorcallMethod(PyObject *name, PyObject *const *args,
                                               size_t nargsf, PyObject *kwnames) {
    Py_ssize_t nargs = (Py_ssize_t)(nargsf & ~(1ULL << 63));
    if (nargs < 1 || args == NULL) {
        PyErr_SetString(PyExc_SystemError,
                        "PyObject_VectorcallMethod() called without a receiver");
        return NULL;
    }
    PyObject *callable = PyObject_GetAttr(args[0], name);
    if (callable == NULL) return NULL;
    PyObject *result = PyObject_Vectorcall(callable, args + 1, (size_t)(nargs - 1), kwnames);
    Py_DECREF(callable);
    return result;
}

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
   Grail-side call comes back through call_foreign -> tp_call.

   The type is the EXPORTED PyCFunction_Type (a zeroed placeholder in
   shim_numpy.cc, filled in here on first use), as the descriptor types below
   are: numpy's add_docstring tests ``Py_TYPE(obj) == &PyCFunction_Type''
   before it will write ml_doc, and a private type failed that test for every
   function, so ``import numpy'' stopped at the first docstring it attached
   to a module function (_core/overrides.py). */
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

extern "C" PyTypeObject PyCFunction_Type;   /* shim_numpy.cc */

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
/* CPython's internal-doc split (Objects/typeobject.c): a builtin's ml_doc
   may open with its signature -- ``name(sig)\n--\n\n'' -- which
   ``__text_signature__'' answers (inspect.signature reads it) and
   ``__doc__'' leaves out.  numpy's add_docstring writes every function's doc
   that way, and numpy.ma builds its wrappers from inspect.signature of
   np.arange and friends. */
#define GRAIL_SIG_END_MARKER ")\n--\n\n"
#define GRAIL_SIG_END_MARKER_LENGTH 6
static const char *grail_find_signature(const char *name, const char *doc) {
    if (name == NULL || doc == NULL) return NULL;
    const char *dot = strrchr(name, '.');
    if (dot) name = dot + 1;
    size_t length = strlen(name);
    if (strncmp(doc, name, length) != 0) return NULL;
    doc += length;
    return *doc == '(' ? doc : NULL;
}
static const char *grail_skip_signature(const char *doc) {
    while (*doc) {
        if (*doc == *GRAIL_SIG_END_MARKER
                && strncmp(doc, GRAIL_SIG_END_MARKER, GRAIL_SIG_END_MARKER_LENGTH) == 0)
            return doc + GRAIL_SIG_END_MARKER_LENGTH;
        if (*doc == '\n' && doc[1] == '\n') return NULL;
        doc++;
    }
    return NULL;
}
extern "C" PyObject *_grail_doc_from_internal_doc(const char *name, const char *doc) {
    if (doc == NULL) { Py_INCREF(Py_None); return Py_None; }
    const char *sig = grail_find_signature(name, doc);
    const char *rest = sig ? grail_skip_signature(sig) : NULL;
    if (rest == NULL) return PyUnicode_FromString(doc);
    if (*rest == '\0') { Py_INCREF(Py_None); return Py_None; }
    return PyUnicode_FromString(rest);
}
extern "C" PyObject *_grail_text_signature_from_internal_doc(const char *name, const char *doc) {
    const char *start = grail_find_signature(name, doc);
    const char *end = start ? grail_skip_signature(start) : NULL;
    if (end == NULL) { Py_INCREF(Py_None); return Py_None; }
    end -= GRAIL_SIG_END_MARKER_LENGTH - 1;
    return PyUnicode_FromStringAndSize(start, end - start);
}

extern "C" PyObject *PyEval_GetBuiltins(void);
PyObject *PyCMethod_New(PyMethodDef *ml, PyObject *self, PyObject *module, PyTypeObject *cls);

/* __reduce__ as CPython's meth_reduce answers it: a function's name, which
   pickle saves as a global, or getattr(self, name) for a method.  Its
   absence made ``pickle.dumps(np.arange(3))'' fail on the array's
   reconstructor, numpy's _reconstruct. */
static PyObject *gcm_reduce(PyObject *self, PyObject *unused) {
    (void)unused;
    GrailCMethodObject *f = (GrailCMethodObject *)self;
    const char *n = f->m_ml && f->m_ml->ml_name ? f->m_ml->ml_name : "?";
    if (f->m_self == NULL || PyType_IsSubtype(Py_TYPE(f->m_self), &PyModule_Type))
        return PyUnicode_FromString(n);
    PyObject *builtins = PyEval_GetBuiltins();
    PyObject *getattr_fn = builtins ? PyDict_GetItemString(builtins, "getattr") : NULL;
    if (getattr_fn == NULL) {
        PyErr_SetString(PyExc_RuntimeError, "__reduce__: no builtins.getattr");
        return NULL;
    }
    return Py_BuildValue("(O(Os))", getattr_fn, f->m_self, n);
}
static PyMethodDef gcm_reduce_def = { "__reduce__", gcm_reduce, METH_NOARGS, NULL };
/* object.__reduce_ex__(protocol), which asks __reduce__. */
static PyMethodDef gcm_reduce_ex_def = { "__reduce_ex__", gcm_reduce, METH_O, NULL };

/* ``f.__module__ = name'', which CPython's builtin functions take (a
   member): numpy's multiarray.py sets it on every function it re-exports,
   _reconstruct among them, and the store went nowhere. */
static int gcm_setattro(PyObject *self, PyObject *name, PyObject *value) {
    GrailCMethodObject *f = (GrailCMethodObject *)self;
    const char *n = PyUnicode_AsUTF8(name);
    if (n == NULL) return -1;
    if (strcmp(n, "__module__") == 0) {
        Py_XINCREF(value);
        Py_XSETREF(f->m_module, value);
        return 0;
    }
    PyErr_Format(PyExc_AttributeError,
                 "'builtin_function_or_method' object has no attribute '%s'", n);
    return -1;
}

static PyObject *gcm_getattro(PyObject *self, PyObject *name) {
    GrailCMethodObject *f = (GrailCMethodObject *)self;
    const char *n = PyUnicode_AsUTF8(name);
    if (n == NULL) return NULL;
    if (strcmp(n, "__name__") == 0 || strcmp(n, "__qualname__") == 0)
        return PyUnicode_FromString(f->m_ml->ml_name);
    if (strcmp(n, "__doc__") == 0)
        return _grail_doc_from_internal_doc(f->m_ml->ml_name, f->m_ml->ml_doc);
    if (strcmp(n, "__text_signature__") == 0)
        return _grail_text_signature_from_internal_doc(f->m_ml->ml_name, f->m_ml->ml_doc);
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
    if (strcmp(n, "__reduce__") == 0) return PyCMethod_New(&gcm_reduce_def, self, NULL, NULL);
    if (strcmp(n, "__reduce_ex__") == 0) return PyCMethod_New(&gcm_reduce_ex_def, self, NULL, NULL);
    PyErr_Format(PyExc_AttributeError,
                 "'builtin_function_or_method' object has no attribute '%s'", n);
    return NULL;
}

/* repr() as CPython's meth_repr writes it: a module function (or one with
   no self) is ``<built-in function name>'', a method names its receiver's
   type. */
static PyObject *gcm_repr(PyObject *self) {
    GrailCMethodObject *f = (GrailCMethodObject *)self;
    const char *n = f->m_ml && f->m_ml->ml_name ? f->m_ml->ml_name : "?";
    if (f->m_self == NULL || PyType_IsSubtype(Py_TYPE(f->m_self), &PyModule_Type))
        return PyUnicode_FromFormat("<built-in function %s>", n);
    return PyUnicode_FromFormat("<built-in method %s of %s object at %p>", n,
                                Py_TYPE(f->m_self)->tp_name, (void *)f->m_self);
}

static void init_cfunction_type(void) {
    static int done = 0;
    if (done) return;
    done = 1;
    memset(&PyCFunction_Type, 0, sizeof(PyCFunction_Type));
    PyCFunction_Type.ob_base.ob_base.ob_refcnt = 1;
    PyCFunction_Type.ob_base.ob_base.ob_type = &PyType_Type;
    PyCFunction_Type.tp_name = "builtin_function_or_method";
    PyCFunction_Type.tp_basicsize = sizeof(GrailCMethodObject);
    PyCFunction_Type.tp_base = &PyBaseObject_Type;
    PyCFunction_Type.tp_call = gcm_call;
    PyCFunction_Type.tp_getattro = gcm_getattro;
    PyCFunction_Type.tp_repr = gcm_repr;
    PyCFunction_Type.tp_setattro = gcm_setattro;
    PyCFunction_Type.tp_flags = Py_TPFLAGS_DEFAULT | Py_TPFLAGS_READY;
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
    f->ob_type = &PyCFunction_Type;
    f->m_ml = ml;
    f->m_self = self;
    f->m_module = module;
    f->vectorcall = gcm_vectorcall;
    f->mm_class = cls;
    return (PyObject *)f;
}

/* --- Method and getset DESCRIPTORS ----------------------------------------

   What CPython's PyType_Ready puts in a type's __dict__ for each tp_methods
   and tp_getset entry, so that reading an instance method or a property off
   the TYPE answers an object -- ``ndarray.__array_finalize__'' -- rather
   than nothing.  numpy's module init reads five of them off PyArray_Type and
   keeps them, then later compares a subclass's lookup against them by
   identity; foreign_generic_getattr (cpython.cc) caches each in the type's
   tp_dict, so every read answers the same object, as in CPython.

   They carry the EXPORTED PyMethodDescr_Type / PyGetSetDescr_Type /
   PyMemberDescr_Type (zeroed placeholders in shim_numpy.cc, filled in here on
   first use) so a wheel's type checks against those symbols hold.  Like
   PyCFunction_Type, none is registered as a shim type: a descriptor is the
   wheel's side of the boundary and crosses into Grail as a foreign proxy.

   CPYTHON'S LAYOUT, field for field (cpython/descrobject.h): PyDescr_COMMON
   -- the object head, d_type, d_name, d_qualname -- then the definition
   pointer at offset 40.  numpy's add_docstring writes a descriptor's doc
   straight through ``((PyMethodDescrObject *)obj)->d_method->ml_doc'' (and
   d_getset, d_member), so a definition pointer anywhere else is read as
   garbage.  These descriptors used to keep it at offset 16.  d_name and
   d_qualname stay NULL: a descriptor is cached in its type's tp_dict for the
   life of the process, and a Grail str there would outlive its session. */
extern "C" PyTypeObject PyMethodDescr_Type;
extern "C" PyTypeObject PyGetSetDescr_Type;
extern "C" PyTypeObject PyMemberDescr_Type;
extern "C" PyObject *PyMember_GetOne(const char *, PyMemberDef *);   /* cpython.cc */
extern "C" int PyMember_SetOne(char *, PyMemberDef *, PyObject *);   /* cpython.cc */

typedef struct {
    Py_ssize_t    ob_refcnt;
    PyTypeObject *ob_type;
    PyTypeObject *d_type;
    PyObject     *d_name;
    PyObject     *d_qualname;
} GrailDescrCommon;

typedef struct {
    GrailDescrCommon c;
    PyMethodDef     *d_method;
    vectorcallfunc_t vectorcall;
} GrailMethodDescr;

typedef struct {
    GrailDescrCommon c;
    PyGetSetDef     *d_getset;
} GrailGetSetDescr;

typedef struct {
    GrailDescrCommon c;
    PyMemberDef     *d_member;
} GrailMemberDescr;

static const char *descr_owner_name(PyObject *descr) {
    PyTypeObject *t = ((GrailDescrCommon *)descr)->d_type;
    return (t != NULL && t->tp_name != NULL) ? t->tp_name : "?";
}

/* descriptor(self, *args, **kwargs): bind the first argument and call. */
static PyObject *gmd_call(PyObject *descr, PyObject *args, PyObject *kwargs) {
    GrailMethodDescr *d = (GrailMethodDescr *)descr;
    Py_ssize_t n = PyTuple_Size(args);
    if (n < 1) {
        PyErr_Format(PyExc_TypeError, "descriptor '%s' of '%s' object needs an argument",
                     d->d_method->ml_name, descr_owner_name(descr));
        return NULL;
    }
    PyObject *bound = PyCMethod_New(d->d_method, PyTuple_GetItem(args, 0), NULL, d->c.d_type);
    if (bound == NULL) return NULL;
    PyObject *rest = PyTuple_GetSlice(args, 1, n);
    if (rest == NULL) return NULL;
    return PyObject_Call(bound, rest, kwargs);
}

/* Read off an instance: a bound method.  Off the class: the descriptor. */
static PyObject *gmd_get(PyObject *descr, PyObject *obj, PyObject *type) {
    (void)type;
    GrailMethodDescr *d = (GrailMethodDescr *)descr;
    if (obj == NULL || obj == Py_None) { Py_INCREF(descr); return descr; }
    return PyCMethod_New(d->d_method, obj, NULL, d->c.d_type);
}

static PyObject *ggs_get(PyObject *descr, PyObject *obj, PyObject *type) {
    (void)type;
    GrailGetSetDescr *d = (GrailGetSetDescr *)descr;
    if (obj == NULL || obj == Py_None) { Py_INCREF(descr); return descr; }
    if (d->d_getset->get == NULL) {
        PyErr_Format(PyExc_AttributeError, "attribute '%s' of '%s' objects is not readable",
                     d->d_getset->name, descr_owner_name(descr));
        return NULL;
    }
    return d->d_getset->get(obj, d->d_getset->closure);
}

static int ggs_set(PyObject *descr, PyObject *obj, PyObject *value) {
    GrailGetSetDescr *d = (GrailGetSetDescr *)descr;
    if (d->d_getset->set == NULL) {
        PyErr_Format(PyExc_AttributeError, "attribute '%s' of '%s' objects is not writable",
                     d->d_getset->name, descr_owner_name(descr));
        return -1;
    }
    return d->d_getset->set(obj, value, d->d_getset->closure);
}

static PyObject *gmb_get(PyObject *descr, PyObject *obj, PyObject *type) {
    (void)type;
    GrailMemberDescr *d = (GrailMemberDescr *)descr;
    if (obj == NULL || obj == Py_None) { Py_INCREF(descr); return descr; }
    return PyMember_GetOne((const char *)obj, d->d_member);
}

static int gmb_set(PyObject *descr, PyObject *obj, PyObject *value) {
    return PyMember_SetOne((char *)obj, ((GrailMemberDescr *)descr)->d_member, value);
}

/* ``descr.__name__'', ``__qualname__'', ``__doc__'' and ``__objclass__'',
   which is what a Python reader -- numpy's add_newdoc, inspect, help() --
   asks a descriptor; d_name is not kept (see above), so the names come from
   the definition. */
extern "C" PyObject *PyObject_GenericGetAttr(PyObject *obj, PyObject *name);
static PyObject *descr_getattro(PyObject *descr, PyObject *name) {
    const char *n = PyUnicode_AsUTF8(name);
    if (n == NULL) return NULL;
    PyTypeObject *dt = Py_TYPE(descr);
    const char *dname = NULL, *doc = NULL;
    if (dt == &PyMethodDescr_Type) {
        dname = ((GrailMethodDescr *)descr)->d_method->ml_name;
        doc = ((GrailMethodDescr *)descr)->d_method->ml_doc;
    } else if (dt == &PyGetSetDescr_Type) {
        dname = ((GrailGetSetDescr *)descr)->d_getset->name;
        doc = ((GrailGetSetDescr *)descr)->d_getset->doc;
    } else if (dt == &PyMemberDescr_Type) {
        dname = ((GrailMemberDescr *)descr)->d_member->name;
        doc = ((GrailMemberDescr *)descr)->d_member->doc;
    }
    if (strcmp(n, "__name__") == 0 && dname != NULL)
        return PyUnicode_FromString(dname);
    if (strcmp(n, "__qualname__") == 0 && dname != NULL) {
        const char *owner = descr_owner_name(descr);
        const char *dot = strrchr(owner, '.');
        return PyUnicode_FromFormat("%s.%s", dot ? dot + 1 : owner, dname);
    }
    if (strcmp(n, "__doc__") == 0) {
        if (doc != NULL) return PyUnicode_FromString(doc);
        Py_INCREF(Py_None);
        return Py_None;
    }
    if (strcmp(n, "__objclass__") == 0 && ((GrailDescrCommon *)descr)->d_type != NULL) {
        PyObject *t = (PyObject *)((GrailDescrCommon *)descr)->d_type;
        Py_INCREF(t);
        return t;
    }
    /* Everything else is the generic walk's: the slot method-wrappers
       (``__get__'' / ``__set__'', which numpy asks of void's dtype getset),
       the type's methods, and its AttributeError. */
    return PyObject_GenericGetAttr(descr, name);
}

static void init_descr_type(PyTypeObject *t, const char *name, Py_ssize_t size) {
    t->ob_base.ob_base.ob_refcnt = 1;
    t->ob_base.ob_base.ob_type = &PyType_Type;
    t->tp_name = name;
    t->tp_basicsize = size;
    t->tp_base = &PyBaseObject_Type;
    t->tp_getattro = descr_getattro;
    t->tp_flags = Py_TPFLAGS_DEFAULT | Py_TPFLAGS_READY;
}

static void init_descr_types(void) {
    static int done = 0;
    if (done) return;
    done = 1;
    init_cfunction_type();
    init_descr_type(&PyMethodDescr_Type, "method_descriptor", sizeof(GrailMethodDescr));
    PyMethodDescr_Type.tp_call = gmd_call;
    PyMethodDescr_Type.tp_descr_get = gmd_get;
    init_descr_type(&PyGetSetDescr_Type, "getset_descriptor", sizeof(GrailGetSetDescr));
    PyGetSetDescr_Type.tp_descr_get = ggs_get;
    PyGetSetDescr_Type.tp_descr_set = ggs_set;
    init_descr_type(&PyMemberDescr_Type, "member_descriptor", sizeof(GrailMemberDescr));
    PyMemberDescr_Type.tp_descr_get = gmb_get;
    PyMemberDescr_Type.tp_descr_set = gmb_set;
}

PyObject *PyDescr_NewMethod(PyTypeObject *type, PyMethodDef *ml) {
    if (ml == NULL) {
        PyErr_SetString(PyExc_SystemError, "PyDescr_NewMethod: NULL PyMethodDef");
        return NULL;
    }
    init_descr_types();
    GrailMethodDescr *d = (GrailMethodDescr *)calloc(1, sizeof(GrailMethodDescr));
    if (d == NULL) return PyErr_NoMemory();
    d->c.ob_refcnt = 1;
    d->c.ob_type = &PyMethodDescr_Type;
    d->c.d_type = type;
    d->d_method = ml;
    return (PyObject *)d;
}

PyObject *PyDescr_NewGetSet(PyTypeObject *type, PyGetSetDef *gs) {
    if (gs == NULL) {
        PyErr_SetString(PyExc_SystemError, "PyDescr_NewGetSet: NULL PyGetSetDef");
        return NULL;
    }
    init_descr_types();
    GrailGetSetDescr *d = (GrailGetSetDescr *)calloc(1, sizeof(GrailGetSetDescr));
    if (d == NULL) return PyErr_NoMemory();
    d->c.ob_refcnt = 1;
    d->c.ob_type = &PyGetSetDescr_Type;
    d->c.d_type = type;
    d->d_getset = gs;
    return (PyObject *)d;
}

/* What a struct field (tp_members) is when read off its TYPE --
   ``numpy.flatiter.base'', which numpy's _add_newdocs documents at import. */
PyObject *PyDescr_NewMember(PyTypeObject *type, PyMemberDef *m) {
    if (m == NULL) {
        PyErr_SetString(PyExc_SystemError, "PyDescr_NewMember: NULL PyMemberDef");
        return NULL;
    }
    init_descr_types();
    GrailMemberDescr *d = (GrailMemberDescr *)calloc(1, sizeof(GrailMemberDescr));
    if (d == NULL) return PyErr_NoMemory();
    d->c.ob_refcnt = 1;
    d->c.ob_type = &PyMemberDescr_Type;
    d->c.d_type = type;
    d->d_member = m;
    return (PyObject *)d;
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

#define GRAIL_RAISED_MAGIC 0x47524149u   /* "GRAI" */

/* Laid out as CPython 3.14's PyBaseExceptionObject (72 bytes), because the
   token is also what the thread state's current_exception slot holds
   (cpython.cc, err_publish), and Cython reads that object INLINE: Py_TYPE
   for matching and ``->traceback'' (offset 40) on every fetch and restore.
   The magic sits in the padding after suppress_context, inside the 72 bytes
   every exception object has, so testing any exception for it stays in
   bounds; args (offset 24) stays NULL, never GRAIL_WRAP_MAGIC. */
typedef struct {
    Py_ssize_t    ob_refcnt;
    PyTypeObject *ob_type;           /* the exception type */
    PyObject     *dict;
    PyObject     *args;
    PyObject     *notes;
    PyObject     *traceback;
    PyObject     *context;
    PyObject     *cause;
    char          suppress_context;
    char          pad[3];
    uint32_t      magic;             /* GRAIL_RAISED_MAGIC, at offset 68 */
    int           from_grail;        /* raised by a Grail callback */
    char          msg[1024];
} GrailRaisedException;

static GrailRaisedException *as_raised(PyObject *o) {
    if (o == NULL || o->ob_type == NULL) return NULL;
    if (!(o->ob_type->tp_flags & Py_TPFLAGS_BASE_EXC_SUBCLASS)) return NULL;
    GrailRaisedException *r = (GrailRaisedException *)o;
    return r->magic == GRAIL_RAISED_MAGIC ? r : NULL;
}

/* A token for the indicator (type, message, from-Grail), reusing one the
   indicator dropped while it still sat in the thread state's slot -- Cython
   never took that one, so nothing holds it (_grail_raised_token_recycle). */
static GrailRaisedException *g_raised_free = NULL;

PyObject *_grail_raised_token(PyObject *type, const char *msg, int from_grail) {
    GrailRaisedException *r = g_raised_free;
    if (r != NULL) {
        g_raised_free = (GrailRaisedException *)r->context;
        memset(r, 0, sizeof(*r));
    } else {
        r = (GrailRaisedException *)calloc(1, sizeof(GrailRaisedException));
        if (r == NULL) return NULL;
    }
    r->ob_refcnt = 1;
    r->ob_type = (PyTypeObject *)type;
    r->magic = GRAIL_RAISED_MAGIC;
    r->from_grail = from_grail;
    snprintf(r->msg, sizeof(r->msg), "%s", msg ? msg : "");
    return (PyObject *)r;
}

/* The indicator a token carries; 0 for anything that is not one. */
int _grail_raised_token_read(PyObject *o, PyObject **type, const char **msg, int *from_grail) {
    GrailRaisedException *r = as_raised(o);
    if (r == NULL) return 0;
    *type = (PyObject *)r->ob_type;
    *msg = r->msg;
    *from_grail = r->from_grail;
    return 1;
}

void _grail_raised_token_recycle(PyObject *o) {
    GrailRaisedException *r = as_raised(o);
    if (r == NULL) return;
    r->magic = 0;
    r->context = (PyObject *)g_raised_free;
    g_raised_free = r;
}

/* cpython.cc's error indicator: the wheel's own exception instance behind
   it (NULL when there is none), and str() of such an instance. */
void _grail_err_set_instance(PyObject *exc);
PyObject *_grail_err_instance(void);
void _grail_foreign_exc_text(PyObject *v, char *buf, size_t cap);
int  _grail_err_from_grail(void);
void _grail_err_set_from_grail(int v);
PyObject *_grail_err_take_published(void);
void _grail_err_set_published(PyObject *exc);

/* The pending exception as the object the thread state holds -- a wheel's
   own instance, or a token for the (type, message) pair -- so PyO3 and
   Cython see one and the same object.  The caller owns it; the indicator is
   cleared. */
PyObject *PyErr_GetRaisedException(void) {
    if (PyErr_Occurred() == NULL) return NULL;
    PyObject *exc = _grail_err_take_published();
    if (exc != NULL && getenv("GRAIL_SHIM_DIAG")) {
        GrailRaisedException *r = as_raised(exc);
        fprintf(stderr, "SHIM-DIAG: PyErr_GetRaisedException -> %s: %s\n",
                tp_name_of(exc->ob_type), r ? r->msg : "(instance)");
        fflush(stderr);
    }
    return exc;
}

/* The indicator becomes exc: a token's pair, or a wheel's own exception
   object with its type and str() (cpython.cc, err_adopt). */
void PyErr_SetRaisedException(PyObject *exc) {
    if (exc == NULL) { PyErr_Clear(); return; }
    _grail_err_set_published(exc);
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

/* A C-level exception object (a token, or a wheel's own instance) keeps its
   traceback in the struct, where Cython reads it; the shim makes none, so
   this answers what was stored, usually NULL. */
int _grail_is_c_exception(PyObject *o);
PyObject *PyException_GetTraceback(PyObject *exc) {
    if (exc != NULL && _grail_is_c_exception(exc)) {
        PyObject *tb = ((GrailRaisedException *)exc)->traceback;
        Py_XINCREF(tb);
        return tb;
    }
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
   every equality answer right.  But an interned str carries its hash, which
   Cython's keyword matching reads (cpython.cc, grail_inline_hash). */
Py_hash_t _grail_inline_hash_if_str(PyObject *obj);
void PyUnicode_InternInPlace(PyObject **p) {
    if (p != NULL && *p != NULL) (void)_grail_inline_hash_if_str(*p);
}

/* PyUnicode_New, PyUnicode_CopyCharacters and PyUnicode_Resize live in
   cpython.cc, with the shim's CPython-layout strs; PyUnicode_DATA (a function
   in 3.14's stable surface) answers from there too. */
void *_grail_str_data_in_layout(PyObject *u);
#ifdef PyUnicode_DATA
#undef PyUnicode_DATA
#endif
void *PyUnicode_DATA(PyObject *u) {
    return _grail_str_data_in_layout(u);
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

extern "C" unsigned long long PyLong_AsUnsignedLongLongMask_impl(PyObject *o);  /* cpython.cc */
unsigned long long PyLong_AsUnsignedLongLongMask(PyObject *o) {
    return PyLong_AsUnsignedLongLongMask_impl(o);
}

/* 3.13: the interpreter's constants by number (Include/object.h
   Py_CONSTANT_*).  Borrowed and immortal, so the numbers and empty
   containers are made once and pinned with a large refcount. */
extern PyObject _Py_EllipsisObject;           /* shim_numpy.cc */
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
    case 3: v = &_Py_EllipsisObject; break;
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
