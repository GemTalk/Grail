# Grail werkzeug.test — minimal hand-rolled shim.
#
# Upstream werkzeug/test.py is ~1500 lines wiring EnvironBuilder,
# Client, TestResponse, multipart encoding, cookie jar.  Many call
# sites use ``**kwargs`` unpack, dataclass decorator with kwargs at
# decorator time, and the full descriptor protocol via
# cached_property — none of which Grail supports yet.  This shim
# exposes the import surface needed by Flask's test client + Flask's
# CLI runner without claiming behavioural parity.
#
# When the codegen / dispatch gaps close, drop in the upstream source
# preserved as ``test_upstream.py.bak'' alongside.
#
# Imports that downstream Flask/Werkzeug code expects:
#   EnvironBuilder, Client, ClientRedirectError, TestResponse,
#   create_environ, run_wsgi_app, encode_multipart,
#   stream_encode_multipart, Cookie

from io import BytesIO

# Grail-patched: deferred Request/Response import via helpers
# that return the class each time.  Eager ``from .wrappers...
# import'' at module-init triggers a transitive
# ``__getitem__:'' BoundMethod codegen error in
# werkzeug.wrappers.request (class-body subscripts).  Inline
# imports inside helpers avoid the module-init dependency.


def _request_cls():
    from .wrappers.request import Request
    return Request


def _response_cls():
    from .wrappers.response import Response
    return Response


class ClientRedirectError(Exception):
    """Raised when a Client follows too many redirects.  Stub —
    Grail's shim Client doesn't actually follow redirects."""


class EnvironBuilder:
    """Build a WSGI environ dict for testing.  Stub — captures the
    constructor args verbatim and exposes them via ``get_environ``.

    The full upstream class wires multipart encoding, JSON body
    serialization, cookie jars, and content-type inference — none
    of which the M7 Flask demo path exercises end-to-end."""

    def __init__(self, path='/', base_url=None, query_string=None,
                 method='GET', input_stream=None, content_type=None,
                 content_length=None, errors_stream=None,
                 multithread=False, multiprocess=False, run_once=False,
                 headers=None, data=None, environ_base=None,
                 environ_overrides=None, mimetype=None,
                 json=None, auth=None):
        self.path = path
        self.base_url = base_url or 'http://localhost/'
        self.query_string = query_string or ''
        self.method = method
        self.input_stream = input_stream or BytesIO()
        self.content_type = content_type
        self.content_length = content_length
        self.errors_stream = errors_stream
        self.multithread = multithread
        self.multiprocess = multiprocess
        self.run_once = run_once
        self.headers = headers or []
        self.data = data
        self.environ_base = environ_base or {}
        self.environ_overrides = environ_overrides or {}
        self.mimetype = mimetype
        self.json = json
        self.auth = auth

    def get_environ(self):
        """Build a minimum-viable WSGI environ dict.  Not a full
        spec-compliant build — just enough keys for code that
        inspects basic request metadata."""
        environ = {
            'REQUEST_METHOD': self.method,
            'PATH_INFO': self.path,
            'QUERY_STRING': self.query_string,
            'SERVER_NAME': 'localhost',
            'SERVER_PORT': '80',
            'HTTP_HOST': 'localhost',
            'SERVER_PROTOCOL': 'HTTP/1.1',
            'wsgi.url_scheme': 'http',
            'wsgi.input': self.input_stream,
            'wsgi.errors': self.errors_stream,
            'wsgi.multithread': self.multithread,
            'wsgi.multiprocess': self.multiprocess,
            'wsgi.run_once': self.run_once,
        }
        if self.content_type is not None:
            environ['CONTENT_TYPE'] = self.content_type
        if self.content_length is not None:
            environ['CONTENT_LENGTH'] = str(self.content_length)
        for k, v in self.environ_base.items():
            environ[k] = v
        for k, v in self.environ_overrides.items():
            environ[k] = v
        return environ

    def get_request(self, cls=None):
        """Build a Request object — lazily imports werkzeug.wrappers
        because eager import triggers a codegen gap in the upstream
        wrappers.request module-init."""
        if cls is None:
            cls = _request_cls()
        return cls(self.get_environ())


class TestResponse:
    """Response wrapper returned by Client.  Stub — wraps a Response
    by composition instead of inheritance to avoid the deferred
    Response import circularity."""

    def __init__(self, response=None, status=None, headers=None,
                 mimetype=None, content_type=None, direct_passthrough=False,
                 request=None):
        # Grail-patched: do not instantiate Response — the upstream
        # werkzeug.wrappers.response module-init triggers a
        # ``__getitem__:'' BoundMethod codegen gap.  Carry the raw
        # data fields instead; callers that need a full Response can
        # be wired up later.
        self.data = response if response is not None else b''
        self.status = status
        self.headers = headers or []
        self.mimetype = mimetype
        self.content_type = content_type
        self.direct_passthrough = direct_passthrough
        self.request = request

    @property
    def status_code(self):
        """Parse ``'200 OK'`` → 200.  Stub — werkzeug.Response does
        this through the status property."""
        if isinstance(self.status, int):
            return self.status
        if isinstance(self.status, str):
            parts = self.status.split(' ', 1)
            try:
                return int(parts[0])
            except ValueError:
                return 0
        return 0

    def get_data(self, as_text=False):
        if as_text and isinstance(self.data, bytes):
            return self.data.decode('utf-8')
        return self.data


