"""ctypes for Grail: C data types, without foreign function calls.

CPython's ctypes is two things.  One is C DATA: fixed-size numbers, arrays,
structures and unions, laid out as C lays them out, readable as bytes and
re-readable as another type (``c_uint64.from_buffer(c_double(x))'' is how
OpenTelemetry's SDK reads a float's bits).  The other is the FOREIGN
FUNCTION INTERFACE: loading a shared library (``CDLL'') and calling into it.

Grail has the first.  Each value lives in a bytearray, packed with ``struct''
at CPython's native sizes and alignment, so from_buffer shares memory exactly
as it does in CPython and bytes(), sizeof() and the field offsets of a
Structure come out the same.

It does not have the second.  Loading a library raises OSError -- what
CPython raises for a library it cannot find -- so code written to survive a
missing library (trio naming its threads, pip asking for glibc's version)
takes that path.  ``pythonapi'' has no functions, and the calls that need a
real address (memmove, string_at, cast to a pointer) raise
NotImplementedError.  A pointer here REFERS to the object it points to rather
than holding its address.

Issue #1413.  Not covered: bit fields, _pack_, the byte-order variants
(BigEndianStructure, ...), and ctypes.wintypes.
"""

import operator as _operator
import struct as _struct
import sys as _sys

__version__ = "1.1.0"

RTLD_LOCAL = 4 if _sys.platform == "darwin" else 0
RTLD_GLOBAL = 8 if _sys.platform == "darwin" else 256
DEFAULT_MODE = RTLD_LOCAL

_NO_FFI = "Grail's ctypes has no foreign function interface"
_NULL = object()      # "no initial value" -- py_object() is NULL, py_object(None) is None
_GenericAlias = type(list[int])   # types.GenericAlias, what CPython's generic ctypes types answer


class ArgumentError(Exception):
    pass


# --- the C data base -----------------------------------------------------------

class _CDataMeta(type):
    """``T * n'' makes the array type, as CPython's type does."""

    def __mul__(cls, length):
        return _array_type(cls, length)

    __rmul__ = __mul__


class _CData(metaclass=_CDataMeta):
    """A C value: ``_size'' bytes at offset ``_o_'' of the bytearray ``_b_''.
    Every instance owns its storage unless from_buffer made it a view."""

    _size = 0
    _align = 1

    def _init_storage(self):
        self._b_ = bytearray(self._size)
        self._o_ = 0
        self._objects = None

    @classmethod
    def _view(cls, buffer, offset):
        obj = cls.__new__(cls)
        obj._b_ = buffer
        obj._o_ = offset
        obj._objects = None
        return obj

    @classmethod
    def from_buffer(cls, source, offset=0):
        """An instance sharing source's memory, as CPython's: a write through
        either is seen by the other.  source must be writable."""
        if offset < 0:
            raise ValueError("offset cannot be negative")
        if isinstance(source, _CData):
            base, start = source._b_, source._o_
        elif isinstance(source, bytearray):
            base, start = source, 0
        else:
            view = memoryview(source)
            if view.readonly:
                raise TypeError("underlying buffer is not writable")
            base, start = view.cast("B"), 0
        available = (len(source._b_) - source._o_) if isinstance(source, _CData) else len(base)
        if available < cls._size + offset:
            raise ValueError("Buffer size too small (%d instead of at least %d bytes)"
                             % (available, cls._size + offset))
        obj = cls._view(base, start + offset)
        obj._objects = {"source": source}
        return obj

    @classmethod
    def from_buffer_copy(cls, source, offset=0):
        """An instance holding a COPY of source's bytes; source may be read-only."""
        if offset < 0:
            raise ValueError("offset cannot be negative")
        data = bytes(memoryview(source))
        if len(data) < cls._size + offset:
            raise ValueError("Buffer size too small (%d instead of at least %d bytes)"
                             % (len(data), cls._size + offset))
        obj = cls.__new__(cls)
        obj._init_storage()
        obj._b_[:] = data[offset:offset + cls._size]
        return obj

    @classmethod
    def from_address(cls, address):
        raise NotImplementedError("from_address: " + _NO_FFI)

    @classmethod
    def in_dll(cls, library, name):
        raise NotImplementedError("in_dll: " + _NO_FFI)

    def _bytes(self):
        return bytes(self._b_[self._o_:self._o_ + self._size])

    def __buffer__(self, flags):
        return memoryview(self._bytes())

    def __reduce__(self):
        return (_rebuild, (type(self), self._bytes()))


