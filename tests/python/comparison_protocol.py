# Fixture for ComparisonProtocolTestCase: Python rich-comparison
# semantics for unsupported operand pairs.  Mixed-type orderings must
# raise a CATCHABLE TypeError (previously env-0 comparison primitives
# raised Smalltalk-level ArgumentTypeError / 'Expected a Number' /
# _generality errors that escaped Python try/except -- the STERROR
# class blocking CPython's test_bisect / test_operator / test_heapq /
# test_re), and a user class's REFLECTED dunder must get a chance
# first.

def _t(f):
    try:
        f()
        return "no-error"
    except TypeError:
        return "type-error"


def _ovf(f):
    try:
        f()
        return "no-error"
    except OverflowError:
        return "overflow"
    except BaseException as e:
        return "other:" + type(e).__name__


def _msg(f):
    "The str() of the TypeError a call raises -- an env-0 ``signal:'' raise"
    " reaches Python with an EMPTY message, which no assertRaisesRegex can"
    " match, so the text itself is the assertion."
    try:
        f()
        return "no-error"
    except TypeError as e:
        return str(e)


def _zde(f):
    try:
        f()
        return "no-error"
    except ZeroDivisionError:
        return "zde"
    except BaseException as e:
        return "other:" + type(e).__name__


class AliasCmp:
    "Reflected comparison dunders assigned as class-body ALIASES (`__gt__ ="
    " __lt__`), not compiled `def`s -- materialized as class attributes, not"
    " compiled selectors (test_bisect's CmpErr)."
    def __lt__(self, other):
        raise ZeroDivisionError
    __gt__ = __lt__
    __le__ = __lt__
    __ge__ = __lt__


class Meters:
    def __init__(self, v):
        self.v = v

    def __gt__(self, other):
        # reflected target for `1 < Meters(5)`
        return self.v > other


class Plain:
    pass


class Radd:
    def __radd__(self, other):
        return "RADD:" + str(other)



# --- reflected EQUALITY (==/!=) fixtures -----------------------------------
#
# CPython's == / != punt to the RIGHT operand's __eq__/__ne__ whenever the left
# one has none of its own (or returns NotImplemented).  Grail's builtins used
# to answer a flat False instead, which silently skipped that hand-off.


class AlwaysEq:
    "Its __eq__ says True to anything (CPython test.support.ALWAYS_EQ)."
    def __eq__(self, other):
        return True

    def __ne__(self, other):
        return False


class EqOnX:
    "Value equality on .x -- the REFLECTED operand in the pairs below."
    def __init__(self, x):
        self.x = x

    def __eq__(self, other):
        return self.x == getattr(other, "x", other)


class NoCmp:
    "No comparison methods at all."
    def __init__(self, x):
        self.x = x


class NeOnX:
    "Defines only __ne__."
    def __init__(self, x):
        self.x = x

    def __ne__(self, other):
        return self.x != getattr(other, "x", other)


_EQ_CALLS = []


class VarargsLeft:
    "Dunder declared WITHOUT a named receiver: compiles to ___eq__:kw: only."
    def __eq__(*args):
        _EQ_CALLS.append("VarargsLeft.__eq__")
        return NotImplemented


class VarargsRight:
    def __eq__(*args):
        _EQ_CALLS.append("VarargsRight.__eq__")
        return NotImplemented

    def __ne__(*args):
        _EQ_CALLS.append("VarargsRight.__ne__")
        return NotImplemented


def _ne_call_order():
    "``Left() != Right()'': forward __eq__, then the reflected __ne__ -- and"
    " NOT the reflected __eq__ afterwards."
    del _EQ_CALLS[:]
    VarargsLeft() != VarargsRight()
    return ",".join(_EQ_CALLS)


_PRIO_CALLS = []


class PrioBase:
    def __eq__(self, other):
        _PRIO_CALLS.append("PrioBase.__eq__")
        return NotImplemented


