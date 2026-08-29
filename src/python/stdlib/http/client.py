# Minimal http.client for Grail — the CLIENT subset: HTTPConnection,
# HTTPSConnection, HTTPResponse, and the standard exception hierarchy.
#
# This is a hand-rolled shim, not the CPython source drop.
#
# Status of the source-drop route (re-checked 2026-08-08 against CPython
# 3.14, which is what Grail targets): the email dependency is no longer
# the blocker — email.parser.Parser(...).parsestr() already parses a
# real header block correctly here, including repeated headers via
# get_all, and io.BufferedIOBase exists.  What blocks it now is enum:
# CPython's http/__init__.py builds HTTPStatus/HTTPMethod with
# @enum._simple_enum(IntEnum) / (StrEnum), and Grail's _simple_enum is a
# no-op stub that returns the plain class, so the dropped-in client dies
# on `globals().update(http.HTTPStatus.__members__)`.  Making the drop
# possible needs three enum gaps closed: a real _simple_enum, StrEnum
# members with __new__ args, and three-arg type() enum construction.
# Grail's enum.IntEnum otherwise already handles the HTTPStatus pattern
# (int-valued members with a custom __new__ and by-value identity).
#
# Supported:
#   * HTTP/1.1 requests with keep-alive, explicit Content-Length
#   * HTTPS via ssl.SSLContext.wrap_socket (SNI through server_hostname)
#   * Response bodies: Content-Length, chunked transfer-encoding,
#     read-to-EOF; HEAD/204/304 no-body rules
#   * Case-insensitive response-header access (HTTPMessage shim)
#
# Not supported: proxies/tunneling (set_tunnel raises), trailers are
# read and discarded, no 100-continue request mode.
#
# Socket lifetime follows CPython: HTTPResponse reads through its own
# sock.makefile('rb') handle, and socket.close() defers releasing the
# GsSocket until the last such handle closes (socket._io_refs).  That is
# what lets the ordinary Connection: close flow read its body after
# getresponse() has already closed the connection.

import io
import socket
from collections import OrderedDict
from urllib.parse import urlsplit

__all__ = [
    'HTTPConnection', 'HTTPSConnection', 'HTTPResponse', 'HTTPMessage',
    'HTTPException', 'NotConnected', 'InvalidURL', 'UnknownProtocol',
    'ImproperConnectionState', 'CannotSendRequest', 'CannotSendHeader',
    'ResponseNotReady', 'BadStatusLine', 'LineTooLong', 'IncompleteRead',
    'RemoteDisconnected', 'HTTP_PORT', 'HTTPS_PORT', 'responses',
]

HTTP_PORT = 80
HTTPS_PORT = 443

_MAX_LINE = 65536
_MAX_HEADERS = 100

# Subset of http.HTTPStatus reason phrases used in error messages and
# by consumers that map codes to text.
responses = {
    100: 'Continue', 101: 'Switching Protocols',
    200: 'OK', 201: 'Created', 202: 'Accepted',
    204: 'No Content', 206: 'Partial Content',
    301: 'Moved Permanently', 302: 'Found', 303: 'See Other',
    304: 'Not Modified', 307: 'Temporary Redirect',
    308: 'Permanent Redirect',
    400: 'Bad Request', 401: 'Unauthorized', 402: 'Payment Required',
    403: 'Forbidden', 404: 'Not Found', 405: 'Method Not Allowed',
    406: 'Not Acceptable', 408: 'Request Timeout', 409: 'Conflict',
    410: 'Gone', 411: 'Length Required', 413: 'Payload Too Large',
    414: 'URI Too Long', 415: 'Unsupported Media Type',
    422: 'Unprocessable Entity', 429: 'Too Many Requests',
    500: 'Internal Server Error', 501: 'Not Implemented',
    502: 'Bad Gateway', 503: 'Service Unavailable',
    504: 'Gateway Timeout', 505: 'HTTP Version Not Supported',
}


class HTTPException(Exception):
    pass


class NotConnected(HTTPException):
    pass


class InvalidURL(HTTPException):
    pass


class UnknownProtocol(HTTPException):
    def __init__(self, version):
        self.args = (version,)
        self.version = version


class ImproperConnectionState(HTTPException):
    pass


class CannotSendRequest(ImproperConnectionState):
    pass


class CannotSendHeader(ImproperConnectionState):
    pass


class ResponseNotReady(ImproperConnectionState):
    pass


