# Grail codecs stub.
#
# Werkzeug imports this for two reasons:
#
#   1. urls.py calls ``codecs.register_error(name, fn)'' at import
#      time to install a percent-quote error handler for the
#      ``werkzeug.url_quote'' error name.  Grail's str.encode /
#      bytes.decode don't honor the ``errors'' policy yet (any
#      passed-in name is ignored), so the registration is a no-op —
#      but the call must succeed for the module to import.
#
#   2. datastructures/accept.py calls ``codecs.lookup(name)'' inside
#      CharsetAccept to normalize charset names against the codec
#      registry.  Werkzeug wraps the call in
#      ``try: ... except LookupError: name.lower()'', so a stub
#      that always raises LookupError works fine — the fallback
#      path runs.
#
# Bigger codecs API (encode/decode functions, IncrementalEncoder/
# Decoder, BOM constants, StreamReader/Writer) is not yet needed —
# add as callers surface.


_error_handlers = {}


class CodecInfo:
    """Minimal struct returned by lookup().  Real CPython exposes
    encode, decode, streamreader, streamwriter callables plus the
    name; werkzeug only reads ``.name'' so the rest is omitted."""

    def __init__(self, name):
        self.name = name


def lookup(encoding):
    """Look up a codec by name.  Grail has no real codec registry, so
    every lookup raises LookupError — werkzeug's CharsetAccept catches
    this and falls back to ``name.lower()'', which is fine for the
    practical purpose of normalizing charset names."""
    raise LookupError('unknown encoding: ' + str(encoding))


def register_error(name, handler):
    """Register a Unicode error-handling callback.  Grail's
    str.encode / bytes.decode ignore the ``errors'' policy, so
    registered handlers never fire — but the registration call must
    succeed for werkzeug.urls to import at module-load time."""
    _error_handlers[name] = handler


def lookup_error(name):
    """Symmetric companion to register_error — returns the registered
    handler or raises LookupError per CPython."""
    if name in _error_handlers:
        return _error_handlers[name]
    raise LookupError('unknown error handler name ' + repr(name))
