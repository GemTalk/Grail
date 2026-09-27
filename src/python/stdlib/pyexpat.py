"""A pure-Python stand-in for CPython's `pyexpat` C extension.

Grail has no XML parser at all: `pyexpat` is C, so `xml.sax.make_parser()`
raised SAXReaderNotAvailable and `xml.etree.ElementTree.fromstring` raised
NotImplementedError. Everything else in both packages is pure Python and
already present, so ONE module is what stands between them and working.

WHY EXPAT'S SHAPE RATHER THAN A NICER ONE: CPython's `xml/sax/expatreader.py`
and `ElementTree`'s parser are written against this exact API -- handler
attributes assigned onto a parser object, `Parse(data, isfinal)` fed
incrementally, errors raised as `ExpatError` carrying `code`/`lineno`/`offset`.
Matching it means those files run UNMODIFIED, which is the whole point: they
are the tested, upstream implementations and nothing here has to re-derive
their behaviour.

SCOPE, stated honestly. This parses well-formed XML: elements, attributes,
text, CDATA, comments, processing instructions, character references, the five
predefined entities, and namespace processing when a separator is given. It
reports well-formedness errors with expat's own codes, messages and positions.

It does NOT implement the DTD engine -- no entity expansion beyond the
predefined five, no external entities, no validation, no conditional sections.
`<!DOCTYPE ...>` is recognised and reported through the doctype handlers, and
its internal subset is skipped rather than interpreted. Those are the parts of
expat that need a DTD, and a caller that needs them gets a clear
`XML_ERROR_UNDEFINED_ENTITY` at the reference rather than silently wrong text.

Positions are 0-based columns and 1-based lines, as expat reports them.
"""

__version__ = '2.5.0-grail'
EXPAT_VERSION = 'expat_2.5.0-grail'
version_info = (2, 5, 0)
native_encoding = 'UTF-8'

import codecs

XML_PARAM_ENTITY_PARSING_NEVER = 0
XML_PARAM_ENTITY_PARSING_UNLESS_STANDALONE = 1
XML_PARAM_ENTITY_PARSING_ALWAYS = 2


class ExpatError(Exception):
    """Expat's error type. `code`, `lineno` and `offset` are read by callers."""

    def __init__(self, message, code=0, lineno=1, offset=0):
        Exception.__init__(self, message)
        self.code = code
        self.lineno = lineno
        self.offset = offset


error = ExpatError


class _Errors:
    XML_ERROR_NONE = 'no error'
    XML_ERROR_NO_MEMORY = 'out of memory'
    XML_ERROR_SYNTAX = 'syntax error'
    XML_ERROR_NO_ELEMENTS = 'no element found'
    XML_ERROR_INVALID_TOKEN = 'not well-formed (invalid token)'
    XML_ERROR_UNCLOSED_TOKEN = 'unclosed token'
    XML_ERROR_PARTIAL_CHAR = 'partial character'
    XML_ERROR_TAG_MISMATCH = 'mismatched tag'
    XML_ERROR_DUPLICATE_ATTRIBUTE = 'duplicate attribute'
    XML_ERROR_JUNK_AFTER_DOC_ELEMENT = 'junk after document element'
    XML_ERROR_UNDEFINED_ENTITY = 'undefined entity'
    XML_ERROR_BAD_CHAR_REF = 'reference to invalid character number'
    XML_ERROR_UNCLOSED_CDATA_SECTION = 'unclosed CDATA section'
    XML_ERROR_UNBOUND_PREFIX = 'unbound prefix'
    XML_ERROR_XML_DECL = 'XML declaration not well-formed'
    XML_ERROR_UNKNOWN_ENCODING = 'unknown encoding'
    XML_ERROR_INCORRECT_ENCODING = 'encoding specified in XML declaration is incorrect'

    # expat's own numbering, so a caller comparing `err.code` to
    # `errors.codes[errors.XML_ERROR_x]` gets what it does upstream.
    codes = {
        'out of memory': 1,
        'syntax error': 2,
        'no element found': 3,
        'not well-formed (invalid token)': 4,
        'unclosed token': 5,
        'partial character': 6,
        'mismatched tag': 7,
        'duplicate attribute': 8,
        'junk after document element': 9,
        'undefined entity': 11,
        'reference to invalid character number': 14,
        'unclosed CDATA section': 20,
        'unbound prefix': 27,
        'XML declaration not well-formed': 30,
        'unknown encoding': 18,
        'encoding specified in XML declaration is incorrect': 19,
    }


errors = _Errors()
errors.messages = {v: k for k, v in errors.codes.items()}


