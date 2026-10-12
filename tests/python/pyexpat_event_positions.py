"""Fixture: inside a handler, pyexpat reports where the event STARTS (#1386).

expat's CurrentLineNumber, CurrentColumnNumber and CurrentByteIndex read its
event pointer: the start of the token being dispatched.  Grail's pure-Python
pyexpat consumed the token first and reported the position after it -- a
start tag's handler saw the column of its ``>'' -- and never set
CurrentByteIndex at all.  SAX locators read these, and so does anything that
reports where in a document an element begins.

Covered: every event kind in content (tags, empty tags, text pieces split at
newlines and references, comments, PIs, CDATA sections), entity expansions
(every event inside one is at the reference), byte indexes in UTF-8, UTF-16
and Latin-1 input, a UTF-8 BOM, CRLF line ends (two bytes, one line break),
the position after Parse returns, and the position an error pins.  DTD
declaration events are left out: expat reports each at the token that
completes it, which this parser does not track (see the PR for #1386).

Everything here is verified against CPython's C pyexpat by running the file
directly.
"""

import pyexpat

HANDLERS = ('StartElementHandler', 'EndElementHandler', 'CharacterDataHandler',
            'CommentHandler', 'ProcessingInstructionHandler',
            'StartCdataSectionHandler', 'EndCdataSectionHandler')


def events(doc, chunks=None):
    p = pyexpat.ParserCreate()
    out = []

    def hook(name):
        def h(*args):
            out.append((name[:-7], p.CurrentLineNumber, p.CurrentColumnNumber,
                        p.CurrentByteIndex))
        return h
    for name in HANDLERS:
        setattr(p, name, hook(name))
    try:
        for c in (chunks or [doc]):
            p.Parse(c, False)
        out.append(('after', p.CurrentLineNumber, p.CurrentColumnNumber,
                    p.CurrentByteIndex))
        p.Parse(b'' if isinstance(doc, bytes) else '', True)
    except pyexpat.ExpatError as e:
        out.append(('error', str(e), p.ErrorLineNumber, p.ErrorColumnNumber,
                    p.ErrorByteIndex, p.CurrentByteIndex))
    return out


r = {}
r['issue_example'] = events(
    '<?xml version="1.0"?>\n<root a="1">\n  <item>one</item>\n</root>\n')
r['every_content_event'] = events(
    '<r>text<!-- c --><?pi data?><![CDATA[x<y\nz]]>\n<e/>tail&amp;more&#65;</r>')
r['entity_expansion_reports_the_reference'] = events(
    '<!DOCTYPE r [<!ENTITY e "<b>x\n<c/></b>">]>\n<r>a&e;z</r>')
r['utf8_bytes_and_bom'] = events(
    '﻿<r>café\n<x a="1">中</x></r>'.encode('utf-8'))
r['utf16_bytes'] = events('<r>café\n<x/>中</r>'.encode('utf-16'))
r['latin1_bytes'] = events(
    '<?xml version="1.0" encoding="iso-8859-1"?>\n<r>café\n<x/></r>'
    .encode('latin-1'))
r['crlf_counts_two_bytes'] = events(b'<r>\r\n<a>x</a>\r\n<![CDATA[p\r\nq]]>\r\n</r>')
_doc = '<r>\n<a>one</a>\n<b>two</b>\n</r>'
r['chunked_tag_positions'] = [e for e in events(_doc, [_doc[:9], _doc[9:20], _doc[20:]])
                              if e[0] in ('StartElement', 'EndElement', 'after')]
r['mismatched_tag_error'] = events('<r>\n<a>x</b></r>')[-1]
r['error_after_multibyte_text'] = events('<r>\ncafé <</r>')[-1]
r['crlf_error'] = events(b'<r>\r\n<a>x</b></r>')[-1]
r['error_inside_entity_is_the_reference'] = events(
    '<!DOCTYPE r [<!ENTITY e "<b>">]><r>&e;</r>')[-1]

