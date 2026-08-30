# Fixture for HttpClientTestCase.
#
# Exercises Grail's hand-rolled http.client (HTTPConnection /
# HTTPResponse) against an in-process loopback server, using the same
# deterministic single-session pattern as use_socket.py: the client's
# connect + request bytes complete via the OS listen backlog + send
# buffer before the server accept()s, so no second thread is needed.
#
# Each helper opens a fresh listening socket, issues a real
# HTTPConnection request against it, then plays the server side by
# hand with a canned HTTP response.

import email.errors
import email.message
import io
import socket
import threading
import http.client


def _accept_and_read_request(srv):
    """accept(), read one full request (headers + Content-Length body),
    and return (conn, raw_request_text)."""
    conn, addr = srv.accept()
    data = b''
    while b'\r\n\r\n' not in data:
        chunk = conn.recv(8192)
        if not chunk:
            break
        data = data + chunk
    head, _, rest = data.partition(b'\r\n\r\n')
    text = head.decode('utf-8')
    lower = text.lower()
    if 'content-length:' in lower:
        marker = lower.find('content-length:')
        line_end = text.find('\r\n', marker)
        if line_end == -1:
            line_end = len(text)
        length = int(text[marker + len('content-length:'):line_end].strip())
        while len(rest) < length:
            chunk = conn.recv(8192)
            if not chunk:
                break
            rest = rest + chunk
    return conn, text + '\r\n\r\n' + rest.decode('utf-8')


def _listen():
    srv = socket.socket()
    srv.bind(('127.0.0.1', 0))
    srv.listen(1)
    return srv, srv.getsockname()[1]


def get_content_length():
    """GET with a Content-Length response body over keep-alive."""
    srv, port = _listen()
    client = http.client.HTTPConnection('127.0.0.1', port)
    client.request('GET', '/hello?x=1')

    conn, request_text = _accept_and_read_request(srv)
    conn.sendall(b'HTTP/1.1 200 OK\r\n'
                 b'Content-Type: text/plain\r\n'
                 b'Content-Length: 11\r\n'
                 b'\r\n'
                 b'hello world')

    resp = client.getresponse()
    body = resp.read()
    result = {
        'status': resp.status,
        'reason': resp.reason,
        'body': body.decode('utf-8'),
        'ctype': resp.getheader('content-type'),
        'ctype_titled': resp.getheader('Content-Type'),
        'request_line': request_text.split('\r\n')[0],
        'has_host': 'Host: 127.0.0.1:' + str(port) in request_text,
    }
    conn.close()
    client.close()
    srv.close()
    return result


def post_body():
    """POST with a request body; server echoes what it saw."""
    srv, port = _listen()
    client = http.client.HTTPConnection('127.0.0.1', port)
    payload = 'To=%2B15551234567&Body=Hi+there'
    client.request('POST', '/v1/Messages', body=payload,
                   headers={'Content-Type':
                            'application/x-www-form-urlencoded'})

    conn, request_text = _accept_and_read_request(srv)
    conn.sendall(b'HTTP/1.1 201 Created\r\n'
                 b'Content-Length: 2\r\n'
                 b'\r\n'
                 b'{}')

    resp = client.getresponse()
    resp.read()
    result = {
        'status': resp.status,
        'request_has_clen': 'Content-Length: 31' in request_text,
        'request_has_ctype':
            'Content-Type: application/x-www-form-urlencoded'
            in request_text,
        'request_body': request_text.split('\r\n\r\n')[1],
    }
    conn.close()
    client.close()
    srv.close()
    return result


def chunked_response():
    """Chunked transfer-encoding decode, including a chunk extension."""
    srv, port = _listen()
    client = http.client.HTTPConnection('127.0.0.1', port)
    client.request('GET', '/stream')

    conn, request_text = _accept_and_read_request(srv)
    conn.sendall(b'HTTP/1.1 200 OK\r\n'
                 b'Transfer-Encoding: chunked\r\n'
                 b'\r\n'
                 b'5\r\nhello\r\n'
                 b'1;ext=1\r\n \r\n'
                 b'6\r\nworld!\r\n'
                 b'0\r\n\r\n')

    resp = client.getresponse()
    body = resp.read()
    result = {
        'status': resp.status,
        'body': body.decode('utf-8'),
        'chunked': resp.chunked,
    }
    conn.close()
    client.close()
    srv.close()
    return result