def _rebuild(cls, data):
    return cls.from_buffer_copy(data)


# --- simple types ----------------------------------------------------------------

# ``_type_'' code -> the struct code it is stored as, at native size.  The
# codes are CPython's own: c_char_p is 'z', c_wchar_p 'Z', py_object 'O',
# c_wchar 'u' (a wchar_t, four bytes here).
_STORAGE = {c: c for c in "bBhHiIlLqQnNfd?cP"}
_STORAGE.update({"z": "P", "Z": "P", "O": "P", "u": "i"})
_INTEGER_CODES = "bBhHiIlLqQnN"
_SIGNED_CODES = "bhilqn"
_OBJECT_CODES = "zZO"      # a Python object kept beside zeroed pointer bytes


class _SimpleCData(_CData):
    """A C scalar, its behaviour chosen by its ``_type_'' code as CPython's
    is, so every simple type subclasses this directly: c_int.__mro__ is
    (c_int, _SimpleCData, _CData, object) in both."""

    _type_ = None

    def __init_subclass__(cls, **kw):
        super().__init_subclass__(**kw)
        code = cls._type_
        if code is not None:
            cls._fmt = "@" + _STORAGE[code]
            cls._size = _struct.calcsize(cls._fmt)
            cls._align = cls._size

    def __init__(self, value=_NULL):
        self._init_storage()
        if value is _NULL:
            return
        if self._type_ == "O":
            self._objects = {"value": value}
        elif value is not None:
            self.value = value

    @property
    def value(self):
        code = self._type_
        if code in _OBJECT_CODES:
            objects = self._objects or {}
            if code == "O" and "value" not in objects:
                raise ValueError("PyObject is NULL")
            return objects.get("value")
        v = _struct.unpack_from(self._fmt, self._b_, self._o_)[0]
        if code == "P":
            return v or None
        if code == "u":
            return chr(v)
        return v

    @value.setter
    def value(self, v):
        code = self._type_
        if code in _OBJECT_CODES:
            if self._objects is None:
                self._objects = {}
            self._objects["value"] = _convert(code, v)
            return
        _struct.pack_into(self._fmt, self._b_, self._o_, _convert(code, v))

    def __bool__(self):
        return bool(self.value)

    def __repr__(self):
        if type(self) not in _SIMPLE_TYPES:
            return "<%s object at %#x>" % (type(self).__name__, id(self))
        try:
            return "%s(%r)" % (type(self).__name__, self.value)
        except ValueError:
            return "%s(<NULL>)" % type(self).__name__


def _convert(code, v):
    """v as what the ``_type_'' code stores, with CPython's errors.  Integers
    WRAP, as CPython's ctypes integers do: c_int(2**32 + 1) is 1."""
    if code in _INTEGER_CODES:
        v = _operator.index(v)
        bits = 8 * _struct.calcsize("@" + code)
        v &= (1 << bits) - 1
        if code in _SIGNED_CODES and v >= 1 << (bits - 1):
            v -= 1 << bits
        return v
    if code in "fd":
        if not isinstance(v, (int, float)):
            try:
                v = v.__float__()
            except AttributeError:
                raise TypeError("must be real number, not %s" % type(v).__name__) from None
        return float(v)
    if code == "?":
        return bool(v)
    if code == "c":
        if isinstance(v, int):
            if not 0 <= v < 256:
                raise TypeError("integer not in range(256)")
            return bytes((v,))
        if isinstance(v, (bytes, bytearray)) and len(v) == 1:
            return bytes(v)
        detail = (" of length %d" % len(v)) if isinstance(v, (bytes, bytearray)) else ""
        raise TypeError("one character bytes, bytearray, or an integer in range(256) "
                        "expected, not %s%s" % (type(v).__name__, detail))
    if code == "u":
        if isinstance(v, str) and len(v) == 1:
            return ord(v)
        raise TypeError("a unicode character expected, not instance of %s" % type(v).__name__)
    if code == "P":
        if v is None:
            return 0
        return v.__index__() & ((1 << (8 * _struct.calcsize("@P"))) - 1)
    if code == "z":
        if v is None or isinstance(v, bytes):
            return v
        if isinstance(v, int):
            raise NotImplementedError("c_char_p from an address: " + _NO_FFI)
        raise TypeError("bytes or integer address expected instead of %s instance"
                        % type(v).__name__)
    if code == "Z":
        if v is None or isinstance(v, str):
            return v
        if isinstance(v, int):
            raise NotImplementedError("c_wchar_p from an address: " + _NO_FFI)
        raise TypeError("unicode string or integer address expected instead of %s instance"
                        % type(v).__name__)
    return v


