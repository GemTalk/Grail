# GRAIL: minimal stub of CPython's _pydatetime.py (the pure-Python reference
# implementation datetime normally falls back to, and that test_datetime.py's
# TestModule.test_divide_and_round exercises directly for its own sake --
# not to compare against Grail's native datetime, which has no such
# separate "C-accelerated vs pure-Python" split).  Only _divide_and_round is
# vendored, since that's the only name the retained test needs.


def _divide_and_round(a, b):
    """divide a by b and round result to the nearest integer

    When the ratio is exactly half-way between two integers,
    the even integer is returned.
    """
    # Based on the reference implementation for divmod_near
    # in Objects/longobject.c.
    q, r = divmod(a, b)
    # round up if either r / b > 0.5, or r / b == 0.5 and q is odd.
    # The expression r / b > 0.5 is equivalent to 2 * r > b if b is
    # positive, 2 * r < b if b negative.
    r *= 2
    greater_than_half = r > b if b > 0 else r < b
    if greater_than_half or r == b and q % 2 == 1:
        q += 1

    return q
