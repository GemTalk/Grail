# Minimal xml.etree.ElementTree for Grail — the BUILD + SERIALIZE
# subset: Element, SubElement, tostring, ElementTree.
#
# This is a hand-rolled shim, not the CPython source drop: upstream
# ElementTree pulls in the C accelerator (_elementtree), pyexpat for
# parsing, and re-based namespace machinery.  The consumers we target
# (twilio.twiml builds a tree with Element/set/text/tail/append and
# serializes via tostring) need none of that.  PARSING IS NOT
# PROVIDED — fromstring/parse raise NotImplementedError.
#
# Serialization matches CPython 3.13 observable behavior for the
# supported subset:
#   * empty element  -> '<Tag />'
#   * text escapes   &, <, >
#   * attrib escapes &, <, >, ", and normalizes \r \n \t to char refs
#   * tostring() returns bytes unless encoding='unicode'
#   * no XML declaration unless xml_declaration=True (twilio prepends
#     its own declaration string)
#
# Attribute order: CPython preserves dict insertion order.  Grail's
# dict ordering is not guaranteed, so Element keeps an explicit
# insertion-order key list (_attr_order) and serializes from that.

__all__ = ['Element', 'SubElement', 'ElementTree', 'tostring', 'QName']


class ParseError(SyntaxError):
    pass


class QName:
    """Minimal QName: wraps a text value so it sorts/compares as str."""

    def __init__(self, text_or_uri, tag=None):
        if tag:
            text_or_uri = '{' + text_or_uri + '}' + tag
        self.text = text_or_uri

    def __str__(self):
        return self.text

    def __repr__(self):
        return '<QName %r>' % (self.text,)


class Element:
    def __init__(self, tag, attrib=None, **extra):
        self.tag = tag
        self.text = None
        self.tail = None
        self.attrib = {}
        self._attr_order = []
        self._children = []
        if attrib:
            for key in attrib:
                self.set(key, attrib[key])
        for key, value in extra.items():
            self.set(key, value)

    def __repr__(self):
        return '<Element %r>' % (self.tag,)

    def __len__(self):
        return len(self._children)

    def __iter__(self):
        return iter(self._children)

    def __getitem__(self, index):
        return self._children[index]

    def __setitem__(self, index, element):
        self._children[index] = element

    def __delitem__(self, index):
        del self._children[index]

    def set(self, key, value):
        if key not in self.attrib:
            self._attr_order.append(key)
        self.attrib[key] = value

    def get(self, key, default=None):
        return self.attrib.get(key, default)

    def keys(self):
        return list(self._attr_order)

    def items(self):
        return [(key, self.attrib[key]) for key in self._attr_order]

    def append(self, subelement):
        self._children.append(subelement)

    def extend(self, elements):
        for element in elements:
            self._children.append(element)

    def insert(self, index, subelement):
        self._children.insert(index, subelement)

    def remove(self, subelement):
        self._children.remove(subelement)

    def find(self, path, namespaces=None):
        for child in self._children:
            if child.tag == path:
                return child
        return None

    def findall(self, path, namespaces=None):
        return [child for child in self._children if child.tag == path]

    def findtext(self, path, default=None, namespaces=None):
        found = self.find(path, namespaces)
        if found is None:
            return default
        if found.text is None:
            return ''
        return found.text

    def iter(self, tag=None):
        result = []
        if tag is None or self.tag == tag:
            result.append(self)
        for child in self._children:
            result.extend(child.iter(tag))
        return iter(result)

    def itertext(self):
        result = []
        if self.text:
            result.append(self.text)
        for child in self._children:
            for text in child.itertext():
                result.append(text)
            if child.tail:
                result.append(child.tail)
        return iter(result)

    def clear(self):
        self.attrib = {}
        self._attr_order = []
        self._children = []
        self.text = None
        self.tail = None

    def makeelement(self, tag, attrib):
        return Element(tag, attrib)


def SubElement(parent, tag, attrib=None, **extra):
    element = Element(tag, attrib, **extra)
    parent.append(element)
    return element


class ElementTree:
    def __init__(self, element=None):
        self._root = element

    def getroot(self):
        return self._root

    def _setroot(self, element):
        self._root = element

    def find(self, path, namespaces=None):
        return self._root.find(path, namespaces)

    def findall(self, path, namespaces=None):
        return self._root.findall(path, namespaces)

    def iter(self, tag=None):
        return self._root.iter(tag)


def _escape_cdata(text):
    if '&' in text:
        text = text.replace('&', '&amp;')
    if '<' in text:
        text = text.replace('<', '&lt;')
    if '>' in text:
        text = text.replace('>', '&gt;')
    return text


def _escape_attrib(text):
    if '&' in text:
        text = text.replace('&', '&amp;')
    if '<' in text:
        text = text.replace('<', '&lt;')
    if '>' in text:
        text = text.replace('>', '&gt;')
    if '"' in text:
        text = text.replace('"', '&quot;')
    if '\r' in text:
        text = text.replace('\r', '&#13;')
    if '\n' in text:
        text = text.replace('\n', '&#10;')
    if '\t' in text:
        text = text.replace('\t', '&#09;')
    return text


def _text_of(value):
    if isinstance(value, QName):
        return value.text
    if isinstance(value, str):
        return value
    return str(value)


def _serialize_element(element, out, short_empty_elements):
    tag = _text_of(element.tag)
    out.append('<' + tag)
    for key in element._attr_order:
        value = element.attrib[key]
        out.append(' ' + _text_of(key) + '="'
                   + _escape_attrib(_text_of(value)) + '"')
    has_content = (element.text is not None) or (len(element._children) > 0)
    if (not has_content) and short_empty_elements:
        out.append(' />')
    else:
        out.append('>')
        if element.text is not None:
            out.append(_escape_cdata(_text_of(element.text)))
        for child in element._children:
            _serialize_element(child, out, short_empty_elements)
            if child.tail is not None:
                out.append(_escape_cdata(_text_of(child.tail)))
        out.append('</' + tag + '>')


def tostring(element, encoding=None, method=None,
             xml_declaration=None, default_namespace=None,
             short_empty_elements=True):
    """Serialize an element (and its subtree) to XML.

    Returns bytes, or str when encoding='unicode'.  Only method='xml'
    (the default) is supported."""

    if method is not None and method != 'xml':
        raise ValueError('unsupported serialization method: ' + str(method))
    out = []
    if xml_declaration:
        declared = encoding if (encoding and encoding != 'unicode') else 'utf-8'
        out.append("<?xml version='1.0' encoding='" + declared + "'?>\n")
    _serialize_element(element, out, short_empty_elements)
    text = ''.join(out)
    if encoding == 'unicode':
        return text
    if encoding is None:
        return text.encode('ascii')
    return text.encode(encoding)


def fromstring(text, parser=None):
    raise NotImplementedError(
        'Grail ElementTree is serialize-only; XML parsing is not implemented')


def XML(text, parser=None):
    return fromstring(text, parser)


def parse(source, parser=None):
    raise NotImplementedError(
        'Grail ElementTree is serialize-only; XML parsing is not implemented')
