# CPython-compatible pickle for Grail.
#
# A pickle is not an encoding of a value: it is a PROGRAM for a small stack
# machine.  Unpickling executes it against a stack, a memo table, and a mark
# stack.  ``dumps(True, 0)`` is b"I01\n." -- INT (push the integer on this
# line), STOP (pop the top of stack as the result).
#
# This module implements that format, so Grail pickles are readable by CPython
# and vice versa.  It replaces an earlier Grail-private tagged-blob format that
# round-tripped in-session but was NOT wire compatible; worse, 22 of its 26 tag
# bytes were also real pickle opcodes with different meanings, so a Grail
# pickle handed to CPython was not cleanly rejected -- it began executing as a
# plausible opcode stream.  Django's redis/db/filebased cache backends and
# jinja2's bccache all write pickles to stores outside the gem, so that was a
# live hazard, not a theoretical one.
#
# Protocols 0-5 are emitted and read.  Deliberate deviation: CPython's protocol
# 4+ framer splits output into <=64KB frames, while this emits a single frame.
# FRAME is only a read-ahead hint, so both are valid and mutually readable;
# byte-identity with CPython therefore holds for pickles under 64KB.

import sys

HIGHEST_PROTOCOL = 5
DEFAULT_PROTOCOL = 5          # CPython 3.14's default

_FRAME_SIZE_MIN = 4           # payloads smaller than this are not framed


class PickleError(Exception):
    pass


class PicklingError(PickleError):
    pass


class UnpicklingError(PickleError):
    pass


# --------------------------------------------------------------------------
# Opcodes
# --------------------------------------------------------------------------
MARK           = b'('
STOP           = b'.'
POP            = b'0'
POP_MARK       = b'1'
DUP            = b'2'
FLOAT          = b'F'
INT            = b'I'
BININT         = b'J'
BININT1        = b'K'
LONG           = b'L'
BININT2        = b'M'
NONE           = b'N'
PERSID         = b'P'
BINPERSID      = b'Q'
REDUCE         = b'R'
STRING         = b'S'
BINSTRING      = b'T'
SHORT_BINSTRING = b'U'
UNICODE        = b'V'
BINUNICODE     = b'X'
APPEND         = b'a'
BUILD          = b'b'
GLOBAL         = b'c'
DICT           = b'd'
EMPTY_DICT     = b'}'
APPENDS        = b'e'
GET            = b'g'
BINGET         = b'h'
INST           = b'i'
LONG_BINGET    = b'j'
LIST           = b'l'
EMPTY_LIST     = b']'
OBJ            = b'o'
PUT            = b'p'
BINPUT         = b'q'
LONG_BINPUT    = b'r'
SETITEM        = b's'
TUPLE          = b't'
EMPTY_TUPLE    = b')'
SETITEMS       = b'u'
BINFLOAT       = b'G'

# protocol 2
PROTO          = b'\x80'
NEWOBJ         = b'\x81'
EXT1           = b'\x82'
EXT2           = b'\x83'
EXT4           = b'\x84'
TUPLE1         = b'\x85'
TUPLE2         = b'\x86'
TUPLE3         = b'\x87'
NEWTRUE        = b'\x88'
NEWFALSE       = b'\x89'
LONG1          = b'\x8a'
LONG4          = b'\x8b'

# protocol 3
BINBYTES       = b'B'
SHORT_BINBYTES = b'C'

# protocol 4
SHORT_BINUNICODE = b'\x8c'
BINUNICODE8      = b'\x8d'
BINBYTES8        = b'\x8e'
EMPTY_SET        = b'\x8f'
ADDITEMS         = b'\x90'
FROZENSET        = b'\x91'
NEWOBJ_EX        = b'\x92'
STACK_GLOBAL     = b'\x93'
MEMOIZE          = b'\x94'
FRAME            = b'\x95'

# protocol 5
BYTEARRAY8       = b'\x96'
NEXT_BUFFER      = b'\x97'
READONLY_BUFFER  = b'\x98'


# --------------------------------------------------------------------------
# Byte packing helpers
#
# int.to_bytes returns a TUPLE under Grail (a separate gap), so every width is
# packed by hand here rather than through it or through struct.
# --------------------------------------------------------------------------
def _pack_uint(n, width):
    """Little-endian unsigned int of the given byte width."""
    return bytes([(n >> (8 * i)) & 0xFF for i in range(width)])


def _unpack_uint(data, pos, width):
    n = 0
    for i in range(width):
        n |= data[pos + i] << (8 * i)
    return n


def _pack_int4(n):
    """Little-endian SIGNED 4-byte int (BININT)."""
    return _pack_uint(n & 0xFFFFFFFF, 4)


def _unpack_int4(data, pos):
    n = _unpack_uint(data, pos, 4)
    if n >= 0x80000000:
        n -= 0x100000000
    return n


def _encode_long(n):
    """LONG1/LONG4 payload: two's-complement little-endian, minimal length."""
    if n == 0:
        return b''
    if n > 0:
        nbytes = (n.bit_length() >> 3) + 1
        result = bytes([(n >> (8 * i)) & 0xFF for i in range(nbytes)])
    else:
        nbytes = ((n + 1).bit_length() >> 3) + 1
        m = (1 << (8 * nbytes)) + n
        result = bytes([(m >> (8 * i)) & 0xFF for i in range(nbytes)])
    # Trim a redundant leading sign byte.
    while len(result) > 1:
        last = result[len(result) - 1]
        prev = result[len(result) - 2]
        if n > 0 and last == 0x00 and prev < 0x80:
            result = result[:len(result) - 1]
        elif n < 0 and last == 0xFF and prev >= 0x80:
            result = result[:len(result) - 1]
        else:
            break
    return result


def _decode_long(data):
    if len(data) == 0:
        return 0
    n = 0
    for i in range(len(data)):
        n |= data[i] << (8 * i)
    if data[len(data) - 1] >= 0x80:
        n -= 1 << (8 * len(data))
    return n


def _pack_double(x):
    """IEEE-754 binary64, BIG-endian (the BINFLOAT byte order)."""
    import struct
    return struct.pack('>d', x)


def _unpack_double(data, pos):
    import struct
    return struct.unpack('>d', data[pos:pos + 8])[0]


