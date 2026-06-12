# GRAIL reprlib - size-limited repr.  Provides the Repr class, the
# module-level aRepr instance and repr() function, and recursive_repr.
# Deviation: recursive_repr's cycle detection keys on object identity
# only (no per-thread discrimination).


__all__ = ["Repr", "repr", "aRepr", "recursive_repr"]


def recursive_repr(fillvalue="..."):
    """Decorator that short-circuits recursive calls to __repr__ with
    fillvalue instead of infinite recursion."""

    def decorating_function(user_function):
        repr_running = []

        def wrapper(self):
            key = id(self)
            if key in repr_running:
                return fillvalue
            repr_running.append(key)
            try:
                result = user_function(self)
            finally:
                repr_running.remove(key)
            return result

        return wrapper

    return decorating_function


class Repr:
    def __init__(self):
        self.maxlevel = 6
        self.maxtuple = 6
        self.maxlist = 6
        self.maxdict = 4
        self.maxset = 6
        self.maxfrozenset = 6
        self.maxstring = 30
        self.maxlong = 40
        self.maxother = 30
        self.fillvalue = "..."

    def repr(self, x):
        return self.repr1(x, self.maxlevel)

    def repr1(self, x, level):
        if isinstance(x, str):
            return self.repr_str(x, level)
        if isinstance(x, list):
            return self.repr_list(x, level)
        if isinstance(x, tuple):
            return self.repr_tuple(x, level)
        if isinstance(x, dict):
            return self.repr_dict(x, level)
        if isinstance(x, set):
            return self.repr_set(x, level)
        return self.repr_instance(x, level)

    def _join_items(self, items, maxcount, level, left, right, single_trail):
        if level <= 0:
            return left + self.fillvalue + right
        parts = []
        n = len(items)
        count = maxcount
        if n < count:
            count = n
        i = 0
        for item in items:
            if i >= count:
                break
            parts.append(self.repr1(item, level - 1))
            i = i + 1
        if n > maxcount:
            parts.append(self.fillvalue)
        body = ", ".join(parts)
        if single_trail and n == 1 and n <= maxcount:
            body = body + ","
        return left + body + right

    def repr_list(self, x, level):
        return self._join_items(x, self.maxlist, level, "[", "]", False)

    def repr_tuple(self, x, level):
        return self._join_items(x, self.maxtuple, level, "(", ")", True)

    def repr_set(self, x, level):
        if len(x) == 0:
            return "set()"
        return self._join_items(sorted(x), self.maxset, level, "{", "}", False)

    def repr_dict(self, x, level):
        n = len(x)
        if n == 0:
            return "{}"
        if level <= 0:
            return "{" + self.fillvalue + "}"
        parts = []
        count = 0
        for key in x:
            if count >= self.maxdict:
                break
            parts.append(self.repr1(key, level - 1) + ": " + self.repr1(x[key], level - 1))
            count = count + 1
        if n > self.maxdict:
            parts.append(self.fillvalue)
        return "{" + ", ".join(parts) + "}"

    def repr_str(self, x, level):
        s = x.__repr__()
        if len(s) > self.maxstring:
            i = (self.maxstring - 3) // 2
            j = self.maxstring - 3 - i
            s = s[:i] + self.fillvalue + s[len(s) - j:]
        return s

    def repr_instance(self, x, level):
        s = x.__repr__()
        if len(s) > self.maxother:
            i = (self.maxother - 3) // 2
            j = self.maxother - 3 - i
            s = s[:i] + self.fillvalue + s[len(s) - j:]
        return s


aRepr = Repr()


def repr(x):
    return aRepr.repr(x)
