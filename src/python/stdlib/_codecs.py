# The `_codecs` accelerator module.
#
# In CPython this is a C extension holding (a) the interpreter's codec
# REGISTRY -- register/lookup/encode/decode plus the error-handler table --
# and (b) the low-level per-codec entry points (``utf_8_decode`` and friends)
# that the modules in the ``encodings`` package wire into their CodecInfo.
# ``codecs.py`` is a thin pure-Python layer over it (``from _codecs import *``).
#
# Grail keeps that split, because the ``encodings/*.py`` modules are written
# the way CPython writes them -- ``encode = codecs.utf_8_encode``,
# ``_buffer_decode = codecs.utf_8_decode`` -- and that only reads well if the
# entry points really live below ``codecs``.  Everything here is pure Python
# on top of Grail's ``str.encode`` / ``bytes.decode``, which are the actual
# Smalltalk codecs (see str.gs ``encode:_:`` and Bytes.gs ``decode:``).
#
# Two callers predate the registry and must keep working unchanged:
#
#   * pickle names ``_codecs.encode`` as the reconstructor for bytes under
#     protocols 0-2, which have no bytes opcode: b'abc' pickles as
#     ``_codecs.encode('abc', 'latin1')``.  Both directions need the module
#     under this exact name, and the call must stay cheap -- it must not drag
#     the whole ``encodings`` package in on every unpickle.  So encode/decode
#     try the direct str/bytes method first and only consult the registry if
#     that raises LookupError.
#
#   * werkzeug.urls calls ``codecs.register_error`` at import time.

# ---------------------------------------------------------------- registry

_search_path = []
_registry_cache = {}
_bootstrapped = False


def normalizestring(encoding):
    """The name a search function is handed, measured against CPython 3.14.

    Every run of characters that is neither alphanumeric nor a dot collapses
    to ONE underscore, leading and trailing runs vanish, and the result is
    lowercased -- so 'UTF-8', 'utf--8' and '  utf 8  ' all arrive as 'utf_8',
    which is why the alias table in ``encodings`` is keyed that way.

    Worth pinning rather than guessing: the older documented behaviour was
    only ' ' -> '-' plus lowercasing, and a search function written against
    that never matches its own name.  ``codecs.lookup('grail-test-upper')``
    reaches a custom search function as 'grail_test_upper'."""
    if isinstance(encoding, bytes):
        encoding = encoding.decode('ascii')
    if not isinstance(encoding, str):
        raise TypeError('encoding must be a string')
    chars = []
    punct = False
    for c in encoding:
        # ASCII alphanumerics only: CPython normalizes the UTF-8 BYTES with
        # Py_ISALNUM, so a non-ASCII letter is punctuation like any other --
        # 'aaa\xe9\u20ac-8' reaches a search function as 'aaa_8'
        # (test_codecs test_codecs_lookup).  str.isalnum() kept the \xe9.
        if (c.isascii() and c.isalnum()) or c == '.':
            if punct and chars:
                chars.append('_')
            chars.append(c)
            punct = False
        else:
            punct = True
    return ''.join(chars).lower()


def _bootstrap():
    """Import ``encodings`` once, on the first lookup.

    CPython does this from C at interpreter start-up.  Doing it lazily keeps
    ``import codecs`` (and therefore ``import pickle``) from pulling the whole
    ``encodings`` package in, and it breaks the import cycle: ``encodings``
    imports ``codecs``, which imports this module."""
    global _bootstrapped
    if _bootstrapped:
        return
    _bootstrapped = True
    try:
        __import__('encodings')
    except ImportError:
        # No encodings package: lookup() then just reports unknown encoding,
        # which is what the pre-registry stub did for every name.
        pass


def register(search_function):
    """Register a codec search function.

    It is called with a normalized encoding name and returns a CodecInfo
    (or None if it does not know the name)."""
    if not callable(search_function):
        raise TypeError('argument must be callable')
    _search_path.append(search_function)


def unregister(search_function):
    """Remove a codec search function and flush the lookup cache."""
    if search_function in _search_path:
        _search_path.remove(search_function)
        _registry_cache.clear()


def lookup(encoding):
    """Look up a codec by name, answering its CodecInfo.

    Raises LookupError if no registered search function claims the name --
    which is the contract werkzeug's CharsetAccept already relies on."""
    norm = normalizestring(encoding)
    entry = _registry_cache.get(norm)
    if entry is not None:
        return entry
    _bootstrap()
    for search in _search_path:
        entry = search(norm)
        if entry is not None:
            if not isinstance(entry, tuple) or len(entry) < 4:
                raise TypeError('codec search functions must return '
                                '4-tuples or CodecInfo objects')
            _registry_cache[norm] = entry
            return entry
    raise LookupError('unknown encoding: ' + str(encoding))


def _forget_codec(encoding):
    """Drop one cached codec (CPython exposes this for test support)."""
    _registry_cache.pop(normalizestring(encoding), None)


def _note_codec_failure(exc, operation, encoding):
    """Attach CPython's codec-failure note to exc, as wrap_codec_error does.

    The text is Python/codecs.c's ``%s with %R codec failed``, which
    test_codecs reads back as ``exc.__notes__[0]``.  Guarded, because the
    note must never replace the exception it is describing: add_note is
    absent on a non-BaseException, and a note is a convenience either way.

    The registry paths here need their own copy because they call the codec
    directly; the str.encode / bytes.decode routes are noted in Smalltalk,
    at importlib's ___codecRoundTrip___."""
    try:
        exc.add_note("{} with {!r} codec failed".format(operation, encoding))
    except Exception:
        pass


def _call_codec(info_attr, operation, encoding, obj, errors):
    """Call a registry codec and note the encoding on failure."""
    try:
        return info_attr(obj, errors)[0]
    except Exception as exc:
        _note_codec_failure(exc, operation, encoding)
        raise


def encode(obj, encoding='utf-8', errors='strict'):
    """codecs.encode(obj, encoding, errors): the codec's encoder, whatever it
    answers.

    THROUGH THE REGISTRY, always, as CPython's _PyCodec_Encode is -- and
    with no type check on either side: codecs.encode is the documented way
    to reach a codec with arbitrary types, where str.encode applies the text
    model.  It used to shortcut a str through str.encode, and then catch a
    TypeError to retry without ``errors'' -- which, once str.encode refused a
    codec answering str, turned CPython's result into a LookupError from the
    retry.  A name the registry does not know still falls back to the
    built-in methods, for any encoding only the Smalltalk side implements."""
    try:
        info = lookup(encoding)
    except LookupError:
        if isinstance(obj, str):
            return obj.encode(encoding, errors)
        raise
    return _call_codec(info.encode, 'encoding', encoding, obj, errors)


