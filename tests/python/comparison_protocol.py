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


class Meters:
    def __init__(self, v):
        self.v = v

    def __gt__(self, other):
        # reflected target for `1 < Meters(5)`
        return self.v > other


class Plain:
    pass


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
    # sorting with mixed types inside raises catchably
    "sort_mixed": _t(lambda: sorted([3, "a", 1])),
}
