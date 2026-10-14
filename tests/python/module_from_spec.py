"""importlib.util.module_from_spec, and exec_module on a file spec's loader.

The PEP 451 way to load a file as a module by hand:

    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)

sqlalchemy's test bootstrap loads its pytest plugin exactly so, and Grail had
neither module_from_spec nor an exec_module on the loader a file spec carries:
the conftest failed to import and none of sqlalchemy's tests were collected.

Every expectation was measured against CPython 3.14.
"""

import importlib.util
import os
import shutil
import sys
import tempfile

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:200])


_DIR = tempfile.mkdtemp(prefix='grail_mfs_')
_PATH = os.path.join(_DIR, 'grail_mfs_plugin.py')
with open(_PATH, 'w') as _f:
    _f.write('VALUE = 41 + 1\n'
             'def where():\n'
             '    return __name__, __file__ == SPEC_FILE\n'
             'SPEC_FILE = __spec__.origin\n')

spec = importlib.util.spec_from_file_location('grail_mfs_plugin', _PATH)
mod = importlib.util.module_from_spec(spec)

check('the_module_carries_the_spec',
      (mod.__name__, mod.__spec__ is spec, mod.__loader__ is spec.loader,
       mod.__file__ == _PATH, mod.__package__),
      ('grail_mfs_plugin', True, True, True, ''))
check('it_is_not_executed_or_registered',
      (hasattr(mod, 'VALUE'), 'grail_mfs_plugin' in sys.modules), (False, False))

spec.loader.exec_module(mod)
check('exec_module_runs_the_file_in_it', (mod.VALUE, mod.where()),
      (42, ('grail_mfs_plugin', True)))


class _Made:
    def create_module(self, spec):
        import types
        made = types.ModuleType('made_by_the_loader')
        made.MARK = 'created'
        return made

    def exec_module(self, module):
        module.RAN = True


class _ExecOnly:
    def exec_module(self, module):
        pass


def _from(loader):
    s = importlib.util.spec_from_loader('grail_mfs_custom', loader)
    try:
        m = importlib.util.module_from_spec(s)
    except ImportError as exc:
        return str(exc)
    return (m.__name__, getattr(m, 'MARK', None), m.__spec__ is s)


check('a_loaders_create_module_makes_the_module', _from(_Made()),
      ('made_by_the_loader', 'created', True))
check('exec_module_without_create_module_is_refused', _from(_ExecOnly()),
      'loaders that define exec_module() must also define create_module()')

shutil.rmtree(_DIR, ignore_errors=True)

SUMMARY = '%d checks, %d disagreeing' % (len(RESULTS), sum(1 for v in RESULTS.values() if v is not True))

if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
