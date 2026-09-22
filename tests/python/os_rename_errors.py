"""os.rename and os.replace say when they fail, as CPython's do.

Grail's os.rename returned normally when the rename FAILED -- renaming a file
that does not exist answered None and moved nothing.  GemStone's primitive
answers 0 on success and the errno on failure, and os.rename tested only for
nil, the one answer it never gives.  pathlib's Path.rename inherited it.

CPython raises the errno's own OSError subclass carrying errno, strerror,
filename and filename2, and prints both names:

    [Errno 2] No such file or directory: 'a' -> 'b'

os.replace is the same call on POSIX, and the one Path.replace and Path.move
make; os.strerror is the public spelling of the text in those messages.

Only errnos that Darwin and Linux number alike are asserted by number here.
Directory-not-empty is 66 on one and 39 on the other, so that check asserts
the class and that the message agrees with os.strerror.

Every expectation here was measured against CPython 3.14.
"""

import os
import pathlib
import shutil
import tempfile

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:160])


ROOT = tempfile.mkdtemp()


def _path(*names):
    return os.path.join(ROOT, *names)


def _write(name, text):
    with open(_path(name), 'w') as f:
        f.write(text)


def _read(name):
    with open(_path(name)) as f:
        return f.read()


def _error(fn, *args):
    try:
        fn(*args)
    except OSError as exc:
        return (type(exc).__name__, exc.errno,
                exc.filename and os.path.basename(exc.filename),
                exc.filename2 and os.path.basename(exc.filename2))
    return 'no error'


def _raised(fn, *args):
    try:
        fn(*args)
    except OSError as exc:
        return exc
    return None


_write('source', 'the source')
_write('occupant', 'the occupant')
os.mkdir(_path('directory'))
os.mkdir(_path('full'))
_write(os.path.join('full', 'inside'), '')

# ----------------------------------------------------------- failures

check('rename_of_a_missing_file_is_file_not_found',
      _error(os.rename, _path('missing'), _path('target')),
      ('FileNotFoundError', 2, 'missing', 'target'))
check('rename_of_a_missing_file_names_both_paths',
      (lambda: str(_raised(os.rename, _path('missing'), _path('target')))
       .replace(ROOT, '<d>'))(),
      "[Errno 2] No such file or directory: '<d>/missing' -> '<d>/target'")
check('rename_of_a_missing_file_creates_no_target',
      os.path.exists(_path('target')), False)
check('rename_of_a_file_onto_a_directory_is_a_directory_error',
      _error(os.rename, _path('source'), _path('directory')),
      ('IsADirectoryError', 21, 'source', 'directory'))
check('rename_of_a_directory_onto_a_file_is_not_a_directory',
      _error(os.rename, _path('directory'), _path('occupant')),
      ('NotADirectoryError', 20, 'directory', 'occupant'))
check('rename_of_a_directory_onto_a_full_one_is_a_plain_os_error',
      (lambda exc: exc is not None and (type(exc).__name__, exc.strerror == os.strerror(exc.errno)))(
          _raised(os.rename, _path('directory'), _path('full'))),
      ('OSError', True))
check('replace_of_a_missing_file_is_file_not_found',
      _error(os.replace, _path('missing'), _path('target')),
      ('FileNotFoundError', 2, 'missing', 'target'))
check('path_rename_of_a_missing_file_is_file_not_found',
      _error(pathlib.Path(_path('missing')).rename, _path('target')),
      ('FileNotFoundError', 2, 'missing', 'target'))
check('a_failed_rename_leaves_the_source_alone',
      _read('source'), 'the source')

# ----------------------------------------------------------- successes

os.rename(_path('source'), _path('moved'))
check('rename_moves_the_file',
      (os.path.exists(_path('source')), _read('moved')), (False, 'the source'))
os.rename(_path('moved'), _path('occupant'))
check('rename_overwrites_an_existing_file', _read('occupant'), 'the source')
_write('second', 'the second')
os.replace(_path('second'), _path('occupant'))
check('replace_overwrites_an_existing_file',
      (os.path.exists(_path('second')), _read('occupant')), (False, 'the second'))
check('path_replace_answers_the_target',
      (lambda target: pathlib.Path(_path('occupant')).replace(target) == target
       and target.read_text() == 'the second')(pathlib.Path(_path('replaced'))),
      True)

# ----------------------------------------------------------- os.strerror

check('strerror_words_the_errnos_both_platforms_share',
      [os.strerror(n) for n in (1, 2, 13, 17, 20, 21)],
      ['Operation not permitted', 'No such file or directory', 'Permission denied',
       'File exists', 'Not a directory', 'Is a directory'])
check('strerror_is_the_text_of_the_error',
      (lambda exc: exc is not None and exc.strerror == os.strerror(exc.errno))(
          _raised(os.rename, _path('missing'), _path('target'))),
      True)


shutil.rmtree(ROOT)


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
