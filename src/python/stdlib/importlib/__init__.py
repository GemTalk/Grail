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
    # __import__ ignores the globals/locals args for an absolute import, and
    # Grail has no locals() builtin, so pass None rather than globals()/locals().
    mod = __import__(name, None, None, [parts[-1]])
    return mod


def reload(module):
    """``importlib.reload(module)`` — re-read the module's source and re-compile
    it in place, preserving the module object's identity (CPython semantics).

    GRAIL: delegates through the ``__reload__`` builtin, which routes to the
    Smalltalk loader's ``reload:`` (re-parse ``module.__file__`` + recompile the
    module's class + re-run its body on the same instance).  A module with no
    ``__file__`` (native/built-in) is returned unchanged."""
    return __reload__(module)


# importlib.util submodule attribute hook
class _UtilStub:
    """Lazily-populated stand-in for ``importlib.util``."""

    def find_spec(self, name, package=None, target=None):
        return find_spec(name, package, target)

    def spec_from_file_location(self, name, location, **kwargs):
        return _ModuleSpec(name, _Loader(location), location)

    def spec_from_loader(self, name, loader, origin=None, is_package=None):
        return spec_from_loader(name, loader, origin=origin,
                                is_package=is_package)


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


# The public CPython spelling of the same class.  ``from importlib.machinery
# import ModuleSpec`` is how third-party code names it, and there is no
# machinery module here to hold it.
ModuleSpec = _ModuleSpec


def spec_from_loader(name, loader, origin=None, is_package=None):
    """A ModuleSpec for a loader that has no file behind it.

    six installs a meta-path importer for its ``six.moves`` shims and asks for
    a spec this way; without this function ``import six`` failed at module
    scope, before any of the shims could be used.

    CPython asks the LOADER whether the module is a package when ``is_package``
    is not given.  A loader is free not to answer -- Grail's own ``_Loader``
    has no such method -- so the question is asked with getattr and skipped
    when it cannot be.  A package gets an empty search-location list, which is
    what marks a spec as a package.
    """
    if is_package is None:
        probe = getattr(loader, 'is_package', None)
        if probe is not None:
            try:
                is_package = probe(name)
            except ImportError:
                is_package = None
    if origin is None:
        origin = getattr(loader, 'path', None)
    search = [] if is_package else None
    return _ModuleSpec(name, loader, origin, search)


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


def _search_roots():
    """The directories Grail's module resolver searches, in ITS order.

    A Python-side mirror of the root list ``importlib >>
    ___moduleNameToPath___:`` builds: grailDir, grailDir/src/python/stdlib,
    then sys.path.  The order matters and is deliberate on the Smalltalk side
    -- Grail's ported stdlib has to win, so a directory a caller appends to
    sys.path cannot shadow Grail's own ``os`` or ``traceback``.  Anything that
    probes for a module's directory from Python has to honour the same rule or
    it will answer a different file than the one that got imported.

    ``importlib.resources`` uses this only for a module with no ``__file__``
    (a Smalltalk-native one); the ordinary path is to read the ``__path__`` /
    ``__file__`` the loader already recorded, which needs no re-derivation.
    Grail's ``extraSearchRoots`` is not reachable from Python and so is not
    represented here -- code that adds a root that way is Grail-specific and
    can ask the Smalltalk side directly.
    """
    import sys as _sys

    roots = []
    # Derived from THIS file rather than read from $GRAIL_DIR.  The env var is
    # what find_spec uses and it is normally right, but it is set by install.sh
    # and inherited -- an RPC gem takes the NetLDI's copy, which can name a
    # different checkout on a host that has more than one, and the Smalltalk
    # ___resolveGrailDir___ has a whole validation dance for exactly that.  This
    # module was LOADED from <grailDir>/src/python/stdlib/importlib/__init__.py,
    # so its own path names the checkout that is actually running, with nothing
    # to validate.  $GRAIL_DIR stays as the fallback for a session where
    # __file__ is somehow unavailable.
    stdlib = None
    here = globals().get('__file__')
    if here:
        stdlib = _os.path.dirname(_os.path.dirname(_os.path.abspath(str(here))))
        grail_dir = _os.path.dirname(_os.path.dirname(_os.path.dirname(stdlib)))
    else:
        grail_dir = _os.environ.get('GRAIL_DIR', '')
        if grail_dir:
            stdlib = _os.path.join(grail_dir, 'src', 'python', 'stdlib')
    if grail_dir:
        roots.append(grail_dir)
    if stdlib:
        roots.append(stdlib)
    for entry in getattr(_sys, 'path', []):
        if entry and str(entry) not in roots:
            roots.append(str(entry))
    return roots
