"""Fixture: io.BytesIO binds, converts and refuses its arguments as CPython's does.

CPython's BytesIO (Modules/_io/bytesio.c) reads any buffer -- not only
bytes -- and refuses anything else with "a bytes-like object is required";
takes its sizes through __index__ or as None; refuses a negative absolute
seek, an unknown whence, a negative truncate size and a read-only readinto
buffer by name; answers IOBase's fileno, detach, read1, readinto1 and
_checkClosed; refuses getvalue and __getstate__ once closed; restarts on
__init__; and pickles through __getstate__/__setstate__, which validate
their state.

Grail's raised uncatchable Smalltalk errors for a str, None, int or array
value and for an __index__ size, padded the stream on an empty write past
the end, read one item rather than one byte per array slot, had no
fileno/detach/read1/readinto1/__setstate__, could not pickle, and
ignored __init__ (test_memoryio, test_gzip test_fileobj_without_name).

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import io
import pickle
from array import array

r = {}


class IntLike:
    def __init__(self, value):
        self.value = value

    def __index__(self):
        return self.value


class Closing:
    def __buffer__(self, flags):
        closing_target.close()
        return memoryview(b'A')


class Kept(io.BytesIO):
    def __init__(self, value, label):
        io.BytesIO.__init__(self, value)
        self.label = label


def outcome(call):
    try:
        return call()
    except (TypeError, ValueError, io.UnsupportedOperation) as e:
        return '%s: %s' % (type(e).__name__, e)


def fresh():
    return io.BytesIO(b'1234567890')


def closed():
    stream = fresh()
    stream.close()
    return stream


def overseek():
    stream = fresh()
    stream.seek(11)
    stream.write(b'')
    unchanged = stream.getvalue()
    stream.write(b'x')
    return unchanged, stream.getvalue()


def read_into(buffer):
    stream = fresh()
    count = stream.readinto(buffer)
    return count, bytes(buffer)


def restarted():
    stream = fresh()
    stream.read(3)
    stream.__init__(b'zz')
    return stream.getvalue(), stream.tell()


def pickled():
    stream = Kept(b'abcdef', 'kept')
    stream.seek(2)
    stream.extra = 1
    copy = pickle.loads(pickle.dumps(stream, protocol=2))
    return type(copy).__name__, copy.getvalue(), copy.tell(), copy.label, copy.extra


closing_target = io.BytesIO()

r['a_buffer_seeds_it_and_anything_else_is_refused'] = [
    io.BytesIO(array('b', [49, 50])).getvalue(), io.BytesIO(bytearray(b'ba')).getvalue(),
    io.BytesIO(None).getvalue(), io.BytesIO(initial_bytes=b'kw').getvalue(),
    outcome(lambda: io.BytesIO('str')), outcome(lambda: io.BytesIO([])),
    outcome(lambda: io.BytesIO(b'a', foo=1))]
r['sizes_take_index_objects_and_none'] = [
    fresh().read(IntLike(2)), fresh().readline(IntLike(3)), fresh().read(None),
    fresh().read1(IntLike(4)), fresh().read1(), fresh().readlines(None)]
r['sizes_refuse_anything_else'] = [
    outcome(lambda: fresh().read('')), outcome(lambda: fresh().read(1.5)),
    outcome(lambda: fresh().readline('')), outcome(lambda: fresh().readlines(''))]
r['readlines_stops_at_its_hint'] = io.BytesIO(b'ab\ncd\nef\n').readlines(4)
r['seek_refuses_as_cpythons'] = [
    outcome(lambda: fresh().seek(0.0)), outcome(lambda: fresh().seek(-1)),
    outcome(lambda: fresh().seek(1, 3)), outcome(lambda: fresh().seek(1, -1)),
    fresh().seek(-1, 1), fresh().seek(1, 2), fresh().seek(IntLike(4))]
r['truncate_refuses_as_cpythons'] = [
    outcome(lambda: fresh().truncate(-1)), outcome(lambda: fresh().truncate('0')),
    fresh().truncate(IntLike(8)), fresh().truncate(None)]
r['write_refuses_a_non_buffer'] = [
    outcome(lambda: fresh().write(None)), outcome(lambda: fresh().write('s')),
    outcome(lambda: fresh().writelines([b'a', 1])), fresh().write(array('b', [65, 66]))]
r['an_empty_write_past_the_end_writes_nothing'] = overseek()
r['an_exporter_that_closes_the_stream_is_refused'] = outcome(lambda: closing_target.write(Closing()))
r['readinto_counts_bytes_and_refuses_a_read_only_buffer'] = [
    read_into(bytearray(4)), read_into(memoryview(bytearray(3))),
    read_into(array('h', [0, 0]))[0],
    outcome(lambda: fresh().readinto('')), outcome(lambda: fresh().readinto(b'ab')),
    outcome(lambda: fresh().readinto(memoryview(b'ab'))), fresh().readinto1(bytearray(2))]
r['iobase_methods'] = [
    outcome(fresh().fileno), outcome(fresh().detach), fresh()._checkClosed(),
    outcome(closed().fileno), outcome(closed()._checkClosed)]
r['a_closed_stream_refuses'] = [
    outcome(closed().getvalue), outcome(closed().__getstate__),
    outcome(lambda: closed().truncate(0)), outcome(closed().readlines),
    outcome(lambda: closed().readinto(bytearray(1)))]
r['init_starts_it_over'] = restarted()
r['getstate_answers_value_position_and_dict'] = [fresh().__getstate__(), (lambda s: (setattr(s, 'foo', 3), s.__getstate__())[1])(fresh())]
r['setstate_refuses_as_cpythons'] = [
    outcome(lambda: fresh().__setstate__('x')), outcome(lambda: fresh().__setstate__((b'', 0.0, None))),
    outcome(lambda: fresh().__setstate__((b'', -1, None))), outcome(lambda: fresh().__setstate__((b'', 0, 0))),
    outcome(lambda: fresh().__setstate__((b'', 0))), outcome(lambda: fresh().__setstate__(('u', 0, None))),
    outcome(lambda: closed().__setstate__((b'', 0, None)))]
r['a_subclass_pickles_with_its_position_and_attributes'] = pickled()

TAKES = "TypeError: a bytes-like object is required, not '%s'"
CLOSED = 'ValueError: I/O operation on closed file.'
RW = 'TypeError: readinto() argument must be read-write bytes-like object, not %s'
EXPECTED = {
    'a_buffer_seeds_it_and_anything_else_is_refused': [
        b'12', b'ba', b'', b'kw', TAKES % 'str', TAKES % 'list',
        'TypeError: BytesIO() takes at most 1 argument (2 given)'],
    'sizes_take_index_objects_and_none': [
        b'12', b'123', b'1234567890', b'1234', b'1234567890', [b'1234567890']],
    'sizes_refuse_anything_else': [
        "TypeError: argument should be integer or None, not 'str'",
        "TypeError: argument should be integer or None, not 'float'",
        "TypeError: argument should be integer or None, not 'str'",
        "TypeError: integer argument expected, got 'str'"],
    'readlines_stops_at_its_hint': [b'ab\n', b'cd\n'],
    'seek_refuses_as_cpythons': [
        "TypeError: 'float' object cannot be interpreted as an integer",
        'ValueError: negative seek value -1',
        'ValueError: invalid whence (3, should be 0, 1 or 2)',
        'ValueError: invalid whence (-1, should be 0, 1 or 2)', 0, 11, 4],
    'truncate_refuses_as_cpythons': [
        'ValueError: negative size value -1',
        "TypeError: 'str' object cannot be interpreted as an integer", 8, 0],
    'write_refuses_a_non_buffer': [TAKES % 'NoneType', TAKES % 'str', TAKES % 'int', 2],
    'an_empty_write_past_the_end_writes_nothing': (b'1234567890', b'1234567890\x00x'),
    'an_exporter_that_closes_the_stream_is_refused': CLOSED,
    'readinto_counts_bytes_and_refuses_a_read_only_buffer': [
        (4, b'1234'), (3, b'123'), 4, RW % 'str', RW % 'bytes', RW % 'memoryview', 2],
    'iobase_methods': [
        'UnsupportedOperation: fileno', 'UnsupportedOperation: detach', None,
        'UnsupportedOperation: fileno', CLOSED],
    'a_closed_stream_refuses': [CLOSED] * 5,
    'init_starts_it_over': (b'zz', 0),
    'getstate_answers_value_position_and_dict': [(b'1234567890', 0, None), (b'1234567890', 0, {'foo': 3})],
    'setstate_refuses_as_cpythons': [
        'TypeError: _io.BytesIO.__setstate__ argument should be 3-tuple, got str',
        'TypeError: second item of state must be an integer, not float',
        'ValueError: position value cannot be negative',
        'TypeError: third item of state should be a dict, got a int',
        'TypeError: _io.BytesIO.__setstate__ argument should be 3-tuple, got tuple',
        TAKES % 'str', CLOSED],
    'a_subclass_pickles_with_its_position_and_attributes': ('Kept', b'abcdef', 2, 'kept', 1),
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-52s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