class Cookie:
    """Stub cookie carrier — Client doesn't maintain a jar yet."""

    def __init__(self, key, value, domain='', path='/', secure=False,
                 httponly=False, samesite=None):
        self.key = key
        self.value = value
        self.domain = domain
        self.path = path
        self.secure = secure
        self.httponly = httponly
        self.samesite = samesite


class Client:
    """Minimal WSGI test client — exposes ``open / get / post`` etc.
    by wrapping a WSGI app + EnvironBuilder.  Stub does NOT follow
    redirects, manage cookies, or unpack multipart bodies.  The M7
    Flask demo path uses it only for an in-process ``client.get('/')''.
    """

    def __init__(self, application, response_wrapper=None,
                 use_cookies=True, allow_subdomain_redirects=False):
        self.application = application
        self.response_wrapper = response_wrapper or TestResponse
        self.use_cookies = use_cookies
        self.allow_subdomain_redirects = allow_subdomain_redirects

    def open(self, *args, **kwargs):
        """Open a request — first positional arg is the path, or an
        EnvironBuilder.  Calls the WSGI application and returns a
        TestResponse."""
        if len(args) > 0 and isinstance(args[0], EnvironBuilder):
            builder = args[0]
        else:
            path = args[0] if len(args) > 0 else kwargs.pop('path', '/')
            builder = EnvironBuilder(
                path=path,
                method=kwargs.pop('method', 'GET'),
                query_string=kwargs.pop('query_string', None),
                headers=kwargs.pop('headers', None),
                data=kwargs.pop('data', None),
                content_type=kwargs.pop('content_type', None),
                content_length=kwargs.pop('content_length', None),
                input_stream=kwargs.pop('input_stream', None),
                environ_base=kwargs.pop('environ_base', None),
                environ_overrides=kwargs.pop('environ_overrides', None),
            )
        environ = builder.get_environ()
        captured = {'status': None, 'headers': None}

        def start_response(status, headers, exc_info=None):
            captured['status'] = status
            captured['headers'] = headers
            return lambda data: None

        body_iter = self.application(environ, start_response)
        body_bytes = b''.join(body_iter) if body_iter is not None else b''
        # Grail-patched: skip builder.get_request() so wrappers.request
        # doesn't get imported here either.
        return self.response_wrapper(
            response=body_bytes,
            status=captured['status'],
            headers=captured['headers'],
        )

    def get(self, *args, **kwargs):
        kwargs['method'] = 'GET'
        return self.open(*args, **kwargs)

    def post(self, *args, **kwargs):
        kwargs['method'] = 'POST'
        return self.open(*args, **kwargs)

    def put(self, *args, **kwargs):
        kwargs['method'] = 'PUT'
        return self.open(*args, **kwargs)

    def delete(self, *args, **kwargs):
        kwargs['method'] = 'DELETE'
        return self.open(*args, **kwargs)

    def head(self, *args, **kwargs):
        kwargs['method'] = 'HEAD'
        return self.open(*args, **kwargs)

    def options(self, *args, **kwargs):
        kwargs['method'] = 'OPTIONS'
        return self.open(*args, **kwargs)

    def patch(self, *args, **kwargs):
        kwargs['method'] = 'PATCH'
        return self.open(*args, **kwargs)


def create_environ(*args, **kwargs):
    """Convenience: build an environ dict via EnvironBuilder."""
    return EnvironBuilder(*args, **kwargs).get_environ()


def run_wsgi_app(app, environ, buffered=False):
    """Run a WSGI app and return ``(app_iter, status, headers)``."""
    captured = {'status': None, 'headers': None}

    def start_response(status, headers, exc_info=None):
        captured['status'] = status
        captured['headers'] = headers
        return lambda data: None

    app_iter = app(environ, start_response)
    return app_iter, captured['status'], captured['headers']


def encode_multipart(values, boundary=None):
    """Stub — Grail's shim doesn't produce multipart bodies."""
    raise NotImplementedError(
        'werkzeug.test.encode_multipart is not implemented in the Grail shim'
    )


def stream_encode_multipart(data, use_tempfile=True, threshold=1024*500,
                            boundary=None):
    """Stub — see encode_multipart."""
    raise NotImplementedError(
        'werkzeug.test.stream_encode_multipart is not implemented in the Grail shim'
    )