def _raw_unicode_escape(s):
    """The protocol-0 UNICODE payload.

    CPython escapes the characters that would break the line-oriented format,
    then encodes raw-unicode-escape: codepoints <= 0xFF become that latin-1
    byte, higher ones become literal ``\\uXXXX`` text.  Grail has no
    raw_unicode_escape codec, so it is spelled out here.
    """
    out = []
    for ch in s:
        cp = ord(ch)
        # Compare CODEPOINTS, not characters.  Character comparison against a
        # control-character literal is not reliable here -- chr(128) reprs as
        # empty and matched ``ch == '\x00'``, so byte 0x80 was escaped as
        # \u0000 and a protocol-0 bytes round trip turned b'\x80' into b'\x00'.
        # Silent single-byte corruption, and only at protocol 0.
        if cp == 0x5C:                      # backslash
            out.append(b'\\u005c')
        elif cp == 0x0A:                    # newline would end the line
            out.append(b'\\u000a')
        elif cp == 0x0D:                    # carriage return
            out.append(b'\\u000d')
        elif cp == 0x00:
            out.append(b'\\u0000')
        elif cp == 0x1A:                    # DOS EOF
            out.append(b'\\u001a')
        elif cp <= 0xFF:
            out.append(bytes([cp]))
        elif cp <= 0xFFFF:
            out.append(('\\u%04x' % cp).encode('ascii'))
        else:
            out.append(('\\U%08x' % cp).encode('ascii'))
    return b''.join(out)


def _raw_unicode_unescape(data):
    """Inverse of _raw_unicode_escape."""
    out = []
    i = 0
    n = len(data)
    while i < n:
        b = data[i]
        if b == 0x5C and i + 1 < n and data[i + 1] == 0x75:        # \u
            out.append(chr(int(data[i + 2:i + 6].decode('ascii'), 16)))
            i += 6
        elif b == 0x5C and i + 1 < n and data[i + 1] == 0x55:      # \U
            out.append(chr(int(data[i + 2:i + 10].decode('ascii'), 16)))
            i += 10
        else:
            out.append(chr(b))
            i += 1
    return ''.join(out)


# --------------------------------------------------------------------------
# Naming objects by reference
# --------------------------------------------------------------------------
# CPython's save_global requires ``getattr(module, name) is obj``.  That test
# cannot hold for a Grail builtin: attribute access on a module MINTS A FRESH
# BoundMethod each time, so ``builtins.iter is builtins.iter`` is already
# False.  The identity check is kept as the fast path (it is right for classes
# and for module-level defs) and falls back to trusting a __module__/__name__
# pair that resolves.  Without that fallback nothing in builtins could be
# pickled by reference -- which is exactly why the previous format grew eight
# bespoke iterator tags instead of using REDUCE.
_BUILTIN_MODULES = ('builtins', '__builtin__')

# Grail's builtin TYPES carry a correct __name__ but NO __module__, and the
# builtins module object exposes only the builtin FUNCTIONS -- getattr(builtins,
# 'iter') resolves while getattr(builtins, 'set') does not.  So neither the
# __module__ shortcut nor a module scan can name `set`/`frozenset`/`bytearray`,
# and pickling any of them by reference failed.  They are the reconstructors
# REDUCE needs for those very types, so this is not an edge case.
#
# Their class objects ARE identity-stable (unlike the freshly-minted
# BoundMethods that builtin functions come back as), so an explicit two-way
# registry is both sufficient and exact.  Consulted by _find_global when
# emitting and by _resolve_global when loading.
def _builtin_type_registry():
    """Two-way map between Grail's builtin types and their Python names.

    Keyed off REPRESENTATIVE INSTANCES rather than the bare names, because the
    two do not always agree: evaluating ``set`` yields the class, but
    evaluating ``range`` yields a BoundMethod wrapping the builtin function --
    so a name-based registry recorded the wrong object for range and then tried
    to pickle ``BoundMethod`` itself.  type(instance) is unambiguous.

    by_name maps name -> something CALLABLE that rebuilds the value (the
    class, or the builtin function, either works for REDUCE); by_id maps
    id(class) -> name, which is what the emitter needs.
    """
    samples = (
        ('int', 0), ('float', 0.0), ('bool', True), ('complex', 0j),
        ('str', ''), ('bytes', b''), ('bytearray', bytearray()),
        ('list', []), ('tuple', ()), ('dict', {}),
        ('set', set()), ('frozenset', frozenset()),
        ('range', range(0)), ('slice', slice(0)),
    )
    by_name = {}
    by_id = {}
    for name, sample in samples:
        cls = type(sample)
        by_name[name] = cls
        by_id[id(cls)] = name
    for name in ('object', 'type'):
        try:
            cls = eval(name)
            by_name[name] = cls
            by_id[id(cls)] = name
        except BaseException:
            pass
    # Deliberately NOT registered: whatever the bare name evaluates to.  For a
    # builtin function that is a freshly minted BoundMethod, which is
    # garbage-collected -- and id() values are REUSED, so such an entry can
    # later match an unrelated object and name it wrongly.  That misnamed
    # `iter` as `str`, turning ``iter([])`` into ``str([])`` and unpickling a
    # spent list iterator as an iterator over the two characters "[]".
    # Only the class objects, whose identity is stable, are safe to key on id.
    return by_name, by_id


_BUILTIN_BY_NAME, _BUILTIN_BY_ID = _builtin_type_registry()

# fix_imports (protocols 0-2) rewrites names for Python 2 compatibility, not
# just module names: ('builtins', 'range') is emitted as ('__builtin__',
# 'xrange').  CPython keeps the full table in _compat_pickle; only the entries
# reachable from Grail's own reductions are needed here.
_COMPAT_NAME_OUT = {('builtins', 'range'): ('__builtin__', 'xrange')}
_COMPAT_NAME_IN = {('__builtin__', 'xrange'): ('builtins', 'range')}


def whichmodule(obj, name):
    modname = getattr(obj, '__module__', None)
    if isinstance(modname, str):
        return modname
    for modname in list(sys.modules):
        mod = sys.modules.get(modname)
        if mod is None or modname == '__main__':
            continue
        try:
            if getattr(mod, name, None) is obj:
                return modname
        except BaseException:
            pass
    return '__main__'


