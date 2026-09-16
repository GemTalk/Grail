"""`xml.etree.ElementTree` can PARSE now, not just build and serialize.

Grail's ElementTree was a 269-line hand-rolled shim: it could build a tree with
`Element`/`SubElement` and serialize it with `tostring`, and `fromstring` /
`parse` raised NotImplementedError. That was the honest state while Grail had
no XML parser at all.

It has one now, so CPython's own `ElementTree.py` is vendored VERBATIM -- the
whole file is pure Python, and parsing reaches `xml.parsers.expat`, so it
needed no change. `ElementPath.py` comes with it, which is where find/findall
get their XPath subset; the shim had no such thing.

WHAT MADE THIS POSSIBLE, and it is worth recording because the shim said
otherwise: the shim kept an explicit `_attr_order` list because, when it was
written, "Grail's dict ordering is not guaranteed". That is no longer true.
Grail dicts preserve insertion order -- checked against CPython including the
delete-then-reinsert case -- so the upstream file's reliance on dict order is
safe. A comment that was true when written had quietly become the only reason
not to do this.

Every expectation below was compared against CPython 3.14, including the
ParseError message and position.
"""

import xml.etree.ElementTree as ElementTree

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + str(got)[:120])


# ------------------------------------------------ parsing works at all

check('fromstring_reads_a_tree',
      ElementTree.fromstring('<a x="1"><b>text</b></a>').tag, 'a')

check('attributes_survive',
      ElementTree.fromstring('<a x="1" y="2"/>').attrib, {'x': '1', 'y': '2'})

check('child_text_survives',
      ElementTree.fromstring('<a><b>text</b></a>').find('b').text, 'text')


# --------------------------------- ElementPath, which the shim lacked

def _element_path():
    tree = ElementTree.fromstring(
        '<root><item id="1"><name>first</name></item>'
        '<item id="2"><name>second</name></item></root>')
    return (
        len(tree.findall('item')),
        [element.get('id') for element in tree.findall('item')],
        tree.find('item/name').text,
        [element.text for element in tree.findall('.//name')],
    )


check('element_path_finds_by_path', _element_path(),
      (2, ['1', '2'], 'first', ['first', 'second']))


# ------------------------------------------------------- namespaces

check('a_namespaced_tag_is_qualified',
      ElementTree.fromstring('<a xmlns="urn:x"><b/></a>').tag, '{urn:x}a')


def _namespaced_find():
    tree = ElementTree.fromstring('<a xmlns="urn:x"><b>inner</b></a>')
    return tree.find('{urn:x}b').text


check('find_works_with_a_qualified_name', _namespaced_find(), 'inner')


# ------------------------------------- entities, CDATA, char references

check('entities_are_expanded',
      ElementTree.fromstring('<a>&lt;&amp;&gt;</a>').text, '<&>')

check('cdata_is_text',
      ElementTree.fromstring('<a><![CDATA[<raw> & co]]></a>').text,
      '<raw> & co')

check('character_references_are_expanded',
      ElementTree.fromstring('<a>&#65;&#x42;</a>').text, 'AB')


# ------------------------------------------- round trip through tostring

check('parse_then_serialize_round_trips',
      ElementTree.tostring(
          ElementTree.fromstring('<a x="1"><b>t</b><c/></a>'),
          encoding='unicode'),
      '<a x="1"><b>t</b><c /></a>')


# ------------------------------------------------------ iteration

check('iter_walks_the_whole_tree',
      [element.tag for element in
       ElementTree.fromstring('<a><b><c/></b><d/></a>').iter()],
      ['a', 'b', 'c', 'd'])


# ------------------------------- malformed input raises ParseError

def _parse_error():
    try:
        ElementTree.fromstring('<a></b>')
    except ElementTree.ParseError as error:
        return (type(error).__name__, str(error))
    return 'NO ERROR RAISED'


check('malformed_xml_raises_parse_error_with_a_position',
      _parse_error(), ('ParseError', 'mismatched tag: line 1, column 5'))


# ------------------ building and serializing still works (the old shim's job)

def _build_and_serialize():
    root = ElementTree.Element('root')
    child = ElementTree.SubElement(root, 'child', {'k': 'v'})
    child.text = 'body'
    return ElementTree.tostring(root, encoding='unicode')


check('building_a_tree_still_works', _build_and_serialize(),
      '<root><child k="v">body</child></root>')


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
