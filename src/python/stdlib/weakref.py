# GRAIL minimal weakref stub.
#
# CPython's weakref module exposes ref() / WeakKeyDictionary /
# WeakValueDictionary / proxy() with real garbage-collection
# semantics tied to CPython's refcounting.  Grail uses GemStone
# persistence, which doesn't expose weak refs to user code in
# the same shape, so we fake the API: a `ref(x)` is just a
# strong wrapper that returns x when called.
#
# Side effect: nothing gets reclaimed early, so long-lived
# WeakValueDictionaries (e.g. blinker's signal namespace cache)
# will keep their values alive forever.  Acceptable for the
# import-time and short-run paths we care about; replace with a
# real weak-ref implementation if we start running long
# processes that need cleanup.


class ref:
    """Strong-ref stand-in for weakref.ref."""

    def __init__(self, obj, callback=None):
        self._obj = obj
        self._callback = callback

    def __call__(self):
        return self._obj

    def __eq__(self, other):
        if isinstance(other, ref):
            return self._obj is other._obj
        return False

    def __hash__(self):
        return id(self._obj)


def proxy(obj, callback=None):
    """Strong-ref proxy: just return the object."""
    return obj


class WeakValueDictionary(dict):
    """Dict whose values are 'weakly' held.  Grail stub: just
    a regular dict — nothing is collected until the dict itself is."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)


class WeakKeyDictionary(dict):
    """Same shape as WeakValueDictionary."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)


class WeakSet(set):
    """Set whose members are 'weakly' held.  Grail stub: regular set."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)


def getweakrefcount(obj):
    return 0


def getweakrefs(obj):
    return []


class WeakMethod(ref):
    """Weak ref to a bound method.  Real semantics: hold the
    method's __self__ and __func__ separately so neither keeps
    the instance alive.  Stub: strong ref to the whole method."""

    def __init__(self, meth, callback=None):
        super().__init__(meth, callback)