def head_no_body():
    """HEAD: headers present, zero-length body even with Content-Length."""
    srv, port = _listen()
    client = http.client.HTTPConnection('127.0.0.1', port)
    client.request('HEAD', '/doc')

    conn, request_text = _accept_and_read_request(srv)
    conn.sendall(b'HTTP/1.1 200 OK\r\n'
                 b'Content-Length: 5000\r\n'
                 b'Connection: close\r\n'
                 b'\r\n')

    resp = client.getresponse()
    body = resp.read()
    result = {
        'status': resp.status,
        'body_len': len(body),
        'clen_header': resp.getheader('Content-Length'),
    }
    conn.close()
    client.close()
    srv.close()
    return result


def error_status():
    """4xx flows through as a normal response (no raise at this layer)."""
    srv, port = _listen()
    client = http.client.HTTPConnection('127.0.0.1', port)
    client.request('GET', '/missing')

    conn, request_text = _accept_and_read_request(srv)
    conn.sendall(b'HTTP/1.1 404 Not Found\r\n'
                 b'Content-Length: 26\r\n'
                 b'\r\n'
                 b'{"error": "no such thing"}')

    resp = client.getresponse()
    body = resp.read()
    result = {
        'status': resp.status,
        'reason': resp.reason,
        'body': body.decode('utf-8'),
    }
    conn.close()
    client.close()
    srv.close()
    return result


def connection_close_body():
    """``Connection: close`` — the body must still be readable.

    getresponse() closes the connection as soon as the headers say the
    server will close, so the response is reading through a file object
    over an already-closed socket.  CPython keeps the socket alive until
    the last makefile() handle closes (socket._io_refs); without that the
    read below fails with a nil GsSocket."""
    srv, port = _listen()
    client = http.client.HTTPConnection('127.0.0.1', port)
    client.request('GET', '/bye', headers={'Connection': 'close',
                                           'Host': '127.0.0.1'})

    # The body must be bigger than one recv() (8192) or the reader
    # buffers the whole response while the socket is still open and the
    # bug never fires -- the body has to be fetched AFTER the close.
    payload = b'goodbye' * 3000          # 21000 bytes
    conn, request_text = _accept_and_read_request(srv)
    conn.sendall(b'HTTP/1.1 200 OK\r\n'
                 b'Content-Type: text/plain\r\n'
                 b'Content-Length: ' + str(len(payload)).encode('ascii') +
                 b'\r\n'
                 b'Connection: close\r\n'
                 b'\r\n' + payload)

    resp = client.getresponse()
    will_close = resp.will_close
    sock_dropped = client.sock is None
    body = resp.read()
    result = {
        'status': resp.status,
        'will_close': will_close,
        'sock_dropped': sock_dropped,
        'body_len': len(body),
        'body_intact': body == payload,
    }
    resp.close()
    conn.close()
    client.close()
    srv.close()
    return result


def response_context_manager():
    """The response is an io.BufferedIOBase, so ``with resp:`` works."""
    srv, port = _listen()
    client = http.client.HTTPConnection('127.0.0.1', port)
    client.request('GET', '/ctx')

    conn, request_text = _accept_and_read_request(srv)
    conn.sendall(b'HTTP/1.1 200 OK\r\n'
                 b'Content-Length: 5\r\n'
                 b'\r\n'
                 b'inctx')

    resp = client.getresponse()
    with resp as r:
        body = r.read()
    result = {
        'body': body.decode('utf-8'),
        'closed_after': resp.closed,
        'is_bufferedio': isinstance(resp, io.BufferedIOBase),
        'readable': True,
    }
    conn.close()
    client.close()
    srv.close()
    return result


def socket_io_refs():
    """socket.close() defers the real close while makefile() handles live."""
    srv, port = _listen()
    client = socket.socket()
    client.connect(('127.0.0.1', port))
    conn, addr = srv.accept()
    conn.sendall(b'payload')

    fp = client.makefile('rb')
    client.close()                  # marked closed, but fp still holds it
    alive_after_close = client.fileno() != -1
    data = fp.read(7)               # must still work
    fp.close()                      # last handle -> real close
    released = client.fileno() == -1

    conn.close()
    srv.close()
    return {
        'alive_after_close': alive_after_close,
        'data': data.decode('utf-8'),
        'released_after_fp_close': released,
    }


