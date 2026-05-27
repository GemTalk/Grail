# Grail uuid stdlib stub.
#
# CPython's uuid is a substantial module (~700 lines, RFC 4122
# variants, MAC-derived UUID1, namespace-derived UUID3/5, random
# UUID4).  Werkzeug only uses ``uuid.UUID(hex_string)'' for its
# ``UUIDConverter'' in routing — accepts a string, returns a
# UUID object, raises ValueError on bad input.  Stub provides
# just that surface.


_HEX = '0123456789abcdefABCDEF'


class UUID:
    """Minimal UUID representation — stores the canonical hex form
    and exposes ``__str__`` / ``__repr__`` / ``hex`` / ``__eq__''.
    Werkzeug only needs round-trip identity, not the full bit-
    field accessors (fields / int / bytes / version / variant)."""

    def __init__(self, hex=None, bytes=None, version=None):
        if hex is None and bytes is None:
            raise TypeError('UUID() requires hex= or bytes=')
        if hex is not None:
            # Strip hyphens, braces, urn prefix.
            h = hex.strip().lower()
            if h.startswith('urn:uuid:'):
                h = h[9:]
            h = h.replace('-', '').replace('{', '').replace('}', '')
            if len(h) != 32:
                raise ValueError('badly formed hexadecimal UUID string')
            for c in h:
                if c not in _HEX:
                    raise ValueError('badly formed hexadecimal UUID string')
            self._hex = h
        else:
            if len(bytes) != 16:
                raise ValueError('bytes is not a 16-byte string')
            # Build hex from bytes manually.
            parts = []
            for b in bytes:
                parts.append('%02x' % b)
            self._hex = ''.join(parts)

    @property
    def hex(self):
        return self._hex

    def __str__(self):
        h = self._hex
        return (h[0:8] + '-' + h[8:12] + '-' + h[12:16]
                + '-' + h[16:20] + '-' + h[20:32])

    def __repr__(self):
        return "UUID('" + str(self) + "')"

    def __eq__(self, other):
        if isinstance(other, UUID):
            return self._hex == other._hex
        return NotImplemented

    def __hash__(self):
        return hash(self._hex)


def uuid4():
    """Random UUID — Grail uses a deterministic counter for now.
    Not cryptographically random; sufficient for routing tests."""
    import time
    counter = int(time.time() * 1000000)
    h = '%032x' % counter
    return UUID(hex=h[-32:].zfill(32))
