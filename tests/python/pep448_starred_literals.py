# Regression fixture for PEP 448 starred unpacking inside literals.
#
# PEP 448 lets you splat an iterable inside a tuple / list / set
# literal: ``(a, *b, c)'' / ``[a, *b]'' / ``{a, *b}''.
# Pre-fix, Grail's TupleAst emitted Smalltalk source with one
# unbalanced paren in the splat path — every such literal compiled
# to syntactically invalid Smalltalk.  Werkzeug.datastructures.headers
# uses this in __eq__ (``return item[0].lower(), *item[1:]'') and
# werkzeug.urls used it in module-init (``bytes((*range(0x21), 0x25,
# 0x7F))'').
#
# Test scope: tuple splats only.  List / set / dict splats are
# separate codegen paths that may have their own gaps.


_a = [1, 2, 3]


def tuple_with_leading_splat():
    return (*_a, 99)


def tuple_with_trailing_splat():
    return (0, *_a)


def tuple_with_middle_splat():
    return (0, *_a, 99)


def tuple_two_splats():
    return (*_a, *_a)


def tuple_assignment_target():
    """The TupleAst path also fires on bare ``a, *b, c'' returns."""
    x = (0, *_a, 99)
    return x


def empty_tuple_with_splat():
    """A splat of an empty iterable produces just the literal items."""
    empty = []
    return (1, *empty, 2)
