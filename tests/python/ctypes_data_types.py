# Regression fixture: Grail's ctypes, the C data types without the FFI.
#
# Grail had no ctypes module, so ``import ctypes'' was an ImportError and
# every package that imports it at module level failed with it: logfire's
# OpenTelemetry stack (FastAPI's test_telemetry), filelock, pip (issue #1413).
# Most of them use only the data types -- c_int, Structure, sizeof,
# from_buffer -- so ctypes/__init__.py implements those in pure Python over a
# bytearray, with CPython's 64-bit (LP64) sizes and alignment.  Loading a
# library is what Grail cannot do: CDLL raises OSError, which is what callers
# already handle for a library that is missing.
#
# Also here, from the same import wall: http.server's ThreadingHTTPServer,
# which logfire's test helpers import; weakref.ProxyType, which protobuf's
# pure-Python messages test against; webbrowser, which logfire's CLI imports
# (vendored from CPython 3.14 unchanged); and struct's 'c' format unpacked a bytearray source as a bytearray,
# not bytes, which ctypes' c_char exposed.
#
# Expected values are what CPython 3.14 answers on a 64-bit build.

import ctypes as c
import ctypes.util
import http.server
import socketserver
import struct
import weakref
import webbrowser

RESULTS = {}


def check(name, fn):
    """RESULTS[name] = fn(), or False when fn raises."""
    try:
        RESULTS[name] = fn()
    except Exception:
        RESULTS[name] = False


def outcome(fn):
    try:
        return fn()
    except Exception as e:
        return '%s: %s' % (type(e).__name__, e)


class _Point(c.Structure):
    _fields_ = [('x', c.c_int), ('y', c.c_double), ('flag', c.c_char)]


class _Outer(c.Structure):
    _fields_ = [('a', c.c_short), ('p', _Point), ('arr', c.c_int * 3)]


class _Sub(_Point):
    _fields_ = [('z', c.c_int)]


class _Union(c.Union):
    _fields_ = [('i', c.c_uint32), ('f', c.c_float), ('b', c.c_ubyte * 4)]


class _Late(c.Structure):
    pass


_Late._fields_ = [('v', c.c_long)]


class _MyInt(c.c_int):
    pass


def _shared():
    x = c.c_double(1.0)
    y = c.c_uint64.from_buffer(x)
    x.value = 2.0
    first = y.value
    y.value = 0
    return first, x.value


def _bytearray_view():
    b = bytearray(8)
    c.c_int.from_buffer(b, 4).value = -1
    return bytes(b)


def _nested():
    o = _Outer()
    o.p.x = 9
    o.arr[1] = 5
    return c.sizeof(_Outer), _Outer.p.offset, _Outer.arr.offset, o.p.x, list(o.arr)


def _union():
    u = _Union()
    u.f = 1.0
    return c.sizeof(_Union), u.i, list(u.b)


def _array_ops():
    a = (c.c_int * 4)(1, 2, 3)
    a[0] = 2 ** 33 + 1
    a[1:3] = [7, 8]
    return list(a), a[-1], a[1:3], len(a), type(a).__name__, (c.c_int * 4) is (c.c_int * 4)


def _string_buffers():
    b = c.create_string_buffer(b'hello', 8)
    s = c.create_string_buffer(4)
    s.value = b'ab'
    return b.value, b.raw, c.sizeof(b), s.raw, c.create_unicode_buffer('h\xe9llo').value


def _pointers():
    x = c.c_int(5)
    p = c.pointer(x)
    p[0] = 6
    return (x.value, p.contents.value, type(p).__name__, bool(c.POINTER(c.c_int)()),
            bool(p), c.POINTER(c.c_int) is c.POINTER(c.c_int), c.sizeof(p))


