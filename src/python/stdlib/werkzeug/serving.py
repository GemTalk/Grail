# Grail ``werkzeug.serving'' — the development WSGI server, built on the
# stdlib ``http.server'' / ``socketserver'' stack (which Grail now provides
# over the native GsSocket-backed ``socket'' module).  This replaces the M8
# hand-rolled ``run_simple'' with the faithful path: a ``WSGIRequestHandler``
# subclassing ``BaseHTTPRequestHandler`` parses the request and runs the WSGI
# app; ``BaseWSGIServer`` is an ``HTTPServer`` holding the application.
#
# Persistent HTTP/1.1 connections (keep-alive) and chunked transfer-encoding
# are supported: a connection is reused for further requests unless the client
# or response asks to close it, and a response with no Content-Length is framed
# with ``Transfer-Encoding: chunked`` (on HTTP/1.1) so the connection can stay
# open.
#
# Still out of scope: the auto-reloader, HTTPS / ``ssl_context``.
# ``threaded=True`` uses ``ThreadingMixIn`` (GsProcess green threads —
# cooperative, not parallel).

from http.server import BaseHTTPRequestHandler, HTTPServer
import socketserver
from io import BytesIO


def is_running_from_reloader():
    """Whether the current process is the reloader child.  Grail has no
    auto-reloader, so always False."""
    return False


class WSGIRequestHandler(BaseHTTPRequestHandler):
    """Parse the HTTP request and run the server's WSGI application."""

    # Speak HTTP/1.1 so persistent connections are the default; the base
    # ``parse_request`` then keeps the connection alive unless the client
    # sends ``Connection: close``.
    protocol_version = "HTTP/1.1"

    def make_environ(self):
        path = self.path
        if "?" in path:
            path_info, _, query = path.partition("?")
        else:
            path_info, query = path, ""

        scheme = "https" if getattr(self.server, "ssl_context", None) else "http"
        environ = {
            "REQUEST_METHOD": self.command,
            "SCRIPT_NAME": "",
            "PATH_INFO": path_info,
            "QUERY_STRING": query,
            "SERVER_NAME": self.server.server_name,
            "SERVER_PORT": str(self.server.server_port),
            "SERVER_PROTOCOL": self.request_version,
            "REMOTE_ADDR": self.client_address[0] if self.client_address else "127.0.0.1",
            "wsgi.version": (1, 0),
            "wsgi.url_scheme": scheme,
            "wsgi.input": self.rfile,
            "wsgi.errors": BytesIO(),
            "wsgi.multithread": False,
            "wsgi.multiprocess": False,
            "wsgi.run_once": False,
        }
        for name, value in self.headers.items():
            key = name.upper().replace("-", "_")
            if key in ("CONTENT_TYPE", "CONTENT_LENGTH"):
                environ[key] = value
            else:
                key = "HTTP_" + key
                if key in environ:
                    environ[key] = environ[key] + "," + value
                else:
                    environ[key] = value
        return environ

    def run_wsgi(self):
        environ = self.make_environ()
        status_set = []
        headers_set = []
        headers_sent = []
        use_chunked = []  # non-empty once we commit to chunked framing

        def write(data):
            if isinstance(data, str):
                data = data.encode("utf-8")
            if not status_set:
                raise AssertionError("write() before start_response()")
            if not headers_sent:
                status = status_set[0]
                code_str, _, msg = status.partition(" ")
                code = int(code_str)
                self.send_response_only(code, msg)
                header_keys = set()
                for key, value in headers_set:
                    self.send_header(key, value)
                    header_keys.add(key.lower())

                # Decide how the response body is framed.  A "bodyless" status
                # carries no body at all; otherwise the client needs either a
                # Content-Length or chunked framing to know where it ends.
                bodyless = (environ["REQUEST_METHOD"] == "HEAD"
                            or code < 200 or code in (204, 304))
                already_framed = ("content-length" in header_keys
                                  or "transfer-encoding" in header_keys)
                if not bodyless and not already_framed:
                    if (self.protocol_version >= "HTTP/1.1"
                            and not self.close_connection):
                        # Keep the connection alive by framing with chunks.
                        use_chunked.append(True)
                        self.send_header("Transfer-Encoding", "chunked")
                    else:
                        # No length and can't chunk: the only frame left is to
                        # close the connection at end of body.
                        self.close_connection = True

                if self.close_connection:
                    self.send_header("Connection", "close")
                elif self.request_version == "HTTP/1.0":
                    # An HTTP/1.0 client only keeps the connection alive if we
                    # say so explicitly.
                    self.send_header("Connection", "keep-alive")
                self.end_headers()
                headers_sent.append(True)

            if not data:
                return
            if use_chunked:
                self.wfile.write(("%x\r\n" % len(data)).encode("latin-1"))
                self.wfile.write(data)
                self.wfile.write(b"\r\n")
            else:
                self.wfile.write(data)

        def start_response(status, response_headers, exc_info=None):
            if exc_info:
                try:
                    if headers_sent:
                        raise exc_info[1]
                finally:
                    exc_info = None
            status_set.append(status)
            headers_set.extend(response_headers)
            return write

        app_rv = self.server.app(environ, start_response)
        try:
            for data in app_rv:
                write(data)
            if not headers_sent:
                write(b"")
            if use_chunked:
                self.wfile.write(b"0\r\n\r\n")
        finally:
            if hasattr(app_rv, "close"):
                app_rv.close()
        self.wfile.flush()

    def handle_one_request(self):
        """Read one request off the (possibly persistent) connection and run
        the WSGI app.  The base ``handle`` loops on this while the connection
        stays open."""
        try:
            self.raw_requestline = self.rfile.readline(65537)
        except OSError:
            self.close_connection = True
            return
        if not self.raw_requestline:
            self.close_connection = True
            return
        if not self.parse_request():
            return
        self.run_wsgi()

    def log_request(self, code="-", size="-"):
        pass


