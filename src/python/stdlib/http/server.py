# Grail ``http.server'' — a functional subset of the stdlib module.
#
# Provides ``HTTPServer`` and ``BaseHTTPRequestHandler`` with the API
# werkzeug's ``WSGIRequestHandler`` (and other WSGI servers) build on:
# request-line + header parsing, ``send_response`` / ``send_header`` /
# ``end_headers``, and ``self.headers`` / ``self.command`` / ``self.path`` /
# ``self.request_version``.  Header parsing is a simple line split rather than
# the stdlib's ``email`` machinery, but the ``HTTPMessage`` it produces
# exposes the same ``get`` / ``get_all`` / ``items`` interface.

import socketserver

__all__ = ["HTTPServer", "BaseHTTPRequestHandler", "HTTPMessage"]

DEFAULT_ERROR_MESSAGE = """\
<!DOCTYPE HTML>
<html><head><title>Error response</title></head>
<body><h1>Error response</h1>
<p>Error code: %(code)d</p>
<p>Message: %(message)s.</p>
</body></html>
"""

DEFAULT_ERROR_CONTENT_TYPE = "text/html;charset=utf-8"

# Minimal status-phrase table (the common ones; werkzeug supplies its own
# phrases via send_response anyway).
_RESPONSES = {
    200: "OK", 201: "Created", 204: "No Content", 301: "Moved Permanently",
    302: "Found", 304: "Not Modified", 400: "Bad Request", 401: "Unauthorized",
    403: "Forbidden", 404: "Not Found", 405: "Method Not Allowed",
    500: "Internal Server Error", 501: "Not Implemented",
    503: "Service Unavailable",
}


class HTTPMessage:
    """Case-insensitive HTTP header container with the email.message.Message
    subset that WSGI servers use."""

    def __init__(self):
        self._headers = []  # list of (name, value) in arrival order

    def add(self, name, value):
        self._headers.append((name, value))

    def get(self, name, default=None):
        low = name.lower()
        for k, v in self._headers:
            if k.lower() == low:
                return v
        return default

    __getitem__ = get

    def get_all(self, name, default=None):
        low = name.lower()
        out = [v for k, v in self._headers if k.lower() == low]
        return out if out else default

    def __contains__(self, name):
        low = name.lower()
        return any(k.lower() == low for k, _ in self._headers)

    def items(self):
        return list(self._headers)

    def keys(self):
        return [k for k, _ in self._headers]

    def __iter__(self):
        return iter(self.keys())


def _parse_headers(rfile):
    msg = HTTPMessage()
    while True:
        line = rfile.readline(65537)
        if not line or line in (b"\r\n", b"\n", b""):
            break
        text = line.decode("latin-1").rstrip("\r\n")
        if ":" in text:
            name, _, value = text.partition(":")
            msg.add(name.strip(), value.strip())
    return msg


class HTTPServer(socketserver.TCPServer):
    allow_reuse_address = True

    def server_bind(self):
        socketserver.TCPServer.server_bind(self)
        host, port = self.server_address[:2]
        self.server_name = host
        self.server_port = port


class BaseHTTPRequestHandler(socketserver.StreamRequestHandler):
    server_version = "BaseHTTP/0.6"
    sys_version = "Grail"
    protocol_version = "HTTP/1.0"
    default_request_version = "HTTP/0.9"
    responses = _RESPONSES

    def handle(self):
        self.close_connection = True
        self.handle_one_request()
        while not self.close_connection:
            self.handle_one_request()

    def handle_one_request(self):
        try:
            self.raw_requestline = self.rfile.readline(65537)
            if not self.raw_requestline:
                self.close_connection = True
                return
            if not self.parse_request():
                return
            mname = "do_" + self.command
            if not hasattr(self, mname):
                self.send_error(501, "Unsupported method (%r)" % self.command)
                return
            getattr(self, mname)()
            self.wfile.flush()
        except OSError:
            self.close_connection = True

    def parse_request(self):
        self.command = None
        self.request_version = version = self.default_request_version
        self.close_connection = True
        self.requestline = self.raw_requestline.decode("latin-1").rstrip("\r\n")
        words = self.requestline.split()
        if len(words) == 0:
            return False
        if len(words) >= 3:
            version = words[-1]
            self.request_version = version
            if version.startswith("HTTP/1.1"):
                self.close_connection = False
        if len(words) >= 2:
            self.command, self.path = words[0], words[1]
        else:
            self.command, self.path = words[0], "/"
        self.headers = _parse_headers(self.rfile)
        conn = self.headers.get("Connection", "")
        if conn.lower() == "close":
            self.close_connection = True
        elif conn.lower() == "keep-alive" and self.protocol_version >= "HTTP/1.1":
            self.close_connection = False
        return True

    def send_error(self, code, message=None, explain=None):
        try:
            shortmsg = self.responses.get(code, "???")
        except Exception:
            shortmsg = "???"
        if message is None:
            message = shortmsg
        self.send_response(code, message)
        self.send_header("Connection", "close")
        body = None
        if code >= 200 and code not in (204, 205, 304):
            body = (DEFAULT_ERROR_MESSAGE % {
                "code": code, "message": message,
            }).encode("UTF-8", "replace")
            self.send_header("Content-Type", DEFAULT_ERROR_CONTENT_TYPE)
            self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        if self.command != "HEAD" and body:
            self.wfile.write(body)

    def send_response(self, code, message=None):
        self.send_response_only(code, message)
        self.send_header("Server", self.version_string())
        self.send_header("Date", self.date_time_string())

    def send_response_only(self, code, message=None):
        if message is None:
            message = self.responses.get(code, "")
        if self.request_version != "HTTP/0.9":
            if not hasattr(self, "_headers_buffer"):
                self._headers_buffer = []
            self._headers_buffer.append(
                ("%s %d %s\r\n" % (self.protocol_version, code, message)).encode(
                    "latin-1", "strict"
                )
            )

    def send_header(self, keyword, value):
        if self.request_version != "HTTP/0.9":
            if not hasattr(self, "_headers_buffer"):
                self._headers_buffer = []
            self._headers_buffer.append(
                ("%s: %s\r\n" % (keyword, value)).encode("latin-1", "strict")
            )

    def end_headers(self):
        if self.request_version != "HTTP/0.9":
            if not hasattr(self, "_headers_buffer"):
                self._headers_buffer = []
            self._headers_buffer.append(b"\r\n")
            self.flush_headers()

    def flush_headers(self):
        if hasattr(self, "_headers_buffer"):
            self.wfile.write(b"".join(self._headers_buffer))
            self._headers_buffer = []

    def version_string(self):
        return self.server_version + " " + self.sys_version

    def date_time_string(self, timestamp=None):
        # A fixed, well-formed HTTP date is acceptable for the dev server; a
        # real clock-based formatter needs email.utils.formatdate.
        return "Thu, 01 Jan 1970 00:00:00 GMT"

    def log_request(self, code="-", size="-"):
        pass

    def log_error(self, format, *args):
        pass

    def log_message(self, format, *args):
        pass
