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

# The three forward dict iterator types: iter(d) / iter(d.values()) /
# iter(d.items()).  Pickled explicitly like the others; state is (dict,
# position), the dict encoded through _encode so it memoizes and the
# key/value/item snapshot is re-derived on rebuild (dicts are insertion-
# ordered).  reversed(d) returns a plain list/tuple iterator, already handled.
_DICT_KEYITER = type(iter({}))
_DICT_VALUEITER = type(iter({}.values()))
_DICT_ITEMITER = type(iter({}.items()))

# The set_iterator type (shared by iterators over both set and frozenset).
# Set order is undefined, so -- like CPython -- a set iterator pickles as a
# list_iterator over its remaining elements: the encoder emits the same "I"
# tag used for list iterators, so it unpickles as a plain list_iterator.
_SET_ITER = type(iter(set()))

# The seq_iterator type: iter(x) for an object with __getitem__ but no
# __iter__ (CPython's legacy sequence iterator).  Pickled explicitly like the
# others; state is (source, index) -- the source encoded through _encode
# (memoized) and re-iterated from `index' on rebuild, matching CPython's
# __reduce__ == (iter, (seq,), index).  The probe supplies an instance whose
# iter() yields a seq_iterator so we can capture its type.
class _SeqIterProbe:
    def __getitem__(self, i):
        raise IndexError
_SEQ_ITER = type(iter(_SeqIterProbe()))

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
            or type(obj) is bytearray
            or isinstance(obj, (list, dict, set, frozenset)))


def newobj(cls):
    # The default-object reconstructor: build a bare instance of cls WITHOUT
    # running __init__, via Grail's object.__new__ allocator.  Called
    # in-process by the "O" decode below (NOT pickled by reference), so a
    # generic instance round-trips as class-reference + __getstate__.
    return object.__new__(cls)


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
    elif type(obj) is bytes:
        out.append(b"b")
        _emit_blob(out, obj)
    elif type(obj) is bytearray:
        # Distinct tag so a bytearray round-trips MUTABLE -- decoding it as
        # plain bytes broke ``b[:] = data`` on the unpickled object.
        out.append(b"B")
        _emit_blob(out, bytes(obj))
    elif isinstance(obj, (bytes, bytearray)):
        # A bytes/bytearray SUBCLASS: rebuild through the subclass itself and
        # restore its instance attributes, the way CPython's __reduce_ex__
        # does.  Encoding it as a plain blob lost both the type and the attrs.
        try:
            state = dict(obj.__dict__)
        except AttributeError:
            state = None
        out.append(b"r")
        _encode(type(obj), out, memo)
        _encode((bytes(obj),), out, memo)
        _encode(state if state else None, out, memo)
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
    elif type(obj) is _DICT_KEYITER:
        # dict key/value/item iterators: (dict, consumed-count).  Encode the
        # dict through _encode (memoized); the snapshot is re-derived on rebuild.
        d, pos = obj._getstate()
        out.append(b"K")
        _encode(d, out, memo)
        _emit_len(out, pos)
    elif type(obj) is _DICT_VALUEITER:
        d, pos = obj._getstate()
        out.append(b"V")
        _encode(d, out, memo)
        _emit_len(out, pos)
    elif type(obj) is _DICT_ITEMITER:
        d, pos = obj._getstate()
        out.append(b"M")
        _encode(d, out, memo)
        _emit_len(out, pos)
    elif type(obj) is _SET_ITER:
        # A set/frozenset iterator: pickle as a list_iterator (tag "I") over
        # its elements snapshot resuming at `position'.  Set order is
        # undefined, so CPython also unpickles set iterators as list iterators.
        coll, pos = obj._getstate()
        out.append(b"I")
        _encode(coll, out, memo)
        _emit_len(out, pos)
        out.append(b"F")   # not reversed
        out.append(b"F")   # not exhausted
    elif type(obj) is _SEQ_ITER:
        # A seq_iterator (iter() over a __getitem__ object): (source, index).
        # The source is encoded through _encode so it is memoized and shared;
        # rebuild re-iterates it from `index'.
        source, index = obj._getstate()
        out.append(b"Q")
        _encode(source, out, memo)
        _emit_len(out, index)
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
    elif type(obj) is frozenset:
        out.append(b"z")
        _emit_len(out, len(obj))
        for x in obj:
            _encode(x, out, memo)
    elif type(obj) is set:
        out.append(b"s")
        _emit_len(out, len(obj))
        for x in obj:
            _encode(x, out, memo)
    elif isinstance(obj, (set, frozenset)):
        # A set/frozenset SUBCLASS: preserve its type (pickled by reference,
        # like a class) AND its instance state (via __getstate__), so
        # attributes set on the instance survive the round-trip.  Reconstructed
        # as cls(elements) with the state dict re-applied.
        out.append(b"y")
        _emit_global(out, type(obj))
        _emit_len(out, len(obj))
        for x in obj:
            _encode(x, out, memo)
        _encode(obj.__getstate__(), out, memo)
    elif isinstance(obj, type):
        _emit_global(out, obj)
    else:
        # Functions / builtins reachable as a module global pickle by
        # reference (the "g" tag), matching CPython's save_global.  Grail's
        # operator.add and friends are BoundMethods whose __reduce__ is
        # unimplemented, so try the by-reference path (which only succeeds when
        # the object IS a module global) before falling back to __reduce__.
        try:
            _emit_global(out, obj)
            return
        except PicklingError:
            pass
        reduce = getattr(obj, "__reduce__", None)
        if reduce is None:
            raise PicklingError("Can't pickle %r" % (obj,))
        rv = reduce()
        if rv is NotImplemented:
            # No custom __reduce__ (object.__reduce__ signals the default):
            # pickle a plain instance generically as class-reference + state
            # (the "O" tag), rebuilt via object.__new__(cls).  The reconstructor
            # runs in-process at decode time, so -- unlike CPython's
            # copyreg.__newobj__ -- it need not pickle by reference (Grail
            # module functions are BoundMethods with no __module__).
            out.append(b"O")
            _emit_global(out, type(obj))
            state = obj.__getstate__() if hasattr(obj, "__getstate__") else None
            _encode(state, out, memo)
            return
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
        if t == b"K":
            d = self.load()
            pos = int(self._line())
            return _DICT_KEYITER._new_from(d, pos)
        if t == b"V":
            d = self.load()
            pos = int(self._line())
            return _DICT_VALUEITER._new_from(d, pos)
        if t == b"M":
            d = self.load()
            pos = int(self._line())
            return _DICT_ITEMITER._new_from(d, pos)
        if t == b"Q":
            source = self.load()
            index = int(self._line())
            return _SEQ_ITER._new_from(source, index)
        if t == b"O":
            # Generic default-object: object.__new__(cls) + restored state.
            cls = self.load()
            state = self.load()
            obj = newobj(cls)
            if state is not None:
                setstate = getattr(obj, "__setstate__", None)
                if setstate is not None:
                    setstate(state)
                elif isinstance(state, dict):
                    for k, v in state.items():
                        setattr(obj, k, v)
            return obj
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
        if t == b"B":
            n = int(self._line())
            return bytearray(self._take(n))
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
        if t == b"y":
            # A set/frozenset subclass: cls(elements) + restored __dict__.
            cls = self.load()
            n = int(self._line())
            items = [self.load() for _ in range(n)]
            state = self.load()
            obj = cls(items)
            if state:
                for k, v in state.items():
                    setattr(obj, k, v)
            return obj
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
