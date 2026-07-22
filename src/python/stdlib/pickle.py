# Bounded pickle for Grail.
#
# CPython's pickle is a stack VM over a byte protocol; Grail instead uses a
# small self-describing tagged byte format that round-trips the picklable
# object graph WITHIN a Grail session (it is NOT CPython-wire-compatible).
# It handles the common cases: None/bool/int/float/str/bytes and
# tuple/list/dict/set/frozenset containers, class/function references (by
# module + name), and arbitrary objects via the __reduce__ protocol
# (callable + args [+ state -> __setstate__]).  Enough for
# operator.attrgetter/itemgetter/methodcaller round-trips (test_operator's
# pickle cases) and simple value pickling (Django's cache backends).
#
# The previous stub returned ``b"__grail_pickle__:" + repr(obj)`` for
# Jinja2's bccache magic-bytes key; the real encoder below is still fully
# deterministic for the ints Jinja2 pickles, so that path is unaffected.

import sys

# The list_iterator type (shared by list iterators AND reversed(list)).
# Pickled explicitly (below) rather than via a picklable reconstructor,
# since Grail's builtin functions/types are not picklable-as-globals.
_LIST_ITER = type(iter([]))

# The tuple_iterator type (forward iter() over a tuple).  Pickled explicitly
# for the same reason as _LIST_ITER; its collection is an immutable tuple, so
# the state is just (collection, position) -- no reverse/exhausted flags.
_TUPLE_ITER = type(iter(()))

_HIGHEST_PROTOCOL = 5
HIGHEST_PROTOCOL = 5
DEFAULT_PROTOCOL = 4


class PickleError(Exception):
    pass


class PicklingError(PickleError):
    pass


class UnpicklingError(PickleError):
    pass


# --------------------------------------------------------------------------
# Encoding
# --------------------------------------------------------------------------
def _emit_len(out, n):
    out.append(str(n).encode("ascii"))
    out.append(b"\n")


def _emit_blob(out, b):
    _emit_len(out, len(b))
    out.append(b)


def _find_global(obj):
    """Return (module_name, name) for a class/function.  Grail's __qualname__
    can be the capitalised Smalltalk class name (``Attrgetter``), so verify it
    resolves back to obj and otherwise reverse-look-up the module namespace."""
    modname = getattr(obj, "__module__", None)
    if not isinstance(modname, str):
        raise PicklingError("Can't pickle %r: no __module__" % (obj,))
    mod = sys.modules.get(modname)
    if mod is None:
        try:
            __import__(modname)
            mod = sys.modules.get(modname)
        except BaseException:
            mod = None
    if mod is not None:
        nm = getattr(obj, "__qualname__", None)
        if not isinstance(nm, str):
            nm = getattr(obj, "__name__", None)
        if isinstance(nm, str):
            try:
                if getattr(mod, nm) is obj:
                    return modname, nm
            except BaseException:
                pass
        for k in vars(mod):
            try:
                if getattr(mod, k) is obj:
                    return modname, k
            except BaseException:
                pass
    raise PicklingError("Can't pickle %r: not found in module %r" % (obj, modname))


def _emit_global(out, obj):
    modname, nm = _find_global(obj)
    out.append(b"g")
    _emit_blob(out, modname.encode("utf-8"))
    _emit_blob(out, nm.encode("utf-8"))


def _memoizable(obj):
    # Objects that may be SHARED across the graph and must round-trip as one
    # identity (so a mutation through one reference is seen through another --
    # test_list test_iterator_pickle pickles (iterator, list) where the
    # iterator's list IS the list).  Immutable scalars/tuples are not memoized.
    return (type(obj) is _LIST_ITER
            or isinstance(obj, (list, dict, set, frozenset)))


def _encode(obj, out, memo):
    # Memoized reference: emit a back-ref to the already-encoded object so the
    # decoder rebuilds ONE shared object.  Indices are explicit in the stream,
    # so encode/decode order need not implicitly align.
    if _memoizable(obj):
        oid = id(obj)
        ref = memo.get(oid)
        if ref is not None:
            out.append(b"R")
            _emit_len(out, ref)
            return
        memo[oid] = len(memo)
        out.append(b"P")
        _emit_len(out, memo[oid])
    _encode_body(obj, out, memo)


