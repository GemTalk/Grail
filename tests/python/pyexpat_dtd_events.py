"""What Grail's pyexpat reports to handlers, where test_sax found it wrong.

  * character data came as one call per text run.  expat calls the handler
    once per piece -- every newline, and every reference, is a piece -- unless
    buffer_text joins them; CDATAHandlerTest compares each call;
  * namespace_prefixes was read as "pass the xmlns attributes through", so
    XMLGenerator wrote every declaration twice (test_5027_1) and an element
    had one attribute too many (test_expat_nsattrs_wattr).  In expat it asks
    for a third name part, the prefix, and xmlns is never an attribute;
  * the internal subset was skipped: no comment (LexicalHandlerTest), no
    notation or unparsed entity (test_expat_dtdhandler), and only a one-line
    internal entity was honoured;
  * no external entity ever reached ExternalEntityRefHandler, and the parser
    ExternalEntityParserCreate answered could not read one
    (test_expat_entityresolver_enabled, test_expat_external_dtd_enabled);
  * an undefined entity was skipped whenever a SkippedEntityHandler was set.
    expat skips one only when the DTD could have declared it out of sight --
    an external subset, not standalone -- and otherwise it is an error.

Every expectation was measured against CPython 3.14 (expat 2.7).
"""

import pyexpat

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:300])


HANDLERS = ('StartElement', 'EndElement', 'CharacterData', 'Comment',
            'ProcessingInstruction', 'StartDoctypeDecl', 'EndDoctypeDecl',
            'EntityDecl', 'UnparsedEntityDecl', 'NotationDecl',
            'SkippedEntity', 'StartNamespaceDecl')


def events(doc, ns=None, ext=None, ext_text=None, param=None, **attrs):
    """Every handler event a parse delivers, then the error if one ends it.
    ``ext'' makes ExternalEntityRefHandler record its arguments and answer
    that; ``ext_text'' is then fed to the parser it creates."""
    p = pyexpat.ParserCreate(namespace_separator=ns)
    for k, v in attrs.items():
        setattr(p, k, v)
    out = []
    for h in HANDLERS:
        setattr(p, h + 'Handler',
                (lambda h: lambda *a: out.append((h,) + a))(h))
    if param is not None:
        p.SetParamEntityParsing(param)
    if ext is not None:
        def ref(context, base, sysid, pubid):
            out.append(('Ext', context, base, sysid, pubid))
            if ext_text is not None:
                p.ExternalEntityParserCreate(context).Parse(ext_text, True)
            return ext
        p.ExternalEntityRefHandler = ref
    try:
        p.Parse(doc, True)
    except pyexpat.ExpatError as x:
        out.append(('error', str(x), x.code))
    return out


check('character_data_comes_in_expats_pieces',
      [events('<a>x\ny&amp;z&#65;</a>'),
       events('<a>x\ny&amp;z&#65;</a>', buffer_text=True),
       events('<a><![CDATA[l1\nl2]]></a>')],
      [[('StartElement', 'a', {}), ('CharacterData', 'x'),
        ('CharacterData', '\n'), ('CharacterData', 'y'),
        ('CharacterData', '&'), ('CharacterData', 'z'),
        ('CharacterData', 'A'), ('EndElement', 'a')],
       [('StartElement', 'a', {}), ('CharacterData', 'x\ny&zA'),
        ('EndElement', 'a')],
       [('StartElement', 'a', {}), ('CharacterData', 'l1'),
        ('CharacterData', '\n'), ('CharacterData', 'l2'),
        ('EndElement', 'a')]])

check('namespace_prefixes_is_a_third_name_part',
      [events('<a xmlns:n="u" n:b="1" c="2"><n:x xml:lang="en"/></a>',
              ns=' ', namespace_prefixes=True),
       events('<a xmlns="d" xmlns:n="u" n:b="1"/>', ns=' ')],
      [[('StartNamespaceDecl', 'n', 'u'),
        ('StartElement', 'a', {'u b n': '1', 'c': '2'}),
        ('StartElement', 'u x n',
         {'http://www.w3.org/XML/1998/namespace lang xml': 'en'}),
        ('EndElement', 'u x n'), ('EndElement', 'a')],
       [('StartNamespaceDecl', None, 'd'), ('StartNamespaceDecl', 'n', 'u'),
        ('StartElement', 'd a', {'u b': '1'}), ('EndElement', 'd a')]])

