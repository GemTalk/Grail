"""Fixture: io.FileIO(fd) is a file over a descriptor the caller holds.

CPython's FileIO takes a descriptor where it takes a path
(Modules/_io/fileio.c _io_FileIO___init___impl): it reads, writes and seeks
that descriptor, closes it only when closefd is true, and refuses a negative
one, one that is not open (EBADF) and a directory (EISDIR, naming the
descriptor).  A bool is taken too, with a RuntimeWarning.  Its mode is parsed
in fileio.c's own words, and its arguments are bound as Argument Clinic binds
them.

Grail's FileIO opened only paths: over an os.open descriptor it failed with
``UndefinedObject does not understand #fileDescriptor'', which no except
clause catches (test_fileio testReprNoCloseFD and testUnclosedFDOnException),
and a bool was "expected str, bytes or os.PathLike object, not bool"
(testBooleanFd).

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import io
import os
import shutil
import tempfile
import warnings

r = {}

CONTENT = b'line one\nline two\n'
DIRECTORY = tempfile.mkdtemp()
PATH = os.path.join(DIRECTORY, 'descriptor.bin')
with open(PATH, 'wb') as f:
    f.write(CONTENT)


def outcome(call):
    try:
        return call()
    except (TypeError, ValueError, OSError) as e:
        return '%s: %s' % (type(e).__name__, e)


def over_a_descriptor(flags, use):
    fd = os.open(PATH, flags)
    try:
        return outcome(lambda: use(fd))
    finally:
        try:
            os.close(fd)
        except OSError:
            pass


def a_bool_is_a_descriptor():
    with warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter('always')
        f = io.FileIO(True, closefd=False)
    try:
        return [f.name, f.fileno(), f.mode, repr(f),
                [(w.category.__name__, str(w.message)) for w in caught],
                [w.filename == __file__ for w in caught]]
    finally:
        f.close()


def reads(fd):
    f = io.FileIO(fd, closefd=False)
    with f:
        return [f.readline(), f.tell(), f.read(4), f.readall(), f.seek(0), f.read(),
                f.seek(-4, os.SEEK_END), f.read()]


def closefd_false_leaves_it_open(fd):
    io.FileIO(fd, closefd=False).close()
    os.lseek(fd, 0, os.SEEK_SET)
    return os.read(fd, 4)


def modes(fd):
    answers = []
    for mode in ('w', 'r+', 'rb', 'ab+'):
        with io.FileIO(fd, mode, closefd=False) as f:
            answers.append([f.mode, f.readable(), f.writable()])
    return answers


def refused_modes(fd):
    return [outcome(lambda: io.FileIO(fd, mode, closefd=False))
            for mode in ('rw', 'r++', '', 'q', 'rt', 'rU')]


def writes_and_truncates(fd):
    f = io.FileIO(fd, 'r+')
    try:
        return [f.write(b'LINE'), f.seek(0), f.read(8), f.truncate(4), f.seek(0), f.read(),
                f.fileno() == fd]
    finally:
        f.close()


def closefd_closes_it():
    fd = os.open(PATH, os.O_RDONLY)
    io.FileIO(fd).close()
    return outcome(lambda: os.close(fd))


def a_closed_descriptor():
    fd = os.open(PATH, os.O_RDONLY)
    os.close(fd)
    return outcome(lambda: io.FileIO(fd))


def a_directory():
    fd = os.open(DIRECTORY, os.O_RDONLY)
    try:
        io.FileIO(fd, closefd=False)
    except OSError as e:
        return [type(e).__name__, e.errno, e.filename == fd]
    finally:
        os.close(fd)
    return 'no error'


def repr_names_the_descriptor(fd):
    with io.FileIO(fd, 'r', closefd=False) as f:
        return repr(f) == "<_io.FileIO name=%d mode='rb' closefd=False>" % fd


class Refused(Exception):
    pass


class NameRefusingFileIO(io.FileIO):
    def __setattr__(self, name, value):
        if name == 'name':
            raise Refused('blocked setting name')
        return super().__setattr__(name, value)


def a_refused_name_leaves_the_descriptor_open(fd):
    try:
        NameRefusingFileIO(fd)
    except Refused:
        pass
    os.lseek(fd, 0, os.SEEK_SET)
    return os.read(fd, 4)


def a_grail_files_descriptor_is_shared():
    with open(PATH, 'rb') as owner:
        with io.FileIO(owner.fileno(), closefd=False) as borrower:
            return [borrower.read(4), owner.read(4)]


def binds_as_clinic_does(fd):
    with io.FileIO(file=fd, mode='rb', closefd=False) as f:
        bound = [f.mode, f.closefd]
    return [bound,
            outcome(lambda: io.FileIO(fd, mode=1)),
            outcome(lambda: io.FileIO(PATH, None)),
            outcome(lambda: io.FileIO(fd, 'r', False, None, 5)),
            outcome(lambda: io.FileIO(PATH, foo=1)),
            outcome(lambda: io.FileIO(mode='r')),
            outcome(lambda: io.FileIO(fd, file=fd))]


try:
    r['a_bool_is_a_descriptor_with_a_warning'] = outcome(a_bool_is_a_descriptor)
    r['reads_go_to_the_descriptor'] = over_a_descriptor(os.O_RDONLY, reads)
    r['closefd_false_leaves_it_open'] = over_a_descriptor(os.O_RDONLY, closefd_false_leaves_it_open)
    r['a_mode_says_what_the_file_may_do'] = over_a_descriptor(os.O_RDONLY, modes)
    r['modes_are_refused_in_fileios_words'] = over_a_descriptor(os.O_RDONLY, refused_modes)
    r['closefd_closes_it'] = closefd_closes_it()
    r['a_closed_descriptor_is_ebadf'] = a_closed_descriptor()
    r['a_negative_descriptor_is_refused'] = outcome(lambda: io.FileIO(-1))
    r['an_int_no_c_int_holds_is_no_path'] = outcome(lambda: io.FileIO(2 ** 40))
    r['closefd_false_needs_a_descriptor'] = outcome(lambda: io.FileIO(PATH, closefd=False))
    r['a_directory_is_refused_naming_its_descriptor'] = outcome(a_directory)
    r['repr_names_the_descriptor'] = over_a_descriptor(os.O_RDONLY, repr_names_the_descriptor)
    r['a_refused_name_leaves_the_descriptor_open'] = over_a_descriptor(
        os.O_RDONLY, a_refused_name_leaves_the_descriptor_open)
    r['a_grail_files_descriptor_is_shared'] = outcome(a_grail_files_descriptor_is_shared)
    r['arguments_bind_as_clinic_does'] = over_a_descriptor(os.O_RDONLY, binds_as_clinic_does)
    # Last: it rewrites the file the others read.
    r['writes_and_truncates_through_the_descriptor'] = over_a_descriptor(
        os.O_RDWR, writes_and_truncates)
finally:
    shutil.rmtree(DIRECTORY)

BAD_MODE = 'ValueError: Must have exactly one of create/read/write/append mode and at most one plus'

EXPECTED = {
    'a_bool_is_a_descriptor_with_a_warning': [
        True, 1, 'rb', "<_io.FileIO name=True mode='rb' closefd=False>",
        [('RuntimeWarning', 'bool is used as a file descriptor')], [True]],
    'reads_go_to_the_descriptor': [
        b'line one\n', 9, b'line', b' two\n', 0, CONTENT, 14, b'two\n'],
    'closefd_false_leaves_it_open': b'line',
    'a_mode_says_what_the_file_may_do': [
        ['wb', False, True], ['rb+', True, True], ['rb', True, False], ['ab+', True, True]],
    'modes_are_refused_in_fileios_words': [
        BAD_MODE, BAD_MODE, BAD_MODE, 'ValueError: invalid mode: q', 'ValueError: invalid mode: rt',
        'ValueError: invalid mode: rU'],
    'writes_and_truncates_through_the_descriptor': [4, 0, b'LINE one', 4, 0, b'LINE', True],
    'closefd_closes_it': 'OSError: [Errno 9] Bad file descriptor',
    'a_closed_descriptor_is_ebadf': 'OSError: [Errno 9] Bad file descriptor',
    'a_negative_descriptor_is_refused': 'ValueError: negative file descriptor',
    'an_int_no_c_int_holds_is_no_path':
        'TypeError: expected str, bytes or os.PathLike object, not int',
    'closefd_false_needs_a_descriptor': 'ValueError: Cannot use closefd=False with file name',
    'a_directory_is_refused_naming_its_descriptor': ['IsADirectoryError', 21, True],
    'repr_names_the_descriptor': True,
    'a_refused_name_leaves_the_descriptor_open': b'line',
    'a_grail_files_descriptor_is_shared': [b'line', b' one'],
    'arguments_bind_as_clinic_does': [
        ['rb', False],
        "TypeError: FileIO() argument 'mode' must be str, not int",
        "TypeError: FileIO() argument 'mode' must be str, not None",
        'TypeError: FileIO() takes at most 4 arguments (5 given)',
        "TypeError: FileIO() got an unexpected keyword argument 'foo'",
        "TypeError: FileIO() missing required argument 'file' (pos 1)",
        "TypeError: argument for FileIO() given by name ('file') and position (1)"],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-46s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
