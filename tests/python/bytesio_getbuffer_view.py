"""io.BytesIO.getbuffer() answers a writable memoryview over the stream (#1637).

Grail's getbuffer answered a bytes copy: it had no .nbytes, and writing into
it raised TypeError instead of changing the stream.  Werkzeug's send_file
sizes an in-memory file with ``file.getbuffer().nbytes``, so
``flask.send_file(io.BytesIO(...))`` answered 500.

A view derived from another -- a slice or a cast -- now takes its writability
and window from that view, not from the source: a slice of a read-only view
over a bytearray accepted writes, a slice of getbuffer()'s view refused them,
and a cast of a slice covered the whole source.

Not covered: CPython refuses write/truncate/close with BufferError while a
view is alive.  Liveness there is a refcount, which Grail does not have, so
these rows release every view (or let it go) before resizing.

EXPECTED is CPython 3.14's output; mismatches() is what the Smalltalk test case
asserts is empty.
"""

import io

r = {}


def t(label, thunk):
    try:
        r[label] = repr(thunk())
    except Exception as e:
        r[label] = '%s: %s' % (type(e).__name__, e)


def write_through():
    b = io.BytesIO(b'abc')
    v = b.getbuffer()
    v[0] = ord('z')
    return b.getvalue()


def slice_write_through():
    b = io.BytesIO(b'hello')
    v = b.getbuffer()
    v[1:3] = b'EL'
    return b.getvalue(), b.read()


def released_then_written():
    b = io.BytesIO(b'ab')
    v = b.getbuffer()
    v.release()
    b.seek(0, 2)
    b.write(b'cd')
    return b.getvalue(), b.getbuffer().nbytes


def with_block():
    b = io.BytesIO(b'xyz')
    with b.getbuffer() as v:
        inner = bytes(v)
    return inner, v.__class__.__name__


def closed_stream():
    b = io.BytesIO(b'x')
    b.close()
    return b.getbuffer()


def view_survives_read():
    b = io.BytesIO(b'hello')
    b.seek(2)
    v = b.getbuffer()
    return bytes(v), b.read(), b.tell()


def nbytes_then_write():
    # The Werkzeug shape: size the stream, drop the view, keep using it.
    b = io.BytesIO(b'data')
    size = b.getbuffer().nbytes
    b.seek(0, 2)
    b.write(b'!')
    return size, b.getvalue()


def cast_write_through():
    b = io.BytesIO(b'abc')
    c = b.getbuffer().cast('B')
    c[2] = ord('Z')
    return c.readonly, b.getvalue()


def readonly_slice_refuses():
    ba = bytearray(b'abc')
    m = memoryview(ba).toreadonly()
    try:
        m[0:1][0] = ord('z')
    except TypeError as e:
        return 'TypeError: %s' % e, ba
    return 'wrote', ba


def subclass_view():
    class Sub(io.BytesIO):
        pass
    return type(Sub(b'q').getbuffer()).__name__


t('type', lambda: type(io.BytesIO(b'abc').getbuffer()).__name__)
t('nbytes', lambda: io.BytesIO(b'abc').getbuffer().nbytes)
t('len', lambda: len(io.BytesIO(b'abcd').getbuffer()))
t('readonly', lambda: io.BytesIO(b'abc').getbuffer().readonly)
t('format', lambda: io.BytesIO(b'abc').getbuffer().format)
t('itemsize', lambda: io.BytesIO(b'abc').getbuffer().itemsize)
t('shape', lambda: io.BytesIO(b'abc').getbuffer().shape)
t('bytes', lambda: bytes(io.BytesIO(b'hello').getbuffer()))
t('tobytes', lambda: io.BytesIO(b'hello').getbuffer().tobytes())
t('index', lambda: io.BytesIO(b'hello').getbuffer()[1])
t('slice', lambda: io.BytesIO(b'hello').getbuffer()[1:3].tobytes())
t('empty_nbytes', lambda: io.BytesIO().getbuffer().nbytes)
t('empty_bytes', lambda: bytes(io.BytesIO().getbuffer()))
t('write_through', write_through)
t('slice_write_through', slice_write_through)
t('released_then_written', released_then_written)
t('with_block', with_block)
t('closed_stream', closed_stream)
t('view_survives_read', view_survives_read)
t('nbytes_then_write', nbytes_then_write)
t('subclass_view', subclass_view)
t('cast_write_through', cast_write_through)
t('readonly_slice_refuses', readonly_slice_refuses)
t('readonly_cast', lambda: memoryview(bytearray(b'ab')).toreadonly().cast('B').readonly)
t('slice_cast_window', lambda: memoryview(bytearray(b'abcd'))[1:3].cast('B').tobytes())
t('bad_value', lambda: io.BytesIO(b'a').getbuffer().__setitem__(0, 256))
t('out_of_range', lambda: io.BytesIO(b'a').getbuffer().__setitem__(5, 1))


EXPECTED = {
    'bad_value': "ValueError: memoryview: invalid value for format 'B'",
    'bytes': "b'hello'",
    'cast_write_through': "(False, b'abZ')",
    'closed_stream': 'ValueError: I/O operation on closed file.',
    'empty_bytes': "b''",
    'empty_nbytes': '0',
    'format': "'B'",
    'index': '101',
    'itemsize': '1',
    'len': '4',
    'nbytes': '3',
    'nbytes_then_write': "(4, b'data!')",
    'out_of_range': 'IndexError: index out of bounds on dimension 1',
    'readonly': 'False',
    'readonly_cast': 'True',
    'readonly_slice_refuses': "('TypeError: cannot modify read-only memory', bytearray(b'abc'))",
    'released_then_written': "(b'abcd', 4)",
    'shape': '(3,)',
    'slice': "b'el'",
    'slice_cast_window': "b'bc'",
    'slice_write_through': "(b'hELlo', b'hELlo')",
    'subclass_view': "'memoryview'",
    'tobytes': "b'hello'",
    'type': "'memoryview'",
    'view_survives_read': "(b'hello', b'llo', 5)",
    'with_block': "(b'xyz', 'memoryview')",
    'write_through': "b'zbc'",
}


def mismatches():
    return sorted(k for k in EXPECTED if r.get(k) != EXPECTED[k])


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-4s %s: %r' % ('OK' if actual == EXPECTED[k] else 'DIFF', k, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-4s %s is not in EXPECTED' % ('DIFF', extra))
