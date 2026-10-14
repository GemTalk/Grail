"""Run pytest under Grail for scripts/pypi_package_tests.py.

    ./grail --namespace <ns> grail_pytest_driver.py <site-packages> <plugin-dir>
        <project-dir> [--warm] -- <pytest args>

Puts the venv's site-packages and the reporting plugin's directory on
sys.path, changes into the project's extracted sdist, and calls pytest.main
with the arguments after ``--``.

``--warm`` imports pytest and commits the namespace, and runs nothing: a
named namespace keeps every module it compiled once committed, so later runs
import pytest in a fraction of a second instead of compiling ~180 modules
(about 50 s) every time.  Only the warm run commits.  A test run never does,
so nothing a test suite builds or monkeypatches is made persistent.
"""

import os
import sys


def main(argv):
    if '--' in argv:
        cut = argv.index('--')
        mine, pytest_args = argv[:cut], argv[cut + 1:]
    else:
        mine, pytest_args = argv, []
    warm = '--warm' in mine
    mine = [a for a in mine if a != '--warm']
    site_packages, plugin_dir, project_dir = mine[:3]
    sys.path.insert(0, site_packages)
    sys.path.insert(0, plugin_dir)
    import pytest
    if warm:
        import gemdb
        gemdb.commit()
        print('GRAIL_WARM|pytest', pytest.__version__)
        return 0
    os.chdir(project_dir)
    sys.path.insert(0, project_dir)
    rc = pytest.main(pytest_args)
    print('GRAIL_EXIT|%s' % int(rc))
    return int(rc)


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
