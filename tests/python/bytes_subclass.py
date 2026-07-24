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


def _reject_str_arg():
    # a str is NOT bytes-like: bytes methods must still reject it
    try:
        b'a x'.split('x'); return False
    except TypeError:
        return True


def _startswith_bad_arg_msg():
    # a non-bytes/non-tuple arg -> TypeError whose message names bytes AND tuple
    try:
        b'x'.startswith([b'h']); return False
    except TypeError as e:
        m = str(e); return ('bytes' in m) and ('tuple' in m)


def _removeprefix_rejects_tuple():
    # removeprefix/removesuffix take a single bytes-like arg, NOT a tuple
    try:
        b'spam'.removeprefix((b'sp',)); return False
    except TypeError:
        return True


_UNI = "Hiሴ噸"   # 2 ASCII + 2 multi-byte BMP codepoints


def _latin1_raises():
    try:
        bytes(_UNI, "latin-1"); return False
    except UnicodeEncodeError:
        return True


def _decode_strict_raises():
    try:
        bytes("\x80\xff", "latin-1").decode("utf-8"); return False
    except UnicodeDecodeError:
        return True


def _ba_index_neg_raises():
    # bytearray.index(sub, -1): start=-1 -> from the last byte -> 'ghi' absent
    try:
        bytearray(b'abcdefghi').index(b'ghi', -1); return False
    except ValueError:
        return True


def _hex_empty_sep_raises():
    try:
        b'\xb9\x01\xef'.hex(''); return False
    except ValueError:
        return True

def _hex_multichar_sep_raises():
    try:
        b'\xb9\x01\xef'.hex('xx'); return False
    except ValueError:
        return True

def _hex_nonascii_sep_raises():
    try:
        b'\xb9\x01\xef'.hex('\xff'); return False
    except ValueError:
        return True

def _hex_none_sep_raises():
    try:
        b'\xb9\x01\xef'.hex(None, 0); return False
    except TypeError:
        return True


def _del_slice_step1():
    b = bytearray(range(10)); del b[0:5]; return list(b) == [5, 6, 7, 8, 9]

def _del_slice_neg():
    b = bytearray(range(10)); del b[0:-5]; return list(b) == [5, 6, 7, 8, 9]

def _del_slice_all():
    b = bytearray(b'hello'); del b[:]; return list(b) == []

def _del_slice_step2():
    b = bytearray(range(10)); del b[::2]; return list(b) == [1, 3, 5, 7, 9]

def _del_slice_neg_step():
    b = bytearray(range(10)); del b[::-2]; return list(b) == [0, 2, 4, 6, 8]

def _del_slice_big():
    b = bytearray(range(100)); del b[:10]
    return list(b) == list(range(10, 100))

def _del_slice_backward():
    # stop < start selects nothing -> deletes nothing (no overlap/duplication)
    b = bytearray(range(10)); del b[5:2]; return list(b) == list(range(10))

def _set_slice_backward():
    # b[3:0] = xs inserts xs at index 3 (empty backward slice)
    b = bytearray(range(10)); b[3:0] = [42, 42, 42]
    return list(b) == [0, 1, 2, 42, 42, 42, 3, 4, 5, 6, 7, 8, 9]


class _Idx:
    def __init__(self, value): self.value = value
    def __index__(self): return self.value

def _setitem_index_value():
    b = bytearray([1, 2, 3]); b[0] = _Idx(10); return list(b) == [10, 2, 3]

def _setitem_index_position():
    b = bytearray([1, 2, 3]); b[_Idx(1)] = 9; return list(b) == [1, 9, 3]

def _setitem_neg_value_raises():
    b = bytearray([1, 2, 3])
    try: b[0] = _Idx(-1); return False
    except ValueError: return True

def _setitem_object_value_raises():
    b = bytearray([1, 2, 3])
    try: b[0] = object(); return False
    except TypeError: return True

def _setitem_oob_raises():
    b = bytearray([1, 2, 3])
    try: b[3] = 0; return False
    except IndexError: return True