EXPECTED = {'chunked_tag_positions': [('StartElement', 1, 0, 0),
                           ('StartElement', 2, 0, 4),
                           ('EndElement', 2, 6, 10),
                           ('StartElement', 3, 0, 15),
                           ('EndElement', 3, 6, 21),
                           ('EndElement', 4, 0, 26),
                           ('after', 4, 4, 30)],
 'crlf_counts_two_bytes': [('StartElement', 1, 0, 0),
                           ('CharacterData', 1, 3, 3),
                           ('StartElement', 2, 0, 5),
                           ('CharacterData', 2, 3, 8),
                           ('EndElement', 2, 4, 9),
                           ('CharacterData', 2, 8, 13),
                           ('StartCdataSection', 3, 0, 15),
                           ('CharacterData', 3, 9, 24),
                           ('CharacterData', 3, 10, 25),
                           ('CharacterData', 4, 0, 27),
                           ('EndCdataSection', 4, 1, 28),
                           ('CharacterData', 4, 4, 31),
                           ('EndElement', 5, 0, 33),
                           ('after', 5, 4, 37)],
 'crlf_error': ('error', 'mismatched tag: line 2, column 6', 2, 6, 11, 11),
 'entity_expansion_reports_the_reference': [('StartElement', 3, 0, 43),
                                            ('CharacterData', 3, 3, 46),
                                            ('StartElement', 3, 4, 47),
                                            ('CharacterData', 3, 4, 47),
                                            ('CharacterData', 3, 4, 47),
                                            ('StartElement', 3, 4, 47),
                                            ('EndElement', 3, 4, 47),
                                            ('EndElement', 3, 4, 47),
                                            ('CharacterData', 3, 7, 50),
                                            ('EndElement', 3, 8, 51),
                                            ('after', 3, 12, 55)],
 'error_after_multibyte_text': ('error',
                                'not well-formed (invalid token): line 2, column 6',
                                2,
                                6,
                                11,
                                11),
 'error_inside_entity_is_the_reference': ('error',
                                          'asynchronous entity: line 1, column 35',
                                          1,
                                          35,
                                          35,
                                          35),
 'every_content_event': [('StartElement', 1, 0, 0),
                         ('CharacterData', 1, 3, 3),
                         ('Comment', 1, 7, 7),
                         ('ProcessingInstruction', 1, 17, 17),
                         ('StartCdataSection', 1, 28, 28),
                         ('CharacterData', 1, 37, 37),
                         ('CharacterData', 1, 40, 40),
                         ('CharacterData', 2, 0, 41),
                         ('EndCdataSection', 2, 1, 42),
                         ('CharacterData', 2, 4, 45),
                         ('StartElement', 3, 0, 46),
                         ('EndElement', 3, 4, 50),
                         ('CharacterData', 3, 4, 50),
                         ('CharacterData', 3, 8, 54),
                         ('CharacterData', 3, 13, 59),
                         ('CharacterData', 3, 17, 63),
                         ('EndElement', 3, 22, 68),
                         ('after', 3, 26, 72)],
 'issue_example': [('StartElement', 2, 0, 22),
                   ('CharacterData', 2, 12, 34),
                   ('CharacterData', 3, 0, 35),
                   ('StartElement', 3, 2, 37),
                   ('CharacterData', 3, 8, 43),
                   ('EndElement', 3, 11, 46),
                   ('CharacterData', 3, 18, 53),
                   ('EndElement', 4, 0, 54),
                   ('after', 5, 0, 62)],
 'latin1_bytes': [('StartElement', 2, 0, 44),
                  ('CharacterData', 2, 3, 47),
                  ('CharacterData', 2, 7, 51),
                  ('StartElement', 3, 0, 52),
                  ('EndElement', 3, 4, 56),
                  ('EndElement', 3, 4, 56),
                  ('after', 3, 8, 60)],
 'mismatched_tag_error': ('error', 'mismatched tag: line 2, column 6', 2, 6, 10, 10),
 'utf16_bytes': [('StartElement', 1, 1, 2),
                 ('CharacterData', 1, 4, 8),
                 ('CharacterData', 1, 8, 16),
                 ('StartElement', 2, 0, 18),
                 ('EndElement', 2, 4, 26),
                 ('CharacterData', 2, 4, 26),
                 ('EndElement', 2, 5, 28),
                 ('after', 2, 9, 36)],
 'utf8_bytes_and_bom': [('StartElement', 1, 1, 3),
                        ('CharacterData', 1, 4, 6),
                        ('CharacterData', 1, 8, 11),
                        ('StartElement', 2, 0, 12),
                        ('CharacterData', 2, 9, 21),
                        ('EndElement', 2, 10, 24),
                        ('EndElement', 2, 14, 28),
                        ('after', 2, 18, 32)]}

KEYS = sorted(r)

if __name__ == '__main__':
    for key in KEYS:
        ok = EXPECTED is not None and r[key] == EXPECTED.get(key)
        print('%-5s %-42s -> %r' % ('OK' if ok else 'FAIL', key, r[key]))