def _find_global(obj):
    """Return (module_name, qualname) for a class / function / builtin."""
    known = _BUILTIN_BY_ID.get(id(obj))
    if known is not None:
        return 'builtins', known
    name = getattr(obj, '__qualname__', None)
    if not isinstance(name, str):
        name = getattr(obj, '__name__', None)
    if not isinstance(name, str):
        raise PicklingError("Can't pickle %r: no __name__" % (obj,))

    modname = getattr(obj, '__module__', None)
    if not isinstance(modname, str):
        modname = whichmodule(obj, name)

    mod = sys.modules.get(modname)
    if mod is None:
        try:
            __import__(modname)
            mod = sys.modules.get(modname)
        except BaseException:
            mod = None
    if mod is None:
        raise PicklingError("Can't pickle %r: module %r not found" % (obj, modname))

    try:
        found = getattr(mod, name)
    except BaseException:
        # Grail stores a lower-case Python class under a capitalised Smalltalk
        # name in some cases; recover the real attribute by identity scan.
        for k in vars(mod):
            try:
                if getattr(mod, k) is obj:
                    return modname, k
            except BaseException:
                pass
        raise PicklingError("Can't pickle %r: not found as %s.%s" % (obj, modname, name))

    if found is obj:
        return modname, name
    # Non-identity-stable callable (a freshly minted BoundMethod): accept the
    # name if it resolves to something of the same kind.  See the note above.
    if type(found) is type(obj):
        return modname, name
    raise PicklingError("Can't pickle %r: %s.%s is a different object"
                        % (obj, modname, name))


# --------------------------------------------------------------------------
# Reconstructors used by REDUCE
# --------------------------------------------------------------------------
def _reconstruct_bytes(s, encoding):
    """codecs.encode(str, 'latin1') -- how protocols 0-2 carry bytes."""
    return s.encode(encoding)


# --------------------------------------------------------------------------
# Iterators
# --------------------------------------------------------------------------
# CPython reduces EVERY builtin iterator to the same shape --
# ``(iter, (collection,), position)``, with the position applied by BUILD --
# so none of them needs a bespoke encoding.  The previous Grail format could
# not use this, because naming the ``iter`` builtin by reference was
# impossible (see _find_global); now that it is, these become ordinary
# save_reduce calls and are wire-compatible with CPython.
#
# The types are captured by probing, exactly as before: Grail exposes no names
# for them.
_LIST_ITER = type(iter([]))
_TUPLE_ITER = type(iter(()))
_DICT_KEYITER = type(iter({}))
_DICT_VALUEITER = type(iter({}.values()))
_DICT_ITEMITER = type(iter({}.items()))
_SET_ITER = type(iter(set()))
_RANGE_ITER = type(iter(range(0)))
_STR_ITER = type(iter(''))
_BYTES_ITER = type(iter(b''))


class _SeqIterProbe:
    def __getitem__(self, i):
        raise IndexError


_SEQ_ITER = type(iter(_SeqIterProbe()))
# iter(callable, sentinel): int() -> 0 is never == 1, so this constructs a
# callable_iterator purely to capture its type (it is never iterated).
_CALLABLE_ITER = type(iter(int, 1))

# type -> ('remaining' | 'positional'), i.e. whether CPython pickles the
# iterator as a snapshot LIST of what is left (dict/set views, whose order is
# not a stable index) or as the original collection plus an index.
# type -> how CPython pickles it.  'positional' = original collection plus an
# index; the snapshot kinds = a LIST of what is still to come, because a dict or
# set view has no stable index to resume from.  The snapshot kind also says
# WHICH view to snapshot: a value iterator must not be rebuilt from the keys.
# 'callable' = iter(callable, sentinel): the callable carries its own state, so
# there is no index -- it reduces to (iter, (callable, sentinel)).
_ITER_TYPES = {}
for _t in (_LIST_ITER, _TUPLE_ITER, _RANGE_ITER, _SEQ_ITER, _STR_ITER, _BYTES_ITER):
    _ITER_TYPES[_t] = 'positional'
_ITER_TYPES[_DICT_KEYITER] = 'keys'
_ITER_TYPES[_DICT_VALUEITER] = 'values'
_ITER_TYPES[_DICT_ITEMITER] = 'items'
_ITER_TYPES[_SET_ITER] = 'elements'
_ITER_TYPES[_CALLABLE_ITER] = 'callable'


def newobj(cls):
    """Allocate a bare instance without running __init__."""
    return object.__new__(cls)


