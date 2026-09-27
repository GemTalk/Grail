# GRAIL: trimmed test.support.import_helper.
#
# Grail has no fresh-import isolation and no per-module C-accelerator
# blocking, so import_fresh_module degrades to "import it normally and
# hand back the module object".  import_module maps a failed import to a
# clean SkipTest (CPython behavior) instead of an opaque error.

import importlib
# CPython's import_helper imports these two at its top, and test files lean on
# the side effect: ``import importlib'' alone does not bind the submodules, so
# test_warnings' test_issue31285 reads ``importlib.machinery'' having imported
# nothing but importlib and test.support.
import importlib.machinery
import importlib.util
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
    # Grail does NOT pop-and-reload an already-imported module (that trips the
    # loader's `sys.modules[name]` lookup mid-reload); it imports normally and
    # returns the existing module.  A module not yet imported is imported
    # genuinely fresh -- see below.
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
    # A module NOT yet imported CAN be imported fresh, and is: grail marks the
    # import session-local, so the module is built cold and recorded in no
    # canonical registry, and _end_fresh_import then drops it from sys.modules
    # again -- restoring sys.modules as CPython's helper does.  The caller then
    # holds the only reference, which is the property
    # test_struct's test__struct_reference_cycle_cleaned_up checks by watching
    # the module be collected.  An ALREADY-imported module keeps the old
    # behaviour above: its existing instance is returned.
    #
    # Only for a PLAIN fresh import -- no ``fresh=`` and no ``blocked=``.  Those
    # two ask for a module with or without its C accelerator, and the caller
    # then mixes the copy with the ordinary import's objects; a second,
    # session-local copy of a module such as xml.etree.ElementTree gave it
    # classes the rest of the package did not recognise ("expected an Element,
    # not Element") and cost test_xml_etree 140 tests.  Returning the ordinary
    # module, as before, is what those callers are built around here.
    if not fresh and not blocked and name not in sys.modules:
        import grail
        grail._begin_fresh_import(name)
        try:
            try:
                __import__(name)
            except ImportError:
                return None
            return sys.modules.get(name)
        finally:
            grail._end_fresh_import(name)
    try:
        __import__(name)
    except ImportError:
        return None
    # With ``fresh=``, CPython answers a NEW module object, and test_warnings
    # asserts it (``assertIsNot(original_warnings, c_warnings)``).  A native
    # module that can build an independent copy of itself does so here; for
    # every other module this answers None and the helper keeps answering the
    # module already imported.
    if fresh:
        import grail
        copy = grail._fresh_native_module(name)
        if copy is not None:
            return copy
    return sys.modules.get(name)


def ensure_lazy_imports(module, names):
    # No-op: Grail does not model lazy import machinery.
    return None


def unload(name):
    sys.modules.pop(name, None)


class ready_to_import:
    """Context manager putting a freshly written module on sys.path, yielding
    ``(name, path)`` -- CPython import_helper.ready_to_import, written as a
    plain class because Grail forbids @contextlib.contextmanager (the same
    reason os_helper's temp_dir and change_cwd are classes).

    This one really does need the filesystem, and Grail can do all of it:
    tempfile.mkdtemp, open(path, 'w'), and an import that honours sys.path.
    That last part is not obvious -- Grail searches its own bundled stdlib
    FIRST and sys.path LAST, deliberately, so a caller cannot shadow Grail's
    ``os'' -- but a name that Grail does not ship resolves out of sys.path
    exactly as CPython would (importlib >> ___moduleNameToPath___:).

    What a test gets from this is a module whose BODY it chose, which is the
    only way to observe module-scope behaviour that the test file's own module
    cannot have: test_super's test_shadowed_global needs a module that binds
    the name ``super''."""

    def __init__(self, name=None, source=""):
        self.name = name or "spam"
        self.source = source
        self._temp_dir = None
        self._tempdir_path = None
        self._old_module = None
        self._had_old_module = False

    def __enter__(self):
        from test.support import os_helper
        from test.support import script_helper
        self._temp_dir = os_helper.temp_dir()
        self._tempdir_path = self._temp_dir.__enter__()
        path = script_helper.make_script(self._tempdir_path, self.name,
                                         self.source)
        # Clear any already-imported module of this name, and remember whether
        # there WAS one -- restoring it is not the same as removing it.
        if self.name in sys.modules:
            self._old_module = sys.modules.pop(self.name)
            self._had_old_module = True
        sys.path.insert(0, self._tempdir_path)
        return self.name, path

    def __exit__(self, *exc):
        # Unwound in reverse, and every step guarded: an exception inside the
        # body must still leave sys.path and sys.modules as they were, or the
        # temporary directory stays on the search path for the rest of the run
        # and later imports of an unrelated name can find a stale file.
        try:
            sys.path.remove(self._tempdir_path)
        except ValueError:
            pass
        sys.modules.pop(self.name, None)
        if self._had_old_module:
            sys.modules[self.name] = self._old_module
        if self._temp_dir is not None:
            self._temp_dir.__exit__(*exc)
        return False


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
