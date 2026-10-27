# Pure-Python port of CPython 3.14.4's Modules/binascii.c.
#
# Signatures, defaults, docstrings and positional-/keyword-only markers come
# from Modules/clinic/binascii.c.h; algorithms and error messages from
# binascii.c ("C:<line>" below).  b2a_hex's separator logic is
# _Py_strhex_impl in Python/pystrhex.c.
"""Conversion between binary data and ASCII"""


class Error(ValueError):
    pass


class Incomplete(Exception):
    pass


# --- tables ------------------------------------------------------------------

_B2A_BASE64 = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"

# 255 marks a byte outside the alphabet; '=' is handled before any lookup.
_A2B_BASE64 = [255] * 256
for _i in range(64):
    _A2B_BASE64[_B2A_BASE64[_i]] = _i

_HEX_LOWER = b"0123456789abcdef"
_HEX_UPPER = b"0123456789ABCDEF"

# Two lowercase hex digits per byte value, for b2a_hex.
_HEX_PAIRS = []
for _i in range(256):
    _HEX_PAIRS.append(bytes((_HEX_LOWER[_i >> 4], _HEX_LOWER[_i & 15])))

# The part of _PyLong_DigitValue that matters here: hex digits map to their
# value, every other byte to 37 (as in the C table).
_DIGIT_VALUE = [37] * 256
for _i in range(10):
    _DIGIT_VALUE[48 + _i] = _i
for _i in range(6):
    _DIGIT_VALUE[65 + _i] = 10 + _i
    _DIGIT_VALUE[97 + _i] = 10 + _i

# crctab_hqx (CRC-CCITT, polynomial 0x1021) and crc_32_tab (reflected
# 0xEDB88320), generated rather than transcribed; they equal the C tables.
_CRCTAB_HQX = []
_CRC_32_TAB = []
for _i in range(256):
    _c = _i << 8
    for _k in range(8):
        if _c & 0x8000:
            _c = ((_c << 1) ^ 0x1021) & 0xFFFF
        else:
            _c = (_c << 1) & 0xFFFF
    _CRCTAB_HQX.append(_c)
    _c = _i
    for _k in range(8):
        if _c & 1:
            _c = (_c >> 1) ^ 0xEDB88320
        else:
            _c = _c >> 1
    _CRC_32_TAB.append(_c)
del _i, _k, _c

_MAXLINESIZE = 76
_BASE64_MAXBIN = ((1 << 63) - 1 - 3) // 2


# --- argument conversion -------------------------------------------------------

def _type_name(obj):
    return type(obj).__name__


def _buffer(obj):
    """PyObject_GetBuffer(obj, PyBUF_SIMPLE): the raw bytes of a buffer."""
    if isinstance(obj, (bytes, bytearray)):
        return obj
    try:
        view = memoryview(obj)
    except TypeError:
        raise TypeError("a bytes-like object is required, not '%.100s'"
                        % _type_name(obj)) from None
    try:
        if not view.c_contiguous:
            raise BufferError(
                "memoryview: underlying buffer is not C-contiguous")
        return view.tobytes()
    finally:
        view.release()


def _ascii_buffer(obj):
    """ascii_buffer_converter (C:163): a buffer, or an ASCII-only str."""
    if isinstance(obj, str):
        try:
            return str.encode(obj, "ascii")
        except UnicodeEncodeError:
            raise ValueError(
                "string argument should contain only ASCII characters"
            ) from None
    if isinstance(obj, (bytes, bytearray)):
        return obj
    try:
        view = memoryview(obj)
    except Exception:
        view = None
    if view is not None:
        try:
            # A non-contiguous view fails PyBUF_SIMPLE, and the converter
            # replaces that error with its own TypeError.
            if view.c_contiguous:
                return view.tobytes()
        finally:
            view.release()
    raise TypeError("argument should be bytes, buffer or ASCII string, "
                    "not '%.100s'" % _type_name(obj))


