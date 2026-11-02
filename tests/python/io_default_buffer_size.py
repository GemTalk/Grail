"""Fixture: io.DEFAULT_BUFFER_SIZE is 128 KiB, as CPython 3.14's is.

CPython raised it from 8 KiB in 3.14 (Modules/_io/_iomodule.h:81, and
_pyio's own constant).  Grail's _pyio already buffered 128 KiB at a time, but
io still said 8 KiB, so code sized by the constant disagreed with the
buffers it got: test_gzip's test_decompress_limited allows one buffer of
read-ahead, computed from io.DEFAULT_BUFFER_SIZE, and saw 128 KiB taken
against an allowance of 8 KiB.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import gzip
import io
import _io
import _pyio

r = {}


class CountingRaw(io.RawIOBase):
    def __init__(self):
        self.asked = []

    def readable(self):
        return True

    def readinto(self, buffer):
        self.asked.append(len(buffer))
        buffer[:len(buffer)] = bytes(len(buffer))
        return len(buffer)

    def read(self, size=-1):
        self.asked.append(size)
        return bytes(size if size >= 0 else 1)


raw = CountingRaw()
io.BufferedReader(raw).read(1)

bomb = io.BytesIO(gzip.compress(bytes(2 * 1000 * 1000), compresslevel=9))
reader = gzip.GzipFile(fileobj=bomb)
reader.read(1)

r['the_constant'] = [io.DEFAULT_BUFFER_SIZE, _io.DEFAULT_BUFFER_SIZE, _pyio.DEFAULT_BUFFER_SIZE]
r['a_buffered_reader_asks_for_one_buffer'] = raw.asked[:1] == [io.DEFAULT_BUFFER_SIZE]
r['gzip_reads_one_buffer_ahead_at_most'] = reader._buffer.raw.tell() <= 1 + io.DEFAULT_BUFFER_SIZE

EXPECTED = {
    'the_constant': [131072, 131072, 131072],
    'a_buffered_reader_asks_for_one_buffer': True,
    'gzip_reads_one_buffer_ahead_at_most': True,
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-38s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
