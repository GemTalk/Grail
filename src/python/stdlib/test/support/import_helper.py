# GRAIL: trimmed test.support.import_helper.
#
# Grail has no fresh-import isolation and no per-module C-accelerator
# blocking, so import_fresh_module degrades to "import it normally and
# hand back the module object".  import_module maps a failed import to a
# clean SkipTest (CPython behavior) instead of an opaque error.

import sys
import unittest


def import_module(name, deprecated=False, *, required_on=()):
    try:
        __import__(name)
    except ImportError as exc:
        raise unittest.SkipTest("cannot import " + name + ": " + str(exc))
    return sys.modules[name]


def import_fresh_module(name, fresh=(), blocked=(), *, deprecated=False,
                        usefrozen=False):
    # Grail has no fresh-import isolation, so we do NOT pop-and-reload (which
    # trips the loader's `sys.modules[name]` lookup mid-reload); we just import
    # the module normally and return it.
    #
    # `fresh=` IS honoured, though.  It names the modules the caller needs
    # actually present -- in practice the C accelerator, as in
    #   c_functools = import_fresh_module('functools', fresh=['_functools'])
    # CPython's helper yields None when one of those cannot be imported, and
    # test files are written against exactly that contract:
    #   @unittest.skipUnless(c_functools, 'requires the C _functools module')
    # Grail ships no C accelerators, so returning the pure-Python module for
    # the "C" variant made every such class run anyway -- and made
    # `self.module == c_functools` true for the PY variant too, so C-only
    # branches fired in both.  Answer None instead: the C-only classes skip,
    # and the py-variant comparisons come out False as they should.
    #
    # `blocked=` stays ignored: it asks for the module WITHOUT its accelerator,
    # which is what Grail's pure-Python implementation already is.
    for required in fresh:
        try:
            __import__(required)
        except ImportError:
            return None
    try:
        __import__(name)
    except ImportError:
        return None
    return sys.modules.get(name)


def ensure_lazy_imports(module, names):
    # No-op: Grail does not model lazy import machinery.
    return None


def unload(name):
    sys.modules.pop(name, None)


class CleanImport:
    def __init__(self, *module_names):
        self.module_names = module_names

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


class DirsOnSysPath:
    def __init__(self, *paths):
        self.paths = paths

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


def forget(modname):
    """Remove a module (and its dotted submodules) from sys.modules -- CPython
    import_helper.forget minus the .pyc cleanup Grail does not need."""
    unload(modname)
    import sys
    for name in list(sys.modules):
        if name.startswith(modname + '.'):
            del sys.modules[name]