def decode(obj, encoding='utf-8', errors='strict'):
    """codecs.decode(obj, encoding, errors): the mirror of encode -- through
    the registry for every input, so a memoryview or any other object reaches
    the codec (TransformCodecTest test_buffer_api_usage), with the built-in
    bytes.decode as the fallback for a name the registry does not know."""
    try:
        info = lookup(encoding)
    except LookupError:
        if isinstance(obj, (bytes, bytearray)):
            return obj.decode(encoding, errors)
        raise
    return _call_codec(info.decode, 'decoding', encoding, obj, errors)


# ----------------------------------------------------------- error handlers

_error_registry = {}


def register_error(name, handler):
    """Register a Unicode error-handling callback under ``name``.

    The handler is called with a UnicodeEncodeError / UnicodeDecodeError and
    answers a ``(replacement, resume_index)`` pair.  Grail's Smalltalk-side
    str.encode / bytes.decode honour only the built-in policy names, so a
    handler registered here fires for the pure-Python codecs in this module
    (charmap, and the escape codecs) rather than for every encode in the
    system -- but the registration call itself has always had to succeed, for
    werkzeug.urls to import at all."""
    if not callable(handler):
        raise TypeError('handler must be callable')
    _error_registry[name] = handler


def lookup_error(name):
    """Symmetric companion to register_error -- answers the registered
    handler or raises LookupError per CPython."""
    handler = _error_registry.get(name)
    if handler is None:
        raise LookupError('unknown error handler name ' + repr(name))
    return handler


def _make_unicode_error(cls, encoding, obj, start, end, reason):
    """Build a UnicodeEncodeError / UnicodeDecodeError carrying the five
    CPython attributes.  Grail's exception classes keep positional args but do
    not name them, so the attributes are attached here; a handler that reads
    ``exc.object`` / ``exc.start`` therefore works."""
    exc = cls(encoding, obj, start, end, reason)
    try:
        exc.encoding = encoding
        exc.object = obj
        exc.start = start
        exc.end = end
        exc.reason = reason
    except Exception:
        pass
    return exc


def _call_error_handler(errors, exc):
    """Run a registered handler, checking the CPython return contract."""
    result = lookup_error(errors)(exc)
    if not isinstance(result, tuple) or len(result) != 2:
        raise TypeError('error handler must return a 2-tuple')
    return result


# ------------------------------------------------------- charmap primitives
#
# webencodings builds its "replacement" and "x-user-defined" codecs entirely
# out of these three, so they are the reason ``import webencodings`` works.

def charmap_build(decoding_table):
    """Invert a 256-character decoding table into an encoding map.

    Keyed by CODE POINT, as CPython's EncodingMap is: charmap_encode looks a
    character up by ``ord``, and it is handed maps from two sources that must
    agree -- this one, and ``codecs.make_encoding_map``, which the dict-built
    codecs (cp437, cp850, ...) use and which has always been keyed by int.
    Keying this one by CHARACTER made those codecs unable to encode even
    ``'a'`` ("character maps to <undefined>").  A plain dict stands in for the
    opaque EncodingMap; nothing does anything with one but hand it back."""
    encoding_map = {}
    for index in range(len(decoding_table)):
        point = ord(decoding_table[index])
        if point != 0xFFFE and point not in encoding_map:
            encoding_map[point] = index
    return encoding_map


def _charmap_lookup_decode(mapping, byte):
    """What mapping says byte decodes to: a str, or None for undefined.

    CPython's rules (PyUnicode_DecodeCharmap).  A STR table is indexed, and
    U+FFFE or a short table means undefined.  Anything else is a mapping from
    the byte to an int code point, a str (of any length, including empty),
    or None; a LookupError means undefined too."""
    if isinstance(mapping, str):
        if byte >= len(mapping):
            return None
        char = mapping[byte]
        return None if char == '\ufffe' else char
    try:
        item = mapping[byte]
    except LookupError:
        return None
    if item is None:
        return None
    if isinstance(item, int):
        if not 0 <= item <= 0x10FFFF:
            raise TypeError('character mapping must be in range(0x110000)')
        if item == 0xFFFE:
            return None
        return chr(item)
    if isinstance(item, str):
        return None if item == '\ufffe' else item
    raise TypeError('character mapping must return integer, None or str')


def charmap_decode(input, errors='strict', mapping=None):
    """Decode bytes through a mapping, answering (str, consumed)."""
    if errors is None:
        errors = 'strict'
    data = _as_bytes(input)
    if mapping is None:
        return (data.decode('latin-1'), len(data))
    out = []
    index = 0
    length = len(data)
    while index < length:
        char = _charmap_lookup_decode(mapping, data[index])
        if char is None:
            exc = _make_unicode_error(
                UnicodeDecodeError, 'charmap', data, index, index + 1,
                'character maps to <undefined>')
            replacement, index = _handle_decode_error(errors, exc, data, index)
            out.append(replacement)
            continue
        out.append(char)
        index += 1
    return (''.join(out), length)


def _charmap_lookup_encode(mapping, char):
    """The bytes mapping gives char, or None for undefined.

    Looked up by ``ord`` (see charmap_build).  An int must fit in a byte; a
    bytes value is used as is; None or a LookupError means undefined."""
    try:
        item = mapping[ord(char)]
    except LookupError:
        return None
    if item is None:
        return None
    if isinstance(item, int):
        if not 0 <= item <= 255:
            raise TypeError('character mapping must be in range(256)')
        return bytes((item,))
    if isinstance(item, (bytes, bytearray)):
        return bytes(item)
    raise TypeError('character mapping must return integer, bytes or None, '
                    'not %s' % type(item).__name__)


def _charmap_encode_replacement(mapping, replacement, exc):
    """Push an error handler's str replacement back through the map.

    CPython does this for every policy, built-in or registered: ``'replace'``
    means the map's ``'?'``, which is NOT byte 0x3F in EBCDIC (cp037 has it at
    0x6F), and a replacement the map cannot encode re-raises the original
    error rather than being smuggled through as ASCII."""
    out = bytearray()
    for char in replacement:
        encoded = _charmap_lookup_encode(mapping, char)
        if encoded is None:
            raise exc
        out.extend(encoded)
    return bytes(out)