def green_thread_server_roundtrip():
    """A request against a server running on ANOTHER THREAD must complete.

    Every other case in this file is deliberately single-threaded (the
    request fits in the listen backlog + send buffer, so the server can
    accept afterwards).  This one is not: the server thread has to run
    while the client is blocked reading the response.

    On Grail that thread is a GREEN thread, so it only runs when the
    client yields -- which is exactly what an OS-level blocking socket
    prevents.  connect() therefore must not send settimeout(None) when the
    end state is already "blocking", and this check is what pins that:
    with the call restored it hangs forever rather than failing.

    ``timeout=None'' is passed explicitly because that is what
    requests and urllib.request pass through to http.client."""
    srv = socket.socket()
    srv.bind(('127.0.0.1', 0))
    srv.listen(1)
    port = srv.getsockname()[1]
    seen = []

    def serve():
        conn, addr = srv.accept()
        data = b''
        while b'\r\n\r\n' not in data:
            chunk = conn.recv(8192)
            if not chunk:
                break
            data = data + chunk
        seen.append(data.decode('utf-8'))
        conn.sendall(b'HTTP/1.1 200 OK\r\n'
                     b'Content-Length: 12\r\n'
                     b'Connection: close\r\n'
                     b'\r\n'
                     b'from-thread!')
        conn.close()
        srv.close()

    thread = threading.Thread(target=serve)
    thread.start()

    client = http.client.HTTPConnection('127.0.0.1', port, timeout=None)
    client.request('GET', '/threaded')
    resp = client.getresponse()
    body = resp.read()
    thread.join()
    resp.close()
    client.close()
    return {
        'status': resp.status,
        'body': body.decode('utf-8'),
        'server_saw_request': seen[0].split('\r\n')[0],
    }


def _free_port():
    """An ephemeral port that is free RIGHT NOW.

    Bound and closed without ever connecting, so it leaves no TIME_WAIT
    behind and can be re-bound immediately -- which is what lets the
    source_address check below pin an exact number."""
    probe = socket.socket()
    probe.bind(('127.0.0.1', 0))
    port = probe.getsockname()[1]
    probe.close()
    return port


def connection_signature():
    """__init__ accepts CPython's parameters, by keyword, and stores them.

    urllib3 forwards source_address= and blocksize= to
    http.client.HTTPConnection.__init__ as KEYWORDS, so a missing parameter
    is a TypeError at the call rather than a different connection."""
    c = http.client.HTTPConnection(
        'example.com', 8731, source_address=('127.0.0.1', 0),
        blocksize=16384)
    return {
        'host': c.host,
        'port': c.port,
        'source_address': c.source_address,
        'blocksize': c.blocksize,
        # The default is the SENTINEL, not None: None means "blocking",
        # the sentinel means "whatever socket.getdefaulttimeout() says".
        'timeout_is_sentinel': c.timeout is socket._GLOBAL_DEFAULT_TIMEOUT,
        'explicit_none_timeout': http.client.HTTPConnection(
            'h', 1, timeout=None).timeout is None,
        # CPython's http.client does NOT re-export the sentinel; it reads
        # socket's.  Assert the absence, so a local alias here would be a
        # failure rather than an unnoticed extra.
        'no_local_sentinel_alias':
            not hasattr(http.client, '_GLOBAL_DEFAULT_TIMEOUT'),
        # _get_hostport parity: brackets are stripped even when the port
        # was given, and an empty port means the default.
        'v6_brackets_stripped':
            http.client.HTTPConnection('[::1]', 80).host,
        'empty_port_is_default':
            http.client.HTTPConnection('foo.com:').port,
        'auto_open': http.client.HTTPConnection.auto_open,
        'debuglevel': http.client.HTTPConnection.debuglevel,
        'http_vsn': http.client.HTTPConnection._http_vsn,
        'response_class_is_httpresponse':
            http.client.HTTPConnection.response_class
            is http.client.HTTPResponse,
    }


def https_connection_signature():
    """HTTPSConnection's parameters after ``port`` are KEYWORD-ONLY.

    They are in CPython, and the old Grail order was
    (host, port, timeout, blocksize, context) -- so a positional third
    argument used to bind ``timeout`` in one and ``blocksize`` in the
    other.  Making it keyword-only removes the whole class of mismatch."""
    s = http.client.HTTPSConnection(
        'example.com', 443, timeout=3, source_address=('127.0.0.1', 0),
        blocksize=99)
    positional_rejected = False
    try:
        http.client.HTTPSConnection('example.com', 443, 3)
    except TypeError:
        positional_rejected = True
    return {
        'host': s.host,
        'port': s.port,
        'timeout': s.timeout,
        'source_address': s.source_address,
        'blocksize': s.blocksize,
        'has_context': s._context is not None,
        'positional_timeout_rejected': positional_rejected,
        'default_timeout_is_sentinel':
            http.client.HTTPSConnection('h').timeout
            is socket._GLOBAL_DEFAULT_TIMEOUT,
    }