class _Model:
    """expat's content-model constants.

    Carried because `xml/parsers/expat.py` registers `pyexpat.model` as a
    submodule at import; the values are expat's own. Nothing here interprets a
    content model -- there is no DTD engine -- but the names have to exist for
    that import to work, and a caller reading them gets the right numbers.
    """
    XML_CTYPE_EMPTY = 1
    XML_CTYPE_ANY = 2
    XML_CTYPE_MIXED = 3
    XML_CTYPE_NAME = 4
    XML_CTYPE_CHOICE = 5
    XML_CTYPE_SEQ = 6
    XML_CQUANT_NONE = 0
    XML_CQUANT_OPT = 1
    XML_CQUANT_REP = 2
    XML_CQUANT_PLUS = 3


model = _Model()


def ErrorString(code):
    """expat.ErrorString(code) -> message, or None for an unknown code."""
    return errors.messages.get(code)


_PREDEFINED = {'lt': '<', 'gt': '>', 'amp': '&', 'quot': '"', 'apos': "'"}

_NAME_START_EXTRA = ':_'
_NAME_EXTRA = ':_-.'


def _is_name_start(ch):
    return ch.isalpha() or ch in _NAME_START_EXTRA or ord(ch) > 127


def _is_name_char(ch):
    return ch.isalnum() or ch in _NAME_EXTRA or ord(ch) > 127


_HANDLER_NAMES = (
    'StartElementHandler', 'EndElementHandler', 'CharacterDataHandler',
    'ProcessingInstructionHandler', 'CommentHandler',
    'StartCdataSectionHandler', 'EndCdataSectionHandler',
    'StartNamespaceDeclHandler', 'EndNamespaceDeclHandler',
    'StartDoctypeDeclHandler', 'EndDoctypeDeclHandler',
    'UnparsedEntityDeclHandler', 'NotationDeclHandler',
    'SkippedEntityHandler', 'ExternalEntityRefHandler',
    'NotStandaloneHandler', 'DefaultHandler', 'DefaultHandlerExpand',
    'XmlDeclHandler', 'ElementDeclHandler', 'AttlistDeclHandler',
    'EntityDeclHandler',
)


