# Fixture for DequeIdentitySearchTestCase.
#
# Every element search in CPython goes through PyObject_RichCompareBool, which
# short-circuits on IDENTITY before calling __eq__.  deque's __contains__,
# count, index and remove compared with == only, so a value that is not equal
# to itself was unfindable in a deque that holds it.  nan is the standard case
# (CPython's test_contains asserts nan is found in deque([nan])), and an object
# whose __eq__ always returns False is the general one.

from collections import deque

out = {}


def _run(label, fn):
    try:
        out[label] = repr(fn())
    except BaseException as e:
        out[label] = "%s: %s" % (type(e).__name__, e)


NAN = float('nan')


class NeverEq:
    """Equal to nothing at all, including itself."""

    def __eq__(self, other):
        return False

    def __hash__(self):
        return 1

    def __repr__(self):
        return 'NeverEq()'


NEVER = NeverEq()


# --- identity must be consulted before __eq__ -------------------------------

_run("nan_in", lambda: NAN in deque([NAN, 1]))
_run("nan_count", lambda: deque([NAN, 1, NAN]).count(NAN))
_run("nan_index", lambda: deque([1, NAN]).index(NAN))


def _nan_remove():
    d = deque([1, NAN, 2])
    d.remove(NAN)
    return list(d)


_run("nan_remove", _nan_remove)

_run("never_eq_in", lambda: NEVER in deque([NEVER]))
_run("never_eq_count", lambda: deque([NEVER, NEVER]).count(NEVER))
_run("never_eq_index", lambda: deque([1, NEVER]).index(NEVER))


def _never_eq_remove():
    d = deque([1, NEVER])
    d.remove(NEVER)
    return list(d)


_run("never_eq_remove", _never_eq_remove)

# a DIFFERENT never-equal object is genuinely absent -- identity must not be
# mistaken for "any instance of the same class".
#
# Deliberately NOT tested with two separately-built nans: whether
# ``float('nan') is float('nan')'' holds is a question about how the runtime
# allocates float objects (Grail can answer True where CPython answers False),
# so such a case would pin that unrelated representation choice rather than the
# identity-before-__eq__ rule under test here.
_run("other_never_eq_absent", lambda: NeverEq() in deque([NEVER]))


# --- ordinary equality searching must be unchanged --------------------------

_run("eq_in_true", lambda: 2 in deque([1, 2, 3]))
_run("eq_in_false", lambda: 9 in deque([1, 2, 3]))
_run("eq_count", lambda: deque([1, 2, 2, 3]).count(2))
_run("eq_index", lambda: deque([1, 2, 3]).index(3))
_run("eq_index_missing", lambda: deque([1, 2]).index(9))
_run("eq_remove_missing", lambda: deque([1, 2]).remove(9))
# equal-but-not-identical values must still match
_run("equal_not_identical", lambda: 1000000 in deque([10 ** 6]))
_run("equal_str", lambda: "ab" in deque(["a" + "b"]))
_run("bool_int_equal", lambda: True in deque([1]))


def _eq_remove():
    d = deque([1, 2, 3, 2])
    d.remove(2)
    return list(d)


_run("eq_remove_first_only", _eq_remove)

RESULTS = out
