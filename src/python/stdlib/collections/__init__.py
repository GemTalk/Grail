# GRAIL collections - subset matching the Werkzeug / Flask / blinker
# touchpoints: defaultdict (kept from the prior stub), OrderedDict,
# deque, namedtuple, Counter, ChainMap.
#
# Grail's regular dict already preserves insertion order (it inherits
# from KeyValueDictionary, which itself uses ordered insertion), so
# OrderedDict is a thin dict subclass adding the few unique methods
# (move_to_end, popitem(last=False)).  Counter is a dict-with-counts
# subclass.  ChainMap is a wrapper around a list of dicts.


class defaultdict(dict):
    """Minimal defaultdict: dict that auto-creates missing keys
    by calling default_factory().
    """

    def __init__(self, default_factory=None, *args, **kwargs):
        super().__init__()
        self.default_factory = default_factory
        if args:
            self.update(args[0])
        if kwargs:
            self.update(kwargs)

    def __missing__(self, key):
        if self.default_factory is None:
            raise KeyError(key)
        value = self.default_factory()
        self[key] = value
        return value

    def __getitem__(self, key):
        if key in self:
            return super().__getitem__(key)
        return self.__missing__(key)


class OrderedDict(dict):
    """OrderedDict - dict that preserves insertion order plus a few
    ordering-aware operations.  Grail's underlying dict (KeyValueDict)
    doesn't keep insertion order on its own, so we track key order in
    a parallel list and override the order-sensitive ops."""

    def __init__(self, *args, **kwargs):
        super().__init__()
        self._order = []
        if args:
            seed = args[0]
            if hasattr(seed, 'items'):
                for k, v in seed.items():
                    self[k] = v
            else:
                for k, v in seed:
                    self[k] = v
        if kwargs:
            for k in kwargs:
                self[k] = kwargs[k]

    def __setitem__(self, key, value):
        if key not in self:
            self._order.append(key)
        super().__setitem__(key, value)

    def __delitem__(self, key):
        super().__delitem__(key)
        self._order.remove(key)

    def __iter__(self):
        # `list(self._order)` so callers iterating while mutating don't
        # see torn state.
        return iter(list(self._order))

    def keys(self):
        return list(self._order)

    def values(self):
        return [self[k] for k in self._order]

    def items(self):
        return [(k, self[k]) for k in self._order]

    def clear(self):
        super().clear()
        self._order = []

    def move_to_end(self, key, last=True):
        if key not in self:
            raise KeyError(key)
        self._order.remove(key)
        if last:
            self._order.append(key)
        else:
            self._order.insert(0, key)

    def popitem(self, last=True):
        if not self._order:
            raise KeyError("dictionary is empty")
        key = self._order[-1] if last else self._order[0]
        value = self[key]
        del self[key]
        return (key, value)


class deque:
    """Double-ended queue backed by a list.  O(n) for arbitrary
    indexing, O(1) amortized for append/appendleft/pop/popleft."""

    def __init__(self, iterable=None, maxlen=None):
        self._items = []
        self.maxlen = maxlen
        if iterable is not None:
            for item in iterable:
                self.append(item)

    def append(self, item):
        self._items.append(item)
        if self.maxlen is not None:
            while len(self._items) > self.maxlen:
                self._items.pop(0)

    def appendleft(self, item):
        self._items.insert(0, item)
        if self.maxlen is not None:
            while len(self._items) > self.maxlen:
                self._items.pop()

    def pop(self):
        if not self._items:
            raise IndexError("pop from an empty deque")
        return self._items.pop()

    def popleft(self):
        if not self._items:
            raise IndexError("pop from an empty deque")
        return self._items.pop(0)

    def extend(self, iterable):
        for item in iterable:
            self.append(item)

    def extendleft(self, iterable):
        for item in iterable:
            self.appendleft(item)

    def clear(self):
        self._items = []

    def rotate(self, n=1):
        if not self._items:
            return
        k = self._items
        size = len(k)
        n = n % size
        if n != 0:
            self._items = k[-n:] + k[:-n]

    def __len__(self):
        return len(self._items)

    def __iter__(self):
        return iter(self._items)

    def __getitem__(self, i):
        return self._items[i]

    def __contains__(self, item):
        return item in self._items

    def __bool__(self):
        return len(self._items) > 0

    def __repr__(self):
        return "deque(" + repr(self._items) + ")"


