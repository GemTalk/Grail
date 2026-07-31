# Fixture for SliceAndLoopsTestCase — exercises slice subscripting, the
# slice class, break/continue inside both `for` and `while` loops, and
# Python's `_` throwaway name.

xs = [1, 2, 3, 4, 5]

# --- Slice expressions (load) ---
slice_basic   = xs[1:4]
slice_open_lo = xs[:3]
slice_open_hi = xs[2:]
slice_neg_lo  = xs[-2:]
slice_neg_hi  = xs[:-1]
slice_step    = xs[::2]
slice_reverse = xs[::-1]
slice_str     = "hello"[1:4]

# --- slice() class ---
s_one    = slice(7)
s_two    = slice(1, 5)
s_three  = slice(0, 10, 2)
s_isinst = isinstance(s_two, slice)
s_notint = isinstance(5, slice)


# --- slice equality (test_slice test_cmp / test_deepcopy) ---
# slice.__eq__ compares (start, stop, step) with Python's identity-before-
# equality rule.  The former bare Smalltalk ``='' compiled to an env-1 send a
# SmallInteger field could not answer, an uncatchable escape.
def slice_eq_equal():
    return slice(1, 2, 3) == slice(1, 2, 3)              # True


def slice_eq_unequal():
    return slice(1, 2, 3) != slice(1, 2, 4)             # True


def slice_eq_vs_nonslice():
    # A slice equals no non-slice (None / tuple / str), so != is True.
    return (slice(1, 2, 3) != None) \
        and (slice(1, 2, 3) != (1, 2, 3)) \
        and (slice(1, 2, 3) != "")


def slice_eq_identity_skips_field_eq():
    # Identity-first: ``s == s'' must NOT call a field's __eq__, so a slice
    # whose field would raise on __eq__ still equals itself.
    class BadCmp:
        def __eq__(self, other):
            raise RuntimeError("field __eq__ must not run for s == s")
    s = slice(BadCmp())
    return s == s


def slice_eq_field_eq_propagates():
    # Distinct field objects DO invoke __eq__, so a raising __eq__ propagates.
    class Exc(Exception):
        pass

    class BadCmp:
        def __eq__(self, other):
            raise Exc
    try:
        slice(1, BadCmp()) == slice(1, BadCmp())
    except Exc:
        return 'Exc'
    return 'no error'


def slice_eq_mutable_fields():
    # Mutable (list) fields compare by value, not identity
    # (test_deepcopy's corner case).
    return slice([1, 2], [3, 4], [5, 6]) == slice([1, 2], [3, 4], [5, 6])


def slice_deepcopy():
    # copy.deepcopy(slice) must produce a NEW slice with deep-copied fields
    # (test_slice test_deepcopy) -- was returning the same slice (atom
    # passthrough), so assertIsNot(s, c) failed.
    import copy
    s = slice([1, 2], [3, 4], [5, 6])
    c = copy.deepcopy(s)
    return (s is not c) and (s == c) and (s.start is not c.start)

# --- break in for ---
def find_first_even(xs):
    for x in xs:
        if x % 2 == 0:
            return x
    return None

# --- continue in for ---
def evens(xs):
    out = []
    for x in xs:
        if x % 2 != 0:
            continue
        out.append(x)
    return out

# --- break in while ---
def first_n_doubling(start, limit):
    out = []
    n = start
    while True:
        if n > limit:
            break
        out.append(n)
        n = n * 2
    return out

# --- continue in while ---
def evens_under(n):
    out = []
    i = 0
    while i < n:
        i = i + 1
        if i % 2 != 0:
            continue
        out.append(i)
    return out

# --- while-else: else clause runs when the loop body executes ---
# (NOTE: Grail's WhileAst currently runs the else clause unconditionally;
# CPython only runs it when the loop terminated without `break`.  These
# tests pin the loop-completed case which is correct under either rule.)
def while_else_completes(n):
    i = 0
    out = []
    while i < n:
        out.append(i)
        i = i + 1
    else:
        out.append('done')
    return out

# --- `_` as throwaway name in for and as parameter ---
def count_iterations(seq):
    n = 0
    for _ in seq:
        n = n + 1
    return n

def discard_first(_, x):
    return x

# --- Module-level results so the test class can read them ---
while_else_result      = while_else_completes(3)
find_first_even_result = find_first_even(xs)
evens_result           = evens(xs)
doubling_result        = first_n_doubling(1, 100)
evens_under_result     = evens_under(10)
count_iter_result      = count_iterations([10, 20, 30, 40])
discard_first_result   = discard_first('ignored', 42)
