"""os's file-descriptor layer: os.open, read, readinto, write, lseek, fstat,
ftruncate, isatty and close, as CPython has them.

Grail's os had none of these -- only the O_* constants -- so _pyio.FileIO,
which is built entirely on them, died on its first ``os.open'' with
AttributeError.  That was test_bufio's two PyBufferSizeTest errors.

The O_* constants were Darwin's numbers on every platform.  Harmless while
nothing handed them to libc; wrong the moment os.open does, since on Linux
Darwin's O_CREAT (512) is O_TRUNC.  ``flags_mean_what_they_say'' is the check
that would catch it: every flag is judged by what the file looks like
afterwards, never by its number.

The last two checks guard the reason _pyio became usable in practice, not just
importable: constructing an ABCMeta class (every _pyio file object) rescanned
the whole class chain for abstract methods on EVERY construction, ~17 ms each.
The answer is now computed once per class, and these pin that computing it
once did not change it.

Errnos are compared by NAME, so the checks read the same on Darwin and Linux.
Every expectation was measured against CPython 3.14.
"""

import _pyio
import abc
import errno
import os
import shutil
import stat
import tempfile

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:160])


ROOT = tempfile.mkdtemp()


def _path(*names):
    return os.path.join(ROOT, *names)


def _error(fn, *args):
    try:
        fn(*args)
    except OSError as exc:
        return (type(exc).__name__, errno.errorcode.get(exc.errno),
                exc.filename and os.path.basename(exc.filename))
    except (TypeError, ValueError) as exc:
        return (type(exc).__name__, str(exc))
    return 'no error'


def _contents(path):
    with open(path, 'rb') as f:
        return f.read()


# ----------------------------------------------------------- open / write / close

fd = os.open(_path('a'), os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o640)
check('open_answers_an_int', type(fd).__name__, 'int')
check('write_answers_the_count',
      (os.write(fd, b'hello'), os.write(fd, bytearray(b' ')),
       os.write(fd, memoryview(b'world')), os.write(fd, b'')),
      (5, 1, 5, 0))
check('lseek_reports_the_position',
      (os.lseek(fd, 0, os.SEEK_CUR), os.lseek(fd, 0, os.SEEK_END),
       os.lseek(fd, 2, os.SEEK_SET)),
      (11, 11, 2))
check('fstat_describes_the_open_file',
      (lambda st: (st.st_size, stat.S_ISREG(st.st_mode), st.st_mode & 0o777))(
          os.fstat(fd)),
      (11, True, 0o640))
check('isatty_is_false_for_a_file', os.isatty(fd), False)
check('close_answers_none', os.close(fd), None)
check('the_bytes_reach_the_file', _contents(_path('a')), b'hello world')

# ----------------------------------------------------------- flags

def _flags_behaviour():
    out = {}
    # O_TRUNC empties an existing file; without it the old bytes stay.
    f = os.open(_path('a'), os.O_WRONLY)
    os.write(f, b'J')
    os.close(f)
    out['no_trunc'] = _contents(_path('a'))
    f = os.open(_path('a'), os.O_WRONLY | os.O_TRUNC)
    os.close(f)
    out['trunc'] = _contents(_path('a'))
    # O_APPEND writes at the end whatever the offset.
    with open(_path('b'), 'wb') as g:
        g.write(b'abc')
    f = os.open(_path('b'), os.O_WRONLY | os.O_APPEND)
    os.lseek(f, 0, os.SEEK_SET)
    os.write(f, b'XYZ')
    os.close(f)
    out['append'] = _contents(_path('b'))
    # O_CREAT makes a missing file, and without it the open fails.
    out['no_creat'] = _error(os.open, _path('c'), os.O_WRONLY)
    f = os.open(_path('c'), os.O_WRONLY | os.O_CREAT)
    os.close(f)
    out['creat'] = os.path.exists(_path('c'))
    # O_EXCL refuses a file that is already there.
    out['excl'] = _error(os.open, _path('c'), os.O_WRONLY | os.O_CREAT | os.O_EXCL)
    return out


check('flags_mean_what_they_say', _flags_behaviour(),
      {'no_trunc': b'Jello world', 'trunc': b'', 'append': b'abcXYZ',
       'no_creat': ('FileNotFoundError', 'ENOENT', 'c'), 'creat': True,
       'excl': ('FileExistsError', 'EEXIST', 'c')})

# ----------------------------------------------------------- read / readinto

