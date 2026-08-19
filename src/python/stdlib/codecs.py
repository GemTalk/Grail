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
# Bigger codecs API (encode/decode functions, IncrementalEncoder,
# BOM constants, StreamReader/Writer) is not yet needed — add as
# callers surface.  IncrementalDecoder HAS surfaced: _pyio subclasses
# it at module level (``class IncrementalNewlineDecoder'') so the
# vendored io stack cannot import without it.  It is copied VERBATIM
# from CPython 3.14.6 codecs.py rather than approximated, since it is
# a pure base class with no codec-registry dependency of its own.


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


class IncrementalDecoder(object):
    """
    An IncrementalDecoder decodes an input in multiple steps. The input can
    be passed piece by piece to the decode() method. The IncrementalDecoder
    remembers the state of the decoding process between calls to decode().
    """
    def __init__(self, errors='strict'):
        """
        Create an IncrementalDecoder instance.

        The IncrementalDecoder may use different error handling schemes by
        providing the errors keyword argument. See the module docstring
        for a list of possible values.
        """
        self.errors = errors

    def decode(self, input, final=False):
        """
        Decode input and returns the resulting object.
        """
        raise NotImplementedError

    def reset(self):
        """
        Reset the decoder to the initial state.
        """

    def getstate(self):
        """
        Return the current state of the decoder.

        This must be a (buffered_input, additional_state_info) tuple.
        buffered_input must be a bytes object containing bytes that
        were passed to decode() that have not yet been converted.
        additional_state_info must be a non-negative integer
        representing the state of the decoder WITHOUT yet having
        processed the contents of buffered_input.  In the initial state
        and after reset(), getstate() must return (b"", 0).
        """
        return (b"", 0)

    def setstate(self, state):
        """
        Set the current state of the decoder.

        state must have been returned by getstate().  The effect of
        setstate((b"", 0)) must be equivalent to reset().
        """
