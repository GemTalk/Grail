"""select() for Grail, over GemStone's socket readiness EVENTS.

GemStone exposes no select(2) binding, and this module used to work around
that by polling: it woke every 50ms, only ever blocked on the FIRST socket in
the list, and reported every socket in ``wlist`` writable without asking.  A
second socket could therefore be noticed up to 50ms late, and a writer that
would in fact block was reported ready.

There is no need for any of that.  The scheduler has a per-socket readiness
registry -- ``Processor whenReadable: sock signal: aSemaphore`` (and
``whenWritable:``) -- so registering every socket against one semaphore and
waiting on it IS an N-way wait: the gem sleeps until the first socket is ready
or the timeout expires, and other green threads keep running meanwhile.  The
work happens in _socket_module.gs (``PyRawSocket>>___select___``); this module
resolves Python objects to sockets and maps the answer back.

It imports ``_socket'', the primitive layer, rather than the public ``socket''
facade: ``_select'' reaches the GsSocket and the scheduler directly, so asking
the facade for it was backwards even while the facade was the only socket
module there was.

Still a subset of CPython's select:

  * The event registry is keyed by GsSocket, so what it selects on must come
    down to a socket this session created: the socket itself, an object with
    a ``.socket`` (e.g. a socketserver), or an int fd -- or an object whose
    ``fileno()`` answers one -- that belongs to such a socket (asyncore
    selects on fds).  Any other descriptor is EBADF.
  * ``xlist`` is accepted and always answers empty.  ``whenReadable:`` fires
    on an exceptional condition as well as on data, so an error state surfaces
    as readability, which is what a caller then discovers on read.
  * poll/epoll/kqueue objects are absent.  They wrap syscalls that have no
    equivalent here; ``selectors`` is built on this select instead.
"""

import _socket

error = OSError

PIPE_BUF = 512


def _readiness(obj, _depth=0):
    """The object answering the readiness protocol for ``obj`` -- itself or a
    socket it wraps -- or None when there is none.

    Resolution order: a wrapper that answers ``_selectSocket`` hands over the
    socket it wants watched (ssl.SSLSocket does); otherwise an object that
    answers ``_readableNow`` IS the socket.  Probing a wrapper's private
    internals instead was tried and is worse -- ``getattr(sslsock, "_sock",
    None)`` raises an uncatchable DNU here rather than answering the default.
    The backend needs the real socket, not the wrapper, because it reaches
    the GsSocket underneath.

    ``socket`` is followed because socketserver's BaseServer holds its
    listener there and cannot be given the protocol without diverging from the
    stdlib source."""
    if obj is None or _depth > 4:
        return None
    if hasattr(obj, "_selectSocket"):
        # A wrapper handing over the socket it wants watched (ssl.SSLSocket).
        return _readiness(obj._selectSocket(), _depth + 1)
    if hasattr(obj, "_readableNow"):
        return obj
    inner = getattr(obj, "socket", None)
    if inner is not None and inner is not obj:
        return _readiness(inner, _depth + 1)
    return None


def _resolve_all(objs, name):
    out = []
    for o in objs:
        if isinstance(o, int) and not isinstance(o, bool):
            # An fd: the backend finds the socket that owns it, or says EBADF.
            if o < 0:
                raise ValueError(
                    "file descriptor cannot be a negative integer (%d)" % o)
            out.append(o)
            continue
        s = _readiness(o)
        if s is None:
            fileno = getattr(o, "fileno", None)
            if fileno is None:
                raise TypeError(
                    "argument must be an int, or have a fileno() method "
                    "(%s contained %r)" % (name, o))
            fd = fileno()
            if not isinstance(fd, int):
                raise TypeError("fileno() returned a non-integer")
            s = fd
        out.append(s)
    return out


def select(rlist, wlist, xlist, timeout=None):
    """(readable, writable, []) -- blocks until one is ready or timeout."""
    rlist = list(rlist)
    wlist = list(wlist)
    rsocks = _resolve_all(rlist, "rlist")
    wsocks = _resolve_all(wlist, "wlist")

    if not rsocks and not wsocks:
        # Nothing to wait on.  CPython would block forever on a timeout of
        # None; sleeping with no way to wake is a bug every time, so say so.
        if timeout is None:
            raise ValueError(
                "select() with no sockets and no timeout would block forever")
        return ([], [], [])

    ms = None if timeout is None else int(timeout * 1000)
    ridx, widx = _socket._select(rsocks, wsocks, ms)
    return ([rlist[i - 1] for i in ridx], [wlist[i - 1] for i in widx], [])


def _select_waking(rlist, wlist, timeout, waker):
    """Grail-only: select() that another green thread can end early.

    ``waker`` is a ``_thread`` lock the caller HOLDS; releasing it from any
    other green thread wakes this wait, and a release that lands before the
    wait makes it return at once.  It comes back held.  The asyncio loop waits
    here so call_soon_threadsafe can wake it -- CPython does the same with a
    self-pipe, which GemStone's sockets cannot make (no Unix-domain sockets).

    Unlike select(), no sockets with no timeout is legal: it waits for the
    waker alone.  Returns (readable, writable)."""
    rlist = list(rlist)
    wlist = list(wlist)
    rsocks = _resolve_all(rlist, "rlist")
    wsocks = _resolve_all(wlist, "wlist")
    # Round UP: a sub-millisecond timer must still wait, not poll in a spin.
    ms = None if timeout is None else -(-int(timeout * 1000000) // 1000)
    ridx, widx = _socket._select(rsocks, wsocks, ms, waker)
    return ([rlist[i - 1] for i in ridx], [wlist[i - 1] for i in widx])