def _simple(name, code):
    return type(name, (_SimpleCData,), {"_type_": code, "__module__": __name__})


c_byte = _simple("c_byte", "b")
c_ubyte = _simple("c_ubyte", "B")
c_short = _simple("c_short", "h")
c_ushort = _simple("c_ushort", "H")
c_int = _simple("c_int", "i")
c_uint = _simple("c_uint", "I")
c_long = _simple("c_long", "l")
c_ulong = _simple("c_ulong", "L")
# Where long and long long are the same size, CPython makes the second an
# alias of the first, so ``c_longlong is c_long'' on a 64-bit Unix.
if _struct.calcsize("@q") == _struct.calcsize("@l"):
    c_longlong, c_ulonglong = c_long, c_ulong
else:
    c_longlong = _simple("c_longlong", "q")
    c_ulonglong = _simple("c_ulonglong", "Q")
c_float = _simple("c_float", "f")
c_double = _simple("c_double", "d")
c_longdouble = c_double
c_bool = _simple("c_bool", "?")
c_char = _simple("c_char", "c")
c_wchar = _simple("c_wchar", "u")
c_void_p = _simple("c_void_p", "P")
c_char_p = _simple("c_char_p", "z")
c_wchar_p = _simple("c_wchar_p", "Z")
py_object = _simple("py_object", "O")
# Generic in CPython (Lib/ctypes/__init__.py:167); the other simple types are not.
py_object.__class_getitem__ = classmethod(_GenericAlias)

c_voidp = c_void_p
c_int8, c_uint8 = c_byte, c_ubyte
c_int16, c_uint16 = c_short, c_ushort
c_int32, c_uint32 = c_int, c_uint
c_int64, c_uint64 = c_long, c_ulong
c_ssize_t, c_size_t = c_long, c_ulong
c_time_t = c_long

_SIMPLE_TYPES = {c_byte, c_ubyte, c_short, c_ushort, c_int, c_uint, c_long,
                 c_ulong, c_longlong, c_ulonglong, c_float, c_double, c_bool,
                 c_char, c_wchar, c_void_p, c_char_p, c_wchar_p, py_object}


# --- arrays ----------------------------------------------------------------------

_array_types = {}


def _array_type(itemtype, length):
    if not isinstance(length, int) or isinstance(length, bool):
        raise TypeError("can't multiply sequence by non-int of type '%s'" % type(length).__name__)
    if length < 0:
        raise ValueError("Array length must be >= 0, not %d" % length)
    key = (itemtype, length)
    t = _array_types.get(key)
    if t is None:
        t = type("%s_Array_%d" % (itemtype.__name__, length), (Array,),
                 {"_type_": itemtype, "_length_": length})
        _array_types[key] = t
    return t