def _index(obj):
    """_PyNumber_Index."""
    if isinstance(obj, int):
        return obj
    try:
        index = type(obj).__index__
    except AttributeError:
        raise TypeError("'%.200s' object cannot be interpreted as an integer"
                        % _type_name(obj)) from None
    result = index(obj)
    if not isinstance(result, int):
        raise TypeError("__index__ returned non-int (type %.200s)"
                        % _type_name(result))
    return result


def _unsigned_int_mask(obj):
    """(unsigned int)PyLong_AsUnsignedLongMask(obj)."""
    return _index(obj) & 0xFFFFFFFF


def _c_int(obj):
    """PyLong_AsInt(obj)."""
    value = _index(obj)
    if value > 2147483647 or value < -2147483648:
        raise OverflowError("Python int too large to convert to C int")
    return int(value)


class _Unrepresentable:
    # b2a_hex's ``sep`` defaults to NULL, which is not None: an explicit
    # sep=None fails len().  The repr matches the C signature's default.
    __slots__ = ()

    def __repr__(self):
        return "<unrepresentable>"


_NO_SEP = _Unrepresentable()


# --- uu ----------------------------------------------------------------------

def a2b_uu(data, /):
    """Decode a line of uuencoded data."""
    ascii_data = _ascii_buffer(data)
    ascii_len = len(ascii_data)
    # C:222 reads the length byte unconditionally; for empty input that is
    # the buffer's NUL terminator, so b'' decodes to 32 NUL bytes in 3.14.4.
    first = ascii_data[0] if ascii_len > 0 else 0
    bin_len = (first - 32) & 0o77
    ascii_len -= 1
    pos = 1
    out = bytearray()
    leftbits = 0
    leftchar = 0
    while bin_len > 0:
        this_ch = ascii_data[pos] if ascii_len > 0 else 0
        if this_ch == 10 or this_ch == 13 or ascii_len <= 0:
            # Whitespace: assume some spaces got eaten at end-of-line.
            this_ch = 0
        else:
            # 96 rather than 95: some uuencoders write '`' for zero.
            if this_ch < 32 or this_ch > 96:
                raise Error("Illegal char")
            this_ch = (this_ch - 32) & 0o77
        leftchar = (leftchar << 6) | this_ch
        leftbits += 6
        if leftbits >= 8:
            leftbits -= 8
            out.append((leftchar >> leftbits) & 0xFF)
            leftchar &= (1 << leftbits) - 1
            bin_len -= 1
        ascii_len -= 1
        pos += 1
    # Anything left on the line must be whitespace (or '`' padding).
    while ascii_len > 0:
        this_ch = ascii_data[pos]
        pos += 1
        ascii_len -= 1
        if this_ch != 32 and this_ch != 96 and this_ch != 10 and this_ch != 13:
            raise Error("Trailing garbage")
    return bytes(out)


def b2a_uu(data, /, *, backtick=False):
    """Uuencode line of data."""
    bin_data = _buffer(data)
    backtick = bool(backtick)
    bin_len = len(bin_data)
    if bin_len > 45:
        raise Error("At most 45 bytes at once")
    out = bytearray()
    if backtick and not bin_len:
        out.append(96)
    else:
        out.append(32 + bin_len)
    leftbits = 0
    leftchar = 0
    i = 0
    while bin_len > 0 or leftbits != 0:
        if bin_len > 0:
            leftchar = (leftchar << 8) | bin_data[i]
        else:
            leftchar <<= 8
        leftbits += 8
        while leftbits >= 6:
            this_ch = (leftchar >> (leftbits - 6)) & 0x3F
            leftbits -= 6
            if backtick and not this_ch:
                out.append(96)
            else:
                out.append(this_ch + 32)
        leftchar &= (1 << leftbits) - 1
        bin_len -= 1
        i += 1
    out.append(10)
    return bytes(out)


# --- base64 ------------------------------------------------------------------

