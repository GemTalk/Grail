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
#   * Response headers as a REAL email.message.Message subclass
#     (HTTPMessage), plus the public parse_headers(fp, _class=...)
#
# Connection setup follows CPython exactly, because third-party clients
# construct the connection by KEYWORD and a missing parameter is a
# TypeError at the call site rather than a subtly different connection:
#   HTTPConnection(host, port=None,
#                  timeout=socket._GLOBAL_DEFAULT_TIMEOUT,
#                  source_address=None, blocksize=8192)
#   HTTPSConnection(host, port=None, *, timeout=..., source_address=None,
#                   context=None, blocksize=8192)
# ``timeout'' defaults to the SENTINEL (socket._GLOBAL_DEFAULT_TIMEOUT),
# which means "whatever socket.getdefaulttimeout() says"; an explicit
# ``timeout=None'' means blocking.  ``source_address'' is really bound --
# connect() goes through socket.create_connection, whose bind() maps onto
# GsSocket bindTo:toAddress:, so the peer sees the source port asked for.
#
# Not supported: proxies/tunneling (set_tunnel raises), trailers are
# read and discarded, no 100-continue request mode, no chunked REQUEST
# bodies (``encode_chunked'' is accepted and ignored), and no request-side
# header name/value validation (CPython's _validate_method / _validate_path
# / _validate_host and the _is_legal_header_name checks in putheader).
#
# Header parsing is hand-rolled rather than handed to email.parser
# (Grail's Parser takes no _class= and records no defects), but it
# follows Compat32.header_source_parse and the feedparser's defect
# rules closely enough that urllib3.util.response.assert_header_parsing
# behaves as it does on CPython.  What it does NOT do: RFC 2047
# encoded-word decoding, Unix-From lines, or any policy other than
# compat32.
#
# Socket lifetime follows CPython: HTTPResponse reads through its own
# sock.makefile('rb') handle, and socket.close() defers releasing the
# GsSocket until the last such handle closes (socket._io_refs).  That is
# what lets the ordinary Connection: close flow read its body after
# getresponse() has already closed the connection.

import email.errors
import email.message
import errno
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
    'parse_headers',
]

HTTP_PORT = 80
HTTPS_PORT = 443

_MAX_LINE = 65536
_MAX_HEADERS = 100

# CPython spells these _MAXLINE / _MAXHEADERS, and third-party code reads
# them off the module by that name (urllib3's backported _tunnel does, on
# Pythons older than 3.11.9).  Same objects, both spellings.
_MAXLINE = _MAX_LINE
_MAXHEADERS = _MAX_HEADERS

# NOTE: the "no timeout was given" sentinel is spelled
# ``socket._GLOBAL_DEFAULT_TIMEOUT`` at every use below, NOT re-exported under
# a local name -- CPython's http.client has no such module attribute, and
# adding one here would be a difference of its own.  It is distinct from an
# explicit ``timeout=None``, which means BLOCKING: socket.create_connection
# calls settimeout only when the value is not the sentinel.

# CPython swallows exactly this errno from the TCP_NODELAY setsockopt, for
# platforms whose TCP stack has no such option.
_ENOPROTOOPT = getattr(errno, 'ENOPROTOOPT', 42)

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


class HTTPMessage(email.message.Message):
    """The response-headers object: a real ``email.message.Message``.

    CPython's is ``class HTTPMessage(email.message.Message)`` whose only
    addition is getallmatchingheaders, and callers rely on the ancestry
    as well as the surface -- urllib3.util.response.assert_header_parsing
    opens with ``isinstance(headers, httplib.HTTPMessage)`` and then uses
    is_multipart / get_payload / defects, all of which come from Message.
    This used to be a stand-alone shim with a hand-copied mapping surface;
    it is now the subclass, so ancestry checks answer correctly and the
    payload/defects surface is inherited rather than imitated.
    """

    def getallmatchingheaders(self, name):
        """All header lines matching ``name``, continuation lines included.

        Ported verbatim from CPython, INCLUDING its long-standing quirk:
        keys() yields bare header names, so the ``name + ':'`` probe never
        matches and the result is always [].  http.server's CGI handler is
        the only caller upstream.  Kept for surface compatibility, not
        because it is useful.
        """
        name = name.lower() + ':'
        n = len(name)
        lst = []
        hit = 0
        for line in self.keys():
            if line[:n].lower() == name:
                hit = 1
            elif not line[:1].isspace():
                hit = 0
            if hit:
                lst.append(line)
        return lst


