"""Fixture: a FileIO refuses a bad buffer, path or direction as CPython's does.

FileIO.write takes any buffer (the ``y*'' converter) and refuses anything
else with "a bytes-like object is required, not 'int'"; the path is a str,
a bytes or an os.PathLike, and anything else is the TypeError os.fspath
raises; reading a file opened for writing, or writing one opened for
reading, is io.UnsupportedOperation -- an OSError and a ValueError --
"File not open for reading" (Modules/_io/fileio.c, err_mode), in the text
layer's words for a text file.

Grail sent asByteArray to whatever write() was handed, an array and an int
alike, which died as an uncatchable MessageNotUnderstood; opened a list
under its __str__; and raised a plain OSError for the wrong direction
(test_fileio testWritelinesError, testWarnings, testErrors).

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import _io
import array
import os
import tempfile

r = {}
directory = tempfile.mkdtemp()
path = os.path.join(directory, 'fileio_refuses_as_cpython_does.bin')


def outcome(thunk):
    try:
        return thunk()
    except Exception as e:
        return (type(e).__name__, str(e), isinstance(e, ValueError), isinstance(e, OSError))


class PathLike:
    def __fspath__(self):
        return path


w = _io.FileIO(path, 'w')
r['write_an_int'] = outcome(lambda: w.write(5))
r['write_a_str'] = outcome(lambda: w.write('a'))
r['write_a_list'] = outcome(lambda: w.write([1]))
r['write_an_array'] = outcome(lambda: w.write(array.array('b', [65])))
r['write_a_memoryview'] = outcome(lambda: w.write(memoryview(b'BC')))
r['writelines_of_ints'] = outcome(lambda: w.writelines([1, 2, 3]))
r['writelines_of_none'] = outcome(lambda: w.writelines(None))
r['read_a_file_open_for_writing'] = outcome(lambda: w.read(10))
w.close()

with _io.FileIO(path, 'r') as f:
    r['what_was_written'] = f.read()
    r['write_a_file_open_for_reading'] = outcome(lambda: f.write(b'x'))

with open(path, 'w', encoding='utf-8') as t:
    r['read_a_text_file_open_for_writing'] = outcome(lambda: t.read())
with open(path, 'r', encoding='utf-8') as t:
    r['write_a_text_file_open_for_reading'] = outcome(lambda: t.write('x'))

r['a_list_for_a_path'] = outcome(lambda: _io.FileIO([]))
r['a_float_for_a_path'] = outcome(lambda: _io.FileIO(1.5))
r['none_for_a_path'] = outcome(lambda: open(None))
r['a_bytearray_for_a_path'] = outcome(lambda: open(bytearray(os.fsencode(path))))
with open(PathLike(), 'wb') as g:
    g.write(b'via fspath')
with open(os.fsencode(path), 'rb') as g:
    r['a_pathlike_and_a_bytes_path'] = g.read()

os.remove(path)
os.rmdir(directory)

NOT_BYTES_LIKE = "a bytes-like object is required, not '%s'"
NOT_A_PATH = 'expected str, bytes or os.PathLike object, not %s'
EXPECTED = {
    'write_an_int': ('TypeError', NOT_BYTES_LIKE % 'int', False, False),
    'write_a_str': ('TypeError', NOT_BYTES_LIKE % 'str', False, False),
    'write_a_list': ('TypeError', NOT_BYTES_LIKE % 'list', False, False),
    'write_an_array': 1,
    'write_a_memoryview': 2,
    'writelines_of_ints': ('TypeError', NOT_BYTES_LIKE % 'int', False, False),
    'writelines_of_none': ('TypeError', "'NoneType' object is not iterable", False, False),
    'read_a_file_open_for_writing':
        ('UnsupportedOperation', 'File not open for reading', True, True),
    'what_was_written': b'ABC',
    'write_a_file_open_for_reading':
        ('UnsupportedOperation', 'File not open for writing', True, True),
    'read_a_text_file_open_for_writing': ('UnsupportedOperation', 'not readable', True, True),
    'write_a_text_file_open_for_reading': ('UnsupportedOperation', 'not writable', True, True),
    'a_list_for_a_path': ('TypeError', NOT_A_PATH % 'list', False, False),
    'a_float_for_a_path': ('TypeError', NOT_A_PATH % 'float', False, False),
    'none_for_a_path': ('TypeError', NOT_A_PATH % 'NoneType', False, False),
    'a_bytearray_for_a_path': ('TypeError', NOT_A_PATH % 'bytearray', False, False),
    'a_pathlike_and_a_bytes_path': b'via fspath',
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-36s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