def charmap_encode(input, errors='strict', mapping=None):
    """Encode a str through an encoding map, answering (bytes, consumed)."""
    if errors is None:
        errors = 'strict'
    text = str(input)
    if mapping is None:
        return (text.encode('latin-1', errors), len(text))
    out = bytearray()
    index = 0
    length = len(text)
    while index < length:
        char = text[index]
        encoded = _charmap_lookup_encode(mapping, char)
        if encoded is not None:
            out.extend(encoded)
            index += 1
            continue
        # A RUN of unencodable characters is one error, as in CPython: a
        # handler sees start..end over all of it.
        end = index + 1
        while end < length and _charmap_lookup_encode(mapping, text[end]) is None:
            end += 1
        exc = _make_unicode_error(
            UnicodeEncodeError, 'charmap', text, index, end,
            'character maps to <undefined>')
        if errors == 'strict':
            raise exc
        if errors == 'ignore':
            index = end
            continue
        if errors == 'replace':
            out.extend(_charmap_encode_replacement(mapping, '?' * (end - index), exc))
            index = end
            continue
        if errors == 'backslashreplace':
            out.extend(_charmap_encode_replacement(
                mapping, ''.join(_backslash_escape(c) for c in text[index:end]), exc))
            index = end
            continue
        if errors == 'xmlcharrefreplace':
            out.extend(_charmap_encode_replacement(
                mapping, ''.join('&#%d;' % ord(c) for c in text[index:end]), exc))
            index = end
            continue
        replacement, position = _call_error_handler(errors, exc)
        if position < 0:
            position = length + position
        if isinstance(replacement, (bytes, bytearray)):
            out.extend(replacement)
        else:
            out.extend(_charmap_encode_replacement(mapping, str(replacement), exc))
        index = position
    return (bytes(out), length)


def _surrogate_escape_char(byte):
    """One undecodable byte as PEP 383's U+DC00+byte, or None below 0x80.

    ``chr(0xDC00 + byte)`` is the obvious spelling, and Grail's chr()
    refuses it on purpose: a lone surrogate is not something a GemStone
    Unicode string can hold, and the deliberate ValueError makes that a
    catchable failure instead of an uncatchable one during string
    construction.  Grail DOES have a representation for it, and the one
    path that already builds one is reachable from here -- decoding the
    byte as ascii under this very policy.

    None below 0x80, because CPython escapes only 0x80..0xFF: a codec
    hole below that raises rather than escapes.  The callers turn None
    back into the original exception, which is the whole difference
    between "this policy does not apply" and "this policy silently
    invented a character"."""
    if byte < 0x80:
        return None
    return bytes([byte]).decode('ascii', 'surrogateescape')


def _handle_decode_error(errors, exc, data, index):
    """Apply a decode error policy, answering (replacement_str, next_index)."""
    if errors == 'strict':
        raise exc
    if errors == 'ignore':
        return ('', index + 1)
    if errors == 'replace':
        return ('\ufffd', index + 1)
    if errors == 'backslashreplace':
        return ('\\x%02x' % data[index], index + 1)
    if errors == 'surrogateescape':
        escaped = _surrogate_escape_char(data[index])
        if escaped is None:
            raise exc
        return (escaped, index + 1)
    replacement, position = _call_error_handler(errors, exc)
    if position < 0:
        position = len(data) + position
    return (replacement, position)


def _handle_encode_error(errors, exc, text, index):
    """Apply an encode error policy, answering (replacement_bytes, next)."""
    char = text[index]
    if errors == 'strict':
        raise exc
    if errors == 'ignore':
        return (b'', index + 1)
    if errors == 'replace':
        return (b'?', index + 1)
    if errors == 'backslashreplace':
        return (_backslash_escape(char).encode('ascii'), index + 1)
    if errors == 'xmlcharrefreplace':
        return (('&#%d;' % ord(char)).encode('ascii'), index + 1)
    replacement, position = _call_error_handler(errors, exc)
    if position < 0:
        position = len(text) + position
    if isinstance(replacement, bytes):
        return (replacement, position)
    return (str(replacement).encode('ascii', 'strict'), position)


def _backslash_escape(char):
    """One character as its Python \\x / \\u / \\U escape."""
    point = ord(char)
    if point < 0x100:
        return '\\x%02x' % point
    if point < 0x10000:
        return '\\u%04x' % point
    return '\\U%08x' % point


# ------------------------------------------------- per-codec entry points
#
# Each answers CPython's ``(result, consumed)`` pair.  ``consumed`` is what
# makes an incremental decoder possible: with ``final=False`` a decoder stops
# short of a trailing byte sequence that is incomplete rather than invalid,
# reports how much it used, and the caller re-feeds the remainder next time.

def _as_bytes(data):
    """A decoder's input as bytes, refusing anything without the buffer
    protocol.

    ``bytes(data)`` was the spelling, and it ACCEPTS an int -- forty-two zero
    bytes for ``utf_8_decode(42)`` -- and would build bytes out of an
    iterable of ints too, so every decoder turned CPython's TypeError into
    plausible-looking output (test_codecs test_bad_decode_args, 76 codecs).
    memoryview() is the buffer-protocol test, as in readbuffer_encode."""
    if isinstance(data, bytes):
        return data
    if isinstance(data, (bytearray, memoryview)):
        return bytes(data)
    if isinstance(data, (str, int)):
        view = None
    else:
        try:
            view = memoryview(data)
        except TypeError:
            view = None
    if view is None:
        raise TypeError("a bytes-like object is required, not '%s'"
                        % type(data).__name__)
    return bytes(view)


def _as_escape_input(data):
    """The unicode-escape decoders' input: bytes-like, or a str taken as its
    UTF-8 encoding, which is what CPython's ``s*`` argument does.  Only these
    two decoders accept a str (test_codecs TypesTest test_unicode_escape)."""
    if isinstance(data, str):
        return data.encode('utf-8')
    return _as_bytes(data)


def utf_8_encode(input, errors='strict'):
    text = str(input)
    return (text.encode('utf-8', errors), len(text))


def _utf8_second_byte_range(lead, errors='strict'):
    """The (low, high) a well-formed sequence allows after this lead byte,
    or None for a byte that cannot start a multi-byte sequence at all.

    Under ``surrogatepass`` an ED lead also admits A0..BF: that is an encoded
    surrogate, which the policy decodes, so ``ED A0'' is a sequence still
    waiting for its last byte rather than an invalid one
    (test_incremental_surrogatepass feeds ED A0 80 a byte at a time)."""
    if 0xC2 <= lead <= 0xDF:
        return (0x80, 0xBF)
    if lead == 0xE0:
        return (0xA0, 0xBF)
    if lead == 0xED:
        return (0x80, 0xBF if errors == 'surrogatepass' else 0x9F)
    if 0xE1 <= lead <= 0xEF:
        return (0x80, 0xBF)
    if lead == 0xF0:
        return (0x90, 0xBF)
    if 0xF1 <= lead <= 0xF3:
        return (0x80, 0xBF)
    if lead == 0xF4:
        return (0x80, 0x8F)
    return None


