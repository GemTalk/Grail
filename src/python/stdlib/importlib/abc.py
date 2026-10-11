"""``importlib.abc`` -- the abstract base classes of the import protocol.

CPython's module subclasses its frozen bootstrap classes; Grail's importer is
Smalltalk, so these are the ABCs alone, with the concrete defaults CPython's
versions carry.  What matters to callers is that a finder or loader written
against them -- pytest's AssertionRewritingHook subclasses MetaPathFinder and
Loader -- can be defined and installed on ``sys.meta_path``, which Grail
consults (``importlib >> ___loadFromSpec___:name:``).

``Traversable`` and ``TraversableResources`` are deliberately absent: CPython
3.14 removed them from here (see ``importlib.resources.abc``).
"""

import abc


__all__ = [
    'Loader', 'MetaPathFinder', 'PathEntryFinder',
    'ResourceLoader', 'InspectLoader', 'ExecutionLoader',
    'FileLoader', 'SourceLoader',
]


class Loader(metaclass=abc.ABCMeta):
    """Abstract base class for import loaders."""

    def create_module(self, spec):
        """Return a module to initialize, or None for the default module."""
        return None

    # exec_module() is deliberately not defined here: the import machinery
    # tests for it with hasattr to choose between it and load_module().

    def load_module(self, fullname):
        """Deprecated in favour of exec_module(); kept for old loaders."""
        if not hasattr(self, 'exec_module'):
            raise ImportError
        raise ImportError('load_module() is not supported by Grail; '
                          'import the module instead')


class MetaPathFinder(metaclass=abc.ABCMeta):
    """Abstract base class for import finders on sys.meta_path."""

    def invalidate_caches(self):
        """An optional method for clearing the finder's cache, if any."""


class PathEntryFinder(metaclass=abc.ABCMeta):
    """Abstract base class for path entry finders used by PathFinder."""

    def invalidate_caches(self):
        """An optional method for clearing the finder's cache, if any."""


class ResourceLoader(Loader):
    """Abstract base class for loaders which can return data from storage."""

    @abc.abstractmethod
    def get_data(self, path):
        raise OSError


class InspectLoader(Loader):
    """Abstract base class for loaders which support inspection of modules."""

    def is_package(self, fullname):
        raise ImportError

    def get_code(self, fullname):
        source = self.get_source(fullname)
        if source is None:
            return None
        return self.source_to_code(source)

    @abc.abstractmethod
    def get_source(self, fullname):
        raise ImportError

    @staticmethod
    def source_to_code(data, path='<string>'):
        return compile(data, path, 'exec', dont_inherit=True)


class ExecutionLoader(InspectLoader):
    """Abstract base class for loaders that wish to support the execution of
    modules as scripts."""

    @abc.abstractmethod
    def get_filename(self, fullname):
        raise ImportError

    def get_code(self, fullname):
        source = self.get_source(fullname)
        if source is None:
            return None
        try:
            path = self.get_filename(fullname)
        except ImportError:
            return self.source_to_code(source)
        return self.source_to_code(source, path)


class FileLoader(ResourceLoader, ExecutionLoader):
    """Abstract base class partially implementing the ResourceLoader and
    ExecutionLoader ABCs."""

    def __init__(self, fullname, path):
        self.name = fullname
        self.path = path

    def get_filename(self, name=None):
        return self.path

    def get_data(self, path):
        with open(path, 'rb') as fh:
            return fh.read()

    def get_source(self, fullname):
        return self.get_data(self.get_filename(fullname)).decode('utf-8')


class SourceLoader(ResourceLoader, ExecutionLoader):
    """Abstract base class for loading source code (and optionally any
    corresponding bytecode).  Grail keeps no bytecode, so only the source
    half applies."""

    def path_mtime(self, path):
        raise OSError

    def path_stats(self, path):
        return {'mtime': self.path_mtime(path)}

    def set_data(self, path, data):
        """Optional method which writes data to a file path; a no-op."""

    def get_source(self, fullname):
        return self.get_data(self.get_filename(fullname)).decode('utf-8')
