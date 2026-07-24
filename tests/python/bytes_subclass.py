# Fixture for BytesSubclassTestCase: `class X(bytes)` / `class X(bytearray)`.
#
# Exercises Grail's byte-format-subclass mechanism (the analog of str
# subclassing): ClassDefAst firstBaseIsBytesLike routes construction through
# the self-typed `bytes>>__new__:`, Class>>___subclass___ retries with no
# named instVars for a byte-format base (so __slots__ fall to dynamic
# instVars), and bytes/bytearray `__class__` returns the receiver's actual
# class so `type(instance)` is the subclass.

class MyBytes(bytes):
    pass

class MyBA(bytearray):
    pass

class BASlots(bytearray):
    __slots__ = ('x', 'y', '__dict__')


def _bytes_attr():
    o = MyBytes(b'x'); o.foo = 7; return o.foo == 7

def _ba_attr():
    o = MyBA(b'x'); o.bar = 9; return o.bar == 9

def _ba_mutate():
    o = MyBA(b'abc'); o[0] = 65; return list(o) == [65, 98, 99]

def _slots():
    o = BASlots(b'zz'); o.x = 1; o.y = 2
    return list(o) == [122, 122] and o.x == 1 and o.y == 2


RESULTS = {
    # --- class X(bytes): self-typed, populated construction ---
    'bytes_type_is_subclass': type(MyBytes(b'abc')) is MyBytes,
    'bytes_isinstance_self': isinstance(MyBytes(b'abc'), MyBytes),
    'bytes_isinstance_bytes': isinstance(MyBytes(b'abc'), bytes),
    'bytes_content': list(MyBytes(b'abc')) == [97, 98, 99],
    'bytes_index': MyBytes(b'abc')[0] == 97,
    'bytes_empty': len(MyBytes()) == 0,
    'bytes_eq_plain': MyBytes(b'abc') == b'abc',
    'bytes_attr': _bytes_attr(),
    'bytes_method': MyBytes(b'abc').upper() == b'ABC',

    # --- class X(bytearray): self-typed, populated, mutable ---
    'ba_type_is_subclass': type(MyBA(b'xy')) is MyBA,
    'ba_isinstance_self': isinstance(MyBA(b'xy'), MyBA),
    'ba_isinstance_bytearray': isinstance(MyBA(b'xy'), bytearray),
    'ba_content': list(MyBA(b'xy')) == [120, 121],
    'ba_empty': len(MyBA()) == 0,
    'ba_eq_plain': MyBA(b'xy') == b'xy',
    'ba_attr': _ba_attr(),
    'ba_mutate': _ba_mutate(),

    # --- __slots__ on a byte-format subclass (slots -> dynamic instVars) ---
    'slots': _slots(),

    # --- base cases must stay correct after the __class__ change ---
    'base_bytes_type': type(b'abc') is bytes,
    'base_bytearray_type': type(bytearray(b'x')) is bytearray,

    # --- bytes and bytearray are DISTINCT types (CPython): neither is a
    # subclass of the other, though Grail stores bytearray as a ByteArray
    # (=bytes) subclass for storage/method reuse. ---
    'ba_not_isinstance_bytes':
        (not isinstance(bytearray(b'x'), bytes)) and (not isinstance(MyBA(b'x'), bytes)),
    'bytes_not_isinstance_bytearray':
        (not isinstance(b'x', bytearray)) and (not isinstance(MyBytes(b'x'), bytearray)),
    'ba_not_subclass_bytes':
        (not issubclass(bytearray, bytes)) and (not issubclass(MyBA, bytes)),
    'bytes_not_subclass_bytearray': not issubclass(bytes, bytearray),
    # ...but the positive checks must still hold
    'bytes_is_bytes':
        isinstance(b'x', bytes) and isinstance(MyBytes(b'x'), bytes)
        and issubclass(bytes, bytes) and issubclass(MyBytes, bytes),
    'ba_is_bytearray':
        isinstance(bytearray(b'x'), bytearray) and isinstance(MyBA(b'x'), bytearray)
        and issubclass(bytearray, bytearray) and issubclass(MyBA, bytearray),
}
