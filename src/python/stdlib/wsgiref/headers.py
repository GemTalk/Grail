# GRAIL wsgiref.headers - the Headers class: a case-insensitive,
# order-preserving multimap over a list of (name, value) pairs, per
# PEP 3333 response-header semantics.

__all__ = ["Headers"]


def _lower(s):
    return s.lower()


class Headers:
    def __init__(self, headers=None):
        if headers is None:
            headers = []
        self._headers = list(headers)

    def __len__(self):
        return len(self._headers)

    def __setitem__(self, name, val):
        """Replace every header named `name` with one (name, val)."""
        del self[name]
        self._headers.append((name, val))

    def __delitem__(self, name):
        """Delete every header named `name` (no error if absent)."""
        key = _lower(name)
        kept = []
        for pair in self._headers:
            if _lower(pair[0]) != key:
                kept.append(pair)
        self._headers = kept

    def __getitem__(self, name):
        """The LAST value for `name`, or None (CPython contract)."""
        return self.get(name)

    def __contains__(self, name):
        return self.get(name) is not None

    def get(self, name, default=None):
        key = _lower(name)
        found = default
        for pair in self._headers:
            if _lower(pair[0]) == key:
                found = pair[1]
        return found

    def get_all(self, name):
        key = _lower(name)
        out = []
        for pair in self._headers:
            if _lower(pair[0]) == key:
                out.append(pair[1])
        return out

    def keys(self):
        out = []
        for pair in self._headers:
            out.append(pair[0])
        return out

    def values(self):
        out = []
        for pair in self._headers:
            out.append(pair[1])
        return out

    def items(self):
        return list(self._headers)

    def add_header(self, name, value, **params):
        """Append a header with optional MIME parameters:
        add_header("Content-Disposition", "attachment", filename="x")
        -> 'attachment; filename="x"'."""
        parts = []
        if value is not None:
            parts.append(value)
        for key in params:
            pv = params[key]
            attr = key.replace("_", "-")
            if pv is None:
                parts.append(attr)
            else:
                parts.append(attr + '="' + str(pv) + '"')
        self._headers.append((name, "; ".join(parts)))

    def setdefault(self, name, value):
        current = self.get(name)
        if current is None:
            self._headers.append((name, value))
            return value
        return current

    def __str__(self):
        lines = []
        for pair in self._headers:
            lines.append(pair[0] + ": " + pair[1])
        return "\r\n".join(lines) + "\r\n\r\n"

    def __repr__(self):
        return "Headers(" + repr(self._headers) + ")"