def a2b_base64(data, /, *, strict_mode=False):
    ascii_data = _ascii_buffer(data)
    strict_mode = bool(strict_mode)
    table = _A2B_BASE64
    out = bytearray()
    quad_pos = 0
    leftchar = 0
    pads = 0
    i = 0
    ascii_len = len(ascii_data)
    while i < ascii_len:
        this_ch = ascii_data[i]
        if this_ch == 61:
            # C:405.  Pads after two or three data characters complete the
            # quad; any others are ignored unless strict_mode.
            pads += 1
            if quad_pos >= 2 and quad_pos + pads <= 4:
                i += 1
                continue
            if not strict_mode:
                i += 1
                continue
            if quad_pos == 1:
                break
            if quad_pos == 0 and i == 0:
                raise Error("Leading padding not allowed")
            raise Error("Excess padding not allowed")
        value = table[this_ch]
        if value >= 64:
            if strict_mode:
                raise Error("Only base64 data is allowed")
            i += 1
            continue
        if pads and strict_mode:
            if quad_pos + pads == 4:
                raise Error("Excess data after padding")
            raise Error("Discontinuous padding not allowed")
        pads = 0
        if quad_pos == 0:
            quad_pos = 1
            leftchar = value
        elif quad_pos == 1:
            quad_pos = 2
            out.append(((leftchar << 2) | (value >> 4)) & 0xFF)
            leftchar = value & 0x0F
        elif quad_pos == 2:
            quad_pos = 3
            out.append(((leftchar << 4) | (value >> 2)) & 0xFF)
            leftchar = value & 0x03
        else:
            quad_pos = 0
            out.append(((leftchar << 6) | value) & 0xFF)
            leftchar = 0
        i += 1
    if quad_pos == 1:
        # One data character past a whole number of quads: no input could
        # encode to that.  The count is of data characters, not input bytes.
        raise Error("Invalid base64-encoded string: number of data "
                    "characters (%d) cannot be 1 more than a multiple of 4"
                    % (len(out) // 3 * 4 + 1))
    if quad_pos != 0 and quad_pos + pads < 4:
        raise Error("Incorrect padding")
    return bytes(out)


# Assigned, not written as a docstring: a docstring whose every later line is
# indented would be dedented by the compiler (3.13+).
a2b_base64.__doc__ = (
    "Decode a line of base64 data.\n"
    "\n"
    "  strict_mode\n"
    "    When set to True, bytes that are not part of the base64 standard "
    "are not allowed.\n"
    "    The same applies to excess data after padding (= / ==).")


def b2a_base64(data, /, *, newline=True):
    """Base64-code line of data."""
    bin_data = _buffer(data)
    newline = bool(newline)
    bin_len = len(bin_data)
    if bin_len > _BASE64_MAXBIN:
        raise Error("Too much data for base64 line")
    table = _B2A_BASE64
    out = bytearray()
    whole = bin_len - bin_len % 3
    i = 0
    while i < whole:
        word = (bin_data[i] << 16) | (bin_data[i + 1] << 8) | bin_data[i + 2]
        out.append(table[word >> 18])
        out.append(table[(word >> 12) & 0x3F])
        out.append(table[(word >> 6) & 0x3F])
        out.append(table[word & 0x3F])
        i += 3
    rest = bin_len - whole
    if rest == 1:
        byte = bin_data[i]
        out.append(table[byte >> 2])
        out.append(table[(byte & 0x03) << 4])
        out.append(61)
        out.append(61)
    elif rest == 2:
        word = (bin_data[i] << 8) | bin_data[i + 1]
        out.append(table[word >> 10])
        out.append(table[(word >> 4) & 0x3F])
        out.append(table[(word & 0x0F) << 2])
        out.append(61)
    if newline:
        out.append(10)
    return bytes(out)


# --- CRCs --------------------------------------------------------------------

def crc_hqx(data, crc, /):
    """Compute CRC-CCITT incrementally."""
    bin_data = _buffer(data)
    crc = _unsigned_int_mask(crc) & 0xFFFF
    table = _CRCTAB_HQX
    for byte in bin_data:
        crc = ((crc << 8) & 0xFF00) ^ table[(crc >> 8) ^ byte]
    return crc


def crc32(data, crc=0, /):
    """Compute CRC-32 incrementally."""
    bin_data = _buffer(data)
    crc = _unsigned_int_mask(crc) ^ 0xFFFFFFFF
    table = _CRC_32_TAB
    for byte in bin_data:
        crc = table[(crc ^ byte) & 0xFF] ^ (crc >> 8)
    return crc ^ 0xFFFFFFFF


# --- hex ---------------------------------------------------------------------

def _strhex(argbuf, sep, bytes_per_sep_group):
    """_Py_strhex_impl with return_bytes set (Python/pystrhex.c)."""
    sep_char = 0
    if sep is not _NO_SEP:
        if len(sep) != 1:
            raise ValueError("sep must be length 1.")
        if isinstance(sep, str):
            sep_char = ord(sep[0])
            if sep_char > 0xFF:
                # Not a 1-byte-kind string.  Latin-1 separators above 127
                # are accepted, because the result is bytes.
                raise ValueError("sep must be ASCII.")
        elif isinstance(sep, bytes):
            sep_char = sep[0]
        else:
            raise TypeError("sep must be str or bytes.")
    else:
        bytes_per_sep_group = 0
    arglen = len(argbuf)
    group = abs(bytes_per_sep_group)
    pairs = _HEX_PAIRS
    out = bytearray()
    if group == 0 or group >= arglen:
        for c in argbuf:
            out += pairs[c]
        return bytes(out)
    chunks = (arglen - 1) // group
    if bytes_per_sep_group < 0:
        # Count groups from the left: the short group, if any, is last.
        i = 0
        for _ in range(chunks):
            for c in argbuf[i:i + group]:
                out += pairs[c]
            out.append(sep_char)
            i += group
        for c in argbuf[i:]:
            out += pairs[c]
    else:
        # Count groups from the right: the short group, if any, is first.
        i = arglen - chunks * group
        for c in argbuf[:i]:
            out += pairs[c]
        for _ in range(chunks):
            out.append(sep_char)
            for c in argbuf[i:i + group]:
                out += pairs[c]
            i += group
    return bytes(out)


def b2a_hex(data, sep=_NO_SEP, bytes_per_sep=1):
    r"""Hexadecimal representation of binary data.

  sep
    An optional single character or byte to separate hex bytes.
  bytes_per_sep
    How many bytes between separators.  Positive values count from the
    right, negative values count from the left.

The return value is a bytes object.  This function is also
available as "hexlify()".

Example:
>>> binascii.b2a_hex(b'\xb9\x01\xef')
b'b901ef'
>>> binascii.hexlify(b'\xb9\x01\xef', ':')
b'b9:01:ef'
>>> binascii.b2a_hex(b'\xb9\x01\xef', b'_', 2)
b'b9_01ef'"""
    argbuf = _buffer(data)
    return _strhex(argbuf, sep, _c_int(bytes_per_sep))


def hexlify(data, sep=_NO_SEP, bytes_per_sep=1):
    """Hexadecimal representation of binary data.

  sep
    An optional single character or byte to separate hex bytes.
  bytes_per_sep
    How many bytes between separators.  Positive values count from the
    right, negative values count from the left.

The return value is a bytes object.  This function is also
available as "b2a_hex()"."""
    argbuf = _buffer(data)
    return _strhex(argbuf, sep, _c_int(bytes_per_sep))


def _a2b_hex(argbuf):
    arglen = len(argbuf)
    if arglen % 2:
        raise Error("Odd-length string")
    digit_value = _DIGIT_VALUE
    out = bytearray()
    i = 0
    while i < arglen:
        top = digit_value[argbuf[i]]
        bot = digit_value[argbuf[i + 1]]
        if top >= 16 or bot >= 16:
            raise Error("Non-hexadecimal digit found")
        out.append((top << 4) + bot)
        i += 2
    return bytes(out)


def a2b_hex(hexstr, /):
    """Binary data of hexadecimal representation.

hexstr must contain an even number of hex digits (upper or lower case).
This function is also available as "unhexlify()"."""
    return _a2b_hex(_ascii_buffer(hexstr))


def unhexlify(hexstr, /):
    """Binary data of hexadecimal representation.

hexstr must contain an even number of hex digits (upper or lower case)."""
    return _a2b_hex(_ascii_buffer(hexstr))


# --- quoted-printable --------------------------------------------------------

def a2b_qp(data, header=False):
    """Decode a string of qp-encoded data."""
    ascii_data = _ascii_buffer(data)
    header = bool(header)
    digit_value = _DIGIT_VALUE
    datalen = len(ascii_data)
    out = bytearray()
    i = 0
    while i < datalen:
        c = ascii_data[i]
        if c == 61:
            i += 1
            if i >= datalen:
                break
            c = ascii_data[i]
            if c == 10 or c == 13:
                # Soft line break; a CR skips to the next LF (C:990).
                if c != 10:
                    while i < datalen and ascii_data[i] != 10:
                        i += 1
                if i < datalen:
                    i += 1
            elif c == 61:
                # "==" from broken Python qp encoders.
                out.append(61)
                i += 1
            elif (i + 1 < datalen and digit_value[c] < 16
                    and digit_value[ascii_data[i + 1]] < 16):
                out.append((digit_value[c] << 4) | digit_value[ascii_data[i + 1]])
                i += 2
            else:
                # Keep the '='; what follows is decoded as ordinary input.
                out.append(61)
        elif header and c == 95:
            out.append(32)
            i += 1
        else:
            out.append(c)
            i += 1
    return bytes(out)


def _qp_soft_break(out, crlf):
    out.append(61)
    if crlf:
        out.append(13)
    out.append(10)


def b2a_qp(data, quotetabs=False, istext=True, header=False):
    r"""Encode a string using quoted-printable encoding.

On encoding, when istext is set, newlines are not encoded, and white
space at end of lines is.  When istext is not set, \r and \n (CR/LF)
are both encoded.  When quotetabs is set, space and tabs are encoded."""
    databuf = _buffer(data)
    quotetabs = bool(quotetabs)
    istext = bool(istext)
    header = bool(header)
    datalen = len(databuf)
    hex_upper = _HEX_UPPER

    # The first LF decides the line ending of the whole output (C:1086).
    p = databuf.find(b"\n")
    crlf = p > 0 and databuf[p - 1] == 13

    # Only the C's second (encoding) pass is ported; its first pass just
    # sizes the output buffer.
    out = bytearray()
    linelen = 0
    i = 0
    while i < datalen:
        c = databuf[i]
        if (c > 126
                or c == 61
                or (header and c == 95)
                or (c == 46 and linelen == 0
                    and (i + 1 == datalen or databuf[i + 1] == 10
                         or databuf[i + 1] == 13 or databuf[i + 1] == 0))
                or (not istext and (c == 13 or c == 10))
                or ((c == 9 or c == 32) and i + 1 == datalen)
                or (c < 33 and c != 13 and c != 10
                    and (quotetabs or (c != 9 and c != 32)))):
            if linelen + 3 >= _MAXLINESIZE:
                _qp_soft_break(out, crlf)
                linelen = 0
            out.append(61)
            out.append(hex_upper[c >> 4])
            out.append(hex_upper[c & 15])
            i += 1
            linelen += 3
        elif istext and (c == 10 or (i + 1 < datalen and c == 13
                                     and databuf[i + 1] == 10)):
            linelen = 0
            # Protect whitespace at end of line: re-encode the last OUTPUT
            # byte (C:1200), which is not always the last input byte.
            if out and (out[-1] == 32 or out[-1] == 9):
                ch = out[-1]
                out[-1] = 61
                out.append(hex_upper[ch >> 4])
                out.append(hex_upper[ch & 15])
            if crlf:
                out.append(13)
            out.append(10)
            if c == 13:
                i += 2
            else:
                i += 1
        else:
            if (i + 1 != datalen and databuf[i + 1] != 10
                    and linelen + 1 >= _MAXLINESIZE):
                _qp_soft_break(out, crlf)
                linelen = 0
            linelen += 1
            if header and c == 32:
                out.append(95)
            else:
                out.append(c)
            i += 1
    return bytes(out)
