"""A varargs-only `__index__` is still an `__index__` (PEP 357).

`def __index__(self, context=None)` compiles to `___index__:kw:` with no
0-arg `__index__` -- correctly, since `ClassDefAst` emits a fixed-arity
forwarder only to OVERRIDE a superclass method and `object` has no
`__index__` to override.

Every index consumer guarded itself with a SELECTOR test -- either
`___respondsTo___: #'__index__'` or `whichClassIncludesSelector:
#'__index__'` -- which answers false for that shape.  So the guard
concluded the object was not index-like and raised the sequence's own
refusal:

    [10, 20, 30, 40][k]
    TypeError: list indices must be integers or slices, not IdxOpt

for a class that plainly has an `__index__` and that `hasattr` agrees has
one.  SEVENTEEN OF TWENTY consumers refused it.

The distinction is invisible from Python, which is what makes it worth a
fixture this wide: nothing about `[10,20,30,40][k]` suggests that the
number of parameters on `__index__` decides whether it works.

Both shapes are asserted at every consumer, because the fix is a guard
change and the risk of a guard change is the shape that used to pass.

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
    """The varargs shape -- an optional extra parameter, as _pydecimal's
    dunders have."""

    def __index__(self, context=None):
        return 2


class IdxPlain:
    def __index__(self):
        return 2


# `list.insert`, `list.pop`, `range(k)` and `range(0, k)` are deliberately
# ABSENT from this list: they do not consult __index__ in EITHER shape and
# fail with an uncatchable Smalltalk MessageNotUnderstood, so a check would
# abort this module rather than fail it.  Measured identical before and
# after the change here, and recorded in docs/Issues.md as its own defect.
CONSUMERS = [
    ('list_index', lambda k: [10, 20, 30, 40][k]),
    ('tuple_index', lambda k: (10, 20, 30, 40)[k]),
    ('str_index', lambda k: 'abcd'[k]),
    ('bytes_index', lambda k: b'abcd'[k]),
    ('list_slice', lambda k: [10, 20, 30, 40][k:]),
    ('str_slice', lambda k: 'abcd'[:k]),
    ('list_repeat', lambda k: [0] * k),
    ('str_repeat', lambda k: 'ab' * k),
    ('hex', lambda k: hex(k)),
    ('oct', lambda k: oct(k)),
    ('bin', lambda k: bin(k)),
    ('int', lambda k: int(k)),
    ('bytes_of', lambda k: bytes(k)),
    ('operator_index', lambda k: __import__('operator').index(k)),
]

EXPECTED = {
    'list_index': 30, 'tuple_index': 30, 'str_index': 'c', 'bytes_index': 99,
    'list_slice': [30, 40], 'str_slice': 'ab', 'list_repeat': [0, 0],
    'str_repeat': 'abab', 'hex': '0x2', 'oct': '0o2', 'bin': '0b10',
    'int': 2, 'bytes_of': b'\x00\x00', 'operator_index': 2,
}


def _consumers_for(make):
    out = {}
    for name, fn in CONSUMERS:
        got = _outcome(lambda: fn(make()))
        want = EXPECTED[name]
        out[name] = ('ok', want) == got or got
    return {k: v for k, v in out.items() if v is not True}


def _the_varargs_shape_works_everywhere():
    return _consumers_for(IdxOpt)


def _the_plain_shape_still_works_everywhere():
    """The regression half: the shape that always passed must keep
    passing, at every one of the same consumers."""
    return _consumers_for(IdxPlain)


check('the_varargs_shape_works_everywhere',
      _the_varargs_shape_works_everywhere(), {})
check('the_plain_shape_still_works_everywhere',
      _the_plain_shape_still_works_everywhere(), {})


# ---------------------------- a guard that now says yes must still say no

class NotAnIndex:
    pass


class IndexReturnsStr:
    def __index__(self, context=None):
        return 'nope'


class IndexRaises:
    def __index__(self, context=None):
        raise ValueError('boom')


def _a_non_index_object_is_still_refused():
    return (_outcome(lambda: [1, 2][NotAnIndex()]),
            _outcome(lambda: 'ab'[NotAnIndex()]),
            _outcome(lambda: (1, 2)[NotAnIndex()]))


def _the_refusal_still_names_the_sequence():
    """The sequence-specific wording, which is why these guards exist at
    all rather than everything just calling __index__ and catching."""
    return (_outcome(lambda: [1, 2][NotAnIndex()])[1],
            _outcome(lambda: 'ab'[NotAnIndex()])[1])


def _a_non_int_result_is_a_TypeError():
    return _outcome(lambda: [1, 2][IndexReturnsStr()])[0]


def _an_exception_from_index_propagates():
    """It must NOT be swallowed into 'not index-like' -- the guard now
    says yes, so the call happens and its error is the user's."""
    return _outcome(lambda: [1, 2][IndexRaises()])


check('a_non_index_object_is_still_refused',
      _a_non_index_object_is_still_refused(),
      (('TypeError', 'list indices must be integers or slices, not NotAnIndex'),
       ('TypeError', "string indices must be integers, not 'NotAnIndex'"),
       ('TypeError', 'tuple indices must be integers or slices, not NotAnIndex')))
check('the_refusal_still_names_the_sequence',
      _the_refusal_still_names_the_sequence(),
      ('list indices must be integers or slices, not NotAnIndex',
       "string indices must be integers, not 'NotAnIndex'"))
check('a_non_int_result_is_a_TypeError',
      _a_non_int_result_is_a_TypeError(), 'TypeError')
check('an_exception_from_index_propagates',
      _an_exception_from_index_propagates(), ('ValueError', 'boom'))


# ------------------------------------ ordinary integers are untouched

def _plain_integers_still_index():
    return ([10, 20, 30][2], 'abcd'[1], (1, 2, 3)[0], [0] * 3,
            'ab' * 2, hex(255), int(7), bytes(2))


def _bool_still_indexes():
    """bool is an int subclass; CPython indexes with it."""
    return ([10, 20][True], [10, 20][False])


check('plain_integers_still_index', _plain_integers_still_index(),
      (30, 'b', 1, [0, 0, 0], 'abab', '0xff', 7, b'\x00\x00'))
check('bool_still_indexes', _bool_still_indexes(), (20, 10))


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
