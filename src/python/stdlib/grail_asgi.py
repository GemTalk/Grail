"""A minimal ASGI/HTTP server on Grail's asyncio event loop.

WHERE THIS LIVES, and why not in the ``grail`` package next to grail/gemstone.py:
importing ANY submodule of ``grail`` corrupts this session's import state, so the
next unrelated import fails with "Expected nil to be a Boolean".  It is the
package NAME -- the identical file under a package called ``grailx`` is fine --
and it predates this module (``import grail.gemstone`` does it too on a clean
checkout).  Sitting in the bundled tree also means ``import grail_asgi`` just
works, with no sys.path manipulation, which is what the demo is for.

WHY THIS EXISTS, given that the goal is FastAPI.

FastAPI is normally served by uvicorn, and uvicorn asks the loop for
``create_server(protocol_factory, ...)`` -- the transports-and-protocols half of
asyncio, which Grail does not have yet.  So the obvious reading of "run an ASGI
app" is blocked on a large increment.

But ASGI itself does not need transports.  The interface an ASGI app presents is
just three objects::

    async def app(scope, receive, send)

and everything a server has to do to satisfy it -- accept, read, write, close --
Grail's loop already does, through ``sock_accept`` / ``sock_recv`` /
``sock_sendall``.  Transports are how CPython's asyncio prefers to reach those
calls, not a precondition for them.

So this module serves ASGI apps TODAY, on the loop as it stands, and it is
deliberately written against the socket coroutines rather than against
transports.  When transports do land, this stays useful as the thing that proved
the I/O layer works end to end under a real protocol -- which is a stronger
statement than any of the socket fixtures make individually, because a request
that comes back with the right bytes has exercised accept, readiness, partial
reads, partial writes, timers and task scheduling all at once.

WHAT IS DELIBERATELY NOT HERE.  This is a correct HTTP/1.1 server for the subset
it claims and an honest failure for everything else, rather than a lenient
server that half-supports more:

  * no TLS, no HTTP/2, no WebSocket ('websocket' scopes are refused);
  * no ``Transfer-Encoding: chunked`` REQUEST body -- answered 411, because
    silently treating a chunked body as empty would corrupt the app's input;
  * the request body arrives as ONE ``http.request`` message, so a streaming
    upload is buffered rather than streamed;
  * keep-alive only when the response carries a ``content-length`` (see
    ``_should_keep_alive``);
  * no request-line/header limits beyond a total head size, no timeouts.

None of those are load-bearing for running an ASGI app locally, which is what
this is for.  A public-facing server needs the timeouts at least.

USAGE::

    import grail_asgi

    async def app(scope, receive, send):
        await receive()
        await send({'type': 'http.response.start', 'status': 200,
                    'headers': [(b'content-type', b'text/plain'),
                                (b'content-length', b'5')]})
        await send({'type': 'http.response.body', 'body': b'hello'})

    grail_asgi.run(app, port=8000)          # serve until interrupted

or, inside a loop that is already running, for tests and for embedding::

    server = grail_asgi.Server(app, port=0)
    await server.start()                    # bound and accepting; see .address
    ...
    await server.stop()
"""

import asyncio as _asyncio
import socket as _socket

from urllib.parse import unquote as _unquote

__all__ = ['Server', 'run', 'ProtocolError']

# The whole request head -- request line plus headers -- must fit in this many
# bytes.  One limit rather than the usual three (line length, field count, field
# length) because it is the only one that bounds MEMORY, which is the thing that
# matters when the peer is hostile and the alternative is reading forever.
_MAX_HEAD_BYTES = 65536

# Read size for both the head and the body.  Not a buffer size -- sock_recv
# answers what is available, so this is only a ceiling.
_CHUNK = 65536

_ASGI_VERSION = {'version': '3.0', 'spec_version': '2.3'}


class ProtocolError(Exception):
    """A request this server will not serve, carrying the status to answer with.

    Raised while parsing, caught by the connection handler, which turns it into
    a response.  It is an ERROR rather than a return value because parsing
    happens several frames down and every caller in between would otherwise
    have to forward the failure by hand."""

    def __init__(self, status, reason):
        Exception.__init__(self, '%d %s' % (status, reason))
        self.status = status
        self.reason = reason


