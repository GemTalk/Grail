"""Fixture: a FileIO truncates, and reports its block size, through its descriptor.

FileIO.truncate(size=None) is ftruncate(2) on the descriptor, to the
current position when no size is given; it answers the size and leaves the
position where it was (Modules/_io/fileio.c, _io_FileIO_truncate_impl).
FileIO._blksize is the descriptor's st_blksize, or io.DEFAULT_BUFFER_SIZE
(fileio_get_blksize).

Grail refused truncate() outright, "truncate() is not supported in
Grail", and had no _blksize (test_fileio testTruncate,
testTruncateOnWindows, testBlksize).

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import _io
import io
import os
import tempfile

r = {}
directory = tempfile.mkdtemp()
path = os.path.join(directory, 'fileio_truncates_through_its_descriptor.bin')


def outcome(thunk):
    try:
        return thunk()
    except Exception as e:
        return (type(e).__name__, isinstance(e, OSError), getattr(e, 'errno', None))


f = _io.FileIO(path, 'w')
stat = os.fstat(f.fileno())
expected_blksize = stat.st_blksize if getattr(stat, 'st_blksize', 0) > 1 else io.DEFAULT_BUFFER_SIZE
r['blksize_is_the_descriptors'] = f._blksize == expected_blksize
f.write(bytes(range(10)))
r['shorter_answers_the_size'] = f.truncate(5)
r['shorter_keeps_the_position'] = f.tell()
r['shorter_end'] = f.seek(0, io.SEEK_END)
r['longer_answers_the_size'] = f.truncate(15)
r['longer_keeps_the_position'] = f.tell()
r['longer_end'] = f.seek(0, io.SEEK_END)
r['a_negative_size'] = outcome(lambda: f.truncate(-1))
f.close()
r['a_closed_file'] = outcome(lambda: f.truncate())
with open(path, 'rb') as g:
    r['what_is_left'] = g.read()

with _io.FileIO(path, 'r+') as u:
    u.read(5)
    r['no_size_answers_the_position'] = u.truncate()
    r['no_size_keeps_the_position'] = u.tell()
r['no_size_size'] = os.path.getsize(path)

with _io.FileIO(path, 'r') as v:
    r['a_file_open_for_reading_refuses'] = outcome(lambda: v.truncate(0))[1]

with open(path, 'w+', encoding='utf-8') as t:
    t.write('abcdef')
    r['a_text_file'] = t.truncate(3)
with open(path, 'r', encoding='utf-8') as t:
    r['what_the_text_file_kept'] = t.read()

os.remove(path)
os.rmdir(directory)

EXPECTED = {
    'shorter_answers_the_size': 5,
    'shorter_keeps_the_position': 10,
    'shorter_end': 5,
    'longer_answers_the_size': 15,
    'longer_keeps_the_position': 5,
    'longer_end': 15,
    'a_negative_size': ('OSError', True, 22),
    'blksize_is_the_descriptors': True,
    'a_closed_file': ('ValueError', False, None),
    'what_is_left': bytes(range(5)) + bytes(10),
    'no_size_answers_the_position': 5,
    'no_size_keeps_the_position': 5,
    'no_size_size': 5,
    'a_file_open_for_reading_refuses': True,
    'a_text_file': 3,
    'what_the_text_file_kept': 'abc',
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-32s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