class xmlparser:
    """One parse in progress. Handlers are ASSIGNED onto the instance.

    Expat's own object is likewise a plain attribute bag: `expatreader` writes
    `self._parser.StartElementHandler = self.start_element`, so an unset
    handler must simply be absent/None rather than raising.
    """

    def __init__(self, encoding=None, namespace_separator=None, intern=None):
        if namespace_separator is not None:
            if not isinstance(namespace_separator, str):
                raise TypeError(
                    'ParserCreate() argument 2 must be str or None, not %s'
                    % type(namespace_separator).__name__)
            if len(namespace_separator) > 1:
                raise ValueError(
                    'namespace_separator must be at most one character, '
                    'omitted, or None')
        self.encoding = encoding
        self._ns_sep = namespace_separator
        self.buffer_text = False
        self.ordered_attributes = False
        self.specified_attributes = False
        self.namespace_prefixes = False
        self.returns_unicode = True
        for name in _HANDLER_NAMES:
            setattr(self, name, None)
        # position reporting
        self.ErrorCode = 0
        self.ErrorLineNumber = 1
        self.ErrorColumnNumber = 0
        self.ErrorByteIndex = 0
        self.CurrentLineNumber = 1
        self.CurrentColumnNumber = 0
        self.CurrentByteIndex = 0
        # parse state
        self._buf = ''
        self._pos = 0
        self._line = 1
        self._col = 0
        self._stack = []          # open elements: (reported_name, raw_name)
        self._ns_stack = []       # per-element list of prefixes declared
        self._ns_map = [{}]       # prefix -> uri, innermost last
        self._seen_root = False
        self._done = False
        self._base = None
        self._defer = True
        self._entities = {}       # name -> replacement text, from the subset
        self._decoder = None      # incremental decoder, once the encoding is known
        self._rawhead = b''       # bytes held back until it is
        self._encoding_used = None
        self._encoding_col = None # where a declared encoding's value starts

    # ---------------------------------------------------------- public API

    def Parse(self, data, isfinal=False):
        """Feed a chunk. Text is accumulated, so a token split across two
        chunks is handled by leaving it unconsumed until more arrives."""
        if isinstance(data, (bytes, bytearray)):
            try:
                data = self._decode(bytes(data), isfinal)
            except _UndecodableBytes as bad:
                self._fail_at_undecodable(bad)
        self._buf += data
        self._scan(isfinal)
        if isfinal:
            if not self._seen_root:
                self._fail(errors.XML_ERROR_NO_ELEMENTS)
            if self._stack:
                self._fail(errors.XML_ERROR_NO_ELEMENTS)
            self._done = True
        return 1

    def ParseFile(self, file):
        while True:
            chunk = file.read(65536)
            if not chunk:
                return self.Parse(b'', True)
            self.Parse(chunk, False)

    def SetBase(self, base):
        self._base = base

    def GetBase(self):
        return self._base

    def SetParamEntityParsing(self, flag):
        return 1

    def SetReparseDeferralEnabled(self, enabled):
        self._defer = bool(enabled)

    def GetReparseDeferralEnabled(self):
        return self._defer

    def GetInputContext(self):
        if self._buf is None:
            return None
        return self._buf[self._pos:].encode('utf-8', 'replace')

    def ExternalEntityParserCreate(self, context, encoding=None):
        sub = xmlparser(encoding or self.encoding, self._ns_sep)
        for name in _HANDLER_NAMES:
            setattr(sub, name, getattr(self, name, None))
        sub._base = self._base
        return sub

    def UseForeignDTD(self, flag=True):
        return None

    # ------------------------------------------------------------ internals

    def _decode(self, raw, isfinal):
        """The text of one chunk of bytes, through ONE incremental decoder.

        Two things this used to get wrong, both of which expat gets right:

          * the document's own encoding.  It decoded as UTF-8 unless
            ParserCreate named an encoding, so a document declaring
            ``encoding="iso-8859-1"'' failed at its first non-ASCII byte --
            test_pulldom's test.xml ends in a Latin-1 0xB5.  The encoding is
            now chosen as expat chooses it (_sniff_encoding).
          * a character split across two Parse calls.  Each chunk was decoded
            on its own, so a UTF-8 sequence cut by a chunk boundary was
            invalid in both halves.  The incremental decoder holds the
            partial bytes until the next chunk completes them.
        """
        if self._decoder is None:
            self._rawhead += raw
            enc = self._sniff_encoding(self._rawhead, isfinal)
            if enc is None:
                return ''
            raw, self._rawhead = self._rawhead, b''
            # An unknown encoding is a LookupError, not an ExpatError: CPython's
            # pyexpat asks the codec registry, and lets its answer through --
            # for a declared encoding and for ParserCreate's alike.
            if not _check_supported_encoding(enc):
                self._fail(errors.XML_ERROR_UNKNOWN_ENCODING, 1,
                           self._encoding_col or 0)
            self._decoder = codecs.getincrementaldecoder(enc)()
            self._encoding_used = enc
        try:
            return self._decoder.decode(raw, isfinal)
        except UnicodeDecodeError as exc:
            good = codecs.decode(exc.object[:exc.start], self._encoding_used)
            partial = isfinal and exc.reason.startswith('unexpected end')
            raise _UndecodableBytes(good, partial)

    def _fail_at_undecodable(self, bad):
        """Report bytes the encoding cannot decode as expat does: the text
        BEFORE them is parsed first -- its events are delivered -- and the
        error is placed at the first bad byte.  It used to fail at once, at
        line 1 column 0, and always as an invalid token; expat calls a
        sequence the input ends inside a partial character."""
        self._buf += bad.good
        self._scan(False)
        # A text run the scanner held back for want of a closing ``<'' is
        # complete here -- nothing can follow the bad byte -- and expat
        # delivers it before reporting.  Only plain text: a ``<'' or ``&''
        # would be an unfinished tag or reference, which it is not.
        rest = self._buf[self._pos:]
        if rest and '<' not in rest and '&' not in rest:
            self._scan_text(True)
        line, col = self._offset_pos(self._line, self._col,
                                     self._buf[self._pos:],
                                     len(self._buf) - self._pos)
        self._fail(errors.XML_ERROR_PARTIAL_CHAR if bad.partial
                   else errors.XML_ERROR_INVALID_TOKEN, line, col)

    def _sniff_encoding(self, head, isfinal):
        """The encoding to decode with, or None while `head` is too short to
        say.  In expat's order: the encoding given to ParserCreate, then what
        the first bytes show -- a byte-order mark, or a BOM-less UTF-16
        ``<'' -- and within an 8-bit encoding the XML declaration's
        ``encoding='', then UTF-8."""
        if self.encoding:
            return self.encoding
        for sig, enc in _SIGNATURES:
            if head.startswith(sig):
                if enc == 'utf-8-sig':
                    return enc
                return self._checked_wide(head, enc, isfinal)
        if not isfinal and any(sig.startswith(head) for sig, _ in _SIGNATURES):
            return None
        if not head.startswith(b'<?xml'):
            if not isfinal and b'<?xml'.startswith(head):
                return None
            return 'utf-8'
        end = head.find(b'?>')
        if end < 0:
            return 'utf-8' if isfinal else None
        text = head[:end].decode('ascii', 'replace')
        declared, at = _declared_encoding(text)
        if declared is None:
            return 'utf-8'
        self._encoding_col = at
        # The declaration was just read as 8-bit text, so the bytes cannot be
        # a 16- or 32-bit encoding: expat's ``incorrect'' error.
        if _is_wide_encoding(declared):
            self._fail(errors.XML_ERROR_INCORRECT_ENCODING, 1, at)
        return declared

    def _checked_wide(self, head, enc, isfinal):
        """`enc`, a UTF-16 the first bytes showed, once any XML declaration
        has been checked against it: one naming an 8-bit encoding is expat's
        ``incorrect'' error, as the bytes plainly are not 8-bit."""
        text = head[:len(head) & ~1].decode(enc, 'replace').lstrip('\ufeff')
        if not text.startswith('<?xml'):
            if not isfinal and '<?xml'.startswith(text):
                return None
            return enc
        end = text.find('?>')
        if end < 0:
            return enc if isfinal else None
        declared, at = _declared_encoding(text[:end])
        if declared is not None and not _is_wide_encoding(declared):
            self._fail(errors.XML_ERROR_INCORRECT_ENCODING, 1, at)
        return enc

    def _fail(self, message, line=None, col=None):
        code = errors.codes.get(message, 2)
        lineno = self._line if line is None else line
        offset = self._col if col is None else col
        self.ErrorCode = code
        self.ErrorLineNumber = lineno
        self.ErrorColumnNumber = offset
        raise ExpatError('%s: line %d, column %d' % (message, lineno, offset),
                         code, lineno, offset)

    def _advance(self, n):
        """Consume n characters, tracking line/column the way expat does."""
        chunk = self._buf[self._pos:self._pos + n]
        nl = chunk.count('\n')
        if nl:
            self._line += nl
            self._col = len(chunk) - chunk.rfind('\n') - 1
        else:
            self._col += len(chunk)
        self._pos += n
        self.CurrentLineNumber = self._line
        self.CurrentColumnNumber = self._col

    def _offset_pos(self, base_line, base_col, text, index):
        """(line, col) of `index` within `text`, given where `text` started.

        EXPAT REPORTS WHERE A CONSTRUCT BEGINS, not where the scanner noticed
        it: a mismatched `</c>` is blamed at the NAME, an undefined `&zz;` at
        the `&`. Reporting the position after consuming the token -- which is
        where the scanner naturally is -- put every such error two columns
        late, and off the end of the line entirely for a tag at a line end.
        """
        head = text[:index]
        nl = head.count('\n')
        if nl == 0:
            return base_line, base_col + index
        return base_line + nl, index - head.rfind('\n') - 1

    def _call(self, name, *args):
        h = getattr(self, name, None)
        if h is not None:
            h(*args)

    def _default(self, text):
        h = self.DefaultHandlerExpand or self.DefaultHandler
        if h is not None:
            h(text)

    # ------------------------------------------------------------- scanning

    def _scan(self, isfinal):
        """Consume as much of the buffer as is unambiguously complete.

        INCOMPLETENESS IS THE WHOLE DIFFICULTY of an incremental parser: a
        chunk may end in the middle of a tag, a comment or a text run, and the
        only safe response is to leave it unconsumed and wait. Each branch
        below therefore returns without consuming when it cannot see its own
        terminator, unless `isfinal` says no more is coming -- at which point
        the same shortfall becomes an unclosed-token error.
        """
        while self._pos < len(self._buf):
            ch = self._buf[self._pos]
            if ch == '<':
                if not self._scan_markup(isfinal):
                    return
            else:
                if not self._scan_text(isfinal):
                    return
        # a text run that ended exactly at the buffer end is complete only
        # once the caller says so; handled inside _scan_text.

    def _scan_markup(self, isfinal):
        buf, i = self._buf, self._pos
        rest = buf[i:]
        if rest.startswith('<!--'):
            end = buf.find('-->', i + 4)
            if end < 0:
                if isfinal:
                    self._fail(errors.XML_ERROR_UNCLOSED_TOKEN)
                return False
            text = buf[i + 4:end]
            self._advance(end + 3 - i)
            if self.CommentHandler is not None:
                self.CommentHandler(text)
            else:
                self._default('<!--%s-->' % text)
            return True
        if rest.startswith('<![CDATA['):
            end = buf.find(']]>', i + 9)
            if end < 0:
                if isfinal:
                    self._fail(errors.XML_ERROR_UNCLOSED_CDATA_SECTION)
                return False
            text = buf[i + 9:end]
            self._advance(end + 3 - i)
            self._call('StartCdataSectionHandler')
            if text:
                self._emit_text(text)
            self._call('EndCdataSectionHandler')
            return True
        if rest.startswith('<?'):
            end = buf.find('?>', i + 2)
            if end < 0:
                if isfinal:
                    self._fail(errors.XML_ERROR_UNCLOSED_TOKEN)
                return False
            body = buf[i + 2:end]
            self._advance(end + 2 - i)
            self._pi(body)
            return True
        if rest.startswith('<!DOCTYPE'):
            return self._scan_doctype(isfinal)
        if rest.startswith('</'):
            end = buf.find('>', i)
            if end < 0:
                if isfinal:
                    self._fail(errors.XML_ERROR_UNCLOSED_TOKEN)
                return False
            name = buf[i + 2:end].strip()
            # captured BEFORE consuming: expat blames the name, two in from '<'
            nline, ncol = self._line, self._col + 2
            self._advance(end + 1 - i)
            self._end_element(name, line=nline, col=ncol)
            return True
        if len(rest) < 2 and not isfinal:
            return False
        nxt = rest[1] if len(rest) > 1 else ''
        if nxt and not _is_name_start(nxt):
            self._fail(errors.XML_ERROR_INVALID_TOKEN)
        end = self._find_tag_end(i)
        if end < 0:
            if isfinal:
                self._fail(errors.XML_ERROR_UNCLOSED_TOKEN)
            return False
        self._start_element(buf[i + 1:end], end + 1 - i)
        return True

    def _find_tag_end(self, i):
        """Index of the '>' closing the tag at i, respecting quoted values."""
        buf = self._buf
        j = i + 1
        quote = ''
        while j < len(buf):
            c = buf[j]
            if quote:
                if c == quote:
                    quote = ''
            elif c in '"\'':
                quote = c
            elif c == '>':
                return j
            elif c == '<':
                self._fail(errors.XML_ERROR_INVALID_TOKEN)
            j += 1
        return -1

    def _scan_text(self, isfinal):
        buf, i = self._buf, self._pos
        end = buf.find('<', i)
        if end < 0:
            # Text to the end of the buffer: only final if no more is coming,
            # because the next chunk may continue the same run.
            if not isfinal:
                return False
            end = len(buf)
        if end == i:
            return True
        raw = buf[i:end]
        if ']]>' in raw:
            self._fail(errors.XML_ERROR_INVALID_TOKEN)
        if not self._seen_root and raw.strip():
            self._fail(errors.XML_ERROR_SYNTAX)
        if self._done and raw.strip():
            self._fail(errors.XML_ERROR_JUNK_AFTER_DOC_ELEMENT)
        if not self._stack and raw.strip():
            self._fail(errors.XML_ERROR_JUNK_AFTER_DOC_ELEMENT)
        tline, tcol = self._line, self._col
        self._advance(end - i)
        if self._stack:
            self._emit_text(self._expand(raw, tline, tcol))
        else:
            self._default(raw)
        return True

    def _emit_text(self, text):
        if text and self.CharacterDataHandler is not None:
            self.CharacterDataHandler(text)
        elif text:
            self._default(text)

    # ----------------------------------------------------- pieces of markup

    def _pi(self, body):
        body = body.lstrip()
        if body[:3].lower() == 'xml' and (len(body) == 3 or not _is_name_char(body[3])):
            self._xml_decl(body)
            return
        k = 0
        while k < len(body) and _is_name_char(body[k]):
            k += 1
        target, data = body[:k], body[k:].lstrip()
        if self.ProcessingInstructionHandler is not None:
            self.ProcessingInstructionHandler(target, data)
        else:
            self._default('<?%s?>' % body)

    def _xml_decl(self, body):
        attrs = {}
        for key in ('version', 'encoding', 'standalone'):
            at = body.find(key + '=')
            if at < 0:
                continue
            q = body[at + len(key) + 1:at + len(key) + 2]
            if q not in '"\'':
                self._fail(errors.XML_ERROR_XML_DECL)
            close = body.find(q, at + len(key) + 2)
            if close < 0:
                self._fail(errors.XML_ERROR_XML_DECL)
            attrs[key] = body[at + len(key) + 2:close]
        if 'version' not in attrs:
            self._fail(errors.XML_ERROR_XML_DECL)
        standalone = -1
        if attrs.get('standalone') == 'yes':
            standalone = 1
        elif attrs.get('standalone') == 'no':
            standalone = 0
        if self.XmlDeclHandler is not None:
            self.XmlDeclHandler(attrs.get('version'), attrs.get('encoding'),
                                standalone)
        else:
            self._default('<?%s?>' % body)

    def _scan_doctype(self, isfinal):
        """`<!DOCTYPE name ...>`, with the internal subset SKIPPED.

        Skipped rather than interpreted: the subset is the DTD engine, which
        this parser does not have. The doctype handlers still fire, so a
        caller that only wants to see the declaration gets it; a caller that
        needs entities declared there gets an undefined-entity error at the
        reference, which is a better answer than silently empty text.
        """
        buf, i = self._buf, self._pos
        j, depth, quote = i + 9, 0, ''
        while j < len(buf):
            c = buf[j]
            if quote:
                if c == quote:
                    quote = ''
            elif c in '"\'':
                quote = c
            elif c == '[':
                depth += 1
            elif c == ']':
                depth -= 1
            elif c == '>' and depth <= 0:
                break
            j += 1
        else:
            if isfinal:
                self._fail(errors.XML_ERROR_UNCLOSED_TOKEN)
            return False
        body = buf[i + 9:j]
        subset = ''
        if '[' in body:
            lo = body.index('[')
            hi = body.rfind(']')
            subset = body[lo + 1:hi] if hi > lo else ''
            body = body[:lo]
        parts = body.split()
        name = parts[0] if parts else ''
        sysid = pubid = None
        if 'PUBLIC' in parts:
            k = parts.index('PUBLIC')
            pubid = parts[k + 1].strip('"\'') if len(parts) > k + 1 else None
            sysid = parts[k + 2].strip('"\'') if len(parts) > k + 2 else None
        elif 'SYSTEM' in parts:
            k = parts.index('SYSTEM')
            sysid = parts[k + 1].strip('"\'') if len(parts) > k + 1 else None
        self._advance(j + 1 - i)
        self._collect_subset_entities(subset)
        self._call('StartDoctypeDeclHandler', name, sysid, pubid, bool(subset))
        self._call('EndDoctypeDeclHandler')
        return True

    def _collect_subset_entities(self, subset):
        """Pick up simple `<!ENTITY name "text">` declarations only.

        A one-line internal entity is common enough in real documents to be
        worth honouring; anything with a parameter entity, NDATA or an
        external id is left alone, so a reference to it still reports
        undefined rather than expanding to something invented here.
        """
        k = 0
        while True:
            k = subset.find('<!ENTITY', k)
            if k < 0:
                return
            stop = subset.find('>', k)
            if stop < 0:
                return
            decl = subset[k + 8:stop].strip()
            k = stop + 1
            if decl.startswith('%') or 'NDATA' in decl \
               or 'SYSTEM' in decl or 'PUBLIC' in decl:
                continue
            bits = decl.split(None, 1)
            if len(bits) != 2:
                continue
            name, value = bits[0], bits[1].strip()
            if len(value) >= 2 and value[0] in '"\'' and value[-1] == value[0]:
                self._entities[name] = value[1:-1]

    # --------------------------------------------------------- element tags

    def _start_element(self, body, consumed):
        selfclose = body.rstrip().endswith('/')
        if selfclose:
            body = body.rstrip()[:-1]
        k = 0
        while k < len(body) and _is_name_char(body[k]):
            k += 1
        raw_name = body[:k]
        if not raw_name:
            self._fail(errors.XML_ERROR_INVALID_TOKEN)
        if self._done:
            self._fail(errors.XML_ERROR_JUNK_AFTER_DOC_ELEMENT)
        attrs_raw = self._parse_attrs(body[k:])
        self._advance(consumed)
        self._seen_root = True

        decls = []
        if self._ns_sep is not None:
            scope = dict(self._ns_map[-1])
            for an, av in attrs_raw:
                if an == 'xmlns':
                    scope[''] = av
                    decls.append(('', av))
                elif an.startswith('xmlns:'):
                    scope[an[6:]] = av
                    decls.append((an[6:], av))
            self._ns_map.append(scope)
            for prefix, uri in decls:
                self._call('StartNamespaceDeclHandler', prefix or None, uri)
        self._ns_stack.append(decls)

        name = self._expand_name(raw_name, is_attr=False)
        attrs = self._build_attrs(attrs_raw)
        self._stack.append((name, raw_name))
        self._call('StartElementHandler', name, attrs)
        if selfclose:
            self._end_element(raw_name, synthetic=True)

    def _parse_attrs(self, text):
        """`name="value"` pairs, in source order, values reference-expanded."""
        out, i, n = [], 0, len(text)
        seen = set()
        while i < n:
            while i < n and text[i].isspace():
                i += 1
            if i >= n:
                break
            start = i
            while i < n and _is_name_char(text[i]):
                i += 1
            name = text[start:i]
            if not name:
                self._fail(errors.XML_ERROR_INVALID_TOKEN)
            while i < n and text[i].isspace():
                i += 1
            if i >= n or text[i] != '=':
                self._fail(errors.XML_ERROR_INVALID_TOKEN)
            i += 1
            while i < n and text[i].isspace():
                i += 1
            if i >= n or text[i] not in '"\'':
                self._fail(errors.XML_ERROR_INVALID_TOKEN)
            quote = text[i]
            close = text.find(quote, i + 1)
            if close < 0:
                self._fail(errors.XML_ERROR_UNCLOSED_TOKEN)
            value = text[i + 1:close]
            i = close + 1
            if name in seen:
                self._fail(errors.XML_ERROR_DUPLICATE_ATTRIBUTE)
            seen.add(name)
            # newlines inside an attribute value normalise to spaces
            value = self._expand(value).replace('\n', ' ').replace('\t', ' ')
            out.append((name, value))
        return out

    def _build_attrs(self, attrs_raw):
        pairs = []
        for an, av in attrs_raw:
            if self._ns_sep is not None and (
                    an == 'xmlns' or an.startswith('xmlns:')):
                if not self.namespace_prefixes:
                    continue
            pairs.append((self._expand_name(an, is_attr=True), av))
        if self.ordered_attributes:
            flat = []
            for an, av in pairs:
                flat.append(an)
                flat.append(av)
            return flat
        return dict(pairs)

    def _expand_name(self, raw, is_attr):
        """`prefix:local` -> `uri<sep>local` when namespace processing is on."""
        if self._ns_sep is None:
            return raw
        if ':' in raw:
            prefix, local = raw.split(':', 1)
            if prefix == 'xmlns':
                return raw
            if prefix == 'xml':
                return 'http://www.w3.org/XML/1998/namespace' + self._ns_sep + local
            uri = self._ns_map[-1].get(prefix)
            if uri is None:
                self._fail(errors.XML_ERROR_UNBOUND_PREFIX)
            return uri + self._ns_sep + local
        if is_attr:
            return raw           # an unprefixed attribute is NOT in the default ns
        uri = self._ns_map[-1].get('')
        return (uri + self._ns_sep + raw) if uri else raw

    def _end_element(self, raw_name, synthetic=False, line=None, col=None):
        if not self._stack:
            self._fail(errors.XML_ERROR_NO_ELEMENTS, line, col)
        name, opened_raw = self._stack[-1]
        if raw_name != opened_raw:
            self._fail(errors.XML_ERROR_TAG_MISMATCH, line, col)
        self._stack.pop()
        self._call('EndElementHandler', name)
        decls = self._ns_stack.pop()
        if self._ns_sep is not None:
            self._ns_map.pop()
            for prefix, _uri in reversed(decls):
                self._call('EndNamespaceDeclHandler', prefix or None)
        if not self._stack:
            self._done = True

    # ----------------------------------------------------------- references

    def _expand(self, text, base_line=None, base_col=None):
        """Character references and entity references inside text/attributes.

        `base_line`/`base_col` say where `text` started, so a bad reference is
        blamed at its own `&` the way expat blames it. Omitted for attribute
        values, where the scanner position is already close enough and the
        text has been lifted out of its quotes.
        """
        if '&' not in text:
            return text
        out, i, n = [], 0, len(text)
        while i < n:
            c = text[i]
            if c != '&':
                out.append(c)
                i += 1
                continue
            amp = i
            if base_line is None:
                eline = ecol = None
            else:
                eline, ecol = self._offset_pos(base_line, base_col, text, amp)
            end = text.find(';', i)
            if end < 0:
                self._fail(errors.XML_ERROR_INVALID_TOKEN, eline, ecol)
            ref = text[i + 1:end]
            i = end + 1
            if ref.startswith('#'):
                try:
                    cp = int(ref[2:], 16) if ref[1:2].lower() == 'x' else int(ref[1:])
                except ValueError:
                    self._fail(errors.XML_ERROR_BAD_CHAR_REF, eline, ecol)
                if cp == 0 or cp > 0x10FFFF or 0xD800 <= cp <= 0xDFFF:
                    self._fail(errors.XML_ERROR_BAD_CHAR_REF, eline, ecol)
                out.append(chr(cp))
            elif ref in _PREDEFINED:
                out.append(_PREDEFINED[ref])
            elif ref in self._entities:
                out.append(self._entities[ref])
            elif self.SkippedEntityHandler is not None:
                self.SkippedEntityHandler(ref, False)
            else:
                self._fail(errors.XML_ERROR_UNDEFINED_ENTITY, eline, ecol)
        return ''.join(out)


