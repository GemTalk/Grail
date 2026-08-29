"""Fixture: the pure-Python io layer -- the ABCs and the BUFFERED classes.

Grail's ``io'' is written in Smalltalk and supplies the CONCRETE streams --
StringIO, BytesIO, FileIO, TextIOWrapper -- over GsFile and in-memory
collections.  Two layers around them were missing:

  * The ABCs.  io.IOBase / RawIOBase / BufferedIOBase / TextIOBase existed as
    EMPTY marker classes with no behaviour at all, so ``class X(io.RawIOBase)''
    inherited no closed, no close, no context manager, no _checkClosed -- the
    protocol every raw stream is written against.
  * The buffered layer.  io.BufferedReader / BufferedWriter / BufferedRWPair /
    BufferedRandom did not exist.

Both now come from CPython's own pure-Python implementation, vendored as
src/python/stdlib/_pyio.py, so what this fixture checks is not a Grail
reimplementation but the upstream semantics reaching Python code through
``io''.  That is why every check here is written to hold on CPython too: it
runs against the C _io there and against _pyio here, and the point is that
they agree.

The shape that motivated the work is socket.makefile(), which is exactly
``io.BufferedReader(SocketIO(self, 'r'), buffering)'' -- see the last two
checks, which is why a Grail-flavoured detail (the buffer over a socket) is
tested through a plain raw stream instead: the behaviour is the raw stream's.

TEXT MODE IS NOW IN.  It used to be the documented gap here: _pyio's
TextIOWrapper needs a real codec registry (codecs.lookup(enc).incrementaldecoder)
and Grail's ``codecs'' was a stub whose lookup raised LookupError for every
name, so socket.makefile('r') could not be built.  With the registry in place,
io.TextIOWrapper over a BUFFER delegates to _pyio's and io.text_encoding
exists -- the last three checks are that stack, including a multi-byte
character deliberately split across two buffer fills, which is the one thing
only a real incremental decoder gets right.
"""

import io


class MemoryRaw(io.RawIOBase):
    """A raw stream over a bytes buffer -- the RawIOBase contract and nothing
    else, so what the buffered classes get is only what they are entitled to.
    Deliberately NOT seekable: a socket is not, and that is the case the
    buffered layer has to handle."""

    def __init__(self, data=b'', max_chunk=None):
        self._data = bytes(data)
        self._pos = 0
        # A cap on how much ONE readinto will hand back, however much was
        # asked for.  A socket behaves this way and a raw stream is allowed
        # to; a_split_multibyte_character needs it, because otherwise the
        # buffered layer is free to satisfy a read in one go -- both CPython's
        # C BufferedReader and _pyio's bypass the buffer for a large read1 --
        # and the chunk boundary the check is about never happens.
        self._max_chunk = max_chunk
        self.written = bytearray()
        self.read_sizes = []

    def readable(self):
        return True

    def writable(self):
        return True

    def seekable(self):
        return False

    def readinto(self, b):
        # A real raw stream refuses to work once closed -- FileIO and
        # socket.SocketIO both open with _checkClosed().  It matters here:
        # WITHOUT it, a closed BufferedReader still answers buffered data
        # under _pyio while CPython's C _io raises, because the check that
        # stops it lives in the raw, not in the buffer.
        self._checkClosed()
        want = len(b) if self._max_chunk is None else min(len(b), self._max_chunk)
        n = min(want, len(self._data) - self._pos)
        b[:n] = self._data[self._pos:self._pos + n]
        self._pos += n
        self.read_sizes.append(n)
        return n

    def write(self, b):
        self.written += bytes(b)
        return len(b)


def abcs_are_real_classes():
    # They were markers; now they are a hierarchy.
    return [
        io.IOBase.__name__,
        issubclass(io.RawIOBase, io.IOBase),
        issubclass(io.BufferedIOBase, io.IOBase),
        issubclass(io.TextIOBase, io.IOBase),
        issubclass(io.BufferedReader, io.BufferedIOBase),
    ]


def iobase_protocol():
    # The behaviour a marker class could not provide.
    s = MemoryRaw(b'one\ntwo\n')
    before = s.closed
    lines = list(s)               # IOBase.__iter__ over readline
    s.close()
    return [before, lines, s.closed, s.closed]


def iobase_context_manager():
    s = MemoryRaw(b'x')
    with s as entered:
        inside = (entered is s, s.closed)
    return [inside[0], inside[1], s.closed]


def unsupported_is_raised_not_missing():
    # A marker class answered AttributeError for these; the real IOBase
    # answers what CPython answers.
    s = MemoryRaw(b'')
    try:
        s.fileno()
    except OSError as e:            # UnsupportedOperation subclasses OSError
        return type(e).__name__
    return 'no-raise'


def reader_reads():
    return [
        io.BufferedReader(MemoryRaw(b'hello world')).read(),
        io.BufferedReader(MemoryRaw(b'hello world')).read(5),
        io.BufferedReader(MemoryRaw(b'ab\ncd\n')).readline(),
        io.BufferedReader(MemoryRaw(b'ab\ncd\n')).readlines(),
        list(io.BufferedReader(MemoryRaw(b'x\ny\n'))),
    ]


