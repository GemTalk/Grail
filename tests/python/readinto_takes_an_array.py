"""Fixture: FileIO.readinto() and os.readinto() read into an array.array.

An array exports a writable buffer, so CPython reads into its bytes
(Modules/_io/fileio.c _io_FileIO_readinto_impl and Modules/posixmodule.c
os_readinto_impl both take a ``w*'' buffer): readinto(array('H', [0, 0]))
reads four bytes and answers 4.  Grail refused the array, "readinto()
argument 1 must be read-write bytes-like object, not array.array", so
test_fileio's testErrnoOnClosedReadinto never reached the closed descriptor
it tests.  A memoryview over an array was refused the same way.

The expected bytes are the array's own tobytes(), so the checks hold on any
byte order.  Every check here holds under CPython 3.14, which is what makes
it evidence.
"""

import errno
import io
import os
import shutil
import tempfile
from array import array

r = {}

CONTENT = b'0123456789abcdef'
DIRECTORY = tempfile.mkdtemp()
PATH = os.path.join(DIRECTORY, 'readinto.bin')
SHORT_PATH = os.path.join(DIRECTORY, 'short.bin')
with open(PATH, 'wb') as f:
    f.write(CONTENT)
with open(SHORT_PATH, 'wb') as f:
    f.write(b'xyz')


def outcome(call):
    try:
        return call()
    except (TypeError, OSError) as e:
        return '%s: %s' % (type(e).__name__, e)


def file_read_into(buffer, path=PATH):
    with io.FileIO(path) as f:
        return f.readinto(buffer)


def os_read_into(buffer):
    fd = os.open(PATH, os.O_RDONLY)
    try:
        return os.readinto(fd, buffer)
    finally:
        os.close(fd)


def read_into_a_closed_descriptor():
    f = io.FileIO(PATH)
    os.close(f.fileno())
    try:
        f.readinto(array('b', b'x' * 10))
    except OSError as e:
        return e.errno == errno.EBADF
    finally:
        try:
            f.close()
        except OSError:
            pass
    return 'no error'


def read_into(reader, buffer):
    return outcome(lambda: [reader(buffer), buffer.tobytes()])


try:
    r['fileio_reads_into_a_byte_array'] = read_into(file_read_into, array('b', b'x' * 6))
    r['fileio_reads_into_a_wider_array'] = read_into(file_read_into, array('H', [0, 0]))
    r['a_short_read_leaves_the_rest'] = read_into(
        lambda buffer: file_read_into(buffer, SHORT_PATH), array('B', [0] * 6))
    behind = array('h', [0, 0, 0])
    r['a_view_slice_reads_at_its_offset'] = outcome(
        lambda: [file_read_into(memoryview(behind)[1:]), behind.tobytes()])
    r['os_readinto_reads_into_an_array'] = read_into(os_read_into, array('B', [0] * 3))
    r['bytesio_reads_into_a_view_over_an_array'] = read_into(
        lambda buffer: io.BytesIO(b'ab').readinto(memoryview(buffer)), array('b', b'..'))
    r['a_closed_descriptor_is_ebadf'] = outcome(read_into_a_closed_descriptor)
    r['a_read_only_buffer_is_still_refused'] = [
        outcome(lambda: file_read_into(b'xy')),
        outcome(lambda: file_read_into(memoryview(b'xy'))),
        outcome(lambda: os_read_into(b'xy'))]
finally:
    shutil.rmtree(DIRECTORY)

EXPECTED = {
    'fileio_reads_into_a_byte_array': [6, b'012345'],
    'fileio_reads_into_a_wider_array': [4, b'0123'],
    'a_short_read_leaves_the_rest': [3, b'xyz\x00\x00\x00'],
    'a_view_slice_reads_at_its_offset': [4, b'\x00\x000123'],
    'os_readinto_reads_into_an_array': [3, b'012'],
    'bytesio_reads_into_a_view_over_an_array': [2, b'ab'],
    'a_closed_descriptor_is_ebadf': True,
    'a_read_only_buffer_is_still_refused': [
        'TypeError: readinto() argument 1 must be read-write bytes-like object, not bytes',
        'TypeError: readinto() argument 1 must be read-write bytes-like object, not memoryview',
        'TypeError: readinto() argument 2 must be read-write bytes-like object, not bytes'],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-42s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