class PrioDerived(PrioBase):
    "A SUBCLASS that overrides __ne__ gets the first turn (CPython's"
    " subclass-priority rule)."
    def __eq__(self, other):
        _PRIO_CALLS.append("PrioDerived.__eq__")
        return NotImplemented

    def __ne__(self, other):
        _PRIO_CALLS.append("PrioDerived.__ne__")
        return NotImplemented


def _subclass_priority_order():
    del _PRIO_CALLS[:]
    PrioBase() != PrioDerived()
    return ",".join(_PRIO_CALLS)


def _decimal_cases():
    "Decimal against the rest of the numeric tower (import is local: a"
    " module-level one would run at fixture-import time on every load)."
    from decimal import Decimal
    from fractions import Fraction
    out = {}
    d = Decimal('1001.0')
    out["dec_eq_fraction"] = d == Fraction(2002, 2)
    out["fraction_eq_dec"] = Fraction(2002, 2) == d
    out["dec_eq_complex"] = d == (1001 + 0j)
    out["complex_eq_dec"] = (1001 + 0j) == d
    out["dec_ne_complex"] = d != (1001 + 0j)
    out["dec_lt_complex"] = _t(lambda: d < (1001 + 0j))
    out["dec_lt_fraction"] = d < Fraction(2003, 2)
    return out



# --- __index__ (PEP 357) fixtures ------------------------------------------
#
# Every sequence op used to PROBE for __index__ ("is this object index-like?")
# and then hand the object itself to env-0 arithmetic, so the value was never
# fetched and the op died on an uncatchable `does not understand #<'.


class Ind:
    "Carries its index in .ind, like CPython's test_index.newstyle."
    def __init__(self, ind):
        self.ind = ind

    def __index__(self):
        return self.ind


class MyIntSub(int):
    "An int SUBCLASS whose __index__ disagrees with its value."
    def __index__(self):
        return int(str(self)) + 1


class BoolIndex:
    "__index__ answering an int SUBCLASS (bool) -- a DeprecationWarning."
    def __index__(self):
        return True


def _index_ops():
    "Sequence ops driven by __index__ objects, across every sequence type."
    import operator
    out = {}
    two, three = Ind(2), Ind(3)
    neg = Ind(-2)
    for name, seq in (("list", [0, 1, 2, 3, 4, 5]),
                      ("tuple", (0, 1, 2, 3, 4, 5)),
                      ("str", "abcdef"),
                      ("bytes", b"abcdef"),
                      ("bytearray", bytearray(b"abcdef")),
                      ("range", range(6))):
        out[name + "_getitem"] = seq[two] == seq[2]
        out[name + "_getitem_neg"] = seq[neg] == seq[-2]
        out[name + "_slice"] = seq[two:Ind(4)] == seq[2:4]
        # an OPEN-ended slice: the other bound is unset, not an index object
        out[name + "_slice_open"] = (seq[two:] == seq[2:]
                                    and seq[:two] == seq[:2])
        out[name + "_slice_step"] = seq[::Ind(2)] == seq[::2]
    # repetition, both directions, plus the in-place form
    out["list_mul"] = [7] * three == [7, 7, 7]
    out["list_rmul"] = three * [7] == [7, 7, 7]
    out["tuple_mul"] = (7,) * three == (7, 7, 7)
    out["str_mul"] = "ab" * three == "ababab"
    out["str_rmul"] = three * "ab" == "ababab"
    lst = [7]
    lst *= three
    out["list_imul"] = lst == [7, 7, 7]
    # mutation through an index object
    lst = [0, 1, 2]
    lst[two] = 9
    out["list_setitem"] = lst == [0, 1, 9]
    del lst[two]
    out["list_delitem"] = lst == [0, 1]
    # operator.index
    out["opindex_plain"] = operator.index(7) == 7
    out["opindex_obj"] = operator.index(Ind(4)) == 4
    out["opindex_int_subclass_uses_value"] = operator.index(MyIntSub(7)) == 7
    out["int_subclass_dunder_still_8"] = MyIntSub(7).__index__() == 8
    return out


