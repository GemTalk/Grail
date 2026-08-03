# PEP 285 bool conformance -- regressions for the test.test_bool gaps.
#
# Each RESULTS entry is one focused bug.  User classes live here rather than
# in a `self eval:` string because a class with __init__/__bool__ cannot be
# instantiated in eval: scope (its #new is a DNU there).

RESULTS = {}


def _record(key, fn):
    """Store fn()'s value, or ('raised', ExcName, str(exc)) if it raised."""
    try:
        RESULTS[key] = fn()
    except BaseException as e:
        RESULTS[key] = ("raised", type(e).__name__, str(e))


# --- bool IS an int subclass (test_isinstance / test_issubclass) -----------
_record("isinstance_true_int", lambda: isinstance(True, int))
_record("isinstance_false_int", lambda: isinstance(False, int))
_record("isinstance_true_bool", lambda: isinstance(True, bool))
_record("isinstance_one_bool", lambda: isinstance(1, bool))
_record("issubclass_bool_int", lambda: issubclass(bool, int))
_record("issubclass_int_bool", lambda: issubclass(int, bool))

# --- int-subclass value attributes (test_real_and_imag) -------------------
_record("true_real", lambda: True.real)
_record("true_imag", lambda: True.imag)
_record("false_real", lambda: False.real)
_record("true_real_is_int", lambda: type(True.real) is int)
_record("true_imag_is_int", lambda: type(True.imag) is int)
# A BoundMethod here instead of a value would poison arithmetic.
_record("true_real_plus_one", lambda: True.real + 1)
_record("true_numerator", lambda: True.numerator)
_record("true_denominator", lambda: True.denominator)

# --- int API inherited by bool -------------------------------------------
_record("true_bit_length", lambda: True.bit_length())
_record("true_conjugate", lambda: True.conjugate())
_record("true_as_integer_ratio", lambda: True.as_integer_ratio())

# --- from_bytes (test_from_bytes), incl. the 2-arg int form it delegates to
_record("bool_from_bytes_zero", lambda: bool.from_bytes(b'\x00' * 8, 'big'))
_record("bool_from_bytes_nonzero", lambda: bool.from_bytes(b'abcd', 'little'))
_record("int_from_bytes_2arg", lambda: int.from_bytes(b'\x01\x00', 'big'))

# --- bool.__new__ allocation form vs bool() truth testing (test_bool_new) --
_record("new_bool", lambda: bool.__new__(bool))
_record("new_bool_1", lambda: bool.__new__(bool, 1))
_record("new_bool_0", lambda: bool.__new__(bool, 0))
_record("new_bool_false", lambda: bool.__new__(bool, False))
_record("new_bool_true", lambda: bool.__new__(bool, True))
# ...while bool(cls) stays plain truth testing (test_types).
_record("bool_of_bool", lambda: bool(bool))
_record("bool_of_dict", lambda: bool(dict))
_record("bool_of_type", lambda: bool(type))
# The indirect callable form must agree with the literal call site.
_indirect = bool
_record("bool_indirect_of_dict", lambda: _indirect(dict))
_record("bool_indirect_of_zero", lambda: _indirect(0))

# --- bool() argument checking (test_convert / test_keyword_args) ----------
_record("bool_no_args", lambda: bool())
_record("bool_two_args", lambda: bool(42, 42))
_record("bool_three_args", lambda: bool(1, 2, 3))
_record("bool_kwarg", lambda: bool(x=10))

# --- bool is final (test_subclass) ----------------------------------------
def _subclass_bool():
    class C(bool):
        pass
    return C
_record("subclass_bool", _subclass_bool)
_record("int_new_bool", lambda: int.__new__(bool, 0))


# --- __bool__ must return a real bool (test_convert_to_bool) --------------
class _BoolReturnsSelf:
    def __bool__(self):
        return self


class _BoolReturnsStr:
    def __bool__(self):
        return "Yes"


