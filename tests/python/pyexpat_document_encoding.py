"""How Grail's pyexpat chooses and applies a document's encoding.

It decoded every chunk of bytes as UTF-8 unless ParserCreate named an
encoding, and decoded each chunk on its own.  So:

  * a document declaring ``encoding="iso-8859-1"'' failed at its first
    non-ASCII byte -- test_pulldom's xmltestdata/test.xml ends in a Latin-1
    0xB5, which is what failed test_pulldom test_parse;
  * UTF-16 without a byte-order mark was not recognised;
  * a UTF-8 character split across two Parse calls was invalid in both halves;
  * an undecodable byte was reported at line 1 column 0, before any event,
    and always as an invalid token;
  * a multi-byte encoding was accepted, where expat refuses it.

Non-ASCII values are spelled with chr() and byte escapes, so that no tool
rewrites them.  Every expectation was measured against CPython 3.14.
"""

import io
import pyexpat
from xml.dom import pulldom

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:300])


MICRO = chr(0xB5)
E_ACUTE = chr(0xE9)


def events(chunks, **kw):
    """The start/text events a parse delivers (adjacent text merged, since
    how text is split into events depends on the chunking), or the error."""
    out = []
    p = pyexpat.ParserCreate(**kw)
    p.StartElementHandler = lambda n, a: out.append(('start', n))
    p.CharacterDataHandler = lambda d: out.append(('text', d))
    err = None
    try:
        for i, c in enumerate(chunks):
            p.Parse(c, i == len(chunks) - 1)
    except pyexpat.ExpatError as x:
        err = (str(x), x.code)
    except Exception as x:
        err = (type(x).__name__, str(x))
    merged = []
    for e in out:
        if e[0] == 'text' and merged and merged[-1][0] == 'text':
            merged[-1] = ('text', merged[-1][1] + e[1])
        else:
            merged.append(e)
    return merged, err


def byte_chunks(data):
    return [data[i:i + 1] for i in range(len(data))]


LATIN = b'<?xml version="1.0" encoding="ISO-8859-1"?><a>\xb5\xe9</a>'
UTF8 = ('<a>' + MICRO + chr(0x4E2D) + chr(0x1F600) + '</a>').encode('utf-8')

check('the_declared_encoding_is_used',
      [events([LATIN]), events(byte_chunks(LATIN)),
       events([b"<?x", b"ml version='1.0' encoding='latin-1'?><a>\xb5</a>"]),
       events([b'<a>\xb5</a>'], encoding='iso-8859-1')],
      [([('start', 'a'), ('text', MICRO + E_ACUTE)], None)] * 2
      + [([('start', 'a'), ('text', MICRO)], None)] * 2)

check('a_character_split_across_chunks_decodes',
      [events([UTF8[:4], UTF8[4:9], UTF8[9:]]), events(byte_chunks(UTF8))],
      [([('start', 'a'), ('text', MICRO + chr(0x4E2D) + chr(0x1F600))], None)] * 2)

_DOC = '<?xml version="1.0" encoding="%s"?><a>' + MICRO + '</a>'
check('utf_16_is_detected_with_or_without_a_byte_order_mark',
      [events([(_DOC % 'utf-16').encode('utf-16')]),
       events([(_DOC % 'utf-16le').encode('utf-16-le')]),
       events([(_DOC % 'utf-16').encode('utf-16-be')]),
       events([b'\xef\xbb\xbf<a>\xc2\xb5</a>'])],
      [([('start', 'a'), ('text', MICRO)], None)] * 4)

check('a_declaration_the_bytes_contradict_is_incorrect',
      [events([b'<?xml version="1.0" encoding="utf-16"?><a/>']),
       events([(_DOC % 'iso-8859-1').encode('utf-16-le')])],
      [([], ('encoding specified in XML declaration is incorrect: '
             'line 1, column 30', 19))] * 2)

check('an_undecodable_byte_is_reported_where_it_is',
      [events([b'<a><b>\xff</b></a>']),
       events([b'<a>\n  <b>x', b'\xff</b></a>']),
       events([b'<a>x\xe4\xb8'])],
      [([('start', 'a'), ('start', 'b')],
        ('not well-formed (invalid token): line 1, column 6', 4)),
       ([('start', 'a'), ('text', '\n  '), ('start', 'b'), ('text', 'x')],
        ('not well-formed (invalid token): line 2, column 6', 4)),
       ([('start', 'a'), ('text', 'x')],
        ('partial character: line 1, column 4', 6))])

check('only_single_byte_encodings_are_supported',
      [events([b'<?xml version="1.0" encoding="big5"?><a/>'])[1],
       events([b'<a/>'], encoding='euc-kr')[1],
       events([b'<?xml version="1.0" encoding="no-such-codec"?><a/>'])[1],
       events([b'<?xml version="1.0" encoding="cp437"?><a>\xe6</a>'])[0],
       # cp864 is single-byte but maps XML's ``%'' elsewhere, which expat
       # refuses; test_xml_etree test_encoding counts on it for EBCDIC.
       events([b"<?xml version='1.0' encoding='cp864'?><a/>"])[1],
       events([b'<a/>'], encoding='cp864')[1]],
      [('ValueError', 'multi-byte encodings are not supported')] * 2
      + [('LookupError', 'unknown encoding: no-such-codec'),
         [('start', 'a'), ('text', MICRO)],
         ('unknown encoding: line 1, column 30', 18),
         ('unknown encoding: line 1, column 0', 18)])


def _pulldom_latin1():
    # test_pulldom test_parse's shape: a Latin-1 document read as bytes.
    doc = (b'<?xml version="1.0" encoding="iso-8859-1"?>\n'
           b'<doc><p>caf\xe9</p><p>\xb5</p></doc>')
    texts = []
    for event, node in pulldom.parse(io.BytesIO(doc)):
        if event == pulldom.CHARACTERS:
            texts.append(node.data)
    return ''.join(texts)


check('pulldom_parses_a_latin_1_document', _pulldom_latin1(),
      'caf' + E_ACUTE + MICRO)


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else ascii(_v))
