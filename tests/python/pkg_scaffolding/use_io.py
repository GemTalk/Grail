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
