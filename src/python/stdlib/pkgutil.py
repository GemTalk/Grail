# Grail pkgutil -- the parts of CPython's that a program reaches for.
#
# iter_modules and walk_packages follow CPython's file-finder walk
# (pkgutil._iter_file_finder_modules): a root's .py files are modules, its
# directories holding an __init__ are packages, and anything else -- a
# namespace directory, a dotted file name -- is skipped.  With no path they
# walk the roots Grail's own resolver searches, in its order
# (importlib._search_roots), which is the analogue of CPython walking
# sys.path: Grail's bundled stdlib is a root here the way CPython's Lib/ is a
# sys.path entry there.  Grail's Smalltalk-native modules (json, math, ...)
# are not files, and are not listed, as CPython does not list its built-ins.

from collections import namedtuple
import os
import sys

ModuleInfo = namedtuple('ModuleInfo', 'module_finder name ispkg')
ModuleInfo.__doc__ = 'A namedtuple with minimal info about a module.'

# Grail loads .py sources and native .so extensions; nothing is compiled to
# .pyc, so those are the suffixes a module name can come from.
_SUFFIXES = ('.py', '.so')


class _DirectoryFinder:
    """The ``module_finder`` of a ModuleInfo: the directory the module was
    found in, as ``path``, which is the part of CPython's FileFinder that
    callers read."""

    def __init__(self, path):
        self.path = path

    def __repr__(self):
        return 'FileFinder(%r)' % (self.path,)


def _module_name(filename):
    for suffix in _SUFFIXES:
        if filename.endswith(suffix):
            return filename[:-len(suffix)]
    return None


def _iter_directory(path, prefix, yielded):
    if not os.path.isdir(path):
        return
    try:
        filenames = sorted(os.listdir(path))
    except OSError:
        return
    finder = _DirectoryFinder(path)
    for fn in filenames:
        modname = _module_name(fn)
        if modname == '__init__' or modname in yielded:
            continue
        full = os.path.join(path, fn)
        ispkg = False
        if not modname and '.' not in fn and os.path.isdir(full):
            try:
                contents = os.listdir(full)
            except OSError:
                contents = []
            if not any(_module_name(sub) == '__init__' for sub in contents):
                continue                    # not a package
            modname, ispkg = fn, True
        if modname and '.' not in modname and modname not in yielded:
            yielded.add(modname)
            yield ModuleInfo(finder, prefix + modname, ispkg)


def iter_modules(path=None, prefix=''):
    """Yield a ModuleInfo for every top-level module in each directory of
    ``path``, or, with no path, of every root Grail imports from.  A name is
    reported once, from the first directory that has it -- the one an import
    would load."""
    if path is None:
        import importlib
        path = importlib._search_roots()
    elif isinstance(path, str):
        raise ValueError("path must be None or list of paths to look for modules in")
    yielded = set()
    for entry in path:
        yield from _iter_directory(str(entry), prefix, yielded)


def walk_packages(path=None, prefix='', onerror=None):
    """Yield a ModuleInfo for every module on ``path``, recursively, as
    CPython does: each package is imported, to find its ``__path__``.

    An ImportError while importing a package is passed to ``onerror`` (or
    ignored); any other exception is passed to ``onerror`` or re-raised."""

    def seen(p, m={}):
        if p in m:
            return True
        m[p] = True
        return False

    for info in iter_modules(path, prefix):
        yield info
        if info.ispkg:
            try:
                __import__(info.name)
            except ImportError:
                if onerror is not None:
                    onerror(info.name)
            except Exception:
                if onerror is not None:
                    onerror(info.name)
                else:
                    raise
            else:
                sub = getattr(sys.modules[info.name], '__path__', None) or []
                sub = [p for p in sub if not seen(p)]
                yield from walk_packages(sub, info.name + '.', onerror)


def get_loader(name):
    return None


def get_data(package, resource):
    """The bytes of a data file that ships inside ``package``.

    python-slugify and text_unidecode both call this at import time to load
    their data tables, so its absence was the first error each of them hit.

    CPython asks the package's LOADER for the bytes; Grail's Smalltalk loader
    has no get_data, so this resolves the package to its ``__file__`` and reads
    the file beside it -- which is what CPython's own filesystem loader does in
    the end.  Answers None when the package has no ``__file__`` (a native
    module), which is CPython's contract, rather than raising.

    ``resource`` is always '/'-separated, as CPython specifies, regardless of
    the platform separator.
    """
    import importlib
    import os

    mod = importlib.import_module(package)
    mod_file = getattr(mod, '__file__', None)
    if mod_file is None:
        return None
    parts = resource.split('/')
    parts.insert(0, os.path.dirname(mod_file))
    with open(os.path.join(*parts), 'rb') as f:
        return f.read()