class Array(_CData):
    _type_ = None
    _length_ = 0
    # Generic over its element type, as CPython's (Modules/_ctypes/_ctypes.c:5308);
    # an array type such as ``c_int * 3'' inherits it.
    __class_getitem__ = classmethod(_GenericAlias)

    def __init_subclass__(cls, **kw):
        super().__init_subclass__(**kw)
        if cls._type_ is not None:
            cls._size = cls._type_._size * cls._length_
            cls._align = cls._type_._align

    def __init__(self, *items):
        self._init_storage()
        if len(items) > self._length_:
            raise IndexError("invalid index")
        for i, v in enumerate(items):
            self[i] = v

    def __len__(self):
        return self._length_

    def _item(self, i):
        return self._type_._view(self._b_, self._o_ + i * self._type_._size)

    def _index(self, i):
        if i < 0:
            i += self._length_
        if not 0 <= i < self._length_:
            raise IndexError("invalid index")
        return i

    def __getitem__(self, key):
        if isinstance(key, slice):
            return [self[i] for i in range(*key.indices(self._length_))]
        item = self._item(self._index(key))
        return item.value if isinstance(item, _SimpleCData) else item

    def __setitem__(self, key, value):
        if isinstance(key, slice):
            idx = range(*key.indices(self._length_))
            if len(value) != len(idx):
                raise ValueError("Can only assign sequence of same size")
            for i, v in zip(idx, value):
                self[i] = v
            return
        item = self._item(self._index(key))
        if isinstance(item, _SimpleCData):
            item.value = value
        else:
            _copy_into(item, value)

    def __iter__(self):
        return (self[i] for i in range(self._length_))

    # A char array reads as bytes up to the first NUL, a wchar one as str.
    @property
    def value(self):
        if self._type_ is c_char:
            data = self._bytes()
            nul = data.find(b"\0")
            return data if nul < 0 else data[:nul]
        if self._type_ is c_wchar:
            text = "".join(self)
            nul = text.find("\0")
            return text if nul < 0 else text[:nul]
        raise AttributeError("'%s' object has no attribute 'value'" % type(self).__name__)

    @value.setter
    def value(self, v):
        if self._type_ is c_char:
            if len(v) > self._length_:
                raise ValueError("byte string too long")
            self._b_[self._o_:self._o_ + len(v)] = v
            if len(v) < self._length_:
                self._b_[self._o_ + len(v)] = 0
            return
        if self._type_ is c_wchar:
            if len(v) > self._length_:
                raise ValueError("string too long")
            for i, ch in enumerate(v):
                self[i] = ch
            if len(v) < self._length_:
                self[len(v)] = "\0"
            return
        raise AttributeError("'%s' object has no attribute 'value'" % type(self).__name__)

    @property
    def raw(self):
        if self._type_ is not c_char:
            raise AttributeError("'%s' object has no attribute 'raw'" % type(self).__name__)
        return self._bytes()

    @raw.setter
    def raw(self, v):
        if self._type_ is not c_char:
            raise AttributeError("'%s' object has no attribute 'raw'" % type(self).__name__)
        if len(v) > self._length_:
            raise ValueError("byte string too long")
        self._b_[self._o_:self._o_ + len(v)] = v


def _copy_into(target, value):
    if type(value) is not type(target):
        raise TypeError("incompatible types, %s instance instead of %s instance"
                        % (type(value).__name__, type(target).__name__))
    target._b_[target._o_:target._o_ + target._size] = value._bytes()


def create_string_buffer(init, size=None):
    """A c_char array: of ``init'' bytes plus a NUL, or of ``init'' zeros."""
    if isinstance(init, (bytes, bytearray)):
        if size is None:
            size = len(init) + 1
        buf = (c_char * size)()
        buf.value = bytes(init)
        return buf
    if isinstance(init, int):
        return (c_char * init)()
    raise TypeError(init)


c_buffer = create_string_buffer


def create_unicode_buffer(init, size=None):
    if isinstance(init, str):
        if size is None:
            size = len(init) + 1
        buf = (c_wchar * size)()
        buf.value = init
        return buf
    if isinstance(init, int):
        return (c_wchar * init)()
    raise TypeError(init)


# --- pointers --------------------------------------------------------------------

class _Pointer(_CData):
    """A pointer that REFERS to the object it points to (Grail has no address
    to hold): ``contents'' and ``[0]'' read it, and a NULL one is falsy."""

    _type_ = None
    _size = _struct.calcsize("@P")
    _align = _size

    def __init__(self, target=None):
        self._init_storage()
        self._objects = {"contents": None}
        if target is not None:
            self.contents = target

    @property
    def contents(self):
        target = self._objects.get("contents") if self._objects else None
        if target is None:
            raise ValueError("NULL pointer access")
        return target

    @contents.setter
    def contents(self, target):
        if self._objects is None:
            self._objects = {}
        self._objects["contents"] = target

    def __bool__(self):
        return bool(self._objects and self._objects.get("contents") is not None)

    def __getitem__(self, i):
        if i != 0:
            raise NotImplementedError("pointer arithmetic: " + _NO_FFI)
        target = self.contents
        return target.value if isinstance(target, _SimpleCData) else target

    def __setitem__(self, i, value):
        if i != 0:
            raise NotImplementedError("pointer arithmetic: " + _NO_FFI)
        target = self.contents
        if isinstance(target, _SimpleCData):
            target.value = value
        else:
            _copy_into(target, value)


