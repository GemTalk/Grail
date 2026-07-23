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


RESULTS = {
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
