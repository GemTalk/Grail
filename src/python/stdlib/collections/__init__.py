# GRAIL minimal collections stub.
#
# CPython's `collections` exposes specialised container classes
# (OrderedDict, deque, namedtuple, Counter, defaultdict, ChainMap).
# Grail only needs the subset that downstream Flask packages
# (blinker, werkzeug, itsdangerous) actually touch.  Expand on
# demand.


class defaultdict(dict):
    """Minimal defaultdict: dict that auto-creates missing keys
    by calling default_factory().
    """

    def __init__(self, default_factory=None):
        # GRAIL: stub drops upstream's `*args, **kwargs` flexibility.
        # Grail's varargs method-prologue codegen doesn't yet bind
        # *args/**kwargs locals, and downstream Flask packages only
        # call `defaultdict(factory)` (single positional).
        super().__init__()
        self.default_factory = default_factory

    def __missing__(self, key):
        if self.default_factory is None:
            raise KeyError(key)
        value = self.default_factory()
        self[key] = value
        return value

    def __getitem__(self, key):
        if key in self:
            # Use super().__getitem__(key) to bypass our own override
            # and reach dict's instance-side lookup.
            return super().__getitem__(key)
        return self.__missing__(key)


__all__ = ['defaultdict']
