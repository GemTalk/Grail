"""An index ARGUMENT is coerced through `__index__`, as an index SUBSCRIPT is.

`x[k]` honoured PEP 357. `L.insert(k, v)`, `L.pop(k)`, `range(k)`,
`s.find(sub, k)` and friends did not: they took the argument as given and
went straight to env-0 arithmetic on it.

The failure was the bad kind. An env-0 send to a Python object is a
Smalltalk `MessageNotUnderstood`, which Python code cannot catch:

    try:
        [1, 2].insert(k, 9)
    except TypeError:
        ...        # never reached; the module ABORTS instead

FOURTEEN consumers behaved that way, and unlike the subscript defect this
one is NOT about the varargs shape -- it fails for a plain
`def __index__(self)` too, because nothing was coerced at all.

The fix is `___asIndex___` at each, which is what every subscript already
did. Where a bound may legitimately be `None` (`s.find(sub, None, None)`),
`None` is resolved to its default FIRST -- it is a legal bound and has no
`__index__`.

Both shapes are asserted at every consumer, and so is the plain-`int`
path, which is the overwhelmingly common one through this code.

Every expectation was checked against CPython 3.14 first.
"""

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or 'got: %r' % (got,)


def _outcome(fn):
    try:
        return ('ok', fn())
    except BaseException as exc:
        return (type(exc).__name__, str(exc)[:60])


class IdxOpt:
    """The varargs shape."""

    def __index__(self, context=None):
        return 1


class IdxPlain:
    def __index__(self):
        return 1


CONSUMERS = [
    ('list_insert', lambda k: (lambda L: (L.insert(k, 9), L)[1])([10, 20, 30])),
    ('list_pop', lambda k: [10, 20, 30].pop(k)),
    ('list_index_start', lambda k: [10, 20, 30].index(30, k)),
    ('tuple_index_start', lambda k: (10, 20, 30).index(30, k)),
    ('bytearray_pop', lambda k: bytearray(b'xyz').pop(k)),
    ('bytearray_insert',
     lambda k: (lambda B: (B.insert(k, 65), bytes(B))[1])(bytearray(b'xy'))),
    ('range_1', lambda k: list(range(k))),
    ('range_2', lambda k: list(range(0, k))),
    ('range_3', lambda k: list(range(0, 3, k))),
    ('str_find_start', lambda k: 'abcabc'.find('c', k)),
    ('str_index_start', lambda k: 'abcabc'.index('c', k)),
    ('str_count_start', lambda k: 'abcabc'.count('c', k)),
    ('str_startswith', lambda k: 'abcabc'.startswith('bc', k)),
    ('str_endswith', lambda k: 'abcabc'.endswith('bc', k)),
    ('bytes_find_start', lambda k: b'abcabc'.find(b'c', k)),
]

EXPECTED = {
    'list_insert': [10, 9, 20, 30], 'list_pop': 20, 'list_index_start': 2,
    'tuple_index_start': 2, 'bytearray_pop': 121, 'bytearray_insert': b'xAy',
    'range_1': [0], 'range_2': [0], 'range_3': [0, 1, 2],
    'str_find_start': 2, 'str_index_start': 2, 'str_count_start': 2,
    'str_startswith': True, 'str_endswith': True, 'bytes_find_start': 2,
}


def _consumers_with(make):
    out = {}
    for name, fn in CONSUMERS:
        got = _outcome(lambda: fn(make()))
        out[name] = (('ok', EXPECTED[name]) == got) or got
    return {k: v for k, v in out.items() if v is not True}


def _the_varargs_shape():
    return _consumers_with(IdxOpt)


def _the_plain_shape():
    """Not a mere regression check: this shape failed too, because nothing
    was coerced at all."""
    return _consumers_with(IdxPlain)


def _plain_ints_still_work():
    return _consumers_with(lambda: 1)


check('the_varargs_shape', _the_varargs_shape(), {})
check('the_plain_shape', _the_plain_shape(), {})
check('plain_ints_still_work', _plain_ints_still_work(), {})


# ------------------------------------- what must still be refused / kept

class NotAnIndex:
    pass


class IndexReturnsStr:
    def __index__(self):
        return 'nope'


def _a_non_index_argument_raises_a_catchable_TypeError():
    return (_outcome(lambda: [1, 2].insert(NotAnIndex(), 9))[0],
            _outcome(lambda: [1, 2].pop(NotAnIndex()))[0],
            _outcome(lambda: list(range(NotAnIndex())))[0],
            _outcome(lambda: 'ab'.find('a', NotAnIndex()))[0])


def _the_refusal_names_the_type():
    return _outcome(lambda: list(range(NotAnIndex())))[1]


def _a_non_int_result_raises():
    return _outcome(lambda: [1, 2].pop(IndexReturnsStr()))[0]


def _None_is_still_a_legal_bound():
    """None has no __index__ and must keep meaning 'the default bound',
    which is why it is resolved before coercing."""
    return ('abcabc'.find('c', None, None), 'abcabc'.find('c', 2, None),
            b'abcabc'.find(b'c', None, None), 'abcabc'.count('c', None, None))


def _negative_arguments_still_count_from_the_end():
    return ([10, 20, 30].pop(-1), 'abcabc'.find('a', -3),
            (lambda L: (L.insert(-1, 9), L)[1])([10, 20]),
            list(range(-2, 0)))


def _empty_and_edge_ranges_still_hold():
    return (list(range(0)), list(range(3, 0)), [10, 20, 30].index(10, 0),
            'abc'.find('z', 1), 'abc'.startswith('', 3))


check('a_non_index_argument_raises_a_catchable_TypeError',
      _a_non_index_argument_raises_a_catchable_TypeError(),
      ('TypeError',) * 4)
check('the_refusal_names_the_type', _the_refusal_names_the_type(),
      "'NotAnIndex' object cannot be interpreted as an integer")
check('a_non_int_result_raises', _a_non_int_result_raises(), 'TypeError')
check('None_is_still_a_legal_bound', _None_is_still_a_legal_bound(),
      (2, 2, 2, 2))
check('negative_arguments_still_count_from_the_end',
      _negative_arguments_still_count_from_the_end(),
      (30, 3, [10, 9, 20], [-2, -1]))
check('empty_and_edge_ranges_still_hold', _empty_and_edge_ranges_still_hold(),
      ([], [], 0, -1, True))


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
