"""Fixture: FileIO.readall(), readinto(b) and readlines(hint).

CPython's raw file has all three (Modules/_io/fileio.c): readall() reads the
rest of the file, readinto(b) reads as many bytes as a writable buffer holds
into it -- a bytearray, or a memoryview over one, whatever its shape -- and
readlines(hint) stops after the line that brings the total to hint.  Grail's
FileIO had none of them: readall and readinto were missing attributes and
readlines took no argument, so ``readlines(None)`` was a TypeError.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import os
import shutil
import tempfile

r = {}


def outcome(thunk):
    try:
        return thunk()
    except OSError as e:
        return '%s errno %s' % (type(e).__name__, e.errno)
    except Exception as e:
        return '%s: %s' % (type(e).__name__, e)


directory = tempfile.mkdtemp()
path = os.path.join(directory, 'data')
with open(path, 'wb') as f:
    f.write(b'\x01\x02\x00\xffhello\nworld\nlast')

f = open(path, 'rb', buffering=0)
r['readall'] = f.readall()
r['readall_at_the_end'] = f.readall()
f.seek(4)
r['readall_from_the_middle'] = f.readall()

f.seek(0)
target = bytearray(b'abcdefgh')
r['readinto_a_bytearray'] = [f.readinto(target), bytes(target)]
f.seek(0)
shaped = memoryview(bytearray(b'abcdefgh')).cast('H', [2, 2])
r['readinto_a_shaped_view'] = [f.readinto(shaped), bytes(shaped)]
f.seek(0)
whole = bytearray(b'....')
r['readinto_a_slice_of_a_view'] = [f.readinto(memoryview(whole)[1:3]), bytes(whole)]
f.seek(-2, 2)
r['readinto_past_the_end'] = [f.readinto(bytearray(5)), f.readinto(bytearray(5))]
r['readinto_refuses'] = [outcome(lambda: f.readinto('')), outcome(lambda: f.readinto(b'abc')),
                         outcome(lambda: f.readinto(memoryview(b'abc')))]

f.seek(4)
r['readlines_with_a_hint'] = f.readlines(5)
r['readlines_with_none'] = f.readlines(None)
f.seek(4)
r['readlines_with_a_hint_that_is_not_positive'] = f.readlines(0)
f.close()
r['on_a_closed_file'] = [outcome(lambda: f.readall()), outcome(lambda: f.readinto(bytearray(1))),
                         outcome(lambda: f.readinto(5))]

w = open(os.path.join(directory, 'out'), 'wb', buffering=0)
r['readall_of_a_file_open_for_writing'] = outcome(lambda: w.readall())
w.close()

shutil.rmtree(directory)

EXPECTED = {
    'readall': b'\x01\x02\x00\xffhello\nworld\nlast',
    'readall_at_the_end': b'',
    'readall_from_the_middle': b'hello\nworld\nlast',
    'readinto_a_bytearray': [8, b'\x01\x02\x00\xffhell'],
    'readinto_a_shaped_view': [8, b'\x01\x02\x00\xffhell'],
    'readinto_a_slice_of_a_view': [2, b'.\x01\x02.'],
    'readinto_past_the_end': [2, 0],
    'readinto_refuses': ['TypeError: readinto() argument 1 must be read-write bytes-like object, not str',
                         'TypeError: readinto() argument 1 must be read-write bytes-like object, not bytes',
                         'TypeError: readinto() argument 1 must be read-write bytes-like object, not memoryview'],
    'readlines_with_a_hint': [b'hello\n'],
    'readlines_with_none': [b'world\n', b'last'],
    'readlines_with_a_hint_that_is_not_positive': [b'hello\n', b'world\n', b'last'],
    'on_a_closed_file': ['ValueError: I/O operation on closed file',
                         'ValueError: I/O operation on closed file',
                         'TypeError: readinto() argument 1 must be read-write bytes-like object, not int'],
    'readall_of_a_file_open_for_writing': 'OSError errno 9',
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-44s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