def _utf8_incomplete_tail(data, errors='strict'):
    """Length of a trailing byte run that is a TRUNCATED (not invalid) UTF-8
    sequence, so an incremental decoder can hold it back for the next chunk.

    A malformed run answers 0: an invalid sequence must reach the strict
    decoder and raise, not be silently withheld forever.

    TRUNCATED means every byte present could still begin a well-formed
    sequence -- CPython's rule, and the one test_codecs test_incremental_errors
    checks with final=False.  Looking only at the lead byte's length
    withheld ``C0`` (never a lead), ``E0 80`` (an overlong), ``ED A0`` (a
    surrogate), ``F0 8F`` and ``F4 90`` (out of range) as if more input could
    rescue them, so the decoder waited instead of raising."""
    length = len(data)
    index = length - 1
    limit = length - 4
    if limit < 0:
        limit = 0
    while index >= limit:
        byte = data[index]
        if byte < 0x80:
            return 0
        if byte >= 0xC0:
            if byte >= 0xF0:
                need = 4
            elif byte >= 0xE0:
                need = 3
            else:
                need = 2
            have = length - index
            if have >= need:
                return 0
            bounds = _utf8_second_byte_range(byte, errors)
            if bounds is None:
                return 0
            if have >= 2 and not bounds[0] <= data[index + 1] <= bounds[1]:
                return 0
            for k in range(index + 2, length):
                if not 0x80 <= data[k] <= 0xBF:
                    return 0
            return have
        index -= 1
    return 0


def utf_8_decode(input, errors='strict', final=False):
    data = _as_bytes(input)
    if not final:
        tail = _utf8_incomplete_tail(data, errors)
        if tail:
            data = data[:len(data) - tail]
    return (data.decode('utf-8', errors), len(data))


def latin_1_encode(input, errors='strict'):
    text = str(input)
    return (text.encode('latin-1', errors), len(text))


def latin_1_decode(input, errors='strict', final=False):
    data = _as_bytes(input)
    return (data.decode('latin-1', errors), len(data))


def ascii_encode(input, errors='strict'):
    text = str(input)
    return (text.encode('ascii', errors), len(text))


def ascii_decode(input, errors='strict', final=False):
    data = _as_bytes(input)
    return (data.decode('ascii', errors), len(data))


def _utf16_incomplete_tail(data, byteorder):
    """Trailing bytes an incremental UTF-16 decoder must hold back: an odd
    byte, and a lone high surrogate whose partner is in the next chunk."""
    length = len(data)
    tail = length % 2
    body = length - tail
    if body >= 2:
        if byteorder < 0:
            unit = data[body - 2] | (data[body - 1] << 8)
        else:
            unit = (data[body - 2] << 8) | data[body - 1]
        if 0xD800 <= unit <= 0xDBFF:
            tail += 2
    return tail


def utf_16_le_decode(input, errors='strict', final=False):
    data = _as_bytes(input)
    if not final:
        tail = _utf16_incomplete_tail(data, -1)
        if tail:
            data = data[:len(data) - tail]
    return (data.decode('utf-16-le', errors), len(data))


def utf_16_be_decode(input, errors='strict', final=False):
    data = _as_bytes(input)
    if not final:
        tail = _utf16_incomplete_tail(data, 1)
        if tail:
            data = data[:len(data) - tail]
    return (data.decode('utf-16-be', errors), len(data))


def utf_16_le_encode(input, errors='strict'):
    text = str(input)
    return (text.encode('utf-16-le', errors), len(text))


def utf_16_be_encode(input, errors='strict'):
    text = str(input)
    return (text.encode('utf-16-be', errors), len(text))


def utf_16_encode(input, errors='strict', byteorder=0):
    text = str(input)
    if byteorder == 0:
        return (text.encode('utf-16', errors), len(text))
    if byteorder < 0:
        return (text.encode('utf-16-le', errors), len(text))
    return (text.encode('utf-16-be', errors), len(text))


def utf_16_decode(input, errors='strict', final=False):
    result, consumed, _ = utf_16_ex_decode(input, errors, 0, final)
    return (result, consumed)


def utf_16_ex_decode(input, errors='strict', byteorder=0, final=False):
    """UTF-16 with byte-order detection, answering (str, consumed, order).

    ``byteorder`` is 0 "unknown, sniff a BOM", -1 little, 1 big; the answered
    order is what the caller must pass back on the next chunk, which is how
    an incremental decoder keeps the BOM decision across a chunk boundary."""
    data = _as_bytes(input)
    # The ANSWERED order stays 0 when there is no BOM, as CPython's does: the
    # input is still read little-endian, but 0 is how the vendored
    # encodings/utf_16.py incremental decoder and StreamReader learn that the
    # stream had none, and they raise "Stream does not start with BOM" on it
    # (test_codecs UTF16Test test_badbom).  Answering -1 made them accept any
    # two bytes as a little-endian character.
    answered = byteorder
    consumed_bom = 0
    order = byteorder
    if byteorder == 0:
        if len(data) < 2:
            # Too short for a BOM.  With final set the byte is decoded, not
            # refused, so an error handler applies to it: ``replace'' gives
            # U+FFFD and ``ignore'' nothing (test_handlers).
            if final and data:
                result, consumed = utf_16_le_decode(data, errors, final)
                return (result, consumed, 0)
            return ('', 0, 0)
        head = data[0] | (data[1] << 8)
        if head == 0xFEFF:
            order = answered = -1
            data = data[2:]
            consumed_bom = 2
        elif head == 0xFFFE:
            order = answered = 1
            data = data[2:]
            consumed_bom = 2
        else:
            order = -1
    if order < 0:
        result, consumed = utf_16_le_decode(data, errors, final)
    else:
        result, consumed = utf_16_be_decode(data, errors, final)
    return (result, consumed + consumed_bom, answered)


