# Grail binascii stub.
#
# Werkzeug uses this only for the ``binascii.Error'' exception class
# (caught alongside UnicodeError when base64-decoding the
# ``Authorization: Basic …'' header).  Real CPython binascii also
# exposes ``b2a_base64'' / ``a2b_base64'' / ``hexlify'' / ``unhexlify''
# / CRCs — add as callers surface.


class Error(ValueError):
    """Raised on a malformed base64 / hex input.  Subclasses
    ValueError to match CPython."""
    pass


Incomplete = Error


_HEX = "0123456789abcdef"


def b2a_base64(data, *, newline=True):
    """Base64-encode a bytes-like; trailing newline per CPython."""
    import base64
    out = base64.b64encode(bytes(data))
    if newline:
        out = out + b"\n"
    return out


def a2b_base64(data, *, strict_mode=False):
    """Decode base64 input (str or bytes).  Non-alphabet characters
    are ignored unless strict_mode, matching CPython."""
    import base64
    if isinstance(data, str):
        data = data.encode("ascii")
    if not strict_mode:
        cleaned = []
        for b in data:
            ch = chr(b)
            if ch.isalnum() or ch in "+/=":
                cleaned.append(b)
        data = bytes(cleaned)
    try:
        return base64.b64decode(data)
    except ValueError as exc:
        raise Error(str(exc))


def hexlify(data, sep=None, bytes_per_sep=1):
    result = []
    for b in bytes(data):
        result.append(_HEX[b >> 4])
        result.append(_HEX[b & 0x0F])
    if sep is not None:
        raise NotImplementedError("hexlify sep argument is not supported in Grail")
    return "".join(result).encode("ascii")


def unhexlify(hexstr):
    if isinstance(hexstr, (bytes, bytearray)):
        hexstr = hexstr.decode("ascii")
    if len(hexstr) % 2:
        raise Error("Odd-length string")
    out = []
    i = 0
    while i < len(hexstr):
        try:
            out.append(int(hexstr[i:i + 2], 16))
        except ValueError:
            raise Error("Non-hexadecimal digit found")
        i += 2
    return bytes(out)


def crc32(data, value=0):
    import zlib
    return zlib.crc32(data, value)