def _read_headers(fp, max_headers=None):
    """Read the raw header lines off ``fp``, up to and including the blank
    line that ends the block (CPython's http.client._read_headers)."""
    if max_headers is None:
        max_headers = _MAX_HEADERS
    headers = []
    while True:
        line = fp.readline(_MAX_LINE + 1)
        if len(line) > _MAX_LINE:
            raise LineTooLong('header line')
        headers.append(line)
        if len(headers) > max_headers:
            raise HTTPException('got more than %d headers' % max_headers)
        if line == b'\r\n' or line == b'\n' or line == b'':
            break
    return headers


def _header_source_parse(source_lines):
    """(name, value) for one logical header, folding included.

    This is email._policybase.Compat32.header_source_parse: the value is
    everything after the first colon with leading spaces/tabs removed,
    then the continuation lines VERBATIM, then a single trailing line
    ending stripped.  A folded header therefore keeps its embedded
    ``\r\n``, exactly as CPython's parser leaves it.
    """
    name, sep, value = source_lines[0].partition(':')
    value = value.lstrip(' \t')
    i = 1
    while i < len(source_lines):
        value = value + source_lines[i]
        i = i + 1
    return name, value.rstrip('\r\n')


def _parse_header_lines(header_lines, _class=None):
    """Turn raw header lines into a ``_class`` (default HTTPMessage).

    Stands in for ``email.parser.Parser(_class=...).parsestr()``, which
    Grail's email.parser does not offer, and reproduces the two defects
    that matter to urllib3.util.response.assert_header_parsing:

      * a first line that is a continuation is DROPPED with a
        FirstHeaderLineIsContinuationDefect, and parsing carries on;
      * a line with no colon ends the header block with a
        MissingHeaderBodySeparatorDefect, and that line and everything
        after it -- the terminating blank line included -- becomes the
        payload.

    A well-formed block leaves ``defects == []`` and the payload ``''``,
    which is what makes assert_header_parsing pass.
    """
    if _class is None:
        _class = HTTPMessage
    msg = _class()
    lines = []
    for raw in header_lines:
        if isinstance(raw, bytes):
            lines.append(raw.decode('iso-8859-1'))
        else:
            lines.append(raw)
    pending = None                   # source lines of the header being folded
    body_start = len(lines)
    i = 0
    n = len(lines)
    while i < n:
        line = lines[i]
        if line == '' or line == '\r\n' or line == '\n':
            body_start = i + 1       # the blank line ends the block
            break
        first = line[:1]
        if first == ' ' or first == '\t':
            if pending is None:
                msg.defects.append(
                    email.errors.FirstHeaderLineIsContinuationDefect(line))
            else:
                pending.append(line)
            i = i + 1
            continue
        if ':' not in line:
            msg.defects.append(
                email.errors.MissingHeaderBodySeparatorDefect())
            body_start = i           # this line starts the body
            break
        if pending is not None:
            name, value = _header_source_parse(pending)
            msg[name] = value
        pending = [line]
        i = i + 1
    if pending is not None:
        name, value = _header_source_parse(pending)
        msg[name] = value
    msg.set_payload(''.join(lines[body_start:]))
    return msg


def parse_headers(fp, _class=None):
    """Parse only RFC 5322 headers from a file pointer.

    CPython's signature is ``parse_headers(fp, _class=HTTPMessage)``; the
    default is spelled as None here because Grail rebuilds a parameter
    default on every call and a late lookup keeps a subclassing caller
    honest.  Leaves ``fp`` positioned at the first byte of the body.
    """
    return _parse_header_lines(_read_headers(fp), _class)


