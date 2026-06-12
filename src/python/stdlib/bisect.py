# GRAIL bisect - pure-Python binary search over sorted lists, same
# algorithm and API as CPython's bisect.  The registered _bisect C shim
# is not used here (a `from _bisect import *` would lean on the
# star-import path; the pure forms are tiny and dependency-free).
# Deviation: the key= parameter (CPython 3.10+) is not supported.

__all__ = ["bisect_right", "bisect_left", "insort_right", "insort_left",
           "bisect", "insort"]


def bisect_right(a, x, lo=0, hi=None):
    """Return the index where to insert item x in list a, assuming a is sorted.

    The return value i is such that all e in a[:i] have e <= x, and all e in
    a[i:] have e > x.
    """
    if lo < 0:
        raise ValueError("lo must be non-negative")
    if hi is None:
        hi = len(a)
    while lo < hi:
        mid = (lo + hi) // 2
        if x < a[mid]:
            hi = mid
        else:
            lo = mid + 1
    return lo


def bisect_left(a, x, lo=0, hi=None):
    """Return the index where to insert item x in list a, assuming a is sorted.

    The return value i is such that all e in a[:i] have e < x, and all e in
    a[i:] have e >= x.
    """
    if lo < 0:
        raise ValueError("lo must be non-negative")
    if hi is None:
        hi = len(a)
    while lo < hi:
        mid = (lo + hi) // 2
        if a[mid] < x:
            lo = mid + 1
        else:
            hi = mid
    return lo


def insort_right(a, x, lo=0, hi=None):
    """Insert item x in list a, and keep it sorted assuming a is sorted."""
    a.insert(bisect_right(a, x, lo, hi), x)


def insort_left(a, x, lo=0, hi=None):
    """Insert item x in list a, and keep it sorted assuming a is sorted."""
    a.insert(bisect_left(a, x, lo, hi), x)


bisect = bisect_right
insort = insort_right