def _mutating_index_oob():
    # index.__index__ clears the buffer -> index 0 is now out of range
    class Boom:
        def __index__(self): b.clear(); return 0
    b = bytearray(b'hello')
    try: b[Boom()] = 65; return False
    except IndexError: return True

def _mutating_value_oob():
    # value.__index__ clears the buffer AFTER the index bounds check
    # (gh-91153); bounds must be re-checked -> IndexError.
    class Boom:
        def __index__(self): b.clear(); return 0
    b = bytearray(b'hello')
    try: b[0] = Boom(); return False
    except IndexError: return True

def _ctor_index_oob_raises(v):
    try: bytes([_Idx(v)]); return False
    except ValueError: return True

def _ctor_reject_elem(x):
    try: bytes([x]); return False
    except TypeError: return True

def _ctor_source_index_raises():
    class BadInt:
        def __index__(self): 1 / 0
    try: bytes(BadInt()); return False
    except ZeroDivisionError: return True


def _extend_range():
    b = bytearray(b''); b.extend(range(65, 68)); return list(b) == [65, 66, 67]

def _extend_generator():
    b = bytearray(b''); b.extend(x for x in [1, 2, 3]); return list(b) == [1, 2, 3]

def _extend_iterator():
    b = bytearray(b''); b.extend(iter([10, 20])); return list(b) == [10, 20]

def _extend_map():
    b = bytearray(b''); b.extend(map(int, b'ab')); return list(b) == [97, 98]

def _extend_self():
    b = bytearray(b'hi'); b.extend(b); return list(b) == [104, 105, 104, 105]

def _extend_index_elem():
    b = bytearray(b''); b.extend([_Idx(97)]); return list(b) == [97]

def _extend_atomic_valueerror():
    b = bytearray(b'')
    try: b.extend([0, 1, 2, 256]); return False
    except ValueError: return len(b) == 0

def _extend_str_rejected():
    b = bytearray(b'abc')
    try: b.extend('def'); return False
    except TypeError as e: return "expected iterable of integers" in str(e)

def _extend_float_rejected():
    b = bytearray(b'abc')
    try: b.extend(1.0); return False
    except TypeError as e: return "can't extend bytearray with float" in str(e)


def _fromhex_reject_int():
    try: bytes.fromhex(1); return False
    except TypeError: return True

def _fromhex_reject_tuple():
    try: bytes.fromhex(()); return False
    except TypeError as e: return "not tuple" in str(e)

def _fromhex_odd():
    try: bytes.fromhex('aaa'); return False
    except ValueError as e: return "even number of hexadecimal digits" in str(e)

def _fromhex_pos(s, pos):
    try: bytes.fromhex(s); return False
    except ValueError as e: return ("at position %d" % pos) in str(e)

def _fromhex_reject_value(s):
    try: bytes.fromhex(s); return False
    except ValueError: return True