def source_address_is_bound():
    """source_address is BOUND, not merely accepted and ignored.

    The server reports the peer address of the connection it accepted, so
    the assertion is made on the wire, not on the client's own bookkeeping.

    The second half is the NEGATIVE CONTROL: the same request with no
    source_address must NOT arrive from the pinned port.  Without it a
    ``source_port == pinned`` check could pass by coincidence, and an
    implementation that ignored source_address entirely would still look
    green if the OS happened to hand out that number."""
    srv, port = _listen()
    pinned = _free_port()

    client = http.client.HTTPConnection(
        '127.0.0.1', port, source_address=('127.0.0.1', pinned))
    client.request('GET', '/bound')
    conn, peer = srv.accept()
    bound_peer_port = peer[1]
    conn.sendall(b'HTTP/1.1 200 OK\r\nContent-Length: 2\r\n\r\nok')
    client.getresponse().read()
    conn.close()
    client.close()

    plain = http.client.HTTPConnection('127.0.0.1', port)
    plain.request('GET', '/unbound')
    conn2, peer2 = srv.accept()
    unbound_peer_port = peer2[1]
    conn2.sendall(b'HTTP/1.1 200 OK\r\nContent-Length: 2\r\n\r\nok')
    plain.getresponse().read()
    conn2.close()
    plain.close()
    srv.close()

    return {
        'server_saw_pinned_source_port': bound_peer_port == pinned,
        # negative control
        'unbound_did_not_use_pinned_port': unbound_peer_port != pinned,
        'unbound_port_is_real': unbound_peer_port > 0,
    }


def getheader_joins_repeats():
    """A repeated response header reads back joined with ', '.

    CPython's getheader() joins every matching value; returning only the
    first (what this did) silently dropped the rest."""
    srv, port = _listen()
    client = http.client.HTTPConnection('127.0.0.1', port)
    client.request('GET', '/vary')

    conn, request_text = _accept_and_read_request(srv)
    conn.sendall(b'HTTP/1.1 200 OK\r\n'
                 b'Vary: Accept\r\n'
                 b'Vary: Accept-Encoding\r\n'
                 b'Content-Length: 2\r\n'
                 b'\r\n'
                 b'ok')

    resp = client.getresponse()
    resp.read()
    result = {
        'joined': resp.getheader('Vary'),
        'get_all': resp.headers.get_all('Vary'),
        'missing_default': resp.getheader('X-Nope', 'fallback'),
        'missing_none_is_none': resp.getheader('X-Nope') is None,
    }
    conn.close()
    client.close()
    srv.close()
    return result



# ---------------------------------------------------------------------
# HTTPMessage is an email.message.Message
#
# CPython: ``class HTTPMessage(email.message.Message)``.  Consumers rely
# on the ANCESTRY, not just the mapping surface -- urllib3's
# urllib3/util/response.py::assert_header_parsing opens with
#
#     if not isinstance(headers, httplib.HTTPMessage):
#         raise TypeError(...)
#
# and then reaches for is_multipart() / get_payload() / defects, all of
# which are Message's.  These checks pin that, and the header parser's
# defect behaviour that assert_header_parsing was written to detect.
# ---------------------------------------------------------------------


class _NotAMessage(object):
    """The shape http.client.HTTPMessage used to have: a stand-alone
    mapping shim.  Kept here as the NEGATIVE CONTROL -- it answers every
    surface check below and must still fail the ancestry check, which is
    what proves the ancestry check discriminates."""

    def __init__(self):
        self._headers = [('Host', 'x')]

    def get(self, name, default=None):
        for k, v in self._headers:
            if k.lower() == name.lower():
                return v
        return default

    def items(self):
        return list(self._headers)

    def keys(self):
        return [k for k, v in self._headers]


def header_message_ancestry():
    """HTTPMessage's place in the class hierarchy."""
    msg = http.client.HTTPMessage()
    control = _NotAMessage()
    return {
        'subclass_of_message': issubclass(http.client.HTTPMessage,
                                          email.message.Message),
        'isinstance_message': isinstance(msg, email.message.Message),
        'isinstance_httpmessage': isinstance(msg, http.client.HTTPMessage),
        # first two entries of the MRO, as names
        'mro_head': [c.__name__ for c in http.client.HTTPMessage.__mro__[:2]],
        # NEGATIVE CONTROL: the old shim shape answers get/items/keys ...
        'control_has_surface': (control.get('host') == 'x'
                                and control.keys() == ['Host']),
        # ... and is still not a Message, so the check above means something
        'control_isinstance_message': isinstance(control,
                                                 email.message.Message),
        'control_isinstance_httpmessage': isinstance(
            control, http.client.HTTPMessage),
    }