# ------------------------------------------------------------------ UTF-32
#
# Simpler than UTF-16 in the one way that matters: every code point is
# exactly one four-byte unit, so there are no surrogate PAIRS to straddle a
# chunk boundary and the incomplete tail is just ``len % 4``.  What UTF-32
# does share is a byte ORDER, so the same BOM-sniffing dance applies -- see
# utf_32_ex_decode.
#
# The byte maths is DELEGATED to str.encode / bytes.decode, exactly as the
# UTF-16 entry points above delegate, and for a measured reason: doing it
# with a per-character Python loop here cost ~55us a character in Grail --
# 5000 characters took 278ms against utf-16's 1ms -- and timed test_codecs
# out entirely.  What stays here is the part that is cheap because it works
# on whole buffers: BOM detection and the incremental tail.


def _utf32_incomplete_tail(data):
    """Trailing bytes an incremental UTF-32 decoder must hold back.  Only a
    part-unit: unlike UTF-16 there is no surrogate half to wait on."""
    return len(data) % 4


def utf_32_le_encode(input, errors='strict'):
    text = str(input)
    return (text.encode('utf-32-le', errors), len(text))


def utf_32_be_encode(input, errors='strict'):
    text = str(input)
    return (text.encode('utf-32-be', errors), len(text))


def utf_32_le_decode(input, errors='strict', final=False):
    data = _as_bytes(input)
    if not final:
        tail = _utf32_incomplete_tail(data)
        if tail:
            data = data[:len(data) - tail]
    return (data.decode('utf-32-le', errors), len(data))


def utf_32_be_decode(input, errors='strict', final=False):
    data = _as_bytes(input)
    if not final:
        tail = _utf32_incomplete_tail(data)
        if tail:
            data = data[:len(data) - tail]
    return (data.decode('utf-32-be', errors), len(data))


def utf_32_encode(input, errors='strict', byteorder=0):
    """byteorder 0 answers a BOM followed by native order, which is what
    ``s.encode('utf-32')`` gives; -1 and 1 are the bare LE/BE forms."""
    text = str(input)
    if byteorder < 0:
        return (text.encode('utf-32-le', errors), len(text))
    if byteorder > 0:
        return (text.encode('utf-32-be', errors), len(text))
    return (text.encode('utf-32', errors), len(text))


def utf_32_decode(input, errors='strict', final=False):
    result, consumed, _ = utf_32_ex_decode(input, errors, 0, final)
    return (result, consumed)


def utf_32_ex_decode(input, errors='strict', byteorder=0, final=False):
    """UTF-32 with byte-order detection, answering (str, consumed, order).

    Mirrors utf_16_ex_decode: ``byteorder`` is 0 "unknown, sniff a BOM", -1
    little, 1 big, and the answered order is what the caller passes back on
    the next chunk -- which is how an incremental decoder keeps the BOM
    decision across a boundary."""
    import sys

    data = _as_bytes(input)
    # See utf_16_ex_decode for both rules: the answered order stays 0 without
    # a BOM, and a too-short final input is decoded so a handler applies.
    consumed_bom = 0
    native = -1 if sys.byteorder == 'little' else 1
    answered = byteorder
    order = byteorder
    if byteorder == 0:
        if len(data) < 4:
            if final and data:
                decode = utf_32_le_decode if native < 0 else utf_32_be_decode
                result, consumed = decode(data, errors, final)
                return (result, consumed, 0)
            return ('', 0, 0)
        if data[:4] == b'\xff\xfe\x00\x00':
            order = answered = -1
            data = data[4:]
            consumed_bom = 4
        elif data[:4] == b'\x00\x00\xfe\xff':
            order = answered = 1
            data = data[4:]
            consumed_bom = 4
        else:
            order = native
    if order < 0:
        result, consumed = utf_32_le_decode(data, errors, final)
    else:
        result, consumed = utf_32_be_decode(data, errors, final)
    return (result, consumed + consumed_bom, answered)


# ------------------------------------------------------------------- UTF-7
#
# Delegated to str.encode / bytes.decode for the reason the UTF-32 comment
# gives: a per-character Python loop is ~55us a character in Grail, which
# is what timed test_codecs out when utf-32's maths lived here.
#
# UTF-7 has no byte order and no BOM, so unlike the UTF-16/32 families
# there is nothing left for this layer to do beyond the shape of the entry
# points.  The incremental decoder is the interesting case: a shifted run
# has no length prefix, so a chunk may end anywhere inside one, and the
# safe stopping point is the last character that cannot be inside a run.


def utf_7_encode(input, errors='strict'):
    text = str(input)
    return (text.encode('utf-7', errors), len(text))


_UTF7_BASE64 = b'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
_UTF7_VALUE = {c: i for i, c in enumerate(_UTF7_BASE64)}


def _lone_surrogate(point):
    """A one-character str holding the surrogate ``point``.  Grail's chr()
    refuses one on purpose; the surrogatepass decoder is the path that can
    build it (as a PyStrSurrogate)."""
    return bytes((point & 0xFF, point >> 8)).decode('utf-16-le', 'surrogatepass')


def _utf7_error(errors, data, start, end, reason):
    """Apply a decode policy to data[start:end], answering (text, resume)."""
    exc = _make_unicode_error(UnicodeDecodeError, 'utf7', data, start, end, reason)
    if errors == 'strict':
        raise exc
    if errors == 'ignore':
        return ('', end)
    if errors == 'replace':
        return ('\ufffd', end)
    if errors == 'backslashreplace':
        return (''.join('\\x%02x' % b for b in data[start:end]), end)
    if errors == 'surrogateescape':
        out = []
        for b in data[start:end]:
            escaped = _surrogate_escape_char(b)
            if escaped is None:
                raise exc
            out.append(escaped)
        return (''.join(out), end)
    replacement, position = _call_error_handler(errors, exc)
    if position < 0:
        position = len(data) + position
    return (replacement, position)