check('the_internal_subset_is_reported',
      events('<!DOCTYPE doc [\n<!-- c1 -->\n<?pi data?>\n'
             '<!ENTITY e "v&#65;&amp;w">\n'
             '<!ENTITY u SYSTEM "u.gif" NDATA GIF>\n'
             '<!ENTITY x PUBLIC "p" "s">\n<!ENTITY % pe "zz">\n'
             '<!NOTATION GIF PUBLIC "-//CompuServe//NOTATION GIF 89a//EN">\n'
             '<!NOTATION N2 SYSTEM "sys">\n<!ELEMENT doc ANY>\n'
             ']>\n<doc>&e;</doc>'),
      [('StartDoctypeDecl', 'doc', None, None, 1), ('Comment', ' c1 '),
       ('ProcessingInstruction', 'pi', 'data'),
       ('EntityDecl', 'e', 0, 'vA&amp;w', None, None, None, None),
       ('UnparsedEntityDecl', 'u', None, 'u.gif', None, 'GIF'),
       ('EntityDecl', 'x', 0, None, None, 's', 'p', None),
       ('EntityDecl', 'pe', 1, 'zz', None, None, None, None),
       ('NotationDecl', 'GIF', None, None,
        '-//CompuServe//NOTATION GIF 89a//EN'),
       ('NotationDecl', 'N2', None, 'sys', None), ('EndDoctypeDecl',),
       ('StartElement', 'doc', {}), ('CharacterData', 'vA'),
       ('CharacterData', '&'), ('CharacterData', 'w'),
       ('EndElement', 'doc')])

check('internal_entities_expand_as_markup',
      [events('<!DOCTYPE d [<!ENTITY m "<b>in</b>t"><!ENTITY e "x&f;y">'
              '<!ENTITY f "F">]><d a="1&e;2">&m;</d>'),
       events('<!DOCTYPE d [<!ENTITY e "a"><!ENTITY e "b">]><d>&e;</d>'),
       events('<!DOCTYPE d [<!ENTITY e "&e;">]><d>&e;</d>'),
       events('<!DOCTYPE d [<!ENTITY e "<a>">]><d>&e;</a></d>')],
      [[('StartDoctypeDecl', 'd', None, None, 1),
        ('EntityDecl', 'm', 0, '<b>in</b>t', None, None, None, None),
        ('EntityDecl', 'e', 0, 'x&f;y', None, None, None, None),
        ('EntityDecl', 'f', 0, 'F', None, None, None, None),
        ('EndDoctypeDecl',), ('StartElement', 'd', {'a': '1xFy2'}),
        ('StartElement', 'b', {}), ('CharacterData', 'in'),
        ('EndElement', 'b'), ('CharacterData', 't'), ('EndElement', 'd')],
       [('StartDoctypeDecl', 'd', None, None, 1),
        ('EntityDecl', 'e', 0, 'a', None, None, None, None),
        ('EndDoctypeDecl',), ('StartElement', 'd', {}),
        ('CharacterData', 'a'), ('EndElement', 'd')],
       [('StartDoctypeDecl', 'd', None, None, 1),
        ('EntityDecl', 'e', 0, '&e;', None, None, None, None),
        ('EndDoctypeDecl',), ('StartElement', 'd', {}),
        ('error', 'recursive entity reference: line 1, column 35', 12)],
       [('StartDoctypeDecl', 'd', None, None, 1),
        ('EntityDecl', 'e', 0, '<a>', None, None, None, None),
        ('EndDoctypeDecl',), ('StartElement', 'd', {}),
        ('StartElement', 'a', {}),
        ('error', 'asynchronous entity: line 1, column 35', 13)]])

