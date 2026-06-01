# GRAIL weakref module — real weak references backed by GemStone ephemerons.
#
# `ref` is the Smalltalk `WeakReference` class (in the Python dictionary),
# which has Python __new__/__call__/__eq__/__hash__ methods. Everything
# else (proxy, WeakValueDictionary, WeakKeyDictionary, WeakSet, WeakMethod,
# finalize) is a thin Python class built on top of `ref` callbacks for
# auto-pruning when a referent is reclaimed.
#
# Grail extension: `weakref._collect()` forces GemStone in-memory collection
# and drains the ephemeron finalization queue — the equivalent of CPython's
# gc.collect() for the purpose of exercising weak behavior in tests.
#
# Not implemented: `getweakrefcount` / `getweakrefs` raise NotImplementedError
# (GemStone has no reference counting and tracking would be wasteful — see
# WeakReference.gs for rationale).


import _weakref


def ref(obj, callback=None):
    """weakref.ref(obj[, callback]) — create a weak reference. The returned
    object is a Smalltalk WeakReference instance and responds to __call__,
    __eq__, and __hash__."""
    if callback is None:
        return _weakref.ref(obj)
    return _weakref.ref(obj, callback)


def proxy(obj, callback=None):
    """weakref.proxy(obj[, callback]) — return a transparent weak proxy."""
    if callable(obj):
        return _CallableProxy(obj, callback)
    return _Proxy(obj, callback)


def _collect(_unused=None):
    """Grail extension: force GC + drain ephemeron finalization queue.
    The Python-level equivalent of CPython's gc.collect() for testing
    weak-reference behavior.

    The unused parameter exists so this compiles as `_collect:` (env-1
    1-arg) — module attribute load wraps `name:` methods in a BoundMethod
    rather than invoking them and returning their value (which is what
    happens for true 0-arg methods)."""
    _weakref._collect()


def getweakrefcount(obj):
    raise NotImplementedError(
        "Grail does not track weak reference counts (GemStone has no refcount)"
    )


def getweakrefs(obj):
    raise NotImplementedError(
        "Grail does not track weak references (GemStone has no refcount)"
    )


# Module-level registry that keeps finalize() instances alive until they fire
# or are explicitly detached (matching CPython's behavior, where the module
# tracks finalizers internally).
_pending_finalizers = set()


class _Proxy:
    """weakref.proxy for non-callable objects. Delegates attribute access
    to the live referent; raises ReferenceError once the referent is gone."""

    __slots__ = ("__ref",)

    def __init__(self, obj, callback=None):
        object.__setattr__(self, "_Proxy__ref", ref(obj, callback))

    def __get(self):
        # Use the explicit mangled name to match ``__init__``'s
        # ``object.__setattr__(self, "_Proxy__ref", ...)``.  Grail does not
        # implement Python's ``__name`` -> ``_Class__name`` name mangling, so
        # a bare ``self.__ref`` would read ``__ref`` (a miss), fall through to
        # ``__getattr__``, and recurse back into ``__get`` forever (blowing the
        # stack — surfaced via ``flask.jsonify`` -> ``current_app`` proxying).
        v = self._Proxy__ref()
        if v is None:
            raise ReferenceError("weakly-referenced object no longer exists")
        return v

    def __getattr__(self, name):
        # Guard the internal slot so a miss can never recurse into __get.
        if name == "_Proxy__ref" or name == "__ref":
            raise AttributeError(name)
        return getattr(self.__get(), name)

    def __setattr__(self, name, value):
        setattr(self.__get(), name, value)

    def __delattr__(self, name):
        delattr(self.__get(), name)

    def __repr__(self):
        try:
            return repr(self.__get())
        except ReferenceError:
            return "<weakproxy to dead reference>"

    def __str__(self):
        return str(self.__get())

    def __len__(self):
        return len(self.__get())

    def __getitem__(self, key):
        return self.__get()[key]

    def __setitem__(self, key, value):
        self.__get()[key] = value

    def __delitem__(self, key):
        del self.__get()[key]

    def __contains__(self, item):
        return item in self.__get()

    def __iter__(self):
        return iter(self.__get())

    def __eq__(self, other):
        return self.__get() == other

    def __hash__(self):
        return hash(self.__get())

    def __bool__(self):
        return bool(self.__get())


class _CallableProxy(_Proxy):
    """proxy for callable referents — adds __call__ delegation."""

    def __call__(self, *args, **kwargs):
        return self._Proxy__ref().__call__(*args, **kwargs) if self._Proxy__ref() is not None \
            else (_ for _ in ()).throw(ReferenceError(
                "weakly-referenced object no longer exists"))


