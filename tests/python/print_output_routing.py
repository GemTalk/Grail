"""Fixtures for PrintOutputRoutingTestCase -- print()'s keywords and where it
writes.

``print'' ignored every keyword.  sep/end/file/flush were accepted and dropped,
and the separator was wrong even without them: a space was written AFTER each
object rather than BETWEEN them, so ``print('a', 'b')'' produced ``a b '' with a
trailing space, and there was no way to suppress the newline.

WHERE IT WRITES is the half with reach.  The target is the ``file'' argument, or
``sys.stdout'' when there is none -- read at CALL TIME, which is what makes
test.support.captured_stdout() work.  Grail leaves sys.stdout as None, meaning
the console, so an ordinary print still reaches the Transcript.

Every expectation was checked against CPython 3.14.
"""

import io
import sys


def _to_string(*args, **kw):
    buf = io.StringIO()
    kw['file'] = buf
    print(*args, **kw)
    return buf.getvalue()


def separator_is_between_not_after():
    """THE BUG.  A trailing separator after the last object is not CPython's
    output, and no test could see it while print ignored ``file'' too."""
    return (_to_string('a', 'b'), _to_string(1, 2, 3, sep='*'), _to_string('a'))


def end_replaces_the_newline():
    return (_to_string('a', end=''), _to_string('a', end='+'),
            _to_string(1, 'a', 1.3, sep='*', end='+'))


def no_arguments_prints_just_the_end():
    return _to_string()


def none_means_the_default():
    """``sep=None'' is the same as omitting it -- not an empty separator."""
    return (_to_string('a\n', 'b', sep=None), _to_string('a\n', 'b', end=None),
            _to_string('a\n', 'b', sep=None, end=None))


def objects_are_stringified():
    class S:
        def __str__(self):
            return '*'
    return (_to_string(S()), _to_string(None), _to_string(S(), 1))


def a_reassigned_sys_stdout_is_honoured():
    """Read at CALL TIME, so redirection works -- test.support's
    captured_stdout() is exactly this."""
    old = sys.stdout
    buf = io.StringIO()
    sys.stdout = buf
    try:
        print()
        print('123')
    finally:
        sys.stdout = old
    return buf.getvalue()


def a_bad_separator_type_is_a_type_error():
    out = []
    for kw in ('sep', 'end'):
        try:
            print('', **{kw: 3})
            out.append('NOT RAISED')
        except TypeError as e:
            out.append(str(e))
    return out


def a_file_without_write_is_an_attribute_error():
    """CPython raises AttributeError naming the missing method; a bare send
    produced an uncatchable MessageNotUnderstood."""
    try:
        print('', file='')
        return 'NOT RAISED'
    except AttributeError:
        return 'AttributeError'


def flush_is_called_when_asked():
    class filelike:
        def __init__(self):
            self.written = ''
            self.flushed = 0

        def write(self, s):
            self.written += s

        def flush(self):
            self.flushed += 1
    f = filelike()
    print(1, file=f, end='', flush=True)
    print(2, file=f, end='', flush=True)
    print(3, file=f, flush=False)
    return (f.written, f.flushed)


def an_exception_from_flush_propagates():
    """NOT swallowed -- swallowing turns a reported failure into a silent
    one."""
    class noflush:
        def write(self, s):
            pass

        def flush(self):
            raise RuntimeError
    try:
        print(1, file=noflush(), flush=True)
        return 'NOT RAISED'
    except RuntimeError:
        return 'RuntimeError'