CASES = {
    'integers_wrap': lambda: [c.c_int(5).value, c.c_int(2 ** 32 + 1).value, c.c_ubyte(-1).value,
                              c.c_byte(200).value, c.c_ulong(-1).value, c.c_short(70000).value],
    'integer_errors': lambda: [outcome(lambda: c.c_int(1.5)), outcome(lambda: c.c_int('x'))],
    'reals': lambda: [c.c_double(1.5).value, c.c_float(0.1).value, outcome(lambda: c.c_double('x'))],
    'bool_and_chars': lambda: [c.c_bool(2).value, c.c_char(b'a').value, c.c_char(65).value,
                               c.c_wchar('z').value, outcome(lambda: c.c_char(b'ab')),
                               outcome(lambda: c.c_char(300))],
    'pointer_values': lambda: [c.c_void_p(5).value, c.c_void_p().value, c.c_char_p(b'abc').value,
                               c.c_char_p().value, c.c_wchar_p('h\xe9').value,
                               outcome(lambda: c.c_char_p('abc'))],
    'py_object': lambda: [c.py_object([1]).value, outcome(lambda: c.py_object().value)],
    'reprs': lambda: [repr(c.c_int(5)), repr(c.c_double(1.5)), repr(c.c_char(b'a')),
                      repr(c.c_void_p()), repr(c.c_int64(3)),
                      repr(_MyInt(3)).startswith('<_MyInt object at 0x')],
    'types_and_aliases': lambda: [[k.__name__ for k in c.c_int.__mro__],
                                  [k._type_ for k in (c.c_char_p, c.c_wchar_p, c.py_object, c.c_wchar)],
                                  c.c_int64 is c.c_long, c.c_size_t is c.c_ulong,
                                  c.c_longlong is c.c_long, c.c_int8 is c.c_byte],
    'sizes': lambda: [c.sizeof(k) for k in (c.c_bool, c.c_short, c.c_int, c.c_long, c.c_float,
                                            c.c_double, c.c_void_p, c.c_wchar)]
                     + [c.sizeof(c.c_int(1)), c.alignment(c.c_double), outcome(lambda: c.sizeof(3))],
    'bytes_of_a_value': lambda: [bytes(c.c_int(1)), bytes(c.c_double(-1.5))],
    'from_buffer_reads_the_bits': lambda: c.c_uint64.from_buffer(c.c_double(-1.5)).value,
    'from_buffer_shares_memory': _shared,
    'from_buffer_bytearray_offset': _bytearray_view,
    'from_buffer_errors': lambda: [outcome(lambda: c.c_int.from_buffer(b'abcd')),
                                   outcome(lambda: c.c_int.from_buffer(bytearray(2))),
                                   outcome(lambda: c.c_int.from_buffer(bytearray(4), 2)),
                                   outcome(lambda: c.c_int.from_buffer(bytearray(8), -1))],
    'from_buffer_copy': lambda: [c.c_int.from_buffer_copy(b'\x02\x00\x00\x00').value,
                                 outcome(lambda: c.c_int.from_buffer_copy(b'\x02'))],
    'structure_layout': lambda: [c.sizeof(_Point), c.alignment(_Point),
                                 [(_Point.x.offset, _Point.x.size), (_Point.y.offset, _Point.y.size),
                                  (_Point.flag.offset, _Point.flag.size)]],
    'structure_values': lambda: [(lambda p: (p.x, p.y, p.flag))(_Point(1, 2.5, b'z')),
                                 (lambda p: (p.x, p.y))(_Point(y=3.0)),
                                 outcome(lambda: _Point(1, 2, b'a', 4)), bytes(_Point(1, 2.0, b'a'))],
    'nested_structure_and_array': _nested,
    'structure_subclass': lambda: [c.sizeof(_Sub), _Sub.z.offset,
                                   (lambda s: (s.x, s.z))(_Sub(1, 2.0, b'a', 4))],
    'union': _union,
    'fields_set_after_the_class': lambda: [c.sizeof(_Late), _Late(4).v],
    'arrays': _array_ops,
    'array_errors': lambda: [outcome(lambda: (c.c_int * 4)()[4]),
                             outcome(lambda: (c.c_int * 4)(1, 2, 3, 4, 5)),
                             outcome(lambda: c.c_int * -1)],
    'string_buffers': _string_buffers,
    'pointers_refer_to_their_target': _pointers,
    'null_pointer': lambda: outcome(lambda: c.POINTER(c.c_int)().contents),
    'byref': lambda: [type(c.byref(c.c_int(1))).__name__, outcome(lambda: c.byref(3))],
    'errno': lambda: [c.set_errno(5), c.get_errno(), c.set_errno(0)],
    'struct_unpacks_c_as_bytes': lambda: [struct.unpack_from('@c', bytearray(b'z')),
                                          struct.unpack('2c', b'ab')],
}