class WeakValueDictionary:
    """Mapping whose values are held weakly. An entry vanishes when its value
    is reclaimed."""

    def __init__(self, dict_or_iter=None):
        self._data = {}
        if dict_or_iter is not None:
            self.update(dict_or_iter)

    def _make_remover(self, key):
        d = self._data
        def remove(_r):
            existing = d.get(key)
            if existing is _r:
                d.pop(key, None)
        return remove

    def __setitem__(self, key, value):
        self._data[key] = ref(value, self._make_remover(key))

    def __getitem__(self, key):
        r = self._data[key]
        v = r()
        if v is None:
            del self._data[key]
            raise KeyError(key)
        return v

    def __delitem__(self, key):
        del self._data[key]

    def __contains__(self, key):
        r = self._data.get(key)
        return r is not None and r() is not None

    def __len__(self):
        n = 0
        for r in self._data.values():
            if r() is not None:
                n += 1
        return n

    def __iter__(self):
        for k, r in list(self._data.items()):
            if r() is not None:
                yield k

    def keys(self):
        return list(iter(self))

    def values(self):
        out = []
        for r in self._data.values():
            v = r()
            if v is not None:
                out.append(v)
        return out

    def items(self):
        out = []
        for k, r in self._data.items():
            v = r()
            if v is not None:
                out.append((k, v))
        return out

    def get(self, key, default=None):
        r = self._data.get(key)
        if r is None:
            return default
        v = r()
        return v if v is not None else default

    def pop(self, key, *args):
        try:
            r = self._data.pop(key)
        except KeyError:
            if args:
                return args[0]
            raise
        v = r()
        if v is None and not args:
            raise KeyError(key)
        return v if v is not None else args[0]

    def setdefault(self, key, default=None):
        v = self.get(key)
        if v is None:
            self[key] = default
            return default
        return v

    def update(self, other):
        if hasattr(other, "keys"):
            for k in other.keys():
                self[k] = other[k]
        else:
            for k, v in other:
                self[k] = v

    def clear(self):
        self._data.clear()

    def copy(self):
        c = WeakValueDictionary()
        for k, v in self.items():
            c[k] = v
        return c


class WeakKeyDictionary:
    """Mapping whose keys are held weakly. An entry vanishes when its key
    is reclaimed. Lookup is by identity (`is`)."""

    def __init__(self, dict_or_iter=None):
        # list of (key_ref, value) — order preserved.
        self._entries = []
        if dict_or_iter is not None:
            self.update(dict_or_iter)

    def _find(self, key):
        for i, (r, v) in enumerate(self._entries):
            if r() is key:
                return i
        return -1

    def _make_remover(self, key_ref):
        entries = self._entries
        def remove(_r):
            for i, (r, _v) in enumerate(entries):
                if r is key_ref:
                    del entries[i]
                    return
        return remove

    def __setitem__(self, key, value):
        i = self._find(key)
        if i >= 0:
            r = self._entries[i][0]
            self._entries[i] = (r, value)
            return
        # Build the ref first so the callback closure can capture it.
        holder = [None]
        def remove(_r):
            entries = self._entries
            for i, (r, _v) in enumerate(entries):
                if r is holder[0]:
                    del entries[i]
                    return
        r = ref(key, remove)
        holder[0] = r
        self._entries.append((r, value))

    def __getitem__(self, key):
        i = self._find(key)
        if i < 0:
            raise KeyError(key)
        return self._entries[i][1]

    def __delitem__(self, key):
        i = self._find(key)
        if i < 0:
            raise KeyError(key)
        del self._entries[i]

    def __contains__(self, key):
        return self._find(key) >= 0

    def __len__(self):
        n = 0
        for r, _v in self._entries:
            if r() is not None:
                n += 1
        return n

    def __iter__(self):
        for r, _v in list(self._entries):
            k = r()
            if k is not None:
                yield k

    def keys(self):
        return list(iter(self))

    def values(self):
        out = []
        for r, v in self._entries:
            if r() is not None:
                out.append(v)
        return out

    def items(self):
        out = []
        for r, v in self._entries:
            k = r()
            if k is not None:
                out.append((k, v))
        return out

    def get(self, key, default=None):
        i = self._find(key)
        if i < 0:
            return default
        return self._entries[i][1]

    def pop(self, key, *args):
        i = self._find(key)
        if i < 0:
            if args:
                return args[0]
            raise KeyError(key)
        v = self._entries[i][1]
        del self._entries[i]
        return v

    def setdefault(self, key, default=None):
        i = self._find(key)
        if i >= 0:
            return self._entries[i][1]
        self[key] = default
        return default

    def update(self, other):
        if hasattr(other, "keys"):
            for k in other.keys():
                self[k] = other[k]
        else:
            for k, v in other:
                self[k] = v

    def clear(self):
        self._entries = []

    def copy(self):
        c = WeakKeyDictionary()
        for k, v in self.items():
            c[k] = v
        return c