class BadStatusLine(HTTPException):
    def __init__(self, line):
        if not line:
            line = repr(line)
        self.args = (line,)
        self.line = line


class LineTooLong(HTTPException):
    def __init__(self, line_type):
        HTTPException.__init__(
            self, 'got more than %d bytes when reading %s'
            % (_MAX_LINE, line_type))


class IncompleteRead(HTTPException):
    """A response body ended before as many bytes as were promised arrived.

    urllib3 imports this by name at module scope, so its absence stopped
    ``import urllib3`` on the import line -- before any HTTP call could be
    made, which is why it was worth adding on its own.

    What is here is the NAME and the SHAPE (``partial`` / ``expected`` /
    repr), not yet the behaviour: Grail's HTTPResponse still answers a short
    read rather than raising, so a caller's ``except IncompleteRead`` compiles
    and simply never fires.  Raising it from _safe_read is the follow-up.
    """

    def __init__(self, partial, expected=None):
        self.args = (partial,) if expected is None else (partial, expected)
        self.partial = partial
        self.expected = expected

    def __repr__(self):
        if self.expected is not None:
            e = ", %i more expected" % self.expected
        else:
            e = ""
        return "IncompleteRead(%i bytes read%s)" % (len(self.partial), e)


# CPython: RemoteDisconnected(ConnectionResetError, BadStatusLine).
# Grail has no multiple inheritance; ConnectionResetError is kept as
# the base so ``except ConnectionError`` catches it (the more common
# handler).  Code catching BadStatusLine must also list this class.
class RemoteDisconnected(ConnectionResetError):
    def __init__(self, *pos):
        ConnectionResetError.__init__(self, *pos)


class HTTPMessage:
    """Case-insensitive multidict of response headers.

    Stand-in for the email.message.Message that CPython's http.client
    returns: supports the mapping surface consumers actually use —
    get/[], get_all, items, keys, __contains__, __iter__."""

    def __init__(self):
        self._headers = []        # [(name, value)] in arrival order

    def add_header(self, name, value):
        self._headers.append((name, value))

    def get(self, name, default=None):
        lower = name.lower()
        for k, v in self._headers:
            if k.lower() == lower:
                return v
        return default

    def get_all(self, name, default=None):
        lower = name.lower()
        found = [v for k, v in self._headers if k.lower() == lower]
        if found:
            return found
        return default

    def items(self):
        return list(self._headers)

    def keys(self):
        return [k for k, v in self._headers]

    def values(self):
        return [v for k, v in self._headers]

    def __getitem__(self, name):
        # email.message semantics: missing -> None, not KeyError
        return self.get(name)

    def __contains__(self, name):
        return self.get(name) is not None

    def __iter__(self):
        return iter(self.keys())

    def __len__(self):
        return len(self._headers)