# --------------------------------------------------------------------------
# Pickler
# --------------------------------------------------------------------------
class _Pickler:
    def __init__(self, protocol=None, fix_imports=True):
        if protocol is None:
            protocol = DEFAULT_PROTOCOL
        if protocol < 0:
            protocol = HIGHEST_PROTOCOL
        if protocol > HIGHEST_PROTOCOL:
            raise ValueError("pickle protocol must be <= %d" % HIGHEST_PROTOCOL)
        self.proto = protocol
        self.fix_imports = fix_imports and protocol < 3
        self.out = []           # committed bytes (before framing)
        self.frame = None       # list of bytes being framed, or None
        self.memo = {}          # id(obj) -> (index, obj)

    # -- output -----------------------------------------------------------
    def write(self, data):
        if self.frame is not None:
            self.frame.append(data)
        else:
            self.out.append(data)

    def dump(self, obj):
        if self.proto >= 2:
            self.out.append(PROTO + bytes([self.proto]))
        if self.proto >= 4:
            self.frame = []
        self.save(obj)
        self.write(STOP)
        if self.frame is not None:
            payload = b''.join(self.frame)
            self.frame = None
            if len(payload) >= _FRAME_SIZE_MIN:
                self.out.append(FRAME + _pack_uint(len(payload), 8))
            self.out.append(payload)
        return b''.join(self.out)

    # -- memo -------------------------------------------------------------
    def memoize(self, obj):
        idx = len(self.memo)
        self.memo[id(obj)] = (idx, obj)
        if self.proto >= 4:
            self.write(MEMOIZE)
        elif self.proto >= 1:
            if idx < 256:
                self.write(BINPUT + bytes([idx]))
            else:
                self.write(LONG_BINPUT + _pack_uint(idx, 4))
        else:
            self.write(PUT + str(idx).encode('ascii') + b'\n')

    def _get(self, idx):
        if self.proto >= 1:
            if idx < 256:
                self.write(BINGET + bytes([idx]))
            else:
                self.write(LONG_BINGET + _pack_uint(idx, 4))
        else:
            self.write(GET + str(idx).encode('ascii') + b'\n')

    # -- dispatch ---------------------------------------------------------
    def save(self, obj):
        hit = self.memo.get(id(obj))
        if hit is not None:
            self._get(hit[0])
            return

        # Type dispatch uses isinstance, not ``type(obj) is X``.  Grail backs
        # one Python type with several GemStone classes -- a str may be
        # Unicode7/Unicode16/Unicode32/String depending on content and origin,
        # a dict may be PyDict or KeyValueDictionary -- so an exact-type test
        # silently falls through to save_global and then fails trying to pickle
        # the CLASS.  Ordering matters where Grail's hierarchy differs from
        # CPython's: bool is an int subclass, and Grail's bytearray subclasses
        # ByteArray (= bytes), so the narrower test has to come first.
        if obj is None:
            self.write(NONE)
            return
        if obj is True or obj is False or isinstance(obj, bool):
            self.save_bool(obj)
            return
        if isinstance(obj, int):
            self.save_int(obj)
            return
        if isinstance(obj, float):
            self.save_float(obj)
            return
        if isinstance(obj, str):
            self.save_str(obj)
            return
        if type(obj) is bytearray:
            self.save_bytearray(obj)
            return
        if type(obj) is bytes:
            self.save_bytes(obj)
            return
        if isinstance(obj, (bytes, bytearray)):
            # A bytes/bytearray SUBCLASS: the opcode paths above rebuild a PLAIN
            # bytes/bytearray, dropping the class and any instance attributes
            # (CPython's __reduce_ex__ keeps both).  Same shape as the
            # set/frozenset subclass case.
            self.save_subclass_container(obj, bytes(obj))
            return
        if isinstance(obj, tuple):
            self.save_tuple(obj)
            return
        if isinstance(obj, list):
            self.save_list(obj)
            return
        if isinstance(obj, dict):
            self.save_dict(obj)
            return
        if type(obj) is frozenset:
            self.save_frozenset(obj)
            return
        if type(obj) is set:
            self.save_set(obj)
            return
        if isinstance(obj, (set, frozenset)):
            # A set/frozenset SUBCLASS: the opcode paths above would rebuild a
            # PLAIN set, dropping both the class and any instance attributes.
            # Reconstruct through the subclass and re-apply its state, which is
            # what CPython's __reduce_ex__ does.
            self.save_subclass_container(obj, list(obj))
            return
        if isinstance(obj, range):
            # CPython: (range, (start, stop, step)).  Without this a range fell
            # through to the generic reduce path, which called
            # object.__new__(Interval) -- and Grail's Interval refuses #new, so
            # it surfaced as "cannot create 'Interval' instances".
            self.save_reduce(type(obj), (obj.start, obj.stop, obj.step), obj=obj)
            return
        if isinstance(obj, slice):
            self.save_reduce(type(obj), (obj.start, obj.stop, obj.step), obj=obj)
            return
        if type(obj) in _ITER_TYPES:
            self.save_iterator(obj)
            return
        if isinstance(obj, type):
            self.save_global(obj)
            return

        # Anything else: by reference if it IS a module global, else __reduce__.
        try:
            self.save_global(obj)
            return
        except PicklingError:
            pass
        self.save_reduce_of(obj)

    # -- scalars ----------------------------------------------------------
    def save_bool(self, obj):
        if self.proto >= 2:
            self.write(NEWTRUE if obj else NEWFALSE)
        else:
            # Protocol 0 AND 1 both spell bools as the integers 01 / 00.
            self.write(INT + (b'01\n' if obj else b'00\n'))

    def save_int(self, obj):
        if self.proto >= 2 and (obj >= 0x80000000 or obj < -0x80000000):
            data = _encode_long(obj)
            if len(data) < 256:
                self.write(LONG1 + bytes([len(data)]) + data)
            else:
                self.write(LONG4 + _pack_int4(len(data)) + data)
            return
        if self.proto >= 1:
            if 0 <= obj < 256:
                self.write(BININT1 + bytes([obj]))
                return
            if 0 <= obj < 65536:
                self.write(BININT2 + _pack_uint(obj, 2))
                return
            if -0x80000000 <= obj < 0x80000000:
                self.write(BININT + _pack_int4(obj))
                return
            self.write(LONG + str(obj).encode('ascii') + b'L\n')
            return
        if -0x80000000 <= obj < 0x80000000:
            self.write(INT + str(obj).encode('ascii') + b'\n')
        else:
            self.write(LONG + str(obj).encode('ascii') + b'L\n')

    def save_float(self, obj):
        if self.proto >= 1:
            self.write(BINFLOAT + _pack_double(obj))
        else:
            self.write(FLOAT + repr(obj).encode('ascii') + b'\n')

    def save_str(self, obj):
        if self.proto >= 1:
            encoded = obj.encode('utf-8')
            n = len(encoded)
            if self.proto >= 4 and n < 256:
                self.write(SHORT_BINUNICODE + bytes([n]) + encoded)
            elif n > 0xFFFFFFFF and self.proto >= 4:
                self.write(BINUNICODE8 + _pack_uint(n, 8) + encoded)
            else:
                self.write(BINUNICODE + _pack_uint(n, 4) + encoded)
        else:
            self.write(UNICODE + _raw_unicode_escape(obj) + b'\n')
        self.memoize(obj)

    def save_bytes(self, obj):
        if self.proto >= 3:
            n = len(obj)
            if n < 256:
                self.write(SHORT_BINBYTES + bytes([n]) + obj)
            elif n > 0xFFFFFFFF and self.proto >= 4:
                self.write(BINBYTES8 + _pack_uint(n, 8) + obj)
            else:
                self.write(BINBYTES + _pack_uint(n, 4) + obj)
            self.memoize(obj)
            return
        # Protocols 0-2 have no bytes opcode: go through codecs.encode.
        if len(obj) == 0:
            self.save_reduce(bytes, (), obj=obj)
        else:
            self.save_reduce(_codecs_encode_ref(),
                             (obj.decode('latin1'), 'latin1'), obj=obj)

    def save_bytearray(self, obj):
        if self.proto >= 5:
            n = len(obj)
            self.write(BYTEARRAY8 + _pack_uint(n, 8) + bytes(obj))
            self.memoize(obj)
            return
        if self.proto >= 3:
            self.save_reduce(bytearray, (bytes(obj),), obj=obj)
            return
        self.save_reduce(bytearray, (bytes(obj),), obj=obj)

    # -- containers -------------------------------------------------------
    def save_tuple(self, obj):
        n = len(obj)
        if n == 0:
            if self.proto >= 1:
                self.write(EMPTY_TUPLE)
            else:
                self.write(MARK + TUPLE)
            return
        if self.proto >= 2 and n <= 3:
            for item in obj:
                self.save(item)
            # A self-referential tuple can have memoized itself meanwhile.
            hit = self.memo.get(id(obj))
            if hit is not None:
                for _ in range(n):
                    self.write(POP)
                self._get(hit[0])
                return
            self.write(TUPLE1 if n == 1 else (TUPLE2 if n == 2 else TUPLE3))
            self.memoize(obj)
            return
        self.write(MARK)
        for item in obj:
            self.save(item)
        hit = self.memo.get(id(obj))
        if hit is not None:
            self.write(POP_MARK)
            self._get(hit[0])
            return
        self.write(TUPLE)
        self.memoize(obj)

    def save_list(self, obj):
        if self.proto >= 1:
            self.write(EMPTY_LIST)
        else:
            self.write(MARK + LIST)
        self.memoize(obj)
        self._batch_appends(obj)

    def _batch_appends(self, items):
        if self.proto == 0:
            for item in items:
                self.save(item)
                self.write(APPEND)
            return
        batch = list(items)
        if len(batch) == 0:
            return
        if len(batch) == 1:
            self.save(batch[0])
            self.write(APPEND)
            return
        i = 0
        while i < len(batch):
            chunk = batch[i:i + 1000]
            self.write(MARK)
            for item in chunk:
                self.save(item)
            self.write(APPENDS)
            i += 1000

    def save_dict(self, obj):
        if self.proto >= 1:
            self.write(EMPTY_DICT)
        else:
            self.write(MARK + DICT)
        self.memoize(obj)
        self._batch_setitems(obj)

    def _batch_setitems(self, d):
        items = list(d.items())
        if self.proto == 0:
            for k, v in items:
                self.save(k)
                self.save(v)
                self.write(SETITEM)
            return
        if len(items) == 0:
            return
        if len(items) == 1:
            self.save(items[0][0])
            self.save(items[0][1])
            self.write(SETITEM)
            return
        i = 0
        while i < len(items):
            chunk = items[i:i + 1000]
            self.write(MARK)
            for k, v in chunk:
                self.save(k)
                self.save(v)
            self.write(SETITEMS)
            i += 1000

    def save_set(self, obj):
        if self.proto >= 4:
            self.write(EMPTY_SET)
            self.memoize(obj)
            items = list(obj)
            i = 0
            while i < len(items):
                chunk = items[i:i + 1000]
                self.write(MARK)
                for item in chunk:
                    self.save(item)
                self.write(ADDITEMS)
                i += 1000
            return
        self.save_reduce(set, (list(obj),), obj=obj)

    def save_frozenset(self, obj):
        if self.proto >= 4:
            self.write(MARK)
            for item in obj:
                self.save(item)
            hit = self.memo.get(id(obj))
            if hit is not None:
                self.write(POP_MARK)
                self._get(hit[0])
                return
            self.write(FROZENSET)
            self.memoize(obj)
            return
        self.save_reduce(frozenset, (list(obj),), obj=obj)

    def save_subclass_container(self, obj, contents):
        """cls(contents) + __getstate__, for a builtin-container subclass."""
        state = None
        getstate = getattr(obj, '__getstate__', None)
        if getstate is not None:
            try:
                state = getstate()
            except BaseException:
                state = None
        if not state:
            state = None
        self.save_reduce(type(obj), (contents,), state=state, obj=obj)

    # -- iterators --------------------------------------------------------
    def save_iterator(self, obj):
        """Emit CPython's ``(iter, (collection,), position)`` reduction.

        Grail's iterators expose _getstate() rather than __reduce__, so the
        shape is assembled here; the wire bytes are identical to CPython's.
        """
        getstate = getattr(obj, '_getstate', None)
        if getstate is None:
            # Not every Grail iterator carries _getstate (str_iterator does
            # not).  There is no way to read its position without consuming it,
            # so decline explicitly rather than emit something wrong -- the
            # same outcome as before this rewrite, with a clearer message.
            raise PicklingError("Can't pickle %s: no _getstate"
                                % (type(obj).__name__,))
        state = getstate()
        t = type(obj)
        if t is _LIST_ITER:
            # ONE Grail class backs both iter(list) and reversed(list); the
            # third state slot is the direction flag, and `pos` is the next
            # index to yield -- counting UP when forward and DOWN when
            # reversed, which is exactly what CPython's list_iterator and
            # list_reverseiterator put in their reductions.  Missing the flag
            # made every forward iterator come back reversed.
            collection, pos, rev = state[0], state[1], state[2]
            exhausted = state[3] if len(state) > 3 else False
            if exhausted:
                self.save_reduce(iter, ([],), obj=obj)
            elif rev:
                self.save_reduce(reversed, (collection,), state=pos, obj=obj)
            else:
                self.save_reduce(iter, (collection,), state=pos, obj=obj)
            return
        kind = _ITER_TYPES.get(t)
        if kind in ('keys', 'values', 'items', 'elements'):
            # dict / set views: no stable resume index, so CPython snapshots
            # what is LEFT and rebuilds a plain list iterator.  Snapshot the
            # view the iterator actually walks -- list(d) yields KEYS, so using
            # it for a value or item iterator silently rebuilt the wrong data.
            collection, pos = state[0], state[1]
            if kind == 'values':
                remaining = list(collection.values())[pos:]
            elif kind == 'items':
                remaining = list(collection.items())[pos:]
            else:
                remaining = list(collection)[pos:]
            self.save_reduce(iter, (remaining,), obj=obj)
            return
        if t is _RANGE_ITER:
            start, stop, step, pos = state
            self.save_reduce(iter, (range(start, stop, step),), state=pos, obj=obj)
            return
        if kind == 'callable':
            # iter(callable, sentinel): no resume index -- the callable holds
            # its own state -- so this is a plain two-arg reduction with no
            # BUILD.  Wire-compatible with CPython's (iter, (callable, sentinel)).
            self.save_reduce(iter, (state[0], state[1]), obj=obj)
            return
        # tuple_iterator, seq_iterator: (collection/source, index)
        self.save_reduce(iter, (state[0],), state=state[1], obj=obj)

    # -- globals ----------------------------------------------------------
    def save_global(self, obj):
        modname, name = _find_global(obj)
        if self.fix_imports:
            mapped = _COMPAT_NAME_OUT.get((modname, name))
            if mapped is not None:
                modname, name = mapped
            elif modname == 'builtins':
                modname = '__builtin__'
        if self.proto >= 4:
            self.save(modname)
            self.save(name)
            self.write(STACK_GLOBAL)
        else:
            self.write(GLOBAL + modname.encode('utf-8') + b'\n'
                       + name.encode('utf-8') + b'\n')
        self.memoize(obj)

    # -- reduce -----------------------------------------------------------
    def save_reduce(self, func, args, state=None, listitems=None,
                    dictitems=None, obj=None):
        self.save(func)
        self.save(tuple(args))
        self.write(REDUCE)
        if obj is not None:
            hit = self.memo.get(id(obj))
            if hit is not None:
                self.write(POP)
                self._get(hit[0])
            else:
                self.memoize(obj)
        if listitems is not None:
            self._batch_appends(listitems)
        if dictitems is not None:
            self._batch_setitems(dict(dictitems))
        if state is not None:
            self.save(state)
            self.write(BUILD)

    def save_reduce_of(self, obj):
        reduce = getattr(obj, '__reduce_ex__', None)
        rv = None
        if reduce is not None:
            try:
                rv = reduce(self.proto)
            except BaseException:
                rv = None
        if rv is None or rv is NotImplemented:
            reduce = getattr(obj, '__reduce__', None)
            if reduce is None:
                raise PicklingError("Can't pickle %r" % (obj,))
            rv = reduce()
        if rv is NotImplemented:
            # No custom __reduce__: a plain instance pickles as
            # newobj(cls) + __getstate__, both by reference.
            state = obj.__getstate__() if hasattr(obj, '__getstate__') else None
            self.save_reduce(newobj, (type(obj),), state=state, obj=obj)
            return
        if isinstance(rv, str):
            self.save_global(obj)
            return
        if not isinstance(rv, tuple) or len(rv) < 2:
            raise PicklingError("Can't pickle %r: bad __reduce__" % (obj,))
        func = rv[0]
        args = rv[1]
        state = rv[2] if len(rv) > 2 else None
        listitems = rv[3] if len(rv) > 3 else None
        dictitems = rv[4] if len(rv) > 4 else None
        self.save_reduce(func, args, state=state, listitems=listitems,
                         dictitems=dictitems, obj=obj)