class WeakSet:
    """Set holding its members weakly; members drop out on reclamation."""

    def __init__(self, iterable=None):
        self._refs = []
        if iterable is not None:
            for x in iterable:
                self.add(x)

    def _make_remover(self):
        refs = self._refs
        holder = [None]
        def remove(_r):
            for i, r in enumerate(refs):
                if r is holder[0]:
                    del refs[i]
                    return
        return remove, holder

    def add(self, obj):
        for r in self._refs:
            if r() is obj:
                return
        remove, holder = self._make_remover()
        r = ref(obj, remove)
        holder[0] = r
        self._refs.append(r)

    def discard(self, obj):
        for i, r in enumerate(self._refs):
            if r() is obj:
                del self._refs[i]
                return

    def remove(self, obj):
        for i, r in enumerate(self._refs):
            if r() is obj:
                del self._refs[i]
                return
        raise KeyError(obj)

    def __contains__(self, obj):
        for r in self._refs:
            if r() is obj:
                return True
        return False

    def __len__(self):
        n = 0
        for r in self._refs:
            if r() is not None:
                n += 1
        return n

    def __iter__(self):
        for r in list(self._refs):
            v = r()
            if v is not None:
                yield v

    def clear(self):
        self._refs = []

    def copy(self):
        return WeakSet(iter(self))

    def update(self, iterable):
        for x in iterable:
            self.add(x)


class WeakMethod:
    """Weak reference to a bound method.

    Holds the instance weakly and the function strongly; when the instance
    dies, calling the WeakMethod returns None.

    NOTE: Not a subclass of `ref` (Grail's `ref` is a Smalltalk class which
    Python can't directly subclass with the required slot layout). If a
    consumer needs `isinstance(x, weakref.ref)` to match WeakMethod, that
    use site would need separate handling."""

    def __init__(self, meth, callback=None):
        self._inst_ref = ref(meth.__self__, self._make_cb(callback))
        self._func = meth.__func__
        self._cls = type(meth.__self__)

    def _make_cb(self, user_cb):
        if user_cb is None:
            return None
        outer = self
        def cb(_r):
            user_cb(outer)
        return cb

    def __call__(self):
        obj = self._inst_ref()
        if obj is None:
            return None
        return self._func.__get__(obj, self._cls)

    def __eq__(self, other):
        if not isinstance(other, WeakMethod):
            return NotImplemented
        return self._inst_ref == other._inst_ref and self._func is other._func

    def __hash__(self):
        return hash((self._inst_ref, id(self._func)))


def _make_finalize_callback(finalizer):
    """Build the ref callback in a separate frame so its closure only
    captures the finalizer — not the referent (`obj`) which would otherwise
    sit in `__init__`'s parameter slot and keep the would-be-dead object
    alive even though the body never reads it."""
    return lambda _r: finalizer._fire()


class finalize:
    """Register a finalizer to be invoked when an object is reclaimed."""

    def __init__(self, obj, func, *args, **kwargs):
        _pending_finalizers.add(self)
        self._func = func
        self._args = args
        self._kwargs = kwargs
        self._alive = True
        self._obj_ref = ref(obj, _make_finalize_callback(self))

    @property
    def alive(self):
        return self._alive

    def __call__(self):
        if not self._alive:
            return None
        self._alive = False
        f, a, k = self._func, self._args, self._kwargs
        self._func = None
        self._args = None
        self._kwargs = None
        _pending_finalizers.discard(self)
        return f(*a, **k)

    def _fire(self):
        if not self._alive:
            return
        self._alive = False
        try:
            self._func(*self._args, **self._kwargs)
        except Exception:
            pass
        self._func = None
        self._args = None
        self._kwargs = None
        _pending_finalizers.discard(self)

    def detach(self):
        if not self._alive:
            return None
        self._alive = False
        info = (None, self._func, self._args, self._kwargs)
        self._func = None
        self._args = None
        self._kwargs = None
        _pending_finalizers.discard(self)
        return info

    def peek(self):
        if not self._alive:
            return None
        return (None, self._func, self._args, self._kwargs)
