# Grail werkzeug.exceptions — hand-rolled shim.
#
# Hand-rolled rather than source-dropped because the upstream
# exceptions.py runs ``_find_exceptions()'' at module-init time —
# it walks ``globals().values()'' and calls ``issubclass(obj,
# HTTPException)'' on each.  Grail's ``module.values()'' path
# returns an OrderedCollection that triggers a different dispatch
# than expected, and the call chain fails before exceptions can
# register themselves.  Replacing the whole upstream is simpler
# than fighting the introspection loop.
#
# This file mirrors enough of the upstream surface for the M7
# Flask hello-world demo + werkzeug.wsgi imports.  When the
# upstream globals()/values() / issubclass path is sorted, the
# rest of the upstream subclasses can be added back trivially.


class HTTPException(Exception):
    """Base class for werkzeug HTTP error responses.

    ``code`` / ``name`` / ``description`` are **class** attributes (as in
    upstream Werkzeug), so they resolve both on the class
    (``NotFound.code`` — Flask's ``_get_exc_class_and_code`` reads this)
    and on an instance (``e.code`` — ``handle_http_exception`` reads this),
    independent of whether ``__init__`` ran.  A raise via the Smalltalk
    exception machinery can construct the instance without running Python
    ``__init__``; class attributes survive that path."""

    code = 500
    name = 'HTTPException'
    description = ''
    response = None

    def get_response(self, environ=None):
        from werkzeug.wrappers import Response
        body = str(self.code) + ' ' + self.name + ': ' + self.description
        headers = [('Content-Type', 'text/plain; charset=utf-8')]
        return Response(body, status=self.code, headers=headers)

    def __str__(self):
        return str(self.code) + ' ' + self.name + ': ' + self.description


class BadRequest(HTTPException):
    code = 400
    name = 'Bad Request'
    description = (
        'The browser sent a request that this server could not '
        'understand.')


class ClientDisconnected(BadRequest):
    """Raised when the client disconnects mid-request."""

    description = 'Client disconnected before request finished.'


class Unauthorized(HTTPException):
    code = 401
    name = 'Unauthorized'
    description = 'Authentication is required.'


class Forbidden(HTTPException):
    code = 403
    name = 'Forbidden'
    description = 'You do not have permission to access this resource.'


class NotFound(HTTPException):
    code = 404
    name = 'Not Found'
    description = 'The requested URL was not found on the server.'


class MethodNotAllowed(HTTPException):
    code = 405
    name = 'Method Not Allowed'
    description = 'The method is not allowed for the requested URL.'

    def __init__(self, valid_methods=None):
        self.valid_methods = valid_methods or []


class RequestEntityTooLarge(HTTPException):
    """Raised when the request body exceeds the configured max size."""

    code = 413
    name = 'Request Entity Too Large'
    description = 'The request body is too large.'


class BadRequestKeyError(KeyError):
    """Raised when a Headers / MultiDict key lookup misses.
    werkzeug.datastructures uses this for dict-like KeyError
    reporting that surfaces as an HTTP 400 in the wrapping app.

    Upstream Werkzeug inherits from ``(BadRequest, KeyError)'' for
    multi-inheritance — Grail's class machinery doesn't yet support
    that shape, so the shim inherits from KeyError alone and adds
    the BadRequest-shaped attributes manually.  ``except KeyError''
    in werkzeug.datastructures (.pop / .__getitem__) catches this
    correctly; ``isinstance(e, BadRequest)'' returns False until
    multi-inheritance lands, but no current Flask demo path checks
    that."""

    code = 400
    name = 'Bad Request'

    def __init__(self, key=None):
        KeyError.__init__(self, key)
        self.code = 400
        self.name = 'Bad Request'
        self.description = 'KeyError: ' + repr(key)
        self.response = None
        self.key = key

    def get_response(self, environ=None):
        from werkzeug.wrappers import Response
        body = str(self.code) + ' ' + self.name + ': ' + self.description
        headers = [('Content-Type', 'text/plain; charset=utf-8')]
        return Response(body, status=self.code, headers=headers)


class SecurityError(BadRequest):
    """Raised by host validation when an untrusted host is
    rejected — werkzeug.sansio.utils imports this."""

    description = 'Untrusted host rejected.'


class BadHost(BadRequest):
    """Raised when the Host header is unrecognized or untrusted —
    werkzeug.routing.exceptions uses this."""

    name = 'Bad Host'
    description = 'Bad Host.'


class RequestedRangeNotSatisfiable(HTTPException):
    """416 — requested byte range outside the resource size."""

    code = 416
    name = 'Requested Range Not Satisfiable'
    description = 'The Range header is not satisfiable.'


class UnsupportedMediaType(HTTPException):
    """415 — request entity has a media type the server can't process.
    werkzeug.wrappers.Request.json raises this on bad Content-Type."""

    code = 415
    name = 'Unsupported Media Type'
    description = 'Unsupported media type.'


class InternalServerError(HTTPException):
    code = 500
    name = 'Internal Server Error'
    description = (
        'The server encountered an internal error and was unable to '
        'complete your request.')


# Default-exceptions mapping — code → exception class — provided
# for ``flask.abort'' / Werkzeug's Aborter dispatch.  Populated
# explicitly rather than via globals()/issubclass introspection.
default_exceptions = {
    400: BadRequest,
    401: Unauthorized,
    403: Forbidden,
    404: NotFound,
    405: MethodNotAllowed,
    413: RequestEntityTooLarge,
    415: UnsupportedMediaType,
    500: InternalServerError,
}


def abort(status, *args, **kwargs):
    """Raise an HTTPException for the given status code.  ``status''
    can be an int (looked up in ``default_exceptions'') or a Response
    instance (raised wrapped in an HTTPException).

    Stub: only the int form is implemented; the optional description /
    response payload args / kwargs are ignored."""
    if isinstance(status, int):
        cls = default_exceptions.get(status)
        if cls is None:
            raise LookupError('no exception for status ' + str(status))
        raise cls()
    raise TypeError('abort(status) expects an int; Response form not supported')


class Aborter:
    """Stub ``werkzeug.exceptions.Aborter'' — callable equivalent of
    the module-level ``abort'' function.  Used by Flask's
    ``app.aborter''."""

    def __init__(self, mapping=None, extra=None):
        self.mapping = dict(default_exceptions if mapping is None else mapping)
        if extra is not None:
            for code, cls in extra.items():
                self.mapping[code] = cls

    def __call__(self, code, *args, **kwargs):
        if isinstance(code, int):
            cls = self.mapping.get(code)
            if cls is None:
                raise LookupError('no exception for status ' + str(code))
            raise cls()
        raise TypeError('Aborter(status) expects an int')