EXPECTED = {
    'array_errors': ['IndexError: invalid index', 'IndexError: invalid index', 'ValueError: Array length must be >= 0, not -1'],
    'arrays': ([1, 7, 8, 0], 0, [7, 8], 4, 'c_int_Array_4', True),
    'bool_and_chars': [True, b'a', b'A', 'z', 'TypeError: one character bytes, bytearray, or an integer in range(256) expected, not bytes of length 2', 'TypeError: integer not in range(256)'],
    'byref': ['CArgObject', 'TypeError: byref() argument 1 must be _ctypes._CData, not int'],
    'bytes_of_a_value': [b'\x01\x00\x00\x00', b'\x00\x00\x00\x00\x00\x00\xf8\xbf'],
    'errno': [0, 5, 5],
    'fields_set_after_the_class': [8, 4],
    'from_buffer_bytearray_offset': b'\x00\x00\x00\x00\xff\xff\xff\xff',
    'from_buffer_copy': [2, 'ValueError: Buffer size too small (1 instead of at least 4 bytes)'],
    'from_buffer_errors': ['TypeError: underlying buffer is not writable', 'ValueError: Buffer size too small (2 instead of at least 4 bytes)', 'ValueError: Buffer size too small (4 instead of at least 6 bytes)', 'ValueError: offset cannot be negative'],
    'from_buffer_reads_the_bits': 13832806255468478464,
    'from_buffer_shares_memory': (4611686018427387904, 0.0),
    'integer_errors': ["TypeError: 'float' object cannot be interpreted as an integer", "TypeError: 'str' object cannot be interpreted as an integer"],
    'integers_wrap': [5, 1, 255, -56, 18446744073709551615, 4464],
    'nested_structure_and_array': (48, 8, 32, 9, [0, 5, 0]),
    'null_pointer': 'ValueError: NULL pointer access',
    'pointer_values': [5, None, b'abc', None, 'hé', 'TypeError: bytes or integer address expected instead of str instance'],
    'pointers_refer_to_their_target': (6, 6, 'LP_c_int', False, True, True, 8),
    'py_object': [[1], 'ValueError: PyObject is NULL'],
    'reals': [1.5, 0.10000000149011612, 'TypeError: must be real number, not str'],
    'reprs': ['c_int(5)', 'c_double(1.5)', "c_char(b'a')", 'c_void_p(None)', 'c_long(3)', True],
    'sizes': [1, 2, 4, 8, 4, 8, 8, 4, 4, 8, 'TypeError: this type has no size'],
    'string_buffers': (b'hello', b'hello\x00\x00\x00', 8, b'ab\x00\x00', 'héllo'),
    'struct_unpacks_c_as_bytes': [(b'z',), (b'a', b'b')],
    'structure_layout': [24, 8, [(0, 4), (8, 8), (16, 1)]],
    'structure_subclass': [32, 24, (1, 4)],
    'structure_values': [(1, 2.5, b'z'), (0, 3.0), 'TypeError: too many initializers', b'\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00@a\x00\x00\x00\x00\x00\x00\x00'],
    'types_and_aliases': [['c_int', '_SimpleCData', '_CData', 'object'], ['z', 'Z', 'O', 'u'], True, True, True, True],
    'union': (4, 1065353216, [0, 0, 128, 63]),
}

for _name in CASES:
    check(_name, lambda: CASES[_name]() == EXPECTED[_name])


def _missing_library():
    try:
        c.CDLL('libgrail_surely_no_such_library.so')
    except OSError:
        return True
    return False


check('missing_library_is_an_oserror', _missing_library)
check('find_library_of_a_missing_library', lambda: (
    ctypes.util.find_library('grail_surely_no_such_library') is None))
check('threading_http_server', lambda: (
    [k.__name__ for k in http.server.ThreadingHTTPServer.__mro__[:4]]
    == ['ThreadingHTTPServer', 'ThreadingMixIn', 'HTTPServer', 'TCPServer']
    and issubclass(http.server.ThreadingHTTPServer, socketserver.ThreadingMixIn)
    and http.server.ThreadingHTTPServer.daemon_threads is True
    and 'ThreadingHTTPServer' in http.server.__all__))



class _Referent:
    pass


def _proxy_types():
    target = _Referent()
    plain = weakref.proxy(target)
    callable_one = weakref.proxy(len)
    return (isinstance(plain, weakref.ProxyType)
            and not isinstance(target, weakref.ProxyType)
            and isinstance(callable_one, weakref.CallableProxyType)
            and isinstance(plain, weakref.ProxyTypes)
            and isinstance(callable_one, weakref.ProxyTypes)
            and type(plain) is weakref.ProxyType)


check('weakref_proxy_types', _proxy_types)
check('webbrowser_imports', lambda: (
    webbrowser.__all__ == ['Error', 'open', 'open_new', 'open_new_tab', 'get', 'register']
    and issubclass(webbrowser.Error, Exception)))

if __name__ == '__main__':
    for _name, _ok in RESULTS.items():
        print('%-4s %s' % ('OK' if _ok is True else 'FAIL', _name))