def namedtuple(typename, field_names):
    """Lightweight namedtuple factory.  Returns a sequence-like class
    that supports indexed access, iteration, len(), ``_fields``,
    ``_asdict()``, and ``_replace(**kwargs)``.

    Subclassing the built-in `tuple` would carry the per-element data
    automatically, but Grail's class-call protocol doesn't pipe
    constructor arguments through to the underlying tuple storage when
    the class overrides `__new__`.  Storing values in an instVar and
    fronting them with the sequence protocol is the workaround.

    field_names may be a string ('x y' or 'x,y') or a sequence."""

    if isinstance(field_names, str):
        if ',' in field_names:
            fields = [f.strip() for f in field_names.split(',')]
        else:
            fields = field_names.split()
    else:
        fields = list(field_names)

    class _NT:
        _fields = tuple(fields)
        _typename = typename

        def __init__(self, *values):
            if len(values) != len(self._fields):
                raise TypeError(
                    self._typename + ' takes ' + str(len(self._fields))
                    + ' arguments (' + str(len(values)) + ' given)'
                )
            self._values = list(values)

        def __getitem__(self, i):
            return self._values[i]

        def __len__(self):
            return len(self._values)

        def __iter__(self):
            return iter(self._values)

        def __eq__(self, other):
            if hasattr(other, '_values'):
                return self._values == other._values
            return self._values == list(other)

        def _asdict(self):
            result = {}
            for i in range(len(self._fields)):
                result[self._fields[i]] = self._values[i]
            return result

        def _replace(self, **kwargs):
            values = list(self._values)
            for k in kwargs:
                values[self._fields.index(k)] = kwargs[k]
            # Build the new instance via `type(self).__new__(...)`
            # so the class reference comes from the live instance
            # rather than a free name (Grail can't lift nested-class
            # names into the enclosing function's symbol table).
            cls = type(self)
            new = cls.__new__(cls)
            new._values = values
            return new

        def __repr__(self):
            parts = []
            for i in range(len(self._fields)):
                parts.append(self._fields[i] + '=' + repr(self._values[i]))
            return self._typename + '(' + ', '.join(parts) + ')'

    return _NT


class Counter(dict):
    """Dict subclass for counting hashable objects.  Missing keys
    return 0 instead of raising KeyError."""

    def __init__(self, iterable=None):
        super().__init__()
        if iterable is not None:
            self.update(iterable)

    def __missing__(self, key):
        return 0

    def __getitem__(self, key):
        if key in self:
            return super().__getitem__(key)
        return 0

    def update(self, iterable):
        if isinstance(iterable, dict):
            for k in iterable:
                self[k] = self[k] + iterable[k]
        else:
            for item in iterable:
                self[item] = self[item] + 1

    def most_common(self, n=None):
        # list.sort(key=...) varargs is missing in Grail; do a simple
        # selection-sort on count descending (fine for the small Counter
        # sizes Werkzeug / itsdangerous see).  Tuple-swap with subscript
        # targets isn't supported in codegen either, so swap via a temp.
        pairs = list(self.items())
        size = len(pairs)
        for i in range(size):
            best = i
            for j in range(i + 1, size):
                if pairs[j][1] > pairs[best][1]:
                    best = j
            if best != i:
                tmp = pairs[i]
                pairs[i] = pairs[best]
                pairs[best] = tmp
        if n is None:
            return pairs
        return pairs[:n]

    def total(self):
        result = 0
        for v in self.values():
            result = result + v
        return result

    def elements(self):
        result = []
        for k in self:
            for _ in range(self[k]):
                result.append(k)
        return result


class ChainMap:
    """View over a sequence of mappings; reads consult them in order,
    writes target the first mapping."""

    def __init__(self, *maps):
        if not maps:
            self.maps = [{}]
        else:
            self.maps = list(maps)

    def __getitem__(self, key):
        for m in self.maps:
            if key in m:
                return m[key]
        raise KeyError(key)

    def __setitem__(self, key, value):
        self.maps[0][key] = value

    def __delitem__(self, key):
        if key not in self.maps[0]:
            raise KeyError(key)
        del self.maps[0][key]

    def __contains__(self, key):
        for m in self.maps:
            if key in m:
                return True
        return False

    def __len__(self):
        keys = set()
        for m in self.maps:
            for k in m:
                keys.add(k)
        return len(keys)

    def __iter__(self):
        seen = set()
        for m in self.maps:
            for k in m:
                if k not in seen:
                    seen.add(k)
                    yield k

    def get(self, key, default=None):
        for m in self.maps:
            if key in m:
                return m[key]
        return default

    def keys(self):
        return list(iter(self))

    def values(self):
        return [self[k] for k in self]

    def items(self):
        return [(k, self[k]) for k in self]

    def new_child(self, m=None):
        if m is None:
            m = {}
        child = ChainMap()
        # Replace the auto-created empty dict with our prepended view.
        child.maps = [m]
        for old in self.maps:
            child.maps.append(old)
        return child


__all__ = [
    'defaultdict', 'OrderedDict', 'deque', 'namedtuple',
    'Counter', 'ChainMap',
]
