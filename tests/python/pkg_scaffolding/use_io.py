import io


def stringio_roundtrip(s):
    buf = io.StringIO()
    buf.write(s)
    buf.seek(0)
    return buf.read()


def stringio_initial(initial):
    buf = io.StringIO(initial)
    return buf.read()


def stringio_readline_iter():
    buf = io.StringIO("a\nb\nc\n")
    return [line for line in buf]


def stringio_tell_seek():
    buf = io.StringIO()
    buf.write("hello")
    pos1 = buf.tell()
    buf.seek(0)
    pos2 = buf.tell()
    return (pos1, pos2)


def stringio_getvalue_after_seek():
    buf = io.StringIO()
    buf.write("hello")
    buf.seek(0)
    buf.write("HE")
    return buf.getvalue()


def bytesio_roundtrip(data):
    buf = io.BytesIO()
    buf.write(data)
    buf.seek(0)
    return buf.read()


def bytesio_partial_read(data, n):
    buf = io.BytesIO(data)
    return buf.read(n)


def bytesio_readline():
    buf = io.BytesIO(b"line1\nline2\nline3")
    return [buf.readline(), buf.readline(), buf.readline(), buf.readline()]


def bytesio_with_block(data):
    with io.BytesIO(data) as buf:
        first = buf.read(2)
    return first, buf.closed


def bytesio_seek_end_then_truncate():
    buf = io.BytesIO(b"abcdef")
    buf.seek(3)
    buf.truncate()
    return buf.getvalue()


def stringio_writelines():
    buf = io.StringIO()
    buf.writelines(["a", "b", "c"])
    return buf.getvalue()


def io_seek_constants():
    # Werkzeug uses io.SEEK_SET / SEEK_CUR / SEEK_END for relative
    # seeks against request.stream.  Module attributes 0 / 1 / 2.
    return (io.SEEK_SET, io.SEEK_CUR, io.SEEK_END)


def bytesio_seek_end_relative():
    # buf.seek(-2, io.SEEK_END) → read trailing 2 bytes.  Exercises
    # the seek(offset, whence) two-positional form and the SEEK_END
    # constant together.
    buf = io.BytesIO(b"abcdef")
    buf.seek(0, io.SEEK_END)
    end_pos = buf.tell()
    buf.seek(-2, io.SEEK_END)
    return (end_pos, buf.read())


def stringio_close_then_read():
    # Reading from a closed buffer raises ValueError ("I/O operation
    # on closed file" per CPython).  Werkzeug relies on this for
    # request-lifecycle assertions.
    buf = io.StringIO("x")
    buf.close()
    try:
        buf.read()
        return "no-error"
    except ValueError:
        return "caught"


def bytesio_getbuffer():
    # bytes(buf.getbuffer()) round-trips the underlying data.
    # CPython returns a memoryview; Grail returns a bytes copy.
    buf = io.BytesIO(b"hello")
    return bytes(buf.getbuffer())