with open(_path('r'), 'wb') as g:
    g.write(b'0123456789')
fd = os.open(_path('r'), os.O_RDONLY)
check('read_answers_at_most_n_bytes', (os.read(fd, 3), os.read(fd, 0)), (b'012', b''))
buf = bytearray(4)
check('readinto_a_bytearray', (os.readinto(fd, buf), bytes(buf)), (4, b'3456'))
buf = bytearray(b'......')
check('readinto_a_memoryview_slice_lands_at_its_offset',
      (os.readinto(fd, memoryview(buf)[2:]), bytes(buf)), (3, b'..789.'))
check('read_at_end_of_file_is_empty', (os.read(fd, 5), os.readinto(fd, bytearray(2))),
      (b'', 0))
os.close(fd)
fd = os.open(_path('r'), os.O_RDWR)
os.ftruncate(fd, 4)
check('ftruncate_shortens_the_file', (os.fstat(fd).st_size, os.read(fd, 10)), (4, b'0123'))

# ----------------------------------------------------------- refusals

check('negative_read_is_einval', _error(os.read, fd, -1), ('OSError', 'EINVAL', None))
check('readinto_refuses_bytes', _error(os.readinto, fd, b'xx'),
      ('TypeError', 'readinto() argument 2 must be read-write bytes-like object, not bytes'))
check('write_refuses_a_str', _error(os.write, fd, 'text'),
      ('TypeError', "a bytes-like object is required, not 'str'"))
os.close(fd)
check('a_closed_descriptor_is_ebadf',
      (_error(os.read, fd, 1), _error(os.write, fd, b'x'), _error(os.fstat, fd),
       _error(os.lseek, fd, 0, 0), _error(os.close, fd)),
      (('OSError', 'EBADF', None),) * 5)


def _ebadf_message():
    try:
        os.close(fd)
    except OSError as exc:
        return str(exc)


check('ebadf_names_no_file', _ebadf_message(), '[Errno 9] Bad file descriptor')
check('isatty_of_a_closed_descriptor_is_false', os.isatty(fd), False)
check('open_of_a_missing_file_names_it',
      _error(os.open, _path('missing'), os.O_RDONLY),
      ('FileNotFoundError', 'ENOENT', 'missing'))
check('open_refuses_an_embedded_nul',
      _error(os.open, _path('a\0b'), os.O_RDONLY),
      ('ValueError', 'open: embedded null character in path'))


def _keyword_mode():
    f = os.open(_path('k'), flags=os.O_WRONLY | os.O_CREAT, mode=0o600)
    os.close(f)
    return os.stat(_path('k')).st_mode & 0o777


check('mode_and_flags_by_keyword', _keyword_mode(), 0o600)


def _directory():
    f = os.open(ROOT, os.O_RDONLY)
    try:
        return stat.S_ISDIR(os.fstat(f).st_mode), _error(os.read, f, 1)
    finally:
        os.close(f)


check('a_directory_opens_but_does_not_read', _directory(),
      (True, ('IsADirectoryError', 'EISDIR', None)))

# ----------------------------------------------------------- _pyio on top

def _pyio_round_trip():
    with _pyio.open(_path('p'), 'wb') as f:
        f.write(b'line one\nline two')
    with _pyio.open(_path('p'), 'rb') as f:
        lines = f.readline(), f.readline(), f.readline()
    with _pyio.open(_path('p'), 'ab') as f:
        f.write(b'!')
    with _pyio.open(_path('p'), 'r', encoding='ascii') as f:
        text = f.read()
    return lines, text


check('pyio_files_work', _pyio_round_trip(),
      ((b'line one\n', b'line two', b''), 'line one\nline two!'))
check('pyio_refuses_a_directory', _error(_pyio.FileIO, ROOT),
      ('IsADirectoryError', 'EISDIR', os.path.basename(ROOT)))

# ----------------------------------------------------------- ABCMeta construction


class Shape(metaclass=abc.ABCMeta):
    @abc.abstractmethod
    def area(self):
        pass


class Square(Shape):
    def area(self):
        return 4


check('an_abstract_class_is_refused_every_time',
      (_error(Shape), _error(Shape)),
      (('TypeError', "Can't instantiate abstract class Shape without an "
                     "implementation for abstract method 'area'"),) * 2)
check('a_concrete_subclass_constructs_every_time',
      [Square().area() for _ in range(3)], [4, 4, 4])


shutil.rmtree(ROOT)


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
