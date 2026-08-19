# Grail ``selectors'' — a minimal stdlib-compatible selector built on the
# Grail ``select'' module (which operates on socket OBJECTS, not raw fds — see
# select.py).  Provides the subset ``socketserver`` / werkzeug's dev server
# use: ``DefaultSelector`` with register / unregister / modify / select /
# get_map / close and the ``EVENT_READ`` / ``EVENT_WRITE`` flags.

import select as _select

EVENT_READ = 1 << 0
EVENT_WRITE = 1 << 1


class SelectorKey:
    """``(fileobj, fd, events, data)`` — what ``select`` returns per ready
    object."""

    def __init__(self, fileobj, fd, events, data):
        self.fileobj = fileobj
        self.fd = fd
        self.events = events
        self.data = data

    def __iter__(self):
        # CPython's SelectorKey is a namedtuple, so `fileobj, fd, events, data
        # = key' is idiomatic and appears in real code.
        return iter((self.fileobj, self.fd, self.events, self.data))

    def __eq__(self, other):
        if isinstance(other, SelectorKey):
            return (self.fileobj is other.fileobj and self.fd == other.fd
                    and self.events == other.events and self.data == other.data)
        return NotImplemented

    def __repr__(self):
        return "SelectorKey(fileobj=%r, fd=%r, events=%r, data=%r)" % (
            self.fileobj, self.fd, self.events, self.data)


def _fileobj_to_fd(fileobj):
    if isinstance(fileobj, int):
        return fileobj
    try:
        return int(fileobj.fileno())
    except (AttributeError, TypeError, ValueError):
        raise ValueError("invalid fileobj: {!r}".format(fileobj))


class _BaseSelector:
    def __init__(self):
        self._fd_to_key = {}

    def register(self, fileobj, events, data=None):
        if not events or (events & ~(EVENT_READ | EVENT_WRITE)):
            raise ValueError("invalid events: {!r}".format(events))
        fd = _fileobj_to_fd(fileobj)
        key = SelectorKey(fileobj, fd, events, data)
        self._fd_to_key[fd] = key
        return key

    def unregister(self, fileobj):
        return self._fd_to_key.pop(_fileobj_to_fd(fileobj), None)

    def modify(self, fileobj, events, data=None):
        self.unregister(fileobj)
        return self.register(fileobj, events, data)

    def get_map(self):
        return self._fd_to_key

    def get_key(self, fileobj):
        return self._fd_to_key[_fileobj_to_fd(fileobj)]

    def close(self):
        self._fd_to_key.clear()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, tb):
        self.close()


class SelectSelector(_BaseSelector):
    def select(self, timeout=None):
        readers = []
        writers = []
        for key in self._fd_to_key.values():
            if key.events & EVENT_READ:
                readers.append(key.fileobj)
            if key.events & EVENT_WRITE:
                writers.append(key.fileobj)

        if not readers and not writers:
            # Nothing registered.  select() refuses to wait on an empty set
            # with no timeout (it could never wake), and an empty answer is
            # what a caller polling an idle selector wants anyway.
            return []

        r, w, _x = _select.select(readers, writers, [], timeout)
        rset = {id(o): o for o in r}
        wset = {id(o): o for o in w}

        ready = []
        for key in self._fd_to_key.values():
            events = 0
            if id(key.fileobj) in rset:
                events |= EVENT_READ
            if id(key.fileobj) in wset:
                events |= EVENT_WRITE
            if events:
                ready.append((key, events))
        return ready


BaseSelector = _BaseSelector

# CPython picks the best available multiplexer per platform.  Grail has one
# mechanism -- the scheduler's readiness events, reached through select --
# so the platform-specific names are aliases rather than absent, letting code
# that names PollSelector explicitly still run.
PollSelector = SelectSelector
DefaultSelector = SelectSelector