_pointer_types = {}


def POINTER(cls):
    """The pointer type to cls, made once per type, as CPython caches it."""
    t = _pointer_types.get(cls)
    if t is None:
        name = "LP_%s" % (cls.__name__ if isinstance(cls, type) else cls)
        t = type(name, (_Pointer,), {"_type_": cls if isinstance(cls, type) else None})
        _pointer_types[cls] = t
    return t


def pointer(obj):
    return POINTER(type(obj))(obj)


class CArgObject:
    def __init__(self, obj, offset):
        self._obj = obj
        self._offset = offset

    def __repr__(self):
        return "<cparam 'P' (%r)>" % (self._obj,)


def byref(obj, offset=0):
    if not isinstance(obj, _CData):
        raise TypeError("byref() argument 1 must be _ctypes._CData, not %s"
                        % type(obj).__name__)
    return CArgObject(obj, offset)


# --- structures and unions -----------------------------------------------------------

class _Field:
    """A Structure field: its type, offset and size, as CPython's CField
    reports them."""

    def __init__(self, name, ctype, offset):
        self.name = name
        self.type = ctype
        self.offset = offset
        self.size = ctype._size

    def __get__(self, obj, owner=None):
        if obj is None:
            return self
        item = self.type._view(obj._b_, obj._o_ + self.offset)
        if isinstance(item, _SimpleCData):
            if item._type_ in _OBJECT_CODES:
                return (obj._objects or {}).get(self.name)
            return item.value
        if isinstance(item, _Pointer):
            ptr = self.type()
            target = (obj._objects or {}).get(self.name)
            if target is not None:
                ptr.contents = target
            return ptr
        return item

    def __set__(self, obj, value):
        item = self.type._view(obj._b_, obj._o_ + self.offset)
        if isinstance(item, _SimpleCData) and item._type_ in _OBJECT_CODES:
            if obj._objects is None:
                obj._objects = {}
            obj._objects[self.name] = _convert(item._type_, value)
        elif isinstance(item, _SimpleCData):
            item.value = value
        elif isinstance(item, _Pointer):
            if obj._objects is None:
                obj._objects = {}
            obj._objects[self.name] = value.contents if isinstance(value, _Pointer) and value else value
        else:
            _copy_into(item, value)

    def __repr__(self):
        return "<Field type=%s, ofs=%d, size=%d>" % (self.type.__name__, self.offset, self.size)


class _StructMeta(_CDataMeta):
    def __setattr__(cls, name, value):
        super().__setattr__(name, value)
        if name == "_fields_":
            cls._layout(value)


class _StructUnionBase(_CData, metaclass=_StructMeta):
    _is_union = False

    def __init_subclass__(cls, **kw):
        super().__init_subclass__(**kw)
        if "_fields_" in cls.__dict__:
            cls._layout(cls.__dict__["_fields_"])

    @classmethod
    def _layout(cls, fields):
        if "_pack_" in cls.__dict__:
            raise NotImplementedError("_pack_ is not supported by Grail's ctypes")
        base = cls.__mro__[1]
        offset = base._size if issubclass(base, _StructUnionBase) and not cls._is_union else 0
        align = base._align if issubclass(base, _StructUnionBase) else 1
        size = offset
        names = []
        for spec in fields:
            if len(spec) != 2:
                raise NotImplementedError("bit fields are not supported by Grail's ctypes")
            name, ctype = spec
            if not (isinstance(ctype, type) and issubclass(ctype, _CData)):
                raise TypeError("second item in _fields_ tuple (index %d) must be a C type"
                                % len(names))
            a = ctype._align
            if cls._is_union:
                field_offset = 0
                size = max(size, ctype._size)
            else:
                offset = (offset + a - 1) // a * a
                field_offset = offset
                offset += ctype._size
                size = offset
            align = max(align, a)
            type.__setattr__(cls, name, _Field(name, ctype, field_offset))
            names.append(name)
        cls._size = (size + align - 1) // align * align
        cls._align = align
        cls._field_names = (getattr(base, "_field_names", ()) if not cls._is_union else ()) + tuple(names)

    def __init__(self, *args, **kwargs):
        self._init_storage()
        names = getattr(self, "_field_names", ())
        if len(args) > len(names):
            raise TypeError("too many initializers")
        for name, value in zip(names, args):
            setattr(self, name, value)
        for name, value in kwargs.items():
            if name in names[:len(args)]:
                raise TypeError("duplicate values for field %r" % name)
            setattr(self, name, value)


