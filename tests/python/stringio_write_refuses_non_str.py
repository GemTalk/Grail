"""Fixture: io.StringIO.write takes a str and nothing else, as CPython's does.

CPython's StringIO.write refuses any argument that is not a str with
"string argument expected, got '<type>'", and asks that before it asks
whether the stream is closed (Modules/_io/stringio.c:554).  Grail wrote the
argument's Smalltalk print string instead -- b'x' became 'aByteArray' and
None 'aNoneType'.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import io

r = {}


def outcome(fn):
    try:
        return fn()
    except Exception as e:
        return '%s: %s' % (type(e).__name__, e)


class Text(str):
    pass


stream = io.StringIO()
r['refused'] = [outcome(lambda v=v: stream.write(v))
                for v in (b'x', 1, None, bytearray(b'y'))]
r['nothing_written'] = stream.getvalue()
r['str_and_subclass'] = (stream.write('ab'), stream.write(Text('cd')), stream.getvalue())
r['writelines_bytes'] = outcome(lambda: io.StringIO().writelines([b'x']))

closed = io.StringIO()
closed.close()
r['closed_checks_type_first'] = (outcome(lambda: closed.write(b'x')),
                                 outcome(lambda: closed.write('x')))

EXPECTED = {
    'refused': ["TypeError: string argument expected, got 'bytes'",
                "TypeError: string argument expected, got 'int'",
                "TypeError: string argument expected, got 'NoneType'",
                "TypeError: string argument expected, got 'bytearray'"],
    'nothing_written': '',
    'str_and_subclass': (2, 2, 'abcd'),
    'writelines_bytes': "TypeError: string argument expected, got 'bytes'",
    'closed_checks_type_first': ("TypeError: string argument expected, got 'bytes'",
                                 'ValueError: I/O operation on closed file'),
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        print('%-5s %-26s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL',
                                    key, actual))
    print(SUMMARY)