class HTTPResponse(io.BufferedIOBase):
    # Like CPython, the response reads through its OWN file object
    # (``sock.makefile('rb')``) rather than off the raw socket.  That is
    # what makes the standard ``Connection: close`` flow work: the
    # connection closes the socket as soon as the headers say it will
    # close, and the still-open file object keeps the underlying socket
    # alive until the body has been read (see the _io_refs handshake in
    # socket.PySocket).
    def __init__(self, sock, debuglevel=0, method=None, url=None):
        # ``debuglevel'' sits in the SECOND positional slot because CPython
        # puts it there: http.client itself constructs the response as
        # ``self.response_class(self.sock, self.debuglevel, method=...)'',
        # positionally, and so does anything modelled on it.
        self.fp = sock.makefile('rb')
        self.debuglevel = debuglevel
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
        """The response's header block, as an HTTPMessage.

        Delegates to the module-level parse_headers so the response path
        and the public entry point cannot drift apart -- including the
        LineTooLong / _MAX_HEADERS bounds, which now live in
        _read_headers(fp).
        """
        return parse_headers(self.fp)

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
        """The value of the header matching *name*, or *default*.

        REPEATED headers are joined with ', ', as CPython does -- returning
        only the first was wrong for the headers that legitimately repeat
        (Set-Cookie aside, which callers read with get_all)."""
        if self.headers is None:
            raise ResponseNotReady()
        found = self.headers.get_all(name)
        if not found:
            return default
        return ', '.join(found)

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
    _http_vsn = 11
    _http_vsn_str = 'HTTP/1.1'
    response_class = HTTPResponse
    default_port = HTTP_PORT
    auto_open = 1
    debuglevel = 0

    def __init__(self, host, port=None,
                 timeout=socket._GLOBAL_DEFAULT_TIMEOUT,
                 source_address=None, blocksize=8192):
        """Set up a connection to *host*.

        The signature is CPython's, positionally and by name -- urllib3
        forwards ``timeout=``/``source_address=``/``blocksize=`` to it as
        keywords, so an omitted parameter is a TypeError at the call, not a
        quietly different connection.

        *timeout* defaults to the SENTINEL, not to None: the sentinel means
        "whatever socket.getdefaulttimeout() says", while an explicit None
        means blocking regardless of that default.

        *source_address* is a ``(host, port)`` to bind before connecting, and
        it is really bound -- see connect().
        """
        self.timeout = timeout
        self.source_address = source_address
        self.blocksize = blocksize
        self.sock = None
        self._buffer = []
        self._response = None
        self._state = _CS_IDLE
        # CPython's name for the method of the request in flight.  It was
        # ``_response_method'' here; anything modelled on http.client (urllib3's
        # backported _tunnel, for one) reads ``self._method''.
        self._method = None
        self._tunnel_host = None
        self._tunnel_port = None
        self._tunnel_headers = {}
        self._raw_proxy_headers = None

        self.host, self.port = self._get_hostport(host, port)

        # An instance variable, exactly as in CPython, so a test can replace
        # it with a stand-in without patching the module.
        self._create_connection = socket.create_connection

    def _get_hostport(self, host, port):
        if port is None:
            i = host.rfind(':')
            j = host.rfind(']')          # ipv6 addresses have [...]
            if i > j:
                port_str = host[i + 1:]
                if port_str == '':
                    # http://foo.com:/ == http://foo.com/
                    port = self.default_port
                else:
                    port = self._port_from(port_str, host)
                host = host[:i]
            else:
                port = self.default_port
        # Unconditional, as in CPython: HTTPConnection('[::1]', 80) has to
        # strip the brackets too, not just the port-parsing branch.
        if host and host[0] == '[' and host[-1] == ']':
            host = host[1:-1]
        return host, port

    def _port_from(self, port_str, host):
        try:
            return int(port_str)
        except ValueError:
            raise InvalidURL("nonnumeric port: '%s'" % port_str)

    def set_debuglevel(self, level):
        self.debuglevel = level

    def set_tunnel(self, host, port=None, headers=None):
        raise NotImplementedError(
            'Grail http.client does not support CONNECT tunneling/proxies')

    def connect(self):
        """Open the socket to (host, port), binding source_address first.

        Routed through socket.create_connection rather than a bare
        socket()+connect() so that this is the same code path CPython uses:
        it walks getaddrinfo (so an IPv6 host works), applies the timeout only
        when one was actually given, and BINDS source_address before
        connecting.

        source_address is honoured for real on GemStone -- PyRawSocket>>bind:
        maps onto GsSocket bindTo:toAddress:, and a connection made with
        source_address=('127.0.0.1', 55731) arrives at the peer from port
        55731.  It is not accepted-and-ignored.
        """
        timeout = self.timeout
        if timeout is None and socket.getdefaulttimeout() is None:
            # DELIBERATE GRAIL DEVIATION, and it is load-bearing.
            #
            # CPython's connect() hands ``timeout'' straight to
            # create_connection, which calls settimeout(None) for an explicit
            # None.  On GemStone settimeout(None) does not just record
            # "blocking": it calls GsSocket>>makeBlocking, which makes the
            # socket blocking AT THE OS LEVEL -- and Grail's threads are
            # GREEN, so a blocking recv never yields and a loopback server
            # running on another thread never gets to accept.  Measured: the
            # same request that completes without the settimeout call hangs
            # forever with it (tests/python/use_http_client.py's
            # green_thread_server_roundtrip is that case, and it is what
            # tests/python/twilio_client.py has been relying on all along).
            #
            # So when the end state would be identical -- an explicit
            # timeout=None with no socket.setdefaulttimeout() in force, which
            # is what requests and urllib.request pass -- skip the call and
            # let create_connection leave the socket at the session default.
            # A socket created here already starts at that default
            # (PyRawSocket>>initialize reads ___defaultTimeout___), so this
            # changes nothing except that makeBlocking is not sent.
            #
            # It does NOT fix the underlying defect: settimeout with a real
            # number still calls makeBlocking and still starves green
            # threads.  See docs/Issues.md.
            timeout = socket._GLOBAL_DEFAULT_TIMEOUT
        self.sock = self._create_connection(
            (self.host, self.port), timeout, self.source_address)
        # Might fail on a stack with no such option.  Grail's setsockopt
        # accepts-and-ignores an option GsSocket has no counterpart for, so in
        # practice this does not raise here; the guard is CPython's.
        try:
            self.sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
        except OSError as e:
            if e.errno != _ENOPROTOOPT:
                raise

        if self._tunnel_host:
            # Only reachable if a subclass set _tunnel_host directly; our own
            # set_tunnel refuses.  Fail loudly rather than send the request in
            # the clear to the proxy.
            raise NotImplementedError(
                'Grail http.client does not support CONNECT tunneling/proxies')

    def close(self):
        self._state = _CS_IDLE
        try:
            sock = self.sock
            if sock is not None:
                self.sock = None
                sock.close()
        finally:
            response = self._response
            if response is not None:
                self._response = None
                response.close()

    def send(self, data):
        # CPython opens the connection here when auto_open is set, and only
        # raises NotConnected when it is not.  urllib3 sends body chunks
        # through this after endheaders(), so the reconnect path matters.
        if self.sock is None:
            if self.auto_open:
                self.connect()
            else:
                raise NotConnected()
        if isinstance(data, str):
            data = data.encode('utf-8')
        self.sock.sendall(data)

    def putrequest(self, method, url, skip_host=False,
                   skip_accept_encoding=False):
        if self._state != _CS_IDLE:
            raise CannotSendRequest(self._state)
        self._state = _CS_REQ_STARTED
        self._method = method
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
        response = self.response_class(self.sock, self.debuglevel,
                                       method=self._method)
        response.begin()
        self._state = _CS_IDLE
        if response.will_close:
            self.close()
        else:
            self._response = response
        return response


class HTTPSConnection(HTTPConnection):
    default_port = HTTPS_PORT

    def __init__(self, host, port=None, *,
                 timeout=socket._GLOBAL_DEFAULT_TIMEOUT,
                 source_address=None, context=None, blocksize=8192):
        """CPython's signature: everything after *port* is KEYWORD-ONLY.

        That is not cosmetic.  The old order here was
        ``(host, port, timeout, blocksize, context)``, so a caller who copied
        CPython's positional ``HTTPSConnection(h, p, timeout)`` -- or
        urllib3's keyword forward, which passes source_address -- either bound
        the wrong parameter or raised TypeError.  Keyword-only makes both the
        same call it is under CPython.
        """
        HTTPConnection.__init__(self, host, port, timeout, source_address,
                                blocksize=blocksize)
        if context is None:
            import ssl
            context = ssl.create_default_context()
        self._context = context

    def connect(self):
        HTTPConnection.connect(self)
        # CPython uses _tunnel_host for the SNI name when tunneling; there is
        # no tunneling here (HTTPConnection.connect refuses one), so the host
        # is always the SNI name.
        self.sock = self._context.wrap_socket(
            self.sock, server_hostname=self.host)
