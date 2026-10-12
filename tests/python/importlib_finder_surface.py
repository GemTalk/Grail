# Regression fixture for G5 (docs/Package_Census.md): the importlib surface
# that finders and loaders are written against.
#
#  * importlib.abc exists, and a class can subclass MetaPathFinder and Loader
#    together, as pytest's AssertionRewritingHook does.
#  * importlib.machinery.PathFinder.find_spec(name, [dir]) finds a module, a
#    package and a namespace directory in the entries it is given, and answers
#    None for a missing name.
#  * importlib.util.spec_from_file_location KEEPS the caller's loader.  It used
#    to replace it with Grail's own, so a meta-path finder that answered
#    ``spec_from_file_location(name, fn, loader=self)'' never had its
#    exec_module called.
#  * End to end: such a finder on sys.meta_path supplies a module.
#  * MAGIC_NUMBER, importlib.resources.readers.FileReader and
#    importlib.machinery.NamespaceLoader exist with CPython's shapes.
# Expected values are what CPython 3.14 answers.

import importlib
import importlib.abc
import importlib.machinery
import importlib.resources.readers
import importlib.util
import os
import pathlib
import sys
import tempfile

RESULTS = {}

RESULTS['abc_names'] = all(hasattr(importlib.abc, n) for n in (
    'Loader', 'MetaPathFinder', 'PathEntryFinder', 'ResourceLoader',
    'InspectLoader', 'ExecutionLoader', 'FileLoader', 'SourceLoader'))


class Hook(importlib.abc.MetaPathFinder, importlib.abc.Loader):
    pass


hook = Hook()
RESULTS['abc_subclass_defaults'] = (
    isinstance(hook, importlib.abc.MetaPathFinder)
    and isinstance(hook, importlib.abc.Loader)
    and hook.create_module(None) is None
    and hook.invalidate_caches() is None)

root = tempfile.mkdtemp(prefix='grail_g5_')
with open(os.path.join(root, 'g5_plain.py'), 'w') as fh:
    fh.write('X = 1\n')
os.mkdir(os.path.join(root, 'g5_pkg'))
with open(os.path.join(root, 'g5_pkg', '__init__.py'), 'w') as fh:
    fh.write('')
os.mkdir(os.path.join(root, 'g5_ns'))

PF = importlib.machinery.PathFinder
plain = PF.find_spec('g5_plain', [root])
RESULTS['pathfinder_module'] = (
    plain is not None and plain.name == 'g5_plain'
    and plain.origin == os.path.join(root, 'g5_plain.py')
    and plain.submodule_search_locations is None)
pkg = PF.find_spec('g5_pkg', [root])
RESULTS['pathfinder_package'] = (
    pkg is not None
    and pkg.origin == os.path.join(root, 'g5_pkg', '__init__.py')
    and list(pkg.submodule_search_locations) == [os.path.join(root, 'g5_pkg')])
ns = PF.find_spec('g5_ns', [root])
RESULTS['pathfinder_namespace'] = (
    ns is not None
    and list(ns.submodule_search_locations) == [os.path.join(root, 'g5_ns')])
RESULTS['pathfinder_missing'] = PF.find_spec('g5_absent', [root]) is None

spec = importlib.util.spec_from_file_location(
    'g5_plain', os.path.join(root, 'g5_plain.py'), loader=hook)
RESULTS['spec_keeps_loader'] = (
    spec.loader is hook and spec.origin == os.path.join(root, 'g5_plain.py'))


class Supplier(importlib.abc.MetaPathFinder, importlib.abc.Loader):
    """Answers one module name with a spec whose loader is itself."""

    def __init__(self):
        self.executed = []

    def find_spec(self, name, path=None, target=None):
        if name != 'g5_supplied':
            return None
        return importlib.util.spec_from_file_location(
            name, os.path.join(root, 'g5_plain.py'), loader=self)

    def exec_module(self, module):
        self.executed.append(module.__name__)
        module.VALUE = 42


supplier = Supplier()
sys.meta_path.insert(0, supplier)
try:
    import g5_supplied
    RESULTS['meta_path_loader_runs'] = (
        g5_supplied.VALUE == 42 and supplier.executed == ['g5_supplied'])
finally:
    sys.meta_path.remove(supplier)

RESULTS['magic_number'] = importlib.util.MAGIC_NUMBER == b'+\x0e\r\n'


class FileLoaderish:
    path = os.path.join(root, 'g5_plain.py')


reader = importlib.resources.readers.FileReader(FileLoaderish())
RESULTS['file_reader'] = (
    reader.files() == pathlib.Path(root)
    and reader.resource_path('g5_plain.py') == os.path.join(root, 'g5_plain.py'))

nsl = importlib.machinery.NamespaceLoader('g5_ns', [os.path.join(root, 'g5_ns')], PF)
RESULTS['namespace_loader'] = nsl.is_package('g5_ns') is True

if __name__ == '__main__':
    for _name, _ok in RESULTS.items():
        print('%-4s %s' % ('OK' if _ok is True else 'FAIL', _name))
