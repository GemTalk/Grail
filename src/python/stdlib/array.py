# GRAIL array stub: enough surface for test modules that import it at
# module scope (test_collections).  Backed by a plain list; the
# typecode is recorded but not enforced (no C-level packing).
#
# The class is defined as _array and aliased: a top-level class named
# the same as its module (array.array) collides in Grail's symbol
# resolution -- the module class and the user class are both named
# #array and attribute reads pick the wrong one.  The alias stores the
# class in the module's dynamic-instVar slot, which attribute reads
# consult first.


class _array:
    def __init__(self, typecode, initializer=None):
        self.typecode = typecode
        self._data = list(initializer) if initializer is not None else []

    def append(self, x):
        self._data.append(x)

    def extend(self, xs):
        for x in xs:
            self._data.append(x)

    def tolist(self):
        return list(self._data)

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
        return "array('" + self.typecode + "', " + repr(self._data) + ")"


array = _array
