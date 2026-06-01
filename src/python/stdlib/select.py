# Grail ``select'' — a small subset over the socket module's readiness
# checks.  GemStone has no os-level ``select(2)'' binding, but ``GsSocket''
# integrates with the GsProcess scheduler, so ``PySocket._readableNow'' /
# ``_readableWithin'' poll a single socket (suspending the green thread while
# waiting).  This ``select'' therefore operates on socket-ish OBJECTS — a
# ``socket.socket`` or anything exposing ``_readableNow`` (or a ``.socket``
# attribute that does, e.g. a socketserver ``BaseServer``) — rather than raw
# file descriptors.  Enough for ``socketserver`` / werkzeug's dev server,
# which select on the single listening socket.

error = OSError


def _readiness(obj):
    """Return the object answering the readiness protocol for ``obj`` (itself,
    or its ``.socket``), or None."""
    if hasattr(obj, "_readableNow"):
        return obj
    inner = getattr(obj, "socket", None)
    if inner is not None and hasattr(inner, "_readableNow"):
        return inner
    return None


def select(rlist, wlist, xlist, timeout=None):
    """``(readable, writable, [])``.  Writable sockets are reported ready
    immediately (the dev server writes small responses without blocking)."""
    rsocks = [_readiness(o) for o in rlist]

    def poll_ready():
        out = []
        for obj, s in zip(rlist, rsocks):
            if s is not None and s._readableNow():
                out.append(obj)
        return out

    rready = poll_ready()
    wready = list(wlist)
    if rready or wready or timeout == 0:
        return (rready, wready, [])

    ms = -1 if timeout is None else int(timeout * 1000)
    live = [s for s in rsocks if s is not None]

    # Fast path: a single socket (the listener) — block on it directly.
    if len(live) == 1:
        if live[0]._readableWithin(ms):
            return (poll_ready(), list(wlist), [])
        return ([], [], [])

    # Multiple sockets: poll in short slices until one is ready or we time out.
    slice_ms = 50
    waited = 0
    while True:
        if live:
            live[0]._readableWithin(slice_ms)
        rready = poll_ready()
        if rready:
            return (rready, list(wlist), [])
        if ms >= 0:
            waited += slice_ms
            if waited >= ms:
                return ([], [], [])
