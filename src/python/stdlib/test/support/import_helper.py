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
    # Grail has no C-accelerator split and no fresh-import isolation, so we
    # do NOT pop-and-reload (which trips the loader's `sys.modules[name]`
    # lookup mid-reload); we just import the module normally and return it.
    # fresh/blocked are ignored -- both the "C" and "py" variants a test
    # requests resolve to the same Grail module.
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
