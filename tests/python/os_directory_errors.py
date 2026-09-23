"""os.chdir, os.rmdir and os.remove of a directory say what went wrong.

os.chdir SAID NOTHING AT ALL: its primitive answers 0 on success and the errno
on failure, and os.chdir tested only for nil, the one answer it never gives.
So os.chdir('/nope') returned None, changed nothing, and raised nothing -- the
same defect os.rename had.

os.rmdir and os.remove did raise, but a plain OSError carrying only a sentence
Grail wrote itself -- ``Cannot remove directory: <the path>`` -- where CPython
raises the errno's own subclass with errno, strerror and filename.  ``except
FileNotFoundError'' around an os.rmdir therefore never fired, and rmdir of a
NON-EMPTY directory was indistinguishable from rmdir of a missing one.

Their two primitives answer only nil, so their errno is read back from the
filesystem, the way os.mkdir's already was.

TWO CASES ARE NUMBERED PER PLATFORM, and are asserted against the platform
rather than against a constant:

  * a directory that still holds entries is ENOTEMPTY, 66 on Darwin and 39 on
    Linux, and has no OSError subclass of its own;
  * unlink(2) of a directory is EPERM on Darwin (PermissionError) and EISDIR
    on Linux (IsADirectoryError).

Grail's errno module cannot be asked for either, since its values are the BSD
ones on every platform (see the stub's own header), so sys.platform is what
decides here.

Every expectation here was measured against CPython 3.14.
"""

import os
import shutil
import sys
import tempfile

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:160])


ROOT = tempfile.mkdtemp()
RAISED = []
DARWIN = sys.platform == 'darwin'
NOT_EMPTY = 66 if DARWIN else 39
UNLINK_A_DIRECTORY = ('PermissionError', 1) if DARWIN else ('IsADirectoryError', 21)


def _path(*names):
    return os.path.join(ROOT, *names)


def _raised(fn, *args):
    try:
        fn(*args)
    except OSError as exc:
        RAISED.append(exc)
        return exc
    return None


def _error(fn, *args):
    exc = _raised(fn, *args)
    if exc is None:
        return 'no error'
    return (type(exc).__name__, exc.errno,
            exc.filename and os.path.basename(exc.filename))


open(_path('file'), 'w').close()
os.mkdir(_path('empty'))
os.mkdir(_path('full'))
open(_path('full', 'inside'), 'w').close()
os.symlink(_path('full'), _path('link'))

# ----------------------------------------------------------- os.chdir

check('chdir_to_a_missing_path_carries_enoent',
      _error(os.chdir, _path('missing')),
      ('FileNotFoundError', 2, 'missing'))
check('chdir_to_a_file_carries_enotdir',
      _error(os.chdir, _path('file')),
      ('NotADirectoryError', 20, 'file'))
check('chdir_under_a_file_carries_enotdir',
      _error(os.chdir, _path('file', 'x')),
      ('NotADirectoryError', 20, 'x'))
check('str_of_the_error_names_the_path',
      str(_raised(os.chdir, _path('missing'))).replace(ROOT, '<d>'),
      "[Errno 2] No such file or directory: '<d>/missing'")

_ORIGINAL = os.getcwd()
try:
    os.chdir(_path('empty'))
    check('chdir_still_changes_the_directory',
          os.path.basename(os.getcwd()), 'empty')
finally:
    os.chdir(_ORIGINAL)

# ----------------------------------------------------------- os.rmdir

check('rmdir_of_a_missing_path_carries_enoent',
      _error(os.rmdir, _path('missing')),
      ('FileNotFoundError', 2, 'missing'))
check('rmdir_of_a_file_carries_enotdir',
      _error(os.rmdir, _path('file')),
      ('NotADirectoryError', 20, 'file'))
check('rmdir_of_a_symlink_to_a_directory_carries_enotdir',
      _error(os.rmdir, _path('link')),
      ('NotADirectoryError', 20, 'link'))
check('rmdir_of_a_directory_holding_entries_is_not_empty',
      _error(os.rmdir, _path('full')),
      ('OSError', NOT_EMPTY, 'full'))
check('rmdir_of_a_directory_holding_entries_leaves_it_alone',
      os.path.isdir(_path('full')), True)
os.rmdir(_path('empty'))
check('rmdir_still_removes_an_empty_directory',
      os.path.exists(_path('empty')), False)

# ----------------------------------------------------------- os.remove

os.mkdir(_path('victim'))
check('remove_of_a_directory_is_what_the_platform_reports',
      (lambda exc: exc is not None and (type(exc).__name__, exc.errno))(
          _raised(os.remove, _path('victim'))),
      UNLINK_A_DIRECTORY)
check('remove_of_a_directory_leaves_it_alone',
      os.path.isdir(_path('victim')), True)
os.remove(_path('file'))
check('remove_still_removes_a_file', os.path.exists(_path('file')), False)

# ----------------------------------------------------------- strerror

check('strerror_is_the_text_of_every_error_above',
      [type(exc).__name__ for exc in RAISED
       if exc.errno is None or exc.strerror != os.strerror(exc.errno)],
      [])


# The symlink goes FIRST, by name.  Grail's shutil.rmtree asks os.path.isdir,
# which FOLLOWS a link, so it would recurse into the link and delete what it
# points at -- then fail on entries it had already removed.  CPython's rmtree
# never follows one.  Recorded in docs/Issues.md; not this fixture's subject.
os.remove(_path('link'))
shutil.rmtree(ROOT)


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
