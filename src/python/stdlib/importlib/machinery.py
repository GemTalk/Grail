# Minimal `importlib.machinery` Python facade for Grail.  Re-exports the few
# names callers actually reach for from the parent ``importlib`` package, which
# is itself a stub over Grail's Smalltalk loader.
#
# ModuleSpec is deliberately the SAME object the parent package exposes -- the
# one Smalltalk ModuleSpec class (src/smalltalk/Python/ModuleSpec.gs).  The
# parent's own comment already promises this: "``from importlib.machinery import
# ModuleSpec``, ``spec_from_file_location`` and ``mod.__spec__`` therefore all
# answer the same type."  Defining a second class here would break exactly the
# isinstance() that comment is about.

from . import ModuleSpec, _ModuleSpec, _Loader

# Grail loads .py source and nothing else: there are no .pyc files and no C
# extension modules, so these two lists are EMPTY rather than absent.  That is
# what lets pydoc's ``filename.endswith(tuple(BYTECODE_SUFFIXES))`` and its
# EXTENSION_SUFFIXES twin answer False and fall through to the source loader,
# instead of raising AttributeError -- the branches those guard reach
# SourcelessFileLoader and ExtensionFileLoader, which Grail has no use for and
# this module therefore does not pretend to provide.
SOURCE_SUFFIXES = ['.py']
BYTECODE_SUFFIXES = []
EXTENSION_SUFFIXES = []


def all_suffixes():
    """Every module suffix this implementation recognises."""
    return SOURCE_SUFFIXES + BYTECODE_SUFFIXES + EXTENSION_SUFFIXES


class PathFinder:
    """Meta path finder for sys.path and package __path__ attributes.

    Grail's native resolver plays this role inside the import system (it is
    not an entry on ``sys.meta_path``); this class is the Python-visible
    surface callers ask directly -- pytest's ``PathFinder.find_spec(name,
    [dir])``.  It searches only the entries it is given (or ``sys.path``),
    never Grail's own roots, which is what CPython's PathFinder does too."""

    @staticmethod
    def invalidate_caches():
        """Nothing is cached."""

    @classmethod
    def find_spec(cls, fullname, path=None, target=None):
        import os
        import sys
        if path is None:
            path = sys.path
        tail = fullname.rpartition('.')[2]
        namespace = []
        for entry in path:
            entry = os.fspath(entry) if entry else os.getcwd()
            base = os.path.join(entry, tail)
            if os.path.isdir(base):
                init = os.path.join(base, '__init__.py')
                if os.path.isfile(init):
                    # Grail's ModuleSpec is positional: name, loader,
                    # origin, submodule_search_locations.
                    return ModuleSpec(fullname, SourceFileLoader(fullname, init),
                                      init, [base])
                namespace.append(base)
                continue
            py = base + '.py'
            if os.path.isfile(py):
                return ModuleSpec(fullname, SourceFileLoader(fullname, py), py)
        if namespace:
            return ModuleSpec(fullname, None, None, namespace)
        return None


class SourceFileLoader:
    """Loader for a .py file.  Grail's own importer compiles modules itself, so
    this carries the file's identity -- name, path, source -- for code that
    inspects a spec's loader."""

    def __init__(self, fullname, path):
        self.name = fullname
        self.path = path

    def get_filename(self, name=None):
        return self.path

    def get_data(self, path):
        with open(path, 'rb') as fh:
            return fh.read()

    def get_source(self, fullname):
        return self.get_data(self.path).decode('utf-8')

    def is_package(self, fullname):
        import os
        return os.path.basename(self.path) == '__init__.py'


class NamespaceLoader:
    """The loader of a namespace package (no __init__.py)."""

    def __init__(self, name, path, path_finder):
        self.name = name
        self._path = path
        self._path_finder = path_finder

    def is_package(self, fullname):
        return True

    def get_source(self, fullname):
        return ''

    def create_module(self, spec):
        return None

    def exec_module(self, module):
        pass


__all__ = ['ModuleSpec', 'SOURCE_SUFFIXES', 'BYTECODE_SUFFIXES',
           'EXTENSION_SUFFIXES', 'all_suffixes', 'PathFinder',
           'SourceFileLoader', 'NamespaceLoader']
