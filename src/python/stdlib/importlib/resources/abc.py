"""``importlib.resources.abc`` -- the resource-access protocol classes.

Grail's own ``importlib.resources`` implements ``Traversable`` over the real
filesystem (see the sibling ``__init__.py``), and this module is what makes
``files()`` well-typed: the object it hands back IS a ``Traversable``, so code
that documents the contract with an isinstance check -- or reads the ABCs to
learn the method names -- sees the same shape it sees on CPython.

WHY THESE CLASSES LIVE HERE AND NOT IN ``importlib.abc``: CPython moved them.
``Traversable`` / ``TraversableResources`` were exposed from ``importlib.abc``
in 3.11, deprecated there in 3.12, and REMOVED in 3.14 -- which is the level
Grail reports through ``sys.version_info``.  On the CPython 3.14 this tree is
measured against, ``hasattr(importlib.abc, 'Traversable')`` is False.  Adding
them to a Grail ``importlib.abc`` would therefore be a deviation dressed up as
compatibility, so they are only here.

CPython 3.14 spells ``Traversable`` as a runtime-checkable ``Protocol``, so
``isinstance(pathlib.Path(...), Traversable)`` is True there structurally.
Grail gets the same answer by ordinary inheritance -- ``_FsPath`` subclasses
this -- which keeps the isinstance check meaningful in both interpreters
without depending on Grail's Protocol support.
"""


class TraversalError(Exception):
    """Raised when a traversal leaves the anchor's directory."""


class Traversable:
    """An object with a subset of ``pathlib.Path`` methods suitable for
    traversing directories and opening files.

    Concrete subclasses must supply ``iterdir``, ``is_dir``, ``is_file``,
    ``joinpath``, ``open`` and the ``name`` property; the rest is derived.
    """

    def iterdir(self):
        """Yield Traversable objects in self (self must be a directory)."""
        raise NotImplementedError

    def read_bytes(self):
        """Read contents of self as bytes."""
        with self.open('rb') as strm:
            return strm.read()

    def read_text(self, encoding=None):
        """Read contents of self as text."""
        with self.open('r', encoding=encoding) as strm:
            return strm.read()

    def is_dir(self):
        """Return True if self is a directory."""
        raise NotImplementedError

    def is_file(self):
        """Return True if self is a file."""
        raise NotImplementedError

    def joinpath(self, *descendants):
        """Return Traversable resolved with any descendants applied.

        Each descendant should be a path segment relative to self and
        each may contain multiple levels separated by ``posixpath.sep``.
        """
        raise NotImplementedError

    def __truediv__(self, child):
        """Return Traversable child in self.  ``files(pkg) / 'name'``."""
        return self.joinpath(child)

    def open(self, mode='r', *args, **kwargs):
        """mode may be 'r' or 'rb' to open as text or binary."""
        raise NotImplementedError

    @property
    def name(self):
        """The base name of this object without any parent references."""
        raise NotImplementedError


class ResourceReader:
    """Abstract base class for loaders to provide resource reading support."""

    def open_resource(self, resource):
        """Return an opened, file-like object for binary reading."""
        raise FileNotFoundError(resource)

    def resource_path(self, resource):
        """Return the file system path to the specified resource."""
        raise FileNotFoundError(resource)

    def is_resource(self, path):
        """Return True if the named path is a resource of this package."""
        raise FileNotFoundError(path)

    def contents(self):
        """Return an iterable of entries in the package."""
        raise FileNotFoundError()


class TraversableResources(ResourceReader):
    """The ``ResourceReader`` a ``Traversable``-aware loader implements: it
    answers one ``files()`` root and every legacy operation is derived from
    it."""

    def files(self):
        """Return a Traversable object for the loaded package."""
        raise NotImplementedError

    def open_resource(self, resource):
        return self.files().joinpath(resource).open('rb')

    def resource_path(self, resource):
        raise FileNotFoundError(resource)

    def is_resource(self, path):
        return self.files().joinpath(path).is_file()

    def contents(self):
        return [item.name for item in self.files().iterdir()]