class HTTPResponse(io.BufferedIOBase):
    # Like CPython, the response reads through its OWN file object
    # (``sock.makefile('rb')``) rather than off the raw socket.  That is
    # what makes the standard ``Connection: close`` flow work: the
    # connection closes the socket as soon as the headers say it will
    # close, and the still-open file object keeps the underlying socket
    # alive until the body has been read (see the _io_refs handshake in
    # socket.PySocket).
    def __init__(self, sock, method=None, url=''):
        self.fp = sock.makefile('rb')
        self._method = method
        self.url = url
        self.headers = None
        self.msg = None              # alias kept for stdlib compat
        self.version = 10
        self.status = None
        self.reason = None
        self.chunked = False
        self.length = None           # None -> read to EOF
        self.will_close = False
        self._body_read = False

    def _readline(self):
        """One line, bounded by _MAX_LINE (CPython's fp.readline(_MAXLINE+1))."""
        line = self.fp.readline(_MAX_LINE + 1)
        if len(line) > _MAX_LINE:
            raise LineTooLong('header line')
        return line

    def _read_status(self):
        line = self._readline()
        if not line:
            raise RemoteDisconnected(
                'Remote end closed connection without response')
        line = line.decode('utf-8').rstrip('\r\n')
        version, _, rest = line.partition(' ')
        status_str, _, reason = rest.partition(' ')
        reason = reason.strip()
        if not status_str or not version.startswith('HTTP/'):
            raise BadStatusLine(line)
        try:
            status = int(status_str)
        except ValueError:
            raise BadStatusLine(line)
        if status < 100 or status > 999:
            raise BadStatusLine(line)
        if version == 'HTTP/1.0':
            self.version = 10
        elif version.startswith('HTTP/1.'):
            self.version = 11
        else:
            raise UnknownProtocol(version)
        return status, reason

    def _read_headers(self):
        headers = HTTPMessage()
        count = 0
        last_name = None
        while True:
            line = self._readline()
            if not line:
                break
            text = line.decode('utf-8').rstrip('\r\n')
            if text == '':
                break
            count = count + 1
            if count > _MAX_HEADERS:
                raise HTTPException('got more than %d headers' % _MAX_HEADERS)
            if (text.startswith(' ') or text.startswith('\t')) \
                    and last_name is not None:
                # obs-fold continuation: append to the previous value
                prev = headers._headers.pop()
                headers.add_header(prev[0], prev[1] + ' ' + text.strip())
                continue
            if ':' not in text:
                continue
            name, _, value = text.partition(':')
            headers.add_header(name.strip(), value.strip())
            last_name = name
        return headers

    def begin(self):
        # Skip any number of 1xx informational responses.
        while True:
            status, reason = self._read_status()
            if status != 100 and status != 101:
                break
            # discard the informational response's headers
            self._read_headers()
        self.status = status
        self.reason = reason
        self.headers = self._read_headers()
        self.msg = self.headers

        transfer = self.headers.get('transfer-encoding', '')
        if transfer and 'chunked' in transfer.lower():
            self.chunked = True
            self.length = None
        else:
            length = self.headers.get('content-length')
            if length is not None:
                try:
                    self.length = int(length.strip())
                except ValueError:
                    self.length = None
            else:
                self.length = None

        # No-body statuses and HEAD responses.
        if (status == 204 or status == 304 or 100 <= status < 200
                or self._method == 'HEAD'):
            self.length = 0
            self.chunked = False

        conn_header = self.headers.get('connection', '')
        if self.version == 11:
            self.will_close = 'close' in conn_header.lower()
        else:
            self.will_close = 'keep-alive' not in conn_header.lower()
        if not self.chunked and self.length is None:
            self.will_close = True
        return self

    def _read_chunked(self):
        chunks = []
        while True:
            size_line = self._readline().decode('utf-8').strip()
            if ';' in size_line:
                size_line = size_line.split(';', 1)[0].strip()
            if size_line == '':
                raise HTTPException('truncated chunked body')
            size = int(size_line, 16)
            if size == 0:
                # consume optional trailers up to the blank line
                while True:
                    trailer = self._readline()
                    if not trailer or trailer == b'\r\n' or trailer == b'\n':
                        break
                break
            chunks.append(self.fp.read(size))
            self.fp.read(2)     # trailing CRLF after each chunk
        return b''.join(chunks)

    def read(self, amt=None):
        """Read the response body.

        With no argument returns the whole remaining body (decoding
        chunked transfer); with amt only plain-length reads support
        partial consumption."""
        if self._body_read:
            return b''
        if self.chunked:
            self._body_read = True
            return self._read_chunked()
        if self.length is not None:
            if amt is not None and amt < self.length:
                data = self.fp.read(amt)
                self.length = self.length - len(data)
                return data
            data = self.fp.read(self.length)
            self._body_read = True
            return data
        if amt is not None:
            return self.fp.read(amt)
        self._body_read = True
        return self.fp.read()

    def getheader(self, name, default=None):
        if self.headers is None:
            raise ResponseNotReady()
        return self.headers.get(name, default)

    def getheaders(self):
        if self.headers is None:
            raise ResponseNotReady()
        return self.headers.items()

    def isclosed(self):
        return self.closed

    def close(self):
        # Closing the response drops its reference to the socket, which
        # is what finally releases the underlying GsSocket once the
        # connection has closed too (CPython's _decref_socketios).
        #
        # ``closed'' is INHERITED, not ours to set.  While io.BufferedIOBase
        # was a marker class with no behaviour, this class carried its own
        # ``self.closed'' flag; the real base makes it a read-only property
        # over IOBase's own state, so assigning it raises "property 'closed'
        # has no setter" and super().close() is what actually sets it.
        super().close()
        fp = self.fp
        if fp is not None:
            self.fp = None
            fp.close()

    def readable(self):
        return True

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, tb):
        self.close()
        return False

    def geturl(self):
        return self.url

    def getcode(self):
        return self.status

    def info(self):
        return self.headers


# Connection state machine values (mirrors CPython's strings).
_CS_IDLE = 'Idle'
_CS_REQ_STARTED = 'Request-started'
_CS_REQ_SENT = 'Request-sent'