def reader_peek_does_not_consume():
    b = io.BufferedReader(MemoryRaw(b'abcdef'), 8)
    peeked = b.peek(3)[:3]
    return [peeked, b.read(3), b.read()]


def reader_spans_the_buffer():
    # THE POINT OF BUFFERING: a line longer than the buffer, and a read()
    # larger than it, must still come back whole -- the buffered layer refills
    # from the raw as many times as it takes.  Deliberately NOT asserting how
    # many raw reads that took, or how large each was: CPython's C
    # BufferedReader sizes its raw reads by its own rules and a Grail run has
    # no business matching them.
    raw = MemoryRaw(b'a-very-long-first-line\nshort\n')
    b = io.BufferedReader(raw, 4)
    first = b.readline()
    rest = b.read()
    return [first, rest, len(raw.read_sizes) > 1]


def reader_read1_returns_a_prefix():
    # read1() is "at most one raw read" -- how much that yields is the
    # implementation's business, so check only that what comes back is a
    # non-empty prefix of the stream.
    b = io.BufferedReader(MemoryRaw(b'abcdefgh'), 4)
    got = b.read1(100)
    return [b'abcdefgh'.startswith(got), len(got) > 0]


def writer_buffers_until_flush():
    raw = MemoryRaw()
    w = io.BufferedWriter(raw, 64)
    w.write(b'hello ')
    w.write(b'world')
    held = bytes(raw.written)      # still buffered -- nothing reached the raw
    w.flush()
    return [held, bytes(raw.written)]


def writer_flushes_when_full():
    raw = MemoryRaw()
    w = io.BufferedWriter(raw, 4)
    w.write(b'abcdefgh')
    return len(raw.written) > 0


def writer_close_flushes():
    raw = MemoryRaw()
    w = io.BufferedWriter(raw, 64)
    w.write(b'tail')
    w.close()
    return [bytes(raw.written), w.closed]


def rwpair_reads_and_writes():
    rd, wr = MemoryRaw(b'ping\n'), MemoryRaw()
    p = io.BufferedRWPair(rd, wr, 8)
    got = p.readline()
    p.write(b'pong\n')
    p.flush()
    return [got, bytes(wr.written)]


def buffered_expose_their_raw():
    raw = MemoryRaw(b'')
    b = io.BufferedReader(raw)
    return [b.raw is raw, b.readable(), b.writable(), b.seekable()]


def detach_hands_the_raw_back():
    raw = MemoryRaw(b'')
    b = io.BufferedWriter(raw)
    handed = b.detach()
    return [handed is raw, b.raw is None]


def closing_the_buffer_closes_the_raw():
    raw = MemoryRaw(b'')
    b = io.BufferedReader(raw)
    b.close()
    return [b.closed, raw.closed]


def reading_a_closed_buffer_raises():
    b = io.BufferedReader(MemoryRaw(b'abc'))
    b.close()
    try:
        b.read()
    except ValueError:            # message differs between _io and _pyio
        return 'ValueError'
    return 'no-raise'


def a_socket_shaped_stack():
    # What socket.makefile('rb') builds: a BufferedReader over a raw stream
    # that is readable, writable and NOT seekable.  No socket involved -- the
    # buffered layer only ever sees the raw contract.
    raw = MemoryRaw(b'GET /x HTTP/1.1\r\nHost: h\r\n\r\n')
    f = io.BufferedReader(raw, io.DEFAULT_BUFFER_SIZE)
    request = f.readline()
    header = f.readline()
    blank = f.readline()
    return [request, header, blank]


def text_encoding_is_there():
    # socket.makefile() in text mode calls io.text_encoding() to turn an
    # ``encoding=None'' into a real codec name before building the wrapper.
    # What it answers FOR None differs by design -- CPython a 'locale'
    # sentinel, Grail 'utf-8' outright, since there is no per-process text
    # locale there -- so the portable check is that it exists and passes a
    # real name through untouched.
    return [hasattr(io, 'text_encoding'), io.text_encoding('latin-1')]


def text_over_a_buffer():
    # What socket.makefile('r') builds, one layer up from a_socket_shaped_stack:
    # a TextIOWrapper over a BufferedReader over a NON-seekable raw stream.
    # Universal newlines turn the wire's CRLF into '\n', and the header value
    # is multi-byte UTF-8 -- asserted as a bool so the expectation stays ASCII.
    raw = MemoryRaw('GET /x HTTP/1.1\r\nHost: caf\u00e9\r\n\r\n'.encode('utf-8'))
    f = io.TextIOWrapper(io.BufferedReader(raw, io.DEFAULT_BUFFER_SIZE),
                         io.text_encoding(None), None, None)
    lines = [f.readline(), f.readline(), f.readline()]
    return [lines[0], lines[1] == 'Host: caf\u00e9\n', lines[2]]