def header_message_inherited_surface():
    """The Message surface HTTPMessage no longer has to imitate."""
    msg = http.client.HTTPMessage()
    msg['Host'] = 'example.test'
    msg['Set-Cookie'] = 'a=1'
    msg['Set-Cookie'] = 'b=2'
    return {
        'defects': list(msg.defects),
        'is_multipart': msg.is_multipart(),
        'payload': msg.get_payload(),
        'len': len(msg),
        'contains_ci': ('set-cookie' in msg) and ('nope' not in msg),
        'getitem_ci': msg['HOST'],
        'getitem_missing': msg['nope'],          # email contract: None
        'getitem_missing_is_none': msg['nope'] is None,
        'payload_is_none': msg.get_payload() is None,
        'get_all': msg.get_all('Set-Cookie'),
        'get_all_missing': msg.get_all('nope'),
        'get_all_missing_is_none': msg.get_all('nope') is None,
        'iter_names': list(iter(msg)),
        'items': msg.items(),
        'content_type_default': msg.get_content_type(),
        # CPython's getallmatchingheaders compares against ``name + ':'``
        # while keys() yields bare names, so it always answers [].  Ported
        # with the quirk intact rather than silently "fixed".
        'getallmatchingheaders': msg.getallmatchingheaders('Set-Cookie'),
    }


def parse_headers_wellformed():
    """parse_headers() on a clean block: no defects, empty payload, and
    fp left at the first byte of the body."""
    fp = io.BytesIO(b'Host: x\r\n'
                    b'Set-Cookie: a=1\r\n'
                    b'Set-Cookie: b=2\r\n'
                    b'X-Fold: one\r\n'
                    b'  two\r\n'
                    b'\r\n'
                    b'BODY')
    msg = http.client.parse_headers(fp)
    return {
        'class': type(msg).__name__,
        'isinstance_message': isinstance(msg, email.message.Message),
        'items': msg.items(),
        'defects': list(msg.defects),
        'payload': msg.get_payload(),
        'is_multipart': msg.is_multipart(),
        # obs-fold keeps the embedded CRLF, as email's compat32 policy does
        'folded': msg['X-Fold'],
        'rest': fp.read().decode('ascii'),
    }


def parse_headers_missing_separator():
    """A line with no colon ends the header block: MissingHeaderBodySeparatorDefect,
    and that line onward -- terminating blank line included -- is the payload."""
    fp = io.BytesIO(b'Host: x\r\nBADLINE\r\nY: 2\r\n\r\nBODY')
    msg = http.client.parse_headers(fp)
    return {
        'items': msg.items(),
        'defect_names': [type(d).__name__ for d in msg.defects],
        'defects_are_messagedefect': all(
            isinstance(d, email.errors.MessageDefect) for d in msg.defects),
        'payload': msg.get_payload(),
        'rest': fp.read().decode('ascii'),
    }


def parse_headers_leading_continuation():
    """A first line that is a continuation is dropped with
    FirstHeaderLineIsContinuationDefect; parsing carries on."""
    fp = io.BytesIO(b'  leading\r\nHost: x\r\n\r\n')
    msg = http.client.parse_headers(fp)
    return {
        'items': msg.items(),
        'defect_names': [type(d).__name__ for d in msg.defects],
        'payload': msg.get_payload(),
    }


def parse_headers_empty():
    """EOF where headers were expected: no headers, no defects, no payload."""
    msg = http.client.parse_headers(io.BytesIO(b''))
    return {
        'items': msg.items(),
        'defects': list(msg.defects),
        'payload': msg.get_payload(),
    }


def _assert_header_parsing(headers):
    """urllib3/util/response.py::assert_header_parsing, inlined.

    urllib3 is not vendored in this tree, so the check it performs is
    reproduced here verbatim (minus the exception type) -- this is the
    call the whole change exists to make work.  Answers
    (ok, defect_names, unparsed_data); raises TypeError like urllib3 does
    when handed something that is not an HTTPMessage."""
    if not isinstance(headers, http.client.HTTPMessage):
        raise TypeError('expected httplib.Message, got %s.' % type(headers))
    unparsed_data = None
    if not headers.is_multipart():
        payload = headers.get_payload()
        if isinstance(payload, (bytes, str)):
            unparsed_data = payload
    defects = [
        d for d in headers.defects
        if not isinstance(d, (email.errors.StartBoundaryNotFoundDefect,
                              email.errors.MultipartInvariantViolationDefect))
    ]
    ok = not (defects or unparsed_data)
    return ok, [type(d).__name__ for d in defects], unparsed_data


