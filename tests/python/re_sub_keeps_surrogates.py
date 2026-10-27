"""Fixture: re.sub over a str with lone surrogates keeps them, as CPython does.

Grail runs _sre through its CPython shim, which hands C a str holding lone
surrogates as WTF-8; the str _sre builds from the slices came back through
the shim's PyUnicode_FromString, which decoded strict UTF-8, failed, and
widened the bytes as latin-1 -- so re.sub turned '\\udcc3' into
'\\xed\\xb3\\x83'.  That is how email's BytesGenerator mangles a From line in
an 8-bit body, so writing such a message raised UnicodeEncodeError (nine
tests of test_email.test_email).

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import email
import re
import textwrap
from email.generator import BytesGenerator
from io import BytesIO

r = {}

s = 'From R\udcc3\udcb6lli\n'
r['sub_literal'] = re.compile(r'^From ', re.MULTILINE).sub('>From ', s)
r['subn_literal'] = re.subn('l', 'L', s)
r['sub_template'] = re.sub(r'(R)', r'[\1]', s)
r['sub_callable'] = re.sub('l', lambda m: m.group().upper(), s)
r['plain_unchanged'] = re.sub('b', 'B', 'abéb')
r['escape_round_trip'] = re.sub('R', 'r', s).encode('ascii', 'surrogateescape')

source = textwrap.dedent("""\
    Content-Type: text/plain; charset="utf-8"
    MIME-Version: 1.0
    Content-Transfer-Encoding: 8bit
    From: aaa@bbb.org

""").encode('utf-8')
message = email.message_from_bytes(source + b'From R\xc3\xb6lli\n')
out = BytesIO()
BytesGenerator(out, mangle_from_=True).flatten(message)
r['email_mangled_from'] = out.getvalue() == source + b'>From R\xc3\xb6lli\n'

EXPECTED = {
    'sub_literal': '>From R\udcc3\udcb6lli\n',
    'subn_literal': ('From R\udcc3\udcb6LLi\n', 2),
    'sub_template': 'From [R]\udcc3\udcb6lli\n',
    'sub_callable': 'From R\udcc3\udcb6LLi\n',
    'plain_unchanged': 'aBéB',
    'escape_round_trip': b'From r\xc3\xb6lli\n',
    'email_mangled_from': True,
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        print('%-5s %-20s -> %a' % ('OK' if actual == EXPECTED[key] else 'FAIL',
                                    key, actual))
    print(SUMMARY)
