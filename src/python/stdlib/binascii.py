# Grail binascii, added to as callers surface.
#
# It began as a stub for one thing: Werkzeug catches ``binascii.Error''
# alongside UnicodeError when base64-decoding an ``Authorization: Basic …''
# header.  base64, hexlify and crc32 followed; the uu pair and hexlify's
# separator arrived with the bytes-to-bytes transform codecs, which are
# thin wrappers over exactly these.
#
# ``b2a_qp'' / ``a2b_qp'' are still absent, and that is deliberate:
# ``quopri'' imports them, falls back to its own pure Python when the
# import fails, and works.  Adding them would move a working module onto
# an untested path, so they belong with quopri's own tests, not here.


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
    """Hex-encode a bytes-like.

    ``sep`` groups the output: a POSITIVE bytes_per_sep groups from the
    RIGHT (so a run of digits keeps its low-order grouping when the length
    is not a multiple), a negative one from the left, and zero separates
    nothing.  CPython's rule, and the reason the two directions are not
    just a reversed loop."""
    data = bytes(data)
    digits = []
    for b in data:
        digits.append(_HEX[b >> 4])
        digits.append(_HEX[b & 0x0F])
    hexed = "".join(digits)
    if sep is None:
        return hexed.encode("ascii")
    if isinstance(sep, (bytes, bytearray)):
        sep = sep.decode("ascii")
    if len(sep) != 1:
        raise ValueError("sep must be length 1.")
    if bytes_per_sep == 0 or not data:
        return hexed.encode("ascii")
    chunks = []
    if bytes_per_sep > 0:
        end = len(data)
        while end > 0:
            start = end - bytes_per_sep
            if start < 0:
                start = 0
            chunks.append(hexed[start * 2:end * 2])
            end = start
        chunks.reverse()
    else:
        step = -bytes_per_sep
        start = 0
        while start < len(data):
            chunks.append(hexed[start * 2:(start + step) * 2])
            start += step
    return sep.join(chunks).encode("ascii")


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


b2a_hex = hexlify
a2b_hex = unhexlify


def b2a_uu(data, *, backtick=False):
    """One uuencoded LINE, newline included: a length byte followed by
    the data in 6-bit groups, each biased by 32 so it lands in printable
    ASCII.  A zero group is a space, or a backtick when asked -- the
    spelling that survives a mail gateway that eats trailing spaces."""
    data = bytes(data)
    if len(data) > 45:
        raise Error("At most 45 bytes at once")
    zero = "`" if backtick else " "

    def sixbit(n):
        n = n & 0x3F
        return zero if n == 0 else chr(n + 32)

    out = [sixbit(len(data))]
    padding = (3 - len(data) % 3) % 3
    padded = data + b"\x00" * padding
    i = 0
    while i < len(padded):
        word = (padded[i] << 16) | (padded[i + 1] << 8) | padded[i + 2]
        out.append(sixbit(word >> 18))
        out.append(sixbit(word >> 12))
        out.append(sixbit(word >> 6))
        out.append(sixbit(word))
        i += 3
    out.append("\n")
    return "".join(out).encode("ascii")


def a2b_uu(data):
    """The inverse.  The length byte governs: the 6-bit groups always
    decode in threes, and the result is TRUNCATED to the declared length,
    which is how a line whose data is not a multiple of three round-trips
    at all."""
    if isinstance(data, str):
        data = data.encode("ascii")
    data = bytes(data)
    if not data:
        raise Error("Missing length byte")
    nbytes = (data[0] - 32) & 0x3F
    body = data[1:]
    while body and body[-1:] in (b"\n", b"\r"):
        body = body[:-1]
    remainder = len(body) % 4
    if remainder:
        body = body + b" " * (4 - remainder)
    out = bytearray()
    i = 0
    while i < len(body):
        word = (((body[i] - 32) & 0x3F) << 18) \
            | (((body[i + 1] - 32) & 0x3F) << 12) \
            | (((body[i + 2] - 32) & 0x3F) << 6) \
            | ((body[i + 3] - 32) & 0x3F)
        out.append((word >> 16) & 0xFF)
        out.append((word >> 8) & 0xFF)
        out.append(word & 0xFF)
        i += 4
    if len(out) < nbytes:
        out.extend(b"\x00" * (nbytes - len(out)))
    return bytes(out[:nbytes])


def crc32(data, value=0):
    import zlib
    return zlib.crc32(data, value)
