"""Grail has an XML parser now: a pure-Python `pyexpat`.

`pyexpat` is a C extension, so Grail had NO XML parser at all --
`xml.sax.make_parser()` raised SAXReaderNotAvailable and `test_sax` could not
run a single test. Everything else in `xml.sax` is pure Python and already
vendored, so one module stood between them and working.

WHY EXPAT'S SHAPE RATHER THAN A NICER ONE: CPython's `xml/sax/expatreader.py`
is written against this exact API -- handlers assigned onto a parser object,
`Parse(data, isfinal)` fed incrementally, `ExpatError` carrying
`code`/`lineno`/`offset`. Matching it means that file, and
`xml/parsers/expat.py`, run UNMODIFIED. They are the tested upstream
implementations; nothing here re-derives their behaviour.

HOW IT WAS CHECKED: differentially, against the real expat. Both parsers were
run over the same ~60 documents -- including every chunk split of the same
input -- and their full handler call sequences compared, error codes and
error positions included. That is a far better oracle than a list of
expectations written by hand, because it tests the ORDER and the ARGUMENTS of
every callback, not just the final result.

SCOPE, stated honestly: well-formed XML -- elements, attributes, text, CDATA,
comments, PIs, character references, the five predefined entities, and
namespace processing. NOT the DTD engine: no external entities, no validation.
A reference to an entity it does not know is an error at the reference, which
is what expat does when the entity is genuinely undefined.
"""

import io

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or 'got: %r' % (got,)


def _events(doc, nssep=None, chunks=None):
    """The handler call sequence for a document, as a comparable list."""
    import pyexpat
    out = []
    p = pyexpat.ParserCreate(namespace_separator=nssep)
    p.buffer_text = True
    for h in ('StartElementHandler', 'EndElementHandler', 'CharacterDataHandler',
              'CommentHandler', 'ProcessingInstructionHandler',
              'StartCdataSectionHandler', 'EndCdataSectionHandler',
              'StartNamespaceDeclHandler', 'EndNamespaceDeclHandler',
              'XmlDeclHandler'):
        def mk(h=h):
            def f(*a):
                out.append((h.replace('Handler', ''),) + a)
            return f
        setattr(p, h, mk())
    pieces = chunks if chunks is not None else [doc]
    for k, c in enumerate(pieces):
        p.Parse(c.encode('utf-8'), k == len(pieces) - 1)
    return out


# ------------------------------------------------------ the basic shapes

check('a_simple_document', _events('<a>hi</a>'),
      [('StartElement', 'a', {}), ('CharacterData', 'hi'), ('EndElement', 'a')])

check('attributes_and_nesting', _events('<a x="1"><b/></a>'),
      [('StartElement', 'a', {'x': '1'}), ('StartElement', 'b', {}),
       ('EndElement', 'b'), ('EndElement', 'a')])

check('predefined_entities', _events('<a>&lt;&amp;&gt;&quot;&apos;</a>'),
      [('StartElement', 'a', {}), ('CharacterData', '<&>"\''),
       ('EndElement', 'a')])

check('character_references', _events('<a>&#65;&#x42;</a>'),
      [('StartElement', 'a', {}), ('CharacterData', 'AB'), ('EndElement', 'a')])

check('cdata_is_delimited', _events('<a><![CDATA[<raw> & co]]></a>'),
      [('StartElement', 'a', {}), ('StartCdataSection',),
       ('CharacterData', '<raw> & co'), ('EndCdataSection',),
       ('EndElement', 'a')])

check('comments_and_pis', _events('<a><!--c--><?tgt data?></a>'),
      [('StartElement', 'a', {}), ('Comment', 'c'),
       ('ProcessingInstruction', 'tgt', 'data'), ('EndElement', 'a')])

check('the_xml_declaration', _events('<?xml version="1.0" encoding="utf-8"?><a/>'),
      [('XmlDecl', '1.0', 'utf-8', -1), ('StartElement', 'a', {}),
       ('EndElement', 'a')])


# ---------------------------------------------- incremental feeding

# The whole difficulty of an incremental parser: a chunk may end mid-token,
# and the only safe response is to wait.
#
# NOTE what is asserted, and what is NOT. Expat does NOT promise one
# CharacterData call per text run -- a run split across two chunks arrives as
# two calls, and this parser reproduces that. So the invariant is the
# STRUCTURE plus the CONCATENATED text, which is what every real handler
# actually consumes, not the number of callbacks. Checked against real expat
# rather than assumed: the first draft of this test asserted one call and
# failed on CPython itself.


def _normalised(events):
    """Events with adjacent CharacterData runs joined."""
    out = []
    for ev in events:
        if ev[0] == 'CharacterData' and out and out[-1][0] == 'CharacterData':
            out[-1] = ('CharacterData', out[-1][1] + ev[1])
        else:
            out.append(ev)
    return out


_WANT = [('StartElement', 'a', {'x': '1'}), ('CharacterData', 'hi'),
         ('EndElement', 'a')]


def _all_splits():
    doc = '<a x="1">hi</a>'
    out = {}
    for cut in range(1, len(doc)):
        got = _normalised(_events(None, chunks=[doc[:cut], doc[cut:]]))
        if got != _WANT:
            out['split@%d' % cut] = got
    return out


