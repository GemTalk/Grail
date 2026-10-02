"""pkgutil.iter_modules and walk_packages list what is there, as CPython's do.

Driven by PythonTests>>PkgutilTestCase>>testIterModulesAndWalkPackages.
Each check answers True when the behaviour matches CPython.

Both were stubs answering an empty iterator, whatever the path: "no
filesystem walk implementation".  So nothing that discovers modules by
listing them found any -- Django's management commands, its database
backends, its migrations loader and its template tag libraries all ask
pkgutil, and Werkzeug's find_modules does too.

The tree below is built in a temporary directory: a module, a package with a
submodule, a directory with no __init__ (a namespace directory, which
CPython's file-finder walk skips), a dotted file name (also skipped), and a
file that is not Python at all.

Run this file under CPython (``python3 tests/python/pkgutil_iter_modules.py'')
to see what it produces -- that is where the expectations come from.
"""

import os
import pkgutil
import sys
import tempfile

ROOT = tempfile.mkdtemp(prefix='pkgutil_fixture_')
PKG = 'zz_pkgutil_fixture_pkg'


def _write(relative, text=''):
    path = os.path.join(ROOT, relative)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w') as f:
        f.write(text)


_write('alpha.py', 'X = 1\n')
_write(PKG + '/__init__.py')
_write(PKG + '/inner.py', 'Y = 2\n')
_write('namespace_dir/loose.py')
_write('dotted.name.py')
_write('README.txt', 'not python\n')


def _listed(path=None, prefix=''):
    return sorted((m.name, m.ispkg) for m in pkgutil.iter_modules(path, prefix))


def iter_modules_lists_modules_and_packages():
    return _listed([ROOT]) == [('alpha', False), (PKG, True)]


def iter_modules_skips_namespace_dirs_dotted_names_and_other_files():
    names = [name for name, _ in _listed([ROOT])]
    return ('namespace_dir' not in names and 'dotted.name' not in names
            and 'README' not in names and 'dotted' not in names)


def iter_modules_applies_the_prefix():
    return _listed([ROOT], 'top.') == [('top.alpha', False), ('top.' + PKG, True)]


def each_result_names_its_directory():
    infos = list(pkgutil.iter_modules([ROOT]))
    return bool(infos) and all(info.module_finder.path == ROOT for info in infos)


def a_name_is_listed_once_across_directories():
    other = tempfile.mkdtemp(prefix='pkgutil_fixture_other_')
    with open(os.path.join(other, 'alpha.py'), 'w') as f:
        f.write('X = 99\n')
    infos = [m for m in pkgutil.iter_modules([ROOT, other]) if m.name == 'alpha']
    return len(infos) == 1 and infos[0].module_finder.path == ROOT


def a_missing_directory_lists_nothing():
    return _listed([os.path.join(ROOT, 'no_such_dir')]) == []


def a_bare_string_path_is_refused():
    try:
        list(pkgutil.iter_modules(ROOT))
    except ValueError:
        return True
    return False


def walk_packages_recurses_into_packages():
    sys.path.insert(0, ROOT)
    try:
        names = sorted(m.name for m in pkgutil.walk_packages([ROOT]))
    finally:
        sys.path.remove(ROOT)
        for name in [n for n in sys.modules if n.startswith(PKG)]:
            del sys.modules[name]
    return names == ['alpha', PKG, PKG + '.inner']


def with_no_path_the_standard_library_is_listed():
    names = {m.name for m in pkgutil.iter_modules()}
    return 'traceback' in names and 'pkgutil' in names


CHECKS = (
    iter_modules_lists_modules_and_packages,
    iter_modules_skips_namespace_dirs_dotted_names_and_other_files,
    iter_modules_applies_the_prefix,
    each_result_names_its_directory,
    a_name_is_listed_once_across_directories,
    a_missing_directory_lists_nothing,
    a_bare_string_path_is_refused,
    walk_packages_recurses_into_packages,
    with_no_path_the_standard_library_is_listed,
)


if __name__ == '__main__':
    for check in CHECKS:
        print('%-4s %s' % ('OK' if check() is True else 'FAIL', check.__name__))