def _index_errors():
    "The error shapes: all catchable TypeError / OverflowError."
    import operator
    out = {}
    out["nonint_index_result"] = _t(lambda: [1, 2][Ind('dumb')])
    out["nonint_slice_bound"] = _t(lambda: [1, 2][Ind('dumb'):])
    out["opindex_nonint_result"] = _t(lambda: operator.index(Ind('dumb')))
    out["opindex_no_index"] = _t(lambda: operator.index(Plain()))
    out["float_index"] = _t(lambda: [1, 2][1.0])
    out["str_index_msg"] = _msg(lambda: "ab"[None])
    out["list_index_msg"] = _msg(lambda: [1, 2][None])
    # 'a' * 2**100 is an OverflowError in CPython -- Grail used to attempt the
    # build and take the session down with AlmostOutOfMemory.
    out["repeat_huge"] = _ovf(lambda: "a" * (2 ** 100))
    out["repeat_huge_negative"] = _ovf(lambda: "a" * -(2 ** 100))
    out["repeat_huge_list"] = _ovf(lambda: [1] * (2 ** 100))
    return out


def _index_deprecation():
    """__index__ answering an int subclass warns and normalizes to exact int.

    Observed through simplefilter("error"), not by spying on warnings.warn:
    assigning warnings.warn DOES stick as an attribute, but a compiled
    ``warnings.warn(...)'' call site still reaches the real implementation, so
    the spy never fires.  (catch_warnings(record=True) is no good either --
    Grail's CatchWarnings is not iterable, and that TypeError escapes module
    import and takes the whole SUnit shard down.)"""
    import operator
    import warnings
    try:
        warnings.simplefilter("error", DeprecationWarning)
        try:
            operator.index(BoolIndex())
            warned = False
        except DeprecationWarning:
            warned = True
        warnings.simplefilter("ignore", DeprecationWarning)
        n = operator.index(BoolIndex())
    finally:
        warnings.resetwarnings()
    return [n == 1, type(n) is int, warned]