def _codecs_encode_ref():
    """The _codecs.encode CPython names as the protocol 0-2 bytes reconstructor."""
    import _codecs
    return _codecs.encode


# --------------------------------------------------------------------------
# Unpickler
# --------------------------------------------------------------------------
class _Unpickler:
    def __init__(self, data, encoding='ASCII', errors='strict', fix_imports=True):
        self.data = data
        self.pos = 0
        self.stack = []
        self.metastack = []
        self.memo = {}
        self.encoding = encoding
        self.errors = errors
        self.fix_imports = fix_imports
        self.proto = 0

    # -- reading ----------------------------------------------------------
    def read(self, n):
        b = self.data[self.pos:self.pos + n]
        if len(b) != n:
            raise UnpicklingError("pickle data truncated")
        self.pos += n
        return b

    def readline(self):
        data = self.data
        start = self.pos
        pos = start
        n = len(data)
        while pos < n and data[pos] != 0x0A:
            pos += 1
        self.pos = pos + 1
        return data[start:pos]

    # -- mark handling ----------------------------------------------------
    def push_mark(self):
        self.metastack.append(self.stack)
        self.stack = []

    def pop_mark(self):
        items = self.stack
        self.stack = self.metastack.pop()
        return items

    def load(self):
        while True:
            if self.pos >= len(self.data):
                raise UnpicklingError("pickle exhausted before STOP")
            key = self.data[self.pos:self.pos + 1]
            self.pos += 1
            handler = _DISPATCH.get(key)
            if handler is None:
                raise UnpicklingError("unknown opcode %r" % (key,))
            result = handler(self)
            if result is _STOP:
                return self.stack.pop()


