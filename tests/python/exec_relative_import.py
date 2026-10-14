"""A relative import in exec'd source resolves against the exec's globals.

CPython resolves ``from .. import util'' at run time, from the importing
code's globals: __package__, else __spec__.parent, else __name__.  Grail
resolved it at compile time against the enclosing module, and exec'd source
has none, so the target came out '' -- ``ValueError: Empty module name''.
pytest execs every test module whose asserts it rewrites, so a test
package's relative imports failed (soupsieve, python-multipart).

The run-time path was broken too: __import__ with a level, and
importlib.import_module with a relative name, resolved through a method that
answered the importlib instance -- and before that died uncatchably.

Every expectation was measured against CPython 3.14.
"""

import importlib
import importlib.abc
import importlib.util
import os
import sys
import tempfile
import types

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:200])


PKG = 'grail_exec_rel_pkg'
_root = tempfile.mkdtemp()
os.makedirs(os.path.join(_root, PKG, 'sub'))
for _rel, _text in [('__init__.py', ''), ('util.py', 'X = 1\n'),
                    ('sub/__init__.py', ''), ('sub/leaf.py', 'Y = 2\n'),
                    ('sub/mod.py', 'from .. import util\nfrom .leaf import Y\nZ = util.X + Y\n')]:
    with open(os.path.join(_root, PKG, _rel), 'w') as _fh:
        _fh.write(_text)
sys.path.insert(0, _root)

SUB = PKG + '.sub'


def _run(source, **extra):
    g = {'__name__': SUB + '.mod', '__package__': SUB}
    g.update(extra)
    try:
        exec(source, g)
    except Exception as exc:
        return '%s: %s' % (type(exc).__name__, exc)
    return g.get('out')


check('parent_package_and_a_module_in_it',
      _run('from .. import util\nfrom ..util import X\nout = (util.__name__, X)'),
      (PKG + '.util', 1))
check('own_package_and_a_module_in_it',
      _run('from . import leaf\nfrom .leaf import Y\nout = (leaf.__name__, Y)'),
      (SUB + '.leaf', 2))
check('inside_a_function_and_a_class_body',
      _run('def f():\n    from ..util import X\n    return X\n'
           'class C:\n    from .leaf import Y\n'
           'out = (f(), C.Y)'),
      (1, 2))
check('package_from_spec_parent',
      _run('from ..util import X\nout = X', __package__=None,
           __spec__=types.SimpleNamespace(parent=SUB)),
      1)
check('no_parent_package',
      _run('from . import leaf', __name__='toplevel', __package__=''),
      'ImportError: attempted relative import with no known parent package')
check('beyond_the_top_level_package',
      _run('from ... import x'),
      'ImportError: attempted relative import beyond top-level package')
check('dunder_import_with_a_level',
      [__import__('', {'__package__': SUB}, None, ('util',), 2).__name__,
       __import__('leaf', {'__package__': SUB}, None, ('Y',), 1).__name__],
      [PKG, SUB + '.leaf'])
check('import_module_relative',
      [importlib.import_module('..util', SUB).__name__,
       importlib.import_module('.leaf', SUB).__name__],
      [PKG + '.util', SUB + '.leaf'])


class _ExecLoader(importlib.abc.MetaPathFinder, importlib.abc.Loader):
    """pytest's assertion rewriter's shape: find a module, then exec its
    compiled source into the module the import system made."""

    def find_spec(self, name, path=None, target=None):
        if name != SUB + '.mod':
            return None
        return importlib.util.spec_from_file_location(
            name, os.path.join(_root, PKG, 'sub', 'mod.py'), loader=self)

    def create_module(self, spec):
        return None

    def exec_module(self, module):
        with open(module.__spec__.origin) as fh:
            source = fh.read()
        exec(compile(source, module.__spec__.origin, 'exec'), module.__dict__)


_loader = _ExecLoader()
sys.meta_path.insert(0, _loader)
try:
    check('a_meta_path_loader_execing_a_package_module',
          importlib.import_module(SUB + '.mod').Z, 3)
finally:
    sys.meta_path.remove(_loader)

SUMMARY = '%d checks, %d disagreeing' % (len(RESULTS), sum(1 for v in RESULTS.values() if v is not True))

if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
