# Minimal `importlib` Python facade for Grail.  Grail's Smalltalk-
# side `importlib` is the module loader; the Python-side stub here
# exposes the surface Jinja2 / Werkzeug / Flask reach for:
#
#   - ``import_module(name)``: returns the loaded module instance.
#   - ``importlib.util.find_spec(...)``: minimal namespace-package
#     detection.  Returns a ModuleSpec-like with ``loader`` and
#     ``submodule_search_locations`` so PackageLoader can inspect
#     them.  Filesystem-based discovery only — no zip support.
#
# The native Smalltalk loader is accessed by name shadowing: this
# Python module shadows the Smalltalk global, so user code that does
# ``import importlib`` lands here.  Internal Grail callers that need
# the real loader keep using the lower-case Smalltalk class symbol.

import os as _os


def import_module(name, package=None):
    """Import a module by dotted name and return the module object.

    GRAIL: delegates back through Python's ``__import__`` builtin,
    which in turn routes through the Smalltalk loader.  The
    ``fromlist`` workaround in CPython is reproduced here so the
    leaf module is returned for dotted names."""
    # Strip leading dots — relative imports require a package and
    # we don't support that case yet.
    while name and name.startswith('.'):
        name = name[1:]
    parts = name.split('.')
    mod = __import__(name, globals(), locals(), [parts[-1]])
    return mod


def reload(module):
    """``importlib.reload(module)`` — stub: returns the module
    unchanged.  Grail caches imports forever in this build."""
    return module


# importlib.util submodule attribute hook
class _UtilStub:
    """Lazily-populated stand-in for ``importlib.util``."""

    def find_spec(self, name, package=None, target=None):
        return find_spec(name, package, target)

    def spec_from_file_location(self, name, location, **kwargs):
        return _ModuleSpec(name, _Loader(location), location)


util = _UtilStub()


class _Loader:
    def __init__(self, path):
        self.path = path


class _ModuleSpec:
    def __init__(self, name, loader, origin, submodule_search_locations=None):
        self.name = name
        self.loader = loader
        self.origin = origin
        self.submodule_search_locations = submodule_search_locations


def find_spec(name, package=None, target=None):
    """Locate the module-spec for ``name``.  Returns None if not
    found.  Tries the Grail stdlib search root + the project's
    own source tree."""
    # Convert dotted name to path parts and probe both roots.
    parts = name.split('.')
    sub = _os.path.join(*parts)
    candidates = []
    grail_dir = _os.environ.get('GRAIL_DIR', '')
    if grail_dir:
        candidates.append(_os.path.join(grail_dir, 'src', 'python', 'stdlib', sub))
        candidates.append(_os.path.join(grail_dir, sub))
    for base in candidates:
        if _os.path.isdir(base):
            init = _os.path.join(base, '__init__.py')
            if _os.path.isfile(init):
                return _ModuleSpec(name, _Loader(init), init, [base])
        py = base + '.py'
        if _os.path.isfile(py):
            return _ModuleSpec(name, _Loader(py), py)
    return None