class _UndecodableBytes(Exception):
    """Internal: a chunk held bytes its encoding cannot decode.  Carries the
    text decoded before them, and whether the input ended inside a
    sequence."""

    def __init__(self, good, partial):
        self.good = good
        self.partial = partial


# What the first bytes of a document can show about its encoding, as expat
# reads them: a byte-order mark, or the ``<'' every document starts with,
# spelled in UTF-16 without one.
_SIGNATURES = ((b'\xef\xbb\xbf', 'utf-8-sig'), (b'\xff\xfe', 'utf-16'),
               (b'\xfe\xff', 'utf-16'), (b'<\x00', 'utf-16-le'),
               (b'\x00<', 'utf-16-be'))


# The encodings expat decodes itself, as it spells them, plus the codec names
# _sniff_encoding answers for the byte orders it detects.  Every other name
# goes to pyexpat's unknown-encoding handler.
_EXPAT_BUILTIN_ENCODINGS = frozenset((
    'UTF-8', 'UTF-16', 'UTF-16BE', 'UTF-16LE', 'ISO-8859-1', 'US-ASCII',
    'UTF-8-SIG', 'UTF-16-BE', 'UTF-16-LE'))


# The ASCII bytes an unknown encoding must decode to themselves -- every one
# XML's syntax gives a meaning.  Measured from CPython's expat by giving it an
# identity codec with one byte remapped: these 90 are refused, and only the
# other control bytes, DEL and ``$ @ \ ^ ` { } ~'' may differ.
_EXPAT_FIXED_ASCII = frozenset(
    [9, 10, 13, 32, 33, 34, 35] + list(range(37, 64)) + list(range(65, 92))
    + [93, 95] + list(range(97, 123)) + [124])


