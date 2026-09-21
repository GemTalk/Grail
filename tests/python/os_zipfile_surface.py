"""The `os` surface CPython's own zipfile needed, and did not find.

Swapping Grail's read-only zipfile for CPython's real one failed import, then
extraction, then writing -- each time on a piece of `os` that CPython has and
Grail did not:

  * `os.SEEK_SET` / `SEEK_CUR` / `SEEK_END`, which zipfile seeks with;
  * `os.path.splitdrive`, used to sanitise every member name on extraction --
    so without it the REAL zipfile could not even extract, a regression against
    the read-only one it replaced;
  * `os.path.splitroot` and `os.path.samefile`;
  * `os.fspath` of a `pathlib.Path`.  `os.stat(Path(...))` already worked, but
    the public `os.fspath` looked for `__fspath__` in the object's OWN class
    only, and Path inherits it from PurePath;
  * `os.makedirs(path, exist_ok=True)`, the call zipfile extracts with, which
    matched no selector at all.

`splitroot` gets the most checks because it is the one with a subtle rule:
exactly two leading slashes are a root of their own on POSIX.

Every expectation here was measured against CPython 3.14.
"""

import os
import pathlib
import tempfile

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:120])


# ----------------------------------------------------------- the constants

check('seek_constants_have_their_posix_values',
      (os.SEEK_SET, os.SEEK_CUR, os.SEEK_END), (0, 1, 2))


# ------------------------------------------------------------- splitdrive

check('posix_has_no_drive', os.path.splitdrive('/a/b'), ('', '/a/b'))

check('a_relative_path_has_no_drive_either',
      os.path.splitdrive('a/b'), ('', 'a/b'))


# -------------------------------------------------------------- splitroot

check('splitroot_of_a_relative_path',
      os.path.splitroot('foo'), ('', '', 'foo'))

check('splitroot_of_an_absolute_path',
      os.path.splitroot('/foo'), ('', '/', 'foo'))

check('exactly_two_leading_slashes_are_a_root_of_their_own',
      os.path.splitroot('//foo'), ('', '//', 'foo'))

check('three_leading_slashes_collapse_to_one_root',
      os.path.splitroot('///foo'), ('', '/', '//foo'))

check('splitroot_of_the_root_alone',
      (os.path.splitroot('/'), os.path.splitroot('//')),
      (('', '/', ''), ('', '//', '')))

check('splitroot_of_the_empty_path', os.path.splitroot(''), ('', '', ''))


# ---------------------------------------------------------------- samefile

_here = tempfile.mkdtemp()

check('a_directory_is_the_same_file_as_itself_through_dot',
      os.path.samefile(_here, os.path.join(_here, '.')), True)

check('two_different_directories_are_not_the_same_file',
      os.path.samefile(_here, os.path.dirname(_here)), False)


# ----------------------------------------------------------------- fspath

check('fspath_of_a_path_that_inherits_dunder_fspath',
      os.fspath(pathlib.Path(_here)), _here)

check('fspath_still_passes_a_string_through', os.fspath('abc'), 'abc')


# ---------------------------------------------------------------- makedirs

_nested = os.path.join(_here, 'x', 'y')
os.makedirs(_nested, exist_ok=True)
check('makedirs_accepts_exist_ok_by_keyword', os.path.isdir(_nested), True)

os.makedirs(name=os.path.join(_here, 'z'), exist_ok=True)
check('makedirs_accepts_the_path_by_keyword',
      os.path.isdir(os.path.join(_here, 'z')), True)


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
