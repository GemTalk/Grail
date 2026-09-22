"""A failing os call or open() carries errno, strerror and filename, as CPython's do.

Grail raised the right OSError subclass with CPython's message text, but built
it from the TEXT alone -- ``FileNotFoundError('[Errno 2] No such file ...')''
-- so ``e.errno'', ``e.strerror'' and ``e.filename'' were all None.  Code that
reads them got nothing: ``except FileNotFoundError as e: missing.add(e.filename)''
added None, and an ``e.errno == errno.ENOENT'' test was false for a missing
file.  open() was one of them, through the stat it asks why a file will not
open.

os.symlink also reported only the link, where CPython names both paths, and
two paths under a plain FILE were FileNotFoundError where CPython reports
ENOTDIR.

Only errnos that Darwin and Linux number alike are asserted by number.  No
check needs a file the test cannot write, since CI may run as root.

Every expectation here was measured against CPython 3.14.
"""

import gzip
import os
import pathlib
import shutil
import tempfile

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:160])


ROOT = tempfile.mkdtemp()
RAISED = []


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
            exc.filename and os.path.basename(exc.filename),
            exc.filename2 and os.path.basename(exc.filename2))


def _message(fn, *args):
    return str(_raised(fn, *args)).replace(ROOT, '<d>')


open(_path('file'), 'w').close()
os.mkdir(_path('dir'))
os.symlink(_path('nowhere'), _path('dangling'))

# ----------------------------------------------------------- os.listdir

check('listdir_of_a_missing_path_carries_enoent',
      _error(os.listdir, _path('missing')),
      ('FileNotFoundError', 2, 'missing', None))
check('listdir_of_a_file_carries_enotdir',
      _error(os.listdir, _path('file')),
      ('NotADirectoryError', 20, 'file', None))

# ----------------------------------------------------------- os.stat, os.lstat

check('stat_of_a_missing_path_carries_enoent',
      _error(os.stat, _path('missing')),
      ('FileNotFoundError', 2, 'missing', None))
check('stat_under_a_file_carries_enotdir',
      _error(os.stat, _path('file', 'x')),
      ('NotADirectoryError', 20, 'x', None))
check('lstat_of_a_missing_path_carries_enoent',
      _error(os.lstat, _path('missing')),
      ('FileNotFoundError', 2, 'missing', None))
check('str_of_the_error_names_the_path',
      _message(os.stat, _path('missing')),
      "[Errno 2] No such file or directory: '<d>/missing'")

# ----------------------------------------------------------- open()

check('open_of_a_missing_file_carries_enoent',
      _error(open, _path('missing')),
      ('FileNotFoundError', 2, 'missing', None))
check('open_of_a_directory_carries_eisdir_to_read_or_write',
      (_error(open, _path('dir')), _error(open, _path('dir'), 'w')),
      (('IsADirectoryError', 21, 'dir', None),) * 2)
check('exclusive_open_of_an_existing_file_carries_eexist',
      _error(open, _path('file'), 'x'),
      ('FileExistsError', 17, 'file', None))
check('open_under_a_file_carries_enotdir',
      _error(open, _path('file', 'x')),
      ('NotADirectoryError', 20, 'x', None))
check('open_of_a_path_object_names_it_as_a_str',
      (lambda exc: exc is not None and (type(exc.filename).__name__, exc.filename))(
          _raised(open, pathlib.Path(_path('missing')))),
      ('str', _path('missing')))
check('gzip_open_of_a_missing_file_carries_enoent',
      _error(gzip.open, _path('missing')),
      ('FileNotFoundError', 2, 'missing', None))

# ----------------------------------------------------------- os.symlink

check('symlink_onto_an_occupant_names_both_paths',
      _error(os.symlink, _path('file'), _path('dir')),
      ('FileExistsError', 17, 'file', 'dir'))
check('symlink_onto_a_dangling_link_is_file_exists',
      _error(os.symlink, _path('file'), _path('dangling')),
      ('FileExistsError', 17, 'file', 'dangling'))
check('symlink_into_a_missing_directory_names_both_paths',
      _error(os.symlink, _path('file'), _path('nodir', 'link')),
      ('FileNotFoundError', 2, 'file', 'link'))
check('symlink_under_a_file_carries_enotdir',
      _error(os.symlink, _path('file'), _path('file', 'link')),
      ('NotADirectoryError', 20, 'file', 'link'))
check('str_of_a_symlink_error_names_both_paths',
      _message(os.symlink, _path('file'), _path('dir')),
      "[Errno 17] File exists: '<d>/file' -> '<d>/dir'")
os.symlink('file', _path('link'))
check('symlink_still_creates_the_link', os.readlink(_path('link')), 'file')

# ----------------------------------------------------------- os.readlink

check('readlink_of_a_missing_path_carries_enoent',
      _error(os.readlink, _path('missing')),
      ('FileNotFoundError', 2, 'missing', None))
check('readlink_of_a_file_is_einval',
      _error(os.readlink, _path('file')),
      ('OSError', 22, 'file', None))
check('readlink_under_a_file_carries_enotdir',
      _error(os.readlink, _path('file', 'x')),
      ('NotADirectoryError', 20, 'x', None))

# ----------------------------------------------------------- os.utime, os.chmod

check('utime_of_a_missing_file_carries_enoent',
      _error(os.utime, _path('missing')),
      ('FileNotFoundError', 2, 'missing', None))
check('chmod_of_a_missing_file_carries_enoent',
      _error(os.chmod, _path('missing'), 0o644),
      ('FileNotFoundError', 2, 'missing', None))
os.chmod(_path('file'), 0o640)
check('chmod_still_sets_the_mode', os.stat(_path('file')).st_mode & 0o777, 0o640)

# ----------------------------------------------------------- os.remove

check('remove_of_a_missing_file_carries_enoent',
      _error(os.remove, _path('missing')),
      ('FileNotFoundError', 2, 'missing', None))
check('remove_under_a_file_carries_enotdir',
      _error(os.remove, _path('file', 'x')),
      ('NotADirectoryError', 20, 'x', None))
os.remove(_path('dangling'))
check('remove_still_removes_a_dangling_link', os.path.lexists(_path('dangling')), False)

# ----------------------------------------------------------- strerror

check('strerror_is_the_text_of_every_error_above',
      [type(exc).__name__ for exc in RAISED
       if exc.errno is None or exc.strerror != os.strerror(exc.errno)],
      [])


def _strerror_refusal(code):
    try:
        os.strerror(code)
    except (TypeError, OverflowError) as exc:
        return type(exc).__name__, str(exc)
    return 'no error'


check('strerror_refuses_a_non_integer',
      (_strerror_refusal(None), _strerror_refusal(2.0)),
      (('TypeError', "'NoneType' object cannot be interpreted as an integer"),
       ('TypeError', "'float' object cannot be interpreted as an integer")))
check('strerror_refuses_an_integer_beyond_a_c_int',
      (_strerror_refusal(2 ** 31), _strerror_refusal(-2 ** 31 - 1)),
      (('OverflowError', 'Python int too large to convert to C int'),) * 2)


shutil.rmtree(ROOT)


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