def _encode_body(obj, out, memo):
    if obj is None:
        out.append(b"N")
    elif obj is True:
        out.append(b"T")
    elif obj is False:
        out.append(b"F")
    elif isinstance(obj, bool):
        out.append(b"T" if obj else b"F")
    elif isinstance(obj, int):
        out.append(b"i")
        _emit_len(out, obj)   # reuse len encoder: writes str(n) + newline
    elif isinstance(obj, float):
        out.append(b"d")
        out.append(repr(obj).encode("ascii"))
        out.append(b"\n")
    elif isinstance(obj, str):
        out.append(b"u")
        _emit_blob(out, obj.encode("utf-8"))
    elif isinstance(obj, (bytes, bytearray)):
        out.append(b"b")
        _emit_blob(out, bytes(obj))
    elif type(obj) is _LIST_ITER:
        # A list_iterator (forward OR reversed): (collection, position,
        # reverse, exhausted); the collection is encoded through _encode so it
        # is memoized and shared with any other reference to it.
        coll, pos, rev, exh = obj._getstate()
        out.append(b"I")
        _encode(coll, out, memo)
        _emit_len(out, pos)
        out.append(b"T" if rev else b"F")
        out.append(b"T" if exh else b"F")
    elif type(obj) is _TUPLE_ITER:
        # A tuple_iterator (forward iter() over a tuple): (collection,
        # position).  The collection is an immutable tuple, so there are no
        # reverse/exhausted flags and no memoization is needed.
        coll, pos = obj._getstate()
        out.append(b"J")
        _encode(coll, out, memo)
        _emit_len(out, pos)
    elif isinstance(obj, tuple):
        out.append(b"t")
        _emit_len(out, len(obj))
        for x in obj:
            _encode(x, out, memo)
    elif isinstance(obj, list):
        out.append(b"l")
        _emit_len(out, len(obj))
        for x in obj:
            _encode(x, out, memo)
    elif isinstance(obj, dict):
        out.append(b"c")
        _emit_len(out, len(obj))
        for k, v in obj.items():
            _encode(k, out, memo)
            _encode(v, out, memo)
    elif isinstance(obj, frozenset):
        out.append(b"z")
        _emit_len(out, len(obj))
        for x in obj:
            _encode(x, out, memo)
    elif isinstance(obj, set):
        out.append(b"s")
        _emit_len(out, len(obj))
        for x in obj:
            _encode(x, out, memo)
    elif isinstance(obj, type):
        _emit_global(out, obj)
    else:
        reduce = getattr(obj, "__reduce__", None)
        if reduce is None:
            raise PicklingError("Can't pickle %r" % (obj,))
        rv = reduce()
        if isinstance(rv, str):
            _emit_global(out, obj)
            return
        if not isinstance(rv, tuple) or len(rv) < 2:
            raise PicklingError("Can't pickle %r: bad __reduce__" % (obj,))
        out.append(b"r")
        _encode(rv[0], out, memo)          # callable
        _encode(rv[1], out, memo)          # args tuple
        _encode(rv[2] if len(rv) > 2 else None, out, memo)   # state


def dumps(obj, protocol=None, *, fix_imports=True):
    out = []
    _encode(obj, out, {})
    return b"".join(out)


# --------------------------------------------------------------------------
# Decoding
# --------------------------------------------------------------------------
class _Unpickler:
    def __init__(self, data):
        self.data = data
        self.pos = 0
        self.memo = []

    def _tag(self):
        t = self.data[self.pos:self.pos + 1]
        self.pos += 1
        return t

    def _line(self):
        # Returns the ASCII text up to the next newline (length prefixes and
        # int/float literals) as a str -- Grail's int()/float() reject a
        # bytes argument.
        data = self.data
        start = self.pos
        pos = start
        n = len(data)
        while pos < n and data[pos:pos + 1] != b"\n":
            pos += 1
        s = data[start:pos]
        self.pos = pos + 1
        return s.decode("ascii")

    def _take(self, count):
        b = self.data[self.pos:self.pos + count]
        self.pos += count
        return b

    def load(self):
        t = self._tag()
        if t == b"P":
            # Memoized object: reserve the (explicit) slot, decode, then fill.
            idx = int(self._line())
            obj = self.load()
            while len(self.memo) <= idx:
                self.memo.append(None)
            self.memo[idx] = obj
            return obj
        if t == b"R":
            return self.memo[int(self._line())]
        if t == b"I":
            coll = self.load()
            pos = int(self._line())
            rev = self._tag() == b"T"
            exh = self._tag() == b"T"
            return _LIST_ITER._new_from(coll, pos, rev, exh)
        if t == b"J":
            coll = self.load()
            pos = int(self._line())
            return _TUPLE_ITER._new_from(coll, pos)
        if t == b"N":
            return None
        if t == b"T":
            return True
        if t == b"F":
            return False
        if t == b"i":
            return int(self._line())
        if t == b"d":
            return float(self._line())
        if t == b"u":
            n = int(self._line())
            return self._take(n).decode("utf-8")
        if t == b"b":
            n = int(self._line())
            return self._take(n)
        if t == b"t":
            n = int(self._line())
            return tuple([self.load() for _ in range(n)])
        if t == b"l":
            n = int(self._line())
            return [self.load() for _ in range(n)]
        if t == b"c":
            n = int(self._line())
            d = {}
            for _ in range(n):
                k = self.load()
                d[k] = self.load()
            return d
        if t == b"s":
            n = int(self._line())
            return set([self.load() for _ in range(n)])
        if t == b"z":
            n = int(self._line())
            return frozenset([self.load() for _ in range(n)])
        if t == b"g":
            mn = int(self._line())
            modname = self._take(mn).decode("utf-8")
            nn = int(self._line())
            nm = self._take(nn).decode("utf-8")
            mod = sys.modules.get(modname)
            if mod is None:
                __import__(modname)
                mod = sys.modules.get(modname)
            return getattr(mod, nm)
        if t == b"r":
            callable_ = self.load()
            args = self.load()
            state = self.load()
            obj = callable_(*args)
            if state is not None:
                setstate = getattr(obj, "__setstate__", None)
                if setstate is not None:
                    setstate(state)
                elif isinstance(state, dict):
                    for k, v in state.items():
                        setattr(obj, k, v)
            return obj
        raise UnpicklingError("unsupported pickle tag %r" % (t,))


def loads(data, *, fix_imports=True, encoding="ASCII", errors="strict"):
    return _Unpickler(data).load()


def dump(obj, file, protocol=None, *, fix_imports=True):
    file.write(dumps(obj, protocol, fix_imports=fix_imports))


def load(file, *, fix_imports=True, encoding="ASCII", errors="strict"):
    return loads(file.read())
