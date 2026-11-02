"""Fixture: a descriptor closed underneath a FileIO is EBADF.

``os.close(f.fileno())`` closes the descriptor and leaves the file object
open over nothing.  CPython's FileIO does not notice until it next reaches
the descriptor, and then every read, write, seek, tell, truncate and close
fails with EBADF, while the queries that need no descriptor still answer:
readable() and writable() from the mode, fileno() with the number it had,
seekable() and isatty() False because lseek and isatty fail.  close() still
marks the file closed before it reports the error, so a second close is
quiet.  test_fileio's ClosedFD and ClosedFDRaises tests close the descriptor
under the file in exactly this way.

Grail refused the os.close itself, EBADF for a descriptor os had not handed
out, so none of that could be reached.

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
    f.write(b'some bytes\nand more\n')

writer = open(path, 'r+b', buffering=0)
descriptor = writer.fileno()
r['os_close_takes_it'] = outcome(lambda: os.close(descriptor))
r['the_file_stays_open'] = writer.closed
r['write'] = outcome(lambda: writer.write(b'x'))
r['seek'] = outcome(lambda: writer.seek(0))
r['tell'] = outcome(lambda: writer.tell())
r['truncate'] = outcome(lambda: writer.truncate(0))
r['read'] = outcome(lambda: writer.read(1))
r['readline'] = outcome(lambda: writer.readline())
r['queries_needing_no_descriptor'] = [writer.readable(), writer.writable(), writer.fileno() == descriptor]
r['queries_the_descriptor_fails'] = [writer.seekable(), writer.isatty()]
r['close_reports_it'] = outcome(lambda: writer.close())
r['and_closes_the_file'] = writer.closed
r['a_second_close_is_quiet'] = outcome(lambda: writer.close())
r['then_operations_are_on_a_closed_file'] = outcome(lambda: writer.read(1)).split(':')[0]

owner = open(path, 'rb', buffering=0)
borrower = open(owner.fileno(), 'rb', buffering=0, closefd=False)
r['a_borrower_reads_while_the_owner_is_open'] = borrower.read(4)
owner.close()
r['a_borrower_after_the_owner_closes'] = outcome(lambda: borrower.read(1))
r['a_borrower_closes_quietly'] = [outcome(lambda: borrower.close()), borrower.closed]

shutil.rmtree(directory)

EXPECTED = {
    'os_close_takes_it': None,
    'the_file_stays_open': False,
    'write': 'OSError errno 9',
    'seek': 'OSError errno 9',
    'tell': 'OSError errno 9',
    'truncate': 'OSError errno 9',
    'read': 'OSError errno 9',
    'readline': 'OSError errno 9',
    'queries_needing_no_descriptor': [True, True, True],
    'queries_the_descriptor_fails': [False, False],
    'close_reports_it': 'OSError errno 9',
    'and_closes_the_file': True,
    'a_second_close_is_quiet': None,
    'then_operations_are_on_a_closed_file': 'ValueError',
    'a_borrower_reads_while_the_owner_is_open': b'some',
    'a_borrower_after_the_owner_closes': 'OSError errno 9',
    'a_borrower_closes_quietly': [None, True],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-42s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
