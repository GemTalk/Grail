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
work happens in socket_module.gs (``PySocket>>___select___``); this module
resolves Python objects to sockets and maps the answer back.

Still a subset of CPython's select:

  * It selects on socket OBJECTS, not file descriptors.  A raw int fd cannot
    be registered -- the event registry is keyed by GsSocket -- so anything
    exposing ``_readableNow`` (a socket, or an object with a ``.socket``, e.g.
    a socketserver) works and an int does not.
  * ``xlist`` is accepted and always answers empty.  ``whenReadable:`` fires
    on an exceptional condition as well as on data, so an error state surfaces
    as readability, which is what a caller then discovers on read.
  * poll/epoll/kqueue objects are absent.  They wrap syscalls that have no
    equivalent here; ``selectors`` is built on this select instead.
"""

import socket as _socket

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
        s = _readiness(o)
        if s is None:
            if isinstance(o, int):
                raise TypeError(
                    "select() on a raw file descriptor is not supported in "
                    "Grail: readiness events are keyed by socket, so pass the "
                    "socket object (%s contained %r)" % (name, o))
            raise TypeError(
                "%s contained %r, which is neither a socket nor an object "
                "with a .socket attribute" % (name, o))
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
