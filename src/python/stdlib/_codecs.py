# The `_codecs` accelerator module.
#
# CPython's pickle names ``_codecs.encode`` as the reconstructor for bytes
# under protocols 0-2, which have no bytes opcode: b'abc' is pickled as
# ``_codecs.encode('abc', 'latin1')``.  Both directions of that need the module
# to exist under this exact name -- emitting it keeps Grail byte-compatible
# with CPython, and resolving it lets Grail LOAD any protocol 0-2 pickle
# containing bytes, which real CPython produces routinely.
#
# Only encode/decode are provided; the rest of the C accelerator's surface
# (register, lookup, the per-codec entry points) is not used by pickle and the
# pure-Python `codecs` module is the place to grow it if something needs it.


def encode(obj, encoding='utf-8', errors='strict'):
    """codecs.encode(obj, encoding, errors) -> bytes."""
    try:
        return obj.encode(encoding, errors)
    except TypeError:
        # Grail's str.encode does not always accept the errors argument.
        return obj.encode(encoding)


def decode(obj, encoding='utf-8', errors='strict'):
    """codecs.decode(obj, encoding, errors) -> str."""
    try:
        return obj.decode(encoding, errors)
    except TypeError:
        return obj.decode(encoding)
