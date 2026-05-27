# Grail werkzeug.utils — minimal hand-rolled shim.
#
# Upstream werkzeug/utils.py is ~700 lines covering cached_property,
# header_property, environ_property, redirect, secure_filename,
# escape, append_slash_redirect, send_file, send_from_directory,
# import_string, find_modules.  Several of those depend on
# **kwargs unpacking at call sites or on full descriptor support
# that Grail doesn't have yet.
#
# Routing imports only ``cached_property'' and ``redirect''.  Other
# call sites get added back as downstream modules ask for them.


class cached_property:
    """Decorator that converts a method into a lazy property.  First
    access invokes the method and stashes the value on the instance;
    subsequent accesses read the cached value.

    Grail-rolled because the upstream class inherits from
    ``property'' + a typing.Generic which doesn't yet round-trip.
    Functional equivalent — wraps a function and behaves as a
    descriptor (the descriptor protocol isn't fully wired in Grail
    yet, so callers access via direct method invocation rather than
    bare attribute read; sufficient for the Werkzeug routing path
    that uses cached_property on internal RoutingException helpers
    that don't get accessed via the descriptor at all)."""

    def __init__(self, func, name=None, doc=None):
        self.func = func
        self.__name__ = name or func.__name__
        self.__doc__ = doc

    def __get__(self, instance, owner=None):
        if instance is None:
            return self
        value = self.func(instance)
        setattr(instance, self.__name__, value)
        return value


def redirect(location, code=302, Response=None):
    """Return a Response that redirects to ``location''.  Grail
    stub builds a minimal HTML response with a Location header."""
    from werkzeug.wrappers import Response as _Response
    cls = Response or _Response
    body = (
        '<!DOCTYPE HTML>\n'
        '<html>\n'
        '<head><title>Redirecting...</title></head>\n'
        '<body><h1>Redirecting...</h1>'
        '<p>You should be redirected to <a href="' + location + '">'
        + location + '</a>.</p></body>\n'
        '</html>'
    )
    return cls(body, status=code, headers=[('Location', location)])


class header_property:
    """Stub class — upstream is ``class header_property(_DictAccessorProperty[T])''.
    Grail keeps the name as a callable class (not a function) so that
    upstream class-body subscript patterns like
    ``header_property[str](...)'' don't blow up on
    ``__getitem__:'' over a BoundMethod-wrapped function.

    Real descriptor behaviour is not implemented — instances just
    carry the bound name."""

    def __init__(self, name, default=None, load_func=None, dump_func=None,
                 doc=None, read_only=False):
        self.name = name
        self.default = default
        self.load_func = load_func
        self.dump_func = dump_func
        self.__doc__ = doc
        self.read_only = read_only

    def __class_getitem__(cls, item):
        """PEP 560 subscript — ``header_property[str]'' returns the
        class itself so the result is still callable for the
        constructor invocation that follows."""
        return cls


class environ_property:
    """Stub class — mirror of ``header_property'' for WSGI environ."""

    def __init__(self, name, default=None, load_func=None, dump_func=None,
                 read_only=True, doc=None):
        self.name = name
        self.default = default
        self.load_func = load_func
        self.dump_func = dump_func
        self.read_only = read_only
        self.__doc__ = doc

    def __class_getitem__(cls, item):
        return cls


class PropertyDescriptor:
    """Legacy sentinel kept for callers that imported it from the
    old function-based shim — header_property / environ_property
    are now real classes."""

    def __init__(self, name=None):
        self.name = name


def import_string(import_name, silent=False):
    """``import_string('module.attr')'' — import a module by name and
    return the named attribute (or the module itself if no attr).  Grail
    falls back to ``__import__'' + ``getattr''."""
    if ':' in import_name:
        module, _, attr = import_name.partition(':')
    elif '.' in import_name:
        module, _, attr = import_name.rpartition('.')
    else:
        module = import_name
        attr = None
    try:
        m = __import__(module, None, None, [attr] if attr else [])
        if attr is None:
            return m
        return getattr(m, attr)
    except (ImportError, AttributeError):
        if silent:
            return None
        raise


def find_modules(import_path, include_packages=False, recursive=False):
    """Stub — Grail has no filesystem-walking pkgutil yet.  Returns
    an empty iterator so callers that auto-discover via this still
    iterate safely (just over nothing)."""
    return iter([])


_charset_mimetypes = {
    'application/ecmascript',
    'application/javascript',
    'application/sql',
    'application/xml',
    'application/xml-dtd',
    'application/xml-external-parsed-entity',
}


def get_content_type(mimetype, charset):
    """Return the full Content-Type string with charset appended for
    text mimetypes.  werkzeug.test uses this when synthesizing the
    multipart Content-Type header for EnvironBuilder POSTs."""
    if (mimetype.startswith('text/')
            or mimetype in _charset_mimetypes
            or mimetype.endswith('+xml')):
        return mimetype + '; charset=' + charset
    return mimetype