check('every_chunk_split_gives_the_same_events', _all_splits(), {})

check('a_token_split_three_ways',
      _normalised(_events(None, chunks=['<a x=', '"1">h', 'i</a>'])), _WANT)


# ------------------------------------------------------- namespaces

check('default_namespace', _events('<a xmlns="urn:x"><b/></a>', nssep=' '),
      [('StartNamespaceDecl', None, 'urn:x'),
       ('StartElement', 'urn:x a', {}), ('StartElement', 'urn:x b', {}),
       ('EndElement', 'urn:x b'), ('EndElement', 'urn:x a'),
       ('EndNamespaceDecl', None)])

check('prefixed_namespace',
      _events('<p:a xmlns:p="urn:p"><p:b/></p:a>', nssep=' '),
      [('StartNamespaceDecl', 'p', 'urn:p'),
       ('StartElement', 'urn:p a', {}), ('StartElement', 'urn:p b', {}),
       ('EndElement', 'urn:p b'), ('EndElement', 'urn:p a'),
       ('EndNamespaceDecl', 'p')])

# an unprefixed ATTRIBUTE is not in the default namespace -- a rule that is
# easy to get wrong and silently produces differently-keyed attributes
check('an_unprefixed_attribute_is_not_namespaced',
      _events('<a xmlns="urn:x" k="v"/>', nssep=' '),
      [('StartNamespaceDecl', None, 'urn:x'),
       ('StartElement', 'urn:x a', {'k': 'v'}),
       ('EndElement', 'urn:x a'), ('EndNamespaceDecl', None)])


# ---------------------------------------------- errors, with positions

def _error(doc):
    import pyexpat
    p = pyexpat.ParserCreate()
    try:
        p.Parse(doc.encode('utf-8'), True)
    except pyexpat.ExpatError as exc:
        return (exc.code, exc.lineno, exc.offset)
    return 'NO ERROR'


def _errors():
    import pyexpat
    codes = pyexpat.errors.codes
    cases = {
        'mismatched': ('<a>\n<b>\n</c>', codes['mismatched tag']),
        'no_elements': ('', codes['no element found']),
        'unclosed': ('<a>\n<b>', codes['no element found']),
        'junk_after': ('<a/>\n\njunk', codes['junk after document element']),
        'undefined_entity': ('<a>\n&zz;</a>', codes['undefined entity']),
        'duplicate_attr': ('<a x="1" x="2"/>', codes['duplicate attribute']),
        'bad_charref': ('<a>&#0;</a>', codes['reference to invalid character number']),
    }
    out = {}
    for label, (doc, want_code) in cases.items():
        got = _error(doc)
        out[label] = (isinstance(got, tuple) and got[0] == want_code) or got
    return {k: v for k, v in out.items() if v is not True}


check('errors_carry_expats_own_codes', _errors(), {})

# expat blames where the construct BEGINS -- the tag NAME in an end tag, two
# characters in from its '<' -- not where the scanner noticed the problem.
check('an_error_reports_where_it_happened', _error('<a>\n<b>\n</c>')[1:], (3, 2))


# ----------------------------------- the upstream SAX driver runs on it

def _sax_round_trip():
    import xml.sax
    from xml.sax.saxutils import XMLGenerator
    out = io.StringIO()
    xml.sax.parseString(
        b'<doc a="1"><child>text &amp; more</child><empty/></doc>',
        XMLGenerator(out))
    return out.getvalue()


check('the_real_sax_driver_round_trips', _sax_round_trip(),
      '<?xml version="1.0" encoding="iso-8859-1"?>\n'
      '<doc a="1"><child>text &amp; more</child><empty></empty></doc>')


def _sax_namespaces():
    import xml.sax

    class H(xml.sax.ContentHandler):
        def __init__(self):
            self.ev = []

        def startElementNS(self, name, qname, attrs):
            self.ev.append(('start', name))

        def endElementNS(self, name, qname):
            self.ev.append(('end', name))

    p = xml.sax.make_parser()
    p.setFeature(xml.sax.handler.feature_namespaces, 1)
    h = H()
    p.setContentHandler(h)
    p.parse(io.BytesIO(b'<a xmlns="urn:x"><b/></a>'))
    return h.ev


check('the_real_sax_driver_does_namespaces', _sax_namespaces(),
      [('start', ('urn:x', 'a')), ('start', ('urn:x', 'b')),
       ('end', ('urn:x', 'b')), ('end', ('urn:x', 'a'))])


def _sax_error():
    import xml.sax
    try:
        xml.sax.parseString(b'<a></b>', xml.sax.ContentHandler())
    except xml.sax.SAXParseException as exc:
        return (exc.getLineNumber(), exc.getColumnNumber())
    return 'NO ERROR'


check('a_sax_parse_error_is_positioned', _sax_error(), (1, 5))


def _make_parser_type():
    import xml.sax
    return type(xml.sax.make_parser()).__name__


check('make_parser_now_returns_one', _make_parser_type(), 'ExpatParser')
