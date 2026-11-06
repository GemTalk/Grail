"""Fixture: io.BufferedWriter.write takes a buffer and writes its bytes.

CPython's BufferedWriter.write (Modules/_io/bufferedio.c,
_io__Buffered_write) converts its argument as a buffer before anything else,
so whatever is not one is PyObject_GetBuffer's TypeError -- "a bytes-like
object is required, not 'list'" -- even on a closed file, and an array is
written as its bytes.  Grail's io.BufferedWriter is _pyio's, which refused only
a str and let bytearray.extend take the rest: write([]) wrote nothing and
raised nothing (test_gzip test_write_incompatible_type), and write(3) was
"can't extend bytearray with int".

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import array
import gzip
import io

r = {}


def outcome(call):
    try:
        return call()
    except Exception as e:
        return '%s: %s' % (type(e).__name__, e)


raw = io.BytesIO()
writer = io.BufferedWriter(raw)
r['what_is_no_buffer_is_refused'] = [
    outcome(lambda: writer.write(data)) for data in ('', [], 'ab', 3, None)]
r['a_buffer_is_written_as_its_bytes'] = [
    outcome(lambda: writer.write(data))
    for data in (b'xy', bytearray(b'z'), memoryview(b'mv'), array.array('H', [1]))]
writer.flush()
r['the_bytes_reach_the_raw_stream'] = raw.getvalue() == b'xyzmv' + array.array('H', [1]).tobytes()
writer.close()
r['the_argument_is_refused_before_the_closed_file'] = [
    outcome(lambda: writer.write(b'a')), outcome(lambda: writer.write([]))]
compressed = gzip.GzipFile(fileobj=io.BytesIO(), mode='wb')
r['a_gzip_file_refuses_what_is_no_buffer'] = [
    outcome(lambda: compressed.write('')), outcome(lambda: compressed.write([])), compressed.write(b'ok')]
compressed.close()

EXPECTED = {
    'what_is_no_buffer_is_refused': [
        "TypeError: a bytes-like object is required, not 'str'",
        "TypeError: a bytes-like object is required, not 'list'",
        "TypeError: a bytes-like object is required, not 'str'",
        "TypeError: a bytes-like object is required, not 'int'",
        "TypeError: a bytes-like object is required, not 'NoneType'"],
    'a_buffer_is_written_as_its_bytes': [2, 1, 2, 2],
    'the_bytes_reach_the_raw_stream': True,
    'the_argument_is_refused_before_the_closed_file': [
        'ValueError: write to closed file', "TypeError: a bytes-like object is required, not 'list'"],
    'a_gzip_file_refuses_what_is_no_buffer': [
        "TypeError: a bytes-like object is required, not 'str'",
        "TypeError: a bytes-like object is required, not 'list'", 2],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-48s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
