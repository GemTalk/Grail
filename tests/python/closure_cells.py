"""Fixtures for ClosureCellTestCase -- func.__closure__ and the cell object.

Each function answers a plain list/tuple of primitives so the Smalltalk test can
assert on it directly.
"""


def no_free_variables():
    """__closure__ is None for a function that closes over nothing."""
    def plain(a):
        return a
    return plain.__closure__ is None


def one_cell_per_free_variable():
    """One cell per free variable, and __closure__ is a tuple."""
    def outer():
        a = 1
        b = 2
        c = 3

        def inner():
            return a + c            # b is NOT referenced -> not a free variable
        return inner
    cl = outer().__closure__
    # Flat, so the Smalltalk assertion compares primitives rather than a
    # nested Python list against a Smalltalk literal array.
    return [isinstance(cl, tuple), len(cl)] + [c.cell_contents for c in cl]


def cell_contents_is_live():
    """cell_contents tracks a later assignment -- the cell is not a snapshot."""
    def outer():
        v = 1

        def inner():
            return v
        cell, = inner.__closure__
        before = cell.cell_contents
        v = 99
        return [before, cell.cell_contents]
    return outer()


def cell_survives_the_defining_call():
    """Reading a cell after its defining frame returned still works."""
    def make(n):
        def inner():
            return n
        return inner
    f = make(7)
    cell, = f.__closure__
    return [cell.cell_contents, f()]


def closure_is_stable_across_reads():
    """Two reads of __closure__ answer the same cells (the stamp is def-time)."""
    def outer():
        x = 5

        def inner():
            return x
        return inner
    f = outer()
    return [a is b for a, b in zip(f.__closure__, f.__closure__)]


def cell_wraps_rather_than_is_the_value():
    """The cell is a distinct object from the value it holds (test_scope's
    testCellIsArgAndEscapes in miniature)."""
    def external():
        value = 42

        def inner():
            return value
        cell, = inner.__closure__
        return cell
    cell_ext = external()

    def spam(arg):
        def eggs():
            return arg
        return eggs
    eggs = spam(cell_ext)
    cell_closure, = eggs.__closure__
    return [eggs() is cell_ext, eggs() is not cell_closure]


def parameters_are_captured():
    """A free variable that is the enclosing function's PARAMETER gets a cell
    too -- the read-only case, since nothing assigns it."""
    def outer(p):
        def inner():
            return p
        return inner
    cell, = outer('hi').__closure__
    return cell.cell_contents


def nested_two_levels():
    """A name referenced only by a DEEPER def is free in the middle one as
    well: the middle function has to carry the binding down to it."""
    def a():
        x = 'deep'

        def b():
            def c():
                return x
            return c
        return b
    mid = a()
    return [len(mid.__closure__), mid.__closure__[0].cell_contents,
            len(mid().__closure__), mid()()]


def cell_repr_shape():
    """repr is CPython-shaped: <cell at 0x...: int object at 0x...>."""
    def outer():
        v = 42

        def inner():
            return v
        return inner.__closure__[0]
    r = repr(outer())
    return [r.startswith('<cell at 0x'), 'int object at 0x' in r, r.endswith('>')]


def method_closure_over_enclosing_local():
    """A def nested inside a class-body METHOD closes over that method's
    locals."""
    class C:
        def m(self):
            total = 10

            def add(n):
                return total + n
            return add
    f = C().m()
    return [len(f.__closure__), f.__closure__[0].cell_contents, f(5)]


def free_variable_is_the_receiver():
    """The self/cls parameter of a class-body def compiles to Smalltalk `self`,
    so capturing it exercises the resolved-read path rather than a bare name --
    this is the shape that broke fractions._operator_fallbacks."""
    class C:
        def make(first, second=3):
            def inner(v):
                return (first.tag, second, v)
            return inner

        tag = 'T'
    f = C.make(C())
    return [len(f.__closure__)] + list(f(1))