class HTTPConnection:
    default_port = HTTP_PORT
    _http_vsn_str = 'HTTP/1.1'

    def __init__(self, host, port=None, timeout=None, blocksize=8192):
        self.sock = None
        self.timeout = timeout
        self.blocksize = blocksize
        self._buffer = []
        self._state = _CS_IDLE
        self._response_method = None
        self.host, self.port = self._get_hostport(host, port)

    def _get_hostport(self, host, port):
        if port is None:
            if host.startswith('[') and ']' in host:
                # [v6addr]:port or bare [v6addr]
                close = host.find(']')
                rest = host[close + 1:]
                if rest.startswith(':'):
                    port = self._port_from(rest[1:], host)
                else:
                    port = self.default_port
                host = host[1:close]
            elif ':' in host:
                host, _, port_str = host.rpartition(':')
                port = self._port_from(port_str, host)
            else:
                port = self.default_port
        return host, port

    def _port_from(self, port_str, host):
        try:
            return int(port_str)
        except ValueError:
            raise InvalidURL("nonnumeric port: '%s'" % port_str)

    def set_tunnel(self, host, port=None, headers=None):
        raise NotImplementedError(
            'Grail http.client does not support CONNECT tunneling/proxies')

    def connect(self):
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        if self.timeout is not None:
            self.sock.settimeout(self.timeout)
        self.sock.connect((self.host, self.port))

    def close(self):
        self._state = _CS_IDLE
        sock = self.sock
        if sock is not None:
            self.sock = None
            sock.close()

    def send(self, data):
        if self.sock is None:
            raise NotConnected()
        if isinstance(data, str):
            data = data.encode('utf-8')
        self.sock.sendall(data)

    def putrequest(self, method, url, skip_host=False,
                   skip_accept_encoding=False):
        if self._state != _CS_IDLE:
            raise CannotSendRequest(self._state)
        self._state = _CS_REQ_STARTED
        self._response_method = method
        if not url:
            url = '/'
        self._buffer = ['%s %s %s' % (method, url, self._http_vsn_str)]
        if not skip_host:
            host = self.host
            if ':' in host and not host.startswith('['):
                host = '[' + host + ']'
            if self.port == self.default_port:
                self.putheader('Host', host)
            else:
                self.putheader('Host', '%s:%s' % (host, self.port))
        if not skip_accept_encoding:
            self.putheader('Accept-Encoding', 'identity')

    def putheader(self, header, *values):
        if self._state != _CS_REQ_STARTED:
            raise CannotSendHeader()
        parts = []
        for v in values:
            if isinstance(v, bytes):
                v = v.decode('utf-8')
            elif not isinstance(v, str):
                v = str(v)
            parts.append(v)
        self._buffer.append('%s: %s' % (header, '\r\n\t'.join(parts)))

    def endheaders(self, message_body=None):
        if self._state != _CS_REQ_STARTED:
            raise CannotSendHeader()
        self._state = _CS_REQ_SENT
        self._buffer.append('')
        self._buffer.append('')
        payload = '\r\n'.join(self._buffer).encode('utf-8')
        self._buffer = []
        if self.sock is None:
            self.connect()
        self.sock.sendall(payload)
        if message_body is not None:
            self.send(message_body)

    def request(self, method, url, body=None, headers=None,
                encode_chunked=False):
        if headers is None:
            headers = {}
        header_names = [k.lower() for k in headers]
        self.putrequest(method, url)
        if body is not None and 'content-length' not in header_names:
            if isinstance(body, str):
                length = len(body.encode('utf-8'))
            else:
                length = len(body)
            self.putheader('Content-Length', str(length))
        for name in headers:
            self.putheader(name, headers[name])
        self.endheaders(body)

    def getresponse(self):
        if self._state != _CS_REQ_SENT:
            raise ResponseNotReady(self._state)
        if self.sock is None:
            raise NotConnected()
        response = HTTPResponse(self.sock, method=self._response_method)
        response.begin()
        self._state = _CS_IDLE
        if response.will_close:
            self.close()
        return response


class HTTPSConnection(HTTPConnection):
    default_port = HTTPS_PORT

    def __init__(self, host, port=None, timeout=None, blocksize=8192,
                 context=None):
        HTTPConnection.__init__(self, host, port, timeout, blocksize)
        if context is None:
            import ssl
            context = ssl.create_default_context()
        self._context = context

    def connect(self):
        HTTPConnection.connect(self)
        self.sock = self._context.wrap_socket(
            self.sock, server_hostname=self.host)