class _StopSentinel:
    pass


_STOP = _StopSentinel()


# -- opcode handlers -------------------------------------------------------
def _op_proto(u):
    u.proto = u.read(1)[0]
    if u.proto > HIGHEST_PROTOCOL:
        raise UnpicklingError("unsupported pickle protocol %d" % u.proto)


def _op_frame(u):
    u.read(8)          # length is a read-ahead hint only


def _op_stop(u):
    return _STOP


def _op_none(u):
    u.stack.append(None)


def _op_newtrue(u):
    u.stack.append(True)


def _op_newfalse(u):
    u.stack.append(False)


def _op_int(u):
    line = u.readline()
    if line == b'01':
        u.stack.append(True)
    elif line == b'00':
        u.stack.append(False)
    else:
        u.stack.append(int(line.decode('ascii')))


def _op_binint(u):
    u.stack.append(_unpack_int4(u.data, _advance(u, 4)))


def _op_binint1(u):
    u.stack.append(u.read(1)[0])


def _op_binint2(u):
    u.stack.append(_unpack_uint(u.data, _advance(u, 2), 2))


def _advance(u, n):
    pos = u.pos
    u.pos += n
    if u.pos > len(u.data):
        raise UnpicklingError("pickle data truncated")
    return pos


def _op_long(u):
    line = u.readline()
    if line[len(line) - 1:] == b'L':
        line = line[:len(line) - 1]
    u.stack.append(int(line.decode('ascii')))