def _fromhex_array_arg():
    import array
    return bytes.fromhex(array.array('B', b' 41 42 ')) == b'AB'


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

    # --- bytes methods accept any bytes-like ARGUMENT (bytearray), matching
    # CPython -- while still rejecting a str. ---
    'arg_split_ba': b'a b'.split(bytearray(b' ')) == [b'a', b'b'],
    'arg_replace_ba': b'aaa'.replace(bytearray(b'a'), bytearray(b'X')) == b'XXX',
    'arg_find_ba': b'abcb'.find(bytearray(b'b')) == 1,
    'arg_count_ba': b'abcb'.count(bytearray(b'b')) == 2,
    'arg_startswith_ba': b'abc'.startswith(bytearray(b'a')),
    'arg_endswith_ba': b'abc'.endswith(bytearray(b'c')),
    'arg_concat_ba': (b'a' + bytearray(b'b')) == b'ab',
    'arg_eq_ba': b'ab' == bytearray(b'ab'),
    'arg_ctor_ba': bytes(bytearray(b'xyz')) == b'xyz',
    'arg_reject_str': _reject_str_arg(),

    # --- split/rsplit with sep=None split on runs of ASCII whitespace,
    # honoring maxsplit (the piece after the split limit is kept whole). ---
    'ws_split_1': b'a b c d'.split(None, 1) == [b'a', b'b c d'],
    'ws_split_2': b'a b c d'.split(None, 2) == [b'a', b'b', b'c d'],
    'ws_split_0': b'a b c d'.split(None, 0) == [b'a b c d'],
    'ws_split_lead': b'  a    b   c   '.split(None, 1) == [b'a', b'b   c   '],
    'ws_split_empty': b'   '.split(None, 1) == [],
    'ws_split_none': b' a  b '.split(None) == [b'a', b'b'],
    'ws_rsplit_1': b'a b c d'.rsplit(None, 1) == [b'a b c', b'd'],
    'ws_rsplit_2': b'a b c d'.rsplit(None, 2) == [b'a b', b'c', b'd'],
    'ws_rsplit_pad': b'  a  b  c  '.rsplit(None, 1) == [b'  a  b', b'c'],

    # --- startswith/endswith accept a TUPLE of prefixes/suffixes (True if ANY
    # match); a non-bytes/non-tuple arg raises TypeError naming bytes AND tuple.
    # removeprefix/removesuffix, by contrast, take a single bytes-like (no tuple).
    'tup_startswith_any':
        b'hello'.startswith((b'he', b'ha')) and not b'hello'.startswith((b'lo', b'x')),
    'tup_startswith_bounded':
        b'helloworld'.startswith((b'hellowo', b'rld', b'lowo'), 3),
    'tup_startswith_empty': not b'hello'.startswith(()),
    'tup_endswith_any':
        b'hello'.endswith((b'lo', b'x')) and not b'hello'.endswith((b'ab', b'cd')),
    'tup_bad_arg_msg': _startswith_bad_arg_msg(),
    'removeprefix_ok': b'spam'.removeprefix(b'sp') == b'am',
    'removesuffix_ok': b'spam'.removesuffix(b'am') == b'sp',
    'removeprefix_rejects_tuple': _removeprefix_rejects_tuple(),

    # --- codecs: utf-8 (multi-byte) + utf-16 round-trip, ctor == encode,
    # latin-1 strict/ignore, decode default/ignore/strict. ---
    'codec_utf8_roundtrip': bytes(_UNI, "utf-8").decode("utf-8") == _UNI,
    'codec_utf16_roundtrip': bytes(_UNI, "utf-16").decode("utf-16") == _UNI,
    'codec_utf8_ctor_eq_encode': bytes(_UNI, "utf-8") == bytes(_UNI.encode("utf-8")),
    'codec_utf16_ctor_eq_encode': bytes(_UNI, "utf-16") == bytes(_UNI.encode("utf-16")),
    'codec_latin1_raises': _latin1_raises(),
    'codec_latin1_ignore': bytes(_UNI, "latin-1", "ignore") == bytes(_UNI[:2], "utf-8"),
    'codec_decode_default_multibyte': bytes(b'\xe2\x98\x83').decode() == '☃',
    'codec_decode_ignore': bytes("ab\x80\xff", "latin-1").decode("utf-8", "ignore") == "ab",
    'codec_decode_kwargs': bytes("ab\x80", "latin-1").decode(errors="ignore", encoding="utf-8") == "ab",
    'codec_decode_strict_raises': _decode_strict_raises(),
    'codec_bytearray_utf16': bytearray(_UNI, "utf-16").decode("utf-16") == _UNI,

    # --- the search family accepts None for start/end (== the default
    # bound), matching CPython: find/rfind/index/rindex/count and the
    # bounded startswith/endswith.  Grail previously did `None < 0` and
    # raised a TypeError. ---
    'none_find': b'abcabc'.find(b'b', None, None) == 1,
    'none_rfind': b'abcabc'.rfind(b'b', None, None) == 4,
    'none_index': b'abcabc'.index(b'b', None) == 1,
    'none_rindex': b'abcabc'.rindex(b'b', None, None) == 4,
    'none_count': b'abcabc'.count(b'b', None, None) == 2,
    'none_find_realstart': b'abcabc'.find(b'b', 2, None) == 4,
    'none_find_realend': b'abcabc'.find(b'b', None, 2) == 1,
    'none_startswith': b'abc'.startswith(b'a', None, None),
    'none_endswith': b'abc'.endswith(b'c', None, None),
    'none_startswith_realstart': b'abcabc'.startswith(b'b', 1, None),
    'none_bytearray_find': bytearray(b'abcabc').find(b'b', None, None) == 1,

    # --- an empty subsequence is always contained (CPython); this also makes
    # rfind/index/rindex agree with `in` for an empty needle. ---
    'contains_empty_bytes': b'' in b'abc',
    'contains_empty_in_empty': b'' in b'',
    'contains_empty_bytearray': b'' in bytearray(b'abc'),
    'rfind_empty_matches_contains': (b'abc'.rfind(b'') != -1) == (b'' in b'abc'),
    'index_empty_no_raise': b'abc'.index(b'') == 0,

    # --- a negative start/end counts from the end in bytearray.find (which
    # overrides bytes' find); previously it clamped to 0 and found spuriously. ---
    'ba_find_neg_start': bytearray(b'abcdefghi').find(b'ghi', -1) == -1,
    'ba_find_neg_start_found': bytearray(b'abcabc').find(b'b', -3) == 4,
    'ba_index_neg_raises': _ba_index_neg_raises(),

    # --- hex(sep[, bytes_per_sep]): a one-ASCII-character separator inserted
    # between groups of bytes -- positive counts from the right, negative from
    # the left, 0 or |n| >= len yields no separator; str or bytes sep. ---
    'hex_sep_default': b'\xb9\x01\xef'.hex(':') == 'b9:01:ef',
    'hex_sep_bytes': b'\xb9\x01\xef'.hex(b'$') == 'b9$01$ef',
    'hex_sep_pos2': b'\xb9\x01\xef'.hex(':', 2) == 'b9:01ef',
    'hex_sep_neg2': b'\xb9\x01\xef'.hex('*', -2) == 'b901*ef',
    'hex_sep_zero': b'\xb9\x01\xef'.hex(':', 0) == 'b901ef',
    'hex_sep_ge_len': b'\xb9\x01\xef'.hex(':', 4) == 'b901ef',
    'hex_sep_six_from_right': bytes([3, 6, 9, 12, 15, 18]).hex(' ', 2) == '0306 090c 0f12',
    'hex_sep_six_from_left': bytes([3, 6, 9, 12, 15, 18]).hex('-', 3) == '030609-0c0f12',
    'hex_sep_null': b'\xb9\x01\xef'.hex(b'\x00') == 'b9\x0001\x00ef',
    'hex_sep_del7f': b'\xb9\x01\xef'.hex('\x7f') == 'b9\x7f01\x7fef',
    'hex_kw': b'\xb9\x01\xef'.hex(sep=':', bytes_per_sep=2) == 'b9:01ef',
    'hex_bytearray_sep': bytearray(b'\xb9\x01\xef').hex(':') == 'b9:01:ef',
    'hex_empty_sep_raises': _hex_empty_sep_raises(),
    'hex_multichar_sep_raises': _hex_multichar_sep_raises(),
    'hex_nonascii_sep_raises': _hex_nonascii_sep_raises(),
    'hex_none_sep_raises': _hex_none_sep_raises(),

    # --- del bytearray[i:j[:k]]: contiguous run (step 1) and extended slice,
    # resizing in place. ---
    'del_slice_step1': _del_slice_step1(),
    'del_slice_neg': _del_slice_neg(),
    'del_slice_all': _del_slice_all(),
    'del_slice_step2': _del_slice_step2(),
    'del_slice_neg_step': _del_slice_neg_step(),
    'del_slice_big': _del_slice_big(),
    'del_slice_backward': _del_slice_backward(),
    'set_slice_backward': _set_slice_backward(),

    # --- __index__ coercion: setitem value and index position, the bytes/
    # bytearray constructor's elements, and an __index__ source used as a
    # count -- with CPython's error kinds (ValueError out of range, TypeError
    # for a non-__index__, IndexError for out-of-bounds, and a raising
    # __index__ propagating its own exception). ---
    'setitem_index_value': _setitem_index_value(),
    'setitem_index_position': _setitem_index_position(),
    'setitem_neg_value_raises': _setitem_neg_value_raises(),
    'setitem_object_value_raises': _setitem_object_value_raises(),
    'setitem_oob_raises': _setitem_oob_raises(),
    'mutating_index_oob': _mutating_index_oob(),
    'mutating_value_oob': _mutating_value_oob(),
    'ctor_from_index': list(bytes([_Idx(0), _Idx(1), _Idx(254), _Idx(255)])) == [0, 1, 254, 255],
    'ctor_from_index_bytearray': list(bytearray([_Idx(7)])) == [7],
    'ctor_index_neg_raises': _ctor_index_oob_raises(-1),
    'ctor_index_256_raises': _ctor_index_oob_raises(256),
    'ctor_reject_str_elem': _ctor_reject_elem('0'),
    'ctor_reject_float_elem': _ctor_reject_elem(0.0),
    'ctor_reject_none_elem': _ctor_reject_elem(None),
    'ctor_source_index': bytes(_Idx(5)) == b'\x00\x00\x00\x00\x00',
    'ctor_source_index_raises': _ctor_source_index_raises(),

    # --- bytearray.extend(iterable): any iterable of ints (range, generator,
    # iterator, map, self, __index__ elements), atomic on a bad element, and
    # CPython's by-name rejection of a str / a non-iterable. ---
    'extend_range': _extend_range(),
    'extend_generator': _extend_generator(),
    'extend_iterator': _extend_iterator(),
    'extend_map': _extend_map(),
    'extend_self': _extend_self(),
    'extend_index_elem': _extend_index_elem(),
    'extend_atomic_valueerror': _extend_atomic_valueerror(),
    'extend_str_rejected': _extend_str_rejected(),
    'extend_float_rejected': _extend_float_rejected(),

    # --- fromhex(): pairs of hex digits, ASCII whitespace ignored BETWEEN
    # pairs, str or bytes-like arg, self-typed, with CPython's error kinds and
    # 0-based positions. ---
    'fromhex_basic': bytes.fromhex('1a2B30') == b'\x1a\x2b\x30',
    'fromhex_ws': bytes.fromhex('  1A 2B  30   ') == b'\x1a\x2b\x30',
    'fromhex_ws_kinds': bytes.fromhex(' 1A\n2B\t30\x0b') == b'\x1a\x2b\x30',
    'fromhex_empty': bytes.fromhex('') == b'',
    'fromhex_bytes_arg': bytes.fromhex(b' 1A 2B 30 ') == b'\x1a\x2b\x30',
    'fromhex_array_arg': _fromhex_array_arg(),
    'fromhex_bytearray_type': type(bytearray.fromhex('4142')) is bytearray,
    'fromhex_bytearray_val': bytearray.fromhex('4142') == bytearray(b'AB'),
    'fromhex_reject_int': _fromhex_reject_int(),
    'fromhex_reject_tuple': _fromhex_reject_tuple(),
    'fromhex_odd': _fromhex_odd(),
    'fromhex_pos_first': _fromhex_pos('12 x4 56', 3),
    'fromhex_pos_second': _fromhex_pos('12 3x 56', 4),
    'fromhex_pos_ws_in_pair': _fromhex_pos('a ', 1),
    'fromhex_nonascii_ws': _fromhex_reject_value('\xa0'),
    'fromhex_single_char': _fromhex_reject_value('a'),
}
