"""PEP 420: a directory with no __init__.py is still a package.

Grail's resolver checked ``name.py`` then ``name/__init__.py`` and gave up, so
a directory that was only a directory was not importable at all.  CPython has
allowed it since 3.3, and the vendored test tree relies on it --
test/test_warnings/data has three modules and no __init__.py, matching CPython.

Two properties distinguish a namespace package from a regular one, and both are
checked below because getting either wrong still looks like it works:

  * __file__ is None.  There is no file; code that asks "is this a namespace
    package?" tests exactly this.
  * __path__ holds EVERY matching directory across the search path, not one.
    That is the point of the PEP -- one package assembled from several
    distributions -- and an implementation that stops at the first match passes
    every single-directory test while failing the feature's reason to exist.

The ordering rule matters too: a regular module or package anywhere on the path
beats a namespace package.  The scan records directories as it goes, but the
moment it finds real source it stops and those directories are discarded.

Every expectation below was checked against CPython 3.14.
"""

import os
import shutil
import sys
import tempfile

RESULTS = {}


def check(name, fn, expected):
    try:
        RESULTS[name] = (fn() == expected)
    except BaseException as exc:
        RESULTS[name] = 'raised %s: %s' % (type(exc).__name__, exc)


def check_raises(name, fn, exc_type):
    try:
        fn()
        RESULTS[name] = 'did not raise'
    except BaseException as exc:
        RESULTS[name] = isinstance(exc, exc_type)


def write(path, text=''):
    d = os.path.dirname(path)
    if not os.path.isdir(d):
        os.makedirs(d)
    f = open(path, 'w')
    try:
        f.write(text)
    finally:
        f.close()


# Two search roots, so the multi-portion case is a real one rather than a
# single directory dressed up as several.
ROOT = tempfile.mkdtemp(prefix='grail_pep420_')
ROOT_A = os.path.join(ROOT, 'a')
ROOT_B = os.path.join(ROOT, 'b')

# nspkg: a namespace package present in BOTH roots, contributing a different
# module to each -- the shape PEP 420 exists for.
write(os.path.join(ROOT_A, 'nspkg', 'from_a.py'), 'WHERE = "a"\n')
write(os.path.join(ROOT_B, 'nspkg', 'from_b.py'), 'WHERE = "b"\n')

# deep: namespace packages nested inside one another, no __init__.py anywhere.
write(os.path.join(ROOT_A, 'deep', 'inner', 'leaf.py'), 'VALUE = 42\n')

# regpkg: a REGULAR package in root B, and a bare directory of the same name in
# root A which is searched FIRST.  The regular one must win.
write(os.path.join(ROOT_A, 'regpkg', 'decoy.py'), 'DECOY = True\n')
write(os.path.join(ROOT_B, 'regpkg', '__init__.py'), 'KIND = "regular"\n')

# modfile: a plain module in root B, and a same-named directory in root A.
# The module must win over the directory.
write(os.path.join(ROOT_A, 'modfile', 'decoy.py'), 'DECOY = True\n')
write(os.path.join(ROOT_B, 'modfile.py'), 'KIND = "module"\n')

sys.path.insert(0, ROOT_B)
sys.path.insert(0, ROOT_A)

# The roots are freshly-made temp directories, so anything cached under these
# names belongs to an EARLIER run of this fixture and points at a directory
# that no longer exists.  The SUnit case reloads the module once per test
# method, which makes that a certainty rather than a worry.
_OURS = ('nspkg', 'deep', 'regpkg', 'modfile')


def _purge():
    for _n in list(sys.modules):
        if _n in _OURS or any(_n.startswith(_o + '.') for _o in _OURS):
            del sys.modules[_n]


_purge()


# ------------------------------------------------ importing one

import nspkg.from_a                                      # noqa: E402

check('submodule_imports', lambda: nspkg.from_a.WHERE, 'a')
check('package_is_in_sys_modules', lambda: 'nspkg' in sys.modules, True)
check('package_has_path', lambda: getattr(nspkg, '__path__', None) is not None,
      True)
check('package_name', lambda: nspkg.__name__, 'nspkg')

# The two properties that tell a namespace package from a regular one.
check('file_is_none', lambda: nspkg.__file__ is None, True)
check('path_holds_every_portion', lambda: len(list(nspkg.__path__)), 2)
check('path_holds_root_a',
      lambda: os.path.join(ROOT_A, 'nspkg') in list(nspkg.__path__), True)
check('path_holds_root_b',
      lambda: os.path.join(ROOT_B, 'nspkg') in list(nspkg.__path__), True)


# ------------------------------------------- a package spanning two roots

import nspkg.from_b                                      # noqa: E402

check('submodule_from_second_portion', lambda: nspkg.from_b.WHERE, 'b')
check('both_portions_coexist',
      lambda: (nspkg.from_a.WHERE, nspkg.from_b.WHERE), ('a', 'b'))


# ------------------------------------------------------ nesting

from deep.inner import leaf                              # noqa: E402

check('nested_namespace_leaf', lambda: leaf.VALUE, 42)
check('nested_intermediate_is_package',
      lambda: getattr(sys.modules['deep.inner'], '__path__', None) is not None,
      True)
check('nested_intermediate_file_is_none',
      lambda: sys.modules['deep.inner'].__file__ is None, True)


# --------------------------------------- a real package always wins

import regpkg                                            # noqa: E402
import modfile                                           # noqa: E402

# root A is searched first and holds a bare regpkg/ directory, but root B has
# the real one; the scan discards the portion when it finds source.
check('regular_package_beats_directory', lambda: regpkg.KIND, 'regular')
check('regular_package_file_is_not_none',
      lambda: regpkg.__file__ is None, False)
check('module_beats_directory', lambda: modfile.KIND, 'module')
# getattr-with-default rather than hasattr: Grail's module base answers
# __path__ as a None-as-absent accessor, so hasattr is True for every module
# and would test that convention instead of this one.  ``is None'' is the
# portable spelling and means the same thing in both.
check('module_has_no_path',
      lambda: getattr(modfile, '__path__', None) is None, True)


# ------------------------------------------------- still-missing modules

# A name matching no file AND no directory must still fail, and fail the same
# way -- the point is to add a case, not to make every import succeed.
check_raises('absent_module_still_raises',
             lambda: __import__('grail_no_such_module_anywhere'),
             ImportError)
check_raises('absent_submodule_still_raises',
             lambda: __import__('nspkg.no_such_submodule'),
             ImportError)


def _cleanup():
    for r in (ROOT_A, ROOT_B):
        if r in sys.path:
            sys.path.remove(r)
    _purge()
    shutil.rmtree(ROOT, True)


_cleanup()


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
