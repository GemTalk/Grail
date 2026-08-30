"""``importlib.resources`` -- read data files that ship inside a package.

WHAT WAS BROKEN: the module did not exist, so ``import certifi`` died at
``from importlib.resources import as_file, files`` with

    ModuleNotFoundError: No module named 'importlib.resources'

certifi is how essentially every HTTPS client finds its CA bundle, and its
``where()`` is nothing but ``as_file(files("certifi").joinpath("cacert.pem"))``
-- the modern API, chosen because Grail reports ``sys.version_info >= (3, 11)``.

HOW A RESOURCE IS FOUND.  Grail reads module source off the real filesystem
through GsFile, so a resource is an ordinary file sitting next to the package's
``__init__.py`` and there is no zip/loader indirection to model.  ``files()``
therefore resolves the anchor the way CPython does -- by asking the IMPORT
SYSTEM, not by re-deriving a path.  It imports the anchor and reads the
``__path__`` (package) or ``__file__`` (module) that Grail's Smalltalk loader
already set from whatever root it found the module under.  That is exactly the
search order of ``importlib >> ___moduleNameToPath___:`` -- grailDir, the
bundled stdlib, extraSearchRoots, then sys.path -- reused rather than
reimplemented, so a package installed into a pip ``--target`` directory that
was added to sys.path resolves through the same rule its import did, and
Grail's own stdlib keeps winning over a same-named directory on sys.path.

Only the no-``__file__`` case falls back to a path scan: a module Grail
implements natively in Smalltalk (``json``, ``os``, ...) has no file behind it,
so there is nothing for the loader to have recorded.  ``_anchor_dir`` then
probes ``importlib._search_roots()``, which mirrors the resolver's root list.

NOT IMPLEMENTED: zip/egg resources (Grail has no zipimport), and the
zero-argument ``files()`` that infers the caller's package from its globals --
Grail does not represent a module body as a Python frame, so the caller cannot
be identified reliably.  Both raise rather than guessing.
"""

import os as _os

# ``from . import abc`` binds the submodule as an attribute of this package, so
# ``importlib.resources.abc`` resolves without a second import -- which is what
# CPython's own __init__ does and what ``dir(importlib.resources)`` shows.
from . import abc
from .abc import ResourceReader, Traversable, TraversableResources

__all__ = [
    'Package', 'Anchor', 'ResourceReader', 'as_file', 'files', 'abc',
    'contents', 'is_resource', 'open_binary', 'open_text', 'path',
    'read_binary', 'read_text',
]

# CPython spells these as typing aliases (``Union[str, ModuleType]``).  They are
# documentation, not machinery -- nothing here dispatches on them -- so they are
# built defensively: a Grail session missing either module still gets a working
# importlib.resources rather than an import-time failure over a type alias.
try:  # pragma: no cover - alias plumbing only
    from types import ModuleType as _ModuleType
    from typing import Union as _Union

    Package = _Union[str, _ModuleType]
except Exception:  # pragma: no cover
    Package = str
Anchor = Package


class _FsPath(Traversable):
    """A ``Traversable`` over a real filesystem path.

    CPython's ``files()`` answers a ``pathlib.Path`` for a filesystem-backed
    package; Grail has no ``pathlib``, so this supplies the same surface --
    ``name``, ``is_file``, ``is_dir``, ``iterdir``, ``joinpath``, ``/``,
    ``open``, ``read_text``, ``read_bytes``, and ``str()`` giving the path.
    """

    def __init__(self, path):
        self._path = str(path)

    @property
    def name(self):
        # Trailing separators would otherwise make the name empty: the
        # directory a package resolves to is built by joining, and a caller
        # may hand in a path that ends in '/'.
        stripped = self._path.rstrip('/')
        base = _os.path.basename(stripped)
        return base if base else self._path

    def is_file(self):
        return _os.path.isfile(self._path)

    def is_dir(self):
        return _os.path.isdir(self._path)

    def iterdir(self):
        """Yield a ``_FsPath`` per entry, sorted.

        CPython's ``Path.iterdir`` is in directory order, i.e. unspecified;
        sorting is a superset of that contract and makes a Grail test that
        prints the listing reproducible across platforms.
        """
        for entry in sorted(_os.listdir(self._path)):
            yield _FsPath(_os.path.join(self._path, entry))

    def joinpath(self, *descendants):
        result = self._path
        for descendant in descendants:
            for part in str(descendant).split('/'):
                if part:
                    result = _os.path.join(result, part)
        return _FsPath(result)

    def __truediv__(self, child):
        return self.joinpath(child)

    def open(self, mode='r', *args, **kwargs):
        """Open the file.  ``encoding``/``errors`` are meaningless in binary
        mode -- CPython raises ValueError for that combination and so does
        ``open`` here, so they are dropped rather than forwarded, which is what
        ``Traversable.read_bytes`` relies on."""
        if 'b' in mode:
            kwargs.pop('encoding', None)
            kwargs.pop('errors', None)
            kwargs.pop('newline', None)
        elif kwargs.get('encoding', 'x') is None:
            # ``read_text()`` with no encoding passes None; let open() pick its
            # own default rather than forwarding an explicit None.
            kwargs.pop('encoding')
        return open(self._path, mode, *args, **kwargs)

    def __fspath__(self):
        return self._path

    def __str__(self):
        return self._path

    def __repr__(self):
        return '%s(%r)' % (type(self).__name__, self._path)

    def __eq__(self, other):
        if isinstance(other, _FsPath):
            return self._path == other._path
        return NotImplemented

    def __ne__(self, other):
        result = self.__eq__(other)
        if result is NotImplemented:
            return result
        return not result

    def __hash__(self):
        return hash(self._path)


