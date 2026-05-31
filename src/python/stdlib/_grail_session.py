"""Grail session-local storage helpers.

GemStone Python modules are committed singletons, so a module-level
mutable container created at import time is *persistent*: any session
that mutates it and then commits application data drags that transient
state into the repository, where it collides with other sessions and
(for C-backed objects such as compiled regex patterns) becomes a
dangling reference faulted into the next session.

``SessionDict`` is a dict-like view whose entries live in SessionTemps,
reached through the Smalltalk ``gemstone.sessionDict(name)`` primitive.
The backing dict is created fresh for each Gem process and is never
committed, so a module-level

    _cache = SessionDict("re._cache")

gives every session its own cache without changing the surrounding code.
"""


class SessionDict:
    """A dict-like facade over a per-session dict held in SessionTemps.

    Only the operations Grail's caches actually use are implemented.
    Every call re-fetches the backing dict from ``gemstone.sessionDict``,
    so the view is always bound to the *current* session's storage and
    nothing it holds is ever committed.
    """

    __slots__ = ("_name",)

    def __init__(self, name):
        self._name = name

    def _dict(self):
        # Re-fetch each time: a single SessionDict instance (created once
        # at module import) must resolve to the *calling* session's store.
        # `gemstone` is imported lazily (not at module top) so that
        # `from _grail_session import SessionDict` has no import-time side
        # effect — keeping importer module bodies (re, jinja2) free of an
        # import chain that could perturb their own load/reload.
        import gemstone
        return gemstone.sessionDict(self._name)

    def __getitem__(self, key):
        return self._dict()[key]

    def __setitem__(self, key, value):
        self._dict()[key] = value

    def __delitem__(self, key):
        del self._dict()[key]

    def __contains__(self, key):
        return key in self._dict()

    def __len__(self):
        return len(self._dict())

    def __iter__(self):
        return iter(self._dict())

    def get(self, key, default=None):
        return self._dict().get(key, default)

    def pop(self, key, default=None):
        # re only ever calls pop(key, None); the explicit default keeps us
        # off variadic-arg forwarding.
        return self._dict().pop(key, default)

    def clear(self):
        self._dict().clear()

    def keys(self):
        return self._dict().keys()

    def values(self):
        return self._dict().values()

    def items(self):
        return self._dict().items()
