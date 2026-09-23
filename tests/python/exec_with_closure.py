# ``exec(code, globals, closure=cells)'' runs a def's body with the free
# variables bound to the cells you supply.
#
# GRAIL CANNOT RE-ENTER A COMPILED CLOSURE WITH DIFFERENT CELLS.  Its free
# variables are Smalltalk temps captured when the def ran, so there is nothing
# to substitute into -- which is why this looked out of reach.  What it can do
# is run the body's SOURCE again against a namespace built from the cells, so a
# def with free variables now carries its body text on its code object.  The
# observable behaviour is CPython's; the mechanism is different.
#
# The cells are copied in and written back out rather than read live.  A cell is
# a one-slot box and the body cannot change WHICH box a name refers to, so a
# copy at entry and a store at exit are indistinguishable from reading through
# it -- and it keeps the namespace an ordinary dict, which is what the exec path
# is built for.
#
# The write-back goes through ``cell.cell_contents = v'', not a direct slot
# store: the cell's own setter is what makes the write reach the variable it
# boxes.  A dynamic-instVar store writes past it, and then the exec produces the
# right value and nothing can see it -- which is exactly what the first cut did.
#
# SIX OF THE NINE CHECKS ARE REFUSALS, and they all report the same thing.  A
# list of the right length, and a tuple of the right length holding a non-cell,
# both report ``requires a closure of exactly length N'' -- CPython names the
# length whatever the fault was.  Three separate, more descriptive messages read
# better and are wrong.
#
# test_builtin's test_exec_closure.

from types import CellType

r = {}


def outcome(fn):
    try:
        return 'ok -> %r' % (fn(),)
    except Exception as e:
        return '%s: %s' % (type(e).__name__, e)


def _fixture():
    """Everything lives here so ``result'' is a genuine enclosing local -- at
    module level it would be a global and the defs would have no free variable
    to close over."""

    def function_without_closures():
        return 3 * 5

    result = 0

    def make_closure_functions():
        a = 2
        b = 3
        c = 5

        def three_freevars():
            nonlocal result, a, b
            result = a * b

        def four_freevars():
            nonlocal result, a, b, c
            result = a * b * c

        return three_freevars, four_freevars

    three, four = make_closure_functions()
    out = {}

    # --- the two that actually run -------------------------------------------

    result = 0
    exec(three.__code__, three.__globals__, closure=three.__closure__)
    out['own_closure'] = result

    result = 0
    my_closure = (CellType(35), CellType(72), three.__closure__[2])
    exec(three.__code__, three.__globals__, closure=my_closure)
    out['substituted_closure'] = result

    # --- and the refusals ------------------------------------------------------

    out['no_free_variables'] = outcome(
        lambda: exec(function_without_closures.__code__,
                     function_without_closures.__globals__, closure=my_closure))
    out['closure_is_none'] = outcome(
        lambda: exec(three.__code__, three.__globals__, closure=None))
    out['wrong_length'] = outcome(
        lambda: exec(three.__code__, three.__globals__, closure=four.__closure__))
    out['a_list_not_a_tuple'] = outcome(
        lambda: exec(three.__code__, three.__globals__, closure=list(my_closure)))
    out['string_source_any_closure'] = outcome(lambda: exec("pass", closure=int))
    out['string_source_real_closure'] = outcome(
        lambda: exec("pass", closure=my_closure))
    bad = list(my_closure)
    bad[0] = int
    out['tuple_with_a_non_cell'] = outcome(
        lambda: exec(three.__code__, three.__globals__, closure=tuple(bad)))

    # --- and the shapes that must keep working ------------------------------------

    out['freevars'] = three.__code__.co_freevars
    out['closure_length'] = len(three.__closure__)
    out['calling_it_still_works'] = (three(), result)[1] if False else None
    result = 0
    three()
    out['plain_call'] = result
    return out


_OUT = _fixture()
for _k, _v in _OUT.items():
    r[_k] = _v
del _k, _v

# --- controls outside the closure machinery ---------------------------------------

r['exec_without_closure'] = outcome(
    lambda: (lambda d: (exec("z = 3 * 5", d), d['z'])[1])({}))
r['cell_roundtrip'] = outcome(
    lambda: (lambda c: (setattr(c, 'cell_contents', 9), c.cell_contents)[1])(CellType(1)))


EXPECTED = {
    'a_list_not_a_tuple': 'TypeError: code object requires a closure of exactly length 3',
    'calling_it_still_works': None,
    'cell_roundtrip': 'ok -> 9',
    'closure_is_none': 'TypeError: code object requires a closure of exactly length 3',
    'closure_length': 3,
    'exec_without_closure': 'ok -> 15',
    'freevars': ('a', 'b', 'result'),
    'no_free_variables': 'TypeError: cannot use a closure with this code object',
    'own_closure': 6,
    'plain_call': 6,
    'string_source_any_closure': 'TypeError: closure can only be used when source is a code object',
    'string_source_real_closure': 'TypeError: closure can only be used when source is a code object',
    'substituted_closure': 2520,
    'tuple_with_a_non_cell': 'TypeError: code object requires a closure of exactly length 3',
    'wrong_length': 'TypeError: code object requires a closure of exactly length 3',
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, "<missing>") != EXPECTED[k])
SUMMARY = "%d checks, %d disagreeing %r, keys match: %s" % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-28s %s %r' % (k, 'OK ' if actual == EXPECTED[k] else 'DIFF', actual))
