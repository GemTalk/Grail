# Minimal http.client for Grail — the CLIENT subset: HTTPConnection,
# HTTPSConnection, HTTPResponse, and the standard exception hierarchy.
#
# This is a hand-rolled shim, not the CPython source drop.  Upstream
# http/client.py parses response headers through email.parser /
# email.message (policy framework, feedparser state machine) — a far
# larger port than the client itself.  HTTP/1.1 response headers are
# simple enough to parse inline; if the full email package ever lands,
# revisiting the source-drop route is tracked in docs/Support_Twilio.md.
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

import socket
from collections import OrderedDict
from urllib.parse import urlsplit

__all__ = [
    'HTTPConnection', 'HTTPSConnection', 'HTTPResponse', 'HTTPMessage',
    'HTTPException', 'NotConnected', 'InvalidURL', 'UnknownProtocol',
    'ImproperConnectionState', 'CannotSendRequest', 'CannotSendHeader',
    'ResponseNotReady', 'BadStatusLine', 'LineTooLong',
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


class _SocketReader:
    """Buffered reader over the recv() protocol (PySocket or SSLSocket)."""

    def __init__(self, sock):
        self._sock = sock
        self._buf = b''
        self._eof = False

    def _fill(self):
        if self._eof:
            return False
        chunk = self._sock.recv(8192)
        if not chunk:
            self._eof = True
            return False
        self._buf = self._buf + chunk
        return True

    def readline(self):
        """Read up to and including a \\n.  b'' means EOF."""
        while True:
            idx = self._buf.find(b'\n')
            if idx >= 0:
                line = self._buf[:idx + 1]
                self._buf = self._buf[idx + 1:]
                return line
            if len(self._buf) > _MAX_LINE:
                raise LineTooLong('header line')
            if not self._fill():
                line = self._buf
                self._buf = b''
                return line

    def read(self, amt):
        """Read exactly amt bytes (less only at EOF)."""
        while len(self._buf) < amt:
            if not self._fill():
                break
        data = self._buf[:amt]
        self._buf = self._buf[amt:]
        return data

    def read_to_eof(self):
        while self._fill():
            pass
        data = self._buf
        self._buf = b''
        return data


class HTTPResponse:
    def __init__(self, sock, method=None, url=''):
        self._reader = _SocketReader(sock)
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
        self.closed = False

    def _read_status(self):
        line = self._reader.readline()
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
            line = self._reader.readline()
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
            size_line = self._reader.readline().decode('utf-8').strip()
            if ';' in size_line:
                size_line = size_line.split(';', 1)[0].strip()
            if size_line == '':
                raise HTTPException('truncated chunked body')
            size = int(size_line, 16)
            if size == 0:
                # consume optional trailers up to the blank line
                while True:
                    trailer = self._reader.readline()
                    if not trailer or trailer == b'\r\n' or trailer == b'\n':
                        break
                break
            chunks.append(self._reader.read(size))
            self._reader.read(2)     # trailing CRLF after each chunk
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
                data = self._reader.read(amt)
                self.length = self.length - len(data)
                return data
            data = self._reader.read(self.length)
            self._body_read = True
            return data
        if amt is not None:
            return self._reader.read(amt)
        self._body_read = True
        return self._reader.read_to_eof()

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
        self.closed = True

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