class _BoolReturnsInt(int):
    def __bool__(self):
        return 1


_record("bool_returns_self", lambda: bool(_BoolReturnsSelf()))
_record("bool_returns_str", lambda: bool(_BoolReturnsStr()))
_record("bool_returns_int", lambda: bool(_BoolReturnsInt()))


# --- __bool__ / __len__ = None block the protocol (test_blocked) ----------
class _BlockedBool:
    __bool__ = None


class _BlockedBoolWithLen:
    def __len__(self):
        return 10
    __bool__ = None


class _BlockedLen:
    __len__ = None


_record("blocked_bool", lambda: bool(_BlockedBool()))
_record("blocked_bool_with_len", lambda: bool(_BlockedBoolWithLen()))
_record("blocked_len", lambda: bool(_BlockedLen()))


# --- a negative __len__ is a ValueError (test_convert_to_bool's Eggs) -----
class _NegativeLen:
    def __len__(self):
        return -1


class _ZeroLen:
    def __len__(self):
        return 0


class _PositiveLen:
    def __len__(self):
        return 3


_record("negative_len", lambda: bool(_NegativeLen()))
# The working __len__ fallback must survive the added validation.
_record("zero_len", lambda: bool(_ZeroLen()))
_record("positive_len", lambda: bool(_PositiveLen()))


# --- a well-behaved __bool__ still works ----------------------------------
class _GoodBool:
    def __init__(self, v):
        self.v = v

    def __bool__(self):
        return self.v


_record("good_bool_true", lambda: bool(_GoodBool(True)))
_record("good_bool_false", lambda: bool(_GoodBool(False)))
# `if x:` must agree with bool(x) -- both route through ___truthOf___.
def _if_agrees():
    out = []
    for obj in (_GoodBool(True), _GoodBool(False), _ZeroLen(), _PositiveLen()):
        out.append(bool(obj) if obj else False)
    return out
_record("if_agrees_with_bool", _if_agrees)


# --- ~bool is deprecated (test_math) --------------------------------------
def _invert_warns():
    import warnings
    false = False
    with warnings.catch_warnings():
        warnings.simplefilter("error", DeprecationWarning)
        try:
            ~false
        except DeprecationWarning:
            return "warned"
    return "not-warned"
_record("invert_warns", _invert_warns)
_record("invert_false_value", lambda: ~(_GoodBool(False).v))


# --- marshal round-trips the value types it supports ----------------------
def _marshal_roundtrip():
    import marshal
    return (marshal.loads(marshal.dumps(True)) is True,
            marshal.loads(marshal.dumps(False)) is False)
_record("marshal_bool", _marshal_roundtrip)


def _marshal_values():
    import marshal
    vals = [None, 0, -7, 3.5, "text", b"bytes", (1, 2), [3, 4], {"k": "v"}]
    return [marshal.loads(marshal.dumps(v)) == v for v in vals]
_record("marshal_values", _marshal_values)


def _marshal_rejects():
    import marshal
    return marshal.dumps(_GoodBool(True))
_record("marshal_rejects_object", _marshal_rejects)


# --- str.isspace over the full Unicode whitespace set (test_string) -------
_record("isspace_results", lambda: [
    " ".isspace(),          # SPACE
    "\t\n\r".isspace(),     # ASCII controls
    "\xa0".isspace(),       # NO-BREAK SPACE
    " ".isspace(),     # OGHAM SPACE MARK
    " ".isspace(),     # EM SPACE
    " ".isspace(),     # LINE SEPARATOR
    " ".isspace(),     # NARROW NO-BREAK SPACE
    " ".isspace(),     # MEDIUM MATHEMATICAL SPACE
    "　".isspace(),     # IDEOGRAPHIC SPACE
])
_record("isspace_negatives", lambda: [
    "".isspace(),           # empty is False
    "XYZ".isspace(),
    " x ".isspace(),
    "​".isspace(),     # ZERO WIDTH SPACE is NOT whitespace
])
