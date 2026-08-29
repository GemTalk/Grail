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
        if c.isalnum() or c == '.':
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


def encode(obj, encoding='utf-8', errors='strict'):
    """codecs.encode(obj, encoding, errors) -> bytes."""
    try:
        return obj.encode(encoding, errors)
    except LookupError:
        return lookup(encoding).encode(obj, errors)[0]
    except TypeError:
        # Grail's str.encode does not always accept the errors argument.
        return obj.encode(encoding)


def decode(obj, encoding='utf-8', errors='strict'):
    """codecs.decode(obj, encoding, errors) -> str."""
    try:
        return obj.decode(encoding, errors)
    except LookupError:
        return lookup(encoding).decode(obj, errors)[0]
    except TypeError:
        return obj.decode(encoding)


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

    CPython answers an opaque EncodingMap; a plain dict has the same
    behaviour for the one thing anybody does with it, which is hand it back
    to charmap_encode."""
    encoding_map = {}
    for index in range(len(decoding_table)):
        encoding_map[decoding_table[index]] = index
    return encoding_map


def charmap_decode(input, errors='strict', mapping=None):
    """Decode bytes through a 256-entry table, answering (str, consumed)."""
    if errors is None:
        errors = 'strict'
    data = bytes(input)
    if mapping is None:
        return (data.decode('latin-1'), len(data))
    out = []
    index = 0
    length = len(data)
    while index < length:
        byte = data[index]
        char = None
        if byte < len(mapping):
            candidate = mapping[byte]
            if candidate != '\ufffe':
                char = candidate
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
        value = mapping.get(char)
        if value is None:
            exc = _make_unicode_error(
                UnicodeEncodeError, 'charmap', text, index, index + 1,
                'character maps to <undefined>')
            replacement, index = _handle_encode_error(errors, exc, text, index)
            out.extend(replacement)
            continue
        out.append(value)
        index += 1
    return (bytes(out), length)


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
        return (chr(0xDC00 + data[index]), index + 1)
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
    if isinstance(data, bytes):
        return data
    return bytes(data)


def utf_8_encode(input, errors='strict'):
    text = str(input)
    return (text.encode('utf-8', errors), len(text))


def _utf8_incomplete_tail(data):
    """Length of a trailing byte run that is a TRUNCATED (not invalid) UTF-8
    sequence, so an incremental decoder can hold it back for the next chunk.

    A malformed run answers 0: an invalid sequence must reach the strict
    decoder and raise, not be silently withheld forever."""
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
            if have < need:
                return have
            return 0
        index -= 1
    return 0


def utf_8_decode(input, errors='strict', final=False):
    data = _as_bytes(input)
    if not final:
        tail = _utf8_incomplete_tail(data)
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
    if byteorder == 0:
        if len(data) < 2:
            if final and len(data) == 1:
                raise UnicodeDecodeError(
                    'utf-16', data, 0, 1, 'truncated data')
            return ('', 0, 0)
        head = data[0] | (data[1] << 8)
        if head == 0xFEFF:
            byteorder = -1
            data = data[2:]
            consumed_bom = 2
        elif head == 0xFFFE:
            byteorder = 1
            data = data[2:]
            consumed_bom = 2
        else:
            # CPython defaults to little-endian when there is no BOM.
            byteorder = -1
            consumed_bom = 0
    else:
        consumed_bom = 0
    if byteorder < 0:
        result, consumed = utf_16_le_decode(data, errors, final)
    else:
        result, consumed = utf_16_be_decode(data, errors, final)
    return (result, consumed + consumed_bom, byteorder)


def raw_unicode_escape_encode(input, errors='strict'):
    text = str(input)
    return (text.encode('raw-unicode-escape', errors), len(text))


def raw_unicode_escape_decode(input, errors='strict', final=True):
    data = _as_bytes(input)
    return (data.decode('raw-unicode-escape', errors), len(data))


def unicode_escape_encode(input, errors='strict'):
    text = str(input)
    return (text.encode('unicode-escape', errors), len(text))


def unicode_escape_decode(input, errors='strict', final=True):
    data = _as_bytes(input)
    return (data.decode('unicode-escape', errors), len(data))


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
    return (''.join([chr(0xDC00 + byte) for byte in obj[start:end]]), end)


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
