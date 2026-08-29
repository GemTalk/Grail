# Grail pkgutil stub — covers only the API Werkzeug touches.
# Real CPython pkgutil walks importers and yields module info;
# Werkzeug.utils.find_modules iterates this for auto-discovery of
# blueprint helpers.  Grail returns an empty iterator — find_modules
# yields nothing, callers that depend on it for auto-registration
# get nothing back, which is fine for the hello-world demo path.


def iter_modules(path=None, prefix=''):
    """Yield (importer, modname, ispkg) for modules in path.
    Empty in Grail — no filesystem walk implementation."""
    return iter([])


def walk_packages(path=None, prefix='', onerror=None):
    """Recursively walk packages.  Empty for the same reason as
    iter_modules."""
    return iter([])


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