# Reason phrases are optional in HTTP/1.1 -- clients are required to ignore them
# -- but an empty one makes a terminal session or a packet capture much harder
# to read, so the common ones are spelled out.  http.HTTPStatus would cover more
# and is imported lazily below; this table is the fallback and the fast path.
_REASONS = {
    200: 'OK', 201: 'Created', 204: 'No Content',
    301: 'Moved Permanently', 302: 'Found', 304: 'Not Modified',
    400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden',
    404: 'Not Found', 405: 'Method Not Allowed', 411: 'Length Required',
    413: 'Content Too Large', 414: 'URI Too Long',
    422: 'Unprocessable Content', 431: 'Request Header Fields Too Large',
    500: 'Internal Server Error', 501: 'Not Implemented',
    503: 'Service Unavailable', 505: 'HTTP Version Not Supported',
}


def _reason(status):
    phrase = _REASONS.get(status)
    if phrase is not None:
        return phrase
    try:
        from http import HTTPStatus
        return HTTPStatus(status).phrase
    except Exception:
        # An app is allowed to invent a status code, and a missing phrase must
        # not be the thing that fails the response.
        return ''


class Server:
    """An ASGI server bound to one listening socket.

    Split into ``start`` / ``stop`` rather than a single ``serve`` coroutine
    because a caller almost always needs the bound address before it can drive
    the server, and with port 0 -- the only sane choice in a test -- that
    address does not exist until after bind.  ``run`` below is the
    serve-forever wrapper for the case where nobody needs it."""

    def __init__(self, app, host='127.0.0.1', port=0, backlog=128,
                 max_head_bytes=_MAX_HEAD_BYTES):
        self.app = app
        self.host = host
        self.port = port
        self.backlog = backlog
        self.max_head_bytes = max_head_bytes
        self.address = None
        self._loop = None
        self._sock = None
        self._accept_task = None
        # Live connection tasks.  Tracked so `stop` can cancel them: a
        # keep-alive connection is parked in sock_recv indefinitely, so closing
        # the listener alone would leave the loop with work forever.
        self._connections = set()

    # --- lifecycle ---------------------------------------------------------

    async def start(self):
        """Bind, listen, and start accepting.  Answers once ``address`` is set,
        so a caller can connect the moment this returns."""
        self._loop = _asyncio.get_event_loop()
        sock = _socket.socket(_socket.AF_INET, _socket.SOCK_STREAM)
        try:
            # Without SO_REUSEADDR a restart on a fixed port fails for as long
            # as the previous listener's connections sit in TIME_WAIT.
            sock.setsockopt(_socket.SOL_SOCKET, _socket.SO_REUSEADDR, 1)
        except Exception:
            # Not fatal: the option is a convenience, and a platform that
            # refuses it still serves correctly.
            pass
        sock.bind((self.host, self.port))
        sock.listen(self.backlog)
        # Non-blocking BEFORE the first accept: the loop refuses a blocking
        # socket outright (see AbstractEventLoop._check_nonblocking), which is
        # what keeps a mistake here from turning into a hung gem.
        sock.setblocking(False)
        self._sock = sock
        self.address = sock.getsockname()
        self._accept_task = self._loop.create_task(self._accept_forever())
        return self.address

    async def stop(self):
        """Stop accepting, cancel every live connection, close the listener.

        Cancellation rather than a graceful drain: a keep-alive connection has
        no natural end, so "wait for the connections to finish" does not
        terminate.  A drain would need a deadline, and a deadline is a policy
        this module has no basis to pick."""
        if self._accept_task is not None:
            self._accept_task.cancel()
            self._accept_task = None
        for task in list(self._connections):
            task.cancel()
        # The cancelled tasks close their own sockets in a finally, but only
        # once they are next scheduled -- and a caller that closes the loop
        # immediately after `stop` never gives them that chance.  One yield is
        # enough to let each cancellation be delivered.
        await _asyncio.sleep(0)
        self._connections.clear()
        if self._sock is not None:
            self._sock.close()
            self._sock = None

    async def _accept_forever(self):
        while True:
            conn, addr = await self._loop.sock_accept(self._sock)
            task = self._loop.create_task(self._handle(conn, addr))
            self._connections.add(task)
            # Discard on completion, so a long-lived server does not accumulate
            # a task object per request ever served.
            task.add_done_callback(self._connections.discard)

    # --- one connection ----------------------------------------------------

    async def _handle(self, conn, addr):
        """Serve requests on one connection until it closes.

        Every exit closes the socket, including cancellation from ``stop`` --
        which is the reason for the bare try/finally rather than a `with`: a
        socket left open here is a descriptor leak that only shows up under
        load, long after the test that would have caught it."""
        try:
            # Bytes read from the socket but not yet consumed.  It has to live
            # out here, across requests: the read that finishes one request's
            # body routinely also contains the head of the NEXT one, and a
            # per-request buffer would throw that away and then wait forever
            # for a request it had already received.
            buf = bytearray()
            while True:
                if not await self._serve_one(conn, addr, buf):
                    return
        except _asyncio.CancelledError:
            # Deliberately swallowed.  The connection is being torn down by
            # `stop`, which is not a failure, and re-raising would make every
            # shutdown log a traceback per open connection.
            return
        finally:
            try:
                conn.close()
            except Exception:
                pass

    async def _serve_one(self, conn, addr, buf):
        """Serve one request.  Answers True to keep the connection open.

        A ProtocolError becomes a response and then closes: the parse failed,
        so where the next request starts in the byte stream is unknown, and
        guessing is how a server ends up serving an attacker's framing."""
        try:
            head = await self._read_head(conn, buf)
        except ProtocolError as exc:
            await self._send_error(conn, exc)
            return False
        if head is None:
            return False            # clean EOF: the peer is done, not an error
        try:
            scope, body = await self._parse(head, addr, conn, buf)
        except ProtocolError as exc:
            await self._send_error(conn, exc)
            return False
        return await self._run_app(conn, scope, body)

    async def _read_head(self, conn, buf):
        """Read until the blank line ending the request head; answer those
        bytes, or None if the peer closed cleanly first.

        None rather than an exception for EOF because it is the ORDINARY end of
        a keep-alive connection -- the client just stops -- and a server that
        logged that as an error would log one per connection."""
        while True:
            end = bytes(buf).find(b'\r\n\r\n')
            if end >= 0:
                # Checked on the FOUND head, not just on the buffer as it grows.
                # Only checking while growing looks right and enforces nothing:
                # one recv routinely delivers the whole head, so the terminator
                # is already present the first time through and the limit is
                # never consulted at all.  It took a probe with a 5 KB header
                # against a 2 KB limit to notice, because the answer was a
                # perfectly good 200.
                if end > self.max_head_bytes:
                    raise ProtocolError(431,
                                        'Request Header Fields Too Large')
                head = bytes(buf[:end])
                del buf[:end + 4]
                return head
            if len(buf) > self.max_head_bytes:
                # No terminator yet and already over the limit, so the head
                # cannot come in under it however much more arrives.  This is
                # the case that bounds MEMORY -- without it a peer that never
                # sends a blank line is an unbounded read.
                raise ProtocolError(431, 'Request Header Fields Too Large')
            chunk = await self._loop.sock_recv(conn, _CHUNK)
            if not chunk:
                # EOF.  A partial head here means the request was truncated,
                # which IS an error -- but the peer has already gone, so there
                # is nobody to tell and nothing to do but close.  Answered the
                # same as a clean close for that reason.
                return None
            buf.extend(chunk)

    async def _parse(self, head, addr, conn, buf):
        """Turn the request head into an ASGI scope, and read the body."""
        lines = head.split(b'\r\n')
        parts = lines[0].split(b' ')
        if len(parts) != 3:
            raise ProtocolError(400, 'Bad Request')
        method, target, version = parts
        if not version.startswith(b'HTTP/1.'):
            # HTTP/0.9 has no headers and HTTP/2 is a different wire format; in
            # both cases nothing below this line would be correct.
            raise ProtocolError(505, 'HTTP Version Not Supported')
        http_version = version[5:].decode('ascii')

        headers = []
        for line in lines[1:]:
            if not line:
                continue
            if line[:1] in (b' ', b'\t'):
                # Obsolete line folding (RFC 7230 removed it).  Rejected rather
                # than unfolded: it is a known request-smuggling vector and no
                # client this century emits it.
                raise ProtocolError(400, 'Bad Request')
            colon = line.find(b':')
            if colon <= 0:
                raise ProtocolError(400, 'Bad Request')
            # ASGI requires lower-cased names, and the value stripped of
            # surrounding whitespace but otherwise raw bytes.
            headers.append((line[:colon].lower(), line[colon + 1:].strip()))

        raw_path, _, query = target.partition(b'?')
        scope = {
            'type': 'http',
            'asgi': _ASGI_VERSION,
            'http_version': http_version,
            'method': method.decode('ascii'),
            'scheme': 'http',
            # `path` is percent-DECODED text and `raw_path` the original bytes.
            # Apps route on `path`; anything that needs to distinguish %2F from
            # / (a path traversal check, say) has to read `raw_path`.
            'path': _unquote(raw_path.decode('ascii')),
            'raw_path': raw_path,
            'query_string': query,
            'root_path': '',
            'headers': headers,
            'client': (addr[0], addr[1]),
            'server': (self.address[0], self.address[1]),
            'state': {},
        }
        body = await self._read_body(conn, buf, headers)
        return scope, body

    async def _read_body(self, conn, buf, headers):
        """Read exactly the body the head declared.

        Only Content-Length.  A chunked body is refused (411) rather than
        treated as absent, because an app that receives an empty body where one
        was sent does not fail -- it succeeds WRONGLY, which is worse."""
        length = None
        for name, value in headers:
            if name == b'transfer-encoding' and b'chunked' in value.lower():
                raise ProtocolError(411, 'Length Required')
            if name == b'content-length':
                try:
                    length = int(value)
                except ValueError:
                    raise ProtocolError(400, 'Bad Request')
                if length < 0:
                    raise ProtocolError(400, 'Bad Request')
        if not length:
            return b''
        while len(buf) < length:
            chunk = await self._loop.sock_recv(conn, _CHUNK)
            if not chunk:
                # Truncated body.  The app must not see a short body as a whole
                # one, and the framing is now unknown, so the connection ends.
                raise ProtocolError(400, 'Bad Request')
            buf.extend(chunk)
        body = bytes(buf[:length])
        del buf[:length]
        return body

    # --- running the app ---------------------------------------------------

    async def _run_app(self, conn, scope, body):
        """Call the app with a receive/send pair.  Answers True to keep alive.

        The state that decides keep-alive is captured in a dict rather than in
        locals because `send` is a closure that has to WRITE it, and Grail
        follows CPython here: assigning to a name inside a nested function
        rebinds it locally unless declared nonlocal.  A dict makes the shared
        mutation explicit at both ends."""
        state = {'started': False, 'head_sent': False, 'keep_alive': False,
                 'body_consumed': False,
                 'body_done': False}

        async def receive():
            # The whole body in one message.  A streaming app still works --
            # it just sees a single chunk -- whereas an app that never calls
            # receive at all (legal, and common for GET handlers) costs nothing.
            if not state['body_consumed']:
                state['body_consumed'] = True
                return {'type': 'http.request', 'body': body,
                        'more_body': False}
            # After the body, CPython's servers park here until the client
            # disconnects.  Reporting the disconnect immediately instead is the
            # one place this server is less faithful than it could be, and the
            # reason is that parking needs a second reader on a socket this
            # coroutine is also about to write to.  An app that loops on
            # receive terminates either way; one that waits for a disconnect
            # notification gets it early rather than never.
            return {'type': 'http.disconnect'}

        async def send(message):
            kind = message['type']
            if kind == 'http.response.start':
                if state['started']:
                    raise RuntimeError('http.response.start sent twice')
                state['started'] = True
                state['status'] = message['status']
                state['headers'] = list(message.get('headers') or [])
            elif kind == 'http.response.body':
                if not state['started']:
                    raise RuntimeError(
                        'http.response.body before http.response.start')
                chunk = message.get('body', b'')
                if not state['head_sent']:
                    # The head goes out with the FIRST body chunk, not on
                    # response.start: the keep-alive decision depends on the
                    # headers the app supplied, and delaying costs nothing
                    # because a start with no body is not a response.
                    state['keep_alive'] = self._should_keep_alive(
                        scope, state['headers'])
                    await self._loop.sock_sendall(conn, self._head_bytes(
                        state['status'], state['headers'], state['keep_alive']))
                    state['head_sent'] = True
                if chunk:
                    await self._loop.sock_sendall(conn, chunk)
                if not message.get('more_body'):
                    # The app has declared the response finished.  Recorded
                    # rather than acted on: this server does not verify the
                    # byte count against content-length, so the flag is only
                    # here to keep `send` honest about what it observed.
                    state['body_done'] = True
            else:
                raise RuntimeError('unsupported message type %r' % (kind,))

        if scope['type'] != 'http':
            # Reached only if a caller hands this server a scope it made up;
            # real 'websocket' scopes never get here because nothing upgrades.
            raise ValueError('this server serves only http scopes')
        try:
            await self.app(scope, receive, send)
        except _asyncio.CancelledError:
            raise
        except Exception:
            if not state['head_sent']:
                # Nothing has been written, so a 500 is still possible and is
                # far more useful to the client than a dropped connection.
                await self._send_error(
                    conn, ProtocolError(500, 'Internal Server Error'))
            # Either way the connection ends: a half-written response cannot be
            # recovered from, and pretending otherwise desynchronises the
            # stream for every request after it.
            return False
        if not state['head_sent']:
            # The app returned without sending a response at all.
            await self._send_error(conn, ProtocolError(500,
                                                      'Internal Server Error'))
            return False
        return state['keep_alive']

    def _should_keep_alive(self, scope, headers):
        """Keep-alive only when the response says where its body ends.

        HTTP/1.1 defaults to keep-alive, but a response with neither a
        content-length nor chunked framing ends AT THE CLOSE -- that is how the
        client knows it is complete.  Keeping such a connection open leaves the
        client waiting for bytes that will never come, so a missing
        content-length forces a close.  This is the whole reason chunked
        RESPONSE encoding would be worth adding next: it is what lets a
        streaming response stay on a keep-alive connection."""
        if scope['http_version'] != '1.1':
            # HTTP/1.0 keep-alive needs an explicit `connection: keep-alive`
            # from the client and is not worth supporting.
            return False
        for name, value in scope['headers']:
            if name == b'connection' and b'close' in value.lower():
                return False
        for name, value in headers:
            if name.lower() == b'content-length':
                return True
        return False

    # --- writing -----------------------------------------------------------

    def _head_bytes(self, status, headers, keep_alive):
        out = [b'HTTP/1.1 ', str(int(status)).encode('ascii'), b' ',
               _reason(int(status)).encode('ascii'), b'\r\n']
        for name, value in headers:
            out.append(bytes(name))
            out.append(b': ')
            out.append(bytes(value))
            out.append(b'\r\n')
        # Announced explicitly in both directions.  `close` in particular is
        # not optional: without it a 1.1 client is entitled to send a second
        # request on a connection this server is about to drop.
        out.append(b'connection: keep-alive\r\n' if keep_alive
                   else b'connection: close\r\n')
        out.append(b'\r\n')
        return b''.join(out)

    async def _send_error(self, conn, exc):
        """Write a minimal error response, best effort.

        Best effort because the usual reason for getting here is a peer that
        has already gone away, and a write to a closed socket raising out of
        the error path would replace a clean 400 with a traceback."""
        body = ('%d %s\n' % (exc.status, exc.reason)).encode('ascii')
        head = self._head_bytes(exc.status, [
            (b'content-type', b'text/plain; charset=utf-8'),
            (b'content-length', str(len(body)).encode('ascii')),
        ], False)
        try:
            await self._loop.sock_sendall(conn, head + body)
        except Exception:
            pass


async def serve(app, host='127.0.0.1', port=8000):
    """Serve until cancelled.  The coroutine behind ``run``."""
    server = Server(app, host=host, port=port)
    await server.start()
    try:
        await server._accept_task
    finally:
        await server.stop()


def run(app, host='127.0.0.1', port=8000):
    """Serve an ASGI app until interrupted -- the one-line entry point."""
    return _asyncio.run(serve(app, host=host, port=port))
