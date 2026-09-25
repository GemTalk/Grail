"""A dict must compare FULL hashes before it asks two keys whether they are equal.

Sharing a bucket means two hashes agree modulo the table size, which is a much
weaker statement than being equal.  CPython stores each entry's hash (me_hash)
and checks it before it will call __eq__ at all.  PyDict went from the identity
check straight to __eq__, so any key whose __eq__ answers something TRUTHY for an
unrelated object swallowed whatever it happened to collide with.

That is not a contrived shape.  annotationlib's _Stringifier hashes by id() and
its __eq__ builds an expression object -- truthy -- so typing's
``_deduplicate = dict.fromkeys(params)'' collapsed ``Union[str, undefined]'' to
``Union[str]'', which is ``str''.  It is issue #1171, and it reached four
structures: dict, set, frozenset and typing.Union.

BECAUSE IT DEPENDS ON OBJECT IDS IT IS INTERMITTENT -- about one run in seven --
so the checks below are counted over many trials rather than tried once.  A
single trial passes with the defect present five times out of six, which is why
`test.test_annotationlib` looked like a flaky test for weeks instead of a bug.

Every expectation here was measured against CPython 3.14.
"""

import typing

RESULTS = {}
TRIALS = 400


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:160])


class Expr:
    """Stands in for the object a _Stringifier's __eq__ returns."""


class Truthy:
    """__eq__ answers a truthy non-bool for anything; __hash__ is the id."""

    def __eq__(self, other):
        return Expr()

    def __hash__(self):
        return id(self)


def losses():
    """How many of TRIALS trials lost a key, per structure."""
    lost = {'dict': 0, 'set': 0, 'frozenset': 0, 'union': 0}
    for _ in range(TRIALS):
        t = Truthy()
        if len({t: 1, int: 2}) != 2:
            lost['dict'] += 1
        if len({t, int}) != 2:
            lost['set'] += 1
        if len(frozenset([int, t, str])) != 3:
            lost['frozenset'] += 1
        if len(typing.get_args(typing.Union[str, t])) != 2:
            lost['union'] += 1
    return lost


# ----------------------------------------------------------- the defect

check('no_structure_loses_a_key_to_a_truthy_eq',
      losses(), {'dict': 0, 'set': 0, 'frozenset': 0, 'union': 0})

# ----------------------------------------------------------- unchanged

# Equal hashes must still reach __eq__ -- this is the half that must NOT be
# broken by checking hashes first.


class AlwaysHashesTheSame:
    def __init__(self, v):
        self.v = v

    def __eq__(self, other):
        return isinstance(other, AlwaysHashesTheSame) and self.v == other.v

    def __hash__(self):
        return 7


def collapsed_by_equality():
    d = {}
    d[AlwaysHashesTheSame(1)] = 'a'
    d[AlwaysHashesTheSame(1)] = 'b'
    d[AlwaysHashesTheSame(2)] = 'c'
    return (len(d), sorted(d.values()))


check('equal_keys_sharing_a_hash_still_merge',
      collapsed_by_equality(), (2, ['b', 'c']))
check('numeric_keys_of_different_types_still_collapse',
      (len({1: 'a', 1.0: 'b', True: 'c'}), {1: 'a', 1.0: 'b', True: 'c'}[1]),
      (1, 'c'))
check('numbers_that_merely_share_a_bucket_do_not_merge',
      len({1: 'a', 2: 'b', 3: 'c'}), 3)
check('a_set_of_equal_numeric_types_is_one_element',
      len({1, 1.0, True}), 1)
check('str_keys_are_unaffected',
      (len({'a': 1, 'b': 2}), {'a': 1, 'b': 2}['b']), (2, 2))

def _unhashable():
    try:
        {[]: 1}
    except TypeError as exc:
        return 'TypeError'
    return 'no error'


check('an_unhashable_key_still_raises_type_error', _unhashable(), 'TypeError')
check('a_key_that_equals_nothing_keeps_its_own_entry',
      len({Truthy(): 1, Truthy(): 2}), 2)


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