def _op_long1(u):
    n = u.read(1)[0]
    u.stack.append(_decode_long(u.read(n)))


def _op_long4(u):
    n = _unpack_int4(u.data, _advance(u, 4))
    u.stack.append(_decode_long(u.read(n)))


def _op_float(u):
    u.stack.append(float(u.readline().decode('ascii')))


def _op_binfloat(u):
    u.stack.append(_unpack_double(u.data, _advance(u, 8)))


def _op_unicode(u):
    u.stack.append(_raw_unicode_unescape(u.readline()))


def _op_binunicode(u):
    n = _unpack_uint(u.data, _advance(u, 4), 4)
    u.stack.append(u.read(n).decode('utf-8'))


def _op_short_binunicode(u):
    n = u.read(1)[0]
    u.stack.append(u.read(n).decode('utf-8'))


def _op_binunicode8(u):
    n = _unpack_uint(u.data, _advance(u, 8), 8)
    u.stack.append(u.read(n).decode('utf-8'))


def _op_string(u):
    line = u.readline()
    if len(line) >= 2 and line[0:1] in (b'"', b"'"):
        line = line[1:len(line) - 1]
    u.stack.append(line.decode(u.encoding, u.errors))


def _op_binstring(u):
    n = _unpack_int4(u.data, _advance(u, 4))
    u.stack.append(u.read(n).decode(u.encoding, u.errors))


def _op_short_binstring(u):
    n = u.read(1)[0]
    u.stack.append(u.read(n).decode(u.encoding, u.errors))


def _op_binbytes(u):
    n = _unpack_uint(u.data, _advance(u, 4), 4)
    u.stack.append(u.read(n))


def _op_short_binbytes(u):
    n = u.read(1)[0]
    u.stack.append(u.read(n))


def _op_binbytes8(u):
    n = _unpack_uint(u.data, _advance(u, 8), 8)
    u.stack.append(u.read(n))


def _op_bytearray8(u):
    n = _unpack_uint(u.data, _advance(u, 8), 8)
    u.stack.append(bytearray(u.read(n)))


def _op_empty_tuple(u):
    u.stack.append(())


def _op_tuple(u):
    # pop_mark() REBINDS u.stack, and Python binds the ``.append`` method
    # before evaluating its argument -- so ``u.stack.append(tuple(u.pop_mark()))``
    # appends to the inner (discarded) stack.  Pop first, then append.
    items = u.pop_mark()
    u.stack.append(tuple(items))


def _op_tuple1(u):
    u.stack[len(u.stack) - 1:] = [(u.stack[len(u.stack) - 1],)]


def _op_tuple2(u):
    a = u.stack.pop()
    b = u.stack.pop()
    u.stack.append((b, a))


def _op_tuple3(u):
    a = u.stack.pop()
    b = u.stack.pop()
    c = u.stack.pop()
    u.stack.append((c, b, a))


def _op_empty_list(u):
    u.stack.append([])


def _op_list(u):
    items = u.pop_mark()          # see _op_tuple on the binding order
    u.stack.append(items)


def _op_append(u):
    value = u.stack.pop()
    u.stack[len(u.stack) - 1].append(value)


def _op_appends(u):
    items = u.pop_mark()
    target = u.stack[len(u.stack) - 1]
    for item in items:
        target.append(item)


def _op_empty_dict(u):
    u.stack.append({})


def _op_dict(u):
    items = u.pop_mark()
    d = {}
    for i in range(0, len(items), 2):
        d[items[i]] = items[i + 1]
    u.stack.append(d)


def _op_setitem(u):
    value = u.stack.pop()
    key = u.stack.pop()
    u.stack[len(u.stack) - 1][key] = value


def _op_setitems(u):
    items = u.pop_mark()
    target = u.stack[len(u.stack) - 1]
    for i in range(0, len(items), 2):
        target[items[i]] = items[i + 1]


def _op_empty_set(u):
    u.stack.append(set())


def _op_additems(u):
    items = u.pop_mark()
    target = u.stack[len(u.stack) - 1]
    for item in items:
        target.add(item)


def _op_frozenset(u):
    items = u.pop_mark()          # see _op_tuple on the binding order
    u.stack.append(frozenset(items))


def _op_mark(u):
    u.push_mark()


def _op_pop(u):
    if len(u.stack) == 0:
        u.pop_mark()
    else:
        u.stack.pop()


def _op_pop_mark(u):
    u.pop_mark()


def _op_dup(u):
    u.stack.append(u.stack[len(u.stack) - 1])


def _op_put(u):
    u.memo[int(u.readline().decode('ascii'))] = u.stack[len(u.stack) - 1]


def _op_binput(u):
    u.memo[u.read(1)[0]] = u.stack[len(u.stack) - 1]


def _op_long_binput(u):
    u.memo[_unpack_uint(u.data, _advance(u, 4), 4)] = u.stack[len(u.stack) - 1]


def _op_memoize(u):
    u.memo[len(u.memo)] = u.stack[len(u.stack) - 1]


def _op_get(u):
    u.stack.append(u.memo[int(u.readline().decode('ascii'))])


def _op_binget(u):
    u.stack.append(u.memo[u.read(1)[0]])


def _op_long_binget(u):
    u.stack.append(u.memo[_unpack_uint(u.data, _advance(u, 4), 4)])


def _resolve_global(u, modname, name):
    if u.fix_imports:
        mapped = _COMPAT_NAME_IN.get((modname, name))
        if mapped is not None:
            modname, name = mapped
        elif modname == '__builtin__':
            modname = 'builtins'
    if modname == 'builtins':
        # See _builtin_type_registry: the builtins module does not expose the
        # TYPE names, so getattr would fail for exactly the reconstructors
        # REDUCE relies on.
        known = _BUILTIN_BY_NAME.get(name)
        if known is not None:
            return known
    mod = sys.modules.get(modname)
    if mod is None:
        __import__(modname)
        mod = sys.modules.get(modname)
    if mod is None:
        raise UnpicklingError("Can't find module %r" % (modname,))
    obj = mod
    for part in name.split('.'):
        obj = getattr(obj, part)
    return obj


