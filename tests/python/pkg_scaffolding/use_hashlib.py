# Exercises Grail's hashlib module — Smalltalk-backed wrapper over
# GemStone's ByteArray hash primitives.

import hashlib


def sha256_of(data):
    h = hashlib.sha256(data)
    return h.hexdigest()


def md5_of(data):
    return hashlib.md5(data).hexdigest()


def streamed_sha256(parts):
    """Build up a sha256 across multiple updates — matches the
    streaming idiom used by HMAC and incremental APIs."""
    h = hashlib.sha256()
    for part in parts:
        h.update(part)
    return h.hexdigest()


def block_sizes():
    return (
        hashlib.md5().block_size,
        hashlib.sha256().block_size,
        hashlib.sha512().block_size,
    )


def digest_sizes():
    return (
        hashlib.md5().digest_size,
        hashlib.sha256().digest_size,
        hashlib.sha512().digest_size,
    )


def by_name():
    """``hashlib.new(name)`` should round-trip the same digest."""
    return hashlib.new('sha256', b'hello').hexdigest()
