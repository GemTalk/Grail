"""Fixture: io.StringIO holds a str with lone surrogates, as CPython's does.

Decoding bytes with errors='surrogateescape' gives a str holding lone
surrogates, and email's BytesParser hands exactly that to a StringIO (through
Parser.parsestr and the feed parser's buffer).  GemStone Characters cannot
hold a code point in the surrogate block, and Grail's StringIO kept its
buffer as a Smalltalk string, so constructing or writing one raised
NotImplementedError ("str containing lone surrogates does not support
coerced to a Smalltalk string") -- 34 of test_email.test_email's errors.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import email
import io
import textwrap

r = {}

text = 'caf\udce9\nna\udcefve\n'

stream = io.StringIO(text)
r['getvalue'] = stream.getvalue() == text
r['readline'] = [stream.readline(), stream.readline(), stream.readline()]
stream.seek(0)
r['read_counts_code_points'] = (stream.read(4), stream.tell())
stream.seek(0)
r['iterate'] = list(stream)
stream.seek(0)
r['readlines'] = stream.readlines()

written = io.StringIO()
r['write_returns_length'] = (written.write('x\udcff'), written.write('y'))
r['written'] = written.getvalue()
r['surrogateescape_round_trip'] = written.getvalue().encode('ascii', 'surrogateescape')

r['plain_text_unchanged'] = io.StringIO('plain é\n').getvalue()

message = textwrap.dedent("""\
    From: foo@bar.com
    To: baz
    Mime-Version: 1.0
    Content-Type: text/plain; charset=utf-8
    Content-Transfer-Encoding: base64

    cMO2c3RhbAá=
    """).encode('utf-8')
r['email_8bit_in_base64_body'] = email.message_from_bytes(message).get_payload(decode=True)

EXPECTED = {
    'getvalue': True,
    'readline': ['caf\udce9\n', 'na\udcefve\n', ''],
    'read_counts_code_points': ('caf\udce9', 4),
    'iterate': ['caf\udce9\n', 'na\udcefve\n'],
    'readlines': ['caf\udce9\n', 'na\udcefve\n'],
    'write_returns_length': (2, 1),
    'written': 'x\udcffy',
    'surrogateescape_round_trip': b'x\xffy',
    'plain_text_unchanged': 'plain é\n',
    'email_8bit_in_base64_body': 'pöstal'.encode('utf-8'),
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        print('%-5s %-26s -> %a' % ('OK' if actual == EXPECTED[key] else 'FAIL',
                                    key, actual))
    print(SUMMARY)
