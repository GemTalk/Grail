# Grail's base64 module — minimal pure-Python implementation of
# the Base64 / URL-safe Base64 codecs.  CPython's base64.py is much
# larger (covers Base32, Base16, Base85, ASCII-85, the legacy
# encodebytes/decodebytes wrappers).  Add those on demand; Flask and
# itsdangerous only touch the standard b64 forms.
#
# Implementation note: accumulates output bytes in a list rather than
# a bytearray.  Grail's ``bytes(bytearray)`` constructor currently
# returns an empty bytes regardless of the bytearray's contents;
# ``bytes(list_of_ints)`` works correctly and is what we use to
# materialize the final result.

# Standard Base64 alphabet (RFC 4648 §4).
_B64_ALPHA = b'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
_URLSAFE_ALPHA = b'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'


def _build_decode_table(alpha):
    table = [-1] * 256
    i = 0
    n = len(alpha)
    while i < n:
        c = alpha[i]
        table[c] = i
        i = i + 1
    return table


_B64_DECODE = _build_decode_table(_B64_ALPHA)
_URLSAFE_DECODE = _build_decode_table(_URLSAFE_ALPHA)


def _encode(data, alpha):
    """Encode bytes ``data`` using ``alpha`` (the 64-char alphabet).
    Pads the output with '=' so length is a multiple of 4."""
    out = []
    n = len(data)
    i = 0
    while i + 3 <= n:
        b0 = data[i]
        b1 = data[i + 1]
        b2 = data[i + 2]
        out.append(alpha[b0 >> 2])
        out.append(alpha[((b0 & 0x03) << 4) | (b1 >> 4)])
        out.append(alpha[((b1 & 0x0F) << 2) | (b2 >> 6)])
        out.append(alpha[b2 & 0x3F])
        i = i + 3
    rem = n - i
    if rem == 1:
        b0 = data[i]
        out.append(alpha[b0 >> 2])
        out.append(alpha[(b0 & 0x03) << 4])
        out.append(61)
        out.append(61)
    elif rem == 2:
        b0 = data[i]
        b1 = data[i + 1]
        out.append(alpha[b0 >> 2])
        out.append(alpha[((b0 & 0x03) << 4) | (b1 >> 4)])
        out.append(alpha[(b1 & 0x0F) << 2])
        out.append(61)
    return bytes(out)


def _decode(data, table):
    """Decode base64 ``data`` (bytes or str) using ``table`` (256-byte
    reverse alphabet, -1 for invalid)."""
    if isinstance(data, str):
        data = data.encode('ascii')
    n = len(data)
    while n > 0 and data[n - 1] == 61:
        n = n - 1
    out = []
    i = 0
    while i + 4 <= n:
        c0 = table[data[i]]
        c1 = table[data[i + 1]]
        c2 = table[data[i + 2]]
        c3 = table[data[i + 3]]
        if c0 < 0 or c1 < 0 or c2 < 0 or c3 < 0:
            raise ValueError('invalid base64 character')
        out.append((c0 << 2) | (c1 >> 4))
        out.append(((c1 & 0x0F) << 4) | (c2 >> 2))
        out.append(((c2 & 0x03) << 6) | c3)
        i = i + 4
    tail = n - i
    if tail == 2:
        c0 = table[data[i]]
        c1 = table[data[i + 1]]
        if c0 < 0 or c1 < 0:
            raise ValueError('invalid base64 character')
        out.append((c0 << 2) | (c1 >> 4))
    elif tail == 3:
        c0 = table[data[i]]
        c1 = table[data[i + 1]]
        c2 = table[data[i + 2]]
        if c0 < 0 or c1 < 0 or c2 < 0:
            raise ValueError('invalid base64 character')
        out.append((c0 << 2) | (c1 >> 4))
        out.append(((c1 & 0x0F) << 4) | (c2 >> 2))
    elif tail == 1:
        raise ValueError('invalid base64 input length')
    return bytes(out)


def b64encode(data, altchars=None):
    """Encode bytes-like ``data`` to a standard Base64 bytes string."""
    return _encode(data, _B64_ALPHA)


def b64decode(data, altchars=None, validate=False):
    """Decode a standard Base64 bytes/str to bytes.  ``validate`` is
    accepted for CPython API parity but ignored."""
    return _decode(data, _B64_DECODE)


def urlsafe_b64encode(data):
    """URL-safe variant: ``+`` and ``/`` replaced by ``-`` and ``_``."""
    return _encode(data, _URLSAFE_ALPHA)


def urlsafe_b64decode(data):
    return _decode(data, _URLSAFE_DECODE)


def standard_b64encode(data):
    return b64encode(data)


def standard_b64decode(data):
    return b64decode(data)


def encodebytes(s):
    """Encode with the legacy MIME line discipline: 76-char lines,
    trailing newline (what email.base64mime feeds body_encode)."""
    encoded = b64encode(s)
    pieces = []
    i = 0
    while i < len(encoded):
        pieces.append(encoded[i:i + 76])
        i += 76
    return b"\n".join(pieces) + b"\n" if pieces else b"\n"


def decodebytes(s):
    return b64decode(s)