def _op_global(u):
    modname = u.readline().decode('utf-8')
    name = u.readline().decode('utf-8')
    u.stack.append(_resolve_global(u, modname, name))


def _op_stack_global(u):
    name = u.stack.pop()
    modname = u.stack.pop()
    u.stack.append(_resolve_global(u, modname, name))


def _op_reduce(u):
    args = u.stack.pop()
    func = u.stack.pop()
    u.stack.append(func(*args))


def _op_newobj(u):
    args = u.stack.pop()
    cls = u.stack.pop()
    u.stack.append(cls.__new__(cls, *args))


def _op_newobj_ex(u):
    kwargs = u.stack.pop()
    args = u.stack.pop()
    cls = u.stack.pop()
    u.stack.append(cls.__new__(cls, *args, **kwargs))


def _op_build(u):
    state = u.stack.pop()
    obj = u.stack[len(u.stack) - 1]
    setstate = getattr(obj, '__setstate__', None)
    if setstate is not None:
        setstate(state)
        return
    if isinstance(state, int) and hasattr(obj, '__next__'):
        # An iterator's BUILD state is its resume INDEX.  CPython's iterators
        # implement __setstate__ to seek there; Grail's do not, so advance from
        # wherever the freshly rebuilt iterator already sits.
        #
        # The layout of _getstate() differs PER TYPE, so this must dispatch on
        # the type rather than guess from slot positions: a list_iterator is
        # (coll, pos, reversed, exhausted) while a range_iterator is
        # (start, stop, step, pos).  Reading slot 2 as a direction flag treated
        # every range(0, 10, 2) iterator as reversed -- step 2 is truthy -- and
        # seeked `stop - pos` places, exhausting it.
        getstate = getattr(obj, '_getstate', None)
        cur = None
        if getstate is not None:
            try:
                cur = getstate()
            except BaseException:
                cur = None
        t = type(obj)
        if cur is None:
            advance = state
        elif t is _RANGE_ITER:
            advance = state - cur[3]
        elif t is _LIST_ITER and len(cur) >= 3 and cur[2]:
            advance = cur[1] - state          # reversed: index counts down
        elif len(cur) >= 2:
            advance = state - cur[1]
        else:
            advance = state
        if advance > 0:
            for _ in range(advance):
                try:
                    next(obj)
                except StopIteration:
                    break
        return
    slotstate = None
    if isinstance(state, tuple) and len(state) == 2:
        state, slotstate = state
    if state:
        for k, v in state.items():
            setattr(obj, k, v)
    if slotstate:
        for k, v in slotstate.items():
            setattr(obj, k, v)


def _op_inst(u):
    modname = u.readline().decode('utf-8')
    name = u.readline().decode('utf-8')
    args = u.pop_mark()
    cls = _resolve_global(u, modname, name)
    u.stack.append(cls(*args))


def _op_obj(u):
    args = u.pop_mark()
    cls = args[0]
    u.stack.append(cls(*args[1:]))


def _op_persid(u):
    raise UnpicklingError("persistent IDs are not supported")


_DISPATCH = {
    PROTO: _op_proto,           FRAME: _op_frame,          STOP: _op_stop,
    NONE: _op_none,             NEWTRUE: _op_newtrue,      NEWFALSE: _op_newfalse,
    INT: _op_int,               BININT: _op_binint,        BININT1: _op_binint1,
    BININT2: _op_binint2,       LONG: _op_long,            LONG1: _op_long1,
    LONG4: _op_long4,           FLOAT: _op_float,          BINFLOAT: _op_binfloat,
    UNICODE: _op_unicode,       BINUNICODE: _op_binunicode,
    SHORT_BINUNICODE: _op_short_binunicode,                BINUNICODE8: _op_binunicode8,
    STRING: _op_string,         BINSTRING: _op_binstring,
    SHORT_BINSTRING: _op_short_binstring,
    BINBYTES: _op_binbytes,     SHORT_BINBYTES: _op_short_binbytes,
    BINBYTES8: _op_binbytes8,   BYTEARRAY8: _op_bytearray8,
    EMPTY_TUPLE: _op_empty_tuple, TUPLE: _op_tuple,        TUPLE1: _op_tuple1,
    TUPLE2: _op_tuple2,         TUPLE3: _op_tuple3,
    EMPTY_LIST: _op_empty_list, LIST: _op_list,            APPEND: _op_append,
    APPENDS: _op_appends,
    EMPTY_DICT: _op_empty_dict, DICT: _op_dict,            SETITEM: _op_setitem,
    SETITEMS: _op_setitems,
    EMPTY_SET: _op_empty_set,   ADDITEMS: _op_additems,    FROZENSET: _op_frozenset,
    MARK: _op_mark,             POP: _op_pop,              POP_MARK: _op_pop_mark,
    DUP: _op_dup,
    PUT: _op_put,               BINPUT: _op_binput,        LONG_BINPUT: _op_long_binput,
    MEMOIZE: _op_memoize,
    GET: _op_get,               BINGET: _op_binget,        LONG_BINGET: _op_long_binget,
    GLOBAL: _op_global,         STACK_GLOBAL: _op_stack_global,
    REDUCE: _op_reduce,         NEWOBJ: _op_newobj,        NEWOBJ_EX: _op_newobj_ex,
    BUILD: _op_build,           INST: _op_inst,            OBJ: _op_obj,
    PERSID: _op_persid,         BINPERSID: _op_persid,
}


# --------------------------------------------------------------------------
# Public API
# --------------------------------------------------------------------------
Pickler = _Pickler
Unpickler = _Unpickler


def dumps(obj, protocol=None, *, fix_imports=True):
    return _Pickler(protocol, fix_imports).dump(obj)


def loads(data, *, fix_imports=True, encoding="ASCII", errors="strict"):
    return _Unpickler(data, encoding, errors, fix_imports).load()


def dump(obj, file, protocol=None, *, fix_imports=True):
    file.write(dumps(obj, protocol, fix_imports=fix_imports))


def load(file, *, fix_imports=True, encoding="ASCII", errors="strict"):
    return loads(file.read(), fix_imports=fix_imports,
                 encoding=encoding, errors=errors)