def _normalize_ssl_context(ssl_context):
    """Accept what werkzeug's ``ssl_context`` allows and return an
    ``ssl.SSLContext`` (or None).  Supports an already-built ``SSLContext`` and a
    ``(certfile, keyfile)`` / ``(certfile, keyfile, password)`` tuple; ``'adhoc'``
    is unsupported (no on-the-fly cert generation)."""
    if ssl_context is None:
        return None
    if hasattr(ssl_context, "wrap_socket"):
        return ssl_context
    if isinstance(ssl_context, tuple):
        import ssl as _ssl
        ctx = _ssl.SSLContext(_ssl.PROTOCOL_TLS_SERVER)
        certfile = ssl_context[0]
        keyfile = ssl_context[1] if len(ssl_context) > 1 else None
        password = ssl_context[2] if len(ssl_context) > 2 else None
        ctx.load_cert_chain(certfile, keyfile, password)
        return ctx
    raise TypeError("unsupported ssl_context: %r" % (ssl_context,))


class BaseWSGIServer(HTTPServer):
    """An HTTP(S) server bound to a WSGI ``app``."""

    def __init__(self, host, port, app, handler=None, ssl_context=None):
        if handler is None:
            handler = WSGIRequestHandler
        self.app = app
        HTTPServer.__init__(self, (host, int(port)), handler)
        self.ssl_context = _normalize_ssl_context(ssl_context)
        if self.ssl_context is not None:
            # Wrap the bound listening socket; each accept() now returns a TLS
            # connection (the handshake runs in SSLSocket.accept()).
            self.socket = self.ssl_context.wrap_socket(self.socket,
                                                       server_side=True)


class ThreadedWSGIServer(socketserver.ThreadingMixIn, BaseWSGIServer):
    """Each request handled in its own (cooperative GsProcess) thread."""


def make_server(host="127.0.0.1", port=0, app=None, threaded=False,
                processes=1, request_handler=None, passthrough_errors=False,
                ssl_context=None, fd=None):
    """Create a WSGI server.  ``ssl_context`` enables HTTPS (an ``ssl.SSLContext``
    or a ``(certfile, keyfile[, password])`` tuple); ``processes`` is accepted but
    ignored (no multiprocessing)."""
    if app is None:
        raise TypeError("make_server() requires an app")
    if threaded:
        return ThreadedWSGIServer(host, port, app, request_handler, ssl_context)
    return BaseWSGIServer(host, port, app, request_handler, ssl_context)


def run_simple(hostname, port, application, use_reloader=False,
               use_debugger=False, use_evalex=True,
               extra_files=None, exclude_patterns=None,
               reloader_interval=1, reloader_type="auto",
               threaded=False, processes=1, request_handler=None,
               static_files=None, passthrough_errors=False,
               ssl_context=None):
    """Serve ``application`` on ``hostname:port`` until interrupted.  Blocks the
    calling GemStone session (the gem becomes the server)."""
    server = make_server(hostname, port, application, threaded, processes,
                         request_handler, passthrough_errors, ssl_context)
    try:
        server.serve_forever()
    finally:
        server.server_close()