class Structure(_StructUnionBase):
    pass


class Union(_StructUnionBase):
    _is_union = True


# --- size, alignment, memory ------------------------------------------------------------

def sizeof(obj_or_type):
    t = obj_or_type if isinstance(obj_or_type, type) else type(obj_or_type)
    if not issubclass(t, _CData):
        raise TypeError("this type has no size")
    return t._size


def alignment(obj_or_type):
    t = obj_or_type if isinstance(obj_or_type, type) else type(obj_or_type)
    if not issubclass(t, _CData):
        raise TypeError("no alignment info")
    return t._align


def addressof(obj):
    raise NotImplementedError("addressof: " + _NO_FFI)


def memmove(dst, src, count):
    raise NotImplementedError("memmove: " + _NO_FFI)


def memset(dst, c, count):
    raise NotImplementedError("memset: " + _NO_FFI)


def string_at(ptr, size=-1):
    raise NotImplementedError("string_at: " + _NO_FFI)


def wstring_at(ptr, size=-1):
    raise NotImplementedError("wstring_at: " + _NO_FFI)


def cast(obj, typ):
    raise NotImplementedError("cast: " + _NO_FFI)


def resize(obj, size):
    raise NotImplementedError("resize: " + _NO_FFI)


_errno = 0


def get_errno():
    return _errno


def set_errno(value):
    global _errno
    old, _errno = _errno, value
    return old


# --- libraries and function types: unavailable ------------------------------------------

class CDLL:
    """A shared library -- which Grail cannot load.  Raises OSError, as
    CPython does for a library it cannot open, so code that tolerates a
    missing library goes on without it."""

    _func_flags_ = 0
    _func_restype_ = c_int

    def __init__(self, name, mode=DEFAULT_MODE, handle=None, use_errno=False,
                 use_last_error=False, winmode=None):
        raise OSError("%s: cannot load library: %s" % (name, _NO_FFI))


class PyDLL(CDLL):
    pass


class LibraryLoader:
    __class_getitem__ = classmethod(_GenericAlias)   # Lib/ctypes/__init__.py:556

    def __init__(self, dlltype):
        self._dlltype = dlltype

    def __getattr__(self, name):
        if name.startswith("_"):
            raise AttributeError(name)
        return self._dlltype(name)

    def __getitem__(self, name):
        return self._dlltype(name)

    def LoadLibrary(self, name):
        return self._dlltype(name)


cdll = LibraryLoader(CDLL)
pydll = LibraryLoader(PyDLL)


class _NoPythonAPI:
    """``ctypes.pythonapi'': CPython's own C API, as a library.  Grail has no
    such library, so every function in it is missing -- AttributeError, as
    for a symbol a library lacks, which code probing for one expects."""

    def __getattr__(self, name):
        raise AttributeError("pythonapi has no function %r: %s" % (name, _NO_FFI))

    def __repr__(self):
        return "<PyDLL 'python api' (unavailable in Grail)>"


pythonapi = _NoPythonAPI()


def _function_type(restype, *argtypes, **kw):
    class _FuncPtr(_CData):
        _restype_ = restype
        _argtypes_ = argtypes
        _size = _struct.calcsize("@P")
        _align = _size

        def __init__(self, *args):
            raise NotImplementedError("C function pointers: " + _NO_FFI)

    return _FuncPtr


CFUNCTYPE = _function_type
PYFUNCTYPE = _function_type


def SetPointerType(pointer, cls):
    pointer._type_ = cls
