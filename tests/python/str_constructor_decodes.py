"""Fixture: str(object, encoding, errors) decodes as CPython's does.

CPython's str() (Objects/unicodeobject.c unicode_vectorcall, unicode_new_impl
and PyUnicode_FromEncodedObject) checks that encoding and errors are str
before anything else, answers '' when there is no object whatever else is
given, and decodes bytes and any other buffer -- a memoryview, a bytearray,
an array -- refusing a str by name and anything else as not bytes-like.
Grail stringified a non-bytes object given an encoding (str(5, 'utf-8') was
'5', and str(memoryview(b'..'), 'utf-8') was '<memory at ...>'), decoded the
default '' when only errors was given, and took a fourth positional argument
without complaint.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import array

r = {}


def outcome(thunk):
    try:
        return thunk()
    except Exception as e:
        return '%s: %s' % (type(e).__name__, e)


cent = '¢'.encode('utf-8')

r['buffers_decode'] = [str(memoryview(b'character buffers'), 'utf-8', 'strict'),
                       str(bytearray(b'ab'), 'ascii'), str(array.array('b', b'hi'), 'ascii'),
                       str(cent, errors='strict'), str(object=b'x', encoding='ascii')]
r['no_object_is_empty'] = [str(), str(errors='strict'), str(encoding='ascii')]
r['refused'] = [outcome(lambda: str(5, 'utf-8')),
                outcome(lambda: str(1, 1)),
                outcome(lambda: str(1, encoding=1)),
                outcome(lambda: str(b'x', 'utf-8', 1)),
                outcome(lambda: str(b'x', encoding=b'utf-8')),
                outcome(lambda: str('x', 'utf-8')),
                outcome(lambda: str(cent, encoding='ascii')).split(':')[0],
                outcome(lambda: str('too', 'many', 'argu', 'ments')),
                outcome(lambda: str(1, '', '', 1)),
                outcome(lambda: str(test=1))]
r['a_subclass_stays_one'] = type(type('S', (str,), {})(b'ab', 'ascii')).__name__

EXPECTED = {
    'buffers_decode': ['character buffers', 'ab', 'hi', '¢', 'x'],
    'no_object_is_empty': ['', '', ''],
    'refused': ['TypeError: decoding to str: need a bytes-like object, int found',
                "TypeError: str() argument 'encoding' must be str, not int",
                "TypeError: str() argument 'encoding' must be str, not int",
                "TypeError: str() argument 'errors' must be str, not int",
                "TypeError: str() argument 'encoding' must be str, not bytes",
                'TypeError: decoding str is not supported',
                'UnicodeDecodeError',
                'TypeError: str expected at most 3 arguments, got 4',
                'TypeError: str expected at most 3 arguments, got 4',
                "TypeError: str() got an unexpected keyword argument 'test'"],
    'a_subclass_stays_one': 'S',
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-22s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