def urllib3_assert_header_parsing():
    """The three outcomes urllib3's caller can see."""
    clean = http.client.parse_headers(
        io.BytesIO(b'Host: x\r\nContent-Length: 3\r\n\r\n'))
    dirty = http.client.parse_headers(
        io.BytesIO(b'Host: x\r\nBADLINE\r\n\r\n'))
    try:
        _assert_header_parsing(_NotAMessage())
        control_raised = False
    except TypeError:
        control_raised = True
    return {
        'clean': _assert_header_parsing(clean),
        'dirty': _assert_header_parsing(dirty),
        # NEGATIVE CONTROL: the old shim shape is rejected up front
        'control_raises_typeerror': control_raised,
    }


def live_response_headers():
    """A real response's .headers, over the loopback server, is a Message."""
    srv, port = _listen()
    client = http.client.HTTPConnection('127.0.0.1', port)
    client.request('GET', '/msg')

    conn, request_text = _accept_and_read_request(srv)
    conn.sendall(b'HTTP/1.1 200 OK\r\n'
                 b'Content-Type: text/plain\r\n'
                 b'Set-Cookie: a=1\r\n'
                 b'Set-Cookie: b=2\r\n'
                 b'Content-Length: 2\r\n'
                 b'\r\n'
                 b'hi')
    resp = client.getresponse()
    body = resp.read()
    headers = resp.headers
    ok, defect_names, unparsed = _assert_header_parsing(headers)
    result = {
        'body': body.decode('utf-8'),
        'msg_is_headers': resp.msg is headers,
        'isinstance_message': isinstance(headers, email.message.Message),
        'isinstance_httpmessage': isinstance(headers,
                                             http.client.HTTPMessage),
        'is_multipart': headers.is_multipart(),
        'payload': headers.get_payload(),
        'defects': list(headers.defects),
        'get_all': headers.get_all('set-cookie'),
        'content_type': headers.get_content_type(),
        'assert_header_parsing_ok': ok,
        'assert_header_parsing_unparsed': unparsed,
    }
    conn.close()
    client.close()
    srv.close()
    return result


r_get = get_content_length()
r_post = post_body()
r_chunked = chunked_response()
r_head = head_no_body()
r_error = error_status()
r_conn_close = connection_close_body()
r_ctx = response_context_manager()
r_io_refs = socket_io_refs()
r_sig = connection_signature()
r_https_sig = https_connection_signature()
r_source_addr = source_address_is_bound()
r_repeat_hdr = getheader_joins_repeats()
r_green = green_thread_server_roundtrip()
r_ancestry = header_message_ancestry()
r_msg_surface = header_message_inherited_surface()
r_ph_ok = parse_headers_wellformed()
r_ph_sep = parse_headers_missing_separator()
r_ph_cont = parse_headers_leading_continuation()
r_ph_empty = parse_headers_empty()
r_u3 = urllib3_assert_header_parsing()
r_live_headers = live_response_headers()


# ---------------------------------------------------------------------
# Self-verification under real CPython (scripts/check_python_fixtures.sh).
#
# ONE list, module level, for both halves of this fixture: the socket /
# connection-parameter checks that came from the connection-params work
# and the HTTPMessage / parse_headers checks that came with making
# HTTPMessage a real email.message.Message.  It is module level rather
# than local to __main__ so selfcheck() below can hand the SAME list to
# HttpClientTestCase -- the CPython-measured expectations then live in
# exactly one place, and the gate and the SUnit suite cannot disagree
# about what they are.
#
# Every expectation here was MEASURED against CPython 3.14 before it was
# written down, and is re-measured on every gate run, so the file cannot
# quietly drift into pinning Grail's behaviour instead.
# ---------------------------------------------------------------------

