"""Fixture: three builtin behaviours CPython's email package relies on.

* io.StringIO honours all five ``newline`` values.  Grail refused None, '\\r'
  and '\\r\\n', and treated '' as '\\n', so a bare '\\r' ended no line --
  email.feedparser reads through StringIO(newline='') and joined a
  CR-terminated line to the next (test_email test_newlines).  write()
  answers the length of the str it was given, not of the translated text.
* bytes and bytearray compare equal to a memoryview of the same bytes, in both
  directions.  ``b'x' == memoryview(b'x')'' was False while the reflected
  spelling was True (test_message test_get_bytes_payload_with_...).
* A codec name holding a lone surrogate is UnicodeEncodeError, which
  email._encoded_words catches.  It was an uncatchable Smalltalk
  MessageNotUnderstood that ended the whole test module.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import io

r = {}


def outcome(fn):
    try:
        return fn()
    except Exception as e:
        return '%s: %s' % (type(e).__name__, e)


def lines(newline, text='a\nb\rc\r\nd'):
    stream = io.StringIO(newline=newline)
    stream.write(text)
    stream.seek(0)
    return stream.readlines(), stream.getvalue()


r['newline_empty'] = lines('')
r['newline_none'] = lines(None)
r['newline_lf'] = lines('\n')
r['newline_cr'] = lines('\r')
r['newline_crlf'] = lines('\r\n')
r['newline_none_initial_value'] = io.StringIO('x\r\ny\rz', newline=None).getvalue()
r['newline_none_cr_ends_each_write'] = (lambda s: (s.write('a\r'), s.write('\nb'),
                                                   s.getvalue())[-1])(io.StringIO(newline=None))
r['newline_empty_iterates'] = list(io.StringIO('a\rb\r\nc', newline=''))
r['newline_illegal'] = outcome(lambda: io.StringIO(newline='x'))


def written(stream, text, at=None):
    if at is not None:
        stream.seek(at)
    return stream.write(text), stream.getvalue()


r['write_answers_the_untranslated_length'] = (
    written(io.StringIO(newline='\r\n'), 'a\nb'),
    written(io.StringIO(newline=None), 'a\r\nb'),
    written(io.StringIO('abc'), 'x', 5),
    written(io.StringIO('abcdef'), 'XY€', 2),
    written(io.StringIO('abc'), 'XYZW', 1))

view = memoryview(b'ab')
r['memoryview_equality'] = (b'ab' == view, view == b'ab', bytearray(b'ab') == view,
                            view == bytearray(b'ab'), b'ab' != view, b'ac' == view)

r['surrogate_codec_name'] = (outcome(lambda: b'x'.decode('utf-8\udce2')),
                             outcome(lambda: b'x'.decode('utf-8\udce2', 'strict')))

EXPECTED = {
    'newline_empty': (['a\n', 'b\r', 'c\r\n', 'd'], 'a\nb\rc\r\nd'),
    'newline_none': (['a\n', 'b\n', 'c\n', 'd'], 'a\nb\nc\nd'),
    'newline_lf': (['a\n', 'b\rc\r\n', 'd'], 'a\nb\rc\r\nd'),
    'newline_cr': (['a\r', 'b\r', 'c\r', '\r', 'd'], 'a\rb\rc\r\rd'),
    'newline_crlf': (['a\r\n', 'b\rc\r\r\n', 'd'], 'a\r\nb\rc\r\r\nd'),
    'newline_none_initial_value': 'x\ny\nz',
    'newline_none_cr_ends_each_write': 'a\n\nb',
    'newline_empty_iterates': ['a\r', 'b\r\n', 'c'],
    'newline_illegal': "ValueError: illegal newline value: 'x'",
    'write_answers_the_untranslated_length': (
        (3, 'a\r\nb'), (4, 'a\nb'), (1, 'abc\x00\x00x'), (3, 'abXY€f'), (4, 'aXYZW')),
    'memoryview_equality': (True, True, True, True, False, False),
    'surrogate_codec_name': (
        "UnicodeEncodeError: 'utf-8' codec can't encode character '\\udce2' "
        "in position 5: surrogates not allowed",) * 2,
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        print('%-5s %-32s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL',
                                    key, actual))
    print(SUMMARY)