def _check_supported_encoding(name):
    """What CPython's pyexpat unknown-encoding handler checks, for an
    encoding expat does not decode itself.  The codec must map each of the
    256 byte values to one character: it decodes them with ``replace'', and
    a multi-byte codec (big5, euc-kr, utf-7) is a ValueError, while a codec's
    own error or an unknown name's LookupError goes through unchanged.  And
    expat then refuses -- answered here as False, for the caller to report as
    ``unknown encoding'' -- a codec that moves any byte of XML's syntax
    (cp864's ``%''), which is how an EBCDIC declaration fails
    (test_xml_etree ElementTreeTest.test_encoding)."""
    if name.upper() in _EXPAT_BUILTIN_ENCODINGS:
        return True
    table = codecs.decode(bytes(range(256)), name, 'replace')
    if len(table) != 256:
        raise ValueError('multi-byte encodings are not supported')
    return all(table[b] == chr(b) for b in _EXPAT_FIXED_ASCII)


def _is_wide_encoding(name):
    return name.lower().replace('_', '-').startswith(
        ('utf-16', 'utf16', 'utf-32', 'utf32', 'ucs-2', 'ucs2', 'ucs-4', 'ucs4'))


def _declared_encoding(decl):
    """(the ``encoding='' pseudo-attribute of an XML declaration's text, the
    column its value starts at), or (None, None) when it has none."""
    at = decl.find('encoding')
    if at < 0:
        return None, None
    k = at + len('encoding')
    while decl[k:k + 1].isspace():
        k += 1
    if decl[k:k + 1] != '=':
        return None, None
    k += 1
    while decl[k:k + 1].isspace():
        k += 1
    quote = decl[k:k + 1]
    if quote not in ('"', "'"):
        return None, None
    close = decl.find(quote, k + 1)
    if close < 0:
        return None, None
    return decl[k + 1:close], k + 1


def ParserCreate(encoding=None, namespace_separator=None, intern=None):
    """expat.ParserCreate -- the one entry point callers use."""
    return xmlparser(encoding, namespace_separator, intern)


def ErrorString_(code):      # pragma: no cover - kept for symmetry
    return ErrorString(code)