def a_split_multibyte_character():
    # Why the codec has to be INCREMENTAL rather than a per-chunk decode: the
    # two bytes of 'e-acute' land in different buffer fills.  A decoder that
    # treated each fill as a complete input raises on the truncated sequence;
    # only one that holds the partial sequence back and resumes gets the
    # character.
    #
    # Getting the split to actually HAPPEN takes care, and the first version of
    # this check did not: a bare f.read() makes TextIOWrapper ask the buffer
    # for everything and decode once with final=True, so the whole point is
    # skipped and the check passes with the incremental logic torn out.  It has
    # to be a SIZED read -- that is what routes through _read_chunk, one
    # buffer.read1() per fill -- over a raw stream that refuses to hand out
    # more than a fill at a time.
    text = 'xxx' + '\u00e9' + 'yyy'
    raw = MemoryRaw(text.encode('utf-8'), max_chunk=4)
    f = io.TextIOWrapper(io.BufferedReader(raw, 4), 'utf-8')
    out = []
    while True:
        ch = f.read(1)
        if not ch:
            break
        out.append(ch)
    # The second half is the check ON THE CHECK: if the codec never saw a
    # split there is nothing here to get right, and a green result would mean
    # nothing.  Four bytes at a time over a seven-byte string is at least two
    # fills, with the character's first byte ending the first one.
    return [''.join(out) == text, max(raw.read_sizes) <= 4]


r = {
    'abcs_are_real_classes': abcs_are_real_classes(),
    'iobase_protocol': iobase_protocol(),
    'iobase_context_manager': iobase_context_manager(),
    'unsupported_is_raised_not_missing': unsupported_is_raised_not_missing(),
    'reader_reads': reader_reads(),
    'reader_peek_does_not_consume': reader_peek_does_not_consume(),
    'reader_spans_the_buffer': reader_spans_the_buffer(),
    'reader_read1_returns_a_prefix': reader_read1_returns_a_prefix(),
    'writer_buffers_until_flush': writer_buffers_until_flush(),
    'writer_flushes_when_full': writer_flushes_when_full(),
    'writer_close_flushes': writer_close_flushes(),
    'rwpair_reads_and_writes': rwpair_reads_and_writes(),
    'buffered_expose_their_raw': buffered_expose_their_raw(),
    'detach_hands_the_raw_back': detach_hands_the_raw_back(),
    'closing_the_buffer_closes_the_raw': closing_the_buffer_closes_the_raw(),
    'reading_a_closed_buffer_raises': reading_a_closed_buffer_raises(),
    'a_socket_shaped_stack': a_socket_shaped_stack(),
    'text_encoding_is_there': text_encoding_is_there(),
    'text_over_a_buffer': text_over_a_buffer(),
    'a_split_multibyte_character': a_split_multibyte_character(),
}


EXPECTED = {
    'abcs_are_real_classes': ['IOBase', True, True, True, True],
    'iobase_protocol': [False, [b'one\n', b'two\n'], True, True],
    'iobase_context_manager': [True, False, True],
    'unsupported_is_raised_not_missing': 'UnsupportedOperation',
    'reader_reads': [b'hello world', b'hello', b'ab\n', [b'ab\n', b'cd\n'],
                     [b'x\n', b'y\n']],
    'reader_peek_does_not_consume': [b'abc', b'abc', b'def'],
    'reader_spans_the_buffer': [b'a-very-long-first-line\n', b'short\n', True],
    'reader_read1_returns_a_prefix': [True, True],
    'writer_buffers_until_flush': [b'', b'hello world'],
    'writer_flushes_when_full': True,
    'writer_close_flushes': [b'tail', True],
    'rwpair_reads_and_writes': [b'ping\n', b'pong\n'],
    'buffered_expose_their_raw': [True, True, False, False],
    'detach_hands_the_raw_back': [True, True],
    'closing_the_buffer_closes_the_raw': [True, True],
    'reading_a_closed_buffer_raises': 'ValueError',
    'a_socket_shaped_stack': [b'GET /x HTTP/1.1\r\n', b'Host: h\r\n', b'\r\n'],
    'text_encoding_is_there': [True, 'latin-1'],
    'text_over_a_buffer': ['GET /x HTTP/1.1\n', True, '\n'],
    'a_split_multibyte_character': [True, True],
}


# Checks whose EXPECTED describes CPython, and which Grail does not yet meet.
# An XPASS means the gap closed and the entry should go.  Empty since the codec
# registry landed and text mode over a buffer started working; the machinery
# stays because the next documented gap should be pinned the same way.
GRAIL_ONLY = []


if __name__ == '__main__':
    for key, expected in EXPECTED.items():
        if key in GRAIL_ONLY:
            continue
        actual = r[key]
        print('%-5s %-34s -> %r' % ('OK' if actual == expected else 'FAIL',
                                    key, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-5s %-34s is not in EXPECTED' % ('FAIL', extra))
    # These assert a Grail LIMITATION, so CPython is expected to disagree.
    # XFAIL is that expected disagreement and is not a failure; XPASS means
    # CPython now agrees and the check no longer documents anything.
    print('--- documented Grail limits: CPython is expected to differ ---')
    for key in GRAIL_ONLY:
        actual = r[key]
        print('%-5s %-34s -> %r' % ('XPASS' if actual == EXPECTED[key]
                                    else 'XFAIL', key, actual))
