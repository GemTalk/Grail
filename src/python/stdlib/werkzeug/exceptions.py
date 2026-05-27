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
    """Base class for werkzeug HTTP error responses."""

    def __init__(self):
        self.code = 500
        self.name = 'HTTPException'
        self.description = ''
        self.response = None

    def get_response(self, environ=None):
        from werkzeug.wrappers import Response
        body = str(self.code) + ' ' + self.name + ': ' + self.description
        headers = [('Content-Type', 'text/plain; charset=utf-8')]
        return Response(body, status=self.code, headers=headers)

    def __str__(self):
        return str(self.code) + ' ' + self.name + ': ' + self.description


class BadRequest(HTTPException):
    def __init__(self):
        self.code = 400
        self.name = 'Bad Request'
        self.description = (
            'The browser sent a request that this server could not '
            'understand.')
        self.response = None


class ClientDisconnected(BadRequest):
    """Raised when the client disconnects mid-request."""

    def __init__(self):
        BadRequest.__init__(self)
        self.description = 'Client disconnected before request finished.'


class Unauthorized(HTTPException):
    def __init__(self):
        self.code = 401
        self.name = 'Unauthorized'
        self.description = 'Authentication is required.'
        self.response = None


class Forbidden(HTTPException):
    def __init__(self):
        self.code = 403
        self.name = 'Forbidden'
        self.description = 'You do not have permission to access this resource.'
        self.response = None


class NotFound(HTTPException):
    def __init__(self):
        self.code = 404
        self.name = 'Not Found'
        self.description = 'The requested URL was not found on the server.'
        self.response = None


class MethodNotAllowed(HTTPException):
    def __init__(self, valid_methods=None):
        self.code = 405
        self.name = 'Method Not Allowed'
        self.description = 'The method is not allowed for the requested URL.'
        self.response = None
        self.valid_methods = valid_methods or []


class RequestEntityTooLarge(HTTPException):
    """Raised when the request body exceeds the configured max size."""

    def __init__(self):
        self.code = 413
        self.name = 'Request Entity Too Large'
        self.description = 'The request body is too large.'
        self.response = None


class BadRequestKeyError(BadRequest):
    """Raised when a Headers / MultiDict key lookup misses.
    werkzeug.datastructures uses this for dict-like KeyError reporting
    that surfaces as an HTTP 400 in the wrapping app.  Stub takes the
    missing key for parity with upstream's KeyError-inheriting form."""

    def __init__(self, key=None):
        self.code = 400
        self.name = 'Bad Request'
        self.description = 'KeyError: ' + repr(key)
        self.response = None
        self.key = key


class SecurityError(BadRequest):
    """Raised by host validation when an untrusted host is
    rejected — werkzeug.sansio.utils imports this."""

    def __init__(self):
        BadRequest.__init__(self)
        self.description = 'Untrusted host rejected.'


class InternalServerError(HTTPException):
    def __init__(self):
        self.code = 500
        self.name = 'Internal Server Error'
        self.description = (
            'The server encountered an internal error and was unable to '
            'complete your request.')
        self.response = None


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
    500: InternalServerError,
}