_CHECKS = [
    ('get.status', r_get['status'], 200),
    ('get.reason', r_get['reason'], 'OK'),
    ('get.body', r_get['body'], 'hello world'),
    ('get.ctype', r_get['ctype'], 'text/plain'),
    ('get.ctype_titled', r_get['ctype_titled'], 'text/plain'),
    ('get.request_line', r_get['request_line'], 'GET /hello?x=1 HTTP/1.1'),
    ('get.has_host', r_get['has_host'], True),

    ('post.status', r_post['status'], 201),
    ('post.has_clen', r_post['request_has_clen'], True),
    ('post.has_ctype', r_post['request_has_ctype'], True),
    ('post.body', r_post['request_body'],
     'To=%2B15551234567&Body=Hi+there'),

    ('chunked.status', r_chunked['status'], 200),
    ('chunked.body', r_chunked['body'], 'hello world!'),
    ('chunked.chunked', r_chunked['chunked'], True),

    ('head.status', r_head['status'], 200),
    ('head.body_len', r_head['body_len'], 0),
    ('head.clen_header', r_head['clen_header'], '5000'),

    ('error.status', r_error['status'], 404),
    ('error.reason', r_error['reason'], 'Not Found'),
    ('error.body', r_error['body'], '{"error": "no such thing"}'),

    ('close.status', r_conn_close['status'], 200),
    ('close.will_close', r_conn_close['will_close'], True),
    ('close.sock_dropped', r_conn_close['sock_dropped'], True),
    ('close.body_len', r_conn_close['body_len'], 21000),
    ('close.body_intact', r_conn_close['body_intact'], True),

    ('ctx.body', r_ctx['body'], 'inctx'),
    ('ctx.closed_after', r_ctx['closed_after'], True),
    ('ctx.is_bufferedio', r_ctx['is_bufferedio'], True),

    ('iorefs.alive_after_close', r_io_refs['alive_after_close'], True),
    ('iorefs.data', r_io_refs['data'], 'payload'),
    ('iorefs.released', r_io_refs['released_after_fp_close'], True),

    ('sig.host', r_sig['host'], 'example.com'),
    ('sig.port', r_sig['port'], 8731),
    ('sig.source_address', r_sig['source_address'], ('127.0.0.1', 0)),
    ('sig.blocksize', r_sig['blocksize'], 16384),
    ('sig.timeout_is_sentinel', r_sig['timeout_is_sentinel'], True),
    ('sig.explicit_none_timeout', r_sig['explicit_none_timeout'], True),
    ('sig.no_local_sentinel_alias', r_sig['no_local_sentinel_alias'],
     True),
    ('sig.v6_brackets', r_sig['v6_brackets_stripped'], '::1'),
    ('sig.empty_port', r_sig['empty_port_is_default'], 80),
    ('sig.auto_open', bool(r_sig['auto_open']), True),
    ('sig.debuglevel', r_sig['debuglevel'], 0),
    ('sig.http_vsn', r_sig['http_vsn'], 11),
    ('sig.response_class', r_sig['response_class_is_httpresponse'], True),

    ('https.host', r_https_sig['host'], 'example.com'),
    ('https.port', r_https_sig['port'], 443),
    ('https.timeout', r_https_sig['timeout'], 3),
    ('https.source_address', r_https_sig['source_address'],
     ('127.0.0.1', 0)),
    ('https.blocksize', r_https_sig['blocksize'], 99),
    ('https.has_context', r_https_sig['has_context'], True),
    ('https.positional_rejected',
     r_https_sig['positional_timeout_rejected'], True),
    ('https.default_sentinel',
     r_https_sig['default_timeout_is_sentinel'], True),

    ('src.server_saw_pinned',
     r_source_addr['server_saw_pinned_source_port'], True),
    ('src.control_unbound_differs',
     r_source_addr['unbound_did_not_use_pinned_port'], True),
    ('src.control_unbound_real',
     r_source_addr['unbound_port_is_real'], True),

    ('hdr.joined', r_repeat_hdr['joined'], 'Accept, Accept-Encoding'),
    ('hdr.get_all', r_repeat_hdr['get_all'],
     ['Accept', 'Accept-Encoding']),
    ('hdr.missing_default', r_repeat_hdr['missing_default'], 'fallback'),
    ('hdr.missing_none', r_repeat_hdr['missing_none_is_none'], True),

    ('green.status', r_green['status'], 200),
    ('green.body', r_green['body'], 'from-thread!'),
    ('green.server_saw', r_green['server_saw_request'],
     'GET /threaded HTTP/1.1'),

    ('ancestry.subclass_of_message', r_ancestry['subclass_of_message'], True),
    ('ancestry.isinstance_message', r_ancestry['isinstance_message'], True),
    ('ancestry.isinstance_httpmessage',
     r_ancestry['isinstance_httpmessage'], True),
    ('ancestry.mro_head', r_ancestry['mro_head'], ['HTTPMessage', 'Message']),
    ('ancestry.control_has_surface', r_ancestry['control_has_surface'], True),
    ('ancestry.control_not_message',
     r_ancestry['control_isinstance_message'], False),
    ('ancestry.control_not_httpmessage',
     r_ancestry['control_isinstance_httpmessage'], False),

    ('surface.defects', r_msg_surface['defects'], []),
    ('surface.is_multipart', r_msg_surface['is_multipart'], False),
    ('surface.payload', r_msg_surface['payload'], None),
    ('surface.len', r_msg_surface['len'], 3),
    ('surface.contains_ci', r_msg_surface['contains_ci'], True),
    ('surface.getitem_ci', r_msg_surface['getitem_ci'], 'example.test'),
    ('surface.getitem_missing', r_msg_surface['getitem_missing'], None),
    ('surface.get_all', r_msg_surface['get_all'], ['a=1', 'b=2']),
    ('surface.get_all_missing', r_msg_surface['get_all_missing'], None),
    ('surface.getitem_missing_is_none',
     r_msg_surface['getitem_missing_is_none'], True),
    ('surface.payload_is_none', r_msg_surface['payload_is_none'], True),
    ('surface.get_all_missing_is_none',
     r_msg_surface['get_all_missing_is_none'], True),
    ('surface.iter_names', r_msg_surface['iter_names'],
     ['Host', 'Set-Cookie', 'Set-Cookie']),
    ('surface.items', r_msg_surface['items'],
     [('Host', 'example.test'), ('Set-Cookie', 'a=1'), ('Set-Cookie', 'b=2')]),
    ('surface.content_type_default',
     r_msg_surface['content_type_default'], 'text/plain'),
    ('surface.getallmatchingheaders',
     r_msg_surface['getallmatchingheaders'], []),

    ('parse.class', r_ph_ok['class'], 'HTTPMessage'),
    ('parse.isinstance_message', r_ph_ok['isinstance_message'], True),
    ('parse.items', r_ph_ok['items'],
     [('Host', 'x'), ('Set-Cookie', 'a=1'), ('Set-Cookie', 'b=2'),
      ('X-Fold', 'one\r\n  two')]),
    ('parse.defects', r_ph_ok['defects'], []),
    ('parse.payload', r_ph_ok['payload'], ''),
    ('parse.is_multipart', r_ph_ok['is_multipart'], False),
    ('parse.folded', r_ph_ok['folded'], 'one\r\n  two'),
    ('parse.rest', r_ph_ok['rest'], 'BODY'),

    ('sep.items', r_ph_sep['items'], [('Host', 'x')]),
    ('sep.defect_names', r_ph_sep['defect_names'],
     ['MissingHeaderBodySeparatorDefect']),
    ('sep.defects_are_messagedefect',
     r_ph_sep['defects_are_messagedefect'], True),
    ('sep.payload', r_ph_sep['payload'], 'BADLINE\r\nY: 2\r\n\r\n'),
    ('sep.rest', r_ph_sep['rest'], 'BODY'),

    ('cont.items', r_ph_cont['items'], [('Host', 'x')]),
    ('cont.defect_names', r_ph_cont['defect_names'],
     ['FirstHeaderLineIsContinuationDefect']),
    ('cont.payload', r_ph_cont['payload'], ''),

    ('empty.items', r_ph_empty['items'], []),
    ('empty.defects', r_ph_empty['defects'], []),
    ('empty.payload', r_ph_empty['payload'], ''),

    ('urllib3.clean', r_u3['clean'], (True, [], '')),
    ('urllib3.dirty', r_u3['dirty'],
     (False, ['MissingHeaderBodySeparatorDefect'], 'BADLINE\r\n\r\n')),
    ('urllib3.control_raises_typeerror',
     r_u3['control_raises_typeerror'], True),

    ('live.body', r_live_headers['body'], 'hi'),
    ('live.msg_is_headers', r_live_headers['msg_is_headers'], True),
    ('live.isinstance_message', r_live_headers['isinstance_message'], True),
    ('live.isinstance_httpmessage',
     r_live_headers['isinstance_httpmessage'], True),
    ('live.is_multipart', r_live_headers['is_multipart'], False),
    ('live.payload', r_live_headers['payload'], ''),
    ('live.defects', r_live_headers['defects'], []),
    ('live.get_all', r_live_headers['get_all'], ['a=1', 'b=2']),
    ('live.content_type', r_live_headers['content_type'], 'text/plain'),
    ('live.assert_header_parsing_ok',
     r_live_headers['assert_header_parsing_ok'], True),
    ('live.assert_header_parsing_unparsed',
     r_live_headers['assert_header_parsing_unparsed'], ''),
]


def selfcheck():
    """Which of the _CHECKS above disagree with the recorded CPython value.

    HttpClientTestCase asserts ``ok'' here rather than restating a hundred
    literals in Topaz, so the CPython-measured expectations live in exactly
    one place and the gate and the SUnit suite read the same list.  The
    per-area tests in that TestCase still assert their own values; this is
    the catch-all that notices anything they do not name.
    """
    failures = [label for label, actual, expected in _CHECKS
                if actual != expected]
    return {
        'ok': len(failures) == 0,
        'count': len(_CHECKS),
        'failures': ', '.join(failures),
    }


r_selfcheck = selfcheck()


if __name__ == '__main__':
    for _label, _actual, _expected in _CHECKS:
        print('%-4s %-38s %r' % (
            'OK' if _actual == _expected else 'FAIL', _label,
            _actual if _actual != _expected else ''))