_EXT = '<!DOCTYPE doc [<!ENTITY x SYSTEM "sys">]>\n<doc>a&x;b</doc>'

check('an_external_entity_goes_to_the_handler',
      [events(_EXT)[3:],
       events(_EXT, ext=1)[3:],
       events(_EXT, ext=0)[3:],
       events(_EXT, ext=1,
              ext_text=b'<?xml encoding="utf-8"?>text<i/>more')[3:]],
      [[('StartElement', 'doc', {}), ('CharacterData', 'a'),
        ('CharacterData', 'b'), ('EndElement', 'doc')],
       [('StartElement', 'doc', {}), ('CharacterData', 'a'),
        ('Ext', 'x', None, 'sys', None), ('CharacterData', 'b'),
        ('EndElement', 'doc')],
       [('StartElement', 'doc', {}), ('CharacterData', 'a'),
        ('Ext', 'x', None, 'sys', None),
        ('error',
         'error in processing external entity reference: line 2, column 6',
         21)],
       [('StartElement', 'doc', {}), ('CharacterData', 'a'),
        ('Ext', 'x', None, 'sys', None), ('CharacterData', 'text'),
        ('StartElement', 'i', {}), ('EndElement', 'i'),
        ('CharacterData', 'more'), ('CharacterData', 'b'),
        ('EndElement', 'doc')]])

_DTD = '<!DOCTYPE doc SYSTEM "e.dtd">\n<doc>&q;</doc>'

check('the_external_subset_is_asked_for_with_param_parsing',
      [events(_DTD, ext=1),
       events(_DTD, ext=1, param=pyexpat.XML_PARAM_ENTITY_PARSING_ALWAYS,
              ext_text=b'<!ENTITY q "Q"><!-- extc -->'),
       events('<?xml version="1.0" standalone="yes"?>' + _DTD, ext=1,
              param=pyexpat.XML_PARAM_ENTITY_PARSING_UNLESS_STANDALONE)],
      [[('StartDoctypeDecl', 'doc', 'e.dtd', None, 0), ('EndDoctypeDecl',),
        ('StartElement', 'doc', {}), ('SkippedEntity', 'q', 0),
        ('EndElement', 'doc')],
       [('StartDoctypeDecl', 'doc', 'e.dtd', None, 0),
        ('Ext', None, None, 'e.dtd', None),
        ('EntityDecl', 'q', 0, 'Q', None, None, None, None),
        ('Comment', ' extc '), ('EndDoctypeDecl',),
        ('StartElement', 'doc', {}), ('CharacterData', 'Q'),
        ('EndElement', 'doc')],
       [('StartDoctypeDecl', 'doc', 'e.dtd', None, 0), ('EndDoctypeDecl',),
        ('StartElement', 'doc', {}),
        ('error', 'undefined entity: line 2, column 5', 11)]])

check('an_undefined_entity_is_an_error_without_an_external_subset',
      [events('<doc>&zz;</doc>'),
       events('<!DOCTYPE d SYSTEM "s"><d a="1&zz;2">&zz;</d>')],
      [[('StartElement', 'doc', {}),
        ('error', 'undefined entity: line 1, column 5', 11)],
       [('StartDoctypeDecl', 'd', 's', None, 0), ('EndDoctypeDecl',),
        ('StartElement', 'd', {'a': '12'}), ('SkippedEntity', 'zz', 0),
        ('EndElement', 'd')]])

check('entity_references_that_cannot_be_used',
      [events('<!DOCTYPE d [<!ENTITY x SYSTEM "s">]><d a="&x;"/>')[-1],
       events('<!DOCTYPE d [<!ENTITY x SYSTEM "s" NDATA n>]><d>&x;</d>')[-1]],
      [('error', 'reference to external entity in attribute: '
                 'line 1, column 43', 16),
       ('error', 'reference to binary entity: line 1, column 48', 15)])


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else ascii(_v))
