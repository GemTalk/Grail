"""Fixture: os functions take the descriptor an open file's fileno() answers.

os.fstat(f.fileno()) is how code learns about a file it opened -- urllib's
addinfourl, shutil.copyfile, test_fileio's testBlksize all ask that way --
and CPython's os takes any descriptor the process holds.  Grail's os took
only those os.open and socket handed out, so it answered EBADF for every
file object's.  Once the file is closed the descriptor is gone again.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import os
import shutil
import stat
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
    f.write(b'0123456789')
    f.flush()
    r['fsync'] = [outcome(lambda: os.fsync(f.fileno())), outcome(lambda: os.fsync(f))]

with open(path, 'rb') as f:
    descriptor = f.fileno()
    status = os.fstat(descriptor)
    r['fstat'] = [status.st_size, stat.S_ISREG(status.st_mode), status.st_size == os.stat(path).st_size]
    r['isatty'] = os.isatty(descriptor)
    with open(path) as text:
        r['a_text_file_too'] = os.fstat(text.fileno()).st_size
r['after_close'] = outcome(lambda: os.fstat(descriptor))
r['fsync_refuses'] = [outcome(lambda: os.fsync('x')), outcome(lambda: os.fsync(-1))]

copy = os.path.join(directory, 'copy')
shutil.copyfile(path, copy)
with open(copy, 'rb') as f:
    r['shutil_copyfile'] = f.read()

shutil.rmtree(directory)

EXPECTED = {
    'fsync': [None, None],
    'fstat': [10, True, True],
    'isatty': False,
    'a_text_file_too': 10,
    'after_close': 'OSError errno 9',
    'fsync_refuses': ['TypeError: argument must be an int, or have a fileno() method.',
                      'ValueError: file descriptor cannot be a negative integer (-1)'],
    'shutil_copyfile': b'0123456789',
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-18s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