RESULTS = {
    # --- __index__ protocol ---
    "index_ops": _index_ops(),
    "index_errors": _index_errors(),
    "index_deprecation": _index_deprecation(),
    # --- reflected equality: the left operand has no __eq__ of its own ------
    "nocmp_eq_eqonx": NoCmp(1) == EqOnX(1),
    "eqonx_eq_nocmp": EqOnX(1) == NoCmp(1),
    "nocmp_eq_eqonx_diff": NoCmp(1) == EqOnX(2),
    "nocmp_ne_neonx": NoCmp(1) != NeOnX(1),
    "nocmp_ne_eqonx": NoCmp(1) != EqOnX(1),
    # ... and when the left operand is a BUILT-IN (each has its own __eq__:
    # override that used to answer a flat False for a foreign operand)
    "str_eq_alwayseq": "a" == AlwaysEq(),
    "none_eq_alwayseq": None == AlwaysEq(),
    "object_eq_alwayseq": object() == AlwaysEq(),
    "function_eq_alwayseq": (lambda: None) == AlwaysEq(),
    "complex_eq_eqonx": (2 + 0j) == EqOnX(2.0),
    "str_ne_alwayseq": "a" != AlwaysEq(),
    # unequal pairs must STAY unequal (the fallback still ends at identity)
    "str_eq_int": "a" == 1,
    "none_eq_int": None == 1,
    "str_eq_str": "a" == "a",
    "str_ne_str": "a" != "b",
    "none_eq_none": None == None,
    "complex_eq_int": (2 + 0j) == 2,
    "complex_ne_int": (2 + 0j) != 3,
    # a dunder declared as ``def __eq__(*args)'' still dispatches, and the
    # call ORDER matches CPython (no extra reflected __eq__ at the end)
    "ne_call_order": _ne_call_order(),
    "subclass_priority_order": _subclass_priority_order(),
    # complex is unorderable: catchable TypeError, message names both types
    "complex_lt_complex": _t(lambda: (1 + 0j) < (2 + 0j)),
    "complex_lt_int": _t(lambda: (1 + 0j) < 2),
    "int_lt_complex": _t(lambda: 1 < (2 + 0j)),
    "complex_lt_msg": _msg(lambda: (1 + 0j) < (2 + 0j)),
    "complex_gt_int_msg": _msg(lambda: (1 + 0j) > 2),
    # Decimal across the numeric tower
    "decimal": _decimal_cases(),
    "int_lt_str": _t(lambda: 1 < "a"),
    "str_lt_int": _t(lambda: "a" < 1),
    "int_lt_none": _t(lambda: 1 < None),
    "float_lt_str": _t(lambda: 1.5 < "a"),
    "bool_lt_str": _t(lambda: True < "a"),
    "plain_lt_plain": _t(lambda: Plain() < Plain()),
    "tuple_lt_int": _t(lambda: (1,) < 2),
    "tuple_lt_list": _t(lambda: (1,) < [1]),
    "list_lt_tuple": _t(lambda: [1] < (1,)),
    "range_lt_range": _t(lambda: range(3) < range(4)),
    # still-working orderings
    "str_lt_str": "a" < "b",
    "tuple_lt_tuple": (1, 2) < (1, 3),
    "list_lt_list": [1, 2] < [1, 3],
    "bytes_lt_bytes": b"ab" < b"ac",
    "int_lt_float": 1 < 2.5,
    "bool_lt_int": True < 2,
    # reflected dunder on a user class
    "reflected_gt": 1 < Meters(5),
    # reflected comparison dunder stored as a class-body ALIAS (`__gt__ =
    # __lt__`), not a compiled `def`: `10 < AliasCmp()` must dispatch
    # AliasCmp.__gt__(alias, 10) and propagate its ZeroDivisionError (was
    # raising a bogus TypeError -- ___cmpFallback___ only probed compiled
    # selectors).  Direct `AliasCmp() < 10` uses the compiled __lt__.
    "alias_reflected_lt": _zde(lambda: 10 < AliasCmp()),
    "alias_direct_lt": _zde(lambda: AliasCmp() < 10),
    # sorting with mixed types inside raises catchably
    "sort_mixed": _t(lambda: sorted([3, "a", 1])),
    # --- arithmetic protocol (the sibling) ---
    "none_add_int": _t(lambda: None + 1),
    "int_add_none": _t(lambda: 1 + None),
    "int_add_str": _t(lambda: 1 + "a"),
    "str_add_int": _t(lambda: "a" + 1),
    "list_add_tuple": _t(lambda: [1] + (1,)),
    "str_mul_str": _t(lambda: "a" * "b"),
    "plain_sub_plain": _t(lambda: Plain() - Plain()),
    "none_mod_int": _t(lambda: None % 3),
    # valid arithmetic that must keep working
    "int_mul_str": 2 * "ab",
    "str_mul_int": "ab" * 2,
    "int_mul_list": 2 * [7],
    "tuple_mul_int": (1,) * 2,
    "bytes_add_bytes": b"a" + b"b",
    "bool_add_int": True + 2,
    "int_pow_int": 2 ** 5,
    # reflected arithmetic dunder on a user class
    "reflected_radd": 1 + Radd(),
    # --- index/unary protocol ---
    "list_index_none": _t(lambda: [1, 2][None]),
    "list_setitem_none": _t(lambda: [1, 2].__setitem__(None, 5)),
    "list_delitem_none": _t(lambda: [1, 2].__delitem__(None)),
    "str_index_none": _t(lambda: "ab"[None]),
    "range_index_none": _t(lambda: range(5)[None]),
    "bytes_index_none": _t(lambda: b"ab"[None]),
    "in_none": _t(lambda: 1 in None),
    "invert_none": _t(lambda: ~None),
    "neg_none": _t(lambda: -None),
    # valid indexing keeps working
    "list_index_ok": [1, 2][1],
    "str_index_neg": "abc"[-1],
    "range_index_ok": range(5)[2],
}
