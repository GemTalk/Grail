# Grail's hmac module — minimal pure-Python implementation on top of
# hashlib.  Covers itsdangerous / Werkzeug needs: HMAC class with
# update/digest/hexdigest/copy, new() factory, single-shot digest(),
# and compare_digest() constant-time comparison.
#
# Deviations from CPython:
#   * digestmod is required (no default ''); pass a string name or a
#     hashlib factory function.
#   * No support for hmac.HMAC.block_size / digest_size as constants —
#     these come from the underlying hash.

import hashlib as _hashlib


# Padding constants — ipad XOR'd into the inner key, opad into the outer.
trans_5C = bytes(x ^ 0x5C for x in range(256))
trans_36 = bytes(x ^ 0x36 for x in range(256))


class HMAC:
    """Hash-based Message Authentication Code (RFC 2104)."""

    def __init__(self, key, msg=None, digestmod=None):
        if digestmod is None:
            raise TypeError('Missing required argument: digestmod')
        if isinstance(digestmod, str):
            make = lambda: _hashlib.new(digestmod)
        elif callable(digestmod):
            make = digestmod
        else:
            # A pre-built hash object — use its algorithm name.
            make = lambda: _hashlib.new(digestmod.name)
        self._inner = make()
        self._outer = make()
        blocksize = self._inner.block_size
        if len(key) > blocksize:
            shrink = make()
            shrink.update(key)
            key = shrink.digest()
        if len(key) < blocksize:
            key = key + bytes(blocksize - len(key))
        self._outer.update(key.translate(trans_5C))
        self._inner.update(key.translate(trans_36))
        if msg is not None:
            self.update(msg)

    @property
    def name(self):
        return 'hmac-' + self._inner.name

    @property
    def digest_size(self):
        return self._inner.digest_size

    @property
    def block_size(self):
        return self._inner.block_size

    def update(self, msg):
        self._inner.update(msg)

    def digest(self):
        h = self._outer.copy()
        h.update(self._inner.digest())
        return h.digest()

    def hexdigest(self):
        return self.digest().hex()

    def copy(self):
        other = HMAC.__new__(HMAC)
        other._inner = self._inner.copy()
        other._outer = self._outer.copy()
        return other


def new(key, msg=None, digestmod=None):
    """``new(key, msg, digestmod) -> HMAC`` — construct an HMAC instance."""
    return HMAC(key, msg, digestmod)


def digest(key, msg, digest):
    """Single-shot HMAC: ``digest(key, msg, 'sha256')`` returns the
    digest bytes directly."""
    return new(key, msg, digest).digest()


def compare_digest(a, b):
    """Constant-time comparison.  Returns True iff a == b; takes time
    proportional to len(a) regardless of where mismatches fall, to
    avoid timing-leak side channels in MAC verification."""
    if len(a) != len(b):
        return False
    result = 0
    for x, y in zip(a, b):
        result |= x ^ y
    return result == 0
