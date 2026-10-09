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

The DTD is read as far as expat reports it to handlers: the internal subset's
comments, processing instructions, entity declarations (internal, external
and unparsed) and notations, each through its handler; internal entities
expand in content (markup included) and in attribute values; an external
entity or an external DTD subset goes to ExternalEntityRefHandler, and
ExternalEntityParserCreate answers a parser for its text.  What is NOT here
is the rest of the DTD engine: element and attribute-list declarations reach
only the default handler (no content models, no attribute defaults), there is
no validation, no conditional sections, and parameter entities are recognised
but never expanded -- as expat itself behaves under its default
XML_PARAM_ENTITY_PARSING_NEVER.

Character data arrives in expat's own pieces, which callers see: without
buffer_text every newline, and every reference, is a call of its own.

Positions are 0-based columns and 1-based lines, as expat reports them.
"""

# 2.6.0 is the release whose incremental behaviour this reproduces: reparse
# deferral (xmlparser._reparse_due) arrived in it, and callers gate on it.
__version__ = '2.6.0-grail'
EXPAT_VERSION = 'expat_2.6.0-grail'
version_info = (2, 6, 0)
native_encoding = 'UTF-8'

import codecs
import re

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
    XML_ERROR_PARAM_ENTITY_REF = 'illegal parameter entity reference'
    XML_ERROR_UNDEFINED_ENTITY = 'undefined entity'
    XML_ERROR_RECURSIVE_ENTITY_REF = 'recursive entity reference'
    XML_ERROR_ASYNC_ENTITY = 'asynchronous entity'
    XML_ERROR_BAD_CHAR_REF = 'reference to invalid character number'
    XML_ERROR_BINARY_ENTITY_REF = 'reference to binary entity'
    XML_ERROR_ATTRIBUTE_EXTERNAL_ENTITY_REF = 'reference to external entity in attribute'
    XML_ERROR_EXTERNAL_ENTITY_HANDLING = 'error in processing external entity reference'
    XML_ERROR_UNCLOSED_CDATA_SECTION = 'unclosed CDATA section'
    XML_ERROR_UNBOUND_PREFIX = 'unbound prefix'
    XML_ERROR_XML_DECL = 'XML declaration not well-formed'
    XML_ERROR_TEXT_DECL = 'text declaration not well-formed'
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
        'illegal parameter entity reference': 10,
        'undefined entity': 11,
        'recursive entity reference': 12,
        'asynchronous entity': 13,
        'reference to invalid character number': 14,
        'reference to binary entity': 15,
        'reference to external entity in attribute': 16,
        'unclosed CDATA section': 20,
        'error in processing external entity reference': 21,
        'unbound prefix': 27,
        'XML declaration not well-formed': 30,
        'text declaration not well-formed': 31,
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

_DEFAULT_SLOT = ('DefaultHandler', 'DefaultHandlerExpand')


class xmlparser:
    """One parse in progress. Handlers are ASSIGNED onto the instance.

    Expat's own object is likewise a plain attribute bag: `expatreader` writes
    `self._parser.StartElementHandler = self.start_element`, so an unset
    handler must simply be absent/None rather than raising.
    """

    # DefaultHandler and DefaultHandlerExpand are ONE slot in expat: each
    # assignment installs its own callback there (XML_SetDefaultHandler /
    # XML_SetDefaultHandlerExpand), so the later one wins -- even a None, which
    # leaves no default handler at all.  Each also sets whether an internal
    # entity reference in content is expanded or handed over as &name;''
    # (m_defaultExpandInternalEntities), and that flag is set by a None too.
    # Reading either attribute answers what was assigned to it, as CPython's
    # pyexpat does.
    @property
    def DefaultHandler(self):
        return self._dh

    @DefaultHandler.setter
    def DefaultHandler(self, handler):
        self._dh = handler
        self._dflt, self._dflt_expand = handler, False

    @property
    def DefaultHandlerExpand(self):
        return self._dhe

    @DefaultHandlerExpand.setter
    def DefaultHandlerExpand(self, handler):
        self._dhe = handler
        self._dflt, self._dflt_expand = handler, True

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
        self._textbuf = []        # character data held back by buffer_text
        # The DTD, as far as handlers see it.  Shared by reference with any
        # parser ExternalEntityParserCreate makes, so an entity an external
        # subset declares is known to the document that loaded it.
        self._entities = {}       # name -> replacement text (internal)
        self._pe_names = set()    # parameter entities declared
        self._external = {}       # name -> (base, sysid, pubid)
        self._unparsed = {}       # name -> notation (NDATA: binary)
        self._param_parsing = XML_PARAM_ENTITY_PARSING_NEVER
        self._standalone = -1
        self._dtd_skips = False   # undefined entity: skipped, not an error
        self._keep_decls = True   # false after a PE reference expat skips
        self._fragment = False    # external parsed entity: content, no root
        self._dtd_mode = False    # external DTD subset: declarations only
        self._open_entities = []  # internal entities being expanded
        self._ref_pos = None      # where the outermost of them was referenced
        self._decoder = None      # incremental decoder, once the encoding is known
        self._rawhead = b''       # bytes held back until it is
        self._encoding_used = None
        self._encoding_col = None # where a declared encoding's value starts
        self._bom = 0             # 1 when the input began with a byte-order mark
        self._attlists = {}       # element -> {attribute: (type, default)}
        self._pending_cr = False  # a CR ending the last chunk, maybe of a CRLF
        # Reparse deferral: expat's input buffer, in bytes, as far as its
        # heuristic reads it -- allocated size, bufferPtr, bufferEnd.
        self._reparse_deferral = True
        self._xsize = self._xptr = self._xend = 0
        self._partial_before = 0  # bytes on hand when a parse consumed none
        self._deferred = []       # chunks a deferred Parse call set aside

    # ---------------------------------------------------------- public API

    def Parse(self, data, isfinal=False):
        """Feed a chunk. Text is accumulated, so a token split across two
        chunks is handled by leaving it unconsumed until more arrives."""
        if isinstance(data, (bytes, bytearray)):
            data = bytes(data)
            nbytes = len(data)
        else:
            nbytes = len(data.encode('utf-8', 'surrogatepass'))
        if not self._reparse_due(nbytes, isfinal):
            # Not even decoded: expat has not looked at these bytes, so an
            # error in them is not reported yet either.
            self._deferred.append(data)
            return 1
        pieces, self._deferred = self._deferred + [data], []
        for k, piece in enumerate(pieces):
            final = isfinal and k == len(pieces) - 1
            if isinstance(piece, bytes):
                try:
                    piece = self._decode(piece, final)
                except _UndecodableBytes as bad:
                    self._fail_at_undecodable(bad)
            # A character XML does not allow -- a C0 control, U+FFFE -- is an
            # invalid token wherever it appears, and expat reports it once it
            # has parsed everything before it, exactly as it does bytes the
            # encoding cannot decode.  Grail passed them through.
            invalid = _INVALID_XML_CHAR.search(piece)
            if invalid is not None:
                self._fail_at_undecodable(
                    _UndecodableBytes(piece[:invalid.start()], False))
            self._buf += self._normalise_newlines(piece, final)
        if self._dtd_mode:
            self._advance(self._subset(self._buf[self._pos:], isfinal, True))
        else:
            self._scan(isfinal)
        self._note_consumed()
        # Drop what has been consumed.  Nothing looks behind self._pos once a
        # Parse returns, and a long ParseFile otherwise kept -- and recopied on
        # every ``+='' -- the whole document read so far (#1214).
        if self._pos:
            self._buf = self._buf[self._pos:]
            self._pos = 0
        # CPython's pyexpat flushes buffer_text's held text at the end of
        # every Parse call, not only when another event arrives.
        self._flush_text()
        if isfinal:
            if not self._dtd_mode:
                if not self._seen_root:
                    self._fail(errors.XML_ERROR_NO_ELEMENTS)
                if self._stack:
                    self._fail(errors.XML_ERROR_NO_ELEMENTS)
            self._done = True
        return 1

    def _normalise_newlines(self, data, isfinal):
        """XML 2.11: every CRLF, and every lone CR, is a LF before anything
        else sees the text -- expat does it on input, so content, attribute
        values and positions all see one line break.  An attribute value holding
        a literal CRLF therefore normalises to ONE space, not two
        (test_xml_etree's expat224_utf8_bug.xml).  A CR a character reference
        produces is not input, and survives.  A CR ending a chunk is held back
        until the next one says whether an LF follows it."""
        if self._pending_cr:
            data = '\r' + data
            self._pending_cr = False
        if not isfinal and data.endswith('\r'):
            data = data[:-1]
            self._pending_cr = True
        if '\r' in data:
            data = data.replace('\r\n', '\n').replace('\r', '\n')
        return data

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
        """Only decides whether an external DTD subset is asked for:
        parameter entities themselves are never expanded (see the module
        docstring)."""
        self._param_parsing = flag
        return 1

    def SetReparseDeferralEnabled(self, enabled):
        self._reparse_deferral = bool(enabled)

    def GetReparseDeferralEnabled(self):
        return self._reparse_deferral

    def _reparse_due(self, nbytes, isfinal):
        """Whether this Parse call parses at all -- expat 2.6's reparse
        deferral, reproduced from xmlparse.c (XML_GetBuffer, callProcessor).

        A token split across chunks is re-scanned from its start on every
        Parse call, which is quadratic in a large token fed a little at a
        time.  So once a parse has consumed nothing, expat does not try again
        until the unconsumed bytes have at least doubled -- or until the next
        request of this size would outgrow its buffer.  Visible as events that
        arrive late: ``<doc'' then ``>'' starts no element until flush() (or
        more input), because 5 bytes is not twice 4.  A final chunk, and a
        parser with deferral off, always parse.

        The byte counts are expat's, of the undecoded input: the buffer below
        is modelled only as far as the heuristic reads it."""
        # XML_GetBuffer(nbytes), keeping XML_CONTEXT_BYTES (1024) of context.
        if nbytes > self._xsize - self._xend:
            keep = min(self._xptr, 1024)
            needed = nbytes + (self._xend - self._xptr) + keep
            if self._xsize and needed <= self._xsize:
                if keep < self._xptr:
                    offset = self._xptr - keep
                    self._xend -= offset
                    self._xptr -= offset
            else:
                size = (self._xsize or 1024) * 2
                while size < needed:
                    size *= 2
                if self._xsize:
                    self._xend = self._xend - self._xptr + keep
                    self._xptr = keep
                self._xsize = size
        # XML_ParseBuffer, then callProcessor's test.
        self._xend += nbytes
        if isfinal or not self._reparse_deferral:
            return True
        have_now = self._xend - self._xptr
        available = (self._xptr - min(self._xptr, 1024)
                     + self._xsize - self._xend)
        return have_now >= 2 * self._partial_before or nbytes > available

    def _note_consumed(self):
        """After a parse: advance the modelled bufferPtr past what expat
        would have consumed, and remember the bytes on hand if that was none.

        Consumed as expat counts it, not as this scanner does: a text run at
        the end of the buffer is held back here for want of a ``<'', but expat
        has already delivered it.  What expat leaves is the incomplete token
        -- from the first ``<'', or ``&'' without its ``;'', on -- plus a
        trailing CR and any bytes not yet decoded."""
        rest = self._buf[self._pos:]
        if not self._dtd_mode:
            i = 0
            while True:
                lt, amp = rest.find('<', i), rest.find('&', i)
                if amp < 0 or 0 <= lt < amp:
                    i = len(rest) if lt < 0 else lt
                    # An open CDATA section is not one token to expat: its
                    # text is delivered as it comes, all but a ``]'' or
                    # ``]]'' that may begin its end.
                    if lt >= 0 and rest.startswith('<![CDATA[', lt):
                        tail = rest[lt + 9:]
                        i = len(rest) - (len(tail) - len(tail.rstrip(']')))
                        i = max(i, len(rest) - 2)
                    # Nor is a DOCTYPE, which is scanned whole here.
                    elif lt >= 0 and rest.startswith('<!DOCTYPE', lt):
                        i = lt + _doctype_partial(rest[lt:])
                    break
                semi = rest.find(';', amp)
                if semi < 0:
                    i = amp
                    break
                i = semi + 1
            rest = rest[i:]
        left = self._text_bytes(rest) + len(self._rawhead)
        if self._pending_cr:
            left += 1
        if self._decoder is not None:
            try:
                left += len(self._decoder.getstate()[0])
            except Exception:
                pass
        have_now = self._xend - self._xptr
        self._partial_before = have_now if left >= have_now else 0
        self._xptr = max(self._xptr, self._xend - left)

    def _text_bytes(self, text):
        """len(text) in the bytes it arrived as: UTF-8 for str input, as
        CPython's pyexpat encodes it, else the document's encoding."""
        enc = self._encoding_used or 'utf-8'
        try:
            name = codecs.lookup(enc).name
            if name in ('utf-16', 'utf-32'):
                enc = name + '-le'    # no BOM per call
            return len(text.encode(enc, 'surrogatepass'))
        except (LookupError, UnicodeError):
            return len(text.encode('utf-8', 'surrogatepass'))

    def GetInputContext(self):
        if self._buf is None:
            return None
        return self._buf[self._pos:].encode('utf-8', 'replace')

    def ExternalEntityParserCreate(self, context, encoding=None):
        """A parser for the text of an external entity -- what an
        ExternalEntityRefHandler feeds the entity to.

        `context` is whatever this parser passed the handler: an entity NAME
        for a general entity in content, which is read as content (text and
        any number of elements, no document element required), or None for
        the external DTD subset, which is read as declarations.  expat's
        context is an opaque string it re-parses; here the new parser simply
        takes what it needs from this one -- the handlers, the namespace
        bindings in scope, and the DTD itself, shared rather than copied."""
        sub = xmlparser(encoding or self.encoding, self._ns_sep)
        # expat's new parser inherits the default slot as it stands; CPython
        # then re-installs each handler that is set, in its table's order, so
        # a set DefaultHandlerExpand wins over a set DefaultHandler.
        sub._dflt, sub._dflt_expand = self._dflt, self._dflt_expand
        for name in _HANDLER_NAMES:
            h = getattr(self, name, None)
            if h is not None or name not in _DEFAULT_SLOT:
                setattr(sub, name, h)
        for name in ('buffer_text', 'ordered_attributes',
                     'specified_attributes', 'namespace_prefixes'):
            setattr(sub, name, getattr(self, name))
        sub._base = self._base
        sub._entities = self._entities
        sub._pe_names = self._pe_names
        sub._external = self._external
        sub._unparsed = self._unparsed
        sub._param_parsing = self._param_parsing
        sub._standalone = self._standalone
        sub._reparse_deferral = self._reparse_deferral
        if context is None:
            sub._dtd_mode = True
        else:
            sub._fragment = True
            sub._seen_root = True
            sub._ns_map = [dict(self._ns_map[-1])]
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
            # A byte-order mark is a column on line 1 in every position expat
            # reports.  And after a UTF-16 one the byte order is KNOWN, so it
            # is decoded with that codec rather than plain ``utf-16'': the
            # text before an undecodable unit is re-decoded on its own, and
            # without the mark ``utf-16'' reads it in the machine's order.
            if raw.startswith(b'\xef\xbb\xbf'):
                self._bom = 1
            elif (enc.lower().replace('_', '-') in ('utf-16', 'utf16')
                    and raw[:2] in (b'\xff\xfe', b'\xfe\xff')):
                self._bom = 1
                enc = 'utf-16-le' if raw[:2] == b'\xff\xfe' else 'utf-16-be'
                raw = raw[2:]
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
        self._buf += self._normalise_newlines(bad.good, True)
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
        if declared is None or not _XML_ENCODING_NAME.fullmatch(declared):
            # Expat parses the declaration before it looks the encoding up,
            # so a malformed name (``8bit'') is a malformed declaration,
            # reported by _xml_decl -- not a codec lookup.
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
        if self._ref_pos is not None:
            # Inside an internal entity's replacement text, positions are
            # in that text; expat blames the reference in the document.
            lineno, offset = self._ref_pos
        if lineno == 1:
            offset += self._bom
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
        col = self._col + self._bom if self._line == 1 else self._col
        self.CurrentLineNumber = self._line
        self.CurrentColumnNumber = col
        # expat's error-position getters ARE its current-position getters;
        # only a failure (_fail) pins them.
        self.ErrorLineNumber = self._line
        self.ErrorColumnNumber = col

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
            self._flush_text()
            return h(*args)
        return None

    def _markup(self, handler, text):
        """A handler's event, or else the markup to the default handler."""
        if getattr(self, handler) is not None:
            self._call(handler)
        else:
            self._default(text)

    def _default(self, text):
        h = self._dflt
        if h is not None:
            self._flush_text()
            h(text)

    def _emit_chars(self, text):
        """Character data, in expat's pieces.

        Without buffer_text expat hands a text run over a piece at a time,
        and callers see the pieces: every newline is a call of its own, as is
        each reference (the caller splits on those).  test_sax's
        CDATAHandlerTest compares each call against the text between two
        newlines.  With buffer_text the pieces are held and joined, and go
        out as one call before the next other event or at the end of Parse --
        which is what ElementTree and minidom, both of which set it, see."""
        if not text:
            return
        h = self.CharacterDataHandler
        if h is None:
            # expat's reportDefault gets the same tokens: each newline apart.
            h = self._dflt
            if h is None:
                return
            self._flush_text()
        elif self.buffer_text:
            self._textbuf.append(text)
            return
        start = 0
        while True:
            nl = text.find('\n', start)
            if nl < 0:
                if start < len(text):
                    h(text[start:])
                return
            if nl > start:
                h(text[start:nl])
            h('\n')
            start = nl + 1

    def _flush_text(self):
        if self._textbuf:
            text = ''.join(self._textbuf)
            self._textbuf = []
            h = self.CharacterDataHandler
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
        # Only ever tested against the markup openers, the longest of which is
        # ``<![CDATA['' (9), so a 9-character window answers every test below
        # exactly as the whole remainder did -- including the partial-opener
        # test, since a window shorter than 9 IS the whole remainder.  Copying
        # the remainder at every tag made parsing quadratic (#1214).
        rest = buf[i:i + 9]
        # A chunk can end partway into ``<!--'', ``<![CDATA['' or
        # ``<!DOCTYPE'': that is not yet anything, so wait for the next one
        # rather than judging ``<!'' an invalid token (XMLPullParser fed one
        # character at a time -- test_xml_etree's test_simple_xml_chunk_1).
        if (not isfinal and rest.startswith('<!')
                and any(t.startswith(rest) and t != rest
                        for t in ('<!--', '<![CDATA[', '<!DOCTYPE'))):
            return False
        if rest.startswith('<!--'):
            end = buf.find('-->', i + 4)
            if end < 0:
                if isfinal:
                    self._fail(errors.XML_ERROR_UNCLOSED_TOKEN)
                return False
            text = buf[i + 4:end]
            self._advance(end + 3 - i)
            self._comment(text)
            return True
        if rest.startswith('<![CDATA['):
            end = buf.find(']]>', i + 9)
            if end < 0:
                if isfinal:
                    self._fail(errors.XML_ERROR_UNCLOSED_CDATA_SECTION)
                return False
            text = buf[i + 9:end]
            self._advance(end + 3 - i)
            self._markup('StartCdataSectionHandler', '<![CDATA[')
            self._emit_chars(text)
            self._markup('EndCdataSectionHandler', ']]>')
            return True
        if rest.startswith('<?'):
            end = buf.find('?>', i + 2)
            if end < 0:
                if isfinal:
                    self._fail(errors.XML_ERROR_UNCLOSED_TOKEN)
                return False
            body = buf[i + 2:end]
            start = (self._line, self._col)
            self._advance(end + 2 - i)
            self._pi(body, start)
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
            self._end_element(name, line=nline, col=ncol,
                              raw=buf[i:end + 1])
            return True
        if len(rest) < 2 and not isfinal:
            return False
        nxt = rest[1] if len(rest) > 1 else ''
        if nxt and not _is_name_start(nxt):
            # expat's scanLt stops AT the character after the ``<''
            self._fail(errors.XML_ERROR_INVALID_TOKEN, self._line,
                       self._col + 1)
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
                # expat blames the stray ``<'' itself, not the tag's start
                self._fail(errors.XML_ERROR_INVALID_TOKEN, *self._offset_pos(
                    self._line, self._col, buf[i:j], j - i))
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
        if not self._fragment and raw.strip():
            if not self._seen_root:
                self._junk_error(raw, end, errors.XML_ERROR_SYNTAX)
            if self._done or not self._stack:
                self._junk_error(raw, end,
                                 errors.XML_ERROR_JUNK_AFTER_DOC_ELEMENT)
        tline, tcol = self._line, self._col
        self._advance(end - i)
        if self._stack or self._fragment:
            self._content(raw, tline, tcol)
        else:
            self._default(raw)
        return True

    def _junk_error(self, raw, end, message):
        """Fail on text outside the root element the way expat's prolog
        tokenizer does.  It reads a run of name characters as ONE token only
        when what follows can end one -- whitespace, the end of the input, or
        one of ``> ) [ % ? * + | ,'' -- and then the token is out of place:
        `message`, blamed at its start.  Anything else following the run is
        an invalid token AT that character, and so is a character that
        cannot begin a name at all.  So ``foo'' is a syntax error at column
        0 while ``foobar<'' is an invalid token at column 6 (test_xml_etree's
        test_error_position), and after the root ``<a/> x'' is blamed at the
        x, not at the space before it."""
        k = len(raw) - len(raw.lstrip())
        if _is_name_char(raw[k]):
            m = k
            while m < len(raw) and _is_name_char(raw[m]):
                m += 1
            if m < len(raw):
                follow = raw[m]
            else:
                follow = self._buf[end] if end < len(self._buf) else None
            if (follow is None or follow.isspace()
                    or follow in '>)[%?*+|,'):
                self._fail(message, *self._offset_pos(
                    self._line, self._col, raw, k))
            self._fail(errors.XML_ERROR_INVALID_TOKEN, *self._offset_pos(
                self._line, self._col, raw, m))
        self._fail(errors.XML_ERROR_INVALID_TOKEN, *self._offset_pos(
            self._line, self._col, raw, k))

    def _content(self, raw, line, col):
        """A text run inside an element: its character data, and what each
        reference in it stands for.  Every reference ends the piece before
        it, as in expat; an entity reference can stand for markup, or for an
        external entity a handler has to fetch."""
        i, n = 0, len(raw)
        while i < n:
            amp = raw.find('&', i)
            if amp < 0:
                self._emit_chars(raw[i:])
                return
            if amp > i:
                self._emit_chars(raw[i:amp])
            eline, ecol = self._offset_pos(line, col, raw, amp)
            end = raw.find(';', amp)
            if end < 0:
                self._fail(errors.XML_ERROR_INVALID_TOKEN, eline, ecol)
            ref = raw[amp + 1:end]
            i = end + 1
            if ref.startswith('#'):
                ch = self._char_ref(ref, eline, ecol)
                if self.CharacterDataHandler is None:
                    self._default(raw[amp:i])
                else:
                    self._emit_chars(ch)
            elif ref in _PREDEFINED:
                if self.CharacterDataHandler is None:
                    self._default(raw[amp:i])
                else:
                    self._emit_chars(_PREDEFINED[ref])
            else:
                self._entity_in_content(ref, eline, ecol)

    def _entity_in_content(self, name, line, col):
        if name in self._entities:
            if not self._dflt_expand:
                # Installed with DefaultHandler (not ...Expand): the reference
                # is reported, not expanded -- to SkippedEntityHandler if set.
                if name in self._open_entities:
                    self._fail(errors.XML_ERROR_RECURSIVE_ENTITY_REF, line, col)
                self._report_skipped(name, line, col, skipped=True)
                return
            text = self._entities[name]
            if '<' in text or '&' in text:
                self._expand_entity_text(name, text, line, col)
            else:
                self._emit_chars(text)
            return
        if name in self._unparsed:
            self._fail(errors.XML_ERROR_BINARY_ENTITY_REF, line, col)
        if name in self._external:
            h = self.ExternalEntityRefHandler
            if h is None:
                # No handler: expat reports the reference to the default
                # handler, which is where ElementTree raises "undefined
                # entity" for an external entity it cannot load
                # (test_xml_etree's test_entity, EXTERNAL_ENTITY_XML).
                self._report_skipped(name, line, col, skipped=False)
                return
            base, sysid, pubid = self._external[name]
            self._flush_text()
            if _refused(h(name, base, sysid, pubid)):
                self._fail(errors.XML_ERROR_EXTERNAL_ENTITY_HANDLING,
                           line, col)
            return
        if self._skips_undefined():
            # During the callback expat's position is the REFERENCE's -- the
            # ``&'' -- and its error-position getters are the current-position
            # ones.  ElementTree reports an undefined entity from inside its
            # default handler with ErrorLineNumber / ErrorColumnNumber, so
            # they read 1/0 here and the message named the wrong place
            # (test_xml_etree's test_entity, test_bug_xmltoolkit55).
            self._report_skipped(name, line, col, skipped=True)
            return
        self._fail(errors.XML_ERROR_UNDEFINED_ENTITY, line, col)

    def _report_skipped(self, name, line, col, skipped):
        """An entity reference nothing resolves, to SkippedEntityHandler (when
        `skipped` and one is set) or else to the default handler as the
        reference text, with the parser's position at the ``&'' for the
        duration of the call -- where expat reports it."""
        saved = (self.CurrentLineNumber, self.CurrentColumnNumber,
                 self.ErrorLineNumber, self.ErrorColumnNumber)
        if line is not None:
            self.CurrentLineNumber = self.ErrorLineNumber = line
            self.CurrentColumnNumber = self.ErrorColumnNumber = col
        try:
            if skipped and self.SkippedEntityHandler is not None:
                self._call('SkippedEntityHandler', name, 0)
            else:
                self._default('&%s;' % name)
        finally:
            (self.CurrentLineNumber, self.CurrentColumnNumber,
             self.ErrorLineNumber, self.ErrorColumnNumber) = saved

    def _skips_undefined(self):
        """expat's rule for a reference to an entity nobody declared: an
        error, unless the DTD could have declared it somewhere this parser
        did not read -- an external subset, or a parameter entity -- and the
        document does not claim to be standalone.  Then it is skipped."""
        return self._dtd_skips and self._standalone != 1

    def _expand_entity_text(self, name, text, line, col):
        """An internal entity whose replacement text is markup, or holds
        references: scanned as content where the reference stood.  expat
        blames any error inside it on the reference, and requires its
        elements to balance within it."""
        if name in self._open_entities:
            self._fail(errors.XML_ERROR_RECURSIVE_ENTITY_REF, line, col)
        saved = (self._buf, self._pos, self._line, self._col)
        depth = len(self._stack)
        outer = self._ref_pos is None
        if outer:
            self._ref_pos = (line, col)
        self._open_entities.append(name)
        try:
            self._buf, self._pos = text, 0
            self._scan(True)
            if len(self._stack) != depth:
                self._fail(errors.XML_ERROR_ASYNC_ENTITY)
        finally:
            self._open_entities.pop()
            self._buf, self._pos, self._line, self._col = saved
            self.CurrentLineNumber = self._line
            self.CurrentColumnNumber = self._col
            if outer:
                self._ref_pos = None

    # ----------------------------------------------------- pieces of markup

    def _pi(self, body, start=None):
        if body[:3].lower() == 'xml' and (len(body) == 3 or not _is_name_char(body[3])):
            self._xml_decl(body, start)
            return
        body = body.lstrip()
        k = 0
        while k < len(body) and _is_name_char(body[k]):
            k += 1
        target, data = body[:k], body[k:].lstrip()
        if self.ProcessingInstructionHandler is not None:
            self._call('ProcessingInstructionHandler', target, data)
        else:
            self._default('<?%s?>' % body)

    def _comment(self, text):
        if self.CommentHandler is not None:
            self._call('CommentHandler', text)
        else:
            self._default('<!--%s-->' % text)

    def _xml_decl(self, body, start=None):
        """An XML declaration -- a TEXT declaration in an external entity --
        parsed as expat's doParseXmlDecl parses it: the pseudo-attributes
        version, encoding and standalone, in that order, each a name, an
        ``='' with optional space around it, and a quoted value of
        ``[A-Za-z0-9._-]''.  A malformed one fails where expat's badPtr points,
        usually the start of the offending value or name.

        Expat 2.8.3 and 2.8.5 (bundled with CPython 3.14.8) also refuse an
        empty version and any version outside ``1.[0-9]+''.  The previous
        version of this method found each name with str.find, so it refused
        ``version = "1.0"'' and accepted ``version=" 1.0"''."""
        external = self._fragment or self._dtd_mode
        code = (errors.XML_ERROR_TEXT_DECL if external
                else errors.XML_ERROR_XML_DECL)
        end = len(body)

        def bad(at):
            if start is None:
                self._fail(code)
            line, col = self._offset_pos(start[0], start[1] + 2, body, at)
            self._fail(code, line, col)

        def pseudo(k):
            # expat's parsePseudoAttribute: (name, name_at, value, value_at,
            # next), with name None at the end of the declaration.
            if k == end:
                return None, k, None, k, k
            if body[k] not in _XML_DECL_SPACE:
                bad(k)
            while k < end and body[k] in _XML_DECL_SPACE:
                k += 1
            if k == end:
                return None, k, None, k, k
            name_at = k
            while True:
                if k == end or not body[k].isascii():
                    bad(k)
                if body[k] == '=':
                    name_end = k
                    break
                if body[k] in _XML_DECL_SPACE:
                    name_end = k
                    while k < end and body[k] in _XML_DECL_SPACE:
                        k += 1
                    if k == end or body[k] != '=':
                        bad(k)
                    break
                k += 1
            if name_end == name_at:
                bad(k)
            k += 1
            while k < end and body[k] in _XML_DECL_SPACE:
                k += 1
            if k == end or body[k] not in _XML_DECL_QUOTES:
                bad(k)
            quote = body[k]
            k += 1
            value_at = k
            while k == end or body[k] != quote:
                if k == end or not _xml_decl_value_char(body[k]):
                    bad(k)
                k += 1
            return (body[name_at:name_end], name_at,
                    body[value_at:k], value_at, k + 1)

        attrs = {}
        name, name_at, value, value_at, k = pseudo(3)
        if name is None:
            bad(k)
        if name != 'version':
            if not external:
                bad(name_at)
        else:
            if not _XML_VERSION_NUM.fullmatch(value):
                bad(value_at)
            attrs['version'] = value
            name, name_at, value, value_at, k = pseudo(k)
            if name is None and external:
                bad(k)
        if name == 'encoding':
            if not (value[:1].isascii() and value[:1].isalpha()):
                bad(value_at)
            attrs['encoding'] = value
            name, name_at, value, value_at, k = pseudo(k)
        if name is not None:
            if name != 'standalone' or external:
                bad(name_at)
            if value not in ('yes', 'no'):
                bad(value_at)
            attrs['standalone'] = value
            while k < end and body[k] in _XML_DECL_SPACE:
                k += 1
            if k != end:
                bad(k)
        standalone = -1
        if attrs.get('standalone') == 'yes':
            standalone = 1
        elif attrs.get('standalone') == 'no':
            standalone = 0
        if not external:
            self._standalone = standalone
        if self.XmlDeclHandler is not None:
            self._call('XmlDeclHandler', attrs.get('version'),
                       attrs.get('encoding'), standalone)
        else:
            self._default('<?%s?>' % body)

    def _scan_doctype(self, isfinal):
        """`<!DOCTYPE name [ExternalID] [[subset]]>`, in expat's order.

        StartDoctypeDeclHandler first; then the internal subset's
        declarations, each through its handler; then -- when the declaration
        names one and parameter-entity parsing is on -- the external subset,
        through ExternalEntityRefHandler with a None context; and last
        EndDoctypeDeclHandler.  test_sax's LexicalHandlerTest counts a comment
        inside the subset, and its DTD handler test a notation and an
        unparsed entity declared there.
        """
        buf, i = self._buf, self._pos
        found = self._doctype_end(i + 9)
        if found is None:
            if isfinal:
                self._fail(errors.XML_ERROR_UNCLOSED_TOKEN)
            return False
        j, subset = found
        head = buf[i + 9:j if subset is None else subset[0] - 1]
        toks = _decl_tokens(head)
        if not toks or toks[0][0] != 'name':
            self._fail(errors.XML_ERROR_SYNTAX)
        name = toks[0][1]
        sysid, pubid, _ = self._external_id(toks, 1)
        self._advance(j + 1 - i)
        # With no StartDoctypeDeclHandler to claim it, expat hands the
        # declaration to the default handler a token at a time -- markup,
        # whitespace runs, the name, each keyword and each QUOTED literal.
        # ElementTree's XMLParser reads the doctype exactly that way
        # (XMLParser._default collects ['html', 'PUBLIC', '"...", '"..."'] and
        # calls target.doctype), so without it TreeBuilder never saw one
        # (test_xml_etree's test_doctype, test_subclass_doctype).
        piecewise = (self.StartDoctypeDeclHandler is None
                     and self._dflt is not None)
        if piecewise:
            self._default('<!DOCTYPE')
            for piece in _doctype_pieces(head):
                self._default(piece)
            if subset is not None:
                self._default('[')
        self._call('StartDoctypeDeclHandler', name, sysid, pubid,
                   0 if subset is None else 1)
        if subset is not None:
            self._subset(buf[subset[0]:subset[1]], True, False)
            if piecewise:
                self._default(']')
                # the whitespace between ``]'' and ``>'', a token too
                gap = buf[buf.index(']', subset[1]) + 1:j]
                if gap:
                    self._default(gap)
        # The closing ``>'' is the default handler's unless a handler is
        # called at it: StartDoctypeDeclHandler when there was no subset to
        # call it at, or EndDoctypeDeclHandler.  expat reports it last.
        close_to_default = not (
            (self.StartDoctypeDeclHandler is not None and subset is None)
            or self.EndDoctypeDeclHandler is not None)
        if sysid is not None:
            self._dtd_skips = True
            h = self.ExternalEntityRefHandler
            wanted = self._param_parsing == XML_PARAM_ENTITY_PARSING_ALWAYS or (
                self._param_parsing == XML_PARAM_ENTITY_PARSING_UNLESS_STANDALONE
                and self._standalone != 1)
            if h is not None and wanted:
                self._flush_text()
                if _refused(h(None, self._base, sysid, pubid)):
                    self._fail(errors.XML_ERROR_EXTERNAL_ENTITY_HANDLING)
        self._call('EndDoctypeDeclHandler')
        if close_to_default:
            self._default('>')
        return True

    def _doctype_end(self, k):
        """(index of the closing ``>'', (start, end) of the internal subset
        or None), or None while the declaration is incomplete.  The subset is
        walked a declaration at a time, so a ``]'' or ``>'' inside a comment
        or a quoted value does not end it."""
        buf, n, quote = self._buf, len(self._buf), ''
        while k < n:
            c = buf[k]
            if quote:
                if c == quote:
                    quote = ''
            elif c in '"\'':
                quote = c
            elif c == '[':
                break
            elif c == '>':
                return k, None
            k += 1
        else:
            return None
        lo = k = k + 1
        while True:
            if k >= n:
                return None
            item = _next_decl(buf, k)
            if item is None:
                return None
            kind, end = item
            if kind == 'close':
                hi, k = k, end
                while k < n and buf[k].isspace():
                    k += 1
                if k >= n:
                    return None
                if buf[k] != '>':
                    self._fail(errors.XML_ERROR_SYNTAX)
                return k, (lo, hi)
            if kind == 'bad':
                self._fail(errors.XML_ERROR_SYNTAX)
            k = end

    def _subset(self, text, isfinal, external):
        """Report the declarations in DTD text; answer how much was consumed.
        `external` is the external subset, fed in chunks, where a ``]'' is
        an error rather than the end."""
        k, n = 0, len(text)
        while k < n:
            item = _next_decl(text, k)
            if item is None:
                if isfinal:
                    self._fail(errors.XML_ERROR_UNCLOSED_TOKEN)
                return k
            kind, end = item
            piece = text[k:end]
            if kind == 'ws':
                self._default(piece)
            elif kind == 'comment':
                self._comment(piece[4:-3])
            elif kind == 'pi':
                self._pi(piece[2:-2])
            elif kind == 'decl':
                self._declaration(piece)
            elif kind == 'peref':
                # Never expanded (XML_PARAM_ENTITY_PARSING_NEVER is all this
                # implements), and once one has been skipped expat stops
                # processing the entity declarations after it: the skipped
                # text could have declared any of them first.
                self._dtd_skips = True
                if self._standalone != 1:
                    self._keep_decls = False
                self._default(piece)
            else:
                self._fail(errors.XML_ERROR_SYNTAX)
            k = end
        return k

    def _declaration(self, piece):
        """One markup declaration: its handler, and to the default handler
        each token no handler claimed -- expat decides that token by token
        (doProlog's handleDefault), by the token's role in the declaration.
        For ELEMENT, NOTATION and ATTLIST the answer is the same for every
        token: all of them go when the declaration's handler is unset (an
        ATTLIST's also once declarations stop being processed).  ENTITY is
        decided per token -- see _entity_decl."""
        toks = _prolog_tokens(piece)
        if piece.startswith('<!ENTITY') and piece[8:9].isspace():
            self._entity_decl(piece[8:-1], toks)
            return
        if piece.startswith('<!NOTATION') and piece[10:11].isspace():
            self._notation_decl(piece[10:-1])
            claimed = self.NotationDeclHandler is not None
        elif (piece.startswith('<!ATTLIST') and piece[9:10].isspace()
                and self._attlist_decl(piece[9:-1])):
            claimed = (self._keep_decls
                       and self.AttlistDeclHandler is not None)
        elif piece.startswith('<!ELEMENT') and piece[9:10].isspace():
            decl = _content_model(toks)
            if decl is None:
                self._fail(errors.XML_ERROR_SYNTAX)
            claimed = self.ElementDeclHandler is not None
            if claimed:
                self._call('ElementDeclHandler', *decl)
        else:
            self._default(piece)
            return
        if not claimed:
            for tok in toks:
                self._default(tok)

    def _attlist_decl(self, body):
        """``<!ATTLIST elem (name type default)*>``: remember each attribute's
        type and default, and report it to AttlistDeclHandler -- or, with none
        set, to the default handler, as expat does.  Answers False for a body
        it cannot read, which then reaches the default handler untouched.

        What expat does with the record, and what this is for: a DEFAULTED
        attribute appears on the element (test_xml_etree's attlist_default,
        ``xml:lang`` from the DTD), and a TOKENIZED one -- any type but CDATA --
        has its value's space runs collapsed and trimmed (XML 3.3.3; the
        c14n-20 suite's normNames / normId).  The first declaration of an
        attribute is binding."""
        toks = _attlist_tokens(body)
        if toks is None or not toks or toks[0][0] != 'name':
            return False
        elem, i, decls = toks[0][1], 1, []
        while i < len(toks):
            if toks[i][0] != 'name' or i + 1 >= len(toks):
                return False
            att, typ = toks[i][1], toks[i + 1]
            i += 2
            if typ[0] == 'group':
                type_str = '(' + '|'.join(typ[1]) + ')'
            elif typ == ('name', 'NOTATION'):
                if i >= len(toks) or toks[i][0] != 'group':
                    return False
                type_str = 'NOTATION(' + '|'.join(toks[i][1]) + ')'
                i += 1
            elif typ[0] == 'name':
                type_str = typ[1]
            else:
                return False
            if i >= len(toks):
                return False
            dflt, required = None, 0
            if toks[i] == ('name', '#REQUIRED'):
                required = 1
                i += 1
            elif toks[i] == ('name', '#IMPLIED'):
                i += 1
            else:
                if toks[i] == ('name', '#FIXED'):
                    required = 1
                    i += 1
                if i >= len(toks) or toks[i][0] != 'lit':
                    return False
                dflt = toks[i][1]
                i += 1
            decls.append((att, type_str, dflt, required))
        if not self._keep_decls:
            return True
        table = self._attlists.setdefault(elem, {})
        for att, type_str, dflt, required in decls:
            if att not in table:
                value = None
                if dflt is not None:
                    value = self._expand(dflt)
                    if type_str != 'CDATA':
                        value = _collapse_spaces(value)
                table[att] = (type_str, value)
            if self.AttlistDeclHandler is not None:
                self._call('AttlistDeclHandler', elem, att, type_str, dflt,
                           required)
        return True

    def _apply_attlist(self, raw_name, attrs_raw):
        """The start tag's attributes as the DTD makes them: tokenized values
        normalised, and declared defaults added after the specified ones
        unless specified_attributes asks for those alone."""
        table = self._attlists.get(raw_name)
        if not table:
            return attrs_raw
        out, present = [], set()
        for an, av in attrs_raw:
            present.add(an)
            decl = table.get(an)
            if decl is not None and decl[0] != 'CDATA':
                av = _collapse_spaces(av)
            out.append((an, av))
        if not self.specified_attributes:
            for an, (type_str, value) in table.items():
                if value is not None and an not in present:
                    out.append((an, value))
        return out

    def _entity_decl(self, body, ptoks):
        """<!ENTITY ...>'': record it, report it, and hand the default
        handler the tokens nobody claimed.

        Unlike the other declarations that is decided per token (xmlrole.c's
        roles, doProlog's handleDefault).  With EntityDeclHandler set, the
        keywords, whitespace and >'' are claimed while declarations are being
        processed at all; the name, value and ids only when the declaration
        takes effect -- not for a redeclaration, nor for one of the five
        predefined names -- so those reach the default handler even then.  An
        NDATA notation name is claimed by UnparsedEntityDeclHandler as well.
        The handler is called at the token that completes the declaration (the
        value, the notation name, or the closing >''), so the default
        handler sees the unclaimed tokens before it on either side."""
        toks = _decl_tokens(body)
        is_pe = bool(toks) and toks[0] == ('name', '%')
        if is_pe:
            toks = toks[1:]
        if not toks or toks[0][0] != 'name' or len(toks) < 2:
            self._fail(errors.XML_ERROR_SYNTAX)
        name, rest = toks[0][1], toks[1:]
        keep = self._keep_decls
        takes = keep and not (
            name in self._pe_names if is_pe
            else name in _PREDEFINED or self._declared(name))
        handler = self.EntityDeclHandler is not None
        words = [k for k, t in enumerate(ptoks) if not t.isspace()]
        ndata = any(ptoks[k] == 'NDATA' for k in words)
        external = rest[0][0] != 'lit'
        name_at = words[2 if is_pe else 1]
        claim, call_at = [], len(ptoks)
        for k, t in enumerate(ptoks):
            if k == name_at:
                c = takes and handler
            elif k > name_at and t[:1] in '"\'':
                c = takes and handler
                if not external:
                    call_at = k
            elif k == words[-1] and external and not ndata:
                c, call_at = takes and handler, k
            elif ndata and k == words[-2]:
                c = takes and (handler
                               or self.UnparsedEntityDeclHandler is not None)
                call_at = k
            else:
                c = keep and handler
            claim.append(c)
        for k in range(call_at):
            if not claim[k]:
                self._default(ptoks[k])
        try:
            self._entity_semantics(name, rest, is_pe, takes)
        finally:
            for k in range(call_at, len(ptoks)):
                if not claim[k]:
                    self._default(ptoks[k])

    def _entity_semantics(self, name, rest, is_pe, takes):
        if not takes:
            return
        if is_pe:
            self._pe_names.add(name)
        base = self._base
        if rest[0][0] == 'lit':
            value = self._entity_value(rest[0][1])
            if not is_pe:
                self._entities[name] = value
            self._call('EntityDeclHandler', name, int(is_pe), value, base,
                       None, None, None)
            return
        sysid, pubid, k = self._external_id(rest, 0)
        if sysid is None:
            self._fail(errors.XML_ERROR_SYNTAX)
        notation = None
        if k < len(rest) and rest[k] == ('name', 'NDATA'):
            if k + 1 >= len(rest) or is_pe:
                self._fail(errors.XML_ERROR_SYNTAX)
            notation = rest[k + 1][1]
        if not is_pe:
            if notation is not None:
                self._unparsed[name] = notation
                if self.UnparsedEntityDeclHandler is not None:
                    self._call('UnparsedEntityDeclHandler', name, base, sysid,
                               pubid, notation)
                    return
            else:
                self._external[name] = (base, sysid, pubid)
        self._call('EntityDeclHandler', name, int(is_pe), None, base, sysid,
                   pubid, notation)

    def _declared(self, name):
        return (name in self._entities or name in self._external
                or name in self._unparsed)

    def _entity_value(self, literal):
        """An entity's replacement text: character references are expanded
        when it is DECLARED, general entity references when it is used."""
        out, i = [], 0
        while True:
            amp = literal.find('&#', i)
            if amp < 0:
                out.append(literal[i:])
                return ''.join(out)
            end = literal.find(';', amp)
            if end < 0:
                self._fail(errors.XML_ERROR_INVALID_TOKEN)
            out.append(literal[i:amp])
            out.append(self._char_ref(literal[amp + 1:end], None, None))
            i = end + 1

    def _notation_decl(self, body):
        toks = _decl_tokens(body)
        if not toks or toks[0][0] != 'name':
            self._fail(errors.XML_ERROR_SYNTAX)
        sysid, pubid, _ = self._external_id(toks, 1, notation=True)
        if sysid is None and pubid is None:
            self._fail(errors.XML_ERROR_SYNTAX)
        self._call('NotationDeclHandler', toks[0][1], self._base, sysid, pubid)

    def _external_id(self, toks, k, notation=False):
        """(sysid, pubid, index after them) for an ExternalID starting at
        toks[k], or (None, None, k) when there is none.  A NOTATION may give
        a public id alone."""
        if k >= len(toks):
            return None, None, k
        if toks[k] == ('name', 'SYSTEM'):
            if k + 1 >= len(toks) or toks[k + 1][0] != 'lit':
                self._fail(errors.XML_ERROR_SYNTAX)
            return toks[k + 1][1], None, k + 2
        if toks[k] == ('name', 'PUBLIC'):
            if k + 1 >= len(toks) or toks[k + 1][0] != 'lit':
                self._fail(errors.XML_ERROR_SYNTAX)
            pubid = toks[k + 1][1]
            if k + 2 < len(toks) and toks[k + 2][0] == 'lit':
                return toks[k + 2][1], pubid, k + 3
            if not notation:
                self._fail(errors.XML_ERROR_SYNTAX)
            return None, pubid, k + 2
        return None, None, k

    # --------------------------------------------------------- element tags

    def _start_element(self, body, consumed):
        raw_tag = '<' + body + '>'
        selfclose = body.rstrip().endswith('/')
        if selfclose:
            body = body.rstrip()[:-1]
        k = 0
        while k < len(body) and _is_name_char(body[k]):
            k += 1
        raw_name = body[:k]
        if not raw_name:
            self._fail(errors.XML_ERROR_INVALID_TOKEN)
        if self._done and not self._fragment:
            self._fail(errors.XML_ERROR_JUNK_AFTER_DOC_ELEMENT)
        attrs_raw = self._apply_attlist(raw_name, self._parse_attrs(body, k))
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
        if self.StartElementHandler is not None:
            self._call('StartElementHandler', name, attrs)
        elif not selfclose:
            self._default(raw_tag)
        if selfclose:
            self._end_element(raw_name, synthetic=True, raw=raw_tag)

    def _parse_attrs(self, body, i):
        """`name="value"` pairs, in source order, values reference-expanded.
        `body` is the tag after its ``<'', its attributes from body[i:] on;
        the scanner is still at the ``<'', so a value's position is the
        tag's plus its offset -- which is where expat blames a bad reference
        inside it."""
        text, n = body, len(body)
        out = []
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
                # expat blames the repeated NAME, not the tag
                line, col = self._offset_pos(self._line, self._col,
                                             '<' + body, start + 1)
                self._fail(errors.XML_ERROR_DUPLICATE_ATTRIBUTE, line, col)
            seen.add(name)
            vline, vcol = self._offset_pos(self._line, self._col,
                                           '<' + body, i - len(value))
            out.append((name, self._expand(value, vline, vcol)))
        return out

    def _build_attrs(self, attrs_raw):
        pairs = []
        for an, av in attrs_raw:
            # Under namespace processing expat consumes the declarations: they
            # reach StartNamespaceDeclHandler and are never attributes, with
            # or without namespace_prefixes.  Passing them through gave
            # XMLGenerator each xmlns twice (test_sax test_5027_1).
            if self._ns_sep is not None and (
                    an == 'xmlns' or an.startswith('xmlns:')):
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
        """`prefix:local` -> `uri<sep>local` when namespace processing is on.

        namespace_prefixes asks for the prefix as well, as a third part:
        `uri<sep>local<sep>prefix` -- expatreader turns that back into the
        qname.  A name in the default namespace has no prefix to add."""
        if self._ns_sep is None:
            return raw
        if ':' in raw:
            prefix, local = raw.split(':', 1)
            if prefix == 'xmlns':
                return raw
            if prefix == 'xml':
                uri = 'http://www.w3.org/XML/1998/namespace'
            else:
                uri = self._ns_map[-1].get(prefix)
                if uri is None:
                    self._fail(errors.XML_ERROR_UNBOUND_PREFIX)
            if self.namespace_prefixes:
                return uri + self._ns_sep + local + self._ns_sep + prefix
            return uri + self._ns_sep + local
        if is_attr:
            return raw           # an unprefixed attribute is NOT in the default ns
        uri = self._ns_map[-1].get('')
        return (uri + self._ns_sep + raw) if uri else raw

    def _end_element(self, raw_name, synthetic=False, line=None, col=None,
                     raw=None):
        if not self._stack:
            self._fail(errors.XML_ERROR_NO_ELEMENTS, line, col)
        name, opened_raw = self._stack[-1]
        if raw_name != opened_raw:
            self._fail(errors.XML_ERROR_TAG_MISMATCH, line, col)
        self._stack.pop()
        if self.EndElementHandler is not None:
            self._call('EndElementHandler', name)
        elif not synthetic or self.StartElementHandler is None:
            # An empty element goes to the default handler only when neither
            # element handler took it (expat's noElmHandlers).
            self._default(raw)
        decls = self._ns_stack.pop()
        if self._ns_sep is not None:
            self._ns_map.pop()
            for prefix, _uri in reversed(decls):
                self._call('EndNamespaceDeclHandler', prefix or None)
        if not self._stack:
            self._done = True

    # ----------------------------------------------------------- references

    def _expand(self, text, line=None, col=None, at=None):
        """An attribute value: its references expanded, and each literal
        tab or newline normalised to a space -- but not one a character
        reference produced, which is why the two happen together here
        rather than as a replace() over the result.  An internal entity's
        replacement text is expanded the same way, recursively, with any
        error in it blamed `at` the reference that brought it in."""
        out, i, n = [], 0, len(text)
        while i < n:
            amp = text.find('&', i)
            if amp < 0:
                out.append(_normalise_space(text[i:]))
                break
            out.append(_normalise_space(text[i:amp]))
            if at is not None:
                eline, ecol = at
            elif line is not None:
                eline, ecol = self._offset_pos(line, col, text, amp)
            else:
                eline = ecol = None
            end = text.find(';', amp)
            if end < 0:
                self._fail(errors.XML_ERROR_INVALID_TOKEN, eline, ecol)
            ref = text[amp + 1:end]
            i = end + 1
            if ref.startswith('#'):
                out.append(self._char_ref(ref, eline, ecol))
            elif ref in _PREDEFINED:
                out.append(_PREDEFINED[ref])
            elif ref in self._entities:
                if ref in self._open_entities:
                    self._fail(errors.XML_ERROR_RECURSIVE_ENTITY_REF,
                               eline, ecol)
                self._open_entities.append(ref)
                try:
                    out.append(self._expand(self._entities[ref],
                                            at=(eline, ecol)))
                finally:
                    self._open_entities.pop()
            elif ref in self._unparsed:
                self._fail(errors.XML_ERROR_BINARY_ENTITY_REF, eline, ecol)
            elif ref in self._external:
                self._fail(errors.XML_ERROR_ATTRIBUTE_EXTERNAL_ENTITY_REF,
                           eline, ecol)
            elif not self._skips_undefined():
                # (skipped in an attribute means dropped: no handler is told)
                self._fail(errors.XML_ERROR_UNDEFINED_ENTITY, eline, ecol)
        return ''.join(out)

    def _char_ref(self, ref, line, col):
        """The character `&#...;` stands for; `ref` is the part after ``&''."""
        try:
            cp = int(ref[2:], 16) if ref[1:2].lower() == 'x' else int(ref[1:])
        except ValueError:
            self._fail(errors.XML_ERROR_BAD_CHAR_REF, line, col)
        if cp == 0 or cp > 0x10FFFF or 0xD800 <= cp <= 0xDFFF:
            self._fail(errors.XML_ERROR_BAD_CHAR_REF, line, col)
        return chr(cp)


def _normalise_space(text):
    if '\n' in text or '\t' in text or '\r' in text:
        return text.replace('\r', ' ').replace('\n', ' ').replace('\t', ' ')
    return text


def _refused(result):
    """Whether an ExternalEntityRefHandler's answer is expat's failure.  Only
    a zero is: expat tests the C int for zero, and a handler that returns
    None -- the common case for one that simply does its work -- is not a
    refusal here."""
    return result is not None and result == 0


def _doctype_pieces(head):
    """The tokens of a DOCTYPE's head (after ``<!DOCTYPE'', before ``['' or
    ``>''), as expat reports them to a default handler: each whitespace run,
    each name or keyword, and each literal WITH its quotes."""
    out, k, n = [], 0, len(head)
    while k < n:
        c = head[k]
        start = k
        if c.isspace():
            while k < n and head[k].isspace():
                k += 1
        elif c in '"\'':
            end = head.find(c, k + 1)
            k = n if end < 0 else end + 1
        else:
            while k < n and not head[k].isspace() and head[k] not in '"\'':
                k += 1
        out.append(head[start:k])
    return out


def _doctype_partial(text):
    """Where expat's unconsumed input starts in `text`, an unfinished
    DOCTYPE: it has consumed every complete token of the head and every
    complete item of the subset, and holds back the last token only -- unless
    that is whitespace, which is complete where it stops."""
    if len(text) <= 9:
        return 0
    k, quote = 9, ''
    while k < len(text):
        c = text[k]
        if quote:
            if c == quote:
                quote = ''
        elif c in '"\'':
            quote = c
        elif c == '[':
            break
        k += 1
    else:
        pieces = _doctype_pieces(text[9:])
        last = pieces[-1] if pieces else ''
        return len(text) if last.isspace() else len(text) - len(last)
    k += 1
    while k < len(text):
        item = _next_decl(text, k)
        if item is None or item[0] == 'bad':
            toks = _prolog_tokens(text[k:]) if text.startswith('<!', k) else []
            if len(toks) > 1 and toks[-1].isspace():
                return len(text)
            if len(toks) > 1:
                return len(text) - len(toks[-1])
            return k
        if item[0] == 'close':
            return len(text)
        k = item[1]
    return len(text)


def _prolog_tokens(piece):
    """A markup declaration (<!ENTITY ... >'') as expat's prolog tokenizer
    splits it, which is what a default handler receives: the opening
    <!KEYWORD'', each whitespace run, each name (#PCDATA'' included, and a
    trailing ?'', *'' or +'' with it), each literal WITH its quotes,
    ('', |'', ,'', %'', a )'' with any quantifier, and >''."""
    k = 2
    while k < len(piece) and not piece[k].isspace() and piece[k] not in '>"\'(':
        k += 1
    out, n = [piece[:k]], len(piece)
    while k < n:
        c, start = piece[k], k
        if c.isspace():
            while k < n and piece[k].isspace():
                k += 1
        elif c in '"\'':
            end = piece.find(c, k + 1)
            k = n if end < 0 else end + 1
        elif c == ')':
            k += 2 if piece[k + 1:k + 2] in ('?', '*', '+') else 1
        elif c in '(|,%>':
            k += 1
        else:
            while (k < n and not piece[k].isspace()
                   and piece[k] not in '"\'()|,%>?*+'):
                k += 1
            if piece[k:k + 1] in ('?', '*', '+'):
                k += 1
            if k == start:
                k += 1
        out.append(piece[start:k])
    return out


_QUANT = {'?': 1, '*': 2, '+': 3}


def _content_model(toks):
    """(name, model) for an ELEMENT declaration's tokens, the model as
    pyexpat hands ElementDeclHandler: (type, quant, name, children), with
    model.XML_CTYPE_* types and XML_CQUANT_* quantifiers.  None when the
    declaration cannot be read."""
    words = [t for t in toks[1:-1] if not t.isspace()]
    if len(words) < 2:
        return None
    name, spec = words[0], words[1:]
    if spec == ['EMPTY']:
        return name, (1, 0, None, ())
    if spec == ['ANY']:
        return name, (2, 0, None, ())
    if len(spec) >= 3 and spec[0] == '(' and spec[1] == '#PCDATA':
        names = [w for w in spec[2:-1] if w != '|']
        close = spec[-1]
        return name, (3, _QUANT.get(close[1:], 0), None,
                      tuple((4, 0, w, ()) for w in names))
    pos = [0]

    def particle():
        if pos[0] >= len(spec):
            raise ValueError
        w = spec[pos[0]]
        pos[0] += 1
        if w != '(':
            q = _QUANT.get(w[-1], 0)
            return (4, q, w[:-1] if q else w, ())
        kids, kind = [particle()], 6
        while pos[0] < len(spec) and spec[pos[0]] in '|,':
            kind = 5 if spec[pos[0]] == '|' else 6
            pos[0] += 1
            kids.append(particle())
        if pos[0] >= len(spec) or not spec[pos[0]].startswith(')'):
            raise ValueError
        close = spec[pos[0]]
        pos[0] += 1
        return (kind, _QUANT.get(close[1:], 0), None, tuple(kids))

    try:
        model = particle()
    except ValueError:
        return None
    if pos[0] != len(spec) or model[0] == 4:
        return None
    return name, model


def _collapse_spaces(value):
    """XML 3.3.3's extra step for a non-CDATA attribute: space (#x20) runs
    become one space, leading and trailing ones go.  Only #x20: a tab or line
    break a character reference produced is kept."""
    return ' '.join(part for part in value.split(' ') if part)


def _attlist_tokens(body):
    """An ATTLIST body as ('name', w), ('lit', text) and ('group', [w...])
    tokens -- an enumeration ``( a | b )'' is one group, whatever its spacing.
    None when a literal or a group is unterminated."""
    toks, k, n = [], 0, len(body)
    while k < n:
        c = body[k]
        if c.isspace():
            k += 1
        elif c in '"\'':
            end = body.find(c, k + 1)
            if end < 0:
                return None
            toks.append(('lit', body[k + 1:end]))
            k = end + 1
        elif c == '(':
            end = body.find(')', k + 1)
            if end < 0:
                return None
            toks.append(('group', [w.strip() for w in body[k + 1:end].split('|')]))
            k = end + 1
        else:
            start = k
            while k < n and not body[k].isspace() and body[k] not in '"\'(':
                k += 1
            toks.append(('name', body[start:k]))
    return toks


def _decl_tokens(text):
    """The words of a declaration body, a quoted literal counting as ONE
    word: [('name', 'PUBLIC'), ('lit', '-//X//EN')].  A split() broke a
    public id at its spaces."""
    toks, k, n = [], 0, len(text)
    while k < n:
        c = text[k]
        if c.isspace():
            k += 1
        elif c in '"\'':
            end = text.find(c, k + 1)
            if end < 0:
                return toks + [('bad', text[k:])]
            toks.append(('lit', text[k + 1:end]))
            k = end + 1
        else:
            start = k
            while k < n and not text[k].isspace() and text[k] not in '"\'':
                k += 1
            toks.append(('name', text[start:k]))
    return toks


def _next_decl(text, k):
    """(kind, end) for the DTD item starting at text[k], or None while it is
    incomplete.  Kinds: 'ws', 'comment', 'pi', 'decl' (<!ENTITY ...> and its
    kind, with quoted values respected), 'peref' (%name;), 'close' (the
    ``]'' ending an internal subset), 'bad'."""
    n = len(text)
    c = text[k]
    if c.isspace():
        end = k + 1
        while end < n and text[end].isspace():
            end += 1
        return 'ws', end
    if text.startswith('<!--', k):
        end = text.find('-->', k + 4)
        return None if end < 0 else ('comment', end + 3)
    if text.startswith('<?', k):
        end = text.find('?>', k + 2)
        return None if end < 0 else ('pi', end + 2)
    if text.startswith('<!', k):
        j, quote = k + 2, ''
        while j < n:
            ch = text[j]
            if quote:
                if ch == quote:
                    quote = ''
            elif ch in '"\'':
                quote = ch
            elif ch == '>':
                return 'decl', j + 1
            j += 1
        return None
    if c == '<' and n - k < 4 and '<!--'.startswith(text[k:]):
        return None
    if c == '%':
        end = text.find(';', k)
        return None if end < 0 else ('peref', end + 1)
    if c == ']':
        return 'close', k + 1
    return 'bad', k


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


_XML_DECL_SPACE = ' \t\r\n'
_XML_DECL_QUOTES = '"\''

# Expat 2.8.5's checkXmlDeclVersionNum: XML 1.0 fifth edition's VersionNum.
_XML_VERSION_NUM = re.compile(r'1\.[0-9]+')

# An EncName, as doParseXmlDecl checks it: an ASCII letter, then value chars.
_XML_ENCODING_NAME = re.compile(r'[A-Za-z][A-Za-z0-9._-]*')

# What expat refuses as a character anywhere in a document: everything outside
# XML 1.0's Char production -- the C0 controls but tab, LF and CR, the
# surrogates, and U+FFFE / U+FFFF.
_INVALID_XML_CHAR = re.compile(
    '[^\t\n\r\x20-\ud7ff\ue000-\ufffd\U00010000-\U0010ffff]')


def _xml_decl_value_char(c):
    return c.isascii() and (c.isalnum() or c in '._-')


def ParserCreate(encoding=None, namespace_separator=None, intern=None):
    """expat.ParserCreate -- the one entry point callers use."""
    return xmlparser(encoding, namespace_separator, intern)


def ErrorString_(code):      # pragma: no cover - kept for symmetry
    return ErrorString(code)