def utf_7_decode(input, errors='strict', final=False):
    """UTF-7 (RFC 2152), a port of CPython's PyUnicode_DecodeUTF7Stateful.

    A PORT, not an approximation, because what an error handler produces
    depends on the state machine's every detail and test_codecs pins them:
    an error inside a shift spans from its ``+``, output already produced in
    that shift stays, a leftover of six or more bits is a partial character
    and of fewer must be zero padding, a high surrogate is kept as itself
    when the shift ends before its partner, and with final=False an open
    shift is handed back whole (consumed stops at its ``+``).  The old path
    delegated to a strict-only Smalltalk decoder, so ``replace`` raised and
    every error named no position.

    Input with no ``+`` and no high byte is plain ASCII to UTF-7, and is
    decoded as that without the per-byte loop."""
    if errors is None:
        errors = 'strict'
    data = _as_bytes(input)
    if 0x2B not in data and all(b < 0x80 for b in data):
        return (data.decode('ascii'), len(data))
    out = []
    length = len(data)
    in_shift = False
    bits = 0
    buffer = 0
    surrogate = 0
    shift_out_start = 0
    start = 0
    index = 0
    while index < length:
        ch = data[index]
        error = None
        if in_shift:
            if ch in _UTF7_VALUE:
                buffer = (buffer << 6) | _UTF7_VALUE[ch]
                bits += 6
                index += 1
                if bits >= 16:
                    unit = buffer >> (bits - 16)
                    bits -= 16
                    buffer &= (1 << bits) - 1
                    if surrogate:
                        if 0xDC00 <= unit <= 0xDFFF:
                            out.append(chr(0x10000 + ((surrogate - 0xD800) << 10)
                                           + (unit - 0xDC00)))
                            surrogate = 0
                            continue
                        out.append(_lone_surrogate(surrogate))
                        surrogate = 0
                    if 0xD800 <= unit <= 0xDBFF:
                        surrogate = unit
                    elif 0xDC00 <= unit <= 0xDFFF:
                        out.append(_lone_surrogate(unit))
                    else:
                        out.append(chr(unit))
            else:
                in_shift = False
                if bits > 0:
                    if bits >= 6:
                        index += 1
                        error = 'partial character in shift sequence'
                    elif buffer != 0:
                        index += 1
                        error = 'non-zero padding bits in shift sequence'
                if error is None:
                    if surrogate and ch < 0x80 and ch != 0x2B:
                        out.append(_lone_surrogate(surrogate))
                    surrogate = 0
                    if ch == 0x2D:
                        index += 1
        elif ch == 0x2B:
            start = index
            index += 1
            if index < length and data[index] == 0x2D:
                index += 1
                out.append('+')
            elif index < length and data[index] not in _UTF7_VALUE:
                index += 1
                error = 'ill-formed sequence'
            else:
                in_shift = True
                surrogate = 0
                shift_out_start = len(out)
                bits = 0
                buffer = 0
        elif ch < 0x80:
            index += 1
            out.append(chr(ch))
        else:
            start = index
            index += 1
            error = 'unexpected special character'
        if error is not None:
            text, index = _utf7_error(errors, data, start, index, error)
            out.append(text)
    if in_shift and final:
        in_shift = False
        if surrogate or bits >= 6 or (bits > 0 and buffer != 0):
            text, resume = _utf7_error(errors, data, start, length,
                                       'unterminated shift sequence')
            out.append(text)
            if resume < length:
                rest, _ = utf_7_decode(data[resume:], errors, final)
                out.append(rest)
    if not final and in_shift:
        del out[shift_out_start:]
        return (''.join(out), start)
    return (''.join(out), length)
# ----------------------------------------------- escape / buffer helpers
#
# CPython exposes these three from _codecs and the stdlib reaches for them
# directly: ``escape_decode`` is what ast.literal_eval and the
# unicode_escape codec are built on, ``escape_encode`` its inverse, and
# ``readbuffer_encode`` the buffer passthrough a codec uses to get bytes
# out of anything supporting the buffer protocol.
#
# All three answer CPython's ``(result, consumed)`` pair, and consumed is
# the length of the INPUT, not of the result -- which for escape_decode
# means the number of source bytes read, four for ``\\x41``.

_ESCAPE_DECODE_SIMPLE = {
    ord('\n'): b'',        # a backslash-newline is a line continuation
    ord('\\'): b'\\',
    ord("'"): b"'",
    ord('"'): b'"',
    ord('a'): b'\a',
    ord('b'): b'\b',
    ord('f'): b'\f',
    ord('n'): b'\n',
    ord('r'): b'\r',
    ord('t'): b'\t',
    ord('v'): b'\v',
}


def _warn_invalid_escape(first, prefix=''):
    """CPython's one DeprecationWarning for an escape decoder's FIRST invalid
    escape: ``first`` is the offending character (a str) or, for an octal
    escape past \\377, its value (an int); None means there was none.

    ONCE per call, about the first, with CPython's wording including the
    trailing sentence -- the bytes decoder's message carries a ``b`` prefix.
    Both decoders used to warn once PER invalid escape, with the sentence
    missing."""
    if first is None:
        return
    import warnings
    if isinstance(first, int):
        text = '%s"\\%o" is an invalid octal escape sequence. ' % (prefix, first)
    else:
        text = '%s"\\%s" is an invalid escape sequence. ' % (prefix, first)
    warnings.warn(text + 'Such sequences will not work in the future. ',
                  DeprecationWarning, stacklevel=3)


_unicode_escape_depth = 0

_UNICODE_ESCAPE_SIMPLE = frozenset(b'\n\\\'"abfnrtv')


def _first_invalid_unicode_escape(data):
    """What the unicode-escape decoder would warn about in data, or None.

    Walks the escapes as the decoder does, stepping over every valid one --
    ``\\x``, ``\\u``, ``\\U`` with their hex digits (a MALFORMED one is an
    error, not a warning, and the scan resumes after its digits as the
    decoder does), ``\\N{...}``, and one to three octal digits -- so a
    backslash inside a valid escape is never mistaken for a new one."""
    length = len(data)
    index = 0
    while index < length:
        if data[index] != 0x5C:
            index += 1
            continue
        if index + 1 >= length:
            return None
        nxt = data[index + 1]
        if nxt in _UNICODE_ESCAPE_SIMPLE:
            index += 2
            continue
        if nxt in (0x78, 0x75, 0x55):          # x u U
            width = {0x78: 2, 0x75: 4, 0x55: 8}[nxt]
            index += 2
            count = 0
            while (count < width and index < length
                   and data[index] in b'0123456789abcdefABCDEF'):
                index += 1
                count += 1
            continue
        if nxt == 0x4E:                        # N{name}
            close = data.find(b'}', index + 2)
            index = length if close < 0 else close + 1
            continue
        if 0x30 <= nxt <= 0x37:
            end = index + 2
            while end < length and end < index + 4 and 0x30 <= data[end] <= 0x37:
                end += 1
            value = int(data[index + 1:end], 8)
            if value > 0o377:
                return value
            index = end
            continue
        return chr(nxt)
    return None


