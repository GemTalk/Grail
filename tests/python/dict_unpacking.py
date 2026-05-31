# Fixture for DictUnpackingTestCase.
#
# Dictionary-literal unpacking: ``{**mapping}``.  The parser records an
# unpack element as a None at the matching position in the `keys` list
# (the mapping goes in `values`); DictAst codegen merges that mapping
# into the accumulator with `update:` instead of `__setitem__`.


def basic_unpack():
    a = {'x': 1, 'y': 2}
    return {**a}


def merge_two():
    a = {'x': 1}
    b = {'y': 2}
    return {**a, **b}


def unpack_between_literals():
    a = {'mid': 5}
    return {'before': 0, **a, 'after': 9}


def later_key_overwrites():
    # CPython evaluates left-to-right; the trailing literal wins.
    a = {'x': 1}
    return {**a, 'x': 99}


def unpack_empty():
    a = {}
    return {'keep': 1, **a}
