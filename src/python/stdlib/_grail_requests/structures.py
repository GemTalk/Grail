# Grail requests shim — CaseInsensitiveDict (the subset consumers use).


class CaseInsensitiveDict:
    """Mapping with case-insensitive lookup that preserves the casing
    of the most recently set key, mirroring requests.structures."""

    def __init__(self, data=None):
        self._store = {}            # lower-key -> (actual-key, value)
        if data:
            if hasattr(data, 'items'):
                for k, v in data.items():
                    self[k] = v
            else:
                for k, v in data:
                    self[k] = v

    def __setitem__(self, key, value):
        self._store[key.lower()] = (key, value)

    def __getitem__(self, key):
        return self._store[key.lower()][1]

    def __delitem__(self, key):
        del self._store[key.lower()]

    def __contains__(self, key):
        return key.lower() in self._store

    def __len__(self):
        return len(self._store)

    def __iter__(self):
        return iter([pair[0] for pair in self._store.values()])

    def get(self, key, default=None):
        if key.lower() in self._store:
            return self._store[key.lower()][1]
        return default

    def keys(self):
        return [pair[0] for pair in self._store.values()]

    def values(self):
        return [pair[1] for pair in self._store.values()]

    def items(self):
        return [(pair[0], pair[1]) for pair in self._store.values()]

    def update(self, other):
        if hasattr(other, 'items'):
            for k, v in other.items():
                self[k] = v
        else:
            for k, v in other:
                self[k] = v

    def copy(self):
        return CaseInsensitiveDict(self.items())

    def __repr__(self):
        return 'CaseInsensitiveDict(%r)' % (dict(self.items()),)
