# GRAIL array stub: enough surface for test modules that import it at
# module scope (test_collections).  Backed by a plain list; the
# typecode is recorded but not enforced (no C-level packing) except for
# fromfile/byteswap, which do need real per-typecode byte layout to
# read binary files (e.g. tzfile parsing in datetimetester.py's ZoneInfo
# helper, test_fromfile/test_system_transitions).
#
# The class is defined as _array and aliased: a top-level class named
# the same as its module (array.array) collides in Grail's symbol
# resolution -- the module class and the user class are both named
# #array and attribute reads pick the wrong one.  The alias stores the
# class in the module's dynamic-instVar slot, which attribute reads
# consult first.

# Native (this host: 64-bit little-endian) itemsize per typecode, matching
# what CPython's array module reports on the same architecture -- 'i'/'I'
# are always 4 bytes, 'l'/'L'/'q'/'Q' are 8 on 64-bit Unix.  'f'/'d' (float
# typecodes) are intentionally absent: no caller of fromfile/byteswap in
# this codebase uses them, and packing IEEE-754 floats needs more than
# int.from_bytes/to_bytes.
_ITEMSIZES = {
    'b': 1, 'B': 1,
    'h': 2, 'H': 2,
    'i': 4, 'I': 4,
    'l': 8, 'L': 8,
    'q': 8, 'Q': 8,
}
_SIGNED_CODES = 'bhilq'


class _array:
    def __init__(self, typecode, initializer=None):
        self.typecode = typecode
        self._data = []
        if initializer is None:
            return
        # CPython reads a bytes-like initializer as raw MACHINE bytes, not as
        # a sequence of small ints: array('h', b'\x01\x02\x03\x04') is TWO
        # items.  The stub took ``list(initializer)'' and made it four, which
        # only looked right while tobytes() also wrote one byte per item.
        if isinstance(initializer, (bytes, bytearray)):
            self.frombytes(initializer)
        else:
            self._data = list(initializer)

    def frombytes(self, data):
        """Append items read from ``data'' in native (little-endian) byte
        order, as CPython's array.frombytes does.  A typecode _ITEMSIZES does
        not cover keeps the stub's old reading, one item per byte."""
        size = _ITEMSIZES.get(self.typecode)
        data = bytes(data)
        if size is None:
            self._data.extend(data)
            return
        if len(data) % size:
            raise ValueError("bytes length not a multiple of item size")
        signed = self.typecode in _SIGNED_CODES
        for i in range(0, len(data), size):
            self._data.append(int.from_bytes(data[i:i + size], 'little', signed))

    @property
    def itemsize(self):
        """Bytes per element, off the same _ITEMSIZES table fromfile and
        byteswap already use -- so exposing it adds a name, not a second
        opinion.  test_socket reads it at module scope (SIZEOF_INT =
        array.array('i').itemsize) and the whole module failed to import
        without it.  A typecode the table does not cover raises KeyError,
        which is the honest answer: this stub does no packing for those."""
        return _ITEMSIZES[self.typecode]

    def append(self, x):
        self._data.append(x)

    def extend(self, xs):
        for x in xs:
            self._data.append(x)

    def tolist(self):
        return list(self._data)

    def tobytes(self):
        # Native (little-endian) packing per typecode, the layout fromfile
        # and byteswap already assume.  It used to be ``bytes(self._data)'',
        # which is right only for 'B' and raised for a negative 'b' item --
        # and a writable memoryview over an array('b') writes such items.
        # A typecode _ITEMSIZES does not cover keeps the old behaviour.
        size = _ITEMSIZES.get(self.typecode)
        if size is None or self.typecode == 'B':
            return bytes(self._data)
        signed = self.typecode in _SIGNED_CODES
        return b''.join(x.to_bytes(size, 'little', signed) for x in self._data)

    def _grail_set_byte(self, index, value):
        """Store one BYTE of the array's native representation, at byte
        offset ``index''.  memoryview's write hook: a view over this array
        cannot write into tobytes(), which is a copy, so it writes here, and
        the item the byte belongs to is rebuilt around it."""
        size = _ITEMSIZES[self.typecode]
        signed = self.typecode in _SIGNED_CODES
        k, j = divmod(index, size)
        raw = bytearray(self._data[k].to_bytes(size, 'little', signed))
        raw[j] = value
        self._data[k] = int.from_bytes(bytes(raw), 'little', signed)

    def fromfile(self, f, n):
        # array.fromfile(f, n): read n binary items in the machine's
        # NATIVE byte order (little-endian on this host) and append them
        # -- matches real CPython, which callers then fix up themselves
        # with an explicit byteswap() when the file's bytes were written
        # in the other byte order (see ZoneInfo.fromfile in
        # datetimetester.py, which parses big-endian tzfile data this
        # way).
        itemsize = _ITEMSIZES[self.typecode]
        signed = self.typecode in _SIGNED_CODES
        data = f.read(n * itemsize)
        if len(data) < n * itemsize:
            raise EOFError("read() didn't return enough bytes")
        for i in range(n):
            chunk = data[i * itemsize:(i + 1) * itemsize]
            # Positional args -- int.from_bytes has no keyword-argument
            # dispatch entry point in Grail, only fixed-arity positional
            # overloads.
            self._data.append(int.from_bytes(chunk, 'little', signed))

    def byteswap(self):
        # Reverse the byte order of every element in place.
        itemsize = _ITEMSIZES[self.typecode]
        if itemsize == 1:
            return
        signed = self.typecode in _SIGNED_CODES
        for i in range(len(self._data)):
            b = self._data[i].to_bytes(itemsize, 'little', signed)
            self._data[i] = int.from_bytes(bytes(reversed(b)), 'little', signed)

    def __len__(self):
        return len(self._data)

    def __getitem__(self, i):
        return self._data[i]

    def __setitem__(self, i, v):
        self._data[i] = v

    def __iter__(self):
        return iter(self._data)

    def __eq__(self, other):
        if isinstance(other, _array):
            return self._data == other._data and self.typecode == other.typecode
        return NotImplemented

    def __repr__(self):
        # CPython omits the initializer of an EMPTY array: array('i'), not
        # array('i', []) (test_reprlib's test_container).
        if not self._data:
            return "array('" + self.typecode + "')"
        return "array('" + self.typecode + "', " + repr(self._data) + ")"


# The class cannot be DEFINED as ``array`` (see the note at the top), but it
# can be NAMED so: type(x).__name__ is what code dispatches on -- reprlib
# looks up ``repr_`` + the type name, and found no ``repr__array``, so it
# fell back to repr_instance and truncated an array like an arbitrary object.
_array.__name__ = 'array'
_array.__qualname__ = 'array'
array = _array
