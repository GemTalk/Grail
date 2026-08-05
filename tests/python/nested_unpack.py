# Fixture for NestedUnpackTestCase.
#
# Sequence-unpacking assignment (``a, b = expr``) had two independent bugs,
# both invisible at the top level of a statement and both hit by CPython's
# test_iter test_unpack_iter:
#
# 1. A NESTED target -- ``(a, b), (c,) = ...`` -- bound its inner holder
#    straight to ``outer[i]`` and indexed that, skipping the
#    ___unpackSequence___ coercion + ___unpackCheck___ count check the
#    top-level target runs.  So an inner iterable with __iter__ but no
#    __getitem__ raised "not subscriptable", an inner target could not raise
#    ValueError for the wrong number of values, and an inner STAR target did
#    not compile at all (StarredAst fell through to the plain-expression
#    printer, which emits a TypeError signal into the left-hand side of an
#    assignment -- a CompileError that took the whole enclosing module down).
#
# 2. ___unpackSequence___ fast-pathed anything owning a real __getitem__,
#    which includes every MAPPING -- but a dict's __getitem__ is keyed, not
#    positional, so ``a, b = {1: 'x', 2: 'y'}`` asked for key 0 and raised
#    ``KeyError: 0``.  CPython unpacks a mapping through __iter__ like
#    anything else, yielding its KEYS.


class BasicIterClass:
    def __init__(self, n):
        self.n = n
        self.i = 0

    def __next__(self):
        res = self.i
        if res >= self.n:
            raise StopIteration
        self.i = res + 1
        return res

    def __iter__(self):
        return self


class IteratingSequenceClass:
    """__iter__ but NO __getitem__ -- unpacking it must iterate."""

    def __init__(self, n):
        self.n = n

    def __iter__(self):
        return BasicIterClass(self.n)


def _caught(fn):
    """Run fn, returning 'Type: message' when it raises, else its value."""
    try:
        return fn()
    except BaseException as e:
        return "%s: %s" % (type(e).__name__, e)


# --- 1. nested target, non-subscriptable iterable ---------------------------


def nested_iterable():
    (a, b), (c,) = IteratingSequenceClass(2), {42: 24}
    return (a, b, c)


def nested_deep():
    ((a, b), (c, d)), e = ((1, 2), IteratingSequenceClass(2)), 5
    return (a, b, c, d, e)


def nested_in_for_loop():
    got = []
    for (a, b), c in [((1, 2), 3), ((4, 5), 6)]:
        got.append((a, b, c))
    return got


# --- 2. nested target, value-count check ------------------------------------


def nested_too_few():
    def go():
        (a, b, c), d = IteratingSequenceClass(2), 9
        return (a, b, c, d)

    return _caught(go)


def nested_too_many():
    def go():
        (a, b), c = IteratingSequenceClass(3), 9
        return (a, b, c)

    return _caught(go)


# --- 3. nested STAR target (used to be a CompileError) ----------------------


def nested_star():
    (a, *b), c = IteratingSequenceClass(3), 9
    return (a, b, c)


def nested_star_trailing():
    (a, *b, c), d = [1, 2, 3, 4], 9
    return (a, b, c, d)


# --- 4. mapping unpacks to its keys -----------------------------------------


def mapping_keys():
    a, b = {1: "x", 2: "y"}
    return (a, b)


def mapping_too_many():
    def go():
        a, b = {1: "x", 2: "y", 3: "z"}
        return (a, b)

    return _caught(go)


def mapping_nested():
    (a,), b = {7: "v"}, 8
    return (a, b)


def mapping_items():
    (k, v), = {7: 8}.items()
    return (k, v)


# --- top-level shapes that already worked: guard against regressing them ----


def flat_iterable():
    a, b, c = IteratingSequenceClass(3)
    return (a, b, c)


def flat_star():
    a, *b, c = [1, 2, 3, 4]
    return (a, b, c)


def flat_not_iterable():
    def go():
        a, b, c = len
        return 1

    return _caught(go)


def flat_string():
    a, b, c = "xyz"
    return (a, b, c)


# --- chained targets go through the same emitter ----------------------------


def chained_plain():
    a, b = c = (1, 2)
    return (a, b, c)


def chained_star():
    a, *b = c = [1, 2, 3]
    return (a, b, c)


def chained_iterable():
    a, b = c = IteratingSequenceClass(2)
    return (a, b, type(c).__name__)


def chained_too_many():
    def go():
        a, b = c = (1, 2, 3)
        return (a, b, c)

    return _caught(go)
