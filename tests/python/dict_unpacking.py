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


class Holder:
    """The display from inside a METHOD, which is where the census row is
    (`cm:shape:DictAst`, test_listcomps' test_code_replace_extended_arg builds
    ``{"y": ..., **{f"x{i}": i for i in range(300)}}``).  A method is compiled
    through a different seam from a top-level def, so the refusal had to be
    lifted for both."""

    def build(self):
        return {'y': [0], **{'x%d' % i: i for i in range(3)}}


def method_display():
    return Holder().build()


def from_mapping():
    """The protocol ``**`` actually requires is keys() + __getitem__, not a
    dict -- so the merge cannot be a dict-only fast path."""

    class Mapping:
        def keys(self):
            return ['p', 'q']

        def __getitem__(self, k):
            return k.upper()

    return {**Mapping()}


def not_a_mapping():
    """``{**[1, 2]}`` is a TypeError, not a value.  ``update:`` is forgiving of
    things ``**`` is not, so an emit reaching it with the wrong argument could
    quietly succeed."""

    try:
        return {**[1, 2]}
    except TypeError as e:
        return 'TypeError: ' + str(e)[:40]


def result_is_a_copy():
    """The display builds a FRESH dict; mutating it must not touch the source."""

    a = {'x': 1}
    out = {**a}
    out['x'] = 999
    return (a['x'], out['x'])
