# Regression fixture: a submodule is found through its parent's __path__.
#
# CPython looks for ``pkg.sub'' only in ``pkg.__path__''.  Grail joined the
# dotted name onto its search roots instead, which finds the same file only when
# the parent lives in the directory its name spells.  These are the shapes where
# it does not:
#
#  * a meta-path finder that registers one package under another name, as
#    setuptools' _distutils_hack does (``distutils'' is setuptools._distutils).
#    Its submodules, its relative imports, and namespace directories under it
#    all live in the real package's directory;
#  * a package that appends a directory to its own __path__ (pkgutil style);
#  * a package that replaces its __path__ outright.
#
# Plus two controls that already worked: an ordinary submodule, and a missing
# one raising ModuleNotFoundError with the full name.
# Expected values are what CPython 3.14 answers.

import importlib
import importlib.abc
import importlib.util
import os
import sys
import tempfile

RESULTS = {}

root = tempfile.mkdtemp(prefix='grail_spp_')
elsewhere = tempfile.mkdtemp(prefix='grail_spp_more_')


def write(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w') as fh:
        fh.write(text)


write(os.path.join(root, 'spp_real', '__init__.py'), 'X = 1\n')
write(os.path.join(root, 'spp_real', 'core.py'),
      'from .helper import H\nCORE = H + 1\n')
write(os.path.join(root, 'spp_real', 'helper.py'), 'H = 10\n')
write(os.path.join(root, 'spp_real', 'ns', 'deeper', 'leaf.py'), 'LEAF = 3\n')

write(os.path.join(root, 'spp_ext', '__init__.py'),
      '__path__.append(%r)\n' % os.path.join(elsewhere, 'spp_ext_more'))
write(os.path.join(elsewhere, 'spp_ext_more', 'addon.py'), 'ADDON = 4\n')

write(os.path.join(root, 'spp_moved', '__init__.py'),
      '__path__ = [%r]\n' % os.path.join(elsewhere, 'spp_moved_body'))
write(os.path.join(elsewhere, 'spp_moved_body', 'sub.py'), 'SUB = 5\n')

write(os.path.join(root, 'spp_plain', '__init__.py'), '')
write(os.path.join(root, 'spp_plain', 'mod.py'), 'MOD = 6\n')

sys.path.insert(0, root)
importlib.invalidate_caches()

real = importlib.import_module('spp_real')
real_dir = os.path.join(root, 'spp_real')


class AliasLoader(importlib.abc.Loader):
    """setuptools' DistutilsLoader: the module IS the real package."""

    def create_module(self, spec):
        real.__name__ = 'spp_alias'
        return real

    def exec_module(self, module):
        pass


class AliasFinder:
    def find_spec(self, fullname, path, target=None):
        if fullname != 'spp_alias':
            return None
        return importlib.util.spec_from_loader(
            'spp_alias', AliasLoader(), origin=real.__file__)


finder = AliasFinder()
sys.meta_path.insert(0, finder)
try:
    alias = importlib.import_module('spp_alias')
finally:
    sys.meta_path.remove(finder)

RESULTS['alias_is_the_real_package'] = (
    alias is real and sys.modules['spp_alias'] is real)

try:
    core = importlib.import_module('spp_alias.core')
    RESULTS['alias_submodule'] = (
        core.__name__ == 'spp_alias.core'
        and core.__file__ == os.path.join(real_dir, 'core.py'))
    RESULTS['alias_relative_import'] = (
        core.CORE == 11 and 'spp_alias.helper' in sys.modules)
except Exception:
    RESULTS['alias_submodule'] = False
    RESULTS['alias_relative_import'] = False

try:
    leaf = importlib.import_module('spp_alias.ns.deeper.leaf')
    RESULTS['alias_namespace_levels'] = (
        leaf.LEAF == 3
        and list(sys.modules['spp_alias.ns'].__path__)
        == [os.path.join(real_dir, 'ns')])
except Exception:
    RESULTS['alias_namespace_levels'] = False

try:
    import spp_ext.addon
    RESULTS['appended_path_entry'] = spp_ext.addon.ADDON == 4
except Exception:
    RESULTS['appended_path_entry'] = False

try:
    import spp_moved.sub
    RESULTS['replaced_path'] = spp_moved.sub.SUB == 5
except Exception:
    RESULTS['replaced_path'] = False

import spp_plain.mod
RESULTS['ordinary_submodule'] = spp_plain.mod.MOD == 6

try:
    import spp_plain.absent
    RESULTS['missing_submodule'] = False
except ModuleNotFoundError as e:
    RESULTS['missing_submodule'] = e.name == 'spp_plain.absent'

if __name__ == '__main__':
    for _name, _ok in RESULTS.items():
        print('%-4s %s' % ('OK' if _ok is True else 'FAIL', _name))