def escape_decode(data, errors='strict'):
    """Interpret Python's byte escapes, answering (bytes, consumed).

    An UNRECOGNISED escape is left alone, backslash and all, with a
    DeprecationWarning -- CPython's wording, because test_codecs matches on
    it: ``"\\q" is an invalid escape sequence``.

    A malformed ``\\x`` is the one hard error, and it honours the errors
    argument: 'strict' raises ValueError, 'ignore' drops the escape, and
    'replace' substitutes a question mark.  ``consumed`` is the length of
    the INPUT throughout."""
    if isinstance(data, str):
        data = data.encode('latin-1')
    elif isinstance(data, (bytes, bytearray, memoryview)):
        data = _as_bytes(data)
    else:
        raise TypeError(
            'escape_decode() argument 1 must be str or bytes-like, not %s'
            % type(data).__name__)
    out = bytearray()
    index = 0
    length = len(data)
    first_invalid = None
    while index < length:
        byte = data[index]
        if byte != 0x5C:            # not a backslash
            out.append(byte)
            index += 1
            continue
        if index + 1 >= length:
            raise ValueError('Trailing \\ in string')
        nxt = data[index + 1]
        simple = _ESCAPE_DECODE_SIMPLE.get(nxt)
        if simple is not None:
            out += simple
            index += 2
            continue
        if nxt == ord('x'):
            digits = data[index + 2:index + 4]
            if len(digits) == 2:
                try:
                    out.append(int(digits, 16))
                    index += 4
                    continue
                except ValueError:
                    pass
            if errors == 'strict':
                raise ValueError(
                    'invalid \\x escape at position %d' % index)
            if errors == 'replace':
                out += b'?'
            elif errors != 'ignore':
                raise ValueError(
                    'decoding error; unknown error handling code: ' + errors)
            # Skip the backslash, the x, and whatever partial digits follow.
            index += 2
            while index < length and data[index] in b'0123456789abcdefABCDEF':
                index += 1
            continue
        if 0x30 <= nxt <= 0x37:     # up to three octal digits
            end = index + 2
            while end < length and end < index + 4 and 0x30 <= data[end] <= 0x37:
                end += 1
            value = int(data[index + 1:end], 8)
            if value > 0o377 and first_invalid is None:
                # Three octal digits can name a value no byte can hold.
                # CPython keeps the low eight bits and deprecates the
                # spelling; the message names the value as WRITTEN.
                first_invalid = value
            out.append(value & 0xFF)
            index = end
            continue
        # Unrecognised: keep the backslash and the character after it, and
        # say so -- CPython deprecated these rather than making them errors.
        if first_invalid is None:
            first_invalid = chr(nxt)
        out.append(byte)
        out.append(nxt)
        index += 2
    _warn_invalid_escape(first_invalid, 'b')
    return (bytes(out), length)


_ESCAPE_ENCODE_MAP = {
    ord('\\'): b'\\\\',
    ord("'"): b"\\'",
    ord('\t'): b'\\t',
    ord('\n'): b'\\n',
    ord('\r'): b'\\r',
}


def escape_encode(data, errors='strict'):
    """The inverse: bytes as their Python escape spelling.

    Only the five CPython escapes, and NOT the double quote -- ``b'a"b'``
    comes back unchanged, which is what repr() of a bytes object does when
    it picks single quotes."""
    # BYTES ONLY, deliberately: CPython's escape_encode refuses a bytearray
    # as well as a str, which is stricter than the buffer protocol its
    # neighbours accept (test_codecs asserts both refusals).
    if not isinstance(data, bytes) or isinstance(data, bytearray):
        raise TypeError(
            'escape_encode() argument 1 must be bytes, not %s'
            % type(data).__name__)
    data = _as_bytes(data)
    out = bytearray()
    for byte in data:
        mapped = _ESCAPE_ENCODE_MAP.get(byte)
        if mapped is not None:
            out += mapped
        elif byte < 0x20 or byte >= 0x7F:
            out += ('\\x%02x' % byte).encode('ascii')
        else:
            out.append(byte)
    return (bytes(out), len(data))


def readbuffer_encode(data, errors='strict'):
    """Anything supporting the buffer protocol as plain bytes.

    An int is NOT such a thing, and refusing it is the point of the type
    check: ``bytes(42)`` would answer forty-two zero bytes rather than
    raise, so the permissive spelling turns CPython's TypeError into
    plausible-looking data."""
    if isinstance(data, str):
        return (data.encode('latin-1'), len(data))
    if not isinstance(data, (bytes, bytearray, memoryview)):
        try:
            memoryview(data)
        except TypeError:
            raise TypeError(
                'readbuffer_encode() argument 1 must be read-only '
                'bytes-like object, not %s' % type(data).__name__)
    out = _as_bytes(data)
    return (out, len(out))


def raw_unicode_escape_encode(input, errors='strict'):
    text = str(input)
    return (text.encode('raw-unicode-escape', errors), len(text))


def _escape_incomplete_tail(data, raw):
    """Bytes at the end of `data` that may still be part of an escape.

    An incremental decoder must hold those back rather than decode them:
    `b'a\\'` fed without `final` is not "a backslash at end of string", it is
    a caller who has not sent the rest yet.  Returns 0 when nothing is
    pending, so the common case costs one scan of the tail.

    WHICH escapes can be incomplete differs between the two codecs, which is
    why `raw` is a parameter rather than a guess:

        b'a\\x'   unicode-escape holds it, raw-unicode-escape does not
        b'a\\u'   both hold it

    -- raw-unicode-escape knows only `\\uXXXX` and `\\UXXXXXXXX`, so its `\\x`
    is an ordinary backslash followed by an ordinary x, already complete.
    Octal escapes and the one-letter ones (`\\t`, `\\n`) are never held: they
    are complete as soon as the backslash has one byte after it.
    """
    n = len(data)
    # \UXXXXXXXX is the longest escape, so nothing further back can be pending.
    for start in range(n - 1, max(-1, n - 11), -1):
        if data[start] != 0x5C:
            continue
        # A backslash preceded by an ODD run of backslashes is itself escaped,
        # so it begins nothing -- b'a\\\\' is a finished escaped backslash.
        preceding = 0
        j = start - 1
        while j >= 0 and data[j] == 0x5C:
            preceding += 1
            j -= 1
        if preceding % 2 == 1:
            continue
        body = data[start + 1:]
        if not body:
            return n - start
        kind = body[0]
        if kind == 0x75:                       # 'u'
            return n - start if len(body) - 1 < 4 else 0
        if kind == 0x55:                       # 'U'
            return n - start if len(body) - 1 < 8 else 0
        if kind == 0x78 and not raw:           # 'x'
            return n - start if len(body) - 1 < 2 else 0
        return 0
    return 0