def _resolve_anchor(anchor):
    """The module object an anchor names.  A str is imported; a module is
    taken as-is (CPython accepts both, and certifi passes a str)."""
    if anchor is None:
        raise TypeError(
            'files() requires an anchor: Grail cannot infer the calling '
            'package, because a module body is not a Python frame here')
    if isinstance(anchor, str):
        import importlib

        return importlib.import_module(anchor)
    return anchor


def _anchor_dir(anchor):
    """The directory whose files are ``anchor``'s resources."""
    module = _resolve_anchor(anchor)
    search = getattr(module, '__path__', None)
    if search:
        # A package: its resources live in the directory holding __init__.py.
        # A namespace package has several portions; CPython's files() uses the
        # first, and so does this.
        for portion in search:
            return str(portion)
    origin = getattr(module, '__file__', None)
    if origin is not None:
        # A plain module: its resources are its siblings, as in CPython.
        return _os.path.dirname(_os.path.abspath(str(origin)))
    name = getattr(module, '__name__', None)
    found = _scan_search_roots(name) if name else None
    if found is not None:
        return found
    raise TypeError(
        '%r has no filesystem location, so it has no resources' % (name or module,))


def _scan_search_roots(name):
    """Last resort for a module with no ``__file__`` -- a Smalltalk-native one.

    Probes the same roots, in the same order, that
    ``importlib >> ___moduleNameToPath___:`` searches, so a package that exists
    on disk but is served natively still resolves to the right directory.
    """
    import importlib

    sub = _os.path.join(*name.split('.'))
    for root in importlib._search_roots():
        candidate = _os.path.join(root, sub)
        if _os.path.isdir(candidate):
            return candidate
    return None


def files(anchor=None):
    """The ``Traversable`` root of ``anchor``'s resources.

    ``anchor`` is a package name, a module name, or the module object itself.
    """
    return _FsPath(_anchor_dir(anchor))


class _AsFileContext:
    """The context manager ``as_file`` answers.

    Written as a class rather than a ``@contextlib.contextmanager`` generator
    because certifi drives it by hand -- it calls ``__enter__()`` once, stores
    the manager in a global, and registers ``__exit__`` with atexit -- so the
    object has to survive between the two calls with no ``with`` statement
    around it.
    """

    def __init__(self, traversable):
        self._traversable = traversable
        self._tempdir = None

    def __enter__(self):
        fspath = getattr(self._traversable, '__fspath__', None)
        if fspath is not None:
            local = fspath()
            if _os.path.exists(local):
                return local
        if isinstance(self._traversable, str):
            return self._traversable
        # A Traversable with no filesystem behind it: materialise a copy, which
        # is what CPython does for a zip member.
        import tempfile

        self._tempdir = tempfile.mkdtemp()
        target = _os.path.join(self._tempdir, self._traversable.name)
        with open(target, 'wb') as out:
            out.write(self._traversable.read_bytes())
        return target

    def __exit__(self, *exc_info):
        if self._tempdir is not None:
            import shutil

            shutil.rmtree(self._tempdir, ignore_errors=True)
            self._tempdir = None
        return False


def as_file(path):
    """A context manager yielding a real filesystem path for ``path``.

    For a file that already exists on disk -- every case Grail can produce --
    the path is yielded unchanged and ``__exit__`` is a no-op, matching
    CPython.
    """
    return _AsFileContext(path)


# --- the pre-3.11 functional API -------------------------------------------
# Deprecated in CPython but still present and still called: certifi's own
# pre-3.11 branch uses path()/read_text(), and plenty of packages that support
# older Pythons never moved off them.  Each is defined in terms of files(), the
# way CPython 3.12+ redefined them.

def _resource(package, resource):
    traversable = files(package).joinpath(str(resource))
    return traversable


def open_binary(package, resource):
    """Return a file-like object opened for binary reading of the resource."""
    return _resource(package, resource).open('rb')


def read_binary(package, resource):
    """Return the binary contents of the resource."""
    return _resource(package, resource).read_bytes()


def open_text(package, resource, encoding='utf-8', errors='strict'):
    """Return a file-like object opened for text reading of the resource."""
    return _resource(package, resource).open(
        'r', encoding=encoding, errors=errors)


def read_text(package, resource, encoding='utf-8', errors='strict'):
    """Return the decoded string of the resource."""
    with open_text(package, resource, encoding, errors) as fp:
        return fp.read()


def contents(package):
    """Return an iterable over the named resources within the package."""
    return [item.name for item in files(package).iterdir()]


def is_resource(package, name):
    """True if ``name`` is a resource inside ``package``.

    Directories are not resources -- that is the whole distinction the
    function exists to draw.
    """
    return files(package).joinpath(str(name)).is_file()


def path(package, resource):
    """A context manager yielding a filesystem path for the resource."""
    return as_file(_resource(package, resource))
