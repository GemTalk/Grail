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
    """codecs.encode(obj, encoding, errors) -> bytes.

    CPython always goes through the registry here; Grail shortcuts a str
    through ``str.encode`` because that is where its built-in codecs live,
    and falls back to the registry when the name is not one of them.

    A NON-str never takes that shortcut.  It has no ``.encode`` to take --
    ``codecs.encode(b'..', 'base64_codec')`` used to die with
    ``'ByteArray' object has no attribute 'encode'`` -- and the
    bytes-to-bytes transform codecs are precisely the ones whose input is
    not a str.  Nor is a str-to-str codec reachable by the shortcut: the
    LookupError below is what ``'x'.encode('rot_13')`` now raises, and
    catching it routes the call the same way."""
    if not isinstance(obj, str):
        return _call_codec(lookup(encoding).encode, 'encoding', encoding,
                           obj, errors)
    try:
        return obj.encode(encoding, errors)
    except LookupError:
        return _call_codec(lookup(encoding).encode, 'encoding', encoding,
                           obj, errors)
    except TypeError:
        # Grail's str.encode does not always accept the errors argument.
        return obj.encode(encoding)


def decode(obj, encoding='utf-8', errors='strict'):
    """codecs.decode(obj, encoding, errors) -> str.

    The mirror of encode: a str input cannot use the ``bytes.decode``
    shortcut, and the transform codecs decode str-to-str (rot_13) or
    bytes-to-bytes, the latter reaching the registry through the
    LookupError the denylist raises."""
    if isinstance(obj, str):
        return _call_codec(lookup(encoding).decode, 'decoding', encoding,
                           obj, errors)
    try:
        return obj.decode(encoding, errors)
    except LookupError:
        return _call_codec(lookup(encoding).decode, 'decoding', encoding,
                           obj, errors)
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
    consumed_bom = 0
    if byteorder == 0:
        if len(data) < 4:
            if final and data:
                raise _make_unicode_error(
                    UnicodeDecodeError, 'utf-32', data, 0, len(data),
                    'truncated data')
            return ('', 0, 0)
        if data[:4] == b'\xff\xfe\x00\x00':
            order = -1
            data = data[4:]
            consumed_bom = 4
        elif data[:4] == b'\x00\x00\xfe\xff':
            order = 1
            data = data[4:]
            consumed_bom = 4
        else:
            order = -1 if sys.byteorder == 'little' else 1
    else:
        order = byteorder
    if order < 0:
        result, consumed = utf_32_le_decode(data, errors, final)
    else:
        result, consumed = utf_32_be_decode(data, errors, final)
    return (result, consumed + consumed_bom, order)


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


def _utf7_safe_prefix(data):
    """How much of data an incremental decoder may consume now.

    A shifted run runs from ``+`` to its terminator, and nothing inside it
    can be decoded until the run closes -- so the prefix ends at the last
    byte that is provably outside one."""
    last = len(data)
    index = 0
    while index < len(data):
        if data[index] == 0x2B:          # '+' opens a run
            run_end = index + 1
            while run_end < len(data) and (
                    data[run_end:run_end + 1].isalnum()
                    or data[run_end] in (0x2B, 0x2F)):
                run_end += 1
            if run_end >= len(data):
                return index             # run is still open: stop before it
            if data[run_end] == 0x2D:    # '-' closes it
                run_end += 1
            index = run_end
            last = index
        else:
            index += 1
            last = index
    return last


def utf_7_encode(input, errors='strict'):
    text = str(input)
    return (text.encode('utf-7', errors), len(text))


def utf_7_decode(input, errors='strict', final=False):
    data = _as_bytes(input)
    if not final:
        data = data[:_utf7_safe_prefix(data)]
    return (data.decode('utf-7', errors), len(data))
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
            if value > 0o377:
                # Three octal digits can name a value no byte can hold.
                # CPython keeps the low eight bits and deprecates the
                # spelling; the message names the value as WRITTEN.
                import warnings

                warnings.warn(
                    '"\\%o" is an invalid octal escape sequence' % value,
                    DeprecationWarning, stacklevel=2)
            out.append(value & 0xFF)
            index = end
            continue
        # Unrecognised: keep the backslash and the character after it, and
        # say so -- CPython deprecated these rather than making them errors.
        import warnings

        warnings.warn(
            '"\\%c" is an invalid escape sequence' % nxt,
            DeprecationWarning, stacklevel=2)
        out.append(byte)
        out.append(nxt)
        index += 2
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