def raw_unicode_escape_decode(input, errors='strict', final=True):
    data = _as_escape_input(input)
    if not final:
        tail = _escape_incomplete_tail(data, True)
        if tail:
            data = data[:len(data) - tail]
    return (data.decode('raw-unicode-escape', errors), len(data))


def unicode_escape_encode(input, errors='strict'):
    text = str(input)
    return (text.encode('unicode-escape', errors), len(text))


def unicode_escape_decode(input, errors='strict', final=True):
    data = _as_escape_input(input)
    if not final:
        tail = _escape_incomplete_tail(data, False)
        if tail:
            data = data[:len(data) - tail]
    # Decode FIRST: a strict error is raised before any warning, as in
    # CPython, which only warns once the decode has succeeded.
    #
    # Only the OUTERMOST call warns.  bytes.decode with an errors argument
    # consults the codec registry, which for unicode-escape comes straight
    # back here -- so a direct call nests one level and warned twice.
    global _unicode_escape_depth
    _unicode_escape_depth += 1
    try:
        result = data.decode('unicode-escape', errors)
    finally:
        _unicode_escape_depth -= 1
    if _unicode_escape_depth == 0 and 0x5C in data:
        _warn_invalid_escape(_first_invalid_unicode_escape(data))
    return (result, len(data))


def utf_8_sig_encode(input, errors='strict'):
    text = str(input)
    return (b'\xef\xbb\xbf' + text.encode('utf-8', errors), len(text))


def utf_8_sig_decode(input, errors='strict', final=False):
    data = _as_bytes(input)
    if data[:3] == b'\xef\xbb\xbf':
        result, consumed = utf_8_decode(data[3:], errors, final)
        return (result, consumed + 3)
    if len(data) < 3 and b'\xef\xbb\xbf'[:len(data)] == data and not final:
        return ('', 0)
    return utf_8_decode(data, errors, final)


# --------------------------------------------- the built-in error handlers
#
# CPython exposes these as C callables reachable both by name
# (``lookup_error('replace')``) and as module attributes that ``codecs.py``
# re-exports as ``replace_errors`` and friends.  Registering real functions
# here is what makes ``codecs.strict_errors`` -- which is just
# ``lookup_error('strict')`` -- resolvable at ``import codecs`` time.

def _error_span(exc):
    """(object, start, end) for either direction of Unicode error."""
    obj = getattr(exc, 'object', None)
    start = getattr(exc, 'start', None)
    end = getattr(exc, 'end', None)
    if obj is None or start is None or end is None:
        args = getattr(exc, 'args', ())
        if len(args) >= 4:
            obj, start, end = args[1], args[2], args[3]
        else:
            raise TypeError('not a Unicode error with position information')
    return (obj, start, end)


def strict_errors(exc):
    """'strict' -- re-raise, which is the default policy everywhere."""
    raise exc


def ignore_errors(exc):
    """'ignore' -- drop the offending run entirely."""
    _obj, _start, end = _error_span(exc)
    return ('', end)


def replace_errors(exc):
    """'replace' -- U+FFFD on decode, '?' on encode, per CPython."""
    obj, start, end = _error_span(exc)
    if isinstance(exc, UnicodeEncodeError):
        return ('?' * (end - start), end)
    return ('\ufffd', end)


def xmlcharrefreplace_errors(exc):
    """'xmlcharrefreplace' -- encode only; &#NNN; per unencodable char."""
    obj, start, end = _error_span(exc)
    if not isinstance(exc, UnicodeEncodeError):
        raise TypeError('xmlcharrefreplace handler is for encoding only')
    return (''.join(['&#%d;' % ord(ch) for ch in obj[start:end]]), end)


def backslashreplace_errors(exc):
    """'backslashreplace' -- \\xNN / \\uNNNN escapes, both directions."""
    obj, start, end = _error_span(exc)
    if isinstance(exc, UnicodeEncodeError):
        return (''.join([_backslash_escape(ch) for ch in obj[start:end]]), end)
    return (''.join(['\\x%02x' % byte for byte in obj[start:end]]), end)


def namereplace_errors(exc):
    """'namereplace' -- CPython emits \\N{NAME}; Grail has no Unicode name
    database, so this degrades to the backslash escape rather than being
    absent.  The distinction only shows in the exact escape text."""
    obj, start, end = _error_span(exc)
    if not isinstance(exc, UnicodeEncodeError):
        raise TypeError('namereplace handler is for encoding only')
    return (''.join([_backslash_escape(ch) for ch in obj[start:end]]), end)


def surrogateescape_errors(exc):
    """PEP 383 -- an undecodable byte becomes U+DC00+byte and back again."""
    obj, start, end = _error_span(exc)
    if isinstance(exc, UnicodeEncodeError):
        out = bytearray()
        for ch in obj[start:end]:
            point = ord(ch)
            if 0xDC80 <= point <= 0xDCFF:
                out.append(point - 0xDC00)
            else:
                raise exc
        return (bytes(out), end)
    escaped = []
    for byte in obj[start:end]:
        one = _surrogate_escape_char(byte)
        if one is None:
            raise exc
        escaped.append(one)
    return (''.join(escaped), end)


def surrogatepass_errors(exc):
    """Let lone surrogates through as their raw UTF-8 encoding."""
    obj, start, end = _error_span(exc)
    if isinstance(exc, UnicodeEncodeError):
        out = bytearray()
        for ch in obj[start:end]:
            point = ord(ch)
            if not (0xD800 <= point <= 0xDFFF):
                raise exc
            out.append(0xE0 | (point >> 12))
            out.append(0x80 | ((point >> 6) & 0x3F))
            out.append(0x80 | (point & 0x3F))
        return (bytes(out), end)
    data = obj[start:end]
    if len(data) < 3:
        raise exc
    point = (((data[0] & 0x0F) << 12) | ((data[1] & 0x3F) << 6)
             | (data[2] & 0x3F))
    if not (0xD800 <= point <= 0xDFFF):
        raise exc
    return (chr(point), start + 3)


register_error('strict', strict_errors)
register_error('ignore', ignore_errors)
register_error('replace', replace_errors)
register_error('xmlcharrefreplace', xmlcharrefreplace_errors)
register_error('backslashreplace', backslashreplace_errors)
register_error('namereplace', namereplace_errors)
register_error('surrogateescape', surrogateescape_errors)
register_error('surrogatepass', surrogatepass_errors)
