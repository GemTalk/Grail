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


def read_code(stream):
    """The code object in a compiled (.pyc) stream, or None when the stream
    is not one.  runpy.run_path asks this first and compiles the file as
    source on None -- which is every file under Grail, since Grail writes no
    .pyc; a real one is still read, as CPython's is."""
    magic = stream.read(4)
    try:
        from importlib.util import MAGIC_NUMBER
    except ImportError:
        return None
    if magic != MAGIC_NUMBER:
        return None
    import marshal
    stream.read(12)                # the rest of the header
    return marshal.load(stream)


def get_importer(path_item):
    """The finder for one sys.path entry, or None when nothing can import
    from it.

    CPython asks ``sys.path_hooks`` and caches the answer in
    ``sys.path_importer_cache``; its only file-system hook accepts a DIRECTORY,
    so a plain file -- ``runpy.run_path('script.py')`` -- answers None, and
    that None is what sends run_path down its run-the-file branch.  Grail has
    no path hooks, so the same answers come straight from the file system: a
    cached entry if there is one, a directory's finder, otherwise None.
    Without this ``runpy.run_path`` failed on its import of it."""
    path_item = os.fsdecode(path_item)
    cache = getattr(sys, 'path_importer_cache', None)
    if cache is not None:
        try:
            return cache[path_item]
        except KeyError:
            pass
    if os.path.isdir(path_item):
        return _DirectoryFinder(path_item)
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


_NAME_PATTERN = None


def resolve_name(name):
    """
    Resolve a name to an object.

    CPython 3.14's, verbatim but for the lazy import of importlib.  jsonschema's
    cli module imports it, and failed to import without it.

    It is expected that `name` will be a string in one of the following
    formats, where W is shorthand for a valid Python identifier and dot stands
    for a literal period in these pseudo-regexes:

    W(.W)*
    W(.W)*:(W(.W)*)?

    The first form is intended for backward compatibility only. It assumes that
    some part of the dotted name is a package, and the rest is an object
    somewhere within that package, possibly nested inside other objects.
    Because the place where the package stops and the object hierarchy starts
    can't be inferred by inspection, repeated attempts to import must be done
    with this form.

    In the second form, the caller makes the division point clear through the
    provision of a single colon: the dotted name to the left of the colon is a
    package to be imported, and the dotted name to the right is the object
    hierarchy within that package. Only one import is needed in this form. If
    it ends with the colon, then a module object is returned.

    The function will return an object (which might be a module), or raise one
    of the following exceptions:

    ValueError - if `name` isn't in a recognised format
    ImportError - if an import failed when it shouldn't have
    AttributeError - if a failure occurred when traversing the object hierarchy
                     within the imported package to get to the desired object.
    """
    import importlib
    global _NAME_PATTERN
    if _NAME_PATTERN is None:
        # Lazy import to speedup Python startup time
        import re
        dotted_words = r'(?!\d)(\w+)(\.(?!\d)(\w+))*'
        _NAME_PATTERN = re.compile(f'^(?P<pkg>{dotted_words})'
                                   f'(?P<cln>:(?P<obj>{dotted_words})?)?$',
                                   re.UNICODE)

    m = _NAME_PATTERN.match(name)
    if not m:
        raise ValueError(f'invalid format: {name!r}')
    gd = m.groupdict()
    if gd.get('cln'):
        # there is a colon - a one-step import is all that's needed
        mod = importlib.import_module(gd['pkg'])
        parts = gd.get('obj')
        parts = parts.split('.') if parts else []
    else:
        # no colon - have to iterate to find the package boundary
        parts = name.split('.')
        modname = parts.pop(0)
        # first part *must* be a module/package.
        mod = importlib.import_module(modname)
        while parts:
            p = parts[0]
            s = f'{modname}.{p}'
            try:
                mod = importlib.import_module(s)
                parts.pop(0)
                modname = s
            except ImportError:
                break
    # if we reach this point, mod is the module, already imported, and
    # parts is the list of parts in the object hierarchy to be traversed, or
    # an empty list if just the module is wanted.
    result = mod
    for p in parts:
        result = getattr(result, p)
    return result
