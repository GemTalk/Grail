"""Fixture: io.StringIO translates newlines, binds and refuses as CPython's does.

CPython's StringIO (Modules/_io/stringio.c) takes newline None, '', '\\n',
'\\r' and '\\r\\n': None turns \\r\\n and \\r into \\n as they are written,
'\\r' and '\\r\\n' write every \\n as themselves, '' splits lines at any of
the three, and None and '' report the endings seen as newlines.  It takes
its sizes through __index__ or as None; refuses an unknown whence, a
negative absolute seek and a nonzero relative one; answers TextIOBase's
encoding, errors, line_buffering, detach and fileno; refuses getvalue and
__getstate__ once closed; restarts on __init__; and pickles through a
4-item state.

Grail refused newline None, '\\r' and '\\r\\n' as NotImplementedError,
split lines at \\n alone, died uncatchably on an __index__ size, took any
relative seek, padded the stream on an empty write past the end, and could
not pickle (test_memoryio).

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import io
import pickle

r = {}


class IntLike:
    def __init__(self, value):
        self.value = value

    def __index__(self):
        return self.value


class Kept(io.StringIO):
    def __init__(self, value, label):
        io.StringIO.__init__(self, value, newline='')
        self.label = label


def outcome(call):
    try:
        return call()
    except (TypeError, ValueError, OSError) as e:
        return '%s: %s' % (type(e).__name__, e)


def fresh():
    return io.StringIO('1234567890')


def closed():
    stream = fresh()
    stream.close()
    return stream


def written(newline, *pieces):
    stream = io.StringIO(newline=newline)
    counts = [stream.write(piece) for piece in pieces]
    stream.seek(0)
    return counts, stream.getvalue(), list(stream), stream.newlines


def overseek():
    stream = fresh()
    stream.seek(11)
    stream.write('')
    unchanged = stream.getvalue()
    stream.write('x')
    return unchanged, stream.getvalue()


def restarted():
    stream = fresh()
    stream.read(3)
    stream.__init__('a\r\nb', None)
    return stream.getvalue(), stream.tell(), stream.newlines


def pickled():
    stream = Kept('a\rb', 'kept')
    stream.seek(2)
    stream.extra = 1
    copy = pickle.loads(pickle.dumps(stream, protocol=2))
    return type(copy).__name__, copy.getvalue(), copy.tell(), copy.label, copy.extra, list(copy)


r['newline_none_translates_and_reports_what_it_saw'] = written(None, 'a\n', 'b\r\n', 'c\rd')
r['newline_empty_splits_at_any_ending'] = written('', 'a\n', 'b\r', '\nc', '\rd')
r['newline_cr_and_crlf_write_newlines_as_themselves'] = [
    written('\r', 'a\nb\r\nc'), written('\r\n', 'a\nb\r\nc'), io.StringIO('a\nb', newline='\r\n').getvalue()]
r['newline_lf_changes_nothing'] = written('\n', 'a\nb\r\nc\rd')
r['an_initial_value_is_translated_too'] = [
    io.StringIO('a\r\nb\rc', newline=None).getvalue(), list(io.StringIO('a\r\nb\nc', newline='\r\n'))]
r['the_arguments_are_refused_as_cpythons'] = [
    outcome(lambda: io.StringIO(newline=b'\n')), outcome(lambda: io.StringIO(newline='error')),
    outcome(lambda: io.StringIO(5)), outcome(lambda: io.StringIO(5, newline='x')),
    outcome(lambda: io.StringIO('a', 'b', 'c')), outcome(lambda: io.StringIO(foo=1)),
    outcome(lambda: io.StringIO('a', initial_value='b')), io.StringIO(initial_value='kw').getvalue()]
r['sizes_take_index_objects_and_none'] = [
    fresh().read(IntLike(2)), fresh().readline(IntLike(3)), fresh().read(None),
    fresh().truncate(IntLike(3)), io.StringIO('ab\ncd\nef\n').readlines(IntLike(3))]
r['sizes_refuse_anything_else'] = [
    outcome(lambda: fresh().read('')), outcome(lambda: fresh().readline(1.5)),
    outcome(lambda: fresh().readlines('')), outcome(lambda: fresh().truncate('0')),
    outcome(lambda: fresh().truncate(-1))]
r['seek_refuses_as_cpythons'] = [
    outcome(lambda: fresh().seek(0.0)), outcome(lambda: fresh().seek(-1)),
    outcome(lambda: fresh().seek(1, 3)), outcome(lambda: fresh().seek(1, 1)),
    outcome(lambda: fresh().seek(-1, 2)), fresh().seek(0, 2), fresh().seek(IntLike(4))]
r['an_empty_write_past_the_end_writes_nothing'] = overseek()
r['write_refuses_a_non_str'] = [outcome(lambda: fresh().write(b'x')), outcome(lambda: fresh().write(None))]
r['textiobase_properties_and_methods'] = [
    fresh().encoding, fresh().errors, fresh().line_buffering, fresh().newlines,
    io.StringIO(newline='').newlines, outcome(fresh().fileno), outcome(fresh().detach),
    fresh()._checkClosed(), fresh()._checkReadable(), fresh()._checkSeekable(), fresh()._checkWritable()]
r['a_closed_stream_refuses'] = [
    outcome(closed().getvalue), outcome(closed().__getstate__), outcome(lambda: closed().newlines),
    outcome(lambda: closed().line_buffering), closed().encoding, outcome(closed()._checkClosed),
    outcome(closed()._checkReadable), outcome(lambda: closed().__setstate__(('', None, 0, None))),
    closed().flush()]
r['init_starts_it_over'] = restarted()
r['getstate_answers_value_newline_position_and_dict'] = [
    (lambda s: (setattr(s, 'foo', 1), s.__getstate__())[1])(fresh()),
    io.StringIO('a\r\nb', newline=None).__getstate__(), io.StringIO(newline='\r').__getstate__()]
r['setstate_refuses_as_cpythons'] = [
    outcome(lambda: fresh().__setstate__('x')), outcome(lambda: fresh().__setstate__(('a', None, 0.0, None))),
    outcome(lambda: fresh().__setstate__(('a', None, -1, None))), outcome(lambda: fresh().__setstate__(('a', None, 0, 0))),
    outcome(lambda: fresh().__setstate__((5, None, 0, None))), outcome(lambda: fresh().__setstate__(('a', 5, 0, None))),
    outcome(lambda: fresh().__setstate__(('a', 'f', 0, None))), outcome(lambda: fresh().__setstate__(('len', 0)))]
r['a_subclass_pickles_with_its_newline_position_and_attributes'] = pickled()

CLOSED = 'ValueError: I/O operation on closed file'
INTEGER_OR_NONE = "TypeError: argument should be integer or None, not '%s'"
EXPECTED = {
    'newline_none_translates_and_reports_what_it_saw': (
        [2, 3, 3], 'a\nb\nc\nd', ['a\n', 'b\n', 'c\n', 'd'], ('\r', '\n', '\r\n')),
    'newline_empty_splits_at_any_ending': (
        [2, 2, 2, 2], 'a\nb\r\nc\rd', ['a\n', 'b\r\n', 'c\r', 'd'], ('\r', '\n')),
    'newline_cr_and_crlf_write_newlines_as_themselves': [
        ([6], 'a\rb\r\rc', ['a\r', 'b\r', '\r', 'c'], None),
        ([6], 'a\r\nb\r\r\nc', ['a\r\n', 'b\r\r\n', 'c'], None), 'a\r\nb'],
    'newline_lf_changes_nothing': ([8], 'a\nb\r\nc\rd', ['a\n', 'b\r\n', 'c\rd'], None),
    'an_initial_value_is_translated_too': ['a\nb\nc', ['a\r\r\n', 'b\r\n', 'c']],
    'the_arguments_are_refused_as_cpythons': [
        'TypeError: newline must be str or None, not bytes', "ValueError: illegal newline value: 'error'",
        'TypeError: initial_value must be str or None, not int', "ValueError: illegal newline value: 'x'",
        'TypeError: StringIO() takes at most 2 arguments (3 given)',
        "TypeError: StringIO() got an unexpected keyword argument 'foo'",
        "TypeError: argument for StringIO() given by name ('initial_value') and position (1)", 'kw'],
    'sizes_take_index_objects_and_none': ['12', '123', '1234567890', 3, ['ab\n', 'cd\n']],
    'sizes_refuse_anything_else': [
        INTEGER_OR_NONE % 'str', INTEGER_OR_NONE % 'float', INTEGER_OR_NONE % 'str',
        INTEGER_OR_NONE % 'str', 'ValueError: Negative size value -1'],
    'seek_refuses_as_cpythons': [
        "TypeError: 'float' object cannot be interpreted as an integer",
        'ValueError: Negative seek position -1', 'ValueError: Invalid whence (3, should be 0, 1 or 2)',
        "OSError: Can't do nonzero cur-relative seeks", "OSError: Can't do nonzero cur-relative seeks", 10, 4],
    'an_empty_write_past_the_end_writes_nothing': ('1234567890', '1234567890\x00x'),
    'write_refuses_a_non_str': ["TypeError: string argument expected, got 'bytes'",
                                "TypeError: string argument expected, got 'NoneType'"],
    'textiobase_properties_and_methods': [
        None, None, False, None, None, 'UnsupportedOperation: fileno', 'UnsupportedOperation: detach',
        None, True, True, True],
    'a_closed_stream_refuses': [
        CLOSED, CLOSED, CLOSED, CLOSED, None, CLOSED + '.', CLOSED, CLOSED, None],
    'init_starts_it_over': ('a\nb', 0, '\r\n'),
    'getstate_answers_value_newline_position_and_dict': [
        ('1234567890', '\n', 0, {'foo': 1}), ('a\nb', None, 0, None), ('', '\r', 0, None)],
    'setstate_refuses_as_cpythons': [
        'TypeError: _io.StringIO.__setstate__ argument should be 4-tuple, got str',
        'TypeError: third item of state must be an integer, got float',
        'ValueError: position value cannot be negative',
        'TypeError: fourth item of state should be a dict, got a int',
        'TypeError: initial_value must be str or None, not int',
        'TypeError: newline must be str or None, not int',
        "ValueError: illegal newline value: 'f'",
        'TypeError: _io.StringIO.__setstate__ argument should be 4-tuple, got tuple'],
    'a_subclass_pickles_with_its_newline_position_and_attributes': (
        'Kept', 'a\rb', 2, 'kept', 1, ['b']),
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-58s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
