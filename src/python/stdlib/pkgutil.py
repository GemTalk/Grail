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
